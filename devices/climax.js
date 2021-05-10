const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['PSS_00.00.00.15TC'],
        model: 'PSS-23ZBS',
        vendor: 'Climax',
        description: 'Power plug',
        extend: extend.switch(),
    },
    {
        zigbeeModel: ['SD8SC_00.00.03.12TC'],
        model: 'SD-8SCZBS',
        vendor: 'Climax',
        description: 'Smoke detector',
        fromZigbee: [fz.ias_smoke_alarm_1, fz.battery],
        toZigbee: [tz.warning],
        exposes: [e.smoke(), e.battery(), e.battery_low(), e.tamper(), e.warning()],

    },
    {
        zigbeeModel: ['WS15_00.00.00.10TC'],
        model: 'WLS-15ZBS',
        vendor: 'Climax',
        description: 'Water leakage sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['SCM-3_00.00.03.15'],
        model: 'SCM-5ZBS',
        vendor: 'Climax',
        description: 'Roller shutter',
        fromZigbee: [fz.cover_position_via_brightness, fz.cover_state_via_onoff],
        toZigbee: [tz.cover_via_brightness],
        exposes: [e.cover_position().setAccess('state', ea.ALL)],
    },
    {
        zigbeeModel: ['PSM_00.00.00.35TC', 'PSMP5_00.00.02.02TC', 'PSMP5_00.00.05.01TC', 'PSMP5_00.00.05.10TC', 'PSMP5_00.00.03.15TC',
            'PSMP5_00.00.03.16TC', 'PSMP5_00.00.03.19TC'],
        model: 'PSM-29ZBSR',
        vendor: 'Climax',
        description: 'Power plug',
        fromZigbee: [fz.on_off, fz.metering, fz.ignore_basic_report],
        toZigbee: [tz.on_off, tz.ignore_transition],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint, {min: 10, change: 2});
        },
        whiteLabel: [{vendor: 'Blaupunkt', model: 'PSM-S1'}],
        exposes: [e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ['RS_00.00.02.06TC'],
        model: 'RS-23ZBS',
        vendor: 'Climax',
        description: 'Temperature & humidity sensor',
        fromZigbee: [fz.temperature, fz.humidity],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msTemperatureMeasurement', 'msRelativeHumidity']);
            await reporting.temperature(endpoint);
            // configureReporting.humidity(endpoint); not needed and fails
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1312
        },
        exposes: [e.temperature(), e.humidity()],
    },
    {
        zigbeeModel: ['SRACBP5_00.00.03.06TC', 'SRAC_00.00.00.16TC'],
        model: 'SRAC-23B-ZBSR',
        vendor: 'Climax',
        description: 'Smart siren',
        fromZigbee: [fz.battery],
        toZigbee: [tz.warning],
        exposes: [e.warning(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['WS15_00.00.00.14TC'],
        model: 'WS-15ZBS',
        vendor: 'Climax',
        description: 'Water leak sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['CO_00.00.00.15TC', 'CO_00.00.00.22TC'],
        model: 'CO-8ZBS',
        vendor: 'Climax',
        description: 'Smart carbon monoxide sensor',
        fromZigbee: [fz.ias_carbon_monoxide_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.carbon_monoxide(), e.battery_low(), e.tamper(), e.battery()],
    },
];
