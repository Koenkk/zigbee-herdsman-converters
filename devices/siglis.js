const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const e = exposes.presets;


module.exports = [
    {
        zigbeeModel: ['zigfred uno'],
        model: 'zigfred uno',
        vendor: 'Siglis',
        description: 'Smart In-Wall Switch',
        exposes: [e.light_brightness_colorxy().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.light_brightness().withEndpoint('l3')],
        fromZigbee: [fz.color_colortemp, fz.on_off, fz.brightness, fz.level_config, fz.power_on_behavior, fz.ignore_basic_report],
        toZigbee: [tz.light_onoff_brightness, tz.light_color, tz.ignore_transition, tz.ignore_rate, tz.light_brightness_move,
            tz.light_brightness_step, tz.level_config, tz.power_on_behavior, tz.light_hue_saturation_move,
            tz.light_hue_saturation_step, tz.light_color_options, tz.light_color_mode],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'l1': 5, 'l2': 6, 'l3': 7};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const controlEp = device.getEndpoint(5);
            const relayEp = device.getEndpoint(6);
            const dimmerEp = device.getEndpoint(7);
            // Bind Control EP (LED)
            await reporting.bind(controlEp, coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(controlEp, coordinatorEndpoint, ['genLevelCtrl']);
            await reporting.onOff(controlEp);
            await reporting.brightness(controlEp);
            // Bind Relay EP
            await reporting.bind(relayEp, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(relayEp);
            // Bind Dimmer EP
            await reporting.bind(dimmerEp, coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(dimmerEp, coordinatorEndpoint, ['genLevelCtrl']);
            await reporting.onOff(dimmerEp);
            await reporting.brightness(dimmerEp);
        },
    },
];
