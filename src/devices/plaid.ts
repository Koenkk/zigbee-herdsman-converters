import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';
const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: 'PS-SPRZMS-SLP3', manufacturerName: 'PLAID SYSTEMS'}],
        zigbeeModel: ['PS-SPRZMS-SLP3'],
        model: 'PS-SPRZMS-SLP3',
        vendor: 'PLAID SYSTEMS',
        description: 'Spruce temperature and moisture sensor',
        toZigbee: [],
        fromZigbee: [fz.temperature, fz.humidity, fz.plaid_battery],
        exposes: [e.humidity(), e.temperature(), e.battery(), e.battery_voltage()],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
            device.powerSource = 'Battery';
        },
    },
];

export default definitions;
module.exports = definitions;
