const fz = require('../converters/fromZigbee');
const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const e = exposes.presets;

const fzLocal = {
    DCH_B112: {
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
    },
};


module.exports = [
    {
        zigbeeModel: ['DCH-B112'],
        model: 'DCH-B112',
        vendor: 'D-Link',
        description: 'D-Link wireless smart door window sensor with vibration',
        fromZigbee: [fzLocal.DCH_B112, fz.battery],
        toZigbee: [],
        exposes: [e.battery_low(), e.contact(), e.vibration(), e.tamper(), e.battery()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
];
