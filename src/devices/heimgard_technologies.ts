import {Definition} from '../lib/types';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as reporting from '../lib/reporting';
const e = exposes.presets;
import * as ota from '../lib/ota';
import {battery} from '../lib/modernExtend';

const definitions: Definition[] = [
    {
        zigbeeModel: ['HC-SLM-1'],
        model: 'HC-SLM-1',
        vendor: 'Heimgard Technologies',
        description: 'Wattle door lock pro',
        fromZigbee: [fz.battery, fz.lock_operation_event, fz.lock_programming_event, fz.lock, fz.lock_pin_code_response,
            fz.lock_user_status_response],
        toZigbee: [tz.identify, tz.lock, tz.lock_sound_volume, tz.lock_auto_relock_time, tz.pincode_lock, tz.lock_userstatus],
        meta: {pinCodeCount: 39},
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read('closuresDoorLock', ['lockState', 'soundVolume']);
        },
        exposes: [
            e.lock(), e.battery(), e.sound_volume(), e.auto_relock_time().withValueMin(0).withValueMax(3600),
            e.lock_action_user(), e.lock_action_source_name(), e.pincode(),
        ],
    },
    {
        zigbeeModel: ['HT-SLM-2'],
        model: 'HT-SLM-2',
        vendor: 'Heimgard Technologies',
        description: 'Doorlock with fingerprint',
        fromZigbee: [fz.lock, fz.battery, fz.lock_pin_code_response, fz.lock_user_status_response],
        toZigbee: [tz.lock, tz.lock_sound_volume, tz.identify, tz.pincode_lock, tz.lock_userstatus],
        meta: {pinCodeCount: 39},
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read('closuresDoorLock', ['lockState', 'soundVolume']);
        },
        exposes: [e.lock(), e.pincode(), e.battery(), e.sound_volume()],
    },
    {
        zigbeeModel: ['HC-IWDIM-1'],
        model: 'HC-IWDIM-1',
        vendor: 'Heimgard Technologies',
        description: 'Dimmer',
        fromZigbee: [fz.on_off, fz.brightness, fz.electrical_measurement, fz.metering],
        toZigbee: [tz.on_off, tz.light_brightness_move, tz.light_onoff_brightness],
        ota: ota.zigbeeOTA,
        exposes: [e.light_brightness(), e.power(), e.current(), e.voltage(), e.energy()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'haElectricalMeasurement', 'seMetering']);
            await reporting.rmsVoltage(endpoint, {change: 2});
            await reporting.rmsCurrent(endpoint, {change: 5});
            await reporting.activePower(endpoint, {change: 2});
            await reporting.currentSummDelivered(endpoint, {change: 2});
            await reporting.onOff(endpoint);
            await endpoint.read('haElectricalMeasurement', ['acVoltageMultiplier', 'acVoltageDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acCurrentMultiplier', 'acCurrentDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            await endpoint.read('seMetering', ['unitOfMeasure', 'multiplier', 'divisor']);
            device.save();
        },
    },
    {
        zigbeeModel: ['HT-MOT-2'],
        model: 'HT-MOT-2',
        vendor: 'Heimgard Technologies',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.ias_occupancy_alarm_1_report, fz.battery],
        toZigbee: [tz.identify],
        exposes: [e.battery(), e.tamper(), e.occupancy()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
    },
    {
        zigbeeModel: ['HC-IWSWI-1'],
        model: 'HC-IWSWI-1',
        vendor: 'Heimgard Technologies',
        description: 'In wall light switch',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.identify, tz.on_off],
        exposes: [e.switch()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['HT-SMO-2'],
        model: 'HT-SMO-2',
        vendor: 'Heimgard Technologies',
        description: 'Smoke detector',
        fromZigbee: [fz.ias_smoke_alarm_1, fz.battery],
        toZigbee: [],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.smoke(), e.battery_low(), e.battery()],
    },
    {
        zigbeeModel: ['HT-DWM-2'],
        model: 'HT-DWM-2',
        vendor: 'Heimgard Technologies',
        description: 'Door sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ['HT-INS-2'],
        model: 'HT-INS-2',
        vendor: 'Heimgard Technologies',
        description: 'Indoor siren',
        toZigbee: [tz.warning],
        meta: {disableDefaultResponse: true},
        extend: [battery()],
        exposes: [e.warning()],
    },
];

export default definitions;
module.exports = definitions;
