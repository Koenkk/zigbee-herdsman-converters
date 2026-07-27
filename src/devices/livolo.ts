import type {RawClusterAttributes} from "zigbee-herdsman/dist/controller/tstype";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, KeyValueAny, ModernExtend, Tz, Zh} from "../lib/types";
import * as utils from "../lib/utils";

const NS = "zhc:livolo";

const e = exposes.presets;
const ea = exposes.access;

const poll = async (device: Zh.Device) => {
    try {
        const endpoint = device.getEndpoint(6);
        const options = {transactionSequenceNumber: 0, srcEndpoint: 8, disableResponse: true, disableRecovery: true};
        await endpoint.command("genOnOff", "toggle", {}, options);
    } catch {
        // device is lost, need to permit join
    }
};

const mLocal = {
    poll: (): ModernExtend => {
        const extend = m.poll({
            key: "interval",
            defaultIntervalSeconds: 300,
            poll,
        });
        return {...extend, configure: [poll]};
    },
};

const tzLocal = {
    livolo_socket_switch_on_off: {
        key: ["state"],
        convertSet: async (entity, key, value, meta) => {
            if (typeof value !== "string") {
                return;
            }

            const state = value.toLowerCase();
            let oldstate = 1;
            if (state === "on") {
                oldstate = 108;
            }
            let channel = 1.0;
            const postfix = meta.endpoint_name || "left";
            await entity.command("genOnOff", "toggle", {}, {transactionSequenceNumber: 0});
            const payloadOn = {1: {value: Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]), type: 1}};
            const payloadOff = {1: {value: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]), type: 1}};
            const payloadOnRight = {1: {value: Buffer.from([2, 0, 0, 0, 0, 0, 0, 0]), type: 2}};
            const payloadOffRight = {1: {value: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]), type: 2}};
            const payloadOnBottomLeft = {1: {value: Buffer.from([4, 0, 0, 0, 0, 0, 0, 0]), type: 4}};
            const payloadOffBottomLeft = {1: {value: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]), type: 4}};
            const payloadOnBottomRight = {1: {value: Buffer.from([8, 0, 0, 0, 0, 0, 0, 0]), type: 136}};
            const payloadOffBottomRight = {1: {value: Buffer.from([0, 0, 0, 0, 0, 0, 0, 0]), type: 136}};
            if (postfix === "left") {
                await entity.command("genLevelCtrl", "moveToLevelWithOnOff", {
                    level: oldstate,
                    transtime: channel,
                    optionsMask: 0,
                    optionsOverride: 0,
                });
                await entity.write("genPowerCfg", state === "on" ? payloadOn : payloadOff, {
                    manufacturerCode: 0x1ad2,
                    disableDefaultResponse: true,
                    disableResponse: true,
                    reservedBits: 3,
                    direction: 1,
                    transactionSequenceNumber: 0xe9,
                });
                return {state: {state: value.toUpperCase()}};
            }
            if (postfix === "right") {
                channel = 2.0;
                await entity.command("genLevelCtrl", "moveToLevelWithOnOff", {
                    level: oldstate,
                    transtime: channel,
                    optionsMask: 0,
                    optionsOverride: 0,
                });
                await entity.write("genPowerCfg", state === "on" ? payloadOnRight : payloadOffRight, {
                    manufacturerCode: 0x1ad2,
                    disableDefaultResponse: true,
                    disableResponse: true,
                    reservedBits: 3,
                    direction: 1,
                    transactionSequenceNumber: 0xe9,
                });
                return {state: {state: value.toUpperCase()}};
            }
            if (postfix === "bottom_right") {
                await entity.write("genPowerCfg", state === "on" ? payloadOnBottomRight : payloadOffBottomRight, {
                    manufacturerCode: 0x1ad2,
                    disableDefaultResponse: true,
                    disableResponse: true,
                    reservedBits: 3,
                    direction: 1,
                    transactionSequenceNumber: 0xe9,
                });
                return {state: {state: value.toUpperCase()}};
            }
            if (postfix === "bottom_left") {
                await entity.write("genPowerCfg", state === "on" ? payloadOnBottomLeft : payloadOffBottomLeft, {
                    manufacturerCode: 0x1ad2,
                    disableDefaultResponse: true,
                    disableResponse: true,
                    reservedBits: 3,
                    direction: 1,
                    transactionSequenceNumber: 0xe9,
                });
                return {state: {state: value.toUpperCase()}};
            }
            return {state: {state: value.toUpperCase()}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.command("genOnOff", "toggle", {}, {transactionSequenceNumber: 0});
        },
    } satisfies Tz.Converter,
    livolo_switch_on_off: {
        key: ["state"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value, key);
            const postfix = meta.endpoint_name || "left";
            const state = value.toLowerCase() === "on" ? 108 : 1;
            let channel = 1;

            if (postfix === "left") {
                channel = 1.0;
            } else if (postfix === "right") {
                channel = 2.0;
            } else {
                return;
            }

            await entity.command("genLevelCtrl", "moveToLevelWithOnOff", {level: state, transtime: channel, optionsMask: 0, optionsOverride: 0});
            return {state: {state: value.toUpperCase()}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.command("genOnOff", "toggle", {}, {transactionSequenceNumber: 0});
        },
    } satisfies Tz.Converter,
    livolo_dimmer_level: {
        key: ["brightness", "brightness_percent", "level"],
        convertSet: async (entity, key, value, meta) => {
            // upscale to 100
            value = Number(value);
            utils.assertNumber(value, key);
            // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
            let newValue;
            if (key === "level") {
                if (value >= 0 && value <= 1000) {
                    newValue = utils.mapNumberRange(value, 0, 1000, 0, 100);
                } else {
                    throw new Error("Dimmer level is out of range 0..1000");
                }
            } else if (key === "brightness_percent") {
                if (value >= 0 && value <= 100) {
                    newValue = Math.round(value);
                } else {
                    throw new Error("Dimmer brightness_percent is out of range 0..100");
                }
            } else {
                if (value >= 0 && value <= 255) {
                    newValue = utils.mapNumberRange(value, 0, 255, 0, 100);
                } else {
                    throw new Error("Dimmer brightness is out of range 0..255");
                }
            }
            await entity.command("genOnOff", "toggle", {}, {transactionSequenceNumber: 0});
            const payload = {769: {value: Buffer.from([newValue, 0, 0, 0, 0, 0, 0, 0]), type: 1}};
            await entity.write("genPowerCfg", payload, {
                manufacturerCode: 0x1ad2,
                disableDefaultResponse: true,
                disableResponse: true,
                reservedBits: 3,
                direction: 1,
                transactionSequenceNumber: 0xe9,
                writeUndiv: true,
            });
            return {
                state: {brightness_percent: newValue, brightness: utils.mapNumberRange(newValue, 0, 100, 0, 255), level: newValue * 10},
            };
        },
        convertGet: async (entity, key, meta) => {
            await entity.command("genOnOff", "toggle", {}, {transactionSequenceNumber: 0});
        },
    } satisfies Tz.Converter,
    livolo_cover_state: {
        key: ["state"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertEndpoint(entity);
            // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
            let payload;
            const options = {
                frameType: 0,
                manufacturerCode: 0x1ad2,
                disableDefaultResponse: true,
                disableResponse: true,
                reservedBits: 3,
                direction: 1,
                writeUndiv: true,
                transactionSequenceNumber: 0xe9,
            };
            switch (value) {
                case "OPEN":
                    payload = {attrId: 0x0000, selector: null, elementData: [0x04, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]};
                    break;
                case "CLOSE":
                    payload = {attrId: 0x0000, selector: null, elementData: [0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]};
                    break;
                case "STOP":
                    payload = {attrId: 0x0000, selector: null, elementData: [0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]};
                    break;
                default:
                    throw new Error(`Value '${value}' is not a valid cover position (must be one of 'OPEN' or 'CLOSE')`);
            }
            await entity.writeStructured(
                "genPowerCfg",
                // @ts-expect-error workaround write custom payload
                [payload],
                options,
            );
            return {
                state: {
                    moving: true,
                },
            };
        },
    } satisfies Tz.Converter,
    livolo_cover_position: {
        key: ["position"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertNumber(value, key);
            const position = 100 - value;
            await entity.command("genOnOff", "toggle", {}, {transactionSequenceNumber: 0});
            const payload = {1025: {value: [position, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00], type: 1}};
            await entity.write("genPowerCfg", payload, {
                manufacturerCode: 0x1ad2,
                disableDefaultResponse: true,
                disableResponse: true,
                reservedBits: 3,
                direction: 1,
                transactionSequenceNumber: 0xe9,
                writeUndiv: true,
            });
            return {
                state: {
                    position: value,
                    moving: true,
                },
            };
        },
    } satisfies Tz.Converter,
    livolo_cover_options: {
        key: ["options"],
        convertSet: async (entity, key, value, meta) => {
            utils.assertObject(value);
            const options = {
                frameType: 0,
                manufacturerCode: 0x1ad2,
                disableDefaultResponse: true,
                disableResponse: true,
                reservedBits: 3,
                direction: 1,
                writeUndiv: true,
                transactionSequenceNumber: 0xe9,
            };

            if (value.motor_direction != null) {
                // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
                let direction;
                switch (value.motor_direction) {
                    case "FORWARD":
                        direction = 0x00;
                        break;
                    case "REVERSE":
                        direction = 0x80;
                        break;
                    default:
                        throw new Error(`livolo_cover_options: ${value.motor_direction} is not a valid motor direction \
                     (must be one of 'FORWARD' or 'REVERSE')`);
                }

                const payload = {4865: {value: [direction, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]}};
                await entity.write(
                    "genPowerCfg",
                    // @ts-expect-error workaround write custom payload
                    payload,
                    options,
                );
            }

            if (value.motor_speed != null) {
                if (value.motor_speed < 20 || value.motor_speed > 40) {
                    throw new Error("livolo_cover_options: Motor speed is out of range (20-40)");
                }
                const payload = {4609: {value: [value.motor_speed, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]}};
                await entity.write(
                    "genPowerCfg",
                    // @ts-expect-error workaround write custom payload
                    payload,
                    options,
                );
            }
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    // biome-ignore lint/suspicious/noExplicitAny: ignore
    prevent_disconnect: (args: {dp: number; payload: ((data: any) => RawClusterAttributes) | RawClusterAttributes}): Fz.Converter<"genPowerCfg"> => {
        return {
            // This is needed while pairing in order to let the device know that the interview went right and prevent
            // it from disconnecting from the Zigbee network.
            cluster: "genPowerCfg",
            type: ["raw"],
            convert: (model, msg, publish, options, meta) => {
                const dp = msg.data[10];
                if (msg.data[0] === 0x7a && msg.data[1] === 0xd1) {
                    const endpoint = msg.device.getEndpoint(6);
                    if (dp === args.dp) {
                        const options = {
                            manufacturerCode: 0x1ad2,
                            disableDefaultResponse: true,
                            disableResponse: true,
                            reservedBits: 3,
                            direction: 1,
                            writeUndiv: true,
                        };
                        endpoint
                            .readResponse("genPowerCfg", 0xe9, typeof args.payload === "function" ? args.payload(msg.data) : args.payload, options)
                            .catch((error) => logger.error(`Failed to prevent disconnect of '${msg.device.ieeeAddr}}' (${error})`, NS));
                    }
                }
            },
        };
    },
    livolo_switch_state: {
        cluster: "genOnOff",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const status = msg.data.onOff;
            return {
                state_left: status & 1 ? "ON" : "OFF",
                state_right: status & 2 ? "ON" : "OFF",
            };
        },
    } satisfies Fz.Converter<"genOnOff", undefined, ["attributeReport", "readResponse"]>,
    livolo_socket_state: {
        cluster: "genPowerCfg",
        type: ["raw"],
        convert: (model, msg, publish, options, meta) => {
            const stateHeader = Buffer.from([122, 209]);
            if (msg.data.indexOf(stateHeader) === 0) {
                const status = msg.data[14];
                return {state: status & 1 ? "ON" : "OFF"};
            }
        },
    } satisfies Fz.Converter<"genPowerCfg", undefined, ["raw"]>,
    livolo_new_switch_state: {
        cluster: "genPowerCfg",
        type: ["raw"],
        convert: (model, msg, publish, options, meta) => {
            const stateHeader = Buffer.from([122, 209]);
            if (msg.data.indexOf(stateHeader) === 0) {
                const status = msg.data[14];
                return {state: status & 1 ? "ON" : "OFF"};
            }
        },
    } satisfies Fz.Converter<"genPowerCfg", undefined, ["raw"]>,
    livolo_new_switch_state_2gang: {
        cluster: "genPowerCfg",
        type: ["raw"],
        convert: (model, msg, publish, options, meta) => {
            const stateHeader = Buffer.from([122, 209]);
            if (msg.data.indexOf(stateHeader) === 0) {
                if (msg.data[10] === 7) {
                    const status = msg.data[14];
                    return {
                        state_left: status & 1 ? "ON" : "OFF",
                        state_right: status & 2 ? "ON" : "OFF",
                    };
                }
            }
        },
    } satisfies Fz.Converter<"genPowerCfg", undefined, ["raw"]>,
    livolo_new_switch_state_4gang: {
        cluster: "genPowerCfg",
        type: ["raw"],
        convert: (model, msg, publish, options, meta) => {
            const stateHeader = Buffer.from([122, 209]);
            if (msg.data.indexOf(stateHeader) === 0) {
                if (msg.data[10] === 7) {
                    const status = msg.data[14];
                    return {
                        state_left: status & 1 ? "ON" : "OFF",
                        state_right: status & 2 ? "ON" : "OFF",
                        state_bottom_left: status & 4 ? "ON" : "OFF",
                        state_bottom_right: status & 8 ? "ON" : "OFF",
                    };
                }
                if (msg.data[10] === 13) {
                    const status = msg.data[13];
                    return {
                        state_left: status & 1 ? "ON" : "OFF",
                        state_right: status & 2 ? "ON" : "OFF",
                        state_bottom_left: status & 4 ? "ON" : "OFF",
                        state_bottom_right: status & 8 ? "ON" : "OFF",
                    };
                }
            }
        },
    } satisfies Fz.Converter<"genPowerCfg", undefined, ["raw"]>,
    livolo_curtain_switch_state: {
        cluster: "genPowerCfg",
        type: ["raw"],
        convert: (model, msg, publish, options, meta) => {
            const stateHeader = Buffer.from([122, 209]);
            if (msg.data.indexOf(stateHeader) === 0) {
                if (msg.data[10] === 5 || msg.data[10] === 2) {
                    const status = msg.data[14];
                    return {
                        state_left: status === 1 ? "ON" : "OFF",
                        state_right: status === 0 ? "ON" : "OFF",
                    };
                }
            }
        },
    } satisfies Fz.Converter<"genPowerCfg", undefined, ["raw"]>,
    livolo_dimmer_state: {
        cluster: "genPowerCfg",
        type: ["raw"],
        convert: (model, msg, publish, options, meta) => {
            const stateHeader = Buffer.from([122, 209]);
            if (msg.data.indexOf(stateHeader) === 0) {
                if (msg.data[10] === 7) {
                    const status = msg.data[14];
                    return {state: status & 1 ? "ON" : "OFF"};
                }
                if (msg.data[10] === 13) {
                    const status = msg.data[13];
                    return {state: status & 1 ? "ON" : "OFF"};
                }
                if (msg.data[10] === 5) {
                    // TODO: Unknown dp, assumed value type
                    const value = msg.data[14] * 10;
                    return {
                        brightness: utils.mapNumberRange(value, 0, 1000, 0, 255),
                        brightness_percent: utils.mapNumberRange(value, 0, 1000, 0, 100),
                        level: value,
                    };
                }
            }
        },
    } satisfies Fz.Converter<"genPowerCfg", undefined, ["raw"]>,
    livolo_cover_state: {
        cluster: "genPowerCfg",
        type: ["raw"],
        convert: (model, msg, publish, options, meta) => {
            const dp = msg.data[10];
            const defaults = {motor_direction: "FORWARD", motor_speed: 40};
            if (msg.data[0] === 0x7a && msg.data[1] === 0xd1) {
                const reportType = msg.data[12];
                switch (dp) {
                    case 0x0c:
                    case 0x0f:
                        if (reportType === 0x04) {
                            // Position report
                            const position = 100 - msg.data[13];
                            const state = position > 0 ? "OPEN" : "CLOSE";
                            const moving = dp === 0x0f;
                            return {...defaults, ...meta.state, position, state, moving};
                        }
                        if (reportType === 0x12) {
                            // Speed report
                            const motorSpeed = msg.data[13];
                            return {...defaults, ...meta.state, motor_speed: motorSpeed};
                        }
                        if (reportType === 0x13) {
                            // Direction report
                            const direction = msg.data[13];
                            if (direction < 0x80) {
                                return {...defaults, ...meta.state, motor_direction: "FORWARD"};
                            }
                            return {...defaults, ...meta.state, motor_direction: "REVERSE"};
                        }
                        break;
                    case 0x02:
                    case 0x03:
                        // Ignore special commands used only when pairing, as these will rather be handled by `onEvent`
                        return null;
                    case 0x08:
                        // Ignore general command acknowledgements, as they provide no useful information.
                        return null;
                    default:
                        // Unknown dps
                        logger.debug(`Unhandled DP ${dp} for ${meta.device.manufacturerName}: ${msg.data.toString("hex")}`, NS);
                }
            }
        },
    } satisfies Fz.Converter<"genPowerCfg", undefined, ["raw"]>,
    livolo_hygrometer_state: {
        cluster: "genPowerCfg",
        type: ["raw"],
        convert: (model, msg, publish, options, meta) => {
            const dp = msg.data[10];
            switch (dp) {
                case 14:
                    return {
                        temperature: Number(msg.data[13]),
                    };
                case 12:
                    return {
                        humidity: Number(msg.data[13]),
                    };
            }
        },
    } satisfies Fz.Converter<"genPowerCfg", undefined, ["raw"]>,
    livolo_illuminance_state: {
        cluster: "genPowerCfg",
        type: ["raw"],
        convert: (model, msg, publish, options, meta) => {
            const dp = msg.data[12];
            const noiseLookup: KeyValueAny = {1: "silent", 2: "normal", 3: "lively", 4: "noisy"};
            switch (dp) {
                case 13:
                    return {
                        illuminance: Number(msg.data[13]),
                    };
                case 14:
                    return {
                        noise_detected: msg.data[13] > 2,
                        noise_level: noiseLookup[msg.data[13]],
                    };
            }
        },
    } satisfies Fz.Converter<"genPowerCfg", undefined, ["raw"]>,
    livolo_pir_state: {
        cluster: "genPowerCfg",
        type: ["raw"],
        convert: (model, msg, publish, options, meta) => {
            const stateHeader = Buffer.from([122, 209]);
            if (msg.data.indexOf(stateHeader) === 0) {
                if (msg.data[10] === 7) {
                    const status = msg.data[14];
                    return {
                        occupancy: !!(status & 1),
                    };
                }
            }
        },
    } satisfies Fz.Converter<"genPowerCfg", undefined, ["raw"]>,
    livolo_switch_state_raw: {
        cluster: "genPowerCfg",
        type: ["raw"],
        convert: (model, msg, publish, options, meta) => {
            /*
            header                ieee address            info data
            new socket
            [124,210,21,216,128,  199,147,3,24,0,75,18,0,  19,7,0]       after interview
            [122,209,             199,147,3,24,0,75,18,0,  7,1,6,1,0,11] off
            [122,209,             199,147,3,24,0,75,18,0,  7,1,6,1,1,11] on

            new switch
            [124,210,21,216,128,  228,41,3,24,0,75,18,0,  19,1,0]       after interview
            [122,209,             228,41,3,24,0,75,18,0,  7,1,0,1,0,11] off
            [122,209,             228,41,3,24,0,75,18,0,  7,1,0,1,1,11] on

            old switch
            [124,210,21,216,128,  170, 10,2,24,0,75,18,0,  17,0,1] after interview
            [124,210,21,216,0,     18, 15,5,24,0,75,18,0,  34,0,0] left: 0, right: 0
            [124,210,21,216,0,     18, 15,5,24,0,75,18,0,  34,0,1] left: 1, right: 0
            [124,210,21,216,0,     18, 15,5,24,0,75,18,0,  34,0,2] left: 0, right: 1
            [124,210,21,216,0,     18, 15,5,24,0,75,18,0,  34,0,3] left: 1, right: 1

            curtain switch
            [124,210,21,216,128,  110,74,116,33,0,75,18,0,  19,5,0]        after interview
            [122,209,             110,74,116,33,0,75,18,0,  5,1,5,0,2,11]  left: 0, right: 0  (off)
            [122,209,             110,74,116,33,0,75,18,0,  5,1,5,0,1,11]  left: 1, right: 0  (left on)
            [122,209,             110,74,116,33,0,75,18,0,  5,1,5,0,0,11]  left: 0, right: 1  (right on)

            pir sensor
            [124,210,21,216,128,  225,52,225,34,0,75,18,0,  19,13,0]       after interview
            [122,209,             245,94,225,34,0,75,18,0,  7,1,7,1,1,11]  occupancy: true
            [122,209,             245,94,225,34,0,75,18,0,  7,1,7,1,0,11]  occupancy: false

            hygrometer
            [122,209,             191,22,3,24,0,75,18,0, 14,1,8,21,14,11]  temperature: 21 degrees Celsius
            [122,209,             191,22,3,24,0,75,18,0, 12,1,9,73,12,11]  humidity: 73%

            illuminance
            [124,210,21,216,128,  221,0,115,33,0,75,18,0,  19,12,0]          after interview
            [122,209,             221,0,115,33,0,75,18,0,  12,1,14,4,12,11]  noise: 4 (noisy)
            [122,209,             221,0,115,33,0,75,18,0,  12,1,14,3,12,11]  noise: 3 (lively)
            [122,209,             221,0,115,33,0,75,18,0,  12,1,14,2,12,11]  noise: 2 (normal)
            [122,209,             221,0,115,33,0,75,18,0,  12,1,14,1,12,11]  noise: 1 (silent)
            [122,209,             221,0,115,33,0,75,18,0,  12,1,13,20,12,11] lux: 20
            [122,209,             221,0,115,33,0,75,18,0,  2,0,12,199,1,11]  ??
            */
            const malformedHeader = Buffer.from([0x7c, 0xd2, 0x15, 0xd8, 0x00]);
            const infoHeader = Buffer.from([0x7c, 0xd2, 0x15, 0xd8, 0x80]);
            // status of old devices
            if (msg.data.indexOf(malformedHeader) === 0) {
                const status = msg.data[15];
                return {
                    state_left: status & 1 ? "ON" : "OFF",
                    state_right: status & 2 ? "ON" : "OFF",
                };
            }
            // info about device
            if (msg.data.indexOf(infoHeader) === 0) {
                if (msg.data.includes(Buffer.from([19, 7, 0]), 13)) {
                    // new socket, hack
                    meta.device.modelID = "TI0001-socket";
                    meta.device.save();
                }
                // No need to detect this switches, will be done by universal procedure
                /* if (msg.data.includes(Buffer.from([19, 1, 0]), 13)) {
                    // new switch, hack
                    meta.device.modelID = 'TI0001-switch';
                    meta.device.save();
                }
                if (msg.data.includes(Buffer.from([19, 2, 0]), 13)) {
                    // new switch, hack
                    meta.device.modelID = 'TI0001-switch-2gang';
                    meta.device.save();
                }*/
                if (msg.data.includes(Buffer.from([19, 5, 0]), 13)) {
                    logger.debug("Detected Livolo Curtain Switch", NS);
                    // curtain switch, hack
                    meta.device.modelID = "TI0001-curtain-switch";
                    meta.device.save();
                }
                if (msg.data.includes(Buffer.from([19, 20, 0]), 13)) {
                    // new dimmer, hack
                    meta.device.modelID = "TI0001-dimmer";
                    meta.device.save();
                }
                if (msg.data.includes(Buffer.from([19, 21, 0]), 13)) {
                    meta.device.modelID = "TI0001-cover";
                    meta.device.save();
                }
                if (msg.data.includes(Buffer.from([19, 13, 0]), 13)) {
                    logger.debug("Detected Livolo Pir Sensor", NS);
                    meta.device.modelID = "TI0001-pir";
                    meta.device.save();
                }
                if (msg.data.includes(Buffer.from([19, 15, 0]), 13)) {
                    logger.debug("Detected Livolo Digital Hygrometer", NS);
                    meta.device.modelID = "TI0001-hygrometer";
                    meta.device.save();
                }
                if (msg.data.includes(Buffer.from([19, 12, 0]), 13)) {
                    logger.debug("Detected Livolo Digital Illuminance and Sound Sensor", NS);
                    meta.device.modelID = "TI0001-illuminance";
                    meta.device.save();
                }
            }
        },
    } satisfies Fz.Converter<"genPowerCfg", undefined, ["raw"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["TI0001          "],
        model: "TI0001",
        description: "Zigbee switch (1, 2, 3, 4 gang)",
        vendor: "Livolo",
        exposes: [
            e.switch().withEndpoint("left"),
            e.switch().withEndpoint("right"),
            e.switch().withEndpoint("bottom_left"),
            e.switch().withEndpoint("bottom_right"),
        ],
        fromZigbee: [
            fzLocal.livolo_switch_state,
            fzLocal.livolo_switch_state_raw,
            fzLocal.livolo_new_switch_state_4gang,
            fzLocal.prevent_disconnect({dp: 1, payload: {8194: {value: 0n, type: 0x0e}}}),
        ],
        toZigbee: [tzLocal.livolo_socket_switch_on_off],
        endpoint: (device) => {
            return {left: 6, right: 6, bottom_left: 6, bottom_right: 6};
        },
        extend: [mLocal.poll()],
    },
    {
        zigbeeModel: ["TI0001-switch"],
        model: "TI0001-switch",
        description: "Zigbee switch 1 gang",
        vendor: "Livolo",
        fromZigbee: [fzLocal.livolo_new_switch_state, fz.power_on_behavior],
        toZigbee: [tzLocal.livolo_socket_switch_on_off, tz.power_on_behavior],
        exposes: [e.switch()],
        endpoint: (device) => {
            return {left: 6, right: 6};
        },
        extend: [mLocal.poll()],
    },
    {
        zigbeeModel: ["TI0001-switch-2gang"],
        model: "TI0001-switch-2gang",
        description: "Zigbee Switch 2 gang",
        vendor: "Livolo",
        fromZigbee: [fzLocal.livolo_new_switch_state_2gang],
        toZigbee: [tzLocal.livolo_socket_switch_on_off],
        exposes: [e.switch().withEndpoint("left"), e.switch().withEndpoint("right")],
        endpoint: (device) => {
            return {left: 6, right: 6};
        },
        extend: [mLocal.poll()],
    },
    {
        zigbeeModel: ["TI0001-curtain-switch"],
        model: "TI0001-curtain-switch",
        description: "Zigbee curtain switch (can only read status, control does not work yet)",
        vendor: "Livolo",
        fromZigbee: [fzLocal.livolo_curtain_switch_state],
        toZigbee: [tzLocal.livolo_socket_switch_on_off],
        // toZigbee: [tzLocal.livolo_curtain_switch_on_off],
        exposes: [e.switch().withEndpoint("left"), e.switch().withEndpoint("right")],
        endpoint: (device) => {
            return {left: 6, right: 6};
        },
        extend: [mLocal.poll()],
    },
    {
        zigbeeModel: ["TI0001-socket"],
        model: "TI0001-socket",
        description: "Zigbee socket",
        vendor: "Livolo",
        exposes: [e.switch()],
        fromZigbee: [fzLocal.livolo_socket_state, fz.power_on_behavior],
        toZigbee: [tzLocal.livolo_socket_switch_on_off, tz.power_on_behavior],
        extend: [mLocal.poll()],
    },
    {
        zigbeeModel: ["TI0001-dimmer"],
        model: "TI0001-dimmer",
        description: "Zigbee dimmer",
        vendor: "Livolo",
        fromZigbee: [fzLocal.livolo_dimmer_state],
        toZigbee: [tzLocal.livolo_socket_switch_on_off, tzLocal.livolo_dimmer_level],
        exposes: [e.light_brightness()],
        endpoint: (device) => {
            return {left: 6, right: 6};
        },
        extend: [mLocal.poll()],
    },
    {
        zigbeeModel: ["TI0001-cover"],
        model: "TI0001-cover",
        description: "Zigbee roller blind motor",
        vendor: "Livolo",
        fromZigbee: [
            fzLocal.livolo_cover_state,
            fz.command_off,
            fzLocal.prevent_disconnect({
                dp: 0x02,
                payload(data) {
                    return {2050: {value: [data[3], 0, 0, 0, 0, 0, 0], type: data[2]}};
                },
            }),
        ],
        toZigbee: [tzLocal.livolo_cover_state, tzLocal.livolo_cover_position, tzLocal.livolo_cover_options],
        exposes: [
            e.cover_position().setAccess("position", ea.STATE_SET),
            e
                .composite("options", "options", ea.STATE_SET)
                .withDescription("Motor options")
                .withFeature(e.numeric("motor_speed", ea.STATE_SET).withValueMin(20).withValueMax(40).withDescription("Motor speed").withUnit("rpm"))
                .withFeature(e.enum("motor_direction", ea.STATE_SET, ["FORWARD", "REVERSE"]).withDescription("Motor direction")),
            e.binary("moving", ea.STATE, true, false).withDescription("Motor is moving"),
        ],
        extend: [mLocal.poll()],
    },
    {
        zigbeeModel: ["TI0001-pir"],
        model: "TI0001-pir",
        description: "Zigbee motion Sensor",
        vendor: "Livolo",
        exposes: [e.occupancy()],
        fromZigbee: [
            fzLocal.livolo_pir_state,
            fzLocal.prevent_disconnect({
                dp: 0x01,
                payload: {8194: {value: 0n, type: 0x0e}},
            }),
        ],
        extend: [mLocal.poll()],
    },
    {
        zigbeeModel: ["TI0001-hygrometer"],
        model: "TI0001-hygrometer",
        description: "Zigbee Digital Humidity and Temperature Sensor",
        vendor: "Livolo",
        exposes: [e.humidity(), e.temperature()],
        fromZigbee: [
            fzLocal.livolo_hygrometer_state,
            fzLocal.prevent_disconnect({
                dp: 0x02,
                payload(data) {
                    return {8194: {value: [data[3], 0, 0, 0, 0, 0, 0], type: data[2]}};
                },
            }),
        ],
        extend: [mLocal.poll()],
    },
    {
        zigbeeModel: ["TI0001-illuminance"],
        model: "TI0001-illuminance",
        description: "Zigbee digital illuminance and sound sensor",
        vendor: "Livolo",
        exposes: [
            e.noise_detected(),
            e.illuminance(),
            e.enum("noise_level", ea.STATE, ["silent", "normal", "lively", "noisy"]).withDescription("Detected noise level"),
        ],
        fromZigbee: [
            fzLocal.livolo_illuminance_state,
            fzLocal.prevent_disconnect({
                dp: 0x02,
                payload(data) {
                    return {8194: {value: [data.data[3], 0, 0, 0, 0, 0, 0], type: data.data[2]}};
                },
            }),
        ],
        extend: [mLocal.poll()],
    },
];
