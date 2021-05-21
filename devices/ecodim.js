const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const e = exposes.presets;
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['Dimmer-Switch-ZB3.0'],
        model: 'Eco-Dim.07',
        vendor: 'EcoDim',
        description: 'Zigbee & Z-wave dimmer ',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        whiteLabel: [{vendor: 'Iolloi', model: 'ID-EU20FW09'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ['ED-10010'],
        model: 'ED-10010',
        vendor: 'EcoDim',
        description: 'Zigbee 2 button wall switch - white',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.battery(), e.action(['on', 'off', 'brightness_move_up', 'brightness_move_down', 'brightness_stop'])],
        toZigbee: [],
        meta: {multiEndpoint: true},
    },
    {
        zigbeeModel: ['ED-10011'],
        model: 'ED-10011',
        vendor: 'EcoDim',
        description: 'Zigbee 2 button wall switch - black',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.battery(), e.action(['on_1', 'off_1', 'brightness_move_up_1', 'brightness_move_down_1', 'brightness_stop_1'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['ED-10012'],
        model: 'ED-10012',
        vendor: 'EcoDim',
        description: 'Zigbee 4 button wall switch - white',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.battery(), e.action(['on_1', 'off_1', 'brightness_move_up_1', 'brightness_move_down_1', 'brightness_stop_1',
            'on_2', 'off_2', 'brightness_move_up_2', 'brightness_move_down_2', 'brightness_stop_2'])],
        toZigbee: [],
        meta: {multiEndpoint: true},
    },
    {
        zigbeeModel: ['ED-10013'],
        model: 'ED-10013',
        vendor: 'EcoDim',
        description: 'Zigbee 4 button wall switch - black',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.battery(), e.action(['on_1', 'off_1', 'brightness_move_up_1', 'brightness_move_down_1', 'brightness_stop_1',
            'on_2', 'off_2', 'brightness_move_up_2', 'brightness_move_down_2', 'brightness_stop_2'])],
        toZigbee: [],
        meta: {multiEndpoint: true},
    },
    {
        zigbeeModel: ['ED-10014'],
        model: 'ED-10014',
        vendor: 'EcoDim',
        description: 'Zigbee 8 button wall switch - white',
        supports: '',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.battery(), e.action(['on_1', 'off_1', 'brightness_move_up_1', 'brightness_move_down_1', 'brightness_stop_1',
            'on_2', 'off_2', 'brightness_move_up_2', 'brightness_move_down_2', 'brightness_stop_2', 'on_3', 'off_3',
            'brightness_move_up_3', 'brightness_move_down_3', 'brightness_stop_3', 'on_4', 'off_4', 'brightness_move_up_4',
            'brightness_move_down_4', 'brightness_stop_4'])],
        toZigbee: [],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: true}},
    },
    {
        zigbeeModel: ['ED-10015'],
        model: 'ED-10015',
        vendor: 'EcoDim',
        description: 'Zigbee 8 button wall switch - black',
        supports: '',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.battery(), e.action(['on_1', 'off_1', 'brightness_move_up_1', 'brightness_move_down_1', 'brightness_stop_1',
            'on_2', 'off_2', 'brightness_move_up_2', 'brightness_move_down_2', 'brightness_stop_2', 'on_3', 'off_3', 'brightness_move_up_3',
            'brightness_move_down_3', 'brightness_stop_3', 'on_4', 'off_4', 'brightness_move_up_4', 'brightness_move_down_4',
            'brightness_stop_4'])],
        toZigbee: [],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: true}},
    },
];
