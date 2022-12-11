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

function decodeGradientColors(input, opts) {
    // Example set:         500104001350000000f3297ff3bd52f3bd52f3297ff3bd522800
    // Example get  4b010164fb74346b1350000000f3297fda7d55da7d55f3297fda7d552800

    // 4b01 - mode? (4) (0b00 single color?, 4b01 gradient?)
    //     01 - on/off (2) or is it 1 full byte?
    //       64 - brightness (2)
    //         fb74346b - unknown (8)
    //                 13 - length (2)
    //                   50 - ncolors (2)
    //                     000000 - unknown (6)
    //                           f3297fda7d55da7d55f3297fda7d55 - colors (6 * ncolors)
    //                                                         28 - segments (2)
    //                                                           00 - offset (2)

    // Skip the unknown prefix (4 bytes)
    input = input.slice(4);

    // On/off (1 byte)
    const on = parseInt(input.slice(0, 2), 16) === 1;
    input = input.slice(2);

    // Brightness (2 bytes)
    const brightness = parseInt(input.slice(0, 2), 16);
    input = input.slice(2);

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

    if (opts.reverse) {
        colors.reverse();
    }

    return {
        colors,

        gradient_extras: {
            colors: nColors,
            segments,
            offset,
            brightness,
            on,
        },
    };
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
