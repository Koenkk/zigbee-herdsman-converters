function readTemperature(buffer, offset) {
    return buffer.readUint16BE(offset) / 100;
}

function writeTemperature(buffer, offset, temperature) {
    buffer.writeUint16BE(temperature * 100, offset);
}

const dayNames = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

function readDaySelection(buffer, offset) {
    const selectedDays = [];

    dayNames.forEach((day, index) => {
        if ((buffer[offset] >> index + 1) % 2 !== 0) {
            selectedDays.push(day);
        }
    });

    return selectedDays;
}

function validateDaySelection(selectedDays) {
    selectedDays.filter((selectedDay) => !dayNames.includes(selectedDay)).forEach((invalidValue) => {
        throw new Error(`The value "${invalidValue}" is not a valid day (available values: ${dayNames.join(', ')})`);
    });
}

function writeDaySelection(buffer, offset, selectedDays) {
    validateDaySelection(selectedDays);

    const bitMap = dayNames.reduce((repeat, dayName, index) => {
        const isDaySelected = selectedDays.includes(dayName);
        return repeat | isDaySelected << index + 1;
    }, 0);

    buffer.writeUInt8(bitMap, offset);
}

const timeNextDayFlag = 1 << 15;

function readTime(buffer, offset) {
    const minutesWithDayFlag = buffer.readUint16BE(offset);
    return minutesWithDayFlag & ~timeNextDayFlag;
}

function validateTime(time) {
    const isPositiveInteger = (value) => typeof value === 'number' && Number.isInteger(value) && value >= 0;

    if (!isPositiveInteger(time)) {
        throw new Error(`Time must be a positive integer number`);
    }

    if (time >= 24 * 60) {
        throw new Error(`Time must be between 00:00 and 23:59`);
    }
}

function writeTime(buffer, offset, time, isNextDay) {
    validateTime(time);

    let minutesWithDayFlag = time;

    if (isNextDay) {
        minutesWithDayFlag = minutesWithDayFlag | timeNextDayFlag;
    }

    buffer.writeUint16BE(minutesWithDayFlag, offset);
}

function decodeSchedule(buffer) {
    return {
        days: readDaySelection(buffer, 1),
        events: [
            {time: readTime(buffer, 2), temperature: readTemperature(buffer, 6)},
            {time: readTime(buffer, 8), temperature: readTemperature(buffer, 12)},
            {time: readTime(buffer, 14), temperature: readTemperature(buffer, 18)},
            {time: readTime(buffer, 20), temperature: readTemperature(buffer, 24)},
        ],
    };
}

function validateSchedule(schedule) {
    const eventCount = 4;

    if (typeof schedule !== 'object') {
        throw new Error('The provided value must be a schedule object');
    }

    if (schedule.days == null || !Array.isArray(schedule.days) || schedule.days.length === 0) {
        throw new Error(`The schedule object must contain an array of days with at least one entry`);
    }

    validateDaySelection(schedule.days);

    if (schedule.events == null || !Array.isArray(schedule.events) || schedule.events.length !== eventCount) {
        throw new Error(`The schedule object must contain an array of ${eventCount} time/temperature events`);
    }

    schedule.events.forEach((event) => {
        if (typeof event !== 'object') {
            throw new Error('The provided time/temperature event must be an object');
        }

        validateTime(event.time);

        if (typeof event.temperature !== 'number') {
            throw new Error(`The provided time/temperature entry must contain a numeric temperature`);
        }

        if (event.temperature < 5 || event.temperature > 30) {
            throw new Error(`The temperature must be between 5 and 30 °C`);
        }
    });

    // Calculate time durations between events
    const durations = schedule.events
        .map((entry, index, entries) => {
            if (index === 0) {
                return 0;
            }

            const time = entry.time;
            const fullDay = 24 * 60;
            const previousTime = entries[index - 1].time;
            const isNextDay = time < previousTime;

            if (isNextDay) {
                return (fullDay - previousTime) + time;
            } else {
                return time - previousTime;
            }
        })
        // Remove first entry which is not a duration
        .slice(1);

    const minDuration = 60;
    const hasInvalidDurations = durations.some((duration) => duration < minDuration);

    if (hasInvalidDurations) {
        throw new Error(`The individual times must be at least 1 hour apart`);
    }

    const minTotalDuration = eventCount * minDuration;
    const maxTotalDuration = 24 * 60;
    const totalDuration = durations.reduce((total, duration) => total + duration, 0);

    if (totalDuration < minTotalDuration) {
        throw new Error(`The start and end time must be at least 4 hours apart`);
    }

    if (totalDuration > maxTotalDuration) {
        // this implicitly also makes sure that there is at most one "next day" switch
        throw new Error(`The start and end time must be at most 24 hours apart`);
    }
}

function encodeSchedule(schedule) {
    const buffer = Buffer.alloc(26);
    buffer.writeUInt8(0x04);

    writeDaySelection(buffer, 1, schedule.days);

    schedule.events.forEach((event, index, events) => {
        const offset = 2 + index * 6;
        const isNextDay = index > 0 && event.time < events[index - 1].time;

        writeTime(buffer, offset, event.time, isNextDay);
        writeTemperature(buffer, offset + 4, event.temperature);
    });

    return buffer;
}

function formatTime(timeMinutes) {
    const hours = Math.floor(timeMinutes / 60);
    const minutes = timeMinutes % 60;
    return `${hours}:${String(minutes).padStart(2, '0')}`;
}

function parseTime(timeString) {
    const parts = timeString.split(':');

    if (parts.length !== 2) {
        throw new Error(`Cannot parse time string ${timeString}`);
    }

    const hours = parseInt(parts[0]);
    const minutes = parseInt(parts[1]);

    return hours * 60 + minutes;
}

const stringifiedScheduleFragmentSeparator = '|';
const stringifiedScheduleValueSeparator = ',';

function stringifySchedule(schedule) {
    const stringifiedScheduleFragments = [schedule.days.join(stringifiedScheduleValueSeparator)];

    for (const event of schedule.events) {
        const formattedTemperature = Number.isInteger(event.temperature) ?
            event.temperature.toFixed(1) : // add ".0" for usability to signal that floats can be used
            String(event.temperature);

        const entryFragments = [formatTime(event.time), formattedTemperature];

        stringifiedScheduleFragments.push(entryFragments.join(stringifiedScheduleValueSeparator));
    }

    return stringifiedScheduleFragments.join(stringifiedScheduleFragmentSeparator);
}

function parseSchedule(stringifiedSchedule) {
    const stringifiedScheduleFragments = stringifiedSchedule.split(stringifiedScheduleFragmentSeparator);
    const schedule = {days: [], events: []};

    stringifiedScheduleFragments.forEach((fragment, index) => {
        if (index === 0) {
            schedule.days.push(...fragment.split(stringifiedScheduleValueSeparator));
        } else {
            const entryFragments = fragment.split(stringifiedScheduleValueSeparator);
            const entry = {time: parseTime(entryFragments[0]), temperature: parseFloat(entryFragments[1])};
            schedule.events.push(entry);
        }
    });

    return schedule;
}

module.exports = {
    decodeSchedule,
    validateSchedule,
    encodeSchedule,
    stringifySchedule,
    parseSchedule,
};
