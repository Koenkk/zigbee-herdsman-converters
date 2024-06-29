import {Zcl} from 'zigbee-herdsman';

import {presets as e, access as ea} from './exposes';
import {logger} from './logger';
import {numeric, NumericArgs, deviceAddCustomCluster, setupConfigureForReporting} from './modernExtend';
import {Fz, Tz, ModernExtend, Configure} from './types';

const NS = 'zhc:develco';

export const develcoModernExtend = {
    addCustomClusterManuSpecificDevelcoGenBasic: () =>
        deviceAddCustomCluster('genBasic', {
            ID: 0x0000,
            attributes: {
                develcoPrimarySwVersion: {ID: 0x8000, type: Zcl.DataType.OCTET_STR, manufacturerCode: Zcl.ManufacturerCode.DEVELCO},
                develcoPrimaryHwVersion: {ID: 0x8020, type: Zcl.DataType.OCTET_STR, manufacturerCode: Zcl.ManufacturerCode.DEVELCO},
                develcoLedControl: {ID: 0x8100, type: Zcl.DataType.BITMAP8, manufacturerCode: Zcl.ManufacturerCode.DEVELCO},
            },
            commands: {},
            commandsResponse: {},
        }),
    addCustomClusterManuSpecificDevelcoAirQuality: () =>
        deviceAddCustomCluster('manuSpecificDevelcoAirQuality', {
            ID: 0xfc03,
            manufacturerCode: Zcl.ManufacturerCode.DEVELCO,
            attributes: {
                measuredValue: {ID: 0x0000, type: Zcl.DataType.UINT16},
                minMeasuredValue: {ID: 0x0001, type: Zcl.DataType.UINT16},
                maxMeasuredValue: {ID: 0x0002, type: Zcl.DataType.UINT16},
                resolution: {ID: 0x0003, type: Zcl.DataType.UINT16},
            },
            commands: {},
            commandsResponse: {},
        }),
};
