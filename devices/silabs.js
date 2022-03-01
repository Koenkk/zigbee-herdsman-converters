const exposes = require('zigbee-herdsman-converters/lib/exposes');
const fz = {...require('zigbee-herdsman-converters/converters/fromZigbee'), legacy: require('zigbee-herdsman-converters/lib/legacy').fromZigbee};
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['UT-02'],
        model: 'EFR32MG21',
        vendor: 'Custom devices (DiY)',
        description: 'EFR32MG21 Silabs USB Router',
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            device.powerSource = 'Mains (single phase)';
            device.save();
        },		
    },
    {
        zigbeeModel: ['UT-01'],
        model: 'EFR32MG21',
        vendor: 'Custom devices (DiY)',
        description: 'EFR32MG21 Zigbee Bridge Router',
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            device.powerSource = 'Mains (single phase)';
            device.save();
        },		
    },
];
