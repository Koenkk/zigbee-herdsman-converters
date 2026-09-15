import {Zcl} from "zigbee-herdsman";

import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValue} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    on_off_via_brightness: {
        cluster: "genLevelCtrl",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.currentLevel !== undefined) {
                const currentLevel = Number(msg.data.currentLevel);
                const property = utils.postfixWithEndpointName("state", msg, model, meta);
                return {[property]: currentLevel > 0 ? "ON" : "OFF"};
            }
        },
    } satisfies Fz.Converter<"genLevelCtrl", undefined, ["attributeReport", "readResponse"]>,
    restore_execute_if_off_after_power_cycle: {
        cluster: "genLevelCtrl",
        type: ["attributeReport"],
        convert: async (model, msg, publish, options, meta) => {
            // DG3HL does not announce after a mains cycle, but its first level report always uses TSN 1.
            const levelConfig = meta.state.level_config as KeyValue | undefined;
            if (msg.data.currentLevel !== undefined && msg.meta.zclTransactionSequenceNumber === 1 && levelConfig?.execute_if_off === true) {
                await msg.endpoint.write("genLevelCtrl", {options: 1});
            }
        },
    } satisfies Fz.Converter<"genLevelCtrl", undefined, ["attributeReport"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["DL15S"],
        model: "DL15S-1BZ",
        vendor: "Leviton",
        description: "Lumina RF 15A switch, 120/277V",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["DG6HD"],
        model: "DG6HD-1BW",
        vendor: "Leviton",
        description: "Zigbee in-wall smart dimmer",
        extend: [m.light({effect: false, configureReporting: true})],
    },
    {
        zigbeeModel: ["DG3HL"],
        model: "DG3HL-1BW",
        vendor: "Leviton",
        description: "Indoor Decora smart Zigbee 3.0 certified plug-in dimmer",
        fromZigbee: [fzLocal.restore_execute_if_off_after_power_cycle],
        extend: [
            m.deviceAddCustomCluster("lightingBallastCfg", {
                name: "lightingBallastCfg",
                ID: Zcl.Clusters.lightingBallastCfg.ID,
                attributes: {
                    powerOnLevel: {name: "powerOnLevel", ID: 0x0012, type: Zcl.DataType.UINT8, write: true, max: 0xff},
                },
                commands: {},
                commandsResponse: {},
            }),
            m.light({
                effect: false,
                configureReporting: true,
                powerOnBehavior: false,
                ota: true,
                levelConfig: {features: ["on_transition_time", "off_transition_time", "on_level", "execute_if_off"]},
            }),
            m.numeric({
                name: "ballast_minimum_level",
                cluster: "lightingBallastCfg",
                attribute: "minLevel",
                description: "Specifies the minimum light output of the ballast",
                access: "ALL",
                valueMin: 1,
                valueMax: 254,
                entityCategory: "config",
            }),
            m.numeric({
                name: "ballast_maximum_level",
                cluster: "lightingBallastCfg",
                attribute: "maxLevel",
                description: "Specifies the maximum light output of the ballast",
                access: "ALL",
                valueMin: 1,
                valueMax: 254,
                entityCategory: "config",
            }),
            m.numeric({
                name: "ballast_power_on_level",
                cluster: "lightingBallastCfg",
                attribute: "powerOnLevel",
                description: "Level applied after mains power returns; 255 restores the previous level",
                access: "ALL",
                valueMin: 1,
                valueMax: 255,
                entityCategory: "config",
            }),
            m.identify(),
        ],
    },
    {
        zigbeeModel: ["DG15A"],
        model: "DG15A-1BW",
        vendor: "Leviton",
        description: "Indoor Decora smart Zigbee 3.0 certified plug-in outlet",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["DG15S"],
        model: "DG15S-1BW",
        vendor: "Leviton",
        description: "Decora smart Zigbee 3.0 certified 15A switch",
        extend: [m.onOff({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ["65A01-1"],
        model: "RC-2000WH",
        vendor: "Leviton",
        description: "Omnistat2 wireless thermostat",
        fromZigbee: [fz.thermostat, fz.fan],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupancy,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_unoccupied_cooling_setpoint,
            tz.thermostat_setpoint_raise_lower,
            tz.thermostat_remote_sensing,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_system_mode,
            tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule,
            tz.thermostat_relay_status_log,
            tz.thermostat_temperature_setpoint_hold,
            tz.thermostat_temperature_setpoint_hold_duration,
            tz.fan_mode,
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacThermostat", "hvacFanCtrl"]);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedCoolingSetpoint(endpoint);
            await reporting.fanMode(endpoint);
        },
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 10, 30, 1)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat", "cool"])
                .withFanMode(["auto", "on", "smart"])
                .withSetpoint("occupied_cooling_setpoint", 10, 30, 1)
                .withLocalTemperatureCalibration()
                .withPiHeatingDemand(),
        ],
    },
    {
        // Reference from a similar switch: https://gist.github.com/nebhead/dc5a0a827ec14eef6196ded4be6e2dd0
        zigbeeModel: ["ZS057"],
        model: "ZS057-D0Z",
        vendor: "Leviton",
        description: "Wall switch, 0-10V dimmer, 120-277V, Lumina™ RF",
        meta: {disableDefaultResponse: true},
        extend: [m.light({effect: false, configureReporting: true})],
        fromZigbee: [fzLocal.on_off_via_brightness, fz.lighting_ballast_configuration],
        toZigbee: [tz.ballast_config],
        exposes: [
            // Note: ballast_power_on_level used to be here, but it doesn't appear to work properly with this device
            // If set, it's reset back to 0 when the device is turned off then back to 32 when turned on
            e.numeric("ballast_minimum_level", ea.ALL).withValueMin(1).withValueMax(254).withDescription("Specifies the minimum brightness value"),
            e.numeric("ballast_maximum_level", ea.ALL).withValueMin(1).withValueMax(254).withDescription("Specifies the maximum brightness value"),
        ],
    },
];
