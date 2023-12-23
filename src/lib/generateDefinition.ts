import {Cluster} from 'zigbee-herdsman/dist/zcl/tstype';
import {Definition, ModernExtend, Zh} from './types';
import {temperature, pressure, humidity, identify, onOff} from './modernExtend';

interface GeneratedExtend {extend: ModernExtend, source: string}
type ExtendGenerator = (endpoint: Zh.Endpoint) => GeneratedExtend[];
interface ExtendGeneratorLookup {[s: string]: ExtendGenerator}

function generateSource(device: Zh.Device, generatedExtend: GeneratedExtend[]): string {
    const imports = generatedExtend.map((e) => e.source.split('(')[0]);
    return `const {${imports.join(', ')}} = require('zigbee-herdsman-converters/lib/modernExtend');

const definition = {
    zigbeeModel: ['${device.modelID}'],
    model: '${device.modelID}',
    vendor: '${device.manufacturerName}',
    description: 'Generated from device information',
    extend: [${generatedExtend.map((e) => e.source).join(', ')}],
};

module.exports = definition;`;
}

export function generateDefinition(device: Zh.Device): {externalDefinitionSource: string, definition: Definition} {
    const generatedExtend: GeneratedExtend[] = [];

    device.endpoints.forEach((endpoint) => {
        const addExtenders = (cluster: Cluster, knownExtenders: ExtendGeneratorLookup) => {
            const clusterName = cluster.name || cluster.ID.toString();
            if (!knownExtenders.hasOwnProperty(clusterName)) {
                return;
            }
            generatedExtend.push(...knownExtenders[clusterName](endpoint));
        };

        endpoint.getInputClusters().forEach((cluster) => addExtenders(cluster, inputExtenders));
        endpoint.getOutputClusters().forEach((cluster) => addExtenders(cluster, outputExtenders));
    });

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

const inputExtenders: ExtendGeneratorLookup = {
    msTemperatureMeasurement: (endpoint) => [{extend: temperature(), source: 'temperature()'}],
    msPressureMeasurement: (endpoint) => [{extend: pressure(), source: 'pressure()'}],
    msRelativeHumidity: (endpoint) => [{extend: humidity(), source: 'humidity()'}],
    genOnOff: (endpoint) => [{extend: onOff({powerOnBehavior: false}), source: 'onOff({powerOnBehavior: false})'}],
};

const outputExtenders: ExtendGeneratorLookup = {
    genIdentify: (endpoint) => [{extend: identify(), source: 'identify()'}],
};
