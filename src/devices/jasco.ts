import fz from '../converters/fromZigbee';
import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['35938'],
        model: 'ZB3102',
        vendor: 'Jasco Products',
        description: 'Zigbee plug-in smart dimmer',
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ['43132'],
        model: '43132',
        vendor: 'Jasco',
        description: 'Zigbee smart outlet',
        extend: [m.onOff(), m.electricityMeter({cluster: 'metering'})],
    },
    {
        zigbeeModel: ['43095'],
        model: '43095',
        vendor: 'Jasco Products',
        description: 'Zigbee smart plug-in switch with energy metering',
        fromZigbee: [fz.command_on_state, fz.command_off_state],
        extend: [m.onOff(), m.electricityMeter({cluster: 'metering'})],
    },
];

export default definitions;
module.exports = definitions;
