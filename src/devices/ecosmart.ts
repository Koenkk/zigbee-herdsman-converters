import {Definition} from '../lib/types';
import {light} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['Ecosmart-ZBT-A19-CCT-Bulb'],
        model: 'A9A19A60WESDZ02',
        vendor: 'EcoSmart',
        description: 'Tuneable white (A19)',
        extend: [light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['Ecosmart-ZBT-BR30-CCT-Bulb'],
        model: 'A9BR3065WESDZ02',
        vendor: 'EcoSmart',
        description: 'Tuneable white (BR30)',
        extend: [light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['zhaRGBW'],
        model: 'D1821',
        vendor: 'EcoSmart',
        description: 'A19 RGB bulb',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        // eslint-disable-next-line
        zigbeeModel: ['\u0000\u0002\u0000\u0004\u0000\f^I\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e','\u0000\u0002\u0000\u0004^��&\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e'],
        model: 'D1531',
        vendor: 'EcoSmart',
        description: 'A19 bright white bulb',
        extend: [light()],
    },
    {
        // eslint-disable-next-line
        zigbeeModel: ['\u0000\u0002\u0000\u0004\u0012 �P\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e'],
        model: 'D1532',
        vendor: 'EcoSmart',
        description: 'A19 soft white bulb',
        extend: [light()],
    },
    {
        zigbeeModel: ['zhaTunW'],
        model: 'D1542',
        vendor: 'EcoSmart',
        description: 'GU10 adjustable white bulb',
        extend: [light({colorTemp: {range: undefined}})],
    },
    {
        // eslint-disable-next-line
        zigbeeModel: ['\u0000\u0002\u0000\u0004T\u0002\u000eZ\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e', '\u0000\u0002\u0000\u0004\u0000\f]�\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e', '\u0000\u0002\u0000\u0004\"�T\u0004\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e', '\u0000\u0002\u0000\u0004\u0000\f^�\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e','\u0000\u0002\u0000\u0004\u0011�\"�\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e','\u0000\u0002\u0000\u0004� �P\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e','\u0000\u0002\u0000\u0004\u0000\f^\u0014\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e'],
        model: 'D1533',
        vendor: 'EcoSmart',
        description: 'PAR20/A19 bright white bulb',
        extend: [light()],
    },
    {
        // eslint-disable-next-line
        zigbeeModel: ['\u0000\u0002\u0000\u0004�V\u0000\n\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e', '\u0000\u0002\u0000\u0004��\"�\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e','\u0000\u0002\u0000\u0004�\u0003\"�\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e','\u0000\u0002\u0000\u0004r �P\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e','\u0000\u0002\u0000\u0004b �P\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e'],
        model: 'D1523',
        vendor: 'EcoSmart',
        description: 'A19 soft white bulb',
        extend: [light()],
    },
];

export default definitions;
module.exports = definitions;
