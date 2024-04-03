import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import * as ota from '../lib/ota';
import * as reporting from '../lib/reporting';
import {ledvanceLight, ledvanceFz, ledvanceOnOff} from '../lib/ledvance';
import {Definition} from '../lib/types';
import {deviceEndpoints} from '../lib/modernExtend';

const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['Gardenspot RGB'],
        model: '73699',
        vendor: 'OSRAM',
        description: ' Gardenspot LED mini RGB',
        extend: [ledvanceLight({color: true})],
    },
    {
        zigbeeModel: ['Outdoor Lantern W RGBW OSRAM'],
        model: '4058075816718',
        vendor: 'OSRAM',
        description: 'SMART+ outdoor wall lantern RGBW',
        extend: [ledvanceLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['Outdoor Lantern B50 RGBW OSRAM'],
        model: '4058075816732',
        vendor: 'OSRAM',
        description: 'SMART+ outdoor lantern RGBW',
        extend: [ledvanceLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['LIGHTIFY RT RGBW'],
        model: '73741_LIGHTIFY',
        vendor: 'OSRAM',
        description: 'LIGHTIFY RT5/6 LED',
        extend: [ledvanceLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['Classic A60 RGBW'],
        model: 'AA69697',
        vendor: 'OSRAM',
        description: 'Classic A60 RGBW',
        extend: [ledvanceLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['B40 TW Value'],
        model: 'AC25704',
        vendor: 'LEDVANCE',
        description: 'Classic E14 tunable white',
        extend: [ledvanceLight({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['A60 TW Z3'],
        model: 'AC10787',
        vendor: 'OSRAM',
        description: 'SMART+ classic E27 TW',
        extend: [ledvanceLight({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['A60 TW Value II'],
        model: 'AC25702',
        vendor: 'LEDVANCE',
        description: 'Classic E27 Tunable White',
        extend: [ledvanceLight({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['CLA60 RGBW OSRAM'],
        model: 'AC03645',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED CLA60 E27 RGBW',
        extend: [ledvanceLight({colorTemp: {range: [153, 526]}, color: true})],
    },
    {
        zigbeeModel: ['CLA60 TW OSRAM'],
        model: 'AC03642',
        vendor: 'OSRAM',
        description: 'SMART+ CLASSIC A 60 TW',
        extend: [ledvanceLight({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['PAR16 DIM Z3'],
        model: 'AC08560-DIM',
        vendor: 'OSRAM',
        description: 'SMART+ LED PAR16 GU10',
        extend: [ledvanceLight({})],
    },
    {
        zigbeeModel: ['A60 DIM Z3'],
        model: 'AC10786-DIM',
        vendor: 'OSRAM',
        description: 'SMART+ classic E27 dimmable',
        extend: [ledvanceLight({})],
    },
    {
        zigbeeModel: ['CLA60 RGBW Z3'],
        model: 'AC03647',
        vendor: 'OSRAM',
        description: 'SMART+ LED CLASSIC E27 RGBW',
        extend: [ledvanceLight({colorTemp: {range: [153, 526]}, color: {modes: ['hs']}})],
    },
    {
        zigbeeModel: ['CLA60 RGBW II Z3'],
        model: 'AC16381',
        vendor: 'OSRAM',
        description: 'SMART+ LED CLASSIC E27 RGBW V2',
        extend: [ledvanceLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        // AA70155 is model number of both bulbs.
        zigbeeModel: ['LIGHTIFY A19 Tunable White', 'Classic A60 TW'],
        model: 'AA70155',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED A19 tunable white / Classic A60 TW',
        extend: [ledvanceLight({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['PAR16 50 TW'],
        model: 'AA68199',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED PAR16 50 GU10 tunable white',
        extend: [ledvanceLight({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['PAR16 TW Z3'],
        model: '4058075148338',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED PAR16 50 GU10 tunable white',
        extend: [ledvanceLight({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['Classic B40 TW - LIGHTIFY'],
        model: 'AB32840',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED Classic B40 tunable white',
        extend: [ledvanceLight({colorTemp: {range: [150, 370]}})],
    },
    {
        zigbeeModel: ['Ceiling TW OSRAM'],
        model: '4058075816794',
        vendor: 'OSRAM',
        description: 'Smart+ Ceiling TW',
        extend: [ledvanceLight({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['Classic A60 W clear - LIGHTIFY'],
        model: 'AC03641',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED Classic A60 clear',
        extend: [ledvanceLight({})],
    },
    {
        zigbeeModel: ['Surface Light W �C LIGHTIFY'],
        model: '4052899926158',
        vendor: 'OSRAM',
        description: 'LIGHTIFY Surface Light TW',
        extend: [ledvanceLight({})],
    },
    {
        zigbeeModel: ['Surface Light TW', 'ZLO-CeilingTW-OS'],
        model: 'AB401130055',
        vendor: 'OSRAM',
        description: 'LIGHTIFY Surface Light LED Tunable White',
        extend: [ledvanceLight({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['Plug 01'],
        model: 'AB3257001NJ',
        description: 'Smart+ plug',
        vendor: 'OSRAM',
        extend: [ledvanceOnOff({powerOnBehavior: false})],
        whiteLabel: [{vendor: 'LEDVANCE', model: 'AB3257001NJ'}, {vendor: 'LEDVANCE', model: 'AC03360'}],
    },
    {
        zigbeeModel: ['LIGHTIFY PAR38 ON/OFF/DIM'],
        model: '73889',
        vendor: 'OSRAM',
        description: 'Smart home soft white PAR38 outdoor bulb',
        extend: [ledvanceLight({})],
    },
    {
        zigbeeModel: ['Plug Z3'],
        model: 'AC10691',
        description: 'Smart+ plug',
        vendor: 'OSRAM',
        extend: [ledvanceOnOff({powerOnBehavior: false})],
        whiteLabel: [{vendor: 'LEDVANCE', model: 'AC10691'}],
    },
    {
        zigbeeModel: ['Flex RGBW', 'LIGHTIFY Indoor Flex RGBW', 'LIGHTIFY Flex RGBW'],
        model: '4052899926110',
        vendor: 'OSRAM',
        description: 'Flex RGBW',
        extend: [ledvanceLight({colorTemp: {range: [125, 666]}, color: {modes: ['xy', 'hs']}})],
    },
    {
        zigbeeModel: ['LIGHTIFY Outdoor Flex RGBW', 'LIGHTIFY FLEX OUTDOOR RGBW', 'Flex Outdoor RGBW'],
        model: '4058075036185',
        vendor: 'OSRAM',
        description: 'Outdoor Flex RGBW',
        extend: [ledvanceLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['Gardenpole RGBW-Lightify'],
        model: '4058075036147',
        vendor: 'OSRAM',
        description: 'Smart+ gardenpole 8.7W RGBW',
        extend: [ledvanceLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['Gardenpole RGBW Z3'],
        model: '4058075047853',
        vendor: 'OSRAM',
        description: 'Smart+ gardenpole 4W RGBW',
        extend: [ledvanceLight({colorTemp: {range: undefined}, color: {modes: ['xy', 'hs']}})],
    },
    {
        zigbeeModel: ['Gardenpole Mini RGBW OSRAM'],
        model: 'AC0363900NJ',
        vendor: 'OSRAM',
        description: 'Smart+ mini gardenpole RGBW',
        extend: [ledvanceLight({colorTemp: {range: [153, 370]}, color: {modes: ['hs']}})],
    },
    {
        zigbeeModel: ['Gardenspot W'],
        model: '4052899926127',
        vendor: 'OSRAM',
        description: 'Lightify mini gardenspot WT',
        extend: [ledvanceLight({})],
    },
    {
        zigbeeModel: ['PAR 16 50 RGBW - LIGHTIFY'],
        model: 'AB35996',
        vendor: 'OSRAM',
        description: 'Smart+ Spot GU10 Multicolor',
        extend: [ledvanceLight({colorTemp: {range: [125, 666]}, color: true})],
    },
    {
        zigbeeModel: ['PAR16 RGBW Z3'],
        model: 'AC08559',
        vendor: 'OSRAM',
        description: 'SMART+ Spot GU10 Multicolor',
        extend: [ledvanceLight({colorTemp: {range: [153, 526]}, color: {modes: ['hs']}})],
    },
    {
        zigbeeModel: ['B40 DIM Z3'],
        model: 'AC08562',
        vendor: 'OSRAM',
        description: 'SMART+ Candle E14 Dimmable White',
        extend: [ledvanceLight({})],
    },
    {
        zigbeeModel: ['Motion Sensor-A'],
        model: 'AC01353010G',
        vendor: 'OSRAM',
        description: 'SMART+ Motion Sensor',
        fromZigbee: [fz.temperature, fz.ias_occupancy_only_alarm_2, fz.ignore_basic_report, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 1900, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryAlarmState(endpoint);
        },
        exposes: [e.temperature(), e.occupancy(), e.battery(), e.battery_voltage(), e.battery_low()],
    },
    {
        zigbeeModel: ['MR16 TW OSRAM'],
        model: 'AC03648',
        vendor: 'OSRAM',
        description: 'SMART+ spot GU5.3 tunable white',
        extend: [ledvanceLight({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['Lightify Switch Mini', 'Lightify Switch Mini blue'],
        model: 'AC0251100NJ/AC0251600NJ/AC0251700NJ',
        vendor: 'OSRAM',
        description: 'Smart+ switch mini',
        fromZigbee: [legacy.fz.osram_lightify_switch_cmdOn, legacy.fz.osram_lightify_switch_cmdMoveWithOnOff,
            legacy.fz.osram_lightify_switch_AC0251100NJ_cmdStop, legacy.fz.osram_lightify_switch_cmdMoveToColorTemp,
            legacy.fz.osram_lightify_switch_cmdMoveHue, legacy.fz.osram_lightify_switch_cmdMoveToSaturation,
            legacy.fz.osram_lightify_switch_cmdOff, legacy.fz.osram_lightify_switch_cmdMove, fz.battery,
            legacy.fz.osram_lightify_switch_cmdMoveToLevelWithOnOff],
        exposes: [e.battery(), e.action([
            'on', 'brightness_move_up', 'brightness_move_down', 'brightness_stop', 'color_temperature_move', 'hue_move', 'hue_stop',
            'move_to_saturation', 'off', 'brightness_move_to_level'])],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        ota: ota.ledvance,
        configure: async (device, coordinatorEndpoint) => {
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
        fromZigbee: [fz.battery, legacy.fz.osram_lightify_switch_AB371860355_cmdOn, legacy.fz.osram_lightify_switch_AB371860355_cmdOff,
            legacy.fz.osram_lightify_switch_AB371860355_cmdStepColorTemp, legacy.fz.osram_lightify_switch_AB371860355_cmdMoveWithOnOff,
            legacy.fz.osram_lightify_switch_AB371860355_cmdMove, legacy.fz.osram_lightify_switch_AB371860355_cmdStop,
            legacy.fz.osram_lightify_switch_AB371860355_cmdMoveHue, legacy.fz.osram_lightify_switch_AB371860355_cmdMoveSat],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        ota: ota.ledvance,
        configure: async (device, coordinatorEndpoint) => {
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
        extend: [ledvanceLight({})],
    },
    {
        zigbeeModel: ['Panel TW 595 UGR22'],
        model: '595UGR22',
        vendor: 'OSRAM',
        description: 'OSRAM LED panel TW 595 UGR22',
        extend: [ledvanceLight({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['Zigbee 3.0 DALI CONV LI', 'Zigbee 3.0 DALI CONV LI\u0000'],
        model: '4062172044776_1',
        vendor: 'OSRAM',
        description: 'Zigbee 3.0 DALI CONV LI dimmer for DALI-based luminaires (only one device)',
        extend: [ledvanceLight({colorTemp: {range: undefined}})],
    },
    {
        fingerprint: [{modelID: 'Zigbee 3.0 DALI CONV LI', endpoints: [{ID: 10}, {ID: 25}, {ID: 242}]},
            {modelID: 'Zigbee 3.0 DALI CONV LI\u0000', endpoints: [{ID: 10}, {ID: 25}, {ID: 242}]}],
        model: '4062172044776_2',
        vendor: 'OSRAM',
        description: 'Zigbee 3.0 DALI CONV LI dimmer for DALI-based luminaires (one device and pushbutton)',
        fromZigbee: [fz.command_toggle, fz.command_move, fz.command_stop],
        exposes: [e.action(['toggle', 'brightness_move_up', 'brightness_move_down', 'brightness_stop'])],
        extend: [ledvanceLight({configureReporting: true, ota: ota.zigbeeOTA})],
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
        extend: [
            deviceEndpoints({endpoints: {'l1': 10, 'l2': 11}}),
            ledvanceLight({configureReporting: true, endpointNames: ['l1', 'l2'], ota: ota.zigbeeOTA}),
        ],
    },
    {
        fingerprint: [{modelID: 'Zigbee 3.0 DALI CONV LI', endpoints: [{ID: 10}, {ID: 11}, {ID: 25}, {ID: 242}]},
            {modelID: 'Zigbee 3.0 DALI CONV LI\u0000', endpoints: [{ID: 10}, {ID: 11}, {ID: 25}, {ID: 242}]}],
        model: '4062172044776_4',
        vendor: 'OSRAM',
        description: 'Zigbee 3.0 DALI CONV LI dimmer for DALI-based luminaires (with two devices and pushbutton)',
        extend: [
            deviceEndpoints({endpoints: {'l1': 10, 'l2': 11, 's1': 25}}),
            ledvanceLight({configureReporting: true, endpointNames: ['l1', 'l2', 's1'], ota: ota.zigbeeOTA}),
        ],
        fromZigbee: [fz.command_toggle, fz.command_move, fz.command_stop],
        exposes: [e.action(['toggle_s1', 'brightness_move_up_s1', 'brightness_move_down_s1', 'brightness_stop_s1'])],
        onEvent: async (type, data, device) => {
            if (type === 'deviceInterview') {
                device.getEndpoint(25).addBinding('genOnOff', device.getEndpoint(10));
                device.getEndpoint(25).addBinding('genLevelCtrl', device.getEndpoint(10));
            }
        },
    },
    {
        zigbeeModel: ['LIGHTIFY Under Cabinet TW'],
        model: '71150',
        vendor: 'OSRAM',
        description: 'Lightify under cabinet tunable white',
        extend: [ledvanceLight({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['PBC'],
        model: '4052899930377',
        vendor: 'OSRAM',
        description: 'Lightify pro push button controller (PBC)',
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4};
        },
        fromZigbee: [ledvanceFz.pbc_level_to_action],
        exposes: [
            e.action(['hold', 'release', 'toggle']).withEndpoint('l1'),
            e.action(['hold', 'release', 'toggle']).withEndpoint('l2'),
            e.action(['hold', 'release', 'toggle']).withEndpoint('l3'),
            e.action(['hold', 'release', 'toggle']).withEndpoint('l4'),
        ],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genLevelCtrl']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genLevelCtrl']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genLevelCtrl']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genLevelCtrl']);
        },
    },
];

export default definitions;
module.exports = definitions;
