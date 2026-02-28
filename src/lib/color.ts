import kelvinToXyLookup from "./kelvinToXy";
import {clampColorTemp, findColorTempRange} from "./light";
import type {Definition, KeyValue, KeyValueAny, Tz, Zh} from "./types";
import {precisionRound} from "./utils";

type Vector3 = [number, number, number];
type Vector2 = [number, number];
type Matrix3 = [number, number, number, number, number, number, number, number, number];

export interface GammaCorrection {
    encode: (linear: number) => number; // linear [0..1] -> non-linear
    decode: (nonLinear: number) => number; // non-linear [0..1] -> linear
}

export interface Gamut {
    name: string;
    red: Vector2;
    green: Vector2;
    blue: Vector2;
    white: Vector2;
    gammaCorrection: Readonly<GammaCorrection>;
}

const clamp = (value: number, min: number, max: number): number => {
    return value <= min ? min : value >= max ? max : value;
};

const clampMatrixValue = (value: number): number => {
    return Number.isFinite(value) ? value : 0;
};

const xyToXyz = ([x, y]: Vector2): Vector3 => {
    const z = 1 - x - y;
    const Y = 1;

    return [x / y, Y, z / y];
};

const invert3x3 = (m: Matrix3): Matrix3 => {
    const [a, b, c, d, e, f, g, h, i] = m;
    const A = e * i - f * h;
    const B = -(d * i - f * g);
    const C = d * h - e * g;
    const det = a * A + b * B + c * C;

    if (Math.abs(det) < 1e-9 || !Number.isFinite(det)) {
        return [0, 0, 0, 0, 0, 0, 0, 0, 0];
    }

    const invDet = 1 / det;

    return [
        clampMatrixValue(A * invDet),
        clampMatrixValue((c * h - b * i) * invDet),
        clampMatrixValue((b * f - c * e) * invDet),
        clampMatrixValue(B * invDet),
        clampMatrixValue((a * i - c * g) * invDet),
        clampMatrixValue((c * d - a * f) * invDet),
        clampMatrixValue(C * invDet),
        clampMatrixValue((b * g - a * h) * invDet),
        clampMatrixValue((a * e - b * d) * invDet),
    ];
};

const multiplyMatrix3 = (m: Matrix3, v: Vector3): Vector3 => {
    return [m[0] * v[0] + m[1] * v[1] + m[2] * v[2], m[3] * v[0] + m[4] * v[1] + m[5] * v[2], m[6] * v[0] + m[7] * v[1] + m[8] * v[2]];
};

const buildMatrices = (gamut: Gamut): {toXyz: Matrix3; toRgb: Matrix3} => {
    const [Xr, Yr, Zr] = xyToXyz(gamut.red);
    const [Xg, Yg, Zg] = xyToXyz(gamut.green);
    const [Xb, Yb, Zb] = xyToXyz(gamut.blue);
    const [Xw, Yw, Zw] = xyToXyz(gamut.white);

    const primariesMatrix: Matrix3 = [Xr, Xg, Xb, Yr, Yg, Yb, Zr, Zg, Zb];
    const primariesInv = invert3x3(primariesMatrix);
    const [Sr, Sg, Sb] = multiplyMatrix3(primariesInv, [Xw, Yw, Zw]);

    const toXyz: Matrix3 = [Xr * Sr, Xg * Sg, Xb * Sb, Yr * Sr, Yg * Sg, Yb * Sb, Zr * Sr, Zg * Sg, Zb * Sb];

    return {toXyz, toRgb: invert3x3(toXyz)};
};

const makeGammaCorrection = (params: {threshold: number; slope: number; exponent: number; offset: number}): Readonly<GammaCorrection> => {
    const {threshold, slope, exponent, offset} = params;

    const encode = (linear: number): number => {
        if (linear <= threshold) {
            return slope * linear;
        }

        return (1 + offset) * linear ** (1 / exponent) - offset;
    };

    const thresholdEnc = encode(threshold);

    const decode = (nonLinear: number): number => {
        if (nonLinear <= thresholdEnc) {
            return nonLinear / slope;
        }

        return ((nonLinear + offset) / (1 + offset)) ** exponent;
    };

    return {encode, decode};
};

const GAMMA_CORRECTION_LINEAR: Readonly<GammaCorrection> = {
    encode: (linear: number): number => clamp(linear, 0, 1),
    decode: (nonLinear: number): number => clamp(nonLinear, 0, 1),
};

const GAMMA_CORRECTION_SRGB = makeGammaCorrection({threshold: 0.0031308, slope: 12.92, exponent: 2.4, offset: 0.055});

/** https://en.wikipedia.org/wiki/CIE_1931_color_space */
const CIE1931: Readonly<Gamut> = {
    name: "Zigbee / CIE 1931",
    red: [0.7347, 0.2653],
    green: [0.2738, 0.7174],
    blue: [0.1666, 0.0089],
    white: [1 / 3, 1 / 3],
    gammaCorrection: GAMMA_CORRECTION_LINEAR,
};
/** https://developers.meethue.com/develop/application-design-guidance/color-conversion-formulas-rgb-to-xy-and-back/ */
const PHILIPS_HUE: Readonly<Gamut> = {
    name: "Philips Hue",
    red: [0.675, 0.322],
    green: [0.4091, 0.518],
    blue: [0.167, 0.04],
    white: [1 / 3, 1 / 3],
    gammaCorrection: GAMMA_CORRECTION_SRGB,
};
/** https://developers.meethue.com/develop/application-design-guidance/color-conversion-formulas-rgb-to-xy-and-back/ */
const PHILIPS_HUE_LIVING_COLORS: Readonly<Gamut> = {
    name: "Philips Hue Living Colors",
    red: [0.704, 0.296],
    green: [0.2151, 0.7106],
    blue: [0.138, 0.08],
    white: [1 / 3, 1 / 3],
    gammaCorrection: GAMMA_CORRECTION_SRGB,
};
/**
 * https://en.wikipedia.org/wiki/Wide-gamut_RGB_color_space
 * Appears to be the one used for Philips gradients, used directly, not currently returned by `getDeviceGamut`
 */
const WIDE: Readonly<Gamut> = {
    name: "Wide",
    red: [0.7347, 0.2653],
    green: [0.1152, 0.8264],
    blue: [0.1566, 0.0177],
    white: [0.3457, 0.3585],
    gammaCorrection: GAMMA_CORRECTION_SRGB,
};

export const SUPPORTED_GAMUTS = {
    cie1931: CIE1931,
    philipsHue: PHILIPS_HUE,
    philipsLivingColors: PHILIPS_HUE_LIVING_COLORS,
    wide: WIDE,
} as const;

const gamutMatrices: Record<string, ReturnType<typeof buildMatrices>> = {};

for (const key in SUPPORTED_GAMUTS) {
    const entry = SUPPORTED_GAMUTS[key as keyof typeof SUPPORTED_GAMUTS];

    gamutMatrices[entry.name] = buildMatrices(entry);
}

/**
 * Use definition to determine the proper gamut.
 * This can be easily expanded by added entries to @see SUPPORTED_GAMUTS and by refining checks in this function as appropriate.
 */
export const getDeviceGamut = (definition: Definition): Readonly<Gamut> => {
    if (definition.vendor === "Philips") {
        if (
            definition.description.includes("LivingColors") ||
            definition.description.includes("Bloom") ||
            definition.description.includes("Aura") ||
            definition.description.includes("Iris")
        ) {
            return SUPPORTED_GAMUTS.philipsLivingColors;
        }

        return SUPPORTED_GAMUTS.philipsHue;
    }

    return SUPPORTED_GAMUTS.cie1931;
};

const timesArray = (array: Vector3, matrix: Matrix3): Vector3 => {
    const result: Vector3 = [0, 0, 0];

    for (let i = 0; i < 3; i++) {
        result[i] = 0;

        for (let n = 0; n < 3; n++) {
            result[i] += matrix[i * 3 + n] * array[n];
        }
    }

    return result;
};

const findMaximumY = (x: number, y: number, gamut: Gamut, iterations = 10) => {
    if (y <= 0) {
        return 0;
    }

    let bri = 1;

    for (let i = 0; i < iterations; i++) {
        const max = Math.max(...convertXyYToRgb(x, y, bri, gamut));

        if (max <= 0 || !Number.isFinite(max)) {
            return 0;
        }

        bri = bri / max;
    }

    return bri;
};

/** Expects RGB in [0..1] range */
const convertRgbToXyz = (r: number, g: number, b: number, gamut: Gamut): Vector3 => {
    const rgb: Vector3 = [gamut.gammaCorrection.decode(r), gamut.gammaCorrection.decode(g), gamut.gammaCorrection.decode(b)];
    const {toXyz} = gamutMatrices[gamut.name];

    return timesArray(rgb, toXyz);
};

/** Return RGB in [0..1] range */
const convertXyzToRgb = (x: number, y: number, z: number, gamut: Gamut): Vector3 => {
    const {toRgb} = gamutMatrices[gamut.name];
    const rgb = timesArray([x, y, z], toRgb);

    return [gamut.gammaCorrection.encode(rgb[0]), gamut.gammaCorrection.encode(rgb[1]), gamut.gammaCorrection.encode(rgb[2])];
};

/** Returns RGB in [0..1] range */
export const convertXyYToRgb = (x: number, y: number, Y: number, gamut: Gamut): Vector3 => {
    const z = 1.0 - x - y;

    return convertXyzToRgb((Y / y) * x, Y, (Y / y) * z, gamut);
};

/** Expects RGB in [0..255] range */
export const convertRgbToXyY = (r: number, g: number, b: number, gamut: Gamut): Vector3 => {
    r /= 255;
    g /= 255;
    b /= 255;

    if (r < 1e-12 && g < 1e-12 && b < 1e-12) {
        const [x, y, z] = convertRgbToXyz(1, 1, 1, gamut);
        const sum = x + y + z;

        return [x / sum, y / sum, 0];
    }

    const [x, y, z] = convertRgbToXyz(r, g, b, gamut);
    const sum = x + y + z;

    return [x / sum, y / sum, y];
};

/** Returns RGB in [0..255] range */
export const convertXyToRgb = (x: number, y: number, Y: number | undefined, gamut: Gamut): Vector3 => {
    if (y <= 0) {
        return [0, 0, 0];
    }

    const luminance = Y ?? findMaximumY(x, y, gamut, 10);

    if (luminance <= 0 || !Number.isFinite(luminance)) {
        return [0, 0, 0];
    }

    const [r, g, b] = convertXyYToRgb(x, y, luminance, gamut);

    return [clamp(r * 255, 0, 255), clamp(g * 255, 0, 255), clamp(b * 255, 0, 255)];
};

/** Expects RGB in [0..255] range */
export const convertRgbToHsv = (r: number, g: number, b: number): Vector3 => {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const d = max - Math.min(r, g, b);

    const h = d ? (max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? 2 + (b - r) / d : 4 + (r - g) / d) * 60 : 0;
    const s = max ? (d / max) * 100 : 0;
    const v = max * 100;

    return [clamp(h, 0, 360), clamp(s, 0, 100), clamp(v, 0, 100)];
};

/** Returns RGB in [0..255] range */
export const convertHsvToRgb = (h: number, s: number, v: number): Vector3 => {
    s /= 100;
    v /= 100;

    const i = ~~(h / 60);
    const f = h / 60 - i;
    const p = v * (1 - s);
    const q = v * (1 - s * f);
    const t = v * (1 - s * (1 - f));
    const index = i % 6;

    const r = [v, q, p, p, t, v][index] * 255;
    const g = [t, v, v, q, p, p][index] * 255;
    const b = [p, p, t, v, v, q][index] * 255;

    return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
};

/** Expects RGB in [0..255] range */
export const convertRgbToHex = (r: number, g: number, b: number): string => {
    return `#${Math.round(r).toString(16).padStart(2, "0")}${Math.round(g).toString(16).padStart(2, "0")}${Math.round(b).toString(16).padStart(2, "0")}`;
};

/** Returns RGB in [0..255] range */
export const convertHexToRgb = (hex: string): Vector3 => {
    const hexNum = Number.parseInt(hex.slice(1), 16);

    return [(hexNum >> 16) & 255, (hexNum >> 8) & 255, hexNum & 255];
};

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
    static fromObject({red, green, blue}: {red?: number | null; green?: number | null; blue?: number | null}) {
        if (red == null || green == null || blue == null) {
            throw new Error('One or more required properties missing. Required properties: "red", "green", "blue"');
        }

        return new ColorRGB(red, green, blue);
    }

    /**
     * Convert to Object
     * @returns object with properties red, green and blue
     */
    toObject(): {red: number; green: number; blue: number} {
        return {red: this.red, green: this.green, blue: this.blue};
    }

    /**
     * Create RGB color from hex string
     * @param hex -hex encoded RGB color
     * @returns new ColoRGB object
     */
    static fromHex(hex: string): ColorRGB {
        const [r, g, b] = convertHexToRgb(hex);

        return new ColorRGB(r / 255, g / 255, b / 255);
    }

    /**
     * Create hex string from RGB color
     * @returns hex hex encoded RGB color
     */
    toHex(): string {
        return convertRgbToHex(this.red * 255, this.green * 255, this.blue * 255);
    }

    /**
     * Convert to HSV
     *
     * @returns color in HSV space
     */
    toHSV(): ColorHSV {
        const [h, s, v] = convertRgbToHsv(this.red * 255, this.green * 255, this.blue * 255);

        return new ColorHSV(h, s, v);
    }

    /**
     * Convert to CIE
     * @returns color in CIE space
     */
    toXY(gamut: Readonly<Gamut>): ColorXY {
        const [x, y, capY] = convertRgbToXyY(this.red * 255, this.green * 255, this.blue * 255, gamut);

        return new ColorXY(x, y, capY);
    }

    /**
     * Return this color with values rounded to given precision
     * @param precision - decimal places to round to
     */
    rounded(precision: number): ColorRGB {
        return new ColorRGB(precisionRound(this.red, precision), precisionRound(this.green, precision), precisionRound(this.blue, precision));
    }
}

/**
 *  Class representing color in CIE space
 */
export class ColorXY {
    /** x component (0..1) */
    x: number;
    /** y component (0..1) */
    y: number;
    /** Y component (0..1) */
    capY?: number | null;

    /**
     * Create CIE color
     */
    constructor(x: number, y: number, capY?: number | null) {
        /** x component (0..1) */
        this.x = x;
        /** y component (0..1) */
        this.y = y;
        /** Y component (0..1) */
        this.capY = capY;
    }

    /**
     * Create CIE color from object
     * @param xy - object with properties x and y
     * @returns new ColorXY object
     */
    static fromObject({x, y}: {x: number | string | null; y: number | string | null}): ColorXY {
        if (x == null || y == null) {
            throw new Error('One or more required properties missing. Required properties: "x", "y"');
        }

        return new ColorXY(Number(x), Number(y));
    }

    /**
     * Convert to object
     * @returns object with properties x and y
     */
    toObject(): {x: number; y: number} {
        return {
            x: this.x,
            y: this.y,
        };
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
        const n = (this.x - 0.332) / (0.1858 - this.y);
        const kelvin = Math.abs(437 * n ** 3 + 3601 * n ** 2 + 6861 * n + 5517);
        return kelvinToMireds(kelvin);
    }

    /**
     * Converts CIE color space to RGB color space
     */
    toRGB(gamut: Readonly<Gamut>): ColorRGB {
        const [r, g, b] = convertXyToRgb(this.x, this.y, this.capY, gamut);

        return new ColorRGB(r / 255, g / 255, b / 255);
    }

    /**
     * Convert to HSV
     * @returns color in HSV space
     */
    toHSV(gamut: Readonly<Gamut>): ColorHSV {
        return this.toRGB(gamut).toHSV();
    }

    /**
     * Return this color with value rounded to given precision
     * @param precision - decimal places to round to
     */
    rounded(precision: number): ColorXY {
        return new ColorXY(precisionRound(this.x, precision), precisionRound(this.y, precision));
    }
}

/**
 * Class representing color in HSV space
 */
export class ColorHSV {
    /** hue component (0..360) */
    hue: number | null | undefined;
    /** saturation component (0..100) */
    saturation: number | null | undefined;
    /** value component (0..100) */
    value: number | null | undefined;

    /**
     * Create color in HSV space
     */
    constructor(hue: number | null | undefined, saturation: number | null | undefined = null, value: number | null | undefined = null) {
        /** hue component (0..360) */
        this.hue = hue == null ? null : hue === 360 ? hue : hue % 360;
        /** saturation component (0..100) */
        this.saturation = saturation;
        /** value component (0..100) */
        this.value = value;
    }

    /**
     * Create HSV color from object
     */
    static fromObject({hue, saturation, value}: {hue?: number | null; saturation?: number | null; value?: number | null}): ColorHSV {
        if (hue == null && saturation == null) {
            throw new Error("HSV color must specify at least hue or saturation.");
        }

        return new ColorHSV(hue == null ? null : hue, saturation, value);
    }

    /**
     * Convert to object
     * @param includeValue - omit `value` from return
     */
    toObject(includeValue: boolean): {hue?: number; saturation?: number; value?: number} {
        const ret: {hue?: number; saturation?: number; value?: number} = {};

        if (this.hue != null) {
            ret.hue = this.hue;
        }

        if (this.saturation != null) {
            ret.saturation = this.saturation;
        }

        if (this.value != null && includeValue) {
            ret.value = this.value;
        }

        return ret;
    }

    /**
     * Create HSV color from HSL
     * @param hsl - color in HSL space
     * @returns color in HSV space
     */
    static fromHSL({hue, saturation, lightness}: {hue: number; saturation: number; lightness: number}): ColorHSV {
        if (hue === undefined || saturation === undefined || lightness === undefined) {
            throw new Error('One or more required properties missing. Required properties: "hue", "saturation", "lightness"');
        }

        const retH = hue;
        const retV = (saturation * Math.min(lightness, 100 - lightness)) / 100 + lightness;
        const retS = retV ? 200 * (1 - lightness / retV) : 0;

        return new ColorHSV(retH, retS, retV);
    }

    /**
     * Convert RGB color
     * @returns
     */
    toRGB(): ColorRGB {
        const [r, g, b] = convertHsvToRgb(this.hue ?? 0, this.saturation ?? 100, this.value ?? 100);

        return new ColorRGB(r / 255, g / 255, b / 255);
    }

    /**
     * Create CIE color from HSV
     */
    toXY(gamut: Readonly<Gamut>): ColorXY {
        return this.toRGB().toXY(gamut);
    }

    /**
     * Create Mireds from HSV
     * @returns color temp in mireds
     */
    toMireds(gamut: Readonly<Gamut>): number {
        return this.toRGB().toXY(gamut).toMireds();
    }

    /**
     * Returns HSV color after hue corrections
     * Applies hue linear interpolation if entity has hue correction data
     * `meta.options.hue_correction` expected format: array of hueIn -\> hueOut mappings; example: `[ {"in": 20, "out": 25}, {"in": 109, "out": 104}]`
     * @param meta - entity meta object
     * @returns corrected color in HSV space
     */
    colorCorrected(meta: Tz.Meta): ColorHSV {
        const hueCorrection = meta.options?.hue_correction as KeyValueAny[] | null | undefined;

        if (hueCorrection != null && hueCorrection.length >= 2) {
            const baseHue = this.hue ?? 0;
            // retain immutablity
            const clonedCorrectionMap = [...hueCorrection];

            // reverse sort calibration map and find left edge
            clonedCorrectionMap.sort((a, b) => b.in - a.in);
            const correctionLeft = clonedCorrectionMap.find((m) => m.in <= baseHue) || {in: 0, out: 0};

            // sort calibration map and find right edge
            clonedCorrectionMap.sort((a, b) => a.in - b.in);
            const correctionRight = clonedCorrectionMap.find((m) => m.in > baseHue) || {in: 359, out: 359};

            const ratio = 1 - (correctionRight.in - baseHue) / (correctionRight.in - correctionLeft.in);
            const newHue = Math.round(correctionLeft.out + ratio * (correctionRight.out - correctionLeft.out));

            return new ColorHSV(newHue, this.saturation, this.value);
        }

        return this;
    }

    /**
     * Return this color with value rounded to given precision
     * @param precision - decimal places to round to
     */
    rounded(precision: number): ColorHSV {
        return new ColorHSV(
            this.hue == null ? null : precisionRound(this.hue, precision),
            this.saturation == null ? null : precisionRound(this.saturation, precision),
            this.value == null ? null : precisionRound(this.value, precision),
        );
    }
}

export class Color {
    hsv: ColorHSV | null;
    xy: ColorXY | null;
    rgb: ColorRGB | null;

    /**
     * Create Color object
     * @param hsv - ColorHSV instance
     * @param rgb - ColorRGB instance
     * @param xy - ColorXY instance
     */
    constructor(hsv: ColorHSV | null, rgb: ColorRGB | null, xy: ColorXY | null) {
        if ((hsv ? 1 : 0) + (rgb ? 1 : 0) + (xy ? 1 : 0) !== 1) {
            throw new Error("Color object should have exactly only one of hsv, rgb or xy properties");
        }

        if (hsv != null) {
            if (!(hsv instanceof ColorHSV)) {
                throw new Error("hsv argument must be an instance of ColorHSV class");
            }
        } else if (rgb != null) {
            if (!(rgb instanceof ColorRGB)) {
                throw new Error("rgb argument must be an instance of ColorRGB class");
            }
        } else {
            if (!(xy instanceof ColorXY)) {
                throw new Error("xy argument must be an instance of ColorXY class");
            }
        }

        this.hsv = hsv;
        this.rgb = rgb;
        this.xy = xy;
    }

    /**
     * Create Color object from converter's value argument
     * @param value - converter value argument
     * @returns Color object
     */

    static fromConverterArg(
        value:
            | {
                  x?: number | string | null;
                  y?: number | string | null;
                  r?: number | null;
                  g?: number | null;
                  b?: number | null;
                  rgb?: string | null;
                  hex?: string | null;
                  h?: number | null;
                  s?: number | null;
                  l?: number | null;
                  hsl?: string | null;
                  hsb?: string | null;
                  v?: number | null;
                  hsv?: string | null;
                  hue?: number | null;
                  saturation?: number | null;
                  value?: number | null;
              }
            | string,
    ): Color {
        if (typeof value === "string") {
            const rgb = ColorRGB.fromHex(value.startsWith("#") ? value : `#${value}`);
            return new Color(null, rgb, null);
        }
        if (value.x != null && value.y != null) {
            const xy = ColorXY.fromObject(value as {x: number | string; y: number | string} /* XXX: typing failure due to lack of strict */);
            return new Color(null, null, xy);
        }
        if (value.r != null && value.g != null && value.b != null) {
            const rgb = new ColorRGB(value.r / 255, value.g / 255, value.b / 255);
            return new Color(null, rgb, null);
        }
        if (value.rgb != null) {
            const [r, g, b] = value.rgb.split(",").map((i: string) => Number.parseInt(i, 10));
            const rgb = new ColorRGB(r / 255, g / 255, b / 255);
            return new Color(null, rgb, null);
        }
        if (value.hex != null) {
            const rgb = ColorRGB.fromHex(value.hex.startsWith("#") ? value.hex : `#${value.hex}`);
            return new Color(null, rgb, null);
        }
        if (value.h != null && value.s != null && value.l != null) {
            const hsv = ColorHSV.fromHSL({hue: value.h, saturation: value.s, lightness: value.l});
            return new Color(hsv, null, null);
        }
        if (value.hsl != null) {
            const [h, s, l] = value.hsl.split(",").map((i: string) => Number.parseInt(i, 10));
            const hsv = ColorHSV.fromHSL({hue: h, saturation: s, lightness: l});
            return new Color(hsv, null, null);
        }
        if (value.h != null && value.s != null && value.b != null) {
            const hsv = new ColorHSV(value.h, value.s, value.b);
            return new Color(hsv, null, null);
        }
        if (value.hsb != null) {
            const [h, s, b] = value.hsb.split(",").map((i: string) => Number.parseInt(i, 10));
            const hsv = new ColorHSV(h, s, b);
            return new Color(hsv, null, null);
        }
        if (value.h != null && value.s != null && value.v != null) {
            const hsv = new ColorHSV(value.h, value.s, value.v);
            return new Color(hsv, null, null);
        }
        if (value.hsv != null) {
            const [h, s, v] = value.hsv.split(",").map((i: string) => Number.parseInt(i, 10));
            const hsv = new ColorHSV(h, s, v);
            return new Color(hsv, null, null);
        }
        if (value.h != null && value.s != null) {
            const hsv = new ColorHSV(value.h, value.s);
            return new Color(hsv, null, null);
        }
        if (value.h != null) {
            const hsv = new ColorHSV(value.h);
            return new Color(hsv, null, null);
        }
        if (value.s != null) {
            const hsv = new ColorHSV(null, value.s);
            return new Color(hsv, null, null);
        }
        if (value.hue != null || value.saturation != null) {
            const hsv = ColorHSV.fromObject(
                value as {hue: number; saturation: number; value?: number | null} /* XXX: typing failure due to lack of strict */,
            );

            return new Color(hsv, null, null);
        }
        throw new Error("Value does not contain valid color definition");
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
 * @param epPostfix - postfix from the end point name. This string will be appended to the result keys unconditionally.
 * @returns state with color, color_temp, and color_mode set and synchronized from newState's attributes
 *          (other attributes are not included make sure to merge yourself)
 */
export function syncColorState(
    newState: KeyValueAny,
    oldState: KeyValueAny,
    endpoint: Zh.Endpoint | Zh.Group,
    options: KeyValue,
    epPostfix?: string,
    gamut: Readonly<Gamut> = SUPPORTED_GAMUTS.cie1931,
): KeyValueAny {
    const colorTargets = [];
    const colorSync = options?.color_sync != null ? options.color_sync : true;
    const result: KeyValueAny = {};
    const [colorTempMin, colorTempMax] = findColorTempRange(endpoint);

    const keyPostfix = epPostfix ? epPostfix : "";
    const keys = {
        color: `color${keyPostfix}`,
        color_mode: `color_mode${keyPostfix}`,
        color_temp: `color_temp${keyPostfix}`,
    };

    // check if color sync is enabled
    if (!colorSync) {
        // copy newState.{color_mode,color,color_temp}
        if (newState[keys.color_mode] !== undefined) result[keys.color_mode] = newState[keys.color_mode];
        if (newState[keys.color] !== undefined) result[keys.color] = newState[keys.color];
        if (newState[keys.color_temp] !== undefined) result[keys.color_temp] = newState[keys.color_temp];
        return result;
    }

    // handle undefined newState/oldState
    if (newState === undefined) newState = {};
    if (oldState === undefined) oldState = {};

    // figure out current color_mode
    if (newState[keys.color_mode] !== undefined) {
        result[keys.color_mode] = newState[keys.color_mode];
    } else if (oldState[keys.color_mode] !== undefined) {
        result[keys.color_mode] = oldState[keys.color_mode];
    } else {
        if (newState[keys.color_temp] !== undefined) {
            result[keys.color_mode] = "color_temp";
        }
        if (newState[keys.color] !== undefined) {
            result[keys.color_mode] = newState[keys.color].hue !== undefined ? "hs" : "xy";
        }
    }

    // figure out target attributes
    if (oldState[keys.color_temp] !== undefined || newState[keys.color_temp] !== undefined) {
        colorTargets.push("color_temp");
    }
    if (
        (oldState[keys.color] !== undefined && oldState[keys.color].hue !== undefined && oldState[keys.color].saturation !== undefined) ||
        (newState[keys.color] !== undefined && newState[keys.color].hue !== undefined && newState[keys.color].saturation !== undefined)
    ) {
        colorTargets.push("hs");
    }
    if (
        (oldState[keys.color] !== undefined && oldState[keys.color].x !== undefined && oldState[keys.color].y !== undefined) ||
        (newState[keys.color] !== undefined && newState[keys.color].x !== undefined && newState[keys.color].y !== undefined)
    ) {
        colorTargets.push("xy");
    }

    // sync color attributes
    result[keys.color] = {};
    switch (result[keys.color_mode]) {
        case "hs":
            if (newState[keys.color] !== undefined && newState[keys.color].hue !== undefined) {
                Object.assign(result[keys.color], {hue: newState[keys.color].hue});
            } else if (oldState[keys.color] !== undefined && oldState[keys.color].hue !== undefined) {
                Object.assign(result[keys.color], {hue: oldState[keys.color].hue});
            }
            if (newState[keys.color] !== undefined && newState[keys.color].saturation !== undefined) {
                Object.assign(result[keys.color], {saturation: newState[keys.color].saturation});
            } else if (oldState[keys.color] !== undefined && oldState[keys.color].saturation !== undefined) {
                Object.assign(result[keys.color], {saturation: oldState[keys.color].saturation});
            }

            if (result[keys.color].hue !== undefined && result[keys.color].saturation !== undefined) {
                const hsv = new ColorHSV(result[keys.color].hue, result[keys.color].saturation);
                if (colorTargets.includes("color_temp")) {
                    result[keys.color_temp] = clampColorTemp(precisionRound(hsv.toMireds(gamut), 0), colorTempMin, colorTempMax);
                }
                if (colorTargets.includes("xy")) {
                    Object.assign(result[keys.color], hsv.toXY(gamut).rounded(4).toObject());
                }
            }
            break;
        case "xy":
            if (newState[keys.color] !== undefined && newState[keys.color].x !== undefined) {
                Object.assign(result[keys.color], {x: newState[keys.color].x});
            } else if (oldState[keys.color] !== undefined && oldState[keys.color].x !== undefined) {
                Object.assign(result[keys.color], {x: oldState[keys.color].x});
            }
            if (newState[keys.color] !== undefined && newState[keys.color].y !== undefined) {
                Object.assign(result[keys.color], {y: newState[keys.color].y});
            } else if (oldState[keys.color] !== undefined && oldState[keys.color].y !== undefined) {
                Object.assign(result[keys.color], {y: oldState[keys.color].y});
            }

            if (result[keys.color].x !== undefined && result[keys.color].y !== undefined) {
                const xy = new ColorXY(result[keys.color].x, result[keys.color].y);
                if (colorTargets.includes("color_temp")) {
                    result[keys.color_temp] = clampColorTemp(precisionRound(xy.toMireds(), 0), colorTempMin, colorTempMax);
                }
                if (colorTargets.includes("hs")) {
                    Object.assign(result[keys.color], xy.toHSV(gamut).rounded(0).toObject(false));
                }
            }
            break;
        case "color_temp":
            if (newState[keys.color_temp] !== undefined) {
                result[keys.color_temp] = newState[keys.color_temp];
            } else if (oldState[keys.color_temp] !== undefined) {
                result[keys.color_temp] = oldState[keys.color_temp];
            }

            if (result[keys.color_temp] !== undefined) {
                const xy = ColorXY.fromMireds(result[keys.color_temp]);
                if (colorTargets.includes("xy")) {
                    Object.assign(result[keys.color], xy.rounded(4).toObject());
                }
                if (colorTargets.includes("hs")) {
                    Object.assign(result[keys.color], xy.toHSV(gamut).rounded(0).toObject(false));
                }
            }
            break;
    }

    // drop empty result.color
    if (Object.keys(result[keys.color]).length === 0) {
        delete result[keys.color];
    }

    return result;
}
