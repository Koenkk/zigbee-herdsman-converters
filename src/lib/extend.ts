import * as exposes from './exposes';
import tz from '../converters/toZigbee';
import fz from '../converters/fromZigbee';
import * as light from './light';
import {Extend} from './types';
const e = exposes.presets;

const extend = {
    switch: (options: Extend.options_switch={}): Extend => {
        options = {disablePowerOnBehavior: false, toZigbee: [], fromZigbee: [], exposes: [], ...options};
        const exposes = [e.switch(), ...options.exposes];
        const fromZigbee = [fz.on_off, fz.ignore_basic_report, ...options.fromZigbee];
        const toZigbee = [tz.on_off, ...options.toZigbee];
        if (!options.disablePowerOnBehavior) {
            exposes.push(e.power_on_behavior(['off', 'on', 'toggle', 'previous']));
            fromZigbee.push(fz.power_on_behavior);
            toZigbee.push(tz.power_on_behavior);
        }
        return {exposes, fromZigbee, toZigbee};
    },
    light_onoff_brightness: (options: Extend.options_light_onoff_brightness={}): Extend => {
        options = {
            disableEffect: false, disablePowerOnBehavior: false, disableMoveStep: false, disableTransition: false,
            toZigbee: [], fromZigbee: [], exposes: [], ...options,
        };
        const exposes = [e.light_brightness(), ...(!options.disableEffect ? [e.effect()] : []), ...options.exposes];
        const fromZigbee = [fz.on_off, fz.brightness, fz.level_config, fz.ignore_basic_report, ...options.fromZigbee];
        const toZigbee = [tz.light_onoff_brightness, tz.ignore_rate, tz.level_config, ...options.toZigbee,
            ...(!options.disableTransition ? [tz.ignore_transition] : []),
            ...(!options.disableEffect ? [tz.effect] : []),
            ...(!options.disableMoveStep ? [tz.light_brightness_move, tz.light_brightness_step] : [])];

        if (!options.disablePowerOnBehavior) {
            exposes.push(e.power_on_behavior(['off', 'on', 'toggle', 'previous']));
            fromZigbee.push(fz.power_on_behavior);
            toZigbee.push(tz.power_on_behavior);
        }

        const result: Extend = {exposes, fromZigbee, toZigbee};
        if (!options.noConfigure) {
            result.configure = async (device, coordinatorEndpoint, logger) => {
                await light.configure(device, coordinatorEndpoint, logger, true);
            };
        }

        return result;
    },
    light_onoff_brightness_colortemp: (options: Extend.options_light_onoff_brightness_colortemp={}): Extend => {
        options = {
            disableEffect: false, disableColorTempStartup: false, disablePowerOnBehavior: false,
            toZigbee: [], fromZigbee: [], exposes: [], ...options,
        };
        const exposes = [e.light_brightness_colortemp(options.colorTempRange), ...(!options.disableEffect ? [e.effect()] : []),
            ...options.exposes];
        const toZigbee = [tz.light_onoff_brightness, tz.light_colortemp, tz.ignore_transition, tz.ignore_rate, tz.light_brightness_move,
            tz.light_colortemp_move, tz.light_brightness_step, tz.light_colortemp_step, tz.light_colortemp_startup, tz.level_config,
            ...options.toZigbee,
            tz.light_color_options, tz.light_color_mode, ...(!options.disableEffect ? [tz.effect] : [])];
        const fromZigbee = [fz.color_colortemp, fz.on_off, fz.brightness, fz.level_config, fz.ignore_basic_report, ...options.fromZigbee];

        if (options.disableColorTempStartup) {
            exposes[0].removeFeature('color_temp_startup');
            toZigbee.splice(toZigbee.indexOf(tz.light_colortemp_startup), 1);
        }

        if (!options.disablePowerOnBehavior) {
            exposes.push(e.power_on_behavior(['off', 'on', 'toggle', 'previous']));
            fromZigbee.push(fz.power_on_behavior);
            toZigbee.push(tz.power_on_behavior);
        }

        const result: Extend = {exposes, fromZigbee, toZigbee};
        if (!options.noConfigure) {
            result.configure = async (device, coordinatorEndpoint, logger) => {
                await light.configure(device, coordinatorEndpoint, logger, true);
            };
        }

        return result;
    },
    light_onoff_brightness_color: (options: Extend.options_light_onoff_brightness_color={}): Extend => {
        options = {
            disableEffect: false, supportsHueAndSaturation: false, preferHueAndSaturation: false, disablePowerOnBehavior: false,
            toZigbee: [], fromZigbee: [], exposes: [], ...options,
        };
        const exposes = [(options.supportsHueAndSaturation ? e.light_brightness_color(options.preferHueAndSaturation) : e.light_brightness_colorxy()),
            ...(!options.disableEffect ? [e.effect()] : []), ...options.exposes];
        const fromZigbee = [fz.color_colortemp, fz.on_off, fz.brightness, fz.level_config, fz.ignore_basic_report, ...options.fromZigbee];
        const toZigbee = [tz.light_onoff_brightness, tz.light_color, tz.ignore_transition, tz.ignore_rate, tz.light_brightness_move,
            tz.light_brightness_step, tz.level_config, tz.light_hue_saturation_move, ...options.toZigbee,
            tz.light_hue_saturation_step, tz.light_color_options, tz.light_color_mode, ...(!options.disableEffect ? [tz.effect] : [])];
        const meta = {supportsHueAndSaturation: options.supportsHueAndSaturation};

        if (!options.disablePowerOnBehavior) {
            exposes.push(e.power_on_behavior(['off', 'on', 'toggle', 'previous']));
            fromZigbee.push(fz.power_on_behavior);
            toZigbee.push(tz.power_on_behavior);
        }

        const result: Extend = {exposes, fromZigbee, toZigbee, meta};
        if (!options.noConfigure) {
            result.configure = async (device, coordinatorEndpoint, logger) => {
                await light.configure(device, coordinatorEndpoint, logger, false);
            };
        }

        return result;
    },
    light_onoff_brightness_colortemp_color: (options: Extend.options_light_onoff_brightness_colortemp_color={}): Extend => {
        options = {
            disableEffect: false, supportsHueAndSaturation: false, disableColorTempStartup: false, preferHueAndSaturation: false,
            disablePowerOnBehavior: false, toZigbee: [], fromZigbee: [], exposes: [], ...options,
        };
        const exposes = [
            (options.supportsHueAndSaturation ? e.light_brightness_colortemp_color(options.colorTempRange, options.preferHueAndSaturation) :
                e.light_brightness_colortemp_colorxy(options.colorTempRange)), ...(!options.disableEffect ? [e.effect()] : []),
            ...options.exposes,
        ];
        const fromZigbee = [fz.color_colortemp, fz.on_off, fz.brightness, fz.level_config, fz.ignore_basic_report, ...options.fromZigbee];
        const toZigbee = [
            tz.light_onoff_brightness, tz.light_color_colortemp, tz.ignore_transition, tz.ignore_rate, tz.light_brightness_move,
            tz.light_colortemp_move, tz.light_brightness_step, tz.light_colortemp_step, tz.light_hue_saturation_move,
            tz.light_hue_saturation_step, tz.light_colortemp_startup, tz.level_config, tz.light_color_options,
            tz.light_color_mode, ...(!options.disableEffect ? [tz.effect] : []), ...options.toZigbee];
        const meta = {supportsHueAndSaturation: options.supportsHueAndSaturation};

        if (options.disableColorTempStartup) {
            exposes[0].removeFeature('color_temp_startup');
            toZigbee.splice(toZigbee.indexOf(tz.light_colortemp_startup), 1);
        }

        if (!options.disablePowerOnBehavior) {
            exposes.push(e.power_on_behavior(['off', 'on', 'toggle', 'previous']));
            fromZigbee.push(fz.power_on_behavior);
            toZigbee.push(tz.power_on_behavior);
        }

        const result: Extend = {exposes, fromZigbee, toZigbee, meta};
        if (!options.noConfigure) {
            result.configure = async (device, coordinatorEndpoint, logger) => {
                await light.configure(device, coordinatorEndpoint, logger, true);
            };
        }

        return result;
    },
};

export default extend;
module.exports = extend;
