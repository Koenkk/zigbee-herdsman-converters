import {Zcl} from "zigbee-herdsman";
import * as fz from "../converters/fromZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, KeyValue, ModernExtend} from "../lib/types";
import {assertString, precisionRound} from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

interface ElkoThermostatCluster {
    attributes: {
        elkoLoad: number;
        elkoDisplayText: number;
        elkoSensor: number;
        elkoRegulatorTime: number;
        elkoRegulatorMode: number;
        elkoPowerStatus: number;
        elkoDateTime: number;
        elkoMeanPower: number;
        elkoExternalTemp: number;
        elkoNightSwitching: number;
        elkoFrostGuard: number;
        elkoChildLock: number;
        elkoMaxFloorTemp: number;
        elkoRelayState: number;
        elkoVersion: number;
        elkoCalibration: number;
        elkoLastMessageId: number;
        elkoLastMessageStatus: number;
    };
    commands: never;
    commandResponses: never;
}

const elkoExtend = {
    addElkoToHvacThermostatCluster: () =>
        m.deviceAddCustomCluster("hvacThermostat", {
            ID: Zcl.Clusters.hvacThermostat.ID,
            attributes: {
                elkoLoad: {ID: 0x0401, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                elkoDisplayText: {ID: 0x0402, type: Zcl.DataType.CHAR_STR, write: true},
                elkoSensor: {ID: 0x0403, type: Zcl.DataType.ENUM8, write: true, max: 0xff},
                elkoRegulatorTime: {ID: 0x0404, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                elkoRegulatorMode: {ID: 0x0405, type: Zcl.DataType.BOOLEAN, write: true},
                elkoPowerStatus: {ID: 0x0406, type: Zcl.DataType.BOOLEAN, write: true},
                elkoDateTime: {ID: 0x0407, type: Zcl.DataType.OCTET_STR, write: true},
                elkoMeanPower: {ID: 0x0408, type: Zcl.DataType.UINT16, write: true, max: 0xffff},
                elkoExternalTemp: {ID: 0x0409, type: Zcl.DataType.INT16, write: true, min: -32768, max: 32767},
                elkoNightSwitching: {ID: 0x0411, type: Zcl.DataType.BOOLEAN, write: true},
                elkoFrostGuard: {ID: 0x0412, type: Zcl.DataType.BOOLEAN, write: true},
                elkoChildLock: {ID: 0x0413, type: Zcl.DataType.BOOLEAN, write: true},
                elkoMaxFloorTemp: {ID: 0x0414, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                elkoRelayState: {ID: 0x0415, type: Zcl.DataType.BOOLEAN, write: true},
                elkoVersion: {ID: 0x0416, type: Zcl.DataType.OCTET_STR, write: true},
                elkoCalibration: {ID: 0x0417, type: Zcl.DataType.INT8, write: true, min: -128, max: 127},
                elkoLastMessageId: {ID: 0x0418, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                elkoLastMessageStatus: {ID: 0x0419, type: Zcl.DataType.UINT8, write: true, max: 0xff},
            },
            commands: {},
            commandsResponse: {},
        }),
    elkoThermostat: (options: m.ThermostatArgs): ModernExtend => {
        const extend = m.thermostat(options);
        const climateExpose = extend.exposes.find((exp) => typeof exp !== "function" && "type" in exp && exp.type === "climate");
        if (climateExpose) {
            climateExpose.withSystemMode(["off", "heat"]).withRunningState(["idle", "heat"]).withLocalTemperatureCalibration();
        }
        extend.exposes.push(e.numeric("power", ea.STATE).withUnit("W").withDescription("Calculated power usage (load * relay state)"));
        extend.fromZigbee.push({
            cluster: "hvacThermostat",
            type: ["attributeReport", "readResponse"],
            convert: (model, msg, publish, options, meta) => {
                const result: KeyValue = {};
                if ("localTemp" in msg.data || "elkoExternalTemp" in msg.data) {
                    const floorSensorModes = ["floor", "supervisor_floor"];
                    const sensorMode = (meta.state?.sensor as string) || "air";
                    const reportedAirTemp = "localTemp" in msg.data ? precisionRound(msg.data.localTemp, 2) / 100 : undefined;
                    const reportedFloorTemp = "elkoExternalTemp" in msg.data ? precisionRound(msg.data.elkoExternalTemp, 2) / 100 : undefined;
                    if (reportedAirTemp !== undefined) result.air_temp = reportedAirTemp;
                    if (reportedFloorTemp !== undefined) result.floor_temp = reportedFloorTemp;
                    let displayTemp: number | undefined;
                    if (floorSensorModes.includes(sensorMode)) {
                        // Hvis termostaten er i gulv-modus, bruk gulvtemp (ny eller lagret)
                        displayTemp = reportedFloorTemp ?? (meta.state?.floor_temp as number);
                    } else {
                        displayTemp = reportedAirTemp ?? (meta.state?.air_temp as number);
                    }
                    if (displayTemp !== undefined && displayTemp >= -273.15) {
                        result.local_temperature = precisionRound(displayTemp, 2);
                    }
                }
                if (msg.data.elkoLoad !== undefined) {
                    result.load = msg.data.elkoLoad;
                }
                if ("elkoPowerStatus" in msg.data) {
                    result.system_mode = msg.data.elkoPowerStatus ? "heat" : "off";
                }
                if ("elkoRelayState" in msg.data) {
                    result.running_state = msg.data.elkoRelayState ? "heat" : "idle";
                }
                if ("elkoCalibration" in msg.data) {
                    result.local_temperature_calibration = Math.round(msg.data.elkoCalibration / 10);
                }
                const currentRunningState = result.running_state || meta.state?.running_state;
                const currentLoad = result.load !== undefined ? result.load : meta.state?.load;
                if (currentRunningState !== undefined && currentLoad !== undefined) {
                    result.power = currentRunningState === "heat" ? currentLoad : 0;
                }

                return result;
            },
        });
        extend.toZigbee.push({
            key: ["system_mode", "local_temperature_calibration"],
            convertSet: async (entity, key, value, meta) => {
                if (key === "system_mode") {
                    await entity.write("hvacThermostat", {elkoPowerStatus: value === "heat" ? 1 : 0});
                    return {state: {[key]: value}};
                }
                if (key === "local_temperature_calibration") {
                    await entity.write("hvacThermostat", {elkoCalibration: Math.round(Number(value) * 10)});
                    return {state: {[key]: value}};
                }
            },
        });
        return extend;
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ElkoDimmerZHA"],
        model: "316GLEDRF",
        vendor: "ELKO",
        description: "Zigbee in-wall smart dimmer",
        extend: [m.light({configureReporting: true, powerOnBehavior: false, effect: false})],
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ["ElkoDimmerRemoteZHA"],
        model: "EKO05806",
        vendor: "ELKO",
        description: "Elko ESH 316 Endevender RF",
        fromZigbee: [fz.command_toggle, fz.command_step],
        toZigbee: [],
        exposes: [e.action(["toggle", "brightness_step_up", "brightness_step_down"])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genLevelCtrl"]);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ["Super TR"],
        model: "4523430",
        vendor: "ELKO",
        description: "ESH Plus Super TR RF PH",
        extend: [
            elkoExtend.addElkoToHvacThermostatCluster(),
            elkoExtend.elkoThermostat({
                setpoints: {values: {occupiedHeatingSetpoint: {min: 5, max: 40, step: 1}}},
            }),
            m.text<"hvacThermostat", ElkoThermostatCluster>({
                name: "display_text",
                cluster: "hvacThermostat",
                attribute: "elkoDisplayText",
                description: "Displayed text on thermostat display (zone). Max 14 characters",
                access: "ALL",
                entityCategory: "config",
                validate: (value) => {
                    assertString(value);
                    if (value.length > 14) throw new Error("Length of text is greater than 14");
                },
            }),
            m.numeric<"hvacThermostat", ElkoThermostatCluster>({
                name: "load",
                cluster: "hvacThermostat",
                attribute: "elkoLoad",
                description: "Load in W when heating is on (between 0-2300 W). The thermostat uses the value as input to the mean_power calculation.",
                entityCategory: "config",
                access: "ALL",
                unit: "W",
                reporting: {min: 0, max: "1_HOUR", change: 1},
                valueMin: 0,
                valueMax: 2300,
            }),
            m.binary<"hvacThermostat", ElkoThermostatCluster>({
                name: "regulator_mode",
                cluster: "hvacThermostat",
                attribute: "elkoRegulatorMode",
                description: "Device in regulator or thermostat mode.",
                entityCategory: "config",
                access: "ALL",
                reporting: {min: 0, max: "1_HOUR", change: null},
                valueOn: ["regulator", 1],
                valueOff: ["thermostat", 0],
            }),
            m.numeric<"hvacThermostat", ElkoThermostatCluster>({
                name: "regulator_time",
                cluster: "hvacThermostat",
                attribute: "elkoRegulatorTime",
                description:
                    "When device is in regulator mode this controls the time between each " +
                    "in/out connection. When device is in thermostat mode this controls the  time between each in/out switch when measured " +
                    "temperature is within +-0.5 °C set temperature. Choose a long time for (slow) concrete floors and a short time for " +
                    "(quick) wooden floors.",
                entityCategory: "config",
                access: "ALL",
                reporting: {min: 0, max: "1_HOUR", change: 1},
                unit: "min",
                valueMin: 5,
                valueMax: 20,
            }),
            m.enumLookup<"hvacThermostat", ElkoThermostatCluster>({
                name: "sensor",
                cluster: "hvacThermostat",
                attribute: "elkoSensor",
                description: "Select temperature sensor to use",
                entityCategory: "config",
                reporting: {min: "MIN", max: "MAX", change: null},
                lookup: {air: 0, floor: 1, supervisor_floor: 3},
            }),
            m.numeric<"hvacThermostat", ElkoThermostatCluster>({
                name: "floor_temp",
                cluster: "hvacThermostat",
                attribute: "elkoExternalTemp",
                description: "Current temperature measured on the external sensor (floor)",
                access: "STATE_GET",
                unit: "°C",
                reporting: {min: 0, max: constants.repInterval.HOUR, change: 10},
                scale: 100,
            }),
            m.numeric<"hvacThermostat", ElkoThermostatCluster>({
                name: "max_floor_temp",
                cluster: "hvacThermostat",
                attribute: "elkoMaxFloorTemp",
                description: 'Set max floor temperature (between 20-35 °C) when "supervisor_floor" is set',
                entityCategory: "config",
                access: "ALL",
                reporting: {min: 0, max: constants.repInterval.HOUR, change: 1},
                unit: "°C",
                valueMin: 20,
                valueMax: 35,
            }),
            m.numeric<"hvacThermostat", ElkoThermostatCluster>({
                name: "mean_power",
                cluster: "hvacThermostat",
                attribute: "elkoMeanPower",
                description: "Reports average power usage last 10 minutes",
                access: "STATE_GET",
                unit: "W",
                reporting: {min: 0, max: constants.repInterval.HOUR, change: 5},
            }),
            m.binary<"hvacThermostat", ElkoThermostatCluster>({
                name: "child_lock",
                cluster: "hvacThermostat",
                attribute: "elkoChildLock",
                description: "Enables/disables physical input on the device",
                access: "ALL",
                reporting: {min: 0, max: constants.repInterval.HOUR, change: null},
                valueOn: ["lock", 1],
                valueOff: ["unlock", 0],
            }),
            m.binary<"hvacThermostat", ElkoThermostatCluster>({
                name: "frost_guard",
                cluster: "hvacThermostat",
                attribute: "elkoFrostGuard",
                description:
                    "When frost guard is ON, it is activated when the thermostat is switched OFF with the ON/OFF button." +
                    'At the same time, the display will fade and the text "Frostsikring x °C" appears in the display and remains until the ' +
                    "thermostat is switched on again.",
                entityCategory: "config",
                access: "ALL",
                reporting: {min: 0, max: constants.repInterval.HOUR, change: null},
                valueOn: ["on", 1],
                valueOff: ["off", 0],
            }),
            m.binary<"hvacThermostat", ElkoThermostatCluster>({
                name: "night_switching",
                cluster: "hvacThermostat",
                attribute: "elkoNightSwitching",
                description: "Turn on or off night setting.",
                entityCategory: "config",
                access: "ALL",
                reporting: {min: 0, max: constants.repInterval.HOUR, change: null},
                valueOn: ["on", 1],
                valueOff: ["off", 0],
            }),
        ],
        configure: (device, coordinatorEndpoint) => {
            device.powerSource = "Mains (single phase)";
            device.save();
        },
    },
];
