const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const e = exposes.presets;

module.exports = [
    {
        fingerprint: [{modelID: 'GreenPower_2', greenPowerKey: '46.197.242'}],
        model: 'PTM 215Z',
        vendor: 'EnOcean',
        description: 'Pushbutton transmitter module',
        fromZigbee: [fz.enocean_ptm215z],
        toZigbee: [],
        exposes: [e.action(['press_1', 'release_1', 'press_2', 'release_2', 'press_3', 'release_3', 'press_4', 'release_4',
            'press_1_and_3', 'release_1_and_3', 'press_2_and_4', 'release_2_and_4'])],
        whiteLabel: [
            {vendor: 'Niko', description: 'Dimmer switch for Hue system', model: '91004'},
            {vendor: 'NodOn', description: 'Smart switch for Philips Hue', model: 'CWS-4-1-01_HUE'},
            {vendor: 'Vimar', description: 'Zigbee Friends of Hue RF switch', model: '03906'},
        ],
    },
    {
        fingerprint: [{modelID: 'GreenPower_2', greenPowerKey: '27.129.242'}],
        model: 'PTM 215ZE',
        vendor: 'EnOcean',
        description: 'Pushbutton transmitter module',
        fromZigbee: [fz.enocean_ptm215ze],
        toZigbee: [],
        exposes: [e.action(['press_1', 'release_1', 'press_2', 'release_2', 'press_3', 'release_3', 'press_4', 'release_4',
            'press_1_and_2', 'release_1_and_2', 'press_1_and_3', 'release_1_and_3', 'press_1_and_4', 'release_1_and_4',
            'press_2_and_3', 'release_2_and_3', 'press_2_and_4', 'release_2_and_4', 'press_3_and_4', 'release_3_and_4'])],
        whiteLabel: [
            {vendor: 'Easyfit by EnOcean', description: 'Wall switch for Zigbee', model: 'EWSxZ'},
            {vendor: 'Trio2sys', description: 'Zigbee Green Power complete switch', model: '20020002'},
        ],
    },
    {
        fingerprint: [{modelID: 'GreenPower_7', greenPowerKey: '31.133.242'}],
        model: 'PTM 216Z',
        vendor: 'EnOcean',
        description: 'Pushbutton transmitter module',
        fromZigbee: [fz.enocean_ptm216z],
        toZigbee: [],
        exposes: [e.action(['press_1', 'press_2', 'press_1_and_2', 'press_3', 'press_1_and_3', 'press_3_and_4', 'press_1_and_2_and_3',
            'press_4', 'press_1_and_4', 'press_2_and_4', 'press_1_and_2_and_4', 'press_3_and_4', 'press_1_and_3_and_4',
            'press_2_and_3_and_4', 'press_all', 'press_energy_bar', 'release'])],
    },
];
