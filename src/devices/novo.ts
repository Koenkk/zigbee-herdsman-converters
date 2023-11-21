import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_swhwv3k3'}],
        model: 'C10-3E-1.2',
        vendor: 'Novo',
        description: 'Curtain switch',
        fromZigbee: [legacy.fz.tuya_cover, fz.ignore_basic_report],
        toZigbee: [legacy.tz.tuya_cover_control, legacy.tz.tuya_cover_options],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET)],
    },
];

export default definitions;
module.exports = definitions;
