const ota = require('../lib/ota');
const extend = require('../lib/extend');
const reporting = require('../lib/reporting');

module.exports = [
    {
        zigbeeModel: ['A60S TW'],
        model: 'AC33898',
        vendor: 'LEDVANCE',
        description: ' Smart+ LED classic E27 Zigbee 10W/810lm',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['Outdoor Plug', 'Plug Value'],
        model: 'AC26940/AC31266',
        vendor: 'LEDVANCE',
        description: 'Smart Zigbee outdoor plug',
        extend: extend.switch(),
        ota: ota.ledvance,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['Panel TW Z3'],
        model: '4058075181472',
        vendor: 'LEDVANCE',
        description: 'SMART+ panel 60 x 60cm tunable white',
        extend: extend.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Panel TW 620 UGR19'],
        model: 'GPDRPLOP401100CE',
        vendor: 'LEDVANCE',
        description: 'Panel TW LED 625 UGR19',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A60 RGBW Value II'],
        model: 'AC25697',
        vendor: 'LEDVANCE',
        description: 'SMART+ CLASSIC MULTICOLOUR 60 10W E27',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color({colorTempRange: [153, 500]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR16 RGBW Value'],
        model: 'AC08560',
        vendor: 'LEDVANCE',
        description: 'SMART+ spot GU10 multicolor RGBW',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['B40 TW Z3'],
        model: '4058075208414',
        vendor: 'LEDVANCE',
        description: 'SMART+ candle E14 tunable white',
        extend: extend.ledvance.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['FLEX RGBW Z3'],
        model: '4058075208339',
        vendor: 'LEDVANCE',
        description: 'Flex 3P multicolor',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Outdoor FLEX RGBW Z3'],
        model: '4058075208360',
        vendor: 'LEDVANCE',
        description: 'SMART+ outdoor flex multicolor',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color({colorTempRange: [153, 526]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['P40 TW Value'],
        model: '4058075485174',
        vendor: 'LEDVANCE',
        description: 'SMART+ Lighting - Classic E14 tunable white',
        extend: extend.ledvance.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LEDVANCE DIM'],
        model: '4058075208421',
        vendor: 'LEDVANCE',
        description: 'SMART+ candle E14 tunable white',
        extend: extend.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Undercabinet TW Z3'],
        model: '4058075173989',
        vendor: 'LEDVANCE',
        description: 'SMART+ indoor undercabinet light',
        extend: extend.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Gardenpole Mini RGBW Z3'],
        model: '4058075208353',
        vendor: 'LEDVANCE',
        description: 'SMART+ gardenpole multicolour',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color({colorTempRange: [153, 526]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Tibea TW Z3'],
        model: '4058075168572',
        vendor: 'LEDVANCE',
        description: 'SMART+ lamp E27 turntable white',
        extend: extend.ledvance.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
];
