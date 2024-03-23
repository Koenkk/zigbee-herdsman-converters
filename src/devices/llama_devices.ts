import {Definition, Fz, ModernExtend} from '../lib/types';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';
import * as modernExtend from '../lib/modernExtend';

const e = exposes.presets;
const prefixEnpointName: string = 'button_';
const endpointCount = 4;

type Config = {
    cluster: string,
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
    cluster: 'genOnOffSwitchCfg',
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
    cluster: 'genOnOffSwitchCfg',
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

function mapModernEnum(cfg: Config, epName: string) {
    return modernExtend.enumLookup({
        name: cfg.name,
        lookup: mapObject(cfg.values, (k) => k.name, (v) => v.value),
        endpointName: epName,
        cluster: cfg.cluster,
        attribute: cfg.attribute,
        description: cfg.description,
        access: 'ALL',
        entityCategory: 'config',
    });
}

function addEndpointPrefix(ep: number) {
    return `${prefixEnpointName}${ep}`;
}

function createSwitchExpends(epc: number) {
    const features: ModernExtend[] = [];
    for (let ep = 1; ep <= epc; ep++) {
        for (let i = 0; i < configs.length; i++) {
            features.push(mapModernEnum(configs[i], addEndpointPrefix(ep)));
        }
    }
    return features;
}

function mapObject<T>(arr: T[], mapKey: (k: T) => string | [string], mapValue: (v: T) => string | number) {
    return Object.fromEntries(arr.map((el, i, arr) => [mapKey(el), mapValue(el)]));
}

const fzLocal = {
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

const definitions: Definition[] = [
    {
        zigbeeModel: ['Zucchini'],
        model: 'Zucchini',
        vendor: 'Llama Devices',
        description: 'On/Off output device',
        fromZigbee: [fzLocal.on_off_action],
        exposes: [
            e.action([]),
        ],
        extend: [
            modernExtend.battery(),
            modernExtend.temperature(),
            modernExtend.humidity(),
            ...createSwitchExpends(endpointCount),
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
            return mapObject(device.endpoints.filter((ep) => ep.supportsInputCluster('genOnOff')), (epk) => addEndpointPrefix(epk.ID), (epv) => epv.ID);
        },
        meta: {multiEndpoint: true, multiEndpointSkip: ['battery', 'temperature', 'humidity']},
    },
];

export default definitions;
module.exports = definitions;
