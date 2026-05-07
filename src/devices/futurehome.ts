import {Zcl} from "zigbee-herdsman";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz, KeyValueAny, ModernExtend, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

interface FuturehomeHaApplianceControl {
    attributes: {
        autoCharge: number;
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
    chargerStatus: (): ModernExtend => {
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
                        let charging = false;

                        switch (status) {
                            case 0x01: // Off
                                chargerStatus = "1X: Off";
                                charging = false;
                                break;

                            case 0x02: // StandBy → charging
                                chargerStatus = "2: plugged_in_charging";
                                charging = true;
                                break;

                            case 0x03: // Programmed (paused by user)
                                chargerStatus = "3: plugged_in_paused";
                                charging = false;
                                break;

                            case 0x04: // ProgrammedWaitingToStart
                                chargerStatus = "4: plugged_in";
                                charging = false;
                                break;

                            case 0x05: // Running
                                chargerStatus = "5X: running";
                                charging = false;
                                break;

                            case 0x08: // Failure
                                chargerStatus = "8X: failure";
                                charging = false;
                                break;

                            default:
                                chargerStatus = "plugged_out";
                                charging = false;
                        }
                        return {charger_status: chargerStatus, charging};
                    },
                } satisfies Fz.Converter<"haApplianceControl", undefined, ["commandSignalStateNotification", "commandSignalStateRsp"]>,
            ],
            exposes: [
                exposes
                    .enum("charger_status", ea.STATE_GET, ["plugged_out", "plugged_in", "plugged_in_charging", "plugged_in_paused"])
                    .withDescription("Current EV charger state"),
            ],
        };
    },
    charging: (): ModernExtend => {
        return {
            isModernExtend: true,
            fromZigbee: [],
            toZigbee: [
                {
                    key: ["charging"],
                    convertSet: async (entity, key, value, meta) => {
                        const lookup: KeyValueAny = {Start: "0x01", Stop: "0x02", Pause: "0x03"};
                        await entity.command("haApplianceControl", "executionOfCommand", {commandId: lookup[value as keyof typeof lookup]});
                        return {state: {charging: value}};
                    },
                } satisfies Tz.Converter,
            ],
            exposes: [exposes.enum("charging", ea.STATE_SET, ["Start", "Pause", "Stop"]).withDescription("Start or pause charging.")],
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
            // m.numeric({
            //     "name":"analog_output_1",
            //     "valueMax":2143289344,
            //     "cluster":"genAnalogOutput",
            //     "attribute":"presentValue",
            //     "reporting":{"min":"MIN","max":"MAX","change":1},
            //     "description":"Analog Output analog_output_1 on endpoint 1","access":"ALL"
            // }),
            // m.lock({"pinCodeCount":50}),
            // m.electricityMeter(),
            m.deviceAddCustomCluster("haApplianceControl", {
                name: "haApplianceControl",
                ID: Zcl.Clusters.haApplianceControl.ID,
                attributes: {
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
            futurehomeExtend.chargerStatus(),
            futurehomeExtend.charging(),
            m.binary({
                name: "cable_locked",
                cluster: "closuresDoorLock",
                attribute: "operatingMode",
                valueOff: ["UNLOCK", 0x00],
                valueOn: ["LOCK", 0x02],
                description: "Permanently lock cable when not charging.",
            }),
            // lockState (2), actuatorEnabled (176), supportedOperatingModes (261)
            // 'closuresDoorLock': {"lockState":2,"supportedOperatingModes":261,"actuatorEnabled":176}
            // 'genMultistateValue': {"numberOfStates":8,"outOfService":0,"presentValue":5}
            // 'genMultistateInput': {"numberOfStates":6,"outOfService":0,"presentValue":65}
            m.numeric({
                name: "charging_current",
                cluster: "genAnalogOutput",
                attribute: "presentValue",
                description: "Actual charging current ??",
                unit: "A",
                access: "STATE",
                reporting: {min: "10_SECONDS", max: "1_HOUR", change: 1},
            }),

            m.numeric({
                name: "current_limit",
                cluster: "genAnalogOutput",
                attribute: "maxPresentValue",
                description: "Maximum charging current.",
                unit: "A",
                access: "ALL",
                valueMin: 6,
                valueMax: 32,
                valueStep: 1,
            }),
            // genAnalogOutput: outOfService 0
            m.binary<"haApplianceControl", FuturehomeHaApplianceControl>({
                name: "auto_charge",
                cluster: "haApplianceControl",
                attribute: "autoCharge",
                description: "Automatically start charging when a car is connected.",
                valueOff: ["OFF", 0],
                valueOn: ["ON", 1],
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.FUTUREHOME_AS},
            }),
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
        ],
    },
];
