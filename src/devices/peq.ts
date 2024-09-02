import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';
const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['3300'],
        model: '3300-P',
        vendor: 'PEQ',
        description: 'Door & window contact sensor',
        fromZigbee: [fz.temperature, fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
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
