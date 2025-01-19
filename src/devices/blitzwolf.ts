import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import * as legacy from '../lib/legacy';
import * as m from '../lib/modernExtend';
import * as tuya from '../lib/tuya';
import {DefinitionWithExtend} from '../lib/types';

const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['5j6ifxj', '5j6ifxj\u0000'],
        model: 'BW-IS3',
        vendor: 'BlitzWolf',
        description: 'Rechargeable Zigbee PIR motion sensor',
        fromZigbee: [legacy.fz.blitzwolf_occupancy_with_timeout],
        toZigbee: [],
        exposes: [e.occupancy()],
    },
    {
        fingerprint: tuya.fingerprint('TS0003', ['_TYZB01_aneiicmq']),
        model: 'BW-SS7_1gang',
        vendor: 'BlitzWolf',
        description: 'Zigbee 3.0 smart light switch module 1 gang',
        extend: [m.onOff()],
        toZigbee: [tz.TYZB01_on_off],
    },
    {
        fingerprint: tuya.fingerprint('TS0003', ['_TYZB01_digziiav']),
        model: 'BW-SS7_2gang',
        vendor: 'BlitzWolf',
        description: 'Zigbee 3.0 smart light switch module 2 gang',
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}), m.onOff({endpointNames: ['l1', 'l2']})],
        toZigbee: [tz.TYZB01_on_off],
    },
];

export default definitions;
module.exports = definitions;
