import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import {type DevelcoGenBasic, develcoModernExtend} from "../lib/develco";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValue, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const NS = "zhc:develco";
// develco specific cosntants
const manufacturerOptions = {manufacturerCode: Zcl.ManufacturerCode.DEVELCO};

/* MOSZB-1xx - ledControl - bitmap8 - r/w
 * 0x00 Disable LED when movement is detected.
 * 0x01 Enables periodic fault flashes. These flashes are used to indicate e.g. low battery level.
 * 0x02 Enables green application defined LED. This is e.g. used to indicate motion detection.
 * Default value 0xFF ( seems to be fault + motion)
 */
const develcoLedControlMap = {
    0: "off",
    1: "fault_only",
    2: "motion_only",
    255: "both",
};

// develco specific converters
const develco = {
    fz: {
        force_divisor_1000: {
            cluster: "seMetering",
            type: ["attributeReport"],
            convert: (model, msg, publish, options, meta) => {
                if (msg.data.divisor != null) {
                    // Device sends wrong divisor (512) while it should be fixed to 1000
                    // https://github.com/Koenkk/zigbee-herdsman-converters/issues/3066
                    msg.endpoint.saveClusterAttributeKeyValue("seMetering", {divisor: 1000, multiplier: 1});
                }
            },
        } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport"]>,
        // Some Develco devices report strange values sometimes
        // https://github.com/Koenkk/zigbee2mqtt/issues/13329
        electrical_measurement: {
            ...fz.electrical_measurement,
            convert: (model, msg, publish, options, meta) => {
                if (!Number.isNaN(msg.data.rmsVoltage) && !Number.isNaN(msg.data.rmsCurrent) && !Number.isNaN(msg.data.activePower)) {
                    return fz.electrical_measurement.convert(model, msg, publish, options, meta);
                }
            },
        } satisfies Fz.Converter<"haElectricalMeasurement", undefined, ["attributeReport", "readResponse"]>,
        total_power: {
            cluster: "haElectricalMeasurement",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValue = {};
                if (msg.data.totalActivePower !== undefined && !Number.isNaN(msg.data.totalActivePower)) {
                    result[utils.postfixWithEndpointName("power", msg, model, meta)] = msg.data.totalActivePower;
                }
                if (msg.data.totalReactivePower !== undefined && !Number.isNaN(msg.data.totalReactivePower)) {
                    result[utils.postfixWithEndpointName("power_reactive", msg, model, meta)] = msg.data.totalReactivePower;
                }
                return result;
            },
        } satisfies Fz.Converter<"haElectricalMeasurement", undefined, ["attributeReport", "readResponse"]>,
        metering: {
            ...fz.metering,
            convert: (model, msg, publish, options, meta) => {
                if (!Number.isNaN(msg.data.instantaneousDemand) && msg.data.currentSummDelivered !== 0) {
                    return fz.metering.convert(model, msg, publish, options, meta);
                }
            },
        } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,
        pulse_configuration: {
            cluster: "seMetering",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValue = {};
                if (msg.data.develcoPulseConfiguration !== undefined) {
                    result[utils.postfixWithEndpointName("pulse_configuration", msg, model, meta)] = msg.data.develcoPulseConfiguration;
                }

                return result;
            },
        } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,
        interface_mode: {
            cluster: "seMetering",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValue = {};
                if (msg.data.develcoInterfaceMode !== undefined) {
                    result[utils.postfixWithEndpointName("interface_mode", msg, model, meta)] =
                        constants.develcoInterfaceMode[msg.data.develcoInterfaceMode] !== undefined
                            ? constants.develcoInterfaceMode[msg.data.develcoInterfaceMode]
                            : msg.data.develcoInterfaceMode;
                }
                if (msg.data.status !== undefined) {
                    result.battery_low = (msg.data.status & 2) > 0;
                    result.check_meter = (msg.data.status & 1) > 0;
                }

                return result;
            },
        } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,
        fault_status: {
            cluster: "genBinaryInput",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValue = {};
                if (msg.data.reliability !== undefined) {
                    const lookup = {0: "no_fault_detected", 7: "unreliable_other", 8: "process_error"};
                    result.reliability = utils.getFromLookup(msg.data.reliability, lookup);
                }
                if (msg.data.statusFlags !== undefined) {
                    result.fault = msg.data.statusFlags === 1;
                }
                return result;
            },
        } satisfies Fz.Converter<"genBinaryInput", undefined, ["attributeReport", "readResponse"]>,
        led_control: {
            cluster: "genBasic",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const state: KeyValue = {};

                if (msg.data.develcoLedControl !== undefined) {
                    state.led_control = utils.getFromLookup(msg.data.develcoLedControl, develcoLedControlMap);
                }

                return state;
            },
        } satisfies Fz.Converter<"genBasic", DevelcoGenBasic, ["attributeReport", "readResponse"]>,
        ias_occupancy_timeout: {
            cluster: "ssIasZone",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const state: KeyValue = {};

                if (msg.data.develcoAlarmOffDelay !== undefined) {
                    state.occupancy_timeout = msg.data.develcoAlarmOffDelay;
                }

                return state;
            },
        } satisfies Fz.Converter<"ssIasZone", undefined, ["attributeReport", "readResponse"]>,
        input: {
            cluster: "genBinaryInput",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValue = {};
                if (msg.data.presentValue !== undefined) {
                    const value = msg.data.presentValue;
                    result[utils.postfixWithEndpointName("input", msg, model, meta)] = value === 1;
                }
                return result;
            },
        } satisfies Fz.Converter<"genBinaryInput", undefined, ["attributeReport", "readResponse"]>,
    },
    tz: {
        pulse_configuration: {
            key: ["pulse_configuration"],
            convertSet: async (entity, key, value, meta) => {
                await entity.write("seMetering", {develcoPulseConfiguration: value as number}, manufacturerOptions);
                return {state: {pulse_configuration: value}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read("seMetering", ["develcoPulseConfiguration"], manufacturerOptions);
            },
        } satisfies Tz.Converter,
        interface_mode: {
            key: ["interface_mode"],
            convertSet: async (entity, key, value, meta) => {
                const payload = {develcoInterfaceMode: utils.getKey(constants.develcoInterfaceMode, value, undefined, Number)};
                await entity.write("seMetering", payload, manufacturerOptions);
                return {state: {interface_mode: value}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read("seMetering", ["develcoInterfaceMode"], manufacturerOptions);
            },
        } satisfies Tz.Converter,
        current_summation: {
            key: ["current_summation"],
            convertSet: async (entity, key, value, meta) => {
                await entity.write("seMetering", {develcoCurrentSummation: value as number}, manufacturerOptions);
                return {state: {current_summation: value}};
            },
        } satisfies Tz.Converter,
        led_control: {
            key: ["led_control"],
            convertSet: async (entity, key, value, meta) => {
                const ledControl = utils.getKey(develcoLedControlMap, value, value as number, Number);
                await entity.write<"genBasic", DevelcoGenBasic>("genBasic", {develcoLedControl: ledControl}, manufacturerOptions);
                return {state: {led_control: value}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read<"genBasic", DevelcoGenBasic>("genBasic", ["develcoLedControl"], manufacturerOptions);
            },
        } satisfies Tz.Converter,
        ias_occupancy_timeout: {
            key: ["occupancy_timeout"],
            convertSet: async (entity, key, value, meta) => {
                let timeoutValue = utils.toNumber(value, "occupancy_timeout");
                if (timeoutValue < 5) {
                    logger.warning(`Minimum occupancy_timeout is 5, using 5 instead of ${timeoutValue}!`, NS);
                    timeoutValue = 5;
                }
                await entity.write("ssIasZone", {develcoAlarmOffDelay: timeoutValue}, manufacturerOptions);
                return {state: {occupancy_timeout: timeoutValue}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read("ssIasZone", ["develcoAlarmOffDelay"], manufacturerOptions);
            },
        } satisfies Tz.Converter,
        input: {
            key: ["input"],
            convertGet: async (entity, key, meta) => {
                await entity.read("genBinaryInput", ["presentValue"]);
            },
        } satisfies Tz.Converter,
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SPLZB-131"],
        model: "SPLZB-131",
        vendor: "Develco",
        description: "Power plug",
        toZigbee: [tz.on_off],
        ota: true,
        extend: [
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            develcoModernExtend.deviceTemperature(),
            m.electricityMeter({acFrequency: true, fzMetering: develco.fz.metering, fzElectricalMeasurement: develco.fz.electrical_measurement}),
            m.onOff({powerOnBehavior: false}),
        ],
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ["SPLZB-132"],
        model: "SPLZB-132",
        vendor: "Develco",
        description: "Power plug",
        ota: true,
        extend: [
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            develcoModernExtend.deviceTemperature(),
            m.electricityMeter({acFrequency: true, fzMetering: develco.fz.metering, fzElectricalMeasurement: develco.fz.electrical_measurement}),
            m.onOff(),
        ],
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ["SPLZB-134"],
        model: "SPLZB-134",
        vendor: "Develco",
        description: "Power plug (type G)",
        ota: true,
        extend: [
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            develcoModernExtend.deviceTemperature(),
            m.electricityMeter({acFrequency: true, fzMetering: develco.fz.metering, fzElectricalMeasurement: develco.fz.electrical_measurement}),
            m.onOff(),
        ],
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ["SPLZB-137"],
        model: "SPLZB-137",
        vendor: "Develco",
        description: "Power plug",
        fromZigbee: [fz.on_off, develco.fz.electrical_measurement, develco.fz.metering],
        toZigbee: [tz.on_off],
        ota: true,
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.ac_frequency()],
        extend: [develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(), develcoModernExtend.readGenBasicPrimaryVersions()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint, true);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
            await reporting.acFrequency(endpoint);
        },
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ["SMRZB-143"],
        model: "SMRZB-143",
        vendor: "Develco",
        description: "Smart cable",
        extend: [
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            develcoModernExtend.deviceTemperature(),
            m.electricityMeter({acFrequency: true, fzMetering: develco.fz.metering, fzElectricalMeasurement: develco.fz.electrical_measurement}),
            m.onOff(),
        ],
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ["EMIZB-132"],
        model: "EMIZB-132",
        vendor: "Develco",
        description: "Wattle AMS HAN power-meter sensor",
        fromZigbee: [develco.fz.metering, develco.fz.electrical_measurement, develco.fz.total_power, develco.fz.force_divisor_1000],
        toZigbee: [tz.EMIZB_132_mode],
        ota: true,
        extend: [develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(), develcoModernExtend.readGenBasicPrimaryVersions()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ["haElectricalMeasurement", "seMetering"]);

            try {
                // Some don't support these attributes
                // https://github.com/Koenkk/zigbee-herdsman-converters/issues/974#issuecomment-621465038
                await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
                await reporting.rmsVoltage(endpoint);
                await reporting.rmsCurrent(endpoint);
                await endpoint.configureReporting(
                    "haElectricalMeasurement",
                    [{attribute: "totalActivePower", minimumReportInterval: 5, maximumReportInterval: 3600, reportableChange: 1}],
                    manufacturerOptions,
                );
                await endpoint.configureReporting(
                    "haElectricalMeasurement",
                    [{attribute: "totalReactivePower", minimumReportInterval: 5, maximumReportInterval: 3600, reportableChange: 1}],
                    manufacturerOptions,
                );
            } catch {
                /* empty */
            }

            await reporting.readMeteringMultiplierDivisor(endpoint);
            endpoint.saveClusterAttributeKeyValue("seMetering", {divisor: 1000, multiplier: 1});
            await reporting.currentSummDelivered(endpoint);
            await reporting.currentSummReceived(endpoint);
        },
        exposes: [
            e.numeric("power", ea.STATE).withUnit("W").withDescription("Total active power"),
            e.numeric("power_reactive", ea.STATE).withUnit("VAr").withDescription("Total reactive power"),
            e.energy(),
            e.current(),
            e.voltage(),
            e.current_phase_b(),
            e.voltage_phase_b(),
            e.current_phase_c(),
            e.voltage_phase_c(),
        ],
    },
    {
        zigbeeModel: ["SMSZB-120", "GWA1512_SmokeSensor"],
        model: "SMSZB-120",
        vendor: "Develco",
        description: "Smoke detector with siren",
        whiteLabel: [
            {vendor: "Frient", model: "94430", description: "Smart Intelligent Smoke Alarm"},
            {vendor: "Cavius", model: "2103", description: "RF SMOKE ALARM, 5 YEAR 65MM"},
        ],
        fromZigbee: [fz.ias_smoke_alarm_1_develco, fz.ias_enroll, fz.ias_wd, develco.fz.fault_status],
        toZigbee: [tz.warning, tz.ias_max_duration, tz.warning_simple],
        ota: true,
        extend: [
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            develcoModernExtend.temperature(), // TODO: ep 38
            m.battery({
                voltageToPercentage: {min: 2500, max: 3000},
                percentage: true,
                voltage: true,
                lowStatus: false,
                voltageReporting: true,
                percentageReporting: false,
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(35);

            // Device supports only 4 binds (otherwise you get TABLE_FULL error)
            // https://github.com/Koenkk/zigbee2mqtt/issues/23684
            if (endpoint.binds.some((b) => b.cluster.name === "genPollCtrl")) {
                await endpoint.unbind("genPollCtrl", coordinatorEndpoint);
            }

            await reporting.bind(endpoint, coordinatorEndpoint, ["ssIasZone", "ssIasWd", "genBinaryInput"]);
            await endpoint.read("ssIasZone", ["iasCieAddr", "zoneState", "zoneId"]);
            await endpoint.read("genBinaryInput", ["reliability", "statusFlags"]);
            await endpoint.read("ssIasWd", ["maxDuration"]);
        },
        endpoint: (device) => {
            return {default: 35};
        },
        exposes: [
            e.smoke(),
            e.battery_low(),
            e.test(),
            e.numeric("max_duration", ea.ALL).withUnit("s").withValueMin(0).withValueMax(600).withDescription("Duration of Siren"),
            e.binary("alarm", ea.SET, "START", "OFF").withDescription("Manual Start of Siren"),
            e
                .enum("reliability", ea.STATE, ["no_fault_detected", "unreliable_other", "process_error"])
                .withDescription("Indicates reason if any fault"),
            e.binary("fault", ea.STATE, true, false).withDescription("Indicates whether the device are in fault state"),
        ],
    },
    {
        zigbeeModel: ["SPLZB-141"],
        model: "SPLZB-141",
        vendor: "Develco",
        description: "Power plug",
        fromZigbee: [fz.on_off, develco.fz.electrical_measurement, develco.fz.metering],
        toZigbee: [tz.on_off],
        ota: true,
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.ac_frequency()],
        extend: [develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(), develcoModernExtend.readGenBasicPrimaryVersions()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
            await reporting.acFrequency(endpoint);
        },
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ["HESZB-120"],
        model: "HESZB-120",
        vendor: "Develco",
        description: "Fire detector with siren",
        whiteLabel: [{vendor: "Frient", model: "94431", description: "Smart Intelligent Heat Alarm"}],
        fromZigbee: [fz.ias_smoke_alarm_1_develco, fz.ias_enroll, fz.ias_wd, develco.fz.fault_status],
        toZigbee: [tz.warning, tz.ias_max_duration, tz.warning_simple],
        ota: true,
        extend: [
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            develcoModernExtend.temperature(), // TODO: ep 38
            m.battery({
                voltageToPercentage: {min: 2500, max: 3000},
                percentage: true,
                voltage: true,
                lowStatus: false,
                voltageReporting: true,
                percentageReporting: false,
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(35);

            // Device supports only 4 binds (otherwise you get TABLE_FULL error)
            // https://github.com/Koenkk/zigbee2mqtt/issues/23684
            if (endpoint.binds.some((b) => b.cluster.name === "genPollCtrl")) {
                await endpoint.unbind("genPollCtrl", coordinatorEndpoint);
            }

            await reporting.bind(endpoint, coordinatorEndpoint, ["ssIasZone", "ssIasWd", "genBinaryInput"]);

            await endpoint.read("ssIasZone", ["iasCieAddr", "zoneState", "zoneId"]);
            await endpoint.read("genBinaryInput", ["reliability", "statusFlags"]);
            await endpoint.read("ssIasWd", ["maxDuration"]);
        },
        endpoint: (device) => {
            return {default: 35};
        },
        exposes: [
            e.smoke(),
            e.battery_low(),
            e.test(),
            e.numeric("max_duration", ea.ALL).withUnit("s").withValueMin(0).withValueMax(600).withDescription("Duration of Siren"),
            e.binary("alarm", ea.SET, "START", "OFF").withDescription("Manual Start of Siren"),
            e
                .enum("reliability", ea.STATE, ["no_fault_detected", "unreliable_other", "process_error"])
                .withDescription("Indicates reason if any fault"),
            e.binary("fault", ea.STATE, true, false).withDescription("Indicates whether the device are in fault state"),
        ],
    },
    {
        zigbeeModel: ["WISZB-120"],
        model: "WISZB-120",
        vendor: "Develco",
        description: "Window sensor",
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
        ota: true,
        endpoint: (device) => {
            return {default: 35};
        },
        extend: [
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            develcoModernExtend.temperature(), // TODO: ep 38
            m.battery({
                percentage: true,
                voltage: true,
                lowStatus: false,
                voltageReporting: true,
                percentageReporting: true,
            }),
        ],
    },
    {
        zigbeeModel: ["WISZB-121"],
        model: "WISZB-121",
        vendor: "Develco",
        description: "Window sensor",
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper()],
        ota: true,
        endpoint: (device) => {
            return {default: 35};
        },
        extend: [
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            m.battery({
                voltageToPercentage: {min: 2500, max: 3000},
                percentage: true,
                voltage: true,
                lowStatus: false,
                voltageReporting: true,
                percentageReporting: false,
            }),
        ],
    },
    {
        zigbeeModel: ["WISZB-137"],
        model: "WISZB-137",
        vendor: "Develco",
        description: "Vibration sensor",
        fromZigbee: [fz.ias_vibration_alarm_1],
        toZigbee: [],
        exposes: [e.battery_low(), e.vibration(), e.tamper()],
        endpoint: (device) => {
            return {default: 38};
        },
        extend: [
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            develcoModernExtend.temperature(),
            m.battery({
                voltageToPercentage: "3V_2100",
                percentage: true,
                voltage: true,
                lowStatus: false,
                voltageReporting: true,
                percentageReporting: false,
            }),
        ],
    },
    {
        zigbeeModel: ["WISZB-138", "GWA1513_WindowSensor"],
        model: "WISZB-138",
        vendor: "Develco",
        description: "Window sensor",
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low()],
        endpoint: (device) => {
            return {default: 35};
        },
        extend: [
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            develcoModernExtend.temperature(),
            m.battery({
                voltageToPercentage: {min: 2500, max: 3000},
                percentage: true,
                voltage: true,
                lowStatus: false,
                voltageReporting: true,
                percentageReporting: false,
            }),
        ],
    },
    {
        zigbeeModel: ["MOSZB-130"],
        model: "MOSZB-130",
        vendor: "Develco",
        description: "Motion sensor",
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["MOSZB-140", "GWA1511_MotionSensor"],
        model: "MOSZB-140",
        vendor: "Develco",
        description: "Motion sensor",
        fromZigbee: [fz.ias_occupancy_alarm_1, develco.fz.led_control, develco.fz.ias_occupancy_timeout],
        toZigbee: [develco.tz.led_control, develco.tz.ias_occupancy_timeout],
        exposes: (device, options) => {
            const dynExposes = [];
            dynExposes.push(e.occupancy());
            if (utils.isDummyDevice(device) || Number(device.softwareBuildID?.split(".")[0]) >= 3) {
                dynExposes.push(e.numeric("occupancy_timeout", ea.ALL).withUnit("s").withValueMin(5).withValueMax(65535));
            }
            dynExposes.push(e.tamper());
            dynExposes.push(e.battery_low());
            if (utils.isDummyDevice(device) || Number(device?.softwareBuildID?.split(".")[0]) >= 4) {
                dynExposes.push(
                    e.enum("led_control", ea.ALL, ["off", "fault_only", "motion_only", "both"]).withDescription("Control LED indicator usage."),
                );
            }
            return dynExposes;
        },
        ota: true,
        endpoint: (device) => {
            return {default: 35};
        },
        extend: [
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            // Prevent excessive reports
            // https://github.com/Koenkk/zigbee-herdsman-converters/pull/10081
            develcoModernExtend.temperature({reporting: {min: 60, max: 3600, change: 100}}),
            m.illuminance({reporting: {min: 300, max: 3600, change: 100}}),
            m.battery({
                voltageToPercentage: {min: 2500, max: 3000},
                percentage: true,
                voltage: true,
                lowStatus: false,
                voltageReporting: true,
                percentageReporting: false,
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            // zigbee2mqtt#14277 some features are not available on older firmwares
            // modernExtend's readGenBasicPrimaryVersions is called before this one, should be fine
            const endpoint35 = device.getEndpoint(35);
            if (Number(device?.softwareBuildID?.split(".")[0]) >= 3) {
                await endpoint35.read("ssIasZone", ["develcoAlarmOffDelay"], manufacturerOptions);
            }
            if (Number(device?.softwareBuildID?.split(".")[0]) >= 4) {
                await endpoint35.read<"genBasic", DevelcoGenBasic>("genBasic", ["develcoLedControl"], manufacturerOptions);
            }
        },
    },
    {
        zigbeeModel: ["MOSZB-141"],
        model: "MOSZB-141",
        vendor: "Develco",
        description: "Motion sensor",
        extend: [
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_1", "battery_low"]}),
        ],
    },
    {
        whiteLabel: [{vendor: "Frient", model: "MOSZB-153", description: "Motion Sensor 2 Pet"}],
        zigbeeModel: ["MOSZB-153"],
        model: "MOSZB-153",
        vendor: "Develco",
        description: "Motion sensor 2 pet",
        fromZigbee: [develco.fz.led_control, develco.fz.ias_occupancy_timeout],
        toZigbee: [develco.tz.led_control, develco.tz.ias_occupancy_timeout],
        exposes: (device, options) => {
            const dynExposes = [];
            if (utils.isDummyDevice(device) || Number(device?.softwareBuildID?.split(".")[0]) >= 2) {
                dynExposes.push(e.numeric("occupancy_timeout", ea.ALL).withUnit("s").withValueMin(5).withValueMax(65535));
                dynExposes.push(
                    e.enum("led_control", ea.ALL, ["off", "fault_only", "motion_only", "both"]).withDescription("Control LED indicator usage."),
                );
            }
            return dynExposes;
        },
        ota: true,
        endpoint: (device) => {
            return {default: 35};
        },
        extend: [
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            develcoModernExtend.temperature(),
            m.illuminance({reporting: {min: 60, max: 3600, change: 500}}),
            m.battery({
                voltageToPercentage: {min: 2500, max: 3000},
                percentage: true,
                voltage: true,
                lowStatus: false,
                voltageReporting: true,
                percentageReporting: false,
            }),
            m.iasZoneAlarm({zoneType: "occupancy", zoneAttributes: ["alarm_1"]}),
        ],
        configure: async (device, coordinatorEndpoint) => {
            if (device?.softwareBuildID && Number(device.softwareBuildID.split(".")[0]) >= 2) {
                const endpoint35 = device.getEndpoint(35);
                await endpoint35.read("ssIasZone", ["develcoAlarmOffDelay"], manufacturerOptions);
                await endpoint35.read<"genBasic", DevelcoGenBasic>("genBasic", ["develcoLedControl"], manufacturerOptions);
            }
        },
    },
    {
        whiteLabel: [{vendor: "Frient", model: "HMSZB-120", description: "Temperature & humidity sensor", fingerprint: [{modelID: "HMSZB-120"}]}],
        zigbeeModel: ["HMSZB-110", "HMSZB-120"],
        model: "HMSZB-110",
        vendor: "Develco",
        description: "Temperature & humidity sensor",
        ota: true,
        endpoint: (device) => {
            return {default: 38};
        },
        extend: [
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            develcoModernExtend.temperature(),
            m.humidity(),
            m.battery({
                voltageToPercentage: {min: 2500, max: 3200},
                percentage: true,
                voltage: true,
                lowStatus: false,
                voltageReporting: true,
                percentageReporting: false,
            }),
            develcoModernExtend.batteryLowAA(),
        ],
    },
    {
        zigbeeModel: ["ZHEMI101"],
        model: "ZHEMI101",
        vendor: "Develco",
        description: "Energy meter",
        fromZigbee: [develco.fz.metering, develco.fz.pulse_configuration, develco.fz.interface_mode],
        toZigbee: [develco.tz.pulse_configuration, develco.tz.interface_mode, develco.tz.current_summation],
        endpoint: (device) => {
            return {default: 2};
        },
        extend: [develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(), develcoModernExtend.readGenBasicPrimaryVersions()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ["seMetering"]);
            await reporting.instantaneousDemand(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
        },
        exposes: [
            e.power(),
            e.energy(),
            e.battery_low(),
            e
                .numeric("pulse_configuration", ea.ALL)
                .withValueMin(0)
                .withValueMax(65535)
                .withDescription("Pulses per kwh. Default 1000 imp/kWh. Range 0 to 65535"),
            e
                .enum("interface_mode", ea.ALL, ["electricity", "gas", "water", "kamstrup-kmp", "linky", "IEC62056-21", "DSMR-2.3", "DSMR-4.0"])
                .withDescription("Operating mode/probe"),
            e
                .numeric("current_summation", ea.SET)
                .withDescription("Current summation value sent to the display. e.g. 570 = 0,570 kWh")
                .withValueMin(0)
                .withValueMax(268435455),
            e.binary("check_meter", ea.STATE, true, false).withDescription("Is true if communication problem with meter is experienced"),
        ],
    },
    {
        zigbeeModel: ["SMRZB-332"],
        model: "SMRZB-332",
        vendor: "Develco",
        description: "Smart relay DIN",
        fromZigbee: [fz.on_off, develco.fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.power(), e.energy(), e.switch()],
        endpoint: (device) => {
            return {default: 2};
        },
        extend: [develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(), develcoModernExtend.readGenBasicPrimaryVersions()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ["seMetering"]);
            await reporting.instantaneousDemand(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
        },
    },
    {
        zigbeeModel: ["FLSZB-110"],
        model: "FLSZB-110",
        vendor: "Develco",
        description: "Flood alarm device ",
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        ota: true,
        exposes: [e.battery_low(), e.tamper(), e.water_leak()],
        endpoint: (device) => {
            return {default: 35};
        },
        extend: [
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            develcoModernExtend.temperature(), // TODO: ep 38
            m.battery({
                voltageToPercentage: {min: 2800, max: 3000},
                percentage: true,
                voltage: true,
                lowStatus: false,
                voltageReporting: true,
                percentageReporting: false,
            }),
        ],
    },
    {
        zigbeeModel: ["AQSZB-110"],
        model: "AQSZB-110",
        vendor: "Develco",
        description: "Air quality sensor",
        ota: true,
        endpoint: (device) => {
            return {default: 38};
        },
        extend: [
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.addCustomClusterManuSpecificDevelcoAirQuality(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            develcoModernExtend.voc(),
            develcoModernExtend.airQuality(),
            develcoModernExtend.temperature(),
            m.humidity(),
            m.battery({
                voltageToPercentage: {min: 2500, max: 3000},
                percentage: true,
                voltage: true,
                lowStatus: false,
                voltageReporting: true,
                percentageReporting: false,
            }),
            develcoModernExtend.batteryLowAA(),
        ],
    },
    {
        zigbeeModel: ["SIRZB-110"],
        model: "SIRZB-110",
        vendor: "Develco",
        description: "Customizable siren",
        fromZigbee: [fz.ias_enroll, fz.ias_wd, fz.ias_siren],
        toZigbee: [tz.warning, tz.warning_simple, tz.ias_max_duration, tz.squawk],
        extend: [
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            develcoModernExtend.temperature(),
            m.battery({
                voltageToPercentage: {min: 2500, max: 3000},
                percentage: true,
                voltage: true,
                lowStatus: false,
                voltageReporting: true,
                percentageReporting: false,
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(43);
            await reporting.bind(endpoint, coordinatorEndpoint, ["ssIasZone", "ssIasWd", "genBasic"]);
            await endpoint.read("ssIasZone", ["iasCieAddr", "zoneState", "zoneId"]);
            await endpoint.read("ssIasWd", ["maxDuration"]);

            const endpoint2 = device.getEndpoint(1);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["genOnOff"]);
        },
        endpoint: (device) => {
            return {default: 43};
        },
        exposes: [
            e.battery_low(),
            e.test(),
            e.warning(),
            e.squawk(),
            e.numeric("max_duration", ea.ALL).withUnit("s").withValueMin(0).withValueMax(900).withDescription("Max duration of the siren"),
            e.binary("alarm", ea.SET, "START", "OFF").withDescription("Manual start of the siren"),
        ],
    },
    {
        zigbeeModel: ["SIRZB-111"],
        model: "SIRZB-111",
        vendor: "Develco",
        description: "Customizable siren",
        fromZigbee: [fz.ias_enroll, fz.ias_wd, fz.ias_siren],
        toZigbee: [tz.warning, tz.warning_simple, tz.ias_max_duration, tz.squawk],
        extend: [
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            m.battery({
                voltageToPercentage: {min: 2500, max: 3000},
                percentage: true,
                voltage: true,
                lowStatus: false,
                voltageReporting: true,
                percentageReporting: false,
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(43);
            await reporting.bind(endpoint, coordinatorEndpoint, ["ssIasZone", "ssIasWd", "genBasic"]);
            await endpoint.read("ssIasZone", ["iasCieAddr", "zoneState", "zoneId"]);
            await endpoint.read("ssIasWd", ["maxDuration"]);

            const endpoint2 = device.getEndpoint(1);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["genOnOff"]);
        },
        endpoint: (device) => {
            return {default: 43};
        },
        exposes: [
            e.battery_low(),
            e.test(),
            e.warning(),
            e.squawk(),
            e.numeric("max_duration", ea.ALL).withUnit("s").withValueMin(0).withValueMax(900).withDescription("Max duration of the siren"),
            e.binary("alarm", ea.SET, "START", "OFF").withDescription("Manual start of the siren"),
        ],
    },
    {
        zigbeeModel: ["KEPZB-110"],
        model: "KEYZB-110",
        vendor: "Develco",
        description: "Keypad",
        whiteLabel: [{vendor: "Frient", model: "KEPZB-110"}],
        fromZigbee: [
            fz.command_arm_with_transaction,
            fz.command_emergency,
            fz.ias_no_alarm,
            fz.ignore_iaszone_attreport,
            fz.ignore_iasace_commandgetpanelstatus,
        ],
        toZigbee: [tz.arm_mode],
        exposes: [
            e.battery_low(),
            e.tamper(),
            e.text("action_code", ea.STATE).withDescription("Pin code introduced."),
            e.numeric("action_transaction", ea.STATE).withDescription("Last action transaction number."),
            e.text("action_zone", ea.STATE).withDescription("Alarm zone. Default value 23"),
            e.action(["disarm", "arm_day_zones", "arm_night_zones", "arm_all_zones", "exit_delay", "emergency"]),
        ],
        ota: true,
        extend: [
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            m.battery({
                voltageToPercentage: {min: 3000, max: 4200},
                percentage: true,
                voltage: true,
                lowStatus: false,
                voltageReporting: true,
                percentageReporting: false,
            }),
            m.iasGetPanelStatusResponse(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(44);
            const clusters = ["ssIasZone", "ssIasAce", "genIdentify"];
            await reporting.bind(endpoint, coordinatorEndpoint, clusters);
        },
        endpoint: (device) => {
            return {default: 44};
        },
    },
    {
        zigbeeModel: ["IOMZB-110"],
        model: "IOMZB-110",
        vendor: "Develco",
        description: "IO module",
        fromZigbee: [fz.on_off, develco.fz.input],
        toZigbee: [tz.on_off, develco.tz.input],
        meta: {multiEndpoint: true},
        exposes: [
            e.binary("input", ea.STATE_GET, true, false).withEndpoint("l1").withDescription("State of input 1"),
            e.binary("input", ea.STATE_GET, true, false).withEndpoint("l2").withDescription("State of input 2"),
            e.binary("input", ea.STATE_GET, true, false).withEndpoint("l3").withDescription("State of input 3"),
            e.binary("input", ea.STATE_GET, true, false).withEndpoint("l4").withDescription("State of input 4"),
            e.switch().withEndpoint("l11"),
            e.switch().withEndpoint("l12"),
        ],
        extend: [develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(), develcoModernExtend.readGenBasicPrimaryVersions()],
        configure: async (device, coordinatorEndpoint) => {
            const ep2 = device.getEndpoint(112);
            await reporting.bind(ep2, coordinatorEndpoint, ["genBinaryInput", "genBasic"]);
            await reporting.presentValue(ep2, {min: 0});

            const ep3 = device.getEndpoint(113);
            await reporting.bind(ep3, coordinatorEndpoint, ["genBinaryInput"]);
            await reporting.presentValue(ep3, {min: 0});

            const ep4 = device.getEndpoint(114);
            await reporting.bind(ep4, coordinatorEndpoint, ["genBinaryInput"]);
            await reporting.presentValue(ep4, {min: 0});

            const ep5 = device.getEndpoint(115);
            await reporting.bind(ep5, coordinatorEndpoint, ["genBinaryInput"]);
            await reporting.presentValue(ep5, {min: 0});

            const ep6 = device.getEndpoint(116);
            await reporting.bind(ep6, coordinatorEndpoint, ["genOnOff", "genBinaryInput"]);
            await reporting.onOff(ep6);

            const ep7 = device.getEndpoint(117);
            await reporting.bind(ep7, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(ep7);
        },
        endpoint: (device) => {
            return {l1: 112, l2: 113, l3: 114, l4: 115, l11: 116, l12: 117};
        },
    },
    {
        zigbeeModel: ["SBTZB-110"],
        model: "SBTZB-110",
        vendor: "Develco",
        description: "Smart button",
        fromZigbee: [fz.ewelink_action],
        toZigbee: [],
        ota: true,
        exposes: [e.action(["single"])],
        extend: [
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            m.battery({
                voltageToPercentage: {min: 2200, max: 3000},
                percentage: true,
                voltage: true,
                lowStatus: false,
                voltageReporting: true,
                percentageReporting: false,
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(32);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genIdentify"]);
        },
        endpoint: (device) => {
            return {default: 32};
        },
    },
    {
        zigbeeModel: ["REXZB-111"],
        model: "REXZB-111",
        vendor: "Develco",
        description: "Range extender with backup battery",
        whiteLabel: [{vendor: "Frient", model: "REXZB-111"}],
        ota: true,
        endpoint: (device) => {
            return {default: 37};
        },
        extend: [
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.addCustomClusterManuSpecificDevelcoIasZone(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            m.battery({
                voltage: true,
                voltageReporting: true,
                voltageReportingConfig: {min: "1_HOUR", max: "MAX", change: 10},
                voltageToPercentage: {min: 3450, max: 4100},
                percentage: true,
                percentageReporting: false,
                lowStatus: false,
            }),
            m.iasZoneAlarm({
                zoneType: "generic",
                zoneAttributes: ["battery_low", "battery_defect"],
            }),
            develcoModernExtend.acConnected(),
            develcoModernExtend.ledControl(),
            develcoModernExtend.txPower(),
            develcoModernExtend.zoneStatusInterval(),
            m.identify(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(37);

            // Bind clusters
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "ssIasZone", "genBasic", "genIdentify"]);

            // Configure battery reporting
            await reporting.batteryVoltage(endpoint, {min: 3600, max: constants.repInterval.MAX, change: 10});

            // Read initial zone status to populate ac_connected state
            try {
                await endpoint.read("ssIasZone", ["zoneStatus"]);
            } catch {
                // Device may be sleeping, will be read on next wake
            }
        },
    },
];
