const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['RCL 240 T'],
        model: 'RCL 240 T',
        vendor: 'Innr',
        description: 'Smart round ceiling lamp comfort',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [200, 454]}),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['FL 140 C'],
        model: 'FL 140 C',
        vendor: 'Innr',
        description: 'Color Flex LED strip 4m 1200lm',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['FL 130 C'],
        model: 'FL 130 C',
        vendor: 'Innr',
        description: 'Color Flex LED strip',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['FL 120 C'],
        model: 'FL 120 C',
        vendor: 'Innr',
        description: 'Color Flex LED strip',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['BF 263'],
        model: 'BF 263',
        vendor: 'Innr',
        description: 'B22 filament bulb dimmable',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['OPL 130 C'],
        model: 'OPL 130 C',
        vendor: 'Innr',
        description: 'Outdoor smart pedestal light colour',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 185 C'],
        model: 'RB 185 C',
        vendor: 'Innr',
        description: 'E27 bulb RGBW',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['BY 185 C'],
        model: 'BY 185 C',
        vendor: 'Innr',
        description: 'B22 bulb RGBW',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 250 C'],
        model: 'RB 250 C',
        vendor: 'Innr',
        description: 'E14 bulb RGBW',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {enhancedHue: false, applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 251 C'],
        model: 'RB 251 C',
        vendor: 'Innr',
        description: 'E14 bulb RGBW',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {enhancedHue: false, applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 265'],
        model: 'RB 265',
        vendor: 'Innr',
        description: 'E27 bulb',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RF 265'],
        model: 'RF 265',
        vendor: 'Innr',
        description: 'E27 bulb filament clear',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['BF 265'],
        model: 'BF 265',
        vendor: 'Innr',
        description: 'B22 bulb filament clear',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 278 T'],
        model: 'RB 278 T',
        vendor: 'Innr',
        description: 'Smart bulb tunable white E27',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 555]}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 285 C'],
        model: 'RB 285 C',
        vendor: 'Innr',
        description: 'E27 bulb RGBW',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {enhancedHue: false, applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['BY 285 C'],
        model: 'BY 285 C',
        vendor: 'Innr',
        description: 'B22 bulb RGBW',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 165'],
        model: 'RB 165',
        vendor: 'Innr',
        description: 'E27 bulb',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 162'],
        model: 'RB 162',
        vendor: 'Innr',
        description: 'E27 bulb',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 172 W'],
        model: 'RB 172 W',
        vendor: 'Innr',
        description: 'ZigBee E27 retrofit bulb, warm dimmable 2200-2700K, 806 Lm',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 175 W'],
        model: 'RB 175 W',
        vendor: 'Innr',
        description: 'E27 bulb warm dimming',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 178 T'],
        model: 'RB 178 T',
        vendor: 'Innr',
        description: 'Smart bulb tunable white E27',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 555]}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['BY 178 T'],
        model: 'BY 178 T',
        vendor: 'Innr',
        description: 'Smart bulb tunable white B22',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 555]}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 122'],
        model: 'RS 122',
        vendor: 'Innr',
        description: 'GU10 spot',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 125'],
        model: 'RS 125',
        vendor: 'Innr',
        description: 'GU10 spot',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 225'],
        model: 'RS 225',
        vendor: 'Innr',
        description: 'GU10 Spot',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 226'],
        model: 'RS 226',
        vendor: 'Innr',
        description: 'GU10 Spot',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 227 T'],
        model: 'RS 227 T',
        vendor: 'Innr',
        description: 'GU10 spot 420 lm, dimmable, white spectrum',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [200, 454]}),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 128 T'],
        model: 'RS 128 T',
        vendor: 'Innr',
        description: 'GU10 spot 350 lm, dimmable, white spectrum',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 555]}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 228 T'],
        model: 'RS 228 T',
        vendor: 'Innr',
        description: 'GU10 spot 350 lm, dimmable, white spectrum',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [200, 454]}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 229 T'],
        model: 'RS 229 T',
        vendor: 'Innr',
        description: 'GU10 spot 350 lm, dimmable, white spectrum',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [200, 454]}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 230 C'],
        model: 'RS 230 C',
        vendor: 'Innr',
        description: 'GU10 spot 350 lm, dimmable, RGBW',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        exposes: [e.light_brightness_colortemp_color()],
        meta: {enhancedHue: false, applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 145'],
        model: 'RB 145',
        vendor: 'Innr',
        description: 'E14 candle',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 245'],
        model: 'RB 245',
        vendor: 'Innr',
        description: 'E14 candle',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 248 T'],
        model: 'RB 248 T',
        vendor: 'Innr',
        description: 'E14 candle with white spectrum',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 555]}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 148 T'],
        model: 'RB 148 T',
        vendor: 'Innr',
        description: 'E14 candle with white spectrum',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 555]}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RF 261'],
        model: 'RF 261',
        vendor: 'Innr',
        description: 'E27 filament bulb dimmable',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RF 263'],
        model: 'RF 263',
        vendor: 'Innr',
        description: 'E27 filament bulb dimmable',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RF 264'],
        model: 'RF 264',
        vendor: 'Innr',
        description: 'E27 filament bulb dimmable',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['BY 165', 'BY 265'],
        model: 'BY 165',
        vendor: 'Innr',
        description: 'B22 bulb dimmable',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RCL 110'],
        model: 'RCL 110',
        vendor: 'Innr',
        description: 'Round ceiling light',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RSL 110'],
        model: 'RSL 110',
        vendor: 'Innr',
        description: 'Recessed spot light',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RSL 115'],
        model: 'RSL 115',
        vendor: 'Innr',
        description: 'Recessed spot light',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['PL 110'],
        model: 'PL 110',
        vendor: 'Innr',
        description: 'Puck Light',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['PL 115'],
        model: 'PL 115',
        vendor: 'Innr',
        description: 'Puck Light',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['ST 110'],
        model: 'ST 110',
        vendor: 'Innr',
        description: 'Strip Light',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['UC 110'],
        model: 'UC 110',
        vendor: 'Innr',
        description: 'Under cabinet light',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['DL 110 N'],
        model: 'DL 110 N',
        vendor: 'Innr',
        description: 'Spot narrow',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['DL 110 W'],
        model: 'DL 110 W',
        vendor: 'Innr',
        description: 'Spot wide',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['SL 110 N'],
        model: 'SL 110 N',
        vendor: 'Innr',
        description: 'Spot Flex narrow',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['SL 110 M'],
        model: 'SL 110 M',
        vendor: 'Innr',
        description: 'Spot Flex medium',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['SL 110 W'],
        model: 'SL 110 W',
        vendor: 'Innr',
        description: 'Spot Flex wide',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['AE 260'],
        model: 'AE 260',
        vendor: 'Innr',
        description: 'E26/24 bulb',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['AE 280 C'],
        model: 'AE 280 C',
        vendor: 'Innr',
        description: 'E26 bulb RGBW',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['SP 120'],
        model: 'SP 120',
        vendor: 'Innr',
        description: 'Smart plug',
        fromZigbee: [fz.electrical_measurement, fz.on_off, fz.ignore_genLevelCtrl_report, fz.metering],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            // Gives UNSUPPORTED_ATTRIBUTE on reporting.readEletricalMeasurementMultiplierDivisors.
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acCurrentDivisor: 1000,
                acCurrentMultiplier: 1,
            });
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint);
            // Gives UNSUPPORTED_ATTRIBUTE on reporting.readMeteringMultiplierDivisor.
            endpoint.saveClusterAttributeKeyValue('seMetering', {multiplier: 1, divisor: 100});
            await reporting.currentSummDelivered(endpoint);
        },
        exposes: [e.power(), e.current(), e.voltage().withAccess(ea.STATE), e.switch(), e.energy()],
    },
    {
        zigbeeModel: ['SP 220'],
        model: 'SP 220',
        vendor: 'Innr',
        description: 'Smart plug',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['SP 222'],
        model: 'SP 222',
        vendor: 'Innr',
        description: 'Smart plug',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['SP 224'],
        model: 'SP 224',
        vendor: 'Innr',
        description: 'Smart plug',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['SP 234'],
        model: 'SP 234',
        vendor: 'Innr',
        description: 'Smart plug',
        fromZigbee: [fz.electrical_measurement, fz.on_off, fz.ignore_genLevelCtrl_report, fz.metering],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            // Gives UNSUPPORTED_ATTRIBUTE on reporting.readEletricalMeasurementMultiplierDivisors.
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acCurrentDivisor: 1000,
                acCurrentMultiplier: 1,
            });
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint);
            // Gives UNSUPPORTED_ATTRIBUTE on reporting.readMeteringMultiplierDivisor.
            endpoint.saveClusterAttributeKeyValue('seMetering', {multiplier: 1, divisor: 100});
        },
        exposes: [e.power(), e.current(), e.voltage().withAccess(ea.STATE), e.switch(), e.energy()],
    },
    {
        zigbeeModel: ['OFL 120 C'],
        model: 'OFL 120 C',
        vendor: 'Innr',
        description: 'Outdoor flex light colour LED strip 2m, 550lm, RGBW',
        extend: extend.light_onoff_brightness_colortemp_color({supportsHS: true}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['OFL 140 C'],
        model: 'OFL 140 C',
        vendor: 'Innr',
        description: 'Outdoor flex light colour LED strip 4m, 1000lm, RGBW',
        extend: extend.light_onoff_brightness_colortemp_color({supportsHS: true}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['OSL 130 C'],
        model: 'OSL 130 C',
        vendor: 'Innr',
        description: 'Outdoor smart spot colour, 230lm/spot, RGBW',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 555], supportsHS: true}),
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['BE 220'],
        model: 'BE 220',
        vendor: 'Innr',
        description: 'E26/E24 white bulb',
        extend: extend.light_onoff_brightness(),
        meta: {turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RC 110'],
        model: 'RC 110',
        vendor: 'Innr',
        description: 'Innr RC 110 Remote Control',
        fromZigbee: [fz.command_step, fz.command_move, fz.command_stop, fz.command_on, fz.command_off, fz.rc_110_level_to_scene],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'all': 1, 'l1': 3, 'l2': 4, 'l3': 5, 'l4': 6, 'l5': 7, 'l6': 8};
        },
        exposes: [e.action(['on_*', 'off_*', 'brightness_*', 'scene_*'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint,
                ['genBasic', 'genGroups', 'genScenes', 'genOnOff', 'genLevelCtrl']);
            for (const ep of [3, 4, 5, 6, 7, 8]) {
                const endpoint = device.getEndpoint(ep);
                await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            }
        },
    },
];
