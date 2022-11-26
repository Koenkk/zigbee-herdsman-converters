const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const constants = require('../lib/constants');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['TH1123ZB'],
        model: 'TH1123ZB',
        vendor: 'Sinopé',
        description: 'Zigbee line volt thermostat',
        meta: {thermostat: {dontMapPIHeatingDemand: true}},
        fromZigbee: [
            fz.legacy.sinope_thermostat_att_report, fz.legacy.hvac_user_interface, fz.electrical_measurement, fz.metering,
            fz.ignore_temperature_report, fz.legacy.sinope_thermostat_state, fz.sinope_thermostat],
        toZigbee: [
            tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.sinope_thermostat_occupancy, tz.sinope_thermostat_backlight_autodim_param, tz.sinope_thermostat_time,
            tz.sinope_thermostat_enable_outdoor_temperature, tz.sinope_thermostat_outdoor_temperature, tz.sinope_time_format],
        exposes: [
            exposes.climate()
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
                .withSetpoint('unoccupied_heating_setpoint', 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(['off', 'heat']).withRunningState(['idle', 'heat'])
                .withPiHeatingDemand(),
            exposes.enum('thermostat_occupancy', ea.SET, ['unoccupied', 'occupied'])
                .withDescription('Occupancy state of the thermostat'),
            exposes.enum('backlight_auto_dim', ea.ALL, ['on demand', 'sensing'])
                .withDescription('Control backlight dimming behavior'),
            e.keypad_lockout(), e.energy(), e.power(), e.current(), e.voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg',
                'msTemperatureMeasurement', 'haElectricalMeasurement', 'seMetering',
                'manuSpecificSinope'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);

            try {
                await reporting.thermostatSystemMode(endpoint);
            } catch (error) {/* Not all support this */}

            try {
                await reporting.thermostatRunningState(endpoint);
            } catch (error) {/* Not all support this */}

            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 10, max: 303, change: [1, 1]});
            try {
                await reporting.instantaneousDemand(endpoint, {min: 10, max: 304, change: 1});
            } catch (error) {/* Do nothing*/}

            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            try {
                await reporting.activePower(endpoint, {min: 10, max: 305, change: 1});
            } catch (error) {/* Do nothing*/}
            try {
                await reporting.rmsCurrent(endpoint, {min: 10, max: 306, change: 100}); // divider 1000: 0.1Arms
            } catch (error) {/* Do nothing*/}
            try {
                await reporting.rmsVoltage(endpoint, {min: 10, max: 307, change: 5}); // divider 10: 0.5Vrms
            } catch (error) {/* Do nothing*/}

            // Disable default reporting
            await reporting.temperature(endpoint, {min: 1, max: 0xFFFF});
            await endpoint.configureReporting('msTemperatureMeasurement', [
                {attribute: 'tolerance', minimumReportInterval: 1, maximumReportInterval: 0xFFFF, reportableChange: 1}]);
        },
    },
    {
        zigbeeModel: ['TH1124ZB'],
        model: 'TH1124ZB',
        vendor: 'Sinopé',
        description: 'Zigbee line volt thermostat',
        meta: {thermostat: {dontMapPIHeatingDemand: true}},
        fromZigbee: [
            fz.legacy.sinope_thermostat_att_report, fz.legacy.hvac_user_interface, fz.electrical_measurement, fz.metering,
            fz.ignore_temperature_report, fz.legacy.sinope_thermostat_state, fz.sinope_thermostat],
        toZigbee: [
            tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.sinope_thermostat_occupancy, tz.sinope_thermostat_backlight_autodim_param, tz.sinope_thermostat_time,
            tz.sinope_thermostat_enable_outdoor_temperature, tz.sinope_thermostat_outdoor_temperature, tz.sinope_time_format],
        exposes: [
            exposes.climate()
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
                .withSetpoint('unoccupied_heating_setpoint', 5, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(['off', 'heat']).withRunningState(['idle', 'heat'])
                .withPiHeatingDemand(),
            exposes.enum('thermostat_occupancy', ea.SET, ['unoccupied', 'occupied'])
                .withDescription('Occupancy state of the thermostat'),
            exposes.enum('backlight_auto_dim', ea.ALL, ['on demand', 'sensing'])
                .withDescription('Control backlight dimming behavior'),
            e.keypad_lockout(), e.energy(), e.power(), e.current(), e.voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg',
                'msTemperatureMeasurement', 'haElectricalMeasurement', 'seMetering',
                'manuSpecificSinope'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);

            try {
                await reporting.thermostatRunningState(endpoint);
            } catch (error) {/* Not all support this */}

            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 10, max: 303, change: [1, 1]});
            try {
                await reporting.instantaneousDemand(endpoint, {min: 10, max: 304, change: 1});
            } catch (error) {/* Do nothing*/}

            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 10, max: 303, change: [1, 1]});
            try {
                await reporting.instantaneousDemand(endpoint, {min: 10, max: 304, change: 1});
            } catch (error) {/* Do nothing*/}

            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            try {
                await reporting.activePower(endpoint, {min: 10, max: 305, change: 1});
            } catch (error) {/* Do nothing*/}
            try {
                await reporting.rmsCurrent(endpoint, {min: 10, max: 306, change: 100}); // divider 1000: 0.1Arms
            } catch (error) {/* Do nothing*/}
            try {
                await reporting.rmsVoltage(endpoint, {min: 10, max: 307, change: 5}); // divider 10: 0.5Vrms
            } catch (error) {/* Do nothing*/}

            // Disable default reporting
            await reporting.temperature(endpoint, {min: 1, max: 0xFFFF});
            await endpoint.configureReporting('msTemperatureMeasurement', [
                {attribute: 'tolerance', minimumReportInterval: 1, maximumReportInterval: 0xFFFF, reportableChange: 1}]);
        },
    },
    {
        zigbeeModel: ['TH1300ZB'],
        model: 'TH1300ZB',
        vendor: 'Sinopé',
        description: 'Zigbee smart floor heating thermostat',
        meta: {thermostat: {dontMapPIHeatingDemand: true}},
        fromZigbee: [
            fz.legacy.sinope_thermostat_att_report, fz.legacy.hvac_user_interface, fz.electrical_measurement,
            fz.ignore_temperature_report, fz.legacy.sinope_thermostat_state, fz.sinope_TH1300ZB_specific],
        toZigbee: [
            tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.sinope_thermostat_occupancy, tz.sinope_thermostat_backlight_autodim_param, tz.sinope_thermostat_time,
            tz.sinope_thermostat_enable_outdoor_temperature, tz.sinope_thermostat_outdoor_temperature, tz.sinope_floor_control_mode,
            tz.sinope_ambiant_max_heat_setpoint, tz.sinope_floor_min_heat_setpoint, tz.sinope_floor_max_heat_setpoint,
            tz.sinope_temperature_sensor, tz.sinope_time_format],
        exposes: [
            exposes.climate()
                .withSetpoint('occupied_heating_setpoint', 7, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat'])
                .withRunningState(['idle', 'heat'])
                .withPiHeatingDemand(),
            exposes.enum('backlight_auto_dim', ea.ALL, ['on demand', 'sensing'])
                .withDescription('Control backlight dimming behavior'),
            e.keypad_lockout(), e.power(), e.current(), e.voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg',
                'haElectricalMeasurement', 'msTemperatureMeasurement', 'manuSpecificSinope'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);

            try {
                await reporting.thermostatRunningState(endpoint);
            } catch (error) {/* Not all support this */}

            try {
                await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
                await reporting.activePower(endpoint, {min: 10, max: 305, change: 1}); // divider 1: 1W
            } catch (error) {
                endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {'acPowerMultiplier': 1, 'acPowerDivisor': 1});
            }
            try {
                await endpoint.read('haElectricalMeasurement', ['acCurrentMultiplier', 'acCurrentDivisor']);
                await reporting.rmsCurrent(endpoint, {min: 10, max: 306, change: 100}); // divider 1000: 0.1Arms
            } catch (error) {/* Do nothing*/}
            try {
                await endpoint.read('haElectricalMeasurement', ['acVoltageMultiplier', 'acVoltageDivisor']);
                await reporting.rmsVoltage(endpoint, {min: 10, max: 307, change: 5}); // divider 10: 0.5Vrms
            } catch (error) {/* Do nothing*/}

            try {
                await reporting.thermostatKeypadLockMode(endpoint);
            } catch (error) {
                // Not all support this: https://github.com/Koenkk/zigbee2mqtt/issues/3760
            }

            await endpoint.configureReporting('manuSpecificSinope', [{attribute: 'GFCiStatus', minimumReportInterval: 1,
                maximumReportInterval: constants.repInterval.HOUR, reportableChange: 1}]);
            await endpoint.configureReporting('manuSpecificSinope', [{attribute: 'floorLimitStatus', minimumReportInterval: 1,
                maximumReportInterval: constants.repInterval.HOUR, reportableChange: 1}]);
            await reporting.temperature(endpoint, {min: 1, max: 0xFFFF}); // disable reporting
        },
    },
    {
        zigbeeModel: ['TH1400ZB'],
        model: 'TH1400ZB',
        vendor: 'Sinopé',
        description: 'Zigbee low volt thermostat',
        meta: {thermostat: {dontMapPIHeatingDemand: true}},
        fromZigbee: [fz.legacy.sinope_thermostat_att_report, fz.legacy.sinope_thermostat_state, fz.legacy.hvac_user_interface, fz.metering,
            fz.ignore_temperature_report, fz.sinope_thermostat, fz.sinope_TH1400ZB_specific],

        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state, tz.sinope_thermostat_backlight_autodim_param,
            tz.sinope_thermostat_time, tz.sinope_thermostat_enable_outdoor_temperature, tz.sinope_thermostat_outdoor_temperature, 
            tz.sinope_floor_control_mode, tz.sinope_ambiant_max_heat_setpoint, tz.sinope_floor_min_heat_setpoint, tz.sinope_floor_max_heat_setpoint,
            tz.sinope_temperature_sensor, tz.sinope_time_format, tz.thermostat_min_heat_setpoint_limit, tz.thermostat_max_heat_setpoint_limit,
            tz.sinope_connected_load, tz.sinope_aux_connected_load, tz.sinope_thermostat_main_cycle_output, tz.sinope_thermostat_aux_cycle_output,
            tz.sinope_pump_protection],
            
        exposes: [
            exposes.climate()
                .withSetpoint('occupied_heating_setpoint', 5, 36, 1)
                .withLocalTemperature()
                .withSystemMode(['off', 'heat'])
                .withRunningState(['idle', 'heat'])
                .withPiHeatingDemand(),
            exposes.binary('enable_outdoor_temperature', ea.ALL, 'on', 'off')
                .withDescription('Showing outdoor temperature on secondary display'),
            exposes.enum('temperature_display_mode', ea.ALL, ['celsius', 'fahrenheit'])
                .withDescription('The temperature format displayed on the thermostat screen'),
            exposes.enum('time_format', ea.ALL, ['24h', '12h'])
                .withDescription('The time format featured on the thermostat display'),
            exposes.enum('backlight_auto_dim', ea.ALL, ['on_demand', 'sensing'])
                .withDescription('The display backlight behavior'),
            exposes.enum('keypad_lockout', ea.ALL, ['unlock', 'lock1'])
                .withDescription('Enables or disables the device’s buttons'),
            exposes.presets.max_heat_setpoint_limit(5, 36, 0.5),
            exposes.presets.min_heat_setpoint_limit(5, 36, 0.5),
            exposes.numeric('connected_load', ea.ALL)
                .withUnit('W')
                .withValueMin(1)
                .withValueMax(20000)
                .withDescription('The power in watts of the electrical load connected to the device'),
            exposes.enum('floor_control_mode', ea.ALL, ['ambiant', 'floor'])
                .withDescription('Control mode using floor or ambient temperature'),
            exposes.numeric('floor_max_heat_setpoint', ea.ALL)
                .withUnit('°C')
                .withValueMin(7)
                .withValueMax(36)
                .withValueStep(0.5)
                .withPreset('off', 'off', 'Use minimum permitted value')
                .withDescription('The maximum floor temperature limit of the floor when in ambient control mode'),
            exposes.numeric('floor_min_heat_setpoint', ea.ALL)
                .withUnit('°C')
                .withValueMin(5)
                .withValueMax(34)
                .withValueStep(0.5)
                .withPreset('off', 'off', 'Use minimum permitted value')
                .withDescription('The minimum floor temperature limit of the floor when in ambient control mode'),
            exposes.numeric('ambiant_max_heat_setpoint', ea.ALL)
                .withUnit('°C')
                .withValueMin(5)
                .withValueMax(36)
                .withValueStep(0.5)
                .withPreset('off', 'off', 'Use minimum permitted value')
                .withDescription('The maximum ambient temperature limit when in floor control mode'),
            exposes.enum('floor_temperature_sensor', ea.ALL, ['10k', '12k'])
                .withDescription('The floor sensor'),
            exposes.enum('main_cycle_output', ea.ALL, ['15 sec', '5 min', '10 min', '15 min', '20 min', '30 min'])
                .withDescription('The length of the control cycle according to the type of load connected to the thermostats'),
            exposes.enum('aux_cycle_output', ea.ALL, ['off', '15 sec', '5 min', '10 min', '15 min', '20 min', '30 min'])
                .withDescription('The length of the control cycle according to the type of auxiliary load connected to the thermostats'),
            exposes.binary('pump_protection', ea.ALL, 'on', 'off')
                .withDescription('This function prevents the seizure of the pump'),
            exposes.numeric('aux_connected_load', ea.ALL)
                .withUnit('W')
                .withValueMin(0)
                .withValueMax(20000)
                .withDescription('The power in watts of the heater connected to the auxiliary output of the thermostat'),
        ],

        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genIdentify', 'genGroups', 'hvacThermostat',
                'hvacUserInterfaceCfg', 'msTemperatureMeasurement', 'manuSpecificSinope'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatSystemMode(endpoint);

            await endpoint.read('hvacThermostat', ['occupiedHeatingSetpoint', 'localTemp', 'systemMode', 'pIHeatingDemand', 'SinopeBacklight',
                'maxHeatSetpointLimit', 'minHeatSetpointLimit', 'SinopeMainCycleOutput', 'SinopeAuxCycleOutput']);
            await endpoint.read('hvacUserInterfaceCfg', ['keypadLockout', 'tempDisplayMode']);
            await endpoint.read('manuSpecificSinope', ['timeFormatToDisplay', 'connectedLoad', 'auxConnectedLoad', 'floorControlMode',
                'floorMinHeatSetpointLimit', 'floorMaxHeatSetpointLimit', 'ambiantMaxHeatSetpointLimit', 'outdoorTempToDisplayTimeout',
                'temperatureSensor', 'pumpProtection']);

            await reporting.temperature(endpoint, {min: 1, max: 0xFFFF}); // disable reporting
        },
    },
    {
        zigbeeModel: ['TH1500ZB'],
        model: 'TH1500ZB',
        vendor: 'Sinopé',
        description: 'Zigbee dual pole line volt thermostat',
        fromZigbee: [
            fz.legacy.thermostat_att_report],
        toZigbee: [
            tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.sinope_thermostat_occupancy, tz.sinope_thermostat_backlight_autodim_param, tz.sinope_thermostat_time,
            tz.sinope_thermostat_enable_outdoor_temperature, tz.sinope_thermostat_outdoor_temperature],
        exposes: [
            exposes.climate()
                .withSetpoint('occupied_heating_setpoint', 7, 30, 1)
                .withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat'])
                .withRunningState(['idle', 'heat'])
                .withPiHeatingDemand(),
            exposes.enum('backlight_auto_dim', ea.ALL, ['on demand', 'sensing'])
                .withDescription('Control backlight dimming behavior')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genIdentify', 'genGroups',
                'hvacThermostat', 'hvacUserInterfaceCfg', 'msTemperatureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);

            try {
                await reporting.thermostatRunningState(endpoint);
            } catch (error) {/* Do nothing*/}
        },
    },
    {
        zigbeeModel: ['SW2500ZB'],
        model: 'SW2500ZB',
        vendor: 'Sinopé',
        description: 'Zigbee smart light switch',
        exposes: [e.switch(),
            exposes.numeric('led_intensity_on', ea.SET).withValueMin(0).withValueMax(100)
                .withDescription('Control status LED intensity when load ON'),
            exposes.numeric('led_intensity_off', ea.SET).withValueMin(0).withValueMax(100)
                .withDescription('Control status LED intensity when load OFF'),
            exposes.composite('led_color_on', 'led_color_on')
                .withFeature(exposes.numeric('r', ea.ALL))
                .withFeature(exposes.numeric('g', ea.ALL))
                .withFeature(exposes.numeric('b', ea.ALL))
                .withDescription('Control status LED color when load ON'),
            exposes.composite('led_color_off', 'led_color_off')
                .withFeature(exposes.numeric('r', ea.ALL))
                .withFeature(exposes.numeric('g', ea.ALL))
                .withFeature(exposes.numeric('b', ea.ALL))
                .withDescription('Control status LED color when load OFF'),
        ],
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off, tz.sinope_led_intensity_on, tz.sinope_led_intensity_off, tz.sinope_led_color_on, tz.sinope_led_color_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['DM2500ZB'],
        model: 'DM2500ZB',
        vendor: 'Sinopé',
        description: 'Zigbee smart dimmer',
        exposes: [e.light_brightness(),
            exposes.numeric('led_intensity_on', ea.SET).withValueMin(0).withValueMax(100)
                .withDescription('Control status LED when load ON'),
            exposes.numeric('led_intensity_off', ea.SET).withValueMin(0).withValueMax(100)
                .withDescription('Control status LED when load OFF'),
            exposes.numeric('minimum_brightness', ea.SET).withValueMin(0).withValueMax(3000)
                .withDescription('Control minimum dimmer brightness'),
            exposes.composite('led_color_on', 'led_color_on')
                .withFeature(exposes.numeric('r', ea.ALL))
                .withFeature(exposes.numeric('g', ea.ALL))
                .withFeature(exposes.numeric('b', ea.ALL))
                .withDescription('Control status LED color when load ON'),
            exposes.composite('led_color_off', 'led_color_off')
                .withFeature(exposes.numeric('r', ea.ALL))
                .withFeature(exposes.numeric('g', ea.ALL))
                .withFeature(exposes.numeric('b', ea.ALL))
                .withDescription('Control status LED color when load OFF'),
        ],
        fromZigbee: [fz.on_off, fz.brightness, fz.electrical_measurement],
        toZigbee: [tz.light_onoff_brightness, tz.sinope_led_intensity_on, tz.sinope_led_intensity_off,
            tz.sinope_minimum_brightness, tz.sinope_led_color_on, tz.sinope_led_color_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ['SP2600ZB'],
        model: 'SP2600ZB',
        vendor: 'Sinopé',
        description: 'Zigbee smart plug',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.ac_frequency(), e.energy()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genIdentify', 'genOnOff', 'haElectricalMeasurement', 'seMetering'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint, {readFrequencyAttrs: true});
            await reporting.onOff(endpoint);
            await reporting.activePower(endpoint, {min: 10, change: 1}); // divider 10 : 0.1W
            await reporting.rmsCurrent(endpoint, {min: 10, change: 10}); // divider 100: 0.1Arms
            await reporting.rmsVoltage(endpoint, {min: 10, change: 10}); // divider 100: 0.1Vrms
            await reporting.acFrequency(endpoint, {min: 10, change: 100}); // divider 100: 1Hz
            await endpoint.read('haElectricalMeasurement', ['acFrequency']); // get a first read
            await reporting.currentSummDelivered(endpoint, {min: 10, max: 307, change: [1, 1]});
        },
    },
    {
        zigbeeModel: ['SP2610ZB'],
        model: 'SP2610ZB',
        vendor: 'Sinopé',
        description: 'Zigbee smart outlet',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.onOff(endpoint);
            await reporting.activePower(endpoint, {min: 10, change: 1});
        },
    },
    {
        zigbeeModel: ['RM3250ZB'],
        model: 'RM3250ZB',
        vendor: 'Sinopé',
        description: '50A Smart electrical load controller',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy()],
    },
    {
        zigbeeModel: ['WL4200'],
        model: 'WL4200',
        vendor: 'Sinopé',
        description: 'Zigbee smart water leak detector',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'msTemperatureMeasurement']);
            await reporting.temperature(endpoint, {min: 600, max: constants.repInterval.MAX, change: 100});
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryAlarmState(endpoint);
        },
        exposes: [e.water_leak(), e.battery_low(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['WL4200S'],
        model: 'WL4200S',
        vendor: 'Sinopé',
        description: 'Zigbee smart water leak detector with external sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'msTemperatureMeasurement']);
            await reporting.temperature(endpoint, {min: 600, max: constants.repInterval.MAX, change: 100});
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryAlarmState(endpoint);
        },
        exposes: [e.water_leak(), e.battery_low(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['VA4200WZ'],
        model: 'VA4200WZ',
        vendor: 'Sinopé',
        description: 'Zigbee smart water valve (3/4")',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff, fz.battery],
        toZigbee: [tz.cover_via_brightness],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint); // valve position
        },
        exposes: [e.valve_switch(), e.valve_position(), e.battery_low(), e.battery()],
    },
    {
        zigbeeModel: ['VA4201WZ'],
        model: 'VA4201WZ',
        vendor: 'Sinopé',
        description: 'Zigbee smart water valve (1")',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff, fz.battery],
        toZigbee: [tz.cover_via_brightness],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint); // valve position
        },
        exposes: [e.valve_switch(), e.valve_position(), e.battery_low(), e.battery()],
    },
];
