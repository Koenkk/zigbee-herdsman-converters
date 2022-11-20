const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const ota = require('../lib/ota');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['TWV'],
        model: 'TWV',
        vendor: 'UHome',
        description: 'UHome Smart Valve',
        ota: ota.zigbeeOTA,
        fromZigbee: [fz.on_off, fz.battery],
        toZigbee: [tz.on_off],
        exposes: [e.battery(), e.switch()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genOnOff']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.onOff(endpoint);
        },
    },
];
