const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const ota = require('../lib/ota');
const reporting = require('../lib/reporting');
const utils = require('../lib/utils');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: [' Remote'],
        model: 'InstaRemote',
        vendor: 'Insta',
        description: 'ZigBee Light Link wall/handheld transmitter',
        whiteLabel: [{vendor: 'Gira', model: '2430-100'}, {vendor: 'Gira', model: '2435-10'}, {vendor: 'Jung', model: 'ZLLCD5004M'},
            {vendor: 'Jung', model: 'ZLLLS5004M'}, {vendor: 'Jung', model: 'ZLLA5004M'}, {vendor: 'Jung', model: 'ZLLHS4'}],
        fromZigbee: [fz.legacy.insta_scene_click, fz.command_on, fz.command_off_with_effect, fz.legacy.insta_down_hold,
            fz.legacy.insta_up_hold, fz.legacy.insta_stop],
        exposes: [e.action(['select_0', 'select_1', 'select_2', 'select_3', 'select_4', 'select_5', 'on', 'off', 'down', 'up', 'stop'])],
        toZigbee: [],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['Generic UP Device'],
        model: '57008000',
        vendor: 'Insta',
        description: 'Blinds actor with lift/tilt calibration & with with inputs for wall switches',
        fromZigbee: [fz.cover_position_tilt, fz.command_cover_open, fz.command_cover_close, fz.command_cover_stop],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position_tilt()],
        endpoint: (device) => {
            return {'default': 6};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            await utils.sleep(10000); // https://github.com/Koenkk/zigbee-herdsman-converters/issues/2493
            await reporting.bind(device.getEndpoint(6), coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.bind(device.getEndpoint(7), coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(device.getEndpoint(6));
            await reporting.currentPositionTiltPercentage(device.getEndpoint(6));

            // Has Unknown power source, force it here.
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
];
