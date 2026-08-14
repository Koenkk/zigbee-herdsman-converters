import {Zcl} from "zigbee-herdsman";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz, KeyValue, ModernExtend, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

interface FuturehomeHaApplianceControl {
    attributes: {
        autoCharge: number;
        energyMeterStart: number;
        energyMeterNow: number;
        chargingSessionStartTime: number;
        chargingSessionEndTime: number;
        status: number;
    };
    commands: never;
    commandResponses: never;
}

const localValueConverters = {
    energyMonotonic: {
        from: (value: number, meta: Fz.Meta) => {
            const scaled = tuya.valueConverter.divideBy100.from(value);
            const lastValue = meta.device.meta.energy ?? 0;
            if (scaled < lastValue && scaled !== 0) {
                // Erraneous reading that is less than previous readings (and not a reset to 0), ignore it.
                return lastValue;
            }

            meta.device.meta.energy = scaled;
            return scaled;
        },
    },
};

const futurehomeExtend = {
    chargingCommand: (): ModernExtend => {
        const commandLookup: {[key: string]: number} = {
            start: 0x01,
            stop: 0x02,
            pause: 0x03,
        };
        return {
            isModernExtend: true,
            fromZigbee: [],
            toZigbee: [
                {
                    key: ["charging_start", "charging_stop", "charging_pause"],
                    convertSet: async (entity, key, value, meta) => {
                        const normalizedAction = key.replace("charging_", "");
                        const commandId = commandLookup[normalizedAction];
                        await entity.command("haApplianceControl", "executionOfCommand", {commandId: commandId});
                        try {
                            await entity.command("haApplianceControl", "signalState", {});
                        } catch {
                            // do nothing
                        }
                        return;
                    },
                    convertGet: async (entity, key, meta) => {
                        await entity.command("haApplianceControl", "signalState", {});
                    },
                } satisfies Tz.Converter,
            ],
            exposes: [
                e
                    .enum("charging_start", ea.SET, ["start"])
                    .withLabel("Start charging")
                    .withDescription("Press to start charging")
                    .withHomeAssistant({icon: "mdi:arrow-right-drop-circle"}),
                e
                    .enum("charging_stop", ea.SET, ["stop"])
                    .withLabel("Stop charging")
                    .withDescription("Press to stop charging")
                    .withHomeAssistant({icon: "mdi:stop-circle"}),
                e
                    .enum("charging_pause", ea.SET, ["pause"])
                    .withLabel("Pause charging")
                    .withDescription("Press to pause charging")
                    .withHomeAssistant({icon: "mdi:pause-circle"}),
            ],
        };
    },
    forceUnlock: (): ModernExtend => {
        return {
            isModernExtend: true,
            toZigbee: [
                {
                    // based on tz.lock, but unlock only
                    key: ["state"],
                    convertSet: async (entity, key, value, meta) => {
                        let state = utils.isString(value) ? value.toUpperCase() : null;
                        if (utils.isObject(value) && value.state) {
                            state = utils.isString(value.state) ? value.state.toUpperCase() : null;
                        }
                        utils.validateValue(state, ["UNLOCK"]);
                        await entity.command("closuresDoorLock", "unlockDoor", {pincodevalue: Buffer.from("", "ascii")});
                    },
                    convertGet: async (entity, key, meta) => {
                        await entity.read("closuresDoorLock", ["lockState"]);
                    },
                } satisfies Tz.Converter,
            ],
            exposes: [
                e
                    .enum("state", ea.ALL, ["UNLOCK"])
                    .withProperty("state")
                    .withLabel("Force plug to unlock")
                    .withDescription("Try this if the plug is locked in the charger after charging is completed."),
            ],
        };
    },
    chargerSessionTimings: (): ModernExtend => {
        return {
            isModernExtend: true,
            fromZigbee: [
                {
                    cluster: "haApplianceControl",
                    type: ["attributeReport", "readResponse"],
                    convert: (model, msg, publish, options, meta) => {
                        const result: KeyValue = {};
                        const status = msg.data?.status;

                        if (status === undefined || status === null) {
                            return result;
                        }

                        const now = new Date();

                        const wasCharging = (meta.state.is_charging as boolean) ?? false;
                        const wasPlugConnected = (meta.state.is_plug_connected as boolean) ?? false;

                        const isCharging = status === 0x02;
                        const isPlugConnected = status !== 0x00;

                        // Charging started
                        if (isCharging && !wasCharging) {
                            result.charging_start_datetime = utils.toLocalISOString(now);
                            result.charging_end_datetime = null;
                        }

                        // Charging ended
                        if (!isCharging && wasCharging) {
                            result.charging_end_datetime = utils.toLocalISOString(now);
                        }

                        // Plug connected
                        if (isPlugConnected && !wasPlugConnected) {
                            result.connected_start_datetime = utils.toLocalISOString(now);
                            result.connected_end_datetime = null;
                        }

                        // Plug disconnected
                        if (!isPlugConnected && wasPlugConnected) {
                            result.connected_end_datetime = utils.toLocalISOString(now);
                        }

                        // Expose current charging and connection status
                        result.is_charging = isCharging;
                        result.is_plug_connected = isPlugConnected;

                        return result;
                    },
                } satisfies Fz.Converter<"haApplianceControl", FuturehomeHaApplianceControl, ["attributeReport", "readResponse"]>,
            ],
            exposes: [
                e
                    .binary("is_charging", ea.STATE, true, false)
                    .withDescription("Indicates if an active charging session is ongoing.")
                    .withHomeAssistant({deviceClass: "battery_charging"}),
                e.text("charging_start_datetime", ea.STATE).withDescription("Date and time when charging started."),
                e.text("charging_end_datetime", ea.STATE).withDescription("Date and time when charging ended."),
                e
                    .binary("is_plug_connected", ea.STATE, true, false)
                    .withDescription("Indicates if the plug is connected.")
                    .withHomeAssistant({deviceClass: "plug"}), // ({deviceClass: "plug", preserveName: true}),
                e.text("connected_start_datetime", ea.STATE).withDescription("Date and time when charger was connected."),
                e.text("connected_end_datetime", ea.STATE).withDescription("Date and time when charger was disconnected."),
            ],
        };
    },
    sessionEnergyDuration: (): ModernExtend => {
        return {
            isModernExtend: true,
            fromZigbee: [
                {
                    cluster: "haApplianceControl",
                    type: ["attributeReport", "readResponse"],
                    convert: (model, msg, publish, options, meta) => {
                        const result: KeyValue = {};

                        const energyMeterStart =
                            msg.data.energyMeterStart !== undefined
                                ? msg.data.energyMeterStart / 1000
                                : (meta.state?.energy_meter_start as number | undefined);

                        const energyMeterNow =
                            msg.data.energyMeterNow !== undefined
                                ? msg.data.energyMeterNow / 1000
                                : (meta.state?.energy_meter_now as number | undefined);

                        result.energy_meter_start = energyMeterStart;
                        result.energy_meter_now = energyMeterNow;

                        const startTime =
                            msg.data.chargingSessionStartTime !== undefined
                                ? msg.data.chargingSessionStartTime
                                : (meta.state?.charging_session_start_time as number | undefined);
                        const endTime =
                            msg.data.chargingSessionEndTime !== undefined
                                ? msg.data.chargingSessionEndTime
                                : (meta.state?.charing_session_end_time as number | undefined);

                        result.charging_session_start_time = startTime;
                        result.charing_session_end_time = endTime;

                        result.session_energy = utils.precisionRound((energyMeterNow as number) - (energyMeterStart as number), 3);
                        result.charging_duration = (endTime as number) - (startTime as number);
                        return result;
                    },
                } satisfies Fz.Converter<"haApplianceControl", FuturehomeHaApplianceControl, ["attributeReport", "readResponse"]>,
            ],
            exposes: [
                e
                    .numeric("session_energy", ea.STATE)
                    .withLabel("Session energy")
                    .withDescription("For ongoining or last session as reported by the charger.")
                    .withUnit("kWh"),
                e.numeric("energy_meter_start", ea.STATE).withDescription("Energy reading at the start of the session.").withUnit("kWh"),
                e.numeric("energy_meter_now", ea.STATE).withDescription("Current or final energy reading of the session.").withUnit("kWh"),
                e
                    .numeric("charging_duration", ea.STATE)
                    .withDescription("Duration of the active or most recent charging session, measured from charge start to cable disconnect.")
                    .withUnit("s")
                    .withHomeAssistant({deviceClass: "duration"}),
            ],
            configure: [
                m.setupConfigureForReporting<"haApplianceControl", FuturehomeHaApplianceControl>("haApplianceControl", "energyMeterStart", {
                    config: {min: "1_MINUTE", max: "1_HOUR", change: 1},
                    access: ea.STATE,
                }),
                m.setupConfigureForReporting<"haApplianceControl", FuturehomeHaApplianceControl>("haApplianceControl", "energyMeterNow", {
                    config: {min: "5_SECONDS", max: "1_HOUR", change: 1},
                    access: ea.STATE,
                }),
                m.setupConfigureForReporting<"haApplianceControl", FuturehomeHaApplianceControl>("haApplianceControl", "chargingSessionStartTime", {
                    config: {min: "1_MINUTE", max: "1_HOUR", change: 1},
                    access: ea.STATE,
                }),
                m.setupConfigureForReporting<"haApplianceControl", FuturehomeHaApplianceControl>("haApplianceControl", "chargingSessionEndTime", {
                    config: {min: "5_SECONDS", max: "1_HOUR", change: 1},
                    access: ea.STATE,
                }),
            ],
        };
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE204_e5hpkc6d", "_TZE200_4hbx5cvx", "_TZE200_e5hpkc6d"]),
        model: "TS0601_futurehome_thermostat",
        vendor: "Futurehome",
        description: "Thermostat",
        extend: [tuya.modernExtend.tuyaBase({dp: true, timeStart: "2000"})],
        whiteLabel: [tuya.whitelabel("Futurehome", "Co020", "Smart thermostat", ["_TZE200_e5hpkc6d"])],
        exposes: [
            e
                .climate()
                .withSystemMode(["off", "heat"], ea.STATE_SET, "Whether the thermostat is turned on or off")
                .withPreset(["user", "home", "away", "auto"])
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-9, 9, 1, ea.STATE_SET)
                .withRunningState(["idle", "heat"], ea.STATE)
                .withSetpoint("current_heating_setpoint", 5, 35, 1, ea.STATE_SET),
            e
                .temperature_sensor_select(["air_sensor", "floor_sensor", "max_guard"])
                .withDescription(
                    "Max guard. Floor sensor must be installed. The thermostat will regulate according to the room sensor, " +
                        "but interrupt heating if the floor sensor exceeds the maximum guard temperature. Standard is 27°C" +
                        "\n\n" +
                        "There is also a maximum guard when the thermostat is set to floor sensor. " +
                        "The thermostat regulates according to the floor sensor, but will interrupt heating if the floor sensor " +
                        "exceeds the maximum guard temperature. Standard is 27°C.",
                ),
            e
                .numeric("local_temperature_floor", ea.STATE)
                .withUnit("°C")
                .withDescription("Current temperature measured on the external sensor (floor)")
                .withValueStep(1),
            e.child_lock(),
            e.window_detection(),
            e.energy(),
            e
                .numeric("hysteresis", ea.STATE_SET)
                .withUnit("°C")
                .withDescription(
                    "The offset from the target temperature in which the temperature has to " +
                        "change for the heating state to change. This is to prevent erratically turning on/off " +
                        "when the temperature is close to the target.",
                )
                .withValueMin(1)
                .withValueMax(9)
                .withValueStep(1),
            e
                .numeric("max_temperature_protection", ea.STATE_SET)
                .withUnit("°C")
                .withDescription("Max guarding temperature")
                .withValueMin(20)
                .withValueMax(95)
                .withValueStep(1),
        ],
        meta: {
            tuyaDatapoints: [
                [1, "system_mode", tuya.valueConverterBasic.lookup({off: false, heat: true})],
                [2, "preset", tuya.valueConverterBasic.lookup({user: tuya.enum(0), home: tuya.enum(1), away: tuya.enum(2), auto: tuya.enum(3)})],
                [16, "current_heating_setpoint", tuya.valueConverter.raw],
                [24, "local_temperature", tuya.valueConverter.raw],
                [28, "local_temperature_calibration", tuya.valueConverter.raw],
                [30, "child_lock", tuya.valueConverter.lockUnlock],
                [101, "local_temperature_floor", tuya.valueConverter.raw],
                [102, "sensor", tuya.valueConverterBasic.lookup({air_sensor: tuya.enum(0), floor_sensor: tuya.enum(1), max_guard: tuya.enum(2)})],
                [103, "hysteresis", tuya.valueConverter.raw],
                [104, "running_state", tuya.valueConverterBasic.lookup({idle: false, heat: true})],
                // In the old handler, endpoint 105 was left unused. I don't know what this value means.
                // Leaving it in here for future reference in case someone else figures it out.
                // connecteTempProgram: 105
                [106, "window_detection", tuya.valueConverter.onOff],
                [107, "max_temperature_protection", tuya.valueConverter.raw],
                // Reported as a monotonically increasing counter while heating, using unit 0.01 kWh.
                [123, "energy", localValueConverters.energyMonotonic],
            ],
        },
    },
    {
        zigbeeModel: ["FH9130"],
        model: "4509243",
        vendor: "Futurehome",
        description: "Smart puck",
        ota: true,
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["Charge"],
        model: "Charge",
        vendor: "Futurehome",
        description: "Futurehome Charge (EV Charger)",
        extend: [
            m.deviceAddCustomCluster("haApplianceControl", {
                name: "haApplianceControl",
                ID: Zcl.Clusters.haApplianceControl.ID,
                attributes: {
                    chargingSessionStartTime: {
                        name: "chargingSessionStartTime",
                        ID: 0xef01,
                        type: Zcl.DataType.UINT32,
                        manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS,
                    },
                    chargingSessionEndTime: {
                        name: "chargingSessionEndTime",
                        ID: 0xef02,
                        type: Zcl.DataType.UINT32,
                        manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS,
                    },
                    energyMeterStart: {
                        name: "energyMeterStart",
                        ID: 0xef03,
                        type: Zcl.DataType.UINT32,
                        manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS,
                    },
                    energyMeterNow: {
                        name: "energyMeterNow",
                        ID: 0xef04,
                        type: Zcl.DataType.UINT32,
                        manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS,
                    },
                    status: {
                        name: "status",
                        ID: 0xef09,
                        type: Zcl.DataType.UINT8,
                        manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS,
                        write: true,
                    },
                    autoCharge: {
                        name: "autoCharge",
                        ID: 0xef0c,
                        type: Zcl.DataType.UINT8,
                        manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS,
                        write: true,
                    },
                },
                commands: {},
                commandsResponse: {},
            }),
            m.enumLookup<"haApplianceControl", FuturehomeHaApplianceControl>({
                name: "status",
                cluster: "haApplianceControl",
                attribute: "status",
                description: "Status",
                lookup: {
                    plugged_out: 0x00,
                    off: 0x01,
                    plugged_in_charging: 0x02,
                    plugged_in_paused: 0x03,
                    plugged_in: 0x04,
                    stopped: 0x05,
                },
                access: "STATE_GET",
                reporting: {min: "5_SECONDS", max: "1_HOUR", change: 1},
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS},
            }),
            futurehomeExtend.chargingCommand(),
            m.numeric({
                name: "setpoint_charging_current",
                cluster: "genAnalogOutput",
                attribute: "presentValue",
                description: "Setpoint charging current",
                unit: "A",
                access: "ALL",
                valueMin: 6,
                valueMax: 32,
                valueStep: 1,
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS},
            }),
            m.binary<"haApplianceControl", FuturehomeHaApplianceControl>({
                name: "auto_charge",
                cluster: "haApplianceControl",
                attribute: "autoCharge",
                description: "Automatically start charging when a car is connected.",
                valueOff: ["OFF", 0],
                valueOn: ["ON", 1],
                entityCategory: "config",
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS},
            }),
            m.binary({
                name: "cable_locked",
                cluster: "closuresDoorLock",
                attribute: "operatingMode",
                valueOff: ["UNLOCK", 0x00],
                valueOn: ["LOCK", 0x02],
                description: "Permanently lock cable when not charging.",
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS},
            }),
            futurehomeExtend.forceUnlock(),
            m.numeric({
                name: "charging_current_limit",
                cluster: "genAnalogOutput",
                attribute: "maxPresentValue",
                description: "Maximum charging current.",
                unit: "A",
                access: "ALL",
                valueMin: 6,
                valueMax: 32,
                valueStep: 1,
                entityCategory: "config",
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS},
            }),
            futurehomeExtend.sessionEnergyDuration(),
            m.numeric<"haElectricalMeasurement", undefined>({
                name: "power",
                cluster: "haElectricalMeasurement",
                attribute: "totalActivePower",
                description: "Power",
                unit: "W",
                access: "STATE_GET",
                reporting: {min: 5, max: "1_HOUR", change: 1},
            }),
            m.electricityMeter({
                energy: {divisor: 1000, multiplier: 1, min: "1_MINUTE", change: 1},
                power: false,
                threePhase: true,
            }),
            futurehomeExtend.chargerSessionTimings(),
        ],
    },
];
