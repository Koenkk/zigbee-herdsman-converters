import {Zcl} from "zigbee-herdsman";

import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as globalStore from "../lib/store";
import type {DefinitionWithExtend, Expose, Fz, KeyValue, KeyValueAny, ModernExtend, Tz} from "../lib/types";
import * as utils from "../lib/utils";
import {assertString, getFromLookup, getOptions, postfixWithEndpointName, precisionRound} from "../lib/utils";

const defaultReporting = {min: 0, max: 300, change: 0};
const co2Reporting = {min: 10, max: 300, change: 0.000001};
const batteryReporting = {min: 3600, max: 0, change: 0};

const e = exposes.presets;
const ea = exposes.access;

const attrElCityMeterModelPreset = 0xf000;
const attrElCityMeterAddressPreset = 0xf001;
const attrElCityMeterMeasurementPreset = 0xf002;
const attrElCityMeterDateRelease = 0xf003;
const attrElCityMeterModelName = 0xf004;
const attrElCityMeterPasswordPreset = 0xf005;

let energy_divisor = 1;
let energy_multiplier = 1;
let voltage_divisor = 1;
let voltage_multiplier = 1;
let current_divisor = 1;
let current_multiplier = 1;
let power_divisor = 1;
let power_multiplier = 1;

const electricityMeterExtend = {
    tarrifs: (): ModernExtend => {
        const exposes: Expose[] = [
            e.numeric("tariff1", ea.STATE_GET).withUnit("kWh").withDescription("Tariff 1"),
            e.numeric("tariff2", ea.STATE_GET).withUnit("kWh").withDescription("Tariff 2"),
            e.numeric("tariff3", ea.STATE_GET).withUnit("kWh").withDescription("Tariff 3"),
            e.numeric("tariff4", ea.STATE_GET).withUnit("kWh").withDescription("Tariff 4"),
            e.numeric("tariff_summ", ea.STATE_GET).withUnit("kWh").withDescription("Tariff Summation"),
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["tariff", "tariff1", "tariff2", "tariff3", "tariff4", "tariff_summ"],
                convertGet: async (entity, key, meta) => {
                    await entity.read("seMetering", [
                        "currentTier1SummDelivered",
                        "currentTier2SummDelivered",
                        "currentTier3SummDelivered",
                        "currentTier4SummDelivered",
                        "currentSummDelivered",
                        "multiplier",
                        "divisor",
                    ]);
                },
                convertSet: async (entity, key, value, meta) => {
                    return null;
                },
            },
        ];
        const fromZigbee: Fz.Converter[] = [
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.currentTier1SummDelivered !== undefined) {
                        const data = msg.data.currentTier1SummDelivered;
                        result.tariff1 = (Number.parseInt(data) / energy_divisor) * energy_multiplier;
                    }
                    return result;
                },
            },
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.currentTier2SummDelivered !== undefined) {
                        const data = msg.data.currentTier2SummDelivered;
                        result.tariff2 = (Number.parseInt(data) / energy_divisor) * energy_multiplier;
                    }
                    return result;
                },
            },
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.currentTier3SummDelivered !== undefined) {
                        const data = msg.data.currentTier3SummDelivered;
                        result.tariff3 = (Number.parseInt(data) / energy_divisor) * energy_multiplier;
                    }
                    return result;
                },
            },
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.currentTier4SummDelivered !== undefined) {
                        const data = msg.data.currentTier4SummDelivered;
                        result.tariff4 = (Number.parseInt(data) / energy_divisor) * energy_multiplier;
                    }
                    return result;
                },
            },
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.currentSummDelivered !== undefined) {
                        const data = msg.data.currentSummDelivered;
                        result.tariff_summ = (Number.parseInt(data) / energy_divisor) * energy_multiplier;
                    }
                    return result;
                },
            },
        ];
        return {
            exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    powerSupplyParam: (): ModernExtend => {
        const exposes: Expose[] = [
            e.numeric("voltage", ea.STATE_GET).withUnit("V").withDescription("Voltage"),
            e.numeric("current", ea.STATE_GET).withUnit("A").withDescription("Current"),
            e.numeric("power", ea.STATE_GET).withUnit("kW").withDescription("Power"),
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["voltage"],
                convertGet: async (entity, key, meta) => {
                    await entity.read("haElectricalMeasurement", ["rmsVoltage", "acVoltageMultiplier", "acVoltageDivisor"]);
                },
                convertSet: async (entity, key, value, meta) => {
                    return null;
                },
            },
            {
                key: ["current"],
                convertGet: async (entity, key, meta) => {
                    await entity.read("haElectricalMeasurement", ["instantaneousLineCurrent", "acCurrentMultiplier", "acCurrentDivisor"]);
                },
                convertSet: async (entity, key, value, meta) => {
                    return null;
                },
            },
            {
                key: ["power"],
                convertGet: async (entity, key, meta) => {
                    await entity.read("haElectricalMeasurement", ["apparentPower", "acPowerMultiplier", "acPowerDivisor"]);
                },
                convertSet: async (entity, key, value, meta) => {
                    return null;
                },
            },
        ];
        const fromZigbee: Fz.Converter[] = [
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.divisor !== undefined) {
                        const data = Number.parseInt(msg.data.divisor);
                        energy_divisor = data;
                        result.e_divisor = energy_divisor;
                    }
                    return result;
                },
            },
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.multiplier !== undefined) {
                        const data = Number.parseInt(msg.data.multiplier);
                        energy_multiplier = data;
                        result.e_multiplier = energy_multiplier;
                    }
                    return result;
                },
            },
            {
                cluster: "haElectricalMeasurement",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.rmsVoltage !== undefined) {
                        const data = Number.parseInt(msg.data.rmsVoltage);
                        result.voltage = (data / voltage_divisor) * voltage_multiplier;
                        //meta.logger.info('Voltage: ' + data + ', multiplier: ' + voltage_multiplier + ', divisor: ' + voltage_divisor);
                    }
                    return result;
                },
            },
            {
                cluster: "haElectricalMeasurement",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.acVoltageMultiplier !== undefined) {
                        const data = Number.parseInt(msg.data.acVoltageMultiplier);
                        voltage_multiplier = data;
                        result.v_multiplier = voltage_multiplier;
                    }
                    return result;
                },
            },
            {
                cluster: "haElectricalMeasurement",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.acVoltageDivisor !== undefined) {
                        const data = Number.parseInt(msg.data.acVoltageDivisor);
                        voltage_divisor = data;
                        result.v_divisor = voltage_divisor;
                    }
                    return result;
                },
            },
            {
                cluster: "haElectricalMeasurement",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.instantaneousLineCurrent !== undefined) {
                        const data = Number.parseInt(msg.data.instantaneousLineCurrent);
                        result.current = (data / current_divisor) * current_multiplier;
                    }
                    return result;
                },
            },
            {
                cluster: "haElectricalMeasurement",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.acCurrentMultiplier !== undefined) {
                        const data = Number.parseInt(msg.data.acCurrentMultiplier);
                        current_multiplier = data;
                        result.c_multiplier = current_multiplier;
                    }
                    return result;
                },
            },
            {
                cluster: "haElectricalMeasurement",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.acCurrentDivisor !== undefined) {
                        const data = Number.parseInt(msg.data.acCurrentDivisor);
                        current_divisor = data;
                        result.c_divisor = current_divisor;
                    }
                    return result;
                },
            },
            {
                cluster: "haElectricalMeasurement",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.apparentPower !== undefined) {
                        const data = Number.parseInt(msg.data.apparentPower);
                        result.power = (data / power_divisor) * power_multiplier;
                    }
                    return result;
                },
            },
            {
                cluster: "haElectricalMeasurement",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.acPowerMultiplier !== undefined) {
                        const data = Number.parseInt(msg.data.acPowerMultiplier);
                        power_multiplier = data;
                        result.p_multiplier = power_multiplier;
                    }
                    return result;
                },
            },
            {
                cluster: "haElectricalMeasurement",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.acPowerDivisor !== undefined) {
                        const data = Number.parseInt(msg.data.acPowerDivisor);
                        power_divisor = data;
                        result.p_divisor = power_divisor;
                    }
                    return result;
                },
            },
        ];
        return {
            exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    deviceParam: (): ModernExtend => {
        const exposes: Expose[] = [
            e.text("model_name", ea.STATE_GET).withDescription("Meter Model Name"),
            e.text("serial_number", ea.STATE_GET).withDescription("Meter Serial Number"),
            e.text("date_release", ea.STATE_GET).withDescription("Meter Date Release"),
            e.numeric("battery_life", ea.STATE_GET).withUnit("%").withDescription("Battery Life"),
            e.numeric("temperature", ea.STATE_GET).withUnit("°C").withDescription("Device temperature"),
            e.binary("tamper", ea.STATE, true, false).withDescription("Tamper"),
            e.binary("battery_low", ea.STATE, true, false).withDescription("Battery Low"),
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["model_name"],
                convertGet: async (entity, key, meta) => {
                    await entity.read("seMetering", [attrElCityMeterModelName]);
                },
                convertSet: async (entity, key, value, meta) => {
                    return null;
                },
            },
            {
                key: ["serial_number"],
                convertGet: async (entity, key, meta) => {
                    await entity.read("seMetering", ["meterSerialNumber"]);
                },
                convertSet: async (entity, key, value, meta) => {
                    return null;
                },
            },
            {
                key: ["date_release"],
                convertGet: async (entity, key, meta) => {
                    await entity.read("seMetering", [attrElCityMeterDateRelease]);
                },
                convertSet: async (entity, key, value, meta) => {
                    return null;
                },
            },
            {
                key: ["battery_life"],
                convertGet: async (entity, key, meta) => {
                    await entity.read("seMetering", ["remainingBattLife"]);
                },
                convertSet: async (entity, key, value, meta) => {
                    return null;
                },
            },
            {
                key: ["temperature"],
                convertGet: async (entity, key, meta) => {
                    await entity.read("genDeviceTempCfg", ["currentTemperature"]);
                },
                convertSet: async (entity, key, value, meta) => {
                    return null;
                },
            },
        ];
        const fromZigbee: Fz.Converter[] = [
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data[attrElCityMeterModelName] !== undefined) {
                        const data = msg.data[attrElCityMeterModelName];
                        result.model_name = data.toString();
                    }
                    return result;
                },
            },
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.meterSerialNumber !== undefined) {
                        const data = msg.data.meterSerialNumber;
                        result.serial_number = data.toString();
                    }
                    return result;
                },
            },
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data[attrElCityMeterDateRelease] !== undefined) {
                        const data = msg.data[attrElCityMeterDateRelease];
                        result.date_release = data.toString();
                    }
                    return result;
                },
            },
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.status !== undefined) {
                        const data = msg.data.status;
                        const value = Number.parseInt(data);
                        return {
                            battery_low: (value & (1 << 1)) > 0,
                            tamper: (value & (1 << 2)) > 0,
                        };
                    }
                    return result;
                },
            },
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.remainingBattLife !== undefined) {
                        const data = Number.parseInt(msg.data.remainingBattLife);
                        result.battery_life = data;
                    }
                    return result;
                },
            },
            {
                cluster: "genDeviceTempCfg",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data.currentTemperature !== undefined) {
                        const data = Number.parseInt(msg.data.currentTemperature);
                        result.temperature = data;
                    }
                    return result;
                },
            },
        ];
        return {
            exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    deviceConfig: (): ModernExtend => {
        const exposes: Expose[] = [
            e.numeric("device_address_preset", ea.STATE_SET).withDescription("Device Address").withValueMin(1).withValueMax(9999999),
            e.text("device_password_preset", ea.STATE_SET).withDescription("Meter Password"),
            e.numeric("device_measurement_preset", ea.ALL).withDescription("Measurement Period").withValueMin(1).withValueMax(255),
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["device_address_preset"],
                convertSet: async (entity, key, value: string, meta) => {
                    const device_address_preset = Number.parseInt(value, 10);
                    await entity.write("seMetering", {[attrElCityMeterAddressPreset]: {value: device_address_preset, type: 0x23}});
                    return {readAfterWriteTime: 250, state: {device_address_preset: value}};
                },
            },
            {
                key: ["device_password_preset"],
                convertSet: async (entity, key, value, meta) => {
                    const device_password_preset = value.toString();
                    await entity.write("seMetering", {[attrElCityMeterPasswordPreset]: {value: device_password_preset, type: 0x41}});
                    return {readAfterWriteTime: 250, state: {device_password_preset: value}};
                },
            },
            {
                key: ["device_measurement_preset"],
                convertSet: async (entity, key, value: string, meta) => {
                    const device_measurement_preset = Number.parseInt(value, 10);
                    await entity.write("seMetering", {[attrElCityMeterMeasurementPreset]: {value: device_measurement_preset, type: 0x20}});
                    return {readAfterWriteTime: 250, state: {device_measurement_preset: value}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read("seMetering", [attrElCityMeterMeasurementPreset]);
                },
            },
        ];
        const fromZigbee: Fz.Converter[] = [
            {
                cluster: "seMetering",
                type: ["readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValueAny = {};
                    if (msg.data[attrElCityMeterMeasurementPreset] !== undefined) {
                        const data = Number.parseInt(msg.data[attrElCityMeterMeasurementPreset]);
                        result.device_measurement_preset = data;
                    }
                    return result;
                },
            },
        ];
        return {
            exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
};

function waterPreset(): ModernExtend {
    const exposes: Expose[] = [
        e
            .composite("preset", "preset", ea.SET)
            .withFeature(
                e
                    .numeric("hot_water_preset", ea.SET)
                    .withValueMin(0)
                    .withValueMax(99999999)
                    .withValueStep(1)
                    .withUnit("L")
                    .withDescription("Preset hot water"),
            )
            .withFeature(
                e
                    .numeric("cold_water_preset", ea.SET)
                    .withValueMin(0)
                    .withValueMax(99999999)
                    .withValueStep(1)
                    .withUnit("L")
                    .withDescription("Preset cold water"),
            )
            .withFeature(
                e
                    .numeric("step_water_preset", ea.SET)
                    .withValueMin(1)
                    .withValueMax(100)
                    .withValueStep(1)
                    .withUnit("L")
                    .withDescription("Preset step water"),
            ),
    ];

    const toZigbee: Tz.Converter[] = [
        {
            key: ["preset"],
            convertSet: async (entity, key, value, meta) => {
                const endpoint = meta.device.getEndpoint(3);
                const values = {
                    hot_water: (value as any).hot_water_preset,
                    cold_water: (value as any).cold_water_preset,
                    step_water: (value as any).step_water_preset,
                };
                if (values.hot_water !== undefined && values.hot_water >= 0) {
                    const hot_water_preset = Number.parseInt(values.hot_water);
                    await endpoint.write("seMetering", {61440: {value: hot_water_preset, type: 0x23}});
                }
                if (values.cold_water !== undefined && values.cold_water >= 0) {
                    const cold_water_preset = Number.parseInt(values.cold_water);
                    await endpoint.write("seMetering", {61441: {value: cold_water_preset, type: 0x23}});
                }
                if (values.step_water !== undefined && values.step_water >= 0) {
                    const step_water_preset = Number.parseInt(values.step_water);
                    await endpoint.write("seMetering", {61442: {value: step_water_preset, type: 0x21}});
                }
            },
        },
    ];
    return {toZigbee, exposes, isModernExtend: true};
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Tuya_CO2Sensor_r01"],
        model: "Tuya_CO2Sensor_r01",
        vendor: "Slacky-DIY",
        description: "Tuya CO2 sensor with custom Firmware",
        extend: [m.co2({reporting: co2Reporting})],
        ota: true,
    },
    {
        zigbeeModel: ["Watermeter_TLSR8258"],
        model: "Watermeter_TLSR8258",
        vendor: "Slacky-DIY",
        description: "Water Meter",
        configure: async (device, coordinatorEndpoint, logger) => {
            const thirdEndpoint = device.getEndpoint(3);
            await thirdEndpoint.read("seMetering", [0xf000, 0xf001, 0xf002]);
        },
        extend: [
            m.deviceEndpoints({
                endpoints: {
                    "1": 1,
                    "2": 2,
                    "3": 3,
                    "4": 4,
                    "5": 5,
                },
            }),
            m.iasZoneAlarm({zoneType: "water_leak", zoneAttributes: ["alarm_1"]}),
            m.battery({
                voltage: true,
                voltageReporting: true,
                percentageReportingConfig: batteryReporting,
                voltageReportingConfig: batteryReporting,
            }),
            m.enumLookup({
                name: "switch_actions",
                endpointName: "4",
                lookup: {on_off: 0, off_on: 1, toggle: 2},
                cluster: "genOnOffSwitchCfg",
                attribute: "switchActions",
                description: "Actions switch 1",
            }),
            m.enumLookup({
                name: "switch_actions",
                endpointName: "5",
                lookup: {on_off: 0, off_on: 1, toggle: 2},
                cluster: "genOnOffSwitchCfg",
                attribute: "switchActions",
                description: "Actions switch 2",
            }),
            m.numeric({
                name: "volume",
                endpointNames: ["1"],
                access: "STATE_GET",
                cluster: "seMetering",
                attribute: "currentSummDelivered",
                reporting: {min: 0, max: 300, change: 0},
                unit: "L",
                description: "Hot water",
            }),
            m.numeric({
                name: "volume",
                endpointNames: ["2"],
                access: "STATE_GET",
                cluster: "seMetering",
                attribute: "currentSummDelivered",
                reporting: {min: 0, max: 300, change: 0},
                unit: "L",
                description: "Cold water",
            }),
            waterPreset(),
        ],
        ota: true,
        meta: {multiEndpoint: true},
    },
    {
        zigbeeModel: ["Smoke_Sensor_TLSR8258"],
        model: "Smoke Sensor TLSR8258",
        vendor: "Slacky-DIY",
        description: "Smoke Sensor on Rubezh IP 212-50M2 base",
        extend: [
            m.iasZoneAlarm({zoneType: "smoke", zoneAttributes: ["alarm_1", "tamper", "battery_low"]}),
            m.battery({
                voltage: true,
                voltageReporting: true,
                percentageReportingConfig: batteryReporting,
                voltageReportingConfig: batteryReporting,
            }),
            m.commandsOnOff(),
            m.enumLookup({
                access: "STATE",
                name: "switch_type",
                lookup: {toggle: 0},
                cluster: "genOnOffSwitchCfg",
                attribute: "switchType",
                description: "Type switch",
            }),
            m.enumLookup({
                name: "switch_actions",
                lookup: {on_off: 0, off_on: 1, toggle: 2},
                cluster: "genOnOffSwitchCfg",
                attribute: "switchActions",
                description: "Actions switch",
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["Electricity_meter_B85"],
        model: "Electricity Meter TLSR8258",
        vendor: "Slacky-DIY",
        description: "Electricity Meter",
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await endpoint1.read("seMetering", ["remainingBattLife", "status", attrElCityMeterMeasurementPreset]);
            await endpoint1.read("seMetering", ["divisor"]);
            await endpoint1.read("seMetering", ["multiplier"]);
            await endpoint1.read("seMetering", ["currentTier1SummDelivered"]);
            await endpoint1.read("seMetering", ["currentTier2SummDelivered"]);
            await endpoint1.read("seMetering", ["currentTier3SummDelivered"]);
            await endpoint1.read("seMetering", ["currentTier4SummDelivered"]);
            await endpoint1.read("seMetering", ["currentSummDelivered"]);
            await endpoint1.read("seMetering", ["meterSerialNumber"]);
            await endpoint1.read("seMetering", [attrElCityMeterMeasurementPreset]);
            await endpoint1.read("seMetering", [attrElCityMeterModelName]);
            await endpoint1.read("haElectricalMeasurement", ["acVoltageDivisor"]);
            await endpoint1.read("haElectricalMeasurement", ["acVoltageMultiplier"]);
            await endpoint1.read("haElectricalMeasurement", ["rmsVoltage"]);
            await endpoint1.read("haElectricalMeasurement", ["acCurrentDivisor"]);
            await endpoint1.read("haElectricalMeasurement", ["acCurrentMultiplier"]);
            await endpoint1.read("haElectricalMeasurement", ["instantaneousLineCurrent"]);
            await endpoint1.read("haElectricalMeasurement", ["acPowerDivisor"]);
            await endpoint1.read("haElectricalMeasurement", ["acPowerMultiplier"]);
            await endpoint1.read("haElectricalMeasurement", ["apparentPower"]);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["seMetering", "haElectricalMeasurement", "genDeviceTempCfg"]);
            const payload_tariff1 = [
                {attribute: {ID: 0x0100, type: 0x25}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0},
            ];
            await endpoint1.configureReporting("seMetering", payload_tariff1);
            const payload_tariff2 = [
                {attribute: {ID: 0x0102, type: 0x25}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0},
            ];
            await endpoint1.configureReporting("seMetering", payload_tariff2);
            const payload_tariff3 = [
                {attribute: {ID: 0x0104, type: 0x25}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0},
            ];
            await endpoint1.configureReporting("seMetering", payload_tariff3);
            const payload_tariff4 = [
                {attribute: {ID: 0x0106, type: 0x25}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0},
            ];
            await endpoint1.configureReporting("seMetering", payload_tariff4);
            await reporting.currentSummDelivered(endpoint1, {min: 0, max: 300, change: 0});
            const payload_status = [{attribute: {ID: 0x0200, type: 0x18}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0}];
            await endpoint1.configureReporting("seMetering", payload_status);
            const payload_battery_life = [
                {attribute: {ID: 0x0201, type: 0x20}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0},
            ];
            await endpoint1.configureReporting("seMetering", payload_battery_life);
            const payload_serial_number = [
                {attribute: {ID: 0x0308, type: 0x41}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0},
            ];
            await endpoint1.configureReporting("seMetering", payload_serial_number);
            const payload_date_release = [
                {attribute: {ID: attrElCityMeterDateRelease, type: 0x41}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0},
            ];
            await endpoint1.configureReporting("seMetering", payload_date_release);
            const payload_model_name = [
                {attribute: {ID: attrElCityMeterModelName, type: 0x41}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0},
            ];
            await endpoint1.configureReporting("seMetering", payload_model_name);
            await reporting.rmsVoltage(endpoint1, {min: 0, max: 300, change: 0});
            const payload_current = [
                {attribute: {ID: 0x0501, type: 0x21}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0},
            ];
            await endpoint1.configureReporting("haElectricalMeasurement", payload_current);
            await reporting.apparentPower(endpoint1, {min: 0, max: 300, change: 0});
            const payload_temperature = [
                {attribute: {ID: 0x0000, type: 0x29}, minimumReportInterval: 0, maximumReportInterval: 300, reportableChange: 0},
            ];
            await endpoint1.configureReporting("genDeviceTempCfg", payload_temperature);
        },
        extend: [
            electricityMeterExtend.tarrifs(),
            electricityMeterExtend.powerSupplyParam(),
            electricityMeterExtend.deviceParam(),
            m.enumLookup({
                name: "device_model_preset",
                lookup: {
                    "No Device": 0,
                    "KASKAD-1-MT (MIRTEK)": 1,
                    "KASKAD-11-C1": 2,
                    "MERCURY-206": 3,
                    "ENERGOMERA-CE102M": 4,
                    "ENERGOMERA-CE208BY": 5,
                    "NEVA-MT124": 6,
                    "NARTIS-100": 7,
                },
                cluster: "seMetering",
                attribute: {ID: attrElCityMeterModelPreset, type: 0x30},
                description: "Device Model",
            }),
            electricityMeterExtend.deviceConfig(),
        ],
        ota: true,
    },
];
