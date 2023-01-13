const fz = require('../converters/fromZigbee');
const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        fingerprint: [{modelID: 'PS-SPRZMS-SLP3', manufacturerName: 'PLAID SYSTEMS'}],
        zigbeeModel: ['PS-SPRZMS-SLP3'],
        model: 'PS-SPRZMS-SLP3',
        vendor: 'PLAID SYSTEMS',
        description: 'Spruce temperature and moisture sensor',
        toZigbee: [],
        fromZigbee: [fz.temperature, fz.humidity, fz.plaid_battery],
        exposes: [e.humidity(), e.temperature(), e.battery(), e.battery_voltage()],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
            device.powerSource = 'Battery';
        },
    },
];
