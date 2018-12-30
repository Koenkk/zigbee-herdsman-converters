'use strict';

const debounce = require('debounce');

const clickLookup = {
    1: 'single',
    2: 'double',
    3: 'triple',
    4: 'quadruple',
};

const occupancyTimeout = 90; // In seconds

const voltageMap = [
    [2000, 0],
    [2186, 1],
    [2373, 2],
    [2563, 3],
    [2626, 4],
    [2675, 5],
    [2717, 6],
    [2753, 7],
    [2784, 8],
    [2813, 9],
    [2838, 10],
    [2859, 11],
    [2875, 12],
    [2891, 13],
    [2905, 14],
    [2915, 15],
    [2921, 16],
    [2926, 17],
    [2931, 18],
    [2936, 19],
    [2939, 20],
    [2942, 21],
    [2945, 22],
    [2949, 23],
    [2951, 24],
    [2953, 25],
    [2955, 26],
    [2957, 27],
    [2959, 28],
    [2961, 29],
    [2964, 30],
    [2966, 31],
    [2968, 32],
    [2969, 33],
    [2971, 34],
    [2973, 35],
    [2974, 36],
    [2976, 37],
    [2978, 38],
    [2980, 39],
    [2982, 40],
    [2984, 41],
    [2986, 42],
    [2988, 43],
    [2990, 44],
    [2991, 46],
    [2992, 48],
    [2993, 49],
    [2994, 51],
    [2995, 53],
    [2996, 55],
    [2997, 57],
    [2998, 59],
    [2999, 61],
    [3000, 64],
    [3001, 66],
    [3002, 69],
    [3003, 77],
    [3004, 90],
    [3005, 98],
    [3028, 99],
    [3211, 100],
    [Infinity, 100],
];

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
                for (let i = 0; i < voltageMap.length; i++) {
                    if (voltageMap[i][0] > voltage) {
                        return {
                            battery: parseFloat(voltageMap[i][1].toFixed(2)),
                            voltage: voltage,
                        };
                    }
                }
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
            return {humidity: precisionRoundOptions(humidity, options, 'humidity')};
        },
    },
    generic_occupancy: {
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
            if (msg.data.data['1285']) {
                const data = msg.data.data['1285'];
                result.unknown_data = data;
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
    STS_PRS_251_battery: {
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
            return {battery: precisionRound(msg.data.data['batteryPercentageRemaining'], 2) / 2};
        },
    },
    ICTC_G_1_move: {
        cid: 'genLevelCtrl',
        type: 'cmdMove',
        convert: (model, msg, publish, options) => ictcg1(model, msg, publish, options, 'move'),
    },
    ICTC_G_1_moveWithOnOff: {
        cid: 'genLevelCtrl',
        type: 'cmdMoveWithOnOff',
        convert: (model, msg, publish, options) => ictcg1(model, msg, publish, options, 'move'),
    },
    ICTC_G_1_stop: {
        cid: 'genLevelCtrl',
        type: 'cmdStop',
        convert: (model, msg, publish, options) => ictcg1(model, msg, publish, options, 'stop'),
    },
    ICTC_G_1_stopWithOnOff: {
        cid: 'genLevelCtrl',
        type: 'cmdStopWithOnOff',
        convert: (model, msg, publish, options) => ictcg1(model, msg, publish, options, 'stop'),
    },
    ICTC_G_1_moveToLevelWithOnOff: {
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
                contact: (zoneStatus & 1) > 0,
            };
        },
    },
    ias_contact_status_change: {
        cid: 'ssIasZone',
        type: 'statusChange',
        convert: (model, msg, publish, options) => {
            const zoneStatus = msg.data.zoneStatus;
            return {
                contact: (zoneStatus & 1) > 0,
            };
        },
    },
    thermostat_devChange: {
        cid: 'hvacThermostat',
        type: 'devChange',
        convert: (model, msg, publish, options) => {
            return {
                localTemp: precisionRound(msg.data.data.localTemp, 2) / 100,
                occupiedHeatingSetpoint: precisionRound(msg.data.data.occupiedHeatingSetpoint, 2) / 100,
                setpointChangeSource: msg.data.data.setpointChangeSource,
                setpointChangeAmount: msg.data.data.setpointChangeAmount / 100,
                setpointChangeSourceTimeStamp: msg.data.data.setpointChangeSourceTimeStamp,
            };
        },
    },
    thermostat_attReport: {
        cid: 'hvacThermostat',
        type: 'attReport',
        convert: (model, msg, publish, options) => {
            return {
                localTemp: precisionRound(msg.data.data.localTemp, 2) / 100,
                occupiedHeatingSetpoint: precisionRound(msg.data.data.occupiedHeatingSetpoint, 2) / 100,
                setpointChangeSource: msg.data.data.setpointChangeSource,
                setpointChangeAmount: msg.data.data.setpointChangeAmount / 100,
                setpointChangeSourceTimeStamp: msg.data.data.setpointChangeSourceTimeStamp,
            };
        },
    },
    // Ignore converters (these message dont need parsing).
    // ignore_hvacThermostat_change: {
    //     cid: 'hvacThermostat',
    //     type: 'devChange',
    //     convert: (model, msg, publish, options) => null,
    // },
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
};

module.exports = converters;
