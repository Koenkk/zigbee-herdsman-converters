import {Cluster} from 'zigbee-herdsman/dist/zcl/tstype';
import {Definition, ModernExtend, Zh} from './types';
import {getClusterAttributeValue} from './utils';
import * as m from './modernExtend';
import * as zh from 'zigbee-herdsman/dist';
import {philipsLight} from './philips';
import {Device} from 'zigbee-herdsman/dist/controller/model';

interface GeneratedExtend {extend?: ModernExtend, extendFn?: (a: object) => ModernExtend, args?: object, source: string, lib?: string}
type ExtendGenerator = (endpoint: Zh.Endpoint) => Promise<GeneratedExtend[]>;
type Extender = [string[], ExtendGenerator];

function generateSource(zigbeeModel: string, definition: Definition, generatedExtend: GeneratedExtend[]): string {
    const imports: {[s: string]: string[]} = {};
    const importsDeduplication = new Map<string, boolean>();
    generatedExtend.forEach((e) => {
        const lib = e.lib ?? 'modernExtend';
        if (!(lib in imports)) imports[lib] = [];

        const importName = e.source.split('(')[0]
        if (!importsDeduplication.has(importName)) {
            importsDeduplication.set(importName, true);

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
    zigbeeModel: ['${zigbeeModel}'],
    model: '${definition.model}',
    vendor: '${definition.vendor}',
    description: 'Automatically generated definition',
    extend: [${generatedExtend.map(genSource).join(', ')}],
    meta: ${JSON.stringify(definition.meta || {})},
};

module.exports = definition;`;
}

export async function generateDefinition(device: Zh.Device): Promise<{externalDefinitionSource: string, definition: Definition}> {
    const generatedExtend: GeneratedExtend[] = [];

    for (const endpoint of device.endpoints) {
        const usedExtenders: Extender[] = [];
        const addExtenders = async (cluster: Cluster, extenders: Extender[]) => {
            const extender = extenders.find((e) => e[0].includes(cluster.name));
            if (extender && !usedExtenders.includes(extender)) {
                usedExtenders.push(extender);
                generatedExtend.push(...(await extender[1](endpoint)));
            }
        };

        for (const cluster of endpoint.getInputClusters()) {
            await addExtenders(cluster, inputExtenders);
        }

        for (const cluster of endpoint.getOutputClusters()) {
            await addExtenders(cluster, outputExtenders);
        }
    }

    const definition: Definition = {
        zigbeeModel: [device.modelID],
        model: device.modelID ?? '',
        vendor: device.manufacturerName ?? '',
        description: 'Automatically generated definition',
        extend: generatedExtend.map((e) => e.extend || e.extendFn(e.args)),
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

    if (device.endpoints.length > 1) {
        definition.meta = {multiEndpoint: true};
    }

    const externalDefinitionSource = generateSource(definition.zigbeeModel[0], definition, generatedExtend);
    return {externalDefinitionSource, definition};
}

const inputExtenders: Extender[] = [
    [['msTemperatureMeasurement'], async (endpoint) => [{extendFn: m.temperature, args: {endpointID: endpoint.ID}, source: 'temperature'}]],
    [['msPressureMeasurement'], async (endpoint) => [{extendFn: m.pressure, args: {endpointID: endpoint.ID}, source: 'pressure'}]],
    [['msRelativeHumidity'], async (endpoint) => [{extendFn: m.humidity, args: {endpointID: endpoint.ID}, source: 'humidity'}]],
    [['msCO2'], async (endpoint) => [{extendFn: m.co2, args: {endpointID: endpoint.ID}, source: 'co2'}]],
    [['genPowerCfg'], async (endpoint) => [{extendFn: m.batteryPercentage, source: 'batteryPercentage'}]],
    [['genOnOff', 'lightingColorCtrl'], extenderOnOffLight],
    [['seMetering', 'haElectricalMeasurement'], extenderElectricityMeter],
    [['closuresDoorLock'], extenderLock],
];

const outputExtenders: Extender[] = [
    [['genIdentify'], async (endpoint) => [{extend: m.identify(), source: 'identify()'}]],
];

async function extenderLock(endpoint: Zh.Endpoint): Promise<GeneratedExtend[]> {
    const pinCodeCount = await getClusterAttributeValue<number>(endpoint, 'closuresDoorLock', 'numOfPinUsersSupported', 50);
    return [{extend: m.lock({pinCodeCount}), source: `lock({pinCodeCount: ${pinCodeCount}})`}];
}

async function extenderOnOffLight(endpoint: Zh.Endpoint): Promise<GeneratedExtend[]> {
    if (endpoint.supportsInputCluster('lightingColorCtrl')) {
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
            return [{extendFn: philipsLight, args, source: `philipsLight`, lib: 'philips'}];
        } else {
            return [{extendFn: m.light, args, source: `light`}];
        }
    } else {
        return [{extendFn: m.onOff, args: {powerOnBehavior: false}, source: 'onOff'}];
    }
}

async function extenderElectricityMeter(endpoint: Zh.Endpoint): Promise<GeneratedExtend[]> {
    const metering = endpoint.supportsInputCluster('seMetering');
    const electricalMeasurements = endpoint.supportsInputCluster('haElectricalMeasurement');
    const args: m.ElectricityMeterArgs = {};
    if (!metering || !electricalMeasurements) {
        args.cluster = metering ? 'metering' : 'electrical';
    }
    return [{extendFn: m.electricityMeter, args, source: `electricityMeter`}];
}
