import assert from "node:assert";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as globalStore from "../lib/store";
import type {DefinitionWithExtend, Fz, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const NS = "zhc:shinasystem";

const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    poll_summ_received_on_electrical_measurement: {
        // Additionally, this Produced_energy does not support reporting,
        // so we implemented a read operation within onEvent upon receiving a 'current' message.
        cluster: "haElectricalMeasurement",
        type: ["attributeReport"],
        options: [exposes.options.no_occupancy_since_false()],
        convert: (model, msg, publish, options, meta) => {
            assert(["PMM-300Z3", "PMM-300Z2"].includes(msg.device.modelID), "Poll summ received converter not supported for device");
            if (
                (msg.device.modelID === "PMM-300Z3" && msg.device.applicationVersion >= 9) ||
                (msg.device.modelID === "PMM-300Z2" && msg.device.applicationVersion >= 8)
            ) {
                if (msg.data.rmsCurrent) {
                    msg.endpoint
                        .read("seMetering", ["currentSummReceived"])
                        .catch((error) => logger.debug(`Failed to poll currentSummReceived of '${msg.device.ieeeAddr}' (${error})`, NS));
                }
            }
        },
    } satisfies Fz.Converter<"haElectricalMeasurement", undefined, ["attributeReport"]>,
    DMS300_IN: {
        cluster: "msOccupancySensing",
        type: ["attributeReport", "readResponse"],
        options: [exposes.options.no_occupancy_since_false()],
        convert: (model, msg, publish, options, meta) => {
            const occupancyIn = msg.data.occupancy;
            globalStore.putValue(msg.endpoint, "occupancy_in", occupancyIn);
            const occupancyOr = occupancyIn | globalStore.getValue(msg.endpoint, "occupancy_out", 0);
            const occupancyAnd = occupancyIn & globalStore.getValue(msg.endpoint, "occupancy_out", 0);
            return {
                occupancy_in: (occupancyIn & 1) > 0,
                occupancy_or: (occupancyOr & 1) > 0,
                occupancy_and: (occupancyAnd & 1) > 0,
            };
        },
    } satisfies Fz.Converter<"msOccupancySensing", undefined, ["attributeReport", "readResponse"]>,
    DMS300_OUT: {
        cluster: "ssIasZone",
        type: "commandStatusChangeNotification",
        convert: (model, msg, publish, options, meta) => {
            const occupancyOut = msg.data.zonestatus;
            globalStore.putValue(msg.endpoint, "occupancy_out", occupancyOut);
            const occupancyOr = occupancyOut | globalStore.getValue(msg.endpoint, "occupancy_in", 0);
            const occupancyAnd = occupancyOut & globalStore.getValue(msg.endpoint, "occupancy_in", 0);
            return {
                occupancy_out: (occupancyOut & 1) > 0,
                occupancy_or: (occupancyOr & 1) > 0,
                occupancy_and: (occupancyAnd & 1) > 0,
            };
        },
    } satisfies Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification">,
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    GCM300Z_valve_status: {
        cluster: "genOnOff",
        type: ["attributeReport", "readResponse"],
        convert: async (model, msg, publish, options, meta) => {
            if (msg.data.onOff !== undefined) {
                const endpoint = meta.device.getEndpoint(1);
                await endpoint.read("genOnOff", [0x9007]); // for update : close_remain_timeout
                return {gas_valve_state: msg.data.onOff === 1 ? "OPEN" : "CLOSE"};
            }
        },
    } satisfies Fz.Converter<"genOnOff", undefined, ["attributeReport", "readResponse"]>,
    ct_direction: {
        cluster: "seMetering",
        type: ["readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data[36865] !== undefined) {
                const value = msg.data[36865];
                const lookup = {0: "Auto", 1: "Manual(Forward)", 2: "Manual(Reverse)"};
                return {ct_direction: utils.getFromLookup(value, lookup)};
            }
        },
    } satisfies Fz.Converter<"seMetering", undefined, ["readResponse"]>,
    ias_zone_sensitivity: {
        cluster: "ssIasZone",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data && msg.data.currentZoneSensitivityLevel !== undefined && msg.endpoint) {
                const value = msg.data.currentZoneSensitivityLevel;
                return {
                    remote_control_permission: (value & 0x01) > 0,
                    force_smoke_alarm: (value & 0x02) > 0,
                };
            }
        },
    } satisfies Fz.Converter<"ssIasZone", undefined, ["attributeReport", "readResponse"]>,
    smoke_battery: {
        cluster: "genPowerCfg",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.batteryVoltage !== undefined) {
                return {smoke_battery: utils.batteryVoltageToPercentage(msg.data.batteryVoltage * 100, {min: 2300, max: 3100})};
            }
        },
    } satisfies Fz.Converter<"genPowerCfg", undefined, ["attributeReport", "readResponse"]>,
    hqm_system_mode: {
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.systemMode !== undefined) {
                const value = msg.data.systemMode;
                const lookup = {0: "off", 3: "cool", 4: "heat", 10: "away", 11: "schedule"};
                return {
                    system_mode: utils.getFromLookup(value, lookup),
                    preset: utils.getFromLookup(value, lookup),
                };
            }
        },
    } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>,
    hqm_local_temperature: {
        cluster: "msTemperatureMeasurement",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.measuredValue !== undefined) {
                const temperature = msg.data.measuredValue / 100.0;
                return {local_temperature: temperature};
            }
        },
    } satisfies Fz.Converter<"msTemperatureMeasurement", undefined, ["attributeReport", "readResponse"]>,
};

const tzLocal = {
    CSM300_SETUP: {
        key: ["rf_pairing_on", "counting_freeze", "tof_init", "led_state", "rf_state", "transaction", "fast_in", "fast_out"],
        convertSet: async (entity, key, value, meta) => {
            let payload = null;
            const endpoint = meta.device.endpoints.find((e) => e.supportsInputCluster("genAnalogInput"));
            switch (key) {
                case "rf_pairing_on":
                    payload = {presentValue: 81};
                    break;
                case "counting_freeze":
                    utils.assertString(value, key);
                    if (value.toLowerCase() === "on") {
                        payload = {presentValue: 82};
                        await endpoint.write("genAnalogInput", payload);
                        return {state: {counting_freeze: "ON"}};
                    }
                    if (value.toLowerCase() === "off") {
                        payload = {presentValue: 84};
                        await endpoint.write("genAnalogInput", payload);
                        return {state: {counting_freeze: "OFF"}};
                    }
                    break;
                case "tof_init":
                    payload = {presentValue: 83};
                    break;
                case "led_state":
                    if (value === "enable") {
                        payload = {presentValue: 86};
                        await endpoint.write("genAnalogInput", payload);
                        return {state: {led_state: "enable"}};
                    }
                    if (value === "disable") {
                        payload = {presentValue: 87};
                        await endpoint.write("genAnalogInput", payload);
                        return {state: {led_state: "disable"}};
                    }
                    break;
                case "rf_state":
                    if (value === "enable") {
                        payload = {presentValue: 88};
                        await endpoint.write("genAnalogInput", payload);
                        return {state: {rf_state: "enable"}};
                    }
                    if (value === "disable") {
                        payload = {presentValue: 89};
                        await endpoint.write("genAnalogInput", payload);
                        return {state: {rf_state: "disable"}};
                    }
                    break;
                case "transaction":
                    if (value === "0ms") {
                        payload = {presentValue: 90};
                        await endpoint.write("genAnalogInput", payload);
                        return {state: {transaction: "0ms"}};
                    }
                    if (value === "200ms") {
                        payload = {presentValue: 91};
                        await endpoint.write("genAnalogInput", payload);
                        return {state: {transaction: "200ms"}};
                    }
                    if (value === "400ms") {
                        payload = {presentValue: 92};
                        await endpoint.write("genAnalogInput", payload);
                        return {state: {transaction: "400ms"}};
                    }
                    if (value === "600ms") {
                        payload = {presentValue: 93};
                        await endpoint.write("genAnalogInput", payload);
                        return {state: {transaction: "600ms"}};
                    }
                    if (value === "800ms") {
                        payload = {presentValue: 94};
                        await endpoint.write("genAnalogInput", payload);
                        return {state: {transaction: "800ms"}};
                    }
                    if (value === "1,000ms") {
                        payload = {presentValue: 95};
                        await endpoint.write("genAnalogInput", payload);
                        return {state: {transaction: "1,000ms"}};
                    }
                    break;
                case "fast_in":
                    if (value === "enable") {
                        payload = {presentValue: 96};
                        await endpoint.write("genAnalogInput", payload);
                        return {state: {fast_in: "enable"}};
                    }
                    if (value === "disable") {
                        payload = {presentValue: 97};
                        await endpoint.write("genAnalogInput", payload);
                        return {state: {fast_in: "disable"}};
                    }
                    break;
                case "fast_out":
                    if (value === "enable") {
                        payload = {presentValue: 98};
                        await endpoint.write("genAnalogInput", payload);
                        return {state: {fast_out: "enable"}};
                    }
                    if (value === "disable") {
                        payload = {presentValue: 99};
                        await endpoint.write("genAnalogInput", payload);
                        return {state: {fast_out: "disable"}};
                    }
                    break;
            }
            await endpoint.write("genAnalogInput", payload);
        },
    } satisfies Tz.Converter,
    // biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
    GCM300Z_valve_status: {
        key: ["gas_valve_state"],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {CLOSE: "off"}; // open is not supported.
            const state = utils.getFromLookup(value, lookup);
            if (state !== "off") value = "CLOSE";
            else await entity.command("genOnOff", state, {}, utils.getOptions(meta.mapped, entity));
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("genOnOff", ["onOff"]);
        },
    } satisfies Tz.Converter,
    ct_direction: {
        key: ["ct_direction"],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {Auto: 0, "Manual(Forward)": 1, "Manual(Reverse)": 2};
            await entity.write("seMetering", {36865: {value: utils.getFromLookup(value, lookup), type: 0x20}});
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("seMetering", [36865]);
        },
    } satisfies Tz.Converter,
    force_smoke_alarm: {
        key: ["force_smoke_alarm"],
        convertSet: async (entity, key, value, meta) => {
            const endpoint = meta.device.getEndpoint(1);
            const remote_control_permission = Number(endpoint.getClusterAttributeValue("ssIasZone", "currentZoneSensitivityLevel"));
            if (remote_control_permission & 1) {
                // if remote control permission is true
                await entity.write("ssIasZone", {currentZoneSensitivityLevel: utils.getFromLookup(value, {OFF: 1, ON: 3})});
            } else {
                return {state: {[key]: "OFF"}};
            }
        },
    } satisfies Tz.Converter,
    hqm_system_mode: {
        key: ["system_mode", "preset"],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {off: 0, cool: 3, heat: 4, away: 10, schedule: 11};
            await entity.write("hvacThermostat", {systemMode: utils.getFromLookup(value, lookup)});
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("hvacThermostat", ["systemMode"]);
        },
    } satisfies Tz.Converter,
    hqm_local_temperature: {
        key: ["local_temperature"],
        convertGet: async (entity, key, meta) => {
            await entity.read("msTemperatureMeasurement", ["measuredValue"]);
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [
            {modelID: "CSM-300Z", applicationVersion: 1},
            {modelID: "CSM-300Z", applicationVersion: 2},
            {modelID: "CSM-300Z", applicationVersion: 3},
            {modelID: "CSM-300Z", applicationVersion: 4},
        ],
        model: "CSM-300ZB",
        vendor: "ShinaSystem",
        description: "SiHAS multipurpose sensor",
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        fromZigbee: [fz.battery, fz.sihas_people_cnt],
        toZigbee: [tz.sihas_set_people],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genPowerCfg", "genAnalogInput"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryVoltage(endpoint);
            const payload = reporting.payload<"genAnalogInput">("presentValue", 1, 600, 0);
            await endpoint.configureReporting("genAnalogInput", payload);
        },
        exposes: [
            e.battery(),
            e.battery_voltage(),
            e.enum("status", ea.STATE, ["idle", "in", "out"]).withDescription("Currently status"),
            e.numeric("people", ea.ALL).withValueMin(0).withValueMax(50).withDescription("People count"),
        ],
    },
    {
        zigbeeModel: ["CSM-300Z"],
        model: "CSM-300ZB_V2",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS multipurpose ToF sensor",
        meta: {battery: {voltageToPercentage: {min: 3200, max: 4100, vOffset: 1000}}},
        fromZigbee: [fz.battery, fz.sihas_people_cnt],
        toZigbee: [tz.sihas_set_people, tzLocal.CSM300_SETUP],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genPowerCfg", "genAnalogInput"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryVoltage(endpoint);
            const payload = reporting.payload<"genAnalogInput">("presentValue", 1, 600, 0);
            await endpoint.configureReporting("genAnalogInput", payload);
        },
        exposes: [
            e.battery(),
            e.battery_voltage(),
            e.enum("status", ea.STATE, ["idle", "in", "out"]).withDescription("Currently status"),
            e.numeric("people", ea.ALL).withValueMin(0).withValueMax(100).withDescription("People count"),
            e.enum("rf_pairing_on", ea.SET, ["run"]).withDescription("Run RF pairing mode"),
            e.binary("counting_freeze", ea.SET, "ON", "OFF").withDescription("Counting Freeze ON/OFF, not reporting people value when is ON"),
            e.enum("tof_init", ea.SET, ["initial"]).withDescription("ToF sensor initial"),
            e.binary("led_state", ea.SET, "enable", "disable").withDescription("Indicate LED enable/disable, default : enable"),
            e.binary("rf_state", ea.SET, "enable", "disable").withDescription("RF function enable/disable, default : disable"),
            e
                .enum("transaction", ea.SET, ["0ms", "200ms", "400ms", "600ms", "800ms", "1,000ms"])
                .withDescription("Transaction interval, default : 400ms"),
            e.binary("fast_in", ea.SET, "enable", "disable").withDescription("Fast process enable/disable when people 0 to 1. default : enable"),
            e.binary("fast_out", ea.SET, "enable", "disable").withDescription("Fast process enable/disable when people 1 to 0. default : enable"),
        ],
    },
    {
        zigbeeModel: ["USM-300Z"],
        model: "USM-300ZB",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS multipurpose sensor",
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        fromZigbee: [fz.battery, fz.temperature, fz.humidity, fz.occupancy],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genPowerCfg", "msTemperatureMeasurement", "msRelativeHumidity", "msOccupancySensing"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
            await reporting.occupancy(endpoint, {min: 1, max: 600, change: 1});
            await reporting.temperature(endpoint, {min: 20, max: 300, change: 10});
            await reporting.humidity(endpoint, {min: 20, max: 300, change: 40});
        },
        exposes: [e.battery(), e.battery_voltage(), e.temperature(), e.humidity(), e.occupancy()],
        extend: [m.illuminance({scale: (value) => value})],
    },
    {
        zigbeeModel: ["SBM300Z1"],
        model: "SBM300Z1",
        vendor: "ShinaSystem",
        description: "SiHAS IOT smart switch 1 gang",
        extend: [m.onOff({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ["SBM300Z2"],
        model: "SBM300Z2",
        vendor: "ShinaSystem",
        description: "SiHAS IOT smart switch 2 gang",
        extend: [m.deviceEndpoints({endpoints: {top: 1, bottom: 2}}), m.onOff({endpointNames: ["top", "bottom"], powerOnBehavior: false})],
    },
    {
        zigbeeModel: ["SBM300Z3"],
        model: "SBM300Z3",
        vendor: "ShinaSystem",
        description: "SiHAS IOT smart switch 3 gang",
        extend: [
            m.deviceEndpoints({endpoints: {top: 1, center: 2, bottom: 3}}),
            m.onOff({endpointNames: ["top", "center", "bottom"], powerOnBehavior: false}),
        ],
    },
    {
        zigbeeModel: ["SBM300Z4"],
        model: "SBM300Z4",
        vendor: "ShinaSystem",
        description: "SiHAS IOT smart switch 4 gang",
        extend: [
            m.deviceEndpoints({endpoints: {top_left: 1, bottom_left: 2, top_right: 3, bottom_right: 4}}),
            m.onOff({endpointNames: ["top_left", "bottom_left", "top_right", "bottom_right"], powerOnBehavior: false}),
        ],
    },
    {
        zigbeeModel: ["SBM300Z5"],
        model: "SBM300Z5",
        vendor: "ShinaSystem",
        description: "SiHAS IOT smart switch 5 gang",
        extend: [
            m.deviceEndpoints({endpoints: {top_left: 1, center_left: 2, bottom_left: 3, top_right: 4, bottom_right: 5}}),
            m.onOff({endpointNames: ["top_left", "center_left", "bottom_left", "top_right", "bottom_right"], powerOnBehavior: false}),
        ],
    },
    {
        zigbeeModel: ["SBM300Z6"],
        model: "SBM300Z6",
        vendor: "ShinaSystem",
        description: "SiHAS IOT smart switch 6 gang",
        extend: [
            m.deviceEndpoints({endpoints: {top_left: 1, center_left: 2, bottom_left: 3, top_right: 4, center_right: 5, bottom_right: 6}}),
            m.onOff({
                endpointNames: ["top_left", "center_left", "bottom_left", "top_right", "center_right", "bottom_right"],
                powerOnBehavior: false,
            }),
        ],
    },
    {
        zigbeeModel: ["BSM-300Z"],
        model: "BSM-300ZB",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS remote control",
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        fromZigbee: [fz.battery, fz.sihas_action],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genPowerCfg"]);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.battery(), e.battery_voltage(), e.action(["single", "double", "long"])],
    },
    {
        zigbeeModel: ["TSM-300Z"],
        model: "TSM-300ZB",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS temperature/humidity sensor",
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "msRelativeHumidity", "genPowerCfg"]);
            await reporting.temperature(endpoint, {min: 30, max: 300, change: 30});
            await reporting.humidity(endpoint, {min: 30, max: 3600, change: 50});
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
        },
        exposes: [e.temperature(), e.humidity(), e.battery(), e.battery_voltage()],
    },
    {
        zigbeeModel: ["DSM-300Z"],
        model: "DSM-300ZB",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS contact sensor",
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["ssIasZone", "genPowerCfg"]);
            await endpoint.read("ssIasZone", ["iasCieAddr", "zoneState", "zoneId"]);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
        },
        exposes: [e.contact(), e.battery(), e.battery_voltage()],
    },
    {
        zigbeeModel: ["MSM-300Z"],
        model: "MSM-300ZB",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS remote control 4 button",
        fromZigbee: [fz.sihas_action, fz.battery],
        toZigbee: [],
        exposes: [
            e.action([
                "1_single",
                "1_double",
                "1_long",
                "2_single",
                "2_double",
                "2_long",
                "3_single",
                "3_double",
                "3_long",
                "4_single",
                "4_double",
                "4_long",
            ]),
            e.battery(),
            e.battery_voltage(),
        ],
        meta: {battery: {voltageToPercentage: "3V_2100"}, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genPowerCfg"]);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        zigbeeModel: ["SBM300ZB1"],
        model: "SBM300ZB1",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS remote control",
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        fromZigbee: [fz.battery, fz.sihas_action],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genPowerCfg"]);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.battery(), e.battery_voltage(), e.action(["single", "double", "long"])],
    },
    {
        zigbeeModel: ["SBM300ZB2"],
        model: "SBM300ZB2",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS remote control 2 button",
        fromZigbee: [fz.sihas_action, fz.battery],
        toZigbee: [],
        exposes: [e.action(["1_single", "1_double", "1_long", "2_single", "2_double", "2_long"]), e.battery(), e.battery_voltage()],
        meta: {battery: {voltageToPercentage: "3V_2100"}, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genPowerCfg"]);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        zigbeeModel: ["SBM300ZB3"],
        model: "SBM300ZB3",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS remote control 3 button",
        fromZigbee: [fz.sihas_action, fz.battery],
        toZigbee: [],
        exposes: [
            e.action(["1_single", "1_double", "1_long", "2_single", "2_double", "2_long", "3_single", "3_double", "3_long"]),
            e.battery(),
            e.battery_voltage(),
        ],
        meta: {battery: {voltageToPercentage: "3V_2100"}, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genPowerCfg"]);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        zigbeeModel: ["SBM300ZB4"],
        model: "SBM300ZB4",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS remote control 4 button",
        fromZigbee: [fz.sihas_action, fz.battery],
        toZigbee: [],
        exposes: [
            e.action([
                "1_single",
                "1_double",
                "1_long",
                "2_single",
                "2_double",
                "2_long",
                "3_single",
                "3_double",
                "3_long",
                "4_single",
                "4_double",
                "4_long",
            ]),
            e.battery(),
            e.battery_voltage(),
        ],
        meta: {battery: {voltageToPercentage: "3V_2100"}, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genPowerCfg"]);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        zigbeeModel: ["SBM300ZC1"],
        model: "SBM300ZC1",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS remote control",
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        fromZigbee: [fz.battery, fz.sihas_action],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genPowerCfg"]);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.battery(), e.battery_voltage(), e.action(["single", "double", "long"])],
    },
    {
        zigbeeModel: ["SBM300ZC2"],
        model: "SBM300ZC2",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS remote control 2 button",
        fromZigbee: [fz.sihas_action, fz.battery],
        toZigbee: [],
        exposes: [e.action(["1_single", "1_double", "1_long", "2_single", "2_double", "2_long"]), e.battery(), e.battery_voltage()],
        meta: {battery: {voltageToPercentage: "3V_2100"}, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genPowerCfg"]);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        zigbeeModel: ["SBM300ZC3"],
        model: "SBM300ZC3",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS remote control 3 button",
        fromZigbee: [fz.sihas_action, fz.battery],
        toZigbee: [],
        exposes: [
            e.action(["1_single", "1_double", "1_long", "2_single", "2_double", "2_long", "3_single", "3_double", "3_long"]),
            e.battery(),
            e.battery_voltage(),
        ],
        meta: {battery: {voltageToPercentage: "3V_2100"}, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genPowerCfg"]);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        zigbeeModel: ["SBM300ZC4"],
        model: "SBM300ZC4",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS remote control 4 button",
        fromZigbee: [fz.sihas_action, fz.battery],
        toZigbee: [],
        exposes: [
            e.action([
                "1_single",
                "1_double",
                "1_long",
                "2_single",
                "2_double",
                "2_long",
                "3_single",
                "3_double",
                "3_long",
                "4_single",
                "4_double",
                "4_long",
            ]),
            e.battery(),
            e.battery_voltage(),
        ],
        meta: {battery: {voltageToPercentage: "3V_2100"}, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genPowerCfg"]);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        zigbeeModel: ["SQM300ZC4"],
        model: "SQM300ZC4",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS remote control 4 full button",
        fromZigbee: [fz.sihas_action],
        extend: [m.battery()],
        toZigbee: [],
        exposes: [
            e.action([
                "1_single",
                "1_double",
                "1_long",
                "2_single",
                "2_double",
                "2_long",
                "3_single",
                "3_double",
                "3_long",
                "4_single",
                "4_double",
                "4_long",
            ]),
        ],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["genOnOff"]);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ["genOnOff"]);
        },
    },
    {
        zigbeeModel: ["PMM-300Z1"],
        model: "PMM-300Z1",
        vendor: "ShinaSystem",
        description: "SiHAS energy monitor",
        extend: [m.electricityMeter({power: {cluster: "metering"}})],
    },
    {
        zigbeeModel: ["PMM-300Z2"],
        model: "PMM-300Z2",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS energy monitor",
        fromZigbee: [fzLocal.ct_direction, fzLocal.poll_summ_received_on_electrical_measurement],
        toZigbee: [tzLocal.ct_direction],
        extend: [m.electricityMeter({power: {cluster: "metering"}, acFrequency: {multiplier: 1, divisor: 10}, powerFactor: true}), m.temperature()],
        // Produced_energy and ct_direction is supported in version 8 and above.
        exposes: (device, options) => {
            const exposes = [];
            if (utils.isDummyDevice(device) || device.applicationVersion >= 8) {
                exposes.push(e.produced_energy().withAccess(ea.STATE_GET));
                exposes.push(
                    e
                        .enum("ct_direction", ea.ALL, ["Auto", "Manual(Forward)", "Manual(Reverse)"])
                        .withDescription(
                            "Auto (Default):" +
                                " All measured power and energy values are treated as positive regardless of CT installation direction," +
                                " And there is only energy consumption, not produced energy. " +
                                "And Manual additionally displays produced energy(e.g. when solar power is installed, set it manually)." +
                                " And it displays energy consumption and production according to the manual forward/reverse settings.",
                        ),
                );
            }
            return exposes;
        },
        // Ct direction(seMetering, 0x9001) is supported in version 8 and above.
        configure: async (device, coordinatorEndpoint) => {
            if (device?.applicationVersion >= 8) {
                const endpoint = device.getEndpoint(1);
                await endpoint.read("seMetering", [0x9001]);
            }
        },
    },
    {
        zigbeeModel: ["PMM-300Z3"],
        model: "PMM-300Z3",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS 3phase energy monitor",
        extend: [m.electricityMeter({power: {cluster: "metering"}, acFrequency: {multiplier: 1, divisor: 10}, powerFactor: true}), m.temperature()],
        fromZigbee: [fzLocal.poll_summ_received_on_electrical_measurement],
        // Produced_energy is supported in version 9 and above.
        exposes: (device, options) => {
            const exposes = [];
            if (utils.isDummyDevice(device) || device.applicationVersion >= 9) {
                exposes.push(e.produced_energy().withAccess(ea.STATE_GET));
            }
            return exposes;
        },
    },
    {
        zigbeeModel: ["DLM-300Z"],
        model: "DLM-300Z",
        vendor: "ShinaSystem",
        ota: true,
        description: "Sihas door lock",
        fromZigbee: [fz.lock, fz.battery, fz.lock_operation_event, fz.lock_programming_event, fz.lock_pin_code_response],
        toZigbee: [tz.lock, tz.pincode_lock],
        meta: {pinCodeCount: 4},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresDoorLock", "genPowerCfg"]);
            await reporting.lockState(endpoint, {min: 0, max: 3600, change: 0});
            await reporting.batteryPercentageRemaining(endpoint, {min: 600, max: 21600, change: 1});
            await reporting.doorState(endpoint);
        },
        exposes: [
            e.battery(),
            e.lock(),
            e.enum("door_state", ea.STATE, ["open", "closed"]).withDescription("Door status"),
            e.lock_action(),
            e.lock_action_source_name(),
            e.lock_action_user(),
            e
                .composite("pin_code", "pin_code", ea.ALL)
                .withFeature(e.numeric("user", ea.SET).withDescription("User ID can only number 1"))
                .withFeature(e.numeric("pin_code", ea.SET).withDescription("Pincode to set, set pincode(4 digit) to null to clear")),
        ],
    },
    {
        zigbeeModel: ["DMS-300Z"],
        model: "DMS-300ZB",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS dual motion sensor",
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        fromZigbee: [fz.battery, fzLocal.DMS300_OUT, fzLocal.DMS300_IN, fz.occupancy_timeout],
        toZigbee: [tz.occupancy_timeout],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genPowerCfg", "msOccupancySensing", "ssIasZone"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
            await reporting.occupancy(endpoint, {min: 1, max: 600, change: 1});
            const payload = [
                {
                    attribute: "zoneStatus" as const,
                    minimumReportInterval: 1,
                    maximumReportInterval: 600,
                    reportableChange: 1,
                },
            ];
            await endpoint.configureReporting("ssIasZone", payload);
            await endpoint.read("msOccupancySensing", ["pirOToUDelay"]);
        },
        exposes: [
            e.battery(),
            e.battery_voltage(),
            e.binary("occupancy_in", ea.STATE, true, false).withDescription('Indicates whether "IN" Sensor of the device detected occupancy'),
            e.binary("occupancy_out", ea.STATE, true, false).withDescription('Indicates whether "OUT" Sensor of the device detected occupancy'),
            e.binary("occupancy_or", ea.STATE, true, false).withDescription('Indicates whether "IN or OUT" Sensor of the device detected occupancy'),
            e
                .binary("occupancy_and", ea.STATE, true, false)
                .withDescription('Indicates whether "IN and OUT" Sensor of the device detected occupancy'),
            e.numeric("occupancy_timeout", ea.ALL).withUnit("s").withValueMin(0).withValueMax(3600),
        ],
    },
    {
        zigbeeModel: ["ISM300Z3"],
        model: "ISM300Z3",
        vendor: "ShinaSystem",
        description: "SiHAS IOT smart inner switch 3 gang",
        extend: [
            m.onOff({endpointNames: ["l1", "l2", "l3"], powerOnBehavior: false}),
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3}}),
            m.enumLookup({
                name: "operation_mode",
                lookup: {auto: 0, push: 1, latch: 2},
                cluster: "genOnOff",
                attribute: {ID: 0x9000, type: 0x20},
                description: 'switch type: "auto" - toggle by S/W, "push" - for momentary S/W, "latch" - sync S/W.',
                endpointName: "l1",
            }),
            m.enumLookup({
                name: "rf_pairing",
                lookup: {none: 0, l1: 1, l2: 2, l3: 3},
                cluster: "genOnOff",
                attribute: {ID: 0x9001, type: 0x20},
                description: "Enable RF pairing mode each button l1, l2, l3. It is supported only in repeat mode.",
                endpointName: "l1",
            }),
            m.enumLookup({
                name: "switch_3way_mode",
                lookup: {disable: 0, enable: 1},
                cluster: "genOnOff",
                attribute: {ID: 0x900f, type: 0x20},
                description:
                    "If the 3-way switch setting is enabled, the 1st and 3rd switches are used. At this time, connect the remote switch to SW3.",
                endpointName: "l1",
            }),
        ],
    },
    {
        zigbeeModel: ["GCM-300Z"],
        model: "GCM-300Z",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS gas valve",
        fromZigbee: [fzLocal.GCM300Z_valve_status, fz.battery],
        toZigbee: [tzLocal.GCM300Z_valve_status],
        exposes: [e.binary("gas_valve_state", ea.ALL, "OPEN", "CLOSE").withDescription("Valve state if open or closed"), e.battery()],
        extend: [
            m.numeric({
                name: "close_timeout",
                cluster: "genOnOff",
                attribute: {ID: 0x9006, type: 0x21},
                description: "Set the default closing time when the gas valve is open.",
                valueMin: 1,
                valueMax: 540,
                valueStep: 1,
                unit: "min",
                scale: 60,
                reporting: {min: 0, max: "1_HOUR", change: 1},
            }),
            m.numeric({
                name: "close_remain_timeout",
                cluster: "genOnOff",
                attribute: {ID: 0x9007, type: 0x21},
                description: "Set the time or remaining time until the gas valve closes.",
                valueMin: 0,
                valueMax: 540,
                valueStep: 1,
                unit: "min",
                scale: 60,
                reporting: {min: 0, max: "30_MINUTES", change: 1},
            }),
            m.enumLookup({
                name: "volume",
                lookup: {voice: 1, high: 2, low: 2},
                cluster: "genOnOff",
                attribute: {ID: 0x9008, type: 0x20},
                description: "Values observed are `1` (voice), `2` (high) or `3` (low).",
                reporting: {min: 0, max: "1_HOUR", change: 1},
            }),
            m.enumLookup({
                name: "overheat_mode",
                lookup: {normal: 0, overheat: 1},
                cluster: "genOnOff",
                attribute: {ID: 0x9005, type: 0x20},
                description: "Temperature overheating condition.",
                reporting: {min: 0, max: "1_HOUR", change: 1},
                access: "STATE_GET",
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "genOnOff"]);
            await reporting.onOff(endpoint);
            await reporting.batteryPercentageRemaining(endpoint, {min: 3600, max: 7200});
            await utils.sleep(300);
            await endpoint.read("genOnOff", ["onOff"]);
        },
    },
    {
        zigbeeModel: ["DIO-300Z"],
        model: "DIO-300Z",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS DI/DO Module",
        fromZigbee: [fz.sihas_action],
        toZigbee: [],
        exposes: [e.action(["single", "double", "long"])],
        extend: [
            m.enumLookup({
                name: "di_status",
                lookup: {Close: 0, Open: 1},
                cluster: "genOnOff",
                attribute: {ID: 0x9009, type: 0x20},
                description: "Indicates whether the DI(Digital Input) is open or closed",
                reporting: {min: 0, max: "1_HOUR", change: 1},
                access: "STATE_GET",
            }),
            m.onOff({powerOnBehavior: false}),
            m.enumLookup({
                name: "di_type",
                lookup: {Button: 0, Door: 1},
                cluster: "genOnOff",
                attribute: {ID: 0x900a, type: 0x20},
                description: "Set the DI(Digital Input) type to either a button or door sensor(latch) type",
                reporting: {min: 0, max: "1_HOUR", change: 1},
            }),
            m.enumLookup({
                name: "do_type",
                lookup: {Pulse: 0, Latch: 1},
                cluster: "genOnOff",
                attribute: {ID: 0x900b, type: 0x20},
                description: "Set the DO(Digital Output) type to either a pulse or latch type",
                reporting: {min: 0, max: "1_HOUR", change: 1},
            }),
            m.enumLookup({
                name: "di_do_link",
                lookup: {Off: 0, On: 1},
                cluster: "genOnOff",
                attribute: {ID: 0x900c, type: 0x20},
                description: "Configure DO linkage according to DI status. When set to ON, DO is output according to the DI input.",
                reporting: {min: 0, max: "1_HOUR", change: 1},
            }),
            m.numeric({
                name: "do_pulse_time",
                cluster: "genOnOff",
                attribute: {ID: 0x900d, type: 0x21},
                description: "When the DO output is set to pulse type, you can set the DO pulse time. The unit is milliseconds.",
                valueMin: 100,
                valueMax: 3000,
                valueStep: 100,
                unit: "ms",
                reporting: {min: 0, max: "1_HOUR", change: 1},
            }),
        ],
    },
    {
        zigbeeModel: ["TCM-300Z"],
        model: "TCM-300Z",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS Zigbee thermostat",
        fromZigbee: [fz.thermostat, fz.hvac_user_interface],
        toZigbee: [
            tz.thermostat_system_mode,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_local_temperature,
            tz.thermostat_keypad_lockout,
        ],
        exposes: [
            e
                .climate()
                .withSystemMode(["off", "heat", "cool"])
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 10, 70, 0.5)
                .withSetpoint("occupied_cooling_setpoint", 10, 70, 0.5),
            e
                .enum("keypad_lockout", ea.ALL, ["unlock", "lock1", "lock2", "lock3"])
                .withDescription(
                    "Enables or disables the device’s buttons.  " +
                        "Lock1 locks the temperature setting and the cooling/heating mode button input.  " +
                        "Lock2 locks the power button input.  " +
                        "Lock3 locks all button inputs.",
                ),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat"]);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacUserInterfaceCfg"]);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint);
            await reporting.thermostatTemperature(endpoint, {min: 10, max: 600, change: 0.1});
            await reporting.thermostatSystemMode(endpoint, {min: 0, max: 600});
            await reporting.thermostatKeypadLockMode(endpoint, {min: 0, max: 600});
            await endpoint.read("hvacThermostat", ["systemMode", "occupiedHeatingSetpoint", "occupiedCoolingSetpoint", "localTemp"]);
            await endpoint.read("hvacUserInterfaceCfg", ["keypadLockout"]);
        },
    },
    {
        zigbeeModel: ["SQM300Z1"],
        model: "SQM300Z1",
        vendor: "ShinaSystem",
        description: "SiHAS big button switch 1 gang",
        extend: [m.onOff({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ["SQM300Z2"],
        model: "SQM300Z2",
        vendor: "ShinaSystem",
        description: "SiHAS big button switch 2 gang",
        extend: [m.deviceEndpoints({endpoints: {top: 1, bottom: 2}}), m.onOff({endpointNames: ["top", "bottom"], powerOnBehavior: false})],
    },
    {
        zigbeeModel: ["SQM300Z3"],
        model: "SQM300Z3",
        vendor: "ShinaSystem",
        description: "SiHAS big button switch 3 gang",
        extend: [
            m.deviceEndpoints({endpoints: {top: 1, center: 2, bottom: 3}}),
            m.onOff({endpointNames: ["top", "center", "bottom"], powerOnBehavior: false}),
        ],
    },
    {
        zigbeeModel: ["SQM300Z4"],
        model: "SQM300Z4",
        vendor: "ShinaSystem",
        description: "SiHAS big button switch 4 gang",
        extend: [
            m.deviceEndpoints({endpoints: {top_left: 1, bottom_left: 2, top_right: 3, bottom_right: 4}}),
            m.onOff({endpointNames: ["top_left", "bottom_left", "top_right", "bottom_right"], powerOnBehavior: false}),
        ],
    },
    {
        zigbeeModel: ["SQM300Z6"],
        model: "SQM300Z6",
        vendor: "ShinaSystem",
        description: "SiHAS big button switch 6 gang",
        extend: [
            m.deviceEndpoints({endpoints: {top_left: 1, center_left: 2, bottom_left: 3, top_right: 4, center_right: 5, bottom_right: 6}}),
            m.onOff({
                endpointNames: ["top_left", "center_left", "bottom_left", "top_right", "center_right", "bottom_right"],
                powerOnBehavior: false,
            }),
        ],
    },
    {
        zigbeeModel: ["FAM-300Z"],
        model: "FAM-300Z",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS Smoke detector",
        fromZigbee: [fzLocal.ias_zone_sensitivity, fzLocal.smoke_battery],
        toZigbee: [tzLocal.force_smoke_alarm],
        extend: [
            m.iasZoneAlarm({
                zoneType: "smoke",
                zoneAttributes: ["alarm_1"],
                zoneStatusReporting: true,
            }),
            m.battery(),
        ],
        exposes: [
            e
                .binary("remote_control_permission", ea.STATE, "True", "False")
                .withDescription("Indicate whether remote control is permitted or denied."),
            e
                .binary("force_smoke_alarm", ea.STATE_SET, "ON", "OFF")
                .withDescription(
                    "Forcibly activating/deactivating smoke alarms. This command is only available " + "when Remote control permission is True.",
                ),
            e
                .numeric("smoke_battery", ea.STATE)
                .withUnit("%")
                .withValueMin(0)
                .withValueMax(100)
                .withDescription(
                    "Remaining battery in % for smoke sensor, For reference, two batteries are used. " +
                        "One is for Smoke sensor, the other is for Zigbee.",
                )
                .withCategory("diagnostic"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genPowerCfg", "ssIasZone"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
            const payload = reporting.payload<"ssIasZone">("currentZoneSensitivityLevel", 0, 7200, 1);
            await endpoint.configureReporting("ssIasZone", payload);
            await endpoint.read("ssIasZone", ["currentZoneSensitivityLevel"]);
        },
    },
    {
        zigbeeModel: ["TQM-300Z"],
        model: "TQM-300ZB",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS Round Temperature/Humidity Sensor",
        extend: [m.temperature(), m.humidity(), m.battery()],
    },
    {
        zigbeeModel: ["WCM-300Z"],
        model: "WCM-300Z",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS 4-gang wall outlet",
        extend: [
            // Endpoint 1 is not registered as it represents the entire device.
            m.deviceEndpoints({endpoints: {p1: 2, p2: 3, p3: 4, p4: 5}}),
            m.onOff({endpointNames: ["p1", "p2", "p3", "p4"], powerOnBehavior: false}),
            m.electricityMeter({endpointNames: ["p1", "p2", "p3", "p4"], cluster: "metering"}),
            m.binary({
                name: "button_lock_mode",
                valueOn: ["lock", 1],
                valueOff: ["unlock", 0],
                cluster: "genOnOff",
                attribute: {ID: 0x900e, type: 0x20},
                description: "Enables/disables the physical input lock for Button 1.",
                endpointName: "p1",
            }),
            m.binary({
                name: "button_lock_mode",
                valueOn: ["lock", 1],
                valueOff: ["unlock", 0],
                cluster: "genOnOff",
                attribute: {ID: 0x900e, type: 0x20},
                description: "Enables/disables the physical input lock for Button 2.",
                endpointName: "p2",
            }),
            m.binary({
                name: "button_lock_mode",
                valueOn: ["lock", 1],
                valueOff: ["unlock", 0],
                cluster: "genOnOff",
                attribute: {ID: 0x900e, type: 0x20},
                description: "Enables/disables the physical input lock for Button 3.",
                endpointName: "p3",
            }),
            m.binary({
                name: "button_lock_mode",
                valueOn: ["lock", 1],
                valueOff: ["unlock", 0],
                cluster: "genOnOff",
                attribute: {ID: 0x900e, type: 0x20},
                description: "Enables/disables the physical input lock for Button 4.",
                endpointName: "p4",
            }),
        ],
    },
    {
        zigbeeModel: ["OSM-300Z"],
        model: "OSM-300ZB",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS Motion Sensor",
        extend: [
            m.occupancy(),
            m.battery({
                voltageToPercentage: {min: 2100, max: 3000},
                voltage: true,
                voltageReporting: true,
                percentageReporting: false,
            }),
        ],
    },
    {
        zigbeeModel: ["HQM-300Z"],
        model: "HQM-300Z",
        vendor: "ShinaSystem",
        ota: true,
        description: "SiHAS Zigbee Wireless Round Thermostat",
        fromZigbee: [fz.thermostat, fzLocal.hqm_system_mode, fzLocal.hqm_local_temperature],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint,
            tzLocal.hqm_system_mode,
            tzLocal.hqm_local_temperature,
        ],
        exposes: [
            e
                .climate()
                .withSystemMode(["off", "cool", "heat"])
                .withPreset(["off", "cool", "heat", "away", "schedule"])
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 5, 35, 0.5)
                .withSetpoint("occupied_cooling_setpoint", 5, 35, 0.5),
        ],
        extend: [
            m.binary({
                name: "valve_status",
                valueOn: ["open", 1],
                valueOff: ["close", 0],
                cluster: "hvacThermostat",
                attribute: {ID: 0x9003, type: 0x20},
                description: "Valve status",
                access: "STATE_GET",
                reporting: {min: 0, max: "1_HOUR", change: 1},
            }),
            m.numeric({
                name: "schedule_time",
                cluster: "hvacThermostat",
                attribute: {ID: 0x9002, type: 0x20},
                description: "Operating Time (minutes per hour). Only applicable in schedule mode.",
                valueMin: 10,
                valueMax: 50,
                valueStep: 10,
                unit: "min",
                reporting: {min: 0, max: "1_HOUR", change: 1},
            }),
            m.humidity(),
            m.battery(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["hvacThermostat", "msTemperatureMeasurement"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint, {min: 0, max: 600});
            await reporting.temperature(endpoint, {min: 5, max: 300, change: 10});
            await endpoint.read("hvacThermostat", ["occupiedHeatingSetpoint", "occupiedCoolingSetpoint", "systemMode"]);
        },
    },
];
