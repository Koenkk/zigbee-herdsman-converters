'use strict';

const debounce = require('debounce');
const common = require('./common');

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
    const payload = {};

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
        const direction = msg.data.data.movemode === 1 ? 'left' : 'right';
        s.direction = direction;
        payload.action = `rotate_${direction}`;
    } else if (action === 'stop' || action === 'level') {
        if (action === 'level') {
            s.value = msg.data.data.level;
            const direction = s.value === 0 ? 'left' : 'right';
            payload.action = `rotate_${direction}_quick`;
        } else {
            payload.action = 'rotate_stop';
        }

        s.since = false;
        s.direction = false;
    }

    payload.brightness = s.value;
    s.publish(payload);
};

const holdUpdateBrightness324131092621 = (deviceID) => {
    if (store[deviceID] && store[deviceID].brightnessSince && store[deviceID].brightnessDirection) {
        const duration = Date.now() - store[deviceID].brightnessSince;
        const delta = (duration / 10) * (store[deviceID].brightnessDirection === 'up' ? 1 : -1);
        const newValue = store[deviceID].brightnessValue + delta;
        store[deviceID].brightnessValue = numberWithinRange(newValue, 0, 255);
    }
};


const converters = {
    HS2SK_power: {
        cid: 'haElectricalMeasurement',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            return {
                power: msg.data.data['activePower'] / 10,
                current: msg.data.data['rmsCurrent'] / 100,
                voltage: msg.data.data['rmsVoltage'] / 100,
            };
        },
    },
    generic_lock: {
        cid: 'closuresDoorLock',
        type: ['attReport', 'readRsp', 'devChange'],
        convert: (model, msg, publish, options) => {
            return {state: msg.data.data.lockState === 2 ? 'UNLOCK' : 'LOCK'};
        },
    },
    YMF40_lockstatus: {
        cid: 'closuresDoorLock',
        type: 'cmdOperationEventNotification',
        convert: (model, msg, publish, options) => {
            return {
                state: msg.data.data['opereventcode'] == 2 ? 'UNLOCK' : 'LOCK',
                user: msg.data.data['userid'],
                source: msg.data.data['opereventsrc'],
            };
        },
    },
    genOnOff_cmdOn: {
        cid: 'genOnOff',
        type: 'cmdOn',
        convert: (model, msg, publish, options) => {
            return {click: 'on'};
        },
    },
    genOnOff_cmdOff: {
        cid: 'genOnOff',
        type: 'cmdOff',
        convert: (model, msg, publish, options) => {
            return {click: 'off'};
        },
    },
    E1743_brightness_up: {
        cid: 'genLevelCtrl',
        type: 'cmdMove',
        convert: (model, msg, publish, options) => {
            return {click: 'brightness_down'};
        },
    },
    E1743_brightness_down: {
        cid: 'genLevelCtrl',
        type: 'cmdMoveWithOnOff',
        convert: (model, msg, publish, options) => {
            return {click: 'brightness_up'};
        },
    },
    E1743_brightness_stop: {
        cid: 'genLevelCtrl',
        type: 'cmdStopWithOnOff',
        convert: (model, msg, publish, options) => {
            return {click: 'brightness_stop'};
        },
    },
    AC0251100NJ_long_middle: {
        cid: 'lightingColorCtrl',
        type: 'cmdMoveHue',
        convert: (model, msg, publish, options) => {
            return {click: 'long_middle'};
        },
    },
    AV2010_34_click: {
        cid: 'genScenes',
        type: 'cmdRecall',
        convert: (model, msg, publish, options) => {
            return {click: msg.data.data.groupid};
        },
    },
    bitron_power: {
        cid: 'seMetering',
        type: ['attReport', 'readRsp'],
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
    bitron_battery_att_report: {
        cid: 'genPowerCfg',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const result = {};
            if (typeof msg.data.data['batteryVoltage'] == 'number') {
                const battery = {max: 3200, min: 2500};
                const voltage = msg.data.data['batteryVoltage'] * 100;
                result.battery = toPercentage(voltage, battery.min, battery.max);
                result.voltage = voltage;
            }
            if (typeof msg.data.data['batteryAlarmState'] == 'number') {
                result.battery_alarm_state = msg.data.data['batteryAlarmState'];
            }
            return result;
        },
    },
    bitron_battery_dev_change: {
        cid: 'genPowerCfg',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            const result = {};
            if (typeof msg.data.data['batteryVoltage'] == 'number') {
                const battery = {max: 3200, min: 2500};
                const voltage = msg.data.data['batteryVoltage'] * 100;
                result.battery = toPercentage(voltage, battery.min, battery.max);
                result.voltage = voltage;
            }
            if (typeof msg.data.data['batteryAlarmState'] == 'number') {
                result.battery_alarm_state = msg.data.data['batteryAlarmState'];
            }
            return result;
        },
    },
    bitron_thermostat_att_report: {
        cid: 'hvacThermostat',
        type: ['attReport', 'readRsp'],
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
    nue_click: {
        cid: 'genScenes',
        type: 'cmdRecall',
        convert: (model, msg, publish, options) => {
            return {click: msg.data.data.sceneid};
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
        type: ['attReport', 'readRsp'],
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
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            if (msg.data.data['65281']) {
                return {illuminance: msg.data.data['65281']['11']};
            }
        },
    },
    WSDCGQ01LM_WSDCGQ11LM_interval: {
        cid: 'genBasic',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            if (msg.data.data['65281']) {
                const temperature = parseFloat(msg.data.data['65281']['100']) / 100.0;
                const humidity = parseFloat(msg.data.data['65281']['101']) / 100.0;
                const result = {};

                // https://github.com/Koenkk/zigbee2mqtt/issues/798
                // Sometimes the sensor publishes non-realistic vales, as the sensor only works from
                // -20 till +60, don't produce messages beyond these values.
                if (temperature > -25 && temperature < 65) {
                    result.temperature = precisionRoundOptions(temperature, options, 'temperature');
                }

                // in the 0 - 100 range, don't produce messages beyond these values.
                if (humidity >= 0 && humidity <= 100) {
                    result.humidity = precisionRoundOptions(humidity, options, 'humidity');
                }

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
        type: ['attReport', 'readRsp'],
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
                }, options.long_timeout || 1000); // After 1000 milliseconds of not releasing we assume long click.
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
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            const temperature = parseFloat(msg.data.data['measuredValue']) / 100.0;
            return {temperature: precisionRoundOptions(temperature, options, 'temperature')};
        },
    },
    generic_temperature_change: {
        cid: 'msTemperatureMeasurement',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            const temperature = parseFloat(msg.data.data['measuredValue']) / 100.0;
            return {temperature: precisionRoundOptions(temperature, options, 'temperature')};
        },
    },
    xiaomi_temperature: {
        cid: 'msTemperatureMeasurement',
        type: ['attReport', 'readRsp'],
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
        type: ['attReport', 'readRsp'],
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
        type: ['attReport', 'readRsp'],
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
        type: ['attReport', 'readRsp'],
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
        type: ['attReport', 'readRsp'],
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
        type: ['attReport', 'readRsp'],
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
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            if (msg.data.data.occupancy === 0) {
                return {occupancy: false};
            } else if (msg.data.data.occupancy === 1) {
                return {occupancy: true};
            }
        },
    },
    E1525_occupancy: {
        cid: 'genOnOff',
        type: 'cmdOnWithTimedOff',
        convert: (model, msg, publish, options) => {
            const timeout = msg.data.data.ontime / 10;
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
    generic_occupancy_no_off_msg: {
        // This is for occupancy sensor that only send a message when motion detected,
        // but do not send a motion stop.
        // Therefore we need to publish the no_motion detected by ourselves.
        cid: 'msOccupancySensing',
        type: ['attReport', 'readRsp'],
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
    xiaomi_contact: {
        cid: 'genOnOff',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            return {contact: msg.data.data['onOff'] === 0};
        },
    },
    xiaomi_contact_interval: {
        cid: 'genBasic',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            if (msg.data.data.hasOwnProperty('65281')) {
                return {contact: msg.data.data['65281']['100'] === 0};
            }
        },
    },
    brightness: {
        cid: 'genLevelCtrl',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            if (msg.data.data.hasOwnProperty('currentLevel')) {
                return {brightness: msg.data.data['currentLevel']};
            }
        },
    },
    color_colortemp: {
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

            if (
                msg.data.data['currentX']
                || msg.data.data['currentY']
                || msg.data.data['currentSaturation']
                || msg.data.data['enhancedCurrentHue']
            ) {
                result.color = {};

                if (msg.data.data['currentX']) {
                    result.color.x = precisionRound(msg.data.data['currentX'] / 65535, 3);
                }

                if (msg.data.data['currentY']) {
                    result.color.y = precisionRound(msg.data.data['currentY'] / 65535, 3);
                }

                if (msg.data.data['currentSaturation']) {
                    result.color.saturation = precisionRound(msg.data.data['currentSaturation'] / 2.54, 1);
                }

                if (msg.data.data['enhancedCurrentHue']) {
                    result.color.hue = precisionRound(msg.data.data['enhancedCurrentHue'] / (65535 / 360), 1);
                }
            }

            return result;
        },
    },
    color_colortemp_report: {
        cid: 'lightingColorCtrl',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            const result = {};

            if (msg.data.data['colorTemperature']) {
                result.color_temp = msg.data.data['colorTemperature'];
            }

            if (msg.data.data['colorMode']) {
                result.color_mode = msg.data.data['colorMode'];
            }

            if (
                msg.data.data['currentX']
                || msg.data.data['currentY']
                || msg.data.data['currentSaturation']
                || msg.data.data['enhancedCurrentHue']
            ) {
                result.color = {};

                if (msg.data.data['currentX']) {
                    result.color.x = precisionRound(msg.data.data['currentX'] / 65535, 3);
                }

                if (msg.data.data['currentY']) {
                    result.color.y = precisionRound(msg.data.data['currentY'] / 65535, 3);
                }

                if (msg.data.data['currentSaturation']) {
                    result.color.saturation = precisionRound(msg.data.data['currentSaturation'] / 2.54, 1);
                }

                if (msg.data.data['enhancedCurrentHue']) {
                    result.color.hue = precisionRound(msg.data.data['enhancedCurrentHue'] / (65535 / 360), 1);
                }
            }

            return result;
        },
    },
    WXKG11LM_click: {
        cid: 'genOnOff',
        type: ['attReport', 'readRsp'],
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
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            return {illuminance: msg.data.data['measuredValue']};
        },
    },
    generic_pressure: {
        cid: 'msPressureMeasurement',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            const pressure = parseFloat(msg.data.data['measuredValue']);
            return {pressure: precisionRoundOptions(pressure, options, 'pressure')};
        },
    },
    WXKG02LM_click: {
        cid: 'genOnOff',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            const ep = msg.endpoints[0];
            return {click: getKey(model.ep(ep.device), ep.epId)};
        },
    },
    WXKG02LM_click_multistate: {
        cid: 'genMultistateInput',
        type: ['attReport', 'readRsp'],
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
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            return {click: 'single'};
        },
    },
    KEF1PA_arm: {
        cid: 'ssIasAce',
        type: 'cmdArm',
        convert: (model, msg, publish, options) => {
            const action = msg.data.data['armmode'];
            delete msg.data.data['armmode'];
            const modeLookup = {
                0: 'home',
                2: 'sleep',
                3: 'away',
            };
            return {action: modeLookup[action]};
        },
    },
    KEF1PA_panic: {
        cid: 'ssIasAce',
        type: 'cmdPanic',
        convert: (model, msg, publish, options) => {
            delete msg.data.data['armmode'];
            return {action: 'panic'};
        },
    },
    SJCGQ11LM_water_leak_iaszone: {
        cid: 'ssIasZone',
        type: 'statusChange',
        convert: (model, msg, publish, options) => {
            return {water_leak: msg.data.zoneStatus === 1};
        },
    },
    state: {
        cid: 'genOnOff',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            if (msg.data.data.hasOwnProperty('onOff')) {
                return {state: msg.data.data['onOff'] === 1 ? 'ON' : 'OFF'};
            }
        },
    },
    state_report: {
        cid: 'genOnOff',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            if (msg.data.data.hasOwnProperty('onOff')) {
                return {state: msg.data.data['onOff'] === 1 ? 'ON' : 'OFF'};
            }
        },
    },
    state_change: {
        cid: 'genOnOff',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            if (msg.data.data.hasOwnProperty('onOff')) {
                return {state: msg.data.data['onOff'] === 1 ? 'ON' : 'OFF'};
            }
        },
    },
    xiaomi_power: {
        cid: 'genAnalogInput',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            return {power: precisionRound(msg.data.data['presentValue'], 2)};
        },
    },
    xiaomi_plug_state: {
        cid: 'genBasic',
        type: ['attReport', 'readRsp'],
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
        type: ['attReport', 'readRsp'],
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
        type: ['attReport', 'readRsp'],
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
    QBKG12LM_LLKZMK11LM_power: {
        cid: 'genBasic',
        type: ['attReport', 'readRsp'],
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
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            if (msg.data.data['61440']) {
                return {state: msg.data.data['onOff'] === 1 ? 'ON' : 'OFF'};
            } else {
                return {click: 'single'};
            }
        },
    },
    QBKG04LM_QBKG11LM_operation_mode: {
        cid: 'genBasic',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            const mappingMode = {
                0x12: 'control_relay',
                0xFE: 'decoupled',
            };
            const key = '65314';
            if (msg.data.data.hasOwnProperty(key)) {
                const mode = mappingMode[msg.data.data[key]];
                return {operation_mode: mode};
            }
        },
    },
    QBKG03LM_QBKG12LM_LLKZMK11LM_state: {
        cid: 'genOnOff',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            if (msg.data.data['61440']) {
                const ep = msg.endpoints[0];
                const key = `state_${getKey(model.ep(ep.device), ep.epId)}`;
                const payload = {};
                payload[key] = msg.data.data['onOff'] === 1 ? 'ON' : 'OFF';
                return payload;
            } else {
                const mapping = {4: 'left', 5: 'right', 6: 'both'};
                const button = mapping[msg.endpoints[0].epId];
                return {click: button};
            }
        },
    },
    QBKG11LM_click: {
        cid: 'genMultistateInput',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            if ([1, 2].includes(msg.data.data.presentValue)) {
                const times = {1: 'single', 2: 'double'};
                return {click: times[msg.data.data.presentValue]};
            }
        },
    },
    QBKG12LM_click: {
        cid: 'genMultistateInput',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            if ([1, 2].includes(msg.data.data.presentValue)) {
                const mapping = {5: 'left', 6: 'right', 7: 'both'};
                const times = {1: 'single', 2: 'double'};
                const button = mapping[msg.endpoints[0].epId];
                return {click: `${button}_${times[msg.data.data.presentValue]}`};
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
    QBKG03LM_QBKG12LM_operation_mode: {
        cid: 'genBasic',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            const mappingButton = {
                '65314': 'left',
                '65315': 'right',
            };
            const mappingMode = {
                0x12: 'control_left_relay',
                0x22: 'control_right_relay',
                0xFE: 'decoupled',
            };
            for (const key in mappingButton) {
                if (msg.data.data.hasOwnProperty(key)) {
                    const payload = {};
                    const mode = mappingMode[msg.data.data[key]];
                    payload[`operation_mode_${mappingButton[key]}`] = mode;
                    return payload;
                }
            }
        },
    },
    xiaomi_lock_report: {
        cid: 'genBasic',
        type: ['attReport', 'readRsp'],
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
        type: ['attReport', 'readRsp'],
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
    heiman_pir: {
        cid: 'ssIasZone',
        type: 'statusChange',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zoneStatus;
            return {
                occupancy: (zoneStatus & 1) > 0, // Bit 1 = Alarm: Motion detection
                tamper: (zoneStatus & 1<<2) > 0, // Bit 3 = Tamper status
                battery_low: (zoneStatus & 1<<3) > 0, // Bit 4 = Battery LOW indicator
            };
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
    heiman_smart_controller_armmode: {
        cid: 'ssIasAce',
        type: 'cmdArm',
        convert: (model, msg, publish, options) => {
            if (msg.data.data.armmode != null) {
                const lookup = {
                    0: 'disarm',
                    1: 'arm_partial_zones',
                    3: 'arm_all_zones',
                };

                const value = msg.data.data.armmode;
                return {action: lookup[value] || `armmode_${value}`};
            }
        },
    },
    heiman_smart_controller_emergency: {
        cid: 'ssIasAce',
        type: 'cmdEmergency',
        convert: (model, msg, publish, options) => {
            return {action: 'emergency'};
        },
    },
    battery_200: {
        cid: 'genPowerCfg',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            const batt = msg.data.data.batteryPercentageRemaining;
            const battLow = msg.data.data.batteryAlarmState;
            const results = {};
            if (batt != null) {
                const value = Math.round(batt/200.0*10000)/100; // Out of 200
                results['battery'] = value;
            }
            if (battLow != null) {
                if (battLow) {
                    results['battery_low'] = true;
                } else {
                    results['battery_low'] = false;
                }
            }
            return results;
        },
    },
    heiman_smoke_enrolled: {
        cid: 'ssIasZone',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            const zoneId = msg.data.data.zoneId;
            const zoneState = msg.data.data.zoneState;
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
    heiman_gas: {
        cid: 'ssIasZone',
        type: 'statusChange',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zoneStatus;
            return {
                gas: (zoneStatus & 1) > 0, // Bit 1 = Alarm: Gas
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
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            const data = msg.data.data;
            if (data && data['65281']) {
                const basicAttrs = data['65281'];
                if (basicAttrs.hasOwnProperty('100')) {
                    return {gas_density: basicAttrs['100']};
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
        type: ['attReport', 'readRsp'],
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
    generic_power: {
        cid: 'seMetering',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            const result = {};

            if (msg.data.data.hasOwnProperty('instantaneousDemand')) {
                result.power = precisionRound(msg.data.data['instantaneousDemand'], 2);
            }

            if (msg.data.data.hasOwnProperty('currentSummDelivered') ||
                msg.data.data.hasOwnProperty('currentSummReceived')) {
                const endpoint = msg.endpoints[0];
                if (endpoint.clusters.has('seMetering')) {
                    const attrs = endpoint.clusters['seMetering'].attrs;
                    let energyFactor = 1;
                    if (attrs.multiplier && attrs.divisor) {
                        energyFactor = attrs.multiplier / attrs.divisor;
                    }

                    result.energy = 0;
                    if (msg.data.data.hasOwnProperty('currentSummDelivered')) {
                        const data = msg.data.data['currentSummDelivered'];
                        const value = (parseInt(data[0]) << 32) + parseInt(data[1]);
                        result.energy += value * energyFactor;
                    }
                    if (msg.data.data.hasOwnProperty('currentSummReceived')) {
                        const data = msg.data.data['currentSummReceived'];
                        const value = (parseInt(data[0]) << 32) + parseInt(data[1]);
                        result.energy -= value * energyFactor;
                    }
                }
            }

            return result;
        },
    },
    CC2530ROUTER_state: {
        cid: 'genOnOff',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            return {state: true, led_state: msg.data.data['onOff'] === 1};
        },
    },
    CC2530ROUTER_meta: {
        cid: 'genBinaryValue',
        type: ['attReport', 'readRsp'],
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
        type: ['attReport', 'readRsp'],
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
    ZigUP_parse: {
        cid: 'genOnOff',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            const lookup = {
                '0': 'timer',
                '1': 'key',
                '2': 'dig-in',
            };

            return {
                state: msg.data.data['onOff'] === 1 ? 'ON' : 'OFF',
                cpu_temperature: precisionRound(msg.data.data['41361'], 2),
                external_temperature: precisionRound(msg.data.data['41362'], 1),
                external_humidity: precisionRound(msg.data.data['41363'], 1),
                s0_counts: msg.data.data['41364'],
                adc_volt: precisionRound(msg.data.data['41365'], 3),
                dig_input: msg.data.data['41366'],
                reason: lookup[msg.data.data['41367']],
            };
        },
    },
    Z809A_power: {
        cid: 'haElectricalMeasurement',
        type: ['attReport', 'readRsp'],
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
        type: ['attReport', 'readRsp'],
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
        type: ['attReport', 'readRsp'],
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
        type: ['attReport', 'readRsp'],
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
    _324131092621_notification: {
        cid: 'manuSpecificPhilips',
        type: 'cmdHueNotification',
        convert: (model, msg, publish, options) => {
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

            const deviceID = msg.endpoints[0].device.ieeeAddr;
            let button = null;
            switch (msg.data.data['button']) {
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
            switch (msg.data.data['type']) {
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
                        const newValue = store[deviceID].brightnessValue + (button === 'up' ? 50 : -50);
                        store[deviceID].brightnessValue = numberWithinRange(newValue, 0, 255);
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
    generic_battery: {
        cid: 'genPowerCfg',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            if (msg.data.data.hasOwnProperty('batteryPercentageRemaining')) {
                return {battery: msg.data.data['batteryPercentageRemaining']};
            }
        },
    },
    generic_battery_change: {
        cid: 'genPowerCfg',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            if (msg.data.data.hasOwnProperty('batteryPercentageRemaining')) {
                return {battery: msg.data.data['batteryPercentageRemaining']};
            }
        },
    },
    hue_battery: {
        cid: 'genPowerCfg',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            return {battery: precisionRound(msg.data.data['batteryPercentageRemaining'], 2) / 2};
        },
    },
    generic_battery_voltage: {
        cid: 'genPowerCfg',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            return {voltage: msg.data.data['batteryVoltage'] / 100};
        },
    },
    cmd_move: {
        cid: 'genLevelCtrl',
        type: 'cmdMove',
        convert: (model, msg, publish, options) => {
            ictcg1(model, msg, publish, options, 'move');
            const direction = msg.data.data.movemode === 1 ? 'left' : 'right';
            return {action: `rotate_${direction}`, rate: msg.data.data.rate};
        },
    },
    cmd_move_with_onoff: {
        cid: 'genLevelCtrl',
        type: 'cmdMoveWithOnOff',
        convert: (model, msg, publish, options) => {
            ictcg1(model, msg, publish, options, 'move');
            const direction = msg.data.data.movemode === 1 ? 'left' : 'right';
            return {action: `rotate_${direction}`, rate: msg.data.data.rate};
        },
    },
    cmd_stop: {
        cid: 'genLevelCtrl',
        type: 'cmdStop',
        convert: (model, msg, publish, options) => {
            ictcg1(model, msg, publish, options, 'stop');
            return {action: `rotate_stop`};
        },
    },
    cmd_stop_with_onoff: {
        cid: 'genLevelCtrl',
        type: 'cmdStopWithOnOff',
        convert: (model, msg, publish, options) => {
            ictcg1(model, msg, publish, options, 'stop');
            return {action: `rotate_stop`};
        },
    },
    cmd_move_to_level_with_onoff: {
        cid: 'genLevelCtrl',
        type: 'cmdMoveToLevelWithOnOff',
        convert: (model, msg, publish, options) => {
            ictcg1(model, msg, publish, options, 'level');
            const direction = msg.data.data.level === 0 ? 'left' : 'right';
            return {action: `rotate_${direction}_quick`, level: msg.data.data.level};
        },
    },
    iris_3210L_power: {
        cid: 'haElectricalMeasurement',
        type: ['attReport', 'readRsp'],
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
        type: ['attReport', 'readRsp'],
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
    generic_state_multi_ep: {
        cid: 'genOnOff',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            const ep = msg.endpoints[0];
            const key = `state_${getKey(model.ep(ep.device), ep.epId)}`;
            const payload = {};
            payload[key] = msg.data.data['onOff'] === 1 ? 'ON' : 'OFF';
            return payload;
        },
    },
    RZHAC_4256251_power: {
        cid: 'haElectricalMeasurement',
        type: ['attReport', 'readRsp'],
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
    bosch_ias_zone_motion_status_change: {
        cid: 'ssIasZone',
        type: 'statusChange',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zoneStatus;
            return {
                occupancy: (zoneStatus & 1) > 0, // Bit 0 = Alarm 1: Presence Indication
                tamper: (zoneStatus & 1<<2) > 0, // Bit 2 = Tamper status
                battery_low: (zoneStatus & 1<<3) > 0, // Bit 3 = Battery LOW indicator (trips around 2.4V)
            };
        },
    },
    generic_ias_zone_motion_dev_change: {
        cid: 'ssIasZone',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zoneStatus;
            return {
                occupancy: (zoneStatus & 1) > 0, // Bit 0 = Alarm 1: Presence Indication
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
    brightness_report: {
        cid: 'genLevelCtrl',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            if (msg.data.data.hasOwnProperty('currentLevel')) {
                return {brightness: msg.data.data['currentLevel']};
            }
        },
    },
    smartsense_multi: {
        cid: 'ssIasZone',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.data.zoneStatus;
            return {
                contact: !(zoneStatus & 1), // Bit 1 = Contact
                // Bit 5 = Currently always set?
            };
        },
    },
    st_leak: {
        cid: 'ssIasZone',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.data.zoneStatus;
            return {
                water_leak: (zoneStatus & 1) > 0, // Bit 1 = wet
            };
        },
    },
    st_leak_change: {
        cid: 'ssIasZone',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.data.zoneStatus;
            return {
                water_leak: (zoneStatus & 1) > 0, // Bit 1 = wet
            };
        },
    },
    st_contact_status_change: {
        cid: 'ssIasZone',
        type: 'statusChange',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zoneStatus;
            return {
                contact: !((zoneStatus & 1) > 0), // Bit 0 = Alarm: Contact detection
                battery_low: (zoneStatus & 1<<3) > 0, // Bit 3 = Battery LOW indicator
            };
        },
    },
    st_button_state: {
        cid: 'ssIasZone',
        type: 'statusChange',
        convert: (model, msg, publish, options) => {
            const buttonStates = {
                0: 'off',
                1: 'single',
                2: 'double',
                3: 'hold',
            };

            if (msg.data.hasOwnProperty('data')) {
                const zoneStatus = msg.data.data.zoneStatus;
                return {click: buttonStates[zoneStatus]};
            } else {
                const zoneStatus = msg.data.zoneStatus;
                return {click: buttonStates[zoneStatus]};
            }
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
            if (typeof ctrl == 'number' && common.thermostatControlSequenceOfOperations.hasOwnProperty(ctrl)) {
                result.control_sequence_of_operation = common.thermostatControlSequenceOfOperations[ctrl];
            }
            const smode = msg.data.data['systemMode'];
            if (typeof smode == 'number' && common.thermostatSystemModes.hasOwnProperty(smode)) {
                result.system_mode = common.thermostatSystemModes[smode];
            }
            const rmode = msg.data.data['runningMode'];
            if (typeof rmode == 'number' && common.thermostatSystemModes.hasOwnProperty(rmode)) {
                result.running_mode = common.thermostatSystemModes[rmode];
            }
            const state = msg.data.data['runningState'];
            if (typeof state == 'number' && common.thermostatRunningStates.hasOwnProperty(state)) {
                result.running_state = common.thermostatRunningStates[state];
            }
            if (typeof msg.data.data['pIHeatingDemand'] == 'number') {
                result.pi_heating_demand = msg.data.data['pIHeatingDemand'];
            }
            return result;
        },
    },
    thermostat_att_report: {
        cid: 'hvacThermostat',
        type: ['attReport', 'readRsp'],
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
            if (typeof ctrl == 'number' && common.thermostatControlSequenceOfOperations.hasOwnProperty(ctrl)) {
                result.control_sequence_of_operation = common.thermostatControlSequenceOfOperations[ctrl];
            }
            const smode = msg.data.data['systemMode'];
            if (typeof smode == 'number' && common.thermostatSystemModes.hasOwnProperty(smode)) {
                result.system_mode = common.thermostatSystemModes[smode];
            }
            const rmode = msg.data.data['runningMode'];
            if (typeof rmode == 'number' && common.thermostatSystemModes.hasOwnProperty(rmode)) {
                result.running_mode = common.thermostatSystemModes[rmode];
            }
            const state = msg.data.data['runningState'];
            if (typeof state == 'number' && common.thermostatRunningStates.hasOwnProperty(state)) {
                result.running_state = common.thermostatRunningStates[state];
            }
            if (typeof msg.data.data['pIHeatingDemand'] == 'number') {
                result.pi_heating_demand = msg.data.data['pIHeatingDemand'];
            }
            return result;
        },
    },
    eurotronic_thermostat_dev_change: {
        cid: 'hvacThermostat',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            const result = {};
            if (typeof msg.data.data[0x4003] == 'number') {
                result.current_heating_setpoint =
                    precisionRound(msg.data.data[0x4003], 2) / 100;
            }
            if (typeof msg.data.data[0x4008] == 'number') {
                result.eurotronic_system_mode = msg.data.data[0x4008];
            }
            if (typeof msg.data.data[0x4002] == 'number') {
                result.eurotronic_error_status = msg.data.data[0x4002];
            }
            if (typeof msg.data.data[0x4000] == 'number') {
                result.eurotronic_trv_mode = msg.data.data[0x4000];
            }
            if (typeof msg.data.data[0x4001] == 'number') {
                result.eurotronic_valve_position = msg.data.data[0x4001];
            }
            return result;
        },
    },
    tint404011_on: {
        cid: 'genOnOff',
        type: 'cmdOn',
        convert: (model, msg, publish, options) => {
            return {action: 'on'};
        },
    },
    tint404011_off: {
        cid: 'genOnOff',
        type: 'cmdOff',
        convert: (model, msg, publish, options) => {
            return {action: 'off'};
        },
    },
    tint404011_brightness_updown_click: {
        cid: 'genLevelCtrl',
        type: 'cmdStep',
        convert: (model, msg, publish, options) => {
            const direction = msg.data.data.stepmode === 1 ? 'down' : 'up';
            return {
                action: `brightness_${direction}_click`,
                step_size: msg.data.data.stepsize,
                transition_time: msg.data.data.transtime,
            };
        },
    },
    tint404011_brightness_updown_hold: {
        cid: 'genLevelCtrl',
        type: 'cmdMove',
        convert: (model, msg, publish, options) => {
            const deviceID = msg.endpoints[0].device.ieeeAddr;
            const direction = msg.data.data.movemode === 1 ? 'down' : 'up';

            // Save last direction for release event
            if (!store[deviceID]) {
                store[deviceID] = {};
            }
            store[deviceID].movemode = direction;

            return {
                action: `brightness_${direction}_hold`,
                rate: msg.data.data.rate,
            };
        },
    },
    tint404011_brightness_updown_release: {
        cid: 'genLevelCtrl',
        type: 'cmdStop',
        convert: (model, msg, publish, options) => {
            const deviceID = msg.endpoints[0].device.ieeeAddr;
            if (!store[deviceID]) {
                return null;
            }

            const direction = store[deviceID].movemode;
            return {
                action: `brightness_${direction}_release`,
            };
        },
    },
    tint404011_scene: {
        cid: 'genBasic',
        type: 'cmdWrite',
        convert: (model, msg, publish, options) => {
            return {action: `scene${msg.data.data[0].attrData}`};
        },
    },
    tint404011_move_to_color_temp: {
        cid: 'lightingColorCtrl',
        type: 'cmdMoveToColorTemp',
        convert: (model, msg, publish, options) => {
            return {
                action: `color_temp`,
                action_color_temperature: msg.data.data.colortemp,
                transition_time: msg.data.data.transtime,
            };
        },
    },
    tint404011_move_to_color: {
        cid: 'lightingColorCtrl',
        type: 'cmdMoveToColor',
        convert: (model, msg, publish, options) => {
            return {
                action_color: {
                    x: precisionRound(msg.data.data.colorx / 65535, 3),
                    y: precisionRound(msg.data.data.colory / 65535, 3),
                },
                action: 'color_wheel',
                transition_time: msg.data.data.transtime,
            };
        },
    },
    cmdToggle: {
        cid: 'genOnOff',
        type: 'cmdToggle',
        convert: (model, msg, publish, options) => {
            return {action: 'toggle'};
        },
    },
    E1524_hold: {
        cid: 'genLevelCtrl',
        type: 'cmdMoveToLevelWithOnOff',
        convert: (model, msg, publish, options) => {
            return {action: 'toggle_hold'};
        },
    },
    E1524_arrow_click: {
        cid: 'genScenes',
        type: 'cmdTradfriArrowSingle',
        convert: (model, msg, publish, options) => {
            if (msg.data.data.value === 2) {
                // This is send on toggle hold, ignore it as a toggle_hold is already handled above.
                return;
            }

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
    livolo_switch_dev_change: {
        cid: 'genOnOff',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            const status = msg.data.data.onOff;
            const payload = {};
            payload['state_left'] = status & 1 ? 'ON' : 'OFF';
            payload['state_right'] = status & 2 ? 'ON' : 'OFF';
            if (msg.endpoints[0].hasOwnProperty('linkquality')) {
                payload['linkquality'] = msg.endpoints[0].linkquality;
            }
            return payload;
        },
    },
    eria_81825_on: {
        cid: 'genOnOff',
        type: 'cmdOn',
        convert: (model, msg, publish, options) => {
            return {action: 'on'};
        },
    },
    eria_81825_off: {
        cid: 'genOnOff',
        type: 'cmdOff',
        convert: (model, msg, publish, options) => {
            return {action: 'off'};
        },
    },
    eria_81825_updown: {
        cid: 'genLevelCtrl',
        type: 'cmdStep',
        convert: (model, msg, publish, options) => {
            const direction = msg.data.data.stepmode === 0 ? 'up' : 'down';
            return {action: `${direction}`};
        },
    },
    ZYCT202_on: {
        cid: 'genOnOff',
        type: 'cmdOn',
        convert: (model, msg, publish, options) => {
            return {action: 'on', action_group: msg.groupid};
        },
    },
    ZYCT202_off: {
        cid: 'genOnOff',
        type: 'cmdOffWithEffect',
        convert: (model, msg, publish, options) => {
            return {action: 'off', action_group: msg.groupid};
        },
    },
    ZYCT202_stop: {
        cid: 'genLevelCtrl',
        type: 'cmdStop',
        convert: (model, msg, publish, options) => {
            return {action: 'stop', action_group: msg.groupid};
        },
    },
    ZYCT202_up_down: {
        cid: 'genLevelCtrl',
        type: 'cmdMove',
        convert: (model, msg, publish, options) => {
            const value = msg.data.data['movemode'];
            let action = null;
            if (value === 0) action = {'action': 'up-press', 'action_group': msg.groupid};
            else if (value === 1) action = {'action': 'down-press', 'action_group': msg.groupid};
            return action ? action : null;
        },
    },
    cover_position: {
        cid: 'genLevelCtrl',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            const currentLevel = msg.data.data['currentLevel'];
            const position = Math.round(Number(currentLevel) / 2.55).toString();
            const state = position > 0 ? 'OPEN' : 'CLOSE';
            return {state: state, position: position};
        },
    },
    cover_position_report: {
        cid: 'genLevelCtrl',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            const currentLevel = msg.data.data['currentLevel'];
            const position = Math.round(Number(currentLevel) / 2.55).toString();
            const state = position > 0 ? 'OPEN' : 'CLOSE';
            return {state: state, position: position};
        },
    },
    cover_state_report: {
        cid: 'genOnOff',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            if (msg.data.data.hasOwnProperty('onOff')) {
                return {state: msg.data.data['onOff'] === 1 ? 'OPEN' : 'CLOSE'};
            }
        },
    },
    cover_state_change: {
        cid: 'genOnOff',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            if (msg.data.data.hasOwnProperty('onOff')) {
                return {state: msg.data.data['onOff'] === 1 ? 'OPEN' : 'CLOSE'};
            }
        },
    },
    keen_home_smart_vent_pressure: {
        cid: 'msPressureMeasurement',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            // '{"cid":"msPressureMeasurement","data":{"32":990494}}'
            const pressure = parseFloat(msg.data.data['32']) / 1000.0;
            return {pressure: precisionRoundOptions(pressure, options, 'pressure')};
        },
    },
    keen_home_smart_vent_pressure_report: {
        cid: 'msPressureMeasurement',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            // '{"cid":"msPressureMeasurement","data":{"32":990494}}'
            const pressure = parseFloat(msg.data.data['32']) / 1000.0;
            return {pressure: precisionRoundOptions(pressure, options, 'pressure')};
        },
    },
    AC0251100NJ_cmdOn: {
        cid: 'genOnOff',
        type: 'cmdOn',
        convert: (model, msg, publish, options) => {
            return {action: 'up'};
        },
    },
    AC0251100NJ_cmdOff: {
        cid: 'genOnOff',
        type: 'cmdOff',
        convert: (model, msg, publish, options) => {
            return {action: 'down'};
        },
    },
    AC0251100NJ_cmdMoveWithOnOff: {
        cid: 'genLevelCtrl',
        type: 'cmdMoveWithOnOff',
        convert: (model, msg, publish, options) => {
            return {action: 'up_hold'};
        },
    },
    AC0251100NJ_cmdStop: {
        cid: 'genLevelCtrl',
        type: 'cmdStop',
        convert: (model, msg, publish, options) => {
            const map = {
                1: 'up_release',
                2: 'down_release',
            };

            return {action: map[msg.endpoints[0].epId]};
        },
    },
    AC0251100NJ_cmdMove: {
        cid: 'genLevelCtrl',
        type: 'cmdMove',
        convert: (model, msg, publish, options) => {
            return {action: 'down_hold'};
        },
    },
    AC0251100NJ_cmdMoveHue: {
        cid: 'lightingColorCtrl',
        type: 'cmdMoveHue',
        convert: (model, msg, publish, options) => {
            if (msg.data.data.movemode === 0) {
                return {action: 'circle_release'};
            }
        },
    },
    AC0251100NJ_cmdMoveToSaturation: {
        cid: 'lightingColorCtrl',
        type: 'cmdMoveToSaturation',
        convert: (model, msg, publish, options) => {
            return {action: 'circle_hold'};
        },
    },
    AC0251100NJ_cmdMoveToLevelWithOnOff: {
        cid: 'genLevelCtrl',
        type: 'cmdMoveToLevelWithOnOff',
        convert: (model, msg, publish, options) => {
            return {action: 'circle_click'};
        },
    },
    AC0251100NJ_cmdMoveToColorTemp: {
        cid: 'lightingColorCtrl',
        type: 'cmdMoveToColorTemp',
        convert: (model, msg, publish, options) => null,
    },
    visonic_contact: {
        cid: 'ssIasZone',
        type: 'statusChange',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zoneStatus;
            return {
                contact: !((zoneStatus & 1) > 0), // Bit 1 = Alarm: Contact detection
                tamper: (zoneStatus & 1<<2) > 0, // Bit 3 = Tamper status
                battery_low: (zoneStatus & 1<<3) > 0, // Bit 4 = Battery LOW indicator
            };
        },
    },
    OJBCR701YZ_statuschange: {
        cid: 'ssIasZone',
        type: 'statusChange',
        convert: (model, msg, publish, options) => {
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
    closuresWindowCovering_report: {
        cid: 'closuresWindowCovering',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            return {position: msg.data.data.currentPositionLiftPercentage};
        },
    },
    generic_fan_mode: {
        cid: 'hvacFanCtrl',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            const key = getKey(common.fanMode, msg.data.data.fanMode);
            return {fan_mode: key, fan_state: key === 'off' ? 'OFF' : 'ON'};
        },
    },
    GIRA2430_scene_click: {
        cid: 'genScenes',
        type: 'cmdRecall',
        convert: (model, msg, publish, options) => {
            return {
                action: `select_${msg.data.data.sceneid}`,
            };
        },
    },
    GIRA2430_on_click: {
        cid: 'genOnOff',
        type: 'cmdOn',
        convert: (model, msg, publish, options) => {
            return {action: 'on'};
        },
    },
    GIRA2430_off_click: {
        cid: 'genOnOff',
        type: 'cmdOffWithEffect',
        convert: (model, msg, publish, options) => {
            return {action: 'off'};
        },
    },
    GIRA2430_down_hold: {
        cid: 'genLevelCtrl',
        type: 'cmdStep',
        convert: (model, msg, publish, options) => {
            return {
                action: 'down',
                step_mode: msg.data.data.stepmode,
                step_size: msg.data.data.stepsize,
                transition_time: msg.data.data.transtime,
            };
        },
    },
    GIRA2430_up_hold: {
        cid: 'genLevelCtrl',
        type: 'cmdStepWithOnOff',
        convert: (model, msg, publish, options) => {
            return {
                action: 'up',
                step_mode: msg.data.data.stepmode,
                step_size: msg.data.data.stepsize,
                transition_time: msg.data.data.transtime,
            };
        },
    },
    GIRA2430_stop: {
        cid: 'genLevelCtrl',
        type: 'cmdStop',
        convert: (model, msg, publish, options) => {
            return {
                action: 'stop',
            };
        },
    },
    ZGRC013_cmdOn: {
        cid: 'genOnOff',
        type: 'cmdOn',
        convert: (model, msg, publish, options) => {
            const button = msg.endpoints[0].epId;
            if (button) {
                return {click: `${button}_on`};
            }
        },
    },
    ZGRC013_cmdOff: {
        cid: 'genOnOff',
        type: 'cmdOff',
        convert: (model, msg, publish, options) => {
            const button = msg.endpoints[0].epId;
            if (button) {
                return {click: `${button}_off`};
            }
        },
    },
    ZGRC013_brightness: {
        cid: 'genLevelCtrl',
        type: 'cmdMove',
        convert: (model, msg, publish, options) => {
            const button = msg.endpoints[0].epId;
            const direction = msg.data.data.movemode == 0 ? 'up' : 'down';
            if (button) {
                return {click: `${button}_${direction}`};
            }
        },
    },
    ZGRC013_brightness_onoff: {
        cid: 'genLevelCtrl',
        type: 'cmdMoveWithOnOff',
        convert: (model, msg, publish, options) => {
            const button = msg.endpoints[0].epId;
            const direction = msg.data.data.movemode == 0 ? 'up' : 'down';
            if (button) {
                return {click: `${button}_${direction}`};
            }
        },
    },
    ZGRC013_brightness_stop: {
        cid: 'genLevelCtrl',
        type: 'cmdStopWithOnOff',
        convert: (model, msg, publish, options) => {
            const button = msg.endpoints[0].epId;
            if (button) {
                return {click: `${button}_stop`};
            }
        },
    },
    ZGRC013_scene: {
        cid: 'genScenes',
        type: 'cmdRecall',
        convert: (model, msg, publish, options) => {
            return {click: `scene_${msg.data.data.groupid}_${msg.data.data.sceneid}`};
        },
    },
    SZ_ESW01_AU_power: {
        cid: 'seMetering',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => {
            if (msg.data.data.hasOwnProperty('instantaneousDemand')) {
                return {power: precisionRound(msg.data.data['instantaneousDemand'] / 1000, 2)};
            }
        },
    },

    // Ignore converters (these message dont need parsing).
    ignore_fan_change: {
        cid: 'hvacFanCtrl',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_light_brightness_change: {
        cid: 'genLevelCtrl',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
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
    ignore_onoff_report: {
        cid: 'genOnOff',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_basic_change: {
        cid: 'genBasic',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_basic_report: {
        cid: 'genBasic',
        type: ['attReport', 'readRsp'],
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
    ignore_illuminance_report: {
        cid: 'msIlluminanceMeasurement',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_occupancy_report: {
        cid: 'msOccupancySensing',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_temperature_change: {
        cid: 'msTemperatureMeasurement',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_temperature_report: {
        cid: 'msTemperatureMeasurement',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_humidity_change: {
        cid: 'msRelativeHumidity',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_humidity_report: {
        cid: 'msRelativeHumidity',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_pressure_change: {
        cid: 'msPressureMeasurement',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_pressure_report: {
        cid: 'msPressureMeasurement',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_analog_change: {
        cid: 'genAnalogInput',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_analog_report: {
        cid: 'genAnalogInput',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_multistate_report: {
        cid: 'genMultistateInput',
        type: ['attReport', 'readRsp'],
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
    ignore_power_report: {
        cid: 'genPowerCfg',
        type: ['attReport', 'readRsp'],
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
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_light_color_colortemp_report: {
        cid: 'lightingColorCtrl',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_closuresWindowCovering_change: {
        cid: 'closuresWindowCovering',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_closuresWindowCovering_report: {
        cid: 'closuresWindowCovering',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_thermostat_change: {
        cid: 'hvacThermostat',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_thermostat_report: {
        cid: 'hvacThermostat',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_genGroups_devChange: {
        cid: 'genGroups',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_iaszone_attreport: {
        cid: 'ssIasZone',
        type: 'attReport',
        convert: (model, msg, publish, options) => null,
    },
    ignore_iaszone_change: {
        cid: 'ssIasZone',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_iaszone_statuschange: {
        cid: 'ssIasZone',
        type: 'statusChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_iaszone_report: {
        cid: 'ssIasZone',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_genIdentify: {
        cid: 'genIdentify',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => null,
    },
    _324131092621_ignore_on: {
        cid: 'genOnOff',
        type: 'cmdOn',
        convert: (model, msg, publish, options) => null,
    },
    _324131092621_ignore_off: {
        cid: 'genOnOff',
        type: 'cmdOffWithEffect',
        convert: (model, msg, publish, options) => null,
    },
    _324131092621_ignore_step: {
        cid: 'genLevelCtrl',
        type: 'cmdStep',
        convert: (model, msg, publish, options) => null,
    },
    _324131092621_ignore_stop: {
        cid: 'genLevelCtrl',
        type: 'cmdStop',
        convert: (model, msg, publish, options) => null,
    },
    ignore_poll_ctrl: {
        cid: 'genPollCtrl',
        type: ['attReport', 'readRsp'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_poll_ctrl_change: {
        cid: 'genPollCtrl',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_genIdentify_change: {
        cid: 'genIdentify',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_diagnostic_change: {
        cid: 'haDiagnostic',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_genScenes_change: {
        cid: 'genScenes',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
    ignore_lightLink_change: {
        cid: 'lightLink',
        type: 'devChange',
        convert: (model, msg, publish, options) => null,
    },
};

module.exports = converters;
