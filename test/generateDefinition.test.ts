import { Definition } from '../src/lib/types';
import fz from '../src/converters/fromZigbee'

import { repInterval } from '../src/lib/constants';
import {assertDefintion, AssertDefinitionArgs, mockDevice, reportingItem} from './utils';
import { findByDevice} from '../src';
import Device from 'zigbee-herdsman/dist/controller/model/device';

const assertGeneratedDefinition = async (args: AssertDefinitionArgs) => {
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
            fromZigbee: [expect.objectContaining({cluster: 'msTemperatureMeasurement'})],
            toZigbee: ['temperature', 'identify'],
            exposes: ['linkquality', 'temperature'],
            bind: {1: ['msTemperatureMeasurement']},
            read: {1: [['msTemperatureMeasurement', ['measuredValue']]]},
            configureReporting: {
                1: [
                    ['msTemperatureMeasurement', [reportingItem('measuredValue', 10, repInterval.HOUR, 100)]],
                ],
            },
        });
    });

    test('input(msPressureMeasurement)', async () => {
        await assertGeneratedDefinition({
            device: mockDevice({modelID: 'pressure', endpoints: [{inputClusters: ['msPressureMeasurement'], outputClusters:[]}]}),
            meta: undefined,
            fromZigbee: [expect.objectContaining({cluster: 'msPressureMeasurement'})],
            toZigbee: ['pressure'],
            exposes: ['linkquality', 'pressure'],
            bind: {1: ['msPressureMeasurement']},
            read: {1: [['msPressureMeasurement', ['measuredValue']]]},
            configureReporting: {
                1: [
                    ['msPressureMeasurement', [reportingItem('measuredValue', 10, repInterval.HOUR, 100)]],
                ],
            },
        });
    });

    test('input(msRelativeHumidity)', async () => {
        await assertGeneratedDefinition({
            device: mockDevice({modelID: 'humidity', endpoints: [{inputClusters: ['msRelativeHumidity'], outputClusters:[]}]}),
            meta: undefined,
            fromZigbee: [expect.objectContaining({cluster: 'msRelativeHumidity'})],
            toZigbee: ['humidity'],
            exposes: ['humidity', 'linkquality'],
            bind: {1: ['msRelativeHumidity']},
            read: {1: [['msRelativeHumidity', ['measuredValue']]]},
            configureReporting: {
                1: [
                    ['msRelativeHumidity', [reportingItem('measuredValue', 10, repInterval.HOUR, 100)]],
                ],
            },
        });
    });

    test('input(msTemperatureMeasurement, genOnOff)', async () => {
        await assertGeneratedDefinition({
            device: mockDevice({modelID: 'combo', endpoints: [{inputClusters: ['msTemperatureMeasurement', 'genOnOff'], outputClusters:[]}]}),
            meta: undefined,
            fromZigbee: [expect.objectContaining({cluster: 'msTemperatureMeasurement'}), fz.on_off],
            toZigbee: ['temperature', 'state', 'on_time', 'off_wait_time'],
            exposes: ['linkquality', 'switch(state)', 'temperature'],
            bind: {1: ['msTemperatureMeasurement', 'genOnOff']},
            read: {1: [
                ['msTemperatureMeasurement', ['measuredValue']],
                ['genOnOff', ['onOff']],
            ]},
            configureReporting: {
                1: [
                    ['msTemperatureMeasurement', [reportingItem('measuredValue', 10, repInterval.HOUR, 100)]],
                    ['genOnOff', [reportingItem('onOff', 0, repInterval.MAX, 1)]],
                ],
            },
        });
    });
});