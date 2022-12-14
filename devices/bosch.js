const herdsman = require('zigbee-herdsman');
const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const utils = require('../lib/utils');
const constants = require('../lib/constants');
const e = exposes.presets;
const ea = exposes.access;

// Radiator Thermostat II
const boschManufacturer = {manufacturerCode: 0x1209};

// Radiator Thermostat II
const operatingModes = {
    'automatic': 0,
    'manual': 1,
    'pause': 5,
};

// Radiator Thermostat II
const stateOffOn = {
    'OFF': 0,
    'ON': 1,
};

// Radiator Thermostat II
const displayOrientation = {
    'normal': 0,
    'flipped': 1,
};

// Radiator Thermostat II
const tzLocal = {
    bosch_thermostat: {
        key: ['window_open', 'boost', 'system_mode'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'window_open') {
                value = value.toUpperCase();
                utils.validateValue(value, Object.keys(stateOffOn));
                const index = stateOffOn[value];
                await entity.write('hvacThermostat', {0x4042: {value: index, type: herdsman.Zcl.DataType.enum8}}, boschManufacturer);
                return {state: {window_open: value}};
            }
            if (key === 'boost') {
                value = value.toUpperCase();
                utils.validateValue(value, Object.keys(stateOffOn));
                const index = stateOffOn[value];
                await entity.write('hvacThermostat', {0x4043: {value: index, type: herdsman.Zcl.DataType.enum8}}, boschManufacturer);
                return {state: {boost: value}};
            }
            if (key === 'system_mode') {
                // Map system_mode (Off/Auto/Heat) to Boschg operating mode
                value = value.toLowerCase();

                let opMode = operatingModes.manual; // OperatingMode 1 = Manual (Default)

                if (value=='off') {
                    opMode = operatingModes.pause; // OperatingMode 5 = Pause
                } else if (value == 'auto') {
                    opMode = operatingModes.automatic; // OperatingMode 0 = Automatic
                }
                await entity.write('hvacThermostat', {0x4007: {value: opMode, type: herdsman.Zcl.DataType.enum8}}, boschManufacturer);
                return {state: {system_mode: value}};
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
            case 'window_open':
                await entity.read('hvacThermostat', [0x4042], boschManufacturer);
                break;
            case 'boost':
                await entity.read('hvacThermostat', [0x4043], boschManufacturer);
                break;
            case 'system_mode':
                await entity.read('hvacThermostat', [0x4007], boschManufacturer);
                break;

            default: // Unknown key
                throw new Error(`Unhandled key toZigbee.bosch_thermostat.convertGet ${key}`);
            }
        },
    },
    bosch_userInterface: {
        key: ['display_orientation', 'display_ontime', 'display_brightness', 'child_lock'],
        convertSet: async (entity, key, value, meta) => {
            if (key === 'display_orientation') {
                const index = displayOrientation[value];
                await entity.write('hvacUserInterfaceCfg', {0x400b: {value: index, type: herdsman.Zcl.DataType.uint8}}, boschManufacturer);
                return {state: {display_orientation: value}};
            }
            if (key === 'display_ontime') {
                await entity.write('hvacUserInterfaceCfg', {0x403a: {value: value, type: herdsman.Zcl.DataType.enum8}}, boschManufacturer);
                return {state: {display_onTime: value}};
            }
            if (key === 'display_brightness') {
                await entity.write('hvacUserInterfaceCfg', {0x403b: {value: value, type: herdsman.Zcl.DataType.enum8}}, boschManufacturer);
                return {state: {display_brightness: value}};
            }
            if (key === 'child_lock') {
                const keypadLockout = Number(value === 'LOCK');
                await entity.write('hvacUserInterfaceCfg', {keypadLockout});
                return {state: {child_lock: value}};
            }
        },
        convertGet: async (entity, key, meta) => {
            switch (key) {
            case 'display_orientation':
                await entity.read('hvacUserInterfaceCfg', [0x400b], boschManufacturer);
                break;
            case 'display_ontime':
                await entity.read('hvacUserInterfaceCfg', [0x403a], boschManufacturer);
                break;
            case 'display_brightness':
                await entity.read('hvacUserInterfaceCfg', [0x403b], boschManufacturer);
                break;
            case 'child_lock':
                await entity.read('hvacUserInterfaceCfg', ['keypadLockout']);
                break;
            default: // Unknown key
                throw new Error(`Unhandled key toZigbee.bosch_userInterface.convertGet ${key}`);
            }
        },
    },
};


// Radiator Thermostat II
const fzLocal = {
    bosch_thermostat: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const data = msg.data;
            if (data.hasOwnProperty(0x4042)) {
                result.window_open = (Object.keys(stateOffOn)[data[0x4042]]);
            }
            if (data.hasOwnProperty(0x4043)) {
                result.boost = (Object.keys(stateOffOn)[data[0x4043]]);
            }
            if (data.hasOwnProperty(0x4007)) {
                const opModes = {0: 'auto', 1: 'heat', 2: 'unknown 2', 3: 'unknown 3', 4: 'unknown 4', 5: 'off'};
                result.system_mode = opModes[data[0x4007]];
            }
            if (data.hasOwnProperty(0x4020)) {
                result.pi_heating_demand = data[0x4020];
            }

            return result;
        },
    },
    bosch_userInterface: {
        cluster: 'hvacUserInterfaceCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const data = msg.data;
            if (data.hasOwnProperty(0x400b)) {
                result.display_orientation = (Object.keys(displayOrientation)[data[0x400b]]);
            }
            if (data.hasOwnProperty(0x403a)) {
                result.display_ontime = data[0x403a];
            }
            if (data.hasOwnProperty(0x403b)) {
                result.display_brightness = data[0x403b];
            }
            if (data.hasOwnProperty('keypadLockout')) {
                result.child_lock = (data['keypadLockout'] == 1 ? 'LOCK' : 'UNLOCK');
            }

            return result;
        },
    },
};

const definition = [
    {
        zigbeeModel: ['RFDL-ZB', 'RFDL-ZB-EU', 'RFDL-ZB-H', 'RFDL-ZB-K', 'RFDL-ZB-CHI', 'RFDL-ZB-MS', 'RFDL-ZB-ES', 'RFPR-ZB',
            'RFPR-ZB-EU', 'RFPR-ZB-CHI', 'RFPR-ZB-ES', 'RFPR-ZB-MS'],
        model: 'RADON TriTech ZB',
        vendor: 'Bosch',
        description: 'Wireless motion detector',
        fromZigbee: [fz.temperature, fz.battery, fz.ias_occupancy_alarm_1, fz.illuminance],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
            await reporting.illuminance(endpoint);
        },
        exposes: [e.temperature(), e.battery(), e.occupancy(), e.battery_low(), e.tamper(), e.illuminance(), e.illuminance_lux()],
    },
    {
        zigbeeModel: ['ISW-ZPR1-WP13'],
        model: 'ISW-ZPR1-WP13',
        vendor: 'Bosch',
        description: 'Motion sensor',
        fromZigbee: [fz.temperature, fz.battery, fz.ias_occupancy_alarm_1, fz.ignore_iaszone_report],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(5);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.temperature(), e.battery(), e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['RBSH-TRV0-ZB-EU'],
        model: 'BTH-RA',
        vendor: 'Bosch',
        description: 'Radiator thermostat II',
        fromZigbee: [fz.thermostat, fz.battery, fzLocal.bosch_thermostat, fzLocal.bosch_userInterface],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_keypad_lockout,
            tzLocal.bosch_thermostat,
            tzLocal.bosch_userInterface,
        ],
        exposes: [
            exposes.climate()
                .withLocalTemperature(ea.STATE)
                .withSetpoint('occupied_heating_setpoint', 5, 30, 0.5)
                .withLocalTemperatureCalibration(-12, 12, 0.5)
                .withSystemMode(['off', 'heat', 'auto'])
                .withPiHeatingDemand(ea.STATE),
            exposes.binary('boost', ea.ALL, 'ON', 'OFF')
                .withDescription('Activate Boost heating'),
            exposes.binary('window_open', ea.ALL, 'ON', 'OFF')
                .withDescription('Window open'),
            exposes.enum('display_orientation', ea.ALL, Object.keys(displayOrientation))
                .withDescription('Display orientation'),
            exposes.numeric('display_ontime', ea.ALL)
                .withValueMin(5)
                .withValueMax(30)
                .withDescription('Specifies the diplay On-time'),
            exposes.numeric('display_brightness', ea.ALL)
                .withValueMin(0)
                .withValueMax(10)
                .withDescription('Specifies the brightness value of the display'),
            e.child_lock().setAccess('state', ea.ALL),
            e.battery(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'hvacThermostat', 'hvacUserInterfaceCfg']);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatKeypadLockMode(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);

            // report operating_mode (system_mode)
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: {ID: 0x4007, type: herdsman.Zcl.DataType.enum8},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1,
            }], boschManufacturer);
            // report pi_heating_demand (valve opening)
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: {ID: 0x4020, type: herdsman.Zcl.DataType.enum8},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1,
            }], boschManufacturer);
            // report window_open
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: {ID: 0x4042, type: herdsman.Zcl.DataType.enum8},
                minimumReportInterval: 0,
                maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1,
            }], boschManufacturer);

            await endpoint.read('hvacThermostat', ['localTemperatureCalibration']);
            await endpoint.read('hvacThermostat', [0x4007, 0x4020, 0x4042, 0x4043], boschManufacturer);

            await endpoint.read('hvacUserInterfaceCfg', ['keypadLockout']);
            await endpoint.read('hvacUserInterfaceCfg', [0x400b, 0x403a, 0x403b], boschManufacturer);
        },
    },
];

module.exports = definition;
