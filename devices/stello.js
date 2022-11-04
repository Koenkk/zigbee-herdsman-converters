const fz = {...require('zigbee-herdsman-converters/converters/fromZigbee'), legacy: require('zigbee-herdsman-converters/lib/legacy').fromZigbee};
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const e = exposes.presets;
const ea = exposes.access;

const stello = {
    fz: {
          stello_power: {
            cluster: 'hvacThermostat',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                if (msg.data.hasOwnProperty('16392')) {
                    return {stello_power: msg.data["16392"]};
                }
				else {
					return 0;
				}					
            },
		  },		  
		  stello_energy: {
            cluster: 'hvacThermostat',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                if (msg.data.hasOwnProperty('16393')) {
                    return {stello_energy: parseFloat(msg.data["16393"]) / 1000};
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
	fromZigbee: [fz.legacy.stelpro_thermostat, fz.legacy.hvac_user_interface, stello.fz.stello_power, stello.fz.stello_energy],  
	toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint,
		tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout, tz.thermostat_system_mode,
		tz.thermostat_running_state, tz.stelpro_thermostat_outdoor_temperature],
	exposes: [e.local_temperature(), e.keypad_lockout(), e.power().withAccess(ea.STATE_GET).withProperty('stello_power'), e.energy().withAccess(ea.STATE_GET).withProperty('stello_energy'), 
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