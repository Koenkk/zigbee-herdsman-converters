'use strict';

const thermostatControlSequenceOfOperations = {
    0: 'cooling only',
    1: 'cooling with reheat',
    2: 'heating only',
    3: 'heating with reheat',
    4: 'cooling and heating 4-pipes',
    5: 'cooling and heating 4-pipes with reheat',
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
const thermostatRunningStates = {
    0:'idle',
    1:'heating',
    2:'cooling',
    4:'fan only',
    5:'heating',
    6:'cooling',
    8:'heating',
    9:'heating',
    A:'heating',
    D:'heating',
    10:'cooling',
    12:'cooling',
    14:'cooling',
    15:'cooling',
};

module.exports = {
    thermostatControlSequenceOfOperations,
    thermostatSystemModes,
    thermostatRunningModes,
};
