const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const constants = require('../lib/constants');
const reporting = require('../lib/reporting');
const utils = require('../lib/utils');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['RES005'],
        model: 'KMPCIL_RES005',
        vendor: 'KMPCIL',
        description: 'Environment sensor',
        exposes: [e.battery(), e.temperature(), e.humidity(), e.pressure(), e.illuminance(), e.illuminance_lux(), e.occupancy(),
            e.switch()],
        fromZigbee: [fz.battery, fz.temperature, fz.humidity, fz.pressure, fz.illuminance, fz.kmpcil_res005_occupancy,
            fz.kmpcil_res005_on_off],
        toZigbee: [tz.kmpcil_res005_on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(8);
            const binds = ['genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity', 'msPressureMeasurement',
                'msIlluminanceMeasurement', 'genBinaryInput', 'genBinaryOutput'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
            const payloadBattery = [{
                attribute: 'batteryPercentageRemaining', minimumReportInterval: 1, maximumReportInterval: 120, reportableChange: 1}];
            await endpoint.configureReporting('genPowerCfg', payloadBattery);
            const payload = [{attribute: 'measuredValue', minimumReportInterval: 5, maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 200}];
            await endpoint.configureReporting('msIlluminanceMeasurement', payload);
            const payloadPressure = [{
                // 0 = measuredValue, override dataType from int16 to uint16
                // https://github.com/Koenkk/zigbee-herdsman/pull/191/files?file-filters%5B%5D=.ts#r456569398
                attribute: {ID: 0, type: 33}, minimumReportInterval: 2, maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 3}];
            await endpoint.configureReporting('msPressureMeasurement', payloadPressure);
            const options = {disableDefaultResponse: true};
            await endpoint.write('genBinaryInput', {0x0051: {value: 0x01, type: 0x10}}, options);
            await endpoint.write('genBinaryInput', {0x0101: {value: 25, type: 0x23}}, options);
            const payloadBinaryInput = [{
                attribute: 'presentValue', minimumReportInterval: 0, maximumReportInterval: 30, reportableChange: 1}];
            await endpoint.configureReporting('genBinaryInput', payloadBinaryInput);
            await endpoint.write('genBinaryOutput', {0x0051: {value: 0x01, type: 0x10}}, options);
            const payloadBinaryOutput = [{
                attribute: 'presentValue', minimumReportInterval: 0, maximumReportInterval: 30, reportableChange: 1}];
            await endpoint.configureReporting('genBinaryOutput', payloadBinaryOutput);
        },
    },
    {
        zigbeeModel: ['tagv1'],
        model: 'KMPCIL-tag-001',
        vendor: 'KMPCIL',
        description: 'Arrival sensor',
        fromZigbee: [fz.kmpcil_presence_binary_input, fz.kmpcil_presence_power, fz.temperature],
        exposes: [e.battery(), e.presence(), exposes.binary('power_state', exposes.access.STATE, true, false),
            e.occupancy(), e.vibration(), e.temperature()],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_1500_2800'}},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            for (const cluster of ['msTemperatureMeasurement', 'genPowerCfg', 'genBinaryInput']) {
                await utils.sleep(2000);
                await endpoint.bind(cluster, coordinatorEndpoint);
            }

            await utils.sleep(1000);
            const p = reporting.payload('batteryVoltage', 0, 10, 1);
            await endpoint.configureReporting('genPowerCfg', p);

            await utils.sleep(1000);
            const p2 = reporting.payload('presentValue', 0, 300, 1);
            await endpoint.configureReporting('genBinaryInput', p2);

            await utils.sleep(1000);
            await reporting.temperature(endpoint);
            await endpoint.read('genBinaryInput', ['presentValue']);
        },
    },
];
