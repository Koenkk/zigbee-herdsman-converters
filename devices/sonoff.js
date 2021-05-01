const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const constants = require('../lib/constants');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['BASICZBR3'],
        model: 'BASICZBR3',
        vendor: 'SONOFF',
        description: 'Zigbee smart switch',
        extend: extend.switch(),
        fromZigbee: [fz.on_off_skip_duplicate_transaction],
    },
    {
        zigbeeModel: ['01MINIZB'],
        model: 'ZBMINI',
        vendor: 'SONOFF',
        description: 'Zigbee two way smart switch',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            // Has Unknown power source: https://github.com/Koenkk/zigbee2mqtt/issues/5362, force it here.
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['S31 Lite zb'],
        model: 'S31ZB',
        vendor: 'SONOFF',
        description: 'Zigbee smart plug (US version)',
        extend: extend.switch(),
        fromZigbee: [fz.on_off_skip_duplicate_transaction],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [
            // ModelID is from the temperature/humidity sensor (SNZB-02) but this is SNZB-04, wrong modelID in firmware?
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1449
            {type: 'EndDevice', manufacturerName: 'eWeLink', modelID: 'TH01', endpoints: [
                {ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 3, 1280, 1], outputClusters: [3]},
            ]},
        ],
        zigbeeModel: ['DS01'],
        model: 'SNZB-04',
        vendor: 'SONOFF',
        whiteLabel: [{vendor: 'eWeLink', model: 'RHK06'}],
        description: 'Contact sensor',
        exposes: [e.contact(), e.battery_low(), e.battery(), e.battery_voltage()],
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['WB01', 'WB-01'],
        model: 'SNZB-01',
        vendor: 'SONOFF',
        whiteLabel: [{vendor: 'eWeLink', model: 'RHK07'}],
        description: 'Wireless button',
        exposes: [e.battery(), e.action(['single', 'double', 'long'])],
        fromZigbee: [fz.ewelink_action, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        fingerprint: [
            // ModelID is from the button (SNZB-01) but this is SNZB-02, wrong modelID in firmware?
            // https://github.com/Koenkk/zigbee2mqtt/issues/4338
            {type: 'EndDevice', manufacturerName: 'eWeLink', modelID: 'WB01', endpoints: [
                {ID: 1, profileID: 260, deviceID: 770, inputClusters: [0, 3, 1026, 1029, 1], outputClusters: [3]},
            ]},
            {type: 'EndDevice', manufacturerName: 'eWeLink', modelID: '66666', endpoints: [
                {ID: 1, profileID: 260, deviceID: 770, inputClusters: [0, 3, 1026, 1029, 1], outputClusters: [3]},
            ]},
            {type: 'EndDevice', manufacturerName: 'eWeLink', modelID: 'DS01', endpoints: [
                {ID: 1, profileID: 260, deviceID: 770, inputClusters: [0, 3, 1026, 1029, 1], outputClusters: [3]},
            ]},
        ],
        zigbeeModel: ['TH01'],
        model: 'SNZB-02',
        vendor: 'SONOFF',
        whiteLabel: [{vendor: 'eWeLink', model: 'RHK08'}],
        description: 'Temperature and humidity sensor',
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
        fromZigbee: [fz.temperature, fz.humidity, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            try {
                const endpoint = device.getEndpoint(1);
                const bindClusters = ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg'];
                await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
                await reporting.temperature(endpoint, {min: 5, max: constants.repInterval.MINUTES_30, change: 50});
                await reporting.humidity(endpoint);
                await reporting.batteryVoltage(endpoint);
                await reporting.batteryPercentageRemaining(endpoint);
            } catch (e) {/* Not required for all: https://github.com/Koenkk/zigbee2mqtt/issues/5562 */
                logger.error(`Configure failed: ${e}`);
            }
        },
    },
    {
        fingerprint: [
            {type: 'EndDevice', manufacturerName: 'eWeLink', modelID: '66666', endpoints: [
                {ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 3, 1280, 1], outputClusters: [3]},
            ]},
        ],
        zigbeeModel: ['MS01', 'MSO1'],
        model: 'SNZB-03',
        vendor: 'SONOFF',
        whiteLabel: [{vendor: 'eWeLink', model: 'RHK09'}],
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ['genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
];
