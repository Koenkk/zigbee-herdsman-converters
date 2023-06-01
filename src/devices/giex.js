const exposes = require('../lib/exposes');
const tuya = require('../lib/tuya');
const legacy = require('../lib/legacy');

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
            exposes.binary(legacy.giexWaterValve.state, ea.STATE_SET, 'ON', 'OFF')
                .withDescription('State'),
            exposes.enum(legacy.giexWaterValve.mode, ea.STATE_SET, ['duration', 'capacity'])
                .withDescription('Irrigation mode'),
            exposes.numeric(legacy.giexWaterValve.cycleIrrigationNumTimes, ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(100)
                .withDescription('Number of cycle irrigation times, set to 0 for single cycle'),
            exposes.numeric(legacy.giexWaterValve.irrigationStartTime, ea.STATE)
                .withDescription('Last irrigation start time'),
            exposes.numeric(legacy.giexWaterValve.irrigationEndTime, ea.STATE)
                .withDescription('Last irrigation end time'),
            exposes.numeric(legacy.giexWaterValve.lastIrrigationDuration, ea.STATE)
                .withDescription('Last irrigation duration'),
            exposes.numeric(legacy.giexWaterValve.waterConsumed, ea.STATE)
                .withUnit('L')
                .withDescription('Last irrigation water consumption'),
        ],
    },
};

module.exports = [
    // _TZE200_sh1btabb uses minutes, timezone is GMT+8
    {
        ...exportTemplates.giexWaterValve,
        model: 'QT06_1',
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_sh1btabb'},
        ],
        exposes: [
            ...exportTemplates.giexWaterValve.exposes,
            exposes.numeric(legacy.giexWaterValve.irrigationTarget, ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(MINUTES_IN_A_DAY)
                .withUnit('minutes or litres')
                .withDescription('Irrigation target, duration in minutes or capacity in litres (depending on mode)'),
            exposes.numeric(legacy.giexWaterValve.cycleIrrigationInterval, ea.STATE_SET)
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
        ],
        exposes: [
            ...exportTemplates.giexWaterValve.exposes,
            exposes.numeric(legacy.giexWaterValve.irrigationTarget, ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(SECONDS_IN_12_HOURS)
                .withUnit('seconds or litres')
                .withDescription('Irrigation target, duration in seconds or capacity in litres (depending on mode), ' +
                    'set to 0 to leave the valve on indefinitely, ' +
                    'for safety reasons the target will be forced to a minimum of 10 seconds in duration mode'),
            exposes.numeric(legacy.giexWaterValve.cycleIrrigationInterval, ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(SECONDS_IN_12_HOURS)
                .withUnit('sec')
                .withDescription('Cycle irrigation interval'),
        ],
    },
];
