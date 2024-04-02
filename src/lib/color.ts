import kelvinToXyLookup from './kelvinToXy';
import {precisionRound} from './utils';
import {findColorTempRange, clampColorTemp} from './light';
import {KeyValueAny, Tz, Zh, KeyValue, Logger} from './types';


/**
 * Converts color temp mireds to Kelvins
 *
 * @param mireds - color temp in mireds
 * @returns color temp in Kelvins
 */
function miredsToKelvin(mireds: number): number {
    return 1000000 / mireds;
}

/**
 * Converts color temp in Kelvins to mireds
 *
 * @param kelvin -color temp in Kelvins
 * @returns color temp in mireds
 */
function kelvinToMireds(kelvin: number): number {
    return 1000000 / kelvin;
}

/**
 * Class representing color in RGB space
 */
export class ColorRGB {
    /**
     * red component (0..1)
     */
    red: number;
    /**
     * green component (0..1)
     */
    green: number;
    /**
     * blue component (0..1)
     */
    blue: number;

    /**
     * Create RGB color
     */
    constructor(red: number, green: number, blue: number) {
        /** red component (0..1) */
        this.red = red;
        /** green component (0..1) */
        this.green = green;
        /** blue component (0..1) */
        this.blue = blue;
    }

    /**
     * Create RGB color from object
     * @param rgb - object with properties red, green and blue
     * @returns new ColoRGB object
     */
    static fromObject(rgb: {red: number, green: number, blue: number}) {
        if (!rgb.hasOwnProperty('red') || !rgb.hasOwnProperty('green') || !rgb.hasOwnProperty('blue')) {
            throw new Error('One or more required properties missing. Required properties: "red", "green", "blue"');
        }
        return new ColorRGB(rgb.red, rgb.green, rgb.blue);
    }

    /**
     * Create RGB color from hex string
     * @param hex -hex encoded RGB color
     * @returns new ColoRGB object
     */
    static fromHex(hex: string): ColorRGB {
        hex = hex.replace('#', '');
        const bigint = parseInt(hex, 16);
        return new ColorRGB(((bigint >> 16) & 255) / 255, ((bigint >> 8) & 255) / 255, (bigint & 255) / 255);
    }

    /**
     * Return this color with values rounded to given precision
     * @param precision - decimal places to round to
     */
    rounded(precision: number): ColorRGB {
        return new ColorRGB(
            precisionRound(this.red, precision),
            precisionRound(this.green, precision),
            precisionRound(this.blue, precision),
        );
    }

    /**
     * Convert to Object
     * @returns object with properties red, green and blue
     */
    toObject(): {red: number, green: number, blue: number} {
        return {
            red: this.red,
            green: this.green,
            blue: this.blue,
        };
    }

    /**
     * Convert to HSV
     *
     * @returns color in HSV space
     */
    toHSV(): ColorHSV {
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
     * @returns color in CIE space
     */
    toXY(): ColorXY {
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
     * @returns corrected RGB
     */
    gammaCorrected(): ColorRGB {
        function transform(v: number) {
            return (v > 0.04045) ? Math.pow((v + 0.055) / (1.0 + 0.055), 2.4) : (v / 12.92);
        }
        return new ColorRGB(transform(this.red), transform(this.green), transform(this.blue));
    }

    /**
     * Returns color after reverse sRGB gamma correction
     * @returns raw RGB
     */
    gammaUncorrected(): ColorRGB {
        function transform(v: number) {
            return v <= 0.0031308 ? 12.92 * v : (1.0 + 0.055) * Math.pow(v, (1.0 / 2.4)) - 0.055;
        }
        return new ColorRGB(transform(this.red), transform(this.green), transform(this.blue));
    }

    /**
     * Create hex string from RGB color
     * @returns hex hex encoded RGB color
     */
    toHEX(): string {
        return '#' +
            parseInt((this.red * 255).toFixed(0)).toString(16).padStart(2, '0')+
            parseInt((this.green * 255).toFixed(0)).toString(16).padStart(2, '0')+
            parseInt((this.blue * 255).toFixed(0)).toString(16).padStart(2, '0');
    }
}

/**
 *  Class representing color in CIE space
 */
export class ColorXY {
    /** X component (0..1) */
    x: number;
    /** Y component (0..1) */
    y: number;

    /**
     * Create CIE color
     */
    constructor(x: number, y: number) {
        /** x component (0..1) */
        this.x = x;
        /** y component (0..1) */
        this.y = y;
    }

    /**
     * Create CIE color from object
     * @param xy - object with properties x and y
     * @returns new ColorXY object
     */
    static fromObject(xy: {x: number, y: number}): ColorXY {
        if (!xy.hasOwnProperty('x') || !xy.hasOwnProperty('y')) {
            throw new Error('One or more required properties missing. Required properties: "x", "y"');
        }
        return new ColorXY(xy.x, xy.y);
    }

    /**
     * Create XY object from color temp in mireds
     * @param mireds - color temp in mireds
     * @returns color in XY space
     */
    static fromMireds(mireds: number): ColorXY {
        const kelvin = miredsToKelvin(mireds);
        return ColorXY.fromObject(kelvinToXyLookup[Math.round(kelvin)]);
    }

    /**
     * Converts color in XY space to temperature in mireds
     * @returns color temp in mireds
     */
    toMireds(): number {
        const n = (this.x - 0.3320) / (0.1858 - this.y);
        const kelvin = Math.abs(437 * Math.pow(n, 3) + 3601 * Math.pow(n, 2) + 6861 * n + 5517);
        return kelvinToMireds(kelvin);
    }

    /**
     * Converts CIE color space to RGB color space
     * From: https://github.com/usolved/cie-rgb-converter/blob/master/cie_rgb_converter.js
     */
    toRGB(): ColorRGB {
        // use maximum brightness
        const brightness = 254;

        const z = 1.0 - this.x - this.y;
        const Y = Number((brightness / 254).toFixed(2));
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
     * @returns color in HSV space
     */
    toHSV(): ColorHSV {
        return this.toRGB().toHSV();
    }

    /**
     * Return this color with value rounded to given precision
     * @param precision - decimal places to round to
     */
    rounded(precision: number): ColorXY {
        return new ColorXY(
            precisionRound(this.x, precision),
            precisionRound(this.y, precision),
        );
    }

    /**
     * Convert to object
     * @returns object with properties x and y
     */
    toObject(): {x: number, y: number} {
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
    /** hue component (0..360) */
    hue: number;
    /** saturation component (0..100) */
    saturation: number;
    /** value component (0..100) */
    value: number;

    /**
     * Create color in HSV space
     */
    constructor(hue: number, saturation: number=null, value: number=null) {
        /** hue component (0..360) */
        this.hue = (hue === null) ? null : hue % 360;
        /** saturation component (0..100) */
        this.saturation = saturation;
        /** value component (0..100) */
        this.value = value;
    }

    /**
     * Create HSV color from object
     */
    static fromObject(hsv: {hue?: number, saturation?: number, value: number}): ColorHSV {
        if (!hsv.hasOwnProperty('hue') && !hsv.hasOwnProperty('saturation')) {
            throw new Error('HSV color must specify at least hue or saturation.');
        }
        return new ColorHSV((hsv.hue === undefined) ? null : hsv.hue, hsv.saturation, hsv.value);
    }

    /**
     * Create HSV color from HSL
     * @param hsl - color in HSL space
     * @returns color in HSV space
     */
    static fromHSL(hsl: {hue: number, saturation: number, lightness: number}): ColorHSV {
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
     * @param precision - decimal places to round to
     */
    rounded(precision: number): ColorHSV {
        return new ColorHSV(
            this.hue === null ? null : precisionRound(this.hue, precision),
            this.saturation === null ? null : precisionRound(this.saturation, precision),
            this.value === null ? null : precisionRound(this.value, precision),
        );
    }

    /**
     * Convert to object
     * @param short - return h, s, v instead of hue, saturation, value
     * @param includeValue - omit v(alue) from return
     */
    toObject(
        short: boolean=false, includeValue: boolean=true,
    ): {h?: number, hue?: number, s?: number, saturation?: number, v?:number, value?: number} {
        const ret: {h?: number, hue?: number, s?: number, saturation?: number, v?:number, value?: number} = {};
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
     * @returns
     */
    toRGB(): ColorRGB {
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
     */
    toXY(): ColorXY {
        return this.toRGB().toXY();
    }

    /**
     * Create Mireds from HSV
     * @returns color temp in mireds
     */
    toMireds(): number {
        return this.toRGB().toXY().toMireds();
    }

    /**
     * Returns color with missing properties set to defaults
     * @returns HSV color
     */
    complete(): ColorHSV {
        const hue = this.hue !== null ? this.hue : 0;
        const saturation = this.saturation !== null ? this.saturation : 100;
        const value = this.value !== null ? this.value : 100;
        return new ColorHSV(hue, saturation, value);
    }

    /**
     * Interpolates hue value based on correction map through ranged linear interpolation
     * @param hue - hue to be corrected
     * @param correctionMap -  array of hueIn -\> hueOut mappings; example: `[ {"in": 20, "out": 25}, {"in": 109, "out": 104}]`
     * @returns corrected hue value
     */
    static interpolateHue(hue: number, correctionMap: KeyValueAny[]): number {
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
     * @param hue - hue component of HSV color
     * @returns corrected hue component of HSV color
     */
    static correctHue(hue: number, meta: Tz.Meta): number {
        const {options} = meta;
        if (options.hasOwnProperty('hue_correction')) {
            // @ts-expect-error
            return this.interpolateHue(hue, options.hue_correction);
        } else {
            return hue;
        }
    }

    /**
     * Returns HSV color after hue correction
     * @param meta - entity meta object
     * @returns hue corrected color
     */
    hueCorrected(meta: Tz.Meta): ColorHSV {
        return new ColorHSV(ColorHSV.correctHue(this.hue, meta), this.saturation, this.value);
    }

    /**
     * Returns HSV color after gamma and hue corrections
     * @param meta - entity meta object
     * @returns corrected color in HSV space
     */
    colorCorrected(meta: Tz.Meta): ColorHSV {
        return this.hueCorrected(meta);
    }
}

export class Color {
    hsv: ColorHSV;
    xy: ColorXY;
    rgb: ColorRGB;

    /**
     * Create Color object
     * @param hsv - ColorHSV instance
     * @param rgb - ColorRGB instance
     * @param xy - ColorXY instance
     */
    constructor(hsv: ColorHSV, rgb: ColorRGB, xy: ColorXY) {
        // @ts-expect-error
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
     * @param value - converter value argument
     * @returns Color object
     */
    // eslint-disable-next-line
    static fromConverterArg(value: any): Color {
        if (value.hasOwnProperty('x') && value.hasOwnProperty('y')) {
            const xy = ColorXY.fromObject(value);
            return new Color(null, null, xy);
        } else if (value.hasOwnProperty('r') && value.hasOwnProperty('g') && value.hasOwnProperty('b')) {
            const rgb = new ColorRGB(value.r / 255, value.g / 255, value.b / 255);
            return new Color(null, rgb, null);
        } else if (value.hasOwnProperty('rgb')) {
            const [r, g, b] = value.rgb.split(',').map((i: string) => parseInt(i));
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
            const [h, s, l] = value.hsl.split(',').map((i: string) => parseInt(i));
            const hsv = ColorHSV.fromHSL({hue: h, saturation: s, lightness: l});
            return new Color(hsv, null, null);
        } else if (value.hasOwnProperty('h') && value.hasOwnProperty('s') && value.hasOwnProperty('b')) {
            const hsv = new ColorHSV(value.h, value.s, value.b);
            return new Color(hsv, null, null);
        } else if (value.hasOwnProperty('hsb')) {
            const [h, s, b] = value.hsb.split(',').map((i: string) => parseInt(i));
            const hsv = new ColorHSV(h, s, b);
            return new Color(hsv, null, null);
        } else if (value.hasOwnProperty('h') && value.hasOwnProperty('s') && value.hasOwnProperty('v')) {
            const hsv = new ColorHSV(value.h, value.s, value.v);
            return new Color(hsv, null, null);
        } else if (value.hasOwnProperty('hsv')) {
            const [h, s, v] = value.hsv.split(',').map((i: string) => parseInt(i));
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
     */
    isHSV(): boolean {
        return this.hsv !== null;
    }

    /**
     * Returns true if color is RGB
     */
    isRGB(): boolean {
        return this.rgb !== null;
    }

    /**
     * Returns true if color is XY
     */
    isXY(): boolean {
        return this.xy !== null;
    }
}

/**
 * Sync all color attributes
 * NOTE: behavior can be disable by setting the 'color_sync' device/group option
 * @param newState - state with only the changed attributes set
 * @param oldState - state from the cache with all the old attributes set
 * @param endpoint - with lightingColorCtrl cluster
 * @param options - meta.options for the device or group
 * @param logger - used for logging
 * @returns state with color, color_temp, and color_mode set and synchronized from newState's attributes
 *          (other attributes are not included make sure to merge yourself)
 */
export function syncColorState(
    newState: KeyValueAny, oldState: KeyValueAny, endpoint: Zh.Endpoint | Zh.Group, options: KeyValue, logger: Logger,
): KeyValueAny {
    const colorTargets = [];
    const colorSync = (options && options.hasOwnProperty('color_sync')) ? options.color_sync : true;
    const result: KeyValueAny = {};
    const [colorTempMin, colorTempMax] = findColorTempRange(endpoint, logger);

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
                result.color_temp = clampColorTemp(precisionRound(hsv.toMireds(), 0),
                    colorTempMin, colorTempMax, logger);
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
                result.color_temp = clampColorTemp(precisionRound(xy.toMireds(), 0),
                    colorTempMin, colorTempMax, logger);
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

exports.ColorRGB = ColorRGB;
exports.ColorXY = ColorXY;
exports.ColorHSV = ColorHSV;
exports.Color = Color;
exports.syncColorState = syncColorState;
