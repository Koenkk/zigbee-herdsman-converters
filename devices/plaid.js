const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        fingerprint: [{modelID: 'PS-SPRZMS-SLP3', manufacturerName: 'PLAID SYSTEMS'}],
        zigbeeModel: ['PS-SPRZMS-SLP3'],
        model: 'PS-SPRZMS-SLP3',
        vendor: 'PLAID SYSTEMS',
        description: 'Spruce temperature and moisture sensor',
        toZigbee: [],
        fromZigbee: [fz.temperature, fz.humidity],
        exposes: [e.humidity(), e.temperature()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'msRelativeHumidity']);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
        },
    },
];
