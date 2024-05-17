import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import * as ota from '../lib/ota';
import * as reporting from '../lib/reporting';
import {ledvanceLight, ledvanceOnOff} from '../lib/ledvance';

const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['Contact Sensor-A'],
        model: '74388',
        vendor: 'Sylvania',
        description: 'Smart+ contact and temperature sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint) => {
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
        fromZigbee: [legacy.fz.osram_lightify_switch_cmdOn, legacy.fz.osram_lightify_switch_cmdMoveWithOnOff,
            legacy.fz.osram_lightify_switch_cmdOff, legacy.fz.osram_lightify_switch_cmdMove,
            legacy.fz.osram_lightify_switch_73743_cmdStop, fz.battery],
        exposes: [e.battery(), e.action(['up', 'up_hold', 'down', 'down_hold', 'up_release', 'down_release'])],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        ota: ota.ledvance,
        configure: async (device, coordinatorEndpoint) => {
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
        extend: [ledvanceLight({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['RT RGBW'],
        model: '73741',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED adjustable color RT 5/6',
        extend: [ledvanceLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['LIGHTIFY BR Tunable White', 'BR30 TW'],
        model: '73740',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED adjustable white BR30',
        extend: [ledvanceLight({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['LIGHTIFY BR RGBW', 'BR30 RGBW'],
        model: '73739',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED RGBW BR30',
        extend: [ledvanceLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['LIGHTIFY A19 RGBW', 'A19 RGBW'],
        model: '73693',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED RGBW A19',
        extend: [ledvanceLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['Flex XL RGBW', 'Flex RGBW Pro'],
        model: '73773',
        vendor: 'Sylvania',
        description: 'SMART+ Flex XL RGBW strip',
        extend: [ledvanceLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['LIGHTIFY A19 ON/OFF/DIM', 'LIGHTIFY A19 ON/OFF/DIM 10 Year'],
        model: '74283',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED soft white dimmable A19',
        extend: [ledvanceLight({})],
    },
    {
        zigbeeModel: ['LIGHTIFY BR ON/OFF/DIM'],
        model: '73807',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED soft white dimmable BR30',
        extend: [ledvanceLight({})],
    },
    {
        zigbeeModel: ['A19 W 10 year'],
        model: '74696',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED soft white dimmable A19',
        extend: [ledvanceLight({})],
    },
    {
        zigbeeModel: ['PLUG'],
        model: '72922-A',
        vendor: 'Sylvania',
        description: 'SMART+ Smart Plug',
        extend: [ledvanceOnOff()],
    },
    {
        zigbeeModel: ['A19 TW 10 year'],
        model: '71831',
        vendor: 'Sylvania',
        description: 'Smart Home adjustable white A19 LED bulb',
        extend: [ledvanceLight({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['MR16 TW'],
        model: '74282',
        vendor: 'Sylvania',
        description: 'Smart Home adjustable white MR16 LED bulb',
        extend: [ledvanceLight({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['LIGHTIFY Gardenspot RGB'],
        model: 'LTFY004',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED gardenspot mini RGB',
        extend: [ledvanceLight({color: true})],
    },
    {
        zigbeeModel: ['PAR38 W 10 year'],
        model: '74580',
        vendor: 'Sylvania',
        description: 'Smart Home soft white PAR38 outdoor bulb',
        extend: [ledvanceLight({})],
    },
    {
        zigbeeModel: ['Edge-lit Under Cabinet TW'],
        model: '72569',
        vendor: 'Sylvania',
        description: 'SMART+ Zigbee adjustable white edge-lit under cabinet light',
        extend: [ledvanceLight({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['Flushmount TW'],
        model: '72567',
        vendor: 'Sylvania',
        description: 'SMART+ Zigbee adjustable white edge-lit flush mount light',
        extend: [ledvanceLight({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['Outdoor Accent RGB', 'Outdoor Accent Light RGB'],
        model: '75541',
        vendor: 'Sylvania',
        description: 'SMART+ Outdoor Accent RGB lighting kit',
        extend: [ledvanceLight({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['iQBR30'],
        model: '484719',
        vendor: 'Sylvania',
        description: 'Dimmable soft white BR30 LED flood light bulb',
        extend: [ledvanceLight({})],
    },
    {
        zigbeeModel: ['A19 G2 RGBW'],
        model: '75564',
        vendor: 'Sylvania',
        description: 'Smart+ adjustable white and full color bulb A19',
        extend: [ledvanceLight({colorTemp: {range: [142, 555]}, color: true})],
    },
    {
        zigbeeModel: ['BR30 W 10 year'],
        model: '74453',
        vendor: 'Sylvania',
        description: 'LIGHTIFY LED soft white BR30',
        extend: [ledvanceLight({})],
    },
    {
        zigbeeModel: ['A19 W non CEC'],
        model: '70552',
        vendor: 'Sylvania',
        description: 'Smart+ LED A19 dimmable soft white',
        extend: [ledvanceLight({})],
    },
];

export default definitions;
