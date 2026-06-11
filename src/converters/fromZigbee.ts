import * as libColor from "../lib/color";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as globalStore from "../lib/store";
import type {Fz, KeyValue, KeyValueAny} from "../lib/types";
import * as utils from "../lib/utils";
import {
    addActionGroup,
    batteryVoltageToPercentage,
    getKey,
    hasAlreadyProcessedMessage,
    mapNumberRange,
    numberWithinRange,
    postfixWithEndpointName,
    precisionRound,
    toLocalISOString,
} from "../lib/utils";

const NS = "zhc:fz";
const defaultSimulatedBrightness = 255;

// #region Generic/recommended converters
export const fan: Fz.Converter<"hvacFanCtrl", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "hvacFanCtrl",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        if (msg.data.fanMode !== undefined) {
            const key = getKey(constants.fanMode, msg.data.fanMode);
            return {fan_mode: key, fan_state: key === "off" ? "OFF" : "ON"};
        }
    },
};
export const fan_speed: Fz.Converter<"genLevelCtrl", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genLevelCtrl",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        if (msg.data.currentLevel !== undefined) {
            const property = postfixWithEndpointName("speed", msg, model, meta);
            return {[property]: msg.data.currentLevel};
        }
    },
};
export const thermostat: Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "hvacThermostat",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        const result: KeyValueAny = {};
        const dontMapPIHeatingDemand = model.meta?.thermostat?.dontMapPIHeatingDemand;
        if (msg.data.localTemp !== undefined) {
            const value = precisionRound(msg.data.localTemp, 2) / 100;
            if (value >= -273.15) {
                result[postfixWithEndpointName("local_temperature", msg, model, meta)] = value;
            }
        }
        if (msg.data.localTemperatureCalibration !== undefined) {
            result[postfixWithEndpointName("local_temperature_calibration", msg, model, meta)] =
                precisionRound(msg.data.localTemperatureCalibration, 2) / 10;
        }
        if (msg.data.outdoorTemp !== undefined) {
            const value = precisionRound(msg.data.outdoorTemp, 2) / 100;
            if (value >= -273.15) {
                result[postfixWithEndpointName("outdoor_temperature", msg, model, meta)] = value;
            }
        }
        if (msg.data.occupancy !== undefined) {
            result[postfixWithEndpointName("occupancy", msg, model, meta)] = msg.data.occupancy % 2 > 0;
        }
        if (msg.data.occupiedHeatingSetpoint !== undefined) {
            const value = precisionRound(msg.data.occupiedHeatingSetpoint, 2) / 100;
            // Stelpro will return -325.65 when set to off, value is not realistic anyway
            if (value >= -273.15) {
                result[postfixWithEndpointName("occupied_heating_setpoint", msg, model, meta)] = value;
            }
        }
        if (msg.data.unoccupiedHeatingSetpoint !== undefined) {
            result[postfixWithEndpointName("unoccupied_heating_setpoint", msg, model, meta)] =
                precisionRound(msg.data.unoccupiedHeatingSetpoint, 2) / 100;
        }
        if (msg.data.occupiedCoolingSetpoint !== undefined) {
            result[postfixWithEndpointName("occupied_cooling_setpoint", msg, model, meta)] =
                precisionRound(msg.data.occupiedCoolingSetpoint, 2) / 100;
        }
        if (msg.data.unoccupiedCoolingSetpoint !== undefined) {
            result[postfixWithEndpointName("unoccupied_cooling_setpoint", msg, model, meta)] =
                precisionRound(msg.data.unoccupiedCoolingSetpoint, 2) / 100;
        }
        if (msg.data.setpointChangeAmount !== undefined) {
            result[postfixWithEndpointName("setpoint_change_amount", msg, model, meta)] = msg.data.setpointChangeAmount / 100;
        }
        if (msg.data.setpointChangeSource !== undefined) {
            result[postfixWithEndpointName("setpoint_change_source", msg, model, meta)] = utils.getFromLookup(
                msg.data.setpointChangeSource,
                constants.thermostatSetpointChangeSource,
            );
        }
        if (msg.data.setpointChangeSourceTimeStamp !== undefined) {
            const date = new Date(2000, 0, 1);
            date.setSeconds(msg.data.setpointChangeSourceTimeStamp);
            const value = toLocalISOString(date);
            result[postfixWithEndpointName("setpoint_change_source_timestamp", msg, model, meta)] = value;
        }
        if (msg.data.remoteSensing !== undefined) {
            const value = msg.data.remoteSensing;
            result[postfixWithEndpointName("remote_sensing", msg, model, meta)] = {
                local_temperature: (value & 1) > 0 ? "remotely" : "internally",
                outdoor_temperature: (value & (1 << 1)) > 0 ? "remotely" : "internally",
                occupancy: (value & (1 << 2)) > 0 ? "remotely" : "internally",
            };
        }
        if (msg.data.ctrlSeqeOfOper !== undefined) {
            result[postfixWithEndpointName("control_sequence_of_operation", msg, model, meta)] = utils.getFromLookup(
                msg.data.ctrlSeqeOfOper,
                constants.thermostatControlSequenceOfOperations,
            );
        }
        if (msg.data.programingOperMode !== undefined) {
            result[postfixWithEndpointName("programming_operation_mode", msg, model, meta)] = utils.getFromLookup(
                msg.data.programingOperMode,
                constants.thermostatProgrammingOperationModes,
            );
        }
        if (msg.data.systemMode !== undefined) {
            result[postfixWithEndpointName("system_mode", msg, model, meta)] = utils.getFromLookup(
                msg.data.systemMode,
                constants.thermostatSystemModes,
            );
        }
        if (msg.data.runningMode !== undefined) {
            result[postfixWithEndpointName("running_mode", msg, model, meta)] = utils.getFromLookup(
                msg.data.runningMode,
                constants.thermostatRunningMode,
            );
        }
        if (msg.data.runningState !== undefined) {
            result[postfixWithEndpointName("running_state", msg, model, meta)] = utils.getFromLookup(
                msg.data.runningState,
                constants.thermostatRunningStates,
            );
        }
        if (msg.data.pIHeatingDemand !== undefined) {
            result[postfixWithEndpointName("pi_heating_demand", msg, model, meta)] = mapNumberRange(
                msg.data.pIHeatingDemand,
                0,
                dontMapPIHeatingDemand ? 100 : 255,
                0,
                100,
            );
        }
        if (msg.data.pICoolingDemand !== undefined) {
            // we assume the behavior is consistent for pIHeatingDemand + pICoolingDemand for the same vendor
            result[postfixWithEndpointName("pi_cooling_demand", msg, model, meta)] = mapNumberRange(
                msg.data.pICoolingDemand,
                0,
                dontMapPIHeatingDemand ? 100 : 255,
                0,
                100,
            );
        }
        if (msg.data.tempSetpointHold !== undefined) {
            result[postfixWithEndpointName("temperature_setpoint_hold", msg, model, meta)] = msg.data.tempSetpointHold === 1;
        }
        if (msg.data.tempSetpointHoldDuration !== undefined) {
            result[postfixWithEndpointName("temperature_setpoint_hold_duration", msg, model, meta)] = msg.data.tempSetpointHoldDuration;
        }
        if (msg.data.minHeatSetpointLimit !== undefined) {
            const value = precisionRound(msg.data.minHeatSetpointLimit, 2) / 100;
            if (value >= -273.15) {
                result[postfixWithEndpointName("min_heat_setpoint_limit", msg, model, meta)] = value;
            }
        }
        if (msg.data.maxHeatSetpointLimit !== undefined) {
            const value = precisionRound(msg.data.maxHeatSetpointLimit, 2) / 100;
            if (value >= -273.15) {
                result[postfixWithEndpointName("max_heat_setpoint_limit", msg, model, meta)] = value;
            }
        }
        if (msg.data.absMinHeatSetpointLimit !== undefined) {
            const value = precisionRound(msg.data.absMinHeatSetpointLimit, 2) / 100;
            if (value >= -273.15) {
                result[postfixWithEndpointName("abs_min_heat_setpoint_limit", msg, model, meta)] = value;
            }
        }
        if (msg.data.absMaxHeatSetpointLimit !== undefined) {
            const value = precisionRound(msg.data.absMaxHeatSetpointLimit, 2) / 100;
            if (value >= -273.15) {
                result[postfixWithEndpointName("abs_max_heat_setpoint_limit", msg, model, meta)] = value;
            }
        }
        if (msg.data.absMinCoolSetpointLimit !== undefined) {
            const value = precisionRound(msg.data.absMinCoolSetpointLimit, 2) / 100;
            if (value >= -273.15) {
                result[postfixWithEndpointName("abs_min_cool_setpoint_limit", msg, model, meta)] = value;
            }
        }
        if (msg.data.absMaxCoolSetpointLimit !== undefined) {
            const value = precisionRound(msg.data.absMaxCoolSetpointLimit, 2) / 100;
            if (value >= -273.15) {
                result[postfixWithEndpointName("abs_max_cool_setpoint_limit", msg, model, meta)] = value;
            }
        }
        if (msg.data.minSetpointDeadBand !== undefined) {
            const value = precisionRound(msg.data.minSetpointDeadBand, 2) / 100;
            if (value >= -273.15) {
                result[postfixWithEndpointName("min_setpoint_dead_band", msg, model, meta)] = value;
            }
        }
        if (msg.data.acLouverPosition !== undefined) {
            result[postfixWithEndpointName("ac_louver_position", msg, model, meta)] = utils.getFromLookup(
                msg.data.acLouverPosition,
                constants.thermostatAcLouverPositions,
            );
        }
        return result;
    },
};
export const thermostat_weekly_schedule: Fz.Converter<"hvacThermostat", undefined, ["commandGetWeeklyScheduleRsp"]> = {
    cluster: "hvacThermostat",
    type: ["commandGetWeeklyScheduleRsp"],
    convert: (model, msg, publish, options, meta) => {
        const days = [];
        for (let i = 0; i < 8; i++) {
            if ((msg.data.dayofweek & (1 << i)) > 0) {
                days.push(utils.getFromLookup(i, constants.thermostatDayOfWeek));
            }
        }

        const transitions = [];
        for (const transition of msg.data.transitions) {
            const entry: KeyValueAny = {time: transition.transitionTime};
            if (transition.heatSetpoint !== undefined) {
                entry.heating_setpoint = transition.heatSetpoint / 100;
            }
            if (transition.coolSetpoint !== undefined) {
                entry.cooling_setpoint = transition.coolSetpoint / 100;
            }
            transitions.push(entry);
        }

        return {[postfixWithEndpointName("weekly_schedule", msg, model, meta)]: {days, transitions}};
    },
};
export const hvac_user_interface: Fz.Converter<"hvacUserInterfaceCfg", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "hvacUserInterfaceCfg",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        const result: KeyValueAny = {};
        if (msg.data.keypadLockout !== undefined) {
            result.keypad_lockout =
                constants.keypadLockoutMode[msg.data.keypadLockout] !== undefined
                    ? constants.keypadLockoutMode[msg.data.keypadLockout]
                    : msg.data.keypadLockout;
        }
        if (msg.data.tempDisplayMode !== undefined) {
            result.temperature_display_mode =
                constants.temperatureDisplayMode[msg.data.tempDisplayMode] !== undefined
                    ? constants.temperatureDisplayMode[msg.data.tempDisplayMode]
                    : msg.data.tempDisplayMode;
        }
        return result;
    },
};
export const lock_operation_event: Fz.Converter<"closuresDoorLock", undefined, "commandOperationEventNotification"> = {
    cluster: "closuresDoorLock",
    type: "commandOperationEventNotification",
    convert: (model, msg, publish, options, meta) => {
        const lookup: KeyValueAny = {
            0: "unknown",
            1: "lock",
            2: "unlock",
            3: "lock_failure_invalid_pin_or_id",
            4: "lock_failure_invalid_schedule",
            5: "unlock_failure_invalid_pin_or_id",
            6: "unlock_failure_invalid_schedule",
            7: "one_touch_lock",
            8: "key_lock",
            9: "key_unlock",
            10: "auto_lock",
            11: "schedule_lock",
            12: "schedule_unlock",
            13: "manual_lock",
            14: "manual_unlock",
            15: "non_access_user_operational_event",
        };

        return {
            action: lookup[msg.data.opereventcode],
            action_user: msg.data.userid,
            action_source: msg.data.opereventsrc,
            action_source_name: constants.lockSourceName[msg.data.opereventsrc],
        };
    },
};
export const lock_programming_event: Fz.Converter<"closuresDoorLock", undefined, "commandProgrammingEventNotification"> = {
    cluster: "closuresDoorLock",
    type: "commandProgrammingEventNotification",
    convert: (model, msg, publish, options, meta) => {
        const lookup: KeyValueAny = {
            0: "unknown",
            1: "master_code_changed",
            2: "pin_code_added",
            3: "pin_code_deleted",
            4: "pin_code_changed",
            5: "rfid_code_added",
            6: "rfid_code_deleted",
        };
        return {
            action: lookup[msg.data.programeventcode],
            action_user: msg.data.userid,
            action_source: msg.data.programeventsrc,
            action_source_name: constants.lockSourceName[msg.data.programeventsrc],
        };
    },
};
export const lock_programming_event_read_pincode: Fz.Converter<"closuresDoorLock", undefined, "commandProgrammingEventNotification"> = {
    cluster: "closuresDoorLock",
    type: "commandProgrammingEventNotification",
    convert: (model, msg, publish, options, meta) => {
        if (
            msg.data.userid !== undefined &&
            (msg.data.programeventsrc === undefined || constants.lockSourceName[msg.data.programeventsrc] !== "rf")
        ) {
            msg.endpoint
                .command("closuresDoorLock", "getPinCode", {userid: msg.data.userid}, {})
                .catch((error) => logger.error(`Failed to read pincode of '${msg.device.ieeeAddr}' (${error})`, NS));
        }
    },
};
export const lock: Fz.Converter<"closuresDoorLock", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "closuresDoorLock",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        const result: KeyValueAny = {};
        if (msg.data.lockState !== undefined) {
            result[postfixWithEndpointName("state", msg, model, meta)] = msg.data.lockState === 1 ? "LOCK" : "UNLOCK";
            const lookup = ["not_fully_locked", "locked", "unlocked"];
            result[postfixWithEndpointName("lock_state", msg, model, meta)] = lookup[msg.data.lockState];
        }

        if (msg.data.autoRelockTime !== undefined) {
            result[postfixWithEndpointName("auto_relock_time", msg, model, meta)] = msg.data.autoRelockTime;
        }

        if (msg.data.soundVolume !== undefined) {
            result[postfixWithEndpointName("sound_volume", msg, model, meta)] = constants.lockSoundVolume[msg.data.soundVolume];
        }

        if (msg.data.doorState !== undefined) {
            const lookup: KeyValueAny = {
                0: "open",
                1: "closed",
                2: "error_jammed",
                3: "error_forced_open",
                4: "error_unspecified",
                255: "undefined",
            };
            result[postfixWithEndpointName("door_state", msg, model, meta)] = lookup[msg.data.doorState];
        }
        return result;
    },
};
export const lock_set_pin_code_response: Fz.Converter<"closuresDoorLock", undefined, ["commandSetPinCodeRsp", "commandClearPinCodeRsp"]> = {
    cluster: "closuresDoorLock",
    type: ["commandSetPinCodeRsp", "commandClearPinCodeRsp"],
    convert: (model, msg, publish, options, meta) => {
        const result: KeyValue = {};
        if (msg.data.status === 0) {
            if (msg.type === "commandSetPinCodeRsp") {
                result.last_successful_pincode_save = Date.now();
            }
            if (msg.type === "commandClearPinCodeRsp") {
                result.last_successful_pincode_clear = Date.now();
            }
        }
        if (Object.keys(result).length > 0) {
            return result;
        }
    },
};
export const lock_pin_code_response: Fz.Converter<"closuresDoorLock", undefined, ["commandGetPinCodeRsp"]> = {
    cluster: "closuresDoorLock",
    type: ["commandGetPinCodeRsp"],
    options: [exposes.options.expose_pin()],
    convert: (model, msg, publish, options, meta) => {
        const {data} = msg;
        let status = constants.lockUserStatus[data.userstatus];

        if (status === undefined) {
            status = `not_supported_${data.userstatus}`;
        }

        const userId = data.userid.toString();
        const result: KeyValueAny = {users: {}};
        result.users[userId] = {status: status};
        if (options?.expose_pin && data.pincodevalue) {
            result.users[userId].pin_code = data.pincodevalue.toString();
        }
        return result;
    },
};
export const lock_user_status_response: Fz.Converter<"closuresDoorLock", undefined, ["commandGetUserStatusRsp"]> = {
    cluster: "closuresDoorLock",
    type: ["commandGetUserStatusRsp"],
    options: [exposes.options.expose_pin()],
    convert: (model, msg, publish, options, meta) => {
        const {data} = msg;
        let status = constants.lockUserStatus[data.userstatus];

        if (status === undefined) {
            status = `not_supported_${data.userstatus}`;
        }

        const userId = data.userid.toString();
        const result: KeyValueAny = {users: {}};
        result.users[userId] = {status: status};
        return result;
    },
};
export const linkquality_from_basic: Fz.Converter<"genBasic", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genBasic",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        return {linkquality: msg.linkquality};
    },
};
export const battery: Fz.Converter<"genPowerCfg", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genPowerCfg",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        const payload: KeyValueAny = {};
        // If voltageToPercentage is specified, it means we do not trust the percentage
        // returned by the device and are instead calculating it ourselves.
        if (
            model.meta?.battery?.voltageToPercentage == null &&
            msg.data.batteryPercentageRemaining !== undefined &&
            msg.data.batteryPercentageRemaining < 255
        ) {
            // Some devices do not comply to the ZCL and report a
            // batteryPercentageRemaining of 100 when the battery is full (should be 200).
            const dontDividePercentage = model.meta?.battery?.dontDividePercentage;
            let percentage = msg.data.batteryPercentageRemaining;
            percentage = dontDividePercentage ? percentage : percentage / 2;
            payload.battery = precisionRound(percentage, 2);
        }

        if (msg.data.batteryVoltage !== undefined && msg.data.batteryVoltage < 255) {
            // Deprecated: voltage is = mV now but should be V
            payload.voltage = msg.data.batteryVoltage * 100;

            if (model.meta?.battery?.voltageToPercentage) {
                payload.battery = batteryVoltageToPercentage(payload.voltage, model.meta.battery.voltageToPercentage);
            }
        }

        if (msg.data.batteryAlarmState !== undefined) {
            const battery1Low =
                (msg.data.batteryAlarmState & (1 << 0) ||
                    msg.data.batteryAlarmState & (1 << 1) ||
                    msg.data.batteryAlarmState & (1 << 2) ||
                    msg.data.batteryAlarmState & (1 << 3)) > 0;
            const battery2Low =
                (msg.data.batteryAlarmState & (1 << 10) ||
                    msg.data.batteryAlarmState & (1 << 11) ||
                    msg.data.batteryAlarmState & (1 << 12) ||
                    msg.data.batteryAlarmState & (1 << 13)) > 0;
            const battery3Low =
                (msg.data.batteryAlarmState & (1 << 20) ||
                    msg.data.batteryAlarmState & (1 << 21) ||
                    msg.data.batteryAlarmState & (1 << 22) ||
                    msg.data.batteryAlarmState & (1 << 23)) > 0;
            payload.battery_low = battery1Low || battery2Low || battery3Low;
        }

        return payload;
    },
};
export const temperature: Fz.Converter<"msTemperatureMeasurement", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "msTemperatureMeasurement",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        if (msg.data.measuredValue !== undefined) {
            const temperature = msg.data.measuredValue / 100.0;
            const property = postfixWithEndpointName("temperature", msg, model, meta);
            return {[property]: temperature};
        }
    },
};
export const device_temperature: Fz.Converter<"genDeviceTempCfg", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genDeviceTempCfg",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        if (msg.data.currentTemperature !== undefined) {
            const value = msg.data.currentTemperature;
            return {device_temperature: value};
        }
    },
};
export const humidity: Fz.Converter<"msRelativeHumidity", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "msRelativeHumidity",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        const humidity = msg.data.measuredValue / 100.0;
        const property = postfixWithEndpointName("humidity", msg, model, meta);

        // https://github.com/Koenkk/zigbee2mqtt/issues/798
        // Sometimes the sensor publishes non-realistic vales, it should only publish message
        // in the 0 - 100 range, don't produce messages beyond these values.
        if (humidity >= 0 && humidity <= 100) {
            return {[property]: humidity};
        }
    },
};
export const pm25: Fz.Converter<"pm25Measurement", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "pm25Measurement",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        if (msg.data.measuredValue !== undefined) {
            return {pm25: msg.data.measuredValue};
        }
    },
};
export const flow: Fz.Converter<"msFlowMeasurement", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "msFlowMeasurement",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        const flow = msg.data.measuredValue / 10.0;
        const property = postfixWithEndpointName("flow", msg, model, meta);
        if (msg.data.measuredValue !== undefined) {
            return {[property]: flow};
        }
    },
};
export const soil_moisture: Fz.Converter<"msSoilMoisture", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "msSoilMoisture",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        const soilMoisture = msg.data.measuredValue / 100.0;
        return {soil_moisture: soilMoisture};
    },
};
export const pressure: Fz.Converter<"msPressureMeasurement", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "msPressureMeasurement",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        let pressure = 0;
        if (msg.data.scaledValue !== undefined) {
            const scale = msg.endpoint.getClusterAttributeValue("msPressureMeasurement", "scale") as number;
            pressure = msg.data.scaledValue / 10 ** scale / 100.0; // convert to hPa
        } else {
            pressure = msg.data.measuredValue;
        }
        return {pressure};
    },
};
export const co2: Fz.Converter<"msCO2", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "msCO2",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        return {co2: Math.floor(msg.data.measuredValue * 1000000)};
    },
};
export const occupancy: Fz.Converter<"msOccupancySensing", undefined, ["attributeReport", "readResponse"]> = {
    // This is for occupancy sensor that send motion start AND stop messages
    cluster: "msOccupancySensing",
    type: ["attributeReport", "readResponse"],
    options: [exposes.options.no_occupancy_since_false()],
    convert: (model, msg, publish, options, meta) => {
        if (msg.data.occupancy !== undefined) {
            const payload = {occupancy: msg.data.occupancy % 2 > 0};
            utils.noOccupancySince(msg.endpoint, options, publish, payload.occupancy ? "stop" : "start");
            return payload;
        }
    },
};
export const occupancy_with_timeout: Fz.Converter<"msOccupancySensing", undefined, ["attributeReport", "readResponse"]> = {
    // This is for occupancy sensor that only send a message when motion detected,
    // but do not send a motion stop.
    // Therefore we need to publish the no_motion detected by ourselves.
    cluster: "msOccupancySensing",
    type: ["attributeReport", "readResponse"],
    options: [exposes.options.occupancy_timeout(), exposes.options.no_occupancy_since_true()],
    convert: (model, msg, publish, options, meta) => {
        if (msg.data.occupancy !== 1) {
            // In case of 0 no occupancy is reported.
            // https://github.com/Koenkk/zigbee2mqtt/issues/467
            return;
        }

        // The occupancy sensor only sends a message when motion detected.
        // Therefore we need to publish the no_motion detected by ourselves.
        const timeout = options?.occupancy_timeout != null ? Number(options.occupancy_timeout) : 90;

        // Stop existing timers because motion is detected and set a new one.
        clearTimeout(globalStore.getValue(msg.endpoint, "occupancy_timer", null));

        if (timeout !== 0) {
            const timer = setTimeout(() => {
                publish({occupancy: false});
            }, timeout * 1000);

            globalStore.putValue(msg.endpoint, "occupancy_timer", timer);
        }

        const payload = {occupancy: true};
        utils.noOccupancySince(msg.endpoint, options, publish, "start");
        return payload;
    },
};
export const occupancy_timeout: Fz.Converter<"msOccupancySensing", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "msOccupancySensing",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        if (msg.data.pirOToUDelay !== undefined) {
            return {occupancy_timeout: msg.data.pirOToUDelay};
        }
    },
};
export const brightness: Fz.Converter<"genLevelCtrl", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genLevelCtrl",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        if (msg.data.currentLevel !== undefined) {
            const property = postfixWithEndpointName("brightness", msg, model, meta);
            return {[property]: msg.data.currentLevel};
        }
    },
};
export const level_config: Fz.Converter<"genLevelCtrl", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genLevelCtrl",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        const level_config = postfixWithEndpointName("level_config", msg, model, meta);
        const result: KeyValueAny = {};
        result[level_config] = {};

        // onOffTransitionTime - range 0x0000 to 0xffff - optional
        if (msg.data.onOffTransitionTime !== undefined && msg.data.onOffTransitionTime !== undefined) {
            result[level_config].on_off_transition_time = Number(msg.data.onOffTransitionTime) / 10;
        }

        // onTransitionTime - range 0x0000 to 0xffff - optional
        //                    0xffff = use onOffTransitionTime
        if (msg.data.onTransitionTime !== undefined && msg.data.onTransitionTime !== undefined) {
            if (Number(msg.data.onTransitionTime) === 65535) {
                result[level_config].on_transition_time = "disabled";
            } else result[level_config].on_transition_time = Number(msg.data.onTransitionTime) / 10;
        }

        // offTransitionTime - range 0x0000 to 0xffff - optional
        //                    0xffff = use onOffTransitionTime
        if (msg.data.offTransitionTime !== undefined && msg.data.offTransitionTime !== undefined) {
            if (Number(msg.data.offTransitionTime) === 65535) {
                result[level_config].off_transition_time = "disabled";
            } else result[level_config].off_transition_time = Number(msg.data.offTransitionTime) / 10;
        }

        // startUpCurrentLevel - range 0x00 to 0xff - optional
        //                       0x00 = return to minimum supported level
        //                       0xff - return to previous previous
        if (msg.data.startUpCurrentLevel !== undefined && msg.data.startUpCurrentLevel !== undefined) {
            result[level_config].current_level_startup = Number(msg.data.startUpCurrentLevel);
            if (result[level_config].current_level_startup === 255) {
                result[level_config].current_level_startup = "previous";
            }
            if (result[level_config].current_level_startup === 0) {
                result[level_config].current_level_startup = "minimum";
            }
        }

        // onLevel - range 0x00 to 0xff - optional
        //           Any value outside of MinLevel to MaxLevel, including 0xff and 0x00, is interpreted as "previous".
        if (msg.data.onLevel !== undefined && msg.data.onLevel !== undefined) {
            result[level_config].on_level = Number(msg.data.onLevel);
            if (result[level_config].on_level === 255) {
                result[level_config].on_level = "previous";
            }
        }

        // options - 8-bit map
        //   bit 0: ExecuteIfOff - when 0, Move commands are ignored if the device is off;
        //          when 1, CurrentLevel can be changed while the device is off.
        //   bit 1: CoupleColorTempToLevel - when 1, changes to level also change color temperature.
        //          (What this means is not defined, but it's most likely to be "dim to warm".)
        if (msg.data.options !== undefined) {
            result[level_config].execute_if_off = !!(Number(msg.data.options) & 1);
        }

        if (Object.keys(result[level_config]).length > 0) {
            return result;
        }
    },
};
export const color_colortemp: Fz.Converter<"lightingColorCtrl", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "lightingColorCtrl",
    type: ["attributeReport", "readResponse"],
    options: [exposes.options.color_sync()],
    convert: (model, msg, publish, options, meta) => {
        const result: KeyValueAny = {};

        if (msg.data.colorTemperature !== undefined) {
            const color_temp = postfixWithEndpointName("color_temp", msg, model, meta);
            result[color_temp] = msg.data.colorTemperature;
        }

        if (msg.data.startUpColorTemperature !== undefined) {
            const color_temp_startup = postfixWithEndpointName("color_temp_startup", msg, model, meta);
            result[color_temp_startup] = msg.data.startUpColorTemperature;
        }

        if (msg.data.colorMode !== undefined) {
            const color_mode = postfixWithEndpointName("color_mode", msg, model, meta);
            result[color_mode] =
                constants.colorModeLookup[msg.data.colorMode] !== undefined ? constants.colorModeLookup[msg.data.colorMode] : msg.data.colorMode;
        }

        if (
            msg.data.currentX !== undefined ||
            msg.data.currentY !== undefined ||
            msg.data.currentSaturation !== undefined ||
            msg.data.currentHue !== undefined ||
            msg.data.enhancedCurrentHue !== undefined
        ) {
            const color = postfixWithEndpointName("color", msg, model, meta);
            result[color] = {};

            if (msg.data.currentX !== undefined) {
                result[color].x = mapNumberRange(msg.data.currentX, 0, 65535, 0, 1, 4);
            }
            if (msg.data.currentY !== undefined) {
                result[color].y = mapNumberRange(msg.data.currentY, 0, 65535, 0, 1, 4);
            }
            if (msg.data.currentSaturation !== undefined) {
                result[color].saturation = mapNumberRange(msg.data.currentSaturation, 0, 254, 0, 100);
            }
            if (msg.data.currentHue !== undefined) {
                result[color].hue = mapNumberRange(msg.data.currentHue, 0, 254, 0, 360, 0);
            }
            if (msg.data.enhancedCurrentHue !== undefined) {
                result[color].hue = mapNumberRange(msg.data.enhancedCurrentHue, 0, 65535, 0, 360, 1);
            }
        }

        if (msg.data.options !== undefined) {
            /*
             * Bit | Value & Summary
             * --------------------------
             * 0   | 0: Do not execute command if the On/Off cluster, OnOff attribute is 0x00 (FALSE)
             *     | 1: Execute command if the On/Off cluster, OnOff attribute is 0x00 (FALSE)
             */
            const color_options = postfixWithEndpointName("color_options", msg, model, meta);
            result[color_options] = {execute_if_off: (msg.data.options & (1 << 0)) > 0};
        }

        // Use postfixWithEndpointName with an empty value to get just the postfix that
        // needs to be added to the result key.
        const epPostfix = postfixWithEndpointName("", msg, model, meta);

        // handle color property sync
        // NOTE: this should the last thing we do, as we need to have processed all attributes,
        //       we use assign here so we do not lose other attributes.
        return Object.assign(result, libColor.syncColorState(result, meta.state, msg.endpoint, options, epPostfix));
    },
};
export const meter_identification: Fz.Converter<"seMeterIdentification", undefined, ["readResponse"]> = {
    cluster: "seMeterIdentification",
    type: ["readResponse"],
    convert: (model, msg, publish, options, meta) => {
        const result: KeyValueAny = {};
        const elements = [/* 0x000A*/ "softwareRevision", /* 0x000D*/ "availablePower", /* 0x000E*/ "powerThreshold"] as const;
        for (const at of elements) {
            const atSnake = at
                .split(/(?=[A-Z])/)
                .join("_")
                .toLowerCase();
            if (msg.data[at]) {
                result[atSnake] = msg.data[at];
            }
        }
        return result;
    },
};
export const metering: Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]> = {
    /**
     * When using this converter also add the following to the configure method of the device:
     * await readMeteringPowerConverterAttributes(endpoint);
     */
    cluster: "seMetering",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        if (utils.hasAlreadyProcessedMessage(msg, model)) return;
        const payload: KeyValueAny = {};
        const multiplier = msg.endpoint.getClusterAttributeValue("seMetering", "multiplier") as number;
        const divisor = msg.endpoint.getClusterAttributeValue("seMetering", "divisor") as number;
        const factor = multiplier && divisor ? multiplier / divisor : null;

        if (msg.data.instantaneousDemand !== undefined) {
            let power = msg.data.instantaneousDemand;
            if (factor != null) {
                power = power * factor * 1000; // kWh to Watt
            }
            const property = postfixWithEndpointName("power", msg, model, meta);
            payload[property] = power;
        }

        if (msg.data.currentSummDelivered !== undefined) {
            const value = msg.data.currentSummDelivered;
            const property = postfixWithEndpointName("energy", msg, model, meta);
            payload[property] = value * (factor ?? 1);
        }
        if (msg.data.currentSummReceived !== undefined) {
            const value = msg.data.currentSummReceived;
            const property = postfixWithEndpointName("produced_energy", msg, model, meta);
            payload[property] = value * (factor ?? 1);
        }
        // Support for tariff-based energy measurements (e.g., P1/OBIS smart meters)
        if (msg.data.currentTier1SummDelivered !== undefined) {
            const value = msg.data.currentTier1SummDelivered;
            const property = postfixWithEndpointName("energy_tier_1", msg, model, meta);
            payload[property] = value * (factor ?? 1);
        }
        if (msg.data.currentTier2SummDelivered !== undefined) {
            const value = msg.data.currentTier2SummDelivered;
            const property = postfixWithEndpointName("energy_tier_2", msg, model, meta);
            payload[property] = value * (factor ?? 1);
        }
        if (msg.data.currentTier3SummDelivered !== undefined) {
            const value = msg.data.currentTier3SummDelivered;
            const property = postfixWithEndpointName("energy_tier_3", msg, model, meta);
            payload[property] = value * (factor ?? 1);
        }
        if (msg.data.currentTier4SummDelivered !== undefined) {
            const value = msg.data.currentTier4SummDelivered;
            const property = postfixWithEndpointName("energy_tier_4", msg, model, meta);
            payload[property] = value * (factor ?? 1);
        }
        if (msg.data.currentTier1SummReceived !== undefined) {
            const value = msg.data.currentTier1SummReceived;
            const property = postfixWithEndpointName("produced_energy_tier_1", msg, model, meta);
            payload[property] = value * (factor ?? 1);
        }
        if (msg.data.currentTier2SummReceived !== undefined) {
            const value = msg.data.currentTier2SummReceived;
            const property = postfixWithEndpointName("produced_energy_tier_2", msg, model, meta);
            payload[property] = value * (factor ?? 1);
        }
        return payload;
    },
};
export const electrical_measurement: Fz.Converter<"haElectricalMeasurement", undefined, ["attributeReport", "readResponse"]> = {
    /**
     * When using this converter also add the following to the configure method of the device:
     * await readEletricalMeasurementConverterAttributes(endpoint);
     */
    cluster: "haElectricalMeasurement",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        if (utils.hasAlreadyProcessedMessage(msg, model)) return;
        const getFactor = (key: string) => {
            const multiplier = msg.endpoint.getClusterAttributeValue("haElectricalMeasurement", `${key}Multiplier`) as number;
            const divisor = msg.endpoint.getClusterAttributeValue("haElectricalMeasurement", `${key}Divisor`) as number;
            const factor = multiplier && divisor ? multiplier / divisor : 1;
            return factor;
        };

        const lookup = [
            {key: "activePower" as const, name: "power", factor: "acPower"},
            {key: "activePowerPhB" as const, name: "power_phase_b", factor: "acPower"},
            {key: "activePowerPhC" as const, name: "power_phase_c", factor: "acPower"},
            {key: "apparentPower" as const, name: "power_apparent", factor: "acPower"},
            {key: "apparentPowerPhB" as const, name: "power_apparent_phase_b", factor: "acPower"},
            {key: "apparentPowerPhC" as const, name: "power_apparent_phase_c", factor: "acPower"},
            {key: "reactivePower" as const, name: "power_reactive", factor: "acPower"},
            {key: "reactivePowerPhB" as const, name: "power_reactive_phase_b", factor: "acPower"},
            {key: "reactivePowerPhC" as const, name: "power_reactive_phase_c", factor: "acPower"},
            {key: "rmsCurrent" as const, name: "current", factor: "acCurrent"},
            {key: "rmsCurrentPhB" as const, name: "current_phase_b", factor: "acCurrent"},
            {key: "rmsCurrentPhC" as const, name: "current_phase_c", factor: "acCurrent"},
            {key: "neutralCurrent" as const, name: "current_neutral", factor: "acCurrent"},
            {key: "rmsVoltage" as const, name: "voltage", factor: "acVoltage"},
            {key: "rmsVoltagePhB" as const, name: "voltage_phase_b", factor: "acVoltage"},
            {key: "rmsVoltagePhC" as const, name: "voltage_phase_c", factor: "acVoltage"},
            {key: "acFrequency" as const, name: "ac_frequency", factor: "acFrequency"},
            {key: "dcPower" as const, name: "power", factor: "dcPower"},
            {key: "dcCurrent" as const, name: "current", factor: "dcCurrent"},
            {key: "dcVoltage" as const, name: "voltage", factor: "dcVoltage"},
        ];

        const payload: KeyValueAny = {};
        for (const entry of lookup) {
            if (msg.data[entry.key] !== undefined) {
                const factor = getFactor(entry.factor);
                const property = postfixWithEndpointName(entry.name, msg, model, meta);
                const value = msg.data[entry.key] * factor;
                payload[property] = value;
            }
        }
        if (msg.data.powerFactor !== undefined) {
            const property = postfixWithEndpointName("power_factor", msg, model, meta);
            payload[property] = precisionRound(msg.data.powerFactor / 100, 2);
        }
        if (msg.data.powerFactorPhB !== undefined) {
            const property = postfixWithEndpointName("power_factor_phase_b", msg, model, meta);
            payload[property] = precisionRound(msg.data.powerFactorPhB / 100, 2);
        }
        if (msg.data.powerFactorPhC !== undefined) {
            const property = postfixWithEndpointName("power_factor_phase_c", msg, model, meta);
            payload[property] = precisionRound(msg.data.powerFactorPhC / 100, 2);
        }
        return payload;
    },
};
export const gas_metering: Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "seMetering",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        if (utils.hasAlreadyProcessedMessage(msg, model)) return;
        const payload: KeyValueAny = {};
        const multiplier = msg.endpoint.getClusterAttributeValue("seMetering", "multiplier") as number;
        const divisor = msg.endpoint.getClusterAttributeValue("seMetering", "divisor") as number;
        const factor = multiplier && divisor ? multiplier / divisor : null;

        if (msg.data.instantaneousDemand !== undefined) {
            const power = msg.data.instantaneousDemand;
            const property = utils.postfixWithEndpointName("volume_flow_rate", msg, model, meta);
            payload[property] = utils.precisionRound(power * (factor ?? 1), 2);
        }

        if (msg.data.currentSummDelivered !== undefined) {
            const value = msg.data.currentSummDelivered;
            const property = utils.postfixWithEndpointName("gas", msg, model, meta);
            payload[property] = utils.precisionRound(value * (factor ?? 1), 2);
        }

        if (msg.data.status !== undefined) {
            const value = msg.data.status;
            const property = utils.postfixWithEndpointName("status", msg, model, meta);
            payload[property] = value;
        }

        if (msg.data.extendedStatus !== undefined) {
            const value = msg.data.extendedStatus;
            const property = utils.postfixWithEndpointName("extended_status", msg, model, meta);
            payload[property] = value;
        }

        return payload;
    },
};
export const on_off: Fz.Converter<"genOnOff", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genOnOff",
    type: ["attributeReport", "readResponse"],
    options: [exposes.options.state_action()],
    convert: (model, msg, publish, options, meta) => {
        if (msg.data.onOff !== undefined) {
            const payload: KeyValueAny = {};
            const property = postfixWithEndpointName("state", msg, model, meta);
            const state = msg.data.onOff === 1 ? "ON" : "OFF";
            payload[property] = state;
            if (options?.state_action) {
                payload.action = postfixWithEndpointName(state.toLowerCase(), msg, model, meta);
            }
            return payload;
        }
    },
};
export const on_off_force_multiendpoint: Fz.Converter<"genOnOff", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genOnOff",
    type: ["attributeReport", "readResponse"],
    options: [exposes.options.state_action()],
    convert: (model, msg, publish, options, meta) => {
        // This converted is need instead of `fz.on_off` when no meta: {multiEndpoint: true} can be defined for this device
        // but it is needed for the `state`. E.g. when a switch has 3 channels (state_l1, state_l2, state_l3) but
        // has combined power measurements (power, energy))
        if (msg.data.onOff !== undefined) {
            const payload: KeyValueAny = {};
            const endpointName = model.endpoint !== undefined ? utils.getKey(model.endpoint(meta.device), msg.endpoint.ID) : msg.endpoint.ID;
            const state = msg.data.onOff === 1 ? "ON" : "OFF";
            payload[`state_${endpointName}`] = state;
            if (options?.state_action) {
                payload.action = `${state.toLowerCase()}_${endpointName}`;
            }
            return payload;
        }
    },
};
export const on_off_skip_duplicate_transaction: Fz.Converter<"genOnOff", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genOnOff",
    type: ["attributeReport", "readResponse"],
    options: [exposes.options.state_action()],
    convert: (model, msg, publish, options, meta) => {
        // Device sends multiple messages with the same transactionSequenceNumber,
        // prevent that multiple messages get send.
        // https://github.com/Koenkk/zigbee2mqtt/issues/3687
        if (msg.data.onOff !== undefined && !hasAlreadyProcessedMessage(msg, model)) {
            const payload: KeyValueAny = {};
            const property = postfixWithEndpointName("state", msg, model, meta);
            const state = msg.data.onOff === 1 ? "ON" : "OFF";
            payload[property] = state;
            if (options?.state_action) {
                payload.action = postfixWithEndpointName(state.toLowerCase(), msg, model, meta);
            }
            return payload;
        }
    },
};
export const power_on_behavior: Fz.Converter<"genOnOff", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genOnOff",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        const lookup: KeyValueAny = {0: "off", 1: "on", 2: "toggle", 255: "previous"};
        if (msg.data.startUpOnOff !== undefined) {
            const property = postfixWithEndpointName("power_on_behavior", msg, model, meta);
            return {[property]: lookup[msg.data.startUpOnOff]};
        }
    },
};
export const ias_no_alarm: Fz.Converter<"ssIasZone", undefined, ["attributeReport", "commandStatusChangeNotification"]> = {
    cluster: "ssIasZone",
    type: ["attributeReport", "commandStatusChangeNotification"],
    convert: (model, msg, publish, options, meta) => {
        const zoneStatus = "zonestatus" in msg.data ? msg.data.zonestatus : msg.data.zoneStatus;
        if (zoneStatus !== undefined) {
            return {
                tamper: (zoneStatus & (1 << 2)) > 0,
                battery_low: (zoneStatus & (1 << 3)) > 0,
            };
        }
    },
};
export const ias_siren: Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification"> = {
    cluster: "ssIasZone",
    type: "commandStatusChangeNotification",
    convert: (model, msg, publish, options, meta) => {
        const zoneStatus = msg.data.zonestatus;
        return {
            alarm: (zoneStatus & 1) > 0,
            tamper: (zoneStatus & (1 << 2)) > 0,
            battery_low: (zoneStatus & (1 << 3)) > 0,
            supervision_reports: (zoneStatus & (1 << 4)) > 0,
            restore_reports: (zoneStatus & (1 << 5)) > 0,
            ac_status: (zoneStatus & (1 << 7)) > 0,
            test: (zoneStatus & (1 << 8)) > 0,
        };
    },
};
export const ias_water_leak_alarm_1: Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification"> = {
    cluster: "ssIasZone",
    type: "commandStatusChangeNotification",
    convert: (model, msg, publish, options, meta) => {
        const zoneStatus = msg.data.zonestatus;
        return {
            water_leak: (zoneStatus & 1) > 0,
            tamper: (zoneStatus & (1 << 2)) > 0,
            battery_low: (zoneStatus & (1 << 3)) > 0,
        };
    },
};
export const ias_water_leak_alarm_1_report: Fz.Converter<"ssIasZone", undefined, "attributeReport"> = {
    cluster: "ssIasZone",
    type: "attributeReport",
    convert: (model, msg, publish, options, meta) => {
        const zoneStatus = msg.data.zoneStatus;
        if (zoneStatus !== undefined) {
            return {
                water_leak: (zoneStatus & 1) > 0,
                tamper: (zoneStatus & (1 << 2)) > 0,
                battery_low: (zoneStatus & (1 << 3)) > 0,
            };
        }
    },
};
export const ias_vibration_alarm_1: Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification"> = {
    cluster: "ssIasZone",
    type: "commandStatusChangeNotification",
    convert: (model, msg, publish, options, meta) => {
        const zoneStatus = msg.data.zonestatus;
        return {
            vibration: (zoneStatus & 1) > 0,
            tamper: (zoneStatus & (1 << 2)) > 0,
            battery_low: (zoneStatus & (1 << 3)) > 0,
        };
    },
};
export const ias_vibration_alarm_1_with_timeout: Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification"> = {
    cluster: "ssIasZone",
    type: "commandStatusChangeNotification",
    options: [exposes.options.vibration_timeout()],
    convert: (model, msg, publish, options, meta) => {
        const zoneStatus = msg.data.zonestatus;

        const timeout = options?.vibration_timeout != null ? Number(options.vibration_timeout) : 90;

        // Stop existing timers because vibration is detected and set a new one.
        globalStore.getValue(msg.endpoint, "timers", []).forEach((t: NodeJS.Timeout) => {
            clearTimeout(t);
        });
        globalStore.putValue(msg.endpoint, "timers", []);

        if (timeout !== 0) {
            const timer = setTimeout(() => {
                publish({vibration: false});
            }, timeout * 1000);

            globalStore.getValue(msg.endpoint, "timers").push(timer);
        }

        return {
            vibration: (zoneStatus & 1) > 0,
            tamper: (zoneStatus & (1 << 2)) > 0,
            battery_low: (zoneStatus & (1 << 3)) > 0,
        };
    },
};
export const ias_gas_alarm_1: Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification"> = {
    cluster: "ssIasZone",
    type: "commandStatusChangeNotification",
    convert: (model, msg, publish, options, meta) => {
        const zoneStatus = msg.data.zonestatus;
        return {
            gas: (zoneStatus & 1) > 0,
            tamper: (zoneStatus & (1 << 2)) > 0,
            battery_low: (zoneStatus & (1 << 3)) > 0,
        };
    },
};
export const ias_gas_alarm_2: Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification"> = {
    cluster: "ssIasZone",
    type: "commandStatusChangeNotification",
    convert: (model, msg, publish, options, meta) => {
        const zoneStatus = msg.data.zonestatus;
        return {
            gas: (zoneStatus & (1 << 1)) > 0,
            tamper: (zoneStatus & (1 << 2)) > 0,
            battery_low: (zoneStatus & (1 << 3)) > 0,
        };
    },
};
export const ias_smoke_alarm_1: Fz.Converter<"ssIasZone", undefined, ["commandStatusChangeNotification", "attributeReport", "readResponse"]> = {
    cluster: "ssIasZone",
    type: ["commandStatusChangeNotification", "attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        const zoneStatus = "zonestatus" in msg.data ? msg.data.zonestatus : msg.data.zoneStatus;
        return {
            smoke: (zoneStatus & 1) > 0,
            tamper: (zoneStatus & (1 << 2)) > 0,
            battery_low: (zoneStatus & (1 << 3)) > 0,
            supervision_reports: (zoneStatus & (1 << 4)) > 0,
            restore_reports: (zoneStatus & (1 << 5)) > 0,
            trouble: (zoneStatus & (1 << 6)) > 0,
            ac_status: (zoneStatus & (1 << 7)) > 0,
            test: (zoneStatus & (1 << 8)) > 0,
            battery_defect: (zoneStatus & (1 << 9)) > 0,
        };
    },
};
export const ias_contact_alarm_1: Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification"> = {
    cluster: "ssIasZone",
    type: "commandStatusChangeNotification",
    convert: (model, msg, publish, options, meta) => {
        const zoneStatus = msg.data.zonestatus;
        const contactProperty = postfixWithEndpointName("contact", msg, model, meta);
        const tamperProperty = postfixWithEndpointName("tamper", msg, model, meta);
        const batteryLowProperty = postfixWithEndpointName("battery_low", msg, model, meta);

        return {
            [contactProperty]: !((zoneStatus & 1) > 0),
            [tamperProperty]: (zoneStatus & (1 << 2)) > 0,
            [batteryLowProperty]: (zoneStatus & (1 << 3)) > 0,
        };
    },
};
export const ias_contact_alarm_1_report: Fz.Converter<"ssIasZone", undefined, "attributeReport"> = {
    cluster: "ssIasZone",
    type: "attributeReport",
    convert: (model, msg, publish, options, meta) => {
        const zoneStatus = msg.data.zoneStatus;
        if (zoneStatus !== undefined) {
            return {
                contact: !((zoneStatus & 1) > 0),
                tamper: (zoneStatus & (1 << 2)) > 0,
                battery_low: (zoneStatus & (1 << 3)) > 0,
            };
        }
    },
};
export const ias_carbon_monoxide_alarm_1: Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification"> = {
    cluster: "ssIasZone",
    type: "commandStatusChangeNotification",
    convert: (model, msg, publish, options, meta) => {
        const zoneStatus = msg.data.zonestatus;
        return {
            carbon_monoxide: (zoneStatus & 1) > 0,
            tamper: (zoneStatus & (1 << 2)) > 0,
            battery_low: (zoneStatus & (1 << 3)) > 0,
        };
    },
};
export const ias_carbon_monoxide_alarm_1_gas_alarm_2: Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification"> = {
    cluster: "ssIasZone",
    type: "commandStatusChangeNotification",
    convert: (model, msg, publish, options, meta) => {
        const {zonestatus} = msg.data;
        return {
            carbon_monoxide: (zonestatus & 1) > 0,
            gas: (zonestatus & (1 << 1)) > 0,
            tamper: (zonestatus & (1 << 2)) > 0,
            battery_low: (zonestatus & (1 << 3)) > 0,
            trouble: (zonestatus & (1 << 6)) > 0,
            ac_connected: !((zonestatus & (1 << 7)) > 0),
            test: (zonestatus & (1 << 8)) > 0,
            battery_defect: (zonestatus & (1 << 9)) > 0,
        };
    },
};
export const ias_sos_alarm_2: Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification"> = {
    cluster: "ssIasZone",
    type: "commandStatusChangeNotification",
    convert: (model, msg, publish, options, meta) => {
        const zoneStatus = msg.data.zonestatus;
        return {
            sos: (zoneStatus & (1 << 1)) > 0,
            tamper: (zoneStatus & (1 << 2)) > 0,
            battery_low: (zoneStatus & (1 << 3)) > 0,
        };
    },
};
export const ias_occupancy_alarm_1: Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification"> = {
    cluster: "ssIasZone",
    type: "commandStatusChangeNotification",
    convert: (model, msg, publish, options, meta) => {
        const zoneStatus = msg.data.zonestatus;
        return {
            occupancy: (zoneStatus & 1) > 0,
            tamper: (zoneStatus & (1 << 2)) > 0,
            battery_low: (zoneStatus & (1 << 3)) > 0,
        };
    },
};
export const ias_occupancy_alarm_1_report: Fz.Converter<"ssIasZone", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "ssIasZone",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        const zoneStatus = msg.data.zoneStatus;
        if (zoneStatus !== undefined) {
            return {
                occupancy: (zoneStatus & 1) > 0,
                tamper: (zoneStatus & (1 << 2)) > 0,
                battery_low: (zoneStatus & (1 << 3)) > 0,
            };
        }
    },
};
export const ias_occupancy_alarm_2: Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification"> = {
    cluster: "ssIasZone",
    type: "commandStatusChangeNotification",
    convert: (model, msg, publish, options, meta) => {
        const zoneStatus = msg.data.zonestatus;
        return {
            occupancy: (zoneStatus & (1 << 1)) > 0,
            tamper: (zoneStatus & (1 << 2)) > 0,
            battery_low: (zoneStatus & (1 << 3)) > 0,
        };
    },
};
export const ias_alarm_only_alarm_1: Fz.Converter<"ssIasZone", undefined, "attributeReport"> = {
    cluster: "ssIasZone",
    type: "attributeReport",
    convert: (model, msg, publish, options, meta) => {
        const zoneStatus = msg.data.zoneStatus;
        return {
            alarm: (zoneStatus & 1) > 0,
        };
    },
};
export const ias_occupancy_only_alarm_2: Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification"> = {
    cluster: "ssIasZone",
    type: "commandStatusChangeNotification",
    convert: (model, msg, publish, options, meta) => {
        const zoneStatus = msg.data.zonestatus;
        return {
            occupancy: (zoneStatus & (1 << 1)) > 0,
        };
    },
};
export const ias_occupancy_alarm_1_with_timeout: Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification"> = {
    cluster: "ssIasZone",
    type: "commandStatusChangeNotification",
    options: [exposes.options.occupancy_timeout()],
    convert: (model, msg, publish, options, meta) => {
        const zoneStatus = msg.data.zonestatus;
        const timeout = options?.occupancy_timeout != null ? Number(options.occupancy_timeout) : 90;

        clearTimeout(globalStore.getValue(msg.endpoint, "timer"));

        if (timeout !== 0) {
            const timer = setTimeout(() => publish({occupancy: false}), timeout * 1000);
            globalStore.putValue(msg.endpoint, "timer", timer);
        }

        return {
            occupancy: (zoneStatus & 1) > 0,
            tamper: (zoneStatus & (1 << 2)) > 0,
            battery_low: (zoneStatus & (1 << 3)) > 0,
        };
    },
};
export const command_store: Fz.Converter<"genScenes", undefined, "commandStore"> = {
    cluster: "genScenes",
    type: "commandStore",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const payload = {action: postfixWithEndpointName(`store_${msg.data.sceneid}`, msg, model, meta)};
        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_recall: Fz.Converter<"genScenes", undefined, "commandRecall"> = {
    cluster: "genScenes",
    type: "commandRecall",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const payload = {action: postfixWithEndpointName(`recall_${msg.data.sceneid}`, msg, model, meta)};
        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_panic: Fz.Converter<"ssIasAce", undefined, "commandPanic"> = {
    cluster: "ssIasAce",
    type: "commandPanic",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const payload = {action: postfixWithEndpointName("panic", msg, model, meta)};
        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_arm: Fz.Converter<"ssIasAce", undefined, "commandArm"> = {
    cluster: "ssIasAce",
    type: "commandArm",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const payload: KeyValueAny = {
            action: postfixWithEndpointName(constants.armMode[msg.data.armmode], msg, model, meta),
            action_code: msg.data.code,
            action_zone: msg.data.zoneid,
        };
        if (msg.groupID) payload.action_group = msg.groupID;
        return payload;
    },
};
export const command_cover_stop: Fz.Converter<"closuresWindowCovering", undefined, "commandStop"> = {
    cluster: "closuresWindowCovering",
    type: "commandStop",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const payload = {action: postfixWithEndpointName("stop", msg, model, meta)};
        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_cover_open: Fz.Converter<"closuresWindowCovering", undefined, "commandUpOpen"> = {
    cluster: "closuresWindowCovering",
    type: "commandUpOpen",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const payload = {action: postfixWithEndpointName("open", msg, model, meta)};
        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_cover_close: Fz.Converter<"closuresWindowCovering", undefined, "commandDownClose"> = {
    cluster: "closuresWindowCovering",
    type: "commandDownClose",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const payload = {action: postfixWithEndpointName("close", msg, model, meta)};
        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_on: Fz.Converter<"genOnOff", undefined, "commandOn"> = {
    cluster: "genOnOff",
    type: "commandOn",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const payload = {action: postfixWithEndpointName("on", msg, model, meta)};
        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_off: Fz.Converter<"genOnOff", undefined, "commandOff"> = {
    cluster: "genOnOff",
    type: "commandOff",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const payload = {action: postfixWithEndpointName("off", msg, model, meta)};
        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_off_with_effect: Fz.Converter<"genOnOff", undefined, "commandOffWithEffect"> = {
    cluster: "genOnOff",
    type: "commandOffWithEffect",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const payload = {action: postfixWithEndpointName("off", msg, model, meta)};
        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_toggle: Fz.Converter<"genOnOff", undefined, "commandToggle"> = {
    cluster: "genOnOff",
    type: "commandToggle",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const payload = {action: postfixWithEndpointName("toggle", msg, model, meta)};
        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_move_to_level: Fz.Converter<"genLevelCtrl", undefined, ["commandMoveToLevel", "commandMoveToLevelWithOnOff"]> = {
    cluster: "genLevelCtrl",
    type: ["commandMoveToLevel", "commandMoveToLevelWithOnOff"],
    options: [exposes.options.simulated_brightness()],
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const payload: KeyValueAny = {
            action: postfixWithEndpointName("brightness_move_to_level", msg, model, meta),
            action_level: msg.data.level,
            action_transition_time: msg.data.transtime / 100,
        };
        addActionGroup(payload, msg, model);

        if (options.simulated_brightness) {
            const currentBrightness = globalStore.getValue(msg.endpoint, "simulated_brightness_brightness", defaultSimulatedBrightness);
            globalStore.putValue(msg.endpoint, "simulated_brightness_brightness", msg.data.level);
            const property = postfixWithEndpointName("brightness", msg, model, meta);
            payload[property] = msg.data.level;
            const deltaProperty = postfixWithEndpointName("action_brightness_delta", msg, model, meta);
            payload[deltaProperty] = msg.data.level - currentBrightness;
        }

        return payload;
    },
};
export const command_move: Fz.Converter<"genLevelCtrl", undefined, ["commandMove", "commandMoveWithOnOff"]> = {
    cluster: "genLevelCtrl",
    type: ["commandMove", "commandMoveWithOnOff"],
    options: [exposes.options.simulated_brightness()],
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const direction = msg.data.movemode === 1 ? "down" : "up";
        const action = postfixWithEndpointName(`brightness_move_${direction}`, msg, model, meta);
        const payload = {action, action_rate: msg.data.rate};
        addActionGroup(payload, msg, model);

        if (options.simulated_brightness) {
            const opts: KeyValueAny = options.simulated_brightness;
            const deltaOpts = typeof opts === "object" && opts.delta != null ? opts.delta : 20;
            const intervalOpts = typeof opts === "object" && opts.interval != null ? opts.interval : 200;

            globalStore.putValue(msg.endpoint, "simulated_brightness_direction", direction);
            if (globalStore.getValue(msg.endpoint, "simulated_brightness_timer") === undefined) {
                const timer = setInterval(() => {
                    let brightness = globalStore.getValue(msg.endpoint, "simulated_brightness_brightness", defaultSimulatedBrightness);
                    const delta = globalStore.getValue(msg.endpoint, "simulated_brightness_direction") === "up" ? deltaOpts : -1 * deltaOpts;
                    brightness += delta;
                    brightness = numberWithinRange(brightness, 0, 255);
                    globalStore.putValue(msg.endpoint, "simulated_brightness_brightness", brightness);
                    const property = postfixWithEndpointName("brightness", msg, model, meta);
                    const deltaProperty = postfixWithEndpointName("action_brightness_delta", msg, model, meta);
                    publish({[property]: brightness, [deltaProperty]: delta});
                }, intervalOpts);

                globalStore.putValue(msg.endpoint, "simulated_brightness_timer", timer);
            }
        }

        return payload;
    },
};
export const command_step: Fz.Converter<"genLevelCtrl", undefined, ["commandStep", "commandStepWithOnOff"]> = {
    cluster: "genLevelCtrl",
    type: ["commandStep", "commandStepWithOnOff"],
    options: [exposes.options.simulated_brightness()],
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const direction = msg.data.stepmode === 1 ? "down" : "up";
        const payload: KeyValueAny = {
            action: postfixWithEndpointName(`brightness_step_${direction}`, msg, model, meta),
            action_step_size: msg.data.stepsize,
            action_transition_time: msg.data.transtime / 100,
        };
        addActionGroup(payload, msg, model);

        if (options.simulated_brightness) {
            let brightness = globalStore.getValue(msg.endpoint, "simulated_brightness_brightness", defaultSimulatedBrightness);
            const delta = direction === "up" ? msg.data.stepsize : -1 * msg.data.stepsize;
            brightness += delta;
            brightness = numberWithinRange(brightness, 0, 255);
            globalStore.putValue(msg.endpoint, "simulated_brightness_brightness", brightness);
            const property = postfixWithEndpointName("brightness", msg, model, meta);
            payload[property] = brightness;
            const deltaProperty = postfixWithEndpointName("action_brightness_delta", msg, model, meta);
            payload[deltaProperty] = delta;
        }

        return payload;
    },
};
export const command_stop: Fz.Converter<"genLevelCtrl", undefined, ["commandStop", "commandStopWithOnOff"]> = {
    cluster: "genLevelCtrl",
    type: ["commandStop", "commandStopWithOnOff"],
    options: [exposes.options.simulated_brightness()],
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        if (options.simulated_brightness) {
            clearInterval(globalStore.getValue(msg.endpoint, "simulated_brightness_timer"));
            globalStore.clearValue(msg.endpoint, "simulated_brightness_timer");
        }

        const payload = {action: postfixWithEndpointName("brightness_stop", msg, model, meta)};
        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_move_color_temperature: Fz.Converter<"lightingColorCtrl", undefined, ["commandMoveColorTemp"]> = {
    cluster: "lightingColorCtrl",
    type: ["commandMoveColorTemp"],
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const direction = utils.getFromLookup(msg.data.movemode, {0: "stop", 1: "up", 3: "down"});
        const action = postfixWithEndpointName(`color_temperature_move_${direction}`, msg, model, meta);
        const payload = {action, action_rate: msg.data.rate, action_minimum: msg.data.minimum, action_maximum: msg.data.maximum};
        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_stop_move_step: Fz.Converter<"lightingColorCtrl", undefined, "commandStopMoveStep"> = {
    cluster: "lightingColorCtrl",
    type: "commandStopMoveStep",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const payload = {action: postfixWithEndpointName("stop_move_step", msg, model, meta)};
        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_step_color_temperature: Fz.Converter<"lightingColorCtrl", undefined, "commandStepColorTemp"> = {
    cluster: "lightingColorCtrl",
    type: "commandStepColorTemp",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const direction = msg.data.stepmode === 1 ? "up" : "down";
        const payload: KeyValueAny = {
            action: postfixWithEndpointName(`color_temperature_step_${direction}`, msg, model, meta),
            action_step_size: msg.data.stepsize,
            action_color_temperature_delta: direction === "up" ? msg.data.stepsize : -1 * msg.data.stepsize,
        };

        if (msg.data.transtime !== undefined) {
            payload.action_transition_time = msg.data.transtime / 100;
        }

        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_enhanced_move_to_hue_and_saturation: Fz.Converter<"lightingColorCtrl", undefined, "commandEnhancedMoveToHueAndSaturation"> = {
    cluster: "lightingColorCtrl",
    type: "commandEnhancedMoveToHueAndSaturation",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const payload = {
            action: postfixWithEndpointName("enhanced_move_to_hue_and_saturation", msg, model, meta),
            action_enhanced_hue: msg.data.enhancehue,
            action_hue: mapNumberRange(msg.data.enhancehue, 0, 65535, 0, 360, 1),
            action_saturation: msg.data.saturation,
            action_transition_time: msg.data.transtime,
        };

        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_move_to_hue_and_saturation: Fz.Converter<"lightingColorCtrl", undefined, "commandMoveToHueAndSaturation"> = {
    cluster: "lightingColorCtrl",
    type: "commandMoveToHueAndSaturation",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const payload = {
            action: postfixWithEndpointName("move_to_hue_and_saturation", msg, model, meta),
            action_hue: msg.data.hue,
            action_saturation: msg.data.saturation,
            action_transition_time: msg.data.transtime,
        };

        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_step_hue: Fz.Converter<"lightingColorCtrl", undefined, ["commandStepHue"]> = {
    cluster: "lightingColorCtrl",
    type: ["commandStepHue"],
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const direction = msg.data.stepmode === 1 ? "up" : "down";
        const payload = {
            action: postfixWithEndpointName(`color_hue_step_${direction}`, msg, model, meta),
            action_step_size: msg.data.stepsize,
            action_transition_time: msg.data.transtime / 100,
        };
        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_step_saturation: Fz.Converter<"lightingColorCtrl", undefined, ["commandStepSaturation"]> = {
    cluster: "lightingColorCtrl",
    type: ["commandStepSaturation"],
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const direction = msg.data.stepmode === 1 ? "up" : "down";
        const payload = {
            action: postfixWithEndpointName(`color_saturation_step_${direction}`, msg, model, meta),
            action_step_size: msg.data.stepsize,
            action_transition_time: msg.data.transtime / 100,
        };
        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_color_loop_set: Fz.Converter<"lightingColorCtrl", undefined, "commandColorLoopSet"> = {
    cluster: "lightingColorCtrl",
    type: "commandColorLoopSet",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const updateFlags = msg.data.updateflags;
        const actionLookup: KeyValueAny = {
            0: "deactivate",
            1: "activate_from_color_loop_start_enhanced_hue",
            2: "activate_from_enhanced_current_hue",
        };

        const payload = {
            action: postfixWithEndpointName("color_loop_set", msg, model, meta),
            action_update_flags: {
                action: (updateFlags & (1 << 0)) > 0,
                direction: (updateFlags & (1 << 1)) > 0,
                time: (updateFlags & (1 << 2)) > 0,
                start_hue: (updateFlags & (1 << 3)) > 0,
            },
            action_action: actionLookup[msg.data.action],
            action_direction: msg.data.direction === 0 ? "decrement" : "increment",
            action_time: msg.data.time,
            action_start_hue: msg.data.starthue,
        };

        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_move_to_color_temp: Fz.Converter<"lightingColorCtrl", undefined, "commandMoveToColorTemp"> = {
    cluster: "lightingColorCtrl",
    type: "commandMoveToColorTemp",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const payload = {
            action: postfixWithEndpointName("color_temperature_move", msg, model, meta),
            action_color_temperature: msg.data.colortemp,
            action_transition_time: msg.data.transtime,
        };
        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_move_to_color: Fz.Converter<"lightingColorCtrl", undefined, "commandMoveToColor"> = {
    cluster: "lightingColorCtrl",
    type: "commandMoveToColor",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const payload = {
            action: postfixWithEndpointName("color_move", msg, model, meta),
            action_color: {
                x: precisionRound(msg.data.colorx / 65535, 3),
                y: precisionRound(msg.data.colory / 65535, 3),
            },
            action_transition_time: msg.data.transtime,
        };
        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_move_hue: Fz.Converter<"lightingColorCtrl", undefined, "commandMoveHue"> = {
    cluster: "lightingColorCtrl",
    type: "commandMoveHue",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const movestop = msg.data.movemode === 1 ? "move" : msg.data.movemode === 3 ? "down" : "stop";
        const action = postfixWithEndpointName(`hue_${movestop}`, msg, model, meta);
        const payload = {action, action_rate: msg.data.rate};
        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_move_to_saturation: Fz.Converter<"lightingColorCtrl", undefined, "commandMoveToSaturation"> = {
    cluster: "lightingColorCtrl",
    type: "commandMoveToSaturation",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const payload = {
            action: postfixWithEndpointName("move_to_saturation", msg, model, meta),
            action_saturation: msg.data.saturation,
            action_transition_time: msg.data.transtime,
        };
        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_move_to_hue: Fz.Converter<"lightingColorCtrl", undefined, "commandMoveToHue"> = {
    cluster: "lightingColorCtrl",
    type: "commandMoveToHue",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const payload = {
            action: postfixWithEndpointName("move_to_hue", msg, model, meta),
            action_hue: msg.data.hue,
            action_transition_time: msg.data.transtime / 100,
            action_direction: msg.data.direction === 0 ? "decrement" : "increment",
        };
        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_emergency: Fz.Converter<"ssIasAce", undefined, "commandEmergency"> = {
    cluster: "ssIasAce",
    type: "commandEmergency",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const payload = {action: postfixWithEndpointName("emergency", msg, model, meta)};
        addActionGroup(payload, msg, model);
        return payload;
    },
};
export const command_on_state: Fz.Converter<"genOnOff", undefined, "commandOn"> = {
    cluster: "genOnOff",
    type: "commandOn",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const property = postfixWithEndpointName("state", msg, model, meta);
        return {[property]: "ON"};
    },
};
export const command_off_state: Fz.Converter<"genOnOff", undefined, "commandOff"> = {
    cluster: "genOnOff",
    type: "commandOff",
    convert: (model, msg, publish, options, meta) => {
        if (hasAlreadyProcessedMessage(msg, model)) return;
        const property = postfixWithEndpointName("state", msg, model, meta);
        return {[property]: "OFF"};
    },
};
export const identify: Fz.Converter<"genIdentify", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genIdentify",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        return {action: postfixWithEndpointName("identify", msg, model, meta)};
    },
};
export const cover_position_tilt: Fz.Converter<"closuresWindowCovering", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "closuresWindowCovering",
    type: ["attributeReport", "readResponse"],
    options: [exposes.options.invert_cover()],
    convert: (model, msg, publish, options, meta) => {
        const result: KeyValueAny = {};
        // Zigbee officially expects 'open' to be 0 and 'closed' to be 100 whereas
        // HomeAssistant etc. work the other way round.
        // For zigbee-herdsman-converters: open = 100, close = 0
        // ubisys J1 will report 255 if lift or tilt positions are not known, so skip that.
        const metaInvert = model.meta?.coverInverted;
        const invert = metaInvert ? !options.invert_cover : options.invert_cover;
        const coverStateFromTilt = model.meta?.coverStateFromTilt;
        if (msg.data.currentPositionLiftPercentage !== undefined && msg.data.currentPositionLiftPercentage <= 100) {
            const value = msg.data.currentPositionLiftPercentage;
            result[postfixWithEndpointName("position", msg, model, meta)] = invert ? value : 100 - value;
            if (!coverStateFromTilt) {
                result[postfixWithEndpointName("state", msg, model, meta)] = metaInvert
                    ? value === 0
                        ? "CLOSE"
                        : "OPEN"
                    : value === 100
                      ? "CLOSE"
                      : "OPEN";
            }
        }
        if (msg.data.currentPositionTiltPercentage !== undefined && msg.data.currentPositionTiltPercentage <= 100) {
            const value = msg.data.currentPositionTiltPercentage;
            result[postfixWithEndpointName("tilt", msg, model, meta)] = invert ? value : 100 - value;
            if (coverStateFromTilt) {
                result[postfixWithEndpointName("state", msg, model, meta)] = metaInvert
                    ? value === 100
                        ? "OPEN"
                        : "CLOSE"
                    : value === 0
                      ? "OPEN"
                      : "CLOSE";
            }
        }
        if (msg.data.windowCoveringMode !== undefined) {
            result[postfixWithEndpointName("cover_mode", msg, model, meta)] = {
                reversed: (msg.data.windowCoveringMode & (1 << 0)) > 0,
                calibration: (msg.data.windowCoveringMode & (1 << 1)) > 0,
                maintenance: (msg.data.windowCoveringMode & (1 << 2)) > 0,
                led: (msg.data.windowCoveringMode & (1 << 3)) > 0,
            };
        }
        return result;
    },
};
export const cover_position_via_brightness: Fz.Converter<"genLevelCtrl", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genLevelCtrl",
    type: ["attributeReport", "readResponse"],
    options: [exposes.options.invert_cover()],
    convert: (model, msg, publish, options, meta) => {
        const currentLevel = Number(msg.data.currentLevel);
        let position = mapNumberRange(currentLevel, 0, 255, 0, 100);
        position = options.invert_cover ? 100 - position : position;
        const state = options.invert_cover ? (position > 0 ? "CLOSE" : "OPEN") : position > 0 ? "OPEN" : "CLOSE";
        return {state: state, position: position};
    },
};
export const cover_state_via_onoff: Fz.Converter<"genOnOff", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genOnOff",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        if (msg.data.onOff !== undefined) {
            return {state: msg.data.onOff === 1 ? "OPEN" : "CLOSE"};
        }
    },
};
export const curtain_position_analog_output: Fz.Converter<"genAnalogOutput", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genAnalogOutput",
    type: ["attributeReport", "readResponse"],
    options: [exposes.options.invert_cover()],
    convert: (model, msg, publish, options, meta) => {
        let position = precisionRound(msg.data.presentValue, 2);
        position = options.invert_cover ? 100 - position : position;
        return {position};
    },
};
export const lighting_ballast_configuration: Fz.Converter<"lightingBallastCfg", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "lightingBallastCfg",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        const result: KeyValueAny = {};
        if (msg.data.ballastStatus !== undefined) {
            const ballastStatus = msg.data.ballastStatus;
            result.ballast_status_non_operational = !!(ballastStatus & 1);
            result.ballast_status_lamp_failure = !!(ballastStatus & 2);
        }
        if (msg.data.minLevel !== undefined) {
            result.ballast_minimum_level = msg.data.minLevel;
        }
        if (msg.data.maxLevel !== undefined) {
            result.ballast_maximum_level = msg.data.maxLevel;
        }
        if (msg.data.powerOnLevel !== undefined) {
            result.ballast_power_on_level = msg.data.powerOnLevel;
        }
        if (msg.data.powerOnFadeTime !== undefined) {
            result.ballast_power_on_fade_time = msg.data.powerOnFadeTime;
        }
        if (msg.data.intrinsicBallastFactor !== undefined) {
            result.ballast_intrinsic_ballast_factor = msg.data.intrinsicBallastFactor;
        }
        if (msg.data.ballastFactorAdjustment !== undefined) {
            result.ballast_ballast_factor_adjustment = msg.data.ballastFactorAdjustment;
        }
        if (msg.data.lampQuantity !== undefined) {
            result.ballast_lamp_quantity = msg.data.lampQuantity;
        }
        if (msg.data.lampType !== undefined) {
            result.ballast_lamp_type = msg.data.lampType;
        }
        if (msg.data.lampManufacturer !== undefined) {
            result.ballast_lamp_manufacturer = msg.data.lampManufacturer;
        }
        if (msg.data.lampRatedHours !== undefined) {
            result.ballast_lamp_rated_hours = msg.data.lampRatedHours;
        }
        if (msg.data.lampBurnHours !== undefined) {
            result.ballast_lamp_burn_hours = msg.data.lampBurnHours;
        }
        if (msg.data.lampAlarmMode !== undefined) {
            const lampAlarmMode = msg.data.lampAlarmMode;
            result.ballast_lamp_alarm_lamp_burn_hours = !!(lampAlarmMode & 1);
        }
        if (msg.data.lampBurnHoursTripPoint !== undefined) {
            result.ballast_lamp_burn_hours_trip_point = msg.data.lampBurnHoursTripPoint;
        }
        return result;
    },
};
export const checkin_presence: Fz.Converter<"genPollCtrl", undefined, ["commandCheckin"]> = {
    cluster: "genPollCtrl",
    type: ["commandCheckin"],
    options: [exposes.options.presence_timeout()],
    convert: (model, msg, publish, options, meta) => {
        const useOptionsTimeout = options?.presence_timeout != null;
        const timeout = useOptionsTimeout ? Number(options.presence_timeout) : 100; // 100 seconds by default

        // Stop existing timer because presence is detected and set a new one.
        clearTimeout(globalStore.getValue(msg.endpoint, "timer"));

        const timer = setTimeout(() => publish({presence: false}), timeout * 1000);
        globalStore.putValue(msg.endpoint, "timer", timer);

        return {presence: true};
    },
};
export const ias_enroll: Fz.Converter<"ssIasZone", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "ssIasZone",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        const zoneState = msg.data.zoneState;
        const iasCieAddr = msg.data.iasCieAddr;
        const zoneId = msg.data.zoneId;
        return {
            enrolled: zoneState !== 0,
            ias_cie_address: iasCieAddr,
            zone_id: zoneId,
        };
    },
};
export const ias_wd: Fz.Converter<"ssIasWd", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "ssIasWd",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        const result: KeyValueAny = {};
        if (msg.data.maxDuration !== undefined) result.max_duration = msg.data.maxDuration;
        return result;
    },
};
export const power_source: Fz.Converter<"genBasic", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genBasic",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        const payload: KeyValueAny = {};
        if (msg.data.powerSource !== undefined) {
            const value = msg.data.powerSource;
            const lookup: KeyValueAny = {
                0: "unknown",
                1: "mains_single_phase",
                2: "mains_three_phase",
                3: "battery",
                4: "dc_source",
                5: "emergency_mains_constantly_powered",
                6: "emergency_mains_and_transfer_switch",
            };
            payload.power_source = lookup[value];

            if (["R7051"].includes(model.model)) {
                payload.ac_connected = value === 2;
            } else if (["ZNCLBL01LM"].includes(model.model)) {
                payload.charging = value === 4;
            }
        }

        return payload;
    },
};
export const hw_version: Fz.Converter<"genBasic", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genBasic",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        const result: KeyValueAny = {};
        if (msg.data.hwVersion !== undefined) result.hw_version = msg.data.hwVersion;
        return result;
    },
};
// #endregion

// #region Non-generic converters
export const ewelink_action: Fz.Converter<"genOnOff", undefined, ["commandOn", "commandOff", "commandToggle"]> = {
    cluster: "genOnOff",
    type: ["commandOn", "commandOff", "commandToggle"],
    convert: (model, msg, publish, options, meta) => {
        const lookup: KeyValueAny = {commandToggle: "single", commandOn: "double", commandOff: "long"};
        return {action: lookup[msg.type]};
    },
};
export const command_status_change_notification_action: Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification"> = {
    cluster: "ssIasZone",
    type: "commandStatusChangeNotification",
    convert: (model, msg, publish, options, meta) => {
        const lookup: KeyValueAny = {0: "off", 1: "single", 2: "double", 3: "hold"};
        return {action: lookup[msg.data.zonestatus]};
    },
};
// #endregion

// #region Ignore converters (these message dont need parsing).
export const ignore_onoff_report: Fz.Converter<"genOnOff", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genOnOff",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_illuminance_report: Fz.Converter<"msIlluminanceMeasurement", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "msIlluminanceMeasurement",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_occupancy_report: Fz.Converter<"msOccupancySensing", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "msOccupancySensing",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_temperature_report: Fz.Converter<"msTemperatureMeasurement", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "msTemperatureMeasurement",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_humidity_report: Fz.Converter<"msRelativeHumidity", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "msRelativeHumidity",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_pressure_report: Fz.Converter<"msPressureMeasurement", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "msPressureMeasurement",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_analog_report: Fz.Converter<"genAnalogInput", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genAnalogInput",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_multistate_report: Fz.Converter<"genMultistateInput", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genMultistateInput",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_power_report: Fz.Converter<"genPowerCfg", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genPowerCfg",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_light_brightness_report: Fz.Converter<"genLevelCtrl", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genLevelCtrl",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_light_color_colortemp_report: Fz.Converter<"lightingColorCtrl", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "lightingColorCtrl",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {},
};
// biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
export const ignore_closuresWindowCovering_report: Fz.Converter<"closuresWindowCovering", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "closuresWindowCovering",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_thermostat_report: Fz.Converter<"hvacThermostat", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "hvacThermostat",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_iaszone_attreport: Fz.Converter<"ssIasZone", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "ssIasZone",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_iaszone_statuschange: Fz.Converter<"ssIasZone", undefined, "commandStatusChangeNotification"> = {
    cluster: "ssIasZone",
    type: "commandStatusChangeNotification",
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_iaszone_report: Fz.Converter<"ssIasZone", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "ssIasZone",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_iasace_commandgetpanelstatus: Fz.Converter<"ssIasAce", undefined, ["commandGetPanelStatus"]> = {
    cluster: "ssIasAce",
    type: ["commandGetPanelStatus"],
    convert: (model, msg, publish, options, meta) => {},
};
// biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
export const ignore_genIdentify: Fz.Converter<"genIdentify", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genIdentify",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_command_on: Fz.Converter<"genOnOff", undefined, "commandOn"> = {
    cluster: "genOnOff",
    type: "commandOn",
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_command_off: Fz.Converter<"genOnOff", undefined, "commandOff"> = {
    cluster: "genOnOff",
    type: "commandOff",
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_command_off_with_effect: Fz.Converter<"genOnOff", undefined, "commandOffWithEffect"> = {
    cluster: "genOnOff",
    type: "commandOffWithEffect",
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_command_step: Fz.Converter<"genLevelCtrl", undefined, "commandStep"> = {
    cluster: "genLevelCtrl",
    type: "commandStep",
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_command_stop: Fz.Converter<"genLevelCtrl", undefined, "commandStop"> = {
    cluster: "genLevelCtrl",
    type: "commandStop",
    convert: (model, msg, publish, options, meta) => {},
};
// biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
export const ignore_genLevelCtrl_report: Fz.Converter<"genLevelCtrl", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "genLevelCtrl",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {},
};
// biome-ignore lint/style/useNamingConvention: ignored using `--suppress`
export const ignore_haDiagnostic: Fz.Converter<"haDiagnostic", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "haDiagnostic",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_tuya_set_time: Fz.Converter<"manuSpecificTuya", undefined, ["commandMcuSyncTime"]> = {
    cluster: "manuSpecificTuya",
    type: ["commandMcuSyncTime"],
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_tuya_raw: Fz.Converter<"manuSpecificTuya", undefined, ["raw"]> = {
    cluster: "manuSpecificTuya",
    type: ["raw"],
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_metering: Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "seMetering",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {},
};
export const ignore_electrical_measurement: Fz.Converter<"haElectricalMeasurement", undefined, ["attributeReport", "readResponse"]> = {
    cluster: "haElectricalMeasurement",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {},
};
// #endregion

export const command_arm_with_transaction: Fz.Converter<"ssIasAce", undefined, "commandArm"> = {
    cluster: "ssIasAce",
    type: "commandArm",
    convert: (model, msg, publish, options, meta) => {
        const payload = command_arm.convert(model, msg, publish, options, meta) as KeyValueAny;
        if (!payload) return;
        payload.action_transaction = msg.meta.zclTransactionSequenceNumber;
        return payload;
    },
};
export const ias_ace_occupancy_with_timeout: Fz.Converter<"ssIasAce", undefined, "commandGetPanelStatus"> = {
    cluster: "ssIasAce",
    type: "commandGetPanelStatus",
    options: [exposes.options.occupancy_timeout()],
    convert: (model, msg, publish, options, meta) => {
        const newMsg = {...msg, type: "attributeReport" as const, data: {occupancy: 1}};
        return occupancy_with_timeout.convert(model, newMsg, publish, options, meta);
    },
};
