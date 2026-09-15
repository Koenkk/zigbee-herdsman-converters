import * as fz from "../converters/fromZigbee";
import * as ptvo from "../devices/custom_devices_diy";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const tzLocal = {
    ptvo_senseair_calibration: {
        key: ["calibrate"],
        convertSet: async (entity, key, value, meta) => {
            if (!value) return;
            // presentValue is a single-precision float (ZCL type 0x39)
            // ZERO = force zero-point calibration, SPAN = span calibration
            const writeValue = (value as string) === "ZERO" ? 0x00 : 0x01;
            await entity.write("genAnalogInput", {85: {value: writeValue, type: 0x39}});
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("genAnalogInput", ["presentValue"]);
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["msh.AirQMon"],
        model: "msh.AirQMon",
        vendor: "MySmartHouse",
        description: "MSH Air quality sensor",
        fromZigbee: [ptvo.fzLocal.ptvo_switch_uart, fz.co2, ptvo.fzLocal.ptvo_switch_analog_input, fz.temperature],
        toZigbee: [ptvo.tzLocal.ptvo_switch_trigger, ptvo.tzLocal.ptvo_switch_uart, tzLocal.ptvo_senseair_calibration],
        exposes: [
            e.text("action", ea.STATE_SET).withDescription("button clicks or data from/to UART"),
            e.enum("calibrate", ea.STATE_SET, ["ZERO", "SPAN"]).withEndpoint("l2").withDescription("Calibration"),
            e.co2(),
            e.numeric("l2", ea.STATE).withDescription("Error"),
            e.cpu_temperature().withProperty("temperature").withEndpoint("l3"),
            e.numeric("l4", ea.STATE).withDescription("Uptime (seconds)"),
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => ({l2: 2, action: 1, l3: 3, l4: 4}),
    },
    {
        zigbeeModel: ["msh.bme280psm"],
        model: "msh.bme280psm",
        vendor: "MySmartHouse",
        description: "MSH outdoor thermometer with BME280",
        extend: [m.battery(), m.temperature(), m.humidity(), m.pressure()],
    },
    {
        zigbeeModel: ["msh.ds18b20psm"],
        model: "msh.ds18b20psm",
        vendor: "MySmartHouse",
        description: "MSH outdoor thermometer with DS18B20",
        extend: [m.battery(), m.temperature()],
    },
    {
        zigbeeModel: ["msh.ina226"],
        model: "msh.ina226",
        vendor: "MySmartHouse",
        description: "MSH 9-26V, 5A DC Power Meter",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}),
            m.electricityMeter({
                endpointNames: ["l2"],
                electricalMeasurementType: "dc",
                voltage: {divisor: 100},
                current: {divisor: 1000},
                power: {divisor: 10},
                energy: false,
                configureReporting: false,
            }),
            m.numeric({
                name: "l4",
                attribute: "presentValue",
                cluster: "genAnalogInput",
                endpointNames: ["l4"],
                access: "STATE",
                label: "Uptime",
                description: "Uptime (seconds)",
                unit: "s",
                reporting: {min: m.TIME_LOOKUP["1_SECOND"], max: m.TIME_LOOKUP["10_SECONDS"], change: 10},
            }),
        ],
    },
    {
        zigbeeModel: ["msh.ina226m"],
        model: "msh.ina226m",
        vendor: "MySmartHouse",
        description: "MSH 9-26V, 5A DC Power Meter, with CPU temperature support",
        extend: [
            m.deviceEndpoints({endpoints: {l2: 2, l4: 4, l5: 5}}),
            m.electricityMeter({
                endpointNames: ["l2"],
                electricalMeasurementType: "dc",
                voltage: {divisor: 100},
                current: {divisor: 1000},
                power: {divisor: 10},
                energy: false,
                configureReporting: false,
            }),
            m.temperature({
                endpointNames: ["l5"],
                access: "STATE",
                label: "CPU Temperature",
                description: "Temperature of the CPU",
            }),
            m.numeric({
                name: "l4",
                attribute: "presentValue",
                cluster: "genAnalogInput",
                endpointNames: ["l4"],
                access: "STATE",
                label: "Uptime",
                description: "Uptime (seconds)",
                unit: "s",
                reporting: {min: m.TIME_LOOKUP["1_SECOND"], max: m.TIME_LOOKUP["10_SECONDS"], change: 10},
            }),
        ],
    },
    {
        zigbeeModel: ["msh.pzem"],
        model: "msh.pzem",
        vendor: "MySmartHouse",
        description: "MSH 100A AC DIN Power Meter",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3}}),
            m.electricityMeter({
                endpointNames: ["l2"],
                electricalMeasurementType: "ac",
                energy: {divisor: 1},
                acFrequency: true,
                powerFactor: true,
                configureReporting: false,
            }),
            m.temperature({
                endpointNames: ["l1"],
                access: "STATE",
                label: "CPU Temperature",
                description: "Temperature of the CPU",
            }),
            m.numeric({
                name: "l3",
                attribute: "presentValue",
                cluster: "genAnalogInput",
                endpointNames: ["l3"],
                access: "STATE",
                label: "Uptime",
                description: "Uptime (seconds)",
                unit: "s",
                reporting: {min: m.TIME_LOOKUP["1_SECOND"], max: m.TIME_LOOKUP["10_SECONDS"], change: 10},
            }),
        ],
    },
    {
        zigbeeModel: ["msh.pzem.dc"],
        model: "msh.pzem.dc",
        vendor: "MySmartHouse",
        description: "MSH 9-30V, 50-300A DC Power Meter",
        fromZigbee: [ptvo.fzLocal.ptvo_switch_analog_input, ptvo.fzLocal.ptvo_switch_uart],
        toZigbee: [ptvo.tzLocal.ptvo_switch_analog_input, ptvo.tzLocal.ptvo_switch_uart],
        exposes: [
            exposes.numeric("val1", ea.STATE).withEndpoint("l2").withDescription("Voltage"),
            exposes.numeric("val2", ea.STATE).withEndpoint("l2").withDescription("Current"),
            exposes.numeric("val3", ea.STATE).withEndpoint("l2").withDescription("Power"),
            exposes.numeric("val5", ea.STATE).withEndpoint("l2").withDescription("Energy"),
            exposes.numeric("l5", ea.STATE).withLabel("Uptime").withDescription("Uptime (seconds)").withUnit("s"),
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => ({l2: 2, l3: 3, action: 1, l5: 5}),
    },
];
