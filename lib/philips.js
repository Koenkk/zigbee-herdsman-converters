'use strict';

const ColorXY = require('./color').ColorXY;
const ColorRGB = require('./color').ColorRGB;

const encodeRGBToScaledGradient = (hex) => {
    const xy = ColorRGB.fromHex(hex).toXY();
    const x = xy.x * 4095 / 0.7347;
    const y = xy.y * 4095 / 0.8413;
    const xx = Math.round(x).toString(16);
    const yy = Math.round(y).toString(16);

    return [
        xx[1], xx[2],
        yy[2], xx[0],
        yy[0], yy[1],
    ].join('');
};

const decodeScaledGradientToRGB = (p) => {
    const x = p[3] + p[0] + p[1];
    const y = p[4] + p[5] + p[2];

    const xx = (parseInt(x, 16) * 0.7347 / 4095).toFixed(4);
    const yy = (parseInt(y, 16) * 0.8413 / 4095).toFixed(4);

    return new ColorXY(xx, yy).toRGB().toHEX();
};

const COLOR_MODE_GRADIENT = '4b01';
const COLOR_MODE_COLOR_XY = '0b00';
const COLOR_MODE_COLOR_TEMP = '0f00';
const COLOR_MODE_EFFECT = 'ab00';

const knownEffects = {
    '0180': 'candle',
    '0280': 'fireplace',
    '0380': 'colorloop',
    '0980': 'sunrise',
    '0a80': 'sparkle',
};


// decoder for manuSpecificPhilips2.state
function decodeGradientColors(input, opts) {
    // Gradient mode (4b01)
    // Example: 4b010164fb74346b1350000000f3297fda7d55da7d55f3297fda7d552800
    // 4b01 - mode? (4) (0b00 single color?, 4b01 gradient?)
    //     01 - on/off (2)
    //       64 - brightness (2)
    //         fb74346b - unknown (8) - Might be XY Color?
    //                 13 - length (2)
    //                   50 - ncolors (2)
    //                     000000 - unknown (6)
    //                           f3297fda7d55da7d55f3297fda7d55 - colors (6 * ncolors)
    //                                                         28 - segments (2)
    //                                                           00 - offset (2)
    //
    // Temperature mode (0f00)
    // Example: 0f0000044d01ab6f7067
    // 0f00 - mode (4)
    //     01 - on/off (2)
    //       1a - brightness (2)
    //          4d01 - color temperature (4)
    //              ab6f7067 - unknown (8)
    //
    // XY Color mode (0b00)
    // Example: 0b00010460b09c4e
    // 0b00 - mode (4) == 0b00 single color mode
    //     01 - on/off (2)
    //       04 - brightness (2)
    //         60b09c4e - color (8) (xLow, xHigh, yLow, yHigh)

    // ab000153df7e446a0180 candle
    // ab000153df7e446a0180 candle
    // ab0001febd9238660280 fireplace
    // ab0001febe92ab650380 colorloop

    // Effect mode (ab00)
    // Example: ab000153df7e446a0180
    // ab00 - mode (4)
    //     01 - on/off (2)
    //       53 - brightness (2)
    //         df7e446a - XY Color (8)
    //                 0180 - effect (4)

    // Device color mode
    const mode = input.slice(0, 4);
    input = input.slice(4);

    // On/off (2 bytes)
    const on = parseInt(input.slice(0, 2), 16) === 1;
    input = input.slice(2);

    // Brightness (2 bytes)
    const brightness = parseInt(input.slice(0, 2), 16);
    input = input.slice(2);

    // Gradient mode
    if (mode === COLOR_MODE_GRADIENT) {
        // Unknown (8 bytes)
        input = input.slice(8);

        // Length (2 bytes)
        input = input.slice(2);

        // Number of colors (2 bytes)
        const nColors = parseInt(input.slice(0, 2), 16) >> 4;
        input = input.slice(2);

        // Unknown (6 bytes)
        input = input.slice(6);

        // Colors (6 * nColors bytes)
        const colorsPayload = input.slice(0, 6 * nColors);
        input = input.slice(6 * nColors);
        const colors = colorsPayload.match(/.{6}/g).map(decodeScaledGradientToRGB);

        // Segments (2 bytes)
        const segments = parseInt(input.slice(0, 2), 16) >> 3;
        input = input.slice(2);

        // Offset (2 bytes)
        const offset = parseInt(input.slice(0, 2), 16) >> 3;

        if (opts && opts.reverse) {
            colors.reverse();
        }

        return {
            color_mode: 'gradient',
            colors,
            segments,
            offset,
            brightness,
            on,
        };
    } else if (mode === COLOR_MODE_COLOR_XY || mode === COLOR_MODE_EFFECT) {
        // XY Color mode
        const xLow = parseInt(input.slice(0, 2), 16);
        input = input.slice(2);
        const xHigh = parseInt(input.slice(0, 2), 16) << 8;
        input = input.slice(2);
        const yHigh = parseInt(input.slice(0, 2), 16);
        input = input.slice(2);
        const yLow = parseInt(input.slice(0, 2), 16) << 8;
        input = input.slice(2);


        const x = Math.round((xHigh | xLow) / 65535 * 10000) / 10000;
        const y = Math.round((yHigh | yLow) / 65535 * 10000) / 10000;

        if (mode === COLOR_MODE_COLOR_XY) {
            return {
                color_mode: 'xy',
                x, y,
                brightness, on,
            };
        }

        // Effect mode
        const effect = input.slice(0, 4);
        const name = knownEffects[effect] || `unknown_${effect}`;
        return {
            color_mode: 'effect',
            x, y,
            brightness, on,
            name,
        };
    } else if (mode === COLOR_MODE_COLOR_TEMP) {
        // Color temperature mode
        const low = parseInt(input.slice(0, 2), 16);
        input = input.slice(2);
        const high = parseInt(input.slice(0, 2), 16) << 8;
        input = input.slice(2);

        const temp = high | low;

        return {
            color_mode: 'color_temp',
            color_temp: temp,
            brightness,
            on,
        };
    }

    // Unknown mode
    return {};
}

// Value is a list of RGB HEX colors
function encodeGradientColors(value, opts) {
    if (value.length > 9) {
        throw new Error(`Expected up to 9 colors, got ${value.length}`);
    }
    if (value.length < 1) {
        throw new Error(`Expected at least 1 color, got 0`);
    }

    // For devices where it makes more sense to specify the colors in reverse
    // For example Hue Signe, where the last color is the top color.
    if (opts.reverse) {
        value.reverse();
    }

    // The number of colors and segments can technically differ. Here they are always the same, but we could
    // support it by extending the API.
    // If number of colors is less than the number of segments, the colors will repeat.
    // It seems like the maximum number of colors is 9, and the maximum number of segments is 31.
    const nColors = (value.length << 4).toString(16).padStart(2, '0');

    let segments = value.length;
    if (opts.segments) {
        segments = opts.segments;
    }

    if (segments < 1 || segments > 31) {
        throw new Error(`Expected segments to be between 1 and 31 (inclusive), got ${segments}`);
    }
    const segmentsPayload = (segments << 3).toString(16).padStart(2, '0');

    // Encode the colors
    const colorsPayload = value.map(encodeRGBToScaledGradient).join('');

    // Offset of the first color. 0 means the first segment uses the first color. (min 0, max 31)
    let offset = 0;
    if (opts.offset) {
        offset = opts.offset;
    }
    const offsetPayload = (offset << 3).toString(16).padStart(2, '0');

    // Payload length
    const length = (1 + 3 * (value.length + 1)).toString(16).padStart(2, '0');

    // 5001 - mode? set gradient?
    // 0400 - unknown
    const scene = `50010400${length}${nColors}000000${colorsPayload}${segmentsPayload}${offsetPayload}`;

    return scene;
}

module.exports = {
    decodeGradientColors,
    encodeGradientColors,
};
