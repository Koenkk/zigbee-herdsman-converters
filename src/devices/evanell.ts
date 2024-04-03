import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import * as legacy from '../lib/legacy';
import * as tuya from '../lib/tuya';
import * as reporting from '../lib/reporting';
const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_dmfguuli'}],
        model: 'EZ200',
        vendor: 'Evanell',
        description: 'Thermostatic radiator valve',
        fromZigbee: [legacy.fz.evanell_thermostat],
        toZigbee: [legacy.tz.evanell_thermostat_current_heating_setpoint, legacy.tz.evanell_thermostat_system_mode,
            legacy.tz.evanell_thermostat_child_lock],
        onEvent: tuya.onEventSetTime,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic']);
        },
        exposes: [e.child_lock(), e.battery(),
            e.climate()
                .withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET).withLocalTemperature(ea.STATE)
                .withSystemMode(['off', 'heat', 'auto'], ea.STATE_SET),
        ],
    },
];

export default definitions;
module.exports = definitions;
