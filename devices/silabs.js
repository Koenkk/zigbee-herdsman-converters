const exposes = require('../lib/exposes');

module.exports = [
    {
        zigbeeModel: ['UT-02'],
        model: 'EFR32MG21-USB',
        vendor: 'Silicon Labs',
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
        model: 'EFR32MG21-BR',
        vendor: 'Silicon Labs',
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