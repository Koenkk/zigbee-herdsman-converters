import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as reporting from '../lib/reporting';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['3300'],
        model: '3300-P',
        vendor: 'PEQ',
        description: 'Door & window contact sensor',
        fromZigbee: [fz.temperature, fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.temperature(), e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
];

export default definitions;
module.exports = definitions;
