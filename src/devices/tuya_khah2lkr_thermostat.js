const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const tuya = require('zigbee-herdsman-converters/lib/tuya');
const e = exposes.presets;
const ea = exposes.access;

const modeLookup = {
    from: (v) => {
        const map = {
            0: 'manual',
            1: 'auto',
            3: 'hybrid',
        };
        return map[v] !== undefined ? map[v] : `unknown (${v})`;
    },
    to: (v) => {
        const map = {
            'manual': 0,
            'auto': 1,
            'hybrid': 3,
        };
        return map[v];
    },
};

module.exports = [
    {
        fingerprint: [
            {modelID: 'TS0601', manufacturerName: '_TZE200_khah2lkr'},
        ],
        model: 'HY607W_3A',
        vendor: 'Tuya',
        description: 'Tuya Smartica HY607W thermostat (3A)',
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [tuya.tz.datapoints],
        configure: tuya.configureMagicPacket,
        exposes: [
            e.climate()
                .withLocalTemperature(ea.STATE)
                .withSetpoint('occupied_heating_setpoint', 5, 35, 0.5, ea.STATE_SET),
            e.enum('mode_state', ea.STATE, ['auto', 'manual', 'hybrid'])
                .withDescription('Show only thermostat state'),
            e.enum('force_manual_mode', ea.STATE_SET, ['manual'])
                .withDescription('Set thermostat state to manual (no other state changes work)'),
            e.binary('state', ea.STATE_SET, 'ON', 'OFF')
                .withDescription('ON/OFF thermostat'),
            e.enum('running_state', ea.STATE, ['idle', 'heat'])
                .withDescription('State of heating'),
        ],
        meta: {
            tuyaDatapoints: [
                [16, 'local_temperature', tuya.valueConverter.divideBy10],
                [50, 'occupied_heating_setpoint', tuya.valueConverter.divideBy10],
                [125, 'state', tuya.valueConverter.onOff],
                [128, 'mode_state', modeLookup],
                [128, 'force_manual_mode', { to: (v) => 0 }],
                [102, 'running_state', {
                    from: (v) => v === true ? 'heat' : 'idle',
                }],
            ],
        },
    },
];
