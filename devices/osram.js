const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const ota = require('../lib/ota');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['Gardenspot RGB'],
        model: '73699',
        vendor: 'OSRAM',
        description: ' Gardenspot LED mini RGB',
        extend: extend.ledvance.light_onoff_brightness_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Outdoor Lantern W RGBW OSRAM'],
        model: '4058075816718',
        vendor: 'OSRAM',
        description: 'SMART+ outdoor wall lantern RGBW',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Outdoor Lantern B50 RGBW OSRAM'],
        model: '4058075816732',
        vendor: 'OSRAM',
        description: 'SMART+ outdoor lantern RGBW',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LIGHTIFY RT RGBW'],
        model: '73741_LIGHTIFY',
        vendor: 'OSRAM',
        description: 'LIGHTIFY RT5/6 LED',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Classic A60 RGBW'],
        model: 'AA69697',
        vendor: 'OSRAM',
        description: 'Classic A60 RGBW',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['B40 TW Value'],
        model: 'AC25704',
        vendor: 'LEDVANCE',
        description: 'Classic E14 tunable white',
        extend: extend.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A60 TW Z3'],
        model: 'AC10787',
        vendor: 'OSRAM',
        description: 'SMART+ classic E27 TW',
        extend: extend.ledvance.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A60 TW Value II'],
        model: 'AC25702',
        vendor: 'LEDVANCE',
        description: 'Classic E27 Tunable White',
        extend: extend.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['CLA60 RGBW OSRAM'],
        model: 'AC03645',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED CLA60 E27 RGBW',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color({colorTempRange: [153, 526], disableColorTempStartup: true}),
        ota: ota.ledvance,
        exposes: [e.light_brightness_colortemp_colorhs([153, 526]).removeFeature('color_temp_startup'), e.effect()],
    },
    {
        zigbeeModel: ['CLA60 TW OSRAM'],
        model: 'AC03642',
        vendor: 'OSRAM',
        description: 'SMART+ CLASSIC A 60 TW',
        extend: extend.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR16 DIM Z3'],
        model: 'AC08560-DIM',
        vendor: 'OSRAM',
        description: 'SMART+ LED PAR16 GU10',
        extend: extend.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A60 DIM Z3'],
        model: 'AC10786-DIM',
        vendor: 'OSRAM',
        description: 'SMART+ classic E27 dimmable',
        extend: extend.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['CLA60 RGBW Z3'],
        model: 'AC03647',
        vendor: 'OSRAM',
        description: 'SMART+ LED CLASSIC E27 RGBW',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color({colorTempRange: [153, 526], disableColorTempStartup: true}),
        ota: ota.ledvance,
        exposes: [e.light_brightness_colortemp_colorhs([153, 526]).removeFeature('color_temp_startup'), e.effect()],
    },
    {
        zigbeeModel: ['CLA60 RGBW II Z3'],
        model: 'AC16381',
        vendor: 'OSRAM',
        description: 'SMART+ LED CLASSIC E27 RGBW V2',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        // AA70155 is model number of both bulbs.
        zigbeeModel: ['LIGHTIFY A19 Tunable White', 'Classic A60 TW'],
        model: 'AA70155',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED A19 tunable white / Classic A60 TW',
        extend: extend.ledvance.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR16 50 TW'],
        model: 'AA68199',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED PAR16 50 GU10 tunable white',
        extend: extend.ledvance.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR16 TW Z3'],
        model: '4058075148338',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED PAR16 50 GU10 tunable white',
        extend: extend.ledvance.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Classic B40 TW - LIGHTIFY'],
        model: 'AB32840',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED Classic B40 tunable white',
        extend: extend.ledvance.light_onoff_brightness_colortemp({colorTempRange: [150, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Ceiling TW OSRAM'],
        model: '4058075816794',
        vendor: 'OSRAM',
        description: 'Smart+ Ceiling TW',
        extend: extend.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Classic A60 W clear - LIGHTIFY'],
        model: 'AC03641',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED Classic A60 clear',
        extend: extend.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Surface Light W �C LIGHTIFY'],
        model: '4052899926158',
        vendor: 'OSRAM',
        description: 'LIGHTIFY Surface Light TW',
        extend: extend.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Surface Light TW', 'ZLO-CeilingTW-OS'],
        model: 'AB401130055',
        vendor: 'OSRAM',
        description: 'LIGHTIFY Surface Light LED Tunable White',
        extend: extend.ledvance.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Plug 01'],
        model: 'AB3257001NJ',
        description: 'Smart+ plug',
        vendor: 'OSRAM',
        extend: extend.switch(),
        whiteLabel: [{vendor: 'LEDVANCE', model: 'AB3257001NJ'}, {vendor: 'LEDVANCE', model: 'AC03360'}],
        ota: ota.ledvance,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['LIGHTIFY PAR38 ON/OFF/DIM'],
        model: '73889',
        vendor: 'OSRAM',
        description: 'Smart home soft white PAR38 outdoor bulb',
        extend: extend.ledvance.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['Plug Z3'],
        model: 'AC10691',
        description: 'Smart+ plug',
        vendor: 'OSRAM',
        extend: extend.switch(),
        ota: ota.ledvance,
        whiteLabel: [{vendor: 'LEDVANCE', model: 'AC10691'}],
        configure: async (device, coordinatorEndpoint, logger) => {
            let endpoint = device.getEndpoint(3);
            // Endpoint 3 is not always present, use endpoint 1 in that case
            // https://github.com/Koenkk/zigbee2mqtt/issues/2178
            if (!endpoint) endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['Flex RGBW', 'LIGHTIFY Indoor Flex RGBW', 'LIGHTIFY Flex RGBW'],
        model: '4052899926110',
        vendor: 'OSRAM',
        description: 'Flex RGBW',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color({colorTempRange: [125, 666]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LIGHTIFY Outdoor Flex RGBW', 'LIGHTIFY FLEX OUTDOOR RGBW', 'Flex Outdoor RGBW'],
        model: '4058075036185',
        vendor: 'OSRAM',
        description: 'Outdoor Flex RGBW',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Gardenpole RGBW-Lightify'],
        model: '4058075036147',
        vendor: 'OSRAM',
        description: 'Smart+ gardenpole 8.7W RGBW',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Gardenpole RGBW Z3'],
        model: '4058075047853',
        vendor: 'OSRAM',
        description: 'Smart+ gardenpole 4W RGBW',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color(),
        meta: {disableDefaultResponse: true},
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Gardenpole Mini RGBW OSRAM'],
        model: 'AC0363900NJ',
        vendor: 'OSRAM',
        description: 'Smart+ mini gardenpole RGBW',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370], disableColorTempStartup: true}),
        exposes: [e.light_brightness_colortemp_colorhs([153, 370]).removeFeature('color_temp_startup'), e.effect()],
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Gardenspot W'],
        model: '4052899926127',
        vendor: 'OSRAM',
        description: 'Lightify mini gardenspot WT',
        extend: extend.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR 16 50 RGBW - LIGHTIFY'],
        model: 'AB35996',
        vendor: 'OSRAM',
        description: 'Smart+ Spot GU10 Multicolor',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color({colorTempRange: [125, 666]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR16 RGBW Z3'],
        model: 'AC08559',
        vendor: 'OSRAM',
        description: 'SMART+ Spot GU10 Multicolor',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color({colorTempRange: [153, 526], disableColorTempStartup: true}),
        exposes: [e.light_brightness_colortemp_colorhs([153, 526]).removeFeature('color_temp_startup'), e.effect()],
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['B40 DIM Z3'],
        model: 'AC08562',
        vendor: 'OSRAM',
        description: 'SMART+ Candle E14 Dimmable White',
        extend: extend.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Motion Sensor-A'],
        model: 'AC01353010G',
        vendor: 'OSRAM',
        description: 'SMART+ Motion Sensor',
        fromZigbee: [fz.temperature, fz.ias_occupancy_only_alarm_2, fz.ignore_basic_report],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.occupancy()],
    },
    {
        zigbeeModel: ['MR16 TW OSRAM'],
        model: 'AC03648',
        vendor: 'OSRAM',
        description: 'SMART+ spot GU5.3 tunable white',
        extend: extend.ledvance.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Lightify Switch Mini', 'Lightify Switch Mini blue'],
        model: 'AC0251100NJ/AC0251600NJ/AC0251700NJ',
        vendor: 'OSRAM',
        description: 'Smart+ switch mini',
        fromZigbee: [fz.legacy.osram_lightify_switch_cmdOn, fz.legacy.osram_lightify_switch_cmdMoveWithOnOff,
            fz.legacy.osram_lightify_switch_AC0251100NJ_cmdStop, fz.legacy.osram_lightify_switch_cmdMoveToColorTemp,
            fz.legacy.osram_lightify_switch_cmdMoveHue, fz.legacy.osram_lightify_switch_cmdMoveToSaturation,
            fz.legacy.osram_lightify_switch_cmdOff, fz.legacy.osram_lightify_switch_cmdMove, fz.battery,
            fz.legacy.osram_lightify_switch_cmdMoveToLevelWithOnOff],
        exposes: [e.battery(), e.action([
            'up', 'up_hold', 'up_release', 'down_release', 'circle_release', 'circle_hold', 'down', 'down_hold', 'circle_click'])],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        ota: ota.ledvance,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genPowerCfg']);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.bind(endpoint3, coordinatorEndpoint, ['genLevelCtrl', 'lightingColorCtrl']);
            await reporting.batteryVoltage(endpoint1);
        },
    },
    {
        zigbeeModel: ['Switch 4x EU-LIGHTIFY', 'Switch 4x-LIGHTIFY', 'Switch-LIGHTIFY'],
        model: '4058075816459',
        vendor: 'OSRAM',
        description: 'Smart+ switch',
        exposes: [e.battery(), e.action(['left_top_click', 'left_bottom_click', 'right_top_click', 'right_bottom_click', 'left_top_hold',
            'left_bottom_hold', 'left_top_release', 'left_bottom_release', 'right_top_release', 'right_top_hold',
            'right_bottom_release', 'right_bottom_hold'])],
        fromZigbee: [fz.battery, fz.legacy.osram_lightify_switch_AB371860355_cmdOn, fz.legacy.osram_lightify_switch_AB371860355_cmdOff,
            fz.legacy.osram_lightify_switch_AB371860355_cmdStepColorTemp, fz.legacy.osram_lightify_switch_AB371860355_cmdMoveWithOnOff,
            fz.legacy.osram_lightify_switch_AB371860355_cmdMove, fz.legacy.osram_lightify_switch_AB371860355_cmdStop,
            fz.legacy.osram_lightify_switch_AB371860355_cmdMoveHue, fz.legacy.osram_lightify_switch_AB371860355_cmdMoveSat],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        ota: ota.ledvance,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            const endpoint3 = device.getEndpoint(3);
            const endpoint4 = device.getEndpoint(4);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genPowerCfg']);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genLevelCtrl', 'lightingColorCtrl']);
            await reporting.bind(endpoint3, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.bind(endpoint4, coordinatorEndpoint, ['genLevelCtrl', 'lightingColorCtrl']);
            await reporting.batteryVoltage(endpoint1);
        },
    },
    {
        zigbeeModel: ['SubstiTube', 'Connected Tube Z3'],
        model: 'ST8AU-CON',
        vendor: 'OSRAM',
        description: 'OSRAM SubstiTUBE T8 Advanced UO Connected',
        extend: extend.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Panel TW 595 UGR22'],
        model: '595UGR22',
        vendor: 'OSRAM',
        description: 'OSRAM LED panel TW 595 UGR22',
        extend: extend.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Zigbee 3.0 DALI CONV LI', 'Zigbee 3.0 DALI CONV LI\u0000'],
        model: '4062172044776_1',
        vendor: 'OSRAM',
        description: 'Zigbee 3.0 DALI CONV LI dimmer for DALI-based luminaires (only one device)',
        extend: extend.ledvance.light_onoff_brightness(),
    },
    {
        fingerprint: [{modelID: 'Zigbee 3.0 DALI CONV LI', endpoints: [{ID: 10}, {ID: 25}, {ID: 242}]},
            {modelID: 'Zigbee 3.0 DALI CONV LI\u0000', endpoints: [{ID: 10}, {ID: 25}, {ID: 242}]}],
        model: '4062172044776_2',
        vendor: 'OSRAM',
        description: 'Zigbee 3.0 DALI CONV LI dimmer for DALI-based luminaires (one device and pushbutton)',
        extend: extend.ledvance.light_onoff_brightness(),
        onEvent: async (type, data, device) => {
            if (type === 'deviceInterview') {
                device.getEndpoint(25).addBinding('genOnOff', device.getEndpoint(10));
                device.getEndpoint(25).addBinding('genLevelCtrl', device.getEndpoint(10));
            }
        },
    },
    {
        fingerprint: [{modelID: 'Zigbee 3.0 DALI CONV LI', endpoints: [{ID: 10}, {ID: 11}, {ID: 242}]},
            {modelID: 'Zigbee 3.0 DALI CONV LI\u0000', endpoints: [{ID: 10}, {ID: 11}, {ID: 242}]}],
        model: '4062172044776_3',
        vendor: 'OSRAM',
        description: 'Zigbee 3.0 DALI CONV LI dimmer for DALI-based luminaires (with two devices)',
        extend: extend.ledvance.light_onoff_brightness({noConfigure: true}),
        exposes: [e.light_brightness().withEndpoint('l1'), e.light_brightness().withEndpoint('l2')],
        endpoint: (device) => {
            return {'l1': 10, 'l2': 11};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(10), coordinatorEndpoint, ['genLevelCtrl', 'genOnOff']);
            await reporting.bind(device.getEndpoint(11), coordinatorEndpoint, ['genLevelCtrl', 'genOnOff']);
            await reporting.onOff(device.getEndpoint(10));
            await reporting.brightness(device.getEndpoint(10));
            await reporting.onOff(device.getEndpoint(11));
            await reporting.brightness(device.getEndpoint(11));
        },
    },
    {
        fingerprint: [{modelID: 'Zigbee 3.0 DALI CONV LI', endpoints: [{ID: 10}, {ID: 11}, {ID: 25}, {ID: 242}]},
            {modelID: 'Zigbee 3.0 DALI CONV LI\u0000', endpoints: [{ID: 10}, {ID: 11}, {ID: 25}, {ID: 242}]}],
        model: '4062172044776_4',
        vendor: 'OSRAM',
        description: 'Zigbee 3.0 DALI CONV LI dimmer for DALI-based luminaires (with two devices and pushbutton)',
        extend: extend.ledvance.light_onoff_brightness({noConfigure: true}),
        exposes: [e.light_brightness().withEndpoint('l1'), e.light_brightness().withEndpoint('l2')],
        endpoint: (device) => {
            return {'l1': 10, 'l2': 11};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(10), coordinatorEndpoint, ['genLevelCtrl', 'genOnOff']);
            await reporting.bind(device.getEndpoint(11), coordinatorEndpoint, ['genLevelCtrl', 'genOnOff']);
            await reporting.onOff(device.getEndpoint(10));
            await reporting.brightness(device.getEndpoint(10));
            await reporting.onOff(device.getEndpoint(11));
            await reporting.brightness(device.getEndpoint(11));
        },
        onEvent: async (type, data, device) => {
            if (type === 'deviceInterview') {
                device.getEndpoint(25).addBinding('genOnOff', device.getEndpoint(10));
                device.getEndpoint(25).addBinding('genLevelCtrl', device.getEndpoint(10));
            }
        },
    },
];
