import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import extend from '../lib/extend';
import {light} from '../lib/modernExtend';

const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['HDC52EastwindFan', 'HBUniversalCFRemote'],
        model: '99432',
        vendor: 'Hampton Bay',
        description: 'Universal wink enabled white ceiling fan premier remote control',
        fromZigbee: extend.light_onoff_brightness().fromZigbee.concat([fz.fan]),
        toZigbee: extend.light_onoff_brightness().toZigbee.concat([tz.fan_mode]),
        exposes: [e.light_brightness(), e.fan().withModes(['low', 'medium', 'high', 'on', 'smart'])],
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'hvacFanCtrl']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
            await reporting.fanMode(endpoint);

            // Has Unknown power source, force it here.
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['ETI 12-in Puff light'],
        model: '54668161',
        vendor: 'Hampton Bay',
        description: '12 in. LED smart puff',
        extend: [light({colorTemp: {range: undefined}})],
    },
];

export default definitions;
module.exports = definitions;
