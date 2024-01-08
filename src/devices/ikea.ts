import {Definition, Fz, Tz, OnEvent, Configure, KeyValue, Zh, Range} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import tz from '../converters/toZigbee';
import * as ota from '../lib/ota';
import * as constants from '../lib/constants';
import * as reporting from '../lib/reporting';
import {repInterval} from '../lib/constants';
import * as utils from '../lib/utils';
import * as globalStore from '../lib/store';
import * as zigbeeHerdsman from 'zigbee-herdsman/dist';
import {postfixWithEndpointName, precisionRound, isObject, replaceInArray} from '../lib/utils';
import {onOff, LightArgs, light as lightDontUse} from '../lib/modernExtend';
import * as semver from 'semver';
const e = exposes.presets;
const ea = exposes.access;

const bulbOnEvent: OnEvent = async (type, data, device, options, state: KeyValue) => {
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
        const colorOptions = state.color_options as KeyValue;
        if (colorOptions?.execute_if_off === true) {
            device.endpoints[0].write('lightingColorCtrl', {'options': 1});
        }
        const levelConfig = state.level_config as KeyValue;
        if (levelConfig?.execute_if_off === true) {
            device.endpoints[0].write('genLevelCtrl', {'options': 1});
        }
        if (levelConfig?.on_level !== undefined) {
            const onLevelRaw = levelConfig.on_level;
            let onLevel: number;
            if (typeof onLevelRaw === 'string' && onLevelRaw.toLowerCase() == 'previous') {
                onLevel = 255;
            } else {
                onLevel = Number(onLevelRaw);
            }
            if (onLevel > 255) onLevel = 254;
            if (onLevel < 1) onLevel = 1;

            device.endpoints[0].write('genLevelCtrl', {onLevel: onLevelRaw});
        }
    }
};

const configureRemote: Configure = async (device, coordinatorEndpoint, logger) => {
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

export function tradfriLight(args?: Omit<LightArgs, 'colorTemp'> & {colorTemp?: true | {range: Range, viaColor: true}}) {
    const colorTemp: {range: Range} = args?.colorTemp ? (args.colorTemp === true ? {range: [250, 454]} : args.colorTemp) : undefined;
    const result = lightDontUse({...args, colorTemp});
    result.ota = ota.tradfri;
    result.onEvent = bulbOnEvent;
    if (isObject(args?.colorTemp) && args.colorTemp.viaColor) {
        result.toZigbee = replaceInArray(result.toZigbee, [tz.light_color_colortemp], [tz.light_color_and_colortemp_via_color]);
    }
    if (args?.colorTemp || args?.color) {
        result.exposes.push(e.light_color_options());
    }
    return result;
}

const manufacturerOptions = {manufacturerCode: zigbeeHerdsman.Zcl.ManufacturerCode.IKEA_OF_SWEDEN};

const configureGenPollCtrl = async (device: Zh.Device, endpoint: Zh.Endpoint) => {
    // NOTE: Firmware 24.4.11 introduce genPollCtrl
    //       after OTA update the checkinInterval is 4 which spams the network a lot
    //       removing + factory resetting has it set to 172800, we set the same value here
    //       so people do not need to update.
    if (Number(device?.softwareBuildID?.split('.')[0]) >= 24) {
        await endpoint.write('genPollCtrl', {'checkinInterval': 172800});
    }
};

const fzLocal = {
    air_purifier: {
        cluster: 'manuSpecificIkeaAirPurifier',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const state: KeyValue = {};

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

                pm25 = (pm25 == 65535) ? -1 : pm25;

                state[pm25Property] = pm25;
                state[airQualityProperty] = airQuality;
            }

            if (msg.data.hasOwnProperty('filterRunTime')) {
                // Filter needs to be replaced after 6 months
                state['replace_filter'] = (parseInt(msg.data['filterRunTime']) >= 259200);
                state['filter_age'] = parseInt(msg.data['filterRunTime']);
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
    } satisfies Fz.Converter,
    ikea_voc_index: {
        cluster: 'msIkeaVocIndexMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('measuredValue')) {
                return {voc_index: msg.data['measuredValue']};
            }
        },
    } satisfies Fz.Converter,
    battery: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const payload: KeyValue = {};
            if (msg.data.hasOwnProperty('batteryPercentageRemaining') && (msg.data['batteryPercentageRemaining'] < 255)) {
                // Some devices do not comply to the ZCL and report a
                // batteryPercentageRemaining of 100 when the battery is full (should be 200).
                //
                // IKEA corrected this on newer remote fw version, but many people are still
                // 2.2.010 which is the last version supporting group bindings. We try to be
                // smart and pick the correct one for IKEA remotes.
                let dividePercentage = true;
                // If softwareBuildID is below 2.4.0 it should not be divided
                if (semver.lt(meta.device.softwareBuildID, '2.4.0', true)) {
                    dividePercentage = false;
                }
                let percentage = msg.data['batteryPercentageRemaining'];
                percentage = dividePercentage ? percentage / 2 : percentage;
                payload.battery = precisionRound(percentage, 2);
            }

            return payload;
        },
    } satisfies Fz.Converter,
    // The STYRBAR sends an on +- 500ms after the arrow release. We don't want to send the ON action in this case.
    // https://github.com/Koenkk/zigbee2mqtt/issues/13335
    styrbar_on: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            const arrowReleaseAgo = Date.now() - globalStore.getValue(msg.endpoint, 'arrow_release', 0);
            if (arrowReleaseAgo > 700) {
                return {action: 'on'};
            }
        },
    } satisfies Fz.Converter,
    styrbar_arrow_release: {
        cluster: 'genScenes',
        type: 'commandTradfriArrowRelease',
        options: [exposes.options.legacy()],
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
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
    } satisfies Fz.Converter,
    ikea_dots_click_v1: {
        // For remotes with firmware 1.0.012 (20211214)
        cluster: 64639,
        type: 'raw',
        convert: (model, msg, publish, options, meta) => {
            if (!Buffer.isBuffer(msg.data)) return;
            let action;
            const button = msg.data[5];
            switch (msg.data[6]) {
            case 1: action = 'initial_press'; break;
            case 2: action = 'double_press'; break;
            case 3: action = 'long_press'; break;
            }

            return {action: `dots_${button}_${action}`};
        },
    } satisfies Fz.Converter,
    ikea_dots_click_v2: {
        // For remotes with firmware 1.0.32 (20221219)
        cluster: 'tradfriButton',
        type: ['commandAction1', 'commandAction2', 'commandAction3', 'commandAction4', 'commandAction6'],
        convert: (model, msg, publish, options, meta) => {
            const button = utils.getFromLookup(msg.endpoint.ID, {2: '1', 3: '2'});
            const lookup = {
                commandAction1: 'initial_press',
                commandAction2: 'long_press',
                commandAction3: 'short_release',
                commandAction4: 'long_release',
                commandAction6: 'double_press',
            };
            const action = utils.getFromLookup(msg.type, lookup);
            return {action: `dots_${button}_${action}`};
        },
    } satisfies Fz.Converter,
    ikea_dots_click_v2_somrig: {
        cluster: 'tradfriButton',
        type: ['commandAction1', 'commandAction2', 'commandAction3', 'commandAction4', 'commandAction6'],
        convert: (model, msg, publish, options, meta) => {
            const button = utils.getFromLookup(msg.endpoint.ID, {1: '1', 2: '2'});
            const lookup = {
                commandAction1: 'initial_press',
                commandAction2: 'long_press',
                commandAction3: 'short_release',
                commandAction4: 'long_release',
                commandAction6: 'double_press',
            };
            const action = utils.getFromLookup(msg.type, lookup);
            return {action: `${button}_${action}`};
        },
    } satisfies Fz.Converter,
    ikea_volume_click: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            const direction = msg.data.movemode === 1 ? 'down' : 'up';
            return {action: `volume_${direction}`};
        },
    } satisfies Fz.Converter,
    ikea_volume_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            const direction = msg.data.movemode === 1 ? 'down_hold' : 'up_hold';
            return {action: `volume_${direction}`};
        },
    } satisfies Fz.Converter,
    ikea_track_click: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg, model)) return;
            const direction = msg.data.stepmode === 1 ? 'previous' : 'next';
            return {action: `track_${direction}`};
        },
    } satisfies Fz.Converter,
};

const tzLocal = {
    air_purifier_fan_mode: {
        key: ['fan_mode', 'fan_state'],
        convertSet: async (entity, key, value, meta) => {
            if (key == 'fan_state' && typeof value === 'string' && value.toLowerCase() == 'on') {
                value = 'auto';
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
                fanMode = ((Number(value) / 2.0) * 10) + 5;
            }

            await entity.write('manuSpecificIkeaAirPurifier', {'fanMode': fanMode}, manufacturerOptions);
            return {state: {fan_mode: value, fan_state: value === 'off' ? 'OFF' : 'ON'}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificIkeaAirPurifier', ['fanMode']);
        },
    } satisfies Tz.Converter,
    air_purifier_fan_speed: {
        key: ['fan_speed'],
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificIkeaAirPurifier', ['fanSpeed']);
        },
    } satisfies Tz.Converter,
    air_purifier_pm25: {
        key: ['pm25', 'air_quality'],
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificIkeaAirPurifier', ['particulateMatter25Measurement']);
        },
    } satisfies Tz.Converter,
    air_purifier_replace_filter: {
        key: ['replace_filter', 'filter_age'],
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificIkeaAirPurifier', ['filterRunTime']);
        },
    } satisfies Tz.Converter,
    air_purifier_child_lock: {
        key: ['child_lock'],
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value, 'child_lock');
            await entity.write('manuSpecificIkeaAirPurifier', {'childLock': ((value.toLowerCase() === 'lock') ? 1 : 0)},
                manufacturerOptions);
            return {state: {child_lock: ((value.toLowerCase() === 'lock') ? 'LOCK' : 'UNLOCK')}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificIkeaAirPurifier', ['childLock']);
        },
    } satisfies Tz.Converter,
    air_purifier_led_enable: {
        key: ['led_enable'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('manuSpecificIkeaAirPurifier', {'controlPanelLight': ((value) ? 0 : 1)}, manufacturerOptions);
            return {state: {led_enable: ((value) ? true : false)}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificIkeaAirPurifier', ['controlPanelLight']);
        },
    } satisfies Tz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['ASKVADER on/off switch'],
        model: 'E1836',
        vendor: 'IKEA',
        description: 'ASKVADER on/off switch',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WS opal 980lm', 'TRADFRI bulb E26 WS opal 980lm', 'TRADFRI bulb E27 WS\uFFFDopal 980lm'],
        model: 'LED1545G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 980 lumen, dimmable, white spectrum, opal white',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 WS candle 470lm'],
        model: 'LED2107C4',
        vendor: 'IKEA',
        description: 'TRADFRI bulb E14 WS candle 470lm, wireless dimmable white spectrum/chandelier opal white',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRI Light Engine'],
        model: 'T2011',
        description: 'Osvalla panel round',
        vendor: 'IKEA',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WS clear 950lm', 'TRADFRI bulb E26 WS clear 950lm', 'TRADFRI bulb E27 WS\uFFFDclear 950lm'],
        model: 'LED1546G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 950 lumen, dimmable, white spectrum, clear',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 opal 1000lm', 'TRADFRI bulb E27 W opal 1000lm'],
        model: 'LED1623G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 1000 lumen, dimmable, opal white',
        extend: [tradfriLight()],
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WW globe 806lm', 'TRADFRI bulb E26 WW globe 800lm'],
        model: 'LED2103G5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 806 lumen, wireless dimmable warm white',
        extend: [tradfriLight()],
    },
    {
        zigbeeModel: ['TRADFRIbulbE26WWglobeclear250lm'],
        model: 'LED2008G3',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26 250 lumen, wireless dimmable warm white/globe clear',
        extend: [tradfriLight()],
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WW G95 CL 470lm', 'TRADFRI bulb E26 WW G95 CL 450lm', 'TRADFRI bulb E26 WW G95 CL 440lm'],
        model: 'LED2102G3',
        vendor: 'IKEA',
        description: 'TRADFRI bulb E26/E27 WW 440/450/470 lumen, wireless dimmable warm white/globe clear',
        extend: [tradfriLight()],
    },
    {
        zigbeeModel: ['\u001aTRADFRI bulb GU10 WW 345lm8', 'TRADFRI bulb GU10 WW 345lm', '\\u001TRADFRI bulb GU10 WW 345lm'],
        model: 'LED2104R3',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 WW 345 lumen, dimmable',
        extend: [tradfriLight()],
    },
    {
        zigbeeModel: ['TRADFRIbulbG125E27WSopal470lm', 'TRADFRIbulbG125E26WSopal450lm', 'TRADFRIbulbG125E26WSopal470lm'],
        model: 'LED1936G5',
        vendor: 'IKEA',
        description: 'TRADFRI LED globe-bulb E26/E27 450/470 lumen, dimmable, white spectrum, opal white',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRIbulbE27WSglobeopal1055lm', 'TRADFRIbulbE26WSglobeopal1100lm', 'TRADFRIbulbE26WSglobeopal1160lm',
            'TRADFRIbulbE26WSglobeopal1055lm', 'TRADFRI bulb E26 WS globe 1160lm'],
        model: 'LED2003G10',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/27 1100/1055/1160 lumen, dimmable, white spectrum, opal white',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRIbulbE26WSglobeclear800lm', 'TRADFRIbulbE27WSglobeclear806lm', 'TRADFRIbulbE26WSglobeclear806lm'],
        model: 'LED2004G8',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 800/806 lumen, dimmable, white spectrum, clear',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 opal 470lm', 'TRADFRI bulb E27 W opal 470lm', 'TRADFRIbulbT120E27WSopal470lm'],
        model: 'LED1937T5_E27',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 470 lumen, dimmable, opal white',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRIbulbT120E26WSopal450lm', 'TRADFRIbulbT120E26WSopal470lm'],
        model: 'LED1937T5_E26',
        vendor: 'IKEA',
        description: 'LED bulb E26 450/470 lumen, wireless dimmable white spectrum/tube-shaped white frosted glass',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRIbulbB22WSglobeopal1055lm', 'TRADFRIbulbB22WSglobeopal1055lm'],
        model: 'LED2035G10',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb B22 1055 lumen, dimmable, white spectrum, opal white',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRI bulb GU10 WS 400lm'],
        model: 'LED1537R6/LED1739R5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 400 lumen, dimmable, white spectrum',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRI bulb GU10 W 400lm'],
        model: 'LED1650R5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 400 lumen, dimmable',
        extend: [tradfriLight()],
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 WS opal 400lm', 'TRADFRI bulb E12 WS opal 400lm'],
        model: 'LED1536G5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E12/E14 400 lumen, dimmable, white spectrum, opal white',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 WS 470lm', 'TRADFRI bulb E12 WS 450lm', 'TRADFRI bulb E17 WS 440lm'],
        model: 'LED1903C5/LED1835C6',
        vendor: 'IKEA',
        description: 'TRADFRI bulb E12/E14/E17 WS 450/470/440 lumen, dimmable, white spectrum, opal white',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 WS globe 470lm', 'TRADFRI bulb E12 WS globe 450lm'],
        model: 'LED2101G4',
        vendor: 'IKEA',
        description: 'TRADFRI bulb E12/E14 WS globe 450/470 lumen, dimmable, white spectrum, opal white',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRI bulb GU10 WW 400lm'],
        model: 'LED1837R5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 400 lumen, dimmable',
        extend: [tradfriLight()],
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WW clear 250lm', 'TRADFRI bulb E26 WW clear 250lm'],
        model: 'LED1842G3',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 WW clear 250 lumen, dimmable',
        extend: [tradfriLight()],
    },
    {
        zigbeeModel: ['TRADFRIbulbE27WWclear250lm'],
        model: 'LED1934G3_E27',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 WW clear 250 lumen, dimmable',
        extend: [tradfriLight({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['TRADFRIbulbE26WWclear250lm'],
        model: 'LED1934G3_E26',
        vendor: 'IKEA',
        description: 'LED bulb E26 250 lumen, wireless dimmable warm white/globe clear',
        extend: [tradfriLight()],
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 WS opal 600lm'],
        model: 'LED1733G7',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E14 600 lumen, dimmable, white spectrum, opal white',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRI bulb E26 opal 1000lm', 'TRADFRI bulb E26 W opal 1000lm'],
        model: 'LED1622G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26 1000 lumen, dimmable, opal white',
        extend: [tradfriLight()],
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 CWS opal 600lm', 'TRADFRI bulb E26 CWS opal 600lm', 'TRADFRI bulb E14 CWS opal 600lm',
            'TRADFRI bulb E12 CWS opal 600lm', 'TRADFRI bulb E27 C/WS opal 600'],
        model: 'LED1624G9',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E14/E26/E27 600 lumen, dimmable, color, opal white',
        extend: [tradfriLight({colorTemp: {range: [153, 500], viaColor: true}, color: true})], // light is pure RGB (XY), advertise 2000K-6500K
    },
    {
        zigbeeModel: ['TRADFRI bulb E26 CWS 800lm', 'TRADFRI bulb E27 CWS 806lm', 'TRADFRI bulb E26 CWS 806lm', 'TRADFRI bulb E26 CWS 810lm'],
        model: 'LED1924G9',
        vendor: 'IKEA',
        description: 'TRADFRI bulb E26/E27 CWS 800/806/810 lumen, dimmable, color, opal white',
        extend: [tradfriLight({colorTemp: true, color: true, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 W op/ch 400lm', 'TRADFRI bulb E12 W op/ch 400lm', 'TRADFRI bulb E17 W op/ch 400lm'],
        model: 'LED1649C5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E12/E14/E17 400 lumen, dimmable warm white, chandelier opal',
        extend: [tradfriLight()],
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WS opal 1000lm', 'TRADFRI bulb E26 WS opal 1000lm'],
        model: 'LED1732G11',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 1000 lumen, dimmable, white spectrum, opal white',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WW 806lm', 'TRADFRI bulb E26 WW 806lm'],
        model: 'LED1836G9',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 806 lumen, dimmable, warm white',
        extend: [tradfriLight({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WS clear 806lm', 'TRADFRI bulb E26 WS clear 806lm'],
        model: 'LED1736G9',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 806 lumen, dimmable, white spectrum, clear',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRIbulbE14WSglobeopal470lm', 'TRADFRIbulbE12WSglobeopal470lm'],
        model: 'LED2002G5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E14/E12 470 lumen, dimmable, white spectrum, clear',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['LEPTITER Recessed spot light'],
        model: 'T1820',
        vendor: 'IKEA',
        description: 'LEPTITER Recessed spot light, dimmable, white spectrum',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRI wireless dimmer'],
        model: 'ICTC-G-1',
        vendor: 'IKEA',
        description: 'TRADFRI wireless dimmer',
        fromZigbee: [legacy.fz.cmd_move, legacy.fz.cmd_move_with_onoff, legacy.fz.cmd_stop, legacy.fz.cmd_stop_with_onoff,
            legacy.fz.cmd_move_to_level_with_onoff, fz.battery],
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
        extend: [tradfriLight({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['TRADFRI transformer 30W', 'TRADFRI Driver 30W'],
        model: 'ICPSHC24-30EU-IL-1',
        vendor: 'IKEA',
        description: 'TRADFRI driver for wireless control (30 watt)',
        extend: [tradfriLight({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['SILVERGLANS IP44 LED driver'],
        model: 'ICPSHC24-30-IL44-1',
        vendor: 'IKEA',
        description: 'SILVERGLANS IP44 LED driver for wireless control (30 watt)',
        extend: [tradfriLight({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['Pendant lamp WW'],
        model: 'T2030',
        vendor: 'IKEA',
        description: 'PILSKOTT LED pendant lamp',
        extend: [tradfriLight({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['FLOALT panel WS 30x30'],
        model: 'L1527',
        vendor: 'IKEA',
        description: 'FLOALT LED light panel, dimmable, white spectrum (30x30 cm)',
        extend: [tradfriLight({colorTemp: true, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['FLOALT panel WS 60x60'],
        model: 'L1529',
        vendor: 'IKEA',
        description: 'FLOALT LED light panel, dimmable, white spectrum (60x60 cm)',
        extend: [tradfriLight({colorTemp: true, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['JORMLIEN door WS 40x80'],
        model: 'L1530',
        vendor: 'IKEA',
        description: 'JORMLIEN door light panel, dimmable, white spectrum (40x80 cm)',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['FLOALT panel WS 30x90'],
        model: 'L1528',
        vendor: 'IKEA',
        description: 'FLOALT LED light panel, dimmable, white spectrum (30x90 cm)',
        extend: [tradfriLight({colorTemp: true, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['SURTE door WS 38x64'],
        model: 'L1531',
        vendor: 'IKEA',
        description: 'SURTE door light panel, dimmable, white spectrum (38x64 cm)',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRI control outlet'],
        model: 'E1603/E1702/E1708',
        description: 'TRADFRI control outlet',
        vendor: 'IKEA',
        extend: [onOff({ota: ota.tradfri})],
    },
    {
        zigbeeModel: ['TRADFRI remote control'],
        model: 'E1524/E1810',
        description: 'TRADFRI remote control',
        vendor: 'IKEA',
        fromZigbee: [fzLocal.battery, fz.E1524_E1810_toggle, fz.E1524_E1810_levelctrl, fz.ikea_arrow_click, fz.ikea_arrow_hold,
            fz.ikea_arrow_release],
        exposes: [e.battery().withAccess(ea.STATE_GET), e.action(['arrow_left_click', 'arrow_left_hold', 'arrow_left_release',
            'arrow_right_click', 'arrow_right_hold', 'arrow_right_release', 'brightness_down_click', 'brightness_down_hold',
            'brightness_down_release', 'brightness_up_click', 'brightness_up_hold', 'brightness_up_release', 'toggle'])],
        toZigbee: [tz.battery_percentage_remaining],
        ota: ota.tradfri,
        // dontDividePercentage: true not needed with latest firmware
        // https://github.com/Koenkk/zigbee2mqtt/issues/16412
        configure: configureRemote,
    },
    {
        zigbeeModel: ['Remote Control N2'],
        model: 'E2001/E2002',
        vendor: 'IKEA',
        description: 'STYRBAR remote control',
        fromZigbee: [fzLocal.battery, fzLocal.styrbar_on, fz.command_off, fz.command_move, fz.command_stop, fz.ikea_arrow_click,
            fz.ikea_arrow_hold, fzLocal.styrbar_arrow_release],
        exposes: [e.battery().withAccess(ea.STATE_GET), e.action(['on', 'off', 'brightness_move_up', 'brightness_move_down',
            'brightness_stop', 'arrow_left_click', 'arrow_right_click', 'arrow_left_hold',
            'arrow_right_hold', 'arrow_left_release', 'arrow_right_release'])],
        toZigbee: [tz.battery_percentage_remaining],
        ota: ota.tradfri,
        configure: async (device, coordinatorEndpoint, logger) => {
            // Binding genOnOff is not required to make device send events.
            const endpoint = device.getEndpoint(1);
            const version = device.softwareBuildID.split('.').map((n) => Number(n));
            // https://github.com/Koenkk/zigbee2mqtt/issues/15725
            const v245OrLater = version[0] > 2 || (version[0] == 2 && version[1] >= 4);
            const binds = v245OrLater ? ['genPowerCfg', 'genOnOff', 'genLevelCtrl', 'genScenes'] : ['genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['TRADFRI on/off switch'],
        model: 'E1743',
        vendor: 'IKEA',
        description: 'TRADFRI ON/OFF switch',
        fromZigbee: [fz.command_on, legacy.fz.genOnOff_cmdOn, fz.command_off, legacy.fz.genOnOff_cmdOff, fz.command_move,
            fzLocal.battery, legacy.fz.E1743_brightness_up, legacy.fz.E1743_brightness_down, fz.command_stop,
            legacy.fz.E1743_brightness_stop],
        exposes: [
            e.battery().withAccess(ea.STATE_GET),
            e.action(['on', 'off', 'brightness_move_down', 'brightness_move_up', 'brightness_stop']),
        ],
        toZigbee: [tz.battery_percentage_remaining],
        ota: ota.tradfri,
        meta: {disableActionGroup: true},
        configure: configureRemote,
    },
    {
        zigbeeModel: ['KNYCKLAN Open/Close remote'],
        model: 'E1841',
        vendor: 'IKEA',
        description: 'KNYCKLAN open/close remote water valve',
        fromZigbee: [fz.command_on, fz.command_off, fzLocal.battery],
        exposes: [e.battery().withAccess(ea.STATE_GET), e.action(['on', 'off'])],
        toZigbee: [tz.battery_percentage_remaining],
        ota: ota.tradfri,
        meta: {disableActionGroup: true},
        configure: configureRemote,
    },
    {
        zigbeeModel: ['KNYCKLAN receiver'],
        model: 'E1842',
        description: 'KNYCKLAN receiver electronic water valve shut-off',
        vendor: 'IKEA',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        exposes: [e.water_leak()],
        extend: [onOff({ota: ota.tradfri})],
    },
    {
        zigbeeModel: ['TRADFRI SHORTCUT Button'],
        model: 'E1812',
        vendor: 'IKEA',
        description: 'TRADFRI shortcut button',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fzLocal.battery],
        exposes: [e.battery().withAccess(ea.STATE_GET), e.action(['on', 'off', 'brightness_move_up', 'brightness_stop'])],
        toZigbee: [tz.battery_percentage_remaining],
        ota: ota.tradfri,
        meta: {disableActionGroup: true},
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
        fromZigbee: [legacy.fz.cmd_move, legacy.fz.cmd_stop, legacy.fz.E1744_play_pause, legacy.fz.E1744_skip, fzLocal.battery],
        toZigbee: [],
        exposes: [e.battery(), e.action([
            'brightness_move_up', 'brightness_move_down', 'brightness_stop', 'toggle', 'brightness_step_up', 'brightness_step_down'])],
        ota: ota.tradfri,
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
        fromZigbee: [fzLocal.battery, fz.tradfri_occupancy, fz.E1745_requested_brightness],
        toZigbee: [],
        exposes: [e.battery(), e.occupancy(),
            e.numeric('requested_brightness_level', ea.STATE).withValueMin(76).withValueMax(254),
            e.numeric('requested_brightness_percent', ea.STATE).withValueMin(30).withValueMax(100),
            e.binary('illuminance_above_threshold', ea.STATE, true, false)
                .withDescription('Indicates whether the device detected bright light (works only in night mode)')],
        ota: ota.tradfri,
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
            const payload = [{attribute: 'modelId', minimumReportInterval: 3600, maximumReportInterval: 14400, reportableChange: 0}];
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
        fromZigbee: [fz.cover_position_tilt, fzLocal.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.battery_percentage_remaining],
        ota: ota.tradfri,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.currentPositionLiftPercentage(endpoint);
            await configureGenPollCtrl(device, endpoint);
        },
        exposes: [e.cover_position(), e.battery().withAccess(ea.STATE_GET)],
    },
    {
        zigbeeModel: ['KADRILJ roller blind'],
        model: 'E1926',
        vendor: 'IKEA',
        description: 'KADRILJ roller blind',
        fromZigbee: [fz.cover_position_tilt, fzLocal.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.battery_percentage_remaining],
        ota: ota.tradfri,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.currentPositionLiftPercentage(endpoint);
            await configureGenPollCtrl(device, endpoint);
        },
        exposes: [e.cover_position(), e.battery().withAccess(ea.STATE_GET)],
    },
    {
        zigbeeModel: ['PRAKTLYSING cellular blind'],
        model: 'E2102',
        vendor: 'IKEA',
        description: 'PRAKTLYSING cellular blind',
        fromZigbee: [fz.cover_position_tilt, fzLocal.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.battery_percentage_remaining],
        ota: ota.tradfri,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.currentPositionLiftPercentage(endpoint);
            await configureGenPollCtrl(device, endpoint);
        },
        exposes: [e.cover_position(), e.battery().withAccess(ea.STATE_GET)],
    },
    {
        zigbeeModel: ['TREDANSEN block-out cellul blind'],
        model: 'E2103',
        vendor: 'IKEA',
        description: 'TREDANSEN cellular blind',
        fromZigbee: [fz.cover_position_tilt, fzLocal.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        meta: {battery: {dontDividePercentage: true}},
        ota: ota.tradfri,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.currentPositionLiftPercentage(endpoint);
            await configureGenPollCtrl(device, endpoint);
        },
        exposes: [e.cover_position(), e.battery()],
    },
    {
        zigbeeModel: ['TRADFRI open/close remote'],
        model: 'E1766',
        vendor: 'IKEA',
        description: 'TRADFRI open/close remote',
        fromZigbee: [fzLocal.battery, fz.command_cover_close, legacy.fz.cover_close, fz.command_cover_open, legacy.fz.cover_open,
            fz.command_cover_stop, legacy.fz.cover_stop],
        exposes: [e.battery().withAccess(ea.STATE_GET), e.action(['close', 'open', 'stop'])],
        toZigbee: [tz.battery_percentage_remaining],
        ota: ota.tradfri,
        configure: configureRemote,
    },
    {
        zigbeeModel: ['GUNNARP panel round'],
        model: 'T1828',
        description: 'GUNNARP panel round',
        vendor: 'IKEA',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['GUNNARP panel 40*40'],
        model: 'T1829',
        description: 'GUNNARP panel 40*40',
        vendor: 'IKEA',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRI bulb E12 WS opal 600lm'],
        model: 'LED1738G7',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E12 600 lumen, dimmable, white spectrum, opal white',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRI bulb GU10 CWS 345lm', 'TRADFRI bulb GU10 CWS 380lm'],
        model: 'LED1923R5/LED1925G6',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 345 lumen, dimmable, white spectrum, color spectrum',
        extend: [tradfriLight({colorTemp: {range: [153, 500], viaColor: true}, color: true})], // light is pure RGB (XY), advertise 2000K-6500K
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WS globe 1055lm'],
        model: 'LED2201G8',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 1055 lumen, dimmable, white spectrum',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 CWS 470lm', 'TRADFRI bulb E12 CWS 450lm', 'TRADFRI bulb E17 CWS 440lm'],
        model: 'LED1925G6',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E14 470 lumen, opal, dimmable, white spectrum, color spectrum',
        extend: [tradfriLight({colorTemp: true, color: true, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['TRADFRIbulbE14WWclear250lm', 'TRADFRIbulbE12WWclear250lm'],
        model: 'LED1935C3',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E12/E14 WW clear 250 lumen, dimmable',
        extend: [tradfriLight()],
    },
    {
        zigbeeModel: ['TRADFRIbulbE12WWcandleclear250lm'],
        model: 'LED2009C3',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E12 WW candle clear 250 lumen, dimmable',
        extend: [tradfriLight()],
    },
    {
        zigbeeModel: ['TRADFRIbulbGU10WS345lm', 'TRADFRI bulb GU10 WS 345lm', 'TRADFRIbulbGU10WS380lm'],
        model: 'LED2005R5/LED2106R3',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 345/380 lumen, dimmable, white spectrum',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRI_bulb_GU10_WS_345lm'],
        model: 'LED2106R3',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 345 lumen, dimmable, white spectrum',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['STARKVIND Air purifier', 'STARKVIND Air purifier table'],
        model: 'E2007',
        vendor: 'IKEA',
        description: 'STARKVIND air purifier',
        exposes: [
            e.fan().withModes(['off', 'auto', '1', '2', '3', '4', '5', '6', '7', '8', '9']),
            e.numeric('fan_speed', exposes.access.STATE_GET).withValueMin(0).withValueMax(9)
                .withDescription('Current fan speed'),
            e.pm25().withAccess(ea.STATE_GET),
            e.enum('air_quality', ea.STATE_GET, [
                'excellent', 'good', 'moderate', 'poor',
                'unhealthy', 'hazardous', 'out_of_range',
                'unknown',
            ]).withDescription('Measured air quality'),
            e.binary('led_enable', ea.ALL, true, false).withDescription('Enabled LED'),
            e.binary('child_lock', ea.ALL, 'LOCK', 'UNLOCK').withDescription('Enables/disables physical input on the device'),
            e.binary('replace_filter', ea.STATE_GET, true, false)
                .withDescription('Filter is older than 6 months and needs replacing'),
            e.numeric('filter_age', ea.STATE_GET).withDescription('Time the filter has been used in minutes'),
        ],
        fromZigbee: [fzLocal.air_purifier],
        toZigbee: [
            tzLocal.air_purifier_fan_mode, tzLocal.air_purifier_fan_speed,
            tzLocal.air_purifier_pm25, tzLocal.air_purifier_child_lock, tzLocal.air_purifier_led_enable,
            tzLocal.air_purifier_replace_filter,
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
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['NYMANE PENDANT'],
        model: '90504044',
        vendor: 'IKEA',
        description: 'NYMÅNE Pendant lamp',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['STOFTMOLN ceiling/wall lamp WW37'],
        model: 'T2037',
        vendor: 'IKEA',
        description: 'STOFTMOLN ceiling/wall lamp 37 warm light dimmable',
        extend: [tradfriLight()],
    },
    {
        zigbeeModel: ['STOFTMOLN ceiling/wall lamp WW24'],
        model: 'T2035',
        vendor: 'IKEA',
        description: 'STOFTMOLN ceiling/wall lamp 24 warm light dimmable',
        extend: [tradfriLight()],
    },
    {
        zigbeeModel: ['STOFTMOLN ceiling/wall lamp WW10'],
        model: 'T2105',
        vendor: 'IKEA',
        description: 'STOFTMOLN ceiling/wall lamp 10 warm light dimmable',
        extend: [tradfriLight()],
    },
    {
        zigbeeModel: ['STOFTMOLN ceiling/wall lamp WW15'],
        model: 'T2106',
        vendor: 'IKEA',
        description: 'STOFTMOLN ceiling/wall lamp 15 warm light dimmable',
        extend: [tradfriLight()],
    },
    {
        zigbeeModel: ['JETSTROM 40100'],
        model: 'L2208',
        vendor: 'IKEA',
        description: 'JETSTRÖM LED ceiling light panel, smart dimmable/white spectrum, 100x40 cm',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['TRADFRIbulbPAR38WS900lm'],
        model: 'LED2006R9',
        vendor: 'IKEA',
        description: 'TRADFRI E26 PAR38 LED bulb 900 lumen, dimmable, white spectrum, downlight',
        extend: [tradfriLight({colorTemp: true})],
    },
    {
        zigbeeModel: ['Floor lamp WW'],
        model: 'G2015',
        vendor: 'IKEA',
        description: 'PILSKOTT LED floor lamp',
        extend: [tradfriLight()],
    },
    {
        zigbeeModel: ['VINDSTYRKA'],
        model: 'E2112',
        vendor: 'IKEA',
        description: 'Vindstyrka air quality and humidity sensor',
        fromZigbee: [fz.temperature, fz.humidity, fz.pm25, fzLocal.ikea_voc_index],
        toZigbee: [],
        ota: ota.zigbeeOTA,
        exposes: [e.temperature(), e.humidity(), e.pm25(), e.voc_index().withDescription('Sensirion VOC index')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const ep = device.getEndpoint(1);
            await reporting.bind(ep, coordinatorEndpoint,
                ['msTemperatureMeasurement', 'msRelativeHumidity', 'pm25Measurement', 'msIkeaVocIndexMeasurement']);
            reporting.temperature(ep, {min: 60, max: 120});
            reporting.humidity(ep, {min: 60, max: 120});
            await ep.configureReporting('pm25Measurement', [{
                attribute: 'measuredValueIkea',
                minimumReportInterval: 60, maximumReportInterval: 120, reportableChange: 2,
            }]);
            await ep.configureReporting('msIkeaVocIndexMeasurement', [{
                attribute: 'measuredValue',
                minimumReportInterval: 60, maximumReportInterval: 120, reportableChange: 1,
            }]);
        },
    },
    {
        zigbeeModel: ['SYMFONISK sound remote gen2'],
        model: 'E2123',
        vendor: 'IKEA',
        description: 'SYMFONISK sound remote gen2',
        fromZigbee: [fz.battery, legacy.fz.E1744_play_pause, fzLocal.ikea_track_click, fzLocal.ikea_volume_click,
            fzLocal.ikea_volume_hold, fzLocal.ikea_dots_click_v1, fzLocal.ikea_dots_click_v2],
        exposes: [e.battery().withAccess(ea.STATE_GET), e.action(['toggle', 'track_previous', 'track_next', 'volume_up',
            'volume_down', 'volume_up_hold', 'volume_down_hold', 'dots_1_initial_press', 'dots_2_initial_press',
            'dots_1_long_press', 'dots_2_long_press', 'dots_1_short_release', 'dots_2_short_release', 'dots_1_long_release',
            'dots_2_long_release', 'dots_1_double_press', 'dots_2_double_press'])],
        toZigbee: [tz.battery_percentage_remaining],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genPollCtrl']);
            if (endpoint2) {
                await reporting.bind(endpoint2, coordinatorEndpoint, ['tradfriButton']);
            }
            if (endpoint3) {
                await reporting.bind(endpoint3, coordinatorEndpoint, ['tradfriButton']);
            }
            await reporting.batteryVoltage(endpoint1);
        },
    },
    {
        zigbeeModel: ['RODRET Dimmer'],
        model: 'E2201',
        vendor: 'IKEA',
        description: 'RODRET wireless dimmer/power switch',
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_move, fz.command_stop],
        toZigbee: [tz.battery_percentage_remaining],
        exposes: [
            e.battery().withAccess(ea.STATE_GET),
            e.action(['on', 'off', 'brightness_move_down', 'brightness_move_up', 'brightness_stop']),
        ],
        ota: ota.tradfri,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genOnOff', 'genLevelCtrl', 'genPollCtrl'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['ORMANAS LED Strip'],
        model: 'L2112',
        vendor: 'IKEA',
        description: 'ORMANAS LED strip',
        extend: [tradfriLight({colorTemp: true, color: true})],
    },
    {
        zigbeeModel: ['VALLHORN Wireless Motion Sensor'],
        model: 'E2134',
        vendor: 'IKEA',
        description: 'VALLHORN wireless motion sensor',
        fromZigbee: [fz.occupancy, fz.battery, fz.illuminance],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery(), e.illuminance(), e.illuminance_lux()],
        ota: ota.tradfri,
        configure: async (device, cordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint1, cordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint1);
            await reporting.bind(endpoint2, cordinatorEndpoint, ['msOccupancySensing']);
            await reporting.occupancy(endpoint2);
            await reporting.bind(endpoint3, cordinatorEndpoint, ['msIlluminanceMeasurement']);
            await reporting.illuminance(endpoint3);
        },
    },
    {
        zigbeeModel: ['SOMRIG shortcut button'],
        model: 'E2213',
        vendor: 'IKEA',
        description: 'SOMRIG shortcut button',
        fromZigbee: [fz.battery, fzLocal.ikea_dots_click_v2_somrig],
        toZigbee: [tz.battery_percentage_remaining],
        exposes: [
            e.battery().withAccess(ea.STATE_GET), e.action(['1_initial_press', '2_initial_press',
                '1_long_press', '2_long_press', '1_short_release', '2_short_release',
                '1_long_release', '2_long_release', '1_double_press', '2_double_press']),
        ],
        ota: ota.tradfri,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['tradfriButton', 'genPollCtrl']);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['tradfriButton']);
            await reporting.batteryVoltage(endpoint1);
        },
    },
    {
        zigbeeModel: ['PARASOLL Door/Window Sensor'],
        model: 'E2013',
        vendor: 'IKEA',
        description: 'PARASOLL door/window Sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        ota: ota.tradfri,
        exposes: [e.battery(), e.contact()],
    },
];

export default definitions;
module.exports = definitions;
