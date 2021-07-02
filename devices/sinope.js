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
        vendor: 'Sinope',
        description: 'Zigbee line volt thermostat',
        fromZigbee: [fz.legacy.sinope_thermostat_att_report, fz.legacy.hvac_user_interface, fz.electrical_measurement, fz.metering,
            fz.ignore_temperature_report, fz.legacy.sinope_thermostat_state],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.sinope_thermostat_occupancy, tz.sinope_thermostat_backlight_autodim_param, tz.sinope_thermostat_time,
            tz.sinope_thermostat_enable_outdoor_temperature, tz.sinope_thermostat_outdoor_temperature, tz.sinope_time_format],
        exposes: [e.local_temperature(), e.keypad_lockout(), e.power(), e.current(), e.voltage(), e.energy(),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']),
            exposes.enum('backlight_auto_dim', ea.SET, ['on demand', 'sensing']).withDescription('Control backlight dimming behavior')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msTemperatureMeasurement',
                'haElectricalMeasurement', 'seMetering', 'manuSpecificSinope'];

            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint, {min: 10, max: 300, change: 20});
            await reporting.thermostatPIHeatingDemand(endpoint, {min: 10, max: 301, change: 5});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 1, max: 302, change: 50});
            await reporting.thermostatSystemMode(endpoint, {min: 1, max: 0});

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
            await endpoint.configureReporting('msTemperatureMeasurement', [{
                attribute: 'tolerance', minimumReportInterval: 1, maximumReportInterval: 0xFFFF, reportableChange: 1}]);
        },
    },
    {
        zigbeeModel: ['TH1124ZB'],
        model: 'TH1124ZB',
        vendor: 'Sinope',
        description: 'Zigbee line volt thermostat',
        fromZigbee: [fz.legacy.thermostat_att_report, fz.legacy.hvac_user_interface, fz.electrical_measurement, fz.metering,
            fz.ignore_temperature_report, fz.legacy.sinope_thermostat_state],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.sinope_thermostat_occupancy, tz.sinope_thermostat_backlight_autodim_param, tz.sinope_thermostat_time,
            tz.sinope_thermostat_enable_outdoor_temperature, tz.sinope_thermostat_outdoor_temperature, tz.sinope_time_format],
        exposes: [e.local_temperature(), e.keypad_lockout(), e.power(), e.current(), e.voltage(), e.energy(),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withPiHeatingDemand(),
            exposes.enum('backlight_auto_dim', ea.SET, ['on demand', 'sensing']).withDescription('Control backlight dimming behavior')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msTemperatureMeasurement',
                'haElectricalMeasurement', 'seMetering', 'manuSpecificSinope'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint, {min: 10, max: 300, change: 20});
            await reporting.thermostatPIHeatingDemand(endpoint, {min: 10, max: 301, change: 5});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 1, max: 302, change: 50});

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

            try {
                await reporting.thermostatKeypadLockMode(endpoint, {min: 1, max: 0});
            } catch (error) {
                // Not all support this: https://github.com/Koenkk/zigbee2mqtt/issues/3760
            }

            // Disable default reporting
            await reporting.temperature(endpoint, {min: 1, max: 0xFFFF});
            await endpoint.configureReporting('msTemperatureMeasurement', [{
                attribute: 'tolerance', minimumReportInterval: 1, maximumReportInterval: 0xFFFF, reportableChange: 1}]);
        },
    },
    {
        zigbeeModel: ['TH1300ZB'],
        model: 'TH1300ZB',
        vendor: 'Sinope',
        description: 'Zigbee smart floor heating thermostat',
        fromZigbee: [fz.legacy.thermostat_att_report, fz.legacy.hvac_user_interface, fz.ignore_temperature_report,
            fz.legacy.sinope_thermostat_state, fz.sinope_TH1300ZB_specific],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.sinope_thermostat_occupancy, tz.sinope_thermostat_backlight_autodim_param, tz.sinope_thermostat_time,
            tz.sinope_thermostat_enable_outdoor_temperature, tz.sinope_thermostat_outdoor_temperature, tz.sinope_floor_control_mode,
            tz.sinope_ambiant_max_heat_setpoint, tz.sinope_floor_min_heat_setpoint, tz.sinope_floor_max_heat_setpoint,
            tz.sinope_temperature_sensor, tz.sinope_time_format],
        exposes: [e.local_temperature(), e.keypad_lockout(),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 0.5).withLocalTemperature()
                .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withPiHeatingDemand(),
            exposes.enum('backlight_auto_dim', ea.SET, ['on demand', 'sensing']).withDescription('Control backlight dimming behavior')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg',
                'msTemperatureMeasurement', 'manuSpecificSinope'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint, {min: 10, max: 300, change: 20});
            await reporting.thermostatPIHeatingDemand(endpoint, {min: 10, max: 301, change: 5});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 1, max: 302, change: 50});

            try {
                await reporting.thermostatRunningState(endpoint);
            } catch (error) {/* Not all support this */}

            try {
                await reporting.thermostatKeypadLockMode(endpoint, {min: 1, max: 0});
            } catch (error) {
                // Not all support this: https://github.com/Koenkk/zigbee2mqtt/issues/3760
            }

            await endpoint.configureReporting('manuSpecificSinope', [{attribute: 'GFCiStatus', minimumReportInterval: 1,
                maximumReportInterval: constants.repInterval.HOUR, reportableChange: 1}]);
            await endpoint.configureReporting('manuSpecificSinope', [{attribute: 'floorLimitStatus',
                minimumReportInterval: 1, maximumReportInterval: constants.repInterval.HOUR, reportableChange: 1}]);
            await reporting.temperature(endpoint, {min: 1, max: 0xFFFF}); // disable reporting
        },
    },
    {
        zigbeeModel: ['TH1400ZB'],
        model: 'TH1400ZB',
        vendor: 'Sinope',
        description: 'Zigbee low volt thermostat',
        fromZigbee: [fz.legacy.sinope_thermostat_att_report],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.sinope_thermostat_backlight_autodim_param, tz.sinope_thermostat_time, tz.sinope_thermostat_enable_outdoor_temperature,
            tz.sinope_thermostat_outdoor_temperature],
        exposes: [exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 1).withLocalTemperature()
            .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']), exposes.enum('backlight_auto_dim',
            ea.SET, ['on demand', 'sensing']).withDescription('Control backlight dimming behavior')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msTemperatureMeasurement'];
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
        zigbeeModel: ['TH1500ZB'],
        model: 'TH1500ZB',
        vendor: 'Sinope',
        description: 'Zigbee dual pole line volt thermostat',
        fromZigbee: [fz.legacy.thermostat_att_report],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.sinope_thermostat_occupancy, tz.sinope_thermostat_backlight_autodim_param, tz.sinope_thermostat_time,
            tz.sinope_thermostat_enable_outdoor_temperature, tz.sinope_thermostat_outdoor_temperature],
        exposes: [exposes.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 1).withLocalTemperature()
            .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat']).withPiHeatingDemand(), exposes.enum(
            'backlight_auto_dim', ea.SET, ['on demand', 'sensing']).withDescription('Control backlight dimming behavior')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msTemperatureMeasurement'];
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
        vendor: 'Sinope',
        description: 'Zigbee smart light switch',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['SP2600ZB'],
        model: 'SP2600ZB',
        vendor: 'Sinope',
        description: 'Zigbee smart plug',
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
        zigbeeModel: ['DM2500ZB'],
        model: 'DM2500ZB',
        vendor: 'Sinope',
        description: 'Zigbee smart dimmer',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ['RM3250ZB'],
        model: 'RM3250ZB',
        vendor: 'Sinope',
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
        vendor: 'Sinope',
        description: 'Zigbee smart water leak detector',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['WL4200S'],
        model: 'WL4200S',
        vendor: 'Sinope',
        description: 'Zigbee smart water leak detector',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
    },
];
