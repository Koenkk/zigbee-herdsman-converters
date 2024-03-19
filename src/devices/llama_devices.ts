import {Definition, Tz, Fz} from '../lib/types';
import fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';

const e = exposes.presets;
const ea = exposes.access;
const prefixEnpointName: string = 'button_';
const endpointCount = 4;

type Config = {
    attribute: string,
    name: string,
    description: string,
    values: ConfigValues[]
};
type ConfigValues = {
    name: string,
    value: number,
    command?: string
};
const switchTypeConf: Config = {
    attribute: 'switchType',
    name: 'switch_type',
    description: 'Operation method of the switch',
    values: [
        {
            name: 'toggle',
            value: 0,
        },
        // {
        //     name: 'momentary',
        //     value: 1
        // },
        {
            name: 'alternate',
            value: 2,
        },
    ],
};
const switchAtionConf: Config = {
    attribute: 'switchActions',
    name: 'switch_actions',
    description: 'Command to be generated when the switch moves between its two states',
    values: [
        {
            name: 'on/off',
            value: 0,
        },
        {
            name: 'off/on',
            value: 1,
        },
        {
            name: 'toggle',
            value: 2,
        },
    ],
};
const configs: Config[] = [
    switchTypeConf,
    switchAtionConf,
];

function addEndpointPrefix(ep: number) {
    return `${prefixEnpointName}${ep}`;
}

function createSwitchExposes(epc: number) {
    const feature: exposes.Enum[] = [];
    for (let i = 0; i < epc; i++) {
        configs.forEach((c) => {
            feature.push(e.enum(c.name, ea.ALL,
                c.values.map((v) => v.name))
                .withDescription(c.description)
                .withEndpoint(addEndpointPrefix(i + 1),
                ));
        });
    }
    return feature;
}

function mapObject<T>(arr: T[], mapKey: (k: T) => string | [string], mapValue: (v: T) => string | number) {
    return Object.fromEntries(arr.map((el, i, arr) => [mapKey(el), mapValue(el)]));
}

const fzLocal = {
    on_off_switch_config: {
        cluster: 'genOnOffSwitchCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return mapObject(
                configs,
                (k) => [`${k.name}_${addEndpointPrefix(msg.endpoint.ID)}`],
                (v) => {
                    const vv = v.values.find((vv) => vv.value == msg.data[v.attribute]);
                    return vv?.name;
                });
        },
    } satisfies Fz.Converter,
    on_off_action: {
        cluster: 'genOnOff',
        type: [
            'commandOn',
            'commandOff',
            'commandToggle',
            // 'commandOnWithTimedOff'
        ],
        convert: (model, msg, publish, options, meta) => {
            return {action: `${msg.endpoint.ID}_${msg.type.replace('command', '')}`};
        },
    } satisfies Fz.Converter,
};

const tzLocal = {
    on_off_switch_config: {
        key: ['switch_type', 'switch_actions'],
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOffSwitchCfg', configs.map((c) => c.attribute));
        },
        convertSet: async (entity, key, value, meta) => {
            const cfg = configs.find((c) => c.name == key);
            const ret = mapObject([cfg], (k) => k.attribute, (v) => v.values.find((v) => v.name == value).value);
            await entity.write('genOnOffSwitchCfg', ret);

            return {state: {[key]: value}};
        },
    } satisfies Tz.Converter,
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['Zucchini'],
        model: 'Zucchini',
        vendor: 'Llama Devices',
        description: 'On/Off output device',
        fromZigbee: [fzLocal.on_off_action, fz.battery, fz.temperature, fz.humidity, fzLocal.on_off_switch_config],
        toZigbee: [tzLocal.on_off_switch_config],
        exposes: [
            e.action([]),
            e.battery(),
            e.temperature(),
            e.humidity(),
            ...createSwitchExposes(endpointCount),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
            const ep1 = device.getEndpoint(1);
            await reporting.bind(ep1, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.bind(ep1, coordinatorEndpoint, ['msRelativeHumidity']);
            await reporting.bind(ep1, coordinatorEndpoint, ['msTemperatureMeasurement']);
            device.endpoints.filter((ep) => ep.ID != 242)
                .forEach(async (ep) => {
                    await ep.bind('genOnOff', coordinatorEndpoint);
                    await ep.read('genOnOffSwitchCfg', configs.map((c) => c.attribute));
                });
            await reporting.batteryPercentageRemaining(ep1, {min: 0, max: 3600, change: 0});
            await reporting.temperature(ep1, {min: 0, max: 3600, change: 0});
            await reporting.humidity(ep1, {min: 0, max: 3600, change: 0});
            device.save();
        },
        endpoint: (device) => {
            return mapObject(device.endpoints.filter((ep) => ep.ID != 242), (epk) => addEndpointPrefix(epk.ID), (epv) => epv.ID);
        },
        meta: {multiEndpoint: true, multiEndpointSkip: ['battery', 'temperature', 'humidity']},
    },
];

export default definitions;
module.exports = definitions;
