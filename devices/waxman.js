const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['leakSMART Water Sensor V2'],
        model: '8840100H',
        vendor: 'Waxman',
        description: 'leakSMART water sensor v2',
        fromZigbee: [fz._8840100H_water_leak_alarm, fz.temperature, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.water_leak()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'haApplianceEventsAlerts', 'msTemperatureMeasurement']);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.temperature(endpoint);
        },
    },
    {
        zigbeeModel: ['House Water Valve - MDL-TBD'],
        // Should work with all manufacturer model numbers for the 2.0 series:
        // 8850000 3/4"
        // 8850100 1"
        // 8850200 1-1/4"
        // 8850300 1-1/2"
        // 8850310 2"
        model: '8850100',
        vendor: 'Waxman',
        description: 'leakSMART automatic water shut-off valve 2.0',
        fromZigbee: [fz.battery, fz.on_off],
        toZigbee: [tz.on_off],
        exposes: [e.battery(), e.switch()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'haApplianceEventsAlerts', 'genOnOff']);
            await reporting.onOff(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
    },
];
