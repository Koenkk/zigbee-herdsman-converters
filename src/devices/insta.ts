import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import tz from '../converters/toZigbee';
import * as ota from '../lib/ota';
import * as reporting from '../lib/reporting';
import * as utils from '../lib/utils';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: [' Remote'],
        model: 'InstaRemote',
        vendor: 'Insta',
        description: 'ZigBee Light Link wall/handheld transmitter',
        whiteLabel: [{vendor: 'Gira', model: '2430-100'}, {vendor: 'Gira', model: '2435-10'}, {vendor: 'Jung', model: 'ZLLCD5004M'},
            {vendor: 'Jung', model: 'ZLLLS5004M'}, {vendor: 'Jung', model: 'ZLLA5004M'}, {vendor: 'Jung', model: 'ZLLHS4'}],
        fromZigbee: [legacy.fz.insta_scene_click, fz.command_on, fz.command_off_with_effect, legacy.fz.insta_down_hold,
            legacy.fz.insta_up_hold, legacy.fz.insta_stop],
        exposes: [e.action(['select_0', 'select_1', 'select_2', 'select_3', 'select_4', 'select_5', 'on', 'off', 'down', 'up', 'stop'])],
        toZigbee: [],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['NEXENTRO Blinds Actuator', 'Generic UP Device'],
        model: '57008000',
        vendor: 'Insta',
        description: 'Blinds actor with lift/tilt calibration & with with inputs for wall switches',
        fromZigbee: [fz.cover_position_tilt, fz.command_cover_open, fz.command_cover_close, fz.command_cover_stop],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position_tilt()],
        endpoint: (device) => {
            return {'default': 6};
        },
        configure: async (device, coordinatorEndpoint) => {
            await utils.sleep(10000); // https://github.com/Koenkk/zigbee-herdsman-converters/issues/2493
            await reporting.bind(device.getEndpoint(6), coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.bind(device.getEndpoint(7), coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(device.getEndpoint(6));
            await reporting.currentPositionTiltPercentage(device.getEndpoint(6));

            // Has Unknown power source, force it here.
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
        ota: ota.zigbeeOTA,
    },
    {
        fingerprint: [
            // It seems several Insta devices use the same ModelID with a different endpoint configuration
            // This is the single "Switching Actuator Mini"
            {manufacturerName: 'Insta GmbH', modelID: 'Generic UP Device', endpoints: [
                {ID: 1, profileID: 260, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 4096], outputClusters: [25]},
                {ID: 4, profileID: 260, deviceID: 261, inputClusters: [0, 3], outputClusters: [3, 4, 5, 6, 8, 25, 768]},
                {ID: 242, profileID: 41440, deviceID: 97},
            ]},
        ],
        zigbeeModel: ['NEXENTRO Switching Actuator', '57005000'],
        model: '57005000',
        vendor: 'Insta',
        description: 'Switching Actuator Mini with input for wall switch',
        fromZigbee: [fz.on_off, fz.command_on, fz.command_off],
        toZigbee: [tz.on_off],
        exposes: [e.switch()],
        // The configure method below is needed to make the device reports on/off state changes
        // when the device is controlled manually through the button on it.
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);

            // Has Unknown power source, force it here.
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        fingerprint: [
            // It seems several Insta devices use the same ModelID with a different endpoint configuration
            // This is the "Pushbutton Interface 2-gang"
            {manufacturerName: 'Insta GmbH', modelID: 'Generic UP Device', endpoints: [
                {ID: 4, profileID: 260, deviceID: 261, inputClusters: [0, 3], outputClusters: [3, 4, 5, 6, 8, 25, 768]},
                {ID: 5, profileID: 260, deviceID: 261, inputClusters: [0, 3], outputClusters: [3, 4, 5, 6, 8, 25, 768]},
                {ID: 7, profileID: 260, deviceID: 515, inputClusters: [0, 3], outputClusters: [3, 4, 25, 258]},
                {ID: 242, profileID: 41440, deviceID: 97},
            ]},
        ],
        zigbeeModel: ['NEXENTRO Pushbutton Interface', '57004000'],
        model: '57004000',
        vendor: 'Insta',
        description: 'Pushbutton Interface 2-gang 230V',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_toggle, fz.command_recall, fz.command_move, fz.command_stop,
            fz.command_cover_open, fz.command_cover_close, fz.command_cover_stop],
        toZigbee: [],
        exposes: [e.action([
            'on_e1', 'off_e1', 'toggle_e1', 'recall_*_e1', 'brightness_stop_e1', 'brightness_move_*_e1',
            'on_e2', 'off_e2', 'toggle_e2', 'recall_*_e2', 'brightness_stop_e2', 'brightness_move_*_e2',
            'close_cover', 'open_cover', 'stop_cover',
        ])],
        configure: async (device, coordinatorEndpoint) => {
            // Has Unknown power source, force it here.
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {
                'e1': 4, 'e2': 5, 'cover': 7,
            };
        },
    },
];

export default definitions;
module.exports = definitions;
