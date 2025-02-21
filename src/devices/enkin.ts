import {forcePowerSource, light} from '../lib/modernExtend';
import {bind, onOff} from '../lib/reporting';
import {DefinitionWithExtend} from '../lib/types';

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['ZDM150'],
        model: 'ZDM150',
        vendor: 'Enkin',
        description: '150W Dimmer Module',
        extend: [light({powerOnBehavior: false, effect: false, configureReporting: true}), forcePowerSource({powerSource: 'Mains (single phase)'})],

        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await onOff(endpoint, {min: 0, max: 0xfffe});

            await endpoint.configureReporting('genLevelCtrl', [
                {attribute: 'currentLevel', minimumReportInterval: 3, maximumReportInterval: 3600, reportableChange: 1},
            ]);

            device.save();
        },
        meta: {},
    },
];
