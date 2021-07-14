const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const constants = require('../lib/constants');
const reporting = require('../lib/reporting');
const ota = require('../lib/ota');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['SPLZB-131'],
        model: 'SPLZB-131',
        vendor: 'Develco',
        description: 'Power plug',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ['SPLZB-132'],
        model: 'SPLZB-132',
        vendor: 'Develco',
        description: 'Power plug',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.device_temperature],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.device_temperature()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering', 'genDeviceTempCfg']);
            await reporting.onOff(endpoint);
            await reporting.deviceTemperature(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint, {change: 10}); // Power reports with every 10W change
            await reporting.rmsCurrent(endpoint, {change: 20}); // Current reports with every 20mA change
            await reporting.rmsVoltage(endpoint, {min: constants.repInterval.MINUTES_5, change: 400}); // Limit reports to every 5m, or 4V
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {change: [0, 20]}); // Limit reports to once every 5m, or 0.02kWh
            await reporting.instantaneousDemand(endpoint, {min: constants.repInterval.MINUTES_5, change: 10});
        },
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ['SPLZB-134'],
        model: 'SPLZB-134',
        vendor: 'Develco',
        description: 'Power plug (type G)',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.device_temperature],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.device_temperature()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering', 'genDeviceTempCfg']);
            await reporting.onOff(endpoint);
            await reporting.deviceTemperature(endpoint, {change: 2}); // Device temperature reports with 2 degree change
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint, {change: 10}); // Power reports with every 10W change
            await reporting.rmsCurrent(endpoint, {change: 20}); // Current reports with every 20mA change
            await reporting.rmsVoltage(endpoint, {min: constants.repInterval.MINUTES_5, change: 400}); // Limit reports to every 5m, or 4V
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {change: [0, 20]}); // Limit reports to once every 5m, or 0.02kWh
            await reporting.instantaneousDemand(endpoint, {min: constants.repInterval.MINUTES_5, change: 10});
        },
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ['SMRZB-143'],
        model: 'SMRZB-143',
        vendor: 'Develco',
        description: 'Smart cable',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.device_temperature],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.device_temperature()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering', 'genDeviceTempCfg']);
            await reporting.onOff(endpoint);
            await reporting.deviceTemperature(endpoint, {change: 2}); // Device temperature reports with 2 degree change
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint, {change: 10}); // Power reports with every 10W change
            await reporting.rmsCurrent(endpoint, {change: 20}); // Current reports with every 20mA change
            await reporting.rmsVoltage(endpoint, {min: constants.repInterval.MINUTES_5, change: 400}); // Limit reports to every 5m, or 4V
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {change: [0, 20]}); // Limit reports to once every 5m, or 0.02kWh
            await reporting.instantaneousDemand(endpoint, {min: constants.repInterval.MINUTES_5, change: 10});
        },
        endpoint: (device) => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ['EMIZB-132'],
        model: 'EMIZB-132',
        vendor: 'Develco',
        description: 'Wattle AMS HAN power-meter sensor',
        fromZigbee: [fz.metering, fz.electrical_measurement],
        toZigbee: [tz.EMIZB_132_mode],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering']);

            try {
                // Some don't support these attributes
                // https://github.com/Koenkk/zigbee-herdsman-converters/issues/974#issuecomment-621465038
                await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
                await reporting.rmsVoltage(endpoint);
                await reporting.rmsCurrent(endpoint);
                await reporting.activePower(endpoint);
            } catch (e) {
                e;
            }

            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
            await reporting.currentSummDelivered(endpoint);
            await reporting.currentSummReceived(endpoint);
        },
        exposes: [e.power(), e.energy(), e.current(), e.voltage(), e.current_phase_b(), e.voltage_phase_b(), e.current_phase_c(),
            e.voltage_phase_c()],
    },
    {
        zigbeeModel: ['SMSZB-120'],
        model: 'SMSZB-120',
        vendor: 'Develco',
        description: 'Smoke detector with siren',
        fromZigbee: [fz.temperature, fz.battery, fz.ias_smoke_alarm_1_develco, fz.ignore_basic_report, fz.smszb120_fw],
        toZigbee: [tz.warning],
        ota: ota.zigbeeOTA,
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const options = {manufacturerCode: 4117};
            const endpoint = device.getEndpoint(35);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'ssIasZone', 'genBasic']);
            await reporting.batteryVoltage(endpoint);
            await endpoint.read('genBasic', [0x8000], options);
            const endpoint2 = device.getEndpoint(38);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.temperature(endpoint2, {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_10, change: 10});
        },
        endpoint: (device) => {
            return {default: 35};
        },
        exposes: [e.temperature(), e.battery(), e.smoke(), e.battery_low(), e.test(), e.warning()],
    },
    {
        zigbeeModel: ['HESZB-120'],
        model: 'HESZB-120',
        vendor: 'Develco',
        description: 'Fire detector with siren',
        fromZigbee: [fz.temperature, fz.battery, fz.ias_smoke_alarm_1, fz.ignore_basic_report, fz.ignore_genOta],
        toZigbee: [tz.warning],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(35);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'ssIasZone', 'genBasic']);
            await reporting.batteryVoltage(endpoint);
            const endpoint2 = device.getEndpoint(38);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.temperature(endpoint2, {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_10, change: 10});
        },
        endpoint: (device) => {
            return {default: 35};
        },
        exposes: [e.temperature(), e.battery(), e.smoke(), e.battery_low(), e.test(), e.warning()],
    },
    {
        zigbeeModel: ['MOSZB-130'],
        model: 'MOSZB-130',
        vendor: 'Develco',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['WISZB-120'],
        model: 'WISZB-120',
        vendor: 'Develco',
        description: 'Window sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(38);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.temperature(endpoint);
        },
    },
    {
        zigbeeModel: ['WISZB-121'],
        model: 'WISZB-121',
        vendor: 'Develco',
        description: 'Window sensor',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low()],
    },
    {
        zigbeeModel: ['MOSZB-140'],
        model: 'MOSZB-140',
        vendor: 'Develco',
        description: 'Motion sensor',
        fromZigbee: [fz.temperature, fz.illuminance, fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.temperature(), e.illuminance_lux()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(38);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.temperature(endpoint1);
            const endpoint2 = device.getEndpoint(39);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msIlluminanceMeasurement']);
            await reporting.illuminance(endpoint2);
        },
    },
    {
        zigbeeModel: ['MOSZB-141'],
        model: 'MOSZB-141',
        vendor: 'Develco',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low()],
    },
    {
        zigbeeModel: ['HMSZB-110'],
        model: 'HMSZB-110',
        vendor: 'Develco',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.battery_low(), e.temperature(), e.humidity()],
        meta: {battery: {voltageToPercentage: '3V_2500_3200'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(38);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg']);
            await reporting.temperature(endpoint, {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_10, change: 10});
            await reporting.humidity(endpoint, {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_10, change: 300});
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['ZHEMI101'],
        model: 'ZHEMI101',
        vendor: 'Develco',
        description: 'Energy meter',
        fromZigbee: [fz.metering],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.instantaneousDemand(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
        },
        exposes: [e.power(), e.energy()],
    },
    {
        zigbeeModel: ['SMRZB-332'],
        model: 'SMRZB-332',
        vendor: 'Develco',
        description: 'Smart relay DIN',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.power(), e.energy(), e.switch()],
        endpoint: (device) => {
            return {'default': 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.instantaneousDemand(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
        },
    },
    {
        zigbeeModel: ['FLSZB-110'],
        model: 'FLSZB-110',
        vendor: 'Develco',
        description: 'Flood alarm device ',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        exposes: [e.battery_low(), e.tamper(), e.water_leak(), e.temperature(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint35 = device.getEndpoint(35);
            await reporting.bind(endpoint35, coordinatorEndpoint, ['genPowerCfg']);
            const endpoint38 = device.getEndpoint(38);
            await reporting.temperature(endpoint38);
        },
    },
    {
        zigbeeModel: ['AQSZB-110'],
        model: 'AQSZB-110',
        vendor: 'Develco',
        description: 'Air quality sensor',
        fromZigbee: [fz.develco_voc_battery, fz.develco_voc, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [
            e.voc(), e.temperature(), e.humidity(),
            e.battery(), e.battery_low(),
            exposes.enum('air_quality', ea.STATE, [
                'excellent', 'good', 'moderate',
                'poor', 'unhealthy', 'out_of_range',
                'unknown']).withDescription('Measured air quality'),
        ],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(38);
            const options = {manufacturerCode: 0x1015};
            await reporting.bind(endpoint, coordinatorEndpoint,
                ['develcoSpecificAirQuality', 'msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg']);
            await endpoint.configureReporting('develcoSpecificAirQuality', [{attribute: 'measuredValue', minimumReportInterval: 60,
                maximumReportInterval: 3600, reportableChange: 10}], options);
            await reporting.temperature(endpoint, {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_10, change: 10});
            await reporting.humidity(endpoint, {min: constants.repInterval.MINUTE, max: constants.repInterval.MINUTES_10, change: 300});
            await reporting.batteryVoltage(endpoint, {min: constants.repInterval.HOUR, max: 43200, change: 100});
        },
    },
];
