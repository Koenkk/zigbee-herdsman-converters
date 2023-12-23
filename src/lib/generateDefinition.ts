import {Cluster} from 'zigbee-herdsman/dist/zcl/tstype';
import {Definition, ModernExtend, Zh} from './types';
import {getClusterAttributeValue} from './utils';
import {temperature, pressure, humidity, identify, onOff, light, LightArgs, electricityMeter, ElectricityMeterArgs} from './modernExtend';
import * as zh from 'zigbee-herdsman/dist';
import {philipsLight} from './philips';

interface GeneratedExtend {extend: ModernExtend, source: string, lib?: string}
type ExtendGenerator = (endpoint: Zh.Endpoint) => Promise<GeneratedExtend[]>;
type Extender = [string[], ExtendGenerator];

function generateSource(device: Zh.Device, generatedExtend: GeneratedExtend[]): string {
    const imports: {[s: string]: string[]} = {};
    generatedExtend.forEach((e) => {
        const lib = e.lib ?? 'modernExtend';
        if (!(lib in imports)) imports[lib] = [];
        imports[lib].push(e.source.split('(')[0]);
    });

    const importsStr = Object.entries(imports)
        .map((e) => `const {${e[1].join(', ')}} = require('zigbee-herdsman-converters/lib/${e[0]}');`).join('\n');

    return `${importsStr}

const definition = {
    zigbeeModel: ['${device.modelID}'],
    model: '${device.modelID}',
    vendor: '${device.manufacturerName}',
    description: 'Generated from device information',
    extend: [${generatedExtend.map((e) => e.source).join(', ')}],
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
        description: 'Generated from device information',
        extend: generatedExtend.map((e) => e.extend),
        generated: true,
    };

    const externalDefinitionSource = generateSource(device, generatedExtend);
    return {externalDefinitionSource, definition};
}

const inputExtenders: Extender[] = [
    [['msTemperatureMeasurement'], async (endpoint) => [{extend: temperature(), source: 'temperature()'}]],
    [['msPressureMeasurement'], async (endpoint) => [{extend: pressure(), source: 'pressure()'}]],
    [['msRelativeHumidity'], async (endpoint) => [{extend: humidity(), source: 'humidity()'}]],
    [['genOnOff', 'lightingColorCtrl'], extenderOnOffLight],
    [['seMetering', 'haElectricalMeasurement'], extenderElectricityMeter],
];

const outputExtenders: Extender[] = [
    [['genIdentify'], async (endpoint) => [{extend: identify(), source: 'identify()'}]],
];

async function extenderOnOffLight(endpoint: Zh.Endpoint): Promise<GeneratedExtend[]> {
    if (endpoint.supportsInputCluster('lightingColorCtrl')) {
        const colorCapabilities = await getClusterAttributeValue<number>(endpoint, 'lightingColorCtrl', 'colorCapabilities');
        const supportsHueSaturation = (colorCapabilities & 1<<0) > 0;
        const supportsEnhancedHueSaturation = (colorCapabilities & 1<<1) > 0;
        const supportsColorXY = (colorCapabilities & 1<<3) > 0;
        const supportsColorTemperature = (colorCapabilities & 1<<4) > 0;
        const args: LightArgs = {};

        if (supportsColorTemperature) {
            const minColorTemp = await getClusterAttributeValue<number>(endpoint, 'lightingColorCtrl', 'colorTempPhysicalMin');
            const maxColorTemp = await getClusterAttributeValue<number>(endpoint, 'lightingColorCtrl', 'colorTempPhysicalMax');
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

        const argsStr = JSON.stringify(args).replaceAll(`"`, ``);
        if (endpoint.getDevice().manufacturerID === zh.Zcl.ManufacturerCode.Philips) {
            return [{extend: philipsLight(args), source: `philipsLight(${argsStr})`, lib: 'philips'}];
        } else {
            return [{extend: light(args), source: `light(${argsStr})`}];
        }
    } else {
        return [{extend: onOff({powerOnBehavior: false}), source: 'onOff({powerOnBehavior: false})'}];
    }
}

async function extenderElectricityMeter(endpoint: Zh.Endpoint): Promise<GeneratedExtend[]> {
    const metering = endpoint.supportsInputCluster('seMetering');
    const electricalMeasurements = endpoint.supportsInputCluster('haElectricalMeasurement');
    const args: ElectricityMeterArgs = {};
    if (!metering || !electricalMeasurements) {
        args.cluster = metering ? 'metering' : 'electrical';
    }
    const argsStr = Object.keys(args).length ? JSON.stringify(args).replaceAll(`"`, ``) : '';
    return [{extend: electricityMeter(args), source: `electricityMeter(${argsStr})`}];
}

