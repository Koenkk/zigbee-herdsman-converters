import {electricityMeter, light, onOff} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['C205'],
        model: 'C205',
        vendor: 'Candeo',
        description: 'Switch module',
        extend: [onOff({powerOnBehavior: false})],
    },
    {
        fingerprint: [{modelID: 'Dimmer-Switch-ZB3.0', manufacturerName: 'Candeo'}],
        model: 'C202',
        vendor: 'Candeo',
        description: 'Zigbee LED smart dimmer switch',
        extend: [light({configureReporting: true})],
    },
    {
        fingerprint: [{modelID: 'Dimmer-Switch-ZB3.0', manufacturerID: 4098}],
        model: 'C210',
        vendor: 'Candeo',
        description: 'Zigbee dimming smart plug',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['HK-DIM-A', 'Candeo Zigbee Dimmer', 'HK_DIM_A'],
        fingerprint: [{modelID: 'HK_DIM_A', manufacturerName: 'Shyugj'}],
        model: 'HK-DIM-A',
        vendor: 'Candeo',
        description: 'Zigbee LED dimmer smart switch',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['C204', 'C-ZB-DM204'],
        model: 'C204',
        vendor: 'Candeo',
        description: 'Zigbee micro smart dimmer',
        extend: [light({configureReporting: true}), electricityMeter()],
    },
    {
        fingerprint: [{modelID: 'Candeo Zigbee Dimmer', manufacturerID: 4107}],
        model: 'C201',
        vendor: 'Candeo',
        description: 'Zigbee micro smart dimmer',
        extend: [light({configureReporting: true})],
    },
];

export default definitions;
module.exports = definitions;
