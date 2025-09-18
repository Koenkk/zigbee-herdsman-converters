import {Zcl, ZSpec} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import {type BoschBmctCluster, boschBmctExtend, boschBsenExtend, boschBsirExtend, manufacturerOptions} from "../lib/bosch";
import * as constants from "../lib/constants";
import {repInterval} from "../lib/constants";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import {payload} from "../lib/reporting";
import * as globalStore from "../lib/store";
import type {DefinitionWithExtend, Expose, Fz, KeyValue, ModernExtend, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const NS = "zhc:bosch";

// Universal Switch II
const buttonMap: {[key: string]: number} = {
    config_led_top_left_press: 0x10,
    config_led_top_right_press: 0x11,
    config_led_bottom_left_press: 0x12,
    config_led_bottom_right_press: 0x13,
    config_led_top_left_longpress: 0x20,
    config_led_top_right_longpress: 0x21,
    config_led_bottom_left_longpress: 0x22,
    config_led_bottom_right_longpress: 0x23,
};

// Universal Switch II
const labelShortPress = `Specifies LED color (rgb) and pattern on short press as hex string.
0-2: RGB value (e.g. ffffff = white)
3: Light position (01=top, 02=bottom, 00=full)
4-7: Durations for sequence fade-in -> on -> fade-out -> off (e.g. 01020102)
8: Number of Repetitions (01=1 to ff=255)
Example: ff1493000104010001`;

// Universal Switch II
const labelLongPress = `Specifies LED color (rgb) and pattern on long press as hex string.
0-2: RGB value (e.g. ffffff = white)
3: Light position (01=top, 02=bottom, 00=full)
4-7: Durations for sequence fade-in -> on -> fade-out -> off (e.g. 01020102)
8: Number of Repetitions (01=1 to ff=255)
Example: ff4200000502050001`;

// Universal Switch II
const labelConfirmation = `Specifies LED color (rgb) and pattern of the confirmation response as hex string.
0-2: RGB value (e.g. ffffff = white)
3: Light position (01=top, 02=bottom, 00=full)
4-7: Durations for sequence fade-in -> on -> fade-out -> off (e.g. 01020102)
8: Number of Repetitions (01=1 to ff=255)
Example: 30ff00000102010001`;

interface BoschHvacThermostat {
    attributes: {
        operatingMode: number;
        heatingDemand: number;
        valveAdaptStatus: number;
        remoteTemperature: number;
        windowDetection: number;
        boostHeating: number;
    };
    commands: {
        calibrateValve: Record<string, never>;
    };
    commandResponses: never;
}

interface BoschHvacUserInterfaceCfg {
    attributes: {
        displayOrientation: number;
        displayedTemperature: number;
        displayOntime: number;
        displayBrightness: number;
    };
    commands: never;
    commandResponses: never;
}

interface TwinguardSmokeDetector {
    attributes: {
        sensitivity: number;
    };
    commands: {
        initiateTestMode: Record<string, never>;
    };
    commandResponses: never;
}
interface TwinguardMeasurements {
    attributes: {
        humidity: number;
        unknown1: number;
        unknown2: number;
        airpurity: number;
        temperature: number;
        illuminance: number;
        battery: number;
        unknown3: number;
        unknown4: number;
        pressure: number;
        unknown6: number;
        unknown7: number;
        unknown8: number;
    };
    commands: never;
    commandResponses: never;
}
interface TwinguardOptions {
    attributes: {
        unknown1: number;
        // biome-ignore lint/style/useNamingConvention: TODO
        pre_alarm: number;
    };
    commands: {
        burglarAlarm: {data: number};
    };
    commandResponses: never;
}
interface TwinguardSetup {
    attributes: {
        unknown1: number;
        unknown2: number;
        heartbeat: number;
    };
    commands: {pairingCompleted: Record<string, never>};
    commandResponses: never;
}
interface TwinguardAlarm {
    attributes: {
        // biome-ignore lint/style/useNamingConvention: TODO
        alarm_status: number;
    };
    commands: {burglarAlarm: {data: number}};
    commandResponses: never;
}

interface BoschSeMetering {
    attributes: never;
    commands: {
        resetEnergyReading: Record<string, never>;
    };
    commandResponses: never;
}

interface BoschSpecificBwa1 {
    attributes: {alarmOnMotion: number};
    commands: never;
    commandResponses: never;
}

interface BoschSpecificBhius {
    attributes: never;
    commands: {
        confirmButtonPressed: {data: Buffer};
        pairingCompleted: {data: Buffer};
    };
    commandResponses: never;
}

interface BoschSmokeAlarmSiren {
    attributes: never;
    commands: {boschSmokeAlarmSiren: {data: number}};
    commandResponses: never;
}

const boschBmctRzSettings = {
    deviceModes: {
        switch: 0x00,
        pulsed: 0x01,
    },
    switchTypes: {
        button: 0x05,
        rocker_switch: 0x07,
        none: 0x00,
    },
    switchModes: {
        coupled: 0x00,
        decoupled: 0x01,
    },
    hasDualSwitchInputs: false,
};

const boschBmctDzSettings = {
    switchTypes: {
        button: 0x05,
        none: 0x00,
    },
    switchModes: {
        coupled: 0x00,
        decoupled: 0x01,
    },
    hasDualSwitchInputs: false,
};

const boschExtend = {
    hvacThermostatCluster: () =>
        m.deviceAddCustomCluster("hvacThermostat", {
            ID: Zcl.Clusters.hvacThermostat.ID,
            attributes: {
                operatingMode: {
                    ID: 0x4007,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                },
                heatingDemand: {
                    ID: 0x4020,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                },
                valveAdaptStatus: {
                    ID: 0x4022,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                },
                remoteTemperature: {
                    ID: 0x4040,
                    type: Zcl.DataType.INT16,
                    manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                },
                windowDetection: {
                    ID: 0x4042,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                },
                boostHeating: {
                    ID: 0x4043,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                },
            },
            commands: {
                calibrateValve: {
                    ID: 0x41,
                    parameters: [],
                },
            },
            commandsResponse: {},
        }),
    hvacUserInterfaceCfgCluster: () =>
        m.deviceAddCustomCluster("hvacUserInterfaceCfg", {
            ID: Zcl.Clusters.hvacUserInterfaceCfg.ID,
            attributes: {
                displayOrientation: {
                    ID: 0x400b,
                    type: Zcl.DataType.UINT8,
                    manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                },
                displayedTemperature: {
                    ID: 0x4039,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                },
                displayOntime: {
                    ID: 0x403a,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                },
                displayBrightness: {
                    ID: 0x403b,
                    type: Zcl.DataType.ENUM8,
                    manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                },
            },
            commands: {},
            commandsResponse: {},
        }),
    operatingMode: () =>
        m.enumLookup<"hvacThermostat", BoschHvacThermostat>({
            name: "operating_mode",
            cluster: "hvacThermostat",
            attribute: "operatingMode",
            reporting: {min: "10_SECONDS", max: "MAX", change: null},
            description: "Bosch-specific operating mode (overrides system mode)",
            lookup: {schedule: 0x00, manual: 0x01, pause: 0x05},
            zigbeeCommandOptions: manufacturerOptions,
        }),
    windowDetection: () =>
        m.binary<"hvacThermostat", BoschHvacThermostat>({
            name: "window_detection",
            cluster: "hvacThermostat",
            attribute: "windowDetection",
            description: "Enable/disable window open (Lo.) mode",
            valueOn: ["ON", 0x01],
            valueOff: ["OFF", 0x00],
            zigbeeCommandOptions: manufacturerOptions,
        }),
    boostHeating: () =>
        m.binary<"hvacThermostat", BoschHvacThermostat>({
            name: "boost_heating",
            cluster: "hvacThermostat",
            attribute: "boostHeating",
            reporting: {min: "10_SECONDS", max: "MAX", change: null, attribute: "boostHeating"},
            description: "Activate boost heating (5 min. on TRV)",
            valueOn: ["ON", 0x01],
            valueOff: ["OFF", 0x00],
            zigbeeCommandOptions: manufacturerOptions,
        }),
    childLock: () =>
        m.binary({
            name: "child_lock",
            cluster: "hvacUserInterfaceCfg",
            attribute: "keypadLockout",
            description: "Enables/disables physical input on the device",
            valueOn: ["LOCK", 0x01],
            valueOff: ["UNLOCK", 0x00],
        }),
    displayOntime: () =>
        m.numeric<"hvacUserInterfaceCfg", BoschHvacUserInterfaceCfg>({
            name: "display_ontime",
            cluster: "hvacUserInterfaceCfg",
            attribute: "displayOntime",
            description: "Sets the display on-time",
            valueMin: 5,
            valueMax: 30,
            unit: "s",
            zigbeeCommandOptions: manufacturerOptions,
        }),
    displayBrightness: () =>
        m.numeric<"hvacUserInterfaceCfg", BoschHvacUserInterfaceCfg>({
            name: "display_brightness",
            cluster: "hvacUserInterfaceCfg",
            attribute: "displayBrightness",
            description: "Sets brightness of the display",
            valueMin: 0,
            valueMax: 10,
            zigbeeCommandOptions: manufacturerOptions,
        }),
    valveAdaptProcess: (): ModernExtend => {
        const adaptationStatus: KeyValue = {
            none: 0x00,
            ready_to_calibrate: 0x01,
            calibration_in_progress: 0x02,
            error: 0x03,
            success: 0x04,
        };
        const exposes: Expose[] = [
            e
                .binary("valve_adapt_process", ea.ALL, true, false)
                .withLabel("Trigger adaptation process")
                .withDescription('Trigger the valve adaptation process. Only possible when adaptation status is "ready_to_calibrate" or "error".')
                .withCategory("config"),
        ];
        const fromZigbee = [
            {
                cluster: "hvacThermostat",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    if (msg.data.valveAdaptStatus !== undefined) {
                        if (msg.data.valveAdaptStatus === adaptationStatus.calibration_in_progress) {
                            result.valve_adapt_process = true;
                        } else {
                            result.valve_adapt_process = false;
                        }
                    }
                    return result;
                },
            } satisfies Fz.Converter<"hvacThermostat", BoschHvacThermostat, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["valve_adapt_process"],
                convertSet: async (entity, key, value, meta) => {
                    if (value === true) {
                        const adaptStatus = utils.getFromLookup(meta.state.valve_adapt_status, adaptationStatus);
                        switch (adaptStatus) {
                            case adaptationStatus.ready_to_calibrate:
                            case adaptationStatus.error:
                                await entity.command<"hvacThermostat", "calibrateValve", BoschHvacThermostat>(
                                    "hvacThermostat",
                                    "calibrateValve",
                                    {},
                                    manufacturerOptions,
                                );
                                break;
                            default:
                                throw new Error("Valve adaptation process not possible right now.");
                        }
                    }
                    return {state: {valve_adapt_process: value}};
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read<"hvacThermostat", BoschHvacThermostat>("hvacThermostat", ["valveAdaptStatus"], manufacturerOptions);
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
    heatingDemand: (): ModernExtend => {
        const fromZigbee = [
            {
                cluster: "hvacThermostat",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    if (msg.data.heatingDemand !== undefined) {
                        const demand = msg.data.heatingDemand as number;
                        result.pi_heating_demand = demand;
                        result.running_state = demand > 0 ? "heat" : "idle";
                    }
                    return result;
                },
            } satisfies Fz.Converter<"hvacThermostat", BoschHvacThermostat, ["attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["pi_heating_demand"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "pi_heating_demand") {
                        let demand = utils.toNumber(value, key);
                        demand = utils.numberWithinRange(demand, 0, 100);
                        await entity.write<"hvacThermostat", BoschHvacThermostat>("hvacThermostat", {heatingDemand: demand}, manufacturerOptions);
                        return {state: {pi_heating_demand: demand}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    await entity.read<"hvacThermostat", BoschHvacThermostat>("hvacThermostat", ["heatingDemand"], manufacturerOptions);
                },
            },
            {
                key: ["running_state"],
                convertGet: async (entity, key, meta) => {
                    await entity.read<"hvacThermostat", BoschHvacThermostat>("hvacThermostat", ["heatingDemand"], manufacturerOptions);
                },
            },
        ];
        return {
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    ignoreDst: (): ModernExtend => {
        const fromZigbee = [
            {
                cluster: "genTime",
                type: "read",
                convert: async (model, msg, publish, options, meta) => {
                    if ("dstStart" in msg.data && "dstEnd" in msg.data && "dstShift" in msg.data) {
                        const response = {
                            dstStart: {attribute: 0x0003, status: Zcl.Status.SUCCESS, value: 0x00},
                            dstEnd: {attribute: 0x0004, status: Zcl.Status.SUCCESS, value: 0x00},
                            dstShift: {attribute: 0x0005, status: Zcl.Status.SUCCESS, value: 0x00},
                        };
                        await msg.endpoint.readResponse(msg.cluster, msg.meta.zclTransactionSequenceNumber, response);
                    }
                },
            } satisfies Fz.Converter<"genTime", undefined, "read">,
        ];
        return {
            fromZigbee,
            isModernExtend: true,
        };
    },
    seMeteringCluster: () =>
        m.deviceAddCustomCluster("seMetering", {
            ID: Zcl.Clusters.seMetering.ID,
            attributes: {},
            commands: {
                resetEnergyReading: {
                    ID: 0x80,
                    parameters: [],
                },
            },
            commandsResponse: {},
        }),
    resetEnergyReading: (): ModernExtend => {
        const exposes: Expose[] = [
            e
                .enum("reset_energy_reading", ea.SET, ["reset"])
                .withDescription("Triggers the reset of the energy reading to 0 kWh.")
                .withCategory("config"),
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["reset_energy_reading"],
                convertSet: async (entity, key, value, meta) => {
                    await entity.command<"seMetering", "resetEnergyReading", BoschSeMetering>(
                        "seMetering",
                        "resetEnergyReading",
                        {},
                        manufacturerOptions,
                    );
                },
            },
        ];
        return {
            exposes,
            toZigbee,
            isModernExtend: true,
        };
    },
    doorWindowContact: (hasVibrationSensor?: boolean): ModernExtend => {
        const exposes: Expose[] = [
            e.binary("contact", ea.STATE, false, true).withDescription("Indicates whether the device is opened or closed"),
            e
                .enum("action", ea.STATE, ["none", "single", "long"])
                .withDescription("Triggered action (e.g. a button click)")
                .withCategory("diagnostic"),
        ];
        if (hasVibrationSensor) {
            exposes.push(e.binary("vibration", ea.STATE, true, false).withDescription("Indicates whether the device detected vibration"));
        }
        const fromZigbee = [
            {
                cluster: "ssIasZone",
                type: ["commandStatusChangeNotification", "attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const zoneStatus = "zonestatus" in msg.data ? msg.data.zonestatus : msg.data.zoneStatus;
                    if (zoneStatus !== undefined) {
                        const lookup: KeyValue = {0: "none", 1: "single", 2: "long"};
                        const result: KeyValue = {
                            contact: !((zoneStatus & 1) > 0),
                            vibration: (zoneStatus & (1 << 1)) > 0,
                            tamper: (zoneStatus & (1 << 2)) > 0,
                            battery_low: (zoneStatus & (1 << 3)) > 0,
                            supervision_reports: (zoneStatus & (1 << 4)) > 0,
                            restore_reports: (zoneStatus & (1 << 5)) > 0,
                            trouble: (zoneStatus & (1 << 6)) > 0,
                            ac_status: (zoneStatus & (1 << 7)) > 0,
                            test: (zoneStatus & (1 << 8)) > 0,
                            battery_defect: (zoneStatus & (1 << 9)) > 0,
                            action: lookup[(zoneStatus >> 11) & 3],
                        };
                        if (result.action === "none") delete result.action;
                        return result;
                    }
                },
            } satisfies Fz.Converter<"ssIasZone", undefined, ["commandStatusChangeNotification", "attributeReport", "readResponse"]>,
        ];
        return {
            exposes,
            fromZigbee,
            isModernExtend: true,
        };
    },
    smokeAlarm: (): ModernExtend => {
        const smokeAlarm = {
            OFF: 0x0000,
            ON: 0x3c00, // 15360 or 46080 works
        };
        const burglarAlarm = {
            OFF: 0x0001,
            ON: 0xb401, // 46081
        };
        const exposes: Expose[] = [
            e.binary("smoke", ea.STATE, true, false).withDescription("Indicates whether the device detected smoke"),
            e
                .binary("test", ea.STATE, true, false)
                .withDescription("Indicates whether the device is currently performing a test")
                .withCategory("diagnostic"),
            e.binary("alarm_smoke", ea.ALL, true, false).withDescription("Toggle the smoke alarm siren").withCategory("config"),
            e.binary("alarm_burglar", ea.ALL, true, false).withDescription("Toggle the burglar alarm siren").withCategory("config"),
        ];
        const fromZigbee = [
            {
                cluster: "ssIasZone",
                type: ["commandStatusChangeNotification", "attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const zoneStatus = "zonestatus" in msg.data ? msg.data.zonestatus : msg.data.zoneStatus;
                    if (zoneStatus !== undefined) {
                        return {
                            smoke: (zoneStatus & 1) > 0,
                            alarm_smoke: (zoneStatus & (1 << 1)) > 0,
                            battery_low: (zoneStatus & (1 << 3)) > 0,
                            supervision_reports: (zoneStatus & (1 << 4)) > 0,
                            restore_reports: (zoneStatus & (1 << 5)) > 0,
                            alarm_burglar: (zoneStatus & (1 << 7)) > 0,
                            test: (zoneStatus & (1 << 8)) > 0,
                            alarm_silenced: (zoneStatus & (1 << 11)) > 0,
                        };
                    }
                },
            } satisfies Fz.Converter<"ssIasZone", undefined, ["commandStatusChangeNotification", "attributeReport", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["alarm_smoke", "alarm_burglar"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "alarm_smoke") {
                        let transformedValue = "OFF";
                        if (value === true) {
                            transformedValue = "ON";
                        }
                        const index = utils.getFromLookup(transformedValue, smokeAlarm);
                        await entity.command<"ssIasZone", "boschSmokeAlarmSiren", BoschSmokeAlarmSiren>(
                            "ssIasZone",
                            "boschSmokeAlarmSiren",
                            {data: index},
                            manufacturerOptions,
                        );
                        return {state: {alarm_smoke: value}};
                    }
                    if (key === "alarm_burglar") {
                        let transformedValue = "OFF";
                        if (value === true) {
                            transformedValue = "ON";
                        }
                        const index = utils.getFromLookup(transformedValue, burglarAlarm);
                        await entity.command<"ssIasZone", "boschSmokeAlarmSiren", BoschSmokeAlarmSiren>(
                            "ssIasZone",
                            "boschSmokeAlarmSiren",
                            {data: index},
                            manufacturerOptions,
                        );
                        return {state: {alarm_burglar: value}};
                    }
                },
                convertGet: async (entity, key, meta) => {
                    switch (key) {
                        case "alarm_smoke":
                        case "alarm_burglar":
                        case "zone_status":
                            await entity.read("ssIasZone", ["zoneStatus"]);
                            break;
                        default:
                            throw new Error(`Unhandled key boschExtend.smokeAlarm.toZigbee.convertGet ${key}`);
                    }
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
    broadcastAlarm: (): ModernExtend => {
        const sirenState = {
            smoke_off: 0x0000,
            smoke_on: 0x3c00,
            burglar_off: 0x0001,
            burglar_on: 0xb401,
        };
        const exposes: Expose[] = [
            e
                .enum("broadcast_alarm", ea.SET, Object.keys(sirenState))
                .withDescription("Set siren state of all BSD-2 via broadcast")
                .withCategory("config"),
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["broadcast_alarm"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "broadcast_alarm") {
                        const index = utils.getFromLookup(value, sirenState);
                        utils.assertEndpoint(entity);
                        await entity.zclCommandBroadcast<"ssIasZone", "boschSmokeAlarmSiren", BoschSmokeAlarmSiren>(
                            255,
                            ZSpec.BroadcastAddress.SLEEPY,
                            "ssIasZone",
                            "boschSmokeAlarmSiren",
                            {data: index},
                            manufacturerOptions,
                        );
                        return;
                    }
                },
            },
        ];
        return {
            exposes,
            toZigbee,
            isModernExtend: true,
        };
    },
    twinguard: (): ModernExtend => {
        const smokeSensitivity = {
            low: 0x03,
            medium: 0x02,
            high: 0x01,
        };
        const sirenState = {
            stop: 0x00,
            pre_alarm: 0x01,
            fire: 0x02,
            burglar: 0x03,
        };
        const stateOffOn = {
            OFF: 0x00,
            ON: 0x01,
        };
        const exposes: Expose[] = [
            e.binary("smoke", ea.STATE, true, false).withDescription("Indicates whether the device detected smoke"),
            e
                .numeric("temperature", ea.STATE)
                .withValueMin(0)
                .withValueMax(65)
                .withValueStep(0.1)
                .withUnit("°C")
                .withDescription("Measured temperature value"),
            e
                .numeric("humidity", ea.STATE)
                .withValueMin(0)
                .withValueMax(100)
                .withValueStep(0.1)
                .withUnit("%")
                .withDescription("Measured relative humidity"),
            e
                .numeric("voc", ea.STATE)
                .withValueMin(0)
                .withValueMax(50000)
                .withValueStep(1)
                .withLabel("VOC")
                .withUnit("µg/m³")
                .withDescription("Measured VOC value"),
            e
                .numeric("co2", ea.STATE)
                .withValueMin(400)
                .withValueMax(2400)
                .withValueStep(1)
                .withLabel("CO2")
                .withUnit("ppm")
                .withDescription("The measured CO2 (carbon dioxide) value"),
            e.numeric("aqi", ea.STATE).withValueMin(0).withValueMax(500).withValueStep(1).withLabel("AQI").withDescription("Air Quality Index"),
            e.illuminance(),
            e
                .numeric("battery", ea.STATE)
                .withUnit("%")
                .withValueMin(0)
                .withValueMax(100)
                .withDescription("Remaining battery in %")
                .withCategory("diagnostic"),
            e.text("siren_state", ea.STATE).withDescription("Siren state").withCategory("diagnostic"),
            e.enum("alarm", ea.ALL, Object.keys(sirenState)).withDescription("Alarm mode for siren"),
            e.binary("self_test", ea.ALL, true, false).withDescription("Initiate self-test").withCategory("config"),
            e.enum("sensitivity", ea.ALL, Object.keys(smokeSensitivity)).withDescription("Sensitivity of the smoke detector").withCategory("config"),
            e.binary("pre_alarm", ea.ALL, "ON", "OFF").withDescription("Enable/disable pre-alarm").withCategory("config"),
            e.binary("heartbeat", ea.ALL, "ON", "OFF").withDescription("Enable/disable heartbeat (blue LED)").withCategory("config"),
        ];
        const fromZigbee = [
            {
                cluster: "twinguardSmokeDetector",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    if (msg.data.sensitivity !== undefined) {
                        result.sensitivity = Object.keys(smokeSensitivity)[msg.data.sensitivity];
                    }
                    return result;
                },
            } satisfies Fz.Converter<"twinguardSmokeDetector", TwinguardSmokeDetector, ["attributeReport", "readResponse"]>,
            {
                cluster: "twinguardMeasurements",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    if (msg.data.humidity !== undefined) {
                        const humidity = utils.toNumber(msg.data.humidity) / 100.0;
                        if (utils.isInRange(0, 100, humidity)) {
                            result.humidity = humidity;
                        }
                    }
                    if (msg.data.airpurity !== undefined) {
                        const iaq = utils.toNumber(msg.data.airpurity);
                        result.aqi = iaq;
                        let factorVoc = 6;
                        let factorCo2 = 2;
                        if (iaq >= 51 && iaq <= 100) {
                            factorVoc = 10;
                            factorCo2 = 4;
                        } else if (iaq >= 101 && iaq <= 150) {
                            factorVoc = 20;
                            factorCo2 = 4;
                        } else if (iaq >= 151 && iaq <= 200) {
                            factorVoc = 50;
                            factorCo2 = 4;
                        } else if (iaq >= 201 && iaq <= 250) {
                            factorVoc = 100;
                            factorCo2 = 4;
                        } else if (iaq >= 251) {
                            factorVoc = 100;
                            factorCo2 = 4;
                        }
                        result.voc = iaq * factorVoc;
                        result.co2 = iaq * factorCo2 + 400;
                    }
                    if (msg.data.temperature !== undefined) {
                        result.temperature = utils.toNumber(msg.data.temperature) / 100.0;
                    }
                    if (msg.data.illuminance !== undefined) {
                        result.illuminance = utils.precisionRound(msg.data.illuminance / 2, 2);
                    }
                    if (msg.data.battery !== undefined) {
                        result.battery = utils.precisionRound(msg.data.battery / 2, 2);
                    }
                    return result;
                },
            } satisfies Fz.Converter<"twinguardMeasurements", TwinguardMeasurements, ["attributeReport", "readResponse"]>,
            {
                cluster: "twinguardOptions",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    if (msg.data.pre_alarm !== undefined) {
                        result.pre_alarm = Object.keys(stateOffOn)[msg.data.pre_alarm];
                    }
                    return result;
                },
            } satisfies Fz.Converter<"twinguardOptions", TwinguardOptions, ["attributeReport", "readResponse"]>,
            {
                cluster: "twinguardSetup",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    if (msg.data.heartbeat !== undefined) {
                        result.heartbeat = Object.keys(stateOffOn)[msg.data.heartbeat];
                    }
                    return result;
                },
            } satisfies Fz.Converter<"twinguardSetup", TwinguardSetup, ["attributeReport", "readResponse"]>,
            {
                cluster: "twinguardAlarm",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    const lookup: KeyValue = {
                        2097184: "clear",
                        18874400: "self_test",
                        35651616: "burglar",
                        2097282: "pre_alarm",
                        2097281: "fire",
                        2097216: "silenced",
                    };
                    if (msg.data.alarm_status !== undefined) {
                        result.self_test = (msg.data.alarm_status & (1 << 24)) > 0;
                        result.smoke = (msg.data.alarm_status & (1 << 7)) > 0;
                        result.siren_state = lookup[msg.data.alarm_status];
                    }
                    return result;
                },
            } satisfies Fz.Converter<"twinguardAlarm", TwinguardAlarm, ["attributeReport", "readResponse"]>,
            {
                cluster: "genAlarms",
                type: ["commandAlarm", "readResponse"],
                convert: async (model, msg, publish, options, meta) => {
                    const result: KeyValue = {};
                    const lookup: KeyValue = {
                        16: "fire",
                        17: "pre_alarm",
                        20: "clear",
                        22: "silenced",
                    };
                    if ("alarmcode" in msg.data) {
                        result.siren_state = lookup[msg.data.alarmcode];
                        if (msg.data.alarmcode === 0x10 || msg.data.alarmcode === 0x11) {
                            await msg.endpoint.commandResponse(
                                "genAlarms",
                                "alarm",
                                {alarmcode: msg.data.alarmcode, clusterid: 0xe000},
                                {direction: 1},
                            );
                        }
                        return result;
                    }
                },
            } satisfies Fz.Converter<"genAlarms", undefined, ["commandAlarm", "readResponse"]>,
        ];
        const toZigbee: Tz.Converter[] = [
            {
                key: ["sensitivity", "pre_alarm", "self_test", "alarm", "heartbeat"],
                convertSet: async (entity, key, value, meta) => {
                    if (key === "sensitivity") {
                        const index = utils.getFromLookup(value, smokeSensitivity);
                        await entity.write<"twinguardSmokeDetector", TwinguardSmokeDetector>(
                            "twinguardSmokeDetector",
                            {sensitivity: index},
                            manufacturerOptions,
                        );
                        return {state: {sensitivity: value}};
                    }
                    if (key === "pre_alarm") {
                        const index = utils.getFromLookup(value, stateOffOn);
                        await entity.write<"twinguardOptions", TwinguardOptions>("twinguardOptions", {pre_alarm: index}, manufacturerOptions);
                        return {state: {pre_alarm: value}};
                    }
                    if (key === "heartbeat") {
                        const endpoint = meta.device.getEndpoint(12);
                        const index = utils.getFromLookup(value, stateOffOn);
                        await endpoint.write<"twinguardSetup", TwinguardSetup>("twinguardSetup", {heartbeat: index}, manufacturerOptions);
                        return {state: {heartbeat: value}};
                    }
                    if (key === "self_test") {
                        if (value) {
                            await entity.command<"twinguardSmokeDetector", "initiateTestMode", TwinguardSmokeDetector>(
                                "twinguardSmokeDetector",
                                "initiateTestMode",
                                {},
                                manufacturerOptions,
                            );
                        }
                    }
                    if (key === "alarm") {
                        const endpoint = meta.device.getEndpoint(12);
                        const index = utils.getFromLookup(value, sirenState);
                        utils.assertEndpoint(entity);
                        if (index === 0x00) {
                            await entity.commandResponse("genAlarms", "alarm", {alarmcode: 0x16, clusterid: 0xe000}, {direction: 1});
                            await entity.commandResponse("genAlarms", "alarm", {alarmcode: 0x14, clusterid: 0xe000}, {direction: 1});
                            await endpoint.command<"twinguardAlarm", "burglarAlarm", TwinguardAlarm>(
                                "twinguardAlarm",
                                "burglarAlarm",
                                {data: 0x00},
                                manufacturerOptions,
                            );
                        } else if (index === 0x01) {
                            await entity.commandResponse("genAlarms", "alarm", {alarmcode: 0x11, clusterid: 0xe000}, {direction: 1});
                            return {state: {siren_state: "pre_alarm"}};
                        } else if (index === 0x02) {
                            await entity.commandResponse("genAlarms", "alarm", {alarmcode: 0x10, clusterid: 0xe000}, {direction: 1});
                            return {state: {siren_state: "fire"}};
                        } else if (index === 0x03) {
                            await endpoint.command<"twinguardAlarm", "burglarAlarm", TwinguardAlarm>(
                                "twinguardAlarm",
                                "burglarAlarm",
                                {data: 0x01},
                                manufacturerOptions,
                            );
                        }
                    }
                },
                convertGet: async (entity, key, meta) => {
                    switch (key) {
                        case "sensitivity":
                            await entity.read<"twinguardSmokeDetector", TwinguardSmokeDetector>(
                                "twinguardSmokeDetector",
                                ["sensitivity"],
                                manufacturerOptions,
                            );
                            break;
                        case "pre_alarm":
                            await entity.read<"twinguardOptions", TwinguardOptions>("twinguardOptions", ["pre_alarm"], manufacturerOptions);
                            break;
                        case "heartbeat":
                            await meta.device
                                .getEndpoint(12)
                                .read<"twinguardSetup", TwinguardSetup>("twinguardSetup", ["heartbeat"], manufacturerOptions);
                            break;
                        case "alarm":
                        case "self_test":
                            await meta.device
                                .getEndpoint(12)
                                .read<"twinguardAlarm", TwinguardAlarm>("twinguardAlarm", ["alarm_status"], manufacturerOptions);
                            break;
                        default:
                            throw new Error(`Unhandled key boschExtend.twinguard.toZigbee.convertGet ${key}`);
                    }
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
const tzLocal = {
    bhius_config: {
        key: Object.keys(buttonMap),
        convertGet: async (entity, key, meta) => {
            if (buttonMap[key] === undefined) {
                throw new Error(`Unknown key ${key}`);
            }
            await entity.read("boschSpecific", [buttonMap[key as keyof typeof buttonMap]], manufacturerOptions);
        },
        convertSet: async (entity, key, value, meta) => {
            if (buttonMap[key] === undefined) {
                return;
            }

            const buffer = Buffer.from(value as string, "hex");
            if (buffer.length !== 9) throw new Error(`Invalid configuration length: ${buffer.length} (should be 9)`);

            const payload = {
                [buttonMap[key as keyof typeof buttonMap]]: {value: buffer, type: 65},
            };
            await entity.write("boschSpecific", payload, manufacturerOptions);

            const result: {[key: number | string]: string} = {};
            result[key] = value as string;
            return {state: result};
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    bhius_button_press: {
        cluster: "boschSpecific",
        type: "raw",
        options: [e.text("led_response", ea.ALL).withLabel("LED config (confirmation response)").withDescription(labelConfirmation)],
        convert: (model, msg, publish, options, meta) => {
            const sequenceNumber = msg.data.readUInt8(3);
            const buttonId = msg.data.readUInt8(4);
            const longPress = msg.data.readUInt8(5);
            const duration = msg.data.readUInt16LE(6);
            // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
            let buffer;
            if (options.led_response != null) {
                buffer = Buffer.from(options.led_response as string, "hex");
                if (buffer.length !== 9) {
                    logger.error(`Invalid length of led_response: ${buffer.length} (should be 9)`, NS);
                    buffer = Buffer.from("30ff00000102010001", "hex");
                }
            } else {
                buffer = Buffer.from("30ff00000102010001", "hex");
            }

            if (utils.hasAlreadyProcessedMessage(msg, model, sequenceNumber)) return;
            const buttons: {[key: number]: string} = {0: "top_left", 1: "top_right", 2: "bottom_left", 3: "bottom_right"};

            let command = "";
            if (buttonId in buttons) {
                if (longPress && duration > 0) {
                    if (globalStore.hasValue(msg.endpoint, buttons[buttonId])) return;
                    globalStore.putValue(msg.endpoint, buttons[buttonId], duration);
                    command = "longpress";
                } else {
                    globalStore.clearValue(msg.endpoint, buttons[buttonId]);
                    command = longPress ? "longpress_release" : "release";
                    msg.endpoint
                        .command<"boschSpecific", "confirmButtonPressed", BoschSpecificBhius>(
                            "boschSpecific",
                            "confirmButtonPressed",
                            {data: buffer},
                            {sendPolicy: "immediate"},
                        )
                        .catch((error) => {});
                }
                return {action: `button_${buttons[buttonId]}_${command}`};
            }
            logger.error(`Received message with unknown command ID ${buttonId}. Data: 0x${msg.data.toString("hex")}`, NS);
        },
    } satisfies Fz.Converter<"boschSpecific", undefined, "raw">,
    bhius_config: {
        cluster: "boschSpecific",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: {[key: number | string]: string} = {};
            for (const id of Object.values(buttonMap)) {
                if (msg.data[id] !== undefined) {
                    // TODO: type is assumed "Buffer" since using `toString("hex")`
                    result[Object.keys(buttonMap).find((key) => buttonMap[key] === id)] = (msg.data[id] as Buffer).toString("hex");
                }
            }
            return result;
        },
    } satisfies Fz.Converter<"boschSpecific", BoschSpecificBhius, ["attributeReport", "readResponse"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["RBSH-OS-ZB-EU"],
        model: "BSIR-EZ",
        vendor: "Bosch",
        description: "Outdoor siren",
        extend: [
            boschBsirExtend.customPowerCfgCluster(),
            boschBsirExtend.customIasZoneCluster(),
            boschBsirExtend.customIasWdCluster(),
            boschBsirExtend.deviceState(),
            boschBsirExtend.alarmControl(),
            boschBsirExtend.iasZoneStatus(),
            boschBsirExtend.battery(),
            boschBsirExtend.alarmMode(),
            boschBsirExtend.sirenVolume(),
            boschBsirExtend.sirenDuration(),
            boschBsirExtend.lightDuration(),
            boschBsirExtend.sirenDelay(),
            boschBsirExtend.lightDelay(),
            boschBsirExtend.primaryPowerSource(),
            boschBsirExtend.currentPowerSource(),
            boschBsirExtend.solarPanelVoltage(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["RBSH-WS-ZB-EU"],
        model: "BWA-1",
        vendor: "Bosch",
        description: "Smart water alarm",
        extend: [
            m.deviceAddCustomCluster("boschSpecific", {
                ID: 0xfcac,
                manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                attributes: {
                    alarmOnMotion: {
                        ID: 0x0003,
                        type: Zcl.DataType.BOOLEAN,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            m.iasZoneAlarm({
                zoneType: "water_leak",
                zoneAttributes: ["alarm_1", "tamper"],
            }),
            m.battery({
                percentage: true,
                lowStatus: true,
            }),
            m.binary<"boschSpecific", BoschSpecificBwa1>({
                name: "alarm_on_motion",
                cluster: "boschSpecific",
                attribute: "alarmOnMotion",
                description: "Toggle audible alarm on motion",
                valueOn: ["ON", 0x01],
                valueOff: ["OFF", 0x00],
                zigbeeCommandOptions: manufacturerOptions,
                entityCategory: "config",
            }),
            m.bindCluster({
                cluster: "genPollCtrl",
                clusterType: "input",
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
            await endpoint.read("ssIasZone", ["zoneStatus"]);
            await endpoint.read<"boschSpecific", BoschSpecificBwa1>("boschSpecific", ["alarmOnMotion"], manufacturerOptions);
        },
        ota: true,
    },
    {
        zigbeeModel: ["RBSH-SD-ZB-EU"],
        model: "BSD-2",
        vendor: "Bosch",
        description: "Smoke alarm II",
        extend: [
            m.deviceAddCustomCluster("ssIasZone", {
                ID: Zcl.Clusters.ssIasZone.ID,
                attributes: {},
                commands: {
                    boschSmokeAlarmSiren: {
                        ID: 0x80,
                        parameters: [{name: "data", type: Zcl.DataType.UINT16}],
                    },
                },
                commandsResponse: {},
            }),
            boschExtend.smokeAlarm(),
            m.battery({
                percentage: true,
                lowStatus: false,
            }),
            m.enumLookup({
                name: "sensitivity",
                cluster: "ssIasZone",
                attribute: "currentZoneSensitivityLevel",
                description: "Sensitivity of the smoke detector",
                lookup: {
                    low: 0x00,
                    medium: 0x01,
                    high: 0x02,
                },
                entityCategory: "config",
            }),
            boschExtend.broadcastAlarm(),
            m.bindCluster({
                cluster: "genPollCtrl",
                clusterType: "input",
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
            await endpoint.read("ssIasZone", ["zoneStatus"]);
            await endpoint.read("ssIasZone", ["currentZoneSensitivityLevel"]);
        },
    },
    {
        zigbeeModel: [
            "RFDL-ZB",
            "RFDL-ZB-EU",
            "RFDL-ZB-H",
            "RFDL-ZB-K",
            "RFDL-ZB-CHI",
            "RFDL-ZB-MS",
            "RFDL-ZB-ES",
            "RFPR-ZB",
            "RFPR-ZB-EU",
            "RFPR-ZB-CHI",
            "RFPR-ZB-ES",
            "RFPR-ZB-MS",
        ],
        model: "RADION TriTech ZB",
        vendor: "Bosch",
        description: "Wireless motion detector",
        fromZigbee: [fz.temperature, fz.battery, fz.ias_occupancy_alarm_1],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.battery(), e.occupancy(), e.battery_low(), e.tamper()],
        extend: [m.illuminance()],
    },
    {
        zigbeeModel: ["ISW-ZPR1-WP13"],
        model: "ISW-ZPR1-WP13",
        vendor: "Bosch",
        description: "Motion sensor",
        fromZigbee: [fz.temperature, fz.battery, fz.ias_occupancy_alarm_1, fz.ignore_iaszone_report],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(5);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.battery(), e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ["RBSH-TRV0-ZB-EU", "RBSH-TRV1-ZB-EU"],
        model: "BTH-RA",
        vendor: "Bosch",
        description: "Radiator thermostat II",
        meta: {
            overrideHaDiscoveryPayload: (payload) => {
                // Override climate discovery
                // https://github.com/Koenkk/zigbee2mqtt/pull/23075#issue-2355829475
                if (payload.mode_command_topic?.endsWith("/system_mode")) {
                    payload.mode_command_topic = payload.mode_command_topic.substring(0, payload.mode_command_topic.lastIndexOf("/system_mode"));
                    payload.mode_command_template =
                        "{% set values = " +
                        `{ 'auto':'schedule','heat':'manual','off':'pause'} %}` +
                        `{"operating_mode": "{{ values[value] if value in values.keys() else 'pause' }}"}`;
                    payload.mode_state_template =
                        "{% set values = " +
                        `{'schedule':'auto','manual':'heat','pause':'off'} %}` +
                        `{% set value = value_json.operating_mode %}{{ values[value] if value in values.keys() else 'off' }}`;
                    payload.modes = ["off", "heat", "auto"];
                }
            },
        },
        exposes: [
            e
                .climate()
                .withLocalTemperature(
                    ea.STATE_GET,
                    "Temperature used by the heating algorithm. " +
                        "This is the temperature measured on the device (by default) or the remote temperature (if set within the last 30 min).",
                )
                .withLocalTemperatureCalibration(-5, 5, 0.1)
                .withSetpoint("occupied_heating_setpoint", 5, 30, 0.5)
                .withSystemMode(["heat"])
                .withRunningState(["idle", "heat"], ea.STATE_GET),
            e.pi_heating_demand().withAccess(ea.ALL),
        ],
        fromZigbee: [fz.thermostat],
        toZigbee: [
            tz.thermostat_system_mode,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_local_temperature,
            tz.thermostat_keypad_lockout,
        ],
        extend: [
            boschExtend.hvacThermostatCluster(),
            boschExtend.hvacUserInterfaceCfgCluster(),
            m.battery({
                percentage: true,
                lowStatus: false,
            }),
            boschExtend.operatingMode(),
            boschExtend.windowDetection(),
            boschExtend.boostHeating(),
            m.numeric<"hvacThermostat", BoschHvacThermostat>({
                name: "remote_temperature",
                cluster: "hvacThermostat",
                attribute: "remoteTemperature",
                description: "Input for remote temperature sensor. Required at least every 30 min. to prevent fallback to internal sensor!",
                valueMin: 0.0,
                valueMax: 35.0,
                valueStep: 0.01,
                unit: "°C",
                scale: 100,
                zigbeeCommandOptions: manufacturerOptions,
            }),
            m.enumLookup({
                name: "setpoint_change_source",
                cluster: "hvacThermostat",
                attribute: "setpointChangeSource",
                reporting: {min: "10_SECONDS", max: "MAX", change: null},
                description: "Source of the current setpoint temperature",
                lookup: {manual: 0x00, schedule: 0x01, externally: 0x02},
                access: "STATE_GET",
            }),
            boschExtend.childLock(),
            boschExtend.displayOntime(),
            boschExtend.displayBrightness(),
            m.enumLookup<"hvacUserInterfaceCfg", BoschHvacUserInterfaceCfg>({
                name: "display_orientation",
                cluster: "hvacUserInterfaceCfg",
                attribute: "displayOrientation",
                description: "Sets orientation of the display",
                lookup: {normal: 0x00, flipped: 0x01},
                zigbeeCommandOptions: manufacturerOptions,
            }),
            m.enumLookup<"hvacUserInterfaceCfg", BoschHvacUserInterfaceCfg>({
                name: "displayed_temperature",
                cluster: "hvacUserInterfaceCfg",
                attribute: "displayedTemperature",
                description: "Temperature displayed on the TRV",
                lookup: {target: 0x00, measured: 0x01},
                zigbeeCommandOptions: manufacturerOptions,
            }),
            m.enumLookup<"hvacThermostat", BoschHvacThermostat>({
                name: "valve_adapt_status",
                cluster: "hvacThermostat",
                attribute: "valveAdaptStatus",
                reporting: {min: "10_SECONDS", max: "MAX", change: null},
                description: "Specifies the current status of the valve adaptation",
                lookup: {
                    none: 0x00,
                    ready_to_calibrate: 0x01,
                    calibration_in_progress: 0x02,
                    error: 0x03,
                    success: 0x04,
                },
                zigbeeCommandOptions: manufacturerOptions,
                access: "STATE_GET",
            }),
            boschExtend.valveAdaptProcess(),
            boschExtend.heatingDemand(),
            boschExtend.ignoreDst(),
            m.bindCluster({
                cluster: "genPollCtrl",
                clusterType: "input",
            }),
        ],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacUserInterfaceCfg"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {
                min: constants.repInterval.SECONDS_10,
                max: constants.repInterval.HOUR,
                change: 50,
            });
            await reporting.thermostatKeypadLockMode(endpoint);
            await endpoint.configureReporting<"hvacThermostat", BoschHvacThermostat>(
                "hvacThermostat",
                [
                    {
                        attribute: "heatingDemand",
                        minimumReportInterval: constants.repInterval.SECONDS_10,
                        maximumReportInterval: constants.repInterval.MAX,
                        reportableChange: null,
                    },
                ],
                manufacturerOptions,
            );
            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
            await endpoint.read("hvacThermostat", ["localTemperatureCalibration", "setpointChangeSource"]);
            await endpoint.read<"hvacThermostat", BoschHvacThermostat>(
                "hvacThermostat",
                ["operatingMode", "heatingDemand", "valveAdaptStatus", "remoteTemperature", "windowDetection", "boostHeating"],
                manufacturerOptions,
            );
            await endpoint.read("hvacUserInterfaceCfg", ["keypadLockout"]);
            await endpoint.read<"hvacUserInterfaceCfg", BoschHvacUserInterfaceCfg>(
                "hvacUserInterfaceCfg",
                ["displayOrientation", "displayedTemperature", "displayOntime", "displayBrightness"],
                manufacturerOptions,
            );
        },
    },
    {
        zigbeeModel: ["RBSH-RTH0-BAT-ZB-EU"],
        model: "BTH-RM",
        vendor: "Bosch",
        description: "Room thermostat II (Battery model)",
        exposes: [
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 4.5, 30, 0.5)
                .withSetpoint("occupied_cooling_setpoint", 4.5, 30, 0.5)
                .withLocalTemperatureCalibration(-5, 5, 0.1)
                .withSystemMode(["off", "heat", "cool"])
                .withRunningState(["idle", "heat", "cool"]),
        ],
        fromZigbee: [fz.thermostat, fz.hvac_user_interface],
        toZigbee: [
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_programming_operation_mode, // NOTE: Only 0x0 & 0x1 supported
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_local_temperature,
            tz.thermostat_temperature_setpoint_hold,
            tz.thermostat_temperature_display_mode,
        ],
        extend: [
            boschExtend.hvacThermostatCluster(),
            boschExtend.hvacUserInterfaceCfgCluster(),
            m.battery({
                voltageToPercentage: {min: 4400, max: 6400},
                percentage: true,
                voltage: true,
                lowStatus: false,
                voltageReporting: true,
                percentageReporting: false,
            }),
            m.humidity(),
            boschExtend.operatingMode(),
            boschExtend.windowDetection(),
            boschExtend.boostHeating(),
            boschExtend.childLock(),
            boschExtend.displayOntime(),
            boschExtend.displayBrightness(),
            m.bindCluster({
                cluster: "genPollCtrl",
                clusterType: "input",
            }),
        ],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacUserInterfaceCfg"]);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {
                min: constants.repInterval.SECONDS_10,
                max: constants.repInterval.HOUR,
                change: 50,
            });
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint, {
                min: constants.repInterval.SECONDS_10,
                max: constants.repInterval.HOUR,
                change: 50,
            });
            await reporting.thermostatKeypadLockMode(endpoint);
            await endpoint.read("genPowerCfg", ["batteryVoltage"]);
            await endpoint.read("hvacThermostat", ["localTemperatureCalibration"]);
            await endpoint.read<"hvacThermostat", BoschHvacThermostat>(
                "hvacThermostat",
                ["operatingMode", "windowDetection", "boostHeating"],
                manufacturerOptions,
            );
            await endpoint.read("hvacUserInterfaceCfg", ["keypadLockout"]);
            await endpoint.read<"hvacUserInterfaceCfg", BoschHvacUserInterfaceCfg>(
                "hvacUserInterfaceCfg",
                ["displayOntime", "displayBrightness"],
                manufacturerOptions,
            );
        },
    },
    {
        zigbeeModel: ["RBSH-RTH0-ZB-EU"],
        model: "BTH-RM230Z",
        vendor: "Bosch",
        description: "Room thermostat II 230V",
        exposes: [
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint("occupied_heating_setpoint", 4.5, 30, 0.5)
                .withSetpoint("occupied_cooling_setpoint", 4.5, 30, 0.5)
                .withLocalTemperatureCalibration(-5, 5, 0.1)
                .withSystemMode(["off", "heat", "cool"])
                .withRunningState(["idle", "heat", "cool"]),
        ],
        fromZigbee: [fz.thermostat, fz.hvac_user_interface],
        toZigbee: [
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_programming_operation_mode, // NOTE: Only 0x0 & 0x1 supported
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_local_temperature,
            tz.thermostat_temperature_setpoint_hold,
            tz.thermostat_temperature_display_mode,
        ],
        extend: [
            boschExtend.hvacThermostatCluster(),
            boschExtend.hvacUserInterfaceCfgCluster(),
            m.humidity(),
            boschExtend.operatingMode(),
            boschExtend.windowDetection(),
            boschExtend.boostHeating(),
            boschExtend.childLock(),
            boschExtend.displayOntime(),
            boschExtend.displayBrightness(),
        ],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacUserInterfaceCfg"]);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {
                min: constants.repInterval.SECONDS_10,
                max: constants.repInterval.HOUR,
                change: 50,
            });
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint, {
                min: constants.repInterval.SECONDS_10,
                max: constants.repInterval.HOUR,
                change: 50,
            });
            await reporting.thermostatKeypadLockMode(endpoint);
            await endpoint.read("hvacThermostat", ["localTemperatureCalibration"]);
            await endpoint.read<"hvacThermostat", BoschHvacThermostat>(
                "hvacThermostat",
                ["operatingMode", "windowDetection", "boostHeating"],
                manufacturerOptions,
            );
            await endpoint.read("hvacUserInterfaceCfg", ["keypadLockout"]);
            await endpoint.read<"hvacUserInterfaceCfg", BoschHvacUserInterfaceCfg>(
                "hvacUserInterfaceCfg",
                ["displayOntime", "displayBrightness"],
                manufacturerOptions,
            );
        },
    },
    {
        zigbeeModel: ["Champion"],
        model: "8750001213",
        vendor: "Bosch",
        description: "Twinguard",
        extend: [
            m.deviceAddCustomCluster("twinguardSmokeDetector", {
                ID: 0xe000,
                manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                attributes: {
                    sensitivity: {ID: 0x4003, type: Zcl.DataType.UINT16},
                },
                commands: {
                    initiateTestMode: {
                        ID: 0x00,
                        parameters: [],
                    },
                },
                commandsResponse: {},
            }),
            m.deviceAddCustomCluster("twinguardMeasurements", {
                ID: 0xe002,
                manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                attributes: {
                    humidity: {ID: 0x4000, type: Zcl.DataType.UINT16},
                    unknown1: {ID: 0x4001, type: Zcl.DataType.UINT16},
                    unknown2: {ID: 0x4002, type: Zcl.DataType.UINT16},
                    airpurity: {ID: 0x4003, type: Zcl.DataType.UINT16},
                    temperature: {ID: 0x4004, type: Zcl.DataType.INT16},
                    illuminance: {ID: 0x4005, type: Zcl.DataType.UINT16},
                    battery: {ID: 0x4006, type: Zcl.DataType.UINT16},
                    unknown3: {ID: 0x4007, type: Zcl.DataType.UINT16},
                    unknown4: {ID: 0x4008, type: Zcl.DataType.UINT16},
                    pressure: {ID: 0x4009, type: Zcl.DataType.UINT16}, // Not yet confirmed
                    unknown6: {ID: 0x400a, type: Zcl.DataType.UINT16},
                    unknown7: {ID: 0x400b, type: Zcl.DataType.UINT16},
                    unknown8: {ID: 0x400c, type: Zcl.DataType.UINT16},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.deviceAddCustomCluster("twinguardOptions", {
                ID: 0xe004,
                manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                attributes: {
                    unknown1: {ID: 0x4000, type: Zcl.DataType.BITMAP8}, // 0,1 ??? read during pairing
                    pre_alarm: {ID: 0x4001, type: Zcl.DataType.BITMAP8}, // 0,1 on/off
                },
                commands: {},
                commandsResponse: {},
            }),
            m.deviceAddCustomCluster("twinguardSetup", {
                ID: 0xe006,
                manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                attributes: {
                    unknown1: {ID: 0x5003, type: Zcl.DataType.INT8}, // perhaps signal strength? -7?
                    unknown2: {ID: 0x5004, type: Zcl.DataType.UINT8}, // ????
                    heartbeat: {ID: 0x5005, type: Zcl.DataType.BITMAP8}, // 0
                },
                commands: {
                    pairingCompleted: {
                        ID: 0x01,
                        parameters: [],
                    },
                },
                commandsResponse: {},
            }),
            m.deviceAddCustomCluster("twinguardAlarm", {
                ID: 0xe007,
                manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                attributes: {
                    alarm_status: {ID: 0x5000, type: Zcl.DataType.BITMAP32},
                },
                commands: {
                    burglarAlarm: {
                        ID: 0x01,
                        parameters: [
                            {name: "data", type: Zcl.DataType.UINT8}, // data:1 trips the siren data:0 should stop the siren
                        ],
                    },
                },
                commandsResponse: {},
            }),
            boschExtend.twinguard(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(7), coordinatorEndpoint, ["genPollCtrl"]);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ["genAlarms", "twinguardSmokeDetector", "twinguardOptions"]);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ["twinguardMeasurements"]);
            await reporting.bind(device.getEndpoint(12), coordinatorEndpoint, ["twinguardSetup", "twinguardAlarm"]);
            await device.getEndpoint(1).read<"twinguardOptions", TwinguardOptions>("twinguardOptions", ["unknown1"], manufacturerOptions); // Needed for pairing
            await device
                .getEndpoint(12)
                .command<"twinguardSetup", "pairingCompleted", TwinguardSetup>("twinguardSetup", "pairingCompleted", {}, manufacturerOptions); // Needed for pairing
            await device
                .getEndpoint(1)
                .write<"twinguardSmokeDetector", TwinguardSmokeDetector>("twinguardSmokeDetector", {sensitivity: 0x0002}, manufacturerOptions); // Setting defaults
            await device.getEndpoint(1).write<"twinguardOptions", TwinguardOptions>("twinguardOptions", {pre_alarm: 0x01}, manufacturerOptions); // Setting defaults
            await device.getEndpoint(12).write<"twinguardSetup", TwinguardSetup>("twinguardSetup", {heartbeat: 0x01}, manufacturerOptions); // Setting defaults
            await device
                .getEndpoint(1)
                .read<"twinguardSmokeDetector", TwinguardSmokeDetector>("twinguardSmokeDetector", ["sensitivity"], manufacturerOptions);
            await device.getEndpoint(1).read<"twinguardOptions", TwinguardOptions>("twinguardOptions", ["pre_alarm"], manufacturerOptions);
            await device.getEndpoint(12).read<"twinguardSetup", TwinguardSetup>("twinguardSetup", ["heartbeat"], manufacturerOptions);
        },
    },
    {
        zigbeeModel: ["RFPR-ZB-SH-EU"],
        model: "BSEN-M",
        vendor: "Bosch",
        description: "Motion detector",
        extend: [
            boschBsenExtend.customIasZoneCluster(),
            boschBsenExtend.changedCheckinInterval(),
            boschBsenExtend.tamperAndOccupancyAlarm(),
            boschBsenExtend.battery(),
            boschBsenExtend.sensitivityLevel(),
            boschBsenExtend.testMode(),
            boschBsenExtend.illuminance(),
            boschBsenExtend.temperature(),
        ],
    },
    {
        zigbeeModel: ["RBSH-SP-ZB-EU", "RBSH-SP-ZB-FR", "RBSH-SP-ZB-GB"],
        model: "BSP-FZ2",
        vendor: "Bosch",
        description: "Plug compact EU",
        extend: [
            m.onOff(),
            m.electricityMeter({
                voltage: false,
                current: false,
                power: {change: 1},
                energy: {change: 1},
            }),
            boschExtend.seMeteringCluster(),
            boschExtend.resetEnergyReading(),
        ],
        ota: true,
        whiteLabel: [
            {vendor: "Bosch", model: "BSP-EZ2", description: "Plug compact FR", fingerprint: [{modelID: "RBSH-SP-ZB-FR"}]},
            {vendor: "Bosch", model: "BSP-GZ2", description: "Plug compact UK", fingerprint: [{modelID: "RBSH-SP-ZB-GB"}]},
        ],
    },
    {
        zigbeeModel: ["RBSH-SWD-ZB", "RBSH-SWD2-ZB"],
        model: "BSEN-C2",
        vendor: "Bosch",
        description: "Door/window contact II",
        extend: [
            boschExtend.doorWindowContact(false),
            m.battery({
                percentage: true,
                lowStatus: true,
            }),
            m.bindCluster({
                cluster: "genPollCtrl",
                clusterType: "input",
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
            await endpoint.read("ssIasZone", ["zoneStatus"]);
        },
        ota: true,
    },
    {
        zigbeeModel: ["RBSH-SWDV-ZB"],
        model: "BSEN-CV",
        vendor: "Bosch",
        description: "Door/window contact II plus",
        extend: [
            boschExtend.doorWindowContact(true),
            m.battery({
                percentage: true,
                lowStatus: true,
            }),
            m.bindCluster({
                cluster: "genPollCtrl",
                clusterType: "input",
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
            await endpoint.read("ssIasZone", ["zoneStatus"]);
        },
    },
    {
        zigbeeModel: ["RBSH-MMD-ZB-EU"],
        model: "BMCT-DZ",
        vendor: "Bosch",
        description: "Phase-cut dimmer",
        extend: [
            boschBmctExtend.handleZclVersionReadRequest(),
            m.deviceAddCustomCluster("boschSpecific", {
                ID: 0xfca0,
                manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                attributes: {
                    switchType: {ID: 0x0001, type: Zcl.DataType.ENUM8},
                    childLock: {ID: 0x0008, type: Zcl.DataType.BOOLEAN},
                    dimmerType: {ID: 0x0022, type: Zcl.DataType.ENUM8},
                    minimumBrightness: {ID: 0x0025, type: Zcl.DataType.UINT8},
                    maximumBrightness: {ID: 0x0026, type: Zcl.DataType.UINT8},
                    switchMode: {ID: 0x0031, type: Zcl.DataType.BOOLEAN},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.light({
                configureReporting: true,
                levelConfig: {features: ["on_level", "current_level_startup"]},
                powerOnBehavior: true,
                effect: false,
            }),
            boschBmctExtend.switchType({
                switchTypeLookup: boschBmctDzSettings.switchTypes,
            }),
            boschBmctExtend.reportSwitchAction({
                switchTypeLookup: boschBmctDzSettings.switchTypes,
                hasDualSwitchInputs: boschBmctDzSettings.hasDualSwitchInputs,
            }),
            boschBmctExtend.switchMode({
                switchModeLookup: boschBmctDzSettings.switchModes,
                switchTypeLookup: boschBmctDzSettings.switchTypes,
            }),
            boschBmctExtend.childLock(),
            boschBmctExtend.brightnessRange(),
            boschBmctExtend.dimmerType(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["RBSH-MMR-ZB-EU"],
        model: "BMCT-RZ",
        vendor: "Bosch",
        description: "Relay (potential free)",
        extend: [
            boschBmctExtend.handleZclVersionReadRequest(),
            m.deviceAddCustomCluster("boschSpecific", {
                ID: 0xfca0,
                manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                attributes: {
                    switchType: {ID: 0x0001, type: Zcl.DataType.ENUM8},
                    autoOffEnabled: {ID: 0x0006, type: Zcl.DataType.BOOLEAN},
                    autoOffTime: {ID: 0x0007, type: Zcl.DataType.UINT16},
                    childLock: {ID: 0x0008, type: Zcl.DataType.BOOLEAN},
                    pulseLength: {ID: 0x0024, type: Zcl.DataType.UINT16},
                    switchMode: {ID: 0x0031, type: Zcl.DataType.BOOLEAN},
                    actuatorType: {ID: 0x0034, type: Zcl.DataType.ENUM8},
                },
                commands: {},
                commandsResponse: {},
            }),
            boschBmctExtend.rzDeviceModes({
                deviceModesLookup: boschBmctRzSettings.deviceModes,
            }),
            m.onOff({powerOnBehavior: false}),
            boschBmctExtend.switchType({
                switchTypeLookup: boschBmctRzSettings.switchTypes,
            }),
            boschBmctExtend.reportSwitchAction({
                switchTypeLookup: boschBmctRzSettings.switchTypes,
                hasDualSwitchInputs: boschBmctRzSettings.hasDualSwitchInputs,
            }),
            boschBmctExtend.switchMode({
                switchModeLookup: boschBmctRzSettings.switchModes,
                switchTypeLookup: boschBmctRzSettings.switchTypes,
            }),
            boschBmctExtend.childLock(),
            boschBmctExtend.autoOff(),
            boschBmctExtend.pulseLength({
                updateDeviceMode: true,
                deviceModesLookup: boschBmctRzSettings.deviceModes,
            }),
            boschBmctExtend.actuatorType(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["RBSH-MMS-ZB-EU"],
        model: "BMCT-SLZ",
        vendor: "Bosch",
        description: "Light/shutter control unit II",
        extend: [
            m.deviceEndpoints({endpoints: {left: 2, right: 3}}),
            m.electricityMeter({
                voltage: false,
                current: false,
                power: {change: 1},
                energy: {change: 1},
            }),
            m.deviceAddCustomCluster("boschSpecific", {
                ID: 0xfca0,
                manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                attributes: {
                    deviceMode: {ID: 0x0000, type: Zcl.DataType.ENUM8},
                    switchType: {ID: 0x0001, type: Zcl.DataType.ENUM8},
                    switchMode: {ID: 0x0031, type: Zcl.DataType.UINT8},
                    calibrationOpeningTime: {ID: 0x0002, type: Zcl.DataType.UINT32},
                    calibrationClosingTime: {ID: 0x0003, type: Zcl.DataType.UINT32},
                    // 0x0005 isn't used at all when using the Bosch SHC as of 30-06-2025.
                    // As I don't have any shutters, I can't run all calibration steps
                    // successfully. So, keep any comments regarding these
                    // attributes with caution.
                    calibrationButtonHoldTime: {ID: 0x0005, type: Zcl.DataType.UINT8},
                    autoOffEnabled: {ID: 0x0006, type: Zcl.DataType.BOOLEAN},
                    autoOffTime: {ID: 0x0007, type: Zcl.DataType.UINT16},
                    childLock: {ID: 0x0008, type: Zcl.DataType.BOOLEAN},
                    // 0x000f is only being set when using the automatic calibration.
                    // It's being set to 0 then before sending the calibration
                    // command. Additionally, when changing
                    // the calibrationOpeningTime or calibrationClosingTime in the
                    // Bosch app, it's also being set to 0.
                    // I couldn't find any way to set 0x000f manually in the Bosch app.
                    calibrationMotorStartDelay: {ID: 0x000f, type: Zcl.DataType.UINT8},
                    calibrationMotorReverseDirection: {ID: 0x0032, type: Zcl.DataType.BOOLEAN},
                    motorState: {ID: 0x0013, type: Zcl.DataType.ENUM8},
                    // unknownAttributeOne is always being configured as reporting
                    // attribute on endpoint 1 when using the Bosch SHC.
                    // Can't tell what this attribute does (always received
                    // 0x00 as answer on manual lookup).
                    unknownAttributeOne: {ID: 0x0004, type: Zcl.DataType.BITMAP8},
                    // Attribute is being set to 255 when deactivating the automatic
                    // detection of the motor end position by the Bosch SHC. After
                    // activating the automatic end position detection it's being set
                    // to 0 by the Bosch SHC. Apart from that, there's no way to manually
                    // change the value.
                    calibrationMotorEndPosition: {ID: 0x0021, type: Zcl.DataType.UINT8},
                    // 0x0033 is used when setting the motor start delay manually
                    // using the Bosch SHC as of 30-06-2025.
                    // If the user wants to automatically detect the delay during
                    // calibration, it's being set to 0 over the Bosch app.
                    calibrationNewMotorStartDelay: {ID: 0x0033, type: Zcl.DataType.UINT16},
                    // 0x0010 and 0x0011 is being set simultaneously with the same value
                    // when changing the delay for the rotation of the slats on venetian
                    // blinds. Maybe one attribute for each direction?
                    // It's also being configured as reporting attribute when using
                    // venetian blinds.
                    slatRotationDurationOne: {ID: 0x0010, type: Zcl.DataType.UINT32},
                    slatRotationDurationTwo: {ID: 0x0011, type: Zcl.DataType.UINT32},
                    // 0x002a is only being used when doing an automatic calibration
                    // with the Bosch specific startAutomaticMotorCalibration command.
                    // It's being set to true before starting the calibration process.
                    // This happens regardless of the shutter type. I didn't capture
                    // any packages where this attribute is being actively set to false.
                    // Maybe this activates some "full calibration" flag which is being
                    // set to false by the device itself afterward?
                    unknownAttributeTwo: {ID: 0x002a, type: Zcl.DataType.BOOLEAN},
                },
                commands: {
                    // Command being sent by the Bosch SHC when starting an
                    // automatic shutter calibration.
                    startAutomaticMotorCalibration: {ID: 0x00, parameters: []},
                },
                commandsResponse: {},
            }),
            boschBmctExtend.handleZclVersionReadRequest(),
            boschBmctExtend.slzExtends(),
            boschExtend.seMeteringCluster(),
            boschExtend.resetEnergyReading(),
        ],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const lightConfiguration = async () => {
                const endpoint1 = device.getEndpoint(1);
                await reporting.bind(endpoint1, coordinatorEndpoint, ["genIdentify"]);
                await endpoint1.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["switchType"]);

                const endpoint2 = device.getEndpoint(2);
                await reporting.bind(endpoint2, coordinatorEndpoint, ["genIdentify", "genOnOff", "boschSpecific"]);
                await reporting.onOff(endpoint2);
                await endpoint2.read<"genOnOff">("genOnOff", ["onOff", "startUpOnOff"]);
                await endpoint2.read<"boschSpecific", BoschBmctCluster>("boschSpecific", [
                    "switchMode",
                    "childLock",
                    "autoOffEnabled",
                    "autoOffTime",
                ]);

                const endpoint3 = device.getEndpoint(3);
                await reporting.bind(endpoint3, coordinatorEndpoint, ["genIdentify", "genOnOff", "boschSpecific"]);
                await reporting.onOff(endpoint3);
                await endpoint3.read<"genOnOff">("genOnOff", ["onOff", "startUpOnOff"]);
                await endpoint3.read<"boschSpecific", BoschBmctCluster>("boschSpecific", [
                    "switchMode",
                    "childLock",
                    "autoOffEnabled",
                    "autoOffTime",
                ]);
            };

            const shutterConfiguration = async () => {
                const endpoint1 = device.getEndpoint(1);
                await reporting.bind(endpoint1, coordinatorEndpoint, ["genIdentify", "closuresWindowCovering", "boschSpecific"]);
                await reporting.currentPositionLiftPercentage(endpoint1);
                await endpoint1.read<"closuresWindowCovering">("closuresWindowCovering", ["currentPositionLiftPercentage"]);

                const payloadMotorState = payload<"boschSpecific", BoschBmctCluster>("motorState", 0, repInterval.MAX, 0);
                await endpoint1.configureReporting("boschSpecific", payloadMotorState);

                await endpoint1.read<"boschSpecific", BoschBmctCluster>("boschSpecific", [
                    "switchType",
                    "switchMode",
                    "motorState",
                    "calibrationOpeningTime",
                    "calibrationClosingTime",
                    "calibrationButtonHoldTime",
                    "calibrationMotorStartDelay",
                    "childLock",
                ]);
            };

            const endpoint1 = device.getEndpoint(1);
            await endpoint1.read<"boschSpecific", BoschBmctCluster>("boschSpecific", ["deviceMode"]);

            await lightConfiguration();
            await shutterConfiguration();
        },
        exposes: (device, options) => {
            const stateDeviceMode: KeyValue = {
                light: 0x04,
                shutter: 0x01,
                disabled: 0x00,
            };
            const stateMotor: KeyValue = {
                stopped: 0x00,
                opening: 0x01,
                closing: 0x02,
            };
            const stateSwitchType: KeyValue = {
                button: 0x01,
                button_key_change: 0x02,
                rocker_switch: 0x03,
                rocker_switch_key_change: 0x04,
                none: 0x00,
            };
            const stateSwitchMode: KeyValue = {
                coupled: 0x00,
                decoupled: 0x01,
                only_short_press_decoupled: 0x02,
                only_long_press_decoupled: 0x03,
            };
            const commonExposes = (switchType: string) => {
                const exposeList = [];

                exposeList.push(
                    e.enum("switch_type", ea.ALL, Object.keys(stateSwitchType)).withDescription("Module controlled by a rocker switch or a button"),
                );

                if (switchType !== "none") {
                    let supportedActionTypes: string[];

                    switch (switchType) {
                        case "button":
                        case "button_key_change":
                            supportedActionTypes = [
                                "press_released_left",
                                "press_released_right",
                                "hold_left",
                                "hold_right",
                                "hold_released_left",
                                "hold_released_right",
                            ];
                            break;
                        case "rocker_switch":
                        case "rocker_switch_key_change":
                            supportedActionTypes = ["opened_left", "opened_right", "closed_left", "closed_right"];
                            break;
                    }

                    exposeList.push(e.action(supportedActionTypes), e.action_duration());
                }

                return exposeList;
            };
            const lightExposes = (endpoint: string, switchType: string) => {
                const exposeList = [];

                exposeList.push(
                    e.switch().withEndpoint(endpoint),
                    e.power_on_behavior().withEndpoint(endpoint),
                    e
                        .binary("auto_off_enabled", ea.ALL, "ON", "OFF")
                        .withEndpoint(endpoint)
                        .withDescription("Enable/Disable the automatic turn-off feature"),
                    e
                        .numeric("auto_off_time", ea.ALL)
                        .withValueMin(0)
                        .withValueMax(720)
                        .withValueStep(1)
                        .withUnit("min")
                        .withDescription(
                            "Turn off the output after the specified amount of time. Only in action when the automatic turn-off is enabled.",
                        )
                        .withEndpoint(endpoint),
                );

                if (switchType !== "none") {
                    let supportedSwitchModes: string[];

                    switch (switchType) {
                        case "button":
                        case "button_key_change":
                            supportedSwitchModes = Object.keys(stateSwitchMode);
                            break;
                        case "rocker_switch":
                        case "rocker_switch_key_change":
                            supportedSwitchModes = Object.keys(stateSwitchMode).filter(
                                (switchMode) => switchMode === "coupled" || switchMode === "decoupled",
                            );
                            break;
                    }

                    exposeList.push(
                        e
                            .enum("switch_mode", ea.ALL, supportedSwitchModes)
                            .withEndpoint(endpoint)
                            .withDescription(
                                "Decouple the switch from the corresponding output to use it for other purposes. Please keep in mind that the available options depend on the used switch type.",
                            ),
                        e.binary("child_lock", ea.ALL, "ON", "OFF").withEndpoint(endpoint).withDescription("Enable/Disable child lock"),
                    );
                }

                return exposeList;
            };
            const coverExposes = (switchType: string) => {
                const exposeList = [];

                exposeList.push(
                    e.cover_position(),
                    e.enum("motor_state", ea.STATE, Object.keys(stateMotor)).withDescription("Current shutter motor state"),
                    e
                        .numeric("calibration_closing_time", ea.ALL)
                        .withUnit("s")
                        .withDescription("Calibrate shutter closing time")
                        .withValueMin(1)
                        .withValueMax(90)
                        .withValueStep(0.1),
                    e
                        .numeric("calibration_opening_time", ea.ALL)
                        .withUnit("s")
                        .withDescription("Calibrate shutter opening time")
                        .withValueMin(1)
                        .withValueMax(90)
                        .withValueStep(0.1),
                    e
                        .numeric("calibration_button_hold_time", ea.ALL)
                        .withUnit("s")
                        .withDescription("Time to hold for long press")
                        .withValueMin(0.1)
                        .withValueMax(2)
                        .withValueStep(0.1),
                    e
                        .numeric("calibration_motor_start_delay", ea.ALL)
                        .withUnit("s")
                        .withDescription("Delay between command and motor start")
                        .withValueMin(0)
                        .withValueMax(20)
                        .withValueStep(0.1),
                );

                if (switchType !== "none") {
                    let supportedSwitchModes: string[];

                    switch (switchType) {
                        case "button":
                        case "button_key_change":
                            supportedSwitchModes = Object.keys(stateSwitchMode).filter(
                                (switchMode) => switchMode === "coupled" || switchMode === "only_long_press_decoupled",
                            );
                            break;
                        case "rocker_switch":
                        case "rocker_switch_key_change":
                            supportedSwitchModes = Object.keys(stateSwitchMode).filter((switchMode) => switchMode === "coupled");
                            break;
                    }

                    exposeList.push(
                        e
                            .enum("switch_mode", ea.ALL, supportedSwitchModes)
                            .withDescription(
                                "Decouple the switch from the corresponding output to use it for other purposes. Please keep in mind that the available options depend on the used switch type.",
                            ),
                        e.binary("child_lock", ea.ALL, "ON", "OFF").withDescription("Enable/Disable child lock"),
                    );
                }

                return exposeList;
            };

            if (!utils.isDummyDevice(device)) {
                const deviceModeKey = device.getEndpoint(1).getClusterAttributeValue("boschSpecific", "deviceMode");
                const deviceMode = Object.keys(stateDeviceMode).find((key) => stateDeviceMode[key] === deviceModeKey);

                const switchTypeKey = device.getEndpoint(1).getClusterAttributeValue("boschSpecific", "switchType");
                const switchType = Object.keys(stateSwitchType).find((key) => stateSwitchType[key] === switchTypeKey);

                if (deviceMode === "light") {
                    return [...commonExposes(switchType), ...lightExposes("left", switchType), ...lightExposes("right", switchType)];
                }
                if (deviceMode === "shutter") {
                    return [...commonExposes(switchType), ...coverExposes(switchType)];
                }
            }
            return [e.enum("device_mode", ea.ALL, Object.keys(stateDeviceMode)).withDescription("Device mode")];
        },
    },
    {
        zigbeeModel: ["RBSH-US4BTN-ZB-EU"],
        model: "BHI-US",
        vendor: "Bosch",
        description: "Universal Switch II",
        fromZigbee: [fzLocal.bhius_button_press, fzLocal.bhius_config, fz.battery],
        toZigbee: [tzLocal.bhius_config],
        exposes: [
            e.battery_low(),
            e.battery_voltage(),
            e
                .text("config_led_top_left_press", ea.ALL)
                .withLabel("LED config (top left short press)")
                .withDescription(labelShortPress)
                .withCategory("config"),
            e
                .text("config_led_top_right_press", ea.ALL)
                .withLabel("LED config (top right short press)")
                .withDescription(labelShortPress)
                .withCategory("config"),
            e
                .text("config_led_bottom_left_press", ea.ALL)
                .withLabel("LED config (bottom left short press)")
                .withDescription(labelShortPress)
                .withCategory("config"),
            e
                .text("config_led_bottom_right_press", ea.ALL)
                .withLabel("LED config (bottom right short press)")
                .withDescription(labelShortPress)
                .withCategory("config"),
            e
                .text("config_led_top_left_longpress", ea.ALL)
                .withLabel("LED config (top left long press)")
                .withDescription(labelLongPress)
                .withCategory("config"),
            e
                .text("config_led_top_right_longpress", ea.ALL)
                .withLabel("LED config (top right long press)")
                .withDescription(labelLongPress)
                .withCategory("config"),
            e
                .text("config_led_bottom_left_longpress", ea.ALL)
                .withLabel("LED config (bottom left long press)")
                .withDescription(labelLongPress)
                .withCategory("config"),
            e
                .text("config_led_bottom_right_longpress", ea.ALL)
                .withLabel("LED config (bottom right long press)")
                .withDescription(labelLongPress)
                .withCategory("config"),
            e.action([
                "button_top_left_release",
                "button_top_right_release",
                "button_bottom_left_release",
                "button_bottom_right_release",
                "button_top_left_longpress",
                "button_top_right_longpress",
                "button_bottom_left_longpress",
                "button_bottom_right_longpress",
                "button_top_left_longpress_release",
                "button_top_right_longpress_release",
                "button_bottom_left_longpress_release",
                "button_bottom_right_longpress_release",
            ]),
        ],
        extend: [
            m.deviceAddCustomCluster("boschSpecific", {
                ID: 0xfca1,
                manufacturerCode: Zcl.ManufacturerCode.ROBERT_BOSCH_GMBH,
                attributes: {},
                commands: {
                    confirmButtonPressed: {
                        ID: 0x0010,
                        parameters: [{name: "data", type: Zcl.BuffaloZclDataType.BUFFER}],
                    },
                    pairingCompleted: {
                        ID: 0x0012,
                        parameters: [{name: "data", type: Zcl.BuffaloZclDataType.BUFFER}],
                    },
                },
                commandsResponse: {},
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);

            // Read default LED configuration
            await endpoint
                .read("boschSpecific", [0x0010, 0x0011, 0x0012, 0x0013], {...manufacturerOptions, sendPolicy: "immediate"})
                .catch((error) => {});
            await endpoint
                .read("boschSpecific", [0x0020, 0x0021, 0x0022, 0x0023], {...manufacturerOptions, sendPolicy: "immediate"})
                .catch((error) => {});

            // We also have to read this one. Value reads 0x0f, looks like a bitmap
            await endpoint.read("boschSpecific", [0x0024], {...manufacturerOptions, sendPolicy: "immediate"});

            await endpoint.command<"boschSpecific", "pairingCompleted", BoschSpecificBhius>(
                "boschSpecific",
                "pairingCompleted",
                {data: Buffer.from([0x00])},
                {sendPolicy: "immediate"},
            );

            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "genBasic", "boschSpecific"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
    },
];
