const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;
const constants = require('../lib/constants');


module.exports = [
    {
        zigbeeModel: ['easyCodeTouch_v1'],
        model: 'e-life easyCode v1',
        vendor: 'Onesti Products AS',
        description: 'Zigbee module for EasyAccess Code Touch Series',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery, fz.lock_programming_event],
        toZigbee: [tz.lock, tz.lock_sound_volume],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read('closuresDoorLock', ['lockState', 'soundVolume']);


        },
        exposes: [e.lock(), e.battery(),
        exposes.enum('sound_volume', ea.ALL, constants.lockSoundVolume).withDescription('Sound volume of the lock')],
    },
];
