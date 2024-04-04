import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
const e = exposes.presets;
const ea = exposes.access;
import * as globalStore from '../lib/store';

const definitions: Definition[] = [
    {
        zigbeeModel: ['URC4470BC0-X-R'],
        model: 'XHS1-UE',
        vendor: 'Universal Electronics Inc',
        description: 'Wireless digital pet resistant PIR detector',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['URC4460BC0-X-R'],
        model: 'XHS2-UE',
        vendor: 'Universal Electronics Inc',
        description: 'Magnetic door & window contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'genPowerCfg']);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ['URC4450BC0-X-R'],
        model: 'XHK1-UE',
        vendor: 'Universal Electronics Inc',
        description: 'Xfinity security keypad',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.command_arm_with_transaction, fz.temperature, fz.battery, fz.ias_occupancy_alarm_1, fz.identify,
            fz.ias_contact_alarm_1, fz.ias_ace_occupancy_with_timeout],
        toZigbee: [tz.arm_mode],
        exposes: [e.battery(), e.battery_voltage(), e.occupancy(), e.battery_low(), e.tamper(), e.presence(),
            e.contact(), e.temperature(),
            e.numeric('action_code', ea.STATE).withDescription('Pin code introduced.'),
            e.numeric('action_transaction', ea.STATE).withDescription('Last action transaction number.'),
            e.text('action_zone', ea.STATE).withDescription('Alarm zone. Default value 0'),
            e.action([
                'disarm', 'arm_day_zones', 'identify', 'arm_night_zones', 'arm_all_zones', 'exit_delay', 'emergency',
            ])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const clusters = ['msTemperatureMeasurement', 'genPowerCfg', 'ssIasZone', 'ssIasAce', 'genBasic', 'genIdentify'];
            await reporting.bind(endpoint, coordinatorEndpoint, clusters);
            await reporting.temperature(endpoint);
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
        zigbeeModel: ['H34450BA00-00007'],
        model: 'UEHK2AZ0',
        vendor: 'Universal Electronics Inc',
        description: 'Xfinity security keypad',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [
            fz.command_arm_with_transaction, fz.temperature, fz.battery, fz.ias_occupancy_alarm_1,
            fz.identify, fz.ias_contact_alarm_1, fz.ias_ace_occupancy_with_timeout,
        ],
        toZigbee: [tz.arm_mode],
        exposes: [
            e.battery(), e.battery_voltage(), e.occupancy(), e.battery_low(),
            e.tamper(), e.presence(), e.contact(), e.temperature(),
            e.numeric('action_code', ea.STATE).withDescription('Pin code introduced.'),
            e.numeric('action_transaction', ea.STATE).withDescription('Last action transaction number.'),
            e.text('action_zone', ea.STATE).withDescription('Alarm zone. Default value 0'),
            e.action([
                'disarm', 'arm_day_zones', 'identify', 'arm_night_zones', 'arm_all_zones', 'exit_delay', 'emergency',
            ])],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const clusters = ['msTemperatureMeasurement', 'genPowerCfg', 'ssIasZone', 'ssIasAce', 'genBasic', 'genIdentify'];
            await reporting.bind(endpoint, coordinatorEndpoint, clusters);
            await reporting.temperature(endpoint);
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
];

export default definitions;
module.exports = definitions;
