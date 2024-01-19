import {Definition} from '../lib/types';
import extend from '../lib/extend';
import * as exposes from '../lib/exposes';
const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['Emotion'],
        model: 'A319463',
        vendor: 'LS Deutschland GmbH',
        description: 'Home base',
        fromZigbee: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 454]}).fromZigbee,
        toZigbee: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 454]}).toZigbee,
        configure: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 454]}).configure,
        exposes: (device, options) => {
            if (!device) return [e.light_brightness_colortemp_colorxy([153, 454]), e.linkquality()];
            return [e.linkquality(), ...device.endpoints.filter((ep) => ep.ID !== 242).map((ep) => {
                return e.light_brightness_colortemp_colorxy([153, 454]).withEndpoint(`l${ep.ID}`);
            })];
        },
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return Object.fromEntries(device.endpoints.filter((ep) => ep.ID !== 242).map((ep) => [`l${ep.ID}`, ep.ID]));
        },
    },
];

export default definitions;
module.exports = definitions;
