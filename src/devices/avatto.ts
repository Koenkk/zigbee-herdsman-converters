import * as exposes from '../lib/exposes';
import * as tuya from '../lib/tuya';
import {DefinitionWithExtend} from '../lib/types';

const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE204_s139roas'}],
        model: 'ZWSH16',
        vendor: 'AVATTO',
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

    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_goecjd1t']),
        model: 'ZWPM16',
        vendor: 'AVATTO',
        description: 'Zigbee smart energy meter',
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        exposes: [e.power(), e.voltage(), e.current()],
        meta: {
            tuyaDatapoints: [
                [18, 'current', tuya.valueConverter.divideBy1000],
                [19, 'power', tuya.valueConverter.divideBy10],
                [20, 'voltage', tuya.valueConverter.divideBy10],
            ],
        },
    },
];

export default definitions;
module.exports = definitions;
