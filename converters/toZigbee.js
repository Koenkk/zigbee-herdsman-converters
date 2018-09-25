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
                type: 'functional',
                zclData: {},
                cfg: {
                    manufSpec: 0,
                    disDefaultRsp: 0,
                },
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
                type: 'functional',
                zclData: {},
                cfg: {
                    manufSpec: 0,
                    disDefaultRsp: 0,
                },
            };
        },
    },
    light_brightness: {
        key: 'brightness',
        attr: ['currentLevel', 'onOff'],
        convert: (value, message) => {
            return {
                cid: 'genLevelCtrl',
                cmd: 'moveToLevelWithOnOff',
                type: 'functional',
                zclData: {
                    level: value,
                    transtime: message.hasOwnProperty('transition') ? message.transition * 10 : 0,
                },
                cfg: {
                    manufSpec: 0,
                    disDefaultRsp: 0,
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
                type: 'functional',
                zclData: {
                    colortemp: value,
                    transtime: message.hasOwnProperty('transition') ? message.transition * 10 : 0,
                },
                cfg: {
                    manufSpec: 0,
                    disDefaultRsp: 0,
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
                type: 'functional',
                zclData: {
                    colorx: value.x * 65535,
                    colory: value.y * 65535,
                    transtime: message.hasOwnProperty('transition') ? message.transition * 10 : 0,
                },
                cfg: {
                    manufSpec: 0,
                    disDefaultRsp: 0,
                },
            };
        },
    },
    /* Note when send the command to set sensitivity, press button on the device to make it wakeup*/
    DJT11LM_vibration_sensitivity: {
        key: 'sensitivity',
        attr: ['level'],
        convert: (value, message) => {
            const lookup = {
                'low': 0x15,
                'medium': 0x0B,
                'high': 0x01,
            };

            return {
                cid: 'genBasic',
                cmd: 'write',
                type: 'foundation',
                zclData: {
                    attrId: 0xFF0D,
                    dataType: 0x20,
                    attrData: lookup[value],
                },
                cfg: {
                    manufSpec: 1,
                    disDefaultRsp: 1,
                    manufCode: 0x115F,
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
