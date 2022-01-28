const exposes = require('zigbee-herdsman-converters/lib/exposes');
const fz = {...require('zigbee-herdsman-converters/converters/fromZigbee'), legacy: require('zigbee-herdsman-converters/lib/legacy').fromZigbee};
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const e = exposes.presets;
const ea = exposes.access;
const globalStore = require('zigbee-herdsman-converters/lib/store');

module.exports = [
    {
    zigbeeModel: ['MS100'],
    model: 'MS100(UN)',
    vendor: 'TP-Link',
    description: 'Smart Motion Sensor',
    fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.illuminance],
    toZigbee: [],
    exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery(), e.illuminance(), e.illuminance_lux(),],
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        const endpoint2 = device.getEndpoint(2);
        await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
        await reporting.batteryPercentageRemaining(endpoint);
        await reporting.bind(endpoint2, coordinatorEndpoint, ['msIlluminanceMeasurement']);
        await reporting.illuminance(endpoint2);
        device.powerSource = 'Battery';
        device.save();
        },
    }
];
