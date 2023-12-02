import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as ota from '../lib/ota';
import * as reporting from '../lib/reporting';
import extend from '../lib/extend';
import {light} from '../lib/modernExtend';

const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['FLS-PP3'],
        model: 'Mega23M12',
        vendor: 'Dresden Elektronik',
        description: 'ZigBee Light Link wireless electronic ballast',
        extend: extend.light_onoff_brightness_colortemp_color(),
        ota: ota.zigbeeOTA,
        exposes: [e.light_brightness_colortemp_colorxy().withEndpoint('rgb'), e.light_brightness().withEndpoint('white')],
        endpoint: (device) => {
            return {rgb: 10, white: 11};
        },
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
        extend: extend.light_onoff_brightness_colortemp_color({colorTempRange: [153, 370], fromZigbee: [fz.battery], exposes: [e.battery()],
            noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness_colortemp_color().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['FLS-A lp (1-10V)'],
        model: 'BN-600078',
        vendor: 'Dresden Elektronik',
        description: 'Zigbee controller for 1-10V/PWM',
        extend: extend.light_onoff_brightness(),
        exposes: [e.light_brightness().withEndpoint('l1'), e.light_brightness().withEndpoint('l2'),
            e.light_brightness().withEndpoint('l3'), e.light_brightness().withEndpoint('l4')],
        endpoint: (device) => {
            return {'l1': 11, 'l2': 12, 'l3': 13, 'l4': 14};
        },
        meta: {multiEndpoint: true, disableDefaultResponse: true},
    },
];

export default definitions;
module.exports = definitions;
