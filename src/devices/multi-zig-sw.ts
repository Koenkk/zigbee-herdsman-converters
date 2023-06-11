import fz from '../converters/fromZigbee';
import {Definition, Fz, Tz} from '../lib/types';
import * as exposes from '../lib/exposes';
const e = exposes.presets;

const switchTypesList = {
    'switch': 0x00,
    'multi-click': 0x02,
};

type Dictionary<T> = {
    [key: string]: T;
};

const getKey = (object: Dictionary<number>, value: number) => Object.keys(object).find((key) => object[key] === value);

const getListValueByKey = (source: Dictionary<number>, value: string) => source.hasOwnProperty(value) ? source[value] : parseInt(value, 10);

const switchTypeExposes = (epName: string) => [e.enum('switch_type', exposes.access.ALL, Object.keys(switchTypesList)).withEndpoint(epName)];

const fzLocal: { [key: string]: Fz.Converter } = {
    multi_zig_sw_battery: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const voltage = msg.data['batteryVoltage'] * 100;
            const battery = (voltage - 2200) / 8;

            return {
                battery: battery > 100 ? 100 : battery,
                voltage: voltage,
            };
        },
    },
    switch_buttons: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const button = getKey(model.endpoint?.(msg.device) ?? {}, msg.endpoint.ID);
            const actionLookup: Dictionary<string> = {0: 'release', 1: 'single', 2: 'double', 3: 'triple', 4: 'hold'};
            const value = msg.data['presentValue'];
            const action = actionLookup[value];

            return {
                action: button + '_' + action,
            };
        },
    },
    switch_config: {
        cluster: 'genOnOffSwitchCfg',
        type: ['readResponse', 'attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            const channel = getKey(model.endpoint?.(msg.device) ?? {}, msg.endpoint.ID);
            const {switchType} = msg.data;

            return {
                [`switch_type_${channel}`]: getKey(switchTypesList, switchType),
            };
        },
    },
};

const tzLocal: { [key: string]: Tz.Converter } = {
    switch_type: {
        key: ['switch_type'],
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOffSwitchCfg', ['switchType']);
        },
        convertSet: async (entity, key, value, meta) => {
            if (key == 'switch_type') {
                const data = getListValueByKey(switchTypesList, value as string);
                const payload = {switchType: data};

                await entity.write('genOnOffSwitchCfg', payload);
            }

            return {state: {[`${key}`]: value}};
        },
    },
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['MULTI-ZIG-SW'],
        model: 'MULTI-ZIG-SW',
        vendor: 'smarthjemmet.dk',
        description: '[Multi switch from Smarthjemmet.dk](https://smarthjemmet.dk)',
        fromZigbee: [fz.ignore_basic_report, fzLocal.switch_buttons, fzLocal.multi_zig_sw_battery, fzLocal.switch_config],
        toZigbee: [tzLocal.switch_type],
        exposes: [
            ...switchTypeExposes('button_1'),
            ...switchTypeExposes('button_2'),
            ...switchTypeExposes('button_3'),
            ...switchTypeExposes('button_4'),
            e.battery(),
            e.action(['single', 'double', 'triple', 'hold', 'release']),
            e.battery_voltage(),
        ],
        meta: {
            multiEndpoint: true,
        },
        endpoint: (device) => {
            return {
                button_1: 1,
                button_2: 2,
                button_3: 3,
                button_4: 4,
            };
        },
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', ['modelId', 'swBuildId', 'powerSource']);
        },
    }];

module.exports = definitions;
