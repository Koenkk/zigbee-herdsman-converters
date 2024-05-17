import {Zcl} from 'zigbee-herdsman';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as ota from '../lib/ota';
import * as reporting from '../lib/reporting';
import * as constants from '../lib/constants';
import {repInterval} from '../lib/constants';
import {Definition} from '../lib/types';
const e = exposes.presets;
const ea = exposes.access;

const definitions: Definition[] = [
    {
        zigbeeModel: ['PoP'],
        model: 'HLU2909K',
        vendor: 'Datek',
        description: 'APEX smart plug 16A',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.temperature],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint) => {
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
        exposes: [e.power(), e.current(), e.voltage(), e.switch(), e.temperature(), e.power_on_behavior()],
    },
    {
        zigbeeModel: ['Meter Reader'],
        model: 'HSE2905E',
        vendor: 'Datek',
        description: 'Datek Eva AMS HAN power-meter sensor',
        fromZigbee: [fz.metering_datek, fz.electrical_measurement, fz.temperature, fz.hw_version],
        toZigbee: [],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['haElectricalMeasurement', 'seMetering', 'msTemperatureMeasurement']);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            try {
                // hwVersion < 2 do not support hwVersion attribute, so we are testing if this is hwVersion 1 or 2
                await endpoint.read('genBasic', ['hwVersion']);
            } catch (e) {
                e;
            }
            const payload = [{
                attribute: 'rmsVoltagePhB',
                minimumReportInterval: 60,
                maximumReportInterval: 3600,
                reportableChange: 0,
            },
            {
                attribute: 'rmsVoltagePhC',
                minimumReportInterval: 60,
                maximumReportInterval: 3600,
                reportableChange: 0,
            },
            {
                attribute: 'rmsCurrentPhB',
                minimumReportInterval: 60,
                maximumReportInterval: 3600,
                reportableChange: 0,
            },
            {
                attribute: 'rmsCurrentPhC',
                minimumReportInterval: 60,
                maximumReportInterval: 3600,
                reportableChange: 0,
            }];
            await endpoint.configureReporting('haElectricalMeasurement', payload);
            await reporting.rmsVoltage(endpoint, {min: 60, max: 3600, change: 0});
            await reporting.rmsCurrent(endpoint, {min: 60, max: 3600, change: 0});
            await reporting.instantaneousDemand(endpoint, {min: 60, max: 3600, change: 0});
            await reporting.currentSummDelivered(endpoint, {min: 60, max: 3600, change: [1, 1]});
            await reporting.currentSummReceived(endpoint);
            await reporting.temperature(endpoint, {min: 60, max: 3600, change: 0});
        },
        exposes: [e.power(), e.energy(), e.current(), e.voltage(), e.current_phase_b(), e.voltage_phase_b(), e.current_phase_c(),
            e.voltage_phase_c(), e.temperature()],
    },
    {
        zigbeeModel: ['Motion Sensor'],
        model: 'HSE2927E',
        vendor: 'Datek',
        description: 'Eva motion sensor',
        fromZigbee: [fz.battery, fz.occupancy, fz.occupancy_timeout, fz.illuminance, fz.temperature,
            fz.ias_enroll, fz.ias_occupancy_alarm_1, fz.ias_occupancy_alarm_1_report, fz.led_on_motion],
        toZigbee: [tz.occupancy_timeout, tz.led_on_motion],
        configure: async (device, coordinatorEndpoint) => {
            const options = {manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS};
            const endpoint = device.getEndpoint(1);
            const binds = ['msIlluminanceMeasurement', 'msTemperatureMeasurement', 'msOccupancySensing', 'ssIasZone'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.occupancy(endpoint);
            await reporting.temperature(endpoint);
            await reporting.illuminance(endpoint);
            const payload = [{
                attribute: {ID: 0x4000, type: 0x10},
            }];
            // @ts-expect-error
            await endpoint.configureReporting('ssIasZone', payload, options);
            await endpoint.read('ssIasZone', ['iasCieAddr', 'zoneState', 'zoneId']);
            await endpoint.read('msOccupancySensing', ['pirOToUDelay']);
            await endpoint.read('ssIasZone', [0x4000], options);
        },
        exposes: [e.temperature(), e.occupancy(), e.battery_low(), e.illuminance_lux(), e.illuminance(),
            e.binary('led_on_motion', ea.ALL, true, false).withDescription('Enable/disable LED on motion'),
            e.numeric('occupancy_timeout', ea.ALL).withUnit('s').withValueMin(0).withValueMax(65535)],
    },
    {
        zigbeeModel: ['ID Lock 150', 'ID Lock 202'],
        model: '0402946',
        vendor: 'Datek',
        description: 'Zigbee module for ID lock',
        fromZigbee: [fz.lock, fz.battery, fz.lock_operation_event, fz.lock_programming_event,
            fz.idlock, fz.idlock_fw, fz.lock_pin_code_response],
        toZigbee: [tz.lock, tz.lock_sound_volume, tz.idlock_master_pin_mode, tz.idlock_rfid_enable,
            tz.idlock_service_mode, tz.idlock_lock_mode, tz.idlock_relock_enabled, tz.pincode_lock],
        meta: {pinCodeCount: 109},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const options = {manufacturerCode: Zcl.ManufacturerCode.DATEK_WIRELESS_AS};
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
        exposes: [e.lock(), e.battery(), e.pincode(), e.door_state(),
            e.lock_action(), e.lock_action_source_name(), e.lock_action_user(),
            e.enum('sound_volume', ea.ALL, constants.lockSoundVolume).withDescription('Sound volume of the lock'),
            e.binary('master_pin_mode', ea.ALL, true, false).withDescription('Allow Master PIN Unlock'),
            e.binary('rfid_enable', ea.ALL, true, false).withDescription('Allow RFID to Unlock'),
            e.binary('relock_enabled', ea.ALL, true, false).withDescription( 'Allow Auto Re-Lock'),
            e.enum('lock_mode', ea.ALL, ['auto_off_away_off', 'auto_on_away_off', 'auto_off_away_on',
                'auto_on_away_on']).withDescription('Lock-Mode of the Lock'),
            e.enum('service_mode', ea.ALL, ['deactivated', 'random_pin_1x_use',
                'random_pin_24_hours']).withDescription('Service Mode of the Lock')],
    },
    {
        zigbeeModel: ['Water Sensor'],
        model: 'HSE2919E',
        vendor: 'Datek',
        description: 'Eva water leak sensor',
        fromZigbee: [fz.temperature, fz.battery, fz.ias_enroll, fz.ias_water_leak_alarm_1, fz.ias_water_leak_alarm_1_report],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genBasic', 'ssIasZone']);
            await reporting.batteryVoltage(endpoint);
            await endpoint.read('ssIasZone', ['iasCieAddr', 'zoneState', 'zoneId']);

            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint2, coordinatorEndpoint, ['msTemperatureMeasurement']);
        },
        endpoint: (device) => {
            return {default: 1};
        },
        exposes: [e.battery(), e.battery_low(), e.temperature(), e.water_leak(), e.tamper()],
    },
    {
        zigbeeModel: ['Scene Selector', 'SSDS'],
        model: 'HBR2917E',
        vendor: 'Datek',
        description: 'Eva scene selector',
        fromZigbee: [fz.temperature, fz.battery, fz.command_recall, fz.command_on, fz.command_off, fz.command_move, fz.command_stop],
        toZigbee: [tz.on_off],
        meta: {battery: {voltageToPercentage: '3V_2500'}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genBasic', 'genOnOff',
                'genLevelCtrl', 'msTemperatureMeasurement']);
            await reporting.batteryVoltage(endpoint);
            await reporting.temperature(endpoint, {min: constants.repInterval.MINUTES_10, max: constants.repInterval.HOUR, change: 100});
        },
        exposes: [e.battery(), e.temperature(),
            e.action(['recall_1', 'recall_2', 'recall_3', 'recall_4', 'on', 'off',
                'brightness_move_down', 'brightness_move_up', 'brightness_stop'])],
    },
    {
        zigbeeModel: ['Door/Window Sensor'],
        model: 'HSE2920E',
        vendor: 'Datek',
        description: 'Door/window sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.ias_contact_alarm_1_report, fz.temperature, fz.ias_enroll],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['ssIasZone', 'msTemperatureMeasurement']);
            await reporting.temperature(endpoint);
            await endpoint.read('ssIasZone', ['iasCieAddr', 'zoneState', 'zoneId']);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature()],
    },
    {
        zigbeeModel: ['Contact Switch'],
        model: 'HSE2936T',
        vendor: 'Datek',
        description: 'Door/window sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.ias_contact_alarm_1_report, fz.temperature, fz.ias_enroll],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['ssIasZone', 'msTemperatureMeasurement']);
            await reporting.temperature(endpoint);
            await endpoint.read('ssIasZone', ['iasCieAddr', 'zoneState', 'zoneId']);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature()],
    },
];

export default definitions;
module.exports = definitions;
