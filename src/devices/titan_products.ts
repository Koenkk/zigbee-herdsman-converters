import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as reporting from '../lib/reporting';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['TPZRCO2HT-Z3', 'TPZRCO2HT-Z3/L'],
        model: 'TPZRCO2HT-Z3',
        vendor: 'Titan Products',
        description: 'Room CO2, humidity & temperature sensor',
        fromZigbee: [fz.battery, fz.humidity, fz.temperature, fz.co2],
        exposes: [e.battery_voltage(), e.battery_low(), e.humidity(), e.temperature(), e.co2()],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'msTemperatureMeasurement', 'msCO2']);
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['msRelativeHumidity']);
        },
    },
];

export default definitions;
module.exports = definitions;
