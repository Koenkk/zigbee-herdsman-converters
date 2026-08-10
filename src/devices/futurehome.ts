import {Zcl} from "zigbee-herdsman";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as globalStore from "../lib/store";
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
        chargingSessionStartT: number;
        chargingSessionEndT: number;
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
                exposes.enum("charging_start", ea.SET, ["start"]).withLabel("Start charging").withDescription("Press to start charging"),
                exposes.enum("charging_stop", ea.SET, ["stop"]).withLabel("Stop charging").withDescription("Press to stop charging"),
                exposes.enum("charging_pause", ea.SET, ["pause"]).withLabel("Pause charging").withDescription("Press to pause charging"),
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
                        const currentSession = globalStore.getValue(meta.device, "charging_session", {
                            isCharging: false,
                            isChargerConnected: false,
                        }) as {
                            isCharging: boolean;
                            isChargerConnected: boolean;
                            chargingStartTime?: string;
                            chargingEndTime?: string;
                            connectedStartTime?: string;
                            connectedEndTime?: string;
                        };

                        const isCharging = status === 0x02;
                        const wasCharging = currentSession.isCharging;
                        const isChargerConnected = status !== 0x00;
                        const wasChargerConnected = currentSession.isChargerConnected;

                        // Charging started
                        if (isCharging && !wasCharging) {
                            currentSession.chargingStartTime = utils.toLocalISOString(now);
                            currentSession.chargingEndTime = undefined;
                            currentSession.isCharging = true;
                            result.charging_start_datetime = currentSession.chargingStartTime;
                            result.charging_end_datetime = currentSession.chargingEndTime;
                        }

                        // Charging ended
                        if (!isCharging && wasCharging) {
                            currentSession.chargingEndTime = utils.toLocalISOString(now);
                            currentSession.isCharging = false;
                            result.charging_end_datetime = currentSession.chargingEndTime;
                        }

                        // charger connected
                        if (isChargerConnected && !wasChargerConnected) {
                            currentSession.connectedStartTime = utils.toLocalISOString(now);
                            currentSession.connectedEndTime = undefined;
                            currentSession.isChargerConnected = true;
                            result.connected_start_datetime = currentSession.connectedStartTime;
                            result.connected_end_datetime = currentSession.connectedEndTime;
                        }

                        // charger disconnected
                        if (!isChargerConnected && wasChargerConnected) {
                            currentSession.connectedEndTime = utils.toLocalISOString(now);
                            currentSession.isChargerConnected = false;
                            result.connected_end_datetime = currentSession.connectedEndTime;
                        }

                        // Expose current charging and connection status
                        result.is_charging = currentSession.isCharging;
                        result.is_charger_connected = currentSession.isChargerConnected;

                        globalStore.putValue(meta.device, "charging_session", currentSession);
                        return result;
                    },
                } satisfies Fz.Converter<"haApplianceControl", FuturehomeHaApplianceControl, ["attributeReport", "readResponse"]>,
            ],
            exposes: [
                exposes.binary("is_charging", ea.STATE, "true", "false").withDescription("Indicates if an active charging session is ongoing."),
                exposes.text("charging_start_datetime", ea.STATE).withDescription("Date and time when charging started (ISO 8601 format)"),
                exposes.text("charging_end_datetime", ea.STATE).withDescription("Date and time when charging ended (ISO 8601 format)"),
                exposes.binary("is_charger_connected", ea.STATE, "true", "false").withDescription("Indicates if the charger is connected."),
                exposes.text("connected_start_datetime", ea.STATE).withDescription("Date and time when charger was connected."),
                exposes.text("connected_end_datetime", ea.STATE).withDescription("Date and time when charger was disconnected."),
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
                        let energyStart = meta.state?.energy_meter_start !== undefined ? meta.state.energy_meter_start : null;
                        let energyNow = meta.state?.energy_meter_now !== undefined ? meta.state.energy_meter_now : null;
                        let startT = meta.state?.start_t !== undefined ? meta.state.start_t : null;
                        let endT = meta.state?.end_t !== undefined ? meta.state.end_t : null;
                        if (msg.data.energyMeterStart !== undefined) {
                            energyStart = msg.data.energyMeterStart / 1000;
                        }
                        if (msg.data.energyMeterNow !== undefined) {
                            energyNow = msg.data.energyMeterNow / 1000;
                        }
                        if (msg.data.chargingSessionStartT !== undefined) {
                            startT = msg.data.chargingSessionStartT;
                        }
                        if (msg.data.chargingSessionEndT !== undefined) {
                            endT = msg.data.chargingSessionEndT;
                        }
                        if (energyStart !== null && energyNow !== null) {
                            result.session_energy = ((energyNow as number) - (energyStart as number)).toFixed(3);
                        }
                        if (startT !== null && endT !== null) {
                            result.charging_duration = (endT as number) - (startT as number);
                        }
                        return result;
                    },
                } satisfies Fz.Converter<"haApplianceControl", FuturehomeHaApplianceControl, ["attributeReport", "readResponse"]>,
            ],
            exposes: [
                exposes
                    .numeric("session_energy", ea.STATE)
                    .withLabel("Session energy")
                    .withDescription("For ongoining or last session as reported by the charger.")
                    .withUnit("kWh"),
                exposes
                    .numeric("charging_duration", ea.STATE)
                    .withDescription("Charging duration for ongoing or last session as reported by the charger.")
                    .withUnit("s"),
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
                    //     ID: 0xef00,
                    chargingSessionStartT: {
                        name: "chargingSessionStartT",
                        ID: 0xef01,
                        type: Zcl.DataType.UINT32,
                        manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS,
                    },
                    chargingSessionEndT: {
                        name: "chargingSessionEndT",
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
                reporting: {min: 5, max: "1_HOUR", change: 1},
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
            futurehomeExtend.chargerSessionTimings(),
            m.binary({
                name: "cable_locked",
                cluster: "closuresDoorLock",
                attribute: "operatingMode",
                valueOff: ["UNLOCK", 0x00],
                valueOn: ["LOCK", 0x02],
                description: "Permanently lock cable when not charging.",
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS},
            }),
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
            m.binary<"haApplianceControl", FuturehomeHaApplianceControl>({
                name: "auto_charge",
                cluster: "haApplianceControl",
                attribute: "autoCharge",
                description: "Automatically start charging when a car is connected.",
                valueOff: ["OFF", 0],
                valueOn: ["ON", 1],
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
            m.numeric<"haApplianceControl", FuturehomeHaApplianceControl>({
                name: "energy_meter_start",
                cluster: "haApplianceControl",
                attribute: "energyMeterStart",
                description: "energyMeterStart",
                unit: "kWh",
                access: "STATE",
                scale: 1000,
                reporting: {min: 5, max: "1_HOUR", change: 1},
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS},
            }),
            m.numeric<"haApplianceControl", FuturehomeHaApplianceControl>({
                name: "energy_meter_now",
                cluster: "haApplianceControl",
                attribute: "energyMeterNow",
                description: "energyMeterNow",
                unit: "kWh",
                access: "STATE",
                scale: 1000,
                reporting: {min: 5, max: "1_HOUR", change: 1},
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS},
            }),
        ],
    },
];
