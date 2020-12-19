'use strict';

function isLegacyEnabled(options) {
    return !options.hasOwnProperty('legacy') || options.legacy;
}

function precisionRound(number, precision) {
    if (typeof precision === 'number') {
        const factor = Math.pow(10, precision);
        return Math.round(number * factor) / factor;
    } else if (typeof precision === 'object') {
        const thresholds = Object.keys(precision).map(Number).sort((a, b) => b - a);
        for (const t of thresholds) {
            if (! isNaN(t) && number >= t) {
                return precisionRound(number, precision[t]);
            }
        }
    }
    return number;
}

function toLocalISOString(dDate) {
    const tzOffset = -dDate.getTimezoneOffset();
    const plusOrMinus = tzOffset >= 0 ? '+' : '-';
    const pad = function(num) {
        const norm = Math.floor(Math.abs(num));
        return (norm < 10 ? '0' : '') + norm;
    };

    return dDate.getFullYear() +
        '-' + pad(dDate.getMonth() + 1) +
        '-' + pad(dDate.getDate()) +
        'T' + pad(dDate.getHours()) +
        ':' + pad(dDate.getMinutes()) +
        ':' + pad(dDate.getSeconds()) +
        plusOrMinus + pad(tzOffset / 60) +
        ':' + pad(tzOffset % 60);
}

function numberWithinRange(number, min, max) {
    if (number > max) {
        return max;
    } else if (number < min) {
        return min;
    } else {
        return number;
    }
}

const transactionStore = {};
function hasAlreadyProcessedMessage(msg, ID=null, key=null) {
    const currentID = ID !== null ? ID : msg.meta.zclTransactionSequenceNumber;
    key = key || msg.device.ieeeAddr;
    if (transactionStore[key] === currentID) return true;
    transactionStore[key] = currentID;
    return false;
}

const defaultPrecision = {temperature: 2, humidity: 2, pressure: 1};
function calibrateAndPrecisionRoundOptions(number, options, type) {
    // Calibrate
    const calibrateKey = `${type}_calibration`;
    let calibrationOffset = options && options.hasOwnProperty(calibrateKey) ? options[calibrateKey] : 0;
    if (type == 'illuminance' || type === 'illuminance_lux') {
        // linear calibration because measured value is zero based
        // +/- percent
        calibrationOffset = Math.round(number * calibrationOffset / 100);
    }
    number = number + calibrationOffset;

    // Precision round
    const precisionKey = `${type}_precision`;
    const defaultValue = defaultPrecision[type] || 0;
    const precision = options && options.hasOwnProperty(precisionKey) ? options[precisionKey] : defaultValue;
    return precisionRound(number, precision);
}

function toPercentage(value, min, max) {
    if (value > max) {
        value = max;
    } else if (value < min) {
        value = min;
    }

    const normalised = (value - min) / (max - min);
    return Math.round(normalised * 100);
}

function addActionGroup(payload, msg, definition) {
    const disableActionGroup = definition.meta && definition.meta.disableActionGroup;
    if (!disableActionGroup && msg.groupID) {
        payload.action_group = msg.groupID;
    }
}

function postfixWithEndpointName(value, msg, definition) {
    if (definition.meta && definition.meta.multiEndpoint) {
        const endpointName = definition.hasOwnProperty('endpoint') ?
            getKey(definition.endpoint(msg.device), msg.endpoint.ID) : msg.endpoint.ID;
        return `${value}_${endpointName}`;
    } else {
        return value;
    }
}

function getKey(object, value, fallback, convertTo) {
    for (const key in object) {
        if (object[key]==value) {
            return convertTo ? convertTo(key) : key;
        }
    }

    return fallback;
}

function batteryVoltageToPercentage(voltage, option) {
    let percentage = null;
    if (option === '3V_2100') {
        if (voltage < 2100) {
            percentage = 0;
        } else if (voltage < 2440) {
            percentage = 6 - ((2440 - voltage) * 6) / 340;
        } else if (voltage < 2740) {
            percentage = 18 - ((2740 - voltage) * 12) / 300;
        } else if (voltage < 2900) {
            percentage = 42 - ((2900 - voltage) * 24) / 160;
        } else if (voltage < 3000) {
            percentage = 100 - ((3000 - voltage) * 58) / 100;
        } else if (voltage >= 3000) {
            percentage = 100;
        }
        percentage = Math.round(percentage);
    } else if (option === '3V_2500') {
        percentage = toPercentage(voltage, 2500, 3000);
    } else if (option === '3V_2500_3200') {
        percentage = toPercentage(voltage, 2500, 3200);
    } else if (option === '4LR6AA1_5v') {
        percentage = toPercentage(voltage, 3000, 4200);
    } else {
        throw new Error(`Not batteryVoltageToPercentage type supported: ${option}`);
    }

    return percentage;
}

module.exports = {
    isLegacyEnabled,
    precisionRound,
    toLocalISOString,
    numberWithinRange,
    hasAlreadyProcessedMessage,
    calibrateAndPrecisionRoundOptions,
    toPercentage,
    addActionGroup,
    postfixWithEndpointName,
    getKey,
    batteryVoltageToPercentage,
};
