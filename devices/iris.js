const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const extend = require('../lib/extend');

module.exports = [
    {
        zigbeeModel: ['1116-S'],
        model: 'IL06_1',
        vendor: 'Iris',
        description: 'Contact and temperature sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
            device.powerSource = 'Battery';
            device.save();
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['3210-L'],
        model: '3210-L',
        vendor: 'Iris',
        description: 'Smart plug',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            // 3210-L doesn't support reading 'acVoltageMultiplier' or 'acVoltageDivisor'
            await endpoint.read('haElectricalMeasurement', ['acCurrentMultiplier', 'acCurrentDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.onOff(endpoint);
            await reporting.rmsVoltage(endpoint, {change: 2}); // Voltage reports in V
            await reporting.rmsCurrent(endpoint, {change: 10}); // Current reports in mA
            await reporting.activePower(endpoint); // Power reports in 0.1W
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
    },
    {
        zigbeeModel: ['3326-L'],
        model: '3326-L',
        vendor: 'Iris',
        description: 'Motion and temperature sensor',
        fromZigbee: [fz.ias_occupancy_alarm_2, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['3320-L'],
        model: '3320-L',
        vendor: 'Iris',
        description: 'Contact and temperature sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['3450-L', '3450-L2'],
        model: '3450-L',
        vendor: 'Iris',
        description: 'Smart fob',
        fromZigbee: [fz.command_on_presence, fz.command_off, fz.battery, fz.checkin_presence],
        toZigbee: [],
        exposes: [e.action(['on_1', 'off_1', 'on_2', 'off_2', 'on_3', 'off_3', 'on_4', 'off_4']),
            e.battery(), e.presence()],
        meta: {battery: {voltageToPercentage: '3V_2100'}, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'genPowerCfg', 'genPollCtrl']);
            await reporting.batteryVoltage(endpoint1);
            const interval = 100 - 10; // 100 seconds is default timeout so set inverval to 10 seconds before
            await endpoint1.write('genPollCtrl', {'checkinInterval': (interval * 4)});
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ['genOnOff']);
            const endpoint4 = device.getEndpoint(4);
            await reporting.bind(endpoint4, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['3460-L'],
        model: '3460-L',
        vendor: 'Iris',
        description: 'Smart button',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.temperature],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.action(['on', 'off'])],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg', 'msTemperatureMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.batteryVoltage(endpoint);
            await reporting.temperature(endpoint);
        },
    },
    {
        zigbeeModel: ['1117-S'],
        model: 'iL07_1',
        vendor: 'Iris',
        description: 'Motion Sensor',
        fromZigbee: [fz.ias_occupancy_alarm_2, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.temperature(), e.humidity()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'msRelativeHumidity']);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
        },
    },
    {
        zigbeeModel: ['HT8-ZB'],
        model: '27087-03',
        vendor: 'Iris',
        description: 'Hose faucet water timer',
        fromZigbee: [fz.on_off, fz.battery, fz.ignore_time_read],
        toZigbee: [tz.on_off],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.switch(), e.battery()],
    },
    {
        zigbeeModel: ['1113-S'],
        model: 'iL03_1',
        vendor: 'Iris',
        description: 'Smart plug',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
];
