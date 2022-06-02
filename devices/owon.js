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
    {
        zigbeeModel: ['AC201'],
        model: 'AC201',
        vendor: 'OWON',
        description: 'HVAC controller/IR blaster',
        fromZigbee: [fz.fan, fz.thermostat],
        toZigbee: [tz.fan_mode, tz.thermostat_system_mode, tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint, tz.thermostat_ac_louver_position, tz.thermostat_local_temperature],
        exposes: [exposes.climate().withSystemMode(['off', 'heat', 'cool', 'auto', 'dry', 'fan_only'])
            .withSetpoint('occupied_heating_setpoint', 8, 30, 1).withSetpoint('occupied_cooling_setpoint', 8, 30, 1)
            .withAcLouverPosition(['fully_open', 'fully_closed', 'half_open', 'quarter_open', 'three_quarters_open'])
            .withLocalTemperature(), e.fan().withModes(['low', 'medium', 'high', 'on', 'auto'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['hvacFanCtrl']);
            await reporting.fanMode(endpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ['hvacThermostat']);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatTemperature(endpoint, {min: 60, max: 600, change: 0.1});
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatAcLouverPosition(endpoint);
        },
    },
    {
        zigbeeModel: ['THS317'],
        model: 'THS317',
        vendor: 'OWON',
        description: 'Temperature and humidity sensor',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            device.powerSource = 'Battery';
            device.save();
        },
    },
    {
        zigbeeModel: ['THS317-ET'],
        model: 'THS317-ET',
        vendor: 'OWON',
        description: 'Temperature sensor',
        fromZigbee: [fz.temperature, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.temperature()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            device.powerSource = 'Battery';
            device.save();
        },
    },
	{
        zigbeeModel: ['PC321'], // The model ID from: Device with modelID 'lumi.sens' is not supported.
        model: 'PC321', // Vendor model number, look on the device for a model number
        vendor: 'OWON', // Vendor of the device (only used for documentation and startup logging)
        description: '3-Phase Clamp Power Meter', // Description of the device, copy from vendor site. (only used for documentation and startup logging)
        fromZigbee: [fz.metering, fz.PC321_metering],
        toZigbee: [], // Should be empty, unless device can be controlled (e.g. lights, switches).
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            //const payload = [{
            //        attribute: 'owonL2Energy',
            //        minimumReportInterval: 5,
            //        maximumReportInterval: 3600,
            //        reportableChange: 0,
            //    }];
                await endpoint.configureReporting('haElectricalMeasurement', payload);
        },
        exposes: [e.energy(),
        exposes.numeric('voltage_l1',ea.STATE).withUnit('V').withDescription('Phase 1 Voltage'),
        exposes.numeric('voltage_l2',ea.STATE).withUnit('V').withDescription('Phase 2 Voltage'),
        exposes.numeric('voltage_l3',ea.STATE).withUnit('V').withDescription('Phase 3 Voltage'),
        exposes.numeric('current_l1',ea.STATE).withUnit('A').withDescription('Phase 1 Current'),
        exposes.numeric('current_l2',ea.STATE).withUnit('A').withDescription('Phase 2 Current'),
        exposes.numeric('current_l3',ea.STATE).withUnit('A').withDescription('Phase 3 Current'),
        exposes.numeric('energy_l1',ea.STATE).withUnit('kWh').withDescription('Phase 1 Energy'),
        exposes.numeric('energy_l2',ea.STATE).withUnit('kWh').withDescription('Phase 2 Energy'),
        exposes.numeric('energy_l3',ea.STATE).withUnit('kWh').withDescription('Phase 3 Energy'),
        exposes.numeric('reactive_energy_l1',ea.STATE).withUnit('kVArh').withDescription('Phase 1 Reactive Energy'),
        exposes.numeric('reactive_energy_l2',ea.STATE).withUnit('kVArh').withDescription('Phase 2 Reactive Energy'),
        exposes.numeric('reactive_energy_l3',ea.STATE).withUnit('kVArh').withDescription('Phase 3 Reactive Energy'),
        exposes.numeric('power_l1',ea.STATE).withUnit('W').withDescription('Phase 1 Power'),
        exposes.numeric('power_l2',ea.STATE).withUnit('W').withDescription('Phase 2 Power'),
        exposes.numeric('power_l3',ea.STATE).withUnit('W').withDescription('Phase 3 Power'),
        exposes.numeric('reactive_power_l1',ea.STATE).withUnit('VAr').withDescription('Phase 1 Reactive Power'),
        exposes.numeric('reactive_power_l2',ea.STATE).withUnit('VAr').withDescription('Phase 2 Reactive Power'),
        exposes.numeric('reactive_power_l3',ea.STATE).withUnit('VAr').withDescription('Phase 3 Reactive Power'),
        exposes.numeric('frequency',ea.STATE).withUnit('Hz').withDescription('Frequency'),
        exposes.numeric('reactive_energy_sum',ea.STATE).withUnit('kVArh').withDescription('Reactive Energy Sum'),
        ],
    },
];
