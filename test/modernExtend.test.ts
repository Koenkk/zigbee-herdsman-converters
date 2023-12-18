import {findByDevice} from '../src/index';
import * as utils from '../src/lib/utils';
import {Zh, Logger, DefinitionMeta, Fz} from '../src/lib/types';
import { repInterval } from '../src/lib/constants';
import {philipsFz} from '../src/lib/philips';
import tz from '../src/converters/toZigbee'
import fz from '../src/converters/fromZigbee'

export function reportingItem(attribute: string, min: number, max: number, change: number | [number, number]) {
    return {attribute: attribute, minimumReportInterval: min, maximumReportInterval: max, reportableChange: change};
}

function mockDevice(args: {modelID: string, endpoints: {ID?: number, inputClusters?: string[]}[]}): Zh.Device {
    const ieeeAddr = '0x12345678';
    const endpoints = args.endpoints.map((endpoint) => mockEndpoint(endpoint));
    return {
        // @ts-expect-error
        constructor: {name: 'Device'},
        ieeeAddr,
        ...args,
        getEndpoint: (ID: number) => {
            const endpoint = endpoints.find((e) => e.ID === ID);
            if (!endpoint) throw new Error(`No endpoint ${ID}`);
            return endpoint;
        },
        endpoints,
    };
}

function mockEndpoint(args?: {ID?: number, inputClusters?: string[]}): Zh.Endpoint {
    return {
        ID: args?.ID ?? 1,
        // @ts-expect-error
        constructor: {name: 'Endpoint'},
        bind: jest.fn(),
        configureReporting: jest.fn(),
        read: jest.fn(),
        getInputClusters: jest.fn().mockReturnValue(args?.inputClusters?.map((name) => ({name}))),
        supportsInputCluster: jest.fn().mockImplementation((cluster) => args?.inputClusters?.includes(cluster)),
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

async function assertDefintion(args: {
    device: Zh.Device,
    meta: DefinitionMeta | undefined,
    fromZigbee: Fz.Converter[],
    toZigbee: string[],
    exposes: string[],
    bind: {[s: number]: string[]},
    read: {[s: number]: [string, string[]][]},
    configureReporting: {[s: number]: [string, ReturnType<typeof reportingItem>[]][]},
    endpoints?: {[s: string]: number},
}) {
    const coordinatorEndpoint = mockEndpoint();
    const definition = findByDevice(args.device);

    for (const endpoint of args.device.endpoints) {
        const attributes = {}
        // @ts-expect-error
        endpoint.saveClusterAttributeKeyValue.mockImplementation((cluster, values) => attributes[cluster] = {...attributes[cluster], ...values});
        // @ts-expect-error
        endpoint.getClusterAttributeValue.mockImplementation((cluster, attribute) => attributes[cluster][attribute]);
    }

    await definition.configure?.(args.device, coordinatorEndpoint, MockLogger);

    const logIfNotEqual = (expected: string[], actual: string[]) => {
        if (JSON.stringify(expected) !== JSON.stringify(actual)) {
            console.log(`[${expected?.map((c) => `'${c}'`).join(', ')}]`);
        }
    }

    expect(definition.meta).toEqual(args.meta);
    expect(definition.fromZigbee).toEqual(args.fromZigbee);

    const expectedToZigbee = definition.toZigbee?.slice(0, definition.toZigbee.length - DefaultTz.length).flatMap((c) => c.key);
    utils.assertArray(expectedToZigbee);
    logIfNotEqual(expectedToZigbee, args.toZigbee);
    expect(expectedToZigbee).toEqual(args.toZigbee);

    utils.assertArray(definition.exposes);
    const expectedExposes = definition.exposes?.map((e) => e.name ?? `${e.type}${e.endpoint ? '_' + e.endpoint : ''}(${e.features?.map((f) => f.name).join(',')})`).sort();
    logIfNotEqual(expectedExposes, args.exposes);
    expect(expectedExposes).toEqual(args.exposes);

    for (const endpoint of args.device.endpoints) {
        expect(endpoint.bind).toHaveBeenCalledTimes(args.bind[endpoint.ID]?.length ?? 0);
        if (args.bind[endpoint.ID]) {
            args.bind[endpoint.ID].forEach((bind, idx) => expect(endpoint.bind).toHaveBeenNthCalledWith(idx + 1, bind, coordinatorEndpoint));
        }
    
        expect(endpoint.read).toHaveBeenCalledTimes(args.read[endpoint.ID]?.length ?? 0);
        if (args.read[endpoint.ID]) {
            args.read[endpoint.ID].forEach((read, idx) => expect(endpoint.read).toHaveBeenNthCalledWith(idx + 1, read[0], read[1]));
        }
    
        expect(endpoint.configureReporting).toHaveBeenCalledTimes(args.configureReporting[endpoint.ID]?.length ?? 0);
        if (args.configureReporting[endpoint.ID]) {
            args.configureReporting[endpoint.ID].forEach((configureReporting, idx) => expect(endpoint.configureReporting).toHaveBeenNthCalledWith(idx + 1, configureReporting[0], configureReporting[1]));
        }
    }

    if (definition.endpoint) {
        // @ts-expect-error
        expect(definition.endpoint()).toStrictEqual(args.endpoints)
    }
}

describe('ModernExtend', () => {
    test('light({turnsOffAtBrightness1: true})', async () => {
        await assertDefintion({
            device: mockDevice({modelID: 'FWG125Bulb50AU', endpoints: [{inputClusters: ['genOnOff', 'genLevelCtrl']}]}),
            meta: {turnsOffAtBrightness1: true},
            fromZigbee: [fz.on_off, fz.brightness, fz.ignore_basic_report, fz.level_config, fz.power_on_behavior],
            toZigbee: [
                'state', 'brightness', 'brightness_percent', 'on_time', 'transition', 'level_config', 'rate', 'brightness_move', 'brightness_move_onoff',
                'brightness_step', 'brightness_step_onoff', 'effect', 'alert', 'flash', 'power_on_behavior'
            ],
            exposes: ['effect', 'light(state,brightness)', 'linkquality', 'power_on_behavior'],
            bind: [],
            read: [],
            configureReporting: [],
        });

    });

    test('light({colorTemp: {range: undefined}})', async () => {
        await assertDefintion({
            device: mockDevice({modelID: 'TWGU10Bulb50AU', endpoints: [{inputClusters: ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl']}]}),
            meta: {},
            fromZigbee: [fz.on_off, fz.brightness, fz.ignore_basic_report, fz.level_config, fz.color_colortemp, fz.power_on_behavior],
            toZigbee: [
                'state', 'brightness', 'brightness_percent', 'on_time', 'transition', 'level_config', 'rate', 'brightness_move', 'brightness_move_onoff',
                'brightness_step', 'brightness_step_onoff', 'color', 'color_temp', 'color_temp_percent', 'color_mode', 'color_options', 'colortemp_move',
                'color_temp_move', 'color_temp_step', 'color_temp_startup', 'effect', 'alert', 'flash', 'power_on_behavior'
            ],
            exposes: ['effect', 'light(state,brightness,color_temp,color_temp_startup)', 'linkquality', 'power_on_behavior'],
            bind: [],
            read: {1: [
                ['lightingColorCtrl', ['colorCapabilities']],
                ['lightingColorCtrl', ['colorTempPhysicalMin', 'colorTempPhysicalMax']],
            ]},
            configureReporting: [],
        });
    });

    test('light({color: {modes: ["xy", "hs"], applyRedFix: true}, colorTemp: {range: [153, 555], startup: false}, turnsOffAtBrightness1: true}', async () => {
        await assertDefintion({
            device: mockDevice({modelID: 'OPL 130 C', endpoints: [{inputClusters: ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl']}]}),
            meta: {applyRedFix: true, supportsHueAndSaturation: true, turnsOffAtBrightness1: true},
            fromZigbee: [fz.on_off, fz.brightness, fz.ignore_basic_report, fz.level_config, fz.color_colortemp, fz.power_on_behavior],
            toZigbee: [
                'state', 'brightness', 'brightness_percent', 'on_time', 'transition', 'level_config', 'rate', 'brightness_move', 'brightness_move_onoff',
                'brightness_step', 'brightness_step_onoff', 'color', 'color_temp', 'color_temp_percent', 'color_mode', 'color_options', 'colortemp_move',
                'color_temp_move', 'color_temp_step', 'hue_move', 'saturation_move', 'hue_step', 'saturation_step', 'effect', 'alert',
                'flash', 'power_on_behavior',
            ],
            exposes: ['effect', 'light(state,brightness,color_temp,color_xy,color_hs)', 'linkquality', 'power_on_behavior'],
            bind: [],
            read: {1: [
                ['lightingColorCtrl', ['colorCapabilities']],
                ['lightingColorCtrl', ['colorTempPhysicalMin', 'colorTempPhysicalMax']],
            ]},
            configureReporting: [],
        });
    });

    test('light({color: true})', async () => {
        await assertDefintion({
            device: mockDevice({modelID: 'ZBEK-1', endpoints: [{inputClusters: ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl']}]}),
            meta: {},
            fromZigbee: [fz.on_off, fz.brightness, fz.ignore_basic_report, fz.level_config, fz.color_colortemp, fz.power_on_behavior],
            toZigbee: [
                'state', 'brightness', 'brightness_percent', 'on_time', 'transition', 'level_config', 'rate', 'brightness_move', 'brightness_move_onoff',
                'brightness_step', 'brightness_step_onoff', 'color', 'color_temp', 'color_temp_percent', 'color_mode', 'color_options', 'colortemp_move',
                'color_temp_move', 'color_temp_step', 'color_temp_startup', 'hue_move', 'saturation_move', 'hue_step', 'saturation_step', 'effect', 'alert',
                'flash', 'power_on_behavior',
            ],
            exposes: ['effect', 'light(state,brightness,color_temp,color_temp_startup,color_xy)', 'linkquality', 'power_on_behavior'],
            bind: [],
            read: {1: [
                ['lightingColorCtrl', ['colorCapabilities']],
                ['lightingColorCtrl', ['colorTempPhysicalMin', 'colorTempPhysicalMax']],
            ]},
            configureReporting: [],
        });
    });

    test('onOff({powerOnBehavior: false}), electricalMeasurements({current: {divisor: 1000}, voltage: {divisor: 1}, power: {divisor: 1}, energy: {divisor: 100}})', async () => {
        await assertDefintion({
            device: mockDevice({modelID: 'SP 120', endpoints: [{inputClusters: ['genOnOff', 'haElectricalMeasurement', 'seMetering']}]}),
            meta: undefined,
            fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
            toZigbee: ['state', 'on_time', 'off_wait_time', 'power', 'voltage', 'current', 'energy'],
            exposes: ['current', 'energy', 'linkquality', 'power', 'switch(state)', 'voltage'],
            bind: {1: ['genOnOff', 'haElectricalMeasurement', 'seMetering']},
            read: {1: [
                ['genOnOff', ['onOff']],
                ['haElectricalMeasurement', ['activePower', 'rmsCurrent', 'rmsVoltage']],
                ['seMetering', ['currentSummDelivered']],
            ]},
            configureReporting: {1: [
                ['genOnOff', [reportingItem('onOff', 0, repInterval.MAX, 1)]],
                ['haElectricalMeasurement', [reportingItem('activePower', 10, 65000, 5), reportingItem('rmsCurrent', 10, 65000, 50), reportingItem('rmsVoltage', 10, 65000, 5)]],
                ['seMetering', [reportingItem('currentSummDelivered', 10, 65000, [0, 10])]],
            ]},
        });
    });

    test(`philipsLight({gradient: {extraEffects: ['sparkle', 'opal', 'glisten']}, colorTemp: {range: [153, 500]}})`, async () => {
        await assertDefintion({
            device: mockDevice({modelID: 'LCX012', endpoints: [{inputClusters: ['genOnOff', 'genLevelCtrl', 'lightingColorCtrl']}]}),
            meta: {supportsHueAndSaturation: true, turnsOffAtBrightness1: true},
            fromZigbee: [fz.on_off, fz.brightness, fz.ignore_basic_report, fz.level_config, fz.color_colortemp, fz.power_on_behavior, philipsFz.gradient],
            toZigbee: [
                'state', 'brightness', 'brightness_percent', 'on_time', 'transition', 'level_config', 'rate', 'brightness_move', 'brightness_move_onoff',
                'brightness_step', 'brightness_step_onoff', 'color', 'color_temp', 'color_temp_percent', 'color_mode', 'color_options', 'colortemp_move',
                'color_temp_move', 'color_temp_step', 'color_temp_startup', 'hue_move', 'saturation_move', 'hue_step', 'saturation_step', 'power_on_behavior',
                'hue_power_on_behavior', 'hue_power_on_brightness', 'hue_power_on_color_temperature', 'hue_power_on_color', 'effect', 'gradient_scene', 'gradient'
            ],
            exposes: ['effect', 'gradient', 'gradient_scene', 'light(state,brightness,color_temp,color_temp_startup,color_xy,color_hs)', 'linkquality', 'power_on_behavior'],
            bind: {1: ['manuSpecificPhilips2']},
            read: {1: [
                ['lightingColorCtrl', ['colorCapabilities']],
                ['lightingColorCtrl', ['colorTempPhysicalMin', 'colorTempPhysicalMax']],
            ]},
            configureReporting: [],
        });
    });

    test(`ledvanceLight({configureReporting: true, endpoints: {'l1': 10, 'l2': 11, 's1': 25}, ota: ota.zigbeeOTA})`, async () => {
        await assertDefintion({
            device: mockDevice({modelID: 'Zigbee 3.0 DALI CONV LI', endpoints: [
                {ID: 10, inputClusters: ['genOnOff', 'genLevelCtrl']},
                {ID: 11, inputClusters: ['genOnOff', 'genLevelCtrl']},
                {ID: 25, inputClusters: ['genOnOff', 'genLevelCtrl']},
                {ID: 242, inputClusters: []},
            ]}),
            meta: {multiEndpoint: true},
            fromZigbee: [fz.command_toggle, fz.command_move, fz.command_stop, fz.on_off, fz.brightness, fz.ignore_basic_report, fz.level_config],
            toZigbee: [
                'state', 'brightness', 'brightness_percent', 'on_time', 'transition', 'level_config', 'rate', 'brightness_move', 'brightness_move_onoff',
                'brightness_step', 'brightness_step_onoff', 'effect', 'alert', 'flash', 'set_transition', 'remember_state', 'osram_set_transition', 'osram_remember_state',
            ],
            exposes: ['action', 'effect', 'light_l1(state,brightness)', 'light_l2(state,brightness)', 'light_s1(state,brightness)', 'linkquality'],
            bind: {
                10: ['genOnOff', 'genLevelCtrl'],
                11: ['genOnOff', 'genLevelCtrl'],
                25: ['genOnOff', 'genLevelCtrl'],
            },
            read: {
                10: [['genOnOff', ['onOff']], ['genLevelCtrl', ['currentLevel']]],
                11: [['genOnOff', ['onOff']], ['genLevelCtrl', ['currentLevel']]],
                25: [['genOnOff', ['onOff']], ['genLevelCtrl', ['currentLevel']]],
            },
            configureReporting: {
                10: [
                    ['genOnOff', [reportingItem('onOff', 0, repInterval.MAX, 1)]],
                    ['genLevelCtrl', [reportingItem('currentLevel', 10, 65000, 1)]],
                ],
                11: [
                    ['genOnOff', [reportingItem('onOff', 0, repInterval.MAX, 1)]],
                    ['genLevelCtrl', [reportingItem('currentLevel', 10, 65000, 1)]],
                ],
                25: [
                    ['genOnOff', [reportingItem('onOff', 0, repInterval.MAX, 1)]],
                    ['genLevelCtrl', [reportingItem('currentLevel', 10, 65000, 1)]],
                ]
            },
            endpoints: {l1: 10, l2: 11, s1: 25},
        });
    });

    test(`onOff({endpoints: {top: 1, bottom: 2}})`, async () => {
        await assertDefintion({
            device: mockDevice({modelID: 'PM-S240R-ZB', endpoints: [
                {ID: 1, inputClusters: ['genOnOff']},
                {ID: 2, inputClusters: ['genOnOff']},
            ]}),
            meta: {multiEndpoint: true},
            fromZigbee: [fz.on_off, fz.power_on_behavior],
            toZigbee: ['state', 'on_time', 'off_wait_time', 'power_on_behavior'],
            exposes: ['linkquality', 'power_on_behavior', 'switch_bottom(state)', 'switch_top(state)'],
            bind: {
                1: ['genOnOff'],
                2: ['genOnOff'],
            },
            read: {
                1: [['genOnOff', ['onOff']], ['genOnOff', ['startUpOnOff']]],
                2: [['genOnOff', ['onOff']], ['genOnOff', ['startUpOnOff']]],
            },
            configureReporting: {
                1: [
                    ['genOnOff', [reportingItem('onOff', 0, repInterval.MAX, 1)]],
                ],
                2: [
                    ['genOnOff', [reportingItem('onOff', 0, repInterval.MAX, 1)]],
                ],
            },
            endpoints: {bottom: 2, top: 1},
        });
    });
});