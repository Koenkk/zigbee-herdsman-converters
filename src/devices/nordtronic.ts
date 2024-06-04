import {Definition} from '../lib/types';
import {
    light,
    onOff,
    electricityMeter,
    battery,
    identify,
    commandsOnOff,
    commandsLevelCtrl,
    commandsColorCtrl,
} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        fingerprint: [
            {modelID: 'WSZ 98426061', manufacturerName: 'Nordtronic A/S'},
            {modelID: 'WSZ 98426061', manufacturerName: 'Nordtronic'},
            {modelID: '98426061', manufacturerName: 'Nordtronic A/S'},
            {modelID: '98426061', manufacturerName: 'Nordtronic'},
        ],
        model: '98426061',
        vendor: 'Nordtronic',
        description: 'Remote Control',
        extend: [battery(), identify(), commandsOnOff(), commandsLevelCtrl(), commandsColorCtrl()],
    },
    {
        zigbeeModel: ['BoxDIM2 98425031', '98425031', 'BoxDIMZ 98425031'],
        model: '98425031',
        vendor: 'Nordtronic',
        description: 'Box Dimmer 2.0',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['BoxRelay2 98423051', '98423051', 'BoxRelayZ 98423051'],
        model: '98423051',
        vendor: 'Nordtronic',
        description: 'Zigbee switch 400W',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['RotDIM2 98424072', '98424072', 'RotDIMZ 98424072'],
        model: '98424072',
        vendor: 'Nordtronic',
        description: 'Zigbee rotary dimmer',
        extend: [light({configureReporting: true}), electricityMeter()],
    },
];

export default definitions;
module.exports = definitions;
