import {findByDevice} from '../src/index';
import * as utils from '../src/lib/utils';
import {Zh, Logger} from '../src/lib/types';
import * as reporting from '../src/lib/reporting';
import { repInterval } from '../src/lib/constants';
import tz from '../src/converters/toZigbee'
import fz from '../src/converters/fromZigbee'

function mockDevice(args: {modelID: string, type?: 'Router', endpoints: {clusters: string[]}[]}): Zh.Device {
    return {
        type: 'Router',
        ...args,
         // @ts-expect-error
        endpoints: args.endpoints.map((endpoint) => {
            return {
                bind: jest.fn(),
                configureReporting: jest.fn(),
                read: jest.fn(),
                getInputClusters: () => endpoint.clusters.map((name) => {
                    return {name};
                })
            };
        }),
    };
}

function mockEndpoint(): Zh.Endpoint {
    // @ts-expect-error
    return new Object();
}

const MockLogger: Logger = {info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn()};

const DefaultTz = [
    tz.scene_store, tz.scene_recall, tz.scene_add, tz.scene_remove, tz.scene_remove_all, 
    tz.scene_rename, tz.read, tz.write, tz.command, tz.factory_reset
];

describe('ModernExtend', () => {
    it('onlythis Innr SP120', () => {
        const device = mockDevice({modelID: 'SP 120', endpoints: [{clusters: ['genOnOff']}, {clusters: ['genOnOff']}]});
        const coordinatorEndpoint = mockEndpoint();
        const definition = findByDevice(device);
        
        definition.configure?.(device, coordinatorEndpoint, MockLogger);

        // expect(definition.fromZigbee).toEqual([fz.electrical_measurement, fz.on_off, fz.ignore_genLevelCtrl_report, fz.metering]);
        expect(definition.fromZigbee).toEqual([fz.on_off, fz.power_on_behavior]);
        expect(definition.toZigbee).toEqual([tz.on_off, tz.power_on_behavior, ...DefaultTz]);
        utils.assertArray(definition.exposes);
        // expect(definition.exposes?.map((e) => e.name ?? e.type)).toEqual(['power', 'current', 'voltage', 'switch', 'energy', 'linkquality']);
        expect(definition.exposes?.map((e) => e.name ?? e.type)).toEqual(['switch', 'power_on_behavior', 'linkquality']);

        for (const endpoint of device.endpoints) {
            expect(endpoint.bind).toHaveBeenCalledTimes(1);
            expect(endpoint.bind).toHaveBeenCalledWith('genOnOff', coordinatorEndpoint);
            expect(endpoint.configureReporting).toHaveBeenCalledTimes(1);
            expect(endpoint.configureReporting).toHaveBeenCalledWith('genOnOff', reporting.payload('onOff', 0, repInterval.DAYS_1, 1));
            expect(endpoint.read).toHaveBeenCalledTimes(1);
            expect(endpoint.read).toHaveBeenCalledWith('genOnOff', ['onOff']);
        }
    });
});