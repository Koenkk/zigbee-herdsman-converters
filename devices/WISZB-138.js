const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const e = exposes.presets;

const definition = {
    zigbeeModel: ['WISZB-138'],
    model: 'Frient alarm entry sensor 2',
    vendor: 'Frient A/S',
    description: 'Door/window entry detection with temperature sensor', 
    fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery], 
    toZigbee: [], 
    exposes: [e.contact(), e.temperature(), e.battery()], 
    configure: async (device, coordinatorEndpoint) => {   
        var batteryEndpoint = device.getEndpoint(35);     
        await reporting.batteryPercentageRemaining(batteryEndpoint);
        
        const overrides = {
            change: "10"
        }
        var temperatureEndpoint = device.getEndpoint(38);
        await reporting.temperature(temperatureEndpoint, overrides);
    },
};

module.exports = definition;