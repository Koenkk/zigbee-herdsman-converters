const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const globalStore = require('../lib/store');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;
const constants = require('../lib/constants');

module.exports = [
    {
        zigbeeModel: ['4256251-RZHAC'],
        model: '4256251-RZHAC',
        vendor: 'Centralite',
        description: 'White Swiss power outlet switch with power meter',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.voltage(), e.current()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: ['4256050-ZHAC'],
        model: '4256050-ZHAC',
        vendor: 'Centralite',
        description: '3-Series smart dimming outlet',
        fromZigbee: [fz.restorable_brightness, fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.light_onoff_restorable_brightness],
        exposes: [e.light_brightness(), e.power(), e.voltage(), e.current()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            // 4256050-ZHAC doesn't support reading 'acVoltageMultiplier' or 'acVoltageDivisor'
            await endpoint.read('haElectricalMeasurement', ['acCurrentMultiplier', 'acCurrentDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.rmsVoltage(endpoint, {change: 2}); // Voltage reports in V
            await reporting.rmsCurrent(endpoint, {change: 10}); // Current reports in mA
            await reporting.activePower(endpoint, {change: 2}); // Power reports in 0.1W
        },
    },
    {
        zigbeeModel: ['4257050-ZHAC'],
        model: '4257050-ZHAC',
        vendor: 'Centralite',
        description: '3-Series smart dimming outlet',
        fromZigbee: [fz.restorable_brightness, fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.light_onoff_restorable_brightness],
        exposes: [e.light_brightness(), e.power(), e.voltage(), e.current()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            // 4257050-ZHAC doesn't support reading 'acVoltageMultiplier' or 'acVoltageDivisor'
            await endpoint.read('haElectricalMeasurement', ['acCurrentMultiplier', 'acCurrentDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.rmsVoltage(endpoint, {change: 2}); // Voltage reports in V
            await reporting.rmsCurrent(endpoint, {change: 10}); // Current reports in mA
            await reporting.activePower(endpoint, {change: 2}); // Power reports in 0.1W
        },
    },
    {
        zigbeeModel: ['4257050-RZHAC'],
        model: '4257050-RZHAC',
        vendor: 'Centralite',
        description: '3-Series smart outlet',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            try {
                await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            } catch (exception) {
                // For some this fails so set manually
                // https://github.com/Koenkk/zigbee2mqtt/issues/3575
                endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                    acCurrentDivisor: 10, acCurrentMultiplier: 1, powerMultiplier: 1, powerDivisor: 10});
            }
            await reporting.rmsVoltage(endpoint, {change: 2}); // Voltage reports in V
            await reporting.rmsCurrent(endpoint, {change: 10}); // Current reports in mA
            await reporting.activePower(endpoint, {change: 2}); // Power reports in 0.1W
        },
        exposes: [e.switch(), e.power(), e.current(), e.voltage()],
    },
    {
        zigbeeModel: ['3323-G'],
        model: '3323-G',
        vendor: 'Centralite',
        description: 'Micro-door sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.temperature(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature()],
    },
    {
        zigbeeModel: ['3328-G'],
        model: '3328-G',
        vendor: 'Centralite',
        description: '3-Series micro motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_2, fz.temperature],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await reporting.temperature(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.temperature()],
    },
    {
        zigbeeModel: ['3400-D', '3400'],
        model: '3400-D',
        vendor: 'Centralite',
        description: '3-Series security keypad',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.command_arm_with_transaction, fz.temperature, fz.battery, fz.ias_ace_occupancy_with_timeout],
        toZigbee: [tz.arm_mode],
        exposes: [e.battery(), e.temperature(), e.occupancy(),
            exposes.numeric('action_code', ea.STATE).withDescription('Pin code introduced.'),
            exposes.numeric('action_transaction', ea.STATE).withDescription('Last action transaction number.'),
            exposes.text('action_zone', ea.STATE).withDescription('Alarm zone. Default value 0'),
            e.action([
                'disarm', 'arm_day_zones', 'arm_night_zones', 'arm_all_zones', 'exit_delay', 'emergency'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const clusters = ['msTemperatureMeasurement', 'genPowerCfg', 'ssIasZone', 'ssIasAce'];
            await reporting.bind(endpoint, coordinatorEndpoint, clusters);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        onEvent: async (type, data, device) => {
            if (type === 'message' && data.type === 'commandGetPanelStatus' && data.cluster === 'ssIasAce' &&
                globalStore.hasValue(device.getEndpoint(1), 'panelStatus')) {
                const payload = {
                    panelstatus: globalStore.getValue(device.getEndpoint(1), 'panelStatus'),
                    secondsremain: 0x00, audiblenotif: 0x00, alarmstatus: 0x00,
                };
                await device.getEndpoint(1).commandResponse(
                    'ssIasAce', 'getPanelStatusRsp', payload, {}, data.meta.zclTransactionSequenceNumber,
                );
            }
        },
    },
    {
        zigbeeModel: ['3420'],
        model: '3420-G',
        vendor: 'Centralite',
        description: '3-Series night light repeater',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['3157100'],
        model: '3157100',
        vendor: 'Centralite',
        description: '3-Series pearl touch thermostat,',
        fromZigbee: [fz.battery, fz.legacy.thermostat_att_report, fz.fan, fz.ignore_time_read],
        toZigbee: [tz.factory_reset, tz.thermostat_local_temperature, tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_setpoint_raise_lower, tz.thermostat_remote_sensing,
            tz.thermostat_control_sequence_of_operation, tz.thermostat_system_mode,
            tz.thermostat_relay_status_log, tz.fan_mode, tz.thermostat_running_state],
        exposes: [e.battery(), exposes.climate().withSetpoint('occupied_heating_setpoint', 10, 30, 1).withLocalTemperature()
            .withSystemMode(['off', 'heat', 'cool', 'emergency_heating'])
            .withRunningState(['idle', 'heat', 'cool', 'fan_only']).withFanMode(['auto', 'on'])
            .withSetpoint('occupied_cooling_setpoint', 10, 30, 1)
            .withLocalTemperatureCalibration(-30, 30, 0.1)],
        meta: {battery: {voltageToPercentage: '3V_1500_2800'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'hvacThermostat', 'hvacFanCtrl']);
            await reporting.batteryVoltage(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.fanMode(endpoint);
        },
    },
    {
        zigbeeModel: ['3157100-E'],
        model: '3157100-E',
        vendor: 'Centralite',
        description: '3-Series pearl touch thermostat,',
        fromZigbee: [fz.battery, fz.thermostat, fz.fan, fz.ignore_time_read],
        toZigbee: [tz.factory_reset, tz.thermostat_local_temperature, tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_setpoint_raise_lower, tz.thermostat_remote_sensing,
            tz.thermostat_control_sequence_of_operation, tz.thermostat_system_mode,
            tz.thermostat_relay_status_log, tz.fan_mode, tz.thermostat_running_state, tz.thermostat_temperature_setpoint_hold],
        exposes: [e.battery(),
            exposes.binary('temperature_setpoint_hold', ea.ALL, true, false)
                .withDescription('Prevent changes. `false` = run normally. `true` = prevent from making changes.'),
            exposes.climate().withSetpoint('occupied_heating_setpoint', 10, 30, 1).withLocalTemperature()
                .withSystemMode(['off', 'heat', 'cool', 'emergency_heating'])
                .withRunningState(['idle', 'heat', 'cool', 'fan_only']).withFanMode(['auto', 'on'])
                .withSetpoint('occupied_cooling_setpoint', 10, 30, 1)
                .withLocalTemperatureCalibration(-30, 30, 0.1)],
        meta: {battery: {voltageToPercentage: '3V_1500_2800'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'hvacThermostat', 'hvacFanCtrl']);
            await reporting.batteryVoltage(endpoint);
            await reporting.thermostatRunningState(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.fanMode(endpoint);
            await reporting.thermostatTemperatureSetpointHold(endpoint);
        },
    },
    {
        zigbeeModel: ['4200-C'],
        model: '4200-C',
        vendor: 'Centralite',
        description: 'Smart outlet',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['3310-G'],
        model: '3310-G',
        vendor: 'Centralite',
        description: 'Temperature and humidity sensor',
        fromZigbee: [fz.temperature, fz._3310_humidity, fz.battery],
        exposes: [e.temperature(), e.humidity(), e.battery()],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['msTemperatureMeasurement', 'manuSpecificCentraliteHumidity', 'genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint);

            const payload = [{
                attribute: 'measuredValue',
                minimumReportInterval: 10,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 10,
            }];
            await endpoint.configureReporting('manuSpecificCentraliteHumidity', payload, {manufacturerCode: 0x104E});

            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['3200-fr'],
        model: '3200-fr',
        vendor: 'Centralite',
        description: 'Smart outlet',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.voltage(), e.current()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await endpoint.read('haElectricalMeasurement', ['acCurrentMultiplier', 'acCurrentDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.rmsVoltage(endpoint, {change: 2});
            await reporting.rmsCurrent(endpoint, {change: 10});
            await reporting.activePower(endpoint, {change: 2});
        },
    },
    {
        zigbeeModel: ['3200-de'],
        model: '3200-de',
        vendor: 'Centralite',
        description: 'Smart outlet',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.voltage(), e.current()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await endpoint.read('haElectricalMeasurement', ['acCurrentMultiplier', 'acCurrentDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.rmsVoltage(endpoint, {change: 2});
            await reporting.rmsCurrent(endpoint, {change: 10});
            await reporting.activePower(endpoint, {change: 2});
        },
    },
];
