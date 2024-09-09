import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';
const e = exposes.presets;
import {light, onOff, electricityMeter, reconfigureReportingsOnDeviceAnnounce} from '../lib/modernExtend';
import * as ota from '../lib/ota';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['RC 210'],
        model: 'RC 210',
        vendor: 'Innr',
        description: 'Remote control',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.command_move_to_level, fz.command_move_to_color_temp],
        toZigbee: [],
        exposes: [
            e.action([
                'on',
                'off',
                'brightness_move_up',
                'brightness_move_down',
                'brightness_stop',
                'brightness_move_to_level',
                'color_temperature_move',
            ]),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const ep = device.getEndpoint(1);
            await reporting.bind(ep, coordinatorEndpoint, ['genBasic', 'genOnOff', 'genLevelCtrl', 'lightingColorCtrl']);
        },
    },
    {
        zigbeeModel: ['RC 250'],
        model: 'RC 250',
        vendor: 'Innr',
        description: 'Remote control',
        fromZigbee: [fz.command_step, fz.command_on, fz.command_off, fz.command_move_to_level, fz.command_move_to_color_temp],
        toZigbee: [],
        exposes: [e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'brightness_move_to_level', 'color_temperature_move'])],
        configure: async (device, coordinatorEndpoint) => {
            const ep = device.getEndpoint(1);
            await reporting.bind(ep, coordinatorEndpoint, ['genBasic', 'genGroups', 'genScenes', 'genOnOff', 'genLevelCtrl', 'lightingColorCtrl']);
        },
    },
    {
        zigbeeModel: ['AE 262'],
        model: 'AE 262',
        vendor: 'Innr',
        description: 'Smart E26 LED bulb',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['RCL 240 T'],
        model: 'RCL 240 T',
        vendor: 'Innr',
        description: 'Smart round ceiling lamp comfort',
        extend: [light({colorTemp: {range: [200, 454]}, turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['FL 142 C'],
        model: 'FL 142 C',
        vendor: 'Innr',
        description: 'Color Flex LED strip 4m 2000lm',
        extend: [light({colorTemp: {range: [150, 500], startup: false}, color: {modes: ['xy', 'hs']}, powerOnBehavior: false})],
    },
    {
        zigbeeModel: ['FL 140 C'],
        model: 'FL 140 C',
        vendor: 'Innr',
        description: 'Color Flex LED strip 4m 1200lm',
        extend: [light({colorTemp: {range: [153, 555]}, color: {modes: ['xy', 'hs'], applyRedFix: true}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['FL 130 C'],
        model: 'FL 130 C',
        vendor: 'Innr',
        description: 'Color Flex LED strip',
        extend: [
            light({
                colorTemp: {range: [153, 555]},
                color: {modes: ['xy', 'hs'], applyRedFix: true},
                powerOnBehavior: false,
                turnsOffAtBrightness1: true,
            }),
        ],
    },
    {
        zigbeeModel: ['FL 120 C'],
        model: 'FL 120 C',
        vendor: 'Innr',
        description: 'Color Flex LED strip',
        extend: [
            light({
                colorTemp: {range: [153, 555]},
                color: {modes: ['xy', 'hs'], applyRedFix: true},
                powerOnBehavior: false,
                turnsOffAtBrightness1: true,
            }),
        ],
    },
    {
        zigbeeModel: ['BF 263'],
        model: 'BF 263',
        vendor: 'Innr',
        description: 'B22 filament bulb dimmable',
        extend: [light({turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['OLS 210'],
        model: 'OLS 210',
        vendor: 'Innr',
        description: 'Smart outdoor light string',
        extend: [light({turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['OGL 130 C'],
        model: 'OGL 130 C',
        vendor: 'Innr',
        description: 'Outdoor smart globe lights',
        extend: [light({colorTemp: {range: [100, 1000]}, color: {modes: ['xy', 'hs'], applyRedFix: true}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['OPL 130 C'],
        model: 'OPL 130 C',
        vendor: 'Innr',
        description: 'Outdoor smart pedestal light colour',
        extend: [
            light({
                colorTemp: {range: [153, 555], startup: false},
                color: {modes: ['xy', 'hs'], applyRedFix: true},
                turnsOffAtBrightness1: true,
            }),
        ],
    },
    {
        zigbeeModel: ['RB 185 C'],
        model: 'RB 185 C',
        vendor: 'Innr',
        description: 'E27 bulb RGBW',
        extend: [light({colorTemp: {range: [153, 555]}, color: {modes: ['xy', 'hs'], applyRedFix: true}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['BY 185 C'],
        model: 'BY 185 C',
        vendor: 'Innr',
        description: 'B22 bulb RGBW',
        extend: [light({colorTemp: {range: [153, 555]}, color: {modes: ['xy', 'hs'], applyRedFix: true}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['RB 250 C'],
        model: 'RB 250 C',
        vendor: 'Innr',
        description: 'E14 bulb RGBW',
        extend: [
            light({
                colorTemp: {range: [153, 555]},
                color: {modes: ['xy', 'hs'], enhancedHue: false, applyRedFix: true},
                turnsOffAtBrightness1: true,
            }),
        ],
    },
    {
        zigbeeModel: ['RB 251 C'],
        model: 'RB 251 C',
        vendor: 'Innr',
        description: 'E14 bulb RGBW',
        extend: [
            light({
                colorTemp: {range: [153, 555]},
                color: {modes: ['xy', 'hs'], enhancedHue: false, applyRedFix: true},
                turnsOffAtBrightness1: true,
            }),
        ],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['RB 262'],
        model: 'RB 262',
        vendor: 'Innr',
        description: 'E27 bulb',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['RB 265'],
        model: 'RB 265',
        vendor: 'Innr',
        description: 'E27 bulb',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['BY 266'],
        model: 'BY 266',
        vendor: 'Innr',
        description: 'B22 (Bayonet) bulb, dimmable',
        extend: [light({turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
        endpoint: (device) => {
            return {default: 1};
        },
    },
    {
        zigbeeModel: ['RB 266'],
        model: 'RB 266',
        vendor: 'Innr',
        description: 'E27 bulb',
        extend: [light({turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
        endpoint: (device) => {
            return {default: 1};
        },
    },
    {
        zigbeeModel: ['RB 267'],
        model: 'RB 267',
        vendor: 'Innr',
        description: 'E27 smart bulb white 1100',
        extend: [light({turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
        endpoint: (device) => {
            return {default: 1};
        },
    },
    {
        zigbeeModel: ['RF 262'],
        model: 'RF 262',
        vendor: 'Innr',
        description: 'E27 smart filament LED light bulb',
        extend: [light({turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['RF 265'],
        model: 'RF 265',
        vendor: 'Innr',
        description: 'E27 bulb filament clear',
        extend: [light({turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['BF 265'],
        model: 'BF 265',
        vendor: 'Innr',
        description: 'B22 bulb filament clear',
        extend: [light({turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['RB 272 T'],
        model: 'RB 272 T',
        vendor: 'Innr',
        description: 'Smart bulb tunable white E27',
        extend: [light({colorTemp: {range: [153, 555]}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['RB 278 T'],
        model: 'RB 278 T',
        vendor: 'Innr',
        description: 'Smart bulb tunable white E27',
        extend: [light({colorTemp: {range: [153, 555]}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['RB 279 T'],
        model: 'RB 279 T',
        vendor: 'Innr',
        description: 'Smart bulb tunable white E27',
        extend: [light({colorTemp: {range: [153, 555]}, color: {applyRedFix: true}, turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
        endpoint: (device) => {
            return {default: 1};
        },
    },
    {
        zigbeeModel: ['RB 285 C'],
        model: 'RB 285 C',
        vendor: 'Innr',
        description: 'E27 bulb RGBW',
        extend: [
            light({
                colorTemp: {range: [153, 555]},
                color: {modes: ['xy', 'hs'], enhancedHue: false, applyRedFix: true},
                turnsOffAtBrightness1: true,
            }),
        ],
    },
    {
        zigbeeModel: ['RB 286 C'],
        model: 'RB 286 C',
        vendor: 'Innr',
        description: 'E27 bulb RGBW',
        extend: [light({colorTemp: {range: [153, 555]}, color: {modes: ['xy', 'hs'], applyRedFix: true}, turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['BY 285 C'],
        model: 'BY 285 C',
        vendor: 'Innr',
        description: 'B22 bulb RGBW',
        extend: [light({colorTemp: {range: [153, 555]}, color: {modes: ['xy', 'hs'], applyRedFix: true}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['BY 286 C'],
        model: 'BY 286 C',
        vendor: 'Innr',
        description: 'B22 bulb RGBW',
        extend: [light({colorTemp: {range: [153, 555]}, color: {modes: ['xy', 'hs'], applyRedFix: true}, turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['RB 165'],
        model: 'RB 165',
        vendor: 'Innr',
        description: 'E27 bulb',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['RB 162'],
        model: 'RB 162',
        vendor: 'Innr',
        description: 'E27 bulb',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['RB 172 W'],
        model: 'RB 172 W',
        vendor: 'Innr',
        description: 'ZigBee E27 retrofit bulb, warm dimmable 2200-2700K, 806 Lm',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['RB 175 W'],
        model: 'RB 175 W',
        vendor: 'Innr',
        description: 'E27 bulb warm dimming',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['RB 178 T'],
        model: 'RB 178 T',
        vendor: 'Innr',
        description: 'Smart bulb tunable white E27',
        extend: [light({colorTemp: {range: [153, 555]}, color: {applyRedFix: true}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['BY 178 T'],
        model: 'BY 178 T',
        vendor: 'Innr',
        description: 'Smart bulb tunable white B22',
        extend: [light({colorTemp: {range: [153, 555]}, color: {applyRedFix: true}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['RS 122'],
        model: 'RS 122',
        vendor: 'Innr',
        description: 'GU10 spot',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['RS 125'],
        model: 'RS 125',
        vendor: 'Innr',
        description: 'GU10 spot',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['RS 225'],
        model: 'RS 225',
        vendor: 'Innr',
        description: 'GU10 Spot',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['RS 226'],
        model: 'RS 226',
        vendor: 'Innr',
        description: 'GU10 Spot',
        extend: [light({turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['RS 227 T'],
        model: 'RS 227 T',
        vendor: 'Innr',
        description: 'GU10 spot 420 lm, dimmable, white spectrum',
        extend: [light({colorTemp: {range: [200, 454]}, turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
        endpoint: (device) => {
            return {default: 1};
        },
    },
    {
        zigbeeModel: ['RS 128 T'],
        model: 'RS 128 T',
        vendor: 'Innr',
        description: 'GU10 spot 350 lm, dimmable, white spectrum',
        extend: [light({colorTemp: {range: [153, 555]}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['RS 228 T'],
        model: 'RS 228 T',
        vendor: 'Innr',
        description: 'GU10 spot 350 lm, dimmable, white spectrum',
        extend: [light({colorTemp: {range: [200, 454]}, color: {applyRedFix: true}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['RS 229 T'],
        model: 'RS 229 T',
        vendor: 'Innr',
        description: 'GU10 spot 350 lm, dimmable, white spectrum',
        extend: [light({colorTemp: {range: [200, 454]}, color: {applyRedFix: true}, turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['RS 230 C'],
        model: 'RS 230 C',
        vendor: 'Innr',
        description: 'GU10 spot 350 lm, dimmable, RGBW',
        extend: [
            light({
                colorTemp: {range: [153, 555]},
                color: {modes: ['xy', 'hs'], enhancedHue: false, applyRedFix: true},
                turnsOffAtBrightness1: true,
            }),
        ],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['RS 232 C'],
        model: 'RS 232 C',
        vendor: 'Innr',
        description: 'GU10 spot, dimmable, RGBW',
        extend: [
            light({
                colorTemp: {range: [153, 555]},
                color: {modes: ['xy', 'hs'], enhancedHue: false, applyRedFix: true},
                turnsOffAtBrightness1: true,
            }),
        ],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['RB 145'],
        model: 'RB 145',
        vendor: 'Innr',
        description: 'E14 candle',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['RB 245'],
        model: 'RB 245',
        vendor: 'Innr',
        description: 'E14 candle',
        extend: [light({turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['RB 243'],
        model: 'RB 243',
        vendor: 'Innr',
        description: 'E14 candle',
        extend: [light({turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['RB 248 T'],
        model: 'RB 248 T',
        vendor: 'Innr',
        description: 'E14 candle with white spectrum',
        extend: [light({colorTemp: {range: [153, 555]}, color: {applyRedFix: true}, turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['RB 249 T'],
        model: 'RB 249 T',
        vendor: 'Innr',
        description: 'E14 candle, dimmable with, color temp',
        extend: [light({colorTemp: {range: [200, 454]}, turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['RB 148 T'],
        model: 'RB 148 T',
        vendor: 'Innr',
        description: 'E14 candle with white spectrum',
        extend: [light({colorTemp: {range: [153, 555]}, color: {applyRedFix: true}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['RF 261'],
        model: 'RF 261',
        vendor: 'Innr',
        description: 'E27 filament bulb dimmable',
        extend: [light({turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['RF 263'],
        model: 'RF 263',
        vendor: 'Innr',
        description: 'E27 filament bulb dimmable',
        extend: [light({turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['RF 264'],
        model: 'RF 264',
        vendor: 'Innr',
        description: 'E27 filament bulb dimmable',
        extend: [light({turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['BY 165', 'BY 265'],
        model: 'BY 165',
        vendor: 'Innr',
        description: 'B22 bulb dimmable',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['RCL 110'],
        model: 'RCL 110',
        vendor: 'Innr',
        description: 'Round ceiling light',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['RSL 110'],
        model: 'RSL 110',
        vendor: 'Innr',
        description: 'Recessed spot light',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['RSL 115'],
        model: 'RSL 115',
        vendor: 'Innr',
        description: 'Recessed spot light',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['PL 110'],
        model: 'PL 110',
        vendor: 'Innr',
        description: 'Puck Light',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['PL 115'],
        model: 'PL 115',
        vendor: 'Innr',
        description: 'Puck Light',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['ST 110'],
        model: 'ST 110',
        vendor: 'Innr',
        description: 'Strip Light',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['UC 110'],
        model: 'UC 110',
        vendor: 'Innr',
        description: 'Under cabinet light',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['DL 110 N'],
        model: 'DL 110 N',
        vendor: 'Innr',
        description: 'Spot narrow',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['DL 110 W'],
        model: 'DL 110 W',
        vendor: 'Innr',
        description: 'Spot wide',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['SL 110 N'],
        model: 'SL 110 N',
        vendor: 'Innr',
        description: 'Spot Flex narrow',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['SL 110 M'],
        model: 'SL 110 M',
        vendor: 'Innr',
        description: 'Spot Flex medium',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['SL 110 W'],
        model: 'SL 110 W',
        vendor: 'Innr',
        description: 'Spot Flex wide',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['AE 260'],
        model: 'AE 260',
        vendor: 'Innr',
        description: 'E26/24 bulb',
        extend: [light({turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['AE 270 T'],
        model: 'AE 270 T',
        vendor: 'Innr',
        description: 'E26/24 bulb 1100lm, dimmable, white spectrum',
        extend: [light({colorTemp: {range: [154, 500]}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['AE 280 C'],
        model: 'AE 280 C',
        vendor: 'Innr',
        description: 'E26 bulb RGBW',
        extend: [light({colorTemp: {range: [153, 555]}, color: {modes: ['xy', 'hs'], applyRedFix: true}, turnsOffAtBrightness1: true})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SP 120'],
        model: 'SP 120',
        vendor: 'Innr',
        description: 'Smart plug',
        extend: [
            onOff({powerOnBehavior: false}),
            electricityMeter({current: {divisor: 1000}, voltage: {divisor: 1}, power: {divisor: 1}, energy: {divisor: 100}}),
        ],
    },
    {
        zigbeeModel: ['SP 110'],
        model: 'SP 110',
        vendor: 'Innr',
        description: 'Smart plug',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['SP 220'],
        model: 'SP 220',
        vendor: 'Innr',
        description: 'Smart plug',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['SP 222'],
        model: 'SP 222',
        vendor: 'Innr',
        description: 'Smart plug',
        extend: [onOff()],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SP 224'],
        model: 'SP 224',
        vendor: 'Innr',
        description: 'Smart plug',
        extend: [onOff()],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SP 234'],
        model: 'SP 234',
        vendor: 'Innr',
        description: 'Smart plug',
        extend: [onOff(), electricityMeter({current: {divisor: 1000}, voltage: {divisor: 1}, power: {divisor: 1}, energy: {divisor: 100}})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['OSP 210'],
        model: 'OSP 210',
        vendor: 'Innr',
        description: 'Outdoor smart plug',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['OFL 120 C'],
        model: 'OFL 120 C',
        vendor: 'Innr',
        description: 'Outdoor flex light colour LED strip 2m, 550lm, RGBW',
        extend: [light({colorTemp: {range: undefined}, color: {modes: ['xy', 'hs'], applyRedFix: true}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['OFL 140 C'],
        model: 'OFL 140 C',
        vendor: 'Innr',
        description: 'Outdoor flex light colour LED strip 4m, 1000lm, RGBW',
        extend: [light({colorTemp: {range: undefined}, color: {modes: ['xy', 'hs'], applyRedFix: true}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['OFL 142 C'],
        model: 'OFL 142 C',
        vendor: 'Innr',
        description: 'Outdoor flex light colour LED strip 4m, 1440lm, RGBW',
        extend: [light({colorTemp: {range: [100, 350]}, color: {modes: ['xy', 'hs'], applyRedFix: true}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['RB 255 C'],
        model: 'RB 255 C',
        vendor: 'Innr',
        description: 'E14 mini bulb RGBW',
        extend: [
            light({
                colorTemp: {range: [153, 555]},
                color: {modes: ['xy', 'hs'], enhancedHue: false, applyRedFix: true},
                turnsOffAtBrightness1: true,
            }),
        ],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['OFL 122 C'],
        model: 'OFL 122 C',
        vendor: 'Innr',
        description: 'Outdoor flex light colour LED strip 2m, 1440lm, RGBW',
        extend: [light({colorTemp: {range: [100, 350]}, color: {modes: ['xy', 'hs'], applyRedFix: true}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['FL 122 C'],
        model: 'FL 122 C',
        vendor: 'Innr',
        description: 'Flex light colour LED strip 2m, 1440lm, RGBW',
        extend: [light({colorTemp: {range: [100, 350]}, color: {modes: ['xy', 'hs'], applyRedFix: true}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['OSL 130 C'],
        model: 'OSL 130 C',
        vendor: 'Innr',
        description: 'Outdoor smart spot colour, 230lm/spot, RGBW',
        extend: [light({colorTemp: {range: [153, 555]}, color: {modes: ['xy', 'hs'], applyRedFix: true}, turnsOffAtBrightness1: true})],
    },
    {
        zigbeeModel: ['OSL 132 C'],
        model: 'OSL 132 C',
        vendor: 'Innr',
        description: 'Outdoor smart spot color',
        extend: [light({colorTemp: {range: [100, 1000]}, color: {modes: ['xy', 'hs'], enhancedHue: true}})],
    },
    {
        zigbeeModel: ['BE 220'],
        model: 'BE 220',
        vendor: 'Innr',
        description: 'E26/E24 white bulb',
        extend: [light({turnsOffAtBrightness1: true})],
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
            return {all: 1, l1: 3, l2: 4, l3: 5, l4: 6, l5: 7, l6: 8};
        },
        exposes: [e.action(['on_*', 'off_*', 'brightness_*', 'scene_*'])],
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genBasic', 'genGroups', 'genScenes', 'genOnOff', 'genLevelCtrl']);
            for (const ep of [3, 4, 5, 6, 7, 8]) {
                const endpoint = device.getEndpoint(ep);
                await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            }
        },
    },
    {
        zigbeeModel: ['SP 240'],
        model: 'SP 240',
        vendor: 'Innr',
        description: 'Smart plug',
        extend: [onOff(), electricityMeter({current: {divisor: 1000}, voltage: {divisor: 1}, power: {divisor: 1}, energy: {divisor: 100}})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SP 242'],
        model: 'SP 242',
        vendor: 'Innr',
        description: 'Smart plug',
        extend: [
            onOff(),
            electricityMeter({current: {divisor: 1000}, voltage: {divisor: 1}, power: {divisor: 1}, energy: {divisor: 100}}),
            // Device looses reporting config on power cycle
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/6747
            reconfigureReportingsOnDeviceAnnounce(),
        ],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SP 244'],
        model: 'SP 244',
        vendor: 'Innr',
        description: 'Smart plug',
        extend: [onOff(), electricityMeter({current: {divisor: 1000}, voltage: {divisor: 1}, power: {divisor: 1}, energy: {divisor: 100}})],
        ota: ota.zigbeeOTA,
    },
];

export default definitions;
module.exports = definitions;
