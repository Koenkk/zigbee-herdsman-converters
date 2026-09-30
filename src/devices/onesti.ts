import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValue, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const NS = "zhc:onesti";

// Fallback for the number of digits the lock requires, used to tell a packed BCD
// PIN from an ASCII one when the lock has not reported `minPinLen` (yet).
const defaultMinPinLength = 4;

/**
 * Decode the PIN digits the lock reports in attribute 257 (0x0101).
 *
 * Older Connect Modules send the digits as ASCII, newer ones send them packed as
 * BCD, two digits per byte (issue #13080), so the format has to be recognised
 * instead of assumed. A buffer holding fewer bytes than the lock's minimum PIN
 * length cannot be ASCII, which is what separates BCD `39 39` ("3939") from
 * ASCII "99". Buffers that are neither are returned as hex rather than as the
 * control characters `toString("ascii")` produced before.
 */
function decodePinCode(bytes: Buffer, minPinLength: number): string {
    let end = bytes.length;

    // Trailing padding: `trim()` does not remove NUL.
    while (end > 0 && bytes[end - 1] === 0x00) {
        end--;
    }

    const data = bytes.subarray(0, end);

    if (data.length === 0) {
        return "";
    }

    if (data.length >= minPinLength && data.every((byte) => byte >= 0x30 && byte <= 0x39)) {
        return data.toString("ascii");
    }

    let digits = "";

    for (const byte of data) {
        const high = byte >> 4;
        const low = byte & 0x0f;

        if (high > 9 || low > 9) {
            logger.debug(`PIN code ${data.length} bytes long is neither ASCII digits nor BCD, reporting it as hex`, NS);

            return data.toString("hex");
        }

        digits += `${high}${low}`;
    }

    return digits;
}

export const tzLocal = {
    easycode_auto_relock: {
        key: ["auto_relock"],
        convertSet: async (entity, key, value, meta) => {
            await entity.write("closuresDoorLock", {autoRelockTime: value ? 1 : 0}, utils.getOptions(meta.mapped, entity));
            return {state: {auto_relock: value}};
        },
    } satisfies Tz.Converter,
};

export const fzLocal = {
    nimly_pro_lock_actions: {
        cluster: "closuresDoorLock",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const attributes: KeyValue = {};

            // Handle attribute 257 (0x0101): last_used_pin_code
            // Depending on the Connect Module revision the digits arrive as ASCII or packed as BCD.
            if (msg.data["257"] !== undefined) {
                const data = msg.data["257"];
                const reportedMinPinLength = msg.data.minPinLen ?? meta.state?.min_pin_length;
                const minPinLength =
                    typeof reportedMinPinLength === "number" && reportedMinPinLength > 0 ? reportedMinPinLength : defaultMinPinLength;

                if (Buffer.isBuffer(data)) {
                    attributes.last_used_pin_code = decodePinCode(data, minPinLength);
                } else if (Array.isArray(data)) {
                    attributes.last_used_pin_code = decodePinCode(Buffer.from(data), minPinLength);
                } else if (typeof data === "string") {
                    // Already a string
                    attributes.last_used_pin_code = data.trim();
                } else {
                    // Fallback: convert to string
                    attributes.last_used_pin_code = String(data);
                }
            }

            // Handle attribute 256 (0x0100): last action (lock/unlock) source and user
            // The 32-bit value written as 8 hex characters (the wire order is the reverse):
            // First octet: source
            // Second octet: action (01=lock, 02=unlock)
            // Last four: user ID (16-bit integer)
            if (msg.data["256"] !== undefined) {
                const hex = (msg.data["256"] as number).toString(16).padStart(8, "0");
                const sourceOctet = hex.substring(0, 2);
                const actionOctet = hex.substring(2, 4);
                const lookup: {[key: string]: string} = {
                    "00": "zigbee",
                    "02": "keypad",
                    "03": "fingerprintsensor",
                    "04": "rfid",
                    // NimlyCodePRO and NimlyPRO24 send 05 for Zigbee commands, auto relock and the
                    // interior keypad alike, always with user 0; the payload cannot tell them apart.
                    "05": "unattributed",
                    "0a": "self",
                };
                const source = lookup[sourceOctet] || "unknown";
                // User ID as string for consistency with Home Assistant expectations
                const userIdStr = Number.parseInt(hex.substring(4, 8), 16).toString();

                if (actionOctet === "01") {
                    attributes.last_lock_user = userIdStr;
                    attributes.last_lock_source = source;
                } else if (actionOctet === "02") {
                    attributes.last_unlock_user = userIdStr;
                    attributes.last_unlock_source = source;
                }
            }

            // Handle auto_relock_time attribute (if present)
            if (Object.hasOwn(msg.data, "autoRelockTime")) {
                attributes.auto_relock_time = (msg.data as KeyValue)["autoRelockTime"];
            }

            // Handle lock capabilities (if present). These are standard closuresDoorLock
            // attributes, so zigbee-herdsman keys them by name, not by attribute ID.
            if (msg.data.numOfPinUsersSupported !== undefined) {
                attributes.num_pin_users = msg.data.numOfPinUsersSupported;
            }

            if (msg.data.minPinLen !== undefined) {
                attributes.min_pin_length = msg.data.minPinLen;
            }

            if (msg.data.maxPinLen !== undefined) {
                attributes.max_pin_length = msg.data.maxPinLen;
            }

            // Return result if not empty
            if (Object.keys(attributes).length > 0) {
                return attributes;
            }
        },
    } satisfies Fz.Converter<"closuresDoorLock", undefined, ["attributeReport", "readResponse"]>,
    easycodetouch_action: {
        cluster: "closuresDoorLock",
        type: "raw",
        convert: (model, msg, publish, options, meta) => {
            const value = constants.easyCodeTouchActions[(msg.data[3] << 8) | msg.data[4]];
            if (value) {
                return {action: value};
            }
            logger.warning(`Unknown lock status with source ${msg.data[3]} and event code ${msg.data[4]}`, NS);
        },
    } satisfies Fz.Converter<"closuresDoorLock", undefined, "raw">,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["easyCodeTouch_v1", "EasyCodeTouch", "EasyFingerTouch"],
        model: "easyCodeTouch_v1",
        vendor: "Onesti Products AS",
        description: "Zigbee module for EasyAccess code touch series",
        fromZigbee: [
            fzLocal.nimly_pro_lock_actions,
            fz.lock_set_pin_code_response,
            fz.lock,
            fz.lock_operation_event,
            fz.battery,
            fz.lock_programming_event,
            fzLocal.easycodetouch_action,
        ],
        toZigbee: [tz.lock, tzLocal.easycode_auto_relock, tz.lock_sound_volume, tz.pincode_lock],
        meta: {pinCodeCount: 1000, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresDoorLock", "genPowerCfg"]);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read("closuresDoorLock", ["lockState", "soundVolume"]);

            // Try to read lock capabilities (may not be supported by all models)
            try {
                await endpoint.read("closuresDoorLock", ["numOfPinUsersSupported", "minPinLen", "maxPinLen"]);
            } catch (_error) {
                // Capabilities read may fail on some models - this is expected and harmless
                // Attributes will be exposed if the lock reports them during operation
            }

            device.powerSource = "Battery";
            device.save();
        },
        exposes: [
            e.lock(),
            e.battery(),
            e.sound_volume(),
            e.voltage(),
            e
                .enum("last_unlock_source", ea.STATE, ["zigbee", "keypad", "fingerprintsensor", "rfid", "unattributed", "self", "unknown"])
                .withDescription("Last unlock source"),
            e.text("last_unlock_user", ea.STATE).withDescription("Last unlock user (slot number)"),
            e
                .enum("last_lock_source", ea.STATE, ["zigbee", "keypad", "fingerprintsensor", "rfid", "unattributed", "self", "unknown"])
                .withDescription("Last lock source"),
            e.text("last_lock_user", ea.STATE).withDescription("Last lock user (slot number)"),
            e.text("last_used_pin_code", ea.STATE).withDescription("Last used pin code (actual digits)"),
            e.binary("auto_relock", ea.STATE_SET, true, false).withDescription("Auto relock after 7 seconds."),
            e.numeric("auto_relock_time", ea.STATE).withUnit("s").withDescription("Auto relock delay in seconds"),
            e.numeric("num_pin_users", ea.STATE).withDescription("Number of PIN code users supported"),
            e.numeric("min_pin_length", ea.STATE).withDescription("Minimum PIN code length"),
            e.numeric("max_pin_length", ea.STATE).withDescription("Maximum PIN code length"),
            e.pincode(),
            e.text("last_successful_pincode_clear", ea.STATE).withDescription("Last deleted Pincode"),
            e.text("last_successful_pincode_save", ea.STATE).withDescription("Last saved Pincode"),
        ],
    },
    {
        zigbeeModel: ["NimlyPRO", "NimlyCode", "NimlyTouch", "NimlyIn", "NimlyPRO24", "NimlyShared", "NimlyCodePRO"],
        model: "Nimly",
        vendor: "Onesti Products AS",
        description: "Zigbee module for Nimly Doorlock series",
        fromZigbee: [
            fzLocal.nimly_pro_lock_actions,
            fz.lock,
            fz.lock_operation_event,
            fz.battery,
            fz.lock_programming_event,
            fzLocal.easycodetouch_action,
        ],
        toZigbee: [tz.lock, tzLocal.easycode_auto_relock, tz.lock_sound_volume, tz.pincode_lock],
        meta: {pinCodeCount: 1000, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresDoorLock", "genPowerCfg"]);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read("closuresDoorLock", ["lockState", "soundVolume"]);

            // Try to read lock capabilities (may not be supported by all models)
            try {
                await endpoint.read("closuresDoorLock", ["numOfPinUsersSupported", "minPinLen", "maxPinLen"]);
            } catch (_error) {
                // Capabilities read may fail on some models - this is expected and harmless
                // Attributes will be exposed if the lock reports them during operation
            }

            device.powerSource = "Battery";
            device.save();
        },
        exposes: [
            e.lock(),
            e.battery(),
            e.sound_volume(),
            e.voltage(),
            e
                .enum("last_unlock_source", ea.STATE, ["zigbee", "keypad", "fingerprintsensor", "rfid", "unattributed", "self", "unknown"])
                .withDescription("Last unlock source"),
            e.text("last_unlock_user", ea.STATE).withDescription("Last unlock user (slot number)"),
            e
                .enum("last_lock_source", ea.STATE, ["zigbee", "keypad", "fingerprintsensor", "rfid", "unattributed", "self", "unknown"])
                .withDescription("Last lock source"),
            e.text("last_lock_user", ea.STATE).withDescription("Last lock user (slot number)"),
            e.text("last_used_pin_code", ea.STATE).withDescription("Last used pin code (actual digits)"),
            e.binary("auto_relock", ea.STATE_SET, true, false).withDescription("Auto relock after 7 seconds."),
            e.numeric("auto_relock_time", ea.STATE).withUnit("s").withDescription("Auto relock delay in seconds"),
            e.numeric("num_pin_users", ea.STATE).withDescription("Number of PIN code users supported"),
            e.numeric("min_pin_length", ea.STATE).withDescription("Minimum PIN code length"),
            e.numeric("max_pin_length", ea.STATE).withDescription("Maximum PIN code length"),
            e.pincode(),
        ],
    },
    {
        zigbeeModel: ["S4RX-110"],
        model: "S4RX-110",
        vendor: "Onesti Products AS",
        description: "Relax smart plug",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.device_temperature, fz.identify],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.device_temperature()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                "genIdentify",
                "genOnOff",
                "genDeviceTempCfg",
                "haElectricalMeasurement",
                "seMetering",
            ]);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
            await reporting.deviceTemperature(endpoint);
        },
        endpoint: (device) => {
            return {default: 2};
        },
    },
];
