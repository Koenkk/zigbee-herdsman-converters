import {Zcl} from 'zigbee-herdsman';

import * as utils from '../lib/utils';
import * as modernExtend from './modernExtend';
import {Fz, KeyValue, Tz} from './types';

function toDate(value: number): string {
    if (value === undefined) {
        return;
    }
    const date = new Date(value * 86400000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Månedene er 0-indeksert
    const year = date.getFullYear();
    return `${year}.${month}.${day}`;
}

function fromDate(value: string): number {
    // Ekstrakt `attrId` og `key` direkte fra attributtobjektet
    const dateParts = value.split(/[.\-/]/);
    if (dateParts.length !== 3) {
        throw new Error('Invalid date format');
    }

    let date: Date;
    if (dateParts[0].length === 4) {
        date = new Date(`${dateParts[0]}-${dateParts[1]}-${dateParts[2]}`);
    } else if (dateParts[2].length === 4) {
        date = new Date(`${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`);
    } else {
        throw new Error('Invalid date format');
    }

    return date.getTime() / 86400000 + 1;
}

export const fromZigbee = {
    namron_edge_thermostat_vacation_date: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data[0x8020] !== undefined) {
                result.vacation_start_date = toDate(msg.data[0x8020]);
            }
            if (msg.data[0x8021] !== undefined) {
                result.vacation_end_date = toDate(msg.data[0x8021]);
            }
            return result;
        },
    } satisfies Fz.Converter,
    namron_edge_thermostat_holiday_temp: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.programingOperMode !== undefined) {
                result.operating_mode = utils.getFromLookup(msg.data['programingOperMode'], {0: 'manual', 1: 'program', 5: 'eco'});
            }
            if (msg.data[0x8013] !== undefined) {
                result.holiday_temp_set = parseInt(msg.data[0x8013]) / 100;
            }
            if (msg.data[0x801b] !== undefined) {
                result.holiday_temp_set_f = parseInt(msg.data[0x801b]) / 100;
            }
            return result;
        },
    } satisfies Fz.Converter,
};

export const toZigbee = {
    namron_edge_thermostat_vacation_date: {
        key: ['vacation_start_date', 'vacation_end_date'],
        convertGet: async (entity, key, meta) => {
            switch (key) {
                case 'vacation_start_date':
                    await entity.read('hvacThermostat', [0x8020]);
                    break;
                case 'vacation_end_date':
                    await entity.read('hvacThermostat', [0x8021]);
                    break;
            }
        },
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
                case 'vacation_start_date':
                    await entity.write('hvacThermostat', {0x8020: fromDate(String(value))});
                    break;
                case 'vacation_end_date':
                    await entity.write('hvacThermostat', {0x8021: fromDate(String(value))});
                    break;
            }
        },
    } satisfies Tz.Converter,
    namron_edge_thermostat_holiday_temp: {
        key: ['operating_mode', 'holiday_temp_set', 'holiday_temp_set_f'],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
                case 'operating_mode':
                    await entity.write('hvacThermostat', {
                        0x0025: utils.getFromLookup(value, {manual: 0, program: 1, eco: 5}),
                        type: Zcl.DataType.BITMAP8,
                    });
                    break;
                case 'holiday_temp_set':
                    await entity.write('hvacThermostat', {0x8013: Number(value) * 100, type: Zcl.DataType.INT16});
                    break;
                case 'holiday_temp_set_f':
                    await entity.write('hvacThermostat', {0x801b: Number(value) * 100, type: Zcl.DataType.INT16});
                    break;
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
                case 'operating_mode':
                    await entity.read('hvacThermostat', ['programingOperMode']);
                    break;
                case 'holiday_temp_set':
                    await entity.read('hvacThermostat', [0x8013]);
                    break;
                case 'holiday_temp_set_f':
                    await entity.read('hvacThermostat', [0x801b]);
                    break;
            }
        },
    } satisfies Tz.Converter,
};

export const edgeThermostat = {
    windowOpenDetection: (args?: Partial<modernExtend.BinaryArgs>) =>
        modernExtend.binary({
            name: 'window_open_check',
            valueOn: ['ON', 1],
            valueOff: ['OFF', 0],
            cluster: 'hvacThermostat',
            attribute: {ID: 0x8000, type: Zcl.DataType.BOOLEAN},
            description: 'Enables or disables the window open detection',
            access: 'ALL',
            ...args,
        }),
    antiFrost: (args?: Partial<modernExtend.BinaryArgs>) =>
        modernExtend.binary({
            name: 'anti_frost',
            valueOn: ['ON', 1],
            valueOff: ['OFF', 0],
            cluster: 'hvacThermostat',
            attribute: {ID: 0x8001, type: Zcl.DataType.BOOLEAN},
            description: 'Enables or disables the anti-frost mode',
            access: 'ALL',
            ...args,
        }),
    summerWinterSwitch: (args?: Partial<modernExtend.BinaryArgs>) =>
        modernExtend.binary({
            name: 'summer_winter_switch',
            valueOn: ['ON', 1],
            valueOff: ['OFF', 0],
            cluster: 'hvacThermostat',
            attribute: {ID: 0x801e, type: Zcl.DataType.BOOLEAN},
            description: 'Summer/winter switch',
            access: 'ALL',
            ...args,
        }),
    vacationMode: (args?: Partial<modernExtend.BinaryArgs>) =>
        modernExtend.binary({
            name: 'vacation_mode',
            valueOn: ['ON', 1],
            valueOff: ['OFF', 0],
            cluster: 'hvacThermostat',
            attribute: {ID: 0x801f, type: Zcl.DataType.BOOLEAN},
            description: 'Vacation mode',
            access: 'ALL',
            ...args,
        }),
    timeSync: (args?: Partial<modernExtend.BinaryArgs>) =>
        modernExtend.binary({
            name: 'time_sync',
            valueOn: ['ON', 1],
            valueOff: ['OFF', 0],
            cluster: 'hvacThermostat',
            attribute: {ID: 0x800a, type: Zcl.DataType.BOOLEAN},
            description: 'Time sync',
            access: 'ALL',
            ...args,
        }),
    autoTime: (args?: Partial<modernExtend.BinaryArgs>) =>
        modernExtend.binary({
            name: 'auto_time',
            valueOn: ['ON', 1],
            valueOff: ['OFF', 0],
            cluster: 'hvacThermostat',
            attribute: {ID: 0x8022, type: Zcl.DataType.BOOLEAN},
            description: 'Auto time',
            access: 'ALL',
            ...args,
        }),

    displayActiveBacklight: (args?: Partial<modernExtend.NumericArgs>) =>
        modernExtend.numeric({
            name: 'display_active_backlight',
            cluster: 'hvacThermostat',
            attribute: {ID: 0x8005, type: Zcl.DataType.UINT8},
            description: 'Display active backlight',
            valueMin: 1,
            valueMax: 100,
            valueStep: 1,
            unit: '%',
            access: 'ALL',
            ...args,
        }),
    regulatorPercentage: (args?: Partial<modernExtend.NumericArgs>) =>
        modernExtend.numeric({
            name: 'regulator_percentage',
            cluster: 'hvacThermostat',
            attribute: {ID: 0x801d, type: Zcl.DataType.UINT8},
            description: 'Regulator percentage',
            unit: '%',
            valueMax: 100,
            valueMin: 0,
            valueStep: 1,
            access: 'ALL',
            ...args,
        }),
    regulationMode: (args?: Partial<modernExtend.EnumLookupArgs>) =>
        modernExtend.enumLookup({
            name: 'regulation_mode',
            cluster: 'hvacThermostat',
            attribute: {ID: 0x801c, type: Zcl.DataType.ENUM8},
            description: 'Regulation mode',
            lookup: {0: 'off', 1: 'heat', 2: 'cool'},
            access: 'ALL',
            ...args,
        }),
    displayAutoOff: (args?: Partial<modernExtend.EnumLookupArgs>) =>
        modernExtend.enumLookup({
            name: 'display_auto_off',
            cluster: 'hvacThermostat',
            attribute: {ID: 0x8029, type: Zcl.DataType.ENUM8},
            description: 'Display auto off',
            lookup: {0: 'always_on', 1: 'auto_off_after_10s', 2: 'auto_off_after_30s', 3: 'auto_off_after_60s'},
            access: 'ALL',
            ...args,
        }),
    sensorMode: (args?: Partial<modernExtend.EnumLookupArgs>) =>
        modernExtend.enumLookup({
            name: 'sensor_mode',
            cluster: 'hvacThermostat',
            attribute: {ID: 0x8004, type: Zcl.DataType.ENUM8},
            description: 'Sensor mode',
            lookup: {0: 'air', 1: 'floor', 3: 'external', 6: 'regulator'},
            access: 'ALL',
            ...args,
        }),
    boostTime: (args?: Partial<modernExtend.EnumLookupArgs>) =>
        modernExtend.enumLookup({
            name: 'boost_time_set',
            cluster: 'hvacThermostat',
            attribute: {ID: 0x8023, type: Zcl.DataType.ENUM8},
            description: 'Boost time',
            lookup: {
                0: 'off',
                1: '5_min',
                2: '10_min',
                3: '15_min',
                4: '20_min',
                5: '25_min',
                6: '30_min',
                7: '35_min',
                8: '40_min',
                9: '45_min',
                10: '50_min',
                11: '55_min',
                12: '1h',
                13: '1h_5_min',
                14: '1h_10_min',
                15: '1h_15_min',
                16: '1h_20_min',
                17: '1h_25_min',
                18: '1h_30_min',
                19: '1h_35_min',
                20: '1h_40_min',
                21: '1h_45_min',
                22: '1h_50_min',
                23: '1h_55_min',
                24: '2h',
            },
            access: 'ALL',
            ...args,
        }),
    systemMode: (args?: Partial<modernExtend.EnumLookupArgs>) =>
        modernExtend.enumLookup({
            name: 'system_mode',
            cluster: 'hvacThermostat',
            attribute: {ID: 0x001c, type: Zcl.DataType.ENUM8},
            description: 'System mode',
            lookup: {0x00: 'off', 0x01: 'auto', 0x03: 'cool', 0x04: 'heat'},
            access: 'ALL',
            ...args,
        }),

    deviceTime: (args?: Partial<modernExtend.NumericArgs>) =>
        modernExtend.numeric({
            name: 'time_sync_value',
            cluster: 'hvacThermostat',
            attribute: {ID: 0x800b, type: Zcl.DataType.UINT32},
            description: 'Device time',
            valueMin: 0,
            valueMax: 4294967295,
            access: 'ALL',
            ...args,
        }),
    absMinHeatSetpointLimitF: (args?: Partial<modernExtend.NumericArgs>) =>
        modernExtend.numeric({
            name: 'abs_min_heat_setpoint_limit_f',
            cluster: 'hvacThermostat',
            attribute: {ID: 0x800c, type: Zcl.DataType.INT16},
            description: 'Absolute min heat setpoint limit',
            unit: '°F',
            access: 'ALL',
            ...args,
        }),
    absMaxHeatSetpointLimitF: (args?: Partial<modernExtend.NumericArgs>) =>
        modernExtend.numeric({
            name: 'abs_max_heat_setpoint_limit_f',
            cluster: 'hvacThermostat',
            attribute: {ID: 0x800d, type: Zcl.DataType.INT16},
            description: 'Absolute max heat setpoint limit',
            unit: '°F',
            access: 'ALL',
            ...args,
        }),
    absMinCoolSetpointLimitF: (args?: Partial<modernExtend.NumericArgs>) =>
        modernExtend.numeric({
            name: 'abs_min_cool_setpoint_limit_f',
            cluster: 'hvacThermostat',
            attribute: {ID: 0x800e, type: Zcl.DataType.INT16},
            description: 'Absolute min cool setpoint limit',
            unit: '°F',
            access: 'ALL',
            ...args,
        }),
    absMaxCoolSetpointLimitF: (args?: Partial<modernExtend.NumericArgs>) =>
        modernExtend.numeric({
            name: 'abs_max_cool_setpoint_limit_f',
            cluster: 'hvacThermostat',
            attribute: {ID: 0x800f, type: Zcl.DataType.INT16},
            description: 'Absolute max cool setpoint limit',
            unit: '°F',
            access: 'ALL',
            ...args,
        }),
    occupiedCoolingSetpointF: (args?: Partial<modernExtend.NumericArgs>) =>
        modernExtend.numeric({
            name: 'occupied_cooling_setpoint_f',
            cluster: 'hvacThermostat',
            attribute: {ID: 0x8010, type: Zcl.DataType.INT16},
            description: 'Occupied cooling setpoint',
            unit: '°F',
            access: 'ALL',
            ...args,
        }),
    occupiedHeatingSetpointF: (args?: Partial<modernExtend.NumericArgs>) =>
        modernExtend.numeric({
            name: 'occupied_heating_setpoint_f',
            cluster: 'hvacThermostat',
            attribute: {ID: 0x8011, type: Zcl.DataType.INT16},
            description: 'Occupied heating setpoint',
            unit: '°F',
            access: 'ALL',
            ...args,
        }),
    localTemperatureF: (args?: Partial<modernExtend.NumericArgs>) =>
        modernExtend.numeric({
            name: 'local_temperature_f',
            cluster: 'hvacThermostat',
            attribute: {ID: 0x8012, type: Zcl.DataType.INT16},
            description: 'Local temperature',
            unit: '°F',
            access: 'ALL',
            ...args,
        }),

    readOnly: {
        windowState: (args?: Partial<modernExtend.BinaryArgs>) =>
            modernExtend.binary({
                name: 'window_state',
                valueOn: ['OPEN', 1],
                valueOff: ['CLOSED', 0],
                cluster: 'hvacThermostat',
                attribute: {ID: 0x8002, type: Zcl.DataType.BOOLEAN},
                description: 'Window state',
                access: 'STATE_GET',
                ...args,
            }),
        deviceFault: (args?: Partial<modernExtend.EnumLookupArgs>) =>
            modernExtend.enumLookup({
                name: 'fault',
                cluster: 'hvacThermostat',
                attribute: {ID: 0x8006, type: Zcl.DataType.ENUM8},
                description: 'Device fault',
                lookup: {
                    0: 'no_fault',
                    1: 'over_current_error',
                    2: 'over_heat_error',
                    3: 'built-in_sensor_error',
                    4: 'air_sensor_error',
                    5: 'floor_sensor_error',
                },
                access: 'STATE_GET',
                ...args,
            }),
        workDays: (args?: Partial<modernExtend.EnumLookupArgs>) =>
            modernExtend.enumLookup({
                name: 'work_days',
                cluster: 'hvacThermostat',
                attribute: {ID: 0x8003, type: Zcl.DataType.ENUM8},
                description: 'Work days',
                lookup: {0: 'monday-friday_saturday-sunday', 1: 'monday-saturday_sunday', 2: 'no_time_off', 3: 'time_off'},
                access: 'STATE_GET',
                ...args,
            }),
        boostTimeRemaining: (args?: Partial<modernExtend.NumericArgs>) =>
            modernExtend.numeric({
                name: 'boost_time_remaining',
                cluster: 'hvacThermostat',
                attribute: {ID: 0x8024, type: Zcl.DataType.UINT8},
                description: 'Boost time remaining',
                unit: 'min',
                access: 'STATE_GET',
                ...args,
            }),
    },
};
