'use strict';

/**
 * Documentation of 'meta'
 *
 * configureKey: required when a 'configure' is defined, this key is used by the application to determine if the
 *               content of the configure has been changed and thus needs to re-execute it. For a currently
 *               unsupported device you can set this to 1.
 * multiEndpoint: enables the multi endpoint functionallity in e.g. fromZigbee.on_off, example: normally this
 *                converter would return {"state": "OFF"}, when multiEndpoint is enabled the 'endpoint' method
 *                of the device definition will be called to determine the endpoint name which is then used as
 *                key e.g. {"state_left": "OFF"}. Only needed when device sends the same attribute from
 *                multiple endpoints.
 * disableDefaultResponse: used by toZigbee converters to disable the default response of some devices as they
 *                         don't provide one.
 * applyRedFix: see toZigbee.light_color
 * enhancedHue: see toZigbee.light_color
 * supportsHueAndSaturation: see toZigbee.light_color
 * timeout: timeout for commands to this device used in toZigbee.
 * coverInverted: Set to true for cover controls that report position=100 as open
 * turnsOffAtBrightness1: Indicates light turns off when brightness 1 is set
 * pinCodeCount: Amount of pincodes the lock can handle
 * disableActionGroup: Prevents some converters adding the action_group to the payload
 * tuyaThermostatSystemMode/tuyaThermostatPreset: TuYa specific thermostat options
 * thermostat: see e.g. HT-08 definition
 * battery:
 *    {dontDividePercentage: true}: prevents batteryPercentageRemainig from being divided (ZCL 200=100%, but some report 100=100%)
 *    {voltageToPercentage: '3V_2100'}: convert voltage to percentage using specified option. See utils.batteryVoltageToPercentage()
 */

const assert = require('assert');
const fz = {...require('./converters/fromZigbee'), legacy: require('./lib/legacy').fromZigbee};
const tz = require('./converters/toZigbee');
const utils = require('./lib/utils');
const globalStore = require('./lib/store');
const ota = require('./lib/ota');
const exposes = require('./lib/exposes');
const tuya = require('./lib/tuya');
const ikea = require('./lib/ikea');
const constants = require('./lib/constants');
const livolo = require('./lib/livolo');
const legrand = require('./lib/legrand');
const xiaomi = require('./lib/xiaomi');
const light = require('./lib/light');
const {repInterval, defaultBindGroup, OneJanuary2000} = require('./lib/constants');
const reporting = require('./lib/reporting');

const e = exposes.presets;
const ea = exposes.access;
const preset = {
    switch: (options={}) => {
        const exposes = [e.switch()];
        const fromZigbee = [fz.on_off, fz.ignore_basic_report];
        const toZigbee = [tz.on_off];
        return {exposes, fromZigbee, toZigbee};
    },
    light_onoff_brightness: (options={}) => {
        options = {disableEffect: false, ...options};
        const exposes = [e.light_brightness(), ...(!options.disableEffect ? [e.effect()] : [])];
        const fromZigbee = [fz.on_off, fz.brightness, fz.level_config, fz.power_on_behavior, fz.ignore_basic_report];
        const toZigbee = [tz.light_onoff_brightness, tz.ignore_transition, tz.ignore_rate, tz.light_brightness_move,
            tz.light_brightness_step, tz.level_config, tz.power_on_behavior, ...(!options.disableEffect ? [tz.effect] : [])];
        return {exposes, fromZigbee, toZigbee};
    },
    light_onoff_brightness_colortemp: (options={}) => {
        options = {disableEffect: false, disableColorTempStartup: false, ...options};
        const exposes = [e.light_brightness_colortemp(options.colorTempRange), ...(!options.disableEffect ? [e.effect()] : [])];
        const toZigbee = [tz.light_onoff_brightness, tz.light_colortemp, tz.ignore_transition, tz.ignore_rate, tz.light_brightness_move,
            tz.light_colortemp_move, tz.light_brightness_step, tz.light_colortemp_step, tz.light_colortemp_startup, tz.level_config,
            tz.power_on_behavior, tz.light_color_options, tz.light_color_mode, ...(!options.disableEffect ? [tz.effect] : [])];
        const fromZigbee = [fz.color_colortemp, fz.on_off, fz.brightness, fz.level_config, fz.power_on_behavior, fz.ignore_basic_report];

        if (options.disableColorTempStartup) {
            exposes[0].removeFeature('color_temp_startup');
            toZigbee.splice(toZigbee.indexOf(tz.light_colortemp_startup), 1);
        }

        return {
            exposes, fromZigbee, toZigbee, meta: {configureKey: 2},
            configure: async (device, coordinatorEndpoint, logger) => {
                await light.configure(device, coordinatorEndpoint, logger, true);
            },
        };
    },
    light_onoff_brightness_color: (options={}) => {
        options = {disableEffect: false, supportsHS: false, ...options};
        const exposes = [(options.supportsHS ? e.light_brightness_color() : e.light_brightness_colorxy()),
            ...(!options.disableEffect ? [e.effect()] : [])];
        const fromZigbee = [fz.color_colortemp, fz.on_off, fz.brightness, fz.level_config, fz.power_on_behavior, fz.ignore_basic_report];
        const toZigbee = [tz.light_onoff_brightness, tz.light_color, tz.ignore_transition, tz.ignore_rate, tz.light_brightness_move,
            tz.light_brightness_step, tz.level_config, tz.power_on_behavior, tz.light_hue_saturation_move,
            tz.light_hue_saturation_step, tz.light_color_options, tz.light_color_mode, ...(!options.disableEffect ? [tz.effect] : [])];

        return {
            exposes, fromZigbee, toZigbee, meta: {configureKey: 2},
            configure: async (device, coordinatorEndpoint, logger) => {
                await light.configure(device, coordinatorEndpoint, logger, false);
            },
        };
    },
    light_onoff_brightness_colortemp_color: (options={}) => {
        options = {disableEffect: false, supportsHS: false, disableColorTempStartup: false, ...options};
        const exposes = [(options.supportsHS ? e.light_brightness_colortemp_color(options.colorTempRange) :
            e.light_brightness_colortemp_colorxy(options.colorTempRange)), ...(!options.disableEffect ? [e.effect()] : [])];
        const fromZigbee = [fz.color_colortemp, fz.on_off, fz.brightness, fz.level_config, fz.power_on_behavior, fz.ignore_basic_report];
        const toZigbee = [
            tz.light_onoff_brightness, tz.light_color_colortemp, tz.ignore_transition, tz.ignore_rate, tz.light_brightness_move,
            tz.light_colortemp_move, tz.light_brightness_step, tz.light_colortemp_step, tz.light_hue_saturation_move,
            tz.light_hue_saturation_step, tz.light_colortemp_startup, tz.level_config, tz.power_on_behavior, tz.light_color_options,
            tz.light_color_mode, ...(!options.disableEffect ? [tz.effect] : [])];

        if (options.disableColorTempStartup) {
            exposes[0].removeFeature('color_temp_startup');
            toZigbee.splice(toZigbee.indexOf(tz.light_colortemp_startup), 1);
        }

        return {
            exposes, fromZigbee, toZigbee, meta: {configureKey: 2},
            configure: async (device, coordinatorEndpoint, logger) => {
                await light.configure(device, coordinatorEndpoint, logger, true);
            },
        };
    },
};
{
    preset.gledopto = {
        light_onoff_brightness: (options={}) => ({
            ...preset.light_onoff_brightness(options),
            toZigbee: utils.replaceInArray(
                preset.light_onoff_brightness(options).toZigbee,
                [tz.light_onoff_brightness],
                [tz.gledopto_light_onoff_brightness],
            ),
        }),
        light_onoff_brightness_colortemp: (options={}) => ({
            ...preset.light_onoff_brightness_colortemp(options),
            toZigbee: utils.replaceInArray(
                preset.light_onoff_brightness_colortemp(options).toZigbee,
                [tz.light_onoff_brightness, tz.light_colortemp],
                [tz.gledopto_light_onoff_brightness, tz.gledopto_light_colortemp],
            ),
        }),
        light_onoff_brightness_color: (options={}) => ({
            ...preset.light_onoff_brightness_color(options),
            toZigbee: utils.replaceInArray(
                preset.light_onoff_brightness_color(options).toZigbee,
                [tz.light_onoff_brightness, tz.light_color],
                [tz.gledopto_light_onoff_brightness, tz.gledopto_light_color],
            ),
        }),
        light_onoff_brightness_colortemp_color: (options={}) => ({
            ...preset.light_onoff_brightness_colortemp_color(options),
            toZigbee: utils.replaceInArray(
                preset.light_onoff_brightness_colortemp_color(options).toZigbee,
                [tz.light_onoff_brightness, tz.light_color_colortemp],
                [tz.gledopto_light_onoff_brightness, tz.gledopto_light_color_colortemp],
            ),
        }),
    };
    preset.hue = {
        light_onoff_brightness: (options={}) => ({
            ...preset.light_onoff_brightness(options),
            toZigbee: preset.light_onoff_brightness(options).toZigbee.concat([tz.hue_power_on_behavior, tz.hue_power_on_error]),
        }),
        light_onoff_brightness_colortemp: (options={}) => ({
            ...preset.light_onoff_brightness_colortemp(options),
            toZigbee: preset.light_onoff_brightness_colortemp(options).toZigbee.concat([tz.hue_power_on_behavior, tz.hue_power_on_error]),
        }),
        light_onoff_brightness_color: (options={}) => ({
            ...preset.light_onoff_brightness_color({supportsHS: true, ...options}),
            toZigbee: preset.light_onoff_brightness_color({supportsHS: true, ...options}).toZigbee
                .concat([tz.hue_power_on_behavior, tz.hue_power_on_error]),
        }),
        light_onoff_brightness_colortemp_color: (options={}) => ({
            ...preset.light_onoff_brightness_colortemp_color({supportsHS: true, ...options}),
            toZigbee: preset.light_onoff_brightness_colortemp_color({supportsHS: true, ...options})
                .toZigbee.concat([tz.hue_power_on_behavior, tz.hue_power_on_error]),
        }),
    };
    preset.ledvance = {
        light_onoff_brightness: (options={}) => ({
            ...preset.light_onoff_brightness(options),
            toZigbee: preset.light_onoff_brightness(options).toZigbee.concat([tz.ledvance_commands]),
        }),
        light_onoff_brightness_colortemp: (options={}) => ({
            ...preset.light_onoff_brightness_colortemp(options),
            toZigbee: preset.light_onoff_brightness_colortemp(options).toZigbee.concat([tz.ledvance_commands]),
        }),
        light_onoff_brightness_color: (options={}) => ({
            ...preset.light_onoff_brightness_color({supportsHS: true, ...options}),
            toZigbee: preset.light_onoff_brightness_color({supportsHS: true, ...options}).toZigbee.concat([tz.ledvance_commands]),
        }),
        light_onoff_brightness_colortemp_color: (options={}) => ({
            ...preset.light_onoff_brightness_colortemp_color({supportsHS: true, ...options}),
            toZigbee: preset.light_onoff_brightness_colortemp_color({supportsHS: true, ...options}).toZigbee.concat([tz.ledvance_commands]),
        }),
    };
    preset.xiaomi = {
        light_onoff_brightness_colortemp: (options={disableColorTempStartup: true}) => ({
            ...preset.light_onoff_brightness_colortemp(options),
            fromZigbee: preset.light_onoff_brightness_colortemp(options).fromZigbee.concat([
                fz.xiaomi_bulb_interval, fz.ignore_occupancy_report, fz.ignore_humidity_report,
                fz.ignore_pressure_report, fz.ignore_temperature_report,
            ]),
        }),
    };
}

const devices = [
    // Xiaomi
    {
        zigbeeModel: ['lumi.light.aqcn02'],
        model: 'ZNLDP12LM',
        vendor: 'Xiaomi',
        description: 'Aqara smart LED bulb',
        toZigbee: preset.xiaomi.light_onoff_brightness_colortemp().toZigbee.concat([
            tz.xiaomi_light_power_outage_memory]),
        fromZigbee: preset.xiaomi.light_onoff_brightness_colortemp().fromZigbee,
        // power_on_behavior 'toggle' does not seem to be supported
        exposes: preset.xiaomi.light_onoff_brightness_colortemp().exposes.concat([
            e.power_outage_memory()]),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.light.cwopcn02'],
        model: 'XDD12LM',
        vendor: 'Xiaomi',
        description: 'Aqara Opple MX650',
        extend: preset.xiaomi.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.light.cwopcn03'],
        model: 'XDD13LM',
        vendor: 'Xiaomi',
        description: 'Aqara Opple MX480',
        extend: preset.xiaomi.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.light.cwjwcn01'],
        model: 'JWSP001A',
        vendor: 'Xiaomi',
        description: 'Aqara embedded spot led light',
        extend: preset.xiaomi.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['lumi.light.cwjwcn02'],
        model: 'JWDL001A',
        vendor: 'Xiaomi',
        description: 'Aqara embedded spot led light',
        extend: preset.xiaomi.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['lumi.sensor_switch'],
        model: 'WXKG01LM',
        vendor: 'Xiaomi',
        description: 'MiJia wireless switch',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.xiaomi_battery, fz.xiaomi_WXKG01LM_action, fz.legacy.WXKG01LM_click],
        exposes: [e.battery(), e.action(['single', 'double', 'triple', 'quadruple', 'hold', 'release', 'many']), e.battery_voltage()],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_switch.aq2', 'lumi.remote.b1acn01'],
        model: 'WXKG11LM',
        vendor: 'Xiaomi',
        description: 'Aqara wireless switch',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        exposes: [e.battery(), e.battery_voltage(), e.action(['single', 'double', 'triple', 'quadruple', 'hold', 'release'])],
        fromZigbee: [fz.xiaomi_multistate_action, fz.xiaomi_WXKG11LM_action, fz.xiaomi_battery,
            fz.legacy.WXKG11LM_click, fz.legacy.xiaomi_action_click_multistate],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_switch.aq3', 'lumi.sensor_swit'],
        model: 'WXKG12LM',
        vendor: 'Xiaomi',
        description: 'Aqara wireless switch (with gyroscope)',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        exposes: [e.battery(), e.action(['single', 'double', 'hold', 'release', 'shake']), e.battery_voltage()],
        fromZigbee: [fz.xiaomi_battery, fz.xiaomi_multistate_action, fz.legacy.WXKG12LM_action_click_multistate],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_86sw1'],
        model: 'WXKG03LM_rev1',
        vendor: 'Xiaomi',
        description: 'Aqara single key wireless wall switch (2016 model)',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        exposes: [e.battery(), e.action(['single']), e.battery_voltage()],
        fromZigbee: [fz.xiaomi_on_off_action, fz.xiaomi_battery, fz.legacy.WXKG03LM_click],
        toZigbee: [],
        onEvent: xiaomi.preventReset,
    },
    {
        zigbeeModel: ['lumi.remote.b186acn01'],
        model: 'WXKG03LM_rev2',
        vendor: 'Xiaomi',
        description: 'Aqara single key wireless wall switch (2018 model)',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        exposes: [e.battery(), e.action(['single', 'double', 'hold']), e.battery_voltage()],
        fromZigbee: [fz.xiaomi_on_off_action, fz.xiaomi_multistate_action, fz.xiaomi_battery,
            fz.legacy.WXKG03LM_click, fz.legacy.xiaomi_action_click_multistate],
        toZigbee: [],
        onEvent: xiaomi.preventReset,
    },
    {
        zigbeeModel: ['lumi.remote.b186acn02'],
        model: 'WXKG06LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 single key wireless wall switch',
        fromZigbee: [fz.xiaomi_battery, fz.xiaomi_on_off_action, fz.xiaomi_multistate_action],
        toZigbee: [],
        exposes: [e.battery(),
            e.action(['single', 'double', 'hold']),
            e.battery_voltage()],
        onEvent: xiaomi.preventReset,
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.endpoints[1];
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
        },
    },
    {
        zigbeeModel: ['lumi.sensor_86sw2', 'lumi.sensor_86sw2.es1'],
        model: 'WXKG02LM_rev1',
        vendor: 'Xiaomi',
        description: 'Aqara double key wireless wall switch (2016 model)',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        exposes: [e.battery(), e.action(['single_left', 'single_right', 'single_both']), e.battery_voltage()],
        fromZigbee: [fz.xiaomi_on_off_action, fz.xiaomi_battery, fz.legacy.WXKG02LM_click],
        toZigbee: [],
        onEvent: xiaomi.preventReset,
    },
    {
        zigbeeModel: ['lumi.remote.b286acn01'],
        model: 'WXKG02LM_rev2',
        vendor: 'Xiaomi',
        description: 'Aqara double key wireless wall switch (2018 model)',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        exposes: [e.battery(), e.action(['single_left', 'single_right', 'single_both', 'double_left', 'double_right', 'double_both',
            'hold_left', 'hold_right', 'hold_both']), e.battery_voltage()],
        fromZigbee: [fz.xiaomi_on_off_action, fz.xiaomi_multistate_action, fz.xiaomi_battery,
            fz.legacy.WXKG02LM_click, fz.legacy.WXKG02LM_click_multistate],
        toZigbee: [],
        onEvent: xiaomi.preventReset,
    },
    {
        zigbeeModel: ['lumi.switch.b1laus01'],
        model: 'WS-USC01',
        vendor: 'Xiaomi',
        description: 'Aqara smart wall switch (no neutral, single rocker)',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['lumi.switch.b2laus01'],
        model: 'WS-USC02',
        vendor: 'Xiaomi',
        description: 'Aqara smart wall switch (no neutral, double rocker)',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('bottom')],
        meta: {multiEndpoint: true, configureKey: 1},
        endpoint: (device) => {
            return {'top': 1, 'bottom': 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint2);
        },
    },
    {
        zigbeeModel: ['lumi.switch.b1naus01'],
        model: 'WS-USC03',
        vendor: 'Xiaomi',
        description: 'Aqara smart wall switch (neutral, single rocker)',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['lumi.switch.b2naus01'],
        model: 'WS-USC04',
        vendor: 'Xiaomi',
        description: 'Aqara smart wall switch (neutral, double rocker)',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('bottom')],
        meta: {multiEndpoint: true, configureKey: 1},
        endpoint: (device) => {
            return {'top': 1, 'bottom': 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint2);
        },
    },
    {
        zigbeeModel: ['lumi.ctrl_neutral1'],
        model: 'QBKG04LM',
        vendor: 'Xiaomi',
        description: 'Aqara single key wired wall switch without neutral wire. Doesn\'t work as a router and doesn\'t support power meter',
        fromZigbee: [fz.xiaomi_on_off_ignore_endpoint_4_5_6, fz.xiaomi_on_off_action, fz.legacy.QBKG04LM_QBKG11LM_click,
            fz.xiaomi_operation_mode_basic],
        exposes: [e.switch(), e.action(['single', 'release', 'hold'])],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode],
        endpoint: (device) => {
            return {'system': 1, 'default': 2};
        },
        onEvent: xiaomi.preventReset,
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.ctrl_ln1.aq1', 'lumi.ctrl_ln1'],
        model: 'QBKG11LM',
        vendor: 'Xiaomi',
        description: 'Aqara single key wired wall switch',
        fromZigbee: [fz.xiaomi_on_off_action, fz.xiaomi_multistate_action, fz.xiaomi_on_off_ignore_endpoint_4_5_6,
            fz.legacy.QBKG04LM_QBKG11LM_click, fz.xiaomi_switch_basic, fz.xiaomi_operation_mode_basic,
            fz.legacy.QBKG11LM_click, fz.ignore_multistate_report, fz.xiaomi_power],
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.temperature(), e.action(['single', 'double', 'release', 'hold'])],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode, tz.xiaomi_power],
        endpoint: (device) => {
            return {'system': 1};
        },
        onEvent: xiaomi.preventReset,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.ctrl_neutral2'],
        model: 'QBKG03LM',
        vendor: 'Xiaomi',
        description: 'Aqara double key wired wall switch without neutral wire. Doesn\'t work as a router and doesn\'t support power meter',
        fromZigbee: [fz.xiaomi_on_off_action, fz.xiaomi_on_off_ignore_endpoint_4_5_6, fz.legacy.QBKG03LM_QBKG12LM_click,
            fz.legacy.QBKG03LM_buttons, fz.xiaomi_operation_mode_basic, fz.xiaomi_switch_basic],
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'), e.temperature(), e.action([
            'single_left', 'single_right', 'single_both'])],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode, tz.xiaomi_power],
        meta: {multiEndpoint: true, configureKey: 1},
        endpoint: (device) => {
            return {'system': 1, 'left': 2, 'right': 3};
        },
        onEvent: xiaomi.preventReset,
        configure: async (device, coordinatorEndpoint, logger) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.ctrl_ln2.aq1', 'lumi.ctrl_ln2'],
        model: 'QBKG12LM',
        vendor: 'Xiaomi',
        description: 'Aqara double key wired wall switch',
        fromZigbee: [fz.xiaomi_on_off_action, fz.xiaomi_multistate_action, fz.xiaomi_on_off_ignore_endpoint_4_5_6,
            fz.legacy.QBKG03LM_QBKG12LM_click, fz.xiaomi_switch_basic, fz.xiaomi_operation_mode_basic, fz.legacy.QBKG12LM_click,
            fz.xiaomi_power],
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'), e.temperature(), e.power().withAccess(ea.STATE_GET),
            e.action(['single_left', 'single_right', 'single_both', 'double_left', 'double_right', 'double_both',
                'hold_left', 'hold_right', 'hold_both', 'release_left', 'release_right', 'release_both'])],
        meta: {multiEndpoint: true},
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode, tz.xiaomi_power],
        endpoint: (device) => {
            return {'left': 1, 'right': 2, 'system': 1};
        },
        onEvent: xiaomi.preventReset,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.remote.b286acn02'],
        model: 'WXKG07LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 double key wireless wall switch',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.xiaomi_battery, fz.legacy.xiaomi_on_off_action, fz.legacy.xiaomi_multistate_action],
        toZigbee: [],
        endpoint: (device) => {
            return {left: 1, right: 2, both: 3};
        },
        exposes: [e.battery(), e.battery_voltage(), e.action([
            'single_left', 'single_right', 'single_both',
            'double_left', 'double_right', 'double_both',
            'hold_left', 'hold_right', 'hold_both'])],
        onEvent: xiaomi.preventReset,
    },
    {
        zigbeeModel: ['lumi.switch.b1lacn02'],
        model: 'QBKG21LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 single gang smart wall switch (no neutral wire)',
        fromZigbee: [fz.xiaomi_on_off_ignore_endpoint_4_5_6, fz.xiaomi_on_off_action, fz.legacy.QBKG04LM_QBKG11LM_click,
            fz.xiaomi_operation_mode_basic],
        exposes: [e.switch(), e.action(['single', 'hold', 'release'])],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode],
        endpoint: (device) => {
            return {'system': 1, 'default': 2};
        },
        onEvent: xiaomi.preventReset,
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.switch.b2lacn02'],
        model: 'QBKG22LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 2 gang smart wall switch (no neutral wire)',
        fromZigbee: [fz.xiaomi_on_off_ignore_endpoint_4_5_6, fz.xiaomi_on_off_action, fz.legacy.QBKG03LM_QBKG12LM_click,
            fz.legacy.QBKG03LM_buttons, fz.xiaomi_operation_mode_basic],
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'), e.action(['single'])],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode],
        meta: {multiEndpoint: true, configureKey: 1},
        endpoint: (device) => {
            return {'system': 1, 'left': 2, 'right': 3};
        },
        onEvent: xiaomi.preventReset,
        configure: async (device, coordinatorEndpoint, logger) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.switch.l3acn3'],
        model: 'QBKG25LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 3 gang smart wall switch (no neutral wire)',
        fromZigbee: [fz.on_off, fz.legacy.QBKG25LM_click, fz.xiaomi_operation_mode_opple],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode, tz.xiaomi_switch_power_outage_memory, tz.xiaomi_switch_do_not_disturb],
        meta: {multiEndpoint: true, configureKey: 1},
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        exposes: [e.switch().withEndpoint('left'), e.power_outage_memory(), e.switch().withEndpoint('center'),
            e.switch().withEndpoint('right'), e.action([
                'left_single', 'left_double', 'left_triple', 'left_hold', 'left_release',
                'center_single', 'center_double', 'center_triple', 'center_hold', 'center_release',
                'right_single', 'right_double', 'right_triple', 'right_hold', 'right_release'])],
        onEvent: xiaomi.preventReset,
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
            await reporting.onOff(device.getEndpoint(3));
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.switch.n3acn3'],
        model: 'QBKG26LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 3 gang smart wall switch (with neutral wire)',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('center'), e.switch().withEndpoint('right'), e.action([
            'hold_left', 'single_left', 'double_left', 'triple_left', 'release_left',
            'hold_center', 'single_center', 'double_center', 'triple_center', 'release_center',
            'hold_right', 'single_right', 'double_right', 'triple_right', 'release_right'])],
        fromZigbee: [fz.on_off, fz.xiaomi_operation_mode_opple, fz.xiaomi_multistate_action],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode],
        meta: {configureKey: 1, multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3, 'system': 1};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
            await reporting.onOff(device.getEndpoint(3));
        },
        onEvent: xiaomi.preventReset,
    },
    {
        zigbeeModel: ['lumi.switch.b1nacn02'],
        model: 'QBKG23LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 1 gang smart wall switch (with neutral wire)',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.xiaomi_switch_basic, fz.xiaomi_multistate_action],
        toZigbee: [tz.on_off, tz.xiaomi_power, tz.xiaomi_switch_operation_mode],
        meta: {},
        endpoint: (device) => {
            return {'system': 1};
        },
        onEvent: xiaomi.preventReset,
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(), e.temperature().withAccess(ea.STATE),
            e.voltage().withAccess(ea.STATE), e.action(['single', 'release'])],
    },
    {
        zigbeeModel: ['lumi.switch.b2nacn02'],
        model: 'QBKG24LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 2 gang smart wall switch (with neutral wire)',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.xiaomi_multistate_action],
        toZigbee: [tz.on_off, tz.xiaomi_power, tz.xiaomi_switch_operation_mode],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'right': 2, 'system': 1};
        },
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'), e.power().withAccess(ea.STATE_GET), e.action([
            'hold_left', 'single_left', 'double_left', 'release_left', 'hold_right', 'single_right',
            'double_right', 'release_right', 'hold_both', 'single_both', 'double_both', 'release_both'])],
        onEvent: xiaomi.preventReset,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.sens', 'lumi.sensor_ht'],
        model: 'WSDCGQ01LM',
        vendor: 'Xiaomi',
        description: 'MiJia temperature & humidity sensor',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.xiaomi_battery, fz.WSDCGQ01LM_WSDCGQ11LM_interval, fz.xiaomi_temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['lumi.weather'],
        model: 'WSDCGQ11LM',
        vendor: 'Xiaomi',
        description: 'Aqara temperature, humidity and pressure sensor',
        meta: {battery: {voltageToPercentage: '3V_2100'}, configureKey: 1},
        fromZigbee: [fz.xiaomi_battery, fz.xiaomi_temperature, fz.humidity, fz.WSDCGQ11LM_pressure, fz.WSDCGQ01LM_WSDCGQ11LM_interval],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.pressure(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            device.powerSource = 'Battery';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.sensor_ht.agl02'],
        model: 'WSDCGQ12LM',
        vendor: 'Xiaomi',
        description: 'Aqara T1 temperature, humidity and pressure sensor',
        fromZigbee: [fz.xiaomi_battery, fz.temperature, fz.humidity, fz.pressure],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
        },
        exposes: [e.battery(), e.temperature(), e.humidity(), e.pressure(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['lumi.sensor_motion'],
        model: 'RTCGQ01LM',
        vendor: 'Xiaomi',
        description: 'MiJia human body movement sensor',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.xiaomi_battery, fz.occupancy_with_timeout],
        toZigbee: [],
        exposes: [e.battery(), e.occupancy(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['lumi.sensor_motion.aq2'],
        model: 'RTCGQ11LM',
        vendor: 'Xiaomi',
        description: 'Aqara human body movement and illuminance sensor',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.xiaomi_battery, fz.occupancy_with_timeout, fz.RTCGQ11LM_illuminance, fz.RTCGQ11LM_interval],
        toZigbee: [],
        exposes: [e.battery(), e.occupancy(), e.temperature(), e.battery_voltage(), e.illuminance_lux().withProperty('illuminance'),
            e.illuminance().withUnit('lx').withDescription('Measured illuminance in lux')],
    },
    {
        zigbeeModel: ['lumi.motion.agl02'],
        model: 'RTCGQ12LM',
        vendor: 'Xiaomi',
        description: 'Aqara T1 human body movement and illuminance sensor (illuminance not supported for now)',
        fromZigbee: [fz.occupancy, fz.occupancy_timeout, fz.battery],
        toZigbee: [tz.occupancy_timeout],
        exposes: [e.occupancy(), e.battery(),
            exposes.numeric('occupancy_timeout', exposes.access.ALL).withValueMin(0).withValueMax(65535).withUnit('s')
                .withDescription('Time in seconds till occupancy goes to false')],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'msOccupancySensing']);
            await reporting.occupancy(endpoint);
            await reporting.batteryVoltage(endpoint);
            await endpoint.read('msOccupancySensing', ['pirOToUDelay']);
        },
    },
    {
        zigbeeModel: ['lumi.motion.agl04'],
        model: 'RTCGQ13LM',
        vendor: 'Xiaomi',
        description: 'Aqara high precision motion sensor',
        fromZigbee: [fz.occupancy, fz.occupancy_timeout, fz.RTCGQ13LM_motion_sensitivity, fz.battery],
        toZigbee: [tz.occupancy_timeout, tz.RTCGQ13LM_motion_sensitivity],
        exposes: [e.occupancy(), exposes.enum('motion_sensitivity', exposes.access.ALL, ['low', 'medium', 'high']),
            exposes.numeric('occupancy_timeout', exposes.access.ALL).withValueMin(0).withValueMax(65535).withUnit('s')
                .withDescription('Time in seconds till occupancy goes to false'), e.battery()],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'msOccupancySensing']);
            await reporting.occupancy(endpoint);
            await reporting.batteryVoltage(endpoint);
            await endpoint.read('msOccupancySensing', ['pirOToUDelay']);
            await endpoint.read('aqaraOpple', [0x010c], {manufacturerCode: 0x115f});
        },
    },
    {
        zigbeeModel: ['lumi.sensor_magnet'],
        model: 'MCCGQ01LM',
        vendor: 'Xiaomi',
        description: 'MiJia door & window contact sensor',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.xiaomi_battery, fz.xiaomi_contact],
        toZigbee: [],
        exposes: [e.battery(), e.contact(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['lumi.sensor_magnet.aq2'],
        model: 'MCCGQ11LM',
        vendor: 'Xiaomi',
        description: 'Aqara door & window contact sensor',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.xiaomi_battery, fz.xiaomi_contact, fz.xiaomi_contact_interval],
        toZigbee: [],
        exposes: [e.battery(), e.contact(), e.temperature(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['lumi.sensor_wleak.aq1'],
        model: 'SJCGQ11LM',
        vendor: 'Xiaomi',
        description: 'Aqara water leak sensor',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.xiaomi_battery, fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.battery(), e.water_leak(), e.battery_low(), e.tamper(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['lumi.flood.agl02'],
        model: 'SJCGQ12LM',
        vendor: 'Xiaomi',
        description: 'Aqara T1 water leak sensor',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.xiaomi_battery, fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.battery(), e.water_leak(), e.battery_low(), e.tamper(), e.battery_voltage()],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.sensor_cube', 'lumi.sensor_cube.aqgl01'],
        model: 'MFKZQ01LM',
        vendor: 'Xiaomi',
        description: 'Mi/Aqara smart home cube',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.xiaomi_battery, fz.MFKZQ01LM_action_multistate, fz.MFKZQ01LM_action_analog],
        exposes: [e.battery(), e.battery_voltage(), e.angle('action_angle'),
            e.cube_side('action_from_side'), e.cube_side('action_side'), e.cube_side('action_to_side'),
            e.action(['shake', 'wakeup', 'fall', 'tap', 'slide', 'flip180', 'flip90', 'rotate_left', 'rotate_right'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.plug'],
        model: 'ZNCZ02LM',
        description: 'Mi power plug ZigBee',
        vendor: 'Xiaomi',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.xiaomi_switch_basic, fz.ignore_occupancy_report, fz.ignore_illuminance_report],
        toZigbee: [tz.on_off, tz.xiaomi_switch_power_outage_memory, tz.xiaomi_power],
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(), e.temperature(), e.power_outage_memory()],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.plug.mitw01'],
        model: 'ZNCZ03LM',
        description: 'Mi power plug ZigBee TW',
        vendor: 'Xiaomi',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.xiaomi_switch_basic, fz.ignore_occupancy_report, fz.ignore_illuminance_report],
        toZigbee: [tz.on_off, tz.xiaomi_power],
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(), e.temperature().withAccess(ea.STATE),
            e.voltage().withAccess(ea.STATE)],
    },
    {
        zigbeeModel: ['lumi.plug.mmeu01'],
        model: 'ZNCZ04LM',
        description: 'Mi power plug ZigBee EU',
        vendor: 'Xiaomi',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.xiaomi_switch_opple_basic, fz.ignore_occupancy_report, fz.ignore_illuminance_report,
            fz.ignore_time_read],
        toZigbee: [tz.on_off, tz.xiaomi_power, tz.xiaomi_switch_power_outage_memory, tz.xiaomi_auto_off, tz.xiaomi_led_disabled_night],
        exposes: [
            e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(), e.temperature().withAccess(ea.STATE),
            e.voltage().withAccess(ea.STATE), e.current(), e.consumer_connected(), e.consumer_overload(), e.led_disabled_night(),
            e.power_outage_memory(), exposes.binary('auto_off', ea.STATE_SET, true, false)
                .withDescription('Turn the device automatically off when attached device consumes less than 2W for 20 minutes'),
        ],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.plug.maus01'],
        model: 'ZNCZ12LM',
        description: 'Mi power plug ZigBee US',
        vendor: 'Xiaomi',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.xiaomi_switch_basic, fz.ignore_occupancy_report, fz.ignore_illuminance_report],
        toZigbee: [tz.on_off, tz.xiaomi_power],
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(), e.temperature().withAccess(ea.STATE),
            e.voltage().withAccess(ea.STATE)],
    },
    {
        zigbeeModel: ['lumi.plug.maeu01'],
        model: 'SP-EUC01',
        description: 'Aqara EU smart plug',
        vendor: 'Xiaomi',
        fromZigbee: [fz.on_off, fz.xiaomi_switch_basic, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            try {
                await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
                await reporting.activePower(endpoint);
            } catch (e) {
                // Not all plugs support this.
                // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1050#issuecomment-673111969
            }

            // Voltage/current doesn't seem to be supported, maybe in futurue revisions of the device (?).
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1050
        },
        exposes: [e.switch(), e.power(), e.energy(), e.temperature().withAccess(ea.STATE), e.voltage().withAccess(ea.STATE), e.current()],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.ctrl_86plug', 'lumi.ctrl_86plug.aq1'],
        model: 'QBCZ11LM',
        description: 'Aqara socket Zigbee',
        vendor: 'Xiaomi',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.xiaomi_switch_basic],
        toZigbee: [tz.on_off, tz.xiaomi_switch_power_outage_memory, tz.xiaomi_power],
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(), e.temperature().withAccess(ea.STATE),
            e.voltage().withAccess(ea.STATE), e.power_outage_memory()],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.sensor_smoke'],
        model: 'JTYJ-GD-01LM/BW',
        description: 'MiJia Honeywell smoke detector',
        vendor: 'Xiaomi',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.xiaomi_battery, fz.ias_smoke_alarm_1, fz.JTYJGD01LMBW_smoke_density],
        toZigbee: [tz.JTQJBF01LMBW_JTYJGD01LMBW_sensitivity, tz.JTQJBF01LMBW_JTYJGD01LMBW_selfest],
        exposes: [
            e.smoke(), e.battery_low(), e.tamper(), e.battery(), exposes.enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high']),
            exposes.numeric('smoke_density', ea.STATE), exposes.enum('selftest', ea.SET, ['']), e.battery_voltage(),
        ],
    },
    {
        zigbeeModel: ['lumi.sensor_natgas'],
        model: 'JTQJ-BF-01LM/BW',
        vendor: 'Xiaomi',
        description: 'MiJia gas leak detector ',
        fromZigbee: [fz.ias_gas_alarm_1, fz.JTQJBF01LMBW_sensitivity, fz.JTQJBF01LMBW_gas_density],
        toZigbee: [tz.JTQJBF01LMBW_JTYJGD01LMBW_sensitivity, tz.JTQJBF01LMBW_JTYJGD01LMBW_selfest],
        exposes: [
            e.gas(), e.battery_low(), e.tamper(), exposes.enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high']),
            exposes.numeric('gas_density', ea.STATE), exposes.enum('selftest', ea.SET, ['']),
        ],
    },
    {
        zigbeeModel: ['lumi.lock.v1'],
        model: 'A6121',
        vendor: 'Xiaomi',
        description: 'Vima Smart Lock',
        fromZigbee: [fz.xiaomi_lock_report],
        exposes: [exposes.text('inserted', ea.STATE)],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.vibration.aq1'],
        model: 'DJT11LM',
        vendor: 'Xiaomi',
        description: 'Aqara vibration sensor',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.xiaomi_battery, fz.DJT11LM_vibration],
        toZigbee: [tz.DJT11LM_vibration_sensitivity],
        exposes: [
            e.battery(), e.action(['vibration', 'tilt', 'drop']), exposes.numeric('strength', ea.STATE),
            exposes.enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high']), e.battery_voltage(),
        ],
    },
    {
        zigbeeModel: ['lumi.vibration.agl01'],
        model: 'DJT12LM',
        vendor: 'Xiaomi',
        description: 'Aqara T1 vibration sensor',
        fromZigbee: [fz.DJT12LM_vibration],
        exposes: [e.action(['vibration'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.curtain', 'lumi.curtain.aq2'],
        model: 'ZNCLDJ11LM',
        description: 'Aqara curtain motor',
        vendor: 'Xiaomi',
        fromZigbee: [fz.xiaomi_curtain_position, fz.cover_position_tilt, fz.xiaomi_curtain_options],
        toZigbee: [tz.xiaomi_curtain_position_state, tz.xiaomi_curtain_options],
        exposes: [e.cover_position().setAccess('state', ea.ALL)],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.curtain.hagl04'],
        model: 'ZNCLDJ12LM',
        vendor: 'Xiaomi',
        description: 'Aqara B1 curtain motor ',
        fromZigbee: [fz.xiaomi_curtain_position, fz.battery, fz.cover_position_tilt, fz.ignore_basic_report, fz.xiaomi_curtain_options],
        toZigbee: [tz.xiaomi_curtain_position_state, tz.xiaomi_curtain_options],
        onEvent: async (type, data, device) => {
            // The position (genAnalogOutput.presentValue) reported via an attribute contains an invaid value
            // however when reading it will provide the correct value.
            if (data.type === 'attributeReport' && data.cluster === 'genAnalogOutput') {
                await device.endpoints[0].read('genAnalogOutput', ['presentValue']);
            }
        },
        exposes: [e.cover_position().setAccess('state', ea.ALL), e.battery()],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.endpoints[0];
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.relay.c2acn01'],
        model: 'LLKZMK11LM',
        vendor: 'Xiaomi',
        description: 'Aqara wireless relay controller',
        fromZigbee: [fz.xiaomi_switch_basic, fz.xiaomi_power, fz.ignore_multistate_report, fz.on_off],
        meta: {multiEndpoint: true},
        toZigbee: [tz.on_off, tz.LLKZMK11LM_interlock, tz.xiaomi_power],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        exposes: [e.power().withAccess(ea.STATE_GET), e.energy(), e.temperature(), e.voltage().withAccess(ea.STATE),
            e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'),
            exposes.binary('interlock', ea.STATE_SET, true, false)
                .withDescription('Enabling prevents both relais being on at the same time')],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.lock.acn02'],
        model: 'ZNMS12LM',
        description: 'Aqara S2 lock',
        vendor: 'Xiaomi',
        fromZigbee: [fz.ZNMS12LM_ZNMS13LM_closuresDoorLock_report, fz.ZNMS12LM_low_battery, fz.xiaomi_battery],
        toZigbee: [],
        exposes: [
            e.battery(), e.battery_voltage(), e.battery_low(), exposes.binary('state', ea.STATE, 'UNLOCK', 'LOCK'),
            exposes.binary('reverse', ea.STATE, 'UNLOCK', 'LOCK'),
            exposes.enum('action', ea.STATE, [
                'finger_not_match', 'password_not_match', 'reverse_lock', 'reverse_lock_cancel', 'locked', 'lock_opened',
                'finger_add', 'finger_delete', 'password_add', 'password_delete', 'lock_opened_inside', 'lock_opened_outside',
                'ring_bell', 'change_language_to', 'finger_open', 'password_open', 'door_closed',
            ]),
        ],
        meta: {configureKey: 1, battery: {voltageToPercentage: '4LR6AA1_5v'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.lock.acn03'],
        model: 'ZNMS13LM',
        description: 'Aqara S2 lock pro',
        vendor: 'Xiaomi',
        fromZigbee: [fz.ZNMS12LM_ZNMS13LM_closuresDoorLock_report, fz.ignore_basic_report],
        toZigbee: [],
        meta: {configureKey: 1},
        exposes: [
            exposes.binary('state', ea.STATE, 'UNLOCK', 'LOCK'),
            exposes.binary('reverse', ea.STATE, 'UNLOCK', 'LOCK'),
            exposes.enum('action', ea.STATE, [
                'finger_not_match', 'password_not_match', 'reverse_lock', 'reverse_lock_cancel', 'locked', 'lock_opened',
                'finger_add', 'finger_delete', 'password_add', 'password_delete', 'lock_opened_inside', 'lock_opened_outside',
                'ring_bell', 'change_language_to', 'finger_open', 'password_open', 'door_closed',
            ]),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.lock.aq1'],
        model: 'ZNMS11LM',
        description: 'Xiaomi Aqara smart lock',
        vendor: 'Xiaomi',
        fromZigbee: [fz.ZNMS11LM_closuresDoorLock_report, fz.ignore_basic_report],
        toZigbee: [],
        exposes: [
            exposes.binary('state', ea.STATE, 'UNLOCK', 'LOCK'),
            exposes.binary('reverse', ea.STATE, 'UNLOCK', 'LOCK'),
            exposes.enum('action', ea.STATE, [
                'finger_not_match', 'password_not_match', 'reverse_lock', 'reverse_lock_cancel', 'locked', 'lock_opened',
                'finger_add', 'finger_delete', 'password_add', 'password_delete', 'lock_opened_inside', 'lock_opened_outside',
                'ring_bell', 'change_language_to', 'finger_open', 'password_open', 'door_closed',
            ]),
        ],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['lumi.remote.b286opcn01'],
        model: 'WXCJKG11LM',
        vendor: 'Xiaomi',
        description: 'Aqara Opple switch 1 band',
        fromZigbee: [fz.aqara_opple_on, fz.aqara_opple_off, fz.battery, fz.aqara_opple_multistate, fz.aqara_opple_report],
        exposes: [e.battery(), e.action([
            'button_1_hold', 'button_1_release', 'button_1_single', 'button_1_double', 'button_1_triple',
            'button_2_hold', 'button_2_release', 'button_2_single', 'button_2_double', 'button_2_triple',
        ]), exposes.enum('operation_mode', ea.ALL, ['command', 'event'])
            .withDescription('Operation mode, select "command" to enable bindings (wake up the device before changing modes!)')],
        toZigbee: [tz.aqara_opple_operation_mode],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f});
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
        },
    },
    {
        zigbeeModel: ['lumi.remote.b486opcn01'],
        model: 'WXCJKG12LM',
        vendor: 'Xiaomi',
        description: 'Aqara Opple switch 2 bands',
        fromZigbee: [fz.aqara_opple_on, fz.aqara_opple_off, fz.aqara_opple_step, fz.aqara_opple_step_color_temp, fz.battery,
            fz.aqara_opple_multistate, fz.aqara_opple_report],
        exposes: [e.battery(), e.action([
            'button_1_hold', 'button_1_release', 'button_1_single', 'button_1_double', 'button_1_triple',
            'button_2_hold', 'button_2_release', 'button_2_single', 'button_2_double', 'button_2_triple',
            'button_3_hold', 'button_3_release', 'button_3_single', 'button_3_double', 'button_3_triple',
            'button_4_hold', 'button_4_release', 'button_4_single', 'button_4_double', 'button_4_triple',
        ]), exposes.enum('operation_mode', ea.ALL, ['command', 'event'])
            .withDescription('Operation mode, select "command" to enable bindings (wake up the device before changing modes!)')],
        toZigbee: [tz.aqara_opple_operation_mode],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f});
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genOnOff', 'genLevelCtrl', 'lightingColorCtrl', 'genPowerCfg',
            ]);
        },
    },
    {
        zigbeeModel: ['lumi.remote.b686opcn01'],
        model: 'WXCJKG13LM',
        vendor: 'Xiaomi',
        description: 'Aqara Opple switch 3 bands',
        fromZigbee: [fz.aqara_opple_on, fz.aqara_opple_off, fz.aqara_opple_step, fz.aqara_opple_move, fz.aqara_opple_stop,
            fz.aqara_opple_step_color_temp, fz.aqara_opple_move_color_temp, fz.battery, fz.aqara_opple_multistate, fz.aqara_opple_report],
        exposes: [e.battery(), e.action([
            'button_1_hold', 'button_1_release', 'button_1_single', 'button_1_double', 'button_1_triple',
            'button_2_hold', 'button_2_release', 'button_2_single', 'button_2_double', 'button_2_triple',
            'button_3_hold', 'button_3_release', 'button_3_single', 'button_3_double', 'button_3_triple',
            'button_4_hold', 'button_4_release', 'button_4_single', 'button_4_double', 'button_4_triple',
            'button_5_hold', 'button_5_release', 'button_5_single', 'button_5_double', 'button_5_triple',
            'button_6_hold', 'button_6_release', 'button_6_single', 'button_6_double', 'button_6_triple',
        ]), exposes.enum('operation_mode', ea.ALL, ['command', 'event'])
            .withDescription('Operation mode, select "command" to enable bindings (wake up the device before changing modes!)')],
        toZigbee: [tz.aqara_opple_operation_mode],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f});
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genOnOff', 'genLevelCtrl', 'lightingColorCtrl', 'genPowerCfg',
            ]);
        },
    },
    {
        zigbeeModel: ['lumi.sen_ill.mgl01'],
        model: 'GZCGQ01LM',
        vendor: 'Xiaomi',
        description: 'MiJia light intensity sensor',
        fromZigbee: [fz.battery, fz.illuminance],
        toZigbee: [],
        meta: {configureKey: 2, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'msIlluminanceMeasurement']);
            await reporting.batteryVoltage(endpoint);
            await reporting.illuminance(endpoint, {min: 15, max: repInterval.HOUR, change: 500});
        },
        exposes: [e.battery(), e.illuminance(), e.illuminance_lux()],
    },
    {
        zigbeeModel: ['lumi.light.rgbac1'],
        model: 'ZNTGMK11LM',
        vendor: 'Xiaomi',
        description: 'Aqara smart RGBW light controller',
        extend: preset.light_onoff_brightness_colortemp_color({supportsHS: true}),
    },
    {
        zigbeeModel: ['lumi.light.cbacn1'],
        model: 'HLQDQ01LM',
        vendor: 'Xiaomi',
        description: 'Aqara zigbee LED-controller ',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['lumi.switch.n0agl1'],
        model: 'SSM-U01',
        vendor: 'Xiaomi',
        description: 'Aqara single switch module T1 (with neutral)',
        fromZigbee: [fz.on_off, fz.metering, fz.electrical_measurement, fz.device_temperature],
        exposes: [e.switch(), e.energy(), e.power(), e.device_temperature()],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering', 'genDeviceTempCfg']);
            await reporting.onOff(endpoint);
            // Gives UNSUPPORTED_ATTRIBUTE on reporting.readEletricalMeasurementMultiplierDivisors.
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
            await reporting.activePower(endpoint, {min: 5, max: 600, change: 10});
            await reporting.deviceTemperature(endpoint);
        },
    },
    {
        zigbeeModel: ['lumi.switch.l0agl1'],
        model: 'SSM-U02',
        vendor: 'Xiaomi',
        description: 'Aqara single switch module T1 (without neutral). Doesn\'t work as a router and doesn\'t support power meter',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },

    // TuYa
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_ggev5fsl'}],
        model: 'TS0601_gas_sensor',
        vendor: 'TuYa',
        description: 'gas sensor',
        fromZigbee: [fz.tuya_gas],
        toZigbee: [],
        exposes: [e.gas()],
    },
    {
        fingerprint: [{modelID: 'TS0001', manufacturerName: '_TZ3000_hktqahrq'}],
        model: 'WHD02',
        vendor: 'TuYa',
        description: 'Wall switch module',
        toZigbee: preset.switch().toZigbee.concat([tz.moes_power_on_behavior]),
        fromZigbee: preset.switch().fromZigbee.concat([fz.moes_power_on_behavior]),
        exposes: preset.switch().exposes.concat([exposes.enum('power_on_behavior', ea.ALL, ['off', 'previous', 'on'])
            .withDescription('Controls the behaviour when the device is powered on')]),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_mvn6jl7x'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_raviyuvk'}, {modelID: 'TS011F', manufacturerName: '_TYZB01_hlla45kx'}],
        model: 'TS011F_2_gang_wall',
        vendor: 'TuYa',
        description: '2 gang wall outlet',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_rk2yzt0u'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_o4cjetlm'}, {manufacturerName: '_TZ3000_o4cjetlm'}],
        model: 'ZN231392',
        vendor: 'TuYa',
        description: 'Smart water/gas valve',
        extend: preset.switch(),
    },
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3000_qqjaziws'}],
        model: 'TS0505B',
        vendor: 'TuYa',
        description: 'Zigbee smart mini led strip controller 5V/12V/24V RGB+CCT',
        extend: preset.light_onoff_brightness_colortemp_color(),
        meta: {applyRedFix: true},
    },
    {
        fingerprint: [{modelID: 'TS0503B', manufacturerName: '_TZ3000_i8l0nqdu'}],
        model: 'TS0503B',
        vendor: 'TuYa',
        description: 'Zigbee smart mini led strip controller 5V/12V/24V RGB',
        extend: preset.light_onoff_brightness_color(),
        // Requires red fix: https://github.com/Koenkk/zigbee2mqtt/issues/5962#issue-796462106
        meta: {applyRedFix: true, enhancedHue: false},
    },
    {
        fingerprint: [{modelID: 'TS0504B', manufacturerName: '_TZ3000_ukuvyhaa'}],
        model: 'TS0504B',
        vendor: 'TuYa',
        description: 'Zigbee smart mini led strip controller 5V/12V/24V RGBW',
        extend: preset.light_onoff_brightness_color(),
        meta: {applyRedFix: true},
    },
    {
        fingerprint: [{modelID: 'TS0501B', manufacturerName: '_TZ3000_4whigl8i'}],
        model: 'TS0501B',
        description: 'Zigbee smart mini led strip controller single color',
        vendor: 'TuYa',
        extend: preset.light_onoff_brightness(),
    },
    {
        fingerprint: [{modelID: 'TS0202', manufacturerName: '_TYZB01_ef5xlc9q'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_vwqnz1sn'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_2b8f6cio'}],
        model: 'TS0202',
        vendor: 'TuYa',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.ignore_basic_report],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        fingerprint: [{modelID: 'TS0207', manufacturerName: '_TZ3000_m0vaazab'}],
        model: 'TS0207_repeater',
        vendor: 'TuYa',
        description: 'Repeater',
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [],
    },
    {
        fingerprint: [{modelID: 'TS0101', manufacturerName: '_TYZB01_ijihzffk'}],
        model: 'TS0101',
        vendor: 'TuYa',
        description: 'Zigbee Socket',
        whiteLabel: [{vendor: 'Larkkey', model: 'PS080'}],
        extend: preset.switch(),
        meta: {disableDefaultResponse: true},
    },
    {
        fingerprint: [{modelID: 'TS0101', manufacturerName: '_TZ3210_eymunffl'}],
        model: 'R7060',
        vendor: 'Woox',
        description: 'Smart garden irrigation control',
        fromZigbee: [fz.on_off, fz.ignore_tuya_set_time, fz.ignore_basic_report, fz.woox_R7060],
        toZigbee: [tz.on_off],
        onEvent: tuya.onEventSetTime,
        exposes: [e.switch()],
        meta: {disableDefaultResponse: true},
    },
    {
        fingerprint: [{modelID: 'TS0108', manufacturerName: '_TYZB01_7yidyqxd'}],
        model: 'TS0108',
        vendor: 'TuYa',
        description: 'Socket with 2 USB',
        whiteLabel: [{vendor: 'Larkkey', model: 'PS580'}],
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 7};
        },
        meta: {configureKey: 1, multiEndpoint: true, disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(7), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_whpb9yts'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ebwgzdqq'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_9i9dt8is'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_dfxkcots'},
        ],
        model: 'TS0601_dimmer',
        vendor: 'TuYa',
        description: 'Zigbee smart dimmer',
        fromZigbee: [fz.tuya_dimmer, fz.ignore_basic_report],
        toZigbee: [tz.tuya_dimmer_state, tz.tuya_dimmer_level],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
        exposes: [e.light_brightness().setAccess('state', ea.STATE_SET).setAccess('brightness', ea.STATE_SET)],
        whiteLabel: [
            {vendor: 'Larkkey', model: 'ZSTY-SM-1DMZG-EU'},
            {vendor: 'Earda', model: 'EDM-1ZAA-EU'},
            {vendor: 'Earda', model: 'EDM-1ZAB-EU'},
            {vendor: 'Earda', model: 'EDM-1ZBA-EU'},
        ],
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_oiymh3qu'}],
        model: 'TS011F_socket_module',
        vendor: 'TuYa',
        description: 'Socket module',
        extend: preset.switch(),
        whiteLabel: [{vendor: 'LoraTap', model: 'RR400ZB'}],
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_wxtp7c5y'}],
        model: 'TS011F_wall_outlet',
        vendor: 'TuYa',
        description: 'In-wall outlet',
        extend: preset.switch(),
        whiteLabel: [{vendor: 'Teekar', model: 'SWP86-01OG'}],
    },
    {
        zigbeeModel: ['TS130F'],
        model: 'TS130F',
        vendor: 'TuYa',
        description: 'Curtain/blind switch',
        fromZigbee: [fz.cover_position_tilt, fz.tuya_backlight_mode, fz.tuya_cover_options],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.tuya_cover_calibration, tz.tuya_cover_reversal, tz.tuya_backlight_mode],
        whiteLabel: [{vendor: 'LoraTap', model: 'SC400'}],
        exposes: [e.cover_position(), exposes.enum('moving', ea.STATE, ['UP', 'STOP', 'DOWN']),
            exposes.binary('calibration', ea.ALL, 'ON', 'OFF'),
            exposes.enum('backlight_mode', ea.ALL, ['LOW', 'MEDIUM', 'HIGH']),
            exposes.binary('motor_reversal', ea.ALL, 'ON', 'OFF')],
    },
    {
        zigbeeModel: ['qnazj70', 'kjintbl'],
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_wunufsil'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_vhy3iakz'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_oisqyl4o'},
            {modelID: 'TS0601', manufacturerName: '_TZ3000_uim07oem'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_g1ib5ldv'},
        ],
        model: 'TS0601_switch',
        vendor: 'TuYa',
        description: '1, 2, 3 or 4 gang switch',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET), e.switch().withEndpoint('l4').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, fz.tuya_switch],
        toZigbee: [tz.tuya_switch_state],
        meta: {configureKey: 1, multiEndpoint: true},
        whiteLabel: [
            {vendor: 'Norklmes', model: 'MKS-CM-W5'},
            {vendor: 'Somgoms', model: 'ZSQB-SMB-ZB'},
            {vendor: 'Moes', model: 'WS-EUB1-ZG'},
            {vendor: 'AVATTO', model: 'ZGB-WS-EU'},
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(3)) await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(4)) await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1};
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_aqnazj70'}],
        model: 'TS0601_switch_4_gang',
        vendor: 'TuYa',
        description: '4 gang switch',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l4').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, fz.tuya_switch],
        toZigbee: [tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1};
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_nkjintbl'}],
        model: 'TS0601_switch_2_gang',
        vendor: 'TuYa',
        description: '2 gang switch',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, fz.tuya_switch],
        toZigbee: [tz.tuya_switch_state],
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1};
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_kyfqmmyl'}],
        model: 'TS0601_switch_3_gang',
        vendor: 'TuYa',
        description: '3 gang switch',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, fz.tuya_switch],
        toZigbee: [tz.tuya_switch_state],
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1, 'l3': 1};
        },
    },
    {
        fingerprint: [{modelID: 'TS0215A', manufacturerName: '_TZ3000_4fsgukof'},
            {modelID: 'TS0215A', manufacturerName: '_TZ3000_wr2ucaj9'}],
        model: 'TS0215A_sos',
        vendor: 'TuYa',
        description: 'SOS button',
        fromZigbee: [fz.command_emergency, fz.battery],
        exposes: [e.battery(), e.action(['emergency'])],
        toZigbee: [],
    },
    {
        fingerprint: [{modelID: 'TS0215A', manufacturerName: '_TZ3000_p6ju8myv'},
            {modelID: 'TS0215A', manufacturerName: '_TZ3000_fsiepnrh'}],
        model: 'TS0215A_remote',
        vendor: 'TuYa',
        description: 'Security remote control',
        fromZigbee: [fz.command_arm, fz.command_emergency, fz.battery],
        exposes: [e.battery(), e.action(['disarm', 'arm_day_zones', 'arm_night_zones', 'arm_all_zones', 'exit_delay', 'emergency'])],
        toZigbee: [],
        whiteLabel: [{vendor: 'Woox', model: 'R7054'}, {vendor: 'Nedis', model: 'ZBRC10WT'}],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genTime', 'genBasic', 'ssIasAce', 'ssIasZone']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0503A', manufacturerName: '_TZ3000_obacbukl'}],
        model: 'TS0503A',
        vendor: 'TuYa',
        description: 'Led strip controller',
        extend: preset.light_onoff_brightness_color(),
    },
    {
        zigbeeModel: ['TS0503A'],
        model: 'TYZS1L',
        vendor: 'TuYa',
        description: 'Led strip controller HSB',
        exposes: [e.light_colorhs()],
        fromZigbee: [fz.on_off, fz.tuya_led_controller],
        toZigbee: [tz.tuya_led_controller, tz.ignore_transition, tz.ignore_rate],
    },
    {
        zigbeeModel: ['TS0502A'],
        model: 'TS0502A',
        vendor: 'TuYa',
        description: 'Light controller',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        fingerprint: [{modelID: 'TS0504A', manufacturerName: '_TZ3000_nzbm4ad4'}],
        model: 'TS0504A',
        vendor: 'TuYa',
        description: 'RGBW LED controller',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_sosdczdl'}],
        model: 'TS0505A_led',
        vendor: 'TuYa',
        description: 'RGB+CCT LED',
        toZigbee: [tz.on_off, tz.tuya_led_control],
        fromZigbee: [fz.on_off, fz.tuya_led_controller, fz.brightness, fz.ignore_basic_report],
        exposes: [e.light_brightness_colortemp_colorhs().removeFeature('color_temp_startup')],
    },
    {
        zigbeeModel: ['TS0505A'],
        model: 'TS0505A',
        vendor: 'TuYa',
        description: 'RGB+CCT light controller',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        fingerprint: [
            {type: 'EndDevice', manufacturerID: 4098, endpoints: [{ID: 1, inputClusters: [], outputClusters: []}]},
            {manufacturerName: '_TZ2000_a476raq2'},
        ],
        zigbeeModel: ['TS0201', 'SNTZ003'],
        model: 'TS0201',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor with display',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['TS0041'],
        model: 'TS0041',
        vendor: 'TuYa',
        description: 'Wireless switch with 1 button',
        whiteLabel: [{vendor: 'Smart9', model: 'S9TSZGB'}, {vendor: 'Lonsonho', model: 'TS0041'}],
        exposes: [e.battery(), e.action(['single', 'double', 'hold'])],
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            try {
                await reporting.batteryPercentageRemaining(endpoint);
            } catch (error) {/* Fails for some: https://github.com/Koenkk/zigbee2mqtt/issues/6313 */}
        },
    },
    {
        zigbeeModel: ['TS0042'],
        model: 'TS0042',
        vendor: 'TuYa',
        description: 'Wireless switch with 2 buttons',
        whiteLabel: [{vendor: 'Smart9', model: 'S9TSZGB'}, {vendor: 'Lonsonho', model: 'TS0042'}],
        exposes: [e.battery(), e.action(['1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold'])],
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['TS0043'],
        model: 'TS0043',
        vendor: 'TuYa',
        description: 'Wireless switch with 3 buttons',
        whiteLabel: [{vendor: 'Smart9', model: 'S9TSZGB'}, {vendor: 'Lonsonho', model: 'TS0043'}, {vendor: 'LoraTap', model: 'SS600ZB'}],
        exposes: [e.battery(),
            e.action(['1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold', '3_single', '3_double', '3_hold'])],
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0044'],
        model: 'TS0044',
        vendor: 'TuYa',
        description: 'Wireless switch with 4 buttons',
        whiteLabel: [{vendor: 'Lonsonho', model: 'TS0044'}, {vendor: 'Haozee', model: 'ESW-OZAA-EU'}],
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
        exposes: [e.battery(), e.action(['1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold',
            '3_single', '3_double', '3_hold', '4_single', '4_double', '4_hold'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0001'],
        model: 'TS0001',
        vendor: 'TuYa',
        description: '1 gang switch',
        extend: preset.switch(),
        whiteLabel: [{vendor: 'CR Smart Home', model: 'TS0001', description: 'Valve control'}, {vendor: 'Lonsonho', model: 'X701'},
            {vendor: 'Bandi', model: 'BDS03G1'}],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['TS0002'],
        model: 'TS0002',
        vendor: 'TuYa',
        description: '2 gang switch',
        whiteLabel: [{vendor: 'Zemismart', model: 'ZM-CSW002-D_switch'}, {vendor: 'Lonsonho', model: 'X702'}],
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {configureKey: 3, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: [
            'owvfni3\u0000', 'owvfni3', 'u1rkty3', 'aabybja', // Curtain motors
            'mcdj3aq', 'mcdj3aq\u0000', // Tubular motors
        ],
        fingerprint: [
            // Curtain motors:
            {modelID: 'TS0601', manufacturerName: '_TZE200_5zbp6j0u'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_nkoabg8w'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_xuzcvlku'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_4vobcgd3'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_nogaemzt'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_pk0sfzvr'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_fdtjuw7u'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_zpzndjez'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_wmcdj3aq'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_cowvfni3'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_rddyvrci'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_nueqqe6k'},
            {modelID: 'zo2pocs\u0000', manufacturerName: '_TYST11_fzo2pocs'},
            // Roller blinds:
            {modelID: 'TS0601', manufacturerName: '_TZE200_sbordckq'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_fctwhugx'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_zah67ekd'},
            // Window pushers:
            {modelID: 'TS0601', manufacturerName: '_TZE200_g5wdnuow'},
            // Tubular motors:
            {modelID: 'TS0601', manufacturerName: '_TZE200_fzo2pocs'},
        ],
        model: 'TS0601_cover',
        vendor: 'TuYa',
        description: 'Curtain motor/roller blind motor/window pusher/tubular motor',
        whiteLabel: [
            {vendor: 'Yushun', model: 'YS-MT750'},
            {vendor: 'Zemismart', model: 'ZM79E-DT'},
            {vendor: 'Binthen', model: 'BCM100D'},
            {vendor: 'Binthen', model: 'CV01A'},
            {vendor: 'Zemismart', model: 'M515EGB'},
            {vendor: 'Tuya', model: 'M515EGZT'},
            {vendor: 'TuYa', model: 'DT82LEMA-1.2N'},
            {vendor: 'Moes', model: 'AM43-0.45/40-ES-EB'},
            {vendor: 'Larkkey', model: 'ZSTY-SM-1SRZG-EU'},
            {vendor: 'Zemismart', model: 'ZM25TQ', description: 'Tubular motor'},
            {vendor: 'Zemismart', model: 'AM43', description: 'Roller blind motor'},
        ],
        fromZigbee: [fz.tuya_cover, fz.ignore_basic_report],
        toZigbee: [tz.tuya_cover_control, tz.tuya_cover_options],
        exposes: [
            e.cover_position().setAccess('position', ea.STATE_SET),
            exposes.composite('options', 'options')
                .withFeature(exposes.numeric('motor_speed', ea.STATE_SET)
                    .withValueMin(0)
                    .withValueMax(255)
                    .withDescription('Motor speed'))],
    },
    {
        zigbeeModel: ['kud7u2l'],
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_ckud7u2l'}, {modelID: 'TS0601', manufacturerName: '_TZE200_ywdxldoj'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_cwnjrr72'}],
        model: 'TS0601_thermostat',
        vendor: 'TuYa',
        description: 'Radiator valve with thermostat',
        whiteLabel: [{vendor: 'Moes', model: 'HY368'}, {vendor: 'Moes', model: 'HY369RT'}, {vendor: 'SHOJZJ', model: '378RT'}],
        meta: {tuyaThermostatPreset: tuya.thermostatPresets, tuyaThermostatSystemMode: tuya.thermostatSystemModes3},
        ota: ota.zigbeeOTA,
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [fz.tuya_thermostat, fz.ignore_basic_report, fz.ignore_tuya_set_time],
        toZigbee: [tz.tuya_thermostat_child_lock, tz.tuya_thermostat_window_detection, tz.tuya_thermostat_valve_detection,
            tz.tuya_thermostat_current_heating_setpoint, tz.tuya_thermostat_auto_lock,
            tz.tuya_thermostat_calibration, tz.tuya_thermostat_min_temp, tz.tuya_thermostat_max_temp,
            tz.tuya_thermostat_boost_time, tz.tuya_thermostat_comfort_temp, tz.tuya_thermostat_eco_temp,
            tz.tuya_thermostat_force_to_mode, tz.tuya_thermostat_force, tz.tuya_thermostat_preset, tz.tuya_thermostat_away_mode,
            tz.tuya_thermostat_window_detect, tz.tuya_thermostat_schedule, tz.tuya_thermostat_week, tz.tuya_thermostat_away_preset],
        exposes: [
            e.child_lock(), e.window_detection(), e.battery_low(), e.valve_detection(), e.position(),
            exposes.climate().withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE).withSystemMode(['heat', 'auto', 'off'], ea.STATE_SET)
                .withRunningState(['idle', 'heat'], ea.STATE)
                .withLocalTemperatureCalibration(ea.STATE_SET)
                .withAwayMode().withPreset(['schedule', 'manual', 'boost', 'complex', 'comfort', 'eco']),
            e.auto_lock(), e.away_mode(), e.away_preset_days(), e.boost_time(), e.comfort_temperature(), e.eco_temperature(), e.force(),
            e.max_temperature(), e.min_temperature(), e.week(), e.away_preset_temperature()],
    },
    {
        fingerprint: [{modelID: 'v90ladg\u0000', manufacturerName: '_TYST11_wv90ladg'}],
        model: 'HT-08',
        vendor: 'ETOP',
        description: 'Wall-mount thermostat',
        fromZigbee: [fz.legacy.tuya_thermostat_weekly_schedule, fz.etop_thermostat, fz.ignore_basic_report, fz.ignore_tuya_set_time],
        toZigbee: [tz.etop_thermostat_system_mode, tz.etop_thermostat_away_mode, tz.tuya_thermostat_child_lock,
            tz.tuya_thermostat_current_heating_setpoint, tz.tuya_thermostat_weekly_schedule],
        onEvent: tuya.onEventSetTime,
        meta: {
            thermostat: {
                weeklyScheduleMaxTransitions: 4,
                weeklyScheduleSupportedModes: [1], // bits: 0-heat present, 1-cool present (dec: 1-heat,2-cool,3-heat+cool)
                weeklyScheduleFirstDayDpId: tuya.dataPoints.schedule,
            },
        },
        exposes: [e.child_lock(), exposes.climate().withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
            .withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'heat', 'auto'], ea.STATE_SET).withRunningState(['idle', 'heat'], ea.STATE)
            .withAwayMode()],
    },
    {
        fingerprint: [{modelID: 'dpplnsn\u0000', manufacturerName: '_TYST11_2dpplnsn'}],
        model: 'HT-10',
        vendor: 'ETOP',
        description: 'Radiator valve',
        fromZigbee: [fz.legacy.tuya_thermostat_weekly_schedule, fz.etop_thermostat, fz.ignore_basic_report, fz.ignore_tuya_set_time],
        toZigbee: [tz.etop_thermostat_system_mode, tz.etop_thermostat_away_mode, tz.tuya_thermostat_child_lock,
            tz.tuya_thermostat_current_heating_setpoint, tz.tuya_thermostat_weekly_schedule],
        onEvent: tuya.onEventSetTime,
        meta: {
            timeout: 20000, // TRV wakes up every 10sec
            thermostat: {
                weeklyScheduleMaxTransitions: 4,
                weeklyScheduleSupportedModes: [1], // bits: 0-heat present, 1-cool present (dec: 1-heat,2-cool,3-heat+cool)
                weeklyScheduleFirstDayDpId: tuya.dataPoints.schedule,
            },
        },
        exposes: [
            e.battery_low(), e.child_lock(), exposes.climate()
                .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE).withAwayMode()
                .withSystemMode(['off', 'heat', 'auto'], ea.STATE_SET).withRunningState(['idle', 'heat'], ea.STATE),
        ],
    },
    {
        zigbeeModel: ['TS0121'],
        model: 'TS0121_plug',
        description: '10A UK or 16A EU smart plug',
        whiteLabel: [{vendor: 'BlitzWolf', model: 'BW-SHP13'}],
        vendor: 'TuYa',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report, fz.tuya_switch_power_outage_memory],
        toZigbee: [tz.on_off, tz.tuya_switch_power_outage_memory],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acVoltageMultiplier: 1, acVoltageDivisor: 1, acCurrentMultiplier: 1, acCurrentDivisor: 1000, acPowerMultiplier: 1,
                acPowerDivisor: 1,
            });
        },
        // This device doesn't support reporting correctly.
        // https://github.com/Koenkk/zigbee-herdsman-converters/pull/1270
        exposes: [e.switch(), e.power(), e.current(), e.voltage().withAccess(ea.STATE),
            e.energy(), exposes.enum('power_outage_memory', ea.STATE_SET, ['on', 'off', 'restore'])
                .withDescription('Recover state after power outage')],
        onEvent: (type, data, device, options) => {
            const endpoint = device.getEndpoint(1);
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            } else if (!globalStore.hasValue(device, 'interval')) {
                const seconds = options && options.measurement_poll_interval ? options.measurement_poll_interval : 60;
                const interval = setInterval(async () => {
                    try {
                        await endpoint.read('haElectricalMeasurement', ['rmsVoltage', 'rmsCurrent', 'activePower']);
                    } catch (error) {/* Do nothing*/}
                }, seconds*1000);
                globalStore.putValue(device, 'interval', interval);
            }
        },
    },
    {
        zigbeeModel: ['RH3001'],
        fingerprint: [{type: 'EndDevice', manufacturerID: 4098, applicationVersion: 66, endpoints: [
            {ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 10, 1, 1280], outputClusters: [25]},
        ]}],
        model: 'SNTZ007',
        vendor: 'TuYa',
        description: 'Rechargeable Zigbee contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ignore_basic_report, fz.ignore_time_read],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
        whiteLabel: [{vendor: 'BlitzWolf', model: 'BW-IS2'}],
    },
    {
        zigbeeModel: ['RH3040'],
        model: 'RH3040',
        vendor: 'TuYa',
        description: 'PIR sensor',
        fromZigbee: [fz.battery, fz.ignore_basic_report, fz.ias_occupancy_alarm_1],
        toZigbee: [],
        whiteLabel: [{vendor: 'Samotech', model: 'SM301Z'}],
        exposes: [e.battery(), e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['TS0115'],
        model: 'TS0115',
        vendor: 'TuYa',
        description: 'Multiprise with 4 AC outlets and 2 USB super charging ports (10A or 16A)',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'), e.switch().withEndpoint('l5')],
        whiteLabel: [{vendor: 'UseeLink', model: 'SM-SO306E/K/M'}],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4, l5: 7};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(7), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['RH3052'],
        model: 'TT001ZAV20',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.humidity, fz.temperature, fz.battery],
        toZigbee: [],
        exposes: [e.humidity(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['TS0011'],
        model: 'TS0011',
        vendor: 'TuYa',
        description: 'Smart light switch - 1 gang',
        extend: preset.switch(),
        whiteLabel: [{vendor: 'Vrey', model: 'VR-X712U-0013'}, {vendor: 'TUYATEC', model: 'GDKES-01TZXD'},
            {vendor: 'Lonsonho', model: 'QS-Zigbee-S05-L', description: '1 gang smart switch module without neutral wire'}],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            // Reports itself as battery which is not correct: https://github.com/Koenkk/zigbee2mqtt/issues/6190
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['TS0012'],
        model: 'TS0012',
        vendor: 'TuYa',
        description: 'Smart light switch - 2 gang',
        whiteLabel: [{vendor: 'Vrey', model: 'VR-X712U-0013'}, {vendor: 'TUYATEC', model: 'GDKES-02TZXD'},
            {vendor: 'Earda', model: 'ESW-2ZAA-EU'}],
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right')],
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        meta: {configureKey: 2, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['TS0013'],
        model: 'TS0013',
        vendor: 'TuYa',
        description: 'Smart light switch - 3 gang without neutral wire',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('center'), e.switch().withEndpoint('right')],
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        whiteLabel: [{vendor: 'TUYATEC', model: 'GDKES-03TZXD'}],
        meta: {configureKey: 2, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            try {
                for (const ID of [1, 2, 3]) {
                    const endpoint = device.getEndpoint(ID);
                    await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
                    await reporting.onOff(endpoint);
                }
            } catch (e) {
                // Fails for some: https://github.com/Koenkk/zigbee2mqtt/issues/4872
            }
        },
    },
    {
        fingerprint: [{modelID: 'TS0014', manufacturerName: '_TZ3000_jr2atpww'}, {modelID: 'TS0014', manufacturerName: '_TYZB01_dvakyzhd'},
            {modelID: 'TS0014', manufacturerName: '_TZ3210_w3hl6rao'}],
        model: 'TS0014',
        vendor: 'TuYa',
        description: 'Smart light switch - 4 gang without neutral wire',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4};
        },
        whiteLabel: [{vendor: 'TUYATEC', model: 'GDKES-04TZXD'}, {vendor: 'Vizo', model: 'VZ-222S'}],
        meta: {configureKey: 2, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            try {
                for (const ID of [1, 2, 3, 4]) {
                    const endpoint = device.getEndpoint(ID);
                    await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
                    await reporting.onOff(endpoint);
                }
            } catch (e) {
                // Fails for some: https://github.com/Koenkk/zigbee2mqtt/issues/4872
            }
        },
    },
    {
        zigbeeModel: ['gq8b1uv'],
        model: 'gq8b1uv',
        vendor: 'TuYa',
        description: 'Zigbee smart dimmer',
        fromZigbee: [fz.tuya_dimmer, fz.ignore_basic_report],
        toZigbee: [tz.tuya_dimmer_state, tz.tuya_dimmer_level],
        exposes: [e.light_brightness().setAccess('state', ea.STATE_SET).setAccess('brightness', ea.STATE_SET)],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
    },
    {
        zigbeeModel: ['HY0017'],
        model: 'U86KCJ-ZP',
        vendor: 'TuYa',
        description: 'Smart 6 key scene wall switch',
        fromZigbee: [fz.scenes_recall_scene_65029],
        exposes: [e.action(['scene_1', 'scene_2', 'scene_3', 'scene_4', 'scene_5', 'scene_6'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['q9mpfhw'],
        model: 'SNTZ009',
        vendor: 'TuYa',
        description: 'Water leak sensor',
        fromZigbee: [fz.tuya_water_leak, fz.ignore_basic_report],
        exposes: [e.water_leak()],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0004'],
        model: 'TS0004',
        vendor: 'TuYa',
        description: 'Smart light switch - 4 gang with neutral wire',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0006', manufacturerName: '_TYZB01_ltundz9m'}],
        model: 'TS0006',
        vendor: 'TuYa',
        description: '6 gang switch module with neutral wire',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'), e.switch().withEndpoint('l5'), e.switch().withEndpoint('l6')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4, 'l5': 5, 'l6': 6};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(6), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['HY0080'],
        model: 'U86KWF-ZPSJ',
        vendor: 'TuYa',
        description: 'Environment controller',
        fromZigbee: [fz.legacy.thermostat_att_report, fz.fan],
        toZigbee: [tz.factory_reset, tz.thermostat_local_temperature, tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint, tz.thermostat_unoccupied_cooling_setpoint,
            tz.thermostat_setpoint_raise_lower, tz.thermostat_remote_sensing,
            tz.thermostat_control_sequence_of_operation, tz.thermostat_system_mode, tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule, tz.thermostat_relay_status_log,
            tz.thermostat_temperature_setpoint_hold, tz.thermostat_temperature_setpoint_hold_duration, tz.fan_mode],
        exposes: [exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
            .withSystemMode(['off', 'auto', 'heat'], ea.ALL)
            .withRunningState(['idle', 'heat', 'cool'], ea.STATE)
            .withLocalTemperatureCalibration(ea.ALL).withPiHeatingDemand()],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ['hvacThermostat', 'hvacFanCtrl']);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedCoolingSetpoint(endpoint);
            await reporting.fanMode(endpoint);
        },
    },
    {
        zigbeeModel: ['6dfgetq'],
        model: 'D3-DPWK-TY',
        vendor: 'TuYa',
        description: 'HVAC controller',
        exposes: [exposes.climate().withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET)
            .withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'auto', 'heat'], ea.STATE_SET)
            .withRunningState(['idle', 'heat', 'cool'], ea.STATE)],
        fromZigbee: [fz.tuya_thermostat, fz.ignore_basic_report, fz.tuya_dimmer],
        meta: {tuyaThermostatSystemMode: tuya.thermostatSystemModes2, tuyaThermostatPreset: tuya.thermostatPresets},
        toZigbee: [tz.tuya_thermostat_current_heating_setpoint, tz.tuya_thermostat_system_mode,
            tz.tuya_thermostat_fan_mode, tz.tuya_dimmer_state],
    },
    {
        zigbeeModel: ['E220-KR4N0Z0-HA'],
        model: 'E220-KR4N0Z0-HA',
        vendor: 'TuYa',
        description: 'Multiprise with 4 AC outlets and 2 USB super charging ports (16A)',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4')],
        whiteLabel: [{vendor: 'LEELKI', model: 'WP33-EU'}],
        meta: {multiEndpoint: true, configureKey: 1},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['TS0216'],
        model: 'TS0216',
        vendor: 'TuYa',
        description: 'Sound and flash siren',
        fromZigbee: [fz.ts0216_siren, fz.battery],
        exposes: [e.battery(), exposes.binary('alarm', ea.STATE_SET, true, false),
            exposes.numeric('volume', ea.ALL).withValueMin(0).withValueMax(100).withDescription('Volume of siren')],
        toZigbee: [tz.ts0216_alarm, tz.ts0216_duration, tz.ts0216_volume],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_znzs7yaw'}],
        model: 'HY08WE',
        vendor: 'TuYa',
        description: 'Wall-mount thermostat',
        fromZigbee: [fz.hy_thermostat, fz.ignore_basic_report, fz.hy_set_time_request],
        toZigbee: [tz.hy_thermostat],
        exposes: [exposes.climate().withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET)
            .withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'auto', 'heat'], ea.STATE_SET).withRunningState(['idle', 'heat'], ea.STATE)],
    },
    {
        fingerprint: [{modelID: 'TS0222', manufacturerName: '_TYZB01_4mdqxxnn'}],
        model: 'TS0222',
        vendor: 'TuYa',
        description: 'Light intensity sensor',
        fromZigbee: [fz.battery, fz.illuminance],
        toZigbee: [],
        exposes: [e.battery(), e.illuminance(), e.illuminance_lux()],
    },
    {
        fingerprint: [{modelID: 'TS0210', manufacturerName: '_TYZB01_3zv6oleo'}],
        model: 'TS0210',
        vendor: 'TuYa',
        description: 'Vibration sensor',
        fromZigbee: [fz.battery, fz.ias_vibration_alarm_1],
        toZigbee: [tz.TS0210_sensitivity],
        exposes: [e.battery(), e.vibration(), exposes.enum('sensitivity', exposes.access.STATE_SET, ['low', 'medium', 'high'])],
    },

    // UseeLink
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_o005nuxx'}],
        model: 'SM-SO306EZ-10',
        vendor: 'UseeLink',
        description: '4 gang switch, with USB',
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'), e.switch().withEndpoint('l5')],
        extend: preset.switch(),
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            for (const ID of [1, 2, 3, 4, 5]) {
                await reporting.bind(device.getEndpoint(ID), coordinatorEndpoint, ['genOnOff']);
            }
        },
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4, 'l5': 5};
        },
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_tvuarksa'}],
        model: 'SM-AZ713',
        vendor: 'UseeLink',
        description: 'Smart water/gas valve',
        extend: preset.switch(),
    },

    // Mycket
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_evag0pvn'}],
        model: 'MS-SP-LE27WRGB',
        description: 'E27 RGBW bulb',
        vendor: 'Mycket',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },

    // Brimate
    {
        zigbeeModel: ['FB56-BOT02HM1A5'],
        model: 'FZB8708HD-S1',
        vendor: 'Brimate',
        description: 'Smart motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low()],
    },

    // Neo
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_d0yu2xgi'}],
        zigbeeModel: ['0yu2xgi'],
        model: 'NAS-AB02B0',
        vendor: 'Neo',
        description: 'Temperature & humidity sensor and alarm',
        fromZigbee: [fz.neo_t_h_alarm, fz.ignore_basic_report],
        toZigbee: [tz.neo_t_h_alarm],
        exposes: [
            e.temperature(), e.humidity(), exposes.binary('humidity_alarm', ea.STATE_SET, true, false), e.battery_low(),
            exposes.binary('temperature_alarm', ea.STATE_SET, true, false),
            exposes.binary('alarm', ea.STATE_SET, true, false),
            exposes.enum('melody', ea.STATE_SET, Array.from(Array(18).keys()).map((x)=>(x+1).toString())),
            exposes.numeric('duration', ea.STATE_SET).withUnit('second'),
            exposes.numeric('temperature_min', ea.STATE_SET).withUnit('°C'),
            exposes.numeric('temperature_max', ea.STATE_SET).withUnit('°C'),
            exposes.numeric('humidity_min', ea.STATE_SET).withUnit('%'),
            exposes.numeric('humidity_max', ea.STATE_SET).withUnit('%'),
            exposes.enum('volume', ea.STATE_SET, ['low', 'medium', 'high']),
            exposes.enum('power_type', ea.STATE, ['battery_full', 'battery_high', 'battery_medium', 'battery_low', 'usb']),
        ],
    },

    // Lonsonho
    {
        fingerprint: [{modelID: 'TS130F', manufacturerName: '_TZ3000_vd43bbfq'}],
        model: 'QS-Zigbee-C01',
        vendor: 'Lonsonho',
        description: 'Curtain/blind motor controller',
        fromZigbee: [fz.cover_position_tilt, fz.tuya_cover_options],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.tuya_cover_calibration, tz.tuya_cover_reversal],
        meta: {configureKey: 1, coverInverted: true},
        exposes: [e.cover_position(), exposes.enum('moving', ea.STATE, ['UP', 'STOP', 'DOWN']),
            exposes.binary('calibration', ea.ALL, 'ON', 'OFF'),
            exposes.binary('motor_reversal', ea.ALL, 'ON', 'OFF')],
    },
    {
        fingerprint: [{modelID: 'TS130F', manufacturerName: '_TZ3000_egq7y6pr'}],
        model: '11830304',
        vendor: 'Lonsonho',
        description: 'Curtain switch',
        fromZigbee: [fz.cover_position_tilt, fz.tuya_backlight_mode, fz.tuya_cover_options],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.tuya_cover_calibration, tz.tuya_cover_reversal, tz.tuya_backlight_mode],
        meta: {configureKey: 1, coverInverted: true},
        exposes: [e.cover_position(), exposes.enum('moving', ea.STATE, ['UP', 'STOP', 'DOWN']),
            exposes.binary('calibration', ea.ALL, 'ON', 'OFF'),
            exposes.enum('backlight_mode', ea.ALL, ['LOW', 'MEDIUM', 'HIGH']),
            exposes.binary('motor_reversal', ea.ALL, 'ON', 'OFF')],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_8vxj8khv'}, {modelID: 'TS0601', manufacturerName: '_TZE200_7tdtqgwv'}],
        model: 'X711A',
        vendor: 'Lonsonho',
        description: '1 gang switch',
        extend: preset.switch(),
        exposes: [e.switch().setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.tuya_switch, fz.ignore_time_read],
        toZigbee: [tz.tuya_switch_state],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_dhdstcqc'}],
        model: 'X712A',
        vendor: 'Lonsonho',
        description: '2 gang switch',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.tuya_switch, fz.ignore_time_read],
        toZigbee: [tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1};
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_fqytfymk'}],
        model: 'X713A',
        vendor: 'Lonsonho',
        description: '3 gang switch',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET), e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.tuya_switch, fz.ignore_time_read],
        toZigbee: [tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1, 'l3': 1};
        },
    },
    {
        fingerprint: [{modelID: 'TS110F', manufacturerName: '_TZ3000_ktuoyvt5'}],
        model: 'QS-Zigbee-D02-TRIAC-L',
        vendor: 'Lonsonho',
        description: '1 gang smart dimmer switch module without neutral',
        extend: preset.light_onoff_brightness(),
    },
    {
        fingerprint: [{modelID: 'TS110F', manufacturerName: '_TYZB01_qezuin6k'}],
        model: 'QS-Zigbee-D02-TRIAC-LN',
        vendor: 'Lonsonho',
        description: '1 gang smart dimmer switch module with neutral',
        extend: preset.light_onoff_brightness(),
    },
    {
        fingerprint: [{modelID: 'TS110F', manufacturerName: '_TYZB01_v8gtiaed'}],
        model: 'QS-Zigbee-D02-TRIAC-2C-LN',
        vendor: 'Lonsonho',
        description: '2 gang smart dimmer switch module with neutral',
        extend: preset.light_onoff_brightness(),
        exposes: [e.light_brightness().withEndpoint('l1'), e.light_brightness().withEndpoint('l2')],
        meta: {multiEndpoint: true, configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            // Don't do: await reporting.onOff(endpoint); https://github.com/Koenkk/zigbee2mqtt/issues/6041
        },
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
    },
    {
        fingerprint: [{modelID: 'TS110F', manufacturerName: '_TZ3000_92chsky7'}],
        model: 'QS-Zigbee-D02-TRIAC-2C-L',
        vendor: 'Lonsonho',
        description: '2 gang smart dimmer switch module without neutral',
        extend: preset.light_onoff_brightness(),
        exposes: [e.light_brightness().withEndpoint('l1'), e.light_brightness().withEndpoint('l2')],
        meta: {multiEndpoint: true, configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint2);
        },
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
    },
    {
        zigbeeModel: ['Plug_01'],
        model: '4000116784070',
        vendor: 'Lonsonho',
        description: 'Smart plug EU',
        extend: preset.switch(),
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ZB-RGBCW'],
        fingerprint: [{modelID: 'ZB-CL01', manufacturerName: 'eWeLight'}, {modelID: 'ZB-CL01', manufacturerName: 'eWeLink'}],
        model: 'ZB-RGBCW',
        vendor: 'Lonsonho',
        description: 'Zigbee 3.0 LED-bulb, RGBW LED',
        extend: preset.light_onoff_brightness_colortemp_color(
            {disableColorTempStartup: true, colorTempRange: [153, 370], disableEffect: true}),
    },
    {
        fingerprint: [{modelID: 'TS0003', manufacturerName: '_TYZB01_zsl6z0pw'}],
        model: 'QS-Zigbee-S04-2C-LN',
        vendor: 'Lonsonho',
        description: '2 gang switch module with neutral wire',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        toZigbee: [tz.TYZB01_on_off],
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0003', manufacturerName: '_TYZB01_ncutbjdi'}],
        model: 'QS-Zigbee-S05-LN',
        vendor: 'Lonsonho',
        description: '1 gang switch module with neutral wire',
        extend: preset.switch(),
        toZigbee: [tz.TYZB01_on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },

    // IKEA
    {
        zigbeeModel: ['TRADFRI bulb E27 WS opal 980lm', 'TRADFRI bulb E26 WS opal 980lm', 'TRADFRI bulb E27 WS\uFFFDopal 980lm'],
        model: 'LED1545G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 980 lumen, dimmable, white spectrum, opal white',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [250, 454]}),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['TRADFRI Light Engine'],
        model: 'T2011',
        description: 'Osvalla panel round',
        vendor: 'IKEA',
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [250, 454]}),
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WS clear 950lm', 'TRADFRI bulb E26 WS clear 950lm'],
        model: 'LED1546G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 950 lumen, dimmable, white spectrum, clear',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [250, 454]}),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 opal 1000lm', 'TRADFRI bulb E27 W opal 1000lm'],
        model: 'LED1623G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 1000 lumen, dimmable, opal white',
        extend: preset.light_onoff_brightness(),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['TRADFRI bulb GU10 WS 400lm'],
        model: 'LED1537R6/LED1739R5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 400 lumen, dimmable, white spectrum',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [250, 454]}),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['TRADFRI bulb GU10 W 400lm'],
        model: 'LED1650R5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 400 lumen, dimmable',
        extend: preset.light_onoff_brightness(),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 WS opal 400lm', 'TRADFRI bulb E12 WS opal 400lm'],
        model: 'LED1536G5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E12/E14 400 lumen, dimmable, white spectrum, opal white',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [250, 454]}),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 WS 470lm'],
        model: 'LED1903C5/LED1835C6',
        vendor: 'IKEA',
        description: 'TRADFRI bulb E14 WS 470 lumen, dimmable, white spectrum, opal white',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [250, 454]}),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['TRADFRI bulb GU10 WW 400lm'],
        model: 'LED1837R5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 400 lumen, dimmable',
        extend: preset.light_onoff_brightness(),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WW clear 250lm', 'TRADFRI bulb E26 WW clear 250lm'],
        model: 'LED1842G3',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 WW clear 250 lumen, dimmable',
        extend: preset.light_onoff_brightness(),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 WS opal 600lm'],
        model: 'LED1733G7',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E14 600 lumen, dimmable, white spectrum, opal white',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [250, 454]}),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['TRADFRI bulb E26 opal 1000lm', 'TRADFRI bulb E26 W opal 1000lm'],
        model: 'LED1622G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26 1000 lumen, dimmable, opal white',
        extend: preset.light_onoff_brightness(),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 CWS opal 600lm', 'TRADFRI bulb E26 CWS opal 600lm', 'TRADFRI bulb E14 CWS opal 600lm',
            'TRADFRI bulb E12 CWS opal 600lm'],
        model: 'LED1624G9',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E14/E26/E27 600 lumen, dimmable, color, opal white',
        extend: preset.light_onoff_brightness_color(),
        ota: ota.tradfri,
        meta: {supportsHueAndSaturation: false},
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 CWS 806lm'],
        model: 'LED1924G9',
        vendor: 'IKEA',
        description: 'TRADFRI bulb E27 CWS 806 lumen, dimmable, color, opal white',
        extend: preset.light_onoff_brightness_color(),
        ota: ota.tradfri,
        meta: {supportsHueAndSaturation: false},
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 W op/ch 400lm', 'TRADFRI bulb E12 W op/ch 400lm', 'TRADFRI bulb E17 W op/ch 400lm'],
        model: 'LED1649C5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E12/E14/E17 400 lumen, dimmable warm white, chandelier opal',
        extend: preset.light_onoff_brightness(),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WS opal 1000lm', 'TRADFRI bulb E26 WS opal 1000lm'],
        model: 'LED1732G11',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 1000 lumen, dimmable, white spectrum, opal white',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [250, 454]}),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WW 806lm', 'TRADFRI bulb E26 WW 806lm'],
        model: 'LED1836G9',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 806 lumen, dimmable, warm white',
        extend: preset.light_onoff_brightness(),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WS clear 806lm', 'TRADFRI bulb E26 WS clear 806lm'],
        model: 'LED1736G9',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 806 lumen, dimmable, white spectrum, clear',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [250, 454]}),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['LEPTITER Recessed spot light'],
        model: 'T1820',
        vendor: 'IKEA',
        description: 'LEPTITER Recessed spot light, dimmable, white spectrum',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [250, 454]}),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['TRADFRI wireless dimmer'],
        model: 'ICTC-G-1',
        vendor: 'IKEA',
        description: 'TRADFRI wireless dimmer',
        fromZigbee: [fz.legacy.cmd_move, fz.legacy.cmd_move_with_onoff, fz.legacy.cmd_stop, fz.legacy.cmd_stop_with_onoff,
            fz.legacy.cmd_move_to_level_with_onoff, fz.battery],
        exposes: [e.battery(), e.action(['brightness_move_up', 'brightness_move_down', 'brightness_stop', 'brightness_move_to_level'])],
        toZigbee: [],
        meta: {configureKey: 1, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genLevelCtrl', 'genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['TRADFRI transformer 10W', 'TRADFRI Driver 10W'],
        model: 'ICPSHC24-10EU-IL-1',
        vendor: 'IKEA',
        description: 'TRADFRI driver for wireless control (10 watt)',
        extend: preset.light_onoff_brightness(),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['TRADFRI transformer 30W', 'TRADFRI Driver 30W'],
        model: 'ICPSHC24-30EU-IL-1',
        vendor: 'IKEA',
        description: 'TRADFRI driver for wireless control (30 watt)',
        extend: preset.light_onoff_brightness(),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['SILVERGLANS IP44 LED driver'],
        model: 'ICPSHC24-30-IL44-1',
        vendor: 'IKEA',
        description: 'SILVERGLANS IP44 LED driver for wireless control (30 watt)',
        extend: preset.light_onoff_brightness(),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['FLOALT panel WS 30x30'],
        model: 'L1527',
        vendor: 'IKEA',
        description: 'FLOALT LED light panel, dimmable, white spectrum (30x30 cm)',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [250, 454]}),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['FLOALT panel WS 60x60'],
        model: 'L1529',
        vendor: 'IKEA',
        description: 'FLOALT LED light panel, dimmable, white spectrum (60x60 cm)',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [250, 454]}),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['JORMLIEN door WS 40x80'],
        model: 'L1530',
        vendor: 'IKEA',
        description: 'JORMLIEN door light panel, dimmable, white spectrum (40x80 cm)',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [250, 454]}),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['FLOALT panel WS 30x90'],
        model: 'L1528',
        vendor: 'IKEA',
        description: 'FLOALT LED light panel, dimmable, white spectrum (30x90 cm)',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [250, 454]}),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['SURTE door WS 38x64'],
        model: 'L1531',
        vendor: 'IKEA',
        description: 'SURTE door light panel, dimmable, white spectrum (38x64 cm)',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [250, 454]}),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },
    {
        zigbeeModel: ['TRADFRI control outlet'],
        model: 'E1603/E1702',
        description: 'TRADFRI control outlet',
        vendor: 'IKEA',
        extend: preset.switch(),
        toZigbee: preset.switch().toZigbee.concat([tz.power_on_behavior]),
        fromZigbee: preset.switch().fromZigbee.concat([fz.power_on_behavior]),
        // power_on_behavior 'toggle' does not seem to be supported
        exposes: preset.switch().exposes.concat([exposes.enum('power_on_behavior', ea.ALL, ['off', 'previous', 'on'])
            .withDescription('Controls the behaviour when the device is powered on')]),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['TRADFRI remote control'],
        model: 'E1524/E1810',
        description: 'TRADFRI remote control',
        vendor: 'IKEA',
        fromZigbee: [fz.battery, fz.E1524_E1810_toggle, fz.E1524_E1810_levelctrl, fz.ikea_arrow_click, fz.ikea_arrow_hold,
            fz.ikea_arrow_release],
        exposes: [e.battery(), e.action(['brightness_down_release', 'toggle_hold',
            'toggle', 'arrow_left_click', 'arrow_right_click', 'arrow_left_hold', 'arrow_right_hold', 'arrow_left_release',
            'arrow_right_release', 'brightness_up_click', 'brightness_down_click', 'brightness_up_hold', 'brightness_up_release'])],
        toZigbee: [],
        ota: ota.tradfri,
        meta: {configureKey: 1, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            // See explanation in E1743, only applies to E1810 (for E1524 it has no effect)
            // https://github.com/Koenkk/zigbee2mqtt/issues/2772#issuecomment-577389281
            await endpoint.bind('genOnOff', defaultBindGroup);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['Remote Control N2'],
        model: 'W2049',
        vendor: 'IKEA',
        description: 'STYRBAR remote control N2',
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.ikea_arrow_click,
            fz.ikea_arrow_hold, fz.ikea_arrow_release],
        exposes: [e.battery(), e.action(['brightness_up_click', 'brightness_down_click', 'brightness_up_hold', 'brightness_down_hold',
            'brightness_up_release', 'brightness_down_release', 'arrow_left_click', 'arrow_right_click', 'arrow_left_hold',
            'arrow_right_hold', 'arrow_left_release', 'arrow_right_release'])],
        toZigbee: [],
        ota: ota.tradfri,
        meta: {configureKey: 1, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.bind('genOnOff', defaultBindGroup);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['TRADFRI on/off switch'],
        model: 'E1743',
        vendor: 'IKEA',
        description: 'TRADFRI ON/OFF switch',
        fromZigbee: [fz.command_on, fz.legacy.genOnOff_cmdOn, fz.command_off, fz.legacy.genOnOff_cmdOff, fz.command_move, fz.battery,
            fz.legacy.E1743_brightness_up, fz.legacy.E1743_brightness_down, fz.command_stop, fz.legacy.E1743_brightness_stop],
        exposes: [e.battery(), e.action(['on', 'off', 'brightness_move_down', 'brightness_move_up', 'brightness_stop'])],
        toZigbee: [],
        ota: ota.tradfri,
        meta: {configureKey: 1, disableActionGroup: true, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            // By default this device controls group 0, some devices are by default in
            // group 0 causing the remote to control them.
            // By binding it to a random group, e.g. 901, it will send the commands to group 901 instead of 0
            // https://github.com/Koenkk/zigbee2mqtt/issues/2772#issuecomment-577389281
            await endpoint.bind('genOnOff', defaultBindGroup);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['KNYCKLAN Open/Close remote'],
        model: 'E1841',
        vendor: 'IKEA',
        description: 'KNYCKLAN open/close remote water valve',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery],
        exposes: [e.battery(), e.action(['on', 'off'])],
        toZigbee: [],
        ota: ota.tradfri,
        meta: {configureKey: 1, disableActionGroup: true, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            // By default this device controls group 0, some devices are by default in
            // group 0 causing the remote to control them.
            // By binding it to a random group, e.g. 901, it will send the commands to group 901 instead of 0
            // https://github.com/Koenkk/zigbee2mqtt/issues/2772#issuecomment-577389281
            await endpoint.bind('genOnOff', defaultBindGroup);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['KNYCKLAN receiver'],
        model: 'E1842',
        description: 'KNYCKLAN receiver electronic water valve shut-off',
        vendor: 'IKEA',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['TRADFRI SHORTCUT Button'],
        model: 'E1812',
        vendor: 'IKEA',
        description: 'TRADFRI shortcut button',
        fromZigbee: [fz.command_on, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.battery(), e.action(['on', 'brightness_move_up', 'brightness_stop'])],
        toZigbee: [],
        ota: ota.tradfri,
        meta: {configureKey: 1, disableActionGroup: true, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            // By default this device controls group 0, some devices are by default in
            // group 0 causing the remote to control them.
            // By binding it to a random group, e.g. 901, it will send the commands to group 901 instead of 0
            await reporting.bind(endpoint, defaultBindGroup, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['SYMFONISK Sound Controller'],
        model: 'E1744',
        vendor: 'IKEA',
        description: 'SYMFONISK sound controller',
        fromZigbee: [fz.legacy.cmd_move, fz.legacy.cmd_stop, fz.legacy.E1744_play_pause, fz.legacy.E1744_skip, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.action([
            'brightness_move_up', 'brightness_move_down', 'brightness_stop', 'toggle', 'brightness_step_up', 'brightness_step_down'])],
        ota: ota.tradfri,
        meta: {configureKey: 1, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genLevelCtrl', 'genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['TRADFRI motion sensor'],
        model: 'E1525/E1745',
        vendor: 'IKEA',
        description: 'TRADFRI motion sensor',
        fromZigbee: [fz.battery, fz.tradfri_occupancy, fz.E1745_requested_brightness],
        toZigbee: [],
        exposes: [e.battery(), e.occupancy(),
            exposes.numeric('requested_brightness_level', ea.STATE).withValueMin(76).withValueMax(254),
            exposes.numeric('requested_brightness_percent', ea.STATE).withValueMin(30).withValueMax(100)],
        ota: ota.tradfri,
        meta: {configureKey: 1, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['TRADFRI signal repeater'],
        model: 'E1746',
        description: 'TRADFRI signal repeater',
        vendor: 'IKEA',
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        ota: ota.tradfri,
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const payload = [{attribute: 'modelId', minimumReportInterval: 3600, maximumReportInterval: 14400}];
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
            await endpoint.configureReporting('genBasic', payload);
        },
        exposes: [],
    },
    {
        zigbeeModel: ['FYRTUR block-out roller blind'],
        model: 'E1757',
        vendor: 'IKEA',
        description: 'FYRTUR roller blind',
        fromZigbee: [fz.cover_position_tilt, fz.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        meta: {configureKey: 2, battery: {dontDividePercentage: true}},
        ota: ota.tradfri,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
        exposes: [e.cover_position(), e.battery()],
    },
    {
        zigbeeModel: ['KADRILJ roller blind'],
        model: 'E1926',
        vendor: 'IKEA',
        description: 'KADRILJ roller blind',
        fromZigbee: [fz.cover_position_tilt, fz.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        meta: {configureKey: 2, battery: {dontDividePercentage: true}},
        ota: ota.tradfri,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
        exposes: [e.cover_position(), e.battery()],
    },
    {
        zigbeeModel: ['TRADFRI open/close remote'],
        model: 'E1766',
        vendor: 'IKEA',
        description: 'TRADFRI open/close remote',
        fromZigbee: [fz.battery, fz.command_cover_close, fz.legacy.cover_close, fz.command_cover_open, fz.legacy.cover_open,
            fz.command_cover_stop, fz.legacy.cover_stop],
        exposes: [e.battery(), e.action(['close', 'open', 'stop'])],
        toZigbee: [],
        meta: {configureKey: 1, battery: {dontDividePercentage: true}},
        ota: ota.tradfri,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            // By default this device controls group 0, some devices are by default in
            // group 0 causing the remote to control them.
            // By binding it to a random group, e.g. 901, it will send the commands to group 901 instead of 0
            // https://github.com/Koenkk/zigbee2mqtt/issues/2772#issuecomment-577389281
            await endpoint.bind('genOnOff', defaultBindGroup);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['GUNNARP panel round'],
        model: 'T1828',
        description: 'GUNNARP panel round',
        vendor: 'IKEA',
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [250, 454]}),
    },
    {
        zigbeeModel: ['GUNNARP panel 40*40'],
        model: 'T1829',
        description: 'GUNNARP panel 40*40',
        vendor: 'IKEA',
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [250, 454]}),
    },
    {
        zigbeeModel: ['TRADFRI bulb E12 WS opal 600lm'],
        model: 'LED1738G7',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E12 600 lumen, dimmable, white spectrum, opal white',
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [250, 454]}),
    },
    {
        zigbeeModel: ['TRADFRI bulb GU10 CWS 345lm'],
        model: 'LED1923R5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 345 lumen, dimmable, white spectrum, colour spectrum',
        extend: preset.light_onoff_brightness_colortemp_color(),
        ota: ota.tradfri,
        onEvent: ikea.bulbOnEvent,
    },

    // Philips
    {
        zigbeeModel: ['LWU001'],
        model: '9290024406',
        vendor: 'Philips',
        description: 'Hue P45 light bulb',
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTC002'],
        model: '4034031P7',
        vendor: 'Philips',
        description: 'Hue Fair',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['4034031P6'],
        model: '4034031P6',
        vendor: 'Philips',
        description: 'Hue Fair with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['4034030P6'],
        model: '4034030P6',
        vendor: 'Philips',
        description: 'Hue Fair with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWO003'],
        model: '8719514279131',
        vendor: 'Philips',
        description: 'Hue white E27 LED bulb filament giant globe',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTD011'],
        model: '5110131H5',
        vendor: 'Philips',
        description: 'Garnea downlight',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWA010'],
        model: '929002335001',
        vendor: 'Philips',
        description: 'Hue white A21 bulb B22 with Bluetooth (1600 Lumen)',
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTC012'],
        model: '3306431P7',
        vendor: 'Philips',
        description: 'Hue Struana',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1746130P7'],
        model: '1746130P7',
        vendor: 'Philips',
        description: 'Hue Attract',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1745630P7'],
        model: '1745630P7',
        vendor: 'Philips',
        description: 'Hue Nyro',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LDT001'],
        model: '5900131C5',
        vendor: 'Philips',
        description: 'Hue Aphelion downlight',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LLC012', 'LLC011'],
        model: '7299760PH',
        vendor: 'Philips',
        description: 'Hue Bloom',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['929002375901'],
        model: '929002375901',
        vendor: 'Philips',
        description: 'Hue Bloom with Bluetooth (White)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['929002376001'],
        model: '929002376001',
        vendor: 'Philips',
        description: 'Hue Bloom with Bluetooth (Black)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCP001', 'LCP002', '4090331P9_01', '4090331P9_02'],
        model: '4090331P9',
        vendor: 'Philips',
        description: 'Hue Ensis',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LLC020'],
        model: '7146060PH',
        vendor: 'Philips',
        description: 'Hue Go',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWA005'],
        model: '9290022411',
        vendor: 'Philips',
        description: 'Hue white single filament bulb A19 E26 with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWE001'],
        model: '929002039801',
        vendor: 'Philips',
        description: 'Hue white E12 with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWA007'],
        model: '929002277501',
        vendor: 'Philips',
        description: 'Hue white A19 bulb E26 with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWA008'],
        model: '9290023351',
        vendor: 'Philips',
        description: 'Hue white A21 bulb E26 with Bluetooth (1600 Lumen)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWA009'],
        model: '9290023349',
        vendor: 'Philips',
        description: 'Hue white A67 bulb E26 with Bluetooth (1600 Lumen)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCT026'],
        model: '7602031P7',
        vendor: 'Philips',
        description: 'Hue Go with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCF002', 'LCF001'],
        model: '8718696167991',
        vendor: 'Philips',
        description: 'Hue Calla outdoor',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCF005'],
        model: '8718696170557',
        vendor: 'Philips',
        description: 'Hue Calla outdoor',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1744130P7'],
        model: '1744130P7',
        vendor: 'Philips',
        description: 'Hue Econic outdoor Pedestal',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1745730V7'],
        model: '1745730V7',
        vendor: 'Philips',
        description: 'Hue Econic outdoor Pedestal',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1743830P7'],
        model: '1743830P7',
        vendor: 'Philips',
        description: 'Hue Econic outdoor wall lamp',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1743130P7'],
        model: '1743130P7',
        vendor: 'Philips',
        description: 'Hue Impress outdoor Pedestal',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCC001'],
        model: '4090531P7',
        vendor: 'Philips',
        description: 'Hue Flourish white and color ambiance ceiling light',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['4090531P9'],
        model: '4090531P9',
        vendor: 'Philips',
        description: 'Hue Flourish white and color ambiance ceiling light with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCG002'],
        model: '929001953101',
        vendor: 'Philips',
        description: 'Hue White and Color Ambiance GU10',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWA003'],
        model: '9290022268',
        vendor: 'Philips',
        description: 'Hue White A19 bulb with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWA004'],
        model: '8718699688820',
        vendor: 'Philips',
        description: 'Hue Filament Standard A60/E27 bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCB001'],
        model: '548727',
        vendor: 'Philips',
        description: 'Hue White and Color Ambiance BR30 with bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWB004'],
        model: '433714',
        vendor: 'Philips',
        description: 'Hue Lux A19 bulb E27',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWB006', 'LWB014'],
        model: '9290011370',
        vendor: 'Philips',
        description: 'Hue white A60 bulb E27/B22',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LDD001'],
        model: '8718696153055',
        vendor: 'Philips',
        description: 'Hue white table light',
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LDD002'],
        model: '8718696153062',
        vendor: 'Philips',
        description: 'Hue Muscari floor light',
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWA001'],
        model: '8718699673147',
        vendor: 'Philips',
        description: 'Hue white A60 bulb E27 bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWW003'],
        model: '9290018216',
        vendor: 'Philips',
        description: 'Hue white A60 bulb E27 bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWA011'],
        model: '929001821618',
        vendor: 'Philips',
        description: 'Hue white A60 bulb E27 bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWA002'],
        model: '9290018215',
        vendor: 'Philips',
        description: 'Hue white A19 bulb E26 bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTA001'],
        model: '9290022169',
        vendor: 'Philips',
        description: 'Hue white ambiance E27 with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCP003'],
        model: '4090631P7',
        vendor: 'Philips',
        description: 'Hue Flourish white and color ambiance pendant light',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWB010'],
        model: '8718696449691',
        vendor: 'Philips',
        description: 'Hue White A60 Single bulb E27/B22',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWG001'],
        model: '9290018195',
        vendor: 'Philips',
        description: 'Hue white GU10',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWG004'],
        model: 'LWG004',
        vendor: 'Philips',
        description: 'Hue white GU10 bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWO001'],
        model: '8718699688882',
        vendor: 'Philips',
        description: 'Hue white Filament bulb G93 E27 bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LST001'],
        model: '7299355PH',
        vendor: 'Philips',
        description: 'Hue white and color ambiance LightStrip',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LST002'],
        model: '915005106701',
        vendor: 'Philips',
        description: 'Hue white and color ambiance LightStrip plus',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LST003', 'LST004'],
        model: '9290018187B',
        vendor: 'Philips',
        description: 'Hue white and color ambiance LightStrip outdoor',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCL001'],
        model: '8718699703424',
        vendor: 'Philips',
        description: 'Hue white and color ambiance LightStrip plus',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCL002'],
        model: '9290022890',
        vendor: 'Philips',
        description: 'Hue white and color ambiance LightStrip outdoor 2m',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCA001', 'LCA002', 'LCA003'],
        model: '9290022166',
        vendor: 'Philips',
        description: 'Hue white and color ambiance E26/E27',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCT001', 'LCT007', 'LCT010', 'LCT012', 'LCT014', 'LCT015', 'LCT016', 'LCT021'],
        model: '9290012573A',
        vendor: 'Philips',
        description: 'Hue white and color ambiance E26/E27/E14',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1743930P7', '1744030P7'],
        model: '1743930P7',
        vendor: 'Philips',
        description: 'Hue Outdoor Econic wall lantern',
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCE001'],
        model: '929002294101',
        vendor: 'Philips',
        description: 'Hue White and Color Ambiance E12 with bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCE002'],
        model: '929002294203',
        vendor: 'Philips',
        description: 'Hue White and Color Ambiance E14 with bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCT002', 'LCT011'],
        model: '9290002579A',
        vendor: 'Philips',
        description: 'Hue white and color ambiance BR30',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWB022'],
        model: '9290018194',
        vendor: 'Philips',
        description: 'Hue white BR30',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCT003'],
        model: '8718696485880',
        vendor: 'Philips',
        description: 'Hue white and color ambiance GU10',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCT024', '440400982841'],
        model: '915005733701',
        vendor: 'Philips',
        description: 'Hue White and color ambiance Play Lightbar',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTW011', 'LTB002'],
        model: '464800',
        vendor: 'Philips',
        description: 'Hue white ambiance BR30 flood light',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTW012'],
        model: '8718696695203',
        vendor: 'Philips',
        description: 'Hue white ambiance E14',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTE002'],
        model: '9290022944',
        vendor: 'Philips',
        description: 'Hue white ambiance E14 (with Bluetooth)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWE002'],
        model: '9290020399',
        vendor: 'Philips',
        description: 'Hue white E14',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTW013'],
        model: '8718696598283',
        vendor: 'Philips',
        description: 'Hue white ambiance GU10',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTG002'],
        model: '929001953301',
        vendor: 'Philips',
        description: 'Hue white ambiance GU10 with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTD005'],
        model: '5995111U5',
        vendor: 'Philips',
        description: 'Hue white ambiance 5/6" retrofit recessed downlight',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTG001'],
        model: '9290019534',
        vendor: 'Philips',
        description: 'Hue white ambiance GU10 with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['3418131P6'],
        model: '3418131P6',
        vendor: 'Philips',
        description: 'Hue white ambiance Adore GU10 with Bluetooth (3 spots)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['3417931P6'],
        model: '3417931P6',
        vendor: 'Philips',
        description: 'Hue white ambiance Adore GU10 with Bluetooth (2 spots)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTW015'],
        model: '9290011998B',
        vendor: 'Philips',
        description: 'Hue white ambiance E26',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTA002'],
        model: '9290022167',
        vendor: 'Philips',
        description: 'Hue white ambiance E26 with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTA003'],
        model: '9290022267',
        vendor: 'Philips',
        description: 'Hue white ambiance E26 with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTW010', 'LTW001', 'LTW004'],
        model: '8718696548738',
        vendor: 'Philips',
        description: 'Hue white ambiance E26/E27',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTW017'],
        model: '915005587401',
        vendor: 'Philips',
        description: 'Hue white ambiance Adore light',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['3402831P7'],
        model: '3402831P7',
        vendor: 'Philips',
        description: 'Hue white ambiance bathroom mirror light Adore',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['3418411P6'],
        model: '3418411P6',
        vendor: 'Philips',
        description: 'Hue white ambiance bathroom ceiling light Adore with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTC021'],
        model: '3435011P7',
        vendor: 'Philips',
        description: 'Hue white ambiance bathroom ceiling light Adore',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTD003'],
        model: '4503848C5',
        vendor: 'Philips',
        description: 'Hue white ambiance Muscari pendant light',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTD009'],
        model: '5996311U5',
        vendor: 'Philips',
        description: 'Hue white ambiance 4" retrofit recessed downlight',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTD010'],
        model: '5996411U5',
        vendor: 'Philips',
        description: 'Hue white ambiance 5/6" retrofit recessed downlight',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCD001'],
        model: '5996511U5',
        vendor: 'Philips',
        description: 'Hue white and color ambiance 4" retrofit recessed downlight',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCD002'],
        model: '5996611U5',
        vendor: 'Philips',
        description: 'Hue white and color ambiance 5/6" retrofit recessed downlight',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCW001'],
        model: '4090130P7',
        vendor: 'Philips',
        description: 'Hue Sana',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCW002', '4090230P9'],
        model: '4090230P9',
        vendor: 'Philips',
        description: 'Hue Liane',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTC001'],
        model: '3261030P7',
        vendor: 'Philips',
        description: 'Hue Being',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['3261030P6'],
        model: '3261030P6',
        vendor: 'Philips',
        description: 'Hue Being black',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['3261031P6'],
        model: '3261031P6',
        vendor: 'Philips',
        description: 'Hue Being white',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['3261048P6'],
        model: '3261048P6',
        vendor: 'Philips',
        description: 'Hue Being aluminium',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['3216431P6'],
        model: '3216431P6',
        vendor: 'Philips',
        description: 'Hue Aurelle',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTP007'],
        model: '4505748C5',
        vendor: 'Philips',
        description: 'Hue Ambiance Pendant',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTP008'],
        model: '4098430P7',
        vendor: 'Philips',
        description: 'Hue Being Pendant',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTP011'],
        model: '4507748C5',
        vendor: 'Philips',
        description: 'Hue Semeru Ambiance Pendant',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTC003'],
        model: '3261331P7',
        vendor: 'Philips',
        description: 'Hue white ambiance Still',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTC011'],
        model: '4096730U7',
        vendor: 'Philips',
        description: 'Hue Cher ceiling light',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['4096730P6'],
        model: '4096730P6',
        vendor: 'Philips',
        description: 'Hue Cher ceiling light',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTC013'],
        model: '3216131P5',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle square panel light',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['3216131P6'],
        model: '3216131P6',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle square panel light',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['3216231P6'],
        model: '3216231P6',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle square panel light',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTC015'],
        model: '3216331P5',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle rectangle panel light',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['3216331P6'],
        model: '3216331P6',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle rectangle panel light',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTC016'],
        model: '3216431P5',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle round panel light',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['4033930P6'],
        model: '4033930P6',
        vendor: 'Philips',
        description: 'Hue white ambiance suspension Fair',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTP003', 'LTP001'],
        model: '4033930P7',
        vendor: 'Philips',
        description: 'Hue white ambiance suspension Fair',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTP002'],
        model: '4023330P7',
        vendor: 'Philips',
        description: 'Hue white ambiance suspension Amaze',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWF002', 'LWW001'],
        model: '9290011370B',
        vendor: 'Philips',
        description: 'Hue white A60 bulb E27',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWB015'],
        model: '046677476816',
        vendor: 'Philips',
        description: 'Hue white PAR38 outdoor',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LLC010'],
        model: '7199960PH',
        vendor: 'Philips',
        description: 'Hue Iris',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['929002376101'],
        model: '929002376101',
        vendor: 'Philips',
        description: 'Hue Iris (generation 2, white)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['929002376201'],
        model: '929002376201',
        vendor: 'Philips',
        description: 'Hue Iris (generation 2, black)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['929002376801'],
        model: '929002376801',
        vendor: 'Philips',
        description: 'Hue Iris (generation 4)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1742930P7'],
        model: '1742930P7',
        vendor: 'Philips',
        description: 'Hue outdoor Impress wall lamp',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1743030P7'],
        model: '1743030P7',
        vendor: 'Philips',
        description: 'Hue outdoor Impress wall lamp',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1745930P7'],
        model: '1745930P7',
        vendor: 'Philips',
        description: 'Hue outdoor Impress wall lamp (low voltage)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1743230P7'],
        model: '1743230P7',
        vendor: 'Philips',
        description: 'Hue outdoor Impress lantern',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1746430P7'],
        model: '1746430P7',
        vendor: 'Philips',
        description: 'Hue outdoor Resonate wall lamp',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LLC006'],
        model: '7099930PH',
        vendor: 'Philips',
        description: 'Hue Iris (Generation 2)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['4080248P9'],
        model: '4080248P9',
        vendor: 'Philips',
        description: 'Hue Signe floor light',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['4080148P9'],
        model: '4080148P9',
        vendor: 'Philips',
        description: 'Hue Signe table light',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5060730P7_01', '5060730P7_02', '5060730P7_03', '5060730P7_04', '5060730P7_05'],
        model: '5060730P7',
        vendor: 'Philips',
        description: 'Hue White & Color ambience Centris ceiling light (4 spots)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5061031P7_01', '5061031P7_02', '5061031P7_03'],
        model: '5061031P7',
        vendor: 'Philips',
        description: 'Hue White & Color ambience Centris ceiling light (2 spots)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5062131P7'],
        model: '5062131P7',
        vendor: 'Philips',
        description: 'Hue white and color ambience Argenta spot white (1 spot)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5062148P7'],
        model: '5062148P7',
        vendor: 'Philips',
        description: 'Hue white and color ambience Argenta spot aluminium (1 spot)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5062231P7'],
        model: '5062231P7',
        vendor: 'Philips',
        description: 'Hue white and color ambience Argenta spot white (2 spots)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5062248P7'],
        model: '5062248P7',
        vendor: 'Philips',
        description: 'Hue white and color ambience Argenta spot aluminium (2 spots)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5062331P7'],
        model: '5062331P7',
        vendor: 'Philips',
        description: 'Hue white and color ambience Argenta spot white (3 spots)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5062348P7'],
        model: '5062348P7',
        vendor: 'Philips',
        description: 'Hue white and color ambience Argenta spot aluminium (3 spots)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5062431P7'],
        model: '5062431P7',
        vendor: 'Philips',
        description: 'Hue white and color ambience Argenta spot white (4 spots)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5062448P7'],
        model: '5062448P7',
        vendor: 'Philips',
        description: 'Hue white and color ambience Argenta spot aluminium (4 spots)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5063231P7'],
        model: '5063231P7',
        vendor: 'Philips',
        description: 'Hue Bluetooth white & color ambiance spot Fugato (2 spots)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5063331P7'],
        model: '5063331P7',
        vendor: 'Philips',
        description: 'Hue Bluetooth white & color ambiance spot Fugato (3 spots)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5063431P7'],
        model: '5063431P7',
        vendor: 'Philips',
        description: 'Hue Bluetooth White & Color Ambiance spot Fugato (4 spots)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5045131P7'],
        model: '5045131P7',
        vendor: 'Philips',
        description: 'Hue Centura',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5045148P7'],
        model: '5045148P7',
        vendor: 'Philips',
        description: 'Hue Centura',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5055148P7'],
        model: '5055148P7',
        vendor: 'Philips',
        description: 'Hue Centura Aluminium (square)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5055131P7'],
        model: '5055131P7',
        vendor: 'Philips',
        description: 'Hue Centura White (square)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['RDM001'],
        model: '929003017102',
        vendor: 'Philips',
        description: 'Hue wall switch module',
        fromZigbee: [fz.battery, fz.hue_wall_switch_device_mode, fz.hue_wall_switch],
        exposes: [e.battery(), e.action(['left_press', 'left_press_release', 'right_press', 'right_press_release']),
            exposes.enum('device_mode', ea.ALL, ['single_rocker', 'single_push_button', 'dual_rocker', 'dual_push_button'])],
        toZigbee: [tz.hue_wall_switch_device_mode],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genOnOff', 'manuSpecificPhilips']);
            await reporting.batteryPercentageRemaining(endpoint);
            const options = {manufacturerCode: 0x100B, disableDefaultResponse: true};
            await endpoint.write('genBasic', {0x0034: {value: 0, type: 48}}, options);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['RWL020', 'RWL021'],
        model: '324131092621',
        vendor: 'Philips',
        description: 'Hue dimmer switch',
        fromZigbee: [fz.ignore_command_on, fz.ignore_command_off, fz.ignore_command_step, fz.ignore_command_stop,
            fz.legacy.hue_dimmer_switch, fz.battery],
        exposes: [e.battery(), e.action(['on-press', 'on-hold', 'on-hold-release', 'up-press', 'up-hold', 'up-hold-release',
            'down-press', 'down-hold', 'down-hold-release', 'off-press', 'off-hold', 'off-hold-release'])],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);

            const endpoint2 = device.getEndpoint(2);
            const options = {manufacturerCode: 0x100B, disableDefaultResponse: true};
            await endpoint2.write('genBasic', {0x0031: {value: 0x000B, type: 0x19}}, options);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['manuSpecificPhilips', 'genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint2);
        },
        endpoint: (device) => {
            return {'ep1': 1, 'ep2': 2};
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['RWL022'],
        model: '929002398602',
        vendor: 'Philips',
        description: 'Hue dimmer switch',
        fromZigbee: [fz.ignore_command_on, fz.ignore_command_off, fz.ignore_command_step, fz.ignore_command_stop,
            fz.hue_dimmer_switch, fz.battery],
        exposes: [e.battery(), e.action(['on_press', 'on_hold', 'on_press_release', 'on_hold_release',
            'off_press', 'off_hold', 'off_press_release', 'off_hold_release', 'up_press', 'up_hold', 'up_press_release', 'up_hold_release',
            'down_press', 'down_hold', 'down_press_release', 'down_hold_release'])],
        toZigbee: [],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'manuSpecificPhilips', 'genPowerCfg']);
            const options = {manufacturerCode: 0x100B, disableDefaultResponse: true};
            await endpoint.write('genBasic', {0x0031: {value: 0x000B, type: 0x19}}, options);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['ROM001'],
        model: '8718699693985',
        vendor: 'Philips',
        description: 'Hue smart button',
        fromZigbee: [fz.command_on, fz.command_off_with_effect, fz.legacy.SmartButton_skip, fz.hue_smart_button_event, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.action(['on', 'off', 'skip_backward', 'skip_forward', 'press', 'hold', 'release'])],
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);

            const options = {manufacturerCode: 0x100B, disableDefaultResponse: true};
            await endpoint.write('genBasic', {0x0031: {value: 0x000B, type: 0x19}}, options);
            await reporting.bind(endpoint, coordinatorEndpoint, ['manuSpecificPhilips', 'genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SML001'],
        model: '9290012607',
        vendor: 'Philips',
        description: 'Hue motion sensor',
        fromZigbee: [fz.battery, fz.occupancy, fz.temperature, fz.occupancy_timeout, fz.illuminance,
            fz.hue_motion_sensitivity, fz.hue_motion_led_indication],
        exposes: [e.temperature(), e.occupancy(), e.battery(), e.illuminance_lux(), e.illuminance(),
            exposes.enum('motion_sensitivity', ea.ALL, ['low', 'medium', 'high']),
            exposes.binary('led_indication', ea.ALL, true, false).withDescription('Blink green LED on motion detection'),
            exposes.numeric('occupancy_timeout', ea.ALL).withUnit('second').withValueMin(0).withValueMax(65535)],
        toZigbee: [tz.occupancy_timeout, tz.hue_motion_sensitivity, tz.hue_motion_led_indication],
        endpoint: (device) => {
            return {
                'default': 2, // default
                'ep1': 1,
                'ep2': 2, // e.g. for write to msOccupancySensing
            };
        },
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            const binds = ['genPowerCfg', 'msIlluminanceMeasurement', 'msTemperatureMeasurement', 'msOccupancySensing'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.occupancy(endpoint);
            await reporting.temperature(endpoint);
            await reporting.illuminance(endpoint);
            // read occupancy_timeout and motion_sensitivity
            await endpoint.read('msOccupancySensing', ['pirOToUDelay']);
            await endpoint.read('msOccupancySensing', [48], {manufacturerCode: 4107});
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SML002'],
        model: '9290019758',
        vendor: 'Philips',
        description: 'Hue motion outdoor sensor',
        fromZigbee: [fz.battery, fz.occupancy, fz.temperature, fz.illuminance, fz.occupancy_timeout,
            fz.hue_motion_sensitivity, fz.hue_motion_led_indication],
        exposes: [e.temperature(), e.occupancy(), e.battery(), e.illuminance_lux(), e.illuminance(),
            exposes.enum('motion_sensitivity', ea.ALL, ['low', 'medium', 'high']),
            exposes.binary('led_indication', ea.ALL, true, false).withDescription('Blink green LED on motion detection'),
            exposes.numeric('occupancy_timeout', ea.ALL).withUnit('second').withValueMin(0).withValueMax(65535)],
        toZigbee: [tz.occupancy_timeout, tz.hue_motion_sensitivity, tz.hue_motion_led_indication],
        endpoint: (device) => {
            return {
                'default': 2, // default
                'ep1': 1,
                'ep2': 2, // e.g. for write to msOccupancySensing
            };
        },
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            const binds = ['genPowerCfg', 'msIlluminanceMeasurement', 'msTemperatureMeasurement', 'msOccupancySensing'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.occupancy(endpoint);
            await reporting.temperature(endpoint);
            await reporting.illuminance(endpoint);
            // read occupancy_timeout and motion_sensitivity
            await endpoint.read('msOccupancySensing', ['pirOToUDelay']);
            await endpoint.read('msOccupancySensing', [48], {manufacturerCode: 4107});
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LOM001'],
        model: '929002240401',
        vendor: 'Philips',
        description: 'Hue smart plug - EU',
        extend: preset.switch(),
        toZigbee: [tz.on_off].concat([tz.hue_power_on_behavior, tz.hue_power_on_error]),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LOM002', 'LOM004'],
        model: '046677552343',
        vendor: 'Philips',
        description: 'Hue smart plug bluetooth',
        extend: preset.switch(),
        toZigbee: [tz.on_off].concat([tz.hue_power_on_behavior, tz.hue_power_on_error]),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LOM003'],
        model: '8718699689308',
        vendor: 'Philips',
        description: 'Hue smart plug - UK',
        extend: preset.switch(),
        toZigbee: [tz.on_off].concat([tz.hue_power_on_behavior, tz.hue_power_on_error]),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LOM005'],
        model: '9290022408',
        vendor: 'Philips',
        description: 'Hue smart plug - AU',
        extend: preset.switch(),
        toZigbee: [tz.on_off].concat([tz.hue_power_on_behavior, tz.hue_power_on_error]),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LOM006'],
        model: '9290024426',
        vendor: 'Philips',
        description: 'Hue smart plug - CH',
        extend: preset.switch(),
        toZigbee: [tz.on_off].concat([tz.hue_power_on_behavior, tz.hue_power_on_error]),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LLC014'],
        model: '7099860PH',
        vendor: 'Philips',
        description: 'LivingColors Aura',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTC014'],
        model: '3216231P5',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle rectangle panel light',
        ota: ota.zigbeeOTA,
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['1744530P7', '1744630P7', '1744430P7', '1744730P7'],
        model: '8718696170625',
        vendor: 'Philips',
        description: 'Hue Fuzo outdoor wall light',
        ota: ota.zigbeeOTA,
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['1743630P7', '1743630V7'],
        model: '17436/30/P7',
        vendor: 'Philips',
        description: 'Hue Welcome white flood light',
        ota: ota.zigbeeOTA,
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['1743530P7', '1743530V7'],
        model: '17435/30/P7',
        vendor: 'Philips',
        description: 'Hue Discover white and color ambiance flood light',
        ota: ota.zigbeeOTA,
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['1746330P7', '1746347P7'],
        model: '1746330P7',
        vendor: 'Philips',
        description: 'Hue Appear outdoor wall light',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCS001'],
        model: '1741830P7',
        vendor: 'Philips',
        description: 'Hue Lily outdoor spot light',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1741530P7', '1741430P7'],
        model: '1741530P7',
        vendor: 'Philips',
        description: 'Hue Lily outdoor spot light',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1746230V7'],
        model: '1746230V7',
        vendor: 'Philips',
        description: 'Hue Lily XL outdoor spot light',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCL003'],
        model: '9290022891',
        vendor: 'Philips',
        description: 'Hue Lily outdoor led strip',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWV001'],
        model: '929002241201',
        vendor: 'Philips',
        description: 'Hue white filament Edison E27 LED',
        ota: ota.zigbeeOTA,
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWV002'],
        model: '046677551780',
        vendor: 'Philips',
        description: 'Hue white filament Edison ST19 LED',
        ota: ota.zigbeeOTA,
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LWV003'],
        model: '929002459201',
        vendor: 'Philips',
        description: 'Hue white filament Edison ST72 E27 LED',
        ota: ota.zigbeeOTA,
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['HML004'],
        model: '3115331PH',
        vendor: 'Philips',
        description: 'Phoenix light',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LLM001'],
        model: '7121131PU',
        vendor: 'Philips',
        description: 'Hue Beyond white and color ambiance suspension light',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5041131P9'],
        model: '5041131P9',
        vendor: 'Philips',
        description: 'Hue White ambiance Milliskin',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5042131P9'],
        model: '5042131P9',
        vendor: 'Philips',
        description: 'Hue White ambiance Milliskin (square)',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5047131P9'],
        model: '5047131P9',
        vendor: 'Philips',
        description: 'Hue White ambiance Buckram',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['HML006'],
        model: '7531609',
        vendor: 'Philips',
        description: 'Hue Phoenix downlight',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['3418631P6'],
        model: '3418631P6',
        vendor: 'Philips',
        description: 'Hue Adore bathroom mirror',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.hue.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
        ota: ota.zigbeeOTA,
    },

    // Belkin
    {
        zigbeeModel: ['MZ100'],
        model: 'F7C033',
        vendor: 'Belkin',
        description: 'WeMo smart LED bulb',
        extend: preset.light_onoff_brightness(),
    },

    // EDP
    {
        zigbeeModel: ['ZB-SmartPlug-1.0.0'],
        model: 'PLUG EDP RE:DY',
        vendor: 'EDP',
        description: 're:dy plug',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(85);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ['ZB-RelayControl-1.0.0'],
        model: 'SWITCH EDP RE:DY',
        vendor: 'EDP',
        description: 're:dy switch',
        extend: preset.switch(),
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(85);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },

    // Custom devices (DiY)
    {
        zigbeeModel: ['ti.router'],
        model: 'ti.router',
        vendor: 'Custom devices (DiY)',
        description: 'Texas Instruments router',
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(8);
            const payload = [{attribute: 'zclVersion', minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0}];
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
            await endpoint.configureReporting('genBasic', payload);
        },
    },
    {
        zigbeeModel: ['lumi.router'],
        model: 'CC2530.ROUTER',
        vendor: 'Custom devices (DiY)',
        description: '[CC2530 router](http://ptvo.info/cc2530-based-zigbee-coordinator-and-router-112/)',
        fromZigbee: [fz.CC2530ROUTER_led, fz.CC2530ROUTER_meta, fz.ignore_basic_report],
        toZigbee: [tz.ptvo_switch_trigger],
        exposes: [exposes.binary('led', ea.STATE, true, false)],
    },
    {
        zigbeeModel: ['cc2538.router.v1'],
        model: 'CC2538.ROUTER.V1',
        vendor: 'Custom devices (DiY)',
        description: '[MODKAM stick СС2538 router](https://github.com/jethome-ru/zigbee-firmware/tree/master/ti/router/cc2538_cc2592)',
        fromZigbee: [fz.ignore_basic_report],
        toZigbee: [],
        exposes: [],
    },
    {
        zigbeeModel: ['cc2538.router.v2'],
        model: 'CC2538.ROUTER.V2',
        vendor: 'Custom devices (DiY)',
        description: '[MODKAM stick СС2538 router with temperature sensor]' +
            '(https://github.com/jethome-ru/zigbee-firmware/tree/master/ti/router/cc2538_cc2592)',
        fromZigbee: [fz.ignore_basic_report, fz.device_temperature],
        toZigbee: [],
        exposes: [e.device_temperature()],
    },
    {
        zigbeeModel: ['ptvo.switch'],
        model: 'ptvo.switch',
        vendor: 'Custom devices (DiY)',
        description: '[Multi-channel relay switch](https://ptvo.info/zigbee-switch-configurable-firmware-router-199/)',
        fromZigbee: [fz.on_off, fz.ptvo_multistate_action, fz.legacy.ptvo_switch_buttons, fz.ptvo_switch_uart,
            fz.ptvo_switch_analog_input, fz.brightness, fz.ignore_basic_report],
        toZigbee: [tz.ptvo_switch_trigger, tz.ptvo_switch_uart, tz.ptvo_switch_analog_input, tz.ptvo_switch_light_brightness, tz.on_off],
        exposes: [exposes.text('action').withAccess(ea.STATE_SET)].concat(((enpoinsCount) => {
            const features = [];
            for (let i = 1; i <= enpoinsCount; i++) {
                const epName = `l${i}`;
                features.push(e.switch().withEndpoint(epName));
                features.push(exposes.text(epName, ea.ALL).withEndpoint(epName)
                    .withProperty(epName).withDescription('State or sensor value'));
            }
            return features;
        })(16)),
        meta: {multiEndpoint: true, tuyaThermostatPreset: fz.legacy /* for subclassed custom converters */},
        endpoint: (device) => {
            return {
                l1: 1, l2: 2, l3: 3, l4: 4, l5: 5, l6: 6, l7: 7, l8: 8,
                l9: 9, l10: 10, l11: 11, l12: 12, l13: 13, l14: 14, l15: 15, l16: 16,
                action: 1,
            };
        },
    },
    {
        zigbeeModel: ['DNCKAT_D001'],
        model: 'DNCKATSD001',
        vendor: 'Custom devices (DiY)',
        description: '[DNCKAT single key wired wall dimmable light switch](https://github.com/dzungpv/dnckatsw00x/)',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['DNCKAT_S001'],
        model: 'DNCKATSW001',
        vendor: 'Custom devices (DiY)',
        description: '[DNCKAT single key wired wall light switch](https://github.com/dzungpv/dnckatsw00x/)',
        extend: preset.switch(),
    },
    {
        zigbeeModel: ['DNCKAT_S002'],
        model: 'DNCKATSW002',
        vendor: 'Custom devices (DiY)',
        description: '[DNCKAT double key wired wall light switch](https://github.com/dzungpv/dnckatsw00x/)',
        fromZigbee: [fz.on_off, fz.DNCKAT_S00X_buttons],
        meta: {multiEndpoint: true},
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'),
            e.action(['release_left', 'hold_left', 'release_right', 'hold_right'])],
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
    },
    {
        zigbeeModel: ['DNCKAT_S003'],
        model: 'DNCKATSW003',
        vendor: 'Custom devices (DiY)',
        description: '[DNCKAT triple key wired wall light switch](https://github.com/dzungpv/dnckatsw00x/)',
        fromZigbee: [fz.on_off, fz.DNCKAT_S00X_buttons],
        meta: {multiEndpoint: true},
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'), e.switch().withEndpoint('center'),
            e.action(['release_left', 'hold_left', 'release_right', 'hold_right', 'release_center', 'hold_center'])],
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
    },
    {
        zigbeeModel: ['DNCKAT_S004'],
        model: 'DNCKATSW004',
        vendor: 'Custom devices (DiY)',
        description: '[DNCKAT quadruple key wired wall light switch](https://github.com/dzungpv/dnckatsw00x/)',
        fromZigbee: [fz.on_off, fz.DNCKAT_S00X_buttons],
        meta: {multiEndpoint: true},
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('bottom_left'), e.switch().withEndpoint('bottom_right'),
            e.switch().withEndpoint('top_left'), e.switch().withEndpoint('top_right'),
            e.action([
                'release_bottom_left', 'hold_bottom_left', 'release_bottom_right', 'hold_bottom_right',
                'release_top_left', 'hold_top_left', 'release_top_right', 'hold_top_right',
            ])],
        endpoint: (device) => {
            return {'bottom_left': 1, 'bottom_right': 2, 'top_left': 3, 'top_right': 4};
        },
    },
    {
        zigbeeModel: ['ZigUP'],
        model: 'ZigUP',
        vendor: 'Custom devices (DiY)',
        description: '[CC2530 based ZigBee relais, switch, sensor and router](https://github.com/formtapez/ZigUP/)',
        fromZigbee: [fz.ZigUP],
        toZigbee: [tz.on_off, tz.light_color, tz.ZigUP_lock],
        exposes: [e.switch()],
    },
    {
        zigbeeModel: ['ZWallRemote0'],
        model: 'ZWallRemote0',
        vendor: 'Custom devices (DiY)',
        description: '[Matts Wall Switch Remote](https://github.com/mattlokes/ZWallRemote)',
        fromZigbee: [fz.command_toggle],
        toZigbee: [],
        exposes: [e.action(['toggle'])],
    },

    // OpenLumi
    {
        zigbeeModel: ['openlumi.gw_router.jn5169'],
        model: 'GWRJN5169',
        vendor: 'OpenLumi',
        description: '[Lumi Router (JN5169)](https://github.com/igo-r/Lumi-Router-JN5169)',
        fromZigbee: [fz.ignore_basic_report, fz.device_temperature],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genDeviceTempCfg']);
            await reporting.deviceTemperature(endpoint, {min: repInterval.MINUTE, max: repInterval.MINUTES_5});
        },
        exposes: [e.device_temperature()],
    },

    // databyte.ch
    {
        zigbeeModel: ['DTB190502A1'],
        model: 'DTB190502A1',
        vendor: 'databyte.ch',
        description: '[CC2530 based IO Board](https://databyte.ch/zigbee-dev-board-dtb190502a)',
        fromZigbee: [fz.DTB190502A1],
        toZigbee: [tz.DTB190502A1_LED],
        exposes: [exposes.binary('led_state', ea.STATE, 'ON', 'OFF'),
            exposes.enum('key_state', ea.STATE, ['KEY_SYS', 'KEY_UP', 'KEY_DOWN', 'KEY_NONE'])],
    },
    {
        zigbeeModel: ['DTB-ED2004-012'],
        model: 'ED2004-012',
        vendor: 'databyte.ch',
        description: 'Panda 1 - wall switch (https://databyte.ch/panda1-wallswitch-zigbee)',
        extend: preset.switch(),
    },

    // DIYRuZ
    {
        zigbeeModel: ['DIYRuZ_R4_5'],
        model: 'DIYRuZ_R4_5',
        vendor: 'DIYRuZ',
        description: '[DiY 4 Relays + 4 switches + 1 buzzer](http://modkam.ru/?p=1054)',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('bottom_left'), e.switch().withEndpoint('bottom_right'),
            e.switch().withEndpoint('top_left'), e.switch().withEndpoint('top_right'), e.switch().withEndpoint('center')],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'bottom_left': 1, 'bottom_right': 2, 'top_left': 3, 'top_right': 4, 'center': 5};
        },
    },
    {
        zigbeeModel: ['DIYRuZ_KEYPAD20'],
        model: 'DIYRuZ_KEYPAD20',
        vendor: 'DIYRuZ',
        description: '[DiY 20 button keypad](http://modkam.ru/?p=1114)',
        fromZigbee: [fz.keypad20states, fz.keypad20_battery],
        toZigbee: [],
        exposes: [e.battery()],
        endpoint: (device) => {
            return {
                btn_1: 1, btn_2: 2, btn_3: 3, btn_4: 4, btn_5: 5, btn_6: 6, btn_7: 7, btn_8: 8, btn_9: 9, btn_10: 10,
                btn_11: 11, btn_12: 12, btn_13: 13, btn_14: 14, btn_15: 15, btn_16: 16, btn_17: 17, btn_18: 18, btn_19: 19, btn_20: 20,
            };
        },
    },
    {
        zigbeeModel: ['DIYRuZ_magnet'],
        model: 'DIYRuZ_magnet',
        vendor: 'DIYRuZ',
        description: '[DIYRuZ contact sensor](https://modkam.ru/?p=1220)',
        fromZigbee: [fz.keypad20_battery, fz.diyruz_contact],
        exposes: [e.battery(), e.contact()],
        toZigbee: [],
    },
    {
        zigbeeModel: ['DIYRuZ_rspm'],
        model: 'DIYRuZ_rspm',
        vendor: 'DIYRuZ',
        description: '[DIYRuZ relay switch power meter](https://modkam.ru/?p=1309)',
        fromZigbee: [fz.diyruz_rspm],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.cpu_temperature(), e.action(['hold', 'release'])],
        endpoint: (device) => {
            return {default: 8};
        },
    },
    {
        zigbeeModel: ['DIYRuZ_FreePad', 'FreePadLeTV8'],
        model: 'DIYRuZ_FreePad',
        vendor: 'DIYRuZ',
        description: '[DiY 8/12/20 button keypad](http://modkam.ru/?p=1114)',
        fromZigbee: [fz.diyruz_freepad_clicks, fz.diyruz_freepad_config, fz.battery],
        exposes: [e.battery(), e.action(['*_single', '*_double', '*_triple', '*_quadruple', '*_release'])].concat(((enpoinsCount) => {
            const features = [];
            for (let i = 1; i <= enpoinsCount; i++) {
                const epName = `button_${i}`;
                features.push(
                    exposes.enum('switch_type', ea.ALL, ['toggle', 'momentary', 'multifunction']).withEndpoint(epName));
                features.push(exposes.enum('switch_actions', ea.ALL, ['on', 'off', 'toggle']).withEndpoint(epName));
            }
            return features;
        })(20)),
        toZigbee: [tz.diyruz_freepad_on_off_config, tz.factory_reset],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            if (device.applicationVersion < 3) { // Legacy PM2 firmwares
                const payload = [{
                    attribute: 'batteryPercentageRemaining', minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0,
                }, {
                    attribute: 'batteryVoltage', minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0,
                }];
                await endpoint.configureReporting('genPowerCfg', payload);
            }
            device.endpoints.forEach(async (ep) => {
                if (ep.outputClusters.includes(18)) {
                    await reporting.bind(ep, coordinatorEndpoint, ['genMultistateInput']);
                }
            });
        },
        endpoint: (device) => {
            return {
                button_1: 1, button_2: 2, button_3: 3, button_4: 4, button_5: 5,
                button_6: 6, button_7: 7, button_8: 8, button_9: 9, button_10: 10,
                button_11: 11, button_12: 12, button_13: 13, button_14: 14, button_15: 15,
                button_16: 16, button_17: 17, button_18: 18, button_19: 19, button_20: 20,
            };
        },
    },
    {
        zigbeeModel: ['FreePad_LeTV_8'],
        model: 'FreePad_LeTV_8',
        vendor: 'DIYRuZ',
        description: '[LeTV 8key FreePad mod](https://modkam.ru/?p=1791)',
        fromZigbee: [fz.diyruz_freepad_clicks, fz.diyruz_freepad_config, fz.battery],
        exposes: [e.battery(), e.action(['*_single', '*_double', '*_triple', '*_quadruple', '*_release'])].concat(((enpoinsCount) => {
            const features = [];
            for (let i = 1; i <= enpoinsCount; i++) {
                const epName = `button_${i}`;
                features.push(
                    exposes.enum('switch_type', ea.ALL, ['toggle', 'momentary', 'multifunction']).withEndpoint(epName));
                features.push(exposes.enum('switch_actions', ea.ALL, ['on', 'off', 'toggle']).withEndpoint(epName));
            }
            return features;
        })(8)),
        toZigbee: [tz.diyruz_freepad_on_off_config, tz.factory_reset],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            if (device.applicationVersion < 3) { // Legacy PM2 firmwares
                const payload = [{
                    attribute: 'batteryPercentageRemaining', minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0,
                }, {
                    attribute: 'batteryVoltage', minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0,
                }];
                await endpoint.configureReporting('genPowerCfg', payload);
            }
            device.endpoints.forEach(async (ep) => {
                if (ep.outputClusters.includes(18)) {
                    await reporting.bind(ep, coordinatorEndpoint, ['genMultistateInput']);
                }
            });
        },
        endpoint: (device) => {
            return {button_1: 1, button_2: 2, button_3: 3, button_4: 4, button_5: 5, button_6: 6, button_7: 7, button_8: 8};
        },
    },
    {
        zigbeeModel: ['DIYRuZ_Geiger'],
        model: 'DIYRuZ_Geiger',
        vendor: 'DIYRuZ',
        description: '[DiY Geiger counter](https://modkam.ru/?p=1591)',
        fromZigbee: [fz.diyruz_geiger, fz.command_on, fz.command_off, fz.diyruz_geiger_config],
        exposes: [e.action(['on', 'off']),
            exposes.numeric('radioactive_events_per_minute', ea.STATE).withUnit('rpm')
                .withDescription('Current count radioactive pulses per minute'),
            exposes.numeric('radiation_dose_per_hour', ea.STATE).withUnit('μR/h').withDescription('Current radiation level'),
            exposes.binary('led_feedback', ea.ALL, 'ON', 'OFF').withDescription('Enable LED feedback'),
            exposes.binary('buzzer_feedback', ea.ALL, 'ON', 'OFF').withDescription('Enable buzzer feedback'),
            exposes.numeric('alert_threshold', ea.ALL).withUnit('μR/h').withDescription('Critical radiation level'),
            exposes.enum('sensors_type', ea.ALL, ['СБМ-20/СТС-5/BOI-33', 'СБМ-19/СТС-6', 'Others'])
                .withDescription('Type of installed tubes'),
            exposes.numeric('sensors_count', ea.ALL).withDescription('Count of installed tubes'),
            exposes.numeric('sensitivity', ea.ALL).withDescription('This is applicable if tubes type is set to other')],
        toZigbee: [tz.diyruz_geiger_config, tz.factory_reset],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msIlluminanceMeasurement', 'genOnOff']);

            const payload = [
                {attribute: {ID: 0xF001, type: 0x21}, minimumReportInterval: 0, maximumReportInterval: repInterval.MINUTE,
                    reportableChange: 0},
                {attribute: {ID: 0xF002, type: 0x23}, minimumReportInterval: 0, maximumReportInterval: repInterval.MINUTE,
                    reportableChange: 0}];
            await endpoint.configureReporting('msIlluminanceMeasurement', payload);
        },
    },
    {
        zigbeeModel: ['DIYRuZ_R8_8'],
        model: 'DIYRuZ_R8_8',
        vendor: 'DIYRuZ',
        description: '[DiY 8 Relays + 8 switches](https://modkam.ru/?p=1638)',
        fromZigbee: [fz.on_off, fz.ptvo_multistate_action, fz.legacy.ptvo_switch_buttons, fz.ignore_basic_report],
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'),
            e.switch().withEndpoint('l3'), e.switch().withEndpoint('l4'), e.switch().withEndpoint('l5'), e.switch().withEndpoint('l6'),
            e.switch().withEndpoint('l7'), e.switch().withEndpoint('l8')],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {
                'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4, 'l5': 5, 'l6': 6, 'l7': 7, 'l8': 8,
            };
        },
    },
    {
        zigbeeModel: ['DIYRuZ_RT'],
        model: 'DIYRuZ_RT',
        vendor: 'DIYRuZ',
        description: '[DiY CC2530 Zigbee 3.0 firmware](https://habr.com/ru/company/iobroker/blog/495926/)',
        fromZigbee: [fz.on_off, fz.temperature],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.temperature()],
    },
    {
        zigbeeModel: ['DIYRuZ_Flower'],
        model: 'DIYRuZ_Flower',
        vendor: 'DIYRuZ',
        description: '[Flower sensor](http://modkam.ru/?p=1700)',
        fromZigbee: [fz.temperature, fz.humidity, fz.illuminance, fz.soil_moisture, fz.pressure, fz.battery],
        toZigbee: [tz.factory_reset],
        meta: {configureKey: 1, multiEndpoint: true},
        endpoint: (device) => {
            return {'bme': 1, 'ds': 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const firstEndpoint = device.getEndpoint(1);
            const secondEndpoint = device.getEndpoint(2);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement',
                'msIlluminanceMeasurement', 'msSoilMoisture']);
            await reporting.bind(secondEndpoint, coordinatorEndpoint, ['msTemperatureMeasurement']);
            const overides = {min: 0, max: 3600, change: 0};
            await reporting.batteryVoltage(firstEndpoint, overides);
            await reporting.batteryPercentageRemaining(firstEndpoint, overides);
            await reporting.temperature(firstEndpoint, overides);
            await reporting.humidity(firstEndpoint, overides);
            await reporting.pressureExtended(firstEndpoint, overides);
            await reporting.illuminance(firstEndpoint, overides);
            await reporting.soil_moisture(firstEndpoint, overides);
            await reporting.temperature(secondEndpoint, overides);
            await firstEndpoint.read('msPressureMeasurement', ['scale']);
        },
        exposes: [e.soil_moisture(), e.battery(), e.illuminance(), e.humidity(), e.pressure(),
            e.temperature().withEndpoint('ds'),
            e.temperature().withEndpoint('bme'),
        ],
    },
    {
        zigbeeModel: ['DIYRuZ_AirSense'],
        model: 'DIYRuZ_AirSense',
        vendor: 'DIYRuZ',
        description: '[Air quality sensor](https://modkam.ru/?p=1715)',
        fromZigbee: [fz.temperature, fz.humidity, fz.co2, fz.pressure, fz.diyruz_airsense_config_co2,
            fz.diyruz_airsense_config_temp, fz.diyruz_airsense_config_pres, fz.diyruz_airsense_config_hum],
        toZigbee: [tz.factory_reset, tz.diyruz_airsense_config],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const clusters = ['msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement', 'msCO2'];
            await reporting.bind(endpoint, coordinatorEndpoint, clusters);
            for (const cluster of clusters) {
                await endpoint.configureReporting(cluster, [
                    {attribute: 'measuredValue', minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0},
                ]);
            }
            await endpoint.read('msPressureMeasurement', ['scale']);
        },
        exposes: [e.co2(), e.temperature(), e.humidity(), e.pressure(),
            exposes.binary('led_feedback', ea.ALL, 'ON', 'OFF').withDescription('Enable LEDs feedback'),
            exposes.binary('enable_abc', ea.ALL, 'ON', 'OFF').withDescription('Enable ABC (Automatic Baseline Correction)'),
            exposes.numeric('threshold1', ea.ALL).withUnit('ppm').withDescription('Warning (LED2) CO2 level'),
            exposes.numeric('threshold2', ea.ALL).withUnit('ppm').withDescription('Critical (LED3) CO2 level'),
            exposes.numeric('temperature_offset', ea.ALL).withUnit('°C').withDescription('Adjust temperature'),
            exposes.numeric('humidity_offset', ea.ALL).withUnit('%').withDescription('Adjust humidity'),
            exposes.numeric('pressure_offset', ea.ALL).withUnit('hPa').withDescription('Adjust pressure')],
    },

    // eCozy
    {
        zigbeeModel: ['Thermostat'],
        model: '1TST-EU',
        vendor: 'eCozy',
        description: 'Smart heating thermostat',
        fromZigbee: [fz.battery, fz.legacy.thermostat_att_report],
        toZigbee: [tz.factory_reset, tz.thermostat_local_temperature, tz.thermostat_local_temperature_calibration, tz.thermostat_occupancy,
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint, tz.thermostat_setpoint_raise_lower,
            tz.thermostat_remote_sensing, tz.thermostat_control_sequence_of_operation, tz.thermostat_system_mode,
            tz.thermostat_weekly_schedule, tz.thermostat_clear_weekly_schedule, tz.thermostat_relay_status_log,
            tz.thermostat_pi_heating_demand, tz.thermostat_running_state],
        exposes: [e.battery(), exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 1).withLocalTemperature()
            .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withLocalTemperatureCalibration()
            .withPiHeatingDemand(ea.STATE_GET)],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(3);
            const binds = ['genBasic', 'genPowerCfg', 'genIdentify', 'genTime', 'genPollCtrl', 'hvacThermostat', 'hvacUserInterfaceCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
        },
    },

    // GS
    {
        zigbeeModel: ['SSHM-I1'],
        model: 'SSHM-I1',
        vendor: 'GS',
        description: 'Smoke detector',
        fromZigbee: [fz.ias_smoke_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.smoke(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['BRHM8E27W70-I1'],
        model: 'BRHM8E27W70-I1',
        vendor: 'GS',
        description: 'Smart dimmable, RGB + white (E27 & B22)',
        extend: preset.light_onoff_brightness_color(),
    },

    // M-ELEC - https://melec.com.au/stitchy/
    {
        zigbeeModel: ['ML-ST-D200'],
        model: 'ML-ST-D200',
        vendor: 'M-ELEC',
        description: 'Stitchy Dim switchable wall module',
        extend: preset.light_onoff_brightness(),
    },

    // OSRAM
    {
        zigbeeModel: ['Gardenspot RGB'],
        model: '73699',
        vendor: 'OSRAM',
        description: ' Gardenspot LED mini RGB',
        extend: preset.ledvance.light_onoff_brightness_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Outdoor Lantern W RGBW OSRAM'],
        model: '4058075816718',
        vendor: 'OSRAM',
        description: 'SMART+ outdoor wall lantern RGBW',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Outdoor Lantern B50 RGBW OSRAM'],
        model: '4058075816732',
        vendor: 'OSRAM',
        description: 'SMART+ outdoor lantern RGBW',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Classic A60 RGBW'],
        model: 'AA69697',
        vendor: 'OSRAM',
        description: 'Classic A60 RGBW',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['B40 TW Value'],
        model: 'AC25704',
        vendor: 'LEDVANCE',
        description: 'Classic E14 tunable white',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A60 TW Z3'],
        model: 'AC10787',
        vendor: 'OSRAM',
        description: 'SMART+ classic E27 TW',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A60 TW Value II'],
        model: 'AC25702',
        vendor: 'LEDVANCE',
        description: 'Classic E27 Tunable White',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['CLA60 RGBW OSRAM'],
        model: 'AC03645',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED CLA60 E27 RGBW',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
        exposes: [e.light_brightness_colortemp_colorhs([153, 526]), e.effect()],
    },
    {
        zigbeeModel: ['CLA60 TW OSRAM'],
        model: 'AC03642',
        vendor: 'OSRAM',
        description: 'SMART+ CLASSIC A 60 TW',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR16 DIM Z3'],
        model: 'AC08560-DIM',
        vendor: 'OSRAM',
        description: 'SMART+ LED PAR16 GU10',
        extend: preset.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A60 DIM Z3'],
        model: 'AC10786-DIM',
        vendor: 'OSRAM',
        description: 'SMART+ classic E27 dimmable',
        extend: preset.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['CLA60 RGBW Z3'],
        model: 'AC03647',
        vendor: 'OSRAM',
        description: 'SMART+ LED CLASSIC E27 RGBW',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color({colorTempRange: [153, 526]}),
        ota: ota.ledvance,
        exposes: [e.light_brightness_colortemp_colorhs([153, 526]), e.effect()],
    },
    {
        zigbeeModel: ['CLA60 RGBW II Z3'],
        model: 'AC16381',
        vendor: 'OSRAM',
        description: 'SMART+ LED CLASSIC E27 RGBW V2',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        // AA70155 is model number of both bulbs.
        zigbeeModel: ['LIGHTIFY A19 Tunable White', 'Classic A60 TW'],
        model: 'AA70155',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED A19 tunable white / Classic A60 TW',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR16 50 TW'],
        model: 'AA68199',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED PAR16 50 GU10 tunable white',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR16 TW Z3'],
        model: '4058075148338',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED PAR16 50 GU10 tunable white',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Classic B40 TW - LIGHTIFY'],
        model: 'AB32840',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED Classic B40 tunable white',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Ceiling TW OSRAM'],
        model: '4058075816794',
        vendor: 'OSRAM',
        description: 'Smart+ Ceiling TW',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Classic A60 W clear - LIGHTIFY'],
        model: 'AC03641',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED Classic A60 clear',
        extend: preset.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Surface Light W �C LIGHTIFY'],
        model: '4052899926158',
        vendor: 'OSRAM',
        description: 'LIGHTIFY Surface Light TW',
        extend: preset.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Surface Light TW'],
        model: 'AB401130055',
        vendor: 'OSRAM',
        description: 'LIGHTIFY Surface Light LED Tunable White',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Plug 01'],
        model: 'AB3257001NJ',
        description: 'Smart+ plug',
        vendor: 'OSRAM',
        extend: preset.switch(),
        meta: {configureKey: 1},
        ota: ota.ledvance,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['Plug Z3'],
        model: 'AC10691',
        description: 'Smart+ plug',
        vendor: 'OSRAM',
        extend: preset.switch(),
        meta: {configureKey: 1},
        ota: ota.ledvance,
        configure: async (device, coordinatorEndpoint, logger) => {
            let endpoint = device.getEndpoint(3);
            // Endpoint 3 is not always present, use endpoint 1 in that case
            // https://github.com/Koenkk/zigbee2mqtt/issues/2178
            if (!endpoint) endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['Flex RGBW', 'LIGHTIFY Indoor Flex RGBW', 'LIGHTIFY Flex RGBW'],
        model: '4052899926110',
        vendor: 'OSRAM',
        description: 'Flex RGBW',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LIGHTIFY Outdoor Flex RGBW', 'LIGHTIFY FLEX OUTDOOR RGBW', 'Flex Outdoor RGBW'],
        model: '4058075036185',
        vendor: 'OSRAM',
        description: 'Outdoor Flex RGBW',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Gardenpole RGBW-Lightify'],
        model: '4058075036147',
        vendor: 'OSRAM',
        description: 'Smart+ gardenpole 8.7W RGBW',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Gardenpole RGBW Z3'],
        model: '4058075047853',
        vendor: 'OSRAM',
        description: 'Smart+ gardenpole 4W RGBW',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color(),
        meta: {disableDefaultResponse: true},
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Gardenpole Mini RGBW OSRAM'],
        model: 'AC0363900NJ',
        vendor: 'OSRAM',
        description: 'Smart+ mini gardenpole RGBW',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Gardenspot W'],
        model: '4052899926127',
        vendor: 'OSRAM',
        description: 'Lightify mini gardenspot WT',
        extend: preset.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR 16 50 RGBW - LIGHTIFY'],
        model: 'AB35996',
        vendor: 'OSRAM',
        description: 'Smart+ Spot GU10 Multicolor',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR16 RGBW Z3'],
        model: 'AC08559',
        vendor: 'OSRAM',
        description: 'SMART+ Spot GU10 Multicolor',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['B40 DIM Z3'],
        model: 'AC08562',
        vendor: 'OSRAM',
        description: 'SMART+ Candle E14 Dimmable White',
        extend: preset.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Motion Sensor-A'],
        model: 'AC01353010G',
        vendor: 'OSRAM',
        description: 'SMART+ Motion Sensor',
        fromZigbee: [fz.temperature, fz.ias_occupancy_alarm_2, fz.ignore_basic_report],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['MR16 TW OSRAM'],
        model: 'AC03648',
        vendor: 'OSRAM',
        description: 'SMART+ spot GU5.3 tunable white',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Lightify Switch Mini', 'Lightify Switch Mini blue'],
        model: 'AC0251100NJ/AC0251700NJ',
        vendor: 'OSRAM',
        description: 'Smart+ switch mini',
        fromZigbee: [fz.legacy.osram_lightify_switch_cmdOn, fz.legacy.osram_lightify_switch_cmdMoveWithOnOff,
            fz.legacy.osram_lightify_switch_AC0251100NJ_cmdStop, fz.legacy.osram_lightify_switch_cmdMoveToColorTemp,
            fz.legacy.osram_lightify_switch_cmdMoveHue, fz.legacy.osram_lightify_switch_cmdMoveToSaturation,
            fz.legacy.osram_lightify_switch_cmdOff, fz.legacy.osram_lightify_switch_cmdMove, fz.battery,
            fz.legacy.osram_lightify_switch_cmdMoveToLevelWithOnOff],
        exposes: [e.battery(), e.action([
            'up', 'up_hold', 'up_release', 'down_release', 'circle_release', 'circle_hold', 'down', 'down_hold', 'circle_click'])],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        ota: ota.ledvance,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genPowerCfg']);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.bind(endpoint3, coordinatorEndpoint, ['genLevelCtrl', 'lightingColorCtrl']);
            await reporting.batteryVoltage(endpoint1);
        },
    },
    {
        zigbeeModel: ['Switch 4x EU-LIGHTIFY', 'Switch 4x-LIGHTIFY', 'Switch-LIGHTIFY'],
        model: '4058075816459',
        vendor: 'OSRAM',
        description: 'Smart+ switch',
        exposes: [e.battery(), e.action(['left_top_click', 'left_bottom_click', 'right_top_click', 'right_bottom_click', 'left_top_hold',
            'left_bottom_hold', 'left_top_release', 'left_bottom_release', 'right_top_release', 'right_top_hold',
            'right_bottom_release', 'right_bottom_hold'])],
        fromZigbee: [fz.battery, fz.legacy.osram_lightify_switch_AB371860355_cmdOn, fz.legacy.osram_lightify_switch_AB371860355_cmdOff,
            fz.legacy.osram_lightify_switch_AB371860355_cmdStepColorTemp, fz.legacy.osram_lightify_switch_AB371860355_cmdMoveWithOnOff,
            fz.legacy.osram_lightify_switch_AB371860355_cmdMove, fz.legacy.osram_lightify_switch_AB371860355_cmdStop,
            fz.legacy.osram_lightify_switch_AB371860355_cmdMoveHue, fz.legacy.osram_lightify_switch_AB371860355_cmdMoveSat],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        ota: ota.ledvance,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            const endpoint3 = device.getEndpoint(3);
            const endpoint4 = device.getEndpoint(4);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genPowerCfg']);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genLevelCtrl', 'lightingColorCtrl']);
            await reporting.bind(endpoint3, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.bind(endpoint4, coordinatorEndpoint, ['genLevelCtrl', 'lightingColorCtrl']);
            await reporting.batteryVoltage(endpoint1);
        },
    },
    {
        zigbeeModel: ['SubstiTube', 'Connected Tube Z3'],
        model: 'ST8AU-CON',
        vendor: 'OSRAM',
        description: 'OSRAM SubstiTUBE T8 Advanced UO Connected',
        extend: preset.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Panel TW 595 UGR22'],
        model: '595UGR22',
        vendor: 'OSRAM',
        description: 'OSRAM LED panel TW 595 UGR22',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },

    // Gewiss
    {
        zigbeeModel: ['GWA1521_Actuator_1_CH_PF'],
        model: 'GWA1521',
        description: 'Switch actuator 1 channel with input',
        vendor: 'Gewiss',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['GWA1522_Actuator_2_CH'],
        model: 'GWA1522',
        description: 'Switch actuator 2 channels with input',
        vendor: 'Gewiss',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
    },
    {
        zigbeeModel: ['GWA1531_Shutter'],
        model: 'GWA1531',
        description: 'Shutter actuator',
        vendor: 'Gewiss',
        fromZigbee: [fz.cover_position_tilt, fz.ignore_basic_report],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genLevelCtrl']);
            await reporting.brightness(endpoint);
        },
        exposes: [e.cover_position()],
    },

    // Ledvance
    {
        zigbeeModel: ['Panel TW Z3'],
        model: '4058075181472',
        vendor: 'LEDVANCE',
        description: 'SMART+ panel 60 x 60cm tunable white',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Panel TW 620 UGR19'],
        model: 'GPDRPLOP401100CE',
        vendor: 'LEDVANCE',
        description: 'Panel TW LED 625 UGR19',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A60 RGBW Value II'],
        model: 'AC25697',
        vendor: 'LEDVANCE',
        description: 'SMART+ CLASSIC MULTICOLOUR 60 10W E27',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR16 RGBW Value'],
        model: 'AC08560',
        vendor: 'LEDVANCE',
        description: 'SMART+ spot GU10 multicolor RGBW',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['B40 TW Z3'],
        model: '4058075208414',
        vendor: 'LEDVANCE',
        description: 'SMART+ candle E14 tunable white',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['FLEX RGBW Z3'],
        model: '4058075208339',
        vendor: 'LEDVANCE',
        description: 'Flex 3P multicolor',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['P40 TW Value'],
        model: '4058075485174',
        vendor: 'LEDVANCE',
        description: 'SMART+ Lighting - Classic E14 tunable white',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LEDVANCE DIM'],
        model: '4058075208421',
        vendor: 'LEDVANCE',
        description: 'SMART+ candle E14 tunable white',
        extend: preset.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Undercabinet TW Z3'],
        model: '4058075173989',
        vendor: 'LEDVANCE',
        description: 'SMART+ indoor undercabinet light',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Gardenpole Mini RGBW Z3'],
        model: '4058075208353',
        vendor: 'LEDVANCE',
        description: 'SMART+ gardenpole multicolour',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color({colorTempRange: [153, 526]}),
        ota: ota.ledvance,
    },

    // Hive
    {
        zigbeeModel: ['MOT003'],
        model: 'MOT003',
        vendor: 'Hive',
        description: 'Motion sensor',
        fromZigbee: [fz.temperature, fz.ias_occupancy_alarm_1_with_timeout, fz.battery, fz.ignore_basic_report,
            fz.ignore_iaszone_statuschange, fz.ignore_iaszone_attreport],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(6);
            const binds = ['msTemperatureMeasurement', 'genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint);
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.temperature(), e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['DWS003'],
        model: 'DWS003',
        vendor: 'Hive',
        description: 'Contact sensor',
        fromZigbee: [fz.temperature, fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(6);
            const binds = ['msTemperatureMeasurement', 'genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint);
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.temperature(), e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['FWBulb01'],
        model: 'HALIGHTDIMWWE27',
        vendor: 'Hive',
        description: 'Active smart bulb white LED (E27)',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['FWCLBulb01UK'],
        model: 'HALIGHTDIMWWE14',
        vendor: 'Hive',
        description: 'Active smart bulb white LED (E14)',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['FWBulb02UK'],
        model: 'HALIGHTDIMWWB22',
        vendor: 'Hive',
        description: 'Active smart bulb white LED (B22)',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['TWBulb02UK'],
        model: 'HV-GSCXZB229B',
        vendor: 'Hive',
        description: 'Active light, warm to cool white (E27 & B22)',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['SLP2', 'SLP2b', 'SLP2c'],
        model: '1613V',
        vendor: 'Hive',
        description: 'Active plug',
        fromZigbee: [fz.on_off, fz.metering, fz.temperature],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        exposes: [e.switch(), e.power(), e.energy(), e.temperature()],
    },
    {
        zigbeeModel: ['TWBulb01US'],
        model: 'HV-GSCXZB269',
        vendor: 'Hive',
        description: 'Active light cool to warm white (E26) ',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TWBulb01UK'],
        model: 'HV-GSCXZB279_HV-GSCXZB229_HV-GSCXZB229K',
        vendor: 'Hive',
        description: 'Active light, warm to cool white (E27 & B22)',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TWGU10Bulb01UK'],
        model: 'HV-GUCXZB5',
        vendor: 'Hive',
        description: 'Active light, warm to cool white (GU10)',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TRV001'],
        model: 'UK7004240',
        vendor: 'Hive',
        description: 'Radiator valve',
        fromZigbee: [fz.legacy.thermostat_att_report, fz.battery],
        toZigbee: [tz.thermostat_occupied_heating_setpoint, tz.thermostat_local_temperature_calibration,
            tz.thermostat_setpoint_raise_lower, tz.thermostat_remote_sensing, tz.thermostat_system_mode, tz.thermostat_running_state],
        exposes: [e.battery(), exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 1).withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withLocalTemperatureCalibration()
            .withPiHeatingDemand()],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genBasic', 'genPowerCfg', 'genIdentify', 'genTime', 'genPollCtrl', 'hvacThermostat',
                'hvacUserInterfaceCfg',
            ]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
        },
    },
    {
        zigbeeModel: ['SLR1b'],
        model: 'SLR1b',
        vendor: 'Hive',
        description: 'Heating thermostat',
        fromZigbee: [fz.legacy.thermostat_att_report, fz.legacy.thermostat_weekly_schedule_rsp],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_control_sequence_of_operation, tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule, tz.thermostat_temperature_setpoint_hold, tz.thermostat_temperature_setpoint_hold_duration],
        exposes: [exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 1).withLocalTemperature()
            .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withPiHeatingDemand()],
        meta: {configureKey: 1, disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(5);
            const binds = ['genBasic', 'genIdentify', 'genAlarms', 'genTime', 'hvacThermostat'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint, {min: 0, max: repInterval.HOUR, change: 1});
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatTemperatureSetpointHold(endpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(endpoint);
        },
    },
    {
        zigbeeModel: ['SLR2'],
        model: 'SLR2',
        vendor: 'Hive',
        description: 'Dual channel heating and hot water thermostat',
        fromZigbee: [fz.legacy.thermostat_att_report, fz.legacy.thermostat_weekly_schedule_rsp],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_control_sequence_of_operation, tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule, tz.thermostat_temperature_setpoint_hold, tz.thermostat_temperature_setpoint_hold_duration],
        endpoint: (device) => {
            return {'heat': 5, 'water': 6};
        },
        meta: {configureKey: 3, disableDefaultResponse: true, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const heatEndpoint = device.getEndpoint(5);
            const waterEndpoint = device.getEndpoint(6);
            const binds = [
                'genBasic', 'genIdentify', 'genAlarms', 'genTime', 'hvacThermostat',
            ];
            await reporting.bind(heatEndpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(heatEndpoint, 0, repInterval.HOUR, 1);
            await reporting.thermostatRunningState(heatEndpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(heatEndpoint);
            await reporting.thermostatTemperatureSetpointHold(heatEndpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(heatEndpoint);
            await reporting.bind(waterEndpoint, coordinatorEndpoint, binds);
            await reporting.thermostatRunningState(waterEndpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(waterEndpoint);
            await reporting.thermostatTemperatureSetpointHold(waterEndpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(waterEndpoint);
        },
        exposes: [
            exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 1).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withPiHeatingDemand().withEndpoint('heat'),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 1).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withPiHeatingDemand().withEndpoint('water')],
    },
    {
        zigbeeModel: ['SLR2b'],
        model: 'SLR2b',
        vendor: 'Hive',
        description: 'Dual channel heating and hot water thermostat',
        fromZigbee: [fz.thermostat, fz.thermostat_weekly_schedule],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_control_sequence_of_operation, tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule, tz.thermostat_temperature_setpoint_hold, tz.thermostat_temperature_setpoint_hold_duration],
        endpoint: (device) => {
            return {'heat': 5, 'water': 6};
        },
        meta: {configureKey: 3, disableDefaultResponse: true, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const heatEndpoint = device.getEndpoint(5);
            const waterEndpoint = device.getEndpoint(6);
            const binds = [
                'genBasic', 'genIdentify', 'genAlarms', 'genTime', 'hvacThermostat',
            ];
            await reporting.bind(heatEndpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(heatEndpoint, 0, repInterval.HOUR, 1);
            await reporting.thermostatRunningState(heatEndpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(heatEndpoint);
            await reporting.thermostatTemperatureSetpointHold(heatEndpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(heatEndpoint);
            await reporting.bind(waterEndpoint, coordinatorEndpoint, binds);
            await reporting.thermostatRunningState(waterEndpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(waterEndpoint);
            await reporting.thermostatTemperatureSetpointHold(waterEndpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(waterEndpoint);
        },
        exposes: [
            exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 1).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withPiHeatingDemand().withEndpoint('heat'),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 1).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withPiHeatingDemand().withEndpoint('water')],
    },
    {
        zigbeeModel: ['WPT1'],
        model: 'WPT1',
        vendor: 'Hive',
        description: 'Heating thermostat remote control',
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
    },
    {
        zigbeeModel: ['SLT2'],
        model: 'SLT2',
        vendor: 'Hive',
        description: 'Heating thermostat remote control',
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
    },
    {
        zigbeeModel: ['SLT3'],
        model: 'SLT3',
        vendor: 'Hive',
        description: 'Heating thermostat remote control',
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
    },
    {
        zigbeeModel: ['SLT3B'],
        model: 'SLT3B',
        vendor: 'Hive',
        description: 'Heating thermostat remote control',
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
    },
    {
        zigbeeModel: ['SLB2'],
        model: 'SLB2',
        vendor: 'Hive',
        description: 'Signal booster',
        toZigbee: [],
        fromZigbee: [fz.linkquality_from_basic],
        onEvent: async (type, data, device) => {
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            } else if (!globalStore.hasValue(device, 'interval')) {
                const interval = setInterval(async () => {
                    try {
                        await device.endpoints[0].read('genBasic', ['zclVersion']);
                    } catch (error) {
                        // Do nothing
                    }
                }, 1000 * 60 * 30); // Every 30 minutes
                globalStore.putValue(device, 'interval', interval);
            }
        },
        exposes: [],
    },

    // Innr
    {
        zigbeeModel: ['FL 140 C'],
        model: 'FL 140 C',
        vendor: 'Innr',
        description: 'Color Flex LED strip 4m 1200lm',
        extend: preset.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['FL 130 C'],
        model: 'FL 130 C',
        vendor: 'Innr',
        description: 'Color Flex LED strip',
        extend: preset.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['FL 120 C'],
        model: 'FL 120 C',
        vendor: 'Innr',
        description: 'Color Flex LED strip',
        extend: preset.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['BF 263'],
        model: 'BF 263',
        vendor: 'Innr',
        description: 'B22 filament bulb dimmable',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 185 C'],
        model: 'RB 185 C',
        vendor: 'Innr',
        description: 'E27 bulb RGBW',
        extend: preset.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['BY 185 C'],
        model: 'BY 185 C',
        vendor: 'Innr',
        description: 'B22 bulb RGBW',
        extend: preset.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 250 C'],
        model: 'RB 250 C',
        vendor: 'Innr',
        description: 'E14 bulb RGBW',
        extend: preset.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {enhancedHue: false, applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 265'],
        model: 'RB 265',
        vendor: 'Innr',
        description: 'E27 bulb',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RF 265'],
        model: 'RF 265',
        vendor: 'Innr',
        description: 'E27 bulb filament clear',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['BF 265'],
        model: 'BF 265',
        vendor: 'Innr',
        description: 'B22 bulb filament clear',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 278 T'],
        model: 'RB 278 T',
        vendor: 'Innr',
        description: 'Smart bulb tunable white E27',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [153, 555]}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 285 C'],
        model: 'RB 285 C',
        vendor: 'Innr',
        description: 'E27 bulb RGBW',
        extend: preset.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {enhancedHue: false, applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['BY 285 C'],
        model: 'BY 285 C',
        vendor: 'Innr',
        description: 'B22 bulb RGBW',
        extend: preset.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 165'],
        model: 'RB 165',
        vendor: 'Innr',
        description: 'E27 bulb',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 162'],
        model: 'RB 162',
        vendor: 'Innr',
        description: 'E27 bulb',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 172 W'],
        model: 'RB 172 W',
        vendor: 'Innr',
        description: 'ZigBee E27 retrofit bulb, warm dimmable 2200-2700K, 806 Lm',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 175 W'],
        model: 'RB 175 W',
        vendor: 'Innr',
        description: 'E27 bulb warm dimming',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 178 T'],
        model: 'RB 178 T',
        vendor: 'Innr',
        description: 'Smart bulb tunable white E27',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [153, 555]}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['BY 178 T'],
        model: 'BY 178 T',
        vendor: 'Innr',
        description: 'Smart bulb tunable white B22',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [153, 555]}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 122'],
        model: 'RS 122',
        vendor: 'Innr',
        description: 'GU10 spot',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 125'],
        model: 'RS 125',
        vendor: 'Innr',
        description: 'GU10 spot',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 225'],
        model: 'RS 225',
        vendor: 'Innr',
        description: 'GU10 Spot',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 226'],
        model: 'RS 226',
        vendor: 'Innr',
        description: 'GU10 Spot',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 128 T'],
        model: 'RS 128 T',
        vendor: 'Innr',
        description: 'GU10 spot 350 lm, dimmable, white spectrum',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [153, 555]}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 228 T'],
        model: 'RS 228 T',
        vendor: 'Innr',
        description: 'GU10 spot 350 lm, dimmable, white spectrum',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [153, 555]}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 229 T'],
        model: 'RS 229 T',
        vendor: 'Innr',
        description: 'GU10 spot 350 lm, dimmable, white spectrum',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [200, 454]}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 230 C'],
        model: 'RS 230 C',
        vendor: 'Innr',
        description: 'GU10 spot 350 lm, dimmable, RGBW',
        extend: preset.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        exposes: [e.light_brightness_colortemp_color()],
        meta: {enhancedHue: false, applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 145'],
        model: 'RB 145',
        vendor: 'Innr',
        description: 'E14 candle',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 245'],
        model: 'RB 245',
        vendor: 'Innr',
        description: 'E14 candle',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 248 T'],
        model: 'RB 248 T',
        vendor: 'Innr',
        description: 'E14 candle with white spectrum',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [153, 555]}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 148 T'],
        model: 'RB 148 T',
        vendor: 'Innr',
        description: 'E14 candle with white spectrum',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [153, 555]}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RF 261'],
        model: 'RF 261',
        vendor: 'Innr',
        description: 'E27 filament bulb dimmable',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RF 263'],
        model: 'RF 263',
        vendor: 'Innr',
        description: 'E27 filament bulb dimmable',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RF 264'],
        model: 'RF 264',
        vendor: 'Innr',
        description: 'E27 filament bulb dimmable',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['BY 165', 'BY 265'],
        model: 'BY 165',
        vendor: 'Innr',
        description: 'B22 bulb dimmable',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RCL 110'],
        model: 'RCL 110',
        vendor: 'Innr',
        description: 'Round ceiling light',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RSL 115'],
        model: 'RSL 115',
        vendor: 'Innr',
        description: 'Recessed spot light',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['PL 110'],
        model: 'PL 110',
        vendor: 'Innr',
        description: 'Puck Light',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['PL 115'],
        model: 'PL 115',
        vendor: 'Innr',
        description: 'Puck Light',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['ST 110'],
        model: 'ST 110',
        vendor: 'Innr',
        description: 'Strip Light',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['UC 110'],
        model: 'UC 110',
        vendor: 'Innr',
        description: 'Under cabinet light',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['DL 110 N'],
        model: 'DL 110 N',
        vendor: 'Innr',
        description: 'Spot narrow',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['DL 110 W'],
        model: 'DL 110 W',
        vendor: 'Innr',
        description: 'Spot wide',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['SL 110 N'],
        model: 'SL 110 N',
        vendor: 'Innr',
        description: 'Spot Flex narrow',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['SL 110 M'],
        model: 'SL 110 M',
        vendor: 'Innr',
        description: 'Spot Flex medium',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['SL 110 W'],
        model: 'SL 110 W',
        vendor: 'Innr',
        description: 'Spot Flex wide',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['AE 260'],
        model: 'AE 260',
        vendor: 'Innr',
        description: 'E26/24 bulb',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['AE 280 C'],
        model: 'AE 280 C',
        vendor: 'Innr',
        description: 'E26 bulb RGBW',
        extend: preset.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['SP 120'],
        model: 'SP 120',
        vendor: 'Innr',
        description: 'Smart plug',
        fromZigbee: [fz.electrical_measurement, fz.on_off, fz.ignore_genLevelCtrl_report, fz.metering],
        toZigbee: [tz.on_off],
        meta: {configureKey: 6},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            // Gives UNSUPPORTED_ATTRIBUTE on reporting.readEletricalMeasurementMultiplierDivisors.
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acCurrentDivisor: 1000,
                acCurrentMultiplier: 1,
            });
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint);
            // Gives UNSUPPORTED_ATTRIBUTE on reporting.readMeteringMultiplierDivisor.
            endpoint.saveClusterAttributeKeyValue('seMetering', {multiplier: 1, divisor: 100});
            await reporting.currentSummDelivered(endpoint);
        },
        exposes: [e.power(), e.current(), e.voltage().withAccess(ea.STATE), e.switch(), e.energy()],
    },
    {
        zigbeeModel: ['SP 220'],
        model: 'SP 220',
        vendor: 'Innr',
        description: 'Smart plug',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['SP 222'],
        model: 'SP 222',
        vendor: 'Innr',
        description: 'Smart plug',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['SP 224'],
        model: 'SP 224',
        vendor: 'Innr',
        description: 'Smart plug',
        extend: preset.switch(),
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['OFL 120 C'],
        model: 'OFL 120 C',
        vendor: 'Innr',
        description: 'Outdoor flex light colour LED strip 2m, 550lm, RGBW',
        extend: preset.light_onoff_brightness_colortemp_color({supportsHS: true}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['OFL 140 C'],
        model: 'OFL 140 C',
        vendor: 'Innr',
        description: 'Outdoor flex light colour LED strip 4m, 1000lm, RGBW',
        extend: preset.light_onoff_brightness_colortemp_color({supportsHS: true}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['OSL 130 C'],
        model: 'OSL 130 C',
        vendor: 'Innr',
        description: 'Outdoor smart spot colour, 230lm/spot, RGBW',
        extend: preset.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['BE 220'],
        model: 'BE 220',
        vendor: 'Innr',
        description: 'E26/E24 white bulb',
        extend: preset.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },

    // Digi
    {
        fingerprint: [{type: 'Router', manufacturerID: 4126, endpoints: [
            {ID: 230, profileID: 49413, deviceID: 1, inputClusters: [], outputClusters: []},
            {ID: 232, profileID: 49413, deviceID: 1, inputClusters: [], outputClusters: []},
        ]}],
        model: 'XBee',
        description: 'Router',
        vendor: 'Digi',
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
    },

    // KAMI
    {
        zigbeeModel: ['Z3ContactSensor'],
        model: 'N20',
        vendor: 'KAMI',
        description: 'Entry sensor',
        fromZigbee: [fz.KAMI_contact, fz.KAMI_occupancy],
        toZigbee: [],
        exposes: [e.contact(), e.occupancy()],
    },

    // Sylvania
    {
        zigbeeModel: ['LIGHTIFY Dimming Switch'],
        model: '73743',
        vendor: 'Sylvania',
        description: 'Lightify Smart Dimming Switch',
        fromZigbee: [fz.legacy.osram_lightify_switch_cmdOn, fz.legacy.osram_lightify_switch_cmdMoveWithOnOff,
            fz.legacy.osram_lightify_switch_cmdOff, fz.legacy.osram_lightify_switch_cmdMove,
            fz.legacy.osram_lightify_switch_73743_cmdStop, fz.battery],
        exposes: [e.battery(), e.action(['up', 'up_hold', 'down', 'down_hold', 'up_release', 'down_release'])],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        ota: ota.ledvance,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['LIGHTIFY RT Tunable White'],
        model: '73742',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED adjustable white RT 5/6',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['RT RGBW'],
        model: '73741',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED adjustable color RT 5/6',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LIGHTIFY BR Tunable White'],
        model: '73740',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED adjustable white BR30',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LIGHTIFY BR RGBW', 'BR30 RGBW'],
        model: '73739',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED RGBW BR30',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LIGHTIFY A19 RGBW', 'A19 RGBW'],
        model: '73693',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED RGBW A19',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Flex XL RGBW', 'Flex RGBW Pro'],
        model: '73773',
        vendor: 'Sylvania',
        description: 'SMART+ Flex XL RGBW strip',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LIGHTIFY A19 ON/OFF/DIM', 'LIGHTIFY A19 ON/OFF/DIM 10 Year'],
        model: '74283',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED soft white dimmable A19',
        extend: preset.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A19 W 10 year'],
        model: '74696',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED soft white dimmable A19',
        extend: preset.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PLUG'],
        model: '72922-A',
        vendor: 'Sylvania',
        description: 'SMART+ Smart Plug',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A19 TW 10 year'],
        model: '71831',
        vendor: 'Sylvania',
        description: 'Smart Home adjustable white A19 LED bulb',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['MR16 TW'],
        model: '74282',
        vendor: 'Sylvania',
        description: 'Smart Home adjustable white MR16 LED bulb',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LIGHTIFY Gardenspot RGB'],
        model: 'LTFY004',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED gardenspot mini RGB',
        extend: preset.ledvance.light_onoff_brightness_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR38 W 10 year'],
        model: '74580',
        vendor: 'Sylvania',
        description: 'Smart Home soft white PAR38 outdoor bulb',
        extend: preset.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Edge-lit Under Cabinet TW'],
        model: '72569',
        vendor: 'Sylvania',
        description: 'SMART+ Zigbee adjustable white edge-lit under cabinet light',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Flushmount TW'],
        model: '72567',
        vendor: 'Sylvania',
        description: 'SMART+ Zigbee adjustable white edge-lit flush mount light',
        extend: preset.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Outdoor Accent RGB', 'Outdoor Accent Light RGB'],
        model: '75541',
        vendor: 'Sylvania',
        description: 'SMART+ Outdoor Accent RGB lighting kit',
        extend: preset.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['iQBR30'],
        model: '484719',
        vendor: 'Sylvania',
        description: 'Dimmable soft white BR30 LED flood light bulb',
        extend: preset.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },

    // Leviton
    {
        zigbeeModel: ['DL15S'],
        model: 'DL15S-1BZ',
        vendor: 'Leviton',
        description: 'Lumina RF 15A switch, 120/277V',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['DG6HD'],
        model: 'DG6HD-1BW',
        vendor: 'Leviton',
        description: 'Zigbee in-wall smart dimmer',
        extend: preset.light_onoff_brightness({disableEffect: true}),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['65A01-1'],
        model: 'RC-2000WH',
        vendor: 'Leviton',
        description: 'Omnistat2 wireless thermostat',
        fromZigbee: [fz.legacy.thermostat_att_report, fz.fan],
        toZigbee: [tz.factory_reset, tz.thermostat_local_temperature, tz.thermostat_local_temperature_calibration, tz.thermostat_occupancy,
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint, tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_unoccupied_cooling_setpoint, tz.thermostat_setpoint_raise_lower, tz.thermostat_remote_sensing,
            tz.thermostat_control_sequence_of_operation, tz.thermostat_system_mode, tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule, tz.thermostat_relay_status_log, tz.thermostat_running_state,
            tz.thermostat_temperature_setpoint_hold, tz.thermostat_temperature_setpoint_hold_duration, tz.fan_mode],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ['hvacThermostat', 'hvacFanCtrl']);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedCoolingSetpoint(endpoint);
            await reporting.fanMode(endpoint);
        },
        exposes: [
            exposes.climate().withSetpoint('occupied_heating_setpoint', 10, 30, 1).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat', 'cool']).withRunningState(['idle', 'heat', 'cool'])
                .withFanMode(['auto', 'on', 'smart']).withSetpoint('occupied_cooling_setpoint', 10, 30, 1)
                .withLocalTemperatureCalibration().withPiHeatingDemand()],
    },

    // GE
    {
        zigbeeModel: ['SoftWhite'],
        model: 'PSB19-SW27',
        vendor: 'GE',
        description: 'Link smart LED light bulb, A19 soft white (2700K)',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['ZLL Light'],
        model: '22670',
        vendor: 'GE',
        description: 'Link smart LED light bulb, A19/BR30 soft white (2700K)',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['Daylight'],
        model: 'PQC19-DY01',
        vendor: 'GE',
        description: 'Link smart LED light bulb, A19/BR30 cold white (5000K)',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['45852'],
        model: '45852GE',
        vendor: 'GE',
        description: 'ZigBee plug-in smart dimmer',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['45853'],
        model: '45853GE',
        vendor: 'GE',
        description: 'Plug-in smart switch',
        fromZigbee: [fz.on_off, fz.metering, fz.ignore_basic_report],
        toZigbee: [tz.on_off, tz.ignore_transition],
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint, {min: 10, change: 2});
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ['45856'],
        model: '45856GE',
        vendor: 'GE',
        description: 'In-wall smart switch',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['45857'],
        model: '45857GE',
        vendor: 'GE',
        description: 'ZigBee in-wall smart dimmer',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['Smart Switch'],
        model: 'PTAPT-WH02',
        vendor: 'GE',
        description: 'Quirky smart switch',
        extend: preset.switch(),
        endpoint: (device) => {
            return {'default': 2};
        },
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ZHA Smart Plug'],
        model: 'POTLK-WH02',
        vendor: 'GE',
        description: 'Outlink smart remote outlet',
        extend: preset.switch(),
    },

    // Sengled
    {
        zigbeeModel: ['E12-N1E'],
        model: 'E12-N1E',
        vendor: 'Sengled',
        description: 'Smart LED multicolor (BR30)',
        extend: preset.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E1G-G8E'],
        model: 'E1G-G8E',
        vendor: 'Sengled',
        description: 'Multicolor light strip (2M)',
        extend: preset.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E11-U21U31'],
        model: 'E11-U21U31',
        vendor: 'Sengled',
        description: 'Element touch (A19)',
        extend: preset.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E11-G13'],
        model: 'E11-G13',
        vendor: 'Sengled',
        description: 'Element classic (A19)',
        extend: preset.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E11-G23', 'E11-G33'],
        model: 'E11-G23/E11-G33',
        vendor: 'Sengled',
        description: 'Element classic (A60)',
        extend: preset.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E11-N13', 'E11-N13A', 'E11-N14', 'E11-N14A'],
        model: 'E11-N13/E11-N13A/E11-N14/E11-N14A',
        vendor: 'Sengled',
        description: 'Element extra bright (A19)',
        extend: preset.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['Z01-CIA19NAE26'],
        model: 'Z01-CIA19NAE26',
        vendor: 'Sengled',
        description: 'Element touch (A19)',
        extend: preset.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['Z01-A19NAE26'],
        model: 'Z01-A19NAE26',
        vendor: 'Sengled',
        description: 'Element plus (A19)',
        extend: preset.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['Z01-A60EAE27'],
        model: 'Z01-A60EAE27',
        vendor: 'Sengled',
        description: 'Element Plus (A60)',
        extend: preset.light_onoff_brightness_colortemp(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E11-N1EA'],
        model: 'E11-N1EA',
        vendor: 'Sengled',
        description: 'Element plus color (A19)',
        extend: preset.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E11-U2E'],
        model: 'E11-U2E',
        vendor: 'Sengled',
        description: 'Element color plus E27',
        extend: preset.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E11-U3E'],
        model: 'E11-U3E',
        vendor: 'Sengled',
        description: 'Element color plus B22',
        extend: preset.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E1F-N5E'],
        model: 'E1F-N5E',
        vendor: 'Sengled',
        description: 'Element color plus E12',
        extend: preset.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E12-N14'],
        model: 'E12-N14',
        vendor: 'Sengled',
        description: 'Element Classic (BR30)',
        extend: preset.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E1A-AC2'],
        model: 'E1ACA4ABE38A',
        vendor: 'Sengled',
        description: 'Element downlight smart LED bulb',
        extend: preset.light_onoff_brightness(),
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E1D-G73'],
        model: 'E1D-G73WNA',
        vendor: 'Sengled',
        description: 'Smart window and door sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        ota: ota.zigbeeOTA,
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['E1C-NB6'],
        model: 'E1C-NB6',
        vendor: 'Sengled',
        description: 'Smart plug',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E1E-G7F'],
        model: 'E1E-G7F',
        vendor: 'Sengled',
        description: 'Smart switch ',
        fromZigbee: [fz.E1E_G7F_action],
        exposes: [e.action(['on', 'up', 'down', 'off', 'on_double', 'on_long', 'off_double', 'off_long'])],
        toZigbee: [],
    },

    // Swann
    {
        zigbeeModel: ['SWO-KEF1PA'],
        model: 'SWO-KEF1PA',
        vendor: 'Swann',
        description: 'Key fob remote',
        fromZigbee: [fz.legacy.KEF1PA_arm, fz.command_panic],
        toZigbee: [],
        exposes: [e.action(['home', 'sleep', 'away', 'panic'])],
    },
    {
        zigbeeModel: ['SWO-WDS1PA'],
        model: 'SWO-WDS1PA',
        vendor: 'Swann',
        description: 'Window/door sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['SWO-MOS1PA'],
        model: 'SWO-MOS1PA',
        vendor: 'Swann',
        description: 'Motion and temperature sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },

    // JIAWEN
    {
        zigbeeModel: ['FB56-ZCW08KU1.1', 'FB56-ZCW08KU1.0'],
        model: 'K2RGBW01',
        vendor: 'JIAWEN',
        description: 'Wireless Bulb E27 9W RGBW',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['FB56-ZBW02KU1.5'],
        model: 'JW-A04-CT',
        vendor: 'JIAWEN',
        description: 'LED strip light controller',
        extend: preset.light_onoff_brightness(),
    },

    // Netvox
    {
        zigbeeModel: ['Z809AE3R'],
        model: 'Z809A',
        vendor: 'Netvox',
        description: 'Power socket with power consumption monitoring',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
            await reporting.powerFactor(endpoint);
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
    },

    // Nanoleaf
    {
        zigbeeModel: ['NL08-0800'],
        model: 'NL08-0800',
        vendor: 'Nanoleaf',
        description: 'Smart Ivy Bulb E27',
        extend: preset.light_onoff_brightness(),
    },

    // Nordtronic
    {
        zigbeeModel: ['BoxDIM2 98425031', '98425031', 'BoxDIMZ 98425031'],
        model: '98425031',
        vendor: 'Nordtronic',
        description: 'Box Dimmer 2.0',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['BoxRelayZ 98423051'],
        model: '98423051',
        vendor: 'Nordtronic',
        description: 'Zigbee switch 400W',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },

    // Nue, 3A
    {
        zigbeeModel: ['LXN59-1S7LX1.0'],
        model: 'HGZB-01',
        vendor: 'Nue / 3A',
        description: 'Smart Zigbee 3.0 light controller',
        extend: preset.switch(),
        whiteLabel: [{vendor: 'Zemismart', model: 'ZW-EU-01', description: 'Smart light relay - 1 gang'},
            {vendor: 'Moes', model: 'ZK-CH-2U', description: 'Plug with 2 USB ports'}],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['LXN59-2S7LX1.0'],
        model: 'LXN59-2S7LX1.0',
        vendor: 'Nue / 3A',
        description: 'Smart light relay - 2 gang',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right')],
        whiteLabel: [{vendor: 'Zemismart', model: 'ZW-EU-02'}],
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        meta: {configureKey: 2, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint2);
        },
    },
    {
        zigbeeModel: ['FTB56+ZSN15HG1.0'],
        model: 'HGZB-1S',
        vendor: 'Nue / 3A',
        description: 'Smart 1 key scene wall switch',
        toZigbee: [tz.on_off],
        fromZigbee: [fz.command_recall, fz.legacy.scenes_recall_click, fz.ignore_power_report],
        exposes: [e.action(['recall_*']), e.switch()],
    },
    {
        zigbeeModel: ['FTB56+ZSN16HG1.0'],
        model: 'HGZB-02S',
        vendor: 'Nue / 3A',
        description: 'Smart 2 key scene wall switch',
        toZigbee: [tz.on_off],
        exposes: [e.action(['recall_*']), e.switch()],
        fromZigbee: [fz.command_recall, fz.legacy.scenes_recall_click, fz.ignore_power_report],
    },
    {
        zigbeeModel: ['FB56+ZSN08KJ2.3'],
        model: 'HGZB-045',
        vendor: 'Nue / 3A',
        description: 'Smart 4 key scene wall switch',
        toZigbee: [tz.on_off],
        fromZigbee: [fz.command_recall, fz.legacy.scenes_recall_click, fz.ignore_power_report],
        exposes: [e.action(['recall_*']), e.switch()],
    },
    {
        zigbeeModel: ['LXN56-DC27LX1.1', 'LXN56-DS27LX1.1'],
        model: 'LXZB-02A',
        vendor: 'Nue / 3A',
        description: 'Smart light controller',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['FNB56-ZSW03LX2.0', 'LXN-3S27LX1.0'],
        model: 'HGZB-43',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 3 gang v2.0',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('center'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {'top': 1, 'center': 2, 'bottom': 3};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FB56+ZSW1IKJ1.7', 'FB56+ZSW1IKJ2.5', 'FB56+ZSW1IKJ2.7'],
        model: 'HGZB-043',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 3 gang',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('bottom'), e.switch().withEndpoint('center')],
        endpoint: (device) => {
            return {'top': 16, 'center': 17, 'bottom': 18};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(16), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(17), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(18), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FB56+ZSW1JKJ2.7'],
        model: 'HGZB-44',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 4 gang v2.0',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top_left'), e.switch().withEndpoint('top_right'),
            e.switch().withEndpoint('bottom_left'), e.switch().withEndpoint('bottom_right')],
        endpoint: (device) => {
            return {'top_left': 16, 'top_right': 17, 'bottom_right': 18, 'bottom_left': 19};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(16), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(17), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(18), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(19), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FB56+ZSC05HG1.0', 'FNB56-ZBW01LX1.2', 'LXN56-DS27LX1.3'],
        model: 'HGZB-04D / HGZB-4D-UK',
        vendor: 'Nue / 3A',
        description: 'Smart dimmer wall switch',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['FB56+ZSW1HKJ1.7', 'FB56+ZSW1HKJ2.5', 'FB56+ZSW1HKJ2.7'],
        model: 'HGZB-042',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 2 gang',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {'top': 16, 'bottom': 17};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(16), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(17), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FNB56-ZSW02LX2.0', 'LXN-2S27LX1.0'],
        model: 'HGZB-42',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 2 gang v2.0',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {'top': 11, 'bottom': 12};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(11), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(12), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FNB56-SKT1JXN1.0'],
        model: 'HGZB-20A',
        vendor: 'Nue / 3A',
        description: 'Power plug',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(11), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FB56+ZSW1GKJ2.5', 'LXN-1S27LX1.0', 'FB56+ZSW1GKJ2.7'],
        model: 'HGZB-41',
        vendor: 'Nue / 3A',
        description: 'Smart one gang wall switch',
        extend: preset.switch(),
    },
    {
        zigbeeModel: ['FNB56-SKT1DHG1.4'],
        model: 'MG-AUWS01',
        vendor: 'Nue / 3A',
        description: 'Smart Double GPO',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right')],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {left: 12, right: 11};
        },
    },
    {
        zigbeeModel: ['FNB56-ZCW25FB1.9'],
        model: 'XY12S-15',
        vendor: 'Nue / 3A',
        description: 'Smart light controller RGBW',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['FNB56-ZSW23HG1.1', 'LXN56-LC27LX1.1', 'LXN56-LC27LX1.3'],
        model: 'HGZB-01A',
        vendor: 'Nue / 3A',
        description: 'Smart in-wall switch',
        extend: preset.switch(),
    },
    {
        zigbeeModel: ['FNB56-ZSC01LX1.2', 'FB56+ZSW05HG1.2', 'FB56+ZSC04HG1.0'],
        model: 'HGZB-02A',
        vendor: 'Nue / 3A',
        description: 'Smart light controller',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['FNB56-ZSW01LX2.0'],
        model: 'HGZB-42-UK / HGZB-41 / HGZB-41-UK',
        description: 'Smart switch 1 or 2 gang',
        vendor: 'Nue / 3A',
        extend: preset.switch(),
    },
    {
        zigbeeModel: ['FNB56-ZCW25FB1.6', 'FNB56-ZCW25FB2.1'],
        model: 'HGZB-06A',
        vendor: 'Nue / 3A',
        description: 'Smart 7W E27 light bulb',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LXN56-0S27LX1.1', 'LXN56-0S27LX1.3'],
        model: 'HGZB-20-UK',
        vendor: 'Nue / 3A',
        description: 'Power plug',
        extend: preset.switch(),
    },
    {
        zigbeeModel: ['NUET56-DL27LX1.2'],
        model: 'HGZB-DLC4-N12B',
        vendor: 'Nue / 3A',
        description: 'RGB LED downlight',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['FB56-WTS04HM1.1'],
        model: 'HGZB-14A',
        vendor: 'Nue / 3A',
        description: 'Water leakage sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['FNB56-DOS07FB3.1'],
        model: 'HGZB-13A',
        vendor: 'Nue / 3A',
        description: 'Door/window sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['LXT56-LS27LX1.4'],
        model: '3A12S-15',
        vendor: 'Nue / 3A',
        description: 'Smart Zigbee 3.0 strip light controller',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },

    // Smart Home Pty
    {
        zigbeeModel: ['FB56-ZCW11HG1.2', 'FB56-ZCW11HG1.4', 'LXT56-LS27LX1.7'],
        model: 'HGZB-07A',
        vendor: 'Smart Home Pty',
        description: 'RGBW Downlight',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['FNB56-SKT1EHG1.2'],
        model: 'HGZB-20-DE',
        vendor: 'Smart Home Pty',
        description: 'Power plug',
        extend: preset.switch(),
    },
    {
        zigbeeModel: ['LXN56-1S27LX1.2'],
        model: 'NUE-ZBFLB',
        vendor: 'Nue / 3A',
        description: 'Smart fan light switch',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('button_light'), e.switch().withEndpoint('button_fan_high'),
            e.switch().withEndpoint('button_fan_med'), e.switch().withEndpoint('button_fan_low')],
        endpoint: (device) => {
            return {'button_light': 1, 'button_fan_high': 2, 'button_fan_med': 3, 'button_fan_low': 4};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },

    // Feibit
    {
        zigbeeModel: ['FZB56+ZSW2FYM1.1'],
        model: 'TZSW22FW-L4',
        vendor: 'Feibit',
        description: 'Smart light switch - 2 gang',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {'top': 16, 'bottom': 17};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(16), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(17), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FNB56-SOS03FB1.5'],
        model: 'SEB01ZB',
        vendor: 'Feibit',
        description: 'SOS button',
        fromZigbee: [fz.ias_sos_alarm_2, fz.battery],
        toZigbee: [],
        exposes: [e.sos(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['FNB56-BOT06FB2.3', 'FNB56-BOT06FB2.8'],
        model: 'SBM01ZB',
        vendor: 'Feibit',
        description: 'Human body movement sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryAlarmState(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['FNB56-THM14FB2.4', 'FNB54-THM17ML1.1'],
        model: 'STH01ZB',
        vendor: 'Feibit',
        description: 'Smart temperature & humidity Sensor',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        exposes: [e.temperature(), e.humidity(), e.battery()],
    },
    {
        zigbeeModel: ['FNB56-SMF06FB1.6'],
        model: 'SSA01ZB',
        vendor: 'Feibit',
        description: 'Smoke detector',
        fromZigbee: [fz.ias_smoke_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryAlarmState(endpoint);
        },
        exposes: [e.smoke(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['FNB56-COS06FB1.7'],
        model: 'SCA01ZB',
        vendor: 'Feibit',
        description: 'Smart carbon monoxide sensor',
        fromZigbee: [fz.ias_carbon_monoxide_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryAlarmState(endpoint);
        },
        exposes: [e.carbon_monoxide(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['FNB56-GAS05FB1.4'],
        model: 'SGA01ZB',
        vendor: 'Feibit',
        description: 'Combustible gas sensor',
        fromZigbee: [fz.ias_gas_alarm_2],
        toZigbee: [],
        exposes: [e.gas(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['FNB56-WTS05FB2.0'],
        model: 'SWA01ZB',
        vendor: 'Feibit',
        description: 'Water leakage sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['FNB56-DOS07FB2.4'],
        model: 'SDM01ZB',
        vendor: 'Feibit',
        description: 'Door or window contact switch',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['FB56+SKT14AL2.1'],
        model: 'SFS01ZB',
        vendor: 'Feibit',
        description: 'Power plug',
        extend: preset.switch(),
    },
    {
        zigbeeModel: ['FB56+ZSW1HKJ2.2'],
        model: 'SLS301ZB_2',
        vendor: 'Feibit',
        description: 'Smart light switch - 2 gang',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right')],
        endpoint: (device) => {
            return {'left': 16, 'right': 17};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(16), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(17), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FB56+ZSW1IKJ2.2'],
        model: 'SLS301ZB_3',
        vendor: 'Feibit',
        description: 'Smart light switch - 3 gang',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'), e.switch().withEndpoint('center')],
        endpoint: (device) => {
            return {'left': 16, 'center': 17, 'right': 18};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(16), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(17), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(18), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FB56+ZSN08KJ2.2'],
        model: 'SSS401ZB',
        vendor: 'Feibit',
        description: 'Smart 4 key scene wall switch',
        toZigbee: [tz.on_off],
        fromZigbee: [fz.command_recall],
        exposes: [e.action(['recall_*']), e.switch()],
    },

    // Gledopto
    {
        fingerprint: [
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GL-H-001', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 528, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        model: 'GL-H-001',
        vendor: 'Gledopto',
        description: 'Zigbee RF Hub',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['HOMA2023'],
        model: 'GD-CZ-006',
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller WW/CW',
        extend: preset.gledopto.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['GL-C-006'],
        fingerprint: [
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GLEDOPTO', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 544, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        model: 'GL-C-006',
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller WW/CW',
        extend: preset.gledopto.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['GL-C-006S'],
        model: 'GL-C-006S',
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller WW/CW (plus)',
        extend: preset.gledopto.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['GL-C-006P'],
        model: 'GL-C-006P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee LED Controller WW/CW (pro)',
        extend: preset.gledopto.light_onoff_brightness_colortemp(),
    },
    {
        fingerprint: [
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GL-C-007', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 528, inputClusters: [4096], outputClusters: [4096]},
            ]},
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GL-C-007', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 12, profileID: 260, deviceID: 258, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        model: 'GL-C-007-1ID', // 1 ID controls white and color together
        // Only enable disableDefaultResponse for the second fingerprint:
        // https://github.com/Koenkk/zigbee2mqtt/issues/3813#issuecomment-694922037
        meta: {disableDefaultResponse: (entity) => !!entity.getDevice().getEndpoint(12)},
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller RGBW (1 ID)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        fingerprint: [
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GL-C-007', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                {ID: 15, profileID: 49246, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
            ]},
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GLEDOPTO', endpoints: [
                {ID: 10, profileID: 49246, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8], outputClusters: []},
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        model: 'GL-C-007-2ID', // 2 ID controls white and color separate
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller RGBW (2 ID)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
        exposes: [e.light_brightness_colortemp_colorxy().withEndpoint('rgb'), e.light_brightness().withEndpoint('white')],
        endpoint: (device) => {
            if (device.getEndpoint(10) && device.getEndpoint(11) && device.getEndpoint(13)) {
                return {rgb: 11, white: 10};
            } else if (device.getEndpoint(11) && device.getEndpoint(12) && device.getEndpoint(13)) {
                return {rgb: 11, white: 12};
            } else {
                return {rgb: 11, white: 15};
            }
        },
    },
    {
        zigbeeModel: ['GL-C-007S'],
        model: 'GL-C-007S',
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller RGBW (plus)',
        extend: preset.gledopto.light_onoff_brightness_color(),
    },
    {
        zigbeeModel: ['GL-C-007P'],
        model: 'GL-C-007P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee LED Controller RGBW (pro)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        fingerprint: [
            // Although the device announces modelID GL-C-007, this is clearly a GL-C-008
            // https://github.com/Koenkk/zigbee2mqtt/issues/3525
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GL-C-007', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                {ID: 15, profileID: 49246, deviceID: 544, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
            ]},
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GL-C-007', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 12, profileID: 260, deviceID: 258, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                {ID: 15, profileID: 49246, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
            ]},
        ],
        model: 'GL-C-008-2ID', // 2 ID controls color temperature and color separate
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller RGB+CCT (2 ID)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
        exposes: [e.light_brightness_colorxy().withEndpoint('rgb'), e.light_brightness_colortemp().withEndpoint('cct')],
        // Only enable disableDefaultResponse for the second fingerprint:
        // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1315#issuecomment-645331185
        meta: {disableDefaultResponse: (entity) => !!entity.getDevice().getEndpoint(12)},
        endpoint: (device) => {
            return {rgb: 11, cct: 15};
        },
    },
    {
        fingerprint: [
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GLEDOPTO', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        zigbeeModel: ['GL-C-008'],
        model: 'GL-C-008-1ID', // 1 ID controls color temperature and color separate
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller RGB+CCT (1 ID)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ['GL-C-008S'],
        model: 'GL-C-008S',
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller RGB+CCT (plus)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ['GL-C-008P'],
        model: 'GL-C-008P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee LED Controller RGB+CCT (pro)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ['GL-C-009'],
        fingerprint: [
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GLEDOPTO', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        model: 'GL-C-009',
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller W',
        extend: preset.gledopto.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['GL-C-009P'],
        model: 'GL-C-009P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee LED Controller W (pro)',
        extend: preset.gledopto.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['GL-C-009S'],
        model: 'GL-C-009S',
        vendor: 'Gledopto',
        description: 'Zigbee LED Controller W (plus)',
        extend: preset.gledopto.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['GL-MC-001'],
        model: 'GL-MC-001',
        vendor: 'Gledopto',
        description: 'Zigbee USB Mini LED Controller RGB+CCT',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ['GL-MC-001P'],
        model: 'GL-MC-001P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee USB Mini LED Controller RGB+CCT (pro)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-S-003Z'],
        model: 'GL-S-003Z',
        vendor: 'Gledopto',
        description: 'Zigbee 5W GU10 Bulb RGBW',
        extend: preset.gledopto.light_onoff_brightness_color(),
        endpoint: (device) => {
            // https://github.com/Koenkk/zigbee2mqtt/issues/5169
            if (device.getEndpoint(12)) return {default: 12};
            // https://github.com/Koenkk/zigbee2mqtt/issues/5681
            else return {default: 11};
        },
    },
    {
        zigbeeModel: ['GL-S-004Z'],
        model: 'GL-S-004Z',
        vendor: 'Gledopto',
        description: 'Zigbee 4W MR16 Bulb 30deg RGB+CCT',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-S-005Z'],
        model: 'GL-S-005Z',
        vendor: 'Gledopto',
        description: 'Zigbee 4W MR16 Bulb 120deg RGB+CCT',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-S-004ZS'],
        model: 'GL-S-004ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 4W MR16 Bulb RGB+CCT (plus)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-S-004P'],
        model: 'GL-S-004P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 4W MR16 Bulb RGB+CCT (pro)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-S-007Z'],
        model: 'GL-S-007Z',
        vendor: 'Gledopto',
        description: 'Zigbee 5W GU10 Bulb RGB+CCT',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-S-007ZS'],
        model: 'GL-S-007ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 4W GU10 Bulb RGB+CCT (plus)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-S-007P'],
        model: 'GL-S-007P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 4W GU10 Bulb RGB+CCT (pro)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-S-008Z'],
        model: 'GL-S-008Z',
        vendor: 'Gledopto',
        description: 'Zigbee 5W PAR16 Bulb RGB+CCT',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-B-001Z'],
        model: 'GL-B-001Z',
        vendor: 'Gledopto',
        description: 'Zigbee 4W E12/E14 Bulb RGB+CCT',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-B-001ZS'],
        model: 'GL-B-001ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 4W E12/E14 Bulb RGB+CCT (plus)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-B-001P'],
        model: 'GL-B-001P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 4W E12/E14 Bulb RGB+CCT (pro)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-B-007Z'],
        model: 'GL-B-007Z',
        vendor: 'Gledopto',
        description: 'Zigbee 6W E26/E27 Bulb RGB+CCT',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-B-007ZS'],
        model: 'GL-B-007ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 6W E26/E27 Bulb RGB+CCT (plus)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-B-007P'],
        model: 'GL-B-007P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 6W E26/E27 Bulb RGB+CCT (pro)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-B-008Z'],
        model: 'GL-B-008Z',
        vendor: 'Gledopto',
        description: 'Zigbee 12W E26/E27 Bulb RGB+CCT',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-B-008ZS'],
        model: 'GL-B-008ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 12W E26/E27 Bulb RGB+CCT (plus)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-B-008P'],
        model: 'GL-B-008P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 12W E26/E27 Bulb RGB+CCT (pro)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-D-003Z'],
        model: 'GL-D-003Z',
        vendor: 'Gledopto',
        description: 'Zigbee 6W Downlight RGB+CCT',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-D-003ZS'],
        model: 'GL-D-003ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 6W Downlight RGB+CCT (plus)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-D-003P'],
        model: 'GL-D-003P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 6W Downlight RGB+CCT (pro)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-D-004Z'],
        model: 'GL-D-004Z',
        vendor: 'Gledopto',
        description: 'Zigbee 9W Downlight RGB+CCT',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-D-004ZS'],
        model: 'GL-D-004ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 9W Downlight RGB+CCT (plus)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-D-004P'],
        model: 'GL-D-004P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 9W Downlight RGB+CCT (pro)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-D-005Z'],
        model: 'GL-D-005Z',
        vendor: 'Gledopto',
        description: 'Zigbee 12W Downlight RGB+CCT',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-D-005ZS'],
        model: 'GL-D-005ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 12W Downlight RGB+CCT (plus)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-D-005P'],
        model: 'GL-D-005P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 12W Downlight RGB+CCT (pro)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-FL-004TZ'],
        model: 'GL-FL-004TZ',
        vendor: 'Gledopto',
        description: 'Zigbee 10W Floodlight RGB+CCT',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-FL-004TZS'],
        model: 'GL-FL-004TZS',
        vendor: 'Gledopto',
        description: 'Zigbee 10W Floodlight RGB+CCT (plus)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color({colorTempRange: [155, 495]}),
    },
    {
        zigbeeModel: ['GL-FL-004P', 'GL-FL-004TZP'],
        model: 'GL-FL-004P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 10W Floodlight RGB+CCT (pro)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-FL-005TZ'],
        model: 'GL-FL-005TZ',
        vendor: 'Gledopto',
        description: 'Zigbee 30W Floodlight RGB+CCT',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-FL-005TZS'],
        model: 'GL-FL-005TZS',
        vendor: 'Gledopto',
        description: 'Zigbee 30W Floodlight RGB+CCT (plus)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-FL-005P', 'GL-FL-005TZP'],
        model: 'GL-FL-005P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 30W Floodlight RGB+CCT (pro)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-FL-006TZ'],
        model: 'GL-FL-006TZ',
        vendor: 'Gledopto',
        description: 'Zigbee 60W Floodlight RGB+CCT',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-FL-006TZS'],
        model: 'GL-FL-006TZS',
        vendor: 'Gledopto',
        description: 'Zigbee 60W Floodlight RGB+CCT (plus)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-FL-006P', 'GL-FL-006TZP'],
        model: 'GL-FL-006P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 60W Floodlight RGB+CCT (pro)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color({colorTempRange: [158, 495]}),
    },
    {
        zigbeeModel: ['GL-G-001Z'],
        model: 'GL-G-001Z',
        vendor: 'Gledopto',
        description: 'Zigbee 12W Garden Lamp RGB+CCT',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-G-001ZS'],
        model: 'GL-G-001ZS',
        vendor: 'Gledopto',
        description: 'Zigbee 12W Garden Lamp RGB+CCT (plus)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-G-001P'],
        model: 'GL-G-001P',
        vendor: 'Gledopto',
        ota: ota.zigbeeOTA,
        description: 'Zigbee 12W Garden Lamp RGB+CCT (pro)',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-G-007Z'],
        model: 'GL-G-007Z',
        vendor: 'Gledopto',
        description: 'Zigbee 9W Garden Lamp RGB+CCT',
        extend: preset.gledopto.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['GL-W-001Z'],
        model: 'GL-W-001Z',
        vendor: 'Gledopto',
        description: 'Zigbee On/Off Wall Switch',
        extend: preset.switch(),
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
    },

    // YSRSAI
    {
        fingerprint: [{modelID: 'ZB-CL01', manufacturerName: 'YSRSAI'}],
        zigbeeModel: ['ZB-CL03', 'FB56-ZCW20FB1.2'],
        model: 'YSR-MINI-01_rgbcct',
        vendor: 'YSRSAI',
        description: 'Zigbee LED controller (RGB+CCT)',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['ZB-CT01'],
        model: 'YSR-MINI-01_wwcw',
        vendor: 'YSRSAI',
        description: 'Zigbee LED controller (WW/CW)',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['ZB-DL01'],
        model: 'YSR-MINI-01_dimmer',
        vendor: 'YSRSAI',
        description: 'Zigbee LED controller (Dimmer)',
        extend: preset.light_onoff_brightness(),
    },

    // Somgoms
    {
        zigbeeModel: ['tdtqgwv'],
        model: 'ZSTY-SM-11ZG-US-W',
        vendor: 'Somgoms',
        description: '1 gang switch',
        extend: preset.switch(),
        exposes: [e.switch().setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.tuya_switch, fz.ignore_time_read, fz.ignore_basic_report],
        toZigbee: [tz.tuya_switch_state],
    },
    {
        zigbeeModel: ['bordckq'],
        model: 'ZSTY-SM-1CTZG-US-W',
        vendor: 'Somgoms',
        description: 'Curtain switch',
        fromZigbee: [fz.tuya_cover, fz.ignore_basic_report],
        toZigbee: [tz.tuya_cover_control, tz.tuya_cover_options],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET)],
    },
    {
        zigbeeModel: ['hpb9yts'],
        model: 'ZSTY-SM-1DMZG-US-W',
        vendor: 'Somgoms',
        description: 'Dimmer switch',
        fromZigbee: [fz.tuya_dimmer, fz.ignore_basic_report],
        toZigbee: [tz.tuya_dimmer_state, tz.tuya_dimmer_level],
        exposes: [e.light_brightness().setAccess('state', ea.STATE_SET).setAccess('brightness', ea.STATE_SET)],
        extend: preset.light_onoff_brightness(),
    },

    // ROBB
    {
        zigbeeModel: ['ROB_200-004-0'],
        model: 'ROB_200-004-0',
        vendor: 'ROBB',
        description: 'ZigBee AC phase-cut dimmer',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ROB_200-011-0'],
        model: 'ROB_200-011-0',
        vendor: 'ROBB',
        description: 'ZigBee AC phase-cut dimmer',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ROB_200-003-0'],
        model: 'ROB_200-003-0',
        vendor: 'ROBB',
        description: 'Zigbee AC in wall switch',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ROB_200-014-0'],
        model: 'ROB_200-014-0',
        vendor: 'ROBB',
        description: 'ZigBee AC phase-cut rotary dimmer',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ZG2833K8_EU05', 'ROB_200-007-0'],
        model: 'ROB_200-007-0',
        vendor: 'ROBB',
        description: 'Zigbee 8 button wall switch',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery, fz.ignore_genOta],
        exposes: [e.battery(), e.action([
            'on_1', 'off_1', 'brightness_move_up_1', 'brightness_move_down_1', 'brightness_stop_1',
            'on_2', 'off_2', 'brightness_move_up_2', 'brightness_move_down_2', 'brightness_stop_2',
            'on_3', 'off_3', 'brightness_move_up_3', 'brightness_move_down_3', 'brightness_stop_3',
            'on_4', 'off_4', 'brightness_move_up_4', 'brightness_move_down_4', 'brightness_stop_4'])],
        toZigbee: [],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: true}},
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG9001K8-DIM'}],
    },
    {
        zigbeeModel: ['ZG2833K4_EU06', 'ROB_200-008'],
        model: 'ROB_200-008-0',
        vendor: 'ROBB',
        description: 'Zigbee 4 button wall switch',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.battery(), e.action([
            'on_1', 'off_1', 'stop_1', 'brightness_move_up_1', 'brightness_move_down_1', 'brightness_stop_1',
            'on_2', 'off_2', 'stop_2', 'brightness_move_up_2', 'brightness_move_down_2', 'brightness_stop_2'])],
        toZigbee: [],
        meta: {multiEndpoint: true, battery: {dontDividePercentage: true}},
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG9001K4-DIM2'}],
    },
    {
        zigbeeModel: ['Motor Controller', 'ROB_200-010-0'],
        model: 'ROB_200-010-0',
        vendor: 'ROBB',
        description: 'Zigbee curtain motor controller',
        meta: {configureKey: 2, coverInverted: true},
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
        exposes: [e.cover_position()],
    },
    {
        zigbeeModel: ['ROB_200-018-0'],
        model: 'ROB_200-018-0',
        vendor: 'ROBB',
        description: 'ZigBee knob smart dimmer',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move_to_level, fz.command_move_to_color_temp],
        exposes: [e.action(['on', 'off', 'brightness_move_to_level', 'color_temperature_move'])],
        toZigbee: [],
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG2835'}],
    },

    // Namron
    {
        zigbeeModel: ['4512700'],
        model: '4512700',
        vendor: 'Namron',
        description: 'ZigBee dimmer 400W',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['4512704'],
        model: '4512704',
        vendor: 'Namron',
        description: 'Zigbee switch 400W',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['1402755'],
        model: '1402755',
        vendor: 'Namron',
        description: 'ZigBee LED dimmer',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['4512703'],
        model: '4512703',
        vendor: 'Namron',
        description: 'Zigbee 4 channel switch K8 (white)',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        exposes: [e.battery(), e.action([
            'on_l1', 'off_l1', 'brightness_move_up_l1', 'brightness_move_down_l1', 'brightness_stop_l1',
            'on_l2', 'off_l2', 'brightness_move_up_l2', 'brightness_move_down_l2', 'brightness_stop_l2',
            'on_l3', 'off_l3', 'brightness_move_up_l3', 'brightness_move_down_l3', 'brightness_stop_l3',
            'on_l4', 'off_l4', 'brightness_move_up_l4', 'brightness_move_down_l4', 'brightness_stop_l4',
        ])],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
    },
    {
        zigbeeModel: ['4512721'],
        model: '4512721',
        vendor: 'Namron',
        description: 'Zigbee 4 channel switch K8 (black)',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        toZigbee: [],
        meta: {multiEndpoint: true},
        exposes: [e.battery(), e.action([
            'on_l1', 'off_l1', 'brightness_move_up_l1', 'brightness_move_down_l1', 'brightness_stop_l1',
            'on_l2', 'off_l2', 'brightness_move_up_l2', 'brightness_move_down_l2', 'brightness_stop_l2',
            'on_l3', 'off_l3', 'brightness_move_up_l3', 'brightness_move_down_l3', 'brightness_stop_l3',
            'on_l4', 'off_l4', 'brightness_move_up_l4', 'brightness_move_down_l4', 'brightness_stop_l4'])],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
    },
    {
        zigbeeModel: ['4512701'],
        model: '4512701',
        vendor: 'Namron',
        description: 'Zigbee 1 channel switch K2',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        exposes: [e.battery(), e.action(['on', 'off', 'brightness_move_up', 'brightness_move_down', 'brightness_stop'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['4512702'],
        model: '4512702',
        vendor: 'Namron',
        description: 'Zigbee 1 channel switch K4',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop, fz.command_step],
        exposes: [e.battery(), e.action([
            'on', 'off', 'brightness_move_up', 'brightness_move_down', 'brightness_stop', 'brightness_step_up', 'brightness_step_down'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['4512719'],
        model: '4512719',
        vendor: 'Namron',
        description: 'Zigbee 2 channel switch K4 white',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        meta: {multiEndpoint: true},
        exposes: [e.battery(), e.action(['on_l1', 'off_l1', 'brightness_move_up_l1', 'brightness_move_down_l1', 'brightness_stop_l1',
            'on_l2', 'off_l2', 'brightness_move_up_l2', 'brightness_move_down_l2', 'brightness_stop_l2'])],
        toZigbee: [],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
    },
    {
        zigbeeModel: ['4512729'],
        model: '4512729',
        vendor: 'Namron',
        description: 'Zigbee 2 channel switch K4 white',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        meta: {multiEndpoint: true},
        exposes: [e.battery(), e.action(['on_l1', 'off_l1', 'brightness_move_up_l1', 'brightness_move_down_l1', 'brightness_stop_l1',
            'on_l2', 'off_l2', 'brightness_move_up_l2', 'brightness_move_down_l2', 'brightness_stop_l2'])],
        toZigbee: [],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
    },
    {
        zigbeeModel: ['4512706'],
        model: '4512706',
        vendor: 'Namron',
        description: 'Remote control',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step, fz.command_step_color_temperature, fz.command_recall,
            fz.command_move_to_color_temp, fz.battery],
        exposes: [e.battery(), e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'color_temperature_step_up',
            'color_temperature_step_down', 'recall_*', 'color_temperature_move'])],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
    },
    {
        zigbeeModel: ['4512705'],
        model: '4512705',
        vendor: 'Namron',
        description: 'Zigbee 4 channel remote control',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop, fz.command_recall],
        toZigbee: [],
        exposes: [e.battery(), e.action([
            'on_l1', 'off_l1', 'brightness_move_up_l1', 'brightness_move_down_l1', 'brightness_stop_l1',
            'on_l2', 'off_l2', 'brightness_move_up_l2', 'brightness_move_down_l2', 'brightness_stop_l2',
            'on_l3', 'off_l3', 'brightness_move_up_l3', 'brightness_move_down_l3', 'brightness_stop_l3',
            'on_l4', 'off_l4', 'brightness_move_up_l4', 'brightness_move_down_l4', 'brightness_stop_l4',
            'recall_*'])],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
    },
    {
        zigbeeModel: ['3802962'],
        model: '3802962',
        vendor: 'Namron',
        description: 'LED 9W RGBW E27',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['3802964'],
        model: '3802964',
        vendor: 'Namron',
        description: 'LED 5,3W CCT E14',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['89665'],
        model: '89665',
        vendor: 'Namron',
        description: 'LED Strip RGB+W (5m) IP20',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.light_onoff_brightness_colortemp_color(),
    },

    // SmartThings
    {
        zigbeeModel: ['PGC313'],
        model: 'STSS-MULT-001',
        vendor: 'SmartThings',
        description: 'Multipurpose sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['PGC314'],
        model: 'STSS-IRM-001',
        vendor: 'SmartThings',
        description: 'Motion sensor (2013 model)',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['tagv4'],
        model: 'STS-PRS-251',
        vendor: 'SmartThings',
        description: 'Arrival sensor',
        fromZigbee: [fz.STS_PRS_251_presence, fz.battery, fz.legacy.STS_PRS_251_beeping],
        exposes: [e.battery(), e.presence(), e.action(['beeping']), exposes.enum('beep', ea.SET, [''])],
        toZigbee: [tz.STS_PRS_251_beep],
        meta: {configureKey: 2, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genBinaryInput']);
            await reporting.batteryVoltage(endpoint);
            await reporting.presentValue(endpoint);
        },
    },
    {
        zigbeeModel: ['PGC410EU', 'PGC410'],
        model: 'STSS-PRES-001',
        vendor: 'SmartThings',
        description: 'Presence sensor',
        fromZigbee: [fz.PGC410EU_presence, fz.battery],
        exposes: [e.battery(), e.presence()],
        toZigbee: [],
    },
    {
        zigbeeModel: ['3325-S'],
        model: '3325-S',
        vendor: 'SmartThings',
        description: 'Motion sensor (2015 model)',
        fromZigbee: [fz.temperature, fz.ias_occupancy_alarm_2, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.occupancy(), e.battery(), e.tamper()],
    },
    {
        zigbeeModel: ['3321-S'],
        model: '3321-S',
        vendor: 'SmartThings',
        description: 'Multi Sensor (2015 model)',
        fromZigbee: [fz.temperature, fz.ias_contact_alarm_1_report, fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['3200-Sgb'],
        model: 'F-APP-UK-V2',
        vendor: 'SmartThings',
        description: 'Zigbee Outlet UK with power meter',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            // Does not support reading of acVoltageMultiplier/acVoltageDivisor
            await endpoint.read('haElectricalMeasurement', ['acCurrentMultiplier', 'acCurrentDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            // Limit updates to 3V and max 600s (10m)
            await reporting.rmsVoltage(endpoint, {max: 600, change: 3});
            // Limit updates to 0.01A and max 600s (10m)
            await reporting.rmsCurrent(endpoint, {max: 600, change: 10});
            // Limit updates to 4.0W and max 600s (10m)
            await reporting.activePower(endpoint, {max: 600, change: 40});
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
    },
    {
        zigbeeModel: ['ZB-ONOFFPlug-D0005'],
        model: 'GP-WOU019BBDWG',
        vendor: 'SmartThings',
        description: 'Outlet with power meter',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            // This plug only actively reports power. The voltage and current values are always 0, so we can ignore them.
            // https://github.com/Koenkk/zigbee2mqtt/issues/5198
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.activePower(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ['outlet'],
        model: 'IM6001-OTP05',
        vendor: 'SmartThings',
        description: 'Outlet',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['outletv4'],
        model: 'STS-OUT-US-2',
        vendor: 'SmartThings',
        description: 'Zigbee smart plug with power meter',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint, {change: 10});
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
    },
    {
        zigbeeModel: ['motion'],
        model: 'IM6001-MTP01',
        vendor: 'SmartThings',
        description: 'Motion sensor (2018 model)',
        fromZigbee: [fz.temperature, fz.ignore_iaszone_report, fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['motionv5'],
        model: 'STS-IRM-251',
        vendor: 'SmartThings',
        description: 'Motion sensor (2017 model)',
        fromZigbee: [fz.temperature, fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['motionv4'],
        model: 'STS-IRM-250',
        vendor: 'SmartThings',
        description: 'Motion sensor (2016 model)',
        fromZigbee: [fz.temperature, fz.ias_occupancy_alarm_2, fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_1500_2800'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
            // Has Unknown power source, force it.
            device.powerSource = 'Battery';
            device.save();
        },
        exposes: [e.temperature(), e.occupancy(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['3305-S', '3305'],
        model: '3305-S',
        vendor: 'SmartThings',
        description: 'Motion sensor (2014 model)',
        fromZigbee: [fz.temperature, fz.ias_occupancy_alarm_2, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['3300-S'],
        model: '3300-S',
        vendor: 'SmartThings',
        description: 'Door sensor',
        fromZigbee: [fz.temperature, fz.ias_contact_alarm_1_report, fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['multiv4'],
        model: 'F-MLT-US-2',
        vendor: 'SmartThings',
        description: 'Multipurpose sensor (2016 model)',
        fromZigbee: [fz.temperature, fz.battery, fz.ias_contact_alarm_1, fz.smartthings_acceleration],
        toZigbee: [],
        meta: {configureKey: 2, battery: {voltageToPercentage: '3V_1500_2800'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: 0x110A};
            await reporting.bind(endpoint, coordinatorEndpoint,
                ['msTemperatureMeasurement', 'genPowerCfg', 'manuSpecificSamsungAccelerometer']);
            await endpoint.write('manuSpecificSamsungAccelerometer', {0x0000: {value: 0x01, type: 0x20}}, options);
            await endpoint.write('manuSpecificSamsungAccelerometer', {0x0002: {value: 0x0276, type: 0x21}}, options);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
            const payloadA = reporting.payload('acceleration', 10, repInterval.MINUTE, 1);
            await endpoint.configureReporting('manuSpecificSamsungAccelerometer', payloadA, options);
            const payloadX = reporting.payload('x_axis', 10, repInterval.MINUTE, 1);
            await endpoint.configureReporting('manuSpecificSamsungAccelerometer', payloadX, options);
            const payloadY = reporting.payload('y_axis', 10, repInterval.MINUTE, 1);
            await endpoint.configureReporting('manuSpecificSamsungAccelerometer', payloadY, options);
            const payloadZ = reporting.payload('z_axis', 10, repInterval.MINUTE, 1);
            await endpoint.configureReporting('manuSpecificSamsungAccelerometer', payloadZ, options);
            // Has Unknown power source, force it.
            device.powerSource = 'Battery';
            device.save();
        },
        exposes: [
            e.temperature(), e.contact(), e.battery_low(), e.tamper(), e.battery(),
            e.moving(), e.x_axis(), e.y_axis(), e.z_axis(),
        ],
    },
    {
        zigbeeModel: ['multi'],
        model: 'IM6001-MPP01',
        vendor: 'SmartThings',
        description: 'Multipurpose sensor (2018 model)',
        fromZigbee: [fz.temperature, fz.battery, fz.ias_contact_alarm_1, fz.smartthings_acceleration],
        toZigbee: [],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: 0x1241};
            await reporting.bind(endpoint, coordinatorEndpoint,
                ['msTemperatureMeasurement', 'genPowerCfg', 'manuSpecificSamsungAccelerometer']);
            await endpoint.write('manuSpecificSamsungAccelerometer', {0x0000: {value: 0x14, type: 0x20}}, options);
            await reporting.temperature(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            const payloadA = reporting.payload('acceleration', 10, repInterval.MINUTE, 1);
            await endpoint.configureReporting('manuSpecificSamsungAccelerometer', payloadA, options);
            const payloadX = reporting.payload('x_axis', 10, repInterval.MINUTE, 1);
            await endpoint.configureReporting('manuSpecificSamsungAccelerometer', payloadX, options);
            const payloadY = reporting.payload('y_axis', 10, repInterval.MINUTE, 1);
            await endpoint.configureReporting('manuSpecificSamsungAccelerometer', payloadY, options);
            const payloadZ = reporting.payload('z_axis', 10, repInterval.MINUTE, 1);
            await endpoint.configureReporting('manuSpecificSamsungAccelerometer', payloadZ, options);
        },
        exposes: [
            e.temperature(), e.contact(), e.battery_low(), e.tamper(), e.battery(),
            e.moving(), e.x_axis(), e.y_axis(), e.z_axis(),
        ],
    },
    {
        zigbeeModel: ['3310-S'],
        model: '3310-S',
        vendor: 'SmartThings',
        description: 'Temperature and humidity sensor',
        fromZigbee: [fz.temperature, fz._3310_humidity, fz.battery],
        exposes: [e.temperature(), e.humidity(), e.battery()],
        toZigbee: [],
        meta: {configureKey: 2, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['msTemperatureMeasurement', 'manuSpecificCentraliteHumidity', 'genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint);

            const payload = [{
                attribute: 'measuredValue',
                minimumReportInterval: 10,
                maximumReportInterval: repInterval.HOUR,
                reportableChange: 10,
            }];
            await endpoint.configureReporting('manuSpecificCentraliteHumidity', payload, {manufacturerCode: 0x104E});

            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['3315-S'],
        model: '3315-S',
        vendor: 'SmartThings',
        description: 'Water sensor',
        fromZigbee: [fz.temperature, fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['3315-Seu'],
        model: 'WTR-UK-V2',
        vendor: 'SmartThings',
        description: 'Water leak sensor (2015 model)',
        fromZigbee: [fz.temperature, fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['water'],
        model: 'IM6001-WLP01',
        vendor: 'SmartThings',
        description: 'Water leak sensor (2018 model)',
        fromZigbee: [fz.temperature, fz.ias_water_leak_alarm_1, fz.battery, fz.ias_water_leak_alarm_1_report],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['moisturev4'],
        model: 'STS-WTR-250',
        vendor: 'SmartThings',
        description: 'Water leak sensor (2016 model)',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery, fz.temperature],
        toZigbee: [],
        meta: {configureKey: 2, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'msTemperatureMeasurement']);
            await reporting.batteryVoltage(endpoint);
            await reporting.temperature(endpoint);
        },
        exposes: [e.water_leak(), e.battery_low(), e.tamper(), e.battery(), e.temperature()],
    },
    {
        zigbeeModel: ['3315-G'],
        model: '3315-G',
        vendor: 'SmartThings',
        description: 'Water sensor',
        fromZigbee: [fz.temperature, fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['button'],
        model: 'IM6001-BTP01',
        vendor: 'SmartThings',
        description: 'Button',
        fromZigbee: [fz.command_status_change_notification_action, fz.legacy.st_button_state, fz.battery, fz.temperature,
            fz.ignore_iaszone_attreport],
        exposes: [e.action(['off', 'single', 'double', 'hold']), e.battery(), e.temperature()],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['Z-SRN12N', 'SZ-SRN12N'],
        model: 'SZ-SRN12N',
        vendor: 'SmartThings',
        description: 'Smart siren',
        fromZigbee: [],
        toZigbee: [tz.warning],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
        },
        exposes: [e.warning()],
    },
    {
        zigbeeModel: ['zbt-dimlight-gls0006'],
        model: 'GP-LBU019BBAWU',
        vendor: 'SmartThings',
        description: 'Smart bulb',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['ZBT-DIMLight-GLS0044'],
        model: '7ZA-A806ST-Q1R',
        vendor: 'SmartThings',
        description: 'Smart bulb',
        extend: preset.light_onoff_brightness(),
    },

    // Trust
    {
        zigbeeModel: ['WATER_TPV14'],
        model: 'ZWLD-100',
        vendor: 'Trust',
        description: 'Water leakage detector',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.ignore_basic_report, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'+
                      '\u0000\u0000\u0000\u0000\u0000', 'ZLL-NonColorController'],
        model: 'ZYCT-202',
        vendor: 'Trust',
        description: 'Remote control',
        fromZigbee: [fz.command_on, fz.command_off_with_effect, fz.legacy.ZYCT202_stop, fz.legacy.ZYCT202_up_down],
        exposes: [e.action(['on', 'off', 'stop', 'brightness_stop', 'brightness_move_up', 'brightness_move_down'])],
        toZigbee: [],
        // Device does not support battery: https://github.com/Koenkk/zigbee2mqtt/issues/5928
    },
    {
        zigbeeModel: ['ZLL-DimmableLigh'],
        model: 'ZLED-2709',
        vendor: 'Trust',
        description: 'Smart Dimmable LED Bulb',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['ZLL-ColorTempera', 'ZLL-ColorTemperature'],
        model: 'ZLED-TUNE9',
        vendor: 'Trust',
        description: 'Smart tunable LED bulb',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['VMS_ADUROLIGHT'],
        model: 'ZPIR-8000',
        vendor: 'Trust',
        description: 'Motion Sensor',
        fromZigbee: [fz.ias_occupancy_alarm_2, fz.battery, fz.ignore_basic_report],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['CSW_ADUROLIGHT'],
        model: 'ZCTS-808',
        vendor: 'Trust',
        description: 'Wireless contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ignore_basic_report],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },

    // Paulmann
    {
        zigbeeModel: ['H036-0007'],
        model: '929.66',
        vendor: 'Paulmann',
        description: 'Smart home Zigbee LED module coin 1x2.5W RGBW',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['Switch Controller '],
        model: '50043',
        vendor: 'Paulmann',
        description: 'SmartHome Zigbee Cephei Switch Controller',
        extend: preset.switch(),
    },
    {
        zigbeeModel: ['Dimmablelight '],
        model: '50044/50045',
        vendor: 'Paulmann',
        description: 'SmartHome Zigbee Dimmer or LED-stripe',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['500.47'],
        model: '500.47',
        vendor: 'Paulmann',
        description: 'SmartHome Zigbee MaxLED RGBW controller max. 72W 24V DC',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['RGBW light', '500.49'],
        model: '50049/500.63',
        vendor: 'Paulmann',
        description: 'Smart Home Zigbee YourLED RGB Controller max. 60W / Smart Home Zigbee LED Reflektor 3,5W GU10 RGBW dimmbar',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['CCT light'],
        model: '50064',
        vendor: 'Paulmann',
        description: 'SmartHome led spot',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['500.46', 'H036-0006'],
        model: '929.63',
        vendor: 'Paulmann',
        description: 'SmartHome Zigbee LED-Modul Coin 1x6W Tunable White',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['H036-0005'],
        model: '929.60',
        vendor: 'Paulmann',
        description: 'SmartHome Zigbee LED-Modul Coin 1x6W White',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['371000001'],
        model: '371000001',
        vendor: 'Paulmann',
        description: 'SmartHome led spot tuneable white',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['371000002'],
        model: '371000002',
        vendor: 'Paulmann',
        description: 'Amaris LED panels',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['500.45'],
        model: '798.15',
        vendor: 'Paulmann',
        description: 'SmartHome Zigbee Pendulum Light Aptare',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['500.48'],
        model: '500.48',
        vendor: 'Paulmann',
        description: 'SmartHome Zigbee YourLED dim/switch controller max. 60 W',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['H036-0001'],
        model: '93999',
        vendor: 'Paulmann',
        description: 'Plug Shine Zigbee controller',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['RemoteControl '],
        model: '500.67',
        vendor: 'Paulmann',
        description: 'RGB remote control',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_toggle, fz.command_step, fz.command_move_to_color_temp,
            fz.command_move_to_color, fz.command_stop, fz.command_move, fz.command_color_loop_set,
            fz.command_ehanced_move_to_hue_and_saturation, fz.tint_scene],
        toZigbee: [],
        exposes: [e.action([
            'on', 'off', 'toggle', 'brightness_step_up', 'brightness_step_down', 'color_temperature_move', 'color_move', 'brightness_stop',
            'brightness_move_down', 'brightness_move_up', 'color_loop_set', 'enhanced_move_to_hue_and_saturation', 'scene_*'])],
    },

    // Bitron
    {
        zigbeeModel: ['AV2010/34'],
        model: 'AV2010/34',
        vendor: 'Bitron',
        description: '4-Touch single click buttons',
        fromZigbee: [fz.ignore_power_report, fz.command_recall, fz.legacy.AV2010_34_click],
        toZigbee: [],
        exposes: [e.action(['recall_*'])],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
        },
    },
    {
        zigbeeModel: ['902010/22', 'IR_00.00.03.12TC'],
        model: 'AV2010/22',
        vendor: 'Bitron',
        description: 'Wireless motion detector',
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
        whiteLabel: [{vendor: 'ClimaxTechnology', model: 'IR-9ZBS-SL'}],
    },
    {
        zigbeeModel: ['AV2010/22A'],
        model: 'AV2010/22A',
        vendor: 'Bitron',
        description: 'Wireless motion detector',
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['902010/25'],
        model: 'AV2010/25',
        vendor: 'Bitron',
        description: 'Video wireless socket',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power()],
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.instantaneousDemand(endpoint);
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 10000, multiplier: 1});
        },
    },
    {
        zigbeeModel: ['902010/26'],
        model: 'AV2010/26',
        vendor: 'Bitron',
        description: 'Wireless socket and brightness regulator',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['902010/28'],
        model: '902010/128',
        vendor: 'Bitron',
        description: 'Home wireless socket',
        extend: preset.switch(),
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['AV2010/29A'],
        model: 'AV2010/29A',
        vendor: 'Bitron',
        description: 'SMaBiT Zigbee outdoor siren',
        fromZigbee: [fz.ias_no_alarm],
        toZigbee: [tz.warning],
        exposes: [e.warning(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['902010/32'],
        model: 'AV2010/32',
        vendor: 'Bitron',
        description: 'Wireless wall thermostat with relay',
        fromZigbee: [fz.legacy.bitron_thermostat_att_report, fz.battery],
        toZigbee: [tz.thermostat_occupied_heating_setpoint, tz.thermostat_local_temperature_calibration, tz.thermostat_local_temperature,
            tz.thermostat_running_state, tz.thermostat_temperature_display_mode, tz.thermostat_system_mode],
        exposes: [e.battery(), exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 0.5).withLocalTemperature()
            .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat', 'cool']).withLocalTemperatureCalibration()],
        meta: {configureKey: 2, battery: {voltageToPercentage: '3V_2500_3200'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genPowerCfg', 'genIdentify', 'genPollCtrl', 'hvacThermostat', 'hvacUserInterfaceCfg',
            ];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint, {min: 900, max: repInterval.HOUR, change: 1});
            await reporting.thermostatTemperatureCalibration(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.batteryAlarmState(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['902010/21A'],
        model: 'AV2010/21A',
        vendor: 'Bitron',
        description: 'Compact magnetic contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['902010/24A'],
        model: 'AV2010/24A',
        vendor: 'Bitron',
        description: 'Optical smoke detector (hardware version v2)',
        fromZigbee: [fz.ias_smoke_alarm_1],
        toZigbee: [tz.warning],
        exposes: [e.smoke(), e.battery_low(), e.tamper(), e.warning()],
    },
    {
        zigbeeModel: ['902010/24'],
        model: '902010/24',
        vendor: 'Bitron',
        description: 'Optical smoke detector (hardware version v1)',
        fromZigbee: [fz.ias_smoke_alarm_1],
        toZigbee: [tz.warning],
        exposes: [e.smoke(), e.battery_low(), e.tamper(), e.warning()],
    },
    {
        zigbeeModel: ['902010/29'],
        model: '902010/29',
        vendor: 'Bitron',
        description: 'Zigbee outdoor siren',
        fromZigbee: [fz.battery],
        toZigbee: [tz.warning],
        exposes: [e.battery_low(), e.tamper(), e.warning()],
    },
    {
        zigbeeModel: ['902010/23'],
        model: '902010/23',
        vendor: 'Bitron',
        description: '4 button Zigbee remote control',
        fromZigbee: [fz.ias_no_alarm, fz.command_on, fz.command_off, fz.command_step, fz.command_recall],
        toZigbee: [],
        meta: {configureKey: 1},
        exposes: [e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'recall_*']), e.battery_low()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genBasic', 'genOnOff', 'genLevelCtrl']);
        },
    },

    // Iris
    {
        zigbeeModel: ['1116-S'],
        model: 'IL06_1',
        vendor: 'Iris',
        description: 'Contact and temperature sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2100'}, configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['3210-L'],
        model: '3210-L',
        vendor: 'Iris',
        description: 'Smart plug',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        meta: {configureKey: 5},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            // 3210-L doesn't support reading 'acVoltageMultiplier' or 'acVoltageDivisor'
            await endpoint.read('haElectricalMeasurement', ['acCurrentMultiplier', 'acCurrentDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.onOff(endpoint);
            await reporting.rmsVoltage(endpoint, {change: 2}); // Voltage reports in V
            await reporting.rmsCurrent(endpoint, {change: 10}); // Current reports in mA
            await reporting.activePower(endpoint); // Power reports in 0.1W
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
    },
    {
        zigbeeModel: ['3326-L'],
        model: '3326-L',
        vendor: 'Iris',
        description: 'Motion and temperature sensor',
        fromZigbee: [fz.ias_occupancy_alarm_2, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2100'}, configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['3320-L'],
        model: '3320-L',
        vendor: 'Iris',
        description: 'Contact and temperature sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2100'}, configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['3450-L'],
        model: '3450-L',
        vendor: 'Iris',
        description: 'Smart fob',
        fromZigbee: [fz.command_on_presence, fz.command_off, fz.battery, fz.checkin_presence],
        toZigbee: [],
        exposes: [e.action(['on_1', 'off_1', 'on_2', 'off_2', 'on_3', 'off_3', 'on_4', 'off_4']),
            e.battery(), e.presence()],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2100'}, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'genPowerCfg', 'genPollCtrl']);
            await reporting.batteryVoltage(endpoint1);
            const interval = 100 - 10; // 100 seconds is default timeout so set inverval to 10 seconds before
            await endpoint1.write('genPollCtrl', {'checkinInterval': (interval * 4)});
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ['genOnOff']);
            const endpoint4 = device.getEndpoint(4);
            await reporting.bind(endpoint4, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['3460-L'],
        model: '3460-L',
        vendor: 'Iris',
        description: 'Smart button',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.temperature],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.action(['on', 'off'])],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg', 'msTemperatureMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.batteryVoltage(endpoint);
            await reporting.temperature(endpoint);
        },
    },
    {
        zigbeeModel: ['1117-S'],
        model: 'iL07_1',
        vendor: 'Iris',
        description: 'Motion Sensor',
        fromZigbee: [fz.ias_occupancy_alarm_2, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.temperature(), e.humidity()],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'msRelativeHumidity']);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
        },
    },
    {
        zigbeeModel: ['HT8-ZB'],
        model: '27087-03',
        vendor: 'Iris',
        description: 'Hose faucet water timer',
        fromZigbee: [fz.on_off, fz.battery, fz.ignore_time_read],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.switch(), e.battery()],
    },

    // ksentry
    {
        zigbeeModel: ['Lamp_01'],
        model: 'KS-SM001',
        vendor: 'Ksentry Electronics',
        description: '[Zigbee OnOff Controller](http://ksentry.manufacturer.globalsources.com/si/6008837134660'+
                     '/pdtl/ZigBee-module/1162731630/zigbee-on-off-controller-modules.htm)',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },

    // Ninja Blocks
    {
        zigbeeModel: ['Ninja Smart Plug'],
        model: 'Z809AF',
        vendor: 'Ninja Blocks',
        description: 'Zigbee smart plug with power meter',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },

    // Commercial Electric
    {
        zigbeeModel: ['Zigbee CCT Downlight'],
        model: '53170161',
        vendor: 'Commercial Electric',
        description: 'Matte White Recessed Retrofit Smart Led Downlight - 4 Inch',
        extend: preset.light_onoff_brightness_colortemp(),
    },

    // ilux
    {
        zigbeeModel: ['LEColorLight'],
        model: '900008-WW',
        vendor: 'ilux',
        description: 'Dimmable A60 E27 LED Bulb',
        extend: preset.light_onoff_brightness(),
    },

    // Dresden Elektronik
    {
        zigbeeModel: ['FLS-PP3'],
        model: 'Mega23M12',
        vendor: 'Dresden Elektronik',
        description: 'ZigBee Light Link wireless electronic ballast',
        extend: preset.light_onoff_brightness_colortemp_color(),
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
        extend: preset.light_onoff_brightness_colortemp(),
    },

    // Centralite
    {
        zigbeeModel: ['4256251-RZHAC'],
        model: '4256251-RZHAC',
        vendor: 'Centralite',
        description: 'White Swiss power outlet switch with power meter',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.voltage(), e.current()],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: ['4257050-ZHAC'],
        model: '4257050-ZHAC',
        vendor: 'Centralite',
        description: '3-Series smart dimming outlet',
        fromZigbee: [fz.restorable_brightness, fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.light_onoff_restorable_brightness],
        exposes: [e.light_brightness(), e.power(), e.voltage(), e.current()],
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            // 4257050-ZHAC doesn't support reading 'acVoltageMultiplier' or 'acVoltageDivisor'
            await endpoint.read('haElectricalMeasurement', ['acCurrentMultiplier', 'acCurrentDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.rmsVoltage(endpoint, {change: 2}); // Voltage reports in V
            await reporting.rmsCurrent(endpoint, {change: 10}); // Current reports in mA
            await reporting.activePower(endpoint, {change: 2}); // Power reports in 0.1W
        },
    },
    {
        zigbeeModel: ['4257050-RZHAC'],
        model: '4257050-RZHAC',
        vendor: 'Centralite',
        description: '3-Series smart outlet',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            try {
                await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            } catch (exception) {
                // For some this fails so set manually
                // https://github.com/Koenkk/zigbee2mqtt/issues/3575
                endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                    acCurrentDivisor: 10, acCurrentMultiplier: 1, powerMultiplier: 1, powerDivisor: 10});
            }
            await reporting.rmsVoltage(endpoint, {change: 2}); // Voltage reports in V
            await reporting.rmsCurrent(endpoint, {change: 10}); // Current reports in mA
            await reporting.activePower(endpoint, {change: 2}); // Power reports in 0.1W
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
    },
    {
        zigbeeModel: ['3323-G'],
        model: '3323-G',
        vendor: 'Centralite',
        description: 'Micro-door sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.temperature(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature()],
    },
    {
        zigbeeModel: ['3400-D', '3400'],
        model: '3400-D',
        vendor: 'Centralite',
        description: '3-Series security keypad',
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.command_arm_with_transaction, fz.temperature, fz.battery, fz.ias_ace_occupancy_with_timeout],
        exposes: [e.battery(), e.temperature(), e.occupancy(), e.action([
            'disarm', 'arm_day_zones', 'arm_night_zones', 'arm_all_zones', 'exit_delay', 'emergency'])],
        toZigbee: [tz.arm_mode],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const clusters = ['msTemperatureMeasurement', 'genPowerCfg', 'ssIasZone', 'ssIasAce'];
            await reporting.bind(endpoint, coordinatorEndpoint, clusters);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        onEvent: async (type, data, device) => {
            if (type === 'message' && data.type === 'commandGetPanelStatus' && data.cluster === 'ssIasAce' &&
                globalStore.hasValue(device.getEndpoint(1), 'panelStatus')) {
                const payload = {
                    panelstatus: globalStore.getValue(device.getEndpoint(1), 'panelStatus'),
                    secondsremain: 0x00, audiblenotif: 0x00, alarmstatus: 0x00,
                };
                await device.getEndpoint(1).commandResponse(
                    'ssIasAce', 'getPanelStatusRsp', payload, {}, data.meta.zclTransactionSequenceNumber,
                );
            }
        },
    },
    {
        zigbeeModel: ['3420'],
        model: '3420-G',
        vendor: 'Centralite',
        description: '3-Series night light repeater',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['3157100'],
        model: '3157100',
        vendor: 'Centralite',
        description: '3-Series pearl touch thermostat,',
        fromZigbee: [fz.battery, fz.legacy.thermostat_att_report, fz.fan, fz.ignore_time_read],
        toZigbee: [tz.factory_reset, tz.thermostat_local_temperature, tz.thermostat_local_temperature_calibration, tz.thermostat_occupancy,
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_occupied_cooling_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_unoccupied_cooling_setpoint, tz.thermostat_setpoint_raise_lower, tz.thermostat_remote_sensing,
            tz.thermostat_control_sequence_of_operation, tz.thermostat_system_mode, tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule, tz.thermostat_relay_status_log, tz.fan_mode, tz.thermostat_running_state],
        exposes: [e.battery(), exposes.climate().withSetpoint('occupied_heating_setpoint', 10, 30, 1).withLocalTemperature()
            .withSystemMode(['off', 'heat', 'cool']).withRunningState(['idle', 'heat', 'cool']).withFanMode(['auto', 'on'])
            .withSetpoint('occupied_cooling_setpoint', 10, 30, 1).withLocalTemperatureCalibration().withPiHeatingDemand()],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'hvacThermostat', 'hvacFanCtrl']);
            await reporting.batteryVoltage(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.fanMode(endpoint);
        },
    },
    {
        zigbeeModel: ['4200-C'],
        model: '4200-C',
        vendor: 'Centralite',
        description: 'Smart outlet',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },

    // Xfinity
    {
        zigbeeModel: ['URC4450BC0-X-R'],
        model: 'URC4450BC0-X-R',
        vendor: 'Xfinity',
        description: 'Alarm security keypad',
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.command_arm, fz.temperature, fz.battery, fz.ias_occupancy_alarm_1, fz.identify, fz.ias_contact_alarm_1,
            fz.ias_ace_occupancy_with_timeout],
        exposes: [e.battery(), e.battery_voltage(), e.occupancy(), e.battery_low(), e.tamper(), e.presence(), e.contact(),
            exposes.numeric('action_code', ea.STATE), exposes.text('action_zone', ea.STATE), e.temperature(), e.action([
                'disarm', 'arm_day_zones', 'identify', 'arm_night_zones', 'arm_all_zones', 'exit_delay', 'emergency',
            ])],
        toZigbee: [tz.arm_mode],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const clusters = ['msTemperatureMeasurement', 'genPowerCfg', 'ssIasZone', 'ssIasAce', 'genBasic', 'genIdentify'];
            await reporting.bind(endpoint, coordinatorEndpoint, clusters);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        onEvent: async (type, data, device) => {
            if (type === 'message' && data.type === 'commandGetPanelStatus' && data.cluster === 'ssIasAce' &&
                globalStore.hasValue(device.getEndpoint(1), 'panelStatus')) {
                const payload = {
                    panelstatus: globalStore.getValue(device.getEndpoint(1), 'panelStatus'),
                    secondsremain: 0x00, audiblenotif: 0x00, alarmstatus: 0x00,
                };
                await device.getEndpoint(1).commandResponse(
                    'ssIasAce', 'getPanelStatusRsp', payload, {}, data.meta.zclTransactionSequenceNumber,
                );
            }
        },
    },

    // Blaupunkt
    {
        zigbeeModel: ['SCM-2_00.00.03.15', 'SCM-R_00.00.03.15TC', 'SCM_00.00.03.14TC', 'SCM_00.00.03.05TC'],
        model: 'SCM-S1',
        vendor: 'Blaupunkt',
        description: 'Roller shutter',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff],
        toZigbee: [tz.cover_via_brightness],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genLevelCtrl']);
            try {
                await reporting.brightness(endpoint);
            } catch (e) {
                // Some version don't support this: https://github.com/Koenkk/zigbee2mqtt/issues/4246
            }
        },
        exposes: [e.cover_position().setAccess('state', ea.ALL)],
    },

    // Lupus
    {
        zigbeeModel: ['SCM_00.00.03.11TC'],
        model: '12031',
        vendor: 'Lupus',
        description: 'Roller shutter',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff],
        toZigbee: [tz.cover_via_brightness],
        exposes: [e.cover_position().setAccess('state', ea.ALL)],
    },
    {
        zigbeeModel: ['SCM-3-OTA_00.00.03.16TC'],
        model: 'LS12128',
        vendor: 'Lupus',
        description: 'Roller shutter',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff],
        toZigbee: [tz.cover_via_brightness],
        exposes: [e.cover_position().setAccess('state', ea.ALL)],
    },
    {
        zigbeeModel: ['PSMP5_00.00.03.11TC'],
        model: '12050',
        vendor: 'Lupus',
        description: 'LUPUSEC mains socket with power meter',
        fromZigbee: [fz.on_off, fz.metering],
        exposes: [e.switch(), e.power()],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.instantaneousDemand(endpoint);
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 10, multiplier: 1});
        },
    },
    {
        zigbeeModel: ['PRS3CH1_00.00.05.10TC'],
        model: '12126',
        vendor: 'Lupus',
        description: '1 chanel relay',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['PRS3CH2_00.00.05.10TC', 'PRS3CH2_00.00.05.11TC'],
        model: '12127',
        vendor: 'Lupus',
        description: '2 chanel relay',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        meta: {multiEndpoint: true, configureKey: 2},
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
        },
    },

    // Climax
    {
        zigbeeModel: ['PSS_00.00.00.15TC'],
        model: 'PSS-23ZBS',
        vendor: 'Climax',
        description: 'Power plug',
        extend: preset.switch(),
    },
    {
        zigbeeModel: ['SD8SC_00.00.03.12TC'],
        model: 'SD-8SCZBS',
        vendor: 'Climax',
        description: 'Smoke detector',
        fromZigbee: [fz.ias_smoke_alarm_1, fz.battery],
        toZigbee: [tz.warning],
        exposes: [e.smoke(), e.battery(), e.battery_low(), e.tamper(), e.warning()],

    },
    {
        zigbeeModel: ['WS15_00.00.00.10TC'],
        model: 'WLS-15ZBS',
        vendor: 'Climax',
        description: 'Water leakage sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['SCM-3_00.00.03.15'],
        model: 'SCM-5ZBS',
        vendor: 'Climax',
        description: 'Roller shutter',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff],
        toZigbee: [tz.cover_via_brightness],
        exposes: [e.cover_position().setAccess('state', ea.ALL)],
    },
    {
        zigbeeModel: ['PSM_00.00.00.35TC', 'PSMP5_00.00.02.02TC', 'PSMP5_00.00.05.01TC', 'PSMP5_00.00.05.10TC', 'PSMP5_00.00.03.15TC',
            'PSMP5_00.00.03.16TC', 'PSMP5_00.00.03.19TC'],
        model: 'PSM-29ZBSR',
        vendor: 'Climax',
        description: 'Power plug',
        fromZigbee: [fz.on_off, fz.metering, fz.ignore_basic_report],
        toZigbee: [tz.on_off, tz.ignore_transition],
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint, {min: 10, change: 2});
        },
        whiteLabel: [{vendor: 'Blaupunkt', model: 'PSM-S1'}],
        exposes: [e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ['RS_00.00.02.06TC'],
        model: 'RS-23ZBS',
        vendor: 'Climax',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.temperature, fz.humidity],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'msRelativeHumidity']);
            await reporting.temperature(endpoint);
            // configureReporting.humidity(endpoint); not needed and fails
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1312
        },
        exposes: [e.temperature(), e.humidity()],
    },
    {
        zigbeeModel: ['SRACBP5_00.00.03.06TC', 'SRAC_00.00.00.16TC'],
        model: 'SRAC-23B-ZBSR',
        vendor: 'Climax',
        description: 'Smart siren',
        fromZigbee: [fz.battery],
        toZigbee: [tz.warning],
        exposes: [e.warning(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['WS15_00.00.00.14TC'],
        model: 'WS-15ZBS',
        vendor: 'Climax',
        description: 'Water leak sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['CO_00.00.00.15TC', 'CO_00.00.00.22TC'],
        model: 'CO-8ZBS',
        vendor: 'Climax',
        description: 'Smart carbon monoxide sensor',
        fromZigbee: [fz.ias_carbon_monoxide_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.carbon_monoxide(), e.battery_low(), e.tamper(), e.battery()],
    },

    // Niviss
    {
        zigbeeModel: ['NIV-ZC-OFD'],
        model: 'PS-ZIGBEE-SMART-CONTROLER-1CH-DIMMABLE',
        vendor: 'Niviss',
        description: 'Zigbee smart controller',
        extend: preset.light_onoff_brightness(),
    },

    // HEIMAN
    {
        zigbeeModel: ['CO_V15', 'CO_YDLV10', 'CO_V16', '1ccaa94c49a84abaa9e38687913947ba'],
        model: 'HS1CA-M',
        description: 'Smart carbon monoxide sensor',
        vendor: 'HEIMAN',
        fromZigbee: [fz.ias_carbon_monoxide_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryAlarmState(endpoint);
        },
        exposes: [e.carbon_monoxide(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['PIRSensor-N', 'PIRSensor-EM', 'PIRSensor-EF-3.0', 'PIR_TPV13'],
        model: 'HS3MS',
        vendor: 'HEIMAN',
        description: 'Smart motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['SmartPlug'],
        model: 'HS2SK',
        description: 'Smart metering plug',
        vendor: 'HEIMAN',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        meta: {configureKey: 5},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
    },
    {
        fingerprint: [{modelID: 'SmartPlug-N', manufacturerName: 'HEIMAN'}],
        model: 'HS2SK_nxp',
        description: 'Smart metering plug',
        vendor: 'HEIMAN',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        meta: {configureKey: 5},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
        },
        onEvent: (type, data, device, options) => {
            const endpoint = device.getEndpoint(1);
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            } else if (!globalStore.hasValue(device, 'interval')) {
                const seconds = options && options.measurement_poll_interval ? options.measurement_poll_interval : 60;
                const interval = setInterval(async () => {
                    try {
                        await endpoint.read('haElectricalMeasurement', ['rmsVoltage', 'rmsCurrent', 'activePower']);
                    } catch (error) {/* Do nothing*/}
                }, seconds*1000);
                globalStore.putValue(device, 'interval', interval);
            }
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
    },
    {
        zigbeeModel: ['SMOK_V16', 'SMOK_V15', 'b5db59bfd81e4f1f95dc57fdbba17931', '98293058552c49f38ad0748541ee96ba', 'SMOK_YDLV10',
            'SmokeSensor-EM', 'FB56-SMF02HM1.4', 'SmokeSensor-N-3.0'],
        model: 'HS1SA',
        vendor: 'HEIMAN',
        description: 'Smoke detector',
        fromZigbee: [fz.ias_smoke_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.smoke(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['SmokeSensor-N', 'SmokeSensor-EF-3.0'],
        model: 'HS3SA',
        vendor: 'HEIMAN',
        description: 'Smoke detector',
        fromZigbee: [fz.ias_smoke_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.smoke(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['GASSensor-N'],
        model: 'HS3CG',
        vendor: 'HEIMAN',
        description: 'Combustible gas sensor',
        fromZigbee: [fz.ias_gas_alarm_1],
        toZigbee: [],
        exposes: [e.gas(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['GASSensor-EN'],
        model: 'HS1CG-M',
        vendor: 'HEIMAN',
        description: 'Combustible gas sensor',
        fromZigbee: [fz.ias_gas_alarm_1],
        toZigbee: [],
        exposes: [e.gas(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['GAS_V15'],
        model: 'HS1CG_M',
        vendor: 'HEIMAN',
        description: 'Combustible gas sensor',
        fromZigbee: [fz.ias_gas_alarm_2],
        toZigbee: [],
        exposes: [e.gas(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['DoorSensor-N', 'DoorSensor-N-3.0'],
        model: 'HS3DS',
        vendor: 'HEIMAN',
        description: 'Door sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint, {min: repInterval.MINUTES_5, max: repInterval.HOUR});
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
        },
        exposes: [e.contact(), e.battery(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['DoorSensor-EM', 'DoorSensor-EF-3.0'],
        model: 'HS1DS',
        vendor: 'HEIMAN',
        description: 'Door sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint, {min: repInterval.MINUTES_5, max: repInterval.HOUR});
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['DOOR_TPV13', 'DOOR_TPV12'],
        model: 'HEIMAN-M1',
        vendor: 'HEIMAN',
        description: 'Door sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['WaterSensor-N', 'WaterSensor-EM', 'WaterSensor-N-3.0', 'WaterSensor-EF-3.0'],
        model: 'HS1WL/HS3WL',
        vendor: 'HEIMAN',
        description: 'Water leakage sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint, {min: repInterval.MINUTES_5, max: repInterval.HOUR});
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
        },
        exposes: [e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        fingerprint: [{modelID: 'RC-N', manufacturerName: 'HEIMAN'}],
        model: 'HS1RC-N',
        vendor: 'HEIMAN',
        description: 'Smart remote controller',
        fromZigbee: [fz.battery, fz.legacy.heiman_smart_controller_armmode, fz.command_emergency],
        toZigbee: [],
        exposes: [e.battery(), e.action(['emergency', 'disarm', 'arm_partial_zones', 'arm_all_zones'])],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint, {min: repInterval.MINUTES_5, max: repInterval.HOUR});
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
        },
    },
    {
        fingerprint: [{modelID: 'RC-EF-3.0', manufacturerName: 'HEIMAN'}],
        model: 'HM1RC-2-E',
        vendor: 'HEIMAN',
        description: 'Smart remote controller',
        fromZigbee: [fz.battery, fz.command_arm, fz.command_emergency],
        toZigbee: [],
        exposes: [e.battery(), e.action(['emergency', 'disarm', 'arm_partial_zones', 'arm_all_zones'])],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint, {min: repInterval.MINUTES_5, max: repInterval.HOUR});
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
        },
        onEvent: async (type, data, device) => {
            // Since arm command has a response zigbee-herdsman doesn't send a default response.
            // This causes the remote to repeat the arm command, so send a default response here.
            if (data.type === 'commandArm' && data.cluster === 'ssIasAce') {
                await data.endpoint.defaultResponse(0, 0, 1281, data.meta.zclTransactionSequenceNumber);
            }
        },
    },
    {
        fingerprint: [{modelID: 'RC-EM', manufacturerName: 'HEIMAN'}],
        model: 'HS1RC-EM',
        vendor: 'HEIMAN',
        description: 'Smart remote controller',
        fromZigbee: [fz.battery, fz.legacy.heiman_smart_controller_armmode, fz.command_emergency],
        toZigbee: [],
        exposes: [e.battery(), e.action(['emergency', 'disarm', 'arm_partial_zones', 'arm_all_zones'])],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint, {min: repInterval.MINUTES_5, max: repInterval.HOUR});
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
        },
    },
    {
        zigbeeModel: ['COSensor-EM', 'COSensor-N', 'COSensor-EF-3.0'],
        model: 'HS1CA-E',
        vendor: 'HEIMAN',
        description: 'Smart carbon monoxide sensor',
        fromZigbee: [fz.ias_carbon_monoxide_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.carbon_monoxide(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['WarningDevice', 'WarningDevice-EF-3.0', 'SRHMP-I1'],
        model: 'HS2WD-E',
        vendor: 'HEIMAN',
        description: 'Smart siren',
        fromZigbee: [fz.battery, fz.ignore_basic_report],
        toZigbee: [tz.warning],
        meta: {disableDefaultResponse: true, configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.battery(), e.warning()],
    },
    {
        zigbeeModel: ['SOHM-I1'],
        model: 'SOHM-I1',
        vendor: 'HEIMAN',
        description: 'Door contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['SWHM-I1'],
        model: 'SWHM-I1',
        vendor: 'HEIMAN',
        description: 'Water leakage sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['SMHM-I1', 'PIR_TPV12'],
        model: 'SMHM-I1',
        vendor: 'HEIMAN',
        description: 'Smart motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['HT-EM', 'TH-EM', 'TH-T_V14'],
        model: 'HS1HT',
        vendor: 'HEIMAN',
        description: 'Smart temperature & humidity Sensor',
        exposes: [e.battery(), e.temperature(), e.humidity()],
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        meta: {configureKey: 2, battery: {voltageToPercentage: '3V_2500'}},
        whiteLabel: [{vendor: 'Ferguson', model: 'TH-T_V14'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['msTemperatureMeasurement']);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msRelativeHumidity', 'genPowerCfg']);
            await reporting.temperature(endpoint1);
            await reporting.humidity(endpoint2);
            await reporting.batteryVoltage(endpoint2);
            await reporting.batteryPercentageRemaining(endpoint2);
        },
    },
    {
        zigbeeModel: ['HT-N', 'HT-EF-3.0'],
        model: 'HS1HT-N',
        vendor: 'HEIMAN',
        description: 'Smart temperature & humidity Sensor',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint1);
            await reporting.batteryPercentageRemaining(endpoint1, {min: repInterval.MINUTES_5, max: repInterval.HOUR});
            await endpoint1.read('genPowerCfg', ['batteryPercentageRemaining']);

            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msRelativeHumidity']);
            await reporting.humidity(endpoint2);
        },
        exposes: [e.temperature(), e.humidity(), e.battery()],
    },
    {
        zigbeeModel: ['SKHMP30-I1'],
        model: 'SKHMP30-I1',
        description: 'Smart metering plug',
        vendor: 'HEIMAN',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
        toZigbee: [tz.on_off],
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acVoltageMultiplier: 1, acVoltageDivisor: 100,
                acCurrentMultiplier: 1, acCurrentDivisor: 100,
                acPowerMultiplier: 1, acPowerDivisor: 10,
            });
        },
    },
    {
        zigbeeModel: ['E_Socket'],
        model: 'HS2ESK-E',
        vendor: 'HEIMAN',
        description: 'Smart in wall plug',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
    },
    {
        zigbeeModel: ['SGMHM-I1'],
        model: 'SGMHM-I1',
        vendor: 'HEIMAN',
        description: 'Combustible gas sensor',
        fromZigbee: [fz.ias_gas_alarm_1],
        toZigbee: [],
        exposes: [e.gas(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['STHM-I1H'],
        model: 'STHM-I1H',
        vendor: 'HEIMAN',
        description: 'Heiman temperature & humidity sensor',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint, {min: 0, change: 25});
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.humidity(), e.battery()],
    },
    {
        fingerprint: [{modelID: 'SOS-EM', manufacturerName: 'HEIMAN'}],
        model: 'HS1EB/HS1EB-E',
        vendor: 'HEIMAN',
        description: 'Smart emergency button',
        fromZigbee: [fz.command_status_change_notification_action, fz.legacy.st_button_state, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.action(['off', 'single', 'double', 'hold'])],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint, {min: repInterval.MINUTES_5, max: repInterval.HOUR});
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
        },
    },
    {
        fingerprint: [{modelID: 'SceneSwitch-EM-3.0', manufacturerName: 'HEIMAN'}],
        model: 'HS2SS',
        vendor: 'HEIMAN',
        description: 'Smart scene switch',
        fromZigbee: [fz.battery, fz.heiman_scenes],
        exposes: [e.battery(), e.action(['cinema', 'at_home', 'sleep', 'go_out', 'repast'])],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'heimanSpecificScenes']);
            await reporting.batteryPercentageRemaining(endpoint, {min: repInterval.MINUTES_5, max: repInterval.HOUR});
        },
    },
    {
        zigbeeModel: ['GASSensor-EM'],
        model: 'HS1CG-E',
        vendor: 'HEIMAN',
        description: 'Combustible gas sensor',
        fromZigbee: [fz.ias_gas_alarm_1],
        toZigbee: [],
        whiteLabel: [{vendor: 'Piri', model: 'HSIO18008'}],
        exposes: [e.gas(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['GASSensor-EFR-3.0', 'GASSensor-EF-3.0'],
        model: 'HS1CG-E_3.0',
        vendor: 'HEIMAN',
        description: 'Combustible gas sensor',
        fromZigbee: [fz.ias_gas_alarm_2],
        toZigbee: [],
        exposes: [e.gas(), e.battery_low(), e.tamper()],
    },
    {
        fingerprint: [{modelID: 'Vibration-N', manufacturerName: 'HEIMAN'}],
        model: 'HS1VS-N',
        vendor: 'HEIMAN',
        description: 'Vibration sensor',
        fromZigbee: [fz.ias_vibration_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint, {min: repInterval.MINUTES_5, max: repInterval.HOUR});
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
        },
        exposes: [e.vibration(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        fingerprint: [{modelID: 'Vibration-EF_3.0', manufacturerName: 'HEIMAN'}],
        model: 'HS1VS-EF',
        vendor: 'HEIMAN',
        description: 'Vibration sensor',
        fromZigbee: [fz.ias_vibration_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint, {min: repInterval.MINUTES_5, max: repInterval.HOUR});
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
        },
        exposes: [e.vibration(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        fingerprint: [{modelID: 'HS2AQ-EM', manufacturerName: 'HEIMAN'}],
        model: 'HS2AQ-EM',
        vendor: 'HEIMAN',
        description: 'Air quality monitor',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity, fz.heiman_pm25, fz.heiman_hcho, fz.heiman_air_quality],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const heiman = {
                configureReporting: {
                    pm25MeasuredValue: async (endpoint, overrides) => {
                        const payload = reporting.payload('measuredValue', 0, repInterval.HOUR, 1, overrides);
                        await endpoint.configureReporting('heimanSpecificPM25Measurement', payload);
                    },
                    formAldehydeMeasuredValue: async (endpoint, overrides) => {
                        const payload = reporting.payload('measuredValue', 0, repInterval.HOUR, 1, overrides);
                        await endpoint.configureReporting('heimanSpecificFormaldehydeMeasurement', payload);
                    },
                    batteryState: async (endpoint, overrides) => {
                        const payload = reporting.payload('batteryState', 0, repInterval.HOUR, 1, overrides);
                        await endpoint.configureReporting('heimanSpecificAirQuality', payload);
                    },
                    pm10measuredValue: async (endpoint, overrides) => {
                        const payload = reporting.payload('pm10measuredValue', 0, repInterval.HOUR, 1, overrides);
                        await endpoint.configureReporting('heimanSpecificAirQuality', payload);
                    },
                    tvocMeasuredValue: async (endpoint, overrides) => {
                        const payload = reporting.payload('tvocMeasuredValue', 0, repInterval.HOUR, 1, overrides);
                        await endpoint.configureReporting('heimanSpecificAirQuality', payload);
                    },
                    aqiMeasuredValue: async (endpoint, overrides) => {
                        const payload = reporting.payload('aqiMeasuredValue', 0, repInterval.HOUR, 1, overrides);
                        await endpoint.configureReporting('heimanSpecificAirQuality', payload);
                    },
                },
            };

            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg', 'genTime', 'msTemperatureMeasurement', 'msRelativeHumidity', 'heimanSpecificPM25Measurement',
                'heimanSpecificFormaldehydeMeasurement', 'heimanSpecificAirQuality']);

            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);

            await heiman.configureReporting.pm25MeasuredValue(endpoint);
            await heiman.configureReporting.formAldehydeMeasuredValue(endpoint);
            await heiman.configureReporting.batteryState(endpoint);
            await heiman.configureReporting.pm10measuredValue(endpoint);
            await heiman.configureReporting.tvocMeasuredValue(endpoint);
            await heiman.configureReporting.aqiMeasuredValue(endpoint);

            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);

            // Seems that it is bug in HEIMAN, device does not asks for the time with binding
            // So, we need to write time during configure
            const time = Math.round(((new Date()).getTime() - OneJanuary2000) / 1000);
            // Time-master + synchronised
            const values = {timeStatus: 3, time: time, timeZone: ((new Date()).getTimezoneOffset() * -1) * 60};
            endpoint.write('genTime', values);
        },
        exposes: [e.battery(), e.temperature(), e.humidity(), e.pm25(), e.hcho(), e.voc(), e.aqi(), e.pm10(),
            exposes.enum('battery_state', ea.STATE, ['not_charging', 'charging', 'charged'])],
    },
    {
        fingerprint: [{modelID: 'IRControl-EM', manufacturerName: 'HEIMAN'}],
        model: 'HS2IRC',
        vendor: 'HEIMAN',
        description: 'Smart IR Control',
        fromZigbee: [fz.battery, fz.heiman_ir_remote],
        toZigbee: [tz.heiman_ir_remote],
        meta: {configureKey: 1},
        exposes: [e.battery()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'heimanSpecificInfraRedRemote']);
            await reporting.batteryPercentageRemaining(endpoint, {min: repInterval.MINUTES_5, max: repInterval.HOUR});
        },
    },
    {
        zigbeeModel: ['BDHM8E27W70-I1'],
        model: 'BDHM8E27W70-I1',
        vendor: 'GS', // actually it is HEIMAN.
        description: 'Active light, warm to cool white (E27 & B22)',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['HS2SW1L-EF-3.0', 'HS2SW1L-EFR-3.0', 'HS2SW1A-N'],
        fingerprint: [
            {modelID: 'HS2SW1A-EF-3.0', manufacturerName: 'HEIMAN'},
            {modelID: 'HS2SW1A-EFR-3.0', manufacturerName: 'HEIMAN'},
        ],
        model: 'HS2SW1A/HS2SW1A-N',
        vendor: 'HEIMAN',
        description: 'Smart switch - 1 gang with neutral wire',
        fromZigbee: [fz.ignore_basic_report, fz.on_off, fz.device_temperature],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genDeviceTempCfg']);
            await reporting.onOff(endpoint);
            await reporting.deviceTemperature(endpoint);
        },
        exposes: [e.switch(), e.device_temperature()],
    },
    {
        zigbeeModel: ['HS2SW2L-EF-3.0', 'HS2SW2L-EFR-3.0', 'HS2SW2A-N'],
        fingerprint: [
            {modelID: 'HS2SW2A-EF-3.0', manufacturerName: 'HEIMAN'},
            {modelID: 'HS2SW2A-EFR-3.0', manufacturerName: 'HEIMAN'},
        ],
        model: 'HS2SW2A/HS2SW2A-N',
        vendor: 'HEIMAN',
        description: 'Smart switch - 2 gang with neutral wire',
        fromZigbee: [fz.ignore_basic_report, fz.on_off, fz.device_temperature],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {left: 1, right: 2};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff', 'genDeviceTempCfg']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.deviceTemperature(device.getEndpoint(1));
        },
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'), e.device_temperature()],
    },

    {
        zigbeeModel: ['HS2SW3L-EF-3.0', 'HS2SW3L-EFR-3.0', 'HS2SW3A-N'],
        fingerprint: [
            {modelID: 'HS2SW3A-EF-3.0', manufacturerName: 'HEIMAN'},
            {modelID: 'HS2SW3A-EFR-3.0', manufacturerName: 'HEIMAN'},
        ],
        model: 'HS2SW3A/HS2SW3A-N',
        vendor: 'HEIMAN',
        description: 'Smart switch - 3 gang with neutral wire',
        fromZigbee: [fz.ignore_basic_report, fz.on_off, fz.device_temperature],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {left: 1, center: 2, right: 3};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff', 'genDeviceTempCfg']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.deviceTemperature(device.getEndpoint(1));
        },
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('center'), e.switch().withEndpoint('right'),
            e.device_temperature()],
    },
    {
        zigbeeModel: ['CurtainMo-EF-3.0', 'CurtainMo-EF'],
        model: 'HS2CM-N-DC',
        vendor: 'HEIMAN',
        description: 'Gear window shade motor',
        fromZigbee: [fz.cover_position_via_brightness],
        toZigbee: [tz.cover_via_brightness],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genLevelCtrl', 'genPowerCfg']);
            await reporting.brightness(endpoint);
        },
        exposes: [e.cover_position().setAccess('state', ea.ALL)],
    },

    // Oujiabao
    {
        zigbeeModel: ['OJB-CR701-YZ'],
        model: 'CR701-YZ',
        vendor: 'Oujiabao',
        description: 'Gas and carbon monoxide alarm',
        fromZigbee: [fz.ias_carbon_monoxide_alarm_1_gas_alarm_2],
        toZigbee: [],
        exposes: [e.gas(), e.carbon_monoxide(), e.tamper(), e.battery_low()],
    },

    // Calex
    {
        zigbeeModel: ['EC-Z3.0-CCT'],
        model: '421786',
        vendor: 'Calex',
        description: 'LED A60 Zigbee GLS-lamp',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['EC-Z3.0-RGBW'],
        model: '421792',
        vendor: 'Calex',
        description: 'LED A60 Zigbee RGB lamp',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['Smart Wall Switch '], // Yes, it has a space at the end :(
        model: '421782',
        vendor: 'Calex',
        description: 'Smart Wall Switch, wall mounted RGB controller',
        toZigbee: [],
        fromZigbee: [fz.command_off, fz.command_on, fz.command_step, fz.command_move_to_color_temp,
            fz.command_move, fz.command_stop, fz.command_ehanced_move_to_hue_and_saturation,
        ],
        exposes: [e.action([
            'on', 'off', 'color_temperature_move', 'brightness_step_up', 'brightness_step_down',
            'brightness_move_up', 'brightness_move_down', 'brightness_stop',
            'enhanced_move_to_hue_and_saturation',
        ])],
        meta: {configureKey: 1, disableActionGroup: true},
    },

    // EcoSmart
    {
        zigbeeModel: ['Ecosmart-ZBT-A19-CCT-Bulb'],
        model: 'A9A19A60WESDZ02',
        vendor: 'EcoSmart',
        description: 'Tuneable white (A19)',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['Ecosmart-ZBT-BR30-CCT-Bulb'],
        model: 'A9BR3065WESDZ02',
        vendor: 'EcoSmart',
        description: 'Tuneable white (BR30)',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['zhaRGBW'],
        model: 'D1821',
        vendor: 'EcoSmart',
        description: 'A19 RGB bulb',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        // eslint-disable-next-line
        zigbeeModel: ['\u0000\u0002\u0000\u0004\u0000\f^I\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e','\u0000\u0002\u0000\u0004^��&\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e'],
        model: 'D1531',
        vendor: 'EcoSmart',
        description: 'A19 bright white bulb',
        extend: preset.light_onoff_brightness(),
    },
    {
        // eslint-disable-next-line
        zigbeeModel: ['\u0000\u0002\u0000\u0004\u0012 �P\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e'],
        model: 'D1532',
        vendor: 'EcoSmart',
        description: 'A19 soft white bulb',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['zhaTunW'],
        model: 'D1542',
        vendor: 'EcoSmart',
        description: 'GU10 adjustable white bulb',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        // eslint-disable-next-line
        zigbeeModel: ['\u0000\u0002\u0000\u0004\u0000\f]�\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e', '\u0000\u0002\u0000\u0004\"�T\u0004\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e', '\u0000\u0002\u0000\u0004\u0000\f^�\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e','\u0000\u0002\u0000\u0004\u0011�\"�\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e','\u0000\u0002\u0000\u0004� �P\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e','\u0000\u0002\u0000\u0004\u0000\f^\u0014\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e'],
        model: 'D1533',
        vendor: 'EcoSmart',
        description: 'PAR20/A19 bright white bulb',
        extend: preset.light_onoff_brightness(),
    },
    {
        // eslint-disable-next-line
        zigbeeModel: ['\u0000\u0002\u0000\u0004�V\u0000\n\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e', '\u0000\u0002\u0000\u0004��\"�\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e'],
        model: 'D1523',
        vendor: 'EcoSmart',
        description: 'A19 soft white bulb',
        extend: preset.light_onoff_brightness(),
    },

    // Lubeez
    {
        zigbeeModel: ['LUBEEZ-12AB'],
        model: '12AB',
        vendor: 'Lubeez',
        description: 'zigbee 3.0 AC dimmer',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },

    // Airam
    {
        zigbeeModel: ['ZBT-DimmableLight'],
        model: '4713407',
        vendor: 'Airam',
        description: 'LED OP A60 ZB 9W/827 E27',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            const payload = [{attribute: 'currentLevel', minimumReportInterval: 300, maximumReportInterval: repInterval.HOUR,
                reportableChange: 1}];
            await endpoint.configureReporting('genLevelCtrl', payload);
        },
    },
    {
        zigbeeModel: ['ZBT-Remote-EU-DIMV1A2'],
        model: 'AIRAM-CTR.U',
        vendor: 'Airam',
        description: 'CTR.U remote',
        exposes: [e.action(['on', 'off', 'brightness_down_click', 'brightness_up_click', 'brightness_down_hold', 'brightness_up_hold',
            'brightness_down_release', 'brightness_up_release'])],
        fromZigbee: [fz.command_on, fz.legacy.genOnOff_cmdOn, fz.command_off, fz.legacy.genOnOff_cmdOff,
            fz.legacy.CTR_U_brightness_updown_click, fz.ignore_basic_report,
            fz.legacy.CTR_U_brightness_updown_hold, fz.legacy.CTR_U_brightness_updown_release, fz.command_recall, fz.legacy.CTR_U_scene],
        toZigbee: [],
    },
    {
        zigbeeModel: ['ZBT-Remote-EU-DIMV2A2'],
        model: 'CTR.UBX',
        vendor: 'Airam',
        description: 'CTR.U remote BX',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop, fz.command_recall,
            fz.ignore_basic_report],
        exposes: [e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up', 'brightness_move_down',
            'brightness_stop', 'recall_*'])],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'genOnOff', 'genLevelCtrl', 'genScenes']);
        },
    },
    {
        zigbeeModel: ['Dimmable-GU10-4713404'],
        model: '4713406',
        vendor: 'Airam',
        description: 'GU10 spot 4.8W 2700K 385lm',
        extend: preset.light_onoff_brightness(),
    },

    // Paul Neuhaus
    {
        zigbeeModel: ['NLG-remote', 'Neuhaus remote'],
        model: '100.462.31',
        vendor: 'Paul Neuhaus',
        description: 'Q-REMOTE',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_toggle, fz.command_step, fz.command_move_to_color_temp, fz.command_stop,
            fz.command_move_to_color, fz.command_move, fz.command_color_loop_set, fz.command_ehanced_move_to_hue_and_saturation,
            fz.tint_scene, fz.command_recall],
        exposes: [e.action(['on', 'off', 'toggle', 'brightness_step_up', 'brightness_step_down', 'color_temperature_move', 'color_move',
            'brightness_stop', 'brightness_move_up', 'brightness_move_down', 'color_loop_set', 'enhanced_move_to_hue_and_saturation',
            'recall_*', 'scene_*'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['NLG-CCT light'],
        model: 'NLG-CCT light',
        vendor: 'Paul Neuhaus',
        description: 'Various color temperature lights (e.g. 100.424.11)',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['Neuhaus NLG-TW light', 'NLG-TW light'],
        model: 'NLG-TW light',
        vendor: 'Paul Neuhaus',
        description: 'Various tunable white lights (e.g. 8195-55)',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['NLG-RGBW light '], // the space as the end is intentional, as this is what the device sends
        model: 'NLG-RGBW_light',
        vendor: 'Paul Neuhaus',
        description: 'Various RGBW lights (e.g. 100.110.39)',
        extend: preset.light_onoff_brightness_colortemp_color(),
        endpoint: (device) => {
            return {'default': 2};
        },
    },
    {
        zigbeeModel: ['NLG-RGBW light'],
        model: 'NLG-RGBW light',
        vendor: 'Paul Neuhaus',
        description: 'Various RGBW lights (e.g. 100.111.57)',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['NLG-RGB-TW light'],
        model: 'NLG-RGB-TW light',
        vendor: 'Paul Neuhaus',
        description: 'Various RGB + tunable white lights (e.g. 100.470.92)',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['NLG-plug'],
        model: '100.425.90',
        vendor: 'Paul Neuhaus',
        description: 'Q-PLUG adapter plug with night orientation light',
        extend: preset.switch(),
    },
    {
        zigbeeModel: ['JZ-CT-Z01'],
        model: '100.110.51',
        vendor: 'Paul Neuhaus',
        description: 'Q-FLAG LED panel, Smart-Home CCT',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['JZ-RGBW-Z01'],
        model: '100.075.74',
        vendor: 'Paul Neuhaus',
        description: 'Q-VIDAL RGBW ceiling lamp, 6032-55',
        endpoint: (device) => {
            return {'default': 2};
        },
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['JZD60-J4R150'],
        model: '100.001.96',
        vendor: 'Paul Neuhaus',
        description: 'Q-LED Lamp RGBW E27 socket',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['Neuhaus RGB+CCT light'],
        model: '100.491.61',
        vendor: 'Paul Neuhaus',
        description: 'Q-MIA LED RGBW wall lamp, 9185-13',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },

    // iCasa
    {
        zigbeeModel: ['ICZB-IW11D'],
        model: 'ICZB-IW11D',
        vendor: 'iCasa',
        description: 'ZigBee AC dimmer',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ICZB-DC11'],
        model: 'ICZB-DC11',
        vendor: 'iCasa',
        description: 'ZigBee 12-36V DC LED dimmer',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ICZB-IW11SW'],
        model: 'ICZB-IW11SW',
        vendor: 'iCasa',
        description: 'Zigbee 3.0 AC switch',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ICZB-KPD12'],
        model: 'ICZB-KPD12',
        vendor: 'iCasa',
        description: 'Zigbee 3.0 Keypad Pulse 2',
        meta: {battery: {dontDividePercentage: true}},
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.battery(), e.action(['on', 'off', 'brightness_move_up', 'brightenss_move_down', 'brightness_stop'])],
        toZigbee: [],
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG9001K2-DIM'}],
    },
    {
        zigbeeModel: ['ICZB-KPD14S'],
        model: 'ICZB-KPD14S',
        vendor: 'iCasa',
        description: 'Zigbee 3.0 Keypad Pulse 4S',
        meta: {battery: {dontDividePercentage: true}},
        fromZigbee: [fz.command_recall, fz.legacy.scenes_recall_click, fz.command_on, fz.legacy.genOnOff_cmdOn, fz.command_off,
            fz.legacy.genOnOff_cmdOff, fz.battery, fz.legacy.cmd_move_with_onoff, fz.legacy.cmd_stop_with_onoff],
        exposes: [e.battery(), e.action(['recall_*', 'on', 'off', 'brightness_move_up', 'brightenss_move_down', 'brightness_stop'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['ICZB-KPD18S'],
        model: 'ICZB-KPD18S',
        vendor: 'iCasa',
        description: 'Zigbee 3.0 Keypad Pulse 8S',
        meta: {battery: {dontDividePercentage: true}},
        fromZigbee: [fz.command_recall, fz.legacy.scenes_recall_click, fz.command_on, fz.legacy.genOnOff_cmdOn, fz.command_off,
            fz.legacy.genOnOff_cmdOff, fz.battery, fz.legacy.cmd_move_with_onoff, fz.legacy.cmd_stop_with_onoff],
        exposes: [e.battery(), e.action(['on', 'recall_*', 'off', 'brightness_stop', 'brightness_move_up', 'brightness_move_down'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['ICZB-RM11S'],
        model: 'ICZB-RM11S',
        vendor: 'iCasa',
        description: 'Zigbee 3.0 remote control',
        fromZigbee: [fz.command_recall, fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.battery(), e.action(['recall_*', 'on', 'off', 'brightness_stop', 'brightness_move_up', 'brightness_move_down'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['ICZB-FC'],
        model: 'ICZB-B1FC60/B3FC64/B2FC95/B2FC125',
        vendor: 'iCasa',
        description: 'Zigbee 3.0 Filament Lamp 60/64/95/125 mm, 806 lumen, dimmable, clear',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['ICZB-R11D'],
        model: 'ICZB-R11D',
        vendor: 'iCasa',
        description: 'Zigbee AC dimmer',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ICZB-R12D'],
        model: 'ICZB-R12D',
        vendor: 'iCasa',
        description: 'Zigbee AC dimmer',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },

    // Busch-Jaeger
    {
        zigbeeModel: ['PU01'],
        model: '6717-84',
        vendor: 'Busch-Jaeger',
        description: 'Adaptor plug',
        extend: preset.switch(),
    },
    {
        // Busch-Jaeger 6735, 6736, and 6737 have been tested with the 6710 U (Power Adapter) and
        // 6711 U (Relay) back-ends. The dimmer has not been verified to work yet, though it's
        // safe to assume that it can at least been turned on or off with this integration.
        //
        // In order to manually capture scenes as described in the devices manual, the endpoint
        // corresponding to the row needs to be unbound (https://www.zigbee2mqtt.io/information/binding.html)
        // If that operation was successful, the switch will respond to button presses on that
        // by blinking multiple times (vs. just blinking once if it's bound).
        zigbeeModel: ['RM01', 'RB01'],
        model: '6735/6736/6737',
        vendor: 'Busch-Jaeger',
        description: 'Zigbee Light Link power supply/relay/dimmer',
        endpoint: (device) => {
            return {'row_1': 0x0a, 'row_2': 0x0b, 'row_3': 0x0c, 'row_4': 0x0d, 'relay': 0x12};
        },
        exposes: [e.switch(), e.action(['row_1_on', 'row_1_off', 'row_1_up', 'row_1_down', 'row_1_stop',
            'row_2_on', 'row_2_off', 'row_2_up', 'row_2_down', 'row_2_stop',
            'row_3_on', 'row_3_off', 'row_3_up', 'row_3_down', 'row_3_stop',
            'row_4_on', 'row_4_off', 'row_4_up', 'row_4_down', 'row_4_stop'])],
        meta: {configureKey: 3, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            let firstEndpoint = 0x0a;

            const switchEndpoint10 = device.getEndpoint(10);
            if (switchEndpoint10 != null && switchEndpoint10.supportsOutputCluster('genOnOff')) {
                // https://github.com/Koenkk/zigbee2mqtt/issues/3027#issuecomment-606169628
                await reporting.bind(switchEndpoint10, coordinatorEndpoint, ['genOnOff']);
            }

            const switchEndpoint12 = device.getEndpoint(0x12);
            if (switchEndpoint12 != null) {
                firstEndpoint++;
                await reporting.bind(switchEndpoint12, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            }

            // Depending on the actual devices - 6735, 6736, or 6737 - there are 1, 2, or 4 endpoints.
            for (let i = firstEndpoint; i <= 0x0d; i++) {
                const endpoint = device.getEndpoint(i);
                if (endpoint != null) {
                    // The total number of bindings seems to be severely limited with these devices.
                    // In order to be able to toggle groups, we need to remove the scenes cluster
                    const index = endpoint.outputClusters.indexOf(5);
                    if (index > -1) {
                        endpoint.outputClusters.splice(index, 1);
                    }
                    await reporting.bind(endpoint, coordinatorEndpoint, ['genLevelCtrl']);
                }
            }
        },
        fromZigbee: [fz.ignore_basic_report, fz.on_off, fz.brightness, fz.legacy.RM01_on_click, fz.legacy.RM01_off_click,
            fz.legacy.RM01_up_hold, fz.legacy.RM01_down_hold, fz.legacy.RM01_stop],
        toZigbee: [tz.RM01_light_onoff_brightness, tz.RM01_light_brightness_step, tz.RM01_light_brightness_move],
        onEvent: async (type, data, device) => {
            const switchEndpoint = device.getEndpoint(0x12);
            if (switchEndpoint == null) {
                return;
            }

            // This device doesn't support reporting.
            // Therefore we read the on/off state every 5 seconds.
            // This is the same way as the Hue bridge does it.
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            } else if (!globalStore.hasValue(device, 'interval')) {
                const interval = setInterval(async () => {
                    try {
                        await switchEndpoint.read('genOnOff', ['onOff']);
                        await switchEndpoint.read('genLevelCtrl', ['currentLevel']);
                    } catch (error) {
                        // Do nothing
                    }
                }, 5000);
                globalStore.putValue(device, 'interval', interval);
            }
        },
    },

    // Müller Licht
    {
        zigbeeModel: ['tint-ExtendedColor'],
        model: '404036',
        vendor: 'Müller Licht',
        description: 'Tint LED-globeform white+color',
        extend: preset.light_onoff_brightness_colortemp_color({colorTempRange: [153, 556]}),
        toZigbee: preset.light_onoff_brightness_colortemp_color().toZigbee.concat([tz.tint_scene]),
    },
    {
        zigbeeModel: ['ZBT-DIMLight-A4700001'],
        model: '404023',
        vendor: 'Müller Licht',
        description: 'LED bulb E27 470 lumen, dimmable, clear',
        extend: preset.light_onoff_brightness(),
        toZigbee: preset.light_onoff_brightness().toZigbee.concat([tz.tint_scene]),
    },
    {
        zigbeeModel: ['Smart Socket'],
        model: '404017',
        vendor: 'Müller Licht',
        description: 'Smart power strip',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        // Identify through fingerprint as modelID is the same as Airam 4713407
        fingerprint: [{modelID: 'ZBT-DimmableLight', manufacturerName: 'MLI'}],
        model: '404001',
        vendor: 'Müller Licht',
        description: 'LED bulb E27 806 lumen, dimmable',
        extend: preset.light_onoff_brightness(),
        toZigbee: preset.light_onoff_brightness().toZigbee.concat([tz.tint_scene]),
    },
    {
        zigbeeModel: ['ZBT-ExtendedColor'],
        model: '404000/404005/404012',
        vendor: 'Müller Licht',
        description: 'Tint LED bulb GU10/E14/E27 350/470/806 lumen, dimmable, color, opal white',
        extend: preset.light_onoff_brightness_colortemp_color({colorTempRange: [153, 556], supportsHS: true}),
        toZigbee: preset.light_onoff_brightness_colortemp_color({colorTempRange: [153, 556], supportsHS: true}).toZigbee
            .concat([tz.tint_scene]),
        // GU10 bulb does not support enhancedHue,
        // we can identify these based on the presense of haDiagnostic input cluster
        meta: {enhancedHue: (entity) => !entity.getDevice().getEndpoint(1).inputClusters.includes(2821)},
    },
    {
        zigbeeModel: ['ZBT-ColorTemperature'],
        model: '404006/404008/404004',
        vendor: 'Müller Licht',
        description: 'Tint LED bulb GU10/E14/E27 350/470/806 lumen, dimmable, opal white',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        toZigbee: preset.light_onoff_brightness_colortemp().toZigbee.concat([tz.tint_scene]),
    },
    {
        zigbeeModel: ['ZBT-CCTLight-GU100000'],
        model: '404024',
        vendor: 'Müller Licht',
        description: 'Tint retro LED bulb GU10, dimmable',
        extend: preset.light_onoff_brightness_colortemp(),
        toZigbee: preset.light_onoff_brightness_colortemp().toZigbee.concat([tz.tint_scene]),
    },
    {
        zigbeeModel: ['RGBW Lighting'],
        model: '44435',
        vendor: 'Müller Licht',
        description: 'Tint LED Stripe, color, opal white',
        extend: preset.light_onoff_brightness_colortemp_color(),
        toZigbee: preset.light_onoff_brightness_colortemp_color().toZigbee.concat([tz.tint_scene]),
    },
    {
        zigbeeModel: ['RGB-CCT'],
        model: '404028',
        vendor: 'Müller Licht',
        description: 'Tint LED Panel, color, opal white',
        extend: preset.light_onoff_brightness_colortemp_color(),
        toZigbee: preset.light_onoff_brightness_colortemp_color().toZigbee.concat([tz.tint_scene]),
    },
    {
        zigbeeModel: ['ZBT-Remote-ALL-RGBW'],
        model: 'MLI-404011',
        description: 'Tint remote control',
        vendor: 'Müller Licht',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_toggle, fz.legacy.tint404011_brightness_updown_click,
            fz.legacy.tint404011_move_to_color_temp, fz.legacy.tint404011_move_to_color, fz.tint_scene,
            fz.legacy.tint404011_brightness_updown_release, fz.legacy.tint404011_brightness_updown_hold],
        exposes: [e.action(['on', 'off', 'toggle', 'brightness_down_click', 'brightness_up_click', 'color_temp', 'color_wheel',
            'brightness_0_release', 'brightness_1_release', 'brightness_0_hold', 'brightness_1_hold'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['ZBT-DIMController-D0800'],
        model: '404002',
        description: 'Tint dim remote control',
        vendor: 'Müller Licht',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop, fz.command_recall],
        exposes: [e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up', 'brightness_move_down',
            'brightness_stop', 'recall_1'])],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'genOnOff', 'genLevelCtrl', 'genScenes']);
        },
    },
    {
        zigbeeModel: ['tint Smart Switch'],
        model: '404021',
        description: 'Tint smart switch',
        vendor: 'Müller Licht',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['tint-Remote-white'],
        model: '404022',
        description: 'Tint dim remote control',
        vendor: 'Müller Licht',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop, fz.command_move_to_color_temp],
        exposes: [e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up', 'brightness_move_down',
            'brightness_stop', 'color_temperature_move'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['tint-ColorTemperature'],
        model: '404037',
        vendor: 'Müller Licht',
        description: 'Tint retro filament LED-bulb E27, Edison bulb gold, white+ambiance (1800-6500K), dimmable, 5,5W',
        extend: preset.light_onoff_brightness_colortemp(),
        toZigbee: preset.light_onoff_brightness_colortemp().toZigbee.concat([tz.tint_scene]),
    },
    {
        fingerprint: [{
            // Identify through fingerprint as modelID is the same as Sunricher ZG192910-4
            type: 'Router', manufacturerID: 4635, manufacturerName: 'MLI', modelID: 'CCT Lighting',
            powerSource: 'Mains (single phase)', endpoints: [
                {ID: 1, profileID: 49246, deviceID: 544, inputClusters: [0, 3, 4, 5, 6, 8, 768, 2821, 4096], outputClusters: [25]},
                {ID: 242, profileID: 41440, deviceID: 102, inputClusters: [33], outputClusters: [33]},
            ],
        }],
        model: '404031',
        vendor: 'Müller Licht',
        description: 'Tint Armaro',
        extend: preset.light_onoff_brightness_colortemp(),
    },

    // Salus Controls
    {
        zigbeeModel: ['SPE600'],
        model: 'SPE600',
        vendor: 'Salus Controls',
        description: 'Smart plug (EU socket)',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.instantaneousDemand(endpoint, {min: 5, change: 10});
            await reporting.currentSummDelivered(endpoint, {min: 5, change: [0, 10]});
            await endpoint.read('seMetering', ['multiplier', 'divisor']);
        },
        ota: ota.salus,
        exposes: [e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ['SP600'],
        model: 'SP600',
        vendor: 'Salus Controls',
        description: 'Smart plug (UK socket)',
        fromZigbee: [fz.on_off, fz.SP600_power],
        exposes: [e.switch(), e.power(), e.energy()],
        toZigbee: [tz.on_off],
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.instantaneousDemand(endpoint, {min: 5, change: 10});
            await reporting.currentSummDelivered(endpoint, {min: 5, change: [0, 10]});
            await endpoint.read('seMetering', ['multiplier', 'divisor']);
        },
        ota: ota.salus,
    },
    {
        zigbeeModel: ['SR600'],
        model: 'SR600',
        vendor: 'Salus Controls',
        description: 'Relay switch',
        extend: preset.switch(),
        meta: {configureKey: 4},
        ota: ota.salus,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['SW600'],
        model: 'SW600',
        vendor: 'Salus Controls',
        description: 'Door or window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
        ota: ota.salus,
    },
    {
        zigbeeModel: ['WLS600'],
        model: 'WLS600',
        vendor: 'Salus Controls',
        description: 'Water leakage sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
        ota: ota.salus,
    },
    {
        zigbeeModel: ['OS600'],
        model: 'OS600',
        vendor: 'Salus Controls',
        description: 'Door or window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
        ota: ota.salus,
    },
    {
        zigbeeModel: ['RE600'],
        model: 'RE600',
        vendor: 'Salus Controls',
        description: 'Router Zigbee',
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
        ota: ota.salus,
    },

    // AduroSmart
    {
        zigbeeModel: ['ZLL-ExtendedColo', 'ZLL-ExtendedColor', 'AD-RGBW3001'],
        model: '81809/81813',
        vendor: 'AduroSmart',
        description: 'ERIA colors and white shades smart light bulb A19/BR30',
        extend: preset.light_onoff_brightness_colortemp_color(),
        meta: {applyRedFix: true},
        endpoint: (device) => {
            return {'default': 2};
        },
    },
    {
        zigbeeModel: ['Adurolight_NCC'],
        model: '81825',
        vendor: 'AduroSmart',
        description: 'ERIA smart wireless dimming switch',
        fromZigbee: [fz.command_on, fz.command_off, fz.legacy.eria_81825_updown],
        exposes: [e.action(['on', 'off', 'up', 'down'])],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
    },
    {
        zigbeeModel: ['AD-Dimmer'],
        model: '81849',
        vendor: 'AduroSmart',
        description: 'ERIA build-in multi dimmer module 300W',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ['BDP3001'],
        model: '81855',
        vendor: 'AduroSmart',
        description: 'ERIA smart plug (dimmer)',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ['BPU3'],
        model: 'BPU3',
        vendor: 'AduroSmart',
        description: 'ERIA smart plug',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },

    // Danfoss
    {
        zigbeeModel: ['eTRV0100'],
        model: '014G2461',
        vendor: 'Danfoss',
        description: 'Ally thermostat',
        fromZigbee: [fz.battery, fz.legacy.thermostat_att_report, fz.danfoss_thermostat],
        toZigbee: [tz.thermostat_occupied_heating_setpoint, tz.thermostat_local_temperature, tz.danfoss_mounted_mode,
            tz.danfoss_thermostat_orientation, tz.danfoss_algorithm_scale_factor, tz.danfoss_heat_available, tz.danfoss_day_of_week,
            tz.danfoss_trigger_time, tz.danfoss_window_open, tz.danfoss_display_orientation, tz.thermostat_keypad_lockout],
        exposes: [e.battery(), e.keypad_lockout(),
            exposes.binary('mounted_mode', ea.STATE, true, false).withDescription(
                'Mode in which the unit is mounted. This is set to `false` for normal mounting or `true` for vertical mounting'),
            exposes.binary('heat_required', ea.STATE, true, false).withDescription('Wether or not the unit needs warm water'),
            exposes.binary('window_open_internal', ea.STATE, 1, 0)
                .withDescription('0=Quarantine, 1=Windows are closed, 2=Hold - Windows are maybe about to open, ' +
                '3=Open window detected, 4=In window open state from external but detected closed locally'),
            exposes.binary('setpoint_change_source', ea.STATE, 0, 1)
                .withDescription('Values observed are `0` (set locally) or `2` (set via Zigbee)'),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 6, 28, 0.5).withLocalTemperature().withPiHeatingDemand(),
            exposes.binary('window_open_external', ea.ALL, true, false),
            exposes.numeric('day_of_week', ea.ALL).withValueMin(0).withValueMax(7)
                .withDescription('Exercise day of week: 0=Sun...6=Sat, 7=undefined'),
            exposes.numeric('trigger_time', ea.ALL).withValueMin(0).withValueMax(65535)
                .withDescription('Exercise trigger time. Minutes since midnight (65535=undefined)'),
            exposes.binary('heat_available', ea.ALL, true, false),
            exposes.numeric('algorithm_scale_factor', ea.ALL).withValueMin(1).withValueMax(10)
                .withDescription('Scale factor of setpoint filter timeconstant'+
                ' ("aggressiveness" of control algorithm) 1= Quick ...  5=Moderate ... 10=Slow')],
        meta: {configureKey: 4},
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: 0x1246};
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'hvacThermostat']);

            // standard ZCL attributes
            await reporting.batteryPercentageRemaining(endpoint, {min: 60, max: 43200, change: 1});
            await reporting.thermostatTemperature(endpoint, {min: 0, max: repInterval.MINUTES_10, change: 25});
            await reporting.thermostatPIHeatingDemand(endpoint, {min: 0, max: repInterval.MINUTES_10, change: 1});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 0, max: repInterval.MINUTES_10, change: 25});

            // danfoss attributes
            await endpoint.configureReporting('hvacThermostat', [{attribute: {ID: 0x4012, type: 0x10}, minimumReportInterval: 0,
                maximumReportInterval: repInterval.MINUTES_10, reportableChange: 1}], options);
            await endpoint.configureReporting('hvacThermostat', [{attribute: {ID: 0x4000, type: 0x30}, minimumReportInterval: 0,
                maximumReportInterval: repInterval.HOUR, reportableChange: 1}], options);

            // read keypadLockout, we don't need reporting as it cannot be set physically on the device
            await endpoint.read('hvacUserInterfaceCfg', ['keypadLockout']);
            await endpoint.read('hvacThermostat', [0x4003, 0x4010, 0x4011, 0x4020], options);

            // Seems that it is bug in Danfoss, device does not asks for the time with binding
            // So, we need to write time during configure (same as for HEIMAN devices)
            const time = Math.round(((new Date()).getTime() - OneJanuary2000) / 1000);
            // Time-master + synchronised
            const values = {timeStatus: 3, time: time, timeZone: ((new Date()).getTimezoneOffset() * -1) * 60};
            endpoint.write('genTime', values);
        },
    },

    // Eurotronic
    {
        zigbeeModel: ['SPZB0001'],
        model: 'SPZB0001',
        vendor: 'Eurotronic',
        description: 'Spirit Zigbee wireless heater thermostat',
        fromZigbee: [fz.legacy.eurotronic_thermostat, fz.battery],
        toZigbee: [tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration, tz.eurotronic_thermostat_system_mode, tz.eurotronic_host_flags,
            tz.eurotronic_error_status, tz.thermostat_setpoint_raise_lower, tz.thermostat_control_sequence_of_operation,
            tz.thermostat_remote_sensing, tz.thermostat_local_temperature, tz.thermostat_running_state,
            tz.eurotronic_current_heating_setpoint, tz.eurotronic_trv_mode, tz.eurotronic_valve_position],
        exposes: [e.battery(), exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
            .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withLocalTemperatureCalibration()
            .withPiHeatingDemand(),
        exposes.enum('eurotronic_trv_mode', exposes.access.ALL, [1, 2])
            .withDescription('Select between direct control of the valve via the `eurotronic_valve_position` or automatic control of the '+
            'valve based on the `current_heating_setpoint`. For manual control set the value to 1, for automatic control set the value '+
            'to 2 (the default). When switched to manual mode the display shows a value from 0 (valve closed) to 100 (valve fully open) '+
            'and the buttons on the device are disabled.'),
        exposes.numeric('eurotronic_valve_position', exposes.access.ALL).withValueMin(0).withValueMax(255)
            .withDescription('Directly control the radiator valve when `eurotronic_trv_mode` is set to 1. The values range from 0 (valve '+
            'closed) to 255 (valve fully open)')],
        meta: {configureKey: 3},
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: 4151};
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'hvacThermostat']);
            await reporting.thermostatTemperature(endpoint, {min: 0, max: repInterval.MINUTES_10, change: 25});
            await reporting.thermostatPIHeatingDemand(endpoint, {min: 0, max: repInterval.MINUTES_10, change: 1});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 0, max: repInterval.MINUTES_10, change: 25});
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint, {min: 0, max: repInterval.MINUTES_10, change: 25});
            await endpoint.configureReporting('hvacThermostat', [{attribute: {ID: 0x4003, type: 41}, minimumReportInterval: 0,
                maximumReportInterval: repInterval.MINUTES_10, reportableChange: 25}], options);
            await endpoint.configureReporting('hvacThermostat', [{attribute: {ID: 0x4008, type: 34}, minimumReportInterval: 0,
                maximumReportInterval: repInterval.HOUR, reportableChange: 1}], options);
        },
    },

    // Livolo
    {
        zigbeeModel: ['TI0001          '],
        model: 'TI0001',
        description: 'Zigbee switch (1 and 2 gang)',
        vendor: 'Livolo',
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right')],
        fromZigbee: [fz.livolo_switch_state, fz.livolo_switch_state_raw],
        toZigbee: [tz.livolo_switch_on_off],
        endpoint: (device) => {
            return {'left': 6, 'right': 6};
        },
        meta: {configureKey: 1},
        configure: livolo.poll,
        onEvent: async (type, data, device) => {
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            }
            if (['start', 'deviceAnnounce'].includes(type)) {
                await livolo.poll(device);
                if (!globalStore.hasValue(device, 'interval')) {
                    const interval = setInterval(async () => await livolo.poll(device), 300*1000);
                    globalStore.putValue(device, 'interval', interval);
                }
            }
        },
    },
    {
        zigbeeModel: ['TI0001-switch'],
        model: 'TI0001-switch',
        description: 'Zigbee switch 1 gang',
        vendor: 'Livolo',
        fromZigbee: [fz.livolo_new_switch_state],
        toZigbee: [tz.livolo_socket_switch_on_off],
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: livolo.poll,
        onEvent: async (type, data, device) => {
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            }
            if (['start', 'deviceAnnounce'].includes(type)) {
                await livolo.poll(device);
                if (!globalStore.hasValue(device, 'interval')) {
                    const interval = setInterval(async () => {
                        await livolo.poll(device);
                    }, 300*1000); // Every 300 seconds
                    globalStore.putValue(device, 'interval', interval);
                }
            }
        },
    },
    {
        zigbeeModel: ['TI0001-switch-2gang'],
        model: 'TI0001-switch-2gang',
        description: 'Zigbee Switch 2 gang',
        vendor: 'Livolo',
        fromZigbee: [fz.livolo_new_switch_state_2gang],
        toZigbee: [tz.livolo_socket_switch_on_off],
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right')],
        meta: {configureKey: 1},
        configure: livolo.poll,
        onEvent: async (type, data, device) => {
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            }
            if (['start', 'deviceAnnounce'].includes(type)) {
                await livolo.poll(device);
                if (!globalStore.hasValue(device, 'interval')) {
                    const interval = setInterval(async () => {
                        await livolo.poll(device);
                    }, 300*1000); // Every 300 seconds
                    globalStore.putValue(device, 'interval', interval);
                }
            }
        },
    },
    {
        zigbeeModel: ['TI0001-socket'],
        model: 'TI0001-socket',
        description: 'Zigbee socket',
        vendor: 'Livolo',
        extend: preset.switch(),
        fromZigbee: [fz.livolo_socket_state],
        toZigbee: [tz.livolo_socket_switch_on_off],
        meta: {configureKey: 1},
        configure: livolo.poll,
        onEvent: async (type, data, device) => {
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            }
            if (['start', 'deviceAnnounce'].includes(type)) {
                await livolo.poll(device);
                if (!globalStore.hasValue(device, 'interval')) {
                    const interval = setInterval(async () => {
                        await livolo.poll(device);
                    }, 300*1000); // Every 300 seconds
                    globalStore.putValue(device, 'interval', interval);
                }
            }
        },
    },
    {
        zigbeeModel: ['TI0001-dimmer'],
        model: 'TI0001-dimmer',
        description: 'Zigbee dimmer',
        vendor: 'Livolo',
        fromZigbee: [fz.livolo_dimmer_state],
        toZigbee: [tz.livolo_socket_switch_on_off, tz.livolo_dimmer_level],
        exposes: [e.light_brightness()],
        meta: {configureKey: 1},
        configure: livolo.poll,
        onEvent: async (type, data, device) => {
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            }
            if (!globalStore.hasValue(device, 'interval')) {
                await livolo.poll(device);
                const interval = setInterval(async () => {
                    await livolo.poll(device);
                }, 300*1000); // Every 300 seconds
                globalStore.putValue(device, 'interval', interval);
            }
        },
    },
    {
        zigbeeModel: ['TI0001-cover'],
        model: 'TI0001-cover',
        description: 'Zigbee roller blind motor',
        vendor: 'Livolo',
        fromZigbee: [fz.livolo_cover_state, fz.command_off],
        toZigbee: [tz.livolo_cover_state, tz.livolo_cover_position, tz.livolo_cover_options],
        exposes: [
            e.cover_position().setAccess('position', ea.STATE_SET),
            exposes.composite('options', 'options')
                .withDescription('Motor options')
                .withFeature(exposes.numeric('motor_speed', ea.STATE_SET)
                    .withValueMin(20)
                    .withValueMax(40)
                    .withDescription('Motor speed')
                    .withUnit('rpm'))
                .withFeature(exposes.enum('motor_direction', ea.STATE_SET, ['FORWARD', 'REVERSE'])
                    .withDescription('Motor direction')),
            exposes.binary('moving', ea.STATE)
                .withDescription('Motor is moving'),
        ],
        meta: {configureKey: 1},
        configure: livolo.poll,
        onEvent: async (type, data, device) => {
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            }
            if (!globalStore.hasValue(device, 'interval')) {
                await livolo.poll(device);
                const interval = setInterval(async () => {
                    await livolo.poll(device);
                }, 300*1000); // Every 300 seconds
                globalStore.putValue(device, 'interval', interval);
            }
            // This is needed while pairing in order to let the device know that the interview went right and prevent
            // it from disconnecting from the Zigbee network.
            if (data.cluster === 'genPowerCfg' && data.type === 'raw') {
                const dp = data.data[10];
                if (data.data[0] === 0x7a && data.data[1] === 0xd1) {
                    const endpoint = device.getEndpoint(6);
                    if (dp === 0x02) {
                        const options = {manufacturerCode: 0x1ad2, disableDefaultResponse: true, disableResponse: true,
                            reservedBits: 3, direction: 1, writeUndiv: true};
                        const payload = {0x0802: {value: [data.data[3], 0, 0, 0, 0, 0, 0], type: data.data[2]}};
                        await endpoint.readResponse('genPowerCfg', 0xe9, payload, options);
                    }
                }
            }
        },
    },

    // Bosch
    {
        zigbeeModel: ['RFDL-ZB', 'RFDL-ZB-EU', 'RFDL-ZB-H', 'RFDL-ZB-K', 'RFDL-ZB-CHI', 'RFDL-ZB-MS', 'RFDL-ZB-ES', 'RFPR-ZB',
            'RFPR-ZB-EU', 'RFPR-ZB-CHI', 'RFPR-ZB-ES', 'RFPR-ZB-MS'],
        model: 'RADON TriTech ZB',
        vendor: 'Bosch',
        description: 'Wireless motion detector',
        fromZigbee: [fz.temperature, fz.battery, fz.ias_occupancy_alarm_1],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.battery(), e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['ISW-ZPR1-WP13'],
        model: 'ISW-ZPR1-WP13',
        vendor: 'Bosch',
        description: 'Motion sensor',
        fromZigbee: [fz.temperature, fz.battery, fz.ias_occupancy_alarm_1, fz.ignore_iaszone_report],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(5);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.battery(), e.occupancy(), e.battery_low(), e.tamper()],
    },

    // Immax
    {
        zigbeeModel: ['ZBT-CCTfilament-D0000'],
        model: '07089L',
        vendor: 'Immax',
        description: 'NEO SMART LED E27 5W',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['E27-filament-Dim-ZB3.0'],
        model: '07088L',
        vendor: 'Immax',
        description: 'Neo SMART LED filament E27 6.3W warm white, dimmable, Zigbee 3.0',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['IM-Z3.0-DIM'],
        model: '07005B',
        vendor: 'Immax',
        description: 'Neo SMART LED E14 5W warm white, dimmable, Zigbee 3.0',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['IM-Z3.0-RGBW'],
        model: '07004D/07005L',
        vendor: 'Immax',
        description: 'Neo SMART LED E27/E14 color, dimmable, Zigbee 3.0',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['IM-Z3.0-RGBCCT'],
        model: '07008L',
        vendor: 'Immax',
        description: 'Neo SMART LED strip RGB + CCT, color, dimmable, Zigbee 3.0',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['Keyfob-ZB3.0'],
        model: '07046L',
        vendor: 'Immax',
        description: '4-Touch single click buttons',
        fromZigbee: [fz.legacy.immax_07046L_arm, fz.command_panic],
        exposes: [e.action(['disarm', 'arm_stay', 'arm_away', 'panic'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['DoorWindow-Sensor-ZB3.0'],
        model: '07045L',
        vendor: 'Immax',
        description: 'Magnetic contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['Plug-230V-ZB3.0'],
        model: '07048L',
        vendor: 'Immax',
        description: 'NEO SMART plug',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        meta: {configureKey: 9},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
        },
        exposes: [e.switch(), e.power()],
    },
    {
        zigbeeModel: ['losfena'],
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_wlosfena'}],
        model: '07703L',
        vendor: 'Immax',
        description: 'Radiator valve',
        fromZigbee: [fz.legacy.tuya_thermostat_weekly_schedule, fz.etop_thermostat, fz.ignore_basic_report, fz.ignore_tuya_set_time],
        toZigbee: [tz.etop_thermostat_system_mode, tz.etop_thermostat_away_mode, tz.tuya_thermostat_child_lock,
            tz.tuya_thermostat_current_heating_setpoint, tz.tuya_thermostat_weekly_schedule],
        onEvent: tuya.onEventSetTime,
        meta: {
            timeout: 20000, // TRV wakes up every 10sec
            thermostat: {
                weeklyScheduleMaxTransitions: 4,
                weeklyScheduleSupportedModes: [1], // bits: 0-heat present, 1-cool present (dec: 1-heat,2-cool,3-heat+cool)
                weeklyScheduleFirstDayDpId: tuya.dataPoints.schedule,
            },
        },
        exposes: [e.battery_low(), e.child_lock(), exposes.climate()
            .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
            .withLocalTemperature(ea.STATE).withSystemMode(['off', 'heat', 'auto'], ea.STATE_SET)
            .withRunningState(['idle', 'heat'], ea.STATE).withAwayMode()],
    },
    {
        zigbeeModel: ['Bulb-RGB+CCT-ZB3.0'],
        model: '07115L',
        vendor: 'Immax',
        description: 'Neo SMART LED E27 9W RGB + CCT, dimmable, Zigbee 3.0',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['4in1-Sensor-ZB3.0'],
        model: '07047L',
        vendor: 'Immax',
        description: 'Intelligent motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.temperature, fz.illuminance, fz.humidity, fz.ignore_iaszone_report],
        toZigbee: [],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['msTemperatureMeasurement', 'msRelativeHumidity', 'msIlluminanceMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
            await reporting.illuminance(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery(), e.temperature(), e.illuminance(), e.illuminance_lux(),
            e.humidity()],
    },
    {
        zigbeeModel: ['ColorTemperature'],
        fingerprint: [{modelID: '07073L', manufacturerName: 'Seastar Intelligence'}],
        model: '07073L',
        vendor: 'Immax',
        description: 'Neo CANTO/HIPODROMO SMART, color temp, dimmable, Zigbee 3.0',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['IM-Z3.0-CCT'],
        model: '07042L',
        vendor: 'Immax',
        description: 'Neo RECUADRO SMART, color temp, dimmable, Zigbee 3.0',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },

    // Yale
    {
        zigbeeModel: ['YRD446 BLE TSDB'],
        model: 'YRD426NRSC',
        vendor: 'Yale',
        description: 'Assure lock',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.lock],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery()],
    },
    {
        zigbeeModel: ['YRD226 TSDB', 'YRD226L TSDB'],
        model: 'YRD226HA2619',
        vendor: 'Yale',
        description: 'Assure lock',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.lock],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery()],
    },
    {
        zigbeeModel: ['YRD256 TSDB', 'YRD256L TSDB'],
        model: 'YRD256HA20BP',
        vendor: 'Yale',
        description: 'Assure lock SL',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.lock],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery()],
    },
    {
        zigbeeModel: ['iZBModule01', '0700000001'],
        model: 'YMF40/YDM4109+',
        vendor: 'Yale',
        description: 'Real living lock / Intelligent biometric digital lock',
        fromZigbee: [fz.lock_operation_event, fz.battery, fz.lock],
        toZigbee: [tz.lock],
        // Increased timeout needed: https://github.com/Koenkk/zigbee2mqtt/issues/3290 for YDM4109+
        meta: {configureKey: 2, timeout: 20000},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery()],
    },
    {
        zigbeeModel: ['YRD210 PB DB'],
        model: 'YRD210-HA-605',
        vendor: 'Yale',
        description: 'Real living keyless push button deadbolt lock',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.lock],
        meta: {configureKey: 1, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery()],
    },
    {
        zigbeeModel: ['YRL220 TS LL'],
        // The zigbee module card indicate that the module will work on YRD 221 and YRD 221RL also
        model: 'YRL-220L',
        vendor: 'Yale',
        description: 'Real living keyless leveler lock',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.lock],
        meta: {configureKey: 1, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery()],
    },
    {
        zigbeeModel: ['YRD226/246 TSDB'],
        model: 'YRD226/246 TSDB',
        vendor: 'Yale',
        description: 'Assure lock',
        fromZigbee: [fz.lock, fz.battery, fz.lock_operation_event, fz.lock_programming_event, fz.lock_pin_code_response],
        toZigbee: [tz.lock, tz.pincode_lock],
        meta: {configureKey: 2, pinCodeCount: 250},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery()],
    },
    {
        zigbeeModel: ['YRD220/240 TSDB'],
        model: 'YRD220/YRD221',
        vendor: 'Yale',
        description: 'Lockwood keyless push button deadbolt lock',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.lock],
        meta: {configureKey: 1, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery()],
    },
    {
        zigbeeModel: ['YRD246 TSDB'],
        model: 'YRD246HA20BP',
        vendor: 'Yale',
        description: 'Assure lock key free deadbolt with Zigbee',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.lock],
        meta: {configureKey: 1, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery()],
    },
    {
        zigbeeModel: ['YRD216 PBDB'],
        model: 'YRD216-HA2-619',
        vendor: 'Yale',
        description: 'Real living keyless push button deadbolt lock',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.lock],
        meta: {configureKey: 3, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery()],
    },
    {
        zigbeeModel: ['YRL226L TS'],
        model: 'YRL226L TS',
        vendor: 'Yale',
        description: 'Assure lock SL',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.lock],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery()],
    },

    // JAVIS
    {
        zigbeeModel: ['JAVISLOCK'],
        fingerprint: [{modelID: 'doorlock_5001', manufacturerName: 'Lmiot'}],
        model: 'JS-SLK2-ZB',
        vendor: 'JAVIS',
        description: 'Intelligent biometric digital lock',
        fromZigbee: [fz.javis_lock_report, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.action(['unlock'])],
    },

    // Weiser
    {
        zigbeeModel: ['SMARTCODE_DEADBOLT_10'],
        model: '9GED18000-009',
        vendor: 'Weiser',
        description: 'SmartCode 10',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery, fz.lock_programming_event, fz.lock_pin_code_response],
        toZigbee: [tz.lock, tz.pincode_lock],
        meta: {configureKey: 4, pinCodeCount: 30},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        // Note - Keypad triggered deletions do not cause a zigbee event, though Adds work fine.
        onEvent: async (type, data, device) => {
            // When we receive a code updated message, lets read the new value
            if (data.type === 'commandProgrammingEventNotification' &&
                data.cluster === 'closuresDoorLock' &&
                data.data &&
                data.data.userid !== undefined &&
                // Don't read RF events, we can do this with retrieve_state
                (data.data.programeventsrc === undefined || constants.lockSourceName[data.data.programeventsrc] != 'rf')
            ) {
                await device.endpoints[0].command('closuresDoorLock', 'getPinCode', {userid: data.data.userid}, {});
            }
        },
        exposes: [e.lock(), e.battery()],
    },
    {
        zigbeeModel: ['SMARTCODE_DEADBOLT_10T'],
        model: '9GED21500-005',
        vendor: 'Weiser',
        description: 'SmartCode 10 Touch',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.lock],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery()],
    },

    // Keen Home
    {
        zigbeeModel: ['SV01-410-MP-1.0', 'SV01-410-MP-1.1', 'SV01-410-MP-1.4', 'SV01-410-MP-1.5', 'SV01-412-MP-1.0',
            'SV01-412-MP-1.4', 'SV01-610-MP-1.0', 'SV01-612-MP-1.0'],
        model: 'SV01',
        vendor: 'Keen Home',
        description: 'Smart vent',
        fromZigbee: [fz.cover_position_via_brightness, fz.temperature, fz.battery, fz.keen_home_smart_vent_pressure,
            fz.ignore_onoff_report],
        toZigbee: [tz.cover_via_brightness],
        meta: {configureKey: 1, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genLevelCtrl', 'genPowerCfg', 'msTemperatureMeasurement', 'msPressureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint);
            await reporting.pressure(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.cover_position().setAccess('state', ea.ALL), e.temperature(), e.battery(), e.pressure()],
    },
    {
        zigbeeModel: ['SV02-410-MP-1.3', 'SV02-610-MP-1.3', 'SV02-410-MP-1.0'],
        model: 'SV02',
        vendor: 'Keen Home',
        description: 'Smart vent',
        fromZigbee: [fz.cover_position_via_brightness, fz.temperature, fz.battery, fz.keen_home_smart_vent_pressure,
            fz.ignore_onoff_report],
        toZigbee: [tz.cover_via_brightness],
        meta: {configureKey: 1, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genLevelCtrl', 'genPowerCfg', 'msTemperatureMeasurement', 'msPressureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint);
            await reporting.pressure(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.cover_position().setAccess('state', ea.ALL), e.temperature(), e.battery(), e.pressure()],
    },

    // AXIS
    {
        zigbeeModel: ['Gear'],
        model: 'GR-ZB01-W',
        vendor: 'AXIS',
        description: 'Gear window shade motor',
        fromZigbee: [fz.cover_position_via_brightness, fz.battery],
        toZigbee: [tz.cover_via_brightness],
        meta: {configureKey: 1, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genLevelCtrl', 'genPowerCfg']);
            await reporting.brightness(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.cover_position().setAccess('state', ea.ALL), e.battery()],
    },

    // ELKO
    {
        zigbeeModel: ['ElkoDimmerZHA'],
        model: '316GLEDRF',
        vendor: 'ELKO',
        description: 'ZigBee in-wall smart dimmer',
        extend: preset.light_onoff_brightness(),
        meta: {disableDefaultResponse: true, configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },

    // LivingWise
    {
        zigbeeModel: ['abb71ca5fe1846f185cfbda554046cce'],
        model: 'LVS-ZB500D',
        vendor: 'LivingWise',
        description: 'ZigBee smart dimmer switch',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['545df2981b704114945f6df1c780515a'],
        model: 'LVS-ZB15S',
        vendor: 'LivingWise',
        description: 'ZigBee smart in-wall switch',
        extend: preset.switch(),
    },
    {
        zigbeeModel: ['e70f96b3773a4c9283c6862dbafb6a99'],
        model: 'LVS-SM10ZW',
        vendor: 'LivingWise',
        description: 'Door or window contact switch',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['895a2d80097f4ae2b2d40500d5e03dcc', '700ae5aab3414ec09c1872efe7b8755a'],
        model: 'LVS-SN10ZW_SN11',
        vendor: 'LivingWise',
        description: 'Occupancy sensor',
        fromZigbee: [fz.battery, fz.ias_occupancy_alarm_1_with_timeout],
        toZigbee: [],
        exposes: [e.battery(), e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['55e0fa5cdb144ba3a91aefb87c068cff'],
        model: 'LVS-ZB15R',
        vendor: 'LivingWise',
        description: 'Zigbee smart outlet',
        extend: preset.switch(),
    },
    {
        zigbeeModel: ['75d430d66c164c26ac8601c05932dc94'],
        model: 'LVS-SC7',
        vendor: 'LivingWise',
        description: 'Scene controller ',
        fromZigbee: [fz.orvibo_raw_2],
        exposes: [e.action([
            'button_1_click', 'button_1_hold', 'button_1_release', 'button_2_click', 'button_2_hold', 'button_2_release',
            'button_3_click', 'button_3_hold', 'button_3_release', 'button_4_click', 'button_4_hold', 'button_4_release',
            'button_5_click', 'button_5_hold', 'button_5_release', 'button_6_click', 'button_6_hold', 'button_6_release',
            'button_7_click', 'button_7_hold', 'button_7_release'])],
        toZigbee: [],
    },

    // FrankEver
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_wt9agwf3'}],
        model: 'FK_V02',
        vendor: 'FrankEver',
        description: 'Zigbee smart water valve',
        fromZigbee: [fz.frankever_valve],
        toZigbee: [tz.tuya_switch_state, tz.frankever_threshold, tz.frankever_timer],
        exposes: [e.switch().setAccess('state', ea.STATE_SET),
            exposes.numeric('threshold', exposes.access.STATE_SET).withValueMin(0).withValueMax(100).withUnit('%')
                .withDescription('Valve open percentage (multiple of 10)'),
            exposes.numeric('timer', exposes.access.STATE_SET).withValueMin(0).withValueMax(600).withUnit('minutes')
                .withDescription('Countdown timer in minutes')],
    },

    // Vimar
    {
        zigbeeModel: ['2_Way_Switch_v1.0', 'On_Off_Switch_v1.0'],
        model: '14592.0',
        vendor: 'Vimar',
        description: '2-way switch IoT connected mechanism',
        extend: preset.switch(),
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(10);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['Window_Cov_v1.0'],
        model: '14594',
        vendor: 'Vimar',
        description: 'Roller shutter with slat orientation and change-over relay',
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position()],
    },

    // Stelpro
    {
        zigbeeModel: ['ST218'],
        model: 'ST218',
        vendor: 'Stelpro',
        description: 'Ki convector, line-voltage thermostat',
        fromZigbee: [fz.legacy.stelpro_thermostat, fz.legacy.hvac_user_interface],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.stelpro_thermostat_outdoor_temperature],
        exposes: [e.local_temperature(), e.keypad_lockout(),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat'])],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(25);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro Ki
            await reporting.thermostatTemperature(endpoint, {min: 10, max: 60, change: 50});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 1, max: 0, change: 50});
            await reporting.thermostatSystemMode(endpoint, {min: 1, max: 0});
            await reporting.thermostatPIHeatingDemand(endpoint, {min: 1, max: 900, change: 5});
            await reporting.thermostatKeypadLockMode(endpoint, {min: 1, max: 0});
            // cluster 0x0201 attribute 0x401c
            await endpoint.configureReporting('hvacThermostat', [{attribute: 'StelproSystemMode', minimumReportInterval: 1,
                maximumReportInterval: 0}]);
        },
    },
    {
        zigbeeModel: ['STZB402+', 'STZB402'],
        model: 'STZB402',
        vendor: 'Stelpro',
        description: 'Ki, line-voltage thermostat',
        fromZigbee: [fz.legacy.stelpro_thermostat, fz.legacy.hvac_user_interface, fz.humidity],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode,
            tz.thermostat_running_state, tz.stelpro_thermostat_outdoor_temperature],
        exposes: [e.local_temperature(), e.keypad_lockout(),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat'])],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(25);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro Ki
            await reporting.thermostatTemperature(endpoint, {min: 10, max: 60, change: 50});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 1, max: 0, change: 50});
            await reporting.thermostatSystemMode(endpoint, {min: 1, max: 0});
            await reporting.thermostatPIHeatingDemand(endpoint, {min: 1, max: 900, change: 5});
            await reporting.thermostatKeypadLockMode(endpoint, {min: 1, max: 0});
            // cluster 0x0201 attribute 0x401c
            await endpoint.configureReporting('hvacThermostat', [{attribute: 'StelproSystemMode',
                minimumReportInterval: 1, maximumReportInterval: 0}]);
        },
    },
    {
        zigbeeModel: ['MaestroStat'],
        model: 'SMT402',
        vendor: 'Stelpro',
        description: 'Maestro, line-voltage thermostat',
        fromZigbee: [fz.legacy.stelpro_thermostat, fz.legacy.hvac_user_interface, fz.humidity],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.stelpro_thermostat_outdoor_temperature],
        exposes: [e.local_temperature(), e.keypad_lockout(),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat'])],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(25);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msRelativeHumidity',
                'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro Maestro
            await reporting.thermostatTemperature(endpoint, {min: 10, max: 60, change: 50});
            await reporting.humidity(endpoint, {min: 10, max: 300, change: 1});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 1, max: 0, change: 50});
            await reporting.thermostatSystemMode(endpoint, {min: 1, max: 0});
            await reporting.thermostatPIHeatingDemand(endpoint, {min: 1, max: 900, change: 5});
            await reporting.thermostatKeypadLockMode(endpoint, {min: 1, max: 0});
            // cluster 0x0201 attribute 0x401c
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'StelproSystemMode', minimumReportInterval: 1, maximumReportInterval: 0}]);
        },
    },
    {
        zigbeeModel: ['SMT402AD'],
        model: 'SMT402AD',
        vendor: 'Stelpro',
        description: 'Maestro, line-voltage thermostat',
        fromZigbee: [fz.legacy.stelpro_thermostat, fz.legacy.hvac_user_interface, fz.humidity],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.stelpro_thermostat_outdoor_temperature],
        exposes: [e.local_temperature(), e.keypad_lockout(),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat'])],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(25);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msRelativeHumidity',
                'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro Maestro
            await reporting.thermostatTemperature(endpoint, {min: 10, max: 60, change: 50});
            await reporting.humidity(endpoint, {min: 10, max: 300, change: 1});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 1, max: 0, change: 50});
            await reporting.thermostatSystemMode(endpoint, {min: 1, max: 0});
            await reporting.thermostatPIHeatingDemand(endpoint, {min: 1, max: 900, change: 5});
            await reporting.thermostatKeypadLockMode(endpoint, {min: 1, max: 0});
            // cluster 0x0201 attribute 0x401c
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'StelproSystemMode', minimumReportInterval: 1, maximumReportInterval: 0}]);
        },
    },

    // Nyce
    {
        zigbeeModel: ['3011'],
        model: 'NCZ-3011-HA',
        vendor: 'Nyce',
        description: 'Door/window sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['3043'],
        model: 'NCZ-3043-HA',
        vendor: 'Nyce',
        description: 'Ceiling motion sensor',
        fromZigbee: [fz.occupancy, fz.humidity, fz.temperature, fz.ignore_basic_report, fz.ignore_genIdentify, fz.ignore_poll_ctrl,
            fz.battery, fz.ignore_iaszone_report, fz.ias_occupancy_alarm_2],
        toZigbee: [],
        meta: {battery: {dontDividePercentage: true}},
        exposes: [e.occupancy(), e.humidity(), e.temperature(), e.battery(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['3041'],
        model: 'NCZ-3041-HA',
        vendor: 'Nyce',
        description: 'Wall motion sensor',
        fromZigbee: [fz.occupancy, fz.humidity, fz.temperature, fz.ignore_basic_report, fz.ignore_genIdentify, fz.ignore_poll_ctrl,
            fz.battery, fz.ignore_iaszone_report, fz.ias_occupancy_alarm_2],
        toZigbee: [],
        meta: {battery: {dontDividePercentage: true}},
        exposes: [e.occupancy(), e.humidity(), e.temperature(), e.battery(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['3045'],
        model: 'NCZ-3045-HA',
        vendor: 'Nyce',
        description: 'Curtain motion sensor',
        fromZigbee: [fz.occupancy, fz.humidity, fz.temperature, fz.ignore_basic_report, fz.ignore_genIdentify, fz.ignore_poll_ctrl,
            fz.battery, fz.ignore_iaszone_report, fz.ias_occupancy_alarm_2],
        toZigbee: [],
        meta: {battery: {dontDividePercentage: true}},
        exposes: [e.occupancy(), e.humidity(), e.temperature(), e.battery(), e.battery_low(), e.tamper()],
    },

    // Securifi
    {
        zigbeeModel: ['PP-WHT-US'],
        model: 'PP-WHT-US',
        vendor: 'Securifi',
        description: 'Peanut Smart Plug',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        ota: ota.securifi,
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acVoltageMultiplier: 180, acVoltageDivisor: 39321, acCurrentMultiplier: 72,
                acCurrentDivisor: 39321, acPowerMultiplier: 10255, acPowerDivisor: 39321});
            await reporting.onOff(endpoint);
            await reporting.rmsVoltage(endpoint, {change: 110}); // Voltage reports in 0.00458V
            await reporting.rmsCurrent(endpoint, {change: 55}); // Current reports in 0.00183A
            await reporting.activePower(endpoint, {change: 2}); // Power reports in 0.261W
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
    },
    {
        zigbeeModel: ['ZB2-BU01'],
        model: 'B01M7Y8BP9',
        vendor: 'Securifi',
        description: 'Almond Click multi-function button',
        fromZigbee: [fz.almond_click],
        exposes: [e.action(['single', 'double', 'long'])],
        toZigbee: [],
    },

    // Visonic
    {
        zigbeeModel: ['MP-841'],
        model: 'MP-841',
        vendor: 'Visonic',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['MCT-370 SMA'],
        model: 'MCT-370 SMA',
        vendor: 'Visonic',
        description: 'Magnetic door & window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['MCT-350 SMA'],
        model: 'MCT-350 SMA',
        vendor: 'Visonic',
        description: 'Magnetic door & window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['MCT-340 E'],
        model: 'MCT-340 E',
        vendor: 'Visonic',
        description: 'Magnetic door & window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery, fz.ignore_zclversion_read],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['MCT-340 SMA'],
        model: 'MCT-340 SMA',
        vendor: 'Visonic',
        description: 'Magnetic door & window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery, fz.ignore_zclversion_read],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },

    // Sunricher
    {
        zigbeeModel: ['ZGRC-KEY-007'],
        model: 'SR-ZG9001K2-DIM2',
        vendor: 'Sunricher',
        description: 'Zigbee 2 button wall switch',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.battery(), e.action([
            'on_1', 'off_1', 'stop_1', 'brightness_move_up_1', 'brightness_move_down_1', 'brightness_stop_1',
            'on_2', 'off_2', 'stop_2', 'brightness_move_up_2', 'brightness_move_down_2', 'brightness_stop_2'])],
        toZigbee: [],
        meta: {multiEndpoint: true},
    },
    {
        zigbeeModel: ['ZGRC-TEUR-005'],
        model: 'SR-ZG9001T4-DIM-EU',
        vendor: 'Sunricher',
        description: 'Zigbee wireless touch dimmer switch',
        fromZigbee: [fz.command_recall, fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop],
        exposes: [e.action(['recall_*', 'on', 'off', 'brightness_stop', 'brightness_move_down', 'brightness_move_up',
            'brightness_step_down', 'brightness_step_up'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['CCT Lighting'],
        model: 'ZG192910-4',
        vendor: 'Sunricher',
        description: 'Zigbee LED-controller',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['ZG9101SAC-HP'],
        model: 'ZG9101SAC-HP',
        vendor: 'Sunricher',
        description: 'ZigBee AC phase-cut dimmer',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ON/OFF', 'ZIGBEE-SWITCH'],
        model: 'ZG9101SAC-HP-Switch',
        vendor: 'Sunricher',
        description: 'Zigbee AC in wall switch',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['Micro Smart Dimmer', 'SM311', 'HK-SL-RDIM-A'],
        model: 'ZG2835RAC',
        vendor: 'Sunricher',
        description: 'ZigBee knob smart dimmer',
        fromZigbee: preset.light_onoff_brightness().fromZigbee.concat([fz.electrical_measurement, fz.metering, fz.ignore_genOta]),
        toZigbee: preset.light_onoff_brightness().toZigbee,
        meta: {configureKey: 2},
        exposes: [e.light_brightness(), e.power(), e.voltage(), e.current(), e.energy()],
        whiteLabel: [{vendor: 'YPHIX', model: '50208695'}, {vendor: 'Samotech', model: 'SM311'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genOnOff', 'genLevelCtrl', 'haElectricalMeasurement', 'seMetering'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint, {min: 10, change: 10});
            await reporting.rmsVoltage(endpoint, {min: 10});
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
    },
    {
        zigbeeModel: ['ZG2835'],
        model: 'ZG2835',
        vendor: 'Sunricher',
        description: 'ZigBee knob smart dimmer',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move_to_level],
        exposes: [e.action(['on', 'off', 'brightness_move_to_level'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['HK-SL-DIM-A'],
        model: 'SR-ZG9040A',
        vendor: 'Sunricher',
        description: 'Zigbee micro smart dimmer',
        fromZigbee: preset.light_onoff_brightness().fromZigbee.concat([fz.electrical_measurement, fz.metering, fz.ignore_genOta]),
        toZigbee: preset.light_onoff_brightness().toZigbee,
        meta: {configureKey: 2},
        exposes: [e.light_brightness(), e.power(), e.voltage(), e.current(), e.energy()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genOnOff', 'genLevelCtrl', 'haElectricalMeasurement', 'seMetering'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint, {min: 10, change: 10});
            await reporting.rmsVoltage(endpoint, {min: 10});
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
    },
    {
        zigbeeModel: ['HK-ZD-DIM-A'],
        model: 'SRP-ZG9105-CC',
        vendor: 'Sunricher',
        description: 'Constant Current Zigbee LED dimmable driver',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['SR-ZG9040A-S'],
        model: 'SR-ZG9040A-S',
        vendor: 'Sunricher',
        description: 'ZigBee AC phase-cut dimmer single-line',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['Micro Smart OnOff'],
        model: 'SR-ZG9100A-S',
        vendor: 'Sunricher',
        description: 'Zigbee AC in wall switch single-line',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ZG2819S-CCT'],
        model: 'ZG2819S-CCT',
        vendor: 'Sunricher',
        description: 'Zigbee handheld remote CCT 4 channels',
        fromZigbee: [fz.battery, fz.command_move_to_color, fz.command_move_to_color_temp, fz.command_move_hue,
            fz.command_step, fz.command_recall, fz.command_on, fz.command_off, fz.command_toggle, fz.command_stop,
            fz.command_move, fz.command_color_loop_set, fz.command_ehanced_move_to_hue_and_saturation],
        exposes: [e.battery(), e.action([
            'color_move', 'color_temperature_move', 'hue_move', 'brightness_step_up', 'brightness_step_down',
            'recall_*', 'on', 'off', 'toggle', 'brightness_stop', 'brightness_move_up', 'brightness_move_down',
            'color_loop_set', 'enhanced_move_to_hue_and_saturation'])],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {ep1: 1, ep2: 2, ep3: 3, ep4: 4};
        },
    },
    {
        zigbeeModel: ['ZG2858A'],
        model: 'ZG2858A',
        vendor: 'Sunricher',
        description: 'Zigbee handheld remote RGBCCT 3 channels',
        fromZigbee: [fz.battery, fz.command_move_to_color, fz.command_move_to_color_temp, fz.command_move_hue,
            fz.command_step, fz.command_recall, fz.command_on, fz.command_off, fz.command_toggle, fz.command_stop,
            fz.command_move, fz.command_color_loop_set, fz.command_ehanced_move_to_hue_and_saturation],
        exposes: [e.battery(), e.action([
            'color_move', 'color_temperature_move', 'hue_move', 'brightness_step_up', 'brightness_step_down',
            'recall_*', 'on', 'off', 'toggle', 'brightness_stop', 'brightness_move_up', 'brightness_move_down',
            'color_loop_set', 'enhanced_move_to_hue_and_saturation'])],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {ep1: 1, ep2: 2, ep3: 3};
        },
    },

    // Samotech
    {
        zigbeeModel: ['SM308'],
        model: 'SM308',
        vendor: 'Samotech',
        description: 'Zigbee AC in wall switch',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'genIdentify', 'genOnOff']);
        },
    },
    {
        zigbeeModel: ['SM309'],
        model: 'SM309',
        vendor: 'Samotech',
        description: 'ZigBee dimmer 400W',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },

    // Shenzhen Homa
    {
        zigbeeModel: ['HOMA1008', '00A'],
        model: 'HLD812-Z-SC',
        vendor: 'Shenzhen Homa',
        description: 'Smart LED driver',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['HOMA1009'],
        model: 'HLD503-Z-CT',
        vendor: 'Shenzhen Homa',
        description: 'Smart LED driver',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['HOMA1002', 'HOMA0019', 'HOMA0006', 'HOMA000F', '019'],
        model: 'HLC610-Z',
        vendor: 'Shenzhen Homa',
        description: 'Wireless dimmable controller',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['HOMA1031'],
        model: 'HLC821-Z-SC',
        vendor: 'Shenzhen Homa',
        description: 'ZigBee AC phase-cut dimmer',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['HOMA1005'],
        model: 'HLC614-ZLL',
        vendor: 'Shenzhen Homa',
        description: '3 channel relay module',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3')],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3};
        },
    },
    {
        zigbeeModel: ['HOMA1064', '012'],
        model: 'HLC833-Z-SC',
        vendor: 'Shenzhen Homa',
        description: 'Wireless dimmable controller',
        extend: preset.light_onoff_brightness(),
    },

    // Honyar
    {
        zigbeeModel: ['00500c35'],
        model: 'U86K31ND6',
        vendor: 'Honyar',
        description: '3 gang switch ',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'), e.switch().withEndpoint('center')],
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint2);
            await reporting.bind(endpoint3, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint3);
        },
    },

    // Danalock
    {
        zigbeeModel: ['V3-BTZB'],
        model: 'V3-BTZB',
        vendor: 'Danalock',
        description: 'BT/ZB smartlock',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.lock],
        meta: {configureKey: 5},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery()],
    },

    // NET2GRID
    {
        zigbeeModel: ['SP31           ', 'SP31'],
        model: 'N2G-SP',
        vendor: 'NET2GRID',
        description: 'White Net2Grid power outlet switch with power meter',
        fromZigbee: [fz.command_on, fz.legacy.genOnOff_cmdOn, fz.command_off, fz.legacy.genOnOff_cmdOff, fz.on_off, fz.metering],
        exposes: [e.switch(), e.power(), e.energy()],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);

            const endpoint10 = device.getEndpoint(10);
            await reporting.bind(endpoint10, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint10);
            await reporting.instantaneousDemand(endpoint10);
            await reporting.currentSummDelivered(endpoint10);
            await reporting.currentSummReceived(endpoint10);
        },
    },

    // Third Reality
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
        extend: preset.switch(),
        meta: {disableDefaultResponse: true, configureKey: 3},
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
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['3RSL012Z'],
        model: '3RSL012Z',
        vendor: 'Third Reality',
        description: 'Smart light BR30',
        extend: preset.light_onoff_brightness_colortemp(),
    },

    // Hampton Bay
    {
        zigbeeModel: ['HDC52EastwindFan', 'HBUniversalCFRemote'],
        model: '99432',
        vendor: 'Hampton Bay',
        description: 'Universal wink enabled white ceiling fan premier remote control',
        fromZigbee: preset.light_onoff_brightness().fromZigbee.concat([fz.fan]),
        toZigbee: preset.light_onoff_brightness().toZigbee.concat([tz.fan_mode]),
        exposes: [e.light_brightness(), e.fan()],
        meta: {disableDefaultResponse: true, configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'hvacFanCtrl']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
            await reporting.fanMode(endpoint);
        },
    },
    {
        zigbeeModel: ['ETI 12-in Puff light'],
        model: '54668161',
        vendor: 'Hampton Bay',
        description: '12 in. LED smart puff',
        extend: preset.light_onoff_brightness_colortemp(),
    },

    // Iluminize
    {
        zigbeeModel: ['DIM Lighting'],
        model: '511.10',
        vendor: 'Iluminize',
        description: 'Zigbee LED-Controller ',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['511.201'],
        model: '511.201',
        vendor: 'Iluminize',
        description: 'ZigBee 3.0 Dimm-Aktor mini 1x 230V',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['5120.1100'],
        model: '5120.1100',
        vendor: 'Iluminize',
        description: 'ZigBee 3.0 Dimm-Aktor mini 1x 230V',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['511.010'],
        model: '511.010',
        vendor: 'Iluminize',
        description: 'Zigbee LED-Controller',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['511.012'],
        model: '511.012',
        vendor: 'Iluminize',
        description: 'Zigbee LED-Controller',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['511.202'],
        model: '511.202',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 switch mini 1x230V, 200W/400W',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['5120.1200'],
        model: '5120.1200',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 switch mini 1x230V with neutral, 200W/400W',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['5120.1210'],
        model: '5120.1210',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 switch mini 1x230V without neutral, 200W/400W',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ZG2801K2-G1-RGB-CCT-LEAD'],
        model: '511.557',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 wall dimmer',
        fromZigbee: [fz.command_off, fz.command_on, fz.command_move_to_color_temp, fz.command_move_to_color],
        toZigbee: [],
        exposes: [e.action(['off', 'on', 'color_temperature_move', 'color_move'])],
    },
    {
        zigbeeModel: ['RGBW-CCT', '511.040'],
        model: '511.040',
        vendor: 'Iluminize',
        description: 'ZigBee 3.0 LED-controller, 4 channel 5A, RGBW LED',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['HK-ZD-RGBCCT-A', '511.000'],
        model: '511.000',
        vendor: 'Iluminize',
        whiteLabel: [{vendor: 'Sunricher', model: 'HK-ZD-RGBCCT-A'}],
        description: 'Zigbee 3.0 universal LED-controller, 5 channel, RGBCCT LED',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['ZG2819S-RGBW'],
        model: '511.344',
        vendor: 'Iluminize',
        description: 'Zigbee handheld remote RGBW 4 channels',
        fromZigbee: [fz.battery, fz.command_move_to_color, fz.command_move_to_color_temp, fz.command_move_hue,
            fz.command_step, fz.command_recall, fz.ZG2819S_command_on, fz.ZG2819S_command_off],
        exposes: [e.battery(), e.action([
            'color_move', 'color_temperature_move', 'hue_move', 'brightness_step_up', 'brightness_step_down', 'recall_*', 'on', 'off'])],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {ep1: 1, ep2: 2, ep3: 3, ep4: 4};
        },
    },

    // Anchor
    {
        zigbeeModel: ['FB56-SKT17AC1.4'],
        model: '67200BL',
        description: 'Vetaar smart plug',
        vendor: 'Anchor',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(3) || device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },

    // Insta
    {
        zigbeeModel: [' Remote'],
        model: 'InstaRemote',
        vendor: 'Insta',
        description: 'ZigBee Light Link wall/handheld transmitter',
        whiteLabel: [{vendor: 'Gira', model: '2430-100'}, {vendor: 'Gira', model: '2435-10'}, {vendor: 'Jung', model: 'ZLLCD5004M'},
            {vendor: 'Jung', model: 'ZLLLS5004M'}, {vendor: 'Jung', model: 'ZLLA5004M'}, {vendor: 'Jung', model: 'ZLLHS4'}],
        fromZigbee: [fz.legacy.insta_scene_click, fz.command_on, fz.command_off_with_effect, fz.legacy.insta_down_hold,
            fz.legacy.insta_up_hold, fz.legacy.insta_stop],
        exposes: [e.action(['select_*', 'on', 'off', 'down', 'up', 'stop'])],
        toZigbee: [],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['Generic UP Device'],
        model: '57008000',
        vendor: 'Insta',
        description: 'Blinds actor with lift/tilt calibration & with with inputs for wall switches',
        fromZigbee: [fz.cover_position_tilt, fz.command_cover_open, fz.command_cover_close, fz.command_cover_stop],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position_tilt()],
        endpoint: (device) => {
            return {'default': 6};
        },
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(6), coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.bind(device.getEndpoint(7), coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(device.getEndpoint(6));
            await reporting.currentPositionTiltPercentage(device.getEndpoint(6));

            // Has Unknown power source, force it here.
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },

    // RGB Genie
    {
        zigbeeModel: ['RGBgenie ZB-5121'],
        model: 'ZB-5121',
        vendor: 'RGB Genie',
        description: 'Micro remote and dimmer with single scene recall',
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop, fz.command_recall],
        exposes: [e.battery(), e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up',
            'brightness_move_down', 'brightness_stop', 'recall_*'])],
        toZigbee: [],
        meta: {configureKey: 1, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['RGBgenie ZB-3009'],
        model: 'ZB-3009',
        vendor: 'RGB Genie',
        description: '3 scene remote and dimmer ',
        fromZigbee: [fz.command_recall, fz.command_move_hue, fz.command_move, fz.command_stop, fz.command_on, fz.command_off,
            fz.command_move_to_color_temp, fz.command_move_to_color, fz.command_move_color_temperature],
        toZigbee: [],
        exposes: [e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up',
            'brightness_move_down', 'brightness_stop', 'recall_*', 'hue_move', 'color_temperature_move', 'color_move',
            'color_temperature_move_up', 'color_temperature_move_down'])],
    },
    {
        zigbeeModel: ['ZGRC-KEY-013'],
        model: 'ZGRC-KEY-013',
        vendor: 'RGB Genie',
        description: '3 Zone remote and dimmer',
        fromZigbee: [fz.battery, fz.command_move, fz.legacy.ZGRC013_brightness_onoff,
            fz.legacy.ZGRC013_brightness, fz.command_stop, fz.legacy.ZGRC013_brightness_stop, fz.command_on,
            fz.legacy.ZGRC013_cmdOn, fz.command_off, fz.legacy.ZGRC013_cmdOff, fz.command_recall],
        exposes: [e.battery(), e.action(['brightness_move_up', 'brightness_move_down', 'brightness_stop', 'on', 'off', 'recall_*'])],
        toZigbee: [],
        meta: {configureKey: 1, multiEndpoint: true, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['RGBgenie ZB-5028'],
        model: 'ZB-5028',
        vendor: 'RGB Genie',
        description: 'RGB remote with 4 endpoints and 3 scene recalls',
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop, fz.command_recall,
            fz.command_move_hue, fz.command_move_to_color, fz.command_move_to_color_temp],
        exposes: [e.battery(), e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up',
            'brightness_move_down', 'brightness_stop', 'recall_1', 'recall_2', 'recall_3'])],
        toZigbee: [],
        meta: {configureKey: 1, multiEndpoint: true, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['RGBgenie ZB-5004'],
        model: 'ZB-5004',
        vendor: 'RGB Genie',
        description: 'Zigbee 3.0 remote control',
        fromZigbee: [fz.command_recall, fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.battery(), e.action(['recall_*', 'on', 'off', 'brightness_stop', 'brightness_move_up', 'brightness_move_down'])],
        toZigbee: [],
    },

    // Sercomm
    {
        zigbeeModel: ['SZ-ESW01'],
        model: 'SZ-ESW01',
        vendor: 'Sercomm',
        description: 'Telstra smart plug',
        fromZigbee: [fz.on_off, fz.metering],
        exposes: [e.switch(), e.power()],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.instantaneousDemand(endpoint);
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 1000000, multiplier: 1});
        },
    },
    {
        zigbeeModel: ['SZ-ESW01-AU'],
        model: 'SZ-ESW01-AU',
        vendor: 'Sercomm',
        description: 'Telstra smart plug',
        exposes: [e.switch(), e.power()],
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.instantaneousDemand(endpoint);
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 1000000, multiplier: 1});
        },
    },
    {
        zigbeeModel: ['XHS2-SE'],
        model: 'XHS2-SE',
        vendor: 'Sercomm',
        description: 'Magnetic door & window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['SZ-DWS04', 'SZ-DWS04N_SF'],
        model: 'SZ-DWS04',
        vendor: 'Sercomm',
        description: 'Magnetic door & window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['SZ-DWS08N'],
        model: 'SZ-DWS08',
        vendor: 'Sercomm',
        description: 'Magnetic door & window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['SZ-PIR02_SF', 'SZ-PIR02'],
        model: 'AL-PIR02',
        vendor: 'Sercomm',
        description: 'PIR motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },

    // Universal Electronics Inc
    {
        zigbeeModel: ['URC4460BC0-X-R'],
        model: 'XHS2-UE',
        vendor: 'Universal Electronics Inc',
        description: 'Magnetic door & window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },

    // Leedarson
    {
        zigbeeModel: ['LED_GU10_OWDT'],
        model: 'ZM350STW1TCF',
        vendor: 'Leedarson',
        description: 'LED PAR16 50 GU10 tunable white',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['M350ST-W1R-01', 'A470S-A7R-04'],
        model: 'M350STW1',
        vendor: 'Leedarson',
        description: 'LED PAR16 50 GU10',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LED_E27_ORD'],
        model: 'A806S-Q1G',
        vendor: 'Leedarson',
        description: 'LED E27 color',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['ZHA-DimmableLight'],
        model: 'A806S-Q1R',
        vendor: 'Leedarson',
        description: 'LED E27 tunable white',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['LED_E27_OWDT'],
        model: 'ZA806SQ1TCF',
        vendor: 'Leedarson',
        description: 'LED E27 tunable white',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['ZBT-CCTSwitch-D0001'],
        model: '6ARCZABZH',
        vendor: 'Leedarson',
        description: '4-Key Remote Controller',
        fromZigbee: [fz.command_on, fz.command_off, fz.legacy.CCTSwitch_D0001_on_off, fz.CCTSwitch_D0001_levelctrl,
            fz.CCTSwitch_D0001_lighting, fz.battery],
        exposes: [e.battery(), e.action(['colortemp_up_release', 'colortemp_down_release', 'on', 'off', 'brightness_up', 'brightness_down',
            'colortemp_up', 'colortemp_down', 'colortemp_up_hold', 'colortemp_down_hold'])],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['TWGU10Bulb02UK'],
        model: '6xy-M350ST-W1Z',
        vendor: 'Leedarson',
        description: 'PAR16 tunable white',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['ZHA-PIRSensor'],
        model: '5AA-SS-ZA-H0',
        vendor: 'Leedarson',
        description: 'Motion sensor',
        fromZigbee: [fz.occupancy, fz.illuminance, fz.ignore_occupancy_report],
        toZigbee: [],
        exposes: [e.occupancy(), e.illuminance(), e.illuminance_lux()],
    },

    // GMY
    {
        zigbeeModel: ['CCT box'],
        model: 'B07KG5KF5R',
        vendor: 'GMY Smart Bulb',
        description: 'GMY Smart bulb, 470lm, vintage dimmable, 2700-6500k, E27',
        extend: preset.light_onoff_brightness_colortemp(),
    },

    // Meazon
    {
        zigbeeModel: ['101.301.001649', '101.301.001838', '101.301.001802', '101.301.001738', '101.301.001412', '101.301.001765',
            '101.301.001814'],
        model: 'MEAZON_BIZY_PLUG',
        vendor: 'Meazon',
        description: 'Bizy plug meter',
        fromZigbee: [fz.command_on, fz.legacy.genOnOff_cmdOn, fz.command_off, fz.legacy.genOnOff_cmdOff, fz.on_off, fz.meazon_meter],
        exposes: [e.switch(), e.power(), e.voltage(), e.current()],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(10);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint, {min: 1, max: 0xfffe});
            const options = {manufacturerCode: 4406, disableDefaultResponse: false};
            await endpoint.write('seMetering', {0x1005: {value: 0x063e, type: 25}}, options);
            await endpoint.configureReporting('seMetering', [{reportableChange: 1,
                attribute: {ID: 0x2000, type: 0x29}, minimumReportInterval: 1, maximumReportInterval: repInterval.MINUTES_5}], options);
        },
    },
    {
        zigbeeModel: ['102.106.000235', '102.106.001111', '102.106.000348', '102.106.000256', '102.106.001242', '102.106.000540'],
        model: 'MEAZON_DINRAIL',
        vendor: 'Meazon',
        description: 'DinRail 1-phase meter',
        fromZigbee: [fz.command_on, fz.legacy.genOnOff_cmdOn, fz.command_off, fz.legacy.genOnOff_cmdOff, fz.on_off, fz.meazon_meter],
        exposes: [e.switch(), e.power(), e.voltage(), e.current()],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(10);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            const options = {manufacturerCode: 4406, disableDefaultResponse: false};
            await endpoint.write('seMetering', {0x1005: {value: 0x063e, type: 25}}, options);
            await reporting.onOff(endpoint);
            await endpoint.configureReporting('seMetering', [{attribute: {ID: 0x2000, type: 0x29},
                minimumReportInterval: 1, maximumReportInterval: repInterval.MINUTES_5, reportableChange: 1}], options);
        },
    },

    // Konke
    {
        zigbeeModel: ['3AFE170100510001', '3AFE280100510001'],
        model: '2AJZ4KPKEY',
        vendor: 'Konke',
        description: 'Multi-function button',
        fromZigbee: [fz.konke_action, fz.battery, fz.legacy.konke_click],
        exposes: [e.battery(), e.action(['single', 'double', 'hold'])],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['3AFE14010402000D', '3AFE27010402000D', '3AFE28010402000D'],
        model: '2AJZ4KPBS',
        vendor: 'Konke',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['3AFE140103020000', '3AFE220103020000'],
        model: '2AJZ4KPFT',
        vendor: 'Konke',
        description: 'Temperature and humidity sensor',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'msTemperatureMeasurement']);
            await reporting.batteryVoltage(endpoint);
            await reporting.temperature(endpoint);
        },
        exposes: [e.temperature(), e.humidity(), e.battery()],
    },
    {
        zigbeeModel: ['3AFE010104020028'],
        model: 'TW-S1',
        description: 'Photoelectric smoke detector',
        vendor: 'Konke',
        fromZigbee: [fz.ias_smoke_alarm_1],
        toZigbee: [],
        exposes: [e.smoke(), e.battery_low()],
    },
    {
        zigbeeModel: ['3AFE130104020015', '3AFE270104020015', '3AFE280104020015'],
        model: '2AJZ4KPDR',
        vendor: 'Konke',
        description: 'Contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['LH07321'],
        model: 'LH07321',
        vendor: 'Konke',
        description: 'Water detector',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
    },

    // Zemismart
    {
        zigbeeModel: ['NUET56-DL27LX1.1'],
        model: 'LXZB-12A',
        vendor: 'Zemismart',
        description: 'RGB LED downlight',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LXT56-LS27LX1.6'],
        model: 'HGZB-DLC4-N15B',
        vendor: 'Zemismart',
        description: 'RGB LED downlight',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['TS0302'],
        model: 'ZM-CSW032-D',
        vendor: 'Zemismart',
        description: 'Curtain/roller blind switch',
        fromZigbee: [fz.ignore_basic_report, fz.ZMCSW032D_cover_position],
        toZigbee: [tz.cover_state, tz.ZMCSW032D_cover_position],
        exposes: [e.cover_position()],
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering']);
            // Configure reporing of currentPositionLiftPercentage always fails.
            // https://github.com/Koenkk/zigbee2mqtt/issues/3216
        },
    },
    {
        zigbeeModel: ['TS0003'],
        model: 'ZM-L03E-Z',
        vendor: 'Zemismart',
        description: 'Smart light switch - 3 gang with neutral wire',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('center'), e.switch().withEndpoint('right')],
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        meta: {configureKey: 1, multiEndpoint: true, disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
    },

    // Sinope
    {
        zigbeeModel: ['TH1123ZB'],
        model: 'TH1123ZB',
        vendor: 'Sinope',
        description: 'Zigbee line volt thermostat',
        fromZigbee: [fz.legacy.sinope_thermostat_att_report, fz.legacy.hvac_user_interface, fz.electrical_measurement, fz.metering,
            fz.ignore_temperature_report, fz.legacy.sinope_thermostat_state],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.sinope_thermostat_occupancy, tz.sinope_thermostat_backlight_autodim_param, tz.sinope_thermostat_time,
            tz.sinope_thermostat_enable_outdoor_temperature, tz.sinope_thermostat_outdoor_temperature, tz.sinope_time_format],
        exposes: [e.local_temperature(), e.keypad_lockout(), e.power(), e.current(), e.voltage(), e.energy(),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']),
            exposes.enum('backlight_auto_dim', ea.SET, ['on demand', 'sensing']).withDescription('Control backlight dimming behavior')],
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msTemperatureMeasurement',
                'haElectricalMeasurement', 'seMetering', 'manuSpecificSinope'];

            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint, {min: 10, max: 300, change: 20});
            await reporting.thermostatPIHeatingDemand(endpoint, {min: 10, max: 301, change: 5});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 1, max: 302, change: 50});
            await reporting.thermostatSystemMode(endpoint, {min: 1, max: 0});

            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 10, max: 303, change: [1, 1]});
            try {
                await reporting.instantaneousDemand(endpoint, {min: 10, max: 304, change: 1});
            } catch (error) {/* Do nothing*/}

            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            try {
                await reporting.activePower(endpoint, {min: 10, max: 305, change: 1});
            } catch (error) {/* Do nothing*/}
            try {
                await reporting.rmsCurrent(endpoint, {min: 10, max: 306, change: 100}); // divider 1000: 0.1Arms
            } catch (error) {/* Do nothing*/}
            try {
                await reporting.rmsVoltage(endpoint, {min: 10, max: 307, change: 5}); // divider 10: 0.5Vrms
            } catch (error) {/* Do nothing*/}

            // Disable default reporting
            await reporting.temperature(endpoint, {min: 1, max: 0xFFFF});
            await endpoint.configureReporting('msTemperatureMeasurement', [{
                attribute: 'tolerance', minimumReportInterval: 1, maximumReportInterval: 0xFFFF, reportableChange: 1}]);
        },
    },
    {
        zigbeeModel: ['TH1124ZB'],
        model: 'TH1124ZB',
        vendor: 'Sinope',
        description: 'Zigbee line volt thermostat',
        fromZigbee: [fz.legacy.thermostat_att_report, fz.legacy.hvac_user_interface, fz.electrical_measurement, fz.metering,
            fz.ignore_temperature_report, fz.legacy.sinope_thermostat_state],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.sinope_thermostat_occupancy, tz.sinope_thermostat_backlight_autodim_param, tz.sinope_thermostat_time,
            tz.sinope_thermostat_enable_outdoor_temperature, tz.sinope_thermostat_outdoor_temperature, tz.sinope_time_format],
        exposes: [e.local_temperature(), e.keypad_lockout(), e.power(), e.current(), e.voltage(), e.energy(),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withPiHeatingDemand(),
            exposes.enum('backlight_auto_dim', ea.SET, ['on demand', 'sensing']).withDescription('Control backlight dimming behavior')],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msTemperatureMeasurement',
                'haElectricalMeasurement', 'seMetering', 'manuSpecificSinope'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint, {min: 10, max: 300, change: 20});
            await reporting.thermostatPIHeatingDemand(endpoint, {min: 10, max: 301, change: 5});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 1, max: 302, change: 50});

            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 10, max: 303, change: [1, 1]});
            try {
                await reporting.instantaneousDemand(endpoint, {min: 10, max: 304, change: 1});
            } catch (error) {/* Do nothing*/}

            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            try {
                await reporting.activePower(endpoint, {min: 10, max: 305, change: 1});
            } catch (error) {/* Do nothing*/}
            try {
                await reporting.rmsCurrent(endpoint, {min: 10, max: 306, change: 100}); // divider 1000: 0.1Arms
            } catch (error) {/* Do nothing*/}
            try {
                await reporting.rmsVoltage(endpoint, {min: 10, max: 307, change: 5}); // divider 10: 0.5Vrms
            } catch (error) {/* Do nothing*/}

            try {
                await reporting.thermostatKeypadLockMode(endpoint, {min: 1, max: 0});
            } catch (error) {
                // Not all support this: https://github.com/Koenkk/zigbee2mqtt/issues/3760
            }

            // Disable default reporting
            await reporting.temperature(endpoint, {min: 1, max: 0xFFFF});
            await endpoint.configureReporting('msTemperatureMeasurement', [{
                attribute: 'tolerance', minimumReportInterval: 1, maximumReportInterval: 0xFFFF, reportableChange: 1}]);
        },
    },
    {
        zigbeeModel: ['TH1300ZB'],
        model: 'TH1300ZB',
        vendor: 'Sinope',
        description: 'Zigbee smart floor heating thermostat',
        fromZigbee: [fz.legacy.thermostat_att_report, fz.legacy.hvac_user_interface, fz.ignore_temperature_report,
            fz.legacy.sinope_thermostat_state, fz.sinope_TH1300ZB_specific],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.sinope_thermostat_occupancy, tz.sinope_thermostat_backlight_autodim_param, tz.sinope_thermostat_time,
            tz.sinope_thermostat_enable_outdoor_temperature, tz.sinope_thermostat_outdoor_temperature, tz.sinope_floor_control_mode,
            tz.sinope_ambiant_max_heat_setpoint, tz.sinope_floor_min_heat_setpoint, tz.sinope_floor_max_heat_setpoint,
            tz.sinope_temperature_sensor, tz.sinope_time_format],
        exposes: [e.local_temperature(), e.keypad_lockout(),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withPiHeatingDemand(),
            exposes.enum('backlight_auto_dim', ea.SET, ['on demand', 'sensing']).withDescription('Control backlight dimming behavior')],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg',
                'msTemperatureMeasurement', 'manuSpecificSinope'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint, {min: 10, max: 300, change: 20});
            await reporting.thermostatPIHeatingDemand(endpoint, {min: 10, max: 301, change: 5});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 1, max: 302, change: 50});

            try {
                await reporting.thermostatKeypadLockMode(endpoint, {min: 1, max: 0});
            } catch (error) {
                // Not all support this: https://github.com/Koenkk/zigbee2mqtt/issues/3760
            }

            await endpoint.configureReporting('manuSpecificSinope', [{attribute: 'GFCiStatus', minimumReportInterval: 1,
                maximumReportInterval: repInterval.HOUR, reportableChange: 1}]);
            await endpoint.configureReporting('manuSpecificSinope', [{attribute: 'floorLimitStatus',
                minimumReportInterval: 1, maximumReportInterval: repInterval.HOUR, reportableChange: 1}]);
            await reporting.temperature(endpoint, {min: 1, max: 0xFFFF}); // disable reporting
        },
    },
    {
        zigbeeModel: ['TH1400ZB'],
        model: 'TH1400ZB',
        vendor: 'Sinope',
        description: 'Zigbee low volt thermostat',
        fromZigbee: [fz.legacy.sinope_thermostat_att_report],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.sinope_thermostat_backlight_autodim_param, tz.sinope_thermostat_time, tz.sinope_thermostat_enable_outdoor_temperature,
            tz.sinope_thermostat_outdoor_temperature],
        exposes: [exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 1).withLocalTemperature()
            .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']), exposes.enum('backlight_auto_dim',
            ea.SET, ['on demand', 'sensing']).withDescription('Control backlight dimming behavior')],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
        },
    },
    {
        zigbeeModel: ['TH1500ZB'],
        model: 'TH1500ZB',
        vendor: 'Sinope',
        description: 'Zigbee dual pole line volt thermostat',
        fromZigbee: [fz.legacy.thermostat_att_report],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.sinope_thermostat_occupancy, tz.sinope_thermostat_backlight_autodim_param, tz.sinope_thermostat_time,
            tz.sinope_thermostat_enable_outdoor_temperature, tz.sinope_thermostat_outdoor_temperature],
        exposes: [exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 1).withLocalTemperature()
            .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withPiHeatingDemand(), exposes.enum(
            'backlight_auto_dim', ea.SET, ['on demand', 'sensing']).withDescription('Control backlight dimming behavior')],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
        },
    },
    {
        zigbeeModel: ['SW2500ZB'],
        model: 'SW2500ZB',
        vendor: 'Sinope',
        description: 'Zigbee smart light switch',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['SP2600ZB'],
        model: 'SP2600ZB',
        vendor: 'Sinope',
        description: 'Zigbee smart plug',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['DM2500ZB'],
        model: 'DM2500ZB',
        vendor: 'Sinope',
        description: 'Zigbee smart dimmer',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ['RM3250ZB'],
        model: 'RM3250ZB',
        vendor: 'Sinope',
        description: '50A Smart electrical load controller',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy()],
    },
    {
        zigbeeModel: ['WL4200'],
        model: 'WL4200',
        vendor: 'Sinope',
        description: 'Zigbee smart water leak detector',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
    },

    // Lutron
    {
        zigbeeModel: ['LZL4BWHL01 Remote'],
        model: 'LZL4BWHL01',
        vendor: 'Lutron',
        description: 'Connected bulb remote control',
        fromZigbee: [fz.legacy.insta_down_hold, fz.legacy.insta_up_hold, fz.legacy.LZL4B_onoff, fz.legacy.insta_stop],
        toZigbee: [],
        exposes: [e.action(['down', 'up', 'stop'])],
    },
    {
        zigbeeModel: ['Z3-1BRL'],
        model: 'Z3-1BRL',
        vendor: 'Lutron',
        description: 'Aurora smart bulb dimmer',
        fromZigbee: [fz.legacy.dimmer_passthru_brightness],
        toZigbee: [],
        exposes: [e.action(['brightness']), exposes.numeric('brightness', ea.STATE)],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genLevelCtrl']);
        },
        ota: ota.zigbeeOTA,
    },

    // Zen
    {
        zigbeeModel: ['Zen-01'],
        model: 'Zen-01-W',
        vendor: 'Zen',
        description: 'Thermostat',
        fromZigbee: [fz.battery, fz.legacy.thermostat_att_report],
        toZigbee: [tz.factory_reset, tz.thermostat_local_temperature, tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint, tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_unoccupied_heating_setpoint, tz.thermostat_setpoint_raise_lower, tz.thermostat_running_state,
            tz.thermostat_remote_sensing, tz.thermostat_control_sequence_of_operation, tz.thermostat_system_mode,
            tz.thermostat_weekly_schedule, tz.thermostat_clear_weekly_schedule, tz.thermostat_relay_status_log],
        exposes: [exposes.climate().withSetpoint('occupied_heating_setpoint', 10, 30, 0.5).withLocalTemperature()
            .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat', 'cool'])
            .withLocalTemperatureCalibration().withPiHeatingDemand()],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(3) || device.getEndpoint(1);
            const binds = ['genBasic', 'genIdentify', 'genPowerCfg', 'genTime', 'hvacThermostat', 'hvacUserInterfaceCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            await reporting.thermostatSystemMode(endpoint);
            await reporting.batteryVoltage(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
        },
    },

    // Hej
    {
        zigbeeModel: ['HejSW01'],
        model: 'GLSK3ZB-1711',
        vendor: 'Hej',
        description: 'Goqual 1 gang Switch',
        extend: preset.switch(),
    },
    {
        zigbeeModel: ['HejSW02'],
        model: 'GLSK3ZB-1712',
        vendor: 'Hej',
        description: 'Goqual 2 gang Switch',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {'top': 1, 'bottom': 2};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['HejSW03'],
        model: 'GLSK3ZB-1713',
        vendor: 'Hej',
        description: 'Goqual 3 gang Switch',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('center'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {'top': 1, 'center': 2, 'bottom': 3};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['HejSW04'],
        model: 'GLSK6ZB-1714',
        vendor: 'Hej',
        description: 'Goqual 4 gang Switch',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top_left'), e.switch().withEndpoint('bottom_left'),
            e.switch().withEndpoint('top_right'), e.switch().withEndpoint('bottom_right')],
        endpoint: (device) => {
            return {'top_left': 1, 'bottom_left': 2, 'top_right': 3, 'bottom_right': 4};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['HejSW05'],
        model: 'GLSK6ZB-1715',
        vendor: 'Hej',
        description: 'Goqual 5 gang Switch',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top_left'), e.switch().withEndpoint('top_right'), e.switch().withEndpoint('center_left'),
            e.switch().withEndpoint('bottom_left'), e.switch().withEndpoint('bottom_right')],
        endpoint: (device) => {
            return {'top_left': 1, 'center_left': 2, 'bottom_left': 3, 'top_right': 4, 'bottom_right': 5};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['HejSW06'],
        model: 'GLSK6ZB-1716',
        vendor: 'Hej',
        description: 'Goqual 6 gang Switch',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top_left'), e.switch().withEndpoint('bottom_left'), e.switch().withEndpoint('center_left'),
            e.switch().withEndpoint('center_right'), e.switch().withEndpoint('top_right'), e.switch().withEndpoint('bottom_right')],
        endpoint: (device) => {
            return {'top_left': 1, 'center_left': 2, 'bottom_left': 3, 'top_right': 4, 'center_right': 5, 'bottom_right': 6};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(6), coordinatorEndpoint, ['genOnOff']);
        },
    },

    // Ecolink
    {
        zigbeeModel: ['4655BC0-R'],
        model: '4655BC0-R',
        vendor: 'Ecolink',
        description: 'Contact sensor',
        fromZigbee: [fz.temperature, fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.temperature(), e.contact(), e.battery_low(), e.tamper()],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.temperature(endpoint);
        },
    },

    // AwoX
    {
        zigbeeModel: ['TLSR82xx'],
        model: '33951/33948',
        vendor: 'AwoX',
        description: 'LED white',
        extend: preset.light_onoff_brightness(),
    },
    {
        fingerprint: [
            {type: 'Router', manufacturerName: 'AwoX', modelID: 'TLSR82xx', endpoints: [
                {ID: 1, profileID: 260, deviceID: 258, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096], outputClusters: [6, 25]},
                {ID: 3, profileID: 49152, deviceID: 258, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
            ]},
        ],
        model: '33943',
        vendor: 'AwoX',
        description: 'LED RGB & brightness',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        fingerprint: [
            {type: 'Router', manufacturerName: 'AwoX', modelID: 'TLSR82xx', endpoints: [
                {ID: 1, profileID: 260, deviceID: 269, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599], outputClusters: [6]},
                {ID: 3, profileID: 4751, deviceID: 269, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
            ]},
        ],
        model: '33944',
        vendor: 'AwoX',
        description: 'LED E27 light with color and color temperature',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        fingerprint: [
            {type: 'Router', manufacturerName: 'AwoX', modelID: 'TLSR82xx', endpoints: [
                {ID: 1, profileID: 260, deviceID: 268, inputClusters: [0, 3, 4, 5, 6, 8, 768, 4096, 64599], outputClusters: [6]},
                {ID: 3, profileID: 4751, deviceID: 268, inputClusters: [65360, 65361], outputClusters: [65360, 65361]},
            ]},
        ],
        model: '33957',
        vendor: 'AwoX',
        description: 'LED light with color temperature',
        extend: preset.light_onoff_brightness_colortemp(),
    },

    // Dawon DNS
    {
        zigbeeModel: ['PM-C140-ZB'],
        model: 'PM-C140-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT remote control smart buried-type outlet',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ['PM-B530-ZB'],
        model: 'PM-B530-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart plug 16A',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ['PM-B540-ZB'],
        model: 'PM-B540-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart plug 16A',
        fromZigbee: [fz.device_temperature, fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering', 'genDeviceTempCfg']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
            await reporting.deviceTemperature(endpoint);
        },
        exposes: [e.device_temperature(), e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ['PM-B430-ZB'],
        model: 'PM-B430-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart plug 10A',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ['PM-S140-ZB'],
        model: 'PM-S140-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 1 gang without neutral wire',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['PM-S240-ZB'],
        model: 'PM-S240-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 2 gang without neutral wire',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {top: 1, bottom: 2};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
        },
    },
    {
        zigbeeModel: ['PM-S340-ZB'],
        model: 'PM-S340-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 3 gang without neutral wire',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('center'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {top: 1, center: 2, bottom: 3};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
            await reporting.onOff(device.getEndpoint(3));
        },
    },
    {
        zigbeeModel: ['PM-S140R-ZB'],
        model: 'PM-S140R-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 1 gang router without neutral wire',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['PM-S240R-ZB'],
        model: 'PM-S240R-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 2 gang without neutral wire',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {top: 1, bottom: 2};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
        },
    },
    {
        zigbeeModel: ['PM-S340R-ZB'],
        model: 'PM-S340R-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 3 gang without neutral wire',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('center'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {top: 1, center: 2, bottom: 3};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
            await reporting.onOff(device.getEndpoint(3));
        },
    },
    {
        zigbeeModel: ['PM-S150-ZB'],
        model: 'PM-S150-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 1 gang router without neutral wire',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['PM-S250-ZB'],
        model: 'PM-S250-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 2 gang without neutral wire',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {top: 1, bottom: 2};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
        },
    },
    {
        zigbeeModel: ['PM-S350-ZB'],
        model: 'PM-S350-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 3 gang without neutral wire',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('center'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {top: 1, center: 2, bottom: 3};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
            await reporting.onOff(device.getEndpoint(3));
        },
    },
    {
        zigbeeModel: ['PM-C150-ZB'],
        model: 'PM-C150-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT remote control smart buried-type 16A outlet',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ['SG-V100-ZB'],
        model: 'SG-V100-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT remote control smart gas lock',
        fromZigbee: [fz.on_off, fz.battery],
        toZigbee: [tz.dawondns_only_off], // Only support 'Off' command
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.onOff(endpoint);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.battery(), e.switch(), e.voltage()],
    },

    // CREE
    {
        zigbeeModel: ['Connected A-19 60W Equivalent ', 'Connected A-19 60W Equivalent   '],
        model: 'B00TN589ZG',
        vendor: 'CREE',
        description: 'Connected bulb',
        extend: preset.light_onoff_brightness(),
    },

    // Ubisys
    {
        zigbeeModel: ['S1 (5501)'],
        model: 'S1',
        vendor: 'Ubisys',
        description: 'Power switch S1',
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET).withEndpoint('meter').withProperty('power'),
            e.action([
                'toggle', 'on', 'off', 'recall_*',
                'brightness_move_up', 'brightness_move_down', 'brightness_stop',
            ])],
        fromZigbee: [fz.on_off, fz.metering, fz.command_toggle, fz.command_on, fz.command_off, fz.command_recall, fz.command_move,
            fz.command_stop],
        toZigbee: [tz.on_off, tz.metering_power, tz.ubisys_device_setup],
        endpoint: (device) => {
            return {'l1': 1, 's1': 2, 'meter': 3};
        },
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        onEvent: async (type, data, device) => {
            /*
             * As per technical doc page 18 section 7.3.4
             * https://www.ubisys.de/wp-content/uploads/ubisys-s1-technical-reference.pdf
             *
             * This cluster uses the binding table for managing command targets.
             * When factory fresh, this cluster is bound to endpoint #1 to
             * enable local control.
             *
             * We use addBinding to 'record' this default binding.
             */
            if (type === 'deviceInterview') {
                const ep1 = device.getEndpoint(1);
                const ep2 = device.getEndpoint(2);
                ep2.addBinding('genOnOff', ep1);
            }
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['S1-R (5601)'],
        model: 'S1-R',
        vendor: 'Ubisys',
        description: 'Power switch S1-R',
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET).withEndpoint('meter').withProperty('power'),
            e.action([
                'toggle', 'on', 'off', 'recall_*',
                'brightness_move_up', 'brightness_move_down', 'brightness_stop',
            ])],
        fromZigbee: [fz.on_off, fz.metering, fz.command_toggle, fz.command_on, fz.command_off, fz.command_recall, fz.command_move,
            fz.command_stop],
        toZigbee: [tz.on_off, tz.metering_power, tz.ubisys_device_setup],
        endpoint: (device) => {
            return {'l1': 1, 's1': 2, 'meter': 4};
        },
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(4);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        onEvent: async (type, data, device) => {
            /*
             * As per technical doc page 18 section 7.3.4
             * https://www.ubisys.de/wp-content/uploads/ubisys-s1-technical-reference.pdf
             *
             * This cluster uses the binding table for managing command targets.
             * When factory fresh, this cluster is bound to endpoint #1 to
             * enable local control.
             *
             * We use addBinding to 'record' this default binding.
             */
            if (type === 'deviceInterview') {
                const ep1 = device.getEndpoint(1);
                const ep2 = device.getEndpoint(2);
                ep2.addBinding('genOnOff', ep1);
            }
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['S2 (5502)', 'S2-R (5602)'],
        model: 'S2',
        vendor: 'Ubisys',
        description: 'Power switch S2',
        exposes: [
            e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'),
            e.power().withAccess(ea.STATE_GET).withEndpoint('meter').withProperty('power'),
            e.action(['toggle_s1', 'toggle_s2', 'on_s1', 'on_s2', 'off_s1', 'off_s2', 'recall_*_s1', 'recal_*_s2', 'brightness_move_up_s1',
                'brightness_move_up_s2', 'brightness_move_down_s1', 'brightness_move_down_s2', 'brightness_stop_s1',
                'brightness_stop_s2'])],
        fromZigbee: [fz.on_off, fz.metering, fz.command_toggle, fz.command_on, fz.command_off, fz.command_recall, fz.command_move,
            fz.command_stop],
        toZigbee: [tz.on_off, tz.metering_power, tz.ubisys_device_setup],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 's1': 3, 's2': 4, 'meter': 5};
        },
        meta: {configureKey: 3, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(5);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        onEvent: async (type, data, device) => {
            /*
             * As per technical doc page 20 section 7.4.4 and
             *                      page 22 section 7.5.4
             * https://www.ubisys.de/wp-content/uploads/ubisys-s2-technical-reference.pdf
             *
             * This cluster uses the binding table for managing command targets.
             * When factory fresh, this cluster is bound to endpoint #1 to
             * enable local control.
             *
             * This cluster uses the binding table for managing command targets.
             * When factory fresh, this cluster is bound to endpoint #2 to
             * enable local control
             *
             * We use addBinding to 'record' this default binding.
             */
            if (type === 'deviceInterview') {
                const ep1 = device.getEndpoint(1);
                const ep2 = device.getEndpoint(2);
                const ep3 = device.getEndpoint(3);
                const ep4 = device.getEndpoint(4);
                ep3.addBinding('genOnOff', ep1);
                ep4.addBinding('genOnOff', ep2);
            }
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['D1 (5503)', 'D1-R (5603)'],
        model: 'D1',
        vendor: 'Ubisys',
        description: 'Universal dimmer D1',
        fromZigbee: [fz.on_off, fz.brightness, fz.metering, fz.command_toggle, fz.command_on, fz.command_off, fz.command_recall,
            fz.command_move, fz.command_stop, fz.lighting_ballast_configuration, fz.level_config, fz.ubisys_dimmer_setup],
        toZigbee: [tz.light_onoff_brightness, tz.ballast_config, tz.level_config, tz.ubisys_dimmer_setup, tz.ubisys_device_setup],
        exposes: [e.light_brightness().withLevelConfig(), e.power(),
            exposes.numeric('ballast_physical_minimum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the minimum light output the ballast can achieve.'),
            exposes.numeric('ballast_physical_maximum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the maximum light output the ballast can achieve.'),
            exposes.numeric('ballast_minimum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the minimum light output of the ballast'),
            exposes.numeric('ballast_maximum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the maximum light output of the ballast'),
            exposes.binary('capabilities_forward_phase_control', ea.ALL, true, false)
                .withDescription('The dimmer supports AC forward phase control.'),
            exposes.binary('capabilities_reverse_phase_control', ea.ALL, true, false)
                .withDescription('The dimmer supports AC reverse phase control.'),
            exposes.binary('capabilities_reactance_discriminator', ea.ALL, true, false)
                .withDescription('The dimmer is capable of measuring the reactanceto distinguish inductive and capacitive loads.'),
            exposes.binary('capabilities_configurable_curve', ea.ALL, true, false)
                .withDescription('The dimmer is capable of replacing the built-in, default dimming curve.'),
            exposes.binary('capabilities_overload_detection', ea.ALL, true, false)
                .withDescription('The dimmer is capable of detecting an output overload and shutting the output off.'),
            exposes.binary('status_forward_phase_control', ea.ALL, true, false)
                .withDescription('The dimmer is currently operating in AC forward phase control mode.'),
            exposes.binary('status_reverse_phase_control', ea.ALL, true, false)
                .withDescription('The dimmer is currently operating in AC reverse phase control mode.'),
            exposes.binary('status_overload', ea.ALL, true, false)
                .withDescription('The output is currently turned off, because the dimmer has detected an overload.'),
            exposes.binary('status_capacitive_load', ea.ALL, true, false)
                .withDescription('The dimmer\'s reactance discriminator had detected a capacitive load.'),
            exposes.binary('status_inductive_load', ea.ALL, true, false)
                .withDescription('The dimmer\'s reactance discriminator had detected an inductive load.'),
            exposes.enum('mode_phase_control', ea.ALL, ['automatic', 'forward', 'reverse'])
                .withDescription('Configures the dimming technique.')],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(4);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        onEvent: async (type, data, device) => {
            /*
             * As per technical doc page 23 section 7.3.4, 7.3.5
             * https://www.ubisys.de/wp-content/uploads/ubisys-d1-technical-reference.pdf
             *
             * We use addBinding to 'record' this default binding.
             */
            if (type === 'deviceInterview') {
                const ep1 = device.getEndpoint(1);
                const ep2 = device.getEndpoint(2);
                ep2.addBinding('genOnOff', ep1);
                ep2.addBinding('genLevelCtrl', ep1);
            }
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['J1 (5502)', 'J1-R (5602)'],
        model: 'J1',
        vendor: 'Ubisys',
        description: 'Shutter control J1',
        fromZigbee: [fz.cover_position_tilt, fz.metering],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.ubisys_configure_j1, tz.ubisys_device_setup],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint3);
            await reporting.instantaneousDemand(endpoint3);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint1);
        },
        ota: ota.ubisys,
        exposes: [e.cover_position_tilt(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ['C4 (5504)'],
        model: 'C4',
        vendor: 'Ubisys',
        description: 'Control unit C4',
        fromZigbee: [fz.legacy.ubisys_c4_scenes, fz.legacy.ubisys_c4_onoff, fz.legacy.ubisys_c4_level, fz.legacy.ubisys_c4_cover],
        toZigbee: [tz.ubisys_device_setup],
        exposes: [e.action([
            '1_scene_*', '1_on', '1_off', '1_toggle', '1_level_move_down', '1_level_move_up',
            '2_scene_*', '2_on', '2_off', '2_toggle', '2_level_move_down', '2_level_move_up',
            '3_scene_*', '3_on', '3_off', '3_toggle', '3_level_move_down', '3_level_move_up',
            '4_scene_*', '4_on', '4_off', '4_toggle', '4_level_move_down', '4_level_move_up',
            '5_scene_*', '5_cover_open', '5_cover_close', '5_cover_stop',
            '6_scene_*', '6_cover_open', '6_cover_close', '6_cover_stop'])],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            for (const ep of [1, 2, 3, 4]) {
                await reporting.bind(device.getEndpoint(ep), coordinatorEndpoint, ['genScenes', 'genOnOff', 'genLevelCtrl']);
            }
            for (const ep of [5, 6]) {
                await reporting.bind(device.getEndpoint(ep), coordinatorEndpoint, ['genScenes', 'closuresWindowCovering']);
            }
        },
        ota: ota.ubisys,
    },

    // PEQ
    {
        zigbeeModel: ['3300'],
        model: '3300-P',
        vendor: 'PEQ',
        description: 'Door & window contact sensor',
        fromZigbee: [fz.temperature, fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.temperature(), e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },

    // iHORN
    {
        zigbeeModel: ['113D'],
        model: 'LH-32ZB',
        vendor: 'iHORN',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.humidity, fz.temperature, fz.battery],
        toZigbee: [],
        exposes: [e.humidity(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['113C'],
        model: 'LH-992ZB',
        vendor: 'iHORN',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['TI0001 '],
        model: 'LH-990ZB',
        vendor: 'iHORN',
        description: 'PIR motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['HORN-MECI-A3.9-E'],
        model: 'HO-09ZB',
        vendor: 'iHORN',
        description: 'Door or window contact switch',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['HORN-PIR--A3.9-E'],
        model: 'LH-990F',
        vendor: 'iHORN',
        description: 'PIR motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },

    // TCI
    {
        zigbeeModel: ['VOLARE ZB3\u0000\u0000\u0000\u0000\u0000\u0000\u0000'],
        model: '676-00301024955Z',
        vendor: 'TCI',
        description: 'Dash L DC Volare',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['MAXI JOLLY ZB3'],
        model: '151570',
        vendor: 'TCI',
        description: 'LED driver for wireless control (60 watt)',
        extend: preset.light_onoff_brightness(),
    },

    // TERNCY
    {
        zigbeeModel: ['TERNCY-DC01'],
        model: 'TERNCY-DC01',
        vendor: 'TERNCY',
        description: 'Temperature & contact sensor ',
        fromZigbee: [fz.terncy_temperature, fz.terncy_contact, fz.battery],
        toZigbee: [],
        exposes: [e.temperature(), e.contact(), e.battery()],
        meta: {battery: {dontDividePercentage: true}},
    },
    {
        zigbeeModel: ['TERNCY-PP01'],
        model: 'TERNCY-PP01',
        vendor: 'TERNCY',
        description: 'Awareness switch',
        fromZigbee: [fz.terncy_temperature, fz.occupancy_with_timeout, fz.illuminance, fz.terncy_raw, fz.legacy.terncy_raw, fz.battery],
        exposes: [e.temperature(), e.occupancy(), e.illuminance_lux(), e.illuminance(),
            e.action(['single', 'double', 'triple', 'quadruple'])],
        toZigbee: [],
        meta: {battery: {dontDividePercentage: true}},
    },
    {
        zigbeeModel: ['TERNCY-SD01'],
        model: 'TERNCY-SD01',
        vendor: 'TERNCY',
        description: 'Knob smart dimmer',
        fromZigbee: [fz.terncy_raw, fz.legacy.terncy_raw, fz.legacy.terncy_knob, fz.battery],
        toZigbee: [],
        ota: ota.zigbeeOTA,
        meta: {battery: {dontDividePercentage: true}},
        exposes: [e.battery(), e.action(['single', 'double', 'triple', 'quadruple', 'rotate']),
            exposes.text('direction', ea.STATE)],
    },
    {
        zigbeeModel: ['TERNCY-LS01'],
        model: 'TERNCY-LS01',
        vendor: 'TERNCY',
        description: 'Smart light socket',
        exposes: [e.switch(), e.action(['single'])],
        fromZigbee: [fz.on_off, fz.terncy_raw, fz.ignore_basic_report],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },

    // ORVIBO
    {
        zigbeeModel: ['3c4e4fc81ed442efaf69353effcdfc5f', '51725b7bcba945c8a595b325127461e9'],
        model: 'CR11S8UZ',
        vendor: 'ORVIBO',
        description: 'Smart sticker switch',
        fromZigbee: [fz.orvibo_raw_1],
        exposes: [e.action(['button_1_click', 'button_1_hold', 'button_1_release', 'button_2_click', 'button_2_hold', 'button_2_release',
            'button_3_click', 'button_3_hold', 'button_3_release', 'button_4_click', 'button_4_hold', 'button_4_release'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['31c989b65ebb45beaf3b67b1361d3965'],
        model: 'T18W3Z',
        vendor: 'ORVIBO',
        description: 'Neutral smart switch 3 gang',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3')],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint2);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint3);
        },
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3};
        },
    },
    {
        zigbeeModel: ['fdd76effa0e146b4bdafa0c203a37192', 'c670e231d1374dbc9e3c6a9fffbd0ae6', '75a4bfe8ef9c4350830a25d13e3ab068'],
        model: 'SM10ZW',
        vendor: 'ORVIBO',
        description: 'Door or window contact switch',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['8643db61de35494d93e72c1289b526a3'],
        model: 'RL804CZB',
        vendor: 'Orvibo',
        description: 'Zigbee LED controller RGB + CCT or RGBW',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['82c167c95ed746cdbd21d6817f72c593', '8762413da99140cbb809195ff40f8c51'],
        model: 'RL804QZB',
        vendor: 'ORVIBO',
        description: 'Multi-functional 3 gang relay',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3')],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['b467083cfc864f5e826459e5d8ea6079'],
        model: 'ST20',
        vendor: 'ORVIBO',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.humidity, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {configureKey: 2, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['msTemperatureMeasurement']);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msRelativeHumidity', 'genPowerCfg']);
            await reporting.temperature(endpoint1);
            await reporting.humidity(endpoint2);
            await reporting.batteryVoltage(endpoint2);
            await reporting.batteryPercentageRemaining(endpoint2);
        },
        exposes: [e.humidity(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['888a434f3cfc47f29ec4a3a03e9fc442'],
        model: 'ST21',
        vendor: 'ORVIBO',
        description: 'Temperature & humidity Sensor',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        meta: {configureKey: 2, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['msTemperatureMeasurement']);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msRelativeHumidity', 'genPowerCfg']);
            await reporting.temperature(endpoint1);
            await reporting.humidity(endpoint2);
            await reporting.batteryVoltage(endpoint2);
            await reporting.batteryPercentageRemaining(endpoint2);
        },
        exposes: [e.temperature(), e.humidity(), e.battery()],
    },
    {
        zigbeeModel: ['898ca74409a740b28d5841661e72268d'],
        model: 'ST30',
        vendor: 'ORVIBO',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.humidity, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['msTemperatureMeasurement']);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msRelativeHumidity', 'genPowerCfg']);
            await reporting.temperature(endpoint1);
            await reporting.humidity(endpoint2);
            await reporting.batteryVoltage(endpoint2);
            await reporting.batteryPercentageRemaining(endpoint2);
        },
        exposes: [e.humidity(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['9f76c9f31b4c4a499e3aca0977ac4494'],
        model: 'T30W3Z',
        vendor: 'ORVIBO',
        description: 'Smart light switch - 3 gang',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('center'), e.switch().withEndpoint('bottom')],
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            return {'top': 1, 'center': 2, 'bottom': 3};
        },
    },
    {
        zigbeeModel: ['074b3ffba5a045b7afd94c47079dd553'],
        model: 'T21W2Z',
        vendor: 'ORVIBO',
        description: 'Smart light switch - 2 gang',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {'top': 1, 'bottom': 2};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['095db3379e414477ba6c2f7e0c6aa026'],
        model: 'T21W1Z',
        vendor: 'ORVIBO',
        description: 'Smart light switch - 1 gang',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['093199ff04984948b4c78167c8e7f47e'],
        model: 'W40CZ',
        vendor: 'ORVIBO',
        description: 'Smart curtain motor ',
        fromZigbee: [fz.curtain_position_analog_output, fz.cover_position_tilt, fz.ignore_basic_report],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position()],
    },
    {
        zigbeeModel: ['e0fc98cc88df4857847dc4ae73d80b9e'],
        model: 'R11W2Z',
        vendor: 'ORVIBO',
        description: 'In wall switch - 2 gang',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['9ea4d5d8778d4f7089ac06a3969e784b', '83b9b27d5ffb4830bf35be5b1023623e'],
        model: 'R20W2Z',
        vendor: 'ORVIBO',
        description: 'In wall switch - 2 gang',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
    },
    {
        zigbeeModel: ['131c854783bc45c9b2ac58088d09571c'],
        model: 'SN10ZW',
        vendor: 'ORVIBO',
        description: 'Occupancy sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout, fz.battery],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['da2edf1ded0d44e1815d06f45ce02029'],
        model: 'SW21',
        vendor: 'ORVIBO',
        description: 'Water leakage sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['b7e305eb329f497384e966fe3fb0ac69', '52debf035a1b4a66af56415474646c02', 'MultIR'],
        model: 'SW30',
        vendor: 'ORVIBO',
        description: 'Water leakage sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['72bd56c539ca4c7fba73a9be0ae0d19f'],
        model: 'SE21',
        vendor: 'ORVIBO',
        description: 'Smart emergency button',
        fromZigbee: [fz.command_status_change_notification_action],
        exposes: [e.action(['off', 'single', 'double', 'hold'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['2a103244da0b406fa51410c692f79ead'],
        model: 'AM25',
        vendor: 'ORVIBO',
        description: 'Smart blind controller',
        fromZigbee: [fz.cover_position_tilt, fz.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
        exposes: [e.cover_position(), e.battery()],
    },

    // Yookee
    {
        zigbeeModel: ['D10110'],
        model: 'D10110',
        vendor: 'Yookee',
        description: 'Smart blind controller',
        fromZigbee: [fz.cover_position_tilt, fz.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        meta: {configureKey: 1, coverInverted: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
        exposes: [e.cover_position(), e.battery()],
    },

    // SONOFF
    {
        zigbeeModel: ['BASICZBR3'],
        model: 'BASICZBR3',
        vendor: 'SONOFF',
        description: 'Zigbee smart switch',
        extend: preset.switch(),
        fromZigbee: [fz.on_off_skip_duplicate_transaction],
    },
    {
        zigbeeModel: ['01MINIZB'],
        model: 'ZBMINI',
        vendor: 'SONOFF',
        description: 'Zigbee two way smart switch',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            // Has Unknown power source: https://github.com/Koenkk/zigbee2mqtt/issues/5362, force it here.
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['S31 Lite zb'],
        model: 'S31ZB',
        vendor: 'SONOFF',
        description: 'Zigbee smart plug (US version)',
        extend: preset.switch(),
        fromZigbee: [fz.on_off_skip_duplicate_transaction],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [
            // ModelID is from the temperature/humidity sensor (SNZB-02) but this is SNZB-04, wrong modelID in firmware?
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1449
            {type: 'EndDevice', manufacturerName: 'eWeLink', modelID: 'TH01', endpoints: [
                {ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 3, 1280, 1], outputClusters: [3]},
            ]},
        ],
        zigbeeModel: ['DS01'],
        model: 'SNZB-04',
        vendor: 'SONOFF',
        whiteLabel: [{vendor: 'eWeLink', model: 'RHK06'}],
        description: 'Contact sensor',
        exposes: [e.contact(), e.battery_low(), e.battery(), e.battery_voltage()],
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['WB01', 'WB-01'],
        model: 'SNZB-01',
        vendor: 'SONOFF',
        whiteLabel: [{vendor: 'eWeLink', model: 'RHK07'}],
        description: 'Wireless button',
        exposes: [e.battery(), e.action(['single', 'double', 'long'])],
        fromZigbee: [fz.ewelink_action, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        fingerprint: [
            // ModelID is from the button (SNZB-01) but this is SNZB-02, wrong modelID in firmware?
            // https://github.com/Koenkk/zigbee2mqtt/issues/4338
            {type: 'EndDevice', manufacturerName: 'eWeLink', modelID: 'WB01', endpoints: [
                {ID: 1, profileID: 260, deviceID: 770, inputClusters: [0, 3, 1026, 1029, 1], outputClusters: [3]},
            ]},
            {type: 'EndDevice', manufacturerName: 'eWeLink', modelID: '66666', endpoints: [
                {ID: 1, profileID: 260, deviceID: 770, inputClusters: [0, 3, 1026, 1029, 1], outputClusters: [3]},
            ]},
            {type: 'EndDevice', manufacturerName: 'eWeLink', modelID: 'DS01', endpoints: [
                {ID: 1, profileID: 260, deviceID: 770, inputClusters: [0, 3, 1026, 1029, 1], outputClusters: [3]},
            ]},
        ],
        zigbeeModel: ['TH01'],
        model: 'SNZB-02',
        vendor: 'SONOFF',
        whiteLabel: [{vendor: 'eWeLink', model: 'RHK08'}],
        description: 'Temperature and humidity sensor',
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            try {
                const endpoint = device.getEndpoint(1);
                const bindClusters = ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg'];
                await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
                await reporting.temperature(endpoint, {min: 5, max: repInterval.MINUTES_30, change: 50});
                await reporting.humidity(endpoint);
                await reporting.batteryVoltage(endpoint);
                await reporting.batteryPercentageRemaining(endpoint);
            } catch (e) {/* Not required for all: https://github.com/Koenkk/zigbee2mqtt/issues/5562 */
                logger.error(`Configure failed: ${e}`);
            }
        },
    },
    {
        fingerprint: [
            {type: 'EndDevice', manufacturerName: 'eWeLink', modelID: '66666', endpoints: [
                {ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 3, 1280, 1], outputClusters: [3]},
            ]},
        ],
        zigbeeModel: ['MS01', 'MSO1'],
        model: 'SNZB-03',
        vendor: 'SONOFF',
        whiteLabel: [{vendor: 'eWeLink', model: 'RHK09'}],
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ['genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },

    // eWeLink
    {
        zigbeeModel: ['SA-003-Zigbee'],
        model: 'SA-003-Zigbee',
        vendor: 'eWeLink',
        description: 'Zigbee smart plug',
        extend: preset.switch(),
        fromZigbee: [fz.on_off_skip_duplicate_transaction],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
        onEvent: async (type, data, device) => {
            device.skipDefaultResponse = true;
        },
    },
    {
        zigbeeModel: ['ZB-SW01'],
        model: 'ZB-SW01',
        vendor: 'eWeLink',
        description: 'Smart light switch - 1 gang',
        extend: preset.switch(),
        fromZigbee: [fz.on_off_skip_duplicate_transaction],
        onEvent: async (type, data, device) => {
            device.skipDefaultResponse = true;
        },
    },
    {
        zigbeeModel: ['ZB-SW02', 'E220-KR2N0Z0-HA'],
        model: 'ZB-SW02',
        vendor: 'eWeLink',
        description: 'Smart light switch - 2 gang',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right')],
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
        onEvent: async (type, data, device) => {
            device.skipDefaultResponse = true;
        },
    },
    {
        zigbeeModel: ['ZB-SW03'],
        model: 'ZB-SW03',
        vendor: 'eWeLink',
        description: 'Smart light switch - 3 gang',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('center'), e.switch().withEndpoint('right')],
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
        onEvent: async (type, data, device) => {
            device.skipDefaultResponse = true;
        },
    },

    // CR Smart Home
    {
        fingerprint: [{modelID: 'TS0202', manufacturerName: '_TYZB01_jytabjkb'}],
        model: 'TS0202_CR',
        vendor: 'CR Smart Home',
        description: 'Motion sensor',
        // Requires alarm_1_with_timeout https://github.com/Koenkk/zigbee2mqtt/issues/2818#issuecomment-776119586
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout, fz.battery, fz.ignore_basic_report],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['TS0203'],
        model: 'TS0203',
        vendor: 'CR Smart Home',
        description: 'Door sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ignore_basic_report, fz.ias_contact_alarm_1_report],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['TS0204'],
        model: 'TS0204',
        vendor: 'CR Smart Home',
        description: 'Gas sensor',
        fromZigbee: [fz.ias_gas_alarm_1, fz.battery, fz.ignore_basic_report],
        toZigbee: [],
        exposes: [e.gas(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['TS0205'],
        model: 'TS0205',
        vendor: 'CR Smart Home',
        description: 'Smoke sensor',
        fromZigbee: [fz.ias_smoke_alarm_1, fz.battery, fz.ignore_basic_report],
        toZigbee: [],
        exposes: [e.smoke(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['TS0111'],
        model: 'TS0111',
        vendor: 'CR Smart Home',
        description: 'Socket',
        extend: preset.switch(),
    },
    {
        zigbeeModel: ['TS0207', 'FNB54-WTS08ML1.0'],
        model: 'TS0207',
        vendor: 'CR Smart Home',
        description: 'Water leak detector',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['TS0218'],
        model: 'TS0218',
        vendor: 'CR Smart Home',
        description: 'Button',
        fromZigbee: [fz.legacy.TS0218_click, fz.battery],
        exposes: [e.battery(), e.action(['click'])],
        toZigbee: [],
    },

    // EcoDim
    {
        zigbeeModel: ['Dimmer-Switch-ZB3.0'],
        model: 'Eco-Dim.07',
        vendor: 'EcoDim',
        description: 'Zigbee & Z-wave dimmer ',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },

    // EcoDim
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
        exposes: [e.battery(), e.action(['on', 'off', 'brightness_move_up', 'brightness_move_down', 'brightness_stop'])],
        toZigbee: [],
        meta: {multiEndpoint: true},
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

    // Smart9
    {
        zigbeeModel: ['TS0215'],
        model: 'S9ZGBRC01',
        vendor: 'Smart9',
        description: 'Smart remote controller',
        fromZigbee: [fz.command_arm, fz.command_emergency, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.action(['disarm', 'arm_day_zones', 'arm_night_zones', 'arm_all_zones', 'exit_delay', 'emergency'])],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
        },
        onEvent: async (type, data, device) => {
            // Since arm command has a response zigbee-herdsman doesn't send a default response.
            // This causes the remote to repeat the arm command, so send a default response here.
            if (data.type === 'commandArm' && data.cluster === 'ssIasAce') {
                await data.endpoint.defaultResponse(0, 0, 1281, data.meta.zclTransactionSequenceNumber);
            }
        },
    },

    // Ajax Online
    {
        zigbeeModel: ['AJ-RGBCCT 5 in 1'],
        model: 'Aj_Zigbee_Led_Strip',
        vendor: 'Ajax Online',
        description: 'LED Strip',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['AJ_ZB30_GU10', 'AJ_ZB120_GU10'],
        model: 'AJ_ZB_GU10',
        vendor: 'Ajax Online',
        description: 'Smart Zigbee pro GU10 spotlight bulb',
        extend: preset.light_onoff_brightness_colortemp_color({colorTempRange: [158, 495], disableEffect: true}),
    },

    // Moes
    {
        fingerprint: [{modelID: 'TS0121', manufacturerName: '_TYZB01_iuepbmpv'}, {modelID: 'TS011F', manufacturerName: '_TZ3000_zmy1waw6'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_bkfe0bab'}],
        model: 'MS-104Z',
        description: 'Smart light switch module (1 gang)',
        vendor: 'Moes',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            try {
                // Fails for some devices.
                // https://github.com/Koenkk/zigbee2mqtt/issues/4598
                await reporting.onOff(endpoint);
            } catch (e) {
                e;
            }
        },
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_pmz6mjyu'}],
        model: 'MS-104BZ',
        description: 'Smart light switch module (2 gang)',
        vendor: 'Moes',
        toZigbee: preset.switch().toZigbee.concat([tz.moes_power_on_behavior]),
        fromZigbee: preset.switch().fromZigbee.concat([fz.moes_power_on_behavior]),
        extend: preset.switch(),
        meta: {configureKey: 1, multiEndpoint: true},
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'),
            exposes.enum('power_on_behavior', ea.ALL, ['on', 'off', 'previous'])
                .withDescription('Controls the behaviour when the device is powered on')],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint2);
        },
    },
    {
        zigbeeModel: ['TS0112'],
        model: 'ZK-EU-2U',
        vendor: 'Moes',
        description: 'Zigbee 3.0 dual USB wireless socket plug',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        meta: {multiEndpoint: true, configureKey: 1},
        endpoint: (device) => {
            const hasEndpoint2 = !!device.getEndpoint(2);
            return {l1: 1, l2: hasEndpoint2 ? 2 : 7};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_aoclfnxz'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ztvwu4nk'}],
        model: 'BHT-002-GCLZB',
        vendor: 'Moes',
        description: 'Moes BHT series Thermostat',
        fromZigbee: [fz.moes_thermostat],
        toZigbee: [tz.moes_thermostat_child_lock, tz.moes_thermostat_current_heating_setpoint, tz.moes_thermostat_mode,
            tz.moes_thermostat_standby, tz.moes_thermostat_sensor, tz.moes_thermostat_calibration,
            tz.moes_thermostat_deadzone_temperature, tz.moes_thermostat_max_temperature_limit],
        exposes: [e.child_lock(), e.deadzone_temperature(), e.max_temperature_limit(),
            exposes.climate().withSetpoint('current_heating_setpoint', 5, 30, 1, ea.STATE_SET)
                .withLocalTemperature(ea.STATE).withLocalTemperatureCalibration(ea.STATE_SET)
                .withSystemMode(['off', 'heat'], ea.STATE_SET).withRunningState(['idle', 'heat', 'cool'], ea.STATE)
                .withPreset(['hold', 'program']).withSensor(['IN', 'AL', 'OU'], ea.STATE_SET)],
        onEvent: tuya.onEventSetLocalTime,
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_amp6tsvy'}],
        model: 'ZTS-EU_1gang',
        vendor: 'Moes',
        description: 'Wall touch light switch (1 gang)',
        exposes: [e.switch().setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.tuya_switch],
        toZigbee: [tz.tuya_switch_state],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_tz32mtza'}],
        model: 'ZTS-EU_3gang',
        vendor: 'Moes',
        description: 'Wall touch light switch (3 gang)',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET), e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.tuya_switch],
        toZigbee: [tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1, 'l3': 1};
        },
    },
    {
        fingerprint: [{modelID: 'GbxAXL2\u0000', manufacturerName: '_TYST11_KGbxAXL2'},
            {modelID: 'uhszj9s\u0000', manufacturerName: '_TYST11_zuhszj9s'},
            {modelID: '88teujp\u0000', manufacturerName: '_TYST11_c88teujp'},
            {modelID: 'w7cahqs\u0000', manufacturerName: '_TYST11_yw7cahqs'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_c88teujp'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_yw7cahqs'},
            {modelId: 'TS0601', manufacturerName: '_TZE200_azqp6ssj'},
        ],
        model: 'SEA801-Zigbee/SEA802-Zigbee',
        vendor: 'Saswell',
        description: 'Thermostatic radiator valve',
        whiteLabel: [{vendor: 'HiHome', model: 'WZB-TRVL'}, {vendor: 'Hama', model: '00176592'},
            {vendor: 'RTX', model: 'ZB-RT1'}],
        fromZigbee: [fz.saswell_thermostat, fz.ignore_tuya_set_time, fz.ignore_basic_report, fz.legacy.tuya_thermostat_weekly_schedule],
        toZigbee: [tz.saswell_thermostat_current_heating_setpoint, tz.saswell_thermostat_mode, tz.saswell_thermostat_away,
            tz.saswell_thermostat_child_lock, tz.saswell_thermostat_window_detection, tz.saswell_thermostat_frost_detection,
            tz.saswell_thermostat_calibration, tz.saswell_thermostat_anti_scaling, tz.tuya_thermostat_weekly_schedule],
        onEvent: tuya.onEventSetTime,
        meta: {
            configureKey: 1,
            thermostat: {
                weeklyScheduleMaxTransitions: 4,
                weeklyScheduleSupportedModes: [1], // bits: 0-heat present, 1-cool present (dec: 1-heat,2-cool,3-heat+cool)
                weeklyScheduleConversion: 'saswell',
            },
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [e.battery_low(), e.window_detection(), e.child_lock(), exposes.climate()
            .withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET).withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'heat', 'auto'], ea.STATE_SET).withLocalTemperatureCalibration(ea.STATE_SET)
            .withRunningState(['idle', 'heat'], ea.STATE).withAwayMode()],
    },

    // HGKG
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_dzuqwsyg'}],
        model: 'BAC-002-ALZB',
        vendor: 'HKGK',
        description: 'BAC series thermostat',
        fromZigbee: [fz.moes_thermostat],
        toZigbee: [tz.moes_thermostat_child_lock, tz.moes_thermostat_current_heating_setpoint, tz.moes_thermostat_mode,
            tz.hgkg_thermostat_standby, tz.moes_thermostat_sensor, tz.moes_thermostat_calibration,
            tz.moes_thermostat_deadzone_temperature, tz.moes_thermostat_max_temperature_limit],
        exposes: [e.child_lock(), e.deadzone_temperature(), e.max_temperature_limit(),
            exposes.climate().withSetpoint('current_heating_setpoint', 5, 30, 1, ea.STATE_SET)
                .withLocalTemperature(ea.STATE).withLocalTemperatureCalibration(ea.STATE_SET)
                .withSystemMode(['off', 'cool'], ea.STATE_SET).withRunningState(['idle', 'heat', 'cool'], ea.STATE)
                .withPreset(['hold', 'program']).withSensor(['IN', 'AL', 'OU'], ea.STATE_SET)],
        onEvent: tuya.onEventSetLocalTime,
    },

    // Schneider Electric
    {
        zigbeeModel: ['iTRV'],
        model: 'WV704R0A0902',
        vendor: 'Schneider Electric',
        description: 'Wiser radiator thermostat',
        fromZigbee: [fz.ignore_basic_report, fz.ignore_haDiagnostic, fz.ignore_genOta, fz.ignore_zclversion_read,
            fz.legacy.wiser_thermostat, fz.legacy.wiser_itrv_battery, fz.hvac_user_interface, fz.wiser_device_info],
        toZigbee: [tz.thermostat_occupied_heating_setpoint, tz.thermostat_keypad_lockout],
        exposes: [exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 1).withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'auto', 'heat'], ea.STATE).withRunningState(['idle', 'heat'], ea.STATE).withPiHeatingDemand()],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genPowerCfg', 'hvacThermostat', 'haDiagnostic'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryVoltage(endpoint);
            await reporting.thermostatTemperature(endpoint, {min: 0, max: repInterval.MINUTES_15, change: 25});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 0, max: repInterval.MINUTES_15, change: 25});
            await reporting.thermostatPIHeatingDemand(endpoint, {min: 0, max: repInterval.MINUTES_15, change: 1});
            // bind of hvacUserInterfaceCfg fails with 'Table Full', does this have any effect?
            await endpoint.configureReporting('hvacUserInterfaceCfg', [{attribute: 'keypadLockout',
                minimumReportInterval: repInterval.MINUTE, maximumReportInterval: repInterval.HOUR, reportableChange: 1}]);
        },
    },
    {
        zigbeeModel: ['U202DST600ZB'],
        model: 'U202DST600ZB',
        vendor: 'Schneider Electric',
        description: 'EZinstall3 2 gang 2x300W dimmer module',
        extend: preset.light_onoff_brightness(),
        exposes: [e.light_brightness().withEndpoint('l1'), e.light_brightness().withEndpoint('l2')],
        meta: {configureKey: 2, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(10);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint1);
            await reporting.brightness(endpoint1);
            const endpoint2 = device.getEndpoint(11);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint2);
            await reporting.brightness(endpoint2);
        },
        endpoint: (device) => {
            return {l1: 10, l2: 11};
        },
    },
    {
        zigbeeModel: ['U201DST600ZB'],
        model: 'U201DST600ZB',
        vendor: 'Schneider Electric',
        description: 'EZinstall3 1 gang 550W dimmer module',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(10);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ['U201SRY2KWZB'],
        model: 'U201SRY2KWZB',
        vendor: 'Schneider Electric',
        description: 'Ulti 240V 9.1 A 1 gang relay switch impress switch module, amber LED',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(10);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['U202SRY2KWZB'],
        model: 'U202SRY2KWZB',
        vendor: 'Schneider Electric',
        description: 'Ulti 240V 9.1 A 2 gangs relay switch impress switch module, amber LED',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(10);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            const endpoint2 = device.getEndpoint(11);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint2);
        },
        endpoint: (device) => {
            return {l1: 10, l2: 11};
        },
    },
    {
        zigbeeModel: ['1GANG/SHUTTER/1'],
        model: 'MEG5113-0300/MEG5165-0000',
        vendor: 'Schneider Electric',
        description: 'Merten PlusLink Shutter insert with Merten Wiser System M Push Button',
        fromZigbee: [fz.cover_position_tilt, fz.command_cover_close, fz.command_cover_open, fz.command_cover_stop],
        toZigbee: [tz.cover_position_tilt, tz.cover_state],
        exposes: [e.cover_position()],
        meta: {configureKey: 1, coverInverted: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(5);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
    {
        zigbeeModel: ['LK Switch'],
        model: '545D6514',
        vendor: 'Schneider Electric',
        description: 'LK FUGA wiser wireless double relay',
        meta: {multiEndpoint: true, configureKey: 1},
        fromZigbee: [fz.on_off, fz.command_on, fz.command_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 's1': 21, 's2': 22, 's3': 23, 's4': 24};
        },
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.action(['on_s*', 'off_s*'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            device.endpoints.forEach(async (ep) => {
                if (ep.outputClusters.includes(6)) {
                    await reporting.bind(ep, coordinatorEndpoint, ['genOnOff']);
                    if (ep.ID <= 2) {
                        await reporting.onOff(ep);
                    }
                }
            });
        },
    },

    // Legrand
    {
        zigbeeModel: [' Contactor\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'+
            '\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'],
        model: 'FC80CC',
        description: 'Legrand (or Bticino) DIN contactor module (note: Legrand 412171 may be similar to Bticino FC80CC)',
        vendor: 'Legrand',
        extend: preset.switch(),
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement, fz.legrand_device_mode, fz.ignore_basic_report, fz.ignore_genOta],
        toZigbee: [tz.legrand_deviceMode, tz.on_off, tz.legrand_identify, tz.electrical_measurement_power],
        exposes: [exposes.switch().withState('state', true, 'On/off (works only if device is in "switch" mode)'),
            e.power().withAccess(ea.STATE_GET), exposes.enum( 'device_mode', ea.ALL, ['switch', 'auto'])
                .withDescription('switch: allow on/off, auto will use wired action via C1/C2 on contactor for example with HC/HP')],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: [' Teleruptor\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'+
            '\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'],
        model: 'FC80RC',
        description: 'Legrand (or Bticino) DIN smart relay for light control (note: Legrand 412170 may be similar to Bticino FC80RC)',
        vendor: 'Legrand',
        extend: preset.switch(),
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement, fz.legrand_device_mode, fz.ignore_basic_report, fz.ignore_genOta],
        toZigbee: [tz.legrand_deviceMode, tz.on_off, tz.legrand_identify, tz.electrical_measurement_power],
        exposes: [exposes.switch().withState('state', true, 'On/off (works only if device is in "switch" mode)'),
            e.power().withAccess(ea.STATE_GET), exposes.enum( 'device_mode', ea.ALL, ['switch', 'auto'])
                .withDescription('switch: allow on/off, auto will use wired action via C1/C2 on teleruptor with buttons')],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: [' Shutters central remote switch'],
        model: '067646',
        vendor: 'Legrand',
        description: 'Wireless shutter switch',
        fromZigbee: [fz.identify, fz.ignore_basic_report, fz.command_cover_open, fz.command_cover_close, fz.command_cover_stop, fz.battery,
            fz.legrand_binary_input_moving],
        toZigbee: [],
        exposes: [e.battery(), e.action(['identify', 'open', 'close', 'stop', 'moving', 'stopped'])],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genBinaryInput', 'closuresWindowCovering', 'genIdentify']);
        },
        onEvent: async (type, data, device, options) => {
            await legrand.readInitialBatteryState(type, data, device);

            if (data.type === 'commandCheckin' && data.cluster === 'genPollCtrl') {
                const endpoint = device.getEndpoint(1);
                const options = {manufacturerCode: 0x1021, disableDefaultResponse: true};
                await endpoint.command('genPollCtrl', 'fastPollStop', {}, options);
            }
        },
    },
    {
        zigbeeModel: [' Shutter switch with neutral\u0000\u0000\u0000'],
        model: '067776',
        vendor: 'Legrand',
        description: 'Netatmo wired shutter switch',
        // the physical LED will be green when permit join is true, off otherwise and red when not linked
        fromZigbee: [
            // Devices can send an identify message when the configuration button is pressed
            // (behind the physical buttons)
            // Used on the official gateway to send to every devices an identify command (green)
            fz.identify, fz.ignore_basic_report,
            // support binary report on moving state (supposed)
            fz.legrand_binary_input_moving, fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.legrand_identify, tz.legrand_settingAlwaysEnableLed],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBinaryInput', 'closuresWindowCovering', 'genIdentify']);
        },
        exposes: [e.cover_position()],
    },
    {
        zigbeeModel: [
            ' Remote switch\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'],
        model: '067773',
        vendor: 'Legrand',
        // led blink RED when battery is low
        description: 'Wireless remote switch',
        fromZigbee: [fz.identify, fz.command_on, fz.command_off, fz.legacy.cmd_move, fz.legacy.cmd_stop, fz.battery],
        exposes: [e.battery(), e.action(['identify', 'on', 'off', 'brightness_move_up', 'brightness_move_down', 'brightness_stop'])],
        toZigbee: [],
        meta: {configureKey: 2, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genOnOff', 'genLevelCtrl']);
        },
        onEvent: legrand.readInitialBatteryState,
    },
    {
        zigbeeModel: [' Double gangs remote switch', 'Double gangs remote switch'],
        model: '067774',
        vendor: 'Legrand',
        description: 'Wireless double remote switch',
        exposes: [e.battery(), e.action(['identify', 'on', 'off', 'brightness_stop', 'brightness_move_up', 'brightness_move_down'])],
        fromZigbee: [fz.identify, fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, multiEndpoint: true},
        endpoint: (device) => {
            return {left: 1, right: 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genOnOff', 'genLevelCtrl']);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genPowerCfg', 'genOnOff', 'genLevelCtrl']);
        },
        onEvent: legrand.readInitialBatteryState,
    },
    {
        zigbeeModel: [' Remote toggle switch\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'],
        model: '067694',
        vendor: 'Legrand',
        description: 'Remote toggle switch',
        fromZigbee: [fz.identify, fz.command_on, fz.command_off, fz.command_toggle, fz.battery],
        exposes: [e.battery(), e.action(['identify', 'on', 'off', 'toggle'])],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genOnOff']);
        },
        onEvent: legrand.readInitialBatteryState,
    },
    {
        zigbeeModel: [' Dimmer switch w/o neutral\u0000\u0000\u0000\u0000\u0000'],
        model: '067771',
        vendor: 'Legrand',
        // led blink RED when battery is low
        description: 'Wired switch without neutral',
        extend: preset.light_onoff_brightness(),
        fromZigbee: [fz.brightness, fz.identify, fz.on_off],
        toZigbee: [tz.light_onoff_brightness, tz.legrand_settingAlwaysEnableLed, tz.legrand_settingEnableLedIfOn,
            tz.legrand_settingEnableDimmer, tz.legrand_identify],
        meta: {configureKey: 2},
        exposes: [e.light_brightness()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'genLevelCtrl', 'genBinaryInput']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: [' Connected outlet\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'],
        model: '067775',
        vendor: 'Legrand',
        description: 'Power socket with power consumption monitoring',
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off, tz.legrand_settingAlwaysEnableLed, tz.legrand_identify],
        exposes: [e.switch(), e.action(['identify']), e.power(), e.voltage(), e.current()],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: [' Micromodule switch\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'],
        model: '064888',
        vendor: 'Legrand',
        description: 'Wired micromodule switch',
        extend: preset.switch(),
        fromZigbee: [fz.identify, fz.on_off],
        toZigbee: [tz.on_off, tz.legrand_identify],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genBinaryInput']);
        },
    },
    {
        zigbeeModel: [' Master remote SW Home / Away\u0000\u0000'],
        model: '064873',
        vendor: 'Legrand',
        // led blink RED when battery is low
        description: 'Home & away switch / master switch',
        fromZigbee: [fz.legrand_scenes, fz.legrand_master_switch_center, fz.ignore_poll_ctrl, fz.battery],
        exposes: [e.battery(), e.action(['enter', 'leave', 'sleep', 'wakeup', 'center'])],
        toZigbee: [],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genPowerCfg']);
        },
        onEvent: async (type, data, device) => {
            await legrand.readInitialBatteryState(type, data, device);

            if (data.type === 'commandCheckin' && data.cluster === 'genPollCtrl') {
                // TODO current solution is a work around, it would be cleaner to answer to the request
                const endpoint = device.getEndpoint(1);
                const options = {manufacturerCode: 0x1021, disableDefaultResponse: true};
                await endpoint.command('genPollCtrl', 'fastPollStop', {}, options);
            }
        },
    },
    {
        zigbeeModel: [' DIN power consumption module\u0000\u0000', ' DIN power consumption module'],
        model: '412015',
        vendor: 'Legrand',
        description: 'DIN power consumption module',
        fromZigbee: [fz.identify, fz.metering, fz.electrical_measurement, fz.ignore_basic_report, fz.ignore_genOta, fz.legrand_power_alarm],
        toZigbee: [tz.legrand_settingAlwaysEnableLed, tz.legrand_identify, tz.electrical_measurement_power, tz.legrand_powerAlarm],
        exposes: [e.power().withAccess(ea.STATE_GET), exposes.binary('power_alarm_active', ea.STATE, true, false),
            exposes.binary('power_alarm', ea.ALL, true, false).withDescription('Enable/disable the power alarm')],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'genIdentify']);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            // Read configuration values that are not sent periodically as well as current power (activePower).
            await endpoint.read('haElectricalMeasurement', ['activePower', 0xf000, 0xf001, 0xf002]);
        },
    },
    {
        zigbeeModel: ['Remote switch Wake up / Sleep'],
        model: '752189',
        vendor: 'Legrand',
        description: 'Night/day wireless switch',
        fromZigbee: [fz.legrand_scenes, fz.battery, fz.ignore_poll_ctrl, fz.legrand_master_switch_center],
        toZigbee: [],
        exposes: [e.battery(), e.action(['enter', 'leave', 'sleep', 'wakeup', 'center'])],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genPowerCfg']);
        },
    },

    // BTicino (Legrand brand)
    {
        zigbeeModel: [' Light switch with neutral\u0000\u0000\u0000\u0000\u0000'],
        model: 'K4003C/L4003C/N4003C/NT4003C',
        vendor: 'BTicino',
        description: 'Light switch with neutral',
        fromZigbee: [fz.identify, fz.on_off, fz.K4003C_binary_input],
        toZigbee: [tz.on_off, tz.legrand_settingAlwaysEnableLed, tz.legrand_settingEnableLedIfOn, tz.legrand_identify],
        exposes: [e.switch(), e.action(['identify', 'on', 'off'])],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'genBinaryInput']);
        },
    },
    {
        zigbeeModel: [' Dimmer switch with neutral\u0000\u0000\u0000\u0000'],
        model: 'L441C/N4411C/NT4411C',
        vendor: 'BTicino',
        description: 'Dimmer switch with neutral',
        extend: preset.light_onoff_brightness(),
        exposes: [e.light_brightness()],
        fromZigbee: [fz.brightness, fz.identify, fz.on_off],
        toZigbee: [tz.light_onoff_brightness, tz.legrand_settingAlwaysEnableLed, tz.legrand_settingEnableLedIfOn,
            tz.legrand_settingEnableDimmer, tz.legrand_identify],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'genLevelCtrl', 'genBinaryInput']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        // Newer firmwares (e.g. 001f) Does support partial position reporting
        // Old firmware of this device provides only three values: 0, 100 and 50, 50 means an idefinite position between 1 and 99.
        // If you have an old Firmware set no_position_support to true
        // https://github.com/Koenkk/zigbee-herdsman-converters/pull/2214 - 1st very basic support
        zigbeeModel: [' Shutter SW with level control\u0000'],
        model: 'K4027C/L4027C/N4027C/NT4027C',
        vendor: 'BTicino',
        description: 'Shutter SW with level control',
        fromZigbee: [fz.identify, fz.ignore_basic_report, fz.ignore_zclversion_read, fz.bticino_4027C_binary_input_moving,
            fz.cover_position_tilt],
        toZigbee: [tz.bticino_4027C_cover_state, tz.bticino_4027C_cover_position, tz.legrand_identify,
            tz.legrand_settingAlwaysEnableLed],
        exposes: [e.cover_position()],
        meta: {configureKey: 1, coverInverted: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBinaryInput', 'closuresWindowCovering', 'genIdentify']);
        },
    },
    {
        zigbeeModel: ['Bticino Din power consumption module '],
        model: 'F20T60A',
        description: 'DIN power consumption module',
        vendor: 'BTicino',
        extend: preset.switch(),
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement, fz.legrand_device_mode, fz.ignore_basic_report, fz.ignore_genOta],
        toZigbee: [tz.legrand_deviceMode, tz.on_off, tz.legrand_identify, tz.electrical_measurement_power],
        exposes: [exposes.switch().withState('state', true, 'On/off (works only if device is in "switch" mode)'),
            e.power().withAccess(ea.STATE_GET), exposes.enum( 'device_mode', ea.ALL, ['switch', 'auto'])
                .withDescription('switch: allow on/off, auto will use wired action via C1/C2 on contactor for example with HC/HP')],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: ['Power socket Bticino Serie LL '],
        model: 'L4531C',
        vendor: 'BTicino',
        description: 'Power socket with power consumption monitoring',
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off, tz.legrand_settingAlwaysEnableLed, tz.legrand_identify],
        exposes: [e.switch(), e.action(['identify']), e.power(), e.voltage(), e.current()],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
        },
    },

    // Linkind
    {
        zigbeeModel: ['ZBT-CCTLight-D0106', 'ZBT-CCTLight-GLS0108', 'ZBT-CCTLight-GLS0109'],
        model: 'ZL1000100-CCT-US-V1A02',
        vendor: 'Linkind',
        description: 'Zigbee LED 9W A19 bulb, dimmable & tunable',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['ZBT-CCTLight-C4700107', 'ZBT-CCTLight-M3500107'],
        model: 'ZL1000400-CCT-EU-2-V1A02',
        vendor: 'Linkind',
        description: 'Zigbee LED 5.4W C35 bulb E14, dimmable & tunable',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['ZBT-CCTLight-BR300107'],
        model: 'ZL100050004',
        vendor: 'Linkind',
        description: 'Zigbee LED 7.4W BR30 bulb E26, dimmable & tunable',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['ZBT-DIMLight-D0120'],
        model: 'ZL1000701-27-EU-V1A02',
        vendor: 'Linkind',
        description: 'Zigbee A60 filament bulb 6.3W',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['ZBT-DIMLight-A4700003'],
        model: 'ZL1000700-22-EU-V1A02',
        vendor: 'Linkind',
        description: 'Zigbee A60 led filament, dimmable warm light (2200K), E27. 4.2W, 420lm',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['ZB-MotionSensor-D0003'],
        model: 'ZS1100400-IN-V1A02',
        vendor: 'Linkind',
        description: 'PIR motion sensor, wireless motion detector',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['ZB-DoorSensor-D0003'],
        model: 'ZS110050078',
        vendor: 'Linkind',
        description: 'Door/window Sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['ZBT-DIMSwitch-D0001'],
        model: 'ZS232000178',
        vendor: 'Linkind',
        description: '1-key remote control',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.action(['on', 'off', 'brightness_move_up', 'brightness_move_down', 'brightness_stop']), e.battery(), e.battery_low()],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['ZBT-OnOffPlug-D0011', 'ZBT-OnOffPlug-D0001'],
        model: 'ZS190000118',
        vendor: 'Linkind',
        description: 'Control outlet',
        extend: preset.switch(),
        toZigbee: preset.switch().toZigbee.concat([tz.power_on_behavior]),
        fromZigbee: preset.switch().fromZigbee.concat([fz.power_on_behavior]),
        exposes: preset.switch().exposes.concat([exposes.enum('power_on_behavior', ea.ALL, ['off', 'previous', 'on', 'toggle'])
            .withDescription('Controls the behaviour when the device is powered on')]),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ZB-KeyfodGeneric-D0001'],
        model: 'ZS130000178',
        vendor: 'Linkind',
        description: 'Security system key fob',
        fromZigbee: [fz.command_arm, fz.command_panic],
        toZigbee: [],
        exposes: [e.action(['panic', 'disarm', 'arm_partial_zones', 'arm_all_zones'])],
        onEvent: async (type, data, device) => {
            // Since arm command has a response zigbee-herdsman doesn't send a default response.
            // This causes the remote to repeat the arm command, so send a default response here.
            if (data.type === 'commandArm' && data.cluster === 'ssIasAce') {
                await data.endpoint.defaultResponse(0, 0, 1281, data.meta.zclTransactionSequenceNumber);
            }
        },
    },

    // BlitzWolf
    {
        zigbeeModel: ['5j6ifxj'],
        model: 'BW-IS3',
        vendor: 'BlitzWolf',
        description: 'Rechargeable Zigbee PIR motion sensor',
        fromZigbee: [fz.blitzwolf_occupancy_with_timeout],
        toZigbee: [],
        exposes: [e.occupancy()],
    },
    {

        fingerprint: [{modelID: 'TS0003', manufacturerName: '_TYZB01_aneiicmq'}],
        model: 'BW-SS7_1gang',
        vendor: 'BlitzWolf',
        description: 'Zigbee 3.0 smart light switch module 1 gang',
        extend: preset.switch(),
        toZigbee: [tz.TYZB01_on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0003', manufacturerName: '_TYZB01_digziiav'}],
        model: 'BW-SS7_2gang',
        vendor: 'BlitzWolf',
        description: 'Zigbee 3.0 smart light switch module 2 gang',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        toZigbee: [tz.TYZB01_on_off],
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },

    // Kwikset
    {
        zigbeeModel: ['SMARTCODE_CONVERT_GEN1'],
        model: '66492-001',
        vendor: 'Kwikset',
        description: 'Home connect smart lock conversion kit',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.lock],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery()],
    },
    {
        zigbeeModel: ['SMARTCODE_DEADBOLT_10_L'],
        model: '99140-002',
        vendor: 'Kwikset',
        description: 'SmartCode traditional electronic deadbolt',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.lock],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery()],
    },
    {
        zigbeeModel: ['SMARTCODE_DEADBOLT_5'],
        model: '99100-045',
        vendor: 'Kwikset',
        description: '910 SmartCode traditional electronic deadbolt',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery, fz.lock_programming_event, fz.lock_pin_code_response],
        toZigbee: [tz.lock, tz.pincode_lock],
        meta: {configureKey: 4, pinCodeCount: 30},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            console.log(device);
            console.log(endpoint.clusters);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery()],
    },
    {
        zigbeeModel: ['SMARTCODE_DEADBOLT_5_L'],
        model: '99100-006',
        vendor: 'Kwikset',
        description: '910 SmartCode traditional electronic deadbolt',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.lock],
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery()],
    },

    // Schlage
    {
        zigbeeModel: ['BE468'],
        model: 'BE468',
        vendor: 'Schlage',
        description: 'Connect smart deadbolt',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.lock],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.endpoints[0];
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery()],
    },

    // HORNBACH
    {
        zigbeeModel: ['VIYU-A60-806-RGBW-10011725'],
        model: '10011725',
        vendor: 'HORNBACH',
        description: 'FLAIR Viyu Smart LED bulb RGB E27',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['VIYU_C35_470_RGBW_10297667'],
        model: '10297667',
        vendor: 'HORNBACH',
        description: 'FLAIR Viyu Smart LED bulb RGB E14',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['VIYU-A60-806-CCT-10011723'],
        model: '10011723',
        vendor: 'HORNBACH',
        description: 'FLAIR Viyu Smart LED bulb CCT E27',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['VIYU-C35-470-CCT-10011722'],
        model: '10011722',
        vendor: 'HORNBACH',
        description: 'FLAIR Viyu Smart LED candle CCT E14',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['VIYU_GU10_350_RGBW_10297666'],
        model: '10297666',
        vendor: 'HORNBACH',
        description: 'FLAIR Viyu Smart GU10 RGBW lamp',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['VIYU-GU10-350-CCT-10011724'],
        model: '10011724',
        vendor: 'HORNBACH',
        description: 'FLAIR Viyu Smart GU10 CCT lamp',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['VIYU_A60_470_FI_D_CCT_10297665'],
        model: '10297665',
        vendor: 'HORNBACH',
        description: 'FLAIR Viyu Smart LED bulb CCT E27 filament',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [250, 454]}),
    },

    // LifeControl
    {
        zigbeeModel: ['Leak_Sensor'],
        model: 'MCLH-07',
        vendor: 'LifeControl',
        description: 'Water leak switch',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['Door_Sensor'],
        model: 'MCLH-04',
        vendor: 'LifeControl',
        description: 'Door sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['vivi ZLight'],
        model: 'MCLH-02',
        vendor: 'LifeControl',
        description: 'RGB LED lamp',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['RICI01'],
        model: 'MCLH-03',
        vendor: 'LifeControl',
        description: 'Power plug',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
        },
        onEvent: async (type, data, device) => {
            // This device doesn't support reporting correctly.
            // https://github.com/Koenkk/zigbee-herdsman-converters/pull/1270
            const endpoint = device.getEndpoint(1);
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'interval'));
                globalStore.clearValue(device, 'interval');
            } else if (!globalStore.hasValue(device, 'interval')) {
                const interval = setInterval(async () => {
                    try {
                        await endpoint.read('haElectricalMeasurement', ['rmsVoltage', 'rmsCurrent', 'activePower']);
                    } catch (error) {
                        // Do nothing
                    }
                }, 10*1000); // Every 10 seconds
                globalStore.putValue(device, 'interval', interval);
            }
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
    },
    {
        zigbeeModel: ['Motion_Sensor'],
        model: 'MCLH-05',
        vendor: 'LifeControl',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {dontDividePercentage: true}},
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['VOC_Sensor'],
        model: 'MCLH-08',
        vendor: 'LifeControl',
        description: 'Air sensor',
        fromZigbee: [fz.lifecontrolVoc],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.voc(), e.eco2()],
    },

    // Develco
    {
        zigbeeModel: ['SPLZB-131'],
        model: 'SPLZB-131',
        vendor: 'Develco',
        description: 'Power plug',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy()],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ['SPLZB-132'],
        model: 'SPLZB-132',
        vendor: 'Develco',
        description: 'Power plug',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.device_temperature],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.device_temperature()],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering', 'genDeviceTempCfg']);
            await reporting.onOff(endpoint);
            await reporting.deviceTemperature(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint, {change: 10}); // Power reports with every 10W change
            await reporting.rmsCurrent(endpoint, {change: 20}); // Current reports with every 20mA change
            await reporting.rmsVoltage(endpoint, {min: repInterval.MINUTES_5, change: 400}); // Limit reports to every 5m, or 4V
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {change: [0, 20]}); // Limit reports to once every 5m, or 0.02kWh
            await reporting.instantaneousDemand(endpoint, {min: repInterval.MINUTES_5, change: 10});
        },
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ['SPLZB-134'],
        model: 'SPLZB-134',
        vendor: 'Develco',
        description: 'Power plug (type G)',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.device_temperature],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.device_temperature()],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering', 'genDeviceTempCfg']);
            await reporting.onOff(endpoint);
            await reporting.deviceTemperature(endpoint, {change: 2}); // Device temperature reports with 2 degree change
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint, {change: 10}); // Power reports with every 10W change
            await reporting.rmsCurrent(endpoint, {change: 20}); // Current reports with every 20mA change
            await reporting.rmsVoltage(endpoint, {min: repInterval.MINUTES_5, change: 400}); // Limit reports to every 5m, or 4V
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {change: [0, 20]}); // Limit reports to once every 5m, or 0.02kWh
            await reporting.instantaneousDemand(endpoint, {min: repInterval.MINUTES_5, change: 10});
        },
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ['SMRZB-143'],
        model: 'SMRZB-143',
        vendor: 'Develco',
        description: 'Smart cable',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.device_temperature],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.device_temperature()],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering', 'genDeviceTempCfg']);
            await reporting.onOff(endpoint);
            await reporting.deviceTemperature(endpoint, {change: 2}); // Device temperature reports with 2 degree change
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint, {change: 10}); // Power reports with every 10W change
            await reporting.rmsCurrent(endpoint, {change: 20}); // Current reports with every 20mA change
            await reporting.rmsVoltage(endpoint, {min: repInterval.MINUTES_5, change: 400}); // Limit reports to every 5m, or 4V
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {change: [0, 20]}); // Limit reports to once every 5m, or 0.02kWh
            await reporting.instantaneousDemand(endpoint, {min: repInterval.MINUTES_5, change: 10});
        },
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ['EMIZB-132'],
        model: 'EMIZB-132',
        vendor: 'Develco',
        description: 'Wattle AMS HAN power-meter sensor',
        fromZigbee: [fz.metering, fz.electrical_measurement],
        toZigbee: [tz.EMIZB_132_mode],
        meta: {configureKey: 9},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering']);

            try {
                // Some don't support these attributes
                // https://github.com/Koenkk/zigbee-herdsman-converters/issues/974#issuecomment-621465038
                await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
                await reporting.rmsVoltage(endpoint);
                await reporting.rmsCurrent(endpoint);
                await reporting.activePower(endpoint);
            } catch (e) {
                e;
            }

            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
            await reporting.currentSummDelivered(endpoint);
            await reporting.currentSummReceived(endpoint);
        },
        exposes: [e.power(), e.energy(), e.current(), e.voltage(), e.current_phase_b(), e.voltage_phase_b(), e.current_phase_c(),
            e.voltage_phase_c()],
    },
    {
        zigbeeModel: ['SMSZB-120'],
        model: 'SMSZB-120',
        vendor: 'Develco',
        description: 'Smoke detector with siren',
        fromZigbee: [fz.temperature, fz.battery, fz.ias_smoke_alarm_1, fz.ignore_basic_report, fz.ignore_genOta],
        toZigbee: [tz.warning],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(35);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'ssIasZone', 'genBasic']);
            await reporting.batteryVoltage(endpoint);
            const endpoint2 = device.getEndpoint(38);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.temperature(endpoint2);
        },
        endpoint: (device) => {
            return {default: 35};
        },
        exposes: [e.temperature(), e.battery(), e.smoke(), e.battery_low(), e.tamper(), e.warning()],
    },
    {
        zigbeeModel: ['HESZB-120'],
        model: 'HESZB-120',
        vendor: 'Develco',
        description: 'Fire detector with siren',
        fromZigbee: [fz.temperature, fz.battery, fz.ias_smoke_alarm_1, fz.ignore_basic_report, fz.ignore_genOta],
        toZigbee: [tz.warning],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(35);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'ssIasZone', 'genBasic']);
            await reporting.batteryVoltage(endpoint);
            const endpoint2 = device.getEndpoint(38);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.temperature(endpoint2);
        },
        endpoint: (device) => {
            return {default: 35};
        },
        exposes: [e.temperature(), e.battery(), e.smoke(), e.battery_low(), e.tamper(), e.warning()],
    },
    {
        zigbeeModel: ['MOSZB-130'],
        model: 'MOSZB-130',
        vendor: 'Develco',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['WISZB-120'],
        model: 'WISZB-120',
        vendor: 'Develco',
        description: 'Window sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature()],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(38);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.temperature(endpoint);
        },
    },
    {
        zigbeeModel: ['WISZB-121'],
        model: 'WISZB-121',
        vendor: 'Develco',
        description: 'Window sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low()],
    },
    {
        zigbeeModel: ['MOSZB-140'],
        model: 'MOSZB-140',
        vendor: 'Develco',
        description: 'Motion sensor',
        fromZigbee: [fz.temperature, fz.illuminance, fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.temperature(), e.illuminance_lux()],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(38);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.temperature(endpoint1);
            const endpoint2 = device.getEndpoint(39);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msIlluminanceMeasurement']);
            await reporting.illuminance(endpoint2);
        },
    },
    {
        zigbeeModel: ['MOSZB-141'],
        model: 'MOSZB-141',
        vendor: 'Develco',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low()],
    },
    {
        zigbeeModel: ['HMSZB-110'],
        model: 'HMSZB-110',
        vendor: 'Develco',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity()],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(38);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['ZHEMI101'],
        model: 'ZHEMI101',
        vendor: 'Develco',
        description: 'Energy meter',
        fromZigbee: [fz.metering],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.instantaneousDemand(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
        },
        exposes: [e.power(), e.energy()],
    },
    {
        zigbeeModel: ['SMRZB-332'],
        model: 'SMRZB-332',
        vendor: 'Develco',
        description: 'Smart relay DIN',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        exposes: [e.power(), e.energy(), e.switch()],
        endpoint: (device) => {
            return {'default': 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.instantaneousDemand(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
        },
    },

    // Aurora Lighting
    {
        zigbeeModel: ['TWGU10Bulb50AU'],
        model: 'AU-A1GUZBCX5',
        vendor: 'Aurora Lighting',
        description: 'AOne 5.4W smart tuneable GU10 lamp',
        extend: preset.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['FWG125Bulb50AU'],
        model: 'AU-A1VG125Z5E/19',
        vendor: 'Aurora Lighting',
        description: 'AOne 4W smart dimmable G125 lamp 1900K',
        meta: {turnsOffAtBrightness1: true},
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['FWGU10Bulb50AU', 'FWGU10Bulb01UK'],
        model: 'AU-A1GUZB5/30',
        vendor: 'Aurora Lighting',
        description: 'AOne 4.8W smart dimmable GU10 lamp 3000K',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['FWA60Bulb50AU'],
        model: 'AU-A1VGSZ5E/19',
        vendor: 'Aurora Lighting',
        description: 'AOne 4W smart dimmable Vintage GLS lamp 1900K',
        extend: preset.light_onoff_brightness({disableEffect: true}),
    },
    {
        zigbeeModel: ['RGBGU10Bulb50AU'],
        model: 'AU-A1GUZBRGBW',
        vendor: 'Aurora Lighting',
        description: 'AOne 5.6w smart RGBW tuneable GU10 lamp',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['RGBBulb01UK', 'RGBBulb02UK'],
        model: 'AU-A1GSZ9RGBW_HV-GSCXZB269K',
        vendor: 'Aurora Lighting',
        description: 'AOne 9.5W smart RGBW GLS E27/B22',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['Remote50AU'],
        model: 'AU-A1ZBRC',
        vendor: 'Aurora Lighting',
        description: 'AOne smart remote',
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step],
        toZigbee: [],
        exposes: [e.battery(), e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down'])],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genPowerCfg']);
        },
    },
    {
        zigbeeModel: ['MotionSensor51AU'],
        model: 'AU-A1ZBPIRS',
        vendor: 'Aurora Lighting',
        description: 'AOne PIR sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.illuminance],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(39);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msIlluminanceMeasurement']);
            await reporting.illuminance(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.illuminance(), e.illuminance_lux()],
    },
    {
        zigbeeModel: ['SingleSocket50AU'],
        model: 'AU-A1ZBPIAB',
        vendor: 'Aurora Lighting',
        description: 'Power plug Zigbee EU',
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement],
        exposes: [e.switch(), e.power(), e.voltage(), e.current()],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['WindowSensor51AU'],
        model: 'AU-A1ZBDWS',
        vendor: 'Aurora Lighting',
        description: 'Magnetic door & window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['WallDimmerMaster'],
        model: 'AU-A1ZB2WDM',
        vendor: 'Aurora Lighting',
        description: 'AOne 250W smart rotary dimmer module',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genLevelCtrl', 'genOnOff']);
        },
    },
    {
        zigbeeModel: ['DoubleSocket50AU'],
        model: 'AU-A1ZBDSS',
        vendor: 'Aurora Lighting',
        description: 'Double smart socket UK',
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement],
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'),
            e.power().withEndpoint('left'), e.power().withEndpoint('right')],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1, multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint2);
        },
    },
    {
        zigbeeModel: ['SmartPlug51AU'],
        model: 'AU-A1ZBPIA',
        vendor: 'Aurora Lighting',
        description: 'Aurora smart plug',
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement, fz.metering, fz.device_temperature],
        exposes: [e.switch(), e.power(), e.voltage(), e.current(), e.device_temperature(), e.energy()],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        endpoint: (device) => {
            return {'default': 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genIdentify', 'haElectricalMeasurement', 'seMetering',
                'genDeviceTempCfg']);

            await reporting.onOff(endpoint);
            await reporting.deviceTemperature(endpoint);

            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            // Report 5v voltage change, 5a current, 5 watt power change to reduce the noise
            await reporting.rmsVoltage(endpoint, {change: 500});
            await reporting.rmsCurrent(endpoint, {change: 500});
            await reporting.activePower(endpoint, {change: 5});

            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint, {change: 500});
        },
    },
    {
        zigbeeModel: ['1GBatteryDimmer50AU'],
        model: 'AU-A1ZBR1GW',
        vendor: 'Aurora Lighting',
        description: 'AOne one gang wireless battery rotary dimmer',
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step, fz.command_step_color_temperature],
        toZigbee: [],
        exposes: [e.battery(), e.action([
            'on', 'off', 'brightness_step_up', 'brightness_step_down', 'color_temperature_step_up', 'color_temperature_step_down'])],
        meta: {configureKey: 1, battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint,
                ['genIdentify', 'genOnOff', 'genLevelCtrl', 'lightingColorCtrl', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint1);
        },
    },
    {
        zigbeeModel: ['2GBatteryDimmer50AU'],
        model: 'AU-A1ZBR2GW',
        vendor: 'Aurora Lighting',
        description: 'AOne two gang wireless battery rotary dimmer',
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step, fz.command_step_color_temperature],
        toZigbee: [],
        exposes: [e.battery(), e.action([
            'on', 'off', 'brightness_step_up', 'brightness_step_down', 'color_temperature_step_up', 'color_temperature_step_down'])],
        meta: {multiEndpoint: true, configureKey: 1, battery: {voltageToPercentage: '3V_2100'}},
        endpoint: (device) => {
            return {'right': 1, 'left': 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint,
                ['genIdentify', 'genOnOff', 'genLevelCtrl', 'lightingColorCtrl', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'genLevelCtrl', 'lightingColorCtrl']);
        },
    },

    // Wally
    {
        zigbeeModel: ['MultiSensor'],
        model: 'U02I007C.01',
        vendor: 'Wally',
        description: 'WallyHome multi-sensor',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.temperature, fz.humidity, fz.U02I007C01_contact,
            fz.U02I007C01_water_leak],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.action(['on', 'off']), e.contact(), e.water_leak()],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genPowerCfg', 'genOnOff', 'msTemperatureMeasurement', 'msRelativeHumidity'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
        },
    },

    // Smartenit
    {
        zigbeeModel: ['ZBMLC30'],
        model: '4040B',
        vendor: 'Smartenit',
        description: 'Wireless metering 30A dual-load switch/controller',
        fromZigbee: [fz.on_off, fz.metering, fz.ignore_light_brightness_report],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff', 'seMetering']);

            // Device doesn't respond to divisor read, set it here
            // https://github.com/Koenkk/zigbee-herdsman-converters/pull/1096
            endpoint2.saveClusterAttributeKeyValue('seMetering', {
                divisor: 100000,
                multiplier: 1,
            });
        },
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.power(), e.energy()],
    },
    {
        zigbeeModel: ['ZBHT-1'],
        model: 'ZBHT-1',
        vendor: 'Smartenit',
        description: 'Temperature & humidity sensor ',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity()],
    },

    // Siterwell
    {
        zigbeeModel: ['ivfvd7h', 'eaxp72v\u0000', 'kfvq6avy\u0000', 'fvq6avy\u0000', 'fvq6avy'],
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_zivfvd7h'}, {modelId: 'TS0601', manufacturerName: '_TZE200_kfvq6avy'}],
        model: 'GS361A-H04',
        vendor: 'Siterwell',
        description: 'Radiator valve with thermostat',
        fromZigbee: [fz.tuya_thermostat, fz.ignore_basic_report],
        meta: {tuyaThermostatSystemMode: tuya.thermostatSystemModes4, tuyaThermostatPreset: tuya.thermostatPresets,
            tuyaThermostatPresetToSystemMode: tuya.thermostatSystemModes4},
        toZigbee: [tz.tuya_thermostat_child_lock, tz.siterwell_thermostat_window_detection, tz.tuya_thermostat_valve_detection,
            tz.tuya_thermostat_current_heating_setpoint, tz.tuya_thermostat_system_mode, tz.tuya_thermostat_auto_lock,
            tz.tuya_thermostat_calibration, tz.tuya_thermostat_min_temp, tz.tuya_thermostat_max_temp, tz.tuya_thermostat_boost_time,
            tz.tuya_thermostat_comfort_temp, tz.tuya_thermostat_eco_temp, tz.tuya_thermostat_force, tz.tuya_thermostat_preset],
        whiteLabel: [{vendor: 'Essentials', description: 'Smart home heizkörperthermostat premium', model: '120112'},
            {vendor: 'TuYa', description: 'Głowica termostatyczna', model: 'GTZ02'},
            {vendor: 'Revolt', description: 'Thermostatic Radiator Valve Controller', model: 'NX-4911'}],
        exposes: [e.child_lock(), e.window_detection(), e.battery(), e.valve_detection(), e.position(), exposes.climate()
            .withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET).withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'auto', 'heat'], ea.STATE_SET)
            .withRunningState(['idle', 'heat'], ea.STATE)],
    },

    // Green Power
    {
        zigbeeModel: ['GreenPower_2'],
        model: 'GreenPower_On_Off_Switch',
        vendor: 'GreenPower',
        description: 'On/off switch',
        fromZigbee: [fz.greenpower_on_off_switch],
        exposes: [e.action([
            'identify', 'recall_scene_0', 'recall_scene_1', 'recall_scene_2', 'recall_scene_3', 'recall_scene_4', 'recall_scene_5',
            'recall_scene_6', 'recall_scene_7', 'store_scene_0', 'store_scene_1', 'store_scene_2', 'store_scene_3', 'store_scene_4',
            'store_scene_5', 'store_scene_6', 'store_scene_7', 'off', 'on', 'toggle', 'release', 'press_1_of_1', 'release_1_of_1',
            'press_1_of_2', 'release_1_of_2', 'press_2_of_2', 'release_2_of_2', 'short_press_1_of_1', 'short_press_1_of_2',
            'short_press_2_of_1'])],
        toZigbee: [],
        whiteLabel: [{vendor: 'Philips', description: 'Hue Tap', model: '8718696743133'},
            {vendor: 'Niko', description: 'Friends of Hue switch', model: '91004'}],
    },
    {
        zigbeeModel: ['GreenPower_7'],
        model: 'GreenPower_7',
        vendor: 'GreenPower',
        description: 'device 7',
        fromZigbee: [fz.greenpower_7],
        toZigbee: [],
        exposes: [e.action(['*'])],
        whiteLabel: [{vendor: 'EnOcean', description: 'Easyfit 1 or 2 gang switch', model: 'EWSxZG'}],
    },

    // EasyAccess
    {
        zigbeeModel: ['EasyCode903G2.1'],
        model: 'EasyCode903G2.1',
        vendor: 'EasyAccess',
        description: 'EasyFinger V2',
        fromZigbee: [fz.lock, fz.easycode_action, fz.battery],
        toZigbee: [tz.lock, tz.easycode_auto_relock, tz.lock_sound_volume],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery(), e.sound_volume(),
            e.action(['zigbee_unlock', 'lock', 'rfid_unlock', 'keypad_unlock']),
            exposes.binary('auto_relock', ea.STATE_SET, true, false).withDescription('Auto relock after 7 seconds.')],
    },

    // Schwaiger
    {
        zigbeeModel: ['SPW35Z-D0'],
        model: 'ZHS-15',
        vendor: 'Schwaiger',
        description: 'Power socket on/off with power consumption monitoring',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
    },
    {
        zigbeeModel: ['ZBT-RGBWLight-GLS0844'],
        model: 'HAL300',
        vendor: 'Schwaiger',
        description: 'Tint LED bulb E27 806 lumen, dimmable, color, white 1800-6500K',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['ZBT-DIMLight-Candle0800'],
        model: 'HAL600',
        vendor: 'Schwaiger',
        description: 'LED candle bulb E14 470 lumen, dimmable, color, white 2700K',
        extend: preset.light_onoff_brightness(),
    },

    // Zipato
    {
        zigbeeModel: ['ZHA-ColorLight'],
        model: 'rgbw2.zbee27',
        vendor: 'Zipato',
        description: 'RGBW LED bulb with dimmer',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },

    // Viessmann
    {
        zigbeeModel: ['7637434'],
        model: 'ZK03840',
        vendor: 'Viessmann',
        description: 'ViCare radiator thermostat valve',
        fromZigbee: [fz.legacy.viessmann_thermostat_att_report, fz.battery, fz.legacy.hvac_user_interface],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_control_sequence_of_operation,
            tz.thermostat_system_mode, tz.thermostat_keypad_lockout, tz.viessmann_window_open, tz.viessmann_window_open_force,
            tz.viessmann_assembly_mode,
        ],
        exposes: [
            exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 1)
                .withLocalTemperature().withSystemMode(['heat', 'sleep']),
            exposes.binary('window_open', ea.STATE_GET, true, false)
                .withDescription('Detected by sudden temperature drop or set manually.'),
            exposes.binary('window_open_force', ea.ALL, true, false)
                .withDescription('Manually set window_open, ~1 minute to take affect.'),
            e.keypad_lockout(),
        ],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: 0x1221};
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'genPowerCfg', 'genIdentify', 'genTime', 'hvacThermostat']);

            // standard ZCL attributes
            await reporting.batteryPercentageRemaining(endpoint, {min: 60, max: 43200, change: 1});
            await reporting.thermostatTemperature(endpoint, {min: 90, max: 900, change: 10});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 0, max: 65534, change: 1});
            await reporting.thermostatPIHeatingDemand(endpoint, {min: 60, max: 3600, change: 1});

            // manufacturer attributes
            await endpoint.configureReporting('hvacThermostat', [{attribute: 'viessmannCustom0', minimumReportInterval: 60,
                maximumReportInterval: 3600}], options);

            // read window_open_force, we don't need reporting as it cannot be set physically on the device
            await endpoint.read('hvacThermostat', ['viessmannWindowOpenForce'], options);

            // read keypadLockout, we don't need reporting as it cannot be set physically on the device
            await endpoint.read('hvacUserInterfaceCfg', ['keypadLockout']);
        },
    },

    // Waxman
    {
        zigbeeModel: ['leakSMART Water Sensor V2'],
        model: '8840100H',
        vendor: 'Waxman',
        description: 'leakSMART water sensor v2',
        fromZigbee: [fz._8840100H_water_leak_alarm, fz.temperature, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.water_leak()],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'haApplianceEventsAlerts', 'msTemperatureMeasurement']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.temperature(endpoint);
        },
    },

    // eZEX
    {
        zigbeeModel: ['E220-KR3N0Z0-HA'],
        model: 'ECW-100-A03',
        vendor: 'eZEX',
        description: 'Zigbee switch 3 gang',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('center'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {top: 1, center: 2, bottom: 3};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
    },

    // EchoStar
    {
        zigbeeModel: ['   Bell'],
        model: 'SAGE206612',
        vendor: 'EchoStar',
        description: 'SAGE by Hughes doorbell sensor',
        fromZigbee: [fz.SAGE206612_state, fz.battery],
        exposes: [e.battery(), e.action(['bell1', 'bell2'])],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
    },
    {
        zigbeeModel: [' Switch'],
        model: 'SAGE206611',
        vendor: 'Echostar',
        description: 'SAGE by Hughes single gang light switch',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery],
        exposes: [e.battery(), e.action(['on', 'off'])],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(18);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },

    // Plugwise
    {
        zigbeeModel: ['160-01'],
        model: '160-01',
        vendor: 'Plugwise',
        description: 'Plug power socket on/off with power consumption monitoring',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },

    // KMPCIL
    {
        zigbeeModel: ['RES005'],
        model: 'KMPCIL_RES005',
        vendor: 'KMPCIL',
        description: 'Environment sensor',
        exposes: [e.battery(), e.temperature(), e.humidity(), e.pressure(), e.illuminance(), e.illuminance_lux(), e.occupancy(),
            e.switch()],
        fromZigbee: [fz.battery, fz.temperature, fz.humidity, fz.pressure, fz.illuminance, fz.kmpcil_res005_occupancy,
            fz.kmpcil_res005_on_off],
        toZigbee: [tz.kmpcil_res005_on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(8);
            const binds = ['genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement',
                'msIlluminanceMeasurement', 'genBinaryInput', 'genBinaryOutput'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
            const payloadBattery = [{
                attribute: 'batteryPercentageRemaining', minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 1}];
            await endpoint.configureReporting('genPowerCfg', payloadBattery);
            const payload = [{
                attribute: 'measuredValue', minimumReportInterval: 5, maximumReportInterval: repInterval.HOUR, reportableChange: 200}];
            await endpoint.configureReporting('msIlluminanceMeasurement', payload);
            const payloadPressure = [{
                // 0 = measuredValue, override dataType from int16 to uint16
                // https://github.com/Koenkk/zigbee-herdsman/pull/191/files?file-filters%5B%5D=.ts#r456569398
                attribute: {ID: 0, type: 33}, minimumReportInterval: 2, maximumReportInterval: repInterval.HOUR, reportableChange: 3}];
            await endpoint.configureReporting('msPressureMeasurement', payloadPressure);
            const options = {disableDefaultResponse: true};
            await endpoint.write('genBinaryInput', {0x0051: {value: 0x01, type: 0x10}}, options);
            await endpoint.write('genBinaryInput', {0x0101: {value: 25, type: 0x23}}, options);
            const payloadBinaryInput = [{
                attribute: 'presentValue', minimumReportInterval: 0, maximumReportInterval: 30, reportableChange: 1}];
            await endpoint.configureReporting('genBinaryInput', payloadBinaryInput);
            await endpoint.write('genBinaryOutput', {0x0051: {value: 0x01, type: 0x10}}, options);
            const payloadBinaryOutput = [{
                attribute: 'presentValue', minimumReportInterval: 0, maximumReportInterval: 30, reportableChange: 1}];
            await endpoint.configureReporting('genBinaryOutput', payloadBinaryOutput);
        },
    },

    // Enbrighten
    {
        zigbeeModel: ['43076'],
        model: '43076',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart switch',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['43080'],
        model: '43080',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart dimmer',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['43102'],
        model: '43102',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall outlet',
        extend: preset.switch(),
    },
    {
        zigbeeModel: ['43100'],
        model: '43100',
        vendor: 'Enbrighten',
        description: 'Plug-in Zigbee outdoor smart switch',
        extend: preset.switch(),
        fromZigbee: [fz.command_on_state, fz.command_off_state],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
        },
    },
    {
        zigbeeModel: ['43082'],
        model: '43082',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart dimmer',
        extend: preset.light_onoff_brightness({disableEffect: true}),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['43084'],
        model: '43084',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart switch',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['43090'],
        model: '43090',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart dimmer',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },

    // Niko
    {
        zigbeeModel: ['Connected socket outlet'],
        model: '170-33505',
        vendor: 'Niko',
        description: 'Connected socket outlet',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off, tz.electrical_measurement_power],
        meta: {configureKey: 5},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint);
        },
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.current(), e.voltage()],
    },
    {
        zigbeeModel: ['Smart plug Zigbee PE'],
        model: '552-80699',
        vendor: 'Niko',
        description: 'Smart plug with earthing pin',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior, tz.electrical_measurement_power],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            // only activePower seems to be support, although compliance document states otherwise
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.activePower(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 60, change: 1});
        },
        exposes: [
            e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(),
            exposes.enum('power_on_behavior', ea.ALL, ['off', 'previous', 'on'])
                .withDescription('Controls the behaviour when the device is powered on'),
        ],
    },

    // QMotion products - http://www.qmotionshades.com/
    {
        zigbeeModel: ['Rollershade QdR'],
        model: 'QZR-ZIG2400',
        vendor: 'Qmotion',
        description: '5 channel remote',
        fromZigbee: [fz.identify, fz.cover_position_tilt],
        exposes: [e.action(['identify']), exposes.numeric('position', ea.STATE)],
        toZigbee: [],
    },
    {
        zigbeeModel: ['Honeycomb Internal Battery', 'Rollershade Internal Battery'],
        model: 'HDM40PV620',
        vendor: 'Qmotion',
        description: 'Motorized roller blind',
        fromZigbee: [fz.identify],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position()],
    },

    // Titan Products
    {
        zigbeeModel: ['TPZRCO2HT-Z3'],
        model: 'TPZRCO2HT-Z3',
        vendor: 'Titan Products',
        description: 'Room CO2, humidity & temperature sensor',
        fromZigbee: [fz.battery, fz.humidity, fz.temperature, fz.co2],
        exposes: [e.battery(), e.humidity(), e.temperature(), e.co2()],
        toZigbee: [],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'msTemperatureMeasurement', 'msCO2']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['msRelativeHumidity']);
        },
    },

    // Envilar
    {
        zigbeeModel: ['ZG102-BOX-UNIDIM'],
        model: 'ZG102-BOX-UNIDIM',
        vendor: 'Envilar',
        description: 'ZigBee AC phase-cut dimmer',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },

    // OWON
    {
        zigbeeModel: ['WSP404'],
        model: 'WSP404',
        vendor: 'OWON',
        description: 'Smart plug',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint, {min: 5, max: repInterval.MINUTES_5, change: 2});
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },

    // LeTV
    {
        zigbeeModel: ['qlwz.letv8key.10'],
        model: 'LeTV.8KEY',
        vendor: 'LeTV',
        description: '8key switch',
        fromZigbee: [fz.qlwz_letv8key_switch],
        exposes: [e.action(['hold_up', 'single_up', 'double_up', 'tripple_up', 'hold_down', 'single_down', 'double_down', 'tripple_down',
            'hold_left', 'single_left', 'double_left', 'tripple_left', 'hold_right', 'single_right', 'double_right', 'tripple_right',
            'hold_center', 'single_center', 'double_center', 'tripple_center', 'hold_back', 'single_back', 'double_back', 'tripple_back',
            'hold_play', 'single_play', 'double_play', 'tripple_play', 'hold_voice', 'single_voice', 'double_voice', 'tripple_voice'])],
        toZigbee: [],
    },

    // CY-LIGHTING
    {
        zigbeeModel: ['DM A60F'],
        model: 'DM A60F',
        vendor: 'CY-LIGHTING',
        description: '6W smart dimmable E27 lamp 2700K',
        extend: preset.light_onoff_brightness(),
    },

    // LED Trading
    {
        zigbeeModel: ['HK-LN-DIM-A'],
        model: 'HK-LN-DIM-A',
        vendor: 'LED Trading',
        description: 'ZigBee AC phase-cut dimmer',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },

    // FireAngel
    {
        zigbeeModel: ['Alarm_SD_Device'],
        model: 'W2-Module',
        description: 'Carbon monoxide sensor',
        vendor: 'FireAngel',
        fromZigbee: [fz.W2_module_carbon_monoxide, fz.battery],
        toZigbee: [],
        exposes: [e.carbon_monoxide(), e.battery()],
    },

    // KlikAanKlikUit
    {
        zigbeeModel: ['Socket Switch'],
        model: 'ZCC-3500',
        vendor: 'KlikAanKlikUit',
        description: 'Zigbee socket switch',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },

    // Hommyn
    {
        zigbeeModel: ['5e56b9c85b6e4fcaaaad3c1319e16c57'],
        model: 'MS-20-Z',
        vendor: 'Hommyn',
        description: 'Occupancy sensor',
        fromZigbee: [fz.battery, fz.ias_occupancy_alarm_1_with_timeout],
        toZigbee: [],
        exposes: [e.battery(), e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['2f077707a13f4120846e0775df7e2efe'],
        model: 'WS-20-Z',
        vendor: 'Hommyn',
        description: 'Water leakage sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
    },

    // Lidl
    {
        fingerprint: [
            {manufacturerName: '_TZ3000_kdi2o9m6'}, // EU
            {modelID: 'TS011F', manufacturerName: '_TZ3000_plyvnuf5'}, // CH
            {modelID: 'TS011F', manufacturerName: '_TZ3000_wamqdr3f'}, // FR
            {modelID: 'TS011F', manufacturerName: '_TZ3000_00mk2xzy'}, // BS
            {modelID: 'TS011F', manufacturerName: '_TZ3000_upjrsxh1'}, // DK
            {manufacturerName: '_TZ3000_00mk2xzy'}, // BS
        ],
        model: 'HG06337',
        vendor: 'Lidl',
        description: 'Silvercrest smart plug (EU, CH, FR, BS, DK)',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0211', manufacturerName: '_TZ1800_ladpngdx'}],
        model: 'HG06668',
        vendor: 'Lidl',
        description: 'Silvercrest smart wireless door bell',
        fromZigbee: [fz.battery, fz.tuya_doorbell_button, fz.ignore_basic_report],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.battery(), e.action(['pressed']), e.battery_low(), e.tamper()],
    },
    {
        fingerprint: [{modelID: 'TY0202', manufacturerName: '_TZ1800_fcdjzz3s'}],
        model: 'HG06335',
        vendor: 'Lidl',
        description: 'Silvercrest smart motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TY0203', manufacturerName: '_TZ1800_ejwkn2h2'}],
        model: 'HG06336',
        vendor: 'Lidl',
        description: 'Silvercrest smart window and door sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.ias_contact_alarm_1_report, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
        },
    },
    {
        fingerprint: [{modelID: 'TS1001', manufacturerName: '_TYZB01_bngwdjsr'}],
        model: 'FB20-002',
        vendor: 'Lidl',
        description: 'Livarno Lux switch and dimming light remote control',
        exposes: [e.action(['on', 'off', 'brightness_stop', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up',
            'brightness_move_down'])],
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop],
        toZigbee: [],
    },
    {
        fingerprint: [
            {modelID: 'TS011F', manufacturerName: '_TZ3000_wzauvbcs'}, // EU
            {modelID: 'TS011F', manufacturerName: '_TZ3000_1obwwnmq'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_4uf3d0ax'}, // FR
            {modelID: 'TS011F', manufacturerName: '_TZ3000_vzopcetz'}, // CZ
            {modelID: 'TS011F', manufacturerName: '_TZ3000_vmpbygs5'}, // BS
        ],
        model: 'HG06338',
        vendor: 'Lidl',
        description: 'Silvercrest 3 gang switch, with 4 USB (EU, FR, CZ, BS)',
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3')],
        extend: preset.switch(),
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            for (const ID of [1, 2, 3]) {
                await reporting.bind(device.getEndpoint(ID), coordinatorEndpoint, ['genOnOff']);
            }
        },
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3};
        },
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_riwp3k79'}, {manufacturerName: '_TZ3000_riwp3k79'}],
        model: 'HG06104A',
        vendor: 'Lidl',
        description: 'Livarno Lux smart LED light strip 2.5m',
        ...preset.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true, enhancedHue: false, configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_s8gkrkxk'}],
        model: 'HG06467',
        vendor: 'Lidl',
        description: 'Melinera smart LED string lights',
        toZigbee: [tz.on_off, tz.silvercrest_smart_led_string],
        fromZigbee: [fz.on_off, fz.silvercrest_smart_led_string],
        exposes: [e.light_brightness_colorhs().setAccess('brightness', ea.STATE_SET)],
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_odygigth'}],
        model: 'HG06106B',
        vendor: 'Lidl',
        description: 'Livarno Lux E14 candle RGB',
        ...preset.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true, enhancedHue: false, configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_kdpxju99'}],
        model: 'HG06106A',
        vendor: 'Lidl',
        description: 'Livarno Lux GU10 spot RGB',
        ...preset.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true, enhancedHue: false, configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_dbou1ap4'}],
        model: 'HG06106C',
        vendor: 'Lidl',
        description: 'Livarno Lux E27 bulb RGB',
        ...preset.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true, enhancedHue: false, configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{modelID: 'TS0502A', manufacturerName: '_TZ3000_el5kt5im'}],
        model: 'HG06492A',
        vendor: 'Lidl',
        description: 'Livarno Lux GU10 spot CCT',
        ...preset.light_onoff_brightness_colortemp({disableColorTempStartup: true}),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 16});
        },
    },
    {
        fingerprint: [{modelID: 'TS0502A', manufacturerName: '_TZ3000_oborybow'}],
        model: 'HG06492B',
        vendor: 'Lidl',
        description: 'Livarno Lux E14 candle CCT',
        ...preset.light_onoff_brightness_colortemp({disableColorTempStartup: true}),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 16});
        },
    },
    {
        fingerprint: [{modelID: 'TS0502A', manufacturerName: '_TZ3000_49qchf10'}],
        model: 'HG06492C',
        vendor: 'Lidl',
        description: 'Livarno Lux E27 bulb CCT',
        ...preset.light_onoff_brightness_colortemp({disableColorTempStartup: true}),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 16});
        },
    },
    {
        fingerprint: [{modelID: 'TS0502A', manufacturerName: '_TZ3000_rylaozuc'}],
        model: '14147206L',
        vendor: 'Lidl',
        description: 'Livarno Lux ceiling light',
        ...preset.light_onoff_brightness_colortemp({disableColorTempStartup: true}),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 16});
        },
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_9cpuaca6'}],
        model: '14148906L',
        vendor: 'Lidl',
        description: 'Livarno Lux mood light RGB+CCT',
        ...preset.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true, enhancedHue: false, configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_gek6snaj'}],
        model: '14149505L/14149506L',
        vendor: 'Lidl',
        description: 'Livarno Lux light bar RGB+CCT (black/white)',
        ...preset.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true, enhancedHue: false, configureKey: 2},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },

    // Atsmart
    {
        zigbeeModel: ['Z601', 'Z602', 'Z603', 'Z604'],
        model: 'Z6',
        vendor: 'Atsmart',
        description: '3 gang smart wall switch (no neutral wire)',
        extend: preset.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('center'), e.switch().withEndpoint('right')],
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            try {
                await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
                await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
                await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            } catch (error) {
                // dip switch for 1-3 gang
            }
        },
    },

    // ADEO
    {
        zigbeeModel: ['LXEK-5'],
        model: 'HR-C99C-Z-C045',
        vendor: 'ADEO',
        description: 'RGB CTT LEXMAN ENKI remote control',
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step, fz.command_stop, fz.command_step_color_temperature,
            fz.command_step_hue, fz.command_step_saturation, fz.color_stop_raw, fz.scenes_recall_scene_65024, fz.ignore_genOta],
        toZigbee: [],
        exposes: [e.battery(), e.action(['on', 'off', 'scene_1', 'scene_2', 'scene_3', 'scene_4', 'color_saturation_step_up',
            'color_saturation_step_down', 'color_stop', 'color_hue_step_up', 'color_hue_step_down',
            'color_temperature_step_up', 'color_temperature_step_down', 'brightness_step_up', 'brightness_step_down', 'brightness_stop'])],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genOnOff', 'genPowerCfg', 'lightingColorCtrl', 'genLevelCtrl'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['LXEK-1'],
        model: '9CZA-A806ST-Q1A',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 LED RGBW',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LXEK-4'],
        model: '9CZA-M350ST-Q1A',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN GU-10 LED RGBW',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['LXEK-2'],
        model: '9CZA-G1521-Q1A',
        vendor: 'ADEO',
        description: 'ENKI Lexman E27 14W to 100W LED RGBW',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },

    // LightSolutions
    {
        zigbeeModel: ['91-947'],
        model: '200403V2-B',
        vendor: 'LightSolutions',
        description: 'Mini dimmer 200W',
        extend: preset.light_onoff_brightness(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['91-948'],
        model: '200106V3',
        vendor: 'LightSolutions',
        description: 'Zigbee switch 200W',
        extend: preset.switch(),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },

    // BYUN
    {
        zigbeeModel: ['Windows switch  '],
        model: 'M415-6C',
        vendor: 'BYUN',
        description: 'Smoke sensor',
        fromZigbee: [fz.byun_smoke_true, fz.byun_smoke_false],
        toZigbee: [],
        exposes: [e.smoke()],
    },
    {
        zigbeeModel: ['GAS  SENSOR     '],
        model: 'M415-5C',
        vendor: 'BYUN',
        description: 'Gas sensor',
        fromZigbee: [fz.byun_gas_true, fz.byun_gas_false],
        toZigbee: [],
        exposes: [e.gas()],
    },

    // Datek
    {
        zigbeeModel: ['PoP'],
        model: 'HLU2909K',
        vendor: 'Datek',
        description: 'APEX smart plug 16A',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.temperature],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'msTemperatureMeasurement']);
            await endpoint.read('haElectricalMeasurement', ['acVoltageMultiplier', 'acVoltageDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acCurrentMultiplier', 'acCurrentDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.onOff(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
            await reporting.temperature(endpoint);
        },
        exposes: [e.power(), e.current(), e.voltage(), e.switch(), e.temperature()],
    },

    {
        zigbeeModel: ['Meter Reader'],
        model: 'HSE2905E',
        vendor: 'Datek',
        description: 'Datek Eva AMS HAN power-meter sensor',
        fromZigbee: [fz.metering, fz.electrical_measurement, fz.temperature],
        toZigbee: [],
        ota: ota.zigbeeOTA,
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering', 'msTemperatureMeasurement']);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
            await reporting.currentSummDelivered(endpoint);
            await reporting.currentSummReceived(endpoint);
            await reporting.temperature(endpoint);
        },
        exposes: [e.power(), e.energy(), e.current(), e.voltage(), e.current_phase_b(), e.voltage_phase_b(), e.current_phase_c(),
            e.voltage_phase_c(), e.temperature()],
    },

    // Prolight
    {
        zigbeeModel: ['PROLIGHT E27 WHITE AND COLOUR'],
        model: '5412748727388',
        vendor: 'Prolight',
        description: 'E27 white and colour bulb',
        extend: preset.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['PROLIGHT E27 WARM WHITE CLEAR'],
        model: '5412748727432',
        vendor: 'Prolight',
        description: 'E27 filament bulb dimmable',
        extend: preset.light_onoff_brightness(),
    },

    // Fantem
    {
        fingerprint: [{modelID: 'TS0202', manufacturerName: '_TZ3210_rxqls8v0'}, {modelID: 'TS0202', manufacturerName: '_TZ3210_zmy9hjay'}],
        model: 'ZB003-X',
        vendor: 'Fantem',
        description: '4 in 1 multi sensor',
        fromZigbee: [fz.battery, fz.ignore_basic_report, fz.illuminance, fz.ZB003X, fz.ZB003X_attr, fz.ZB003X_occupancy],
        toZigbee: [tz.ZB003X],
        exposes: [e.occupancy(), e.tamper(), e.battery(), e.illuminance(), e.illuminance_lux().withUnit('lx'), e.temperature(),
            e.humidity(), exposes.numeric('reporting_time', ea.STATE_SET).withDescription('Reporting interval in minutes'),
            exposes.numeric('temperature_calibration', ea.STATE_SET).withDescription('Temperature calibration'),
            exposes.numeric('humidity_calibration', ea.STATE_SET).withDescription('Humidity calibration'),
            exposes.numeric('illuminance_calibration', ea.STATE_SET).withDescription('Illuminance calibration'),
            exposes.binary('pir_enable', ea.STATE_SET, true, false).withDescription('Enable PIR sensor'),
            exposes.binary('led_enable', ea.STATE_SET, true, false).withDescription('Enabled LED'),
            exposes.binary('reporting_enable', ea.STATE_SET, true, false).withDescription('Enabled reporting'),
            exposes.enum('sensitivity', ea.STATE_SET, ['low', 'medium', 'high']).withDescription('PIR sensor sensitivity'),
            // eslint-disable-next-line
            exposes.enum('keep_time', ea.STATE_SET, ['0', '30', '60', '120', '240']).withDescription('PIR keep time in seconds')],
    },

    // Eaton/Halo LED
    {
        zigbeeModel: ['Halo_RL5601'],
        model: 'RL460WHZHA69', // The 4" CAN variant presents as 5/6" zigbeeModel.
        vendor: 'Eaton/Halo LED',
        description: 'Wireless Controlled LED retrofit downlight',
        extend: preset.light_onoff_brightness_colortemp({colorTempRange: [200, 370]}),
    },

    // Matcall BV
    {
        zigbeeModel: ['ZG 401224'],
        model: 'ZG401224',
        vendor: 'Matcall',
        description: 'LED dimmer driver',
        extend: preset.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['ZG 430700', 'ZG  430700'],
        model: 'ZG430700',
        vendor: 'Matcall',
        description: 'LED dimmer driver',
        extend: preset.light_onoff_brightness(),
    },

    // Aldi
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3000_j0gtlepx'}],
        model: 'L122FF63H11A5.0W',
        vendor: 'Aldi',
        description: 'LIGHTWAY smart home LED-lamp - spot',
        extend: preset.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true},
    },
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3000_kohbva1f'}],
        model: 'L122CB63H11A9.0W',
        vendor: 'Aldi',
        description: 'LIGHTWAY smart home LED-lamp - bulb',
        extend: preset.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true},
    },
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3000_iivsrikg'}],
        model: 'L122AA63H11A6.5W',
        vendor: 'Aldi',
        description: 'LIGHTWAY smart home LED-lamp - candle',
        extend: preset.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true},
    },
    {
        fingerprint: [{modelID: 'TS0502B', manufacturerName: '_TZ3000_g1glzzfk'}],
        model: 'F122SB62H22A4.5W',
        vendor: 'Aldi',
        description: 'LIGHTWAY smart home LED-lamp - filament',
        extend: preset.light_onoff_brightness_colortemp({disableColorTempStartup: true}),
    },
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3000_v1srfw9x'}],
        model: 'C422AC11D41H140.0W',
        vendor: 'Aldi',
        description: 'MEGOS LED panel RGB+CCT 40W 3600lm 62 x 62 cm',
        extend: preset.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true},
    },
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3000_gb5gaeca'}],
        model: 'C422AC14D41H140.0W',
        vendor: 'Aldi',
        description: 'MEGOS LED panel RGB+CCT 40W 3600lm 30 x 120 cm',
        extend: preset.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true},
    },
    {
        fingerprint: [{modelID: 'TS1001', manufacturerName: '_TZ3000_ztrfrcsu'}],
        model: '141L100RC',
        vendor: 'Aldi',
        description: 'MEGOS switch and dimming light remote control',
        exposes: [e.action(['on', 'off', 'brightness_stop', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up',
            'brightness_move_down'])],
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop],
        toZigbee: [],
    },

    // SOHAN Electric
    {
        fingerprint: [{modelID: 'TS0001', manufacturerName: '_TZ3000_bezfthwc'}],
        model: 'RDCBC/Z',
        vendor: 'SOHAN Electric',
        description: 'DIN circuit breaker (1 pole / 2 poles)',
        extend: preset.switch(),
        fromZigbee: [fz.on_off, fz.ignore_basic_report, fz.ignore_time_read],
    },

    // WETEN
    {
        fingerprint: [{modelID: 'TS0001', manufacturerName: '_TZ3000_wrhhi5h2'}],
        model: '1GNNTS',
        vendor: 'WETEN',
        description: '1 gang no neutral touch wall switch',
        extend: preset.switch(),
        fromZigbee: [fz.on_off, fz.ignore_basic_report, fz.ignore_time_read],
    },
];

module.exports = devices.map((device) => {
    const {extend, ...deviceWithoutExtend} = device;

    if (extend) {
        if (extend.hasOwnProperty('configure') && device.hasOwnProperty('configure')) {
            assert.fail(`'${device.model}' has configure in extend and device, this is not allowed`);
        }

        device = {
            ...extend,
            ...deviceWithoutExtend,
            meta: extend.meta || deviceWithoutExtend.meta ? {
                ...extend.meta,
                ...deviceWithoutExtend.meta,
            } : undefined,
        };
    }

    if (device.toZigbee.length > 0) {
        device.toZigbee.push(tz.scene_store, tz.scene_recall, tz.scene_add, tz.scene_remove, tz.scene_remove_all, tz.read, tz.write);
    }

    if (device.exposes) {
        device.exposes = device.exposes.concat([e.linkquality()]);
    }

    return device;
});
