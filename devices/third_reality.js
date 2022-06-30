const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['3RSS009Z'],
        model: '3RSS009Z',
        vendor: 'Third Reality',
        description: 'Smart switch Gen3',
        fromZigbee: [fz.on_off, fz.battery],
        toZigbee: [tz.on_off, tz.ignore_transition],
        exposes: [e.switch(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['3RSS008Z'],
        model: '3RSS008Z',
        vendor: 'Third Reality',
        description: 'RealitySwitch Plus',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off, tz.ignore_transition],
        exposes: [e.switch()],
    },
    {
        zigbeeModel: ['3RSS007Z'],
        model: '3RSS007Z',
        vendor: 'Third Reality',
        description: 'Smart light switch',
        extend: extend.switch(),
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['3RSL011Z'],
        model: '3RSL011Z',
        vendor: 'Third Reality',
        description: 'Smart light A19',
        extend: extend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['3RSL012Z'],
        model: '3RSL012Z',
        vendor: 'Third Reality',
        description: 'Smart light BR30',
        extend: extend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['3RWS18BZ'],
        model: '3RWS18BZ',
        vendor: 'Third Reality',
        description: 'Water sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        meta: {battery: {dontDividePercentage: true}},
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            device.powerSource = 'Battery';
            device.save();
        },
    },
    {
        zigbeeModel: ['3RMS16BZ'],
        model: '3RMS16BZ',
        vendor: 'Third Reality',
        description: 'Wireless motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {dontDividePercentage: true}},
        exposes: [e.occupancy(), e.battery_low(), e.battery(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['3RDS17BZ'],
        model: '3RDS17BZ',
        vendor: 'Third Reality',
        description: 'Door sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {dontDividePercentage: true}},
        exposes: [e.contact(), e.battery_low(), e.battery(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['3RSP019BZ'],
        model: '3RSP019BZ',
        vendor: 'Third Reality',
        description: 'Zigbee / BLE smart plug',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
    },
    {
        zigbeeModel: ['3RSB22BZ'],
        model: '3RSB22BZ',
        vendor: 'Third Reality',
        description: 'Smart Button',
        fromZigbee: [fz.battery, fz.itcmdr_clicks],
        toZigbee: [],
        exposes: [e.battery(), e.battery_low(), e.battery_voltage(), e.action(['single', 'double', 'long'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            device.powerSource = 'Battery';
            device.save();
        },  
    },
];
