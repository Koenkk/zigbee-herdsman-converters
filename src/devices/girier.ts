import {Definition} from '../lib/types';
import * as tuya from '../lib/tuya';
import * as reporting from '../lib/reporting';

const definitions: Definition[] = [
    {
        fingerprint: [
            {modelID: 'TS0001', manufacturerName: '_TZ3000_majwnphg'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_6axxqqi2'},
            {modelID: 'TS0001', manufacturerName: '_TZ3000_zw7yf6yk'},
        ],
        model: 'JR-ZDS01',
        vendor: 'Girier',
        description: '1 gang mini switch',
        extend: [tuya.modernExtend.tuyaOnOff({switchType: true})],
        configure: async (device, coordinatorEndpoint) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
    },
];

export default definitions;
module.exports = definitions;
