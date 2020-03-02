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

const holdUpdateBrightness324131092621 = (deviceID) => {
    if (store[deviceID] && store[deviceID].brightnessSince && store[deviceID].brightnessDirection) {
        const duration = Date.now() - store[deviceID].brightnessSince;
        const delta = (duration / 10) * (store[deviceID].brightnessDirection === 'up' ? 1 : -1);
        const newValue = store[deviceID].brightnessValue + delta;
        store[deviceID].brightnessValue = numberWithinRange(newValue, 1, 255);
    }
};

const converters = {
    /**
     * Generic/recommended converters, the converters below comply with the ZCL
     * and are recommended to for re-use
     */
    lock_operation_event: {
        cluster: 'closuresDoorLock',
        type: 'commandOperationEventNotification',
        convert: (model, msg, publish, options, meta) => {
            const unlockCodes = [2, 9, 14];
            return {
                state: unlockCodes.includes(msg.data['opereventcode']) ? 'UNLOCK' : 'LOCK',
                user: msg.data['userid'],
                source: msg.data['opereventsrc'],
            };
        },
    },
    lock: {
        cluster: 'closuresDoorLock',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('lockState')) {
                return {state: msg.data.lockState == 2 ? 'UNLOCK' : 'LOCK'};
            }
        },
    },
    battery_percentage_remaining: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('batteryPercentageRemaining')) {
                return {battery: precisionRound(msg.data['batteryPercentageRemaining'] / 2, 2)};
            }
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
    occupancy: {
        // This is for occupancy sensor that send motion start AND stop messages
        // Note: options.occupancy_timeout not available yet, to implement it will be
        // needed to update device report intervall as well, see devices.js
        cluster: 'msOccupancySensing',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('occupancy')) {
                return {occupancy: msg.data.occupancy === 1};
            }
        },
    },
    brightness: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('currentLevel')) {
                return {brightness: msg.data['currentLevel']};
            }
        },
    },
    brightness_multi_endpoint: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('currentLevel')) {
                const key = `brightness_${getKey(model.endpoint(msg.device), msg.endpoint.ID)}`;
                const payload = {};
                payload[key] = msg.data['currentLevel'];
                return payload;
            }
        },
    },
    electrical_measurement: {
        /**
         * When using this converter also add the following to the configure method of the device:
         * await endpoint.read('haElectricalMeasurement', [
         *   'acVoltageMultiplier', 'acVoltageDivisor', 'acCurrentMultiplier',
         *   'acCurrentDivisor', 'acPowerMultiplier', 'acPowerDivisor',
         * ]);
         */
        cluster: 'haElectricalMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const payload = {};
            if (msg.data.hasOwnProperty('activePower')) {
                const multiplier = msg.endpoint.getClusterAttributeValue(
                    'haElectricalMeasurement', 'acPowerMultiplier',
                );
                const divisor = msg.endpoint.getClusterAttributeValue(
                    'haElectricalMeasurement', 'acPowerDivisor',
                );
                const factor = multiplier && divisor ? multiplier / divisor : 1;
                payload.power = precisionRound(msg.data['activePower'] * factor, 2);
            }
            if (msg.data.hasOwnProperty('rmsCurrent')) {
                const multiplier = msg.endpoint.getClusterAttributeValue(
                    'haElectricalMeasurement', 'acCurrentMultiplier',
                );
                const divisor = msg.endpoint.getClusterAttributeValue('haElectricalMeasurement', 'acCurrentDivisor');
                const factor = multiplier && divisor ? multiplier / divisor : 1;
                payload.current = precisionRound(msg.data['rmsCurrent'] * factor, 2);
            }
            if (msg.data.hasOwnProperty('rmsVoltage')) {
                const multiplier = msg.endpoint.getClusterAttributeValue(
                    'haElectricalMeasurement', 'acVoltageMultiplier',
                );
                const divisor = msg.endpoint.getClusterAttributeValue('haElectricalMeasurement', 'acVoltageDivisor');
                const factor = multiplier && divisor ? multiplier / divisor : 1;
                payload.voltage = precisionRound(msg.data['rmsVoltage'] * factor, 2);
            }
            return payload;
        },
    },
    on_off: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('onOff')) {
                return {state: msg.data['onOff'] === 1 ? 'ON' : 'OFF'};
            }
        },
    },
    on_off_multi_endpoint: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('onOff')) {
                const key = `state_${getKey(model.endpoint(msg.device), msg.endpoint.ID)}`;
                const payload = {};
                payload[key] = msg.data['onOff'] === 1 ? 'ON' : 'OFF';
                return payload;
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
            return {
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
    command_panic: {
        cluster: 'ssIasAce',
        type: 'commandPanic',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'panic'};
        },
    },
    command_on: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'on'};
        },
    },
    command_off: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'off'};
        },
    },
    command_off_with_effect: {
        cluster: 'genOnOff',
        type: 'commandOffWithEffect',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'off'};
        },
    },
    identify: {
        cluster: 'genIdentify',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {action: 'identify'};
        },
    },
    scenes_recall_scene: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            return {action: `scene_${msg.data.sceneid}`};
        },
    },

    /**
     * Device specific converters, not recommended for re-use.
     * TODO: This has not been fully sorted out yet.
     */
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
    genOnOff_cmdOn: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            return {click: 'on'};
        },
    },
    genOnOff_cmdOff: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options, meta) => {
            return {click: 'off'};
        },
    },
    E1743_brightness_up: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            return {click: 'brightness_down'};
        },
    },
    E1743_brightness_down: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            return {click: 'brightness_up'};
        },
    },
    E1743_brightness_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStopWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            return {click: 'brightness_stop'};
        },
    },
    E1744_play_pause: {
        cluster: 'genOnOff',
        type: 'commandToggle',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'play_pause'};
        },
    },
    E1744_skip: {
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
    osram_lightify_switch_long_middle: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveHue',
        convert: (model, msg, publish, options, meta) => {
            return {click: 'long_middle'};
        },
    },
    AV2010_34_click: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            return {click: msg.data.groupid};
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
    scenes_recall_click: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            return {click: msg.data.sceneid};
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
                let illuminance = msg.data['65281']['11'];
                illuminance = calibrateAndPrecisionRoundOptions(illuminance, options, 'illuminance');
                return {illuminance, illuminance_lux: illuminance};
            }
        },
    },
    RTCGQ11LM_illuminance: {
        cluster: 'msIlluminanceMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            // DEPRECATED: only return lux here (change illuminance_lux -> illuminance)
            let illuminance = msg.data['measuredValue'];
            illuminance = calibrateAndPrecisionRoundOptions(illuminance, options, 'illuminance');
            return {illuminance, illuminance_lux: illuminance};
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
    WXKG01LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
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
    WXKG12LM_action_click_multistate: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
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
        convert: (model, msg, publish, options, meta) => {
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
                // Cannot use generic_power, divisor/multiplier is not according to ZCL.
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
                return converters.generic_power.convert(model, msg, publish, options, meta);
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
    WXKG11LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
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
        convert: (model, msg, publish, options, meta) => {
            // DEPRECATED: only return lux here (change illuminance_lux -> illuminance)
            const illuminance = msg.data['measuredValue'];
            const illuminanceLux = Math.round(Math.pow(10, illuminance / 10000) - 1);
            return {
                illuminance: calibrateAndPrecisionRoundOptions(illuminance, options, 'illuminance'),
                illuminance_lux: calibrateAndPrecisionRoundOptions(illuminanceLux, options, 'illuminance_lux'),
            };
        },
    },
    generic_pressure: {
        cluster: 'msPressureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const pressure = parseFloat(msg.data['measuredValue']);
            return {pressure: calibrateAndPrecisionRoundOptions(pressure, options, 'pressure')};
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
    WXKG02LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {click: getKey(model.endpoint(msg.device), msg.endpoint.ID)};
        },
    },
    WXKG02LM_click_multistate: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
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
        convert: (model, msg, publish, options, meta) => {
            return {click: 'single'};
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
    cover_stop: {
        cluster: 'closuresWindowCovering',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            return {click: 'release'};
        },
    },
    cover_open: {
        cluster: 'closuresWindowCovering',
        type: 'commandUpOpen',
        convert: (model, msg, publish, options, meta) => {
            return {click: 'open'};
        },
    },
    cover_close: {
        cluster: 'closuresWindowCovering',
        type: 'commandDownClose',
        convert: (model, msg, publish, options, meta) => {
            return {click: 'close'};
        },
    },
    xiaomi_power: {
        cluster: 'genAnalogInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {power: precisionRound(msg.data['presentValue'], 2)};
        },
    },
    xiaomi_plug_state: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
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
    QBKG11LM_power: {
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
    QBKG12LM_LLKZMK11LM_power: {
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
    QBKG04LM_QBKG11LM_state: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
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
        convert: (model, msg, publish, options, meta) => {
            if (msg.endpoint.ID == 4) {
                return {action: msg.data['onOff'] === 1 ? 'release' : 'hold'};
            }
        },
    },
    QBKG04LM_QBKG11LM_operation_mode: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
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
        convert: (model, msg, publish, options, meta) => {
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
        convert: (model, msg, publish, options, meta) => {
            if ([1, 2].includes(msg.data.presentValue)) {
                const times = {1: 'single', 2: 'double'};
                return {click: times[msg.data.presentValue]};
            }
        },
    },
    QBKG12LM_click: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
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
    QBKG03LM_QBKG12LM_operation_mode: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
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
    ZNCLDJ11LM_ZNCLDJ12LM_curtain_options_output: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data['1025']) {
                const d1025 = msg.data['1025'];
                return {
                    options: { // next values update only when curtain finished initial setup and knows current position
                        reverse_direction: d1025[2]=='\u0001',
                        hand_open: d1025[5]=='\u0000',
                    },
                };
            }
        },
    },
    ZNCLDJ11LM_ZNCLDJ12LM_curtain_analog_output: {
        cluster: 'genAnalogOutput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
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
    heiman_smart_controller_emergency: {
        cluster: 'ssIasAce',
        type: 'commandEmergency',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'emergency'};
        },
    },
    TS0218_click: {
        cluster: 'ssIasAce',
        type: 'commandEmergency',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'click'};
        },
    },
    battery_200: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
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
    heiman_carbon_monoxide: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
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
    generic_power: {
        cluster: 'seMetering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
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
                result.energy = precisionRound(energy, 2);
            }

            return result;
        },
    },
    CC2530ROUTER_state: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {state: true, led_state: msg.data['onOff'] === 1};
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
    SP120_power: {
        cluster: 'haElectricalMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
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
    generic_battery: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('batteryPercentageRemaining')) {
                return {battery: msg.data['batteryPercentageRemaining']};
            }
        },
    },
    generic_battery_voltage: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('batteryVoltage')) {
                return {voltage: msg.data['batteryVoltage'] / 100};
            }
        },
    },
    cmd_move: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            ictcg1(model, msg, publish, options, 'move');
            const direction = msg.data.movemode === 1 ? 'left' : 'right';
            return {action: `rotate_${direction}`, rate: msg.data.rate};
        },
    },
    cmd_move_with_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            ictcg1(model, msg, publish, options, 'move');
            const direction = msg.data.movemode === 1 ? 'left' : 'right';
            return {action: `rotate_${direction}`, rate: msg.data.rate};
        },
    },
    cmd_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            const value = ictcg1(model, msg, publish, options, 'stop');
            return {action: `rotate_stop`, brightness: value};
        },
    },
    cmd_stop_with_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandStopWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            const value = ictcg1(model, msg, publish, options, 'stop');
            return {action: `rotate_stop`, brightness: value};
        },
    },
    cmd_move_to_level_with_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveToLevelWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            const value = ictcg1(model, msg, publish, options, 'level');
            const direction = msg.data.level === 0 ? 'left' : 'right';
            return {action: `rotate_${direction}_quick`, level: msg.data.level, brightness: value};
        },
    },
    iris_3320L_contact: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            return {contact: msg.data.zonestatus === 36};
        },
    },
    nue_power_state: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
            if (button) {
                const payload = {};
                payload[`state_${button}`] = msg.data['onOff'] === 1 ? 'ON' : 'OFF';
                return payload;
            }
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
    iaszone_occupancy_2: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
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
        convert: (model, msg, publish, options, meta) => {
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
        convert: (model, msg, publish, options, meta) => {
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
    st_button_state: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
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
    CTR_U_scene: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            return {click: `scene_${msg.data.groupid}_${msg.data.sceneid}`};
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
                    // "Eco" mode is translated into "auto" here
                    result.system_mode = common.thermostatSystemModes[1];
                    break;
                }
            }
            const piHeatingDemand = msg.data['pIHeatingDemand'];
            if (typeof piHeatingDemand == 'number') {
                result.operation = piHeatingDemand >= 10 ? 'heating' : 'idle';
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
    tint404011_on: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'on'};
        },
    },
    ts0043_click: {
        cluster: 'genOnOff',
        type: 'raw',
        convert: (model, msg, publish, options, meta) => {
            const buttonMapping = {1: 'right', 2: 'middle', 3: 'left'};
            const clickMapping = {0: 'single', 1: 'double', 2: 'hold'};
            return {action: `${buttonMapping[msg.endpoint.ID]}_${clickMapping[msg.data[3]]}`};
        },
    },
    ts0042_click: {
        cluster: 'genOnOff',
        type: 'raw',
        convert: (model, msg, publish, options, meta) => {
            const buttonMapping = {1: 'left', 2: 'right'};
            const clickMapping = {0: 'single', 1: 'double', 2: 'hold'};
            return {action: `${buttonMapping[msg.endpoint.ID]}_${clickMapping[msg.data[3]]}`};
        },
    },
    ts0041_click: {
        cluster: 'genOnOff',
        type: 'raw',
        convert: (model, msg, publish, options, meta) => {
            const clickMapping = {0: 'single', 1: 'double', 2: 'hold'};
            return {action: `${clickMapping[msg.data[3]]}`};
        },
    },
    tint404011_off: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'off'};
        },
    },
    tint404011_brightness_updown_click: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options, meta) => {
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
        convert: (model, msg, publish, options, meta) => {
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
        convert: (model, msg, publish, options, meta) => {
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
    SA003_on_off: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const last = store[msg.device.ieeeAddr];
            const current = msg.meta.zclTransactionSequenceNumber;

            if (msg.type === 'attributeReport') {
                msg.meta.frameControl.disableDefaultResponse = true;
            }

            if (last !== current && msg.data.hasOwnProperty('onOff')) {
                store[msg.device.ieeeAddr] = current;
                return {state: msg.data['onOff'] === 1 ? 'ON' : 'OFF'};
            }
        },
    },
    tint404011_scene: {
        cluster: 'genBasic',
        type: 'write',
        convert: (model, msg, publish, options, meta) => {
            return {action: `scene_${msg.data['16389']}`};
        },
    },
    tint404011_move_to_color_temp: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToColorTemp',
        convert: (model, msg, publish, options, meta) => {
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
        convert: (model, msg, publish, options, meta) => {
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
        convert: (model, msg, publish, options, meta) => {
            return {action: 'toggle'};
        },
    },
    E1524_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveToLevelWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'toggle_hold'};
        },
    },
    E1524_arrow_click: {
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
    E1524_arrow_hold: {
        cluster: 'genScenes',
        type: 'commandTradfriArrowHold',
        convert: (model, msg, publish, options, meta) => {
            const direction = msg.data.value === 3329 ? 'left' : 'right';
            store[msg.device.ieeeAddr] = direction;
            return {action: `arrow_${direction}_hold`};
        },
    },
    E1524_arrow_release: {
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
    E1524_brightness_up_click: {
        cluster: 'genLevelCtrl',
        type: 'commandStepWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            return {action: `brightness_up_click`};
        },
    },
    E1524_brightness_down_click: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options, meta) => {
            return {action: `brightness_down_click`};
        },
    },
    E1524_brightness_up_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            return {action: `brightness_up_hold`};
        },
    },
    E1524_brightness_up_release: {
        cluster: 'genLevelCtrl',
        type: 'commandStopWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            return {action: `brightness_up_release`};
        },
    },
    E1524_brightness_down_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            return {action: `brightness_down_hold`};
        },
    },
    E1524_brightness_down_release: {
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
    livolo_switch_state_raw: {
        cluster: 'genPowerCfg',
        type: ['raw'],
        convert: (model, msg, publish, options, meta) => {
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
        convert: (model, msg, publish, options, meta) => {
            return {action: 'on'};
        },
    },
    eria_81825_off: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'off'};
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
    ZYCT202_on: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'on', action_group: msg.groupID};
        },
    },
    ZYCT202_off: {
        cluster: 'genOnOff',
        type: 'commandOffWithEffect',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'off', action_group: msg.groupID};
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
    cover_position_via_brightness: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const currentLevel = msg.data['currentLevel'];
            const position = Math.round(Number(currentLevel) / 2.55).toString();
            const state = position > 0 ? 'OPEN' : 'CLOSE';
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
    keen_home_smart_vent_pressure: {
        cluster: 'msPressureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            // '{"cid":"msPressureMeasurement","data":{"32":990494}}'
            const pressure = parseFloat(msg.data['32']) / 1000.0;
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
    cover_position_tilt: {
        cluster: 'closuresWindowCovering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
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
    cover_position_tilt_inverted: {
        cluster: 'closuresWindowCovering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            // ZigBee officially expects "open" to be 0 and "closed" to be 100 whereas
            // HomeAssistant etc. work the other way round.
            // But e.g. Legrand reports "open" to be 100 and "closed" to be 0
            if (msg.data.hasOwnProperty('currentPositionLiftPercentage')) {
                const liftPercentage = msg.data['currentPositionLiftPercentage'];
                result.position = liftPercentage <= 100 ? liftPercentage : null;
            }
            if (msg.data.hasOwnProperty('currentPositionTiltPercentage')) {
                const tiltPercentage = msg.data['currentPositionTiltPercentage'];
                result.tilt = tiltPercentage <= 100 ? tiltPercentage : null;
            }
            return result;
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
    GIRA2430_scene_click: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            return {
                action: `select_${msg.data.sceneid}`,
            };
        },
    },
    GIRA2430_on_click: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'on'};
        },
    },
    GIRA2430_off_click: {
        cluster: 'genOnOff',
        type: 'commandOffWithEffect',
        convert: (model, msg, publish, options, meta) => {
            return {action: 'off'};
        },
    },
    GIRA2430_down_hold: {
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
    GIRA2430_up_hold: {
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
    GIRA2430_stop: {
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
    ZGRC013_cmdOn: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            const button = msg.endpoint.ID;
            if (button) {
                return {click: `${button}_on`};
            }
        },
    },
    ZGRC013_cmdOff: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options, meta) => {
            const button = msg.endpoint.ID;
            if (button) {
                return {click: `${button}_off`};
            }
        },
    },
    ZGRC013_brightness: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
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
        convert: (model, msg, publish, options, meta) => {
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
        convert: (model, msg, publish, options, meta) => {
            const button = msg.endpoint.ID;
            if (button) {
                return {click: `${button}_stop`};
            }
        },
    },
    ZGRC013_scene: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            return {click: `scene_${msg.data.groupid}_${msg.data.sceneid}`};
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
    konke_click: {
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
    E1746_linkquality: {
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
    ptvo_switch_buttons: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
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
    terncy_temperature: {
        cluster: 'msTemperatureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const temperature = parseFloat(msg.data['measuredValue']) / 10.0;
            return {temperature: calibrateAndPrecisionRoundOptions(temperature, options, 'temperature')};
        },
    },
    terncy_raw: {
        cluster: 'manuSpecificClusterAduroSmart',
        type: 'raw',
        convert: (model, msg, publish, options, meta) => {
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
            let lookup = {};
            if (msg.data[4] == 0) {
                value = msg.data[6];
                lookup = {
                    1: {click: 'single'},
                    2: {click: 'double'},
                    3: {click: 'triple'},
                };
            } else if (msg.data[4] == 4) {
                value = msg.data[7];
                lookup = {
                    5: {occupancy: true, side: 'right'},
                    7: {occupancy: true, side: 'right'},
                    40: {occupancy: true, side: 'left'},
                    56: {occupancy: true, side: 'left'},
                };
            }
            return lookup[value] ? lookup[value] : null;
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
    CCTSwitch_D0001_on_off: {
        cluster: 'genOnOff',
        type: ['commandOn', 'commandOff'],
        convert: (model, msg, publish, options, meta) => {
            const cmd = msg.type === 'commandOn' ? 'on' : 'off';
            return {click: 'power', action: cmd};
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
                result['ALG'] = data.slice(1).join(',');
            } else if (data[0] === 'ADC') {
                // TODO What is ADC
                result['ADC'] = data.slice(1).join(',');
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
    legrand_master_switch_scenes: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            let action = 'default';
            if (msg.data.groupid === 0xfff7) action = 'enter';
            if (msg.data.groupid === 0xfff6) action = 'leave';
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
    tuya_dimmer: {
        cluster: 'manuSpecificTuyaDimmer',
        type: 'commandGetData',
        convert: (model, msg, publish, options, meta) => {
            const key = msg.data.dp;
            const val = msg.data.data;
            if (key === 257) {
                return {state: (val[0]) ? 'ON': 'OFF'};
            } else {
                const level = val[2]*256 + val[3];
                const normalised = (level - 10) / (1000 - 10);
                return {brightness: (normalised * 254).toFixed(2), level: level};
            }
        },
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
