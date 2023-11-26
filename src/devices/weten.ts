import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import extend from '../lib/extend';

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'TS0001', manufacturerName: '_TZ3000_wrhhi5h2'}],
        model: '1GNNTS',
        vendor: 'WETEN',
        description: '1 gang no neutral touch wall switch',
        extend: extend.switch(),
        fromZigbee: [fz.on_off, fz.ignore_basic_report, fz.ignore_time_read],
    },
];

export default definitions;
module.exports = definitions;
