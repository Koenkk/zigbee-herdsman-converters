'use strict';

const debounce = require('debounce');
const common = require('./common');
const utils = require('./utils');

const clickLookup = {
    1: 'single',
    2: 'double',
    3: 'triple',
    4: 'quadruple',
};

const occupancyTimeout = 90; // In seconds

const defaultPrecision = {
    temperature: 2,
    humidity: 2,
    pressure: 1,
};

const precisionRoundOptions = (number, options, type) => {
    const key = `${type}_precision`;
    const defaultValue = defaultPrecision[type];
    const precision = options && options.hasOwnProperty(key) ? options[key] : defaultValue;
    return precisionRound(number, precision);
};

const precisionRound = (number, precision) => {
    const factor = Math.pow(10, precision);
    return Math.round(number * factor) / factor;
};

const toPercentage = (value, min, max) => {
    if (value > max) {
        value = max;
    } else if (value < min) {
        value = min;
    }

    const normalised = (value - min) / (max - min);
    return (normalised * 100).toFixed(2);
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
    const deviceID = msg.endpoints[0].device.ieeeAddr;

    if (!store[deviceID]) {
        const _publish = debounce((msg) => publish(msg), 250);
        store[deviceID] = {since: false, direction: false, value: 255, publish: _publish};
    }

    const s = store[deviceID];
    if (s.since && s.direction) {
        // Update value
        const duration = Date.now() - s.since;
        const delta = Math.round((duration / 10) * (s.direction === 'left' ? -1 : 1));
        const newValue = s.value + delta;
        if (newValue >= 0 && newValue <= 255) {
            s.value = newValue;
        }
    }

    if (action === 'move') {
        s.since = Date.now();
        s.direction = msg.data.data.movemode === 1 ? 'left' : 'right';
    } else if (action === 'stop' || action === 'level') {
        if (action === 'level') {
            s.value = msg.data.data.level;
        }

        s.since = false;
        s.direction = false;
    }

    s.publish({brightness: s.value});
};

const holdUpdateBrightness324131092621 = (deviceID) => {
    if (store[deviceID] && store[deviceID].since && store[deviceID].direction) {
        const duration = Date.now() - store[deviceID].since;
        const delta = (duration / 10) * (store[deviceID].direction === 'up' ? 1 : -1);
        const newValue = store[deviceID].value + delta;
        store[deviceID].value = numberWithinRange(newValue, 0, 255);
    }
};


const converters = {
    AC0251100NJ_on: {
        cid: 'genOnOff',
        type: 'cmdOn',
        convert: (model, msg, publish, options) => {
            return {click: 'on'};
        },
    },
    AC0251100NJ_off: {
        cid: 'genOnOff',
        type: 'cmdOff',
        convert: (model, msg, publish, options) => {
            return {click: 'off'};
        },
    },
    AC0251100NJ_long_middle: {
        cid: 'lightingColorCtrl',
        type: 'cmdMoveHue',
        convert: (model, msg, publish, options) => {
            return {click: 'long_middle'};
        },
    },
    bitron_power: {
        cid: 'seMetering',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            return {power: parseFloat(msg.data.data['instantaneousDemand']) / 10.0};
        },
    },
    bitron_occupancy: {
        cid: 'ssIasZone',
        type: 'statusChange',
        convert: (model, msg, publish, options) => {
            // The occupancy sensor only sends a message when motion detected.
            // Therefore we need to publish the no_motion detected by ourselves.
            const useOptionsTimeout = options && options.hasOwnProperty('occupancy_timeout');
            const timeout = useOptionsTimeout ? options.occupancy_timeout : occupancyTimeout;
            const deviceID = msg.endpoints[0].device.ieeeAddr;

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
    bitron_battery: {
        cid: 'genPowerCfg',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const battery = {max: 3200, min: 2500};
            const voltage = msg.data.data['batteryVoltage'] * 100;
            return {
                battery: toPercentage(voltage, battery.min, battery.max),
                voltage: voltage,
            };
        },
    },
    bitron_thermostat_att_report: {
        cid: 'hvacThermostat',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const result = {};
            if (typeof msg.data.data['localTemp'] == 'number') {
                result.local_temperature = precisionRound(msg.data.data['localTemp'], 2) / 100;
            }
            if (typeof msg.data.data['localTemperatureCalibration'] == 'number') {
                result.local_temperature_calibration =
                    precisionRound(msg.data.data['localTemperatureCalibration'], 2) / 10;
            }
            if (typeof msg.data.data['occupiedHeatingSetpoint'] == 'number') {
                result.occupied_heating_setpoint =
                    precisionRound(msg.data.data['occupiedHeatingSetpoint'], 2) / 100;
            }
            if (typeof msg.data.data['runningState'] == 'number') {
                result.running_state = msg.data.data['runningState'];
            }
            if (typeof msg.data.data['batteryAlarmState'] == 'number') {
                result.battery_alarm_state = msg.data.data['batteryAlarmState'];
            }
            return result;
        },
    },
    bitron_thermostat_dev_change: {
        cid: 'hvacThermostat',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            const result = {};
            if (typeof msg.data.data['localTemp'] == 'number') {
                result.local_temperature = precisionRound(msg.data.data['localTemp'], 2) / 100;
            }
            if (typeof msg.data.data['localTemperatureCalibration'] == 'number') {
                result.local_temperature_calibration =
                    precisionRound(msg.data.data['localTemperatureCalibration'], 2) / 10;
            }
            if (typeof msg.data.data['occupiedHeatingSetpoint'] == 'number') {
                result.occupied_heating_setpoint =
                    precisionRound(msg.data.data['occupiedHeatingSetpoint'], 2) / 100;
            }
            if (typeof msg.data.data['runningState'] == 'number') {
                result.running_state = msg.data.data['runningState'];
            }
            if (typeof msg.data.data['batteryAlarmState'] == 'number') {
                result.battery_alarm_state = msg.data.data['batteryAlarmState'];
            }
            return result;
        },
    },
    smartthings_contact: {
        cid: 'ssIasZone',
        type: 'statusChange',
        convert: (model, msg, publish, options) => {
            return {contact: msg.data.zoneStatus === 48};
        },
    },
    xiaomi_battery_3v: {
        cid: 'genBasic',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            let voltage = null;

            if (msg.data.data['65281']) {
                voltage = msg.data.data['65281']['1'];
            } else if (msg.data.data['65282']) {
                voltage = msg.data.data['65282']['1'].elmVal;
            }

            if (voltage) {
                return {
                    battery: parseFloat(toPercentageCR2032(voltage)),
                    voltage: voltage,
                };
            }
        },
    },
    RTCGQ11LM_interval: {
        cid: 'genBasic',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            if (msg.data.data['65281']) {
                return {illuminance: msg.data.data['65281']['11']};
            }
        },
    },
    WSDCGQ01LM_WSDCGQ11LM_interval: {
        cid: 'genBasic',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            if (msg.data.data['65281']) {
                const temperature = parseFloat(msg.data.data['65281']['100']) / 100.0;
                const humidity = parseFloat(msg.data.data['65281']['101']) / 100.0;
                const result = {
                    temperature: precisionRoundOptions(temperature, options, 'temperature'),
                    humidity: precisionRoundOptions(humidity, options, 'humidity'),
                };

                // Check if contains pressure (WSDCGQ11LM only)
                if (msg.data.data['65281'].hasOwnProperty('102')) {
                    const pressure = parseFloat(msg.data.data['65281']['102']) / 100.0;
                    result.pressure = precisionRoundOptions(pressure, options, 'pressure');
                }

                return result;
            }
        },
    },
    WXKG01LM_click: {
        cid: 'genOnOff',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const deviceID = msg.endpoints[0].device.ieeeAddr;
            const state = msg.data.data['onOff'];

            if (!store[deviceID]) {
                store[deviceID] = {};
            }

            // 0 = click down, 1 = click up, else = multiple clicks
            if (state === 0) {
                store[deviceID].timer = setTimeout(() => {
                    publish({click: 'long'});
                    store[deviceID].timer = null;
                    store[deviceID].long = Date.now();
                }, 300); // After 300 milliseconds of not releasing we assume long click.
            } else if (state === 1) {
                if (store[deviceID].long) {
                    const duration = Date.now() - store[deviceID].long;
                    publish({click: 'long_release', duration: duration});
                    store[deviceID].long = false;
                }

                if (store[deviceID].timer) {
                    clearTimeout(store[deviceID].timer);
                    store[deviceID].timer = null;
                    publish({click: 'single'});
                }
            } else {
                const clicks = msg.data.data['32768'];
                const payload = clickLookup[clicks] ? clickLookup[clicks] : 'many';
                publish({click: payload});
            }
        },
    },
    generic_temperature: {
        cid: 'msTemperatureMeasurement',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const temperature = parseFloat(msg.data.data['measuredValue']) / 100.0;
            return {temperature: precisionRoundOptions(temperature, options, 'temperature')};
        },
    },
    xiaomi_temperature: {
        cid: 'msTemperatureMeasurement',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const temperature = parseFloat(msg.data.data['measuredValue']) / 100.0;

            // https://github.com/Koenkk/zigbee2mqtt/issues/798
            // Sometimes the sensor publishes non-realistic vales, as the sensor only works from
            // -20 till +60, don't produce messages beyond these values.
            if (temperature > -25 && temperature < 65) {
                return {temperature: precisionRoundOptions(temperature, options, 'temperature')};
            }
        },
    },
    MFKZQ01LM_action_multistate: {
        cid: 'genMultistateInput',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
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
            const value = msg.data.data['presentValue'];
            let action = null;

            if (value === 0) action = {'action': 'shake'};
            else if (value === 2) action = {'action': 'wakeup'};
            else if (value === 3) action = {'action': 'fall'};
            else if (value >= 512) action = {'action': 'tap', 'side': value-512};
            else if (value >= 256) action = {'action': 'slide', 'side': value-256};
            else if (value >= 128) action = {'action': 'flip180', 'side': value-128};
            else if (value >= 64) {
                action = {'action': 'flip90', 'from_side': Math.floor((value-64) / 8), 'to_side': value % 8};
            }

            return action ? action : null;
        },
    },
    MFKZQ01LM_action_analog: {
        cid: 'genAnalogInput',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            /*
            Source: https://github.com/kirovilya/ioBroker.zigbee
            presentValue = rotation angle left < 0, right > 0
            */
            const value = msg.data.data['presentValue'];
            return {
                action: value < 0 ? 'rotate_left' : 'rotate_right',
                angle: Math.floor(value * 100) / 100,
            };
        },
    },
    WXKG12LM_action_click_multistate: {
        cid: 'genMultistateInput',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const value = msg.data.data['presentValue'];
            const lookup = {
                1: {click: 'single'}, // single click
                2: {click: 'double'}, // double click
                16: {action: 'hold'}, // hold for more than 400ms
                17: {action: 'release'}, // release after hold for more than 400ms
                18: {action: 'shake'}, // shake
            };

            return lookup[value] ? lookup[value] : null;
        },
    },
    xiaomi_action_click_multistate: {
        cid: 'genMultistateInput',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const value = msg.data.data['presentValue'];
            const lookup = {
                1: {click: 'single'}, // single click
                2: {click: 'double'}, // double click
                0: {action: 'hold'}, // hold for more than 400ms
                255: {action: 'release'}, // release after hold for more than 400ms
            };

            return lookup[value] ? lookup[value] : null;
        },
    },
    xiaomi_humidity: {
        cid: 'msRelativeHumidity',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const humidity = parseFloat(msg.data.data['measuredValue']) / 100.0;

            // https://github.com/Koenkk/zigbee2mqtt/issues/798
            // Sometimes the sensor publishes non-realistic vales, it should only publish message
            // in the 0 - 100 range, don't produce messages beyond these values.
            if (humidity >= 0 && humidity <= 100) {
                return {humidity: precisionRoundOptions(humidity, options, 'humidity')};
            }
        },
    },
    generic_occupancy: {
        // This is for occupancy sensor that send motion start AND stop messages
        // Note: options.occupancy_timeout not available yet, to implement it will be
        // needed to update device report intervall as well, see devices.js
        cid: 'msOccupancySensing',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            if (msg.data.data.occupancy === 0) {
                return {occupancy: false};
            } else if (msg.data.data.occupancy === 1) {
                return {occupancy: true};
            }
        },
    },
    generic_occupancy_no_off_msg: {
        // This is for occupancy sensor that only send a message when motion detected,
        // but do not send a motion stop.
        // Therefore we need to publish the no_motion detected by ourselves.
        cid: 'msOccupancySensing',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            if (msg.data.data.occupancy !== 1) {
                // In case of 0 no occupancy is reported.
                // https://github.com/Koenkk/zigbee2mqtt/issues/467
                return;
            }

            // The occupancy sensor only sends a message when motion detected.
            // Therefore we need to publish the no_motion detected by ourselves.
            const useOptionsTimeout = options && options.hasOwnProperty('occupancy_timeout');
            const timeout = useOptionsTimeout ? options.occupancy_timeout : occupancyTimeout;
            const deviceID = msg.endpoints[0].device.ieeeAddr;

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
    xiaomi_contact: {
        cid: 'genOnOff',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            return {contact: msg.data.data['onOff'] === 0};
        },
    },
    xiaomi_contact_interval: {
        cid: 'genBasic',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            return {contact: msg.data.data['65281']['100'] === 0};
        },
    },
    light_state: {
        cid: 'genOnOff',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            return {state: msg.data.data['onOff'] === 1 ? 'ON' : 'OFF'};
        },
    },
    light_brightness: {
        cid: 'genLevelCtrl',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            return {brightness: msg.data.data['currentLevel']};
        },
    },
    light_color_colortemp: {
        cid: 'lightingColorCtrl',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            const result = {};

            if (msg.data.data['colorTemperature']) {
                result.color_temp = msg.data.data['colorTemperature'];
            }

            if (msg.data.data['colorMode']) {
                result.color_mode = msg.data.data['colorMode'];
            }

            if (msg.data.data['currentX'] || msg.data.data['currentY']) {
                result.color = {};

                if (msg.data.data['currentX']) {
                    result.color.x = precisionRound(msg.data.data['currentX'] / 65535, 3);
                }

                if (msg.data.data['currentY']) {
                    result.color.y = precisionRound(msg.data.data['currentY'] / 65535, 3);
                }
            }

            return result;
        },
    },
    WXKG11LM_click: {
        cid: 'genOnOff',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const data = msg.data.data;
            let clicks;

            if (data.onOff) {
                clicks = 1;
            } else if (data['32768']) {
                clicks = data['32768'];
            }

            if (clickLookup[clicks]) {
                return {click: clickLookup[clicks]};
            }
        },
    },
    generic_illuminance: {
        cid: 'msIlluminanceMeasurement',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            return {illuminance: msg.data.data['measuredValue']};
        },
    },
    xiaomi_pressure: {
        cid: 'msPressureMeasurement',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const pressure = parseFloat(msg.data.data['measuredValue']);
            return {pressure: precisionRoundOptions(pressure, options, 'pressure')};
        },
    },
    WXKG02LM_click: {
        cid: 'genOnOff',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const ep = msg.endpoints[0];
            return {click: getKey(model.ep(ep.device), ep.epId)};
        },
    },
    WXKG02LM_click_multistate: {
        cid: 'genMultistateInput',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const ep = msg.endpoints[0];
            const button = getKey(model.ep(ep.device), ep.epId);
            const value = msg.data.data['presentValue'];

            const actionLookup = {
                0: 'long',
                1: null,
                2: 'double',
            };

            const action = actionLookup[value];

            if (button) {
                return {click: button + (action ? `_${action}` : '')};
            }
        },
    },
    WXKG03LM_click: {
        cid: 'genOnOff',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            return {click: 'single'};
        },
    },
    SJCGQ11LM_water_leak_iaszone: {
        cid: 'ssIasZone',
        type: 'statusChange',
        convert: (model, msg, publish, options) => {
            return {water_leak: msg.data.zoneStatus === 1};
        },
    },
    generic_state: {
        cid: 'genOnOff',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            return {state: msg.data.data['onOff'] === 1 ? 'ON' : 'OFF'};
        },
    },
    generic_state_change: {
        cid: 'genOnOff',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            return {state: msg.data.data['onOff'] === 1 ? 'ON' : 'OFF'};
        },
    },
    xiaomi_power: {
        cid: 'genAnalogInput',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            return {power: precisionRound(msg.data.data['presentValue'], 2)};
        },
    },
    xiaomi_plug_state: {
        cid: 'genBasic',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            if (msg.data.data['65281']) {
                const data = msg.data.data['65281'];
                return {
                    state: data['100'] === 1 ? 'ON' : 'OFF',
                    power: precisionRound(data['152'], 2),
                    voltage: precisionRound(data['150'] * 0.1, 1),
                    consumption: precisionRound(data['149'], 2),
                    temperature: precisionRoundOptions(data['3'], options, 'temperature'),
                };
            }
        },
    },
    xiaomi_bulb_interval: {
        cid: 'genBasic',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            if (msg.data.data['65281']) {
                const data = msg.data.data['65281'];
                return {
                    state: data['100'] === 1 ? 'ON' : 'OFF',
                    brightness: data['101'],
                    color_temp: data['102'],
                };
            }
        },
    },
    QBKG11LM_power: {
        cid: 'genBasic',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            if (msg.data.data['65281']) {
                const data = msg.data.data['65281'];
                return {
                    power: precisionRound(data['152'], 2),
                    consumption: precisionRound(data['149'], 2),
                    temperature: precisionRoundOptions(data['3'], options, 'temperature'),
                };
            }
        },
    },
    QBKG12LM_power: {
        cid: 'genBasic',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            if (msg.data.data['65281']) {
                const data = msg.data.data['65281'];
                return {
                    power: precisionRound(data['152'], 2),
                    consumption: precisionRound(data['149'], 2),
                    temperature: precisionRoundOptions(data['3'], options, 'temperature'),
                };
            }
        },
    },
    QBKG04LM_QBKG11LM_state: {
        cid: 'genOnOff',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            if (msg.data.data['61440']) {
                return {state: msg.data.data['onOff'] === 1 ? 'ON' : 'OFF'};
            }
        },
    },
    QBKG03LM_QBKG12LM_state: {
        cid: 'genOnOff',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            if (msg.data.data['61440']) {
                const ep = msg.endpoints[0];
                const key = `state_${getKey(model.ep(ep.device), ep.epId)}`;
                const payload = {};
                payload[key] = msg.data.data['onOff'] === 1 ? 'ON' : 'OFF';
                return payload;
            }
        },
    },
    QBKG03LM_buttons: {
        cid: 'genOnOff',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            const mapping = {4: 'left', 5: 'right'};
            const button = mapping[msg.endpoints[0].epId];
            if (button) {
                const payload = {};
                payload[`button_${button}`] = msg.data.data['onOff'] === 1 ? 'release' : 'hold';
                return payload;
            }
        },
    },
    xiaomi_lock_report: {
        cid: 'genBasic',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            if (msg.data.data['65328']) {
                const data = msg.data.data['65328'];
                const state = data.substr(2, 2);
                const action = data.substr(4, 2);
                const keynum = data.substr(6, 2);
                if (state == 11) {
                    if (action == 1) {
                        // unknown key
                        return {keyerror: true, inserted: 'unknown'};
                    }
                    if (action == 3) {
                        // explicitly disabled key (e.g.: reported lost)
                        return {keyerror: true, inserted: keynum};
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
    ZNCLDJ11LM_curtain_genAnalogOutput_change: {
        cid: 'genAnalogOutput',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            let running = false;

            if (msg.data.data['61440']) {
                running = msg.data.data['61440'] !== 0;
            }

            const position = precisionRound(msg.data.data['presentValue'], 2);
            return {position: position, running: running};
        },
    },
    ZNCLDJ11LM_curtain_genAnalogOutput_report: {
        cid: 'genAnalogOutput',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            let running = false;

            if (msg.data.data['61440']) {
                running = msg.data.data['61440'] !== 0;
            }

            const position = precisionRound(msg.data.data['presentValue'], 2);
            return {position: position, running: running};
        },
    },
    JTYJGD01LMBW_smoke: {
        cid: 'ssIasZone',
        type: 'statusChange',
        convert: (model, msg, publish, options) => {
            return {smoke: msg.data.zoneStatus === 1};
        },
    },
    heiman_smoke: {
        cid: 'ssIasZone',
        type: 'statusChange',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zoneStatus;
            return {
                smoke: (zoneStatus & 1) > 0, // Bit 1 = Alarm: Smoke
                battery_low: (zoneStatus & 1<<3) > 0, // Bit 4 = Battery LOW indicator
            };
        },
    },
    heiman_water_leak: {
        cid: 'ssIasZone',
        type: 'statusChange',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zoneStatus;
            return {
                water_leak: (zoneStatus & 1) > 0, // Bit 1 = Alarm: Water leak
                tamper: (zoneStatus & 1<<2) > 0, // Bit 3 = Tamper status
                battery_low: (zoneStatus & 1<<3) > 0, // Bit 4 = Battery LOW indicator
            };
        },
    },
    heiman_contact: {
        cid: 'ssIasZone',
        type: 'statusChange',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zoneStatus;
            return {
                contact: (zoneStatus & 1) > 0, // Bit 1 = Alarm: Contact detection
                tamper: (zoneStatus & 1<<2) > 0, // Bit 3 = Tamper status
                battery_low: (zoneStatus & 1<<3) > 0, // Bit 4 = Battery LOW indicator
            };
        },
    },
    JTQJBF01LMBW_gas: {
        cid: 'ssIasZone',
        type: 'statusChange',
        convert: (model, msg, publish, options) => {
            return {gas: msg.data.zoneStatus === 1};
        },
    },
    JTQJBF01LMBW_gas_density: {
        cid: 'genBasic',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const data = msg.data.data;
            if (data && data['65281']) {
                const basicAttrs = data['65281'];
                if (basicAttrs.hasOwnProperty('100')) {
                    return {density: basicAttrs['100']};
                }
            }
        },
    },
    JTQJBF01LMBW_sensitivity: {
        cid: 'ssIasZone',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            const data = msg.data.data;
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
        cid: 'closuresDoorLock',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const result = {};
            const vibrationLookup = {
                1: 'vibration',
                2: 'tilt',
                3: 'drop',
            };

            if (msg.data.data['85']) {
                const data = msg.data.data['85'];
                result.action = vibrationLookup[data];
            }
            if (msg.data.data['1283']) {
                const data = msg.data.data['1283'];
                result.angle = data;
            }

            if (msg.data.data['1288']) {
                const data = msg.data.data['1288'];

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
    EDP_power: {
        cid: 'seMetering',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            return {power: precisionRound(msg.data.data['instantaneousDemand'], 2)};
        },
    },
    CC2530ROUTER_state: {
        cid: 'genOnOff',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            return {state: msg.data.data['onOff'] === 1};
        },
    },
    CC2530ROUTER_meta: {
        cid: 'genBinaryValue',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const data = msg.data.data;
            return {
                description: data['description'],
                type: data['inactiveText'],
                rssi: data['presentValue'],
            };
        },
    },
    DNCKAT_S00X_state: {
        cid: 'genOnOff',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const ep = msg.endpoints[0];
            const key = `state_${getKey(model.ep(ep.device), ep.epId)}`;
            const payload = {};
            payload[key] = msg.data.data['onOff'] === 1 ? 'ON' : 'OFF';
            return payload;
        },
    },
    DNCKAT_S00X_buttons: {
        cid: 'genOnOff',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            const ep = msg.endpoints[0];
            const key = `button_${getKey(model.ep(ep.device), ep.epId)}`;
            const payload = {};
            payload[key] = msg.data.data['onOff'] === 1 ? 'release' : 'hold';
            return payload;
        },
    },
    Z809A_power: {
        cid: 'haElectricalMeasurement',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            return {
                power: msg.data.data['activePower'],
                current: msg.data.data['rmsCurrent'],
                voltage: msg.data.data['rmsVoltage'],
                power_factor: msg.data.data['powerFactor'],
            };
        },
    },
    SP120_power: {
        cid: 'haElectricalMeasurement',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const result = {};

            if (msg.data.data.hasOwnProperty('activePower')) {
                result.power = msg.data.data['activePower'];
            }

            if (msg.data.data.hasOwnProperty('rmsCurrent')) {
                result.current = msg.data.data['rmsCurrent'] / 1000;
            }

            if (msg.data.data.hasOwnProperty('rmsVoltage')) {
                result.voltage = msg.data.data['rmsVoltage'];
            }

            return result;
        },
    },
    STS_PRS_251_presence: {
        cid: 'genBinaryInput',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const useOptionsTimeout = options && options.hasOwnProperty('presence_timeout');
            const timeout = useOptionsTimeout ? options.presence_timeout : 100; // 100 seconds by default
            const deviceID = msg.endpoints[0].device.ieeeAddr;

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
    generic_batteryvoltage_3000_2500: {
        cid: 'genPowerCfg',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const battery = {max: 3000, min: 2500};
            const voltage = msg.data.data['batteryVoltage'] * 100;
            return {
                battery: toPercentage(voltage, battery.min, battery.max),
                voltage: voltage,
            };
        },
    },
    STS_PRS_251_beeping: {
        cid: 'genIdentify',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            return {action: 'beeping'};
        },
    },
    _324131092621_on: {
        cid: 'genOnOff',
        type: 'cmdOn',
        convert: (model, msg, publish, options) => {
            return {action: 'on'};
        },
    },
    _324131092621_off: {
        cid: 'genOnOff',
        type: 'cmdOffWithEffect',
        convert: (model, msg, publish, options) => {
            return {action: 'off'};
        },
    },
    _324131092621_step: {
        cid: 'genLevelCtrl',
        type: 'cmdStep',
        convert: (model, msg, publish, options) => {
            const deviceID = msg.endpoints[0].device.ieeeAddr;
            const direction = msg.data.data.stepmode === 0 ? 'up' : 'down';
            const mode = msg.data.data.stepsize === 30 ? 'press' : 'hold';

            // Initialize store
            if (!store[deviceID]) {
                store[deviceID] = {value: 255, since: null, direction: null};
            }

            if (mode === 'press') {
                const newValue = store[deviceID].value + (direction === 'up' ? 50 : -50);
                store[deviceID].value = numberWithinRange(newValue, 0, 255);
            } else if (mode === 'hold') {
                holdUpdateBrightness324131092621(deviceID);
                store[deviceID].since = Date.now();
                store[deviceID].direction = direction;
            }

            return {action: `${direction}-${mode}`, brightness: store[deviceID].value};
        },
    },
    _324131092621_stop: {
        cid: 'genLevelCtrl',
        type: 'cmdStop',
        convert: (model, msg, publish, options) => {
            const deviceID = msg.endpoints[0].device.ieeeAddr;

            if (store[deviceID]) {
                holdUpdateBrightness324131092621(deviceID);
                const payload = {
                    brightness: store[deviceID].value,
                    action: `${store[deviceID].direction}-hold-release`,
                };

                store[deviceID].since = null;
                store[deviceID].direction = null;
                return payload;
            }
        },
    },
    generic_battery: {
        cid: 'genPowerCfg',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            if (msg.data.data.hasOwnProperty('batteryPercentageRemaining')) {
                return {battery: msg.data.data['batteryPercentageRemaining']};
            }
        },
    },
    hue_battery: {
        cid: 'genPowerCfg',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            return {battery: precisionRound(msg.data.data['batteryPercentageRemaining'], 2) / 2};
        },
    },
    generic_battery_voltage: {
        cid: 'genPowerCfg',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            return {voltage: msg.data.data['batteryVoltage'] / 100};
        },
    },
    cmd_move: {
        cid: 'genLevelCtrl',
        type: 'cmdMove',
        convert: (model, msg, publish, options) => ictcg1(model, msg, publish, options, 'move'),
    },
    cmd_move_with_onoff: {
        cid: 'genLevelCtrl',
        type: 'cmdMoveWithOnOff',
        convert: (model, msg, publish, options) => ictcg1(model, msg, publish, options, 'move'),
    },
    cmd_stop: {
        cid: 'genLevelCtrl',
        type: 'cmdStop',
        convert: (model, msg, publish, options) => ictcg1(model, msg, publish, options, 'stop'),
    },
    cmd_stop_with_onoff: {
        cid: 'genLevelCtrl',
        type: 'cmdStopWithOnOff',
        convert: (model, msg, publish, options) => ictcg1(model, msg, publish, options, 'stop'),
    },
    cmd_move_to_level_with_onoff: {
        cid: 'genLevelCtrl',
        type: 'cmdMoveToLevelWithOnOff',
        convert: (model, msg, publish, options) => ictcg1(model, msg, publish, options, 'level'),
    },
    iris_3210L_power: {
        cid: 'haElectricalMeasurement',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            return {power: msg.data.data['activePower'] / 10.0};
        },
    },
    iris_3320L_contact: {
        cid: 'ssIasZone',
        type: 'statusChange',
        convert: (model, msg, publish, options) => {
            return {contact: msg.data.zoneStatus === 36};
        },
    },
    nue_power_state: {
        cid: 'genOnOff',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const ep = msg.endpoints[0];
            const button = getKey(model.ep(ep.device), ep.epId);
            if (button) {
                const payload = {};
                payload[`state_${button}`] = msg.data.data['onOff'] === 1 ? 'ON' : 'OFF';
                return payload;
            }
        },
    },
    RZHAC_4256251_power: {
        cid: 'haElectricalMeasurement',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            return {
                power: msg.data.data['activePower'],
                current: msg.data.data['rmsCurrent'],
                voltage: msg.data.data['rmsVoltage'],
            };
        },
    },
    ias_zone_motion_dev_change: {
        cid: 'ssIasZone',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            if (msg.data.data.zoneType === 0x000D) { // type 0x000D = motion sensor
                const zoneStatus = msg.data.data.zoneStatus;
                return {
                    occupancy: (zoneStatus & 1<<1) > 0, // Bit 1 = Alarm 2: Presence Indication
                    tamper: (zoneStatus & 1<<2) > 0, // Bit 2 = Tamper status
                    battery_low: (zoneStatus & 1<<3) > 0, // Bit 3 = Battery LOW indicator (trips around 2.4V)
                };
            }
        },
    },
    ias_zone_motion_status_change: {
        cid: 'ssIasZone',
        type: 'statusChange',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zoneStatus;
            return {
                occupancy: (zoneStatus & 1<<1) > 0, // Bit 1 = Alarm 2: Presence Indication
                tamper: (zoneStatus & 1<<2) > 0, // Bit 2 = Tamper status
                battery_low: (zoneStatus & 1<<3) > 0, // Bit 3 = Battery LOW indicator (trips around 2.4V)
            };
        },
    },
    ias_contact_dev_change: {
        cid: 'ssIasZone',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zoneStatus;
            return {
                contact: !((zoneStatus & 1) > 0),
            };
        },
    },
    ias_contact_status_change: {
        cid: 'ssIasZone',
        type: 'statusChange',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zoneStatus;
            return {
                contact: !((zoneStatus & 1) > 0),
            };
        },
    },
    light_brightness_report: {
        cid: 'genLevelCtrl',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            return {
                brightness: msg.data.data['currentLevel'],
            };
        },
    },
    smartsense_multi: {
        cid: 'ssIasZone',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.data.zoneStatus;
            return {
                contact: !(zoneStatus & 1), // Bit 1 = Contact
                // Bit 5 = Currently always set?
            };
        },
    },
    thermostat_dev_change: {
        cid: 'hvacThermostat',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            const result = {};
            if (typeof msg.data.data['localTemp'] == 'number') {
                result.local_temperature = precisionRound(msg.data.data['localTemp'], 2) / 100;
            }
            if (typeof msg.data.data['localTemperatureCalibration'] == 'number') {
                result.local_temperature_calibration =
                    precisionRound(msg.data.data['localTemperatureCalibration'], 2) / 10;
            }
            if (typeof msg.data.data['occupancy'] == 'number') {
                result.occupancy = msg.data.data['occupancy'];
            }
            if (typeof msg.data.data['occupiedHeatingSetpoint'] == 'number') {
                result.occupied_heating_setpoint =
                    precisionRound(msg.data.data['occupiedHeatingSetpoint'], 2) / 100;
            }
            if (typeof msg.data.data['unoccupiedHeatingSetpoint'] == 'number') {
                result.unoccupied_heating_setpoint =
                    precisionRound(msg.data.data['unoccupiedHeatingSetpoint'], 2) / 100;
            }
            if (typeof msg.data.data['weeklySchedule'] == 'number') {
                result.weekly_schedule = msg.data.data['weeklySchedule'];
            }
            if (typeof msg.data.data['setpointChangeAmount'] == 'number') {
                result.setpoint_change_amount = msg.data.data['setpointChangeAmount'] / 100;
            }
            if (typeof msg.data.data['setpointChangeSource'] == 'number') {
                result.setpoint_change_source = msg.data.data['setpointChangeSource'];
            }
            if (typeof msg.data.data['setpointChangeSourceTimeStamp'] == 'number') {
                result.setpoint_change_source_timestamp = msg.data.data['setpointChangeSourceTimeStamp'];
            }
            if (typeof msg.data.data['remoteSensing'] == 'number') {
                result.remote_sensing = msg.data.data['remoteSensing'];
            }
            const ctrl = msg.data.data['ctrlSeqeOfOper'];
            if (typeof ctrl == 'number' && common.thermostat_control_sequence_of_operations.hasOwnProperty(ctrl)) {
                result.control_sequence_of_operation = common.thermostat_control_sequence_of_operations[ctrl];
            }
            const mode = msg.data.data['systemMode'];
            if (typeof mode == 'number' && common.thermostat_system_modes.hasOwnProperty(mode)) {
                result.system_mode = common.thermostat_system_modes[mode];
            }
            const state = msg.data.data['runningState'];
            if (typeof state == 'number' && common.thermostat_running_modes.hasOwnProperty(state)) {
                result.running_state = common.thermostat_running_modes[state];
            }
            return result;
        },
    },
    thermostat_att_report: {
        cid: 'hvacThermostat',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const result = {};
            if (typeof msg.data.data['localTemp'] == 'number') {
                result.local_temperature = precisionRound(msg.data.data['localTemp'], 2) / 100;
            }
            if (typeof msg.data.data['localTemperatureCalibration'] == 'number') {
                result.local_temperature_calibration =
                    precisionRound(msg.data.data['localTemperatureCalibration'], 2) / 10;
            }
            if (typeof msg.data.data['occupancy'] == 'number') {
                result.occupancy = msg.data.data['occupancy'];
            }
            if (typeof msg.data.data['occupiedHeatingSetpoint'] == 'number') {
                result.occupied_heating_setpoint =
                    precisionRound(msg.data.data['occupiedHeatingSetpoint'], 2) / 100;
            }
            if (typeof msg.data.data['unoccupiedHeatingSetpoint'] == 'number') {
                result.unoccupied_heating_setpoint =
                    precisionRound(msg.data.data['unoccupiedHeatingSetpoint'], 2) / 100;
            }
            if (typeof msg.data.data['weeklySchedule'] == 'number') {
                result.weekly_schedule = msg.data.data['weeklySchedule'];
            }
            if (typeof msg.data.data['setpointChangeAmount'] == 'number') {
                result.setpoint_change_amount = msg.data.data['setpointChangeAmount'] / 100;
            }
            if (typeof msg.data.data['setpointChangeSource'] == 'number') {
                result.setpoint_change_source = msg.data.data['setpointChangeSource'];
            }
            if (typeof msg.data.data['setpointChangeSourceTimeStamp'] == 'number') {
                result.setpoint_change_source_timestamp = msg.data.data['setpointChangeSourceTimeStamp'];
            }
            if (typeof msg.data.data['remoteSensing'] == 'number') {
                result.remote_sensing = msg.data.data['remoteSensing'];
            }
            const ctrl = msg.data.data['ctrlSeqeOfOper'];
            if (typeof ctrl == 'number' && common.thermostat_control_sequence_of_operations.hasOwnProperty(ctrl)) {
                result.control_sequence_of_operation = common.thermostat_control_sequence_of_operations[ctrl];
            }
            const mode = msg.data.data['systemMode'];
            if (typeof mode == 'number' && common.thermostat_system_modes.hasOwnProperty(mode)) {
                result.system_mode = common.thermostat_system_modes[mode];
            }
            const state = msg.data.data['runningState'];
            if (typeof state == 'number' && common.thermostat_running_modes.hasOwnProperty(state)) {
                result.running_state = common.thermostat_running_modes[state];
            }
            return result;
        },
    },
    E1524_toggle: {
        cid: 'genOnOff',
        type: 'cmdToggle',
        convert: (model, msg, publish, options) => {
            return {action: 'toggle'};
        },
    },
    E1524_arrow_click: {
        cid: 'genScenes',
        type: 'cmdTradfriArrowSingle',
        convert: (model, msg, publish, options) => {
            const direction = msg.data.data.value === 257 ? 'left' : 'right';
            return {action: `arrow_${direction}_click`};
        },
    },
    E1524_arrow_hold: {
        cid: 'genScenes',
        type: 'cmdTradfriArrowHold',
        convert: (model, msg, publish, options) => {
            const direction = msg.data.data.value === 3329 ? 'left' : 'right';
            store[msg.endpoints[0].device.ieeeAddr] = direction;
            return {action: `arrow_${direction}_hold`};
        },
    },
    E1524_arrow_release: {
        cid: 'genScenes',
        type: 'cmdTradfriArrowRelease',
        convert: (model, msg, publish, options) => {
            const direction = store[msg.endpoints[0].device.ieeeAddr];
            if (direction) {
                delete store[msg.endpoints[0].device.ieeeAddr];
                return {action: `arrow_${direction}_release`, duration: msg.data.data.value / 1000};
            }
        },
    },
    E1524_brightness_up_click: {
        cid: 'genLevelCtrl',
        type: 'cmdStepWithOnOff',
        convert: (model, msg, publish, options) => {
            return {action: `brightness_up_click`};
        },
    },
    E1524_brightness_down_click: {
        cid: 'genLevelCtrl',
        type: 'cmdStep',
        convert: (model, msg, publish, options) => {
            return {action: `brightness_down_click`};
        },
    },
    E1524_brightness_up_hold: {
        cid: 'genLevelCtrl',
        type: 'cmdMoveWithOnOff',
        convert: (model, msg, publish, options) => {
            return {action: `brightness_up_hold`};
        },
    },
    E1524_brightness_up_release: {
        cid: 'genLevelCtrl',
        type: 'cmdStopWithOnOff',
        convert: (model, msg, publish, options) => {
            return {action: `brightness_up_release`};
        },
    },
    E1524_brightness_down_hold: {
        cid: 'genLevelCtrl',
        type: 'cmdMove',
        convert: (model, msg, publish, options) => {
            return {action: `brightness_down_hold`};
        },
    },
    E1524_brightness_down_release: {
        cid: 'genLevelCtrl',
        type: 'cmdStop',
        convert: (model, msg, publish, options) => {
            return {action: `brightness_down_release`};
        },
    },

    // Ignore converters (these message dont need parsing).
    ignore_doorlock_change: {
        cid: 'closuresDoorLock',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_onoff_change: {
        cid: 'genOnOff',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_basic_change: {
        cid: 'genBasic',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_basic_report: {
        cid: 'genBasic',
        type: 'attReport',
        convert: (model, msg, publish, options) => null,
    },
    ignore_illuminance_change: {
        cid: 'msIlluminanceMeasurement',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_occupancy_change: {
        cid: 'msOccupancySensing',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_temperature_change: {
        cid: 'msTemperatureMeasurement',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_humidity_change: {
        cid: 'msRelativeHumidity',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_pressure_change: {
        cid: 'msPressureMeasurement',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_analog_change: {
        cid: 'genAnalogInput',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_analog_report: {
        cid: 'genAnalogInput',
        type: 'attReport',
        convert: (model, msg, publish, options) => null,
    },
    ignore_multistate_report: {
        cid: 'genMultistateInput',
        type: 'attReport',
        convert: (model, msg, publish, options) => null,
    },
    ignore_multistate_change: {
        cid: 'genMultistateInput',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_power_change: {
        cid: 'genPowerCfg',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_metering_change: {
        cid: 'seMetering',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_electrical_change: {
        cid: 'haElectricalMeasurement',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_light_brightness_report: {
        cid: 'genLevelCtrl',
        type: 'attReport',
        convert: (model, msg, publish, options) => null,
    },
    ignore_light_color_colortemp_report: {
        cid: 'lightingColorCtrl',
        type: 'attReport',
        convert: (model, msg, publish, options) => null,
    },
    ignore_closuresWindowCovering_change: {
        cid: 'closuresWindowCovering',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_closuresWindowCovering_report: {
        cid: 'closuresWindowCovering',
        type: 'attReport',
        convert: (model, msg, publish, options) => null,
    },
};

module.exports = converters;
