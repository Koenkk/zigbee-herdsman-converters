import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValue} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    nimly_pro_lock_actions: {
        cluster: "closuresDoorLock",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            const attributes: KeyValue = {};

            // Handle attribute 257: last_used_pin_code
            // The lock sends PIN codes as the actual digits typed
            // Report exactly what the lock sends
            if (msg.data["257"] !== undefined) {
                const data = msg.data["257"];

                if (Buffer.isBuffer(data)) {
                    // Convert buffer to ASCII string
                    attributes.last_used_pin_code = data.toString("ascii").trim();
                } else if (Array.isArray(data)) {
                    // Array of bytes, convert to ASCII string
                    attributes.last_used_pin_code = Buffer.from(data).toString("ascii").trim();
                } else if (typeof data === "string") {
                    // Already a string
                    attributes.last_used_pin_code = data.trim();
                } else {
                    // Fallback: convert to string
                    attributes.last_used_pin_code = String(data);
                }
            }

            // Handle attribute 256: last action (lock/unlock) source and user
            // Format: 4 bytes as 32-bit integer
            // Byte 0: Source (00=zigbee, 02=keypad, 03=finger, 04=rfid, 0a=manual)
            // Byte 1: Action (01=lock, 02=unlock)
            // Bytes 2-3: User ID (16-bit integer)
            if (msg.data["256"] !== undefined) {
                const hex = (msg.data["256"] as number).toString(16).padStart(8, "0");
                const firstOctet = String(hex.substring(0, 2));
                const lookup: {[key: string]: string} = {
                    "00": "zigbee",
                    "02": "keypad",
                    "03": "fingerprintsensor",
                    "04": "rfid",
                    "0a": "self",
                };
                result.last_action_source = lookup[firstOctet] || "unknown";
                const secondOctet = hex.substring(2, 4);
                const thirdOctet = hex.substring(4, 8);
                result.last_action_user = Number.parseInt(thirdOctet, 16);

                // Store user ID as string for consistency with Home Assistant expectations
                const userIdStr = result.last_action_user.toString();

                if (secondOctet === "01") {
                    attributes.last_lock_user = userIdStr;
                    attributes.last_lock_source = result.last_action_source;
                } else if (secondOctet === "02") {
                    attributes.last_unlock_user = userIdStr;
                    attributes.last_unlock_source = result.last_action_source;
                }
            }

            // Handle voltage attribute (if present)
            if (Object.hasOwn(msg.data, "voltage")) {
                attributes.voltage = (msg.data as KeyValue)["voltage"];
            }

            // Handle auto_relock_time attribute (if present)
            if (Object.hasOwn(msg.data, "autoRelockTime")) {
                attributes.auto_relock_time = (msg.data as KeyValue)["autoRelockTime"];
            }

            // Handle lock capabilities (if present)
            // Attribute 18 (0x12): Number of PIN users supported
            if (Object.hasOwn(msg.data, 18)) {
                attributes.max_pin_users = (msg.data as KeyValue)[18];
            }

            // Attribute 23 (0x17): Min PIN code length
            if (Object.hasOwn(msg.data, 23)) {
                attributes.min_pin_length = (msg.data as KeyValue)[23];
            }

            // Attribute 24 (0x18): Max PIN code length
            if (Object.hasOwn(msg.data, 24)) {
                attributes.max_pin_length = (msg.data as KeyValue)[24];
            }

            // Return result if not empty
            if (Object.keys(attributes).length > 0) {
                return attributes;
            }
        },
    } satisfies Fz.Converter<"closuresDoorLock", undefined, ["attributeReport", "readResponse"]>,
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
            fz.easycodetouch_action,
        ],
        toZigbee: [tz.lock, tz.easycode_auto_relock, tz.lock_sound_volume, tz.pincode_lock],
        meta: {pinCodeCount: 1000, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresDoorLock", "genPowerCfg"]);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read("closuresDoorLock", ["lockState", "soundVolume"]);

            // Try to read lock capabilities (may not be supported by all models)
            try {
                await endpoint.read("closuresDoorLock", [18, 23, 24]); // maxPinUsers, minPinLength, maxPinLength
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
                .enum("last_unlock_source", ea.STATE, ["zigbee", "keypad", "fingerprintsensor", "rfid", "self", "unknown"])
                .withDescription("Last unlock source"),
            e.text("last_unlock_user", ea.STATE).withDescription("Last unlock user (slot number)"),
            e
                .enum("last_lock_source", ea.STATE, ["zigbee", "keypad", "fingerprintsensor", "rfid", "self", "unknown"])
                .withDescription("Last lock source"),
            e.text("last_lock_user", ea.STATE).withDescription("Last lock user (slot number)"),
            e.text("last_used_pin_code", ea.STATE).withDescription("Last used pin code (actual digits)"),
            e.binary("auto_relock", ea.STATE_SET, true, false).withDescription("Auto relock after 7 seconds."),
            e.numeric("auto_relock_time", ea.STATE).withUnit("s").withDescription("Auto relock delay in seconds"),
            e.numeric("max_pin_users", ea.STATE).withDescription("Maximum number of PIN users supported"),
            e.numeric("min_pin_length", ea.STATE).withDescription("Minimum PIN code length"),
            e.numeric("max_pin_length", ea.STATE).withDescription("Maximum PIN code length"),
            e.pincode(),
            e.text("last_successful_pincode_clear", ea.STATE).withDescription("Last deleted Pincode"),
            e.text("last_successful_pincode_save", ea.STATE).withDescription("Last saved Pincode"),
        ],
    },
    {
        zigbeeModel: ["NimlyPRO", "NimlyCode", "NimlyTouch", "NimlyIn", "NimlyPRO24", "NimlyShared"],
        model: "Nimly",
        vendor: "Onesti Products AS",
        description: "Zigbee module for Nimly Doorlock series",
        fromZigbee: [
            fzLocal.nimly_pro_lock_actions,
            fz.lock,
            fz.lock_operation_event,
            fz.battery,
            fz.lock_programming_event,
            fz.easycodetouch_action,
        ],
        toZigbee: [tz.lock, tz.easycode_auto_relock, tz.lock_sound_volume, tz.pincode_lock],
        meta: {pinCodeCount: 1000, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresDoorLock", "genPowerCfg"]);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read("closuresDoorLock", ["lockState", "soundVolume"]);
            device.powerSource = "Battery";
            device.save();
        },
        exposes: [
            e.lock(),
            e.battery(),
            e.sound_volume(),
            e.voltage(),
            e
                .enum("last_unlock_source", ea.STATE, ["zigbee", "keypad", "fingerprintsensor", "rfid", "self", "unknown"])
                .withDescription("Last unlock source"),
            e.text("last_unlock_user", ea.STATE).withDescription("Last unlock user (slot number)"),
            e
                .enum("last_lock_source", ea.STATE, ["zigbee", "keypad", "fingerprintsensor", "rfid", "self", "unknown"])
                .withDescription("Last lock source"),
            e.text("last_lock_user", ea.STATE).withDescription("Last lock user (slot number)"),
            e.text("last_used_pin_code", ea.STATE).withDescription("Last used pin code (actual digits)"),
            e.binary("auto_relock", ea.STATE_SET, true, false).withDescription("Auto relock after 7 seconds."),
            e.numeric("auto_relock_time", ea.STATE).withUnit("s").withDescription("Auto relock delay in seconds"),
            e.numeric("max_pin_users", ea.STATE).withDescription("Maximum number of PIN users supported"),
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
