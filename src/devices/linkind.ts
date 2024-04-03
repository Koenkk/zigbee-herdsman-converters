import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
const e = exposes.presets;
const ea = exposes.access;
import * as globalStore from '../lib/store';
import {Definition} from '../lib/types';
import {light, onOff} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['ZB-KeypadGeneric-D0002'],
        model: 'ZS130000078',
        vendor: 'Linkind',
        description: 'Security keypad battery',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.command_arm_with_transaction, fz.battery, fz.ias_ace_occupancy_with_timeout,
            fz.ias_smoke_alarm_1, fz.command_panic],
        exposes: [e.battery(), e.battery_voltage(), e.battery_low(), e.occupancy(), e.tamper(),
            e.numeric('action_code', ea.STATE).withDescription('Pin code introduced.'),
            e.numeric('action_transaction', ea.STATE).withDescription('Last action transaction number.'),
            e.text('action_zone', ea.STATE).withDescription('Alarm zone. Default value 23'),
            e.action([
                'panic', 'disarm', 'arm_day_zones', 'arm_all_zones', 'exit_delay', 'entry_delay'])],
        toZigbee: [tz.arm_mode],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const clusters = ['genPowerCfg', 'ssIasZone', 'ssIasAce', 'genBasic', 'genIdentify'];
            await reporting.bind(endpoint, coordinatorEndpoint, clusters);
            await reporting.batteryVoltage(endpoint);
        },
        onEvent: async (type, data, device) => {
            if (type === 'message' && data.type === 'commandGetPanelStatus' && data.cluster === 'ssIasAce' &&
                globalStore.hasValue(device.getEndpoint(1), 'panelStatus')) {
                const payload = {
                    panelstatus: globalStore.getValue(device.getEndpoint(1), 'panelStatus'),
                    secondsremain: 0x00, audiblenotif: 0x00, alarmstatus: 0x00,
                };
                await device.getEndpoint(1).commandResponse(
                    'ssIasAce', 'getPanelStatusRsp', payload, {}, data.meta.zclTransactionSequenceNumber,
                );
            }
        },
    },
    {
        zigbeeModel: ['ZBT-RGBWSwitch-D0801'],
        model: 'ZS230002',
        vendor: 'Linkind',
        description: '5-key smart bulb dimmer switch light remote control',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step, fz.command_move,
            fz.command_stop, fz.command_move_to_color_temp, fz.command_move_to_color,
            fz.command_move_to_level, fz.command_move_color_temperature, fz.battery],
        exposes: [e.battery(), e.battery_low(), e.action(['on', 'off', 'brightness_step_up',
            'brightness_step_down', 'color_temperature_move', 'color_move', 'brightness_move_up', 'brightness_move_down', 'brightness_stop',
            'brightness_move_to_level', 'color_temperature_move_up', 'color_temperature_move_down'])],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['ZBT-CCTLight-D0106', 'ZBT-CCTLight-GLS0108', 'ZBT-CCTLight-GLS0109'],
        model: 'ZL1000100-CCT-US-V1A02',
        vendor: 'Linkind',
        description: 'Zigbee LED 9W A19 bulb, dimmable & tunable',
        extend: [light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['ZBT-CCTLight-C4700107'],
        model: 'ZL1000400-CCT-EU-2-V1A02',
        vendor: 'Linkind',
        description: 'Zigbee LED 5.4W C35 bulb E14, dimmable & tunable',
        extend: [light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['ZBT-CCTLight-M3500107'],
        model: 'ZL00030014',
        vendor: 'Linkind',
        description: 'Zigbee LED 4.8W GU10 bulb, dimmable & tunable',
        extend: [light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['ZBT-CCTLight-D115'],
        model: 'ZL13100314',
        vendor: 'Linkind',
        description: 'Ceiling light 28W, 3000 lm, Ø40CM CCT',
        extend: [light({colorTemp: {range: [153, 370]}})],
    },
    {
        zigbeeModel: ['ZBT-CCTLight-BR300107'],
        model: 'ZL100050004',
        vendor: 'Linkind',
        description: 'Zigbee LED 7.4W BR30 bulb E26, dimmable & tunable',
        extend: [light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['ZBT-DIMLight-GLS0010'],
        model: 'ZL100010008',
        vendor: 'Linkind',
        description: 'Zigbee LED 9W 2700K A19 bulb, dimmable',
        extend: [light()],
    },
    {
        zigbeeModel: ['ZBT-DIMLight-D0120'],
        model: 'ZL1000701-27-EU-V1A02',
        vendor: 'Linkind',
        description: 'Zigbee A60 filament bulb 6.3W',
        extend: [light()],
    },
    {
        zigbeeModel: ['ZBT-DIMLight-A4700003'],
        model: 'ZL1000700-22-EU-V1A02',
        vendor: 'Linkind',
        description: 'Zigbee A60 led filament, dimmable warm light (2200K), E27. 4.2W, 420lm',
        extend: [light()],
    },
    {
        zigbeeModel: ['ZB-MotionSensor-D0003'],
        model: 'ZS1100400-IN-V1A02',
        vendor: 'Linkind',
        description: 'PIR motion sensor, wireless motion detector',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['ZB-DoorSensor-D0003'],
        model: 'ZS110050078',
        vendor: 'Linkind',
        description: 'Door/window Sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['ZBT-DIMSwitch-D0001'],
        model: 'ZS232000178',
        vendor: 'Linkind',
        description: '1-key remote control',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.action(['on', 'off', 'brightness_move_up', 'brightness_move_down', 'brightness_stop']), e.battery(), e.battery_low()],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['ZBT-OnOffPlug-D0011', 'ZBT-OnOffPlug-D0001'],
        model: 'ZS190000118',
        vendor: 'Linkind',
        description: 'Control outlet',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['ZB-KeyfodGeneric-D0001'],
        model: 'ZS130000178',
        vendor: 'Linkind',
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
        zigbeeModel: ['A001082'],
        model: 'LS21001',
        vendor: 'Linkind',
        description: 'Water leak sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [tz.LS21001_alert_behaviour],
        exposes: [e.water_leak(), e.battery_low(), e.battery(),
            e.enum('alert_behaviour', ea.STATE_SET, ['siren_led', 'siren', 'led', 'nothing'])
                .withDescription('Controls behaviour of led/siren on alarm')],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
];

export default definitions;
module.exports = definitions;
