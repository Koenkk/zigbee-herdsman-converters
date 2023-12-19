import tz from '../converters/toZigbee';
import fz from '../converters/fromZigbee';
import {Fz, Tz, ModernExtend, Range, Zh, Logger, DefinitionOta} from './types';
import {presets as e, access as ea} from './exposes';
import {KeyValue, Configure, Expose, DefinitionMeta} from './types';
import {configure as lightConfigure} from './light';
import {ConfigureReportingItem as ZHConfigureReportingItem} from 'zigbee-herdsman/dist/controller/model/endpoint';
import {
    getFromLookupByValue, isString, isNumber, isObject, isEndpoint,
    getFromLookup, getEndpointName, assertNumber, postfixWithEndpointName,
} from './utils';
import {repInterval} from './constants';

const DefaultReportingItemValues = {
    minimumReportInterval: 0,
    maximumReportInterval: repInterval.MAX,
    reportableChange: 1,
};

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

type ConfigureReportingItem = Partial<ZHConfigureReportingItem> & {attribute: string | number | {ID: number, type: number}}

async function setupAttributes(
    entity: Zh.Device | Zh.Endpoint, coordinatorEndpoint: Zh.Endpoint, cluster: string | number, attributes: ConfigureReportingItem[], logger: Logger,
    readOnly=false,
) {
    const endpoints = isEndpoint(entity) ? [entity] : getEndpointsWithInputCluster(entity, cluster);
    const ieeeAddr = isEndpoint(entity) ? entity.deviceIeeeAddress : entity.ieeeAddr;
    for (const endpoint of endpoints) {
        const msg = readOnly ? `Reading` : `Reading and setup reporting`;
        logger.debug(`${msg} for ${ieeeAddr}/${endpoint.ID} ${cluster} ${JSON.stringify(attributes)}`);
        if (!readOnly) {
            await endpoint.bind(cluster, coordinatorEndpoint);
            await endpoint.configureReporting(cluster, attributes.map((a) => ({...DefaultReportingItemValues, ...a})));
        }
        await endpoint.read(cluster, attributes.map((a) => isString(a) ? a : (isObject(a.attribute) ? a.attribute.ID : a.attribute)));
    }
}

export function setupConfigureForReporting(
    cluster: string | number, attribute: string | number | {ID: number, type: number},
    endpointID?: number, reportingConfiguration?: Partial<ZHConfigureReportingItem>,
) {
    const configure: Configure = async (device, coordinatorEndpoint, logger) => {
        const entity = isNumber(endpointID) ? device.getEndpoint(endpointID) : device;
        const reportConfig = (reportingConfiguration !== undefined) ? {...reportingConfiguration, ...{attribute: attribute}} : {attribute: attribute};
        await setupAttributes(entity, coordinatorEndpoint, cluster, [reportConfig], logger, (reportingConfiguration === undefined));
    };

    return configure;
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
            await setupAttributes(device, coordinatorEndpoint, 'genOnOff', [{attribute: 'onOff'}], logger);
            if (args.powerOnBehavior) {
                await setupAttributes(device, coordinatorEndpoint, 'genOnOff', [{attribute: 'startUpOnOff'}], logger, true);
            }
        };
    }
    return result;
}

type MultiplierDivisor = {multiplier?: number, divisor?: number}
interface ElectricityMeterArgs {
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
                const items: ConfigureReportingItem[] = [];
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
                    let reportableChange: number | [number, number] = property.change * (divisor / multiplier);
                    // currentSummDelivered data type is uint48, so reportableChange also is uint48
                    if (property.attribute === 'currentSummDelivered') reportableChange = [0, reportableChange];
                    items.push({
                        attribute: property.attribute,
                        minimumReportInterval: repInterval.SECONDS_10,
                        maximumReportInterval: repInterval.MAX,
                        reportableChange,
                    });
                }
                await setupAttributes(endpoint, coordinatorEndpoint, cluster, items, logger);
            }
        }
    };

    return {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
}

export interface LightArgs {
    effect?: boolean, powerOnBehaviour?: boolean, colorTemp?: {startup?: boolean, range: Range},
    color?: boolean | {modes?: ('xy' | 'hs')[], applyRedFix?: boolean, enhancedHue?: boolean}, turnsOffAtBrightness1?: boolean,
    configureReporting?: boolean, endpoints?: {[s: string]: number}, ota?: DefinitionOta,
}
export function light(args?: LightArgs): ModernExtend {
    args = {effect: true, powerOnBehaviour: true, configureReporting: false, ...args};
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
        toZigbee.push(tz.light_color_colortemp, tz.light_color_mode, tz.light_color_options);
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

    if (args.powerOnBehaviour) {
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
            await setupAttributes(device, coordinatorEndpoint, 'genOnOff', [{attribute: 'onOff'}], logger);
            await setupAttributes(device, coordinatorEndpoint, 'genLevelCtrl', [{attribute: 'currentLevel', minimumReportInterval: 10}], logger);
            if (args.colorTemp) {
                await setupAttributes(device, coordinatorEndpoint, 'lightingColorCtrl',
                    [{attribute: 'colorTemperature', minimumReportInterval: 10}], logger);
            }
            if (argsColor) {
                const attributes: ConfigureReportingItem[] = [];
                if (argsColor.modes.includes('xy')) {
                    attributes.push(
                        {attribute: 'currentX', minimumReportInterval: 10},
                        {attribute: 'currentY', minimumReportInterval: 10},
                    );
                }
                if (argsColor.modes.includes('hs')) {
                    attributes.push(
                        {attribute: argsColor.enhancedHue ? 'enhancedCurrentHue' : 'currentHue', minimumReportInterval: 10},
                        {attribute: 'currentSaturation', minimumReportInterval: 10},
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

export interface EnumLookupArgs {
    name: string, lookup: KeyValue, cluster: string | number, attribute: string | {ID: number, type: number}, description: string,
    zigbeeCommandOptions?: {manufacturerCode?: number, disableDefaultResponse?: boolean}, readOnly?: boolean, endpoint?: string,
    endpointID?: number, configureReporting?: Partial<ZHConfigureReportingItem>,
}
export function enumLookup(args: EnumLookupArgs): ModernExtend {
    const {
        name, lookup, cluster, attribute, description,
        zigbeeCommandOptions, readOnly, endpoint,
        endpointID, configureReporting,
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

    const configure = setupConfigureForReporting(cluster, attribute, endpointID, configureReporting);

    return {exposes: [expose], fromZigbee, toZigbee, configure, isModernExtend: true};
}

export interface NumericArgs {
    name: string, cluster: string | number, attribute: string | {ID: number, type: number}, description: string,
    zigbeeCommandOptions?: {manufacturerCode?: number, disableDefaultResponse?: boolean}, readOnly?: boolean, unit?: string,
    endpoint?: string, endpointID?: number, configureReporting?: Partial<ZHConfigureReportingItem>,
    valueMin?: number, valueMax?: number, valueStep?: number, scale?: number,
}
export function numeric(args: NumericArgs): ModernExtend {
    const {
        name, cluster, attribute, description,
        zigbeeCommandOptions, readOnly, unit, endpoint,
        endpointID, configureReporting,
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

    const configure = setupConfigureForReporting(cluster, attribute, endpointID, configureReporting);

    return {exposes: [expose], fromZigbee, toZigbee, configure, isModernExtend: true};
}

export interface BinaryArgs {
    name: string, valueOn: [string | boolean, unknown], valueOff: [string | boolean, unknown], cluster: string | number,
    attribute: string | {ID: number, type: number}, description: string, zigbeeCommandOptions?: {manufacturerCode: number},
    endpoint?: string, endpointID?: number, configureReporting?: Partial<ZHConfigureReportingItem>, readOnly?: boolean,
}
export function binary(args: BinaryArgs): ModernExtend {
    const {
        name, valueOn, valueOff, cluster, attribute, description, zigbeeCommandOptions,
        endpoint, endpointID, configureReporting, readOnly,
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

    const configure = setupConfigureForReporting(cluster, attribute, endpointID, configureReporting);

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

export function forceDeviceType(args: {type: 'EndDevice' | 'Router'}): ModernExtend {
    const configure: Configure = async (device, coordinatorEndpoint, logger) => {
        device.type = args.type;
        device.save();
    };
    return {configure, isModernExtend: true};
}
