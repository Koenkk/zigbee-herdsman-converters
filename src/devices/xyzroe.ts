
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import * as legacy from '../lib/legacy';
import tz from '../converters/toZigbee';
import {Definition, Tz, Fz, KeyValueAny} from '../lib/types';
import * as utils from '../lib/utils';
const e = exposes.presets;
const ea = exposes.access;

const buttonModesList = {
    'single click': 0x01,
    'multi click': 0x02,
};

const inputLinkList = {
    no: 0x00,
    yes: 0x01,
};

const bindCommandList = {
    'on/off': 0x00,
    'toggle': 0x01,
    'change_level_up': 0x02,
    'change_level_down': 0x03,
    'change_level_up_with_off': 0x04,
    'change_level_down_with_off': 0x05,
    'recall_scene_0': 0x06,
    'recall_scene_1': 0x07,
    'recall_scene_2': 0x08,
    'recall_scene_3': 0x09,
    'recall_scene_4': 0x0A,
    'recall_scene_5': 0x0B,
};

function getSortedList(source: { [key: string]: number }): string[] {
    const keysSorted: [string, number][] = [];

    for (const key in source) {
        if (key != null) {
            keysSorted.push([key, source[key]]);
        }
    }

    keysSorted.sort((a, b) => {
        return a[1] - b[1];
    });

    const result: string[] = [];
    keysSorted.forEach((item) => {
        result.push(item[0]);
    });

    return result;
}

const tzLocal = {
    zigusb_button_config: {
        key: ['button_mode', 'link_to_output', 'bind_command'],
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOffSwitchCfg', ['buttonMode', 0x4001, 0x4002]);
        },
        convertSet: async (entity, key, value, meta) => {
            let payload;
            let data;
            switch (key) {
            case 'button_mode':
                data = utils.getFromLookup(value, buttonModesList);
                payload = {buttonMode: data};
                break;
            case 'link_to_output':
                data = utils.getFromLookup(value, inputLinkList);
                payload = {0x4001: {value: data, type: 32 /* uint8 */}};
                break;
            case 'bind_command':
                data = utils.getFromLookup(value, bindCommandList);
                payload = {0x4002: {value: data, type: 32 /* uint8 */}};
                break;
            }
            await entity.write('genOnOffSwitchCfg', payload);
        },
    } satisfies Tz.Converter,
    zigusb_on_off_invert: {
        key: ['state', 'on_time', 'off_wait_time'],
        convertSet: async (entity, key, value, meta) => {
            const state = utils.isString(meta.message.state) ? meta.message.state.toLowerCase() : null;
            utils.validateValue(state, ['toggle', 'off', 'on']);

            if (state === 'on' && (meta.message.hasOwnProperty('on_time') || meta.message.hasOwnProperty('off_wait_time'))) {
                const onTime = meta.message.hasOwnProperty('on_time') ? meta.message.on_time : 0;
                const offWaitTime = meta.message.hasOwnProperty('off_wait_time') ? meta.message.off_wait_time : 0;

                if (typeof onTime !== 'number') {
                    throw Error('The on_time value must be a number!');
                }
                if (typeof offWaitTime !== 'number') {
                    throw Error('The off_wait_time value must be a number!');
                }

                const payload = {ctrlbits: 0, ontime: Math.round(onTime * 10), offwaittime: Math.round(offWaitTime * 10)};
                await entity.command('genOnOff', 'onWithTimedOff', payload, utils.getOptions(meta.mapped, entity));
            } else {
                if (state === 'toggle') {
                    await entity.command('genOnOff', state, {}, utils.getOptions(meta.mapped, entity));
                    const currentState = meta.state[`state${meta.endpoint_name ? `_${meta.endpoint_name}` : ''}`];
                    return currentState ? {state: {state: currentState === 'OFF' ? 'OFF' : 'ON'}} : {};
                } else {
                    await entity.command('genOnOff', state === 'off' ? 'on' : 'off', {}, utils.getOptions(meta.mapped, entity));
                    return {state: {state: state === 'off' ? 'OFF' : 'ON'}};
                }
            }
        },
        convertGet: async (entity, key, meta) => {
            await entity.read('genOnOff', ['onOff']);
        },
    } satisfies Tz.Converter,
    zigusb_restart_interval: {
        key: ['restart', 'interval'],
        convertSet: async (entity, key, value, meta) => {
            utils.assertNumber(value, key);
            utils.assertEndpoint(entity);
            if (key === 'restart') {
                await entity.command('genOnOff', 'onWithTimedOff', {ctrlbits: 0, ontime: Math.round(value*10), offwaittime: 0});
                return {state: {[key]: value}};
            } else if (key === 'interval') {
                await entity.configureReporting('genOnOff', [{
                    attribute: 'onOff',
                    minimumReportInterval: value,
                    maximumReportInterval: value,
                    reportableChange: 0,
                }]);
                return {state: {[key]: value}};
            }
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    zigusb_button_config: {
        cluster: 'genOnOffSwitchCfg',
        type: ['readResponse', 'attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            const channel = utils.getKey(model.endpoint(msg.device), msg.endpoint.ID);
            const {buttonMode} = msg.data;
            const inputLink = msg.data[0x4001];
            const bindCommand = msg.data[0x4002];
            return {
                [`button_mode_${channel}`]: utils.getKey(buttonModesList, buttonMode),
                [`link_to_output_${channel}`]: utils.getKey(inputLinkList, inputLink),
                [`bind_command_${channel}`]: utils.getKey(bindCommandList, bindCommand),
            };
        },
    } satisfies Fz.Converter,
    zigusb_analog_input: {
        cluster: 'genAnalogInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const payload: KeyValueAny = {};
            const channel = msg.endpoint.ID;
            const name = `l${channel}`;
            payload[name] = utils.precisionRound(msg.data['presentValue'], 3);
            if (channel === 5) {
                payload['uptime' + '_' + name] = utils.precisionRound(msg.data['presentValue'], 3);
            } else if (msg.data.hasOwnProperty('description')) {
                const data1 = msg.data['description'];
                if (data1) {
                    const data2 = data1.split(',');
                    const devid = data2[1];
                    const unit = data2[0];
                    if (devid) {
                        payload['device_' + name] = devid;
                    }

                    const valRaw = msg.data['presentValue'];
                    if (unit) {
                        let val = utils.precisionRound(valRaw, 1);

                        const nameLookup: KeyValueAny = {
                            'C': 'temperature',
                            'V': 'voltage',
                            'A': 'current',
                            'W': 'power',
                        };

                        let nameAlt = '';
                        if (unit === 'A') {
                            if (valRaw < 1) {
                                val = utils.precisionRound(valRaw, 3);
                            } else {
                                val = utils.precisionRound(valRaw, 2);
                            }
                        }
                        nameAlt = nameLookup[unit];

                        if (nameAlt === undefined) {
                            const valueIndex = parseInt(unit, 10);
                            if (! isNaN(valueIndex)) {
                                nameAlt = 'val' + unit;
                            }
                        }

                        if (nameAlt !== undefined) {
                            payload[nameAlt + '_' + name] = val;
                        }
                    }
                }
            }
            return payload;
        },
    } satisfies Fz.Converter,
    zigusb_on_off_invert: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (msg.data.hasOwnProperty('onOff')) {
                const payload: KeyValueAny = {};
                const endpointName = model.hasOwnProperty('endpoint') ?
                    utils.getKey(model.endpoint(meta.device), msg.endpoint.ID) : msg.endpoint.ID;
                const state = msg.data['onOff'] === 1 ? 'OFF' : 'ON';
                payload[`state_${endpointName}`] = state;
                return payload;
            }
        },
    } satisfies Fz.Converter,
};


function zigusbBtnConfigExposes(epName: string) {
    const features = [];
    features.push(e.enum('button_mode', exposes.access.ALL,
        getSortedList(buttonModesList)).withEndpoint(epName));
    features.push(e.enum('link_to_output', exposes.access.ALL,
        getSortedList(inputLinkList)).withEndpoint(epName));
    features.push(e.enum('bind_command', exposes.access.ALL,
        getSortedList(bindCommandList)).withEndpoint(epName));
    return features;
}

const definitions: Definition[] = [
    {
        zigbeeModel: ['ZigUSB'],
        model: 'ZigUSB',
        vendor: 'xyzroe',
        description: 'Zigbee USB power monitor and switch',
        fromZigbee: [fz.ignore_basic_report, fzLocal.zigusb_on_off_invert, fzLocal.zigusb_analog_input, fz.temperature,
            fz.ptvo_multistate_action, legacy.fz.ptvo_switch_buttons, fzLocal.zigusb_button_config],
        toZigbee: [tzLocal.zigusb_restart_interval, tzLocal.zigusb_on_off_invert, tz.ptvo_switch_analog_input, tzLocal.zigusb_button_config],
        exposes: [e.switch().withEndpoint('l1'),
            e.numeric('restart', ea.SET).withEndpoint('l1').withValueMin(1).withValueMax(30).withValueStep(1)
                .withDescription('OFF time').withUnit('seconds'),
            ...zigusbBtnConfigExposes('l1'),
            e.action(['single', 'double', 'triple'])
                .withDescription('Single click works only with NO link to output'),
            e.current().withAccess(ea.STATE).withEndpoint('l2'),
            e.voltage().withAccess(ea.STATE).withEndpoint('l2'),
            e.power().withAccess(ea.STATE).withEndpoint('l2'),
            e.numeric('interval', ea.SET).withEndpoint('l2').withValueMin(1).withValueMax(3600).withValueStep(1)
                .withDescription('Reporting interval').withUnit('sec'),
            e.cpu_temperature().withProperty('temperature').withEndpoint('l4'),
            e.numeric('uptime', ea.STATE).withEndpoint('l5').withDescription('CC2530').withUnit('seconds')],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2, l4: 4, l5: 5};
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read('genBasic', ['modelId', 'swBuildId', 'powerSource']);
        },
    },

];

export default definitions;
module.exports = definitions;
