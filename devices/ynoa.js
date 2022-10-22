const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const extend = require('..//lib/extend');

module.exports = [
    {
        zigbeeModel: ['ZBT-CCTLight-GU100001'],
        model: '8718801528273',
        vendor: 'Ynoa',
        description: 'Smart LED GU10 CCT',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['ZBT-DIMSwitch-D0000'],
        model: '8718801528334',
        vendor: 'Ynoa',
        description: 'Remote control one button dimmer',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.action(['on', 'off', 'brightness_move_up', 'brightness_move_down', 'brightness_stop']), e.battery()],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['ZBT-RGBWLight-M0000'],
        model: 'LA-GU10-RGBW',
        vendor: 'Ynoa',
        description: 'Smart LED GU10 RGB CCT',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 526], supportsHS: true}),
    },
    {
        zigbeeModel: ['ZBT-RGBWSwitch-D0800'],
        model: 'LA-5KEY-RGBW',
        vendor: 'Ynoa',
        description: '5 key control for RGBW light',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move_to_color_temp,
            fz.command_move_to_color, fz.command_move_to_level, fz.battery],
        exposes: [e.battery(), e.battery_low(), e.action(['on', 'off', 'brightness_move_to_level',
            'color_temperature_move', 'color_move'])],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['ZBT-ONOFFPlug-D0009'],
        model: 'LA-PLUG-10Amp',
        vendor: 'Ynoa',
        description: 'Smart plug Zigbee 3.0',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.activePower(endpoint);
        },
    },
];
