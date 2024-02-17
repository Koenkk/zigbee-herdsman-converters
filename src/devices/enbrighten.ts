import {Definition} from '../lib/types';
import fz from '../converters/fromZigbee';
import {onOff, light, electricityMeter} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['43076'],
        model: '43076',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart switch',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['43078'],
        model: '43078',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart switch',
        extend: [onOff(), electricityMeter({cluster: 'metering'})],
    },
    {
        zigbeeModel: ['43080'],
        model: '43080',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart dimmer',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['43113'],
        model: '43113',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart dimmer',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['43102'],
        model: '43102',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall outlet',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['43100'],
        model: '43100',
        vendor: 'Enbrighten',
        description: 'Plug-in Zigbee outdoor smart switch',
        extend: [onOff()],
        fromZigbee: [fz.command_on_state, fz.command_off_state],
    },
    {
        zigbeeModel: ['43082'],
        model: '43082',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart dimmer',
        extend: [light({configureReporting: true, effect: false, powerOnBehavior: false}), electricityMeter({cluster: 'metering'})],
    },
    {
        zigbeeModel: ['43084'],
        model: '43084',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart switch',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['43090'],
        model: '43090',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart dimmer',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['43094'],
        model: '43094',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart switch ZB4102',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['43096'],
        model: '43096',
        vendor: 'Enbrighten',
        description: 'Zigbee plug-in smart dimmer with dual controlled outlets',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['43109'],
        model: '43109',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart switch',
        extend: [onOff()],
    },
];

export default definitions;
module.exports = definitions;
