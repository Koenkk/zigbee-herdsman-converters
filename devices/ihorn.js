const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['113D'],
        model: 'LH-32ZB',
        vendor: 'iHORN',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.humidity, fz.temperature, fz.battery],
        toZigbee: [],
        exposes: [e.humidity(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['113C'],
        model: 'LH-992ZB',
        vendor: 'iHORN',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['TI0001 '],
        model: 'LH-990ZB',
        vendor: 'iHORN',
        description: 'PIR motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['HORN-MECI-A3.9-E'],
        model: 'HO-09ZB',
        vendor: 'iHORN',
        description: 'Door or window contact switch',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['HORN-PIR--A3.9-E'],
        model: 'LH-990F',
        vendor: 'iHORN',
        description: 'PIR motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
];
