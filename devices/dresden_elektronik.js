const exposes = require('../lib/exposes');
const ota = require('../lib/ota');
const extend = require('../lib/extend');
const reporting = require('../lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['FLS-PP3'],
        model: 'Mega23M12',
        vendor: 'Dresden Elektronik',
        description: 'ZigBee Light Link wireless electronic ballast',
        extend: extend.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
        exposes: [e.light_brightness_colortemp_colorxy().withEndpoint('rgb'), e.light_brightness().withEndpoint('white')],
        endpoint: (device) => {
            return {rgb: 10, white: 11};
        },
    },
    {
        zigbeeModel: ['FLS-CT'],
        model: 'XVV-Mega23M12',
        vendor: 'Dresden Elektronik',
        description: 'ZigBee Light Link wireless electronic ballast color temperature',
        extend: extend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['Kobold'],
        model: 'BN-600110',
        vendor: 'Dresden Elektronik',
        description: 'Zigbee 3.0 dimm actuator',
        extend: extend.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['FLS-A lp (1-10V)'],
        model: 'BN-600078',
        vendor: 'Dresden Elektronik',
        description: 'Zigbee controller for 1-10V/PWM',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        exposes: [e.light_brightness().withEndpoint('l1'), e.light_brightness().withEndpoint('l2'),
            e.light_brightness().withEndpoint('l3'), e.light_brightness().withEndpoint('l4')],
        endpoint: (device) => {
            return {'l1': 11, 'l2': 12, 'l3': 13, 'l4': 14};
        },
        meta: {multiEndpoint: true, disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(11), coordinatorEndpoint, ['genLevelCtrl', 'genOnOff']);
            await reporting.bind(device.getEndpoint(12), coordinatorEndpoint, ['genLevelCtrl', 'genOnOff']);
            await reporting.bind(device.getEndpoint(13), coordinatorEndpoint, ['genLevelCtrl', 'genOnOff']);
            await reporting.bind(device.getEndpoint(14), coordinatorEndpoint, ['genLevelCtrl', 'genOnOff']);
            await reporting.onOff(device.getEndpoint(11));
            await reporting.brightness(device.getEndpoint(11));
            await reporting.onOff(device.getEndpoint(12));
            await reporting.brightness(device.getEndpoint(12));
            await reporting.onOff(device.getEndpoint(13));
            await reporting.brightness(device.getEndpoint(13));
            await reporting.onOff(device.getEndpoint(14));
            await reporting.brightness(device.getEndpoint(14));
        },
    },
];
