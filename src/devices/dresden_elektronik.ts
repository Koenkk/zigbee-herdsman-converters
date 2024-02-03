import {Definition} from '../lib/types';
import * as ota from '../lib/ota';
import {batteryPercentage, light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['FLS-PP3'],
        model: 'Mega23M12',
        vendor: 'Dresden Elektronik',
        description: 'ZigBee Light Link wireless electronic ballast',
        ota: ota.zigbeeOTA,
        extend: [light({colorTemp: {range: undefined}, color: true, endpoints: {rgb: 10, white: 11}})],
    },
    {
        zigbeeModel: ['FLS-CT'],
        model: 'XVV-Mega23M12',
        vendor: 'Dresden Elektronik',
        description: 'ZigBee Light Link wireless electronic ballast color temperature',
        extend: [light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['Kobold'],
        model: 'BN-600110',
        vendor: 'Dresden Elektronik',
        description: 'Zigbee 3.0 dimm actuator',
        extend: [light()],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['Hive'],
        model: 'Hive',
        vendor: 'Phoscon',
        description: 'Battery powered smart LED light',
        ota: ota.zigbeeOTA,
        extend: [light({colorTemp: {range: [153, 370]}, color: true}), batteryPercentage()],
    },
    {
        zigbeeModel: ['FLS-A lp (1-10V)'],
        model: 'BN-600078',
        vendor: 'Dresden Elektronik',
        description: 'Zigbee controller for 1-10V/PWM',
        extend: [light({endpoints: {l1: 11, l2: 12, l3: 13, l4: 14}})],
        meta: {disableDefaultResponse: true},
    },
];

export default definitions;
module.exports = definitions;
