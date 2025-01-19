import {Zcl} from 'zigbee-herdsman';

import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import {deviceAddCustomCluster} from '../lib/modernExtend';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend, Fz, KeyValue, Tz} from '../lib/types';
import * as utils from '../lib/utils';

const e = exposes.presets;
const ea = exposes.access;

const local = {
    modernExtend: {
        addCustomClusterManuSpecificNikoConfig: () =>
            deviceAddCustomCluster('manuSpecificNikoConfig', {
                ID: 0xfc00,
                manufacturerCode: Zcl.ManufacturerCode.NIKO_NV,
                attributes: {
                    /* WARNING: 0x0000 has different datatypes!
                     *          enum8 (switch) vs. bitmap8 (outlet)
                     *          unknown usage/function on outlet
                     */
                    switchOperationMode: {ID: 0x0000, type: Zcl.DataType.ENUM8},
                    outletLedColor: {ID: 0x0100, type: Zcl.DataType.UINT24},
                    outletChildLock: {ID: 0x0101, type: Zcl.DataType.UINT8},
                    outletLedState: {ID: 0x0104, type: Zcl.DataType.UINT8},
                },
                commands: {},
                commandsResponse: {},
            }),
        addCustomClusterManuSpecificNikoState: () =>
            deviceAddCustomCluster('manuSpecificNikoState', {
                ID: 0xfc01,
                manufacturerCode: Zcl.ManufacturerCode.NIKO_NV,
                attributes: {
                    switchActionReporting: {ID: 0x0001, type: Zcl.DataType.BITMAP8},
                    switchAction: {ID: 0x0002, type: Zcl.DataType.UINT8},
                },
                commands: {},
                commandsResponse: {},
            }),
    },
    fz: {
        switch_operation_mode: {
            cluster: 'manuSpecificNikoConfig',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const state: KeyValue = {};
                if (msg.data.switchOperationMode !== undefined) {
                    const operationModeMap = {0x02: 'control_relay', 0x01: 'decoupled', 0x00: 'unknown'};
                    state['operation_mode'] = utils.getFromLookup(msg.data.switchOperationMode, operationModeMap);
                }
                return state;
            },
        } satisfies Fz.Converter,
        switch_action: {
            cluster: 'manuSpecificNikoState',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const state: KeyValue = {};

                if (msg.data.switchActionReporting !== undefined) {
                    const actionReportingMap: KeyValue = {0x00: false, 0x1f: true};
                    state['action_reporting'] = utils.getFromLookup(msg.data.switchActionReporting, actionReportingMap);
                }
                if (msg.data.switchAction !== undefined) {
                    // NOTE: a single press = two separate values reported, 16 followed by 64
                    //       a hold/release cycle = three separate values, 16, 32, and 48
                    // NOTE: these values should be interpreted bitwise
                    //       when pushing multiple buttons at the same time, multiple bits can be set simultaneously and should generate multiple events
                    //       currently, these values are not mapped and thus ignored
                    const actionMap: KeyValue =
                        model.model == '552-721X1'
                            ? {
                                  16: null,
                                  64: 'single',
                                  32: 'hold',
                                  48: 'release',
                                  256: null,
                                  1024: 'single_ext',
                                  512: 'hold_ext',
                                  768: 'release_ext',
                              }
                            : {
                                  16: null,
                                  64: 'single_left',
                                  32: 'hold_left',
                                  48: 'release_left',
                                  256: null,
                                  1024: 'single_left_ext',
                                  512: 'hold_left_ext',
                                  768: 'release_left_ext',
                                  4096: null,
                                  16384: 'single_right',
                                  8192: 'hold_right',
                                  12288: 'release_right',
                                  65536: null,
                                  262144: 'single_right_ext',
                                  131072: 'hold_right_ext',
                                  196608: 'release_right_ext',
                              };

                    state['action'] = actionMap[msg.data.switchAction];
                }
                return state;
            },
        } satisfies Fz.Converter,
        switch_status_led: {
            cluster: 'manuSpecificNikoConfig',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const state: KeyValue = {};
                if (msg.data.outletLedState !== undefined) {
                    state['led_enable'] = msg.data['outletLedState'] == 1;
                }
                if (msg.data.outletLedColor !== undefined) {
                    state['led_state'] = msg.data['outletLedColor'] == 255 ? 'ON' : 'OFF';
                }
                return state;
            },
        } satisfies Fz.Converter,
        outlet: {
            cluster: 'manuSpecificNikoConfig',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const state: KeyValue = {};
                if (msg.data.outletChildLock !== undefined) {
                    state['child_lock'] = msg.data['outletChildLock'] == 0 ? 'LOCK' : 'UNLOCK';
                }
                if (msg.data.outletLedState !== undefined) {
                    state['led_enable'] = msg.data['outletLedState'] == 1;
                }
                return state;
            },
        } satisfies Fz.Converter,
    },
    tz: {
        switch_operation_mode: {
            key: ['operation_mode'],
            convertSet: async (entity, key, value, meta) => {
                // WARN: while we can technically write 0x00 to the operationMode attribute
                //       this seems to brick the device and it will need to be rejoined
                utils.assertEndpoint(entity);
                const operationModeLookup = {control_relay: 0x02, decoupled: 0x01};
                // @ts-expect-error ignore
                if (operationModeLookup[value] === undefined) {
                    throw new Error(`operation_mode was called with an invalid value (${value})`);
                } else {
                    await utils.enforceEndpoint(entity, key, meta).write(
                        'manuSpecificNikoConfig',
                        // @ts-expect-error ignore
                        {switchOperationMode: operationModeLookup[value]},
                    );
                    // @ts-expect-error ignore
                    return {state: {operation_mode: value.toLowerCase()}};
                }
            },
            convertGet: async (entity, key, meta) => {
                utils.assertEndpoint(entity);
                await utils.enforceEndpoint(entity, key, meta).read('manuSpecificNikoConfig', ['switchOperationMode']);
            },
        } satisfies Tz.Converter,
        switch_action_reporting: {
            key: ['action_reporting'],
            convertSet: async (entity, key, value, meta) => {
                const actionReportingMap: KeyValue = {false: 0x00, true: 0x1f};
                // @ts-expect-error ignore
                if (actionReportingMap[value] === undefined) {
                    throw new Error(`action_reporting was called with an invalid value (${value})`);
                } else {
                    await entity.write(
                        'manuSpecificNikoState',
                        // @ts-expect-error ignore
                        {switchActionReporting: actionReportingMap[value]},
                    );
                    await entity.read('manuSpecificNikoState', ['switchActionReporting']);
                    return {state: {action_reporting: value}};
                }
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificNikoState', ['switchActionReporting']);
            },
        } satisfies Tz.Converter,
        switch_led_enable: {
            key: ['led_enable'],
            convertSet: async (entity, key, value, meta) => {
                await entity.write('manuSpecificNikoConfig', {outletLedState: value ? 1 : 0});
                await entity.read('manuSpecificNikoConfig', ['outletLedColor']);
                return {state: {led_enable: value ? true : false}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificNikoConfig', ['outletLedState']);
            },
        } satisfies Tz.Converter,
        switch_led_state: {
            key: ['led_state'],
            convertSet: async (entity, key, value, meta) => {
                utils.assertString(value, key);
                await entity.write('manuSpecificNikoConfig', {outletLedColor: value.toLowerCase() === 'off' ? 0 : 255});
                return {state: {led_state: value.toLowerCase() === 'off' ? 'OFF' : 'ON'}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificNikoConfig', ['outletLedColor']);
            },
        } satisfies Tz.Converter,
        outlet_child_lock: {
            key: ['child_lock'],
            convertSet: async (entity, key, value, meta) => {
                utils.assertString(value, key);
                await entity.write('manuSpecificNikoConfig', {outletChildLock: value.toLowerCase() === 'lock' ? 0 : 1});
                return {state: {child_lock: value.toLowerCase() === 'lock' ? 'LOCK' : 'UNLOCK'}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificNikoConfig', ['outletChildLock']);
            },
        } satisfies Tz.Converter,
        outlet_led_enable: {
            key: ['led_enable'],
            convertSet: async (entity, key, value, meta) => {
                await entity.write('manuSpecificNikoConfig', {outletLedState: value ? 1 : 0});
                return {state: {led_enable: value ? true : false}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificNikoConfig', ['outletLedState']);
            },
        } satisfies Tz.Converter,
    },
};

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['Connected socket outlet'],
        model: '170-33505/170-34605',
        vendor: 'Niko',
        description: 'Connected socket outlet',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, local.fz.outlet],
        toZigbee: [tz.on_off, tz.electrical_measurement_power, tz.currentsummdelivered, local.tz.outlet_child_lock, local.tz.outlet_led_enable],
        extend: [local.modernExtend.addCustomClusterManuSpecificNikoConfig()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);

            // NOTE: we read them individually, acFrequency* is not supported
            //       so we cannot use readEletricalMeasurementMultiplierDivisors
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.activePower(endpoint, {min: 5, max: 3600, change: 1000});
            await endpoint.read('haElectricalMeasurement', ['acCurrentDivisor', 'acPowerMultiplier', 'acPowerDivisor']);
            await reporting.rmsCurrent(endpoint, {min: 5, max: 3600, change: 100});
            await endpoint.read('haElectricalMeasurement', ['acVoltageMultiplier', 'acVoltageDivisor', 'acCurrentMultiplier']);
            await reporting.rmsVoltage(endpoint, {min: 5, max: 3600, change: 100});

            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 60, change: 1});

            await endpoint.read('manuSpecificNikoConfig', ['outletChildLock']);
            await endpoint.read('manuSpecificNikoConfig', ['outletLedState']);
        },
        exposes: [
            e.switch(),
            e.power().withAccess(ea.STATE_GET),
            e.current(),
            e.voltage(),
            e.energy().withAccess(ea.STATE_GET),
            e.binary('child_lock', ea.ALL, 'LOCK', 'UNLOCK').withDescription('Enables/disables physical input on the device'),
            e.binary('led_enable', ea.ALL, true, false).withDescription('Enable LED'),
        ],
    },
    {
        zigbeeModel: ['Smart plug Zigbee SE'],
        model: '552-80698',
        vendor: 'Niko',
        description: 'Smart plug with side earthing pin',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior, tz.electrical_measurement_power, tz.currentsummdelivered],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            // only activePower seems to be support, although compliance document states otherwise
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.activePower(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 60, change: 1});
        },
        exposes: [
            e.switch(),
            e.power().withAccess(ea.STATE_GET),
            e.energy().withAccess(ea.STATE_GET),
            e.enum('power_on_behavior', ea.ALL, ['off', 'previous', 'on']).withDescription('Controls the behaviour when the device is powered on'),
        ],
    },
    {
        zigbeeModel: ['Smart plug Zigbee PE'],
        model: '552-80699',
        vendor: 'Niko',
        description: 'Smart plug with earthing pin',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior, tz.electrical_measurement_power, tz.currentsummdelivered],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            // only activePower seems to be support, although compliance document states otherwise
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.activePower(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 60, change: 1});
        },
        exposes: [
            e.switch(),
            e.power().withAccess(ea.STATE_GET),
            e.energy().withAccess(ea.STATE_GET),
            e.enum('power_on_behavior', ea.ALL, ['off', 'previous', 'on']).withDescription('Controls the behaviour when the device is powered on'),
        ],
    },
    {
        zigbeeModel: ['Connectable motion sensor,Zigbee'],
        model: '552-80401',
        vendor: 'Niko',
        description: 'Wireless motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ['genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.battery()],
    },
    {
        zigbeeModel: ['Single connectable switch,10A'],
        model: '552-721X1',
        vendor: 'Niko',
        description: 'Single connectable switch',
        fromZigbee: [fz.on_off, local.fz.switch_operation_mode, local.fz.switch_action, local.fz.switch_status_led],
        toZigbee: [
            tz.on_off,
            local.tz.switch_operation_mode,
            local.tz.switch_action_reporting,
            local.tz.switch_led_enable,
            local.tz.switch_led_state,
        ],
        extend: [local.modernExtend.addCustomClusterManuSpecificNikoConfig(), local.modernExtend.addCustomClusterManuSpecificNikoState()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
            await endpoint.read('manuSpecificNikoConfig', ['switchOperationMode', 'outletLedState', 'outletLedColor']);
            // Enable action reporting by default
            await endpoint.write('manuSpecificNikoState', {switchActionReporting: true});
            await endpoint.read('manuSpecificNikoState', ['switchActionReporting']);
        },
        exposes: [
            e.switch(),
            e.action(['single', 'hold', 'release', 'single_ext', 'hold_ext', 'release_ext']),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled']),
            e.binary('action_reporting', ea.ALL, true, false).withDescription('Enable Action Reporting'),
            e.binary('led_enable', ea.ALL, true, false).withDescription('Enable LED'),
            e.binary('led_state', ea.ALL, 'ON', 'OFF').withDescription('LED State'),
        ],
    },
    {
        zigbeeModel: ['Double connectable switch,10A'],
        model: '552-721X2',
        vendor: 'Niko',
        description: 'Double connectable switch',
        fromZigbee: [fz.on_off, local.fz.switch_operation_mode, local.fz.switch_action, local.fz.switch_status_led],
        toZigbee: [
            tz.on_off,
            local.tz.switch_operation_mode,
            local.tz.switch_action_reporting,
            local.tz.switch_led_enable,
            local.tz.switch_led_state,
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        extend: [local.modernExtend.addCustomClusterManuSpecificNikoConfig(), local.modernExtend.addCustomClusterManuSpecificNikoState()],
        meta: {multiEndpointEnforce: {operation_mode: 1}, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const ep1 = device.getEndpoint(1);
            const ep2 = device.getEndpoint(2);
            await reporting.bind(ep1, coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(ep2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(ep1);
            await reporting.onOff(ep2);
            await ep1.read('manuSpecificNikoConfig', ['switchOperationMode', 'outletLedState', 'outletLedColor']);
            await ep2.read('manuSpecificNikoConfig', ['switchOperationMode', 'outletLedState', 'outletLedColor']);
            // Enable action reporting by default
            await ep1.write('manuSpecificNikoState', {switchActionReporting: true});
            await ep1.read('manuSpecificNikoState', ['switchActionReporting']);
        },
        exposes: [
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            e.action([
                'single_left',
                'hold_left',
                'release_left',
                'single_left_ext',
                'hold_left_ext',
                'release_left_ext',
                'single_right',
                'hold_right',
                'release_right',
                'single_right_ext',
                'hold_right_ext',
                'release_right_ext',
            ]),
            e.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled']),
            e.binary('action_reporting', ea.ALL, true, false).withDescription('Enable Action Reporting'),
            e.binary('led_enable', ea.ALL, true, false).withEndpoint('l1').withDescription('Enable LED'),
            e.binary('led_enable', ea.ALL, true, false).withEndpoint('l2').withDescription('Enable LED'),
            e.binary('led_state', ea.ALL, 'ON', 'OFF').withEndpoint('l1').withDescription('LED State'),
            e.binary('led_state', ea.ALL, 'ON', 'OFF').withEndpoint('l2').withDescription('LED State'),
        ],
    },
    {
        zigbeeModel: ['Connectable dimmer,3-200W,2-wire'],
        model: '552-72201',
        vendor: 'Niko',
        description: 'Connectable dimmer',
        fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fz.command_move, fz.command_stop],
        toZigbee: [tz.light_onoff_brightness, tz.level_config],
        exposes: [e.light_brightness().withLevelConfig()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ['Connectable motor control,3A'],
        model: '552-72301',
        vendor: 'Niko',
        description: 'Connectable motor control',
        fromZigbee: [fz.cover_position_tilt, fz.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        meta: {coverInverted: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
        exposes: [e.cover_position()],
    },
    {
        zigbeeModel: ['Battery switch, 1 button'],
        model: '552-720X1',
        vendor: 'Niko',
        description: 'Battery switch with 1 button',
        fromZigbee: [fz.command_on, fz.command_off, fz.identify, fz.battery, fz.command_move, fz.command_stop],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genGroups', 'genOnOff', 'genLevelCtrl']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.action(['on', 'off', 'brightness_move_up', 'brightness_move_down', 'brightness_stop']), e.battery()],
    },
    {
        zigbeeModel: ['Battery switch, 2 button'],
        model: '552-720X2',
        vendor: 'Niko',
        description: 'Battery switch with 2 buttons',
        meta: {multiEndpoint: true},
        fromZigbee: [fz.command_on, fz.command_off, fz.identify, fz.battery, fz.command_move, fz.command_stop],
        toZigbee: [],
        endpoint: (device) => {
            return {left: 1, right: 2};
        },
        configure: async (device, coordinatorEndpoint) => {
            const ep1 = device.getEndpoint(1);
            await reporting.bind(ep1, coordinatorEndpoint, ['genGroups', 'genOnOff', 'genLevelCtrl']);
            await reporting.batteryPercentageRemaining(ep1);
            const ep2 = device.getEndpoint(2);
            await reporting.bind(ep2, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
        exposes: [
            e.action([
                'on_left',
                'off_left',
                'on_right',
                'off_right',
                'brightness_move_up_left',
                'brightness_move_up_right',
                'brightness_move_down_left',
                'brightness_move_down_right',
                'brightness_stop_left',
                'brightness_stop_right',
            ]),
            e.battery(),
        ],
    },
    {
        zigbeeModel: ['Battery switch, 4 button'],
        model: '552-720X4',
        vendor: 'Niko',
        description: 'Battery switch with 4 buttons',
        meta: {multiEndpoint: true},
        fromZigbee: [fz.command_on, fz.command_off, fz.identify, fz.battery, fz.command_move, fz.command_stop],
        toZigbee: [],
        endpoint: (device) => {
            return {top_left: 1, bottom_left: 2, top_right: 3, bottom_right: 4};
        },
        configure: async (device, coordinatorEndpoint) => {
            const ep1 = device.getEndpoint(1);
            await reporting.bind(ep1, coordinatorEndpoint, ['genGroups', 'genOnOff', 'genLevelCtrl']);
            await reporting.batteryPercentageRemaining(ep1);
            const ep2 = device.getEndpoint(2);
            await reporting.bind(ep2, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            const ep3 = device.getEndpoint(3);
            await reporting.bind(ep3, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            const ep4 = device.getEndpoint(4);
            await reporting.bind(ep4, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
        exposes: [
            e.action([
                'on_top_left',
                'off_top_left',
                'on_bottom_left',
                'off_bottom_left',
                'on_top_right',
                'off_top_right',
                'on_bottom_right',
                'off_bottom_right',
                'brightness_move_up_top_left',
                'brightness_move_up_bottom_left',
                'brightness_move_up_top_right',
                'brightness_move_up_bottom_right',
                'brightness_move_down_top_left',
                'brightness_move_down_bottom_left',
                'brightness_move_down_top_right',
                'brightness_move_down_bottom_right',
                'brightness_stop_top_left',
                'brightness_stop_bottom_left',
                'brightness_stop_top_right',
                'brightness_stop_bottom_right',
            ]),
            e.battery(),
        ],
    },
];

export default definitions;
module.exports = definitions;
