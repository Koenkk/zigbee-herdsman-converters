const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const globalStore = require('../lib/store');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

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
        zigbeeModel: ['3400-D', '3400'],
        model: '3400-D',
        vendor: 'Centralite',
        description: '3-Series security keypad',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.command_arm_with_transaction, fz.temperature, fz.battery, fz.ias_ace_occupancy_with_timeout],
        exposes: [e.battery(), e.temperature(), e.occupancy(), e.action([
            'disarm', 'arm_day_zones', 'arm_night_zones', 'arm_all_zones', 'exit_delay', 'emergency'])],
        toZigbee: [tz.arm_mode],
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
        toZigbee: [tz.factory_reset, tz.thermostat_local_temperature, tz.thermostat_local_temperature_calibration, tz.thermostat_occupancy,
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_occupied_cooling_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_unoccupied_cooling_setpoint, tz.thermostat_setpoint_raise_lower, tz.thermostat_remote_sensing,
            tz.thermostat_control_sequence_of_operation, tz.thermostat_system_mode, tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule, tz.thermostat_relay_status_log, tz.fan_mode, tz.thermostat_running_state],
        exposes: [e.battery(), exposes.climate().withSetpoint('occupied_heating_setpoint', 10, 30, 1).withLocalTemperature()
            .withSystemMode(['off', 'heat', 'cool']).withRunningState(['idle', 'heat', 'cool']).withFanMode(['auto', 'on'])
            .withSetpoint('occupied_cooling_setpoint', 10, 30, 1).withLocalTemperatureCalibration().withPiHeatingDemand()],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
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
];
