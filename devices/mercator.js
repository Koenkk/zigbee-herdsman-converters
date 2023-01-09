const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const tuya = require('../lib/tuya');
const extend = require('../lib/extend');
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
        fingerprint: [{modelID: 'TS0202', manufacturerName: '_TYZB01_qjqgmqxr'}],
        model: 'SMA02P',
        vendor: 'Mercator',
        description: 'Ikuü battery motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery, fz.ignore_basic_report, fz.ias_occupancy_alarm_1_report],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            try {
                await reporting.batteryPercentageRemaining(endpoint);
            } catch (error) {/* Fails for some https://github.com/Koenkk/zigbee2mqtt/issues/13708*/}
        },
    },
    {
        fingerprint: [{modelID: 'TS0201', manufacturerName: '_TZ3000_82ptnsd4'}],
        model: 'SMA03P',
        vendor: 'Mercator',
        description: 'Ikuü temperature & humidity sensor',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
        configure: tuya.configureMagicPacket,
    },
    {
        fingerprint: [{modelID: 'TS0203', manufacturerName: '_TZ3000_wbrlnkm9'}],
        model: 'SMA04P',
        vendor: 'Mercator',
        description: 'Ikuü battery contact sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery, fz.ignore_basic_report, fz.ias_contact_alarm_1_report],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            try {
                const endpoint = device.getEndpoint(1);
                await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
                await reporting.batteryPercentageRemaining(endpoint);
                await reporting.batteryVoltage(endpoint);
            } catch (error) {/* Fails for some*/}
        },
    },
    {
        fingerprint: [{modelID: 'TS0502B', manufacturerName: '_TZ3000_6dwfra5l'}],
        model: 'SMCL01-ZB',
        vendor: 'Mercator',
        description: 'Ikuü Ikon ceiling light CCT',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 500], disablePowerOnBehavior: true}),
    },
    {
        fingerprint: [{modelID: 'TS0505B', manufacturerName: '_TZ3000_xr5m6kfg'}],
        model: 'SMD4109W-RGB-ZB',
        vendor: 'Mercator',
        description: 'Ikuü Walter downlight RGB + CCT',
        extend: extend.light_onoff_brightness_colortemp_color(
            {colorTempRange: [153, 500], disableColorTempStartup: true, disablePowerOnBehavior: true}),
        meta: {applyRedFix: true, enhancedHue: false},
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3210_raqjcxo5'}],
        model: 'SPP02G',
        vendor: 'Mercator',
        description: 'Ikuü double indoors power point',
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
        fingerprint: [{modelID: 'TS0013', manufacturerName: '_TZ3000_khtlvdfc'}],
        model: 'SSW03G',
        vendor: 'Mercator',
        description: 'Ikuü triple switch',
        extend: tuya.extend.switch({backlightModeLowMediumHigh: true, endpoints: ['left', 'center', 'right']}),
        endpoint: (device) => {
            return {'left': 1, 'center': 2, 'right': 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
            for (const ID of [1, 2, 3]) {
                const endpoint = device.getEndpoint(ID);
                await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            }
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        fingerprint: [{modelID: 'TS0501', manufacturerName: '_TZ3210_lzqq3u4r'},
            {modelID: 'TS0501', manufacturerName: '_TZ3210_4whigl8i'}],
        model: 'SSWF01G',
        description: 'Ikuü AC fan controller',
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
