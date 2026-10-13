import {Zcl} from "zigbee-herdsman";

import * as fz from "../converters/fromZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, KeyValueAny, ModernExtend, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const heiwaAttributes = {
    batteryVoltage: {ID: 0x040f, type: Zcl.DataType.UINT16},
    language: {ID: 0x0414, type: Zcl.DataType.ENUM8},
    temperatureUnit: {ID: 0x0415, type: Zcl.DataType.ENUM8},
    displayTemperature: {ID: 0x0420, type: Zcl.DataType.INT16},
    temperatureOffset: {ID: 0x0421, type: Zcl.DataType.INT16},
    humidity: {ID: 0x0422, type: Zcl.DataType.UINT8},
    humidityOffset: {ID: 0x0423, type: Zcl.DataType.INT16},
    co2: {ID: 0x0424, type: Zcl.DataType.UINT16},
    co2Offset: {ID: 0x0425, type: Zcl.DataType.INT16},
    displayBrightness: {ID: 0x0426, type: Zcl.DataType.UINT8},
    roomName: {ID: 0x0428, type: Zcl.DataType.CHAR_STR},
    humidityDisplay: {ID: 0x0441, type: Zcl.DataType.ENUM8},
    co2Display: {ID: 0x0442, type: Zcl.DataType.ENUM8},
    displayTemperatureSource: {ID: 0x0461, type: Zcl.DataType.ENUM8},
    centralSetpoint: {ID: 0x0462, type: Zcl.DataType.UINT16},
    setpointStep: {ID: 0x0466, type: Zcl.DataType.ENUM8},
    maximumSetpoint: {ID: 0x0467, type: Zcl.DataType.UINT16},
    minimumSetpoint: {ID: 0x0468, type: Zcl.DataType.UINT16},
    displayedSetpoint: {ID: 0x046a, type: Zcl.DataType.UINT16},
    setpointOnlyUi: {ID: 0x0471, type: Zcl.DataType.ENUM8},
    profileRequest: {ID: 0x0473, type: Zcl.DataType.ENUM8},
    activeProfile: {ID: 0x0474, type: Zcl.DataType.ENUM8},
    heatingDemandIcon: {ID: 0x0475, type: Zcl.DataType.ENUM8},
    coolingDemandIcon: {ID: 0x0476, type: Zcl.DataType.ENUM8},
} as const;

const reporting = {
    displayTemperature: {min: "MIN", max: "1_HOUR", change: 1},
    humidity: {min: "10_SECONDS", max: "1_HOUR", change: 1},
    displayedSetpoint: {min: 1, max: "MAX", change: 5},
} as const;

const profileLookup = {off: 0, eco: 1, reduced: 2, comfort: 3};
const profileNames: Record<number, keyof typeof profileLookup> = {0: "off", 1: "eco", 2: "reduced", 3: "comfort"};

function withNumericValidation(result: ModernExtend, validate: (value: number, key: string) => void): ModernExtend {
    const converter = result.toZigbee[0];
    const convertSet = converter?.convertSet;
    if (!converter || !convertSet) throw new Error("Validated numeric extend must be writable");
    // m.numeric exposes constraints to UIs but does not enforce them before writing.
    converter.convertSet = async (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        validate(value, key);
        return await convertSet(entity, key, value, meta);
    };
    return result;
}

function validateRange(min: number, max: number, step?: number): (value: number, key: string) => void {
    return (value, key) => {
        if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${key} must be between ${min} and ${max}`);
        if (step !== undefined) {
            const steps = (value - min) / step;
            if (Math.abs(steps - Math.round(steps)) > 1e-9) throw new Error(`${key} must use ${step} increments`);
        }
    };
}

function heiwaThermostat(): ModernExtend {
    const result: ModernExtend = {
        exposes: [e.climate().withSetpoint("current_heating_setpoint", 18, 27, 0.5).withLocalTemperature()],
        fromZigbee: [],
        toZigbee: [],
        configure: [],
        isModernExtend: true,
    };

    const localTemperature = m.numeric({
        name: "local_temperature",
        cluster: "hvacThermostat",
        attribute: heiwaAttributes.displayTemperature,
        description: "Temperature used by the stock display",
        unit: "°C",
        access: "STATE",
        scale: 10,
        reporting: reporting.displayTemperature,
    });
    const currentHeatingSetpoint = m.numeric({
        name: "current_heating_setpoint",
        cluster: "hvacThermostat",
        attribute: heiwaAttributes.displayedSetpoint,
        description: "Setpoint currently displayed by the thermostat",
        unit: "°C",
        access: "STATE_GET",
        scale: 10,
        reporting: reporting.displayedSetpoint,
    });

    result.fromZigbee.push(...localTemperature.fromZigbee, ...currentHeatingSetpoint.fromZigbee);
    result.toZigbee.push(...localTemperature.toZigbee, ...currentHeatingSetpoint.toZigbee);
    result.configure.push(...localTemperature.configure, ...currentHeatingSetpoint.configure);
    const setpointConverter = result.toZigbee.find((converter) => converter.key.includes("current_heating_setpoint"));
    if (!setpointConverter) throw new Error("Missing Heiwa setpoint converter");
    setpointConverter.convertSet = async (entity, key, value) => {
        utils.assertNumber(value, key);
        if (!Number.isFinite(value) || value < 18 || value > 27 || Math.round(value * 2) !== value * 2) {
            throw new Error(`${key} must be between 18 and 27 °C in 0.5 °C increments, got ${value}`);
        }
        await entity.write("hvacThermostat", {
            occupiedCoolingSetpoint: (value - 1.5) * 100,
            occupiedHeatingSetpoint: (value + 1.5) * 100,
        });
        const current = (await entity.read("hvacThermostat", [heiwaAttributes.displayedSetpoint.ID])) as KeyValueAny;
        const confirmed = current[heiwaAttributes.displayedSetpoint.ID];
        if (confirmed !== value * 10) throw new Error(`Setpoint ${value} °C was not confirmed by the thermostat`);
        return {state: {current_heating_setpoint: confirmed / 10}};
    };
    result.fromZigbee.push({
        cluster: "hvacThermostat",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const standard = fz.thermostat.convert(model, msg, publish, options, meta) as KeyValueAny | undefined;
            if (standard?.system_mode !== undefined) {
                return {system_mode: standard.system_mode, remote_power: standard.system_mode === "off" ? "OFF" : "ON"};
            }
        },
    } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>);

    return result;
}

function batteryPercentage(): ModernExtend {
    return m.numeric({
        name: "battery",
        cluster: "hvacThermostat",
        attribute: heiwaAttributes.batteryVoltage,
        description: "Estimated remaining battery percentage",
        unit: "%",
        access: "STATE",
        valueMin: 0,
        valueMax: 100,
        valueStep: 25,
        reporting: false,
        fzConvert: (model, msg) => {
            const raw = msg.data[heiwaAttributes.batteryVoltage.ID];
            if (raw === undefined) return;
            utils.assertNumber(raw);
            const voltage = raw / 100;
            return {battery: voltage >= 6.0 ? 100 : voltage >= 5.9 ? 75 : voltage >= 5.8 ? 50 : voltage >= 5.7 ? 25 : 0};
        },
    });
}

function profileControl(): ModernExtend {
    const result = m.enumLookup({
        name: "profile",
        cluster: "hvacThermostat",
        attribute: heiwaAttributes.profileRequest,
        description: "Request a stock thermostat profile",
        lookup: profileLookup,
        reporting: false,
    });
    const converter = result.toZigbee[0];
    result.fromZigbee = [];
    converter.convertSet = async (entity, key, value) => {
        utils.assertString(value, key);
        const requested = profileLookup[value as keyof typeof profileLookup];
        if (requested === undefined) throw new Error(`Unsupported profile: ${value}`);
        await entity.write("hvacThermostat", {
            [heiwaAttributes.profileRequest.ID]: {value: requested, type: heiwaAttributes.profileRequest.type},
        });
        for (let attempt = 0; attempt < 4; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            const current = (await entity.read("hvacThermostat", [heiwaAttributes.activeProfile.ID])) as KeyValueAny;
            if (current[heiwaAttributes.activeProfile.ID] === requested) {
                return {state: {profile: value, active_profile: value, remote_power: requested === 0 ? "OFF" : "ON"}};
            }
        }
        throw new Error(`Profile request ${value} was not confirmed by the thermostat`);
    };
    converter.convertGet = async (entity) => {
        await entity.read("hvacThermostat", [heiwaAttributes.activeProfile.ID]);
    };
    return result;
}

function activeProfile(): ModernExtend {
    return m.enumLookup({
        name: "active_profile",
        cluster: "hvacThermostat",
        attribute: heiwaAttributes.activeProfile,
        description: "Stock thermostat profile currently active",
        lookup: profileLookup,
        access: "STATE",
        reporting: {min: 1, max: "MAX", change: null},
        fzConvert: (model, msg) => {
            const raw = msg.data[heiwaAttributes.activeProfile.ID];
            if (raw === undefined) return;
            utils.assertNumber(raw);
            const profile = profileNames[raw];
            if (profile === undefined) return;
            return {profile, active_profile: profile, remote_power: profile === "off" ? "OFF" : "ON"};
        },
    });
}

function remotePower(): ModernExtend {
    return {
        exposes: [e.binary("remote_power", ea.STATE, "ON", "OFF")],
        fromZigbee: [],
        toZigbee: [],
        configure: [],
        isModernExtend: true,
    };
}

function zoneDemandIcon(): ModernExtend {
    return {
        exposes: [e.enum("zone_demand_icon", ea.ALL, ["none", "heating", "cooling"])],
        fromZigbee: [
            {
                cluster: "hvacThermostat",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg) => {
                    const heating = msg.data[heiwaAttributes.heatingDemandIcon.ID];
                    const cooling = msg.data[heiwaAttributes.coolingDemandIcon.ID];
                    if (heating === undefined && cooling === undefined) return;
                    return {
                        zone_demand_icon:
                            heating !== 0 && heating !== undefined ? "heating" : cooling !== 0 && cooling !== undefined ? "cooling" : "none",
                    };
                },
            } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>,
        ],
        toZigbee: [
            {
                key: ["zone_demand_icon"],
                convertSet: async (entity, key, value) => {
                    utils.assertString(value, key);
                    const states: Record<string, {heating: number; cooling: number}> = {
                        none: {heating: 0, cooling: 0},
                        heating: {heating: 1, cooling: 0},
                        cooling: {heating: 0, cooling: 1},
                    };
                    const target = states[value];
                    if (!target) throw new Error(`Unsupported ${key} value: ${value}`);
                    const write = async (attribute: (typeof heiwaAttributes)[keyof typeof heiwaAttributes], raw: number) => {
                        await entity.write("hvacThermostat", {[attribute.ID]: {value: raw, type: attribute.type}});
                    };
                    if (value === "heating") {
                        await write(heiwaAttributes.coolingDemandIcon, target.cooling);
                        await write(heiwaAttributes.heatingDemandIcon, target.heating);
                    } else {
                        await write(heiwaAttributes.heatingDemandIcon, target.heating);
                        await write(heiwaAttributes.coolingDemandIcon, target.cooling);
                    }
                    const current = (await entity.read("hvacThermostat", [
                        heiwaAttributes.heatingDemandIcon.ID,
                        heiwaAttributes.coolingDemandIcon.ID,
                    ])) as KeyValueAny;
                    if (
                        current[heiwaAttributes.heatingDemandIcon.ID] !== target.heating ||
                        current[heiwaAttributes.coolingDemandIcon.ID] !== target.cooling
                    ) {
                        throw new Error(`Zone demand icon ${value} was not confirmed by the thermostat`);
                    }
                    return {state: {zone_demand_icon: value}};
                },
                convertGet: async (entity) => {
                    await entity.read("hvacThermostat", [heiwaAttributes.heatingDemandIcon.ID, heiwaAttributes.coolingDemandIcon.ID]);
                },
            } satisfies Tz.Converter,
        ],
        configure: [],
        isModernExtend: true,
    };
}

const refreshAttributeIds = Object.values(heiwaAttributes)
    .filter((attribute) => attribute.ID !== heiwaAttributes.profileRequest.ID)
    .map((attribute) => attribute.ID);

function refreshControl(): ModernExtend {
    return {
        exposes: [e.enum("refresh", ea.SET, ["press"])],
        fromZigbee: [],
        toZigbee: [
            {
                key: ["refresh"],
                convertSet: async (entity, key, value) => {
                    if (value !== "press") throw new Error(`${key} only supports press`);
                    await entity.read("hvacThermostat", refreshAttributeIds);
                    return {state: {refresh: "press"}};
                },
            } satisfies Tz.Converter,
        ],
        configure: [],
        isModernExtend: true,
    };
}

function initialRead(): ModernExtend {
    return {
        exposes: [],
        fromZigbee: [],
        toZigbee: [],
        configure: [
            async (device) => {
                await device.getEndpoint(25).read("hvacThermostat", refreshAttributeIds);
            },
        ],
        isModernExtend: true,
    };
}

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "Thermostat_RF_Model_00000000000", manufacturerName: "Eurevia"}],
        model: "HPZERAD-V1",
        vendor: "Heiwa",
        description: "Ernest thermostat (OEM Eurevia)",
        extend: [
            m.deviceEndpoints({endpoints: {default: 25}}),
            heiwaThermostat(),
            m.numeric({
                name: "display_temperature",
                cluster: "hvacThermostat",
                attribute: heiwaAttributes.displayTemperature,
                description: "Temperature used by the stock display",
                unit: "°C",
                access: "STATE",
                scale: 10,
                reporting: false,
            }),
            withNumericValidation(
                m.numeric({
                    name: "temperature_offset",
                    cluster: "hvacThermostat",
                    attribute: heiwaAttributes.temperatureOffset,
                    description: "Temperature sensor offset",
                    unit: "°C",
                    valueMin: -5,
                    valueMax: 5,
                    valueStep: 0.1,
                    scale: 10,
                    entityCategory: "config",
                    reporting: false,
                }),
                validateRange(-5, 5, 0.1),
            ),
            m.numeric({
                name: "humidity",
                cluster: "hvacThermostat",
                attribute: heiwaAttributes.humidity,
                description: "Measured relative humidity",
                unit: "%",
                access: "STATE",
                reporting: reporting.humidity,
            }),
            withNumericValidation(
                m.numeric({
                    name: "humidity_offset",
                    cluster: "hvacThermostat",
                    attribute: heiwaAttributes.humidityOffset,
                    description: "Humidity sensor offset",
                    unit: "%",
                    valueMin: -20,
                    valueMax: 20,
                    valueStep: 1,
                    entityCategory: "config",
                    reporting: false,
                }),
                validateRange(-20, 20, 1),
            ),
            m.numeric({
                name: "co2",
                cluster: "hvacThermostat",
                attribute: heiwaAttributes.co2,
                description: "Remains zero on variants without a CO2 sensor",
                unit: "ppm",
                access: "STATE",
                reporting: false,
            }),
            withNumericValidation(
                m.numeric({
                    name: "co2_offset",
                    cluster: "hvacThermostat",
                    attribute: heiwaAttributes.co2Offset,
                    description: "CO2 sensor offset",
                    unit: "ppm",
                    valueMin: -1000,
                    valueMax: 1000,
                    valueStep: 1,
                    entityCategory: "config",
                    reporting: false,
                }),
                validateRange(-1000, 1000, 1),
            ),
            withNumericValidation(
                m.numeric({
                    name: "display_brightness",
                    cluster: "hvacThermostat",
                    attribute: heiwaAttributes.displayBrightness,
                    description: "Stock display brightness",
                    valueMin: 0,
                    valueMax: 10,
                    valueStep: 1,
                    scale: 5,
                    entityCategory: "config",
                    reporting: false,
                }),
                validateRange(0, 10, 1),
            ),
            m.enumLookup({
                name: "language",
                cluster: "hvacThermostat",
                attribute: heiwaAttributes.language,
                description: "Language used by the stock display",
                lookup: {french: 0, english: 1},
                entityCategory: "config",
                reporting: false,
            }),
            m.enumLookup({
                name: "temperature_unit",
                cluster: "hvacThermostat",
                attribute: heiwaAttributes.temperatureUnit,
                description: "Temperature unit used by the stock display",
                lookup: {celsius: 0, fahrenheit: 1},
                entityCategory: "config",
                reporting: false,
            }),
            m.enumLookup({
                name: "humidity_display",
                cluster: "hvacThermostat",
                attribute: heiwaAttributes.humidityDisplay,
                description: "Whether humidity is shown on the stock display",
                lookup: {hidden: 0, shown: 1},
                entityCategory: "config",
                reporting: false,
            }),
            m.enumLookup({
                name: "co2_display",
                cluster: "hvacThermostat",
                attribute: heiwaAttributes.co2Display,
                description: "Whether CO2 is shown on the stock display",
                lookup: {hidden: 0, shown: 1},
                entityCategory: "config",
                reporting: false,
            }),
            m.enumLookup({
                name: "display_temperature_source",
                cluster: "hvacThermostat",
                attribute: heiwaAttributes.displayTemperatureSource,
                description: "Temperature source used by the stock display",
                lookup: {temperature_1: 1, temperature_2: 2},
                entityCategory: "config",
                reporting: false,
            }),
            m.binary({
                name: "setpoint_only_ui",
                cluster: "hvacThermostat",
                attribute: heiwaAttributes.setpointOnlyUi,
                description: "Hide the local M/profile menu while keeping the setpoint arrows",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                entityCategory: "config",
                reporting: false,
            }),
            withNumericValidation(
                m.numeric({
                    name: "setpoint_central",
                    cluster: "hvacThermostat",
                    attribute: heiwaAttributes.centralSetpoint,
                    description: "Central setpoint",
                    unit: "°C",
                    valueMin: 18,
                    valueMax: 27,
                    valueStep: 0.5,
                    scale: 10,
                    entityCategory: "config",
                    reporting: false,
                }),
                validateRange(18, 27, 0.5),
            ),
            withNumericValidation(
                m.numeric({
                    name: "setpoint_minimum",
                    cluster: "hvacThermostat",
                    attribute: heiwaAttributes.minimumSetpoint,
                    description: "Minimum local setpoint",
                    unit: "°C",
                    valueMin: 18,
                    valueMax: 27,
                    valueStep: 0.5,
                    scale: 10,
                    entityCategory: "config",
                    reporting: false,
                }),
                validateRange(18, 27, 0.5),
            ),
            withNumericValidation(
                m.numeric({
                    name: "setpoint_maximum",
                    cluster: "hvacThermostat",
                    attribute: heiwaAttributes.maximumSetpoint,
                    description: "Maximum local setpoint",
                    unit: "°C",
                    valueMin: 18,
                    valueMax: 27,
                    valueStep: 0.5,
                    scale: 10,
                    entityCategory: "config",
                    reporting: false,
                }),
                validateRange(18, 27, 0.5),
            ),
            m.numeric({
                name: "setpoint_step",
                cluster: "hvacThermostat",
                attribute: heiwaAttributes.setpointStep,
                description: "Local setpoint increment",
                unit: "°C",
                valueMin: 0.5,
                valueMax: 1,
                valueStep: 0.5,
                scale: (value, type) => {
                    if (type === "from") return value === 0 ? 1 : 0.5;
                    if (value === 1) return 0;
                    if (value === 0.5) return 1;
                    throw new Error("setpoint_step must be 0.5 or 1.0");
                },
                entityCategory: "config",
                reporting: false,
            }),
            m.text({
                name: "room_name",
                cluster: "hvacThermostat",
                attribute: heiwaAttributes.roomName,
                description: "Room name shown by the stock UI; maximum 16 characters",
                entityCategory: "config",
                validate: (value) => {
                    utils.assertString(value, "room_name");
                    if ([...value].length > 16) throw new Error("room_name must contain at most 16 characters");
                },
            }),
            profileControl(),
            activeProfile(),
            remotePower(),
            zoneDemandIcon(),
            batteryPercentage(),
            m.numeric({
                name: "battery_voltage",
                cluster: "hvacThermostat",
                attribute: heiwaAttributes.batteryVoltage,
                description: "Reported battery voltage",
                unit: "V",
                access: "STATE_GET",
                scale: 100,
                entityCategory: "diagnostic",
                reporting: false,
            }),
            refreshControl(),
            initialRead(),
        ],
    },
];
