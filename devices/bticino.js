const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: [' Light switch with neutral\u0000\u0000\u0000\u0000\u0000'],
        model: 'K4003C/L4003C/N4003C/NT4003C',
        vendor: 'BTicino',
        description: 'Light switch with neutral',
        fromZigbee: [fz.identify, fz.on_off, fz.K4003C_binary_input],
        toZigbee: [tz.on_off, tz.legrand_settingAlwaysEnableLed, tz.legrand_settingEnableLedIfOn, tz.legrand_identify],
        exposes: [
            e.switch(), e.action(['identify', 'on', 'off']),
            exposes.binary('permanent_led', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable or disable the permanent blue LED'),
            exposes.binary('led_when_on', ea.STATE_SET, 'ON', 'OFF').withDescription('Enables the LED when the light is on'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'genBinaryInput']);
        },
    },
    {
        zigbeeModel: [' Dimmer switch with neutral\u0000\u0000\u0000\u0000'],
        model: 'L441C/N4411C/NT4411C',
        vendor: 'BTicino',
        description: 'Dimmer switch with neutral',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        fromZigbee: [fz.brightness, fz.identify, fz.on_off, fz.lighting_ballast_configuration],
        toZigbee: [tz.light_onoff_brightness, tz.legrand_settingAlwaysEnableLed, tz.legrand_settingEnableLedIfOn,
            tz.legrand_settingEnableDimmer, tz.legrand_identify, tz.ballast_config],
        exposes: [e.light_brightness(),
            exposes.numeric('ballast_minimum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the minimum brightness value'),
            exposes.numeric('ballast_maximum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the maximum brightness value'),
            exposes.binary('dimmer_enabled', ea.STATE_SET, 'ON', 'OFF').withDescription('Allow the device to change brightness'),
            exposes.binary('permanent_led', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable or disable the permanent blue LED'),
            exposes.binary('led_when_on', ea.STATE_SET, 'ON', 'OFF').withDescription('Enables the LED when the light is on')],
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
        // Newer firmwares (e.g. 001f) Does support partial position reporting
        // Old firmware of this device provides only three values: 0, 100 and 50, 50 means an idefinite position between 1 and 99.
        // If you have an old Firmware set no_position_support to true
        // https://github.com/Koenkk/zigbee-herdsman-converters/pull/2214 - 1st very basic support
        zigbeeModel: [' Shutter SW with level control\u0000'],
        model: 'K4027C/L4027C/N4027C/NT4027C',
        vendor: 'BTicino',
        description: 'Shutter SW with level control',
        fromZigbee: [fz.identify, fz.ignore_basic_report, fz.ignore_zclversion_read, fz.bticino_4027C_binary_input_moving,
            fz.cover_position_tilt],
        toZigbee: [tz.bticino_4027C_cover_state, tz.bticino_4027C_cover_position, tz.legrand_identify,
            tz.legrand_settingAlwaysEnableLed],
        exposes: [e.cover_position()],
        meta: {coverInverted: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBinaryInput', 'closuresWindowCovering', 'genIdentify']);
        },
    },
    {
        zigbeeModel: ['Bticino Din power consumption module '],
        model: 'F20T60A',
        description: 'DIN power consumption module (same as Legrand 412015)',
        vendor: 'BTicino',
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
        zigbeeModel: ['Power socket Bticino Serie LL '],
        model: 'L4531C',
        vendor: 'BTicino',
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
];
