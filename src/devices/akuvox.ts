import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as reporting from '../lib/reporting';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'TS0201', manufacturerName: '_TYZB01_ujfk3xd9'}],
        model: 'M423-9E',
        vendor: 'Akuvox',
        description: 'Smart temperature & humidity Sensor',
        exposes: [e.battery(), e.temperature(), e.humidity()],
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await endpoint1.read('genPowerCfg', ['batteryPercentageRemaining']);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msRelativeHumidity']);
            await reporting.temperature(endpoint1);
            await reporting.humidity(endpoint2);
            await reporting.batteryVoltage(endpoint1);
            await reporting.batteryPercentageRemaining(endpoint1);
        },
    },
];

export default definitions;
module.exports = definitions;
