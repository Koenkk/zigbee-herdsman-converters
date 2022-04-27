const globalStore = require('../lib/store');
const extend = require('../lib/extend');
const utils = require('../lib/utils');
const tz = require('../converters/toZigbee');

const ggiderwelExtend = {
    light_onoff_brightness_colortemp_color: (options={}) => ({
        ...extend.light_onoff_brightness_colortemp_color({...options, supportsHS: true}),
        toZigbee: utils.replaceInArray(
            extend.light_onoff_brightness_colortemp_color(options).toZigbee,
            [tz.light_onoff_brightness, tz.light_color_colortemp],
            [tz.giderwel_light_onoff_brightness, tz.giderwel_light_color_colortemp],
        ),
    }),
    switch: (options={}) => ({
        ...extend.switch(options),
        onEvent: async (type, data, device) => {
            // This device doesn't support reporting.
            // Therefore we read the on/off state every 5 seconds.
            // This is the same way as the Hue bridge does it.
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            } else if (!globalStore.hasValue(device, 'interval')) {
                const interval = setInterval(async () => {
                    try {
                        await device.endpoints[0].read('genOnOff', ['onOff']);
                    } catch (error) {
                        // Do nothing
                    }
                }, 5000);
                globalStore.putValue(device, 'interval', interval);
            }
        },
    }),
};

module.exports = [
    {
        zigbeeModel: ['A10'],
        model: 'GD-ZCRGB012',
        vendor: 'GIDERWEL',
        description: 'Smart Zigbee RGB LED strip controller',
        extend: extend.light_onoff_brightness_color({supportsHS: false}),
    },
    {
        zigbeeModel: ['A11'], // 1 ID controls white and color together
        model: 'ZC05M-5',
        meta: {disableDefaultResponse: (entity) => !!entity.getDevice().getEndpoint(12)},
        vendor: 'GIDERWEL',
        description: 'Zigbee LED Controller RGBW (1 ID)',
        extend: ggiderwelExtend.light_onoff_brightness_colortemp_color(),
        },
];
