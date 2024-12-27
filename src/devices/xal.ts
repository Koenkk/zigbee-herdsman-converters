import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import {eLegrand, fzLegrand, tzLegrand} from '../lib/legrand';
import {light} from '../lib/modernExtend';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';

const e = exposes.presets;
const ea = exposes.access;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['JUST 45 MOVE IT 25'],
        model: '050-0131558M',
        vendor: 'XAL',
        description: 'Just 45 MOVE IT 25 series luminary',
    },
    {
        zigbeeModel: ['050-1212558H'],
        model: '050-1212558H',
        vendor: 'XAL',
        description: 'Just 45 LIGHT opal floodlight',
        extend: [light()],
    };

];

export default definitions;
module.exports = definitions;
