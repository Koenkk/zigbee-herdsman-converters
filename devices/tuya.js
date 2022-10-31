const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const ota = require('../lib/ota');
const tuya = require('../lib/tuya');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;
const libColor = require('../lib/color');
const utils = require('../lib/utils');
const zosung = require('../lib/zosung');
const fzZosung = zosung.fzZosung;
const tzZosung = zosung.tzZosung;
const ez = zosung.presetsZosung;
const globalStore = require('../lib/store');

const TS011Fplugs = ['_TZ3000_5f43h46b', '_TZ3000_cphmq0q7', '_TZ3000_dpo1ysak', '_TZ3000_ew3ldmgx', '_TZ3000_gjnozsaz',
    '_TZ3000_jvzvulen', '_TZ3000_mraovvmm', '_TZ3000_nfnmi125', '_TZ3000_ps3dmato', '_TZ3000_w0qqde0g', '_TZ3000_u5u4cakc',
    '_TZ3000_rdtixbnu', '_TZ3000_typdpbpg', '_TZ3000_kx0pris5', '_TZ3000_amdymr7l', '_TZ3000_z1pnpsdo', '_TZ3000_ksw8qtmt',
    '_TZ3000_1h2x4akh', '_TZ3000_9vo5icau', '_TZ3000_cehuw1lw', '_TZ3000_ko6v90pg', '_TZ3000_f1bapcit', '_TZ3000_cjrngdr3',
    '_TZ3000_zloso4jk', '_TZ3000_r6buo8ba', '_TZ3000_iksasdbv', '_TZ3000_idrffznf', '_TZ3000_okaz9tjs', '_TZ3210_q7oryllx',
    '_TZ3000_ss98ec5d', '_TZ3000_gznh2xla', '_TZ3000_hdopuwv6', '_TZ3000_gvn91tmx', '_TZ3000_dksbtrzs', '_TZ3000_b28wrpvx',
    '_TZ3000_aim0ztek', '_TZ3000_mlswgkc3', '_TZ3000_7dndcnnb', '_TZ3000_waho4jtj', '_TZ3000_nmsciidq', '_TZ3000_jtgxgmks',
    '_TZ3000_rdfh8cfs', '_TZ3000_yujkchbz', '_TZ3000_fgwhjm9j'];

const tzLocal = {
    SA12IZL_silence_siren: {
        key: ['silence_siren'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointBool(entity, 16, value);
        },
    },
    SA12IZL_alarm: {
        key: ['alarm'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointEnum(entity, 20, {true: 0, false: 1}[value]);
        },
    },
    hpsz: {
        key: ['led_state'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointBool(entity, tuya.dataPoints.HPSZLEDState, value);
        },
    },
    TS0504B_color: {
        key: ['color'],
        convertSet: async (entity, key, value, meta) => {
            const color = libColor.Color.fromConverterArg(value);
            console.log(color);
            const enableWhite =
                (color.isRGB() && (color.rgb.red === 1 && color.rgb.green === 1 && color.rgb.blue === 1)) ||
                // Zigbee2MQTT frontend white value
                (color.isXY() && (color.xy.x === 0.3125 || color.xy.y === 0.32894736842105265)) ||
                // Home Assistant white color picker value
                (color.isXY() && (color.xy.x === 0.323 || color.xy.y === 0.329));

            if (enableWhite) {
                await entity.command('lightingColorCtrl', 'tuyaRgbMode', {enable: false});
                const newState = {color_mode: 'xy'};
                if (color.isXY()) {
                    newState.color = color.xy;
                } else {
                    newState.color = color.rgb.gammaCorrected().toXY().rounded(4);
                }
                return {state: libColor.syncColorState(newState, meta.state, entity, meta.options, meta.logger)};
            } else {
                return await tz.light_color.convertSet(entity, key, value, meta);
            }
        },
    },
    power_on_behavior: {
        key: ['power_on_behavior'],
        convertSet: async (entity, key, value, meta) => {
            value = value.toLowerCase();
            const lookup = {'off': 0, 'on': 1, 'previous': 2};
            utils.validateValue(value, Object.keys(lookup));
            const pState = lookup[value];
            await entity.write('manuSpecificTuya_3', {'powerOnBehavior': pState}, {disableDefaultResponse: true});
            return {state: {power_on_behavior: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificTuya_3', ['powerOnBehavior']);
        },
    },
    zb_sm_cover: {
        key: ['state', 'position', 'reverse_direction', 'top_limit', 'bottom_limit', 'favorite_position', 'goto_positon', 'report'],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
            case 'position': {
                const invert = (meta.state) ? !meta.state.invert_cover : false;
                value = invert ? 100 - value : value;
                if (value >= 0 && value <= 100) {
                    await tuya.sendDataPointValue(entity, tuya.dataPoints.coverPosition, value);
                } else {
                    throw new Error('TuYa_cover_control: Curtain motor position is out of range');
                }
                break;
            }
            case 'state': {
                const stateEnums = tuya.getCoverStateEnums(meta.device.manufacturerName);
                meta.logger.debug(`TuYa_cover_control: Using state enums for ${meta.device.manufacturerName}:
                ${JSON.stringify(stateEnums)}`);

                value = value.toLowerCase();
                switch (value) {
                case 'close':
                    await tuya.sendDataPointEnum(entity, tuya.dataPoints.state, stateEnums.close);
                    break;
                case 'open':
                    await tuya.sendDataPointEnum(entity, tuya.dataPoints.state, stateEnums.open);
                    break;
                case 'stop':
                    await tuya.sendDataPointEnum(entity, tuya.dataPoints.state, stateEnums.stop);
                    break;
                default:
                    throw new Error('TuYa_cover_control: Invalid command received');
                }
                break;
            }
            case 'reverse_direction': {
                meta.logger.info(`Motor direction ${(value) ? 'reverse' : 'forward'}`);
                await tuya.sendDataPointEnum(entity, tuya.dataPoints.motorDirection, (value) ? 1 : 0);
                break;
            }
            case 'top_limit': {
                await tuya.sendDataPointEnum(entity, 104, {'SET': 0, 'CLEAR': 1}[value]);
                break;
            }
            case 'bottom_limit': {
                await tuya.sendDataPointEnum(entity, 103, {'SET': 0, 'CLEAR': 1}[value]);
                break;
            }
            case 'favorite_position': {
                await tuya.sendDataPointValue(entity, 115, value);
                break;
            }
            case 'goto_positon': {
                if (value == 'FAVORITE') {
                    value = (meta.state) ? meta.state.favorite_position : null;
                } else {
                    value = parseInt(value);
                }
                return tz.tuya_cover_control.convertSet(entity, 'position', value, meta);
            }
            case 'report': {
                await tuya.sendDataPointBool(entity, 116, 0);
                break;
            }
            }
        },
    },
    x5h_thermostat: {
        key: ['system_mode', 'current_heating_setpoint', 'sensor', 'brightness_state', 'sound', 'frost_protection', 'week', 'factory_reset',
            'local_temperature_calibration', 'heating_temp_limit', 'deadzone_temperature', 'upper_temp', 'preset', 'child_lock',
            'schedule'],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
            case 'system_mode':
                await tuya.sendDataPointBool(entity, tuya.dataPoints.x5hState, value === 'heat');
                break;
            case 'preset': {
                value = value.toLowerCase();
                const lookup = {manual: 0, program: 1};
                utils.validateValue(value, Object.keys(lookup));
                value = lookup[value];
                await tuya.sendDataPointEnum(entity, tuya.dataPoints.x5hMode, value);
                break;
            }
            case 'upper_temp':
                if (value >= 35 && value <= 95) {
                    await tuya.sendDataPointValue(entity, tuya.dataPoints.x5hSetTempCeiling, value);
                    const setpoint = globalStore.getValue(entity, 'currentHeatingSetpoint', 20);
                    const setpointRaw = Math.round(setpoint * 10);
                    await new Promise((r) => setTimeout(r, 500));
                    await tuya.sendDataPointValue(entity, tuya.dataPoints.x5hSetTemp, setpointRaw);
                } else {
                    throw new Error('Supported values are in range [35, 95]');
                }
                break;
            case 'deadzone_temperature':
                if (value >= 0.5 && value <= 9.5) {
                    value = Math.round(value * 10);
                    await tuya.sendDataPointValue(entity, tuya.dataPoints.x5hTempDiff, value);
                } else {
                    throw new Error('Supported values are in range [0.5, 9.5]');
                }
                break;
            case 'heating_temp_limit':
                if (value >= 5 && value <= 60) {
                    await tuya.sendDataPointValue(entity, tuya.dataPoints.x5hProtectionTempLimit, value);
                } else {
                    throw new Error('Supported values are in range [5, 60]');
                }
                break;
            case 'local_temperature_calibration':
                if (value >= -9.9 && value <= 9.9) {
                    value = Math.round(value * 10);

                    if (value < 0) {
                        value = 0xFFFFFFFF + value + 1;
                    }

                    await tuya.sendDataPointValue(entity, tuya.dataPoints.x5hTempCorrection, value);
                } else {
                    throw new Error('Supported values are in range [-9.9, 9.9]');
                }
                break;
            case 'factory_reset':
                await tuya.sendDataPointBool(entity, tuya.dataPoints.x5hFactoryReset, value === 'ON');
                break;
            case 'week':
                await tuya.sendDataPointEnum(entity, tuya.dataPoints.x5hWorkingDaySetting,
                    utils.getKey(tuya.thermostatWeekFormat, value, value, Number));
                break;
            case 'frost_protection':
                await tuya.sendDataPointBool(entity, tuya.dataPoints.x5hFrostProtection, value === 'ON');
                break;
            case 'sound':
                await tuya.sendDataPointBool(entity, tuya.dataPoints.x5hSound, value === 'ON');
                break;
            case 'brightness_state': {
                value = value.toLowerCase();
                const lookup = {off: 0, low: 1, medium: 2, high: 3};
                utils.validateValue(value, Object.keys(lookup));
                value = lookup[value];
                await tuya.sendDataPointEnum(entity, tuya.dataPoints.x5hBackplaneBrightness, value);
                break;
            }
            case 'sensor': {
                value = value.toLowerCase();
                const lookup = {'internal': 0, 'external': 1, 'both': 2};
                utils.validateValue(value, Object.keys(lookup));
                value = lookup[value];
                await tuya.sendDataPointEnum(entity, tuya.dataPoints.x5hSensorSelection, value);
                break;
            }
            case 'current_heating_setpoint':
                if (value >= 5 && value <= 60) {
                    value = Math.round(value * 10);
                    await tuya.sendDataPointValue(entity, tuya.dataPoints.x5hSetTemp, value);
                } else {
                    throw new Error(`Unsupported value: ${value}`);
                }
                break;
            case 'child_lock':
                await tuya.sendDataPointBool(entity, tuya.dataPoints.x5hChildLock, value === 'LOCK');
                break;
            case 'schedule': {
                const periods = value.split(' ');
                const periodsNumber = 8;
                const payload = [];

                for (let i = 0; i < periodsNumber; i++) {
                    const timeTemp = periods[i].split('/');
                    const hm = timeTemp[0].split(':', 2);
                    const h = parseInt(hm[0]);
                    const m = parseInt(hm[1]);
                    const temp = parseFloat(timeTemp[1]);

                    if (h < 0 || h >= 24 || m < 0 || m >= 60 || temp < 5 || temp > 60) {
                        throw new Error('Invalid hour, minute or temperature of: ' + periods[i]);
                    }

                    const tempHexArray = tuya.convertDecimalValueTo2ByteHexArray(Math.round(temp * 10));
                    // 1 byte for hour, 1 byte for minutes, 2 bytes for temperature
                    payload.push(h, m, ...tempHexArray);
                }

                await tuya.sendDataPointRaw(entity, tuya.dataPoints.x5hWeeklyProcedure, payload);
                break;
            }
            default:
                break;
            }
        },
    },
    temperature_unit: {
        key: ['temperature_unit'],
        convertSet: async (entity, key, value, meta) => {
            switch (key) {
            case 'temperature_unit': {
                await entity.write('manuSpecificTuya_2', {'57355': {value: {'celsius': 0, 'fahrenheit': 1}[value], type: 48}});
                break;
            }
            default: // Unknown key
                meta.logger.warn(`Unhandled key ${key}`);
            }
        },
    },
};

const fzLocal = {
    SA12IZL: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            for (const dpValue of msg.data.dpValues) {
                const dp = dpValue.dp;
                const value = tuya.getDataValue(dpValue);
                switch (dp) {
                case tuya.dataPoints.state:
                    result.smoke = value === 0;
                    break;
                case 15:
                    result.battery = value;
                    break;
                case 16:
                    result.silence_siren = value;
                    break;
                case 20: {
                    const alarm = {0: true, 1: false};
                    result.alarm = alarm[value];
                    break;
                }
                default:
                    meta.logger.warn(`zigbee-herdsman-converters:SA12IZL: NOT RECOGNIZED DP #${
                        dp} with data ${JSON.stringify(dpValue)}`);
                }
            }
            return result;
        },
    },
    tuya_dinrail_switch2: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport', 'commandDataResponse', 'commandActiveStatusReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = tuya.firstDpValue(msg, meta, 'tuya_dinrail_switch2');
            const dp = dpValue.dp;
            const value = tuya.getDataValue(dpValue);
            const state = value ? 'ON' : 'OFF';

            switch (dp) {
            case tuya.dataPoints.state: // DPID that we added to common
                return {state: state};
            case tuya.dataPoints.dinrailPowerMeterTotalEnergy2:
                return {energy: value/100};
            case tuya.dataPoints.dinrailPowerMeterPower2:
                return {power: value};
            default:
                meta.logger.warn(`zigbee-herdsman-converters:TuyaDinRailSwitch: NOT RECOGNIZED DP ` +
                    `#${dp} with data ${JSON.stringify(dpValue)}`);
            }
        },
    },
    hpsz: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = tuya.firstDpValue(msg, meta, 'hpsz');
            const dp = dpValue.dp;
            const value = tuya.getDataValue(dpValue);
            let result = null;
            switch (dp) {
            case tuya.dataPoints.HPSZInductionState:
                result = {presence: value === 1};
                break;
            case tuya.dataPoints.HPSZPresenceTime:
                result = {duration_of_attendance: value};
                break;
            case tuya.dataPoints.HPSZLeavingTime:
                result = {duration_of_absence: value};
                break;
            case tuya.dataPoints.HPSZLEDState:
                result = {led_state: value};
                break;
            default:
                meta.logger.warn(`zigbee-herdsman-converters:hpsz: NOT RECOGNIZED DP #${
                    dp} with data ${JSON.stringify(dpValue)}`);
            }
            return result;
        },
    },
    metering_skip_duplicate: {
        ...fz.metering,
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg)) return;
            return fz.metering.convert(model, msg, publish, options, meta);
        },
    },
    electrical_measurement_skip_duplicate: {
        ...fz.electrical_measurement,
        convert: (model, msg, publish, options, meta) => {
            if (utils.hasAlreadyProcessedMessage(msg)) return;
            return fz.electrical_measurement.convert(model, msg, publish, options, meta);
        },
    },
    scenes_recall_scene_65029: {
        cluster: '65029',
        type: ['raw', 'attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            const id = meta.device.modelID === '005f0c3b' ? msg.data[0] : msg.data[msg.data.length - 1];
            return {action: `scene_${id}`};
        },
    },
    TS0201_battery: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            // https://github.com/Koenkk/zigbee2mqtt/issues/11470
            if (msg.data.batteryPercentageRemaining == 200 && msg.data.batteryVoltage < 30) return;
            return fz.battery.convert(model, msg, publish, options, meta);
        },
    },
    TS0201_humidity: {
        ...fz.humidity,
        convert: (model, msg, publish, options, meta) => {
            const result = fz.humidity.convert(model, msg, publish, options, meta);
            if (meta.device.manufacturerName === '_TZ3000_ywagc4rj') {
                result.humidity = result.humidity * 10;
            }
            return result;
        },
    },
    TS0222: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            for (const dpValue of msg.data.dpValues) {
                const dp = dpValue.dp;
                const value = tuya.getDataValue(dpValue);
                switch (dp) {
                case 2:
                    result.illuminance = value;
                    result.illuminance_lux = value;
                    break;
                case 4:
                    result.battery = value;
                    break;
                default:
                    meta.logger.warn(`zigbee-herdsman-converters:TS0222 Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`);
                }
            }
            return result;
        },
    },
    ZM35HQ_battery: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = tuya.firstDpValue(msg, meta, 'ZM35HQ');
            const dp = dpValue.dp;
            const value = tuya.getDataValue(dpValue);
            if (dp === 4) return {battery: value};
            else {
                meta.logger.warn(`zigbee-herdsman-converters:ZM35HQ: NOT RECOGNIZED DP #${dp} with data ${JSON.stringify(dpValue)}`);
            }
        },
    },
    power_on_behavior: {
        cluster: 'manuSpecificTuya_3',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const attribute = 'powerOnBehavior';
            const lookup = {0: 'off', 1: 'on', 2: 'previous'};

            if (msg.data.hasOwnProperty(attribute)) {
                const property = utils.postfixWithEndpointName('power_on_behavior', msg, model, meta);
                return {[property]: lookup[msg.data[attribute]]};
            }
        },
    },
    zb_sm_cover: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataReport', 'commandDataResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            for (const dpValue of msg.data.dpValues) {
                const dp = dpValue.dp;
                const value = tuya.getDataValue(dpValue);

                switch (dp) {
                case tuya.dataPoints.coverPosition: // Started moving to position (triggered from Zigbee)
                case tuya.dataPoints.coverArrived: { // Arrived at position
                    const invert = (meta.state) ? !meta.state.invert_cover : false;
                    const position = invert ? 100 - (value & 0xFF) : (value & 0xFF);
                    if (position > 0 && position <= 100) {
                        result.position = position;
                        result.state = 'OPEN';
                    } else if (position == 0) { // Report fully closed
                        result.position = position;
                        result.state = 'CLOSE';
                    }
                    break;
                }
                case 1: // report state
                    result.state = {0: 'OPEN', 1: 'STOP', 2: 'CLOSE'}[value];
                    break;
                case tuya.dataPoints.motorDirection: // reverse direction
                    result.reverse_direction = (value == 1);
                    break;
                case 10: // cycle time
                    result.cycle_time = value;
                    break;
                case 101: // model
                    result.motor_type = {0: '', 1: 'AM0/6-28R-Sm', 2: 'AM0/10-19R-Sm',
                        3: 'AM1/10-13R-Sm', 4: 'AM1/20-13R-Sm', 5: 'AM1/30-13R-Sm'}[value];
                    break;
                case 102: // cycles
                    result.cycle_count = value;
                    break;
                case 103: // set or clear bottom limit
                    result.bottom_limit = {0: 'SET', 1: 'CLEAR'}[value];
                    break;
                case 104: // set or clear top limit
                    result.top_limit = {0: 'SET', 1: 'CLEAR'}[value];
                    break;
                case 109: // active power
                    result.active_power = value;
                    break;
                case 115: // favorite_position
                    result.favorite_position = (value != 101) ? value : null;
                    break;
                case 116: // report confirmation
                    break;
                case 121: // running state
                    result.motor_state = {0: 'OPENING', 1: 'STOPPED', 2: 'CLOSING'}[value];
                    result.running = (value !== 1) ? true : false;
                    break;
                default: // Unknown code
                    meta.logger.warn(`zb_sm_tuya_cover: Unhandled DP #${dp} for ${meta.device.manufacturerName}:
                    ${JSON.stringify(dpValue)}`);
                }
            }
            return result;
        },
    },
    x5h_thermostat: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            const dpValue = tuya.firstDpValue(msg, meta, 'x5h_thermostat');
            const dp = dpValue.dp;
            const value = tuya.getDataValue(dpValue);

            switch (dp) {
            case tuya.dataPoints.x5hState: {
                return {system_mode: value ? 'heat' : 'off'};
            }
            case tuya.dataPoints.x5hWorkingStatus: {
                return {running_state: value ? 'heat' : 'idle'};
            }
            case tuya.dataPoints.x5hSound: {
                return {sound: value ? 'ON' : 'OFF'};
            }
            case tuya.dataPoints.x5hFrostProtection: {
                return {frost_protection: value ? 'ON' : 'OFF'};
            }
            case tuya.dataPoints.x5hWorkingDaySetting: {
                return {week: tuya.thermostatWeekFormat[value]};
            }
            case tuya.dataPoints.x5hFactoryReset: {
                if (value) {
                    clearTimeout(globalStore.getValue(msg.endpoint, 'factoryResetTimer'));
                    const timer = setTimeout(() => publish({factory_reset: 'OFF'}), 60 * 1000);
                    globalStore.putValue(msg.endpoint, 'factoryResetTimer', timer);
                    meta.logger.info('The thermostat is resetting now. It will be available in 1 minute.');
                }

                return {factory_reset: value ? 'ON' : 'OFF'};
            }
            case tuya.dataPoints.x5hTempDiff: {
                return {deadzone_temperature: parseFloat((value / 10).toFixed(1))};
            }
            case tuya.dataPoints.x5hProtectionTempLimit: {
                return {heating_temp_limit: value};
            }
            case tuya.dataPoints.x5hBackplaneBrightness: {
                const lookup = {0: 'off', 1: 'low', 2: 'medium', 3: 'high'};

                if (value >= 0 && value <= 3) {
                    globalStore.putValue(msg.endpoint, 'brightnessState', value);
                    return {brightness_state: lookup[value]};
                }

                // Sometimes, for example on thermostat restart, it sends message like:
                // {"dpValues":[{"data":{"data":[90],"type":"Buffer"},"datatype":4,"dp":104}
                // It doesn't represent any brightness value and brightness remains the previous value
                const lastValue = globalStore.getValue(msg.endpoint, 'brightnessState') || 1;
                return {brightness_state: lookup[lastValue]};
            }
            case tuya.dataPoints.x5hWeeklyProcedure: {
                const periods = [];
                const periodSize = 4;
                const periodsNumber = 8;

                for (let i = 0; i < periodsNumber; i++) {
                    const hours = value[i * periodSize];
                    const minutes = value[i * periodSize + 1];
                    const tempHexArray = [value[i * periodSize + 2], value[i * periodSize + 3]];
                    const tempRaw = Buffer.from(tempHexArray).readUIntBE(0, tempHexArray.length);
                    const strHours = hours.toString().padStart(2, '0');
                    const strMinutes = minutes.toString().padStart(2, '0');
                    const temp = parseFloat((tempRaw / 10).toFixed(1));
                    periods.push(`${strHours}:${strMinutes}/${temp}`);
                }

                const schedule = periods.join(' ');
                return {schedule};
            }
            case tuya.dataPoints.x5hChildLock: {
                return {child_lock: value ? 'LOCK' : 'UNLOCK'};
            }
            case tuya.dataPoints.x5hSetTemp: {
                const setpoint = parseFloat((value / 10).toFixed(1));
                globalStore.putValue(msg.endpoint, 'currentHeatingSetpoint', setpoint);
                return {current_heating_setpoint: setpoint};
            }
            case tuya.dataPoints.x5hSetTempCeiling: {
                return {upper_temp: value};
            }
            case tuya.dataPoints.x5hCurrentTemp: {
                const temperature = value & (1 << 15) ? value - (1 << 16) + 1 : value;
                return {local_temperature: parseFloat((temperature / 10).toFixed(1))};
            }
            case tuya.dataPoints.x5hTempCorrection: {
                return {local_temperature_calibration: parseFloat((value / 10).toFixed(1))};
            }
            case tuya.dataPoints.x5hMode: {
                const lookup = {0: 'manual', 1: 'program'};
                return {preset: lookup[value]};
            }
            case tuya.dataPoints.x5hSensorSelection: {
                const lookup = {0: 'internal', 1: 'external', 2: 'both'};
                return {sensor: lookup[value]};
            }
            case tuya.dataPoints.x5hOutputReverse: {
                return {output_reverse: value};
            }
            default: {
                meta.logger.warn(`fromZigbee:x5h_thermostat: Unrecognized DP #${dp} with data ${JSON.stringify(dpValue)}`);
            }
            }
        },
    },
    humidity10: {
        cluster: 'msRelativeHumidity',
        type: ['attributeReport', 'readResponse'],
        options: [exposes.options.precision('humidity'), exposes.options.calibration('humidity')],
        convert: (model, msg, publish, options, meta) => {
            const humidity = parseFloat(msg.data['measuredValue']) / 10.0;
            if (humidity >= 0 && humidity <= 100) {
                return {humidity: utils.calibrateAndPrecisionRoundOptions(humidity, options, 'humidity')};
            }
        },
    },
    temperature_unit: {
        cluster: 'manuSpecificTuya_2',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty('57355')) {
                result.temperature_unit = {'0': 'celsius', '1': 'fahrenheit'}[msg.data['57355']];
            }
            return result;
        },
    },
};

module.exports = [
    {
        zigbeeModel: ['TS0204'],
        model: 'TS0204',
        vendor: 'TuYa',
        description: 'Gas sensor',
        fromZigbee: [fz.ias_gas_alarm_1, fz.ignore_basic_report],
        toZigbee: [],
        exposes: [e.gas(), e.tamper()],
    },
    {
        zigbeeModel: ['TS0205'],
        model: 'TS0205',
        vendor: 'TuYa',
        description: 'Smoke sensor',
        fromZigbee: [fz.ias_smoke_alarm_1, fz.battery, fz.ignore_basic_report],
        toZigbee: [],
        exposes: [e.smoke(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['TS0111'],
        model: 'TS0111',
        vendor: 'TuYa',
        description: 'Socket',
        extend: extend.switch(),
    },
    {
        zigbeeModel: ['TS0218'],
        model: 'TS0218',
        vendor: 'TuYa',
        description: 'Button',
        fromZigbee: [fz.legacy.TS0218_click, fz.battery],
        exposes: [e.battery(), e.action(['click'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0203'],
        model: 'TS0203',
        vendor: 'TuYa',
        description: 'Door sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ignore_basic_report, fz.ias_contact_alarm_1_report],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery(), e.battery_voltage()],
        whiteLabel: [{vendor: 'CR Smart Home', model: 'TS0203'}, {vendor: 'TuYa', model: 'iH-F001'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            try {
                const endpoint = device.getEndpoint(1);
                await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
                await reporting.batteryPercentageRemaining(endpoint);
                await reporting.batteryVoltage(endpoint);
            } catch (error) {/* Fails for some*/}
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_bq5c8xfe'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_bjawzodf'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_qyflbnbj'}],
        model: 'TS0601_temperature_humidity_sensor',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.tuya_temperature_humidity_sensor],
        toZigbee: [],
        exposes: (device, options) => {
            const exps = [e.temperature(), e.humidity(), e.battery()];
            if (!device || device.manufacturerName === '_TZE200_qyflbnbj') {
                exps.push(e.battery_low());
                exps.push(exposes.enum('battery_level', ea.STATE, ['low', 'middle', 'high']).withDescription('Battery level state'));
            }
            exps.push(e.linkquality());
            return exps;
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_vzqtvljm'}],
        model: 'TS0601_illuminance_temperature_humidity_sensor',
        vendor: 'TuYa',
        description: 'Illuminance, temperature & humidity sensor',
        fromZigbee: [fz.tuya_illuminance_temperature_humidity_sensor],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.illuminance_lux(), e.battery()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_8ygsuhe1'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_yvx5lh6k'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ryfmq5rl'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_c2fmom5z'}],
        model: 'TS0601_air_quality_sensor',
        vendor: 'TuYa',
        description: 'Air quality sensor',
        fromZigbee: [fz.tuya_air_quality],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.co2(), e.voc().withUnit('ppm'), e.formaldehyd()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_dwcarsat'}],
        model: 'TS0601_smart_air_house_keeper',
        vendor: 'TuYa',
        description: 'Smart air house keeper',
        fromZigbee: [fz.tuya_air_quality],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.co2(), e.voc(), e.formaldehyd().withUnit('ppm'),
            e.pm25().withValueMin(0).withValueMax(999).withValueStep(1)],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_ogkdpgy2'}],
        model: 'TS0601_co2_sensor',
        vendor: 'TuYa',
        description: 'NDIR co2 sensor',
        fromZigbee: [fz.tuya_air_quality],
        toZigbee: [],
        exposes: [e.co2()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_7bztmfm1'}],
        model: 'TS0601_smart_CO_air_box',
        vendor: 'TuYa',
        description: 'Smart air box (carbon monoxide)',
        fromZigbee: [fz.tuya_CO],
        toZigbee: [],
        exposes: [e.carbon_monoxide(), e.co()],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_ggev5fsl', '_TZE200_u319yc66']),
        model: 'TS0601_gas_sensor',
        vendor: 'TuYa',
        description: 'gas sensor',
        fromZigbee: [tuya.fzDataPoints],
        toZigbee: [tuya.tzDataPoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.gas(), tuya.exposes.selfTest(), tuya.exposes.selfTestResult(), tuya.exposes.faultAlarm(), tuya.exposes.silence()],
        meta: {
            tuyaDatapoints: [
                [1, 'gas', tuya.valueConverter.true0ElseFalse],
                [8, 'self_test', tuya.valueConverter.raw],
                [9, 'self_test_result', tuya.valueConverter.selfTestResult],
                [11, 'fault_alarm', tuya.valueConverter.trueFalse],
                [16, 'silence', tuya.valueConverter.raw],
            ],
        },
    },
    {
        fingerprint: [{modelID: 'TS0001', manufacturerName: '_TZ3000_hktqahrq'}, {manufacturerName: '_TZ3000_hktqahrq'},
            {manufacturerName: '_TZ3000_q6a3tepg'}, {modelID: 'TS000F', manufacturerName: '_TZ3000_m9af2l6g'},
            {modelID: 'TS000F', manufacturerName: '_TZ3000_mx3vgyea'},
            {modelID: 'TS000F', manufacturerName: '_TZ3000_xkap8wtb'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_npzfdcof'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_5ng23zjs'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_rmjr4ufz'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_v7gnj3ad'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_ark8nv4y'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_mx3vgyea'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_qsp2pwtf'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_46t1rvdu'}],
        model: 'WHD02',
        vendor: 'TuYa',
        whiteLabel: [{vendor: 'TuYa', model: 'iHSW02'}],
        description: 'Wall switch module',
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_switch_type]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_switch_type]),
        exposes: extend.switch().exposes.concat([e.power_on_behavior(), e.switch_type_2()]),
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_mvn6jl7x'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_raviyuvk'}, {modelID: 'TS011F', manufacturerName: '_TYZB01_hlla45kx'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_92qd4sqa'}, {modelID: 'TS011F', manufacturerName: '_TZ3000_zwaadvus'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_k6fvknrr'}],
        model: 'TS011F_2_gang_wall',
        vendor: 'TuYa',
        description: '2 gang wall outlet',
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_backlight_mode]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_backlight_mode]),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'),
            exposes.enum('power_on_behavior', ea.ALL, ['on', 'off', 'previous']),
            exposes.enum('backlight_mode', ea.ALL, ['LOW', 'MEDIUM', 'HIGH'])],
        whiteLabel: [{vendor: 'ClickSmart+', model: 'CMA30036'}],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
        },
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_rk2yzt0u'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_o4cjetlm'}, {manufacturerName: '_TZ3000_o4cjetlm'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_iedbgyxt'}, {modelID: 'TS0001', manufacturerName: '_TZ3000_h3noz0a5'},
            {modelID: 'TS0001', manufacturerName: '_TYZB01_4tlksk8a'}, {modelID: 'TS0011', manufacturerName: '_TYZB01_rifa0wlb'}],
        model: 'ZN231392',
        vendor: 'TuYa',
        description: 'Smart water/gas valve',
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior]),
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior]),
        exposes: extend.switch().exposes.concat([e.power_on_behavior()]),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genOnOff', ['onOff', 'moesStartUpOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_1hwjutgo'}, {modelID: 'TS011F', manufacturerName: '_TZ3000_lnggrqqi'}],
        model: 'TS011F_circuit_breaker',
        vendor: 'TuYa',
        description: 'Circuit breaker',
        extend: extend.switch(),
        whiteLabel: [{vendor: 'Mumubiz', model: 'ZJSB9-80Z'}],
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_8fdayfch'}],
        model: 'TS011F_relay_switch',
        vendor: 'TuYa',
        description: 'Dry contact relay switch',
        extend: extend.switch(),
        whiteLabel: [{vendor: 'KTNNKG', model: 'ZB1248-10A'}],
    },
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3000_qqjaziws'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_jtmhndw2'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_ezlg0pht'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_3lbtuxgp'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_5snkkrxw'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_12sxjap4'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_x2fqbdun'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_589kq4ul'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_1mtktxdk'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_remypqqm'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_kohbva1f'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_luit1t00'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_r5afgmkl'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_wslkvrau'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_0rn9qhnu'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_ejctepku'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_bicjqpg4'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_jmiuubkz'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_cmaky9gq'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_tza2vjxx'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_it1u8ahz'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_k1pe6ibm'},
            {modelID: 'TS0505B', manufacturerName: '_TZB210_1ecortg6'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_e020aaaj'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_bfwvfyx1'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_leyz4rju'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_jd3z4yig'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_dgdjiw1c'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_mzdax7ha'},
            {modelID: 'TS0505B', manufacturerName: '_TZB210_tmi0rihb'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_a4s41wm4'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_awrucboq'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_ijczzg9h'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_qxenlrin'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_vaiyrvd1'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_iwbaamgh'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_klv2wul0'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_s6zec0of'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_y5fjkn7x'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_cuqkfz2q'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_6amjviba'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3000_xr5m6kfg'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_xr5m6kfg'},
            {modelID: 'TS0505B', manufacturerName: '_TZ3210_bf175wi4'},
            {modelID: 'TS0505B', manufacturerName: '_TZB210_3zfp8mki'}],
        model: 'TS0505B',
        vendor: 'TuYa',
        description: 'Zigbee RGB+CCT light',
        whiteLabel: [{vendor: 'Mercator Ikuü', model: 'SMD4106W-RGB-ZB'},
            {vendor: 'TuYa', model: 'A5C-21F7-01'}, {vendor: 'Mercator Ikuü', model: 'S9E27LED9W-RGB-Z'},
            {vendor: 'Aldi', model: 'L122CB63H11A9.0W', description: 'LIGHTWAY smart home LED-lamp - bulb'},
            {vendor: 'Lidl', model: '14153706L', description: 'Livarno smart LED ceiling light'},
            {vendor: 'Zemismart', model: 'LXZB-ZB-09A', description: 'Zemismart LED Surface Mounted Downlight 9W RGBW'},
        ],
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500], disableColorTempStartup: true}),
        meta: {applyRedFix: true, enhancedHue: false},
    },
    {
        fingerprint: [{modelID: 'TS0503B', manufacturerName: '_TZ3000_i8l0nqdu'},
            {modelID: 'TS0503B', manufacturerName: '_TZ3210_a5fxguxr'},
            {modelID: 'TS0503B', manufacturerName: '_TZ3210_778drfdt'},
            {modelID: 'TS0503B', manufacturerName: '_TZ3000_g5xawfcq'},
            {modelID: 'TS0503B', manufacturerName: '_TZ3210_trm3l2aw'},
            {modelID: 'TS0503B', manufacturerName: '_TZ3210_95txyzbx'},
            {modelID: 'TS0503B', manufacturerName: '_TZ3210_odlghna1'},
            {modelID: 'TS0503B', manufacturerName: '_TZB210_nfzrlz29'},
            {modelID: 'TS0503B', manufacturerName: '_TZ3220_wp1k8xws'},
            {modelID: 'TS0503B', manufacturerName: '_TZ3210_wp1k8xws'}],
        model: 'TS0503B',
        vendor: 'TuYa',
        description: 'Zigbee RGB light',
        extend: extend.light_onoff_brightness_color(),
        // Requires red fix: https://github.com/Koenkk/zigbee2mqtt/issues/5962#issue-796462106
        meta: {applyRedFix: true, enhancedHue: false},
    },
    {
        fingerprint: [{modelID: 'TS0504B', manufacturerName: '_TZ3000_ukuvyhaa'},
            {modelID: 'TS0504B', manufacturerName: '_TZ3210_bfvybixd'},
            {modelID: 'TS0504B', manufacturerName: '_TZ3210_i2i0bsnv'},
            {modelID: 'TS0504B', manufacturerName: '_TZ3210_elzv6aia'},
            {modelID: 'TS0504B', manufacturerName: '_TZ3210_1elppmba'},
            {modelID: 'TS0504B', manufacturerName: '_TZB210_5jn6an2y'},
            {modelID: 'TS0504B', manufacturerName: '_TZ3210_onejz0gt'}],
        model: 'TS0504B',
        vendor: 'TuYa',
        description: 'Zigbee RGBW light',
        extend: extend.light_onoff_brightness_color(),
        toZigbee: utils.replaceInArray(extend.light_onoff_brightness_color().toZigbee, [tz.light_color], [tzLocal.TS0504B_color]),
        meta: {applyRedFix: true},
    },
    {
        fingerprint: [{modelID: 'TS0501A', manufacturerName: '_TZ3000_yeg1e5eh'}],
        model: 'TS0501A',
        description: 'Zigbee light',
        vendor: 'TuYa',
        extend: extend.light_onoff_brightness(),
    },
    {
        fingerprint: [{modelID: 'TS0501B', manufacturerName: '_TZ3000_4whigl8i'},
            {modelID: 'TS0501B', manufacturerName: '_TZ3210_4whigl8i'},
            {modelID: 'TS0501B', manufacturerName: '_TZ3210_9q49basr'},
            {modelID: 'TS0501B', manufacturerName: '_TZ3210_i680rtja'},
            {modelID: 'TS0501B', manufacturerName: '_TZ3210_grnwgegn'},
            {modelID: 'TS0501B', manufacturerName: '_TZ3210_nehayyhx'},
            {modelID: 'TS0501B', manufacturerName: '_TZ3210_wuheofsg'},
            {modelID: 'TS0501B', manufacturerName: '_TZ3210_e5t9bfdv'},
            {modelID: 'TS0501B', manufacturerName: '_TZ3210_19qb27da'},
            {modelID: 'TS0501B', manufacturerName: '_TZ3210_aurnbfv4'},
            {modelID: 'TS0501B', manufacturerName: '_TZ3210_4zinq6io'},
            {modelID: 'TS0501B', manufacturerName: '_TZ3210_93gnbdgz'}],
        model: 'TS0501B',
        description: 'Zigbee light',
        vendor: 'TuYa',
        extend: extend.light_onoff_brightness(),
    },
    {
        fingerprint: tuya.fingerprint('TS0202', ['_TZ3210_cwamkvua']),
        model: 'TS0202_2',
        vendor: 'TuYa',
        description: 'Motion sensor with scene switch',
        fromZigbee: [tuya.fzDataPoints, fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [tuya.tzDataPoints],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        whiteLabel: [{vendor: 'Linkoze', model: 'LKMSZ001'}],
        exposes: [e.battery(), e.battery_voltage(), e.occupancy(), e.action(['single', 'double', 'hold']),
            exposes.enum('light', ea.STATE, ['dark', 'bright'])],
        meta: {
            tuyaDatapoints: [
                [102, 'light', tuya.valueConverterBasic.lookup({'dark': true, 'bright': false})],
                [101, 'action', tuya.valueConverterBasic.lookup({'single': 0, 'hold': 1, 'double': 2})],
            ],
        },
    },
    {
        fingerprint: [{modelID: 'TS0202', manufacturerName: '_TYZB01_jytabjkb'},
            {modelID: 'TS0202', manufacturerName: '_TZ3000_lltemgsf'},
            {modelID: 'TS0202', manufacturerName: '_TZ3000_mg4dy6z6'}],
        model: 'TS0202_1',
        vendor: 'TuYa',
        description: 'Motion sensor',
        // Requires alarm_1_with_timeout https://github.com/Koenkk/zigbee2mqtt/issues/2818#issuecomment-776119586
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout, fz.battery, fz.ignore_basic_report],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.linkquality(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0202', manufacturerName: '_TYZB01_dr6sduka'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_ef5xlc9q'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_vwqnz1sn'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_2b8f6cio'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_71kfvvma'},
            {modelID: 'TS0202', manufacturerName: '_TZE200_bq5c8xfe'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_dl7cejts'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_qjqgmqxr'},
            {modelID: 'TS0202', manufacturerName: '_TZ3000_mmtwjmaq'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_zwvaj5wy'},
            {modelID: 'TS0202', manufacturerName: '_TZ3000_bsvqrxru'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_tv3wxhcz'},
            {modelID: 'TS0202', manufacturerName: '_TYZB01_hqbdru35'},
            {modelID: 'TS0202', manufacturerName: '_TZ3000_otvn3lne'},
            {modelID: 'TS0202', manufacturerName: '_TZ3000_tiwq83wk'},
            {modelID: 'TS0202', manufacturerName: '_TZ3000_ykwcwxmz'},
            {modelID: 'TS0202', manufacturerName: '_TZ3000_hgu1dlak'},
            {modelID: 'TS0202', manufacturerName: '_TZ3000_h4wnrtck'},
            {modelID: 'WHD02', manufacturerName: '_TZ3000_hktqahrq'}],
        model: 'TS0202',
        vendor: 'TuYa',
        description: 'Motion sensor',
        whiteLabel: [{vendor: 'Mercator Ikuü', model: 'SMA02P'},
            {vendor: 'TuYa', model: 'TY-ZPR06'},
            {vendor: 'Tesla Smart', model: 'TS0202'}],
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.ignore_basic_report, fz.ias_occupancy_alarm_1_report],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            try {
                await reporting.batteryPercentageRemaining(endpoint);
            } catch (error) {/* Fails for some https://github.com/Koenkk/zigbee2mqtt/issues/13708*/}
        },
    },
    {
        fingerprint: [{modelID: 'TS0202', manufacturerName: '_TZ3000_msl6wxk9'}, {modelID: 'TS0202', manufacturerName: '_TZ3040_fwxuzcf4'}],
        model: 'ZM-35H-Q',
        vendor: 'TuYa',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.ignore_basic_report, fz.ZM35HQ_attr, fzLocal.ZM35HQ_battery],
        toZigbee: [tz.ZM35HQ_attr],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery(),
            exposes.enum('sensitivity', ea.ALL, ['low', 'medium', 'high']).withDescription('PIR sensor sensitivity'),
            exposes.enum('keep_time', ea.ALL, [30, 60, 120]).withDescription('PIR keep time in seconds'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
        },
    },
    {
        fingerprint: [{modelID: 'TS0202', manufacturerName: '_TZ3040_msl6wxk9'}],
        model: '40ZH-O',
        vendor: 'TuYa',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.ignore_basic_report, fz.ZM35HQ_attr, fzLocal.ZM35HQ_battery],
        toZigbee: [tz.ZM35HQ_attr],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery(),
            exposes.enum('sensitivity', ea.ALL, ['low', 'medium', 'high']).withDescription('PIR sensor sensitivity'),
            exposes.enum('keep_time', ea.ALL, [30, 60, 120]).withDescription('PIR keep time in seconds'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0202', ['_TZ3000_mcxw5ehu', '_TZ3040_6ygjfyll']),
        model: 'IH012-RT01',
        vendor: 'TuYa',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.ignore_basic_report, fz.ZM35HQ_attr],
        toZigbee: [tz.ZM35HQ_attr],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(),
            exposes.enum('sensitivity', ea.ALL, ['low', 'medium', 'high']).withDescription('PIR sensor sensitivity'),
            exposes.enum('keep_time', ea.ALL, [30, 60, 120]).withDescription('PIR keep time in seconds'),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0207', manufacturerName: '_TZ3000_m0vaazab'},
            {modelID: 'TS0207', manufacturerName: '_TZ3000_ufttklsz'},
            {modelID: 'TS0207', manufacturerName: '_TZ3000_nkkl7uzv'},
            {modelID: 'TS0207', manufacturerName: '_TZ3000_gszjt2xx'},
            {modelID: 'TS0207', manufacturerName: '_TZ3000_5k5vh43t'}],
        model: 'TS0207_repeater',
        vendor: 'TuYa',
        description: 'Repeater',
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [],
    },
    {
        zigbeeModel: ['TS0207', 'FNB54-WTS08ML1.0'],
        fingerprint: [{modelID: 'TS0207', manufacturerName: '_TZ3000_upgcbody'}],
        model: 'TS0207_water_leak_detector',
        vendor: 'TuYa',
        description: 'Water leak detector',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        whiteLabel: [{vendor: 'CR Smart Home', model: 'TS0207'}],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.water_leak(), e.battery_low(), e.battery()],
    },
    {
        fingerprint: [{modelID: 'TS0101', manufacturerName: '_TYZB01_ijihzffk'}],
        model: 'TS0101',
        vendor: 'TuYa',
        description: 'Zigbee Socket',
        whiteLabel: [{vendor: 'Larkkey', model: 'PS080'}],
        extend: extend.switch(),
        meta: {disableDefaultResponse: true},
    },
    {
        fingerprint: [{modelID: 'TS0108', manufacturerName: '_TYZB01_7yidyqxd'}],
        model: 'TS0108',
        vendor: 'TuYa',
        description: 'Socket with 2 USB',
        whiteLabel: [{vendor: 'Larkkey', model: 'PS580'}],
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 7};
        },
        meta: {multiEndpoint: true, disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(7), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_whpb9yts'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ebwgzdqq'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_9i9dt8is'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_dfxkcots'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_w4cryh2i'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ojzhk75b'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_swaamsoy'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_3p5ydos3'},
        ],
        model: 'TS0601_dimmer',
        vendor: 'TuYa',
        description: 'Zigbee smart dimmer',
        fromZigbee: [fz.tuya_dimmer, fz.ignore_basic_report],
        toZigbee: [tz.tuya_dimmer_state, tz.tuya_dimmer_level],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
        exposes: [e.light_brightness().withMinBrightness().withMaxBrightness().setAccess(
            'state', ea.STATE_SET).setAccess('brightness', ea.STATE_SET).setAccess(
            'min_brightness', ea.STATE_SET).setAccess('max_brightness', ea.STATE_SET)],
        whiteLabel: [
            {vendor: 'Larkkey', model: 'ZSTY-SM-1DMZG-EU'},
            {vendor: 'Earda', model: 'EDM-1ZAA-EU'},
            {vendor: 'Earda', model: 'EDM-1ZAB-EU'},
            {vendor: 'Earda', model: 'EDM-1ZBA-EU'},
            {vendor: 'Mercator Ikuü', model: 'SSWD01'},
            {vendor: 'Moes', model: 'ZS-USD'},
            {vendor: 'Moes', model: 'EDM-1ZBB-EU'},
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_ip2akl4w', '_TZE200_1agwnems', '_TZE200_la2c2uo9', '_TZE200_579lguh2']),
        model: 'TS0601_dimmer_1',
        vendor: 'TuYa',
        description: '1 gang smart dimmer',
        fromZigbee: [tuya.fzDataPoints],
        toZigbee: [tuya.tzDataPoints],
        configure: tuya.configureMagicPacket,
        exposes: [tuya.exposes.lightBrightnessWithMinMax(), tuya.exposes.powerOnBehavior(),
            tuya.exposes.countdown(), tuya.exposes.lightType()],
        meta: {
            tuyaDatapoints: [
                [1, 'state', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [2, 'brightness', tuya.valueConverter.scale0_254to0_1000],
                [3, 'min_brightness', tuya.valueConverter.scale0_254to0_1000],
                [4, 'light_type', tuya.valueConverter.lightType],
                [5, 'max_brightness', tuya.valueConverter.scale0_254to0_1000],
                [6, 'countdown', tuya.valueConverter.countdown],
                [14, 'power_on_behavior', tuya.valueConverter.powerOnBehavior],
            ],
        },
        whiteLabel: [
            {vendor: 'Moes', model: 'MS-105Z'},
            {vendor: 'Lerlink', model: 'X706U'},
            {vendor: 'Moes', model: 'ZS-EUD_1gang'},
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_fjjbhx9d']),
        model: 'TS0601_dimmer_2',
        vendor: 'TuYa',
        description: '2 gang smart dimmer',
        fromZigbee: [tuya.fzDataPoints],
        toZigbee: [tuya.tzDataPoints],
        configure: tuya.configureMagicPacket,
        exposes: [tuya.exposes.lightBrightness().withEndpoint('l1'), tuya.exposes.lightBrightness().withEndpoint('l2')],
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [2, 'brightness_l1', tuya.valueConverter.scale0_254to0_1000],
                [7, 'state_l2', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [8, 'brightness_l2', tuya.valueConverter.scale0_254to0_1000],
            ],
        },
        endpoint: (device) => {
            return {'l1': 1, 'l2': 1};
        },
        whiteLabel: [
            {vendor: 'Moes', model: 'ZS-EUD_2gang'},
        ],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_vm1gyrso']),
        model: 'TS0601_dimmer_3',
        vendor: 'TuYa',
        description: '3 gang smart dimmer',
        fromZigbee: [tuya.fzDataPoints],
        toZigbee: [tuya.tzDataPoints],
        configure: tuya.configureMagicPacket,
        exposes: [tuya.exposes.lightBrightness().withEndpoint('l1'), tuya.exposes.lightBrightness().withEndpoint('l2'),
            tuya.exposes.lightBrightness().withEndpoint('l3')],
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [2, 'brightness_l1', tuya.valueConverter.scale0_254to0_1000],
                [7, 'state_l2', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [8, 'brightness_l2', tuya.valueConverter.scale0_254to0_1000],
                [15, 'state_l3', tuya.valueConverter.onOff, {skip: tuya.skip.stateOnAndBrightnessPresent}],
                [16, 'brightness_l3', tuya.valueConverter.scale0_254to0_1000],
            ],
        },
        endpoint: (device) => {
            return {'l1': 1, 'l2': 1, 'l3': 1};
        },
        whiteLabel: [
            {vendor: 'Moes', model: 'ZS-EUD_3gang'},
        ],
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_oiymh3qu'}],
        model: 'TS011F_socket_module',
        vendor: 'TuYa',
        description: 'Socket module',
        extend: extend.switch(),
        whiteLabel: [{vendor: 'LoraTap', model: 'RR400ZB'}, {vendor: 'LoraTap', model: 'SP400ZB'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_wxtp7c5y'},
            {modelID: 'TS011F', manufacturerName: '_TYZB01_mtunwanm'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_o1jzcxou'}],
        model: 'TS011F_wall_outlet',
        vendor: 'TuYa',
        description: 'In-wall outlet',
        extend: extend.switch(),
        whiteLabel: [{vendor: 'Teekar', model: 'SWP86-01OG'},
            {vendor: 'ClickSmart+', model: 'CMA30035'},
            {vendor: 'BSEED', model: 'Zigbee Socket'}],
    },
    {
        fingerprint: [{modelID: 'isltm67\u0000', manufacturerName: '_TYST11_pisltm67'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_pisltm67'}],
        model: 'S-LUX-ZB',
        vendor: 'TuYa',
        description: 'Light sensor',
        fromZigbee: [fz.SLUXZB],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [e.battery(), e.illuminance_lux(), e.linkquality(),
            exposes.enum('brightness_level', ea.STATE, ['LOW', 'MEDIUM', 'HIGH'])],
    },
    {
        zigbeeModel: ['TS130F'],
        model: 'TS130F',
        vendor: 'TuYa',
        description: 'Curtain/blind switch',
        fromZigbee: [fz.cover_position_tilt, fz.tuya_backlight_mode, fz.tuya_cover_options],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.tuya_cover_calibration, tz.tuya_cover_reversal, tz.tuya_backlight_mode],
        meta: {coverInverted: true},
        whiteLabel: [{vendor: 'LoraTap', model: 'SC400'}],
        exposes: [e.cover_position(), exposes.enum('moving', ea.STATE, ['UP', 'STOP', 'DOWN']),
            exposes.binary('calibration', ea.ALL, 'ON', 'OFF'), exposes.binary('motor_reversal', ea.ALL, 'ON', 'OFF'),
            exposes.enum('backlight_mode', ea.ALL, ['LOW', 'MEDIUM', 'HIGH']),
            exposes.numeric('calibration_time', ea.STATE).withUnit('S').withDescription('Calibration time')],
    },
    {
        zigbeeModel: ['qnazj70', 'kjintbl'],
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_wunufsil'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_vhy3iakz'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_oisqyl4o'},
            {modelID: 'TS0601', manufacturerName: '_TZ3000_uim07oem'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_js3mgbjb'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_7deq70b8'},
        ],
        model: 'TS0601_switch',
        vendor: 'TuYa',
        description: '1, 2, 3 or 4 gang switch',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET), e.switch().withEndpoint('l4').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, fz.tuya_switch],
        toZigbee: [tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        whiteLabel: [
            {vendor: 'Norklmes', model: 'MKS-CM-W5'},
            {vendor: 'Somgoms', model: 'ZSQB-SMB-ZB'},
            {vendor: 'Moes', model: 'WS-EUB1-ZG'},
            {vendor: 'AVATTO', model: 'ZGB-WS-EU'},
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(3)) await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(4)) await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1};
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_aqnazj70'}, {modelID: 'TS0601', manufacturerName: '_TZE200_k6jhsr0q'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_di3tfv5b'}],
        model: 'TS0601_switch_4_gang',
        vendor: 'TuYa',
        description: '4 gang switch',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l4').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, fz.tuya_switch],
        toZigbee: [tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1};
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_jwsjbxjs']),
        model: 'TS0601_switch_5_gang',
        vendor: 'TuYa',
        description: '5 gang switch',
        fromZigbee: [tuya.fzDataPoints],
        toZigbee: [tuya.tzDataPoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            tuya.exposes.switch().withEndpoint('l1'),
            tuya.exposes.switch().withEndpoint('l2'),
            tuya.exposes.switch().withEndpoint('l3'),
            tuya.exposes.switch().withEndpoint('l4'),
            tuya.exposes.switch().withEndpoint('l5'),
        ],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1, 'l5': 1};
        },
        meta: {
            multiEndpoint: true,
            tuyaDatapoints: [
                [1, 'state_l1', tuya.valueConverter.onOff],
                [2, 'state_l2', tuya.valueConverter.onOff],
                [3, 'state_l3', tuya.valueConverter.onOff],
                [4, 'state_l4', tuya.valueConverter.onOff],
                [5, 'state_l5', tuya.valueConverter.onOff],
            ],
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_nkjintbl'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ji1gn7rw'},
        ],
        model: 'TS0601_switch_2_gang',
        vendor: 'TuYa',
        description: '2 gang switch',
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, fz.tuya_switch],
        toZigbee: [tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            if (device.getEndpoint(2)) await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1};
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_kyfqmmyl'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_2hf7x9n3'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_bynnczcb'}],
        model: 'TS0601_switch_3_gang',
        vendor: 'TuYa',
        description: '3 gang switch',
        whiteLabel: [{vendor: 'NOVADIGITAL', model: 'WS-US-ZB', description: 'Interruptor touch Zigbee 3 Teclas'}],
        exposes: [e.switch().withEndpoint('l1').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l2').setAccess('state', ea.STATE_SET),
            e.switch().withEndpoint('l3').setAccess('state', ea.STATE_SET)],
        fromZigbee: [fz.ignore_basic_report, fz.tuya_switch],
        toZigbee: [tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1, 'l3': 1};
        },
    },
    {
        fingerprint: [{modelID: 'TS0215A', manufacturerName: '_TZ3000_4fsgukof'},
            {modelID: 'TS0215A', manufacturerName: '_TZ3000_wr2ucaj9'},
            {modelID: 'TS0215A', manufacturerName: '_TZ3000_zsh6uat3'},
            {modelID: 'TS0215A', manufacturerName: '_TZ3000_tj4pwzzm'}],
        model: 'TS0215A_sos',
        vendor: 'TuYa',
        description: 'SOS button',
        fromZigbee: [fz.command_emergency, fz.battery],
        exposes: [e.battery(), e.action(['emergency'])],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genTime', 'genBasic', 'ssIasAce', 'ssIasZone']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0215A', manufacturerName: '_TZ3000_p6ju8myv'},
            {modelID: 'TS0215A', manufacturerName: '_TZ3000_0zrccfgx'},
            {modelID: 'TS0215A', manufacturerName: '_TZ3000_fsiepnrh'}],
        model: 'TS0215A_remote',
        vendor: 'TuYa',
        description: 'Security remote control',
        fromZigbee: [fz.command_arm, fz.command_emergency, fz.battery],
        exposes: [e.battery(), e.action(['disarm', 'arm_day_zones', 'arm_night_zones', 'arm_all_zones', 'exit_delay', 'emergency'])],
        toZigbee: [],
        whiteLabel: [{vendor: 'Woox', model: 'R7054'}, {vendor: 'Nedis', model: 'ZBRC10WT'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genTime', 'genBasic', 'ssIasAce', 'ssIasZone']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0503A', manufacturerName: '_TZ3000_obacbukl'}],
        model: 'TS0503A',
        vendor: 'TuYa',
        description: 'Led strip controller',
        extend: extend.light_onoff_brightness_color(),
        meta: {applyRedFix: true},
    },
    {
        zigbeeModel: ['TS0503A'],
        model: 'TYZS1L',
        vendor: 'TuYa',
        description: 'Led strip controller HSB',
        exposes: [e.light_colorhs()],
        fromZigbee: [fz.on_off, fz.tuya_led_controller],
        toZigbee: [tz.tuya_led_controller, tz.ignore_transition, tz.ignore_rate],
    },
    {
        zigbeeModel: ['TS0502A'],
        model: 'TS0502A',
        vendor: 'TuYa',
        description: 'Light controller',
        extend: extend.light_onoff_brightness_colortemp(),
    },
    {
        fingerprint: [
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_s1x7gcq0'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_hi1ym4bl'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3000_muqovqv0'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_qjdimezy'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_psgq7ysz'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3000_zw7wr5uo'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_ok08rifa'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_pz9zmxjj'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3000_fzwhym79'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3000_ogceypug'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_rm0hthdo'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_zwqnazkb'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_ijsj2evj'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_pgq2qvyv'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_nvaik6gk'},
            {modelID: 'TS0502B', manufacturerName: '_TZB210_rkgngb5o'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3000_armwcncd'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_2p6wbry3'},
            {modelID: 'TS0502B', manufacturerName: '_TZB210_nfzrlz29'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_qamcypen'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_zdrhqmo0'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3210_2cjfbpy0'},
            {modelID: 'TS0502B', manufacturerName: '_TZ3000_bujv0r9b'},
        ],
        model: 'TS0502B',
        vendor: 'TuYa',
        description: 'Light controller',
        whiteLabel: [
            {vendor: 'Mercator Ikuü', model: 'SMI7040', description: 'Ford Batten Light'},
            {vendor: 'Mercator Ikuü', model: 'SMD9300', description: 'Donovan Panel Light'},
        ],
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 500]}),
    },
    {
        fingerprint: [{modelID: 'TS0504A', manufacturerName: '_TZ3000_nzbm4ad4'}],
        model: 'TS0504A',
        vendor: 'TuYa',
        description: 'RGBW LED controller',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        fingerprint: [{modelID: 'TS0505A', manufacturerName: '_TZ3000_sosdczdl'}],
        model: 'TS0505A_led',
        vendor: 'TuYa',
        description: 'RGB+CCT LED',
        toZigbee: [tz.on_off, tz.tuya_led_control],
        fromZigbee: [fz.on_off, fz.tuya_led_controller, fz.brightness, fz.ignore_basic_report],
        exposes: [e.light_brightness_colortemp_colorhs([153, 500]).removeFeature('color_temp_startup')],
    },
    {
        zigbeeModel: ['TS0505A'],
        model: 'TS0505A',
        vendor: 'TuYa',
        description: 'RGB+CCT light controller',
        extend: extend.light_onoff_brightness_colortemp_color(),
    },
    {
        fingerprint: [{manufacturerName: '_TZ2000_a476raq2'}],
        zigbeeModel: ['TS0201', 'SNTZ003'],
        model: 'TS0201',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor with display',
        whiteLabel: [{vendor: 'BlitzWolf', model: 'BW-IS4'}],
        fromZigbee: [fzLocal.TS0201_battery, fz.temperature, fzLocal.TS0201_humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
        },
    },
    {
        fingerprint: [
            {modelID: 'TS0201', manufacturerName: '_TZ3000_bguser20'},
            {modelID: 'TS0201', manufacturerName: '_TZ3000_fllyghyj'},
            {modelID: 'TS0201', manufacturerName: '_TZ3000_yd2e749y'},
            {modelID: 'TS0201', manufacturerName: '_TZ3000_6uzkisv2'},
        ],
        model: 'WSD500A',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fzLocal.TS0201_battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
        },
    },
    {
        fingerprint: tuya.fingerprint('TS0201', ['_TZ3000_dowj6gyi', '_TZ3000_8ybe88nf']),
        model: 'IH-K009',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fzLocal.TS0201_battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
        },
    },
    {
        fingerprint: [{modelID: 'SM0201', manufacturerName: '_TYZB01_cbiezpds'}],
        model: 'SM0201',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor with LED screen',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_3zofvcaa'}],
        model: 'TS011F_2_gang_2_usb_wall',
        vendor: 'TuYa',
        description: '2 gang 2 usb wall outlet',
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_backlight_mode]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_backlight_mode]),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'), exposes.enum('power_on_behavior', ea.ALL, ['on', 'off', 'previous']),
            exposes.enum('backlight_mode', ea.ALL, ['LOW', 'MEDIUM', 'HIGH']),
        ],
        endpoint: () => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).read('genBasic',
                ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
            for (const endpointID of [1, 2, 3, 4]) {
                const endpoint = device.getEndpoint(endpointID);
                await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
                await reporting.onOff(endpoint);
            }
        },
    },
    {
        zigbeeModel: ['TS0041'],
        fingerprint: [{manufacturerName: '_TZ3000_tk3s5tyg'}],
        model: 'TS0041',
        vendor: 'TuYa',
        description: 'Wireless switch with 1 button',
        whiteLabel: [{vendor: 'Smart9', model: 'S9TSZGB'}, {vendor: 'Lonsonho', model: 'TS0041'}, {vendor: 'Benexmart', model: 'ZM-sui1'}],
        exposes: [e.battery(), e.action(['single', 'double', 'hold'])],
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
        toZigbee: [],
        configure: tuya.configureMagicPacket,
        /*
         * reporting.batteryPercentageRemaining removed as it was causing devices to fall of the network
         * every 1 hour, with light flashing when it happened, extremely short battery life, 2 presses for
         * action to register: https://github.com/Koenkk/zigbee2mqtt/issues/8072
         * Initially wrapped in a try catch: https://github.com/Koenkk/zigbee2mqtt/issues/6313
         */
    },
    {
        zigbeeModel: ['TS0042'],
        model: 'TS0042',
        vendor: 'TuYa',
        description: 'Wireless switch with 2 buttons',
        whiteLabel: [{vendor: 'Smart9', model: 'S9TSZGB'}, {vendor: 'Lonsonho', model: 'TS0042'},
            {vendor: 'ClickSmart+', model: 'CSPGM2075PW'}],
        exposes: [e.battery(), e.action(['1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold'])],
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
        toZigbee: [],
        configure: tuya.configureMagicPacket,
        /*
         * reporting.batteryPercentageRemaining removed as it was causing devices to fall of the network
         * every 1 hour, with light flashing when it happened, extremely short battery life, 2 presses for
         * action to register: https://github.com/Koenkk/zigbee2mqtt/issues/8072
         * Initially wrapped in a try catch: https://github.com/Koenkk/zigbee2mqtt/issues/6313
         */
    },
    {
        zigbeeModel: ['TS0043'],
        model: 'TS0043',
        vendor: 'TuYa',
        description: 'Wireless switch with 3 buttons',
        whiteLabel: [{vendor: 'Smart9', model: 'S9TSZGB'}, {vendor: 'Lonsonho', model: 'TS0043'}, {vendor: 'LoraTap', model: 'SS600ZB'}],
        exposes: [e.battery(),
            e.action(['1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold', '3_single', '3_double', '3_hold'])],
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
        toZigbee: [],
        configure: tuya.configureMagicPacket,
        /*
         * reporting.batteryPercentageRemaining removed as it was causing devices to fall of the network
         * every 1 hour, with light flashing when it happened, extremely short battery life, 2 presses for
         * action to register: https://github.com/Koenkk/zigbee2mqtt/issues/8072
         * Initially wrapped in a try catch: https://github.com/Koenkk/zigbee2mqtt/issues/6313
         */
    },
    {
        zigbeeModel: ['TS0044'],
        model: 'TS0044',
        vendor: 'TuYa',
        description: 'Wireless switch with 4 buttons',
        whiteLabel: [{vendor: 'Lonsonho', model: 'TS0044'}, {vendor: 'Haozee', model: 'ESW-OZAA-EU'},
            {vendor: 'LoraTap', model: 'SS6400ZB'}],
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
        exposes: [e.battery(), e.action(['1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold',
            '3_single', '3_double', '3_hold', '4_single', '4_double', '4_hold'])],
        toZigbee: [],
        configure: tuya.configureMagicPacket,
        /*
         * reporting.batteryPercentageRemaining removed as it was causing devices to fall of the network
         * every 1 hour, with light flashing when it happened, extremely short battery life, 2 presses for
         * action to register: https://github.com/Koenkk/zigbee2mqtt/issues/8072
         * Initially wrapped in a try catch: https://github.com/Koenkk/zigbee2mqtt/issues/6313
         */
    },
    {
        fingerprint: [{modelID: 'TS004F', manufacturerName: '_TZ3000_xabckq1v'}, {modelID: 'TS004F', manufacturerName: '_TZ3000_czuyt8lz'}],
        model: 'TS004F',
        vendor: 'TuYa',
        description: 'Wireless switch with 4 buttons',
        exposes: [e.battery(), e.action(['1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold',
            '3_single', '3_double', '3_hold', '4_single', '4_double', '4_hold'])],
        fromZigbee: [fz.battery, fz.tuya_on_off_action],
        toZigbee: [tz.tuya_operation_mode],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', [0x0004, 0x000, 0x0001, 0x0005, 0x0007, 0xfffe]);
            await endpoint.write('genOnOff', {'tuyaOperationMode': 1});
            await endpoint.read('genOnOff', ['tuyaOperationMode']);
            try {
                await endpoint.read(0xE001, [0xD011]);
            } catch (err) {/* do nothing */}
            await endpoint.read('genPowerCfg', ['batteryVoltage', 'batteryPercentageRemaining']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_qq9mpfhw'}],
        model: 'TS0601_water_sensor',
        vendor: 'TuYa',
        description: 'Water leak sensor',
        fromZigbee: [fz.tuya_water_leak, fz.ignore_basic_report],
        exposes: [e.water_leak()],
        toZigbee: [],
        whiteLabel: [{vendor: 'Neo', model: 'NAS-WS02B0'}],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_jthf7vb6'}],
        model: 'WLS-100z',
        vendor: 'TuYa',
        description: 'Water leak sensor',
        fromZigbee: [fz.ignore_basic_report, fz.ignore_tuya_raw, fz.wls100z_water_leak],
        toZigbee: [],
        onEvent: tuya.onEventSetTime,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [e.battery(), e.water_leak()],
    },
    {
        fingerprint: tuya.fingerprint('TS0001', ['_TZ3000_xkap8wtb', '_TZ3000_qnejhcsu', '_TZ3000_x3ewpzyr']),
        model: 'TS0001_power',
        description: 'Switch with power monitoring',
        vendor: 'TuYa',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.activePower(endpoint, {change: 10});
            await reporting.currentSummDelivered(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage().withAccess(ea.STATE), e.energy()],
    },
    {
        zigbeeModel: ['TS0001'],
        model: 'TS0001',
        vendor: 'TuYa',
        description: '1 gang switch',
        extend: extend.switch(),
        whiteLabel: [{vendor: 'CR Smart Home', model: 'TS0001', description: 'Valve control'}, {vendor: 'Lonsonho', model: 'X701'},
            {vendor: 'Bandi', model: 'BDS03G1'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['TS0002'],
        model: 'TS0002',
        vendor: 'TuYa',
        description: '2 gang switch',
        whiteLabel: [{vendor: 'Zemismart', model: 'ZM-CSW002-D_switch'}, {vendor: 'Lonsonho', model: 'X702'}],
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const ep1 = device.getEndpoint(1);
            try {
                await ep1.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
            } catch (e) {
                // Fails for some: https://github.com/Koenkk/zigbee2mqtt/discussions/13368
            }
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0001', manufacturerName: '_TZ3000_tqlv4ug4'}],
        model: 'TS0001_switch_module',
        vendor: 'TuYa',
        description: '1 gang switch module',
        whiteLabel: [{vendor: 'OXT', model: 'SWTZ21'}],
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_switch_type]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_switch_type]),
        exposes: extend.switch().exposes.concat([
            exposes.presets.power_on_behavior(),
            exposes.presets.switch_type_2(),
        ]),
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0002', manufacturerName: '_TZ3000_01gpyda5'}, {modelID: 'TS0002', manufacturerName: '_TZ3000_bvrlqyj7'},
            {modelID: 'TS0002', manufacturerName: '_TZ3000_7ed9cqgi'}],
        model: 'TS0002_switch_module',
        vendor: 'TuYa',
        description: '2 gang switch module',
        whiteLabel: [{vendor: 'OXT', model: 'SWTZ22'}],
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_switch_type]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_switch_type]),
        exposes: [
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            exposes.presets.power_on_behavior(),
            exposes.presets.switch_type_2(),
        ],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await device.getEndpoint(1).read('genBasic',
                ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0002', manufacturerName: '_TZ3000_fisb3ajo'}],
        model: 'TS0002_switch_module_2',
        vendor: 'TuYa',
        description: '2 gang switch module',
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior]),
        exposes: [
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            exposes.presets.power_on_behavior(),
        ],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0003', manufacturerName: '_TZ3000_vsasbzkf'},
            {modelID: 'TS0003', manufacturerName: '_TZ3000_odzoiovu'}],
        model: 'TS0003_switch_module',
        vendor: 'TuYa',
        description: '3 gang switch module',
        whiteLabel: [{vendor: 'OXT', model: 'SWTZ23'}],
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_switch_type]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_switch_type]),
        exposes: [
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            e.switch().withEndpoint('l3'),
            e.power_on_behavior(),
            e.switch_type_2(),
        ],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await device.getEndpoint(1).read('genBasic',
                ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0004', manufacturerName: '_TZ3000_ltt60asa'}],
        model: 'TS0004_switch_module',
        vendor: 'TuYa',
        description: '4 gang switch module',
        whiteLabel: [{vendor: 'OXT', model: 'SWTZ27'}],
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_switch_type]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_switch_type]),
        exposes: [
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'),
            e.power_on_behavior(),
            e.switch_type_2(),
        ],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await device.getEndpoint(1).read('genBasic',
                ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: [
            'owvfni3\u0000', 'owvfni3', 'u1rkty3', 'aabybja', // Curtain motors
            'mcdj3aq', 'mcdj3aq\u0000', // Tubular motors
        ],
        fingerprint: [
            // Curtain motors:
            {modelID: 'TS0601', manufacturerName: '_TZE200_5zbp6j0u'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_nkoabg8w'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_xuzcvlku'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_4vobcgd3'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_nogaemzt'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_r0jdjrvi'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_pk0sfzvr'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_fdtjuw7u'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_zpzndjez'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_wmcdj3aq'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_cowvfni3'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_rddyvrci'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_nueqqe6k'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_xaabybja'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_rmymn92d'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_3i3exuay'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_tvrvdj6o'},
            {modelID: 'zo2pocs\u0000', manufacturerName: '_TYST11_fzo2pocs'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_cf1sl3tj'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_b2u1drdv'},
            // Roller blinds:
            {modelID: 'TS0601', manufacturerName: '_TZE200_fctwhugx'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_zah67ekd'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_hsgrhjpf'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_pw7mji0l'},
            // Window pushers:
            {modelID: 'TS0601', manufacturerName: '_TZE200_g5wdnuow'},
            // Tubular motors:
            {modelID: 'TS0601', manufacturerName: '_TZE200_5sbebbzs'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_zuz7f94z'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_68nvbio9'},
        ],
        model: 'TS0601_cover',
        vendor: 'TuYa',
        description: 'Curtain motor/roller blind motor/window pusher/tubular motor',
        whiteLabel: [
            {vendor: 'Yushun', model: 'YS-MT750'},
            {vendor: 'Zemismart', model: 'ZM79E-DT'},
            {vendor: 'Binthen', model: 'BCM100D'},
            {vendor: 'Binthen', model: 'CV01A'},
            {vendor: 'Zemismart', model: 'M515EGB'},
            {vendor: 'OZ Smart Things', model: 'ZM85EL-1Z'},
            {vendor: 'TuYa', model: 'M515EGZT'},
            {vendor: 'TuYa', model: 'DT82LEMA-1.2N'},
            {vendor: 'TuYa', model: 'ZD82TN', description: 'Curtain motor'},
            {vendor: 'Moes', model: 'AM43-0.45/40-ES-EB'},
            {vendor: 'Larkkey', model: 'ZSTY-SM-1SRZG-EU'},
            {vendor: 'Zemismart', model: 'ZM85EL-2Z', description: 'Roman Rod I type curtains track'},
            {vendor: 'Zemismart', model: 'AM43', description: 'Roller blind motor'},
            {vendor: 'Zemismart', model: 'M2805EGBZTN', description: 'Tubular motor'},
            {vendor: 'Zemismart', model: 'BCM500DS-TYZ', description: 'Curtain motor'},
            {vendor: 'A-OK', model: 'AM25', description: 'Tubular motor'},
            {vendor: 'Alutech', model: 'AM/R-Sm', description: 'Tubular motor'},
        ],
        fromZigbee: [fz.tuya_cover, fz.ignore_basic_report],
        toZigbee: [tz.tuya_cover_control, tz.tuya_cover_options],
        exposes: [
            e.cover_position().setAccess('position', ea.STATE_SET),
            exposes.composite('options', 'options')
                .withFeature(exposes.numeric('motor_speed', ea.STATE_SET)
                    .withValueMin(0)
                    .withValueMax(255)
                    .withDescription('Motor speed'))],
    },
    {
        zigbeeModel: ['kud7u2l'],
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_ckud7u2l'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ywdxldoj'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_cwnjrr72'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_pvvbommb'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_9sfg7gm0'}, // HomeCloud
            {modelID: 'TS0601', manufacturerName: '_TZE200_2atgpdho'}, // HY367
            {modelID: 'TS0601', manufacturerName: '_TZE200_cpmgn2cf'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_4eeyebrt'}, // Immax 07732B
            {modelID: 'TS0601', manufacturerName: '_TZE200_8whxpsiw'}, // EVOLVEO
        ],
        model: 'TS0601_thermostat',
        vendor: 'TuYa',
        description: 'Radiator valve with thermostat',
        whiteLabel: [
            {vendor: 'Moes', model: 'HY368'},
            {vendor: 'Moes', model: 'HY369RT'},
            {vendor: 'SHOJZJ', model: '378RT'},
            {vendor: 'Silvercrest', model: 'TVR01'},
            {vendor: 'Immax', model: '07732B'},
            {vendor: 'Evolveo', model: 'Heat M30'},
        ],
        meta: {tuyaThermostatPreset: tuya.thermostatPresets, tuyaThermostatSystemMode: tuya.thermostatSystemModes3},
        ota: ota.zigbeeOTA,
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [fz.tuya_thermostat, fz.ignore_basic_report, fz.ignore_tuya_set_time],
        toZigbee: [tz.tuya_thermostat_child_lock, tz.tuya_thermostat_window_detection, tz.tuya_thermostat_valve_detection,
            tz.tuya_thermostat_current_heating_setpoint, tz.tuya_thermostat_auto_lock,
            tz.tuya_thermostat_calibration, tz.tuya_thermostat_min_temp, tz.tuya_thermostat_max_temp,
            tz.tuya_thermostat_boost_time, tz.tuya_thermostat_comfort_temp, tz.tuya_thermostat_eco_temp,
            tz.tuya_thermostat_force_to_mode, tz.tuya_thermostat_force, tz.tuya_thermostat_preset, tz.tuya_thermostat_away_mode,
            tz.tuya_thermostat_window_detect, tz.tuya_thermostat_schedule, tz.tuya_thermostat_week, tz.tuya_thermostat_away_preset,
            tz.tuya_thermostat_schedule_programming_mode],
        exposes: [
            e.child_lock(), e.window_detection(),
            exposes.binary('window_open', ea.STATE).withDescription('Window open?'),
            e.battery_low(), e.valve_detection(), e.position(),
            exposes.climate().withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE).withSystemMode(['heat', 'auto', 'off'], ea.STATE_SET,
                    'Mode of this device, in the `heat` mode the TS0601 will remain continuously heating, i.e. it does not regulate ' +
                    'to the desired temperature. If you want TRV to properly regulate the temperature you need to use mode `auto` ' +
                    'instead setting the desired temperature.')
                .withLocalTemperatureCalibration(-9, 9, 1, ea.STATE_SET)
                .withPreset(['schedule', 'manual', 'boost', 'complex', 'comfort', 'eco'])
                .withRunningState(['idle', 'heat'], ea.STATE),
            e.auto_lock(), e.away_mode(), e.away_preset_days(), e.boost_time(), e.comfort_temperature(), e.eco_temperature(), e.force(),
            e.max_temperature(), e.min_temperature(), e.away_preset_temperature(),
            exposes.composite('programming_mode').withDescription('Schedule MODE ⏱ - In this mode, ' +
                    'the device executes a preset week programming temperature time and temperature.')
                .withFeature(e.week())
                .withFeature(exposes.text('workdays_schedule', ea.STATE_SET))
                .withFeature(exposes.text('holidays_schedule', ea.STATE_SET))],
    },
    {
        fingerprint: tuya.fingerprint('TS0601', [
            '_TZE200_hue3yfsn', /* model: 'TV02-Zigbee', vendor: 'TuYa' */
            '_TZE200_e9ba97vf', /* model: 'TV01-ZB', vendor: 'Moes' */
            '_TZE200_husqqvux', /* model: 'TSL-TRV-TV01ZG', vendor: 'Tesla Smart' */
            '_TZE200_lnbfnyxd', /* model: 'TSL-TRV-TV01ZG', vendor: 'Tesla Smart' */
            '_TZE200_lllliz3p', /* model: 'TV02-Zigbee', vendor: 'TuYa' */
            '_TZE200_mudxchsu', /* model: 'TV05-ZG curve', vendor: 'TuYa' */
            '_TZE200_7yoranx2', /* model: 'TV01-ZB', vendor: 'Moes' */
            '_TZE200_kds0pmmv', /* model: 'TV01-ZB', vendor: 'Moes' */
        ]),
        model: 'TV02-Zigbee',
        vendor: 'TuYa',
        description: 'Thermostat radiator valve',
        whiteLabel: [
            {vendor: 'Moes', model: 'TV01-ZB'},
            {vendor: 'AVATTO', model: 'TRV06'},
            {vendor: 'Tesla Smart', model: 'TSL-TRV-TV01ZG'},
            {vendor: 'Unknown/id3.pl', model: 'GTZ08'},
        ],
        ota: ota.zigbeeOTA,
        fromZigbee: [tuya.fzDataPoints],
        toZigbee: [tuya.tzDataPoints],
        onEvent: tuya.onEventSetLocalTime,
        configure: tuya.configureMagicPacket,
        exposes: [
            e.battery_low(), e.child_lock(), e.open_window(), e.open_window_temperature().withValueMin(5).withValueMax(30),
            e.comfort_temperature().withValueMin(5).withValueMax(30), e.eco_temperature().withValueMin(5).withValueMax(30),
            exposes.climate().withSystemMode(['off', 'heat'], ea.STATE_SET, 'When switched to the "off" mode, the device will display ' +
                '"HS" and the valve will be fully closed. Press the pair button to cancel or switch back to "heat" mode. Battery life ' +
                'can be prolonged by switching the heating off. After switching to `heat` mode, `preset` will be reset to `auto` and ' +
                'after changing `preset` to `manual` temperature setpoint will be 20 degrees.').withPreset(['auto', 'manual', 'holiday'],
                '`auto` uses schedule properties, check them. `manual` allows you to control the device, `holiday` uses ' +
                '`holiday_start_stop` and `holiday_temperature` properties.').withLocalTemperatureCalibration(-5, 5, 0.1, ea.STATE_SET)
                .withLocalTemperature(ea.STATE).withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET),
            exposes.numeric('boost_timeset_countdown', ea.STATE_SET).withUnit('second').withDescription('Setting '+
                    'minimum 0 - maximum 465 seconds boost time. The boost (♨) function is activated. The remaining '+
                    'time for the function will be counted down in seconds ( 465 to 0 ).').withValueMin(0).withValueMax(465),
            exposes.binary('frost_protection', ea.STATE_SET, 'ON', 'OFF').withDescription('When Anti-Freezing function'+
                    ' is activated, the temperature in the house is kept at 8 °C, the device display "AF".press the '+
                    'pair button to cancel.'),
            exposes.binary('heating_stop', ea.STATE_SET, 'ON', 'OFF').withDescription('Same as `system_mode`. Left for compatibility.'),
            exposes.numeric('holiday_temperature', ea.STATE_SET).withUnit('°C').withDescription('Holiday temperature')
                .withValueMin(5).withValueMax(30),
            exposes.text('holiday_start_stop', ea.STATE_SET).withDescription('The holiday mode will automatically start ' +
                'at the set time starting point and run the holiday temperature. Can be defined in the following format: ' +
                '`startYear/startMonth/startDay startHours:startMinutes | endYear/endMonth/endDay endHours:endMinutes`. ' +
                'For example: `2022/10/01 16:30 | 2022/10/21 18:10`. After the end of holiday mode, it switches to "auto" ' +
                'mode and uses schedule.'),
            exposes.enum('working_day', ea.STATE_SET, ['mon_sun', 'mon_fri+sat+sun', 'separate']).withDescription('`mon_sun` ' +
                '- schedule for Monday used for each day (define it only for Monday). `mon_fri+sat+sun` - schedule for ' +
                'workdays used from Monday (define it only for Monday), Saturday and Sunday are defined separately. `separate` ' +
                '- schedule for each day is defined separately.'),
            exposes.composite('schedule', 'schedule').withFeature(exposes.enum('week_day', ea.SET, ['monday', 'tuesday',
                'wednesday', 'thursday', 'friday', 'saturday', 'sunday'])).withFeature(exposes.text('schedule', ea.SET))
                .withDescription('Schedule will work with "auto" preset. In this mode, the device executes ' +
                'a preset week programming temperature time and temperature. Before using these properties, check `working_day` ' +
                'property. Each day can contain up to 10 segments. At least 1 segment should be defined. Different count of segments ' +
                'can be defined for each day, e.g., 3 segments for Monday, 5 segments for Thursday, etc. It should be defined in the ' +
                'following format: `hours:minutes/temperature`. Minutes can be only tens, i.e., 00, 10, 20, 30, 40, 50. Segments should ' +
                'be divided by space symbol. Each day should end with the last segment of 24:00. Examples: `04:00/20 08:30/22 10:10/18 ' +
                '18:40/24 22:50/19.5`; `06:00/21.5 17:20/26 24:00/18`. The temperature will be set from the beginning/start of one ' +
                'period and until the next period, e.g., `04:00/20 24:00/22` means that from 00:00 to 04:00 temperature will be 20 ' +
                'degrees and from 04:00 to 00:00 temperature will be 22 degrees.'),
            exposes.text('schedule_monday', ea.STATE),
            exposes.text('schedule_tuesday', ea.STATE),
            exposes.text('schedule_wednesday', ea.STATE),
            exposes.text('schedule_thursday', ea.STATE),
            exposes.text('schedule_friday', ea.STATE),
            exposes.text('schedule_saturday', ea.STATE),
            exposes.text('schedule_sunday', ea.STATE),
            exposes.binary('online', ea.STATE_SET, 'ON', 'OFF').withDescription('Turn on this property to poll current data from the ' +
                'device. It can be used to periodically fetch a new local temperature since the device doesn\'t update itself. ' +
                'Setting this property doesn\'t turn on the display.'),
            exposes.numeric('error_status', ea.STATE).withDescription('Error status'),
        ],
        meta: {
            tuyaDatapoints: [
                [2, 'preset', tuya.valueConverterBasic.lookup({'auto': tuya.enum(0), 'manual': tuya.enum(1), 'holiday': tuya.enum(3)})],
                [8, 'open_window', tuya.valueConverter.onOff],
                [10, 'frost_protection', tuya.valueConverter.onOff],
                [16, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
                [24, 'local_temperature', tuya.valueConverter.divideBy10],
                [27, 'local_temperature_calibration', tuya.valueConverter.localTempCalibration],
                [31, 'working_day', tuya.valueConverterBasic.lookup({'mon_sun': tuya.enum(0), 'mon_fri+sat+sun': tuya.enum(1),
                    'separate': tuya.enum(2)})],
                [32, 'holiday_temperature', tuya.valueConverter.divideBy10],
                [35, 'battery_low', tuya.valueConverter.true0ElseFalse],
                [40, 'child_lock', tuya.valueConverter.lockUnlock],
                [45, 'error_status', tuya.valueConverter.raw],
                [46, 'holiday_start_stop', tuya.valueConverter.thermostatHolidayStartStop],
                [101, 'boost_timeset_countdown', tuya.valueConverter.raw],
                [102, 'open_window_temperature', tuya.valueConverter.divideBy10],
                [104, 'comfort_temperature', tuya.valueConverter.divideBy10],
                [105, 'eco_temperature', tuya.valueConverter.divideBy10],
                [106, 'schedule', tuya.valueConverter.thermostatScheduleDay],
                [107, null, tuya.valueConverter.TV02SystemMode],
                [107, 'system_mode', tuya.valueConverterBasic.lookup({'heat': false, 'off': true})],
                [107, 'heating_stop', tuya.valueConverter.onOff],
                [115, 'online', tuya.valueConverter.onOffNotStrict],
                [108, 'schedule_monday', tuya.valueConverter.thermostatScheduleDay],
                [112, 'schedule_tuesday', tuya.valueConverter.thermostatScheduleDay],
                [109, 'schedule_wednesday', tuya.valueConverter.thermostatScheduleDay],
                [113, 'schedule_thursday', tuya.valueConverter.thermostatScheduleDay],
                [110, 'schedule_friday', tuya.valueConverter.thermostatScheduleDay],
                [114, 'schedule_saturday', tuya.valueConverter.thermostatScheduleDay],
                [111, 'schedule_sunday', tuya.valueConverter.thermostatScheduleDay],
            ],
        },
    },
    {
        fingerprint: [
            {modelID: 'v90ladg\u0000', manufacturerName: '_TYST11_wv90ladg'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_wv90ladg'},
        ],
        model: 'HT-08',
        vendor: 'ETOP',
        description: 'Wall-mount thermostat',
        fromZigbee: [fz.legacy.tuya_thermostat_weekly_schedule, fz.etop_thermostat, fz.ignore_basic_report, fz.ignore_tuya_set_time],
        toZigbee: [tz.etop_thermostat_system_mode, tz.etop_thermostat_away_mode, tz.tuya_thermostat_child_lock,
            tz.tuya_thermostat_current_heating_setpoint, tz.tuya_thermostat_weekly_schedule],
        onEvent: tuya.onEventSetTime,
        meta: {
            thermostat: {
                weeklyScheduleMaxTransitions: 4,
                weeklyScheduleSupportedModes: [1], // bits: 0-heat present, 1-cool present (dec: 1-heat,2-cool,3-heat+cool)
                weeklyScheduleFirstDayDpId: tuya.dataPoints.schedule,
            },
        },
        exposes: [e.child_lock(), e.away_mode(), exposes.climate().withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
            .withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'heat', 'auto'], ea.STATE_SET).withRunningState(['idle', 'heat'], ea.STATE)],
    },
    {
        fingerprint: [{modelID: 'dpplnsn\u0000', manufacturerName: '_TYST11_2dpplnsn'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_2dpplnsn'}],
        model: 'HT-10',
        vendor: 'ETOP',
        description: 'Radiator valve',
        fromZigbee: [fz.legacy.tuya_thermostat_weekly_schedule, fz.etop_thermostat, fz.ignore_basic_report, fz.ignore_tuya_set_time],
        toZigbee: [tz.etop_thermostat_system_mode, tz.etop_thermostat_away_mode, tz.tuya_thermostat_child_lock,
            tz.tuya_thermostat_current_heating_setpoint, tz.tuya_thermostat_weekly_schedule],
        onEvent: tuya.onEventSetTime,
        meta: {
            timeout: 20000, // TRV wakes up every 10sec
            thermostat: {
                weeklyScheduleMaxTransitions: 4,
                weeklyScheduleSupportedModes: [1], // bits: 0-heat present, 1-cool present (dec: 1-heat,2-cool,3-heat+cool)
                weeklyScheduleFirstDayDpId: tuya.dataPoints.schedule,
            },
        },
        exposes: [
            e.battery_low(), e.child_lock(), e.away_mode(), exposes.climate()
                .withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(['off', 'heat', 'auto'], ea.STATE_SET).withRunningState(['idle', 'heat'], ea.STATE),
        ],
    },
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_a4bpgplm'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_dv8abrrz'},
        ],
        model: 'TS0601_thermostat_1',
        vendor: 'TuYa',
        description: 'Thermostatic radiator valve',
        whiteLabel: [
            {vendor: 'Unknown/id3.pl', model: 'GTZ06'},
        ],
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [fz.ignore_basic_report, fz.ignore_tuya_set_time, fz.haozee_thermostat],
        toZigbee: [
            tz.haozee_thermostat_system_mode, tz.haozee_thermostat_current_heating_setpoint, tz.haozee_thermostat_boost_heating,
            tz.haozee_thermostat_boost_heating_countdown, tz.haozee_thermostat_window_detection,
            tz.haozee_thermostat_child_lock, tz.haozee_thermostat_temperature_calibration, tz.haozee_thermostat_max_temperature,
            tz.haozee_thermostat_min_temperature,
        ],
        exposes: [
            e.battery(), e.child_lock(), e.max_temperature(), e.min_temperature(),
            e.position(), e.window_detection(),
            exposes.binary('window', ea.STATE, 'CLOSED', 'OPEN').withDescription('Window status closed or open '),
            exposes.binary('heating', ea.STATE, 'ON', 'OFF').withDescription('Device valve is open or closed (heating or not)'),
            exposes.climate()
                .withLocalTemperature(ea.STATE).withSetpoint('current_heating_setpoint', 5, 35, 0.5, ea.STATE_SET)
                .withLocalTemperatureCalibration(-30, 30, 0.1, ea.STATE_SET).withPreset(['auto', 'manual', 'off', 'on'],
                    'MANUAL MODE ☝ - In this mode, the device executes manual temperature setting. ' +
                    'When the set temperature is lower than the "minimum temperature", the valve is closed (forced closed). ' +
                    'AUTO MODE ⏱ - In this mode, the device executes a preset week programming temperature time and temperature. ' +
                    'ON - In this mode, the thermostat stays open ' +
                    'OFF - In this mode, the thermostat stays closed'),
            exposes.composite('programming_mode').withDescription('Auto MODE ⏱ - In this mode, ' +
                    'the device executes a preset week programming temperature time and temperature. ')
                .withFeature(exposes.text('monday_schedule', ea.STATE))
                .withFeature(exposes.text('tuesday_schedule', ea.STATE))
                .withFeature(exposes.text('wednesday_schedule', ea.STATE))
                .withFeature(exposes.text('thursday_schedule', ea.STATE))
                .withFeature(exposes.text('friday_schedule', ea.STATE))
                .withFeature(exposes.text('saturday_schedule', ea.STATE))
                .withFeature(exposes.text('sunday_schedule', ea.STATE)),
            exposes.binary('boost_heating', ea.STATE_SET, 'ON', 'OFF').withDescription('Boost Heating: press and hold "+" for 3 seconds, ' +
                'the device will enter the boost heating mode, and the ▷╵◁ will flash. The countdown will be displayed in the APP'),
            exposes.numeric('boost_heating_countdown', ea.STATE_SET).withUnit('min').withDescription('Countdown in minutes')
                .withValueMin(0).withValueMax(1000),
        ],
    },
    {
        zigbeeModel: ['TS0121'],
        model: 'TS0121_plug',
        description: '10A UK or 16A EU smart plug',
        whiteLabel: [{vendor: 'BlitzWolf', model: 'BW-SHP13'}],
        vendor: 'TuYa',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report, fz.tuya_switch_power_outage_memory,
            fz.ts011f_plug_indicator_mode],
        toZigbee: [tz.on_off, tz.tuya_switch_power_outage_memory, tz.ts011f_plug_indicator_mode],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acVoltageMultiplier: 1, acVoltageDivisor: 1, acCurrentMultiplier: 1, acCurrentDivisor: 1000, acPowerMultiplier: 1,
                acPowerDivisor: 1,
            });
            try {
                await reporting.currentSummDelivered(endpoint);
            } catch (error) {/* fails for some https://github.com/Koenkk/zigbee2mqtt/issues/11179 */}
            await endpoint.read('genOnOff', ['onOff', 'moesStartUpOnOff', 'tuyaBacklightMode']);
        },
        options: [exposes.options.measurement_poll_interval()],
        // This device doesn't support reporting correctly.
        // https://github.com/Koenkk/zigbee-herdsman-converters/pull/1270
        exposes: [e.switch(), e.power(), e.current(), e.voltage().withAccess(ea.STATE),
            e.energy(), exposes.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore'])
                .withDescription('Recover state after power outage'),
            exposes.enum('indicator_mode', ea.ALL, ['off', 'off/on', 'on/off']).withDescription('LED indicator mode')],
        onEvent: tuya.onEventMeasurementPoll,
    },
    {
        fingerprint: [{modelID: 'TS0111', manufacturerName: '_TYZB01_ymcdbl3u'}],
        model: 'TS0111_valve',
        vendor: 'TuYa',
        whiteLabel: [{vendor: 'TuYa', model: 'SM-AW713Z'}],
        description: 'Smart water/gas valve',
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.ts011f_plug_indicator_mode]),
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.ts011f_plug_indicator_mode]),
        exposes: extend.switch().exposes.concat([e.power_on_behavior(),
            exposes.enum('indicator_mode', ea.ALL, ['off', 'off/on', 'on/off', 'on']).withDescription('LED indicator mode')]),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genOnOff', ['onOff', 'moesStartUpOnOff', 'tuyaBacklightMode']);
        },
    },
    {
        fingerprint: TS011Fplugs.map((manufacturerName) => {
            return {modelID: 'TS011F', manufacturerName};
        }),
        model: 'TS011F_plug_1',
        description: 'Smart plug (with power monitoring)',
        vendor: 'TuYa',
        whiteLabel: [{vendor: 'LELLKI', model: 'TS011F_plug'}, {vendor: 'NEO', model: 'NAS-WR01B'},
            {vendor: 'BlitzWolf', model: 'BW-SHP15'}, {vendor: 'Nous', model: 'A1Z'}, {vendor: 'BlitzWolf', model: 'BW-SHP13'},
            {vendor: 'MatSee Plus', model: 'PJ-ZSW01'}, {vendor: 'MODEMIX', model: 'MOD037'}, {vendor: 'MODEMIX', model: 'MOD048'}],
        ota: ota.zigbeeOTA,
        fromZigbee: [fz.on_off, fzLocal.electrical_measurement_skip_duplicate, fzLocal.metering_skip_duplicate, fz.ignore_basic_report,
            fz.tuya_switch_power_outage_memory, fz.ts011f_plug_indicator_mode, fz.ts011f_plug_child_mode],
        toZigbee: [tz.on_off, tz.tuya_switch_power_outage_memory, tz.ts011f_plug_indicator_mode, tz.ts011f_plug_child_mode],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.activePower(endpoint, {change: 10});
            await reporting.currentSummDelivered(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage().withAccess(ea.STATE),
            e.energy(), exposes.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore'])
                .withDescription('Recover state after power outage'),
            exposes.enum('indicator_mode', ea.ALL, ['off', 'off/on', 'on/off', 'on'])
                .withDescription('Plug LED indicator mode'), e.child_lock()],
    },
    {
        fingerprint: [
            {modelID: 'TS011F', manufacturerName: '_TZ3000_hyfvrar3'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_v1pdxuqq'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_8a833yls'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_bfn1w0mm'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_nzkqcvvs'}],
        model: 'TS011F_plug_2',
        description: 'Smart plug (without power monitoring)',
        vendor: 'TuYa',
        fromZigbee: [fz.on_off, fz.tuya_switch_power_outage_memory, fz.ts011f_plug_indicator_mode, fz.ts011f_plug_child_mode],
        toZigbee: [tz.on_off, tz.tuya_switch_power_outage_memory, tz.ts011f_plug_indicator_mode, tz.ts011f_plug_child_mode],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
        exposes: [e.switch(), exposes.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore'])
            .withDescription('Recover state after power outage'),
        exposes.enum('indicator_mode', ea.ALL, ['off', 'off/on', 'on/off', 'on'])
            .withDescription('Plug LED indicator mode'), e.child_lock()],
    },
    {
        fingerprint: [].concat(...TS011Fplugs.map((manufacturerName) => {
            return [160, 69, 68, 65, 64].map((applicationVersion) => {
                return {modelID: 'TS011F', manufacturerName, applicationVersion};
            });
        })),
        model: 'TS011F_plug_3',
        description: 'Smart plug (with power monitoring by polling)',
        vendor: 'TuYa',
        whiteLabel: [{vendor: 'VIKEFON', model: 'TS011F'}, {vendor: 'BlitzWolf', model: 'BW-SHP15'},
            {vendor: 'Avatto', model: 'MIUCOT10Z'}, {vendor: 'Neo', model: 'NAS-WR01B'}],
        ota: ota.zigbeeOTA,
        fromZigbee: [fz.on_off, fzLocal.electrical_measurement_skip_duplicate, fzLocal.metering_skip_duplicate, fz.ignore_basic_report,
            fz.tuya_switch_power_outage_memory, fz.ts011f_plug_indicator_mode, fz.ts011f_plug_child_mode],
        toZigbee: [tz.on_off, tz.tuya_switch_power_outage_memory, tz.ts011f_plug_indicator_mode, tz.ts011f_plug_child_mode],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            // Enables reporting of physical state changes
            // https://github.com/Koenkk/zigbee2mqtt/issues/9057#issuecomment-1007742130
            try {
                await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
            } catch (e) {
                // Sometimes can fail: https://github.com/Koenkk/zigbee2mqtt/issues/12760#issuecomment-1165435220
            }
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        options: [exposes.options.measurement_poll_interval()],
        exposes: [e.switch(), e.power(), e.current(), e.voltage().withAccess(ea.STATE),
            e.energy(), exposes.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore'])
                .withDescription('Recover state after power outage'),
            exposes.enum('indicator_mode', ea.ALL, ['off', 'off/on', 'on/off', 'on'])
                .withDescription('Plug LED indicator mode'), e.child_lock()],
        onEvent: tuya.onEventMeasurementPoll,
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_ntcy3xu1']),
        model: 'TS0601_smoke_1',
        vendor: 'TuYa',
        description: 'Smoke sensor',
        fromZigbee: [tuya.fzDataPoints],
        toZigbee: [tuya.tzDataPoints],
        configure: tuya.configureMagicPacket,
        exposes: [e.smoke(), e.tamper(), e.battery_low()],
        meta: {
            tuyaDatapoints: [
                [1, 'smoke', tuya.valueConverter.true0ElseFalse],
                [4, 'tamper', tuya.valueConverter.raw],
                [14, 'battery_low', tuya.valueConverter.true0ElseFalse],
            ],
        },
    },
    {
        zigbeeModel: ['5p1vj8r'],
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_t5p1vj8r'}, {modelID: 'TS0601', manufacturerName: '_TZE200_uebojraa'}],
        model: 'TS0601_smoke',
        vendor: 'TuYa',
        description: 'Smoke sensor',
        fromZigbee: [fz.tuya_smoke],
        toZigbee: [],
        exposes: [e.smoke(), e.battery()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_5d3vhjro'}],
        model: 'SA12IZL',
        vendor: 'TuYa',
        description: 'Smart smoke alarm',
        meta: {timeout: 30000, disableDefaultResponse: true},
        fromZigbee: [fzLocal.SA12IZL],
        toZigbee: [tzLocal.SA12IZL_silence_siren, tzLocal.SA12IZL_alarm],
        exposes: [e.battery(),
            exposes.binary('smoke', ea.STATE, true, false).withDescription('Smoke alarm status'),
            exposes.enum('battery_level', ea.STATE, ['low', 'middle', 'high']).withDescription('Battery level state'),
            exposes.binary('alarm', ea.STATE_SET, true, false).withDescription('Enable the alarm'),
            exposes.binary('silence_siren', ea.STATE_SET, true, false).withDescription('Silence the siren')],
        onEvent: tuya.onEventsetTime,
    },
    {
        fingerprint: tuya.fingerprint('TS0601', ['_TZE200_lsanae15', '_TZE200_bkkmqmyo', '_TZE200_eaac7dkw']),
        model: 'TS0601_din_1',
        vendor: 'TuYa',
        description: 'Zigbee DIN energy meter',
        fromZigbee: [tuya.fzDataPoints],
        toZigbee: [tuya.tzDataPoints],
        configure: tuya.configureMagicPacket,
        exposes: [tuya.exposes.switch(), e.ac_frequency(), e.energy(), e.power(), e.power_factor(), e.voltage(), e.current(),
            e.produced_energy()],
        meta: {
            tuyaDatapoints: [
                [1, 'energy', tuya.valueConverter.divideBy100],
                [6, null, tuya.valueConverter.phaseA], // voltage and current
                [16, 'state', tuya.valueConverter.onOff],
                [102, 'produced_energy', tuya.valueConverter.divideBy100],
                [103, 'power', tuya.valueConverter.raw],
                [105, 'ac_frequency', tuya.valueConverter.divideBy100],
                [111, 'power_factor', tuya.valueConverter.divideBy10],
                // Ignored for now; we don't know what the values mean
                [109, null, null], // reactive_power in VArh, ignored for now
                [101, null, null], // total active power (translated from chinese) - same as energy dp 1??
                [9, null, null], // Fault - we don't know the possible values here
                [110, null, null], // total reactive power (translated from chinese) - value is 0.03kvar, we already have kvarh on dp 109
                [17, null, null], // Alarm set1 - value seems garbage "AAAAAAAAAAAAAABkAAEOAACqAAAAAAAKAAAAAAAA"
                [18, null, null], // 18 - Alarm set2 - value seems garbage "AAUAZAAFAB4APAAAAAAAAAA="
            ],
        },
        whiteLabel: [{vendor: 'Hiking', model: 'DDS238-2'}, {vendor: 'TuYa', model: 'RC-MCB'}],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_byzdayie'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_fsb6zw01'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ewxhg6o9'}],
        model: 'TS0601_din',
        vendor: 'TuYa',
        description: 'Zigbee smart energy meter DDS238-2 Zigbee',
        fromZigbee: [fz.tuya_dinrail_switch],
        toZigbee: [tz.tuya_switch_state],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
        exposes: [e.switch().setAccess('state', ea.STATE_SET), e.voltage(), e.power(), e.current(), e.energy()],
    },
    {
        fingerprint: [{modelID: 'TS1101', manufacturerName: '_TZ3000_xfs39dbf'}],
        model: 'TS1101_dimmer_module_1ch',
        vendor: 'TuYa',
        description: 'Zigbee dimmer module 1 channel',
        fromZigbee: extend.light_onoff_brightness().fromZigbee.concat([fz.tuya_min_brightness]),
        toZigbee: extend.light_onoff_brightness().toZigbee.concat([tz.tuya_min_brightness]),
        exposes: [e.light_brightness().withMinBrightness()],
        extend: extend.light_onoff_brightness(),
    },
    {
        fingerprint: [{modelID: 'TS1101', manufacturerName: '_TZ3000_7ysdnebc'}],
        model: 'TS1101_dimmer_module_2ch',
        vendor: 'TuYa',
        description: 'Zigbee dimmer module 2 channel',
        whiteLabel: [{vendor: 'OXT', model: 'SWTZ25'}],
        fromZigbee: extend.light_onoff_brightness().fromZigbee.concat([fz.tuya_min_brightness]),
        toZigbee: extend.light_onoff_brightness().toZigbee.concat([tz.tuya_min_brightness]),
        exposes: [e.light_brightness().withMinBrightness().withEndpoint('l1'),
            e.light_brightness().withMinBrightness().withEndpoint('l2')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
    },
    {
        zigbeeModel: ['RH3001'],
        fingerprint: [{type: 'EndDevice', manufacturerID: 4098, applicationVersion: 66, endpoints: [
            {ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 10, 1, 1280], outputClusters: [25]},
        ]}],
        model: 'SNTZ007',
        vendor: 'TuYa',
        description: 'Rechargeable Zigbee contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ignore_basic_report, fz.ignore_time_read],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
        whiteLabel: [{vendor: 'BlitzWolf', model: 'BW-IS2'}],
    },
    {
        zigbeeModel: ['RH3040'],
        model: 'RH3040',
        vendor: 'TuYa',
        description: 'PIR sensor',
        fromZigbee: [fz.battery, fz.ignore_basic_report, fz.ias_occupancy_alarm_1],
        toZigbee: [],
        whiteLabel: [{vendor: 'Samotech', model: 'SM301Z'}, {vendor: 'Nedis', model: 'ZBSM10WT'}],
        exposes: [e.battery(), e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['TS0115'],
        model: 'TS0115',
        vendor: 'TuYa',
        description: 'Multiprise with 4 AC outlets and 2 USB super charging ports (10A or 16A)',
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior]),
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'), e.switch().withEndpoint('l5'), e.power_on_behavior()],
        whiteLabel: [{vendor: 'UseeLink', model: 'SM-SO306E/K/M'}],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4, l5: 7};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(7), coordinatorEndpoint, ['genOnOff']);
            await device.getEndpoint(1).read('genOnOff', ['onOff', 'moesStartUpOnOff']);
            await device.getEndpoint(2).read('genOnOff', ['onOff']);
            await device.getEndpoint(3).read('genOnOff', ['onOff']);
            await device.getEndpoint(4).read('genOnOff', ['onOff']);
            await device.getEndpoint(7).read('genOnOff', ['onOff']);
        },
    },
    {
        zigbeeModel: ['RH3052'],
        model: 'TT001ZAV20',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.humidity, fz.temperature, fz.battery],
        toZigbee: [],
        exposes: [e.humidity(), e.temperature(), e.battery()],
    },
    {
        fingerprint: [{modelID: 'TS0011', manufacturerName: '_TZ3000_l8fsgo6p'}],
        zigbeeModel: ['TS0011'],
        model: 'TS0011',
        vendor: 'TuYa',
        description: 'Smart light switch - 1 gang',
        extend: extend.switch(),
        whiteLabel: [
            {vendor: 'Vrey', model: 'VR-X712U-0013'},
            {vendor: 'TUYATEC', model: 'GDKES-01TZXD'},
            {vendor: 'Lonsonho', model: 'QS-Zigbee-S05-L', description: '1 gang smart switch module without neutral wire'},
            {vendor: 'Mercator Ikuü', model: 'SSW01'},
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            // Reports itself as battery which is not correct: https://github.com/Koenkk/zigbee2mqtt/issues/6190
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        fingerprint: [{modelID: 'TS0011', manufacturerName: '_TZ3000_qmi1cfuq'},
            {modelID: 'TS0011', manufacturerName: '_TZ3000_txpirhfq'}, {modelID: 'TS0011', manufacturerName: '_TZ3000_ji4araar'}],
        model: 'TS0011_switch_module',
        vendor: 'TuYa',
        description: '1 gang switch module - (without neutral)',
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_switch_type]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_switch_type]),
        exposes: [
            e.switch(),
            exposes.presets.power_on_behavior(),
            exposes.presets.switch_type_2(),
        ],
        whiteLabel: [{vendor: 'AVATTO', model: '1gang N-ZLWSM01'}, {vendor: 'SMATRUL', model: 'TMZ02L-16A-W'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['TS0012'],
        model: 'TS0012',
        vendor: 'TuYa',
        description: 'Smart light switch - 2 gang',
        whiteLabel: [{vendor: 'Vrey', model: 'VR-X712U-0013'}, {vendor: 'TUYATEC', model: 'GDKES-02TZXD'},
            {vendor: 'Earda', model: 'ESW-2ZAA-EU'}],
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right')],
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await device.getEndpoint(1).read('genBasic',
                ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        fingerprint: [{modelID: 'TS0012', manufacturerName: '_TZ3000_jl7qyupf'},
            {modelID: 'TS0012', manufacturerName: '_TZ3000_nPGIPl5D'},
            {modelID: 'TS0012', manufacturerName: '_TZ3000_4zf0crgo'}],
        model: 'TS0012_switch_module',
        vendor: 'TuYa',
        description: '2 gang switch module - (without neutral)',
        whiteLabel: [{vendor: 'AVATTO', model: '2gang N-ZLWSM01'}],
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_switch_type]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_switch_type]),
        exposes: [
            e.switch().withEndpoint('left'),
            e.switch().withEndpoint('right'),
            exposes.presets.power_on_behavior(),
            exposes.presets.switch_type_2(),
        ],
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['TS0013'],
        model: 'TS0013',
        vendor: 'TuYa',
        description: 'Smart light switch - 3 gang without neutral wire',
        extend: extend.switch(),
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_backlight_mode]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_backlight_mode]),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('center'), e.switch().withEndpoint('right'),
            exposes.enum('power_on_behavior', ea.ALL, Object.values(tuya.moesSwitch.powerOnBehavior)),
            exposes.enum('backlight_mode', ea.ALL, ['LOW', 'MEDIUM', 'HIGH'])
                .withDescription('Indicator light status: LOW: Off | MEDIUM: On| HIGH: Inverted')],
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        whiteLabel: [{vendor: 'TUYATEC', model: 'GDKES-03TZXD'}],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await device.getEndpoint(1).read('genBasic',
                ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
            try {
                for (const ID of [1, 2, 3]) {
                    const endpoint = device.getEndpoint(ID);
                    await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
                }
            } catch (e) {
                // Fails for some: https://github.com/Koenkk/zigbee2mqtt/issues/4872
            }
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        fingerprint: [{modelID: 'TS0013', manufacturerName: '_TZ3000_ypgri8yz'}],
        model: 'TS0013_switch_module',
        vendor: 'TuYa',
        description: '3 gang switch module - (without neutral)',
        whiteLabel: [{vendor: 'AVATTO', model: '3gang N-ZLWSM01'}],
        toZigbee: extend.switch().toZigbee.concat([tz.moes_power_on_behavior, tz.tuya_switch_type]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.moes_power_on_behavior, fz.tuya_switch_type]),
        exposes: [
            e.switch().withEndpoint('left'),
            e.switch().withEndpoint('center'),
            e.switch().withEndpoint('right'),
            exposes.presets.power_on_behavior(),
            exposes.presets.switch_type_2(),
        ],
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            try {
                for (const ID of [1, 2, 3]) {
                    const endpoint = device.getEndpoint(ID);
                    await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
                }
            } catch (e) {
                // Fails for some: https://github.com/Koenkk/zigbee2mqtt/issues/4872
            }
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        fingerprint: [{modelID: 'TS0014', manufacturerName: '_TZ3000_jr2atpww'}, {modelID: 'TS0014', manufacturerName: '_TYZB01_dvakyzhd'},
            {modelID: 'TS0014', manufacturerName: '_TZ3210_w3hl6rao'}, {modelID: 'TS0014', manufacturerName: '_TYZB01_bagt1e4o'},
            {modelID: 'TS0014', manufacturerName: '_TZ3000_r0pmi2p3'}, {modelID: 'TS0014', manufacturerName: '_TZ3000_fxjdcikv'},
            {modelID: 'TS0014', manufacturerName: '_TZ3000_q6vxaod1'}],
        model: 'TS0014',
        vendor: 'TuYa',
        description: 'Smart light switch - 4 gang without neutral wire',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4};
        },
        whiteLabel: [{vendor: 'TUYATEC', model: 'GDKES-04TZXD'}, {vendor: 'Vizo', model: 'VZ-222S'},
            {vendor: 'MakeGood', model: 'MG-ZG04W/B/G'}, {vendor: 'Mercator Ikuü', model: 'SSW04'}],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            try {
                for (const ID of [1, 2, 3, 4]) {
                    const endpoint = device.getEndpoint(ID);
                    await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
                }
            } catch (e) {
                // Fails for some: https://github.com/Koenkk/zigbee2mqtt/issues/4872
            }
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['gq8b1uv'],
        model: 'gq8b1uv',
        vendor: 'TuYa',
        description: 'Zigbee smart dimmer',
        fromZigbee: [fz.tuya_dimmer, fz.ignore_basic_report],
        toZigbee: [tz.tuya_dimmer_state, tz.tuya_dimmer_level],
        exposes: [e.light_brightness().setAccess('state', ea.STATE_SET).setAccess('brightness', ea.STATE_SET)],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
    },
    {
        zigbeeModel: ['HY0017', '005f0c3b'],
        model: 'U86KCJ-ZP',
        vendor: 'TuYa',
        description: 'Smart 6 key scene wall switch',
        fromZigbee: [fzLocal.scenes_recall_scene_65029],
        exposes: [e.action(['scene_1', 'scene_2', 'scene_3', 'scene_4', 'scene_5', 'scene_6'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['q9mpfhw'],
        model: 'SNTZ009',
        vendor: 'TuYa',
        description: 'Water leak sensor',
        fromZigbee: [fz.tuya_water_leak, fz.ignore_basic_report],
        exposes: [e.water_leak()],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0004'],
        model: 'TS0004',
        vendor: 'TuYa',
        description: 'Smart light switch - 4 gang with neutral wire',
        fromZigbee: [fz.on_off, fzLocal.power_on_behavior, fz.ignore_basic_report],
        toZigbee: [tz.on_off, tzLocal.power_on_behavior],
        exposes: [e.switch().withEndpoint('l1'), e.power_on_behavior().withEndpoint('l1'), e.switch().withEndpoint('l2'),
            e.power_on_behavior().withEndpoint('l2'), e.switch().withEndpoint('l3'), e.power_on_behavior().withEndpoint('l3'),
            e.switch().withEndpoint('l4'), e.power_on_behavior().withEndpoint('l4')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await device.getEndpoint(1).read('genBasic',
                ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS0006', manufacturerName: '_TYZB01_ltundz9m'},
            {modelID: 'TS0006', manufacturerName: '_TZ3000_jyupj3fw'}],
        model: 'TS0006',
        vendor: 'TuYa',
        description: '6 gang switch module with neutral wire',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'), e.switch().withEndpoint('l5'), e.switch().withEndpoint('l6')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4, 'l5': 5, 'l6': 6};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(6), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['HY0080'],
        model: 'U86KWF-ZPSJ',
        vendor: 'TuYa',
        description: 'Environment controller',
        fromZigbee: [fz.legacy.thermostat_att_report, fz.fan],
        toZigbee: [tz.factory_reset, tz.thermostat_local_temperature, tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint, tz.thermostat_unoccupied_cooling_setpoint,
            tz.thermostat_setpoint_raise_lower, tz.thermostat_remote_sensing,
            tz.thermostat_control_sequence_of_operation, tz.thermostat_system_mode, tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule, tz.thermostat_relay_status_log,
            tz.thermostat_temperature_setpoint_hold, tz.thermostat_temperature_setpoint_hold_duration, tz.fan_mode],
        exposes: [exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
            .withSystemMode(['off', 'auto', 'heat'], ea.ALL)
            .withRunningState(['idle', 'heat', 'cool'], ea.STATE)
            .withLocalTemperatureCalibration(-30, 30, 0.1, ea.ALL).withPiHeatingDemand()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(9);
            await reporting.bind(endpoint, coordinatorEndpoint, ['hvacThermostat', 'hvacFanCtrl']);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedCoolingSetpoint(endpoint);
            await reporting.fanMode(endpoint);
        },
    },
    {
        zigbeeModel: ['6dfgetq'],
        model: 'D3-DPWK-TY',
        vendor: 'TuYa',
        description: 'HVAC controller',
        exposes: [exposes.climate().withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET)
            .withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'auto', 'heat'], ea.STATE_SET)
            .withRunningState(['idle', 'heat', 'cool'], ea.STATE)],
        fromZigbee: [fz.tuya_thermostat, fz.ignore_basic_report, fz.tuya_dimmer],
        meta: {tuyaThermostatSystemMode: tuya.thermostatSystemModes2, tuyaThermostatPreset: tuya.thermostatPresets},
        toZigbee: [tz.tuya_thermostat_current_heating_setpoint, tz.tuya_thermostat_system_mode,
            tz.tuya_thermostat_fan_mode, tz.tuya_dimmer_state],
    },
    {
        zigbeeModel: ['E220-KR4N0Z0-HA', 'JZ-ZB-004'],
        model: 'E220-KR4N0Z0-HA',
        vendor: 'TuYa',
        description: 'Multiprise with 4 AC outlets and 2 USB super charging ports (16A)',
        extend: extend.switch(),
        fromZigbee: [fz.on_off_skip_duplicate_transaction],
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4')],
        whiteLabel: [{vendor: 'LEELKI', model: 'WP33-EU'}],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['TS0216'],
        model: 'TS0216',
        vendor: 'TuYa',
        description: 'Sound and flash siren',
        fromZigbee: [fz.ts0216_siren, fz.battery],
        exposes: [e.battery(), exposes.binary('alarm', ea.STATE_SET, true, false),
            exposes.numeric('volume', ea.ALL).withValueMin(0).withValueMax(100).withDescription('Volume of siren')],
        toZigbee: [tz.ts0216_alarm, tz.ts0216_duration, tz.ts0216_volume],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_znzs7yaw'}],
        model: 'HY08WE',
        vendor: 'TuYa',
        description: 'Wall-mount thermostat',
        fromZigbee: [fz.hy_thermostat, fz.ignore_basic_report],
        toZigbee: [tz.hy_thermostat],
        onEvent: tuya.onEventSetTime,
        exposes: [exposes.climate().withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET)
            .withLocalTemperature(ea.STATE)
            .withSystemMode(['off', 'auto', 'heat'], ea.STATE_SET).withRunningState(['idle', 'heat'], ea.STATE)],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_2ekuz3dz'}],
        model: 'X5H-GB-B',
        vendor: 'TuYa',
        description: 'Wall-mount thermostat',
        fromZigbee: [fz.ignore_basic_report, fzLocal.x5h_thermostat],
        toZigbee: [tzLocal.x5h_thermostat],
        whiteLabel: [{vendor: 'Beok', model: 'TGR85-ZB'}],
        exposes: [
            exposes.climate().withSetpoint('current_heating_setpoint', 5, 60, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE).withLocalTemperatureCalibration(-9.9, 9.9, 0.1, ea.STATE_SET)
                .withSystemMode(['off', 'heat'], ea.STATE_SET).withRunningState(['idle', 'heat'], ea.STATE)
                .withPreset(['manual', 'program']),
            e.temperature_sensor_select(['internal', 'external', 'both']),
            exposes.text('schedule', ea.STATE_SET).withDescription('There are 8 periods in the schedule in total. ' +
                '6 for workdays and 2 for holidays. It should be set in the following format for each of the periods: ' +
                '`hours:minutes/temperature`. All periods should be set at once and delimited by the space symbol. ' +
                'For example: `06:00/20.5 08:00/15 11:30/15 13:30/15 17:00/22 22:00/15 06:00/20 22:00/15`. ' +
                'The thermostat doesn\'t report the schedule by itself even if you change it manually from device'),
            e.child_lock(), e.week(),
            exposes.enum('brightness_state', ea.STATE_SET, ['off', 'low', 'medium', 'high'])
                .withDescription('Screen brightness'),
            exposes.binary('sound', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Switches beep sound when interacting with thermostat'),
            exposes.binary('frost_protection', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Antifreeze function'),
            exposes.binary('factory_reset', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('Resets all settings to default. Doesn\'t unpair device.'),
            exposes.numeric('heating_temp_limit', ea.STATE_SET).withUnit('°C').withValueMax(60)
                .withValueMin(5).withValueStep(1).withPreset('default', 35, 'Default value')
                .withDescription('Heating temperature limit'),
            exposes.numeric('deadzone_temperature', ea.STATE_SET).withUnit('°C').withValueMax(9.5)
                .withValueMin(0.5).withValueStep(0.5).withPreset('default', 1, 'Default value')
                .withDescription('The delta between local_temperature and current_heating_setpoint to trigger Heat'),
            exposes.numeric('upper_temp', ea.STATE_SET).withUnit('°C').withValueMax(95)
                .withValueMin(35).withValueStep(1).withPreset('default', 60, 'Default value'),
        ],
        onEvent: tuya.onEventSetTime,
    },
    {
        fingerprint: [{modelID: 'TS0222', manufacturerName: '_TYZB01_4mdqxxnn'},
            {modelID: 'TS0222', manufacturerName: '_TYZB01_m6ec2pgj'}],
        model: 'TS0222',
        vendor: 'TuYa',
        description: 'Light intensity sensor',
        fromZigbee: [fz.battery, fz.illuminance, fzLocal.TS0222],
        toZigbee: [],
        exposes: [e.battery(), e.illuminance(), e.illuminance_lux()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
        },
    },
    {
        fingerprint: [{modelID: 'TS0210', manufacturerName: '_TYZB01_3zv6oleo'},
            {modelID: 'TS0210', manufacturerName: '_TYZB01_j9xxahcl'},
            {modelID: 'TS0210', manufacturerName: '_TYZB01_kulduhbj'},
            {modelID: 'TS0210', manufacturerName: '_TZ3000_bmfw9ykl'}],
        model: 'TS0210',
        vendor: 'TuYa',
        description: 'Vibration sensor',
        fromZigbee: [fz.battery, fz.ias_vibration_alarm_1_with_timeout],
        toZigbee: [tz.TS0210_sensitivity],
        exposes: [e.battery(), e.vibration(), exposes.enum('sensitivity', exposes.access.STATE_SET, ['low', 'medium', 'high'])],
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_8bxrzyxz'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_ky0fq4ho'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_qeuvnohg'}],
        model: 'TS011F_din_smart_relay',
        description: 'Din smart relay (with power monitoring)',
        vendor: 'TuYa',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report, fz.tuya_switch_power_outage_memory,
            fz.tuya_relay_din_led_indicator],
        toZigbee: [tz.on_off, tz.tuya_switch_power_outage_memory, tz.tuya_relay_din_led_indicator],
        whiteLabel: [{vendor: 'MatSee Plus', model: 'ATMS1602Z'}],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.activePower(endpoint, {change: 10});
            await reporting.currentSummDelivered(endpoint);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage().withAccess(ea.STATE),
            e.energy(), exposes.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore'])
                .withDescription('Recover state after power outage'),
            exposes.enum('indicator_mode', ea.STATE_SET, ['off', 'on_off', 'off_on'])
                .withDescription('Relay LED indicator mode')],
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_7issjl2q'}],
        model: 'ATMS1601Z',
        description: 'Din smart relay (without power monitoring)',
        vendor: 'TuYa',
        fromZigbee: [fz.on_off, fz.ignore_basic_report, fz.tuya_switch_power_outage_memory, fz.tuya_relay_din_led_indicator],
        toZigbee: [tz.on_off, tz.tuya_switch_power_outage_memory, tz.tuya_relay_din_led_indicator],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            device.save();
        },
        exposes: [e.switch(),
            exposes.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore'])
                .withDescription('Recover state after power outage'),
            exposes.enum('indicator_mode', ea.STATE_SET, ['off', 'on_off', 'off_on'])
                .withDescription('Relay LED indicator mode')],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_nklqjk62'}],
        model: 'PJ-ZGD01',
        vendor: 'TuYa',
        description: 'Garage door opener',
        fromZigbee: [fz.matsee_garage_door_opener, fz.ignore_basic_report],
        toZigbee: [tz.matsee_garage_door_opener, tz.tuya_data_point_test],
        whiteLabel: [{vendor: 'MatSee Plus', model: 'PJ-ZGD01'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [exposes.binary('trigger', ea.STATE_SET, true, false).withDescription('Trigger the door movement'),
            exposes.binary('garage_door_contact', ea.STATE, true, false)],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_wfxuhoea'}],
        model: 'GDC311ZBQ1',
        vendor: 'TuYa',
        description: 'LoraTap garage door opener with wireless sensor',
        fromZigbee: [fz.matsee_garage_door_opener, fz.ignore_basic_report],
        toZigbee: [tz.matsee_garage_door_opener, tz.tuya_data_point_test],
        whiteLabel: [{vendor: 'LoraTap', model: 'GDC311ZBQ1'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [exposes.binary('trigger', ea.STATE_SET, true, false).withDescription('Trigger the door movement'),
            exposes.binary('garage_door_contact', ea.STATE, false, true)
                .withDescription('Indicates if the garage door contact is closed (= true) or open (= false)')],
    },
    {
        fingerprint: [{modelID: 'TS0201', manufacturerName: '_TZ3000_qaaysllp'}],
        model: 'LCZ030',
        vendor: 'TuYa',
        description: 'Temperature & humidity & illuminance sensor with display',
        fromZigbee: [fz.battery, fz.illuminance, fz.temperature, fz.humidity, fz.ts0201_temperature_humidity_alarm],
        toZigbee: [tz.ts0201_temperature_humidity_alarm],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            // Enables reporting of measurement state changes
            await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'genPowerCfg',
                'msTemperatureMeasurement', 'msIlluminanceMeasurement', 'msRelativeHumidity', 'manuSpecificTuya_2']);
        },
        exposes: [e.temperature(), e.humidity(), e.battery(), e.illuminance(), e.illuminance_lux(),
            exposes.numeric('alarm_temperature_max', ea.STATE_SET).withUnit('°C').withDescription('Alarm temperature max')
                .withValueMin(-20).withValueMax(80),
            exposes.numeric('alarm_temperature_min', ea.STATE_SET).withUnit('°C').withDescription('Alarm temperature min')
                .withValueMin(-20).withValueMax(80),
            exposes.numeric('alarm_humidity_max', ea.STATE_SET).withUnit('%').withDescription('Alarm humidity max')
                .withValueMin(0).withValueMax(100),
            exposes.numeric('alarm_humidity_min', ea.STATE_SET).withUnit('%').withDescription('Alarm humidity min')
                .withValueMin(0).withValueMax(100),
            exposes.enum('alarm_humidity', ea.STATE, ['below_min_humdity', 'over_humidity', 'off'])
                .withDescription('Alarm humidity status'),
            exposes.enum('alarm_temperature', ea.STATE, ['below_min_temperature', 'over_temperature', 'off'])
                .withDescription('Alarm temperature status'),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_auin8mzr'}],
        model: 'TS0601_motion_sensor',
        vendor: 'TuYa',
        description: 'Human presence sensor AIR',
        fromZigbee: [fz.tuya_motion_sensor],
        toZigbee: [tz.tuya_motion_sensor],
        exposes: [
            e.occupancy(),
            exposes.enum('o_sensitivity', ea.STATE_SET, Object.values(tuya.msLookups.OSensitivity)).withDescription('O-Sensitivity mode'),
            exposes.enum('v_sensitivity', ea.STATE_SET, Object.values(tuya.msLookups.VSensitivity)).withDescription('V-Sensitivity mode'),
            exposes.enum('led_status', ea.STATE_SET, ['ON', 'OFF']).withDescription('Led status switch'),
            exposes.numeric('vacancy_delay', ea.STATE_SET).withUnit('sec').withDescription('Vacancy delay').withValueMin(0)
                .withValueMax(1000),
            exposes.numeric('light_on_luminance_prefer', ea.STATE_SET).withDescription('Light-On luminance prefer')
                .withValueMin(0).withValueMax(10000),
            exposes.numeric('light_off_luminance_prefer', ea.STATE_SET).withDescription('Light-Off luminance prefer')
                .withValueMin(0).withValueMax(10000),
            exposes.enum('mode', ea.STATE_SET, Object.values(tuya.msLookups.Mode)).withDescription('Working mode'),
            exposes.numeric('luminance_level', ea.STATE).withDescription('Luminance level'),
            exposes.numeric('reference_luminance', ea.STATE).withDescription('Reference luminance'),
            exposes.numeric('vacant_confirm_time', ea.STATE).withDescription('Vacant confirm time'),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_vrfecyku'}],
        model: 'MIR-HE200-TY',
        vendor: 'TuYa',
        description: 'Human presence sensor',
        fromZigbee: [fz.tuya_radar_sensor],
        toZigbee: [tz.tuya_radar_sensor],
        exposes: [
            e.illuminance_lux(), e.presence(), e.occupancy(),
            exposes.numeric('motion_speed', ea.STATE).withDescription('Speed of movement'),
            exposes.enum('motion_direction', ea.STATE, Object.values(tuya.tuyaRadar.motionDirection))
                .withDescription('direction of movement from the point of view of the radar'),
            exposes.numeric('radar_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(1)
                .withDescription('sensitivity of the radar'),
            exposes.enum('radar_scene', ea.STATE_SET, Object.values(tuya.tuyaRadar.radarScene))
                .withDescription('presets for sensitivity for presence and movement'),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_lu01t0zl'}],
        model: 'MIR-HE200-TY_fall',
        vendor: 'TuYa',
        description: 'Human presence sensor with fall function',
        fromZigbee: [fz.tuya_radar_sensor_fall],
        toZigbee: [tz.tuya_radar_sensor_fall],
        exposes: [
            e.illuminance_lux(), e.presence(), e.occupancy(),
            exposes.numeric('motion_speed', ea.STATE).withDescription('Speed of movement'),
            exposes.enum('motion_direction', ea.STATE, Object.values(tuya.tuyaRadar.motionDirection))
                .withDescription('direction of movement from the point of view of the radar'),
            exposes.numeric('radar_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(1)
                .withDescription('sensitivity of the radar'),
            exposes.enum('radar_scene', ea.STATE_SET, Object.values(tuya.tuyaRadar.radarScene))
                .withDescription('presets for sensitivity for presence and movement'),
            exposes.enum('tumble_switch', ea.STATE_SET, ['ON', 'OFF']).withDescription('Tumble status switch'),
            exposes.numeric('fall_sensitivity', ea.STATE_SET).withValueMin(1).withValueMax(10).withValueStep(1)
                .withDescription('fall sensitivity of the radar'),
            exposes.numeric('tumble_alarm_time', ea.STATE_SET).withValueMin(1).withValueMax(5).withValueStep(1)
                .withUnit('min').withDescription('tumble alarm time'),
            exposes.enum('fall_down_status', ea.STATE, Object.values(tuya.tuyaRadar.fallDown))
                .withDescription('fall down status'),
            exposes.text('static_dwell_alarm', ea.STATE).withDescription('static dwell alarm'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await tuya.sendDataPointEnum(endpoint, tuya.dataPoints.trsfTumbleSwitch, false);
        },
    },
    {
        fingerprint: [{modelID: 'TS004F', manufacturerName: '_TZ3000_pcqjmcud'}],
        model: 'YSR-MINI-Z',
        vendor: 'TuYa',
        description: '2 in 1 dimming remote control and scene control',
        exposes: [
            e.battery(),
            e.action(['on', 'off',
                'brightness_move_up', 'brightness_step_up', 'brightness_step_down', 'brightness_move_down', 'brightness_stop',
                'color_temperature_step_down', 'color_temperature_step_up',
                '1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold',
                '3_single', '3_double', '3_hold', '4_single', '4_double', '4_hold',
            ]),
            exposes.enum('operation_mode', ea.ALL, ['command', 'event']).withDescription(
                'Operation mode: "command" - for group control, "event" - for clicks'),
        ],
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop,
            fz.command_step_color_temperature, fz.tuya_on_off_action, fz.tuya_operation_mode],
        toZigbee: [tz.tuya_operation_mode],
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', [0x0004, 0x000, 0x0001, 0x0005, 0x0007, 0xfffe]);
            await endpoint.write('genOnOff', {'tuyaOperationMode': 1});
            await endpoint.read('genOnOff', ['tuyaOperationMode']);
            try {
                await endpoint.read(0xE001, [0xD011]);
            } catch (err) {/* do nothing */}
            await endpoint.read('genPowerCfg', ['batteryVoltage', 'batteryPercentageRemaining']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_hkdl5fmv'}],
        model: 'TS0601_rcbo',
        vendor: 'TuYa',
        whiteLabel: [
            {vendor: 'HOCH', model: 'ZJSBL7-100Z'},
            {vendor: 'WDYK', model: 'ZJSBL7-100Z'},
        ],
        description: 'DIN mount RCBO with smart energy metering',
        fromZigbee: [fz.hoch_din],
        toZigbee: [tz.hoch_din],
        exposes: [
            exposes.text('meter_number', ea.STATE),
            exposes.binary('state', ea.STATE_SET, 'ON', 'OFF'),
            exposes.text('alarm', ea.STATE),
            exposes.binary('trip', ea.STATE_SET, 'trip', 'clear'),
            exposes.binary('child_lock', ea.STATE_SET, 'ON', 'OFF'),
            exposes.enum('power_on_behavior', ea.STATE_SET, ['off', 'on', 'previous']),
            exposes.numeric('countdown_timer', ea.STATE_SET).withValueMin(0).withValueMax(86400).withUnit('s'),
            exposes.numeric('voltage_rms', ea.STATE).withUnit('V'),
            exposes.numeric('current', ea.STATE).withUnit('A'),
            exposes.numeric('current_average', ea.STATE).withUnit('A'),
            e.power(), e.voltage(), e.energy(), e.temperature(),
            exposes.numeric('energy_consumed', ea.STATE).withUnit('kWh'),
            /* TODO: Add toZigbee converters for the below composites
            exposes.composite('voltage_setting', 'voltage_setting')
                .withFeature(exposes.numeric('under_voltage_threshold', ea.STATE_SET)
                    .withValueMin(50)
                    .withValueMax(385)
                    .withUnit('V'))
                .withFeature(exposes.binary('under_voltage_trip', ea.STATE_SET, 'ON', 'OFF'))
                .withFeature(exposes.binary('under_voltage_alarm', ea.STATE_SET, 'ON', 'OFF'))
                .withFeature(exposes.numeric('over_voltage_threshold', ea.STATE_SET)
                    .withValueMin(50)
                    .withValueMax(385)
                    .withUnit('V'))
                .withFeature(exposes.binary('over_voltage_trip', ea.STATE_SET, 'ON', 'OFF'))
                .withFeature(exposes.binary('over_voltage_alarm', ea.STATE_SET, 'ON', 'OFF')),
            exposes.composite('current_setting', 'current_setting')
                .withFeature(exposes.numeric('over_current_threshold', ea.STATE_SET)
                    .withValueMin(0)
                    .withValueMax(999)
                    .withUnit('A'))
                .withFeature(exposes.binary('over_current_trip', ea.STATE_SET, 'ON', 'OFF'))
                .withFeature(exposes.binary('over_current_alarm', ea.STATE_SET, 'ON', 'OFF')),
            exposes.composite('temperature_setting', 'temperature_setting')
                .withFeature(exposes.numeric('over_temperature_threshold', ea.STATE_SET)
                    .withValueMin(-40)
                    .withValueMax(127)
                    .withUnit('°C'))
                .withFeature(exposes.binary('over_temperature_trip', ea.STATE_SET, 'ON', 'OFF'))
                .withFeature(exposes.binary('over_temperature_alarm', ea.STATE_SET, 'ON', 'OFF')),
            exposes.composite('leakage_current_setting', 'leakage_current_setting')
                .withFeature(exposes.numeric('self_test_auto_days', ea.STATE_SET)
                    .withValueMin(1)
                    .withValueMax(28)
                    .withUnit('days'))
                .withFeature(exposes.numeric('self_test_auto_hours', ea.STATE_SET)
                    .withValueMin(0)
                    .withValueMax(23)
                    .withUnit('hours'))
                .withFeature(exposes.binary('self_test_auto', ea.STATE_SET, 'ON', 'OFF'))
                .withFeature(exposes.numeric('over_leakage_current_threshold', ea.STATE_SET)
                    .withValueMin(0)
                    .withValueMax(3000)
                    .withUnit('mA'))
                .withFeature(exposes.binary('over_leakage_current_trip', ea.STATE_SET, 'ON', 'OFF'))
                .withFeature(exposes.binary('over_leakage_current_alarm', ea.STATE_SET, 'ON', 'OFF'))
                .withFeature(exposes.binary('self_test', ea.STATE_SET, 'test', 'clear')),*/
            exposes.enum('clear_device_data', ea.SET, ['']),
        ],
    },
    {
        fingerprint: [{modelID: 'TS004F', manufacturerName: '_TZ3000_4fjiwweb'}, {modelID: 'TS004F', manufacturerName: '_TZ3000_uri7ongn'},
            {modelID: 'TS004F', manufacturerName: '_TZ3000_ixla93vd'}, {modelID: 'TS004F', manufacturerName: '_TZ3000_qja6nq5z'}],
        model: 'ERS-10TZBVK-AA',
        vendor: 'TuYa',
        description: 'Smart knob',
        fromZigbee: [
            fz.command_step, fz.command_toggle, fz.command_move_hue, fz.command_step_color_temperature, fz.command_stop_move_raw,
            fz.tuya_multi_action, fz.tuya_operation_mode, fz.battery,
        ],
        toZigbee: [tz.tuya_operation_mode],
        exposes: [
            e.action([
                'toggle', 'brightness_step_up', 'brightness_step_down', 'color_temperature_step_up', 'color_temperature_step_down',
                'saturation_move', 'hue_move', 'hue_stop', 'single', 'double', 'hold', 'rotate_left', 'rotate_right',
            ]),
            exposes.numeric('action_step_size', ea.STATE).withValueMin(0).withValueMax(255),
            exposes.numeric('action_transition_time', ea.STATE).withUnit('s'),
            exposes.numeric('action_rate', ea.STATE).withValueMin(0).withValueMax(255),
            e.battery(),
            exposes.enum('operation_mode', ea.ALL, ['command', 'event']).withDescription(
                'Operation mode: "command" - for group control, "event" - for clicks'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', [0x0004, 0x000, 0x0001, 0x0005, 0x0007, 0xfffe]);
            await endpoint.write('genOnOff', {'tuyaOperationMode': 1});
            await endpoint.read('genOnOff', ['tuyaOperationMode']);
            try {
                await endpoint.read(0xE001, [0xD011]);
            } catch (err) {/* do nothing */}
            await endpoint.read('genPowerCfg', ['batteryVoltage', 'batteryPercentageRemaining']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_kzm5w4iz'}],
        model: 'TS0601_vibration_sensor',
        vendor: 'TuYa',
        description: 'Smart vibration sensor',
        fromZigbee: [fz.tuya_smart_vibration_sensor],
        toZigbee: [],
        exposes: [e.contact(), e.battery(), e.vibration()],
    },
    {
        fingerprint: [{modelID: `TS0601`, manufacturerName: `_TZE200_yi4jtqq1`}],
        model: `XFY-CGQ-ZIGB`,
        vendor: `TuYa`,
        description: `Illuminance sensor`,
        fromZigbee: [fz.tuya_illuminance_sensor],
        toZigbee: [],
        exposes: [e.illuminance_lux(), e.brightness_state()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_kltffuzl'}, {modelID: 'TS0601', manufacturerName: '_TZE200_fwoorn8y'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_pay2byax'}],
        model: 'TM001-ZA/TM081',
        vendor: 'TuYa',
        description: 'Door and window sensor',
        fromZigbee: [fz.tm081],
        toZigbee: [],
        exposes: [e.contact(), e.battery()],
    },
    {
        fingerprint: [{modelID: `TS0601`, manufacturerName: `_TZE200_2m38mh6k`}],
        model: 'SS9600ZB',
        vendor: 'TuYa',
        description: '6 gang remote',
        exposes: [e.battery(),
            e.action(['1_single', '1_double', '1_hold', '2_single', '2_double', '2_hold', '3_single', '3_double', '3_hold',
                '4_single', '4_double', '4_hold', '5_single', '5_double', '5_hold', '6_single', '6_double', '6_hold'])],
        fromZigbee: [fz.tuya_remote],
        toZigbee: [],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_ikvncluo'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_lyetpprm'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_jva8ink8'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_holel4dk'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_wukb7rhc'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_ztc6ggyl'}],
        model: 'TS0601_smart_human_presense_sensor',
        vendor: 'TuYa',
        description: 'Smart Human presence sensor',
        fromZigbee: [fz.tuya_smart_human_presense_sensor],
        toZigbee: [tz.tuya_smart_human_presense_sensor],
        exposes: [
            e.illuminance_lux(), e.presence(),
            exposes.numeric('target_distance', ea.STATE).withDescription('Distance to target').withUnit('m'),
            exposes.numeric('radar_sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(9).withValueStep(1)
                .withDescription('sensitivity of the radar'),
            exposes.numeric('minimum_range', ea.STATE_SET).withValueMin(0).withValueMax(9.5).withValueStep(0.15)
                .withDescription('Minimum range').withUnit('m'),
            exposes.numeric('maximum_range', ea.STATE_SET).withValueMin(0).withValueMax(9.5).withValueStep(0.15)
                .withDescription('Maximum range').withUnit('m'),
            exposes.numeric('detection_delay', ea.STATE_SET).withValueMin(0).withValueMax(10).withValueStep(0.1)
                .withDescription('Detection delay').withUnit('s'),
            exposes.numeric('fading_time', ea.STATE_SET).withValueMin(0).withValueMax(1500).withValueStep(1)
                .withDescription('Fading time').withUnit('s'),
            // exposes.text('cli', ea.STATE).withDescription('not recognize'),
            exposes.enum('self_test', ea.STATE, Object.values(tuya.tuyaHPSCheckingResult))
                .withDescription('Self_test, possible resuts: checking, check_success, check_failure, others, comm_fault, radar_fault.'),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_whkgqxse'}],
        model: 'JM-TRH-ZGB-V1',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor with clock',
        fromZigbee: [fz.nous_lcd_temperature_humidity_sensor, fz.ignore_tuya_set_time],
        toZigbee: [tz.nous_lcd_temperature_humidity_sensor],
        onEvent: tuya.onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [
            e.temperature(), e.humidity(), e.battery(),
            exposes.numeric('temperature_report_interval', ea.STATE_SET).withUnit('min').withValueMin(5).withValueMax(60).withValueStep(5)
                .withDescription('Temperature Report interval'),
            exposes.enum('temperature_unit_convert', ea.STATE_SET, ['celsius', 'fahrenheit']).withDescription('Current display unit'),
            exposes.enum('temperature_alarm', ea.STATE, ['canceled', 'lower_alarm', 'upper_alarm'])
                .withDescription('Temperature alarm status'),
            exposes.numeric('max_temperature', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(60)
                .withDescription('Alarm temperature max'),
            exposes.numeric('min_temperature', ea.STATE_SET).withUnit('°C').withValueMin(-20).withValueMax(60)
                .withDescription('Alarm temperature min'),
            exposes.enum('humidity_alarm', ea.STATE, ['canceled', 'lower_alarm', 'upper_alarm'])
                .withDescription('Humidity alarm status'),
            exposes.numeric('max_humidity', ea.STATE_SET).withUnit('%').withValueMin(0).withValueMax(100)
                .withDescription('Alarm humidity max'),
            exposes.numeric('min_humidity', ea.STATE_SET).withUnit('%').withValueMin(0).withValueMax(100)
                .withDescription('Alarm humidity min'),
        ],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_qoy0ekbd'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_znbl8dj5'}],
        model: 'CX-0726',
        vendor: 'TuYa',
        description: 'Temperature & humidity LCD sensor',
        fromZigbee: [fz.tuya_temperature_humidity_sensor, fz.ignore_tuya_set_time],
        toZigbee: [],
        onEvent: tuya.onEventSetLocalTime,
        exposes: [e.temperature(), e.humidity(), e.battery()],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_3towulqd'}, {modelID: 'TS0601', manufacturerName: '_TZE200_1ibpyhdc'}],
        model: 'ZG-204ZL',
        vendor: 'TuYa',
        description: 'Luminance motion sensor',
        fromZigbee: [fz.ZG204ZL_lms],
        toZigbee: [tz.ZG204ZL_lms],
        exposes: [
            e.occupancy(), e.illuminance().withUnit('lx'), e.battery(),
            exposes.enum('sensitivity', ea.ALL, ['low', 'medium', 'high'])
                .withDescription('PIR sensor sensitivity (refresh and update only while active)'),
            exposes.enum('keep_time', ea.ALL, ['10', '30', '60', '120'])
                .withDescription('PIR keep time in seconds (refresh and update only while active)'),
        ],
    },
    {
        fingerprint: [{modelID: 'TS004F', manufacturerName: '_TZ3000_kjfzuycl'}],
        model: 'ERS-10TZBVB-AA',
        vendor: 'TuYa',
        description: 'Smart button',
        fromZigbee: [
            fz.command_step, fz.command_on, fz.command_off, fz.command_move_to_color_temp, fz.command_move_to_level,
            fz.tuya_multi_action, fz.tuya_operation_mode, fz.battery,
        ],
        toZigbee: [tz.tuya_operation_mode],
        exposes: [
            e.action([
                'single', 'double', 'hold', 'brightness_move_to_level', 'color_temperature_move',
                'brightness_step_up', 'brightness_step_down', 'on', 'off',
            ]),
            e.battery(),
            exposes.enum('operation_mode', ea.ALL, ['command', 'event']).withDescription(
                'Operation mode: "command" - for group control, "event" - for clicks'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', [0x0004, 0x000, 0x0001, 0x0005, 0x0007, 0xfffe]);
            await endpoint.write('genOnOff', {'tuyaOperationMode': 1});
            await endpoint.read('genOnOff', ['tuyaOperationMode']);
            try {
                await endpoint.read(0xE001, [0xD011]);
            } catch (err) {/* do nothing */}
            await endpoint.read('genPowerCfg', ['batteryVoltage', 'batteryPercentageRemaining']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_zyrdrmno'}],
        model: 'ZB-Sm',
        vendor: 'TuYa',
        description: 'Tubular motor',
        fromZigbee: [fzLocal.zb_sm_cover, fz.ignore_basic_report],
        toZigbee: [tzLocal.zb_sm_cover],
        onEvent: tuya.onEventSetTime,
        exposes: [
            e.cover_position().setAccess('position', ea.STATE_SET),
            exposes.enum('goto_positon', ea.SET, ['25', '50', '75', 'FAVORITE']),
            exposes.enum('motor_state', ea.STATE, ['OPENING', 'CLOSING', 'STOPPED']),
            exposes.numeric('active_power', ea.STATE).withDescription('Active power').withUnit('mWt'),
            exposes.numeric('cycle_count', ea.STATE).withDescription('Cycle count'),
            exposes.numeric('cycle_time', ea.STATE).withDescription('Cycle time').withUnit('ms'),
            exposes.enum('top_limit', ea.STATE_SET, ['SET', 'CLEAR']).withDescription('Setup or clear top limit'),
            exposes.enum('bottom_limit', ea.STATE_SET, ['SET', 'CLEAR']).withDescription('Setup or clear bottom limit'),
            exposes.numeric('favorite_position', ea.STATE_SET).withValueMin(0).withValueMax(100)
                .withDescription('Favorite position of this cover'),
            exposes.binary(`reverse_direction`, ea.STATE_SET, true, false).withDescription(`Inverts the cover direction`),
            exposes.text('motor_type', ea.STATE),
            exposes.enum('report', ea.SET, ['']),
        ],
    },
    {
        fingerprint: [{modelID: 'TS1201', manufacturerName: '_TZ3290_7v1k4vufotpowp9z'}],
        model: 'ZS06',
        vendor: 'TuYa',
        description: 'Universal smart IR remote control',
        fromZigbee: [
            fzZosung.zosung_send_ir_code_00, fzZosung.zosung_send_ir_code_01, fzZosung.zosung_send_ir_code_02,
            fzZosung.zosung_send_ir_code_03, fzZosung.zosung_send_ir_code_04, fzZosung.zosung_send_ir_code_05,
        ],
        toZigbee: [tzZosung.zosung_ir_code_to_send, tzZosung.zosung_learn_ir_code],
        exposes: [ez.learn_ir_code(), ez.learned_ir_code(), ez.ir_code_to_send()],
    },
    {
        fingerprint: [{modelID: 'TS0201', manufacturerName: '_TZ3000_itnrsufe'}],
        model: 'KCTW1Z',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor with LCD',
        fromZigbee: [fz.temperature, fzLocal.humidity10, fzLocal.temperature_unit, fz.battery, fz.ignore_tuya_set_time],
        toZigbee: [tzLocal.temperature_unit],
        onEvent: tuya.onEventSetLocalTime,
        exposes: [
            e.temperature(), e.humidity(), e.battery(), e.battery_voltage(),
            exposes.enum('temperature_unit', ea.STATE_SET, ['celsius', 'fahrenheit']).withDescription('Current display unit'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity']);
            await endpoint.read('genPowerCfg', ['batteryVoltage', 'batteryPercentageRemaining']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_0u3bj3rc'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_v6ossqfy'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_mx6u6l4y'}],
        model: 'TS0601_human_presence_sensor',
        vendor: 'TuYa',
        description: 'Human presence sensor Zigbee',
        fromZigbee: [fzLocal.hpsz],
        toZigbee: [tzLocal.hpsz],
        onEvent: tuya.onEventSetLocalTime,
        exposes: [e.presence(),
            exposes.numeric('duration_of_attendance', ea.STATE).withUnit('minutes')
                .withDescription('Shows the presence duration in minutes'),
            exposes.numeric('duration_of_absence', ea.STATE).withUnit('minutes')
                .withDescription('Shows the duration of the absence in minutes'),
            exposes.binary('led_state', ea.STATE_SET, true, false)
                .withDescription('Turns the onboard LED on or off'),
        ],
    },
];
