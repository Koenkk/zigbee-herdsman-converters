const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['EasyCode903G2.1'],
        model: 'EasyCode903G2.1',
        vendor: 'EasyAccess',
        description: 'EasyFinger V2',
        fromZigbee: [fz.lock, fz.easycode_action, fz.battery],
        toZigbee: [tz.lock, tz.easycode_auto_relock, tz.lock_sound_volume],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery(), e.sound_volume(),
            e.action(['zigbee_unlock', 'lock', 'rfid_unlock', 'keypad_unlock']),
            exposes.binary('auto_relock', ea.STATE_SET, true, false).withDescription('Auto relock after 7 seconds.')],
    },
];
