import {Zcl} from 'zigbee-herdsman';
import tz from '../converters/toZigbee';
import fz from '../converters/fromZigbee';
import {Fz, Tz, ModernExtend, Range, Zh, Logger, DefinitionOta, OnEvent} from './types';
import {presets as e, access as ea} from './exposes';
import {KeyValue, Configure, Expose, DefinitionMeta} from './types';
import {configure as lightConfigure} from './light';
import {
    getFromLookupByValue, isString, isNumber, isObject, isEndpoint,
    getFromLookup, getEndpointName, assertNumber, postfixWithEndpointName,
} from './utils';

function getEndpointsWithInputCluster(device: Zh.Device, cluster: string | number) {
    if (!device.endpoints) {
        throw new Error(device.ieeeAddr + ' ' + device.endpoints);
    }
    const endpoints = device.endpoints.filter((ep) => ep.getInputClusters().find((c) => isNumber(cluster) ? c.ID === cluster : c.name === cluster));
    if (endpoints.length === 0) {
        throw new Error(`Device ${device.ieeeAddr} has no input cluster ${cluster}`);
    }
    return endpoints;
}

const timeLookup = {
    '1_HOUR': 3600,
    'MAX': 65000,
    '30_MINUTES': 1800,
    '10_SECONDS': 10,
};

type ReportingConfigTime = number | keyof typeof timeLookup;
type ReportingConfigAttribute = string | number | {ID: number, type: number};
type ReportingConfig = {min: ReportingConfigTime, max: ReportingConfigTime, change: number | [number, number], attribute: ReportingConfigAttribute}
export type ReportingConfigWithoutAttribute = Omit<ReportingConfig, 'attribute'>;

function convertReportingConfigTime(time: ReportingConfigTime): number {
    if (isString(time)) {
        if (!(time in timeLookup)) throw new Error(`Reporting time '${time}' is unknown`);
        return timeLookup[time];
    } else {
        return time;
    }
}

async function setupAttributes(
    entity: Zh.Device | Zh.Endpoint, coordinatorEndpoint: Zh.Endpoint, cluster: string | number, config: ReportingConfig[], logger: Logger,
    readOnly=false,
) {
    const endpoints = isEndpoint(entity) ? [entity] : getEndpointsWithInputCluster(entity, cluster);
    const ieeeAddr = isEndpoint(entity) ? entity.deviceIeeeAddress : entity.ieeeAddr;
    for (const endpoint of endpoints) {
        const msg = readOnly ? `Reading` : `Reading and setup reporting`;
        logger.debug(`${msg} for ${ieeeAddr}/${endpoint.ID} ${cluster} ${JSON.stringify(config)}`);
        if (!readOnly) {
            await endpoint.bind(cluster, coordinatorEndpoint);
            await endpoint.configureReporting(cluster, config.map((a) => ({
                minimumReportInterval: convertReportingConfigTime(a.min),
                maximumReportInterval: convertReportingConfigTime(a.max),
                reportableChange: a.change,
                attribute: a.attribute,
            })));
        }
        await endpoint.read(cluster, config.map((a) => isString(a) ? a : (isObject(a.attribute) ? a.attribute.ID : a.attribute)));
    }
}

export function setupConfigureForReporting(
    cluster: string | number, attribute: ReportingConfigAttribute, endpointID?: number, config?: ReportingConfigWithoutAttribute,
) {
    const configure: Configure = async (device, coordinatorEndpoint, logger) => {
        const entity = isNumber(endpointID) ? device.getEndpoint(endpointID) : device;
        const reportConfig = config ? {...config, attribute: attribute} : {attribute, min: -1, max: -1, change: -1};
        await setupAttributes(entity, coordinatorEndpoint, cluster, [reportConfig], logger, !config);
    };

    return configure;
}

export function identify(): ModernExtend {
    return {
        toZigbee: [tz.identify],
        isModernExtend: true,
    };
}

export interface OnOffArgs {
    powerOnBehavior?: boolean, ota?: DefinitionOta, skipDuplicateTransaction?: boolean, endpoints?: {[s: string]: number},
    configureReporting?: boolean,
}
export function onOff(args?: OnOffArgs): ModernExtend {
    args = {powerOnBehavior: true, skipDuplicateTransaction: false, configureReporting: true, ...args};

    const exposes: Expose[] = args.endpoints ? Object.keys(args.endpoints).map((ep) => e.switch().withEndpoint(ep)) : [e.switch()];

    const fromZigbee: Fz.Converter[] = [(args.skipDuplicateTransaction ? fz.on_off_skip_duplicate_transaction : fz.on_off)];
    const toZigbee: Tz.Converter[] = [tz.on_off];

    if (args.powerOnBehavior) {
        exposes.push(e.power_on_behavior(['off', 'on', 'toggle', 'previous']));
        fromZigbee.push(fz.power_on_behavior);
        toZigbee.push(tz.power_on_behavior);
    }

    const result: ModernExtend = {exposes, fromZigbee, toZigbee, isModernExtend: true};
    if (args.ota) result.ota = args.ota;
    if (args.endpoints) {
        result.meta = {multiEndpoint: true};
        result.endpoint = (d) => args.endpoints;
    }
    if (args.configureReporting) {
        result.configure = async (device, coordinatorEndpoint, logger) => {
            await setupAttributes(device, coordinatorEndpoint, 'genOnOff', [{attribute: 'onOff', min: 0, max: 'MAX', change: 1}], logger);
            if (args.powerOnBehavior) {
                try {
                    // Don't fail configure if reading this attribute fails, some devices don't support it.
                    await setupAttributes(device, coordinatorEndpoint, 'genOnOff',
                        [{attribute: 'startUpOnOff', min: 0, max: 'MAX', change: 1}], logger, true);
                } catch (e) {
                    if (e.message.includes('UNSUPPORTED_ATTRIBUTE')) {
                        logger.debug('Reading startUpOnOff failed, this features is unsupported');
                    } else {
                        throw e;
                    }
                }
            }
        };
    }
    return result;
}

type MultiplierDivisor = {multiplier?: number, divisor?: number}
export interface ElectricityMeterArgs {
    cluster?: 'both' | 'metering' | 'electrical',
    current?: false | MultiplierDivisor,
    power?: false | MultiplierDivisor,
    voltage?: false | MultiplierDivisor,
    energy?: false | MultiplierDivisor
}
export function electricityMeter(args?: ElectricityMeterArgs): ModernExtend {
    args = {cluster: 'both', ...args};
    if (args.cluster === 'metering' && isObject(args.power) && isObject(args.energy) &&
        (args.power?.divisor !== args.energy?.divisor || args.power?.multiplier !== args.energy?.multiplier)) {
        throw new Error(`When cluster is metering, power and energy divisor/multiplier should be equal`);
    }

    let exposes: Expose[];
    let fromZigbee: Fz.Converter[];
    let toZigbee: Tz.Converter[];

    const configureLookup = {
        haElectricalMeasurement: {
            // Report change with every 5W change
            power: {attribute: 'activePower', divisor: 'acPowerDivisor', multiplier: 'acPowerMultiplier', forced: args.power, change: 5},
            // Report change with every 0.05A change
            current: {attribute: 'rmsCurrent', divisor: 'acCurrentDivisor', multiplier: 'acCurrentMultiplier', forced: args.current, change: 0.05},
            // Report change with every 5V change
            voltage: {attribute: 'rmsVoltage', divisor: 'acVoltageDivisor', multiplier: 'acVoltageMultiplier', forced: args.voltage, change: 5},
        },
        seMetering: {
            // Report change with every 5W change
            power: {attribute: 'instantaneousDemand', divisor: 'divisor', multiplier: 'multiplier', forced: args.power, change: 5},
            // Report change with every 0.1kWh change
            energy: {attribute: 'currentSummDelivered', divisor: 'divisor', multiplier: 'multiplier', forced: args.energy, change: 0.1},
        },
    };

    if (args.power === false) {
        delete configureLookup.haElectricalMeasurement.power;
        delete configureLookup.seMetering.power;
    }
    if (args.voltage === false) delete configureLookup.haElectricalMeasurement.voltage;
    if (args.current === false) delete configureLookup.haElectricalMeasurement.current;
    if (args.energy === false) delete configureLookup.seMetering.energy;

    if (args.cluster === 'both') {
        exposes = [
            e.power().withAccess(ea.STATE_GET), e.voltage().withAccess(ea.STATE_GET),
            e.current().withAccess(ea.STATE_GET), e.energy().withAccess(ea.STATE_GET),
        ];
        fromZigbee = [fz.electrical_measurement, fz.metering];
        toZigbee = [tz.electrical_measurement_power, tz.acvoltage, tz.accurrent, tz.currentsummdelivered];
        delete configureLookup.seMetering.power;
    } else if (args.cluster === 'metering') {
        exposes = [e.power().withAccess(ea.STATE_GET), e.energy().withAccess(ea.STATE_GET)];
        fromZigbee = [fz.metering];
        toZigbee = [tz.metering_power, tz.currentsummdelivered];
        delete configureLookup.haElectricalMeasurement;
    } else if (args.cluster === 'electrical') {
        exposes = [e.power().withAccess(ea.STATE_GET), e.voltage().withAccess(ea.STATE_GET), e.current().withAccess(ea.STATE_GET)];
        fromZigbee = [fz.electrical_measurement];
        toZigbee = [tz.electrical_measurement_power, tz.acvoltage, tz.accurrent];
        delete configureLookup.seMetering;
    }

    const configure: Configure = async (device, coordinatorEndpoint, logger) => {
        for (const [cluster, properties] of Object.entries(configureLookup)) {
            for (const endpoint of getEndpointsWithInputCluster(device, cluster)) {
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
                    await setupAttributes(endpoint, coordinatorEndpoint, cluster, items, logger);
                }
            }
        }
    };

    return {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
}

export interface LightArgs {
    effect?: boolean, powerOnBehavior?: boolean, colorTemp?: {startup?: boolean, range: Range},
    color?: boolean | {modes?: ('xy' | 'hs')[], applyRedFix?: boolean, enhancedHue?: boolean}, turnsOffAtBrightness1?: boolean,
    configureReporting?: boolean, endpoints?: {[s: string]: number}, ota?: DefinitionOta,
}
export function light(args?: LightArgs): ModernExtend {
    args = {effect: true, powerOnBehavior: true, configureReporting: false, ...args};
    if (args.colorTemp) {
        args.colorTemp = {startup: true, ...args.colorTemp};
    }
    const argsColor = args.color ? {
        modes: ['xy'] satisfies ('xy' | 'hs')[], applyRedFix: false, enhancedHue: true, ...(isObject(args.color) ? args.color : {}),
    } : false;

    const lightExpose = args.endpoints ? Object.keys(args.endpoints).map((_) => e.light().withBrightness()) : [e.light().withBrightness()];

    const fromZigbee: Fz.Converter[] = [fz.on_off, fz.brightness, fz.ignore_basic_report, fz.level_config];
    const toZigbee: Tz.Converter[] = [
        tz.light_onoff_brightness, tz.ignore_transition, tz.level_config, tz.ignore_rate, tz.light_brightness_move, tz.light_brightness_step,
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

    if (args.endpoints) {
        Object.keys(args.endpoints).forEach((ep, idx) => lightExpose[idx].withEndpoint(ep));
        meta.multiEndpoint = true;
    }
    const exposes: Expose[] = lightExpose;

    if (args.effect) {
        exposes.push(e.effect());
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

    const configure: Configure = async (device, coordinatorEndpoint, logger) => {
        await lightConfigure(device, coordinatorEndpoint, logger, true);

        if (args.configureReporting) {
            await setupAttributes(device, coordinatorEndpoint, 'genOnOff', [{attribute: 'onOff', min: 0, max: 'MAX', change: 1}], logger);
            await setupAttributes(device, coordinatorEndpoint, 'genLevelCtrl',
                [{attribute: 'currentLevel', min: '10_SECONDS', max: 'MAX', change: 1}], logger);
            if (args.colorTemp) {
                await setupAttributes(device, coordinatorEndpoint, 'lightingColorCtrl',
                    [{attribute: 'colorTemperature', min: '10_SECONDS', max: 'MAX', change: 1}], logger);
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
                await setupAttributes(device, coordinatorEndpoint, 'lightingColorCtrl', attributes, logger);
            }
        }
    };

    const result: ModernExtend = {exposes, fromZigbee, toZigbee, configure, meta, isModernExtend: true};
    if (args.endpoints) result.endpoint = (d) => args.endpoints;
    if (args.ota) result.ota = args.ota;
    return result;
}

export interface LockArgs {pinCodeCount: number}
export function lock(args?: LockArgs): ModernExtend {
    args = {...args};

    const fromZigbee = [fz.lock, fz.lock_operation_event, fz.lock_programming_event, fz.lock_pin_code_response,
        fz.lock_user_status_response];
    const toZigbee = [tz.lock, tz.pincode_lock, tz.lock_userstatus, tz.lock_auto_relock_time, tz.lock_sound_volume];
    const exposes = [e.lock(), e.pincode(), e.lock_action(), e.lock_action_source_name(), e.lock_action_user(),
        e.auto_relock_time().withValueMin(0).withValueMax(3600), e.sound_volume()];
    const configure: Configure = async (device, coordinatorEndpoint, logger) => {
        await setupAttributes(device, coordinatorEndpoint, 'closuresDoorLock', [{attribute: 'lockState', min: 0, max: '1_HOUR', change: 0}], logger);
    };
    const meta: DefinitionMeta = {pinCodeCount: args.pinCodeCount};

    return {fromZigbee, toZigbee, exposes, configure, meta, isModernExtend: true};
}

export interface EnumLookupArgs {
    name: string, lookup: KeyValue, cluster: string | number, attribute: string | {ID: number, type: number}, description: string,
    zigbeeCommandOptions?: {manufacturerCode?: number, disableDefaultResponse?: boolean}, readOnly?: boolean, endpoint?: string,
    endpointID?: number, reporting?: ReportingConfigWithoutAttribute,
}
export function enumLookup(args: EnumLookupArgs): ModernExtend {
    const {
        name, lookup, cluster, attribute, description,
        zigbeeCommandOptions, readOnly, endpoint,
        endpointID, reporting,
    } = args;
    const attributeKey = isString(attribute) ? attribute : attribute.ID;

    let expose = e.enum(name, readOnly ? ea.STATE_GET : ea.ALL, Object.keys(lookup)).withDescription(description);
    if (endpoint) expose = expose.withEndpoint(endpoint);

    const fromZigbee: Fz.Converter[] = [{
        cluster: cluster.toString(),
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (attributeKey in msg.data && (!endpoint || getEndpointName(msg, model, meta) === endpoint)) {
                return {[expose.property]: getFromLookupByValue(msg.data[attributeKey], lookup)};
            }
        },
    }];

    const toZigbee: Tz.Converter[] = [{
        key: [name],
        convertSet: readOnly ? undefined : async (entity, key, value, meta) => {
            const payloadValue = getFromLookup(value, lookup);
            const payload = isString(attribute) ? {[attribute]: payloadValue} : {[attribute.ID]: {value: payloadValue, type: attribute.type}};
            await entity.write(cluster, payload, zigbeeCommandOptions);
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read(cluster, [attributeKey], zigbeeCommandOptions);
        },
    }];

    const configure = setupConfigureForReporting(cluster, attribute, endpointID, reporting);

    return {exposes: [expose], fromZigbee, toZigbee, configure, isModernExtend: true};
}

export interface NumericArgs {
    name: string, cluster: string | number, attribute: string | {ID: number, type: number}, description: string,
    zigbeeCommandOptions?: {manufacturerCode?: number, disableDefaultResponse?: boolean}, readOnly?: boolean, unit?: string,
    endpoint?: string, endpointID?: number, reporting?: ReportingConfigWithoutAttribute,
    valueMin?: number, valueMax?: number, valueStep?: number, scale?: number,
}
export function numeric(args: NumericArgs): ModernExtend {
    const {
        name, cluster, attribute, description,
        zigbeeCommandOptions, readOnly, unit, endpoint,
        endpointID, reporting,
        valueMin, valueMax, valueStep, scale,
    } = args;
    const attributeKey = isString(attribute) ? attribute : attribute.ID;

    let expose = e.numeric(name, readOnly ? ea.STATE_GET : ea.ALL).withDescription(description);
    if (endpoint) expose = expose.withEndpoint(endpoint);
    if (unit) expose = expose.withUnit(unit);
    if (valueMin !== undefined) expose = expose.withValueMin(valueMin);
    if (valueMax !== undefined) expose = expose.withValueMax(valueMax);
    if (valueStep !== undefined) expose = expose.withValueStep(valueStep);

    const fromZigbee: Fz.Converter[] = [{
        cluster: cluster.toString(),
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (attributeKey in msg.data && (!endpoint || getEndpointName(msg, model, meta) === endpoint)) {
                let value = msg.data[attributeKey];
                assertNumber(value);
                if (scale !== undefined) value = value / scale;
                return {[expose.property]: value};
            }
        },
    }];

    const toZigbee: Tz.Converter[] = [{
        key: [name],
        convertSet: readOnly ? undefined : async (entity, key, value, meta) => {
            assertNumber(value, key);
            const payloadValue = scale === undefined ? value : value * scale;
            const payload = isString(attribute) ? {[attribute]: payloadValue} : {[attribute.ID]: {value: payloadValue, type: attribute.type}};
            await entity.write(cluster, payload, zigbeeCommandOptions);
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read(cluster, [attributeKey], zigbeeCommandOptions);
        },
    }];

    const configure = setupConfigureForReporting(cluster, attribute, endpointID, reporting);

    return {exposes: [expose], fromZigbee, toZigbee, configure, isModernExtend: true};
}

export interface BinaryArgs {
    name: string, valueOn: [string | boolean, unknown], valueOff: [string | boolean, unknown], cluster: string | number,
    attribute: string | {ID: number, type: number}, description: string, zigbeeCommandOptions?: {manufacturerCode: number},
    endpoint?: string, endpointID?: number, reporting?: ReportingConfig, readOnly?: boolean,
}
export function binary(args: BinaryArgs): ModernExtend {
    const {
        name, valueOn, valueOff, cluster, attribute, description, zigbeeCommandOptions,
        endpoint, endpointID, reporting, readOnly,
    } = args;
    const attributeKey = isString(attribute) ? attribute : attribute.ID;

    let expose = e.binary(name, readOnly ? ea.STATE_GET : ea.ALL, valueOn[0], valueOff[0]).withDescription(description);
    if (endpoint) expose = expose.withEndpoint(endpoint);

    const fromZigbee: Fz.Converter[] = [{
        cluster: cluster.toString(),
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (attributeKey in msg.data && (!endpoint || getEndpointName(msg, model, meta) === endpoint)) {
                return {[expose.property]: msg.data[attributeKey] === valueOn[1] ? valueOn[0] : valueOff[0]};
            }
        },
    }];

    const toZigbee: Tz.Converter[] = [{
        key: [name],
        convertSet: readOnly ? undefined : async (entity, key, value, meta) => {
            const payloadValue = value === valueOn[0] ? valueOn[1] : valueOff[1];
            const payload = isString(attribute) ? {[attribute]: payloadValue} : {[attribute.ID]: {value: payloadValue, type: attribute.type}};
            await entity.write(cluster, payload, zigbeeCommandOptions);
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read(cluster, [attributeKey], zigbeeCommandOptions);
        },
    }];

    const configure = setupConfigureForReporting(cluster, attribute, endpointID, reporting);

    return {exposes: [expose], fromZigbee, toZigbee, configure, isModernExtend: true};
}

export interface ActionEnumLookupArgs {
    lookup: KeyValue, cluster: string | number, attribute: string | {ID: number, type: number}, postfixWithEndpointName?: boolean,
}
export function actionEnumLookup(args: ActionEnumLookupArgs): ModernExtend {
    const {lookup, attribute, cluster} = args;
    const attributeKey = isString(attribute) ? attribute : attribute.ID;

    const expose = e.enum('action', ea.STATE, Object.keys(lookup)).withDescription('Triggered action (e.g. a button click)');

    const fromZigbee: Fz.Converter[] = [{
        cluster: cluster.toString(),
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (attributeKey in msg.data) {
                let value = getFromLookupByValue(msg.data[attributeKey], lookup);
                if (args.postfixWithEndpointName) value = postfixWithEndpointName(value, msg, model, meta);
                return {[expose.property]: value};
            }
        },
    }];

    return {exposes: [expose], fromZigbee, isModernExtend: true};
}

export function forcePowerSource(args: {powerSource: 'Mains (single phase)' | 'Battery'}): ModernExtend {
    const configure: Configure = async (device, coordinatorEndpoint, logger) => {
        device.powerSource = args.powerSource;
        device.save();
    };
    return {configure, isModernExtend: true};
}

export interface QuirkAddEndpointClusterArgs {
    endpointID: number, inputClusters?: string[] | number[], outputClusters?: string[] | number[],
}
export function quirkAddEndpointCluster(args: QuirkAddEndpointClusterArgs): ModernExtend {
    const {endpointID, inputClusters, outputClusters} = args;

    const configure: Configure = async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(endpointID);

        if (endpoint == undefined) {
            logger.error(`Quirk: cannot add clusters to endpoint ${endpointID}, endpoint does not exist!`);
            return;
        }

        inputClusters?.forEach((cluster: number | string) => {
            const clusterID = isString(cluster) ?
                Zcl.Utils.getCluster(cluster, device.manufacturerID).ID :
                cluster;

            if (!endpoint.inputClusters.includes(clusterID)) {
                logger.debug(`Quirk: adding input cluster ${clusterID} to endpoint ${endpointID}.`);
                endpoint.inputClusters.push(clusterID);
            }
        });

        outputClusters?.forEach((cluster: number | string) => {
            const clusterID = isString(cluster) ?
                Zcl.Utils.getCluster(cluster, device.manufacturerID).ID :
                cluster;

            if (!endpoint.outputClusters.includes(clusterID)) {
                logger.debug(`Quirk: adding output cluster ${clusterID} to endpoint ${endpointID}.`);
                endpoint.outputClusters.push(clusterID);
            }
        });

        device.save();
    };

    return {configure, isModernExtend: true};
}

export function quirkPendingRequestTimeout(timeout: keyof typeof timeLookup): ModernExtend {
    const timeoutMs = timeLookup[timeout] * 1000;
    const configure: Configure = async (device, coordinatorEndpoint, logger) => {
        device.pendingRequestTimeout = timeoutMs;
        device.save();
    };

    return {configure, isModernExtend: true};
}

export function reconfigureReportingsOnDeviceAnnounce(): ModernExtend {
    const onEvent: OnEvent = async (type, data, device, options, state: KeyValue) => {
        if (type === 'deviceAnnounce') {
            for (const endpoint of device.endpoints) {
                for (const c of endpoint.configuredReportings) {
                    await endpoint.configureReporting(c.cluster.name, [{
                        attribute: c.attribute.name, minimumReportInterval: c.minimumReportInterval,
                        maximumReportInterval: c.maximumReportInterval, reportableChange: c.reportableChange,
                    }]);
                }
            }
        }
    };

    return {onEvent, isModernExtend: true};
}

export function forceDeviceType(args: {type: 'EndDevice' | 'Router'}): ModernExtend {
    const configure: Configure = async (device, coordinatorEndpoint, logger) => {
        device.type = args.type;
        device.save();
    };
    return {configure, isModernExtend: true};
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
        readOnly: true,
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
        readOnly: true,
        ...args,
    });
}

export function batteryPercentage(args?: Partial<NumericArgs>) {
    return numeric({
        name: 'battery',
        cluster: 'genPowerCfg',
        attribute: 'batteryPercentageRemaining',
        reporting: {min: '1_HOUR', max: 'MAX', change: 10},
        description: 'Remaining battery in %',
        unit: '%',
        scale: 2,
        readOnly: true,
        ...args,
    });
}

export function pressure(args?: Partial<NumericArgs>): ModernExtend {
    return numeric({
        name: 'pressure',
        cluster: 'msPressureMeasurement',
        attribute: 'measuredValue',
        reporting: {min: '10_SECONDS', max: '1_HOUR', change: 100},
        description: 'The measured atmospheric pressure',
        unit: 'hPa',
        scale: 100,
        readOnly: true,
        ...args,
    });
}
