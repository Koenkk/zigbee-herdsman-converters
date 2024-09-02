import * as exposes from '../lib/exposes';
import * as legacy from '../lib/legacy';
import * as tuya from '../lib/tuya';
import {DefinitionWithExtend} from '../lib/types';
const e = exposes.presets;

const {presets: ep, access: ea} = exposes;

const MINUTES_IN_A_DAY = 1440;
const SECONDS_IN_12_HOURS = 43200;

const exportTemplates = {
    giexWaterValve: {
        vendor: 'GiEX',
        description: 'Water irrigation valve',
        onEvent: tuya.onEventSetLocalTime,
        fromZigbee: [legacy.fromZigbee.giexWaterValve],
        toZigbee: [legacy.toZigbee.giexWaterValve],
        exposes: [
            ep.battery(),
            e.binary(legacy.giexWaterValve.state, ea.STATE_SET, 'ON', 'OFF').withDescription('State'),
            e.enum(legacy.giexWaterValve.mode, ea.STATE_SET, ['duration', 'capacity']).withDescription('Irrigation mode'),
            e
                .numeric(legacy.giexWaterValve.cycleIrrigationNumTimes, ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(100)
                .withDescription('Number of cycle irrigation times, set to 0 for single cycle'),
            e.numeric(legacy.giexWaterValve.irrigationStartTime, ea.STATE).withDescription('Last irrigation start time'),
            e.numeric(legacy.giexWaterValve.irrigationEndTime, ea.STATE).withDescription('Last irrigation end time'),
            e.numeric(legacy.giexWaterValve.lastIrrigationDuration, ea.STATE).withDescription('Last irrigation duration'),
            e.numeric(legacy.giexWaterValve.waterConsumed, ea.STATE).withUnit('L').withDescription('Last irrigation water consumption'),
        ],
    },
};

const definitions: DefinitionWithExtend[] = [
    // _TZE200_sh1btabb uses minutes, timezone is GMT+8
    {
        ...exportTemplates.giexWaterValve,
        model: 'QT06_1',
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_sh1btabb'}],
        exposes: [
            ...exportTemplates.giexWaterValve.exposes,
            e
                .numeric(legacy.giexWaterValve.irrigationTarget, ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(MINUTES_IN_A_DAY)
                .withUnit('minutes or litres')
                .withDescription('Irrigation target, duration in minutes or capacity in litres (depending on mode)'),
            e
                .numeric(legacy.giexWaterValve.cycleIrrigationInterval, ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(MINUTES_IN_A_DAY)
                .withUnit('min')
                .withDescription('Cycle irrigation interval'),
        ],
    },
    // _TZE200_a7sghmms uses seconds, timezone is local
    {
        ...exportTemplates.giexWaterValve,
        model: 'QT06_2',
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_a7sghmms'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_a7sghmms'},
            {modelID: 'TS0601', manufacturerName: '_TZE204_7ytb3h8u'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_7ytb3h8u'},
            {modelID: 'TS0601', manufacturerName: '_TZE284_7ytb3h8u'},
        ],
        exposes: [
            ...exportTemplates.giexWaterValve.exposes,
            e
                .numeric(legacy.giexWaterValve.irrigationTarget, ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(SECONDS_IN_12_HOURS)
                .withUnit('seconds or litres')
                .withDescription(
                    'Irrigation target, duration in seconds or capacity in litres (depending on mode), ' +
                        'set to 0 to leave the valve on indefinitely, ' +
                        'for safety reasons the target will be forced to a minimum of 10 seconds in duration mode',
                ),
            e
                .numeric(legacy.giexWaterValve.cycleIrrigationInterval, ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(SECONDS_IN_12_HOURS)
                .withUnit('sec')
                .withDescription('Cycle irrigation interval'),
        ],
        whiteLabel: [tuya.whitelabel('GiEX', 'GX02', 'Water valve', ['_TZE204_7ytb3h8u', '_TZE284_7ytb3h8u', '_TZE200_7ytb3h8u'])],
    },
];

export default definitions;
module.exports = definitions;
