import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import {Definition} from '../lib/types';

const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        zigbeeModel: ['TS0601'],
        model: 'EGI_HVAC_Adapter',
        vendor: 'Tuya',
        description: 'EGI HVAC Climate Control Adapter',
        fromZigbee: [
            {
                cluster: 'manuSpecificTuya',
                type: ['commandDataResponse', 'commandDataReport'],
                convert: (model, msg, publish, options, meta) => {
                    const parsedData: Record<string, any> = {};

                    if (msg.data && msg.data.dpValues) {
                        msg.data.dpValues.forEach((dpValue: { dp: number; data: Buffer }) => {
                            const dp = dpValue.dp;
                            const value = dpValue.data.readUIntBE(0, dpValue.data.length);

                            switch (dp) {
                                case 1:
                                    parsedData.state = value === 1 ? 'ON' : 'OFF';
                                    break;
                                case 2:
                                    parsedData.temperature_set = value;
                                    break;
                                case 3:
                                    parsedData.temperature_current = value;
                                    break;
                                case 4:
                                    const modes = ['Cool', 'Heat', 'Dehumidify', 'Fan'];
                                    parsedData.mode = modes[value] || 'unknown';
                                    break;
                                case 5:
                                    const fanSpeeds = ['Low', 'Medium', 'High', 'Auto'];
                                    parsedData.fan_speed = fanSpeeds[value] || 'unknown';
                                    break;
                                case 7:
                                    parsedData.set_as_slave = value === 1 ? 'ENABLE' : 'DISABLE';
                                    break;
                                default:
                                    console.warn(`Unrecognized datapoint ${dp} with value ${value}`);
                            }
                        });

                        publish(parsedData);
                    }

                    return parsedData;
                },
            },
        ],
        toZigbee: [
            tz.on_off,
            {
                key: ['temperature_set'],
                convertSet: async (entity, key, value, meta) => {
                    const data = Buffer.alloc(4);
                    data.writeUIntBE(Math.round(value as number), 0, 4);
                    await entity.command(
                        'manuSpecificTuya',
                        'dataRequest',
                        {
                            seq: (meta as any).seq || 0,
                            dpValues: [{ dp: 2, datatype: 2, data }],
                        },
                        { disableDefaultResponse: true }
                    );
                },
            },
            {
                key: ['fan_speed'],
                convertSet: async (entity, key, value, meta) => {
                    const fanMapping: Record<string, number> = { Low: 0, Medium: 1, High: 2, Auto: 3 };
                    await entity.command(
                        'manuSpecificTuya',
                        'dataRequest',
                        {
                            seq: (meta as any).seq || 0,
                            dpValues: [{ dp: 5, datatype: 4, data: Buffer.from([fanMapping[value as string]]) }],
                        },
                        { disableDefaultResponse: true }
                    );
                },
            },
            {
                key: ['mode'],
                convertSet: async (entity, key, value, meta) => {
                    const modeMapping: Record<string, number> = { Cool: 0, Heat: 1, Dehumidify: 2, Fan: 3 };
                    await entity.command(
                        'manuSpecificTuya',
                        'dataRequest',
                        {
                            seq: (meta as any).seq || 0,
                            dpValues: [{ dp: 4, datatype: 4, data: Buffer.from([modeMapping[value as string]]) }],
                        },
                        { disableDefaultResponse: true }
                    );
                },
            },
            {
                key: ['set_as_slave'],
                convertSet: async (entity, key, value, meta) => {
                    await entity.command(
                        'manuSpecificTuya',
                        'dataRequest',
                        {
                            seq: (meta as any).seq || 0,
                            dpValues: [{ dp: 7, datatype: 1, data: Buffer.from([value === 'ENABLE' ? 1 : 0]) }],
                        },
                        { disableDefaultResponse: true }
                    );
                },
            },
        ],
        exposes: [
            e.binary('state', ea.STATE_SET, 'ON', 'OFF').withDescription('Power state'),
            e.numeric('temperature_set', ea.STATE_SET)
                .withValueMin(16)
                .withValueMax(32)
                .withUnit('°C')
                .withDescription('Target temperature'),
            e.numeric('temperature_current', ea.STATE)
                .withValueMin(-20)
                .withValueMax(50)
                .withUnit('°C')
                .withDescription('Current room temperature'),
            e.enum('mode', ea.STATE_SET, ['Cool', 'Heat', 'Dehumidify', 'Fan']).withDescription('System mode'),
            e.enum('fan_speed', ea.STATE_SET, ['Low', 'Medium', 'High', 'Auto']).withDescription('Fan speed mode'),
            e.binary('set_as_slave', ea.STATE_SET, 'ENABLE', 'DISABLE').withDescription('Set as Slave mode'),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'state'],
                [2, 'temperature_set'],
                [3, 'temperature_current'],
                [4, 'mode'],
                [5, 'fan_speed'],
                [7, 'set_as_slave'],
            ],
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
            await endpoint.read('genBasic', ['modelId', 'manufacturerName']);
        },
    },
];

export default definitions;
