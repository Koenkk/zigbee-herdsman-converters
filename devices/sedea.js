const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

const definition = {
    zigbeeModel: ['eTH700'],
    model: 'eTH700',
    vendor: 'SEDEA',
    description: 'Thermostatic radiator valve',
    fromZigbee: [fz.battery, fz.thermostat],
    toZigbee: [tz.thermostat_weekly_schedule, tz.thermostat_local_temperature, tz.thermostat_system_mode,
                tz.thermostat_running_state, tz.thermostat_occupied_heating_setpoint],
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'haDiagnostic', 'seMetering', 'thermostat']);
        await reporting.thermostatTemperature(endpoint);
        await reporting.thermostatPIHeatingDemand(endpoint);
    },
    exposes: [e.battery(), e.thermostat()],
};

module.exports = definition;

