import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import * as legacy from '../lib/legacy';
const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_yenbr4om'}, {modelID: 'TS0601', manufacturerName: '_TZE204_bdblidq3'}],
        model: 'BSEED_TS0601_cover',
        vendor: 'BSEED',
        description: 'Zigbee curtain switch',
        fromZigbee: [legacy.fz.tuya_cover],
        toZigbee: [legacy.tz.tuya_cover_control],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET)],
    },
];

export default definitions;
module.exports = definitions;
