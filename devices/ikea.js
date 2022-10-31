const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const ota = require('../lib/ota');
const constants = require('../lib/constants');
const reporting = require('../lib/reporting');
const {repInterval} = require('../lib/constants');
const utils = require('../lib/utils');
const libColor = require('../lib/color');
const extend = require('../lib/extend');
const globalStore = require('../lib/store');
const e = exposes.presets;
const ea = exposes.access;
const herdsman = require('zigbee-herdsman');
const {
    calibrateAndPrecisionRoundOptions, postfixWithEndpointName, getMetaValue,
} = require('../lib/utils');

const bulbOnEvent = async (type, data, device, options, state) => {
    /**
     * IKEA bulbs lose their configured reportings when losing power.
     * A deviceAnnounce indicates they are powered on again.
     * Reconfigure the configured reoprting here.
     *
     * Additionally some other information is lost like
     *   color_options.execute_if_off. We also restore these.
     *
     * NOTE: binds are not lost so rebinding is not needed!
     */
    if (type === 'deviceAnnounce') {
        for (const endpoint of device.endpoints) {
            for (const c of endpoint.configuredReportings) {
                await endpoint.configureReporting(c.cluster.name, [{
                    attribute: c.attribute.name, minimumReportInterval: c.minimumReportInterval,
                    maximumReportInterval: c.maximumReportInterval, reportableChange: c.reportableChange,
                }]);
            }
        }

        // NOTE: execute_if_off default is false
        //       we only restore if true, to save unneeded network writes
        if (state !== undefined && state.color_options !== undefined && state.color_options.execute_if_off === true) {
            device.endpoints[0].write('lightingColorCtrl', {'options': 1});
        }
        if (state !== undefined && state.level_config !== undefined && state.level_config.execute_if_off === true) {
            device.endpoints[0].write('genLevelCtrl', {'options': 1});
        }
    }
};

const configureRemote = async (device, coordinatorEndpoint, logger) => {
    // Firmware 2.3.075 >= only supports binding to endpoint, before only to group
    // - https://github.com/Koenkk/zigbee2mqtt/issues/2772#issuecomment-577389281
    // - https://github.com/Koenkk/zigbee2mqtt/issues/7716
    const endpoint = device.getEndpoint(1);
    const version = device.softwareBuildID.split('.').map((n) => Number(n));
    const bindTarget = version[0] > 2 || (version[0] == 2 && version[1] > 3) || (version[0] == 2 && version[1] == 3 && version[2] >= 75) ?
        coordinatorEndpoint : constants.defaultBindGroup;
    await endpoint.bind('genOnOff', bindTarget);
    await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
    await reporting.batteryPercentageRemaining(endpoint);
};

const tzLocal = {
    LED1624G9_color_colortemp: {
        ...tz.light_color_colortemp,
        convertSet: async (entity, key, value, meta) => {
            if (key == 'color') {
                const result = await tz.light_color.convertSet(entity, key, value, meta);
                return result;
            } else if (key == 'color_temp' || key == 'color_temp_percent') {
                const xy = libColor.ColorXY.fromMireds(value);
                const payload = {
                    transtime: utils.getTransition(entity, key, meta).time,
                    colorx: utils.mapNumberRange(xy.x, 0, 1, 0, 65535),
                    colory: utils.mapNumberRange(xy.y, 0, 1, 0, 65535),
                };
                await entity.command('lightingColorCtrl', 'moveToColor', payload, utils.getOptions(meta.mapped, entity));
                return {
                    state: libColor.syncColorState({'color_mode': constants.colorMode[2], 'color_temp': value}, meta.state,
                        entity, meta.options, meta.logger), readAfterWriteTime: payload.transtime * 100,
                };
            }
        },
    },
};

const fzLocal = {
    // The STYRBAR sends an on +- 500ms after the arrow release. We don't want to send the ON action in this case.
    // https://github.com/Koenkk/zigbee2mqtt/issues/13335
    STYRBAR_on: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg)) return;
            const arrowReleaseAgo = Date.now() - globalStore.getValue(msg.endpoint, 'arrow_release', 0);
            if (arrowReleaseAgo > 700) {
                return {action: 'on'};
            }
        },
    },
    STYRBAR_arrow_release: {
        cluster: 'genScenes',
        type: 'commandTradfriArrowRelease',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg)) return;
            globalStore.putValue(msg.endpoint, 'arrow_release', Date.now());
            const direction = globalStore.getValue(msg.endpoint, 'direction');
            if (direction) {
                globalStore.clearValue(msg.endpoint, 'direction');
                const duration = msg.data.value / 1000;
                const result = {action: `arrow_${direction}_release`, duration, action_duration: duration};
                if (!utils.isLegacyEnabled(options)) delete result.duration;
                return result;
            }
        },
    },
};

const tradfriExtend = {
    light_onoff_brightness: (options = {}) => ({
        ...extend.light_onoff_brightness(options),
        exposes: extend.light_onoff_brightness(options).exposes.concat(e.power_on_behavior()),
        ota: ota.tradfri,
        onEvent: bulbOnEvent,
    }),
    light_onoff_brightness_colortemp: (options = {colorTempRange: [250, 454]}) => ({
        ...extend.light_onoff_brightness_colortemp(options),
        exposes: extend.light_onoff_brightness_colortemp(options).exposes.concat(e.power_on_behavior()),
        ota: ota.tradfri,
        onEvent: bulbOnEvent,
    }),
    light_onoff_brightness_colortemp_color: (options = {disableColorTempStartup: true, colorTempRange: [250, 454]}) => ({
        ...extend.light_onoff_brightness_colortemp_color(options),
        exposes: extend.light_onoff_brightness_colortemp_color(options).exposes.concat(e.power_on_behavior()),
        ota: ota.tradfri,
        onEvent: bulbOnEvent,
    }),
    light_onoff_brightness_color: (options = {}) => ({
        ...extend.light_onoff_brightness_color(options),
        exposes: extend.light_onoff_brightness_color(options).exposes.concat(e.power_on_behavior()),
        ota: ota.tradfri,
        onEvent: bulbOnEvent,
    }),
};

const manufacturerOptions = {manufacturerCode: herdsman.Zcl.ManufacturerCode.IKEA_OF_SWEDEN};

const ikea = {
    fz: {
        air_purifier: {
            cluster: 'manuSpecificIkeaAirPurifier',
            type: ['attributeReport', 'readResponse'],
            options: [exposes.options.precision('pm25'), exposes.options.calibration('pm25')],
            convert: (model, msg, publish, options, meta) => {
                const state = {};

                if (msg.data.hasOwnProperty('particulateMatter25Measurement')) {
                    const pm25Property = postfixWithEndpointName('pm25', msg, model, meta);
                    let pm25 = parseFloat(msg.data['particulateMatter25Measurement']);

                    // Air Quality
                    // Scale based on EU AQI (https://www.eea.europa.eu/themes/air/air-quality-index)
                    // Using German IAQ labels to match the Develco Air Quality Sensor
                    let airQuality;
                    const airQualityProperty = postfixWithEndpointName('air_quality', msg, model, meta);
                    if (pm25 <= 10) {
                        airQuality = 'excellent';
                    } else if (pm25 <= 20) {
                        airQuality = 'good';
                    } else if (pm25 <= 25) {
                        airQuality = 'moderate';
                    } else if (pm25 <= 50) {
                        airQuality = 'poor';
                    } else if (pm25 <= 75) {
                        airQuality = 'unhealthy';
                    } else if (pm25 <= 800) {
                        airQuality = 'hazardous';
                    } else if (pm25 < 65535) {
                        airQuality = 'out_of_range';
                    } else {
                        airQuality = 'unknown';
                    }

                    // calibrate and round pm25 unless invalid
                    pm25 = (pm25 == 65535) ? -1 : calibrateAndPrecisionRoundOptions(pm25, options, 'pm25');

                    state[pm25Property] = calibrateAndPrecisionRoundOptions(pm25, options, 'pm25');
                    state[airQualityProperty] = airQuality;
                }

                if (msg.data.hasOwnProperty('filterRunTime')) {
                // Filter needs to be replaced after 6 months
                    state['replace_filter'] = (parseInt(msg.data['filterRunTime']) >= 259200);
                }

                if (msg.data.hasOwnProperty('controlPanelLight')) {
                    state['led_enable'] = (msg.data['controlPanelLight'] == 0);
                }

                if (msg.data.hasOwnProperty('childLock')) {
                    state['child_lock'] = (msg.data['childLock'] > 0 ? 'LOCK' : 'UNLOCK');
                }

                if (msg.data.hasOwnProperty('fanSpeed')) {
                    let fanSpeed = msg.data['fanSpeed'];
                    if (fanSpeed >= 10) {
                        fanSpeed = (((fanSpeed - 5) * 2) / 10);
                    } else {
                        fanSpeed = 0;
                    }

                    state['fan_speed'] = fanSpeed;
                }

                if (msg.data.hasOwnProperty('fanMode')) {
                    let fanMode = msg.data['fanMode'];
                    if (fanMode >= 10) {
                        fanMode = (((fanMode - 5) * 2) / 10).toString();
                    } else if (fanMode == 1) {
                        fanMode = 'auto';
                    } else {
                        fanMode = 'off';
                    }

                    state['fan_mode'] = fanMode;
                    state['fan_state'] = (fanMode === 'off' ? 'OFF' : 'ON');
                }

                return state;
            },
        },
    },
    tz: {
        air_purifier_fan_mode: {
            key: ['fan_mode', 'fan_state'],
            convertSet: async (entity, key, value, meta) => {
                if (key == 'fan_state' && value.toLowerCase() == 'on') {
                    value = getMetaValue(entity, meta.mapped, 'fanStateOn', 'allEqual', 'on');
                } else {
                    value = value.toString().toLowerCase();
                }

                let fanMode;
                switch (value) {
                case 'off':
                    fanMode = 0;
                    break;
                case 'auto':
                    fanMode = 1;
                    break;
                default:
                    fanMode = parseInt(((parseInt(value) / 2.0) * 10) + 5);
                }

                await entity.write('manuSpecificIkeaAirPurifier', {'fanMode': fanMode}, manufacturerOptions.ikea);
                return {state: {fan_mode: value, fan_state: value === 'off' ? 'OFF' : 'ON'}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificIkeaAirPurifier', ['fanMode']);
            },
        },
        air_purifier_fan_speed: {
            key: ['fan_speed'],
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificIkeaAirPurifier', ['fanSpeed']);
            },
        },
        air_purifier_pm25: {
            key: ['pm25', 'air_quality'],
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificIkeaAirPurifier', ['particulateMatter25Measurement']);
            },
        },
        air_purifier_replace_filter: {
            key: ['replace_filter'],
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificIkeaAirPurifier', ['filterRunTime']);
            },
        },
        air_purifier_child_lock: {
            key: ['child_lock'],
            convertSet: async (entity, key, value, meta) => {
                await entity.write('manuSpecificIkeaAirPurifier', {'childLock': ((value.toLowerCase() === 'lock') ? 1 : 0)},
                    manufacturerOptions);
                return {state: {child_lock: ((value.toLowerCase() === 'lock') ? 'LOCK' : 'UNLOCK')}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificIkeaAirPurifier', ['childLock']);
            },
        },
        air_purifier_led_enable: {
            key: ['led_enable'],
            convertSet: async (entity, key, value, meta) => {
                await entity.write('manuSpecificIkeaAirPurifier', {'controlPanelLight': ((value) ? 0 : 1)}, manufacturerOptions);
                return {state: {led_enable: ((value) ? true : false)}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificIkeaAirPurifier', ['controlPanelLight']);
            },
        },
    },
};

module.exports = [
    {
        zigbeeModel: ['ASKVADER on/off switch'],
        model: 'E1836',
        vendor: 'IKEA',
        description: 'ASKVADER on/off switch',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WS opal 980lm', 'TRADFRI bulb E26 WS opal 980lm', 'TRADFRI bulb E27 WS\uFFFDopal 980lm'],
        model: 'LED1545G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 980 lumen, dimmable, white spectrum, opal white',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TRADFRI Light Engine'],
        model: 'T2011',
        description: 'Osvalla panel round',
        vendor: 'IKEA',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WS clear 950lm', 'TRADFRI bulb E26 WS clear 950lm', 'TRADFRI bulb E27 WS\uFFFDclear 950lm'],
        model: 'LED1546G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 950 lumen, dimmable, white spectrum, clear',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 opal 1000lm', 'TRADFRI bulb E27 W opal 1000lm'],
        model: 'LED1623G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 1000 lumen, dimmable, opal white',
        extend: tradfriExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['TRADFRIbulbE26WWglobeclear250lm'],
        model: 'LED2008G3',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26 250 lumen, wireless dimmable warm white/globe clear',
        extend: tradfriExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['TRADFRIbulbG125E27WSopal470lm', 'TRADFRIbulbG125E26WSopal450lm'],
        model: 'LED1936G5',
        vendor: 'IKEA',
        description: 'TRADFRI LED globe-bulb E26/E27 450/470 lumen, dimmable, white spectrum, opal white',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TRADFRIbulbE27WSglobeopal1055lm', 'TRADFRIbulbE26WSglobeopal1100lm', 'TRADFRIbulbE26WSglobeopal1160lm',
            'TRADFRIbulbE26WSglobeopal1055lm'],
        model: 'LED2003G10',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/27 1100/1055/1160 lumen, dimmable, white spectrum, opal white',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TRADFRIbulbE26WSglobeclear800lm', 'TRADFRIbulbE27WSglobeclear806lm'],
        model: 'LED2004G8',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 800/806 lumen, dimmable, white spectrum, clear',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 opal 470lm', 'TRADFRI bulb E27 W opal 470lm', 'TRADFRIbulbT120E27WSopal470lm'],
        model: 'LED1937T5_E27',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 470 lumen, dimmable, opal white',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TRADFRIbulbT120E26WSopal450lm', 'TRADFRIbulbT120E26WSopal470lm'],
        model: 'LED1937T5_E26',
        vendor: 'IKEA',
        description: 'LED bulb E26 450/470 lumen, wireless dimmable white spectrum/tube-shaped white frosted glass',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TRADFRIbulbB22WSglobeopal1055lm', 'TRADFRIbulbB22WSglobeopal1055lm'],
        model: 'LED2035G10',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb B22 1055 lumen, dimmable, white spectrum, opal white',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TRADFRI bulb GU10 WS 400lm'],
        model: 'LED1537R6/LED1739R5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 400 lumen, dimmable, white spectrum',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TRADFRI bulb GU10 W 400lm'],
        model: 'LED1650R5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 400 lumen, dimmable',
        extend: tradfriExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 WS opal 400lm', 'TRADFRI bulb E12 WS opal 400lm'],
        model: 'LED1536G5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E12/E14 400 lumen, dimmable, white spectrum, opal white',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 WS 470lm', 'TRADFRI bulb E12 WS 450lm', 'TRADFRI bulb E17 WS 440lm'],
        model: 'LED1903C5/LED1835C6',
        vendor: 'IKEA',
        description: 'TRADFRI bulb E12/E14/E17 WS 450/470/440 lumen, dimmable, white spectrum, opal white',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 WS globe 470lm'],
        model: 'LED2101G4',
        vendor: 'IKEA',
        description: 'TRADFRI bulb E14 WS globe 470lm, dimmable, white spectrum, opal white',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TRADFRI bulb GU10 WW 400lm'],
        model: 'LED1837R5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 400 lumen, dimmable',
        extend: tradfriExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WW clear 250lm', 'TRADFRI bulb E26 WW clear 250lm'],
        model: 'LED1842G3',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 WW clear 250 lumen, dimmable',
        extend: tradfriExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['TRADFRIbulbE27WWclear250lm'],
        model: 'LED1934G3_E27',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 WW clear 250 lumen, dimmable',
        extend: tradfriExtend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['TRADFRIbulbE26WWclear250lm'],
        model: 'LED1934G3_E26',
        vendor: 'IKEA',
        description: 'LED bulb E26 250 lumen, wireless dimmable warm white/globe clear',
        extend: tradfriExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 WS opal 600lm'],
        model: 'LED1733G7',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E14 600 lumen, dimmable, white spectrum, opal white',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TRADFRI bulb E26 opal 1000lm', 'TRADFRI bulb E26 W opal 1000lm'],
        model: 'LED1622G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26 1000 lumen, dimmable, opal white',
        extend: tradfriExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 CWS opal 600lm', 'TRADFRI bulb E26 CWS opal 600lm', 'TRADFRI bulb E14 CWS opal 600lm',
            'TRADFRI bulb E12 CWS opal 600lm', 'TRADFRI bulb E27 C/WS opal 600'],
        model: 'LED1624G9',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E14/E26/E27 600 lumen, dimmable, color, opal white',
        extend: tradfriExtend.light_onoff_brightness_colortemp_color(),
        toZigbee: utils.replaceInArray(
            tradfriExtend.light_onoff_brightness_colortemp_color().toZigbee,
            [tz.light_color_colortemp],
            [tzLocal.LED1624G9_color_colortemp],
        ),
        meta: {supportsHueAndSaturation: false},
    },
    {
        zigbeeModel: ['TRADFRI bulb E26 CWS 800lm', 'TRADFRI bulb E27 CWS 806lm', 'TRADFRI bulb E26 CWS 806lm'],
        model: 'LED1924G9',
        vendor: 'IKEA',
        description: 'TRADFRI bulb E26/E27 CWS 800/806 lumen, dimmable, color, opal white',
        extend: tradfriExtend.light_onoff_brightness_colortemp_color(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 W op/ch 400lm', 'TRADFRI bulb E12 W op/ch 400lm', 'TRADFRI bulb E17 W op/ch 400lm'],
        model: 'LED1649C5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E12/E14/E17 400 lumen, dimmable warm white, chandelier opal',
        extend: tradfriExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WS opal 1000lm', 'TRADFRI bulb E26 WS opal 1000lm'],
        model: 'LED1732G11',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 1000 lumen, dimmable, white spectrum, opal white',
        extend: tradfriExtend.light_onoff_brightness_colortemp({colorTempRange: [250, 454]}),
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WW 806lm', 'TRADFRI bulb E26 WW 806lm'],
        model: 'LED1836G9',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 806 lumen, dimmable, warm white',
        extend: tradfriExtend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WS clear 806lm', 'TRADFRI bulb E26 WS clear 806lm'],
        model: 'LED1736G9',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 806 lumen, dimmable, white spectrum, clear',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TRADFRIbulbE14WSglobeopal470lm', 'TRADFRIbulbE12WSglobeopal470lm'],
        model: 'LED2002G5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E14/E12 470 lumen, dimmable, white spectrum, clear',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['LEPTITER Recessed spot light'],
        model: 'T1820',
        vendor: 'IKEA',
        description: 'LEPTITER Recessed spot light, dimmable, white spectrum',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
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
        meta: {battery: {dontDividePercentage: true}},
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
        extend: tradfriExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['TRADFRI transformer 30W', 'TRADFRI Driver 30W'],
        model: 'ICPSHC24-30EU-IL-1',
        vendor: 'IKEA',
        description: 'TRADFRI driver for wireless control (30 watt)',
        extend: tradfriExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['SILVERGLANS IP44 LED driver'],
        model: 'ICPSHC24-30-IL44-1',
        vendor: 'IKEA',
        description: 'SILVERGLANS IP44 LED driver for wireless control (30 watt)',
        extend: tradfriExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['FLOALT panel WS 30x30'],
        model: 'L1527',
        vendor: 'IKEA',
        description: 'FLOALT LED light panel, dimmable, white spectrum (30x30 cm)',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['FLOALT panel WS 60x60'],
        model: 'L1529',
        vendor: 'IKEA',
        description: 'FLOALT LED light panel, dimmable, white spectrum (60x60 cm)',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['JORMLIEN door WS 40x80'],
        model: 'L1530',
        vendor: 'IKEA',
        description: 'JORMLIEN door light panel, dimmable, white spectrum (40x80 cm)',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['FLOALT panel WS 30x90'],
        model: 'L1528',
        vendor: 'IKEA',
        description: 'FLOALT LED light panel, dimmable, white spectrum (30x90 cm)',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['SURTE door WS 38x64'],
        model: 'L1531',
        vendor: 'IKEA',
        description: 'SURTE door light panel, dimmable, white spectrum (38x64 cm)',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TRADFRI control outlet'],
        model: 'E1603/E1702/E1708',
        description: 'TRADFRI control outlet',
        vendor: 'IKEA',
        extend: extend.switch(),
        toZigbee: extend.switch().toZigbee.concat([tz.power_on_behavior]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.power_on_behavior]),
        // power_on_behavior 'toggle' does not seem to be supported
        exposes: extend.switch().exposes.concat([exposes.enum('power_on_behavior', ea.ALL, ['off', 'previous', 'on'])
            .withDescription('Controls the behaviour when the device is powered on')]),
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
        exposes: [e.battery(), e.action(['arrow_left_click', 'arrow_left_hold', 'arrow_left_release', 'arrow_right_click',
            'arrow_right_hold', 'arrow_right_release', 'brightness_down_click', 'brightness_down_hold', 'brightness_down_release',
            'brightness_up_click', 'brightness_up_hold', 'brightness_up_release', 'toggle'])],
        toZigbee: [],
        ota: ota.tradfri,
        meta: {battery: {dontDividePercentage: true}},
        configure: configureRemote,
    },
    {
        zigbeeModel: ['Remote Control N2'],
        model: 'E2001/E2002',
        vendor: 'IKEA',
        description: 'STYRBAR remote control',
        fromZigbee: [fz.battery, fzLocal.STYRBAR_on, fz.command_off, fz.command_move, fz.command_stop, fz.ikea_arrow_click,
            fz.ikea_arrow_hold, fzLocal.STYRBAR_arrow_release],
        exposes: [e.battery(), e.action(['on', 'off', 'brightness_move_up', 'brightness_move_down',
            'brightness_stop', 'arrow_left_click', 'arrow_right_click', 'arrow_left_hold',
            'arrow_right_hold', 'arrow_left_release', 'arrow_right_release'])],
        toZigbee: [],
        ota: ota.tradfri,
        meta: {battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            // Binding genOnOff is not required to make device send events.
            const endpoint = device.getEndpoint(1);
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
        meta: {disableActionGroup: true, battery: {dontDividePercentage: true}},
        configure: configureRemote,
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
        meta: {disableActionGroup: true, battery: {dontDividePercentage: true}},
        configure: configureRemote,
    },
    {
        zigbeeModel: ['KNYCKLAN receiver'],
        model: 'E1842',
        description: 'KNYCKLAN receiver electronic water valve shut-off',
        vendor: 'IKEA',
        fromZigbee: extend.switch().fromZigbee.concat([fz.ias_water_leak_alarm_1]),
        exposes: extend.switch().exposes.concat([e.water_leak()]),
        extend: extend.switch(),
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
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.battery(), e.action(['on', 'off', 'brightness_move_up', 'brightness_stop'])],
        toZigbee: [],
        ota: ota.tradfri,
        meta: {disableActionGroup: true, battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            // Binding genOnOff is not required to make device send events.
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
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
        meta: {battery: {dontDividePercentage: true}},
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
            exposes.numeric('requested_brightness_percent', ea.STATE).withValueMin(30).withValueMax(100),
            exposes.binary('illuminance_above_threshold', ea.STATE, true, false)
                .withDescription('Indicates whether the device detected bright light (works only in night mode)')],
        ota: ota.tradfri,
        meta: {battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
            device.powerSource = 'Battery';
            device.save();
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
        meta: {battery: {dontDividePercentage: true}},
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
        meta: {battery: {dontDividePercentage: true}},
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
        zigbeeModel: ['PRAKTLYSING cellular blind'],
        model: 'E2102',
        vendor: 'IKEA',
        description: 'PRAKTLYSING cellular blind',
        fromZigbee: [fz.cover_position_tilt, fz.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        meta: {battery: {dontDividePercentage: true}},
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
        zigbeeModel: ['TREDANSEN block-out cellul blind'],
        model: 'E2103',
        vendor: 'IKEA',
        description: 'TREDANSEN cellular blind',
        fromZigbee: [fz.cover_position_tilt, fz.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        meta: {battery: {dontDividePercentage: true}},
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
        meta: {battery: {dontDividePercentage: true}},
        ota: ota.tradfri,
        configure: configureRemote,
    },
    {
        zigbeeModel: ['GUNNARP panel round'],
        model: 'T1828',
        description: 'GUNNARP panel round',
        vendor: 'IKEA',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['GUNNARP panel 40*40'],
        model: 'T1829',
        description: 'GUNNARP panel 40*40',
        vendor: 'IKEA',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TRADFRI bulb E12 WS opal 600lm'],
        model: 'LED1738G7',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E12 600 lumen, dimmable, white spectrum, opal white',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['TRADFRI bulb GU10 CWS 345lm', 'TRADFRI bulb GU10 CWS 380lm'],
        model: 'LED1923R5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 345 lumen, dimmable, white spectrum, color spectrum',
        extend: tradfriExtend.light_onoff_brightness_colortemp_color({colorTempRange: [250, 454]}),
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 CWS 470lm', 'TRADFRI bulb E12 CWS 450lm', 'TRADFRI bulb E17 CWS 440lm'],
        model: 'LED1925G6',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E14 470 lumen, opal, dimmable, white spectrum, color spectrum',
        extend: tradfriExtend.light_onoff_brightness_colortemp_color(),
    },
    {
        zigbeeModel: ['TRADFRIbulbE14WWclear250lm', 'TRADFRIbulbE12WWclear250lm'],
        model: 'LED1935C3',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E12/E14 WW clear 250 lumen, dimmable',
        extend: tradfriExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['TRADFRIbulbE12WWcandleclear250lm'],
        model: 'LED2009C3',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E12 WW candle clear 250 lumen, dimmable',
        extend: tradfriExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['TRADFRIbulbGU10WS345lm', 'TRADFRI bulb GU10 WW 345lm', 'TRADFRIbulbGU10WS380lm'],
        model: 'LED2005R5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 345/380 lumen, dimmable, white spectrum',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['STARKVIND Air purifier', 'STARKVIND Air purifier table'],
        model: 'E2007',
        vendor: 'IKEA',
        description: 'STARKVIND air purifier',
        exposes: [
            e.fan().withModes(['off', 'auto', '1', '2', '3', '4', '5', '6', '7', '8', '9']),
            exposes.numeric('fan_speed', exposes.access.STATE_GET).withValueMin(0).withValueMax(9)
                .withDescription('Current fan speed'),
            e.pm25().withAccess(ea.STATE_GET),
            exposes.enum('air_quality', ea.STATE_GET, [
                'excellent', 'good', 'moderate', 'poor',
                'unhealthy', 'hazardous', 'out_of_range',
                'unknown',
            ]).withDescription('Measured air quality'),
            exposes.binary('led_enable', ea.ALL, true, false).withDescription('Enabled LED'),
            exposes.binary('child_lock', ea.ALL, 'LOCK', 'UNLOCK').withDescription('Enables/disables physical input on the device'),
            exposes.binary('replace_filter', ea.STATE_GET, true, false)
                .withDescription('Filter is older than 6 months and needs replacing'),
        ],
        meta: {fanStateOn: 'auto'},
        fromZigbee: [ikea.fz.air_purifier],
        toZigbee: [
            ikea.tz.air_purifier_fan_mode, ikea.tz.air_purifier_fan_speed,
            ikea.tz.air_purifier_pm25, ikea.tz.air_purifier_child_lock, ikea.tz.air_purifier_led_enable,
            ikea.tz.air_purifier_replace_filter,
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);

            await reporting.bind(endpoint, coordinatorEndpoint, ['manuSpecificIkeaAirPurifier']);
            await endpoint.configureReporting('manuSpecificIkeaAirPurifier', [{attribute: 'particulateMatter25Measurement',
                minimumReportInterval: repInterval.MINUTE, maximumReportInterval: repInterval.HOUR, reportableChange: 1}],
            manufacturerOptions);
            await endpoint.configureReporting('manuSpecificIkeaAirPurifier', [{attribute: 'filterRunTime',
                minimumReportInterval: repInterval.HOUR, maximumReportInterval: repInterval.HOUR, reportableChange: 0}],
            manufacturerOptions);
            await endpoint.configureReporting('manuSpecificIkeaAirPurifier', [{attribute: 'fanMode',
                minimumReportInterval: 0, maximumReportInterval: repInterval.HOUR, reportableChange: 1}],
            manufacturerOptions);
            await endpoint.configureReporting('manuSpecificIkeaAirPurifier', [{attribute: 'fanSpeed',
                minimumReportInterval: 0, maximumReportInterval: repInterval.HOUR, reportableChange: 1}],
            manufacturerOptions);

            await endpoint.read('manuSpecificIkeaAirPurifier', ['controlPanelLight', 'childLock', 'filterRunTime']);
        },
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['TRADFRIbulbE14WScandleopal470lm', 'TRADFRIbulbE12WScandleopal450lm'],
        model: 'LED1949C5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E12/E14 450/470 lumen, wireless dimmable white spectrum/chandelier opal white',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['NYMANE PENDANT'],
        model: '90504044',
        vendor: 'IKEA',
        description: 'NYMÅNE Pendant lamp',
        extend: tradfriExtend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['STOFTMOLN ceiling/wall lamp WW37'],
        model: 'T2037',
        vendor: 'IKEA',
        description: 'STOFTMOLN ceiling/wall lamp 37 warm light dimmable',
        extend: tradfriExtend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['STOFTMOLN ceiling/wall lamp WW24'],
        model: 'T2035',
        vendor: 'IKEA',
        description: 'STOFTMOLN ceiling/wall lamp 24 warm light dimmable',
        extend: tradfriExtend.light_onoff_brightness(),
    },
];
