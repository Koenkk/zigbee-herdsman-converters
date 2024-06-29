import {Zcl} from 'zigbee-herdsman';

import {presets as e, access as ea} from './exposes';
import {logger} from './logger';
import {numeric, NumericArgs, deviceAddCustomCluster, setupConfigureForReporting} from './modernExtend';
import {Fz, Tz, ModernExtend, Configure} from './types';

const NS = 'zhc:develco';
const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.DEVELCO};

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
    readGenBasicPrimaryVersions: (): ModernExtend => {
        /*
         * Develco (and there B2C brand Frient) do not use swBuildId
         *  The versions are stored in develcoPrimarySwVersion and develcoPrimaryHwVersion, we read them during configure.
         */
        const configure: Configure[] = [
            async (device, coordinatorEndpoint, definition) => {
                for (const ep of device.endpoints) {
                    if (ep.supportsInputCluster('genBasic')) {
                        try {
                            const data = await ep.read('genBasic', ['develcoPrimarySwVersion', 'develcoPrimaryHwVersion'], manufacturerOptions);

                            if (data.hasOwnProperty('develcoPrimarySwVersion')) {
                                device.softwareBuildID = data.develcoPrimarySwVersion.join('.');
                            }

                            if (data.hasOwnProperty('develcoPrimaryHwVersion')) {
                                device.hardwareVersion = data.develcoPrimaryHwVersion.join('.');
                            }

                            device.save();
                        } catch (error) {
                            /* catch timeouts of sleeping devices */
                        }
                        break;
                    }
                }
            },
        ];
        return {configure, isModernExtend: true};
    },
};
