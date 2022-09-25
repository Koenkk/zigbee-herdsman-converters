const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

const local = {
    fz: {
        switch_operation_mode: {
            cluster: 'manuSpecificNiko1',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const state = {};
                if (msg.data.hasOwnProperty('switchOperationMode')) {
                    const operationModeProperty = `operation_mode${meta.endpoint_name ? `_${meta.endpoint_name}` : ''}`;
                    const operationModeMap = {0x02: 'control_relay', 0x01: 'decoupled', 0x00: 'unknown'};
                    state[operationModeProperty] = operationModeMap[msg.data.switchOperationMode];
                }
                return state;
            },
        },
        switch_action: {
            cluster: 'manuSpecificNiko2',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const state = {};

                if (msg.data.hasOwnProperty('switchAction')) {
                    // NOTE: a single press = two seperate values reported, 16 followed by 64
                    //       a hold/release cyle = three seperate values, 16, 32, and 48
                    const actionProperty = `action${meta.endpoint_name ? `_${meta.endpoint_name}` : ''}`;
                    const actionMap = {16: null, 64: 'single', 32: 'hold', 48: 'release'};
                    state[actionProperty] = actionMap[msg.data.switchAction];
                }
                return state;
            },
        },
        outlet: {
            cluster: 'manuSpecificNiko1',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const state = {};
                if (msg.data.hasOwnProperty('outletChildLock')) {
                    state['child_lock'] = (msg.data['outletChildLock'] == 0 ? 'LOCK' : 'UNLOCK');
                }
                if (msg.data.hasOwnProperty('outletLedState')) {
                    state['led_enable'] = (msg.data['outletLedState'] == 1);
                }
                return state;
            },
        },
    },
    tz: {
        switch_operation_mode: {
            key: ['operation_mode'],
            convertSet: async (entity, key, value, meta) => {
                // WARN: while we can technically write 0x00 to the operationMode attribute
                //       this seems to brick the device and it will need to be rejoined
                const operationModeLookup = {control_relay: 0x02, decoupled: 0x01};
                if (!operationModeLookup.hasOwnProperty(value)) {
                    throw new Error(`operation_mode was called with an invalid value (${value})`);
                } else {
                    await entity.write('manuSpecificNiko1', {'switchOperationMode': operationModeLookup[value]});
                    return {state: {operation_mode: value.toLowerCase()}};
                }
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificNiko1', ['switchOperationMode']);
            },
        },
        outlet_child_lock: {
            key: ['child_lock'],
            convertSet: async (entity, key, value, meta) => {
                await entity.write('manuSpecificNiko1', {'outletChildLock': ((value.toLowerCase() === 'lock') ? 0 : 1)});
                return {state: {child_lock: ((value.toLowerCase() === 'lock') ? 'LOCK' : 'UNLOCK')}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificNiko1', ['outletChildLock']);
            },
        },
        outlet_led_enable: {
            key: ['led_enable'],
            convertSet: async (entity, key, value, meta) => {
                await entity.write('manuSpecificNiko1', {'outletLedState': ((value) ? 1 : 0)});
                return {state: {led_enable: ((value) ? true : false)}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificNiko1', ['outletLedState']);
            },
        },
    },
};

module.exports = [
    {
        zigbeeModel: ['Connected socket outlet'],
        model: '170-33505/170-34605',
        vendor: 'Niko',
        description: 'Connected socket outlet',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, local.fz.outlet],
        toZigbee: [
            tz.on_off, tz.electrical_measurement_power, tz.currentsummdelivered,
            local.tz.outlet_child_lock, local.tz.outlet_led_enable,
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);

            // NOTE: we read them individually, acFrequency* is not supported
            //       so we cannot use readEletricalMeasurementMultiplierDivisors
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.activePower(endpoint, {min: 5, max: 3600, change: 1000});
            await endpoint.read('haElectricalMeasurement', ['acCurrentDivisor', 'acPowerMultiplier', 'acPowerDivisor']);
            await reporting.rmsCurrent(endpoint, {min: 5, max: 3600, change: 100});
            await endpoint.read('haElectricalMeasurement', ['acVoltageMultiplier', 'acVoltageDivisor', 'acCurrentMultiplier']);
            await reporting.rmsVoltage(endpoint, {min: 5, max: 3600, change: 100});

            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 60, change: 1});

            await endpoint.read('manuSpecificNiko1', ['outletChildLock']);
            await endpoint.read('manuSpecificNiko1', ['outletLedState']);
        },
        exposes: [
            e.switch(),
            e.power().withAccess(ea.STATE_GET), e.current(), e.voltage(),
            e.energy().withAccess(ea.STATE_GET),
            exposes.binary('child_lock', ea.ALL, 'LOCK', 'UNLOCK').withDescription('Enables/disables physical input on the device'),
            exposes.binary('led_enable', ea.ALL, true, false).withDescription('Enable LED'),
        ],
    },
    {
        zigbeeModel: ['Smart plug Zigbee SE'],
        model: '552-80698',
        vendor: 'Niko',
        description: 'Smart plug with side earthing pin',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior, tz.electrical_measurement_power, tz.currentsummdelivered],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            // only activePower seems to be support, although compliance document states otherwise
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.activePower(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 60, change: 1});
        },
        exposes: [
            e.switch(), e.power().withAccess(ea.STATE_GET), e.energy().withAccess(ea.STATE_GET),
            exposes.enum('power_on_behavior', ea.ALL, ['off', 'previous', 'on'])
                .withDescription('Controls the behaviour when the device is powered on'),
        ],
    },
    {
        zigbeeModel: ['Smart plug Zigbee PE'],
        model: '552-80699',
        vendor: 'Niko',
        description: 'Smart plug with earthing pin',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior, tz.electrical_measurement_power, tz.currentsummdelivered],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            // only activePower seems to be support, although compliance document states otherwise
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.activePower(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 60, change: 1});
        },
        exposes: [
            e.switch(), e.power().withAccess(ea.STATE_GET), e.energy().withAccess(ea.STATE_GET),
            exposes.enum('power_on_behavior', ea.ALL, ['off', 'previous', 'on'])
                .withDescription('Controls the behaviour when the device is powered on'),
        ],
    },
    {
        zigbeeModel: ['Connectable motion sensor,Zigbee'],
        model: '552-80401',
        vendor: 'Niko',
        description: 'Wireless motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ['genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.battery()],
    },
    {
        zigbeeModel: ['Single connectable switch,10A'],
        model: '552-721X1',
        vendor: 'Niko',
        description: 'Single connectable switch',
        fromZigbee: [fz.on_off, local.fz.switch_operation_mode, local.fz.switch_action],
        toZigbee: [tz.on_off, local.tz.switch_operation_mode],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
            await endpoint.read('manuSpecificNiko1', ['switchOperationMode']);
        },
        exposes: [
            e.switch(),
            e.action(['single', 'hold', 'release']),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled']),
        ],
    },
    {
        zigbeeModel: ['Double connectable switch,10A'],
        model: '552-721X2',
        vendor: 'Niko',
        description: 'Double connectable switch',
        fromZigbee: [fz.on_off, local.fz.switch_operation_mode, local.fz.switch_action],
        toZigbee: [tz.on_off, local.tz.switch_operation_mode],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const ep1 = device.getEndpoint(1);
            const ep2 = device.getEndpoint(2);
            await reporting.bind(ep1, coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(ep2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(ep1);
            await reporting.onOff(ep2);
            await ep1.read('manuSpecificNiko1', ['switchOperationMode']);
            await ep2.read('manuSpecificNiko1', ['switchOperationMode']);
        },
        exposes: [
            e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'),
            e.action(['single', 'hold', 'release']).withEndpoint('l1'),
            e.action(['single', 'hold', 'release']).withEndpoint('l2'),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled']).withEndpoint('l1'),
            exposes.enum('operation_mode', ea.ALL, ['control_relay', 'decoupled']).withEndpoint('l2'),
        ],
    },
    {
        zigbeeModel: ['Connectable dimmer,3-200W,2-wire'],
        model: '552-72201',
        vendor: 'Niko',
        description: 'Connectable dimmer',
        fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fz.command_move, fz.command_stop],
        toZigbee: [tz.light_onoff_brightness, tz.level_config],
        exposes: [e.light_brightness().withLevelConfig()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ['Connectable motor control,3A'],
        model: '552-72301',
        vendor: 'Niko',
        description: 'Connectable motor control',
        fromZigbee: [fz.cover_position_tilt, fz.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
        exposes: [e.cover_position()],
    },
];
