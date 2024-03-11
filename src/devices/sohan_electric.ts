import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import {onOff} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        fingerprint: [{modelID: 'TS0001', manufacturerName: '_TZ3000_bezfthwc'}],
        model: 'RDCBC/Z',
        vendor: 'SOHAN Electric',
        description: 'DIN circuit breaker (1 pole / 2 poles)',
        extend: [onOff()],
        fromZigbee: [fz.ignore_basic_report, fz.ignore_time_read],
    },
];

export default definitions;
module.exports = definitions;
