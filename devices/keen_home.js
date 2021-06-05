const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['SV01-410-MP-1.0', 'SV01-410-MP-1.1', 'SV01-410-MP-1.4', 'SV01-410-MP-1.5', 'SV01-412-MP-1.0',
            'SV01-412-MP-1.4', 'SV01-610-MP-1.0', 'SV01-612-MP-1.0'],
        model: 'SV01',
        vendor: 'Keen Home',
        description: 'Smart vent',
        fromZigbee: [fz.cover_position_via_brightness, fz.temperature, fz.battery, fz.keen_home_smart_vent_pressure,
            fz.ignore_onoff_report],
        toZigbee: [tz.cover_via_brightness],
        meta: {battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genLevelCtrl', 'genPowerCfg', 'msTemperatureMeasurement', 'msPressureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint);
            await reporting.pressure(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.cover_position().setAccess('state', ea.ALL), e.temperature(), e.battery(), e.pressure()],
    },
    {
        zigbeeModel: ['SV02-410-MP-1.3', 'SV02-610-MP-1.3', 'SV02-410-MP-1.0'],
        model: 'SV02',
        vendor: 'Keen Home',
        description: 'Smart vent',
        fromZigbee: [fz.cover_position_via_brightness, fz.temperature, fz.battery, fz.keen_home_smart_vent_pressure,
            fz.ignore_onoff_report],
        toZigbee: [tz.cover_via_brightness],
        meta: {battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genLevelCtrl', 'genPowerCfg', 'msTemperatureMeasurement', 'msPressureMeasurement'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint);
            await reporting.pressure(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.cover_position().setAccess('state', ea.ALL), e.temperature(), e.battery(), e.pressure()],
    },
];
