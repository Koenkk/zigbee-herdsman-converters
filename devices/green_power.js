const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['GreenPower_2'],
        model: 'GreenPower_On_Off_Switch',
        vendor: 'GreenPower',
        description: 'On/off switch',
        fromZigbee: [fz.greenpower_on_off_switch],
        exposes: [e.action([
            'identify', 'recall_scene_0', 'recall_scene_1', 'recall_scene_2', 'recall_scene_3', 'recall_scene_4', 'recall_scene_5',
            'recall_scene_6', 'recall_scene_7', 'store_scene_0', 'store_scene_1', 'store_scene_2', 'store_scene_3', 'store_scene_4',
            'store_scene_5', 'store_scene_6', 'store_scene_7', 'off', 'on', 'toggle', 'release', 'press_1_of_1', 'release_1_of_1',
            'press_1_of_2', 'release_1_of_2', 'press_2_of_2', 'release_2_of_2', 'short_press_1_of_1', 'short_press_1_of_2',
            'short_press_2_of_1'])],
        toZigbee: [],
        whiteLabel: [{vendor: 'Philips', description: 'Hue Tap', model: '8718696743133'},
            {vendor: 'Niko', description: 'Friends of Hue switch', model: '91004'}],
    },
    {
        zigbeeModel: ['GreenPower_7'],
        model: 'GreenPower_7',
        vendor: 'GreenPower',
        description: 'device 7',
        fromZigbee: [fz.greenpower_7],
        toZigbee: [],
        exposes: [e.action(['*'])],
        whiteLabel: [{vendor: 'EnOcean', description: 'Easyfit 1 or 2 gang switch', model: 'EWSxZG'}],
    },
];
