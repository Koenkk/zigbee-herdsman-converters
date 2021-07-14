const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const ota = require('../lib/ota');
const reporting = require('../lib/reporting');
const constants = require('../lib/constants');
const {repInterval} = require('../lib/constants');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['PoP'],
        model: 'HLU2909K',
        vendor: 'Datek',
        description: 'APEX smart plug 16A',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.temperature],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'msTemperatureMeasurement']);
            await endpoint.read('haElectricalMeasurement', ['acVoltageMultiplier', 'acVoltageDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acCurrentMultiplier', 'acCurrentDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.onOff(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.activePower(endpoint);
            await reporting.temperature(endpoint);
        },
        exposes: [e.power(), e.current(), e.voltage(), e.switch(), e.temperature()],
    },
    {
        zigbeeModel: ['Meter Reader'],
        model: 'HSE2905E',
        vendor: 'Datek',
        description: 'Datek Eva AMS HAN power-meter sensor',
        fromZigbee: [fz.metering_datek, fz.electrical_measurement, fz.temperature],
        toZigbee: [],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering', 'msTemperatureMeasurement']);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            const payload = [{
                attribute: 'rmsVoltagePhB',
                minimumReportInterval: 10,
                maximumReportInterval: 3600,
                reportableChange: 0,
            },
            {
                attribute: 'rmsVoltagePhC',
                minimumReportInterval: 10,
                maximumReportInterval: 3600,
                reportableChange: 0,
            },
            {
                attribute: 'rmsCurrentPhB',
                minimumReportInterval: 10,
                maximumReportInterval: 3600,
                reportableChange: 0,
            },
            {
                attribute: 'rmsCurrentPhC',
                minimumReportInterval: 10,
                maximumReportInterval: 3600,
                reportableChange: 0,
            }];
            await endpoint.configureReporting('haElectricalMeasurement', payload);
            await reporting.rmsVoltage(endpoint, {min: 10, max: 3600, change: 0});
            await reporting.rmsCurrent(endpoint, {min: 10, max: 3600, change: 0});
            await reporting.instantaneousDemand(endpoint, {min: 10, max: 3600, change: 0});
            await reporting.currentSummDelivered(endpoint, {min: 10, max: 3600, change: [1, 1]});
            await reporting.currentSummReceived(endpoint);
            await reporting.temperature(endpoint);
        },
        exposes: [e.power(), e.energy(), e.current(), e.voltage(), e.current_phase_b(), e.voltage_phase_b(), e.current_phase_c(),
            e.voltage_phase_c(), e.temperature()],
    },
    {
        zigbeeModel: ['ID Lock 150'],
        model: '0402946',
        vendor: 'Datek',
        description: 'Zigbee module for ID lock 150',
        fromZigbee: [fz.lock, fz.battery, fz.lock_operation_event, fz.lock_programming_event,
            fz.idlock, fz.idlock_fw, fz.lock_pin_code_response],
        toZigbee: [tz.lock, tz.lock_sound_volume, tz.idlock_master_pin_mode, tz.idlock_rfid_enable,
            tz.idlock_service_mode, tz.idlock_lock_mode, tz.idlock_relock_enabled, tz.pincode_lock],
        meta: {pinCodeCount: 109},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: 4919};
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            const payload = [{
                attribute: {ID: 0x4000, type: 0x10},
                minimumReportInterval: 0,
                maximumReportInterval: repInterval.HOUR,
                reportableChange: 1,
            },
            {
                attribute: {ID: 0x4001, type: 0x10},
                minimumReportInterval: 0,
                maximumReportInterval: repInterval.HOUR,
                reportableChange: 1,
            },
            {
                attribute: {ID: 0x4003, type: 0x20},
                minimumReportInterval: 0,
                maximumReportInterval: repInterval.HOUR,
                reportableChange: 1,
            },
            {
                attribute: {ID: 0x4004, type: 0x20},
                minimumReportInterval: 0,
                maximumReportInterval: repInterval.HOUR,
                reportableChange: 1,
            },
            {
                attribute: {ID: 0x4005, type: 0x10},
                minimumReportInterval: 0,
                maximumReportInterval: repInterval.HOUR,
                reportableChange: 1,
            }];
            await endpoint.configureReporting('closuresDoorLock', payload, options);
            await endpoint.read('closuresDoorLock', ['lockState', 'soundVolume', 'doorState']);
            await endpoint.read('closuresDoorLock', [0x4000, 0x4001, 0x4003, 0x4004, 0x4005], options);
            await endpoint.read('genBasic', [0x5000], options);
        },
        onEvent: async (type, data, device) => {
            // When we receive a code updated message, lets read the new value
            if (data.type === 'commandProgrammingEventNotification' &&
                data.cluster === 'closuresDoorLock' &&
                data.data &&
                data.data.userid !== undefined &&
                // Don't read RF events, we can do this with retrieve_state
                (data.data.programeventsrc === undefined || constants.lockSourceName[data.data.programeventsrc] != 'rf')
            ) {
                await device.endpoints[0].command('closuresDoorLock', 'getPinCode', {userid: data.data.userid}, {});
            }
        },
        exposes: [e.lock(), e.battery(), e.pincode(),
            exposes.enum('sound_volume', ea.ALL, constants.lockSoundVolume).withDescription('Sound volume of the lock'),
            exposes.binary('master_pin_mode', ea.ALL, true, false).withDescription('Allow Master PIN Unlock'),
            exposes.binary('rfid_enable', ea.ALL, true, false).withDescription('Allow RFID to Unlock'),
            exposes.binary('relock_enabled', ea.ALL, true, false).withDescription( 'Allow Auto Re-Lock'),
            exposes.enum('lock_mode', ea.ALL, ['auto_off_away_off', 'auto_on_away_off', 'auto_off_away_on',
                'auto_on_away_on']).withDescription('Lock-Mode of the Lock'),
            exposes.enum('service_mode', ea.ALL, ['deactivated', 'random_pin_1x_use',
                'random_pin_24_hours']).withDescription('Service Mode of the Lock')],
    },
];
