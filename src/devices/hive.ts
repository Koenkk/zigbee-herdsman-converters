import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, Tz} from "../lib/types";
import * as utils from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const scheduleDays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const scheduleKeys = scheduleDays.map((day) => `schedule_${day}`);

const hiveScheduleFromZigbee: Fz.Converter<"hvacThermostat", undefined, ["commandGetWeeklyScheduleRsp"]> = {
    cluster: "hvacThermostat",
    type: ["commandGetWeeklyScheduleRsp"],
    convert: (_model, msg) => {
        const {dayofweek, transitions} = msg.data;
        if (!Number.isInteger(dayofweek) || !Array.isArray(transitions) || transitions.length === 0) return;

        const formatted: string[] = [];
        for (const transition of transitions) {
            const {transitionTime, heatSetpoint} = transition;
            if (
                !Number.isInteger(transitionTime) ||
                transitionTime < 0 ||
                transitionTime >= 1440 ||
                typeof heatSetpoint !== "number" ||
                !Number.isFinite(heatSetpoint)
            ) {
                return;
            }

            const hour = String(Math.floor(transitionTime / 60)).padStart(2, "0");
            const minute = String(transitionTime % 60).padStart(2, "0");
            const temperature = Number((heatSetpoint / 100).toFixed(2));
            formatted.push(`${hour}:${minute}/${temperature}`);
        }

        const result: Record<string, string> = {};
        for (const [bit, day] of scheduleDays.entries()) {
            if (dayofweek & (1 << bit)) {
                result[`schedule_${day}`] = formatted.join(" ");
            }
        }
        return Object.keys(result).length ? result : undefined;
    },
};

function parseHiveSchedule(value: unknown): {transitionTime: number; heatSetpoint: number}[] {
    if (typeof value !== "string" || !value.trim()) {
        throw new Error('Schedule cannot be empty. Enter up to six transitions, e.g. "06:00/20.5 19:30/1"');
    }

    const parts = value.trim().split(/\s+/);
    if (parts.length > 6) {
        throw new Error(`Hive supports at most six transitions per day; received ${parts.length}`);
    }

    let lastTime = -1;
    let lastTemperature: number | undefined;
    return parts.map((part, index) => {
        const number = index + 1;
        const fields = part.split("/");
        if (fields.length !== 2) {
            throw new Error(`Transition ${number} ("${part}"): expected HH:mm/temperature, e.g. 06:00/20.5`);
        }

        const [clock, rawTemperature] = fields;
        if (!/^\d{2}:\d{2}$/.test(clock)) {
            throw new Error(`Transition ${number} ("${part}"): time must use HH:mm, e.g. 06:00`);
        }

        const [hours, minutes] = clock.split(":").map(Number);
        if (hours > 23 || minutes > 59) {
            throw new Error(`Transition ${number} ("${part}"): invalid time ${clock}; hours must be 00–23 and minutes 00–59`);
        }

        if (!/^\d+(?:\.\d{1,2})?$/.test(rawTemperature)) {
            throw new Error(`Transition ${number} ("${part}"): temperature must be numeric with up to two decimal places, e.g. 20.5`);
        }

        const temperature = Number(rawTemperature);
        if (temperature !== 1 && (temperature < 5 || temperature > 32)) {
            throw new Error(`Transition ${number} ("${part}"): ${temperature}°C is outside the supported values (1°C or 5–32°C)`);
        }

        const time = hours * 60 + minutes;
        if (time < lastTime) {
            throw new Error(`Transition ${number} ("${part}"): ${clock} is earlier than the previous transition; enter times in chronological order`);
        }
        if (time === lastTime && temperature !== lastTemperature) {
            throw new Error(`Transition ${number} ("${part}"): conflicting temperatures at ${clock}; duplicate times must use the same temperature`);
        }

        lastTime = time;
        lastTemperature = temperature;
        return {transitionTime: time, heatSetpoint: Math.round(temperature * 100)};
    });
}

/**
 * Hive SLR1c receivers have been observed padding short schedule read-backs
 * with identical timestamps, which confuses the paired Hive thermostat.
 * Send six distinct transitions instead, without changing effective setpoints.
 *
 * Never insert a transition before the first supplied time: that would change
 * the temperature inherited from the previous day's schedule.
 */
function padHiveSchedule(transitions: {transitionTime: number; heatSetpoint: number}[]): {transitionTime: number; heatSetpoint: number}[] {
    // A receiver read-back may already contain identical filler transitions.
    const unique = transitions.filter((transition, index) => index === 0 || transition.transitionTime !== transitions[index - 1].transitionTime);
    if (unique.length === 6) return unique;

    const needed = 6 - unique.length;
    const lastTime = unique[unique.length - 1].transitionTime;

    // Prefer hourly filler slots, then use finer spacing only if necessary.
    // Each filler repeats the preceding real setpoint, so heating is unchanged.
    for (const interval of [60, 30, 15, 5, 1]) {
        const available: typeof unique = [];
        for (let index = 0; index < unique.length; index++) {
            const current = unique[index];
            const nextTime = unique[index + 1]?.transitionTime ?? 1440;
            for (let time = current.transitionTime + interval; time < nextTime; time += interval) {
                available.push({transitionTime: time, heatSetpoint: current.heatSetpoint});
            }
        }

        if (available.length < needed) continue;

        // Favour slots after the final meaningful transition (as verified on
        // the physical thermostat), then fill earlier gaps if near midnight.
        const following = available.filter((transition) => transition.transitionTime > lastTime);
        const earlier = available.filter((transition) => transition.transitionTime < lastTime);
        const padding = following.slice(0, needed);
        if (padding.length < needed) {
            padding.push(...earlier.slice(-(needed - padding.length)));
        }
        return [...unique, ...padding].sort((a, b) => a.transitionTime - b.transitionTime);
    }

    throw new Error("Cannot safely create six distinct Hive schedule slots after the first transition; use an earlier first time");
}

const hiveScheduleToZigbee: Tz.Converter = {
    key: scheduleKeys,
    convertSet: async (entity, key, value, meta) => {
        const day = key.slice("schedule_".length);
        const bit = scheduleDays.indexOf(day as (typeof scheduleDays)[number]);
        if (bit < 0) throw new Error(`Unknown schedule day: ${day}`);

        const transitions = padHiveSchedule(parseHiveSchedule(value));
        await entity.command(
            "hvacThermostat",
            "setWeeklySchedule",
            {dayofweek: 1 << bit, numoftrans: transitions.length, mode: 1, transitions},
            utils.getOptions(meta.mapped, entity),
        );
    },
    convertGet: async (entity, key, meta) => {
        const day = key.slice("schedule_".length);
        const bit = scheduleDays.indexOf(day as (typeof scheduleDays)[number]);
        if (bit < 0) throw new Error(`Unknown schedule day: ${day}`);

        await entity.command("hvacThermostat", "getWeeklySchedule", {daystoreturn: 1 << bit, modetoreturn: 1}, utils.getOptions(meta.mapped, entity));
    },
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["FWGU10Bulb02UK"],
        model: "FWGU10Bulb02UK",
        vendor: "Hive",
        description: "GU10 warm white",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["FWGU10Bulb03UK"],
        model: "FWGU10Bulb03UK",
        vendor: "Hive",
        description: "GU10 warm white",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["MOT003"],
        model: "MOT003",
        vendor: "Hive",
        description: "Motion sensor",
        fromZigbee: [fz.temperature, fz.ias_occupancy_alarm_1_with_timeout, fz.battery, fz.ignore_iaszone_statuschange, fz.ignore_iaszone_attreport],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(6);
            const binds = ["msTemperatureMeasurement", "genPowerCfg"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint);
            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.temperature(), e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ["DWS003"],
        model: "DWS003",
        vendor: "Hive",
        description: "Contact sensor",
        fromZigbee: [fz.temperature, fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(6);
            const binds = ["msTemperatureMeasurement", "genPowerCfg"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint);
            await endpoint.read("genPowerCfg", ["batteryPercentageRemaining"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.temperature(), e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ["FWBulb01"],
        model: "HALIGHTDIMWWE27",
        vendor: "Hive",
        description: "Active smart bulb white LED (E27)",
        extend: [m.light({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ["FWCLBulb01UK"],
        model: "HALIGHTDIMWWE14",
        vendor: "Hive",
        description: "Active smart bulb white LED (E14)",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["FWBulb02UK"],
        model: "HALIGHTDIMWWB22",
        vendor: "Hive",
        description: "Active smart bulb white LED (B22)",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["TWBulb02UK"],
        model: "HV-GSCXZB229B",
        vendor: "Hive",
        description: "Active light, warm to cool white (E27 & B22)",
        extend: [m.light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ["TWCLBulb01UK"],
        model: "HV-CE14CXZB6",
        vendor: "Hive",
        description: "Active light, warm to cool white (E14)",
        extend: [m.light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ["SLP2", "SLP2b", "SLP2c", "SLP3"],
        model: "1613V",
        vendor: "Hive",
        description: "Active plug",
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "seMetering"]);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ["TWBulb01US"],
        model: "HV-GSCXZB269",
        vendor: "Hive",
        description: "Active light cool to warm white (E26) ",
        extend: [m.light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ["TWBulb01UK"],
        model: "HV-GSCXZB279_HV-GSCXZB229_HV-GSCXZB229K",
        vendor: "Hive",
        description: "Active light, warm to cool white (E27 & B22)",
        extend: [m.light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ["TWGU10Bulb01UK"],
        model: "HV-GUCXZB5",
        vendor: "Hive",
        description: "Active light, warm to cool white (GU10)",
        extend: [m.light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ["KEYPAD001"],
        model: "KEYPAD001",
        vendor: "Hive",
        description: "Alarm security keypad",
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        fromZigbee: [
            fz.command_arm_with_transaction,
            fz.command_panic,
            fz.battery,
            fz.ias_occupancy_alarm_1,
            fz.identify,
            fz.ias_contact_alarm_1,
            fz.ias_ace_occupancy_with_timeout,
        ],
        toZigbee: [tz.arm_mode],
        exposes: [
            e.battery(),
            e.battery_voltage(),
            e.battery_low(),
            e.occupancy(),
            e.tamper(),
            e.contact(),
            e.numeric("action_code", ea.STATE).withDescription("Pin code introduced."),
            e.numeric("action_transaction", ea.STATE).withDescription("Last action transaction number."),
            e.text("action_zone", ea.STATE).withDescription("Alarm zone. Default value 23"),
            e.action(["panic", "disarm", "arm_day_zones", "arm_all_zones", "exit_delay", "entry_delay"]),
        ],
        extend: [m.iasGetPanelStatusResponse()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const clusters = ["genPowerCfg", "ssIasZone", "ssIasAce", "genIdentify"];
            await reporting.bind(endpoint, coordinatorEndpoint, clusters);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ["SLR1"],
        model: "SLR1",
        vendor: "Hive",
        description: "Heating thermostat",
        fromZigbee: [fz.thermostat, fz.thermostat_weekly_schedule],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule,
            tz.thermostat_temperature_setpoint_hold,
            tz.thermostat_temperature_setpoint_hold_duration,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 32, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat"])
                .withRunningState(["idle", "heat"]),
            e
                .binary("temperature_setpoint_hold", ea.ALL, true, false)
                .withDescription(
                    "Prevent changes. `false` = run normally. `true` = prevent from making changes." +
                        " Must be set to `false` when system_mode = off or `true` for heat",
                ),
            e
                .numeric("temperature_setpoint_hold_duration", ea.ALL)
                .withValueMin(0)
                .withValueMax(65535)
                .withDescription(
                    "Period in minutes for which the setpoint hold will be active. 65535 = attribute not" +
                        " used. 0 to 360 to match the remote display",
                ),
        ],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(5);
            const binds = ["genBasic", "genIdentify", "genAlarms", "genTime", "hvacThermostat"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatTemperatureSetpointHold(endpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(endpoint);
        },
    },
    {
        zigbeeModel: ["SLR1b"],
        model: "SLR1b",
        vendor: "Hive",
        description: "Heating thermostat",
        fromZigbee: [fz.thermostat, fz.thermostat_weekly_schedule],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule,
            tz.thermostat_temperature_setpoint_hold,
            tz.thermostat_temperature_setpoint_hold_duration,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 32, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat"])
                .withRunningState(["idle", "heat"]),
            e
                .binary("temperature_setpoint_hold", ea.ALL, true, false)
                .withDescription(
                    "Prevent changes. `false` = run normally. `true` = prevent from making changes." +
                        " Must be set to `false` when system_mode = off or `true` for heat",
                ),
            e
                .numeric("temperature_setpoint_hold_duration", ea.ALL)
                .withValueMin(0)
                .withValueMax(65535)
                .withDescription(
                    "Period in minutes for which the setpoint hold will be active. null = attribute not" +
                        " used. 0 to 360 to match the remote display",
                ),
        ],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(5);
            const binds = ["genBasic", "genIdentify", "genAlarms", "genTime", "hvacThermostat"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatTemperatureSetpointHold(endpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(endpoint);
        },
    },
    {
        zigbeeModel: ["SLR1c"],
        model: "SLR1c",
        vendor: "Hive",
        description: "Heating thermostat",
        fromZigbee: [fz.thermostat, fz.thermostat_weekly_schedule, hiveScheduleFromZigbee],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule,
            tz.thermostat_temperature_setpoint_hold,
            tz.thermostat_temperature_setpoint_hold_duration,
            hiveScheduleToZigbee,
        ],
        exposes: [
            ...scheduleDays.map((day) =>
                e
                    .text(`schedule_${day}`, ea.ALL)
                    .withCategory("config")
                    .withDescription("Native Hive heating schedule, HH:mm/°C (up to six transitions; writes six distinct slots)"),
            ),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 32, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat"])
                .withRunningState(["idle", "heat"]),
            e
                .binary("temperature_setpoint_hold", ea.ALL, true, false)
                .withDescription(
                    "Prevent changes. `false` = run normally. `true` = prevent from making changes." +
                        " Must be set to `false` when system_mode = off or `true` for heat",
                ),
            e
                .numeric("temperature_setpoint_hold_duration", ea.ALL)
                .withValueMin(0)
                .withValueMax(65535)
                .withDescription(
                    "Period in minutes for which the setpoint hold will be active. 65535 = attribute not" +
                        " used. 0 to 360 to match the remote display",
                ),
        ],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(5);
            const binds = ["genBasic", "genIdentify", "genAlarms", "genTime", "hvacThermostat"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatTemperatureSetpointHold(endpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(endpoint);
        },
    },
    {
        zigbeeModel: ["SLR1d"],
        model: "SLR1d",
        vendor: "Hive",
        description: "Single channel receiver",
        fromZigbee: [fz.thermostat, fz.thermostat_weekly_schedule],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule,
            tz.thermostat_temperature_setpoint_hold,
            tz.thermostat_temperature_setpoint_hold_duration,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 32, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat"])
                .withRunningState(["idle", "heat"]),
            e
                .binary("temperature_setpoint_hold", ea.ALL, true, false)
                .withDescription(
                    "Prevent changes. `false` = run normally. `true` = prevent from making changes." +
                        " Must be set to `false` when system_mode = off or `true` for heat",
                ),
            e
                .numeric("temperature_setpoint_hold_duration", ea.ALL)
                .withValueMin(0)
                .withValueMax(65535)
                .withDescription(
                    "Period in minutes for which the setpoint hold will be active. 65535 = attribute not" +
                        " used. 0 to 360 to match the remote display",
                ),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(5);
            const binds = ["genBasic", "genIdentify", "genAlarms", "genTime", "hvacThermostat"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatTemperatureSetpointHold(endpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(endpoint);
        },
    },
    {
        zigbeeModel: ["OTR1"],
        model: "OTR1",
        vendor: "Hive",
        description: "Single channel heating receiver",
        fromZigbee: [fz.thermostat, fz.thermostat_weekly_schedule],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule,
            tz.thermostat_temperature_setpoint_hold,
            tz.thermostat_temperature_setpoint_hold_duration,
        ],
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 32, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat"])
                .withRunningState(["idle", "heat"]),
            e
                .binary("temperature_setpoint_hold", ea.ALL, true, false)
                .withDescription(
                    "Prevent changes. `false` = run normally. `true` = prevent from making changes." +
                        " Must be set to `false` when system_mode = off or `true` for heat",
                ),
            e
                .numeric("temperature_setpoint_hold_duration", ea.ALL)
                .withValueMin(0)
                .withValueMax(65535)
                .withDescription(
                    "Period in minutes for which the setpoint hold will be active. 65535 = attribute not" +
                        " used. 0 to 360 to match the remote display",
                ),
        ],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(5);
            const binds = ["genBasic", "genIdentify", "genAlarms", "genTime", "hvacThermostat"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatTemperatureSetpointHold(endpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(endpoint);
        },
    },
    {
        zigbeeModel: ["SLR2"],
        model: "SLR2",
        vendor: "Hive",
        description: "Dual channel heating and hot water receiver",
        fromZigbee: [fz.thermostat, fz.thermostat_weekly_schedule],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule,
            tz.thermostat_temperature_setpoint_hold,
            tz.thermostat_temperature_setpoint_hold_duration,
        ],
        endpoint: (device) => {
            return {heat: 5, water: 6};
        },
        meta: {disableDefaultResponse: true, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const heatEndpoint = device.getEndpoint(5);
            const waterEndpoint = device.getEndpoint(6);
            const binds = ["genBasic", "genIdentify", "genAlarms", "genTime", "hvacThermostat"];
            await reporting.bind(heatEndpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(heatEndpoint);
            await reporting.thermostatRunningState(heatEndpoint);
            await reporting.thermostatSystemMode(heatEndpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(heatEndpoint);
            await reporting.thermostatTemperatureSetpointHold(heatEndpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(heatEndpoint);
            await reporting.bind(waterEndpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(waterEndpoint);
            await reporting.thermostatRunningState(waterEndpoint);
            await reporting.thermostatSystemMode(waterEndpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(waterEndpoint);
            await reporting.thermostatTemperatureSetpointHold(waterEndpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(waterEndpoint);
        },
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 32, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat"])
                .withRunningState(["idle", "heat"])
                .withEndpoint("heat"),
            e
                .binary("temperature_setpoint_hold", ea.ALL, true, false)
                .withDescription(
                    "Prevent changes. `false` = run normally. `true` = prevent from making changes." +
                        " Must be set to `false` when system_mode = off or `true` for heat",
                )
                .withEndpoint("heat"),
            e
                .numeric("temperature_setpoint_hold_duration", ea.ALL)
                .withValueMin(0)
                .withValueMax(65535)
                .withDescription(
                    "Period in minutes for which the setpoint hold will be active. 65535 = attribute not" +
                        " used. 0 to 360 to match the remote display",
                )
                .withEndpoint("heat"),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 22, 22, 1)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat", "emergency_heating"])
                .withRunningState(["idle", "heat"])
                .withEndpoint("water"),
            e
                .binary("temperature_setpoint_hold", ea.ALL, true, false)
                .withDescription(
                    "Prevent changes. `false` = run normally. `true` = prevent from making changes." +
                        " Must be set to `false` when system_mode = off or `true` for heat",
                )
                .withEndpoint("water"),
            e
                .numeric("temperature_setpoint_hold_duration", ea.ALL)
                .withValueMin(0)
                .withValueMax(65535)
                .withDescription(
                    "Period in minutes for which the setpoint hold will be active. 65535 = attribute not" +
                        " used. 0 to 360 to match the remote display",
                )
                .withEndpoint("water"),
        ],
    },
    {
        zigbeeModel: ["SLR2b"],
        model: "SLR2b",
        vendor: "Hive",
        description: "Dual channel heating and hot water thermostat",
        fromZigbee: [fz.thermostat, fz.thermostat_weekly_schedule],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule,
            tz.thermostat_temperature_setpoint_hold,
            tz.thermostat_temperature_setpoint_hold_duration,
        ],
        endpoint: (device) => {
            return {heat: 5, water: 6};
        },
        meta: {disableDefaultResponse: true, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const heatEndpoint = device.getEndpoint(5);
            const waterEndpoint = device.getEndpoint(6);
            const binds = ["genBasic", "genIdentify", "genAlarms", "genTime", "hvacThermostat"];
            await reporting.bind(heatEndpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(heatEndpoint);
            await reporting.thermostatRunningState(heatEndpoint);
            await reporting.thermostatSystemMode(heatEndpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(heatEndpoint);
            await reporting.thermostatTemperatureSetpointHold(heatEndpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(heatEndpoint);
            await reporting.bind(waterEndpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(waterEndpoint);
            await reporting.thermostatRunningState(waterEndpoint);
            await reporting.thermostatSystemMode(waterEndpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(waterEndpoint);
            await reporting.thermostatTemperatureSetpointHold(waterEndpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(waterEndpoint);
        },
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 32, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat"])
                .withRunningState(["idle", "heat"])
                .withEndpoint("heat"),
            e
                .binary("temperature_setpoint_hold", ea.ALL, true, false)
                .withDescription(
                    "Prevent changes. `false` = run normally. `true` = prevent from making changes." +
                        " Must be set to `false` when system_mode = off or `true` for heat",
                )
                .withEndpoint("heat"),
            e
                .numeric("temperature_setpoint_hold_duration", ea.ALL)
                .withValueMin(0)
                .withValueMax(65535)
                .withDescription(
                    "Period in minutes for which the setpoint hold will be active. 65535 = attribute not" +
                        " used. 0 to 360 to match the remote display",
                )
                .withEndpoint("heat"),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 22, 22, 1)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat", "emergency_heating"])
                .withRunningState(["idle", "heat"])
                .withEndpoint("water"),
            e
                .binary("temperature_setpoint_hold", ea.ALL, true, false)
                .withDescription(
                    "Prevent changes. `false` = run normally. `true` = prevent from making changes." +
                        " Must be set to `false` when system_mode = off or `true` for heat",
                )
                .withEndpoint("water"),
            e
                .numeric("temperature_setpoint_hold_duration", ea.ALL)
                .withValueMin(0)
                .withValueMax(65535)
                .withDescription(
                    "Period in minutes for which the setpoint hold will be active. 65535 = attribute not" +
                        " used. 0 to 360 to match the remote display",
                )
                .withEndpoint("water"),
        ],
    },
    {
        zigbeeModel: ["SLR2c", "SLR2d"],
        model: "SLR2c",
        vendor: "Hive",
        description: "Dual channel heating and hot water thermostat",
        whiteLabel: [{vendor: "Hive", model: "SLR2d", fingerprint: [{modelID: "SLR2d"}]}],
        fromZigbee: [fz.thermostat, fz.thermostat_weekly_schedule],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule,
            tz.thermostat_temperature_setpoint_hold,
            tz.thermostat_temperature_setpoint_hold_duration,
        ],
        endpoint: (device) => {
            return {heat: 5, water: 6};
        },
        meta: {disableDefaultResponse: true, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const heatEndpoint = device.getEndpoint(5);
            const waterEndpoint = device.getEndpoint(6);
            const binds = ["genBasic", "genIdentify", "genAlarms", "genTime", "hvacThermostat"];
            await reporting.bind(heatEndpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(heatEndpoint);
            await reporting.thermostatRunningState(heatEndpoint);
            await reporting.thermostatSystemMode(heatEndpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(heatEndpoint);
            await reporting.thermostatTemperatureSetpointHold(heatEndpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(heatEndpoint);
            await reporting.bind(waterEndpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(waterEndpoint);
            await reporting.thermostatRunningState(waterEndpoint);
            await reporting.thermostatSystemMode(waterEndpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(waterEndpoint);
            await reporting.thermostatTemperatureSetpointHold(waterEndpoint);
            await reporting.thermostatTemperatureSetpointHoldDuration(waterEndpoint);
        },
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 32, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat"])
                .withRunningState(["idle", "heat"])
                .withEndpoint("heat"),
            e
                .binary("temperature_setpoint_hold", ea.ALL, true, false)
                .withDescription(
                    "Prevent changes. `false` = run normally. `true` = prevent from making changes." +
                        " Must be set to `false` when system_mode = off or `true` for heat",
                )
                .withEndpoint("heat"),
            e
                .numeric("temperature_setpoint_hold_duration", ea.ALL)
                .withValueMin(0)
                .withValueMax(65535)
                .withDescription(
                    "Period in minutes for which the setpoint hold will be active. 65535 = attribute not" +
                        " used. 0 to 360 to match the remote display",
                )
                .withEndpoint("heat"),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 22, 22, 1)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat", "emergency_heating"])
                .withRunningState(["idle", "heat"])
                .withEndpoint("water"),
            e
                .binary("temperature_setpoint_hold", ea.ALL, true, false)
                .withDescription(
                    "Prevent changes. `false` = run normally. `true` = prevent from making changes." +
                        " Must be set to `false` when system_mode = off or `true` for heat",
                )
                .withEndpoint("water"),
            e
                .numeric("temperature_setpoint_hold_duration", ea.ALL)
                .withValueMin(0)
                .withValueMax(65535)
                .withDescription(
                    "Period in minutes for which the setpoint hold will be active. 65535 = attribute not" +
                        " used. 0 to 360 to match the remote display",
                )
                .withEndpoint("water"),
        ],
    },
    {
        zigbeeModel: ["WPT1"],
        model: "WPT1",
        vendor: "Hive",
        description: "Heating thermostat remote control",
        fromZigbee: [fz.battery],
        toZigbee: [],
        exposes: [e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ["SLT2"],
        model: "SLT2",
        vendor: "Hive",
        description: "Heating thermostat remote control",
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        fromZigbee: [fz.battery],
        toZigbee: [],
        exposes: [e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ["SLT3"],
        model: "SLT3",
        vendor: "Hive",
        description: "Heating thermostat remote control",
        fromZigbee: [fz.battery],
        toZigbee: [],
        exposes: [e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ["SLT3B"],
        model: "SLT3B",
        vendor: "Hive",
        description: "Heating thermostat remote control",
        fromZigbee: [fz.battery],
        toZigbee: [],
        exposes: [e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ["SLT3C"],
        model: "SLT3C",
        vendor: "Hive",
        description: "Heating thermostat remote control",
        fromZigbee: [fz.battery],
        toZigbee: [],
        exposes: [e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ["SLT3d"],
        model: "SLT3d",
        vendor: "Hive",
        description: "Heating thermostat remote control",
        fromZigbee: [fz.battery],
        toZigbee: [],
        exposes: [e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ["SLB2"],
        model: "SLB2",
        vendor: "Hive",
        description: "Signal booster",
        toZigbee: [],
        fromZigbee: [fz.linkquality_from_basic],
        extend: [
            m.poll({
                key: "interval",
                defaultIntervalSeconds: 60 * 30,
                // For linkquality updates
                poll: async (device) => await device.endpoints[0].read("genBasic", ["zclVersion"]),
            }),
        ],
        exposes: [],
    },
    {
        zigbeeModel: ["SLT6"],
        model: "SLT6",
        vendor: "Hive",
        description: "Heating thermostat remote control",
        fromZigbee: [fz.battery],
        toZigbee: [],
        exposes: [e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ["SLT6b"],
        model: "SLT6b",
        vendor: "Hive",
        description: "Heating thermostat remote control",
        extend: [m.battery(), m.temperature()],
    },
];
