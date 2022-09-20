const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const constants = require('../lib/constants');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;
const ota = require('../lib/ota');

const fzLocal = {
    // SNZB-02 reports stranges values sometimes
    // https://github.com/Koenkk/zigbee2mqtt/issues/13640
    SNZB02_temperature: {
        ...fz.temperature,
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.measuredValue > -10000 && msg.data.measuredValue < 10000) {
                return fz.temperature.convert(model, msg, publish, options, meta);
            }
        },
    },
    router_config: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty('currentLevel')) {
                result.light_indicator_level = msg.data['currentLevel'];
            }
        },
    },
};

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
        zigbeeModel: ['ZBMINI-L'],
        model: 'ZBMINI-L',
        vendor: 'SONOFF',
        description: 'Zigbee smart switch (no neutral)',
        ota: ota.zigbeeOTA,
        extend: extend.switch(),
        toZigbee: extend.switch().toZigbee.concat([tz.power_on_behavior]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.power_on_behavior]),
        exposes: extend.switch().exposes.concat([e.power_on_behavior()]),
        configure: async (device, coordinatorEndpoint, logger) => {
            // Unbind genPollCtrl to prevent device from sending checkin message.
            // Zigbee-herdsmans responds to the checkin message which causes the device
            // to poll slower.
            // https://github.com/Koenkk/zigbee2mqtt/issues/11676
            await device.getEndpoint(1).unbind('genPollCtrl', coordinatorEndpoint);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
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
        exposes: [e.battery(), e.action(['single', 'double', 'long']), e.battery_voltage()],
        fromZigbee: [fz.ewelink_action, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
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
        fromZigbee: [fzLocal.SNZB02_temperature, fz.humidity, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            try {
                const endpoint = device.getEndpoint(1);
                const bindClusters = ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg'];
                await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
                await reporting.temperature(endpoint, {min: 5, max: constants.repInterval.MINUTES_30, change: 20});
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
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ['genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
            await reporting.batteryVoltage(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['S26R2ZB'],
        model: 'S26R2ZB',
        vendor: 'SONOFF',
        description: 'Zigbee smart plug',
        extend: extend.switch(),
    },
    {
        zigbeeModel: ['S40LITE'],
        model: 'S40ZBTPB',
        vendor: 'SONOFF',
        description: '15A Zigbee smart plug',
        extend: extend.switch(),
        fromZigbee: [fz.on_off_skip_duplicate_transaction],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['DONGLE-E_R'],
        model: 'ZBDongle-E',
        vendor: 'SONOFF',
        description: 'Sonoff Zigbee 3.0 USB Dongle Plus (EFR32MG21) with router firmware',
        fromZigbee: [fz.linkquality_from_basic, fzLocal.router_config],
        toZigbee: [],
        exposes: [exposes.numeric('light_indicator_level').withDescription('Brightness of the indicator light').withAccess(ea.STATE)],
        configure: async (device, coordinatorEndpoint, logger) => {
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
];
