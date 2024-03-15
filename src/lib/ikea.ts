import {Fz, Tz, OnEvent, Configure, KeyValue, Zh, Range, ModernExtend, Expose} from '../lib/types';
import * as exposes from '../lib/exposes';
import tz from '../converters/toZigbee';
import * as otaBase from '../lib/ota';
import * as constants from '../lib/constants';
import * as reporting from '../lib/reporting';
import * as utils from '../lib/utils';
import * as globalStore from '../lib/store';
import * as zigbeeHerdsman from 'zigbee-herdsman/dist';
import {postfixWithEndpointName, precisionRound, isObject, replaceInArray} from '../lib/utils';
import {LightArgs, light as lightDontUse, ota, setupAttributes, ReportingConfigWithoutAttribute} from '../lib/modernExtend';
import * as semver from 'semver';
const e = exposes.presets;
const ea = exposes.access;

export const bulbOnEvent: OnEvent = async (type, data, device, options, state: KeyValue) => {
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

            device.endpoints[0].write('genLevelCtrl', {onLevel: onLevel});
        }
    }
};

export const configureRemote: Configure = async (device, coordinatorEndpoint, logger) => {
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
    result.ota = otaBase.tradfri;
    result.onEvent = bulbOnEvent;
    if (isObject(args?.colorTemp) && args.colorTemp.viaColor) {
        result.toZigbee = replaceInArray(result.toZigbee, [tz.light_color_colortemp], [tz.light_color_and_colortemp_via_color]);
    }
    if (args?.colorTemp || args?.color) {
        result.exposes.push(e.light_color_options());
    }
    return result;
}

export function tradfriOta(): ModernExtend {
    return ota(otaBase.tradfri);
}

export function tradfriBattery(): ModernExtend {
    const exposes: Expose[] = [
        e.numeric('battery', ea.STATE_GET).withUnit('%')
            .withDescription('Remaining battery in %')
            .withValueMin(0).withValueMax(100).withCategory('diagnostic'),
    ];

    const fromZigbee: Fz.Converter[] = [{
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
    }];

    const toZigbee: Tz.Converter[] = [{
        key: ['battery'],
        convertGet: async (entity, key, meta) => {
            await entity.read('genPowerCfg', ['batteryPercentageRemaining']);
        },
    }];

    const defaultReporting: ReportingConfigWithoutAttribute = {min: '1_HOUR', max: 'MAX', change: 10};

    const configure: Configure = async (device, coordinatorEndpoint, logger) => {
        await setupAttributes(device, coordinatorEndpoint, 'genPowerCfg', [
            {attribute: 'batteryPercentageRemaining', ...defaultReporting},
        ], logger);
    };

    return {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
}

export function tradfriConfigureRemote(): ModernExtend {
    const configure: Configure = async (device, coordinatorEndpoint, logger) => {
        // Firmware 2.3.075 >= only supports binding to endpoint, before only to group
        // - https://github.com/Koenkk/zigbee2mqtt/issues/2772#issuecomment-577389281
        // - https://github.com/Koenkk/zigbee2mqtt/issues/7716
        const endpoint = device.getEndpoint(1);
        const version = device.softwareBuildID.split('.').map((n) => Number(n));
        const bindTarget = version[0] > 2 || (version[0] == 2 && version[1] > 3) || (version[0] == 2 && version[1] == 3 && version[2] >= 75) ?
            coordinatorEndpoint : constants.defaultBindGroup;
        await endpoint.bind('genOnOff', bindTarget);
    };

    return {configure, isModernExtend: true};
}

export const manufacturerOptions = {manufacturerCode: zigbeeHerdsman.Zcl.ManufacturerCode.IKEA_OF_SWEDEN};

export const configureGenPollCtrl = async (device: Zh.Device, endpoint: Zh.Endpoint) => {
    // NOTE: Firmware 24.4.11 introduce genPollCtrl
    //       after OTA update the checkinInterval is 4 which spams the network a lot
    //       removing + factory resetting has it set to 172800, we set the same value here
    //       so people do not need to update.
    if (Number(device?.softwareBuildID?.split('.')[0]) >= 24) {
        await endpoint.write('genPollCtrl', {'checkinInterval': 172800});
    }
};

export const fromZigbee = {
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

export const toZigbee = {
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
