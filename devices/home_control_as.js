const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['HC-SLM-1'],
        model: 'HC-SLM-1',
        vendor: 'Home Control AS',
        description: 'Heimgard (Wattle) door lock pro',
        fromZigbee: [fz.lock, fz.battery],
        toZigbee: [tz.lock, tz.lock_auto_relock_time, tz.lock_sound_volume],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read('closuresDoorLock', ['lockState', 'soundVolume']);
        },
        exposes: [
            e.lock(),
            e.battery(),
            e.auto_relock_time().withValueMin(0).withValueMax(3600), 
            e.sound_volume()],
    },
];
