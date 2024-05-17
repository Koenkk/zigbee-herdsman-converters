import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['leakSMART Water Sensor V2'],
        model: '8840100H',
        vendor: 'Waxman',
        description: 'leakSMART water sensor v2',
        fromZigbee: [fz._8840100H_water_leak_alarm, fz.temperature, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.water_leak()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'haApplianceEventsAlerts', 'msTemperatureMeasurement']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.temperature(endpoint);
        },
    },
    {
        zigbeeModel: ['House Water Valve - MDL-TBD', 'leakSMART Water Valve v2.10'],
        // Should work with all manufacturer model numbers for the 2.0 series:
        // 8850000 3/4"
        // 8850100 1"
        // 8850200 1-1/4"
        // 8850300 1-1/2"
        // 8850310 2"
        model: '8850100',
        vendor: 'Waxman',
        description: 'leakSMART automatic water shut-off valve 2.0',
        fromZigbee: [fz.battery, fz.on_off],
        toZigbee: [tz.on_off],
        exposes: [e.battery(), e.switch()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'haApplianceEventsAlerts', 'genOnOff']);
            await reporting.onOff(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
    },
];

export default definitions;
module.exports = definitions;
