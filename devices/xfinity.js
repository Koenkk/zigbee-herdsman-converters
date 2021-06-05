const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const globalStore = require('../lib/store');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['URC4450BC0-X-R'],
        model: 'URC4450BC0-X-R',
        vendor: 'Xfinity',
        description: 'Alarm security keypad',
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        fromZigbee: [fz.command_arm, fz.temperature, fz.battery, fz.ias_occupancy_alarm_1, fz.identify, fz.ias_contact_alarm_1,
            fz.ias_ace_occupancy_with_timeout],
        exposes: [e.battery(), e.battery_voltage(), e.occupancy(), e.battery_low(), e.tamper(), e.presence(), e.contact(),
            exposes.numeric('action_code', ea.STATE), exposes.text('action_zone', ea.STATE), e.temperature(), e.action([
                'disarm', 'arm_day_zones', 'identify', 'arm_night_zones', 'arm_all_zones', 'exit_delay', 'emergency',
            ])],
        toZigbee: [tz.arm_mode],
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
