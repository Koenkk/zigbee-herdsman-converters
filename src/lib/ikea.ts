import * as semver from 'semver';
import {Zcl} from 'zigbee-herdsman';

import tz from '../converters/toZigbee';
import * as constants from '../lib/constants';
import {presets, access, options} from '../lib/exposes';
import {
    LightArgs,
    light as lightDontUse,
    ota,
    ReportingConfigWithoutAttribute,
    timeLookup,
    numeric,
    NumericArgs,
    setupConfigureForBinding,
    setupConfigureForReporting,
    deviceAddCustomCluster,
} from '../lib/modernExtend';
import {tradfri as ikea} from '../lib/ota';
import * as reporting from '../lib/reporting';
import * as globalStore from '../lib/store';
import {Fz, Tz, OnEvent, Configure, KeyValue, Range, ModernExtend, Expose, KeyValueAny} from '../lib/types';
import {
    postfixWithEndpointName,
    precisionRound,
    isObject,
    replaceInArray,
    isLegacyEnabled,
    hasAlreadyProcessedMessage,
    assertString,
    getFromLookup,
    mapNumberRange,
    getEndpointName,
} from '../lib/utils';

export const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.IKEA_OF_SWEDEN};

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
                await endpoint.configureReporting(c.cluster.name, [
                    {
                        attribute: c.attribute.name,
                        minimumReportInterval: c.minimumReportInterval,
                        maximumReportInterval: c.maximumReportInterval,
                        reportableChange: c.reportableChange,
                    },
                ]);
            }
        }

        // NOTE: execute_if_off default is false
        //       we only restore if true, to save unneeded network writes
        const colorOptions = state.color_options as KeyValue;
        if (colorOptions?.execute_if_off === true) {
            await device.endpoints[0].write('lightingColorCtrl', {options: 1});
        }
        const levelConfig = state.level_config as KeyValue;
        if (levelConfig?.execute_if_off === true) {
            await device.endpoints[0].write('genLevelCtrl', {options: 1});
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

            await device.endpoints[0].write('genLevelCtrl', {onLevel: onLevel});
        }
    }
};

export function ikeaLight(args?: Omit<LightArgs, 'colorTemp'> & {colorTemp?: true | {range: Range; viaColor: true}}) {
    const colorTemp: {range: Range} = args?.colorTemp ? (args.colorTemp === true ? {range: [250, 454]} : args.colorTemp) : undefined;
    const result = lightDontUse({...args, colorTemp});
    result.ota = ikea;
    result.onEvent = bulbOnEvent;
    if (isObject(args?.colorTemp) && args.colorTemp.viaColor) {
        result.toZigbee = replaceInArray(result.toZigbee, [tz.light_color_colortemp], [tz.light_color_and_colortemp_via_color]);
    }
    if (args?.colorTemp || args?.color) {
        result.exposes.push(presets.light_color_options());
    }

    // Never use a transition when transitioning to OFF as this turns on the light when sending OFF twice
    // when the bulb has firmware > 1.0.012.
    // https://github.com/Koenkk/zigbee2mqtt/issues/19211
    // https://github.com/Koenkk/zigbee2mqtt/issues/22030#issuecomment-2292063140
    // Some old softwareBuildID are not a valid semver, e.g. `1.1.1.0-5.7.2.0`
    // https://github.com/Koenkk/zigbee2mqtt/issues/23863
    result.meta = {
        ...result.meta,
        noOffTransition: (entity) => {
            const softwareBuildID = entity.getDevice().softwareBuildID;
            return softwareBuildID && !softwareBuildID.includes('-') && semver.gt(softwareBuildID ?? '0.0.0', '1.0.021', true);
        },
    };

    return result;
}

export function ikeaOta(): ModernExtend {
    return ota(ikea);
}

export function ikeaBattery(): ModernExtend {
    const exposes: Expose[] = [
        presets
            .numeric('battery', access.STATE_GET)
            .withUnit('%')
            .withDescription('Remaining battery in %')
            .withValueMin(0)
            .withValueMax(100)
            .withCategory('diagnostic'),
    ];

    const fromZigbee: Fz.Converter[] = [
        {
            cluster: 'genPowerCfg',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const payload: KeyValue = {};
                if (msg.data.hasOwnProperty('batteryPercentageRemaining') && msg.data['batteryPercentageRemaining'] < 255) {
                    // Some devices do not comply to the ZCL and report a
                    // batteryPercentageRemaining of 100 when the battery is full (should be 200).
                    let dividePercentage = true;
                    if (model.model === 'E2103') {
                        if (semver.lt(meta.device.softwareBuildID, '24.4.13', true)) {
                            dividePercentage = false;
                        }
                    } else {
                        // IKEA corrected this on newer remote fw version, but many people are still
                        // 2.2.010 which is the last version supporting group bindings. We try to be
                        // smart and pick the correct one for IKEA remotes.
                        // If softwareBuildID is below 2.4.0 it should not be divided
                        if (semver.lt(meta.device.softwareBuildID, '2.4.0', true)) {
                            dividePercentage = false;
                        }
                    }

                    let percentage = msg.data['batteryPercentageRemaining'];
                    percentage = dividePercentage ? percentage / 2 : percentage;
                    payload.battery = precisionRound(percentage, 2);
                }

                return payload;
            },
        },
    ];

    const toZigbee: Tz.Converter[] = [
        {
            key: ['battery'],
            convertGet: async (entity, key, meta) => {
                await entity.read('genPowerCfg', ['batteryPercentageRemaining']);
            },
        },
    ];

    const defaultReporting: ReportingConfigWithoutAttribute = {min: '1_HOUR', max: 'MAX', change: 10};

    const configure: Configure[] = [setupConfigureForReporting('genPowerCfg', 'batteryPercentageRemaining', defaultReporting, access.STATE_GET)];

    return {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
}

export function ikeaConfigureStyrbar(): ModernExtend {
    const configure: Configure[] = [
        async (device, coordinatorEndpoint, definition) => {
            // https://github.com/Koenkk/zigbee2mqtt/issues/15725
            if (semver.gte(device.softwareBuildID, '2.4.0', true)) {
                const endpoint = device.getEndpoint(1);
                await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genScenes']);
            }
        },
    ];

    return {configure, isModernExtend: true};
}

export function ikeaConfigureRemote(): ModernExtend {
    const configure: Configure[] = [
        async (device, coordinatorEndpoint, definition) => {
            // Firmware 2.3.075 >= only supports binding to endpoint, before only to group
            // - https://github.com/Koenkk/zigbee2mqtt/issues/2772#issuecomment-577389281
            // - https://github.com/Koenkk/zigbee2mqtt/issues/7716
            const endpoint = device.getEndpoint(1);
            const version = device.softwareBuildID.split('.').map((n) => Number(n));
            const bindTarget =
                version[0] > 2 || (version[0] == 2 && version[1] > 3) || (version[0] == 2 && version[1] == 3 && version[2] >= 75)
                    ? coordinatorEndpoint
                    : constants.defaultBindGroup;
            await endpoint.bind('genOnOff', bindTarget);
        },
    ];

    return {configure, isModernExtend: true};
}

export function ikeaAirPurifier(): ModernExtend {
    const exposes: Expose[] = [
        presets.fan().withModes(['off', 'auto', '1', '2', '3', '4', '5', '6', '7', '8', '9']),
        presets.numeric('fan_speed', access.STATE_GET).withValueMin(0).withValueMax(9).withDescription('Current fan speed'),
        presets
            .numeric('pm25', access.STATE_GET)
            .withLabel('PM25')
            .withUnit('µg/m³')
            .withDescription('Measured PM2.5 (particulate matter) concentration'),
        presets
            .enum('air_quality', access.STATE_GET, ['excellent', 'good', 'moderate', 'poor', 'unhealthy', 'hazardous', 'out_of_range', 'unknown'])
            .withDescription('Calculated air quality'),
        presets.binary('led_enable', access.ALL, true, false).withDescription('Controls the LED').withCategory('config'),
        presets.binary('child_lock', access.ALL, 'LOCK', 'UNLOCK').withDescription('Controls physical input on the device').withCategory('config'),
        presets
            .binary('replace_filter', access.STATE_GET, true, false)
            .withDescription('Indicates if the filter is older than 6 months and needs replacing')
            .withCategory('diagnostic'),
        presets
            .numeric('filter_age', access.STATE_GET)
            .withUnit('minutes')
            .withDescription('Duration the filter has been used')
            .withCategory('diagnostic'),
        presets
            .numeric('device_age', access.STATE_GET)
            .withUnit('minutes')
            .withDescription('Duration the air purifier has been used')
            .withCategory('diagnostic'),
    ];

    const fromZigbee: Fz.Converter[] = [
        {
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

                    pm25 = pm25 == 65535 ? -1 : pm25;

                    state[pm25Property] = pm25;
                    state[airQualityProperty] = airQuality;
                }

                if (msg.data.hasOwnProperty('filterRunTime')) {
                    // Filter needs to be replaced after 6 months
                    state['replace_filter'] = parseInt(msg.data['filterRunTime']) >= 259200;
                    state['filter_age'] = parseInt(msg.data['filterRunTime']);
                }

                if (msg.data.hasOwnProperty('deviceRunTime')) {
                    state['device_age'] = parseInt(msg.data['deviceRunTime']);
                }

                if (msg.data.hasOwnProperty('controlPanelLight')) {
                    state['led_enable'] = msg.data['controlPanelLight'] == 0;
                }

                if (msg.data.hasOwnProperty('childLock')) {
                    state['child_lock'] = msg.data['childLock'] == 0 ? 'UNLOCK' : 'LOCK';
                }

                if (msg.data.hasOwnProperty('fanSpeed')) {
                    let fanSpeed = msg.data['fanSpeed'];
                    if (fanSpeed >= 10) {
                        fanSpeed = ((fanSpeed - 5) * 2) / 10;
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
                    state['fan_state'] = fanMode === 'off' ? 'OFF' : 'ON';
                }

                return state;
            },
        },
    ];

    const toZigbee: Tz.Converter[] = [
        {
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
                        fanMode = (Number(value) / 2.0) * 10 + 5;
                }

                await entity.write('manuSpecificIkeaAirPurifier', {fanMode: fanMode}, manufacturerOptions);
                return {state: {fan_mode: value, fan_state: value === 'off' ? 'OFF' : 'ON'}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificIkeaAirPurifier', ['fanMode']);
            },
        },
        {
            key: ['fan_speed'],
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificIkeaAirPurifier', ['fanSpeed']);
            },
        },
        {
            key: ['pm25', 'air_quality'],
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificIkeaAirPurifier', ['particulateMatter25Measurement']);
            },
        },
        {
            key: ['replace_filter', 'filter_age'],
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificIkeaAirPurifier', ['filterRunTime']);
            },
        },
        {
            key: ['device_age'],
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificIkeaAirPurifier', ['deviceRunTime']);
            },
        },
        {
            key: ['child_lock'],
            convertSet: async (entity, key, value, meta) => {
                assertString(value);
                await entity.write('manuSpecificIkeaAirPurifier', {childLock: value.toLowerCase() === 'unlock' ? 0 : 1}, manufacturerOptions);
                return {state: {child_lock: value.toLowerCase() === 'lock' ? 'LOCK' : 'UNLOCK'}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificIkeaAirPurifier', ['childLock']);
            },
        },
        {
            key: ['led_enable'],
            convertSet: async (entity, key, value, meta) => {
                await entity.write('manuSpecificIkeaAirPurifier', {controlPanelLight: value ? 0 : 1}, manufacturerOptions);
                return {state: {led_enable: value ? true : false}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificIkeaAirPurifier', ['controlPanelLight']);
            },
        },
    ];

    const configure: Configure[] = [
        async (device, coordinatorEndpoint, definition) => {
            const endpoint = device.getEndpoint(1);

            await reporting.bind(endpoint, coordinatorEndpoint, ['manuSpecificIkeaAirPurifier']);
            await endpoint.configureReporting(
                'manuSpecificIkeaAirPurifier',
                [
                    {
                        attribute: 'particulateMatter25Measurement',
                        minimumReportInterval: timeLookup['1_MINUTE'],
                        maximumReportInterval: timeLookup['1_HOUR'],
                        reportableChange: 1,
                    },
                ],
                manufacturerOptions,
            );
            await endpoint.configureReporting(
                'manuSpecificIkeaAirPurifier',
                [
                    {
                        attribute: 'filterRunTime',
                        minimumReportInterval: timeLookup['1_HOUR'],
                        maximumReportInterval: timeLookup['1_HOUR'],
                        reportableChange: 0,
                    },
                ],
                manufacturerOptions,
            );
            await endpoint.configureReporting(
                'manuSpecificIkeaAirPurifier',
                [{attribute: 'fanMode', minimumReportInterval: 0, maximumReportInterval: timeLookup['1_HOUR'], reportableChange: 1}],
                manufacturerOptions,
            );
            await endpoint.configureReporting(
                'manuSpecificIkeaAirPurifier',
                [{attribute: 'fanSpeed', minimumReportInterval: 0, maximumReportInterval: timeLookup['1_HOUR'], reportableChange: 1}],
                manufacturerOptions,
            );

            await endpoint.read('manuSpecificIkeaAirPurifier', ['controlPanelLight', 'childLock', 'filterRunTime']);
        },
    ];

    return {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
}

export function ikeaVoc(args?: Partial<NumericArgs>) {
    return numeric({
        name: 'voc_index',
        label: 'VOC index',
        cluster: 'manuSpecificIkeaVocIndexMeasurement',
        attribute: 'measuredValue',
        reporting: {min: '1_MINUTE', max: '2_MINUTES', change: 1},
        description: 'Sensirion VOC index',
        access: 'STATE',
        ...args,
    });
}

export function ikeaConfigureGenPollCtrl(args?: {endpointId: number}): ModernExtend {
    args = {endpointId: 1, ...args};
    const configure: Configure[] = [
        async (device, coordinatorEndpoint, definition) => {
            const endpoint = device.getEndpoint(args.endpointId);
            if (Number(device?.softwareBuildID?.split('.')[0]) >= 24) {
                await endpoint.write('genPollCtrl', {checkinInterval: 172800});
            }
        },
    ];

    return {configure, isModernExtend: true};
}

export function tradfriOccupancy(): ModernExtend {
    const exposes: Expose[] = [
        presets.binary('occupancy', access.STATE, true, false).withDescription('Indicates whether the device detected occupancy'),
        presets
            .binary('illuminance_above_threshold', access.STATE, true, false)
            .withDescription('Indicates whether the device detected bright light (works only in night mode)')
            .withCategory('diagnostic'),
    ];

    const fromZigbee: Fz.Converter[] = [
        {
            cluster: 'genOnOff',
            type: 'commandOnWithTimedOff',
            options: [options.occupancy_timeout(), options.illuminance_below_threshold_check()],
            convert: (model, msg, publish, options, meta) => {
                const onlyWhenOnFlag = (msg.data.ctrlbits & 1) != 0;
                if (
                    onlyWhenOnFlag &&
                    (!options || !options.hasOwnProperty('illuminance_below_threshold_check') || options.illuminance_below_threshold_check) &&
                    !globalStore.hasValue(msg.endpoint, 'timer')
                )
                    return;

                const timeout = options && options.hasOwnProperty('occupancy_timeout') ? Number(options.occupancy_timeout) : msg.data.ontime / 10;

                // Stop existing timer because motion is detected and set a new one.
                clearTimeout(globalStore.getValue(msg.endpoint, 'timer'));
                globalStore.clearValue(msg.endpoint, 'timer');

                if (timeout !== 0) {
                    const timer = setTimeout(() => {
                        publish({occupancy: false});
                        globalStore.clearValue(msg.endpoint, 'timer');
                    }, timeout * 1000);
                    globalStore.putValue(msg.endpoint, 'timer', timer);
                }

                return {occupancy: true, illuminance_above_threshold: onlyWhenOnFlag};
            },
        },
    ];

    return {exposes, fromZigbee, isModernExtend: true};
}

export function tradfriRequestedBrightness(): ModernExtend {
    const exposes: Expose[] = [
        presets.numeric('requested_brightness_level', access.STATE).withValueMin(76).withValueMax(254).withCategory('diagnostic'),
        presets.numeric('requested_brightness_percent', access.STATE).withValueMin(30).withValueMax(100).withCategory('diagnostic'),
    ];

    const fromZigbee: Fz.Converter[] = [
        {
            // Possible values are 76 (30%) or 254 (100%)
            cluster: 'genLevelCtrl',
            type: 'commandMoveToLevelWithOnOff',
            convert: (model, msg, publish, options, meta) => {
                return {
                    requested_brightness_level: msg.data.level,
                    requested_brightness_percent: mapNumberRange(msg.data.level, 0, 254, 0, 100),
                };
            },
        },
    ];

    return {exposes, fromZigbee, isModernExtend: true};
}

export function tradfriCommandsOnOff(): ModernExtend {
    const exposes: Expose[] = [presets.action(['toggle'])];

    const fromZigbee: Fz.Converter[] = [
        {
            cluster: 'genOnOff',
            type: 'commandToggle',
            convert: (model, msg, publish, options, meta) => {
                return {action: postfixWithEndpointName('toggle', msg, model, meta)};
            },
        },
    ];

    return {exposes, fromZigbee, isModernExtend: true};
}

export function tradfriCommandsLevelCtrl(): ModernExtend {
    const actionLookup: KeyValueAny = {
        commandStepWithOnOff: 'brightness_up_click',
        commandStep: 'brightness_down_click',
        commandMoveWithOnOff: 'brightness_up_hold',
        commandStopWithOnOff: 'brightness_up_release',
        commandMove: 'brightness_down_hold',
        commandStop: 'brightness_down_release',
        commandMoveToLevelWithOnOff: 'toggle_hold',
    };

    const exposes: Expose[] = [presets.action(Object.values(actionLookup))];

    const fromZigbee: Fz.Converter[] = [
        {
            cluster: 'genLevelCtrl',
            type: [
                'commandStepWithOnOff',
                'commandStep',
                'commandMoveWithOnOff',
                'commandStopWithOnOff',
                'commandMove',
                'commandStop',
                'commandMoveToLevelWithOnOff',
            ],
            convert: (model, msg, publish, options, meta) => {
                return {action: actionLookup[msg.type]};
            },
        },
    ];

    return {exposes, fromZigbee, isModernExtend: true};
}

export function styrbarCommandOn(): ModernExtend {
    // The STYRBAR sends an on +- 500ms after the arrow release. We don't want to send the ON action in this case.
    // https://github.com/Koenkk/zigbee2mqtt/issues/13335
    const exposes: Expose[] = [presets.action(['on'])];

    const fromZigbee: Fz.Converter[] = [
        {
            cluster: 'genOnOff',
            type: 'commandOn',
            convert: (model, msg, publish, options, meta) => {
                if (hasAlreadyProcessedMessage(msg, model)) return;
                const arrowReleaseAgo = Date.now() - globalStore.getValue(msg.endpoint, 'arrow_release', 0);
                if (arrowReleaseAgo > 700) {
                    return {action: 'on'};
                }
            },
        },
    ];

    return {exposes, fromZigbee, isModernExtend: true};
}

export function ikeaDotsClick(args: {actionLookup?: KeyValue; dotsPrefix?: boolean; endpointNames: string[]}): ModernExtend {
    args = {
        actionLookup: {
            commandAction1: 'initial_press',
            commandAction2: 'long_press',
            commandAction3: 'short_release',
            commandAction4: 'long_release',
            commandAction6: 'double_press',
        },
        dotsPrefix: false,
        ...args,
    };
    const actions = args.endpointNames
        .map((b) => Object.values(args.actionLookup).map((a) => (args.dotsPrefix ? `dots_${b}_${a}` : `${b}_${a}`)))
        .flat();
    const exposes: Expose[] = [presets.action(actions)];

    const fromZigbee: Fz.Converter[] = [
        {
            // For remotes with firmware 1.0.012 (20211214)
            cluster: 64639,
            type: 'raw',
            convert: (model, msg, publish, options, meta) => {
                if (!Buffer.isBuffer(msg.data)) return;
                let action;
                const button = msg.data[5];
                switch (msg.data[6]) {
                    case 1:
                        action = 'initial_press';
                        break;
                    case 2:
                        action = 'double_press';
                        break;
                    case 3:
                        action = 'long_press';
                        break;
                }

                return {action: args.dotsPrefix ? `dots_${button}_${action}` : `${button}_${action}`};
            },
        },
        {
            // For remotes with firmware 1.0.32 (20221219) an SOMRIG
            cluster: 'tradfriButton',
            type: ['commandAction1', 'commandAction2', 'commandAction3', 'commandAction4', 'commandAction6'],
            convert: (model, msg, publish, options, meta) => {
                const button = getEndpointName(msg, model, meta);
                const action = getFromLookup(msg.type, args.actionLookup);
                return {action: args.dotsPrefix ? `dots_${button}_${action}` : `${button}_${action}`};
            },
        },
    ];

    const configure: Configure[] = [setupConfigureForBinding('tradfriButton', 'output', args.endpointNames)];

    return {exposes, fromZigbee, configure, isModernExtend: true};
}

export function ikeaArrowClick(args?: {styrbar?: boolean; bind?: boolean}): ModernExtend {
    args = {styrbar: false, bind: true, ...args};
    const actions = ['arrow_left_click', 'arrow_left_hold', 'arrow_left_release', 'arrow_right_click', 'arrow_right_hold', 'arrow_right_release'];
    const exposes: Expose[] = [presets.action(actions)];

    const fromZigbee: Fz.Converter[] = [
        {
            cluster: 'genScenes',
            type: 'commandTradfriArrowSingle',
            convert: (model, msg, publish, options, meta) => {
                if (hasAlreadyProcessedMessage(msg, model)) return;
                if (msg.data.value === 2) return; // This is send on toggle hold

                const direction = msg.data.value === 257 ? 'left' : 'right';
                return {action: `arrow_${direction}_click`};
            },
        },
        {
            cluster: 'genScenes',
            type: 'commandTradfriArrowHold',
            convert: (model, msg, publish, options, meta) => {
                if (hasAlreadyProcessedMessage(msg, model)) return;
                const direction = msg.data.value === 3329 ? 'left' : 'right';
                globalStore.putValue(msg.endpoint, 'direction', direction);
                return {action: `arrow_${direction}_hold`};
            },
        },
        {
            cluster: 'genScenes',
            type: 'commandTradfriArrowRelease',
            options: [options.legacy()],
            convert: (model, msg, publish, options, meta) => {
                if (hasAlreadyProcessedMessage(msg, model)) return;
                if (args.styrbar) globalStore.putValue(msg.endpoint, 'arrow_release', Date.now());
                const direction = globalStore.getValue(msg.endpoint, 'direction');
                if (direction) {
                    globalStore.clearValue(msg.endpoint, 'direction');
                    const duration = msg.data.value / 1000;
                    const result = {action: `arrow_${direction}_release`, duration, action_duration: duration};
                    if (!isLegacyEnabled(options)) delete result.duration;
                    return result;
                }
            },
        },
    ];

    const result: ModernExtend = {exposes, fromZigbee, isModernExtend: true};

    if (args.bind) result.configure = [setupConfigureForBinding('genScenes', 'output')];

    return result;
}

export function ikeaMediaCommands(): ModernExtend {
    const actions = ['track_previous', 'track_next', 'volume_up', 'volume_down', 'volume_up_hold', 'volume_down_hold'];
    const exposes: Expose[] = [presets.action(actions)];

    const fromZigbee: Fz.Converter[] = [
        {
            cluster: 'genLevelCtrl',
            type: 'commandMoveWithOnOff',
            convert: (model, msg, publish, options, meta) => {
                if (hasAlreadyProcessedMessage(msg, model)) return;
                const direction = msg.data.movemode === 1 ? 'down' : 'up';
                return {action: `volume_${direction}`};
            },
        },
        {
            cluster: 'genLevelCtrl',
            type: 'commandMove',
            convert: (model, msg, publish, options, meta) => {
                if (hasAlreadyProcessedMessage(msg, model)) return;
                const direction = msg.data.movemode === 1 ? 'down_hold' : 'up_hold';
                return {action: `volume_${direction}`};
            },
        },
        {
            cluster: 'genLevelCtrl',
            type: 'commandStep',
            convert: (model, msg, publish, options, meta) => {
                if (hasAlreadyProcessedMessage(msg, model)) return;
                const direction = msg.data.stepmode === 1 ? 'previous' : 'next';
                return {action: `track_${direction}`};
            },
        },
    ];

    const configure: Configure[] = [setupConfigureForBinding('genLevelCtrl', 'output')];

    return {exposes, fromZigbee, configure, isModernExtend: true};
}

export function addCustomClusterManuSpecificIkeaAirPurifier(): ModernExtend {
    return deviceAddCustomCluster('manuSpecificIkeaAirPurifier', {
        ID: 0xfc7d,
        manufacturerCode: Zcl.ManufacturerCode.IKEA_OF_SWEDEN,
        attributes: {
            filterRunTime: {ID: 0x0000, type: Zcl.DataType.UINT32},
            replaceFilter: {ID: 0x0001, type: Zcl.DataType.UINT8},
            filterLifeTime: {ID: 0x0002, type: Zcl.DataType.UINT32},
            controlPanelLight: {ID: 0x0003, type: Zcl.DataType.BOOLEAN},
            particulateMatter25Measurement: {ID: 0x0004, type: Zcl.DataType.UINT16},
            childLock: {ID: 0x0005, type: Zcl.DataType.BOOLEAN},
            fanMode: {ID: 0x0006, type: Zcl.DataType.UINT8},
            fanSpeed: {ID: 0x0007, type: Zcl.DataType.UINT8},
            deviceRunTime: {ID: 0x0008, type: Zcl.DataType.UINT32},
        },
        commands: {},
        commandsResponse: {},
    });
}

export function addCustomClusterManuSpecificIkeaVocIndexMeasurement(): ModernExtend {
    return deviceAddCustomCluster('manuSpecificIkeaVocIndexMeasurement', {
        ID: 0xfc7e,
        manufacturerCode: Zcl.ManufacturerCode.IKEA_OF_SWEDEN,
        attributes: {
            measuredValue: {ID: 0x0000, type: Zcl.DataType.SINGLE_PREC},
            measuredMinValue: {ID: 0x0001, type: Zcl.DataType.SINGLE_PREC},
            measuredMaxValue: {ID: 0x0002, type: Zcl.DataType.SINGLE_PREC},
        },
        commands: {},
        commandsResponse: {},
    });
}

// Seems to be present on newer IKEA devices like: VINDSTYRKA, RODRET, and BADRING
//  Also observed on some older devices that had a post DIRIGERA release fw update.
//  No attributes known.
export function addCustomClusterManuSpecificIkeaUnknown(): ModernExtend {
    return deviceAddCustomCluster('manuSpecificIkeaUnknown', {
        ID: 0xfc7c,
        manufacturerCode: Zcl.ManufacturerCode.IKEA_OF_SWEDEN,
        attributes: {},
        commands: {},
        commandsResponse: {},
    });
}

export const legacy = {
    fromZigbee: {
        E1744_play_pause: {
            cluster: 'genOnOff',
            type: 'commandToggle',
            options: [options.legacy()],
            convert: (model, msg, publish, options, meta) => {
                if (isLegacyEnabled(options)) {
                    return {action: 'play_pause'};
                }
            },
        } satisfies Fz.Converter,
        E1744_skip: {
            cluster: 'genLevelCtrl',
            type: 'commandStep',
            options: [options.legacy()],
            convert: (model, msg, publish, options, meta) => {
                if (isLegacyEnabled(options)) {
                    const direction = msg.data.stepmode === 1 ? 'backward' : 'forward';
                    return {
                        action: `skip_${direction}`,
                        step_size: msg.data.stepsize,
                        transition_time: msg.data.transtime,
                    };
                }
            },
        } satisfies Fz.Converter,
        E1743_brightness_down: {
            cluster: 'genLevelCtrl',
            type: 'commandMove',
            options: [options.legacy()],
            convert: (model, msg, publish, options, meta) => {
                if (isLegacyEnabled(options)) {
                    return {click: 'brightness_down'};
                }
            },
        } satisfies Fz.Converter,
        E1743_brightness_up: {
            cluster: 'genLevelCtrl',
            type: 'commandMoveWithOnOff',
            options: [options.legacy()],
            convert: (model, msg, publish, options, meta) => {
                if (isLegacyEnabled(options)) {
                    return {click: 'brightness_up'};
                }
            },
        } satisfies Fz.Converter,
        E1743_brightness_stop: {
            cluster: 'genLevelCtrl',
            type: 'commandStopWithOnOff',
            options: [options.legacy()],
            convert: (model, msg, publish, options, meta) => {
                if (isLegacyEnabled(options)) {
                    return {click: 'brightness_stop'};
                }
            },
        } satisfies Fz.Converter,
    },
    toZigbee: {},
};
