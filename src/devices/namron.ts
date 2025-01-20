import {Zcl} from 'zigbee-herdsman';

import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as constants from '../lib/constants';
import * as exposes from '../lib/exposes';
import * as m from '../lib/modernExtend';
import * as reporting from '../lib/reporting';
import * as globalStore from '../lib/store';
import * as tuya from '../lib/tuya';
import {DefinitionWithExtend, Fz, KeyValue, Tz} from '../lib/types';
import * as utils from '../lib/utils';

const ea = exposes.access;
const e = exposes.presets;

const sunricherManufacturer = {manufacturerCode: Zcl.ManufacturerCode.SHENZHEN_SUNRICHER_TECHNOLOGY_LTD};

interface NamronPrivateAttribute {
    attrId: number | string;
    type: Zcl.DataType;
    key: string;
}

interface NamronPrivateTable {
    [key: string]: NamronPrivateAttribute;
}

const namronPrivateHvacThermostat: NamronPrivateTable = {
    windowCheck: {attrId: 0x8000, type: Zcl.DataType.BOOLEAN, key: 'window_open_check'},
    antiFrostMode: {attrId: 0x8001, type: Zcl.DataType.BOOLEAN, key: 'anti_frost'},
    windowState: {attrId: 0x8002, type: Zcl.DataType.BOOLEAN, key: 'window_open'},
    workDays: {attrId: 0x8003, type: Zcl.DataType.ENUM8, key: 'work_days'},
    sensorMode: {attrId: 0x8004, type: Zcl.DataType.ENUM8, key: 'sensor_mode'},
    activeBacklight: {attrId: 0x8005, type: Zcl.DataType.UINT8, key: 'active_display_brightness'},
    fault: {attrId: 0x8006, type: Zcl.DataType.ENUM8, key: 'fault'},
    regulator: {attrId: 0x8007, type: Zcl.DataType.UINT8, key: 'regulator'},
    timeSyncFlag: {attrId: 0x800a, type: Zcl.DataType.BOOLEAN, key: 'time_sync'},
    timeSyncValue: {attrId: 0x800b, type: Zcl.DataType.UINT32, key: 'time_sync_value'},
    absMinHeatSetpointLimitF: {attrId: 0x800c, type: Zcl.DataType.INT16, key: 'abs_min_heat_setpoint_limit_f'},
    absMaxHeatSetpointLimitF: {attrId: 0x800d, type: Zcl.DataType.INT16, key: 'abs_max_heat_setpoint_limit_f'},
    absMinCoolSetpointLimitF: {attrId: 0x800e, type: Zcl.DataType.INT16, key: 'abs_min_cool_setpoint_limit_f'},
    absMaxCoolSetpointLimitF: {attrId: 0x800f, type: Zcl.DataType.INT16, key: 'abs_max_cool_setpoint_limit_f'},
    occupiedCoolingSetpointF: {attrId: 0x8010, type: Zcl.DataType.INT16, key: 'occupied_cooling_setpoint_f'},
    occupiedHeatingSetpointF: {attrId: 0x8011, type: Zcl.DataType.INT16, key: 'occupied_heating_setpoint_f'},
    localTemperatureF: {attrId: 0x8012, type: Zcl.DataType.INT16, key: 'local_temperature_f'},
    holidayTempSet: {attrId: 0x8013, type: Zcl.DataType.INT16, key: 'holiday_temp_set'},
    holidayTempSetF: {attrId: 0x801b, type: Zcl.DataType.INT16, key: 'holiday_temp_set_f'},
    regulationMode: {attrId: 0x801c, type: Zcl.DataType.INT16, key: 'regulation_mode'},
    regulatorPercentage: {attrId: 0x801d, type: Zcl.DataType.INT16, key: 'regulator_percentage'},
    summerWinterSwitch: {attrId: 0x801e, type: Zcl.DataType.BOOLEAN, key: 'summer_winter_switch'},
    vacationMode: {attrId: 0x801f, type: Zcl.DataType.BOOLEAN, key: 'vacation_mode'},
    vacationStartDate: {attrId: 0x8020, type: Zcl.DataType.UINT32, key: 'vacation_start_date'},
    vacationEndDate: {attrId: 0x8021, type: Zcl.DataType.UINT32, key: 'vacation_end_date'},
    autoTime: {attrId: 0x8022, type: Zcl.DataType.BOOLEAN, key: 'auto_time'},
    countdownSet: {attrId: 0x8023, type: Zcl.DataType.ENUM8, key: 'boost_time_set'},
    countdownLeft: {attrId: 0x8024, type: Zcl.DataType.INT16, key: 'boost_time_left'},
    displayAutoOff: {attrId: 0x8029, type: Zcl.DataType.ENUM8, key: 'display_auto_off'},
    currentOperatingMode: {attrId: 'programingOperMode', type: Zcl.DataType.BITMAP8, key: 'current_operating_mode'},
};


function fromFzToTz(obj: KeyValue) {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [v, k]));
};

const fzNamronBoostTable = {
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
};
const tzNamronBoostTable = fromFzToTz(fzNamronBoostTable);

const fzNamronSystemMode = {0x00: 'off', 0x01: 'auto', 0x03: 'cool', 0x04: 'heat'};
const tzNamronSystemMode = fromFzToTz(fzNamronSystemMode);

const fzNamronOnOff = {0: 'off', 1: 'on'};
const tzNamronOnOff = fromFzToTz(fzNamronOnOff);

const fzNamronOpenClose = {0: 'closed', 1: 'open'};
const tzNamronOpenClose = fromFzToTz(fzNamronOpenClose);

const fzNamronDisplayTimeout = {0: 'off', 1: '10s', 2: '30s', 3: '60s'};
const tzNamronDisplayTimeout = fromFzToTz(fzNamronDisplayTimeout);

const fzNamronSensorMode = {0: 'air', 1: 'floor', 3: 'external', 6: 'regulator'};
const tzNamronSensorMode = fromFzToTz(fzNamronSensorMode);

const fzNamronOperationMode = {0: 'manual', 1: 'manual', 5: 'eco'};
const tzNamronOperationMode = fromFzToTz(fzNamronOperationMode);

const fzNamronFault = {
    0: 'no_fault',
    1: 'over_current_error',
    2: 'over_heat_error',
    3: 'built-in_sensor_error',
    4: 'air_sensor_error',
    5: 'floor_sensor_error',
};

const fzNamronWorkDays = {0: 'mon-fri_sat-sun', 1: 'mon-sat_sun', 2: 'no_time_off', 3: 'time_off'};
const tzNamronWorkDays = fromFzToTz(fzNamronWorkDays);

const findAttributeByKey = (key: string, attributes: NamronPrivateTable) => {
    // Finn objektet basert på key
    return Object.values(attributes).find((attr) => attr.key === key);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const assign = (data: any, attribute: NamronPrivateAttribute, target: KeyValue, defaultValue: any = null, transform = (value: any) => value) => {
    // Ekstrakt `attrId` og `key` direkte fra attributtobjektet
    const {attrId, key: targetKey} = attribute;

    if (data[attrId] !== undefined) {
        target[targetKey] = transform(data[attrId]);
    } else if (data[attrId] && defaultValue !== null && defaultValue !== undefined) {
        target[targetKey] = transform(defaultValue);
    }
};

const assignWithLookup = (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any,
    attribute: NamronPrivateAttribute,
    target: KeyValue,
    lookup = {},
    defaultValue: string | number | null = null,
) => {
    // Ekstrakt `attrId` og `key` direkte fra attributtobjektet
    const {attrId, key: targetKey} = attribute;

    if (data[attrId] !== undefined) {
        const value = data[attrId] ?? defaultValue;
        target[targetKey] = utils.getFromLookup(value, lookup);
    }
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const assignDate = (data: any, attribute: NamronPrivateAttribute, target: KeyValue) => {
    // Ekstrakt `attrId` og `key` direkte fra attributtobjektet
    const {attrId, key: targetKey} = attribute;
    const value = data[attrId];
    if (value === undefined) {
        return;
    }
    const date = new Date(value * 86400000);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Månedene er 0-indeksert
    const year = date.getFullYear();
    target[targetKey] = `${year}.${month}.${day}`;
};

const fromDate = (value: string) => {
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
};

const fzLocal = {
    namron_panelheater: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            const data = msg.data;
            if (data[0x1000] !== undefined) {
                // OperateDisplayBrightnesss
                result.display_brightnesss = data[0x1000];
            }
            if (data[0x1001] !== undefined) {
                // DisplayAutoOffActivation
                const lookup = {0: 'deactivated', 1: 'activated'};
                result.display_auto_off = utils.getFromLookup(data[0x1001], lookup);
            }
            if (data[0x1004] !== undefined) {
                // PowerUpStatus
                const lookup = {0: 'manual', 1: 'last_state'};
                result.power_up_status = utils.getFromLookup(data[0x1004], lookup);
            }
            if (data[0x1009] !== undefined) {
                // WindowOpenCheck
                const lookup = {0: 'enable', 1: 'disable'};
                result.window_open_check = utils.getFromLookup(data[0x1009], lookup);
            }
            if (data[0x100a] !== undefined) {
                // Hysterersis
                result.hysterersis = utils.precisionRound(data[0x100a], 2) / 10;
            }
            return result;
        },
    } satisfies Fz.Converter,
    namron_thermostat2: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.local_temperature_based_on_sensor()],
        convert: (model, msg, publish, options, meta) => {
            const runningModeStateMap: KeyValue = {0: 0, 3: 2, 4: 5};
            // override mode "idle" - not a supported running mode
            if (msg.data['runningMode'] == 0x10) msg.data['runningMode'] = 0;
            // map running *mode* to *state*, as that's what used
            // in homeAssistant climate ui card (red background)
            if (msg.data['runningMode'] !== undefined) msg.data['runningState'] = runningModeStateMap[msg.data['runningMode']];
            return fz.thermostat.convert(model, msg, publish, options, meta); // as KeyValue;
        },
    } satisfies Fz.Converter,
    namron_edge_thermostat: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const data = msg.data;

            assignWithLookup(data, namronPrivateHvacThermostat.work_days, result, fzNamronWorkDays, 0);
            assignWithLookup(data, namronPrivateHvacThermostat.sensor_mode, result, fzNamronSensorMode, 0);
            assignWithLookup(data, namronPrivateHvacThermostat.fault, result, fzNamronFault, 0);

            assignWithLookup(data, namronPrivateHvacThermostat.window_check, result, fzNamronOnOff, 0);
            assignWithLookup(data, namronPrivateHvacThermostat.anti_frost_mode, result, fzNamronOnOff, 0);
            assignWithLookup(data, namronPrivateHvacThermostat.window_state, result, fzNamronOpenClose, 0);
            assignWithLookup(data, namronPrivateHvacThermostat.summer_winter_switch, result, fzNamronOnOff, 0);
            assignWithLookup(data, namronPrivateHvacThermostat.vacation_mode, result, fzNamronOnOff, 0);
            assignWithLookup(data, namronPrivateHvacThermostat.time_sync_flag, result, fzNamronOnOff, 0);

            assign(data, namronPrivateHvacThermostat.active_backlight, result);
            assign(data, namronPrivateHvacThermostat.time_sync_value, result);
            assign(data, namronPrivateHvacThermostat.abs_min_heat_setpoint_limit_f, result);
            assign(data, namronPrivateHvacThermostat.abs_max_heat_setpoint_limit_f, result);
            assign(data, namronPrivateHvacThermostat.abs_min_cool_setpoint_limit_f, result);
            assign(data, namronPrivateHvacThermostat.abs_max_cool_setpoint_limit_f, result);
            assign(data, namronPrivateHvacThermostat.occupied_cooling_setpoint_f, result);
            assign(data, namronPrivateHvacThermostat.occupied_heating_setpoint_f, result);
            assign(data, namronPrivateHvacThermostat.local_temperature_f, result);
            assign(data, namronPrivateHvacThermostat.holiday_temp_set, result, (value: number) => {
                return value / 100;
            });
            assign(data, namronPrivateHvacThermostat.holiday_temp_set_f, result, (value: number) => {
                return value / 100;
            });

            assign(data, namronPrivateHvacThermostat.regulator_percentage, result, 0, (value) => {
                return value;
            });

            assignDate(data, namronPrivateHvacThermostat.vacation_start_date, result);
            assignDate(data, namronPrivateHvacThermostat.vacation_end_date, result);

            // Auto_time (synkroniser tid med ntp?)
            assignWithLookup(data, namronPrivateHvacThermostat.auto_time, result, fzNamronOnOff, 0);
            assignWithLookup(data, namronPrivateHvacThermostat.countdown_set, result, fzNamronBoostTable, 0);
            assign(data, namronPrivateHvacThermostat.countdown_left, result, 0, (value) => (value > 200 ? 0 : value));
            assignWithLookup(data, namronPrivateHvacThermostat.display_auto_off, result, fzNamronDisplayTimeout, 0);
            assignWithLookup(data, namronPrivateHvacThermostat.system_mode, result, fzNamronSystemMode, 0x00);
            assignWithLookup(data, namronPrivateHvacThermostat.current_operating_mode, result, fzNamronOperationMode, 0);

            return result;
        },
    } satisfies Fz.Converter,
};

const tzLocal = {
    namron_panelheater: {
        key: ['display_brightnesss', 'display_auto_off', 'power_up_status', 'window_open_check', 'hysterersis'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'display_brightnesss') {
                const payload = {0x1000: {value: value, type: Zcl.DataType.ENUM8}};
                await entity.write('hvacThermostat', payload, sunricherManufacturer);
            } else if (key === 'display_auto_off') {
                const lookup = {deactivated: 0, activated: 1};
                const payload = {0x1001: {value: utils.getFromLookup(value, lookup), type: Zcl.DataType.ENUM8}};
                await entity.write('hvacThermostat', payload, sunricherManufacturer);
            } else if (key === 'power_up_status') {
                const lookup = {manual: 0, last_state: 1};
                const payload = {0x1004: {value: utils.getFromLookup(value, lookup), type: Zcl.DataType.ENUM8}};
                await entity.write('hvacThermostat', payload, sunricherManufacturer);
            } else if (key === 'window_open_check') {
                const lookup = {enable: 0, disable: 1};
                const payload = {0x1009: {value: utils.getFromLookup(value, lookup), type: Zcl.DataType.ENUM8}};
                await entity.write('hvacThermostat', payload, sunricherManufacturer);
            } else if (key === 'hysterersis') {
                const payload = {0x100a: {value: utils.toNumber(value, 'hysterersis') * 10, type: 0x20}};
                await entity.write('hvacThermostat', payload, sunricherManufacturer);
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
                case 'display_brightnesss':
                    await entity.read('hvacThermostat', [0x1000], sunricherManufacturer);
                    break;
                case 'display_auto_off':
                    await entity.read('hvacThermostat', [0x1001], sunricherManufacturer);
                    break;
                case 'power_up_status':
                    await entity.read('hvacThermostat', [0x1004], sunricherManufacturer);
                    break;
                case 'window_open_check':
                    await entity.read('hvacThermostat', [0x1009], sunricherManufacturer);
                    break;
                case 'hysterersis':
                    await entity.read('hvacThermostat', [0x100a], sunricherManufacturer);
                    break;

                default: // Unknown key
                    throw new Error(`Unhandled key toZigbee.namron_panelheater.convertGet ${key}`);
            }
        },
    } satisfies Tz.Converter,
    namron_edge_thermostat: {
        key: [
            'window_open_check',
            'anti_frost',
            'window_open',
            'work_days',
            'sensor_mode',
            'active_display_brightness',
            'fault',
            'regulator',
            'time_sync',
            'time_sync_value',
            'abs_min_heat_setpoint_limit_f',
            'abs_max_heat_setpoint_limit_f',
            'abs_min_cool_setpoint_limit_f',
            'abs_max_cool_setpoint_limit_f',
            'occupied_cooling_setpoint_f',
            'occupied_heating_setpoint_f',
            'local_temperature_f',
            'holiday_temp_set',
            'holiday_temp_set_f',
            'regulation_mode',
            'regulator_percentage',
            'summer_winter_switch',
            'vacation_mode',
            'vacation_start_date',
            'vacation_end_date',
            'auto_time',
            'boost_time_set',
            'boost_time_left',
            'display_auto_off',
            'system_mode',
            'current_operating_mode',
        ],

        convertGet: async (entity, key, meta) => {
            const readAttr = findAttributeByKey(key, namronPrivateHvacThermostat);
            if (readAttr) {
                await entity.read('hvacThermostat', [readAttr.attrId]);
            } else {
                throw new Error(`Unhandled key toZigbee.namronEdgeThermostat.convertGet ${key}`);
            }
        },

        convertSet: async (entity, key, value, meta) => {
            const readAttr = findAttributeByKey(key, namronPrivateHvacThermostat);

            if (!readAttr) {
                throw new Error(`Unhandled key toZigbee.namronEdgeThermostat.convertSet ${key}`);
            }

            if (
                [
                    namronPrivateHvacThermostat.window_check.key,
                    namronPrivateHvacThermostat.anti_frost_mode.key,
                    namronPrivateHvacThermostat.time_sync_flag.key,
                    namronPrivateHvacThermostat.summer_winter_switch.key,
                    namronPrivateHvacThermostat.auto_time.key,
                    namronPrivateHvacThermostat.vacation_mode.key,
                ].includes(readAttr.key)
            ) {
                const payload = {[readAttr.attrId]: {value: utils.getFromLookup(value, tzNamronOnOff), type: readAttr.type}};
                await entity.write('hvacThermostat', payload);
                return;
            }

            // Direct call
            if ([Zcl.DataType.UINT8, Zcl.DataType.INT16, Zcl.DataType.UINT32].includes(readAttr.type)) {
                const payload = {[readAttr.attrId]: {value: value, type: readAttr.type}};
                await entity.write('hvacThermostat', payload);
            }

            if (readAttr === namronPrivateHvacThermostat.countdown_set) {
                await entity.write('hvacThermostat', {
                    [readAttr.attrId]: {
                        value: utils.getFromLookup(value, tzNamronBoostTable),
                        type: readAttr.type,
                    },
                });
            }

            if (readAttr === namronPrivateHvacThermostat.window_state) {
                await entity.write('hvacThermostat', {
                    [readAttr.attrId]: {
                        value: utils.getFromLookup(value, tzNamronOpenClose),
                        type: readAttr.type,
                    },
                });
            }

            if (readAttr === namronPrivateHvacThermostat.display_auto_off) {
                await entity.write('hvacThermostat', {
                    [readAttr.attrId]: {
                        value: utils.getFromLookup(value, tzNamronDisplayTimeout),
                        type: readAttr.type,
                    },
                });
            }

            if (readAttr === namronPrivateHvacThermostat.sensor_mode) {
                await entity.write('hvacThermostat', {
                    [readAttr.attrId]: {
                        value: utils.getFromLookup(value, tzNamronSensorMode),
                        type: readAttr.type,
                    },
                });
            }

            if (readAttr === namronPrivateHvacThermostat.system_mode) {
                await entity.write('hvacThermostat', {
                    [readAttr.attrId]: {
                        value: utils.getFromLookup(value, tzNamronSystemMode),
                        type: readAttr.type,
                    },
                });
            }

            if (readAttr === namronPrivateHvacThermostat.current_operating_mode) {
                await entity.write('hvacThermostat', {
                    [readAttr.attrId]: {
                        value: utils.getFromLookup(value, tzNamronOperationMode),
                        type: readAttr.type,
                    },
                });
            }

            if (readAttr === namronPrivateHvacThermostat.holiday_temp_set) {
                await entity.write('hvacThermostat', {
                    [readAttr.attrId]: {
                        value: Number(value) * 100,
                        type: readAttr.type,
                    },
                });
            }

            if ([namronPrivateHvacThermostat.vacation_start_date.key, namronPrivateHvacThermostat.vacation_end_date.key].includes(readAttr.key)) {
                await entity.write('hvacThermostat', {
                    [readAttr.attrId]: {
                        value: fromDate(String(value)),
                        type: readAttr.type,
                    },
                });
            }

            if (readAttr === namronPrivateHvacThermostat.work_days) {
                await entity.write('hvacThermostat', {
                    [readAttr.attrId]: {
                        value: utils.getFromLookup(value, tzNamronWorkDays),
                        type: readAttr.type,
                    },
                });
            }
        },
    } satisfies Tz.Converter,
};

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['3308431'],
        model: '3308431',
        vendor: 'Namron',
        description: 'Luna ceiling light',
        extend: [m.light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['3802967'],
        model: '3802967',
        vendor: 'Namron',
        description: 'Led bulb 6w RGBW',
        extend: [m.light({colorTemp: {range: [153, 555]}, color: true})],
    },
    {
        zigbeeModel: ['4512700'],
        model: '4512700',
        vendor: 'Namron',
        description: 'Zigbee dimmer 400W',
        ota: true,
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ['4512760'],
        model: '4512760',
        vendor: 'Namron',
        description: 'Zigbee dimmer 400W',
        ota: true,
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ['4512708'],
        model: '4512708',
        vendor: 'Namron',
        description: 'Zigbee LED dimmer',
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ['4512766'],
        model: '4512766',
        vendor: 'Namron',
        description: 'Zigbee smart plug 16A',
        ota: true,
        extend: [m.onOff(), m.electricityMeter()],
    },
    {
        zigbeeModel: ['4512767'],
        model: '4512767',
        vendor: 'Namron',
        description: 'Zigbee smart plug 16A',
        ota: true,
        extend: [m.onOff(), m.electricityMeter()],
    },
    {
        zigbeeModel: ['1402767'],
        model: '1402767',
        vendor: 'Namron',
        description: 'Zigbee LED dimmer',
        extend: [m.light({effect: false, configureReporting: true}), m.forcePowerSource({powerSource: 'Mains (single phase)'})],
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ['1402768'],
        model: '1402768',
        vendor: 'Namron',
        description: 'Zigbee LED dimmer TW 250W',
        extend: [m.light({effect: false, configureReporting: true, colorTemp: {range: [250, 65279]}})],
    },
    {
        zigbeeModel: ['4512733'],
        model: '4512733',
        vendor: 'Namron',
        description: 'ZigBee dimmer 2-pol 400W',
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ['4512704'],
        model: '4512704',
        vendor: 'Namron',
        description: 'Zigbee switch 400W',
        extend: [m.onOff()],
        ota: true,
    },
    {
        zigbeeModel: ['1402755'],
        model: '1402755',
        vendor: 'Namron',
        description: 'ZigBee LED dimmer',
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ['4512703'],
        model: '4512703',
        vendor: 'Namron',
        description: 'Zigbee 4 channel switch K8 (white)',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        exposes: [
            e.battery(),
            e.action([
                'on_l1',
                'off_l1',
                'brightness_move_up_l1',
                'brightness_move_down_l1',
                'brightness_stop_l1',
                'on_l2',
                'off_l2',
                'brightness_move_up_l2',
                'brightness_move_down_l2',
                'brightness_stop_l2',
                'on_l3',
                'off_l3',
                'brightness_move_up_l3',
                'brightness_move_down_l3',
                'brightness_stop_l3',
                'on_l4',
                'off_l4',
                'brightness_move_up_l4',
                'brightness_move_down_l4',
                'brightness_stop_l4',
            ]),
        ],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
        ota: true,
    },
    {
        zigbeeModel: ['4512721'],
        model: '4512721',
        vendor: 'Namron',
        description: 'Zigbee 4 channel switch K8 (black)',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        toZigbee: [],
        meta: {multiEndpoint: true},
        exposes: [
            e.battery(),
            e.action([
                'on_l1',
                'off_l1',
                'brightness_move_up_l1',
                'brightness_move_down_l1',
                'brightness_stop_l1',
                'on_l2',
                'off_l2',
                'brightness_move_up_l2',
                'brightness_move_down_l2',
                'brightness_stop_l2',
                'on_l3',
                'off_l3',
                'brightness_move_up_l3',
                'brightness_move_down_l3',
                'brightness_stop_l3',
                'on_l4',
                'off_l4',
                'brightness_move_up_l4',
                'brightness_move_down_l4',
                'brightness_stop_l4',
            ]),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
        ota: true,
    },
    {
        zigbeeModel: ['4512701'],
        model: '4512701',
        vendor: 'Namron',
        description: 'Zigbee 1 channel switch K2 (White)',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        exposes: [e.battery(), e.action(['on', 'off', 'brightness_move_up', 'brightness_move_down', 'brightness_stop'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['4512728'],
        model: '4512728',
        vendor: 'Namron',
        description: 'Zigbee 1 channel switch K2 (Black)',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        exposes: [e.battery(), e.action(['on', 'off', 'brightness_move_up', 'brightness_move_down', 'brightness_stop'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['1402769'],
        model: '1402769',
        vendor: 'Namron',
        description: 'ZigBee LED dimmer',
        extend: [m.light({configureReporting: true}), m.forcePowerSource({powerSource: 'Mains (single phase)'})],
        ota: true,
    },
    {
        zigbeeModel: ['4512702'],
        model: '4512702',
        vendor: 'Namron',
        description: 'Zigbee 1 channel switch K4',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop, fz.command_step],
        exposes: [
            e.battery(),
            e.action(['on', 'off', 'brightness_move_up', 'brightness_move_down', 'brightness_stop', 'brightness_step_up', 'brightness_step_down']),
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['4512719'],
        model: '4512719',
        vendor: 'Namron',
        description: 'Zigbee 2 channel switch K4 (white)',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        meta: {multiEndpoint: true},
        exposes: [
            e.battery(),
            e.action([
                'on_l1',
                'off_l1',
                'brightness_move_up_l1',
                'brightness_move_down_l1',
                'brightness_stop_l1',
                'on_l2',
                'off_l2',
                'brightness_move_up_l2',
                'brightness_move_down_l2',
                'brightness_stop_l2',
            ]),
        ],
        toZigbee: [],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        ota: true,
    },
    {
        fingerprint: [{modelID: 'DIM Lighting', manufacturerName: 'Namron As'}],
        model: '4512707',
        vendor: 'Namron',
        description: 'Zigbee LED-Controller',
        extend: [m.light()],
    },
    {
        zigbeeModel: ['4512726'],
        model: '4512726',
        vendor: 'Namron',
        description: 'Zigbee 4 in 1 dimmer',
        fromZigbee: [
            fz.battery,
            fz.command_on,
            fz.command_off,
            fz.command_move_to_level,
            fz.command_move_to_color_temp,
            fz.command_move_to_hue,
            fz.ignore_genOta,
        ],
        toZigbee: [],
        exposes: [e.battery(), e.battery_voltage(), e.action(['on', 'off', 'brightness_move_to_level', 'color_temperature_move', 'move_to_hue'])],
        meta: {battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genPowerCfg', 'genIdentify', 'haDiagnostic', 'genOta'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        ota: true,
    },
    {
        zigbeeModel: ['4512729'],
        model: '4512729',
        vendor: 'Namron',
        description: 'Zigbee 2 channel switch K4 (black)',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        meta: {multiEndpoint: true},
        exposes: [
            e.battery(),
            e.action([
                'on_l1',
                'off_l1',
                'brightness_move_up_l1',
                'brightness_move_down_l1',
                'brightness_stop_l1',
                'on_l2',
                'off_l2',
                'brightness_move_up_l2',
                'brightness_move_down_l2',
                'brightness_stop_l2',
            ]),
        ],
        toZigbee: [],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        ota: true,
    },
    {
        zigbeeModel: ['4512706'],
        model: '4512706',
        vendor: 'Namron',
        description: 'Remote control',
        fromZigbee: [
            fz.command_on,
            fz.command_off,
            fz.command_step,
            fz.command_step_color_temperature,
            fz.command_recall,
            fz.command_move_to_color_temp,
            fz.battery,
            fz.command_move_to_hue,
        ],
        exposes: [
            e.battery(),
            e.action([
                'on',
                'off',
                'brightness_step_up',
                'brightness_step_down',
                'color_temperature_step_up',
                'color_temperature_step_down',
                'recall_*',
                'color_temperature_move',
                'move_to_hue_l1',
                'move_to_hue_l2',
                'move_to_hue_l3',
                'move_to_hue_l4',
            ]),
        ],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
    },
    {
        zigbeeModel: ['4512705'],
        model: '4512705',
        vendor: 'Namron',
        description: 'Zigbee 4 channel remote control',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop, fz.command_recall],
        toZigbee: [],
        ota: true,
        exposes: [
            e.battery(),
            e.action([
                'on_l1',
                'off_l1',
                'brightness_move_up_l1',
                'brightness_move_down_l1',
                'brightness_stop_l1',
                'on_l2',
                'off_l2',
                'brightness_move_up_l2',
                'brightness_move_down_l2',
                'brightness_stop_l2',
                'on_l3',
                'off_l3',
                'brightness_move_up_l3',
                'brightness_move_down_l3',
                'brightness_stop_l3',
                'on_l4',
                'off_l4',
                'brightness_move_up_l4',
                'brightness_move_down_l4',
                'brightness_stop_l4',
                'recall_*',
            ]),
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
    },
    {
        zigbeeModel: ['3802960'],
        model: '3802960',
        vendor: 'Namron',
        description: 'LED 9W DIM E27',
        extend: [m.light()],
    },
    {
        zigbeeModel: ['3802961'],
        model: '3802961',
        vendor: 'Namron',
        description: 'LED 9W CCT E27',
        extend: [m.light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['3802962'],
        model: '3802962',
        vendor: 'Namron',
        description: 'LED 9W RGBW E27',
        extend: [m.light({colorTemp: {range: undefined}, color: true, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['3802963'],
        model: '3802963',
        vendor: 'Namron',
        description: 'LED 5,3W DIM E14',
        extend: [m.light()],
    },
    {
        zigbeeModel: ['3802964'],
        model: '3802964',
        vendor: 'Namron',
        description: 'LED 5,3W CCT E14',
        extend: [m.light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['3802965'],
        model: '3802965',
        vendor: 'Namron',
        description: 'LED 4,8W DIM GU10',
        extend: [m.light()],
    },
    {
        zigbeeModel: ['3802966'],
        model: '3802966',
        vendor: 'Namron',
        description: 'LED 4.8W CCT GU10',
        extend: [m.light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['89665'],
        model: '89665',
        vendor: 'Namron',
        description: 'LED Strip RGB+W (5m) IP20',
        extend: [m.light({colorTemp: {range: undefined}, color: true, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['4512737', '4512738'],
        model: '4512737/4512738',
        vendor: 'Namron',
        description: 'Touch thermostat',
        fromZigbee: [fz.thermostat, fz.namron_thermostat, fz.metering, fz.electrical_measurement, fz.namron_hvac_user_interface],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_occupancy,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_local_temperature,
            tz.thermostat_outdoor_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_running_state,
            tz.namron_thermostat_child_lock,
            tz.namron_thermostat,
        ],
        exposes: [
            e.local_temperature(),
            e.numeric('outdoor_temperature', ea.STATE_GET).withUnit('°C').withDescription('Current temperature measured from the floor sensor'),
            e
                .climate()
                .withSetpoint('occupied_heating_setpoint', 0, 40, 0.1)
                .withLocalTemperature()
                .withLocalTemperatureCalibration(-3, 3, 0.1)
                .withSystemMode(['off', 'auto', 'dry', 'heat'])
                .withRunningState(['idle', 'heat']),
            e.binary('away_mode', ea.ALL, 'ON', 'OFF').withDescription('Enable/disable away mode'),
            e.binary('child_lock', ea.ALL, 'LOCK', 'UNLOCK').withDescription('Enables/disables physical input on the device'),
            e.power(),
            e.current(),
            e.voltage(),
            e.energy(),
            e.enum('lcd_brightness', ea.ALL, ['low', 'mid', 'high']).withDescription('OLED brightness when operating the buttons.  Default: Medium.'),
            e.enum('button_vibration_level', ea.ALL, ['off', 'low', 'high']).withDescription('Key beep volume and vibration level.  Default: Low.'),
            e
                .enum('floor_sensor_type', ea.ALL, ['10k', '15k', '50k', '100k', '12k'])
                .withDescription('Type of the external floor sensor.  Default: NTC 10K/25.'),
            e.enum('sensor', ea.ALL, ['air', 'floor', 'both']).withDescription('The sensor used for heat control.  Default: Room Sensor.'),
            e.enum('powerup_status', ea.ALL, ['default', 'last_status']).withDescription('The mode after a power reset.  Default: Previous Mode.'),
            e
                .numeric('floor_sensor_calibration', ea.ALL)
                .withUnit('°C')
                .withValueMin(-3)
                .withValueMax(3)
                .withValueStep(0.1)
                .withDescription('The tempearatue calibration for the external floor sensor, between -3 and 3 in 0.1°C.  Default: 0.'),
            e
                .numeric('dry_time', ea.ALL)
                .withUnit('min')
                .withValueMin(5)
                .withValueMax(100)
                .withDescription('The duration of Dry Mode, between 5 and 100 minutes.  Default: 5.'),
            e.enum('mode_after_dry', ea.ALL, ['off', 'manual', 'auto', 'away']).withDescription('The mode after Dry Mode.  Default: Auto.'),
            e.enum('temperature_display', ea.ALL, ['room', 'floor']).withDescription('The temperature on the display.  Default: Room Temperature.'),
            e
                .numeric('window_open_check', ea.ALL)
                .withUnit('°C')
                .withValueMin(0)
                .withValueMax(4)
                .withValueStep(0.5)
                .withDescription('The threshold to detect window open, between 1.5 and 4 in 0.5 °C.  Default: 0 (disabled).'),
            e
                .numeric('hysterersis', ea.ALL)
                .withUnit('°C')
                .withValueMin(0.5)
                .withValueMax(5)
                .withValueStep(0.1)
                .withDescription('Hysteresis setting, between 0.5 and 5 in 0.1 °C.  Default: 0.5.'),
            e.enum('display_auto_off_enabled', ea.ALL, ['enabled', 'disabled']),
            e
                .numeric('alarm_airtemp_overvalue', ea.ALL)
                .withUnit('°C')
                .withValueMin(0)
                .withValueMax(35)
                .withDescription(
                    'Floor temperature over heating threshold, range is 0-35, unit is 1ºC, ' +
                        '0 means this function is disabled, default value is 27.',
                ),
        ],
        onEvent: async (type, data, device, options) => {
            const endpoint = device.getEndpoint(1);
            if (type === 'stop') {
                clearInterval(globalStore.getValue(device, 'time'));
                globalStore.clearValue(device, 'time');
            } else if (!globalStore.hasValue(device, 'time')) {
                const hours24 = 1000 * 60 * 60 * 24;
                const interval = setInterval(async () => {
                    try {
                        // Device does not asks for the time with binding, therefore we write the time every 24 hours
                        const time = Math.round((new Date().getTime() - constants.OneJanuary2000) / 1000 + new Date().getTimezoneOffset() * -1 * 60);
                        const values = {time: time};
                        await endpoint.write('genTime', values);
                    } catch {
                        /* Do nothing*/
                    }
                }, hours24);
                globalStore.putValue(device, 'time', interval);
            }
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic',
                'genIdentify',
                'hvacThermostat',
                'seMetering',
                'haElectricalMeasurement',
                'genAlarms',
                'msOccupancySensing',
                'genTime',
                'hvacUserInterfaceCfg',
            ];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // standard ZCL attributes
            await reporting.thermostatTemperature(endpoint, {min: 0, change: 50});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);

            // Metering
            await endpoint.read('haElectricalMeasurement', ['acVoltageMultiplier', 'acVoltageDivisor', 'acCurrentMultiplier']);
            await endpoint.read('haElectricalMeasurement', ['acCurrentDivisor']);
            await reporting.rmsVoltage(endpoint, {min: 10, change: 20}); // Voltage - Min change of 2v
            await reporting.rmsCurrent(endpoint, {min: 10, change: 10}); // A - z2m displays only the first decimals, so change of 10 (0,01)
            await reporting.activePower(endpoint, {min: 10, change: 15}); // W - Min change of 1,5W
            await reporting.currentSummDelivered(endpoint, {min: 300}); // Report KWH every 5min
            await reporting.readMeteringMultiplierDivisor(endpoint);

            // OperateDisplayLcdBrightnesss
            await endpoint.configureReporting(
                'hvacThermostat',
                [
                    {
                        attribute: {ID: 0x1000, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // ButtonVibrationLevel
            await endpoint.configureReporting(
                'hvacThermostat',
                [
                    {
                        attribute: {ID: 0x1001, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // FloorSensorType
            await endpoint.configureReporting(
                'hvacThermostat',
                [
                    {
                        attribute: {ID: 0x1002, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // ControlType
            await endpoint.configureReporting(
                'hvacThermostat',
                [
                    {
                        attribute: {ID: 0x1003, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // PowerUpStatus
            await endpoint.configureReporting(
                'hvacThermostat',
                [
                    {
                        attribute: {ID: 0x1004, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // FloorSensorCalibration
            await endpoint.configureReporting(
                'hvacThermostat',
                [
                    {
                        attribute: {ID: 0x1005, type: 0x28},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 0,
                    },
                ],
                sunricherManufacturer,
            );
            // DryTime
            await endpoint.configureReporting(
                'hvacThermostat',
                [
                    {
                        attribute: {ID: 0x1006, type: 0x20},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 0,
                    },
                ],
                sunricherManufacturer,
            );
            // ModeAfterDry
            await endpoint.configureReporting(
                'hvacThermostat',
                [
                    {
                        attribute: {ID: 0x1007, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // TemperatureDisplay
            await endpoint.configureReporting(
                'hvacThermostat',
                [
                    {
                        attribute: {ID: 0x1008, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // WindowOpenCheck
            await endpoint.configureReporting(
                'hvacThermostat',
                [
                    {
                        attribute: {ID: 0x1009, type: 0x20},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 0,
                    },
                ],
                sunricherManufacturer,
            );

            // Hysterersis
            await endpoint.configureReporting(
                'hvacThermostat',
                [
                    {
                        attribute: {ID: 0x100a, type: 0x20},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 0,
                    },
                ],
                sunricherManufacturer,
            );
            // DisplayAutoOffEnable
            await endpoint.configureReporting(
                'hvacThermostat',
                [
                    {
                        attribute: {ID: 0x100b, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );

            // AlarmAirTempOverValue
            await endpoint.configureReporting(
                'hvacThermostat',
                [
                    {
                        attribute: {ID: 0x2001, type: 0x20},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: 0,
                    },
                ],
                sunricherManufacturer,
            );
            // Away Mode Set
            await endpoint.configureReporting(
                'hvacThermostat',
                [
                    {
                        attribute: {ID: 0x2002, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );

            // Trigger initial read
            await endpoint.read('hvacThermostat', ['systemMode', 'runningState', 'occupiedHeatingSetpoint']);
            await endpoint.read('hvacThermostat', [0x1000, 0x1001, 0x1002, 0x1003], sunricherManufacturer);
            await endpoint.read('hvacThermostat', [0x1004, 0x1005, 0x1006, 0x1007], sunricherManufacturer);
            await endpoint.read('hvacThermostat', [0x1008, 0x1009, 0x100a, 0x100b], sunricherManufacturer);
            await endpoint.read('hvacThermostat', [0x2001, 0x2002], sunricherManufacturer);
        },
        ota: true,
    },
    {
        zigbeeModel: ['4512735'],
        model: '4512735',
        vendor: 'Namron',
        description: 'Multiprise with 4 AC outlets and 2 USB super charging ports (16A)',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        exposes: [
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'),
            e.switch().withEndpoint('l5'),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            for (const ID of [1, 2, 3, 4, 5]) {
                const endpoint = device.getEndpoint(ID);
                await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            }
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['5401392', '5401396', '5401393', '5401397', '5401394', '5401398', '5401395', '5401399', '5401395'],
        model: '540139X',
        vendor: 'Namron',
        description: 'Panel heater 400/600/800/1000 W',
        ota: true,
        fromZigbee: [fz.thermostat, fz.metering, fz.electrical_measurement, fzLocal.namron_panelheater, fz.namron_hvac_user_interface],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_local_temperature,
            tzLocal.namron_panelheater,
            tz.namron_thermostat_child_lock,
        ],
        exposes: [
            e.power(),
            e.current(),
            e.voltage(),
            e.energy(),
            e
                .climate()
                .withSetpoint('occupied_heating_setpoint', 5, 35, 0.5)
                .withLocalTemperature()
                // Unit also supports Auto, but i haven't added support the scheduler yet
                // so the function is not listed for now, as this doesn´t allow you the set the temperature
                .withSystemMode(['off', 'heat'])
                .withLocalTemperatureCalibration(-3, 3, 0.1)
                .withRunningState(['idle', 'heat']),
            // Namron proprietary stuff
            e.binary('child_lock', ea.ALL, 'LOCK', 'UNLOCK').withDescription('Enables/disables physical input on the device'),
            e
                .numeric('hysterersis', ea.ALL)
                .withUnit('°C')
                .withValueMin(0.5)
                .withValueMax(2)
                .withValueStep(0.1)
                .withDescription('Hysteresis setting, default: 0.5'),
            e
                .numeric('display_brightnesss', ea.ALL)
                .withValueMin(1)
                .withValueMax(7)
                .withValueStep(1)
                .withDescription('Adjust brightness of display values 1(Low)-7(High)'),
            e.enum('display_auto_off', ea.ALL, ['deactivated', 'activated']).withDescription('Enable / Disable display auto off'),
            e
                .enum('power_up_status', ea.ALL, ['manual', 'last_state'])
                .withDescription('The mode after a power reset.  Default: Previous Mode. See instructions for information about manual'),
            e.enum('window_open_check', ea.ALL, ['enable', 'disable']).withDescription('Turn on/off window check mode'),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic',
                'genIdentify',
                'hvacThermostat',
                'seMetering',
                'haElectricalMeasurement',
                'genAlarms',
                'genTime',
                'hvacUserInterfaceCfg',
            ];

            // Reporting

            // Metering
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.rmsVoltage(endpoint, {min: 10, change: 20}); // Voltage - Min change of 2v
            await reporting.rmsCurrent(endpoint, {min: 10, change: 10}); // A - z2m displays only the first decimals, so change of 10 (0,01)
            await reporting.activePower(endpoint, {min: 10, change: 15}); // W - Min change of 1,5W
            await reporting.currentSummDelivered(endpoint, {min: 300}); // Report KWH every 5min

            // Thermostat reporting
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);
            // LocalTemp is spammy, reports 0.01C diff by default, min change is now 0.5C
            await reporting.thermostatTemperature(endpoint, {min: 0, change: 50});

            // display_brightnesss
            await endpoint.configureReporting(
                'hvacThermostat',
                [
                    {
                        attribute: {ID: 0x1000, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // display_auto_off
            await endpoint.configureReporting(
                'hvacThermostat',
                [
                    {
                        attribute: {ID: 0x1001, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // power_up_status
            await endpoint.configureReporting(
                'hvacThermostat',
                [
                    {
                        attribute: {ID: 0x1004, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // window_open_check
            await endpoint.configureReporting(
                'hvacThermostat',
                [
                    {
                        attribute: {ID: 0x1009, type: 0x30},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );
            // hysterersis
            await endpoint.configureReporting(
                'hvacThermostat',
                [
                    {
                        attribute: {ID: 0x100a, type: 0x20},
                        minimumReportInterval: 0,
                        maximumReportInterval: constants.repInterval.HOUR,
                        reportableChange: null,
                    },
                ],
                sunricherManufacturer,
            );

            await endpoint.read('hvacThermostat', ['systemMode', 'runningState', 'occupiedHeatingSetpoint']);
            await endpoint.read('hvacUserInterfaceCfg', ['keypadLockout']);
            await endpoint.read('hvacThermostat', [0x1000, 0x1001, 0x1004, 0x1009, 0x100a], sunricherManufacturer);

            await reporting.bind(endpoint, coordinatorEndpoint, binds);
        },
    },
    {
        zigbeeModel: ['3802968'],
        model: '3802968',
        vendor: 'Namron',
        description: 'LED Filament Flex 5W CCT E27 Clear',
        extend: [m.light({colorTemp: {range: [153, 555]}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['4512749'],
        model: '4512749',
        vendor: 'Namron',
        description: 'Thermostat outlet socket',
        fromZigbee: [fz.metering, fz.electrical_measurement, fz.on_off, fz.temperature],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [e.temperature(), e.power(), e.current(), e.voltage(), e.switch(), e.power_on_behavior()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'msTemperatureMeasurement']);
            await endpoint.read('haElectricalMeasurement', ['acVoltageMultiplier', 'acVoltageDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acCurrentMultiplier', 'acCurrentDivisor']);
            await reporting.onOff(endpoint);
            await reporting.temperature(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: ['4512749-N'],
        model: '4512749-N',
        vendor: 'Namron',
        description: 'Thermostat outlet socket',
        fromZigbee: [fz.metering, fz.electrical_measurement, fz.on_off, fz.temperature],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [e.temperature(), e.power(), e.current(), e.voltage(), e.switch(), e.power_on_behavior()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'msTemperatureMeasurement']);
            await endpoint.read('haElectricalMeasurement', ['acVoltageMultiplier', 'acVoltageDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acCurrentMultiplier', 'acCurrentDivisor']);
            await reporting.onOff(endpoint);
            await reporting.temperature(endpoint, {min: 10, change: 10});
            await reporting.rmsVoltage(endpoint, {min: 10, change: 20}); // Voltage - Min change of 2v
            await reporting.rmsCurrent(endpoint, {min: 10, change: 10}); // A - z2m displays only the first decimals, so change of 10
            await reporting.activePower(endpoint, {min: 10, change: 1}); // W - Min change of 0,1W
        },
    },
    {
        zigbeeModel: ['4512747'],
        model: '4512747',
        vendor: 'Namron',
        description: 'Curtain motor controller',
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
    {
        zigbeeModel: ['4512758'],
        model: '4512758',
        vendor: 'Namron',
        description: 'Zigbee thermostat 16A',
        fromZigbee: [fzLocal.namron_thermostat2, fz.metering, fz.electrical_measurement, fz.namron_hvac_user_interface],
        toZigbee: [
            {
                // map running *mode* to *state*, as that's what used
                // in homeAssistant climate ui card (red background)
                key: ['running_state'],
                convertGet: async (entity, key, meta) => {
                    await entity.read('hvacThermostat', ['runningMode']);
                },
            },
            tz.thermostat_local_temperature,
            tz.thermostat_min_heat_setpoint_limit,
            tz.thermostat_max_heat_setpoint_limit,
            // tz.thermostat_min_cool_setpoint_limit,
            // tz.thermostat_max_cool_setpoint_limit,
            // tz.thermostat_pi_heating_demand,
            tz.thermostat_local_temperature_calibration,
            // tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_system_mode,
            tz.thermostat_running_mode,
            tz.namron_thermostat_child_lock,
        ],
        extend: [
            m.onOff({powerOnBehavior: false}),
            m.electricityMeter({voltage: false}),
            m.binary({
                name: 'away_mode',
                valueOn: ['ON', 1],
                valueOff: ['OFF', 0],
                cluster: 'hvacThermostat',
                attribute: {ID: 0x8001, type: Zcl.DataType.BOOLEAN},
                description: 'Enable or Disable Away/Anti-freeze mode',
            }),
            m.binary({
                name: 'window_open_check',
                valueOn: ['ON', 1],
                valueOff: ['OFF', 0],
                cluster: 'hvacThermostat',
                attribute: {ID: 0x8000, type: Zcl.DataType.BOOLEAN},
                description: 'Enable or Disable open window detection',
                entityCategory: 'config',
            }),
            m.binary({
                name: 'window_open',
                valueOn: ['ON', 1],
                valueOff: ['OFF', 0],
                cluster: 'hvacThermostat',
                attribute: {ID: 0x8002, type: Zcl.DataType.BOOLEAN},
                description: 'On if window is currently detected as open',
            }),

            m.numeric({
                name: 'backlight_level',
                unit: '%',
                valueMin: 0,
                valueMax: 100,
                valueStep: 10,
                cluster: 'hvacThermostat',
                attribute: {ID: 0x8005, type: Zcl.DataType.UINT8},
                description: 'Brightness of the display',
                entityCategory: 'config',
            }),
            m.binary({
                name: 'backlight_onoff',
                valueOn: ['ON', 1],
                valueOff: ['OFF', 0],
                cluster: 'hvacThermostat',
                attribute: {ID: 0x8009, type: Zcl.DataType.BOOLEAN},
                description: 'Enable or Disable display light',
                entityCategory: 'config',
            }),

            m.enumLookup({
                name: 'sensor_mode',
                lookup: {air: 0, floor: 1, both: 2, percent: 6},
                cluster: 'hvacThermostat',
                attribute: {ID: 0x8004, type: Zcl.DataType.ENUM8},
                description: 'Select which sensor the thermostat uses to control the room',
                entityCategory: 'config',
            }),
        ],
        exposes: [
            // FUTURE: could maybe translate to a common cooling/heating setpoint depending on the mode
            // and state.. HomeAssistant climate widget doesn't play nice with two setpoints.
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint('occupied_heating_setpoint', 0, 40, 0.5)
                //.withSetpoint('occupied_cooling_setpoint', 0, 40, 0.5)
                .withLocalTemperatureCalibration(-10, 10, 1)
                //.withSystemMode(['off', 'auto', 'cool', 'heat'])
                .withSystemMode(['off', 'heat'])
                //.withRunningMode(['off', 'cool','heat'])
                .withRunningState(['idle', 'cool', 'heat']),
            //.withPiHeatingDemand()
            e.binary('child_lock', ea.ALL, 'LOCK', 'UNLOCK').withDescription('Enables/disables physical input on the device'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genIdentify', 'hvacThermostat', 'seMetering', 'haElectricalMeasurement', 'genAlarms', 'hvacUserInterfaceCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            await reporting.thermostatTemperature(endpoint, {min: 0, change: 50});
            // await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);

            // Trigger initial read
            await endpoint.read('hvacThermostat', ['systemMode', 'runningMode', 'occupiedHeatingSetpoint']);
            await endpoint.read('hvacThermostat', [0x8000, 0x8001, 0x8002, 0x8004]);

            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['4512762'],
        model: '4512762',
        vendor: 'Namron',
        description: 'Zigbee Door Sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ias_contact_alarm_1_report],
        toZigbee: [],
        exposes: [e.contact(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['4512763'],
        model: '4512763',
        vendor: 'Namron',
        description: 'Zigbee movement sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy()],
    },
    {
        zigbeeModel: ['4512764'],
        model: '4512764',
        vendor: 'Namron',
        description: 'Zigbee water leak sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.battery_low(), e.water_leak(), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['4512765'],
        model: '4512765',
        vendor: 'Namron',
        description: 'Zigbee humidity and temperature Sensor',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity()],
    },
    {
        zigbeeModel: ['4512750', '4512751'],
        model: '4512750',
        vendor: 'Namron',
        description: 'Zigbee dimmer 2.0',
        ota: true,
        extend: [m.light({configureReporting: true})],
        whiteLabel: [{vendor: 'Namron', model: '4512751', description: 'Zigbee dimmer 2.0', fingerprint: [{modelID: '4512751'}]}],
    },
    {
        zigbeeModel: ['4512772', '4512773'],
        model: '4512773',
        vendor: 'Namron',
        description: 'Zigbee 8 channel switch black',
        whiteLabel: [{vendor: 'Namron', model: '4512772', description: 'Zigbee 8 channel switch white', fingerprint: [{modelID: '4512772'}]}],
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_move, fz.command_stop],
        toZigbee: [],
        meta: {multiEndpoint: true},
        exposes: [
            e.battery(),
            e.action([
                'on_l1',
                'off_l1',
                'brightness_move_up_l1',
                'brightness_move_down_l1',
                'brightness_stop_l1',
                'on_l2',
                'off_l2',
                'brightness_move_up_l2',
                'brightness_move_down_l2',
                'brightness_stop_l2',
                'on_l3',
                'off_l3',
                'brightness_move_up_l3',
                'brightness_move_down_l3',
                'brightness_stop_l3',
                'on_l4',
                'off_l4',
                'brightness_move_up_l4',
                'brightness_move_down_l4',
                'brightness_stop_l4',
            ]),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
        ota: true,
    },
    {
        zigbeeModel: ['4512768'],
        model: '4512768',
        vendor: 'Namron',
        description: 'Zigbee 2 channel switch',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior, fz.ignore_genOta],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            e.power_on_behavior(['off', 'on', 'previous']),
            e.energy(),
            e.numeric('voltage_l1', ea.STATE).withUnit('V').withDescription('Phase 1 voltage'),
            e.numeric('voltage_l2', ea.STATE).withUnit('V').withDescription('Phase 2 voltage'),
            e.numeric('current_l1', ea.STATE).withUnit('A').withDescription('Phase 1 current'),
            e.numeric('current_l2', ea.STATE).withUnit('A').withDescription('Phase 2 current'),
            e.numeric('power_l1', ea.STATE).withUnit('W').withDescription('Phase 1 power'),
            e.numeric('power_l2', ea.STATE).withUnit('W').withDescription('Phase 2 power'),
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        meta: {multiEndpoint: true, publishDuplicateTransaction: true, multiEndpointSkip: ['power', 'energy']},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            await reporting.onOff(endpoint2);
            await reporting.currentSummDelivered(endpoint1);
        },
    },
    {
        zigbeeModel: ['4512761'],
        model: '4512761',
        vendor: 'Namron',
        description: 'Zigbee relais 16A',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.power_on_behavior()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.onOff(endpoint);
        },
        ota: true,
    },
    {
        zigbeeModel: ['4512770', '4512771'],
        model: '4512770',
        vendor: 'Namron',
        description: 'Zigbee multisensor (white)',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery(), e.battery_voltage(), e.temperature(), e.humidity()],
        whiteLabel: [{vendor: 'Namron', model: '4512771', description: 'Zigbee multisensor (black)', fingerprint: [{modelID: '4512771'}]}],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint3 = device.getEndpoint(3);
            const endpoint4 = device.getEndpoint(4);
            await reporting.bind(endpoint3, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.bind(endpoint4, coordinatorEndpoint, ['msRelativeHumidity']);
        },
        extend: [m.illuminance()],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE204_p3lqqy2r']),
        model: '4512752/4512753',
        vendor: 'Namron',
        description: 'Touch thermostat 16A 2.0',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        onEvent: tuya.onEventSetTime,
        configure: tuya.configureMagicPacket,
        options: [],
        exposes: [
            e
                .enum('mode', ea.STATE_SET, ['regulator', 'thermostat'])
                .withDescription(
                    'Controls how the operating mode of the device. Possible values:' +
                        ' regulator (open-loop controller), thermostat (control with target temperature)',
                ),
            e
                .enum('regulator_period', ea.STATE_SET, ['15min', '30min', '45min', '60min', '90min'])
                .withLabel('Regulator cycle duration')
                .withDescription('Regulator cycle duration. Not applicable when in thermostat mode.'),
            e
                .numeric('regulator_set_point', ea.STATE_SET)
                .withUnit('%')
                .withDescription('Desired heating set point (%) when in regulator mode.')
                .withValueMin(0)
                .withValueMax(95),
            e
                .climate()
                .withSystemMode(['off', 'heat'], ea.STATE_SET, 'Whether the thermostat is turned on or off')
                .withPreset(['manual', 'home', 'away'])
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-9, 9, 1, ea.STATE_SET)
                .withRunningState(['idle', 'heat'], ea.STATE)
                .withSetpoint('current_heating_setpoint', 5, 35, 1, ea.STATE_SET),
            e.current(),
            e.power(),
            e.energy(),
            e.voltage(),
            e.temperature_sensor_select(['air_sensor', 'floor_sensor', 'both']),
            e
                .numeric('local_temperature', ea.STATE)
                .withUnit('°C')
                .withDescription('Current temperature measured with internal sensor')
                .withValueStep(1),
            e
                .numeric('local_temperature_floor', ea.STATE)
                .withUnit('°C')
                .withDescription('Current temperature measured on the external sensor (floor)')
                .withValueStep(1),
            e.child_lock(),
            e.window_detection().withLabel('Open window detection'),
            e
                .numeric('hysteresis', ea.STATE_SET)
                .withUnit('°C')
                .withDescription(
                    'The offset from the target temperature in which the temperature has to ' +
                        'change for the heating state to change. This is to prevent erratically turning on/off ' +
                        'when the temperature is close to the target.',
                )
                .withValueMin(1)
                .withValueMax(9)
                .withValueStep(1),
            e
                .numeric('max_temperature_protection', ea.STATE_SET)
                .withUnit('°C')
                .withDescription('Max guarding temperature')
                .withValueMin(20)
                .withValueMax(95)
                .withValueStep(1),
        ],
        meta: {
            tuyaDatapoints: [
                [1, 'system_mode', tuya.valueConverterBasic.lookup({off: false, heat: true})],
                [2, 'preset', tuya.valueConverterBasic.lookup({manual: tuya.enum(0), home: tuya.enum(1), away: tuya.enum(2)})],
                [16, 'current_heating_setpoint', tuya.valueConverter.raw],
                [24, 'local_temperature', tuya.valueConverter.raw],
                [28, 'local_temperature_calibration', tuya.valueConverter.localTempCalibration2],
                [30, 'child_lock', tuya.valueConverter.lockUnlock],
                [101, 'local_temperature_floor', tuya.valueConverter.raw],
                [102, 'sensor', tuya.valueConverterBasic.lookup({air_sensor: tuya.enum(0), floor_sensor: tuya.enum(1), both: tuya.enum(2)})],
                [103, 'hysteresis', tuya.valueConverter.raw],
                [104, 'running_state', tuya.valueConverterBasic.lookup({idle: false, heat: true})],
                [106, 'window_detection', tuya.valueConverter.onOff],
                [107, 'max_temperature_protection', tuya.valueConverter.raw],
                [108, 'mode', tuya.valueConverterBasic.lookup({regulator: tuya.enum(0), thermostat: tuya.enum(1)})],
                [
                    109,
                    'regulator_period',
                    tuya.valueConverterBasic.lookup({
                        '15min': tuya.enum(0),
                        '30min': tuya.enum(1),
                        '45min': tuya.enum(2),
                        '60min': tuya.enum(3),
                        '90min': tuya.enum(4),
                    }),
                ],
                [110, 'regulator_set_point', tuya.valueConverter.raw],
                [120, 'current', tuya.valueConverter.divideBy10],
                [121, 'voltage', tuya.valueConverter.raw],
                [122, 'power', tuya.valueConverter.raw],
                [123, 'energy', tuya.valueConverter.divideBy100],
            ],
        },
    },
    {
        zigbeeModel: ['4512782', '4512781'],
        model: '4512782',
        vendor: 'Namron',
        description: 'Rotary dimmer with screen',
        extend: [
            m.light({effect: false, configureReporting: true, powerOnBehavior: false}),
            m.electricityMeter({voltage: false, current: false, configureReporting: true}),
        ],
        meta: {},
    },
    {
        zigbeeModel: ['4512788'],
        model: '4512788',
        vendor: 'Namron',
        description: 'Zigbee smart plug dimmer 150W',
        extend: [m.light(), m.electricityMeter({cluster: 'electrical'})],
    },
    {
        zigbeeModel: ['4512783', '4512784'],
        model: 'Edge Thermostat',
        vendor: 'Namron',
        description: 'Namron Zigbee Edge Termostat',
        fromZigbee: [fzLocal.namron_edge_thermostat, fz.thermostat, fz.namron_hvac_user_interface, fz.metering, fz.electrical_measurement],
        toZigbee: [
            tz.thermostat_local_temperature,
            tzLocal.namron_edge_thermostat,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.namron_thermostat_child_lock,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_programming_operation_mode,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_running_state,
            tz.thermostat_running_mode,
        ],
        onEvent: async (type, data, device, options) => {
            if (type === 'stop') {
                try {
                    const key = namronPrivateHvacThermostat.time_sync_value.key;
                    clearInterval(globalStore.getValue(device, key));
                    globalStore.clearValue(device, key);
                } catch {
                    /* Do nothing*/
                }
            }
            if (!globalStore.hasValue(device, namronPrivateHvacThermostat.time_sync_value.key)) {
                const hours24 = 1000 * 60 * 60 * 24;
                const interval = setInterval(async () => {
                    try {
                        const endpoint = device.getEndpoint(1);
                        // Device does not asks for the time with binding, therefore we write the time every 24 hours
                        const time = new Date().getTime() / 1000;
                        await endpoint.write('hvacThermostat', {
                            [namronPrivateHvacThermostat.time_sync_value.attrId]: {
                                value: time,
                                type: namronPrivateHvacThermostat.time_sync_value.type,
                            },
                        });
                    } catch {
                        /* Do nothing*/
                    }
                }, hours24);
                globalStore.putValue(device, namronPrivateHvacThermostat.time_sync_value.key, interval);
            }
        },
        configure: async (device, coordinatorEndpoint, _logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic',
                'genIdentify',
                'genOnOff',
                'hvacThermostat',
                'hvacUserInterfaceCfg',
                'msRelativeHumidity',
                'seMetering',
                'haElectricalMeasurement',
                'msOccupancySensing',
            ];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 0, change: 50});
            await reporting.thermostatTemperature(endpoint, {min: 0, change: 50});
            await reporting.thermostatKeypadLockMode(endpoint);

            // Initial read
            await endpoint.read('hvacThermostat', [0x8000, 0x8001, 0x8002, 0x801e, 0x8004, 0x8006, 0x8005, 0x8029, 0x8022, 0x8023, 0x8024]);

            // Reads holiday
            await endpoint.read('hvacThermostat', [
                namronPrivateHvacThermostat.holiday_temp_set.attrId,
                namronPrivateHvacThermostat.holiday_temp_set_f.attrId,
                namronPrivateHvacThermostat.vacation_mode.attrId,
                namronPrivateHvacThermostat.vacation_start_date.attrId,
                namronPrivateHvacThermostat.vacation_end_date.attrId,
            ]);

            device.powerSource = 'Mains (single phase)';
            device.save();
        },
        extend: [m.electricityMeter({voltage: false}), m.onOff({powerOnBehavior: false})],
        exposes: [
            e
                .climate()
                .withLocalTemperature()
                .withSetpoint('occupied_heating_setpoint', 15, 35, 0.5)
                .withSystemMode(['off', 'auto', 'cool', 'heat'], ea.ALL)
                .withLocalTemperatureCalibration(-3, 3, 0.1)
                .withRunningState(['idle', 'heat']),
            e.enum('temperature_display_mode', ea.ALL, ['celsius', 'fahrenheit']).withLabel('Temperature Unit').withDescription('Select Unit'),
            e.enum('current_operating_mode', ea.ALL, ['Manual', 'ECO']).withDescription('Selected program for thermostat'),
            e.binary('child_lock', ea.ALL, 'LOCK', 'UNLOCK').withDescription('Enables/disables physical input on the device'),
            e
                .numeric(namronPrivateHvacThermostat.activeBacklight.key, ea.ALL)
                .withDescription('Desired display brightness')
                .withUnit('%')
                .withValueMin(1)
                .withValueMax(100),
            e
                .enum(namronPrivateHvacThermostat.displayAutoOff.key, ea.ALL, Object.values(fzNamronDisplayTimeout))
                .withDescription('Turn off the display after the give time in inactivity or never'),
            e.binary(namronPrivateHvacThermostat.windowCheck.key, ea.ALL, 'On', 'Off').withDescription('Turn on/off window check mode'),
            e
                .enum(namronPrivateHvacThermostat.windowState.key, ea.STATE_GET, Object.values(fzNamronOpenClose))
                .withDescription('Detected state of window'),
            e.binary(namronPrivateHvacThermostat.antiFrostMode.key, ea.ALL, 'On', 'Off').withDescription('Turn on/off anti-frost mode'),
            e.binary(namronPrivateHvacThermostat.summerWinterSwitch.key, ea.ALL, 'On', 'Off').withDescription('Turn on/off Summar Winter switch'),
            e.binary(namronPrivateHvacThermostat.autoTime.key, ea.ALL, 'On', 'Off').withDescription('Turn on/off Automatic time'),
            e
                .enum(namronPrivateHvacThermostat.countdownSet.key, ea.ALL, Object.values(fzNamronBoostTable))
                .withDescription('Starts boost with defined time'),
            e.numeric(namronPrivateHvacThermostat.countdownLeft.key, ea.STATE_GET).withUnit('min').withDescription('Given boost time'),
            e.binary(namronPrivateHvacThermostat.vacationMode.key, ea.ALL, 'On', 'Off').withDescription('Turn on/off vacation mode'),
            e
                .numeric(namronPrivateHvacThermostat.holidayTempSet.key, ea.ALL)
                .withValueMin(5)
                .withValueMax(35)
                .withValueStep(0.5)
                .withUnit('°C')
                .withLabel('Vacation temperature')
                .withDescription('Vacation temperature setpoint'),
            e
                .text(namronPrivateHvacThermostat.vacationStartDate.key, ea.ALL)
                .withDescription('Start date')
                .withDescription("Supports dates starting with day or year with '. - /'"),
            e
                .text(namronPrivateHvacThermostat.vacationEndDate.key, ea.ALL)
                .withDescription('End date')
                .withDescription("Supports dates starting with day or year with '. - /'"),
            e.binary(namronPrivateHvacThermostat.timeSyncFlag.key, ea.ALL, 'On', 'Off'),
            e.numeric(namronPrivateHvacThermostat.timeSyncValue.key, ea.STATE_GET),
            e
                .enum(namronPrivateHvacThermostat.fault.key, ea.STATE_GET, Object.values(fzNamronFault))
                .withDescription('Shows current error of the device'),
            e
                .enum(namronPrivateHvacThermostat.workDays.key, ea.STATE_GET, Object.values(fzNamronWorkDays))
                .withDescription("Needs to be changed under 'Thermostat settings' > 'Advanced settings' > 'Schedule type'"),
            e.numeric(namronPrivateHvacThermostat.regulatorPercentage.key, ea.ALL).withUnit('%').withValueMin(10).withValueMax(100).withValueStep(1),
        ],
    },
];

export default definitions;
module.exports = definitions;
