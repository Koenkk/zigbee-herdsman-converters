const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['CSM-300Z'],
        model: 'CSM-300ZB',
        vendor: 'ShinaSystem',
        description: 'SiHAS multipurpose sensor',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.battery, fz.sihas_people_cnt],
        toZigbee: [tz.sihas_set_people],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genPowerCfg', 'genAnalogInput'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryVoltage(endpoint);
            const payload = reporting.payload('presentValue', 1, 600, 0);
            await endpoint.configureReporting('genAnalogInput', payload);
        },
        exposes: [e.battery(), e.battery_voltage(),
            exposes.enum('status', ea.STATE, ['idle', 'in', 'out']).withDescription('Currently status'),
            exposes.numeric('people', ea.ALL).withValueMin(0).withValueMax(50).withDescription('People count')],
    },
    {
        zigbeeModel: ['USM-300Z'],
        model: 'USM-300ZB',
        vendor: 'ShinaSystem',
        description: 'SiHAS multipurpose sensor',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.battery, fz.temperature, fz.humidity, fz.occupancy, fz.illuminance],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genPowerCfg', 'msIlluminanceMeasurement', 'msTemperatureMeasurement', 'msOccupancySensing'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
            await reporting.occupancy(endpoint, {min: 1, max: 600, change: 1});
            await reporting.temperature(endpoint, {min: 20, max: 300, change: 10});
            await reporting.humidity(endpoint, {min: 20, max: 300, change: 40});
            await reporting.illuminance(endpoint, {min: 20, max: 3600, change: 10});
        },
        exposes: [e.battery(), e.battery_voltage(), e.temperature(), e.humidity(), e.occupancy(),
            e.illuminance_lux().withProperty('illuminance')],
    },
    {
        zigbeeModel: ['SBM300Z1'],
        model: 'SBM300Z1',
        vendor: 'ShinaSystem',
        description: 'SiHAS IOT smart switch 1 gang',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['SBM300Z2'],
        model: 'SBM300Z2',
        vendor: 'ShinaSystem',
        description: 'SiHAS IOT smart switch 2 gang',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {top: 1, bottom: 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
        },
    },
    {
        zigbeeModel: ['SBM300Z3'],
        model: 'SBM300Z3',
        vendor: 'ShinaSystem',
        description: 'SiHAS IOT smart switch 3 gang',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('center'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {top: 1, center: 2, bottom: 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
            await reporting.onOff(device.getEndpoint(3));
        },
    },
    {
        zigbeeModel: ['SBM300Z4'],
        model: 'SBM300Z4',
        vendor: 'ShinaSystem',
        description: 'SiHAS IOT smart switch 4 gang',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('top_left'), e.switch().withEndpoint('bottom_left'),
            e.switch().withEndpoint('top_right'), e.switch().withEndpoint('bottom_right')],
        endpoint: (device) => {
            return {'top_left': 1, 'bottom_left': 2, 'top_right': 3, 'bottom_right': 4};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
            await reporting.onOff(device.getEndpoint(3));
            await reporting.onOff(device.getEndpoint(4));
        },
    },
    {
        zigbeeModel: ['SBM300Z5'],
        model: 'SBM300Z5',
        vendor: 'ShinaSystem',
        description: 'SiHAS IOT smart switch 5 gang',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('top_left'), e.switch().withEndpoint('top_right'), e.switch().withEndpoint('center_left'),
            e.switch().withEndpoint('bottom_left'), e.switch().withEndpoint('bottom_right')],
        endpoint: (device) => {
            return {'top_left': 1, 'center_left': 2, 'bottom_left': 3, 'top_right': 4, 'bottom_right': 5};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
            await reporting.onOff(device.getEndpoint(3));
            await reporting.onOff(device.getEndpoint(4));
            await reporting.onOff(device.getEndpoint(5));
        },
    },
    {
        zigbeeModel: ['SBM300Z6'],
        model: 'SBM300Z6',
        vendor: 'ShinaSystem',
        description: 'SiHAS IOT smart switch 6 gang',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('top_left'), e.switch().withEndpoint('bottom_left'), e.switch().withEndpoint('center_left'),
            e.switch().withEndpoint('center_right'), e.switch().withEndpoint('top_right'), e.switch().withEndpoint('bottom_right')],
        endpoint: (device) => {
            return {'top_left': 1, 'center_left': 2, 'bottom_left': 3, 'top_right': 4, 'center_right': 5, 'bottom_right': 6};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(6), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
            await reporting.onOff(device.getEndpoint(3));
            await reporting.onOff(device.getEndpoint(4));
            await reporting.onOff(device.getEndpoint(5));
            await reporting.onOff(device.getEndpoint(6));
        },
    },
    {
        zigbeeModel: ['BSM-300Z'],
        model: 'BSM-300ZB',
        vendor: 'ShinaSystem',
        description: 'SiHAS remote control',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.battery, fz.sihas_action],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.battery(), e.battery_voltage(), e.action(['single', 'double', 'long'])],
    },
    {
        zigbeeModel: ['TSM-300Z'],
        model: 'TSM-300ZB',
        vendor: 'ShinaSystem',
        description: 'SiHAS temperature/humidity sensor',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg']);
            await reporting.temperature(endpoint, {min: 30, max: 300, change: 30});
            await reporting.humidity(endpoint, {min: 30, max: 3600, change: 50});
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
        },
        exposes: [e.temperature(), e.humidity(), e.battery(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['DSM-300Z'],
        model: 'DSM-300ZB',
        vendor: 'ShinaSystem',
        description: 'SiHAS contact sensor',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['ssIasZone', 'genPowerCfg']);
            await endpoint.read('ssIasZone', ['iasCieAddr', 'zoneState', 'zoneId']);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
        },
        exposes: [e.contact(), e.battery(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['MSM-300Z'],
        model: 'MSM-300ZB',
        vendor: 'ShinaSystem',
        description: 'SiHAS remote control 4 button',
        fromZigbee: [fz.sihas_action, fz.battery],
        toZigbee: [],
        exposes: [e.action(['1_single', '1_double', '1_long', '2_single', '2_double', '2_long',
            '3_single', '3_double', '3_long', '4_single', '4_double', '4_long']), e.battery(), e.battery_voltage()],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
        },
    },
    {
        zigbeeModel: ['SBM300ZB1'],
        model: 'SBM300ZB1',
        vendor: 'ShinaSystem',
        description: 'SiHAS remote control',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.battery, fz.sihas_action],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.battery(), e.battery_voltage(), e.action(['single', 'double', 'long'])],
    },
    {
        zigbeeModel: ['SBM300ZB2'],
        model: 'SBM300ZB2',
        vendor: 'ShinaSystem',
        description: 'SiHAS remote control 2 button',
        fromZigbee: [fz.sihas_action, fz.battery],
        toZigbee: [],
        exposes: [e.action(['1_single', '1_double', '1_long', '2_single', '2_double', '2_long']), e.battery(), e.battery_voltage()],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
        },
    },
    {
        zigbeeModel: ['SBM300ZB3'],
        model: 'SBM300ZB3',
        vendor: 'ShinaSystem',
        description: 'SiHAS remote control 3 button',
        fromZigbee: [fz.sihas_action, fz.battery],
        toZigbee: [],
        exposes: [e.action(['1_single', '1_double', '1_long', '2_single', '2_double', '2_long',
            '3_single', '3_double', '3_long']), e.battery(), e.battery_voltage()],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint, {min: 30, max: 21600, change: 1});
        },
    },
    {
        zigbeeModel: ['PMM-300Z1'],
        model: 'PMM-300Z1',
        vendor: 'ShinaSystem',
        description: 'SiHAS energy monitor',
        fromZigbee: [fz.electrical_measurement, fz.metering],
        toZigbee: [tz.electrical_measurement_power],
        exposes: [e.power().withAccess(ea.STATE_GET), e.energy()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering']);
            await reporting.activePower(endpoint, {min: 1, max: 600, change: 5});
            await reporting.instantaneousDemand(endpoint, {min: 1, max: 600, change: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {multiplier: 1, divisor: 1000});
            await reporting.currentSummDelivered(endpoint, {min: 1, max: 600, change: 5});
        },
    },
];
