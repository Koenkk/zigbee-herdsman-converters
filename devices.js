'use strict';

/**
 * Documentation of 'meta'
 *
 * configureKey: required when a 'configure' is defined, this key is used by the application to determine if the
 *               content of the configure has been changed and thus needs to re-execute it. For a currently
 *               unsupported device you can set this to 1.
 * multiEndpoint: enables the multi endpoint functionallity in e.g. fromZigbee.on_off, example: normally this
 *                converter would return {"state": "OFF"}, when multiEndpoint is enabled the 'endpoint' method
 *                of the device definition will be called to determine the endpoint name which is then used as
 *                key e.g. {"state_left": "OFF"}. Only needed when device sends the same attribute from
 *                multiple endpoints.
 * disableDefaultResponse: used by toZigbee converters to disable the default response of some devices as they
 *                         don't provide one.
 * applyRedFix: see toZigbee.light_color
 * enhancedHue: see toZigbee.light_color
 * supportsHueAndSaturation: see toZigbee.light_color
 * timeout: timeout for commands to this device used in toZigbee.
 */

const common = require('./converters/common');
const fz = require('./converters/fromZigbee');
const tz = require('./converters/toZigbee');
const utils = require('./converters/utils');
const globalStore = require('./converters/store');
const ota = require('./ota');

const store = {};

const repInterval = {
    MAX: 62000,
    HOUR: 3600,
    MINUTES_15: 900,
    MINUTES_10: 600,
    MINUTES_5: 300,
    MINUTE: 60,
};

const defaultBindGroup = 901;

const bind = async (endpoint, target, clusters) => {
    for (const cluster of clusters) {
        await endpoint.bind(cluster, target);
    }
};

const readEletricalMeasurementPowerConverterAttributes = async (endpoint) => {
    // Split into two chunks, some devices fail to respond when reading too much attributes at once.
    await endpoint.read('haElectricalMeasurement', ['acVoltageMultiplier', 'acVoltageDivisor', 'acCurrentMultiplier']);
    await endpoint.read('haElectricalMeasurement', ['acCurrentDivisor', 'acPowerMultiplier', 'acPowerDivisor']);
};

const readMeteringPowerConverterAttributes = async (endpoint) => {
    await endpoint.read('seMetering', ['multiplier', 'divisor']);
};

const configureReportingPayload = (attribute, min, max, change, overrides) => {
    const payload = {
        attribute: attribute,
        minimumReportInterval: min,
        maximumReportInterval: max,
        reportableChange: change,
    };


    if (overrides) {
        if (overrides.hasOwnProperty('min')) payload.minimumReportInterval = overrides.min;
        if (overrides.hasOwnProperty('max')) payload.maximumReportInterval = overrides.max;
        if (overrides.hasOwnProperty('change')) payload.reportableChange = overrides.change;
    }

    return [payload];
};

const configureReporting = {
    currentPositionLiftPercentage: async (endpoint, overrides) => {
        const payload = configureReportingPayload('currentPositionLiftPercentage', 1, repInterval.MAX, 1, overrides);
        await endpoint.configureReporting('closuresWindowCovering', payload);
    },
    batteryPercentageRemaining: async (endpoint, overrides) => {
        const payload = configureReportingPayload(
            'batteryPercentageRemaining', repInterval.HOUR, repInterval.MAX, 0, overrides,
        );
        await endpoint.configureReporting('genPowerCfg', payload);
    },
    batteryVoltage: async (endpoint, overrides) => {
        const payload = configureReportingPayload('batteryVoltage', repInterval.HOUR, repInterval.MAX, 0, overrides);
        await endpoint.configureReporting('genPowerCfg', payload);
    },
    batteryAlarmState: async (endpoint, overrides) => {
        const payload = configureReportingPayload('batteryAlarmState', repInterval.HOUR, repInterval.MAX, 0, overrides);
        await endpoint.configureReporting('genPowerCfg', payload);
    },
    onOff: async (endpoint, overrides) => {
        const payload = configureReportingPayload('onOff', 0, repInterval.HOUR, 0, overrides);
        await endpoint.configureReporting('genOnOff', payload);
    },
    lockState: async (endpoint, overrides) => {
        const payload = configureReportingPayload('lockState', 0, repInterval.HOUR, 0, overrides);
        await endpoint.configureReporting('closuresDoorLock', payload);
    },
    brightness: async (endpoint, overrides) => {
        const payload = configureReportingPayload('currentLevel', 0, repInterval.HOUR, 1, overrides);
        await endpoint.configureReporting('genLevelCtrl', payload);
    },
    occupancy: async (endpoint, overrides) => {
        const payload = configureReportingPayload('occupancy', 0, repInterval.HOUR, 0, overrides);
        await endpoint.configureReporting('msOccupancySensing', payload);
    },
    temperature: async (endpoint, overrides) => {
        const payload = configureReportingPayload('measuredValue', 10, repInterval.HOUR, 100, overrides);
        await endpoint.configureReporting('msTemperatureMeasurement', payload);
    },
    pressure: async (endpoint, overrides) => {
        const payload = configureReportingPayload('measuredValue', 10, repInterval.HOUR, 5, overrides);
        await endpoint.configureReporting('msPressureMeasurement', payload);
    },
    illuminance: async (endpoint, overrides) => {
        const payload = configureReportingPayload('measuredValue', 10, repInterval.HOUR, 5, overrides);
        await endpoint.configureReporting('msIlluminanceMeasurement', payload);
    },
    instantaneousDemand: async (endpoint, overrides) => {
        const payload = configureReportingPayload('instantaneousDemand', 5, repInterval.HOUR, 1, overrides);
        await endpoint.configureReporting('seMetering', payload);
    },
    currentSummDelivered: async (endpoint, overrides) => {
        const payload = configureReportingPayload('currentSummDelivered', 5, repInterval.HOUR, [1, 1], overrides);
        await endpoint.configureReporting('seMetering', payload);
    },
    currentSummReceived: async (endpoint, overrides) => {
        const payload = configureReportingPayload('currentSummReceived', 5, repInterval.HOUR, [1, 1], overrides);
        await endpoint.configureReporting('seMetering', payload);
    },
    thermostatSystemMode: async (endpoint, overrides) => {
        const payload = configureReportingPayload('systemMode', 10, repInterval.HOUR, null, overrides);
        await endpoint.configureReporting('hvacThermostat', payload);
    },
    humidity: async (endpoint, overrides) => {
        const payload = configureReportingPayload('measuredValue', 10, repInterval.HOUR, 100, overrides);
        await endpoint.configureReporting('msRelativeHumidity', payload);
    },
    thermostatKeypadLockMode: async (endpoint, overrides) => {
        const payload = configureReportingPayload('keypadLockout', 10, repInterval.HOUR, null, overrides);
        await endpoint.configureReporting('hvacUserInterfaceCfg', payload);
    },
    thermostatTemperature: async (endpoint, overrides) => {
        const payload = configureReportingPayload('localTemp', 0, repInterval.HOUR, 10, overrides);
        await endpoint.configureReporting('hvacThermostat', payload);
    },
    thermostatTemperatureCalibration: async (endpoint, overrides) => {
        const payload = configureReportingPayload('localTemperatureCalibration', 0, repInterval.HOUR, 0, overrides);
        await endpoint.configureReporting('hvacThermostat', payload);
    },
    thermostatOccupiedHeatingSetpoint: async (endpoint, overrides) => {
        const payload = configureReportingPayload('occupiedHeatingSetpoint', 0, repInterval.HOUR, 10, overrides);
        await endpoint.configureReporting('hvacThermostat', payload);
    },
    thermostatUnoccupiedHeatingSetpoint: async (endpoint, overrides) => {
        const payload = configureReportingPayload('unoccupiedHeatingSetpoint', 0, repInterval.HOUR, 10, overrides);
        await endpoint.configureReporting('hvacThermostat', payload);
    },
    thermostatOccupiedCoolingSetpoint: async (endpoint, overrides) => {
        const payload = configureReportingPayload('occupiedCoolingSetpoint', 0, repInterval.HOUR, 10, overrides);
        await endpoint.configureReporting('hvacThermostat', payload);
    },
    thermostatUnoccupiedCoolingSetpoint: async (endpoint, overrides) => {
        const payload = configureReportingPayload('occupiedCoolingSetpoint', 0, repInterval.HOUR, 10, overrides);
        await endpoint.configureReporting('hvacThermostat', payload);
    },
    thermostatPIHeatingDemand: async (endpoint, overrides) => {
        const payload = configureReportingPayload('pIHeatingDemand', 0, repInterval.MINUTES_5, 10, overrides);
        await endpoint.configureReporting('hvacThermostat', payload);
    },
    thermostatRunningState: async (endpoint, overrides) => {
        const payload = configureReportingPayload('runningState', 0, repInterval.HOUR, 0, overrides);
        await endpoint.configureReporting('hvacThermostat', payload);
    },
    thermostatTemperatureSetpointHold: async (endpoint, overrides) => {
        const payload = configureReportingPayload('tempSetpointHold', 0, repInterval.HOUR, 0, overrides);
        await endpoint.configureReporting('hvacThermostat', payload);
    },
    thermostatTemperatureSetpointHoldDuration: async (endpoint, overrides) => {
        const payload = configureReportingPayload('tempSetpointHoldDuration', 0, repInterval.HOUR, 10, overrides);
        await endpoint.configureReporting('hvacThermostat', payload);
    },
    presentValue: async (endpoint, overrides) => {
        const payload = configureReportingPayload('presentValue', 10, repInterval.MINUTE, 1, overrides);
        await endpoint.configureReporting('genBinaryInput', payload);
    },
    activePower: async (endpoint, overrides) => {
        const payload = configureReportingPayload('activePower', 5, repInterval.HOUR, 1, overrides);
        await endpoint.configureReporting('haElectricalMeasurement', payload);
    },
    rmsCurrent: async (endpoint, overrides) => {
        const payload = configureReportingPayload('rmsCurrent', 5, repInterval.HOUR, 1, overrides);
        await endpoint.configureReporting('haElectricalMeasurement', payload);
    },
    rmsVoltage: async (endpoint, overrides) => {
        const payload = configureReportingPayload('rmsVoltage', 5, repInterval.HOUR, 1, overrides);
        await endpoint.configureReporting('haElectricalMeasurement', payload);
    },
    powerFactor: async (endpoint, overrides) => {
        const payload = configureReportingPayload('powerFactor', 0, repInterval.MAX, 1, overrides);
        await endpoint.configureReporting('haElectricalMeasurement', payload);
    },
    fanMode: async (endpoint, overrides) => {
        const payload = configureReportingPayload('fanMode', 0, repInterval.HOUR, 0, overrides);
        await endpoint.configureReporting('hvacFanCtrl', payload);
    },
};

const generic = {
    light_onoff_brightness: {
        supports: 'on/off, brightness',
        fromZigbee: [fz.on_off, fz.brightness, fz.ignore_basic_report],
        toZigbee: [
            tz.light_onoff_brightness, tz.ignore_transition, tz.ignore_rate, tz.light_alert,
            tz.light_brightness_move, tz.light_brightness_step,
        ],
    },
    light_onoff_brightness_colortemp: {
        supports: 'on/off, brightness, color temperature',
        fromZigbee: [fz.color_colortemp, fz.on_off, fz.brightness, fz.ignore_basic_report],
        toZigbee: [
            tz.light_onoff_brightness, tz.light_colortemp, tz.ignore_transition, tz.ignore_rate, tz.light_alert,
            tz.light_brightness_move, tz.light_colortemp_move, tz.light_brightness_step,
            tz.light_colortemp_step,
        ],
    },
    light_onoff_brightness_colorxy: {
        supports: 'on/off, brightness, color xy',
        fromZigbee: [fz.color_colortemp, fz.on_off, fz.brightness, fz.ignore_basic_report],
        toZigbee: [
            tz.light_onoff_brightness, tz.light_color, tz.ignore_transition, tz.ignore_rate, tz.light_alert,
            tz.light_brightness_move, tz.light_brightness_step,
            tz.light_hue_saturation_move, tz.light_hue_saturation_step,
        ],
    },
    light_onoff_brightness_colortemp_colorxy: {
        supports: 'on/off, brightness, color temperature, color xy',
        fromZigbee: [fz.color_colortemp, fz.on_off, fz.brightness, fz.ignore_basic_report],
        toZigbee: [
            tz.light_onoff_brightness, tz.light_color_colortemp, tz.ignore_transition, tz.ignore_rate,
            tz.light_alert, tz.light_brightness_move, tz.light_colortemp_move, tz.light_brightness_step,
            tz.light_colortemp_step, tz.light_hue_saturation_move, tz.light_hue_saturation_step,
        ],
    },
};

const gledopto = {
    light_onoff_brightness: {
        ...generic.light_onoff_brightness,
        toZigbee: utils.replaceInArray(
            generic.light_onoff_brightness.toZigbee,
            [tz.light_onoff_brightness],
            [tz.gledopto_light_onoff_brightness],
        ),
    },
    light_onoff_brightness_colortemp: {
        ...generic.light_onoff_brightness_colortemp,
        toZigbee: utils.replaceInArray(
            generic.light_onoff_brightness_colortemp.toZigbee,
            [tz.light_onoff_brightness, tz.light_colortemp],
            [tz.gledopto_light_onoff_brightness, tz.gledopto_light_colortemp],
        ),
    },
    light_onoff_brightness_colorxy: {
        ...generic.light_onoff_brightness_colorxy,
        toZigbee: utils.replaceInArray(
            generic.light_onoff_brightness_colorxy.toZigbee,
            [tz.light_onoff_brightness, tz.light_color],
            [tz.gledopto_light_onoff_brightness, tz.gledopto_light_color],
        ),
    },
    light_onoff_brightness_colortemp_colorxy: {
        ...generic.light_onoff_brightness_colortemp_colorxy,
        toZigbee: utils.replaceInArray(
            generic.light_onoff_brightness_colortemp_colorxy.toZigbee,
            [tz.light_onoff_brightness, tz.light_color_colortemp],
            [tz.gledopto_light_onoff_brightness, tz.gledopto_light_color_colortemp],
        ),
    },
};

const tzHuePowerOnBehavior = [
    tz.hue_power_on_behavior, tz.hue_power_on_error,
];
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

const ledvance = {
    light_onoff_brightness: {
        supports: generic.light_onoff_brightness.supports,
        fromZigbee: generic.light_onoff_brightness.fromZigbee,
        toZigbee: generic.light_onoff_brightness.toZigbee.concat([tz.ledvance_commands]),
    },
    light_onoff_brightness_colortemp: {
        supports: generic.light_onoff_brightness_colortemp.supports,
        fromZigbee: generic.light_onoff_brightness_colortemp.fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp.toZigbee.concat([tz.ledvance_commands]),
    },
    light_onoff_brightness_colorxy: {
        supports: generic.light_onoff_brightness_colorxy.supports,
        fromZigbee: generic.light_onoff_brightness_colorxy.fromZigbee,
        toZigbee: generic.light_onoff_brightness_colorxy.toZigbee.concat([tz.ledvance_commands]),
    },
    light_onoff_brightness_colortemp_colorxy: {
        supports: generic.light_onoff_brightness_colortemp_colorxy.supports,
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy.fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy.toZigbee.concat([tz.ledvance_commands]),
    },
};

const legrand = {
    read_initial_battery_state: async (type, data, device) => {
        if (['deviceAnnounce'].includes(type) && typeof store[device.ieeeAddr] === 'undefined') {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: 0x1021, disableDefaultResponse: true};
            await endpoint.read('genPowerCfg', ['batteryVoltage'], options);
        }
    },
};

const xiaomi = {
    prevent_reset: async (type, data, device) => {
        if (
            // options.allow_reset ||
            type !== 'message' ||
            data.type !== 'attributeReport' ||
            data.cluster !== 'genBasic' ||
            !data.data[0xfff0] ||
            // eg: [0xaa, 0x10, 0x05, 0x41, 0x87, 0x01, 0x01, 0x10, 0x00]
            !data.data[0xFFF0].slice(0, 5).equals(Buffer.from([0xaa, 0x10, 0x05, 0x41, 0x87]))
        ) {
            return;
        }
        const options = {manufacturerCode: 0x115f};
        const payload = {[0xfff0]: {
            value: [0xaa, 0x10, 0x05, 0x41, 0x47, 0x01, 0x01, 0x10, 0x01],
            type: 0x41,
        }};
        await device.getEndpoint(1).write('genBasic', payload, options);
    },
};

const livolo = {
    poll: async (device) => {
        try {
            const endpoint = device.getEndpoint(6);
            await endpoint.command('genOnOff', 'toggle', {}, {transactionSequenceNumber: 0});
        } catch (error) {
            // device is lost, need to permit join
        }
    },
};

const pincodeLock = {
    readPinCodeAfterProgramming: async (type, data, device) => {
        // When we receive a code updated message, lets read the new value
        if (data.type === 'commandProgrammingEventNotification' &&
            data.cluster === 'closuresDoorLock' &&
            data.data &&
            data.data.userid !== undefined &&
            // Don't read RF events, we can do this with retrieve_state
            (data.data.programeventsrc === undefined || common.lockSourceName[data.data.programeventsrc] != 'rf')
        ) {
            await utils.getDoorLockPinCode( device.endpoints[0], data.data.userid );
        }
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
        zigbeeModel: ['lumi.light.cwopcn02'],
        model: 'XDD12LM',
        vendor: 'Xiaomi',
        description: 'Aqara Opple MX650',
        extend: generic.light_onoff_brightness_colortemp,
        fromZigbee: [
            fz.brightness, fz.color_colortemp, fz.on_off, fz.xiaomi_bulb_interval,
            fz.ignore_light_brightness_report, fz.ignore_light_color_colortemp_report,
            fz.ignore_occupancy_report, fz.ignore_humidity_report,
            fz.ignore_pressure_report, fz.ignore_temperature_report,
        ],
    },
    {
        zigbeeModel: ['lumi.light.cwopcn03'],
        model: 'XDD13LM',
        vendor: 'Xiaomi',
        description: 'Aqara Opple MX480',
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
        fromZigbee: [fz.xiaomi_battery_3v, fz.xiaomi_WXKG01LM_action, fz.legacy_WXKG01LM_click],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_switch.aq2', 'lumi.remote.b1acn01'],
        model: 'WXKG11LM',
        vendor: 'Xiaomi',
        description: 'Aqara wireless switch',
        supports: 'single, double click (and triple, quadruple, hold, release depending on model)',
        fromZigbee: [
            fz.xiaomi_multistate_action, fz.xiaomi_WXKG11LM_action,
            /* check these: */ fz.xiaomi_battery_3v, fz.legacy_WXKG11LM_click, fz.legacy_xiaomi_action_click_multistate,
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
            fz.xiaomi_battery_3v, fz.xiaomi_multistate_action, fz.legacy_WXKG12LM_action_click_multistate,
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
            fz.xiaomi_on_off_action, fz.xiaomi_multistate_action,
            /* check these: */
            fz.xiaomi_battery_3v, fz.legacy_WXKG03LM_click, fz.legacy_xiaomi_action_click_multistate],
        toZigbee: [],
        onEvent: xiaomi.prevent_reset,
    },
    {
        zigbeeModel: ['lumi.remote.b186acn02'],
        model: 'WXKG06LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 single key wireless wall switch',
        supports: 'action',
        fromZigbee: [fz.xiaomi_battery_3v, fz.xiaomi_on_off_action, fz.xiaomi_multistate_action],
        toZigbee: [],
        onEvent: xiaomi.prevent_reset,
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.endpoints[1];
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
        },
    },
    {
        zigbeeModel: ['lumi.sensor_86sw2', 'lumi.sensor_86sw2.es1', 'lumi.remote.b286acn01'],
        model: 'WXKG02LM',
        vendor: 'Xiaomi',
        description: 'Aqara double key wireless wall switch',
        supports: 'left, right, both click (and double, long click for left, right and both depending on model)',
        fromZigbee: [
            fz.xiaomi_on_off_action, fz.xiaomi_multistate_action,
            /* check these: */ fz.xiaomi_battery_3v, fz.legacy_WXKG02LM_click, fz.legacy_WXKG02LM_click_multistate,
        ],
        toZigbee: [],
        endpoint: (device) => {
            return {'left': 1, 'right': 2, 'both': 3};
        },
        onEvent: xiaomi.prevent_reset,
    },
    {
        zigbeeModel: ['lumi.switch.b1laus01'],
        model: 'WS-USC01',
        vendor: 'Xiaomi',
        description: 'Aqara smart wall switch (no neutral, single rocker)',
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
        zigbeeModel: ['lumi.switch.b2laus01'],
        model: 'WS-USC02',
        vendor: 'Xiaomi',
        description: 'Aqara smart wall switch (no neutral, double rocker)',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {multiEndpoint: true, configureKey: 1},
        endpoint: (device) => {
            return {'top': 1, 'bottom': 2};
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint1);
            const endpoint2 = device.getEndpoint(2);
            await bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint2);
        },
    },
    {
        zigbeeModel: ['lumi.switch.b2naus01'],
        model: 'WS-USC04',
        vendor: 'Xiaomi',
        description: 'Aqara smart wall switch (neutral, double rocker)',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {multiEndpoint: true, configureKey: 1},
        endpoint: (device) => {
            return {'top': 1, 'bottom': 2};
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint1);
            const endpoint2 = device.getEndpoint(2);
            await bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint2);
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
            fz.on_off_xiaomi_ignore_endpoint_4_5_6, fz.xiaomi_on_off_action, fz.legacy_QBKG04LM_QBKG11LM_click, fz.QBKG04LM_buttons,
            fz.xiaomi_operation_mode_basic,
        ],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode],
        endpoint: (device) => {
            return {'system': 1, 'default': 2};
        },
        onEvent: xiaomi.prevent_reset,
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.ctrl_ln1.aq1', 'lumi.ctrl_ln1'],
        model: 'QBKG11LM',
        vendor: 'Xiaomi',
        description: 'Aqara single key wired wall switch',
        supports: 'on/off, power measurement',
        fromZigbee: [
            fz.xiaomi_on_off_action, fz.xiaomi_multistate_action,
            /* check these: */
            fz.on_off_xiaomi_ignore_endpoint_4_5_6, fz.legacy_QBKG04LM_QBKG11LM_click,
            fz.xiaomi_power_from_basic,
            fz.xiaomi_operation_mode_basic, fz.legacy_QBKG11LM_click, fz.ignore_multistate_report, fz.xiaomi_power,
        ],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode],
        endpoint: (device) => {
            return {'system': 1};
        },
        onEvent: xiaomi.prevent_reset,
    },
    {
        zigbeeModel: ['lumi.ctrl_neutral2'],
        model: 'QBKG03LM',
        vendor: 'Xiaomi',
        // eslint-disable-next-line
        description: 'Aqara double key wired wall switch without neutral wire. Doesn\'t work as a router and doesn\'t support power meter',
        supports: 'release/hold, on/off, temperature',
        fromZigbee: [
            fz.xiaomi_on_off_action,
            /* check these */
            fz.on_off_xiaomi_ignore_endpoint_4_5_6, fz.legacy_QBKG03LM_QBKG12LM_click, fz.QBKG03LM_buttons,
            fz.xiaomi_operation_mode_basic, fz.generic_device_temperature,
        ],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode],
        meta: {multiEndpoint: true, configureKey: 1},
        endpoint: (device) => {
            return {'system': 1, 'left': 2, 'right': 3};
        },
        onEvent: xiaomi.prevent_reset,
        configure: async (device, coordinatorEndpoint) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.ctrl_ln2.aq1', 'lumi.ctrl_ln2'],
        model: 'QBKG12LM',
        vendor: 'Xiaomi',
        description: 'Aqara double key wired wall switch',
        supports: 'on/off, power measurement, temperature',
        fromZigbee: [
            fz.xiaomi_on_off_action, fz.xiaomi_multistate_action,
            /* check these: */
            fz.on_off_xiaomi_ignore_endpoint_4_5_6, fz.legacy_QBKG03LM_QBKG12LM_click,
            fz.xiaomi_power_from_basic, fz.xiaomi_operation_mode_basic, fz.legacy_QBKG12LM_click,
            fz.xiaomi_power,
        ],
        meta: {multiEndpoint: true},
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode],
        endpoint: (device) => {
            return {'left': 1, 'right': 2, 'system': 1};
        },
        onEvent: xiaomi.prevent_reset,
    },
    {
        zigbeeModel: ['lumi.remote.b286acn02'],
        model: 'WXKG07LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 double key wireless wall switch',
        supports: 'action',
        fromZigbee: [fz.xiaomi_battery_3v, fz.legacy_xiaomi_on_off_action, fz.legacy_xiaomi_multistate_action],
        toZigbee: [],
        endpoint: (device) => {
            return {left: 1, right: 2, both: 3};
        },
        onEvent: xiaomi.prevent_reset,
    },
    {
        zigbeeModel: ['lumi.switch.b1lacn02'],
        model: 'QBKG21LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 single gang smart wall switch (no neutral wire)',
        supports: 'on/off, action',
        fromZigbee: [
            fz.on_off_xiaomi_ignore_endpoint_4_5_6, fz.xiaomi_on_off_action, fz.legacy_QBKG04LM_QBKG11LM_click, fz.QBKG04LM_buttons,
            fz.xiaomi_operation_mode_basic,
        ],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode],
        endpoint: (device) => {
            return {'system': 1, 'default': 2};
        },
        onEvent: xiaomi.prevent_reset,
    },
    {
        zigbeeModel: ['lumi.switch.b2lacn02'],
        model: 'QBKG22LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 2 gang smart wall switch (no neutral wire)',
        supports: 'on/off, action',
        fromZigbee: [
            fz.on_off_xiaomi_ignore_endpoint_4_5_6, fz.xiaomi_on_off_action, fz.legacy_QBKG03LM_QBKG12LM_click, fz.QBKG03LM_buttons,
            fz.xiaomi_operation_mode_basic,
        ],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'system': 1, 'left': 2, 'right': 3};
        },
        onEvent: xiaomi.prevent_reset,
    },
    {
        zigbeeModel: ['lumi.switch.l3acn3'],
        model: 'QBKG25LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 3 gang smart wall switch (no neutral wire)',
        supports: 'on/off, action',
        fromZigbee: [fz.on_off, fz.QBKG25LM_click, fz.xiaomi_operation_mode_opple],
        toZigbee: [tz.on_off, tz.xiaomi_switch_operation_mode, tz.xiaomi_switch_power_outage_memory, tz.xiaomi_switch_do_not_disturb],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        onEvent: xiaomi.prevent_reset,
    },
    {
        zigbeeModel: ['lumi.switch.b1nacn02'],
        model: 'QBKG23LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 1 gang smart wall switch (with neutral wire)',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.xiaomi_power, fz.xiaomi_power_from_basic],
        toZigbee: [tz.on_off],
        meta: {},
        endpoint: (device) => {
            return {'system': 1};
        },
        onEvent: xiaomi.prevent_reset,
    },
    {
        zigbeeModel: ['lumi.switch.b2nacn02'],
        model: 'QBKG24LM',
        vendor: 'Xiaomi',
        description: 'Aqara D1 2 gang smart wall switch (with neutral wire)',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.xiaomi_power],
        toZigbee: [tz.on_off],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'left': 1, 'right': 2, 'system': 1};
        },
        onEvent: xiaomi.prevent_reset,
    },
    {
        zigbeeModel: ['lumi.sens', 'lumi.sensor_ht'],
        model: 'WSDCGQ01LM',
        vendor: 'Xiaomi',
        description: 'MiJia temperature & humidity sensor',
        supports: 'temperature and humidity',
        fromZigbee: [fz.xiaomi_battery_3v, fz.WSDCGQ01LM_WSDCGQ11LM_interval, fz.xiaomi_temperature, fz.humidity],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.weather'],
        model: 'WSDCGQ11LM',
        vendor: 'Xiaomi',
        description: 'Aqara temperature, humidity and pressure sensor',
        supports: 'temperature, humidity and pressure',
        fromZigbee: [
            fz.xiaomi_battery_3v, fz.xiaomi_temperature, fz.humidity, fz.WSDCGQ11LM_pressure,
            fz.WSDCGQ01LM_WSDCGQ11LM_interval,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.sensor_ht.agl02'],
        model: 'WSDCGQ12LM',
        vendor: 'Xiaomi',
        description: 'Aqara temperature, humidity and pressure sensor',
        supports: 'temperature, humidity and pressure',
        fromZigbee: [fz.xiaomi_battery_3v, fz.temperature, fz.humidity, fz.pressure],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement'];
            await bind(endpoint, coordinatorEndpoint, binds);
        },
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
            fz.xiaomi_battery_3v, fz.occupancy_with_timeout, fz.RTCGQ11LM_illuminance,
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
        zigbeeModel: ['lumi.flood.agl02'],
        model: 'SJCGQ12LM',
        vendor: 'Xiaomi',
        description: 'Aqara water leak sensor',
        supports: 'water leak true/false',
        fromZigbee: [fz.xiaomi_battery_3v, fz.ias_water_leak_alarm_1],
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
        toZigbee: [tz.on_off, tz.xiaomi_switch_power_outage_memory],
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
            fz.on_off, fz.xiaomi_power, fz.xiaomi_plug_eu_state,
            fz.ignore_occupancy_report,
            fz.ignore_illuminance_report, fz.ignore_time_read,
        ],
        toZigbee: [tz.on_off, tz.xiaomi_switch_power_outage_memory],
    },
    {
        zigbeeModel: ['lumi.plug.maus01'],
        model: 'ZNCZ12LM',
        description: 'Mi power plug ZigBee US',
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
        zigbeeModel: ['lumi.plug.maeu01'],
        model: 'SP-EUC01',
        description: 'Aqara EU smart plug',
        supports: 'on/off, power measurements (depends on firmware)',
        vendor: 'Xiaomi',
        fromZigbee: [fz.on_off, fz.xiaomi_plug_state, fz.electrical_measurement_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await configureReporting.onOff(endpoint);
            try {
                await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
                await configureReporting.activePower(endpoint);
            } catch (e) {
                // Not all plugs support this.
                // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1050#issuecomment-673111969
            }

            // Voltage/current doesn't seem to be supported, maybe in futurue revisions of the device (?).
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1050
        },
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
        toZigbee: [tz.on_off, tz.xiaomi_switch_power_outage_memory],
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
        fromZigbee: [fz.xiaomi_battery_3v, fz.DJT11LM_vibration],
        toZigbee: [tz.DJT11LM_vibration_sensitivity],
    },
    {
        zigbeeModel: ['lumi.vibration.agl01'],
        model: 'DJT12LM',
        vendor: 'Xiaomi',
        description: 'Aqara vibration sensor',
        supports: 'action',
        fromZigbee: [fz.DJT12LM_vibration],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.curtain', 'lumi.curtain.aq2'],
        model: 'ZNCLDJ11LM',
        description: 'Aqara curtain motor',
        supports: 'open, close, stop, position',
        vendor: 'Xiaomi',
        fromZigbee: [fz.xiaomi_curtain_position, fz.cover_position_tilt, fz.xiaomi_curtain_options],
        toZigbee: [tz.xiaomi_curtain_position_state, tz.xiaomi_curtain_options],
    },
    {
        zigbeeModel: ['lumi.curtain.hagl04'],
        model: 'ZNCLDJ12LM',
        vendor: 'Xiaomi',
        description: 'Aqara B1 curtain motor ',
        supports: 'open, close, stop, position',
        fromZigbee: [fz.xiaomi_curtain_position, fz.battery, fz.cover_position_tilt, fz.ignore_basic_report, fz.xiaomi_curtain_options],
        toZigbee: [tz.xiaomi_curtain_position_state, tz.xiaomi_curtain_options],
        onEvent: async (type, data, device) => {
            // The position (genAnalogOutput.presentValue) reported via an attribute contains an invaid value
            // however when reading it will provide the correct value.
            if (data.type === 'attributeReport' && data.cluster === 'genAnalogOutput') {
                await device.endpoints[0].read('genAnalogOutput', ['presentValue']);
            }
        },
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.endpoints[0];
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['lumi.relay.c2acn01'],
        model: 'LLKZMK11LM',
        vendor: 'Xiaomi',
        description: 'Aqara wireless relay controller',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.xiaomi_power_from_basic, fz.xiaomi_power, fz.ignore_multistate_report, fz.on_off],
        meta: {multiEndpoint: true},
        toZigbee: [tz.on_off, tz.LLKZMK11LM_interlock],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
    },
    {
        zigbeeModel: ['lumi.lock.acn02'],
        model: 'ZNMS12LM',
        description: 'Aqara S2 lock',
        supports: 'open, close, operation (reporting only)',
        vendor: 'Xiaomi',
        fromZigbee: [fz.ZNMS12LM_ZNMS13LM_closuresDoorLock_report, fz.ignore_basic_report],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.lock.acn03'],
        model: 'ZNMS13LM',
        description: 'Aqara S2 lock pro',
        supports: 'open, close, operation (reporting only)',
        vendor: 'Xiaomi',
        fromZigbee: [fz.ZNMS12LM_ZNMS13LM_closuresDoorLock_report, fz.ignore_basic_report],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            // Device advertises itself as Router but is an EndDevice
            device.type = 'EndDevice';
            device.save();
        },
    },
    {
        zigbeeModel: ['lumi.lock.aq1'],
        model: 'ZNMS11LM',
        description: 'Xiaomi Aqara smart lock',
        supports: 'open, close, operation (reporting only)',
        vendor: 'Xiaomi',
        fromZigbee: [fz.ZNMS11LM_closuresDoorLock_report, fz.ignore_basic_report],
        toZigbee: [],
    },
    {
        zigbeeModel: ['lumi.remote.b286opcn01'],
        model: 'WXCJKG11LM',
        vendor: 'Xiaomi',
        description: 'Aqara Opple switch 1 band',
        supports: 'action',
        fromZigbee: [
            fz.aqara_opple_on, fz.aqara_opple_off, fz.battery_3V,
            fz.aqara_opple_multistate, fz.aqara_opple_report,
        ],
        toZigbee: [tz.aqara_opple_operation_mode],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f});
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
        },
    },
    {
        zigbeeModel: ['lumi.remote.b486opcn01'],
        model: 'WXCJKG12LM',
        vendor: 'Xiaomi',
        description: 'Aqara Opple switch 2 bands',
        supports: 'action',
        fromZigbee: [
            fz.aqara_opple_on, fz.aqara_opple_off, fz.aqara_opple_step,
            fz.aqara_opple_step_color_temp, fz.battery_3V,
            fz.aqara_opple_multistate, fz.aqara_opple_report,
        ],
        toZigbee: [tz.aqara_opple_operation_mode],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f});
            await bind(endpoint, coordinatorEndpoint, [
                'genOnOff', 'genLevelCtrl', 'lightingColorCtrl', 'genPowerCfg',
            ]);
        },
    },
    {
        zigbeeModel: ['lumi.remote.b686opcn01'],
        model: 'WXCJKG13LM',
        vendor: 'Xiaomi',
        description: 'Aqara Opple switch 3 bands',
        supports: 'action',
        fromZigbee: [
            fz.aqara_opple_on, fz.aqara_opple_off, fz.aqara_opple_step, fz.aqara_opple_move,
            fz.aqara_opple_stop, fz.aqara_opple_step_color_temp, fz.aqara_opple_move_color_temp,
            fz.battery_3V,
            fz.aqara_opple_multistate, fz.aqara_opple_report,
        ],
        toZigbee: [tz.aqara_opple_operation_mode],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.write('aqaraOpple', {'mode': 1}, {manufacturerCode: 0x115f});
            await bind(endpoint, coordinatorEndpoint, [
                'genOnOff', 'genLevelCtrl', 'lightingColorCtrl', 'genPowerCfg',
            ]);
        },
    },
    {
        zigbeeModel: ['lumi.sen_ill.mgl01'],
        model: 'GZCGQ01LM',
        vendor: 'Xiaomi',
        description: 'MiJia light intensity sensor',
        supports: 'illuminance',
        fromZigbee: [fz.battery_3V, fz.illuminance],
        toZigbee: [],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'msIlluminanceMeasurement']);
            await configureReporting.batteryVoltage(endpoint);
            await configureReporting.illuminance(endpoint, {min: 15, max: repInterval.HOUR, change: 500});
        },
    },
    {
        zigbeeModel: ['lumi.light.rgbac1'],
        model: 'ZNTGMK11LM',
        vendor: 'Xiaomi',
        description: 'Aqara smart RGBW light controller',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['lumi.light.cbacn1'],
        model: 'HLQDQ01LM',
        vendor: 'Xiaomi',
        description: 'Aqara zigbee LED-controller ',
        extend: generic.light_onoff_brightness,
    },

    // TuYa
    {
        zigbeeModel: ['TS0215A'],
        model: 'TS0215A',
        vendor: 'TuYa',
        description: 'SOS button',
        supports: 'action',
        fromZigbee: [fz.command_emergency, fz.battery],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0503A'],
        model: 'TYZS1L',
        vendor: 'TuYa',
        description: 'Led strip controller HSB',
        supports: 'on/off, color (hue/saturation)',
        fromZigbee: [fz.on_off, fz.tuya_led_controller],
        toZigbee: [tz.tuya_led_controller, tz.ignore_transition, tz.ignore_rate],
    },
    {
        zigbeeModel: ['TS0502A'],
        model: 'TS0502A',
        vendor: 'TuYa',
        description: 'Light controller',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['TS0201'],
        model: 'TS0201',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor with display',
        supports: 'temperature and humidity',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0041'],
        model: 'TS0041',
        vendor: 'TuYa',
        description: 'Wireless switch with 1 button',
        supports: 'action',
        whiteLabel: [
            {vendor: 'Smart9', model: 'S9TSZGB'},
            {vendor: 'Lonsonho', model: 'TS0041'},
        ],
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0042'],
        model: 'TS0042',
        vendor: 'TuYa',
        description: 'Wireless switch with 2 buttons',
        whiteLabel: [
            {vendor: 'Smart9', model: 'S9TSZGB'},
            {vendor: 'Lonsonho', model: 'TS0042'},
        ],
        supports: 'action',
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0043'],
        model: 'TS0043',
        vendor: 'TuYa',
        description: 'Wireless switch with 3 buttons',
        whiteLabel: [
            {vendor: 'Smart9', model: 'S9TSZGB'},
            {vendor: 'Lonsonho', model: 'TS0043'},
        ],
        supports: 'action',
        fromZigbee: [fz.tuya_on_off_action, fz.battery],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0001'],
        model: 'TS0001',
        vendor: 'TuYa',
        description: '1 gang switch',
        supports: 'on/off',
        whiteLabel: [
            {vendor: 'CR Smart Home', model: 'TS0001', description: 'Valve control'},
            {vendor: 'Lonsonho', model: 'X701'},
            {vendor: 'Bandi', model: 'BDS03G1'},
        ],
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['TS0002'],
        model: 'TS0002',
        vendor: 'TuYa',
        description: '2 gang switch',
        whiteLabel: [
            {vendor: 'Zemismart', model: 'ZM-CSW002-D'},
            {vendor: 'Lonsonho', model: 'X702'},
        ],
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {configureKey: 3, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['owvfni3\u0000', 'owvfni3', 'aabybja'],
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_5zbp6j0u'}],
        model: 'TS0601_curtain',
        vendor: 'TuYa',
        description: 'Curtain motor',
        whiteLabel: [
            {vendor: 'Yushun', model: 'YS-MT750'},
            {vendor: 'Zemismart', model: 'ZM79E-DT'},
            {vendor: 'Binthen', model: 'BCM100D'},
        ],
        supports: 'open, close, stop, position',
        fromZigbee: [fz.tuya_curtain, fz.ignore_basic_report],
        toZigbee: [tz.tuya_curtain_control, tz.tuya_curtain_options],
    },
    {
        zigbeeModel: ['kud7u2l'],
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_ckud7u2l'}],
        model: 'TS0601_thermostat',
        vendor: 'TuYa',
        description: 'Radiator valve with thermostat',
        supports: 'thermostat, temperature',
        whiteLabel: [
            {vendor: 'Moes', model: 'HY369RT'},
            {vendor: 'SHOJZJ', model: '378RT'},
        ],
        meta: {tuyaThermostatSystemMode: common.TuyaThermostatSystemModes, tuyaThermostatPreset: common.TuyaThermostatPresets},
        fromZigbee: [fz.tuya_thermostat, fz.tuya_thermostat_on_set_data, fz.ignore_basic_report],
        toZigbee: [
            tz.tuya_thermostat_child_lock, tz.tuya_thermostat_window_detection, tz.tuya_thermostat_valve_detection,
            tz.tuya_thermostat_current_heating_setpoint, tz.tuya_thermostat_system_mode, tz.tuya_thermostat_auto_lock,
            tz.tuya_thermostat_calibration, tz.tuya_thermostat_min_temp, tz.tuya_thermostat_max_temp,
            tz.tuya_thermostat_boost_time, tz.tuya_thermostat_comfort_temp, tz.tuya_thermostat_eco_temp,
            tz.tuya_thermostat_force, tz.tuya_thermostat_preset,
        ],
    },
    {
        fingerprint: [{modelID: 'TS0121', manufacturerName: '_TYZB01_iuepbmpv'}],
        model: 'TS0121_switch',
        description: 'Smart light switch module (1 gang)',
        supports: 'on/off',
        vendor: 'TuYa',
        whiteLabel: [
            {vendor: 'Moes', model: 'MS-104Z-1'},
        ],
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
        zigbeeModel: ['TS0121'],
        model: 'TS0121_plug',
        description: '10A UK or 16A EU smart plug',
        whiteLabel: [
            {vendor: 'BlitzWolf', model: 'BW-SHP13'},
        ],
        supports: 'on/off',
        vendor: 'TuYa',
        fromZigbee: [fz.on_off, fz.electrical_measurement_power, fz.metering_power, fz.ignore_basic_report],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            endpoint.saveClusterAttributeKeyValue('seMetering', {
                divisor: 100,
                multiplier: 1,
            });
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acVoltageMultiplier: 1,
                acVoltageDivisor: 1,
                acCurrentMultiplier: 1,
                acCurrentDivisor: 1000,
                acPowerMultiplier: 1,
                acPowerDivisor: 1,
            });
        },
        onEvent: async (type, data, device) => {
            // This device doesn't support reporting correctly.
            // https://github.com/Koenkk/zigbee-herdsman-converters/pull/1270
            const endpoint = device.getEndpoint(1);
            if (type === 'stop') {
                clearInterval(store[device.ieeeAddr]);
            } else if (!store[device.ieeeAddr]) {
                store[device.ieeeAddr] = setInterval(async () => {
                    try {
                        await endpoint.read('haElectricalMeasurement', ['rmsVoltage', 'rmsCurrent', 'activePower']);
                    } catch (error) {
                        // Do nothing
                    }
                }, 10*1000); // Every 10 seconds
            }
        },
    },
    {
        zigbeeModel: ['mcdj3aq', 'mcdj3aq\u0000'],
        model: 'mcdj3aq',
        vendor: 'TuYa',
        description: 'Tubular motor',
        whiteLabel: [
            {vendor: 'Zemismart', model: 'ZM25TQ'},
        ],
        supports: 'open, close, stop, position',
        fromZigbee: [fz.tuya_curtain, fz.ignore_basic_report],
        toZigbee: [tz.tuya_curtain_control, tz.tuya_curtain_options],
    },
    {
        zigbeeModel: ['RH3040'],
        model: 'RH3040',
        vendor: 'TuYa',
        description: 'PIR sensor',
        supports: 'occupancy',
        fromZigbee: [
            fz.battery, fz.legacy_battery_voltage,
            fz.ignore_basic_report,
            fz.ias_occupancy_alarm_1,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        whiteLabel: [
            {vendor: 'Samotech', model: 'SM301Z'},
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genBasic', 'genIdentify', 'genPowerCfg']);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['TS0115'],
        model: 'TS0115',
        vendor: 'TuYa',
        description: 'Multiprise with 4 AC outlets and 2 USB super charging ports (10A or 16A)',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        whiteLabel: [
            {vendor: 'UseeLink', model: 'SM-SO306E/K/M'},
        ],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4, l5: 7};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(7), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['RH3052'],
        model: 'TT001ZAV20',
        vendor: 'TuYa',
        description: 'Temperature & humidity sensor',
        supports: 'temperature and humidity',
        fromZigbee: [
            fz.humidity, fz.temperature, fz.battery,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0011'],
        model: 'TS0011',
        vendor: 'TuYa',
        description: 'Smart light switch - 1 gang without neutral wire',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        whiteLabel: [
            {vendor: 'Vrey', model: 'VR-X712U-0013'},
            {vendor: 'TUYATEC', model: 'GDKES-01TZXD'},
            {vendor: 'Lonsonho', model: 'QS-Zigbee-S05-L', description: '1 gang smart switch module without neutral wire'},
        ],
    },
    {
        zigbeeModel: ['TS0012'],
        model: 'TS0012',
        vendor: 'TuYa',
        description: 'Smart light switch - 2 gang without neutral wire',
        supports: 'on/off',
        whiteLabel: [
            {vendor: 'Vrey', model: 'VR-X712U-0013'},
            {vendor: 'TUYATEC', model: 'GDKES-02TZXD'},
        ],
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['TS0013'],
        model: 'TS0013',
        vendor: 'TuYa',
        description: 'Smart light switch - 3 gang without neutral wire',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        whiteLabel: [
            {vendor: 'TUYATEC', model: 'GDKES-03TZXD'},
        ],
        meta: {configureKey: 2, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            for (const ID of [1, 2, 3]) {
                const endpoint = device.getEndpoint(ID);
                await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
                await configureReporting.onOff(endpoint);
            }
        },
    },
    {
        zigbeeModel: ['gq8b1uv'],
        model: 'gq8b1uv',
        vendor: 'TuYa',
        description: 'Zigbee smart dimmer',
        supports: 'on/off, brightness',
        fromZigbee: [fz.tuya_dimmer, fz.ignore_basic_report],
        toZigbee: [tz.tuya_dimmer_state, tz.tuya_dimmer_level],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
    },
    {
        zigbeeModel: ['HY0017'],
        model: 'U86KCJ-ZP',
        vendor: 'TuYa',
        description: 'Smart 6 key scene wall switch',
        supports: 'action',
        fromZigbee: [fz.scenes_recall_scene_65029],
        toZigbee: [],
    },
    {
        zigbeeModel: ['q9mpfhw'],
        model: 'SNTZ009',
        vendor: 'TuYa',
        description: 'Water leak sensor',
        supports: 'water leak',
        fromZigbee: [fz.tuya_water_leak, fz.ignore_basic_report],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0004'],
        model: 'TS0004',
        vendor: 'TuYa',
        description: 'Smart light switch - 4 gang with neutral wire',
        supports: 'on/off',
        fromZigbee: [fz.ignore_basic_report, fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['HY0080'],
        model: 'U86KWF-ZPSJ',
        vendor: 'TuYa',
        description: 'Environment controller',
        supports: 'temperature, heating/cooling system control',
        fromZigbee: [fz.thermostat_att_report, fz.generic_fan_mode],
        toZigbee: [
            tz.factory_reset, tz.thermostat_local_temperature, tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint, tz.thermostat_unoccupied_cooling_setpoint,
            tz.thermostat_setpoint_raise_lower, tz.thermostat_remote_sensing,
            tz.thermostat_control_sequence_of_operation, tz.thermostat_system_mode, tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule, tz.thermostat_relay_status_log,
            tz.thermostat_temperature_setpoint_hold, tz.thermostat_temperature_setpoint_hold_duration, tz.fan_mode,
        ],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await bind(endpoint, coordinatorEndpoint, ['hvacThermostat', 'hvacFanCtrl']);
            await configureReporting.thermostatTemperature(endpoint);
            await configureReporting.thermostatSystemMode(endpoint);
            await configureReporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await configureReporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            await configureReporting.thermostatOccupiedCoolingSetpoint(endpoint);
            await configureReporting.thermostatUnoccupiedCoolingSetpoint(endpoint);
            await configureReporting.fanMode(endpoint);
        },
    },
    {
        zigbeeModel: ['6dfgetq'],
        model: 'D3-DPWK-TY',
        vendor: 'TuYa',
        description: 'HVAC controller',
        supports: 'temperature, heating/cooling system control, fan mode',
        fromZigbee: [fz.tuya_thermostat, fz.tuya_thermostat_on_set_data, fz.ignore_basic_report, fz.tuya_dimmer],
        meta: {tuyaThermostatSystemMode: common.TuyaThermostatSystemModes2},
        toZigbee: [
            tz.tuya_thermostat_current_heating_setpoint, tz.tuya_thermostat_system_mode,
            tz.tuya_thermostat_fan_mode, tz.tuya_dimmer_state,
        ],
    },

    // Neo
    {
        zigbeeModel: ['0yu2xgi'],
        model: 'NAS-AB02B0',
        vendor: 'Neo',
        description: 'Temperature & humidity sensor and alarm',
        supports: 'temperature, humidity, alarm',
        fromZigbee: [fz.neo_t_h_alarm, fz.ignore_basic_report],
        toZigbee: [tz.neo_t_h_alarm],
    },

    // Norklmes
    {
        zigbeeModel: ['qnazj70'],
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_nkjintbl'}],
        model: 'MKS-CM-W5',
        vendor: 'Norklmes',
        description: '1, 2, 3 or 4 gang switch',
        supports: 'on/off',
        fromZigbee: [fz.tuya_switch, fz.ignore_basic_report],
        toZigbee: [tz.tuya_switch_state],
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1, 'l3': 1, 'l4': 1};
        },
    },

    // Lonsonho
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_8vxj8khv'},
            {modelID: 'TS0601', manufacturerName: '_TZE200_7tdtqgwv'},
        ],
        model: 'X711A',
        vendor: 'Lonsonho',
        description: '1 gang switch',
        supports: 'on/off',
        fromZigbee: [fz.tuya_switch2, fz.ignore_time_read],
        toZigbee: [tz.tuya_switch_state],
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_dhdstcqc'}],
        model: 'X712A',
        vendor: 'Lonsonho',
        description: '2 gang switch',
        supports: 'on/off',
        fromZigbee: [fz.tuya_switch2, fz.ignore_time_read],
        toZigbee: [tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1};
        },
    },
    {
        fingerprint: [{modelID: 'TS0601', manufacturerName: '_TZE200_fqytfymk'}],
        model: 'X713A',
        vendor: 'Lonsonho',
        description: '3 gang switch',
        supports: 'on/off',
        fromZigbee: [fz.tuya_switch2, fz.ignore_time_read],
        toZigbee: [tz.tuya_switch_state],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            // Endpoint selection is made in tuya_switch_state
            return {'l1': 1, 'l2': 1, 'l3': 1};
        },
    },
    {
        fingerprint: [{modelID: 'TS110F', manufacturerName: '_TYZB01_qezuin6k'}],
        model: 'QS-Zigbee-D02-TRIAC-LN',
        vendor: 'Lonsonho',
        description: '1 gang smart dimmer switch module with neutral',
        extend: generic.light_onoff_brightness,
    },
    {
        fingerprint: [{modelID: 'TS110F', manufacturerName: '_TYZB01_v8gtiaed'}],
        model: 'QS-Zigbee-D02-TRIAC-2C-LN',
        vendor: 'Lonsonho',
        description: '2 gang smart dimmer switch module with neutral',
        extend: generic.light_onoff_brightness,
        meta: {multiEndpoint: true, configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await configureReporting.onOff(endpoint);
            const endpoint2 = device.getEndpoint(2);
            await bind(endpoint2, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await configureReporting.onOff(endpoint2);
        },
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
    },
    {
        zigbeeModel: ['Plug_01'],
        model: '4000116784070',
        vendor: 'Lonsonho',
        description: 'Smart plug EU',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS0003', manufacturerName: '_TYZB01_zsl6z0pw'}],
        model: 'QS-Zigbee-S04-2C-LN',
        vendor: 'Lonsonho',
        description: '2 gang switch module with neutral wire',
        supports: 'on/off',
        fromZigbee: [fz.ignore_basic_report, fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
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
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WS clear 950lm', 'TRADFRI bulb E26 WS clear 950lm'],
        model: 'LED1546G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 950 lumen, dimmable, white spectrum, clear',
        extend: generic.light_onoff_brightness_colortemp,
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 opal 1000lm', 'TRADFRI bulb E27 W opal 1000lm'],
        model: 'LED1623G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 1000 lumen, dimmable, opal white',
        extend: generic.light_onoff_brightness,
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['TRADFRI bulb GU10 WS 400lm'],
        model: 'LED1537R6/LED1739R5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 400 lumen, dimmable, white spectrum',
        extend: generic.light_onoff_brightness_colortemp,
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['TRADFRI bulb GU10 W 400lm'],
        model: 'LED1650R5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 400 lumen, dimmable',
        extend: generic.light_onoff_brightness,
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 WS opal 400lm', 'TRADFRI bulb E12 WS opal 400lm'],
        model: 'LED1536G5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E12/E14 400 lumen, dimmable, white spectrum, opal white',
        extend: generic.light_onoff_brightness_colortemp,
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 WS 470lm'],
        model: 'LED1903C5/LED1835C6',
        vendor: 'IKEA',
        description: 'TRADFRI bulb E14 WS 470 lumen, dimmable, white spectrum, opal white',
        extend: generic.light_onoff_brightness_colortemp,
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['TRADFRI bulb GU10 WW 400lm'],
        model: 'LED1837R5',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb GU10 400 lumen, dimmable',
        extend: generic.light_onoff_brightness,
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WW clear 250lm', 'TRADFRI bulb E26 WW clear 250lm'],
        model: 'LED1842G3',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 WW clear 250 lumen, dimmable',
        extend: generic.light_onoff_brightness,
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['TRADFRI bulb E14 WS opal 600lm'],
        model: 'LED1733G7',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E14 600 lumen, dimmable, white spectrum, opal white',
        extend: generic.light_onoff_brightness_colortemp,
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['TRADFRI bulb E26 opal 1000lm', 'TRADFRI bulb E26 W opal 1000lm'],
        model: 'LED1622G12',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26 1000 lumen, dimmable, opal white',
        extend: generic.light_onoff_brightness,
        ota: ota.tradfri,
    },
    {
        zigbeeModel: [
            'TRADFRI bulb E27 CWS opal 600lm',
            'TRADFRI bulb E26 CWS opal 600lm',
            'TRADFRI bulb E14 CWS opal 600lm',
            'TRADFRI bulb E12 CWS opal 600lm'],
        model: 'LED1624G9',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E14/E26/E27 600 lumen, dimmable, color, opal white',
        extend: generic.light_onoff_brightness_colorxy,
        ota: ota.tradfri,
        meta: {supportsHueAndSaturation: false},
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
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WS opal 1000lm', 'TRADFRI bulb E26 WS opal 1000lm'],
        model: 'LED1732G11',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E27 1000 lumen, dimmable, white spectrum, opal white',
        extend: generic.light_onoff_brightness_colortemp,
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WW 806lm', 'TRADFRI bulb E26 WW 806lm'],
        model: 'LED1836G9',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 806 lumen, dimmable, warm white',
        extend: generic.light_onoff_brightness,
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['TRADFRI bulb E27 WS clear 806lm', 'TRADFRI bulb E26 WS clear 806lm'],
        model: 'LED1736G9',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E26/E27 806 lumen, dimmable, white spectrum, clear',
        extend: generic.light_onoff_brightness_colortemp,
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['LEPTITER Recessed spot light'],
        model: 'T1820',
        vendor: 'IKEA',
        description: 'LEPTITER Recessed spot light, dimmable, white spectrum',
        extend: generic.light_onoff_brightness_colortemp,
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['TRADFRI wireless dimmer'],
        model: 'ICTC-G-1',
        vendor: 'IKEA',
        description: 'TRADFRI wireless dimmer',
        supports: 'brightness [0-255] (quick rotate for instant 0/255), action',
        fromZigbee: [
            fz.legacy_cmd_move, fz.legacy_cmd_move_with_onoff, fz.legacy_cmd_stop, fz.legacy_cmd_stop_with_onoff,
            fz.legacy_cmd_move_to_level_with_onoff, fz.battery_not_divided,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genLevelCtrl', 'genPowerCfg']);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['TRADFRI transformer 10W', 'TRADFRI Driver 10W'],
        model: 'ICPSHC24-10EU-IL-1',
        vendor: 'IKEA',
        description: 'TRADFRI driver for wireless control (10 watt)',
        extend: generic.light_onoff_brightness,
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['TRADFRI transformer 30W', 'TRADFRI Driver 30W'],
        model: 'ICPSHC24-30EU-IL-1',
        vendor: 'IKEA',
        description: 'TRADFRI driver for wireless control (30 watt)',
        extend: generic.light_onoff_brightness,
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['FLOALT panel WS 30x30'],
        model: 'L1527',
        vendor: 'IKEA',
        description: 'FLOALT LED light panel, dimmable, white spectrum (30x30 cm)',
        extend: generic.light_onoff_brightness_colortemp,
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['FLOALT panel WS 60x60'],
        model: 'L1529',
        vendor: 'IKEA',
        description: 'FLOALT LED light panel, dimmable, white spectrum (60x60 cm)',
        extend: generic.light_onoff_brightness_colortemp,
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['FLOALT panel WS 30x90'],
        model: 'L1528',
        vendor: 'IKEA',
        description: 'FLOALT LED light panel, dimmable, white spectrum (30x90 cm)',
        extend: generic.light_onoff_brightness_colortemp,
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['SURTE door WS 38x64'],
        model: 'L1531',
        vendor: 'IKEA',
        description: 'SURTE door light panel, dimmable, white spectrum (38x64 cm)',
        extend: generic.light_onoff_brightness_colortemp,
        ota: ota.tradfri,
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
        ota: ota.tradfri,
    },
    {
        zigbeeModel: ['TRADFRI remote control'],
        model: 'E1524/E1810',
        description: 'TRADFRI remote control',
        supports:
            'toggle, arrow left/right click/hold/release, brightness up/down click/hold/release',
        vendor: 'IKEA',
        fromZigbee: [
            fz.E1524_E1810_toggle, fz.E1524_E1810_arrow_click, fz.E1524_E1810_arrow_hold, fz.E1524_E1810_arrow_release,
            fz.E1524_E1810_brightness_up_click, fz.E1524_E1810_brightness_down_click, fz.E1524_E1810_brightness_up_hold,
            fz.E1524_E1810_brightness_up_release, fz.E1524_E1810_brightness_down_hold,
            fz.E1524_E1810_brightness_down_release, fz.battery_not_divided, fz.E1524_E1810_hold,
        ],
        toZigbee: [],
        ota: ota.tradfri,
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            // See explanation in E1743, only applies to E1810 (for E1524 it has no effect)
            // https://github.com/Koenkk/zigbee2mqtt/issues/2772#issuecomment-577389281
            await endpoint.bind('genOnOff', defaultBindGroup);
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
            fz.command_on, fz.legacy_genOnOff_cmdOn, fz.command_off, fz.legacy_genOnOff_cmdOff, fz.command_move,
            fz.legacy_E1743_brightness_up, fz.legacy_E1743_brightness_down, fz.command_stop,
            fz.legacy_E1743_brightness_stop, fz.battery_not_divided,
        ],
        toZigbee: [],
        ota: ota.tradfri,
        meta: {configureKey: 1, disableActionGroup: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            // By default this device controls group 0, some devices are by default in
            // group 0 causing the remote to control them.
            // By binding it to a random group, e.g. 901, it will send the commands to group 901 instead of 0
            // https://github.com/Koenkk/zigbee2mqtt/issues/2772#issuecomment-577389281
            await endpoint.bind('genOnOff', defaultBindGroup);
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
        fromZigbee: [fz.legacy_cmd_move, fz.legacy_cmd_stop, fz.legacy_E1744_play_pause, fz.legacy_E1744_skip, fz.battery_not_divided],
        toZigbee: [],
        ota: ota.tradfri,
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genLevelCtrl', 'genPowerCfg']);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['TRADFRI motion sensor'],
        model: 'E1525/E1745',
        vendor: 'IKEA',
        description: 'TRADFRI motion sensor',
        supports: 'occupancy',
        fromZigbee: [fz.battery_not_divided, fz.tradfri_occupancy, fz.E1745_requested_brightness],
        toZigbee: [],
        ota: ota.tradfri,
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
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        ota: ota.tradfri,
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const payload = [{attribute: 'modelId', minimumReportInterval: 3600, maximumReportInterval: 14400}];
            await bind(endpoint, coordinatorEndpoint, ['genBasic']);
            await endpoint.configureReporting('genBasic', payload);
        },
    },
    {
        zigbeeModel: ['FYRTUR block-out roller blind'],
        model: 'E1757',
        vendor: 'IKEA',
        description: 'FYRTUR roller blind',
        supports: 'open, close, stop, position',
        fromZigbee: [fz.cover_position_tilt, fz.battery_not_divided],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        meta: {configureKey: 2},
        ota: ota.tradfri,
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
        fromZigbee: [fz.cover_position_tilt, fz.battery_not_divided],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        meta: {configureKey: 2},
        ota: ota.tradfri,
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
        supports: 'click, action',
        fromZigbee: [
            fz.battery_not_divided, fz.command_cover_close, fz.legacy_cover_close, fz.command_cover_open, fz.legacy_cover_open,
            fz.command_cover_stop, fz.legacy_cover_stop,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        ota: ota.tradfri,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['GUNNARP panel round'],
        model: 'T1828',
        description: 'GUNNARP panel round',
        vendor: 'IKEA',
        ota: ota.tradfri,
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['GUNNARP panel 40*40'],
        model: 'T1829',
        description: 'GUNNARP panel 40*40',
        vendor: 'IKEA',
        ota: ota.tradfri,
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['TRADFRI bulb E12 WS opal 600lm'],
        model: 'LED1738G7',
        vendor: 'IKEA',
        description: 'TRADFRI LED bulb E12 600 lumen, dimmable, white spectrum, opal white',
        ota: ota.tradfri,
        extend: generic.light_onoff_brightness_colortemp,
    },

    // Philips
    {
        zigbeeModel: ['LTC002'],
        model: '4034031P7',
        vendor: 'Philips',
        description: 'Hue Fair',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTC012'],
        model: '3306431P7',
        vendor: 'Philips',
        description: 'Hue Struana',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1746130P7'],
        model: '1746130P7',
        vendor: 'Philips',
        description: 'Hue Attract',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1745630P7'],
        model: '1745630P7',
        vendor: 'Philips',
        description: 'Hue Nyro',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LDT001'],
        model: '5900131C5',
        vendor: 'Philips',
        description: 'Hue Aphelion downlight',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LLC012', 'LLC011'],
        model: '7299760PH',
        vendor: 'Philips',
        description: 'Hue Bloom',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCP001', 'LCP002', '4090331P9_01', '4090331P9_02'],
        model: '4090331P9',
        vendor: 'Philips',
        description: 'Hue Ensis',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LLC020'],
        model: '7146060PH',
        vendor: 'Philips',
        description: 'Hue Go',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWA005'],
        model: '9290022411',
        vendor: 'Philips',
        description: 'Hue white single filament bulb A19 E26 with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWE001'],
        model: '929002039801',
        vendor: 'Philips',
        description: 'Hue white E12 with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWA007'],
        model: '929002277501',
        vendor: 'Philips',
        description: 'Hue white A19 bulb E26 with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWA009'],
        model: '9290023349',
        vendor: 'Philips',
        description: 'Hue white A67 bulb E26 with Bluetooth (1600 Lumen)',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCT026'],
        model: '7602031P7',
        vendor: 'Philips',
        description: 'Hue Go with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCF002'],
        model: '8718696167991',
        vendor: 'Philips',
        description: 'Hue Calla outdoor',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCF005'],
        model: '8718696170557',
        vendor: 'Philips',
        description: 'Hue Calla outdoor',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1744130P7'],
        model: '1744130P7',
        vendor: 'Philips',
        description: 'Hue Econic outdoor Pedestal',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1743830P7'],
        model: '1743830P7',
        vendor: 'Philips',
        description: 'Hue Econic outdoor wall lamp',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1743130P7'],
        model: '1743130P7',
        vendor: 'Philips',
        description: 'Hue Impress outdoor Pedestal',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCC001'],
        model: '4090531P7',
        vendor: 'Philips',
        description: 'Hue Flourish white and color ambiance ceiling light',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCG002'],
        model: '929001953101',
        vendor: 'Philips',
        description: 'Hue White and Color Ambiance GU10',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWA003'],
        model: '9290022268',
        vendor: 'Philips',
        description: 'Hue White A19 bulb with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWA004'],
        model: '8718699688820',
        vendor: 'Philips',
        description: 'Hue Filament Standard A60/E27 bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCB001'],
        model: '548727',
        vendor: 'Philips',
        description: 'Hue White and Color Ambiance BR30 with bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWB004'],
        model: '433714',
        vendor: 'Philips',
        description: 'Hue Lux A19 bulb E27',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWB006', 'LWB014'],
        model: '9290011370',
        vendor: 'Philips',
        description: 'Hue white A60 bulb E27',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWA001'],
        model: '8718699673147',
        vendor: 'Philips',
        description: 'Hue white A60 bulb E27 bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWA002'],
        model: '9290018215',
        vendor: 'Philips',
        description: 'Hue white A19 bulb E26 bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTA001'],
        model: '9290022169',
        vendor: 'Philips',
        description: 'Hue white ambiance E27 with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCP003'],
        model: '4090631P7',
        vendor: 'Philips',
        description: 'Hue Flourish white and color ambiance pendant light',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWB010'],
        model: '8718696449691',
        vendor: 'Philips',
        description: 'Hue White Single bulb B22',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWG001'],
        model: '9290018195',
        vendor: 'Philips',
        description: 'Hue white GU10',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWG004'],
        model: 'LWG004',
        vendor: 'Philips',
        description: 'Hue white GU10 bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWO001'],
        model: '8718699688882',
        vendor: 'Philips',
        description: 'Hue white Filament bulb G93 E27 bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LST001'],
        model: '7299355PH',
        vendor: 'Philips',
        description: 'Hue white and color ambiance LightStrip',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LST002'],
        model: '915005106701',
        vendor: 'Philips',
        description: 'Hue white and color ambiance LightStrip plus',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LST003', 'LST004'],
        model: '9290018187B',
        vendor: 'Philips',
        description: 'Hue white and color ambiance LightStrip Outdoor',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCL001'],
        model: '8718699703424',
        vendor: 'Philips',
        description: 'Hue white and color ambiance LightStrip plus',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCA001', 'LCA002', 'LCA003'],
        model: '9290022166',
        vendor: 'Philips',
        description: 'Hue white and color ambiance E26/E27',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCT001', 'LCT007', 'LCT010', 'LCT012', 'LCT014', 'LCT015', 'LCT016', 'LCT021'],
        model: '9290012573A',
        vendor: 'Philips',
        description: 'Hue white and color ambiance E26/E27/E14',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCT002', 'LCT011'],
        model: '9290002579A',
        vendor: 'Philips',
        description: 'Hue white and color ambiance BR30',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCT003'],
        model: '8718696485880',
        vendor: 'Philips',
        description: 'Hue white and color ambiance GU10',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCT024'],
        model: '915005733701',
        vendor: 'Philips',
        description: 'Hue White and color ambiance Play Lightbar',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTW011', 'LTB002'],
        model: '464800',
        vendor: 'Philips',
        description: 'Hue white ambiance BR30 flood light',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTW012'],
        model: '8718696695203',
        vendor: 'Philips',
        description: 'Hue white ambiance E14',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWE002'],
        model: '9290020399',
        vendor: 'Philips',
        description: 'Hue white E14',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTW013'],
        model: '8718696598283',
        vendor: 'Philips',
        description: 'Hue white ambiance GU10',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTG002'],
        model: '929001953301',
        vendor: 'Philips',
        description: 'Hue white ambiance GU10 with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTG001'],
        model: '9290019534',
        vendor: 'Philips',
        description: 'Hue white ambiance GU10 with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTW015'],
        model: '9290011998B',
        vendor: 'Philips',
        description: 'Hue white ambiance E26',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTA002'],
        model: '9290022167',
        vendor: 'Philips',
        description: 'Hue white ambiance E26 with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTA003'],
        model: '9290022267',
        vendor: 'Philips',
        description: 'Hue white ambiance E26 with Bluetooth',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTW010', 'LTW001', 'LTW004'],
        model: '8718696548738',
        vendor: 'Philips',
        description: 'Hue white ambiance E26/E27',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTW017'],
        model: '915005587401',
        vendor: 'Philips',
        description: 'Hue white ambiance Adore light',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['3402831P7'],
        model: '3402831P7',
        vendor: 'Philips',
        description: 'Hue white ambiance bathroom mirror light Adore',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTC021'],
        model: '3435011P7',
        vendor: 'Philips',
        description: 'Hue white ambiance bathroom ceiling light Adore',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTD003'],
        model: '4503848C5',
        vendor: 'Philips',
        description: 'Hue white ambiance Muscari pendant light',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTD010'],
        model: '5996411U5',
        vendor: 'Philips',
        description: 'Hue white ambiance 5/6" retrofit recessed downlight',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCW001'],
        model: '4090130P7',
        vendor: 'Philips',
        description: 'Hue Sana',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTC001'],
        model: '3261030P7',
        vendor: 'Philips',
        description: 'Hue Being',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTP008'],
        model: '4098430P7',
        vendor: 'Philips',
        description: 'Hue Being Pendant',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTC003'],
        model: '3261331P7',
        vendor: 'Philips',
        description: 'Hue white ambiance Still',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTC011'],
        model: '4096730U7',
        vendor: 'Philips',
        description: 'Hue Cher ceiling light',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTC013'],
        model: '3216131P5',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle square panel light',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['3216131P6'],
        model: '3216131P6',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle square panel light',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTC015'],
        model: '3216331P5',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle rectangle panel light',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTC016'],
        model: '3216431P5',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle round panel light',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTP003', 'LTP001'],
        model: '4033930P7',
        vendor: 'Philips',
        description: 'Hue white ambiance suspension Fair',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTP002'],
        model: '4023330P7',
        vendor: 'Philips',
        description: 'Hue white ambiance suspension Amaze',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWF002', 'LWW001'],
        model: '9290011370B',
        vendor: 'Philips',
        description: 'Hue white A60 bulb E27',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWB015'],
        model: '046677476816',
        vendor: 'Philips',
        description: 'Hue white PAR38 outdoor',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LLC010'],
        model: '7199960PH',
        vendor: 'Philips',
        description: 'Hue Iris',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1742930P7'],
        model: '1742930P7',
        vendor: 'Philips',
        description: 'Hue outdoor Impress wall lamp',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1743030P7'],
        model: '1743030P7',
        vendor: 'Philips',
        description: 'Hue outdoor Impress wall lamp',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1743230P7'],
        model: '1743230P7',
        vendor: 'Philips',
        description: 'Hue outdoor Impress lantern',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['1746430P7'],
        model: '1746430P7',
        vendor: 'Philips',
        description: 'Hue outdoor Resonate wall lamp',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LLC006'],
        model: '7099930PH',
        vendor: 'Philips',
        description: 'Hue Iris (Generation 2)',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['4080248P9'],
        model: '4080248P9',
        vendor: 'Philips',
        description: 'Hue Signe floor light',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['4080148P9'],
        model: '4080148P9',
        vendor: 'Philips',
        description: 'Hue Signe table light',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5062131P7'],
        model: '5062131P7',
        vendor: 'Philips',
        description: 'Hue white and color ambience Argenta spot (1 spot)',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5062231P7'],
        model: '5062231P7',
        vendor: 'Philips',
        description: 'Hue white and color ambience Argenta spot (2 spots)',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5062331P7'],
        model: '5062331P7',
        vendor: 'Philips',
        description: 'Hue white and color ambience Argenta spot (3 spots)',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5062431P7'],
        model: '5062431P7',
        vendor: 'Philips',
        description: 'Hue white and color ambience Argenta spot (4 spots)',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['5045148P7'],
        model: '5045148P7',
        vendor: 'Philips',
        description: 'Hue Centura',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
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
            fz.battery,
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
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['ROM001'],
        model: '8718699693985',
        vendor: 'Philips',
        description: 'Hue smart button',
        supports: 'action',
        fromZigbee: [fz.command_on, fz.command_off_with_effect, fz.SmartButton_skip, fz.SmartButton_event, fz.battery],
        toZigbee: [],
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);

            const options = {manufacturerCode: 0x100B, disableDefaultResponse: true};
            await endpoint.write('genBasic', {0x0031: {value: 0x000B, type: 0x19}}, options);
            await bind(endpoint, coordinatorEndpoint, ['manuSpecificPhilips', 'genPowerCfg']);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SML001'],
        model: '9290012607',
        vendor: 'Philips',
        description: 'Hue motion sensor',
        supports: 'occupancy, temperature, illuminance',
        fromZigbee: [
            fz.battery, fz.occupancy, fz.temperature, fz.occupancy_timeout, fz.illuminance,
            fz.ignore_basic_report, fz.hue_motion_sensitivity,
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
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['SML002'],
        model: '9290019758',
        vendor: 'Philips',
        description: 'Hue motion outdoor sensor',
        supports: 'occupancy, temperature, illuminance',
        fromZigbee: [
            fz.battery, fz.occupancy, fz.temperature, fz.illuminance, fz.occupancy_timeout,
            fz.hue_motion_sensitivity,
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
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LOM001'],
        model: '929002240401',
        vendor: 'Philips',
        description: 'Hue smart plug - EU',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off].concat(tzHuePowerOnBehavior),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LOM002'],
        model: '046677552343',
        vendor: 'Philips',
        description: 'Hue smart plug bluetooth',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off].concat(tzHuePowerOnBehavior),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LOM005'],
        model: '9290022408',
        vendor: 'Philips',
        description: 'Hue smart plug - AU',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off].concat(tzHuePowerOnBehavior),
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LLC014'],
        model: '7099860PH',
        vendor: 'Philips',
        description: 'LivingColors Aura',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LTC014'],
        model: '3216231P5',
        vendor: 'Philips',
        description: 'Hue white ambiance Aurelle rectangle panel light',
        ota: ota.zigbeeOTA,
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['1744530P7', '1744630P7', '1744430P7', '1744730P7'],
        model: '8718696170625',
        vendor: 'Philips',
        description: 'Hue Fuzo outdoor wall light',
        ota: ota.zigbeeOTA,
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness,
    },
    {
        zigbeeModel: ['1743630P7', '1743630V7'],
        model: '17436/30/P7',
        vendor: 'Philips',
        description: 'Hue Welcome white flood light',
        ota: ota.zigbeeOTA,
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness,
    },
    {
        zigbeeModel: ['1743530P7', '1743530V7'],
        model: '17435/30/P7',
        vendor: 'Philips',
        description: 'Hue Discover white and color ambiance flood light',
        ota: ota.zigbeeOTA,
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colorxy,
    },
    {
        zigbeeModel: ['1746330P7'],
        model: '1746330P7',
        vendor: 'Philips',
        description: 'Hue Appear outdoor wall light',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCS001'],
        model: '1741830P7',
        vendor: 'Philips',
        description: 'Hue Lily outdoor spot light',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LCL003'],
        model: '9290022891',
        vendor: 'Philips',
        description: 'Hue Lily outdoor led strip',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LWV001'],
        model: '929002241201',
        vendor: 'Philips',
        description: 'Hue white filament Edison E27 LED',
        ota: ota.zigbeeOTA,
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness,
    },
    {
        zigbeeModel: ['LWV002'],
        model: '046677551780',
        vendor: 'Philips',
        description: 'Hue white filament Edison ST19 LED',
        ota: ota.zigbeeOTA,
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness,
    },
    {
        zigbeeModel: ['HML004'],
        model: '3115331PH',
        vendor: 'Philips',
        description: 'Phoenix light',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['LLM001'],
        model: '7121131PU',
        vendor: 'Philips',
        description: 'Hue Beyond white and color ambiance suspension light',
        meta: {turnsOffAtBrightness1: true},
        extend: hue.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
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
        fromZigbee: [fz.on_off, fz.metering_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(85);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await configureReporting.onOff(endpoint);
            await readMeteringPowerConverterAttributes(endpoint);
            await configureReporting.instantaneousDemand(endpoint);
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
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(85);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
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
        fromZigbee: [fz.CC2530ROUTER_led, fz.CC2530ROUTER_meta, fz.ignore_basic_report],
        toZigbee: [tz.ptvo_switch_trigger],
    },
    {
        zigbeeModel: ['ptvo.switch'],
        model: 'ptvo.switch',
        vendor: 'Custom devices (DiY)',
        description: '[Multi-channel relay switch](https://ptvo.info/zigbee-switch-configurable-firmware-router-199/)',
        supports: 'hold, single, double and triple click, on/off, type, rssi',
        fromZigbee: [
            fz.ptvo_switch_state, fz.ptvo_multistate_action, fz.legacy_ptvo_switch_buttons, fz.ptvo_switch_uart,
            fz.ptvo_switch_analog_input, fz.ptvo_switch_level_control, fz.ignore_basic_report,
        ],
        toZigbee: [tz.ptvo_switch_trigger, tz.ptvo_switch_uart, tz.ptvo_switch_analog_input,
            tz.ptvo_switch_light_brightness, tz.on_off,
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {
                'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4, 'l5': 5, 'l6': 6, 'l7': 7, 'l8': 8,
                'action': 1,
            };
        },
    },
    {
        zigbeeModel: ['DNCKAT_D001'],
        model: 'DNCKATSD001',
        vendor: 'Custom devices (DiY)',
        description: '[DNCKAT single key wired wall dimmable light switch](https://github.com/dzungpv/dnckatsw00x/)',
        extend: generic.light_onoff_brightness,
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
        description: '[Matts Wall Switch Remote](https://github.com/mattlokes/ZWallRemote)',
        supports: 'on/off',
        fromZigbee: [fz.command_toggle],
        toZigbee: [],
    },

    // databyte.ch
    {
        zigbeeModel: ['DTB190502A1'],
        model: 'DTB190502A1',
        vendor: 'databyte.ch',
        description: '[CC2530 based IO Board](https://databyte.ch/?portfolio=zigbee-erstes-board-dtb190502a)',
        supports: 'switch, buttons',
        fromZigbee: [fz.DTB190502A1_parse],
        toZigbee: [tz.DTB190502A1_LED],
    },
    {
        zigbeeModel: ['DTB-ED2004-012'],
        model: 'ED2004-012',
        vendor: 'databyte.ch',
        description: 'Panda 1 - wall switch (https://databyte.ch/?post_type=portfolio&p=1818)',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
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
        zigbeeModel: ['DIYRuZ_rspm'],
        model: 'DIYRuZ_rspm',
        vendor: 'DIYRuZ',
        description: '[DIYRuZ relay switch power meter](https://modkam.ru/?p=1309)',
        supports: 'relay, switch, adc',
        fromZigbee: [fz.diyruz_rspm],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['DIYRuZ_FreePad'],
        model: 'DIYRuZ_FreePad',
        vendor: 'DIYRuZ',
        description: '[DiY 8/12/20 button keypad](http://modkam.ru/?p=1114)',
        supports: 'single, double, triple, quadruple, many, hold/release',
        fromZigbee: [fz.diyruz_freepad_clicks, fz.battery],
        toZigbee: [tz.diyruz_freepad_on_off_config, tz.factory_reset],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            if (device.applicationVersion < 3) { // Legacy PM2 firmwares
                const payload = [{
                    attribute: 'batteryPercentageRemaining',
                    minimumReportInterval: 0,
                    maximumReportInterval: 3600,
                    reportableChange: 0,
                }, {
                    attribute: 'batteryVoltage',
                    minimumReportInterval: 0,
                    maximumReportInterval: 3600,
                    reportableChange: 0,
                }];
                await endpoint.configureReporting('genPowerCfg', payload);
            }
            device.endpoints.forEach(async (ep) => {
                if (ep.outputClusters.includes(18)) {
                    await bind(ep, coordinatorEndpoint, ['genMultistateInput']);
                }
            });
        },
        endpoint: (device) => {
            return {
                button_1: 1, button_2: 2, button_3: 3, button_4: 4, button_5: 5,
                button_6: 6, button_7: 7, button_8: 8, button_9: 9, button_10: 10,
                button_11: 11, button_12: 12, button_13: 13, button_14: 14, button_15: 15,
                button_16: 16, button_17: 17, button_18: 18, button_19: 19, button_20: 20,
            };
        },
    },
    {
        zigbeeModel: ['DIYRuZ_Geiger'],
        model: 'DIYRuZ_Geiger',
        vendor: 'DIYRuZ',
        description: '[DiY Geiger counter](https://modkam.ru/?p=1591)',
        supports: 'radioactive pulses perminute',
        fromZigbee: [fz.diyruz_geiger, fz.command_on, fz.command_off],
        toZigbee: [tz.diyruz_geiger_config, tz.factory_reset],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msIlluminanceMeasurement', 'genOnOff']);

            const payload = [{
                attribute: {
                    ID: 0xF001,
                    type: 0x21,
                },
                minimumReportInterval: 0,
                maximumReportInterval: repInterval.MINUTE,
                reportableChange: 0,
            },
            {
                attribute: {
                    ID: 0xF002,
                    type: 0x23,
                },
                minimumReportInterval: 0,
                maximumReportInterval: repInterval.MINUTE,
                reportableChange: 0,
            }];
            await endpoint.configureReporting('msIlluminanceMeasurement', payload);
        },
    },
    {
        zigbeeModel: ['DIYRuZ_R8_8'],
        model: 'DIYRuZ_R8_8',
        vendor: 'DIYRuZ',
        description: '[DiY 8 Relays + 8 switches](https://modkam.ru/?p=1638)',
        supports: 'on/off',
        fromZigbee: [
            fz.ptvo_switch_state, fz.ptvo_multistate_action, fz.legacy_ptvo_switch_buttons, fz.ignore_basic_report,
        ],
        toZigbee: [tz.on_off],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {
                'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4, 'l5': 5, 'l6': 6, 'l7': 7, 'l8': 8,
            };
        },
    },
    {
        zigbeeModel: ['DIYRuZ_RT'],
        model: 'DIYRuZ_RT',
        vendor: 'DIYRuZ',
        description: '[DiY CC2530 Zigbee 3.0 firmware](https://habr.com/ru/company/iobroker/blog/495926/)',
        supports: 'on/off, temperature',
        fromZigbee: [fz.on_off, fz.temperature],
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
            fz.legacy_battery_voltage,
            fz.thermostat_att_report,
        ],
        toZigbee: [
            tz.factory_reset, tz.thermostat_local_temperature, tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint, tz.thermostat_setpoint_raise_lower,
            tz.thermostat_remote_sensing, tz.thermostat_control_sequence_of_operation, tz.thermostat_system_mode,
            tz.thermostat_weekly_schedule, tz.thermostat_clear_weekly_schedule, tz.thermostat_relay_status_log,
            tz.thermostat_pi_heating_demand, tz.thermostat_running_state,
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

    // M-ELEC - https://melec.com.au/stitchy/
    {
        zigbeeModel: ['ML-ST-D200'],
        model: 'ML-ST-D200',
        vendor: 'M-ELEC',
        description: 'Stitchy Dim switchable wall module',
        extend: generic.light_onoff_brightness,
    },

    // OSRAM
    {
        zigbeeModel: ['Gardenspot RGB'],
        model: '73699',
        vendor: 'OSRAM',
        description: ' Gardenspot LED mini RGB',
        extend: ledvance.light_onoff_brightness_colorxy,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Outdoor Lantern W RGBW OSRAM'],
        model: '4058075816718',
        vendor: 'OSRAM',
        description: 'SMART+ outdoor wall lantern RGBW',
        extend: ledvance.light_onoff_brightness_colortemp_colorxy,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Outdoor Lantern B50 RGBW OSRAM'],
        model: '4058075816732',
        vendor: 'OSRAM',
        description: 'SMART+ outdoor lantern RGBW',
        extend: ledvance.light_onoff_brightness_colortemp_colorxy,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Classic A60 RGBW'],
        model: 'AA69697',
        vendor: 'OSRAM',
        description: 'Classic A60 RGBW',
        extend: ledvance.light_onoff_brightness_colortemp_colorxy,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A60 TW Z3'],
        model: 'AC10787',
        vendor: 'OSRAM',
        description: 'SMART+ classic E27 TW',
        extend: ledvance.light_onoff_brightness_colortemp,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['CLA60 RGBW OSRAM'],
        model: 'AC03645',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED CLA60 E27 RGBW',
        extend: ledvance.light_onoff_brightness_colortemp_colorxy,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['CLA60 TW OSRAM'],
        model: 'AC03642',
        vendor: 'OSRAM',
        description: 'SMART+ CLASSIC A 60 TW',
        extend: ledvance.light_onoff_brightness_colortemp,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR16 DIM Z3'],
        model: 'AC08560',
        vendor: 'OSRAM',
        description: 'SMART+ LED PAR16 GU10',
        extend: ledvance.light_onoff_brightness,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A60 DIM Z3'],
        model: 'AC10786-DIM',
        vendor: 'OSRAM',
        description: 'SMART+ classic E27 dimmable',
        extend: ledvance.light_onoff_brightness,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['CLA60 RGBW Z3'],
        model: 'AC03647',
        vendor: 'OSRAM',
        description: 'SMART+ LED CLASSIC E27 RGBW',
        extend: ledvance.light_onoff_brightness_colortemp_colorxy,
        ota: ota.ledvance,
    },
    {
        // AA70155 is model number of both bulbs.
        zigbeeModel: ['LIGHTIFY A19 Tunable White', 'Classic A60 TW'],
        model: 'AA70155',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED A19 tunable white / Classic A60 TW',
        extend: ledvance.light_onoff_brightness_colortemp,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR16 50 TW'],
        model: 'AA68199',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED PAR16 50 GU10 tunable white',
        extend: ledvance.light_onoff_brightness_colortemp,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR16 TW Z3'],
        model: '4058075148338',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED PAR16 50 GU10 tunable white',
        extend: ledvance.light_onoff_brightness_colortemp,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Classic B40 TW - LIGHTIFY'],
        model: 'AB32840',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED Classic B40 tunable white',
        extend: ledvance.light_onoff_brightness_colortemp,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Ceiling TW OSRAM'],
        model: '4058075816794',
        vendor: 'OSRAM',
        description: 'Smart+ Ceiling TW',
        extend: ledvance.light_onoff_brightness_colortemp,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Classic A60 W clear - LIGHTIFY'],
        model: 'AC03641',
        vendor: 'OSRAM',
        description: 'LIGHTIFY LED Classic A60 clear',
        extend: ledvance.light_onoff_brightness,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Surface Light W �C LIGHTIFY'],
        model: '4052899926158',
        vendor: 'OSRAM',
        description: 'LIGHTIFY Surface Light TW',
        extend: ledvance.light_onoff_brightness,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Surface Light TW'],
        model: 'AB401130055',
        vendor: 'OSRAM',
        description: 'LIGHTIFY Surface Light LED Tunable White',
        extend: ledvance.light_onoff_brightness_colortemp,
        ota: ota.ledvance,
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
        ota: ota.ledvance,
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
        ota: ota.ledvance,
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
        extend: ledvance.light_onoff_brightness_colortemp_colorxy,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LIGHTIFY Outdoor Flex RGBW', 'LIGHTIFY FLEX OUTDOOR RGBW', 'Flex Outdoor RGBW'],
        model: '4058075036185',
        vendor: 'OSRAM',
        description: 'Outdoor Flex RGBW',
        extend: ledvance.light_onoff_brightness_colortemp_colorxy,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Gardenpole RGBW-Lightify'],
        model: '4058075036147',
        vendor: 'OSRAM',
        description: 'Smart+ gardenpole 8.7W RGBW',
        extend: ledvance.light_onoff_brightness_colortemp_colorxy,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Gardenpole RGBW Z3'],
        model: '4058075047853',
        vendor: 'OSRAM',
        description: 'Smart+ gardenpole 4W RGBW',
        extend: ledvance.light_onoff_brightness_colortemp_colorxy,
        meta: {disableDefaultResponse: true},
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Gardenpole Mini RGBW OSRAM'],
        model: 'AC0363900NJ',
        vendor: 'OSRAM',
        description: 'Smart+ mini gardenpole RGBW',
        extend: ledvance.light_onoff_brightness_colortemp_colorxy,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Gardenspot W'],
        model: '4052899926127',
        vendor: 'OSRAM',
        description: 'Lightify mini gardenspot WT',
        extend: ledvance.light_onoff_brightness,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR 16 50 RGBW - LIGHTIFY'],
        model: 'AB35996',
        vendor: 'OSRAM',
        description: 'Smart+ Spot GU10 Multicolor',
        extend: ledvance.light_onoff_brightness_colortemp_colorxy,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR16 RGBW Z3'],
        model: 'AC08559',
        vendor: 'OSRAM',
        description: 'SMART+ Spot GU10 Multicolor',
        extend: ledvance.light_onoff_brightness_colortemp_colorxy,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['B40 DIM Z3'],
        model: 'AC08562',
        vendor: 'OSRAM',
        description: 'SMART+ Candle E14 Dimmable White',
        extend: ledvance.light_onoff_brightness,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Motion Sensor-A'],
        model: 'AC01353010G',
        vendor: 'OSRAM',
        description: 'SMART+ Motion Sensor',
        supports: 'occupancy, tamper and temperature',
        fromZigbee: [fz.temperature, fz.ias_occupancy_alarm_2, fz.ignore_basic_report],
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
        zigbeeModel: ['MR16 TW OSRAM'],
        model: 'AC03648',
        vendor: 'OSRAM',
        description: 'SMART+ spot GU5.3 tunable white',
        extend: ledvance.light_onoff_brightness_colortemp,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Lightify Switch Mini', 'Lightify Switch Mini blue'],
        model: 'AC0251100NJ/AC0251700NJ',
        vendor: 'OSRAM',
        description: 'Smart+ switch mini',
        supports: 'circle, up, down and hold/release',
        fromZigbee: [
            fz.osram_lightify_switch_cmdOn, fz.osram_lightify_switch_cmdMoveWithOnOff,
            fz.osram_lightify_switch_AC0251100NJ_cmdStop, fz.osram_lightify_switch_cmdMoveToColorTemp,
            fz.osram_lightify_switch_cmdMoveHue, fz.osram_lightify_switch_cmdMoveToSaturation,
            fz.osram_lightify_switch_cmdOff, fz.osram_lightify_switch_cmdMove, fz.battery_3V,
            fz.osram_lightify_switch_cmdMoveToLevelWithOnOff,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        ota: ota.ledvance,
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
        zigbeeModel: ['Switch 4x EU-LIGHTIFY'],
        model: '4058075816459',
        vendor: 'OSRAM',
        description: 'Smart+ switch',
        supports: 'action',
        fromZigbee: [
            fz.osram_lightify_switch_AB371860355_cmdOn,
            fz.osram_lightify_switch_AB371860355_cmdOff,
            fz.osram_lightify_switch_AB371860355_cmdStepColorTemp,
            fz.osram_lightify_switch_AB371860355_cmdMoveWithOnOff,
            fz.osram_lightify_switch_AB371860355_cmdMove,
            fz.osram_lightify_switch_AB371860355_cmdStop,
            fz.osram_lightify_switch_AB371860355_cmdMoveHue,
            fz.osram_lightify_switch_AB371860355_cmdMoveSat,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        ota: ota.ledvance,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            const endpoint3 = device.getEndpoint(3);
            const endpoint4 = device.getEndpoint(4);
            await bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genPowerCfg']);
            await bind(endpoint2, coordinatorEndpoint, ['genLevelCtrl', 'lightingColorCtrl']);
            await bind(endpoint3, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await bind(endpoint4, coordinatorEndpoint, ['genLevelCtrl', 'lightingColorCtrl']);
            await configureReporting.batteryVoltage(endpoint1);
        },
    },
    {
        zigbeeModel: ['SubstiTube', 'Connected Tube Z3'],
        model: 'ST8AU-CON',
        vendor: 'OSRAM',
        description: 'OSRAM SubstiTUBE T8 Advanced UO Connected',
        extend: ledvance.light_onoff_brightness,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Panel TW 595 UGR22'],
        model: '595UGR22',
        vendor: 'OSRAM',
        description: 'OSRAM LED panel TW 595 UGR22',
        extend: ledvance.light_onoff_brightness_colortemp,
        ota: ota.ledvance,
    },

    // Gewiss
    {
        zigbeeModel: ['GWA1521_Actuator_1_CH_PF'],
        model: 'GWA1521',
        description: 'Switch actuator 1 channel with input',
        supports: 'on/off',
        vendor: 'Gewiss',
        fromZigbee: [fz.on_off, fz.ignore_genOta],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['GWA1522_Actuator_2_CH'],
        model: 'GWA1522',
        description: 'Switch actuator 2 channels with input',
        supports: 'on/off',
        vendor: 'Gewiss',
        toZigbee: [tz.on_off],
        fromZigbee: [fz.on_off],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
    },
    {
        zigbeeModel: ['GWA1531_Shutter'],
        model: 'GWA1531',
        description: 'Shutter actuator',
        supports: 'on/off',
        vendor: 'Gewiss',
        fromZigbee: [fz.cover_position_tilt, fz.ignore_basic_report],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genLevelCtrl']);
            await configureReporting.brightness(endpoint);
        },
    },

    // Ledvance
    {
        zigbeeModel: ['Panel TW Z3'],
        model: '4058075181472',
        vendor: 'LEDVANCE',
        description: 'SMART+ panel 60 x 60cm tunable white',
        extend: ledvance.light_onoff_brightness_colortemp,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['B40 TW Z3'],
        model: '4058075208414',
        vendor: 'LEDVANCE',
        description: 'SMART+ candle E14 tunable white',
        extend: ledvance.light_onoff_brightness_colortemp,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['FLEX RGBW Z3'],
        model: '4058075208339',
        vendor: 'LEDVANCE',
        description: 'Flex 3P multicolor',
        extend: ledvance.light_onoff_brightness_colortemp_colorxy,
        ota: ota.ledvance,
    },

    // Hive
    {
        zigbeeModel: ['MOT003'],
        model: 'MOT003',
        vendor: 'Hive',
        description: 'Motion sensor',
        supports: 'occupancy, temperature, battery',
        fromZigbee: [
            fz.temperature, fz.ias_occupancy_alarm_1_with_timeout, fz.battery, fz.ignore_basic_report,
            fz.ignore_iaszone_statuschange, fz.ignore_iaszone_attreport,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(6);
            const binds = ['msTemperatureMeasurement', 'genPowerCfg'];
            await bind(endpoint, coordinatorEndpoint, binds);
            await configureReporting.temperature(endpoint);
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['DWS003'],
        model: 'DWS003',
        vendor: 'Hive',
        description: 'Contact sensor',
        supports: 'contact, temperature, battery',
        fromZigbee: [
            fz.temperature, fz.ias_contact_alarm_1, fz.battery,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(6);
            const binds = ['msTemperatureMeasurement', 'genPowerCfg'];
            await bind(endpoint, coordinatorEndpoint, binds);
            await configureReporting.temperature(endpoint);
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['FWBulb01'],
        model: 'HALIGHTDIMWWE27',
        vendor: 'Hive',
        description: 'Active smart bulb white LED (E27)',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['FWCLBulb01UK'],
        model: 'HALIGHTDIMWWE14',
        vendor: 'Hive',
        description: 'Active smart bulb white LED (E14)',
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
        zigbeeModel: ['SLP2', 'SLP2b', 'SLP2c'],
        model: '1613V',
        vendor: 'Hive',
        description: 'Active plug',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.metering_power, fz.temperature],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await configureReporting.onOff(endpoint);
            await readMeteringPowerConverterAttributes(endpoint);
            await configureReporting.instantaneousDemand(endpoint);
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
    {
        zigbeeModel: ['TRV001'],
        model: 'UK7004240',
        vendor: 'Hive',
        description: 'Radiator valve',
        supports: 'temperature',
        fromZigbee: [fz.thermostat_att_report, fz.battery],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_local_temperature_calibration,
            tz.thermostat_setpoint_raise_lower, tz.thermostat_remote_sensing,
            tz.thermostat_system_mode, tz.thermostat_running_state,
        ],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, [
                'genBasic', 'genPowerCfg', 'genIdentify', 'genTime', 'genPollCtrl', 'hvacThermostat',
                'hvacUserInterfaceCfg',
            ]);
            await configureReporting.thermostatTemperature(endpoint);
            await configureReporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await configureReporting.thermostatPIHeatingDemand(endpoint);
        },
    },
    {
        zigbeeModel: ['SLR1b'],
        model: 'SLR1b',
        vendor: 'Hive',
        description: 'Heating thermostat',
        supports: 'thermostat, occupied heating, weekly schedule',
        fromZigbee: [fz.thermostat_att_report, fz.thermostat_weekly_schedule_rsp],
        toZigbee: [
            tz.thermostat_local_temperature, tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_control_sequence_of_operation,
            tz.thermostat_weekly_schedule, tz.thermostat_clear_weekly_schedule,
            tz.thermostat_temperature_setpoint_hold, tz.thermostat_temperature_setpoint_hold_duration,
        ],
        meta: {configureKey: 1, disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(5);
            const binds = [
                'genBasic', 'genIdentify', 'genAlarms', 'genTime', 'hvacThermostat',
            ];
            await bind(endpoint, coordinatorEndpoint, binds);
            await configureReporting.thermostatTemperature(endpoint, {min: 0, max: repInterval.HOUR, change: 1});
            await configureReporting.thermostatRunningState(endpoint);
            await configureReporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await configureReporting.thermostatTemperatureSetpointHold(endpoint);
            await configureReporting.thermostatTemperatureSetpointHoldDuration(endpoint);
        },
    },
    {
        zigbeeModel: ['WPT1'],
        model: 'WPT1',
        vendor: 'Hive',
        description: 'Heating thermostat remote control',
        supports: 'none, communicate via thermostat',
        fromZigbee: [],
        toZigbee: [],
    },
    {
        zigbeeModel: ['SLT2'],
        model: 'SLT2',
        vendor: 'Hive',
        description: 'Heating thermostat remote control',
        supports: 'nothing, communicate via thermostat',
        fromZigbee: [],
        toZigbee: [],
    },
    {
        zigbeeModel: ['SLB2'],
        model: 'SLB2',
        vendor: 'Hive',
        description: 'Signal booster',
        toZigbee: [],
        supports: 'linkquality',
        fromZigbee: [fz.linkquality_from_basic],
        onEvent: async (type, data, device) => {
            if (type === 'stop') {
                clearInterval(store[device.ieeeAddr]);
            } else if (!store[device.ieeeAddr]) {
                store[device.ieeeAddr] = setInterval(async () => {
                    try {
                        await device.endpoints[0].read('genBasic', ['zclVersion']);
                    } catch (error) {
                        // Do nothing
                    }
                }, 1000 * 60 * 30); // Every 30 minutes
            }
        },
    },

    // Innr
    {
        zigbeeModel: ['FL 130 C'],
        model: 'FL 130 C',
        vendor: 'Innr',
        description: 'Color Flex LED strip',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['FL 120 C'],
        model: 'FL 120 C',
        vendor: 'Innr',
        description: 'Color Flex LED strip',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['BF 263'],
        model: 'BF 263',
        vendor: 'Innr',
        description: 'B22 filament bulb dimmable',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 185 C'],
        model: 'RB 185 C',
        vendor: 'Innr',
        description: 'E27 bulb RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['BY 185 C'],
        model: 'BY 185 C',
        vendor: 'Innr',
        description: 'B22 bulb RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 250 C'],
        model: 'RB 250 C',
        vendor: 'Innr',
        description: 'E14 bulb RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
        meta: {enhancedHue: false, applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 265'],
        model: 'RB 265',
        vendor: 'Innr',
        description: 'E27 bulb',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RF 265'],
        model: 'RF 265',
        vendor: 'Innr',
        description: 'E27 bulb filament clear',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 278 T'],
        model: 'RB 278 T',
        vendor: 'Innr',
        description: 'Smart bulb tunable white E27',
        extend: generic.light_onoff_brightness_colortemp,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 285 C'],
        model: 'RB 285 C',
        vendor: 'Innr',
        description: 'E27 bulb RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['BY 285 C'],
        model: 'BY 285 C',
        vendor: 'Innr',
        description: 'B22 bulb RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 165'],
        model: 'RB 165',
        vendor: 'Innr',
        description: 'E27 bulb',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 162'],
        model: 'RB 162',
        vendor: 'Innr',
        description: 'E27 bulb',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 175 W'],
        model: 'RB 175 W',
        vendor: 'Innr',
        description: 'E27 bulb warm dimming',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 178 T'],
        model: 'RB 178 T',
        vendor: 'Innr',
        description: 'Smart bulb tunable white E27',
        extend: generic.light_onoff_brightness_colortemp,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['BY 178 T'],
        model: 'BY 178 T',
        vendor: 'Innr',
        description: 'Smart bulb tunable white B22',
        extend: generic.light_onoff_brightness_colortemp,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 122'],
        model: 'RS 122',
        vendor: 'Innr',
        description: 'GU10 spot',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 125'],
        model: 'RS 125',
        vendor: 'Innr',
        description: 'GU10 spot',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 225'],
        model: 'RS 225',
        vendor: 'Innr',
        description: 'GU10 Spot',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 128 T'],
        model: 'RS 128 T',
        vendor: 'Innr',
        description: 'GU10 spot 350 lm, dimmable, white spectrum',
        extend: generic.light_onoff_brightness_colortemp,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 228 T'],
        model: 'RS 228 T',
        vendor: 'Innr',
        description: 'GU10 spot 350 lm, dimmable, white spectrum',
        extend: generic.light_onoff_brightness_colortemp,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 229 T'],
        model: 'RS 229 T',
        vendor: 'Innr',
        description: 'GU10 spot 350 lm, dimmable, white spectrum',
        extend: generic.light_onoff_brightness_colortemp,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RS 230 C'],
        model: 'RS 230 C',
        vendor: 'Innr',
        description: 'GU10 spot 350 lm, dimmable, RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 145'],
        model: 'RB 145',
        vendor: 'Innr',
        description: 'E14 candle',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 245'],
        model: 'RB 245',
        vendor: 'Innr',
        description: 'E14 candle',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 248 T'],
        model: 'RB 248 T',
        vendor: 'Innr',
        description: 'E14 candle with white spectrum',
        extend: generic.light_onoff_brightness_colortemp,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RB 148 T'],
        model: 'RB 148 T',
        vendor: 'Innr',
        description: 'E14 candle with white spectrum',
        extend: generic.light_onoff_brightness_colortemp,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RF 261'],
        model: 'RF 261',
        vendor: 'Innr',
        description: 'E27 filament bulb dimmable',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RF 263'],
        model: 'RF 263',
        vendor: 'Innr',
        description: 'E27 filament bulb dimmable',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['RF 264'],
        model: 'RF 264',
        vendor: 'Innr',
        description: 'E27 filament bulb dimmable',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['BY 165', 'BY 265'],
        model: 'BY 165',
        vendor: 'Innr',
        description: 'B22 bulb dimmable',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['PL 110'],
        model: 'PL 110',
        vendor: 'Innr',
        description: 'Puck Light',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['ST 110'],
        model: 'ST 110',
        vendor: 'Innr',
        description: 'Strip Light',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['UC 110'],
        model: 'UC 110',
        vendor: 'Innr',
        description: 'Under cabinet light',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['DL 110 N'],
        model: 'DL 110 N',
        vendor: 'Innr',
        description: 'Spot narrow',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['DL 110 W'],
        model: 'DL 110 W',
        vendor: 'Innr',
        description: 'Spot wide',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['SL 110 N'],
        model: 'SL 110 N',
        vendor: 'Innr',
        description: 'Spot Flex narrow',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['SL 110 M'],
        model: 'SL 110 M',
        vendor: 'Innr',
        description: 'Spot Flex medium',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['SL 110 W'],
        model: 'SL 110 W',
        vendor: 'Innr',
        description: 'Spot Flex wide',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['AE 260'],
        model: 'AE 260',
        vendor: 'Innr',
        description: 'E26/24 bulb',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['AE 280 C'],
        model: 'AE 280 C',
        vendor: 'Innr',
        description: 'E26 bulb RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['SP 120'],
        model: 'SP 120',
        vendor: 'Innr',
        description: 'Smart plug',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.electrical_measurement_power, fz.on_off, fz.ignore_genLevelCtrl_report, fz.metering_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 5},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await configureReporting.onOff(endpoint);
            // Gives UNSUPPORTED_ATTRIBUTE on readEletricalMeasurementPowerConverterAttributes.
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acCurrentDivisor: 1000,
                acCurrentMultiplier: 1,
            });
            await configureReporting.activePower(endpoint);
            await configureReporting.rmsCurrent(endpoint);
            await configureReporting.rmsVoltage(endpoint);
            // Gives UNSUPPORTED_ATTRIBUTE on readMeteringPowerConverterAttributes.
            endpoint.saveClusterAttributeKeyValue('seMetering', {
                multiplier: 1,
                divisor: 1,
            });
            await configureReporting.currentSummDelivered(endpoint);
        },
    },
    {
        zigbeeModel: ['SP 220'],
        model: 'SP 220',
        vendor: 'Innr',
        description: 'Smart plug',
        supports: 'on/off',
        fromZigbee: [fz.on_off, fz.ignore_basic_report],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
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
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['SP 224'],
        model: 'SP 224',
        vendor: 'Innr',
        description: 'Smart plug',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['OFL 120 C'],
        model: 'OFL 120 C',
        vendor: 'Innr',
        description: 'Outdoor flex light colour LED strip 2m, 550lm, RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['OFL 140 C'],
        model: 'OFL 140 C',
        vendor: 'Innr',
        description: 'Outdoor flex light colour LED strip 4m, 1000lm, RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['OSL 130 C'],
        model: 'OSL 130 C',
        vendor: 'Innr',
        description: 'Outdoor smart spot colour, 230lm/spot, RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },
    {
        zigbeeModel: ['BE 220'],
        model: 'BE 220',
        vendor: 'Innr',
        description: 'E26/E24 white bulb',
        extend: generic.light_onoff_brightness,
        meta: {applyRedFix: true, turnsOffAtBrightness1: true},
    },

    // Digi
    {
        fingerprint: [
            {type: 'Router', manufacturerID: 4126, endpoints: [
                {ID: 230, profileID: 49413, deviceID: 1, inputClusters: [], outputClusters: []},
                {ID: 232, profileID: 49413, deviceID: 1, inputClusters: [], outputClusters: []},
            ]},
        ],
        model: 'XBee',
        description: 'Router',
        vendor: 'Digi',
        supports: 'router only',
        fromZigbee: [],
        toZigbee: [],
    },

    // Sylvania
    {
        zigbeeModel: ['LIGHTIFY Dimming Switch'],
        model: '73743',
        vendor: 'Sylvania',
        description: 'Lightify Smart Dimming Switch',
        supports: 'up, down and hold/release',
        fromZigbee: [
            fz.osram_lightify_switch_cmdOn, fz.osram_lightify_switch_cmdMoveWithOnOff, fz.osram_lightify_switch_cmdOff,
            fz.osram_lightify_switch_cmdMove, fz.osram_lightify_switch_73743_cmdStop, fz.battery_3V,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        ota: ota.ledvance,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genPowerCfg']);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['LIGHTIFY RT Tunable White'],
        model: '73742',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED adjustable white RT 5/6',
        extend: ledvance.light_onoff_brightness_colortemp,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['RT RGBW'],
        model: '73741',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED adjustable color RT 5/6',
        extend: ledvance.light_onoff_brightness_colortemp_colorxy,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LIGHTIFY BR Tunable White'],
        model: '73740',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED adjustable white BR30',
        extend: ledvance.light_onoff_brightness_colortemp,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LIGHTIFY BR RGBW', 'BR30 RGBW'],
        model: '73739',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED RGBW BR30',
        extend: ledvance.light_onoff_brightness_colortemp_colorxy,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LIGHTIFY A19 RGBW', 'A19 RGBW'],
        model: '73693',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED RGBW A19',
        extend: ledvance.light_onoff_brightness_colortemp_colorxy,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Flex XL RGBW'],
        model: '73773',
        vendor: 'Sylvania',
        description: 'SMART+ Flex XL RGBW strip',
        extend: ledvance.light_onoff_brightness_colortemp_colorxy,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LIGHTIFY A19 ON/OFF/DIM', 'LIGHTIFY A19 ON/OFF/DIM 10 Year'],
        model: '74283',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED soft white dimmable A19',
        extend: ledvance.light_onoff_brightness,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A19 W 10 year'],
        model: '74696',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED soft white dimmable A19',
        extend: ledvance.light_onoff_brightness,
        ota: ota.ledvance,
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
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A19 TW 10 year'],
        model: '71831',
        vendor: 'Sylvania',
        description: 'Smart Home adjustable white A19 LED bulb',
        extend: ledvance.light_onoff_brightness_colortemp,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['MR16 TW'],
        model: '74282',
        vendor: 'Sylvania',
        description: 'Smart Home adjustable white MR16 LED bulb',
        extend: ledvance.light_onoff_brightness_colortemp,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LIGHTIFY Gardenspot RGB'],
        model: 'LTFY004',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED gardenspot mini RGB',
        extend: ledvance.light_onoff_brightness_colorxy,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR38 W 10 year'],
        model: '74580',
        vendor: 'Sylvania',
        description: 'Smart Home soft white PAR38 outdoor bulb',
        extend: ledvance.light_onoff_brightness,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Edge-lit Under Cabinet TW'],
        model: '72569',
        vendor: 'Sylvania',
        description: 'SMART+ Zigbee adjustable white edge-lit under cabinet light',
        extend: ledvance.light_onoff_brightness_colortemp,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Flushmount TW'],
        model: '72567',
        vendor: 'Sylvania',
        description: 'SMART+ Zigbee adjustable white edge-lit flush mount light',
        extend: ledvance.light_onoff_brightness_colortemp,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Outdoor Accent RGB', 'Outdoor Accent Light RGB'],
        model: '75541',
        vendor: 'Sylvania',
        description: 'SMART+ Outdoor Accent RGB lighting kit',
        extend: ledvance.light_onoff_brightness_colortemp_colorxy,
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['iQBR30'],
        model: '484719',
        vendor: 'Sylvania',
        description: 'Dimmable soft white BR30 LED flood light bulb',
        extend: ledvance.light_onoff_brightness,
        ota: ota.ledvance,
    },

    // Leviton
    {
        zigbeeModel: ['DL15S'],
        model: 'DL15S-1BZ',
        vendor: 'Leviton',
        description: 'Lumina RF 15A switch, 120/277V',
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
        zigbeeModel: ['65A01-1'],
        model: 'RC-2000WH',
        vendor: 'Leviton',
        description: 'Omnistat2 wireless thermostat',
        supports: 'temperature, heating/cooling system control, fan',
        fromZigbee: [fz.thermostat_att_report, fz.generic_fan_mode],
        toZigbee: [
            tz.factory_reset, tz.thermostat_local_temperature, tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint, tz.thermostat_unoccupied_cooling_setpoint,
            tz.thermostat_setpoint_raise_lower, tz.thermostat_remote_sensing,
            tz.thermostat_control_sequence_of_operation, tz.thermostat_system_mode, tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule, tz.thermostat_relay_status_log,
            tz.thermostat_temperature_setpoint_hold, tz.thermostat_temperature_setpoint_hold_duration, tz.fan_mode,
        ],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await bind(endpoint, coordinatorEndpoint, ['hvacThermostat', 'hvacFanCtrl']);
            await configureReporting.thermostatTemperature(endpoint);
            await configureReporting.thermostatSystemMode(endpoint);
            await configureReporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await configureReporting.thermostatUnoccupiedHeatingSetpoint(endpoint);
            await configureReporting.thermostatOccupiedCoolingSetpoint(endpoint);
            await configureReporting.thermostatUnoccupiedCoolingSetpoint(endpoint);
            await configureReporting.fanMode(endpoint);
        },
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
        zigbeeModel: ['Daylight'],
        model: 'PQC19-DY01',
        vendor: 'GE',
        description: 'Link smart LED light bulb, A19/BR30 cold white (5000K)',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['45852'],
        model: '45852GE',
        vendor: 'GE',
        description: 'ZigBee plug-in smart dimmer',
        supports: 'on/off, brightness',
        fromZigbee: [fz.brightness, fz.on_off, fz.ignore_basic_report],
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
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.metering_power, fz.ignore_basic_report],
        toZigbee: [tz.on_off, tz.ignore_transition],
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await configureReporting.onOff(endpoint);
            await readMeteringPowerConverterAttributes(endpoint);
            await configureReporting.instantaneousDemand(endpoint, {min: 10, change: 2});
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
        zigbeeModel: ['E12-N1E'],
        model: 'E12-N1E',
        vendor: 'Sengled',
        description: 'Smart LED multicolor (BR30)',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E11-G13'],
        model: 'E11-G13',
        vendor: 'Sengled',
        description: 'Element Classic (A19)',
        extend: generic.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E11-G23', 'E11-G33'],
        model: 'E11-G23/E11-G33',
        vendor: 'Sengled',
        description: 'Element Classic (A60)',
        extend: generic.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E11-N13', 'E11-N13A', 'E11-N14', 'E11-N14A'],
        model: 'E11-N13/E11-N13A/E11-N14/E11-N14A',
        vendor: 'Sengled',
        description: 'Element extra bright (A19)',
        extend: generic.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['Z01-CIA19NAE26'],
        model: 'Z01-CIA19NAE26',
        vendor: 'Sengled',
        description: 'Element Touch (A19)',
        extend: generic.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['Z01-A19NAE26'],
        model: 'Z01-A19NAE26',
        vendor: 'Sengled',
        description: 'Element Plus (A19)',
        extend: generic.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['Z01-A60EAE27'],
        model: 'Z01-A60EAE27',
        vendor: 'Sengled',
        description: 'Element Plus (A60)',
        extend: generic.light_onoff_brightness_colortemp,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E11-N1EA'],
        model: 'E11-N1EA',
        vendor: 'Sengled',
        description: 'Element Plus Color (A19)',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E11-U2E'],
        model: 'E11-U2E',
        vendor: 'Sengled',
        description: 'Element color plus E27',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E11-U3E'],
        model: 'E11-U3E',
        vendor: 'Sengled',
        description: 'Element color plus B22',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E12-N14'],
        model: 'E12-N14',
        vendor: 'Sengled',
        description: 'Element Classic (BR30)',
        extend: generic.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E1A-AC2'],
        model: 'E1ACA4ABE38A',
        vendor: 'Sengled',
        description: 'Element downlight smart LED bulb',
        extend: generic.light_onoff_brightness,
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E1D-G73'],
        model: 'E1D-G73WNA',
        vendor: 'Sengled',
        description: 'Smart window and door sensor',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E1C-NB6'],
        model: 'E1C-NB6',
        vendor: 'Sengled',
        description: 'Smart plug',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['E1E-G7F'],
        model: 'E1E-G7F',
        vendor: 'Sengled',
        description: 'Smart switch ',
        supports: 'action',
        fromZigbee: [fz.E1E_G7F_action],
        toZigbee: [],
    },

    // Swann
    {
        zigbeeModel: ['SWO-KEF1PA'],
        model: 'SWO-KEF1PA',
        vendor: 'Swann',
        description: 'Key fob remote',
        supports: 'panic, home, away, sleep',
        fromZigbee: [fz.KEF1PA_arm, fz.command_panic],
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
    {
        zigbeeModel: ['SWO-MOS1PA'],
        model: 'SWO-MOS1PA',
        vendor: 'Swann',
        description: 'Motion and temperature sensor',
        supports: 'occupancy',
        fromZigbee: [fz.ias_occupancy_alarm_1],
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

    // Nordtronic
    {
        zigbeeModel: ['BoxDIM2 98425031', '98425031'],
        model: '98425031',
        vendor: 'Nordtronic',
        description: 'Box Dimmer 2.0',
        extend: generic.light_onoff_brightness,
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['BoxRelayZ 98423051'],
        model: '98423051',
        vendor: 'Nordtronic',
        description: 'Zigbee switch 400W',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },

    // Nue, 3A
    {
        zigbeeModel: ['LXN59-2S7LX1.0'],
        model: 'LXN59-2S7LX1.0',
        vendor: 'Nue / 3A',
        description: 'Smart light relay - 2 gang',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {multiEndpoint: true},
        whiteLabel: [
            {vendor: 'Zemismart', model: 'ZW-EU-02'},
        ],
        endpoint: (device) => {
            return {'left': 1, 'right': 2};
        },
    },
    {
        zigbeeModel: ['FTB56+ZSN15HG1.0'],
        model: 'HGZB-1S',
        vendor: 'Nue / 3A',
        description: 'Smart 1 key scene wall switch',
        supports: 'on/off, click, action',
        toZigbee: [tz.on_off],
        fromZigbee: [fz.command_recall, fz.legacy_scenes_recall_click, fz.ignore_power_report],
    },
    {
        zigbeeModel: ['FTB56+ZSN16HG1.0'],
        model: 'HGZB-02S',
        vendor: 'Nue / 3A',
        description: 'Smart 2 key scene wall switch',
        supports: 'on/off, click, action',
        toZigbee: [tz.on_off],
        fromZigbee: [fz.command_recall, fz.legacy_scenes_recall_click, fz.ignore_power_report],
    },
    {
        zigbeeModel: ['FB56+ZSN08KJ2.3'],
        model: 'HGZB-045',
        vendor: 'Nue / 3A',
        description: 'Smart 4 key scene wall switch',
        supports: 'on/off, click, action',
        toZigbee: [tz.on_off],
        fromZigbee: [fz.command_recall, fz.legacy_scenes_recall_click, fz.ignore_power_report],
    },
    {
        zigbeeModel: ['LXN56-DC27LX1.1', 'LXN56-DS27LX1.1'],
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
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'top': 1, 'center': 2, 'bottom': 3};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FB56+ZSW1IKJ1.7', 'FB56+ZSW1IKJ2.5', 'FB56+ZSW1IKJ2.7'],
        model: 'HGZB-043',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 3 gang',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'top': 16, 'center': 17, 'bottom': 18};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(16), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(17), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(18), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FB56+ZSW1JKJ2.7'],
        model: 'HGZB-44',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 4 gang v2.0',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'top_left': 16, 'top_right': 17, 'bottom_right': 18, 'bottom_left': 19};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(16), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(17), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(18), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(19), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FB56+ZSC05HG1.0', 'FNB56-ZBW01LX1.2', 'LXN56-DS27LX1.3'],
        model: 'HGZB-04D / HGZB-4D-UK',
        vendor: 'Nue / 3A',
        description: 'Smart dimmer wall switch',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['FB56+ZSW1HKJ1.7', 'FB56+ZSW1HKJ2.5'],
        model: 'HGZB-042',
        vendor: 'Nue / 3A',
        description: 'Smart light switch - 2 gang',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'top': 16, 'bottom': 17};
        },
        meta: {configureKey: 1, multiEndpoint: true},
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
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'top': 11, 'bottom': 12};
        },
        meta: {configureKey: 1, multiEndpoint: true},
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
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {left: 12, right: 11};
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
        zigbeeModel: ['FNB56-ZSW23HG1.1', 'LXN56-LC27LX1.1', 'LXN56-LC27LX1.3'],
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
        zigbeeModel: ['LXN56-0S27LX1.1', 'LXN56-0S27LX1.3'],
        model: 'HGZB-20-UK',
        vendor: 'Nue / 3A',
        description: 'Power plug',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['NUET56-DL27LX1.2'],
        model: 'HGZB-DLC4-N12B',
        vendor: 'Nue / 3A',
        description: 'RGB LED downlight',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['FB56-WTS04HM1.1'],
        model: 'HGZB-14A',
        vendor: 'Nue / 3A',
        description: 'Water leakage sensor',
        supports: 'water leak',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
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

    // Feibit
    {
        zigbeeModel: ['FZB56+ZSW2FYM1.1'],
        model: 'TZSW22FW-L4',
        vendor: 'Feibit',
        description: 'Smart light switch - 2 gang',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'top': 16, 'bottom': 17};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(16), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(17), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FNB56-SOS03FB1.5'],
        model: 'SEB01ZB',
        vendor: 'Feibit',
        description: 'SOS button',
        supports: 'sos',
        fromZigbee: [fz.ias_sos_alarm_2, fz.battery],
        toZigbee: [],
    },
    {
        zigbeeModel: ['FNB56-BOT06FB2.3', 'FNB56-BOT06FB2.8'],
        model: 'SBM01ZB',
        vendor: 'Feibit',
        description: 'Human body movement sensor',
        supports: 'occupancy, tamper',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
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
        zigbeeModel: ['FNB56-THM14FB2.4'],
        model: 'STH01ZB',
        vendor: 'Feibit',
        description: 'Smart temperature & humidity Sensor',
        supports: 'temperature, humidity',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery_3V],
        toZigbee: [],
    },
    {
        zigbeeModel: ['FNB56-SMF06FB1.6'],
        model: 'SSA01ZB',
        vendor: 'Feibit',
        description: 'Smoke detector',
        supports: 'smoke',
        fromZigbee: [fz.ias_smoke_alarm_1, fz.battery],
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
        zigbeeModel: ['FNB56-COS06FB1.7'],
        model: 'SCA01ZB',
        vendor: 'Feibit',
        description: 'Smart carbon monoxide sensor',
        supports: 'carbon monoxide',
        fromZigbee: [fz.ias_carbon_monoxide_alarm_1, fz.battery],
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
        zigbeeModel: ['FNB56-GAS05FB1.4'],
        model: 'SGA01ZB',
        vendor: 'Feibit',
        description: 'Combustible gas sensor',
        supports: 'gas',
        fromZigbee: [fz.ias_gas_alarm_2],
        toZigbee: [],
    },
    {
        zigbeeModel: ['FNB56-WTS05FB2.0'],
        model: 'SWA01ZB',
        vendor: 'Feibit',
        description: 'Water leakage sensor',
        supports: 'water leak',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
    },
    {
        zigbeeModel: ['FNB56-DOS07FB2.4'],
        model: 'SDM01ZB',
        vendor: 'Feibit',
        description: 'Door or window contact switch',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
    },
    {
        zigbeeModel: ['FB56+SKT14AL2.1'],
        model: 'SFS01ZB',
        vendor: 'Feibit',
        description: 'Power plug',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['FB56+ZSW1HKJ2.2'],
        model: 'SLS301ZB_2',
        vendor: 'Feibit',
        description: 'Smart light switch - 2 gang',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'left': 16, 'right': 17};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(16), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(17), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FB56+ZSW1IKJ2.2'],
        model: 'SLS301ZB_3',
        vendor: 'Feibit',
        description: 'Smart light switch - 3 gang',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'left': 16, 'center': 17, 'right': 18};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(16), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(17), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(18), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['FB56+ZSN08KJ2.2'],
        model: 'SSS401ZB',
        vendor: 'Feibit',
        description: 'Smart 4 key scene wall switch',
        supports: 'on/off, action',
        toZigbee: [tz.on_off],
        fromZigbee: [fz.command_recall],
    },

    // Gledopto
    {
        zigbeeModel: ['GL-C-006'],
        fingerprint: [
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GLEDOPTO', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 544, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        model: 'GL-C-006',
        vendor: 'Gledopto',
        description: 'Zigbee LED controller WW/CW',
        extend: gledopto.light_onoff_brightness_colortemp,
    },
    {
        fingerprint: [
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GL-C-007', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 528, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        model: 'GL-C-007-1ID', // 1 ID controls white and color together
        vendor: 'Gledopto',
        description: 'Zigbee LED controller RGBW (1 ID)',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },
    {
        fingerprint: [
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GL-C-007', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                {ID: 15, profileID: 49246, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
            ]},
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GLEDOPTO', endpoints: [
                {ID: 10, profileID: 49246, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8], outputClusters: []},
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
            ]},
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GL-C-007', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 12, profileID: 260, deviceID: 258, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        model: 'GL-C-007-2ID', // 2 ID controls white and color separate
        vendor: 'Gledopto',
        description: 'Zigbee LED controller RGBW (2 ID)',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
        endpoint: (device) => {
            if (device.getEndpoint(10) && device.getEndpoint(11) && device.getEndpoint(13)) {
                return {rgb: 11, white: 10};
            } else if (device.getEndpoint(11) && device.getEndpoint(12) && device.getEndpoint(13)) {
                return {rgb: 11, white: 12};
            } else {
                return {rgb: 11, white: 15};
            }
        },
    },
    {
        zigbeeModel: ['GL-S-004ZS'],
        model: 'GL-S-004ZS',
        vendor: 'Gledopto',
        description: 'Zigbee smart RGB+CCT 4W MR16',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['GL-C-007S'],
        model: 'GL-C-007S',
        vendor: 'Gledopto',
        description: 'Zigbee LED controller RGBW plus model',
        extend: gledopto.light_onoff_brightness_colorxy,
    },
    {
        fingerprint: [
            // Although the device announces modelID GL-C-007, this is clearly a GL-C-008
            // https://github.com/Koenkk/zigbee2mqtt/issues/3525
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GL-C-007', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                {ID: 15, profileID: 49246, deviceID: 544, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
            ]},
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GL-C-007', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 12, profileID: 260, deviceID: 258, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
                {ID: 15, profileID: 49246, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
            ]},
        ],
        model: 'GL-C-008-2ID', // 2 ID controls color temperature and color separate
        vendor: 'Gledopto',
        description: 'Zigbee LED controller RGB + CCT (2 ID)',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
        // Only enable disableDefaultResponse for the second fingerprint:
        // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1315#issuecomment-645331185
        meta: {disableDefaultResponse: (entity) => !!entity.getDevice().getEndpoint(12)},
        endpoint: (device) => {
            return {rgb: 11, cct: 15};
        },
    },
    {
        fingerprint: [
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GLEDOPTO', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 528, inputClusters: [0, 3, 4, 5, 6, 8, 768], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        zigbeeModel: ['GL-C-008'],
        model: 'GL-C-008-1ID', // 1 ID controls color temperature and color separate
        vendor: 'Gledopto',
        description: 'Zigbee LED controller RGB + CCT (1 ID)',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ['GL-C-008S'],
        model: 'GL-C-008S',
        vendor: 'Gledopto',
        description: 'Zigbee LED controller RGB + CCT plus model',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ['GL-C-009'],
        fingerprint: [
            {type: 'Router', manufacturerName: 'GLEDOPTO', modelID: 'GLEDOPTO', endpoints: [
                {ID: 11, profileID: 49246, deviceID: 256, inputClusters: [0, 3, 4, 5, 6, 8], outputClusters: []},
                {ID: 13, profileID: 49246, deviceID: 57694, inputClusters: [4096], outputClusters: [4096]},
            ]},
        ],
        model: 'GL-C-009',
        vendor: 'Gledopto',
        description: 'Zigbee LED controller dimmer',
        extend: gledopto.light_onoff_brightness,
    },
    {
        zigbeeModel: ['GL-MC-001'],
        model: 'GL-MC-001',
        vendor: 'Gledopto',
        description: 'Zigbee USB mini LED controller RGB + CCT',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ['GL-S-004Z'],
        model: 'GL-S-004Z',
        vendor: 'Gledopto',
        description: 'Zigbee Smart WW/CW GU10',
        extend: gledopto.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['GL-S-007Z'],
        model: 'GL-S-007Z',
        vendor: 'Gledopto',
        description: 'Smart RGB+CCT 5W GU10',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ['GL-S-007ZS'],
        model: 'GL-S-007ZS',
        vendor: 'Gledopto',
        description: 'Smart RGB+CCT 4W GU10 plus model',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['GL-S-008Z'],
        model: 'GL-S-008Z',
        vendor: 'Gledopto',
        description: 'Soposh dual white and color ',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['GL-B-001Z'],
        model: 'GL-B-001Z',
        vendor: 'Gledopto',
        description: 'Smart 4W E14 RGB / CCT LED bulb',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['GL-B-001ZS'],
        model: 'GL-B-001ZS',
        vendor: 'Gledopto',
        description: 'Smart 4W E14 RGB / CCT LED bulb',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['GL-G-001Z'],
        model: 'GL-G-001Z',
        vendor: 'Gledopto',
        description: 'Smart garden lamp',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['GL-G-007Z'],
        model: 'GL-G-007Z',
        vendor: 'Gledopto',
        description: 'Smart garden lamp 9W RGB / CCT',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['GL-B-007Z'],
        model: 'GL-B-007Z',
        vendor: 'Gledopto',
        description: 'Smart 6W E27 RGB / CCT LED bulb',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['GL-B-007ZS'],
        model: 'GL-B-007ZS',
        vendor: 'Gledopto',
        description: 'Smart+ 6W E27 RGB / CCT LED bulb',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['GL-B-008Z'],
        model: 'GL-B-008Z',
        vendor: 'Gledopto',
        description: 'Smart 12W E27 RGB / CCT LED bulb',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['GL-B-008ZS'],
        model: 'GL-B-008ZS',
        vendor: 'Gledopto',
        description: 'Smart 12W E27 RGB / CW LED bulb',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['GL-D-003Z'],
        model: 'GL-D-003Z',
        vendor: 'Gledopto',
        description: 'LED RGB + CCT downlight',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['GL-D-004Z'],
        model: 'GL-D-004Z',
        vendor: 'Gledopto',
        description: 'LED RGB + CCT downlight',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['GL-D-004ZS'],
        model: 'GL-D-004ZS',
        vendor: 'Gledopto',
        description: 'LED RGB + CCT downlight plus version 9W',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['GL-D-005Z'],
        model: 'GL-D-005Z',
        vendor: 'Gledopto',
        description: 'LED RGB + CCT downlight',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['GL-D-005ZS'],
        model: 'GL-D-005ZS',
        vendor: 'Gledopto',
        description: 'LED RGB + CCT downlight',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['GL-S-003Z'],
        model: 'GL-S-003Z',
        vendor: 'Gledopto',
        description: 'Smart RGBW GU10 ',
        extend: gledopto.light_onoff_brightness_colorxy,
    },
    {
        zigbeeModel: ['GL-S-005Z'],
        model: 'GL-S-005Z',
        vendor: 'Gledopto',
        description: 'Smart RGBW MR16',
        extend: gledopto.light_onoff_brightness_colorxy,
    },
    {
        zigbeeModel: ['HOMA2023'],
        model: 'GD-CZ-006',
        vendor: 'Gledopto',
        description: 'Zigbee LED Driver',
        extend: gledopto.light_onoff_brightness,
    },
    {
        zigbeeModel: ['GL-FL-004TZ'],
        model: 'GL-FL-004TZ',
        vendor: 'Gledopto',
        description: 'Zigbee 10W floodlight RGB CCT',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['GL-FL-004TZS'],
        model: 'GL-FL-004TZS',
        vendor: 'Gledopto',
        description: 'Zigbee 10W floodlight RGB CCT',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['GL-FL-005TZ'],
        model: 'GL-FL-005TZ',
        vendor: 'Gledopto',
        description: 'Zigbee 30W floodlight RGB CCT',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['GL-FL-006TZ'],
        model: 'GL-FL-006TZ',
        vendor: 'Gledopto',
        description: 'Zigbee 60W floodlight RGB CCT',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['GL-FL-006TZS'],
        model: 'GL-FL-006TZS',
        vendor: 'Gledopto',
        description: 'Zigbee 60W floodlight RGB CCT',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
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
    {
        zigbeeModel: ['GL-D-003ZS'],
        model: 'GL-D-003ZS',
        vendor: 'Gledopto',
        description: 'Smart+ 6W LED spot',
        extend: gledopto.light_onoff_brightness_colortemp_colorxy,
    },

    // YSRSAI
    {
        zigbeeModel: ['ZB-CL01', 'FB56-ZCW20FB1.2'],
        model: 'YSR-MINI-01',
        vendor: 'YSRSAI',
        description: 'Zigbee LED controller (RGB+CCT)',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['ZB-CT01'],
        model: 'ZB-CT01',
        vendor: 'YSRSAI',
        description: 'Zigbee LED controller (WW/CW)',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },

    // Somgoms
    {
        zigbeeModel: ['tdtqgwv'],
        model: 'ZSTY-SM-11ZG-US-W',
        vendor: ' Somgoms',
        description: '1 gang switch',
        supports: 'on/off',
        fromZigbee: [fz.tuya_switch2, fz.ignore_time_read, fz.ignore_basic_report],
        toZigbee: [tz.tuya_switch_state],
    },
    {
        zigbeeModel: ['bordckq'],
        model: 'ZSTY-SM-1CTZG-US-W',
        vendor: 'Somgoms',
        description: 'Curtain switch',
        supports: 'open, close, stop, position',
        fromZigbee: [fz.tuya_curtain, fz.ignore_basic_report],
        toZigbee: [tz.tuya_curtain_control, tz.tuya_curtain_options],
    },
    {
        zigbeeModel: ['hpb9yts'],
        model: 'ZSTY-SM-1DMZG-US-W',
        vendor: 'Somgoms',
        description: 'Dimmer switch',
        supports: 'on/off, brightness',
        fromZigbee: [fz.tuya_dimmer, fz.ignore_basic_report],
        toZigbee: [tz.tuya_dimmer_state, tz.tuya_dimmer_level],
    },

    // ROBB
    {
        zigbeeModel: ['ROB_200-004-0'],
        model: 'ROB_200-004-0',
        vendor: 'ROBB',
        description: 'ZigBee AC phase-cut dimmer',
        extend: generic.light_onoff_brightness,
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ROB_200-003-0'],
        model: 'ROB_200-003-0',
        vendor: 'ROBB',
        description: 'Zigbee AC in wall switch',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ROB_200-014-0'],
        model: 'ROB_200-014-0',
        vendor: 'ROBB',
        description: 'ZigBee AC phase-cut rotary dimmer',
        extend: generic.light_onoff_brightness,
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ZG2833K8_EU05'],
        model: 'ROB_200-007-0',
        vendor: 'ROBB',
        description: 'Zigbee 8 button wall switch',
        supports: 'action',
        fromZigbee: [
            fz.command_on, fz.command_off, fz.command_move, fz.command_stop,
            fz.battery,
        ],
        toZigbee: [],
        meta: {multiEndpoint: true},
    },
    {
        zigbeeModel: ['ZG2833K4_EU06'],
        model: 'ROB_200-008-0',
        vendor: 'ROBB',
        description: 'Zigbee 4 button wall switch',
        supports: 'action',
        fromZigbee: [
            fz.command_on, fz.command_off, fz.command_move, fz.command_stop,
            fz.battery,
        ],
        toZigbee: [],
        meta: {multiEndpoint: true},
        whiteLabel: [
            {vendor: 'Sunricher', model: 'SR-ZG9001K4-DIM2'},
        ],
    },
    {
        zigbeeModel: ['Motor Controller', 'ROB_200-010-0'],
        model: 'ROB_200-010-0',
        vendor: 'ROBB',
        description: 'Zigbee curtain motor controller',
        supports: 'open, close, stop, position',
        meta: {configureKey: 2, coverInverted: true},
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering']);
            await configureReporting.currentPositionLiftPercentage(endpoint);
        },
    },

    // Namron
    {
        zigbeeModel: ['4512700'],
        model: '4512700',
        vendor: 'Namron',
        description: 'ZigBee dimmer 400W',
        extend: generic.light_onoff_brightness,
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['4512704'],
        model: '4512704',
        vendor: 'Namron',
        description: 'Zigbee switch 400W',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['1402755'],
        model: '1402755',
        vendor: 'Namron',
        description: 'ZigBee LED dimmer',
        extend: generic.light_onoff_brightness,
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['4512703'],
        model: '4512703',
        vendor: 'Namron',
        description: 'Zigbee 4 channel switch K8 (white)',
        supports: 'action',
        fromZigbee: [
            fz.command_on, fz.command_off, fz.battery,
            fz.command_move, fz.command_stop,
        ],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
    },
    {
        zigbeeModel: ['4512721'],
        model: '4512721',
        vendor: 'Namron',
        description: 'Zigbee 4 channel switch K8 (black)',
        supports: 'action',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery, fz.command_move, fz.command_stop],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
        },
    },
    {
        zigbeeModel: ['4512702'],
        model: '4512702',
        vendor: 'Namron',
        description: 'Zigbee 1 channel switch K4',
        supports: 'action',
        fromZigbee: [
            fz.command_on, fz.command_off, fz.battery,
            fz.command_move, fz.command_stop, fz.command_step,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['4512706'],
        model: '4512706',
        vendor: 'Namron',
        description: 'Remote control',
        supports: 'action',
        fromZigbee: [
            fz.command_on, fz.command_off, fz.command_step, fz.command_step_color_temperature,
            fz.command_recall, fz.command_move_to_color_temp, fz.battery,
        ],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};
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
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genBinaryInput']);
            await configureReporting.batteryVoltage(endpoint);
            await configureReporting.presentValue(endpoint);
        },
    },
    {
        zigbeeModel: ['PGC410EU', 'PGC410'],
        model: 'STSS-PRES-001',
        vendor: 'SmartThings',
        description: 'Presence sensor',
        supports: 'presence',
        fromZigbee: [fz.PGC410EU_presence, fz.battery],
        toZigbee: [],
    },
    {
        zigbeeModel: ['3325-S'],
        model: '3325-S',
        vendor: 'SmartThings',
        description: 'Motion sensor (2015 model)',
        supports: 'occupancy and temperature',
        fromZigbee: [fz.temperature, fz.ias_occupancy_alarm_2],
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
        fromZigbee: [fz.temperature, fz.smartsense_multi, fz.ias_contact_alarm_1, fz.battery_cr2450],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await endpoint.read('genPowerCfg', ['batteryVoltage']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['3200-Sgb'],
        model: 'F-APP-UK-V2',
        vendor: 'SmartThings',
        description: 'Zigbee Outlet UK with power meter',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.electrical_measurement_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await configureReporting.onOff(endpoint);
            await readEletricalMeasurementPowerConverterAttributes(endpoint);
            // Limit updates to 3V and max 600s (10m)
            await configureReporting.rmsVoltage(endpoint, {max: 600, change: 3});
            // Limit updates to 0.01A and max 600s (10m)
            await configureReporting.rmsCurrent(endpoint, {max: 600, change: 10});
            // Limit updates to 4.0W and max 600s (10m)
            await configureReporting.activePower(endpoint, {max: 600, change: 40});
        },
    },
    {
        zigbeeModel: ['ZB-ONOFFPlug-D0005'],
        model: 'GP-WOU019BBDWG',
        vendor: 'SmartThings',
        description: 'Outlet with power meter',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.electrical_measurement_power, fz.metering_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await configureReporting.onOff(endpoint);
            await readEletricalMeasurementPowerConverterAttributes(endpoint);
            await configureReporting.activePower(endpoint);
            await configureReporting.rmsCurrent(endpoint);
            await configureReporting.rmsVoltage(endpoint);
            await readMeteringPowerConverterAttributes(endpoint);
            await configureReporting.currentSummDelivered(endpoint);
        },
    },
    {
        zigbeeModel: ['outlet'],
        model: 'IM6001-OTP05',
        vendor: 'SmartThings',
        description: 'Outlet',
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
        zigbeeModel: ['outletv4'],
        model: 'STS-OUT-US-2',
        vendor: 'SmartThings',
        description: 'Zigbee smart plug with power meter',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.electrical_measurement_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await configureReporting.onOff(endpoint);
            await readEletricalMeasurementPowerConverterAttributes(endpoint);
            await configureReporting.activePower(endpoint);
            await configureReporting.rmsCurrent(endpoint);
            await configureReporting.rmsVoltage(endpoint, {change: 10});
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
            fz.ias_occupancy_alarm_1, fz.battery_3V,
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
        zigbeeModel: ['motionv5'],
        model: 'STS-IRM-251',
        vendor: 'SmartThings',
        description: 'Motion sensor (2017 model)',
        supports: 'occupancy and temperature',
        fromZigbee: [
            fz.temperature, fz.ias_occupancy_alarm_1, fz.battery_3V,
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
            fz.temperature, fz.ias_occupancy_alarm_2,
            fz.ias_occupancy_alarm_1, fz.battery_3V,
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
        zigbeeModel: ['3305-S', '3305'],
        model: '3305-S',
        vendor: 'SmartThings',
        description: 'Motion sensor (2014 model)',
        supports: 'occupancy and temperature',
        fromZigbee: [
            fz.temperature, fz.ias_occupancy_alarm_2,
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
        fromZigbee: [fz.temperature, fz.battery_3V, fz.ias_contact_alarm_1, fz.smartthings_acceleration],
        toZigbee: [],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: 0x110A};
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg', 'manuSpecificSamsungAccelerometer']);
            await endpoint.write('manuSpecificSamsungAccelerometer', {0x0000: {value: 0x01, type: 0x20}}, options);
            await endpoint.write('manuSpecificSamsungAccelerometer', {0x0002: {value: 0x0276, type: 0x21}}, options);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryVoltage(endpoint);
            const payload = configureReportingPayload('acceleration', 10, repInterval.MINUTE, 1);
            await endpoint.configureReporting('manuSpecificSamsungAccelerometer', payload, options);
        },
    },
    {
        zigbeeModel: ['multi'],
        model: 'IM6001-MPP01',
        vendor: 'SmartThings',
        description: 'Multipurpose sensor (2018 model)',
        supports: 'contact',
        fromZigbee: [fz.temperature, fz.ias_contact_alarm_1, fz.battery, fz.ignore_iaszone_attreport],
        toZigbee: [],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['3310-S'],
        model: '3310-S',
        vendor: 'SmartThings',
        description: 'Temperature and humidity sensor',
        supports: 'temperature and humidity',
        fromZigbee: [fz.temperature, fz._3310_humidity, fz.battery_3V],
        toZigbee: [],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['msTemperatureMeasurement', 'manuSpecificCentraliteHumidity', 'genPowerCfg'];
            await bind(endpoint, coordinatorEndpoint, binds);
            await configureReporting.temperature(endpoint);

            const payload = [{
                attribute: 'measuredValue',
                minimumReportInterval: 10,
                maximumReportInterval: repInterval.HOUR,
                reportableChange: 10,
            }];
            await endpoint.configureReporting('manuSpecificCentraliteHumidity', payload, {manufacturerCode: 0x104E});

            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['3315-S'],
        model: '3315-S',
        vendor: 'SmartThings',
        description: 'Water sensor',
        supports: 'water and temperature',
        fromZigbee: [fz.temperature, fz.ias_water_leak_alarm_1, fz.battery_3V],
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
        zigbeeModel: ['3315-Seu'],
        model: 'WTR-UK-V2',
        vendor: 'SmartThings',
        description: 'Water leak sensor (2015 model)',
        supports: 'water and temperature',
        fromZigbee: [fz.temperature, fz.ias_water_leak_alarm_1, fz.battery_3V],
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
        model: 'IM6001-WLP01',
        vendor: 'SmartThings',
        description: 'Water leak sensor (2018 model)',
        supports: 'water leak and temperature',
        fromZigbee: [fz.temperature, fz.ias_water_leak_alarm_1, fz.battery_3V],
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
        zigbeeModel: ['moisturev4'],
        model: 'STS-WTR-250',
        vendor: 'SmartThings',
        description: 'Water leak sensor (2016 model)',
        supports: 'water leak',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery_3V, fz.temperature],
        toZigbee: [],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'msTemperatureMeasurement']);
            await configureReporting.batteryVoltage(endpoint);
            await configureReporting.temperature(endpoint);
        },
    },
    {
        zigbeeModel: ['3315-G'],
        model: '3315-G',
        vendor: 'SmartThings',
        description: 'Water sensor',
        supports: 'water and temperature',
        fromZigbee: [fz.temperature, fz.ias_water_leak_alarm_1, fz.battery_3V],
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
        supports: 'single, double and hold click, temperature',
        fromZigbee: [
            fz.command_status_change_notification_action,
            fz.legacy_st_button_state, fz.battery, fz.temperature, fz.ignore_iaszone_attreport,
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
        zigbeeModel: ['Z-SRN12N', 'SZ-SRN12N'],
        model: 'SZ-SRN12N',
        vendor: 'SmartThings',
        description: 'Smart siren',
        supports: 'warning',
        fromZigbee: [],
        toZigbee: [tz.warning],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
        },
    },
    {
        zigbeeModel: ['zbt-dimlight-gls0006'],
        model: 'GP-LBU019BBAWU',
        vendor: 'SmartThings',
        description: 'Smart bulb',
        extend: generic.light_onoff_brightness,
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
            fz.battery,
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
        zigbeeModel: ['\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'+
                      '\u0000\u0000\u0000\u0000\u0000', 'ZLL-NonColorController'],
        model: 'ZYCT-202',
        vendor: 'Trust',
        description: 'Remote control',
        supports: 'on, off, stop, up-press, down-press',
        fromZigbee: [
            fz.command_on, fz.command_off_with_effect, fz.ZYCT202_stop, fz.ZYCT202_up_down,
        ],
        toZigbee: [],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
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
        zigbeeModel: ['ZLL-ColorTempera', 'ZLL-ColorTemperature'],
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
        fromZigbee: [
            fz.ias_occupancy_alarm_2, fz.battery,
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
    {
        zigbeeModel: ['CSW_ADUROLIGHT'],
        model: 'ZCTS-808',
        vendor: 'Trust',
        description: 'Wireless contact sensor',
        supports: 'contact',
        fromZigbee: [
            fz.ias_contact_alarm_1, fz.battery,
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
        model: '50044/50045',
        vendor: 'Paulmann',
        description: 'SmartHome Zigbee Dimmer or LED-stripe',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['500.47'],
        model: '500.47',
        vendor: 'Paulmann',
        description: 'SmartHome Zigbee MaxLED RGBW controller max. 72W 24V DC',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['RGBW light', '500.49'],
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
    {
        zigbeeModel: ['371000001'],
        model: '371000001',
        vendor: 'Paulmann',
        description: 'SmartHome led spot tuneable white',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['371000002'],
        model: '371000002',
        vendor: 'Paulmann',
        description: 'Amaris LED panels',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['500.45'],
        model: '798.15',
        vendor: 'Paulmann',
        description: 'SmartHome Zigbee Pendulum Light Aptare',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['500.48'],
        model: '500.48',
        vendor: 'Paulmann',
        description: 'SmartHome Zigbee YourLED dim/switch controller max. 60 W',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['H036-0001'],
        model: '93999',
        vendor: 'Paulmann',
        description: 'Plug Shine Zigbee controller',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['RemoteControl '],
        model: '500.67',
        vendor: 'Paulmann',
        description: 'RGB remote control',
        supports: 'action',
        fromZigbee: [
            fz.command_on, fz.command_off, fz.command_toggle, fz.command_step,
            fz.command_move_to_color_temp, fz.command_move_to_color, fz.command_stop,
            fz.command_move, fz.command_color_loop_set, fz.command_ehanced_move_to_hue_and_saturation,
            fz.tint404011_scene,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['NLG-remote', 'Neuhaus remote'],
        model: '100.462.31',
        vendor: 'Paul Neuhaus',
        description: 'Q-REMOTE',
        supports: 'action',
        fromZigbee: [
            fz.command_on, fz.command_off, fz.command_toggle, fz.command_step,
            fz.command_move_to_color_temp, fz.command_move_to_color, fz.command_stop,
            fz.command_move, fz.command_color_loop_set, fz.command_ehanced_move_to_hue_and_saturation,
            fz.tint404011_scene, fz.command_recall,
        ],
        toZigbee: [],
    },

    // Bitron
    {
        zigbeeModel: ['AV2010/34'],
        model: 'AV2010/34',
        vendor: 'Bitron',
        description: '4-Touch single click buttons',
        supports: 'click, action',
        fromZigbee: [fz.ignore_power_report, fz.command_recall, fz.legacy_AV2010_34_click],
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
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout],
        toZigbee: [],
    },
    {
        zigbeeModel: ['AV2010/22A'],
        model: 'AV2010/22A',
        vendor: 'Bitron',
        description: 'Wireless motion detector',
        supports: 'occupancy',
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout],
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
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
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
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genPowerCfg', 'genIdentify', 'genPollCtrl', 'hvacThermostat', 'hvacUserInterfaceCfg',
            ];
            await bind(endpoint, coordinatorEndpoint, binds);
            await configureReporting.thermostatTemperature(endpoint, {min: 900, max: repInterval.HOUR, change: 1});
            await configureReporting.thermostatTemperatureCalibration(endpoint);
            await configureReporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await configureReporting.thermostatRunningState(endpoint);
            await configureReporting.batteryAlarmState(endpoint);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['902010/21A'],
        model: 'AV2010/21A',
        vendor: 'Bitron',
        description: 'Compact magnetic contact sensor',
        supports: 'contact, tamper',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['902010/24A'],
        model: 'AV2010/24A',
        vendor: 'Bitron',
        description: 'Optical smoke detector (hardware version v2)',
        supports: 'smoke, tamper and battery',
        fromZigbee: [fz.ias_smoke_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['902010/24'],
        model: '902010/24',
        vendor: 'Bitron',
        description: 'Optical smoke detector (hardware version v1)',
        supports: 'smoke, tamper and battery',
        fromZigbee: [fz.ias_smoke_alarm_1],
        toZigbee: [],
    },

    // Iris
    {
        zigbeeModel: ['3210-L'],
        model: '3210-L',
        vendor: 'Iris',
        description: 'Smart plug',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.electrical_measurement_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 5},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await readEletricalMeasurementPowerConverterAttributes(endpoint);
            await configureReporting.onOff(endpoint);
            await configureReporting.rmsVoltage(endpoint, {change: 2}); // Voltage reports in V
            await configureReporting.rmsCurrent(endpoint, {change: 10}); // Current reports in mA
            await configureReporting.activePower(endpoint); // Power reports in 0.1W
        },
    },
    {
        zigbeeModel: ['3326-L'],
        model: '3326-L',
        vendor: 'Iris',
        description: 'Motion and temperature sensor',
        supports: 'occupancy and temperature',
        fromZigbee: [fz.ias_occupancy_alarm_2, fz.temperature, fz.battery_3V_2100],
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
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery_3V_2100],
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
        zigbeeModel: ['3460-L'],
        model: '3460-L',
        vendor: 'Iris',
        description: 'Smart button',
        supports: 'action, temperature',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery_3V_2100, fz.temperature],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg', 'msTemperatureMeasurement']);
            await configureReporting.onOff(endpoint);
            await configureReporting.batteryVoltage(endpoint);
            await configureReporting.temperature(endpoint);
        },
    },
    {
        zigbeeModel: ['1117-S'],
        model: 'iL07_1',
        vendor: 'Iris',
        description: 'Motion Sensor',
        supports: 'motion, tamper and battery',
        fromZigbee: [fz.ias_occupancy_alarm_2],
        toZigbee: [],
    },
    {
        zigbeeModel: ['HT8-ZB'],
        model: '27087-03',
        vendor: 'Iris',
        description: 'Hose faucet water timer',
        supports: 'on/off',
        fromZigbee: [fz.on_off, fz.battery_3V, fz.ignore_time_read],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await configureReporting.batteryVoltage(endpoint);
        },
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
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },

    // Ninja Blocks
    {
        zigbeeModel: ['Ninja Smart Plug'],
        model: 'Z809AF',
        vendor: 'Ninja Blocks',
        description: 'Zigbee smart plug with power meter',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.metering_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await configureReporting.onOff(endpoint);
            await readMeteringPowerConverterAttributes(endpoint);
            await configureReporting.instantaneousDemand(endpoint);
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
        ota: ota.zigbeeOTA,
        endpoint: (device) => {
            return {rgb: 10, white: 11};
        },
    },
    {
        zigbeeModel: ['FLS-CT'],
        model: 'XVV-Mega23M12',
        vendor: 'Dresden Elektronik',
        description: 'ZigBee Light Link wireless electronic ballast color temperature',
        extend: generic.light_onoff_brightness_colortemp,
    },

    // Centralite
    {
        zigbeeModel: ['4256251-RZHAC'],
        model: '4256251-RZHAC',
        vendor: 'Centralite',
        description: 'White Swiss power outlet switch with power meter',
        supports: 'switch and power meter',
        fromZigbee: [fz.on_off, fz.RZHAC_4256251_power],
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
        zigbeeModel: ['4257050-ZHAC'],
        model: '4257050-ZHAC',
        vendor: 'Centralite',
        description: '3-Series smart dimming outlet',
        supports: 'on/off, brightness, power measurement',
        fromZigbee: [fz.restorable_brightness, fz.on_off, fz.electrical_measurement_power],
        toZigbee: [tz.light_onoff_restorable_brightness],
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'haElectricalMeasurement']);
            await configureReporting.onOff(endpoint);
            await readEletricalMeasurementPowerConverterAttributes(endpoint);
            await configureReporting.rmsVoltage(endpoint, {change: 2}); // Voltage reports in V
            await configureReporting.rmsCurrent(endpoint, {change: 10}); // Current reports in mA
            await configureReporting.activePower(endpoint, {change: 2}); // Power reports in 0.1W
        },
    },
    {
        zigbeeModel: ['4257050-RZHAC'],
        model: '4257050-RZHAC',
        vendor: 'Centralite',
        description: '3-Series smart outlet',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.electrical_measurement_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await configureReporting.onOff(endpoint);
            try {
                await readEletricalMeasurementPowerConverterAttributes(endpoint);
            } catch (exception) {
                // For some this fails so set manually
                // https://github.com/Koenkk/zigbee2mqtt/issues/3575
                endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                    acCurrentDivisor: 10,
                    acCurrentMultiplier: 1,
                    powerMultiplier: 1,
                    powerDivisor: 10,
                });
            }
            await configureReporting.rmsVoltage(endpoint, {change: 2}); // Voltage reports in V
            await configureReporting.rmsCurrent(endpoint, {change: 10}); // Current reports in mA
            await configureReporting.activePower(endpoint, {change: 2}); // Power reports in 0.1W
        },
    },
    {
        zigbeeModel: ['3323-G'],
        model: '3323-G',
        vendor: 'Centralite',
        description: 'Micro-door sensor',
        supports: 'contact, temperature',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await configureReporting.temperature(endpoint);
        },
    },
    {
        zigbeeModel: ['3400-D'],
        model: '3400-D',
        vendor: 'CentraLite',
        description: '3-Series security keypad',
        supports: 'action, arm',
        meta: {configureKey: 1, commandArmIncludeTransaction: true},
        fromZigbee: [fz.command_arm, fz.temperature, fz.battery],
        toZigbee: [tz.arm_mode],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const clusters = ['msTemperatureMeasurement', 'genPowerCfg', 'ssIasZone', 'ssIasAce'];
            await bind(endpoint, coordinatorEndpoint, clusters);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryVoltage(endpoint);
        },
        onEvent: async (type, data, device) => {
            if (type === 'message' && data.type === 'commandGetPanelStatus' && data.cluster === 'ssIasAce' &&
                globalStore.hasValue(device.ieeeAddr, 'panelStatus')) {
                const payload = {
                    panelstatus: globalStore.getValue(device.ieeeAddr, 'panelStatus'),
                    secondsremain: 0x00, audiblenotif: 0x00, alarmstatus: 0x00,
                };
                await device.getEndpoint(1).commandResponse(
                    'ssIasAce', 'getPanelStatusRsp', payload, {}, data.meta.zclTransactionSequenceNumber,
                );
            }
        },
    },
    {
        zigbeeModel: ['3420'],
        model: '3420-G',
        vendor: 'Centralite',
        description: '3-Series night light repeater',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['3157100'],
        model: '3157100',
        vendor: 'Centralite',
        description: '3-Series pearl touch thermostat,',
        supports: 'temperature, heating/cooling system control, fan',
        fromZigbee: [
            fz.battery_3V_2100,
            fz.thermostat_att_report,
            fz.generic_fan_mode,
            fz.ignore_time_read,
        ],
        toZigbee: [
            tz.factory_reset, tz.thermostat_local_temperature, tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint, tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_unoccupied_heating_setpoint, tz.thermostat_unoccupied_cooling_setpoint,
            tz.thermostat_setpoint_raise_lower, tz.thermostat_remote_sensing,
            tz.thermostat_control_sequence_of_operation, tz.thermostat_system_mode, tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule, tz.thermostat_relay_status_log, tz.fan_mode,
        ],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'hvacThermostat', 'hvacFanCtrl']);
            await configureReporting.batteryVoltage(endpoint);
            await configureReporting.thermostatRunningState(endpoint);
            await configureReporting.thermostatTemperature(endpoint);
            await configureReporting.fanMode(endpoint);
        },
    },

    // Blaupunkt
    {
        zigbeeModel: ['SCM-2_00.00.03.15', 'SCM-R_00.00.03.15TC', 'SCM_00.00.03.14TC', 'SCM_00.00.03.05TC'],
        model: 'SCM-S1',
        vendor: 'Blaupunkt',
        description: 'Roller shutter',
        supports: 'open/close',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff],
        toZigbee: [tz.cover_position_via_brightness, tz.cover_open_close_via_brightness],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genLevelCtrl']);
            await configureReporting.brightness(endpoint);
        },
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
        zigbeeModel: ['SCM-3-OTA_00.00.03.16TC'],
        model: 'LS12128',
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
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await configureReporting.instantaneousDemand(endpoint);
        },
    },
    {
        zigbeeModel: ['PRS3CH1_00.00.05.10TC'],
        model: '12126',
        vendor: 'Lupus',
        description: '1 chanel relay',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['PRS3CH2_00.00.05.10TC'],
        model: '12127',
        vendor: 'Lupus',
        description: '2 chanel relay',
        supports: 'on/off',
        fromZigbee: [fz.on_off, fz.linkquality_from_basic],
        toZigbee: [tz.on_off],
        meta: {multiEndpoint: true, configureKey: 2},
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            const endpoint2 = device.getEndpoint(2);
            await bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
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
        zigbeeModel: ['PSM_00.00.00.35TC', 'PSMP5_00.00.02.02TC', 'PSMP5_00.00.05.01TC', 'PSMP5_00.00.05.10TC'],
        model: 'PSM-29ZBSR',
        vendor: 'Climax',
        description: 'Power plug',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.metering_power, fz.ignore_basic_report],
        toZigbee: [tz.on_off, tz.ignore_transition],
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await configureReporting.onOff(endpoint);
            await readMeteringPowerConverterAttributes(endpoint);
            await configureReporting.instantaneousDemand(endpoint, {min: 10, change: 2});
        },
        whiteLabel: [
            {vendor: 'Blaupunkt', model: 'PSM-S1'},
        ],
    },
    {
        zigbeeModel: ['RS_00.00.02.06TC'],
        model: 'RS-23ZBS',
        vendor: 'Climax',
        description: 'Temperature & humidity sensor',
        supports: 'temperature, humidity',
        fromZigbee: [fz.temperature, fz.humidity],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'msRelativeHumidity']);
            await configureReporting.temperature(endpoint);
            // configureReporting.humidity(endpoint); not needed and fails
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1312
        },
    },

    // HEIMAN
    {
        zigbeeModel: ['CO_V15', 'CO_YDLV10'],
        model: 'HS1CA-M',
        description: 'Smart carbon monoxide sensor',
        supports: 'carbon monoxide',
        vendor: 'HEIMAN',
        fromZigbee: [fz.ias_carbon_monoxide_alarm_1, fz.battery],
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
        zigbeeModel: ['PIRSensor-N', 'PIRSensor-EM'],
        model: 'HS3MS',
        vendor: 'HEIMAN',
        description: 'Smart motion sensor',
        supports: 'occupancy',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['SmartPlug', 'SmartPlug-N'],
        model: 'HS2SK',
        description: 'Smart metering plug',
        supports: 'on/off, power measurement',
        vendor: 'HEIMAN',
        fromZigbee: [fz.on_off, fz.electrical_measurement_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await configureReporting.onOff(endpoint);
            await readEletricalMeasurementPowerConverterAttributes(endpoint);
            await configureReporting.rmsVoltage(endpoint);
            await configureReporting.rmsCurrent(endpoint);
            await configureReporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: [
            'SMOK_V16',
            'b5db59bfd81e4f1f95dc57fdbba17931',
            '98293058552c49f38ad0748541ee96ba',
            'SMOK_YDLV10',
            'SmokeSensor-EM',
            'FB56-SMF02HM1.4',
        ],
        model: 'HS1SA-M',
        vendor: 'HEIMAN',
        description: 'Smoke detector',
        supports: 'smoke',
        fromZigbee: [
            fz.heiman_smoke,
            fz.battery,
            fz.heiman_smoke_enrolled,

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
        zigbeeModel: ['SmokeSensor-N', 'SmokeSensor-N-3.0', 'SmokeSensor-EF-3.0'],
        model: 'HS3SA',
        vendor: 'HEIMAN',
        description: 'Smoke detector',
        supports: 'smoke',
        fromZigbee: [fz.heiman_smoke, fz.battery],
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
    // Removed support due to:
    // - https://github.com/Koenkk/zigbee2mqtt/issues/2750
    // - https://github.com/Koenkk/zigbee2mqtt/issues/1957
    // {
    //     zigbeeModel: ['RC_V14', 'RC-EM'],
    //     model: 'HS1RC-M',
    //     vendor: 'HEIMAN',
    //     description: 'Smart remote controller',
    //     supports: 'action',
    //     fromZigbee: [
    //         fz.battery,
    //         fz.heiman_smart_controller_armmode, fz.command_emergency,
    //     ],
    //     toZigbee: [],
    // },
    {
        zigbeeModel: ['COSensor-EM', 'COSensor-N'],
        model: 'HS1CA-E',
        vendor: 'HEIMAN',
        description: 'Smart carbon monoxide sensor',
        supports: 'carbon monoxide',
        fromZigbee: [fz.ias_carbon_monoxide_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['WarningDevice', 'WarningDevice-EF-3.0', 'SRHMP-I1'],
        model: 'HS2WD-E',
        vendor: 'HEIMAN',
        description: 'Smart siren',
        supports: 'warning',
        fromZigbee: [fz.battery],
        toZigbee: [tz.warning],
        meta: {disableDefaultResponse: true, configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['SOHM-I1'],
        model: 'SOHM-I1',
        vendor: 'HEIMAN',
        description: 'Door contact sensor',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['SWHM-I1'],
        model: 'SWHM-I1',
        vendor: 'HEIMAN',
        description: 'Water leakage sensor',
        supports: 'water leak',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['SMHM-I1'],
        model: 'SMHM-I1',
        vendor: 'HEIMAN',
        description: 'Smart motion sensor',
        supports: 'occupancy',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['HT-EM', 'TH-EM', 'TH-T_V14'],
        model: 'HS1HT',
        vendor: 'HEIMAN',
        description: 'Smart temperature & humidity Sensor',
        supports: 'temperature and humidity',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery_3V],
        toZigbee: [],
        meta: {configureKey: 2},
        whiteLabel: [
            {vendor: 'Ferguson', model: 'TH-T_V14'},
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await bind(endpoint1, coordinatorEndpoint, ['msTemperatureMeasurement']);
            const endpoint2 = device.getEndpoint(2);
            await bind(endpoint2, coordinatorEndpoint, ['msRelativeHumidity', 'genPowerCfg']);
            await configureReporting.temperature(endpoint1);
            await configureReporting.humidity(endpoint2);
            await configureReporting.batteryVoltage(endpoint2);
            await configureReporting.batteryPercentageRemaining(endpoint2);
        },
    },
    {
        zigbeeModel: ['SKHMP30-I1'],
        model: 'SKHMP30-I1',
        description: 'Smart metering plug',
        supports: 'on/off, power measurement',
        vendor: 'HEIMAN',
        fromZigbee: [fz.on_off, fz.HS2SK_SKHMP30I1_power],
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
        zigbeeModel: ['E_Socket'],
        model: 'HS2ESK-E',
        vendor: 'HEIMAN',
        description: 'Smart in wall plug',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.electrical_measurement_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await configureReporting.onOff(endpoint);
            await readEletricalMeasurementPowerConverterAttributes(endpoint);
            await configureReporting.rmsVoltage(endpoint);
            await configureReporting.rmsCurrent(endpoint);
            await configureReporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: ['SGMHM-I1'],
        model: 'SGMHM-I1',
        vendor: 'HEIMAN',
        description: 'Combustible gas sensor',
        supports: 'gas',
        fromZigbee: [fz.ias_gas_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['STHM-I1H'],
        model: 'STHM-I1H',
        vendor: 'HEIMAN',
        description: 'Heiman temperature & humidity sensor',
        supports: 'temperature and humidity',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery_3V],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg'];
            await bind(endpoint, coordinatorEndpoint, bindClusters);
            await configureReporting.temperature(endpoint);
            await configureReporting.humidity(endpoint, {min: 0, change: 25});
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['SOS-EM'],
        model: 'HS1EB',
        vendor: 'HEIMAN',
        description: 'Smart emergency button',
        supports: 'click',
        fromZigbee: [fz.command_status_change_notification_action, fz.legacy_st_button_state],
        toZigbee: [],
    },
    {
        zigbeeModel: ['GASSensor-EM'],
        model: 'HS1CG-E',
        vendor: 'HEIMAN',
        description: 'Combustible gas sensor',
        supports: 'gas',
        fromZigbee: [fz.ias_gas_alarm_1],
        toZigbee: [],
        whiteLabel: [
            {vendor: 'Piri', model: 'HSIO18008'},
        ],
    },

    // GS
    {
        zigbeeModel: ['BDHM8E27W70-I1'],
        model: 'BDHM8E27W70-I1',
        vendor: 'GS',
        description: 'Active light, warm to cool white (E27 & B22)',
        extend: generic.light_onoff_brightness_colortemp,
    },

    {
        zigbeeModel: ['HS2SW1L-EFR-3.0', 'HS2SW1A-N'],
        model: 'HS2SW1A-N',
        vendor: 'HEIMAN',
        description: 'Smart switch - 1 gang with neutral wire',
        supports: 'on/off',
        fromZigbee: [fz.ignore_basic_report, fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['HS2SW2L-EFR-3.0', 'HS2SW2A-N'],
        model: 'HS2SW2A-N',
        vendor: 'HEIMAN',
        description: 'Smart switch - 2 gang with neutral wire',
        supports: 'on/off',
        fromZigbee: [fz.ignore_basic_report, fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {left: 1, right: 2};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },

    {
        zigbeeModel: ['HS2SW3L-EFR-3.0', 'HS2SW3A-N'],
        model: 'HS2SW3A-N',
        vendor: 'HEIMAN',
        description: 'Smart switch - 3 gang with neutral wire',
        supports: 'on/off',
        fromZigbee: [fz.ignore_basic_report, fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {left: 1, center: 2, right: 3};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
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
        zigbeeModel: ['Ecosmart-ZBT-A19-CCT-Bulb'],
        model: 'A9A19A60WESDZ02',
        vendor: 'EcoSmart',
        description: 'Tuneable white (A19)',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['Ecosmart-ZBT-BR30-CCT-Bulb'],
        model: 'A9BR3065WESDZ02',
        vendor: 'EcoSmart',
        description: 'Tuneable white (BR30)',
        extend: generic.light_onoff_brightness_colortemp,
    },
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
    {
        // eslint-disable-next-line
        zigbeeModel: ['\u0000\u0002\u0000\u0004\u0000\f]�\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e', '\u0000\u0002\u0000\u0004\"�T\u0004\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e', '\u0000\u0002\u0000\u0004\u0000\f^�\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e'],
        model: 'D1533',
        vendor: 'EcoSmart',
        description: 'PAR20 bright white bulb',
        extend: generic.light_onoff_brightness,
    },
    {
        // eslint-disable-next-line
        zigbeeModel: ['\u0000\u0002\u0000\u0004�V\u0000\n\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e', '\u0000\u0002\u0000\u0004��\"�\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u000e'],
        model: 'D1523',
        vendor: 'EcoSmart',
        description: 'A19 soft white bulb',
        extend: generic.light_onoff_brightness,
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
            fz.command_on, fz.legacy_genOnOff_cmdOn, fz.command_off, fz.legacy_genOnOff_cmdOff, fz.CTR_U_brightness_updown_click,
            fz.CTR_U_brightness_updown_hold, fz.CTR_U_brightness_updown_release, fz.command_recall, fz.legacy_CTR_U_scene,
            fz.ignore_basic_report,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['Dimmable-GU10-4713404'],
        model: '4713406',
        vendor: 'Airam',
        description: 'GU10 spot 4.8W 2700K 385lm',
        extend: generic.light_onoff_brightness,
    },

    // Paul Neuhaus
    {
        zigbeeModel: ['NLG-CCT light'],
        model: 'NLG-CCT light',
        vendor: 'Paul Neuhaus',
        description: 'Various color temperature lights (e.g. 100.424.11)',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['Neuhaus NLG-TW light', 'NLG-TW light'],
        model: 'NLG-TW light',
        vendor: 'Paul Neuhaus',
        description: 'Various tunable white lights (e.g. 8195-55)',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['NLG-RGBW light '], // the space as the end is intentional, as this is what the device sends
        model: 'NLG-RGBW light ',
        vendor: 'Paul Neuhaus',
        description: 'Various RGBW lights (e.g. 100.110.39)',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
        endpoint: (device) => {
            return {'default': 2};
        },
    },
    {
        zigbeeModel: ['NLG-RGBW light'],
        model: 'NLG-RGBW light',
        vendor: 'Paul Neuhaus',
        description: 'Various RGBW lights (e.g. 100.111.57)',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['NLG-RGB-TW light'],
        model: 'NLG-RGB-TW light',
        vendor: 'Paul Neuhaus',
        description: 'Various RGB + tunable white lights (e.g. 100.470.92)',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['NLG-plug'],
        model: '100.425.90',
        vendor: 'Paul Neuhaus',
        description: 'Q-PLUG adapter plug with night orientation light',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['JZ-CT-Z01'],
        model: '100.110.51',
        vendor: 'Paul Neuhaus',
        description: 'Q-FLAG LED panel, Smart-Home CCT',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['JZ-RGBW-Z01'],
        model: '100.075.74',
        vendor: 'Paul Neuhaus',
        description: 'Q-VIDAL RGBW ceiling lamp, 6032-55',
        endpoint: (device) => {
            return {'default': 2};
        },
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },

    // iCasa
    {
        zigbeeModel: ['ICZB-IW11D'],
        model: 'ICZB-IW11D',
        vendor: 'iCasa',
        description: 'ZigBee AC dimmer',
        extend: generic.light_onoff_brightness,
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ICZB-IW11SW'],
        model: 'ICZB-IW11SW',
        vendor: 'iCasa',
        description: 'Zigbee 3.0 AC switch',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ICZB-KPD14S'],
        model: 'ICZB-KPD14S',
        vendor: 'iCasa',
        description: 'Zigbee 3.0 Keypad Pulse 4S',
        supports: 'click, action, brightness, scenes',
        fromZigbee: [
            fz.command_recall, fz.legacy_scenes_recall_click, fz.command_on, fz.legacy_genOnOff_cmdOn, fz.command_off,
            fz.legacy_genOnOff_cmdOff, fz.battery, fz.legacy_cmd_move_with_onoff, fz.legacy_cmd_stop_with_onoff,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['ICZB-KPD18S'],
        model: 'ICZB-KPD18S',
        vendor: 'iCasa',
        description: 'Zigbee 3.0 Keypad Pulse 8S',
        supports: 'click, action, brightness, scenes',
        fromZigbee: [
            fz.command_recall, fz.legacy_scenes_recall_click, fz.command_on, fz.legacy_genOnOff_cmdOn, fz.command_off,
            fz.legacy_genOnOff_cmdOff, fz.battery, fz.legacy_cmd_move_with_onoff, fz.legacy_cmd_stop_with_onoff,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['ICZB-FC'],
        model: 'ICZB-B1FC60/B3FC64/B2FC95/B2FC125',
        vendor: 'iCasa',
        description: 'Zigbee 3.0 Filament Lamp 60/64/95/125 mm, 806 lumen, dimmable, clear',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['ICZB-R11D'],
        model: 'ICZB-R11D',
        vendor: 'iCasa',
        description: 'Zigbee AC dimmer',
        extend: generic.light_onoff_brightness,
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await configureReporting.onOff(endpoint);
        },
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
    {
        // Busch-Jaeger 6735, 6736, and 6737 have been tested with the 6710 U (Power Adapter) and
        // 6711 U (Relay) back-ends. The dimmer has not been verified to work yet, though it's
        // safe to assume that it can at least been turned on or off with this integration.
        //
        // In order to manually capture scenes as described in the devices manual, the endpoint
        // corresponding to the row needs to be unbound (https://www.zigbee2mqtt.io/information/binding.html)
        // If that operation was successful, the switch will respond to button presses on that
        // by blinking multiple times (vs. just blinking once if it's bound).
        zigbeeModel: ['RM01', 'RB01'],
        model: '6735/6736/6737',
        vendor: 'Busch-Jaeger',
        description: 'Zigbee Light Link power supply/relay/dimmer',
        supports: 'on/off and level control for 6715',
        endpoint: (device) => {
            return {'row_1': 0x0a, 'row_2': 0x0b, 'row_3': 0x0c, 'row_4': 0x0d, 'relay': 0x12};
        },
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            let firstEndpoint = 0x0a;

            const switchEndpoint10 = device.getEndpoint(10);
            if (switchEndpoint10 != null && switchEndpoint10.supportsOutputCluster('genOnOff')) {
                // https://github.com/Koenkk/zigbee2mqtt/issues/3027#issuecomment-606169628
                await bind(switchEndpoint10, coordinatorEndpoint, ['genOnOff']);
            }

            const switchEndpoint12 = device.getEndpoint(0x12);
            if (switchEndpoint12 != null) {
                firstEndpoint++;
                await bind(switchEndpoint12, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            }

            // Depending on the actual devices - 6735, 6736, or 6737 - there are 1, 2, or 4 endpoints.
            for (let i = firstEndpoint; i <= 0x0d; i++) {
                const endpoint = device.getEndpoint(i);
                if (endpoint != null) {
                    // The total number of bindings seems to be severely limited with these devices.
                    // In order to be able to toggle groups, we need to remove the scenes cluster
                    const index = endpoint.outputClusters.indexOf(5);
                    if (index > -1) {
                        endpoint.outputClusters.splice(index, 1);
                    }
                    await bind(endpoint, coordinatorEndpoint, ['genLevelCtrl']);
                }
            }
        },
        fromZigbee: [
            fz.ignore_basic_report, fz.on_off, fz.brightness, fz.RM01_on_click, fz.RM01_off_click,
            fz.RM01_up_hold, fz.RM01_down_hold, fz.RM01_stop,
        ],
        toZigbee: [tz.RM01_on_off, tz.RM01_light_brightness],
        onEvent: async (type, data, device) => {
            const switchEndpoint = device.getEndpoint(0x12);
            if (switchEndpoint == null) {
                return;
            }

            // This device doesn't support reporting.
            // Therefore we read the on/off state every 5 seconds.
            // This is the same way as the Hue bridge does it.
            if (type === 'stop') {
                clearInterval(store[device.ieeeAddr]);
            } else if (!store[device.ieeeAddr]) {
                store[device.ieeeAddr] = setInterval(async () => {
                    try {
                        await switchEndpoint.read('genOnOff', ['onOff']);
                        await switchEndpoint.read('genLevelCtrl', ['currentLevel']);
                    } catch (error) {
                        // Do nothing
                    }
                }, 5000);
            }
        },
    },

    // Müller Licht
    {
        zigbeeModel: ['ZBT-ExtendedColor'],
        model: '404000/404005/404012',
        vendor: 'Müller Licht',
        description: 'Tint LED bulb GU10/E14/E27 350/470/806 lumen, dimmable, color, opal white',
        supports: generic.light_onoff_brightness_colortemp_colorxy.supports,
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy.fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy.toZigbee.concat([tz.tint_scene]),
    },
    {
        zigbeeModel: ['ZBT-ColorTemperature'],
        model: '404006/404008/404004',
        vendor: 'Müller Licht',
        description: 'Tint LED bulb GU10/E14/E27 350/470/806 lumen, dimmable, opal white',
        supports: generic.light_onoff_brightness_colortemp.supports,
        fromZigbee: generic.light_onoff_brightness_colortemp.fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp.toZigbee.concat([tz.tint_scene]),
    },
    {
        zigbeeModel: ['RGBW Lighting'],
        model: '44435',
        vendor: 'Müller Licht',
        description: 'Tint LED Stripe, color, opal white',
        supports: generic.light_onoff_brightness_colortemp_colorxy.supports,
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy.fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy.toZigbee.concat([tz.tint_scene]),
    },
    {
        zigbeeModel: ['RGB-CCT'],
        model: '404028',
        vendor: 'Müller Licht',
        description: 'Tint LED Panel, color, opal white',
        supports: generic.light_onoff_brightness_colortemp_colorxy.supports,
        fromZigbee: generic.light_onoff_brightness_colortemp_colorxy.fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp_colorxy.toZigbee.concat([tz.tint_scene]),
    },
    {
        zigbeeModel: ['ZBT-Remote-ALL-RGBW'],
        model: 'MLI-404011',
        description: 'Tint remote control',
        supports: 'action; multi-group actions are not supported yet!',
        vendor: 'Müller Licht',
        fromZigbee: [
            fz.command_on, fz.command_off, fz.command_toggle, fz.tint404011_brightness_updown_click,
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
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['tint-ColorTemperature'],
        model: '404037',
        vendor: 'Müller Licht',
        description: 'Tint retro filament LED-bulb E27, Edison bulb gold, white+ambiance (1800-6500K), dimmable, 5,5W',
        supports: generic.light_onoff_brightness_colortemp.supports,
        fromZigbee: generic.light_onoff_brightness_colortemp.fromZigbee,
        toZigbee: generic.light_onoff_brightness_colortemp.toZigbee.concat([tz.tint_scene]),
    },
    {
        fingerprint: [{
            // Identify through fingerprint as modelID is the same as Sunricher ZG192910-4
            type: 'Router', manufacturerID: 4635, manufacturerName: 'MLI', modelID: 'CCT Lighting',
            powerSource: 'Mains (single phase)', endpoints: [
                {ID: 1, profileID: 49246, deviceID: 544, inputClusters: [0, 3, 4, 5, 6, 8, 768, 2821, 4096], outputClusters: [25]},
                {ID: 242, profileID: 41440, deviceID: 102, inputClusters: [33], outputClusters: [33]},
            ],
        }],
        model: '404031',
        vendor: 'Müller Licht',
        description: 'Tint Armaro',
        extend: generic.light_onoff_brightness_colortemp,
    },

    // Salus Controls
    {
        zigbeeModel: ['SPE600'],
        model: 'SPE600',
        vendor: 'Salus Controls',
        description: 'Smart plug (EU socket)',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.metering_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await configureReporting.onOff(endpoint);
            await configureReporting.instantaneousDemand(endpoint, {min: 5, change: 10});
            await configureReporting.currentSummDelivered(endpoint, {min: 5, change: [0, 10]});
            await endpoint.read('seMetering', ['multiplier', 'divisor']);
        },
        ota: ota.salus,
    },
    {
        zigbeeModel: ['SP600'],
        model: 'SP600',
        vendor: 'Salus Controls',
        description: 'Smart plug (UK socket)',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.SP600_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(9);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await configureReporting.onOff(endpoint);
            await configureReporting.instantaneousDemand(endpoint, {min: 5, change: 10});
            await configureReporting.currentSummDelivered(endpoint, {min: 5, change: [0, 10]});
            await endpoint.read('seMetering', ['multiplier', 'divisor']);
        },
        ota: ota.salus,
    },

    // AduroSmart
    {
        zigbeeModel: ['ZLL-ExtendedColo'],
        model: '81809/81813',
        vendor: 'AduroSmart',
        description: 'ERIA colors and white shades smart light bulb A19/BR30',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
        meta: {applyRedFix: true},
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
        fromZigbee: [fz.command_on, fz.command_off, fz.eria_81825_updown],
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
        fromZigbee: [fz.eurotronic_thermostat, fz.battery],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_local_temperature_calibration, tz.eurotronic_thermostat_system_mode,
            tz.eurotronic_host_flags, tz.eurotronic_error_status, tz.thermostat_setpoint_raise_lower,
            tz.thermostat_control_sequence_of_operation, tz.thermostat_remote_sensing,
            tz.eurotronic_current_heating_setpoint, tz.eurotronic_trv_mode, tz.eurotronic_valve_position,
            tz.thermostat_local_temperature,
        ],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: 4151};
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'hvacThermostat']);
            await configureReporting.thermostatTemperature(endpoint, {min: 0, max: repInterval.MINUTES_10, change: 25});
            await configureReporting.thermostatPIHeatingDemand(
                endpoint, {min: 0, max: repInterval.MINUTES_10, change: 1},
            );
            await configureReporting.thermostatOccupiedHeatingSetpoint(
                endpoint, {min: 0, max: repInterval.MINUTES_10, change: 25},
            );
            await configureReporting.thermostatUnoccupiedHeatingSetpoint(
                endpoint, {min: 0, max: repInterval.MINUTES_10, change: 25},
            );
            await endpoint.configureReporting('hvacThermostat', [{
                attribute: {ID: 0x4003, type: 41},
                minimumReportInterval: 0,
                maximumReportInterval: repInterval.MINUTES_10,
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
        // eslint-disable-next-line
        description: 'Zigbee switch (1 and 2 gang) [work in progress](https://github.com/Koenkk/zigbee2mqtt/issues/592)',
        vendor: 'Livolo',
        supports: 'on/off',
        fromZigbee: [fz.livolo_switch_state, fz.livolo_switch_state_raw],
        toZigbee: [tz.livolo_switch_on_off],
        endpoint: (device) => {
            return {'left': 6, 'right': 6};
        },
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            await livolo.poll(device);
        },
        onEvent: async (type, data, device) => {
            if (type === 'stop') {
                clearInterval(store[device.ieeeAddr]);
            }
            if (['start', 'deviceAnnounce'].includes(type)) {
                await livolo.poll(device);
                if (!store[device.ieeeAddr]) {
                    store[device.ieeeAddr] = setInterval(async () => {
                        await livolo.poll(device);
                    }, 300*1000); // Every 300 seconds
                }
            }
        },
    },
    {
        zigbeeModel: ['TI0001-switch'],
        model: 'TI0001-switch',
        // eslint-disable-next-line
        description: 'New Zigbee Switch [work in progress](https://github.com/Koenkk/zigbee2mqtt/issues/3560)',
        vendor: 'Livolo',
        supports: 'on/off',
        fromZigbee: [fz.livolo_new_switch_state],
        toZigbee: [tz.livolo_socket_switch_on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            await livolo.poll(device);
        },
        onEvent: async (type, data, device) => {
            if (type === 'stop') {
                clearInterval(store[device.ieeeAddr]);
            }
            if (['start', 'deviceAnnounce'].includes(type)) {
                await livolo.poll(device);
                if (!store[device.ieeeAddr]) {
                    store[device.ieeeAddr] = setInterval(async () => {
                        await livolo.poll(device);
                    }, 300*1000); // Every 300 seconds
                }
            }
        },
    },
    {
        zigbeeModel: ['TI0001-socket'],
        model: 'TI0001-socket',
        // eslint-disable-next-line
        description: 'New Zigbee Socket [work in progress](https://github.com/Koenkk/zigbee2mqtt/issues/3560)',
        vendor: 'Livolo',
        supports: 'on/off',
        fromZigbee: [fz.livolo_socket_state],
        toZigbee: [tz.livolo_socket_switch_on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            await livolo.poll(device);
        },
        onEvent: async (type, data, device) => {
            if (type === 'stop') {
                clearInterval(store[device.ieeeAddr]);
            }
            if (['start', 'deviceAnnounce'].includes(type)) {
                await livolo.poll(device);
                if (!store[device.ieeeAddr]) {
                    store[device.ieeeAddr] = setInterval(async () => {
                        await livolo.poll(device);
                    }, 300*1000); // Every 300 seconds
                }
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
        fromZigbee: [fz.temperature, fz.battery_3V, fz.ias_occupancy_alarm_1],
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
            fz.battery_3V, fz.ias_occupancy_alarm_1,
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
        model: '07005B',
        vendor: 'Immax',
        description: 'Neo SMART LED E14 5W warm white, dimmable, Zigbee 3.0',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['IM-Z3.0-RGBW'],
        model: '07004D',
        vendor: 'Immax',
        description: 'Neo SMART LED E27 8,5W color, dimmable, Zigbee 3.0',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['IM-Z3.0-RGBCCT'],
        model: '07008L',
        vendor: 'Immax',
        description: 'Neo SMART LED strip RGB + CCT, color, dimmable, Zigbee 3.0',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['Keyfob-ZB3.0'],
        model: '07046L',
        vendor: 'Immax',
        description: '4-Touch single click buttons',
        supports: 'action',
        fromZigbee: [fz.immax_07046L_arm, fz.command_panic],
        toZigbee: [],
    },
    {
        zigbeeModel: ['DoorWindow-Sensor-ZB3.0'],
        model: '07045L',
        vendor: 'Immax',
        description: 'Magnetic contact sensor',
        supports: 'contact, tamper',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['Plug-230V-ZB3.0'],
        model: '07048L',
        vendor: 'Immax',
        description: 'NEO SMART plug',
        supports: 'on/off, power and energy measurement',
        fromZigbee: [fz.on_off, fz.electrical_measurement_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 9},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await configureReporting.onOff(endpoint);
            await readEletricalMeasurementPowerConverterAttributes(endpoint);
            await configureReporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: ['Bulb-RGB+CCT-ZB3.0'],
        model: '07115L',
        vendor: 'Immax',
        description: 'Neo SMART LED E27 9W RGB + CCT, dimmable, Zigbee 3.0',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },

    // Yale
    {
        zigbeeModel: ['YRD446 BLE TSDB'],
        model: 'YRD426NRSC',
        vendor: 'Yale',
        description: 'Assure lock',
        supports: 'lock/unlock, battery',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.generic_lock],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
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
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.generic_lock],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
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
            fz.battery,

        ],
        toZigbee: [tz.generic_lock],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await configureReporting.lockState(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['iZBModule01', '0700000001'],
        model: 'YMF40/YDM4109+',
        vendor: 'Yale',
        description: 'Real living lock / Intelligent biometric digital lock',
        supports: 'lock/unlock, battery',
        fromZigbee: [fz.lock_operation_event, fz.battery, fz.lock],
        toZigbee: [tz.generic_lock],
        // Increased timeout needed: https://github.com/Koenkk/zigbee2mqtt/issues/3290 for YDM4109+
        meta: {configureKey: 2, timeout: 20000},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
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
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery_not_divided],
        toZigbee: [tz.generic_lock],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await configureReporting.lockState(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['YRL220 TS LL'],
        // The zigbee module card indicate that the module will work on YRD 221 and YRD 221RL also
        model: 'YRL-220L',
        vendor: 'Yale',
        description: 'Real living keyless leveler lock',
        supports: 'lock/unlock, battery',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery_not_divided],
        toZigbee: [tz.generic_lock],
        meta: {configureKey: 1},
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
        fromZigbee: [fz.lock, fz.battery, fz.lock_operation_event],
        toZigbee: [tz.generic_lock],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await configureReporting.lockState(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['YRD220/240 TSDB'],
        model: 'YRD220/YRD221',
        vendor: 'Yale',
        description: 'Lockwood keyless push button deadbolt lock',
        supports: 'lock/unlock, battery',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery_not_divided],
        toZigbee: [tz.generic_lock],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await configureReporting.lockState(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['YRD246 TSDB'],
        model: 'YRD246HA20BP',
        vendor: 'Yale',
        description: 'Assure lock key free deadbolt with Zigbee',
        supports: 'lock/unlock, battery',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery_not_divided],
        toZigbee: [tz.generic_lock],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await configureReporting.lockState(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },

    // Weiser
    {
        zigbeeModel: ['SMARTCODE_DEADBOLT_10'],
        model: '9GED18000-009',
        vendor: 'Weiser',
        description: 'SmartCode 10',
        supports: 'lock/unlock, battery, pin code programming',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery, fz.lock_programming_event, fz.lock_pin_code_rep],
        toZigbee: [tz.generic_lock, tz.pincode_lock],
        meta: {configureKey: 4, pinCodeCount: 30},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await configureReporting.lockState(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
        // Note - Keypad triggered deletions do not cause a zigbee event, though Adds work fine.
        onEvent: pincodeLock.readPinCodeAfterProgramming,
    },
    {
        zigbeeModel: ['SMARTCODE_DEADBOLT_10T'],
        model: '9GED21500-005',
        vendor: 'Weiser',
        description: 'SmartCode 10 Touch',
        supports: 'lock/unlock, battery',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.generic_lock],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await configureReporting.lockState(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },

    // Keen Home
    {
        zigbeeModel: [
            'SV01-410-MP-1.0', 'SV01-410-MP-1.1', 'SV01-410-MP-1.4', 'SV01-410-MP-1.5', 'SV01-412-MP-1.0',
            'SV01-412-MP-1.4', 'SV01-610-MP-1.0', 'SV01-612-MP-1.0',
        ],
        model: 'SV01',
        vendor: 'Keen Home',
        description: 'Smart vent',
        supports: 'open, close, position, temperature, pressure, battery',
        fromZigbee: [
            fz.cover_position_via_brightness, fz.temperature,
            fz.battery_not_divided, fz.keen_home_smart_vent_pressure,
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
            fz.battery_not_divided, fz.keen_home_smart_vent_pressure,
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
        fromZigbee: [fz.cover_position_via_brightness, fz.battery_not_divided],
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
        meta: {disableDefaultResponse: true, configureKey: 1},
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
        zigbeeModel: ['895a2d80097f4ae2b2d40500d5e03dcc', '700ae5aab3414ec09c1872efe7b8755a'],
        model: 'LVS-SN10ZW_SN11',
        vendor: 'LivingWise',
        description: 'Occupancy sensor',
        supports: 'occupancy',
        fromZigbee: [fz.battery, fz.ias_occupancy_alarm_1_with_timeout],
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
    {
        zigbeeModel: ['75d430d66c164c26ac8601c05932dc94'],
        model: 'LVS-SC7',
        vendor: 'LivingWise',
        description: 'Scene controller ',
        supports: 'action',
        fromZigbee: [fz.orvibo_raw2],
        toZigbee: [],
    },

    // Vimar
    {
        zigbeeModel: ['2_Way_Switch_v1.0'],
        model: '14592.0',
        vendor: 'Vimar',
        description: '2-way switch IoT connected mechanism',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(10);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },

    // Stelpro
    {
        zigbeeModel: ['ST218'],
        model: 'ST218',
        vendor: 'Stelpro',
        description: 'Ki convector, line-voltage thermostat',
        supports: 'temperature',
        fromZigbee: [fz.thermostat_att_report, fz.stelpro_thermostat, fz.hvac_user_interface],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupancy,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.stelpro_thermostat_outdoor_temperature,
        ],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(25);
            const binds = [
                'genBasic',
                'genIdentify',
                'genGroups',
                'hvacThermostat',
                'hvacUserInterfaceCfg',
                'msTemperatureMeasurement',
            ];
            await bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro Ki
            await configureReporting.thermostatTemperature(endpoint, {min: 10, max: 60, change: 50});
            await configureReporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 1, max: 0, change: 50});
            await configureReporting.thermostatSystemMode(endpoint, {min: 1, max: 0});
            await configureReporting.thermostatPIHeatingDemand(endpoint, {min: 1, max: 900, change: 5});
            await configureReporting.thermostatKeypadLockMode(endpoint, {min: 1, max: 0});

            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'StelproSystemMode', // cluster 0x0201 attribute 0x401c
                minimumReportInterval: 1,
                maximumReportInterval: 0,
            }]);
        },
    },
    {
        zigbeeModel: ['STZB402+', 'STZB402'],
        model: 'STZB402',
        vendor: 'Stelpro',
        description: 'Ki, line-voltage thermostat',
        supports: 'temperature',
        fromZigbee: [
            fz.thermostat_att_report,
            fz.stelpro_thermostat,
            fz.hvac_user_interface,
            fz.humidity,
        ],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupancy,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.stelpro_thermostat_outdoor_temperature,
        ],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(25);
            const binds = [
                'genBasic',
                'genIdentify',
                'genGroups',
                'hvacThermostat',
                'hvacUserInterfaceCfg',
                'msTemperatureMeasurement',
            ];
            await bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro Ki
            await configureReporting.thermostatTemperature(endpoint, {min: 10, max: 60, change: 50});
            await configureReporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 1, max: 0, change: 50});
            await configureReporting.thermostatSystemMode(endpoint, {min: 1, max: 0});
            await configureReporting.thermostatPIHeatingDemand(endpoint, {min: 1, max: 900, change: 5});
            await configureReporting.thermostatKeypadLockMode(endpoint, {min: 1, max: 0});

            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'StelproSystemMode', // cluster 0x0201 attribute 0x401c
                minimumReportInterval: 1,
                maximumReportInterval: 0,
            }]);
        },
    },
    {
        zigbeeModel: ['MaestroStat'],
        model: 'SMT402',
        vendor: 'Stelpro',
        description: 'Maestro, line-voltage thermostat',
        supports: 'temperature, humidity, outdoor temp display',
        fromZigbee: [
            fz.thermostat_att_report,
            fz.stelpro_thermostat,
            fz.hvac_user_interface,
            fz.humidity,
        ],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupancy,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.stelpro_thermostat_outdoor_temperature,
        ],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(25);
            const binds = [
                'genBasic',
                'genIdentify',
                'genGroups',
                'hvacThermostat',
                'hvacUserInterfaceCfg',
                'msRelativeHumidity',
                'msTemperatureMeasurement',
            ];
            await bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro Maestro
            await configureReporting.thermostatTemperature(endpoint, {min: 10, max: 60, change: 50});
            await configureReporting.humidity(endpoint, {min: 10, max: 300, change: 1});
            await configureReporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 1, max: 0, change: 50});
            await configureReporting.thermostatSystemMode(endpoint, {min: 1, max: 0});
            await configureReporting.thermostatPIHeatingDemand(endpoint, {min: 1, max: 900, change: 5});
            await configureReporting.thermostatKeypadLockMode(endpoint, {min: 1, max: 0});

            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'StelproSystemMode', // cluster 0x0201 attribute 0x401c
                minimumReportInterval: 1,
                maximumReportInterval: 0,
            }]);
        },
    },
    {
        zigbeeModel: ['SMT402AD'],
        model: 'SMT402AD',
        vendor: 'Stelpro',
        description: 'Maestro, line-voltage thermostat',
        supports: 'temperature, humidity, outdoor temp display',
        fromZigbee: [
            fz.thermostat_att_report,
            fz.stelpro_thermostat,
            fz.hvac_user_interface,
            fz.humidity,
        ],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupancy,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.stelpro_thermostat_outdoor_temperature,
        ],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(25);
            const binds = [
                'genBasic',
                'genIdentify',
                'genGroups',
                'hvacThermostat',
                'hvacUserInterfaceCfg',
                'msRelativeHumidity',
                'msTemperatureMeasurement',
            ];
            await bind(endpoint, coordinatorEndpoint, binds);

            // Those exact parameters (min/max/change) are required for reporting to work with Stelpro Maestro
            await configureReporting.thermostatTemperature(endpoint, {min: 10, max: 60, change: 50});
            await configureReporting.humidity(endpoint, {min: 10, max: 300, change: 1});
            await configureReporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 1, max: 0, change: 50});
            await configureReporting.thermostatSystemMode(endpoint, {min: 1, max: 0});
            await configureReporting.thermostatPIHeatingDemand(endpoint, {min: 1, max: 900, change: 5});
            await configureReporting.thermostatKeypadLockMode(endpoint, {min: 1, max: 0});

            await endpoint.configureReporting('hvacThermostat', [{
                attribute: 'StelproSystemMode', // cluster 0x0201 attribute 0x401c
                minimumReportInterval: 1,
                maximumReportInterval: 0,
            }]);
        },
    },

    // Nyce
    {
        zigbeeModel: ['3011'],
        model: 'NCZ-3011-HA',
        vendor: 'Nyce',
        description: 'Door/window sensor',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
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
            fz.battery_not_divided, fz.ignore_iaszone_report,
            fz.ias_occupancy_alarm_2,
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
            fz.battery_not_divided, fz.ignore_iaszone_report,
            fz.ias_occupancy_alarm_2,
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
            fz.battery_not_divided, fz.ignore_iaszone_report,
            fz.ias_occupancy_alarm_2,
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
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await endpoint.read('haElectricalMeasurement', [
                'acVoltageMultiplier', 'acVoltageDivisor', 'acCurrentMultiplier',
                'acCurrentDivisor', 'acPowerMultiplier', 'acPowerDivisor',
            ]);
            await configureReporting.onOff(endpoint);
            await configureReporting.rmsVoltage(endpoint, {change: 110}); // Voltage reports in 0.00458V
            await configureReporting.rmsCurrent(endpoint, {change: 55}); // Current reports in 0.00183A
            await configureReporting.activePower(endpoint, {change: 2}); // Power reports in 0.261W
        },
    },
    {
        zigbeeModel: ['ZB2-BU01'],
        model: 'B01M7Y8BP9',
        vendor: 'Securifi',
        description: 'Almond Click multi-function button',
        supports: 'single, double and long click',
        fromZigbee: [fz.almond_click],
        toZigbee: [],
    },

    // Visonic
    {
        zigbeeModel: ['MP-841'],
        model: 'MP-841',
        vendor: 'Visonic',
        description: 'Motion sensor',
        supports: 'occupancy',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['MCT-370 SMA'],
        model: 'MCT-370 SMA',
        vendor: 'Visonic',
        description: 'Magnetic door & window contact sensor',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
    },
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
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery_cr2032, fz.ignore_zclversion_read],
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
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery_cr2032, fz.ignore_zclversion_read],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await configureReporting.temperature(endpoint);
            await configureReporting.batteryVoltage(endpoint);
        },
    },

    // Sunricher
    {
        zigbeeModel: ['ZGRC-TEUR-005'],
        model: 'SR-ZG9001T4-DIM-EU',
        vendor: 'Sunricher',
        supports: 'action',
        description: 'Zigbee wireless touch dimmer switch',
        fromZigbee: [fz.command_recall, fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop],
        toZigbee: [],
    },
    {
        zigbeeModel: ['CCT Lighting'],
        model: 'ZG192910-4',
        vendor: 'Sunricher',
        description: 'Zigbee LED-controller',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['ZG9101SAC-HP'],
        model: 'ZG9101SAC-HP',
        vendor: 'Sunricher',
        description: 'ZigBee AC phase-cut dimmer',
        extend: generic.light_onoff_brightness,
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ON/OFF', 'ZIGBEE-SWITCH'],
        model: 'ZG9101SAC-HP-Switch',
        vendor: 'Sunricher',
        description: 'Zigbee AC in wall switch',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['Micro Smart Dimmer'],
        model: 'ZG2835RAC',
        vendor: 'Sunricher',
        description: 'ZigBee knob smart dimmer',
        supports: generic.light_onoff_brightness.supports + ', power measurements',
        fromZigbee: generic.light_onoff_brightness.fromZigbee.concat(
            [fz.electrical_measurement_power, fz.metering_power, fz.ignore_genOta],
        ),
        toZigbee: generic.light_onoff_brightness.toZigbee,
        meta: {configureKey: 2},
        whiteLabel: [
            {vendor: 'YPHIX', model: '50208695'},
            {vendor: 'Samotech', model: 'SM311'},
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genOnOff', 'genLevelCtrl', 'haElectricalMeasurement', 'seMetering',
            ];
            await bind(endpoint, coordinatorEndpoint, binds);

            await configureReporting.onOff(endpoint);
            await configureReporting.brightness(endpoint);
            await readEletricalMeasurementPowerConverterAttributes(endpoint);
            await configureReporting.activePower(endpoint);
            await configureReporting.rmsCurrent(endpoint, {min: 10, change: 10});
            await configureReporting.rmsVoltage(endpoint, {min: 10});
            await readMeteringPowerConverterAttributes(endpoint);
            await configureReporting.currentSummDelivered(endpoint);
        },
    },

    // Samotech
    {
        zigbeeModel: ['SM308'],
        model: 'SM308',
        vendor: 'Samotech',
        description: 'Zigbee AC in wall switch',
        supports: 'on/off',
        fromZigbee: [fz.on_off, fz.ignore_genOta],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genBasic', 'genIdentify', 'genOnOff']);
        },
    },
    {
        zigbeeModel: ['SM309'],
        model: 'SM309',
        vendor: 'Samotech',
        description: 'ZigBee dimmer 400W',
        extend: generic.light_onoff_brightness,
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await configureReporting.onOff(endpoint);
        },
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
        zigbeeModel: ['HOMA1002', 'HOMA0019', 'HOMA0006'],
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
    {
        zigbeeModel: ['HOMA1005'],
        model: 'HLC614-ZLL',
        vendor: 'Shenzhen Homa',
        description: '3 channel relay module',
        supports: 'on/off',
        fromZigbee: [],
        toZigbee: [tz.on_off],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3};
        },
    },
    {
        zigbeeModel: ['HOMA1064'],
        model: 'HLC833-Z-SC',
        vendor: 'Shenzhen Homa',
        description: 'Wireless dimmable controller',
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
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.generic_lock],
        meta: {configureKey: 5},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await configureReporting.lockState(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },

    // NET2GRID
    {
        zigbeeModel: ['SP31           ', 'SP31'],
        model: 'N2G-SP',
        vendor: 'NET2GRID',
        description: 'White Net2Grid power outlet switch with power meter',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.command_on, fz.legacy_genOnOff_cmdOn, fz.command_off, fz.legacy_genOnOff_cmdOff, fz.on_off,
            fz.metering_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint1);

            const endpoint10 = device.getEndpoint(10);
            await bind(endpoint10, coordinatorEndpoint, ['seMetering']);
            await readMeteringPowerConverterAttributes(endpoint10);
            await configureReporting.instantaneousDemand(endpoint10);
            await configureReporting.currentSummDelivered(endpoint10);
            await configureReporting.currentSummReceived(endpoint10);
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
    {
        zigbeeModel: ['3RSS007Z'],
        model: '3RSS007Z',
        vendor: 'Third Reality',
        description: 'Smart light switch',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off, tz.ignore_transition],
        meta: {disableDefaultResponse: true, configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['3RSL011Z'],
        model: '3RSL011Z',
        vendor: 'Third Reality',
        description: 'Smart light A19',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['3RSL012Z'],
        model: '3RSL012Z',
        vendor: 'Third Reality',
        description: 'Smart light BR30',
        extend: generic.light_onoff_brightness_colortemp,
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
        meta: {disableDefaultResponse: true, configureKey: 1},
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
        description: 'ZigBee 3.0 Dimm-Aktor mini 1x 230V',
        extend: generic.light_onoff_brightness,
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['511.010'],
        model: '511.010',
        vendor: 'Iluminize',
        description: 'Zigbee LED-Controller',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['511.012'],
        model: '511.012',
        vendor: 'Iluminize',
        description: 'Zigbee LED-Controller',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['511.202'],
        model: '511.202',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 Schalt-Aktor mini 1x230V, 200W/400W',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(3);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ZG2801K2-G1-RGB-CCT-LEAD'],
        model: '511.557',
        vendor: 'Iluminize',
        description: 'Zigbee 3.0 wall dimmer',
        supports: 'action',
        fromZigbee: [fz.command_off, fz.command_on, fz.command_move_to_color_temp, fz.command_move_to_color],
        toZigbee: [],
    },
    {
        zigbeeModel: ['RGBW-CCT'],
        model: '511.040',
        vendor: 'Iluminize',
        description: 'ZigBee 3.0 LED-controller, 4 channel 5A, RGBW LED',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ZG2819S-RGBW'],
        model: '511.344',
        vendor: 'Iluminize',
        description: 'Zigbee handheld remote RGBW 4 channels',
        supports: 'action',
        fromZigbee: [
            fz.battery, fz.command_move_to_color, fz.command_move_to_color_temp, fz.command_move_hue,
            fz.command_step, fz.command_recall,
            fz.ZG2819S_command_on, fz.ZG2819S_command_off,
        ],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {ep1: 1, ep2: 2, ep3: 3, ep4: 4};
        },
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
            const endpoint = device.getEndpoint(3) || device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },

    // Insta
    {
        zigbeeModel: [' Remote'],
        model: 'InstaRemote',
        vendor: 'Insta',
        description: 'ZigBee Light Link wall transmitter',
        whiteLabel: [
            {vendor: 'Gira', model: '2430-100'},
            {vendor: 'Jung', model: 'ZLLxx5004M'},
        ],
        supports: 'action',
        fromZigbee: [
            fz.insta_scene_click, fz.command_on, fz.command_off_with_effect, fz.insta_down_hold,
            fz.insta_up_hold, fz.insta_stop,
        ],
        toZigbee: [],
        ota: ota.zigbeeOTA,
    },

    // RGB genie
    {
        zigbeeModel: ['ZGRC-KEY-013'],
        model: 'ZGRC-KEY-013',
        vendor: 'RGB Genie',
        description: '3 Zone remote and dimmer',
        supports: 'click, action',
        fromZigbee: [
            fz.battery_not_divided, fz.command_move, fz.legacy_ZGRC013_brightness_onoff,
            fz.legacy_ZGRC013_brightness, fz.command_stop, fz.legacy_ZGRC013_brightness_stop, fz.command_on,
            fz.legacy_ZGRC013_cmdOn, fz.command_off, fz.legacy_ZGRC013_cmdOff, fz.command_recall,
        ],
        toZigbee: [],
        meta: {configureKey: 1, multiEndpoint: true},
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
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
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
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
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
        zigbeeModel: ['SZ-DWS04', 'SZ-DWS04N_SF'],
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
    {
        zigbeeModel: ['SZ-PIR02_SF', 'SZ-PIR02'],
        model: 'AL-PIR02',
        vendor: 'Sercomm',
        description: 'PIR motion sensor',
        supports: 'occupancy',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery_3V_2100],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
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
        zigbeeModel: ['LED_E27_ORD'],
        model: 'A806S-Q1G',
        vendor: 'Leedarson',
        description: 'LED E27 color',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
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
    {
        zigbeeModel: ['ZBT-CCTSwitch-D0001'],
        model: '6ARCZABZH',
        vendor: 'Leedarson',
        description: '4-Key Remote Controller',
        supports: 'on/off, brightness up/down and click/hold/release, cct',
        fromZigbee: [
            fz.command_on,
            fz.command_off,
            fz.legacy_CCTSwitch_D0001_on_off,
            fz.CCTSwitch_D0001_move_to_level_recall,
            fz.CCTSwitch_D0001_move_to_colortemp_recall,
            fz.CCTSwitch_D0001_colortemp_updown_hold_release,
            fz.CCTSwitch_D0001_brightness_updown_hold_release,
            fz.battery_not_divided,
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
        zigbeeModel: ['TWGU10Bulb02UK'],
        model: '6xy-M350ST-W1Z',
        vendor: 'Leedarson',
        description: 'PAR16 tunable white',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['ZHA-PIRSensor'],
        model: '5AA-SS-ZA-H0',
        vendor: 'Leedarson',
        description: 'Motion sensor',
        supports: 'occupancy, illuminance',
        fromZigbee: [fz.occupancy, fz.illuminance, fz.ignore_occupancy_report],
        toZigbee: [],
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
            fz.command_on, fz.legacy_genOnOff_cmdOn, fz.command_off, fz.legacy_genOnOff_cmdOff, fz.on_off,
            fz.meazon_meter,
        ],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(10);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await configureReporting.onOff(endpoint, {min: 1, max: 0xfffe});
            const options = {manufacturerCode: 4406, disableDefaultResponse: false};
            await endpoint.write('seMetering', {0x1005: {value: 0x063e, type: 25}}, options);
            await endpoint.configureReporting('seMetering', [{
                attribute: {ID: 0x2000, type: 0x29},
                minimumReportInterval: 1,
                maximumReportInterval: repInterval.MINUTES_5,
                reportableChange: 1,
            }], options);
        },
    },
    {
        zigbeeModel: [
            '102.106.000235', '102.106.001111', '102.106.000348', '102.106.000256', '102.106.001242',
            '102.106.000540',
        ],
        model: 'MEAZON_DINRAIL',
        vendor: 'Meazon',
        description: 'DinRail 1-phase meter',
        supports: 'on/off, power, energy measurement and temperature',
        fromZigbee: [
            fz.command_on, fz.legacy_genOnOff_cmdOn, fz.command_off, fz.legacy_genOnOff_cmdOff, fz.on_off,
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
        zigbeeModel: ['3AFE170100510001', '3AFE280100510001'],
        model: '2AJZ4KPKEY',
        vendor: 'Konke',
        description: 'Multi-function button',
        supports: 'single, double and long click',
        fromZigbee: [fz.konke_action, fz.battery_3V, fz.legacy_konke_click],
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
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout, fz.battery_3V],
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
        zigbeeModel: ['3AFE130104020015', '3AFE270104020015', '3AFE280104020015'],
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

    // Zemismart
    {
        zigbeeModel: ['NUET56-DL27LX1.1'],
        model: 'LXZB-12A',
        vendor: 'Zemismart',
        description: 'RGB LED downlight',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['LXT56-LS27LX1.6'],
        model: 'HGZB-DLC4-N15B',
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
        fromZigbee: [fz.ignore_basic_report, fz.ZMCSW032D_cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering']);
            // Configure reporing of currentPositionLiftPercentage always fails.
            // https://github.com/Koenkk/zigbee2mqtt/issues/3216
        },
    },
    {
        zigbeeModel: ['TS0003'],
        model: 'ZM-L03E-Z',
        vendor: 'Zemismart',
        description: 'Smart light switch - 3 gang with neutral wire',
        supports: 'on/off',
        fromZigbee: [fz.ignore_basic_report, fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
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
            fz.hvac_user_interface,
            fz.metering_power,
            fz.ignore_temperature_report,
            fz.sinope_thermostat_state,
        ],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_temperature_display_mode,
            tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.sinope_thermostat_occupancy,
            tz.sinope_thermostat_backlight_autodim_param,
            tz.sinope_thermostat_time,
            tz.sinope_thermostat_enable_outdoor_temperature,
            tz.sinope_thermostat_outdoor_temperature,
        ],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genIdentify', 'genGroups', 'hvacThermostat',
                'hvacUserInterfaceCfg', 'msTemperatureMeasurement', 'seMetering',
            ];

            await bind(endpoint, coordinatorEndpoint, binds);
            await configureReporting.thermostatTemperature(endpoint, {min: 10, max: 60, change: 50});
            await configureReporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 1, max: 0, change: 50});
            await configureReporting.thermostatSystemMode(endpoint, {min: 1, max: 0});
            await configureReporting.thermostatPIHeatingDemand(endpoint, {min: 1, max: 900, change: 5});

            await readMeteringPowerConverterAttributes(endpoint);

            try {
                await configureReporting.thermostatKeypadLockMode(endpoint, {min: 1, max: 0});
                await configureReporting.instantaneousDemand(endpoint);
            } catch (error) {
                // Not all support this: https://github.com/Koenkk/zigbee2mqtt/issues/3760
            }
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
            fz.ignore_temperature_report,
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
        zigbeeModel: ['TH1300ZB'],
        model: 'TH1300ZB',
        vendor: 'Sinope',
        description: 'Zigbee smart floor heating thermostat',
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
        zigbeeModel: ['TH1400ZB'],
        model: 'TH1400ZB',
        vendor: 'Sinope',
        description: 'Zigbee low volt thermostat',
        supports: 'local temp, units, keypad lockout, mode, state, backlight, outdoor temp, time',
        fromZigbee: [
            fz.sinope_thermostat_att_report,
        ],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_temperature_display_mode, tz.thermostat_keypad_lockout,
            tz.thermostat_system_mode, tz.thermostat_running_state,
            tz.sinope_thermostat_backlight_autodim_param, tz.sinope_thermostat_time,
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
        zigbeeModel: ['TH1500ZB'],
        model: 'TH1500ZB',
        vendor: 'Sinope',
        description: 'Zigbee dual pole line volt thermostat',
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
        zigbeeModel: ['SW2500ZB'],
        model: 'SW2500ZB',
        vendor: 'Sinope',
        description: 'Zigbee smart light switch',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['DM2500ZB'],
        model: 'DM2500ZB',
        vendor: 'Sinope',
        description: 'Zigbee smart dimmer',
        extend: generic.light_onoff_brightness,
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await configureReporting.onOff(endpoint);
            await configureReporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ['WL4200'],
        model: 'WL4200',
        vendor: 'Sinope',
        description: 'Zigbee smart water leak detector',
        supports: 'water leak',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
    },

    // Lutron
    {
        zigbeeModel: ['LZL4BWHL01 Remote'],
        model: 'LZL4BWHL01',
        vendor: 'Lutron',
        description: 'Connected bulb remote control',
        supports: 'on/off, brightness',
        fromZigbee: [fz.insta_down_hold, fz.insta_up_hold, fz.LZL4B_onoff, fz.insta_stop],
        toZigbee: [],
    },
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
        ota: ota.zigbeeOTA,
    },

    // Zen
    {
        zigbeeModel: ['Zen-01'],
        model: 'Zen-01-W',
        vendor: 'Zen',
        description: 'Thermostat',
        supports: 'temperature, heating/cooling system control',
        fromZigbee: [
            fz.legacy_battery_voltage,
            fz.thermostat_att_report,
        ],
        toZigbee: [
            tz.factory_reset, tz.thermostat_local_temperature, tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupancy, tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_unoccupied_heating_setpoint, tz.thermostat_setpoint_raise_lower,
            tz.thermostat_remote_sensing, tz.thermostat_control_sequence_of_operation, tz.thermostat_system_mode,
            tz.thermostat_weekly_schedule, tz.thermostat_clear_weekly_schedule, tz.thermostat_relay_status_log,
        ],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3) || device.getEndpoint(1);
            const binds = [
                'genBasic', 'genIdentify', 'genPowerCfg', 'genTime', 'hvacThermostat', 'hvacUserInterfaceCfg',
            ];
            await bind(endpoint, coordinatorEndpoint, binds);

            await configureReporting.thermostatSystemMode(endpoint);
            await configureReporting.batteryVoltage(endpoint);
            await configureReporting.thermostatTemperature(endpoint);
            await configureReporting.thermostatRunningState(endpoint);
            await configureReporting.thermostatOccupiedHeatingSetpoint(endpoint);
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
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'top': 1, 'bottom': 2};
        },
        meta: {configureKey: 1, multiEndpoint: true},
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
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'top': 1, 'center': 2, 'bottom': 3};
        },
        meta: {configureKey: 1, multiEndpoint: true},
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
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'top_left': 1, 'bottom_left': 2, 'top_right': 3, 'bottom_right': 4};
        },
        meta: {configureKey: 1, multiEndpoint: true},
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
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'top_left': 1, 'center_left': 2, 'bottom_left': 3, 'top_right': 4, 'bottom_right': 5};
        },
        meta: {configureKey: 1, multiEndpoint: true},
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
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {
                'top_left': 1, 'center_left': 2, 'bottom_left': 3,
                'top_right': 4, 'center_right': 5, 'bottom_right': 6,
            };
        },
        meta: {configureKey: 1, multiEndpoint: true},
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
        fromZigbee: [fz.on_off, fz.metering_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await readMeteringPowerConverterAttributes(endpoint);
            await configureReporting.instantaneousDemand(endpoint);
        },
    },
    {
        zigbeeModel: ['PM-B530-ZB'],
        model: 'PM-B530-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart plug 16A',
        supports: 'on/off, power and energy measurement',
        fromZigbee: [fz.on_off, fz.metering_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await readMeteringPowerConverterAttributes(endpoint);
            await configureReporting.instantaneousDemand(endpoint);
        },
    },
    {
        zigbeeModel: ['PM-B540-ZB'],
        model: 'PM-B540-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart plug 16A',
        supports: 'on/off, power and energy measurement',
        fromZigbee: [fz.on_off, fz.metering_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await readMeteringPowerConverterAttributes(endpoint);
            await configureReporting.instantaneousDemand(endpoint);
        },
    },
    {
        zigbeeModel: ['PM-B430-ZB'],
        model: 'PM-B430-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart plug 10A',
        supports: 'on/off, power and energy measurement',
        fromZigbee: [fz.on_off, fz.metering_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await readMeteringPowerConverterAttributes(endpoint);
            await configureReporting.instantaneousDemand(endpoint);
        },
    },
    {
        zigbeeModel: ['PM-S140-ZB'],
        model: 'PM-S140-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 1 gang without neutral wire',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['PM-S240-ZB'],
        model: 'PM-S240-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 2 gang without neutral wire',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {top: 1, bottom: 2};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['PM-S340-ZB'],
        model: 'PM-S340-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 3 gang without neutral wire',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {top: 1, center: 2, bottom: 3};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['PM-S140R-ZB'],
        model: 'PM-S140R-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 1 gang router without neutral wire',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['PM-S240R-ZB'],
        model: 'PM-S240R-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 2 gang without neutral wire',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {top: 1, bottom: 2};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['PM-S340R-ZB'],
        model: 'PM-S340R-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 3 gang without neutral wire',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {top: 1, center: 2, bottom: 3};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
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
        fromZigbee: [fz.on_off, fz.metering_power],
        toZigbee: [tz.on_off, tz.ubisys_device_setup],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3);
            await bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await readMeteringPowerConverterAttributes(endpoint);
            await configureReporting.instantaneousDemand(endpoint);
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['S2 (5502)', 'S2-R (5602)'],
        model: 'S2',
        vendor: 'Ubisys',
        description: 'Power switch S2',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.metering_power],
        toZigbee: [tz.on_off, tz.ubisys_device_setup],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {configureKey: 3, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(5);
            await bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await readMeteringPowerConverterAttributes(endpoint);
            await configureReporting.instantaneousDemand(endpoint);
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['D1 (5503)', 'D1-R (5603)'],
        model: 'D1',
        vendor: 'Ubisys',
        description: 'Universal dimmer D1',
        supports: 'on/off, brightness, power measurement',
        fromZigbee: [fz.on_off, fz.brightness, fz.metering_power],
        toZigbee: [tz.light_onoff_brightness, tz.ubisys_device_setup],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(4);
            await bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await readMeteringPowerConverterAttributes(endpoint);
            await configureReporting.instantaneousDemand(endpoint);
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['J1 (5502)', 'J1-R (5602)'],
        model: 'J1',
        vendor: 'Ubisys',
        description: 'Shutter control J1',
        supports: 'open, close, stop, position, tilt',
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.ubisys_configure_j1, tz.ubisys_device_setup],
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['C4 (5504)'],
        model: 'C4',
        vendor: 'Ubisys',
        description: 'Control unit C4',
        supports: 'action',
        fromZigbee: [fz.ubisys_c4_scenes, fz.ubisys_c4_onoff, fz.ubisys_c4_level, fz.ubisys_c4_cover],
        toZigbee: [tz.ubisys_device_setup],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            for (const ep of [1, 2, 3, 4]) {
                await bind(device.getEndpoint(ep), coordinatorEndpoint, ['genScenes', 'genOnOff', 'genLevelCtrl']);
            }
            for (const ep of [5, 6]) {
                await bind(device.getEndpoint(ep), coordinatorEndpoint, ['genScenes', 'closuresWindowCovering']);
            }
        },
        ota: ota.ubisys,
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

    // iHORN
    {
        zigbeeModel: ['113D'],
        model: 'LH-32ZB',
        vendor: 'iHORN',
        description: 'Temperature & humidity sensor',
        supports: 'temperature and humidity',
        fromZigbee: [fz.humidity, fz.temperature, fz.battery],
        toZigbee: [],
    },
    {
        zigbeeModel: ['113C'],
        model: 'LH-992ZB',
        vendor: 'iHORN',
        description: 'Motion sensor',
        supports: 'occupancy',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TI0001 '],
        model: 'LH-990ZB',
        vendor: 'iHORN',
        description: 'PIR motion sensor',
        supports: 'occupancy',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['HORN-MECI-A3.9-E'],
        model: 'HO-09ZB',
        vendor: 'iHORN',
        description: 'Door or window contact switch',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
    },
    {
        zigbeeModel: ['HORN-PIR--A3.9-E'],
        model: 'LH-990F',
        vendor: 'iHORN',
        description: 'PIR motion sensor',
        supports: 'occupancy',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
    },

    // TCI
    {
        zigbeeModel: ['VOLARE ZB3\u0000\u0000\u0000\u0000\u0000\u0000\u0000'],
        model: '676-00301024955Z',
        vendor: 'TCI',
        description: 'Dash L DC Volare',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['MAXI JOLLY ZB3'],
        model: '151570',
        vendor: 'TCI',
        description: 'LED driver for wireless control (60 watt)',
        extend: generic.light_onoff_brightness,
    },

    // TERNCY
    {
        zigbeeModel: ['TERNCY-DC01'],
        model: 'TERNCY-DC01',
        vendor: 'TERNCY',
        description: 'Temperature & contact sensor ',
        supports: 'temperature, contact',
        fromZigbee: [fz.terncy_temperature, fz.terncy_contact],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TERNCY-PP01'],
        model: 'TERNCY-PP01',
        vendor: 'TERNCY',
        description: 'Awareness switch',
        supports: 'temperature, occupancy, illuminance, click, double click, triple click',
        fromZigbee: [
            fz.terncy_temperature, fz.occupancy_with_timeout,
            fz.illuminance, fz.terncy_raw, fz.legacy_terncy_raw, fz.battery_not_divided,
        ],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TERNCY-SD01'],
        model: 'TERNCY-SD01',
        vendor: 'TERNCY',
        description: 'Knob smart dimmer',
        supports: 'single, double and triple click, rotate',
        fromZigbee: [fz.terncy_raw, fz.legacy_terncy_raw, fz.terncy_knob, fz.battery_not_divided],
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
    {
        zigbeeModel: ['31c989b65ebb45beaf3b67b1361d3965'],
        model: 'T18W3Z',
        vendor: 'ORVIBO',
        description: 'Neutral smart switch 3 gang',
        supports: 'on/off',
        fromZigbee: [],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint1);
            const endpoint2 = device.getEndpoint(2);
            await bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint2);
            const endpoint3 = device.getEndpoint(3);
            await bind(endpoint3, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint3);
        },
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3};
        },
    },
    {
        zigbeeModel: ['fdd76effa0e146b4bdafa0c203a37192', 'c670e231d1374dbc9e3c6a9fffbd0ae6'],
        model: 'SM10ZW',
        vendor: 'ORVIBO',
        description: 'Door or window contact switch',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
    },
    {
        zigbeeModel: ['8643db61de35494d93e72c1289b526a3'],
        model: 'RL804CZB',
        vendor: 'Orvibo',
        description: 'Zigbee LED controller RGB + CCT or RGBW',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['82c167c95ed746cdbd21d6817f72c593'],
        model: 'RL804QZB',
        vendor: 'ORVIBO',
        description: 'Multi-functional 3 gang relay',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            const endpoint2 = device.getEndpoint(2);
            await bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            const endpoint3 = device.getEndpoint(3);
            await bind(endpoint3, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['b467083cfc864f5e826459e5d8ea6079'],
        model: 'ST20',
        vendor: 'ORVIBO',
        description: 'Temperature & humidity sensor',
        supports: 'temperature and humidity',
        fromZigbee: [fz.humidity, fz.temperature, fz.battery_3V],
        toZigbee: [],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await bind(endpoint1, coordinatorEndpoint, ['msTemperatureMeasurement']);
            const endpoint2 = device.getEndpoint(2);
            await bind(endpoint2, coordinatorEndpoint, ['msRelativeHumidity', 'genPowerCfg']);
            await configureReporting.temperature(endpoint1);
            await configureReporting.humidity(endpoint2);
            await configureReporting.batteryVoltage(endpoint2);
            await configureReporting.batteryPercentageRemaining(endpoint2);
        },
    },
    {
        zigbeeModel: ['888a434f3cfc47f29ec4a3a03e9fc442'],
        model: 'ST21',
        vendor: 'ORVIBO',
        description: 'Temperature & humidity Sensor',
        supports: 'temperature and humidity',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery_3V],
        toZigbee: [],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await bind(endpoint1, coordinatorEndpoint, ['msTemperatureMeasurement']);
            const endpoint2 = device.getEndpoint(2);
            await bind(endpoint2, coordinatorEndpoint, ['msRelativeHumidity', 'genPowerCfg']);
            await configureReporting.temperature(endpoint1);
            await configureReporting.humidity(endpoint2);
            await configureReporting.batteryVoltage(endpoint2);
            await configureReporting.batteryPercentageRemaining(endpoint2);
        },
    },
    {
        zigbeeModel: ['9f76c9f31b4c4a499e3aca0977ac4494'],
        model: 'T30W3Z',
        vendor: 'ORVIBO',
        description: 'Smart light switch - 3 gang',
        supports: 'on/off',
        fromZigbee: [fz.on_off, fz.ignore_basic_report],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            const endpoint2 = device.getEndpoint(2);
            await bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            const endpoint3 = device.getEndpoint(3);
            await bind(endpoint3, coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            return {'top': 1, 'center': 2, 'bottom': 3};
        },
    },
    {
        zigbeeModel: ['074b3ffba5a045b7afd94c47079dd553'],
        model: 'T21W2Z',
        vendor: 'ORVIBO',
        description: 'Smart light switch - 2 gang',
        supports: 'on/off',
        fromZigbee: [fz.on_off, fz.ignore_basic_report],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'top': 1, 'bottom': 2};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['095db3379e414477ba6c2f7e0c6aa026'],
        model: 'T21W1Z',
        vendor: 'ORVIBO',
        description: 'Smart light switch - 1 gang',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['093199ff04984948b4c78167c8e7f47e'],
        model: 'W40CZ',
        vendor: 'ORVIBO',
        description: 'Smart curtain motor ',
        supports: 'open, close, stop, position',
        fromZigbee: [fz.curtain_position_analog_output, fz.cover_position_tilt, fz.ignore_basic_report],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
    },
    {
        zigbeeModel: ['e0fc98cc88df4857847dc4ae73d80b9e'],
        model: 'R11W2Z',
        vendor: 'ORVIBO',
        description: 'In wall switch - 2 gang',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['9ea4d5d8778d4f7089ac06a3969e784b'],
        model: 'R20W2Z',
        vendor: 'ORVIBO',
        description: 'In wall switch - 2 gang',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        },
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
    },
    {
        zigbeeModel: ['131c854783bc45c9b2ac58088d09571c'],
        model: 'SN10ZW',
        vendor: 'ORVIBO',
        description: 'Occupancy sensor',
        supports: 'occupancy',
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout, fz.battery],
        toZigbee: [],
    },
    {
        zigbeeModel: ['da2edf1ded0d44e1815d06f45ce02029'],
        model: 'SW21',
        vendor: 'ORVIBO',
        description: 'Water leakage sensor',
        supports: 'water leak',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['72bd56c539ca4c7fba73a9be0ae0d19f'],
        model: 'SE21',
        vendor: 'ORVIBO',
        description: 'Smart emergency button',
        supports: 'action',
        fromZigbee: [fz.SE21_action],
        toZigbee: [],
    },
    {
        zigbeeModel: ['2a103244da0b406fa51410c692f79ead'],
        model: 'AM25',
        vendor: 'ORVIBO',
        description: 'Smart blind controller',
        supports: 'open, close, stop, position',
        fromZigbee: [fz.cover_position_tilt, fz.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await configureReporting.batteryPercentageRemaining(endpoint);
            await configureReporting.currentPositionLiftPercentage(endpoint);
        },
    },

    // SONOFF
    {
        zigbeeModel: ['BASICZBR3'],
        model: 'BASICZBR3',
        vendor: 'SONOFF',
        description: 'Zigbee smart switch',
        supports: 'on/off',
        fromZigbee: [fz.on_off_skip_duplicate_transaction],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['S31 Lite zb'],
        model: 'S31ZB',
        vendor: 'SONOFF',
        description: 'Zigbee smart plug (US version)',
        supports: 'on/off',
        fromZigbee: [fz.on_off_skip_duplicate_transaction],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [
            // ModelID is from the temperature/humidity sensor (SNZB-02) but this is SNZB-04, wrong modelID in firmware?
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1449
            {type: 'EndDevice', manufacturerName: 'eWeLink', modelID: 'TH01', endpoints: [
                {ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 3, 1280, 1], outputClusters: [3]},
            ]},
        ],
        zigbeeModel: ['DS01'],
        model: 'SNZB-04',
        vendor: 'SONOFF',
        whiteLabel: [
            {vendor: 'eWeLink', model: 'RHK06'},
        ],
        description: 'Contact sensor',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery_3V],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['WB01'],
        model: 'SNZB-01',
        vendor: 'SONOFF',
        whiteLabel: [
            {vendor: 'eWeLink', model: 'RHK07'},
        ],
        description: 'Wireless button',
        supports: 'single, double, long',
        fromZigbee: [fz.ewelink_action, fz.battery_3V],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['TH01'],
        model: 'SNZB-02',
        vendor: 'SONOFF',
        whiteLabel: [
            {vendor: 'eWeLink', model: 'RHK08'},
        ],
        description: 'Temperature and humidity sensor',
        supports: 'temperature and humidity',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery_3V],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg'];
            await bind(endpoint, coordinatorEndpoint, bindClusters);
            await configureReporting.temperature(endpoint, {min: 5, change: 100});
            await configureReporting.humidity(endpoint);
            await configureReporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['MS01'],
        model: 'SNZB-03',
        vendor: 'SONOFF',
        whiteLabel: [
            {vendor: 'eWeLink', model: 'RHK09'},
        ],
        description: 'Motion sensor',
        supports: 'occupancy',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery_3V],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ['genPowerCfg'];
            await bind(endpoint, coordinatorEndpoint, bindClusters);
            await configureReporting.batteryVoltage(endpoint);
        },
    },

    // eWeLink: the IoT solution provider behinds lots of smart device brands
    {
        zigbeeModel: ['SA-003-Zigbee'],
        model: 'SA-003-Zigbee',
        vendor: 'eWeLink',
        description: 'Zigbee smart plug',
        supports: 'on/off',
        fromZigbee: [fz.SA003_on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },

    // CR Smart Home
    {
        zigbeeModel: ['TS0202'],
        model: 'TS0202',
        vendor: 'CR Smart Home',
        description: 'Motion sensor',
        supports: 'occupancy',
        fromZigbee: [fz.ias_occupancy_alarm_1_with_timeout, fz.battery, fz.ignore_basic_report],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0203'],
        model: 'TS0203',
        vendor: 'CR Smart Home',
        description: 'Door sensor',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ignore_basic_report],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0204'],
        model: 'TS0204',
        vendor: 'CR Smart Home',
        description: 'Gas sensor',
        supports: 'gas',
        fromZigbee: [fz.ias_gas_alarm_1, fz.battery, fz.ignore_basic_report],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0205'],
        model: 'TS0205',
        vendor: 'CR Smart Home',
        description: 'Smoke sensor',
        supports: 'smoke',
        fromZigbee: [fz.ias_smoke_alarm_1, fz.battery, fz.ignore_basic_report],
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
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
    },
    {
        zigbeeModel: ['TS0218'],
        model: 'TS0218',
        vendor: 'CR Smart Home',
        description: 'Button',
        supports: 'click',
        fromZigbee: [fz.TS0218_click, fz.battery],
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

    // EcoDim
    {
        zigbeeModel: ['ED-10011'],
        model: 'ED-10011',
        vendor: 'EcoDim',
        description: 'Zigbee 4 button wall switch',
        supports: 'action',
        fromZigbee: [
            fz.command_on, fz.command_off, fz.command_move, fz.command_stop,
            fz.battery,
        ],
        toZigbee: [],
        meta: {multiEndpoint: true},
    },
    {
        zigbeeModel: ['ED-10012'],
        model: 'ED-10012',
        vendor: 'EcoDim',
        description: 'Zigbee 2 button wall switch',
        supports: 'action',
        fromZigbee: [
            fz.command_on, fz.command_off, fz.command_move, fz.command_stop,
            fz.battery,
        ],
        toZigbee: [],
        meta: {multiEndpoint: true},
    },

    // Smart9
    {
        zigbeeModel: ['TS0215'],
        model: 'S9ZGBRC01',
        vendor: 'Smart9',
        description: 'Smart remote controller',
        supports: 'action',
        fromZigbee: [fz.command_arm, fz.command_emergency, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
        },
    },

    // Ajax Online
    {
        zigbeeModel: ['AJ-RGBCCT 5 in 1'],
        model: 'Aj_Zigbee_Led_Strip',
        vendor: 'Ajax Online',
        description: 'LED Strip',
        extend: generic.light_onoff_brightness_colorxy,
    },

    // Moes
    {
        zigbeeModel: ['TS0112'],
        model: 'ZK-EU-2U',
        vendor: 'Moes',
        description: 'ZigBee3.0 dual USB wireless socket plug',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },

    // Schneider Electric
    {
        zigbeeModel: ['iTRV'],
        model: 'WV704R0A0902',
        vendor: 'Schneider Electric',
        description: 'Wiser radiator thermostat',
        supports: 'temperature, battery, keypad lock, heating demand',
        fromZigbee: [
            fz.ignore_basic_report,
            fz.ignore_haDiagnostic,
            fz.ignore_genOta,
            fz.ignore_zclversion_read,
            fz.wiser_thermostat,
            fz.wiser_itrv_battery,
            fz.wiser_user_interface,
            fz.wiser_device_info,
        ],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_keypad_lockout,
        ],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = [
                'genBasic', 'genPowerCfg', 'hvacThermostat', 'haDiagnostic',
            ];
            await bind(endpoint, coordinatorEndpoint, binds);
            await configureReporting.batteryVoltage(endpoint);
            await configureReporting.thermostatTemperature(endpoint, {min: 0, max: repInterval.MINUTES_15, change: 25});
            await configureReporting.thermostatOccupiedHeatingSetpoint(
                endpoint, {min: 0, max: repInterval.MINUTES_15, change: 25},
            );
            await configureReporting.thermostatPIHeatingDemand(
                endpoint, {min: 0, max: repInterval.MINUTES_15, change: 1},
            );
            // bind of hvacUserInterfaceCfg fails with 'Table Full', does this have any effect?
            await endpoint.configureReporting('hvacUserInterfaceCfg', [
                {
                    attribute: 'keypadLockout',
                    minimumReportInterval: repInterval.MINUTE,
                    maximumReportInterval: repInterval.HOUR,
                    reportableChange: 1,
                },
            ]);
        },
    },
    {
        zigbeeModel: ['U202DST600ZB'],
        model: 'U202DST600ZB',
        vendor: 'Schneider Electric',
        description: 'EZinstall3 2 gang 2x300W dimmer module',
        supports: 'on/off, brightness',
        fromZigbee: [fz.on_off, fz.brightness],
        toZigbee: [tz.light_onoff_brightness, tz.ignore_transition],
        meta: {configureKey: 2, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(10);
            await bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await configureReporting.onOff(endpoint1);
            await configureReporting.brightness(endpoint1);
            const endpoint2 = device.getEndpoint(11);
            await bind(endpoint2, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await configureReporting.onOff(endpoint2);
            await configureReporting.brightness(endpoint2);
        },
        endpoint: (device) => {
            return {l1: 10, l2: 11};
        },
    },
    {
        zigbeeModel: ['U201DST600ZB'],
        model: 'U201DST600ZB',
        vendor: 'Schneider Electric',
        description: 'EZinstall3 1 gang 550W dimmer module',
        supports: 'on/off, brightness',
        fromZigbee: [fz.on_off, fz.brightness],
        toZigbee: [tz.light_onoff_brightness, tz.ignore_transition],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(10);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await configureReporting.onOff(endpoint);
            await configureReporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ['U201SRY2KWZB'],
        model: 'U201SRY2KWZB',
        vendor: 'Schneider Electric',
        description: 'Ulti 240V 9.1 A 1 gang relay switch impress switch module, amber LED',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(10);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['U202SRY2KWZB'],
        model: 'U202SRY2KWZB',
        vendor: 'Schneider Electric',
        description: 'Ulti 240V 9.1 A 2 gangs relay switch impress switch module, amber LED',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(10);
            await bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint1);
            const endpoint2 = device.getEndpoint(11);
            await bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint2);
        },
        endpoint: (device) => {
            return {l1: 10, l2: 11};
        },
    },

    // Legrand
    {
        zigbeeModel: [' Shutter switch with neutral\u0000\u0000\u0000'],
        model: '067776',
        vendor: 'Legrand',
        description: 'Netatmo wired shutter switch',
        // the physical LED will be green when permit join is true, off otherwise and red when not linked
        supports: 'open, close, stop, position, tilt',
        fromZigbee: [
            // Devices can send an identify message when the configuration button is pressed
            // (behind the physical buttons)
            // Used on the official gateway to send to every devices an identify command (green)
            fz.identify, fz.ignore_basic_report,
            // support binary report on moving state (supposed)
            fz.legrand_binary_input_moving, fz.cover_position_tilt,
        ],
        toZigbee: [
            tz.cover_state, tz.cover_position_tilt, tz.legrand_identify, tz.legrand_settingAlwaysEnableLed,
        ],
        meta: {configureKey: 1, coverInverted: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genBinaryInput', 'closuresWindowCovering', 'genIdentify']);
        },
    },
    {
        zigbeeModel: [
            ' Remote switch\u0000\u0000\u0000\u0000\u0000\u0000\u0000'+
            '\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000',
        ],
        model: '067773',
        vendor: 'Legrand',
        // led blink RED when battery is low
        description: 'Wireless remote switch',
        supports: 'action',
        fromZigbee: [fz.identify, fz.command_on, fz.command_off, fz.legacy_cmd_move, fz.legacy_cmd_stop, fz.battery_3V],
        toZigbee: [],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genOnOff', 'genLevelCtrl']);
        },
        onEvent: async (type, data, device, options) => {
            await legrand.read_initial_battery_state(type, data, device);
        },
    },
    {
        zigbeeModel: [' Double gangs remote switch', 'Double gangs remote switch'],
        model: '067774',
        vendor: 'Legrand',
        description: 'Wireless double remote switch',
        supports: 'action',
        fromZigbee: [fz.identify, fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1, multiEndpoint: true},
        endpoint: (device) => {
            return {left: 1, right: 2};
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genOnOff', 'genLevelCtrl']);
            const endpoint2 = device.getEndpoint(2);
            await bind(endpoint2, coordinatorEndpoint, ['genPowerCfg', 'genOnOff', 'genLevelCtrl']);
        },
        onEvent: async (type, data, device, options) => {
            await legrand.read_initial_battery_state(type, data, device);
        },
    },
    {
        zigbeeModel: [' Remote toggle switch\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'],
        model: '067694',
        vendor: 'Legrand',
        description: 'Remote toggle switch',
        supports: 'action',
        fromZigbee: [fz.identify, fz.command_on, fz.command_off, fz.command_toggle, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genOnOff']);
        },
        onEvent: async (type, data, device, options) => {
            await legrand.read_initial_battery_state(type, data, device);
        },
    },
    {
        zigbeeModel: [' Dimmer switch w/o neutral\u0000\u0000\u0000\u0000\u0000'],
        model: '067771',
        vendor: 'Legrand',
        // led blink RED when battery is low
        description: 'Wired switch without neutral',
        supports: 'on/off, brightness',
        fromZigbee: [fz.brightness, fz.identify, fz.on_off],
        toZigbee: [
            tz.light_onoff_brightness, tz.legrand_settingAlwaysEnableLed,
            tz.legrand_settingEnableLedIfOn, tz.legrand_settingEnableDimmer, tz.legrand_identify,
        ],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'genLevelCtrl', 'genBinaryInput']);
            await configureReporting.onOff(endpoint);
            await configureReporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: [
            ' Connected outlet\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000' +
            '\u0000\u0000\u0000\u0000\u0000',
        ],
        model: '067775',
        vendor: 'Legrand',
        description: 'Power socket with power consumption monitoring',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement_power],
        toZigbee: [tz.on_off, tz.legrand_settingAlwaysEnableLed, tz.legrand_identify],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'haElectricalMeasurement']);
            await configureReporting.onOff(endpoint);
            await readEletricalMeasurementPowerConverterAttributes(endpoint);
            await configureReporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: [' Micromodule switch\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'],
        model: '064888',
        vendor: 'Legrand',
        description: 'Wired micromodule switch',
        supports: 'on/off',
        fromZigbee: [fz.identify, fz.on_off],
        toZigbee: [tz.on_off, tz.legrand_identify],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genBinaryInput']);
        },
    },
    {
        zigbeeModel: [' Master remote SW Home / Away\u0000\u0000'],
        model: '064873',
        vendor: 'Legrand',
        // led blink RED when battery is low
        description: 'Home & away switch / master switch',
        supports: 'action',
        fromZigbee: [
            fz.legrand_scenes, fz.legrand_master_switch_center,
            fz.ignore_poll_ctrl, fz.battery_3V,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genPowerCfg']);
        },
        onEvent: async (type, data, device) => {
            await legrand.read_initial_battery_state(type, data, device);

            if (data.type === 'commandCheckin' && data.cluster === 'genPollCtrl') {
                // TODO current solution is a work around, it would be cleaner to answer to the request
                const endpoint = device.getEndpoint(1);
                const options = {manufacturerCode: 0x1021, disableDefaultResponse: true};
                /* await endpoint.command('genPollCtrl', 'checkinRsp', {
                    startfastpolling: false,
                    fastpolltimeout: 0,
                }, {
                    transactionSequenceNumber:data.meta.zclTransactionSequenceNumber,
                    manufacturerCode: 0x1021, disableDefaultResponse: true
                }); */
                await endpoint.command('genPollCtrl', 'fastPollStop', {}, options);
            }
        },
    },
    {
        zigbeeModel: [' DIN power consumption module\u0000\u0000', ' DIN power consumption module'],
        model: '412015',
        vendor: 'Legrand',
        description: 'DIN power consumption module',
        supports: 'power measurement, consumption alerts',
        fromZigbee: [
            fz.identify, fz.metering_power, fz.electrical_measurement_power, fz.ignore_basic_report,
            fz.ignore_genOta, fz.legrand_power_alarm,
        ],
        toZigbee: [
            tz.legrand_settingAlwaysEnableLed, tz.legrand_identify, tz.legrand_readActivePower, tz.legrand_powerAlarm,
        ],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'genIdentify']);
            await readEletricalMeasurementPowerConverterAttributes(endpoint);
            await configureReporting.activePower(endpoint);
            // Read configuration values that are not sent periodically as well as current power (activePower).
            await endpoint.read('haElectricalMeasurement', ['activePower', 0xf000, 0xf001, 0xf002]);
        },
    },
    {
        zigbeeModel: ['Remote switch Wake up / Sleep'],
        model: '752189',
        vendor: 'Legrand',
        description: 'Night/day wireless switch',
        supports: 'action',
        fromZigbee: [fz.legrand_scenes, fz.battery_3V, fz.ignore_poll_ctrl, fz.legrand_master_switch_center],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genPowerCfg']);
        },
    },

    // BTicino (Legrand brand)
    {
        zigbeeModel: [' Light switch with neutral\u0000\u0000\u0000\u0000\u0000'],
        model: 'K4003C/L4003C/N4003C/NT4003C',
        vendor: 'BTicino',
        description: 'Light switch with neutral',
        supports: 'on/off, led color',
        fromZigbee: [fz.identify, fz.on_off, fz.K4003C_binary_input],
        toZigbee: [
            tz.on_off, tz.legrand_settingAlwaysEnableLed,
            tz.legrand_settingEnableLedIfOn, tz.legrand_identify,
        ],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'genBinaryInput']);
        },
    },

    // Linkind
    {
        zigbeeModel: ['ZBT-CCTLight-D0106', 'ZBT-CCTLight-GLS0108'],
        model: 'ZL1000100-CCT-US-V1A02',
        vendor: 'Linkind',
        description: 'Zigbee LED 9W A19 bulb, dimmable & tunable',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['ZBT-CCTLight-C4700107'],
        model: 'ZL1000400-CCT-EU-2-V1A02',
        vendor: 'Linkind',
        description: 'Zigbee LED 5.4W C35 bulb E14, dimmable & tunable',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['ZBT-DIMLight-D0120'],
        model: 'ZL1000701-27-EU-V1A02',
        vendor: 'Linkind',
        description: 'Zigbee A60 filament bulb 6.3W',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['ZBT-DIMLight-A4700003'],
        model: 'ZL1000700-22-EU-V1A02',
        vendor: 'Linkind',
        description: 'Zigbee A60 led filament, dimmable warm light (2200K), E27. 4.2W, 420lm',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['ZB-MotionSensor-D0003'],
        model: 'ZS1100400-IN-V1A02',
        vendor: 'Linkind',
        description: 'PIR motion sensor, wireless motion detector',
        supports: 'occupancy',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['ZB-DoorSensor-D0003'],
        model: 'ZS110050078',
        vendor: 'Linkind',
        description: 'Door/window Sensor',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1],
        toZigbee: [],
    },
    {
        zigbeeModel: ['ZBT-DIMSwitch-D0001'],
        model: 'ZS232000178',
        vendor: 'Linkind',
        description: '1-key remote control',
        supports: 'action',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop],
        toZigbee: [],
    },

    // BlitzWolf
    {
        zigbeeModel: ['RH3001'],
        model: 'BW-IS2',
        vendor: 'BlitzWolf',
        description: 'Rechargeable Zigbee contact sensor',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ignore_basic_report, fz.ignore_time_read],
        toZigbee: [],
    },
    {
        zigbeeModel: ['5j6ifxj'],
        model: 'BW-IS3',
        vendor: 'BlitzWolf',
        description: 'Rechargeable Zigbee PIR motion sensor',
        supports: 'occupancy',
        fromZigbee: [fz.blitzwolf_occupancy_with_timeout],
        toZigbee: [],
    },

    // Kwikset
    {
        zigbeeModel: ['SMARTCODE_CONVERT_GEN1'],
        model: '66492-001',
        vendor: 'Kwikset',
        description: 'Home connect smart lock conversion kit',
        supports: 'lock/unlock, battery',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.generic_lock],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await configureReporting.lockState(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['SMARTCODE_DEADBOLT_10_L'],
        model: '99140-002',
        vendor: 'Kwikset',
        description: 'SmartCode traditional electronic deadbolt',
        supports: 'lock/unlock, battery',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.generic_lock],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await configureReporting.lockState(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['SMARTCODE_DEADBOLT_5_L'],
        model: '99100-006',
        vendor: 'Kwikset',
        description: '910 SmartCode traditional electronic deadbolt',
        supports: 'lock/unlock, battery',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.generic_lock],
        meta: {configureKey: 4},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await configureReporting.lockState(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },

    // Schlage
    {
        zigbeeModel: ['BE468'],
        model: 'BE468',
        vendor: 'Schlage',
        description: 'Connect smart deadbolt',
        supports: 'lock/unlock, battery',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery],
        toZigbee: [tz.generic_lock],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await configureReporting.lockState(endpoint);
            await configureReporting.batteryPercentageRemaining(endpoint);
        },
    },

    // HORNBACH
    {
        zigbeeModel: ['VIYU-A60-806-RGBW-10011725'],
        model: '10011725',
        vendor: 'HORNBACH',
        description: 'FLAIR Viyu Smarte LED bulb RGB E27',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },

    // Alecto
    // {
    //     zigbeeModel: ['RH3001'],
    //     model: 'SMART-DOOR10',
    //     vendor: 'Alecto',
    //     description: 'Door & window sensor',
    //     supports: 'contact',
    //     fromZigbee: [fz.ias_contact_alarm_1],
    //     toZigbee: [],
    // },
    // {
    //     zigbeeModel: ['RH3052'],
    //     model: 'SMART-TEMP10',
    //     vendor: 'Alecto',
    //     description: 'Temperature & humidity sensor',
    //     supports: 'temperature and humidity',
    //     fromZigbee: [fz.humidity, fz.temperature, fz.battery],
    //     toZigbee: [],
    // },

    // LifeControl
    {
        zigbeeModel: ['Leak_Sensor'],
        model: 'MCLH-07',
        vendor: 'LifeControl',
        description: 'Water leak switch',
        supports: 'water leak',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
    },
    {
        zigbeeModel: ['Door_Sensor'],
        model: 'MCLH-04',
        vendor: 'LifeControl',
        description: 'Door sensor',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
    },
    {
        zigbeeModel: ['vivi ZLight'],
        model: 'MCLH-02',
        vendor: 'LifeControl',
        description: 'RGB LED lamp',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['RICI01'],
        model: 'MCLH-03',
        vendor: 'LifeControl',
        description: 'Power plug',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.electrical_measurement_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await configureReporting.onOff(endpoint);
            await readEletricalMeasurementPowerConverterAttributes(endpoint);
        },
        onEvent: async (type, data, device) => {
            // This device doesn't support reporting correctly.
            // https://github.com/Koenkk/zigbee-herdsman-converters/pull/1270
            const endpoint = device.getEndpoint(1);
            if (type === 'stop') {
                clearInterval(store[device.ieeeAddr]);
            } else if (!store[device.ieeeAddr]) {
                store[device.ieeeAddr] = setInterval(async () => {
                    try {
                        await endpoint.read('haElectricalMeasurement', ['rmsVoltage', 'rmsCurrent', 'activePower']);
                    } catch (error) {
                        // Do nothing
                    }
                }, 10*1000); // Every 10 seconds
            }
        },
    },
    {
        zigbeeModel: ['Motion_Sensor'],
        model: 'MCLH-05',
        vendor: 'LifeControl',
        description: 'Motion sensor',
        supports: 'occupancy',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.legacy_battery],
        toZigbee: [],
    },
    {
        zigbeeModel: ['VOC_Sensor'],
        model: 'MCLH-08',
        vendor: 'LifeControl',
        description: 'Air sensor',
        supports: 'voc, eco2, temperature, humidity',
        fromZigbee: [fz.lifecontrolVoc],
        toZigbee: [],
    },

    // Develco
    {
        zigbeeModel: ['EMIZB-132'],
        model: 'EMIZB-132',
        vendor: 'Develco',
        description: 'Wattle AMS HAN power-meter sensor',
        supports: 'power measurements',
        fromZigbee: [fz.metering_power, fz.electrical_measurement_power],
        toZigbee: [tz.EMIZB_132_mode],
        meta: {configureKey: 9},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(2);
            await bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering']);

            try {
                // Some don't support these attributes
                // https://github.com/Koenkk/zigbee-herdsman-converters/issues/974#issuecomment-621465038
                await readEletricalMeasurementPowerConverterAttributes(endpoint);
                await configureReporting.rmsVoltage(endpoint);
                await configureReporting.rmsCurrent(endpoint);
                await configureReporting.activePower(endpoint);
            } catch (e) {
                e;
            }

            await readMeteringPowerConverterAttributes(endpoint);
            await configureReporting.instantaneousDemand(endpoint);
            await configureReporting.currentSummDelivered(endpoint);
            await configureReporting.currentSummReceived(endpoint);
        },
    },
    {
        zigbeeModel: ['SMSZB-120'],
        model: 'SMSZB-120',
        vendor: 'Develco',
        description: 'Smoke detector with siren',
        supports: 'smoke, warning, temperature',
        fromZigbee: [fz.temperature, fz.battery, fz.ias_smoke_alarm_1, fz.ignore_basic_report, fz.ignore_genOta],
        toZigbee: [tz.warning],
        meta: {configureKey: 1, battery: {voltageToPercentage: 'CR2032'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(35);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'ssIasZone', 'genBasic']);
            await configureReporting.batteryVoltage(endpoint);
            const endpoint2 = device.getEndpoint(38);
            await bind(endpoint2, coordinatorEndpoint, ['msTemperatureMeasurement']);
            await configureReporting.temperature(endpoint2);
        },
        endpoint: (device) => {
            return {default: 35};
        },
    },
    {
        zigbeeModel: ['MOSZB-130'],
        model: 'MOSZB-130',
        vendor: 'Develco',
        description: 'Motion sensor',
        supports: 'occupancy',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
    },

    // Aurora Lighting
    {
        zigbeeModel: ['TWGU10Bulb50AU'],
        model: 'AU-A1GUZBCX5',
        vendor: 'Aurora Lighting',
        description: 'AOne 5.4W smart tuneable GU10 lamp',
        extend: generic.light_onoff_brightness_colortemp,
    },
    {
        zigbeeModel: ['FWGU10Bulb50AU', 'FWGU10Bulb01UK'],
        model: 'AU-A1GUZB5/30',
        vendor: 'Aurora Lighting',
        description: 'AOne 4.8W smart dimmable GU10 lamp 3000K',
        extend: generic.light_onoff_brightness,
    },
    {
        zigbeeModel: ['RGBGU10Bulb50AU'],
        model: 'AU-A1GUZBRGBW',
        vendor: 'Aurora Lighting',
        description: 'AOne 5.6w smart RGBW tuneable GU10 lamp',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['RGBBulb01UK', 'RGBBulb02UK'],
        model: 'AU-A1GSZ9RGBW',
        vendor: 'Aurora Lighting',
        description: 'AOne 9.5W smart RGBW GLS E27/B22',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },
    {
        zigbeeModel: ['Remote50AU'],
        model: 'AU-A1ZBRC',
        vendor: 'Aurora Lighting',
        description: 'AOne smart remote',
        supports: 'action',
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step],
        toZigbee: [],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genPowerCfg']);
        },
    },
    {
        zigbeeModel: ['MotionSensor51AU'],
        model: 'AU-A1ZBPIRS',
        vendor: 'Aurora Lighting',
        description: 'AOne PIR sensor',
        supports: 'occupancy',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.illuminance],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(39);
            await bind(endpoint, coordinatorEndpoint, ['msIlluminanceMeasurement']);
            await configureReporting.illuminance(endpoint);
        },
    },
    {
        zigbeeModel: ['SingleSocket50AU'],
        model: 'AU-A1ZBPIAB',
        vendor: 'Aurora Lighting',
        description: 'Power plug Zigbee EU',
        supports: 'on/off, power measurements',
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'haElectricalMeasurement']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['WindowSensor51AU'],
        model: 'AU-A1ZBDWS',
        vendor: 'Aurora Lighting',
        description: 'Magnetic door & window contact sensor',
        supports: 'contact',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
    },
    {
        zigbeeModel: ['WallDimmerMaster'],
        model: 'AU-A1ZB2WDM',
        vendor: 'Aurora Lighting',
        description: 'AOne 250W smart rotary dimmer module',
        extend: generic.light_onoff_brightness,
    },

    // Wally
    {
        zigbeeModel: ['MultiSensor'],
        model: 'U02I007C.01',
        vendor: 'Wally',
        description: 'WallyHome multi-sensor',
        supports: 'action, contact, water leak, temperature, humidity',
        fromZigbee: [
            fz.command_on, fz.command_off, fz.battery, fz.temperature, fz.humidity,
            fz.MultiSensor_ias_contact_alarm, fz.MultiSensor_ias_water_leak_alarm,
        ],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genPowerCfg', 'genOnOff', 'msTemperatureMeasurement', 'msRelativeHumidity'];
            await bind(endpoint, coordinatorEndpoint, binds);
            await configureReporting.batteryPercentageRemaining(endpoint);
            await configureReporting.temperature(endpoint);
            await configureReporting.humidity(endpoint);
        },
    },

    // Smartenit
    {
        zigbeeModel: ['ZBMLC30'],
        model: '4040B',
        vendor: 'Smartenit',
        description: 'Wireless metering 30A dual-load switch/controller',
        supports: 'on/off, power measurements',
        fromZigbee: [fz.on_off, fz.metering_power, fz.ignore_light_brightness_report],
        toZigbee: [tz.on_off],
        meta: {configureKey: 2},
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            const endpoint2 = device.getEndpoint(2);
            await bind(endpoint2, coordinatorEndpoint, ['genOnOff', 'seMetering']);

            // Device doesn't respond to divisor read, set it here
            // https://github.com/Koenkk/zigbee-herdsman-converters/pull/1096
            endpoint2.saveClusterAttributeKeyValue('seMetering', {
                divisor: 100000,
                multiplier: 1,
            });
        },
    },
    {
        zigbeeModel: ['ZBHT-1'],
        model: 'ZBHT-1',
        vendor: 'Smartenit',
        description: 'Temperature & humidity sensor ',
        supports: 'temperature and humidity',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
    },

    // Siterwell
    {
        zigbeeModel: ['ivfvd7h', 'eaxp72v\u0000'],
        model: 'GS361A-H04',
        vendor: 'Siterwell',
        description: 'Radiator valve with thermostat',
        supports: 'thermostat, temperature',
        fromZigbee: [
            fz.tuya_thermostat,
            fz.tuya_thermostat_on_set_data,
            fz.ignore_basic_report,
        ],
        meta: {tuyaThermostatSystemMode: common.TuyaThermostatSystemModes},
        toZigbee: [
            tz.tuya_thermostat_child_lock,
            tz.tuya_thermostat_window_detection,
            tz.tuya_thermostat_valve_detection,
            tz.tuya_thermostat_current_heating_setpoint,
            tz.tuya_thermostat_system_mode,
            tz.tuya_thermostat_auto_lock,
            tz.tuya_thermostat_calibration,
            tz.tuya_thermostat_min_temp,
            tz.tuya_thermostat_max_temp,
            tz.tuya_thermostat_boost_time,
            tz.tuya_thermostat_comfort_temp,
            tz.tuya_thermostat_eco_temp,
            tz.tuya_thermostat_force,
        ],
        whiteLabel: [
            {vendor: 'Essentials', description: 'Smart home heizkörperthermostat premium', model: '120112'},
        ],
    },

    // Green Power
    {
        zigbeeModel: ['GreenPower_2'],
        model: 'GreenPower_On_Off_Switch',
        vendor: 'GreenPower',
        description: 'On/off switch',
        supports: 'action',
        fromZigbee: [fz.greenpower_on_off_switch],
        toZigbee: [],
        whiteLabel: [
            {vendor: 'Philips', description: 'Hue Tap', model: '8718696743133'},
            {vendor: 'Niko', description: 'Friends of Hue switch', model: '91004'},
        ],
    },
    {
        zigbeeModel: ['GreenPower_7'],
        model: 'GreenPower_7',
        vendor: 'GreenPower',
        description: 'device 7',
        supports: 'action',
        fromZigbee: [fz.greenpower_7],
        toZigbee: [],
        whiteLabel: [
            {vendor: 'EnOcean', description: 'Easyfit 1 or 2 gang switch', model: 'EWSxZG'},
        ],
    },

    // Schwaiger
    {
        zigbeeModel: ['SPW35Z-D0'],
        model: 'ZHS-15',
        vendor: 'Schwaiger',
        description: 'Power socket on/off with power consumption monitoring',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.electrical_measurement_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 3},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await configureReporting.onOff(endpoint);
            await readEletricalMeasurementPowerConverterAttributes(endpoint);
            await configureReporting.rmsVoltage(endpoint);
            await configureReporting.rmsCurrent(endpoint);
            await configureReporting.activePower(endpoint);
        },
    },

    // Zipato
    {
        zigbeeModel: ['ZHA-ColorLight'],
        model: 'rgbw2.zbee27',
        vendor: 'Zipato',
        description: 'RGBW LED bulb with dimmer',
        extend: generic.light_onoff_brightness_colortemp_colorxy,
    },

    // Viessmann
    {
        zigbeeModel: ['7637434'],
        model: 'ZK03840',
        vendor: 'Viessmann',
        description: 'ViCare radiator thermostat valve',
        supports: 'thermostat',
        fromZigbee: [fz.viessmann_thermostat_att_report, fz.battery, fz.hvac_user_interface],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_occupied_cooling_setpoint,
            tz.thermostat_control_sequence_of_operation,
            tz.thermostat_system_mode,
            tz.thermostat_keypad_lockout,
        ],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, [
                'genBasic', 'genPowerCfg', 'genIdentify', 'genTime', 'genPollCtrl', 'hvacThermostat',
                'hvacUserInterfaceCfg',
            ]);
            await configureReporting.thermostatTemperature(endpoint);
            await configureReporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await configureReporting.thermostatOccupiedCoolingSetpoint(endpoint);
            await configureReporting.thermostatPIHeatingDemand(endpoint);
            await configureReporting.thermostatKeypadLockMode(endpoint);
        },
    },

    // Waxman
    {
        zigbeeModel: ['leakSMART Water Sensor V2'],
        model: '8840100H',
        vendor: 'Waxman',
        description: 'leakSMART water sensor v2',
        supports: 'water leak, temperature',
        fromZigbee: [fz._8840100H_water_leak_alarm, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg', 'haApplianceEventsAlerts', 'msTemperatureMeasurement',
            ]);
            await configureReporting.batteryPercentageRemaining(endpoint);
            await configureReporting.temperature(endpoint);
        },
    },

    // eZEX
    {
        zigbeeModel: ['E220-KR3N0Z0-HA'],
        model: 'ECW-100-A03',
        vendor: 'eZEX',
        description: 'Zigbee switch 3 gang',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {top: 1, center: 2, bottom: 3};
        },
        meta: {configureKey: 1, multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            await bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
    },

    // EchoStar
    {
        zigbeeModel: ['   Bell'],
        model: 'SAGE206612',
        vendor: 'EchoStar',
        description: 'SAGE by Hughes doorbell sensor',
        supports: 'action',
        fromZigbee: [fz.SAGE206612_state, fz.battery_3V],
        toZigbee: [],
    },

    // Plugwise
    {
        zigbeeModel: ['160-01'],
        model: '160-01',
        vendor: 'Plugwise',
        description: 'Plug power socket on/off with power consumption monitoring',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.metering_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await configureReporting.onOff(endpoint);
            await readMeteringPowerConverterAttributes(endpoint);
            await configureReporting.instantaneousDemand(endpoint);
        },
    },

    // KMPCIL
    {
        zigbeeModel: ['RES005'],
        model: 'KMPCIL_RES005',
        vendor: 'KMPCIL',
        description: 'Environment sensor',
        supports: 'battery, temperature, humidity, pressure, illuminance, occupancy, switch',
        fromZigbee: [
            fz.battery, fz.temperature, fz.humidity, fz.pressure, fz.illuminance, fz.kmpcil_res005_occupancy,
            fz.kmpcil_res005_on_off,
        ],
        toZigbee: [tz.kmpcil_res005_on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(8);
            const binds = [
                'genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement',
                'msIlluminanceMeasurement', 'genBinaryInput', 'genBinaryOutput',
            ];
            await bind(endpoint, coordinatorEndpoint, binds);
            await configureReporting.temperature(endpoint);
            await configureReporting.humidity(endpoint);
            const payloadBattery = [{
                attribute: 'batteryPercentageRemaining',
                minimumReportInterval: 1,
                maximumReportInterval: 120,
                reportableChange: 1,
            }];
            await endpoint.configureReporting('genPowerCfg', payloadBattery);
            const payload = [{
                attribute: 'measuredValue',
                minimumReportInterval: 5,
                maximumReportInterval: repInterval.HOUR,
                reportableChange: 200,
            }];
            await endpoint.configureReporting('msIlluminanceMeasurement', payload);
            const payloadPressure = [{
                // 0 = measuredValue, override dataType from int16 to uint16
                // https://github.com/Koenkk/zigbee-herdsman/pull/191/files?file-filters%5B%5D=.ts#r456569398
                attribute: {ID: 0, type: 33},
                minimumReportInterval: 2,
                maximumReportInterval: repInterval.HOUR,
                reportableChange: 3,
            }];
            await endpoint.configureReporting('msPressureMeasurement', payloadPressure);
            const options = {disableDefaultResponse: true};
            await endpoint.write('genBinaryInput', {0x0051: {value: 0x01, type: 0x10}}, options);
            await endpoint.write('genBinaryInput', {0x0101: {value: 25, type: 0x23}}, options);
            const payloadBinaryInput = [{
                attribute: 'presentValue',
                minimumReportInterval: 0,
                maximumReportInterval: 30,
                reportableChange: 1,
            }];
            await endpoint.configureReporting('genBinaryInput', payloadBinaryInput);
            await endpoint.write('genBinaryOutput', {0x0051: {value: 0x01, type: 0x10}}, options);
            const payloadBinaryOutput = [{
                attribute: 'presentValue',
                minimumReportInterval: 0,
                maximumReportInterval: 30,
                reportableChange: 1,
            }];

            await endpoint.configureReporting('genBinaryOutput', payloadBinaryOutput);
        },
    },

    // Enbrighten
    {
        zigbeeModel: ['43076'],
        model: '43076',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart switch',
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
        zigbeeModel: ['43080'],
        model: '43080',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall smart dimmer',
        extend: generic.light_onoff_brightness,
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await configureReporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['43102'],
        model: '43102',
        vendor: 'Enbrighten',
        description: 'Zigbee in-wall outlet',
        supports: 'on/off',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.on_off],
    },
    {
        zigbeeModel: ['43100'],
        model: '43100',
        vendor: 'Enbrighten',
        description: 'Plug-in Zigbee outdoor smart switch',
        supports: 'on/off',
        fromZigbee: [fz.command_on_state, fz.command_off_state],
        toZigbee: [tz.on_off],
        meta: {configureKey: 1},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await bind(endpoint1, coordinatorEndpoint, ['genOnOff']);
            await configureReporting.onOff(endpoint1);
        },
    },

    // Niko
    {
        zigbeeModel: ['Connected socket outlet'],
        model: '170-33505',
        vendor: 'Niko',
        description: 'Connected socket outlet',
        supports: 'on/off, power measurement',
        fromZigbee: [fz.on_off, fz.electrical_measurement_power],
        toZigbee: [tz.on_off],
        meta: {configureKey: 5},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement']);
            await readEletricalMeasurementPowerConverterAttributes(endpoint);
            await configureReporting.activePower(endpoint);
            await configureReporting.rmsCurrent(endpoint);
            await configureReporting.rmsVoltage(endpoint);
        },
    },

    // Titan Products
    {
        zigbeeModel: ['TPZRCO2HT-Z3'],
        model: 'TPZRCO2HT-Z3',
        vendor: 'Titan Products',
        description: 'Room CO2, humidity & temperature sensor',
        supports: 'temperature, humidity and co2',
        fromZigbee: [fz.battery, fz.humidity, fz.temperature, fz.co2],
        toZigbee: [],
        meta: {configureKey: 2},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'msTemperatureMeasurement', 'msCO2']);
            await bind(device.getEndpoint(2), coordinatorEndpoint, ['msRelativeHumidity']);
        },
    },
];

module.exports = devices.map((device) =>
    device.extend ? Object.assign({}, device.extend, device) : device,
);
