const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;
const ota = require('../lib/ota');
const utils = require('../lib/utils');

const readInitialBatteryState = async (type, data, device) => {
    if (['deviceAnnounce'].includes(type)) {
        const endpoint = device.getEndpoint(1);
        const options = {manufacturerCode: 0x1021, disableDefaultResponse: true};
        await endpoint.read('genPowerCfg', ['batteryVoltage'], options);
    }
};

const fzLocal = {
    command_off: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options, meta) => {
            const payload = {action: utils.postfixWithEndpointName('off', msg, model, meta)};
            utils.addActionGroup(payload, msg, model);
            return payload;
        },
    },
    command_toggle: {
        cluster: 'genOnOff',
        type: 'commandToggle',
        convert: (model, msg, publish, options, meta) => {
            // Re-uses transactions sequence number so hasAlreadyProcessedMessage(msg) suppresess actions
            // https://github.com/Koenkk/zigbee2mqtt/issues/14256
            const payload = {action: utils.postfixWithEndpointName('toggle', msg, model, meta)};
            utils.addActionGroup(payload, msg, model);
            return payload;
        },
    },
};

module.exports = [
    {
        zigbeeModel: [' Contactor\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'+
            '\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'],
        model: '412171',
        description: 'DIN contactor module ( Bticino FC80CC )',
        vendor: 'Legrand',
        extend: extend.switch(),
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement, fz.legrand_cluster_fc01, fz.ignore_basic_report, fz.ignore_genOta],
        toZigbee: [tz.legrand_deviceMode, tz.on_off, tz.legrand_identify, tz.electrical_measurement_power],
        exposes: [exposes.switch().withState('state', true, 'On/off (works only if device is in "switch" mode)'),
            e.power().withAccess(ea.STATE_GET), exposes.enum('device_mode', ea.ALL, ['switch', 'auto'])
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
        model: '412170',
        description: 'DIN smart relay for light control ( Bticino FC80RC ) ',
        vendor: 'Legrand',
        extend: extend.switch(),
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement, fz.legrand_cluster_fc01, fz.ignore_basic_report, fz.ignore_genOta],
        toZigbee: [tz.legrand_deviceMode, tz.on_off, tz.legrand_identify, tz.electrical_measurement_power],
        exposes: [exposes.switch().withState('state', true, 'On/off (works only if device is in "switch" mode)'),
            e.power().withAccess(ea.STATE_GET), exposes.enum('device_mode', ea.ALL, ['switch', 'auto'])
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
        ota: ota.zigbeeOTA,
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
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.legrand_identify, tz.legrand_settingEnableLedInDark],
        meta: {coverInverted: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBinaryInput', 'closuresWindowCovering', 'genIdentify']);
            await reporting.currentPositionLiftPercentage(endpoint);
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
        fromZigbee: [fz.identify, fz.command_on, fzLocal.command_off, fzLocal.command_toggle, fz.legacy.cmd_move, fz.legacy.cmd_stop,
            fz.battery],
        exposes: [e.battery(), e.action(['identify', 'on', 'off', 'toggle', 'brightness_move_up',
            'brightness_move_down', 'brightness_stop'])],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genOnOff', 'genLevelCtrl']);
        },
    },
    {
        zigbeeModel: [' Double gangs remote switch\u0000\u0000\u0000\u0000'],
        model: '067774',
        vendor: 'Legrand',
        description: 'Wireless double remote switch',
        fromZigbee: [fz.identify, fz.command_on, fzLocal.command_off, fzLocal.command_toggle, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.battery(),
            e.action(['identify', 'on', 'off', 'toggle', 'brightness_move_up', 'brightness_move_down', 'brightness_stop'])],
        toZigbee: [],
        meta: {multiEndpoint: true, battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genOnOff', 'genLevelCtrl']);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        },
        endpoint: (device) => {
            return {left: 1, right: 2};
        },
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
        description: 'Wired switch without neutral',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        fromZigbee: [fz.brightness, fz.identify, fz.on_off, fz.lighting_ballast_configuration, fz.legrand_cluster_fc01,
            fz.power_on_behavior],
        toZigbee: [tz.light_onoff_brightness, tz.legrand_settingEnableLedInDark, tz.legrand_settingEnableLedIfOn,
            tz.legrand_deviceMode, tz.legrand_identify, tz.ballast_config, tz.power_on_behavior],
        exposes: [e.light_brightness(),
            exposes.numeric('ballast_minimum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the minimum brightness value'),
            exposes.numeric('ballast_maximum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the maximum brightness value'),
            exposes.binary('device_mode', ea.ALL, 'dimmer_on', 'dimmer_off').withDescription('Allow the device to change brightness'),
            exposes.binary('led_in_dark', ea.ALL, 'ON', 'OFF').withDescription(`Enables the LED when the light is turned off, allowing to 
                see the switch in the dark`),
            exposes.binary('led_if_on', ea.ALL, 'ON', 'OFF').withDescription('Enables the LED when the light is turned on'),
            e.power_on_behavior()],
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'genLevelCtrl',
                'genBinaryInput', 'lightingBallastCfg']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: [' Connected outlet\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'],
        model: '067775/741811',
        vendor: 'Legrand',
        ota: ota.zigbeeOTA,
        description: 'Power socket with power consumption monitoring',
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.legrand_settingEnableLedInDark, tz.legrand_identify, tz.legrand_settingEnableLedIfOn,
            tz.power_on_behavior],
        exposes: [e.switch(), e.action(['identify']), e.power(),
            exposes.binary('led_in_dark', ea.ALL, 'ON', 'OFF').withDescription(`Enables the LED when the power socket is turned off,
                allowing to see it in the dark`),
            exposes.binary('led_if_on', ea.ALL, 'ON', 'OFF').withDescription('Enables the LED when the device is turned on'),
            e.power_on_behavior()],
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
        ota: ota.zigbeeOTA,
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
        toZigbee: [tz.legrand_settingEnableLedInDark, tz.legrand_identify, tz.electrical_measurement_power, tz.legrand_powerAlarm],
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
        onEvent: async (type, data, device, options, state) => {
            /**
             * The DIN power consumption module loses the configure reporting
             * after device restart/powerloss.
             *
             * We reconfigure the reporting at deviceAnnounce.
             */
            if (type === 'deviceAnnounce') {
                for (const endpoint of device.endpoints) {
                    for (const c of endpoint.configuredReportings) {
                        await endpoint.configureReporting(c.cluster.name, [{
                            attribute: c.attribute.name, minimumReportInterval: c.minimumReportInterval,
                            maximumReportInterval: c.maximumReportInterval, reportableChange: c.reportableChange,
                        }]);
                    }
                }
            }
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
    {
        fingerprint: [{modelID: 'GreenPower_254', ieeeAddr: /^0x00000000005.....$/}],
        model: 'ZLGP15',
        vendor: 'Legrand',
        description: 'Wireless and batteryless 4 scenes control',
        fromZigbee: [fz.legrand_zlgp15],
        toZigbee: [],
        exposes: [e.action(['press_1', 'press_2', 'press_3', 'press_4'])],
    },
    {
        fingerprint: [{modelID: 'GreenPower_2', ieeeAddr: /^0x00000000005.....$/}],
        model: 'ZLGP17/ZLGP18',
        vendor: 'Legrand',
        description: 'Wireless and batteryless (double) lighting control',
        fromZigbee: [fz.legrand_zlgp17_zlgp18],
        toZigbee: [],
        exposes: [e.action(['press_once', 'press_twice'])],
    },
    {
        zigbeeModel: [' Cable outlet\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000' +
            '\u0000\u0000'],
        model: '064882',
        vendor: 'Legrand',
        description: 'Cable outlet with pilot wire and consumption measurement',
        fromZigbee: [fz.legrand_cluster_fc01, fz.legrand_cable_outlet_mode, fz.on_off, fz.electrical_measurement, fz.power_on_behavior],
        toZigbee: [tz.legrand_deviceMode, tz.legrand_cableOutletMode, tz.on_off, tz.electrical_measurement_power, tz.power_on_behavior],
        exposes: [exposes.binary('device_mode', ea.ALL, 'pilot_on', 'pilot_off'),
            exposes.enum('cable_outlet_mode', ea.ALL, ['comfort', 'comfort-1', 'comfort-2', 'eco', 'frost_protection', 'off']),
            exposes.switch().withState('state', true, 'Works only when the pilot wire is deactivated'),
            e.power().withAccess(ea.STATE_GET),
            e.power_on_behavior().withDescription(`Controls the behavior when the device is powered on. Works only when the pilot wire is
                deactivated`)],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'manuSpecificLegrandDevices2']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
        },
    },
    {
        zigbeeModel: [' NLIS - Double light switch\u0000\u0000\u0000\u0000'],
        model: '067772',
        vendor: 'Legrand',
        description: 'Double wired switch with neutral',
        fromZigbee: [fz.on_off, fz.legrand_binary_input_on_off, fz.legrand_cluster_fc01],
        toZigbee: [tz.on_off, tz.legrand_settingEnableLedInDark, tz.legrand_settingEnableLedIfOn],
        exposes: [e.switch().withEndpoint('left'),
            e.switch().withEndpoint('right'),
            exposes.binary('led_in_dark', ea.ALL, 'ON', 'OFF').withDescription(`Enables the LED when the light is turned off, allowing to 
                see the switch in the dark`),
            exposes.binary('led_if_on', ea.ALL, 'ON', 'OFF').withDescription('Enables the LED when the light is turned on')],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpointLeft = device.getEndpoint(2);
            await reporting.bind(endpointLeft, coordinatorEndpoint, ['genOnOff', 'genBinaryInput']);
            const endpointRight = device.getEndpoint(1);
            await reporting.bind(endpointRight, coordinatorEndpoint, ['genOnOff', 'genBinaryInput']);
        },
        endpoint: (device) => {
            return {left: 2, right: 1};
        },
    },
    {
        zigbeeModel: [' Mobile outlet\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u0000'+
            '\u0000\u0000\u0000\u0000\u0000\u0000\u0000'],
        model: 'WNRR15/WNRR20',
        vendor: 'Legrand',
        ota: ota.zigbeeOTA,
        description: 'Outlet with power consumption monitoring',
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement],
        toZigbee: [tz.on_off, tz.legrand_settingEnableLedInDark, tz.legrand_identify],
        exposes: [e.switch(), e.action(['identify']), e.power()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
        },
    },
];
