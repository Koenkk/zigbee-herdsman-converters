const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['EB-E14-P45-RGBW'],
        model: 'EB-E14-P45-RGBW',
        vendor: 'EssentielB',
        description: 'Smart LED bulb',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['EB-E14-FLA-CCT'],
        model: 'EB-E14-FLA-CCT',
        vendor: 'EssentielB',
        description: 'E14 flame CCT light bulb',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['EB-E27-A60-CCT-FC'],
        model: 'EB-E27-A60-CCT-FC',
        vendor: 'EssentielB',
        description: 'E27 A60 CCT filament clear light bulb',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['EB-E27-A60-CCT'],
        model: 'EB-E27-A60-CCT',
        vendor: 'EssentielB',
        description: 'E27 A60 CCT light bulb',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['EB-E27-A60-RGBW'],
        model: 'EB-E27-A60-RGBW',
        vendor: 'EssentielB',
        description: 'E27 A60 RGBW light bulb',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['EB-E27-G95-CCT-FV'],
        model: 'EB-E27-G95-CCT-FV',
        vendor: 'EssentielB',
        description: 'Filament vintage globe light bulb',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['EB-E27-ST64-CCT-FV'],
        model: 'EB-E27-ST64-CCT-FV',
        vendor: 'EssentielB',
        description: 'Filament vintage edison light bulb',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['EB-GU10-MR16-CCT'],
        model: 'EB-GU10-MR16-CCT',
        vendor: 'EssentielB',
        description: 'GU10 MR16 CCT light bulb',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 454]}),
    },
    {
        zigbeeModel: ['EB-GU10-MR16-RGBW'],
        model: 'EB-GU10-MR16-RGBW',
        vendor: 'EssentielB',
        description: 'GU10 MR16 RGBW light bulb',
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['EB-SB-1B'],
        model: 'EB-SB-1B',
        vendor: 'Sourcing & Creation',
        description: 'Essentielb Smart Button',
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step, fz.command_stop, fz.command_step_color_temperature],
        toZigbee: [],
        exposes: [e.battery(), e.action(['on', 'off', 'color_temperature_step_up', 'color_temperature_step_down', 'brightness_step_up', 'brightness_step_down', 'brightness_stop'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genOnOff', 'genPowerCfg', 'lightingColorCtrl', 'genLevelCtrl'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    }
];
