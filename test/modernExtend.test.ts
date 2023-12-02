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
        supportsInputCluster: jest.fn().mockImplementation((cluster) => args?.inputClusters.includes(cluster)),
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
    test('light({turnsOffAtBrightness1: true})', async () => {
        const device = mockDevice({modelID: 'FWG125Bulb50AU', endpoints: [{inputClusters: ['genOnOff', 'genLevelCtrl']}]});
        const endpoint = device.endpoints[0];
        const coordinatorEndpoint = mockEndpoint();
        const definition = findByDevice(device);

        await definition.configure?.(device, coordinatorEndpoint, MockLogger);
        
        expect(definition.meta).toEqual({turnsOffAtBrightness1: true});
        expect(definition.fromZigbee).toEqual([fz.on_off, fz.brightness, fz.ignore_basic_report, fz.level_config, fz.power_on_behavior]);
        expect(definition.toZigbee).toEqual([
            tz.light_onoff_brightness, tz.ignore_transition, tz.level_config, tz.ignore_rate, tz.light_brightness_move, tz.light_brightness_step,
            tz.effect, tz.power_on_behavior, ...DefaultTz
        ]);
        utils.assertArray(definition.exposes);
        expect(definition.exposes?.map((e) => e.name ?? `${e.type}(${e.features?.map((f) => f.name).join(',')})`).sort()).toEqual([
            'effect', 'light(state,brightness)', 'linkquality', 'power_on_behavior'
        ].sort());
        expect(endpoint.bind).toHaveBeenCalledTimes(0);
        expect(endpoint.read).toHaveBeenCalledTimes(0);
        expect(endpoint.configureReporting).toHaveBeenCalledTimes(0);
    });

    test('light({colorTemp: {range: undefined}})', async () => {
        const device = mockDevice({modelID: 'TWGU10Bulb50AU', endpoints: [{inputClusters: ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl']}]});
        const endpoint = device.endpoints[0];
        const coordinatorEndpoint = mockEndpoint();
        const definition = findByDevice(device);

        await definition.configure?.(device, coordinatorEndpoint, MockLogger);
        
        expect(definition.meta).toEqual({});
        expect(definition.fromZigbee).toEqual([fz.on_off, fz.brightness, fz.ignore_basic_report, fz.level_config, fz.color_colortemp, fz.power_on_behavior]);
        expect(definition.toZigbee).toEqual([
            tz.light_onoff_brightness, tz.ignore_transition, tz.level_config, tz.ignore_rate, tz.light_brightness_move, tz.light_brightness_step, 
            tz.light_color_colortemp, tz.light_color_mode, tz.light_color_options, tz.light_colortemp_move, tz.light_colortemp_step,
            tz.light_colortemp_startup, tz.effect, tz.power_on_behavior, ...DefaultTz
        ]);
        utils.assertArray(definition.exposes);
        expect(definition.exposes?.map((e) => e.name ?? `${e.type}(${e.features?.map((f) => f.name).join(',')})`).sort()).toEqual([
            'effect', 'light(state,brightness,color_temp,color_temp_startup)', 'linkquality', 'power_on_behavior'
        ].sort());
        expect(endpoint.bind).toHaveBeenCalledTimes(0);
        expect(endpoint.read).toHaveBeenCalledTimes(2);
        expect(endpoint.read).toHaveBeenCalledWith('lightingColorCtrl', ['colorCapabilities']);
        expect(endpoint.read).toHaveBeenCalledWith('lightingColorCtrl', ['colorTempPhysicalMin', 'colorTempPhysicalMax']);
        expect(endpoint.configureReporting).toHaveBeenCalledTimes(0);
    });
});