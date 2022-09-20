const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const ota = require('../lib/ota');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['Contact Sensor-A'],
        model: '74388',
        vendor: 'Sylvania',
        description: 'Smart+ contact and temperature sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
            await reporting.temperature(endpoint);
        },
        exposes: [e.contact(), e.battery(), e.battery_low(), e.tamper(), e.temperature()],
    },
    {
        zigbeeModel: ['LIGHTIFY Dimming Switch'],
        model: '73743',
        vendor: 'Sylvania',
        description: 'Lightify Smart Dimming Switch',
        fromZigbee: [fz.legacy.osram_lightify_switch_cmdOn, fz.legacy.osram_lightify_switch_cmdMoveWithOnOff,
            fz.legacy.osram_lightify_switch_cmdOff, fz.legacy.osram_lightify_switch_cmdMove,
            fz.legacy.osram_lightify_switch_73743_cmdStop, fz.battery],
        exposes: [e.battery(), e.action(['up', 'up_hold', 'down', 'down_hold', 'up_release', 'down_release'])],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        ota: ota.ledvance,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['LIGHTIFY RT Tunable White', 'RT TW'],
        model: '73742',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED adjustable white RT 5/6',
        extend: extend.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['RT RGBW'],
        model: '73741',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED adjustable color RT 5/6',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LIGHTIFY BR Tunable White', 'BR30 TW'],
        model: '73740',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED adjustable white BR30',
        extend: extend.ledvance.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LIGHTIFY BR RGBW', 'BR30 RGBW'],
        model: '73739',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED RGBW BR30',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LIGHTIFY A19 RGBW', 'A19 RGBW'],
        model: '73693',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED RGBW A19',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Flex XL RGBW', 'Flex RGBW Pro'],
        model: '73773',
        vendor: 'Sylvania',
        description: 'SMART+ Flex XL RGBW strip',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LIGHTIFY A19 ON/OFF/DIM', 'LIGHTIFY A19 ON/OFF/DIM 10 Year'],
        model: '74283',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED soft white dimmable A19',
        extend: extend.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LIGHTIFY BR ON/OFF/DIM'],
        model: '73807',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED soft white dimmable BR30',
        extend: extend.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A19 W 10 year'],
        model: '74696',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED soft white dimmable A19',
        extend: extend.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PLUG'],
        model: '72922-A',
        vendor: 'Sylvania',
        description: 'SMART+ Smart Plug',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A19 TW 10 year'],
        model: '71831',
        vendor: 'Sylvania',
        description: 'Smart Home adjustable white A19 LED bulb',
        extend: extend.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['MR16 TW'],
        model: '74282',
        vendor: 'Sylvania',
        description: 'Smart Home adjustable white MR16 LED bulb',
        extend: extend.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['LIGHTIFY Gardenspot RGB'],
        model: 'LTFY004',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED gardenspot mini RGB',
        extend: extend.ledvance.light_onoff_brightness_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['PAR38 W 10 year'],
        model: '74580',
        vendor: 'Sylvania',
        description: 'Smart Home soft white PAR38 outdoor bulb',
        extend: extend.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Edge-lit Under Cabinet TW'],
        model: '72569',
        vendor: 'Sylvania',
        description: 'SMART+ Zigbee adjustable white edge-lit under cabinet light',
        extend: extend.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Flushmount TW'],
        model: '72567',
        vendor: 'Sylvania',
        description: 'SMART+ Zigbee adjustable white edge-lit flush mount light',
        extend: extend.ledvance.light_onoff_brightness_colortemp(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['Outdoor Accent RGB', 'Outdoor Accent Light RGB'],
        model: '75541',
        vendor: 'Sylvania',
        description: 'SMART+ Outdoor Accent RGB lighting kit',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['iQBR30'],
        model: '484719',
        vendor: 'Sylvania',
        description: 'Dimmable soft white BR30 LED flood light bulb',
        extend: extend.ledvance.light_onoff_brightness(),
        ota: ota.ledvance,
    },
    {
        zigbeeModel: ['A19 G2 RGBW'],
        model: '75564',
        vendor: 'Sylvania',
        description: 'Smart+ adjustable white and full color bulb A19',
        extend: extend.ledvance.light_onoff_brightness_colortemp_color({colorTempRange: [142, 555]}),
        ota: ota.ledvance,
    },
];
