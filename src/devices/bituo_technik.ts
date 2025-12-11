import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValue} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const bituo_fz = {
    // To resolve the [https://github.com/Koenkk/zigbee2mqtt/issues/19705] issue, multiply all power attributes, except for powerFactor, by acPowerdivisor in advance.
    // To avoid future adjustments of acPowerdivisor to 1 in the firmware, the power attributes are not directly multiplied by 1000.
    electrical_measurement: {
        ...fz.electrical_measurement,
        convert: (model, msg, publish, options, meta) => {
            const divisor = (msg.endpoint.getClusterAttributeValue("haElectricalMeasurement", "acPowerDivisor") as number) || 1;

            for (const field of Object.keys(msg.data)) {
                const lowerField = field.toLowerCase();
                if (
                    lowerField.includes("power") && // Fields containing "power" are included
                    !lowerField.includes("powerfactor") // excluding "powerFactor" (case-sensitive, lowercase comparison）
                ) {
                    if (msg.data[field as keyof typeof msg.data & string] !== undefined) {
                        msg.data[field as keyof typeof msg.data & string] = (msg.data[field as keyof typeof msg.data & string] as number) * divisor;
                    }
                }
            }
            return fz.electrical_measurement.convert(model, msg, publish, options, meta);
        },
    } satisfies Fz.Converter<"haElectricalMeasurement", undefined, ["attributeReport", "readResponse"]>,
    total_power: {
        cluster: "haElectricalMeasurement",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.totalActivePower !== undefined) {
                result[utils.postfixWithEndpointName("total_power", msg, model, meta)] = msg.data.totalActivePower;
            }
            if (msg.data.totalReactivePower !== undefined) {
                result[utils.postfixWithEndpointName("total_power_reactive", msg, model, meta)] = msg.data.totalReactivePower;
            }
            if (msg.data.totalApparentPower !== undefined) {
                result[utils.postfixWithEndpointName("total_power_apparent", msg, model, meta)] = msg.data.totalApparentPower;
            }
            return result;
        },
    } satisfies Fz.Converter<"haElectricalMeasurement", undefined, ["attributeReport", "readResponse"]>,
};
export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SPM01X001", "SPM01X", "SPM01-1Z2"],
        model: "SPM01-U01",
        vendor: "BITUO TECHNIK",
        description: "Smart energy monitor for 1P+N system",
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ["haElectricalMeasurement", "seMetering"]);
        },
        extend: [
            m.electricityMeter({
                fzElectricalMeasurement: bituo_fz.electrical_measurement,
                producedEnergy: true,
                acFrequency: true,
                powerFactor: true,
                configureReporting: false,
            }),
        ],
        meta: {},
        exposes: [e.power_apparent()],
        whiteLabel: [{vendor: "Zemismart", model: "SPM01-1Z2", fingerprint: [{modelID: "SPM01-1Z2"}]}],
    },
    {
        zigbeeModel: ["SDM01W", "SDM01-3Z1"],
        model: "SDM01W-U01",
        vendor: "BITUO TECHNIK",
        description: "Smart energy monitor for 3P+N system",
        fromZigbee: [bituo_fz.total_power],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ["haElectricalMeasurement", "seMetering"]);
        },
        extend: [
            m.identify(),
            m.onOff({powerOnBehavior: false, description: "Toggle to 'On' to Zero the energy"}),
            m.electricityMeter({
                fzElectricalMeasurement: bituo_fz.electrical_measurement,
                threePhase: true,
                producedEnergy: true,
                acFrequency: true,
                powerFactor: true,
                configureReporting: false,
            }),
        ],
        meta: {},
        exposes: [
            e.power_reactive(),
            e.power_reactive_phase_b(),
            e.power_reactive_phase_c(),
            e.power_apparent(),
            e.power_apparent_phase_b(),
            e.power_apparent_phase_c(),
            e.power_factor_phase_b(),
            e.power_factor_phase_c(),
            e.numeric("total_power", ea.STATE).withUnit("W").withDescription("Total Active Power"),
            e.numeric("total_power_reactive", ea.STATE).withUnit("VAR").withDescription("Total Reactive Power"),
            e.numeric("total_power_apparent", ea.STATE).withUnit("VA").withDescription("Total Apparent Power"),
        ],
        whiteLabel: [{vendor: "Zemismart", model: "SDM01-3Z1", fingerprint: [{modelID: "SDM01-3Z1"}]}],
    },
    {
        zigbeeModel: ["SDM01B"],
        model: "SDM01B-U01",
        vendor: "BITUO TECHNIK",
        description: "Smart energy monitor for 1P+N system",
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ["haElectricalMeasurement", "seMetering"]);
        },
        extend: [
            m.identify(),
            m.onOff({powerOnBehavior: false, description: "Toggle to 'On' to Zero the energy"}),
            m.electricityMeter({
                fzElectricalMeasurement: bituo_fz.electrical_measurement,
                producedEnergy: true,
                acFrequency: true,
                powerFactor: true,
                configureReporting: false,
            }),
        ],
        meta: {},
        exposes: [e.power_apparent()],
    },
    {
        zigbeeModel: ["SDM02X", "SDM02-2Z1"],
        model: "SDM02-U01",
        vendor: "BITUO TECHNIK",
        description: "Smart energy monitor for 2P+N system",
        fromZigbee: [bituo_fz.total_power],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ["haElectricalMeasurement", "seMetering"]);
        },
        extend: [
            m.electricityMeter({
                fzElectricalMeasurement: bituo_fz.electrical_measurement,
                acFrequency: true,
                powerFactor: true,
                configureReporting: false,
                producedEnergy: true,
            }),
        ],
        exposes: [
            e.power_phase_b(),
            e.power_reactive(),
            e.power_reactive_phase_b(),
            e.power_apparent(),
            e.power_apparent_phase_b(),
            e.current_phase_b(),
            e.voltage_phase_b(),
            e.power_factor_phase_b(),
            e.numeric("total_power", ea.STATE).withUnit("W").withDescription("Total Active Power"),
            e.numeric("total_power_reactive", ea.STATE).withUnit("VAR").withDescription("Total Reactive Power"),
            e.numeric("total_power_apparent", ea.STATE).withUnit("VA").withDescription("Total Apparent Power"),
        ],
        whiteLabel: [{vendor: "Zemismart", model: "SDM02-2Z1", fingerprint: [{modelID: "SDM02-2Z1"}]}],
    },
    {
        zigbeeModel: ["SPM02X001", "SPM02X", "SPM02-3Z3"],
        model: "SPM02-U01",
        vendor: "BITUO TECHNIK",
        description: "Smart energy monitor for 3P+N system",
        fromZigbee: [bituo_fz.total_power],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ["haElectricalMeasurement", "seMetering"]);
        },
        extend: [
            m.electricityMeter({
                fzElectricalMeasurement: bituo_fz.electrical_measurement,
                threePhase: true,
                producedEnergy: true,
                acFrequency: true,
                powerFactor: true,
                configureReporting: false,
            }),
        ],
        meta: {},
        exposes: [
            e.power_reactive(),
            e.power_reactive_phase_b(),
            e.power_reactive_phase_c(),
            e.power_apparent(),
            e.power_apparent_phase_b(),
            e.power_apparent_phase_c(),
            e.power_factor_phase_b(),
            e.power_factor_phase_c(),
            e.numeric("total_power", ea.STATE).withUnit("W").withDescription("Total Active Power"),
            e.numeric("total_power_reactive", ea.STATE).withUnit("VAR").withDescription("Total Reactive Power"),
            e.numeric("total_power_apparent", ea.STATE).withUnit("VA").withDescription("Total Apparent Power"),
        ],
        whiteLabel: [{vendor: "Zemismart", model: "SPM02-3Z3", fingerprint: [{modelID: "SPM02-3Z3"}]}],
    },
    {
        zigbeeModel: ["SPM01"],
        model: "SPM01-U02",
        vendor: "BITUO TECHNIK",
        description: "Smart energy monitor for 1P+N system",
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ["haElectricalMeasurement", "seMetering"]);
        },
        extend: [
            m.electricityMeter({
                fzMetering: fz.metering,
                fzElectricalMeasurement: bituo_fz.electrical_measurement,
                acFrequency: true,
                powerFactor: true,
                configureReporting: false,
                producedEnergy: true,
            }),
        ],
        exposes: [e.power_apparent()],
    },
    {
        zigbeeModel: ["SDM02"],
        model: "SDM02-U02",
        vendor: "BITUO TECHNIK",
        description: "Smart energy monitor for 2P+N system",
        fromZigbee: [bituo_fz.total_power],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ["haElectricalMeasurement", "seMetering"]);
        },
        extend: [
            m.electricityMeter({
                fzElectricalMeasurement: bituo_fz.electrical_measurement,
                acFrequency: true,
                powerFactor: true,
                configureReporting: false,
                producedEnergy: true,
            }),
        ],
        exposes: [
            e.power_phase_b(),
            e.power_reactive(),
            e.power_reactive_phase_b(),
            e.power_apparent(),
            e.power_apparent_phase_b(),
            e.current_phase_b(),
            e.voltage_phase_b(),
            e.power_factor_phase_b(),
            e.numeric("total_power", ea.STATE).withUnit("W").withDescription("Total Active Power"),
            e.numeric("total_power_reactive", ea.STATE).withUnit("VAR").withDescription("Total Reactive Power"),
            e.numeric("total_power_apparent", ea.STATE).withUnit("VA").withDescription("Total Apparent Power"),
        ],
    },
    {
        zigbeeModel: ["SPM02"],
        model: "SPM02-U02",
        vendor: "BITUO TECHNIK",
        description: "Smart energy monitor for 3P+N system",
        fromZigbee: [bituo_fz.total_power],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ["haElectricalMeasurement", "seMetering"]);
        },
        extend: [
            m.electricityMeter({
                fzElectricalMeasurement: bituo_fz.electrical_measurement,
                acFrequency: true,
                powerFactor: true,
                configureReporting: false,
                producedEnergy: true,
                threePhase: true,
            }),
        ],
        exposes: [
            e.power_reactive(),
            e.power_reactive_phase_b(),
            e.power_reactive_phase_c(),
            e.power_apparent(),
            e.power_apparent_phase_b(),
            e.power_apparent_phase_c(),
            e.power_factor_phase_b(),
            e.power_factor_phase_c(),
            e.numeric("total_power", ea.STATE).withUnit("W").withDescription("Total Active Power"),
            e.numeric("total_power_reactive", ea.STATE).withUnit("VAR").withDescription("Total Reactive Power"),
            e.numeric("total_power_apparent", ea.STATE).withUnit("VA").withDescription("Total Apparent Power"),
        ],
    },
    {
        zigbeeModel: ["SPM01-E0"],
        model: "SPM01-U00",
        vendor: "BITUO TECHNIK",
        description: "Smart energy monitor for 1P+N system",
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(10);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ["haElectricalMeasurement", "seMetering"]);
        },
        extend: [
            m.identify(),
            m.onOff({powerOnBehavior: false, description: "Toggle to 'On' to Zero the energy"}),
            m.electricityMeter({
                fzMetering: fz.metering,
                fzElectricalMeasurement: bituo_fz.electrical_measurement,
                acFrequency: true,
                powerFactor: true,
                configureReporting: false,
                producedEnergy: true,
            }),
        ],
        exposes: [e.power_apparent()],
    },
    {
        zigbeeModel: ["SDM02-E0"],
        model: "SDM02-U00",
        vendor: "BITUO TECHNIK",
        description: "Smart energy monitor for 2P+N system",
        fromZigbee: [bituo_fz.total_power],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(10);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ["haElectricalMeasurement", "seMetering"]);
        },
        extend: [
            m.identify(),
            m.onOff({powerOnBehavior: false, description: "Toggle to 'On' to Zero the energy"}),
            m.electricityMeter({
                fzElectricalMeasurement: bituo_fz.electrical_measurement,
                acFrequency: true,
                powerFactor: true,
                configureReporting: false,
                producedEnergy: true,
            }),
        ],
        exposes: [
            e.power_phase_b(),
            e.power_reactive(),
            e.power_reactive_phase_b(),
            e.power_apparent(),
            e.power_apparent_phase_b(),
            e.current_phase_b(),
            e.voltage_phase_b(),
            e.power_factor_phase_b(),
            e.numeric("total_power", ea.STATE).withUnit("W").withDescription("Total Active Power"),
            e.numeric("total_power_reactive", ea.STATE).withUnit("VAR").withDescription("Total Reactive Power"),
            e.numeric("total_power_apparent", ea.STATE).withUnit("VA").withDescription("Total Apparent Power"),
        ],
    },
    {
        zigbeeModel: ["SPM02-E0"],
        model: "SPM02-U00",
        vendor: "BITUO TECHNIK",
        description: "Smart energy monitor for 3P+N system",
        fromZigbee: [bituo_fz.total_power],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(10);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ["haElectricalMeasurement", "seMetering"]);
        },
        extend: [
            m.identify(),
            m.onOff({powerOnBehavior: false, description: "Toggle to 'On' to Zero the energy"}),
            m.electricityMeter({
                fzElectricalMeasurement: bituo_fz.electrical_measurement,
                acFrequency: true,
                powerFactor: true,
                configureReporting: false,
                producedEnergy: true,
                threePhase: true,
            }),
        ],
        exposes: [
            e.power_reactive(),
            e.power_reactive_phase_b(),
            e.power_reactive_phase_c(),
            e.power_apparent(),
            e.power_apparent_phase_b(),
            e.power_apparent_phase_c(),
            e.power_factor_phase_b(),
            e.power_factor_phase_c(),
            e.numeric("total_power", ea.STATE).withUnit("W").withDescription("Total Active Power"),
            e.numeric("total_power_reactive", ea.STATE).withUnit("VAR").withDescription("Total Reactive Power"),
            e.numeric("total_power_apparent", ea.STATE).withUnit("VA").withDescription("Total Apparent Power"),
        ],
    },
];
