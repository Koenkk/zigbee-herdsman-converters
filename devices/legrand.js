const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

const readInitialBatteryState = async (type, data, device) => {
    if (['deviceAnnounce'].includes(type)) {
        const endpoint = device.getEndpoint(1);
        const options = {manufacturerCode: 0x1021, disableDefaultResponse: true};
        await endpoint.read('genPowerCfg', ['batteryVoltage'], options);
    }
};

module.exports = [
    {
        zigbeeModel: [' Contactor\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'+
            '\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'],
        model: 'FC80CC',
        description: 'Legrand (or Bticino) DIN contactor module (note: Legrand 412171 may be similar to Bticino FC80CC)',
        vendor: 'Legrand',
        extend: extend.switch(),
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement, fz.legrand_device_mode, fz.ignore_basic_report, fz.ignore_genOta],
        toZigbee: [tz.legrand_deviceMode, tz.on_off, tz.legrand_identify, tz.electrical_measurement_power],
        exposes: [exposes.switch().withState('state', true, 'On/off (works only if device is in "switch" mode)'),
            e.power().withAccess(ea.STATE_GET), exposes.enum( 'device_mode', ea.ALL, ['switch', 'auto'])
                .withDescription('switch: allow on/off, auto will use wired action via C1/C2 on contactor for example with HC/HP')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: [' Teleruptor\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'+
            '\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'],
        model: 'FC80RC',
        description: 'Legrand (or Bticino) DIN smart relay for light control (note: Legrand 412170 may be similar to Bticino FC80RC)',
        vendor: 'Legrand',
        extend: extend.switch(),
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement, fz.legrand_device_mode, fz.ignore_basic_report, fz.ignore_genOta],
        toZigbee: [tz.legrand_deviceMode, tz.on_off, tz.legrand_identify, tz.electrical_measurement_power],
        exposes: [exposes.switch().withState('state', true, 'On/off (works only if device is in "switch" mode)'),
            e.power().withAccess(ea.STATE_GET), exposes.enum( 'device_mode', ea.ALL, ['switch', 'auto'])
                .withDescription('switch: allow on/off, auto will use wired action via C1/C2 on teleruptor with buttons')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: [' Shutters central remote switch'],
        model: '067646',
        vendor: 'Legrand',
        description: 'Wireless shutter switch',
        fromZigbee: [fz.identify, fz.ignore_basic_report, fz.command_cover_open, fz.command_cover_close, fz.command_cover_stop, fz.battery,
            fz.legrand_binary_input_moving],
        toZigbee: [],
        exposes: [e.battery(), e.action(['identify', 'open', 'close', 'stop', 'moving', 'stopped'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genBinaryInput', 'closuresWindowCovering', 'genIdentify']);
        },
        onEvent: async (type, data, device, options) => {
            await readInitialBatteryState(type, data, device);

            if (data.type === 'commandCheckin' && data.cluster === 'genPollCtrl') {
                const endpoint = device.getEndpoint(1);
                const options = {manufacturerCode: 0x1021, disableDefaultResponse: true};
                await endpoint.command('genPollCtrl', 'fastPollStop', {}, options);
            }
        },
    },
    {
        zigbeeModel: [' Shutter switch with neutral\u0000\u0000\u0000'],
        model: '067776',
        vendor: 'Legrand',
        description: 'Netatmo wired shutter switch',
        // the physical LED will be green when permit join is true, off otherwise and red when not linked
        fromZigbee: [
            // Devices can send an identify message when the configuration button is pressed
            // (behind the physical buttons)
            // Used on the official gateway to send to every devices an identify command (green)
            fz.identify, fz.ignore_basic_report,
            // support binary report on moving state (supposed)
            fz.legrand_binary_input_moving, fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.legrand_identify, tz.legrand_settingAlwaysEnableLed],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBinaryInput', 'closuresWindowCovering', 'genIdentify']);
        },
        exposes: [e.cover_position()],
    },
    {
        zigbeeModel: [
            ' Remote switch\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'],
        model: '067773',
        vendor: 'Legrand',
        // led blink RED when battery is low
        description: 'Wireless remote switch',
        fromZigbee: [fz.identify, fz.command_on, fz.command_off, fz.command_toggle, fz.legacy.cmd_move, fz.legacy.cmd_stop, fz.battery],
        exposes: [e.battery(), e.action(['identify', 'on', 'off', 'toggle', 'brightness_move_up',
            'brightness_move_down', 'brightness_stop'])],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genOnOff', 'genLevelCtrl']);
        },
        onEvent: readInitialBatteryState,
    },
    {
        zigbeeModel: [' Double gangs remote switch', 'Double gangs remote switch'],
        model: '067774',
        vendor: 'Legrand',
        description: 'Wireless double remote switch',
        exposes: [e.battery(), e.action(['identify', 'on', 'off', 'brightness_stop', 'brightness_move_up', 'brightness_move_down'])],
        fromZigbee: [fz.identify, fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        toZigbee: [],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {left: 1, right: 2};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genOnOff', 'genLevelCtrl']);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genPowerCfg', 'genOnOff', 'genLevelCtrl']);
        },
        onEvent: readInitialBatteryState,
    },
    {
        zigbeeModel: [' Remote toggle switch\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'],
        model: '067694',
        vendor: 'Legrand',
        description: 'Remote toggle switch',
        fromZigbee: [fz.identify, fz.command_on, fz.command_off, fz.command_toggle, fz.battery],
        exposes: [e.battery(), e.action(['identify', 'on', 'off', 'toggle'])],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genOnOff']);
        },
        onEvent: readInitialBatteryState,
    },
    {
        zigbeeModel: [' Dimmer switch w/o neutral\u0000\u0000\u0000\u0000\u0000'],
        model: '067771',
        vendor: 'Legrand',
        // led blink RED when battery is low
        description: 'Wired switch without neutral',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        fromZigbee: [fz.brightness, fz.identify, fz.on_off],
        toZigbee: [tz.light_onoff_brightness, tz.legrand_settingAlwaysEnableLed, tz.legrand_settingEnableLedIfOn,
            tz.legrand_settingEnableDimmer, tz.legrand_identify],
        exposes: [e.light_brightness()],
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'genLevelCtrl', 'genBinaryInput']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: [' Connected outlet\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'],
        model: '067775/741811',
        vendor: 'Legrand',
        description: 'Power socket with power consumption monitoring',
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off, tz.legrand_settingAlwaysEnableLed, tz.legrand_identify],
        exposes: [e.switch(), e.action(['identify']), e.power(), e.voltage(), e.current()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: [' Micromodule switch\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'],
        model: '064888',
        vendor: 'Legrand',
        description: 'Wired micromodule switch',
        extend: extend.switch(),
        fromZigbee: [fz.identify, fz.on_off],
        toZigbee: [tz.on_off, tz.legrand_identify],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genBinaryInput']);
        },
    },
    {
        zigbeeModel: [' Master remote SW Home / Away\u0000\u0000'],
        model: '064873',
        vendor: 'Legrand',
        // led blink RED when battery is low
        description: 'Home & away switch / master switch',
        fromZigbee: [fz.legrand_scenes, fz.legrand_master_switch_center, fz.ignore_poll_ctrl, fz.battery],
        exposes: [e.battery(), e.action(['enter', 'leave', 'sleep', 'wakeup', 'center'])],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genPowerCfg']);
        },
        onEvent: async (type, data, device) => {
            await readInitialBatteryState(type, data, device);

            if (data.type === 'commandCheckin' && data.cluster === 'genPollCtrl') {
                // TODO current solution is a work around, it would be cleaner to answer to the request
                const endpoint = device.getEndpoint(1);
                const options = {manufacturerCode: 0x1021, disableDefaultResponse: true};
                await endpoint.command('genPollCtrl', 'fastPollStop', {}, options);
            }
        },
    },
    {
        zigbeeModel: [' DIN power consumption module\u0000\u0000', ' DIN power consumption module'],
        model: '412015',
        vendor: 'Legrand',
        description: 'DIN power consumption module',
        fromZigbee: [fz.identify, fz.metering, fz.electrical_measurement, fz.ignore_basic_report, fz.ignore_genOta, fz.legrand_power_alarm],
        toZigbee: [tz.legrand_settingAlwaysEnableLed, tz.legrand_identify, tz.electrical_measurement_power, tz.legrand_powerAlarm],
        exposes: [e.power().withAccess(ea.STATE_GET), exposes.binary('power_alarm_active', ea.STATE, true, false),
            exposes.binary('power_alarm', ea.ALL, true, false).withDescription('Enable/disable the power alarm')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'genIdentify']);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            // Read configuration values that are not sent periodically as well as current power (activePower).
            await endpoint.read('haElectricalMeasurement', ['activePower', 0xf000, 0xf001, 0xf002]);
        },
    },
    {
        zigbeeModel: ['Remote switch Wake up / Sleep'],
        model: '752189',
        vendor: 'Legrand',
        description: 'Night/day wireless switch',
        fromZigbee: [fz.legrand_scenes, fz.battery, fz.ignore_poll_ctrl, fz.legrand_master_switch_center],
        toZigbee: [],
        exposes: [e.battery(), e.action(['enter', 'leave', 'sleep', 'wakeup', 'center'])],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genPowerCfg']);
        },
    },
];
