const fz = require('../converters/fromZigbee');
const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;


module.exports = [
    {
        zigbeeModel: ['SZ1000'],
        model: 'ZB250',
        vendor: 'Micro Matic Norge AS',
        description: 'Zigbee dimmer for LED',
        fromZigbee: extend.light_onoff_brightness().fromZigbee.concat([fz.electrical_measurement, fz.metering]),
        toZigbee: extend.light_onoff_brightness().toZigbee,
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'haElectricalMeasurement', 'seMetering']);
            await reporting.brightness(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.rmsVoltage(endpoint, {min: 10, change: 20}); // Voltage - Min change of 2V
            await reporting.rmsCurrent(endpoint, {min: 10, change: 10}); // A - z2m displays only the first decimals, change of 10 / 0,01A
            await reporting.activePower(endpoint, {min: 10, change: 15}); // W - Min change of 1,5W
            await reporting.currentSummDelivered(endpoint, {min: 300}); // Report KWH every 5min
        },
        exposes: [e.light_brightness(), e.power(), e.current(), e.voltage().withAccess(ea.STATE), e.energy()],
    },
];
