import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import extend from '../lib/extend';
import * as ota from '../lib/ota';
import {fzLegrand, tzLegrand} from '../lib/legrand';
const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        zigbeeModel: [' Light switch with neutral\u0000\u0000\u0000\u0000\u0000'],
        model: 'K4003C/L4003C/N4003C/NT4003C',
        vendor: 'BTicino',
        description: 'Light switch with neutral',
        ota: ota.zigbeeOTA,
        fromZigbee: [fz.identify, fz.on_off, fz.K4003C_binary_input, fzLegrand.cluster_fc01],
        toZigbee: [tz.on_off, tzLegrand.led_mode, tz.legrand_identify],
        exposes: [
            e.switch(),
            e.action(['identify', 'on', 'off']),
            e.binary('led_in_dark', ea.ALL, 'ON', 'OFF')
                .withDescription('Enables the LED when the light is turned off, allowing to see the switch in the dark'),
            e.binary('led_if_on', ea.ALL, 'ON', 'OFF')
                .withDescription('Enables the LED when the light is turned on'),
            e.enum('identify', ea.SET, ['blink'])
                .withDescription('Blinks the built-in LED to make it easier to find the device'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'genBinaryInput']);
        },
    },
    {
        zigbeeModel: [' Dimmer switch with neutral\u0000\u0000\u0000\u0000'],
        model: 'L4411C/N4411C/NT4411C',
        vendor: 'BTicino',
        description: 'Dimmer switch with neutral',
        ota: ota.zigbeeOTA,
        fromZigbee: [fz.brightness, fz.identify, fz.on_off, fz.lighting_ballast_configuration, fzLegrand.cluster_fc01],
        toZigbee: [tz.light_onoff_brightness, tzLegrand.led_mode, tz.legrand_device_mode, tz.legrand_identify, tz.ballast_config],
        exposes: [
            e.light_brightness(),
            e.numeric('ballast_minimum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the minimum brightness value'),
            e.numeric('ballast_maximum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the maximum brightness value'),
            e.binary('device_mode', ea.ALL, 'dimmer_on', 'dimmer_off')
                .withDescription('Allow the device to change brightness'),
            e.binary('led_in_dark', ea.ALL, 'ON', 'OFF')
                .withDescription('Enables the LED when the light is turned off, allowing to see the switch in the dark'),
            e.binary('led_if_on', ea.ALL, 'ON', 'OFF')
                .withDescription('Enables the LED when the light is turned on'),
            e.enum('identify', ea.SET, ['blink'])
                .withDescription('Blinks the built-in LED to make it easier to find the device'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'genLevelCtrl', 'genBinaryInput', 'lightingBallastCfg']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ['Bticino Din power consumption module '],
        model: 'F20T60A',
        description: 'DIN power consumption module (same as Legrand 412015)',
        vendor: 'BTicino',
        extend: extend.switch(),
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement, fzLegrand.cluster_fc01, fz.ignore_basic_report, fz.ignore_genOta],
        toZigbee: [tz.legrand_device_mode, tz.on_off, tz.legrand_identify, tz.electrical_measurement_power],
        exposes: [
            e.switch()
                .withState('state', true, 'On/off (works only if device is in "switch" mode)'),
            e.power()
                .withAccess(ea.STATE_GET),
            e.enum('device_mode', ea.ALL, ['switch', 'auto'])
                .withDescription('switch: allow on/off, auto will use wired action via C1/C2 on contactor for example with HC/HP'),
        ],
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
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement, fzLegrand.cluster_fc01],
        toZigbee: [tz.on_off, tzLegrand.led_mode, tz.legrand_identify],
        exposes: [
            e.switch(),
            e.action(['identify']),
            e.power(),
            e.voltage(),
            e.current(),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'haElectricalMeasurement']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
        },
    },
];

export default definitions;
module.exports = definitions;
