import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
import extend from '../lib/extend';
import * as ota from '../lib/ota';
import {Definition, Fz, KeyValue} from '../lib/types';
import {forcePowerSource, light, onOff} from '../lib/modernExtend';
import {temperature, humidity, batteryPercentage} from '../lib/modernExtend';

const e = exposes.presets;

const fzLocal = {
    thirdreality_acceleration: {
        cluster: '65521',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const payload: KeyValue = {};
            if (msg.data['1']) payload.x_axis = msg.data['1'];
            if (msg.data['2']) payload.y_axis = msg.data['2'];
            if (msg.data['3']) payload.z_axis = msg.data['3'];
            return payload;
        },
    } satisfies Fz.Converter,
    thirdreality_private_motion_sensor: {
        cluster: 'manuSpecificUbisysDeviceSetup',
        type: 'attributeReport',
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = msg.data[2];
            return {occupancy: (zoneStatus & 1) > 0};
        },
    } satisfies Fz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['3RSS009Z'],
        model: '3RSS009Z',
        vendor: 'Third Reality',
        description: 'Smart switch Gen3',
        ota: ota.zigbeeOTA,
        fromZigbee: [fz.on_off, fz.battery],
        toZigbee: [tz.on_off, tz.ignore_transition],
        exposes: [e.switch(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
            device.powerSource = 'Battery';
            device.save();
        },
    },
    {
        zigbeeModel: ['3RSS008Z'],
        model: '3RSS008Z',
        vendor: 'Third Reality',
        description: 'RealitySwitch Plus',
        fromZigbee: [fz.on_off, fz.battery],
        toZigbee: [tz.on_off, tz.ignore_transition],
        meta: {battery: {voltageToPercentage: '3V_2100'}},
        exposes: [e.switch(), e.battery(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['3RSS007Z'],
        model: '3RSS007Z',
        vendor: 'Third Reality',
        description: 'Smart light switch',
        extend: extend.switch(),
        meta: {disableDefaultResponse: true},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['3RSL011Z'],
        model: '3RSL011Z',
        vendor: 'Third Reality',
        description: 'Smart light A19',
        extend: [light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['3RSL012Z'],
        model: '3RSL012Z',
        vendor: 'Third Reality',
        description: 'Smart light BR30',
        extend: [light({colorTemp: {range: undefined}})],
    },
    {
        zigbeeModel: ['3RWS18BZ'],
        model: '3RWS18BZ',
        vendor: 'Third Reality',
        description: 'Water sensor',
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        ota: ota.zigbeeOTA,
        exposes: [e.water_leak(), e.battery_low(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
            device.powerSource = 'Battery';
            device.save();
        },
    },
    {
        zigbeeModel: ['3RMS16BZ'],
        model: '3RMS16BZ',
        vendor: 'Third Reality',
        description: 'Wireless motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        ota: ota.zigbeeOTA,
        exposes: [e.occupancy(), e.battery_low(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
            device.powerSource = 'Battery';
            device.save();
        },
    },
    {
        zigbeeModel: ['3RDS17BZ'],
        model: '3RDS17BZ',
        vendor: 'Third Reality',
        description: 'Door sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        ota: ota.zigbeeOTA,
        exposes: [e.contact(), e.battery_low(), e.battery(), e.battery_voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
            device.powerSource = 'Battery';
            device.save();
        },
    },
    {
        zigbeeModel: ['3RSP019BZ'],
        model: '3RSP019BZ',
        vendor: 'Third Reality',
        description: 'Zigbee / BLE smart plug',
        extend: [onOff()],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['3RSB015BZ'],
        model: '3RSB015BZ',
        vendor: 'Third Reality',
        description: 'Roller shade',
        fromZigbee: [fz.cover_position_tilt, fz.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        meta: {battery: {dontDividePercentage: false}},
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint);
            try {
                await reporting.batteryPercentageRemaining(endpoint);
            } catch (error) {/* Fails for some*/}
        },
        exposes: [e.cover_position(), e.battery()],
    },
    {
        zigbeeModel: ['3RSB22BZ'],
        model: '3RSB22BZ',
        vendor: 'Third Reality',
        description: 'Smart button',
        fromZigbee: [fz.battery, fz.itcmdr_clicks],
        toZigbee: [],
        ota: ota.zigbeeOTA,
        exposes: [e.battery(), e.battery_low(), e.battery_voltage(), e.action(['single', 'double', 'long'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
            device.powerSource = 'Battery';
            device.save();
        },
    },
    {
        zigbeeModel: ['3RTHS24BZ'],
        model: '3RTHS24BZ',
        vendor: 'Third Reality',
        description: 'Temperature and humidity sensor',
        fromZigbee: [fz.battery, fz.temperature, fz.humidity],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.battery_voltage()],
        extend: [batteryPercentage(), forcePowerSource({powerSource: 'Battery'})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['3RTHS0224Z'],
        model: '3RTHS0224Z',
        vendor: 'Third Reality',
        description: 'Temperature and humidity sensor v2',
        extend: [temperature(), humidity(), batteryPercentage(), forcePowerSource({powerSource: 'Battery'})],
        ota: ota.zigbeeOTA,
    },
    {
        zigbeeModel: ['3RSP02028BZ'],
        model: '3RSP02028BZ',
        vendor: 'Third Reality',
        description: 'Zigbee / BLE smart plug with power',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        ota: ota.zigbeeOTA,
        exposes: [e.switch(), e.power_on_behavior(), e.ac_frequency(), e.power(), e.power_factor(), e.energy(), e.current(), e.voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.onOff(endpoint);
            await reporting.activePower(endpoint, {change: 10});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.readMeteringMultiplierDivisor(endpoint);
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 3600000, multiplier: 1});
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acVoltageMultiplier: 1, acVoltageDivisor: 10, acCurrentMultiplier: 1, acCurrentDivisor: 1000, acPowerMultiplier: 1,
                acPowerDivisor: 10,
            });
            device.save();
        },
    },
    {
        zigbeeModel: ['3RVS01031Z'],
        model: '3RVS01031Z',
        vendor: 'Third Reality',
        description: 'Zigbee vibration sensor',
        fromZigbee: [fz.ias_vibration_alarm_1, fz.battery, fzLocal.thirdreality_acceleration],
        toZigbee: [],
        ota: ota.zigbeeOTA,
        exposes: [e.vibration(), e.battery_low(), e.battery(), e.battery_voltage(), e.x_axis(), e.y_axis(), e.z_axis()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
            device.powerSource = 'Battery';
            device.save();
        },
    },
    {
        zigbeeModel: ['3RSNL02043Z'],
        model: '3RSNL02043Z',
        vendor: 'Third Reality',
        description: 'Zigbee multi-function night light',
        ota: ota.zigbeeOTA,
        fromZigbee: extend.light_onoff_brightness_colortemp_color().fromZigbee.concat([
            fzLocal.thirdreality_private_motion_sensor, fz.illuminance, fz.ias_occupancy_alarm_1_report]),
        toZigbee: extend.light_onoff_brightness_colortemp_color().toZigbee,
        exposes: [e.light_brightness_colorxy(),
            e.occupancy(), e.illuminance(), e.illuminance_lux().withUnit('lx')],
        configure: async (device, coordinatorEndpoint, logger) => {
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['3RSPE01044BZ'],
        model: '3RSPE01044BZ',
        vendor: 'Third Reality',
        description: 'Zigbee / BLE smart plug with power',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        ota: ota.zigbeeOTA,
        exposes: [e.switch(), e.power_on_behavior(), e.ac_frequency(), e.power(), e.power_factor(), e.energy(), e.current(), e.voltage()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'haElectricalMeasurement', 'seMetering']);
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await reporting.onOff(endpoint);
            await reporting.activePower(endpoint, {change: 10});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.readMeteringMultiplierDivisor(endpoint);
            endpoint.saveClusterAttributeKeyValue('seMetering', {divisor: 3600000, multiplier: 1});
            endpoint.saveClusterAttributeKeyValue('haElectricalMeasurement', {
                acVoltageMultiplier: 1, acVoltageDivisor: 10, acCurrentMultiplier: 1, acCurrentDivisor: 1000, acPowerMultiplier: 1,
                acPowerDivisor: 10,
            });
            device.save();
        },
    },
];

export default definitions;
module.exports = definitions;
