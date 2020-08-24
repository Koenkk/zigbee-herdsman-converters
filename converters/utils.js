'use strict';

const kelvinToXyLookup = require('./lookup/kelvinToXy');

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
    const Y = rgb.r * 0.283881 + rgb.g * 0.668433 + blue * 0.047685;
    const Z = rgb.r * 0.000088 + rgb.g * 0.072310 + blue * 0.986039;

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

    return {r: Math.round(r*255),
        g: Math.round(g*255),
        b: Math.round(b*255)};
}

function hsvToRGB(h, s, v) {
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
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255),
    };
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

    return {
        h: (h * 360).toFixed(3),
        s: (s * 100).toFixed(3),
        v: (v * 100).toFixed(3),
    };
}

function gammaCorrectHSV(h, s, v) {
    return rgbToHSV(
        ...Object.values(gammaCorrectRGB(
            ...Object.values(hsvToRGB(h, s, v)))));
}


function hexToXY(hex) {
    const rgb = hexToRgb(hex);
    return rgbToXY(rgb.r, rgb.g, rgb.b);
}

function miredsToKelvin(mireds) {
    return 1000000 / mireds;
}

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

function getKeyByValue(object, value, fallback) {
    const key = Object.keys(object).find((k) => object[k] === value);
    return key != null ? Number(key) : fallback;
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

const getRandomInt = (min, max) =>
    Math.floor(Math.random() * (max - min)) + min;

const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
    // Destructuring "chunks" is needed because it's a Buffer
    // and we need a simple array.
    let value = 0;
    for (let i = 0; i < chunks.length; i++) {
        value = value << 8;
        value += chunks[i];
    }
    return value;
};

const convertDecimalValueTo2ByteHexArray = (value) => {
    const hexValue = Number(value).toString(16).padStart(4, '0');
    const chunk1 = hexValue.substr(0, 2);
    const chunk2 = hexValue.substr(2);
    return [chunk1, chunk2].map((hexVal) => parseInt(hexVal, 16));
};

const replaceInArray = (arr, oldElements, newElements) => {
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
};

async function getDoorLockPinCode(entity, user, options = null) {
    await entity.command(
        'closuresDoorLock',
        'getPinCode',
        {
            'userid': user,
        },
        options | {});
}

// groupStrategy: allEqual: return only if all members in the groups have the same meta property value.
//                first: return the first property
function getMetaValue(entity, definition, key, groupStrategy='first') {
    if (entity.constructor.name === 'Group' && entity.members.length > 0) {
        const values = [];
        for (const memberMeta of definition) {
            if (memberMeta.meta && memberMeta.meta.hasOwnProperty(key)) {
                if (groupStrategy === 'first') {
                    return memberMeta.meta[key];
                }

                values.push(memberMeta.meta[key]);
            } else {
                values.push(undefined);
            }
        }

        if (groupStrategy === 'allEqual' && (new Set(values)).size === 1) {
            return values[0];
        }
    } else if (definition && definition.meta && definition.meta.hasOwnProperty(key)) {
        return definition.meta[key];
    }

    return undefined;
}

module.exports = {
    rgbToXY,
    hexToXY,
    hexToRgb,
    hslToHSV,
    getKeyByValue,
    interpolateHue,
    hasEndpoints,
    miredsToXY,
    xyToMireds,
    gammaCorrectHSV,
    gammaCorrectRGB,
    getRandomInt,
    isInRange,
    convertMultiByteNumberPayloadToSingleDecimalNumber,
    convertDecimalValueTo2ByteHexArray,
    replaceInArray,
    getDoorLockPinCode,
    getMetaValue,
};
