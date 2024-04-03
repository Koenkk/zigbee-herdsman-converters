import {Definition, Fz} from '../lib/types';
import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
const e = exposes.presets;

const fzLocal = {
    DCH_B112: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                contact: !((zoneStatus & 1) > 0),
                vibration: (zoneStatus & 1<<1) > 0,
                tamper: (zoneStatus & 1<<2) > 0,
                battery_low: (zoneStatus & 1<<3) > 0,
            };
        },
    } satisfies Fz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['DCH-B112'],
        model: 'DCH-B112',
        vendor: 'D-Link',
        description: 'Wireless smart door window sensor with vibration',
        fromZigbee: [fzLocal.DCH_B112, fz.battery],
        toZigbee: [],
        exposes: [e.battery_low(), e.contact(), e.vibration(), e.tamper(), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
];

export default definitions;
module.exports = definitions;
