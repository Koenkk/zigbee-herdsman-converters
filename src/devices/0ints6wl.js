import {tuya} from 'zigbee-herdsman-converters';
import {exposes} from 'zigbee-herdsman-converters';
const e = exposes.presets;
const ea = exposes.access;

export default {
    fingerprint: [
        {modelID: 'TS0601', manufacturerName: '_TZE284_0ints6wl'},
    ],
    model: 'TS0601_0ints6wl',
    vendor: 'Tuya',
    description: 'Soil moisture sensor (moisture, temperature, battery, conductivity)',
    fromZigbee: [tuya.fz.datapoints],
    toZigbee: [],
    exposes: [
        e.soil_moisture().withUnit('%'),
        e.temperature().withUnit('°C'),
        e.battery().withUnit('%'),
        e.numeric('conductivity', ea.STATE).withUnit('µS/cm')
            .withDescription('Soil conductivity'),
        e.linkquality(),
    ],
    meta: {
        tuyaDatapoints: [
            // dp: 101 → moisture (%)
            {dp: 101, type: 'value', name: 'soil_moisture', unit: '%', scale: 1},

            // dp: 5 → temperature (°C × 10)
            {dp: 5, type: 'value', name: 'temperature', unit: '°C', scale: 10},

            // dp: 3 → battery (%)
            {dp: 3, type: 'value', name: 'battery', unit: '%', scale: 1},

            // dp: 102 → conductivity (µS/cm)
            {dp: 102, type: 'value', name: 'conductivity', unit: 'µS/cm', scale: 1},
        ],
    },
};
