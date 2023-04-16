const exposes = require('../lib/exposes');
const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ota = require('../lib/ota');

module.exports = [
    {
        zigbeeModel: ['HC-SLM-1'],
        model: 'HC-SLM-1',
        vendor: 'Heimgard Technologies',
        description: 'Wattle door lock pro',
        fromZigbee: [fz.lock, fz.battery],
        toZigbee: [tz.lock, tz.lock_auto_relock_time, tz.lock_sound_volume],
        ota: ota.zigbeeOTA,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read('closuresDoorLock', ['lockState', 'soundVolume']);
        },
        exposes: [
            e.lock(), e.battery(), e.auto_relock_time().withValueMin(0).withValueMax(3600), e.sound_volume()],
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
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'haElectricalMeasurement', 'seMetering']);
            await reporting.rmsVoltage(endpoint, {change: 2});
            await reporting.rmsCurrent(endpoint, {change: 5});
            await reporting.activePower(endpoint, {change: 2});
            await reporting.currentSummDelivered(endpoint, 2);
            await reporting.onOff(endpoint);
            await endpoint.read('haElectricalMeasurement', ['acVoltageMultiplier', 'acVoltageDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acCurrentMultiplier', 'acCurrentDivisor']);
            await endpoint.read('haElectricalMeasurement', ['acPowerMultiplier', 'acPowerDivisor']);
            device.save();
        },
    },
    {
        zigbeeModel: ['HT-MOT-2'],
        model: 'HT-MOT-2',
        vendor: 'Heimgard Technologies',
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.ias_occupancy_alarm_1_report],
        toZigbee: [tz.identify],
        exposes: [e.battery(), e.tamper(), e.occupancy()],
    },
    {
        zigbeeModel: ['HC-IWSWI-1'],
        model: 'HC-IWSWI-1',
        vendor: 'Heimgard Technologies',
        description: 'In wall light switch',
        fromZigbee: [fz.on_off],
        toZigbee: [tz.identify, tz.on_off],
        exposes: [e.switch()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
];
