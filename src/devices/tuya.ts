const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const modernExtend = require('zigbee-herdsman-converters/lib/modernExtend');
const e = exposes.presets;
const ea = exposes.access;
const tuya = require('zigbee-herdsman-converters/lib/tuya');

const definition = {

fingerprint: [
        {
            // The model ID from: Device with modelID 'TS0601' is not supported
            // You may need to add \u0000 at the end of the name in some cases
            modelID: 'TS0601',
            // The manufacturer name from: Device with modelID 'TS0601' is not supported.
            manufacturerName: '_TZE204_kobbcyum',
        },
    ],
    
    model: 'TOWSMR1',
    vendor: 'Tongou',
    description: 'Single-phase multifunction energy meter (DIN Module)',
    fromZigbee: [tuya.fz.datapoints],
    toZigbee: [tuya.tz.datapoints],
    // Important: respondToMcuVersionResponse should be false otherweise there are an avalanche of commandMcuVersionResponse messages every second.
    // queryIntervalSeconds: is doing a pooling to update device's parameters, now define to update data every 3 minutes.
    onEvent: tuya.onEvent({respondToMcuVersionResponse: false, queryIntervalSeconds: 10}),
    configure: tuya.configureMagicPacket,
    exposes: [
        tuya.exposes.switch(),
        e.energy(),
        e.power(),
        e.voltage(),
        e.current(),
        e.temperature(),
        e.enum('last_event', ea.STATE, [])
            .withDescription('Last event'),
        e.numeric('leakage_current', ea.STATE).withUnit('mA').withDescription('Leakage current is current that flows from an electrical circuit to the ground'),
        e.enum('leakage_setting', ea.STATE_SET, ['closed', 'alarm', 'trip']).withDescription('Action if threshold value is reached - USE WITH CAUTION - RISK LIFE !!'),
        e
            .numeric('leakage_threshold', ea.STATE_SET)
            .withValueMin(30)
            .withValueMax(300)
            .withValueStep(1)
            .withUnit('mA')
            .withDescription('leakage threshold setting - USE WITH CAUTION - RISK LIFE !! (default=30mA)'),
        e.enum('over_current_setting', ea.STATE_SET, ['closed', 'alarm', 'trip']).withDescription('Action if threshold value is reached'),
        e
            .numeric('current_threshold', ea.STATE_SET)
            .withValueMin(1)
            .withValueMax(40)
            .withValueStep(1)
            .withUnit('A')
            .withDescription('Current threshold setting'),
        e.enum('under_voltage_setting', ea.STATE_SET, ['closed', 'alarm', 'trip']).withDescription('Action if threshold value is reached'),
        e
            .numeric('under_voltage_threshold', ea.STATE_SET)
            .withValueMin(145)
            .withValueMax(220)
            .withValueStep(1)
            .withUnit('V')
            .withDescription('Under voltage threshold setting'),
        e.enum('over_voltage_setting', ea.STATE_SET, ['closed', 'alarm', 'trip']).withDescription('Action if threshold value is reached'),
        e
            .numeric('over_voltage_threshold', ea.STATE_SET)
            .withValueMin(245)
            .withValueMax(295)
            .withValueStep(1)
            .withUnit('V')
            .withDescription('Over-voltage threshold setting'),
        e.enum('over_power_setting', ea.STATE_SET, ['closed', 'alarm', 'trip']).withDescription('Action if threshold value is reached'),
        e
            .numeric('over_power_threshold', ea.STATE_SET)
            .withValueMin(5)
            .withValueMax(25000)
            .withValueStep(100)
            .withUnit('W')
            .withDescription('Over-power threshold setting'),
        e.enum('temperature_setting', ea.STATE_SET, ['closed', 'alarm', 'trip']).withDescription('Action if threshold value is reached'),
        e
            .numeric('temperature_threshold', ea.STATE_SET)
            .withValueMin(-40)
            .withValueMax(100)
            .withValueStep(1)
            .withUnit('°C')
            .withDescription('Temperature threshold setting'),
        e.binary('clear_fault', ea.STATE_SET, 'ON', 'OFF').withLabel('Auto-Reclosing').withDescription('When the circuit breaker trips due to voltage protection, it will automatically close when the circuit voItage returns to normal.(Note: For safety reasons, this function only applies to trips caused by voltage)'),
        e.binary('factory_reset', ea.STATE_SET, 'ON', 'OFF').withDescription('Back to factory settings, USE WITH CAUTION'),
    ],
    meta: {
        tuyaDatapoints: [
            [1, 'energy', tuya.valueConverter.divideBy100],
            [6, null, tuya.valueConverter.phaseVariant2],
            [15, 'leakage_current', tuya.valueConverter.raw],
            [16, 'state', tuya.valueConverter.onOff],
            [102, 'over_voltage_setting', tuya.valueConverterBasic.lookup({closed: tuya.enum(0), alarm: tuya.enum(1), trip: tuya.enum(2)})],
            [103, 'under_voltage_setting', tuya.valueConverterBasic.lookup({closed: tuya.enum(0), alarm: tuya.enum(1), trip: tuya.enum(2)})],
            [104, 'over_current_setting', tuya.valueConverterBasic.lookup({closed: tuya.enum(0), alarm: tuya.enum(1), trip: tuya.enum(2)})],
            [105, 'over_power_setting', tuya.valueConverterBasic.lookup({closed: tuya.enum(0), alarm: tuya.enum(1), trip: tuya.enum(2)})],
            [107, 'temperature_setting', tuya.valueConverterBasic.lookup({closed: tuya.enum(0), alarm: tuya.enum(1), trip: tuya.enum(2)})],
            [108, 'leakage_setting', tuya.valueConverterBasic.lookup({closed: tuya.enum(0), alarm: tuya.enum(1), trip: tuya.enum(2)})],
            //[109, 'online_state, unknown, I have not seen any message from this DP],
            [
                110,
                'last_event',
                tuya.valueConverterBasic.lookup({
                    'Normal': tuya.enum(0),
                    'Trip Over Current': tuya.enum(1),
                    'Trip Over Power': tuya.enum(2),
                    'Trip Over Temperature': tuya.enum(3),
                    'Trip Voltage 1': tuya.enum(4),
                    'Trip Voltage 2': tuya.enum(5),
                    'Alarm Over Current': tuya.enum(6),
                    'Alarm Over Power': tuya.enum(7),
                    'Alarm Over Temperature': tuya.enum(8),
                    'Alarm Voltage 1': tuya.enum(9),
                    'Alarm Voltage 2': tuya.enum(10),
                    'Remote On': tuya.enum(11),
                    'Remote Off': tuya.enum(12),
                    'Manual On': tuya.enum(13),
                    'Manual Off': tuya.enum(14),
                    'Value 15': tuya.enum(15),
                    'Value 16': tuya.enum(16),
                    'Factory Reset': tuya.enum(17),
                }),
            ],
            [112, 'clear_fault', tuya.valueConverter.onOff],
            [113, 'factory_reset', tuya.valueConverter.raw],
            [114, 'current_threshold', tuya.valueConverter.raw],
            [115, 'over_voltage_threshold', tuya.valueConverter.raw],
            [116, 'under_voltage_threshold', tuya.valueConverter.raw],
            [117, 'leakage_threshold', tuya.valueConverter.raw],
            [118, 'temperature_threshold', tuya.valueConverter.divideBy10],
            [119, 'over_power_threshold', tuya.valueConverter.raw],
            [131, 'temperature', tuya.valueConverter.divideBy10],
        ],
    },
};

module.exports = definition;
