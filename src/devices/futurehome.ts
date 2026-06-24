import {Zcl} from "zigbee-herdsman";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz, ModernExtend, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

interface FuturehomeHaApplianceControl {
    attributes: {
        autoCharge: number;
        energyMeterStart: number;
        energyMeterNow: number;
        a1: number;
        a2: number;
        a5: number;
        a6: number;
        a7: number;
        a8: number;
        a9: number;
        aa: number;
        ab: number;
        a10: number;
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
    chargerStatus1: (): ModernExtend => {
        return {
            isModernExtend: true,
            fromZigbee: [
                {
                    cluster: "haApplianceControl",
                    type: ["commandSignalStateNotification", "commandSignalStateRsp"],
                    convert(model, msg, publish, options, meta) {
                        const status = msg?.data?.applianceStatus;
                        if (status === undefined || status === null) return;
                        let chargerStatus:
                            | "plugged_out"
                            | "1X: Off"
                            | "4: plugged_in"
                            | "2: plugged_in_charging"
                            | "3: plugged_in_paused"
                            | "5X: running"
                            | "8X: failure" = "plugged_out";
                        let chargingOn = false;

                        switch (status) {
                            case 0x01: // Off
                                chargerStatus = "1X: Off";
                                chargingOn = false;
                                break;
                            case 0x02: // StandBy → charging
                                chargerStatus = "2: plugged_in_charging";
                                chargingOn = true;
                                break;
                            case 0x03: // Programmed (paused by user)
                                chargerStatus = "3: plugged_in_paused";
                                chargingOn = false;
                                break;
                            case 0x04: // ProgrammedWaitingToStart
                                chargerStatus = "4: plugged_in";
                                chargingOn = false;
                                break;
                            case 0x05: // Running
                                chargerStatus = "5X: running";
                                chargingOn = false;
                                break;
                            case 0x08: // Failure
                                chargerStatus = "8X: failure";
                                chargingOn = false;
                                break;
                            default:
                                chargerStatus = "plugged_out";
                                chargingOn = false;
                        }
                        return {charger_status: chargerStatus, charging_on: chargingOn};
                    },
                } satisfies Fz.Converter<"haApplianceControl", undefined, ["commandSignalStateNotification", "commandSignalStateRsp"]>,
            ],
            toZigbee: [
                {
                    key: ["charger_status"],
                    convertGet: async (entity, key, meta) => {
                        await entity.command("haApplianceControl", "signalState", {});
                    },
                } satisfies Tz.Converter,
            ],
            configure: [
                async (device, coordinatorEndpoint, logger) => {
                    for (const endpoint of device.endpoints) {
                        if (endpoint.supportsInputCluster("haApplianceControl")) {
                            await endpoint.bind("haApplianceControl", coordinatorEndpoint);
                            try {
                                await endpoint.command("haApplianceControl", "signalState", {});
                            } catch {
                                // do nothing
                            }
                        }
                    }
                },
            ],
            options: [
                e
                    .numeric("charger_status_poll_interval", ea.SET)
                    .withValueMin(-1)
                    .withDescription("Polling interval charger status (default: 60s, -1 to disable)"),
            ],
            onEvent: m.poll({
                key: "charger_status_poll",
                optionKey: "charger_status_poll_interval",
                option: e
                    .numeric("charger_status_poll_interval", ea.SET)
                    .withValueMin(-1)
                    .withDescription("Polling interval charger status (default: 60s, -1 to disable)"),
                defaultIntervalSeconds: 60,
                poll: async (device) => {
                    const endpoint = device.endpoints.find((e) => e.supportsInputCluster("haApplianceControl"));
                    if (endpoint) {
                        await endpoint.command("haApplianceControl", "signalState", {});
                    }
                },
            }).onEvent,
            exposes: [
                exposes
                    .enum("charger_status", ea.STATE_GET, [
                        "plugged_out",
                        "1X: Off",
                        "2: plugged_in_charging",
                        "3: plugged_in_paused",
                        "4: plugged_in",
                        "5X: running",
                        "8X: failure",
                    ])
                    .withDescription("Current EV charger state"),
                exposes.binary("charging_on", ea.STATE, "true", "false").withDescription("Indicates if the charger is actively delivering power"),
            ],
        };
    },
    chargerStatus: (): ModernExtend => {
        const extend: ModernExtend = {
            isModernExtend: true,
            fromZigbee: [
                {
                    cluster: "haApplianceControl",
                    type: ["commandSignalStateNotification", "commandSignalStateRsp"],
                    convert(model, msg, publish, options, meta) {
                        const status = msg?.data?.applianceStatus;
                        if (status === undefined || status === null) return;
                        let chargerStatus:
                            | "plugged_out"
                            | "1X: Off"
                            | "4: plugged_in"
                            | "2: plugged_in_charging"
                            | "3: plugged_in_paused"
                            | "5X: running"
                            | "8X: failure" = "plugged_out";
                        let chargingOn = false;

                        switch (status) {
                            case 0x01: // Off
                                chargerStatus = "1X: Off";
                                chargingOn = false;
                                break;
                            case 0x02: // StandBy → charging
                                chargerStatus = "2: plugged_in_charging";
                                chargingOn = true;
                                break;
                            case 0x03: // Programmed (paused by user)
                                chargerStatus = "3: plugged_in_paused";
                                chargingOn = false;
                                break;
                            case 0x04: // ProgrammedWaitingToStart
                                chargerStatus = "4: plugged_in";
                                chargingOn = false;
                                break;
                            case 0x05: // Running
                                chargerStatus = "5X: running";
                                chargingOn = false;
                                break;
                            case 0x08: // Failure
                                chargerStatus = "8X: failure";
                                chargingOn = false;
                                break;
                            default:
                                chargerStatus = "plugged_out";
                                chargingOn = false;
                        }
                        return {charger_status: chargerStatus, charging_on: chargingOn === true ? "ON" : "OFF"};
                    },
                } satisfies Fz.Converter<"haApplianceControl", undefined, ["commandSignalStateNotification", "commandSignalStateRsp"]>,
            ],
            toZigbee: [
                {
                    key: ["charger_status", "charging_on"],
                    convertGet: async (entity, key, meta) => {
                        await entity.command("haApplianceControl", "signalState", {});
                    },
                } satisfies Tz.Converter,
            ],
            configure: [
                async (device, coordinatorEndpoint, logger) => {
                    for (const endpoint of device.endpoints) {
                        if (endpoint.supportsInputCluster("haApplianceControl")) {
                            await endpoint.bind("haApplianceControl", coordinatorEndpoint);
                            try {
                                await endpoint.command("haApplianceControl", "signalState", {});
                            } catch {
                                // do nothing
                            }
                        }
                    }
                },
            ],
            exposes: [
                exposes
                    .enum("charger_status", ea.STATE_GET, [
                        "plugged_out",
                        "1X: Off",
                        "2: plugged_in_charging",
                        "3: plugged_in_paused",
                        "4: plugged_in",
                        "5X: running",
                        "8X: failure",
                    ])
                    .withDescription("Current EV charger state"),
                exposes.binary("charging_on", ea.STATE, "ON", "OFF").withDescription("Indicates if the charger is actively delivering power"),
            ],
        };
        const pollExtend = m.poll({
            key: "charger_status_poll",
            optionKey: "charger_status_poll_interval",
            option: e
                .numeric("charger_status_poll_interval", ea.SET)
                .withValueMin(-1)
                .withUnit("s")
                .withDescription("Polling interval charger status (default: 60s, -1 to disable)"),
            defaultIntervalSeconds: 60,
            poll: async (device) => {
                const endpoint = device.endpoints.find((e) => e.supportsInputCluster("haApplianceControl"));
                if (endpoint) {
                    await endpoint.command("haApplianceControl", "signalState", {});
                }
            },
        });
        extend.onEvent = pollExtend.onEvent;
        extend.options = pollExtend.options;
        return extend;
    },
    charging: (): ModernExtend => {
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
                        const normalizedAction = key.replace("charging_", ""); // "start", "stop", or "pause"
                        const commandId = commandLookup[normalizedAction];
                        await entity.command("haApplianceControl", "executionOfCommand", {commandId: commandId});
                        try {
                            await entity.command("haApplianceControl", "signalState", {});
                        } catch {
                            // do nothing
                        }
                        return; // {state: {charging: value}};
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
    previousSessionEnergy: (): ModernExtend => {
        return {
            isModernExtend: true,
            fromZigbee: [
                {
                    cluster: "haApplianceControl",
                    type: ["attributeReport", "readResponse"],
                    convert: (model, msg, publish, options, meta) => {
                        // const prev_session_energy = (msg.data.energyMeterNow - msg.data.energyMeterStart) / 1000;
                        if (msg.data.energyMeterNow !== undefined && msg.data.energyMeterStart !== undefined) {
                            const prev_session_energy = msg.data.energyMeterNow - msg.data.energyMeterStart;
                            return {
                                previous_session_energy: prev_session_energy,
                            };
                        }
                    },
                } satisfies Fz.Converter<"haApplianceControl", FuturehomeHaApplianceControl, ["attributeReport", "readResponse"]>,
            ],
            toZigbee: [
                {
                    key: ["prev_session_energy"],
                    convertGet: async (entity, key, meta) => {
                        await entity.read<"haApplianceControl", FuturehomeHaApplianceControl>("haApplianceControl", [
                            "energyMeterNow",
                            "energyMeterStart",
                        ]);
                    },
                } satisfies Tz.Converter,
            ],
            exposes: [
                exposes
                    .numeric("previous_session_energy", ea.STATE_GET)
                    .withLabel("Session energy")
                    .withDescription("Previous session")
                    .withUnit("kWh"),
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
                    a1: {
                        name: "a1",
                        ID: 0xef01,
                        type: Zcl.DataType.UINT32,
                        manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS,
                        write: true,
                    },
                    a2: {
                        name: "a2",
                        ID: 0xef02,
                        type: Zcl.DataType.UINT32,
                        manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS,
                        write: true,
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
                    a5: {
                        name: "a5",
                        ID: 0xef05,
                        type: Zcl.DataType.UINT8,
                        manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS,
                        write: true,
                    },
                    a6: {
                        name: "a6",
                        ID: 0xef06,
                        type: Zcl.DataType.UINT8,
                        manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS,
                        write: true,
                    },
                    a7: {
                        name: "a7",
                        ID: 0xef07,
                        type: Zcl.DataType.UINT8,
                        manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS,
                        write: true,
                    },
                    a8: {
                        name: "a8",
                        ID: 0xef08,
                        type: Zcl.DataType.UINT8,
                        manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS,
                        write: true,
                    },
                    a9: {
                        name: "a9",
                        ID: 0xef09,
                        type: Zcl.DataType.UINT8,
                        manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS,
                        write: true,
                    },
                    aa: {
                        name: "aa",
                        ID: 0xef0a,
                        type: Zcl.DataType.UINT8,
                        manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS,
                        write: true,
                    },
                    ab: {
                        name: "ab",
                        ID: 0xef0b,
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
                    // ID: 0xef0d,
                    // ID: 0xef0e,
                    // ID: 0xef0f,
                    a10: {
                        name: "a10",
                        ID: 0xef10,
                        type: Zcl.DataType.UINT8,
                        manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS,
                        write: true,
                    },
                    // ID: 0xef11,
                },
                commands: {},
                commandsResponse: {},
            }),
            futurehomeExtend.chargerStatus(),
            futurehomeExtend.charging(),
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
            futurehomeExtend.previousSessionEnergy(),
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
                energy: {divisor: 1000, multiplier: 1},
                power: false,
                threePhase: true,
            }),
            m.numeric<"haApplianceControl", FuturehomeHaApplianceControl>({
                name: "energy_meter_start",
                cluster: "haApplianceControl",
                attribute: "energyMeterStart",
                description: "energyMeterStart",
                unit: "kWh",
                access: "STATE_GET",
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
                access: "STATE_GET",
                scale: 1000,
                reporting: {min: 5, max: "1_HOUR", change: 1},
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS},
            }),
            m.numeric<"haApplianceControl", FuturehomeHaApplianceControl>({
                name: "a1",
                cluster: "haApplianceControl",
                attribute: "a1",
                description: "a1",
                access: "STATE_GET",
                reporting: {min: 5, max: "1_HOUR", change: 1},
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS},
            }),
            m.numeric<"haApplianceControl", FuturehomeHaApplianceControl>({
                name: "a2",
                cluster: "haApplianceControl",
                attribute: "a2",
                description: "a2",
                access: "STATE_GET",
                reporting: {min: 5, max: "1_HOUR", change: 1},
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS},
            }),
            m.numeric<"haApplianceControl", FuturehomeHaApplianceControl>({
                name: "a5",
                cluster: "haApplianceControl",
                attribute: "a5",
                description: "a5",
                access: "STATE_GET",
                // reporting: {min: 5, max: "1_HOUR", change: 1},  not reportable
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS},
            }),
            m.numeric<"haApplianceControl", FuturehomeHaApplianceControl>({
                name: "a6",
                cluster: "haApplianceControl",
                attribute: "a6",
                description: "a6",
                access: "STATE_GET",
                // reporting: {min: 5, max: "1_HOUR", change: 1}, not reportable
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS},
            }),
            m.numeric<"haApplianceControl", FuturehomeHaApplianceControl>({
                name: "a7",
                cluster: "haApplianceControl",
                attribute: "a7",
                description: "a7",
                access: "STATE_GET",
                // reporting: {min: 5, max: "1_HOUR", change: 1},  not reportable
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS},
            }),
            m.numeric<"haApplianceControl", FuturehomeHaApplianceControl>({
                name: "a8",
                cluster: "haApplianceControl",
                attribute: "a8",
                description: "a8",
                access: "STATE_GET",
                // reporting: {min: 5, max: "1_HOUR", change: 1},  not reportable
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS},
            }),
            m.numeric<"haApplianceControl", FuturehomeHaApplianceControl>({
                name: "a9",
                cluster: "haApplianceControl",
                attribute: "a9",
                description: "a9",
                access: "STATE_GET",
                reporting: {min: 5, max: "1_HOUR", change: 1}, // reportable
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS},
            }),
            m.numeric<"haApplianceControl", FuturehomeHaApplianceControl>({
                name: "aa",
                cluster: "haApplianceControl",
                attribute: "aa",
                description: "aa",
                access: "STATE_GET",
                reporting: {min: 5, max: "1_HOUR", change: 1},
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS},
            }),
            m.numeric<"haApplianceControl", FuturehomeHaApplianceControl>({
                name: "ab",
                cluster: "haApplianceControl",
                attribute: "ab",
                description: "ab",
                access: "STATE_GET",
                // reporting: {min: 5, max: "1_HOUR", change: 1},  not reportable
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS},
            }),
            m.numeric<"haApplianceControl", FuturehomeHaApplianceControl>({
                name: "a10",
                cluster: "haApplianceControl",
                attribute: "a10",
                description: "a10",
                access: "STATE_GET",
                // reporting: {min: 5, max: "1_HOUR", change: 1},  not reportable
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS},
            }),
        ],
    },
];
