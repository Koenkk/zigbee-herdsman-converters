import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
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
        fromZigbee: [fz.ptvo_switch_uart, fz.co2, fz.ptvo_switch_analog_input, fz.temperature],
        toZigbee: [tz.ptvo_switch_trigger, tz.ptvo_switch_uart, tzLocal.ptvo_senseair_calibration],
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
];
