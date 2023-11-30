import {findByDevice} from '../src/index';
import * as utils from '../src/lib/utils';
import {Zh, Logger} from '../src/lib/types';
import * as reporting from '../src/lib/reporting';
import { repInterval } from '../src/lib/constants';
import tz from '../src/converters/toZigbee'
import fz from '../src/converters/fromZigbee'

export function reportingItem(attribute: string, min: number, max: number, change: number | [number, number]) {
    return {attribute: attribute, minimumReportInterval: min, maximumReportInterval: max, reportableChange: change};
}

function mockDevice(args: {modelID: string, endpoints: {inputClusters: string[]}[]}): Zh.Device {
    const ieeeAddr = '0x12345678';
    return {
        // @ts-expect-error
        constructor: {name: 'Device'},
        ieeeAddr,
        ...args,
        endpoints: args.endpoints.map((endpoint) => mockEndpoint(endpoint))
    };
}

function mockEndpoint(args?: {inputClusters: string[]}): Zh.Endpoint {
    return {
        // @ts-expect-error
        constructor: {name: 'Endpoint'},
        bind: jest.fn(),
        configureReporting: jest.fn(),
        read: jest.fn(),
        getInputClusters: jest.fn().mockReturnValue(args?.inputClusters?.map((name) => ({name}))),
        saveClusterAttributeKeyValue: jest.fn(),
        save: jest.fn(),
        getClusterAttributeValue: jest.fn(),
    };
}

const MockLogger: Logger = {info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn()};

const DefaultTz = [
    tz.scene_store, tz.scene_recall, tz.scene_add, tz.scene_remove, tz.scene_remove_all, 
    tz.scene_rename, tz.read, tz.write, tz.command, tz.factory_reset
];

describe('ModernExtend', () => {
    test('onlythis Innr SP120', async () => {
        const device = mockDevice({modelID: 'SP 120', endpoints: [{inputClusters: ['genOnOff', 'haElectricalMeasurement', 'seMetering']}]});
        const endpoint = device.endpoints[0];
        const coordinatorEndpoint = mockEndpoint();
        const definition = findByDevice(device);

        const attributes = {}
        // @ts-expect-error
        endpoint.saveClusterAttributeKeyValue.mockImplementation((cluster, values) => attributes[cluster] = {...attributes[cluster], ...values});
        // @ts-expect-error
        endpoint.getClusterAttributeValue.mockImplementation((cluster, attribute) => attributes[cluster][attribute]);
        
        await definition.configure?.(device, coordinatorEndpoint, MockLogger);

        expect(definition.fromZigbee).toEqual([fz.on_off, fz.electrical_measurement, fz.metering]);
        expect(definition.toZigbee).toEqual([tz.on_off, tz.electrical_measurement_power, tz.acvoltage, tz.accurrent, tz.currentsummdelivered, ...DefaultTz]);
        utils.assertArray(definition.exposes);
        expect(definition.exposes?.map((e) => e.name ?? e.type).sort()).toEqual(['power', 'current', 'voltage', 'switch', 'energy', 'linkquality'].sort());
        expect(endpoint.bind).toHaveBeenCalledTimes(3);
        expect(endpoint.bind).toHaveBeenCalledWith('genOnOff', coordinatorEndpoint);
        expect(endpoint.bind).toHaveBeenCalledWith('seMetering', coordinatorEndpoint);
        expect(endpoint.bind).toHaveBeenCalledWith('haElectricalMeasurement', coordinatorEndpoint);
        expect(endpoint.read).toHaveBeenCalledTimes(3);
        expect(endpoint.read).toHaveBeenCalledWith('genOnOff', ['onOff']);
        expect(endpoint.read).toHaveBeenCalledWith('seMetering', ['currentSummDelivered']);
        expect(endpoint.read).toHaveBeenCalledWith('haElectricalMeasurement', ['activePower', 'rmsCurrent', 'rmsVoltage']);
        expect(endpoint.configureReporting).toHaveBeenCalledTimes(3);
        expect(endpoint.configureReporting).toHaveBeenCalledWith('genOnOff', reporting.payload('onOff', 0, repInterval.MAX, 1));
        expect(endpoint.configureReporting).toHaveBeenCalledWith('seMetering', [reportingItem('currentSummDelivered', 10, 65000, [0, 10])]);
        expect(endpoint.configureReporting).toHaveBeenCalledWith('haElectricalMeasurement', [
            reportingItem('activePower', 10, 65000, 5), reportingItem('rmsCurrent', 10, 65000, 50), reportingItem('rmsVoltage', 10, 65000, 5),
        ]);
    });
});