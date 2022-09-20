const exposes = require('./exposes');
const e = exposes.presets;
const fz = {...require('../converters/fromZigbee'), legacy: require('./legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const light = require('./light');

const extend = {
    switch: (options={}) => {
        const exposes = [e.switch()];
        const fromZigbee = [fz.on_off, fz.ignore_basic_report];
        const toZigbee = [tz.on_off];
        return {exposes, fromZigbee, toZigbee};
    },
    light_onoff_brightness: (options={}) => {
        options = {disableEffect: false, disablePowerOnBehavior: false, ...options};
        const exposes = [e.light_brightness(), ...(!options.disableEffect ? [e.effect()] : [])];
        const fromZigbee = [fz.on_off, fz.brightness, fz.level_config, fz.ignore_basic_report];
        const toZigbee = [tz.light_onoff_brightness, tz.ignore_transition, tz.ignore_rate, tz.light_brightness_move,
            tz.light_brightness_step, tz.level_config, ...(!options.disableEffect ? [tz.effect] : [])];

        if (!options.disablePowerOnBehavior) {
            fromZigbee.push(fz.power_on_behavior);
            toZigbee.push(tz.power_on_behavior);
        }

        const result = {exposes, fromZigbee, toZigbee};
        if (!options.noConfigure) {
            result.configure = async (device, coordinatorEndpoint, logger) => {
                await light.configure(device, coordinatorEndpoint, logger, true);
            };
        }

        return result;
    },
    light_onoff_brightness_colortemp: (options={}) => {
        options = {disableEffect: false, disableColorTempStartup: false, disablePowerOnBehavior: false, ...options};
        const exposes = [e.light_brightness_colortemp(options.colorTempRange), ...(!options.disableEffect ? [e.effect()] : [])];
        const toZigbee = [tz.light_onoff_brightness, tz.light_colortemp, tz.ignore_transition, tz.ignore_rate, tz.light_brightness_move,
            tz.light_colortemp_move, tz.light_brightness_step, tz.light_colortemp_step, tz.light_colortemp_startup, tz.level_config,
            tz.light_color_options, tz.light_color_mode, ...(!options.disableEffect ? [tz.effect] : [])];
        const fromZigbee = [fz.color_colortemp, fz.on_off, fz.brightness, fz.level_config, fz.ignore_basic_report];

        if (options.disableColorTempStartup) {
            exposes[0].removeFeature('color_temp_startup');
            toZigbee.splice(toZigbee.indexOf(tz.light_colortemp_startup), 1);
        }

        if (!options.disablePowerOnBehavior) {
            fromZigbee.push(fz.power_on_behavior);
            toZigbee.push(tz.power_on_behavior);
        }

        const result = {exposes, fromZigbee, toZigbee};
        if (!options.noConfigure) {
            result.configure = async (device, coordinatorEndpoint, logger) => {
                await light.configure(device, coordinatorEndpoint, logger, true);
            };
        }

        return result;
    },
    light_onoff_brightness_color: (options={}) => {
        options = {disableEffect: false, supportsHS: false, preferHS: false, disablePowerOnBehavior: false, ...options};
        const exposes = [(options.supportsHS ? e.light_brightness_color(options.preferHS) : e.light_brightness_colorxy()),
            ...(!options.disableEffect ? [e.effect()] : [])];
        const fromZigbee = [fz.color_colortemp, fz.on_off, fz.brightness, fz.level_config, fz.ignore_basic_report];
        const toZigbee = [tz.light_onoff_brightness, tz.light_color, tz.ignore_transition, tz.ignore_rate, tz.light_brightness_move,
            tz.light_brightness_step, tz.level_config, tz.light_hue_saturation_move,
            tz.light_hue_saturation_step, tz.light_color_options, tz.light_color_mode, ...(!options.disableEffect ? [tz.effect] : [])];

        if (!options.disablePowerOnBehavior) {
            fromZigbee.push(fz.power_on_behavior);
            toZigbee.push(tz.power_on_behavior);
        }

        const result = {exposes, fromZigbee, toZigbee};
        if (!options.noConfigure) {
            result.configure = async (device, coordinatorEndpoint, logger) => {
                await light.configure(device, coordinatorEndpoint, logger, false);
            };
        }

        return result;
    },
    light_onoff_brightness_colortemp_color: (options={}) => {
        options = {
            disableEffect: false,
            supportsHS: false,
            disableColorTempStartup: false,
            preferHS: false,
            disablePowerOnBehavior: false,
            ...options};
        const exposes = [(options.supportsHS ? e.light_brightness_colortemp_color(options.colorTempRange, options.preferHS) :
            e.light_brightness_colortemp_colorxy(options.colorTempRange)), ...(!options.disableEffect ? [e.effect()] : [])];
        const fromZigbee = [fz.color_colortemp, fz.on_off, fz.brightness, fz.level_config, fz.ignore_basic_report];
        const toZigbee = [
            tz.light_onoff_brightness, tz.light_color_colortemp, tz.ignore_transition, tz.ignore_rate, tz.light_brightness_move,
            tz.light_colortemp_move, tz.light_brightness_step, tz.light_colortemp_step, tz.light_hue_saturation_move,
            tz.light_hue_saturation_step, tz.light_colortemp_startup, tz.level_config, tz.light_color_options,
            tz.light_color_mode, ...(!options.disableEffect ? [tz.effect] : [])];

        if (options.disableColorTempStartup) {
            exposes[0].removeFeature('color_temp_startup');
            toZigbee.splice(toZigbee.indexOf(tz.light_colortemp_startup), 1);
        }

        if (!options.disablePowerOnBehavior) {
            fromZigbee.push(fz.power_on_behavior);
            toZigbee.push(tz.power_on_behavior);
        }

        const result = {exposes, fromZigbee, toZigbee};
        if (!options.noConfigure) {
            result.configure = async (device, coordinatorEndpoint, logger) => {
                await light.configure(device, coordinatorEndpoint, logger, true);
            };
        }

        return result;
    },
};
{
    extend.ledvance = {
        light_onoff_brightness: (options={}) => ({
            ...extend.light_onoff_brightness(options),
            toZigbee: extend.light_onoff_brightness(options).toZigbee.concat([tz.ledvance_commands]),
        }),
        light_onoff_brightness_colortemp: (options={}) => ({
            ...extend.light_onoff_brightness_colortemp({disableColorTempStartup: true, ...options}),
            toZigbee: extend.light_onoff_brightness_colortemp({disableColorTempStartup: true, ...options})
                .toZigbee.concat([tz.ledvance_commands]),
        }),
        light_onoff_brightness_color: (options={}) => ({
            ...extend.light_onoff_brightness_color({supportsHS: true, ...options}),
            toZigbee: extend.light_onoff_brightness_color({supportsHS: true, ...options}).toZigbee.concat([tz.ledvance_commands]),
        }),
        light_onoff_brightness_colortemp_color: (options={}) => ({
            ...extend.light_onoff_brightness_colortemp_color({supportsHS: true, disableColorTempStartup: true, ...options}),
            toZigbee: extend.light_onoff_brightness_colortemp_color({supportsHS: true, disableColorTempStartup: true, ...options})
                .toZigbee.concat([tz.ledvance_commands]),
        }),
    };
}

module.exports = extend;
