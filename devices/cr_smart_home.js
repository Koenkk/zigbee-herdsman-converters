const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        fingerprint: [{modelID: 'TS0202', manufacturerName: '_TYZB01_jytabjkb'}],
        model: 'TS0202_CR',
        vendor: 'CR Smart Home',
        description: 'Motion sensor',
        // Requires alarm_1_with_timeout https://github.com/Koenkk/zigbee2mqtt/issues/2818#issuecomment-776119586
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout, fz.battery, fz.ignore_basic_report],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['TS0203'],
        model: 'TS0203',
        vendor: 'CR Smart Home',
        description: 'Door sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ignore_basic_report, fz.ias_contact_alarm_1_report],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['TS0204'],
        model: 'TS0204',
        vendor: 'CR Smart Home',
        description: 'Gas sensor',
        fromZigbee: [fz.ias_gas_alarm_1, fz.battery, fz.ignore_basic_report],
        toZigbee: [],
        exposes: [e.gas(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['TS0205'],
        model: 'TS0205',
        vendor: 'CR Smart Home',
        description: 'Smoke sensor',
        fromZigbee: [fz.ias_smoke_alarm_1, fz.battery, fz.ignore_basic_report],
        toZigbee: [],
        exposes: [e.smoke(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['TS0111'],
        model: 'TS0111',
        vendor: 'CR Smart Home',
        description: 'Socket',
        extend: extend.switch(),
    },
    {
        zigbeeModel: ['TS0207', 'FNB54-WTS08ML1.0'],
        model: 'TS0207',
        vendor: 'CR Smart Home',
        description: 'Water leak detector',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['TS0218'],
        model: 'TS0218',
        vendor: 'CR Smart Home',
        description: 'Button',
        fromZigbee: [fz.legacy.TS0218_click, fz.battery],
        exposes: [e.battery(), e.action(['click'])],
        toZigbee: [],
    },
];
