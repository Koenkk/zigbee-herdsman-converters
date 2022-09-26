const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const tuya = require('../lib/tuya');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [{modelID: 'GbxAXL2\u0000', manufacturerName: '_TYST11_KGbxAXL2'},
            {modelID: 'uhszj9s\u0000', manufacturerName: '_TYST11_zuhszj9s'},
            {modelID: '88teujp\u0000', manufacturerName: '_TYST11_c88teujp'},
            {modelID: 'w7cahqs\u0000', manufacturerName: '_TYST11_yw7cahqs'},
            {modelID: 'w7cahqs', manufacturerName: '_TYST11_yw7cahqs'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_c88teujp'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_yw7cahqs'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_azqp6ssj'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_zuhszj9s'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_9gvruqf5'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_zr9c0day'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_0dvm9mva'},
        ],
        model: 'SEA801-Zigbee/SEA802-Zigbee',
        vendor: 'Saswell',
        description: 'Thermostatic radiator valve',
        whiteLabel: [{vendor: 'HiHome', model: 'WZB-TRVL'}, {vendor: 'Hama', model: '00176592'},
            {vendor: 'RTX', model: 'ZB-RT1'}],
        fromZigbee: [fz.saswell_thermostat, fz.ignore_tuya_set_time, fz.ignore_basic_report, fz.legacy.tuya_thermostat_weekly_schedule],
        toZigbee: [tz.saswell_thermostat_current_heating_setpoint, tz.saswell_thermostat_mode, tz.saswell_thermostat_away,
            tz.saswell_thermostat_child_lock, tz.saswell_thermostat_window_detection, tz.saswell_thermostat_frost_detection,
            tz.saswell_thermostat_calibration, tz.saswell_thermostat_anti_scaling, tz.tuya_thermostat_weekly_schedule],
        onEvent: tuya.onEventSetTime,
        meta: {
            thermostat: {
                weeklyScheduleMaxTransitions: 4,
                weeklyScheduleSupportedModes: [1], // bits: 0-heat present, 1-cool present (dec: 1-heat,2-cool,3-heat+cool)
                weeklyScheduleConversion: 'saswell',
            },
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [e.battery_low(), e.window_detection(), e.child_lock(), e.away_mode(),
            exposes.binary('heating', ea.STATE, 'ON', 'OFF').withDescription('Device valve is open or closed (heating or not)'),
            exposes.climate()
                .withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET).withLocalTemperature(ea.STATE)
                .withSystemMode(['off', 'heat', 'auto'], ea.STATE_SET)
                // Range is -6 - 6 and step 1: https://github.com/Koenkk/zigbee2mqtt/issues/11777
                .withLocalTemperatureCalibration(-6, 6, 1, ea.STATE_SET)],
    },
];
