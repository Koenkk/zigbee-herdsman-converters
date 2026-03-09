import iconv from "iconv-lite";
import {Zcl} from "zigbee-herdsman";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import {utcToDeviceLocal2000Seconds} from "../lib/sonoff";
import type {DefinitionWithExtend, Fz, KeyValueAny, Tz} from "../lib/types";

const NS = "zhc:easyiot";
const ea = exposes.access;
const e = exposes.presets;

interface EasyiotDoorLock {
    attributes: Record<string, never>;
    commands: {
        unlockDoor: {timeout: number; pincodevalue: Buffer};
        unlockDoorWithTimeout: {timeout: number; pincodevalue: Buffer};
        setEphemeralPin: {startTime: number; endTime: number; userid: number; validTimes: number; pincodevalue: Buffer};
        clearEphemeralPin: {userid: number};
        clearAllEphemeralPins: Record<string, never>;
    };
    commandResponses: Record<string, never>;
}

const fzLocal = {
    easyiot_ir_recv_command: {
        cluster: "seTunneling",
        type: ["commandTransferData"],
        convert: (model, msg, publish, options, meta) => {
            logger.debug(`"easyiot_ir_recv_command" received (msg:${JSON.stringify(msg.data)})`, NS);
            const hexString = msg.data.data.toString("hex");
            logger.debug(`"easyiot_ir_recv_command" received command ${hexString}`, NS);
            return {last_received_command: hexString};
        },
    } satisfies Fz.Converter<"seTunneling", undefined, ["commandTransferData"]>,

    easyiot_tts_recv_status: {
        cluster: "seTunneling",
        type: ["commandTransferData"],
        convert: (model, msg, publish, options, meta) => {
            logger.debug(`"easyiot_tts_recv_status" received (msg:${JSON.stringify(msg.data)})`, NS);
            const hexString = msg.data.data.toString("hex");
            logger.debug(`"easyiot_tts_recv_status" received status ${hexString}`, NS);
            return {last_received_status: hexString};
        },
    } satisfies Fz.Converter<"seTunneling", undefined, ["commandTransferData"]>,

    easyiot_sp1000_recv_status: {
        cluster: "seTunneling",
        type: ["commandTransferData"],
        convert: (model, msg, publish, options, meta) => {
            logger.debug(`"easyiot_tts_recv_status" received (msg:${JSON.stringify(msg.data)})`, NS);
            const hexString = msg.data.data.toString("hex");
            logger.debug(`"easyiot_tts_recv_status" received status ${hexString}`, NS);
            if (msg.data.data[0] === 0x80 && msg.data.data[1] === 0) {
                const result = msg.data.data[4];
                return {last_received_status: result};
            }
        },
    } satisfies Fz.Converter<"seTunneling", undefined, ["commandTransferData"]>,

    easyiot_action: {
        cluster: "genOnOff",
        type: ["commandOn", "commandOff", "commandToggle"],
        convert: (model, msg, publish, options, meta) => {
            const lookup: KeyValueAny = {commandToggle: "single", commandOn: "double", commandOff: "long"};
            let buttonMapping: KeyValueAny = null;
            if (model.model === "ZB-WB01") {
                buttonMapping = {1: "1"};
            } else if (model.model === "ZB-WB02") {
                buttonMapping = {1: "1", 2: "2"};
            } else if (model.model === "ZB-WB03") {
                buttonMapping = {1: "1", 2: "2", 3: "3"};
            } else if (model.model === "ZB-WB08") {
                buttonMapping = {1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7", 8: "8"};
            }

            const button = buttonMapping ? `${buttonMapping[msg.endpoint.ID]}_` : "";
            return {action: `${button}${lookup[msg.type]}`};
        },
    } satisfies Fz.Converter<"genOnOff", undefined, ["commandOn", "commandOff", "commandToggle"]>,
};

const tzLocal = {
    easyiot_ir_send_command: {
        key: ["send_command"],
        convertSet: async (entity, key, value, meta) => {
            if (!value) {
                throw new Error("There is no IR code to send");
            }

            logger.debug(`Sending IR code: ${value}`, NS);
            await entity.command(
                "seTunneling",
                "transferData",
                {
                    tunnelId: 0x0000,
                    data: Buffer.from(value as string, "hex"),
                },
                {disableDefaultResponse: true},
            );
            logger.debug("Sending IR command success.", NS);
        },
    } satisfies Tz.Converter,

    easyiot_tts_send_command: {
        key: ["send_tts"],
        convertSet: async (entity, key, value, meta) => {
            if (!value) {
                throw new Error("There is no text to send");
            }

            logger.debug(`Sending IR code: ${value}`, NS);
            const frameHeader = Buffer.from([0xfd]);

            const gb2312Buffer = iconv.encode(value as string, "GB2312");
            const dataLength = gb2312Buffer.length + 2;
            const dataLengthBuffer = Buffer.alloc(2);
            dataLengthBuffer.writeUInt16BE(dataLength, 0);
            const commandByte = Buffer.from([0x01, 0x01]);
            const protocolFrame = Buffer.concat([frameHeader, dataLengthBuffer, commandByte, gb2312Buffer]);

            await entity.command(
                "seTunneling",
                "transferData",
                {
                    tunnelId: 0x0000,
                    data: protocolFrame,
                },
                {disableDefaultResponse: true},
            );
            logger.debug("Sending IR command success.", NS);
        },
    } satisfies Tz.Converter,
    easyiot_sp1000_play_voice: {
        key: ["play_voice"],
        convertSet: async (entity, key, value, meta) => {
            if (!value) {
                throw new Error("There is no text to send");
            }

            logger.debug(`Sending IR code: ${value}`, NS);
            const frameCmd = Buffer.from([0x01, 0x00]);
            const dataLen = Buffer.from([0x02]);
            const dataType = Buffer.from([0x21]);
            const playId = Buffer.from([(value as number) & 0xff, ((value as number) >> 8) & 0xff]);

            const protocolFrame = Buffer.concat([frameCmd, dataLen, dataType, playId]);

            await entity.command(
                "seTunneling",
                "transferData",
                {
                    tunnelId: 0x0001,
                    data: protocolFrame,
                },
                {disableDefaultResponse: true},
            );
            logger.debug("Sending IR command success.", NS);
        },
    } satisfies Tz.Converter,
    easyiot_sp1000_set_volume: {
        key: ["set_volume"],
        convertSet: async (entity, key, value, meta) => {
            if (!value) {
                throw new Error("There is no text to send");
            }

            logger.debug(`Sending IR code: ${value}`, NS);
            const frameCmd = Buffer.from([0x02, 0x00]);
            const dataLen = Buffer.from([0x01]);
            const dataType = Buffer.from([0x20]);
            const volume = Buffer.from([(value as number) & 0xff]);

            const protocolFrame = Buffer.concat([frameCmd, dataLen, dataType, volume]);

            await entity.command(
                "seTunneling",
                "transferData",
                {
                    tunnelId: 0x0001,
                    data: protocolFrame,
                },
                {disableDefaultResponse: true},
            );
            logger.debug("Sending IR command success.", NS);
        },
    } satisfies Tz.Converter,
    easyiot_zl01_open_door: {
        key: ["unlock_door"],
        convertSet: async (entity, key, value, meta) => {
            if (!value) {
                logger.error("There is no pin code to send", NS);
                return;
            }

            logger.debug(`Sending pin code: ${value}`, NS);
            const length = Buffer.from([value.toString().length]);
            const pincode = Buffer.from(value.toString(), "utf-8");
            const data = Buffer.concat([length, pincode]);

            await entity.command(
                "closuresDoorLock",
                "unlockDoor",
                {
                    pincodevalue: data,
                },
                {disableDefaultResponse: true},
            );
            logger.debug("Sending unlock door command success.", NS);
        },
    } as Tz.Converter,
    easyiot_zl01_open_door_with_timeout: {
        key: ["unlock_door_with_timeout"],
        convertSet: async (entity, key, value, meta) => {
            if (!value || typeof value !== "object") {
                logger.error("There is no pin code or timeout to send", NS);
                return;
            }

            const payload = value as KeyValueAny;
            logger.debug(`Sending pin code: ${payload.pin_code} with timeout: ${payload.timeout} seconds`, NS);
            const length = Buffer.from([payload.pin_code.length]);
            const pincodeBuffer = Buffer.from(payload.pin_code as string, "utf-8");
            const data = Buffer.concat([length, pincodeBuffer]);
            try {
                const commandPayload: EasyiotDoorLock["commands"]["unlockDoorWithTimeout"] = {
                    timeout: payload.timeout,
                    pincodevalue: data,
                };
                await entity.command<"closuresDoorLock", "unlockDoorWithTimeout", EasyiotDoorLock>(
                    "closuresDoorLock",
                    "unlockDoorWithTimeout",
                    commandPayload,
                    {disableDefaultResponse: true},
                );
                logger.debug("Adding ephemeral pin success.", NS);
            } catch (error) {
                logger.error(`Failed to add ephemeral pin: ${error}`, NS);
                throw error;
            }

            logger.debug("Sending unlock door with timeout command success.", NS);
        },
    } as Tz.Converter,
    easyiot_zl01_add_ephemeral_pin: {
        key: ["ephemeral_pin_code"],
        convertSet: async (entity, key, value, meta) => {
            if (!value || typeof value !== "object") {
                throw new Error("ephemeral_pin_code requires an object with start_time, end_time, userid, valid_times, and pincode");
            }

            const payload = value as KeyValueAny;

            // Validate required parameters
            if (typeof payload.start_time !== "number") {
                throw new Error("start_time must be a number (UNIX timestamp in seconds)");
            }
            if (typeof payload.end_time !== "number") {
                throw new Error("end_time must be a number (UNIX timestamp in seconds)");
            }
            if (typeof payload.userid !== "number") {
                throw new Error("userid must be a number (0-65535)");
            }
            if (typeof payload.valid_times !== "number") {
                throw new Error("valid_times must be a number (0-255)");
            }
            if (typeof payload.pincode !== "string") {
                throw new Error("pincode must be a string");
            }

            logger.debug(
                `Adding ephemeral pin - startTime: ${payload.start_time}, endTime: ${payload.end_time}, userid: ${payload.userid}, validTimes: ${payload.valid_times}, pincode: ${payload.pincode}`,
                NS,
            );

            // Convert UNIX timestamps to Zigbee 2000-based local time seconds
            // Use UTC (offset 0) as default timezone for temporary passwords
            const startTimeZigbee = utcToDeviceLocal2000Seconds(payload.start_time, 0);
            const endTimeZigbee = utcToDeviceLocal2000Seconds(payload.end_time, 0);

            // Convert pincode string to buffer
            const pincodeBuffer = Buffer.from(payload.pincode, "utf-8");

            try {
                const commandPayload: EasyiotDoorLock["commands"]["setEphemeralPin"] = {
                    startTime: startTimeZigbee,
                    endTime: endTimeZigbee,
                    userid: payload.userid,
                    validTimes: payload.valid_times,
                    pincodevalue: pincodeBuffer,
                };
                await entity.command<"closuresDoorLock", "setEphemeralPin", EasyiotDoorLock>("closuresDoorLock", "setEphemeralPin", commandPayload, {
                    disableDefaultResponse: true,
                });
                logger.debug("Adding ephemeral pin success.", NS);
            } catch (error) {
                logger.error(`Failed to add ephemeral pin: ${error}`, NS);
                throw error;
            }
        },
    } as Tz.Converter,
    easyiot_zl01_clear_ephemeral_pin: {
        key: ["ephemeral_clear_pin_code"],
        convertSet: async (entity, key, value, meta) => {
            if (!value || typeof value !== "object") {
                throw new Error("ephemeral_clear_pin_code requires an object with userid");
            }

            const payload = value as KeyValueAny;

            // Validate required parameter
            if (typeof payload.userid !== "number") {
                throw new Error("userid must be a number (0-65535)");
            }

            logger.debug(`Clearing ephemeral pin - userid: ${payload.userid}`, NS);

            try {
                const commandPayload: EasyiotDoorLock["commands"]["clearEphemeralPin"] = {
                    userid: payload.userid,
                };
                await entity.command<"closuresDoorLock", "clearEphemeralPin", EasyiotDoorLock>(
                    "closuresDoorLock",
                    "clearEphemeralPin",
                    commandPayload,
                    {disableDefaultResponse: true},
                );
                logger.debug("Clearing ephemeral pin success.", NS);
            } catch (error) {
                logger.error(`Failed to clear ephemeral pin: ${error}`, NS);
                throw error;
            }
        },
    } as Tz.Converter,
    easyiot_zl01_clear_all_ephemeral_pin: {
        key: ["ephemeral_clear_all_pin_code"],
        convertSet: async (entity, key, value, meta) => {
            logger.debug("Clearing all ephemeral pins.", NS);

            try {
                const commandPayload: EasyiotDoorLock["commands"]["clearAllEphemeralPins"] = {};
                await entity.command<"closuresDoorLock", "clearAllEphemeralPins", EasyiotDoorLock>(
                    "closuresDoorLock",
                    "clearAllEphemeralPins",
                    commandPayload,
                    {disableDefaultResponse: true},
                );
                logger.debug("Clearing all ephemeral pins success.", NS);
            } catch (error) {
                logger.error(`Failed to clear all ephemeral pins: ${error}`, NS);
                throw error;
            }
        },
    } as Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "ZB-IR01", manufacturerName: "easyiot"}],
        model: "ZB-IR01",
        vendor: "easyiot",
        description: "Infrared remote control equipped with local code library,",
        fromZigbee: [fzLocal.easyiot_ir_recv_command],
        toZigbee: [tzLocal.easyiot_ir_send_command],
        exposes: [
            e.text("last_received_command", ea.STATE).withDescription("Received infrared control command"),
            e.text("send_command", ea.SET).withDescription("Send infrared control command"),
        ],
    },
    {
        fingerprint: [{modelID: "ZB-TTS01", manufacturerName: "easyiot"}],
        model: "ZB-TTS01",
        vendor: "easyiot",
        description: "TTS Converter for Simplified Chinese GB2312 encoded text",
        fromZigbee: [fzLocal.easyiot_tts_recv_status],
        toZigbee: [tzLocal.easyiot_tts_send_command],
        exposes: [
            e.text("last_received_status", ea.STATE).withDescription("status"),
            e.text("send_tts", ea.SET).withDescription("Please enter text"),
        ],
    },
    {
        fingerprint: [{modelID: "ZB-SP1000", manufacturerName: "easyiot"}],
        model: "ZB-SP1000",
        vendor: "easyiot",
        description: "ZB-SP1000 is an MP3 player that can support 1,000 voices.",
        fromZigbee: [fzLocal.easyiot_sp1000_recv_status],
        toZigbee: [tzLocal.easyiot_sp1000_play_voice, tzLocal.easyiot_sp1000_set_volume],
        exposes: [
            e.numeric("play_voice", ea.SET).withDescription("Please enter ID(1-999)").withValueMin(1).withValueMax(999).withValueStep(1),
            e.numeric("set_volume", ea.SET).withDescription("Please enter volume(1-30)").withValueMin(1).withValueMax(30).withValueStep(1),
            e.text("last_received_status", ea.STATE).withDescription("status"),
        ],
    },
    {
        fingerprint: [{modelID: "ZB-RS485", manufacturerName: "easyiot"}],
        model: "ZB-RS485",
        vendor: "easyiot",
        description: "Zigbee to RS485 controller",
        fromZigbee: [fzLocal.easyiot_ir_recv_command],
        toZigbee: [tzLocal.easyiot_ir_send_command],
        exposes: [
            e.text("last_received_command", ea.STATE).withDescription("Received data"),
            e.text("send_command", ea.SET).withDescription("Send data"),
        ],
    },
    {
        zigbeeModel: ["ZB-PM01"],
        model: "ZB-PM01",
        vendor: "easyiot",
        description: "Smart circuit breaker with Metering",
        extend: [m.onOff({powerOnBehavior: false}), m.electricityMeter()],
    },
    {
        zigbeeModel: ["ZB-WC01"],
        model: "ZB-WC01",
        vendor: "easyiot",
        description: "Curtain motor",
        extend: [m.windowCovering({controls: ["lift"], configureReporting: false})],
    },
    {
        zigbeeModel: ["ZB-WB01"],
        model: "ZB-WB01",
        vendor: "easyiot",
        description: "1-button remote control",
        fromZigbee: [fzLocal.easyiot_action],
        toZigbee: [],
        exposes: [e.action(["1_single", "1_double", "1_long"]), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint, {min: 30, max: 1800, change: 1});
        },
    },
    {
        zigbeeModel: ["ZB-WB02"],
        model: "ZB-WB02",
        vendor: "easyiot",
        description: "2-button remote control",
        fromZigbee: [fzLocal.easyiot_action],
        toZigbee: [],
        exposes: [e.action(["1_single", "1_double", "1_long", "2_single", "2_double", "2_long"]), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint, {min: 30, max: 1800, change: 1});
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        zigbeeModel: ["ZB-WB03"],
        model: "ZB-WB03",
        vendor: "easyiot",
        description: "3-button remote control",
        fromZigbee: [fzLocal.easyiot_action],
        toZigbee: [],
        exposes: [e.action(["1_single", "1_double", "1_long", "2_single", "2_double", "2_long", "3_single", "3_double", "3_long"]), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint, {min: 30, max: 1800, change: 1});
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        zigbeeModel: ["ZB-WB08"],
        model: "ZB-WB08",
        vendor: "easyiot",
        description: "8-button remote control",
        fromZigbee: [fzLocal.easyiot_action],
        toZigbee: [],
        exposes: [
            e.action([
                "1_single",
                "1_double",
                "1_long",
                "2_single",
                "2_double",
                "2_long",
                "3_single",
                "3_double",
                "3_long",
                "4_single",
                "4_double",
                "4_long",
                "5_single",
                "5_double",
                "5_long",
                "6_single",
                "6_double",
                "6_long",
                "7_single",
                "7_double",
                "7_long",
                "8_single",
                "8_double",
                "8_long",
            ]),
            e.battery(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint, {min: 30, max: 1800, change: 1});
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(6), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(7), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(8), coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        fingerprint: [{modelID: "ZB-PSW04", manufacturerName: "easyiot"}],
        model: "ZB-PSW04",
        vendor: "easyiot",
        description: "Zigbee 4-channel relay",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3, l4: 4}}),
            m.onOff({endpointNames: ["l1", "l2", "l3", "l4"], configureReporting: false, powerOnBehavior: false}),
        ],
    },
    {
        fingerprint: [{modelID: "ZB-SW08", manufacturerName: "easyiot"}],
        model: "ZB-SW08",
        vendor: "easyiot",
        description: "Zigbee 8-channel relay",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5, l6: 6, l7: 7, l8: 8}}),
            m.onOff({endpointNames: ["l1", "l2", "l3", "l4", "l5", "l6", "l7", "l8"], configureReporting: false, powerOnBehavior: false}),
        ],
    },

    {
        fingerprint: [{modelID: "ZB-ZL01", manufacturerName: "easyiot"}],
        model: "ZB-ZL01",
        vendor: "easyiot",
        description: "This is easyiot's smart door lock",
        fromZigbee: [],
        toZigbee: [
            tzLocal.easyiot_zl01_open_door,
            tzLocal.easyiot_zl01_open_door_with_timeout,
            tzLocal.easyiot_zl01_add_ephemeral_pin,
            tzLocal.easyiot_zl01_clear_ephemeral_pin,
            tzLocal.easyiot_zl01_clear_all_ephemeral_pin,
        ],
        extend: [
            m.deviceAddCustomCluster("closuresDoorLock", {
                name: "customClusterDoorLock",
                ID: 0x0101,
                attributes: {},
                commands: {
                    unlockDoorWithTimeout: {
                        ID: 0x03,
                        name: "unlockDoorWithTimeout",
                        response: 3,
                        parameters: [
                            {name: "timeout", type: Zcl.DataType.UINT32},
                            {name: "pincodevalue", type: Zcl.DataType.OCTET_STR},
                        ],
                    },
                    setEphemeralPin: {
                        ID: 0xb6,
                        name: "setEphemeralPin",
                        response: 182,
                        parameters: [
                            {name: "startTime", type: Zcl.DataType.UINT32},
                            {name: "endTime", type: Zcl.DataType.UINT32},
                            {name: "userid", type: Zcl.DataType.UINT16},
                            {name: "validTimes", type: Zcl.DataType.UINT8},
                            {name: "pincodevalue", type: Zcl.DataType.OCTET_STR},
                        ],
                    },
                    clearEphemeralPin: {
                        ID: 0xb8,
                        name: "clearEphemeralPin",
                        response: 184,
                        parameters: [{name: "userid", type: Zcl.DataType.UINT16}],
                    },
                    clearAllEphemeralPins: {
                        ID: 0xb9,
                        name: "clearAllEphemeralPins",
                        response: 185,
                        parameters: [],
                    },
                },
                commandsResponse: {
                    unlockDoorRsp: {ID: 0x01, name: "unlockDoorRsp", parameters: [{name: "status", type: Zcl.DataType.ENUM8}], required: true},
                    unlockWithTimeoutRsp: {ID: 0x03, name: "unlockWithTimeoutRsp", parameters: [{name: "status", type: Zcl.DataType.ENUM8}]},
                    setEphemeralPinRsp: {ID: 182, name: "setEphemeralPinRsp", parameters: [{name: "status", type: Zcl.DataType.UINT8}]},
                    clearEphemeralPinRsp: {ID: 184, name: "clearEphemeralPinRsp", parameters: [{name: "status", type: Zcl.DataType.UINT8}]},
                    clearAllEphemeralPinsRsp: {ID: 185, name: "clearAllEphemeralPinsRsp", parameters: [{name: "status", type: Zcl.DataType.UINT8}]},
                },
            }),
            m.battery({percentageReportingConfig: {min: 30, max: 1800, change: 1}}),
        ],
        exposes: [
            e.numeric("lock_status", ea.STATE | ea.GET).withDescription("Lock status reported by the lock, 0 means locked, 1 means unlocked"),
            e.text("unlock_door", ea.SET).withDescription("Enter password to unlock door"),
            e
                .composite("unlock_door_with_timeout", "unlock_door_with_timeout", ea.ALL)
                .withFeature(e.numeric("timeout", ea.SET).withDescription("Number of seconds the PIN code is valid, 0 means lock will be re-locked"))
                .withFeature(e.text("pin_code", ea.SET).withLabel("PIN code").withDescription("Pincode to set, set pincode to null to clear")),
            e
                .composite("ephemeral_pin_code", "ephemeral_pin_code", ea.SET)
                .withFeature(e.numeric("start_time", ea.SET).withDescription("Temporary PIN start time (UNIX timestamp in seconds)"))
                .withFeature(e.numeric("end_time", ea.SET).withDescription("Temporary PIN end time (UNIX timestamp in seconds)"))
                .withFeature(e.numeric("userid", ea.SET).withDescription("User ID for the temporary PIN (1-20)").withValueMin(1).withValueMax(20))
                .withFeature(
                    e
                        .numeric("valid_times", ea.SET)
                        .withDescription("Number of times the temporary PIN can be used (0-255, 0 means unlimited)")
                        .withValueMin(0)
                        .withValueMax(255),
                )
                .withFeature(e.text("pincode", ea.SET).withDescription("The temporary PIN code (numeric string)")),
            e
                .composite("ephemeral_clear_pin_code", "ephemeral_clear_pin_code", ea.SET)
                .withFeature(e.numeric("userid", ea.SET).withDescription("User ID for the temporary PIN (1-20)").withValueMin(1).withValueMax(20)),
            e.composite("ephemeral_clear_all_pin_code", "ephemeral_clear_all_pin_code", ea.SET),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            //await reporting.batteryPercentageRemaining(endpoint, {min: 30, max: 1800, change: 1});
        },
    },
];
