const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

const definition = {
    zigbeeModel: ['PANEL_LED'],
    model: 'ESP32C6_LED_PANEL',
    vendor: 'DYNATTIC',
    description: 'RGB LED Matrix Panel with OTA support',
    fromZigbee: [
        fz.on_off,
        fz.brightness,
        fz.color_xy,
        fz.power_on_behavior,
    ],
    toZigbee: [
        tz.on_off,
        tz.brightness,
        tz.color_xy,
        tz.effect,
        tz.power_on_behavior,
    ],
    exposes: [
        e.light_brightness_colorxy(),
        e.effect(),
        e.power_on_behavior(),
    ],
    ota: {
        manufacturerCode: 0x1234,
        imageType: 0x5678,
    },
    configure: async (device, coordinatorEndpoint, logger) => {
        await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, [
            'genOnOff', 'genLevelCtrl', 'lightingColorCtrl'
        ]);
    },
};

module.exports = definition;
