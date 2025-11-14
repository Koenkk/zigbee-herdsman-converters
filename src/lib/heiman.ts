import {Zcl} from "zigbee-herdsman";

import * as m from "../lib/modernExtend";
import type {ModernExtend} from "../lib/types";

export const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.HEIMAN_TECHNOLOGY_CO_LTD};

export function addCustomClusterHeimanSpecificAirQuality(): ModernExtend {
    return m.deviceAddCustomCluster("heimanSpecificAirQuality", {
        ...manufacturerOptions,
        // from HS2AQ-3.0海曼智能空气质量检测仪API文档-V01
        ID: 0xfc81,
        attributes: {
            language: {ID: 0xf000, type: Zcl.DataType.UINT8},
            unitOfMeasure: {ID: 0xf001, type: Zcl.DataType.UINT8},
            // (0 is not charged, 1 is charging, 2 is fully charged)
            batteryState: {ID: 0xf002, type: Zcl.DataType.UINT8},
            pm10measuredValue: {ID: 0xf003, type: Zcl.DataType.UINT16},
            tvocMeasuredValue: {ID: 0xf004, type: Zcl.DataType.UINT16},
            aqiMeasuredValue: {ID: 0xf005, type: Zcl.DataType.UINT16},
            temperatureMeasuredMax: {ID: 0xf006, type: Zcl.DataType.INT16},
            temperatureMeasuredMin: {ID: 0xf007, type: Zcl.DataType.INT16},
            humidityMeasuredMax: {ID: 0xf008, type: Zcl.DataType.UINT16},
            humidityMeasuredMin: {ID: 0xf009, type: Zcl.DataType.UINT16},
            alarmEnable: {ID: 0xf00a, type: Zcl.DataType.UINT16},
        },
        commands: {
            setLanguage: {
                ID: 0x011b,
                parameters: [
                    // (1: English 0: Chinese)
                    {name: "languageCode", type: Zcl.DataType.UINT8},
                ],
            },
            setUnitOfTemperature: {
                ID: 0x011c,
                parameters: [
                    // (0: ℉ 1: ℃)
                    {name: "unitsCode", type: Zcl.DataType.UINT8},
                ],
            },
            getTime: {
                ID: 0x011d,
                parameters: [],
            },
        },
        commandsResponse: {},
    });
}

export function addCustomClusterHeimanSpecificScenes(): ModernExtend {
    return m.deviceAddCustomCluster("heimanSpecificScenes", {
        ...manufacturerOptions,
        // from HS2SS-3.0海曼智能情景开关API文档-V01
        ID: 0xfc80,
        manufacturerCode: Zcl.ManufacturerCode.HEIMAN_TECHNOLOGY_CO_LTD,
        attributes: {},
        commands: {
            cinema: {
                ID: 0xf0,
                parameters: [],
            },
            atHome: {
                ID: 0xf1,
                parameters: [],
            },
            sleep: {
                ID: 0xf2,
                parameters: [],
            },
            goOut: {
                ID: 0xf3,
                parameters: [],
            },
            repast: {
                ID: 0xf4,
                parameters: [],
            },
        },
        commandsResponse: {},
    });
}

export function addCustomClusterHeimanSpecificInfraRedRemote(): ModernExtend {
    return m.deviceAddCustomCluster("heimanSpecificInfraRedRemote", {
        ...manufacturerOptions,
        // from HS2IRC-3.0海曼智能红外转发控制器API-V01文档
        ID: 0xfc82,
        manufacturerCode: Zcl.ManufacturerCode.HEIMAN_TECHNOLOGY_CO_LTD,
        attributes: {},
        commands: {
            sendKey: {
                ID: 0xf0,
                parameters: [
                    {name: "id", type: Zcl.DataType.UINT8},
                    {name: "keyCode", type: Zcl.DataType.UINT8},
                ],
            },
            studyKey: {
                // Total we can have 30 keycode for each device ID (1..30).
                ID: 0xf1,
                // response: 0xf2,
                parameters: [
                    {name: "id", type: Zcl.DataType.UINT8},
                    {name: "keyCode", type: Zcl.DataType.UINT8},
                ],
            },
            deleteKey: {
                ID: 0xf3,
                parameters: [
                    // 1-15 - Delete specific ID, >= 16 - Delete All
                    {name: "id", type: Zcl.DataType.UINT8},
                    // 1-30 - Delete specific keycode, >= 31 - Delete All keycodes for the ID
                    {name: "keyCode", type: Zcl.DataType.UINT8},
                ],
            },
            createId: {
                // Total we can have 15 device IDs (1..15).
                ID: 0xf4,
                // response: 0xf5,
                parameters: [{name: "modelType", type: Zcl.DataType.UINT8}],
            },
            getIdAndKeyCodeList: {
                ID: 0xf6,
                // response: 0xf7,
                parameters: [],
            },
        },
        commandsResponse: {
            studyKeyRsp: {
                ID: 0xf2,
                parameters: [
                    {name: "id", type: Zcl.DataType.UINT8},
                    {name: "keyCode", type: Zcl.DataType.UINT8},
                    {name: "result", type: Zcl.DataType.UINT8}, // 0 - success, 1 - fail
                ],
            },
            createIdRsp: {
                ID: 0xf5,
                parameters: [
                    {name: "id", type: Zcl.DataType.UINT8}, // 0xFF - create failed
                    {name: "modelType", type: Zcl.DataType.UINT8},
                ],
            },
            getIdAndKeyCodeListRsp: {
                ID: 0xf7,
                parameters: [
                    {name: "packetsTotal", type: Zcl.DataType.UINT8},
                    {name: "packetNumber", type: Zcl.DataType.UINT8},
                    {name: "packetLength", type: Zcl.DataType.UINT8}, // Max length is 70 bytes
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
