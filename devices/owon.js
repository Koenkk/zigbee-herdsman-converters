const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const constants = require('../lib/constants');
const reporting = require('../lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['WSP404'],
        model: 'WSP404',
        vendor: 'OWON',
        description: 'Smart plug',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint, {min: 5, max: constants.repInterval.MINUTES_5, change: 2});
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ['CB432'],
        model: 'CB432',
        vendor: 'OWON',
        description: '32A/63A power circuit breaker',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.metering, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.energy()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
    },
    {
        zigbeeModel: ['PIR313-E'],
        model: 'PIR313-E',
        vendor: 'OWON',
        description: 'Motion sensor',
        fromZigbee: [fz.battery, fz.ignore_basic_report, fz.ias_occupancy_alarm_1, fz.temperature, fz.humidity,
            fz.occupancy_timeout, fz.illuminance],
        toZigbee: [],
        exposes: [e.occupancy(), e.tamper(), e.battery_low(), e.illuminance(), e.illuminance_lux().withUnit('lx'),
            e.temperature(), e.humidity()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint2 = device.getEndpoint(2);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msTemperatureMeasurement', 'msRelativeHumidity']);
            await reporting.bind(endpoint3, coordinatorEndpoint, ['msIlluminanceMeasurement']);
            device.powerSource = 'Battery';
            device.save();
        },
    },
];
