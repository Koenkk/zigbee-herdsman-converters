'use strict';

const constants = require('./constants');
const globalStore = require('./store');
const exposes = require('./exposes');
const utils = require('./utils');
const e = exposes.presets;
const ea = exposes.access;

const dataTypes = {
    raw: 0, // [ bytes ]
    bool: 1, // [0/1]
    value: 2, // [ 4 byte value ]
    string: 3, // [ N byte string ]
    enum: 4, // [ 0-255 ]
    bitmap: 5, // [ 1,2,4 bytes ] as bits
};

const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
    // Destructuring "chunks" is needed because it's a Buffer
    // and we need a simple array.
    let value = 0;
    for (let i = 0; i < chunks.length; i++) {
        value = value << 8;
        value += chunks[i];
    }
    return value;
};

function getDataValue(dpValue) {
    switch (dpValue.datatype) {
    case dataTypes.raw:
        return dpValue.data;
    case dataTypes.bool:
        return dpValue.data[0] === 1;
    case dataTypes.value:
        return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    case dataTypes.string:
        // eslint-disable-next-line
        let dataString = '';
        // Don't use .map here, doesn't work: https://github.com/Koenkk/zigbee-herdsman-converters/pull/1799/files#r530377091
        for (let i = 0; i < dpValue.data.length; ++i) {
            dataString += String.fromCharCode(dpValue.data[i]);
        }
        return dataString;
    case dataTypes.enum:
        return dpValue.data[0];
    case dataTypes.bitmap:
        return convertMultiByteNumberPayloadToSingleDecimalNumber(dpValue.data);
    }
}

function convertDecimalValueTo4ByteHexArray(value) {
    const hexValue = Number(value).toString(16).padStart(8, '0');
    const chunk1 = hexValue.substr(0, 2);
    const chunk2 = hexValue.substr(2, 2);
    const chunk3 = hexValue.substr(4, 2);
    const chunk4 = hexValue.substr(6);
    return [chunk1, chunk2, chunk3, chunk4].map((hexVal) => parseInt(hexVal, 16));
}

function convertDecimalValueTo2ByteHexArray(value) {
    const hexValue = Number(value).toString(16).padStart(4, '0');
    const chunk1 = hexValue.substr(0, 2);
    const chunk2 = hexValue.substr(2);
    return [chunk1, chunk2].map((hexVal) => parseInt(hexVal, 16));
}

async function onEventMeasurementPoll(type, data, device, options, electricalMeasurement=true, metering=false) {
    const endpoint = device.getEndpoint(1);
    if (type === 'stop') {
        clearTimeout(globalStore.getValue(device, 'measurement_poll'));
        globalStore.clearValue(device, 'measurement_poll');
    } else if (!globalStore.hasValue(device, 'measurement_poll')) {
        const seconds = options && options.measurement_poll_interval ? options.measurement_poll_interval : 60;
        if (seconds === -1) return;
        const setTimer = () => {
            const timer = setTimeout(async () => {
                try {
                    if (electricalMeasurement) {
                        await endpoint.read('haElectricalMeasurement', ['rmsVoltage', 'rmsCurrent', 'activePower']);
                    }
                    if (metering) {
                        await endpoint.read('seMetering', ['currentSummDelivered']);
                    }
                } catch (error) {/* Do nothing*/}
                setTimer();
            }, seconds * 1000);
            globalStore.putValue(device, 'measurement_poll', timer);
        };
        setTimer();
    }
}

async function onEventSetTime(type, data, device) {
    // FIXME: Need to join onEventSetTime/onEventSetLocalTime to one command

    if (data.type === 'commandMcuSyncTime' && data.cluster === 'manuSpecificTuya') {
        try {
            const utcTime = Math.round(((new Date()).getTime() - constants.OneJanuary2000) / 1000);
            const localTime = utcTime - (new Date()).getTimezoneOffset() * 60;
            const endpoint = device.getEndpoint(1);

            const payload = {
                payloadSize: 8,
                payload: [
                    ...convertDecimalValueTo4ByteHexArray(utcTime),
                    ...convertDecimalValueTo4ByteHexArray(localTime),
                ],
            };
            await endpoint.command('manuSpecificTuya', 'mcuSyncTime', payload, {});
        } catch (error) {
            // endpoint.command can throw an error which needs to
            // be caught or the zigbee-herdsman may crash
            // Debug message is handled in the zigbee-herdsman
        }
    }
}

// set UTC and Local Time as total number of seconds from 00: 00: 00 on January 01, 1970
// force to update every device time every hour due to very poor clock
async function onEventSetLocalTime(type, data, device) {
    // FIXME: What actually nextLocalTimeUpdate/forceTimeUpdate do?
    //  I did not find any timers or something else where it was used.
    //  Actually, there are two ways to set time on TuYa MCU devices:
    //  1. Respond to the `commandMcuSyncTime` event
    //  2. Just send `mcuSyncTime` anytime (by 1-hour timer or something else)

    const nextLocalTimeUpdate = globalStore.getValue(device, 'nextLocalTimeUpdate');
    const forceTimeUpdate = nextLocalTimeUpdate == null || nextLocalTimeUpdate < new Date().getTime();

    if ((data.type === 'commandMcuSyncTime' && data.cluster === 'manuSpecificTuya') || forceTimeUpdate) {
        globalStore.putValue(device, 'nextLocalTimeUpdate', new Date().getTime() + 3600 * 1000);

        try {
            const utcTime = Math.round(((new Date()).getTime()) / 1000);
            const localTime = utcTime - (new Date()).getTimezoneOffset() * 60;
            const endpoint = device.getEndpoint(1);

            const payload = {
                payloadSize: 8,
                payload: [
                    ...convertDecimalValueTo4ByteHexArray(utcTime),
                    ...convertDecimalValueTo4ByteHexArray(localTime),
                ],
            };
            await endpoint.command('manuSpecificTuya', 'mcuSyncTime', payload, {});
        } catch (error) {
            // endpoint.command can throw an error which needs to
            // be caught or the zigbee-herdsman may crash
            // Debug message is handled in the zigbee-herdsman
        }
    }
}

// Return `seq` - transaction ID for handling concrete response
async function sendDataPoints(entity, dpValues, cmd, seq=undefined) {
    if (seq === undefined) {
        if (sendDataPoints.seq === undefined) {
            sendDataPoints.seq = 0;
        } else {
            sendDataPoints.seq++;
            sendDataPoints.seq %= 0xFFFF;
        }
        seq = sendDataPoints.seq;
    }

    await entity.command(
        'manuSpecificTuya',
        cmd || 'dataRequest',
        {
            seq,
            dpValues,
        },
        {disableDefaultResponse: true},
    );
    return seq;
}

function dpValueFromIntValue(dp, value) {
    return {dp, datatype: dataTypes.value, data: convertDecimalValueTo4ByteHexArray(value)};
}

function dpValueFromBool(dp, value) {
    return {dp, datatype: dataTypes.bool, data: [value ? 1 : 0]};
}

function dpValueFromEnum(dp, value) {
    return {dp, datatype: dataTypes.enum, data: [value]};
}

function dpValueFromStringBuffer(dp, stringBuffer) {
    return {dp, datatype: dataTypes.string, data: stringBuffer};
}

function dpValueFromRaw(dp, rawBuffer) {
    return {dp, datatype: dataTypes.raw, data: rawBuffer};
}

function dpValueFromBitmap(dp, bitmapBuffer) {
    return {dp, datatype: dataTypes.bitmap, data: bitmapBuffer};
}

async function sendDataPointValue(entity, dp, value, cmd, seq=undefined) {
    return await sendDataPoints(entity, [dpValueFromIntValue(dp, value)], cmd, seq);
}

async function sendDataPointBool(entity, dp, value, cmd, seq=undefined) {
    return await sendDataPoints(entity, [dpValueFromBool(dp, value)], cmd, seq);
}

async function sendDataPointEnum(entity, dp, value, cmd, seq=undefined) {
    return await sendDataPoints(entity, [dpValueFromEnum(dp, value)], cmd, seq);
}

async function sendDataPointRaw(entity, dp, value, cmd, seq=undefined) {
    return await sendDataPoints(entity, [dpValueFromRaw(dp, value)], cmd, seq);
}

async function sendDataPointBitmap(entity, dp, value, cmd, seq=undefined) {
    return await sendDataPoints(entity, [dpValueFromBitmap(dp, value)], cmd, seq);
}

async function sendDataPointStringBuffer(entity, dp, value, cmd, seq=undefined) {
    return await sendDataPoints(entity, [dpValueFromStringBuffer(dp, value)], cmd, seq);
}

const tuyaExposes = {
    lightType: () => exposes.enum('light_type', ea.STATE_SET, ['led', 'incandescent', 'halogen'])
        .withDescription('Type of light attached to the device'),
    lightBrightnessWithMinMax: () => e.light_brightness().withMinBrightness().withMaxBrightness()
        .setAccess('state', ea.STATE_SET)
        .setAccess('brightness', ea.STATE_SET)
        .setAccess('min_brightness', ea.STATE_SET)
        .setAccess('max_brightness', ea.STATE_SET),
    lightBrightness: () => e.light_brightness()
        .setAccess('state', ea.STATE_SET)
        .setAccess('brightness', ea.STATE_SET),
    countdown: () => exposes.numeric('countdown', ea.STATE_SET).withValueMin(0).withValueMax(43200).withValueStep(1).withUnit('s')
        .withDescription('Countdown to turn device off after a certain time'),
    switch: () => e.switch().setAccess('state', ea.STATE_SET),
    selfTest: () => exposes.binary('self_test', ea.STATE_SET, true, false)
        .withDescription('Indicates whether the device is being self-tested'),
    selfTestResult: () => exposes.enum('self_test_result', ea.STATE, ['checking', 'success', 'failure', 'others'])
        .withDescription('Result of the self-test'),
    faultAlarm: () => exposes.binary('fault_alarm', ea.STATE, true, false).withDescription('Indicates whether a fault was detected'),
    silence: () => exposes.binary('silence', ea.STATE_SET, true, false).withDescription('Silence the alarm'),
    frostProtection: (extraNote='') => exposes.binary('frost_protection', ea.STATE_SET, 'ON', 'OFF').withDescription(
        `When Anti-Freezing function is activated, the temperature in the house is kept at 8 °C.${extraNote}`),
    errorStatus: () => exposes.numeric('error_status', ea.STATE).withDescription('Error status'),
    scheduleAllDays: (access, format) => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        .map((day) => exposes.text(`schedule_${day}`, access).withDescription(`Schedule for ${day}, format: "${format}"`)),
    temperatureUnit: () => exposes.enum('temperature_unit', ea.STATE_SET, ['celsius', 'fahrenheit']).withDescription('Temperature unit'),
    temperatureCalibration: () => exposes.numeric('temperature_calibration', ea.STATE_SET).withValueMin(-2.0).withValueMax(2.0)
        .withValueStep(0.1).withUnit('°C').withDescription('Temperature calibration'),
    humidityCalibration: () => exposes.numeric('humidity_calibration', ea.STATE_SET).withValueMin(-30).withValueMax(30)
        .withValueStep(1).withUnit('%').withDescription('Humidity calibration'),
    gasValue: () => exposes.numeric('gas_value', ea.STATE).withDescription('Measured gas concentration'),
    energyWithPhase: (phase) => exposes.numeric(`energy_${phase}`, ea.STATE).withUnit('kWh')
        .withDescription(`Sum of consumed energy (phase ${phase.toUpperCase()})`),
    voltageWithPhase: (phase) => exposes.numeric(`voltage_${phase}`, ea.STATE).withUnit('V')
        .withDescription(`Measured electrical potential value (phase ${phase.toUpperCase()})`),
    powerWithPhase: (phase) => exposes.numeric(`power_${phase}`, ea.STATE).withUnit('W')
        .withDescription(`Instantaneous measured power (phase ${phase.toUpperCase()})`),
    currentWithPhase: (phase) => exposes.numeric(`current_${phase}`, ea.STATE).withUnit('A')
        .withDescription(`Instantaneous measured electrical current (phase ${phase.toUpperCase()})`),
    powerFactorWithPhase: (phase) => exposes.numeric(`power_factor_${phase}`, ea.STATE).withUnit('%')
        .withDescription(`Instantaneous measured power factor (phase ${phase.toUpperCase()})`),
    switchType: () => exposes.enum('switch_type', ea.ALL, ['toggle', 'state', 'momentary']).withDescription('Type of the switch'),
    backlightModeLowMediumHigh: () => exposes.enum('backlight_mode', ea.ALL, ['low', 'medium', 'high'])
        .withDescription('Intensity of the backlight'),
    backlightModeOffNormalInverted: () => exposes.enum('backlight_mode', ea.ALL, ['off', 'normal', 'inverted'])
        .withDescription('Mode of the backlight'),
    backlightModeOffOn: () => exposes.binary('backlight_mode', ea.ALL, 'ON', 'OFF').withDescription(`Mode of the backlight`),
    indicatorMode: () => exposes.enum('indicator_mode', ea.ALL, ['off', 'off/on', 'on/off', 'on']).withDescription('LED indicator mode'),
    indicatorModeNoneRelayPos: () => exposes.enum('indicator_mode', ea.ALL, ['none', 'relay', 'pos'])
        .withDescription('Mode of the indicator light'),
    powerOutageMemory: () => exposes.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore'])
        .withDescription('Recover state after power outage'),
    batteryState: () => exposes.enum('battery_state', ea.STATE, ['low', 'medium', 'high']).withDescription('State of the battery'),
    doNotDisturb: () => exposes.binary('do_not_disturb', ea.STATE_SET, true, false)
        .withDescription('Do not disturb mode, when enabled this function will keep the light OFF after a power outage'),
    colorPowerOnBehavior: () => exposes.enum('color_power_on_behavior', ea.STATE_SET, ['initial', 'previous', 'cutomized'])
        .withDescription('Power on behavior state'),
};

const skip = {
    // Prevent state from being published when already ON and brightness is also published.
    // This prevents 100% -> X% brightness jumps when the switch is already on
    // https://github.com/Koenkk/zigbee2mqtt/issues/13800#issuecomment-1263592783
    stateOnAndBrightnessPresent: (meta) => meta.message.hasOwnProperty('brightness') && meta.state.state === 'ON',
};

const configureMagicPacket = async (device, coordinatorEndpoint, logger) => {
    try {
        const endpoint = device.endpoints[0];
        await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
    } catch (e) {
        // Fails for some TuYa devices with UNSUPPORTED_ATTRIBUTE, ignore that.
        // e.g. https://github.com/Koenkk/zigbee2mqtt/issues/14857
        if (e.message.includes('UNSUPPORTED_ATTRIBUTE')) {
            logger.debug('TuYa configureMagicPacket failed, ignoring...');
        } else {
            throw e;
        }
    }
};

const fingerprint = (modelID, manufacturerNames) => {
    return manufacturerNames.map((manufacturerName) => {
        return {modelID, manufacturerName};
    });
};

const whitelabel = (vendor, model, description, manufacturerNames) => {
    const fingerprint = manufacturerNames.map((manufacturerName) => {
        return {manufacturerName};
    });
    return {vendor, model, description, fingerprint};
};

class Base {
    constructor(value) {
        this.value = value;
    }

    valueOf() {
        return this.value;
    }
}

class Enum extends Base {
    constructor(value) {
        super(value);
    }
}

class Bitmap extends Base {
    constructor(value) {
        super(value);
    }
}

const valueConverterBasic = {
    lookup: (map) => {
        return {
            to: (v) => {
                if (map[v] === undefined) throw new Error(`Value '${v}' is not allowed, expected one of ${Object.keys(map)}`);
                return map[v];
            },
            from: (v) => {
                const value = Object.entries(map).find((i) => i[1].valueOf() === v);
                if (!value) throw new Error(`Value '${v}' is not allowed, expected one of ${Object.values(map)}`);
                return value[0];
            },
        };
    },
    scale: (min1, max1, min2, max2) => {
        return {to: (v) => utils.mapNumberRange(v, min1, max1, min2, max2), from: (v) => utils.mapNumberRange(v, min2, max2, min1, max1)};
    },
    raw: () => {
        return {to: (v) => v, from: (v) => v};
    },
    divideBy: (value) => {
        return {to: (v) => v * value, from: (v) => v / value};
    },
    trueFalse: (valueTrue) => {
        return {from: (v) => v === valueTrue};
    },
};

const valueConverter = {
    trueFalse0: valueConverterBasic.trueFalse(0),
    trueFalse1: valueConverterBasic.trueFalse(1),
    trueFalseInvert: {
        to: (v) => !v,
        from: (v) => !v,
    },
    trueFalseEnum0: valueConverterBasic.trueFalse(new Enum(0)),
    onOff: valueConverterBasic.lookup({'ON': true, 'OFF': false}),
    powerOnBehavior: valueConverterBasic.lookup({'off': 0, 'on': 1, 'previous': 2}),
    lightType: valueConverterBasic.lookup({'led': 0, 'incandescent': 1, 'halogen': 2}),
    countdown: valueConverterBasic.raw(),
    scale0_254to0_1000: valueConverterBasic.scale(0, 254, 0, 1000),
    scale0_1to0_1000: valueConverterBasic.scale(0, 1, 0, 1000),
    divideBy100: valueConverterBasic.divideBy(100),
    temperatureUnit: valueConverterBasic.lookup({'celsius': 0, 'fahrenheit': 1}),
    batteryState: valueConverterBasic.lookup({'low': 0, 'medium': 1, 'high': 2}),
    divideBy10: valueConverterBasic.divideBy(10),
    divideBy1000: valueConverterBasic.divideBy(1000),
    raw: valueConverterBasic.raw(),
    setLimit: {
        to: (v) => {
            if (!v) throw new Error('Limit cannot be unset, use factory_reset');
            return v;
        },
        from: (v) => v,
    },
    coverPosition: {
        to: async (v, meta) => {
            return meta.options.invert_cover ? 100 - v : v;
        },
        from: (v, meta, options) => {
            return options.invert_cover ? 100 - v : v;
        },
    },
    plus1: {
        from: (v) => v + 1,
        to: (v) => v - 1,
    },
    static: (value) => {
        return {
            from: (v) => {
                return value;
            },
        };
    },
    phaseVariant1: {
        from: (v) => {
            const buffer = Buffer.from(v, 'base64');
            return {voltage: (buffer[14] | buffer[13] << 8) / 10, current: (buffer[12] | buffer[11] << 8) / 1000};
        },
    },
    phaseVariant2: {
        from: (v) => {
            const buf = Buffer.from(v, 'base64');
            return {voltage: (buf[1] | buf[0] << 8) / 10, current: (buf[4] | buf[3] << 8) / 1000, power: (buf[7] | buf[6] << 8)};
        },
    },
    phaseVariant2WithPhase: (phase) => {
        return {
            from: (v) => {
                const buf = Buffer.from(v, 'base64');
                return {
                    [`voltage_${phase}`]: (buf[1] | buf[0] << 8) / 10,
                    [`current_${phase}`]: (buf[4] | buf[3] << 8) / 1000,
                    [`power_${phase}`]: (buf[7] | buf[6] << 8)};
            },
        };
    },
    threshold: {
        from: (v) => {
            const buffer = Buffer.from(v, 'base64');
            const stateLookup = {0: 'not_set', 1: 'over_current_threshold', 3: 'over_voltage_threshold'};
            const protectionLookup = {0: 'OFF', 1: 'ON'};
            return {
                threshold_1_protection: protectionLookup[buffer[1]],
                threshold_1: stateLookup[buffer[0]],
                threshold_1_value: (buffer[3] | buffer[2] << 8),
                threshold_2_protection: protectionLookup[buffer[5]],
                threshold_2: stateLookup[buffer[4]],
                threshold_2_value: (buffer[7] | buffer[6] << 8),
            };
        },
    },
    selfTestResult: valueConverterBasic.lookup({'checking': 0, 'success': 1, 'failure': 2, 'others': 3}),
    lockUnlock: valueConverterBasic.lookup({'LOCK': true, 'UNLOCK': false}),
    localTempCalibration1: {
        from: (v) => {
            if (v > 55) v -= 0x100000000;
            return v / 10;
        },
        to: (v) => {
            if (v > 0) return v * 10;
            if (v < 0) return v * 10 + 0x100000000;
            return v;
        },
    },
    localTempCalibration2: {
        from: (v) => v,
        to: (v) => {
            if (v < 0) return v + 0x100000000;
            return v;
        },
    },
    thermostatHolidayStartStop: {
        from: (v) => {
            const start = {
                year: v.slice(0, 4), month: v.slice(4, 6), day: v.slice(6, 8),
                hours: v.slice(8, 10), minutes: v.slice(10, 12),
            };
            const end = {
                year: v.slice(12, 16), month: v.slice(16, 18), day: v.slice(18, 20),
                hours: v.slice(20, 22), minutes: v.slice(22, 24),
            };
            const startStr = `${start.year}/${start.month}/${start.day} ${start.hours}:${start.minutes}`;
            const endStr = `${end.year}/${end.month}/${end.day} ${end.hours}:${end.minutes}`;
            return `${startStr} | ${endStr}`;
        },
        to: (v) => {
            const numberPattern = /\d+/g;
            return v.match(numberPattern).join([]).toString();
        },
    },
    thermostatScheduleDaySingleDP: {
        from: (v) => {
            // day splitted to 10 min segments = total 144 segments
            const maxPeriodsInDay = 10;
            const periodSize = 3;
            const schedule = [];

            for (let i = 0; i < maxPeriodsInDay; i++) {
                const time = v[i * periodSize];
                const totalMinutes = time * 10;
                const hours = totalMinutes / 60;
                const rHours = Math.floor(hours);
                const minutes = (hours - rHours) * 60;
                const rMinutes = Math.round(minutes);
                const strHours = rHours.toString().padStart(2, '0');
                const strMinutes = rMinutes.toString().padStart(2, '0');
                const tempHexArray = [v[i * periodSize + 1], v[i * periodSize + 2]];
                const tempRaw = Buffer.from(tempHexArray).readUIntBE(0, tempHexArray.length);
                const temp = tempRaw / 10;
                schedule.push(`${strHours}:${strMinutes}/${temp}`);
                if (rHours === 24) break;
            }

            return schedule.join(' ');
        },
        to: (v, meta) => {
            const dayByte = {
                monday: 1, tuesday: 2, wednesday: 4, thursday: 8,
                friday: 16, saturday: 32, sunday: 64,
            };
            const weekDay = v.week_day;
            if (Object.keys(dayByte).indexOf(weekDay) === -1) {
                throw new Error('Invalid "week_day" property value: ' + weekDay);
            }
            let weekScheduleType;
            if (meta.state && meta.state.working_day) weekScheduleType = meta.state.working_day;
            const payload = [];

            switch (weekScheduleType) {
            case 'mon_sun':
                payload.push(127);
                break;
            case 'mon_fri+sat+sun':
                if (['saturday', 'sunday'].indexOf(weekDay) === -1) {
                    payload.push(31);
                    break;
                }
                payload.push(dayByte[weekDay]);
                break;
            case 'separate':
                payload.push(dayByte[weekDay]);
                break;
            default:
                throw new Error('Invalid "working_day" property, need to set it before');
            }

            // day splitted to 10 min segments = total 144 segments
            const maxPeriodsInDay = 10;
            const schedule = v.schedule.split(' ');
            const schedulePeriods = schedule.length;
            if (schedulePeriods > 10) throw new Error('There cannot be more than 10 periods in the schedule: ' + v);
            if (schedulePeriods < 2) throw new Error('There cannot be less than 2 periods in the schedule: ' + v);
            let prevHour;

            for (const period of schedule) {
                const timeTemp = period.split('/');
                const hm = timeTemp[0].split(':', 2);
                const h = parseInt(hm[0]);
                const m = parseInt(hm[1]);
                const temp = parseFloat(timeTemp[1]);
                if (h < 0 || h > 24 || m < 0 || m >= 60 || m % 10 !== 0 || temp < 5 || temp > 30 || temp % 0.5 !== 0) {
                    throw new Error('Invalid hour, minute or temperature of: ' + period);
                } else if (prevHour > h) {
                    throw new Error(`The hour of the next segment can't be less than the previous one: ${prevHour} > ${h}`);
                }
                prevHour = h;
                const segment = (h * 60 + m) / 10;
                const tempHexArray = convertDecimalValueTo2ByteHexArray(temp * 10);
                payload.push(segment, ...tempHexArray);
            }

            // Add "technical" periods to be valid payload
            for (let i = 0; i < maxPeriodsInDay - schedulePeriods; i++) {
                // by default it sends 9000b2, it's 24 hours and 18 degrees
                payload.push(144, 0, 180);
            }

            return payload;
        },
    },
    thermostatScheduleDayMultiDP: {
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
    thermostatScheduleDayMultiDPWithDayNumber: (dayNum) => {
        return {
            from: (v) => valueConverter.thermostatScheduleDayMultiDP.from(v),
            to: (v) => {
                const data = valueConverter.thermostatScheduleDayMultiDP.to(v);
                data[0] = dayNum;
                return data;
            },
        };
    },
    TV02SystemMode: {
        to: async (v, meta) => {
            const entity = meta.device.endpoints[0];
            if (meta.message.system_mode) {
                if (meta.message.system_mode === 'off') {
                    await sendDataPointBool(entity, 107, true, 'dataRequest', 1);
                } else {
                    await sendDataPointEnum(entity, 2, 1, 'dataRequest', 1); // manual
                }
            } else if (meta.message.heating_stop) {
                if (meta.message.heating_stop === 'ON') {
                    await sendDataPointBool(entity, 107, true, 'dataRequest', 1);
                } else {
                    await sendDataPointEnum(entity, 2, 1, 'dataRequest', 1); // manual
                }
            }
        },
        from: (v) => {
            return {system_mode: v === false ? 'heat' : 'off', heating_stop: v === false ? 'OFF' : 'ON'};
        },
    },
    TV02FrostProtection: {
        to: async (v, meta) => {
            const entity = meta.device.endpoints[0];
            if (v === 'ON') {
                await sendDataPointBool(entity, 10, true, 'dataRequest', 1);
            } else {
                await sendDataPointEnum(entity, 2, 1, 'dataRequest', 1); // manual
            }
        },
        from: (v) => {
            return {frost_protection: v === false ? 'OFF' : 'ON'};
        },
    },
    inverse: {to: (v) => !v, from: (v) => !v},
    onOffNotStrict: {from: (v) => v ? 'ON' : 'OFF', to: (v) => v === 'ON'},
    errorOrBatteryLow: {
        from: (v) => {
            if (v === 0) return {'battery_low': false};
            if (v === 1) return {'battery_low': true};
            return {'error': v};
        },
    },
};

const tuyaTz = {
    power_on_behavior_1: {
        key: ['power_on_behavior', 'power_outage_memory'],
        convertSet: async (entity, key, value, meta) => {
            // Legacy: remove power_outage_memory
            const lookup = key === 'power_on_behavior' ? {'off': 0, 'on': 1, 'previous': 2} : {'off': 0x00, 'on': 0x01, 'restore': 0x02};
            value = value.toLowerCase();
            utils.validateValue(value, Object.keys(lookup));
            const pState = lookup[value];
            await entity.write('genOnOff', {moesStartUpOnOff: pState});
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOff', ['moesStartUpOnOff']);
        },
    },
    power_on_behavior_2: {
        key: ['power_on_behavior'],
        convertSet: async (entity, key, value, meta) => {
            value = value.toLowerCase();
            const lookup = {'off': 0, 'on': 1, 'previous': 2};
            utils.validateValue(value, Object.keys(lookup));
            const pState = lookup[value];
            await entity.write('manuSpecificTuya_3', {'powerOnBehavior': pState});
            return {state: {power_on_behavior: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificTuya_3', ['powerOnBehavior']);
        },
    },
    switch_type: {
        key: ['switch_type'],
        convertSet: async (entity, key, value, meta) => {
            value = value.toLowerCase();
            const lookup = {'toggle': 0, 'state': 1, 'momentary': 2};
            utils.validateValue(value, Object.keys(lookup));
            await entity.write('manuSpecificTuya_3', {'switchType': lookup[value]}, {disableDefaultResponse: true});
            return {state: {switch_type: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('manuSpecificTuya_3', ['switchType']);
        },
    },
    backlight_indicator_mode_1: {
        key: ['backlight_mode', 'indicator_mode'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = key === 'backlight_mode' ? {'low': 0, 'medium': 1, 'high': 2, 'off': 0, 'normal': 1, 'inverted': 2} :
                {'off': 0, 'off/on': 1, 'on/off': 2, 'on': 3};
            value = value.toLowerCase();
            utils.validateValue(value, Object.keys(lookup));
            await entity.write('genOnOff', {tuyaBacklightMode: lookup[value]});
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOff', ['tuyaBacklightMode']);
        },
    },
    backlight_indicator_mode_2: {
        key: ['backlight_mode'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {'off': 0, 'on': 1};
            value = value.toLowerCase();
            utils.validateValue(value, Object.keys(lookup));
            await entity.write('genOnOff', {tuyaBacklightSwitch: lookup[value]});
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOff', ['tuyaBacklightSwitch']);
        },
    },
    child_lock: {
        key: ['child_lock'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('genOnOff', {0x8000: {value: value === 'LOCK', type: 0x10}});
        },
    },
    min_brightness: {
        key: ['min_brightness'],
        convertSet: async (entity, key, value, meta) => {
            const minValueHex = value.toString(16);
            const maxValueHex = 'ff';
            const minMaxValue = parseInt(`${minValueHex}${maxValueHex}`, 16);
            const payload = {0xfc00: {value: minMaxValue, type: 0x21}};
            await entity.write('genLevelCtrl', payload, {disableDefaultResponse: true});
            return {state: {min_brightness: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genLevelCtrl', [0xfc00]);
        },
    },
    color_power_on_behavior: {
        key: ['color_power_on_behavior'],
        convertSet: async (entity, key, value, meta) => {
            const lookup = {'initial': 0, 'previous': 1, 'cutomized': 2};
            utils.validateValue(value, Object.keys(lookup));
            await entity.command('lightingColorCtrl', 'tuyaOnStartUp', {
                mode: lookup[value]*256, data: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]});
            return {state: {color_power_on_behavior: value}};
        },
    },
    datapoints: {
        key: [
            'temperature_unit', 'temperature_calibration', 'humidity_calibration', 'alarm_switch',
            'state', 'brightness', 'min_brightness', 'max_brightness', 'power_on_behavior', 'position',
            'countdown', 'light_type', 'silence', 'self_test', 'child_lock', 'open_window', 'open_window_temperature', 'frost_protection',
            'system_mode', 'heating_stop', 'current_heating_setpoint', 'local_temperature_calibration', 'preset', 'boost_timeset_countdown',
            'holiday_start_stop', 'holiday_temperature', 'comfort_temperature', 'eco_temperature', 'working_day',
            'week_schedule_programming', 'online', 'holiday_mode_date', 'schedule', 'schedule_monday', 'schedule_tuesday',
            'schedule_wednesday', 'schedule_thursday', 'schedule_friday', 'schedule_saturday', 'schedule_sunday', 'clear_fault',
            'scale_protection', 'error', 'radar_scene', 'radar_sensitivity', 'tumble_alarm_time', 'tumble_switch', 'fall_sensitivity',
            'min_temperature', 'max_temperature', 'window_detection', 'boost_heating', 'alarm_ringtone', 'alarm_time', 'fan_speed',
            'reverse_direction', 'border', 'click_control', 'motor_direction', 'opening_mode', 'factory_reset', 'set_upper_limit', 'set_bottom_limit',
            'motor_speed', 'timer', 'reset_frost_lock', 'schedule_periodic', 'schedule_weekday', 'backlight_mode', 'calibration', 'motor_steering',
            ...[1, 2, 3, 4, 5, 6].map((no) => `schedule_slot_${no}`), 'minimum_range', 'maximum_range', 'detection_delay', 'fading_time',
        ],
        convertSet: async (entity, key, value, meta) => {
            // A set converter is only called once; therefore we need to loop
            const state = {};
            const datapoints = utils.getMetaValue(entity, meta.mapped, 'tuyaDatapoints', undefined, undefined);
            if (!datapoints) throw new Error('No datapoints map defined');
            for (const [attr, value] of Object.entries(meta.message)) {
                const convertedKey = meta.mapped.meta.multiEndpoint && meta.endpoint_name && !attr.startsWith(`${key}_`) ?
                    `${attr}_${meta.endpoint_name}` : attr;
                const dpEntry = datapoints.find((d) => d[1] === convertedKey);
                if (!dpEntry || !dpEntry[1]) {
                    throw new Error(`No datapoint defined for '${attr}'`);
                }
                if (dpEntry[3] && dpEntry[3].skip && dpEntry[3].skip(meta)) continue;
                const dpId = dpEntry[0];
                const convertedValue = await dpEntry[2].to(value, meta);
                const sendCommand = utils.getMetaValue(entity, meta.mapped, 'tuyaSendCommand', undefined, 'dataRequest');
                if (convertedValue === undefined) {
                    // conversion done inside converter, ignore.
                } else if (typeof convertedValue === 'boolean') {
                    await sendDataPointBool(entity, dpId, convertedValue, sendCommand, 1);
                } else if (typeof convertedValue === 'number') {
                    await sendDataPointValue(entity, dpId, convertedValue, sendCommand, 1);
                } else if (typeof convertedValue === 'string') {
                    await sendDataPointStringBuffer(entity, dpId, convertedValue, sendCommand, 1);
                } else if (Array.isArray(convertedValue)) {
                    await sendDataPointRaw(entity, dpId, convertedValue, sendCommand, 1);
                } else if (convertedValue instanceof Enum) {
                    await sendDataPointEnum(entity, dpId, convertedValue.valueOf(), sendCommand, 1);
                } else if (convertedValue instanceof Bitmap) {
                    await sendDataPointBitmap(entity, dpId, convertedValue.valueOf(), sendCommand, 1);
                } else {
                    throw new Error(`Don't know how to send type '${typeof convertedValue}'`);
                }

                if (dpEntry[3] && dpEntry[3].optimistic === false) continue;

                state[key] = value;
            }
            return {state};
        },
    },
    do_not_disturb: {
        key: ['do_not_disturb'],
        convertSet: async (entity, key, value, meta) => {
            await entity.command('lightingColorCtrl', 'tuyaDoNotDisturb', {enable: value ? 1 : 0});
            return {state: {do_not_disturb: value}};
        },
    },
};

const tuyaFz = {
    gateway_connection_status: {
        cluster: 'manuSpecificTuya',
        type: ['commandMcuGatewayConnectionStatus'],
        convert: async (model, msg, publish, options, meta) => {
            // "payload" can have the following values:
            // 0x00: The gateway is not connected to the internet.
            // 0x01: The gateway is connected to the internet.
            // 0x02: The request timed out after three seconds.
            const payload = {payloadSize: 1, payload: 1};
            await msg.endpoint.command('manuSpecificTuya', 'mcuGatewayConnectionStatus', payload, {});
        },
    },
    power_on_behavior_1: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('moesStartUpOnOff')) {
                const lookup = {0: 'off', 1: 'on', 2: 'previous'};
                const property = utils.postfixWithEndpointName('power_on_behavior', msg, model, meta);
                return {[property]: lookup[msg.data['moesStartUpOnOff']]};
            }
        },
    },
    power_on_behavior_2: {
        cluster: 'manuSpecificTuya_3',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const attribute = 'powerOnBehavior';
            const lookup = {0: 'off', 1: 'on', 2: 'previous'};
            if (msg.data.hasOwnProperty(attribute)) {
                const property = utils.postfixWithEndpointName('power_on_behavior', msg, model, meta);
                return {[property]: lookup[msg.data[attribute]]};
            }
        },
    },
    power_outage_memory: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('moesStartUpOnOff')) {
                const lookup = {0x00: 'off', 0x01: 'on', 0x02: 'restore'};
                const property = utils.postfixWithEndpointName('power_outage_memory', msg, model, meta);
                return {[property]: lookup[msg.data['moesStartUpOnOff']]};
            }
        },
    },
    switch_type: {
        cluster: 'manuSpecificTuya_3',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('switchType')) {
                const lookup = {0: 'toggle', 1: 'state', 2: 'momentary'};
                return {switch_type: lookup[msg.data['switchType']]};
            }
        },
    },
    backlight_mode_low_medium_high: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('tuyaBacklightMode')) {
                const value = msg.data['tuyaBacklightMode'];
                const backlightLookup = {0: 'low', 1: 'medium', 2: 'high'};
                return {backlight_mode: backlightLookup[value]};
            }
        },
    },
    backlight_mode_off_normal_inverted: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('tuyaBacklightMode')) {
                const value = msg.data['tuyaBacklightMode'];
                const backlightLookup = {0: 'off', 1: 'normal', 2: 'inverted'};
                return {backlight_mode: backlightLookup[value]};
            }
        },
    },
    backlight_mode_off_on: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('tuyaBacklightSwitch')) {
                const value = msg.data['tuyaBacklightSwitch'];
                const backlightLookup = {0: 'OFF', 1: 'ON'};
                return {backlight_mode: backlightLookup[value]};
            }
        },
    },
    indicator_mode: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('tuyaBacklightMode')) {
                const value = msg.data['tuyaBacklightMode'];
                const lookup = {0: 'off', 1: 'off/on', 2: 'on/off', 3: 'on'};
                if (lookup.hasOwnProperty(value)) {
                    return {indicator_mode: lookup[value]};
                }
            }
        },
    },
    child_lock: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('32768')) {
                const value = msg.data['32768'];
                return {child_lock: value ? 'LOCK' : 'UNLOCK'};
            }
        },
    },
    min_brightness: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty(0xfc00)) {
                const property = utils.postfixWithEndpointName('min_brightness', msg, model, meta);
                const value = parseInt(msg.data[0xfc00].toString(16).slice(0, 2), 16);
                return {[property]: value};
            }
        },
    },
    datapoints: {
        cluster: 'manuSpecificTuya',
        type: ['commandDataResponse', 'commandDataReport', 'commandActiveStatusReport', 'commandActiveStatusReportAlt'],
        options: (definition) => {
            const result = [];
            for (const datapoint of definition.meta.tuyaDatapoints) {
                const dpKey = datapoint[1];
                if (dpKey in utils.calibrateAndPrecisionRoundOptionsDefaultPrecision) {
                    const type = utils.calibrateAndPrecisionRoundOptionsIsPercentual(dpKey) ? 'percentual' : 'absolute';
                    result.push(exposes.options.precision(dpKey), exposes.options.calibration(dpKey, type));
                }
            }
            return result;
        },
        convert: (model, msg, publish, options, meta) => {
            let result = {};
            if (!model.meta || !model.meta.tuyaDatapoints) throw new Error('No datapoints map defined');
            const datapoints = model.meta.tuyaDatapoints;
            for (const dpValue of msg.data.dpValues) {
                const dpId = dpValue.dp;
                const dpEntry = datapoints.find((d) => d[0] === dpId);
                if (dpEntry) {
                    const value = getDataValue(dpValue);
                    if (dpEntry[1]) {
                        result[dpEntry[1]] = dpEntry[2].from(value, meta, options, publish);
                    } else if (dpEntry[2]) {
                        result = {...result, ...dpEntry[2].from(value, meta, options, publish)};
                    }
                } else {
                    meta.logger.debug(`Datapoint ${dpId} not defined for '${meta.device.manufacturerName}' ` +
                        `with data ${JSON.stringify(dpValue)}`);
                }
            }

            // Apply calibrateAndPrecisionRoundOptions
            const keys = Object.keys(utils.calibrateAndPrecisionRoundOptionsDefaultPrecision);
            for (const entry of Object.entries(result)) {
                if (keys.includes(entry[0])) {
                    result[entry[0]] = utils.calibrateAndPrecisionRoundOptions(entry[1], options, entry[0]);
                }
            }
            return result;
        },
    },
};

const tuyaExtend = {
    switch: (options={}) => {
        const tz = require('../converters/toZigbee');
        const fz = require('../converters/fromZigbee');
        const exposes = options.endpoints ? options.endpoints.map((ee) => e.switch().withEndpoint(ee)) : [e.switch()];
        const fromZigbee = [fz.on_off, fz.ignore_basic_report];
        const toZigbee = [tz.on_off];
        if (options.powerOutageMemory) {
            // Legacy, powerOnBehavior is preferred
            fromZigbee.push(tuyaFz.power_outage_memory);
            toZigbee.push(tuyaTz.power_on_behavior_1);
            exposes.push(tuyaExposes.powerOutageMemory());
        } else if (options.powerOnBehavior2) {
            fromZigbee.push(tuyaFz.power_on_behavior_2);
            toZigbee.push(tuyaTz.power_on_behavior_2);
            if (options.endpoints) {
                exposes.push(...options.endpoints.map((ee) => e.power_on_behavior().withEndpoint(ee)));
            } else {
                exposes.push(e.power_on_behavior());
            }
        } else {
            fromZigbee.push(tuyaFz.power_on_behavior_1);
            toZigbee.push(tuyaTz.power_on_behavior_1);
            exposes.push(e.power_on_behavior());
        }

        if (options.switchType) {
            fromZigbee.push(tuyaFz.switch_type);
            toZigbee.push(tuyaTz.switch_type);
            exposes.push(tuyaExposes.switchType());
        }

        if (options.backlightModeLowMediumHigh) {
            fromZigbee.push(tuyaFz.backlight_mode_low_medium_high);
            exposes.push(tuyaExposes.backlightModeLowMediumHigh());
            toZigbee.push(tuyaTz.backlight_indicator_mode_1);
        }
        if (options.backlightModeOffNormalInverted) {
            fromZigbee.push(tuyaFz.backlight_mode_off_normal_inverted);
            exposes.push(tuyaExposes.backlightModeOffNormalInverted());
            toZigbee.push(tuyaTz.backlight_indicator_mode_1);
        }
        if (options.indicatorMode) {
            fromZigbee.push(tuyaFz.indicator_mode);
            exposes.push(tuyaExposes.indicatorMode());
            toZigbee.push(tuyaTz.backlight_indicator_mode_1);
        }
        if (options.backlightModeOffOn) {
            fromZigbee.push(tuyaFz.backlight_mode_off_on);
            exposes.push(tuyaExposes.backlightModeOffOn());
            toZigbee.push(tuyaTz.backlight_indicator_mode_2);
        }

        if (options.electricalMeasurements) {
            fromZigbee.push((options.electricalMeasurementsFzConverter || fz.electrical_measurement), fz.metering);
            exposes.push(e.power(), e.current(), e.voltage(), e.energy());
        }
        if (options.childLock) {
            fromZigbee.push(tuyaFz.child_lock);
            toZigbee.push(tuyaTz.child_lock);
            exposes.push(e.child_lock());
        }
        if (options.fromZigbee) fromZigbee.push(...options.fromZigbee);
        if (options.toZigbee) toZigbee.push(...options.toZigbee);
        if (options.exposes) exposes.push(...options.exposes);
        return {exposes, fromZigbee, toZigbee};
    },
    light_onoff_brightness_colortemp_color: (options={}) => {
        const extend = require('./extend');
        options = {
            disableColorTempStartup: true, disablePowerOnBehavior: true, toZigbee: [tuyaTz.do_not_disturb, tuyaTz.color_power_on_behavior],
            exposes: [tuyaExposes.doNotDisturb(), tuyaExposes.colorPowerOnBehavior()], ...options,
        };
        const meta = {applyRedFix: true, enhancedHue: false};
        return {...extend.light_onoff_brightness_colortemp_color(options), meta};
    },
    light_onoff_brightness_colortemp: (options={}) => {
        const extend = require('./extend');
        options = {
            disableColorTempStartup: true, disablePowerOnBehavior: true, toZigbee: [tuyaTz.do_not_disturb],
            exposes: [tuyaExposes.doNotDisturb()], ...options,
        };
        return extend.light_onoff_brightness_colortemp(options);
    },
    light_onoff_brightness_color: (options={}) => {
        const extend = require('./extend');
        options = {
            disablePowerOnBehavior: true, toZigbee: [tuyaTz.do_not_disturb, tuyaTz.color_power_on_behavior],
            exposes: [tuyaExposes.doNotDisturb(), tuyaExposes.colorPowerOnBehavior()], ...options,
        };
        const meta = {applyRedFix: true, enhancedHue: false};
        return {...extend.light_onoff_brightness_color(options), meta};
    },
    light_onoff_brightness: (options={}) => {
        const extend = require('./extend');
        options = {
            disablePowerOnBehavior: true, toZigbee: [tuyaTz.do_not_disturb], exposes: [tuyaExposes.doNotDisturb()],
            minBrightness: false, ...options,
        };
        const result = extend.light_onoff_brightness(options);
        result.exposes = options.endpoints ? options.endpoints.map((ee) => e.light_brightness()) : [e.light_brightness()];
        if (options.minBrightness) {
            result.fromZigbee.push(tuyaFz.min_brightness);
            result.toZigbee.push(tuyaTz.min_brightness);
            result.exposes = result.exposes.map((e) => e.withMinBrightness());
        }
        if (options.endpoints) {
            result.exposes = result.exposes.map((e, i) => e.withEndpoint(options.endpoints[i]));
        }
        return result;
    },
};

module.exports = {
    exposes: tuyaExposes,
    extend: tuyaExtend,
    tz: tuyaTz,
    fz: tuyaFz,
    skip,
    configureMagicPacket,
    fingerprint,
    whitelabel,
    enum: (value) => new Enum(value),
    bitmap: (value) => new Bitmap(value),
    valueConverter,
    valueConverterBasic,
    sendDataPointBool,
    sendDataPointEnum,
    onEventSetTime,
    onEventSetLocalTime,
    onEventMeasurementPoll,
};
