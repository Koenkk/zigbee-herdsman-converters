const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [{modelID: 'zk78ptr\u0000', manufacturerName: '_TYST11_czk78ptr'}],
        model: 'TCP Smart TRV',
        vendor: 'TCP',
        description: 'Thermostatic radiator valve',
        whiteLabel: [],
        fromZigbee: [fz.tcp_thermostat, fz.ignore_basic_report],
        toZigbee: [
            tz.tuya_thermostat_child_lock, tz.siterwell_thermostat_window_detection,
            tz.tuya_thermostat_current_heating_setpoint, tz.tcp_thermostat_away_mode,
            tz.tcp_thermostat_system_mode, tz.tcp_thermostat_setup_mode],
        meta: {
            timeout: 10000
	},
        exposes: [e.battery_low(), e.window_detection(), e.child_lock(), e.away_mode(), e.setup_mode(),
            exposes.binary('window', ea.STATE, 'CLOSED', 'OPEN').withDescription('Window status closed or open'),
            exposes.climate()
                .withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(['heat', 'off', 'auto'], ea.STATE_SET)
                .withRunningState(['idle', 'heat'], ea.STATE)],
    },
];
