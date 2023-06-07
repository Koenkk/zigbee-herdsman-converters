import extend from './extend';
import tz from '../converters/toZigbee';

const ledvanceExtend = {
    light_onoff_brightness: (options: extend.options_light_onoff_brightness={}) => {
        options = {disablePowerOnBehavior: true, ...options};
        return {
            ...extend.light_onoff_brightness(options),
            toZigbee: extend.light_onoff_brightness(options).toZigbee.concat([tz.ledvance_commands]),
        };
    },
    light_onoff_brightness_colortemp: (options: extend.options_light_onoff_brightness_colortemp={}) => {
        options = {disablePowerOnBehavior: true, ...options};
        return {
            ...extend.light_onoff_brightness_colortemp({disableColorTempStartup: true, ...options}),
            toZigbee: extend.light_onoff_brightness_colortemp({disableColorTempStartup: true, ...options})
                .toZigbee.concat([tz.ledvance_commands]),
        };
    },
    light_onoff_brightness_color: (options: extend.options_light_onoff_brightness_color={}) => {
        options = {disablePowerOnBehavior: true, ...options};
        return {
            ...extend.light_onoff_brightness_color({supportsHueAndSaturation: true, ...options}),
            toZigbee: extend.light_onoff_brightness_color({supportsHueAndSaturation: true, ...options}).toZigbee.concat([tz.ledvance_commands]),
        };
    },
    light_onoff_brightness_colortemp_color: (options: extend.options_light_onoff_brightness_colortemp_color={}) => {
        options = {disablePowerOnBehavior: true, ...options};
        return {
            ...extend.light_onoff_brightness_colortemp_color({supportsHueAndSaturation: true, disableColorTempStartup: true, ...options}),
            toZigbee: extend.light_onoff_brightness_colortemp_color({supportsHueAndSaturation: true, disableColorTempStartup: true, ...options})
                .toZigbee.concat([tz.ledvance_commands]),
        };
    },
};

export {ledvanceExtend as extend};
exports.extend = ledvanceExtend;
