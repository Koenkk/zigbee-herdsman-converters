const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

const stello = {
    fz: {
          power: {
            cluster: 'hvacThermostat',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                if (msg.data.hasOwnProperty('16392')) {
                    return {power: msg.data["16392"]};
                }
				else {
					return 0;
				}					
            },
		  },		  
		  energy: {
            cluster: 'hvacThermostat',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                if (msg.data.hasOwnProperty('16393')) {
                    return {energy: parseFloat(msg.data["16393"]) / 1000};
                }
            },
        },
    },
};

const definition = {
	zigbeeModel: ['HT402'], 
	model: 'HT402', 
	vendor: 'Stello', 
	description: 'Hilo Stelpro thermostat', 
	fromZigbee: [fz.legacy.stelpro_thermostat, fz.legacy.hvac_user_interface, stello.fz.power, stello.fz.energy],  
	toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint,
		tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode,
		tz.thermostat_running_state, tz.stelpro_thermostat_outdoor_temperature],
	exposes: [e.local_temperature(), e.keypad_lockout(), e.power().withAccess(ea.STATE_GET).withProperty('power'), e.energy().withAccess(ea.STATE_GET).withProperty('energy'), 
		exposes.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
			.withSystemMode(['heat']).withRunningState(['idle', 'heat'])],
	configure: async (device, coordinatorEndpoint, logger) => {
		const endpoint = device.getEndpoint(25);
		const binds = ['genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg', 'msTemperatureMeasurement'];
		await reporting.bind(endpoint, coordinatorEndpoint, binds);
		await reporting.thermostatTemperature(endpoint);
		await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
		await reporting.thermostatSystemMode(endpoint);
		await reporting.thermostatPIHeatingDemand(endpoint);
		await reporting.thermostatKeypadLockMode(endpoint);
	},
};

module.exports = definition;