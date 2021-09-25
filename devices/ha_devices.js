const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const e = exposes.presets;
const ea = exposes.access;

    
module.exports = 
[
    {
//all Level Controlable Output devices Id 0x0003
    zigbeeModel: ['ha_0x0003'], // The model ID.
    model: 'TriacDimmer', // Vendor model name
    vendor: 'Alink',
    description: 'Dimmable Light Controller', 
    extend: extend.light_onoff_brightness({noConfigure: true}),
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        const overides = {min: 1, max: 3600};
        await reporting.onOff(endpoint, overides);
        }
    },

    {
    // all Shade Controller devices Id 0x0201
    zigbeeModel: ['ha_0x0201'], // The model ID.
    model: 'ShadeController', // Vendor model name
    vendor: 'Alink',
    description: 'Open Close shade controller',
    extend: extend.switch(),
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        const overides = {min: 1, max: 3600};
        await reporting.onOff(endpoint, overides);
        }

    },

    {
    zigbeeModel: ['reedSwitch'], // The model ID.
    model: 'ReedContactSwitch', // Vendor model name
    vendor: 'Alink', 
    description: 'Magnetic reed contact for close/open detection',
    fromZigbee: [fz.true_false_input],
    toZigbee: [],
    exposes: [e.contact()],
    // The configure method below is needed to make the device reports on/off state changes
    // when the device is controlled manually through the button on it.
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['genBinaryInput']);
        const overides = {min: 1, max: 3600};
        await reporting.presentValue(endpoint, overides);
        }

    },


    
    {
    //all simple Sensor devices Id: 0x000C
    zigbeeModel: ['ha_0x000C'], // The model ID.
    model: 'Simple True/False input device',
    vendor: 'Alink',
    description: 'Simple True/False input device',
    fromZigbee: [fz.true_false_input],
    toZigbee: [],
    exposes: [e.contact()],
    // The configure method below is needed to make the device reports on/off state changes
    // when the device is controlled manually through the button on it.
    configure: async (device, coordinatorEndpoint, logger) => {
        const endpoint = device.getEndpoint(1);
        await reporting.bind(endpoint, coordinatorEndpoint, ['genBinaryInput']);
        const overides = {min: 1, max: 3600};
        await reporting.presentValue(endpoint, overides);
        }

    },


    {
    //combined sensor devices 
    //Temperature Sensor: Id: 0x0302
    //Humidity Sensor: Id: 0x0308
    //Pressure Sensor: Id: 0x0305
    //Light Sensor: Id: 0x0106
    zigbeeModel: ['MultiSens'], // The model ID.
    model: 'TempHumPresDevice', // Vendor model name
    vendor: 'Alink',
    description: 'Temperature Humidity and Pressure device',
    fromZigbee: [fz.temperature, fz.humidity, fz.pressure],
    toZigbee: [],
    exposes: [e.temperature(), e.humidity(), e.pressure()],          
//meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, [
                'msTemperatureMeasurement']);
            const overides1 = {min: 300, max: 60000, change: 10};
            await reporting.temperature(firstEndpoint, overides1);
            const secondEndpoint = device.getEndpoint(2);
            await reporting.bind(secondEndpoint, coordinatorEndpoint, [
                'msRelativeHumidity']);
            const overides2 = {min: 300, max: 60000, change: 10};
            await reporting.humidity(secondEndpoint, overides2);
            const thirdEndpoint = device.getEndpoint(3);
            await reporting.bind(thirdEndpoint, coordinatorEndpoint, [
                'msPressureMeasurement']);
            const overides3 = {min: 300, max: 60000, change: 10};
            await reporting.pressure(thirdEndpoint, overides3);         
        },
    },
    
    {
    // Blind Controller, 4 level contolable output devices (4 endpoints)
    zigbeeModel: ['BlindCtrl'], // The model ID.
    model: 'Controler for 4 blinds', 
    vendor: 'Alink',
    description: 'Device for the control of 4 blinds',
    extend: extend.light_onoff_brightness({noConfigure: true}),
    exposes: [e.light_brightness().withEndpoint('l1'), e.light_brightness().withEndpoint('l2'),
    e.light_brightness().withEndpoint('l3'), e.light_brightness().withEndpoint('l4')],
    meta: {multiEndpoint: true},
    endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4};    
            },
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            const overides = {min: 1, max: 3600};
            await reporting.onOff(device.getEndpoint(1), overides);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(2), overides);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(3), overides);
            await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(4), overides);               
        },
    },    
    
];
