const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const reporting = require('../lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['TPZRCO2HT-Z3', 'TPZRCO2HT-Z3/L'],
        model: 'TPZRCO2HT-Z3',
        vendor: 'Titan Products',
        description: 'Room CO2, humidity & temperature sensor',
        fromZigbee: [fz.battery, fz.humidity, fz.temperature, fz.co2],
        exposes: [e.battery_voltage(), e.battery_low(), e.humidity(), e.temperature(), e.co2()],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'msTemperatureMeasurement', 'msCO2']);
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['msRelativeHumidity']);
        },
    },
];
