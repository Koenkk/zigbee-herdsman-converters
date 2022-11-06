const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require('zigbee-herdsman-converters/lib/tuya');

const tuyaLocal = {
    dataPoints: {
        sh4Mode: 2,
        sh4HeatingSetpoint: 16,
        sh4LocalTemp: 24,
        sh4ChildLock: 30,
        sh4Battery: 34,
        sh4FaultCode: 45,
        sh4ComfortTemp: 101,
        sh4EcoTemp: 102,
        sh4VacationPeriod: 103,
        sh4TempCalibration: 104,
        sh4ScheduleTempOverride: 105,
        sh4RapidHeating: 106,
        sh4WindowStatus: 107,
        sh4Hibernate: 108,
        sh4ScheduleMon: 109,
        sh4ScheduleTue: 110,
        sh4ScheduleWed: 111,
        sh4ScheduleThu: 112,
        sh4ScheduleFri: 113,
        sh4ScheduleSat: 114,
        sh4ScheduleSun: 115,
        sh4OpenWindowTemp: 116,
        sh4OpenWindowTime: 117,
        sh4RapidHeatCntdownTimer: 118,
        sh4TempControl: 119,
        sh4RequestUpdate: 120,
    },
};
const fzLocal = {
    sh4_thermostat: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport'],
        convert: (model, msg, publish, options, meta) => {
            // const dp = msg.data.dp;
            // const value = tuya.getDataValue(msg.data.datatype, msg.data.data);
            const dpValue = tuya.firstDpValue(msg, meta, 'sh4_thermostat');
            const dp = dpValue.dp;
            const value = tuya.getDataValue(dpValue);
            function weeklySchedule(dayIndex, value) {
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
                const weekDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
                const day = weekDays[dayIndex];
                return {[day]: datapoints};
            }
            switch (dp) {
            case tuyaLocal.dataPoints.sh4Mode: // 2
                // 0-Schedule; 1-Manual; 2-Away
                if (value == 0) {
                    return {
                        system_mode: 'auto',
                        current_heating_setpoint: meta.state.schedule_heating_setpoint_override,
                    };
                } else if (value == 1) {
                    return {
                        system_mode: 'heat',
                        current_heating_setpoint: meta.state.manual_heating_setpoint,
                    };
                } else if (value == 2) {
                    return {
                        system_mode: 'off',
                        current_heating_setpoint: -1, // need implement read away_preset_temperature
                    };
                }
                meta.logger.warn(`zigbee-herdsman-converters:essentialsThermostat: NOT RECOGNIZED MODE #${value}`);
                break;
            case tuyaLocal.dataPoints.sh4HeatingSetpoint: // 16
                // 0 - Valve full OFF, 60 - Valve full ON : only in "manual" mode
                return {
                    manual_heating_setpoint: (value / 2).toFixed(1),
                    current_heating_setpoint: (value / 2).toFixed(1),
                };
            case tuyaLocal.dataPoints.sh4LocalTemp: // 24
                return {local_temperature: (value / 10).toFixed(1)};
            case tuyaLocal.dataPoints.sh4ChildLock: // 30
                return {child_lock: value ? 'LOCK' : 'UNLOCK'};
            case tuyaLocal.dataPoints.sh4Battery: // 34
                return {
                    battery: value > 130 ? 100 : value < 70 ? 0 : ((value - 70) * 1.7).toFixed(1),
                    battery_low: value < 90,
                };
            case tuyaLocal.dataPoints.sh4FaultCode: // 45
                meta.logger.warn(`zigbee-herdsman-converters:essentialsThermostat: ERROR CODE received: ${JSON.stringify(msg.data)}`);
                break;
            case tuyaLocal.dataPoints.sh4ComfortTemp: // 101
                return {comfort_temperature: (value / 2).toFixed(1)};
            case tuyaLocal.dataPoints.sh4EcoTemp: // 102
                return {eco_temperature: (value / 2).toFixed(1)};
            case tuyaLocal.dataPoints.sh4VacationPeriod: // 103
                return {
                    away_setting: {
                        year: value[0] + 2000,
                        month: value[1],
                        day: value[2],
                        hour: value[3],
                        minute: value[4],
                        away_preset_temperature: (value[5] / 2).toFixed(1),
                        away_preset_days: value[6] << 8 | value[7],
                    },
                };
                // byte 0 - Start Year (0x00 = 2000)
                // byte 1 - Start Month
                // byte 2 - Start Day
                // byte 3 - Start Hour
                // byte 4 - Start Minute
                // byte 5 - Temperature (1~59 = 0.5~29.5°C (0.5 step))
                // byte 6-7 - Duration in Hours (0~2400 (100 days))
            case tuyaLocal.dataPoints.sh4TempCalibration: // 104
                return {
                    local_temperature_calibration: value > 55 ?
                        ((value - 0x100000000) / 10).toFixed(1) : (value / 10).toFixed(1),
                };
            case tuyaLocal.dataPoints.sh4ScheduleTempOverride: // 105
                if (meta.state.system_mode == 'auto') {
                    return {
                        schedule_heating_setpoint_override: (value / 2).toFixed(1),
                        current_heating_setpoint: (value / 2).toFixed(1),
                    };
                } else {
                    return {schedule_heating_setpoint_override: (value / 2).toFixed(1)};
                }
            case tuyaLocal.dataPoints.sh4RapidHeating: // 106
                break; // TODO
            case tuyaLocal.dataPoints.sh4WindowStatus: // 107
                return {window_open: value ? 'YES' : 'NO'};
            case tuyaLocal.dataPoints.sh4Hibernate: // 108
                break; // TODO
            case tuyaLocal.dataPoints.sh4ScheduleMon: // 109
                return weeklySchedule(0, value);
            case tuyaLocal.dataPoints.sh4ScheduleTue: // 110
                return weeklySchedule(1, value);
            case tuyaLocal.dataPoints.sh4ScheduleWed: // 111
                return weeklySchedule(2, value);
            case tuyaLocal.dataPoints.sh4ScheduleThu: // 112
                return weeklySchedule(3, value);
            case tuyaLocal.dataPoints.sh4ScheduleFri: // 113
                return weeklySchedule(4, value);
            case tuyaLocal.dataPoints.sh4ScheduleSat: // 114
                return weeklySchedule(5, value);
            case tuyaLocal.dataPoints.sh4ScheduleSun: // 115
                return weeklySchedule(6, value);
            case tuyaLocal.dataPoints.sh4OpenWindowTemp: // 116
                return {open_window_temperature: (value / 2).toFixed(1)};
            case tuyaLocal.dataPoints.sh4OpenWindowTime: // 117
                return {detectwindow_timeminute: value};
            case tuyaLocal.dataPoints.sh4RapidHeatCntdownTimer: // 118
                break; // TODO
            case tuyaLocal.dataPoints.sh4TempControl: // 119
                break; // TODO
            case tuyaLocal.dataPoints.sh4RequestUpdate: // 120
                break; // TODO
            default:
                meta.logger.error(
                    `zigbee-herdsman-converters:essentialsThermostat: NOT RECOGNIZED DP #${dp} with data ${JSON.stringify(msg.data)}`);
            }
        },
    },
};

const tzLocal = {
    sh4_thermostat_current_heating_setpoint: {
        key: ['current_heating_setpoint'],
        convertSet: async (entity, key, value, meta) => {
            const temp = Math.round(value * 2);
            if (meta.state.system_mode == 'heat') {
                await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.sh4HeatingSetpoint, temp);
            } else if (meta.state.system_mode == 'auto') {
                await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.sh4ScheduleTempOverride, temp);
            }
        },
        convertGet: async (entity, key, value, meta) => {
            await tuya.sendDataPointEnum(entity, tuyaLocal.dataPoints.sh4RequestUpdate, 0);
        },
    },
    sh4_thermostat_comfort_temp_preset: {
        key: ['comfort_temperature'],
        convertSet: async (entity, key, value, meta) => {
            const temp = Math.round(value * 2);
            await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.sh4ComfortTemp, temp);
        },
    },
    sh4_thermostat_eco_temp_preset: {
        key: ['eco_temperature'],
        convertSet: async (entity, key, value, meta) => {
            const temp = Math.round(value * 2);
            await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.sh4EcoTemp, temp);
        },
    },
    sh4_thermostat_schedule_override_setpoint: {
        key: ['schedule_override_setpoint'],
        convertSet: async (entity, key, value, meta) => {
            const temp = Math.round(value * 2);
            await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.sh4ScheduleTempOverride, temp);
        },
    },
    sh4_thermostat_get_data: {
        key: ['local_temperature'],
        convertGet: async (entity, key, value, meta) => {
            await tuya.sendDataPointEnum(entity, tuyaLocal.dataPoints.sh4RequestUpdate, 0);
        },
    },
    sh4_thermostat_mode: {
        key: ['system_mode'],
        convertSet: async (entity, key, value, meta) => {
            if (value == 'auto') {
                await tuya.sendDataPointEnum(entity, tuyaLocal.dataPoints.sh4Mode, 0);
            } else if (value == 'heat') {
                await tuya.sendDataPointEnum(entity, tuyaLocal.dataPoints.sh4Mode, 1);
            } else if (value == 'off') {
                await tuya.sendDataPointEnum(entity, tuyaLocal.dataPoints.sh4Mode, 2);
                // await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.sh4HeatingSetpoint, 0);
            }
        },
        convertGet: async (entity, key, value, meta) => {
            await tuya.sendDataPointEnum(entity, tuyaLocal.dataPoints.sh4RequestUpdate, 0);
        },
    },
    sh4_thermostat_open_window_temp: {
        key: ['open_window_temperature'],
        convertSet: async (entity, key, value, meta) => {
            let temp = Math.round(value * 2);
            if (temp <= 0) temp = 1;
            if (temp >= 60) temp = 59;
            await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.sh4OpenWindowTemp, temp);
        },
    },
    sh4_thermostat_open_window_time: {
        key: ['detectwindow_timeminute'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.sh4OpenWindowTime, value);
        },
    },
    sh4_thermostat_away: {
        key: ['away_setting'],
        convertSet: async (entity, key, value, meta) => {
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
            meta.logger.info(JSON.stringify({'send to tuya': output, 'value was': value, 'key was': key}));
            await tuya.sendDataPointRaw(entity, tuyaLocal.dataPoints.sh4VacationPeriod, output);
        },
    },
    sh4_thermostat_schedule: {
        key: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        convertSet: async (entity, key, value, meta) => {
            // byte 0 - Day of Week (0~7 = Mon ~ Sun) <- redundant?
            // byte 1 - 1st period Temperature (1~59 = 0.5~29.5°C (0.5 step))
            // byte 2 - 1st period end time (1~96 = 0:15 ~ 24:00 (15 min increment, i.e. 2 = 0:30, 3 = 0:45, ...))
            // byte 3 - 2nd period Temperature
            // byte 4 - 2nd period end time
            // ...
            // byte 16 - 8th period end time
            // byte 17 - 9th period Temperature

            const output = new Uint8Array(18); // empty output byte buffer
            meta.logger.info(`schedule update received for ${key}: ${JSON.stringify(value)}`);
            meta.logger.info(`old schedule for ${key}: ${JSON.stringify(meta.state[key])}`);

            const dayNo = tzLocal.sh4_thermostat_schedule.key.indexOf(key);

            output[0] = dayNo + 1;

            let previousTime = 0;
            let finalIndex = 8;

            for (let i = 0; i < 9; i++) {
                const temperatureProp = `setpoint_${i + 1}_temperature`;
                const hourProp = `setpoint_${i + 1}_hour`;
                const minuteProp = `setpoint_${i + 1}_minute`;

                const temperature = value.hasOwnProperty(temperatureProp) ?
                    value[temperatureProp] :
                    (meta.state[key].hasOwnProperty(temperatureProp) ?
                        meta.state[key][temperatureProp] :
                        17); // default temperature if for some reason state and value are empty
                const hour = value.hasOwnProperty(hourProp) ?
                    (i < 9 ? value[hourProp] : -1) : // no time 9th temperature, is until midnight
                    (meta.state[key].hasOwnProperty(hourProp) ?
                        meta.state[key][hourProp] :
                        24); // no schedule after this point, last temperature for the rest of the day
                const minute = value.hasOwnProperty(minuteProp) ?
                    (i < 9 ? value[minuteProp] : -1) : // no time for 9th temperature, is until midnight
                    (meta.state[key].hasOwnProperty(minuteProp) ?
                        meta.state[key][minuteProp] :
                        0); // no schedule after this point, last temperature for the rest of the day

                meta.logger.info(`setpoint_${i + 1} temperature:${temperature} hour:${hour} minute:${minute})`);

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

            meta.logger.info(`Schedule with ${finalIndex + 1} entries for ${key} sent to thermostat`);

            await tuya.sendDataPointRaw(entity, tuyaLocal.dataPoints.sh4ScheduleMon + dayNo, output);
        },
    },
    sh4_thermostat_child_lock: {
        key: ['child_lock'],
        convertSet: async (entity, key, value, meta) => {
            await tuya.sendDataPointBool(entity, tuyaLocal.dataPoints.sh4ChildLock,
                ['LOCKED', 'ON', 'LOCK'].includes(value.toUpperCase()));
        },
    },
    sh4_thermostat_calibration: {
        key: ['local_temperature_calibration'],
        convertSet: async (entity, key, value, meta) => {
            if (value > 0) value = value * 10;
            if (value < 0) value = value * 10 + 0x100000000;
            await tuya.sendDataPointValue(entity, tuyaLocal.dataPoints.sh4TempCalibration, value);
        },
    },
};

const device = {
    fingerprint: [
        {
            modelID: 'TS0601',
            manufacturerName: '_TZE200_i48qyn9s',
        },
    ],
    model: 'SH4 Zigbee eTRV',
    vendor: 'Tuya',
    description: 'Zigbee Radiator Thermostat',
    fromZigbee: [
        fz.ignore_basic_report,
        fzLocal.sh4_thermostat,
    ],
    toZigbee: [
        tzLocal.sh4_thermostat_current_heating_setpoint,
        tzLocal.sh4_thermostat_comfort_temp_preset,
        tzLocal.sh4_thermostat_eco_temp_preset,
        tzLocal.sh4_thermostat_away,
        tzLocal.sh4_thermostat_mode,
        tzLocal.sh4_thermostat_child_lock,
        tzLocal.sh4_thermostat_calibration,
        tzLocal.sh4_thermostat_schedule_override_setpoint,
        tzLocal.sh4_thermostat_schedule,
        tzLocal.sh4_thermostat_get_data,
        tzLocal.sh4_thermostat_open_window_temp,
        tzLocal.sh4_thermostat_open_window_time,
    ],
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
};

module.exports = device;

