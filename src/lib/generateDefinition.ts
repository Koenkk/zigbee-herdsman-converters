import {Cluster} from 'zigbee-herdsman/dist/zcl/tstype';
import {Definition, ModernExtend, Zh} from './types';
import * as e from './modernExtend';

export function generateDefinition(device: Zh.Device): Definition {
    const deviceExtenders: ModernExtend[] = [];

    device.endpoints.forEach((endpoint) => {
        const addExtenders = (cluster: Cluster, knownExtenders: extendersObject) => {
            const clusterName = cluster.name || cluster.ID.toString();
            deviceExtenders.push(...(knownExtenders[clusterName] ?? []));
        };

        endpoint.getInputClusters().forEach((cluster) => {
            addExtenders(cluster, inputExtenders);
        });
        endpoint.getOutputClusters().forEach((cluster) => {
            addExtenders(cluster, outputExtenders);
        });
    });
    // Do not provide definition if we didn't generate anything
    if (!deviceExtenders) {
        return null;
    }

    const definition: Partial<Definition> = {
        extend: deviceExtenders,
    };

    return definition as Definition;
}

type extendersObject = {[name: string]: ModernExtend[]}

const inputExtenders: extendersObject = {
    'msTemperatureMeasurement': [e.temperature()],
    'msPressureMeasurement': [e.pressure()],
    'msRelativeHumidity': [e.humidity()],
};

const outputExtenders: extendersObject = {
    'genIdentify': [e.identify()],
};
