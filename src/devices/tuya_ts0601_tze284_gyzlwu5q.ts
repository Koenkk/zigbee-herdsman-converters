import * as exposes from 'zigbee-herdsman-converters/lib/exposes';
import * as fz from 'zigbee-herdsman-converters/converters/fromZigbee';
import * as tz from 'zigbee-herdsman-converters/converters/toZigbee';
import { Definition } from 'zigbee-herdsman-converters/lib/types';

const definitions: Definition[] = [
    {
        zigbeeModel: ['TS0601'],
        model: 'TS0601_TZE284_gyzlwu5q',
        vendor: 'Tuya',
        description: 'Smoke detector with temperature, humidity sensor and test button',
        fromZigbee: [
            fz.ignore_basic_report,
            {
                cluster: 'manuSpecificTuya',
                type: ['commandDataReport'],
                convert: (model, msg, publish, options, meta) => {
                    const dpValues = msg.data.dpValues;
                    const result: any = {};

                    meta.testButtonTimeouts = meta.testButtonTimeouts || {};

                    dpValues.forEach(dp => {
                        switch (dp.dp) {
                            case 1: // Smoke
                                if (dp.datatype === 4) result.smoke = dp.data[0] > 0;
                                break;
                            case 23: // Temperature
                                if (dp.data.length === 4) result.temperature = Math.round(dp.data.readUInt32BE(0) / 10 * 10) / 10;
                                break;
                            case 24: // Humidity
                                if (dp.data.length === 4) result.humidity = dp.data.readUInt32BE(0);
                                break;
                            case 9: // Test button
                                if (dp.datatype === 4) {
                                    publish({ test_button: 'pressed' });

                                    // Clear existing timeout if still running
                                    if (meta.testButtonTimeouts[dp.dp]) clearTimeout(meta.testButtonTimeouts[dp.dp]);

                                    // New timeout for idle
                                    meta.testButtonTimeouts[dp.dp] = setTimeout(() => {
                                        publish({ test_button: 'idle' });
                                        delete meta.testButtonTimeouts[dp.dp];
                                    }, 1500);
                                }
                                break;
                            case 14: // Battery
                                if (dp.datatype === 4) result.battery_low = dp.data[0] === 1;
                                break;
                            default:
                                console.log(`Unknown DP${dp.dp}: ${JSON.stringify(dp.data)}`);
                        }
                    });

                    return result;
                }
            }
        ],
        toZigbee: [],
        exposes: [
            exposes.binary('smoke', exposes.access.STATE, true, false).withDescription('Smoke detected'),
            exposes.numeric('temperature', exposes.access.STATE)
                .withUnit('°C')
                .withDescription('Measured temperature')
                .withValueMin(-40).withValueMax(80).withValueStep(0.1),
            exposes.numeric('humidity', exposes.access.STATE)
                .withUnit('%')
                .withDescription('Measured humidity')
                .withValueMin(0).withValueMax(100),
            exposes.enum('test_button', exposes.access.STATE, ['idle', 'pressed'])
                .withDescription('Test button status'),
            exposes.binary('battery_low', exposes.access.STATE)
                .withDescription('Battery low indicator from DP14')
        ],
        meta: { multiEndpoint: false },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            try {
                await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
            } catch {
                console.log('Battery percentage not available');
            }
        }
    }
];

export default definitions;
