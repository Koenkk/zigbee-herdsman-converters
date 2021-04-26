const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['OJB-CR701-YZ'],
        model: 'CR701-YZ',
        vendor: 'Oujiabao',
        description: 'Gas and carbon monoxide alarm',
        fromZigbee: [fz.ias_carbon_monoxide_alarm_1_gas_alarm_2],
        toZigbee: [],
        exposes: [e.gas(), e.carbon_monoxide(), e.tamper(), e.battery_low()],
    },
];
