const tuya = require('../lib/tuya');
const exposes = require('../lib/exposes');
const e = exposes.presets;
const ea = exposes.access;

const localValueConverter = {
    thermostatScheduleDay: {
        from: (v) => {
            const schedule = [];
            for (let index = 1; index < 17; index = index + 4) {
                schedule.push(
                    String(parseInt(v[index+0])).padStart(2, '0') + ':' +
                    String(parseInt(v[index+1])).padStart(2, '0') + '/' +
                    (parseFloat((v[index+2] << 8) + v[index+3]) / 10.0).toFixed(1),
                );
            }
            return schedule.join(' ');
        },
        to: (v) => {
            const payload = [0];
            const transitions = v.split(' ');
            if (transitions.length != 4) {
                throw new Error('Invalid schedule: there should be 4 transitions');
            }
            for (const transition of transitions) {
                const timeTemp = transition.split('/');
                if (timeTemp.length != 2) {
                    throw new Error('Invalid schedule: wrong transition format: ' + transition);
                }
                const hourMin = timeTemp[0].split(':');
                const hour = hourMin[0];
                const min = hourMin[1];
                const temperature = Math.floor(timeTemp[1] *10);
                if (hour < 0 || hour > 24 || min < 0 || min > 60 || temperature < 50 || temperature > 300) {
                    throw new Error('Invalid hour, minute or temperature of: ' + transition);
                }
                payload.push(
                    hour,
                    min,
                    (temperature & 0xff00) >> 8,
                    temperature & 0xff,
                );
            }
            return payload;
        },
    },
};

const tzLocal = {
    key: [
        'schedule_monday',
        'schedule_tuesday',
        'schedule_wednesday',
        'schedule_thursday',
        'schedule_friday',
        'schedule_saturday',
        'schedule_sunday',
    ],
    convertSet: async (entity, key, value, meta) => {
        const state = {};
        const datapoints = meta.mapped.meta.tuyaDatapoints;
        const dpEntry = datapoints.find((d) => d[1] === key);
        const dpId = dpEntry[0];
        const convertedValue = dpEntry[2].to(value, meta);
        await tuya.sendDataPointRaw(entity, dpId, convertedValue, 'dataRequest', 1);
        state[key] = value;
        return {state};
    },
};

const definition = [{
    zigbeeModel: ['TS0601'],
    fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_0hg58wyk'}],
    model: 'TS0601',
    vendor: 'Cloud Even',
    description: 'Cloud Even Thermostatic Radiator Valve',
    fromZigbee: [tuya.fzDataPoints],
    toZigbee: [tuya.tzDataPoints, tzLocal],
    onEvent: tuya.onEventSetLocalTime,
    configure: tuya.configureMagicPacket,
    meta: {
        tuyaDatapoints: [
            [1, 'system_mode', tuya.valueConverterBasic.lookup({'heat': false, 'off': true})],
            [2, 'preset', tuya.valueConverterBasic.lookup({'manual': tuya.enum(0), 'holiday': tuya.enum(1), 'program': tuya.enum(2)})],
            [3, null, null], // TODO: Unknown DP
            [8, 'open_window', tuya.valueConverter.onOff],
            [10, 'frost_protection', tuya.valueConverter.onOff],
            [16, 'current_heating_setpoint', tuya.valueConverter.divideBy10],
            [24, 'local_temperature', tuya.valueConverter.divideBy10],
            [27, 'local_temperature_calibration', tuya.valueConverter.localTempCalibration],
            [35, 'battery_low', tuya.valueConverter.true0ElseFalse],
            [40, 'child_lock', tuya.valueConverter.lockUnlock],
            [45, 'error_status', tuya.valueConverter.raw],
            [101, 'schedule_monday', localValueConverter.thermostatScheduleDay],
            [102, 'schedule_tuesday', localValueConverter.thermostatScheduleDay],
            [103, 'schedule_wednesday', localValueConverter.thermostatScheduleDay],
            [104, 'schedule_thursday', localValueConverter.thermostatScheduleDay],
            [105, 'schedule_friday', localValueConverter.thermostatScheduleDay],
            [106, 'schedule_saturday', localValueConverter.thermostatScheduleDay],
            [107, 'schedule_sunday', localValueConverter.thermostatScheduleDay],
        ],
    },
    exposes: [
        e.battery_low(),
        e.child_lock(),
        e.open_window(),
        exposes.climate().withSystemMode(['off', 'heat'], ea.STATE_SET)
            .withPreset(['manual', 'holiday', 'program'])
            .withLocalTemperatureCalibration(-5, 5, 0.1, ea.STATE_SET)
            .withLocalTemperature(ea.STATE).withSetpoint('current_heating_setpoint', 5, 30, 0.5, ea.STATE_SET),
        exposes.binary('frost_protection', ea.STATE_SET, 'ON', 'OFF'),
        exposes.text('schedule_monday', ea.STATE_SET)
            .withDescription('Monday Schedule, use this format: "HH:MM/C HH:MM/C HH:MM/C HH:MM/C"'),
        exposes.text('schedule_tuesday', ea.STATE_SET)
            .withDescription('Tuesday Schedule, use this format: "HH:MM/C HH:MM/C HH:MM/C HH:MM/C"'),
        exposes.text('schedule_wednesday', ea.STATE_SET)
            .withDescription('Wednesday Schedule, use this format: "HH:MM/C HH:MM/C HH:MM/C HH:MM/C"'),
        exposes.text('schedule_thursday', ea.STATE_SET)
            .withDescription('Thursday Schedule, use this format: "HH:MM/C HH:MM/C HH:MM/C HH:MM/C"'),
        exposes.text('schedule_friday', ea.STATE_SET)
            .withDescription('Friday Schedule, use this format: "HH:MM/C HH:MM/C HH:MM/C HH:MM/C"'),
        exposes.text('schedule_saturday', ea.STATE_SET)
            .withDescription('Saturday Schedule, use this format: "HH:MM/C HH:MM/C HH:MM/C HH:MM/C"'),
        exposes.text('schedule_sunday', ea.STATE_SET)
            .withDescription('Sunday Schedule, use this format: "HH:MM/C HH:MM/C HH:MM/C HH:MM/C"'),
        exposes.numeric('error_status', ea.STATE).withDescription('Error status'),
    ],
}];

module.exports = definition;
