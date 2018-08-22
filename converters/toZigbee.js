'use strict';

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

const converters = {
    factory_reset: {
        key: 'reset',
        attr: [],
        convert: (value, message) => {
            return {
                cid: 'genBasic',
                cmd: 'resetFactDefault',
                zclData: {},
            };
        },
    },
    onoff: {
        key: 'state',
        attr: ['onOff'],
        convert: (value, message) => {
            return {
                cid: 'genOnOff',
                cmd: value.toLowerCase(),
                zclData: {},
            };
        },
    },
    light_brightness: {
        key: 'brightness',
        attr: ['currentLevel'],
        convert: (value, message) => {
            return {
                cid: 'genLevelCtrl',
                cmd: 'moveToLevel',
                zclData: {
                    level: value,
                    transtime: message.hasOwnProperty('transition') ? message.transition * 10 : 0,
                },
            };
        },
    },
    light_colortemp: {
        key: 'color_temp',
        attr: ['colorTemperature'],
        convert: (value, message) => {
            return {
                cid: 'lightingColorCtrl',
                cmd: 'moveToColorTemp',
                zclData: {
                    colortemp: value,
                    transtime: message.hasOwnProperty('transition') ? message.transition * 10 : 0,
                },
            };
        },
    },
    light_color: {
        key: 'color',
        attr: ['currentX', 'currentY'],
        convert: (value, message) => {
            // Check if we need to convert from RGB to XY.
            if (value.hasOwnProperty('r') && value.hasOwnProperty('g') && value.hasOwnProperty('b')) {
                const xy = rgbToXY(value.r, value.g, value.b);
                value.x = xy.x;
                value.y = xy.y;
            }

            return {
                cid: 'lightingColorCtrl',
                cmd: 'moveToColor',
                zclData: {
                    colorx: value.x * 65535,
                    colory: value.y * 65535,
                    transtime: message.hasOwnProperty('transition') ? message.transition * 10 : 0,
                },
            };
        },
    },
    thermostat_occupiedHeatingSetpoint: {
        key: 'temperature',
        attr: ['occupiedHeatingSetpoint'],
        convert: (value, message) => {
            const degrees = (Math.round(value.temperature) * 100).toString(16);
            return {
                cid: 'hvacThermostat',
                cmd: 'occupiedHeatingSetpoint',
                zclData: {
                    temperature: degrees,
                },
            };
        },
    },
    // Ignore converters
    ignore_transition: {
        key: 'transition',
        attr: [],
        convert: (value, message) => null,
    },
};

module.exports = converters;
