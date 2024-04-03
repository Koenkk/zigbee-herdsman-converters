import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import {onOff, light} from '../lib/modernExtend';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['On_Off_Switch_Module_v1.0'],
        model: '03981',
        vendor: 'Vimar',
        description: 'IoT connected relay module',
        extend: [onOff({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ['DimmerSwitch_v1.0'],
        model: '14595.0',
        vendor: 'Vimar',
        description: 'IoT connected dimmer mechanism 220-240V',
        extend: [light({configureReporting: true, powerOnBehavior: false})],
        endpoint: (device) => {
            return {default: 11};
        },
    },
    {
        zigbeeModel: ['2_Way_Switch_v1.0', 'On_Off_Switch_v1.0'],
        model: '14592.0',
        vendor: 'Vimar',
        description: '2-way switch IoT connected mechanism',
        extend: [onOff({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ['Window_Cov_v1.0'],
        model: '14594',
        vendor: 'Vimar',
        description: 'Roller shutter with slat orientation and change-over relay',
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(10);
            const binds = ['closuresWindowCovering'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
    {
        zigbeeModel: ['Window_Cov_Module_v1.0'],
        model: '03982',
        vendor: 'Vimar',
        description: 'Roller shutter with slat orientation and change-over relay',
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position()],
    },
    {
        zigbeeModel: ['Mains_Power_Outlet_v1.0'],
        model: '14593',
        vendor: 'Vimar',
        description: '16A outlet IoT connected',
        fromZigbee: [fz.on_off, fz.ignore_basic_report, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(10);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
        },
    },
    {
        zigbeeModel: ['Thermostat_v0.1', 'WheelThermostat_v1.0'],
        model: '02973.B',
        vendor: 'Vimar',
        description: 'Vimar IoT thermostat',
        fromZigbee: [fz.thermostat],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_system_mode,
        ],
        exposes: [
            e.climate().withSetpoint('occupied_heating_setpoint', 4, 40, 0.1)
                .withSetpoint('occupied_cooling_setpoint', 4, 40, 0.1)
                .withLocalTemperature()
                .withSystemMode(['heat', 'cool']),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(10);
            const binds = ['genBasic', 'genIdentify', 'hvacThermostat'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
        },
    },
];

export default definitions;
module.exports = definitions;
