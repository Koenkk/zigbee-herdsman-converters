import {Definition, Fz, Tz} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as reporting from '../lib/reporting';
import tz from '../converters/toZigbee';
import {electricityMeter, light, onOff, quirkCheckinInterval} from '../lib/modernExtend';

const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    LDSENK08: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                contact: !((zoneStatus & 1) > 0),
                vibration: (zoneStatus & 1<<1) > 0,
                tamper: (zoneStatus & 1<<2) > 0,
                battery_low: (zoneStatus & 1<<3) > 0,
            };
        },
    } satisfies Fz.Converter,
};

const tzLocal = {
    LDSENK08_sensitivity: {
        key: ['sensitivity'],
        convertSet: async (entity, key, value, meta) => {
            await entity.write('ssIasZone', {0x0013: {value, type: 0x20}});
            return {state: {sensitivity: value}};
        },
    } satisfies Tz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['LDSENK08'],
        model: 'LDSENK08',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN wireless smart door window sensor with vibration',
        fromZigbee: [fzLocal.LDSENK08, fz.battery],
        toZigbee: [tzLocal.LDSENK08_sensitivity],
        exposes: [e.battery_low(), e.contact(), e.vibration(), e.tamper(), e.battery(),
            e.numeric('sensitivity', ea.STATE_SET).withValueMin(0).withValueMax(4).withDescription('Sensitivity of the motion sensor')],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['LDSENK09'],
        model: 'LDSENK09',
        vendor: 'ADEO',
        description: 'Security system key fob',
        fromZigbee: [fz.command_arm, fz.command_panic],
        toZigbee: [],
        exposes: [e.action(['panic', 'disarm', 'arm_partial_zones', 'arm_all_zones'])],
        onEvent: async (type, data, device) => {
            // Since arm command has a response zigbee-herdsman doesn't send a default response.
            // This causes the remote to repeat the arm command, so send a default response here.
            if (data.type === 'commandArm' && data.cluster === 'ssIasAce') {
                await data.endpoint.defaultResponse(0, 0, 1281, data.meta.zclTransactionSequenceNumber);
            }
        },
    },
    {
        zigbeeModel: ['ZBEK-1'],
        model: 'IA-CDZOTAAA007MA-MAN',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 7.2 to 60W LED RGBW',
        extend: [light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ['ZBEK-2'],
        model: 'IG-CDZOTAAG014RA-MAN',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 14W to 100W LED RGBW v2',
        extend: [light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ['ZBEK-3'],
        model: 'IP-CDZOTAAP005JA-MAN',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E14 LED RGBW',
        extend: [light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ['ZBEK-4'],
        model: 'IM-CDZDGAAA0005KA_MAN',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN RGBTW GU10 Bulb',
        extend: [light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ['ZBEK-5'],
        model: 'IST-CDZFB2AS007NA-MZN-01',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 LED white',
        extend: [light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ['SIN-4-1-21_EQU'],
        model: 'SIN-4-1-21_EQU',
        vendor: 'ADEO',
        description: 'Multifunction relay switch with metering',
        extend: [onOff(), electricityMeter({cluster: 'metering'})],
    },
    {
        zigbeeModel: ['ZBEK-7'],
        model: 'IST-CDZFB2AS007NA-MZN-02',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 LED Edison white filament 806 lumen',
        extend: [light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ['ZBEK-8'],
        model: 'IG-CDZFB2G009RA-MZN-02',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 LED white filament 1055 lumen',
        extend: [light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ['ZBEK-9'],
        model: 'IA-CDZFB2AA007NA-MZN-02',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 LED white',
        extend: [light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ['ZBEK-6'],
        model: 'IG-CDZB2AG009RA-MZN-01',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 Led white bulb',
        extend: [light({colorTemp: {range: [153, 454]}})],
    },

    {
        zigbeeModel: ['ZBEK-10'],
        model: 'IC-CDZFB2AC004HA-MZN',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E14 LED white',
        extend: [light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ['ZBEK-11'],
        model: 'IM-CDZDGAAG005KA-MZN',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN GU-10 LED white',
        extend: [light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ['ZBEK-12'],
        model: 'IA-CDZFB2AA007NA-MZN-01',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 LED white',
        extend: [light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ['ZBEK-13'],
        model: 'IG-CDZFB2AG010RA-MNZ',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 LED white',
        extend: [light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ['ZBEK-14'],
        model: 'IC-CDZFB2AC005HA-MZN',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E14 LED white',
        extend: [light({colorTemp: {range: [153, 454]}})],
    },
    {
        zigbeeModel: ['ZBEK-22'],
        model: 'BD05C-FL-21-G-ENK',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN RGBCCT lamp',
        extend: [light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ['ZBEK-27'],
        model: '84845506',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN Gdansk',
        extend: [light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ['ZBEK-29'],
        model: '84845509',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN Gdansk LED panel',
        extend: [light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ['ZBEK-28'],
        model: 'PEZ1-042-1020-C1D1',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN Gdansk',
        extend: [light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ['ZBEK-34'],
        model: '84870058',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN Extraflat 225 ',
        extend: [light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ['LDSENK01F'],
        model: 'LDSENK01F',
        vendor: 'ADEO',
        description: '10A EU smart plug',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['LDSENK01S'],
        model: 'LDSENK01S',
        vendor: 'ADEO',
        description: '10A EU smart plug',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['LXEK-5', 'ZBEK-26'],
        model: 'HR-C99C-Z-C045',
        vendor: 'ADEO',
        description: 'RGB CTT LEXMAN ENKI remote control',
        fromZigbee: [fz.battery, fz.command_on, fz.command_off, fz.command_step, fz.command_stop, fz.command_step_color_temperature,
            fz.command_step_hue, fz.command_step_saturation, fz.color_stop_raw, fz.scenes_recall_scene_65024, fz.ignore_genOta],
        toZigbee: [],
        exposes: [e.battery(), e.action(['on', 'off', 'scene_1', 'scene_2', 'scene_3', 'scene_4', 'color_saturation_step_up',
            'color_saturation_step_down', 'color_stop', 'color_hue_step_up', 'color_hue_step_down',
            'color_temperature_step_up', 'color_temperature_step_down', 'brightness_step_up', 'brightness_step_down', 'brightness_stop'])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genOnOff', 'genPowerCfg', 'lightingColorCtrl', 'genLevelCtrl'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['LXEK-1'],
        model: '9CZA-A806ST-Q1A',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 LED RGBW',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['LXEK-3'],
        model: '9CZA-P470T-A1A',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E14 LED RGBW',
        extend: [light({colorTemp: {range: [153, 370]}, color: true})],
    },
    {
        zigbeeModel: ['LXEK-4'],
        model: '9CZA-M350ST-Q1A',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN GU-10 LED RGBW',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['LXEK-2'],
        model: '9CZA-G1521-Q1A',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 14W to 100W LED RGBW',
        extend: [light({colorTemp: {range: undefined}, color: true})],
    },
    {
        zigbeeModel: ['LDSENK07'],
        model: 'LDSENK07',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN wireless smart outdoor siren',
        fromZigbee: [fz.battery, fz.ias_siren],
        toZigbee: [tz.warning],
        exposes: [e.warning(), e.battery(), e.battery_low(), e.tamper()],
        extend: [
            quirkCheckinInterval(0),
        ],
        configure: async (device, coordinatorEndpoint) => {
            await device.getEndpoint(1).unbind('genPollCtrl', coordinatorEndpoint);
        },
    },
    {
        zigbeeModel: ['LXEK-7'],
        model: '9CZA-A806ST-Q1Z',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN E27 LED white',
        extend: [light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['LDSENK02F'],
        model: 'LDSENK02F',
        description: '10A/16A EU smart plug',
        vendor: 'ADEO',
        extend: [onOff(), electricityMeter()],
    },
    {
        zigbeeModel: ['LDSENK10'],
        model: 'LDSENK10',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['LDSENK02S'],
        model: 'LDSENK02S',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN 16A EU smart plug',
        extend: [onOff(), electricityMeter()],
    },
    {
        zigbeeModel: ['SIN-4-1-20_LEX'],
        model: 'SIN-4-1-20_LEX',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN 3680W single output relay',
        extend: [onOff()],
        endpoint: (device) => {
            return {default: 1};
        },
    },
    {
        zigbeeModel: ['SIN-4-RS-20_LEX'],
        model: 'SIN-4-RS-20_LEX',
        vendor: 'ADEO',
        description: 'Roller shutter controller (Leroy Merlin version)',
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
            await reporting.currentPositionTiltPercentage(endpoint);
        },
        exposes: [e.cover_position()],
    },
    {
        zigbeeModel: ['SIN-4-1-22_LEX'],
        model: 'SIN-4-1-22_LEX',
        vendor: 'ADEO',
        description: 'ENKI LEXMAN Access Control',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['SIN-4-FP-21_EQU'],
        model: 'SIN-4-FP-21_EQU',
        vendor: 'ADEO',
        description: 'Equation pilot wire heating module',
        fromZigbee: [fz.on_off, fz.metering, fz.nodon_pilot_wire_mode],
        toZigbee: [tz.on_off, tz.nodon_pilot_wire_mode],
        exposes: [
            e.switch(),
            e.power(),
            e.energy(),
            e.pilot_wire_mode(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const ep = device.getEndpoint(1);
            await reporting.bind(ep, coordinatorEndpoint, ['genBasic', 'genIdentify', 'genOnOff', 'seMetering', 'manuSpecificNodOnPilotWire']);
            await reporting.onOff(ep, {min: 1, max: 3600, change: 0});
            await reporting.readMeteringMultiplierDivisor(ep);
            await reporting.instantaneousDemand(ep);
            await reporting.currentSummDelivered(ep);
            const p = reporting.payload('mode', 0, 120, 0, {min: 1, max: 3600, change: 0});
            await ep.configureReporting('manuSpecificNodOnPilotWire', p);
        },
    },
    {
        zigbeeModel: ['ZB-Remote-D0001'],
        model: '83633204',
        vendor: 'ADEO',
        description: '1-key remote control',
        fromZigbee: [fz.adeo_button_65024, fz.battery],
        exposes: [e.action(['single', 'double', 'hold']), e.battery()],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
];

export default definitions;
module.exports = definitions;
