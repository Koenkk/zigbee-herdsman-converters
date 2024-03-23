import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import {electricityMeter, light, onOff} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['35938'],
        model: 'ZB3102',
        vendor: 'Jasco Products',
        description: 'Zigbee plug-in smart dimmer',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['43132'],
        model: '43132',
        vendor: 'Jasco',
        description: 'Zigbee smart outlet',
        extend: [onOff(), electricityMeter({cluster: 'metering'})],
    },
    {
        zigbeeModel: ['43095'],
        model: '43095',
        vendor: 'Jasco Products',
        description: 'Zigbee smart plug-in switch with energy metering',
        fromZigbee: [fz.command_on_state, fz.command_off_state],
        extend: [onOff(), electricityMeter({cluster: 'metering'})],
    },
];

export default definitions;
module.exports = definitions;
