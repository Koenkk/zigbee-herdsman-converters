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
    voc: (args?: Partial<NumericArgs>) =>
        numeric({
            name: 'voc',
            cluster: 'manuSpecificDevelcoAirQuality',
            attribute: 'measuredValue',
            reporting: {min: '1_MINUTE', max: '1_HOUR', change: 10},
            description: 'Measured VOC value',
            // from Sensirion_Gas_Sensors_SGP3x_TVOC_Concept.pdf
            // "The mean molar mass of this mixture is 110 g/mol and hence,
            // 1 ppb TVOC corresponds to 4.5 μg/m3."
            scale: 4.5,
            unit: 'µg/m³',
            access: 'STATE_GET',
            ...args,
        }),
    airQuality: (): ModernExtend => {
        // NOTE: do not setup reporting, this is hanled by the voc() modernExtend

        const clusterName = 'manuSpecificDevelcoAirQuality';
        const attributeName = 'measuredValue';
        const propertyName = 'air_quality';
        const access = ea.STATE;

        const expose = e
            .enum('air_quality', access, ['excellent', 'good', 'moderate', 'poor', 'unhealthy', 'out_of_range', 'unknown'])
            .withDescription('Measured air quality');

        const fromZigbee: Fz.Converter[] = [
            {
                cluster: clusterName,
                type: ['attributeReport', 'readResponse'],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data.hasOwnProperty(attributeName)) {
                        const vocPpb = parseFloat(msg.data[attributeName]);

                        // from aqszb-110-technical-manual-air-quality-sensor-04-08-20.pdf page 6, section 2.2 voc
                        // this contains a ppb to level mapping table.
                        let airQuality;
                        if (vocPpb <= 65) {
                            airQuality = 'excellent';
                        } else if (vocPpb <= 220) {
                            airQuality = 'good';
                        } else if (vocPpb <= 660) {
                            airQuality = 'moderate';
                        } else if (vocPpb <= 2200) {
                            airQuality = 'poor';
                        } else if (vocPpb <= 5500) {
                            airQuality = 'unhealthy';
                        } else if (vocPpb > 5500) {
                            airQuality = 'out_of_range';
                        } else {
                            airQuality = 'unknown';
                        }

                        return {[propertyName]: airQuality};
                    }
                },
            },
        ];

        return {exposes: [expose], fromZigbee, isModernExtend: true};
    },
};
