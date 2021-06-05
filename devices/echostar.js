const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const reporting = require('../lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['   Bell'],
        model: 'SAGE206612',
        vendor: 'EchoStar',
        description: 'SAGE by Hughes doorbell sensor',
        fromZigbee: [fz.SAGE206612_state, fz.battery],
        exposes: [e.battery(), e.action(['bell1', 'bell2'])],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
    },
    {
        zigbeeModel: [' Switch'],
        model: 'SAGE206611',
        vendor: 'Echostar',
        description: 'SAGE by Hughes single gang light switch',
        fromZigbee: [fz.command_on, fz.command_off, fz.battery],
        exposes: [e.battery(), e.action(['on', 'off'])],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(18);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
];
