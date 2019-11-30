'use strict';

const fz = require('./converters/fromZigbee');
const tz = require('./converters/toZigbee');

const store = {};

const repInterval = {
    MAX: 62000,
    HOUR: 3600,
    MINUTES_5: 300,
    MINUTE: 60,
};

const bind = async (endpoint, target, clusters) => {
    for (const cluster of clusters) {
        await endpoint.bind(cluster, target);
    }
};

const configureReporting = {
    currentPositionLiftPercentage: async (endpoint) => {
        const payload = [{
            attribute: 'currentPositionLiftPercentage',
            minimumReportInterval: 1,
            maximumReportInterval: repInterval.MAX,
            reportableChange: 1,
        }];
        await endpoint.configureReporting('closuresWindowCovering', payload);
    },
    batteryPercentageRemaining: async (endpoint) => {
        const payload = [{
            attribute: 'batteryPercentageRemaining',
            minimumReportInterval: repInterval.HOUR,
            maximumReportInterval: repInterval.MAX,
            reportableChange: 0,
        }];
        await endpoint.configureReporting('genPowerCfg', payload);
    },
    batteryVoltage: async (endpoint) => {
        const payload = [{
            attribute: 'batteryVoltage',
            minimumReportInterval: repInterval.HOUR,
            maximumReportInterval: repInterval.MAX,
            reportableChange: 0,
        }];
        await endpoint.configureReporting('genPowerCfg', payload);
    },
    batteryAlarmState: async (endpoint) => {
        const payload = [{
            attribute: 'batteryAlarmState',
            minimumReportInterval: repInterval.HOUR,
            maximumReportInterval: repInterval.MAX,
            reportableChange: 0,
        }];
        await endpoint.configureReporting('genPowerCfg', payload);
    },
    onOff: async (endpoint) => {
        const payload = [{
            attribute: 'onOff',
            minimumReportInterval: 0,
            maximumReportInterval: repInterval.HOUR,
            reportableChange: 0,
        }];
        await endpoint.configureReporting('genOnOff', payload);
    },
    lockState: async (endpoint) => {
        const payload = [{
            attribute: 'lockState',
            minimumReportInterval: 0,
            maximumReportInterval: repInterval.HOUR,
            reportableChange: 0,
        }];
        await endpoint.configureReporting('closuresDoorLock', payload);
    },
    brightness: async (endpoint) => {
        const payload = [{
            attribute: 'currentLevel',
            minimumReportInterval: 0,
            maximumReportInterval: repInterval.HOUR,
            reportableChange: 1,
        }];
        await endpoint.configureReporting('genLevelCtrl', payload);
    },
    occupancy: async (endpoint) => {
        const payload = [{
            attribute: 'occupancy',
            minimumReportInterval: 0,
            maximumReportInterval: repInterval.HOUR,
            reportableChange: 0,
        }];
        await endpoint.configureReporting('msOccupancySensing', payload);
    },
    temperature: async (endpoint) => {
        const payload = [{
            attribute: 'measuredValue',
            minimumReportInterval: 0,
            maximumReportInterval: repInterval.HOUR,
            reportableChange: 25,
        }];
        await endpoint.configureReporting('msTemperatureMeasurement', payload);
    },
    pressure: async (endpoint) => {
        const payload = [{
            attribute: 'measuredValue',
            minimumReportInterval: 0,
            maximumReportInterval: repInterval.HOUR,
            reportableChange: 0,
        }];
        await endpoint.configureReporting('msPressureMeasurement', payload);
    },
    illuminance: async (endpoint) => {
        const payload = [{
            attribute: 'measuredValue',
            minimumReportInterval: 0,
            maximumReportInterval: repInterval.HOUR,
            reportableChange: 0,
        }];
        await endpoint.configureReporting('msIlluminanceMeasurement', payload);
    },
    instantaneousDemand: async (endpoint) => {
        const payload = [{
            attribute: 'instantaneousDemand',
            minimumReportInterval: 0,
            maximumReportInterval: repInterval.HOUR,
            reportableChange: 1,
        }];
        await endpoint.configureReporting('seMetering', payload);
    },
    currentSummDelivered: async (endpoint) => {
        const payload = [{
            attribute: 'currentSummDelivered',
            minimumReportInterval: 0,
            maximumReportInterval: repInterval.HOUR,
            reportableChange: 1,
        }];
        await endpoint.configureReporting('seMetering', payload);
    },
    currentSummReceived: async (endpoint) => {
        const payload = [{
            attribute: 'currentSummReceived',
            minimumReportInterval: 0,
            maximumReportInterval: repInterval.HOUR,
            reportableChange: 1,
        }];
        await endpoint.configureReporting('seMetering', payload);
    },
    thermostatTemperature: async (endpoint) => {
        const payload = [{
            attribute: 'localTemp',
            minimumReportInterval: 0,
            maximumReportInterval: repInterval.HOUR,
            reportableChange: 10,
        }];
        await endpoint.configureReporting('hvacThermostat', payload);
    },
    thermostatTemperatureCalibration: async (endpoint) => {
        const payload = [{
            attribute: 'localTemperatureCalibration',
            minimumReportInterval: 0,
            maximumReportInterval: repInterval.HOUR,
            reportableChange: 0,
        }];
        await endpoint.configureReporting('hvacThermostat', payload);
    },
    thermostatOccupiedHeatingSetpoint: async (endpoint) => {
        const payload = [{
            attribute: 'occupiedHeatingSetpoint',
            minimumReportInterval: 0,
            maximumReportInterval: repInterval.HOUR,
            reportableChange: 10,
        }];
        await endpoint.configureReporting('hvacThermostat', payload);
    },
    thermostatPIHeatingDemand: async (endpoint) => {
        const payload = [{
            attribute: 'pIHeatingDemand',
            minimumReportInterval: 0,
            maximumReportInterval: repInterval.MINUTES_5,
            reportableChange: 10,
        }];
        await endpoint.configureReporting('hvacThermostat', payload);
    },
    thermostatRunningState: async (endpoint) => {
        const payload = [{
            attribute: 'runningState',
            minimumReportInterval: 0,
            maximumReportInterval: repInterval.HOUR,
            reportableChange: 0,
        }];
        await endpoint.configureReporting('hvacThermostat', payload);
    },
    presentValue: async (endpoint) => {
        const payload = [{
            attribute: 'presentValue',
            minimumReportInterval: 10,
            maximumReportInterval: repInterval.MINUTE,
            reportableChange: 1,
        }];
        await endpoint.configureReporting('genBinaryInput', payload);
    },
    activePower: async (endpoint) => {
        const payload = [{
            attribute: 'activePower',
            minimumReportInterval: 1,
            maximumReportInterval: repInterval.MINUTES_5,
            reportableChange: 1,
        }];
        await endpoint.configureReporting('haElectricalMeasurement', payload);
    },
    rmsCurrent: async (endpoint) => {
        const payload = [{
            attribute: 'rmsCurrent',
            minimumReportInterval: 1,
            maximumReportInterval: repInterval.MINUTES_5,
            reportableChange: 1,
        }];
        await endpoint.configureReporting('haElectricalMeasurement', payload);
    },
    rmsVoltage: async (endpoint) => {
        const payload = [{
            attribute: 'rmsVoltage',
            minimumReportInterval: 1,
            maximumReportInterval: repInterval.MINUTES_5,
            reportableChange: 1,
        }];
        await endpoint.configureReporting('haElectricalMeasurement', payload);
    },
    powerFactor: async (endpoint) => {
        const payload = [{
            attribute: 'powerFactor',
            minimumReportInterval: 1,
            maximumReportInterval: repInterval.MINUTES_5,
            reportableChange: 1,
        }];
        await endpoint.configureReporting('haElectricalMeasurement', payload);
    },
    acVoltageMultiplier: async (endpoint) => {
        const payload = [{
            attribute: 'acVoltageMultiplier',
            minimumReportInterval: 10,
            maximumReportInterval: repInterval.HOUR,
            reportableChange: 0,
        }];
        await endpoint.configureReporting('haElectricalMeasurement', payload);
    },
    acVoltageDivisor: async (endpoint) => {
        const payload = [{
            attribute: 'acVoltageDivisor',
            minimumReportInterval: 10,
            maximumReportInterval: repInterval.HOUR,
            reportableChange: 0,
        }];
        await endpoint.configureReporting('haElectricalMeasurement', payload);
    },
    acCurrentMultiplier: async (endpoint) => {
        const payload = [{
            attribute: 'acCurrentMultiplier',
            minimumReportInterval: 10,
            maximumReportInterval: repInterval.HOUR,
            reportableChange: 0,
        }];
        await endpoint.configureReporting('haElectricalMeasurement', payload);
    },
    acCurrentDivisor: async (endpoint) => {
        const payload = [{
            attribute: 'acCurrentDivisor',
            minimumReportInterval: 10,
            maximumReportInterval: repInterval.HOUR,
            reportableChange: 0,
        }];
        await endpoint.configureReporting('haElectricalMeasurement', payload);
    },
    acPowerMultiplier: async (endpoint) => {
        const payload = [{
            attribute: 'acPowerMultiplier',
            minimumReportInterval: 10,
            maximumReportInterval: repInterval.HOUR,
            reportableChange: 0,
        }];
        await endpoint.configureReporting('haElectricalMeasurement', payload);
    },
    acPowerDivisor: async (endpoint) => {
        const payload = [{
            attribute: 'acPowerDivisor',
            minimumReportInterval: 10,
            maximumReportInterval: repInterval.HOUR,
            reportableChange: 0,
        }];
        await endpoint.configureReporting('haElectricalMeasurement', payload);
    },
    fanMode: async (endpoint) => {
        const payload = [{
            attribute: 'fanMode',
            minimumReportInterval: 0,
            maximumReportInterval: repInterval.HOUR,
            reportableChange: 0,
        }];
        await endpoint.configureReporting('hvacFanCtrl', payload);
    },
};

const generic = {
    light_onoff_brightness: {
        supports: 'on/off, brightness',
        fromZigbee: [fz.on_off, fz.brightness, fz.ignore_basic_report],
        toZigbee: [tz.light_onoff_brightness, tz.ignore_transition, tz.light_alert, tz.light_brightness_move],
    },
    light_onoff_brightness_colortemp: {
        supports: 'on/off, brightness, color temperature',
        fromZigbee: [fz.color_colortemp, fz.on_off, fz.brightness],
        toZigbee: [
            tz.light_onoff_brightness, tz.light_colortemp, tz.ignore_transition, tz.light_alert,
            tz.light_brightness_move,
        ],
    },
    light_onoff_brightness_colorxy: {
        supports: 'on/off, brightness, color xy',
        fromZigbee: [fz.color_colortemp, fz.on_off, fz.brightness],
        toZigbee: [
            tz.light_onoff_brightness, tz.light_color, tz.ignore_transition, tz.light_alert,
            tz.light_brightness_move,
        ],
    },
    light_onoff_brightness_colortemp_colorxy: {
        supports: 'on/off, brightness, color temperature, color xy',
        fromZigbee: [
            fz.color_colortemp, fz.on_off, fz.brightness,
            fz.ignore_basic_report,
        ],
        toZigbee: [
            tz.light_onoff_brightness, tz.light_color_colortemp, tz.ignore_transition,
            tz.light_alert, tz.light_brightness_move,
        ],
    },
};

const gledopto = {
    light: {
        supports: generic.light_onoff_brightness_colortemp_colorxy.supports,
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy.fromZigbee,
        toZigbee: [
            tz.gledopto_light_onoff_brightness, tz.gledopto_light_color_colortemp_white, tz.ignore_transition,
            tz.light_alert,
        ],
    },
};

const tzHuePowerOnBehavior = [tz.hue_power_on_behavior, tz.hue_power_on_brightness, tz.hue_power_on_color_temperature];
const hue = {
    light_onoff_brightness: {
        supports: generic.light_onoff_brightness.supports + ', power-on behavior',
        fromZigbee: generic.light_onoff_brightness.fromZigbee,
        toZigbee: generic.light_onoff_brightness.toZigbee.concat(tzHuePowerOnBehavior),
    },
    light_onoff_brightness_colortemp: {
        supports: generic.light_onoff_brightness_colortemp.supports + ', power-on behavior',
        fromZigbee: generic.light_onoff_brightness_colortemp.fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp.toZigbee.concat(tzHuePowerOnBehavior),
    },
    light_onoff_brightness_colorxy: {
        supports: generic.light_onoff_brightness_colorxy.supports + ', power-on behavior',
        fromZigbee: generic.light_onoff_brightness_colorxy.fromZigbee,
        toZigbee: generic.light_onoff_brightness_colorxy.toZigbee.concat(tzHuePowerOnBehavior),
    },
    light_onoff_brightness_colortemp_colorxy: {
        supports: generic.light_onoff_brightness_colortemp_colorxy.supports + ', power-on behavior',
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy.fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy.toZigbee.concat(tzHuePowerOnBehavior),
    },
};

const devices = [
    // Xiaomi
    {
        zigbeeModel: ['lumi.light.aqcn02'],
        model: 'ZNLDP12LM',
        vendor: 'Xiaomi',
        description: 'Aqara smart LED bulb',
        extend: generic.light_onoff_brightness_colortemp,
        fromZigbee: [
            fz.brightness, fz.color_colortemp, fz.on_off, fz.xiaomi_bulb_interval,
            fz.ignore_light_brightness_report, fz.ignore_light_color_colortemp_report,
            fz.ignore_occupancy_report, fz.ignore_humidity_report,
            fz.ignore_pressure_report, fz.ignore_temperature_report,
        ],
    },
    {
        zigbeeModel: ['lumi.sensor_switch'],
        model: 'WXKG01LM',
        vendor: 'Xiaomi',
        description: 'MiJia wireless switch',
        supports: 'single, double, triple, quadruple, many, long, long_release click',
        fromZigbee: [fz.xiaomi_battery_3v, fz.WXKG01LM_click],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_switch.aq2', 'lumi.remote.b1acn01'],
        model: 'WXKG11LM',
        vendor: 'Xiaomi',
        description: 'Aqara wireless switch',
        supports: 'single, double click (and triple, quadruple, hold, release depending on model)',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.WXKG11LM_click,
            fz.xiaomi_action_click_multistate,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_switch.aq3', 'lumi.sensor_swit'],
        model: 'WXKG12LM',
        vendor: 'Xiaomi',
        description: 'Aqara wireless switch (with gyroscope)',
        supports: 'single, double, shake, hold, release',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.WXKG12LM_action_click_multistate,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_86sw1', 'lumi.remote.b186acn01'],
        model: 'WXKG03LM',
        vendor: 'Xiaomi',
        description: 'Aqara single key wireless wall switch',
        supports: 'single (and double, hold, release and long click depending on model)',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.WXKG03LM_click,
            fz.xiaomi_action_click_multistate,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_86sw2', 'lumi.sensor_86sw2.es1', 'lumi.remote.b286acn01'],
        model: 'WXKG02LM',
        vendor: 'Xiaomi',
        description: 'Aqara double key wireless wall switch',
        supports: 'left, right, both click (and double, long click for left, right and both depending on model)',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.WXKG02LM_click,
            fz.WXKG02LM_click_multistate,
        ],
        toZigbee: [],
        endpoint: (device) => {
            return {'left': 1, 'right': 2, 'both': 3};
        },
    },
    {
        zigbeeModel: ['lumi.ctrl_neutral1'],
        model: 'QBKG04LM',
        vendor: 'Xiaomi',
        // eslint-disable-next-line
        description: 'Aqara single key wired wall switch without neutral wire. Doesn\'t work as a router and doesn\'t support power meter',
        supports: 'release/hold, on/off',
        fromZigbee: [
            fz.QBKG04LM_QBKG11LM_state, fz.QBKG04LM_buttons,
            fz.QBKG04LM_QBKG11LM_operation_mode, fz.ignore_basic_report,
        ],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode],
        endpoint: (device) => {
            return {'system': 1, 'default': 2};
        },
    },
    {
        zigbeeModel: ['lumi.ctrl_ln1.aq1', 'lumi.ctrl_ln1'],
        model: 'QBKG11LM',
        vendor: 'Xiaomi',
        description: 'Aqara single key wired wall switch',
        supports: 'on/off, power measurement',
        fromZigbee: [
            fz.QBKG04LM_QBKG11LM_state, fz.QBKG11LM_power, fz.QBKG04LM_QBKG11LM_operation_mode,
            fz.QBKG11LM_click,
            fz.ignore_multistate_report, fz.xiaomi_power,
        ],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode],
    },
    {
        zigbeeModel: ['lumi.ctrl_neutral2'],
        model: 'QBKG03LM',
        vendor: 'Xiaomi',
        // eslint-disable-next-line
        description: 'Aqara double key wired wall switch without neutral wire. Doesn\'t work as a router and doesn\'t support power meter',
        supports: 'release/hold, on/off, temperature',
        fromZigbee: [
            fz.QBKG03LM_QBKG12LM_LLKZMK11LM_state, fz.QBKG03LM_buttons,
            fz.QBKG03LM_QBKG12LM_operation_mode, fz.ignore_basic_report,
            fz.generic_device_temperature,
        ],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode],
        endpoint: (device) => {
            return {'system': 1, 'left': 2, 'right': 3};
        },
    },
    {
        zigbeeModel: ['lumi.ctrl_ln2.aq1'],
        model: 'QBKG12LM',
        vendor: 'Xiaomi',
        description: 'Aqara double key wired wall switch',
        supports: 'on/off, power measurement',
        fromZigbee: [
            fz.QBKG03LM_QBKG12LM_LLKZMK11LM_state, fz.QBKG12LM_LLKZMK11LM_power, fz.QBKG03LM_QBKG12LM_operation_mode,
            fz.QBKG12LM_click, fz.ignore_multistate_report, fz.xiaomi_power,
        ],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode],
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
    },
    {
        zigbeeModel: ['lumi.sens', 'lumi.sensor_ht'],
        model: 'WSDCGQ01LM',
        vendor: 'Xiaomi',
        description: 'MiJia temperature & humidity sensor',
        supports: 'temperature and humidity',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.WSDCGQ01LM_WSDCGQ11LM_interval, fz.xiaomi_temperature, fz.humidity,

        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.weather'],
        model: 'WSDCGQ11LM',
        vendor: 'Xiaomi',
        description: 'Aqara temperature, humidity and pressure sensor',
        supports: 'temperature, humidity and pressure',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.xiaomi_temperature, fz.humidity, fz.generic_pressure,
            fz.WSDCGQ01LM_WSDCGQ11LM_interval,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_motion'],
        model: 'RTCGQ01LM',
        vendor: 'Xiaomi',
        description: 'MiJia human body movement sensor',
        supports: 'occupancy',
        fromZigbee: [fz.xiaomi_battery_3v, fz.occupancy_with_timeout],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_motion.aq2'],
        model: 'RTCGQ11LM',
        vendor: 'Xiaomi',
        description: 'Aqara human body movement and illuminance sensor',
        supports: 'occupancy and illuminance',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.occupancy_with_timeout, fz.generic_illuminance,
            fz.RTCGQ11LM_interval,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_magnet'],
        model: 'MCCGQ01LM',
        vendor: 'Xiaomi',
        description: 'MiJia door & window contact sensor',
        supports: 'contact',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.xiaomi_contact,

        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_magnet.aq2'],
        model: 'MCCGQ11LM',
        vendor: 'Xiaomi',
        description: 'Aqara door & window contact sensor',
        supports: 'contact',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.xiaomi_contact, fz.xiaomi_contact_interval,

        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_wleak.aq1'],
        model: 'SJCGQ11LM',
        vendor: 'Xiaomi',
        description: 'Aqara water leak sensor',
        supports: 'water leak true/false',
        fromZigbee: [fz.xiaomi_battery_3v, fz.SJCGQ11LM_water_leak_iaszone],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_cube', 'lumi.sensor_cube.aqgl01'],
        model: 'MFKZQ01LM',
        vendor: 'Xiaomi',
        description: 'Mi/Aqara smart home cube',
        supports: 'shake, wakeup, fall, tap, slide, flip180, flip90, rotate_left and rotate_right',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.MFKZQ01LM_action_multistate, fz.MFKZQ01LM_action_analog,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.plug'],
        model: 'ZNCZ02LM',
        description: 'Mi power plug ZigBee',
        supports: 'on/off, power measurement',
        vendor: 'Xiaomi',
        fromZigbee: [
            fz.on_off, fz.xiaomi_power, fz.xiaomi_plug_state, fz.ignore_occupancy_report,
            fz.ignore_illuminance_report,
        ],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            // By default this device is in group 0; remove it otherwise the E1743 will control it.
            // https://github.com/Koenkk/zigbee2mqtt/issues/2059
            const endpoint = device.getEndpoint(1);
            await endpoint.removeFromGroup(0);
        },
    },
    {
        zigbeeModel: ['lumi.plug.mitw01'],
        model: 'ZNCZ03LM',
        description: 'Mi power plug ZigBee TW',
        supports: 'on/off, power measurement',
        vendor: 'Xiaomi',
        fromZigbee: [
            fz.on_off, fz.xiaomi_power, fz.xiaomi_plug_state,
            fz.ignore_occupancy_report,
            fz.ignore_illuminance_report,
        ],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['lumi.plug.mmeu01'],
        model: 'ZNCZ04LM',
        description: 'Mi power plug ZigBee EU',
        supports: 'on/off, power measurement',
        vendor: 'Xiaomi',
        fromZigbee: [
            fz.on_off, fz.xiaomi_power, fz.xiaomi_plug_state,
        ],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['lumi.ctrl_86plug', 'lumi.ctrl_86plug.aq1'],
        model: 'QBCZ11LM',
        description: 'Aqara socket Zigbee',
        supports: 'on/off, power measurement',
        vendor: 'Xiaomi',
        fromZigbee: [
            fz.on_off, fz.xiaomi_power, fz.xiaomi_plug_state,
        ],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['lumi.sensor_smoke'],
        model: 'JTYJ-GD-01LM/BW',
        description: 'MiJia Honeywell smoke detector',
        supports: 'smoke',
        vendor: 'Xiaomi',
        fromZigbee: [fz.xiaomi_battery_3v, fz.JTYJGD01LMBW_smoke, fz.JTYJGD01LMBW_smoke_density],
        toZigbee: [tz.JTQJBF01LMBW_JTYJGD01LMBW_sensitivity, tz.JTQJBF01LMBW_JTYJGD01LMBW_selfest],
    },
    {
        zigbeeModel: ['lumi.sensor_natgas'],
        model: 'JTQJ-BF-01LM/BW',
        vendor: 'Xiaomi',
        description: 'MiJia gas leak detector ',
        supports: 'gas',
        fromZigbee: [fz.JTQJBF01LMBW_gas, fz.JTQJBF01LMBW_sensitivity, fz.JTQJBF01LMBW_gas_density],
        toZigbee: [tz.JTQJBF01LMBW_JTYJGD01LMBW_sensitivity, tz.JTQJBF01LMBW_JTYJGD01LMBW_selfest],
    },
    {
        zigbeeModel: ['lumi.lock.v1'],
        model: 'A6121',
        vendor: 'Xiaomi',
        description: 'Vima Smart Lock',
        supports: 'inserted, forgotten, key error',
        fromZigbee: [fz.xiaomi_lock_report],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.vibration.aq1'],
        model: 'DJT11LM',
        vendor: 'Xiaomi',
        description: 'Aqara vibration sensor',
        supports: 'drop, tilt and touch',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.DJT11LM_vibration,
        ],
        toZigbee: [tz.DJT11LM_vibration_sensitivity],
    },
    {
        zigbeeModel: ['lumi.curtain', 'lumi.curtain.aq2'],
        model: 'ZNCLDJ11LM',
        description: 'Aqara curtain motor',
        supports: 'open, close, stop, position',
        vendor: 'Xiaomi',
        fromZigbee: [fz.ZNCLDJ11LM_ZNCLDJ12LM_curtain_analog_output, fz.cover_position_tilt, fz.ignore_basic_report],
        toZigbee: [tz.ZNCLDJ11LM_ZNCLDJ12LM_control],
    },
    {
        zigbeeModel: ['lumi.curtain.hagl04'],
        model: 'ZNCLDJ12LM',
        vendor: 'Xiaomi',
        description: 'Aqara B1 curtain motor ',
        supports: 'open, close, stop, position',
        fromZigbee: [fz.ZNCLDJ11LM_ZNCLDJ12LM_curtain_analog_output, fz.cover_position_tilt, fz.ignore_basic_report],
        toZigbee: [tz.ZNCLDJ11LM_ZNCLDJ12LM_control],
        onEvent: async (type, data, device) => {
            // The position (genAnalogOutput.presentValue) reported via an attribute contains an invaid value
            // however when reading it will provide the correct value.
            if (data.type === 'attributeReport' && data.cluster === 'genAnalogOutput') {
                await device.endpoints[0].read('genAnalogOutput', ['presentValue']);
            }
        },
    },
    {
        zigbeeModel: ['lumi.relay.c2acn01'],
        model: 'LLKZMK11LM',
        vendor: 'Xiaomi',
        description: 'Aqara wireless relay controller',
        supports: 'on/off, power measurement',
        fromZigbee: [
            fz.QBKG03LM_QBKG12LM_LLKZMK11LM_state, fz.QBKG12LM_LLKZMK11LM_power, fz.xiaomi_power,
            fz.ignore_multistate_report,
        ],
        toZigbee: [tz.on_off, tz.LLKZMK11LM_interlock],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
    },
    {
        zigbeeModel: ['lumi.lock.acn02'],
        model: 'ZNMS12LM',
        description: 'Aqara S2 Lock',
        supports: 'report: open, close, operation',
        vendor: 'Xiaomi',
        fromZigbee: [
            fz.ZNMS12LM_ZNMS13LM_closuresDoorLock_report, fz.ignore_basic_report,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.lock.acn03'],
        model: 'ZNMS13LM',
        description: 'Aqara S2 Lock Pro',
        supports: 'report: open, close, operation',
        vendor: 'Xiaomi',
        fromZigbee: [
            fz.ZNMS12LM_ZNMS13LM_closuresDoorLock_report, fz.ignore_basic_report,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.remote.b286opcn01'],
        model: 'WXCJKG11LM',
        vendor: 'Xiaomi',
        description: 'Aqara Opple switch 1 band',
        supports: 'action',
        fromZigbee: [
            fz.aqara_opple_on, fz.aqara_opple_off,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.remote.b486opcn01'],
        model: 'WXCJKG12LM',
        vendor: 'Xiaomi',
        description: 'Aqara Opple switch 2 bands',
        supports: 'action',
        fromZigbee: [
            fz.aqara_opple_on, fz.aqara_opple_off,
            fz.aqara_opple_step,
            fz.aqara_opple_step_color_temp,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.remote.b686opcn01'],
        model: 'WXCJKG13LM',
        vendor: 'Xiaomi',
        description: 'Aqara Opple switch 3 bands',
        supports: 'action',
        fromZigbee: [
            fz.aqara_opple_on, fz.aqara_opple_off,
            fz.aqara_opple_step,
            fz.aqara_opple_move,
            fz.aqara_opple_stop,
            fz.aqara_opple_step_color_temp,
            fz.aqara_opple_move_color_temp,
        ],
        toZigbee: [],
    },

    // TuYa
    {
        zigbeeModel: ['TS0201'],
        model: 'TS0201',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor with display',
        supports: 'temperature and humidity',
        fromZigbee: [fz.battery_percentage_remaining, fz.temperature, fz.humidity],
        toZigbee: [],
    },

    // IKEA
    {
        zigbeeModel: [
            'TRADFRI bulb E27 WS opal 980lm', 'TRADFRI bulb E26 WS opal 980lm',
            'TRADFRI bulb E27 WS\uFFFDopal 980lm',
        ],
        model: 'LED1545G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 980 lumen, dimmable, white spectrum, opal white',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WS clear 950lm', 'TRADFRI bulb E26 WS clear 950lm'],
        model: 'LED1546G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 950 lumen, dimmable, white spectrum, clear',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 opal 1000lm', 'TRADFRI bulb E27 W opal 1000lm'],
        model: 'LED1623G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 1000 lumen, dimmable, opal white',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['TRADFRI bulb GU10 WS 400lm'],
        model: 'LED1537R6',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 400 lumen, dimmable, white spectrum',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['TRADFRI bulb GU10 W 400lm'],
        model: 'LED1650R5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 400 lumen, dimmable',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 WS opal 400lm', 'TRADFRI bulb E12 WS opal 400lm'],
        model: 'LED1536G5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E12/E14 400 lumen, dimmable, white spectrum, opal white',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['TRADFRI bulb GU10 WW 400lm'],
        model: 'LED1837R5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 400 lumen, dimmable',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WW clear 250lm'],
        model: 'LED1842G3',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 WW clear 250 lumen, dimmable',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 WS opal 600lm'],
        model: 'LED1733G7',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E14 600 lumen, dimmable, white spectrum, opal white',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['TRADFRI bulb E26 opal 1000lm', 'TRADFRI bulb E26 W opal 1000lm'],
        model: 'LED1622G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26 1000 lumen, dimmable, opal white',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: [
            'TRADFRI bulb E27 CWS opal 600lm',
            'TRADFRI bulb E26 CWS opal 600lm',
            'TRADFRI bulb E14 CWS opal 600lm'],
        model: 'LED1624G9',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E14/E26/E27 600 lumen, dimmable, color, opal white',
        extend: generic.light_onoff_brightness_colorxy,
    },
    {
        zigbeeModel: [
            'TRADFRI bulb E14 W op/ch 400lm', 'TRADFRI bulb E12 W op/ch 400lm',
            'TRADFRI bulb E17 W op/ch 400lm',
        ],
        model: 'LED1649C5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E12/E14/E17 400 lumen, dimmable warm white, chandelier opal',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WS opal 1000lm', 'TRADFRI bulb E26 WS opal 1000lm'],
        model: 'LED1732G11',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 1000 lumen, dimmable, white spectrum, opal white',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WW 806lm', 'TRADFRI bulb E26 WW 806lm'],
        model: 'LED1836G9',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 806 lumen, dimmable, warm white',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WS clear 806lm'],
        model: 'LED1736G9',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 806 lumen, dimmable, white spectrum, clear',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['LEPTITER Recessed spot light'],
        model: 'T1820',
        vendor: 'IKEA',
        description: 'LEPTITER Recessed spot light, dimmable, white spectrum',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['TRADFRI wireless dimmer'],
        model: 'ICTC-G-1',
        vendor: 'IKEA',
        description: 'TRADFRI wireless dimmer',
        supports: 'brightness [0-255] (quick rotate for instant 0/255), action',
        fromZigbee: [
            fz.cmd_move, fz.cmd_move_with_onoff, fz.cmd_stop, fz.cmd_stop_with_onoff,
            fz.cmd_move_to_level_with_onoff, fz.generic_battery,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genLevelCtrl', 'genPowerCfg']);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['TRADFRI transformer 10W', 'TRADFRI Driver 10W'],
        model: 'ICPSHC24-10EU-IL-1',
        vendor: 'IKEA',
        description: 'TRADFRI driver for wireless control (10 watt)',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['TRADFRI transformer 30W', 'TRADFRI Driver 30W'],
        model: 'ICPSHC24-30EU-IL-1',
        vendor: 'IKEA',
        description: 'TRADFRI driver for wireless control (30 watt)',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['FLOALT panel WS 30x30'],
        model: 'L1527',
        vendor: 'IKEA',
        description: 'FLOALT LED light panel, dimmable, white spectrum (30x30 cm)',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['FLOALT panel WS 60x60'],
        model: 'L1529',
        vendor: 'IKEA',
        description: 'FLOALT LED light panel, dimmable, white spectrum (60x60 cm)',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['FLOALT panel WS 30x90'],
        model: 'L1528',
        vendor: 'IKEA',
        description: 'FLOALT LED light panel, dimmable, white spectrum (30x90 cm)',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['SURTE door WS 38x64'],
        model: 'L1531',
        vendor: 'IKEA',
        description: 'SURTE door light panel, dimmable, white spectrum (38x64 cm)',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['TRADFRI control outlet'],
        model: 'E1603/E1702',
        description: 'TRADFRI control outlet',
        supports: 'on/off',
        vendor: 'IKEA',
        fromZigbee: [
            fz.on_off, fz.ignore_genLevelCtrl_report, fz.ignore_basic_report,
        ],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['TRADFRI remote control'],
        model: 'E1524/E1810',
        description: 'TRADFRI remote control',
        supports:
            'toggle, arrow left/right click/hold/release, brightness up/down click/hold/release',
        vendor: 'IKEA',
        fromZigbee: [
            fz.cmdToggle, fz.E1524_arrow_click, fz.E1524_arrow_hold, fz.E1524_arrow_release,
            fz.E1524_brightness_up_click, fz.E1524_brightness_down_click, fz.E1524_brightness_up_hold,
            fz.E1524_brightness_up_release, fz.E1524_brightness_down_hold, fz.E1524_brightness_down_release,
            fz.generic_battery, fz.E1524_hold,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['TRADFRI on/off switch'],
        model: 'E1743',
        vendor: 'IKEA',
        description: 'TRADFRI ON/OFF switch',
        supports: 'on, off, brightness up/down/stop',
        fromZigbee: [
            fz.genOnOff_cmdOn, fz.genOnOff_cmdOff, fz.E1743_brightness_up, fz.E1743_brightness_down,
            fz.E1743_brightness_stop, fz.generic_battery,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['SYMFONISK Sound Controller'],
        model: 'E1744',
        vendor: 'IKEA',
        description: 'SYMFONISK sound controller',
        supports: 'volume up/down, play/pause, skip forward/backward',
        fromZigbee: [fz.cmd_move, fz.cmd_stop, fz.E1744_play_pause, fz.E1744_skip, fz.generic_battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genLevelCtrl', 'genPowerCfg']);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['TRADFRI motion sensor'],
        model: 'E1525',
        vendor: 'IKEA',
        description: 'TRADFRI motion sensor',
        supports: 'occupancy',
        fromZigbee: [fz.generic_battery, fz.E1525_occupancy],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['TRADFRI signal repeater'],
        model: 'E1746',
        description: 'TRADFRI signal repeater',
        supports: 'linkquality',
        vendor: 'IKEA',
        fromZigbee: [fz.E1746_linkquality],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const payload = [{attribute: 'modelId', minimumReportInterval: 3600, maximumReportInterval: 14400}];
            await endpoint.configureReporting('genBasic', payload);
        },
    },
    {
        zigbeeModel: ['FYRTUR block-out roller blind'],
        model: 'E1757',
        vendor: 'IKEA',
        description: 'FYRTUR roller blind',
        supports: 'open, close, stop, position',
        fromZigbee: [fz.cover_position_tilt, fz.battery_percentage_remaining],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await configureReporting.batteryPercentageRemaining(endpoint);
            await configureReporting.currentPositionLiftPercentage(endpoint);
        },
    },
    {
        zigbeeModel: ['KADRILJ roller blind'],
        model: 'E1926',
        vendor: 'IKEA',
        description: 'KADRILJ roller blind',
        supports: 'open, close, stop, position',
        fromZigbee: [fz.cover_position_tilt, fz.battery_percentage_remaining],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await configureReporting.batteryPercentageRemaining(endpoint);
            await configureReporting.currentPositionLiftPercentage(endpoint);
        },
    },
    {
        zigbeeModel: ['TRADFRI open/close remote'],
        model: 'E1766',
        vendor: 'IKEA',
        description: 'TRADFRI open/close remote',
        supports: 'click',
        fromZigbee: [fz.generic_battery, fz.cover_close, fz.cover_open, fz.cover_stop],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['GUNNARP panel 40*40'],
        model: 'T1829',
        description: 'GUNNARP panel 40*40',
        vendor: 'IKEA',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['TRADFRI bulb E12 WS opal 600lm'],
        model: 'LED1738G7',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E12 600 lumen, dimmable, white spectrum, opal white',
        extend: generic.light_onoff_brightness_colortemp,
    },

    // Philips
    {
        zigbeeModel: ['LTC012'],
        model: '3306431P7',
        vendor: 'Philips',
        description: 'Hue Struana',
        extend: hue.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['LLC012', 'LLC011'],
        model: '7299760PH',
        vendor: 'Philips',
        description: 'Hue Bloom',
        extend: hue.light_onoff_brightness_colorxy,
    },
    {
        zigbeeModel: ['LLC020'],
        model: '7146060PH',
        vendor: 'Philips',
        description: 'Hue Go',
        extend: hue.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['LCC001'],
        model: '4090531P7',
        vendor: 'Philips',
        description: 'Hue Flourish white and color ambiance ceiling light',
        extend: hue.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['LCG002'],
        model: '929001953101',
        vendor: 'Philips',
        description: 'Hue White and Color Ambiance GU10',
        extend: hue.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['LWA004'],
        model: '8718699688820',
        vendor: 'Philips',
        description: 'Hue Filament Standard A60/E27 bluetooth',
        extend: hue.light_onoff_brightness,
    },
    {
        zigbeeModel: ['LCB001'],
        model: '548727',
        vendor: 'Philips',
        description: 'Hue White and Color Ambiance BR30 with bluetooth',
        extend: hue.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['LWB004'],
        model: '433714',
        vendor: 'Philips',
        description: 'Hue Lux A19 bulb E27',
        extend: hue.light_onoff_brightness,
    },
    {
        zigbeeModel: ['LWB006', 'LWB014'],
        model: '9290011370',
        vendor: 'Philips',
        description: 'Hue white A60 bulb E27',
        extend: hue.light_onoff_brightness,
    },
    {
        zigbeeModel: ['LWA001'],
        model: '8718699673147',
        vendor: 'Philips',
        description: 'Hue white A60 bulb E27 bluetooth',
        extend: hue.light_onoff_brightness,
    },
    {
        zigbeeModel: ['LTA001'],
        model: '9290022169',
        vendor: 'Philips',
        description: 'Hue white ambiance E27 with Bluetooth',
        extend: hue.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['LWB010'],
        model: '8718696449691',
        vendor: 'Philips',
        description: 'Hue White Single bulb B22',
        extend: hue.light_onoff_brightness,
    },
    {
        zigbeeModel: ['LWG001'],
        model: '9290018195',
        vendor: 'Philips',
        description: 'Hue white GU10',
        extend: hue.light_onoff_brightness,
    },
    {
        zigbeeModel: ['LWG004'],
        model: 'LWG004',
        vendor: 'Philips',
        description: 'Hue white GU10 bluetooth',
        extend: hue.light_onoff_brightness,
    },
    {
        zigbeeModel: ['LWO001'],
        model: '8718699688882',
        vendor: 'Philips',
        description: 'Hue white Filament bulb G93 E27 bluetooth',
        extend: hue.light_onoff_brightness,
    },
    {
        zigbeeModel: ['LST001'],
        model: '7299355PH',
        vendor: 'Philips',
        description: 'Hue white and color ambiance LightStrip',
        extend: hue.light_onoff_brightness_colorxy,
    },
    {
        zigbeeModel: ['LST002'],
        model: '915005106701',
        vendor: 'Philips',
        description: 'Hue white and color ambiance LightStrip plus',
        extend: hue.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['LST003', 'LST004'],
        model: '9290018187B',
        vendor: 'Philips',
        description: 'Hue white and color ambiance LightStrip Outdoor',
        extend: hue.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['LCA001', 'LCA002'],
        model: '9290022166',
        vendor: 'Philips',
        description: 'Hue white and color ambiance E26/E27',
        extend: hue.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['LCT001', 'LCT007', 'LCT010', 'LCT012', 'LCT014', 'LCT015', 'LCT016'],
        model: '9290012573A',
        vendor: 'Philips',
        description: 'Hue white and color ambiance E26/E27/E14',
        extend: hue.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['LCT002'],
        model: '9290002579A',
        vendor: 'Philips',
        description: 'Hue white and color ambiance BR30',
        extend: hue.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['LCT003'],
        model: '8718696485880',
        vendor: 'Philips',
        description: 'Hue white and color ambiance GU10',
        extend: hue.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['LCT024'],
        model: '915005733701',
        vendor: 'Philips',
        description: 'Hue White and color ambiance Play Lightbar',
        extend: hue.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['LTW011'],
        model: '464800',
        vendor: 'Philips',
        description: 'Hue white ambiance BR30 flood light',
        extend: hue.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['LTW012'],
        model: '8718696695203',
        vendor: 'Philips',
        description: 'Hue white ambiance E14',
        extend: hue.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['LWE002'],
        model: '9290020399',
        vendor: 'Philips',
        description: 'Hue white E14',
        extend: hue.light_onoff_brightness,
    },
    {
        zigbeeModel: ['LTW013'],
        model: '8718696598283',
        vendor: 'Philips',
        description: 'Hue white ambiance GU10',
        extend: hue.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['LTG002'],
        model: '929001953301',
        vendor: 'Philips',
        description: 'Hue white ambiance GU10 with Bluetooth',
        extend: hue.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['LTW015'],
        model: '9290011998B',
        vendor: 'Philips',
        description: 'Hue white ambiance E26',
        extend: hue.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['LTA002'],
        model: '9290022167',
        vendor: 'Philips',
        description: 'Hue white ambiance E26 with Bluetooth',
        extend: hue.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['LTW010', 'LTW001', 'LTW004'],
        model: '8718696548738',
        vendor: 'Philips',
        description: 'Hue white ambiance E26/E27',
        extend: hue.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['LTW017'],
        model: '915005587401',
        vendor: 'Philips',
        description: 'Hue white ambiance Adore light',
        extend: hue.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['LCW001'],
        model: '4090130P7',
        vendor: 'Philips',
        description: 'Hue Sana',
        extend: hue.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['LTC001'],
        model: '3261030P7',
        vendor: 'Philips',
        description: 'Hue Being',
        extend: hue.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['LTC003'],
        model: '3261331P7',
        vendor: 'Philips',
        description: 'Hue white ambiance Still',
        extend: hue.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['LTC011'],
        model: '4096730U7',
        vendor: 'Philips',
        description: 'Hue Cher ceiling light',
        extend: hue.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['LTC013'],
        model: '3216131P5',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle square panel light',
        extend: hue.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['LTC015'],
        model: '3216331P5',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle rectangle panel light',
        extend: hue.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['LTC016'],
        model: '3216431P5',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle round panel light',
        extend: hue.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['LTP003', 'LTP001'],
        model: '4033930P7',
        vendor: 'Philips',
        description: 'Hue white ambiance suspension Fair',
        extend: hue.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['LWF002'],
        model: '9290011370B',
        vendor: 'Philips',
        description: 'Hue white A60 bulb E27',
        extend: hue.light_onoff_brightness,
    },
    {
        zigbeeModel: ['LWB015'],
        model: '046677476816',
        vendor: 'Philips',
        description: 'Hue white PAR38 outdoor',
        extend: hue.light_onoff_brightness,
    },
    {
        zigbeeModel: ['LLC010'],
        model: '7199960PH',
        vendor: 'Philips',
        description: 'Hue Iris',
        extend: hue.light_onoff_brightness_colorxy,
    },
    {
        zigbeeModel: ['RWL020', 'RWL021'],
        model: '324131092621',
        vendor: 'Philips',
        description: 'Hue dimmer switch',
        supports: 'on/off, brightness, up/down/hold/release, click count',
        fromZigbee: [
            fz._324131092621_ignore_on, fz._324131092621_ignore_off, fz._324131092621_ignore_step,
            fz._324131092621_ignore_stop, fz._324131092621_notification,
            fz.battery_percentage_remaining,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);

            const endpoint2 = device.getEndpoint(2);
            const options = {manufacturerCode: 0x100B, disableDefaultResponse: true};
            await endpoint2.write('genBasic', {0x0031: {value: 0x000B, type: 0x19}}, options);
            await bind(endpoint2, coordinatorEndpoint, ['manuSpecificPhilips', 'genPowerCfg']);
            await configureReporting.batteryPercentageRemaining(endpoint2);
        },
        endpoint: (device) => {
            return {'ep1': 1, 'ep2': 2};
        },
    },
    {
        zigbeeModel: ['SML001'],
        model: '9290012607',
        vendor: 'Philips',
        description: 'Hue motion sensor',
        supports: 'occupancy, temperature, illuminance',
        fromZigbee: [
            fz.battery_percentage_remaining, fz.occupancy, fz.temperature,
            fz.generic_illuminance,
            fz.ignore_basic_report,
        ],
        toZigbee: [tz.occupancy_timeout, tz.hue_motion_sensitivity],
        endpoint: (device) => {
            return {
                'default': 2, // default
                'ep1': 1,
                'ep2': 2, // e.g. for write to msOccupancySensing
            };
        },
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            const binds = ['genPowerCfg', 'msIlluminanceMeasurement', 'msTemperatureMeasurement', 'msOccupancySensing'];
            await bind(endpoint, coordinatorEndpoint, binds);
            await configureReporting.batteryPercentageRemaining(endpoint);
            await configureReporting.occupancy(endpoint);
            await configureReporting.temperature(endpoint);
            await configureReporting.illuminance(endpoint);
        },
    },
    {
        zigbeeModel: ['SML002'],
        model: '9290019758',
        vendor: 'Philips',
        description: 'Hue motion outdoor sensor',
        supports: 'occupancy, temperature, illuminance',
        fromZigbee: [
            fz.battery_percentage_remaining, fz.occupancy, fz.temperature,
            fz.generic_illuminance,

        ],
        toZigbee: [tz.occupancy_timeout, tz.hue_motion_sensitivity],
        endpoint: (device) => {
            return {
                'default': 2, // default
                'ep1': 1,
                'ep2': 2, // e.g. for write to msOccupancySensing
            };
        },
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            const binds = ['genPowerCfg', 'msIlluminanceMeasurement', 'msTemperatureMeasurement', 'msOccupancySensing'];
            await bind(endpoint, coordinatorEndpoint, binds);
            await configureReporting.batteryPercentageRemaining(endpoint);
            await configureReporting.occupancy(endpoint);
            await configureReporting.temperature(endpoint);
            await configureReporting.illuminance(endpoint);
        },
    },
    {
        zigbeeModel: ['LOM001'],
        model: '929002240401',
        vendor: 'Philips',
        description: 'Hue smart plug - EU',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['LOM002'],
        model: '046677552343',
        vendor: 'Philips',
        description: 'Hue smart plug bluetooth',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['LLC014'],
        model: '7099860PH',
        vendor: 'Philips',
        description: 'LivingColors Aura',
        extend: hue.light_onoff_brightness_colorxy,
    },
    {
        zigbeeModel: ['LTC014'],
        model: '3216231P5',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle rectangle panel light',
        extend: hue.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['1744530P7'],
        model: '8718696170625',
        vendor: 'Philips',
        description: 'Hue Fuzo outdoor wall light',
        extend: hue.light_onoff_brightness,
    },
    {
        zigbeeModel: ['1743630P7'],
        model: '17436/30/P7',
        vendor: 'Philips',
        description: 'Hue Welcome white flood light',
        extend: hue.light_onoff_brightness,
    },
    {
        zigbeeModel: ['LCS001'],
        model: '1741830P7',
        vendor: 'Philips',
        description: 'Hue Lily outdoor spot light',
        extend: hue.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['LWV001'],
        model: '929002241201',
        vendor: 'Philips',
        description: 'Hue white filament Edison E27 LED',
        extend: hue.light_onoff_brightness,
    },
    {
        zigbeeModel: ['HML004'],
        model: '3115331PH',
        vendor: 'Philips',
        description: 'Phoenix light',
        extend: hue.light_onoff_brightness_colortemp_colorxy,
    },

    // Belkin
    {
        zigbeeModel: ['MZ100'],
        model: 'F7C033',
        vendor: 'Belkin',
        description: 'WeMo smart LED bulb',
        fromZigbee: [
            fz.brightness, fz.on_off,
        ],
        supports: generic.light_onoff_brightness.supports,
        toZigbee: generic.light_onoff_brightness.toZigbee,
    },

    // EDP
    {
        zigbeeModel: ['ZB-SmartPlug-1.0.0'],
        model: 'PLUG EDP RE:DY',
        vendor: 'EDP',
        description: 're:dy plug',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.generic_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(85);
            await configureReporting.onOff(endpoint);
            await configureReporting.instantaneousDemand(endpoint);
            await endpoint.read('seMetering', ['multiplier', 'divisor']);
        },
    },
    {
        zigbeeModel: ['ZB-RelayControl-1.0.0'],
        model: 'SWITCH EDP RE:DY',
        vendor: 'EDP',
        description: 're:dy switch',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(85);
            await configureReporting.onOff(endpoint);
        },
    },

    // Custom devices (DiY)
    {
        zigbeeModel: ['lumi.router'],
        model: 'CC2530.ROUTER',
        vendor: 'Custom devices (DiY)',
        description: '[CC2530 router](http://ptvo.info/cc2530-based-zigbee-coordinator-and-router-112/)',
        supports: 'state, description, type, rssi',
        fromZigbee: [
            fz.CC2530ROUTER_state, fz.CC2530ROUTER_meta, fz.ignore_basic_report,
        ],
        toZigbee: [tz.ptvo_switch_trigger],
    },
    {
        zigbeeModel: ['ptvo.switch'],
        model: 'ptvo.switch',
        vendor: 'Custom devices (DiY)',
        description: '[Multi-channel relay switch](https://ptvo.info/zigbee-switch-configurable-firmware-router-199/)',
        supports: 'hold, single, double and triple click, on/off',
        fromZigbee: [fz.ptvo_switch_state, fz.ptvo_switch_buttons],
        toZigbee: [tz.on_off, tz.ptvo_switch_trigger],
        endpoint: (device) => {
            return {'bottom_left': 1, 'bottom_right': 2, 'top_left': 3, 'top_right': 4, 'center': 5};
        },
    },
    {
        zigbeeModel: ['DNCKAT_S001'],
        model: 'DNCKATSW001',
        vendor: 'Custom devices (DiY)',
        description: '[DNCKAT single key wired wall light switch](https://github.com/dzungpv/dnckatsw00x/)',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['DNCKAT_S002'],
        model: 'DNCKATSW002',
        vendor: 'Custom devices (DiY)',
        description: '[DNCKAT double key wired wall light switch](https://github.com/dzungpv/dnckatsw00x/)',
        supports: 'hold/release, on/off',
        fromZigbee: [fz.DNCKAT_S00X_state, fz.DNCKAT_S00X_buttons],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
    },
    {
        zigbeeModel: ['DNCKAT_S003'],
        model: 'DNCKATSW003',
        vendor: 'Custom devices (DiY)',
        description: '[DNCKAT triple key wired wall light switch](https://github.com/dzungpv/dnckatsw00x/)',
        supports: 'hold/release, on/off',
        fromZigbee: [fz.DNCKAT_S00X_state, fz.DNCKAT_S00X_buttons],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
    },
    {
        zigbeeModel: ['DNCKAT_S004'],
        model: 'DNCKATSW004',
        vendor: 'Custom devices (DiY)',
        description: '[DNCKAT quadruple key wired wall light switch](https://github.com/dzungpv/dnckatsw00x/)',
        supports: 'hold/release, on/off',
        fromZigbee: [fz.DNCKAT_S00X_state, fz.DNCKAT_S00X_buttons],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'bottom_left': 1, 'bottom_right': 2, 'top_left': 3, 'top_right': 4};
        },
    },
    {
        zigbeeModel: ['ZigUP'],
        model: 'ZigUP',
        vendor: 'Custom devices (DiY)',
        description: '[CC2530 based ZigBee relais, switch, sensor and router](https://github.com/formtapez/ZigUP/)',
        supports: 'relais, RGB-stripe, sensors, S0-counter, ADC, digital I/O',
        fromZigbee: [fz.ZigUP_parse],
        toZigbee: [tz.on_off, tz.light_color, tz.ZigUP_lock],
    },
    {
        zigbeeModel: ['ZWallRemote0'],
        model: 'ZWallRemote0',
        vendor: 'Custom devices (DiY)',
        description: 'Matts Wall Switch Remote (https://github.com/mattlokes/ZWallRemote)',
        supports: 'on/off',
        fromZigbee: [fz.cmdToggle],
        toZigbee: [],
    },
    {
        zigbeeModel: ['DTB190502A1'],
        model: 'DTB190502A1',
        vendor: 'Custom devices (DiY)',
        description: '[CC2530 based IO Board https://databyte.ch/?portfolio=zigbee-erstes-board-dtb190502a)',
        supports: 'switch, buttons',
        fromZigbee: [fz.DTB190502A1_parse],
        toZigbee: [tz.DTB190502A1_LED],
    },

    // DIYRuZ
    {
        zigbeeModel: ['DIYRuZ_R4_5'],
        model: 'DIYRuZ_R4_5',
        vendor: 'DIYRuZ',
        description: '[DiY 4 Relays + 4 switches + 1 buzzer](http://modkam.ru/?p=1054)',
        supports: 'on/off',
        fromZigbee: [fz.DNCKAT_S00X_state],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'bottom_left': 1, 'bottom_right': 2, 'top_left': 3, 'top_right': 4, 'center': 5};
        },
    },
    {
        zigbeeModel: ['DIYRuZ_KEYPAD20'],
        model: 'DIYRuZ_KEYPAD20',
        vendor: 'DIYRuZ',
        description: '[DiY 20 button keypad](http://modkam.ru/?p=1114)',
        supports: 'click',
        fromZigbee: [fz.keypad20states, fz.keypad20_battery],
        toZigbee: [],
        endpoint: (device) => {
            return {
                'btn_1': 1, 'btn_2': 2, 'btn_3': 3, 'btn_4': 4, 'btn_5': 5,
                'btn_6': 6, 'btn_7': 7, 'btn_8': 8, 'btn_9': 9, 'btn_10': 10,
                'btn_11': 11, 'btn_12': 12, 'btn_13': 13, 'btn_14': 14, 'btn_15': 15,
                'btn_16': 16, 'btn_17': 17, 'btn_18': 18, 'btn_19': 19, 'btn_20': 20,
            };
        },
    },
    {
        zigbeeModel: ['DIYRuZ_magnet'],
        model: 'DIYRuZ_magnet',
        vendor: 'DIYRuZ',
        description: '[DIYRuZ contact sensor](https://modkam.ru/?p=1220)',
        supports: 'contact',
        fromZigbee: [fz.keypad20_battery, fz.diyruz_contact],
        toZigbee: [],
    },
    {
        zigbeeModel: ['DYRuZ_rspm'],
        model: 'DYRuZ_rspm',
        vendor: 'DIYRuZ',
        description: '[DIYRuZ relay switch power meter](https://modkam.ru/?p=1309)',
        supports: 'relay, switch, adc',
        fromZigbee: [fz.diyruz_rspm],
        toZigbee: [tz.on_off],
    },

    // eCozy
    {
        zigbeeModel: ['Thermostat'],
        model: '1TST-EU',
        vendor: 'eCozy',
        description: 'Smart heating thermostat',
        supports: 'temperature, occupancy, un-/occupied heating, schedule',
        fromZigbee: [
            fz.generic_battery_voltage,
            fz.thermostat_att_report,
        ],
        toZigbee: [
            tz.factory_reset, tz.thermostat_local_temperature, tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint, tz.thermostat_setpoint_raise_lower,
            tz.thermostat_remote_sensing, tz.thermostat_control_sequence_of_operation, tz.thermostat_system_mode,
            tz.thermostat_weekly_schedule, tz.thermostat_clear_weekly_schedule, tz.thermostat_weekly_schedule_rsp,
            tz.thermostat_relay_status_log, tz.thermostat_relay_status_log_rsp,
        ],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3);
            const binds = [
                'genBasic', 'genPowerCfg', 'genIdentify', 'genTime', 'genPollCtrl', 'hvacThermostat',
                'hvacUserInterfaceCfg',
            ];
            await bind(endpoint, coordinatorEndpoint, binds);
            await configureReporting.thermostatTemperature(endpoint);
        },
    },

    // OSRAM
    {
        zigbeeModel: ['Outdoor Lantern W RGBW OSRAM'],
        model: '4058075816718',
        vendor: 'OSRAM',
        description: 'SMART+ outdoor wall lantern RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['Classic A60 RGBW'],
        model: 'AA69697',
        vendor: 'OSRAM',
        description: 'Classic A60 RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['CLA60 RGBW OSRAM'],
        model: 'AC03645',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED CLA60 E27 RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['CLA60 TW OSRAM'],
        model: 'AC03642',
        vendor: 'OSRAM',
        description: 'SMART+ CLASSIC A 60 TW',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['PAR16 DIM Z3'],
        model: 'AC08560',
        vendor: 'OSRAM',
        description: 'SMART+ LED PAR16 GU10',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['CLA60 RGBW Z3'],
        model: 'AC03647',
        vendor: 'OSRAM',
        description: 'SMART+ LED CLASSIC E27 RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        // AA70155 is model number of both bulbs.
        zigbeeModel: ['LIGHTIFY A19 Tunable White', 'Classic A60 TW'],
        model: 'AA70155',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED A19 tunable white / Classic A60 TW',
        supports: generic.light_onoff_brightness_colortemp.supports,
        toZigbee: generic.light_onoff_brightness_colortemp.toZigbee.concat([tz.osram_cmds]),
        fromZigbee: generic.light_onoff_brightness_colortemp.fromZigbee,
    },
    {
        zigbeeModel: ['PAR16 50 TW'],
        model: 'AA68199',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED PAR16 50 GU10 tunable white',
        supports: generic.light_onoff_brightness_colortemp.supports,
        toZigbee: generic.light_onoff_brightness_colortemp.toZigbee.concat([tz.osram_cmds]),
        fromZigbee: generic.light_onoff_brightness_colortemp.fromZigbee,
    },
    {
        zigbeeModel: ['Classic B40 TW - LIGHTIFY'],
        model: 'AB32840',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED Classic B40 tunable white',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['Ceiling TW OSRAM'],
        model: '4058075816794',
        vendor: 'OSRAM',
        description: 'Smart+ Ceiling TW',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['Classic A60 W clear - LIGHTIFY'],
        model: 'AC03641',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED Classic A60 clear',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['Surface Light W �C LIGHTIFY'],
        model: '4052899926158',
        vendor: 'OSRAM',
        description: 'LIGHTIFY Surface Light TW',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['Surface Light TW'],
        model: 'AB401130055',
        vendor: 'OSRAM',
        description: 'LIGHTIFY Surface Light LED Tunable White',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['Plug 01'],
        model: 'AB3257001NJ',
        description: 'Smart+ plug',
        supports: 'on/off',
        vendor: 'OSRAM',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['Plug Z3'],
        model: 'AC10691',
        description: 'Smart+ plug',
        supports: 'on/off',
        vendor: 'OSRAM',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            let endpoint = device.getEndpoint(3);
            // Endpoint 3 is not always present, use endpoint 1 in that case
            // https://github.com/Koenkk/zigbee2mqtt/issues/2178
            if (!endpoint) endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['Flex RGBW', 'LIGHTIFY Indoor Flex RGBW', 'LIGHTIFY Flex RGBW'],
        model: '4052899926110',
        vendor: 'OSRAM',
        description: 'Flex RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['LIGHTIFY Outdoor Flex RGBW', 'LIGHTIFY FLEX OUTDOOR RGBW'],
        model: '4058075036185',
        vendor: 'OSRAM',
        description: 'Outdoor Flex RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['Gardenpole RGBW-Lightify'],
        model: '4058075036147',
        vendor: 'OSRAM',
        description: 'Smart+ gardenpole RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['Gardenpole Mini RGBW OSRAM'],
        model: 'AC0363900NJ',
        vendor: 'OSRAM',
        description: 'Smart+ mini gardenpole RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['PAR 16 50 RGBW - LIGHTIFY'],
        model: 'AB35996',
        vendor: 'OSRAM',
        description: 'Smart+ Spot GU10 Multicolor',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['PAR16 RGBW Z3'],
        model: 'AC08559',
        vendor: 'OSRAM',
        description: 'SMART+ Spot GU10 Multicolor',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['B40 DIM Z3'],
        model: 'AC08562',
        vendor: 'OSRAM',
        description: 'SMART+ Candle E14 Dimmable White',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['Motion Sensor-A'],
        model: 'AC01353010G',
        vendor: 'OSRAM',
        description: 'SMART+ Motion Sensor',
        supports: 'occupancy and temperature',
        fromZigbee: [
            fz.temperature,
            fz.iaszone_occupancy_2,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['MR16 TW OSRAM'],
        model: 'AC03648',
        vendor: 'OSRAM',
        description: 'SMART+ spot GU5.3 tunable white',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['Lightify Switch Mini', 'Lightify Switch Mini blue'],
        model: 'AC0251100NJ/AC0251700NJ',
        vendor: 'OSRAM',
        description: 'Smart+ switch mini',
        supports: 'circle, up, down and hold/release',
        fromZigbee: [
            fz.AC0251100NJ_cmdOn, fz.AC0251100NJ_cmdMoveWithOnOff, fz.AC0251100NJ_cmdStop,
            fz.AC0251100NJ_cmdMoveToColorTemp, fz.AC0251100NJ_cmdMoveHue, fz.AC0251100NJ_cmdMoveToSaturation,
            fz.AC0251100NJ_cmdOff, fz.AC0251100NJ_cmdMove, fz.battery_3V,
            fz.AC0251100NJ_cmdMoveToLevelWithOnOff,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            const endpoint3 = device.getEndpoint(3);
            await bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genPowerCfg']);
            await bind(endpoint2, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await bind(endpoint3, coordinatorEndpoint, ['genLevelCtrl', 'lightingColorCtrl']);
            await configureReporting.batteryVoltage(endpoint1);
        },
    },
    {
        zigbeeModel: ['SubstiTube'],
        model: 'ST8AU-CON',
        vendor: 'OSRAM',
        description: 'OSRAM SubstiTUBE T8 Advanced UO Connected',
        extend: generic.light_onoff_brightness,
    },


    // Hive
    {
        zigbeeModel: ['FWBulb01'],
        model: 'HALIGHTDIMWWE27',
        vendor: 'Hive',
        description: 'Active smart bulb white LED (E27)',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['FWBulb02UK'],
        model: 'HALIGHTDIMWWB22',
        vendor: 'Hive',
        description: 'Active smart bulb white LED (B22)',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['SLP2b', 'SLP2c'],
        model: '1613V',
        vendor: 'Hive',
        description: 'Active plug',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.generic_power, fz.temperature],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
            await configureReporting.instantaneousDemand(endpoint);
            await endpoint.read('seMetering', ['multiplier', 'divisor']);
        },
    },
    {
        zigbeeModel: ['TWBulb01US'],
        model: 'HV-GSCXZB269',
        vendor: 'Hive',
        description: 'Active light cool to warm white (E26) ',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['TWBulb01UK'],
        model: 'HV-GSCXZB279_HV-GSCXZB229',
        vendor: 'Hive',
        description: 'Active light, warm to cool white (E27 & B22)',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['TWGU10Bulb01UK'],
        model: 'HV-GUCXZB5',
        vendor: 'Hive',
        description: 'Active light, warm to cool white (GU10)',
        extend: generic.light_onoff_brightness_colortemp,
    },

    // Innr
    {
        zigbeeModel: ['FL 130 C'],
        model: 'FL 130 C',
        vendor: 'Innr',
        description: 'Color Flex LED strip',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['BF 263'],
        model: 'BF 263',
        vendor: 'Innr',
        description: 'B22 filament bulb dimmable',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['RB 185 C'],
        model: 'RB 185 C',
        vendor: 'Innr',
        description: 'E27 bulb RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['BY 185 C'],
        model: 'BY 185 C',
        vendor: 'Innr',
        description: 'B22 bulb RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['RB 250 C'],
        model: 'RB 250 C',
        vendor: 'Innr',
        description: 'E14 bulb RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['RB 265'],
        model: 'RB 265',
        vendor: 'Innr',
        description: 'E27 bulb',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['RF 265'],
        model: 'RF 265',
        vendor: 'Innr',
        description: 'E27 bulb filament clear',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['RB 278 T'],
        model: 'RB 278 T',
        vendor: 'Innr',
        description: 'E27 bulb',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['RB 285 C'],
        model: 'RB 285 C',
        vendor: 'Innr',
        description: 'E27 bulb RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['BY 285 C'],
        model: 'BY 285 C',
        vendor: 'Innr',
        description: 'B22 bulb RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['RB 165'],
        model: 'RB 165',
        vendor: 'Innr',
        description: 'E27 bulb',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['RB 175 W'],
        model: 'RB 175 W',
        vendor: 'Innr',
        description: 'E27 bulb warm dimming',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['RB 178 T'],
        model: 'RB 178 T',
        vendor: 'Innr',
        description: 'Smart bulb tunable white E27',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['BY 178 T'],
        model: 'BY 178 T',
        vendor: 'Innr',
        description: 'Smart bulb tunable white B22',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['RS 122'],
        model: 'RS 122',
        vendor: 'Innr',
        description: 'GU10 spot',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['RS 125'],
        model: 'RS 125',
        vendor: 'Innr',
        description: 'GU10 spot',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['RS 225'],
        model: 'RS 225',
        vendor: 'Innr',
        description: 'GU10 Spot',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['RS 128 T'],
        model: 'RS 128 T',
        vendor: 'Innr',
        description: 'GU10 spot 350 lm, dimmable, white spectrum',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['RS 228 T'],
        model: 'RS 228 T',
        vendor: 'Innr',
        description: 'GU10 spot 350 lm, dimmable, white spectrum',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['RB 145'],
        model: 'RB 145',
        vendor: 'Innr',
        description: 'E14 candle',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['RB 245'],
        model: 'RB 245',
        vendor: 'Innr',
        description: 'E14 candle',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['RB 248 T'],
        model: 'RB 248 T',
        vendor: 'Innr',
        description: 'E14 candle with white spectrum',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['RB 148 T'],
        model: 'RB 148 T',
        vendor: 'Innr',
        description: 'E14 candle with white spectrum',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['RF 263'],
        model: 'RF 263',
        vendor: 'Innr',
        description: 'E27 filament bulb dimmable',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['BY 165', 'BY 265'],
        model: 'BY 165',
        vendor: 'Innr',
        description: 'B22 bulb dimmable',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['PL 110'],
        model: 'PL 110',
        vendor: 'Innr',
        description: 'Puck Light',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['ST 110'],
        model: 'ST 110',
        vendor: 'Innr',
        description: 'Strip Light',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['UC 110'],
        model: 'UC 110',
        vendor: 'Innr',
        description: 'Under cabinet light',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['DL 110 N'],
        model: 'DL 110 N',
        vendor: 'Innr',
        description: 'Spot narrow',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['DL 110 W'],
        model: 'DL 110 W',
        vendor: 'Innr',
        description: 'Spot wide',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['SL 110 N'],
        model: 'SL 110 N',
        vendor: 'Innr',
        description: 'Spot Flex narrow',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['SL 110 M'],
        model: 'SL 110 M',
        vendor: 'Innr',
        description: 'Spot Flex medium',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['SL 110 W'],
        model: 'SL 110 W',
        vendor: 'Innr',
        description: 'Spot Flex wide',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['SP 120'],
        model: 'SP 120',
        vendor: 'Innr',
        description: 'Smart plug',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.SP120_power, fz.on_off, fz.ignore_genLevelCtrl_report],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await configureReporting.onOff(endpoint);
            await configureReporting.activePower(endpoint);
            await configureReporting.rmsCurrent(endpoint);
            await configureReporting.rmsVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['SP 222'],
        model: 'SP 222',
        vendor: 'Innr',
        description: 'Smart plug',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },

    // Sylvania
    {
        zigbeeModel: ['LIGHTIFY RT Tunable White'],
        model: '73742',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED adjustable white RT 5/6',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['RT RGBW'],
        model: '73741',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED adjustable color RT 5/6',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['LIGHTIFY BR Tunable White'],
        model: '73740',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED adjustable white BR30',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['LIGHTIFY BR RGBW', 'BR30 RGBW'],
        model: '73739',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED RGBW BR30',
        supports: generic.light_onoff_brightness_colortemp_colorxy.supports,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy.toZigbee.concat([tz.osram_cmds]),
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy.fromZigbee,
    },
    {
        zigbeeModel: ['LIGHTIFY A19 RGBW', 'A19 RGBW'],
        model: '73693',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED RGBW A19',
        supports: generic.light_onoff_brightness_colortemp_colorxy.supports,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy.toZigbee.concat([tz.osram_cmds]),
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy.fromZigbee,
    },
    {
        zigbeeModel: ['LIGHTIFY A19 ON/OFF/DIM', 'LIGHTIFY A19 ON/OFF/DIM 10 Year'],
        model: '74283',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED soft white dimmable A19',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['A19 W 10 year'],
        model: '74696',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED soft white dimmable A19',
        supports: generic.light_onoff_brightness.supports,
        toZigbee: generic.light_onoff_brightness.toZigbee.concat([tz.osram_cmds]),
        fromZigbee: generic.light_onoff_brightness.fromZigbee.concat([
            fz.ignore_light_color_colortemp_report,
        ]),
    },
    {
        zigbeeModel: ['PLUG'],
        model: '72922-A',
        vendor: 'Sylvania',
        description: 'SMART+ Smart Plug',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['A19 TW 10 year'],
        model: '71831',
        vendor: 'Sylvania',
        description: 'Smart Home adjustable white A19 LED bulb',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['MR16 TW'],
        model: '74282',
        vendor: 'Sylvania',
        description: 'Smart Home adjustable white MR16 LED bulb',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['LIGHTIFY Gardenspot RGB'],
        model: 'LTFY004',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED gardenspot mini RGB',
        extend: generic.light_onoff_brightness_colorxy,
    },
    {
        zigbeeModel: ['PAR38 W 10 year'],
        model: '74580',
        vendor: 'Sylvania',
        description: 'Smart Home soft white PAR38 outdoor bulb',
        extend: generic.light_onoff_brightness,
    },

    // GE
    {
        zigbeeModel: ['SoftWhite'],
        model: 'PSB19-SW27',
        vendor: 'GE',
        description: 'Link smart LED light bulb, A19 soft white (2700K)',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['ZLL Light'],
        model: '22670',
        vendor: 'GE',
        description: 'Link smart LED light bulb, A19/BR30 soft white (2700K)',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['45852'],
        model: '45852GE',
        vendor: 'GE',
        description: 'ZigBee plug-in smart dimmer',
        supports: 'on/off, brightness',
        fromZigbee: [fz.brightness, fz.on_off],
        toZigbee: [tz.light_onoff_brightness, tz.ignore_transition],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['45853'],
        model: '45853GE',
        vendor: 'GE',
        description: 'Plug-in smart switch',
        supports: 'on/off',
        fromZigbee: [fz.on_off, fz.generic_power],
        toZigbee: [tz.on_off, tz.ignore_transition],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
            await configureReporting.instantaneousDemand(endpoint);
            await endpoint.read('seMetering', ['multiplier', 'divisor']);
        },
    },
    {
        zigbeeModel: ['45856'],
        model: '45856GE',
        vendor: 'GE',
        description: 'In-wall smart switch',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off, tz.ignore_transition],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['45857'],
        model: '45857GE',
        vendor: 'GE',
        description: 'ZigBee in-wall smart dimmer',
        supports: 'on/off, brightness',
        fromZigbee: [fz.brightness, fz.on_off],
        toZigbee: [tz.light_onoff_brightness, tz.ignore_transition],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['Smart Switch'],
        model: 'PTAPT-WH02',
        vendor: 'GE',
        description: 'Quirky smart switch',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'default': 2};
        },
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },

    // Sengled
    {
        zigbeeModel: ['E11-G13'],
        model: 'E11-G13',
        vendor: 'Sengled',
        description: 'Element Classic (A19)',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['E11-G23', 'E11-G33'],
        model: 'E11-G23/E11-G33',
        vendor: 'Sengled',
        description: 'Element Classic (A60)',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['Z01-CIA19NAE26'],
        model: 'Z01-CIA19NAE26',
        vendor: 'Sengled',
        description: 'Element Touch (A19)',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['Z01-A19NAE26'],
        model: 'Z01-A19NAE26',
        vendor: 'Sengled',
        description: 'Element Plus (A19)',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['Z01-A60EAE27'],
        model: 'Z01-A60EAE27',
        vendor: 'Sengled',
        description: 'Element Plus (A60)',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['E11-N1EA'],
        model: 'E11-N1EA',
        vendor: 'Sengled',
        description: 'Element Plus Color (A19)',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['E12-N14'],
        model: 'E12-N14',
        vendor: 'Sengled',
        description: 'Element Classic (BR30)',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['E1A-AC2'],
        model: 'E1ACA4ABE38A',
        vendor: 'Sengled',
        description: 'Element downlight smart LED bulb',
        extend: generic.light_onoff_brightness,
    },

    // Swann
    {
        zigbeeModel: ['SWO-KEF1PA'],
        model: 'SWO-KEF1PA',
        vendor: 'Swann',
        description: 'Key fob remote',
        supports: 'panic, home, away, sleep',
        fromZigbee: [fz.KEF1PA_arm, fz.KEF1PA_panic],
        toZigbee: [tz.factory_reset],
    },
    {
        zigbeeModel: ['SWO-WDS1PA'],
        model: 'SWO-WDS1PA',
        vendor: 'Swann',
        description: 'Window/door sensor',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
    },

    // JIAWEN
    {
        zigbeeModel: ['FB56-ZCW08KU1.1', 'FB56-ZCW08KU1.0'],
        model: 'K2RGBW01',
        vendor: 'JIAWEN',
        description: 'Wireless Bulb E27 9W RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },

    // Netvox
    {
        zigbeeModel: ['Z809AE3R'],
        model: 'Z809A',
        vendor: 'Netvox',
        description: 'Power socket with power consumption monitoring',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.Z809A_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await configureReporting.onOff(endpoint);
            await configureReporting.rmsVoltage(endpoint);
            await configureReporting.rmsCurrent(endpoint);
            await configureReporting.activePower(endpoint);
            await configureReporting.powerFactor(endpoint);
        },
    },

    // Nanoleaf
    {
        zigbeeModel: ['NL08-0800'],
        model: 'NL08-0800',
        vendor: 'Nanoleaf',
        description: 'Smart Ivy Bulb E27',
        extend: generic.light_onoff_brightness,
    },

    // Nue, 3A
    {
        zigbeeModel: ['FTB56+ZSN15HG1.0'],
        model: 'HGZB-1S',
        vendor: 'Nue / 3A',
        description: 'Smart 1 key scene wall switch',
        supports: 'on/off, click',
        toZigbee: [tz.on_off],
        fromZigbee: [fz.scenes_recall_click, fz.ignore_power_report],
    },
    {
        zigbeeModel: ['FTB56+ZSN16HG1.0'],
        model: 'HGZB-02S',
        vendor: 'Nue / 3A',
        description: 'Smart 2 key scene wall switch',
        supports: 'on/off, click',
        toZigbee: [tz.on_off],
        fromZigbee: [fz.scenes_recall_click, fz.ignore_power_report],
    },
    {
        zigbeeModel: ['FB56+ZSN08KJ2.3'],
        model: 'HGZB-045',
        vendor: 'Nue / 3A',
        description: 'Smart 4 key scene wall switch',
        supports: 'on/off, click',
        toZigbee: [tz.on_off],
        fromZigbee: [fz.scenes_recall_click, fz.ignore_power_report],
    },
    {
        zigbeeModel: ['LXN56-DC27LX1.1'],
        model: 'LXZB-02A',
        vendor: 'Nue / 3A',
        description: 'Smart light controller',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['FNB56-ZSW03LX2.0', 'LXN-3S27LX1.0'],
        model: 'HGZB-43',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 3 gang v2.0',
        supports: 'on/off',
        fromZigbee: [fz.generic_state_multi_ep],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'top': 1, 'center': 2, 'bottom': 3};
        },
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FB56+ZSW1IKJ1.7', 'FB56+ZSW1IKJ2.5'],
        model: 'HGZB-043',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 3 gang',
        supports: 'on/off',
        fromZigbee: [fz.generic_state_multi_ep],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'top': 16, 'center': 17, 'bottom': 18};
        },
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(16), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(17), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(18), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FB56+ZSC05HG1.0', 'FNB56-ZBW01LX1.2'],
        model: 'HGZB-04D / HGZB-4D-UK',
        vendor: 'Nue / 3A',
        description: 'Smart dimmer wall switch',
        supports: 'on/off, brightness',
        toZigbee: [tz.on_off, tz.light_brightness],
        fromZigbee: [fz.on_off, fz.brightness],
    },
    {
        zigbeeModel: ['FB56+ZSW1HKJ1.7', 'FB56+ZSW1HKJ2.5'],
        model: 'HGZB-042',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 2 gang',
        supports: 'on/off',
        fromZigbee: [fz.generic_state_multi_ep],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'top': 16, 'bottom': 17};
        },
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(16), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(17), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FNB56-ZSW02LX2.0', 'LXN-2S27LX1.0'],
        model: 'HGZB-42',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 2 gang v2.0',
        supports: 'on/off',
        fromZigbee: [fz.generic_state_multi_ep],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'top': 11, 'bottom': 12};
        },
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(11), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(12), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FNB56-SKT1JXN1.0'],
        model: 'HGZB-20A',
        vendor: 'Nue / 3A',
        description: 'Power plug',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(11), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FB56+ZSW1GKJ2.5', 'LXN-1S27LX1.0'],
        model: 'HGZB-41',
        vendor: 'Nue / 3A',
        description: 'Smart one gang wall switch',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['FNB56-SKT1DHG1.4'],
        model: 'MG-AUWS01',
        vendor: 'Nue / 3A',
        description: 'Smart Double GPO',
        supports: 'on/off',
        fromZigbee: [fz.nue_power_state],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'left': 12, 'right': 11};
        },
    },
    {
        zigbeeModel: ['FNB56-ZCW25FB1.9'],
        model: 'XY12S-15',
        vendor: 'Nue / 3A',
        description: 'Smart light controller RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['FNB56-ZSW23HG1.1', 'LXN56-LC27LX1.1'],
        model: 'HGZB-01A',
        vendor: 'Nue / 3A',
        description: 'Smart in-wall switch',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['FNB56-ZSC01LX1.2', 'FB56+ZSW05HG1.2', 'FB56+ZSC04HG1.0'],
        model: 'HGZB-02A',
        vendor: 'Nue / 3A',
        description: 'Smart light controller',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['FNB56-ZSW01LX2.0'],
        model: 'HGZB-42-UK / HGZB-41 / HGZB-41-UK',
        description: 'Smart switch 1 or 2 gang',
        vendor: 'Nue / 3A',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['FNB56-ZCW25FB1.6', 'FNB56-ZCW25FB2.1'],
        model: 'HGZB-06A',
        vendor: 'Nue / 3A',
        description: 'Smart 7W E27 light bulb',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['LXN56-0S27LX1.1'],
        model: 'HGZB-20-UK',
        vendor: 'Nue / 3A',
        description: 'Power plug',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },

    // Smart Home Pty
    {
        zigbeeModel: ['FB56-ZCW11HG1.2', 'FB56-ZCW11HG1.4', 'LXT56-LS27LX1.7'],
        model: 'HGZB-07A',
        vendor: 'Smart Home Pty',
        description: 'RGBW Downlight',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['FNB56-SKT1EHG1.2'],
        model: 'HGZB-20-DE',
        vendor: 'Smart Home Pty',
        description: 'Power plug',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },

    // Gledopto
    {
        zigbeeModel: ['GL-C-006'],
        model: 'GL-C-006',
        vendor: 'Gledopto',
        description: 'Zigbee LED controller WW/CW',
        extend: gledopto.light,
        supports: 'on/off, brightness, color temperature',
    },
    {
        zigbeeModel: ['GL-C-007'],
        model: 'GL-C-007',
        vendor: 'Gledopto',
        description: 'Zigbee LED controller RGBW',
        extend: gledopto.light,
        supports: 'on/off, brightness, color, white',
    },
    {
        zigbeeModel: ['GL-C-008', 'GLEDOPTO'],
        model: 'GL-C-008',
        vendor: 'Gledopto',
        description: 'Zigbee LED controller RGB + CCT',
        extend: gledopto.light,
        meta: {options: {disableDefaultResponse: true}},
        supports: 'on/off, brightness, color temperature, color',
    },
    {
        zigbeeModel: ['GL-C-008S'],
        model: 'GL-C-008S',
        vendor: 'Gledopto',
        description: 'Zigbee LED controller RGB + CCT plus model',
        extend: gledopto.light,
        meta: {options: {disableDefaultResponse: true}},
        supports: 'on/off, brightness, color temperature, color',
    },
    {
        zigbeeModel: ['GL-C-009'],
        model: 'GL-C-009',
        vendor: 'Gledopto',
        description: 'Zigbee LED controller dimmer',
        extend: gledopto.light,
        supports: 'on/off, brightness',
    },
    {
        zigbeeModel: ['GL-MC-001'],
        model: 'GL-MC-001',
        vendor: 'Gledopto',
        description: 'Zigbee USB mini LED controller RGB + CCT',
        extend: gledopto.light,
        supports: 'on/off, brightness, color temperature, color',
    },
    {
        zigbeeModel: ['GL-S-004Z'],
        model: 'GL-S-004Z',
        vendor: 'Gledopto',
        description: 'Zigbee Smart WW/CW GU10',
        extend: gledopto.light,
        supports: 'on/off, brightness, color temperature',
    },
    {
        zigbeeModel: ['GL-S-007Z'],
        model: 'GL-S-007Z',
        vendor: 'Gledopto',
        description: 'Smart RGBW GU10',
        extend: gledopto.light,
        supports: 'on/off, brightness, color, white',
    },
    {
        zigbeeModel: ['GL-S-007ZS'],
        model: 'GL-S-007ZS',
        vendor: 'Gledopto',
        description: 'Smart RGB+CCT GU10',
        extend: gledopto.light,
        supports: 'on/off, brightness, color, color temperature',
    },
    {
        zigbeeModel: ['GL-B-001Z'],
        model: 'GL-B-001Z',
        vendor: 'Gledopto',
        description: 'Smart 4W E14 RGB / CCT LED bulb',
        extend: gledopto.light,
        supports: 'on/off, brightness, color temperature, color',
    },
    {
        zigbeeModel: ['GL-G-001Z'],
        model: 'GL-G-001Z',
        vendor: 'Gledopto',
        description: 'Smart garden lamp',
        extend: gledopto.light,
        supports: 'on/off, brightness, color temperature, color',
    },
    {
        zigbeeModel: ['GL-G-007Z'],
        model: 'GL-G-007Z',
        vendor: 'Gledopto',
        description: 'Smart garden lamp 9W RGB / CCT',
        extend: gledopto.light,
        supports: 'on/off, brightness, color temperature, color',
    },
    {
        zigbeeModel: ['GL-B-007Z'],
        model: 'GL-B-007Z',
        vendor: 'Gledopto',
        description: 'Smart 6W E27 RGB / CCT LED bulb',
        extend: gledopto.light,
        supports: 'on/off, brightness, color temperature, color',
    },
    {
        zigbeeModel: ['GL-B-008Z'],
        model: 'GL-B-008Z',
        vendor: 'Gledopto',
        description: 'Smart 12W E27 RGB / CCT LED bulb',
        extend: gledopto.light,
        supports: 'on/off, brightness, color temperature, color',
    },
    {
        zigbeeModel: ['GL-B-008ZS'],
        model: 'GL-B-008ZS',
        vendor: 'Gledopto',
        description: 'Smart 12W E27 RGB / CW LED bulb',
        extend: gledopto.light,
        supports: 'on/off, brightness, color temperature, color',
    },
    {
        zigbeeModel: ['GL-D-003Z'],
        model: 'GL-D-003Z',
        vendor: 'Gledopto',
        description: 'LED RGB + CCT downlight ',
        extend: gledopto.light,
        supports: 'on/off, brightness, color temperature, color',
    },
    {
        zigbeeModel: ['GL-D-005Z'],
        model: 'GL-D-005Z',
        vendor: 'Gledopto',
        description: 'LED RGB + CCT downlight ',
        extend: gledopto.light,
        supports: 'on/off, brightness, color temperature, color',
    },
    {
        zigbeeModel: ['GL-S-003Z'],
        model: 'GL-S-003Z',
        vendor: 'Gledopto',
        description: 'Smart RGBW GU10 ',
        extend: gledopto.light,
        supports: 'on/off, brightness, color, white',
    },
    {
        zigbeeModel: ['HOMA2023'],
        model: 'GD-CZ-006',
        vendor: 'Gledopto',
        description: 'Zigbee LED Driver',
        extend: gledopto.light,
        supports: 'on/off, brightness',
    },
    {
        zigbeeModel: ['GL-FL-004TZ'],
        model: 'GL-FL-004TZ',
        vendor: 'Gledopto',
        description: 'Zigbee 10W floodlight RGB CCT',
        extend: gledopto.light,
        supports: 'on/off, brightness, color temperature, color',
    },
    {
        zigbeeModel: ['GL-W-001Z'],
        model: 'GL-W-001Z',
        vendor: 'Gledopto',
        description: 'Zigbee ON/OFF Wall Switch',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        onEvent: async (type, data, device) => {
            // This device doesn't support reporting.
            // Therefore we read the on/off state every 5 seconds.
            // This is the same way as the Hue bridge does it.
            if (type === 'stop') {
                clearInterval(store[device.ieeeAddr]);
            } else if (!store[device.ieeeAddr]) {
                store[device.ieeeAddr] = setInterval(async () => {
                    try {
                        await device.endpoints[0].read('genOnOff', ['onOff']);
                    } catch (error) {
                        // Do nothing
                    }
                }, 5000);
            }
        },
    },

    // ROBB
    {
        zigbeeModel: ['ROB_200-004-0'],
        model: 'ROB_200-004-0',
        vendor: 'ROBB',
        description: 'ZigBee AC phase-cut dimmer',
        supports: 'on/off, brightness',
        fromZigbee: [fz.brightness, fz.on_off, fz.ignore_light_brightness_report],
        toZigbee: [tz.light_onoff_brightness, tz.ignore_transition],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await configureReporting.onOff(endpoint);
        },
    },

    // SmartThings
    {
        zigbeeModel: ['PGC313'],
        model: 'STSS-MULT-001',
        vendor: 'SmartThings',
        description: 'Multipurpose sensor',
        supports: 'contact',
        fromZigbee: [fz.smartthings_contact],
        toZigbee: [],
    },
    {
        zigbeeModel: ['tagv4'],
        model: 'STS-PRS-251',
        vendor: 'SmartThings',
        description: 'Arrival sensor',
        supports: 'presence',
        fromZigbee: [
            fz.STS_PRS_251_presence, fz.battery_3V,
            fz.STS_PRS_251_beeping,
        ],
        toZigbee: [tz.STS_PRS_251_beep],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await configureReporting.batteryVoltage(endpoint);
            await configureReporting.presentValue(endpoint);
        },
    },
    {
        zigbeeModel: ['3325-S'],
        model: '3325-S',
        vendor: 'SmartThings',
        description: 'Motion sensor (2015 model)',
        supports: 'occupancy and temperature',
        fromZigbee: [
            fz.temperature,
            fz.iaszone_occupancy_2,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['3321-S'],
        model: '3321-S',
        vendor: 'SmartThings',
        description: 'Multi Sensor (2015 model)',
        supports: 'contact and temperature',
        fromZigbee: [fz.temperature, fz.smartsense_multi, fz.ias_contact_alarm_1],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await configureReporting.temperature(endpoint);
        },
    },
    {
        zigbeeModel: ['outlet'],
        model: 'IM6001-OTP05',
        vendor: 'SmartThings',
        description: 'Outlet',
        supports: 'on/off',
        fromZigbee: [fz.on_off, fz.ignore_onoff_report],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['outletv4'],
        model: 'STS-OUT-US-2',
        vendor: 'SmartThings',
        description: 'Outlet',
        supports: 'on/off',
        fromZigbee: [fz.on_off, fz.ignore_onoff_report],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['motion'],
        model: 'IM6001-MTP01',
        vendor: 'SmartThings',
        description: 'Motion sensor (2018 model)',
        supports: 'occupancy and temperature',
        fromZigbee: [
            fz.temperature,
            fz.ignore_iaszone_report,
            fz.iaszone_occupancy_1, fz.battery_3V,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['motionv4'],
        model: 'STS-IRM-250',
        vendor: 'SmartThings',
        description: 'Motion sensor (2016 model)',
        supports: 'occupancy and temperature',
        fromZigbee: [
            fz.temperature, fz.iaszone_occupancy_2,
            fz.iaszone_occupancy_1, fz.battery_3V,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['3305-S'],
        model: '3305-S',
        vendor: 'SmartThings',
        description: 'Motion sensor (2014 model)',
        supports: 'occupancy and temperature',
        fromZigbee: [
            fz.temperature, fz.iaszone_occupancy_2,
            fz.battery_3V,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['3300-S'],
        model: '3300-S',
        vendor: 'SmartThings',
        description: 'Door sensor',
        supports: 'contact and temperature',
        fromZigbee: [fz.temperature, fz.smartsense_multi, fz.ias_contact_alarm_1, fz.battery_3V],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['multiv4'],
        model: 'F-MLT-US-2',
        vendor: 'SmartThings',
        description: 'Multipurpose sensor (2016 model)',
        supports: 'contact',
        fromZigbee: [fz.temperature, fz.battery_3V, fz.ias_contact_alarm_1],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['multi'],
        model: 'IM6001-MPP01',
        vendor: 'SmartThings',
        description: 'Multipurpose sensor (2018 model)',
        supports: 'contact',
        fromZigbee: [fz.temperature, fz.ias_contact_alarm_1, fz.battery_3V, fz.ignore_iaszone_attreport],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        /**
         * Note: humidity not (yet) implemented, as this seems to use proprietary cluster
         * see Smartthings device handler (profileID: 0x9194, clusterId: 0xFC45
         * https://github.com/SmartThingsCommunity/SmartThingsPublic/blob/861ec6b88eb45273e341436a23d35274dc367c3b/
         * devicetypes/smartthings/smartsense-temp-humidity-sensor.src/smartsense-temp-humidity-sensor.groovy#L153-L156
         */
        zigbeeModel: ['3310-S'],
        model: '3310-S',
        vendor: 'SmartThings',
        description: 'Temperature and humidity sensor',
        supports: 'temperature',
        fromZigbee: [
            fz.temperature,
            fz.battery_3V,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['IM6001-WLP01'],
        model: 'IM6001-WLP01',
        vendor: 'SmartThings',
        description: 'Water leak sensor',
        supports: 'water leak',
        fromZigbee: [
            fz.temperature,
            fz.st_leak, fz.battery_3V,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['3315-S'],
        model: '3315-S',
        vendor: 'SmartThings',
        description: 'Water sensor',
        supports: 'water and temperature',
        fromZigbee: [
            fz.temperature,
            fz.st_leak, fz.battery_3V,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['water'],
        model: 'F-WTR-UK-V2',
        vendor: 'SmartThings',
        description: 'Water leak sensor (2018 model)',
        supports: 'water leak and temperature',
        fromZigbee: [
            fz.temperature,
            fz.st_leak, fz.battery_3V,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['3315-G'],
        model: '3315-G',
        vendor: 'SmartThings',
        description: 'Water sensor',
        supports: 'water and temperature',
        fromZigbee: [
            fz.temperature,
            fz.st_leak, fz.battery_3V,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['button'],
        model: 'IM6001-BTP01',
        vendor: 'SmartThings',
        description: 'Button',
        supports: 'single click, double click, hold and temperature',
        fromZigbee: [
            fz.st_button_state,
            fz.generic_battery,
            fz.temperature,
            fz.ignore_iaszone_attreport,
            fz.ignore_temperature_report,
        ],
        toZigbee: [],
    },

    // Trust
    {
        zigbeeModel: ['WATER_TPV14'],
        model: 'ZWLD-100',
        vendor: 'Trust',
        description: 'Water leakage detector',
        supports: 'water leak',
        fromZigbee: [
            fz.ias_water_leak_alarm_1,
            fz.ignore_basic_report,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'+
                      '\u0000\u0000\u0000\u0000\u0000'],
        model: 'ZYCT-202',
        vendor: 'Trust',
        description: 'Remote control',
        supports: 'on, off, stop, up-press, down-press',
        fromZigbee: [
            fz.ZYCT202_on, fz.ZYCT202_off, fz.ZYCT202_stop, fz.ZYCT202_up_down,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ZLL-DimmableLigh'],
        model: 'ZLED-2709',
        vendor: 'Trust',
        description: 'Smart Dimmable LED Bulb',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['ZLL-ColorTempera'],
        model: 'ZLED-TUNE9',
        vendor: 'Trust',
        description: 'Smart tunable LED bulb',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['VMS_ADUROLIGHT'],
        model: 'ZPIR-8000',
        vendor: 'Trust',
        description: 'Motion Sensor',
        supports: 'occupancy',
        fromZigbee: [fz.iaszone_occupancy_2],
        toZigbee: [],
    },
    {
        zigbeeModel: ['CSW_ADUROLIGHT'],
        model: 'ZCTS-808',
        vendor: 'Trust',
        description: 'Wireless contact sensor',
        supports: 'contact',
        fromZigbee: [
            fz.ias_contact_alarm_1, fz.battery_percentage_remaining,
            fz.ignore_basic_report,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },

    // Paulmann
    {
        zigbeeModel: ['Switch Controller '],
        model: '50043',
        vendor: 'Paulmann',
        description: 'SmartHome Zigbee Cephei Switch Controller',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['Dimmablelight '],
        model: '50045',
        vendor: 'Paulmann',
        description: 'SmartHome Zigbee LED-stripe',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['RGBW light'],
        model: '50049',
        vendor: 'Paulmann',
        description: 'SmartHome Yourled RGB Controller',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['CCT light'],
        model: '50064',
        vendor: 'Paulmann',
        description: 'SmartHome led spot',
        extend: generic.light_onoff_brightness_colortemp,
    },

    // Bitron
    {
        zigbeeModel: ['AV2010/34'],
        model: 'AV2010/34',
        vendor: 'Bitron',
        description: '4-Touch single click buttons',
        supports: 'click',
        fromZigbee: [fz.ignore_power_report, fz.AV2010_34_click],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
        },
    },
    {
        zigbeeModel: ['902010/22'],
        model: 'AV2010/22',
        vendor: 'Bitron',
        description: 'Wireless motion detector',
        supports: 'occupancy',
        fromZigbee: [fz.iaszone_occupancy_1_with_timeout],
        toZigbee: [],
    },
    {
        zigbeeModel: ['902010/25'],
        model: 'AV2010/25',
        vendor: 'Bitron',
        description: 'Video wireless socket',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.bitron_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.instantaneousDemand(endpoint);
        },
    },
    {
        zigbeeModel: ['902010/32'],
        model: 'AV2010/32',
        vendor: 'Bitron',
        description: 'Wireless wall thermostat with relay',
        supports: 'temperature, heating/cooling system control',
        fromZigbee: [
            fz.bitron_thermostat_att_report,
            fz.bitron_battery_att_report,
        ],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_local_temperature_calibration,
            tz.thermostat_local_temperature, tz.thermostat_running_state,
            tz.thermostat_temperature_display_mode,
        ],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genPowerCfg', 'genIdentify', 'genPollCtrl', 'hvacThermostat', 'hvacUserInterfaceCfg',
            ];
            await bind(endpoint, coordinatorEndpoint, binds);
            await configureReporting.thermostatTemperature(endpoint);
            await configureReporting.thermostatTemperatureCalibration(endpoint);
            await configureReporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await configureReporting.thermostatRunningState(endpoint);
            await configureReporting.batteryAlarmState(endpoint);
            await configureReporting.batteryVoltage(endpoint);
        },
    },

    // Iris
    {
        zigbeeModel: ['3210-L'],
        model: '3210-L',
        vendor: 'Iris',
        description: 'Smart plug',
        supports: 'on/off',
        fromZigbee: [fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await endpoint.read('haElectricalMeasurement', [
                'acVoltageMultiplier', 'acVoltageDivisor', 'acCurrentMultiplier',
                'acCurrentDivisor', 'acPowerMultiplier', 'acPowerDivisor',
            ]);
            await configureReporting.onOff(endpoint);
            await configureReporting.rmsVoltage(endpoint);
            await configureReporting.rmsCurrent(endpoint);
            await configureReporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: ['3326-L'],
        model: '3326-L',
        vendor: 'Iris',
        description: 'Motion and temperature sensor',
        supports: 'occupancy and temperature',
        fromZigbee: [fz.iaszone_occupancy_2, fz.temperature, fz.battery_3V_2100],
        toZigbee: [],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['3320-L'],
        model: '3320-L',
        vendor: 'Iris',
        description: 'Contact and temperature sensor',
        supports: 'contact and temperature',
        fromZigbee: [fz.iris_3320L_contact, fz.temperature, fz.battery_3V_2100],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['1117-S'],
        model: 'iL07_1',
        vendor: 'Iris',
        description: 'Motion Sensor',
        supports: 'motion, tamper and battery',
        fromZigbee: [fz.iaszone_occupancy_2],
        toZigbee: [],
    },

    // ksentry
    {
        zigbeeModel: ['Lamp_01'],
        model: 'KS-SM001',
        vendor: 'Ksentry Electronics',
        description: '[Zigbee OnOff Controller](http://ksentry.manufacturer.globalsources.com/si/6008837134660'+
                     '/pdtl/ZigBee-module/1162731630/zigbee-on-off-controller-modules.htm)',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },

    // Ninja Blocks
    {
        zigbeeModel: ['Ninja Smart plug'],
        model: 'Z809AF',
        vendor: 'Ninja Blocks',
        description: 'Zigbee smart plug with power meter',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.generic_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
            await configureReporting.instantaneousDemand(endpoint);
            await endpoint.read('seMetering', ['multiplier', 'divisor']);
        },
    },

    // Commercial Electric
    {
        zigbeeModel: ['Zigbee CCT Downlight'],
        model: '53170161',
        vendor: 'Commercial Electric',
        description: 'Matte White Recessed Retrofit Smart Led Downlight - 4 Inch',
        extend: generic.light_onoff_brightness_colortemp,
    },

    // ilux
    {
        zigbeeModel: ['LEColorLight'],
        model: '900008-WW',
        vendor: 'ilux',
        description: 'Dimmable A60 E27 LED Bulb',
        extend: generic.light_onoff_brightness,
    },

    // Dresden Elektronik
    {
        zigbeeModel: ['FLS-PP3'],
        model: 'Mega23M12',
        vendor: 'Dresden Elektronik',
        description: 'ZigBee Light Link wireless electronic ballast',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['FLS-CT'],
        model: 'XVV-Mega23M12',
        vendor: 'Dresden Elektronik',
        description: 'ZigBee Light Link wireless electronic ballast color temperature',
        extend: generic.light_onoff_brightness_colortemp,
    },

    // Centralite Swiss Plug
    {
        zigbeeModel: ['4256251-RZHAC', '4257050-RZHAC'],
        model: '4256251-RZHAC',
        vendor: 'Centralite',
        description: 'White Swiss power outlet switch with power meter',
        supports: 'switch and power meter',
        fromZigbee: [fz.on_off, fz.RZHAC_4256251_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
            await configureReporting.rmsVoltage(endpoint);
            await configureReporting.rmsCurrent(endpoint);
            await configureReporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: ['4257050-ZHAC'],
        model: '4257050-ZHAC',
        vendor: 'Centralite',
        description: '3-Series smart dimming outlet',
        supports: 'on/off, brightness, power meter',
        fromZigbee: [fz.restorable_brightness, fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.light_onoff_restorable_brightness],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'haElectricalMeasurement']);
            await endpoint.read('haElectricalMeasurement', [
                'acVoltageMultiplier', 'acVoltageDivisor', 'acCurrentMultiplier',
                'acCurrentDivisor', 'acPowerMultiplier', 'acPowerDivisor',
            ]);
            await configureReporting.onOff(endpoint);
            await configureReporting.rmsVoltage(endpoint);
            await configureReporting.rmsCurrent(endpoint);
            await configureReporting.activePower(endpoint);
        },
    },

    // Blaupunkt
    {
        zigbeeModel: ['SCM-R_00.00.03.15TC', 'SCM_00.00.03.14TC'],
        model: 'SCM-S1',
        vendor: 'Blaupunkt',
        description: 'Roller shutter',
        supports: 'open/close',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff],
        toZigbee: [tz.cover_position_via_brightness, tz.cover_open_close_via_brightness],
    },

    // Lupus
    {
        zigbeeModel: ['SCM_00.00.03.11TC'],
        model: '12031',
        vendor: 'Lupus',
        description: 'Roller shutter',
        supports: 'open/close',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff],
        toZigbee: [tz.cover_position_via_brightness, tz.cover_open_close_via_brightness],
    },
    {
        zigbeeModel: ['PSMP5_00.00.03.11TC'],
        model: '12050',
        vendor: 'Lupus',
        description: 'LUPUSEC mains socket with power meter',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.bitron_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.instantaneousDemand(endpoint);
        },
    },

    // Climax
    {
        zigbeeModel: ['PSS_00.00.00.15TC'],
        model: 'PSS-23ZBS',
        vendor: 'Climax',
        description: 'Power plug',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['SCM-3_00.00.03.15'],
        model: 'SCM-5ZBS',
        vendor: 'Climax',
        description: 'Roller shutter',
        supports: 'open/close',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff],
        toZigbee: [tz.cover_position_via_brightness, tz.cover_open_close_via_brightness],
    },
    {
        zigbeeModel: ['PSM_00.00.00.35TC'],
        model: 'PSM-29ZBSR',
        vendor: 'Climax',
        description: 'Power plug',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },

    // HEIMAN
    {
        zigbeeModel: ['CO_V15'],
        model: 'HS1CA-M',
        description: 'Smart carbon monoxide sensor',
        supports: 'carbon monoxide',
        vendor: 'HEIMAN',
        fromZigbee: [fz.heiman_carbon_monoxide, fz.battery_200],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await configureReporting.batteryPercentageRemaining(endpoint);
            await configureReporting.batteryAlarmState(endpoint);
        },
    },
    {
        zigbeeModel: ['PIRSensor-N'],
        model: 'HS3MS',
        vendor: 'HEIMAN',
        description: 'Smart motion sensor',
        supports: 'occupancy',
        fromZigbee: [fz.iaszone_occupancy_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['SmartPlug'],
        model: 'HS2SK',
        description: 'Smart metering plug',
        supports: 'on/off, power measurement',
        vendor: 'HEIMAN',
        fromZigbee: [fz.on_off, fz.HS2SK_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await configureReporting.onOff(endpoint);
            await configureReporting.rmsVoltage(endpoint);
            await configureReporting.rmsCurrent(endpoint);
            await configureReporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: [
            'SMOK_V16',
            'b5db59bfd81e4f1f95dc57fdbba17931',
            'SMOK_YDLV10',
            'SmokeSensor-EM',
            'FB56-SMF02HM1.4',
        ],
        model: 'HS1SA',
        vendor: 'HEIMAN',
        description: 'Smoke detector',
        supports: 'smoke',
        fromZigbee: [
            fz.heiman_smoke,
            fz.battery_200,
            fz.heiman_smoke_enrolled,

        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await configureReporting.batteryPercentageRemaining(endpoint);
            await configureReporting.batteryAlarmState(endpoint);
        },
    },
    {
        zigbeeModel: ['SmokeSensor-N'],
        model: 'HS3SA',
        vendor: 'HEIMAN',
        description: 'Smoke detector',
        supports: 'smoke',
        fromZigbee: [fz.heiman_smoke, fz.battery_200],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['GASSensor-N'],
        model: 'HS3CG',
        vendor: 'HEIMAN',
        description: 'Combustible gas sensor',
        supports: 'gas',
        fromZigbee: [fz.ias_gas_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['GASSensor-EN'],
        model: 'HS1CG-M',
        vendor: 'HEIMAN',
        description: 'Combustible gas sensor',
        supports: 'gas',
        fromZigbee: [fz.ias_gas_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['GAS_V15'],
        model: 'HS1CG_M',
        vendor: 'HEIMAN',
        description: 'Combustible gas sensor',
        supports: 'gas',
        fromZigbee: [fz.ias_gas_alarm_2],
        toZigbee: [],
    },
    {
        zigbeeModel: ['DoorSensor-N'],
        model: 'HS1DS/HS3DS',
        vendor: 'HEIMAN',
        description: 'Door sensor',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['DOOR_TPV13'],
        model: 'HEIMAN-M1',
        vendor: 'HEIMAN',
        description: 'Door sensor',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['DoorSensor-EM'],
        model: 'HS1DS-E',
        vendor: 'HEIMAN',
        description: 'Door sensor',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['WaterSensor-N'],
        model: 'HS1WL/HS3WL',
        vendor: 'HEIMAN',
        description: 'Water leakage sensor',
        supports: 'water leak',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['WaterSensor-EM'],
        model: 'HS1-WL-E',
        vendor: 'HEIMAN',
        description: 'Water leakage sensor',
        supports: 'water leak',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['RC_V14', 'RC-EM'],
        model: 'HS1RC-M',
        vendor: 'HEIMAN',
        description: 'Smart remote controller',
        supports: 'action',
        fromZigbee: [
            fz.battery_200,
            fz.heiman_smart_controller_armmode, fz.heiman_smart_controller_emergency,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['COSensor-EM', 'COSensor-N'],
        model: 'HS1CA-E',
        vendor: 'HEIMAN',
        description: 'Smart carbon monoxide sensor',
        supports: 'carbon monoxide',
        fromZigbee: [fz.heiman_carbon_monoxide, fz.battery_200],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await configureReporting.batteryPercentageRemaining(endpoint);
            await configureReporting.batteryAlarmState(endpoint);
        },
    },
    {
        zigbeeModel: ['WarningDevice'],
        model: 'HS2WD-E',
        vendor: 'HEIMAN',
        description: 'Smart siren',
        supports: 'warning',
        fromZigbee: [fz.battery_200],
        toZigbee: [tz.warning],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },

    // Oujiabao
    {
        zigbeeModel: ['OJB-CR701-YZ'],
        model: 'CR701-YZ',
        vendor: 'Oujiabao',
        description: 'Gas and carbon monoxide alarm',
        supports: 'gas and carbon monoxide',
        fromZigbee: [fz.OJBCR701YZ_statuschange],
        toZigbee: [],
    },

    // Calex
    {
        zigbeeModel: ['EC-Z3.0-CCT'],
        model: '421786',
        vendor: 'Calex',
        description: 'LED A60 Zigbee GLS-lamp',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['EC-Z3.0-RGBW'],
        model: '421792',
        vendor: 'Calex',
        description: 'LED A60 Zigbee RGB lamp',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },

    // EcoSmart
    {
        zigbeeModel: ['zhaRGBW'],
        model: 'D1821',
        vendor: 'EcoSmart',
        description: 'A19 RGB bulb',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        // eslint-disable-next-line
        zigbeeModel: ['\u0000\u0002\u0000\u0004\u0000\f^I\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e','\u0000\u0002\u0000\u0004^��&\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e'],
        model: 'D1531',
        vendor: 'EcoSmart',
        description: 'A19 bright white bulb',
        extend: generic.light_onoff_brightness,
    },
    {
        // eslint-disable-next-line
        zigbeeModel: ['\u0000\u0002\u0000\u0004\u0012 �P\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e'],
        model: 'D1532',
        vendor: 'EcoSmart',
        description: 'A19 soft white bulb',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['zhaTunW'],
        model: 'D1542',
        vendor: 'EcoSmart',
        description: 'GU10 adjustable white bulb',
        extend: generic.light_onoff_brightness_colortemp,
    },

    // Airam
    {
        zigbeeModel: ['ZBT-DimmableLight'],
        model: '4713407',
        vendor: 'Airam',
        description: 'LED OP A60 ZB 9W/827 E27',
        extend: generic.light_onoff_brightness,
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await configureReporting.onOff(endpoint);
            const payload = [{
                attribute: 'currentLevel',
                minimumReportInterval: 300,
                maximumReportInterval: repInterval.HOUR,
                reportableChange: 1,
            }];
            await endpoint.configureReporting('genLevelCtrl', payload);
        },
    },
    {
        zigbeeModel: ['ZBT-Remote-EU-DIMV1A2'],
        model: 'AIRAM-CTR.U',
        vendor: 'Airam',
        description: 'CTR.U remote',
        supports: 'on/off, brightness up/down and click/hold/release',
        fromZigbee: [
            fz.genOnOff_cmdOn, fz.genOnOff_cmdOff, fz.CTR_U_brightness_updown_click,
            fz.CTR_U_brightness_updown_hold, fz.CTR_U_brightness_updown_release, fz.CTR_U_scene,
            fz.ignore_basic_report,
        ],
        toZigbee: [],
    },

    // Paul Neuhaus
    {
        zigbeeModel: ['NLG-CCT light '],
        model: '100.424.11',
        vendor: 'Paul Neuhaus',
        description: 'Q-INIGO LED ceiling light',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['Neuhaus NLG-TW light'],
        model: '100.469.65',
        vendor: 'Paul Neuhaus',
        description: 'Q-INIGO, LED panel, Smart-Home RGB',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['NLG-RGBW light '],
        model: '100.110.39',
        vendor: 'Paul Neuhaus',
        description: 'Q-FLAG LED Panel, Smart-Home RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['NLG-plug '],
        model: '100.425.90',
        vendor: 'Paul Neuhaus',
        description: 'Q-PLUG adapter plug with night orientation light',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },

    // iCasa
    {
        zigbeeModel: ['ICZB-IW11D'],
        model: 'ICZB-IW11D',
        vendor: 'iCasa',
        description: 'Zigbee 3.0 Dimmer',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['ICZB-IW11SW'],
        model: 'ICZB-IW11SW',
        vendor: 'iCasa',
        description: 'Zigbee 3.0 Switch',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['ICZB-KPD18S'],
        model: 'ICZB-KPD18S',
        vendor: 'iCasa',
        description: 'Zigbee 3.0 Keypad Pulse 8S',
        supports: 'click',
        fromZigbee: [fz.scenes_recall_click, fz.genOnOff_cmdOn, fz.genOnOff_cmdOff],
        toZigbee: [],
    },
    {
        zigbeeModel: ['ICZB-FC'],
        model: 'ICZB-B1FC60/B3FC64/B2FC95/B2FC125',
        vendor: 'iCasa',
        description: 'Zigbee 3.0 Filament Lamp 60/64/95/125 mm, 806 lumen, dimmable, clear',
        extend: generic.light_onoff_brightness_colortemp,
    },

    // Busch-Jaeger
    {
        zigbeeModel: ['PU01'],
        model: '6717-84',
        vendor: 'Busch-Jaeger',
        description: 'Adaptor plug',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },

    // Müller Licht
    {
        zigbeeModel: ['ZBT-ExtendedColor'],
        model: '404000/404005/404012',
        vendor: 'Müller Licht',
        description: 'Tint LED bulb GU10/E14/E27 350/470/806 lumen, dimmable, color, opal white',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['ZBT-ColorTemperature'],
        model: '404006/404008/404004',
        vendor: 'Müller Licht',
        description: 'Tint LED bulb GU10/E14/E27 350/470/806 lumen, dimmable, opal white',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['ZBT-Remote-ALL-RGBW'],
        model: 'MLI-404011',
        description: 'Tint remote control',
        supports: 'toggle, brightness, other buttons are not supported yet!',
        vendor: 'Müller Licht',
        fromZigbee: [
            fz.tint404011_on, fz.tint404011_off, fz.cmdToggle, fz.tint404011_brightness_updown_click,
            fz.tint404011_move_to_color_temp, fz.tint404011_move_to_color, fz.tint404011_scene,
            fz.tint404011_brightness_updown_release, fz.tint404011_brightness_updown_hold,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['tint Smart Switch'],
        model: '404021',
        description: 'Tint smart switch',
        supports: 'on/off',
        vendor: 'Müller Licht',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },

    // Salus
    {
        zigbeeModel: ['SP600'],
        model: 'SP600',
        vendor: 'Salus',
        description: 'Smart plug',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.SP600_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
            await configureReporting.instantaneousDemand(endpoint);
            await endpoint.read('seMetering', ['multiplier', 'divisor']);
        },
    },

    // AduroSmart
    {
        zigbeeModel: ['ZLL-ExtendedColo'],
        model: '81809',
        vendor: 'AduroSmart',
        description: 'ERIA colors and white shades smart light bulb A19',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
        endpoint: (device) => {
            return {
                'default': 2,
            };
        },
    },
    {
        zigbeeModel: ['Adurolight_NCC'],
        model: '81825',
        vendor: 'AduroSmart',
        description: 'ERIA smart wireless dimming switch',
        supports: 'on, off, up, down',
        fromZigbee: [fz.eria_81825_on, fz.eria_81825_off, fz.eria_81825_updown],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
    },

    // Eurotronic
    {
        zigbeeModel: ['SPZB0001'],
        model: 'SPZB0001',
        vendor: 'Eurotronic',
        description: 'Spirit Zigbee wireless heater thermostat',
        supports: 'temperature, heating system control',
        fromZigbee: [
            fz.thermostat_att_report,
            fz.eurotronic_thermostat,
            fz.battery_percentage_remaining,
        ],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration, tz.eurotronic_thermostat_system_mode,
            tz.eurotronic_system_mode, tz.eurotronic_error_status, tz.thermostat_setpoint_raise_lower,
            tz.thermostat_control_sequence_of_operation, tz.thermostat_remote_sensing,
            tz.eurotronic_current_heating_setpoint, tz.eurotronic_trv_mode, tz.eurotronic_valve_position,
        ],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: 4151};
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'hvacThermostat']);
            await configureReporting.thermostatTemperature(endpoint);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: {ID: 0x4003, type: 41},
                minimumReportInterval: 0,
                maximumReportInterval: repInterval.HOUR,
                reportableChange: 25,
            }], options);
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: {ID: 0x4008, type: 34},
                minimumReportInterval: 0,
                maximumReportInterval: repInterval.HOUR,
                reportableChange: 1,
            }], options);
        },
    },

    // Livolo
    {
        zigbeeModel: ['TI0001          '],
        model: 'TI0001',
        description:
            'Zigbee switch (1 and 2 gang) ' +
            '[work in progress](https://github.com/Koenkk/zigbee2mqtt/issues/592)',
        vendor: 'Livolo',
        supports: 'on/off',
        fromZigbee: [fz.livolo_switch_state, fz.livolo_switch_state_raw],
        toZigbee: [tz.livolo_switch_on_off],
        endpoint: (device) => {
            return {'left': 6, 'right': 6};
        },
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(6);
            await endpoint.command('genOnOff', 'toggle', {}, {});
        },
        onEvent: async (type, data, device) => {
            if (['start', 'deviceAnnounce'].includes(type)) {
                const endpoint = device.getEndpoint(6);
                await endpoint.command('genOnOff', 'toggle', {}, {});
            }
        },
    },

    // Bosch
    {
        zigbeeModel: [
            'RFDL-ZB', 'RFDL-ZB-EU', 'RFDL-ZB-H', 'RFDL-ZB-K', 'RFDL-ZB-CHI', 'RFDL-ZB-MS', 'RFDL-ZB-ES', 'RFPR-ZB',
            'RFPR-ZB-EU', 'RFPR-ZB-CHI', 'RFPR-ZB-ES', 'RFPR-ZB-MS',
        ],
        model: 'RADON TriTech ZB',
        vendor: 'Bosch',
        description: 'Wireless motion detector',
        supports: 'occupancy and temperature',
        fromZigbee: [fz.temperature, fz.battery_3V, fz.iaszone_occupancy_1],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['ISW-ZPR1-WP13'],
        model: 'ISW-ZPR1-WP13',
        vendor: 'Bosch',
        description: 'Motion sensor',
        supports: 'occupancy and temperature',
        fromZigbee: [
            fz.temperature,
            fz.battery_3V, fz.iaszone_occupancy_1,
            fz.ignore_iaszone_report,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(5);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryVoltage(endpoint);
        },
    },

    // Immax
    {
        zigbeeModel: ['IM-Z3.0-DIM'],
        model: 'IM-Z3.0-DIM',
        vendor: 'Immax',
        description: 'LED E14/230V C35 5W TB 440LM ZIGBEE DIM',
        extend: generic.light_onoff_brightness,
    },

    // Yale
    {
        zigbeeModel: ['YRD446 BLE TSDB'],
        model: 'YRD426NRSC',
        vendor: 'Yale',
        description: 'Assure lock',
        supports: 'lock/unlock, battery',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery_200],
        toZigbee: [tz.generic_lock],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await configureReporting.lockState(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['YRD226 TSDB'],
        model: 'YRD226HA2619',
        vendor: 'Yale',
        description: 'Assure lock',
        supports: 'lock/unlock, battery',
        fromZigbee: [fz.lock, fz.battery_200],
        toZigbee: [tz.generic_lock],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await configureReporting.lockState(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['YRD256 TSDB'],
        model: 'YRD256HA20BP',
        vendor: 'Yale',
        description: 'Assure lock SL',
        supports: 'lock/unlock, battery',
        fromZigbee: [
            fz.lock,
            fz.lock_operation_event,
            fz.battery_200,

        ],
        toZigbee: [tz.generic_lock],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await configureReporting.lockState(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['iZBModule01'],
        model: 'YMF40',
        vendor: 'Yale',
        description: 'Real living lock',
        supports: 'lock/unlock, battery',
        fromZigbee: [fz.lock_operation_event, fz.battery_200],
        toZigbee: [tz.generic_lock],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await configureReporting.lockState(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['YRD210 PB DB'],
        model: 'YRD210-HA-605',
        vendor: 'Yale',
        description: 'Real living keyless push button deadbolt lock',
        supports: 'lock/unlock, battery',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery_200],
        toZigbee: [tz.generic_lock],
        meta: {options: {disableDefaultResponse: true}, configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await configureReporting.lockState(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['YRD226/246 TSDB'],
        model: 'YRD226/246 TSDB',
        vendor: 'Yale',
        description: 'Assure lock',
        supports: 'lock/unlock, battery',
        fromZigbee: [fz.lock, fz.battery_percentage_remaining, fz.lock_operation_event],
        toZigbee: [tz.generic_lock],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await configureReporting.lockState(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },

    // Keen Home
    {
        zigbeeModel: [
            'SV01-410-MP-1.0', 'SV01-410-MP-1.1', 'SV01-410-MP-1.4', 'SV01-410-MP-1.5', 'SV01-412-MP-1.0',
            'SV01-610-MP-1.0', 'SV01-612-MP-1.0',
        ],
        model: 'SV01',
        vendor: 'Keen Home',
        description: 'Smart vent',
        supports: 'open, close, position, temperature, pressure, battery',
        fromZigbee: [
            fz.cover_position_via_brightness, fz.temperature,
            fz.generic_battery, fz.keen_home_smart_vent_pressure,
            fz.ignore_onoff_report,
        ],
        toZigbee: [
            tz.cover_open_close_via_brightness,
            tz.cover_position_via_brightness,
        ],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genLevelCtrl', 'genPowerCfg', 'msTemperatureMeasurement', 'msPressureMeasurement'];
            await bind(endpoint, coordinatorEndpoint, binds);
            await configureReporting.temperature(endpoint);
            await configureReporting.pressure(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['SV02-410-MP-1.3', 'SV02-610-MP-1.3'],
        model: 'SV02',
        vendor: 'Keen Home',
        description: 'Smart vent',
        supports: 'open, close, position, temperature, pressure, battery',
        fromZigbee: [
            fz.cover_position_via_brightness, fz.temperature,
            fz.generic_battery, fz.keen_home_smart_vent_pressure,
            fz.ignore_onoff_report,
        ],
        toZigbee: [
            tz.cover_open_close_via_brightness,
            tz.cover_position_via_brightness,
        ],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genLevelCtrl', 'genPowerCfg', 'msTemperatureMeasurement', 'msPressureMeasurement'];
            await bind(endpoint, coordinatorEndpoint, binds);
            await configureReporting.temperature(endpoint);
            await configureReporting.pressure(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },

    // AXIS
    {
        zigbeeModel: ['Gear'],
        model: 'GR-ZB01-W',
        vendor: 'AXIS',
        description: 'Gear window shade motor',
        supports: 'open, close, position, battery',
        fromZigbee: [fz.cover_position_via_brightness, fz.generic_battery],
        toZigbee: [tz.cover_open_close_via_brightness, tz.cover_position_via_brightness],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genLevelCtrl', 'genPowerCfg']);
            await configureReporting.brightness(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },

    // ELKO
    {
        zigbeeModel: ['ElkoDimmerZHA'],
        model: '316GLEDRF',
        vendor: 'ELKO',
        description: 'ZigBee in-wall smart dimmer',
        supports: 'on/off, brightness',
        fromZigbee: [fz.brightness, fz.on_off],
        toZigbee: [tz.light_onoff_brightness, tz.ignore_transition],
        meta: {options: {disableDefaultResponse: true}, configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },

    // LivingWise
    {
        zigbeeModel: ['abb71ca5fe1846f185cfbda554046cce'],
        model: 'LVS-ZB500D',
        vendor: 'LivingWise',
        description: 'ZigBee smart dimmer switch',
        supports: 'on/off, brightness',
        toZigbee: [tz.light_onoff_brightness],
        fromZigbee: [
            fz.on_off, fz.brightness, fz.ignore_light_brightness_report,
            fz.ignore_genIdentify,
        ],
    },
    {
        zigbeeModel: ['545df2981b704114945f6df1c780515a'],
        model: 'LVS-ZB15S',
        vendor: 'LivingWise',
        description: 'ZigBee smart in-wall switch',
        supports: 'on/off',
        toZigbee: [tz.on_off],
        fromZigbee: [fz.on_off, fz.ignore_basic_report],
    },
    {
        zigbeeModel: ['e70f96b3773a4c9283c6862dbafb6a99'],
        model: 'LVS-SM10ZW',
        vendor: 'LivingWise',
        description: 'Door or window contact switch',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['895a2d80097f4ae2b2d40500d5e03dcc'],
        model: 'LVS-SN10ZW_SN11',
        vendor: 'LivingWise',
        description: 'Occupancy sensor',
        supports: 'occupancy',
        fromZigbee: [fz.battery_200, fz.iaszone_occupancy_1_with_timeout],
        toZigbee: [],
    },
    {
        zigbeeModel: ['55e0fa5cdb144ba3a91aefb87c068cff'],
        model: 'LVS-ZB15R',
        vendor: 'LivingWise',
        description: 'Zigbee smart outlet',
        supports: 'on/off',
        fromZigbee: [fz.on_off, fz.ignore_basic_report],
        toZigbee: [tz.on_off],
    },

    // Stelpro
    {
        zigbeeModel: ['ST218'],
        model: 'ST218',
        vendor: 'Stelpro',
        description: 'Built-in electronic thermostat',
        supports: 'temperature ',
        fromZigbee: [fz.thermostat_att_report],
        toZigbee: [
            tz.thermostat_local_temperature, tz.thermostat_occupied_heating_setpoint,
        ],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(25);
            const binds = [
                'genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg',
                'msTemperatureMeasurement',
            ];
            await bind(endpoint, coordinatorEndpoint, binds);
            await configureReporting.thermostatTemperature(endpoint);
        },
    },

    // Nyce
    {
        zigbeeModel: ['3011'],
        model: 'NCZ-3011-HA',
        vendor: 'Nyce',
        description: 'Door/window sensor',
        supports: 'motion, humidity and temperature',
        fromZigbee: [
            fz.ignore_basic_report,
            fz.ignore_genIdentify, fz.ignore_poll_ctrl,
            fz.generic_battery, fz.ignore_iaszone_report,
            fz.iaszone_occupancy_2, fz.ias_contact_alarm_1,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['3043'],
        model: 'NCZ-3043-HA',
        vendor: 'Nyce',
        description: 'Ceiling motion sensor',
        supports: 'motion, humidity and temperature',
        fromZigbee: [
            fz.occupancy, fz.humidity, fz.temperature, fz.ignore_basic_report,
            fz.ignore_genIdentify, fz.ignore_poll_ctrl,
            fz.generic_battery, fz.ignore_iaszone_report,
            fz.iaszone_occupancy_2,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['3041'],
        model: 'NCZ-3041-HA',
        vendor: 'Nyce',
        description: 'Wall motion sensor',
        supports: 'motion, humidity and temperature',
        fromZigbee: [
            fz.occupancy, fz.humidity, fz.temperature, fz.ignore_basic_report,
            fz.ignore_genIdentify, fz.ignore_poll_ctrl,
            fz.generic_battery, fz.ignore_iaszone_report,
            fz.iaszone_occupancy_2,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['3045'],
        model: 'NCZ-3045-HA',
        vendor: 'Nyce',
        description: 'Curtain motion sensor',
        supports: 'motion, humidity and temperature',
        fromZigbee: [
            fz.occupancy, fz.humidity, fz.temperature, fz.ignore_basic_report,
            fz.ignore_genIdentify, fz.ignore_poll_ctrl,
            fz.generic_battery, fz.ignore_iaszone_report,
            fz.iaszone_occupancy_2,
        ],
        toZigbee: [],
    },

    // Securifi
    {
        zigbeeModel: ['PP-WHT-US'],
        model: 'PP-WHT-US',
        vendor: 'Securifi',
        description: 'Peanut Smart Plug',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.peanut_electrical],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await configureReporting.onOff(endpoint);
            await configureReporting.rmsVoltage(endpoint);
            await configureReporting.rmsCurrent(endpoint);
            await configureReporting.activePower(endpoint);
            await configureReporting.acVoltageMultiplier(endpoint);
            await configureReporting.acVoltageDivisor(endpoint);
            await configureReporting.acCurrentMultiplier(endpoint);
            await configureReporting.acCurrentDivisor(endpoint);
            await configureReporting.acPowerMultiplier(endpoint);
            await configureReporting.acPowerDivisor(endpoint);
        },
    },

    // Visonic
    {
        zigbeeModel: ['MCT-350 SMA'],
        model: 'MCT-350 SMA',
        vendor: 'Visonic',
        description: 'Magnetic door & window contact sensor',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['MCT-340 E'],
        model: 'MCT-340 E',
        vendor: 'Visonic',
        description: 'Magnetic door & window contact sensor',
        supports: 'contact, temperature',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery_cr2032],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['MCT-340 SMA'],
        model: 'MCT-340 SMA',
        vendor: 'Visonic',
        description: 'Magnetic door & window contact sensor',
        supports: 'contact, temperature',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery_cr2032],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },

    // Sunricher
    {
        zigbeeModel: ['ZG9101SAC-HP'],
        model: 'ZG9101SAC-HP',
        vendor: 'Sunricher',
        description: 'ZigBee AC phase-cut dimmer',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['ON/OFF'],
        model: 'ZG9101SAC-HP-Switch',
        vendor: 'Sunricher',
        description: 'ZigBee AC in-wall switch',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['ZG2833K4_EU06'],
        model: 'SR-ZG9001K4-DIM2',
        vendor: 'Sunricher',
        description: 'ZigBee double key wall switch',
        supports: 'on/off, brightness',
        fromZigbee: [
            fz.genOnOff_cmdOn, fz.genOnOff_cmdOff, fz.cmd_move_with_onoff, fz.cmd_stop_with_onoff, fz.generic_battery,
        ],
        toZigbee: [],
    },

    // Shenzhen Homa
    {
        zigbeeModel: ['HOMA1008'],
        model: 'HLD812-Z-SC',
        vendor: 'Shenzhen Homa',
        description: 'Smart LED driver',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['HOMA1002'],
        model: 'HLC610-Z',
        vendor: 'Shenzhen Homa',
        description: 'Wireless dimmable controller',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['HOMA1031'],
        model: 'HLC821-Z-SC',
        vendor: 'Shenzhen Homa',
        description: 'ZigBee AC phase-cut dimmer',
        extend: generic.light_onoff_brightness,
    },

    // Honyar
    {
        zigbeeModel: ['00500c35'],
        model: 'U86K31ND6',
        vendor: 'Honyar',
        description: '3 gang switch ',
        supports: 'on/off',
        fromZigbee: [],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            const endpoint3 = device.getEndpoint(3);
            await bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint1);
            await bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint2);
            await bind(endpoint3, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint3);
        },
    },

    // Danalock
    {
        zigbeeModel: ['V3-BTZB'],
        model: 'V3-BTZB',
        vendor: 'Danalock',
        description: 'BT/ZB smartlock',
        supports: 'lock/unlock, battery',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery_200],
        toZigbee: [tz.generic_lock],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await configureReporting.lockState(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },

    // NET2GRID
    {
        zigbeeModel: ['SP31           '],
        model: 'N2G-SP',
        vendor: 'NET2GRID',
        description: 'White Net2Grid power outlet switch with power meter',
        supports: 'on/off, power and energy measurement',
        fromZigbee: [fz.genOnOff_cmdOn, fz.genOnOff_cmdOff, fz.on_off, fz.generic_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint1);

            const endpoint10 = device.getEndpoint(10);
            await configureReporting.instantaneousDemand(endpoint10);
            await configureReporting.currentSummDelivered(endpoint10);
            await configureReporting.currentSummReceived(endpoint10);
            await endpoint10.read('seMetering', ['unitOfMeasure', 'multiplier', 'divisor']);
        },
    },

    // Third Reality
    {
        zigbeeModel: ['3RSS008Z'],
        model: '3RSS008Z',
        vendor: 'Third Reality',
        description: 'RealitySwitch Plus',
        supports: 'on/off, battery',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off, tz.ignore_transition],
    },

    // Hampton Bay
    {
        zigbeeModel: ['HDC52EastwindFan', 'HBUniversalCFRemote'],
        model: '99432',
        vendor: 'Hampton Bay',
        description: 'Universal wink enabled white ceiling fan premier remote control',
        supports: 'on/off, brightness, fan_mode and fan_state',
        fromZigbee: generic.light_onoff_brightness.fromZigbee.concat([
            fz.generic_fan_mode,
        ]),
        toZigbee: generic.light_onoff_brightness.toZigbee.concat([tz.fan_mode]),
        meta: {options: {disableDefaultResponse: true}, configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'hvacFanCtrl']);
            await configureReporting.onOff(endpoint);
            await configureReporting.brightness(endpoint);
            await configureReporting.fanMode(endpoint);
        },
    },
    {
        zigbeeModel: ['ETI 12-in Puff light'],
        model: '54668161',
        vendor: 'Hampton Bay',
        description: '12 in. LED smart puff',
        extend: generic.light_onoff_brightness_colortemp,
    },

    // Iluminize
    {
        zigbeeModel: ['DIM Lighting'],
        model: '511.10',
        vendor: 'Iluminize',
        description: 'Zigbee LED-Controller ',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['511.201'],
        model: '511.201',
        vendor: 'Iluminize',
        description: 'HV LED dimmer',
        extend: generic.light_onoff_brightness,
    },

    // Anchor
    {
        zigbeeModel: ['FB56-SKT17AC1.4'],
        model: '67200BL',
        description: 'Vetaar smart plug',
        supports: 'on/off',
        vendor: 'Anchor',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },

    // Gira
    {
        zigbeeModel: [' Remote'],
        model: '2430-100',
        vendor: 'Gira',
        description: 'ZigBee Light Link wall transmitter',
        supports: 'action',
        fromZigbee: [
            fz.GIRA2430_scene_click, fz.GIRA2430_on_click, fz.GIRA2430_off_click, fz.GIRA2430_down_hold,
            fz.GIRA2430_up_hold, fz.GIRA2430_stop,
        ],
        toZigbee: [],
    },

    // RGB genie
    {
        zigbeeModel: ['ZGRC-KEY-013'],
        model: 'ZGRC-KEY-013',
        vendor: 'RGB Genie',
        description: '3 Zone remote and dimmer',
        supports: 'click',
        fromZigbee: [
            fz.generic_battery, fz.ZGRC013_brightness_onoff, fz.ZGRC013_brightness, fz.ZGRC013_brightness_stop,
            fz.ZGRC013_cmdOn, fz.ZGRC013_cmdOff, fz.ZGRC013_scene,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },

    // Sercomm
    {
        zigbeeModel: ['SZ-ESW01'],
        model: 'SZ-ESW01',
        vendor: 'Sercomm',
        description: 'Telstra smart plug',
        supports: 'on/off, power consumption',
        fromZigbee: [fz.on_off, fz.SZ_ESW01_AU_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
            await configureReporting.instantaneousDemand(endpoint);
        },
    },
    {
        zigbeeModel: ['SZ-ESW01-AU'],
        model: 'SZ-ESW01-AU',
        vendor: 'Sercomm',
        description: 'Telstra smart plug',
        supports: 'on/off, power consumption',
        fromZigbee: [fz.on_off, fz.SZ_ESW01_AU_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
            await configureReporting.instantaneousDemand(endpoint);
        },
    },
    {
        zigbeeModel: ['XHS2-SE'],
        model: 'XHS2-SE',
        vendor: 'Sercomm',
        description: 'Magnetic door & window contact sensor',
        supports: 'contact, temperature',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery_3V_2100],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['SZ-DWS04'],
        model: 'SZ-DWS04',
        vendor: 'Sercomm',
        description: 'Magnetic door & window contact sensor',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery_3V_2100],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },

    // Leedarson
    {
        zigbeeModel: ['LED_GU10_OWDT'],
        model: 'ZM350STW1TCF',
        vendor: 'Leedarson',
        description: 'LED PAR16 50 GU10 tunable white',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['M350ST-W1R-01'],
        model: 'M350STW1',
        vendor: 'Leedarson',
        description: 'LED PAR16 50 GU10',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['ZHA-DimmableLight'],
        model: 'A806S-Q1R',
        vendor: 'Leedarson',
        description: 'LED E27 tunable white',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['LED_E27_OWDT'],
        model: 'ZA806SQ1TCF',
        vendor: 'Leedarson',
        description: 'LED E27 tunable white',
        extend: generic.light_onoff_brightness_colortemp,
    },

    // GMY
    {
        zigbeeModel: ['CCT box'],
        model: 'B07KG5KF5R',
        vendor: 'GMY Smart Bulb',
        description: 'GMY Smart bulb, 470lm, vintage dimmable, 2700-6500k, E27',
        extend: generic.light_onoff_brightness_colortemp,
    },

    // Meazon
    {
        zigbeeModel: [
            '101.301.001649', '101.301.001838', '101.301.001802', '101.301.001738',
            '101.301.001412', '101.301.001765', '101.301.001814',
        ],
        model: 'MEAZON_BIZY_PLUG',
        vendor: 'Meazon',
        description: 'Bizy plug meter',
        supports: 'on/off, power, energy measurement and temperature',
        fromZigbee: [
            fz.genOnOff_cmdOn, fz.genOnOff_cmdOff, fz.on_off,
            fz.meazon_meter,
        ],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(10);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await configureReporting.onOff(endpoint);
            const options = {manufacturerCode: 4406, disableDefaultResponse: false};
            await endpoint.write('seMetering', {0x1005: {value: 0x063e, type: 25}}, options);
            await configureReporting.onOff(endpoint);
            await endpoint.configureReporting('seMetering', [{
                attribute: {ID: 0x2000, type: 0x29},
                minimumReportInterval: 1,
                maximumReportInterval: repInterval.MINUTES_5,
                reportableChange: 1,
            }], options);
        },
    },
    {
        zigbeeModel: ['102.106.000235', '102.106.001111', '102.106.000348', '102.106.000256', '102.106.001242'],
        model: 'MEAZON_DINRAIL',
        vendor: 'Meazon',
        description: 'DinRail 1-phase meter',
        supports: 'on/off, power, energy measurement and temperature',
        fromZigbee: [
            fz.genOnOff_cmdOn, fz.genOnOff_cmdOff, fz.on_off,
            fz.meazon_meter,
        ],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(10);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await configureReporting.onOff(endpoint);
            const options = {manufacturerCode: 4406, disableDefaultResponse: false};
            await endpoint.write('seMetering', {0x1005: {value: 0x063e, type: 25}}, options);
            await configureReporting.onOff(endpoint);
            await endpoint.configureReporting('seMetering', [{
                attribute: {ID: 0x2000, type: 0x29},
                minimumReportInterval: 1,
                maximumReportInterval: repInterval.MINUTES_5,
                reportableChange: 1,
            }], options);
        },
    },

    // Konke
    {
        zigbeeModel: ['3AFE170100510001'],
        model: '2AJZ4KPKEY',
        vendor: 'Konke',
        description: 'Multi-function button',
        supports: 'single, double and long click',
        fromZigbee: [
            fz.konke_click,
            fz.battery_3V,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['3AFE14010402000D', '3AFE27010402000D', '3AFE28010402000D'],
        model: '2AJZ4KPBS',
        vendor: 'Konke',
        description: 'Motion sensor',
        supports: 'occupancy',
        fromZigbee: [fz.iaszone_occupancy_1_with_timeout, fz.battery_3V],
        toZigbee: [],
    },
    {
        zigbeeModel: ['3AFE140103020000', '3AFE220103020000'],
        model: '2AJZ4KPFT',
        vendor: 'Konke',
        description: 'Temperature and humidity sensor',
        supports: 'temperature and humidity',
        fromZigbee: [
            fz.temperature,
            fz.humidity,
            fz.battery_3V,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'msTemperatureMeasurement']);
            await configureReporting.batteryVoltage(endpoint);
            await configureReporting.temperature(endpoint);
        },
    },
    {
        zigbeeModel: ['3AFE130104020015', '3AFE270104020015'],
        model: '2AJZ4KPDR',
        vendor: 'Konke',
        description: 'Contact sensor',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery_3V],
        toZigbee: [],
    },
    {
        zigbeeModel: ['LH07321'],
        model: 'LH07321',
        vendor: 'Konke',
        description: 'Water detector',
        supports: 'water_leak',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
    },

    // TUYATEC
    {
        zigbeeModel: ['RH3040'],
        model: 'RH3040',
        vendor: 'TUYATEC',
        description: 'PIR sensor',
        supports: 'occupancy',
        fromZigbee: [
            fz.battery_percentage_remaining, fz.generic_battery_voltage,
            fz.ignore_basic_report,
            fz.iaszone_occupancy_1,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genBasic', 'genIdentify', 'genPowerCfg']);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['RH3052'],
        model: 'TT001ZAV20',
        vendor: 'TUYATEC',
        description: 'Temperature & humidity sensor',
        supports: 'temperature and humidity',
        fromZigbee: [
            fz.humidity, fz.temperature, fz.battery_200,
        ],
        toZigbee: [],
    },

    // Zemismart
    {
        zigbeeModel: ['TS0002'],
        model: 'ZM-CSW002-D',
        vendor: 'Zemismart',
        description: '2 gang switch',
        supports: 'on/off',
        fromZigbee: [fz.generic_state_multi_ep, fz.generic_power],
        toZigbee: [tz.on_off, tz.ignore_transition],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
            await endpoint.read('seMetering', ['multiplier', 'divisor']);
        },
    },
    {
        zigbeeModel: ['NUET56-DL27LX1.1'],
        model: 'LXZB-12A',
        vendor: 'Zemismart',
        description: 'RGB LED downlight',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['TS0302'],
        model: 'ZM-CSW032-D',
        vendor: 'Zemismart',
        description: 'Curtain/roller blind switch',
        supports: 'open, close, stop',
        fromZigbee: [fz.ignore_basic_report, fz.cover_position_tilt],
        toZigbee: [tz.cover_state],
    },

    // Sinope
    {
        zigbeeModel: ['TH1123ZB'],
        model: 'TH1123ZB',
        vendor: 'Sinope',
        description: 'Zigbee line volt thermostat',
        supports: 'local temp, units, keypad lockout, mode, state, backlight, outdoor temp, time',
        fromZigbee: [
            fz.thermostat_att_report,
        ],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.sinope_thermostat_occupancy, tz.sinope_thermostat_backlight_autodim_param, tz.sinope_thermostat_time,
            tz.sinope_thermostat_enable_outdoor_temperature, tz.sinope_thermostat_outdoor_temperature,
        ],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg',
                'msTemperatureMeasurement',
            ];
            await bind(endpoint, coordinatorEndpoint, binds);
            await configureReporting.thermostatTemperature(endpoint);
            await configureReporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await configureReporting.thermostatPIHeatingDemand(endpoint);
        },
    },
    {
        zigbeeModel: ['TH1124ZB'],
        model: 'TH1124ZB',
        vendor: 'Sinope',
        description: 'Zigbee line volt thermostat',
        supports: 'local temp, units, keypad lockout, mode, state, backlight, outdoor temp, time',
        fromZigbee: [
            fz.thermostat_att_report,
        ],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.sinope_thermostat_occupancy, tz.sinope_thermostat_backlight_autodim_param, tz.sinope_thermostat_time,
            tz.sinope_thermostat_enable_outdoor_temperature, tz.sinope_thermostat_outdoor_temperature,
        ],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genIdentify', 'genGroups', 'hvacThermostat', 'hvacUserInterfaceCfg',
                'msTemperatureMeasurement',
            ];
            await bind(endpoint, coordinatorEndpoint, binds);
            await configureReporting.thermostatTemperature(endpoint);
            await configureReporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await configureReporting.thermostatPIHeatingDemand(endpoint);
        },
    },

    // Lutron
    {
        zigbeeModel: ['LZL4BWHL01 Remote'],
        model: 'LZL4BWHL01',
        vendor: 'Lutron',
        description: 'Connected bulb remote control',
        supports: 'on/off, brightness',
        fromZigbee: [fz.GIRA2430_down_hold, fz.GIRA2430_up_hold, fz.LZL4B_onoff, fz.GIRA2430_stop],
        toZigbee: [],
    },

    // Zen
    {
        zigbeeModel: ['Zen-01'],
        model: 'Zen-01-W',
        vendor: 'Zen',
        description: 'Thermostat',
        supports: 'temperature, heating/cooling system control',
        fromZigbee: [
            fz.generic_battery_voltage,
            fz.thermostat_att_report,
        ],
        toZigbee: [
            tz.factory_reset, tz.thermostat_local_temperature, tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_unoccupied_heating_setpoint, tz.thermostat_setpoint_raise_lower,
            tz.thermostat_remote_sensing, tz.thermostat_control_sequence_of_operation, tz.thermostat_system_mode,
            tz.thermostat_weekly_schedule, tz.thermostat_clear_weekly_schedule, tz.thermostat_weekly_schedule_rsp,
            tz.thermostat_relay_status_log, tz.thermostat_relay_status_log_rsp,
        ],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3);
            const binds = [
                'genBasic', 'genIdentify', 'genPowerCfg', 'genTime', 'hvacThermostat', 'hvacUserInterfaceCfg',
            ];
            await bind(endpoint, coordinatorEndpoint, binds);
            await configureReporting.thermostatTemperature(endpoint);
        },
    },

    // Hej
    {
        zigbeeModel: ['HejSW01'],
        model: 'GLSK3ZB-1711',
        vendor: 'Hej',
        description: 'Goqual 1 gang Switch',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['HejSW02'],
        model: 'GLSK3ZB-1712',
        vendor: 'Hej',
        description: 'Goqual 2 gang Switch',
        supports: 'on/off',
        fromZigbee: [fz.generic_state_multi_ep],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'top': 1, 'bottom': 2};
        },
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['HejSW03'],
        model: 'GLSK3ZB-1713',
        vendor: 'Hej',
        description: 'Goqual 3 gang Switch',
        supports: 'on/off',
        fromZigbee: [fz.generic_state_multi_ep],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'top': 1, 'center': 2, 'bottom': 3};
        },
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['HejSW04'],
        model: 'GLSK6ZB-1714',
        vendor: 'Hej',
        description: 'Goqual 4 gang Switch',
        supports: 'on/off',
        fromZigbee: [fz.generic_state_multi_ep],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'top_left': 1, 'bottom_left': 2, 'top_right': 3, 'bottom_right': 4};
        },
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['HejSW05'],
        model: 'GLSK6ZB-1715',
        vendor: 'Hej',
        description: 'Goqual 5 gang Switch',
        supports: 'on/off',
        fromZigbee: [fz.generic_state_multi_ep],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'top_left': 1, 'center_left': 2, 'bottom_left': 3, 'top_right': 4, 'bottom_right': 5};
        },
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(5), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['HejSW06'],
        model: 'GLSK6ZB-1716',
        vendor: 'Hej',
        description: 'Goqual 6 gang Switch',
        supports: 'on/off',
        fromZigbee: [fz.generic_state_multi_ep],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {
                'top_left': 1, 'center_left': 2, 'bottom_left': 3,
                'top_right': 4, 'center_right': 5, 'bottom_right': 6,
            };
        },
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(5), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(6), coordinatorEndpoint, ['genOnOff']);
        },
    },

    // Dawon DNS
    {
        zigbeeModel: ['PM-C140-ZB'],
        model: 'PM-C140-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT remote control smart buried-type outlet',
        supports: 'on/off, power and energy measurement',
        fromZigbee: [fz.on_off, fz.generic_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.instantaneousDemand(endpoint);
            await endpoint.read('seMetering', ['multiplier', 'divisor']);
        },
    },

    // CREE
    {
        zigbeeModel: ['Connected A-19 60W Equivalent ', 'Connected A-19 60W Equivalent   '],
        model: 'B00TN589ZG',
        vendor: 'CREE',
        description: 'Connected bulb',
        extend: generic.light_onoff_brightness,
    },

    // Ubisys
    {
        zigbeeModel: ['S1 (5501)', 'S1-R (5601)'],
        model: 'S1',
        vendor: 'Ubisys',
        description: 'Power switch S1',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.generic_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3);
            await configureReporting.instantaneousDemand(endpoint);
            await endpoint.read('seMetering', ['multiplier', 'divisor']);
        },
    },
    {
        zigbeeModel: ['S2 (5502)', 'S2-R (5602)'],
        model: 'S2',
        vendor: 'Ubisys',
        description: 'Power switch S2',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.generic_power],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(5);
            await configureReporting.instantaneousDemand(endpoint);
            await endpoint.read('seMetering', ['multiplier', 'divisor']);
        },
    },
    {
        zigbeeModel: ['D1 (5503)', 'D1-R (5603)'],
        model: 'D1',
        vendor: 'Ubisys',
        description: 'Universal dimmer D1',
        supports: 'on/off, brightness, power measurement',
        fromZigbee: [fz.on_off, fz.brightness, fz.generic_power],
        toZigbee: [tz.light_onoff_brightness],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(4);
            await configureReporting.instantaneousDemand(endpoint);
            await endpoint.read('seMetering', ['multiplier', 'divisor']);
        },
    },
    {
        zigbeeModel: ['J1 (5502)', 'J1-R (5602)'],
        model: 'J1',
        vendor: 'Ubisys',
        description: 'Shutter control J1',
        supports: 'open, close, stop, position, tilt',
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.ubisys_configure_j1],
    },

    // Lutron
    {
        zigbeeModel: ['Z3-1BRL'],
        model: 'Z3-1BRL',
        vendor: 'Lutron',
        description: 'Aurora smart bulb dimmer',
        supports: 'brightness',
        fromZigbee: [fz.dimmer_passthru_brightness],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genLevelCtrl']);
        },
    },

    // Piri
    {
        zigbeeModel: ['GASSensor-EM'],
        model: 'HSIO18008',
        vendor: 'Piri',
        description: 'Combustible gas sensor',
        supports: 'gas',
        fromZigbee: [fz.ias_gas_alarm_1],
        toZigbee: [],
    },

    // PEQ
    {
        zigbeeModel: ['3300'],
        model: '3300-P',
        vendor: 'PEQ',
        description: 'Door & window contact sensor',
        supports: 'contact, temperature',
        fromZigbee: [fz.temperature, fz.ias_contact_alarm_1, fz.battery_3V],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryVoltage(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },

    // Lonsonho
    {
        zigbeeModel: ['Plug_01'],
        model: '4000116784070',
        vendor: 'Lonsonho',
        description: 'Smart plug EU',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            await configureReporting.onOff(endpoint);
        },
    },

    // iHORN
    {
        zigbeeModel: ['113D'],
        model: 'LH-32ZB',
        vendor: 'iHORN',
        description: 'Temperature & humidity sensor',
        supports: 'temperature and humidity',
        fromZigbee: [fz.humidity, fz.temperature, fz.battery_200],
        toZigbee: [],
    },
    {
        zigbeeModel: ['113C'],
        model: 'LH-992ZB',
        vendor: 'iHORN',
        description: 'Motion sensor',
        supports: 'occupancy',
        fromZigbee: [fz.iaszone_occupancy_1],
        toZigbee: [],
    },

    // TERNCY
    {
        zigbeeModel: ['TERNCY-PP01'],
        model: 'TERNCY-PP01',
        vendor: 'TERNCY',
        description: 'Awareness switch',
        supports: 'temperature, occupancy, illuminance, click, double click, triple click',
        fromZigbee: [
            fz.terncy_temperature, fz.occupancy_with_timeout,
            fz.generic_illuminance, fz.terncy_raw, fz.generic_battery,
        ],
        toZigbee: [],
    },

    // ORVIBO
    {
        zigbeeModel: ['3c4e4fc81ed442efaf69353effcdfc5f'],
        model: 'CR11S8UZ',
        vendor: 'ORVIBO',
        description: 'Smart sticker switch',
        supports: 'click, hold, release',
        fromZigbee: [fz.orvibo_raw],
        toZigbee: [],
    },

    // SONOFF
    {
        zigbeeModel: ['BASICZBR3'],
        model: 'BASICZBR3',
        vendor: 'SONOFF',
        description: 'Zigbee smart switch',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['S31 Lite zb'],
        model: 'S31ZB',
        vendor: 'SONOFF',
        description: 'Zigbee smart plug (US version)',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },

    // eWeLink: the IoT solution provider behinds lots of smart device brands
    {
        zigbeeModel: ['SA-003-Zigbee'],
        model: 'SA-003-Zigbee',
        vendor: 'eWeLink',
        description: 'Zigbee smart plug',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },

    // CR Smart Home
    {
        zigbeeModel: ['TS0001'],
        model: 'TS0001',
        vendor: 'CR Smart Home',
        description: 'Valve control',
        supports: 'control',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['TS0202'],
        model: 'TS0202',
        vendor: 'CR Smart Home',
        description: 'Motion sensor',
        supports: 'occupancy',
        fromZigbee: [fz.iaszone_occupancy_1, fz.battery_percentage_remaining, fz.ignore_basic_report],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0203'],
        model: 'TS0203',
        vendor: 'CR Smart Home',
        description: 'Door sensor',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery_percentage_remaining, fz.ignore_basic_report],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0204'],
        model: 'TS0204',
        vendor: 'CR Smart Home',
        description: 'Gas sensor',
        supports: 'gas',
        fromZigbee: [fz.ias_gas_alarm_1, fz.battery_percentage_remaining, fz.ignore_basic_report],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0205'],
        model: 'TS0205',
        vendor: 'CR Smart Home',
        description: 'Smoke sensor',
        supports: 'smoke',
        fromZigbee: [fz.ias_smoke_alarm_1, fz.battery_percentage_remaining, fz.ignore_basic_report],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0111'],
        model: 'TS0111',
        vendor: 'CR Smart Home',
        description: 'Socket',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['TS0207'],
        model: 'TS0207',
        vendor: 'CR Smart Home',
        description: 'Water leak detector',
        supports: 'water leak',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery_percentage_remaining],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0218'],
        model: 'TS0218',
        vendor: 'CR Smart Home',
        description: 'Button',
        supports: 'click',
        fromZigbee: [fz.TS0218_click, fz.battery_percentage_remaining],
        toZigbee: [],
    },

    // EcoDim
    {
        zigbeeModel: ['Dimmer-Switch-ZB3.0'],
        model: 'Eco-Dim.07',
        vendor: 'EcoDim',
        description: 'Zigbee & Z-wave dimmer ',
        extend: generic.light_onoff_brightness,
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await configureReporting.onOff(endpoint);
            await configureReporting.brightness(endpoint);
        },
    },
];

module.exports = devices.map((device) =>
    device.extend ? Object.assign({}, device.extend, device) : device
);
