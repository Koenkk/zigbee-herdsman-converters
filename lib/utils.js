'use strict';

function isLegacyEnabled(options) {
    return !options.hasOwnProperty('legacy') || options.legacy;
}

function precisionRound(number, precision) {
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
}

function toLocalISOString(dDate) {
    const tzOffset = -dDate.getTimezoneOffset();
    const plusOrMinus = tzOffset >= 0 ? '+' : '-';
    const pad = function(num) {
        const norm = Math.floor(Math.abs(num));
        return (norm < 10 ? '0' : '') + norm;
    };

    return dDate.getFullYear() +
        '-' + pad(dDate.getMonth() + 1) +
        '-' + pad(dDate.getDate()) +
        'T' + pad(dDate.getHours()) +
        ':' + pad(dDate.getMinutes()) +
        ':' + pad(dDate.getSeconds()) +
        plusOrMinus + pad(tzOffset / 60) +
        ':' + pad(tzOffset % 60);
}

function numberWithinRange(number, min, max) {
    if (number > max) {
        return max;
    } else if (number < min) {
        return min;
    } else {
        return number;
    }
}

const transactionStore = {};
function hasAlreadyProcessedMessage(msg, ID=null, key=null) {
    const currentID = ID !== null ? ID : msg.meta.zclTransactionSequenceNumber;
    key = key || msg.device.ieeeAddr;
    if (transactionStore[key] === currentID) return true;
    transactionStore[key] = currentID;
    return false;
}

const defaultPrecision = {temperature: 2, humidity: 2, pressure: 1};
function calibrateAndPrecisionRoundOptions(number, options, type) {
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
}

function toPercentage(value, min, max) {
    if (value > max) {
        value = max;
    } else if (value < min) {
        value = min;
    }

    const normalised = (value - min) / (max - min);
    return Math.round(normalised * 100);
}

function addActionGroup(payload, msg, definition) {
    const disableActionGroup = definition.meta && definition.meta.disableActionGroup;
    if (!disableActionGroup && msg.groupID) {
        payload.action_group = msg.groupID;
    }
}

function postfixWithEndpointName(value, msg, definition) {
    if (definition.meta && definition.meta.multiEndpoint) {
        const endpointName = definition.hasOwnProperty('endpoint') ?
            getKey(definition.endpoint(msg.device), msg.endpoint.ID) : msg.endpoint.ID;
        return `${value}_${endpointName}`;
    } else {
        return value;
    }
}

function getKey(object, value, fallback, convertTo) {
    for (const key in object) {
        if (object[key]===value) {
            return convertTo ? convertTo(key) : key;
        }
    }

    return fallback;
}

function batteryVoltageToPercentage(voltage, option) {
    let percentage = null;
    if (option === '3V_2100') {
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
        percentage = Math.round(percentage);
    } else if (option === '3V_2500') {
        percentage = toPercentage(voltage, 2500, 3000);
    } else if (option === '3V_2500_3200') {
        percentage = toPercentage(voltage, 2500, 3200);
    } else if (option === '4LR6AA1_5v') {
        percentage = toPercentage(voltage, 3000, 4200);
    } else {
        throw new Error(`Not batteryVoltageToPercentage type supported: ${option}`);
    }

    return percentage;
}

// groupStrategy: allEqual: return only if all members in the groups have the same meta property value.
//                first: return the first property
function getMetaValue(entity, definition, key, groupStrategy='first', defaultValue=undefined) {
    if (entity.constructor.name === 'Group' && entity.members.length > 0) {
        const values = [];
        for (let i = 0; i < entity.members.length; i++) {
            const memberMetaMeta = getMetaValues(definition[i], entity.members[i]);
            if (memberMetaMeta && memberMetaMeta.hasOwnProperty(key)) {
                if (groupStrategy === 'first') {
                    return memberMetaMeta[key];
                }

                values.push(memberMetaMeta[key]);
            } else {
                values.push(defaultValue);
            }
        }

        if (groupStrategy === 'allEqual' && (new Set(values)).size === 1) {
            return values[0];
        }
    } else {
        const definitionMeta = getMetaValues(definition, entity);
        if (definitionMeta && definitionMeta.hasOwnProperty(key)) {
            return definitionMeta[key];
        }
    }

    return defaultValue;
}

/**
 * From: https://github.com/usolved/cie-rgb-converter/blob/master/cie_rgb_converter.js
 * Converts RGB color space to CIE color space
 * @param {Number} red
 * @param {Number} green
 * @param {Number} blue
 * @return {Array} Array that contains the CIE color values for x and y
 */
function rgbToXY(red, green, blue) {
    // Apply a gamma correction to the RGB values, which makes the color
    // more vivid and more the like the color displayed on the screen of your device
    const rgb = gammaCorrectRGB(red, green, blue);

    // RGB values to XYZ using the Wide RGB D65 conversion formula
    const X = rgb.r * 0.664511 + rgb.g * 0.154324 + rgb.b * 0.162028;
    const Y = rgb.r * 0.283881 + rgb.g * 0.668433 + rgb.b * 0.047685;
    const Z = rgb.r * 0.000088 + rgb.g * 0.072310 + rgb.b * 0.986039;

    // Calculate the xy values from the XYZ values
    let x = (X / (X + Y + Z)).toFixed(4);
    let y = (Y / (X + Y + Z)).toFixed(4);

    if (isNaN(x)) {
        x = 0;
    }

    if (isNaN(y)) {
        y = 0;
    }

    return {x: Number.parseFloat(x), y: Number.parseFloat(y)};
}

function gammaCorrectRGB(r, g, b) {
    // The RGB values should be between 0 and 1. So convert them.
    // The RGB color (255, 0, 100) becomes (1.0, 0.0, 0.39)
    r /= 255; g /= 255; b /= 255;

    r = (r > 0.04045) ? Math.pow((r + 0.055) / (1.0 + 0.055), 2.4) : (r / 12.92);
    g = (g > 0.04045) ? Math.pow((g + 0.055) / (1.0 + 0.055), 2.4) : (g / 12.92);
    b = (b > 0.04045) ? Math.pow((b + 0.055) / (1.0 + 0.055), 2.4) : (b / 12.92);

    return {r: Math.round(r*255), g: Math.round(g*255), b: Math.round(b*255)};
}

function hsvToRgb(h, s, v) {
    h = h % 360 / 360;
    s = s / 100;
    v = v / 100;

    let r; let g; let b;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
    }
    return {r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255)};
}

function rgbToHSV(r, g, b) {
    if (arguments.length === 1) {
        g = r.g, b = r.b, r = r.r;
    }
    const max = Math.max(r, g, b); const min = Math.min(r, g, b);
    const d = max - min;
    let h;
    const s = (max === 0 ? 0 : d / max);
    const v = max / 255;

    switch (max) {
    case min: h = 0; break;
    case r: h = (g - b) + d * (g < b ? 6: 0); h /= 6 * d; break;
    case g: h = (b - r) + d * 2; h /= 6 * d; break;
    case b: h = (r - g) + d * 4; h /= 6 * d; break;
    }

    return {h: (h * 360).toFixed(3), s: (s * 100).toFixed(3), v: (v * 100).toFixed(3)};
}

function gammaCorrectHSV(h, s, v) {
    return rgbToHSV(
        ...Object.values(gammaCorrectRGB(
            ...Object.values(hsvToRgb(h, s, v)))));
}


function hexToXY(hex) {
    const rgb = hexToRgb(hex);
    return rgbToXY(rgb.r, rgb.g, rgb.b);
}

function miredsToKelvin(mireds) {
    return 1000000 / mireds;
}

const kelvinToXyLookup = require('./kelvinToXy');
function miredsToXY(mireds) {
    const kelvin = miredsToKelvin(mireds);
    return kelvinToXyLookup[Math.round(kelvin)];
}

function kelvinToMireds(kelvin) {
    return 1000000 / kelvin;
}

function xyToMireds(x, y) {
    const n = (x-0.3320)/(0.1858-y);
    const kelvin = 437*n^3 + 3601*n^2 + 6861*n + 5517;
    return Math.round(kelvinToMireds(Math.abs(kelvin)));
}

function hslToHSV(h, s, l) {
    h = h % 360;
    s = s / 100;
    l = l / 100;
    const retH = h;
    const retV = s * Math.min(l, 1-l) + l;
    const retS = retV ? 2-2*l/retV : 0;
    return {h: retH, s: retS, v: retV};
}

function hexToRgb(hex) {
    hex = hex.replace('#', '');
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return {r: r, g: g, b: b};
}

/**
 * interpolates hue value based on correction map through ranged linear interpolation
 * @param {Number} hue hue to be corrected
 * @param {Array} correctionMap array of hueIn -> hueOut mappings; example: [ {"in": 20, "out": 25}, {"in": 109, "out": 104}]
 * @return {Number} corrected hue value
 */
function interpolateHue(hue, correctionMap) {
    if (correctionMap.length < 2) return hue;

    // retain immutablity
    const clonedCorrectionMap = [...correctionMap];

    // reverse sort calibration map and find left edge
    clonedCorrectionMap.sort((a, b) => b.in - a.in);
    const correctionLeft = clonedCorrectionMap.find((m) => m.in <= hue) || {'in': 0, 'out': 0};

    // sort calibration map and find right edge
    clonedCorrectionMap.sort((a, b) => a.in - b.in);
    const correctionRight = clonedCorrectionMap.find((m) => m.in > hue) || {'in': 359, 'out': 359};

    const ratio = 1 - (correctionRight.in - hue) / (correctionRight.in - correctionLeft.in);
    return Math.round(correctionLeft.out + ratio * (correctionRight.out - correctionLeft.out));
}

function hasEndpoints(device, endpoints) {
    const eps = device.endpoints.map((e) => e.ID);
    for (const endpoint of endpoints) {
        if (!eps.includes(endpoint)) {
            return false;
        }
    }
    return true;
}

function isInRange(min, max, value) {
    return value >= min && value <= max;
}

function replaceInArray(arr, oldElements, newElements) {
    const clone = [...arr];
    for (let i = 0; i < oldElements.length; i++) {
        const index = clone.indexOf(oldElements[i]);

        if (index !== -1) {
            clone[index] = newElements[i];
        } else {
            throw new Error('Element not in array');
        }
    }

    return clone;
}

function filterObject(obj, keys) {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        if (keys.includes(key)) {
            result[key] = value;
        }
    }
    return result;
}

async function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function toSnakeCase(value) {
    if (typeof value === 'object') {
        for (const key of Object.keys(value)) {
            const keySnakeCase = toSnakeCase(key);
            if (key !== keySnakeCase) {
                value[keySnakeCase] = value[key];
                delete value[key];
            }
        }
        return value;
    } else {
        return value.replace(/\.?([A-Z])/g, (x, y) => '_' + y.toLowerCase()).replace(/^_/, '').replace('_i_d', '_id');
    }
}

function toCamelCase(value) {
    if (typeof value === 'object') {
        for (const key of Object.keys(value)) {
            const keyCamelCase = toCamelCase(key);
            if (key !== keyCamelCase) {
                value[keyCamelCase] = value[key];
                delete value[key];
            }
        }
        return value;
    } else {
        return value.replace(/_([a-z])/g, (x, y) => y.toUpperCase());
    }
}

function saveSceneState(entity, sceneID, groupID, state) {
    const attributes = ['state', 'color_temp', 'brightness', 'color'];
    if (!entity.meta.hasOwnProperty('scenes')) entity.meta.scenes = {};
    const metaKey = `${sceneID}_${groupID}`;
    entity.meta.scenes[metaKey] = {state: filterObject(state, attributes)};
    entity.save();
}

function getEntityOrFirstGroupMember(entity) {
    if (entity.constructor.name === 'Group') {
        return entity.members.length > 0 ? entity.members[0] : null;
    } else {
        return entity;
    }
}

function getTransition(entity, key, meta) {
    const {options, message} = meta;

    let manufacturerIDs = [];
    if (entity.constructor.name === 'Group') {
        manufacturerIDs = entity.members.map((m) => m.getDevice().manufacturerID);
    } else if (entity.constructor.name === 'Endpoint') {
        manufacturerIDs = [entity.getDevice().manufacturerID];
    }

    if (manufacturerIDs.includes(4476)) {
        /**
         * When setting both brightness and color temperature with a transition, the brightness is skipped
         * for IKEA TRADFRI bulbs.
         * To workaround this we skip the transition for the brightness as it is applied first.
         * https://github.com/Koenkk/zigbee2mqtt/issues/1810
         */
        if (key === 'brightness' && (message.hasOwnProperty('color') || message.hasOwnProperty('color_temp'))) {
            return {time: 0, specified: false};
        }
    }

    if (message.hasOwnProperty('transition')) {
        return {time: message.transition * 10, specified: true};
    } else if (options.hasOwnProperty('transition')) {
        return {time: options.transition * 10, specified: true};
    } else {
        return {time: 0, specified: false};
    }
}

function getOptions(definition, entity, options={}) {
    const allowed = ['disableDefaultResponse', 'timeout'];
    return getMetaValues(definition, entity, allowed, options);
}

function getMetaValues(definition, entity, allowed, options={}) {
    const result = {...options};
    if (definition && definition.meta) {
        for (const key of Object.keys(definition.meta)) {
            if (allowed == null || allowed.includes(key)) {
                const value = definition.meta[key];
                result[key] = typeof value === 'function' ? value(entity) : value;
            }
        }
    }

    return result;
}

const correctHue = (hue, meta) => {
    const {options} = meta;
    if (options.hasOwnProperty('hue_correction')) {
        return interpolateHue(hue, options.hue_correction);
    } else {
        return hue;
    }
};

function validateValue(value, allowed) {
    if (!allowed.includes(value)) {
        throw new Error(`'${value}' not allowed, choose between: ${allowed}`);
    }
}

module.exports = {
    correctHue,
    getOptions,
    isLegacyEnabled,
    precisionRound,
    toLocalISOString,
    numberWithinRange,
    hasAlreadyProcessedMessage,
    calibrateAndPrecisionRoundOptions,
    toPercentage,
    addActionGroup,
    postfixWithEndpointName,
    getKey,
    batteryVoltageToPercentage,
    getEntityOrFirstGroupMember,
    getTransition,
    getMetaValue,
    rgbToXY,
    validateValue,
    hexToXY,
    hexToRgb,
    hsvToRgb,
    hslToHSV,
    interpolateHue,
    hasEndpoints,
    miredsToXY,
    xyToMireds,
    gammaCorrectHSV,
    gammaCorrectRGB,
    isInRange,
    replaceInArray,
    filterObject,
    saveSceneState,
    sleep,
    toSnakeCase,
    toCamelCase,
};
