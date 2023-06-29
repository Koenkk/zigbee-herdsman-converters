import {Definition} from '../lib/types';
import * as ota from '../lib/ota';
import extend from '../lib/extend';
import * as ledvance from '../lib/ledvance';
import * as reporting from '../lib/reporting';

const definitions: Definition[] = [
    {
        zigbeeModel: ['A60S TW'],
        model: '4058075208384',
        vendor: 'LEDVANCE',
        description: 'SMART+ Classic A60 E27 Tunable white',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Outdoor Plug'],
        model: 'AC26940/AC31266',
        vendor: 'LEDVANCE',
        description: 'Smart Zigbee outdoor plug',
        extend: extend.switch({disablePowerOnBehavior: true}),
        ota: ota.ledvance,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
            // Has Unknown power source, force it here.
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['Panel TW Z3'],
        model: '4058075181472',
        vendor: 'LEDVANCE',
        description: 'SMART+ panel 60x60cm/120x30cm tunable white',
        extend: ledvance.extend.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Panel Light 2x2 TW'],
        model: '74746',
        vendor: 'LEDVANCE',
        description: 'LEDVANCE 74746 Sylvania smart+ Zigbee dimmable edge-lit panel',
        extend: ledvance.extend.light_onoff_brightness_colortemp_color({colorTempRange: [200, 370]}),
    },
    {
        zigbeeModel: ['Panel TW 620 UGR19'],
        model: 'GPDRPLOP401100CE',
        vendor: 'LEDVANCE',
        description: 'Panel TW LED 625 UGR19',
        extend: ledvance.extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A60 RGBW Value II'],
        model: 'AC25697',
        vendor: 'LEDVANCE',
        description: 'SMART+ CLASSIC MULTICOLOUR 60 10W E27',
        extend: ledvance.extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR16 RGBW Value'],
        model: 'AC08560',
        vendor: 'LEDVANCE',
        description: 'SMART+ spot GU10 multicolor RGBW',
        extend: ledvance.extend.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR16S RGBW'],
        model: 'AC33906',
        vendor: 'LEDVANCE',
        description: 'SMART+ spot GU10 multicolor RGBW',
        extend: ledvance.extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR16 RGBW T'],
        model: '4058075729186',
        vendor: 'LEDVANCE',
        description: 'SMART+ Spot PAR16 28 GU10 Multicolor',
        extend: ledvance.extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR16S TW'],
        model: 'AC33905',
        vendor: 'LEDVANCE',
        description: 'SMART+ spot GU10 tunable white',
        extend: ledvance.extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['B40 TW Z3'],
        model: '4058075208414',
        vendor: 'LEDVANCE',
        description: 'SMART+ candle E14 tunable white',
        extend: ledvance.extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['P40S TW'],
        model: 'AC33903',
        vendor: 'LEDVANCE',
        description: 'SMART+ classic P 40 E14 tunable white',
        extend: ledvance.extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['B40S TW'],
        model: 'AC33901',
        vendor: 'LEDVANCE',
        description: 'SMART+ Classic B40 E14 Tunable white',
        extend: ledvance.extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['FLEX RGBW Z3'],
        model: '4058075208339',
        vendor: 'LEDVANCE',
        description: 'Flex 3P multicolor',
        extend: ledvance.extend.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Outdoor FLEX RGBW Z3'],
        model: '4058075208360',
        vendor: 'LEDVANCE',
        description: 'SMART+ outdoor flex multicolor',
        extend: ledvance.extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 526]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['P40 TW Value'],
        model: '4058075485174',
        vendor: 'LEDVANCE',
        description: 'SMART+ Lighting - Classic E14 tunable white',
        extend: ledvance.extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LEDVANCE DIM'],
        model: '4058075208421',
        vendor: 'LEDVANCE',
        description: 'SMART+ candle E14 dimmable white',
        extend: ledvance.extend.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Undercabinet TW Z3'],
        model: '4058075173989',
        vendor: 'LEDVANCE',
        description: 'SMART+ indoor undercabinet light',
        extend: ledvance.extend.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Gardenpole Mini RGBW Z3'],
        model: '4058075208353',
        vendor: 'LEDVANCE',
        description: 'SMART+ gardenpole multicolour',
        extend: ledvance.extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 526]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Tibea TW Z3'],
        model: '4058075168572',
        vendor: 'LEDVANCE',
        description: 'SMART+ lamp E27 tuneable white',
        extend: ledvance.extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['CLA60 TW Value'],
        model: 'AC23684',
        vendor: 'LEDVANCE',
        description: 'Classic E26 tunable white 9w 800 lumen',
        extend: ledvance.extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A60 TW T'],
        model: '4058075729001',
        vendor: 'LEDVANCE',
        description: 'SMART+ CL A60 E27 Tunable white',
        extend: ledvance.extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['P40 TW T'],
        model: '4058075729124',
        vendor: 'LEDVANCE',
        description: 'SMART+ CL P40 E14 Tunable white',
        extend: ledvance.extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR16 TW T'],
        model: '4058075729162',
        vendor: 'LEDVANCE',
        description: 'SMART+ PAR16 GU10 Tunable white',
        extend: ledvance.extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['B40 TW T'],
        model: '4058075729087',
        vendor: 'LEDVANCE',
        description: 'SMART+ CL B40 E14 Tunable white',
        extend: ledvance.extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['CLA60 RGBW JP'],
        model: 'SMARTZBA60RGBW',
        vendor: 'LEDVANCE',
        description: 'SMART+ lamp B22D RGBTW',
        extend: ledvance.extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 526]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A60S RGBW'],
        model: '4058075208391',
        vendor: 'LEDVANCE',
        description: 'SMART+ lamp E27 RGBW',
        extend: ledvance.extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A60 RGBW T'],
        model: '4058075729025',
        vendor: 'LEDVANCE',
        description: 'SMART+ lamp E27 RGBTW',
        extend: ledvance.extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['GARDENPOLE RGBW T'],
        model: '4058075729346',
        vendor: 'LEDVANCE',
        description: 'SMART+ Gardenpole 5P Multicolor',
        extend: ledvance.extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A60 RGBW B22D T'],
        model: '4058075729049',
        vendor: 'LEDVANCE',
        description: 'SMART+ lamp B22D RGBTW',
        extend: ledvance.extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A60 DIM T'],
        model: '4058075728981',
        vendor: 'LEDVANCE',
        description: 'SMART+ Classic A E27 dimmable white',
        extend: ledvance.extend.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['B40 DIM T'],
        model: '4058075729063',
        vendor: 'LEDVANCE',
        description: 'SMART+ Classic B40 E14 dimmable white',
        extend: ledvance.extend.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR16 DIM T'],
        model: '4058075729148',
        vendor: 'LEDVANCE',
        description: 'SMART+ Spot PAR16 50 GU10 dimmable white',
        extend: ledvance.extend.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['P40 DIM T'],
        model: '4058075729100',
        vendor: 'LEDVANCE',
        description: 'SMART+ Classic P40 E14 dimmable white',
        extend: ledvance.extend.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A60 FIL DIM T'],
        model: '4058075729209',
        vendor: 'LEDVANCE',
        description: 'SMART+ Filament Classic A 52 E27 Amber dimmable',
        extend: ledvance.extend.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['EDISON60 FIL DIM T'],
        model: '4058075729223',
        vendor: 'LEDVANCE',
        description: 'SMART+ Filament Edison 52 E27 Amber dimmable',
        extend: ledvance.extend.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['FLEX RGBW T'],
        model: '4058075729384',
        vendor: 'LEDVANCE',
        description: 'SMART+ Indoor Flex multicolor RGBW',
        extend: ledvance.extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 526]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['OUTDOOR FLEX RGBW T'],
        model: '4058075729360',
        vendor: 'LEDVANCE',
        description: 'SMART+ Outdoor Flex multicolor RGBW',
        extend: ledvance.extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 526]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['GLOBE60 FIL DIM T'],
        model: '4058075729247',
        vendor: 'LEDVANCE',
        description: 'SMART+ Filament Globe125 52 E27 Amber dimmable',
        extend: ledvance.extend.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Connected Tube Value II'],
        model: 'ST8EM-CON',
        vendor: 'LEDVANCE',
        description: 'SubstiTUBE connected advanced ultra output',
        extend: extend.light_onoff_brightness({disablePowerOnBehavior: true}),
    },
    {
        zigbeeModel: ['PLUG COMPACT EU T', 'Plug Value'],
        model: '4058075729322',
        vendor: 'LEDVANCE',
        description: 'SMART+ Compact Outdoor Plug EU',
        extend: extend.switch({disablePowerOnBehavior: true}),
        ota: ota.ledvance,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['PLUG UK T'],
        model: '4058075729285',
        vendor: 'LEDVANCE',
        description: 'SMART+ Plug UK',
        extend: extend.switch(),
        ota: ota.ledvance,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['PLUG EU T'],
        model: '4058075729261',
        vendor: 'LEDVANCE',
        description: 'SMART+ Plug EU',
        extend: extend.switch(),
        ota: ota.ledvance,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['PLUG OUTDOOR EU T'],
        model: '4058075729308',
        vendor: 'LEDVANCE',
        description: 'SMART+ Outdoor Plug EU',
        extend: extend.switch(),
        ota: ota.ledvance,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
];

module.exports = definitions;
