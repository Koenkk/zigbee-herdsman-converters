import {Cluster} from 'zigbee-herdsman/dist/zcl/tstype';
import {Definition, ModernExtend, Zh} from './types';
import * as e from './modernExtend';
import {Endpoint} from 'zigbee-herdsman/dist/controller/model';

export function generateDefinition(device: Zh.Device): Definition {
    const deviceExtenders: ModernExtend[] = [];

    device.endpoints.forEach((endpoint) => {
        const addExtenders = (cluster: Cluster, knownExtenders: extendersObject) => {
            const clusterName = cluster.name || cluster.ID.toString();
            if (!knownExtenders.hasOwnProperty(clusterName)) {
                return;
            }

            const extenderProviders = knownExtenders[clusterName];
            const extenders = extenderProviders.map((extender: extenderProvider): ModernExtend => {
                if (typeof extender !== 'function') {
                    return extender;
                }
                return extender(endpoint, cluster);
            });

            deviceExtenders.push(...(extenders));
        };

        endpoint.getInputClusters().forEach((cluster) => {
            addExtenders(cluster, inputExtenders);
        });
        endpoint.getOutputClusters().forEach((cluster) => {
            addExtenders(cluster, outputExtenders);
        });
    });

    const definition: Definition = {
        zigbeeModel: [device.modelID],
        model: device.modelID ?? '',
        vendor: device.manufacturerName ?? '',
        description: 'Generated from device information',
        extend: deviceExtenders,
        generated: true,
    };

    return definition;
}

// This configurator type provides some flexibility in terms of how ModernExtend configuration can be obtained.
// I.e. if cluster has optional attributes - this type can be used
// to define function that will generate more feature-full extension.
type extenderConfigurator = (endpoint: Endpoint, cluster: Cluster) => ModernExtend
// extenderProvider defines a type that will produce a `ModernExtend`
// either directly, or by calling a function.
type extenderProvider = ModernExtend | extenderConfigurator
type extendersObject = {[name: string]: extenderProvider[]}

const inputExtenders: extendersObject = {
    'msTemperatureMeasurement': [e.temperature()],
    'msPressureMeasurement': [e.pressure()],
    'msRelativeHumidity': [e.humidity()],
    'genOnOff': [e.onOff({powerOnBehavior: false})],
};

const outputExtenders: extendersObject = {
    'genIdentify': [e.identify()],
};
