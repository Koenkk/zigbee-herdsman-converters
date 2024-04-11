import {Definition} from '../lib/types';
import {deviceEndpoints} from '../lib/modernExtend';
import {fingerprint, modernExtend as tuyaModernExtend} from '../lib/tuya';
const {tuyaLight} = tuyaModernExtend;

const definitions: Definition[] = [
    {
        fingerprint: fingerprint('TS110F', ['_TZ3000_estfrmup']),
        model: 'CSP051',
        vendor: 'Click Smart+',
        description: '1 gang dimmer module',
        extend: [tuyaLight({minBrightness: true})],
    },
    {
        fingerprint: fingerprint('TS110F', ['_TZ3000_ha4ejozn']),
        model: 'CSP052',
        vendor: 'Click Smart+',
        description: '2 gang dimmer module',
        extend: [
            deviceEndpoints({endpoints: {'L1': 1, 'L2': 2}}),
            tuyaLight({minBrightness: true, endpointNames: ['L1', 'L2']}),
        ],
    },
];

export default definitions;
module.exports = definitions;
