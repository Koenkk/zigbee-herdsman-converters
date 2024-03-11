import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        zigbeeModel: ['tdtqgwv'],
        model: 'ZSTY-SM-11ZG-US-W',
        vendor: 'Somgoms',
        description: '1 gang switch',
        exposes: [e.switch().setAccess('state', ea.STATE_SET)],
        fromZigbee: [legacy.fz.tuya_switch, fz.ignore_time_read, fz.ignore_basic_report],
        toZigbee: [legacy.tz.tuya_switch_state],
    },
    {
        zigbeeModel: ['bordckq'],
        model: 'ZSTY-SM-1CTZG-US-W',
        vendor: 'Somgoms',
        description: 'Curtain switch',
        fromZigbee: [legacy.fz.tuya_cover, fz.ignore_basic_report],
        toZigbee: [legacy.tz.tuya_cover_control, legacy.tz.tuya_cover_options],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET)],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_sbordckq'}],
        model: 'SM-1CTW-EU',
        vendor: 'Somgoms',
        description: 'Curtain switch',
        fromZigbee: [legacy.fz.tuya_cover, fz.ignore_basic_report],
        toZigbee: [legacy.tz.tuya_cover_control, legacy.tz.tuya_cover_options],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET)],
    },
    {
        zigbeeModel: ['hpb9yts'],
        model: 'ZSTY-SM-1DMZG-US-W',
        vendor: 'Somgoms',
        description: 'Dimmer switch',
        fromZigbee: [legacy.fz.tuya_dimmer, fz.ignore_basic_report],
        toZigbee: [legacy.tz.tuya_dimmer_state, legacy.tz.tuya_dimmer_level],
        exposes: [e.light_brightness().setAccess('state', ea.STATE_SET).setAccess('brightness', ea.STATE_SET)],
    },
];

export default definitions;
module.exports = definitions;
