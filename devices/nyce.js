const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const reporting = require('../lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['3010'],
        model: 'NCZ-3010',
        vendor: 'Nyce',
        description: 'Door hinge sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.battery()],
    },
    {
        zigbeeModel: ['3011'],
        model: 'NCZ-3011-HA',
        vendor: 'Nyce',
        description: 'Door/window sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['3043'],
        model: 'NCZ-3043-HA',
        vendor: 'Nyce',
        description: 'Ceiling motion sensor',
        fromZigbee: [fz.occupancy, fz.humidity, fz.temperature, fz.ignore_basic_report, fz.ignore_genIdentify, fz.ignore_poll_ctrl,
            fz.battery, fz.ignore_iaszone_report, fz.ias_occupancy_alarm_2],
        toZigbee: [],
        exposes: [e.occupancy(), e.humidity(), e.temperature(), e.battery(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['3041'],
        model: 'NCZ-3041-HA',
        vendor: 'Nyce',
        description: 'Wall motion sensor',
        fromZigbee: [fz.occupancy, fz.humidity, fz.temperature, fz.ignore_basic_report, fz.ignore_genIdentify, fz.ignore_poll_ctrl,
            fz.battery, fz.ignore_iaszone_report, fz.ias_occupancy_alarm_2],
        toZigbee: [],
        meta: {battery: {dontDividePercentage: true}},
        exposes: [e.occupancy(), e.humidity(), e.temperature(), e.battery(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['3045'],
        model: 'NCZ-3045-HA',
        vendor: 'Nyce',
        description: 'Curtain motion sensor',
        fromZigbee: [fz.occupancy, fz.humidity, fz.temperature, fz.ignore_basic_report, fz.ignore_genIdentify, fz.ignore_poll_ctrl,
            fz.battery, fz.ignore_iaszone_report, fz.ias_occupancy_alarm_2],
        toZigbee: [],
        meta: {battery: {dontDividePercentage: true}},
        exposes: [e.occupancy(), e.humidity(), e.temperature(), e.battery(), e.battery_low(), e.tamper()],
    },
];
