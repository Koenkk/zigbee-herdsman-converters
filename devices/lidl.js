const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require('../lib/tuya');
const globalStore = require('../lib/store');

const tuyaLocal = {
    dataPoints: {
        zsHeatingSetpoint: 16,
        zsChildLock: 40,
        zsTempCalibration: 104,
        zsLocalTemp: 24,
        zsBatteryVoltage: 35,
        zsComfortTemp: 101,
        zsEcoTemp: 102,
        zsHeatingSetpointAuto: 105,
        zsOpenwindowTemp: 116,
        zsOpenwindowTime: 117,
        zsErrorStatus: 45,
        zsMode: 2,
        zsAwaySetting: 103,
        zsBinaryOne: 106,
        zsBinaryTwo: 107,
        zsScheduleMonday: 109,
        zsScheduleTuesday: 110,
        zsScheduleWednesday: 111,
        zsScheduleThursday: 112,
        zsScheduleFriday: 113,
        zsScheduleSaturday: 114,
        zsScheduleSunday: 115,
    },
};

const fzLocal = {
    zs_thermostat: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = tuya.firstDpValue(msg, meta, 'zs_thermostat');
            const dp = dpValue.dp;
            const value = tuya.getDataValue(dpValue);
            const ret = {};
            const daysMap = {1: 'monday', 2: 'tuesday', 3: 'wednesday', 4: 'thursday', 5: 'friday', 6: 'saturday', 7: 'sunday'};
            const day = daysMap[value[0]];

            switch (dp) {
            case tuyaLocal.dataPoints.zsChildLock:
                return {child_lock: value ? 'LOCK' : 'UNLOCK'};

            case tuyaLocal.dataPoints.zsHeatingSetpoint:
                if (value==0) ret.system_mode='off';
                if (value==60) {
                    ret.system_mode='heat';
                    ret.preset = 'boost';
                }

                ret.current_heating_setpoint= (value / 2).toFixed(1);
                if (value>0 && value<60) globalStore.putValue(msg.endpoint, 'current_heating_setpoint', ret.current_heating_setpoint);
                return ret;
            case tuyaLocal.dataPoints.zsHeatingSetpointAuto:
                return {current_heating_setpoint_auto: (value / 2).toFixed(1)};

            case tuyaLocal.dataPoints.zsOpenwindowTemp:
                return {detectwindow_temperature: (value / 2).toFixed(1)};

            case tuyaLocal.dataPoints.zsOpenwindowTime:
                return {detectwindow_timeminute: value};

            case tuyaLocal.dataPoints.zsLocalTemp:
                return {local_temperature: (value / 10).toFixed(1)};

            case tuyaLocal.dataPoints.zsBatteryVoltage:
                return {voltage: Math.round(value * 10)};

            case tuyaLocal.dataPoints.zsTempCalibration:
                return {local_temperature_calibration: value > 55 ?
                    ((value - 0x100000000)/10).toFixed(1): (value/ 10).toFixed(1)};

            case tuyaLocal.dataPoints.zsBinaryOne:
                return {binary_one: value ? 'ON' : 'OFF'};

            case tuyaLocal.dataPoints.zsBinaryTwo:
                return {binary_two: value ? 'ON' : 'OFF'};

            case tuyaLocal.dataPoints.zsComfortTemp:
                return {comfort_temperature: (value / 2).toFixed(1)};

            case tuyaLocal.dataPoints.zsEcoTemp:
                return {eco_temperature: (value / 2).toFixed(1)};

            case tuyaLocal.dataPoints.zsAwayTemp:
                return {away_preset_temperature: (value / 2).toFixed(1)};

            case tuyaLocal.dataPoints.zsMode:
                switch (value) {
                case 1: // manual
                    return {system_mode: 'heat', away_mode: 'OFF', preset: 'manual'};
                case 2: // away
                    return {system_mode: 'auto', away_mode: 'ON', preset: 'holiday'};
                case 0: // auto
                    return {system_mode: 'auto', away_mode: 'OFF', preset: 'schedule'};
                default:
                    meta.logger.warn('zigbee-herdsman-converters:zsThermostat: ' +
                        `preset ${value} is not recognized.`);
                    break;
                }
                break;
            case tuyaLocal.dataPoints.zsScheduleMonday:
            case tuyaLocal.dataPoints.zsScheduleTuesday:
            case tuyaLocal.dataPoints.zsScheduleWednesday:
            case tuyaLocal.dataPoints.zsScheduleThursday:
            case tuyaLocal.dataPoints.zsScheduleFriday:
            case tuyaLocal.dataPoints.zsScheduleSaturday:
            case tuyaLocal.dataPoints.zsScheduleSunday:
                for (let i = 1; i <= 9; i++) {
                    const tempId = ((i-1) * 2) +1;
                    const timeId = ((i-1) * 2) +2;
                    ret[`${day}_temp_${i}`] = (value[tempId] / 2).toFixed(1);
                    if (i!=9) {
                        ret[`${day}_hour_${i}`] = Math.floor(value[timeId] / 4).toString().padStart(2, '0');
                        ret[`${day}_minute_${i}`] = ((value[timeId] % 4) *15).toString().padStart(2, '0');
                    }
                }
                return ret;
            case tuyaLocal.dataPoints.zsAwaySetting:
                ret.away_preset_year = value[0];
                ret.away_preset_month = value[1];
                ret.away_preset_day = value[2];
                ret.away_preset_hour = value[3];
                ret.away_preset_minute = value[4];
                ret.away_preset_temperature = (value[5] / 2).toFixed(1);
                ret.away_preset_days = (value[6]<<8)+value[7];
                return ret;
            default:
                meta.logger.warn(`zigbee-herdsman-converters:zsThermostat: Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`);
            }
        },
    },
};
const tzLocal = {
    zs_thermostat_child_lock: {
        key: ['child_lock'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointBool(entity, tuyaLocal.dataPoints.zsChildLock, value === 'LOCK');
        },
    },
    zs_thermostat_binary_one: {
        key: ['binary_one'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointBool(entity, tuyaLocal.dataPoints.zsBinaryOne, value === 'ON');
        },
    },
    zs_thermostat_binary_two: {
        key: ['binary_two'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointBool(entity, tuyaLocal.dataPoints.zsBinaryTwo, value === 'ON');
        },
    },
    zs_thermostat_current_heating_setpoint: {
        key: ['current_heating_setpoint'],
        convertSet: async (entity, key, value, meta) => {
            let temp = Math.round(value * 2);
            if (temp<=0) temp = 1;
            if (temp>=60) temp = 59;
            await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.zsHeatingSetpoint, temp);
        },
    },
    zs_thermostat_current_heating_setpoint_auto: {
        key: ['current_heating_setpoint_auto'],
        convertSet: async (entity, key, value, meta) => {
            let temp = Math.round(value * 2);
            if (temp<=0) temp = 1;
            if (temp>=60) temp = 59;
            await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.zsHeatingSetpointAuto, temp);
        },
    },
    zs_thermostat_comfort_temp: {
        key: ['comfort_temperature'],
        convertSet: async (entity, key, value, meta) => {
            meta.logger.debug(JSON.stringify(entity));
            const temp = Math.round(value * 2);
            await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.zsComfortTemp, temp);
        },
    },
    zs_thermostat_openwindow_temp: {
        key: ['detectwindow_temperature'],
        convertSet: async (entity, key, value, meta) => {
            let temp = Math.round(value * 2);
            if (temp<=0) temp = 1;
            if (temp>=60) temp = 59;
            await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.zsOpenwindowTemp, temp);
        },
    },
    zs_thermostat_openwindow_time: {
        key: ['detectwindow_timeminute'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.zsOpenwindowTime, value);
        },
    },
    zs_thermostat_eco_temp: {
        key: ['eco_temperature'],
        convertSet: async (entity, key, value, meta) => {
            const temp = Math.round(value * 2);
            await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.zsEcoTemp, temp);
        },
    },
    zs_thermostat_preset_mode: {
        key: ['preset'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {'schedule': 0, 'manual': 1, 'holiday': 2};
            if (value == 'boost') {
                await tuya.sendDataPointEnum(entity, tuyaLocal.dataPoints.zsMode, lookup['manual']);
                await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.zsHeatingSetpoint, 60);
            } else {
                await tuya.sendDataPointEnum(entity, tuyaLocal.dataPoints.zsMode, lookup[value]);
                if (value == 'manual') {
                    const temp = globalStore.getValue(entity, 'current_heating_setpoint');
                    await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.zsHeatingSetpoint, temp ? Math.round(temp * 2) : 43 );
                }
            }
        },
    },
    zs_thermostat_system_mode: {
        key: ['system_mode'],
        convertSet: async (entity, key, value, meta) => {
            if (value == 'off') {
                await tuya.sendDataPointEnum(entity, tuyaLocal.dataPoints.zsMode, 1);
                await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.zsHeatingSetpoint, 0);
            } else if (value == 'auto') {
                await tuya.sendDataPointEnum(entity, tuyaLocal.dataPoints.zsMode, 0);
            } else if (value == 'heat') {
                // manual
                const temp = globalStore.getValue(entity, 'current_heating_setpoint');
                await tuya.sendDataPointEnum(entity, tuyaLocal.dataPoints.zsMode, 1);
                await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.zsHeatingSetpoint, temp ? Math.round(temp * 2) : 43 );
            }
        },
    },
    zs_thermostat_local_temperature_calibration: {
        key: ['local_temperature_calibration'],
        convertSet: async (entity, key, value, meta) => {
            if (value > 0) value = value*10;
            if (value < 0) value = value*10 + 0x100000000;
            await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.zsTempCalibration, value);
        },
    },
    zs_thermostat_away_setting: {
        key: ['away_setting'],
        convertSet: async (entity, key, value, meta) => {
            const result = [];
            const daysInMonth = new Date(2000+result[0], result[1], 0).getDate();

            for (const attrName of ['away_preset_year',
                'away_preset_month',
                'away_preset_day',
                'away_preset_hour',
                'away_preset_minute',
                'away_preset_temperature',
                'away_preset_days']) {
                let v = 0;
                if (value.hasOwnProperty(attrName)) {
                    v = value[attrName];
                } else if (meta.state.hasOwnProperty(attrName)) {
                    v = meta.state[attrName];
                }
                switch (attrName) {
                case 'away_preset_year':
                    if (v<17 || v>99) v = 17;
                    result.push(Math.round(v));
                    break;
                case 'away_preset_month':
                    if (v<1 || v>12) v = 1;
                    result.push(Math.round(v));
                    break;
                case 'away_preset_day':
                    if (v<1) {
                        v = 1;
                    } else if (v>daysInMonth) {
                        v = daysInMonth;
                    }
                    result.push(Math.round(v));
                    break;
                case 'away_preset_hour':
                    if (v<0 || v>23) v = 0;
                    result.push(Math.round(v));
                    break;
                case 'away_preset_minute':
                    if (v<0 || v>59) v = 0;
                    result.push(Math.round(v));
                    break;
                case 'away_preset_temperature':
                    if (v<0.5 || v>29.5) v = 17;
                    result.push(Math.round(v * 2));
                    break;
                case 'away_preset_days':
                    if (v<1 || v>9999) v = 1;
                    result.push((v & 0xff00)>>8);
                    result.push((v & 0x00ff));
                    break;
                }
            }

            await tuya.sendDataPointRaw(entity, tuyaLocal.dataPoints.zsAwaySetting, result);
        },
    },
    zs_thermostat_local_schedule: {
        key: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        convertSet: async (entity, key, value, meta) => {
            const daysMap = {'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6, 'sunday': 7};
            const day = daysMap[key];
            const results = [];
            results.push(day);
            for (let i = 1; i <= 9; i++) {
                // temperature
                const attrName = `${key}_temp_${i}`;
                let v = 17;
                if (value.hasOwnProperty(attrName)) {
                    v = value[attrName];
                } else if (meta.state.hasOwnProperty(attrName)) {
                    v = meta.state[attrName];
                }
                if (v<0.5 || v>29.5) v = 17;
                results.push(Math.round(v * 2));
                if (i!=9) {
                    // hour
                    let attrName = `${key}_hour_${i}`;
                    let h = 0;
                    if (value.hasOwnProperty(attrName)) {
                        h = value[attrName];
                    } else if (meta.state.hasOwnProperty(attrName)) {
                        h = meta.state[attrName];
                    }
                    // minute
                    attrName = `${key}_minute_${i}`;
                    let m = 0;
                    if (value.hasOwnProperty(attrName)) {
                        m = value[attrName];
                    } else if (meta.state.hasOwnProperty(attrName)) {
                        m = meta.state[attrName];
                    }
                    let rt = h*4 + m/15;
                    if (rt<1) {
                        rt =1;
                    } else if (rt>96) {
                        rt = 96;
                    }
                    results.push(Math.round(rt));
                }
            }
            if (value > 0) value = value*10;
            if (value < 0) value = value*10 + 0x100000000;
            await tuya.sendDataPointRaw(entity, (109+day-1), results);
        },
    },
};

module.exports = [
    {
        fingerprint: [
            {manufacturerName: '_TZ3000_kdi2o9m6'}, // EU
            {modelID: 'TS011F', manufacturerName: '_TZ3000_plyvnuf5'}, // CH
            {modelID: 'TS011F', manufacturerName: '_TZ3000_wamqdr3f'}, // FR
            {modelID: 'TS011F', manufacturerName: '_TZ3000_00mk2xzy'}, // BS
            {modelID: 'TS011F', manufacturerName: '_TZ3000_upjrsxh1'}, // DK
            {manufacturerName: '_TZ3000_00mk2xzy'}, // BS
        ],
        model: 'HG06337',
        vendor: 'Lidl',
        description: 'Silvercrest smart plug (EU, CH, FR, BS, DK)',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0211', manufacturerName: '_TZ1800_ladpngdx'}],
        model: 'HG06668',
        vendor: 'Lidl',
        description: 'Silvercrest smart wireless door bell button',
        fromZigbee: [fz.battery, fz.tuya_doorbell_button, fz.ignore_basic_report],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.battery(), e.action(['pressed']), e.battery_low(), e.tamper()],
    },
    {
        fingerprint: [{modelID: 'TY0202', manufacturerName: '_TZ1800_fcdjzz3s'}],
        model: 'HG06335',
        vendor: 'Lidl',
        description: 'Silvercrest smart motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TY0203', manufacturerName: '_TZ1800_ejwkn2h2'}],
        model: 'HG06336',
        vendor: 'Lidl',
        description: 'Silvercrest smart window and door sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.ias_contact_alarm_1_report, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS1001', manufacturerName: '_TYZB01_bngwdjsr'}],
        model: 'FB20-002',
        vendor: 'Lidl',
        description: 'Livarno Lux switch and dimming light remote control',
        exposes: [e.action(['on', 'off', 'brightness_stop', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up',
            'brightness_move_down'])],
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop],
        toZigbee: [],
    },
    {
        fingerprint: [
            {modelID: 'TS011F', manufacturerName: '_TZ3000_wzauvbcs'}, // EU
            {modelID: 'TS011F', manufacturerName: '_TZ3000_1obwwnmq'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_4uf3d0ax'}, // FR
            {modelID: 'TS011F', manufacturerName: '_TZ3000_vzopcetz'}, // CZ
            {modelID: 'TS011F', manufacturerName: '_TZ3000_vmpbygs5'}, // BS
        ],
        model: 'HG06338',
        vendor: 'Lidl',
        description: 'Silvercrest 3 gang switch, with 4 USB (EU, FR, CZ, BS)',
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3')],
        extend: extend.switch(),
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            for (const ID of [1, 2, 3]) {
                await reporting.bind(device.getEndpoint(ID), coordinatorEndpoint, ['genOnOff']);
            }
        },
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3};
        },
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_riwp3k79'}, {manufacturerName: '_TZ3000_riwp3k79'}],
        model: 'HG06104A',
        vendor: 'Lidl',
        description: 'Livarno Lux smart LED light strip 2.5m',
        ...extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true, enhancedHue: false},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_s8gkrkxk'}],
        model: 'HG06467',
        vendor: 'Lidl',
        description: 'Melinera smart LED string lights',
        toZigbee: [tz.on_off, tz.silvercrest_smart_led_string],
        fromZigbee: [fz.on_off, fz.silvercrest_smart_led_string],
        exposes: [e.light_brightness_colorhs().setAccess('brightness', ea.STATE_SET)],
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_odygigth'}],
        model: 'HG06106B',
        vendor: 'Lidl',
        description: 'Livarno Lux E14 candle RGB',
        ...extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true, enhancedHue: false},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3000_quqaeew6'}],
        model: 'HG07834A',
        vendor: 'Lidl',
        description: 'Livarno Lux GU10 spot RGB',
        ...extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true, colorTempRange: [153, 500]}),
        meta: {applyRedFix: true, enhancedHue: false},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3000_th6zqqy6'}],
        model: 'HG07834B',
        vendor: 'Lidl',
        description: 'Livarno Lux E14 candle RGB',
        ...extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true, colorTempRange: [153, 500]}),
        meta: {applyRedFix: true, enhancedHue: false},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_kdpxju99'}],
        model: 'HG06106A',
        vendor: 'Lidl',
        description: 'Livarno Lux GU10 spot RGB',
        ...extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true, enhancedHue: false},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_dbou1ap4'}],
        model: 'HG06106C',
        vendor: 'Lidl',
        description: 'Livarno Lux E27 bulb RGB',
        ...extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true, enhancedHue: false},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3000_qd7hej8u'}],
        model: 'HG07834C',
        vendor: 'Lidl',
        description: 'Livarno Lux E27 bulb RGB',
        ...extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true, colorTempRange: [153, 500]}),
        meta: {applyRedFix: true, enhancedHue: false},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{modelID: 'TS0502A', manufacturerName: '_TZ3000_el5kt5im'}],
        model: 'HG06492A',
        vendor: 'Lidl',
        description: 'Livarno Lux GU10 spot CCT',
        ...extend.light_onoff_brightness_colortemp({disableColorTempStartup: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 16});
        },
    },
    {
        fingerprint: [{modelID: 'TS0502A', manufacturerName: '_TZ3000_oborybow'}],
        model: 'HG06492B',
        vendor: 'Lidl',
        description: 'Livarno Lux E14 candle CCT',
        ...extend.light_onoff_brightness_colortemp({disableColorTempStartup: true, colorTempRange: [153, 500]}),
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 16});
        },
    },
    {
        fingerprint: [{modelID: 'TS0502A', manufacturerName: '_TZ3000_49qchf10'}],
        model: 'HG06492C',
        vendor: 'Lidl',
        description: 'Livarno Lux E27 bulb CCT',
        ...extend.light_onoff_brightness_colortemp({disableColorTempStartup: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 16});
        },
    },
    {
        fingerprint: [{modelID: 'TS0502A', manufacturerName: '_TZ3000_rylaozuc'}],
        model: '14147206L',
        vendor: 'Lidl',
        description: 'Livarno Lux ceiling light',
        ...extend.light_onoff_brightness_colortemp({disableColorTempStartup: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 16});
        },
    },
    {
        fingerprint: [{modelID: 'TS0502A', manufacturerName: '_TZ3000_8uaoilu9'}],
        model: '14153905L',
        vendor: 'Lidl',
        description: 'Livarno Home LED floor lamp',
        ...extend.light_onoff_brightness_colortemp({disableColorTempStartup: true, colorTempRange: [153, 333]}),
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 16});
        },
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_9cpuaca6'}],
        model: '14148906L',
        vendor: 'Lidl',
        description: 'Livarno Lux mood light RGB+CCT',
        ...extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true, enhancedHue: false},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_gek6snaj'}],
        model: '14149505L/14149506L',
        vendor: 'Lidl',
        description: 'Livarno Lux light bar RGB+CCT (black/white)',
        ...extend.light_onoff_brightness_colortemp_color({disableColorTempStartup: true}),
        meta: {applyRedFix: true, enhancedHue: false},
        configure: async (device, coordinatorEndpoint, logger) => {
            device.getEndpoint(1).saveClusterAttributeKeyValue('lightingColorCtrl', {colorCapabilities: 29});
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_htnnfasr'}],
        model: 'PSBZS A1',
        vendor: 'Lidl',
        description: 'Parkside smart watering timer',
        fromZigbee: [fz.ignore_basic_report],
        toZigbee: [tz.on_off, tz.lidl_watering_timer],
        onEvent: tuya.onEventSetTime,
        configure: async (device, coordinatorEndpoint, logger) => {},
        exposes: [e.switch(), exposes.numeric('timer', ea.SET).withValueMin(1).withValueMax(10000)
            .withUnit('min').withDescription('Auto off after specific time.')],
    },
    {
        fingerprint: [{modelID: 'TS0501A', manufacturerName: '_TZ3000_j2w1dw29'}],
        model: 'HG06463A',
        vendor: 'Lidl',
        description: 'Livarno Lux E27 ST64 filament bulb',
        extend: extend.light_onoff_brightness({disableEffect: true}),
        meta: {turnsOffAtBrightness1: false},
    },
    {
        fingerprint: [{modelID: 'TS0501A', manufacturerName: '_TZ3000_nosnx7im'}],
        model: 'HG06463B',
        vendor: 'Lidl',
        description: 'Livarno Lux E27 G95 filament bulb',
        extend: extend.light_onoff_brightness({disableEffect: true}),
        meta: {turnsOffAtBrightness1: false},
    },
    {
        fingerprint: [{modelID: 'TS0101', manufacturerName: '_TZ3000_br3laukf'}],
        model: 'HG06620',
        vendor: 'Lidl',
        description: 'Silvercrest garden spike with 2 sockets',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0501A', manufacturerName: '_TZ3000_7dcddnye'},
            {modelID: 'TS0501A', manufacturerName: '_TZ3000_nbnmw9nc'}, // UK
        ],
        model: 'HG06462A',
        vendor: 'Lidl',
        description: 'Livarno Lux E27 A60 filament bulb',
        extend: extend.light_onoff_brightness({disableEffect: true}),
        meta: {turnsOffAtBrightness1: false},
    },
    {
        fingerprint: [{modelID: 'TS0101', manufacturerName: '_TZ3000_pnzfdr9y'}],
        model: 'HG06619',
        vendor: 'Lidl',
        description: 'Silvercrest outdoor plug',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_chyvmhay'}],
        model: '368308_2010',
        vendor: 'Lidl',
        description: 'Silvercrest radiator valve with thermostat',
        fromZigbee: [fz.ignore_tuya_set_time, fzLocal.zs_thermostat],
        toZigbee: [tzLocal.zs_thermostat_current_heating_setpoint, tzLocal.zs_thermostat_child_lock,
            tzLocal.zs_thermostat_comfort_temp, tzLocal.zs_thermostat_eco_temp, tzLocal.zs_thermostat_preset_mode,
            tzLocal.zs_thermostat_system_mode, tzLocal.zs_thermostat_local_temperature_calibration,
            tzLocal.zs_thermostat_current_heating_setpoint_auto, tzLocal.zs_thermostat_openwindow_time,
            tzLocal.zs_thermostat_openwindow_temp, tzLocal.zs_thermostat_binary_one, tzLocal.zs_thermostat_binary_two,
            tzLocal.zs_thermostat_away_setting, tzLocal.zs_thermostat_local_schedule],
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [
            e.child_lock(), e.comfort_temperature(), e.eco_temperature(), e.battery_voltage(),
            exposes.numeric('current_heating_setpoint_auto', ea.STATE_SET).withValueMin(0.5).withValueMax(29.5)
                .withValueStep(0.5).withUnit('°C').withDescription('Temperature setpoint automatic'),
            exposes.climate().withSetpoint('current_heating_setpoint', 0.5, 29.5, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE).withLocalTemperatureCalibration(-12.5, 5.5, 0.1, ea.STATE_SET)
                .withSystemMode(['off', 'heat', 'auto'], ea.STATE_SET)
                .withPreset(['schedule', 'manual', 'holiday', 'boost']),
            exposes.numeric('detectwindow_temperature', ea.STATE_SET).withUnit('°C').withDescription('Open window detection temperature')
                .withValueMin(-10).withValueMax(35),
            exposes.numeric('detectwindow_timeminute', ea.STATE_SET).withUnit('min').withDescription('Open window time in minute')
                .withValueMin(0).withValueMax(1000),
            exposes.binary('binary_one', ea.STATE_SET, 'ON', 'OFF').withDescription('Unknown binary one'),
            exposes.binary('binary_two', ea.STATE_SET, 'ON', 'OFF').withDescription('Unknown binary two'),
            exposes.binary('away_mode', ea.STATE, 'ON', 'OFF').withDescription('Away mode'),
            exposes.composite('away_setting', 'away_setting').withFeature(e.away_preset_days()).setAccess('away_preset_days', ea.ALL)
                .withFeature(e.away_preset_temperature()).setAccess('away_preset_temperature', ea.ALL)
                .withFeature(exposes.numeric('away_preset_year', ea.ALL).withUnit('year').withDescription('Start away year 20xx'))
                .withFeature(exposes.numeric('away_preset_month', ea.ALL).withUnit('month').withDescription('Start away month'))
                .withFeature(exposes.numeric('away_preset_day', ea.ALL).withUnit('day').withDescription('Start away day'))
                .withFeature(exposes.numeric('away_preset_hour', ea.ALL).withUnit('hour').withDescription('Start away hours'))
                .withFeature(exposes.numeric('away_preset_minute', ea.ALL).withUnit('min').withDescription('Start away minutes')),
            ...['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                const expose = exposes.composite(day, day);
                [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((i) => {
                    expose.withFeature(exposes.numeric(`${day}_temp_${i}`, ea.ALL).withValueMin(0.5)
                        .withValueMax(29.5).withValueStep(0.5).withUnit('°C').withDescription(`Temperature ${i}`));
                    expose.withFeature(exposes.enum(`${day}_hour_${i}`, ea.STATE_SET,
                        ['00', '01', '02', '03', '04', '05', '06', '07', '08', '09',
                            '10', '11', '12', '13', '14', '15', '16', '17', '18', '19',
                            '20', '21', '22', '23', '24']).withDescription(`Hour TO for temp ${i}`));
                    expose.withFeature(exposes.enum(`${day}_minute_${i}`, ea.STATE_SET, ['00', '15', '30', '45'])
                        .withDescription(`Minute TO for temp ${i}`));
                });
                return expose;
            }),
        ],
    },
];
