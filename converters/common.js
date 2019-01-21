'use strict';

const thermostatControlSequenceOfOperations = {
    0: 'cooling only',
    1: 'cooling with reheat',
    2: 'heating only',
    3: 'heating with reheat',
    4: 'cooling and Heating 4-pipes',
    5: 'cooling and Heating 4-pipes with reheat',
};
const thermostatSystemModes = {
    0: 'off',
    1: 'auto',
    3: 'cool',
    4: 'heat',
    5: 'emergency heating',
    6: 'precooling',
    7: 'fan only',
    8: 'dry',
    9: 'Sleep',
};
const thermostatRunningModes = {
    0: 'off',
    3: 'cool',
    4: 'heat',
};

module.exports = {
    thermostatControlSequenceOfOperations,
    thermostatSystemModes,
    thermostatRunningModes,
};
