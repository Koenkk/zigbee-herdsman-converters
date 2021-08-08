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
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.battery()],
    },
];
