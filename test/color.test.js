const libColor = require('../lib/color');

describe('lib/color.js', () => {
    describe('ColorRGB', () => {
        test.each([
            [{red: 0.5, green: 0.5, blue: 0.5}],
        ])('.{from,to}Object() - %j', (color) => {
            expect(libColor.ColorRGB.fromObject(color).toObject()).toEqual(color);
        });

        test.each([
            ['red', {red: 1.0, green: 0, blue: 0}, {hue: 0, saturation: 100, value: 100}],
            ['green', {red: 0, green: 1.0, blue: 0}, {hue: 120, saturation: 100, value: 100}],
            ['blue', {red: 0, green: 0, blue: 1.0}, {hue: 240, saturation: 100, value: 100}],
            ['white', {red: 1.0, green: 1.0, blue: 1.0}, {hue: 0, saturation: 0, value: 100}],
            ['black', {red: 0, green: 0, blue: 0}, {hue: 0, saturation: 0, value: 0}],
        ])('.toHSV() - %s', (_name, rgb, hsv) => {
            expect(libColor.ColorRGB.fromObject(rgb).toHSV().toObject()).toStrictEqual(hsv);
        });

        test.each([
            ['red', {red: 1.0, green: 0, blue: 0}, {x: 0.7006, y: 0.2993}],
            ['green', {red: 0, green: 1.0, blue: 0}, {x: 0.1724, y: 0.7468}],
            ['blue', {red: 0, green: 0, blue: 1.0}, {x: 0.1355, y: 0.0399}],
            ['white', {red: 1.0, green: 1.0, blue: 1.0}, {x: 0.3227, y: 0.329}],
            ['black', {red: 0, green: 0, blue: 0}, {x: 0, y: 0}],
        ])('.toXY() - %s', (_name, rgb, xy) => {
            expect(libColor.ColorRGB.fromObject(rgb).toXY().rounded(4).toObject()).toStrictEqual(xy);
        });

        test.each([
            [{red: 1.0, green: 1.0, blue: 1.0}, {red: 1.0, green: 1.0, blue: 1.0}],
            [{red: 0.5, green: 0.5, blue: 0.5}, {red: 0.2140, green: 0.2140, blue: 0.2140}],
            [{red: 0.0, green: 0.0, blue: 0.0}, {red: 0.0, green: 0.0, blue: 0.0}],
        ])('.gammaCorrected - %j', (input, output) => {
            expect(libColor.ColorRGB.fromObject(input).gammaCorrected().rounded(4).toObject()).toStrictEqual(output);
        });
    });

    describe('ColorHSV', () => {
        const cases = [
            [{hue: 0, saturation: 100, value: 100}, null],
            [{hue: 0, saturation: 100}, null],
            [{hue: 0}, null],
            [{saturation: 100}, null],
        ];

        test.each(cases)('.{from,to}Object() - %j', (input, output) => {
            expect(libColor.ColorHSV.fromObject(input).toObject()).toStrictEqual(output || input);
        });

        test.each([
            ...cases,
            [{hue: 359.31231, saturation: 99.969123, value: 99.983131}, {hue: 359.3, saturation: 100, value: 100}]
        ])('.{from,to}Object(), rounded - %j', (input, output) => {
            expect(libColor.ColorHSV.fromObject(input).rounded(1).toObject()).toStrictEqual(output || input);
        });

        test.each([
            [{hue: 0, saturation: 100, value: 100}, {h: 0, s: 100, v: 100}],
            [{hue: 0, saturation: 100}, {h: 0, s: 100}],
            [{hue: 0}, {h: 0}],
            [{saturation: 100}, {s: 100}],
        ])('.toObject() short - %j', (input, output) => {
            expect(libColor.ColorHSV.fromObject(input).toObject(true)).toStrictEqual(output);
        });

        test.each([
            ['red', {hue: 0, saturation: 100, value: 100}, {red: 1.0, green: 0, blue: 0}],
            ['red (only hue)', {hue: 0}, {red: 1.0, green: 0.0, blue: 0.0}],
            ['green', {hue: 120, saturation: 100, value: 100}, {red: 0, green: 1.0, blue: 0}],
            ['blue', {hue: 240, saturation: 100, value: 100}, {red: 0, green: 0, blue: 1.0}],
            ['white (red hue)', {hue: 0, saturation: 0, value: 100}, {red: 1.0, green: 1.0, blue: 1.0}],
            ['white (blue hue)', {hue: 120, saturation: 0, value: 100}, {red: 1.0, green: 1.0, blue: 1.0}],
            ['white (green hue)', {hue: 240, saturation: 0, value: 100}, {red: 1.0, green: 1.0, blue: 1.0}],
            ['white (only saturation)', {saturation: 0}, {red: 1.0, green: 1.0, blue: 1.0}],
            ['black', {hue: 0, saturation: 0, value: 0}, {red: 0, green: 0, blue: 0}],
        ])('.toRGB() - %s', (_name, hsv, rgb) => {
            expect(libColor.ColorHSV.fromObject(hsv).toRGB().toObject()).toStrictEqual(rgb);
        });

        test.each([
            ['red', {hue: 0, saturation: 100, value: 100}, {x: 0.7006, y: 0.2993}],
            ['red (only hue)', {hue: 0}, {x: 0.7006, y: 0.2993}],
            ['green', {hue: 120, saturation: 100, value: 100}, {x: 0.1724, y: 0.7468}],
            ['blue', {hue: 240, saturation: 100, value: 100}, {x: 0.1355, y: 0.0399}],
            ['white (red hue)', {hue: 0, saturation: 0, value: 100}, {x: 0.3227, y: 0.329}],
            ['white (blue hue)', {hue: 120, saturation: 0, value: 100}, {x: 0.3227, y: 0.329}],
            ['white (green hue)', {hue: 240, saturation: 0, value: 100}, {x: 0.3227, y: 0.329}],
            ['white (only saturation)', {saturation: 0}, {x: 0.3227, y: 0.329}],
            ['black', {hue: 0, saturation: 0, value: 0}, {x: 0, y: 0}],
        ])('.toXY() - %s', (_name, hsv, xy) => {
            expect(libColor.ColorHSV.fromObject(hsv).toXY().rounded(4).toObject()).toStrictEqual(xy);
        });
    });

    describe('ColorXY', () => {
        test.each([
            [{x: 5, y: 0.5}],
        ])('.{from,to}Object() - %j', (color) => {
            expect(libColor.ColorXY.fromObject(color).toObject()).toStrictEqual(color);
        });

        test.each([
            ['red', {x: 0.7006, y: 0.2993}, {red: 1.0, green: 0, blue: 0}],
            ['green', {x: 0.1724, y: 0.7468}, {red: 0, green: 1.0, blue: 0}],
            ['blue', {x: 0.1355, y: 0.0399}, {red: 0, green: 0, blue: 1.0}],
        ])('.toRGB() - %s', (_name, xy, rgb) => {
            expect(libColor.ColorXY.fromObject(xy).toRGB().rounded(4).toObject()).toStrictEqual(rgb, 4);
        });

        test.each([
            [500],
            [370],
            [150],
        ])('.{to,from}Mireds() - %j', (mireds) => {
            const asXY = libColor.ColorXY.fromMireds(mireds);
            const backConv = asXY.toMireds();
            const error = Math.abs(backConv - mireds);
            // better precision would require better lookup table or continuous conversion function
            expect(error).toBeLessThan(2.3);
        });
    });

    describe('Color', () => {
        test.each([
            [{x: 0.4969, y: 0.4719}, {xy: {x: 0.4969, y: 0.4719}}],
            [{r: 255, g: 213, b: 0}, {rgb: {red: 1.0, green: 0.8353, blue: 0}}],
            [{rgb: '255,213,0'}, {rgb: {red: 1.0, green: 0.8353, blue: 0}}],
            [{hex: 'FFD500'}, {rgb: {red: 1.0, green: 0.8353, blue: 0}}],
            ['#FFD500', {rgb: {red: 1.0, green: 0.8353, blue: 0}}],
            [{h: 50, s: 100, l: 50}, {hsv: {hue: 50, saturation: 100, value: 100}}],
            [{hsl: '50,100,50'}, {hsv: {hue: 50, saturation: 100, value: 100}}],
            [{h: 50, s: 100, b: 100}, {hsv: {hue: 50, saturation: 100, value: 100}}],
            [{hsb: '180,50,50'}, {hsv: {hue: 180, saturation: 50, value: 50}}],
            [{h: 50, s: 100, v: 100}, {hsv: {hue: 50, saturation: 100, value: 100}}],
            [{hsv: '50,100,100'}, {hsv: {hue: 50, saturation: 100, value: 100}}],
            [{h: 50, s: 100}, {hsv: {hue: 50, saturation: 100}}],
            [{h: 50}, {hsv: {hue: 50}}],
            [{s: 100}, {hsv: {saturation: 100}}],
            [{hue: 50, saturation: 100}, {hsv: {hue: 50, saturation: 100}}],
            [{hue: 50}, {hsv: {hue: 50}}],
            [{saturation: 100}, {hsv: {saturation: 100}}],
        ])('.fromConverterArg() - %j', (value, expected) => {
            // conversions reference: https://colordesigner.io/convert/hsltohsv
            const extracted = libColor.Color.fromConverterArg(value);

            if (expected.hsv === undefined) {
                expect(extracted.isHSV()).toBe(false);
            } else {
                expect(extracted.isHSV()).toBe(true);
                expect(extracted.hsv.toObject()).toStrictEqual(expected.hsv);
            }

            if (expected.rgb === undefined) {
                expect(extracted.isRGB()).toBe(false);
            } else {
                expect(extracted.isRGB()).toBe(true);
                expect(extracted.rgb.rounded(4).toObject()).toStrictEqual(expected.rgb);
            }

            if (expected.xy === undefined) {
                expect(extracted.isXY()).toBe(false);
            } else {
                expect(extracted.isXY()).toBe(true);
                expect(extracted.xy.rounded(4).toObject()).toStrictEqual(expected.xy);
            }
        });

        test.each([
            [{}],
            [{v: 100}],
            [{unknown_property: 42}],
        ])('.fromConverterArg() invalid - %j', (value) => {
            expect(() => libColor.Color.fromConverterArg(value)).toThrow();
        });
    });
});
