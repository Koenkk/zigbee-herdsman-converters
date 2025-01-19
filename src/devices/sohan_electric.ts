import fz from '../converters/fromZigbee';
import * as m from '../lib/modernExtend';
import * as tuya from '../lib/tuya';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint('TS0001', ['_TZ3000_bezfthwc']),
        model: 'RDCBC/Z',
        vendor: 'SOHAN Electric',
        description: 'DIN circuit breaker (1 pole / 2 poles)',
        extend: [m.onOff()],
        fromZigbee: [fz.ignore_basic_report, fz.ignore_time_read],
    },
];

export default definitions;
module.exports = definitions;
