const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const constants = require('../lib/constants');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
	{
        zigbeeModel: ['EFEKTA_PWS'],
        model: 'EFEKTA_PWS',
        vendor: 'EFEKTALAB',
        description: '[Plant Wattering Sensor]',
        fromZigbee: [fz.temperature, fz.soil_moisture, fz.battery],
        toZigbee: [tz.factory_reset],
		meta: {configureKey: 1, disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, ['genPowerCfg', 'msTemperatureMeasurement', 'msSoilMoisture']);
            const overides = {min: 0, max: 21600, change: 0};
            await reporting.batteryVoltage(firstEndpoint, overides);
            await reporting.batteryPercentageRemaining(firstEndpoint, overides);
            await reporting.temperature(firstEndpoint, overides);
            await reporting.soil_moisture(firstEndpoint, overides);
        },
        exposes: [e.soil_moisture(), e.battery(), e.temperature()],
    },
];
