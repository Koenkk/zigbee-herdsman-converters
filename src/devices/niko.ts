import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import {deviceAddCustomCluster} from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValue, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

interface NikoConfig {
    attributes: {
        switchOperationMode: number;
        outletLedColor: number;
        outletChildLock: number;
        outletLedState: number;
        ledSyncMode: number;
    };
    commands: never;
    commandResponses: never;
}

interface NikoState {
    manufacturerCode: Zcl.ManufacturerCode.NIKO_NV;
    attributes: {
        switchActionReporting: number;
        switchAction: number;
    };
    commands: never;
    commandResponses: never;
}

const local = {
    modernExtend: {
        addCustomClusterManuSpecificNikoConfig: () =>
            deviceAddCustomCluster("manuSpecificNikoConfig", {
                ID: 0xfc00,
                manufacturerCode: Zcl.ManufacturerCode.NIKO_NV,
                attributes: {
                    /* WARNING: 0x0000 has different datatypes!
                     *          enum8 (switch) vs. bitmap8 (outlet)
                     *          unknown usage/function on outlet
                     */
                    switchOperationMode: {ID: 0x0000, type: Zcl.DataType.ENUM8, write: true, max: 0xff},
                    outletLedColor: {ID: 0x0100, type: Zcl.DataType.UINT24, write: true, max: 0xffffff},
                    outletChildLock: {ID: 0x0101, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    outletLedState: {ID: 0x0104, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                    /* WARNING: 0x0107 is not supported on older switches */
                    ledSyncMode: {ID: 0x0107, type: Zcl.DataType.BITMAP32, write: true},
                },
                commands: {},
                commandsResponse: {},
            }),
        addCustomClusterManuSpecificNikoState: () =>
            deviceAddCustomCluster("manuSpecificNikoState", {
                ID: 0xfc01,
                manufacturerCode: Zcl.ManufacturerCode.NIKO_NV,
                attributes: {
                    switchActionReporting: {ID: 0x0001, type: Zcl.DataType.BITMAP8, write: true},
                    switchAction: {ID: 0x0002, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                },
                commands: {},
                commandsResponse: {},
            }),
    },
    fz: {
        switch_operation_mode: {
            cluster: "manuSpecificNikoConfig",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const state: KeyValue = {};
                if (msg.data.switchOperationMode !== undefined) {
                    const operationModeMap = {2: "control_relay", 1: "decoupled", 0: "unknown"};
                    state.operation_mode = utils.getFromLookup(msg.data.switchOperationMode, operationModeMap);
                }
                return state;
            },
        } satisfies Fz.Converter<"manuSpecificNikoConfig", NikoConfig, ["attributeReport", "readResponse"]>,
        switch_action: {
            cluster: "manuSpecificNikoState",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const state: KeyValue = {};

                if (msg.data.switchActionReporting !== undefined) {
                    const actionReportingMap: KeyValue = {0: false, 31: true};
                    state.action_reporting = utils.getFromLookup(msg.data.switchActionReporting, actionReportingMap);
                }
                if (msg.data.switchAction !== undefined) {
                    // NOTE: a single press = two separate values reported, 16 followed by 64
                    //       a hold/release cycle = three separate values, 16, 32, and 48

                    // https://github.com/Koenkk/zigbee2mqtt/issues/13737#issuecomment-1520002786
                    const buttonShift: {[key: string]: number} =
                        model.model === "552-721X1"
                            ? {
                                  "": 4,
                                  ext: 8,
                              }
                            : {
                                  left: 4,
                                  left_ext: 8,
                                  right: 12,
                                  right_ext: 16,
                              };
                    const actions: {[key: string]: number} = {
                        single: 4,
                        hold: 2,
                        release: 3,
                    };

                    for (const button in buttonShift) {
                        const shiftedValue = (msg.data.switchAction >> buttonShift[button]) & 0xf;
                        for (const action in actions) {
                            if (shiftedValue === actions[action]) {
                                const buttonPostFix = button === "" ? "" : `_${button}`;
                                const value = action + buttonPostFix;
                                publish({action: value});
                            }
                        }
                    }
                }
            },
        } satisfies Fz.Converter<"manuSpecificNikoState", NikoState, ["attributeReport", "readResponse"]>,
        switch_status_led: {
            cluster: "manuSpecificNikoConfig",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const state: KeyValue = {};
                if (msg.data.outletLedState !== undefined) {
                    state.led_enable = msg.data.outletLedState === 1;
                }
                if (msg.data.outletLedColor !== undefined) {
                    const ledStateMap: KeyValue = {0: "OFF", 255: "ON", 65280: "Blue", 16711680: "Red", 16777215: "Purple"};
                    state.led_state = utils.getFromLookup(msg.data.outletLedColor, ledStateMap);
                }
                if (msg.data.ledSyncMode !== undefined) {
                    const ledSyncMap: {[key: number]: string} = {0: "Off", 1: "On", 2: "Inverted"};
                    if (model.meta.multiEndpoint) {
                        const endpointOffsetMap: {[key: string]: number} = {l1: 0, l2: 1};
                        for (const ep in endpointOffsetMap) {
                            const shift = endpointOffsetMap[ep] * 4;
                            const mask = 0xf << shift;
                            const result = (msg.data.ledSyncMode & mask) >> shift;
                            state[`led_sync_mode_${ep}`] = utils.getFromLookup(result, ledSyncMap);
                        }
                    } else {
                        state.led_sync_mode = utils.getFromLookup(msg.data.ledSyncMode, ledSyncMap);
                    }
                }
                return state;
            },
        } satisfies Fz.Converter<"manuSpecificNikoConfig", NikoConfig, ["attributeReport", "readResponse"]>,
        outlet: {
            cluster: "manuSpecificNikoConfig",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const state: KeyValue = {};
                if (msg.data.outletChildLock !== undefined) {
                    state.child_lock = msg.data.outletChildLock === 0 ? "LOCK" : "UNLOCK";
                }
                if (msg.data.outletLedState !== undefined) {
                    state.led_enable = msg.data.outletLedState === 1;
                }
                return state;
            },
        } satisfies Fz.Converter<"manuSpecificNikoConfig", NikoConfig, ["attributeReport", "readResponse"]>,
    },
    tz: {
        switch_operation_mode: {
            key: ["operation_mode"],
            convertSet: async (entity, key, value, meta) => {
                // WARN: while we can technically write 0x00 to the operationMode attribute
                //       this seems to brick the device and it will need to be rejoined
                utils.assertEndpoint(entity);
                const operationModeLookup = {control_relay: 0x02, decoupled: 0x01};
                // @ts-expect-error ignore
                if (operationModeLookup[value] === undefined) {
                    throw new Error(`operation_mode was called with an invalid value (${value})`);
                }
                await utils.enforceEndpoint(entity, key, meta).write(
                    "manuSpecificNikoConfig",
                    // @ts-expect-error ignore
                    {switchOperationMode: operationModeLookup[value]},
                );
                // @ts-expect-error ignore
                return {state: {operation_mode: value.toLowerCase()}};
            },
            convertGet: async (entity, key, meta) => {
                utils.assertEndpoint(entity);
                await utils
                    .enforceEndpoint(entity, key, meta)
                    .read<"manuSpecificNikoConfig", NikoConfig>("manuSpecificNikoConfig", ["switchOperationMode"]);
            },
        } satisfies Tz.Converter,
        switch_action_reporting: {
            key: ["action_reporting"],
            convertSet: async (entity, key, value, meta) => {
                const actionReportingMap: KeyValue = {false: 0x00, true: 0x1f};
                // @ts-expect-error ignore
                if (actionReportingMap[value] === undefined) {
                    throw new Error(`action_reporting was called with an invalid value (${value})`);
                }
                await entity.write(
                    "manuSpecificNikoState",
                    // @ts-expect-error ignore
                    {switchActionReporting: actionReportingMap[value]},
                );
                return {state: {action_reporting: value}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read<"manuSpecificNikoState", NikoState>("manuSpecificNikoState", ["switchActionReporting"]);
            },
        } satisfies Tz.Converter,
        switch_led_enable: {
            key: ["led_enable"],
            convertSet: async (entity, key, value, meta) => {
                await entity.write<"manuSpecificNikoConfig", NikoConfig>("manuSpecificNikoConfig", {outletLedState: value ? 1 : 0});
                await entity.read<"manuSpecificNikoConfig", NikoConfig>("manuSpecificNikoConfig", ["outletLedColor"]);
                return {state: {led_enable: !!value}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read<"manuSpecificNikoConfig", NikoConfig>("manuSpecificNikoConfig", ["outletLedState"]);
            },
        } satisfies Tz.Converter,
        switch_led_state: {
            key: ["led_state"],
            convertSet: async (entity, key, value, meta) => {
                const ledStateMap: KeyValue = {OFF: 0x00, ON: 0x0000ff, Blue: 0x00ff00, Red: 0xff0000, Purple: 0xffffff};
                // @ts-expect-error ignore
                if (ledStateMap[value] === undefined) {
                    throw new Error(`led_state was called with an invalid value (${value})`);
                }
                await entity.write(
                    "manuSpecificNikoConfig",
                    // @ts-expect-error ignore
                    {outletLedColor: ledStateMap[value]},
                );
                return {state: {led_state: value}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read<"manuSpecificNikoConfig", NikoConfig>("manuSpecificNikoConfig", ["outletLedColor"]);
            },
        } satisfies Tz.Converter,
        switch_led_sync_mode: {
            key: ["led_sync_mode"],
            convertSet: async (entity, key, value, meta) => {
                const ledSyncMap: {[key: string]: number} = {Off: 0, On: 1, Inverted: 2};
                // @ts-expect-error ignore
                if (ledSyncMap[value] === undefined) {
                    throw new Error(`led_sync_mode was called with an invalid value (${value})`);
                }
                const endpointOffsetMap: {[key: string]: number} = {l1: 0, l2: 1};
                let result = 0x00;
                if (endpointOffsetMap[meta.endpoint_name] !== undefined) {
                    // combine states of all endpoints into single value to write to device
                    for (const ep in endpointOffsetMap) {
                        // @ts-expect-error ignore
                        const endpointState: number = ep === meta.endpoint_name ? value : meta.state[`led_sync_mode_${ep}`];
                        // @ts-expect-error ignore
                        const endpointValue = ledSyncMap[endpointState] === undefined ? ledSyncMap[value] : ledSyncMap[endpointState];
                        const shiftedValue = endpointValue << (endpointOffsetMap[ep] * 4);
                        result = result | shiftedValue;
                    }
                } else {
                    // @ts-expect-error ignore
                    result = ledSyncMap[value];
                }
                await entity.write<"manuSpecificNikoConfig", NikoConfig>("manuSpecificNikoConfig", {ledSyncMode: result});
                return {state: {led_sync_mode: value}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read<"manuSpecificNikoConfig", NikoConfig>("manuSpecificNikoConfig", ["ledSyncMode"]);
            },
        } satisfies Tz.Converter,
        outlet_child_lock: {
            key: ["child_lock"],
            convertSet: async (entity, key, value, meta) => {
                utils.assertString(value, key);
                await entity.write<"manuSpecificNikoConfig", NikoConfig>("manuSpecificNikoConfig", {
                    outletChildLock: value.toLowerCase() === "lock" ? 0 : 1,
                });
                return {state: {child_lock: value.toLowerCase() === "lock" ? "LOCK" : "UNLOCK"}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read<"manuSpecificNikoConfig", NikoConfig>("manuSpecificNikoConfig", ["outletChildLock"]);
            },
        } satisfies Tz.Converter,
        outlet_led_enable: {
            key: ["led_enable"],
            convertSet: async (entity, key, value, meta) => {
                await entity.write<"manuSpecificNikoConfig", NikoConfig>("manuSpecificNikoConfig", {outletLedState: value ? 1 : 0});
                return {state: {led_enable: !!value}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read<"manuSpecificNikoConfig", NikoConfig>("manuSpecificNikoConfig", ["outletLedState"]);
            },
        } satisfies Tz.Converter,
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Connected socket outlet"],
        model: "170-33505/170-34605",
        vendor: "Niko",
        description: "Connected socket outlet",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, local.fz.outlet],
        toZigbee: [tz.on_off, tz.electrical_measurement_power, tz.currentsummdelivered, local.tz.outlet_child_lock, local.tz.outlet_led_enable],
        extend: [local.modernExtend.addCustomClusterManuSpecificNikoConfig()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.onOff(endpoint);

            // NOTE: we read them individually, acFrequency* is not supported
            //       so we cannot use readEletricalMeasurementMultiplierDivisors
            await endpoint.read("haElectricalMeasurement", ["acPowerMultiplier", "acPowerDivisor"]);
            await reporting.activePower(endpoint, {min: 5, max: 3600, change: 1000});
            await endpoint.read("haElectricalMeasurement", ["acCurrentDivisor", "acPowerMultiplier", "acPowerDivisor"]);
            await reporting.rmsCurrent(endpoint, {min: 5, max: 3600, change: 100});
            await endpoint.read("haElectricalMeasurement", ["acVoltageMultiplier", "acVoltageDivisor", "acCurrentMultiplier"]);
            await reporting.rmsVoltage(endpoint, {min: 5, max: 3600, change: 100});

            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 60, change: 1});

            await endpoint.read<"manuSpecificNikoConfig", NikoConfig>("manuSpecificNikoConfig", ["outletChildLock"]);
            await endpoint.read<"manuSpecificNikoConfig", NikoConfig>("manuSpecificNikoConfig", ["outletLedState"]);
        },
        exposes: [
            e.switch(),
            e.power().withAccess(ea.STATE_GET),
            e.current(),
            e.voltage(),
            e.energy().withAccess(ea.STATE_GET),
            e.binary("child_lock", ea.ALL, "LOCK", "UNLOCK").withDescription("Enables/disables physical input on the device"),
            e.binary("led_enable", ea.ALL, true, false).withDescription("Enable LED"),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["Smart plug Zigbee SE"],
        model: "552-80698",
        vendor: "Niko",
        description: "Smart plug with side earthing pin",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior, tz.electrical_measurement_power, tz.currentsummdelivered],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.onOff(endpoint);
            // only activePower seems to be support, although compliance document states otherwise
            await endpoint.read("haElectricalMeasurement", ["acPowerMultiplier", "acPowerDivisor"]);
            await reporting.activePower(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 60, change: 1});
        },
        exposes: [
            e.switch(),
            e.power().withAccess(ea.STATE_GET),
            e.energy().withAccess(ea.STATE_GET),
            e.enum("power_on_behavior", ea.ALL, ["off", "previous", "on"]).withDescription("Controls the behaviour when the device is powered on"),
        ],
    },
    {
        zigbeeModel: ["Smart plug Zigbee PE"],
        model: "552-80699",
        vendor: "Niko",
        description: "Smart plug with earthing pin",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior, tz.electrical_measurement_power, tz.currentsummdelivered],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.onOff(endpoint);
            // only activePower seems to be support, although compliance document states otherwise
            await endpoint.read("haElectricalMeasurement", ["acPowerMultiplier", "acPowerDivisor"]);
            await reporting.activePower(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 60, change: 1});
        },
        exposes: [
            e.switch(),
            e.power().withAccess(ea.STATE_GET),
            e.energy().withAccess(ea.STATE_GET),
            e.enum("power_on_behavior", ea.ALL, ["off", "previous", "on"]).withDescription("Controls the behaviour when the device is powered on"),
        ],
    },
    {
        zigbeeModel: ["Connectable motion sensor,Zigbee"],
        model: "552-80401",
        vendor: "Niko",
        description: "Wireless motion sensor",
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ["genPowerCfg"];
            await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.battery()],
        ota: true,
    },
    {
        zigbeeModel: ["Single connectable switch,10A"],
        model: "552-721X1",
        vendor: "Niko",
        description: "Single connectable switch",
        fromZigbee: [fz.on_off, local.fz.switch_operation_mode, local.fz.switch_action, local.fz.switch_status_led],
        toZigbee: [
            tz.on_off,
            local.tz.switch_operation_mode,
            local.tz.switch_action_reporting,
            local.tz.switch_led_enable,
            local.tz.switch_led_state,
            local.tz.switch_led_sync_mode,
        ],
        extend: [local.modernExtend.addCustomClusterManuSpecificNikoConfig(), local.modernExtend.addCustomClusterManuSpecificNikoState()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint);
            await endpoint.read<"manuSpecificNikoConfig", NikoConfig>("manuSpecificNikoConfig", [
                "switchOperationMode",
                "outletLedState",
                "outletLedColor",
            ]);
            // Enable action reporting by default
            await endpoint.write<"manuSpecificNikoState", NikoState>("manuSpecificNikoState", {switchActionReporting: 1});
            await endpoint.read<"manuSpecificNikoState", NikoState>("manuSpecificNikoState", ["switchActionReporting"]);
            await endpoint.read<"manuSpecificNikoConfig", NikoConfig>("manuSpecificNikoConfig", ["ledSyncMode"]);
        },
        exposes: [
            e.switch(),
            e.action(["single", "hold", "release", "single_ext", "hold_ext", "release_ext"]),
            e.enum("operation_mode", ea.ALL, ["control_relay", "decoupled"]),
            e.binary("action_reporting", ea.ALL, true, false).withDescription("Enable Action Reporting"),
            e.binary("led_enable", ea.ALL, true, false).withDescription("Enable LED"),
            e.enum("led_state", ea.ALL, ["ON", "OFF", "Blue", "Red", "Purple"]).withDescription("LED State"),
            e.enum("led_sync_mode", ea.ALL, ["Off", "On", "Inverted"]).withDescription("Sync LED with relay state"),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["Double connectable switch,10A"],
        model: "552-721X2",
        vendor: "Niko",
        description: "Double connectable switch",
        fromZigbee: [fz.on_off, local.fz.switch_operation_mode, local.fz.switch_action, local.fz.switch_status_led],
        toZigbee: [
            tz.on_off,
            local.tz.switch_operation_mode,
            local.tz.switch_action_reporting,
            local.tz.switch_led_enable,
            local.tz.switch_led_state,
            local.tz.switch_led_sync_mode,
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        extend: [local.modernExtend.addCustomClusterManuSpecificNikoConfig(), local.modernExtend.addCustomClusterManuSpecificNikoState()],
        meta: {multiEndpointEnforce: {operation_mode: 1}, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const ep1 = device.getEndpoint(1);
            const ep2 = device.getEndpoint(2);
            await reporting.bind(ep1, coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(ep2, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(ep1);
            await reporting.onOff(ep2);
            await ep1.read<"manuSpecificNikoConfig", NikoConfig>("manuSpecificNikoConfig", [
                "switchOperationMode",
                "outletLedState",
                "outletLedColor",
            ]);
            await ep2.read<"manuSpecificNikoConfig", NikoConfig>("manuSpecificNikoConfig", [
                "switchOperationMode",
                "outletLedState",
                "outletLedColor",
            ]);
            // Enable action reporting by default
            await ep1.write<"manuSpecificNikoState", NikoState>("manuSpecificNikoState", {switchActionReporting: 1});
            await ep1.read<"manuSpecificNikoState", NikoState>("manuSpecificNikoState", ["switchActionReporting"]);
            await ep1.read<"manuSpecificNikoConfig", NikoConfig>("manuSpecificNikoConfig", ["ledSyncMode"]);
            await ep2.read<"manuSpecificNikoConfig", NikoConfig>("manuSpecificNikoConfig", ["ledSyncMode"]);
        },
        exposes: [
            e.switch().withEndpoint("l1"),
            e.switch().withEndpoint("l2"),
            e.action([
                "single_left",
                "hold_left",
                "release_left",
                "single_left_ext",
                "hold_left_ext",
                "release_left_ext",
                "single_right",
                "hold_right",
                "release_right",
                "single_right_ext",
                "hold_right_ext",
                "release_right_ext",
            ]),
            e.enum("operation_mode", ea.ALL, ["control_relay", "decoupled"]),
            e.binary("action_reporting", ea.ALL, true, false).withDescription("Enable Action Reporting"),
            e.binary("led_enable", ea.ALL, true, false).withEndpoint("l1").withDescription("Enable LED"),
            e.binary("led_enable", ea.ALL, true, false).withEndpoint("l2").withDescription("Enable LED"),
            e.enum("led_state", ea.ALL, ["ON", "OFF", "Blue", "Red", "Purple"]).withEndpoint("l1").withDescription("LED State"),
            e.enum("led_state", ea.ALL, ["ON", "OFF", "Blue", "Red", "Purple"]).withEndpoint("l2").withDescription("LED State"),
            e.enum("led_sync_mode", ea.ALL, ["Off", "On", "Inverted"]).withEndpoint("l1").withDescription("Sync LED with relay state"),
            e.enum("led_sync_mode", ea.ALL, ["Off", "On", "Inverted"]).withEndpoint("l2").withDescription("Sync LED with relay state"),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["Connectable dimmer,3-200W,2-wire"],
        model: "552-72201",
        vendor: "Niko",
        description: "Connectable dimmer",
        fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fz.command_move, fz.command_stop, local.fz.switch_status_led],
        toZigbee: [tz.light_onoff_brightness, tz.level_config, local.tz.switch_led_enable, local.tz.switch_led_state],
        extend: [local.modernExtend.addCustomClusterManuSpecificNikoConfig(), local.modernExtend.addCustomClusterManuSpecificNikoState()],
        exposes: [
            e.light_brightness().withLevelConfig(),
            e.binary("led_enable", ea.ALL, true, false).withDescription("Enable LED"),
            e.enum("led_state", ea.ALL, ["ON", "OFF", "Blue", "Red", "Purple"]).withDescription("LED State"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genLevelCtrl"]);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
            await endpoint.read<"manuSpecificNikoConfig", NikoConfig>("manuSpecificNikoConfig", ["outletLedState", "outletLedColor"]);
        },
        ota: true,
    },
    {
        zigbeeModel: ["Connectable motor control,3A"],
        model: "552-72301",
        vendor: "Niko",
        description: "Connectable motor control",
        fromZigbee: [fz.cover_position_tilt, fz.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        meta: {coverInverted: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresWindowCovering"]);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
        exposes: [e.cover_position()],
        ota: true,
    },
    {
        zigbeeModel: ["Battery switch, 1 button"],
        model: "552-720X1",
        vendor: "Niko",
        description: "Battery switch with 1 button",
        fromZigbee: [fz.command_on, fz.command_off, fz.identify, fz.battery, fz.command_move, fz.command_stop],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genGroups", "genOnOff", "genLevelCtrl"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.action(["on", "off", "brightness_move_up", "brightness_move_down", "brightness_stop"]), e.battery()],
        ota: true,
    },
    {
        zigbeeModel: ["Battery switch, 2 button"],
        model: "552-720X2",
        vendor: "Niko",
        description: "Battery switch with 2 buttons",
        meta: {multiEndpoint: true},
        fromZigbee: [fz.command_on, fz.command_off, fz.identify, fz.battery, fz.command_move, fz.command_stop],
        toZigbee: [],
        endpoint: (device) => {
            return {left: 1, right: 2};
        },
        configure: async (device, coordinatorEndpoint) => {
            const ep1 = device.getEndpoint(1);
            await reporting.bind(ep1, coordinatorEndpoint, ["genGroups", "genOnOff", "genLevelCtrl"]);
            await reporting.batteryPercentageRemaining(ep1);
            const ep2 = device.getEndpoint(2);
            await reporting.bind(ep2, coordinatorEndpoint, ["genOnOff", "genLevelCtrl"]);
        },
        exposes: [
            e.action([
                "on_left",
                "off_left",
                "on_right",
                "off_right",
                "brightness_move_up_left",
                "brightness_move_up_right",
                "brightness_move_down_left",
                "brightness_move_down_right",
                "brightness_stop_left",
                "brightness_stop_right",
            ]),
            e.battery(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["Battery switch, 4 button"],
        model: "552-720X4",
        vendor: "Niko",
        description: "Battery switch with 4 buttons",
        meta: {multiEndpoint: true},
        fromZigbee: [fz.command_on, fz.command_off, fz.identify, fz.battery, fz.command_move, fz.command_stop],
        toZigbee: [],
        endpoint: (device) => {
            return {top_left: 1, bottom_left: 2, top_right: 3, bottom_right: 4};
        },
        configure: async (device, coordinatorEndpoint) => {
            const ep1 = device.getEndpoint(1);
            await reporting.bind(ep1, coordinatorEndpoint, ["genGroups", "genOnOff", "genLevelCtrl"]);
            await reporting.batteryPercentageRemaining(ep1);
            const ep2 = device.getEndpoint(2);
            await reporting.bind(ep2, coordinatorEndpoint, ["genOnOff", "genLevelCtrl"]);
            const ep3 = device.getEndpoint(3);
            await reporting.bind(ep3, coordinatorEndpoint, ["genOnOff", "genLevelCtrl"]);
            const ep4 = device.getEndpoint(4);
            await reporting.bind(ep4, coordinatorEndpoint, ["genOnOff", "genLevelCtrl"]);
        },
        exposes: [
            e.action([
                "on_top_left",
                "off_top_left",
                "on_bottom_left",
                "off_bottom_left",
                "on_top_right",
                "off_top_right",
                "on_bottom_right",
                "off_bottom_right",
                "brightness_move_up_top_left",
                "brightness_move_up_bottom_left",
                "brightness_move_up_top_right",
                "brightness_move_up_bottom_right",
                "brightness_move_down_top_left",
                "brightness_move_down_bottom_left",
                "brightness_move_down_top_right",
                "brightness_move_down_bottom_right",
                "brightness_stop_top_left",
                "brightness_stop_bottom_left",
                "brightness_stop_top_right",
                "brightness_stop_bottom_right",
            ]),
            e.battery(),
        ],
        ota: true,
    },
];
