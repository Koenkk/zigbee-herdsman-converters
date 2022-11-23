const extend = require('../lib/extend');
const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['DimmerSwitch-2Gang-ZB3.0'],
        model: 'D086-ZG',
        vendor: 'HZC Electric',
        description: 'Zigbee dual dimmer',
        extend: extend.light_onoff_brightness(),
        exposes: [e.light_brightness().withEndpoint('l1'), e.light_brightness().withEndpoint('l2')],
        endpoint: () => {
            return {l1: 1, l2: 2};
        },
        meta: {multiEndpoint: true},
    },
    {
        zigbeeModel: ['TempAndHumSensor-ZB3.0'],
        model: 'S093TH-ZG',
        vendor: 'HZC Electric',
        description: 'Temperature and humidity sensor',
        fromZigbee: [fz.temperature, fz.humidity, fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity()], // Unfortunately, battery percentage is not reported by this device
    },
];
