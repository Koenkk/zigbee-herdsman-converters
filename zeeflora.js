const exposes = require('zigbee-herdsman-converters/lib/exposes');
const e = exposes.presets;
const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const reporting = require('zigbee-herdsman-converters/lib/reporting');

const device = {
    zigbeeModel: ['ZeeFlora'],
    model: 'ZeeFlora',
    vendor: 'Tech4You',
    description: '[Flower sensor with rechargeable battery]',
    supports: '',
    fromZigbee: [fz.temperature, fz.illuminance, fz.soil_moisture, fz.battery],
    toZigbee: [tz.factory_reset],
    meta: {
        configureKey: 1,
        multiEndpoint: true,
    },
    configure: async (device, coordinatorEndpoint, logger) => {
        const firstEndpoint = device.getEndpoint(1);
        await reporting.bind(firstEndpoint, coordinatorEndpoint, [
            'genPowerCfg', 'msTemperatureMeasurement',
            'msIlluminanceMeasurement', 'msSoilMoisture']);
        const overides = {min: 0, max: 3600, change: 0};
        await reporting.batteryVoltage(firstEndpoint, overides);
        await reporting.batteryPercentageRemaining(firstEndpoint, overides);
        await reporting.temperature(firstEndpoint, overides);
        await reporting.illuminance(firstEndpoint, overides);
        await reporting.soil_moisture(firstEndpoint, overides);
    },
    exposes: [e.soil_moisture(), e.battery(), e.illuminance(), e.temperature(),
    ],
};

module.exports = device;
