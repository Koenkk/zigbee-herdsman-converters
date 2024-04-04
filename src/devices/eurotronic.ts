import {Zcl} from 'zigbee-herdsman';
import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import tz from '../converters/toZigbee';
import * as ota from '../lib/ota';
import * as constants from '../lib/constants';
import * as reporting from '../lib/reporting';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['SPZB0001'],
        model: 'SPZB0001',
        vendor: 'Eurotronic',
        description: 'Spirit Zigbee wireless heater thermostat',
        fromZigbee: [legacy.fz.eurotronic_thermostat, fz.battery],
        toZigbee: [tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration, tz.eurotronic_thermostat_system_mode, tz.eurotronic_host_flags,
            tz.eurotronic_error_status, tz.thermostat_setpoint_raise_lower, tz.thermostat_control_sequence_of_operation,
            tz.thermostat_remote_sensing, tz.thermostat_local_temperature, tz.thermostat_running_state,
            tz.eurotronic_current_heating_setpoint, tz.eurotronic_trv_mode, tz.eurotronic_valve_position],
        exposes: [e.battery(), e.climate().withSetpoint('occupied_heating_setpoint', 5, 30, 0.5).withLocalTemperature()
            .withSystemMode(['off', 'auto', 'heat']).withRunningState(['idle', 'heat'])
            .withLocalTemperatureCalibration()
            .withPiHeatingDemand(),
        e.enum('trv_mode', exposes.access.ALL, [1, 2])
            .withDescription('Select between direct control of the valve via the `valve_position` or automatic control of the '+
            'valve based on the `current_heating_setpoint`. For manual control set the value to 1, for automatic control set the value '+
            'to 2 (the default). When switched to manual mode the display shows a value from 0 (valve closed) to 100 (valve fully open) '+
            'and the buttons on the device are disabled.'),
        e.numeric('valve_position', exposes.access.ALL).withValueMin(0).withValueMax(255)
            .withDescription('Directly control the radiator valve when `trv_mode` is set to 1. The values range from 0 (valve '+
            'closed) to 255 (valve fully open)')],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: Zcl.ManufacturerCode.NXP_SEMICONDUCTORS};
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'hvacThermostat']);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            await endpoint.configureReporting('hvacThermostat', [{attribute: {ID: 0x4003, type: 41}, minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR, reportableChange: 25}], options);
            await endpoint.configureReporting('hvacThermostat', [{attribute: {ID: 0x4008, type: 34}, minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR, reportableChange: 1}], options);
        },
    },
];

export default definitions;
module.exports = definitions;
