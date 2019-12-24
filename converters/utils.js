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
    // The RGB values should be between 0 and 1. So convert them.
    // The RGB color (255, 0, 100) becomes (1.0, 0.0, 0.39)
    red /= 255; green /= 255; blue /= 255;

    // Apply a gamma correction to the RGB values, which makes the color
    // more vivid and more the like the color displayed on the screen of your device
    red = (red > 0.04045) ? Math.pow((red + 0.055) / (1.0 + 0.055), 2.4) : (red / 12.92);
    green = (green > 0.04045) ? Math.pow((green + 0.055) / (1.0 + 0.055), 2.4) : (green / 12.92);
    blue = (blue > 0.04045) ? Math.pow((blue + 0.055) / (1.0 + 0.055), 2.4) : (blue / 12.92);

    // RGB values to XYZ using the Wide RGB D65 conversion formula
    const X = red * 0.664511 + green * 0.154324 + blue * 0.162028;
    const Y = red * 0.283881 + green * 0.668433 + blue * 0.047685;
    const Z = red * 0.000088 + green * 0.072310 + blue * 0.986039;

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

// Input numbers between 0-1
function hsvToRGB(h, s, v) {
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
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

function hsToXY(hue, saturation) {
    // Divide hue by 360^2, hsvToRGB function accepts numbers between 0-1
    hue /= (65535 / 129600); saturation /= (65535 / 129600);
    return rgbToXY(hsvToRGB(hue, saturation, 1));
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

function hexToRgb(hex) {
    hex = hex.replace('#', '');
    const bigint = parseInt(hex, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;

    return {r: r, g: g, b: b};
}

function getKeyByValue(object, value, fallback) {
    const key = Object.keys(object).find((k) => object[k] === value);
    return key != null ? Number(key) : (fallback || 0);
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

module.exports = {
    rgbToXY,
    hsToXY,
    hexToXY,
    hexToRgb,
    getKeyByValue,
    hasEndpoints,
    miredsToXY,
    xyToMireds,
};
