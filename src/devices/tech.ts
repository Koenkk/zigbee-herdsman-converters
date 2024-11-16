import fz from '../converters/fromZigbee';
import {ota, Tz} from '../index';
import * as exposes from '../lib/exposes';
import * as legacy from '../lib/legacy';
import {logger} from '../lib/logger';
import * as tuya from '../lib/tuya';
import {DefinitionWithExtend, Fz} from '../lib/types';

const e = exposes.presets;
const ea = exposes.access;

// TECH DP
const dataPoints = {
    techOnOff: 101,
    techRunningState: 3,
    techMode: 2,
    techBattery: 6,
    techHeatingSetpoint: 4,
    techLocalTemp: 5,
    techTempSensitivity: 102,
    techEcoTemp: 103,
    techComfortTemp: 104,
    techHolidayTemp: 21,
    techAntifrostTemp: 105,
    techFrostProtection: 36,
    techTempCalibration: 47,
    techWindowDetection: 14,
    techWindowOpen: 15,
    techFaultAlarm: 35,
    techMonday: 28, // TODO
    techTuesday: 29, // TODO
    techWednesday: 30, // TODO
    techThursday: 31, // TODO
    techFriday: 32, // TODO
    techSaturday: 33, // TODO
    techSunday: 34, // TODO
};

const tech_thermostat_from = {
    cluster: 'manuSpecificTuya',
    type: ['commandDataResponse', 'commandDataReport'],
    convert: (model, msg, publish, options, meta) => {
        const dpValue = legacy.firstDpValue(msg, meta, 'tuya_thermostat');
        const dp = dpValue.dp;
        const value = legacy.getDataValue(dpValue);
        switch (dp) {
            case dataPoints.techOnOff:
                return {state: value ? 'ON' : 'OFF'}; // system_mode : 'off' ?

            case legacy.dataPoints.childLock:
                return {child_lock: value ? 'LOCK' : 'UNLOCK'};

            case dataPoints.techRunningState:
                return {running_state: value ? 'heat' : 'idle'};

            case dataPoints.techMode:
                switch (value) {
                    case 0: // manual
                        return {system_mode: 'heat', away_mode: 'OFF', preset: 'manual'}; // Hand / "normal"
                    case 1: // schedule
                        return {system_mode: 'auto', away_mode: 'OFF', preset: 'schedule'}; // Clock / "Auto"
                    case 2: // eco
                        return {system_mode: 'auto', away_mode: 'OFF', preset: 'eco'}; // "E" / Moon
                    case 3: // comfort
                        return {system_mode: 'heat', away_mode: 'OFF', preset: 'comfort'}; // Leaf / Sun
                    case 4: // antifrost
                        return {system_mode: 'auto', away_mode: 'OFF', preset: 'antifrost'}; // Flake
                    case 5: // holiday
                        return {system_mode: 'auto', away_mode: 'ON', preset: 'holiday'}; // Palm tree
                    default:
                        logger.warning(`Preset ${value} is not recognized.`, 'zhc:fz:tech_thermostat');
                        break;
                }
                break;

            case dataPoints.techBattery:
                return {battery: value};

            case dataPoints.techHeatingSetpoint: // current heating set point
                return {current_heating_setpoint: parseFloat((value / 10).toFixed(1))};

            case dataPoints.techLocalTemp: // Local temperature
                return {local_temperature: parseFloat((value / 10).toFixed(1))};

            case dataPoints.techTempSensitivity:
                return {temperature_sensitivity: parseFloat((value / 10).toFixed(1))};

            case dataPoints.techComfortTemp:
                return {comfort_temperature: parseFloat((value / 10).toFixed(1))};
            case dataPoints.techEcoTemp:
                return {eco_temperature: parseFloat((value / 10).toFixed(1))};
            case dataPoints.techHolidayTemp:
                return {holiday_temperature: parseFloat((value / 10).toFixed(1))};
            case dataPoints.techAntifrostTemp:
                return {min_temperature_limit: parseFloat((value / 10).toFixed(1))};
            case dataPoints.techFrostProtection:
                return {frost_protection: value ? 'ON' : 'OFF'};

            case dataPoints.techTempCalibration:
                return {local_temperature_calibration: parseFloat((value / 10).toFixed(1))};

            case dataPoints.techWindowDetection:
                return {window_detection: value ? 'ON' : 'OFF'};

            case dataPoints.techWindowOpen:
                return {window_open: value};

            case dataPoints.techFaultAlarm:
                return {valve_alarm: value};

            default: // unknowns DP
                logger.debug(`Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`, 'zhc:legacy:fz:tech_thermostat');
        }
    },
} satisfies Fz.Converter;

const tech_thermostat_to = [
    {
        key: ['state'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointBool(entity, dataPoints.techOnOff, value === 'ON');
        },
    } satisfies Tz.Converter,

    {
        key: ['child_lock'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointBool(entity, legacy.dataPoints.childLock, value === 'LOCK');
        },
    } satisfies Tz.Converter,

    {
        key: ['current_heating_setpoint'],
        convertSet: async (entity, key, value: number, meta) => {
            const temp = Math.round(value * 10);
            await tuya.sendDataPointValue(entity, dataPoints.techHeatingSetpoint, temp);
        },
    } satisfies Tz.Converter,

    {
        key: ['preset'],
        convertSet: async (entity, key, value: number, meta) => {
            const lookup: Record<string, number> = {schedule: 1, eco: 2, comfort: 3, antifrost: 4, holiday: 5};
            await tuya.sendDataPointEnum(entity, dataPoints.techMode, lookup[value]);
        },
    } satisfies Tz.Converter,

    {
        key: ['system_mode'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointBool(entity, dataPoints.techOnOff, value === 'off');
        },
    } satisfies Tz.Converter,

    {
        key: ['away_mode'],
        convertSet: async (entity, key, value, meta) => {
            if (value === 'ON') {
                await tuya.sendDataPointEnum(entity, dataPoints.techMode, 5); // holiday
            } else {
                await tuya.sendDataPointEnum(entity, dataPoints.techMode, 0); // manual
            }
        },
    } satisfies Tz.Converter,

    {
        key: ['local_temperature_calibration'],
        convertSet: async (entity, key, value: number, meta) => {
            let temp = Math.round(value * 10);
            if (temp < 0) {
                temp = 0xffffffff + temp + 1;
            }
            await tuya.sendDataPointValue(entity, dataPoints.techTempCalibration, temp);
        },
    } satisfies Tz.Converter,

    {
        key: ['temperature_sensitivity'],
        convertSet: async (entity, key, value: number, meta) => {
            const temp = Math.round(value * 10);
            await tuya.sendDataPointValue(entity, dataPoints.techTempSensitivity, temp);
        },
    } satisfies Tz.Converter,

    {
        key: ['window_detection'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointBool(entity, dataPoints.techWindowDetection, value === 'ON');
        },
    } satisfies Tz.Converter,

    {
        key: ['comfort_temperature'],
        convertSet: async (entity, key, value: number, meta) => {
            value = Math.round(value * 10);
            await tuya.sendDataPointValue(entity, dataPoints.techComfortTemp, value);
        },
    } satisfies Tz.Converter,
    {
        key: ['eco_temperature'],
        convertSet: async (entity, key, value: number, meta) => {
            value = Math.round(value * 10);
            await tuya.sendDataPointValue(entity, dataPoints.techEcoTemp, value);
        },
    } satisfies Tz.Converter,
    {
        key: ['holiday_temperature'],
        convertSet: async (entity, key, value: number, meta) => {
            value = Math.round(value * 10);
            await tuya.sendDataPointValue(entity, dataPoints.techHolidayTemp, value);
        },
    } satisfies Tz.Converter,
    {
        key: ['min_temperature_limit'],
        convertSet: async (entity, key, value: number, meta) => {
            value = Math.round(value * 10);
            await tuya.sendDataPointValue(entity, dataPoints.techAntifrostTemp, value);
        },
    } satisfies Tz.Converter,

    {
        key: ['frost_protection'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointBool(entity, dataPoints.techFrostProtection, value === 'ON');
        },
    } satisfies Tz.Converter,
];

const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE204_r7brscr6'}],
        model: 'VNTH-T2',
        vendor: 'TECH',
        description: 'Smart Radiator Valve',
        meta: {tuyaThermostatPreset: legacy.thermostatPresets, tuyaThermostatSystemMode: legacy.thermostatSystemModes3},
        ota: ota.zigbeeOTA,
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [tech_thermostat_from, fz.ignore_basic_report, fz.ignore_tuya_set_time],
        toZigbee: tech_thermostat_to,
        exposes: [
            e.child_lock(),
            e.window_detection(),
            e.window_open(),
            e.binary('window_open', ea.STATE, true, false).withDescription('Window open?'),
            e
                .climate()
                .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(
                    ['heat', 'auto', 'off'],
                    ea.STATE_SET,
                    'Mode of this device, in the `heat` mode the TS0601 will remain continuously heating, i.e. it does not regulate ' +
                        'to the desired temperature. If you want TRV to properly regulate the temperature you need to use mode `auto` ' +
                        'instead setting the desired temperature.',
                )
                .withLocalTemperatureCalibration(-9, 9, 0.5, ea.STATE_SET)
                .withPreset(['manual', 'schedule', 'eco', 'comfort', 'antifrost', 'holiday'])
                .withRunningState(['idle', 'heat'], ea.STATE),
            e.away_mode(),
            e
                .numeric('temperature_sensitivity', ea.STATE_SET)
                .withUnit('°C')
                .withDescription('Temperature sensivity')
                .withValueMin(0.5)
                .withValueMax(5)
                .withValueStep(0.5),
            e.comfort_temperature().withValueStep(0.5),
            e.eco_temperature().withValueStep(0.5),
            e.holiday_temperature().withValueStep(0.5),
            e.min_temperature_limit().withValueMin(5).withValueMax(15).withValueStep(0.5), // min temperature for frost protection
            e
                .binary('frost_protection', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Indicates if the frost protection mode is enabled')
                .withCategory('config'),
            e.valve_alarm(),
            /*e.week(),
            e
                .text('workdays_schedule', ea.STATE_SET)
                .withDescription('Workdays schedule, 6 entries max, example: "00:20/5°C 01:20/5°C 6:59/15°C 18:00/5°C 20:00/5°C 23:30/5°C"'),
            e
                .text('holidays_schedule', ea.STATE_SET)
                .withDescription('Holidays schedule, 6 entries max, example: "00:20/5°C 01:20/5°C 6:59/15°C 18:00/5°C 20:00/5°C 23:30/5°C"'),
             */
        ],
    },
];

export default definitions;
module.exports = definitions;
