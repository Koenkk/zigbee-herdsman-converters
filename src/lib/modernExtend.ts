import {Zcl} from 'zigbee-herdsman';
import {ClusterDefinition} from 'zigbee-herdsman/dist/zspec/zcl/definition/tstype';

import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as globalLegacy from '../lib/legacy';
import {logger} from '../lib/logger';
import {zigbeeOTA} from '../lib/ota';
import * as globalStore from '../lib/store';
import {presets as e, access as ea, options as opt, Cover, Numeric} from './exposes';
import {configure as lightConfigure} from './light';
import {
    Fz,
    Tz,
    ModernExtend,
    Range,
    Zh,
    DefinitionOta,
    OnEvent,
    Access,
    KeyValueString,
    KeyValue,
    Configure,
    Expose,
    DefinitionMeta,
    KeyValueAny,
    DefinitionExposesFunction,
    BatteryNonLinearVoltage,
    BatteryLinearVoltage,
} from './types';
import {
    getFromLookupByValue,
    isString,
    isNumber,
    isObject,
    isEndpoint,
    getFromLookup,
    getEndpointName,
    assertNumber,
    postfixWithEndpointName,
    noOccupancySince,
    precisionRound,
    batteryVoltageToPercentage,
    getOptions,
    hasAlreadyProcessedMessage,
    addActionGroup,
    isLegacyEnabled,
    flatten,
} from './utils';

function getEndpointsWithCluster(device: Zh.Device, cluster: string | number, type: 'input' | 'output') {
    if (!device.endpoints) {
        throw new Error(device.ieeeAddr + ' ' + device.endpoints);
    }
    const endpoints =
        type === 'input'
            ? device.endpoints.filter((ep) => ep.getInputClusters().find((c) => (isNumber(cluster) ? c.ID === cluster : c.name === cluster)))
            : device.endpoints.filter((ep) => ep.getOutputClusters().find((c) => (isNumber(cluster) ? c.ID === cluster : c.name === cluster)));
    if (endpoints.length === 0) {
        throw new Error(`Device ${device.ieeeAddr} has no ${type} cluster ${cluster}`);
    }
    return endpoints;
}

export const timeLookup = {
    MAX: 65000,
    '4_HOURS': 14400,
    '1_HOUR': 3600,
    '30_MINUTES': 1800,
    '5_MINUTES': 300,
    '2_MINUTES': 120,
    '1_MINUTE': 60,
    '10_SECONDS': 10,
    '5_SECONDS': 5,
    '1_SECOND': 1,
    MIN: 0,
};

type ReportingConfigTime = number | keyof typeof timeLookup;
type ReportingConfigAttribute = string | number | {ID: number; type: number};
type ReportingConfig = {min: ReportingConfigTime; max: ReportingConfigTime; change: number | [number, number]; attribute: ReportingConfigAttribute};
export type ReportingConfigWithoutAttribute = Omit<ReportingConfig, 'attribute'>;

function convertReportingConfigTime(time: ReportingConfigTime): number {
    if (isString(time)) {
        if (!(time in timeLookup)) throw new Error(`Reporting time '${time}' is unknown`);
        return timeLookup[time];
    } else {
        return time;
    }
}

export async function setupAttributes(
    entity: Zh.Device | Zh.Endpoint,
    coordinatorEndpoint: Zh.Endpoint,
    cluster: string | number,
    config: ReportingConfig[],
    configureReporting: boolean = true,
    read: boolean = true,
) {
    const endpoints = isEndpoint(entity) ? [entity] : getEndpointsWithCluster(entity, cluster, 'input');
    const ieeeAddr = isEndpoint(entity) ? entity.deviceIeeeAddress : entity.ieeeAddr;
    for (const endpoint of endpoints) {
        logger.debug(
            `Configure reporting: ${configureReporting}, read: ${read} for ${ieeeAddr}/${endpoint.ID} ${cluster} ${JSON.stringify(config)}`,
            'zhc:setupattribute',
        );
        if (configureReporting) {
            await endpoint.bind(cluster, coordinatorEndpoint);
            await endpoint.configureReporting(
                cluster,
                config.map((a) => ({
                    minimumReportInterval: convertReportingConfigTime(a.min),
                    maximumReportInterval: convertReportingConfigTime(a.max),
                    reportableChange: a.change,
                    attribute: a.attribute,
                })),
            );
        }
        if (read) {
            try {
                // Don't fail configuration if reading this attribute fails
                // https://github.com/Koenkk/zigbee-herdsman-converters/pull/7074
                await endpoint.read(
                    cluster,
                    config.map((a) => (isString(a) ? a : isObject(a.attribute) ? a.attribute.ID : a.attribute)),
                );
            } catch (e) {
                logger.debug(`Reading attribute failed: ${e}`, 'zhc:setupattribute');
            }
        }
    }
}

export function setupConfigureForReporting(
    cluster: string | number,
    attribute: ReportingConfigAttribute,
    config: ReportingConfigWithoutAttribute,
    access: Access,
    endpointNames?: string[],
) {
    const configureReporting = !!config;
    const read = !!(access & ea.GET);
    if (configureReporting || read) {
        const configure: Configure = async (device, coordinatorEndpoint, definition) => {
            const reportConfig = config ? {...config, attribute: attribute} : {attribute, min: -1, max: -1, change: -1};
            let entities: (Zh.Device | Zh.Endpoint)[] = [device];
            if (endpointNames) {
                const definitionEndpoints = definition.endpoint(device);
                const endpointIds = endpointNames.map((e) => definitionEndpoints[e]);
                entities = device.endpoints.filter((e) => endpointIds.includes(e.ID));
            }

            for (const entity of entities) {
                await setupAttributes(entity, coordinatorEndpoint, cluster, [reportConfig], configureReporting, read);
            }
        };
        return configure;
    } else {
        return undefined;
    }
}

export function setupConfigureForBinding(cluster: string | number, clusterType: 'input' | 'output', endpointNames?: string[]) {
    const configure: Configure = async (device, coordinatorEndpoint, definition) => {
        if (endpointNames) {
            const definitionEndpoints = definition.endpoint(device);
            const endpointIds = endpointNames.map((e) => definitionEndpoints[e]);
            const endpoints = device.endpoints.filter((e) => endpointIds.includes(e.ID));
            for (const endpoint of endpoints) {
                await endpoint.bind(cluster, coordinatorEndpoint);
            }
        } else {
            const endpoints = getEndpointsWithCluster(device, cluster, clusterType);
            for (const endpoint of endpoints) {
                await endpoint.bind(cluster, coordinatorEndpoint);
            }
        }
    };
    return configure;
}

export function setupConfigureForReading(cluster: string | number, attributes: (string | number)[], endpointNames?: string[]) {
    const configure: Configure = async (device, coordinatorEndpoint, definition) => {
        if (endpointNames) {
            const definitionEndpoints = definition.endpoint(device);
            const endpointIds = endpointNames.map((e) => definitionEndpoints[e]);
            const endpoints = device.endpoints.filter((e) => endpointIds.includes(e.ID));
            for (const endpoint of endpoints) {
                await endpoint.read(cluster, attributes);
            }
        } else {
            const endpoints = getEndpointsWithCluster(device, cluster, 'input');
            for (const endpoint of endpoints) {
                await endpoint.read(cluster, attributes);
            }
        }
    };
    return configure;
}

export function determineEndpoint(entity: Zh.Endpoint | Zh.Group, meta: Tz.Meta, cluster: string | number): Zh.Endpoint | Zh.Group {
    const {device, endpoint_name} = meta;
    if (endpoint_name !== undefined) {
        // In case an explicit endpoint is given, always send it to that endpoint
        return entity;
    } else {
        // In case no endpoint is given, match the first endpoint which support the cluster.
        return device.endpoints.find((e) => e.supportsInputCluster(cluster)) ?? device.endpoints[0];
    }
}

// #region General

export function forceDeviceType(args: {type: 'EndDevice' | 'Router'}): ModernExtend {
    const configure: Configure[] = [
        async (device, coordinatorEndpoint, definition) => {
            device.type = args.type;
            device.save();
        },
    ];
    return {configure, isModernExtend: true};
}

export function forcePowerSource(args: {powerSource: 'Mains (single phase)' | 'Battery'}): ModernExtend {
    const configure: Configure[] = [
        async (device, coordinatorEndpoint, definition) => {
            device.powerSource = args.powerSource;
            device.save();
        },
    ];
    return {configure, isModernExtend: true};
}

export interface LinkQualityArgs {
    reporting?: boolean;
    attribute?: string | {ID: number; type: number};
    reportingConfig?: ReportingConfigWithoutAttribute;
}
export function linkQuality(args?: LinkQualityArgs): ModernExtend {
    args = {reporting: false, attribute: 'modelId', reportingConfig: {min: '1_HOUR', max: '4_HOURS', change: 0}, ...args};

    const exposes: Expose[] = [
        e
            .numeric('linkquality', ea.STATE)
            .withUnit('lqi')
            .withDescription('Link quality (signal strength)')
            .withValueMin(0)
            .withValueMax(255)
            .withCategory('diagnostic'),
    ];

    const fromZigbee: Fz.Converter[] = [
        {
            cluster: 'genBasic',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                return {linkquality: msg.linkquality};
            },
        },
    ];

    const result: ModernExtend = {exposes, fromZigbee, isModernExtend: true};

    if (args.reporting) {
        result.configure = [setupConfigureForReporting('genBasic', args.attribute, args.reportingConfig, ea.GET)];
    }

    return result;
}

export interface BatteryArgs {
    voltageToPercentage?: BatteryNonLinearVoltage | BatteryLinearVoltage;
    dontDividePercentage?: boolean;
    percentage?: boolean;
    voltage?: boolean;
    lowStatus?: boolean;
    percentageReportingConfig?: ReportingConfigWithoutAttribute;
    percentageReporting?: boolean;
    voltageReportingConfig?: ReportingConfigWithoutAttribute;
    voltageReporting?: boolean;
}
export function battery(args?: BatteryArgs): ModernExtend {
    args = {
        percentage: true,
        voltage: false,
        lowStatus: false,
        percentageReporting: true,
        voltageReporting: false,
        dontDividePercentage: false,
        percentageReportingConfig: {min: '1_HOUR', max: 'MAX', change: 10},
        voltageReportingConfig: {min: '1_HOUR', max: 'MAX', change: 10},
        ...args,
    };

    const exposes: Expose[] = [];

    if (args.percentage) {
        exposes.push(
            e
                .numeric('battery', ea.STATE_GET)
                .withUnit('%')
                .withDescription('Remaining battery in %')
                .withValueMin(0)
                .withValueMax(100)
                .withCategory('diagnostic'),
        );
    }
    if (args.voltage) {
        exposes.push(
            e.numeric('voltage', ea.STATE_GET).withUnit('mV').withDescription('Reported battery voltage in millivolts').withCategory('diagnostic'),
        );
    }
    if (args.lowStatus) {
        exposes.push(e.binary('battery_low', ea.STATE, true, false).withDescription('Empty battery indicator').withCategory('diagnostic'));
    }

    const fromZigbee: Fz.Converter[] = [
        {
            cluster: 'genPowerCfg',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const payload: KeyValueAny = {};
                if (msg.data.hasOwnProperty('batteryPercentageRemaining') && msg.data['batteryPercentageRemaining'] < 255) {
                    // Some devices do not comply to the ZCL and report a
                    // batteryPercentageRemaining of 100 when the battery is full (should be 200).
                    const dontDividePercentage = args.dontDividePercentage;
                    let percentage = msg.data['batteryPercentageRemaining'];
                    percentage = dontDividePercentage ? percentage : percentage / 2;
                    if (args.percentage) payload.battery = precisionRound(percentage, 2);
                }

                if (msg.data.hasOwnProperty('batteryVoltage') && msg.data['batteryVoltage'] < 255) {
                    // Deprecated: voltage is = mV now but should be V
                    if (args.voltage) payload.voltage = msg.data['batteryVoltage'] * 100;

                    if (args.voltageToPercentage) {
                        payload.battery = batteryVoltageToPercentage(payload.voltage, args.voltageToPercentage);
                    }
                }

                if (msg.data.hasOwnProperty('batteryAlarmState')) {
                    const battery1Low =
                        (msg.data.batteryAlarmState & (1 << 0) ||
                            msg.data.batteryAlarmState & (1 << 1) ||
                            msg.data.batteryAlarmState & (1 << 2) ||
                            msg.data.batteryAlarmState & (1 << 3)) > 0;
                    const battery2Low =
                        (msg.data.batteryAlarmState & (1 << 10) ||
                            msg.data.batteryAlarmState & (1 << 11) ||
                            msg.data.batteryAlarmState & (1 << 12) ||
                            msg.data.batteryAlarmState & (1 << 13)) > 0;
                    const battery3Low =
                        (msg.data.batteryAlarmState & (1 << 20) ||
                            msg.data.batteryAlarmState & (1 << 21) ||
                            msg.data.batteryAlarmState & (1 << 22) ||
                            msg.data.batteryAlarmState & (1 << 23)) > 0;
                    if (args.lowStatus) payload.battery_low = battery1Low || battery2Low || battery3Low;
                }

                return payload;
            },
        },
    ];

    const toZigbee: Tz.Converter[] = [
        {
            key: ['battery', 'voltage'],
            convertGet: async (entity, key, meta) => {
                // Don't fail GET reqest if reading fails
                // Split reading is needed for more clear debug logs
                const ep = determineEndpoint(entity, meta, 'genPowerCfg');
                try {
                    await ep.read('genPowerCfg', ['batteryPercentageRemaining']);
                } catch (e) {
                    logger.debug(`Reading batteryPercentageRemaining failed: ${e}, device probably doesn't support it`, 'zhc:setupattribute');
                }
                try {
                    await ep.read('genPowerCfg', ['batteryVoltage']);
                } catch (e) {
                    logger.debug(`Reading batteryVoltage failed: ${e}, device probably doesn't support it`, 'zhc:setupattribute');
                }
            },
        },
    ];

    const result: ModernExtend = {exposes, fromZigbee, toZigbee, isModernExtend: true};

    if (args.percentageReporting || args.voltageReporting) {
        const configure: Configure[] = [];
        if (args.percentageReporting) {
            configure.push(setupConfigureForReporting('genPowerCfg', 'batteryPercentageRemaining', args.percentageReportingConfig, ea.STATE_GET));
        }
        if (args.voltageReporting) {
            configure.push(setupConfigureForReporting('genPowerCfg', 'batteryVoltage', args.voltageReportingConfig, ea.STATE_GET));
        }
        result.configure = configure;
    }

    if (args.voltageToPercentage || args.dontDividePercentage) {
        const meta: DefinitionMeta = {battery: {}};
        if (args.voltageToPercentage) meta.battery.voltageToPercentage = args.voltageToPercentage;
        if (args.dontDividePercentage) meta.battery.dontDividePercentage = args.dontDividePercentage;
        result.meta = meta;
    }

    return result;
}

export function deviceTemperature(args?: Partial<NumericArgs>) {
    return numeric({
        name: 'device_temperature',
        cluster: 'genDeviceTempCfg',
        attribute: 'currentTemperature',
        reporting: {min: '5_MINUTES', max: '1_HOUR', change: 1},
        description: 'Temperature of the device',
        unit: '°C',
        access: 'STATE_GET',
        entityCategory: 'diagnostic',
        ...args,
    });
}

export function identify(args?: {isSleepy: boolean}): ModernExtend {
    args = {isSleepy: false, ...args};
    const normal: Expose = e.enum('identify', ea.SET, ['identify']).withDescription('Initiate device identification').withCategory('config');
    const sleepy: Expose = e
        .enum('identify', ea.SET, ['identify'])
        .withDescription(
            'Initiate device identification. This device is asleep by default.' +
                'You may need to wake it up first before sending the identify command.',
        )
        .withCategory('config');

    const exposes: Expose[] = args.isSleepy ? [sleepy] : [normal];

    const identifyTimeout = e
        .numeric('identify_timeout', ea.SET)
        .withDescription(
            'Sets the duration of the identification procedure in seconds (i.e., how long the device would flash).' +
                'The value ranges from 1 to 30 seconds (default: 3).',
        )
        .withValueMin(1)
        .withValueMax(30);

    const toZigbee: Tz.Converter[] = [
        {
            key: ['identify'],
            options: [identifyTimeout],
            convertSet: async (entity, key, value, meta) => {
                const identifyTimeout = meta.options.identify_timeout ?? 3;
                await entity.command('genIdentify', 'identify', {identifytime: identifyTimeout}, getOptions(meta.mapped, entity));
            },
        },
    ];

    return {exposes, toZigbee, isModernExtend: true};
}

export interface OnOffArgs {
    powerOnBehavior?: boolean;
    ota?: DefinitionOta;
    skipDuplicateTransaction?: boolean;
    endpointNames?: string[];
    configureReporting?: boolean;
}
export function onOff(args?: OnOffArgs): ModernExtend {
    args = {powerOnBehavior: true, skipDuplicateTransaction: false, configureReporting: true, ...args};

    const exposes: Expose[] = args.endpointNames ? args.endpointNames.map((ep) => e.switch().withEndpoint(ep)) : [e.switch()];

    const fromZigbee: Fz.Converter[] = [args.skipDuplicateTransaction ? fz.on_off_skip_duplicate_transaction : fz.on_off];
    const toZigbee: Tz.Converter[] = [tz.on_off];

    if (args.powerOnBehavior) {
        exposes.push(e.power_on_behavior(['off', 'on', 'toggle', 'previous']));
        fromZigbee.push(fz.power_on_behavior);
        toZigbee.push(tz.power_on_behavior);
    }

    const result: ModernExtend = {exposes, fromZigbee, toZigbee, isModernExtend: true};
    if (args.ota) result.ota = args.ota;
    if (args.configureReporting) {
        result.configure = [
            async (device, coordinatorEndpoint) => {
                await setupAttributes(device, coordinatorEndpoint, 'genOnOff', [{attribute: 'onOff', min: 'MIN', max: 'MAX', change: 1}]);
                if (args.powerOnBehavior) {
                    try {
                        // Don't fail configure if reading this attribute fails, some devices don't support it.
                        await setupAttributes(
                            device,
                            coordinatorEndpoint,
                            'genOnOff',
                            [{attribute: 'startUpOnOff', min: 'MIN', max: 'MAX', change: 1}],
                            false,
                        );
                    } catch (e) {
                        if (e.message.includes('UNSUPPORTED_ATTRIBUTE')) {
                            logger.debug('Reading startUpOnOff failed, this features is unsupported', 'zhc:onoff');
                        } else {
                            throw e;
                        }
                    }
                }
            },
        ];
    }
    return result;
}

export interface CommandsOnOffArgs {
    commands?: ('on' | 'off' | 'toggle')[];
    bind?: boolean;
    endpointNames?: string[];
    legacyAction?: boolean;
}
export function commandsOnOff(args?: CommandsOnOffArgs): ModernExtend {
    args = {commands: ['on', 'off', 'toggle'], bind: true, legacyAction: false, ...args};
    let actions: string[] = args.commands;
    if (args.endpointNames) {
        actions = args.commands.map((c) => args.endpointNames.map((e) => `${c}_${e}`)).flat();
    }
    const exposes: Expose[] = [e.enum('action', ea.STATE, actions).withDescription('Triggered action (e.g. a button click)')];

    const actionPayloadLookup: KeyValueString = {
        commandOn: 'on',
        commandOff: 'off',
        commandOffWithEffect: 'off',
        commandToggle: 'toggle',
    };

    const fromZigbee: Fz.Converter[] = [
        {
            cluster: 'genOnOff',
            type: ['commandOn', 'commandOff', 'commandOffWithEffect', 'commandToggle'],
            convert: (model, msg, publish, options, meta) => {
                if (hasAlreadyProcessedMessage(msg, model)) return;
                const payload = {action: postfixWithEndpointName(actionPayloadLookup[msg.type], msg, model, meta)};
                addActionGroup(payload, msg, model);
                return payload;
            },
        },
    ];

    if (args.legacyAction) {
        fromZigbee.push(...[globalLegacy.fromZigbee.genOnOff_cmdOn, globalLegacy.fromZigbee.genOnOff_cmdOff]);
    }

    const result: ModernExtend = {exposes, fromZigbee, isModernExtend: true};

    if (args.bind) result.configure = [setupConfigureForBinding('genOnOff', 'output', args.endpointNames)];

    return result;
}

export function customTimeResponse(start: '1970_UTC' | '2000_LOCAL'): ModernExtend {
    // The Zigbee Cluster Library specification states that the genTime.time response should be the
    // number of seconds since 1st Jan 2000 00:00:00 UTC. This extend modifies that:
    // 1970_UTC: number of seconds since the Unix Epoch (1st Jan 1970 00:00:00 UTC)
    // 2000_LOCAL: seconds since 1 January in the local time zone.
    // Disable the responses of zigbee-herdsman and respond here instead.
    const onEvent: OnEvent = async (type, data, device, options, state: KeyValue) => {
        if (!device.customReadResponse) {
            device.customReadResponse = (frame, endpoint) => {
                if (frame.isCluster('genTime')) {
                    const payload: KeyValue = {};
                    if (start === '1970_UTC') {
                        const time = Math.round(new Date().getTime() / 1000);
                        payload.time = time;
                        payload.localTime = time - new Date().getTimezoneOffset() * 60;
                    } else if (start === '2000_LOCAL') {
                        const oneJanuary2000 = new Date('January 01, 2000 00:00:00 UTC+00:00').getTime();
                        const secondsUTC = Math.round((new Date().getTime() - oneJanuary2000) / 1000);
                        payload.time = secondsUTC - new Date().getTimezoneOffset() * 60;
                    }
                    endpoint.readResponse('genTime', frame.header.transactionSequenceNumber, payload).catch((e) => {
                        logger.warning(`Custom time response failed for '${device.ieeeAddr}': ${e}`, 'zhc:customtimeresponse');
                    });
                    return true;
                }
                return false;
            };
        }
    };

    return {onEvent, isModernExtend: true};
}

// #endregion

// #region Measurement and Sensing

export function illuminance(args?: Partial<NumericArgs>): ModernExtend {
    const luxScale: ScaleFunction = (value: number, type: 'from' | 'to') => {
        let result = value;
        if (type === 'from') {
            result = Math.pow(10, (result - 1) / 10000);
        }
        return result;
    };

    const rawIllinance = numeric({
        name: 'illuminance',
        cluster: 'msIlluminanceMeasurement',
        attribute: 'measuredValue',
        description: 'Raw measured illuminance',
        access: 'STATE_GET',
        ...args,
    });

    const illiminanceLux = numeric({
        name: 'illuminance_lux',
        cluster: 'msIlluminanceMeasurement',
        attribute: 'measuredValue',
        reporting: {min: '10_SECONDS', max: '1_HOUR', change: 5}, // 5 lux
        description: 'Measured illuminance in lux',
        unit: 'lx',
        scale: luxScale,
        access: 'STATE_GET',
        ...args,
    });

    const result: ModernExtend = illiminanceLux;
    result.fromZigbee.push(...rawIllinance.fromZigbee);
    result.toZigbee.push(...rawIllinance.toZigbee);
    result.exposes.push(...rawIllinance.exposes);

    return result;
}

export function temperature(args?: Partial<NumericArgs>) {
    return numeric({
        name: 'temperature',
        cluster: 'msTemperatureMeasurement',
        attribute: 'measuredValue',
        reporting: {min: '10_SECONDS', max: '1_HOUR', change: 100},
        description: 'Measured temperature value',
        unit: '°C',
        scale: 100,
        access: 'STATE_GET',
        ...args,
    });
}

export function pressure(args?: Partial<NumericArgs>): ModernExtend {
    return numeric({
        name: 'pressure',
        cluster: 'msPressureMeasurement',
        attribute: 'measuredValue',
        reporting: {min: '10_SECONDS', max: '1_HOUR', change: 50}, // 5 kPa
        description: 'The measured atmospheric pressure',
        unit: 'kPa',
        scale: 10,
        access: 'STATE_GET',
        ...args,
    });
}

export function flow(args?: Partial<NumericArgs>) {
    return numeric({
        name: 'flow',
        cluster: 'msFlowMeasurement',
        attribute: 'measuredValue',
        reporting: {min: '10_SECONDS', max: '1_HOUR', change: 10},
        description: 'Measured water flow',
        unit: 'm³/h',
        scale: 10,
        access: 'STATE_GET',
        ...args,
    });
}

export function humidity(args?: Partial<NumericArgs>) {
    return numeric({
        name: 'humidity',
        cluster: 'msRelativeHumidity',
        attribute: 'measuredValue',
        reporting: {min: '10_SECONDS', max: '1_HOUR', change: 100},
        description: 'Measured relative humidity',
        unit: '%',
        scale: 100,
        access: 'STATE_GET',
        ...args,
    });
}

export function soilMoisture(args?: Partial<NumericArgs>) {
    return numeric({
        name: 'soil_moisture',
        cluster: 'msSoilMoisture',
        attribute: 'measuredValue',
        reporting: {min: '10_SECONDS', max: '1_HOUR', change: 100},
        description: 'Measured soil moisture value',
        unit: '%',
        scale: 100,
        access: 'STATE_GET',
        ...args,
    });
}

export interface OccupancyArgs {
    pirConfig?: ('otu_delay' | 'uto_delay' | 'uto_threshold')[];
    ultrasonicConfig?: ('otu_delay' | 'uto_delay' | 'uto_threshold')[];
    contactConfig?: ('otu_delay' | 'uto_delay' | 'uto_threshold')[];
    reporting?: boolean;
    reportingConfig?: ReportingConfigWithoutAttribute;
    endpointNames?: string[];
}
export function occupancy(args?: OccupancyArgs): ModernExtend {
    args = {reporting: true, reportingConfig: {min: '10_SECONDS', max: '1_MINUTE', change: 0}, ...args};

    const templateExposes: Expose[] = [e.occupancy().withAccess(ea.STATE_GET)];
    const exposes: (Expose | DefinitionExposesFunction)[] = args.endpointNames
        ? templateExposes.map((exp) => args.endpointNames.map((ep) => exp.withEndpoint(ep))).flat()
        : templateExposes;

    const fromZigbee: Fz.Converter[] = [
        {
            cluster: 'msOccupancySensing',
            type: ['attributeReport', 'readResponse'],
            options: [opt.no_occupancy_since_false()],
            convert: (model, msg, publish, options, meta) => {
                if ('occupancy' in msg.data && (!args.endpointNames || args.endpointNames.includes(getEndpointName(msg, model, meta).toString()))) {
                    const propertyName = postfixWithEndpointName('occupancy', msg, model, meta);
                    const payload = {[propertyName]: (msg.data['occupancy'] & 1) > 0};
                    noOccupancySince(msg.endpoint, options, publish, payload[propertyName] ? 'stop' : 'start');
                    return payload;
                }
            },
        },
    ];

    const toZigbee: Tz.Converter[] = [
        {
            key: ['occupancy'],
            convertGet: async (entity, key, meta) => {
                await determineEndpoint(entity, meta, 'msOccupancySensing').read('msOccupancySensing', ['occupancy']);
            },
        },
    ];

    const settingsExtends: ModernExtend[] = [];

    const settingsTemplate = {
        cluster: 'msOccupancySensing',
        description: '',
        endpointNames: args.endpointNames,
        access: 'ALL' as 'STATE' | 'STATE_GET' | 'ALL',
        entityCategory: 'config' as 'config' | 'diagnostic',
    };

    const attributesForReading: string[] = [];

    if (args.pirConfig) {
        if (args.pirConfig.includes('otu_delay')) {
            settingsExtends.push(
                numeric({
                    name: 'pir_otu_delay',
                    attribute: 'pirOToUDelay',
                    valueMin: 0,
                    valueMax: 65534,
                    ...settingsTemplate,
                }),
            );
            attributesForReading.push('pirOToUDelay');
        }
        if (args.pirConfig.includes('uto_delay')) {
            settingsExtends.push(
                numeric({
                    name: 'pir_uto_delay',
                    attribute: 'pirUToODelay',
                    valueMin: 0,
                    valueMax: 65534,
                    ...settingsTemplate,
                }),
            );
            attributesForReading.push('pirUToODelay');
        }
        if (args.pirConfig.includes('uto_threshold')) {
            settingsExtends.push(
                numeric({
                    name: 'pir_uto_threshold',
                    attribute: 'pirUToOThreshold',
                    valueMin: 1,
                    valueMax: 254,
                    ...settingsTemplate,
                }),
            );
            attributesForReading.push('pirUToOThreshold');
        }
    }

    if (args.ultrasonicConfig) {
        if (args.pirConfig.includes('otu_delay')) {
            settingsExtends.push(
                numeric({
                    name: 'ultrasonic_otu_delay',
                    attribute: 'ultrasonicOToUDelay',
                    valueMin: 0,
                    valueMax: 65534,
                    ...settingsTemplate,
                }),
            );
            attributesForReading.push('ultrasonicOToUDelay');
        }
        if (args.pirConfig.includes('uto_delay')) {
            settingsExtends.push(
                numeric({
                    name: 'ultrasonic_uto_delay',
                    attribute: 'ultrasonicUToODelay',
                    valueMin: 0,
                    valueMax: 65534,
                    ...settingsTemplate,
                }),
            );
            attributesForReading.push('ultrasonicUToODelay');
        }
        if (args.pirConfig.includes('uto_threshold')) {
            settingsExtends.push(
                numeric({
                    name: 'ultrasonic_uto_threshold',
                    attribute: 'ultrasonicUToOThreshold',
                    valueMin: 1,
                    valueMax: 254,
                    ...settingsTemplate,
                }),
            );
            attributesForReading.push('ultrasonicUToOThreshold');
        }
    }

    if (args.contactConfig) {
        if (args.pirConfig.includes('otu_delay')) {
            settingsExtends.push(
                numeric({
                    name: 'contact_otu_delay',
                    attribute: 'contactOToUDelay',
                    valueMin: 0,
                    valueMax: 65534,
                    ...settingsTemplate,
                }),
            );
            attributesForReading.push('contactOToUDelay');
        }
        if (args.pirConfig.includes('uto_delay')) {
            settingsExtends.push(
                numeric({
                    name: 'contact_uto_delay',
                    attribute: 'contactUToODelay',
                    valueMin: 0,
                    valueMax: 65534,
                    ...settingsTemplate,
                }),
            );
            attributesForReading.push('contactUToODelay');
        }
        if (args.pirConfig.includes('uto_threshold')) {
            settingsExtends.push(
                numeric({
                    name: 'contact_uto_threshold',
                    attribute: 'contactUToOThreshold',
                    valueMin: 1,
                    valueMax: 254,
                    ...settingsTemplate,
                }),
            );
            attributesForReading.push('contactUToOThreshold');
        }
    }

    settingsExtends.map((extend) => exposes.push(...extend.exposes));
    settingsExtends.map((extend) => fromZigbee.push(...extend.fromZigbee));
    settingsExtends.map((extend) => toZigbee.push(...extend.toZigbee));

    const configure: Configure[] = [];

    if (attributesForReading.length > 0) configure.push(setupConfigureForReading('msOccupancySensing', attributesForReading, args.endpointNames));

    if (args.reporting) {
        configure.push(setupConfigureForReporting('msOccupancySensing', 'occupancy', args.reportingConfig, ea.STATE_GET, args.endpointNames));
    }

    return {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
}

export function co2(args?: Partial<NumericArgs>) {
    return numeric({
        name: 'co2',
        cluster: 'msCO2',
        label: 'CO2',
        attribute: 'measuredValue',
        reporting: {min: '10_SECONDS', max: '1_HOUR', change: 0.00005}, // 50 ppm change
        description: 'Measured value',
        unit: 'ppm',
        scale: 0.000001,
        access: 'STATE_GET',
        ...args,
    });
}

export function pm25(args?: Partial<NumericArgs>): ModernExtend {
    return numeric({
        name: 'pm25',
        cluster: 'pm25Measurement',
        attribute: 'measuredValue',
        reporting: {min: '10_SECONDS', max: '1_HOUR', change: 1},
        description: 'Measured PM2.5 (particulate matter) concentration',
        unit: 'µg/m³',
        access: 'STATE_GET',
        ...args,
    });
}

// #endregion

// #region Lighting

export interface LightArgs {
    effect?: boolean;
    powerOnBehavior?: boolean;
    colorTemp?: {startup?: boolean; range: Range};
    color?: boolean | {modes?: ('xy' | 'hs')[]; applyRedFix?: boolean; enhancedHue?: boolean};
    turnsOffAtBrightness1?: boolean;
    configureReporting?: boolean;
    endpointNames?: string[];
    ota?: DefinitionOta;
    levelConfig?: {disabledFeatures?: string[]};
}
export function light(args?: LightArgs): ModernExtend {
    args = {effect: true, powerOnBehavior: true, configureReporting: false, ...args};
    if (args.colorTemp) {
        args.colorTemp = {startup: true, ...args.colorTemp};
    }
    const argsColor = args.color
        ? {
              modes: ['xy'] satisfies ('xy' | 'hs')[],
              applyRedFix: false,
              enhancedHue: true,
              ...(isObject(args.color) ? args.color : {}),
          }
        : false;

    const lightExpose = args.endpointNames
        ? args.endpointNames.map((ep) => e.light().withBrightness().withEndpoint(ep))
        : [e.light().withBrightness()];

    const fromZigbee: Fz.Converter[] = [fz.on_off, fz.brightness, fz.ignore_basic_report, fz.level_config];
    const toZigbee: Tz.Converter[] = [
        tz.light_onoff_brightness,
        tz.ignore_transition,
        tz.level_config,
        tz.ignore_rate,
        tz.light_brightness_move,
        tz.light_brightness_step,
    ];
    const meta: DefinitionMeta = {};

    if (args.colorTemp || argsColor) {
        fromZigbee.push(fz.color_colortemp);
        if (args.colorTemp && argsColor) toZigbee.push(tz.light_color_colortemp);
        else if (args.colorTemp) toZigbee.push(tz.light_colortemp);
        else if (argsColor) toZigbee.push(tz.light_color);
        toZigbee.push(tz.light_color_mode, tz.light_color_options);
    }

    if (args.colorTemp) {
        lightExpose.forEach((e) => e.withColorTemp(args.colorTemp.range));
        toZigbee.push(tz.light_colortemp_move, tz.light_colortemp_step);
        if (args.colorTemp.startup) {
            toZigbee.push(tz.light_colortemp_startup);
            lightExpose.forEach((e) => e.withColorTempStartup(args.colorTemp.range));
        }
    }

    if (argsColor) {
        lightExpose.forEach((e) => e.withColor(argsColor.modes));
        toZigbee.push(tz.light_hue_saturation_move, tz.light_hue_saturation_step);
        if (argsColor.modes.includes('hs')) {
            meta.supportsHueAndSaturation = true;
        }
        if (argsColor.applyRedFix) {
            meta.applyRedFix = true;
        }
        if (!argsColor.enhancedHue) {
            meta.supportsEnhancedHue = false;
        }
    }

    if (args.levelConfig) {
        lightExpose.forEach((e) => e.withLevelConfig(args.levelConfig.disabledFeatures ?? []));
        toZigbee.push(tz.level_config);
    }

    const exposes: Expose[] = lightExpose;

    if (args.effect) {
        const effects = e.effect();
        if (args.color) {
            effects.values.push('colorloop', 'stop_colorloop');
        }
        exposes.push(effects);
        toZigbee.push(tz.effect);
    }

    if (args.powerOnBehavior) {
        exposes.push(e.power_on_behavior(['off', 'on', 'toggle', 'previous']));
        fromZigbee.push(fz.power_on_behavior);
        toZigbee.push(tz.power_on_behavior);
    }

    if (args.hasOwnProperty('turnsOffAtBrightness1')) {
        meta.turnsOffAtBrightness1 = args.turnsOffAtBrightness1;
    }

    const configure: Configure[] = [
        async (device, coordinatorEndpoint, definition) => {
            await lightConfigure(device, coordinatorEndpoint, true);

            if (args.configureReporting) {
                await setupAttributes(device, coordinatorEndpoint, 'genOnOff', [{attribute: 'onOff', min: 'MIN', max: 'MAX', change: 1}]);
                await setupAttributes(device, coordinatorEndpoint, 'genLevelCtrl', [
                    {attribute: 'currentLevel', min: '10_SECONDS', max: 'MAX', change: 1},
                ]);
                if (args.colorTemp) {
                    await setupAttributes(device, coordinatorEndpoint, 'lightingColorCtrl', [
                        {attribute: 'colorTemperature', min: '10_SECONDS', max: 'MAX', change: 1},
                    ]);
                }
                if (argsColor) {
                    const attributes: ReportingConfig[] = [];
                    if (argsColor.modes.includes('xy')) {
                        attributes.push(
                            {attribute: 'currentX', min: '10_SECONDS', max: 'MAX', change: 1},
                            {attribute: 'currentY', min: '10_SECONDS', max: 'MAX', change: 1},
                        );
                    }
                    if (argsColor.modes.includes('hs')) {
                        attributes.push(
                            {attribute: argsColor.enhancedHue ? 'enhancedCurrentHue' : 'currentHue', min: '10_SECONDS', max: 'MAX', change: 1},
                            {attribute: 'currentSaturation', min: '10_SECONDS', max: 'MAX', change: 1},
                        );
                    }
                    await setupAttributes(device, coordinatorEndpoint, 'lightingColorCtrl', attributes);
                }
            }
        },
    ];

    const result: ModernExtend = {exposes, fromZigbee, toZigbee, configure, meta, isModernExtend: true};
    if (args.ota) result.ota = args.ota;
    return result;
}

export interface CommandsLevelCtrl {
    commands?: (
        | 'brightness_move_to_level'
        | 'brightness_move_up'
        | 'brightness_move_down'
        | 'brightness_step_up'
        | 'brightness_step_down'
        | 'brightness_stop'
    )[];
    bind?: boolean;
    endpointNames?: string[];
    legacyAction?: boolean;
}
export function commandsLevelCtrl(args?: CommandsLevelCtrl): ModernExtend {
    args = {
        commands: [
            'brightness_move_to_level',
            'brightness_move_up',
            'brightness_move_down',
            'brightness_step_up',
            'brightness_step_down',
            'brightness_stop',
        ],
        bind: true,
        legacyAction: false,
        ...args,
    };
    let actions: string[] = args.commands;
    if (args.endpointNames) {
        actions = args.commands.map((c) => args.endpointNames.map((e) => `${c}_${e}`)).flat();
    }
    const exposes: Expose[] = [
        e.enum('action', ea.STATE, actions).withDescription('Triggered action (e.g. a button click)').withCategory('diagnostic'),
    ];

    const fromZigbee: Fz.Converter[] = [fz.command_move_to_level, fz.command_move, fz.command_step, fz.command_stop];

    if (args.legacyAction) {
        // Legacy converters with removed hasAlreadyProcessedMessage and redirects
        const legacyFromZigbee: Fz.Converter[] = [
            {
                cluster: 'genLevelCtrl',
                type: ['commandMove', 'commandMoveWithOnOff'],
                options: [opt.legacy(), opt.simulated_brightness(' Note: will only work when legacy: false is set.')],
                convert: (model, msg, publish, options, meta) => {
                    if (isLegacyEnabled(options)) {
                        globalLegacy.ictcg1(model, msg, publish, options, 'move');
                        const direction = msg.data.movemode === 1 ? 'left' : 'right';
                        return {action: `rotate_${direction}`, rate: msg.data.rate};
                    }
                },
            },
            {
                cluster: 'genLevelCtrl',
                type: ['commandStop', 'commandStopWithOnOff'],
                options: [opt.legacy()],
                convert: (model, msg, publish, options, meta) => {
                    if (isLegacyEnabled(options)) {
                        const value = globalLegacy.ictcg1(model, msg, publish, options, 'stop');
                        return {action: `rotate_stop`, brightness: value};
                    }
                },
            },
            {
                cluster: 'genLevelCtrl',
                type: 'commandMoveToLevelWithOnOff',
                options: [opt.legacy()],
                convert: (model, msg, publish, options, meta) => {
                    if (isLegacyEnabled(options)) {
                        const value = globalLegacy.ictcg1(model, msg, publish, options, 'level');
                        const direction = msg.data.level === 0 ? 'left' : 'right';
                        return {action: `rotate_${direction}_quick`, level: msg.data.level, brightness: value};
                    }
                },
            },
        ];
        fromZigbee.push(...legacyFromZigbee);
    }

    const result: ModernExtend = {exposes, fromZigbee, isModernExtend: true};

    if (args.bind) result.configure = [setupConfigureForBinding('genLevelCtrl', 'output', args.endpointNames)];

    return result;
}

export type ColorCtrlCommand =
    | 'color_temperature_move_stop'
    | 'color_temperature_move_up'
    | 'color_temperature_move_down'
    | 'color_temperature_step_up'
    | 'color_temperature_step_down'
    | 'enhanced_move_to_hue_and_saturation'
    | 'move_to_hue_and_saturation'
    | 'color_hue_step_up'
    | 'color_hue_step_down'
    | 'color_saturation_step_up'
    | 'color_saturation_step_down'
    | 'color_loop_set'
    | 'color_temperature_move'
    | 'color_move'
    | 'hue_move'
    | 'hue_stop'
    | 'move_to_saturation'
    | 'move_to_hue';
export interface CommandsColorCtrl {
    commands?: ColorCtrlCommand[];
    bind?: boolean;
    endpointNames?: string[];
}
export function commandsColorCtrl(args?: CommandsColorCtrl): ModernExtend {
    args = {
        commands: [
            'color_temperature_move_stop',
            'color_temperature_move_up',
            'color_temperature_move_down',
            'color_temperature_step_up',
            'color_temperature_step_down',
            'enhanced_move_to_hue_and_saturation',
            'move_to_hue_and_saturation',
            'color_hue_step_up',
            'color_hue_step_down',
            'color_saturation_step_up',
            'color_saturation_step_down',
            'color_loop_set',
            'color_temperature_move',
            'color_move',
            'hue_move',
            'hue_stop',
            'move_to_saturation',
            'move_to_hue',
        ],
        bind: true,
        ...args,
    };
    let actions: string[] = args.commands;
    if (args.endpointNames) {
        actions = args.commands.map((c) => args.endpointNames.map((e) => `${c}_${e}`)).flat();
    }
    const exposes: Expose[] = [
        e.enum('action', ea.STATE, actions).withDescription('Triggered action (e.g. a button click)').withCategory('diagnostic'),
    ];

    const fromZigbee: Fz.Converter[] = [
        fz.command_move_color_temperature,
        fz.command_step_color_temperature,
        fz.command_ehanced_move_to_hue_and_saturation,
        fz.command_move_to_hue_and_saturation,
        fz.command_step_hue,
        fz.command_step_saturation,
        fz.command_color_loop_set,
        fz.command_move_to_color_temp,
        fz.command_move_to_color,
        fz.command_move_hue,
        fz.command_move_to_saturation,
        fz.command_move_to_hue,
    ];

    const result: ModernExtend = {exposes, fromZigbee, isModernExtend: true};

    if (args.bind) result.configure = [setupConfigureForBinding('lightingColorCtrl', 'output', args.endpointNames)];

    return result;
}

// #endregion

// #region HVAC

// #endregion

// #region Closures

export interface LockArgs {
    pinCodeCount: number;
}
export function lock(args?: LockArgs): ModernExtend {
    args = {...args};

    const fromZigbee = [fz.lock, fz.lock_operation_event, fz.lock_programming_event, fz.lock_pin_code_response, fz.lock_user_status_response];
    const toZigbee = [tz.lock, tz.pincode_lock, tz.lock_userstatus, tz.lock_auto_relock_time, tz.lock_sound_volume];
    const exposes = [
        e.lock(),
        e.pincode(),
        e.lock_action(),
        e.lock_action_source_name(),
        e.lock_action_user(),
        e.auto_relock_time().withValueMin(0).withValueMax(3600),
        e.sound_volume(),
    ];
    const configure: Configure[] = [
        setupConfigureForReporting('closuresDoorLock', 'lockState', {min: 'MIN', max: '1_HOUR', change: 0}, ea.STATE_GET),
    ];
    const meta: DefinitionMeta = {pinCodeCount: args.pinCodeCount};

    return {fromZigbee, toZigbee, exposes, configure, meta, isModernExtend: true};
}

export interface WindowCoveringArgs {
    controls: ('lift' | 'tilt')[];
    coverInverted?: boolean;
    stateSource?: 'lift' | 'tilt';
    configureReporting?: boolean;
    coverMode?: boolean;
    endpointNames?: string[];
}
export function windowCovering(args: WindowCoveringArgs): ModernExtend {
    args = {stateSource: 'lift', configureReporting: true, ...args};
    let coverExpose: Cover = e.cover();
    if (args.controls.includes('lift')) coverExpose = coverExpose.withPosition();
    if (args.controls.includes('tilt')) coverExpose = coverExpose.withTilt();
    const exposes: Expose[] = [coverExpose];

    const fromZigbee: Fz.Converter[] = [fz.cover_position_tilt];
    const toZigbee: Tz.Converter[] = [tz.cover_state, tz.cover_position_tilt];

    const result: ModernExtend = {exposes, fromZigbee, toZigbee, isModernExtend: true};

    if (args.configureReporting) {
        const configure: Configure[] = [];
        if (args.controls.includes('lift')) {
            configure.push(
                setupConfigureForReporting(
                    'closuresWindowCovering',
                    'currentPositionLiftPercentage',
                    {min: '1_SECOND', max: 'MAX', change: 1},
                    ea.STATE_GET,
                ),
            );
        }
        if (args.controls.includes('tilt')) {
            configure.push(
                setupConfigureForReporting(
                    'closuresWindowCovering',
                    'currentPositionTiltPercentage',
                    {min: '1_SECOND', max: 'MAX', change: 1},
                    ea.STATE_GET,
                ),
            );
        }
        result.configure = configure;
    }

    if (args.coverInverted || args.stateSource === 'tilt') {
        const meta: DefinitionMeta = {};
        if (args.coverInverted) meta.coverInverted = true;
        if (args.stateSource === 'tilt') meta.coverStateFromTilt = true;
        result.meta = meta;
    }

    if (args.coverMode) {
        result.toZigbee.push(tz.cover_mode);
        result.exposes.push(e.cover_mode());
    }

    if (args.endpointNames) {
        result.exposes = flatten(exposes.map((expose) => args.endpointNames.map((endpoint) => expose.clone().withEndpoint(endpoint))));
    }

    return result;
}

export interface CommandsWindowCoveringArgs {
    commands?: ('open' | 'close' | 'stop')[];
    bind?: boolean;
    endpointNames?: string[];
    legacyAction: boolean;
}
export function commandsWindowCovering(args?: CommandsWindowCoveringArgs): ModernExtend {
    args = {commands: ['open', 'close', 'stop'], bind: true, legacyAction: false, ...args};
    let actions: string[] = args.commands;
    if (args.endpointNames) {
        actions = args.commands.map((c) => args.endpointNames.map((e) => `${c}_${e}`)).flat();
    }
    const exposes: Expose[] = [
        e.enum('action', ea.STATE, actions).withDescription('Triggered action (e.g. a button click)').withCategory('diagnostic'),
    ];

    const actionPayloadLookup: KeyValueString = {
        commandUpOpen: 'open',
        commandDownClose: 'close',
        commandStop: 'stop',
    };

    const fromZigbee: Fz.Converter[] = [
        {
            cluster: 'closuresWindowCovering',
            type: ['commandUpOpen', 'commandDownClose', 'commandStop'],
            convert: (model, msg, publish, options, meta) => {
                if (hasAlreadyProcessedMessage(msg, model)) return;
                const payload = {action: postfixWithEndpointName(actionPayloadLookup[msg.type], msg, model, meta)};
                addActionGroup(payload, msg, model);
                return payload;
            },
        },
    ];

    if (args.legacyAction) {
        fromZigbee.push(...[globalLegacy.fromZigbee.cover_open, globalLegacy.fromZigbee.cover_close, globalLegacy.fromZigbee.cover_stop]);
    }

    const result: ModernExtend = {exposes, fromZigbee, isModernExtend: true};

    if (args.bind) result.configure = [setupConfigureForBinding('closuresWindowCovering', 'output', args.endpointNames)];

    return result;
}

// #endregion

// #region Security and Safety

export type iasZoneType =
    | 'occupancy'
    | 'contact'
    | 'smoke'
    | 'water_leak'
    | 'rain'
    | 'carbon_monoxide'
    | 'sos'
    | 'vibration'
    | 'alarm'
    | 'gas'
    | 'generic';
export type iasZoneAttribute =
    | 'alarm_1'
    | 'alarm_2'
    | 'tamper'
    | 'battery_low'
    | 'supervision_reports'
    | 'restore_reports'
    | 'ac_status'
    | 'test'
    | 'trouble'
    | 'battery_defect';
export interface IasArgs {
    zoneType: iasZoneType;
    zoneAttributes: iasZoneAttribute[];
    alarmTimeout?: boolean;
}
export function iasZoneAlarm(args: IasArgs): ModernExtend {
    const exposeList = {
        occupancy: e.binary('occupancy', ea.STATE, true, false).withDescription('Indicates whether the device detected occupancy'),
        contact: e.binary('contact', ea.STATE, false, true).withDescription('Indicates whether the device is opened or closed'),
        smoke: e.binary('smoke', ea.STATE, true, false).withDescription('Indicates whether the device detected smoke'),
        water_leak: e.binary('water_leak', ea.STATE, true, false).withDescription('Indicates whether the device detected a water leak'),
        carbon_monoxide: e.binary('carbon_monoxide', ea.STATE, true, false).withDescription('Indicates whether the device detected carbon monoxide'),
        sos: e.binary('sos', ea.STATE, true, false).withLabel('SOS').withDescription('Indicates whether the SOS alarm is triggered'),
        vibration: e.binary('vibration', ea.STATE, true, false).withDescription('Indicates whether the device detected vibration'),
        alarm: e.binary('alarm', ea.STATE, true, false).withDescription('Indicates whether the alarm is triggered'),
        gas: e.binary('gas', ea.STATE, true, false).withDescription('Indicates whether the device detected gas'),
        alarm_1: e.binary('alarm_1', ea.STATE, true, false).withDescription('Indicates whether IAS Zone alarm 1 is active'),
        alarm_2: e.binary('alarm_2', ea.STATE, true, false).withDescription('Indicates whether IAS Zone alarm 2 is active'),
        tamper: e.binary('tamper', ea.STATE, true, false).withDescription('Indicates whether the device is tampered').withCategory('diagnostic'),
        rain: e.binary('rain', ea.STATE, true, false).withDescription('Indicates whether the device detected rainfall'),
        battery_low: e
            .binary('battery_low', ea.STATE, true, false)
            .withDescription('Indicates whether the battery of the device is almost empty')
            .withCategory('diagnostic'),
        supervision_reports: e
            .binary('supervision_reports', ea.STATE, true, false)
            .withDescription('Indicates whether the device issues reports on zone operational status')
            .withCategory('diagnostic'),
        restore_reports: e
            .binary('restore_reports', ea.STATE, true, false)
            .withDescription('Indicates whether the device issues reports on alarm no longer being present')
            .withCategory('diagnostic'),
        ac_status: e
            .binary('ac_status', ea.STATE, true, false)
            .withDescription('Indicates whether the device mains voltage supply is at fault')
            .withCategory('diagnostic'),
        test: e
            .binary('test', ea.STATE, true, false)
            .withDescription('Indicates whether the device is currently performing a test')
            .withCategory('diagnostic'),
        trouble: e
            .binary('trouble', ea.STATE, true, false)
            .withDescription('Indicates whether the device is currently havin trouble')
            .withCategory('diagnostic'),
        battery_defect: e
            .binary('battery_defect', ea.STATE, true, false)
            .withDescription('Indicates whether the device battery is defective')
            .withCategory('diagnostic'),
    };

    const exposes: Expose[] = [];
    const invertAlarmPayload = args.zoneType === 'contact';
    const bothAlarms = args.zoneAttributes.includes('alarm_1') && args.zoneAttributes.includes('alarm_2');

    let alarm1Name = 'alarm_1';
    let alarm2Name = 'alarm_2';

    if (args.zoneType === 'generic') {
        args.zoneAttributes.map((attr) => exposes.push(exposeList[attr]));
    } else {
        if (bothAlarms) {
            exposes.push(
                e.binary(args.zoneType + '_alarm_1', ea.STATE, true, false).withDescription(exposeList[args.zoneType].description + ' (alarm_1)'),
            );
            alarm1Name = args.zoneType + '_alarm_1';
            exposes.push(
                e.binary(args.zoneType + '_alarm_2', ea.STATE, true, false).withDescription(exposeList[args.zoneType].description + ' (alarm_2)'),
            );
            alarm2Name = args.zoneType + '_alarm_2';
        } else {
            exposes.push(exposeList[args.zoneType]);
            alarm1Name = args.zoneType;
            alarm2Name = args.zoneType;
        }
        args.zoneAttributes.map((attr) => {
            if (attr !== 'alarm_1' && attr !== 'alarm_2') exposes.push(exposeList[attr]);
        });
    }

    const timeoutProperty = `${args.zoneType}_timeout`;

    const fromZigbee: Fz.Converter[] = [
        {
            cluster: 'ssIasZone',
            type: ['commandStatusChangeNotification', 'attributeReport', 'readResponse'],
            options: args.alarmTimeout
                ? [
                      e
                          .numeric(timeoutProperty, ea.SET)
                          .withValueMin(0)
                          .withDescription(`Time in seconds after which ${args.zoneType} is cleared after detecting it (default 90 seconds).`),
                  ]
                : [],
            convert: (model, msg, publish, options, meta) => {
                const zoneStatus = msg.type === 'commandStatusChangeNotification' ? msg.data.zonestatus : msg.data.zoneStatus;

                if (args.alarmTimeout) {
                    const timeout = options?.hasOwnProperty(timeoutProperty) ? Number(options[timeoutProperty]) : 90;
                    clearTimeout(globalStore.getValue(msg.endpoint, 'timer'));
                    if (timeout !== 0) {
                        const timer = setTimeout(() => publish({[alarm1Name]: false, [alarm2Name]: false}), timeout * 1000);
                        globalStore.putValue(msg.endpoint, 'timer', timer);
                    }
                }
                let payload = {};
                if (args.zoneAttributes.includes('tamper')) {
                    payload = {tamper: (zoneStatus & (1 << 2)) > 0, ...payload};
                }
                if (args.zoneAttributes.includes('battery_low')) {
                    payload = {battery_low: (zoneStatus & (1 << 3)) > 0, ...payload};
                }
                if (args.zoneAttributes.includes('supervision_reports')) {
                    payload = {supervision_reports: (zoneStatus & (1 << 4)) > 0, ...payload};
                }
                if (args.zoneAttributes.includes('restore_reports')) {
                    payload = {restore_reports: (zoneStatus & (1 << 5)) > 0, ...payload};
                }
                if (args.zoneAttributes.includes('trouble')) {
                    payload = {trouble: (zoneStatus & (1 << 6)) > 0, ...payload};
                }
                if (args.zoneAttributes.includes('ac_status')) {
                    payload = {ac_status: (zoneStatus & (1 << 7)) > 0, ...payload};
                }
                if (args.zoneAttributes.includes('test')) {
                    payload = {test: (zoneStatus & (1 << 8)) > 0, ...payload};
                }
                if (args.zoneAttributes.includes('battery_defect')) {
                    payload = {battery_defect: (zoneStatus & (1 << 9)) > 0, ...payload};
                }
                let alarm1Payload = (zoneStatus & 1) > 0;
                let alarm2Payload = (zoneStatus & (1 << 1)) > 0;

                if (invertAlarmPayload) {
                    alarm1Payload = !alarm1Payload;
                    alarm2Payload = !alarm2Payload;
                }

                if (bothAlarms) {
                    payload = {[alarm1Name]: alarm1Payload, ...payload};
                    payload = {[alarm2Name]: alarm2Payload, ...payload};
                } else if (args.zoneAttributes.includes('alarm_1')) {
                    payload = {[alarm1Name]: alarm1Payload, ...payload};
                } else if (args.zoneAttributes.includes('alarm_2')) {
                    payload = {[alarm2Name]: alarm2Payload, ...payload};
                }

                return payload;
            },
        },
    ];

    return {fromZigbee, exposes, isModernExtend: true};
}

export interface IasWarningArgs {
    reversePayload?: boolean;
}
export function iasWarning(args?: IasWarningArgs): ModernExtend {
    const warningMode = {stop: 0, burglar: 1, fire: 2, emergency: 3, police_panic: 4, fire_panic: 5, emergency_panic: 6};
    // levels for siren, strobe and squawk are identical
    const level = {low: 0, medium: 1, high: 2, very_high: 3};

    const exposes: Expose[] = [
        e
            .composite('warning', 'warning', ea.SET)
            .withFeature(e.enum('mode', ea.SET, Object.keys(warningMode)).withDescription('Mode of the warning (sound effect)'))
            .withFeature(e.enum('level', ea.SET, Object.keys(level)).withDescription('Sound level'))
            .withFeature(e.enum('strobe_level', ea.SET, Object.keys(level)).withDescription('Intensity of the strobe'))
            .withFeature(e.binary('strobe', ea.SET, true, false).withDescription('Turn on/off the strobe (light) during warning'))
            .withFeature(e.numeric('strobe_duty_cycle', ea.SET).withValueMax(10).withValueMin(0).withDescription('Length of the flash cycle'))
            .withFeature(e.numeric('duration', ea.SET).withUnit('s').withDescription('Duration in seconds of the alarm')),
    ];

    const toZigbee: Tz.Converter[] = [
        {
            key: ['warning'],
            convertSet: async (entity, key, value, meta) => {
                const values = {
                    // @ts-expect-error
                    mode: value.mode || 'emergency',
                    // @ts-expect-error
                    level: value.level || 'medium',
                    // @ts-expect-error
                    strobe: value.hasOwnProperty('strobe') ? value.strobe : true,
                    // @ts-expect-error
                    duration: value.hasOwnProperty('duration') ? value.duration : 10,
                    // @ts-expect-error
                    strobeDutyCycle: value.hasOwnProperty('strobe_duty_cycle') ? value.strobe_duty_cycle * 10 : 0,
                    // @ts-expect-error
                    strobeLevel: value.hasOwnProperty('strobe_level') ? utils.getFromLookup(value.strobe_level, strobeLevel) : 1,
                };

                let info;
                if (args?.reversePayload) {
                    info = getFromLookup(values.mode, warningMode) + ((values.strobe ? 1 : 0) << 4) + (getFromLookup(values.level, level) << 6);
                } else {
                    info = (getFromLookup(values.mode, warningMode) << 4) + ((values.strobe ? 1 : 0) << 2) + getFromLookup(values.level, level);
                }

                const payload = {
                    startwarninginfo: info,
                    warningduration: values.duration,
                    strobedutycycle: values.strobeDutyCycle,
                    strobelevel: values.strobeLevel,
                };

                await entity.command('ssIasWd', 'startWarning', payload, getOptions(meta.mapped, entity));
            },
        },
    ];
    return {toZigbee, exposes, isModernExtend: true};
}

// #endregion

// #region Smart Energy

// Uses Electrical Measurement and/or Metering, but for simplicity was put here.
type MultiplierDivisor = {multiplier?: number; divisor?: number};
export interface ElectricityMeterArgs {
    cluster?: 'both' | 'metering' | 'electrical';
    current?: false | MultiplierDivisor;
    power?: false | MultiplierDivisor;
    voltage?: false | MultiplierDivisor;
    energy?: false | MultiplierDivisor;
    threePhase?: boolean;
    configureReporting?: boolean;
    endpointNames?: string[];
}
export function electricityMeter(args?: ElectricityMeterArgs): ModernExtend {
    args = {cluster: 'both', configureReporting: true, threePhase: false, ...args};
    if (
        args.cluster === 'metering' &&
        isObject(args.power) &&
        isObject(args.energy) &&
        (args.power?.divisor !== args.energy?.divisor || args.power?.multiplier !== args.energy?.multiplier)
    ) {
        throw new Error(`When cluster is metering, power and energy divisor/multiplier should be equal`);
    }

    let exposes: Numeric[] = [];
    let fromZigbee: Fz.Converter[];
    let toZigbee: Tz.Converter[];

    const configureLookup = {
        haElectricalMeasurement: {
            // Report change with every 5W change
            power: {attribute: 'activePower', divisor: 'acPowerDivisor', multiplier: 'acPowerMultiplier', forced: args.power, change: 5},
            power_phase_b: {attribute: 'activePowerPhB', divisor: 'acPowerDivisor', multiplier: 'acPowerMultiplier', forced: args.power, change: 5},
            power_phase_c: {attribute: 'activePowerPhC', divisor: 'acPowerDivisor', multiplier: 'acPowerMultiplier', forced: args.power, change: 5},
            // Report change with every 0.05A change
            current: {attribute: 'rmsCurrent', divisor: 'acCurrentDivisor', multiplier: 'acCurrentMultiplier', forced: args.current, change: 0.05},
            current_phase_b: {
                attribute: 'rmsCurrentPhB',
                divisor: 'acCurrentDivisor',
                multiplier: 'acCurrentMultiplier',
                forced: args.current,
                change: 0.05,
            },
            current_phase_c: {
                attribute: 'rmsCurrentPhC',
                divisor: 'acCurrentDivisor',
                multiplier: 'acCurrentMultiplier',
                forced: args.current,
                change: 0.05,
            },
            // Report change with every 5V change
            voltage: {attribute: 'rmsVoltage', divisor: 'acVoltageDivisor', multiplier: 'acVoltageMultiplier', forced: args.voltage, change: 5},
            voltage_phase_b: {
                attribute: 'rmsVoltagePhB',
                divisor: 'acVoltageDivisor',
                multiplier: 'acVoltageMultiplier',
                forced: args.voltage,
                change: 5,
            },
            voltage_phase_c: {
                attribute: 'rmsVoltagePhC',
                divisor: 'acVoltageDivisor',
                multiplier: 'acVoltageMultiplier',
                forced: args.voltage,
                change: 5,
            },
        },
        seMetering: {
            // Report change with every 5W change
            power: {attribute: 'instantaneousDemand', divisor: 'divisor', multiplier: 'multiplier', forced: args.power, change: 5},
            // Report change with every 0.1kWh change
            energy: {attribute: 'currentSummDelivered', divisor: 'divisor', multiplier: 'multiplier', forced: args.energy, change: 0.1},
            // produced_energy: {attribute: 'currentSummReceived', divisor: 'divisor', multiplier: 'multiplier', forced: args.energy, change: 0.1},
        },
    };

    if (args.power === false) {
        delete configureLookup.haElectricalMeasurement.power;
        delete configureLookup.seMetering.power;
        delete configureLookup.haElectricalMeasurement.power_phase_b;
        delete configureLookup.haElectricalMeasurement.power_phase_c;
    }
    if (args.voltage === false) {
        delete configureLookup.haElectricalMeasurement.voltage;
        delete configureLookup.haElectricalMeasurement.voltage_phase_b;
        delete configureLookup.haElectricalMeasurement.voltage_phase_c;
    }
    if (args.current === false) {
        delete configureLookup.haElectricalMeasurement.current;
        delete configureLookup.haElectricalMeasurement.current_phase_b;
        delete configureLookup.haElectricalMeasurement.current_phase_c;
    }
    if (args.energy === false) {
        delete configureLookup.seMetering.energy;
    }
    if (args.threePhase === false) {
        delete configureLookup.haElectricalMeasurement.power_phase_b;
        delete configureLookup.haElectricalMeasurement.power_phase_c;
        delete configureLookup.haElectricalMeasurement.current_phase_b;
        delete configureLookup.haElectricalMeasurement.current_phase_c;
        delete configureLookup.haElectricalMeasurement.voltage_phase_b;
        delete configureLookup.haElectricalMeasurement.voltage_phase_c;
    }

    if (args.cluster === 'both') {
        if (args.power !== false) exposes.push(e.power().withAccess(ea.STATE_GET));
        if (args.voltage !== false) exposes.push(e.voltage().withAccess(ea.STATE_GET));
        if (args.current !== false) exposes.push(e.current().withAccess(ea.STATE_GET));
        if (args.energy !== false) exposes.push(e.energy().withAccess(ea.STATE_GET));
        fromZigbee = [fz.electrical_measurement, fz.metering];
        toZigbee = [tz.electrical_measurement_power, tz.acvoltage, tz.accurrent, tz.currentsummdelivered];
        delete configureLookup.seMetering.power;
    } else if (args.cluster === 'metering') {
        if (args.power !== false) exposes.push(e.power().withAccess(ea.STATE_GET));
        if (args.energy !== false) exposes.push(e.energy().withAccess(ea.STATE_GET));
        fromZigbee = [fz.metering];
        toZigbee = [tz.metering_power, tz.currentsummdelivered];
        delete configureLookup.haElectricalMeasurement;
    } else if (args.cluster === 'electrical') {
        if (args.power !== false) exposes.push(e.power().withAccess(ea.STATE_GET));
        if (args.voltage !== false) exposes.push(e.voltage().withAccess(ea.STATE_GET));
        if (args.current !== false) exposes.push(e.current().withAccess(ea.STATE_GET));
        fromZigbee = [fz.electrical_measurement];
        toZigbee = [tz.electrical_measurement_power, tz.acvoltage, tz.accurrent];
        delete configureLookup.seMetering;
    }

    if (args.threePhase === true) {
        exposes.push(
            e.power_phase_b().withAccess(ea.STATE_GET),
            e.power_phase_c().withAccess(ea.STATE_GET),
            e.voltage_phase_b().withAccess(ea.STATE_GET),
            e.voltage_phase_c().withAccess(ea.STATE_GET),
            e.current_phase_b().withAccess(ea.STATE_GET),
            e.current_phase_c().withAccess(ea.STATE_GET),
        );
        toZigbee.push(
            tz.electrical_measurement_power_phase_b,
            tz.electrical_measurement_power_phase_c,
            tz.acvoltage_phase_b,
            tz.acvoltage_phase_c,
            tz.accurrent_phase_b,
            tz.accurrent_phase_c,
        );
    }

    if (args.endpointNames) {
        exposes = flatten(exposes.map((expose) => args.endpointNames.map((endpoint) => expose.clone().withEndpoint(endpoint))));
    }

    const result: ModernExtend = {exposes, fromZigbee, toZigbee, isModernExtend: true};

    if (args.configureReporting) {
        result.configure = [
            async (device, coordinatorEndpoint) => {
                for (const [cluster, properties] of Object.entries(configureLookup)) {
                    for (const endpoint of getEndpointsWithCluster(device, cluster, 'input')) {
                        const items: ReportingConfig[] = [];
                        for (const property of Object.values(properties)) {
                            // In case multiplier or divisor was provided, use that instead of reading from device.
                            if (property.forced) {
                                endpoint.saveClusterAttributeKeyValue(cluster, {
                                    [property.divisor]: property.forced.divisor ?? 1,
                                    [property.multiplier]: property.forced.multiplier ?? 1,
                                });
                                endpoint.save();
                            } else {
                                await endpoint.read(cluster, [property.divisor, property.multiplier]);
                            }

                            const divisor = endpoint.getClusterAttributeValue(cluster, property.divisor);
                            assertNumber(divisor, property.divisor);
                            const multiplier = endpoint.getClusterAttributeValue(cluster, property.multiplier);
                            assertNumber(multiplier, property.multiplier);
                            let change: number | [number, number] = property.change * (divisor / multiplier);
                            // currentSummDelivered data type is uint48, so reportableChange also is uint48
                            if (property.attribute === 'currentSummDelivered') change = [0, change];
                            items.push({attribute: property.attribute, min: '10_SECONDS', max: 'MAX', change});
                        }
                        if (items.length) {
                            await setupAttributes(endpoint, coordinatorEndpoint, cluster, items);
                        }
                    }
                }
            },
        ];
    }

    return result;
}

// #endregion

// #region OTA

export function ota(definition?: DefinitionOta): ModernExtend {
    return {ota: definition !== undefined ? definition : zigbeeOTA, isModernExtend: true};
}

// #endregion

// #region Other extends

export interface CommandsScenesArgs {
    commands?: string[];
    bind?: boolean;
    endpointNames?: string[];
}
export function commandsScenes(args?: CommandsScenesArgs) {
    args = {commands: ['recall', 'store', 'add', 'remove', 'remove_all'], bind: true, ...args};
    let actions = args.commands!;
    if (args.endpointNames) {
        actions = args.commands.map((c) => args.endpointNames.map((e) => `${c}_${e}`)).flat();
    }
    const exposesArray = [e.enum('action', ea.STATE, actions).withDescription('Triggered scene action (e.g. recall a scene)')];

    const actionPayloadLookup: {[key: string]: string} = {
        commandRecall: 'recall',
        commandStore: 'store',
        commandAdd: 'add',
        commandRemove: 'remove',
        commandRemoveAll: 'remove_all',
    };

    const fromZigbee: Fz.Converter[] = [
        {
            cluster: 'genScenes',
            type: ['commandRecall', 'commandStore', 'commandAdd', 'commandRemove', 'commandRemoveAll'],
            convert: (model, msg, publish, options, meta) => {
                if (hasAlreadyProcessedMessage(msg, model)) return;
                let trailing = '';
                if (msg.type === 'commandRecall' || msg.type === 'commandStore') {
                    trailing = `_${msg.data.sceneid}`;
                }
                const payload = {
                    action: postfixWithEndpointName(actionPayloadLookup[msg.type] + trailing, msg, model, meta),
                };
                addActionGroup(payload, msg, model);
                return payload;
            },
        },
    ];

    const result: ModernExtend = {exposes: exposesArray, fromZigbee, isModernExtend: true};

    if (args.bind) result.configure = [setupConfigureForBinding('genScenes', 'output', args.endpointNames)];

    return result;
}

export interface EnumLookupArgs {
    name: string;
    lookup: KeyValue;
    cluster: string | number;
    attribute: string | {ID: number; type: number};
    description: string;
    zigbeeCommandOptions?: {manufacturerCode?: number; disableDefaultResponse?: boolean};
    access?: 'STATE' | 'STATE_GET' | 'ALL';
    endpointName?: string;
    reporting?: ReportingConfigWithoutAttribute;
    entityCategory?: 'config' | 'diagnostic';
}
export function enumLookup(args: EnumLookupArgs): ModernExtend {
    const {name, lookup, cluster, attribute, description, zigbeeCommandOptions, endpointName, reporting, entityCategory} = args;
    const attributeKey = isString(attribute) ? attribute : attribute.ID;
    const access = ea[args.access ?? 'ALL'];

    let expose = e.enum(name, access, Object.keys(lookup)).withDescription(description);
    if (endpointName) expose = expose.withEndpoint(endpointName);
    if (entityCategory) expose = expose.withCategory(entityCategory);

    const fromZigbee: Fz.Converter[] = [
        {
            cluster: cluster.toString(),
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                if (attributeKey in msg.data && (!endpointName || getEndpointName(msg, model, meta) === endpointName)) {
                    return {[expose.property]: getFromLookupByValue(msg.data[attributeKey], lookup)};
                }
            },
        },
    ];

    const toZigbee: Tz.Converter[] = [
        {
            key: [name],
            convertSet:
                access & ea.SET
                    ? async (entity, key, value, meta) => {
                          const payloadValue = getFromLookup(value, lookup);
                          const payload = isString(attribute)
                              ? {[attribute]: payloadValue}
                              : {[attribute.ID]: {value: payloadValue, type: attribute.type}};
                          await determineEndpoint(entity, meta, cluster).write(cluster, payload, zigbeeCommandOptions);
                          return {state: {[key]: value}};
                      }
                    : undefined,
            convertGet:
                access & ea.GET
                    ? async (entity, key, meta) => {
                          await determineEndpoint(entity, meta, cluster).read(cluster, [attributeKey], zigbeeCommandOptions);
                      }
                    : undefined,
        },
    ];

    const configure: Configure[] = [setupConfigureForReporting(cluster, attribute, reporting, access)];

    return {exposes: [expose], fromZigbee, toZigbee, configure, isModernExtend: true};
}

// type provides a way to distinguish between fromZigbee and toZigbee value conversions if they are asymmetrical
export type ScaleFunction = (value: number, type: 'from' | 'to') => number;

export interface NumericArgs {
    name: string;
    cluster: string | number;
    attribute: string | {ID: number; type: number};
    description: string;
    zigbeeCommandOptions?: {manufacturerCode?: number; disableDefaultResponse?: boolean};
    access?: 'STATE' | 'STATE_GET' | 'ALL';
    unit?: string;
    endpointNames?: string[];
    reporting?: ReportingConfigWithoutAttribute;
    valueMin?: number;
    valueMax?: number;
    valueStep?: number;
    valueIgnore?: number[];
    scale?: number | ScaleFunction;
    label?: string;
    entityCategory?: 'config' | 'diagnostic';
    precision?: number;
}
export function numeric(args: NumericArgs): ModernExtend {
    const {
        name,
        cluster,
        attribute,
        description,
        zigbeeCommandOptions,
        unit,
        reporting,
        valueMin,
        valueMax,
        valueStep,
        valueIgnore,
        scale,
        label,
        entityCategory,
        precision,
    } = args;

    const endpoints = args.endpointNames;
    const attributeKey = isString(attribute) ? attribute : attribute.ID;
    const access = ea[args.access ?? 'ALL'];

    const exposes: Expose[] = [];

    const createExpose = (endpoint?: string): Expose => {
        let expose = e.numeric(name, access).withDescription(description);
        if (endpoint) expose = expose.withEndpoint(endpoint);
        if (unit) expose = expose.withUnit(unit);
        if (valueMin !== undefined) expose = expose.withValueMin(valueMin);
        if (valueMax !== undefined) expose = expose.withValueMax(valueMax);
        if (valueStep !== undefined) expose = expose.withValueStep(valueStep);
        if (label !== undefined) expose = expose.withLabel(label);
        if (entityCategory) expose = expose.withCategory(entityCategory);

        return expose;
    };
    // Generate for multiple endpoints only if required.
    if (!endpoints) {
        exposes.push(createExpose(undefined));
    } else {
        for (const endpoint of endpoints) {
            exposes.push(createExpose(endpoint));
        }
    }

    const fromZigbee: Fz.Converter[] = [
        {
            cluster: cluster.toString(),
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                if (attributeKey in msg.data) {
                    const endpoint = endpoints?.find((e) => getEndpointName(msg, model, meta) === e);
                    if (endpoints && !endpoint) {
                        return;
                    }

                    let value = msg.data[attributeKey];
                    assertNumber(value);

                    if (valueIgnore && valueIgnore.includes(value)) return;

                    if (scale !== undefined) {
                        value = typeof scale === 'number' ? value / scale : scale(value, 'from');
                    }
                    assertNumber(value);
                    if (precision != null) value = precisionRound(value, precision);

                    const expose = exposes.length === 1 ? exposes[0] : exposes.find((e) => e.endpoint === endpoint);
                    return {[expose.property]: value};
                }
            },
        },
    ];

    const toZigbee: Tz.Converter[] = [
        {
            key: [name],
            convertSet:
                access & ea.SET
                    ? async (entity, key, value, meta) => {
                          assertNumber(value, key);
                          let payloadValue = value;
                          if (scale !== undefined) {
                              payloadValue = typeof scale === 'number' ? payloadValue * scale : scale(payloadValue, 'to');
                          }
                          assertNumber(payloadValue);
                          if (precision != null) payloadValue = precisionRound(value, precision);
                          const payload = isString(attribute)
                              ? {[attribute]: payloadValue}
                              : {[attribute.ID]: {value: payloadValue, type: attribute.type}};
                          await determineEndpoint(entity, meta, cluster).write(cluster, payload, zigbeeCommandOptions);
                          return {state: {[key]: value}};
                      }
                    : undefined,
            convertGet:
                access & ea.GET
                    ? async (entity, key, meta) => {
                          await determineEndpoint(entity, meta, cluster).read(cluster, [attributeKey], zigbeeCommandOptions);
                      }
                    : undefined,
        },
    ];

    const configure: Configure[] = [setupConfigureForReporting(cluster, attribute, reporting, access, endpoints)];

    return {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
}

export interface BinaryArgs {
    name: string;
    valueOn: [string | boolean, unknown];
    valueOff: [string | boolean, unknown];
    cluster: string | number;
    attribute: string | {ID: number; type: number};
    description: string;
    zigbeeCommandOptions?: {manufacturerCode: number};
    endpointName?: string;
    reporting?: ReportingConfig;
    access?: 'STATE' | 'STATE_GET' | 'ALL';
    entityCategory?: 'config' | 'diagnostic';
}
export function binary(args: BinaryArgs): ModernExtend {
    const {name, valueOn, valueOff, cluster, attribute, description, zigbeeCommandOptions, endpointName, reporting, entityCategory} = args;
    const attributeKey = isString(attribute) ? attribute : attribute.ID;
    const access = ea[args.access ?? 'ALL'];

    let expose = e.binary(name, access, valueOn[0], valueOff[0]).withDescription(description);
    if (endpointName) expose = expose.withEndpoint(endpointName);
    if (entityCategory) expose = expose.withCategory(entityCategory);

    const fromZigbee: Fz.Converter[] = [
        {
            cluster: cluster.toString(),
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                if (attributeKey in msg.data && (!endpointName || getEndpointName(msg, model, meta) === endpointName)) {
                    return {[expose.property]: msg.data[attributeKey] === valueOn[1] ? valueOn[0] : valueOff[0]};
                }
            },
        },
    ];

    const toZigbee: Tz.Converter[] = [
        {
            key: [name],
            convertSet:
                access & ea.SET
                    ? async (entity, key, value, meta) => {
                          const payloadValue = value === valueOn[0] ? valueOn[1] : valueOff[1];
                          const payload = isString(attribute)
                              ? {[attribute]: payloadValue}
                              : {[attribute.ID]: {value: payloadValue, type: attribute.type}};
                          await determineEndpoint(entity, meta, cluster).write(cluster, payload, zigbeeCommandOptions);
                          return {state: {[key]: value}};
                      }
                    : undefined,
            convertGet:
                access & ea.GET
                    ? async (entity, key, meta) => {
                          await determineEndpoint(entity, meta, cluster).read(cluster, [attributeKey], zigbeeCommandOptions);
                      }
                    : undefined,
        },
    ];

    const configure: Configure[] = [setupConfigureForReporting(cluster, attribute, reporting, access)];

    return {exposes: [expose], fromZigbee, toZigbee, configure, isModernExtend: true};
}

export type Parse = (msg: Fz.Message, attributeKey: string | number) => unknown;
export interface ActionEnumLookupArgs {
    actionLookup: KeyValue;
    cluster: string | number;
    attribute: string | {ID: number; type: number};
    endpointNames?: string[];
    buttonLookup?: KeyValue;
    extraActions?: string[];
    commands?: string[];
    parse?: Parse;
}
export function actionEnumLookup(args: ActionEnumLookupArgs): ModernExtend {
    const {actionLookup: lookup, attribute, cluster, buttonLookup} = args;
    const attributeKey = isString(attribute) ? attribute : attribute.ID;
    const commands = args.commands || ['attributeReport', 'readResponse'];
    const parse = args.parse;

    let actions = Object.keys(lookup)
        .map((a) => (args.endpointNames ? args.endpointNames.map((e) => `${a}_${e}`) : [a]))
        .flat();
    // allows direct external input to be used by other extends in the same device
    if (args.extraActions) actions = actions.concat(args.extraActions);
    const expose = e.enum('action', ea.STATE, actions).withDescription('Triggered action (e.g. a button click)').withCategory('diagnostic');

    const fromZigbee: Fz.Converter[] = [
        {
            cluster: cluster.toString(),
            type: commands,
            convert: (model, msg, publish, options, meta) => {
                if (attributeKey in msg.data) {
                    let value = parse ? parse(msg, attributeKey) : msg.data[attributeKey];
                    value = getFromLookupByValue(value, lookup);
                    // endpointNames is used when action endpoint names don't overlap with other endpoint names
                    if (args.endpointNames) value = postfixWithEndpointName(value, msg, model, meta);
                    // buttonLookup is used when action endpoint names overlap with other endpoint names
                    if (args.buttonLookup) {
                        const endpointName = getFromLookupByValue(msg.endpoint.ID, buttonLookup);
                        value = `${value}_${endpointName}`;
                    }
                    return {[expose.property]: value};
                }
            },
        },
    ];

    return {exposes: [expose], fromZigbee, isModernExtend: true};
}

export interface QuirkAddEndpointClusterArgs {
    endpointID: number;
    inputClusters?: string[] | number[];
    outputClusters?: string[] | number[];
}
export function quirkAddEndpointCluster(args: QuirkAddEndpointClusterArgs): ModernExtend {
    const {endpointID, inputClusters, outputClusters} = args;

    const configure: Configure[] = [
        async (device, coordinatorEndpoint, definition) => {
            const endpoint = device.getEndpoint(endpointID);

            if (endpoint == undefined) {
                logger.error(`Quirk: cannot add clusters to endpoint ${endpointID}, endpoint does not exist!`, 'zhc:quirkaddendpointcluster');
                return;
            }

            inputClusters?.forEach((cluster: number | string) => {
                const clusterID = isString(cluster) ? Zcl.Utils.getCluster(cluster, device.manufacturerID, device.customClusters).ID : cluster;

                if (!endpoint.inputClusters.includes(clusterID)) {
                    logger.debug(`Quirk: adding input cluster ${clusterID} to endpoint ${endpointID}.`, 'zhc:quirkaddendpointcluster');
                    endpoint.inputClusters.push(clusterID);
                }
            });

            outputClusters?.forEach((cluster: number | string) => {
                const clusterID = isString(cluster) ? Zcl.Utils.getCluster(cluster, device.manufacturerID, device.customClusters).ID : cluster;

                if (!endpoint.outputClusters.includes(clusterID)) {
                    logger.debug(`Quirk: adding output cluster ${clusterID} to endpoint ${endpointID}.`, 'zhc:quirkaddendpointcluster');
                    endpoint.outputClusters.push(clusterID);
                }
            });

            device.save();
        },
    ];

    return {configure, isModernExtend: true};
}

export function quirkCheckinInterval(timeout: number | keyof typeof timeLookup): ModernExtend {
    const configure: Configure[] = [
        async (device, coordinatorEndpoint, definition) => {
            device.checkinInterval = typeof timeout == 'number' ? timeout : timeLookup[timeout];
            device.save();
        },
    ];

    return {configure, isModernExtend: true};
}

export function reconfigureReportingsOnDeviceAnnounce(): ModernExtend {
    const onEvent: OnEvent = async (type, data, device, options, state: KeyValue) => {
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
        }
    };

    return {onEvent, isModernExtend: true};
}

export function deviceEndpoints(args: {endpoints: {[n: string]: number}; multiEndpointSkip?: string[]}): ModernExtend {
    const result: ModernExtend = {
        meta: {multiEndpoint: true},
        endpoint: (d) => args.endpoints,
        isModernExtend: true,
    };

    if (args.multiEndpointSkip) result.meta.multiEndpointSkip = args.multiEndpointSkip;

    return result;
}

export function deviceAddCustomCluster(clusterName: string, clusterDefinition: ClusterDefinition): ModernExtend {
    const onEvent: OnEvent = async (type, data, device, options, state: KeyValue) => {
        if (!device.customClusters[clusterName]) {
            device.addCustomCluster(clusterName, clusterDefinition);
        }
    };

    return {onEvent, isModernExtend: true};
}

export function ignoreClusterReport(args: {cluster: string | number}): ModernExtend {
    const fromZigbee: Fz.Converter[] = [
        {
            cluster: args.cluster.toString(),
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {},
        },
    ];

    return {fromZigbee, isModernExtend: true};
}

export function bindCluster(args: {cluster: string | number; clusterType: 'input' | 'output'; endpointNames?: string[]}): ModernExtend {
    const configure: Configure[] = [setupConfigureForBinding(args.cluster, args.clusterType, args.endpointNames)];
    return {configure, isModernExtend: true};
}

// #endregion
