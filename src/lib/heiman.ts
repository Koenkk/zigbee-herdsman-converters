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
