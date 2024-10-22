import {light, onOff} from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['FB56-ZCW11HG1.2', 'FB56-ZCW11HG1.4'],
        model: 'HGZB-07A',
        vendor: 'Smart Home Pty',
        description: 'RGBW Downlight',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['FNB56-SKT1EHG1.2'],
        model: 'HGZB-20-DE',
        vendor: 'Smart Home Pty',
        description: 'Power plug',
        extend: [onOff()],
    },
];

export default definitions;
module.exports = definitions;
