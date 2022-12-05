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
    const offset = input.indexOf('0000000') + 7;
    const points = input.slice(offset, - 4);
    const pairs = points.match(/.{6}/g);
    const colors = pairs.map(decodeScaledGradientToRGB);

    if (opts.reverse) {
        colors.reverse();
    }

    return colors;
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
    const nColors = (value.length << 4).toString(16);
    const segments = (value.length << 3).toString(16);

    // Encode the colors
    const colorsPayload = value.map(encodeRGBToScaledGradient).join('');

    // Offset of the first color, left shifted 3 bits. 0 means the first segment uses the first color.
    const offset = '00';

    // Payload length
    const length = (1 + 3 * (value.length + 1)).toString(16);

    const scene = `50010400${length}${nColors}000000${colorsPayload}${segments}${offset}`;

    return scene;
}

module.exports = {
    decodeGradientColors,
    encodeGradientColors,
};
