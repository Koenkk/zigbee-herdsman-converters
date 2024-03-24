import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import * as legacy from '../lib/legacy';
import tz from '../converters/toZigbee';
import {deviceEndpoints, onOff} from '../lib/modernExtend';
const e = exposes.presets;

const definitions: Definition[] = [
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

        fingerprint: [{modelID: 'TS0003', manufacturerName: '_TYZB01_aneiicmq'}],
        model: 'BW-SS7_1gang',
        vendor: 'BlitzWolf',
        description: 'Zigbee 3.0 smart light switch module 1 gang',
        extend: [onOff()],
        toZigbee: [tz.TYZB01_on_off],
    },
    {
        fingerprint: [{modelID: 'TS0003', manufacturerName: '_TYZB01_digziiav'}],
        model: 'BW-SS7_2gang',
        vendor: 'BlitzWolf',
        description: 'Zigbee 3.0 smart light switch module 2 gang',
        extend: [deviceEndpoints({endpoints: {l1: 1, l2: 2}}), onOff({endpointNames: ['l1', 'l2']})],
        toZigbee: [tz.TYZB01_on_off],
    },
];

export default definitions;
module.exports = definitions;
