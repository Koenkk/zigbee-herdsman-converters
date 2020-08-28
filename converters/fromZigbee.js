'use strict';

/**
 * Documentation of convert() parameters
 * - model: zigbee-herdsman-converters definition (form devices.js)
 * - msg: message data property
 * - publish: publish method
 * - options: converter options object, e.g. {occupancy_timeout: 120}
 * - meta: object containing {device: (zigbee-herdsman device object)}
 */

const common = require('./common');
const utils = require('./utils');

const occupancyTimeout = 90; // In seconds

const defaultPrecision = {
    temperature: 2,
    humidity: 2,
    pressure: 1,
};

const calibrateAndPrecisionRoundOptions = (number, options, type) => {
    // Calibrate
    const calibrateKey = `${type}_calibration`;
    let calibrationOffset = options && options.hasOwnProperty(calibrateKey) ? options[calibrateKey] : 0;
    if (type == 'illuminance' || type === 'illuminance_lux') {
        // linear calibration because measured value is zero based
        // +/- percent
        calibrationOffset = Math.round(number * calibrationOffset / 100);
    }
    number = number + calibrationOffset;

    // Precision round
    const precisionKey = `${type}_precision`;
    const defaultValue = defaultPrecision[type] || 0;
    const precision = options && options.hasOwnProperty(precisionKey) ? options[precisionKey] : defaultValue;
    return precisionRound(number, precision);
};

const precisionRound = (number, precision) => {
    if (typeof precision === 'number') {
        const factor = Math.pow(10, precision);
        return Math.round(number * factor) / factor;
    } else if (typeof precision === 'object') {
        const thresholds = Object.keys(precision).map(Number).sort((a, b) => b - a);
        for (const t of thresholds) {
            if (! isNaN(t) && number >= t) {
                return precisionRound(number, precision[t]);
            }
        }
    }
    return number;
};


const toPercentage = (value, min, max) => {
    if (value > max) {
        value = max;
    } else if (value < min) {
        value = min;
    }

    const normalised = (value - min) / (max - min);
    return Math.round(normalised * 100);
};

const toPercentageCR2032 = (voltage) => {
    let percentage = null;

    if (voltage < 2100) {
        percentage = 0;
    } else if (voltage < 2440) {
        percentage = 6 - ((2440 - voltage) * 6) / 340;
    } else if (voltage < 2740) {
        percentage = 18 - ((2740 - voltage) * 12) / 300;
    } else if (voltage < 2900) {
        percentage = 42 - ((2900 - voltage) * 24) / 160;
    } else if (voltage < 3000) {
        percentage = 100 - ((3000 - voltage) * 58) / 100;
    } else if (voltage >= 3000) {
        percentage = 100;
    }

    return Math.round(percentage);
};

const numberWithinRange = (number, min, max) => {
    if (number > max) {
        return max;
    } else if (number < min) {
        return min;
    } else {
        return number;
    }
};

// get object property name (key) by it's value
const getKey = (object, value) => {
    for (const key in object) {
        if (object[key]==value) return key;
    }
};

// Global variable store that can be used by devices.
const store = {};

const ictcg1 = (model, msg, publish, options, action) => {
    const deviceID = msg.device.ieeeAddr;
    const payload = {};

    if (!store[deviceID]) {
        store[deviceID] = {since: false, direction: false, value: 255, publish: publish};
    }

    const s = store[deviceID];
    // if rate == 70 so we rotate slowly
    const rate = (msg.data.rate == 70) ? 0.3 : 1;

    if (action === 'move') {
        s.since = Date.now();
        const direction = msg.data.movemode === 1 ? 'left' : 'right';
        s.direction = direction;
        payload.action = `rotate_${direction}`;
    } else if (action === 'level') {
        s.value = msg.data.level;
        const direction = s.value === 0 ? 'left' : 'right';
        payload.action = `rotate_${direction}_quick`;
        payload.brightness = s.value;
    } else if (action === 'stop') {
        if (s.direction) {
            const duration = Date.now() - s.since;
            const delta = Math.round(rate * (duration / 10) * (s.direction === 'left' ? -1 : 1));
            const newValue = s.value + delta;
            if (newValue >= 0 && newValue <= 255) {
                s.value = newValue;
            }
        }
        payload.action = 'rotate_stop';
        payload.brightness = s.value;
        s.direction = false;
    }
    if (s.timerId) {
        clearInterval(s.timerId);
        s.timerId = false;
    }
    if (action === 'move') {
        s.timerId = setInterval(() => {
            const duration = Date.now() - s.since;
            const delta = Math.round(rate * (duration / 10) * (s.direction === 'left' ? -1 : 1));
            const newValue = s.value + delta;
            if (newValue >= 0 && newValue <= 255) {
                s.value = newValue;
            }
            payload.brightness = s.value;
            s.since = Date.now();
            s.publish(payload);
        }, 200);
    }
    return payload.brightness;
};

const postfixWithEndpointName = (name, msg, definition) => {
    if (definition.meta && definition.meta.multiEndpoint) {
        const endpointName = definition.hasOwnProperty('endpoint') ?
            getKey(definition.endpoint(msg.device), msg.endpoint.ID) : msg.endpoint.ID;
        return `${name}_${endpointName}`;
    } else {
        return name;
    }
};

const addActionGroup = (payload, msg, definition) => {
    const disableActionGroup = definition.meta && definition.meta.disableActionGroup;
    if (!disableActionGroup && msg.groupID) {
        payload.action_group = msg.groupID;
    }
};

const ratelimitedDimmer = (model, msg, publish, options, meta) => {
    const deviceID = msg.device.ieeeAddr;
    const payload = {};
    let duration = 0;

    if (!store[deviceID]) {
        store[deviceID] = {lastmsg: false};
    }
    const s = store[deviceID];

    if (s.lastmsg) {
        duration = Date.now() - s.lastmsg;
    } else {
        s.lastmsg = Date.now();
    }

    if (duration > 500) {
        s.lastmsg = Date.now();
        payload.action = 'brightness';
        payload.brightness = msg.data.level;
        publish(payload);
    }
};

const transactionStore = {};
const hasAlreadyProcessedMessage = (msg, transaction=null) => {
    const current = transaction !== null ? transaction : msg.meta.zclTransactionSequenceNumber;
    if (transactionStore[msg.device.ieeeAddr] === current) return true;
    transactionStore[msg.device.ieeeAddr] = current;
    return false;
};

const holdUpdateBrightness324131092621 = (deviceID) => {
    if (store[deviceID] && store[deviceID].brightnessSince && store[deviceID].brightnessDirection) {
        const duration = Date.now() - store[deviceID].brightnessSince;
        const delta = (duration / 10) * (store[deviceID].brightnessDirection === 'up' ? 1 : -1);
        const newValue = store[deviceID].brightnessValue + delta;
        store[deviceID].brightnessValue = numberWithinRange(newValue, 1, 255);
    }
};

const tuyaThermostat = (model, msg, publish, options, meta) => {
    const dp = msg.data.dp;
    const data = msg.data.data;
    const dataAsDecNumber = utils.convertMultiByteNumberPayloadToSingleDecimalNumber(data);
    let temperature;

    /*
     * Structure of the ZCL payload used by Tuya:
     *
     * - status: unit8 - 1 byte
     * - transid: unit8 - 1 byte
     * - dp: uint16 - 2 bytes* (Big Endian format)
     * - fn: uint8 - 1 byte
     * - data: octStr - variable**
     *
     * Examples:
     * | status | transid | dp                | fn | data              |
     * | 0      | 4       | 0x02 0x02 -> 514  | 0  | [4, 0, 0, 0, 180] |
     * | 0      | 16      | 0x04 0x04 -> 1028 | 0  | [1, 2]            |
     *
     * * The 2 bytes field "dp" uses Big Endian which means that the most meaninful
     * byte goes right. In plain English: a value like 0x07 0x01 has to be read
     * from the left so, it becomes 0x0107 witch in base 10 is 263 (the code for
     * child lock status).
     *
     * ** The type octStr prefixes the first byte of the value with the lenght of the
     * data payload.
     */

    switch (dp) {
    case 104: // 0x6800 window params
        return {
            window_detection: data[0] ? 'ON' : 'OFF',
            window_detection_params: {
                // valve: data[0] ? 'ON' : 'OFF',
                temperature: data[1],
                minutes: data[2],
            },
        };
    case 112: // set schedule for workdays [6,0,20,8,0,15,11,30,15,12,30,15,17,30,20,22,0,15]
        // 6:00 - 20*, 8:00 - 15*, 11:30 - 15*, 12:30 - 15*, 17:30 - 20*, 22:00 - 15*
        return {workdays: [
            {hour: data[0], minute: data[1], temperature: data[2]},
            {hour: data[3], minute: data[4], temperature: data[5]},
            {hour: data[6], minute: data[7], temperature: data[8]},
            {hour: data[9], minute: data[10], temperature: data[11]},
            {hour: data[12], minute: data[13], temperature: data[14]},
            {hour: data[15], minute: data[16], temperature: data[17]},
        ]};
    case 113: // set schedule for holidays [6,0,20,8,0,15,11,30,15,12,30,15,17,30,20,22,0,15]
        // 6:00 - 20*, 8:00 - 15*, 11:30 - 15*, 12:30 - 15*, 17:30 - 20*, 22:00 - 15*
        return {holidays: [
            {hour: data[0], minute: data[1], temperature: data[2]},
            {hour: data[3], minute: data[4], temperature: data[5]},
            {hour: data[6], minute: data[7], temperature: data[8]},
            {hour: data[9], minute: data[10], temperature: data[11]},
            {hour: data[12], minute: data[13], temperature: data[14]},
            {hour: data[15], minute: data[16], temperature: data[17]},
        ]};
    case 263: // 0x0701 Changed child lock status
        return {child_lock: dataAsDecNumber ? 'LOCKED' : 'UNLOCKED'};
    case 274: // 0x1201 Enabled/disabled window detection feature
        return {window_detection: dataAsDecNumber ? 'ON' : 'OFF'};
    case 276: // 0x1401 Enabled/disabled Valve detection feature
        return {valve_detection: dataAsDecNumber ? 'ON' : 'OFF'};
    case 372: // 0x7401 auto lock mode
        return {auto_lock: dataAsDecNumber ? 'AUTO' : 'MANUAL'};
    case 514: // 0x0202 Changed target temperature
        temperature = (dataAsDecNumber / 10).toFixed(1);
        return {current_heating_setpoint: temperature};
    case 515: // 0x0302 MCU reporting room temperature
        temperature = (dataAsDecNumber / 10).toFixed(1);
        return {local_temperature: temperature};
    case 556: // 0x2c02 Temperature calibration
        temperature = (dataAsDecNumber / 10).toFixed(1);
        return {local_temperature_calibration: temperature};
    case 533: // 0x1502 MCU reporting battery status
        return {battery: dataAsDecNumber};
    case 614: // 0x6602 min temperature limit
        return {min_temperature: dataAsDecNumber};
    case 615: // 0x6702 max temperature limit
        return {max_temperature: dataAsDecNumber};
    case 617: // 0x6902 boost time
        return {boost_time: dataAsDecNumber};
    case 619: // 0x6b02 comfort temperature
        return {comfort_temperature: dataAsDecNumber};
    case 620: // 0x6c02 ECO temperature
        return {eco_temperature: dataAsDecNumber};
    case 621: // 0x6d02 valve position
        return {position: dataAsDecNumber};
    case 626: // 0x7202 away preset temperature
        return {away_preset_temperature: dataAsDecNumber};
    case 629: // 0x7502 away preset number of days
        return {away_preset_days: dataAsDecNumber};
    case 1028: {// 0x0404 Preset changed
        const ret = {};
        const presetOk = utils.getMetaValue(msg.endpoint, model, 'tuyaThermostatPreset').hasOwnProperty(dataAsDecNumber);
        const modeOk = utils.getMetaValue(msg.endpoint, model, 'tuyaThermostatSystemMode').hasOwnProperty(dataAsDecNumber);
        if (presetOk) {
            ret.preset = utils.getMetaValue(msg.endpoint, model, 'tuyaThermostatPreset')[dataAsDecNumber];
        }
        if (modeOk) {
            ret.system_mode = utils.getMetaValue(msg.endpoint, model, 'tuyaThermostatSystemMode')[dataAsDecNumber];
        } else {
            console.log(`TRV preset/mode ${dataAsDecNumber} is not recognized.`);
            return;
        }
        return ret;
    }
    case 1029: // fan mode 0 - low , 1 - medium , 2 - high , 3 - auto ( tested on 6dfgetq TUYA zigbee module )
        return {fan_mode: common.TuyaFanModes[dataAsDecNumber]};
    case 1130: // 0x6a04 force mode 0 - normal, 1 - open, 2 - close
        return {force: common.TuyaThermostatForceMode[dataAsDecNumber]};
    case 1135: // Week select 0 - 5 days, 1 - 6 days, 2 - 7 days
        return {week: common.TuyaThermostatWeekFormat[dataAsDecNumber]};
    default: // The purpose of the codes 1041 & 1043 are still unknown
        console.log(`zigbee-herdsman-converters:siterwell_gs361: NOT RECOGNIZED DP #${
            dp} with data ${JSON.stringify(data)}`);
    }
};

const converters = {
    /**
     * Generic/recommended converters, re-use if possible.
     */
    lock_operation_event: {
        cluster: 'closuresDoorLock',
        type: 'commandOperationEventNotification',
        convert: (model, msg, publish, options, meta) => {
            const lookup = {
                0: 'unknown',
                1: 'lock',
                2: 'unlock',
                3: 'lock_failure_invalid_pin_or_id',
                4: 'lock_failure_invalid_schedule',
                5: 'unlock_failure_invalid_pin_or_id',
                6: 'unlock_failure_invalid_schedule',
                7: 'one_touch_lock',
                8: 'key_lock',
                9: 'key_unlock',
                10: 'auto_lock',
                11: 'schedule_lock',
                12: 'schedule_unlock',
                13: 'manual_lock',
                14: 'manual_unlock',
                15: 'non_access_user_operational_event',
            };

            return {
                action: lookup[msg.data['opereventcode']],
                action_user: msg.data['userid'],
                action_source: msg.data['opereventsrc'],
                action_source_name: common.lockSourceName[msg.data['opereventsrc']],
            };
        },
    },
    lock_programming_event: {
        cluster: 'closuresDoorLock',
        type: 'commandProgrammingEventNotification',
        convert: (model, msg, publish, options, meta) => {
            const lookup = {
                0: 'unknown',
                1: 'master_code_changed',
                2: 'pin_code_added',
                3: 'pin_code_deleted',
                4: 'pin_code_changed',
                5: 'rfid_code_added',
                6: 'rfid_code_deleted',
            };
            return {
                action: lookup[msg.data['programeventcode']],
                action_user: msg.data['userid'],
                action_source: msg.data['programeventsrc'],
                action_source_name: common.lockSourceName[msg.data['programeventsrc']],
            };
        },
    },
    lock: {
        cluster: 'closuresDoorLock',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('lockState')) {
                const lookup = {0: 'not_fully_locked', 1: 'locked', 2: 'unlocked'};
                return {
                    state: msg.data.lockState == 1 ? 'LOCK' : 'UNLOCK',
                    lock_state: lookup[msg.data['lockState']],
                };
            }
        },
    },
    lock_pin_code_rep: {
        cluster: 'closuresDoorLock',
        type: ['commandGetPinCodeRsp'],
        convert: (model, msg, publish, options, meta) => {
            const {data} = msg;
            let status = '';
            let pinCodeValue = null;
            switch (data.userstatus) {
            case 0:
                status = 'available';
                break;
            case 1:
                status = 'enabled';
                pinCodeValue = data.pincodevalue;
                break;
            case 2:
                status = 'disabled';
                break;
            default:
                status = 'not_supported';
            }
            const userId = data.userid.toString();
            const result = {users: {}};
            result.users[userId] = {status: status};
            if (options && options.expose_pin && pinCodeValue) {
                result.users[userId].pin_code = pinCodeValue;
            }
            return result;
        },
    },
    battery: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const payload = {};
            if (msg.data.hasOwnProperty('batteryPercentageRemaining')) {
                payload.battery = precisionRound(msg.data['batteryPercentageRemaining'] / 2, 2);
            }

            if (msg.data.hasOwnProperty('batteryVoltage')) {
                // Deprecated: voltage is = mV now but should be V
                payload.voltage = msg.data['batteryVoltage'] * 100;

                if (model.meta && model.meta.battery && model.meta.battery.voltageToPercentage) {
                    if (model.meta.battery.voltageToPercentage === 'CR2032') {
                        payload.battery = toPercentageCR2032(payload.voltage);
                    }
                }
            }

            if (msg.data.hasOwnProperty('batteryAlarmState')) {
                const battery1Low = (msg.data.batteryAlarmState & 1<<0) > 0;
                const battery2Low = (msg.data.batteryAlarmState & 1<<9) > 0;
                const battery3Low = (msg.data.batteryAlarmState & 1<<19) > 0;
                payload.battery_low = battery1Low || battery2Low || battery3Low;
            }

            return payload;
        },
    },
    battery_not_divided: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const payload = converters.battery.convert(model, msg, publish, options, meta);

            if (msg.data.hasOwnProperty('batteryPercentageRemaining')) {
                // Some devices do not comply to the ZCL and report a
                // batteryPercentageRemaining of 100 when the battery is full.
                payload['battery'] = precisionRound(msg.data['batteryPercentageRemaining'], 2);
            }

            return payload;
        },
    },
    temperature: {
        cluster: 'msTemperatureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const temperature = parseFloat(msg.data['measuredValue']) / 100.0;
            return {temperature: calibrateAndPrecisionRoundOptions(temperature, options, 'temperature')};
        },
    },
    humidity: {
        cluster: 'msRelativeHumidity',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const humidity = parseFloat(msg.data['measuredValue']) / 100.0;

            // https://github.com/Koenkk/zigbee2mqtt/issues/798
            // Sometimes the sensor publishes non-realistic vales, it should only publish message
            // in the 0 - 100 range, don't produce messages beyond these values.
            if (humidity >= 0 && humidity <= 100) {
                return {humidity: calibrateAndPrecisionRoundOptions(humidity, options, 'humidity')};
            }
        },
    },
    illuminance: {
        cluster: 'msIlluminanceMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            // DEPRECATED: only return lux here (change illuminance_lux -> illuminance)
            const illuminance = msg.data['measuredValue'];
            const illuminanceLux = Math.pow(10, (illuminance - 1) / 10000);
            return {
                illuminance: calibrateAndPrecisionRoundOptions(illuminance, options, 'illuminance'),
                illuminance_lux: calibrateAndPrecisionRoundOptions(illuminanceLux, options, 'illuminance_lux'),
            };
        },
    },
    pressure: {
        cluster: 'msPressureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const pressure = parseFloat(msg.data['measuredValue']);
            return {pressure: calibrateAndPrecisionRoundOptions(pressure, options, 'pressure')};
        },
    },
    co2: {
        cluster: 'msCO2',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {co2: Math.floor(msg.data.measuredValue * 1000000)};
        },
    },
    occupancy: {
        // This is for occupancy sensor that send motion start AND stop messages
        cluster: 'msOccupancySensing',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('occupancy')) {
                return {occupancy: msg.data.occupancy === 1};
            }
        },
    },
    occupancy_with_timeout: {
        // This is for occupancy sensor that only send a message when motion detected,
        // but do not send a motion stop.
        // Therefore we need to publish the no_motion detected by ourselves.
        cluster: 'msOccupancySensing',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.occupancy !== 1) {
                // In case of 0 no occupancy is reported.
                // https://github.com/Koenkk/zigbee2mqtt/issues/467
                return;
            }

            // The occupancy sensor only sends a message when motion detected.
            // Therefore we need to publish the no_motion detected by ourselves.
            const timeout = options && options.hasOwnProperty('occupancy_timeout') ?
                options.occupancy_timeout : occupancyTimeout;
            const deviceID = msg.device.ieeeAddr;

            // Stop existing timers because motion is detected and set a new one.
            if (store[deviceID]) {
                store[deviceID].forEach((t) => clearTimeout(t));
            }

            store[deviceID] = [];

            if (timeout !== 0) {
                const timer = setTimeout(() => {
                    publish({occupancy: false});
                }, timeout * 1000);

                store[deviceID].push(timer);
            }

            // No occupancy since
            if (options && options.no_occupancy_since) {
                options.no_occupancy_since.forEach((since) => {
                    const timer = setTimeout(() => {
                        publish({no_occupancy_since: since});
                    }, since * 1000);
                    store[deviceID].push(timer);
                });
            }

            if (options && options.no_occupancy_since) {
                return {occupancy: true, no_occupancy_since: 0};
            } else {
                return {occupancy: true};
            }
        },
    },
    occupancy_timeout: {
        cluster: 'msOccupancySensing',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('pirOToUDelay')) {
                return {occupancy_timeout: msg.data.pirOToUDelay};
            }
        },
    },
    brightness: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('currentLevel')) {
                const property = postfixWithEndpointName('brightness', msg, model);
                let value = msg.data['currentLevel'];

                if (meta.state && meta.state.state === 'OFF') {
                    value = 0;
                }

                return {[property]: value};
            }
        },
    },
    metering_power: {
        /**
         * When using this converter also add the following to the configure method of the device:
         * await readMeteringPowerConverterAttributes(endpoint);
         */
        cluster: 'seMetering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const payload = {};
            const multiplier = msg.endpoint.getClusterAttributeValue('seMetering', 'multiplier');
            const divisor = msg.endpoint.getClusterAttributeValue('seMetering', 'divisor');
            const factor = multiplier && divisor ? multiplier / divisor : null;

            if (msg.data.hasOwnProperty('instantaneousDemand')) {
                let power = msg.data['instantaneousDemand'];
                if (factor != null) {
                    power = (power * factor) * 1000; // kWh to Watt
                }
                payload.power = precisionRound(power, 2);
            }

            if (factor != null && (msg.data.hasOwnProperty('currentSummDelivered') ||
                msg.data.hasOwnProperty('currentSummReceived'))) {
                let energy = 0;
                if (msg.data.hasOwnProperty('currentSummDelivered')) {
                    const data = msg.data['currentSummDelivered'];
                    const value = (parseInt(data[0]) << 32) + parseInt(data[1]);
                    energy += value * factor;
                }
                if (msg.data.hasOwnProperty('currentSummReceived')) {
                    const data = msg.data['currentSummReceived'];
                    const value = (parseInt(data[0]) << 32) + parseInt(data[1]);
                    energy -= value * factor;
                }
                payload.energy = precisionRound(energy, 2);
            }

            return payload;
        },
    },
    electrical_measurement_power: {
        /**
         * When using this converter also add the following to the configure method of the device:
         * await readEletricalMeasurementConverterAttributes(endpoint);
         */
        cluster: 'haElectricalMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const getFactor = (key) => {
                const multiplier = msg.endpoint.getClusterAttributeValue('haElectricalMeasurement', `${key}Multiplier`);
                const divisor = msg.endpoint.getClusterAttributeValue('haElectricalMeasurement', `${key}Divisor`);
                const factor = multiplier && divisor ? multiplier / divisor : 1;
                return factor;
            };

            const lookup = [
                {key: 'activePower', name: 'power', factor: 'acPower'},
                {key: 'activePowerPhB', name: 'power_phase_b', factor: 'acPower'},
                {key: 'activePowerPhC', name: 'power_phase_c', factor: 'acPower'},
                {key: 'rmsCurrent', name: 'current', factor: 'acCurrent'},
                {key: 'rmsCurrentPhB', name: 'current_phase_b', factor: 'acCurrent'},
                {key: 'rmsCurrentPhC', name: 'current_phase_c', factor: 'acCurrent'},
                {key: 'rmsVoltage', name: 'voltage', factor: 'acVoltage'},
                {key: 'rmsVoltagePhB', name: 'voltage_phase_b', factor: 'acVoltage'},
                {key: 'rmsVoltagePhC', name: 'voltage_phase_c', factor: 'acVoltage'},
            ];

            const payload = {};
            for (const entry of lookup) {
                if (msg.data.hasOwnProperty(entry.key)) {
                    const factor = getFactor(entry.factor);
                    const property = postfixWithEndpointName(entry.name, msg, model);
                    payload[property] = precisionRound(msg.data[entry.key] * factor, 2);
                }
            }
            return payload;
        },
    },
    on_off: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('onOff')) {
                const property = postfixWithEndpointName('state', msg, model);
                return {[property]: msg.data['onOff'] === 1 ? 'ON' : 'OFF'};
            }
        },
    },
    ias_water_leak_alarm_1: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                water_leak: (zoneStatus & 1) > 0,
                tamper: (zoneStatus & 1<<2) > 0,
                battery_low: (zoneStatus & 1<<3) > 0,
            };
        },
    },
    ias_gas_alarm_1: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                gas: (zoneStatus & 1) > 0,
                tamper: (zoneStatus & 1<<2) > 0,
                battery_low: (zoneStatus & 1<<3) > 0,
            };
        },
    },
    ias_gas_alarm_2: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                gas: (zoneStatus & 1<<1) > 0,
                tamper: (zoneStatus & 1<<2) > 0,
                battery_low: (zoneStatus & 1<<3) > 0,
            };
        },
    },
    ias_smoke_alarm_1: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            const zoneState = msg.data.zoneState;
            return {
                enrolled: zoneState === 1,
                smoke: (zoneStatus & 1) > 0,
                tamper: (zoneStatus & 1<<2) > 0,
                battery_low: (zoneStatus & 1<<3) > 0,
                supervision_reports: (zoneStatus & 1<<4) > 0,
                restore_reports: (zoneStatus & 1<<5) > 0,
                trouble: (zoneStatus & 1<<6) > 0,
                ac_status: (zoneStatus & 1<<7) > 0,
            };
        },
    },
    ias_contact_alarm_1: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                contact: !((zoneStatus & 1) > 0),
                tamper: (zoneStatus & 1<<2) > 0,
                battery_low: (zoneStatus & 1<<3) > 0,
            };
        },
    },
    ias_carbon_monoxide_alarm_1: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                carbon_monoxide: (zoneStatus & 1) > 0,
                tamper: (zoneStatus & 1<<2) > 0,
                battery_low: (zoneStatus & 1<<3) > 0,
            };
        },
    },
    ias_sos_alarm_2: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                sos: (zoneStatus & 1<<1) > 0,
                battery_low: (zoneStatus & 1<<3) > 0,
            };
        },
    },
    ias_occupancy_alarm_1: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                occupancy: (zoneStatus & 1) > 0,
                tamper: (zoneStatus & 1<<2) > 0,
                battery_low: (zoneStatus & 1<<3) > 0,
            };
        },
    },
    ias_occupancy_alarm_2: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                occupancy: (zoneStatus & 1<<1) > 0,
                tamper: (zoneStatus & 1<<2) > 0,
                battery_low: (zoneStatus & 1<<3) > 0,
            };
        },
    },
    ias_occupancy_alarm_1_with_timeout: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            const deviceID = msg.device.ieeeAddr;
            const timeout = options && options.hasOwnProperty('occupancy_timeout') ?
                options.occupancy_timeout : occupancyTimeout;

            if (store[deviceID]) {
                clearTimeout(store[deviceID]);
                store[deviceID] = null;
            }

            if (timeout !== 0) {
                store[deviceID] = setTimeout(() => {
                    publish({occupancy: false});
                    store[deviceID] = null;
                }, timeout * 1000);
            }

            return {
                occupancy: (zoneStatus & 1) > 0,
                tamper: (zoneStatus & 1<<2) > 0,
                battery_low: (zoneStatus & 1<<3) > 0,
            };
        },
    },
    command_recall: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            const payload = {action: postfixWithEndpointName(`recall_${msg.data.sceneid}`, msg, model)};
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    command_panic: {
        cluster: 'ssIasAce',
        type: 'commandPanic',
        convert: (model, msg, publish, options, meta) => {
            const payload = {action: postfixWithEndpointName(`panic`, msg, model)};
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    command_arm: {
        cluster: 'ssIasAce',
        type: 'commandArm',
        convert: (model, msg, publish, options, meta) => {
            const payload = {
                action: postfixWithEndpointName(common.armMode[msg.data['armmode']], msg, model),
                action_code: msg.data.code,
                action_zone: msg.data.zoneid,
            };
            if (model.meta && model.meta.commandArmIncludeTransaction) {
                payload.action_transaction = msg.meta.zclTransactionSequenceNumber;
            }
            if (msg.groupID) payload.action_group = msg.groupID;
            return payload;
        },
    },
    command_cover_stop: {
        cluster: 'closuresWindowCovering',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            const payload = {action: postfixWithEndpointName('stop', msg, model)};
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    command_cover_open: {
        cluster: 'closuresWindowCovering',
        type: 'commandUpOpen',
        convert: (model, msg, publish, options, meta) => {
            const payload = {action: postfixWithEndpointName('open', msg, model)};
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    command_cover_close: {
        cluster: 'closuresWindowCovering',
        type: 'commandDownClose',
        convert: (model, msg, publish, options, meta) => {
            const payload = {action: postfixWithEndpointName('close', msg, model)};
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    command_on: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            const payload = {action: postfixWithEndpointName('on', msg, model)};
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    command_off: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options, meta) => {
            const payload = {action: postfixWithEndpointName('off', msg, model)};
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    command_off_with_effect: {
        cluster: 'genOnOff',
        type: 'commandOffWithEffect',
        convert: (model, msg, publish, options, meta) => {
            const payload = {action: postfixWithEndpointName(`off`, msg, model)};
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    command_toggle: {
        cluster: 'genOnOff',
        type: 'commandToggle',
        convert: (model, msg, publish, options, meta) => {
            const payload = {action: postfixWithEndpointName('toggle', msg, model)};
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    command_move_to_level: {
        cluster: 'genLevelCtrl',
        type: ['commandMoveToLevel', 'commandMoveToLevelWithOnOff'],
        convert: (model, msg, publish, options, meta) => {
            const payload = {
                action: postfixWithEndpointName(`brightness_move_to_level`, msg, model),
                action_level: msg.data.level,
                action_transition_time: msg.data.transtime / 100,
            };
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    command_move: {
        cluster: 'genLevelCtrl',
        type: ['commandMove', 'commandMoveWithOnOff'],
        convert: (model, msg, publish, options, meta) => {
            const direction = msg.data.movemode === 1 ? 'down' : 'up';
            const action = postfixWithEndpointName(`brightness_move_${direction}`, msg, model);
            const payload = {action, action_rate: msg.data.rate};
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    command_step: {
        cluster: 'genLevelCtrl',
        type: ['commandStep', 'commandStepWithOnOff'],
        convert: (model, msg, publish, options, meta) => {
            const direction = msg.data.stepmode === 1 ? 'down' : 'up';
            const payload = {
                action: postfixWithEndpointName(`brightness_step_${direction}`, msg, model),
                action_step_size: msg.data.stepsize,
                action_transition_time: msg.data.transtime / 100,
            };
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    command_stop: {
        cluster: 'genLevelCtrl',
        type: ['commandStop', 'commandStopWithOnOff'],
        convert: (model, msg, publish, options, meta) => {
            const payload = {action: postfixWithEndpointName(`brightness_stop`, msg, model)};
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    command_step_color_temperature: {
        cluster: 'lightingColorCtrl',
        type: 'commandStepColorTemp',
        convert: (model, msg, publish, options, meta) => {
            const direction = msg.data.stepmode === 1 ? 'up' : 'down';
            const payload = {
                action: postfixWithEndpointName(`color_temperature_step_${direction}`, msg, model),
                action_step_size: msg.data.stepsize,
            };
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    command_ehanced_move_to_hue_and_saturation: {
        cluster: 'lightingColorCtrl',
        type: 'commandEnhancedMoveToHueAndSaturation',
        convert: (model, msg, publish, options, meta) => {
            const payload = {
                action: postfixWithEndpointName(`enhanced_move_to_hue_and_saturation`, msg, model),
                action_enhanced_hue: msg.data.enhancehue,
                action_hue: msg.data.enhancehue * 360 / 65536 % 360,
                action_saturation: msg.data.saturation,
                action_transition_time: msg.data.transtime,
            };

            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    command_color_loop_set: {
        cluster: 'lightingColorCtrl',
        type: 'commandColorLoopSet',
        convert: (model, msg, publish, options, meta) => {
            const updateFlags = msg.data.updateflags;
            const actionLookup = {
                0x00: 'deactivate',
                0x01: 'activate_from_color_loop_start_enhanced_hue',
                0x02: 'activate_from_enhanced_current_hue',
            };

            const payload = {
                action: postfixWithEndpointName(`color_loop_set`, msg, model),
                action_update_flags: {
                    action: (updateFlags & 1 << 0) > 0,
                    direction: (updateFlags & 1 << 1) > 0,
                    time: (updateFlags & 1 << 2) > 0,
                    start_hue: (updateFlags & 1 << 3) > 0,
                },
                action_action: actionLookup[msg.data.action],
                action_direction: msg.data.direction === 0 ? 'decrement' : 'increment',
                action_time: msg.data.time,
                action_start_hue: msg.data.starthue,
            };

            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    command_move_to_color_temp: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToColorTemp',
        convert: (model, msg, publish, options, meta) => {
            const payload = {
                action: postfixWithEndpointName(`color_temperature_move`, msg, model),
                action_color_temperature: msg.data.colortemp,
                action_transition_time: msg.data.transtime,
            };
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    command_move_to_color: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToColor',
        convert: (model, msg, publish, options, meta) => {
            const payload = {
                action: postfixWithEndpointName(`color_move`, msg, model),
                action_color: {
                    x: precisionRound(msg.data.colorx / 65535, 3),
                    y: precisionRound(msg.data.colory / 65535, 3),
                },
                action_transition_time: msg.data.transtime,
            };
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    command_move_hue: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveHue',
        convert: (model, msg, publish, options, meta) => {
            const payload = {action: postfixWithEndpointName('hue_move', msg, model)};
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    command_emergency: {
        cluster: 'ssIasAce',
        type: 'commandEmergency',
        convert: (model, msg, publish, options, meta) => {
            const payload = {action: postfixWithEndpointName(`emergency`, msg, model)};
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    command_on_state: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            const property = postfixWithEndpointName('state', msg, model);
            return {[property]: 'ON'};
        },
    },
    command_off_state: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options, meta) => {
            const property = postfixWithEndpointName('state', msg, model);
            return {[property]: 'OFF'};
        },
    },
    identify: {
        cluster: 'genIdentify',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {action: postfixWithEndpointName(`identify`, msg, model)};
        },
    },
    cover_position_tilt: {
        cluster: 'closuresWindowCovering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            // Zigbee officially expects 'open' to be 0 and 'closed' to be 100 whereas
            // HomeAssistant etc. work the other way round.
            // For zigbee-herdsman-converters: open = 100, close = 0
            // ubisys J1 will report 255 if lift or tilt positions are not known, so skip that.
            const invert = model.meta && model.meta.coverInverted ? !options.invert_cover : options.invert_cover;
            if (msg.data.hasOwnProperty('currentPositionLiftPercentage') && msg.data['currentPositionLiftPercentage'] <= 100) {
                const value = msg.data['currentPositionLiftPercentage'];
                result.position = invert ? value : 100 - value;
            }
            if (msg.data.hasOwnProperty('currentPositionTiltPercentage') && msg.data['currentPositionTiltPercentage'] <= 100) {
                const value = msg.data['currentPositionTiltPercentage'];
                result.tilt = invert ? value : 100 - value;
            }
            return result;
        },
    },

    cover_position_via_brightness: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const currentLevel = msg.data['currentLevel'];
            let position = Math.round(Number(currentLevel) / 2.55).toString();
            position = options.invert_cover ? 100 - position : position;
            const state = options.invert_cover ? (position > 0 ? 'CLOSE' : 'OPEN') : (position > 0 ? 'OPEN' : 'CLOSE');
            return {state: state, position: position};
        },
    },
    cover_state_via_onoff: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('onOff')) {
                return {state: msg.data['onOff'] === 1 ? 'OPEN' : 'CLOSE'};
            }
        },
    },

    /**
     * Non-generic converters, re-use if possible
     */
    xiaomi_on_off_action: {
        cluster: 'genOnOff',
        type: ['attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            if (['QBKG04LM', 'QBKG11LM', 'QBKG21LM', 'QBKG03LM', 'QBKG12LM', 'QBKG22LM'].includes(model.model) && msg.data['61440']) {
                return;
            }

            let mapping = null;
            if (['QBKG03LM', 'QBKG12LM', 'QBKG22LM'].includes(model.model)) mapping = {4: 'left', 5: 'right', 6: 'both'};
            if (['WXKG02LM'].includes(model.model)) mapping = {1: 'left', 2: 'right', 3: 'both'};

            // Dont' use postfixWithEndpointName here, endpoints don't match
            if (mapping) {
                const button = mapping[msg.endpoint.ID];
                return {action: `single_${button}`};
            } else {
                return {action: 'single'};
            }
        },
    },
    xiaomi_multistate_action: {
        cluster: 'genMultistateInput',
        type: ['attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg)) return;
            let actionLookup = {0: 'hold', 1: 'single', 2: 'double', 255: 'release'};
            let buttonLookup = null;
            if (model.model === 'WXKG02LM') buttonLookup = {1: 'left', 2: 'right', 3: 'both'};
            if (model.model === 'QBKG12LM') buttonLookup = {5: 'left', 6: 'right', 7: 'both'};
            if (model.model === 'WXKG12LM') {
                actionLookup = {...actionLookup, 16: 'hold', 17: 'release', 18: 'shake'};
            }

            const action = actionLookup[msg.data['presentValue']];
            if (buttonLookup) {
                const button = buttonLookup[msg.endpoint.ID];
                if (button) {
                    return {action: `${action}_${button}`};
                }
            } else {
                return {action};
            }
        },
    },
    xiaomi_WXKG01LM_action: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg)) return;
            const deviceID = msg.device.ieeeAddr;
            const state = msg.data['onOff'];
            if (!store[deviceID]) store[deviceID] = {};

            // 0 = click down, 1 = click up, else = multiple clicks
            if (state === 0) {
                store[deviceID].timer = setTimeout(() => {
                    publish({action: 'hold'});
                    store[deviceID].timer = null;
                    store[deviceID].hold = Date.now();
                    store[deviceID].hold_timer = setTimeout(() => {
                        store[deviceID].hold = false;
                    }, options.hold_timeout_expire || 4000);
                    // After 4000 milliseconds of not reciving release we assume it will not happen.
                }, options.hold_timeout || 1000); // After 1000 milliseconds of not releasing we assume hold.
            } else if (state === 1) {
                if (store[deviceID].hold) {
                    const duration = Date.now() - store[deviceID].hold;
                    publish({action: 'release', duration: duration});
                    store[deviceID].hold = false;
                }

                if (store[deviceID].timer) {
                    clearTimeout(store[deviceID].timer);
                    store[deviceID].timer = null;
                    publish({action: 'single'});
                }
            } else {
                const clicks = msg.data['32768'];
                const actionLookup = {1: 'single', 2: 'double', 3: 'triple', 4: 'quadruple'};
                const payload = actionLookup[clicks] ? actionLookup[clicks] : 'many';
                publish({action: payload});
            }
        },
    },
    xiaomi_WXKG11LM_action: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            let clicks;
            if (msg.data.onOff) {
                clicks = 1;
            } else if (msg.data['32768']) {
                clicks = msg.data['32768'];
            }

            const actionLookup = {1: 'single', 2: 'double', 3: 'triple', 4: 'quadruple'};
            if (actionLookup[clicks]) {
                return {action: actionLookup[clicks]};
            }
        },
    },
    command_status_change_notification_action: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const lookup = {0: 'off', 1: 'single', 2: 'double', 3: 'hold'};
            const zoneStatus = msg.data.zonestatus;
            return {action: lookup[zoneStatus]};
        },
    },
    ptvo_multistate_action: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const actionLookup = {1: 'single', 2: 'double', 3: 'tripple', 4: 'hold'};
            const value = msg.data['presentValue'];
            const action = actionLookup[value];
            return {action: postfixWithEndpointName(action, msg, model)};
        },
    },
    terncy_raw: {
        cluster: 'manuSpecificClusterAduroSmart',
        type: 'raw',
        convert: (model, msg, publish, options, meta) => {
            // 13,40,18,104, 0,8,1 - single
            // 13,40,18,22,  0,17,1
            // 13,40,18,32,  0,18,1
            // 13,40,18,6,   0,16,1
            // 13,40,18,111, 0,4,2 - double
            // 13,40,18,58,  0,7,2
            // 13,40,18,6,   0,2,3 - triple
            // motion messages:
            // 13,40,18,105, 4,167,0,7 - motion on right side
            // 13,40,18,96,  4,27,0,5
            // 13,40,18,101, 4,27,0,7
            // 13,40,18,125, 4,28,0,5
            // 13,40,18,85,  4,28,0,7
            // 13,40,18,3,   4,24,0,5
            // 13,40,18,81,  4,10,1,7
            // 13,40,18,72,  4,30,1,5
            // 13,40,18,24,  4,25,0,40 - motion on left side
            // 13,40,18,47,  4,28,0,56
            // 13,40,18,8,   4,32,0,40
            let value = {};
            if (msg.data[4] == 0) {
                value = msg.data[6];
                if (1 <= value && value <= 3) {
                    const actionLookup = {1: 'single', 2: 'double', 3: 'triple', 4: 'quadruple'};
                    return {action: actionLookup[value]};
                }
            } else if (msg.data[4] == 4) {
                value = msg.data[7];
                const sidelookup = {5: 'right', 7: 'right', 40: 'left', 56: 'left'};
                if (sidelookup[value]) {
                    msg.data.occupancy = 1;
                    const payload = converters.occupancy_with_timeout.convert(model, msg, publish, options, meta);
                    payload.action_side = sidelookup[value];
                    payload.side = sidelookup[value]; /* legacy: remove this line (replaced by action_side) */

                    return payload;
                }
            }
        },
    },
    konke_action: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const value = msg.data['onOff'];
            const lookup = {128: 'single', 129: 'double', 130: 'hold'};
            return lookup[value] ? {action: lookup[value]} : null;
        },
    },
    xiaomi_curtain_position: {
        cluster: 'genAnalogOutput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            let running = false;

            if (model.model === 'ZNCLDJ12LM' && msg.type === 'attributeReport' && [0, 2].includes(msg.data['presentValue'])) {
                // Incorrect reports from the device, ignore (re-read by onEvent of ZNCLDJ12LM)
                // https://github.com/Koenkk/zigbee-herdsman-converters/pull/1427#issuecomment-663862724
                return;
            }

            if (msg.data['61440']) {
                running = msg.data['61440'] !== 0;
            }

            let position = precisionRound(msg.data['presentValue'], 2);
            position = options.invert_cover ? 100 - position : position;
            return {position: position, running: running};
        },
    },
    xiaomi_curtain_options: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const data = msg.data['1025'];
            if (data) {
                return {
                    options: { // next values update only when curtain finished initial setup and knows current position
                        reverse_direction: data[2]=='\u0001',
                        hand_open: data[5]=='\u0000',
                    },
                };
            }
        },
    },
    xiaomi_operation_mode_basic: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const payload = {};
            if (['QBKG04LM', 'QBKG11LM', 'QBKG21LM'].includes(model.model)) {
                const mappingMode = {0x12: 'control_relay', 0xFE: 'decoupled'};
                const key = '65314';
                if (msg.data.hasOwnProperty(key)) {
                    payload.operation_mode = mappingMode[msg.data[key]];
                }
            } else if (['QBKG03LM', 'QBKG12LM', 'QBKG22LM'].includes(model.model)) {
                const mappingButton = {'65314': 'left', '65315': 'right'};
                const mappingMode = {0x12: 'control_left_relay', 0x22: 'control_right_relay', 0xFE: 'decoupled'};
                for (const key in mappingButton) {
                    if (msg.data.hasOwnProperty(key)) {
                        const mode = mappingMode[msg.data[key]];
                        payload[`operation_mode_${mappingButton[key]}`] = mode;
                    }
                }
            } else {
                throw new Error('Not supported');
            }

            return payload;
        },
    },
    xiaomi_operation_mode_opple: {
        cluster: 'aqaraOpple',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const mappingButton = {
                1: 'left',
                2: 'center',
                3: 'right',
            };
            const mappingMode = {
                0x01: 'control_relay',
                0x00: 'decoupled',
            };
            for (const key in mappingButton) {
                if (msg.endpoint.ID == key && msg.data.hasOwnProperty('512')) {
                    const payload = {};
                    const mode = mappingMode['512'];
                    payload[`operation_mode_${mappingButton[key]}`] = mode;
                    return payload;
                }
            }
        },
    },

    /**
     * Legacy: DONT RE-USE!!
     */
    legacy_WXKG11LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                const data = msg.data;
                let clicks;

                if (data.onOff) {
                    clicks = 1;
                } else if (data['32768']) {
                    clicks = data['32768'];
                }

                const actionLookup = {1: 'single', 2: 'double', 3: 'triple', 4: 'quadruple'};
                if (actionLookup[clicks]) {
                    return {click: actionLookup[clicks]};
                }
            }
        },
    },
    legacy_konke_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const value = msg.data['onOff'];
            const lookup = {
                128: {click: 'single'}, // single click
                129: {click: 'double'}, // double and many click
                130: {click: 'long'}, // hold
            };

            return lookup[value] ? lookup[value] : null;
        },
    },
    legacy_xiaomi_action_click_multistate: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const value = msg.data['presentValue'];
            const lookup = {
                1: {click: 'single'}, // single click
                2: {click: 'double'}, // double click
            };

            return lookup[value] ? lookup[value] : null;
        },
    },
    legacy_WXKG12LM_action_click_multistate: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                const value = msg.data['presentValue'];
                const lookup = {
                    1: {click: 'single'}, // single click
                    2: {click: 'double'}, // double click
                };

                return lookup[value] ? lookup[value] : null;
            }
        },
    },
    legacy_terncy_raw: {
        cluster: 'manuSpecificClusterAduroSmart',
        type: 'raw',
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                // 13,40,18,104, 0,8,1 - click
                // 13,40,18,22,  0,17,1
                // 13,40,18,32,  0,18,1
                // 13,40,18,6,   0,16,1
                // 13,40,18,111, 0,4,2 - double click
                // 13,40,18,58,  0,7,2
                // 13,40,18,6,   0,2,3 - triple click
                // motion messages:
                // 13,40,18,105, 4,167,0,7 - motion on right side
                // 13,40,18,96,  4,27,0,5
                // 13,40,18,101, 4,27,0,7
                // 13,40,18,125, 4,28,0,5
                // 13,40,18,85,  4,28,0,7
                // 13,40,18,3,   4,24,0,5
                // 13,40,18,81,  4,10,1,7
                // 13,40,18,72,  4,30,1,5
                // 13,40,18,24,  4,25,0,40 - motion on left side
                // 13,40,18,47,  4,28,0,56
                // 13,40,18,8,   4,32,0,40
                let value = {};
                if (msg.data[4] == 0) {
                    value = msg.data[6];
                    if (1 <= value && value <= 3) {
                        const actionLookup = {1: 'single', 2: 'double', 3: 'triple', 4: 'quadruple'};
                        return {click: actionLookup[value]};
                    }
                }
            }
        },
    },
    legacy_CCTSwitch_D0001_on_off: {
        cluster: 'genOnOff',
        type: ['commandOn', 'commandOff'],
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                return {click: 'power'};
            }
        },
    },
    legacy_ptvo_switch_buttons: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
                const value = msg.data['presentValue'];

                const actionLookup = {
                    1: 'single',
                    2: 'double',
                    3: 'tripple',
                    4: 'hold',
                };

                const action = actionLookup[value];

                if (button) {
                    return {click: button + (action ? `_${action}` : '')};
                }
            }
        },
    },
    legacy_ZGRC013_brightness_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                const button = msg.endpoint.ID;
                const direction = msg.data.movemode == 0 ? 'up' : 'down';
                if (button) {
                    return {click: `${button}_${direction}`};
                }
            }
        },
    },
    legacy_ZGRC013_brightness_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStopWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                const button = msg.endpoint.ID;
                if (button) {
                    return {click: `${button}_stop`};
                }
            }
        },
    },
    legacy_ZGRC013_scene: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                return {click: `scene_${msg.data.groupid}_${msg.data.sceneid}`};
            }
        },
    },
    legacy_ZGRC013_cmdOn: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            const button = msg.endpoint.ID;
            if (button) {
                return {click: `${button}_on`};
            }
        },
    },
    legacy_ZGRC013_cmdOff: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                const button = msg.endpoint.ID;
                if (button) {
                    return {click: `${button}_off`};
                }
            }
        },
    },
    legacy_ZGRC013_brightness: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                const button = msg.endpoint.ID;
                const direction = msg.data.movemode == 0 ? 'up' : 'down';
                if (button) {
                    return {click: `${button}_${direction}`};
                }
            }
        },
    },
    legacy_CTR_U_scene: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                return {click: `scene_${msg.data.groupid}_${msg.data.sceneid}`};
            }
        },
    },
    legacy_st_button_state: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                const buttonStates = {
                    0: 'off',
                    1: 'single',
                    2: 'double',
                    3: 'hold',
                };

                if (msg.data.hasOwnProperty('data')) {
                    const zoneStatus = msg.data.zonestatus;
                    return {click: buttonStates[zoneStatus]};
                } else {
                    const zoneStatus = msg.data.zonestatus;
                    return {click: buttonStates[zoneStatus]};
                }
            }
        },
    },
    legacy_QBKG11LM_click: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                if ([1, 2].includes(msg.data.presentValue)) {
                    const times = {1: 'single', 2: 'double'};
                    return {click: times[msg.data.presentValue]};
                }
            }
        },
    },
    legacy_QBKG12LM_click: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                if ([1, 2].includes(msg.data.presentValue)) {
                    const mapping = {5: 'left', 6: 'right', 7: 'both'};
                    const times = {1: 'single', 2: 'double'};
                    const button = mapping[msg.endpoint.ID];
                    return {click: `${button}_${times[msg.data.presentValue]}`};
                }
            }
        },
    },
    legacy_QBKG03LM_QBKG12LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                if (!msg.data['61440']) {
                    const mapping = {4: 'left', 5: 'right', 6: 'both'};
                    const button = mapping[msg.endpoint.ID];
                    return {click: button};
                }
            }
        },
    },
    legacy_QBKG04LM_QBKG11LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                if (!msg.data['61440']) {
                    return {click: 'single'};
                }
            }
        },
    },
    legacy_cover_stop: {
        cluster: 'closuresWindowCovering',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                return {click: 'release'};
            }
        },
    },
    legacy_cover_open: {
        cluster: 'closuresWindowCovering',
        type: 'commandUpOpen',
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                return {click: 'open'};
            }
        },
    },
    legacy_cover_close: {
        cluster: 'closuresWindowCovering',
        type: 'commandDownClose',
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                return {click: 'close'};
            }
        },
    },
    legacy_WXKG03LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                return {click: 'single'};
            }
        },
    },
    legacy_xiaomi_on_off_action: {
        cluster: 'genOnOff',
        type: ['attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            // Legacy: use xiaomi_on_off_action_single
            return {action: getKey(model.endpoint(msg.device), msg.endpoint.ID)};
        },
    },
    legacy_WXKG02LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                return {click: getKey(model.endpoint(msg.device), msg.endpoint.ID)};
            }
        },
    },
    legacy_WXKG02LM_click_multistate: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            // Somestime WXKG02LM sends multiple messages on a single click, this prevents handling
            // of a message with the same transaction sequence number twice.
            const current = msg.meta.zclTransactionSequenceNumber;
            if (store[msg.device.ieeeAddr + 'legacy'] === current) return;
            store[msg.device.ieeeAddr + 'legacy'] = current;

            const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
            const value = msg.data['presentValue'];

            const actionLookup = {
                0: 'long',
                1: null,
                2: 'double',
            };

            const action = actionLookup[value];

            if (button) {
                if (!options.hasOwnProperty('legacy') || options.legacy) {
                    return {click: button + (action ? `_${action}` : '')};
                }
            }
        },
    },
    legacy_WXKG01LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                const deviceID = msg.device.ieeeAddr;
                const state = msg.data['onOff'];
                const key = `${deviceID}_legacy`;

                if (!store[key]) {
                    store[key] = {};
                }

                const current = msg.meta.zclTransactionSequenceNumber;
                if (store[key].transaction === current) return;
                store[key].transaction = current;

                // 0 = click down, 1 = click up, else = multiple clicks
                if (state === 0) {
                    store[key].timer = setTimeout(() => {
                        publish({click: 'long'});
                        store[key].timer = null;
                        store[key].long = Date.now();
                        store[key].long_timer = setTimeout(() => {
                            store[key].long = false;
                        }, 4000); // After 4000 milliseconds of not reciving long_release we assume it will not happen.
                    }, options.long_timeout || 1000); // After 1000 milliseconds of not releasing we assume long click.
                } else if (state === 1) {
                    if (store[key].long) {
                        const duration = Date.now() - store[key].long;
                        publish({click: 'long_release', duration: duration});
                        store[key].long = false;
                    }

                    if (store[key].timer) {
                        clearTimeout(store[key].timer);
                        store[key].timer = null;
                        publish({click: 'single'});
                    }
                } else {
                    const clicks = msg.data['32768'];
                    const actionLookup = {1: 'single', 2: 'double', 3: 'triple', 4: 'quadruple'};
                    const payload = actionLookup[clicks] ? actionLookup[clicks] : 'many';
                    publish({click: payload});
                }
            }
        },
    },
    legacy_scenes_recall_click: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                return {click: msg.data.sceneid};
            }
        },
    },
    legacy_AV2010_34_click: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                return {click: msg.data.groupid};
            }
        },
    },
    legacy_E1743_brightness_down: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                return {click: 'brightness_down'};
            }
        },
    },
    legacy_E1743_brightness_up: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                return {click: 'brightness_up'};
            }
        },
    },
    legacy_E1743_brightness_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStopWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                return {click: 'brightness_stop'};
            }
        },
    },
    legacy_genOnOff_cmdOn: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                return {click: 'on'};
            }
        },
    },
    legacy_genOnOff_cmdOff: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options, meta) => {
            if (!options.hasOwnProperty('legacy') || options.legacy) {
                return {click: 'off'};
            }
        },
    },
    legacy_xiaomi_multistate_action: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            // refactor to xiaomi_multistate_action]
            const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
            const value = msg.data['presentValue'];
            const actionLookup = {0: 'long', 1: null, 2: 'double'};
            const action = actionLookup[value];

            if (button) {
                return {action: `${button}${(action ? `_${action}` : '')}`};
            }
        },
    },
    legacy_E1744_play_pause: {
        cluster: 'genOnOff',
        type: 'commandToggle',
        convert: (model, msg, publish, options, meta) => {
            if (options.hasOwnProperty('legacy') && options.legacy === false) {
                return converters.command_toggle.convert(model, msg, publish, options, meta);
            } else {
                return {action: 'play_pause'};
            }
        },
    },
    legacy_E1744_skip: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options, meta) => {
            if (options.hasOwnProperty('legacy') && options.legacy === false) {
                return converters.command_step.convert(model, msg, publish, options, meta);
            } else {
                const direction = msg.data.stepmode === 1 ? 'backward' : 'forward';
                return {
                    action: `skip_${direction}`,
                    step_size: msg.data.stepsize,
                    transition_time: msg.data.transtime,
                };
            }
        },
    },
    legacy_cmd_move: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            if (options.hasOwnProperty('legacy') && options.legacy === false) {
                return converters.command_move.convert(model, msg, publish, options, meta);
            } else {
                ictcg1(model, msg, publish, options, 'move');
                const direction = msg.data.movemode === 1 ? 'left' : 'right';
                return {action: `rotate_${direction}`, rate: msg.data.rate};
            }
        },
    },
    legacy_cmd_move_with_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (options.hasOwnProperty('legacy') && options.legacy === false) {
                return converters.command_move.convert(model, msg, publish, options, meta);
            } else {
                ictcg1(model, msg, publish, options, 'move');
                const direction = msg.data.movemode === 1 ? 'left' : 'right';
                return {action: `rotate_${direction}`, rate: msg.data.rate};
            }
        },
    },
    legacy_cmd_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            if (options.hasOwnProperty('legacy') && options.legacy === false) {
                return converters.command_stop.convert(model, msg, publish, options, meta);
            } else {
                const value = ictcg1(model, msg, publish, options, 'stop');
                return {action: `rotate_stop`, brightness: value};
            }
        },
    },
    legacy_cmd_stop_with_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandStopWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (options.hasOwnProperty('legacy') && options.legacy === false) {
                return converters.command_stop.convert(model, msg, publish, options, meta);
            } else {
                const value = ictcg1(model, msg, publish, options, 'stop');
                return {action: `rotate_stop`, brightness: value};
            }
        },
    },
    legacy_cmd_move_to_level_with_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveToLevelWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (options.hasOwnProperty('legacy') && options.legacy === false) {
                return converters.command_move_to_level.convert(model, msg, publish, options, meta);
            } else {
                const value = ictcg1(model, msg, publish, options, 'level');
                const direction = msg.data.level === 0 ? 'left' : 'right';
                return {action: `rotate_${direction}_quick`, level: msg.data.level, brightness: value};
            }
        },
    },

    /**
     * TODO: Converters to be checked
     */
    scenes_recall_scene_65029: {
        cluster: 65029,
        type: ['raw'],
        convert: (model, msg, publish, options, meta) => {
            return {action: `scene_${msg.data[msg.data.length - 1]}`};
        },
    },
    HS2SK_SKHMP30I1_power: {
        cluster: 'haElectricalMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};

            if (msg.data.hasOwnProperty('activePower')) {
                result.power = msg.data['activePower'] / 10;
            }

            if (msg.data.hasOwnProperty('rmsCurrent')) {
                result.current = msg.data['rmsCurrent'] / 100;
            }

            if (msg.data.hasOwnProperty('rmsVoltage')) {
                result.voltage = msg.data['rmsVoltage'] / 100;
            }

            return result;
        },
    },
    bitron_power: {
        cluster: 'seMetering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {power: parseFloat(msg.data['instantaneousDemand']) / 10.0};
        },
    },
    bitron_battery_att_report: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (typeof msg.data['batteryVoltage'] == 'number') {
                const battery = {max: 3200, min: 2500};
                const voltage = msg.data['batteryVoltage'] * 100;
                result.battery = toPercentage(voltage, battery.min, battery.max);
                result.voltage = voltage; // @deprecated
                // result.voltage = voltage / 1000.0;
            }
            if (typeof msg.data['batteryAlarmState'] == 'number') {
                result.battery_alarm_state = msg.data['batteryAlarmState'];
            }
            return result;
        },
    },
    bitron_thermostat_att_report: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (typeof msg.data['localTemp'] == 'number') {
                result.local_temperature = precisionRound(msg.data['localTemp'], 2) / 100;
            }
            if (typeof msg.data['localTemperatureCalibration'] == 'number') {
                result.local_temperature_calibration =
                    precisionRound(msg.data['localTemperatureCalibration'], 2) / 10;
            }
            if (typeof msg.data['occupiedHeatingSetpoint'] == 'number') {
                result.occupied_heating_setpoint =
                    precisionRound(msg.data['occupiedHeatingSetpoint'], 2) / 100;
            }
            if (typeof msg.data['runningState'] == 'number') {
                result.running_state = msg.data['runningState'];
            }
            if (typeof msg.data['batteryAlarmState'] == 'number') {
                result.battery_alarm_state = msg.data['batteryAlarmState'];
            }
            return result;
        },
    },
    smartthings_contact: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            return {contact: msg.data.zonestatus === 48};
        },
    },
    xiaomi_battery_3v: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            let voltage = null;

            if (msg.data['65281']) {
                voltage = msg.data['65281']['1'];
            } else if (msg.data['65282']) {
                voltage = msg.data['65282']['1'].elmVal;
            }

            if (voltage) {
                return {
                    battery: toPercentageCR2032(voltage),
                    voltage: voltage, // @deprecated
                    // voltage: voltage / 1000.0,
                };
            }
        },
    },
    RTCGQ11LM_interval: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data['65281']) {
                // DEPRECATED: only return lux here (change illuminance_lux -> illuminance)
                const illuminance = msg.data['65281']['11'];
                return {
                    illuminance: calibrateAndPrecisionRoundOptions(illuminance, options, 'illuminance'),
                    illuminance_lux: calibrateAndPrecisionRoundOptions(illuminance, options, 'illuminance_lux'),
                };
            }
        },
    },
    RTCGQ11LM_illuminance: {
        cluster: 'msIlluminanceMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            // DEPRECATED: only return lux here (change illuminance_lux -> illuminance)
            const illuminance = msg.data['measuredValue'];
            return {
                illuminance: calibrateAndPrecisionRoundOptions(illuminance, options, 'illuminance'),
                illuminance_lux: calibrateAndPrecisionRoundOptions(illuminance, options, 'illuminance_lux'),
            };
        },
    },
    WSDCGQ01LM_WSDCGQ11LM_interval: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data['65281']) {
                const result = {};
                const temperature = parseFloat(msg.data['65281']['100']) / 100.0;
                const humidity = parseFloat(msg.data['65281']['101']) / 100.0;

                // https://github.com/Koenkk/zigbee2mqtt/issues/798
                // Sometimes the sensor publishes non-realistic vales, as the sensor only works from
                // -20 till +60, don't produce messages beyond these values.
                if (temperature > -25 && temperature < 65) {
                    result.temperature = calibrateAndPrecisionRoundOptions(temperature, options, 'temperature');
                }

                // in the 0 - 100 range, don't produce messages beyond these values.
                if (humidity >= 0 && humidity <= 100) {
                    result.humidity = calibrateAndPrecisionRoundOptions(humidity, options, 'humidity');
                }

                // Check if contains pressure (WSDCGQ11LM only)
                if (msg.data['65281'].hasOwnProperty('102')) {
                    const pressure = parseFloat(msg.data['65281']['102']) / 100.0;
                    result.pressure = calibrateAndPrecisionRoundOptions(pressure, options, 'pressure');
                }

                return result;
            }
        },
    },
    xiaomi_temperature: {
        cluster: 'msTemperatureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const temperature = parseFloat(msg.data['measuredValue']) / 100.0;

            // https://github.com/Koenkk/zigbee2mqtt/issues/798
            // Sometimes the sensor publishes non-realistic vales, as the sensor only works from
            // -20 till +60, don't produce messages beyond these values.
            if (temperature > -25 && temperature < 65) {
                return {temperature: calibrateAndPrecisionRoundOptions(temperature, options, 'temperature')};
            }
        },
    },
    MFKZQ01LM_action_multistate: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            /*
            Source: https://github.com/kirovilya/ioBroker.zigbee
                +---+
                | 2 |
            +---+---+---+
            | 4 | 0 | 1 |
            +---+---+---+
                |M5I|
                +---+
                | 3 |
                +---+
            Side 5 is with the MI logo, side 3 contains the battery door.
            presentValue = 0 = shake
            presentValue = 2 = wakeup
            presentValue = 3 = fly/fall
            presentValue = y + x * 8 + 64 = 90º Flip from side x on top to side y on top
            presentValue = x + 128 = 180º flip to side x on top
            presentValue = x + 256 = push/slide cube while side x is on top
            presentValue = x + 512 = double tap while side x is on top
            */
            const value = msg.data['presentValue'];
            let action = null;

            if (value === 0) action = {'action': 'shake'};
            else if (value === 2) action = {'action': 'wakeup'};
            else if (value === 3) action = {'action': 'fall'};
            else if (value >= 512) action = {'action': 'tap', 'side': value-512};
            else if (value >= 256) action = {'action': 'slide', 'side': value-256};
            else if (value >= 128) action = {'action': 'flip180', 'side': value-128};
            else if (value >= 64) {
                action = {action: 'flip90', from_side: Math.floor((value-64) / 8), to_side: value % 8, side: value % 8};
            }

            return action ? action : null;
        },
    },
    MFKZQ01LM_action_analog: {
        cluster: 'genAnalogInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            /*
            Source: https://github.com/kirovilya/ioBroker.zigbee
            presentValue = rotation angle left < 0, right > 0
            */
            const value = msg.data['presentValue'];
            return {
                action: value < 0 ? 'rotate_left' : 'rotate_right',
                angle: Math.floor(value * 100) / 100,
            };
        },
    },
    tradfri_occupancy: {
        cluster: 'genOnOff',
        type: 'commandOnWithTimedOff',
        convert: (model, msg, publish, options, meta) => {
            const timeout = msg.data.ontime / 10;
            const deviceID = msg.device.ieeeAddr;

            // Stop existing timer because motion is detected and set a new one.
            if (store[deviceID]) {
                clearTimeout(store[deviceID]);
                store[deviceID] = null;
            }

            if (timeout !== 0) {
                store[deviceID] = setTimeout(() => {
                    publish({occupancy: false});
                    store[deviceID] = null;
                }, timeout * 1000);
            }

            return {occupancy: true};
        },
    },
    E1745_requested_brightness: {
        // Possible values are 76 (30%) or 254 (100%)
        cluster: 'genLevelCtrl',
        type: 'commandMoveToLevelWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            return {
                requested_brightness_level: msg.data.level,
                requested_brightness_percent: Math.round(msg.data.level / 254 * 100),
            };
        },
    },
    SP600_power: {
        cluster: 'seMetering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (meta.device.dateCode === '20160120') {
                // Cannot use metering_power, divisor/multiplier is not according to ZCL.
                // https://github.com/Koenkk/zigbee2mqtt/issues/2233
                // https://github.com/Koenkk/zigbee-herdsman-converters/issues/915

                const result = {};
                if (msg.data.hasOwnProperty('instantaneousDemand')) {
                    result.power = msg.data['instantaneousDemand'];
                }
                // Summation is reported in Watthours
                if (msg.data.hasOwnProperty('currentSummDelivered')) {
                    const data = msg.data['currentSummDelivered'];
                    const value = (parseInt(data[0]) << 32) + parseInt(data[1]);
                    result.energy = value / 1000.0;
                }
                return result;
            } else {
                return converters.metering_power.convert(model, msg, publish, options, meta);
            }
        },
    },
    xiaomi_contact: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {contact: msg.data['onOff'] === 0};
        },
    },
    xiaomi_contact_interval: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('65281') && msg.data['65281'].hasOwnProperty('100')) {
                return {contact: msg.data['65281']['100'] === 0};
            }
        },
    },
    color_colortemp: {
        cluster: 'lightingColorCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};

            if (msg.data['colorTemperature']) {
                result.color_temp = msg.data['colorTemperature'];
            }

            if (msg.data['colorMode']) {
                result.color_mode = msg.data['colorMode'];
            }

            if (
                msg.data['currentX'] || msg.data['currentY'] || msg.data['currentSaturation'] ||
                msg.data['currentHue'] || msg.data['enhancedCurrentHue']
            ) {
                result.color = {};

                if (msg.data['currentX']) {
                    result.color.x = precisionRound(msg.data['currentX'] / 65535, 4);
                }

                if (msg.data['currentY']) {
                    result.color.y = precisionRound(msg.data['currentY'] / 65535, 4);
                }

                if (msg.data['currentSaturation']) {
                    result.color.saturation = precisionRound(msg.data['currentSaturation'] / 2.54, 0);
                }

                if (msg.data['currentHue']) {
                    result.color.hue = precisionRound((msg.data['currentHue'] * 360) / 254, 0);
                }

                if (msg.data['enhancedCurrentHue']) {
                    result.color.hue = precisionRound(msg.data['enhancedCurrentHue'] / (65535 / 360), 1);
                }
            }

            return result;
        },
    },
    WSDCGQ11LM_pressure: {
        cluster: 'msPressureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const pressure = msg.data.hasOwnProperty('16') ?
                parseFloat(msg.data['16']) / 10 : parseFloat(msg.data['measuredValue']);
            return {pressure: calibrateAndPrecisionRoundOptions(pressure, options, 'pressure')};
        },
    },
    immax_07046L_arm: {
        cluster: 'ssIasAce',
        type: 'commandArm',
        convert: (model, msg, publish, options, meta) => {
            const action = msg.data['armmode'];
            delete msg.data['armmode'];
            const modeLookup = {
                0: 'disarm',
                1: 'arm_stay',
                3: 'arm_away',
            };
            return {action: modeLookup[action]};
        },
    },
    KEF1PA_arm: {
        cluster: 'ssIasAce',
        type: 'commandArm',
        convert: (model, msg, publish, options, meta) => {
            const action = msg.data['armmode'];
            delete msg.data['armmode'];
            const modeLookup = {
                0: 'home',
                2: 'sleep',
                3: 'away',
            };
            return {action: modeLookup[action]};
        },
    },
    SJCGQ11LM_water_leak_iaszone: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            return {water_leak: msg.data.zonestatus === 1};
        },
    },
    xiaomi_power: {
        cluster: 'genAnalogInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {power: precisionRound(msg.data['presentValue'], 2)};
        },
    },
    xiaomi_plug_eu_state: {
        cluster: 'aqaraOpple',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data['247']) {
                const data = msg.data['247'];
                const payload = {};
                // Xiaomi struct parsing
                const length = data.length;
                // if (meta.logger) meta.logger.debug(`plug.mmeu01: Xiaomi struct: length ${length}`);
                for (let i=0; i < length; i++) {
                    const index = data[i];
                    let value = null;
                    // if (meta.logger) meta.logger.debug(`plug.mmeu01: pos=${i}, ind=${data[i]}, vtype=${data[i+1]}`);
                    switch (data[i+1]) {
                    case 16:
                        // 0x10 ZclBoolean
                        value = data.readUInt8(i+2);
                        i += 2;
                        break;
                    case 32:
                        // 0x20 Zcl8BitUint
                        value = data.readUInt8(i+2);
                        i += 2;
                        break;
                    case 33:
                        // 0x21 Zcl16BitUint
                        value = data.readUInt16LE(i+2);
                        i += 3;
                        break;
                    case 39:
                        // 0x27 Zcl64BitUint
                        i += 9;
                        break;
                    case 40:
                        // 0x28 Zcl8BitInt
                        value = data.readInt8(i+2);
                        i += 2;
                        break;
                    case 57:
                        // 0x39 ZclSingleFloat
                        value = data.readFloatLE(i+2);
                        i += 5;
                        break;
                    default:
                        // if (meta.logger) meta.logger.debug(`plug.mmeu01: unknown vtype=${data[i+1]}, pos=${i+1}`);
                    }
                    payload[index] = value;
                    // if (meta.logger) meta.logger.debug(`plug.mmeu01: recorded index ${index} with value ${value}`);
                }
                return {
                    state: payload['100'] === 1 ? 'ON' : 'OFF',
                    power: precisionRound(payload['152'], 2),
                    voltage: precisionRound(payload['150'] * 0.1, 1),
                    current: precisionRound((payload['151'] * 0.001), 4),
                    consumption: precisionRound(payload['149'], 2),
                    temperature: calibrateAndPrecisionRoundOptions(payload['3'], options, 'temperature'),
                };
            }
        },
    },
    xiaomi_plug_state: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data['65281']) {
                const data = msg.data['65281'];
                const payload = {
                    state: data['100'] === 1 ? 'ON' : 'OFF',
                    power: precisionRound(data['152'], 2),
                    consumption: precisionRound(data['149'], 2),
                    temperature: calibrateAndPrecisionRoundOptions(data['3'], options, 'temperature'),
                };

                if (data.hasOwnProperty('150')) {
                    // Not all support voltage: https://github.com/Koenkk/zigbee2mqtt/issues/4092
                    payload.voltage = precisionRound(data['150'] * 0.1, 1);
                }

                return payload;
            }
        },
    },
    xiaomi_bulb_interval: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data['65281']) {
                const data = msg.data['65281'];
                return {
                    state: data['100'] === 1 ? 'ON' : 'OFF',
                    brightness: data['101'],
                    color_temp: data['102'],
                };
            }
        },
    },
    xiaomi_power_from_basic: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data['65281']) {
                const data = msg.data['65281'];
                return {
                    power: precisionRound(data['152'], 2),
                    consumption: precisionRound(data['149'], 2),
                    temperature: calibrateAndPrecisionRoundOptions(data['3'], options, 'temperature'),
                };
            }
        },
    },
    QBKG04LM_buttons: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.endpoint.ID == 4) {
                return {action: msg.data['onOff'] === 1 ? 'release' : 'hold'};
            }
        },
    },
    QBKG25LM_click: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if ([1, 2, 3, 0, 255].includes(msg.data.presentValue)) {
                const mapping = {41: 'left', 42: 'center', 43: 'right'};
                const times = {1: 'single', 2: 'double', 3: 'triple', 0: 'hold', 255: 'release'};
                const button = mapping[msg.endpoint.ID];
                return {action: `${button}_${times[msg.data.presentValue]}`};
            }
        },
    },
    QBKG03LM_buttons: {
        cluster: 'genOnOff',
        type: ['attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            const mapping = {4: 'left', 5: 'right'};
            const button = mapping[msg.endpoint.ID];
            if (button) {
                const payload = {};
                payload[`button_${button}`] = msg.data['onOff'] === 1 ? 'release' : 'hold';
                return payload;
            }
        },
    },
    xiaomi_lock_report: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data['65328']) {
                const data = msg.data['65328'];
                const state = data.substr(2, 2);
                const action = data.substr(4, 2);
                const keynum = data.substr(6, 2);
                if (state == 11) {
                    if (action == 1) {
                        // unknown key
                        return {keyerror: true, inserted: 'unknown'};
                    }
                    if (action == 3) {
                        // explicitly disabled key (i.e. reported lost)
                        return {keyerror: true, inserted: keynum};
                    }
                    if (action == 7) {
                        // strange object introduced into the cylinder (e.g. a lock pick)
                        return {keyerror: true, inserted: 'strange'};
                    }
                }
                if (state == 12) {
                    if (action == 1) {
                        return {inserted: keynum};
                    }
                    if (action == 11) {
                        return {forgotten: keynum};
                    }
                }
            }
        },
    },
    curtain_position_analog_output: {
        cluster: 'genAnalogOutput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            let position = precisionRound(msg.data['presentValue'], 2);
            position = options.invert_cover ? 100 - position : position;
            return {position};
        },
    },
    JTYJGD01LMBW_smoke: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            return {smoke: msg.data.zonestatus === 1};
        },
    },
    heiman_smoke: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                smoke: (zoneStatus & 1) > 0, // Bit 1 = Alarm: Smoke
                battery_low: (zoneStatus & 1<<3) > 0, // Bit 4 = Battery LOW indicator
            };
        },
    },
    heiman_smart_controller_armmode: {
        cluster: 'ssIasAce',
        type: 'commandArm',
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.armmode != null) {
                const lookup = {
                    0: 'disarm',
                    1: 'arm_partial_zones',
                    3: 'arm_all_zones',
                };

                const value = msg.data.armmode;
                return {action: lookup[value] || `armmode_${value}`};
            }
        },
    },
    TS0218_click: {
        cluster: 'ssIasAce',
        type: 'commandEmergency',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'click'};
        },
    },
    heiman_smoke_enrolled: {
        cluster: 'ssIasZone',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const zoneId = msg.data.zoneId;
            const zoneState = msg.data.zoneState;
            const results = {};
            if (zoneState) {
                results['enrolled'] = true;
            } else {
                results['enrolled'] = false;
            }
            results['zone_id'] = zoneId;
            return results;
        },
    },
    JTQJBF01LMBW_gas: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            return {gas: msg.data.zonestatus === 1};
        },
    },
    JTQJBF01LMBW_gas_density: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const data = msg.data;
            if (data && data['65281']) {
                const basicAttrs = data['65281'];
                if (basicAttrs.hasOwnProperty('100')) {
                    return {gas_density: basicAttrs['100']};
                }
            }
        },
    },
    JTYJGD01LMBW_smoke_density: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const data = msg.data;
            if (data && data['65281']) {
                const basicAttrs = data['65281'];
                if (basicAttrs.hasOwnProperty('100')) {
                    return {smoke_density: basicAttrs['100']};
                }
            }
        },
    },
    JTQJBF01LMBW_sensitivity: {
        cluster: 'ssIasZone',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const data = msg.data;
            const lookup = {
                '1': 'low',
                '2': 'medium',
                '3': 'high',
            };

            if (data && data.hasOwnProperty('65520')) {
                const value = data['65520'];
                if (value && value.startsWith('0x020')) {
                    return {
                        sensitivity: lookup[value.charAt(5)],
                    };
                }
            }
        },
    },
    DJT11LM_vibration: {
        cluster: 'closuresDoorLock',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const vibrationLookup = {
                1: 'vibration',
                2: 'tilt',
                3: 'drop',
            };

            if (msg.data['85']) {
                const data = msg.data['85'];
                result.action = vibrationLookup[data];
            }
            if (msg.data['1283']) {
                const data = msg.data['1283'];
                result.angle = data;
            }

            if (msg.data['1285']) {
                // https://github.com/dresden-elektronik/deconz-rest-plugin/issues/748#issuecomment-419669995
                // Only first 2 bytes are relevant.
                const data = (msg.data['1285'] >> 8);
                // Swap byte order
                result.strength = ((data & 0xFF) << 8) | ((data >> 8) & 0xFF);
            }

            if (msg.data['1288']) {
                const data = msg.data['1288'];

                // array interpretation:
                // 12 bit two's complement sign extended integer
                // data[1][bit0..bit15] : x
                // data[1][bit16..bit31]: y
                // data[0][bit0..bit15] : z
                // left shift first to preserve sign extension for 'x'
                const x = ((data['1'] << 16) >> 16);
                const y = (data['1'] >> 16);
                // left shift first to preserve sign extension for 'z'
                const z = ((data['0'] << 16) >> 16);

                // calculate angle
                result.angle_x = Math.round(Math.atan(x/Math.sqrt(y*y+z*z)) * 180 / Math.PI);
                result.angle_y = Math.round(Math.atan(y/Math.sqrt(x*x+z*z)) * 180 / Math.PI);
                result.angle_z = Math.round(Math.atan(z/Math.sqrt(x*x+y*y)) * 180 / Math.PI);

                // calculate absolulte angle
                const R = Math.sqrt(x * x + y * y + z * z);
                result.angle_x_absolute = Math.round((Math.acos(x / R)) * 180 / Math.PI);
                result.angle_y_absolute = Math.round((Math.acos(y / R)) * 180 / Math.PI);
            }

            return result;
        },
    },
    DJT12LM_vibration: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'vibration'};
        },
    },
    CC2530ROUTER_led: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {led: msg.data['onOff'] === 1};
        },
    },
    CC2530ROUTER_meta: {
        cluster: 'genBinaryValue',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const data = msg.data;
            return {
                description: data['description'],
                type: data['inactiveText'],
                rssi: data['presentValue'],
            };
        },
    },
    DNCKAT_S00X_state: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const key = `state_${getKey(model.endpoint(msg.device), msg.endpoint.ID)}`;
            const payload = {};
            payload[key] = msg.data['onOff'] === 1 ? 'ON' : 'OFF';
            return payload;
        },
    },
    DNCKAT_S00X_buttons: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const key = `button_${getKey(model.endpoint(msg.device), msg.endpoint.ID)}`;
            const payload = {};
            payload[key] = msg.data['onOff'] === 1 ? 'release' : 'hold';
            return payload;
        },
    },
    ZigUP_parse: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const lookup = {
                '0': 'timer',
                '1': 'key',
                '2': 'dig-in',
            };

            let ds18b20Id = null;
            let ds18b20Value = null;
            if (msg.data['41368']) {
                ds18b20Id = msg.data['41368'].split(':')[0];
                ds18b20Value = precisionRound(msg.data['41368'].split(':')[1], 2);
            }

            return {
                state: msg.data['onOff'] === 1 ? 'ON' : 'OFF',
                cpu_temperature: precisionRound(msg.data['41361'], 2),
                external_temperature: precisionRound(msg.data['41362'], 1),
                external_humidity: precisionRound(msg.data['41363'], 1),
                s0_counts: msg.data['41364'],
                adc_volt: precisionRound(msg.data['41365'], 3),
                dig_input: msg.data['41366'],
                reason: lookup[msg.data['41367']],
                [`${ds18b20Id}`]: ds18b20Value,
            };
        },
    },
    Z809A_power: {
        cluster: 'haElectricalMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {
                power: msg.data['activePower'],
                current: msg.data['rmsCurrent'],
                voltage: msg.data['rmsVoltage'],
                power_factor: msg.data['powerFactor'],
            };
        },
    },
    peanut_electrical: {
        cluster: 'haElectricalMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const deviceID = msg.device.ieeeAddr;

            // initialize stored defaults with observed values
            if (!store[deviceID]) {
                store[deviceID] = {
                    acVoltageMultiplier: 180, acVoltageDivisor: 39321, acCurrentMultiplier: 72,
                    acCurrentDivisor: 39321, acPowerMultiplier: 10255, acPowerDivisor: 39321,
                };
            }

            // if new multipliers/divisors come in, replace prior values or defaults
            Object.keys(store[deviceID]).forEach((key) => {
                if (msg.data.hasOwnProperty(key)) {
                    store[deviceID][key] = msg.data[key];
                }
            });

            // if raw measurement comes in, apply stored/default multiplier and divisor
            if (msg.data.hasOwnProperty('rmsVoltage')) {
                result.voltage = (msg.data['rmsVoltage'] * store[deviceID].acVoltageMultiplier /
                    store[deviceID].acVoltageDivisor).toFixed(2);
            }

            if (msg.data.hasOwnProperty('rmsCurrent')) {
                result.current = (msg.data['rmsCurrent'] * store[deviceID].acCurrentMultiplier /
                    store[deviceID].acCurrentDivisor).toFixed(2);
            }

            if (msg.data.hasOwnProperty('activePower')) {
                result.power = (msg.data['activePower'] * store[deviceID].acPowerMultiplier /
                    store[deviceID].acPowerDivisor).toFixed(2);
            }

            return result;
        },
    },
    STS_PRS_251_presence: {
        cluster: 'genBinaryInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const useOptionsTimeout = options && options.hasOwnProperty('presence_timeout');
            const timeout = useOptionsTimeout ? options.presence_timeout : 100; // 100 seconds by default
            const deviceID = msg.device.ieeeAddr;

            // Stop existing timer because presence is detected and set a new one.
            if (store.hasOwnProperty(deviceID)) {
                clearTimeout(store[deviceID]);
                store[deviceID] = null;
            }

            store[deviceID] = setTimeout(() => {
                publish({presence: false});
                store[deviceID] = null;
            }, timeout * 1000);

            return {presence: true};
        },
    },
    PGC410EU_presence: {
        cluster: 'manuSpecificSmartThingsArrivalSensor',
        type: 'commandArrivalSensorNotify',
        convert: (model, msg, publish, options, meta) => {
            const useOptionsTimeout = options && options.hasOwnProperty('presence_timeout');
            const timeout = useOptionsTimeout ? options.presence_timeout : 100; // 100 seconds by default
            const deviceID = msg.device.ieeeAddr;

            // Stop existing timer because presence is detected and set a new one.
            if (store.hasOwnProperty(deviceID)) {
                clearTimeout(store[deviceID]);
                store[deviceID] = null;
            }

            store[deviceID] = setTimeout(() => {
                publish({presence: false});
                store[deviceID] = null;
            }, timeout * 1000);

            return {presence: true};
        },
    },
    battery_3V: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('batteryVoltage')) {
                const battery = {max: 3000, min: 2500};
                const voltage = msg.data['batteryVoltage'] * 100;
                return {
                    battery: toPercentage(voltage, battery.min, battery.max),
                    voltage: voltage, // @deprecated
                    // voltage: voltage / 1000.0,
                };
            }
        },
    },
    battery_3V_2100: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty('batteryVoltage')) {
                const battery = {max: 3000, min: 2100};
                const voltage = msg.data['batteryVoltage'] * 100;
                result.battery = toPercentage(voltage, battery.min, battery.max);
                result.voltage = voltage / 1000.0;
            }
            if (msg.data.hasOwnProperty('batteryAlarmState')) {
                result.battery_alarm_state = msg.data['batteryAlarmState'];
            }
            return result;
        },
    },
    battery_cr2032: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const voltage = msg.data['batteryVoltage'] * 100;
            return {
                battery: toPercentageCR2032(voltage),
                voltage: voltage / 1000.0,
            };
        },
    },
    battery_cr2450: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const voltage = msg.data['batteryVoltage'] * 100;
            const cr2450Max = 3000;
            const cr2450Min = 2000;
            return {
                battery: (voltage - cr2450Min) / (cr2450Max - cr2450Min) * 100,
                voltage: voltage / 1000.0,
            };
        },
    },
    STS_PRS_251_beeping: {
        cluster: 'genIdentify',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {action: 'beeping'};
        },
    },
    _324131092621_notification: {
        cluster: 'manuSpecificPhilips',
        type: 'commandHueNotification',
        convert: (model, msg, publish, options, meta) => {
            const multiplePressTimeout = options && options.hasOwnProperty('multiple_press_timeout') ?
                options.multiple_press_timeout : 0.25;

            const getPayload = function(button, pressType, pressDuration, pressCounter,
                brightnessSend, brightnessValue) {
                const payLoad = {};
                payLoad['action'] = `${button}-${pressType}`;
                payLoad['duration'] = pressDuration / 1000;
                if (pressCounter) {
                    payLoad['counter'] = pressCounter;
                }
                if (brightnessSend) {
                    payLoad['brightness'] = store[deviceID].brightnessValue;
                }
                return payLoad;
            };

            const deviceID = msg.device.ieeeAddr;
            let button = null;
            switch (msg.data['button']) {
            case 1:
                button = 'on';
                break;
            case 2:
                button = 'up';
                break;
            case 3:
                button = 'down';
                break;
            case 4:
                button = 'off';
                break;
            }
            let type = null;
            switch (msg.data['type']) {
            case 0:
                type = 'press';
                break;
            case 1:
                type = 'hold';
                break;
            case 2:
            case 3:
                type = 'release';
                break;
            }

            const brightnessEnabled = options && options.hasOwnProperty('send_brightess') ?
                options.send_brightess : true;
            const brightnessSend = brightnessEnabled && button && (button == 'up' || button == 'down');

            // Initialize store
            if (!store[deviceID]) {
                store[deviceID] = {pressStart: null, pressType: null,
                    delayedButton: null, delayedBrightnessSend: null, delayedType: null,
                    delayedCounter: 0, delayedTimerStart: null, delayedTimer: null};
                if (brightnessEnabled) {
                    store[deviceID].brightnessValue = 255;
                    store[deviceID].brightnessSince = null;
                    store[deviceID].brightnessDirection = null;
                }
            }

            if (button && type) {
                if (type == 'press') {
                    store[deviceID].pressStart = Date.now();
                    store[deviceID].pressType = 'press';
                    if (brightnessSend) {
                        const newValue = store[deviceID].brightnessValue + (button === 'up' ? 32 : -32);
                        store[deviceID].brightnessValue = numberWithinRange(newValue, 1, 255);
                    }
                } else if (type == 'hold') {
                    store[deviceID].pressType = 'hold';
                    if (brightnessSend) {
                        holdUpdateBrightness324131092621(deviceID);
                        store[deviceID].brightnessSince = Date.now();
                        store[deviceID].brightnessDirection = button;
                    }
                } else if (type == 'release') {
                    if (brightnessSend) {
                        store[deviceID].brightnessSince = null;
                        store[deviceID].brightnessDirection = null;
                    }
                    if (store[deviceID].pressType == 'hold') {
                        store[deviceID].pressType += '-release';
                    }
                }
                if (type == 'press') {
                    // pressed different button
                    if (store[deviceID].delayedTimer && (store[deviceID].delayedButton != button)) {
                        clearTimeout(store[deviceID].delayedTimer);
                        store[deviceID].delayedTimer = null;
                        publish(getPayload(store[deviceID].delayedButton,
                            store[deviceID].delayedType, 0, store[deviceID].delayedCounter,
                            store[deviceID].delayedBrightnessSend,
                            store[deviceID].brightnessValue));
                    }
                } else {
                    // released after press: start timer
                    if (store[deviceID].pressType == 'press') {
                        if (store[deviceID].delayedTimer) {
                            clearTimeout(store[deviceID].delayedTimer);
                            store[deviceID].delayedTimer = null;
                        } else {
                            store[deviceID].delayedCounter = 0;
                        }
                        store[deviceID].delayedButton = button;
                        store[deviceID].delayedBrightnessSend = brightnessSend;
                        store[deviceID].delayedType = store[deviceID].pressType;
                        store[deviceID].delayedCounter++;
                        store[deviceID].delayedTimerStart = Date.now();
                        store[deviceID].delayedTimer = setTimeout(() => {
                            publish(getPayload(store[deviceID].delayedButton,
                                store[deviceID].delayedType, 0, store[deviceID].delayedCounter,
                                store[deviceID].delayedBrightnessSend,
                                store[deviceID].brightnessValue));
                            store[deviceID].delayedTimer = null;
                        }, multiplePressTimeout * 1000);
                    } else {
                        const pressDuration =
                            (store[deviceID].pressType == 'hold' || store[deviceID].pressType == 'hold-release') ?
                                Date.now() - store[deviceID].pressStart : 0;
                        return getPayload(button,
                            store[deviceID].pressType, pressDuration, null, brightnessSend,
                            store[deviceID].brightnessValue);
                    }
                }
            }

            return {};
        },
    },
    legacy_battery: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('batteryPercentageRemaining')) {
                return {battery: msg.data['batteryPercentageRemaining']};
            }
        },
    },
    legacy_battery_voltage: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('batteryVoltage')) {
                return {voltage: msg.data['batteryVoltage'] / 100};
            }
        },
    },
    iris_3320L_contact: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            return {contact: msg.data.zonestatus === 36};
        },
    },
    RZHAC_4256251_power: {
        cluster: 'haElectricalMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {
                power: msg.data['activePower'],
                current: msg.data['rmsCurrent'],
                voltage: msg.data['rmsVoltage'],
            };
        },
    },
    restorable_brightness: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('currentLevel')) {
                // Ignore brightness = 0, which only happens when state is OFF
                if (Number(msg.data['currentLevel']) > 0) {
                    return {brightness: msg.data['currentLevel']};
                }
                return {};
            }
        },
    },
    smartsense_multi: {
        cluster: 'ssIasZone',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                contact: !(zoneStatus & 1), // Bit 1 = Contact
                // Bit 5 = Currently always set?
            };
        },
    },
    SE21_action: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const buttonStates = {
                0: 'off',
                1: 'single',
                2: 'double',
                3: 'hold',
            };

            return {action: buttonStates[msg.data.zonestatus]};
        },
    },
    CTR_U_brightness_updown_click: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options, meta) => {
            const deviceID = msg.device.ieeeAddr;
            const direction = msg.data.stepmode === 1 ? 'down' : 'up';

            // Save last direction for release event
            if (!store[deviceID]) {
                store[deviceID] = {};
            }
            store[deviceID].direction = direction;

            return {
                action: `brightness_${direction}_click`,
                step_size: msg.data.stepsize,
                transition_time: msg.data.transtime,
            };
        },
    },
    CTR_U_brightness_updown_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            const deviceID = msg.device.ieeeAddr;
            const direction = msg.data.movemode === 1 ? 'down' : 'up';

            // Save last direction for release event
            if (!store[deviceID]) {
                store[deviceID] = {};
            }
            store[deviceID].direction = direction;

            return {
                action: `brightness_${direction}_hold`,
                rate: msg.data.rate,
            };
        },
    },
    CTR_U_brightness_updown_release: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            const deviceID = msg.device.ieeeAddr;
            if (!store[deviceID]) {
                return null;
            }

            const direction = store[deviceID].direction;
            return {
                action: `brightness_${direction}_release`,
            };
        },
    },
    hue_motion_sensitivity: {
        cluster: 'msOccupancySensing',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const lookup = ['low', 'medium', 'high'];

            if (msg.data.hasOwnProperty('48')) {
                return {motion_sensitivity: lookup[msg.data['48']]};
            }
        },
    },
    thermostat_att_report: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (typeof msg.data['localTemp'] == 'number') {
                result.local_temperature = precisionRound(msg.data['localTemp'], 2) / 100;
            }
            if (typeof msg.data['localTemperatureCalibration'] == 'number') {
                result.local_temperature_calibration =
                    precisionRound(msg.data['localTemperatureCalibration'], 2) / 10;
            }
            if (typeof msg.data['occupancy'] == 'number') {
                result.occupancy = msg.data['occupancy'];
            }
            if (typeof msg.data['occupiedHeatingSetpoint'] == 'number') {
                const ohs = precisionRound(msg.data['occupiedHeatingSetpoint'], 2) / 100;
                if (ohs < -250) {
                    // Stelpro will return -325.65 when set to off
                    result.occupied_heating_setpoint = 0;
                } else {
                    result.occupied_heating_setpoint = ohs;
                }
            }
            if (typeof msg.data['unoccupiedHeatingSetpoint'] == 'number') {
                result.unoccupied_heating_setpoint =
                    precisionRound(msg.data['unoccupiedHeatingSetpoint'], 2) / 100;
            }
            if (typeof msg.data['occupiedCoolingSetpoint'] == 'number') {
                result.occupied_cooling_setpoint =
                    precisionRound(msg.data['occupiedCoolingSetpoint'], 2) / 100;
            }
            if (typeof msg.data['unoccupiedCoolingSetpoint'] == 'number') {
                result.unoccupied_cooling_setpoint =
                    precisionRound(msg.data['unoccupiedCoolingSetpoint'], 2) / 100;
            }
            if (typeof msg.data['weeklySchedule'] == 'number') {
                result.weekly_schedule = msg.data['weeklySchedule'];
            }
            if (typeof msg.data['setpointChangeAmount'] == 'number') {
                result.setpoint_change_amount = msg.data['setpointChangeAmount'] / 100;
            }
            if (typeof msg.data['setpointChangeSource'] == 'number') {
                result.setpoint_change_source = msg.data['setpointChangeSource'];
            }
            if (typeof msg.data['setpointChangeSourceTimeStamp'] == 'number') {
                result.setpoint_change_source_timestamp = msg.data['setpointChangeSourceTimeStamp'];
            }
            if (typeof msg.data['remoteSensing'] == 'number') {
                result.remote_sensing = msg.data['remoteSensing'];
            }
            const ctrl = msg.data['ctrlSeqeOfOper'];
            if (typeof ctrl == 'number' && common.thermostatControlSequenceOfOperations.hasOwnProperty(ctrl)) {
                result.control_sequence_of_operation = common.thermostatControlSequenceOfOperations[ctrl];
            }
            const smode = msg.data['systemMode'];
            if (typeof smode == 'number' && common.thermostatSystemModes.hasOwnProperty(smode)) {
                result.system_mode = common.thermostatSystemModes[smode];
            }
            const rmode = msg.data['runningMode'];
            if (typeof rmode == 'number' && common.thermostatSystemModes.hasOwnProperty(rmode)) {
                result.running_mode = common.thermostatSystemModes[rmode];
            }
            const state = msg.data['runningState'];
            if (typeof state == 'number' && common.thermostatRunningStates.hasOwnProperty(state)) {
                result.running_state = common.thermostatRunningStates[state];
            }
            if (typeof msg.data['pIHeatingDemand'] == 'number') {
                result.pi_heating_demand = precisionRound(msg.data['pIHeatingDemand'] / 255.0 * 100.0, 0);
            }
            if (typeof msg.data['tempSetpointHold'] == 'number') {
                result.temperature_setpoint_hold = msg.data['tempSetpointHold'];
            }
            if (typeof msg.data['tempSetpointHoldDuration'] == 'number') {
                result.temperature_setpoint_hold_duration = msg.data['tempSetpointHoldDuration'];
            }
            return result;
        },
    },
    thermostat_weekly_schedule_rsp: {
        cluster: 'hvacThermostat',
        type: ['commandGetWeeklyScheduleRsp'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            result.weekly_schedule = {};
            if (typeof msg.data['dayofweek'] == 'number') {
                result.weekly_schedule[msg.data['dayofweek']] = msg.data;
                for (const elem of result.weekly_schedule[msg.data['dayofweek']]['transitions']) {
                    if (typeof elem['heatSetpoint'] == 'number') {
                        elem['heatSetpoint'] /= 100;
                    }
                    if (typeof elem['coolSetpoint'] == 'number') {
                        elem['coolSetpoint'] /= 100;
                    }
                }
            }
            return result;
        },
    },
    viessmann_thermostat_att_report: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = converters.thermostat_att_report.convert(model, msg, publish, options, meta);

            // ViessMann TRVs report piHeatingDemand from 0-5
            // NOTE: remove the result for now, but leave it configure for reporting
            //       it will show up in the debug log still to help try and figure out
            //       what this value potentially means.
            if (typeof msg.data['pIHeatingDemand'] == 'number') {
                delete result.pi_heating_demand;
            }

            return result;
        },
    },
    hvac_user_interface: {
        cluster: 'hvacUserInterfaceCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const lockoutMode = msg.data['keypadLockout'];
            if (typeof lockoutMode == 'number') {
                result.keypad_lockout = lockoutMode;
            }
            return result;
        },
    },
    stelpro_thermostat: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const mode = msg.data['StelproSystemMode'];
            if (mode == 'number') {
                result.stelpro_mode = mode;
                switch (mode) {
                case 5:
                    // 'Eco' mode is translated into 'auto' here
                    result.system_mode = common.thermostatSystemModes[1];
                    break;
                }
            }
            const piHeatingDemand = msg.data['pIHeatingDemand'];
            if (typeof piHeatingDemand == 'number') {
                // DEPRECATED: only return running_state here (change operation -> running_state)
                result.operation = piHeatingDemand >= 10 ? 'heating' : 'idle';
                result.running_state = piHeatingDemand >= 10 ? 'heat' : 'idle';
            }
            return result;
        },
    },
    sinope_thermostat_att_report: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = converters.thermostat_att_report.convert(model, msg, publish, options, meta);
            // Sinope seems to report pIHeatingDemand between 0 and 100 already
            if (typeof msg.data['pIHeatingDemand'] == 'number') {
                result.pi_heating_demand = precisionRound(msg.data['pIHeatingDemand'], 0);
            }
            return result;
        },
    },
    sinope_thermostat_state: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const piHeatingDemand = msg.data['pIHeatingDemand'];
            if (typeof piHeatingDemand == 'number') {
                result.operation = piHeatingDemand >= 10 ? 'heating' : 'idle';
            }
            return result;
        },
    },
    eurotronic_thermostat: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = converters.thermostat_att_report.convert(model, msg, publish, options, meta);
            // system_mode is always 'heat', we set it below based on eurotronic_host_flags
            if (result.system_mode) {
                delete result['system_mode'];
            }
            if (typeof msg.data[0x4003] == 'number') {
                result.current_heating_setpoint =
                    precisionRound(msg.data[0x4003], 2) / 100;
            }
            if (typeof msg.data[0x4008] == 'number') {
                result.eurotronic_host_flags = msg.data[0x4008];
                const resultHostFlags = {
                    'mirror_display': false,
                    'boost': false,
                    'window_open': false,
                    'child_protection': false,
                };
                if ((result.eurotronic_host_flags & 1 << 2) != 0) {
                    // system_mode => 'heat', boost mode
                    result.system_mode = common.thermostatSystemModes[4];
                    resultHostFlags.boost = true;
                } else if ((result.eurotronic_host_flags & (1 << 4)) != 0 ) {
                    // system_mode => 'off', window open detected
                    result.system_mode = common.thermostatSystemModes[0];
                    resultHostFlags.window_open = true;
                } else {
                    // system_mode => 'auto', default
                    result.system_mode = common.thermostatSystemModes[1];
                }
                if ((result.eurotronic_host_flags & (1 << 1)) != 0 ) {
                    // mirror_display
                    resultHostFlags.mirror_display = true;
                }
                if ((result.eurotronic_host_flags & (1 << 7)) != 0 ) {
                    // child protection
                    resultHostFlags.child_protection = true;
                }
                // keep eurotronic_system_mode for compatibility (is there a way to mark this as deprecated?)
                result.eurotronic_system_mode = result.eurotronic_host_flags;
                result.eurotronic_host_flags = resultHostFlags;
            }
            if (typeof msg.data[0x4002] == 'number') {
                result.eurotronic_error_status = msg.data[0x4002];
            }
            if (typeof msg.data[0x4000] == 'number') {
                result.eurotronic_trv_mode = msg.data[0x4000];
            }
            if (typeof msg.data[0x4001] == 'number') {
                result.eurotronic_valve_position = msg.data[0x4001];
            }
            return result;
        },
    },
    tuya_on_off_action: {
        cluster: 'genOnOff',
        type: 'raw',
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg, msg.data[1])) return;
            const clickMapping = {0: 'single', 1: 'double', 2: 'hold'};
            let buttonMapping = null;
            if (model.model === 'TS0042') buttonMapping = {1: 'left', 2: 'right'};
            if (model.model === 'TS0043') buttonMapping = {1: 'right', 2: 'middle', 3: 'left'};
            const button = buttonMapping ? `${buttonMapping[msg.endpoint.ID]}_` : '';
            return {action: `${button}${clickMapping[msg.data[3]]}`};
        },
    },
    tuya_water_leak: {
        cluster: 'manuSpecificTuyaDimmer',
        type: 'commandSetDataResponse',
        convert: (model, msg, publish, options, meta) => {
            const key = msg.data.dp;
            const val = msg.data.data;
            if (key === 357) {
                return {
                    water_leak: val[0] === 1,
                };
            }

            return null;
        },
    },
    tint404011_brightness_updown_click: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options, meta) => {
            const direction = msg.data.stepmode === 1 ? 'down' : 'up';
            const payload = {
                action: `brightness_${direction}_click`,
                step_size: msg.data.stepsize,
                transition_time: msg.data.transtime,
            };
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    tint404011_brightness_updown_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            const deviceID = msg.device.ieeeAddr;
            const direction = msg.data.movemode === 1 ? 'down' : 'up';

            // Save last direction for release event
            if (!store[deviceID]) {
                store[deviceID] = {};
            }
            store[deviceID].movemode = direction;

            const payload = {
                action: `brightness_${direction}_hold`,
                rate: msg.data.rate,
            };
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    tint404011_brightness_updown_release: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            const deviceID = msg.device.ieeeAddr;
            if (!store[deviceID]) {
                return null;
            }

            const direction = store[deviceID].movemode;
            const payload = {action: `brightness_${direction}_release`};
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    SA003_on_off: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.type === 'attributeReport') {
                msg.meta.frameControl.disableDefaultResponse = true;
            }

            if (msg.data.hasOwnProperty('onOff') && !hasAlreadyProcessedMessage(msg)) {
                return {state: msg.data['onOff'] === 1 ? 'ON' : 'OFF'};
            }
        },
    },
    on_off_xiaomi_ignore_endpoint_4_5_6: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            // Xiaomi wall switches use endpoint 4, 5 or 6 to indicate an action on the button so we have to skip that.
            if (msg.data.hasOwnProperty('onOff') && ![4, 5, 6].includes(msg.endpoint.ID)) {
                const property = postfixWithEndpointName('state', msg, model);
                return {[property]: msg.data['onOff'] === 1 ? 'ON' : 'OFF'};
            }
        },
    },
    tint404011_scene: {
        cluster: 'genBasic',
        type: 'write',
        convert: (model, msg, publish, options, meta) => {
            const payload = {action: `scene_${msg.data['16389']}`};
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    tint404011_move_to_color_temp: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToColorTemp',
        convert: (model, msg, publish, options, meta) => {
            const payload = {
                action: `color_temp`,
                action_color_temperature: msg.data.colortemp,
                transition_time: msg.data.transtime,
            };
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    tint404011_move_to_color: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToColor',
        convert: (model, msg, publish, options, meta) => {
            const payload = {
                action_color: {
                    x: precisionRound(msg.data.colorx / 65535, 3),
                    y: precisionRound(msg.data.colory / 65535, 3),
                },
                action: 'color_wheel',
                transition_time: msg.data.transtime,
            };
            addActionGroup(payload, msg, model);
            return payload;
        },
    },
    E1524_E1810_toggle: {
        cluster: 'genOnOff',
        type: 'commandToggle',
        convert: (model, msg, publish, options, meta) => {
            const payload = {action: postfixWithEndpointName('toggle', msg, model)};
            return payload;
        },
    },
    E1524_E1810_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveToLevelWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'toggle_hold'};
        },
    },
    E1524_E1810_arrow_click: {
        cluster: 'genScenes',
        type: 'commandTradfriArrowSingle',
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.value === 2) {
                // This is send on toggle hold, ignore it as a toggle_hold is already handled above.
                return;
            }

            const direction = msg.data.value === 257 ? 'left' : 'right';
            return {action: `arrow_${direction}_click`};
        },
    },
    E1524_E1810_arrow_hold: {
        cluster: 'genScenes',
        type: 'commandTradfriArrowHold',
        convert: (model, msg, publish, options, meta) => {
            const direction = msg.data.value === 3329 ? 'left' : 'right';
            store[msg.device.ieeeAddr] = direction;
            return {action: `arrow_${direction}_hold`};
        },
    },
    E1524_E1810_arrow_release: {
        cluster: 'genScenes',
        type: 'commandTradfriArrowRelease',
        convert: (model, msg, publish, options, meta) => {
            const direction = store[msg.device.ieeeAddr];
            if (direction) {
                delete store[msg.device.ieeeAddr];
                return {action: `arrow_${direction}_release`, duration: msg.data.value / 1000};
            }
        },
    },
    E1524_E1810_brightness_up_click: {
        cluster: 'genLevelCtrl',
        type: 'commandStepWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            return {action: `brightness_up_click`};
        },
    },
    E1524_E1810_brightness_down_click: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options, meta) => {
            return {action: `brightness_down_click`};
        },
    },
    E1524_E1810_brightness_up_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            return {action: `brightness_up_hold`};
        },
    },
    E1524_E1810_brightness_up_release: {
        cluster: 'genLevelCtrl',
        type: 'commandStopWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            return {action: `brightness_up_release`};
        },
    },
    E1524_E1810_brightness_down_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            return {action: `brightness_down_hold`};
        },
    },
    E1524_E1810_brightness_down_release: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            return {action: `brightness_down_release`};
        },
    },
    livolo_switch_state: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const status = msg.data.onOff;
            const payload = {};
            payload['state_left'] = status & 1 ? 'ON' : 'OFF';
            payload['state_right'] = status & 2 ? 'ON' : 'OFF';
            payload['linkquality'] = msg.linkquality;
            return payload;
        },
    },
    livolo_socket_state: {
        cluster: 'genPowerCfg',
        type: ['raw'],
        convert: (model, msg, publish, options, meta) => {
            const stateHeader = Buffer.from([122, 209]);
            if (msg.data.indexOf(stateHeader) === 0) {
                const status = msg.data[14];
                const state = {};
                state['state'] = status & 1 ? 'ON' : 'OFF';
                state['linkquality'] = msg.linkquality;
                return state;
            }
            return;
        },
    },
    livolo_new_switch_state: {
        cluster: 'genPowerCfg',
        type: ['raw'],
        convert: (model, msg, publish, options, meta) => {
            const stateHeader = Buffer.from([122, 209]);
            if (msg.data.indexOf(stateHeader) === 0) {
                const status = msg.data[14];
                const state = {};
                state['state'] = status & 1 ? 'ON' : 'OFF';
                state['linkquality'] = msg.linkquality;
                return state;
            }
            return;
        },
    },
    livolo_switch_state_raw: {
        cluster: 'genPowerCfg',
        type: ['raw'],
        convert: (model, msg, publish, options, meta) => {
            /*
            header                ieee address            info data
            new socket
            [124,210,21,216,128,  199,147,3,24,0,75,18,0,  19,7,0]       after interview
            [122,209,             199,147,3,24,0,75,18,0,  7,1,6,1,0,11] off
            [122,209,             199,147,3,24,0,75,18,0,  7,1,6,1,1,11] on
            new switch
            [124,210,21,216,128,  228,41,3,24,0,75,18,0,  19,1,0]       after interview
            [122,209,             228,41,3,24,0,75,18,0,  7,1,0,1,0,11] off
            [122,209,             228,41,3,24,0,75,18,0,  7,1,0,1,1,11] on
            old switch
            [124,210,21,216,128,  170, 10,2,24,0,75,18,0,  17,0,1] after interview
            [124,210,21,216,0,     18, 15,5,24,0,75,18,0,  34,0,0] left: 0, right: 0
            [124,210,21,216,0,     18, 15,5,24,0,75,18,0,  34,0,1] left: 1, right: 0
            [124,210,21,216,0,     18, 15,5,24,0,75,18,0,  34,0,2] left: 0, right: 1
            [124,210,21,216,0,     18, 15,5,24,0,75,18,0,  34,0,3] left: 1, right: 1
            */
            const malformedHeader = Buffer.from([0x7c, 0xd2, 0x15, 0xd8, 0x00]);
            const infoHeader = Buffer.from([0x7c, 0xd2, 0x15, 0xd8, 0x80]);
            // status of old devices
            if (msg.data.indexOf(malformedHeader) === 0) {
                const status = msg.data[15];
                console.log(`status of old devices`);
                const state = {};
                state['state_left'] = status & 1 ? 'ON' : 'OFF';
                state['state_right'] = status & 2 ? 'ON' : 'OFF';
                state['linkquality'] = msg.linkquality;
                return state;
            }
            // info about device
            if (msg.data.indexOf(infoHeader) === 0) {
                if (msg.data.includes(Buffer.from([19, 7, 0]), 13)) {
                    // new socket
                    // hack
                    meta.device.modelID = 'TI0001-socket';
                    meta.device.save();
                }
                if (msg.data.includes(Buffer.from([19, 1, 0]), 13)) {
                    // new switch
                    // hack
                    meta.device.modelID = 'TI0001-switch';
                    meta.device.save();
                }
                // if (msg.data.includes(Buffer.from([17, 0, 1]), 13)) {
                //     // old switch
                //     // hack
                //     meta.device.modelID = 'TI0001-old-switch';
                //     meta.device.save();
                // }
                return null;
            }
            return null;
        },
    },
    eria_81825_updown: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options, meta) => {
            const direction = msg.data.stepmode === 0 ? 'up' : 'down';
            return {action: `${direction}`};
        },
    },
    ZYCT202_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'stop', action_group: msg.groupID};
        },
    },
    ZYCT202_up_down: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            const value = msg.data['movemode'];
            let action = null;
            if (value === 0) action = {'action': 'up-press', 'action_group': msg.groupID};
            else if (value === 1) action = {'action': 'down-press', 'action_group': msg.groupID};
            return action ? action : null;
        },
    },
    keen_home_smart_vent_pressure: {
        cluster: 'msPressureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const pressure = msg.data.hasOwnProperty('measuredValue') ?
                msg.data.measuredValue : parseFloat(msg.data['32']) / 1000.0;
            return {pressure: calibrateAndPrecisionRoundOptions(pressure, options, 'pressure')};
        },
    },
    osram_lightify_switch_cmdOn: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'up'};
        },
    },
    osram_lightify_switch_cmdOff: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'down'};
        },
    },
    osram_lightify_switch_cmdMoveWithOnOff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            const deviceID = msg.device.ieeeAddr;
            if (!store[deviceID]) {
                store[deviceID] = {direction: null};
            }
            store[deviceID].direction = 'up';
            return {action: 'up_hold'};
        },
    },
    osram_lightify_switch_AC0251100NJ_cmdStop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            const map = {
                1: 'up_release',
                2: 'down_release',
            };

            return {action: map[msg.endpoint.ID]};
        },
    },
    osram_lightify_switch_cmdMove: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            const deviceID = msg.device.ieeeAddr;
            if (!store[deviceID]) {
                store[deviceID] = {direction: null};
            }
            store[deviceID].direction = 'down';
            return {action: 'down_hold'};
        },
    },
    osram_lightify_switch_cmdMoveHue: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveHue',
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.movemode === 0) {
                return {action: 'circle_release'};
            }
        },
    },
    osram_lightify_switch_cmdMoveToSaturation: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToSaturation',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'circle_hold'};
        },
    },
    osram_lightify_switch_cmdMoveToLevelWithOnOff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveToLevelWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'circle_click'};
        },
    },
    osram_lightify_switch_cmdMoveToColorTemp: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToColorTemp',
        convert: (model, msg, publish, options, meta) => null,
    },
    osram_lightify_switch_73743_cmdStop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            const deviceID = msg.device.ieeeAddr;
            if (!store[deviceID]) {
                store[deviceID] = {direction: null};
            }
            let direction;
            if (store[deviceID].direction) {
                direction = `${store[deviceID].direction}_`;
            }
            return {action: `${direction}release`};
        },
    },
    osram_lightify_switch_AB371860355_cmdOn: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'left_top_click'};
        },
    },
    osram_lightify_switch_AB371860355_cmdOff: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'left_bottom_click'};
        },
    },
    osram_lightify_switch_AB371860355_cmdStepColorTemp: {
        cluster: 'lightingColorCtrl',
        type: 'commandStepColorTemp',
        convert: (model, msg, publish, options, meta) => {
            const pos = (msg.data.stepmode === 1) ? 'top' : 'bottom';
            return {action: `right_${pos}_click`};
        },
    },
    osram_lightify_switch_AB371860355_cmdMoveWithOnOff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'left_top_hold'};
        },
    },
    osram_lightify_switch_AB371860355_cmdMove: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'left_bottom_hold'};
        },
    },
    osram_lightify_switch_AB371860355_cmdStop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            const pos = (msg.endpoint.ID === 1) ? 'top' : 'bottom';
            return {action: `left_${pos}_release`};
        },
    },
    osram_lightify_switch_AB371860355_cmdMoveHue: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveHue',
        convert: (model, msg, publish, options, meta) => {
            const pos = (msg.endpoint.ID === 2) ? 'top' : 'bottom';
            const action = (msg.data.movemode === 0) ? 'release' : 'hold';
            return {action: `right_${pos}_${action}`};
        },
    },
    osram_lightify_switch_AB371860355_cmdMoveSat: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToSaturation',
        convert: (model, msg, publish, options, meta) => {
            const pos = (msg.endpoint.ID === 2) ? 'top' : 'bottom';
            return {action: `right_${pos}_hold`};
        },
    },
    OJBCR701YZ_statuschange: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const {zoneStatus} = msg.data;
            return {
                carbon_monoxide: (zoneStatus & 1) > 0, // Bit 0 = Alarm 1: Carbon Monoxide (CO)
                gas: (zoneStatus & 1 << 1) > 0, // Bit 1 = Alarm 2: Gas (CH4)
                tamper: (zoneStatus & 1 << 2) > 0, // Bit 2 = Tamper
                battery_low: (zoneStatus & 1 << 3) > 0, // Bit 3 = Low battery alarm
                trouble: (zoneStatus & 1 << 6) > 0, // Bit 6 = Trouble/Failure
                ac_connected: !((zoneStatus & 1 << 7) > 0), // Bit 7 = AC Connected
                test: (zoneStatus & 1 << 8) > 0, // Bit 8 = Self test
                battery_defect: (zoneStatus & 1 << 9) > 0, // Bit 9 = Battery Defect
            };
        },
    },
    generic_fan_mode: {
        cluster: 'hvacFanCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const key = getKey(common.fanMode, msg.data.fanMode);
            return {fan_mode: key, fan_state: key === 'off' ? 'OFF' : 'ON'};
        },
    },
    RM01_on_click: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
            return {action: `${button}_on`};
        },
    },
    RM01_off_click: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options, meta) => {
            const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
            return {action: `${button}_off`};
        },
    },
    RM01_down_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options, meta) => {
            const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
            return {
                action: `${button}_down`,
                step_mode: msg.data.stepmode,
                step_size: msg.data.stepsize,
                transition_time: msg.data.transtime,
            };
        },
    },
    RM01_up_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandStepWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
            return {
                action: `${button}_up`,
                step_mode: msg.data.stepmode,
                step_size: msg.data.stepsize,
                transition_time: msg.data.transtime,
            };
        },
    },
    RM01_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
            return {action: `${button}_stop`};
        },
    },
    insta_scene_click: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            return {
                action: `select_${msg.data.sceneid}`,
            };
        },
    },
    insta_down_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options, meta) => {
            return {
                action: 'down',
                step_mode: msg.data.stepmode,
                step_size: msg.data.stepsize,
                transition_time: msg.data.transtime,
            };
        },
    },
    insta_up_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandStepWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            return {
                action: 'up',
                step_mode: msg.data.stepmode,
                step_size: msg.data.stepsize,
                transition_time: msg.data.transtime,
            };
        },
    },
    insta_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            return {
                action: 'stop',
            };
        },
    },
    LZL4B_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveToLevelWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            return {
                action: msg.data.level,
                transition_time: msg.data.transtime,
            };
        },
    },
    SZ_ESW01_AU_power: {
        cluster: 'seMetering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('instantaneousDemand')) {
                return {power: precisionRound(msg.data['instantaneousDemand'] / 1000, 2)};
            }
        },
    },
    meazon_meter: {
        cluster: 'seMetering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            // typo on property name to stick with zcl definition
            if (msg.data.hasOwnProperty('inletTempreature')) {
                result.inletTemperature = precisionRound(msg.data['inletTempreature'], 2);
            }

            if (msg.data.hasOwnProperty('status')) {
                result.status = precisionRound(msg.data['status'], 2);
            }

            if (msg.data.hasOwnProperty('8192')) {
                result.linefrequency = precisionRound((parseFloat(msg.data['8192'])) / 100.0, 2);
            }

            if (msg.data.hasOwnProperty('8193')) {
                result.power = precisionRound(msg.data['8193'], 2);
            }

            if (msg.data.hasOwnProperty('8196')) {
                result.voltage = precisionRound(msg.data['8196'], 2);
            }

            if (msg.data.hasOwnProperty('8213')) {
                result.voltage = precisionRound(msg.data['8213'], 2);
            }

            if (msg.data.hasOwnProperty('8199')) {
                result.current = precisionRound(msg.data['8199'], 2);
            }

            if (msg.data.hasOwnProperty('8216')) {
                result.current = precisionRound(msg.data['8216'], 2);
            }

            if (msg.data.hasOwnProperty('8202')) {
                result.reactivepower = precisionRound(msg.data['8202'], 2);
            }

            if (msg.data.hasOwnProperty('12288')) {
                result.energyconsumed = precisionRound(msg.data['12288'], 2);
            }

            if (msg.data.hasOwnProperty('12291')) {
                result.energyproduced = precisionRound(msg.data['12291'], 2);
            }

            if (msg.data.hasOwnProperty('12294')) {
                result.reactivesummation = precisionRound(msg.data['12294'], 2);
            }

            if (msg.data.hasOwnProperty('16408')) {
                result.measureserial = precisionRound(msg.data['16408'], 2);
            }

            return result;
        },
    },
    ZNMS11LM_closuresDoorLock_report: {
        cluster: 'closuresDoorLock',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const lockStatusLookup = {
                1: 'finger_not_match',
                2: 'password_not_match',
                3: 'reverse_lock', // disable open from outside
                4: 'reverse_lock_cancel', // enable open from outside
                5: 'locked',
                6: 'lock_opened',
                7: 'finger_add',
                8: 'finger_delete',
                9: 'password_add',
                10: 'password_delete',
                11: 'lock_opened_inside', // Open form inside reverse lock enbable
                12: 'lock_opened_outside', // Open form outside reverse lock disable
                13: 'ring_bell',
                14: 'change_language_to',
                15: 'finger_open',
                16: 'password_open',
                17: 'door_closed',
            };
            result.user = null;
            result.repeat = null;
            result.data = null;
            if (msg.data['65296']) { // finger/password success
                const data = msg.data['65296'].toString(16);
                const command = data.substr(0, 1); // 1 finger open, 2 password open
                const userId = data.substr(5, 2);
                const userType = data.substr(1, 1); // 1 admin, 2 user
                result.data = data;
                result.action = (lockStatusLookup[14+parseInt(command, 16)] +
                    (userType === '1' ? '_admin' : '_user') + '_id' + parseInt(userId, 16).toString());
                result.user = parseInt(userId, 16);
            } else if (msg.data['65297']) { // finger, password failed or bell
                const data = msg.data['65297'].toString(16);
                const times = data.substr(0, 1);
                const type = data.substr(5, 2); // 00 bell, 02 password, 40 error finger
                result.data = data;
                if (type === '40') {
                    result.action = lockStatusLookup[1];
                    result.repeat = parseInt(times, 16);
                } else if (type === '02') {
                    result.action = lockStatusLookup[2];
                    result.repeat = parseInt(times, 16);
                } else if (type === '00') {
                    result.action = lockStatusLookup[13];
                    result.repeat = null;
                }
            } else if (msg.data['65281'] && msg.data['65281']['1']) { // user added/delete
                const data = msg.data['65281']['1'].toString(16);
                const command = data.substr(0, 1); // 1 add, 2 delete
                const userId = data.substr(5, 2);
                result.data = data;
                result.action = lockStatusLookup[6+parseInt(command, 16)];
                result.user = parseInt(userId, 16);
                result.repeat = null;
            }
            return result;
        },
    },
    ZNMS12LM_ZNMS13LM_closuresDoorLock_report: {
        cluster: 'closuresDoorLock',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const lockStatusLookup = {
                1: 'finger_not_match',
                2: 'password_not_match',
                3: 'reverse_lock', // disable open from outside
                4: 'reverse_lock_cancel', // enable open from outside
                5: 'locked',
                6: 'lock_opened',
                7: 'finger_add',
                8: 'finger_delete',
                9: 'password_add',
                10: 'password_delete',
                11: 'lock_opened_inside', // Open form inside reverse lock enbable
                12: 'lock_opened_outside', // Open form outside reverse lock disable
                13: 'ring_bell',
                14: 'change_language_to',
                15: 'finger_open',
                16: 'password_open',
                17: 'door_closed',
            };
            result.user = null;
            result.repeat = null;
            if (msg.data['65526']) { // lock final status
                // Convert data back to hex to decode
                const data = Buffer.from(msg.data['65526'], 'ascii').toString('hex');
                const command = data.substr(6, 4);
                if (
                    command === '0301' || // ZNMS12LM
                        command === '0341' // ZNMS13LM
                ) {
                    result.action = lockStatusLookup[4];
                    result.state = 'UNLOCK';
                    result.reverse = 'UNLOCK';
                } else if (
                    command === '0311' || // ZNMS12LM
                        command === '0351' // ZNMS13LM
                ) {
                    result.action = lockStatusLookup[4];
                    result.state = 'LOCK';
                    result.reverse = 'UNLOCK';
                } else if (
                    command === '0205' || // ZNMS12LM
                        command === '0245' // ZNMS13LM
                ) {
                    result.action = lockStatusLookup[3];
                    result.state = 'UNLOCK';
                    result.reverse = 'LOCK';
                } else if (
                    command === '0215' || // ZNMS12LM
                        command === '0255' || // ZNMS13LM
                        command === '1355' // ZNMS13LM
                ) {
                    result.action = lockStatusLookup[3];
                    result.state = 'LOCK';
                    result.reverse = 'LOCK';
                } else if (
                    command === '0111' || // ZNMS12LM
                        command === '1351' || // ZNMS13LM locked from inside
                        command === '1451' // ZNMS13LM locked from outside
                ) {
                    result.action = lockStatusLookup[5];
                    result.state = 'LOCK';
                    result.reverse = 'UNLOCK';
                } else if (
                    command === '0b00' || // ZNMS12LM
                        command === '0640' || // ZNMS13LM
                        command === '0600' // ZNMS13LM

                ) {
                    result.action = lockStatusLookup[12];
                    result.state = 'UNLOCK';
                    result.reverse = 'UNLOCK';
                } else if (
                    command === '0c00' || // ZNMS12LM
                        command === '2300' || // ZNMS13LM
                        command === '0540' || // ZNMS13LM
                        command === '0440' // ZNMS13LM
                ) {
                    result.action = lockStatusLookup[11];
                    result.state = 'UNLOCK';
                    result.reverse = 'UNLOCK';
                } else if (
                    command === '2400' || // ZNMS13LM door closed from insed
                        command === '2401' // ZNMS13LM door closed from outside
                ) {
                    result.action = lockStatusLookup[17];
                    result.state = 'UNLOCK';
                    result.reverse = 'UNLOCK';
                }
            } else if (msg.data['65296']) { // finger/password success
                const data = Buffer.from(msg.data['65296'], 'ascii').toString('hex');
                const command = data.substr(6, 2); // 1 finger open, 2 password open
                const userId = data.substr(12, 2);
                const userType = data.substr(8, 1); // 1 admin, 2 user
                result.action = (lockStatusLookup[14+parseInt(command, 16)] +
                    (userType === '1' ? '_admin' : '_user') + '_id' + parseInt(userId, 16).toString());
                result.user = parseInt(userId, 16);
            } else if (msg.data['65297']) { // finger, password failed or bell
                const data = Buffer.from(msg.data['65297'], 'ascii').toString('hex');
                const times = data.substr(6, 2);
                const type = data.substr(12, 2); // 00 bell, 02 password, 40 error finger
                if (type === '40') {
                    result.action = lockStatusLookup[1];
                    result.repeat = parseInt(times, 16);
                } else if (type === '00') {
                    result.action = lockStatusLookup[13];
                    result.repeat = null;
                } else if (type === '02') {
                    result.action = lockStatusLookup[2];
                    result.repeat = parseInt(times, 16);
                }
            } else if (msg.data['65281']) { // password added/delete
                const data = Buffer.from(msg.data['65281'], 'ascii').toString('hex');
                const command = data.substr(18, 2); // 1 add, 2 delete
                const userId = data.substr(12, 2);
                result.action = lockStatusLookup[6+parseInt(command, 16)];
                result.user = parseInt(userId, 16);
                result.repeat = null;
            } else if (msg.data['65522']) { // set languge
                const data = Buffer.from(msg.data['65522'], 'ascii').toString('hex');
                const langId = data.substr(6, 2); // 1 chinese, 2: english
                result.action = (lockStatusLookup[14])+ (langId==='2'?'_english':'_chinese');
                result.user = null;
                result.repeat = null;
            }
            return result;
        },
    },
    DTB190502A1_parse: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const lookupKEY = {
                '0': 'KEY_SYS',
                '1': 'KEY_UP',
                '2': 'KEY_DOWN',
                '3': 'KEY_NONE',
            };
            const lookupLED = {
                '0': 'OFF',
                '1': 'ON',
            };
            return {
                cpu_temperature: precisionRound(msg.data['41361'], 2),
                key_state: lookupKEY[msg.data['41362']],
                led_state: lookupLED[msg.data['41363']],
            };
        },
    },
    linkquality_from_basic: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {linkquality: msg.linkquality};
        },
    },
    generic_device_temperature: {
        cluster: 'genDeviceTempCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('currentTemperature')) {
                return {temperature: msg.data.currentTemperature};
            }
        },
    },
    ptvo_switch_state: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const key = `state_${getKey(model.endpoint(msg.device), msg.endpoint.ID)}`;
            const payload = {};
            payload[key] = msg.data['onOff'] === 1 ? 'ON' : 'OFF';
            return payload;
        },
    },
    ptvo_switch_uart: {
        cluster: 'genMultistateValue',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            let data = msg.data['stateText'];
            if (typeof data === 'object') {
                let bHex = false;
                let code;
                let index;
                for (index = 0; index < data.length; index += 1) {
                    code = data[index];
                    if ((code < 32) || (code > 127)) {
                        bHex = true;
                        break;
                    }
                }
                if (!bHex) {
                    data = data.toString('latin1');
                } else {
                    data = [...data];
                }
            }
            return {'action': data};
        },
    },
    ptvo_switch_analog_input: {
        cluster: 'genAnalogInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const payload = {};
            const channel = msg.endpoint.ID;
            const name = `l${channel}`;
            payload[name] = precisionRound(msg.data['presentValue'], 3);
            if (msg.data.hasOwnProperty('description')) {
                const data1 = msg.data['description'];
                if (data1) {
                    const data2 = data1.split(',');
                    const devid = data2[1];
                    const unit = data2[0];
                    if (devid) {
                        payload['device'] = devid;
                    }
                    if (unit === 'C') {
                        payload['temperature'] = precisionRound(msg.data['presentValue'], 1);
                    } else if (unit === '%') {
                        payload['humidity'] = precisionRound(msg.data['presentValue'], 1);
                    } else if (unit === 'Pa') {
                        payload['pressure'] = precisionRound(msg.data['presentValue'], 1);
                    } else if (unit === 'm') {
                        payload['altitude'] = precisionRound(msg.data['presentValue'], 1);
                    } else if (unit === 'ppm') {
                        payload['quality'] = precisionRound(msg.data['presentValue'], 1);
                    }
                }
            }
            return payload;
        },
    },
    ptvo_switch_level_control: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const payload = {};
            const channel = msg.endpoint.ID;
            const name = `l${channel}`;
            payload[name] = msg.data['currentLevel'];
            payload['brightness_' + name] = msg.data['currentLevel'];
            return payload;
        },
    },
    keypad20states: {
        cluster: 'genOnOff',
        type: ['readResponse', 'attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
            const state = msg.data['onOff'] === 1 ? true : false;
            if (button) {
                return {[button]: state};
            }
        },
    },
    keypad20_battery: {
        cluster: 'genPowerCfg',
        type: ['readResponse', 'attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            const battery = {max: 3000, min: 2100};
            const voltage = msg.data['mainsVoltage'] /10;
            return {
                battery: toPercentage(voltage, battery.min, battery.max),
                voltage: voltage, // @deprecated
                // voltage: voltage / 1000.0,
            };
        },
    },
    dimmer_passthru_brightness: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveToLevelWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            ratelimitedDimmer(model, msg, publish, options, meta);
        },
    },
    terncy_contact: {
        cluster: 'genBinaryInput',
        type: 'attributeReport',
        convert: (model, msg, publish, options, meta) => {
            return {contact: (msg.data['presentValue']==0)};
        },
    },
    terncy_temperature: {
        cluster: 'msTemperatureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const temperature = parseFloat(msg.data['measuredValue']) / 10.0;
            return {temperature: calibrateAndPrecisionRoundOptions(temperature, options, 'temperature')};
        },
    },
    terncy_knob: {
        cluster: 'manuSpecificClusterAduroSmart',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (typeof msg.data['27'] === 'number') {
                return {
                    direction: (msg.data['27'] > 0 ? 'clockwise' : 'counterclockwise'),
                    number: (Math.abs(msg.data['27']) / 12),
                };
            }
        },
    },
    orvibo_raw: {
        cluster: 23,
        type: 'raw',
        convert: (model, msg, publish, options, meta) => {
            // 25,0,8,3,0,0 - click btn 1
            // 25,0,8,3,0,2 - hold btn 1
            // 25,0,8,3,0,3 - release btn 1
            // 25,0,8,11,0,0 - click btn 2
            // 25,0,8,11,0,2 - hold btn 2
            // 25,0,8,11,0,3 - release btn 2
            // 25,0,8,7,0,0 - click btn 3
            // 25,0,8,7,0,2 - hold btn 3
            // 25,0,8,7,0,3 - release btn 3
            // 25,0,8,15,0,0 - click btn 4
            // 25,0,8,15,0,2 - hold btn 4
            // 25,0,8,15,0,3 - release btn 4
            // TODO: do not know how to get to use 5,6,7,8 buttons
            const buttonLookup = {
                3: 'button_1',
                11: 'button_2',
                7: 'button_3',
                15: 'button_4',
            };

            const actionLookup = {
                0: 'click',
                2: 'hold',
                3: 'release',
            };
            const button = buttonLookup[msg.data[3]];
            const action = actionLookup[msg.data[5]];
            if (button) {
                return {action: `${button}_${action}`};
            }
        },
    },
    orvibo_raw2: {
        cluster: 23,
        type: 'raw',
        convert: (model, msg, publish, options, meta) => {
            const buttonLookup = {
                1: 'button_1',
                2: 'button_2',
                3: 'button_3',
                4: 'button_4',
                5: 'button_5',
                6: 'button_6',
                7: 'button_7',
            };

            const actionLookup = {
                0: 'click',
                2: 'hold',
                3: 'release',
            };
            const button = buttonLookup[msg.data[3]];
            const action = actionLookup[msg.data[5]];
            if (button) {
                return {action: `${button}_${action}`};
            }
        },
    },
    diyruz_contact: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {contact: msg.data['onOff'] !== 0};
        },
    },
    diyruz_rspm: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const power = precisionRound(msg.data['41364'], 2);
            return {
                state: msg.data['onOff'] === 1 ? 'ON' : 'OFF',
                cpu_temperature: precisionRound(msg.data['41361'], 2),
                power: power,
                current: precisionRound(power/230, 2),
                action: msg.data['41367'] === 1 ? 'hold' : 'release',
            };
        },
    },
    diyruz_freepad_clicks: {
        cluster: 'genMultistateInput',
        type: ['readResponse', 'attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
            const lookup = {
                0: 'hold',
                1: 'single',
                2: 'double',
                3: 'triple',
                4: 'quadruple',
                255: 'release',
            };
            const clicks = msg.data['presentValue'];
            const action = lookup[clicks] ? lookup[clicks] : `many_${clicks}`;
            return {action: `${button}_${action}`};
        },
    },
    diyruz_geiger: {
        cluster: 'msIlluminanceMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {
                radioactive_events_per_minute: msg.data['61441'],
                radiation_dose_per_hour: msg.data['61442'],
            };
        },
    },
    aqara_opple_report: {
        cluster: 'aqaraOpple',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            // it is like xiaomi_battery_3v, but not parsed
            // https://github.com/Koenkk/zigbee-herdsman/blob/master/src/zcl/buffaloZcl.ts#L93
            // data: { '247': <Buffer 01 21 b8 0b 03 28 19 04 21 a8 13 05 21 44 01 06 24 02
            //                        00 00 00 00 08 21 11 01 0a 21 00 00 0c 20 01 64 10 00> }
            let voltage = null;

            if (msg.data['247']) {
                voltage = msg.data['247'][2] + msg.data['247'][3]*256;
            }

            if (voltage) {
                return {
                    battery: toPercentageCR2032(voltage),
                    voltage: voltage,
                };
            }
        },
    },
    aqara_opple_multistate: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const actionLookup = {
                0: 'hold',
                255: 'release',
                1: 'single',
                2: 'double',
                3: 'triple',
            };
            const btn = msg.endpoint.ID;
            const value = msg.data.presentValue;
            return {action: `button_${btn}_${actionLookup[value]}`};
        },
    },
    aqara_opple_on: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'button_2_single'};
        },
    },
    aqara_opple_off: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'button_1_single'};
        },
    },
    aqara_opple_step: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options, meta) => {
            const button = msg.data.stepmode === 0 ? '4' : '3';
            return {action: `button_${button}_single`};
        },
    },
    aqara_opple_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            const deviceID = msg.device.ieeeAddr;
            if (store[deviceID]) {
                const duration = Date.now() - store[deviceID].start;
                const button = store[deviceID].button;
                return {action: `button_${button}_release`, duration: duration};
            }
        },
    },
    aqara_opple_move: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            // store button and start moment
            const deviceID = msg.device.ieeeAddr;
            if (!store[deviceID]) {
                store[deviceID] = {};
            }
            const button = msg.data.movemode === 0 ? '4' : '3';
            store[deviceID].button = button;
            store[deviceID].start = Date.now();
            return {action: `button_${button}_hold`};
        },
    },
    aqara_opple_step_color_temp: {
        cluster: 'lightingColorCtrl',
        type: 'commandStepColorTemp',
        convert: (model, msg, publish, options, meta) => {
            let act;
            if (model.model === 'WXCJKG12LM') {
                // for WXCJKG12LM model it's double click event on buttons 3 and 4
                act = (msg.data.stepmode === 1) ? '3_double' : '4_double';
            } else {
                // but for WXCJKG13LM model it's single click event on buttons 5 and 6
                act = (msg.data.stepmode === 1) ? '5_single' : '6_single';
            }
            return {action: `button_${act}`};
        },
    },
    aqara_opple_move_color_temp: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveColorTemp',
        convert: (model, msg, publish, options, meta) => {
            const deviceID = msg.device.ieeeAddr;
            if (!store[deviceID]) {
                store[deviceID] = {};
            }
            const stop = msg.data.movemode === 0;
            let button;
            const result = {};
            if (stop) {
                button = store[deviceID].button;
                const duration = Date.now() - store[deviceID].start;
                result.action = `button_${button}_release`;
                result.duration = duration;
            } else {
                button = msg.data.movemode === 3 ? '6' : '5';
                result.action = `button_${button}_hold`;
                // store button and start moment
                store[deviceID].button = button;
                store[deviceID].start = Date.now();
            }
            return result;
        },
    },
    SmartButton_skip: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options, meta) => {
            const direction = msg.data.stepmode === 1 ? 'backward' : 'forward';
            return {
                action: `skip_${direction}`,
                step_size: msg.data.stepsize,
                transition_time: msg.data.transtime,
            };
        },
    },
    SmartButton_event: {
        cluster: 'manuSpecificPhilips',
        type: 'commandHueNotification',
        convert: (model, msg, publish, options, meta) => {
            // Philips HUE Smart Button "ROM001": these events are always from "button 1"
            let type = null;
            switch (msg.data['type']) {
            case 0:
                type = 'press';
                break;
            case 1:
                type = 'hold';
                break;
            case 2:
            case 3:
                type = 'release';
                break;
            }
            return {
                action: `${type}`,
            };
        },
    },
    CCTSwitch_D0001_move_to_level_recall: {
        cluster: 'genLevelCtrl',
        type: ['commandMoveToLevel', 'commandMoveToLevelWithOnOff'],
        convert: (model, msg, publish, options, meta) => {
            // wrap the messages from button2 and button4 into a single function
            // button2 always sends "commandMoveToLevel"
            // button4 sends two messages, with "commandMoveToLevelWithOnOff" coming first in the sequence
            //         so that's the one we key off of to indicate "button4". we will NOT print it in that case,
            //         instead it will be returned as part of the second sequence with
            //         CCTSwitch_D0001_move_to_colortemp_recall below.

            const deviceID = msg.device.ieeeAddr;
            if (!store[deviceID]) {
                store[deviceID] = {lastClk: null, lastSeq: -10, lastBrightness: null,
                    lastMoveLevel: null, lastColorTemp: null};
            }

            let clk = 'brightness';
            let cmd = null;
            const payload = {brightness: msg.data.level, transition: parseFloat(msg.data.transtime/10.0)};
            if ( msg.type == 'commandMoveToLevel' ) {
                // pressing the brightness button increments/decrements from 13-254.
                // when it reaches the end (254) it will start decrementing by a step,
                // and vice versa.
                const direction = msg.data.level > store[deviceID].lastBrightness ? 'up' : 'down';
                cmd = `${clk}_${direction}`;
                store[deviceID].lastBrightness = msg.data.level;
            } else if ( msg.type == 'commandMoveToLevelWithOnOff' ) {
                // This is the 'start' of the 4th button sequence.
                clk = 'memory';
                store[deviceID].lastMoveLevel = msg.data.level;
                store[deviceID].lastClk = clk;
            }

            if ( clk != 'memory' ) {
                store[deviceID].lastSeq = msg.meta.zclTransactionSequenceNumber;
                store[deviceID].lastClk = clk;
                payload.click = clk;
                payload.action = cmd;
                return payload;
            }
        },
    },
    on_off_skip_duplicate_transaction: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            // Device sends multiple messages with the same transactionSequenceNumber,
            // prevent that multiple messages get send.
            // https://github.com/Koenkk/zigbee2mqtt/issues/3687
            if (msg.data.hasOwnProperty('onOff') && !hasAlreadyProcessedMessage(msg)) {
                return {state: msg.data['onOff'] === 1 ? 'ON' : 'OFF'};
            }
        },
    },
    CCTSwitch_D0001_move_to_colortemp_recall: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToColorTemp',
        convert: (model, msg, publish, options, meta) => {
            // both button3 and button4 send the command "commandMoveToColorTemp"
            // in order to distinguish between the buttons, use the sequence number and the previous command
            // to determine if this message was immediately preceded by "commandMoveToLevelWithOnOff"
            // if this command follows a "commandMoveToLevelWithOnOff", then it's actually button4's second message
            // and we can ignore it entirely
            const deviceID = msg.device.ieeeAddr;
            if (!store[deviceID]) {
                store[deviceID] = {lastClk: null, lastSeq: -10, lastBrightness: null,
                    lastMoveLevel: null, lastColorTemp: null};
            }
            const lastClk = store[deviceID].lastClk;
            const lastSeq = store[deviceID].lastSeq;

            const seq = msg.meta.zclTransactionSequenceNumber;
            let clk = 'colortemp';
            const payload = {color_temp: msg.data.colortemp, transition: parseFloat(msg.data.transtime/10.0)};

            // because the remote sends two commands for button4, we need to look at the previous command and
            // see if it was the recognized start command for button4 - if so, ignore this second command,
            // because it's not really button3, it's actually button4
            if ( lastClk == 'memory' ) {
                payload.click = lastClk;
                payload.action = 'recall';
                payload.brightness = store[deviceID].lastMoveLevel;

                // ensure the "last" message was really the message prior to this one
                // accounts for missed messages (gap >1) and for the remote's rollover from 127 to 0
                if ( (seq == 0 && lastSeq == 127 ) || ( seq - lastSeq ) == 1 ) {
                    clk = null;
                }
            } else {
                // pressing the color temp button increments/decrements from 153-370K.
                // when it reaches the end (370) it will start decrementing by a step,
                // and vice versa.
                const direction = msg.data.colortemp > store[deviceID].lastColorTemp ? 'up' : 'down';
                const cmd = `${clk}_${direction}`;
                payload.click = clk;
                payload.action = cmd;
                store[deviceID].lastColorTemp = msg.data.colortemp;
            }

            if ( clk != null ) {
                store[deviceID].lastSeq = msg.meta.zclTransactionSequenceNumber;
                store[deviceID].lastClk = clk;
                return payload;
            }
        },
    },
    CCTSwitch_D0001_brightness_updown_hold_release: {
        cluster: 'genLevelCtrl',
        type: ['commandMove', 'commandStop'],
        convert: (model, msg, publish, options, meta) => {
            const deviceID = msg.device.ieeeAddr;
            if (!store[deviceID]) {
                store[deviceID] = {};
            }
            const stop = msg.type === 'commandStop' ? true : false;
            let direction = null;
            const clk = 'brightness';
            const payload = {click: clk};
            if (stop) {
                direction = store[deviceID].direction;
                const duration = Date.now() - store[deviceID].start;
                payload.action = `${clk}_${direction}_release`;
                payload.duration = duration;
            } else {
                direction = msg.data.movemode === 1 ? 'down' : 'up';
                payload.action = `${clk}_${direction}_hold`;
                // store button and start moment
                store[deviceID].direction = direction;
                payload.rate = msg.data.rate;
                store[deviceID].start = Date.now();
            }
            return payload;
        },
    },
    CCTSwitch_D0001_colortemp_updown_hold_release: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveColorTemp',
        convert: (model, msg, publish, options, meta) => {
            const deviceID = msg.device.ieeeAddr;
            if (!store[deviceID]) {
                store[deviceID] = {};
            }
            const stop = msg.data.movemode === 0;
            let direction = null;
            const clk = 'colortemp';
            const payload = {click: clk, rate: msg.data.rate};
            if (stop) {
                direction = store[deviceID].direction;
                const duration = Date.now() - store[deviceID].start;
                payload.action = `${clk}_${direction}_release`;
                payload.duration = duration;
            } else {
                direction = msg.data.movemode === 3 ? 'down' : 'up';
                payload.action = `${clk}_${direction}_hold`;
                payload.rate = msg.data.rate;
                // store button and start moment
                store[deviceID].direction = direction;
                store[deviceID].start = Date.now();
            }
            return payload;
        },
    },
    wiser_device_info: {
        cluster: 'wiserDeviceInfo',
        type: 'attributeReport',
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const data = msg.data['deviceInfo'].split(',');
            if (data[0] === 'ALG') {
                // TODO What is ALG
                const alg = data.slice(1);
                result['ALG'] = alg.join(',');
                result['occupied_heating_setpoint'] = alg[2]/10;
                result['local_temperature'] = alg[3]/10;
                result['pi_heating_demand'] = parseInt(alg[9]);
            } else if (data[0] === 'ADC') {
                // TODO What is ADC
                const adc = data.slice(1);
                result['ADC'] = adc.join(',');
                result['occupied_heating_setpoint'] = adc[5]/100;
                result['local_temperature'] = adc[3]/10;
            } else if (data[0] === 'UI') {
                if (data[1] === 'BoostUp') {
                    result['boost'] = 'Up';
                } else if (data[1] === 'BoostDown') {
                    result['boost'] = 'Down';
                } else {
                    result['boost'] = 'None';
                }
            } else if (data[0] === 'MOT') {
                // Info about the motor
                result['MOT'] = data[1];
            }
            return result;
        },
    },
    wiser_itrv_battery: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (typeof msg.data['batteryVoltage'] == 'number') {
                const battery = {max: 30, min: 22};
                const voltage = msg.data['batteryVoltage'];
                result.battery = toPercentage(voltage, battery.min, battery.max);
                result.voltage = voltage / 10;
            }
            if (typeof msg.data['batteryAlarmState'] == 'number') {
                const battLow = msg.data['batteryAlarmState'];
                if (battLow) {
                    result['battery_low'] = true;
                } else {
                    result['battery_low'] = false;
                }
            }
            return result;
        },
    },
    wiser_thermostat: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (typeof msg.data['localTemp'] == 'number') {
                result.local_temperature = precisionRound(msg.data['localTemp'], 2) / 100;
            }
            if (typeof msg.data['occupiedHeatingSetpoint'] == 'number') {
                result.occupied_heating_setpoint =
                    precisionRound(msg.data['occupiedHeatingSetpoint'], 2) / 100;
            }
            if (typeof msg.data['pIHeatingDemand'] == 'number') {
                result.pi_heating_demand = precisionRound(msg.data['pIHeatingDemand'], 2);
            }
            return result;
        },
    },
    wiser_user_interface: {
        cluster: 'hvacUserInterfaceCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (typeof msg.data['keypadLockout'] == 'number') {
                const kLock = msg.data['keypadLockout'];
                if (kLock) {
                    result['keypad_lockout'] = true;
                } else {
                    result['keypad_lockout'] = false;
                }
            }
            return result;
        },
    },


    legrand_binary_input_moving: {
        cluster: 'genBinaryInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {
                action: msg.data.presentValue ? 'moving' : 'stopped',
            };
        },
    },
    legrand_scenes: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            let action = 'default';
            switch (msg.data.groupid) {
            case 0xfff7:
                action = 'enter';
                break;

            case 0xfff6:
                action = 'leave';
                break;

            case 0xfff4:
                action = 'sleep';
                break;

            case 0xfff5:
                action = 'wakeup';
                break;
            }

            return {
                action: action,
            };
        },
    },
    legrand_master_switch_center: {
        cluster: 'manuSpecificLegrandDevices',
        type: 'raw',
        convert: (model, msg, publish, options, meta) => {
            if (
                msg.data && msg.data.length === 6 &&
                msg.data[0] === 0x15 && msg.data[1] === 0x21 && msg.data[2] === 0x10 &&
                msg.data[3] === 0x00 && msg.data[4] === 0x03 && msg.data[5] === 0xff
            ) {
                return {
                    action: 'center',
                };
            }
        },
    },
    legrand_power_alarm: {
        cluster: 'haElectricalMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const payload = {};

            // 0xf000 = 61440
            // This attribute returns usually 2 when power is over the defined threshold.
            if (msg.data.hasOwnProperty('61440')) {
                payload.power_alarm_active_value = msg.data['61440'];
                payload.power_alarm_active = (payload.power_alarm_active_value > 0);
            }
            // 0xf001 = 61441
            if (msg.data.hasOwnProperty('61441')) {
                payload.power_alarm_enabled = msg.data['61441'];
            }
            // 0xf002 = 61442, wh = watt hour
            if (msg.data.hasOwnProperty('61442')) {
                payload.power_alarm_wh_threshold = msg.data['61442'];
            }
            return payload;
        },
    },
    tuya_led_controller: {
        cluster: 'lightingColorCtrl',
        type: ['attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};

            if (msg.data['61441']) {
                result.brightness = msg.data['61441'];
            }

            result.color = {};

            if (msg.data.hasOwnProperty('currentHue')) {
                result.color.h = precisionRound((msg.data['currentHue'] * 360) / 254, 0);
            }

            if (msg.data['currentSaturation']) {
                result.color.s = precisionRound(msg.data['currentSaturation'] / 2.54, 0);
            }

            return result;
        },
    },
    tuya_dimmer: {
        cluster: 'manuSpecificTuyaDimmer',
        type: ['commandGetData', 'commandSetDataResponse'],
        convert: (model, msg, publish, options, meta) => {
            const key = msg.data.dp;
            const val = msg.data.data;
            if (key === 257) {
                return {state: (val[0]) ? 'ON': 'OFF'};
            } else {
                const level = val[2]*256 + val[3];
                const normalised = (level - 10) / (1000 - 10);
                return {brightness: Math.round(normalised * 254), level: level};
            }
        },
    },
    tuya_thermostat_on_set_data: {
        cluster: 'manuSpecificTuyaDimmer',
        type: 'commandSetDataResponse',
        convert: tuyaThermostat,
    },
    tuya_thermostat: {
        cluster: 'manuSpecificTuyaDimmer',
        type: 'commandGetData',
        convert: tuyaThermostat,
    },
    tuya_fan_mode: {
        cluster: 'manuSpecificTuyaDimmer',
        type: 'commandGetData',
        convert: tuyaThermostat,
    },
    tuya_switch: {
        cluster: 'manuSpecificTuyaDimmer',
        type: 'raw',
        convert: (model, msg, publish, options, meta) => {
            const key = msg.data[5];
            const val = msg.data[9];
            const lookup = {
                1: 'state_l1',
                2: 'state_l2',
                3: 'state_l3',
                4: 'state_l4',
            };
            return {[lookup[key]]: (val) ? 'ON': 'OFF'};
        },
    },
    tuya_switch2: {
        cluster: 'manuSpecificTuyaDimmer',
        type: ['commandSetDataResponse', 'commandGetData'],
        convert: (model, msg, publish, options, meta) => {
            const multiEndpoint = model.meta && model.meta.multiEndpoint;
            const dp = msg.data.dp;
            const state = msg.data.data[0] ? 'ON' : 'OFF';
            if (multiEndpoint) {
                const lookup = {257: 'l1', 258: 'l2', 259: 'l3'};
                const endpoint = lookup[dp];
                if (endpoint in model.endpoint(msg.device)) {
                    return {[`state_${endpoint}`]: state};
                }
            } else if (dp === 257) {
                return {state: state};
            }
            return null;
        },
    },
    tuya_curtain: {
        cluster: 'manuSpecificTuyaDimmer',
        type: ['commandSetDataResponse', 'commandGetData'],
        convert: (model, msg, publish, options, meta) => {
            const dp = msg.data.dp;

            // Protocol description
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1159#issuecomment-614659802

            switch (dp) {
            case 1025: // 0x04 0x01: Confirm opening/closing/stopping (triggered from Zigbee)
            case 514: // 0x02 0x02: Started moving to position (triggered from Zigbee)
            case 1031: // 0x04 0x07: Started moving (triggered by transmitter oder pulling on curtain)
                return {'running': true};
            case 515: { // 0x02 0x03: Arrived at position
                let position = msg.data.data[3];
                position = options.invert_cover ? 100 - position : position;

                if (position > 0 && position <= 100) {
                    return {running: false, position: position};
                } else if (position == 0) { // Report fully closed
                    return {running: false, position: position};
                } else {
                    return {running: false}; // Not calibrated yet, no position is available
                }
            }
            case 261: // 0x01 0x05: Returned by configuration set; ignore
                break;
            default: // Unknown code
                console.log(`owvfni3: Unhandled DP #${dp}: ${JSON.stringify(msg.data)}`);
            }
        },
    },
    almond_click: {
        cluster: 'ssIasAce',
        type: ['commandArm'],
        convert: (model, msg, publish, options, meta) => {
            const action = msg.data['armmode'];
            delete msg.data['armmode'];
            const lookup = {
                3: {action: 'single'}, // single click
                0: {action: 'double'}, // double
                2: {action: 'long'}, // hold
            };

            // Workaround to ignore duplicated (false) presses that
            // are 100ms apart, since the button often generates
            // multiple duplicated messages for a single click event.
            const deviceID = msg.device.ieeeAddr;
            if (!store[deviceID]) {
                store[deviceID] = {since: 0};
            }

            const now = Date.now();
            const since = store[deviceID].since;

            if ((now-since)>100) {
                store[deviceID].since = now;
                return lookup[action] ? lookup[action] : null;
            } else {
                return;
            }
        },
    },
    blitzwolf_occupancy_with_timeout: {
        cluster: 'manuSpecificTuyaDimmer',
        type: 'commandGetData',
        convert: (model, msg, publish, options, meta) => {
            msg.data.occupancy = msg.data.dp === 1027 ? 1 : 0;
            return converters.occupancy_with_timeout.convert(model, msg, publish, options, meta);
        },
    },
    ewelink_action: {
        cluster: 'genOnOff',
        type: ['commandOn', 'commandOff', 'commandToggle'],
        convert: (model, msg, publish, options, meta) => {
            const lookup = {
                'commandToggle': {action: 'single'},
                'commandOn': {action: 'double'},
                'commandOff': {action: 'long'},
            };
            return lookup[msg.type];
        },
    },
    ubisys_c4_scenes: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            return {action: `${msg.endpoint.ID}_scene_${msg.data.groupid}_${msg.data.sceneid}`};
        },
    },
    ubisys_c4_onoff: {
        cluster: 'genOnOff',
        type: ['commandOn', 'commandOff', 'commandToggle'],
        convert: (model, msg, publish, options, meta) => {
            return {action: `${msg.endpoint.ID}_${msg.type.substr(7).toLowerCase()}`};
        },
    },
    ubisys_c4_level: {
        cluster: 'genLevelCtrl',
        type: ['commandMoveWithOnOff', 'commandStopWithOnOff'],
        convert: (model, msg, publish, options, meta) => {
            switch (msg.type) {
            case 'commandMoveWithOnOff':
                return {action: `${msg.endpoint.ID}_level_move_${msg.data.movemode ? 'down' : 'up'}`};
            case 'commandStopWithOnOff':
                return {action: `${msg.endpoint.ID}_level_stop`};
            }
        },
    },
    ubisys_c4_cover: {
        cluster: 'closuresWindowCovering',
        type: ['commandUpOpen', 'commandDownClose', 'commandStop'],
        convert: (model, msg, publish, options, meta) => {
            const lookup = {
                'commandUpOpen': 'open',
                'commandDownClose': 'close',
                'commandStop': 'stop',
            };
            return {action: `${msg.endpoint.ID}_cover_${lookup[msg.type]}`};
        },
    },
    EMIZB_132_power: {
        cluster: 'haElectricalMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            // Cannot use electrical_measurement_power here as the reported divisor is not correct
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/974#issuecomment-600834722
            const payload = {};
            if (msg.data.hasOwnProperty('rmsCurrent')) {
                payload.current = precisionRound(msg.data['rmsCurrent'] / 10, 2);
            }
            if (msg.data.hasOwnProperty('rmsVoltage')) {
                payload.voltage = precisionRound(msg.data['rmsVoltage'] / 10, 2);
            }
            return payload;
        },
    },
    _3310_humidity: {
        cluster: 'manuSpecificCentraliteHumidity',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const humidity = parseFloat(msg.data['measuredValue']) / 100.0;
            return {humidity: calibrateAndPrecisionRoundOptions(humidity, options, 'humidity')};
        },
    },
    smartthings_acceleration: {
        cluster: 'manuSpecificSamsungAccelerometer',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {moving: msg.data['acceleration'] === 1 ? true : false};
        },
    },
    MultiSensor_ias_contact_alarm: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            if (msg.endpoint.ID != 1) return;
            return {
                contact: !((zoneStatus & 1) > 0),
            };
        },
    },
    MultiSensor_ias_water_leak_alarm: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            if (msg.endpoint.ID != 2) return;
            return {
                water_leak: (zoneStatus & 1) > 0,
            };
        },
    },
    ZMCSW032D_cover_position_tilt: {
        cluster: 'closuresWindowCovering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const timeCoverSetMiddle = 60;

            // https://github.com/Koenkk/zigbee-herdsman-converters/pull/1336
            // Need to add time_close and time_open in your configuration.yaml after friendly_name (and set your time)
            if (options.hasOwnProperty('time_close') && options.hasOwnProperty('time_open')) {
                const deviceID = msg.device.ieeeAddr;
                if (!store[deviceID]) {
                    store[deviceID] = {lastPreviousAction: -1, CurrentPosition: -1, since: false};
                }
                // ignore if first action is middle and ignore action middle if previous action is middle
                if (msg.data.hasOwnProperty('currentPositionLiftPercentage') &&
                    msg.data['currentPositionLiftPercentage'] == 50 ) {
                    if ((store[deviceID].CurrentPosition == -1 && store[deviceID].lastPreviousAction == -1) ||
                        store[deviceID].lastPreviousAction == 50 ) {
                        console.log(`ZMCSW032D ignore action `);
                        return;
                    }
                }
                let currentPosition = store[deviceID].CurrentPosition;
                const lastPreviousAction = store[deviceID].lastPreviousAction;
                const deltaTimeSec = Math.floor((Date.now() - store[deviceID].since)/1000); // convert to sec

                store[deviceID].since = Date.now();
                store[deviceID].lastPreviousAction = msg.data['currentPositionLiftPercentage'];

                if (msg.data.hasOwnProperty('currentPositionLiftPercentage') &&
                    msg.data['currentPositionLiftPercentage'] == 50 ) {
                    if (deltaTimeSec < timeCoverSetMiddle || deltaTimeSec > timeCoverSetMiddle) {
                        if (lastPreviousAction == 100 ) {
                            // Open
                            currentPosition = currentPosition == -1 ? 0 : currentPosition;
                            currentPosition = currentPosition + ((deltaTimeSec * 100)/options.time_open);
                        } else if (lastPreviousAction == 0 ) {
                            // Close
                            currentPosition = currentPosition == -1 ? 100 : currentPosition;
                            currentPosition = currentPosition - ((deltaTimeSec * 100)/options.time_close);
                        }
                        currentPosition = currentPosition > 100 ? 100 : currentPosition;
                        currentPosition = currentPosition < 0 ? 0 : currentPosition;
                    }
                }
                store[deviceID].CurrentPosition = currentPosition;

                if (msg.data.hasOwnProperty('currentPositionLiftPercentage') &&
                    msg.data['currentPositionLiftPercentage'] !== 50 ) {
                    // postion cast float to int
                    result.position = currentPosition | 0;
                    result.position = options.invert_cover ? 100 - result.position : result.position;
                } else {
                    if (deltaTimeSec < timeCoverSetMiddle || deltaTimeSec > timeCoverSetMiddle) {
                        // postion cast float to int
                        result.position = currentPosition | 0;
                        result.position = options.invert_cover ? 100 - result.position : result.position;
                    } else {
                        store[deviceID].CurrentPosition = lastPreviousAction;
                        result.position = lastPreviousAction;
                        result.position = options.invert_cover ? 100 - result.position : result.position;
                    }
                }
            } else {
                // Previous solution without time_close and time_open
                if (msg.data.hasOwnProperty('currentPositionLiftPercentage') &&
                    msg.data['currentPositionLiftPercentage'] !== 50) {
                    const liftPercentage = msg.data['currentPositionLiftPercentage'];
                    result.position = liftPercentage;
                    result.position = options.invert_cover ? 100 - result.position : result.position;
                }
            }
            return result;
        },
    },
    ZG2819S_command_on: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            // The device sends this command for all four group IDs.
            // Only forward for the first group.
            if (msg.groupID !== 46337) {
                return null;
            }
            return {action: postfixWithEndpointName('on', msg, model)};
        },
    },
    ZG2819S_command_off: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options, meta) => {
            // The device sends this command for all four group IDs.
            // Only forward for the first group.
            if (msg.groupID !== 46337) {
                return null;
            }
            return {action: postfixWithEndpointName('off', msg, model)};
        },
    },
    K4003C_binary_input: {
        cluster: 'genBinaryInput',
        type: 'attributeReport',
        convert: (model, msg, publish, options, meta) => {
            return {action: msg.data.presentValue === 1 ? 'off' : 'on'};
        },
    },
    greenpower_on_off_switch: {
        cluster: 'greenPower',
        type: 'commandNotification',
        convert: (model, msg, publish, options, meta) => {
            const commandID = msg.data.commandID;
            const lookup = {
                0x00: 'identify',
                0x10: 'recall_scene_0',
                0x11: 'recall_scene_1',
                0x12: 'recall_scene_2',
                0x13: 'recall_scene_3',
                0x14: 'recall_scene_4',
                0x15: 'recall_scene_5',
                0x16: 'recall_scene_6',
                0x17: 'recall_scene_7',
                0x18: 'store_scene_0',
                0x19: 'store_scene_1',
                0x1A: 'store_scene_2',
                0x1B: 'store_scene_3',
                0x1C: 'store_scene_4',
                0x1D: 'store_scene_5',
                0x1E: 'store_scene_6',
                0x1F: 'store_scene_7',
                0x20: 'off',
                0x21: 'on',
                0x22: 'toggle',
                0x23: 'release',
                0x60: 'press_1_of_1',
                0x61: 'release_1_of_1',
                0x62: 'press_1_of_2',
                0x63: 'release_1_of_2',
                0x64: 'press_2_of_2',
                0x65: 'release_2_of_2',
                0x66: 'short_press_1_of_1',
                0x67: 'short_press_1_of_2',
                0x68: 'short_press_2_of_1',
            };

            return {action: lookup[commandID] || commandID.toString()};
        },
    },
    greenpower_7: {
        cluster: 'greenPower',
        type: 'commandNotification',
        convert: (model, msg, publish, options, meta) => {
            const commandID = msg.data.commandID;
            let postfix = '';

            if (msg.data.commandFrame && msg.data.commandFrame.raw) {
                postfix = `_${[...msg.data.commandFrame.raw].join('_')}`;
            }

            return {action: `${commandID.toString()}${postfix}`};
        },
    },
    lifecontrolVoc: {
        cluster: 'msTemperatureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const temperature = parseFloat(msg.data['measuredValue']) / 100.0;
            const humidity = parseFloat(msg.data['minMeasuredValue']) / 100.0;
            const eco2 = parseFloat(msg.data['maxMeasuredValue']);
            const voc = parseFloat(msg.data['tolerance']);
            return {
                temperature: calibrateAndPrecisionRoundOptions(temperature, options, 'temperature'),
                humidity: calibrateAndPrecisionRoundOptions(humidity, options, 'humidity'),
                eco2: eco2,
                voc: voc,
            };
        },
    },
    _8840100H_water_leak_alarm: {
        cluster: 'haApplianceEventsAlerts',
        type: 'commandAlertsNotification',
        convert: (model, msg, publish, options, meta) => {
            const alertStatus = msg.data.aalert;
            return {
                water_leak: (alertStatus & 1<<12) > 0,
            };
        },
    },
    E1E_G7F_action: {
        cluster: 64528,
        type: ['raw'],
        convert: (model, msg, publish, options, meta) => {
            // A list of commands the sixth digit in the raw data can map to
            const lookup = {
                1: 'on',
                2: 'up',
                // Two outputs for long press. The eighth digit outputs 1 for initial press then 2 for each
                // LED blink (approx 1 second, repeating until release)
                3: 'down', // Same as above
                4: 'off',
                5: 'on_double',
                6: 'on_long',
                7: 'off_double',
                8: 'off_long',
            };

            if (msg.data[7] === 2) { // If the 8th digit is 2 (implying long press)
                // Append '_long' to the end of the action so the user knows it was a long press.
                // This only applies to the up and down action
                return {action: `${lookup[msg.data[5]]}_long`};
            } else {
                return {action: lookup[msg.data[5]]}; // Just output the data from the above lookup list
            }
        },
    },
    SAGE206612_state: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            const deviceId = msg.endpoint.deviceIeeeAddress;
            const timeout = 28;

            if (!store[deviceId]) {
                store[deviceId] = [];
            }

            const timer = setTimeout(() => {
                store[deviceId].pop();
            }, timeout * 1000);

            if (store[deviceId].length === 0 || store[deviceId].length > 4) {
                store[deviceId].push(timer);
                return {action: 'on'};
            } else {
                if (timeout > 0) {
                    store[deviceId].push(timer);
                }

                return null;
            }
        },
    },
    kmpcil_res005_occupancy: {
        cluster: 'genBinaryInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {occupancy: (msg.data['presentValue']===1)};
        },
    },
    kmpcil_res005_on_off: {
        cluster: 'genBinaryOutput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {state: (msg.data['presentValue']==0) ? 'OFF' : 'ON'};
        },
    },
    neo_t_h_alarm: {
        cluster: 'manuSpecificTuyaDimmer',
        type: ['commandSetDataResponse', 'commandGetData'],
        convert: (model, msg, publish, options, meta) => {
            const dp = msg.data.dp;
            const data = msg.data.data;
            const dataAsDecNumber = utils.convertMultiByteNumberPayloadToSingleDecimalNumber(data);
            switch (dp) {
            case 360: // 0x0168 [0]/[1] Alarm!
                return {alarm: (dataAsDecNumber!=0)};
            case 368: // 0x0170 [0]
                break;
            case 369: // 0x0171 [0]/[1] Disable/Enable alarm by temperature
                return {temperature_alarm: (dataAsDecNumber!=0)};
            case 370: // 0x0172 [0]/[1] Disable/Enable alarm by humidity
                return {humidity_alarm: (dataAsDecNumber!=0)};
            case 615: // 0x0267 [0,0,0,10] duration alarm in second
                return {duration: dataAsDecNumber};
            case 617: // 0x0269 [0,0,0,240] temperature
                return {temperature: (dataAsDecNumber/10).toFixed(1)};
            case 618: // 0x026A [0,0,0,36] humidity
                return {humidity: dataAsDecNumber};
            case 619: // 0x026B [0,0,0,18] min alarm temperature
                return {temperature_min: dataAsDecNumber};
            case 620: // 0x026C [0,0,0,27] max alarm temperature
                return {temperature_max: dataAsDecNumber};
            case 621: // 0x026D [0,0,0,45] min alarm humidity
                return {humidity_min: dataAsDecNumber};
            case 622: // 0x026E [0,0,0,80] max alarm humidity
                return {humidity_max: dataAsDecNumber};
            case 1125: // 0x0465 [4]
                break;
            case 1126: // 0x0466 [5] Melody
                return {melody: dataAsDecNumber};
            case 1139: // 0x0473 [0]
                break;
            case 1140: // 0x0474 [0]/[1]/[2] Volume 0-max, 2-low
                return {volume: {2: 'low', 1: 'medium', 0: 'high'}[dataAsDecNumber]};
            default: // Unknown code
                console.log(`Unhandled DP #${dp}: ${JSON.stringify(msg.data)}`);
            }
        },
    },

    // Ignore converters (these message dont need parsing).
    ignore_onoff_report: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_basic_report: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_illuminance_report: {
        cluster: 'msIlluminanceMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_occupancy_report: {
        cluster: 'msOccupancySensing',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_temperature_report: {
        cluster: 'msTemperatureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_humidity_report: {
        cluster: 'msRelativeHumidity',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_pressure_report: {
        cluster: 'msPressureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_analog_report: {
        cluster: 'genAnalogInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_multistate_report: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_power_report: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_light_brightness_report: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_light_color_colortemp_report: {
        cluster: 'lightingColorCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_closuresWindowCovering_report: {
        cluster: 'closuresWindowCovering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_thermostat_report: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_iaszone_attreport: {
        cluster: 'ssIasZone',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_iaszone_statuschange: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_iaszone_report: {
        cluster: 'ssIasZone',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_genIdentify: {
        cluster: 'genIdentify',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => null,
    },
    _324131092621_ignore_on: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => null,
    },
    _324131092621_ignore_off: {
        cluster: 'genOnOff',
        type: 'commandOffWithEffect',
        convert: (model, msg, publish, options, meta) => null,
    },
    _324131092621_ignore_step: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options, meta) => null,
    },
    _324131092621_ignore_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_poll_ctrl: {
        cluster: 'genPollCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_genLevelCtrl_report: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_genOta: {
        cluster: 'genOta',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_haDiagnostic: {
        cluster: 'haDiagnostic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_zclversion_read: {
        cluster: 'genBasic',
        type: 'read',
        convert: (model, msg, publish, options, meta) => null,
    },
    ignore_time_read: {
        cluster: 'genTime',
        type: 'read',
        convert: (model, msg, publish, options, meta) => null,
    },
};

module.exports = converters;
