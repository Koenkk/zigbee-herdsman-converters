import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import {light, onOff} from '../lib/modernExtend';

const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['ICZB-IW11D'],
        model: 'ICZB-IW11D',
        vendor: 'iCasa',
        description: 'ZigBee AC dimmer',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['ICZB-DC11'],
        model: 'ICZB-DC11',
        vendor: 'iCasa',
        description: 'ZigBee 12-36V DC LED dimmer',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['ICZB-IW11SW'],
        model: 'ICZB-IW11SW',
        vendor: 'iCasa',
        description: 'Zigbee 3.0 AC switch',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['ICZB-KPD12'],
        model: 'ICZB-KPD12',
        vendor: 'iCasa',
        description: 'Zigbee 3.0 Keypad Pulse 2',
        meta: {battery: {dontDividePercentage: true}},
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.battery(), e.action(['on', 'off', 'brightness_move_up', 'brightenss_move_down', 'brightness_stop'])],
        toZigbee: [],
        whiteLabel: [{vendor: 'Sunricher', model: 'SR-ZG9001K2-DIM'}],
    },
    {
        zigbeeModel: ['ICZB-KPD14S'],
        model: 'ICZB-KPD14S',
        vendor: 'iCasa',
        description: 'Zigbee 3.0 Keypad Pulse 4S',
        meta: {battery: {dontDividePercentage: true}},
        fromZigbee: [fz.command_recall, legacy.fz.scenes_recall_click, fz.command_on, legacy.fz.genOnOff_cmdOn, fz.command_off,
            legacy.fz.genOnOff_cmdOff, fz.battery, legacy.fz.cmd_move_with_onoff, legacy.fz.cmd_stop_with_onoff, fz.command_store],
        exposes: [e.battery(), e.action([
            'on', 'off', 'brightness_stop', 'brightness_move_up', 'brightness_move_down',
            'recall_1', 'recall_2', 'recall_3', 'recall_4',
            'store_1', 'store_2', 'store_3', 'store_4'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['ICZB-KPD18S'],
        model: 'ICZB-KPD18S',
        vendor: 'iCasa',
        description: 'Zigbee 3.0 Keypad Pulse 8S',
        fromZigbee: [fz.command_recall, legacy.fz.scenes_recall_click, fz.command_on, legacy.fz.genOnOff_cmdOn, fz.command_off,
            legacy.fz.genOnOff_cmdOff, fz.battery, legacy.fz.cmd_move_with_onoff, legacy.fz.cmd_stop_with_onoff, fz.command_store],
        exposes: [e.battery(), e.action([
            'on', 'off', 'brightness_stop', 'brightness_move_up', 'brightness_move_down',
            'recall_1', 'recall_2', 'recall_3', 'recall_4', 'recall_5', 'recall_6',
            'store_1', 'store_2', 'store_3', 'store_4', 'store_5', 'store_6'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['ICZB-RM11S'],
        model: 'ICZB-RM11S',
        vendor: 'iCasa',
        description: 'Zigbee 3.0 remote control',
        meta: {battery: {dontDividePercentage: true}},
        fromZigbee: [fz.command_recall, fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.battery(), e.action(['recall_*', 'on', 'off', 'brightness_stop', 'brightness_move_up', 'brightness_move_down'])],
        toZigbee: [],
    },
    {
        zigbeeModel: ['ICZB-FC'],
        model: 'ICZB-B1FC60/B3FC64/B2FC95/B2FC125',
        vendor: 'iCasa',
        description: 'Zigbee 3.0 Filament Lamp 60/64/95/125 mm, 806 lumen, dimmable, clear',
        extend: [light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['ICZB-R11D'],
        model: 'ICZB-R11D',
        vendor: 'iCasa',
        description: 'Zigbee AC dimmer',
        extend: [light({configureReporting: true})],
    },
    {
        zigbeeModel: ['ICZB-R12D'],
        model: 'ICZB-R12D',
        vendor: 'iCasa',
        description: 'Zigbee AC dimmer',
        extend: [light({configureReporting: true})],
    },
];

export default definitions;
module.exports = definitions;
