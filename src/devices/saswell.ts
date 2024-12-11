import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import * as legacy from '../lib/legacy';
import * as reporting from '../lib/reporting';
import * as tuya from '../lib/tuya';
import {DefinitionWithExtend} from '../lib/types';

const e = exposes.presets;
const ea = exposes.access;

const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [
            {modelID: 'GbxAXL2\u0000', manufacturerName: '_TYST11_KGbxAXL2'},
            {modelID: 'uhszj9s\u0000', manufacturerName: '_TYST11_zuhszj9s'},
            {modelID: '88teujp\u0000', manufacturerName: '_TYST11_c88teujp'},
            {modelID: 'w7cahqs\u0000', manufacturerName: '_TYST11_yw7cahqs'},
            {modelID: 'w7cahqs', manufacturerName: '_TYST11_yw7cahqs'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_c88teujp'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_yw7cahqs'},
            {modelID: 'aj4jz0i\u0000', manufacturerName: '_TYST11_caj4jz0i'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_azqp6ssj'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_zuhszj9s'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_9gvruqf5'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_zr9c0day'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_0dvm9mva'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_h4cgnbzg'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_gd4rvykv'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_exfrnlow'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_9m4kmbfu'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_3yp57tby'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_7p8ugv8d'},
            {modelID: 'TS0601', manufacturerName: '_TZE284_3yp57tby'},
        ],
        model: 'SEA801-Zigbee/SEA802-Zigbee',
        vendor: 'Saswell',
        description: 'Thermostatic radiator valve',
        whiteLabel: [
            {vendor: 'HiHome', model: 'WZB-TRVL'},
            {vendor: 'Hama', model: '00176592'},
            {vendor: 'Maginon', model: 'WT-1'},
            {vendor: 'RTX', model: 'ZB-RT1'},
            {vendor: 'SETTI+', model: 'TRV001'},
            {vendor: 'Royal Thermo', model: 'RTE 77.001B'},
        ],
        fromZigbee: [legacy.fz.saswell_thermostat, fz.ignore_tuya_set_time, fz.ignore_basic_report, legacy.fz.tuya_thermostat_weekly_schedule_2],
        toZigbee: [
            legacy.tz.saswell_thermostat_current_heating_setpoint,
            legacy.tz.saswell_thermostat_mode,
            legacy.tz.saswell_thermostat_away,
            legacy.tz.saswell_thermostat_child_lock,
            legacy.tz.saswell_thermostat_window_detection,
            legacy.tz.saswell_thermostat_frost_detection,
            legacy.tz.saswell_thermostat_calibration,
            legacy.tz.saswell_thermostat_anti_scaling,
            legacy.tz.tuya_thermostat_weekly_schedule,
        ],
        // @ts-expect-error ignore
        onEvent: (type, data, device) => !['_TZE200_c88teujp'].includes(device.manufacturerName) && tuya.onEventSetTime(type, data, device),
        meta: {
            thermostat: {
                weeklyScheduleMaxTransitions: 4,
                weeklyScheduleSupportedModes: [1], // bits: 0-heat present, 1-cool present (dec: 1-heat,2-cool,3-heat+cool)
                weeklyScheduleConversion: 'saswell',
            },
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [
            e.battery_low(),
            e.window_detection(),
            e.child_lock(),
            e.away_mode(),
            e.binary('heating', ea.STATE, 'ON', 'OFF').withDescription('Device valve is open or closed (heating or not)'),
            e
                .climate()
                .withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withSystemMode(['off', 'heat', 'auto'], ea.STATE_SET)
                .withRunningState(['idle', 'heat'], ea.STATE)
                // Range is -6 - 6 and step 1: https://github.com/Koenkk/zigbee2mqtt/issues/11777
                .withLocalTemperatureCalibration(-6, 6, 1, ea.STATE_SET),
        ],
    },
];

export default definitions;
module.exports = definitions;
