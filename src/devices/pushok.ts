import {access, presets} from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, KeyValue, ModernExtend, Tz} from "../lib/types";

const pushokExtend = {
    valveStatus: (args?: Partial<m.EnumLookupArgs<"genMultistateInput">>) =>
        m.enumLookup({
            name: "status",
            lookup: {OFF: 0, ON: 1, MOVING: 2, STUCK: 3},
            cluster: "genMultistateInput",
            attribute: "presentValue",
            zigbeeCommandOptions: {},
            description: "Actual valve status",
            access: "STATE_GET",
            reporting: null,
            ...args,
        }),
    stallTime: (args?: Partial<m.NumericArgs<"genMultistateValue">>) =>
        m.numeric({
            name: "stall_time",
            cluster: "genMultistateValue",
            attribute: "presentValue",
            description: "Timeout for state transition",
            unit: "s",
            access: "ALL",
            valueMin: 0,
            valueMax: 60,
            valueStep: 1,
            reporting: null,
            ...args,
        }),
    extendedTemperature: (): ModernExtend => {
        const exposes = [presets.numeric("temperature", access.STATE).withUnit("°C").withDescription("Measured temperature value")];
        const fromZigbee = [
            {
                cluster: "msTemperatureMeasurement",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    if (msg.data.measuredValue !== undefined) {
                        let temperature = msg.data.measuredValue / 100.0;

                        if (msg.data[0xf001] !== undefined) {
                            temperature += (msg.data[0xf001] as number) / 10.0;
                        }
                        return {temperature};
                    }
                    return {};
                },
            } satisfies Fz.Converter<"msTemperatureMeasurement", undefined, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [];
        return {
            exposes,
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    pok020Thermostat: (): ModernExtend => {
        const exposes = [
            presets
                .climate()
                .withSetpoint("occupied_heating_setpoint", -45, 60, 0.1, access.ALL)
                .withSetpoint("unoccupied_heating_setpoint", -45, 60, 0.1, access.ALL)
                .withLocalTemperature(access.STATE_GET)
                .withSystemMode(["off", "heat"], access.ALL)
                .withLocalTemperatureCalibration(),

            presets.enum("sensor_source", access.ALL, ["internal", "external"]).withDescription("Temperature sensor used for control"),

            presets
                .enum("alarm", access.STATE_GET, [
                    "ok",
                    "never_calibrated",
                    "calibration_error_p0",
                    "calibration_error_p1_not_found",
                    "calibration_error_p1_too_close",
                    "calibration_error_p2_too_small",
                    "calibration_error_p2_not_found",
                    "calibration_lost",
                ])
                .withDescription("Calibration status alarm"),
        ];

        const fromZigbee = [
            {
                cluster: "hvacThermostat",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const data = msg.data as KeyValue;
                    const result: KeyValue = {};
                    if (data.localTemp !== undefined) {
                        result.local_temperature = (data.localTemp as number) / 100.0;
                    }
                    if (data.occupiedHeatingSetpoint !== undefined) {
                        result.occupied_heating_setpoint = (data.occupiedHeatingSetpoint as number) / 100.0;
                    }
                    if (data.unoccupiedHeatingSetpoint !== undefined) {
                        result.unoccupied_heating_setpoint = (data.unoccupiedHeatingSetpoint as number) / 100.0;
                    }
                    if (data.systemMode !== undefined) {
                        const map: Record<number, string> = {
                            0: "off",
                            4: "heat",
                        };
                        const raw = data.systemMode as number;
                        result.system_mode = map[raw] ?? raw;
                    }

                    if (data.localTemperatureCalibration !== undefined) {
                        const raw = data.localTemperatureCalibration as number;
                        result.local_temperature_calibration = raw / 10.0;
                    }

                    if (data.remoteSensing !== undefined) {
                        const rs = data.remoteSensing as number;
                        result.remote_sensing = rs;
                        result.sensor_source = (rs & 0x01) !== 0 ? "external" : "internal";
                    }

                    if (data.alarmMask !== undefined) {
                        const am = data.alarmMask as number;
                        const alarmMap: Record<number, string> = {
                            0: "ok",
                            1: "never_calibrated",
                            2: "calibration_error_p0",
                            3: "calibration_error_p1_not_found",
                            4: "calibration_error_p1_too_close",
                            5: "calibration_error_p2_too_small",
                            6: "calibration_error_p2_not_found",
                            7: "calibration_lost",
                        };

                        result.alarm_mask = am;
                        result.alarm = alarmMap[am] || `unknown_${am}`;
                    }

                    return result;
                },
            } satisfies Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]>,
        ];

        const toZigbee: Tz.Converter[] = [
            {
                key: ["occupied_heating_setpoint"],
                convertSet: async (entity, key, value, meta) => {
                    const temp = Number(value);
                    const raw = Math.round(temp * 100);
                    await entity.write("hvacThermostat", {occupiedHeatingSetpoint: raw});
                    return {state: {occupied_heating_setpoint: temp}};
                },
            },
            {
                key: ["unoccupied_heating_setpoint"],
                convertSet: async (entity, key, value, meta) => {
                    const temp = Number(value);
                    const raw = Math.round(temp * 100);
                    await entity.write("hvacThermostat", {unoccupiedHeatingSetpoint: raw});
                    return {state: {unoccupied_heating_setpoint: temp}};
                },
            },
            {
                key: ["system_mode"],
                convertSet: async (entity, key, value, meta) => {
                    const v = String(value).toLowerCase();
                    const map: Record<string, number> = {
                        off: 0,
                        heat: 4,
                    };
                    const raw = map[v];
                    if (raw === undefined) {
                        throw new Error(`Unsupported system_mode: ${value}`);
                    }
                    await entity.write("hvacThermostat", {systemMode: raw});
                    return {state: {system_mode: v}};
                },
            },
            {
                key: ["local_temperature_calibration"],
                convertSet: async (entity, key, value, meta) => {
                    let v = Number(value);
                    v = Math.round(v * 10) / 10;
                    const raw = Math.round(v * 10);
                    await entity.write("hvacThermostat", {localTemperatureCalibration: raw});
                    return {state: {local_temperature_calibration: v}};
                },
            },
            {
                key: ["sensor_source"],
                convertSet: async (entity, key, value, meta) => {
                    const src = String(value) as "internal" | "external";

                    const current = (meta.state?.remote_sensing as number | undefined) ?? 0;
                    let newMask = current & ~0x01;
                    if (src === "external") {
                        newMask |= 0x01;
                    }

                    await entity.write("hvacThermostat", {remoteSensing: newMask});
                    return {
                        state: {
                            sensor_source: src,
                            remote_sensing: newMask,
                        },
                    };
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

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["POK001"],
        model: "POK001",
        vendor: "PushOk Hardware",
        description: "Battery powered retrofit valve",
        extend: [
            m.onOff({powerOnBehavior: false, configureReporting: false}),
            m.battery({percentage: true, voltage: true, lowStatus: true, percentageReporting: false}),
            pushokExtend.valveStatus(),
            m.identify({isSleepy: true}),
            m.enumLookup({
                name: "kamikaze",
                lookup: {OFF: 0, ON: 1},
                cluster: "genBinaryValue",
                attribute: "presentValue",
                zigbeeCommandOptions: {},
                description: "Allow operation on low battery (can destroy battery)",
                access: "ALL",
                reporting: null,
            }),
            pushokExtend.stallTime(),
            m.enumLookup({
                name: "battery_type",
                lookup: {LIION: 0, ALKALINE: 1, NIMH: 2},
                cluster: "genMultistateOutput",
                attribute: "presentValue",
                zigbeeCommandOptions: {},
                description: "Battery type",
                access: "ALL",
                reporting: null,
            }),
            m.numeric({
                name: "end_lag",
                cluster: "genAnalogValue",
                attribute: "presentValue",
                description: "Endstop lag angle (wrong value can cause damage)",
                unit: "°",
                access: "ALL",
                valueMin: 0,
                valueMax: 15,
                valueStep: 1,
                reporting: null,
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["POK002", "POK007"],
        model: "POK002_POK007",
        vendor: "PushOk Hardware",
        description: "Soil moisture and temperature sensor",
        extend: [
            m.humidity({reporting: null, description: "Measured soil moisture"}),
            m.temperature({reporting: null}),
            m.battery({percentage: true, voltage: true, lowStatus: false, percentageReporting: false}),
            m.numeric({
                name: "max_moisture",
                cluster: "genMultistateValue",
                attribute: "presentValue",
                description: "Upper limit of soil moisture for this location",
                unit: "%",
                access: "ALL",
                valueMin: 1,
                valueMax: 100,
                valueStep: 1,
                reporting: null,
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["POK003"],
        model: "POK003",
        vendor: "PushOk Hardware",
        description: "Water level and temperature sensor",
        extend: [
            m.binary({
                name: "contact",
                valueOn: ["ON", 0x01],
                valueOff: ["OFF", 0x00],
                cluster: "genBinaryInput",
                attribute: "presentValue",
                description: "Indicates if the contact is closed (= true) or open (= false)",
                access: "STATE_GET",
                reporting: null,
            }),
            m.temperature({reporting: null}),
            m.battery({percentage: true, voltage: true, lowStatus: false, percentageReporting: false}),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["POK004"],
        model: "POK004",
        vendor: "PushOk Hardware",
        description: "Solar powered zigbee router and illuminance sensor",
        extend: [m.illuminance({reporting: null}), m.battery({percentage: true, voltage: true, lowStatus: false, percentageReporting: false})],
        ota: true,
    },
    {
        zigbeeModel: ["POK005"],
        model: "POK005",
        vendor: "PushOk Hardware",
        description: "Temperature and Humidity sensor",
        extend: [
            m.humidity({reporting: null}),
            m.temperature({reporting: null}),
            m.battery({percentage: true, voltage: true, lowStatus: false, percentageReporting: false}),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["POK006"],
        model: "POK006",
        vendor: "PushOk Hardware",
        description: "Battery powered garden valve",
        extend: [
            m.onOff({powerOnBehavior: false, configureReporting: false}),
            m.battery({percentage: true, voltage: true, lowStatus: true, percentageReporting: false}),
            pushokExtend.valveStatus(),
            m.identify({isSleepy: true}),
            pushokExtend.stallTime(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["POK008"],
        model: "POK008",
        vendor: "PushOk Hardware",
        description: "Battery powered thermostat relay",
        extend: [
            m.onOff({powerOnBehavior: false, configureReporting: false}),
            m.battery({percentage: true, voltage: true, lowStatus: false, percentageReporting: false}),
            m.temperature({reporting: null}),
            m.numeric({
                name: "tgt_temperature",
                cluster: "genAnalogOutput",
                attribute: "presentValue",
                description: "Target temperature",
                unit: "C",
                access: "ALL",
                valueMin: -45,
                valueMax: 125,
                valueStep: 1,
                reporting: null,
            }),
            m.numeric({
                name: "hysteresis",
                cluster: "genAnalogValue",
                attribute: "presentValue",
                description: "Temperature hysteresis",
                unit: "C",
                access: "ALL",
                valueMin: 0.1,
                valueMax: 40,
                valueStep: 0.1,
                reporting: null,
            }),
            m.enumLookup({
                name: "set_op_mode",
                lookup: {monitor: 0, heater: 1, cooler: 2, monitor_inverted: 3, heater_inverted: 4, cooler_inverted: 5},
                cluster: "genMultistateOutput",
                attribute: "presentValue",
                zigbeeCommandOptions: {},
                description: "Operation mode",
                access: "ALL",
                reporting: null,
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["POK009"],
        model: "POK009",
        vendor: "PushOk Hardware",
        description: "Voltage monitor",
        extend: [
            m.numeric({
                name: "ext_voltage",
                cluster: "genAnalogInput",
                attribute: "presentValue",
                description: "Mains voltage",
                unit: "V",
                precision: 1,
                access: "STATE_GET",
                reporting: null,
            }),
            m.binary({
                name: "comp_state",
                valueOn: ["NORMAL", 0x01],
                valueOff: ["LOW", 0x00],
                cluster: "genBinaryInput",
                attribute: "presentValue",
                description: "Voltage status",
                access: "STATE_GET",
                reporting: null,
            }),
            m.numeric({
                name: "tgt_voltage",
                cluster: "genMultistateValue",
                attribute: "presentValue",
                description: "Voltage threshold",
                unit: "V",
                access: "ALL",
                valueMin: 4,
                valueMax: 340,
                valueStep: 1,
                reporting: null,
            }),
            m.enumLookup({
                name: "voltage_type",
                lookup: {AC: 0, DC: 1},
                cluster: "genMultistateOutput",
                attribute: "presentValue",
                zigbeeCommandOptions: {},
                description: "Mode",
                access: "ALL",
                reporting: null,
            }),
            m.identify({isSleepy: true}),
            m.battery({percentage: true, voltage: true, lowStatus: true, percentageReporting: false}),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["POK010"],
        model: "POK010",
        vendor: "PushOk Hardware",
        description: "Water level and temperature sensor",
        extend: [
            m.binary({
                name: "contact",
                valueOn: ["ON", 0x01],
                valueOff: ["OFF", 0x00],
                cluster: "genBinaryInput",
                attribute: "presentValue",
                description: "Indicates if the contact is closed (= true) or open (= false)",
                access: "STATE_GET",
                reporting: null,
            }),
            m.temperature({reporting: null}),
            m.humidity({reporting: null, access: "STATE"}),
            m.battery({percentage: true, voltage: true, lowStatus: false, percentageReporting: false}),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["POK011"],
        model: "POK011",
        vendor: "PushOk Hardware",
        description: "Illuminance sensor",
        extend: [m.illuminance({reporting: null}), m.battery({percentage: true, voltage: true, lowStatus: false, percentageReporting: false})],
        ota: true,
    },
    {
        zigbeeModel: ["POK012"],
        model: "POK012",
        vendor: "PushOk Hardware",
        description: "20 dBm Zigbee router with battery backup for indoor/outdoor use",
        extend: [
            m.enumLookup({
                name: "battery_state",
                lookup: {missing: 0, charging: 1, full: 2, discharging: 3},
                cluster: "genMultistateInput",
                attribute: "presentValue",
                zigbeeCommandOptions: {},
                description: "Battery state",
                access: "STATE_GET",
                reporting: null,
            }),
            m.iasZoneAlarm({
                zoneType: "generic",
                zoneAttributes: ["ac_status", "battery_defect"],
                alarmTimeout: false,
            }),
            m.battery({percentage: true, voltage: true, lowStatus: false, percentageReporting: false}),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["POK014"],
        model: "POK014",
        vendor: "PushOk Hardware",
        description: "External probe temperature sensor: k-type",
        extend: [pushokExtend.extendedTemperature(), m.battery({percentage: true, voltage: true, lowStatus: false, percentageReporting: false})],
        ota: true,
    },
    {
        zigbeeModel: ["POK015"],
        model: "POK015",
        vendor: "PushOk Hardware",
        description: "External probe temperature sensor: pt1000",
        extend: [pushokExtend.extendedTemperature(), m.battery({percentage: true, voltage: true, lowStatus: false, percentageReporting: false})],
        ota: true,
    },
    {
        zigbeeModel: ["POK016"],
        model: "POK016",
        vendor: "PushOk Hardware",
        description: "Battery powered window opener",
        extend: [
            m.windowCovering({controls: ["lift"], coverInverted: false, stateSource: "lift", configureReporting: false, coverMode: false}),
            m.battery({percentage: true, voltage: true, lowStatus: false, percentageReporting: false}),
            m.enumLookup({
                name: "force_level",
                lookup: {low: 0, mid: 1, high: 2},
                cluster: "genMultistateOutput",
                attribute: "presentValue",
                zigbeeCommandOptions: {},
                description: "Force level at which the window stops",
                access: "ALL",
                reporting: null,
            }),
            m.enumLookup({
                name: "status",
                lookup: {off: 0, on: 1, moving: 2, stuck: 3, middle: 4},
                cluster: "genMultistateInput",
                attribute: "presentValue",
                zigbeeCommandOptions: {},
                description: "Actual window status",
                access: "STATE_GET",
                reporting: null,
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["POK017"],
        model: "POK017",
        vendor: "PushOk Hardware",
        description: "Battery powered greenhouse vent",
        extend: [
            m.windowCovering({controls: ["lift"], coverInverted: false, stateSource: "lift", configureReporting: false, coverMode: false}),
            m.battery({percentage: true, voltage: true, lowStatus: false, percentageReporting: false}),
            m.enumLookup({
                name: "thermostat_preset",

                lookup: {off: 0, level_1: 1, level_2: 2, level_3: 3, level_4: 4, level_5: 5, level_6: 6, level_7: 7, level_8: 8, level_9: 9},
                cluster: "genMultistateOutput",
                attribute: "presentValue",
                zigbeeCommandOptions: {},
                description: "Heat sensitivity level for automatic vent opening",
                access: "ALL",
                reporting: null,
            }),
            m.enumLookup({
                name: "status",
                lookup: {off: 0, on: 1, moving: 2, stuck: 3, middle: 4},
                cluster: "genMultistateInput",
                attribute: "presentValue",
                zigbeeCommandOptions: {},
                description: "Actual window status",
                access: "STATE_GET",
                reporting: null,
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["POK020"],
        model: "POK020",
        vendor: "PushOk Hardware",
        description: "Battery powered thermostat valve",
        extend: [
            m.onOff({powerOnBehavior: false, configureReporting: false}),
            m.battery({percentage: true, voltage: true, lowStatus: false, percentageReporting: false}),
            m.numeric({
                name: "rod_zero_position",
                cluster: "genAnalogInput",
                attribute: "resolution",
                description: "Rod zero position",
                unit: "mm",
                access: "STATE_GET",
                precision: 1,
                reporting: null,
            }),
            m.numeric({
                name: "rod_length",
                cluster: "genAnalogInput",
                attribute: "presentValue",
                description: "Rod length",
                unit: "mm",
                access: "STATE_GET",
                precision: 1,
                reporting: null,
            }),
            m.numeric({
                name: "rod_position",
                cluster: "genAnalogOutput",
                attribute: "presentValue",
                description: "Rod position",
                unit: "%",
                access: "ALL",
                valueMin: 0,
                valueMax: 100,
                valueStep: 0.5,
                precision: 1,
                reporting: null,
            }),
            m.numeric({
                name: "external_temperature",
                cluster: "genAnalogValue",
                attribute: "presentValue",
                description: "External temperature",
                unit: "°C",
                access: "ALL",
                valueMin: -50,
                valueMax: 120,
                valueStep: 0.5,
                precision: 1,
                reporting: null,
            }),
            m.enumLookup({
                name: "control_preset",
                lookup: {conservative: 0, moderate: 1, aggressive: 2},
                cluster: "genMultistateOutput",
                attribute: "presentValue",
                zigbeeCommandOptions: {},
                description: "Control steps preset",
                access: "ALL",
                reporting: null,
            }),
            pushokExtend.pok020Thermostat(),
        ],
        ota: true,
    },
];
