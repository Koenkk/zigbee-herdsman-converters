const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['GreenPower_2'],
        model: 'GreenPower_On_Off_Switch',
        vendor: 'GreenPower',
        description: 'On/off switch (deprecated)',
        fromZigbee: [fz.greenpower_on_off_switch],
        exposes: [e.action([
            'identify', 'recall_scene_0', 'recall_scene_1', 'recall_scene_2', 'recall_scene_3', 'recall_scene_4', 'recall_scene_5',
            'recall_scene_6', 'recall_scene_7', 'store_scene_0', 'store_scene_1', 'store_scene_2', 'store_scene_3', 'store_scene_4',
            'store_scene_5', 'store_scene_6', 'store_scene_7', 'off', 'on', 'toggle', 'release', 'press_1_of_1', 'release_1_of_1',
            'press_1_of_2', 'release_1_of_2', 'press_2_of_2', 'release_2_of_2', 'short_press_1_of_1', 'short_press_1_of_2',
            'short_press_2_of_1'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['GreenPower_7'],
        model: 'GreenPower_7',
        vendor: 'GreenPower',
        description: 'device 7 (deprecated)',
        fromZigbee: [fz.greenpower_7],
        toZigbee: [],
        exposes: [e.action(['*'])],
    },
];
