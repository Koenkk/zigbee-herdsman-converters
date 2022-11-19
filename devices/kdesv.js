const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const ota = require('zigbee-herdsman-converters/lib/ota');
const e = exposes.presets;
const ea = exposes.access;

const definition = {
    zigbeeModel: ['TWV'],
    model: 'TWV',
    vendor: 'KDE',
    description: 'UHome Smart Valve',
    ota: ota.zigbeeOTA,
    fromZigbee: [fz.on_off, fz.battery],
    toZigbee: [tz.on_off],
    exposes: [e.battery(), e.switch()],
        configure: async (device, coordinatorEndpoint) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg','genOnOff']);
        await reporting.batteryPercentageRemaining(endpoint);
        await reporting.onOff(endpoint);
    },
};

module.exports = definition;