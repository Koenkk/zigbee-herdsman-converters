const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const constants = require('../lib/constants');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    PC321_metering: {
        cluster: 'seMetering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const payload = {};
            if (msg.data.hasOwnProperty('owonL1Energy')) {
                payload.energy_l1 = msg.data['owonL1Energy'][1] / 1000.0;
            }
            if (msg.data.hasOwnProperty('owonL2Energy')) {
                payload.energy_l2 = msg.data['owonL2Energy'][1] / 1000.0;
            }
            if (msg.data.hasOwnProperty('owonL3Energy')) {
                payload.energy_l3 = msg.data['owonL3Energy'][1] / 1000.0;
            }
            if (msg.data.hasOwnProperty('owonL1ReactiveEnergy')) {
                payload.reactive_energy_l1 = msg.data['owonL1ReactiveEnergy'][1] / 1000.0;
            }
            if (msg.data.hasOwnProperty('owonL2ReactiveEnergy')) {
                payload.reactive_energy_l2 = msg.data['owonL2ReactiveEnergy'][1] / 1000.0;
            }
            if (msg.data.hasOwnProperty('owonL3ReactiveEnergy')) {
                payload.reactive_energy_l3 = msg.data['owonL3ReactiveEnergy'][1] / 1000.0;
            }
            if (msg.data.hasOwnProperty('owonL1PhasePower')) {
                payload.power_l1 = msg.data['owonL1PhasePower'];
            }
            if (msg.data.hasOwnProperty('owonL2PhasePower')) {
                payload.power_l2 = msg.data['owonL2PhasePower'];
            }
            if (msg.data.hasOwnProperty('owonL3PhasePower')) {
                payload.power_l3 = msg.data['owonL3PhasePower'];
            }
            if (msg.data.hasOwnProperty('owonL1PhaseReactivePower')) {
                payload.reactive_power_l1 = msg.data['owonL1PhaseReactivePower'];
            }
            if (msg.data.hasOwnProperty('owonL2PhaseReactivePower')) {
                payload.reactive_power_l2 = msg.data['owonL2PhaseReactivePower'];
            }
            if (msg.data.hasOwnProperty('owonL3PhaseReactivePower')) {
                payload.reactive_power_l3 = msg.data['owonL3PhaseReactivePower'];
            }
            if (msg.data.hasOwnProperty('owonL1PhaseVoltage')) {
                payload.voltage_l1 = msg.data['owonL1PhaseVoltage'] / 10.0;
            }
            if (msg.data.hasOwnProperty('owonL2PhaseVoltage')) {
                payload.voltage_l2 = msg.data['owonL2PhaseVoltage'] / 10.0;
            }
            if (msg.data.hasOwnProperty('owonL3PhaseVoltage')) {
                payload.voltage_l3 = msg.data['owonL3PhaseVoltage'] / 10.0;
            }
            if (msg.data.hasOwnProperty('owonL1PhaseCurrent')) {
                payload.current_l1 = msg.data['owonL1PhaseCurrent'] / 1000.0;
            }
            if (msg.data.hasOwnProperty('owonL2PhaseCurrent')) {
                payload.current_l2 = msg.data['owonL2PhaseCurrent'] / 1000.0;
            }
            if (msg.data.hasOwnProperty('owonL3PhaseCurrent')) {
                payload.current_l3 = msg.data['owonL3PhaseCurrent'] / 1000.0;
            }
            if (msg.data.hasOwnProperty('owonFrequency')) {
                payload.frequency = msg.data['owonFrequency'];
            }
            if (msg.data.hasOwnProperty('owonReactiveEnergySum')) {
                payload.reactive_energy_sum = msg.data['owonReactiveEnergySum'];
            }
            return payload;
        },
    },
};
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
        zigbeeModel: ['PIR313-E', 'PIR313'],
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
        zigbeeModel: ['PC321'],
        model: 'PC321',
        vendor: 'OWON',
        description: '3-Phase clamp power meter',
        fromZigbee: [fz.metering, fzLocal.PC321_metering],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            if (device.powerSource === 'Unknown') {
                device.powerSource = 'Mains (single phase)';
                device.save();
            }
        },
        exposes: [e.energy(),
            exposes.numeric('voltage_l1', ea.STATE).withUnit('V').withDescription('Phase 1 voltage'),
            exposes.numeric('voltage_l2', ea.STATE).withUnit('V').withDescription('Phase 2 voltage'),
            exposes.numeric('voltage_l3', ea.STATE).withUnit('V').withDescription('Phase 3 voltage'),
            exposes.numeric('current_l1', ea.STATE).withUnit('A').withDescription('Phase 1 current'),
            exposes.numeric('current_l2', ea.STATE).withUnit('A').withDescription('Phase 2 current'),
            exposes.numeric('current_l3', ea.STATE).withUnit('A').withDescription('Phase 3 current'),
            exposes.numeric('energy_l1', ea.STATE).withUnit('kWh').withDescription('Phase 1 energy'),
            exposes.numeric('energy_l2', ea.STATE).withUnit('kWh').withDescription('Phase 2 energy'),
            exposes.numeric('energy_l3', ea.STATE).withUnit('kWh').withDescription('Phase 3 energy'),
            exposes.numeric('reactive_energy_l1', ea.STATE).withUnit('kVArh').withDescription('Phase 1 reactive energy'),
            exposes.numeric('reactive_energy_l2', ea.STATE).withUnit('kVArh').withDescription('Phase 2 reactive energy'),
            exposes.numeric('reactive_energy_l3', ea.STATE).withUnit('kVArh').withDescription('Phase 3 reactive energy'),
            exposes.numeric('power_l1', ea.STATE).withUnit('W').withDescription('Phase 1 power'),
            exposes.numeric('power_l2', ea.STATE).withUnit('W').withDescription('Phase 2 power'),
            exposes.numeric('power_l3', ea.STATE).withUnit('W').withDescription('Phase 3 power'),
            exposes.numeric('reactive_power_l1', ea.STATE).withUnit('VAr').withDescription('Phase 1 reactive power'),
            exposes.numeric('reactive_power_l2', ea.STATE).withUnit('VAr').withDescription('Phase 2 reactive power'),
            exposes.numeric('reactive_power_l3', ea.STATE).withUnit('VAr').withDescription('Phase 3 reactive power'),
        ],
    },
    {
        zigbeeModel: ['PCT504'],
        model: 'PCT504',
        vendor: 'OWON',
        description: 'HVAC fan coil',
        fromZigbee: [fz.fan, fz.thermostat, fz.humidity, fz.occupancy, fz.legacy.hvac_user_interface],
        toZigbee: [tz.fan_mode,
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint, tz.thermostat_unoccupied_cooling_setpoint,
            tz.thermostat_min_heat_setpoint_limit, tz.thermostat_max_heat_setpoint_limit,
            tz.thermostat_min_cool_setpoint_limit, tz.thermostat_max_cool_setpoint_limit,
            tz.thermostat_local_temperature,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode, tz.thermostat_running_mode, tz.thermostat_running_state, tz.thermostat_programming_operation_mode],
        exposes: [e.humidity(), e.occupancy(),
            exposes.climate().withSystemMode(['off', 'heat', 'cool', 'fan_only', 'sleep']).withLocalTemperature()
                .withRunningMode(['off', 'heat', 'cool'])
                .withRunningState(['idle', 'heat', 'cool', 'fan_only'])
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withSetpoint('unoccupied_heating_setpoint', 5, 30, 0.5)
                .withSetpoint('occupied_cooling_setpoint', 7, 35, 0.5).withSetpoint('unoccupied_cooling_setpoint', 7, 35, 0.5),
            e.fan().withModes(['low', 'medium', 'high', 'on', 'auto']),
            e.programming_operation_mode(['setpoint', 'eco']), e.keypad_lockout(),
            e.max_heat_setpoint_limit(5, 30, 0.5), e.min_heat_setpoint_limit(5, 30, 0.5),
            e.max_cool_setpoint_limit(7, 35, 0.5), e.min_cool_setpoint_limit(7, 35, 0.5)],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'hvacFanCtrl',
                'msTemperatureMeasurement', 'msOccupancySensing'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.fanMode(endpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ['hvacThermostat']);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedCoolingSetpoint(endpoint);
            await reporting.thermostatTemperature(endpoint, {min: 60, max: 600, change: 0.1});
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatRunningMode(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.humidity(endpoint, {min: 60, max: 600, change: 1});
            await reporting.thermostatKeypadLockMode(endpoint);

            await endpoint.read('hvacThermostat', ['systemMode', 'runningMode', 'runningState',
                'occupiedHeatingSetpoint', 'unoccupiedHeatingSetpoint',
                'occupiedCoolingSetpoint', 'unoccupiedCoolingSetpoint', 'localTemp']);
            await endpoint.read('msRelativeHumidity', ['measuredValue']);

            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msOccupancySensing']);
            await reporting.occupancy(endpoint2, {min: 1, max: 600, change: 1});
            await endpoint2.read('msOccupancySensing', ['occupancy']);
        },
    },
];
