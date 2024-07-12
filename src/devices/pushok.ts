import {
    identify,
    onOff,
    temperature,
    binary,
    numeric,
    enumLookup,
    battery,
    humidity,
    illuminance,
    ota,
    EnumLookupArgs,
    NumericArgs,
} from '../lib/modernExtend';
import {Definition} from '../lib/types';

const pushokExtend = {
    valveStatus: (args?: Partial<EnumLookupArgs>) =>
        enumLookup({
            name: 'status',
            lookup: {OFF: 0, ON: 1, MOVING: 2, STUCK: 3},
            cluster: 'genMultistateInput',
            attribute: 'presentValue',
            zigbeeCommandOptions: {},
            description: 'Actual valve status',
            access: 'STATE_GET',
            reporting: null,
            ...args,
        }),
    stallTime: (args?: Partial<NumericArgs>) =>
        numeric({
            name: 'stall_time',
            cluster: 'genMultistateValue',
            attribute: 'presentValue',
            description: 'Timeout for state transition',
            unit: 's',
            access: 'ALL',
            valueMin: 0,
            valueMax: 60,
            valueStep: 1,
            reporting: null,
            ...args,
        }),
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['POK001'],
        model: 'POK001',
        vendor: 'PushOk Hardware',
        description: 'Battery powered retrofit valve',
        extend: [
            onOff({powerOnBehavior: false, configureReporting: false}),
            battery({percentage: true, voltage: true, lowStatus: true, percentageReporting: false}),
            pushokExtend.valveStatus(),
            identify({isSleepy: true}),
            enumLookup({
                name: 'kamikaze',
                lookup: {OFF: 0, ON: 1},
                cluster: 'genBinaryValue',
                attribute: 'presentValue',
                zigbeeCommandOptions: {},
                description: 'Allow operation on low battery (can destroy battery)',
                access: 'ALL',
                reporting: null,
            }),
            pushokExtend.stallTime(),
            enumLookup({
                name: 'battery_type',
                lookup: {LIION: 0, ALKALINE: 1, NIMH: 2},
                cluster: 'genMultistateOutput',
                attribute: 'presentValue',
                zigbeeCommandOptions: {},
                description: 'Battery type',
                access: 'ALL',
                reporting: null,
            }),
            numeric({
                name: 'end_lag',
                cluster: 'genAnalogValue',
                attribute: 'presentValue',
                description: 'Endstop lag angle (wrong value can cause damage)',
                unit: '°',
                access: 'ALL',
                valueMin: 0,
                valueMax: 15,
                valueStep: 1,
                reporting: null,
            }),
            ota(),
        ],
    },
    {
        zigbeeModel: ['POK002', 'POK007'],
        model: 'POK002_POK007',
        vendor: 'PushOk Hardware',
        description: 'Soil moisture and temperature sensor',
        extend: [
            humidity({reporting: null}),
            temperature({reporting: null}),
            battery({percentage: true, voltage: true, lowStatus: false, percentageReporting: false}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['POK003'],
        model: 'POK003',
        vendor: 'PushOk Hardware',
        description: 'Water level and temperature sensor',
        extend: [
            binary({
                name: 'contact',
                valueOn: ['ON', 0x01],
                valueOff: ['OFF', 0x00],
                cluster: 'genBinaryInput',
                attribute: 'presentValue',
                description: 'Indicates if the contact is closed (= true) or open (= false)',
                access: 'STATE_GET',
                reporting: null,
            }),
            temperature({reporting: null}),
            battery({percentage: true, voltage: true, lowStatus: false, percentageReporting: false}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['POK004'],
        model: 'POK004',
        vendor: 'PushOk Hardware',
        description: 'Solar powered zigbee router and illuminance sensor',
        extend: [illuminance({reporting: null}), battery({percentage: true, voltage: true, lowStatus: false, percentageReporting: false}), ota()],
    },
    {
        zigbeeModel: ['POK005'],
        model: 'POK005',
        vendor: 'PushOk Hardware',
        description: 'Temperature and Humidity sensor',
        extend: [
            humidity({reporting: null}),
            temperature({reporting: null}),
            battery({percentage: true, voltage: true, lowStatus: false, percentageReporting: false}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['POK006'],
        model: 'POK006',
        vendor: 'PushOk Hardware',
        description: 'Battery powered garden valve',
        extend: [
            onOff({powerOnBehavior: false, configureReporting: false}),
            battery({percentage: true, voltage: true, lowStatus: true, percentageReporting: false}),
            pushokExtend.valveStatus(),
            identify({isSleepy: true}),
            pushokExtend.stallTime(),
            ota(),
        ],
    },
    {
        zigbeeModel: ['POK008'],
        model: 'POK008',
        vendor: 'PushOk Hardware',
        description: 'Battery powered thermostat relay',
        extend: [
            onOff({powerOnBehavior: false, configureReporting: false}),
            battery({percentage: true, voltage: true, lowStatus: false, percentageReporting: false}),
            temperature({reporting: null}),
            numeric({
                name: 'tgt_temperature',
                cluster: 'genAnalogOutput',
                attribute: 'presentValue',
                description: 'Target temperature',
                unit: 'C',
                access: 'ALL',
                valueMin: -40,
                valueMax: 90,
                valueStep: 1,
                reporting: null,
            }),
            numeric({
                name: 'hysteresis',
                cluster: 'genAnalogValue',
                attribute: 'presentValue',
                description: 'Temperature hysteresis',
                unit: 'C',
                access: 'ALL',
                valueMin: 0.1,
                valueMax: 40,
                valueStep: 0.1,
                reporting: null,
            }),
            enumLookup({
                name: 'set_op_mode',
                lookup: {Monitor: 0, Heater: 1, Cooler: 2},
                cluster: 'genMultistateOutput',
                attribute: 'presentValue', //Zcl.Clusters.genBinaryValue.attributes.presentValue,
                zigbeeCommandOptions: {},
                description: 'Operation mode',
                access: 'ALL',
                reporting: null,
            }),
            ota(),
        ],
    },
    {
        zigbeeModel: ['POK011'],
        model: 'POK011',
        vendor: 'PushOk Hardware',
        description: 'Illuminance sensor',
        extend: [illuminance({reporting: null}), battery({percentage: true, voltage: true, lowStatus: false, percentageReporting: false}), ota()],
    },
];

export default definitions;
module.exports = definitions;
