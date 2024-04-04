import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import {deviceEndpoints, onOff} from '../lib/modernExtend';

const e = exposes.presets;

const definitions: Definition[] = [
    {
        zigbeeModel: ['FZB56+ZSW2FYM1.1'],
        model: 'TZSW22FW-L4',
        vendor: 'Feibit',
        description: 'Smart light switch - 2 gang',
        extend: [
            deviceEndpoints({endpoints: {'top': 16, 'bottom': 17}}),
            onOff({endpointNames: ['top', 'bottom']}),
        ],
    },
    {
        zigbeeModel: ['FB56+ZSW1GKJ2.3'],
        model: 'SKY01-TS1-101',
        vendor: 'Feibit',
        description: 'Smart light switch - 1 gang',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['FNB56-SOS03FB1.5'],
        model: 'SEB01ZB',
        vendor: 'Feibit',
        description: 'SOS button',
        fromZigbee: [fz.ias_sos_alarm_2, fz.battery],
        toZigbee: [],
        exposes: [e.sos(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['FNB56-BOT06FB2.3', 'FNB56-BOT06FB2.8', 'FB56-BOT02HM1.2', 'FNB56-BOT06FB2.8'],
        model: 'SBM01ZB',
        vendor: 'Feibit',
        description: 'Human body movement sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryAlarmState(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['FNB56-THM14FB2.4', 'FNB54-THM17ML1.1', 'FB56-THM12HM1.2', 'FNB56-THM14FB2.5'],
        model: 'STH01ZB',
        vendor: 'Feibit',
        description: 'Smart temperature & humidity Sensor',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        exposes: [e.temperature(), e.humidity(), e.battery()],
    },
    {
        zigbeeModel: ['FNB56-SMF06FB1.6', 'FNB56-SMF06FB2.0'],
        model: 'SSA01ZB',
        vendor: 'Feibit',
        description: 'Smoke detector',
        fromZigbee: [fz.ias_smoke_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryAlarmState(endpoint);
        },
        exposes: [e.smoke(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['FNB56-COS06FB1.7', 'FNB56-COS06FB2.1'],
        model: 'SCA01ZB',
        vendor: 'Feibit',
        description: 'Smart carbon monoxide sensor',
        fromZigbee: [fz.ias_carbon_monoxide_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryAlarmState(endpoint);
        },
        exposes: [e.carbon_monoxide(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['FNB56-GAS05FB1.4', 'FNB56-GAS05FB1.8'],
        model: 'SGA01ZB',
        vendor: 'Feibit',
        description: 'Combustible gas sensor',
        fromZigbee: [fz.ias_gas_alarm_2],
        toZigbee: [],
        exposes: [e.gas()],
    },
    {
        zigbeeModel: ['FNB56-WTS05FB2.0', 'FNB56-WTS05FB2.4'],
        model: 'SWA01ZB',
        vendor: 'Feibit',
        description: 'Water leakage sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['FNB56-DOS07FB2.4', 'FB56-DOS02HM1.2'],
        model: 'SDM01ZB',
        vendor: 'Feibit',
        description: 'Door or window contact switch',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['FB56+SKT14AL2.1', 'FTB56+SKT1BCW1.0'],
        model: 'SFS01ZB',
        vendor: 'Feibit',
        description: 'Power plug',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['FB56+ZSW1HKJ2.2', 'FB56+ZSW1HKJ1.1'],
        model: 'SLS301ZB_2',
        vendor: 'Feibit',
        description: 'Smart light switch - 2 gang',
        extend: [
            deviceEndpoints({endpoints: {'left': 16, 'right': 17}}),
            onOff({endpointNames: ['left', 'right']}),
        ],
    },
    {
        zigbeeModel: ['FB56+ZSW1IKJ2.2', 'FB56+ZSW1IKJ1.1'],
        model: 'SLS301ZB_3',
        vendor: 'Feibit',
        description: 'Smart light switch - 3 gang',
        extend: [
            deviceEndpoints({endpoints: {'left': 16, 'center': 17, 'right': 18}}),
            onOff({endpointNames: ['left', 'center', 'right']}),
        ],
    },
    {
        zigbeeModel: ['FB56+ZSN08KJ2.2'],
        model: 'SSS401ZB',
        vendor: 'Feibit',
        description: 'Smart 4 key scene wall switch',
        toZigbee: [tz.on_off],
        fromZigbee: [fz.command_recall],
        exposes: [e.action(['recall_*']), e.switch()],
    },
];

export default definitions;
module.exports = definitions;
