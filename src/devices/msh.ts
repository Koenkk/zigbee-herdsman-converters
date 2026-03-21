import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import type {DefinitionWithExtend, Fz, Tz} from "../lib/types";
import {calibrateAndPrecisionRoundOptions, postfixWithEndpointName} from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    humidity: {
        cluster: "msRelativeHumidity",
        type: ["attributeReport", "readResponse"],
        options: [exposes.options.precision("humidity"), exposes.options.calibration("humidity")],
        convert: (model, msg, publish, options, meta) => {
            const humidity = msg.data.measuredValue / 100.0;
            // Ignore out-of-range values (https://github.com/Koenkk/zigbee2mqtt/issues/798)
            if (humidity >= 0 && humidity <= 100) {
                const property = postfixWithEndpointName("humidity", msg, model, meta);
                return {[property]: calibrateAndPrecisionRoundOptions(humidity, options, "humidity")};
            }
        },
    } satisfies Fz.Converter<"msRelativeHumidity", undefined, ["attributeReport", "readResponse"]>,

    pressure: {
        cluster: "msPressureMeasurement",
        type: ["attributeReport", "readResponse"],
        options: [exposes.options.precision("pressure"), exposes.options.calibration("pressure")],
        convert: (model, msg, publish, options, meta) => {
            let pressure: number;
            if (msg.data.scaledValue !== undefined) {
                const scale = msg.endpoint.getClusterAttributeValue("msPressureMeasurement", "scale") as number;
                pressure = msg.data.scaledValue / 10 ** scale / 100.0; // convert to hPa
            } else {
                pressure = msg.data.measuredValue;
            }
            const property = postfixWithEndpointName("pressure", msg, model, meta);
            return {[property]: calibrateAndPrecisionRoundOptions(pressure, options, "pressure")};
        },
    } satisfies Fz.Converter<"msPressureMeasurement", undefined, ["attributeReport", "readResponse"]>,
};

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
        description: "[MSH Air quality sensor](https://www.facebook.com/my.smart.house.in.ua)",
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
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            if (endpoint) {
                await endpoint.read("genBasic", ["modelId", "swBuildId", "powerSource"]);
            }
        },
    },
    {
        zigbeeModel: ["msh.bme280psm"],
        model: "msh.bme280psm",
        vendor: "MySmartHouse",
        description: "[MSH outdoor thermometer with BME280](https://www.facebook.com/my.smart.house.in.ua)",
        fromZigbee: [fz.battery, fz.temperature, fzLocal.humidity, fzLocal.pressure],
        toZigbee: [tz.ptvo_switch_trigger],
        exposes: [
            e.battery(),
            e.temperature().withEndpoint("l3"),
            e.humidity().withEndpoint("l3"),
            e.pressure().withUnit("hPa").withEndpoint("l3"),
            e.battery_voltage(),
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => ({l3: 3}),
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            if (endpoint) {
                await endpoint.read("genBasic", ["modelId", "swBuildId", "powerSource"]);
            }
        },
    },
    {
        zigbeeModel: ["msh.ds18b20psm"],
        model: "msh.ds18b20psm",
        vendor: "MySmartHouse",
        description: "[MSH outdoor thermometer with DS18B20](https://www.facebook.com/my.smart.house.in.ua)",
        fromZigbee: [fz.battery, fz.temperature],
        toZigbee: [tz.ptvo_switch_trigger],
        exposes: [e.battery(), e.temperature().withEndpoint("l3"), e.battery_voltage()],
        meta: {multiEndpoint: true},
        endpoint: (device) => ({l3: 3}),
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            if (endpoint) {
                await endpoint.read("genBasic", ["modelId", "swBuildId", "powerSource"]);
            }
        },
    },
];
