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

function hexToXY(hex) {
    const rgb = hexToRgb(hex);
    return rgbToXY(rgb.r, rgb.g, rgb.b);
}

function hslToXY(hsl) {
    const rgb = hslToRgb(hsl);
    return rgbToXY(rgb.r, rgb.g, rgb.b);
}

function hsvToXY(hsv) {
    const rgb = hsvToRgb(hsv);
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

/**
 * From: https://www.rapidtables.com/convert/color/hsl-to-rgb.html
 * Converts HSL color space to RGB color space
 * @param {String} hsl
 * @return {Array} Array that contains the CIE color values for r, g and b
 */
function hslToRgb(hsl) {
    const arHsl = hsl.split(',');
    const h = arHsl[0] % 360;
    const s = arHsl[1] / 100;
    const l = arHsl[2] / 100;

    const C = (1 - Math.abs(2*l - 1)) * s;
    const X = C * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - C/2;

    let r2;
    let g2;
    let b2;
    if (h >= 0 && h < 60) {
        r2 = C;
        g2 = X;
        b2 = 0;
    } else if (h >= 60 && h < 120) {
        r2 = X;
        g2 = C;
        b2 = 0;
    } else if (h >= 120 && h < 180) {
        r2 = 0;
        g2 = C;
        b2 = X;
    } else if (h >= 180 && h < 240) {
        r2 = 0;
        g2 = X;
        b2 = C;
    } else if (h >= 240 && h < 300) {
        r2 = X;
        g2 = 0;
        b2 = C;
    } else if (h >= 300 && h < 360) {
        r2 = C;
        g2 = 0;
        b2 = X;
    }

    const r = Math.round((r2+m)*255);
    const g = Math.round((g2+m)*255);
    const b = Math.round((b2+m)*255);

    return {r: r, g: g, b: b};
}


/**
 * From: https://www.rapidtables.com/convert/color/hsv-to-rgb.html
 * Converts HSV/HSB color space to RGB color space
 * @param {String} hsv
 * @return {Array} Array that contains the CIE color values for r, g and b
 */
function hsvToRgb(hsv) {
    const arHsv = hsv.split(',');
	const h = arHsv[0] % 360;
	const s = arHsv[1] / 100;
	const v = arHsv[2] / 100;

	const C = v * s;
	const X = C * (1 - Math.abs((h / 60) % 2 - 1));
	const m = v - C;

	let r2;
	let g2;
	let b2;
	if (h >= 0 && h < 60) {
		r2 = C;
		g2 = X;
		b2 = 0;
	} else if (h >= 60 && h < 120) {
		r2 = X;
		g2 = C;
		b2 = 0;
	} else if (h >= 120 && h < 180) {
		r2 = 0;
		g2 = C;
		b2 = X;
	} else if (h >= 180 && h < 240) {
		r2 = 0;
		g2 = X;
		b2 = C;
	} else if (h >= 240 && h < 300) {
		r2 = X;
		g2 = 0;
		b2 = C;
	} else if (h >= 300 && h < 360) {
		r2 = C;
		g2 = 0;
		b2 = X;
	}

	const r = Math.round((r2+m)*255);
	const g = Math.round((g2+m)*255);
	const b = Math.round((b2+m)*255);

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
    hexToXY,
    hexToRgb,
    hslToXY,
    hslToRgb,
    hsvToXY,
    hsvToRgb,
    getKeyByValue,
    hasEndpoints,
    miredsToXY,
    xyToMireds,
};
