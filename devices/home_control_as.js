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
        toZigbee: [tz.lock],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery()],
    },
];
