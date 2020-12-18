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

module.exports = {
    isLegacyEnabled,
    precisionRound,
    toLocalISOString,
};
