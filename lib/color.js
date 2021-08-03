const kelvinToXyLookup = require('./kelvinToXy');
const {precisionRound} = require('./utils');

/**
 * Color represented in HSV space
 * @typedef {Object} ColorHSVT
 * @property {number} hue hue component (0..360)
 * @property {number} saturation saturation component (0..100)
 * @property {?number} value value component (0..100)
 */

/**
 * Color represented in HSL space
 * @typedef {Object} ColorHSLT
 * @property {number} hue hue component (0..360)
 * @property {number} saturation saturation component (0..100)
 * @property {number} lightness lightness component (0..100)
 */

/**
 * Color represented in CIE space
 * @typedef {Object} ColorXYT
 * @property {number} x X component (0..1)
 * @property {number} y Y component (0..1)
 */

/**
 * Color represented with red, green and blue components
 * @typedef {Object} ColorRGBT
 * @property {number} red red component (0..1)
 * @property {number} green green component (0..1)
 * @property {number} blue blue component (0..1)
 */

/**
 * Converts color temp mireds to Kelvins
 * @param {number} mireds color temp in mireds
 * @return {number} color temp in Kelvins
 */
function miredsToKelvin(mireds) {
    return 1000000 / mireds;
}

/**
 * Converts color temp in Kelvins to mireds
 * @param {number} kelvin color temp in Kelvins
 * @return {number} color temp in mireds
 */
function kelvinToMireds(kelvin) {
    return 1000000 / kelvin;
}

class ColorRGB {
    /**
     * Create RGB color
     * @param {number} red
     * @param {number} green
     * @param {number} blue
     */
    constructor(red, green, blue) {
        /** red component (0..1) */
        this.red = red;
        /** green component (0..1) */
        this.green = green;
        /** blue component (0..1) */
        this.blue = blue;
    }

    /**
     * Create RGB color from object
     * @param {ColorRGBT} rgb object with properties red, green and blue
     * @return {ColorRGB} new ColoRGB object
     */
    static fromObject(rgb) {
        if (!rgb.hasOwnProperty('red') || !rgb.hasOwnProperty('green') || !rgb.hasOwnProperty('blue')) {
            throw new Error('One or more required properties missing. Required properties: "red", "green", "blue"');
        }
        return new ColorRGB(rgb.red, rgb.green, rgb.blue);
    }

    /**
     * Create RGB color from hex string
     * @param {string} hex hex encoded RGB color
     * @return {ColorRGB} new ColoRGB object
     */
    static fromHex(hex) {
        hex = hex.replace('#', '');
        const bigint = parseInt(hex, 16);
        return new ColorRGB(((bigint >> 16) & 255) / 255, ((bigint >> 8) & 255) / 255, (bigint & 255) / 255);
    }

    /**
     * Return this color with values rounded to given precision
     * @param {number} precision decimal places to round to
     * @return {ColorRGB}
     */
    rounded(precision) {
        return new ColorRGB(
            precisionRound(this.red, precision),
            precisionRound(this.green, precision),
            precisionRound(this.blue, precision),
        );
    }

    /**
     * Convert to Object
     * @return {ColorRGBT} object with properties red, green and blue
     */
    toObject() {
        return {
            red: this.red,
            green: this.green,
            blue: this.blue,
        };
    }

    /**
     * Convert to HSV
     * @return {ColorHSV} color in HSV space
     */
    toHSV() {
        const r = this.red;
        const g = this.green;
        const b = this.blue;

        const max = Math.max(r, g, b); const min = Math.min(r, g, b);
        const d = max - min;
        let h;
        const s = (max === 0 ? 0 : d / max);
        const v = max;

        switch (max) {
        case min: h = 0; break;
        case r: h = (g - b) + d * (g < b ? 6: 0); h /= 6 * d; break;
        case g: h = (b - r) + d * 2; h /= 6 * d; break;
        case b: h = (r - g) + d * 4; h /= 6 * d; break;
        }

        return new ColorHSV(h * 360, s * 100, v * 100);
    }

    /**
     * Convert to CIE
     * @return {ColorXY} color in CIE space
     */
    toXY() {
        // From: https://github.com/usolved/cie-rgb-converter/blob/master/cie_rgb_converter.js

        // RGB values to XYZ using the Wide RGB D65 conversion formula
        const X = this.red * 0.664511 + this.green * 0.154324 + this.blue * 0.162028;
        const Y = this.red * 0.283881 + this.green * 0.668433 + this.blue * 0.047685;
        const Z = this.red * 0.000088 + this.green * 0.072310 + this.blue * 0.986039;
        const sum = X + Y + Z;

        const retX = (sum == 0) ? 0 : X / sum;
        const retY = (sum == 0) ? 0 : Y / sum;

        return new ColorXY(retX, retY);
    }

    /**
     * Returns color after sRGB gamma correction
     * @return {ColorRGB} corrected RGB
     */
    gammaCorrected() {
        function transform(v) {
            return (v > 0.04045) ? Math.pow((v + 0.055) / (1.0 + 0.055), 2.4) : (v / 12.92);
        }
        return new ColorRGB(transform(this.red), transform(this.green), transform(this.blue));
    }

    /**
     * Returns color after reverse sRGB gamma correction
     * @return {ColorRGB} raw RGB
     */
    gammaUncorrected() {
        function transform(v) {
            return v <= 0.0031308 ? 12.92 * v : (1.0 + 0.055) * Math.pow(v, (1.0 / 2.4)) - 0.055;
        }
        return new ColorRGB(transform(this.red), transform(this.green), transform(this.blue));
    }
}

/**
 *  Class representing color in CIE space
 */
class ColorXY {
    /**
     * Create CIE color
     * @param {number} x
     * @param {number} y
     */
    constructor(x, y) {
        /** x component (0..1) */
        this.x = x;
        /** y component (0..1) */
        this.y = y;
    }

    /**
     * Create CIE color from object
     * @param {ColorXYT} xy object with properties x and y
     * @return {ColorXY} new ColorXY object
     */
    static fromObject(xy) {
        if (!xy.hasOwnProperty('x') || !xy.hasOwnProperty('y')) {
            throw new Error('One or more required properties missing. Required properties: "x", "y"');
        }
        return new ColorXY(xy.x, xy.y);
    }

    /**
     * Create XY object from color temp in mireds
     * @param {number} mireds color temp in mireds
     * @return {ColorXY} color in XY space
     */
    static fromMireds(mireds) {
        const kelvin = miredsToKelvin(mireds);
        return ColorXY.fromObject(kelvinToXyLookup[Math.round(kelvin)]);
    }

    /**
     * Converts color in XY space to temperature in mireds
     * @return {number} color temp in mireds
     */
    toMireds() {
        const n = (this.x - 0.3320) / (0.1858 - this.y);
        const kelvin = Math.abs(437 * Math.pow(n, 3) + 3601 * Math.pow(n, 2) + 6861 * n + 5517);
        return kelvinToMireds(kelvin);
    }

    /**
     * Converts CIE color space to RGB color space
     * From: https://github.com/usolved/cie-rgb-converter/blob/master/cie_rgb_converter.js
     * @return {ColorRGB}
     */
    toRGB() {
        // use maximum brightness
        const brightness = 254;

        const z = 1.0 - this.x - this.y;
        const Y = (brightness / 254).toFixed(2);
        const X = (Y / this.y) * this.x;
        const Z = (Y / this.y) * z;

        // Convert to RGB using Wide RGB D65 conversion
        let red = X * 1.656492 - Y * 0.354851 - Z * 0.255038;
        let green = -X * 0.707196 + Y * 1.655397 + Z * 0.036152;
        let blue = X * 0.051713 - Y * 0.121364 + Z * 1.011530;

        // If red, green or blue is larger than 1.0 set it back to the maximum of 1.0
        if (red > blue && red > green && red > 1.0) {
            green = green / red;
            blue = blue / red;
            red = 1.0;
        } else if (green > blue && green > red && green > 1.0) {
            red = red / green;
            blue = blue / green;
            green = 1.0;
        } else if (blue > red && blue > green && blue > 1.0) {
            red = red / blue;
            green = green / blue;
            blue = 1.0;
        }

        // This fixes situation when due to computational errors value get slightly below 0, or NaN in case of zero-division.
        red = (isNaN(red) || red < 0) ? 0 : red;
        green = (isNaN(green) || green < 0) ? 0 : green;
        blue = (isNaN(blue) || blue < 0) ? 0 : blue;

        return new ColorRGB(red, green, blue);
    }

    /**
     * Convert to HSV
     * @return {ColorHSV} color in HSV space
     */
    toHSV() {
        return this.toRGB().toHSV();
    }

    /**
     * Return this color with value rounded to given precision
     * @param {number} precision decimal places to round to
     * @return {ColorXY}
     */
    rounded(precision) {
        return new ColorXY(
            precisionRound(this.x, precision),
            precisionRound(this.y, precision),
        );
    }

    /**
     * Convert to object
     * @return {ColorXYT} object with properties x and y
     */
    toObject() {
        return {
            x: this.x,
            y: this.y,
        };
    }
}

/**
 * Class representing color in HSV space
 */
class ColorHSV {
    /**
     * Create color in HSV space
     * @param {?number} hue
     * @param {?number} [saturation=null]
     * @param {?number} [value=null]
     */
    constructor(hue, saturation=null, value=null) {
        /** hue component (0..360) */
        this.hue = (hue === null) ? null : hue % 360;
        /** saturation component (0..100) */
        this.saturation = saturation;
        /** value component (0..100) */
        this.value = value;
    }

    /**
     * Create HSV color from object
     * @param {object} hsv
     * @param {number} [hsv.hue]
     * @param {number} [hsv.saturation]
     * @param {number} [hsv.value]
     * @return {ColorHSV}
     */
    static fromObject(hsv) {
        if (!hsv.hasOwnProperty('hue') && !hsv.hasOwnProperty('saturation')) {
            throw new Error('HSV color must specify at least hue or saturation.');
        }
        return new ColorHSV((hsv.hue === undefined) ? null : hsv.hue, hsv.saturation, hsv.value);
    }

    /**
     * Create HSV color from HSL
     * @param {ColorHSL} hsl color in HSL space
     * @return {ColorHSV} color in HSV space
     */
    static fromHSL(hsl) {
        if (!hsl.hasOwnProperty('hue') || !hsl.hasOwnProperty('saturation') || !hsl.hasOwnProperty('lightness')) {
            throw new Error('One or more required properties missing. Required properties: "hue", "saturation", "lightness"');
        }
        const retH = hsl.hue;
        const retV = hsl.saturation * Math.min(hsl.lightness, 100 - hsl.lightness) / 100 + hsl.lightness;
        const retS = retV ? (200 * (1 - hsl.lightness / retV)) : 0;
        return new ColorHSV(retH, retS, retV);
    }

    /**
     * Return this color with value rounded to given precision
     * @param {number} precision decimal places to round to
     * @return {ColorHSV}
     */
    rounded(precision) {
        return new ColorHSV(
            this.hue === null ? null : precisionRound(this.hue, precision),
            this.saturation === null ? null : precisionRound(this.saturation, precision),
            this.value === null ? null : precisionRound(this.value, precision),
        );
    }

    /**
     * Convert to object
     * @param {boolean} short return h, s, v instead of hue, saturation, value
     * @param {boolean} includeValue omit v(alue) from return
     * @return {ColorHSVT}
     */
    toObject(short=false, includeValue=true) {
        const ret = {};
        if (this.hue !== null) {
            if (short) {
                ret.h = this.hue;
            } else {
                ret.hue = this.hue;
            }
        }
        if (this.saturation !== null) {
            if (short) {
                ret.s = this.saturation;
            } else {
                ret.saturation = this.saturation;
            }
        }
        if ((this.value !== null) && includeValue) {
            if (short) {
                ret.v = this.value;
            } else {
                ret.value = this.value;
            }
        }
        return ret;
    }

    /**
     * Convert RGB color
     * @return {ColorRGB}
     */
    toRGB() {
        const hsvComplete = this.complete();
        const h = hsvComplete.hue / 360;
        const s = hsvComplete.saturation / 100;
        const v = hsvComplete.value / 100;

        let r; let g; let b;
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
        return new ColorRGB(r, g, b);
    }

    /**
     * Create CIE color from HSV
     * @return {ColorXY}
     */
    toXY() {
        return this.toRGB().toXY();
    }

    /**
     * Create Mireds from HSV
     * @return {number} color temp in mireds
     */
    toMireds() {
        return this.toRGB().toXY().toMireds();
    }

    /**
     * Returns color with missing properties set to defaults
     * @return {ColorHSV} HSV color
     */
    complete() {
        const hue = this.hue !== null ? this.hue : 0;
        const saturation = this.saturation !== null ? this.saturation : 100;
        const value = this.value !== null ? this.value : 100;
        return new ColorHSV(hue, saturation, value);
    }

    /**
     * Returns color after sRGB gamma correction
     * @return {ColorHSV} corrected color in HSV space
     */
    gammaCorrected() {
        return this.toRGB().gammaCorrected().toHSV();
    }

    /**
     * Interpolates hue value based on correction map through ranged linear interpolation
     * @param {Nnmber} hue hue to be corrected
     * @param {Array} correctionMap array of hueIn -> hueOut mappings; example: [ {"in": 20, "out": 25}, {"in": 109, "out": 104}]
     * @return {number} corrected hue value
     */
    static interpolateHue(hue, correctionMap) {
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

    /**
     * Applies hue interpolation if entity has hue correction data
     * @param {number} hue hue component of HSV color
     * @param {Object} meta entity meta object
     * @param {Object} meta.options meta object's options property
     * @param {Object} [meta.options.hue_correction] hue correction data
     * @return {number} corrected hue component of HSV color
     */
    static correctHue(hue, meta) {
        const {options} = meta;
        if (options.hasOwnProperty('hue_correction')) {
            return this.interpolateHue(hue, options.hue_correction);
        } else {
            return hue;
        }
    }

    /**
     * Returns HSV color after hue correction
     * @param {Object} meta entity meta object
     * @return {ColorHSV} hue corrected color
     */
    hueCorrected(meta) {
        return new ColorHSV(ColorHSV.correctHue(this.hue, meta), this.saturation, this.brightness);
    }

    /**
     * Returns HSV color after gamma and hue corrections
     * @param {Object} meta entity meta object
     * @return {ColorHSV} corrected color in HSV space
     */
    colorCorrected(meta) {
        return this.hueCorrected(meta).gammaCorrected();
    }
}

class Color {
    /**
     * Create Color object
     * @param {?ColorHSV} hsv ColorHSV instance
     * @param {?ColorRGB} rgb ColorRGB instance
     * @param {?ColorXY} xy ColorXY instance
     */
    constructor(hsv, rgb, xy) {
        if ((hsv !== null) + (rgb !== null) + (xy !== null) != 1) {
            throw new Error('Color object should have exactly only one of hsv, rgb or xy properties');
        } else if (hsv !== null) {
            if (!(hsv instanceof ColorHSV)) {
                throw new Error('hsv argument must be an instance of ColorHSV class');
            }
        } else if (rgb !== null) {
            if (!(rgb instanceof ColorRGB)) {
                throw new Error('rgb argument must be an instance of ColorRGB class');
            }
        } else /* if (xy !== null) */ {
            if (!(xy instanceof ColorXY)) {
                throw new Error('xy argument must be an instance of ColorXY class');
            }
        }
        this.hsv = hsv;
        this.rgb = rgb,
        this.xy = xy;
    }

    /**
     * Create Color object from converter's value argument
     * @param {Object} value converter value argument
     * @return {Color} Color object
     */
    static fromConverterArg(value) {
        if (value.hasOwnProperty('x') && value.hasOwnProperty('y')) {
            const xy = ColorXY.fromObject(value);
            return new Color(null, null, xy);
        } else if (value.hasOwnProperty('r') && value.hasOwnProperty('g') && value.hasOwnProperty('b')) {
            const rgb = new ColorRGB(value.r / 255, value.g / 255, value.b / 255);
            return new Color(null, rgb, null);
        } else if (value.hasOwnProperty('rgb')) {
            const [r, g, b] = value.rgb.split(',').map((i) => parseInt(i));
            const rgb = new ColorRGB(r / 255, g / 255, b / 255);
            return new Color(null, rgb, null);
        } else if (value.hasOwnProperty('hex')) {
            const rgb = ColorRGB.fromHex(value.hex);
            return new Color(null, rgb, null);
        } else if (typeof value === 'string' && value.startsWith('#')) {
            const rgb = ColorRGB.fromHex(value);
            return new Color(null, rgb, null);
        } else if (value.hasOwnProperty('h') && value.hasOwnProperty('s') && value.hasOwnProperty('l')) {
            const hsv = ColorHSV.fromHSL({hue: value.h, saturation: value.s, lightness: value.l});
            return new Color(hsv, null, null);
        } else if (value.hasOwnProperty('hsl')) {
            const [h, s, l] = value.hsl.split(',').map((i) => parseInt(i));
            const hsv = ColorHSV.fromHSL({hue: h, saturation: s, lightness: l});
            return new Color(hsv, null, null);
        } else if (value.hasOwnProperty('h') && value.hasOwnProperty('s') && value.hasOwnProperty('b')) {
            const hsv = new ColorHSV(value.h, value.s, value.b);
            return new Color(hsv, null, null);
        } else if (value.hasOwnProperty('hsb')) {
            const [h, s, b] = value.hsb.split(',').map((i) => parseInt(i));
            const hsv = new ColorHSV(h, s, b);
            return new Color(hsv, null, null);
        } else if (value.hasOwnProperty('h') && value.hasOwnProperty('s') && value.hasOwnProperty('v')) {
            const hsv = new ColorHSV(value.h, value.s, value.v);
            return new Color(hsv, null, null);
        } else if (value.hasOwnProperty('hsv')) {
            const [h, s, v] = value.hsv.split(',').map((i) => parseInt(i));
            const hsv = new ColorHSV(h, s, v);
            return new Color(hsv, null, null);
        } else if (value.hasOwnProperty('h') && value.hasOwnProperty('s')) {
            const hsv = new ColorHSV(value.h, value.s);
            return new Color(hsv, null, null);
        } else if (value.hasOwnProperty('h')) {
            const hsv = new ColorHSV(value.h);
            return new Color(hsv, null, null);
        } else if (value.hasOwnProperty('s')) {
            const hsv = new ColorHSV(null, value.s);
            return new Color(hsv, null, null);
        } else if (value.hasOwnProperty('hue') || value.hasOwnProperty('saturation')) {
            const hsv = ColorHSV.fromObject(value);
            return new Color(hsv, null, null);
        } else {
            throw new Error('Value does not contain valid color definition');
        }
    }

    /**
     * Returns true if color is HSV
     * @return {boolean} is HSV color
     */
    isHSV() {
        return this.hsv !== null;
    }

    /**
     * Returns true if color is RGB
     * @return {boolean} is RGB color
     */
    isRGB() {
        return this.rgb !== null;
    }

    /**
     * Returns true if color is XY
     * @return {boolean} is XY color
     */
    isXY() {
        return this.xy !== null;
    }
}

/*
 * Sync all color attributes
 * NOTE: behavior can be disable by setting the 'color_sync' device/group option
 * @param {Object} newState state with only the changed attributes set
 * @param {Object} oldState state from the cache with all the old attributes set
 * @param {Object} options meta.options for the device or group
 * @return {Object} state with color, color_temp, and color_mode set and syncronized from newState's attributes
 *                  (other attributes are not included make sure to merge yourself)
 */
function syncColorState(newState, oldState, options) {
    const colorTargets = [];
    const colorSync = (options && options.hasOwnProperty('color_sync')) ? options.color_sync : true;
    const result = {};

    // check if color sync is enabled
    if (!colorSync) {
        // copy newState.{color_mode,color,color_temp}
        if (newState.hasOwnProperty('color_mode')) result.color_mode = newState.color_mode;
        if (newState.hasOwnProperty('color')) result.color = newState.color;
        if (newState.hasOwnProperty('color_temp')) result.color_temp = newState.color_temp;
        return result;
    }

    // handle undefined newState/oldState
    if (newState === undefined) newState = {};
    if (oldState === undefined) oldState = {};

    // figure out current color_mode
    if (newState.hasOwnProperty('color_mode')) {
        result.color_mode = newState.color_mode;
    } else if (oldState.hasOwnProperty('color_mode')) {
        result.color_mode = oldState.color_mode;
    } else {
        result.color_mode = newState.hasOwnProperty('color_temp') ? 'color_temp' :
            (newState.hasOwnProperty('color') && newState.color.hasOwnProperty('hue') ? 'hs' : 'xy');
    }

    // figure out target attributes
    if (oldState.hasOwnProperty('color_temp') || newState.hasOwnProperty('color_temp')) {
        colorTargets.push('color_temp');
    }
    if (
        (oldState.hasOwnProperty('color') && oldState.color.hasOwnProperty('hue') && oldState.color.hasOwnProperty('saturation')) ||
        (newState.hasOwnProperty('color') && newState.color.hasOwnProperty('hue') && newState.color.hasOwnProperty('saturation'))
    ) {
        colorTargets.push('hs');
    }
    if (
        (oldState.hasOwnProperty('color') && oldState.color.hasOwnProperty('x') && oldState.color.hasOwnProperty('y')) ||
        (newState.hasOwnProperty('color') && newState.color.hasOwnProperty('x') && newState.color.hasOwnProperty('y'))
    ) {
        colorTargets.push('xy');
    }

    // sync color attributes
    result.color = {};
    switch (result.color_mode) {
    case 'hs':
        if (newState.hasOwnProperty('color') && newState.color.hasOwnProperty('hue')) {
            Object.assign(result.color, {'hue': newState.color.hue});
        } else if (oldState.hasOwnProperty('color') && oldState.color.hasOwnProperty('hue')) {
            Object.assign(result.color, {'hue': oldState.color.hue});
        }
        if (newState.hasOwnProperty('color') && newState.color.hasOwnProperty('saturation')) {
            Object.assign(result.color, {'saturation': newState.color.saturation});
        } else if (oldState.hasOwnProperty('color') && oldState.color.hasOwnProperty('saturation')) {
            Object.assign(result.color, {'saturation': oldState.color.saturation});
        }

        if (result.color.hasOwnProperty('hue') && result.color.hasOwnProperty('saturation')) {
            const hsv = new ColorHSV(result.color.hue, result.color.saturation);
            if (colorTargets.includes('color_temp')) {
                result.color_temp = precisionRound(hsv.toMireds(), 0);
            }
            if (colorTargets.includes('xy')) {
                Object.assign(result.color, hsv.toXY().rounded(4).toObject());
            }
        }
        break;
    case 'xy':
        if (newState.hasOwnProperty('color') && newState.color.hasOwnProperty('x')) {
            Object.assign(result.color, {'x': newState.color.x});
        } else if (oldState.hasOwnProperty('color') && oldState.color.hasOwnProperty('x')) {
            Object.assign(result.color, {'x': oldState.color.x});
        }
        if (newState.hasOwnProperty('color') && newState.color.hasOwnProperty('y')) {
            Object.assign(result.color, {'y': newState.color.y});
        } else if (oldState.hasOwnProperty('color') && oldState.color.hasOwnProperty('y')) {
            Object.assign(result.color, {'y': oldState.color.y});
        }

        if (result.color.hasOwnProperty('x') && result.color.hasOwnProperty('y')) {
            const xy = new ColorXY(result.color.x, result.color.y);
            if (colorTargets.includes('color_temp')) {
                result.color_temp = precisionRound(xy.toMireds(), 0);
            }
            if (colorTargets.includes('hs')) {
                Object.assign(result.color, xy.toHSV().rounded(0).toObject(false, false));
            }
        }
        break;
    case 'color_temp':
        if (newState.hasOwnProperty('color_temp')) {
            result.color_temp = newState.color_temp;
        } else if (oldState.hasOwnProperty('color_temp')) {
            result.color_temp = oldState.color_temp;
        }

        if (result.hasOwnProperty('color_temp')) {
            const xy = ColorXY.fromMireds(result.color_temp);
            if (colorTargets.includes('xy')) {
                Object.assign(result.color, xy.rounded(4).toObject());
            }
            if (colorTargets.includes('hs')) {
                Object.assign(result.color, xy.toHSV().rounded(0).toObject(false, false));
            }
        }
        break;
    }

    // drop empty result.color
    if (Object.keys(result.color).length === 0) delete result.color;

    return result;
}

module.exports = {
    ColorRGB,
    ColorXY,
    ColorHSV,
    Color,
    syncColorState,
};
