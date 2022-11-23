const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    dawon_card_holder: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data.zonestatus;
            return {
                card: (zoneStatus & 1) > 0,
                battery_low: (zoneStatus & 1<<3) > 0,
            };
        },
    },
};


const tzLocal = {
    dawon_card_holder: {
        key: ['card'],
        convertGet: async (entity, key, meta) => {
            await entity.read('ssIasZone', ['zoneState']);
        },
    },
};

module.exports = [
    {
        zigbeeModel: ['PM-C140-ZB'],
        model: 'PM-C140-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT remote control smart buried-type outlet',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off, tz.metering_power, tz.currentsummdelivered],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 10, max: 3600, change: 5});
        },
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.energy().withAccess(ea.STATE_GET)],
    },
    {
        zigbeeModel: ['PM-B530-ZB'],
        model: 'PM-B530-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart plug 16A',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off, tz.metering_power, tz.currentsummdelivered],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 10, max: 3600, change: 5});
        },
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.energy().withAccess(ea.STATE_GET)],
    },
    {
        zigbeeModel: ['PM-B540-ZB'],
        model: 'PM-B540-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart plug 16A',
        fromZigbee: [fz.device_temperature, fz.on_off, fz.metering],
        toZigbee: [tz.on_off, tz.metering_power, tz.currentsummdelivered],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering', 'genDeviceTempCfg']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 10, max: 3600, change: 5});
            await reporting.deviceTemperature(endpoint);
            // some firmware is not defined powersource
            if (device.powerSource === 'Unknown') {
                device.powerSource = 'Mains (single phase)';
                device.save();
            }
        },
        exposes: [e.device_temperature(), e.switch(), e.power().withAccess(ea.STATE_GET), e.energy().withAccess(ea.STATE_GET)],
    },
    {
        zigbeeModel: ['PM-B430-ZB'],
        model: 'PM-B430-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart plug 10A',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        exposes: [e.switch(), e.power(), e.energy()],
    },
    {
        zigbeeModel: ['PM-S140-ZB'],
        model: 'PM-S140-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 1 gang without neutral wire',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['PM-S240-ZB'],
        model: 'PM-S240-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 2 gang without neutral wire',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {top: 1, bottom: 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
        },
    },
    {
        zigbeeModel: ['PM-S340-ZB'],
        model: 'PM-S340-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 3 gang without neutral wire',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('center'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {top: 1, center: 2, bottom: 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
            await reporting.onOff(device.getEndpoint(3));
        },
    },
    {
        zigbeeModel: ['PM-S140R-ZB'],
        model: 'PM-S140R-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 1 gang router without neutral wire',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['PM-S240R-ZB'],
        model: 'PM-S240R-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 2 gang without neutral wire',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {top: 1, bottom: 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
        },
    },
    {
        zigbeeModel: ['PM-S340R-ZB'],
        model: 'PM-S340R-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 3 gang without neutral wire',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('center'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {top: 1, center: 2, bottom: 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
            await reporting.onOff(device.getEndpoint(3));
        },
    },
    {
        zigbeeModel: ['PM-S150-ZB'],
        model: 'PM-S150-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 1 gang router without neutral wire',
        extend: extend.switch(),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
            // some firmware is not defined powersource
            if (device.powerSource === 'Unknown') {
                device.powerSource = 'Mains (single phase)';
                device.save();
            }
        },
    },
    {
        zigbeeModel: ['PM-S250-ZB'],
        model: 'PM-S250-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 2 gang without neutral wire',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {top: 1, bottom: 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
            // some firmware is not defined powersource
            if (device.powerSource === 'Unknown') {
                device.powerSource = 'Mains (single phase)';
                device.save();
            }
        },
    },
    {
        zigbeeModel: ['PM-S350-ZB'],
        model: 'PM-S350-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart switch 3 gang without neutral wire',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('top'), e.switch().withEndpoint('center'), e.switch().withEndpoint('bottom')],
        endpoint: (device) => {
            return {top: 1, center: 2, bottom: 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(device.getEndpoint(1));
            await reporting.onOff(device.getEndpoint(2));
            await reporting.onOff(device.getEndpoint(3));
            // some firmware is not defined powersource
            if (device.powerSource === 'Unknown') {
                device.powerSource = 'Mains (single phase)';
                device.save();
            }
        },
    },
    {
        zigbeeModel: ['PM-C150-ZB'],
        model: 'PM-C150-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT remote control smart buried-type 16A outlet',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off, tz.metering_power, tz.currentsummdelivered],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 10, max: 3600, change: 5});
        },
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.energy().withAccess(ea.STATE_GET)],
    },
    {
        zigbeeModel: ['SG-V100-ZB'],
        model: 'SG-V100-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT remote control smart gas lock',
        fromZigbee: [fz.on_off, fz.battery],
        toZigbee: [tz.dawondns_only_off], // Only support 'Off' command
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.onOff(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.battery(), e.switch()],
    },
    {
        zigbeeModel: ['KB-HD100-ZB'],
        model: 'KB-HD100-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT Card holder',
        fromZigbee: [fzLocal.dawon_card_holder],
        toZigbee: [tzLocal.dawon_card_holder],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['ssIasZone']);
            const payload = [{
                attribute: 'zoneState', minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0}];
            await endpoint.configureReporting('ssIasZone', payload);
        },
        exposes: [exposes.binary('card', ea.STATE, true, false).withAccess(ea.STATE_GET)
            .withDescription('Indicates if the card is inserted (= true) or not (= false)'), e.battery_low()],
    },
    {
        zigbeeModel: ['KB-B540R-ZB'],
        model: 'KB-B540R-ZB',
        vendor: 'Dawon DNS',
        description: 'IOT smart plug 16A',
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off, tz.metering_power, tz.currentsummdelivered],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 10, max: 3600, change: 5});
        },
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET), e.energy().withAccess(ea.STATE_GET)],
    },
];
