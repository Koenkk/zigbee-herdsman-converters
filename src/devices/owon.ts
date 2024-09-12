import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as constants from '../lib/constants';
import * as exposes from '../lib/exposes';
import * as legacy from '../lib/legacy';
import {battery, iasZoneAlarm} from '../lib/modernExtend';
import * as reporting from '../lib/reporting';
import * as tuya from '../lib/tuya';
import {DefinitionWithExtend, Fz, KeyValue, Tz} from '../lib/types';
const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    temperature: {
        ...fz.temperature,
        convert: (model, msg, publish, options, meta) => {
            // https://github.com/Koenkk/zigbee2mqtt/issues/15173
            if (msg.data.measuredValue < 32767) {
                return fz.temperature.convert(model, msg, publish, options, meta);
            }
        },
    } satisfies Fz.Converter,
    PC321_metering: {
        cluster: 'seMetering',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const factor = 0.001;
            const payload: KeyValue = {};
            if (msg.data.hasOwnProperty('owonL1Energy')) {
                const data = msg.data['owonL1Energy'];
                const value = (parseInt(data[0]) << 32) + parseInt(data[1]);
                payload.energy_l1 = value * factor;
            }
            if (msg.data.hasOwnProperty('owonL2Energy')) {
                const data = msg.data['owonL2Energy'];
                const value = (parseInt(data[0]) << 32) + parseInt(data[1]);
                payload.energy_l2 = value * factor;
            }
            if (msg.data.hasOwnProperty('owonL3Energy')) {
                const data = msg.data['owonL3Energy'];
                const value = (parseInt(data[0]) << 32) + parseInt(data[1]);
                payload.energy_l3 = value * factor;
            }
            if (msg.data.hasOwnProperty('owonL1ReactiveEnergy')) {
                const data = msg.data['owonL1ReactiveEnergy'];
                const value = (parseInt(data[0]) << 32) + parseInt(data[1]);
                payload.reactive_energy_l1 = value * factor;
            }
            if (msg.data.hasOwnProperty('owonL2ReactiveEnergy')) {
                const data = msg.data['owonL2ReactiveEnergy'];
                const value = (parseInt(data[0]) << 32) + parseInt(data[1]);
                payload.reactive_energy_l2 = value * factor;
            }
            if (msg.data.hasOwnProperty('owonL3ReactiveEnergy')) {
                const data = msg.data['owonL3ReactiveEnergy'];
                const value = (parseInt(data[0]) << 32) + parseInt(data[1]);
                payload.reactive_energy_l3 = value / 1000;
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
                payload.current_l1 = msg.data['owonL1PhaseCurrent'] * factor;
            }
            if (msg.data.hasOwnProperty('owonL2PhaseCurrent')) {
                payload.current_l2 = msg.data['owonL2PhaseCurrent'] * factor;
            }
            if (msg.data.hasOwnProperty('owonL3PhaseCurrent')) {
                payload.current_l3 = msg.data['owonL3PhaseCurrent'] * factor;
            }
            if (msg.data.hasOwnProperty('owonFrequency')) {
                payload.frequency = msg.data['owonFrequency'];
            }
            // Issue #20719 summation manufacturer attributes are not well parsed
            if (msg.data.hasOwnProperty('owonReactivePowerSum') || msg.data.hasOwnProperty('8451')) {
                // 0x2103 -> 8451
                const value = msg.data['owonReactiveEnergySum'] || msg.data['8451'];
                payload.power_reactive = value;
            }
            if (msg.data.hasOwnProperty('owonCurrentSum') || msg.data.hasOwnProperty('12547')) {
                // 0x3103 -> 12547
                const data = msg.data['owonCurrentSum'] || msg.data['12547'] * factor;
                payload.current = data;
            }
            if (msg.data.hasOwnProperty('owonReactiveEnergySum') || msg.data.hasOwnProperty('16643')) {
                // 0x4103 -> 16643
                const data = msg.data['owonReactiveEnergySum'] || msg.data['16643'];
                const value = (parseInt(data[0]) << 32) + parseInt(data[1]);
                payload.reactive_energy = value * factor;
            }
            if (msg.data.hasOwnProperty('owonL1PowerFactor')) {
                payload.power_factor_l1 = msg.data['owonL1PowerFactor'] / 100;
            }
            if (msg.data.hasOwnProperty('owonL2PowerFactor')) {
                payload.power_factor_l2 = msg.data['owonL2PowerFactor'] / 100;
            }
            if (msg.data.hasOwnProperty('owonL3PowerFactor')) {
                payload.power_factor_l3 = msg.data['owonL3PowerFactor'] / 100;
            }

            return payload;
        },
    } satisfies Fz.Converter,
};

const tzLocal = {
    PC321_clearMetering: {
        key: ['clear_metering'],
        convertSet: async (entity, key, value, meta) => {
            await entity.command(0xffe0, 0x00, {}, {disableDefaultResponse: true});
        },
    } satisfies Tz.Converter,
};

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['WSP402'],
        model: 'WSP402',
        vendor: 'OWON',
        description: 'Smart plug',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.energy()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint, {min: 5, max: constants.repInterval.MINUTES_5, change: 2}); // divider 1000: 2W
            await reporting.currentSummDelivered(endpoint, {min: 5, max: constants.repInterval.MINUTES_5, change: [10, 10]}); // divider 1000: 0,01kWh
        },
    },
    {
        zigbeeModel: ['WSP403-E'],
        model: 'WSP403',
        vendor: 'OWON',
        whiteLabel: [{vendor: 'Oz Smart Things', model: 'WSP403'}],
        description: 'Smart plug',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.energy()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint, {min: 5, max: constants.repInterval.MINUTES_5, change: 2}); // divider 1000: 2W
            await reporting.currentSummDelivered(endpoint, {min: 5, max: constants.repInterval.MINUTES_5, change: [10, 10]}); // divider 1000: 0,01kWh

            // At least some white label devices, like the Oz Smart Things device, don't report a power source so we need to force it
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['WSP404'],
        model: 'WSP404',
        vendor: 'OWON',
        description: 'Smart plug',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.energy()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint, {min: 5, max: constants.repInterval.MINUTES_5, change: 2}); // divider 1000: 2W
            await reporting.currentSummDelivered(endpoint, {min: 5, max: constants.repInterval.MINUTES_5, change: [10, 10]}); // divider 1000: 0,01kWh
        },
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
        fromZigbee: [fz.battery, fz.ignore_basic_report, fz.ias_occupancy_alarm_1, fz.temperature, fz.humidity, fz.occupancy_timeout, fz.illuminance],
        toZigbee: [],
        exposes: [e.occupancy(), e.tamper(), e.battery_low(), e.illuminance(), e.illuminance_lux().withUnit('lx'), e.temperature(), e.humidity()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint2 = device.getEndpoint(2);
            const endpoint3 = device.getEndpoint(3);
            if (device.modelID == 'PIR313') {
                await reporting.bind(endpoint2, coordinatorEndpoint, ['msIlluminanceMeasurement']);
                await reporting.bind(endpoint3, coordinatorEndpoint, ['msTemperatureMeasurement', 'msRelativeHumidity']);
            } else {
                await reporting.bind(endpoint3, coordinatorEndpoint, ['msIlluminanceMeasurement']);
                await reporting.bind(endpoint2, coordinatorEndpoint, ['msTemperatureMeasurement', 'msRelativeHumidity']);
            }
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
        toZigbee: [
            tz.fan_mode,
            tz.thermostat_system_mode,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_ac_louver_position,
            tz.thermostat_local_temperature,
        ],
        exposes: [
            e
                .climate()
                .withSystemMode(['off', 'heat', 'cool', 'auto', 'dry', 'fan_only'])
                .withSetpoint('occupied_heating_setpoint', 8, 30, 1)
                .withSetpoint('occupied_cooling_setpoint', 8, 30, 1)
                .withAcLouverPosition(['fully_open', 'fully_closed', 'half_open', 'quarter_open', 'three_quarters_open'])
                .withLocalTemperature(),
            e.fan().withModes(['low', 'medium', 'high', 'on', 'auto']),
        ],
        configure: async (device, coordinatorEndpoint) => {
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
        configure: async (device, coordinatorEndpoint) => {
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
        fromZigbee: [fzLocal.temperature, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.temperature()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3) || device.getEndpoint(1);
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
        toZigbee: [tzLocal.PC321_clearMetering],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            if (device.powerSource === 'Unknown') {
                device.powerSource = 'Mains (single phase)';
                device.save();
            }
        },
        meta: {publishDuplicateTransaction: true},
        exposes: [
            e.current(),
            e.power(),
            e.power_reactive(),
            e.energy(),
            e.numeric('reactive_energy', ea.STATE).withUnit('kVArh').withDescription('Reactive energy for all phase'),
            e.numeric('voltage_l1', ea.STATE).withUnit('V').withDescription('Phase 1 voltage'),
            e.numeric('voltage_l2', ea.STATE).withUnit('V').withDescription('Phase 2 voltage'),
            e.numeric('voltage_l3', ea.STATE).withUnit('V').withDescription('Phase 3 voltage'),
            e.numeric('current_l1', ea.STATE).withUnit('A').withDescription('Phase 1 current'),
            e.numeric('current_l2', ea.STATE).withUnit('A').withDescription('Phase 2 current'),
            e.numeric('current_l3', ea.STATE).withUnit('A').withDescription('Phase 3 current'),
            e.numeric('energy_l1', ea.STATE).withUnit('kWh').withDescription('Phase 1 energy'),
            e.numeric('energy_l2', ea.STATE).withUnit('kWh').withDescription('Phase 2 energy'),
            e.numeric('energy_l3', ea.STATE).withUnit('kWh').withDescription('Phase 3 energy'),
            e.numeric('reactive_energy_l1', ea.STATE).withUnit('kVArh').withDescription('Phase 1 reactive energy'),
            e.numeric('reactive_energy_l2', ea.STATE).withUnit('kVArh').withDescription('Phase 2 reactive energy'),
            e.numeric('reactive_energy_l3', ea.STATE).withUnit('kVArh').withDescription('Phase 3 reactive energy'),
            e.numeric('power_l1', ea.STATE).withUnit('W').withDescription('Phase 1 power'),
            e.numeric('power_l2', ea.STATE).withUnit('W').withDescription('Phase 2 power'),
            e.numeric('power_l3', ea.STATE).withUnit('W').withDescription('Phase 3 power'),
            e.numeric('reactive_power_l1', ea.STATE).withUnit('VAr').withDescription('Phase 1 reactive power'),
            e.numeric('reactive_power_l2', ea.STATE).withUnit('VAr').withDescription('Phase 2 reactive power'),
            e.numeric('reactive_power_l3', ea.STATE).withUnit('VAr').withDescription('Phase 3 reactive power'),
            e.numeric('power_factor_l1', ea.STATE).withUnit('%').withDescription('Phase 1 power factor'),
            e.numeric('power_factor_l2', ea.STATE).withUnit('%').withDescription('Phase 2 power factor'),
            e.numeric('power_factor_l3', ea.STATE).withUnit('%').withDescription('Phase 3 power factor'),
            e.enum('clear_metering', ea.SET, ['clear']).withDescription('Clear measurement data'),
        ],
    },
    {
        zigbeeModel: ['PCT504', 'PCT504-E'],
        model: 'PCT504',
        vendor: 'OWON',
        description: 'HVAC fan coil',
        fromZigbee: [fz.fan, fz.thermostat, fz.humidity, fz.occupancy, legacy.fz.hvac_user_interface],
        toZigbee: [
            tz.fan_mode,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_unoccupied_cooling_setpoint,
            tz.thermostat_min_heat_setpoint_limit,
            tz.thermostat_max_heat_setpoint_limit,
            tz.thermostat_min_cool_setpoint_limit,
            tz.thermostat_max_cool_setpoint_limit,
            tz.thermostat_local_temperature,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode,
            tz.thermostat_running_mode,
            tz.thermostat_running_state,
            tz.thermostat_programming_operation_mode,
        ],
        exposes: [
            e.humidity(),
            e.occupancy(),
            e
                .climate()
                .withSystemMode(['off', 'heat', 'cool', 'fan_only', 'sleep'])
                .withLocalTemperature()
                .withRunningMode(['off', 'heat', 'cool'])
                .withRunningState(['idle', 'heat', 'cool', 'fan_only'])
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
                .withSetpoint('unoccupied_heating_setpoint', 5, 30, 0.5)
                .withSetpoint('occupied_cooling_setpoint', 7, 35, 0.5)
                .withSetpoint('unoccupied_cooling_setpoint', 7, 35, 0.5),
            e.fan().withModes(['low', 'medium', 'high', 'on', 'auto']),
            e.programming_operation_mode(['setpoint', 'eco']),
            e.keypad_lockout(),
            e.max_heat_setpoint_limit(5, 30, 0.5),
            e.min_heat_setpoint_limit(5, 30, 0.5),
            e.max_cool_setpoint_limit(7, 35, 0.5),
            e.min_cool_setpoint_limit(7, 35, 0.5),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic',
                'genIdentify',
                'genGroups',
                'hvacThermostat',
                'hvacUserInterfaceCfg',
                'hvacFanCtrl',
                'msTemperatureMeasurement',
                'msOccupancySensing',
            ];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.fanMode(endpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ['hvacThermostat']);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatOccupiedCoolingSetpoint(endpoint);
            await reporting.thermostatTemperature(endpoint, {min: 60, max: 600, change: 0.1});
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatRunningMode(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.humidity(endpoint, {min: 60, max: 600, change: 1});
            await reporting.thermostatKeypadLockMode(endpoint);

            await endpoint.read('hvacThermostat', [
                'systemMode',
                'runningMode',
                'runningState',
                'occupiedHeatingSetpoint',
                'unoccupiedHeatingSetpoint',
                'occupiedCoolingSetpoint',
                'unoccupiedCoolingSetpoint',
                'localTemp',
            ]);
            await endpoint.read('msRelativeHumidity', ['measuredValue']);

            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msOccupancySensing']);
            await reporting.occupancy(endpoint2, {min: 1, max: 600, change: 1});
            await endpoint2.read('msOccupancySensing', ['occupancy']);
        },
    },
    {
        zigbeeModel: ['PIR323-PTH'],
        model: 'PIR323-PTH',
        vendor: 'OWON',
        description: 'Multi-sensor',
        fromZigbee: [fz.battery, fz.ignore_basic_report, fz.ias_occupancy_alarm_1, fz.temperature, fz.humidity, fz.occupancy_timeout],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.temperature(), e.humidity()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'msRelativeHumidity']);
            device.powerSource = 'Battery';
            device.save();
        },
    },
    {
        zigbeeModel: ['SLC603'],
        model: 'SLC603',
        vendor: 'OWON',
        description: 'Zigbee remote dimmer',
        fromZigbee: [fz.battery, fz.command_toggle, fz.command_step, fz.command_step_color_temperature],
        toZigbee: [],
        exposes: [
            e.battery(),
            e.battery_low(),
            e.action(['toggle', 'brightness_step_up', 'brightness_step_down', 'color_temperature_step_up', 'color_temperature_step_down']),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
            device.powerSource = 'Battery';
            device.save();
        },
    },
    {
        zigbeeModel: ['PIR313-P'],
        model: 'PIR313-P',
        vendor: 'OWON',
        description: 'Motion sensor',
        extend: [battery(), iasZoneAlarm({zoneType: 'occupancy', zoneAttributes: ['alarm_1', 'battery_low', 'tamper']})],
    },
    {
        zigbeeModel: ['DWS312'],
        model: 'DWS312',
        vendor: 'OWON',
        description: 'Door/window sensor',
        extend: [battery(), iasZoneAlarm({zoneType: 'contact', zoneAttributes: ['alarm_1', 'battery_low', 'tamper']})],
    },
    {
        zigbeeModel: ['SPM915'],
        model: 'SPM915',
        vendor: 'OWON',
        description: 'Sleeping pad monitor',
        extend: [battery(), iasZoneAlarm({zoneType: 'contact', zoneAttributes: ['alarm_1', 'battery_low', 'tamper']})],
    },
];

export default definitions;
module.exports = definitions;
