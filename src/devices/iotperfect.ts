import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_vrjkcam9'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_d0ypnbvn'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_v5xjyphj'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_d0ypnbvn'}],
        model: 'PF-PM02D-TYZ',
        vendor: 'IOTPerfect',
        description: 'Smart water/gas valve',
        exposes: [e.switch().setAccess('state', ea.STATE_SET)],
        fromZigbee: [legacy.fz.tuya_switch, fz.ignore_time_read, fz.ignore_basic_report],
        toZigbee: [legacy.tz.tuya_switch_state],
    },
];

export default definitions;
module.exports = definitions;
