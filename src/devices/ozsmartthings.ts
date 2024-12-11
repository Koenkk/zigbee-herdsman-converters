import * as tuya from '../lib/tuya';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3210_mcm6m1ma'}],
        model: 'DL41-03-10-R-ZB',
        vendor: 'Oz Smart Things',
        description: 'Oz Smart RGBW Zigbee downlight 10w',
        extend: [tuya.modernExtend.tuyaLight({colorTemp: {range: [153, 500]}, color: true})],
    },
];

export default definitions;
module.exports = definitions;
