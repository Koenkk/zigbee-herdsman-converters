const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const reporting = require('../lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['MultiSensor'],
        model: 'U02I007C.01',
        vendor: 'Wally',
        description: 'WallyHome multi-sensor',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.temperature, fz.humidity, fz.U02I007C01_contact,
            fz.U02I007C01_water_leak],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.action(['on', 'off']), e.contact(), e.water_leak()],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genPowerCfg', 'genOnOff', 'msTemperatureMeasurement', 'msRelativeHumidity'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
        },
    },
];
