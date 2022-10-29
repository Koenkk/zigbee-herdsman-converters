const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require('../lib/tuya');

module.exports = [
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_air9m6af'}, {modelID: 'TS011F', manufacturerName: '_TZ3000_9djocypn'},
            {modelID: 'TS011F', manufacturerName: '_TZ3000_bppxj3sf'}],
        zigbeeModel: ['JZ-ZB-005'],
        model: 'WP33-EU/WP34-EU',
        vendor: 'LELLKI',
        description: 'Multiprise with 4 AC outlets and 2 USB super charging ports (16A)',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'),
            e.switch().withEndpoint('l3'), e.switch().withEndpoint('l4'), e.switch().withEndpoint('l5')],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3, l4: 4, l5: 5};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            await device.getEndpoint(1).read('genBasic', [
                'manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);

            for (const ID of [1, 2, 3, 4, 5]) {
                await reporting.bind(device.getEndpoint(ID), coordinatorEndpoint, ['genOnOff']);
            }
        },
    },
    {
        zigbeeModel: ['JZ-ZB-001'],
        model: 'JZ-ZB-001',
        description: 'Smart plug (without power monitoring)',
        vendor: 'LELLKI',
        fromZigbee: [fz.on_off, fz.tuya_switch_power_outage_memory],
        toZigbee: [tz.on_off, tz.tuya_switch_power_outage_memory],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
        exposes: [e.switch(), exposes.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore'])
            .withDescription('Recover state after power outage')],
    },
    {
        zigbeeModel: ['JZ-ZB-003'],
        model: 'JZ-ZB-003',
        vendor: 'LELLKI',
        description: '3 gang switch',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.switch().withEndpoint('l3')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 'l3': 3};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        zigbeeModel: ['JZ-ZB-002'],
        model: 'JZ-ZB-002',
        vendor: 'LELLKI',
        description: '2 gang touch switch',
        extend: extend.switch(),
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2')],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_twqctvna'}],
        model: 'CM001',
        vendor: 'LELLKI',
        description: 'Circuit switch',
        extend: extend.switch(),
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_z6fgd73r'}],
        model: 'XF-EU-S100-1-M',
        description: 'Touch switch 1 gang (with power monitoring)',
        vendor: 'LELLKI',
        extend: extend.switch(),
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report, fz.tuya_switch_power_outage_memory],
        toZigbee: [tz.on_off, tz.tuya_switch_power_outage_memory],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        options: [exposes.options.measurement_poll_interval()],
        exposes: [e.switch(), e.power(), e.current(), e.voltage().withAccess(ea.STATE),
            e.energy(), exposes.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore'])
                .withDescription('Recover state after power outage')],
        onEvent: tuya.onEventMeasurementPoll,
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_0yxeawjt'}],
        model: 'WK34-EU',
        description: 'Power socket EU (with power monitoring)',
        vendor: 'LELLKI',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.ignore_basic_report, fz.tuya_switch_power_outage_memory],
        toZigbee: [tz.on_off, tz.tuya_switch_power_outage_memory],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        options: [exposes.options.measurement_poll_interval()],
        exposes: [e.switch(), e.power(), e.current(), e.voltage().withAccess(ea.STATE),
            e.energy(), exposes.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore'])
                .withDescription('Recover state after power outage')],
        onEvent: tuya.onEventMeasurementPoll,
    },
    {
        fingerprint: [{modelID: 'TS011F', manufacturerName: '_TZ3000_c7nc9w3c'}],
        model: 'WP30-EU',
        description: 'Power cord 4 sockets EU (with power monitoring)',
        vendor: 'LELLKI',
        extend: extend.switch(),
        fromZigbee: [fz.on_off_force_multiendpoint, fz.electrical_measurement, fz.metering, fz.ignore_basic_report,
            fz.tuya_switch_power_outage_memory],
        toZigbee: [tz.on_off, tz.tuya_switch_power_outage_memory],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', ['manufacturerName', 'zclVersion', 'appVersion', 'modelId', 'powerSource', 0xfffe]);
            for (const ep of [1, 2, 3]) {
                await reporting.bind(device.getEndpoint(ep), coordinatorEndpoint, ['genOnOff']);
                await reporting.onOff(device.getEndpoint(ep));
            }
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 100, multiplier: 1});
            device.save();
        },
        options: [exposes.options.measurement_poll_interval()],
        exposes: [e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'),
            e.switch().withEndpoint('l3'), e.power(), e.current(), e.voltage().withAccess(ea.STATE),
            e.energy(), exposes.enum('power_outage_memory', ea.ALL, ['on', 'off', 'restore'])
                .withDescription('Recover state after power outage')],
        endpoint: (device) => {
            return {l1: 1, l2: 2, l3: 3};
        },
        onEvent: tuya.onEventMeasurementPoll,
    },
];
