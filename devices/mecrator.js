const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const tuya = require('../lib/tuya');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3210_yvxjawlt'}],
        model: 'SPP04G',
        vendor: 'Mercator',
        description: 'Ikuü Quad Power Point',
        extend: tuya.extend.switch({powerOutageMemory: true, electricalMeasurements: true, endpoints: ['left', 'right']}),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'),
            e.power().withEndpoint('left'), e.current().withEndpoint('left'),
            e.voltage().withEndpoint('left').withAccess(ea.STATE), e.energy(),
            tuya.exposes.powerOutageMemory()],
        endpoint: (device) => {
            return {left: 1, right: 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3210_7jnk7l3k'}],
        model: 'SPP02GIP',
        vendor: 'Mercator',
        description: 'Ikuü double outdoors power point',
        extend: tuya.extend.switch({powerOutageMemory: true, electricalMeasurements: true, endpoints: ['left', 'right']}),
        exposes: [e.switch().withEndpoint('left'), e.switch().withEndpoint('right'),
            e.power().withEndpoint('left'), e.current().withEndpoint('left'),
            e.voltage().withEndpoint('left').withAccess(ea.STATE), e.energy()],
        endpoint: (device) => {
            return {left: 1, right: 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genBasic', 'genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            await reporting.onOff(endpoint1);
            await reporting.onOff(endpoint1);
            await reporting.rmsVoltage(endpoint1, {change: 5});
            await reporting.rmsCurrent(endpoint1, {change: 50});
            await reporting.activePower(endpoint1, {change: 1});
            await reporting.onOff(endpoint1);
            await reporting.onOff(endpoint2);
            endpoint1.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint1.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
    },
    {
        fingerprint: [{modelID: 'TS0501', manufacturerName: '_TZ3210_lzqq3u4r'},
            {modelID: 'TS0501', manufacturerName: '_TZ3210_4whigl8i'}],
        model: 'SSWF01G',
        description: 'AC fan controller',
        vendor: 'Mercator',
        fromZigbee: [fz.on_off, fz.fan],
        toZigbee: [tz.fan_mode, tz.on_off],
        exposes: [e.switch(), e.fan().withModes(['off', 'low', 'medium', 'high', 'on'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'genOta', 'genTime', 'genGroups', 'genScenes']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genIdentify', 'manuSpecificTuya', 'hvacFanCtrl']);
            await reporting.onOff(endpoint);
            await reporting.fanMode(endpoint);
        },
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3210_pfbzs1an'}],
        model: 'SPPUSB02',
        vendor: 'Mercator',
        description: 'Ikuü double power point with USB',
        extend: tuya.extend.switch({powerOutageMemory: true, electricalMeasurements: true, endpoints: ['left', 'right']}),
        exposes: [
            e.switch().withEndpoint('left'), e.switch().withEndpoint('right'),
            e.power().withEndpoint('left'), e.current().withEndpoint('left'), e.voltage().withEndpoint('left').withAccess(ea.STATE),
            e.energy(), tuya.exposes.powerOutageMemory(),
        ],
        endpoint: (device) => {
            return {left: 1, right: 2};
        },
        // The configure method below is needed to make the device reports on/off state changes
        // when the device is controlled manually through the button on it.
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['genBasic', 'genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint1);
            await reporting.rmsVoltage(endpoint1, {change: 5});
            await reporting.rmsCurrent(endpoint1, {change: 50});
            await reporting.activePower(endpoint1, {change: 1});
            await reporting.onOff(endpoint1);
            await reporting.onOff(endpoint2);
            endpoint1.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint1.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
    },
];
