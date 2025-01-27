import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend, Tz, Zh} from '../lib/types';
import {assertString, getFromLookup, getOptions} from '../lib/utils';

const backwards_cover_state = {
    key: ['state'],
    convertSet: async (entity: Zh.Endpoint, key: string, value: number | string, meta: Tz.Meta) => {
        const lookup = {open: 'downClose', close: 'upOpen', stop: 'stop', on: 'downClose', off: 'upOpen'};
        assertString(value, key);
        value = value.toLowerCase();
        await entity.command('closuresWindowCovering', getFromLookup(value, lookup), {}, getOptions(meta.mapped, entity));
    },
};

const e = exposes.presets;

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['WM25/L-Z'],
        model: 'WM25L-Z',
        vendor: 'Smartwings',
        description: 'Roller shade',
        fromZigbee: [fz.cover_position_tilt, fz.battery],
        toZigbee: [backwards_cover_state, tz.cover_position_tilt],
        meta: {battery: {dontDividePercentage: true}, coverInverted: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
        exposes: [e.cover_position(), e.battery()],
    },
];

export default definitions;
module.exports = definitions;
