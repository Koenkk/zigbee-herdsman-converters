const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

const fzLocal = {
    vimar_active_power: {
        cluster: 'haElectricalMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: async (model, msg, publish, options, meta) => {
            let payload = {};
            if (msg.data.hasOwnProperty('activePower')) {
                payload.power = msg.data['activePower'];
            }
            return payload;
        },
    },
};

module.exports = [
    {
        zigbeeModel: ['On_Off_Switch_Module_v1.0'],
        model: '03981',
        vendor: 'Vimar',
        description: 'IoT connected relay module',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(10);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['2_Way_Switch_v1.0', 'On_Off_Switch_v1.0'],
        model: '14592.0',
        vendor: 'Vimar',
        description: '2-way switch IoT connected mechanism',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(10);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['Window_Cov_v1.0'],
        model: '14594',
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
        fromZigbee: [fz.on_off, fz.ignore_basic_report, fzLocal.vimar_active_power],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(10);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
        },
    },
    {
        zigbeeModel: ['Thermostat_v0.1'],
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
            exposes.climate().withSetpoint('occupied_heating_setpoint', 4, 40, 0.1)
                .withSetpoint('occupied_cooling_setpoint', 4, 40, 0.1)
                .withLocalTemperature()
                .withSystemMode(['heat', 'cool']),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(10);
            const binds = ['genBasic', 'genIdentify', 'hvacThermostat'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatTemperature(endpoint);
        },
    },
];
