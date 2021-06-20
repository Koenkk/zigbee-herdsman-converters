const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['Connected socket outlet'],
        model: '170-33505',
        vendor: 'Niko',
        description: 'Connected socket outlet',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off, tz.electrical_measurement_power],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint);
        },
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.current(), e.voltage()],
    },
    {
        zigbeeModel: ['Smart plug Zigbee PE'],
        model: '552-80699',
        vendor: 'Niko',
        description: 'Smart plug with earthing pin',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior, tz.electrical_measurement_power],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            // only activePower seems to be support, although compliance document states otherwise
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.activePower(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 60, change: 1});
        },
        exposes: [
            e.switch(), e.power().withAccess(ea.STATE_GET), e.energy(),
            exposes.enum('power_on_behavior', ea.ALL, ['off', 'previous', 'on'])
                .withDescription('Controls the behaviour when the device is powered on'),
        ],
    },
    {
        zigbeeModel: ['Connectable motion sensor,Zigbee'],
        model: '552-80401',
        vendor: 'Niko',
        description: 'Wireless motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ['genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.battery()],
    },
];
