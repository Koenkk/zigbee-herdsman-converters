import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import {forcePowerSource, light} from '../lib/modernExtend';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';

const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['HDC52EastwindFan', 'HBUniversalCFRemote'],
        model: '99432',
        vendor: 'Hampton Bay',
        description: 'Universal wink enabled white ceiling fan premier remote control',
        fromZigbee: [fz.fan],
        toZigbee: [tz.fan_mode],
        exposes: [e.fan().withModes(['low', 'medium', 'high', 'on', 'smart'])],
        meta: {disableDefaultResponse: true},
        extend: [light({configureReporting: true}), forcePowerSource({powerSource: 'Mains (single phase)'})],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['hvacFanCtrl']);
            await reporting.fanMode(endpoint);
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
