import {Cluster} from 'zigbee-herdsman/dist/zcl/tstype';
import {Definition, ModernExtend, Zh} from './types';
import {getClusterAttributeValue} from './utils';
import * as m from './modernExtend';
import * as zh from 'zigbee-herdsman/dist';
import {philipsLight} from './philips';
import {Device, Endpoint} from 'zigbee-herdsman/dist/controller/model';

interface GeneratedExtend {extend?: ModernExtend, extendFn?: (a: object) => ModernExtend, args?: object, source: string, lib?: string}
type ExtendGenerator = (endpoints?: Zh.Endpoint[]) => Promise<GeneratedExtend[]>;
type Extender = [string[], ExtendGenerator];

type DefinitionWithZigbeeModel = Definition & {zigbeeModel: string[]};

function generateSource(definition: DefinitionWithZigbeeModel, generatedExtend: GeneratedExtend[]): string {
    const imports: {[s: string]: string[]} = {};
    const importsDeduplication = new Set<string>();
    generatedExtend.forEach((e) => {
        const lib = e.lib ?? 'modernExtend';
        if (!(lib in imports)) imports[lib] = [];

        const importName = e.source.split('(')[0];
        if (!importsDeduplication.has(importName)) {
            importsDeduplication.add(importName);

            imports[lib].push(importName);
        }
    });

    const importsStr = Object.entries(imports)
        .map((e) => `const {${e[1].join(', ')}} = require('zigbee-herdsman-converters/lib/${e[0]}');`).join('\n');


    const genSource = (g: GeneratedExtend): string => {
        if (!g.extendFn) {
            return g.source;
        }

        let jsonArgs = JSON.stringify(g.args);
        if (!g.args || jsonArgs === '{}') {
            jsonArgs = '';
        }

        return g.source + '(' + jsonArgs + ')';
    };

    return `${importsStr}

const definition = {
    zigbeeModel: ['${definition.zigbeeModel}'],
    model: '${definition.model}',
    vendor: '${definition.vendor}',
    description: 'Automatically generated definition',
    extend: [${generatedExtend.map(genSource).join(', ')}],
    meta: ${JSON.stringify(definition.meta || {})},
};

module.exports = definition;`;
}

export async function generateDefinition(device: Zh.Device): Promise<{externalDefinitionSource: string, definition: Definition}> {
    // Map cluster to all endpoints that have this cluster.
    const mapClusters = (endpoint: Endpoint, clusters: Cluster[], clusterMap: Map<string, Endpoint[]>) => {
        for (const cluster of clusters) {
            if (!clusterMap.has(cluster.name)) {
                clusterMap.set(cluster.name, []);
            }

            const endpointsWithCluster = clusterMap.get(cluster.name);
            endpointsWithCluster.push(endpoint);
        }
    };

    const knownInputClusters = inputExtenders.map((ext) => ext[0]).flat(1);
    const knownOutputClusters = outputExtenders.map((ext) => ext[0]).flat(1);

    const inputClusterMap = new Map<string, Endpoint[]>();
    const outputClusterMap = new Map<string, Endpoint[]>();

    for (const endpoint of device.endpoints) {
        // Filter clusters to leave only the ones that we can generate extenders for.
        const inputClusters = endpoint.getInputClusters().filter((c) => knownInputClusters.find((known) => known === c.name));
        const outputClusters = endpoint.getOutputClusters().filter((c) => knownOutputClusters.find((known) => known === c.name));

        mapClusters(endpoint, inputClusters, inputClusterMap);
        mapClusters(endpoint, outputClusters, outputClusterMap);
    }
    // Generate extenders
    const usedExtenders: Extender[] = [];
    const generatedExtend: GeneratedExtend[] = [];
    const addGenerators = async (clusterName: string, endpoints: Zh.Endpoint[], extenders: Extender[]) => {
        const extender = extenders.find((e) => e[0].includes(clusterName));
        if (!extender || usedExtenders.includes(extender)) {
            return;
        }
        usedExtenders.push(extender);
        generatedExtend.push(...(await extender[1](endpoints)));
    };

    for (const [cluster, endpoints] of inputClusterMap) {
        await addGenerators(cluster, endpoints, inputExtenders);
    }

    for (const [cluster, endpoints] of outputClusterMap) {
        await addGenerators(cluster, endpoints, outputExtenders);
    }

    const extenders = generatedExtend.map((e) => e.extend || e.extendFn(e.args));
    // Generated definition below will provide this.
    extenders.forEach((extender) => {
        extender.endpoint = undefined;
    });
    const definition: Definition = {
        zigbeeModel: [device.modelID],
        model: device.modelID ?? '',
        vendor: device.manufacturerName ?? '',
        description: 'Automatically generated definition',
        extend: extenders,
        generated: true,
        endpoint: (d: Device): {[e: string]: number} => {
            return d && d.endpoints ? d.endpoints.reduce<{[s: string]: number}>(
                (prev, curr) => {
                    prev[curr.ID.toString()] = curr.ID;
                    return prev;
                },
                {}) : undefined;
        },
    };

    if (Array.from(inputClusterMap.values()).some((e) => e.length > 1) ||
        Array.from(outputClusterMap.values()).some((e) => e.length > 1)) {
        definition.meta = {multiEndpoint: true};
    }

    const externalDefinitionSource = generateSource(definition, generatedExtend);
    return {externalDefinitionSource, definition};
}

function stringifyEps(endpoints: Endpoint[]): string[] {
    return endpoints.map((e) => e.ID.toString());
}

const inputExtenders: Extender[] = [
    [['msTemperatureMeasurement'], async (eps) => [{extendFn: m.temperature, args: {endpoints: stringifyEps(eps)}, source: 'temperature'}]],
    [['msPressureMeasurement'], async (eps) => [{extendFn: m.pressure, args: {endpoints: stringifyEps(eps)}, source: 'pressure'}]],
    [['msRelativeHumidity'], async (eps) => [{extendFn: m.humidity, args: {endpoints: stringifyEps(eps)}, source: 'humidity'}]],
    [['msCO2'], async (eps) => [{extendFn: m.co2, args: {endpoints: stringifyEps(eps)}, source: 'co2'}]],
    [['genPowerCfg'], async () => [{extendFn: m.batteryPercentage, source: 'batteryPercentage'}]],
    [['genOnOff', 'lightingColorCtrl'], extenderOnOffLight],
    [['seMetering', 'haElectricalMeasurement'], extenderElectricityMeter],
    [['closuresDoorLock'], extenderLock],
];

const outputExtenders: Extender[] = [
    [['genIdentify'], async () => [{extend: m.identify(), source: 'identify()'}]],
];

async function extenderLock(endpoints: Zh.Endpoint[]): Promise<GeneratedExtend[]> {
    // TODO: Support multiple endpoints
    if (endpoints.length > 1) {
        throw new Error('extenderLock can accept only one endpoint');
    }

    const endpoint = endpoints[0];

    const pinCodeCount = await getClusterAttributeValue<number>(endpoint, 'closuresDoorLock', 'numOfPinUsersSupported', 50);
    return [{extend: m.lock({pinCodeCount}), source: `lock({pinCodeCount: ${pinCodeCount}})`}];
}

async function extenderOnOffLight(endpoints: Zh.Endpoint[]): Promise<GeneratedExtend[]> {
    const generated: GeneratedExtend[] = [];

    const lightEndpoints = endpoints.filter((e) => e.supportsInputCluster('lightingColorCtrl'));
    const onOffEndpoints = endpoints.filter((e) => lightEndpoints.findIndex((ep) => e.ID === ep.ID) === -1);

    if (onOffEndpoints.length !== 0) {
        const endpoints = onOffEndpoints.length > 1 ? onOffEndpoints.reduce((prev, curr) => {
            prev[curr.ID.toString()] = curr.ID;
            return prev;
        }, {} as Record<string, number>) : undefined;
        generated.push({extendFn: m.onOff, args: {powerOnBehavior: false, endpoints}, source: 'onOff'});
    }

    for (const endpoint of lightEndpoints) {
        // In case read fails, support all features with 31
        const colorCapabilities = await getClusterAttributeValue<number>(endpoint, 'lightingColorCtrl', 'colorCapabilities', 31);
        const supportsHueSaturation = (colorCapabilities & 1<<0) > 0;
        const supportsEnhancedHueSaturation = (colorCapabilities & 1<<1) > 0;
        const supportsColorXY = (colorCapabilities & 1<<3) > 0;
        const supportsColorTemperature = (colorCapabilities & 1<<4) > 0;
        const args: m.LightArgs = {};

        if (supportsColorTemperature) {
            const minColorTemp = await getClusterAttributeValue<number>(endpoint, 'lightingColorCtrl', 'colorTempPhysicalMin', 150);
            const maxColorTemp = await getClusterAttributeValue<number>(endpoint, 'lightingColorCtrl', 'colorTempPhysicalMax', 500);
            args.colorTemp = {range: [minColorTemp, maxColorTemp]};
        }

        if (supportsColorXY) {
            args.color = true;
            if (supportsHueSaturation || supportsEnhancedHueSaturation) {
                args.color = {};
                if (supportsHueSaturation) args.color.modes = ['xy', 'hs'];
                if (supportsEnhancedHueSaturation) args.color.enhancedHue = true;
            }
        }

        if (endpoint.getDevice().manufacturerID === zh.Zcl.ManufacturerCode.Philips) {
            generated.push({extendFn: philipsLight, args, source: `philipsLight`, lib: 'philips'});
        } else {
            generated.push({extendFn: m.light, args, source: `light`});
        }
    }

    return generated;
}

async function extenderElectricityMeter(endpoints: Zh.Endpoint[]): Promise<GeneratedExtend[]> {
    // TODO: Support multiple endpoints
    if (endpoints.length > 1) {
        throw new Error('extenderElectricityMeter can accept only one endpoint');
    }

    const endpoint = endpoints[0];

    const metering = endpoint.supportsInputCluster('seMetering');
    const electricalMeasurements = endpoint.supportsInputCluster('haElectricalMeasurement');
    const args: m.ElectricityMeterArgs = {};
    if (!metering || !electricalMeasurements) {
        args.cluster = metering ? 'metering' : 'electrical';
    }
    return [{extendFn: m.electricityMeter, args, source: `electricityMeter`}];
}
