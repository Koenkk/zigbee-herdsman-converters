import * as exposes from '../lib/exposes';
import * as tuya from '../lib/tuya';
import {DefinitionWithExtend} from '../lib/types';
const e = exposes.presets;
const ea = exposes.access;

const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE204_s139roas'}],
        model: 'ZWSH16',
        vendor: 'Avatto',
        description: 'Smart Temperature and Humidity Detector',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await endpoint.command('manuSpecificTuya', 'mcuVersionRequest', {seq: 0x0002});
        },
        exposes: [e.battery(), e.temperature(), e.humidity(), tuya.exposes.temperatureUnit(), tuya.exposes.batteryState()],
        meta: {
            tuyaDatapoints: [
                [1, 'temperature', tuya.valueConverter.divideBy10],
                [2, 'humidity', tuya.valueConverter.raw],
                [9, 'temperature_unit', tuya.valueConverter.temperatureUnit],
                [14, 'battery_state', tuya.valueConverter.batteryState],
                [15, 'battery', tuya.valueConverter.raw],
            ],
        },
    },
];

export default definitions;
module.exports = definitions;
