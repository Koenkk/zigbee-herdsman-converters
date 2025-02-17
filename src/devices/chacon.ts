import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import * as m from '../lib/modernExtend';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';

const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['ZB-ERSM-01'],
        model: 'ZB-ERSM-01',
        vendor: 'Chacon',
        description: 'Roller shutter module',
        extend: [
            m.windowCovering({controls: ['lift'], coverInverted: true, coverMode: true}),
            m.commandsWindowCovering({commands: ['open', 'close', 'stop']}),
        ],
    },
    {
        zigbeeModel: ['ZB-PM-01'],
        model: 'ZB-PM-01',
        vendor: 'Chacon',
        description: 'On/Off lighting module',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        exposes: [e.switch()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
];

export default definitions;
module.exports = definitions;
