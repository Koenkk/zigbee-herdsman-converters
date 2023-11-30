import tz from '../converters/toZigbee';
import fz from '../converters/fromZigbee';
import {Fz, Tz, ModernExtend, Range, Zh, Logger} from './types';
import {presets as e, access as ea} from './exposes';
import {KeyValue, Configure, Expose, DefinitionMeta} from './types';
import {configure as lightConfigure} from './light';
import {ConfigureReportingItem} from 'zigbee-herdsman/dist/controller/model/endpoint';
import {getFromLookupByValue, isString, getFromLookup, getEndpointName, assertNumber, postfixWithEndpointName, isObject, isEndpoint} from './utils';
import {repInterval} from './constants';

const DefaultReportingItemValues = {
    minimumReportInterval: 0,
    maximumReportInterval: repInterval.MAX,
    reportableChange: 1,
};

function getEndpointsWithInputCluster(device: Zh.Device, cluster: string) {
    if (!device.endpoints) {
        throw new Error(device.ieeeAddr + ' ' + device.endpoints);
    }
    const endpoints = device.endpoints.filter((ep) => ep.getInputClusters().find((c) => c.name === cluster));
    if (endpoints.length === 0) {
        throw new Error(`Device ${device.ieeeAddr} has no input cluster ${cluster}`);
    }
    return endpoints;
}

async function setupAttributes(
    entity: Zh.Device | Zh.Endpoint, coordinatorEndpoint: Zh.Endpoint, cluster: string, attributes: (string|ConfigureReportingItem)[], logger: Logger,
    readOnly=false,
) {
    const endpoints = isEndpoint(entity) ? [entity] : getEndpointsWithInputCluster(entity, cluster);
    const ieeeAddr = isEndpoint(entity) ? entity.deviceIeeeAddress : entity.ieeeAddr;
    for (const endpoint of endpoints) {
        const msg = readOnly ? `Reading` : `Reading and setup reporting`;
        logger.debug(`${msg} for ${ieeeAddr}/${endpoint.ID} ${cluster} ${JSON.stringify(attributes)}`);
        const items = attributes.map((attribute) => ({...DefaultReportingItemValues, ...(isString(attribute) ? {attribute} : attribute)}));
        if (!readOnly) {
            await endpoint.bind(cluster, coordinatorEndpoint);
            await endpoint.configureReporting(cluster, items);
        }
        await endpoint.read(cluster, attributes.map((a) => isString(a) ? a : (isObject(a.attribute) ? a.attribute.ID : a.attribute)));
    }
}

export interface SwitchArgs {powerOnBehavior?: boolean}
export function onOff(args?: SwitchArgs): ModernExtend {
    args = {powerOnBehavior: true, ...args};

    const exposes: Expose[] = [e.switch()];
    const fromZigbee: Fz.Converter[] = [fz.on_off];
    const toZigbee: Tz.Converter[] = [tz.on_off];

    const configure: Configure = async (device, coordinatorEndpoint, logger) => {
        await setupAttributes(device, coordinatorEndpoint, 'genOnOff', ['onOff'], logger);
        if (args.powerOnBehavior) {
            await setupAttributes(device, coordinatorEndpoint, 'genOnOff', ['startUpOnOff'], logger, true);
        }
    };

    if (args.powerOnBehavior) {
        exposes.push(e.power_on_behavior(['off', 'on', 'toggle', 'previous']));
        fromZigbee.push(fz.power_on_behavior);
        toZigbee.push(tz.power_on_behavior);
    }

    return {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
}

type MultiplierDivisor = {multiplier?: number, divisor?: number}
interface ElectricityMeterArgs {
    cluster?: 'both' | 'metering' | 'electrical',
    current?: MultiplierDivisor,
    power?: MultiplierDivisor,
    voltage?: MultiplierDivisor,
    energy?: MultiplierDivisor
}
export function electricityMeter(args?: ElectricityMeterArgs): ModernExtend {
    args = {cluster: 'both', ...args};
    if (args.cluster === 'metering' && (args.power?.divisor !== args.energy?.divisor || args.power?.multiplier !== args.energy?.multiplier)) {
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

    if (args.cluster === 'both') {
        exposes = [e.power().withAccess(ea.ALL), e.voltage().withAccess(ea.ALL), e.current().withAccess(ea.ALL), e.energy().withAccess(ea.ALL)];
        fromZigbee = [fz.electrical_measurement, fz.metering];
        toZigbee = [tz.electrical_measurement_power, tz.acvoltage, tz.accurrent, tz.currentsummdelivered];
        delete configureLookup.seMetering.power;
    } else if (args.cluster === 'metering') {
        exposes = [e.power().withAccess(ea.ALL), e.energy().withAccess(ea.ALL)];
        fromZigbee = [fz.metering];
        toZigbee = [tz.metering_power, tz.currentsummdelivered];
        delete configureLookup.haElectricalMeasurement;
    } else if (args.cluster === 'electrical') {
        exposes = [e.power().withAccess(ea.ALL), e.voltage().withAccess(ea.ALL), e.current().withAccess(ea.ALL)];
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
    color?: boolean | {modes: ('xy' | 'hs')[]}
}
export function light(args?: LightArgs): ModernExtend {
    args = {effect: true, powerOnBehaviour: true, ...args};
    if (args.colorTemp) {
        args.colorTemp = {startup: true, ...args.colorTemp};
    }
    const argsColor = args.color ? false : {modes: ['xy'] satisfies ('xy' | 'hs')[], ...(isObject(args.color) ? args.color : {})};

    let lightExpose = e.light().withBrightness();

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
        lightExpose = lightExpose.withColorTemp(args.colorTemp.range);
        toZigbee.push(tz.light_colortemp_move, tz.light_colortemp_step);
        if (args.colorTemp.startup) {
            toZigbee.push(tz.light_colortemp_startup);
            lightExpose = lightExpose.withColorTempStartup(args.colorTemp.range);
        }
    }

    if (argsColor) {
        lightExpose = lightExpose.withColor(argsColor.modes);
        toZigbee.push(tz.light_hue_saturation_move, tz.light_hue_saturation_step);
        if (argsColor.modes.includes('hs')) {
            meta.supportsHueAndSaturation = true;
        }
    }

    const exposes: Expose[] = [lightExpose];

    if (args.effect) {
        exposes.push(e.effect());
        toZigbee.push(tz.effect);
    }

    if (args.powerOnBehaviour) {
        exposes.push(e.power_on_behavior(['off', 'on', 'toggle', 'previous']));
        fromZigbee.push(fz.power_on_behavior);
        toZigbee.push(tz.power_on_behavior);
    }

    const configure: Configure = async (device, coordinatorEndpoint, logger) => {
        await lightConfigure(device, coordinatorEndpoint, logger, true);
    };

    return {exposes, fromZigbee, toZigbee, configure, isModernExtend: true};
}

export interface EnumLookupArgs {
    name: string, lookup: KeyValue, cluster: string | number, attribute: string | {id: number, type: number}, description: string,
    zigbeeCommandOptions?: {manufacturerCode: number}, readOnly?: boolean, endpoint?: string,
}
export function enumLookup(args: EnumLookupArgs): ModernExtend {
    const {name, lookup, cluster, attribute, description, zigbeeCommandOptions, endpoint, readOnly} = args;
    const attributeKey = isString(attribute) ? attribute : attribute.id;

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
            const payload = isString(attribute) ? {[attribute]: payloadValue} : {[attribute.id]: {value: payloadValue, type: attribute.type}};
            await entity.write(cluster, payload, zigbeeCommandOptions);
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read(cluster, [attributeKey], zigbeeCommandOptions);
        },
    }];

    return {exposes: [expose], fromZigbee, toZigbee, isModernExtend: true};
}

export interface NumericArgs {
    name: string, cluster: string | number, attribute: string | {id: number, type: number}, description: string,
    zigbeeCommandOptions?: {manufacturerCode: number}, readOnly?: boolean, unit?: string, endpoint?: string,
    valueMin?: number, valueMax?: number, valueStep?: number, scale?: number,
}
export function numeric(args: NumericArgs): ModernExtend {
    const {name, cluster, attribute, description, zigbeeCommandOptions, unit, readOnly, valueMax, valueMin, valueStep, endpoint, scale} = args;
    const attributeKey = isString(attribute) ? attribute : attribute.id;

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
            const payload = isString(attribute) ? {[attribute]: payloadValue} : {[attribute.id]: {value: payloadValue, type: attribute.type}};
            await entity.write(cluster, payload, zigbeeCommandOptions);
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read(cluster, [attributeKey], zigbeeCommandOptions);
        },
    }];

    return {exposes: [expose], fromZigbee, toZigbee, isModernExtend: true};
}

export interface BinaryArgs {
    name: string, valueOn: [string | boolean, unknown], valueOff: [string | boolean, unknown], cluster: string | number,
    attribute: string | {id: number, type: number}, description: string, zigbeeCommandOptions?: {manufacturerCode: number},
    readOnly?: boolean, endpoint?: string,
}
export function binary(args: BinaryArgs): ModernExtend {
    const {name, valueOn, valueOff, cluster, attribute, description, zigbeeCommandOptions, readOnly, endpoint} = args;
    const attributeKey = isString(attribute) ? attribute : attribute.id;

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
            const payload = isString(attribute) ? {[attribute]: payloadValue} : {[attribute.id]: {value: payloadValue, type: attribute.type}};
            await entity.write(cluster, payload, zigbeeCommandOptions);
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read(cluster, [attributeKey], zigbeeCommandOptions);
        },
    }];

    return {exposes: [expose], fromZigbee, toZigbee, isModernExtend: true};
}

export interface ActionEnumLookupArgs {
    lookup: KeyValue, cluster: string | number, attribute: string | {id: number, type: number}, postfixWithEndpointName?: boolean,
}
export function actionEnumLookup(args: ActionEnumLookupArgs): ModernExtend {
    const {lookup, attribute, cluster} = args;
    const attributeKey = isString(attribute) ? attribute : attribute.id;

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
