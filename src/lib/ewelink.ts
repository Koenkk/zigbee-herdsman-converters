import {Expose, Fz, ModernExtend, KeyValueAny, Configure} from './types';
import {presets} from './exposes';
import {setupConfigureForBinding} from './modernExtend';

export const ewelinkModernExtend = {
    ewelinkAction: (): ModernExtend => {
        const exposes: Expose[] = [presets.action(['single', 'double', 'long'])];

        const fromZigbee: Fz.Converter[] = [
            {
                cluster: 'genOnOff',
                type: ['commandOn', 'commandOff', 'commandToggle'],
                convert: (model, msg, publish, options, meta) => {
                    const lookup: KeyValueAny = {'commandToggle': 'single', 'commandOn': 'double', 'commandOff': 'long'};
                    return {action: lookup[msg.type]};
                },
            },
        ];

        const configure: Configure[] = [setupConfigureForBinding('genOnOff', 'output')];

        return {exposes, fromZigbee, configure, isModernExtend: true};
    },
};

export {ewelinkModernExtend as modernExtend};
