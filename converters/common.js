'use strict';

const thermostat_control_sequence_of_operations = {
    0: "Cooling only",
    1: "Cooling with reheat",
    2: "Heating only",
    3: "Heating with reheat",
    4: "Cooling and Heating 4-pipes",
    5: "Cooling and Heating 4-pipes with reheat",
};
const thermostat_system_modes = {
    0: "Off",
    1: "Auto",
    3: "Cool",
    4: "Heat",
    5: "Emergency heating",
    6: "Precooling",
    7: "Fan only",
    8: "Dry",
    9: "Sleep",
};
const thermostat_running_modes = {
    0: "Off",
    3: "Cool",
    4: "Heat",
};

module.exports = {
    thermostat_control_sequence_of_operations,
    thermostat_system_modes,
    thermostat_running_modes,
};
