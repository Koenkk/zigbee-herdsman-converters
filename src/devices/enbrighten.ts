import * as m from '../lib/modernExtend';
import {DefinitionWithExtend} from '../lib/types';

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['43076', '43109', '43102', '43100', '43094', '43084'],
        model: '43076',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart switch',
        extend: [m.identify(), m.onOff({configureReporting: true, powerOnBehavior: false}), m.commandsOnOff({commands: ['on', 'off'], bind: true})],
        whiteLabel: [
            {
                model: '43109',
                vendor: 'Enbrighten',
                description: 'Zigbee in-wall smart switch',
                fingerprint: [{modelID: '43109'}],
            },
            {
                model: '43102',
                vendor: 'Enbrighten',
                description: 'Zigbee in-wall tamper-resistant smart outlet',
                fingerprint: [{modelID: '43102'}],
            },
            {
                model: '43100',
                vendor: 'Enbrighten',
                description: 'Zigbee plug-in outdoor smart switch',
                fingerprint: [{modelID: '43100'}],
            },
            {
                model: '43094',
                vendor: 'Enbrighten',
                description: 'Zigbee plug-in indoor smart switch with dual outlets on one control',
                fingerprint: [{modelID: '43094'}],
            },
            {
                model: '43084',
                vendor: 'Enbrighten',
                description: 'Zigbee in-wall smart toggle style switch',
                fingerprint: [{modelID: '43084'}],
            },
        ],
    },
    {
        zigbeeModel: ['43078'],
        model: '43078',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart switch with energy monitoring',
        extend: [
            m.identify(),
            m.onOff({configureReporting: true, powerOnBehavior: false}),
            m.electricityMeter({cluster: 'metering'}),
            m.commandsOnOff({commands: ['on', 'off'], bind: true}),
        ],
    },
    {
        zigbeeModel: ['43080', '43113', '43090', '43096'],
        model: '43080',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart dimmer',
        extend: [
            m.identify(),
            m.light({
                configureReporting: true,
                effect: false,
                powerOnBehavior: false,
                levelConfig: {
                    disabledFeatures: ['on_off_transition_time', 'on_transition_time', 'off_transition_time', 'current_level_startup'],
                },
            }),
            m.commandsOnOff({commands: ['on', 'off'], bind: true}),
            m.commandsLevelCtrl({
                commands: ['brightness_move_up', 'brightness_move_down', 'brightness_stop'],
                bind: true,
            }),
        ],
        whiteLabel: [
            {
                model: '43113',
                vendor: 'Enbrighten',
                description: 'Zigbee in-wall smart dimmer',
                fingerprint: [{modelID: '43113'}],
            },
            {
                model: '43090',
                vendor: 'Enbrighten',
                description: 'Zigbee in-wall smart toggle style dimmer',
                fingerprint: [{modelID: '43090'}],
            },
            {
                model: '43096',
                vendor: 'Enbrighten',
                description: 'Zigbee plug-in smart dimmer with dual outlets on one control',
                fingerprint: [{modelID: '43096'}],
            },
        ],
    },
    {
        zigbeeModel: ['43082'],
        model: '43082',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart dimmer',
        extend: [
            m.identify(),
            m.light({
                configureReporting: true,
                effect: false,
                powerOnBehavior: false,
                levelConfig: {
                    disabledFeatures: ['on_off_transition_time', 'on_transition_time', 'off_transition_time', 'current_level_startup'],
                },
            }),
            m.electricityMeter({cluster: 'metering'}),
            m.commandsOnOff({commands: ['on', 'off'], bind: true}),
            m.commandsLevelCtrl({
                commands: ['brightness_move_up', 'brightness_move_down', 'brightness_stop'],
                bind: true,
            }),
        ],
    },
];

export default definitions;
module.exports = definitions;
