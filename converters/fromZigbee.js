'use strict';

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

const calibrateAndPrecisionRoundOptions = (number, options, type) => {
    // Calibrate
    const calibrateKey = `${type}_calibration`;
    let calibrationOffset = options && options.hasOwnProperty(calibrateKey) ? options[calibrateKey] : 0;
    if (type == 'illuminance') {
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
    const deviceID = msg.device.ieeeAddr;
    const payload = {};

    if (!store[deviceID]) {
        store[deviceID] = {since: false, direction: false, value: 255, publish: publish};
    }

    const s = store[deviceID];

    if (action === 'move') {
        s.since = Date.now();
        const direction = msg.data.movemode === 1 ? 'left' : 'right';
        s.direction = direction;
        payload.action = `rotate_${direction}`;
    } else if (action === 'stop' || action === 'level') {
        if (action === 'level') {
            s.value = msg.data.level;
            const direction = s.value === 0 ? 'left' : 'right';
            payload.action = `rotate_${direction}_quick`;
            payload.brightness = s.value;
        } else {
            const duration = Date.now() - s.since;
            const delta = Math.round((duration / 10) * (s.direction === 'left' ? -1 : 1));
            const newValue = s.value + delta;
            if (newValue >= 0 && newValue <= 255) {
                s.value = newValue;
            }
            payload.action = 'rotate_stop';
            payload.brightness = s.value;
        }
    }
    if (s.timerId) {
        clearInterval(s.timerId);
        s.timerId = false;
    }
    if (action === 'move') {
        s.timerId = setInterval(() => {
            const duration = Date.now() - s.since;
            const delta = Math.round((duration / 10) * (s.direction === 'left' ? -1 : 1));
            const newValue = s.value + delta;
            if (newValue >= 0 && newValue <= 255) {
                s.value = newValue;
            }
            payload.brightness = s.value;
            s.since = Date.now();
            s.publish(payload);
        }, 10);
    }
    s.publish(payload);
};

const ratelimitedDimmer = (model, msg, publish, options) => {
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

const holdUpdateBrightness324131092621 = (deviceID) => {
    if (store[deviceID] && store[deviceID].brightnessSince && store[deviceID].brightnessDirection) {
        const duration = Date.now() - store[deviceID].brightnessSince;
        const delta = (duration / 10) * (store[deviceID].brightnessDirection === 'up' ? 1 : -1);
        const newValue = store[deviceID].brightnessValue + delta;
        store[deviceID].brightnessValue = numberWithinRange(newValue, 1, 255);
    }
};

const converters = {
    HS2SK_power: {
        cluster: 'haElectricalMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
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
    generic_lock: {
        cluster: 'closuresDoorLock',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            if (msg.data.hasOwnProperty('lockState')) {
                return {state: msg.data.lockState == 2 ? 'UNLOCK' : 'LOCK'};
            }
        },
    },
    generic_lock_operation_event: {
        cluster: 'closuresDoorLock',
        type: 'commandOperationEventNotification',
        convert: (model, msg, publish, options) => {
            return {
                state: msg.data['opereventcode'] == 2 ? 'UNLOCK' : 'LOCK',
                user: msg.data['userid'],
                source: msg.data['opereventsrc'],
            };
        },
    },
    genOnOff_cmdOn: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options) => {
            return {click: 'on'};
        },
    },
    genOnOff_cmdOff: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options) => {
            return {click: 'off'};
        },
    },
    E1743_brightness_up: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options) => {
            return {click: 'brightness_down'};
        },
    },
    E1743_brightness_down: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        convert: (model, msg, publish, options) => {
            return {click: 'brightness_up'};
        },
    },
    E1743_brightness_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStopWithOnOff',
        convert: (model, msg, publish, options) => {
            return {click: 'brightness_stop'};
        },
    },
    AC0251100NJ_long_middle: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveHue',
        convert: (model, msg, publish, options) => {
            return {click: 'long_middle'};
        },
    },
    AV2010_34_click: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options) => {
            return {click: msg.data.groupid};
        },
    },
    bitron_power: {
        cluster: 'seMetering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            return {power: parseFloat(msg.data['instantaneousDemand']) / 10.0};
        },
    },
    bitron_battery_att_report: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
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
        convert: (model, msg, publish, options) => {
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
    scenes_recall_click: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options) => {
            return {click: msg.data.sceneid};
        },
    },
    smartthings_contact: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options) => {
            return {contact: msg.data.zonestatus === 48};
        },
    },
    xiaomi_battery_3v: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            let voltage = null;

            if (msg.data['65281']) {
                voltage = msg.data['65281']['1'];
            } else if (msg.data['65282']) {
                voltage = msg.data['65282']['1'].elmVal;
            }

            if (voltage) {
                return {
                    battery: parseFloat(toPercentageCR2032(voltage)),
                    voltage: voltage, // @deprecated
                    // voltage: voltage / 1000.0,
                };
            }
        },
    },
    RTCGQ11LM_interval: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            if (msg.data['65281']) {
                return {
                    illuminance: calibrateAndPrecisionRoundOptions(msg.data['65281']['11'], options, 'illuminance'),
                };
            }
        },
    },
    WSDCGQ01LM_WSDCGQ11LM_interval: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
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
    WXKG01LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const deviceID = msg.device.ieeeAddr;
            const state = msg.data['onOff'];

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
                const clicks = msg.data['32768'];
                const payload = clickLookup[clicks] ? clickLookup[clicks] : 'many';
                publish({click: payload});
            }
        },
    },
    temperature: {
        cluster: 'msTemperatureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const temperature = parseFloat(msg.data['measuredValue']) / 100.0;
            return {temperature: calibrateAndPrecisionRoundOptions(temperature, options, 'temperature')};
        },
    },
    xiaomi_temperature: {
        cluster: 'msTemperatureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
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
        convert: (model, msg, publish, options) => {
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
    WXKG12LM_action_click_multistate: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const value = msg.data['presentValue'];
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
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const value = msg.data['presentValue'];
            const lookup = {
                1: {click: 'single'}, // single click
                2: {click: 'double'}, // double click
                0: {action: 'hold'}, // hold for more than 400ms
                255: {action: 'release'}, // release after hold for more than 400ms
            };

            return lookup[value] ? lookup[value] : null;
        },
    },
    humidity: {
        cluster: 'msRelativeHumidity',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const humidity = parseFloat(msg.data['measuredValue']) / 100.0;

            // https://github.com/Koenkk/zigbee2mqtt/issues/798
            // Sometimes the sensor publishes non-realistic vales, it should only publish message
            // in the 0 - 100 range, don't produce messages beyond these values.
            if (humidity >= 0 && humidity <= 100) {
                return {humidity: calibrateAndPrecisionRoundOptions(humidity, options, 'humidity')};
            }
        },
    },
    occupancy: {
        // This is for occupancy sensor that send motion start AND stop messages
        // Note: options.occupancy_timeout not available yet, to implement it will be
        // needed to update device report intervall as well, see devices.js
        cluster: 'msOccupancySensing',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            if (msg.data.occupancy === 0) {
                return {occupancy: false};
            } else if (msg.data.occupancy === 1) {
                return {occupancy: true};
            }
        },
    },
    E1525_occupancy: {
        cluster: 'genOnOff',
        type: 'commandOnWithTimedOff',
        convert: (model, msg, publish, options) => {
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
    occupancy_with_timeout: {
        // This is for occupancy sensor that only send a message when motion detected,
        // but do not send a motion stop.
        // Therefore we need to publish the no_motion detected by ourselves.
        cluster: 'msOccupancySensing',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            if (msg.data.occupancy !== 1) {
                // In case of 0 no occupancy is reported.
                // https://github.com/Koenkk/zigbee2mqtt/issues/467
                return;
            }

            // The occupancy sensor only sends a message when motion detected.
            // Therefore we need to publish the no_motion detected by ourselves.
            const useOptionsTimeout = options && options.hasOwnProperty('occupancy_timeout');
            const timeout = useOptionsTimeout ? options.occupancy_timeout : occupancyTimeout;
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
    xiaomi_contact: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            return {contact: msg.data['onOff'] === 0};
        },
    },
    xiaomi_contact_interval: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            if (msg.data.hasOwnProperty('65281') && msg.data['65281'].hasOwnProperty('100')) {
                return {contact: msg.data['65281']['100'] === 0};
            }
        },
    },
    color_colortemp: {
        cluster: 'lightingColorCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const result = {};

            if (msg.data['colorTemperature']) {
                result.color_temp = msg.data['colorTemperature'];
            }

            if (msg.data['colorMode']) {
                result.color_mode = msg.data['colorMode'];
            }

            if (
                msg.data['currentX'] || msg.data['currentY'] || msg.data['currentSaturation'] ||
                msg.data['enhancedCurrentHue']
            ) {
                result.color = {};

                if (msg.data['currentX']) {
                    result.color.x = precisionRound(msg.data['currentX'] / 65535, 4);
                }

                if (msg.data['currentY']) {
                    result.color.y = precisionRound(msg.data['currentY'] / 65535, 4);
                }

                if (msg.data['currentSaturation']) {
                    result.color.saturation = precisionRound(msg.data['currentSaturation'] / 2.54, 1);
                }

                if (msg.data['enhancedCurrentHue']) {
                    result.color.hue = precisionRound(msg.data['enhancedCurrentHue'] / (65535 / 360), 1);
                }
            }

            return result;
        },
    },
    WXKG11LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const data = msg.data;
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
        cluster: 'msIlluminanceMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const illuminance = msg.data['measuredValue'];
            return {illuminance: calibrateAndPrecisionRoundOptions(illuminance, options, 'illuminance')};
        },
    },
    generic_pressure: {
        cluster: 'msPressureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const pressure = parseFloat(msg.data['measuredValue']);
            return {pressure: calibrateAndPrecisionRoundOptions(pressure, options, 'pressure')};
        },
    },
    WXKG02LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            return {click: getKey(model.endpoint(msg.device), msg.endpoint.ID)};
        },
    },
    WXKG02LM_click_multistate: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
            const value = msg.data['presentValue'];

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
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            return {click: 'single'};
        },
    },
    KEF1PA_arm: {
        cluster: 'ssIasAce',
        type: 'commandArm',
        convert: (model, msg, publish, options) => {
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
    KEF1PA_panic: {
        cluster: 'ssIasAce',
        type: 'commandPanic',
        convert: (model, msg, publish, options) => {
            delete msg.data['armmode'];
            return {action: 'panic'};
        },
    },
    SJCGQ11LM_water_leak_iaszone: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options) => {
            return {water_leak: msg.data.zonestatus === 1};
        },
    },
    cover_stop: {
        cluster: 'closuresWindowCovering',
        type: 'commandStop',
        convert: (model, msg, publish, options) => {
            return {click: 'release'};
        },
    },
    cover_open: {
        cluster: 'closuresWindowCovering',
        type: 'commandUpOpen',
        convert: (model, msg, publish, options) => {
            return {click: 'open'};
        },
    },
    cover_close: {
        cluster: 'closuresWindowCovering',
        type: 'commandDownClose',
        convert: (model, msg, publish, options) => {
            return {click: 'close'};
        },
    },
    state: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            if (msg.data.hasOwnProperty('onOff')) {
                return {state: msg.data['onOff'] === 1 ? 'ON' : 'OFF'};
            }
        },
    },
    xiaomi_power: {
        cluster: 'genAnalogInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            return {power: precisionRound(msg.data['presentValue'], 2)};
        },
    },
    xiaomi_plug_state: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            if (msg.data['65281']) {
                const data = msg.data['65281'];
                return {
                    state: data['100'] === 1 ? 'ON' : 'OFF',
                    power: precisionRound(data['152'], 2),
                    voltage: precisionRound(data['150'] * 0.1, 1),
                    consumption: precisionRound(data['149'], 2),
                    temperature: calibrateAndPrecisionRoundOptions(data['3'], options, 'temperature'),
                };
            }
        },
    },
    xiaomi_bulb_interval: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
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
    QBKG11LM_power: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
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
    QBKG12LM_LLKZMK11LM_power: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
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
    QBKG04LM_QBKG11LM_state: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            if (msg.data['61440']) {
                return {state: msg.data['onOff'] === 1 ? 'ON' : 'OFF'};
            } else {
                return {click: 'single'};
            }
        },
    },
    QBKG04LM_buttons: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            if (msg.endpoint.ID == 4) {
                return {action: msg.data['onOff'] === 1 ? 'release' : 'hold'};
            }
        },
    },
    QBKG04LM_QBKG11LM_operation_mode: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const mappingMode = {
                0x12: 'control_relay',
                0xFE: 'decoupled',
            };
            const key = '65314';
            if (msg.data.hasOwnProperty(key)) {
                const mode = mappingMode[msg.data[key]];
                return {operation_mode: mode};
            }
        },
    },
    QBKG03LM_QBKG12LM_LLKZMK11LM_state: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            if (msg.data['61440']) {
                const key = `state_${getKey(model.endpoint(msg.device), msg.endpoint.ID)}`;
                const payload = {};
                payload[key] = msg.data['onOff'] === 1 ? 'ON' : 'OFF';
                return payload;
            } else {
                const mapping = {4: 'left', 5: 'right', 6: 'both'};
                const button = mapping[msg.endpoint.ID];
                return {click: button};
            }
        },
    },
    QBKG11LM_click: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            if ([1, 2].includes(msg.data.presentValue)) {
                const times = {1: 'single', 2: 'double'};
                return {click: times[msg.data.presentValue]};
            }
        },
    },
    QBKG12LM_click: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            if ([1, 2].includes(msg.data.presentValue)) {
                const mapping = {5: 'left', 6: 'right', 7: 'both'};
                const times = {1: 'single', 2: 'double'};
                const button = mapping[msg.endpoint.ID];
                return {click: `${button}_${times[msg.data.presentValue]}`};
            }
        },
    },
    QBKG03LM_buttons: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const mapping = {4: 'left', 5: 'right'};
            const button = mapping[msg.endpoint.ID];
            if (button) {
                const payload = {};
                payload[`button_${button}`] = msg.data['onOff'] === 1 ? 'release' : 'hold';
                return payload;
            }
        },
    },
    QBKG03LM_QBKG12LM_operation_mode: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
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
                if (msg.data.hasOwnProperty(key)) {
                    const payload = {};
                    const mode = mappingMode[msg.data[key]];
                    payload[`operation_mode_${mappingButton[key]}`] = mode;
                    return payload;
                }
            }
        },
    },
    xiaomi_lock_report: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
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
    ZNCLDJ11LM_ZNCLDJ12LM_curtain_analog_output: {
        cluster: 'genAnalogOutput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            let running = false;

            if (msg.data['61440']) {
                running = msg.data['61440'] !== 0;
            }

            const position = precisionRound(msg.data['presentValue'], 2);
            return {position: position, running: running};
        },
    },
    JTYJGD01LMBW_smoke: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options) => {
            return {smoke: msg.data.zonestatus === 1};
        },
    },
    heiman_smoke: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options) => {
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
        convert: (model, msg, publish, options) => {
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
    heiman_smart_controller_emergency: {
        cluster: 'ssIasAce',
        type: 'commandEmergency',
        convert: (model, msg, publish, options) => {
            return {action: 'emergency'};
        },
    },
    battery_200: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse', 'attReport'],
        convert: (model, msg, publish, options) => {
            const batt = msg.data.batteryPercentageRemaining;
            const battLow = msg.data.batteryAlarmState;
            const voltage = msg.data.batteryVoltage;
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
            if (voltage != null) {
                results['voltage'] = voltage * 100;
            }
            return results;
        },
    },
    heiman_smoke_enrolled: {
        cluster: 'ssIasZone',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
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
    iaszone_gas_1: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                gas: (zoneStatus & 1) > 0,
                tamper: (zoneStatus & 1<<2) > 0,
                battery_low: (zoneStatus & 1<<3) > 0,
            };
        },
    },
    iaszone_gas_2: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                gas: (zoneStatus & 1<<1) > 0,
                tamper: (zoneStatus & 1<<2) > 0,
                battery_low: (zoneStatus & 1<<3) > 0,
            };
        },
    },
    heiman_water_leak: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                water_leak: (zoneStatus & 1) > 0, // Bit 1 = Alarm: Water leak
                tamper: (zoneStatus & 1<<2) > 0, // Bit 3 = Tamper status
                battery_low: (zoneStatus & 1<<3) > 0, // Bit 4 = Battery LOW indicator
            };
        },
    },
    heiman_carbon_monoxide: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                carbon_monoxide: (zoneStatus & 1) > 0, // Bit 1 = Alarm: Carbon monoxide
                battery_low: (zoneStatus & 1<<3) > 0, // Bit 4 = Battery LOW indicator
            };
        },
    },
    JTQJBF01LMBW_gas: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options) => {
            return {gas: msg.data.zonestatus === 1};
        },
    },
    JTQJBF01LMBW_gas_density: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const data = msg.data;
            if (data && data['65281']) {
                const basicAttrs = data['65281'];
                if (basicAttrs.hasOwnProperty('100')) {
                    return {gas_density: basicAttrs['100']};
                }
            }
        },
    },
    JTQJBF01LMBW_sensitivity: {
        cluster: 'ssIasZone',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
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
        convert: (model, msg, publish, options) => {
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
    generic_power: {
        cluster: 'seMetering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const result = {};
            const multiplier = msg.endpoint.getClusterAttributeValue('seMetering', 'multiplier');
            const divisor = msg.endpoint.getClusterAttributeValue('seMetering', 'divisor');
            const factor = multiplier && divisor ? multiplier / divisor : null;

            if (msg.data.hasOwnProperty('instantaneousDemand')) {
                let power = msg.data['instantaneousDemand'];
                if (factor != null) {
                    power = (power * factor) * 1000; // kWh to Watt
                }
                result.power = precisionRound(power, 2);
            }

            if (factor != null && (msg.data.hasOwnProperty('currentSummDelivered') ||
                msg.data.hasOwnProperty('currentSummReceived'))) {
                result.energy = 0;
                if (msg.data.hasOwnProperty('currentSummDelivered')) {
                    const data = msg.data['currentSummDelivered'];
                    const value = (parseInt(data[0]) << 32) + parseInt(data[1]);
                    result.energy += value * factor;
                }
                if (msg.data.hasOwnProperty('currentSummReceived')) {
                    const data = msg.data['currentSummReceived'];
                    const value = (parseInt(data[0]) << 32) + parseInt(data[1]);
                    result.energy -= value * factor;
                }
            }

            return result;
        },
    },
    CC2530ROUTER_state: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            return {state: true, led_state: msg.data['onOff'] === 1};
        },
    },
    CC2530ROUTER_meta: {
        cluster: 'genBinaryValue',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
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
        convert: (model, msg, publish, options) => {
            const key = `state_${getKey(model.endpoint(msg.device), msg.endpoint.ID)}`;
            const payload = {};
            payload[key] = msg.data['onOff'] === 1 ? 'ON' : 'OFF';
            return payload;
        },
    },
    DNCKAT_S00X_buttons: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const key = `button_${getKey(model.endpoint(msg.device), msg.endpoint.ID)}`;
            const payload = {};
            payload[key] = msg.data['onOff'] === 1 ? 'release' : 'hold';
            return payload;
        },
    },
    ZigUP_parse: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
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
        convert: (model, msg, publish, options) => {
            return {
                power: msg.data['activePower'],
                current: msg.data['rmsCurrent'],
                voltage: msg.data['rmsVoltage'],
                power_factor: msg.data['powerFactor'],
            };
        },
    },
    SP120_power: {
        cluster: 'haElectricalMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const result = {};

            if (msg.data.hasOwnProperty('activePower')) {
                result.power = msg.data['activePower'];
            }

            if (msg.data.hasOwnProperty('rmsCurrent')) {
                result.current = msg.data['rmsCurrent'] / 1000;
            }

            if (msg.data.hasOwnProperty('rmsVoltage')) {
                result.voltage = msg.data['rmsVoltage'];
            }

            return result;
        },
    },
    peanut_electrical: {
        cluster: 'haElectricalMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
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
        convert: (model, msg, publish, options) => {
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
        convert: (model, msg, publish, options) => {
            const battery = {max: 3000, min: 2500};
            const voltage = msg.data['batteryVoltage'] * 100;
            return {
                battery: toPercentage(voltage, battery.min, battery.max),
                voltage: voltage, // @deprecated
                // voltage: voltage / 1000.0,
            };
        },
    },
    battery_3V_2100: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const battery = {max: 3000, min: 2100};
            const voltage = msg.data['batteryVoltage'] * 100;
            return {
                battery: toPercentage(voltage, battery.min, battery.max),
                voltage: voltage / 1000.0,
            };
        },
    },
    battery_cr2032: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const voltage = msg.data['batteryVoltage'] * 100;
            return {
                battery: toPercentageCR2032(voltage),
                voltage: voltage / 1000.0,
            };
        },
    },
    STS_PRS_251_beeping: {
        cluster: 'genIdentify',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            return {action: 'beeping'};
        },
    },
    _324131092621_notification: {
        cluster: 'manuSpecificPhilips',
        type: 'commandHueNotification',
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
    generic_battery: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            if (msg.data.hasOwnProperty('batteryPercentageRemaining')) {
                return {battery: msg.data['batteryPercentageRemaining']};
            }
        },
    },
    generic_battery_remaining: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            if (msg.data.hasOwnProperty('batteryPercentageRemaining')) {
                return {battery: precisionRound(msg.data['batteryPercentageRemaining'] / 2, 2)};
            }
        },
    },
    generic_battery_voltage: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            if (msg.data.hasOwnProperty('batteryVoltage')) {
                return {voltage: msg.data['batteryVoltage'] / 100};
            }
        },
    },
    cmd_move: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options) => {
            ictcg1(model, msg, publish, options, 'move');
            const direction = msg.data.movemode === 1 ? 'left' : 'right';
            return {action: `rotate_${direction}`, rate: msg.data.rate};
        },
    },
    cmd_move_with_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        convert: (model, msg, publish, options) => {
            ictcg1(model, msg, publish, options, 'move');
            const direction = msg.data.movemode === 1 ? 'left' : 'right';
            return {action: `rotate_${direction}`, rate: msg.data.rate};
        },
    },
    cmd_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options) => {
            ictcg1(model, msg, publish, options, 'stop');
            return {action: `rotate_stop`};
        },
    },
    cmd_stop_with_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandStopWithOnOff',
        convert: (model, msg, publish, options) => {
            ictcg1(model, msg, publish, options, 'stop');
            return {action: `rotate_stop`};
        },
    },
    cmd_move_to_level_with_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveToLevelWithOnOff',
        convert: (model, msg, publish, options) => {
            ictcg1(model, msg, publish, options, 'level');
            const direction = msg.data.level === 0 ? 'left' : 'right';
            return {action: `rotate_${direction}_quick`, level: msg.data.level};
        },
    },
    iris_3210L_power: {
        cluster: 'haElectricalMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            return {power: msg.data['activePower'] / 10.0};
        },
    },
    iris_3320L_contact: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options) => {
            return {contact: msg.data.zonestatus === 36};
        },
    },
    nue_power_state: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
            if (button) {
                const payload = {};
                payload[`state_${button}`] = msg.data['onOff'] === 1 ? 'ON' : 'OFF';
                return payload;
            }
        },
    },
    generic_state_multi_ep: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const key = `state_${getKey(model.endpoint(msg.device), msg.endpoint.ID)}`;
            const payload = {};
            payload[key] = msg.data['onOff'] === 1 ? 'ON' : 'OFF';
            return payload;
        },
    },
    RZHAC_4256251_power: {
        cluster: 'haElectricalMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            return {
                power: msg.data['activePower'],
                current: msg.data['rmsCurrent'],
                voltage: msg.data['rmsVoltage'],
            };
        },
    },
    iaszone_occupancy_2: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                occupancy: (zoneStatus & 1<<1) > 0, // Bit 1 = Alarm 2: Presence Indication
                tamper: (zoneStatus & 1<<2) > 0, // Bit 2 = Tamper status
                battery_low: (zoneStatus & 1<<3) > 0, // Bit 3 = Battery LOW indicator (trips around 2.4V)
            };
        },
    },
    iaszone_occupancy_1: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                occupancy: (zoneStatus & 1) > 0,
                tamper: (zoneStatus & 1<<2) > 0,
                battery_low: (zoneStatus & 1<<3) > 0,
            };
        },
    },
    iaszone_occupancy_1_with_timeout: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zonestatus;
            const useOptionsTimeout = options && options.hasOwnProperty('occupancy_timeout');
            const timeout = useOptionsTimeout ? options.occupancy_timeout : occupancyTimeout;
            const deviceID = msg.device.ieeeAddr;

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
    iaszone_contact: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                contact: !((zoneStatus & 1) > 0),
                tamper: (zoneStatus & 1<<2) > 0,
                battery_low: (zoneStatus & 1<<3) > 0,
            };
        },
    },
    brightness: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            if (msg.data.hasOwnProperty('currentLevel')) {
                return {brightness: msg.data['currentLevel']};
            }
        },
    },
    smartsense_multi: {
        cluster: 'ssIasZone',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                contact: !(zoneStatus & 1), // Bit 1 = Contact
                // Bit 5 = Currently always set?
            };
        },
    },
    st_leak: {
        cluster: 'ssIasZone',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                water_leak: (zoneStatus & 1) > 0, // Bit 1 = wet
            };
        },
    },
    st_button_state: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options) => {
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
        },
    },
    CTR_U_brightness_updown_click: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options) => {
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
        convert: (model, msg, publish, options) => {
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
        convert: (model, msg, publish, options) => {
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
    CTR_U_scene: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options) => {
            return {click: `scene_${msg.data.groupid}_${msg.data.sceneid}`};
        },
    },
    thermostat_att_report: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
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
                result.occupied_heating_setpoint =
                    precisionRound(msg.data['occupiedHeatingSetpoint'], 2) / 100;
            }
            if (typeof msg.data['unoccupiedHeatingSetpoint'] == 'number') {
                result.unoccupied_heating_setpoint =
                    precisionRound(msg.data['unoccupiedHeatingSetpoint'], 2) / 100;
            }
            if (typeof msg.data['occupiedCoolingSetpoint'] == 'number') {
                result.occupied_cooling_setpoint =
                    precisionRound(msg.data['occupiedCoolingSetpoint'], 2) / 100;
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
                result.pi_heating_demand = msg.data['pIHeatingDemand'];
            }
            return result;
        },
    },
    eurotronic_thermostat: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const result = {};
            if (typeof msg.data[0x4003] == 'number') {
                result.current_heating_setpoint =
                    precisionRound(msg.data[0x4003], 2) / 100;
            }
            if (typeof msg.data[0x4008] == 'number') {
                result.eurotronic_system_mode = msg.data[0x4008];
                if ((result.eurotronic_system_mode & 1 << 2) != 0) {
                    result.system_mode = common.thermostatSystemModes[1]; // boost => auto
                } else if ((result.eurotronic_system_mode & (1 << 4)) != 0 ) {
                    result.system_mode = common.thermostatSystemModes[0]; // off
                } else {
                    result.system_mode = common.thermostatSystemModes[4]; // heat
                }
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
    tint404011_on: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options) => {
            return {action: 'on'};
        },
    },
    tint404011_off: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options) => {
            return {action: 'off'};
        },
    },
    tint404011_brightness_updown_click: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options) => {
            const direction = msg.data.stepmode === 1 ? 'down' : 'up';
            return {
                action: `brightness_${direction}_click`,
                step_size: msg.data.stepsize,
                transition_time: msg.data.transtime,
            };
        },
    },
    tint404011_brightness_updown_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options) => {
            const deviceID = msg.device.ieeeAddr;
            const direction = msg.data.movemode === 1 ? 'down' : 'up';

            // Save last direction for release event
            if (!store[deviceID]) {
                store[deviceID] = {};
            }
            store[deviceID].movemode = direction;

            return {
                action: `brightness_${direction}_hold`,
                rate: msg.data.rate,
            };
        },
    },
    tint404011_brightness_updown_release: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options) => {
            const deviceID = msg.device.ieeeAddr;
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
        cluster: 'genBasic',
        type: 'commandWrite',
        convert: (model, msg, publish, options) => {
            return {action: `scene${msg.data[0].attrData}`};
        },
    },
    tint404011_move_to_color_temp: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToColorTemp',
        convert: (model, msg, publish, options) => {
            return {
                action: `color_temp`,
                action_color_temperature: msg.data.colortemp,
                transition_time: msg.data.transtime,
            };
        },
    },
    tint404011_move_to_color: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToColor',
        convert: (model, msg, publish, options) => {
            return {
                action_color: {
                    x: precisionRound(msg.data.colorx / 65535, 3),
                    y: precisionRound(msg.data.colory / 65535, 3),
                },
                action: 'color_wheel',
                transition_time: msg.data.transtime,
            };
        },
    },
    cmdToggle: {
        cluster: 'genOnOff',
        type: 'commandToggle',
        convert: (model, msg, publish, options) => {
            return {action: 'toggle'};
        },
    },
    E1524_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveToLevelWithOnOff',
        convert: (model, msg, publish, options) => {
            return {action: 'toggle_hold'};
        },
    },
    E1524_arrow_click: {
        cluster: 'genScenes',
        type: 'commandTradfriArrowSingle',
        convert: (model, msg, publish, options) => {
            if (msg.data.value === 2) {
                // This is send on toggle hold, ignore it as a toggle_hold is already handled above.
                return;
            }

            const direction = msg.data.value === 257 ? 'left' : 'right';
            return {action: `arrow_${direction}_click`};
        },
    },
    E1524_arrow_hold: {
        cluster: 'genScenes',
        type: 'commandTradfriArrowHold',
        convert: (model, msg, publish, options) => {
            const direction = msg.data.value === 3329 ? 'left' : 'right';
            store[msg.device.ieeeAddr] = direction;
            return {action: `arrow_${direction}_hold`};
        },
    },
    E1524_arrow_release: {
        cluster: 'genScenes',
        type: 'commandTradfriArrowRelease',
        convert: (model, msg, publish, options) => {
            const direction = store[msg.device.ieeeAddr];
            if (direction) {
                delete store[msg.device.ieeeAddr];
                return {action: `arrow_${direction}_release`, duration: msg.data.value / 1000};
            }
        },
    },
    E1524_brightness_up_click: {
        cluster: 'genLevelCtrl',
        type: 'commandStepWithOnOff',
        convert: (model, msg, publish, options) => {
            return {action: `brightness_up_click`};
        },
    },
    E1524_brightness_down_click: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options) => {
            return {action: `brightness_down_click`};
        },
    },
    E1524_brightness_up_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        convert: (model, msg, publish, options) => {
            return {action: `brightness_up_hold`};
        },
    },
    E1524_brightness_up_release: {
        cluster: 'genLevelCtrl',
        type: 'commandStopWithOnOff',
        convert: (model, msg, publish, options) => {
            return {action: `brightness_up_release`};
        },
    },
    E1524_brightness_down_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options) => {
            return {action: `brightness_down_hold`};
        },
    },
    E1524_brightness_down_release: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options) => {
            return {action: `brightness_down_release`};
        },
    },
    livolo_switch_state: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const status = msg.data.onOff;
            const payload = {};
            payload['state_left'] = status & 1 ? 'ON' : 'OFF';
            payload['state_right'] = status & 2 ? 'ON' : 'OFF';
            payload['linkquality'] = msg.linkquality;
            return payload;
        },
    },
    livolo_switch_state_raw: {
        cluster: 'genPowerCfg',
        type: ['raw'],
        convert: (model, msg, publish, options) => {
            const malformedHeader = Buffer.from([0x7c, 0xd2, 0x15, 0xd8, 0x00]);
            if (malformedHeader.compare(msg.data, 0, 4)) {
                const status = msg.data[15];
                const state = {};
                state['state_left'] = status & 1 ? 'ON' : 'OFF';
                state['state_right'] = status & 2 ? 'ON' : 'OFF';
                state['linkquality'] = msg.linkquality;

                return state;
            }
            return null;
        },
    },
    eria_81825_on: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options) => {
            return {action: 'on'};
        },
    },
    eria_81825_off: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options) => {
            return {action: 'off'};
        },
    },
    eria_81825_updown: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options) => {
            const direction = msg.data.stepmode === 0 ? 'up' : 'down';
            return {action: `${direction}`};
        },
    },
    ZYCT202_on: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options) => {
            return {action: 'on', action_group: msg.groupID};
        },
    },
    ZYCT202_off: {
        cluster: 'genOnOff',
        type: 'commandOffWithEffect',
        convert: (model, msg, publish, options) => {
            return {action: 'off', action_group: msg.groupID};
        },
    },
    ZYCT202_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options) => {
            return {action: 'stop', action_group: msg.groupID};
        },
    },
    ZYCT202_up_down: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options) => {
            const value = msg.data['movemode'];
            let action = null;
            if (value === 0) action = {'action': 'up-press', 'action_group': msg.groupID};
            else if (value === 1) action = {'action': 'down-press', 'action_group': msg.groupID};
            return action ? action : null;
        },
    },
    cover_position_via_brightness: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const currentLevel = msg.data['currentLevel'];
            const position = Math.round(Number(currentLevel) / 2.55).toString();
            const state = position > 0 ? 'OPEN' : 'CLOSE';
            return {state: state, position: position};
        },
    },
    cover_state_via_onoff: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            if (msg.data.hasOwnProperty('onOff')) {
                return {state: msg.data['onOff'] === 1 ? 'OPEN' : 'CLOSE'};
            }
        },
    },
    keen_home_smart_vent_pressure: {
        cluster: 'msPressureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            // '{"cid":"msPressureMeasurement","data":{"32":990494}}'
            const pressure = parseFloat(msg.data['32']) / 1000.0;
            return {pressure: calibrateAndPrecisionRoundOptions(pressure, options, 'pressure')};
        },
    },
    AC0251100NJ_cmdOn: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options) => {
            return {action: 'up'};
        },
    },
    AC0251100NJ_cmdOff: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options) => {
            return {action: 'down'};
        },
    },
    AC0251100NJ_cmdMoveWithOnOff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        convert: (model, msg, publish, options) => {
            return {action: 'up_hold'};
        },
    },
    AC0251100NJ_cmdStop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options) => {
            const map = {
                1: 'up_release',
                2: 'down_release',
            };

            return {action: map[msg.endpoint.ID]};
        },
    },
    AC0251100NJ_cmdMove: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options) => {
            return {action: 'down_hold'};
        },
    },
    AC0251100NJ_cmdMoveHue: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveHue',
        convert: (model, msg, publish, options) => {
            if (msg.data.movemode === 0) {
                return {action: 'circle_release'};
            }
        },
    },
    AC0251100NJ_cmdMoveToSaturation: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToSaturation',
        convert: (model, msg, publish, options) => {
            return {action: 'circle_hold'};
        },
    },
    AC0251100NJ_cmdMoveToLevelWithOnOff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveToLevelWithOnOff',
        convert: (model, msg, publish, options) => {
            return {action: 'circle_click'};
        },
    },
    AC0251100NJ_cmdMoveToColorTemp: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToColorTemp',
        convert: (model, msg, publish, options) => null,
    },
    OJBCR701YZ_statuschange: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
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
    cover_position_tilt: {
        cluster: 'closuresWindowCovering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const result = {};
            // ZigBee officially expects "open" to be 0 and "closed" to be 100 whereas
            // HomeAssistant etc. work the other way round.
            // ubisys J1 will report 255 if lift or tilt positions are not known.
            if (msg.data.hasOwnProperty('currentPositionLiftPercentage')) {
                const liftPercentage = msg.data['currentPositionLiftPercentage'];
                result.position = liftPercentage <= 100 ? (100 - liftPercentage) : null;
            }
            if (msg.data.hasOwnProperty('currentPositionTiltPercentage')) {
                const tiltPercentage = msg.data['currentPositionTiltPercentage'];
                result.tilt = tiltPercentage <= 100 ? (100 - tiltPercentage) : null;
            }
            return result;
        },
    },
    generic_fan_mode: {
        cluster: 'hvacFanCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const key = getKey(common.fanMode, msg.data.fanMode);
            return {fan_mode: key, fan_state: key === 'off' ? 'OFF' : 'ON'};
        },
    },
    GIRA2430_scene_click: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options) => {
            return {
                action: `select_${msg.data.sceneid}`,
            };
        },
    },
    GIRA2430_on_click: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options) => {
            return {action: 'on'};
        },
    },
    GIRA2430_off_click: {
        cluster: 'genOnOff',
        type: 'commandOffWithEffect',
        convert: (model, msg, publish, options) => {
            return {action: 'off'};
        },
    },
    GIRA2430_down_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options) => {
            return {
                action: 'down',
                step_mode: msg.data.stepmode,
                step_size: msg.data.stepsize,
                transition_time: msg.data.transtime,
            };
        },
    },
    GIRA2430_up_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandStepWithOnOff',
        convert: (model, msg, publish, options) => {
            return {
                action: 'up',
                step_mode: msg.data.stepmode,
                step_size: msg.data.stepsize,
                transition_time: msg.data.transtime,
            };
        },
    },
    GIRA2430_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options) => {
            return {
                action: 'stop',
            };
        },
    },
    ZGRC013_cmdOn: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options) => {
            const button = msg.endpoint.ID;
            if (button) {
                return {click: `${button}_on`};
            }
        },
    },
    ZGRC013_cmdOff: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options) => {
            const button = msg.endpoint.ID;
            if (button) {
                return {click: `${button}_off`};
            }
        },
    },
    ZGRC013_brightness: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options) => {
            const button = msg.endpoint.ID;
            const direction = msg.data.movemode == 0 ? 'up' : 'down';
            if (button) {
                return {click: `${button}_${direction}`};
            }
        },
    },
    ZGRC013_brightness_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        convert: (model, msg, publish, options) => {
            const button = msg.endpoint.ID;
            const direction = msg.data.movemode == 0 ? 'up' : 'down';
            if (button) {
                return {click: `${button}_${direction}`};
            }
        },
    },
    ZGRC013_brightness_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStopWithOnOff',
        convert: (model, msg, publish, options) => {
            const button = msg.endpoint.ID;
            if (button) {
                return {click: `${button}_stop`};
            }
        },
    },
    ZGRC013_scene: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options) => {
            return {click: `scene_${msg.data.groupid}_${msg.data.sceneid}`};
        },
    },
    SZ_ESW01_AU_power: {
        cluster: 'seMetering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            if (msg.data.hasOwnProperty('instantaneousDemand')) {
                return {power: precisionRound(msg.data['instantaneousDemand'] / 1000, 2)};
            }
        },
    },
    meazon_meter: {
        cluster: 'seMetering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
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
    ZNMS12LM_ZNMS13LM_closuresDoorLock_report: {
        cluster: 'closuresDoorLock',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
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
        convert: (model, msg, publish, options) => {
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
    konke_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const value = msg.data['onOff'];
            const lookup = {
                128: {click: 'single'}, // single click
                129: {click: 'double'}, // double and many click
                130: {click: 'long'}, // hold
            };

            return lookup[value] ? lookup[value] : null;
        },
    },
    E1746_linkquality: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            return {linkquality: msg.linkquality};
        },
    },
    generic_device_temperature: {
        cluster: 'genDeviceTempCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            if (msg.data.hasOwnProperty('currentTemperature')) {
                return {temperature: msg.data.currentTemperature};
            }
        },
    },
    ptvo_switch_state: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
            const key = `state_${getKey(model.endpoint(msg.device), msg.endpoint.ID)}`;
            const payload = {};
            payload[key] = msg.data['onOff'] === 1 ? 'ON' : 'OFF';
            return payload;
        },
    },
    ptvo_switch_buttons: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => {
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
        },
    },
    keypad20states: {
        cluster: 'genOnOff',
        type: ['readResponse', 'attributeReport'],
        convert: (model, msg, publish, options) => {
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
        convert: (model, msg, publish, options) => {
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
        convert: (model, msg, publish, options) => {
            ratelimitedDimmer(model, msg, publish, options);
        },
    },

    // Ignore converters (these message dont need parsing).
    ignore_onoff_report: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_basic_report: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_illuminance_report: {
        cluster: 'msIlluminanceMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_occupancy_report: {
        cluster: 'msOccupancySensing',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_temperature_report: {
        cluster: 'msTemperatureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_humidity_report: {
        cluster: 'msRelativeHumidity',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_pressure_report: {
        cluster: 'msPressureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_analog_report: {
        cluster: 'genAnalogInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_multistate_report: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_power_report: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_light_brightness_report: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_light_color_colortemp_report: {
        cluster: 'lightingColorCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_closuresWindowCovering_report: {
        cluster: 'closuresWindowCovering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_thermostat_report: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_iaszone_attreport: {
        cluster: 'ssIasZone',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_iaszone_statuschange: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options) => null,
    },
    ignore_iaszone_report: {
        cluster: 'ssIasZone',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_genIdentify: {
        cluster: 'genIdentify',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => null,
    },
    _324131092621_ignore_on: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options) => null,
    },
    _324131092621_ignore_off: {
        cluster: 'genOnOff',
        type: 'commandOffWithEffect',
        convert: (model, msg, publish, options) => null,
    },
    _324131092621_ignore_step: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options) => null,
    },
    _324131092621_ignore_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options) => null,
    },
    ignore_poll_ctrl: {
        cluster: 'genPollCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => null,
    },
    ignore_genLevelCtrl_report: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options) => null,
    },
};

module.exports = converters;
