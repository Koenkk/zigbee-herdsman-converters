const fz = require('../converters/fromZigbee');
const exposes = require('../lib/exposes');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require('../lib/tuya');


const essentialsValueConverter = {
    battery: {
        from: (value) => {
            return value > 130 ? 100 : value < 70 ? 0 : ((value - 70) * 1.7).toFixed(1);
        },
    },
    faultCode: {
        from: (value, meta) => {
            meta.logger.warn(`zigbee-herdsman-converters:essentialsThermostat: ERROR CODE received: ${JSON.stringify(value)}`);
            return value;
        },
    },
    away_setting: {
        from: (value) => {
            return {
                year: value[0] + 2000,
                month: value[1],
                day: value[2],
                hour: value[3],
                minute: value[4],
                away_preset_temperature: (value[5] / 2).toFixed(1),
                away_preset_days: value[6] << 8 | value[7],
            };
        },
        to: (value, meta) => {
            const output = new Uint8Array(8);
            // byte 0 - Start Year (0x00 = 2000)
            // byte 1 - Start Month
            // byte 2 - Start Day
            // byte 3 - Start Hour
            // byte 4 - Start Minute
            // byte 5 - Temperature (1~59 = 0.5~29.5°C (0.5 step))
            // byte 6-7 - Duration in Hours (0~2400 (100 days))
            output[0] = value.year > 2000 ? value.year - 2000 : value.year; // year
            output[1] = value.month; // month
            output[2] = value.day; // day
            output[3] = value.hour; // hour
            output[4] = value.minute; // min
            output[5] = Math.round(value.away_preset_temperature * 2);
            output[7] = value.away_preset_days & 0xFF;
            output[6] = value.away_preset_days >> 8;
            meta.logger.debug(JSON.stringify({'send to tuya': output, 'value was': value}));
        },
    },
    day_schedule: (day, index) => {
        return {
            from: (value) => {
                // byte 0 - Day of Week (0~7 = Mon ~ Sun) <- redundant?
                // byte 1 - 1st period Temperature (1~59 = 0.5~29.5°C (0.5 step))
                // byte 2 - 1st period end time (1~96 = 0:15 ~ 24:00 (15 min increment, i.e. 2 = 0:30, 3 = 0:45, ...))
                // byte 3 - 2nd period Temperature
                // byte 4 - 2nd period end time
                // ...
                // byte 14 - 7th period Temperature
                const datapoints = {};
                for (let i = 0; i < 9; i++) {
                    const tempIdx = i * 2 + 1;
                    const timeIdx = i * 2 + 2;
                    datapoints[`setpoint_${i + 1}_temperature`] = (value[tempIdx] / 2).toFixed(1);
                    if (i != 8) {
                        datapoints[`setpoint_${i + 1}_hour`] = Math.floor(value[timeIdx] / 4);
                        datapoints[`setpoint_${i + 1}_minute`] = (value[timeIdx] % 4) * 15;
                    }
                }
                return {[day]: datapoints};
            },
            to: (value, meta) => {
                // byte 0 - Day of Week (0~7 = Mon ~ Sun) <- redundant?
                // byte 1 - 1st period Temperature (1~59 = 0.5~29.5°C (0.5 step))
                // byte 2 - 1st period end time (1~96 = 0:15 ~ 24:00 (15 min increment, i.e. 2 = 0:30, 3 = 0:45, ...))
                // byte 3 - 2nd period Temperature
                // byte 4 - 2nd period end time
                // ...
                // byte 16 - 8th period end time
                // byte 17 - 9th period Temperature

                const output = new Uint8Array(18); // empty output byte buffer
                meta.logger.debug(`schedule update received for ${day}: ${JSON.stringify(value)}`);
                meta.logger.debug(`old schedule for ${day}: ${JSON.stringify(meta.state[day])}`);

                output[0] = index;

                let previousTime = 0;
                let finalIndex = 8;

                for (let i = 0; i < 9; i++) {
                    const temperatureProp = `setpoint_${i + 1}_temperature`;
                    const hourProp = `setpoint_${i + 1}_hour`;
                    const minuteProp = `setpoint_${i + 1}_minute`;

                    const temperature = value.hasOwnProperty(temperatureProp) ?
                        value[temperatureProp] :
                        (meta.state[day].hasOwnProperty(temperatureProp) ?
                            meta.state[day][temperatureProp] :
                            17); // default temperature if for some reason state and value are empty
                    const hour = value.hasOwnProperty(hourProp) ?
                        (i < 9 ? value[hourProp] : -1) : // no time 9th temperature, is until midnight
                        (meta.state[day].hasOwnProperty(hourProp) ?
                            meta.state[day][hourProp] :
                            24); // no schedule after this point, last temperature for the rest of the day
                    const minute = value.hasOwnProperty(minuteProp) ?
                        (i < 9 ? value[minuteProp] : -1) : // no time for 9th temperature, is until midnight
                        (meta.state[day].hasOwnProperty(minuteProp) ?
                            meta.state[day][minuteProp] :
                            0); // no schedule after this point, last temperature for the rest of the day

                    meta.logger.debug(`setpoint_${i + 1} temperature:${temperature} hour:${hour} minute:${minute})`);

                    const tempIdx = i * 2 + 1;
                    output[tempIdx] = Math.round(temperature * 2);
                    if (i < 9) {
                        const timeIdx = i * 2 + 2;
                        const maxTime = 24 * 4;
                        let encodedTime = Math.min(maxTime, hour * 4 + Math.floor((minute / 15)));
                        if (previousTime >= encodedTime) { // invalid entry
                            if (previousTime !== maxTime) {
                                meta.logger.error(
                                    `setpoint_${i + 1} time earlier than setpoint_${i} time, schedule will be cut off at setpoint_${i}`);
                            }
                            encodedTime = maxTime;
                            finalIndex = Math.min(finalIndex, i - 1);
                            output[(i - 1) * 2 + 2] = encodedTime; // schedule input ended with last entry
                        }
                        previousTime = encodedTime;
                        output[timeIdx] = encodedTime;
                    }
                }
                return output;
            },
        };
    },
};

const device = {
    fingerprint: tuya.fingerprint('TS0601', ['_TZE200_i48qyn9s']),
    model: 'Essentials Zigbee Radiator Thermostat',
    vendor: 'TuYa',
    description: 'Thermostat radiator valve',
    fromZigbee: [
        fz.ignore_basic_report,
        tuya.fzDataPoints,
    ],
    toZigbee: [tuya.tzDataPoints],
    onEvent: tuya.onEventSetLocalTime,
    exposes: [
        e.battery(),
        e.battery_low(),
        e.child_lock(),
        exposes.climate().withSetpoint('current_heating_setpoint', 0.5, 29.5, 0.5)
            .withLocalTemperature()
            .withLocalTemperatureCalibration(-12.5, 5.5, 0.1, ea.STATE_SET)
            .withSystemMode(['auto', 'heat', 'off'], ea.ALL,
                'Mode auto: schedule active. Mode heat: manual temperature setting. Mode off: "away" setting active'),
        e.comfort_temperature(),
        e.eco_temperature(),
        e.open_window_temperature()
            .withDescription('open winow detection temperature'),
        exposes.binary('window_open', ea.STATE, 'YES', 'NO')
            .withDescription('Open window detected'),
        exposes.numeric('detectwindow_timeminute', ea.STATE_SET)
            .withUnit('min')
            .withDescription('Open window time in minutes')
            .withValueMin(0).withValueMax(1000),
        exposes.composite('away_setting', 'away_setting')
            .withFeature(e.away_preset_days())
            .withFeature(e.away_preset_temperature())
            .withFeature(exposes.numeric('year', ea.STATE_SET).withUnit('year').withDescription('Start away year 20xx'))
            .withFeature(exposes.numeric('month', ea.STATE_SET).withUnit('month').withDescription('Start away month'))
            .withFeature(exposes.numeric('day', ea.STATE_SET).withUnit('day').withDescription('Start away day'))
            .withFeature(exposes.numeric('hour', ea.STATE_SET).withUnit('hour').withDescription('Start away hours'))
            .withFeature(exposes.numeric('minute', ea.STATE_SET).withUnit('min').withDescription('Start away minutes')),
        ...['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
            const composite = exposes.composite(day, day);
            [1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((i) => {
                composite.withFeature(exposes.numeric(`setpoint_${i}_temperature`, ea.STATE_SET)
                    .withUnit('°C')
                    .withValueMin(0.5)
                    .withValueMax(29.5)
                    .withValueStep(0.5)
                    .withDescription(`temperature ${i}${i == 9 ? ' (until 24:00)' : ''}`));
                if (i < 9) {
                    composite.withFeature(exposes.numeric(`setpoint_${i}_hour`, ea.STATE_SET)
                        .withUnit('hour')
                        .withValueMin(0)
                        .withValueMax(24)
                        .withValueStep(1)
                        .withDescription(`temperature ${i} until hour (time be later than the one at setpoint ${i - 1})`));
                    composite.withFeature(exposes.numeric(`setpoint_${i}_minute`, ea.STATE_SET)
                        .withUnit('minute')
                        .withValueMin(0)
                        .withValueMax(45)
                        .withValueStep(15)
                        .withDescription(`temperature ${i} until minute (time must be later than the one at setpoint ${i - 1})`));
                }
            });
            return composite;
        }),
    ],
    meta: {
        tuyaDatapoints: [
            [2, 'system_mode', tuya.valueConverterBasic.lookup({'auto': tuya.enum(0), 'heat': tuya.enum(1), 'off': tuya.enum(2)})],
            [16, 'current_heating_setpoint', tuya.valueConverterBasic.divideBy(2)],
            [24, 'local_temperature', tuya.valueConverter.divideBy10],
            [30, 'child_lock', tuya.valueConverter.lockUnlock],
            [34, 'battery', essentialsValueConverter.battery],
            [45, 'faultCode', essentialsValueConverter.faultCode],
            [101, 'comfort_temperature', tuya.valueConverter.divideBy10],
            [102, 'eco_temperature', tuya.valueConverter.divideBy10],
            [103, 'away_setting', essentialsValueConverter.away_setting],
            [104, 'local_temperature_calibration', tuya.valueConverter.localTempCalibration1],
            [105, 'schedule_override_setpoint', tuya.valueConverter.divideBy10],
            [106, null, null], // TODO rapid heating
            [107, 'window_open', tuya.valueConverter.lookup({'YES': true, 'NO': false})],
            [108, null, null], // TODO hibernate
            [109, 'monday', essentialsValueConverter.day_schedule('monday', 1)],
            [110, 'tuesday', essentialsValueConverter.day_schedule('tuesday', 2)],
            [111, 'wednesday', essentialsValueConverter.day_schedule('wednesday', 3)],
            [112, 'thursday', essentialsValueConverter.day_schedule('thursday', 4)],
            [113, 'friday', essentialsValueConverter.day_schedule('friday', 5)],
            [114, 'saturday', essentialsValueConverter.day_schedule('saturday', 6)],
            [115, 'sunday', essentialsValueConverter.day_schedule('sunday', 7)],
            [116, 'open_window_temperature', tuya.valueConverterBasic.divideBy(2)],
            [117, 'detectwindow_timeminute', tuya.valueConverterBasic.raw],
            [118, null, null], // TODO rapidHeatCntdownTimer
            [119, null, null], // TODO tempControl
            [120, null, null], // TODO requestUpdate
        ],
    },
};

module.exports = device;

