import {Zcl} from "zigbee-herdsman";

import * as m from "../lib/modernExtend";
import type {ModernExtend} from "../lib/types";

export const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.HEIMAN_TECHNOLOGY_CO_LTD};

export interface HeimanSpecificAirQualityCluster {
    attributes: {
        language: number;
        unitOfMeasure: number;
        batteryState: number;
        pm10measuredValue: number;
        tvocMeasuredValue: number;
        aqiMeasuredValue: number;
        temperatureMeasuredMax: number;
        temperatureMeasuredMin: number;
        humidityMeasuredMax: number;
        humidityMeasuredMin: number;
        alarmEnable: number;
    };
    commands: {
        setLanguage: {languageCode: number};
        setUnitOfTemperature: {unitsCode: number};
        getTime: Record<string, never>;
    };
    commandResponses: never;
}

export interface HeimanSpecificAirQualityShortCluster {
    attributes: {
        batteryState: number;
        pm10measuredValue: number;
        aqiMeasuredValue: number;
    };
    commands: never;
    commandResponses: never;
}

export interface HeimanSpecificScenesCluster {
    attributes: never;
    commands: {
        cinema: Record<string, never>;
        atHome: Record<string, never>;
        sleep: Record<string, never>;
        goOut: Record<string, never>;
        repast: Record<string, never>;
    };
    commandResponses: never;
}

export interface HeimanSpecificInfraRedRemoteCluster {
    attributes: never;
    commands: {
        sendKey: {id: number; keyCode: number};
        studyKey: {id: number; keyCode: number};
        deleteKey: {id: number; keyCode: number};
        createId: {modelType: number};
        getIdAndKeyCodeList: Record<string, never>;
    };
    commandResponses: {
        studyKeyRsp: {id: number; keyCode: number; result: number};
        createIdRsp: {id: number};
        getIdAndKeyCodeListRsp: {packetsTotal: number; packetNumber: number; packetLength: number; learnedDevicesList: number[]};
    };
}

export function addCustomClusterHeimanSpecificAirQuality(): ModernExtend {
    return m.deviceAddCustomCluster("heimanSpecificAirQuality", {
        name: "heimanSpecificAirQuality",
        ...manufacturerOptions,
        // from HS2AQ-3.0海曼智能空气质量检测仪API文档-V01
        ID: 0xfc81,
        attributes: {
            language: {name: "language", ID: 0xf000, type: Zcl.DataType.UINT8, write: true, max: 0xff},
            unitOfMeasure: {name: "unitOfMeasure", ID: 0xf001, type: Zcl.DataType.UINT8, write: true, max: 0xff},
            // (0 is not charged, 1 is charging, 2 is fully charged)
            batteryState: {name: "batteryState", ID: 0xf002, type: Zcl.DataType.UINT8, write: true, max: 0xff},
            pm10measuredValue: {name: "pm10measuredValue", ID: 0xf003, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
            tvocMeasuredValue: {name: "tvocMeasuredValue", ID: 0xf004, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
            aqiMeasuredValue: {name: "aqiMeasuredValue", ID: 0xf005, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
            temperatureMeasuredMax: {name: "temperatureMeasuredMax", ID: 0xf006, type: Zcl.DataType.INT16, write: true, min: -32768},
            temperatureMeasuredMin: {name: "temperatureMeasuredMin", ID: 0xf007, type: Zcl.DataType.INT16, write: true, min: -32768},
            humidityMeasuredMax: {name: "humidityMeasuredMax", ID: 0xf008, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
            humidityMeasuredMin: {name: "humidityMeasuredMin", ID: 0xf009, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
            alarmEnable: {name: "alarmEnable", ID: 0xf00a, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
        },
        commands: {
            setLanguage: {
                name: "setLanguage",
                ID: 0x011b,
                parameters: [
                    // (1: English 0: Chinese)
                    {name: "languageCode", type: Zcl.DataType.UINT8, max: 0xff},
                ],
            },
            setUnitOfTemperature: {
                name: "setUnitOfTemperature",
                ID: 0x011c,
                parameters: [
                    // (0: ℉ 1: ℃)
                    {name: "unitsCode", type: Zcl.DataType.UINT8, max: 0xff},
                ],
            },
            getTime: {
                name: "getTime",
                ID: 0x011d,
                parameters: [],
            },
        },
        commandsResponse: {},
    });
}

export function addCustomClusterHeimanSpecificAirQualityShort(): ModernExtend {
    return m.deviceAddCustomCluster("heimanSpecificAirQuality", {
        name: "heimanSpecificAirQuality",
        ID: 0xfc81,
        attributes: {
            batteryState: {name: "batteryState", ID: 0xf002, type: Zcl.DataType.UINT8, write: true, max: 0xff},
            pm10measuredValue: {name: "pm10measuredValue", ID: 0xf003, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
            aqiMeasuredValue: {name: "aqiMeasuredValue", ID: 0xf005, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
        },
        commands: {},
        commandsResponse: {},
    });
}

export function addCustomClusterHeimanSpecificScenes(): ModernExtend {
    return m.deviceAddCustomCluster("heimanSpecificScenes", {
        name: "heimanSpecificScenes",
        ...manufacturerOptions,
        // from HS2SS-3.0海曼智能情景开关API文档-V01
        ID: 0xfc80,
        manufacturerCode: Zcl.ManufacturerCode.HEIMAN_TECHNOLOGY_CO_LTD,
        attributes: {},
        commands: {
            cinema: {
                name: "cinema",
                ID: 0xf0,
                parameters: [],
            },
            atHome: {
                name: "atHome",
                ID: 0xf1,
                parameters: [],
            },
            sleep: {
                name: "sleep",
                ID: 0xf2,
                parameters: [],
            },
            goOut: {
                name: "goOut",
                ID: 0xf3,
                parameters: [],
            },
            repast: {
                name: "repast",
                ID: 0xf4,
                parameters: [],
            },
        },
        commandsResponse: {},
    });
}

export function addCustomClusterHeimanSpecificInfraRedRemote(): ModernExtend {
    return m.deviceAddCustomCluster("heimanSpecificInfraRedRemote", {
        name: "heimanSpecificInfraRedRemote",
        ...manufacturerOptions,
        // from HS2IRC-3.0海曼智能红外转发控制器API-V01文档
        ID: 0xfc82,
        manufacturerCode: Zcl.ManufacturerCode.HEIMAN_TECHNOLOGY_CO_LTD,
        attributes: {},
        commands: {
            sendKey: {
                name: "sendKey",
                ID: 0xf0,
                parameters: [
                    {name: "id", type: Zcl.DataType.UINT8, max: 0xff},
                    {name: "keyCode", type: Zcl.DataType.UINT8, max: 0xff},
                ],
            },
            studyKey: {
                // Total we can have 30 keycode for each device ID (1..30).
                name: "studyKey",
                ID: 0xf1,
                // response: 0xf2,
                parameters: [
                    {name: "id", type: Zcl.DataType.UINT8, max: 0xff},
                    {name: "keyCode", type: Zcl.DataType.UINT8, max: 0xff},
                ],
            },
            deleteKey: {
                name: "deleteKey",
                ID: 0xf3,
                parameters: [
                    // 1-15 - Delete specific ID, >= 16 - Delete All
                    {name: "id", type: Zcl.DataType.UINT8, max: 0xff},
                    // 1-30 - Delete specific keycode, >= 31 - Delete All keycodes for the ID
                    {name: "keyCode", type: Zcl.DataType.UINT8, max: 0xff},
                ],
            },
            createId: {
                // Total we can have 15 device IDs (1..15).
                name: "createId",
                ID: 0xf4,
                // response: 0xf5,
                parameters: [{name: "modelType", type: Zcl.DataType.UINT8, max: 0xff}],
            },
            getIdAndKeyCodeList: {
                name: "getIdAndKeyCodeList",
                ID: 0xf6,
                // response: 0xf7,
                parameters: [],
            },
        },
        commandsResponse: {
            studyKeyRsp: {
                name: "studyKeyRsp",
                ID: 0xf2,
                parameters: [
                    {name: "id", type: Zcl.DataType.UINT8, max: 0xff},
                    {name: "keyCode", type: Zcl.DataType.UINT8, max: 0xff},
                    {name: "result", type: Zcl.DataType.UINT8, max: 0xff}, // 0 - success, 1 - fail
                ],
            },
            createIdRsp: {
                name: "createIdRsp",
                ID: 0xf5,
                parameters: [
                    {name: "id", type: Zcl.DataType.UINT8, max: 0xff}, // 0xFF - create failed
                    {name: "modelType", type: Zcl.DataType.UINT8, max: 0xff},
                ],
            },
            getIdAndKeyCodeListRsp: {
                name: "getIdAndKeyCodeListRsp",
                ID: 0xf7,
                parameters: [
                    {name: "packetsTotal", type: Zcl.DataType.UINT8, max: 0xff},
                    {name: "packetNumber", type: Zcl.DataType.UINT8, max: 0xff},
                    {name: "packetLength", type: Zcl.DataType.UINT8, max: 0xff}, // Max length is 70 bytes
                    // HELP for learnedDevicesList data structure:
                    //   struct structPacketPayload {
                    //     uint8_t ID;
                    //     uint8_t ModeType;
                    //     uint8_t KeyNum;
                    //     uint8_t KeyCode[KeyNum];
                    //   } arayPacketPayload[CurentPacketLenght];
                    // }
                    {name: "learnedDevicesList", type: Zcl.BuffaloZclDataType.LIST_UINT8},
                ],
            },
        },
    });
}
