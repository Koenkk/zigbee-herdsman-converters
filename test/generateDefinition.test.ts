import { Definition } from '../src/lib/types';
import fz from '../src/converters/fromZigbee'

import { repInterval } from '../src/lib/constants';
import {assertDefintion, assertDefinitionArgs, mockDevice, reportingItem} from './modernExtend.test';
import { findByDevice} from '../src';
import Device from 'zigbee-herdsman/dist/controller/model/device';

const assertGeneratedDefinition = async (args: assertDefinitionArgs) => {
    const getDefinition = (device: Device): Definition => {
        return findByDevice(device, true);
    }

    const definition = getDefinition(args.device)

    expect(definition.model).toEqual(args.device.modelID)

    return await assertDefintion({findByDeviceFn: getDefinition, ...args})
}

describe('GenerateDefinition', () => {
    test('empty', async () => {
        await assertGeneratedDefinition({
            device: mockDevice({modelID: 'empty', endpoints: [{inputClusters: [], outputClusters:[]}]}),
            meta: undefined,
            fromZigbee: [],
            toZigbee: [],
            exposes: ['linkquality'],
            bind: [],
            read: [],
            configureReporting: [],
        });
    });

    test('input(msTemperatureMeasurement),output(genIdentify)', async () => {
        await assertGeneratedDefinition({
            device: mockDevice({modelID: 'temp', endpoints: [{inputClusters: ['msTemperatureMeasurement'], outputClusters:['genIdentify']}]}),
            meta: undefined,
            fromZigbee: [fz.temperature],
            toZigbee: ['identify'],
            exposes: ['linkquality', 'temperature'],
            bind: {1: ['msTemperatureMeasurement']},
            read: {1: [['msTemperatureMeasurement', ['measuredValue']]]},
            configureReporting: {
                1: [
                    ['msTemperatureMeasurement', [reportingItem('measuredValue', 0, repInterval.MAX, 1)]],
                ],
            },
        });
    });

    test('input(msPressureMeasurement)', async () => {
        await assertGeneratedDefinition({
            device: mockDevice({modelID: 'pressure', endpoints: [{inputClusters: ['msPressureMeasurement'], outputClusters:[]}]}),
            meta: undefined,
            fromZigbee: [fz.pressure],
            toZigbee: [],
            exposes: ['linkquality', 'pressure'],
            bind: {1: ['msPressureMeasurement']},
            read: {1: [['msPressureMeasurement', ['measuredValue']]]},
            configureReporting: {
                1: [
                    ['msPressureMeasurement', [reportingItem('measuredValue', 0, repInterval.MAX, 1)]],
                ],
            },
        });
    });

    test('input(msRelativeHumidity)', async () => {
        await assertGeneratedDefinition({
            device: mockDevice({modelID: 'humidity', endpoints: [{inputClusters: ['msRelativeHumidity'], outputClusters:[]}]}),
            meta: undefined,
            fromZigbee: [fz.humidity],
            toZigbee: [],
            exposes: ['humidity', 'linkquality'],
            bind: {1: ['msRelativeHumidity']},
            read: {1: [['msRelativeHumidity', ['measuredValue']]]},
            configureReporting: {
                1: [
                    ['msRelativeHumidity', [reportingItem('measuredValue', 0, repInterval.MAX, 1)]],
                ],
            },
        });
    });

    test('input(msTemperatureMeasurement, genOnOff)', async () => {
        await assertGeneratedDefinition({
            device: mockDevice({modelID: 'combo', endpoints: [{inputClusters: ['msTemperatureMeasurement', 'genOnOff'], outputClusters:[]}]}),
            meta: undefined,
            fromZigbee: [fz.temperature, fz.on_off],
            toZigbee: ['state', 'on_time', 'off_wait_time'],
            exposes: ['linkquality', 'switch(state)', 'temperature'],
            bind: {1: ['msTemperatureMeasurement', 'genOnOff']},
            read: {1: [
                ['msTemperatureMeasurement', ['measuredValue']],
                ['genOnOff', ['onOff']],
            ]},
            configureReporting: {
                1: [
                    ['msTemperatureMeasurement', [reportingItem('measuredValue', 0, repInterval.MAX, 1)]],
                    ['genOnOff', [reportingItem('onOff', 0, repInterval.MAX, 1)]],
                ],
            },
        });
    });
});