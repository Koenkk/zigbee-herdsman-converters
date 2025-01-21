import fz from '../converters/fromZigbee';
import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['43076'],
        model: '43076',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart switch',
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ['43078'],
        model: '43078',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart switch',
        extend: [m.onOff(), m.electricityMeter({cluster: 'metering'})],
    },
    {
        zigbeeModel: ['43080'],
        model: '43080',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart dimmer',
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ['43113'],
        model: '43113',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart dimmer',
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ['43102'],
        model: '43102',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall outlet',
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ['43100'],
        model: '43100',
        vendor: 'Enbrighten',
        description: 'Plug-in Zigbee outdoor smart switch',
        extend: [m.onOff()],
        fromZigbee: [fz.command_on_state, fz.command_off_state],
    },
    {
        zigbeeModel: ['43082'],
        model: '43082',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart dimmer',
        extend: [m.light({configureReporting: true, effect: false, powerOnBehavior: false}), m.electricityMeter({cluster: 'metering'})],
    },
    {
        zigbeeModel: ['43084'],
        model: '43084',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart switch',
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ['43090'],
        model: '43090',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart dimmer',
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ['43094'],
        model: '43094',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart switch ZB4102',
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ['43096'],
        model: '43096',
        vendor: 'Enbrighten',
        description: 'Zigbee plug-in smart dimmer with dual controlled outlets',
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ['43109'],
        model: '43109',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart switch',
        extend: [m.onOff()],
    },
];

export default definitions;
module.exports = definitions;
