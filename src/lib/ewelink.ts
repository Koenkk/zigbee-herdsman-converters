import {presets} from './exposes';
import {battery, setupConfigureForBinding} from './modernExtend';
import {Configure, Expose, Fz, KeyValueAny, ModernExtend} from './types';

export const ewelinkModernExtend = {
    ewelinkAction: (): ModernExtend => {
        const exposes: Expose[] = [presets.action(['single', 'double', 'long'])];

        const fromZigbee: Fz.Converter[] = [
            {
                cluster: 'genOnOff',
                type: ['commandOn', 'commandOff', 'commandToggle'],
                convert: (model, msg, publish, options, meta) => {
                    const lookup: KeyValueAny = {commandToggle: 'single', commandOn: 'double', commandOff: 'long'};
                    return {action: lookup[msg.type]};
                },
            },
        ];

        const configure: Configure[] = [setupConfigureForBinding('genOnOff', 'output')];

        return {exposes, fromZigbee, configure, isModernExtend: true};
    },
    ewelinkBattery: (): ModernExtend => {
        // 3600/7200 prevents disconnect
        // https://github.com/Koenkk/zigbee2mqtt/issues/13600#issuecomment-1283827935
        return battery({
            voltage: true,
            voltageReporting: true,
            percentageReportingConfig: {min: 3600, max: 7200, change: 10},
            voltageReportingConfig: {min: 3600, max: 7200, change: 10},
        });
    },
};

export {ewelinkModernExtend as modernExtend};
