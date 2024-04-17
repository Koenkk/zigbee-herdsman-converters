import dataType from 'zigbee-herdsman/dist/zcl/definition/dataType';
import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import * as ota from '../lib/ota';
const e = exposes.presets;
import tz from '../converters/toZigbee';
import fz from '../converters/fromZigbee';

const definitions: Definition[] = [
	{
	    zigbeeModel: ['Aidoo Zigbee'],
	    model: 'Aidoo Zigbee',
	    vendor: 'Airzone',
	    description: 'Device to manage and integrate HVAC units remotely.',
	    fromZigbee: [fz.on_off, fz.thermostat, fz.fan],
	    toZigbee: [
	        tz.fan_mode,
	        tz.thermostat_local_temperature,
	        tz.thermostat_occupied_cooling_setpoint,
	        tz.thermostat_occupied_heating_setpoint,
	        tz.thermostat_min_heat_setpoint_limit,
	        tz.thermostat_max_heat_setpoint_limit,
	        tz.thermostat_min_cool_setpoint_limit,
	        tz.thermostat_max_cool_setpoint_limit,
	        tz.thermostat_control_sequence_of_operation,
	        tz.thermostat_system_mode,
	        tz.thermostat_ac_louver_position,
	    ],
	    ota: ota.zigbeeOTA,
	    exposes: [
	        e.climate()
	            .withLocalTemperature()
	            .withSetpoint('occupied_cooling_setpoint', 18, 30, 0.5)
	            .withSetpoint('occupied_heating_setpoint', 16, 30, 0.5)
	            .withSystemMode(['off', 'heat', 'cool', 'auto', 'dry', 'fan_only'])
	            .withFanMode(['off', 'low', 'medium', 'high', 'auto'])
	            .withAcLouverPosition(['fully_open', 'fully_closed', 'half_open', 'quarter_open', 'three_quarters_open']),
	    ],
	    configure: async (device, coordinatorEndpoint, logger) => {
	        const endpoint1 = device.getEndpoint(1);
	        const binds1 = ['hvacFanCtrl', 'genIdentify', 'hvacThermostat'];
	        await reporting.bind(endpoint1, coordinatorEndpoint, binds1);
	        await reporting.thermostatTemperature(endpoint1);
	        await reporting.thermostatOccupiedCoolingSetpoint(endpoint1);
	        await reporting.thermostatOccupiedHeatingSetpoint(endpoint1);
	        await reporting.thermostatSystemMode(endpoint1);
	        await reporting.thermostatAcLouverPosition(endpoint1);
	    },
    },
];

export default definitions;
module.exports = definitions;