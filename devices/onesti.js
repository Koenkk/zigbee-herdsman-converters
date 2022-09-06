const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;
const constants = require('../lib/constants');

module.exports = [
    {
        zigbeeModel: ['easyCodeTouch_v1', 'EasyCodeTouch', 'EasyFingerTouch'],
        model: 'easyCodeTouch_v1',
        vendor: 'Onesti Products AS',
        description: 'Zigbee module for EasyAccess code touch series',
        fromZigbee: [fz.lock, fz.lock_operation_event, fz.battery, fz.lock_programming_event, fz.easycodetouch_action],
        toZigbee: [tz.lock, tz.easycode_auto_relock, tz.lock_sound_volume, tz.pincode_lock],
        meta: {pinCodeCount: 50},
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ['closuresDoorLock', 'genPowerCfg']);
            await reporting.lockState(endpoint);
            await reporting.batteryPercentageRemaining(endpoint);
            await endpoint.read('closuresDoorLock', ['lockState', 'soundVolume']);
            device.powerSource = 'Battery';
            device.save();
        },
        exposes: [e.lock(), e.battery(), e.sound_volume(),
            e.lock_action_source_name(), e.lock_action_user(),
            e.action(Array.from(Object.values(constants.easyCodeTouchActions))),
            exposes.binary('auto_relock', ea.STATE_SET, true, false).withDescription('Auto relock after 7 seconds.'),
            e.pincode(),
        ],
    },
    {
        zigbeeModel: ['S4RX-110'],
        model: 'S4RX-110',
        vendor: 'Onesti Products AS',
        description: 'Relax smart plug',
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.device_temperature, fz.identify],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.current(), e.voltage(), e.energy(), e.device_temperature()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(2);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genIdentify', 'genOnOff', 'genDeviceTempCfg',
                'haElectricalMeasurement', 'seMetering']);
            await reporting.onOff(endpoint);
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.activePower(endpoint);
            await reporting.rmsCurrent(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint);
            await reporting.deviceTemperature(endpoint);
        },
        endpoint: (device) => {
            return {default: 2};
        },
    },
];
