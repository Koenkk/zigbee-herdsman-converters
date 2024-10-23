import * as exposes from '../lib/exposes';
import {
    battery,
    electricityMeter,
    iasZoneAlarm,
    light,
    onOff,
    setupConfigureForBinding,
    setupConfigureForReading,
    setupConfigureForReporting,
} from '../lib/modernExtend';
import * as globalStore from '../lib/store';
import {Configure, DefinitionWithExtend, Expose, Fz, ModernExtend, OnEvent} from '../lib/types';

const e = exposes.presets;

function airQuality(): ModernExtend {
    const exposes: Expose[] = [e.temperature(), e.humidity(), e.voc().withUnit('ppb'), e.eco2()];

    const fromZigbee: Fz.Converter[] = [
        {
            cluster: 'msTemperatureMeasurement',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const temperature = parseFloat(msg.data['measuredValue']) / 100.0;
                const humidity = parseFloat(msg.data['minMeasuredValue']) / 100.0;
                const eco2 = parseFloat(msg.data['maxMeasuredValue']);
                const voc = parseFloat(msg.data['tolerance']);
                return {temperature, humidity, eco2, voc};
            },
        },
    ];

    return {exposes, fromZigbee, isModernExtend: true};
}

function electricityMeterPoll(): ModernExtend {
    const configure: Configure[] = [
        setupConfigureForBinding('haElectricalMeasurement', 'input'),
        setupConfigureForReading('haElectricalMeasurement', [
            'acVoltageMultiplier',
            'acVoltageDivisor',
            'acCurrentMultiplier',
            'acCurrentDivisor',
            'acPowerMultiplier',
            'acPowerDivisor',
        ]),
        setupConfigureForReading('seMetering', ['multiplier', 'divisor']),
        setupConfigureForReporting('seMetering', 'currentSummDelivered', {min: '5_SECONDS', max: '1_HOUR', change: 257}, exposes.access.STATE_GET),
    ];

    const onEvent: OnEvent = async (type, data, device) => {
        // This device doesn't support reporting correctly.
        // https://github.com/Koenkk/zigbee-herdsman-converters/pull/1270
        const endpoint = device.getEndpoint(1);
        if (type === 'stop') {
            clearInterval(globalStore.getValue(device, 'interval'));
            globalStore.clearValue(device, 'interval');
        } else if (!globalStore.hasValue(device, 'interval')) {
            const interval = setInterval(async () => {
                try {
                    await endpoint.read('haElectricalMeasurement', ['rmsVoltage', 'rmsCurrent', 'activePower']);
                    await endpoint.read('seMetering', ['currentSummDelivered', 'multiplier', 'divisor']);
                } catch {
                    // Do nothing
                }
            }, 10 * 1000); // Every 10 seconds
            globalStore.putValue(device, 'interval', interval);
        }
    };

    return {configure, onEvent, isModernExtend: true};
}

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['Leak_Sensor'],
        model: 'MCLH-07',
        vendor: 'LifeControl',
        description: 'Water leakage sensor',
        extend: [
            iasZoneAlarm({zoneType: 'water_leak', zoneAttributes: ['alarm_1', 'tamper', 'battery_low']}),
            battery({dontDividePercentage: true, percentageReporting: false}),
        ],
    },
    {
        zigbeeModel: ['Door_Sensor'],
        model: 'MCLH-04',
        vendor: 'LifeControl',
        description: 'Open and close sensor',
        extend: [
            iasZoneAlarm({zoneType: 'contact', zoneAttributes: ['alarm_1', 'tamper', 'battery_low']}),
            battery({dontDividePercentage: true, percentageReporting: false}),
        ],
    },
    {
        zigbeeModel: ['vivi ZLight'],
        model: 'MCLH-02',
        vendor: 'LifeControl',
        description: 'Smart light bulb',
        extend: [light({colorTemp: {range: [167, 333]}, color: true})],
    },
    {
        zigbeeModel: ['RICI01'],
        model: 'MCLH-03',
        vendor: 'LifeControl',
        description: 'Smart socket',
        extend: [onOff({powerOnBehavior: false}), electricityMeter({configureReporting: false}), electricityMeterPoll()],
    },
    {
        zigbeeModel: ['Motion_Sensor'],
        model: 'MCLH-05',
        vendor: 'LifeControl',
        description: 'Motion sensor',
        extend: [
            iasZoneAlarm({zoneType: 'occupancy', zoneAttributes: ['alarm_1', 'tamper', 'battery_low']}),
            battery({dontDividePercentage: true, percentageReporting: false}),
        ],
    },
    {
        zigbeeModel: ['VOC_Sensor'],
        model: 'MCLH-08',
        vendor: 'LifeControl',
        description: 'Air quality sensor',
        extend: [airQuality(), battery({dontDividePercentage: true, percentageReporting: false})],
    },
];

export default definitions;
module.exports = definitions;
