import type {SonoffEwelink} from "../devices/sonoff";
import {access, options, presets} from "./exposes";
import {battery, setupConfigureForBinding} from "./modernExtend";
import type {Configure, Expose, Fz, KeyValueAny, ModernExtend, Tz, Zh} from "./types";
import * as utils from "./utils";

const e = presets;
const ea = access;

// ====================== Type Or Interface ==============================

// ======================= Utils =========================================
const findKeyByValue = (object: object, value: number | string) => {
    const entry = Object.entries(object).find(([key, val]) => val === value);
    return entry ? entry[0] : undefined;
};
// ======================= Custom TZ =====================================
export const ewelinkToZigbee = {
    motor_direction: {
        key: ["motor_direction"],
        convertSet: async (entity, key, value, meta) => {
            // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
            let windowCoveringMode;
            if (value === "forward") {
                windowCoveringMode = 0x00;
            } else if (value === "reverse") {
                windowCoveringMode = 0x01;
            }
            await entity.write("closuresWindowCovering", {windowCoveringMode}, utils.getOptions(meta.mapped, entity));
            return {state: {motor_direction: value}};
        },
    } satisfies Tz.Converter,
};

// ======================= Custom FZ =====================================
export const ewelinkFromZigbee = {
    motor_direction: {
        cluster: "closuresWindowCovering",
        type: ["attributeReport", "readResponse"],
        options: [options.invert_cover()],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValueAny = {};
            if (typeof msg.data === "object" && Object.hasOwn(msg.data, "windowCoveringMode")) {
                result.motor_direction = (msg.data.windowCoveringMode & (1 << 0)) > 0 === true ? "reverse" : "forward";
            }
            return result;
        },
    } satisfies Fz.Converter<"closuresWindowCovering", undefined, ["attributeReport", "readResponse"]>,
};

// ======================= Custom Extend =================================
function privateMotorClbByPosition(clusterName: "customClusterEwelink", writeCommand: "protocolData"): ModernExtend {
    const protocol = {
        dooya: {
            supportModel: ["CK-MG22-Z310EE07DOOYA-01(7015)", "MYDY25Z-1", "CK-MG22-JLDJ-01(7015)"],
            mapping: {
                open: 0x01,
                close: 0x02,
                other: 0x03,
                clear: 0x10,
            },
            updateMotorClbCommand: {
                privateCmd: 0x01,
                subCmd: 0x09,
            },
            updatedMotorClbCommand: {
                privateCmd: 0x01,
                subCmd: 0x09,
            },
            deleteMotorClbCommand: {
                privateCmd: 0x01,
                subCmd: 0x0b,
            },
            deletedMotorClbCommand: {
                privateCmd: 0x01,
                subCmd: 0x0b,
            },
        },
        raex: {
            supportModel: ["MYRX25Z-1"],
            mapping: {
                open: 0x01,
                close: 0x02,
                clear: 0x01,
            },
            updateMotorClbCommand: {
                privateCmd: 0x22,
                dataLength: 0x02,
                subCmd: 0x71,
            },
            deleteMotorClbCommand: {
                privateCmd: 0x22,
                dataLength: 0x02,
                subCmd: 0x76,
            },
        },
        ak: {
            supportModel: ["AM25B-1-25-ES-E-Z", "ZM25-EAZ", "AM25C-1-25-ES-E-Z"],
            mapping: {
                open: 0x00,
                close: 0x01,
                clear: 0x02,
            },
            // AK Protocol setting the limit and clearing the limit use the same command.
            updateMotorClbCommand: {
                cmdType: 0x00,
                privateCmd: 0x68,
                dataType: 0x04,
                dataLength: [0x00, 0x01],
            },
            updatedMotorClbCommand: {
                cmdType: 0x01,
                privateCmd: 0x68,
                dataType: 0x04,
            },
        },
    };
    const exposes = [];
    exposes.push(e.enum("motor_clb_position", ea.SET, ["open", "close", "other", "clear"]).withDescription("Motor Calibration By Position"));

    exposes.push(e.text("motor_clb_position_result", ea.STATE).withDescription("Motor Calibration Result"));

    const fromZigbee = [
        {
            cluster: clusterName,
            type: ["raw"],
            convert: (model, msg, publish, options, meta) => {
                if (msg.type === "raw" && msg.data instanceof Buffer) {
                    // Raex Protocol，updated Report only through 'motor_info'.
                    if (protocol.dooya.supportModel.includes(model.model)) {
                        const bufferObj = msg.data.subarray(3, msg.data.length).toJSON(); // The first five bytes belong to the ZCL frame header, which are not of interest here; only the payload is extracted.
                        const payload = bufferObj.data;
                        const {privateCmd: updatedPrivateCmd, subCmd: updatedPrivateSubCmd} = protocol.dooya.updatedMotorClbCommand;
                        const {privateCmd: deletedPrivateCmd, subCmd: deletedPrivateSubCmd} = protocol.dooya.deletedMotorClbCommand;

                        if (payload[0] === updatedPrivateCmd && payload[1] === updatedPrivateSubCmd) {
                            const entities = Object.entries(protocol.dooya.mapping);
                            const motor_clb_position_result: {[key: string]: string} = {};
                            for (const entity of entities) {
                                if (entity[1] === payload[2]) {
                                    motor_clb_position_result[entity[0] as string] = "calibrated";
                                    break;
                                }
                            }

                            return {
                                motor_clb_position_result,
                            };
                        }
                        if (payload[0] === deletedPrivateCmd && payload[1] === deletedPrivateSubCmd) {
                            if (payload[2] === protocol.dooya.mapping.clear) {
                                const motor_clb_position_result = {
                                    open: "uncalibrated",
                                    close: "uncalibrated",
                                    other: "uncalibrated",
                                };
                                return {
                                    motor_clb_position_result,
                                };
                            }
                        }
                    } else if (protocol.ak.supportModel.includes(model.model)) {
                        const bufferObj = msg.data.subarray(3, msg.data.length).toJSON(); // The first five bytes belong to the ZCL frame header, which are not of interest here; only the payload is extracted.
                        const payload = bufferObj.data;
                        const {cmdType, privateCmd, dataType} = protocol.ak.updatedMotorClbCommand;
                        if (payload[0] === cmdType && payload[2] === privateCmd && payload[3] === dataType) {
                            if (payload[6] === protocol.ak.mapping.clear) {
                                const motor_clb_position_result = {
                                    open: "uncalibrated",
                                    close: "uncalibrated",
                                    other: "uncalibrated",
                                };
                                return {
                                    motor_clb_position_result,
                                };
                            }
                            const entities = Object.entries(protocol.ak.mapping);
                            const motor_clb_position_result: {[key: string]: string} = {};
                            for (const entity of entities) {
                                if (entity[1] === payload[6]) {
                                    motor_clb_position_result[entity[0] as string] = "calibrated";
                                    break;
                                }
                            }
                            return {
                                motor_clb_position_result,
                            };
                        }
                    }
                }
            },
        } satisfies Fz.Converter<typeof clusterName, undefined, ["raw"]>,
    ];

    const toZigbee: Tz.Converter[] = [
        {
            key: ["motor_clb_position"],
            convertSet: async (entity, key, value, meta) => {
                utils.assertEndpoint(entity);
                const device: Zh.Device = entity.getDevice();
                const modelID = device.modelID;

                if (protocol.dooya.supportModel.includes(modelID)) {
                    const {deleteMotorClbCommand, updateMotorClbCommand, mapping} = protocol.dooya;
                    // Dooya Protocol
                    const payloadValue = [];
                    if (value === "clear") {
                        // Clear limit position
                        payloadValue[0] = deleteMotorClbCommand.privateCmd;
                        payloadValue[1] = deleteMotorClbCommand.subCmd;
                        payloadValue[2] = mapping[value as keyof typeof mapping];
                    } else if (["open", "close", "other"].includes(value as string)) {
                        // Set limit position
                        payloadValue[0] = updateMotorClbCommand.privateCmd;
                        payloadValue[1] = updateMotorClbCommand.subCmd;
                        payloadValue[2] = mapping[value as keyof typeof mapping];
                    }

                    await entity.command<typeof clusterName, typeof writeCommand, SonoffEwelink>(clusterName, writeCommand, {data: payloadValue});
                } else if (protocol.raex.supportModel.includes(modelID)) {
                    const {deleteMotorClbCommand, updateMotorClbCommand, mapping} = protocol.raex;
                    // Raex Protocol
                    const payloadValue = [];
                    if (value === "clear") {
                        // Clear limit position
                        payloadValue[0] = deleteMotorClbCommand.privateCmd;
                        payloadValue[1] = deleteMotorClbCommand.dataLength;
                        payloadValue[2] = deleteMotorClbCommand.subCmd;
                        payloadValue[3] = mapping[value as keyof typeof mapping];
                    } else if (["open", "close", "other"].includes(value as string)) {
                        // Set limit position
                        payloadValue[0] = updateMotorClbCommand.privateCmd;
                        payloadValue[1] = updateMotorClbCommand.dataLength;
                        payloadValue[2] = updateMotorClbCommand.subCmd;
                        payloadValue[3] = mapping[value as keyof typeof mapping];
                    }

                    await entity.command<typeof clusterName, typeof writeCommand, SonoffEwelink>(clusterName, writeCommand, {data: payloadValue});
                } else if (protocol.ak.supportModel.includes(modelID)) {
                    // AK Protocol
                    const {updateMotorClbCommand, mapping} = protocol.ak;
                    const payloadValue = [];
                    payloadValue[0] = updateMotorClbCommand.cmdType;
                    payloadValue[1] = 0x00;
                    payloadValue[2] = updateMotorClbCommand.privateCmd;
                    payloadValue[3] = updateMotorClbCommand.dataType;
                    payloadValue.push(...updateMotorClbCommand.dataLength);
                    payloadValue[6] = mapping[value as keyof typeof mapping];
                    await entity.command<typeof clusterName, typeof writeCommand, SonoffEwelink>(clusterName, writeCommand, {data: payloadValue});
                }
                return {state: {[key]: value}};
            },
        },
    ];

    return {exposes, toZigbee, fromZigbee, isModernExtend: true};
}

function privateMotorMode(clusterName: "customClusterEwelink", writeCommand: "protocolData"): ModernExtend {
    const mode = ["inching", "continuou"];
    const protocol = {
        dooya: {
            supportModel: ["CK-MG22-Z310EE07DOOYA-01(7015)", "MYDY25Z-1", "CK-MG22-JLDJ-01(7015)"],
            mapping: {
                continuou: 0x20,
                inching: 0x30,
            },
            updateMotorModeCommand: {
                privateCmd: 0x01,
                subCmd: 0x10,
            },
            updatedMotorModeCommand: {
                privateCmd: 0x01,
                subCmd: 0x10,
            },
        },
        raex: {
            supportModel: ["MYRX25Z-1"],
            mapping: {
                continuou: 0x01,
                inching: 0x02,
            },
            updateMotorModeCommand: {
                privateCmd: 0x11,
                dataLength: 0x02,
                subCmd: 0x54,
            },
        },
        ak: {
            supportModel: ["AM25B-1-25-ES-E-Z", "ZM25-EAZ", "AM25C-1-25-ES-E-Z"],
            mapping: {
                continuou: 0x00,
                inching: 0x01,
            },
            updateMotorModeCommand: {
                cmdType: 0x00,
                privateCmd: 0x67,
                dataType: 0x04,
                dataLength: [0x00, 0x01],
            },
            updatedMotorModeCommand: {
                cmdType: 0x01,
                privateCmd: 0x67,
                dataType: 0x04,
            },
        },
    };
    const expose = e.enum("motor_mode", ea.STATE_SET, mode).withDescription("Motor Mode");
    const fromZigbee = [
        {
            cluster: clusterName,
            type: ["raw"],
            convert: (model, msg, publish, options, meta) => {
                if (msg.type === "raw" && msg.data instanceof Buffer) {
                    if (protocol.dooya.supportModel.includes(model.model)) {
                        const bufferObj = msg.data.subarray(3, msg.data.length).toJSON();
                        const payload = bufferObj.data;
                        const {privateCmd, subCmd} = protocol.dooya.updatedMotorModeCommand;

                        if (payload[0] === privateCmd && payload[1] === subCmd) {
                            const entities = Object.entries(protocol.dooya.mapping);
                            // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
                            let motorMode;
                            for (const entity of entities) {
                                if (entity[1] === payload[2]) {
                                    motorMode = entity[0];
                                    break;
                                }
                            }
                            return {
                                motor_mode: motorMode,
                            };
                        }
                    } else if (protocol.ak.supportModel.includes(model.model)) {
                        const bufferObj = msg.data.subarray(3, msg.data.length).toJSON();
                        const payload = bufferObj.data;
                        const {cmdType, privateCmd, dataType} = protocol.ak.updatedMotorModeCommand;
                        if (payload[0] === cmdType && payload[2] === privateCmd && payload[3] === dataType) {
                            const entities = Object.entries(protocol.ak.mapping);
                            // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
                            let motorMode;
                            for (const entity of entities) {
                                if (entity[1] === payload[6]) {
                                    motorMode = entity[0];
                                    break;
                                }
                            }
                            return {
                                motor_mode: motorMode,
                            };
                        }
                    }
                }
            },
        } satisfies Fz.Converter<typeof clusterName, undefined, ["raw"]>,
    ];

    const toZigbee: Tz.Converter[] = [
        {
            key: ["motor_mode"],
            convertSet: async (entity, key, value, meta) => {
                utils.assertEndpoint(entity);
                const device: Zh.Device = entity.getDevice();
                const modelID = device.modelID;

                if (protocol.dooya.supportModel.includes(modelID)) {
                    // Dooya Protocol
                    const payloadValue = [];
                    const {updateMotorModeCommand, mapping} = protocol.dooya;
                    payloadValue[0] = updateMotorModeCommand.privateCmd;
                    payloadValue[1] = updateMotorModeCommand.subCmd;
                    payloadValue[2] = mapping[value as keyof typeof mapping];
                    await entity.command<typeof clusterName, typeof writeCommand, SonoffEwelink>(clusterName, writeCommand, {data: payloadValue});
                } else if (protocol.raex.supportModel.includes(modelID)) {
                    // Raex Protocol
                    const payloadValue = [];
                    const {updateMotorModeCommand, mapping} = protocol.raex;
                    payloadValue[0] = updateMotorModeCommand.privateCmd;
                    payloadValue[1] = updateMotorModeCommand.dataLength;
                    payloadValue[2] = updateMotorModeCommand.subCmd;
                    payloadValue[3] = mapping[value as keyof typeof mapping];
                    await entity.command<typeof clusterName, typeof writeCommand, SonoffEwelink>(clusterName, writeCommand, {data: payloadValue});
                } else if (protocol.ak.supportModel.includes(modelID)) {
                    // AK Protocol
                    const payloadValue = [];
                    const {updateMotorModeCommand, mapping} = protocol.ak;
                    payloadValue[0] = updateMotorModeCommand.cmdType;
                    payloadValue[1] = 0x00;
                    payloadValue[2] = updateMotorModeCommand.privateCmd;
                    payloadValue[3] = updateMotorModeCommand.dataType;
                    payloadValue.push(...updateMotorModeCommand.dataLength);
                    payloadValue[6] = mapping[value as keyof typeof mapping];
                    await entity.command<typeof clusterName, typeof writeCommand, SonoffEwelink>(clusterName, writeCommand, {data: payloadValue});
                }

                return {state: {[key]: value}};
            },
        },
    ];

    return {exposes: [expose], toZigbee, fromZigbee, isModernExtend: true};
}

function privateReportMotorInfo(clusterName: string): ModernExtend {
    const protocol = {
        dooya: {
            supportModel: ["CK-MG22-Z310EE07DOOYA-01(7015)", "MYDY25Z-1", "CK-MG22-JLDJ-01(7015)", "Grandekor Smart Curtain Grandekor"],
            mapping: {
                status: {
                    open: 0x01,
                    close: 0x02,
                    stop: 0x03,
                },
                itinerary: {
                    none: 0x00,
                    all: 0x01,
                    hasOpen: 0x02,
                    hasClose: 0x03,
                    hasThird: 0x04,
                },
                speed: {
                    none: 0x00,
                    T1: 0x01,
                    T2: 0x02,
                    T3: 0x03,
                    T4: 0x04,
                    T5: 0x05,
                    T6: 0x06,
                    T7: 0x07,
                    T8: 0x08,
                    T9: 0x09,
                    T10: 0x0a,
                    T11: 0x0b,
                    T12: 0x0c,
                    T13: 0x0d,
                    T14: 0x0e,
                },
                motorDirection: {
                    forward: 0x01,
                    reverse: 0x02,
                },
                motorMode: {
                    continuou: 0x01,
                    inching: 0x02,
                },
            },
            updatedMotorInfoCommand: {
                privateCmd: 0x03,
                subCmd: 0x01,
            },
        },
        raex: {
            supportModel: ["MYRX25Z-1"],
            mapping: {
                status: {
                    open: "01",
                    close: "10",
                    stop: "00",
                },
                itinerary: {
                    none: 0x00,
                    hasOpen: 0x01,
                    hasClose: 0x02,
                    all: 0x03,
                },
                speed: {
                    none: 0x00,
                    T1: 0x01,
                    T2: 0x02,
                    T3: 0x03,
                },
                motorDirection: {
                    forward: "0",
                    reverse: "1",
                },
                motorMode: {
                    continuou: "0",
                    inching: "1",
                },
            },
            updatedMotorInfoCommand: {
                privateCmd: 0xa1,
                subCmd: 0x0c,
            },
        },
    };

    const expose = e.text("motor_info", ea.STATE).withDescription("Motor Updated Info");
    const fromZigbee = [
        {
            cluster: clusterName,
            type: ["raw"],
            convert: (model, msg, publish, options, meta) => {
                if (msg.type === "raw" && msg.data instanceof Buffer) {
                    if (protocol.dooya.supportModel.includes(model.model)) {
                        // Dooya Protocol
                        const bufferObj = msg.data.subarray(3, msg.data.length).toJSON();
                        const payload = bufferObj.data;
                        const dooyaProtocol = protocol.dooya;
                        const {privateCmd, subCmd} = protocol.dooya.updatedMotorInfoCommand;

                        if (payload[0] === privateCmd && payload[1] === subCmd) {
                            const motor_status = findKeyByValue(dooyaProtocol.mapping.status, payload[2]);
                            const motor_percentage = payload[3];
                            const motor_angle = payload[4];
                            const motor_itinerary = findKeyByValue(dooyaProtocol.mapping.itinerary, payload[5]);
                            const motor_speed = payload[6];
                            const motor_direction = findKeyByValue(dooyaProtocol.mapping.motorDirection, payload[7]);
                            const motor_mode = findKeyByValue(dooyaProtocol.mapping.motorMode, payload[8]);
                            const battery = payload[9];
                            return {
                                [expose.property]: {
                                    motor_status,
                                    motor_percentage,
                                    motor_angle,
                                    motor_itinerary,
                                    motor_speed,
                                    motor_direction,
                                    motor_mode,
                                    battery,
                                },
                            };
                        }
                    } else if (protocol.raex.supportModel.includes(model.model)) {
                        // Raex Protocol
                        const bufferObj = msg.data.subarray(3, msg.data.length).toJSON();
                        const payload = bufferObj.data;
                        const raexProtocol = protocol.raex;
                        const {privateCmd, subCmd} = raexProtocol.updatedMotorInfoCommand;

                        if (payload[0] === privateCmd && payload[1] === subCmd) {
                            const motor_status_binary = payload[2].toString(2).padStart(8, "0").slice(6, 8);
                            const motor_status = findKeyByValue(raexProtocol.mapping.status, motor_status_binary);
                            const motor_percentage = payload[3]; // 255 indicates that the motor cannot find the percentage.
                            const motor_angle = payload[4]; // 255 indicates that the motor cannot find the angle
                            const battery = payload[5];
                            const motor_itinerary = findKeyByValue(raexProtocol.mapping.itinerary, payload[11]);
                            const motor_speed = payload[9];
                            const motor_direction_binary = payload[8].toString(2).padStart(8, "0").slice(6, 7);
                            const motor_direction = findKeyByValue(raexProtocol.mapping.motorDirection, motor_direction_binary);
                            const motor_mode_binary = payload[8].toString(2).padStart(8, "0").slice(5, 6);
                            const motor_mode = findKeyByValue(raexProtocol.mapping.motorMode, motor_mode_binary);
                            return {
                                [expose.property]: {
                                    motor_status,
                                    motor_percentage,
                                    motor_angle,
                                    motor_itinerary,
                                    motor_speed,
                                    motor_direction,
                                    motor_mode,
                                    battery,
                                },
                            };
                        }
                    }
                }
            },
        } satisfies Fz.Converter<typeof clusterName, undefined, ["raw"]>,
    ];
    return {exposes: [expose], fromZigbee, isModernExtend: true};
}

function privateMotorSpeed(clusterName: "customClusterEwelink", writeCommand: "protocolData", minSpeed: number, maxSpeed: number): ModernExtend {
    const protocol = {
        dooya: {
            supportModel: ["CK-MG22-Z310EE07DOOYA-01(7015)", "MYDY25Z-1", "CK-MG22-JLDJ-01(7015)", "Grandekor Smart Curtain Grandekor"],
            updateMotorSpeedCommand: {
                privateCmd: 0x01,
                subCmd: 0xd1,
            },
            updatedMotorSpeedCommand: {
                privateCmd: 0x01,
                subCmd: 0xd1,
            },
            updatedMaxMotorSpeedCommand: {
                privateCmd: 0x02,
                subCmd: 0x0e,
            },
        },
        raex: {
            supportModel: ["MYRX25Z-1"],
            updateMotorSpeedCommand: {
                privateCmd: 0x11,
                dataLength: 0x02,
                subCmd: 0x53,
            },
        },
    };

    const exposes = [];
    exposes.push(e.numeric("motor_speed", ea.STATE_SET).withDescription("Set the motor speed").withValueMin(minSpeed).withValueMax(maxSpeed));
    exposes.push(e.numeric("supported_max_motor_speed", ea.STATE).withDescription("Supported max motor speed"));

    const fromZigbee = [
        {
            cluster: clusterName,
            type: ["raw"],
            convert: (model, msg, publish, options, meta) => {
                if (msg.type === "raw" && msg.data instanceof Buffer) {
                    if (protocol.dooya.supportModel.includes(model.model)) {
                        const bufferObj = msg.data.subarray(3, msg.data.length).toJSON();
                        const payload = bufferObj.data;
                        const {updatedMotorSpeedCommand, updatedMaxMotorSpeedCommand} = protocol.dooya;

                        if (payload[0] === updatedMotorSpeedCommand.privateCmd && payload[1] === updatedMotorSpeedCommand.subCmd) {
                            return {
                                motor_speed: payload[2], // If the gear position is 255, it means the device does not support speed adjustment.
                            };
                        }
                        if (payload[0] === updatedMaxMotorSpeedCommand.privateCmd && payload[1] === updatedMaxMotorSpeedCommand.subCmd) {
                            const supportedMax = payload[2];
                            if (supportedMax === 0 || supportedMax === undefined) {
                                return {
                                    supported_max_motor_speed: 0,
                                };
                            }
                            return {supported_max_motor_speed: supportedMax};
                        }
                    }
                }
            },
        } satisfies Fz.Converter<typeof clusterName, undefined, ["raw"]>,
    ];

    const toZigbee: Tz.Converter[] = [
        {
            key: ["motor_speed"],
            convertSet: async (entity, key, value, meta) => {
                utils.assertEndpoint(entity);
                const device: Zh.Device = entity.getDevice();
                const modelID = device.modelID;

                if (protocol.dooya.supportModel.includes(modelID)) {
                    const payloadValue: number[] = [];
                    const {updateMotorSpeedCommand} = protocol.dooya;
                    payloadValue[0] = updateMotorSpeedCommand.privateCmd;
                    payloadValue[1] = updateMotorSpeedCommand.subCmd;
                    payloadValue[2] = value as number;
                    await entity.command<typeof clusterName, typeof writeCommand, SonoffEwelink>(clusterName, writeCommand, {data: payloadValue});
                } else if (protocol.raex.supportModel.includes(modelID)) {
                    const payloadValue: number[] = [];
                    const {updateMotorSpeedCommand} = protocol.raex;
                    payloadValue[0] = updateMotorSpeedCommand.privateCmd;
                    payloadValue[1] = updateMotorSpeedCommand.dataLength;
                    payloadValue[2] = updateMotorSpeedCommand.subCmd;
                    payloadValue[3] = value as number;
                    await entity.command<typeof clusterName, typeof writeCommand, SonoffEwelink>(clusterName, writeCommand, {data: payloadValue});
                }

                return {state: {[key]: value}};
            },
        },
    ];

    return {exposes, toZigbee, fromZigbee, isModernExtend: true};
}

export const ewelinkModernExtend = {
    ewelinkAction: (): ModernExtend => {
        const exposes: Expose[] = [presets.action(["single", "double", "long"])];

        const fromZigbee = [
            {
                cluster: "genOnOff",
                type: ["commandOn", "commandOff", "commandToggle"],
                convert: (model, msg, publish, options, meta) => {
                    const lookup: KeyValueAny = {commandToggle: "single", commandOn: "double", commandOff: "long"};
                    return {action: lookup[msg.type]};
                },
            } satisfies Fz.Converter<"genOnOff", undefined, ["commandOn", "commandOff", "commandToggle"]>,
        ];

        const configure: Configure[] = [setupConfigureForBinding("genOnOff", "output")];

        return {exposes, fromZigbee, configure, isModernExtend: true};
    },
    ewelinkBattery: (): ModernExtend => {
        // 3600/7200 prevents disconnect
        // https://github.com/Koenkk/zigbee2mqtt/issues/13600#issuecomment-1283827935
        return battery({
            voltage: true,
            voltageReporting: true,
            percentageReportingConfig: {min: 3600, max: 7200, change: 2},
            voltageReportingConfig: {min: 3600, max: 7200, change: 100},
        });
    },
    ewelinkMotorReverse: (): ModernExtend => {
        const exposes = [e.enum("motor_direction", ea.STATE_SET, ["forward", "reverse"]).withDescription("Set the motor direction")];
        const toZigbee: Tz.Converter[] = [ewelinkToZigbee.motor_direction];
        const fromZigbee = [ewelinkFromZigbee.motor_direction];

        return {
            exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    ewelinkMotorClbByPosition: (clusterName: "customClusterEwelink", writeCommand: "protocolData"): ModernExtend => {
        return privateMotorClbByPosition(clusterName, writeCommand);
    },
    ewelinkMotorMode: (clusterName: "customClusterEwelink", writeCommand: "protocolData"): ModernExtend => {
        return privateMotorMode(clusterName, writeCommand);
    },
    ewelinkReportMotorInfo: (clusterName: "customClusterEwelink"): ModernExtend => {
        return privateReportMotorInfo(clusterName);
    },
    ewelinkMotorSpeed: (clusterName: "customClusterEwelink", writeCommand: "protocolData", min: number, max: number): ModernExtend => {
        return privateMotorSpeed(clusterName, writeCommand, min, max);
    },
};

export {ewelinkModernExtend as modernExtend};
