import {Zcl} from 'zigbee-herdsman';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import {Definition} from '../lib/types';
const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        zigbeeModel: ['7377019'],
        model: '7377019',
        vendor: 'Viessmann',
        description: 'ViCare CO2, temperature and humidity sensor',
        fromZigbee: [fz.co2, fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.co2(), e.temperature(), e.humidity()],
    },
    {
        zigbeeModel: ['7637435'],
        model: 'ZK03839',
        vendor: 'Viessmann',
        description: 'ViCare climate sensor',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity()],
    },
    {
        zigbeeModel: ['7637434'],
        model: 'ZK03840',
        vendor: 'Viessmann',
        description: 'ViCare radiator thermostat valve',
        fromZigbee: [legacy.fz.viessmann_thermostat_att_report, fz.battery, legacy.fz.hvac_user_interface],
        toZigbee: [tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint, tz.thermostat_control_sequence_of_operation,
            tz.thermostat_system_mode, tz.thermostat_keypad_lockout, tz.viessmann_window_open, tz.viessmann_window_open_force,
            tz.viessmann_assembly_mode, tz.thermostat_weekly_schedule, tz.thermostat_clear_weekly_schedule,
        ],
        exposes: [
            e.climate().withSetpoint('occupied_heating_setpoint', 7, 30, 1)
                .withLocalTemperature()
                .withSystemMode(['heat', 'sleep'])
                .withWeeklySchedule(['heat']),
            e.binary('window_open', ea.STATE_GET, true, false)
                .withDescription('Detected by sudden temperature drop or set manually.'),
            e.binary('window_open_force', ea.ALL, true, false)
                .withDescription('Manually set window_open, ~1 minute to take affect.'),
            e.keypad_lockout(),
            e.battery(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: Zcl.ManufacturerCode.VIESSMANN_ELEKTRONIK_GMBH};
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'genPowerCfg', 'genIdentify', 'genTime', 'hvacThermostat']);

            // standard ZCL attributes
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);

            // manufacturer attributes
            await endpoint.configureReporting('hvacThermostat', [{attribute: 'viessmannWindowOpenInternal', minimumReportInterval: 60,
                maximumReportInterval: 3600, reportableChange: 1}], options);

            // read window_open_force, we don't need reporting as it cannot be set physically on the device
            await endpoint.read('hvacThermostat', ['viessmannWindowOpenForce'], options);

            // read keypadLockout, we don't need reporting as it cannot be set physically on the device
            await endpoint.read('hvacUserInterfaceCfg', ['keypadLockout']);
        },
    },
];

export default definitions;
module.exports = definitions;
