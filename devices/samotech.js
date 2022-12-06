const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');
const e = exposes.presets;


module.exports = [
    {
        zigbeeModel: ['SM308'],
        model: 'SM308',
        vendor: 'Samotech',
        description: 'Zigbee AC in wall switch',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'genIdentify', 'genOnOff']);
        },
    },
    {
        zigbeeModel: ['SM308-S'],
        model: 'SM308-S',
        vendor: 'Samotech',
        description: 'Zigbee in wall smart switch',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'genIdentify', 'genOnOff']);
        },
    },
    {
        zigbeeModel: ['SM308-2CH'],
        model: 'SM308-2CH',
        vendor: 'Samotech',
        description: 'Zigbee in wall smart switch with overall power monitoring, two channel',
        fromZigbee: [fz.on_off_force_multiendpoint, fz.electrical_measurement, fz.metering, fz.ignore_basic_report],
        toZigbee: [tz.on_off],
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.energy(), e.power(), e.current(), e.voltage()],
        endpoint: (device) => {
            return { 'l1': 1, 'l2': 2 };
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1)
            const endpoint2 = device.getEndpoint(2)
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint1);
            await reporting.activePower(endpoint1);
            await reporting.rmsCurrent(endpoint1, { min: 10, change: 10 });
            await reporting.rmsVoltage(endpoint1, { min: 10 });
            await reporting.readMeteringMultiplierDivisor(endpoint1);
            await reporting.currentSummDelivered(endpoint1);
        },
    },
    {
        zigbeeModel: ['SM309-S'],
        model: 'SM309-S',
        vendor: 'Samotech',
        description: 'Zigbee dimmer 400W',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['SM309'],
        model: 'SM309',
        vendor: 'Samotech',
        description: 'Zigbee dimmer 400W',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'Dimmer-Switch-ZB3.0', manufacturerName: 'Samotech'}],
        model: 'SM323',
        vendor: 'Samotech',
        description: 'ZigBee retrofit dimmer 250W',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
];
