const {identify, battery, ota} = require('zigbee-herdsman-converters/lib/modernExtend');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting  = require('zigbee-herdsman-converters/lib/reporting');
const constants  = require('zigbee-herdsman-converters/lib/constants');
const utils  = require('zigbee-herdsman-converters/lib/utils');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const {precisionRound, postfixWithEndpointName} = require('zigbee-herdsman-converters/lib/utils');
const e = exposes.presets;
const ea = exposes.access;

// We can only read and write after the device will post something. This particual device is sending messages one per minute.
// Also metadata from main object does not seems to be working at the time of implementing this device, so all values are defined here again.
const siemensTimeout = {timeout: 60000};

const siemensOperationModes = {
    0: '2-position, 1 K',
    1: '2-position, 0.3 K',
    2: 'TPI slow',
    3: 'TPI medium',
    4: 'TPI fast',
};


const siemensFromZigbee = {
    cluster: 'hvacThermostat',
    type: ['attributeReport', 'readResponse'],
    convert: (model, msg, publish, options, meta) => {
	var result = {};
        if (msg.data.hasOwnProperty('localTemperatureCalibration')) {
            result[postfixWithEndpointName('local_temperature_calibration', msg, model, meta)] =
                precisionRound(msg.data['localTemperatureCalibration'], 2) / 10;
        }
	if (msg.data.hasOwnProperty('localTemp')) {
            const value = precisionRound(msg.data['localTemp'], 2) / 100;
            if (value >= -273.15) {
                result[postfixWithEndpointName('local_temperature', msg, model, meta)] = value;
            }
        }
        if (msg.data.hasOwnProperty('occupiedHeatingSetpoint')) {
            const value = precisionRound(msg.data['occupiedHeatingSetpoint'], 2) / 100;
            // Stelpro will return -325.65 when set to off, value is not realistic anyway
            if (value >= -273.15) {
                result[postfixWithEndpointName('occupied_heating_setpoint', msg, model, meta)] = value;
            }
        }
        if (msg.data.hasOwnProperty('unoccupiedHeatingSetpoint')) {
            result[postfixWithEndpointName('unoccupied_heating_setpoint', msg, model, meta)] =
                precisionRound(msg.data['unoccupiedHeatingSetpoint'], 2) / 100;
        }
        if (msg.data.hasOwnProperty('systemMode')) {
            result[postfixWithEndpointName('system_mode', msg, model, meta)] = constants.thermostatSystemModes[msg.data['systemMode']];
        }
        if (msg.data.hasOwnProperty('ctrlSeqeOfOper')) {
            result[postfixWithEndpointName('control_sequence_of_operation', msg, model, meta)] =
                siemensOperationModes[msg.data['ctrlSeqeOfOper']];
        }

	return result;
    },
};

const tz_local_temperature = {
    key: ['local_temperature'],
    convertGet: async (entity, key, meta) => {
	await entity.read('hvacThermostat', ['localTemp'], siemensTimeout);
    },
};

const tz_control_sequence_of_operation = {
    key: ['control_sequence_of_operation'],
    convertSet: async (entity, key, value, meta) => {
	utils.assertEndpoint(entity);
	let val = utils.getKey(siemensOperationModes, value, undefined, Number);
	if (val === undefined) {
	    val = utils.getKey(siemensOperationModes, value, value, Number);
	}
	await entity.write('hvacThermostat', {ctrlSeqeOfOper: val}, siemensTimeout);

	entity.saveClusterAttributeKeyValue('hvacThermostat', attributes);
	return {readAfterWriteTime: 250, state: {control_sequence_of_operation: value}};
    },
    convertGet: async (entity, key, meta) => {
	await entity.read('hvacThermostat', ['ctrlSeqeOfOper'], siemensTimeout);
    }
};

const tz_system_mode = {
    key: ['system_mode'],
    convertSet: async (entity, key, value, meta) => {
	let systemMode = utils.getKey(constants.thermostatSystemModes, value, undefined, Number);
	if (systemMode === undefined) {
	    systemMode = utils.getKey(legacy.thermostatSystemModes, value, value, Number);
	}
	await entity.write('hvacThermostat', {systemMode}, siemensTimeout);
	return {readAfterWriteTime: 250, state: {system_mode: value}};
    },
    convertGet: async (entity, key, meta) => {
	    await entity.read('hvacThermostat', ['systemMode'], siemensTimeout);
    }
};

const tz_local_temperature_calibration = {
    key: ['local_temperature_calibration'],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value);
        await entity.write('hvacThermostat', {localTemperatureCalibration: Math.round(value * 10)}, siemensTimeout);
        return {state: {local_temperature_calibration: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read('hvacThermostat', ['localTemperatureCalibration'], siemensTimeout);
    }
};

const tz_occupied_heating_setpoint = {
    key: ['occupied_heating_setpoint'],
    options: [exposes.options.thermostat_unit()],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        let result;
	if (meta.options.thermostat_unit === 'fahrenheit') {
            result = Math.round(utils.normalizeCelsiusVersionOfFahrenheit(value) * 100);
        } else {
            result = Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 100;
        }
        const occupiedHeatingSetpoint = result;
        await entity.write('hvacThermostat', {occupiedHeatingSetpoint}, siemensTimeout);
        return {state: {occupied_heating_setpoint: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read('hvacThermostat', ['occupiedHeatingSetpoint'], siemensTimeout);
    }
};

const tz_unoccupied_heating_setpoint = {
    key: ['unoccupied_heating_setpoint'],
    options: [exposes.options.thermostat_unit()],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value, key);
        let result;
        if (meta.options.thermostat_unit === 'fahrenheit') {
            result = Math.round(utils.normalizeCelsiusVersionOfFahrenheit(value) * 100);
        } else {
            result = Number((Math.round(Number((value * 2).toFixed(1))) / 2).toFixed(1)) * 100;
        }
        const unoccupiedHeatingSetpoint = result;
        await entity.write('hvacThermostat', {unoccupiedHeatingSetpoint});
        return {state: {unoccupied_heating_setpoint: value}, siemensTimeout};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read('hvacThermostat', ['unoccupiedHeatingSetpoint'], siemensTimeout);
    }
};

const definition = {
    zigbeeModel: ['RDZ100'],
    model: 'RDZ100',
    vendor: 'Siemens',
    description: 'Siemens RDZ100 Wireless Thermostat',
    fromZigbee: [
        siemensFromZigbee,
    ],
    toZigbee: [
	tz_local_temperature,
	tz_control_sequence_of_operation,
	tz_system_mode,
	tz_local_temperature_calibration,
	tz_occupied_heating_setpoint,
	tz_unoccupied_heating_setpoint,
    ],
    extend: [battery(), ota()],
    exposes: (device, options) => {
	const expose = [
	e.climate()
	.withLocalTemperature()
	.withLocalTemperatureCalibration(-2.5, 2.5, 0.5)
	.withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
	.withSetpoint('unoccupied_heating_setpoint', 5, 30, 0.5)
        .withSystemMode(['off', 'heat'])];
    
	expose.push(e.enum('control_sequence_of_operation', ea.STATE_SET, Object.values(siemensOperationModes)).withDescription('Operation mode'));

	return expose;
    },
    meta: {},
    configure: async (device, coordinatorEndpoint) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'hvacThermostat']);
        await reporting.thermostatTemperature(endpoint);
        await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
        await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
    },
};

module.exports = definition;