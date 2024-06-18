import {Zcl} from 'zigbee-herdsman';
import * as exposes from '../lib/exposes';
import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as constants from '../lib/constants';
import * as reporting from '../lib/reporting';
import {
    binary, enumLookup, forcePowerSource, numeric, onOff,
    customTimeResponse, battery, ota, deviceAddCustomCluster,
    temperature, humidity, bindCluster,
    iasZoneAlarm,
} from '../lib/modernExtend';
import {Definition, Fz, KeyValue, KeyValueAny, ModernExtend, Tz} from '../lib/types';
import * as utils from '../lib/utils';
import {logger} from '../lib/logger';
import {modernExtend as ewelinkModernExtend} from '../lib/ewelink';
const {ewelinkAction} = ewelinkModernExtend;

const NS = 'zhc:sonoff';
const manufacturerOptions = {
    manufacturerCode: Zcl.ManufacturerCode.SHENZHEN_COOLKIT_TECHNOLOGY_CO_LTD,
    disableDefaultResponse: false,
};
const defaultResponseOptions = {disableDefaultResponse: false};
const e = exposes.presets;
const ea = exposes.access;

const fzLocal = {
    router_config: {
        cluster: 'genLevelCtrl',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {};
            if (msg.data.hasOwnProperty('currentLevel')) {
                result.light_indicator_level = msg.data['currentLevel'];
            }
        },
    } satisfies Fz.Converter,
};

const sonoffExtend = {
    addCustomClusterEwelink: () => deviceAddCustomCluster(
        'customClusterEwelink',
        {
            ID: 0xfc11,
            attributes: {
                radioPower: {ID: 0x0012, type: Zcl.DataType.INT16},
                radioPowerWithManuCode: {
                    ID: 0x0012,
                    type: Zcl.DataType.INT16,
                    manufacturerCode: Zcl.ManufacturerCode.SHENZHEN_COOLKIT_TECHNOLOGY_CO_LTD,
                },
                delayedPowerOnState: {ID: 0x0014, type: Zcl.DataType.BOOLEAN},
                delayedPowerOnTime: {ID: 0x0015, type: Zcl.DataType.UINT16},
                externalTriggerMode: {ID: 0x0016, type: Zcl.DataType.UINT8},
                detachRelayMode: {ID: 0x0017, type: Zcl.DataType.BOOLEAN},
            },
            commands: {
                protocolData: {ID: 0x01, parameters: [{name: 'data', type: Zcl.BuffaloZclDataType.LIST_UINT8}]},
            },
            commandsResponse: {},
        },
    ),
    inchingControlSet: (): ModernExtend => {
        const clusterName = 'customClusterEwelink';
        const commandName = 'protocolData';
        const exposes = e.composite('inching_control_set', 'inching_control_set', ea.SET)
            .withDescription('Device Inching function Settings. The device will automatically turn off (turn on) '+
            'after each turn on (turn off) for a specified period of time.')
            .withFeature(e.binary('inching_control', ea.SET, 'ENABLE', 'DISABLE').withDescription('Enable/disable inching function.'))
            .withFeature(e.numeric('inching_time', ea.SET).withDescription('Delay time for executing a inching action.')
                .withUnit('seconds').withValueMin(0.5).withValueMax(3599.5).withValueStep(0.5))
            .withFeature(e.binary('inching_mode', ea.SET, 'ON', 'OFF').withDescription('Set inching off or inching on mode.').withValueToggle('ON'));
        const fromZigbee: Fz.Converter[] = [];
        const toZigbee: Tz.Converter[] = [{
            key: ['inching_control_set'],
            convertSet: async (entity, key, value, meta) => {
                const inchingControl:string = 'inching_control';
                const inchingTime:string = 'inching_time';
                const inchingMode:string = 'inching_mode';

                const tmpTime = Number((Math.round(Number((value[inchingTime as keyof typeof value] * 2).toFixed(1)))).toFixed(1));

                const payloadValue = [];
                payloadValue[0] = 0x01; // Cmd
                payloadValue[1] = 0x17; // SubCmd
                payloadValue[2] = 0x07; // Length
                payloadValue[3] = 0x80; // SeqNum

                payloadValue[4] = 0x00; // Mode
                if (value[inchingControl as keyof typeof value] != 'DISABLE') {
                    payloadValue[4] |= 0x80;
                }
                if (value[inchingMode as keyof typeof value] != 'OFF') {
                    payloadValue[4] |= 0x01;
                }

                payloadValue[5] = 0x00; // Channel

                payloadValue[6] = tmpTime; // Timeout
                payloadValue[7] = tmpTime >> 8;

                payloadValue[8] = 0x00; // Reserve
                payloadValue[9] = 0x00;

                payloadValue[10] = 0x00; // CheckCode
                for (let i = 0; i < (payloadValue[2] + 3); i++) {
                    payloadValue[10] ^= payloadValue[i];
                }

                await entity.command(
                    clusterName,
                    commandName,
                    {data: payloadValue},
                    {manufacturerCode: Zcl.ManufacturerCode.SHENZHEN_COOLKIT_TECHNOLOGY_CO_LTD},
                );
                return {state: {[key]: value}};
            },
        }];
        return {
            exposes: [exposes],
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    weeklySchedule: (): ModernExtend => {
        const exposes = e.composite('schedule', 'weekly_schedule', ea.STATE_SET)
            .withDescription('The preset heating schedule to use when the system mode is set to "auto" (indicated with ⏲ on the TRV). ' +
                'Up to 6 transitions can be defined per day, where a transition is expressed in the format \'HH:mm/temperature\', each ' +
                'separated by a space. The first transition for each day must start at 00:00 and the valid temperature range is 4-35°C ' +
                '(in 0.5°C steps). The temperature will be set at the time of the first transition until the time of the next transition, ' +
                'e.g. \'04:00/20 10:00/25\' will result in the temperature being set to 20°C at 04:00 until 10:00, when it will change to 25°C.')
            .withFeature(e.text('sunday', ea.STATE_SET))
            .withFeature(e.text('monday', ea.STATE_SET))
            .withFeature(e.text('tuesday', ea.STATE_SET))
            .withFeature(e.text('wednesday', ea.STATE_SET))
            .withFeature(e.text('thursday', ea.STATE_SET))
            .withFeature(e.text('friday', ea.STATE_SET))
            .withFeature(e.text('saturday', ea.STATE_SET));

        const fromZigbee: Fz.Converter[] = [{
            cluster: 'hvacThermostat',
            type: ['commandGetWeeklyScheduleRsp'],
            convert: (model, msg, publish, options, meta) => {
                const day = Object.entries(constants.thermostatDayOfWeek)
                    .find((d) => msg.data.dayofweek & 1<<+d[0])[1];

                const transitions = msg.data.transitions
                    .map((t: { heatSetpoint: number, transitionTime: number }) => {
                        const totalMinutes = t.transitionTime;
                        const hours = totalMinutes / 60;
                        const rHours = Math.floor(hours);
                        const minutes = (hours - rHours) * 60;
                        const rMinutes = Math.round(minutes);
                        const strHours = rHours.toString().padStart(2, '0');
                        const strMinutes = rMinutes.toString().padStart(2, '0');

                        return `${strHours}:${strMinutes}/${t.heatSetpoint / 100}`;
                    })
                    .sort()
                    .join(' ');

                return {
                    weekly_schedule: {
                        ...meta.state.weekly_schedule as Record<string, string>[],
                        [day]: transitions,
                    },
                };
            },
        }];

        const toZigbee: Tz.Converter[] = [{
            key: ['weekly_schedule'],
            convertSet: async (entity, key, value, meta) => {
                // Transition format: HH:mm/temperature
                const transitionRegex = /^(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])\/(\d+(\.5)?)$/;

                utils.assertObject(value, key);

                for (const dayOfWeekName of Object.keys(value)) {
                    const dayKey = utils.getKey(constants.thermostatDayOfWeek, dayOfWeekName.toLowerCase(), null);

                    if (dayKey === null) {
                        throw new Error(`Invalid schedule: invalid day name, found: ${dayOfWeekName}`);
                    }

                    const dayOfWeekBit = Number(dayKey);

                    const transitions = value[dayOfWeekName].split(' ').sort();

                    if (transitions.length > 6) {
                        throw new Error('Invalid schedule: days must have no more than 6 transitions');
                    }

                    const payload: KeyValueAny = {
                        dayofweek: (1 << Number(dayOfWeekBit)),
                        numoftrans: transitions.length,
                        mode: (1 << 0), // heat
                        transitions: [],
                    };

                    for (const transition of transitions) {
                        const matches = transition.match(transitionRegex);

                        if (!matches) {
                            throw new Error('Invalid schedule: transitions must be in format HH:mm/temperature (e.g. 12:00/15.5), ' +
                                'found: ' + transition);
                        }

                        const hour = parseInt(matches[1]);
                        const mins = parseInt(matches[2]);
                        const temp = parseFloat(matches[3]);

                        if (temp < 4 || temp > 35) {
                            throw new Error(`Invalid schedule: temperature value must be between 4-35 (inclusive), found: ${temp}`);
                        }

                        payload.transitions.push({
                            transitionTime: (hour * 60) + mins,
                            heatSetpoint: Math.round(temp * 100),
                        });
                    }

                    if (payload.transitions[0].transitionTime !== 0) {
                        throw new Error('Invalid schedule: the first transition of each day should start at 00:00');
                    }

                    await entity.command('hvacThermostat', 'setWeeklySchedule', payload, utils.getOptions(meta.mapped, entity));
                }
            },
        }];

        return {
            exposes: [exposes],
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    cyclicTimedIrrigation: (): ModernExtend => {
        const exposes = e.composite('cyclic_timed_irrigation', 'cyclic_timed_irrigation', ea.ALL)
            .withDescription('Smart water valve cycle timing irrigation')
            .withFeature(e.numeric('current_count', ea.STATE).withDescription('Number of times it has been executed').withUnit('times'))
            .withFeature(e.numeric('total_number', ea.STATE_SET).withDescription('Total times of circulating irrigation').withUnit('tim' +
            'es').withValueMin(0).withValueMax(100))
            .withFeature(e.numeric('irrigation_duration', ea.STATE_SET).withDescription('Single irrigation duration').withUnit('second' +
            's').withValueMin(0).withValueMax(86400))
            .withFeature(e.numeric('irrigation_interval', ea.STATE_SET).withDescription('Time interval between two adjacent irrigatio' +
            'n').withUnit('seconds').withValueMin(0).withValueMax(86400));
        const fromZigbee: Fz.Converter[] = [{
            cluster: 'customClusterEwelink',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const attributeKey = 0x5008;// attr
                if (attributeKey in msg.data ) {
                    // logger.debug(` from zigbee 0x5008 cluster ${msg.data[attributeKey]} `, NS);
                    // logger.debug(msg.data[attributeKey]);
                    const buffer = Buffer.from(msg.data[attributeKey]);
                    // logger.debug(`buffer====> ${buffer[0]} ${buffer[1]} ${buffer[2]} ${buffer[3]} ${buffer[4]} ${buffer[5]} `, NS);
                    // logger.debug(`buffer====> ${buffer[6]} ${buffer[7]} ${buffer[8]} ${buffer[9]} `, NS);
                    const currentCountBuffer = buffer[0];
                    const totalNumberBuffer = buffer[1];

                    const irrigationDurationBuffer = (buffer[2] <<24) | (buffer[3] << 16) | (buffer[4] << 8)|buffer[5];

                    const irrigationIntervalBuffer = (buffer[6] <<24) | (buffer[7] << 16) | (buffer[8] << 8)|buffer[9];

                    // logger.debug(`currentCountBuffer ${currentCountBuffer}`, NS);
                    // logger.debug(`totalNumberOfTimesBuffer ${totalNumberBuffer}`, NS);
                    // logger.debug(`irrigationDurationBuffer ${irrigationDurationBuffer}`, NS);
                    // logger.debug(`irrigationIntervalBuffer ${irrigationIntervalBuffer}`, NS);

                    return {
                        cyclic_timed_irrigation: {
                            current_count: currentCountBuffer,
                            total_number: totalNumberBuffer,
                            irrigation_duration: irrigationDurationBuffer,
                            irrigation_interval: irrigationIntervalBuffer,
                        },
                    };
                }
            },
        }];
        const toZigbee: Tz.Converter[] = [{
            key: ['cyclic_timed_irrigation'],
            convertSet: async (entity, key, value, meta) => {
                // logger.debug(`to zigbee cyclic_timed_irrigation ${key}`, NS);
                // const currentCount:string = 'current_count';
                // logger.debug(`to zigbee cyclic_timed_irrigation ${value[currentCount as keyof typeof value]}`, NS);
                const totalNumber:string = 'total_number';
                // logger.debug(`to zigbee cyclic_timed_irrigation ${value[totalNumber as keyof typeof value]}`, NS);
                const irrigationDuration:string = 'irrigation_duration';
                // logger.debug(`to zigbee cyclic_timed_irrigation ${value[irrigationDuration as keyof typeof value]}`, NS);
                const irrigationInterval:string = 'irrigation_interval';
                // logger.debug(`to zigbee cyclic_timed_irrigation ${value[irrigationInterval as keyof typeof value]}`, NS);

                const payloadValue = [];
                payloadValue[0] = 0x0A;
                payloadValue[1] = 0x00;
                payloadValue[2] = value[totalNumber as keyof typeof value];

                payloadValue[3] = value[irrigationDuration as keyof typeof value] >> 24;
                payloadValue[4] = value[irrigationDuration as keyof typeof value] >> 16;
                payloadValue[5] = value[irrigationDuration as keyof typeof value] >> 8;
                payloadValue[6] = value[irrigationDuration as keyof typeof value];

                payloadValue[7] = value[irrigationInterval as keyof typeof value] >> 24;
                payloadValue[8] = value[irrigationInterval as keyof typeof value] >> 16;
                payloadValue[9] = value[irrigationInterval as keyof typeof value] >> 8;
                payloadValue[10] = value[irrigationInterval as keyof typeof value];

                const payload = {[0x5008]: {value: payloadValue, type: 0x42}};
                await entity.write('customClusterEwelink', payload, defaultResponseOptions);
                return {state: {[key]: value}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('customClusterEwelink', [0x5008], defaultResponseOptions);
            },
        }];

        return {
            exposes: [exposes],
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    cyclicQuantitativeIrrigation: (): ModernExtend => {
        const exposes = e.composite('cyclic_quantitative_irrigation', 'cyclic_quantitative_irrigation', ea.ALL)
            .withDescription('Smart water valve circulating quantitative irrigation')
            .withFeature(e.numeric('current_count', ea.STATE).withDescription('Number of times it has been executed').withUnit('times'))
            .withFeature(e.numeric('total_number', ea.STATE_SET).withDescription('Total times of circulating irrigation').withUnit('tim' +
            'es').withValueMin(0).withValueMax(100))
            .withFeature(e.numeric('irrigation_capacity', ea.STATE_SET).withDescription('Single irrigation capacity').withUnit('lite' +
            'r').withValueMin(0).withValueMax(6500))
            .withFeature(e.numeric('irrigation_interval', ea.STATE_SET).withDescription('Time interval between two adjacent irrigatio' +
            'n').withUnit('seconds').withValueMin(0).withValueMax(86400));
        const fromZigbee: Fz.Converter[] = [{
            cluster: 'customClusterEwelink',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const attributeKey = 0x5009;// attr
                if (attributeKey in msg.data ) {
                    // logger.debug(` from zigbee 0x5009 cluster ${msg.data[attributeKey]} `, NS);
                    // logger.debug(msg.data[attributeKey]);
                    const buffer = Buffer.from(msg.data[attributeKey]);
                    // logger.debug(`buffer====> ${buffer[0]} ${buffer[1]} ${buffer[2]} ${buffer[3]} ${buffer[4]} ${buffer[5]} `, NS);
                    // logger.debug(`buffer====> ${buffer[6]} ${buffer[7]} ${buffer[8]} ${buffer[9]} `, NS);
                    const currentCountBuffer = buffer[0];
                    const totalNumberBuffer = buffer[1];

                    const irrigationCapacityBuffer = (buffer[2] <<24) | (buffer[3] << 16) | (buffer[4] << 8)|buffer[5];

                    const irrigationIntervalBuffer = (buffer[6] <<24) | (buffer[7] << 16) | (buffer[8] << 8)|buffer[9];

                    // logger.debug(`currentCountBuffer ${currentCountBuffer}`, NS);
                    // logger.debug(`totalNumberBuffer ${totalNumberBuffer}`, NS);
                    // logger.debug(`irrigationCapacityBuffer ${irrigationCapacityBuffer}`, NS);
                    // logger.debug(`irrigationIntervalBuffer ${irrigationIntervalBuffer}`, NS);

                    return {
                        cyclic_quantitative_irrigation: {
                            current_count: currentCountBuffer,
                            total_number: totalNumberBuffer,
                            irrigation_capacity: irrigationCapacityBuffer,
                            irrigation_interval: irrigationIntervalBuffer,
                        },
                    };
                }
            },
        }];
        const toZigbee: Tz.Converter[] = [{
            key: ['cyclic_quantitative_irrigation'],
            convertSet: async (entity, key, value, meta) => {
                // logger.debug(`to zigbee cyclic_Quantitative_irrigation ${key}`, NS);
                // const currentCount:string = 'current_count';
                // logger.debug(`to zigbee cyclic_Quantitative_irrigation ${value[currentCount as keyof typeof value]}`, NS);
                const totalNumber:string = 'total_number';
                // logger.debug(`to zigbee cyclic_Quantitative_irrigation ${value[totalNumber as keyof typeof value]}`, NS);
                const irrigationCapacity:string = 'irrigation_capacity';
                // logger.debug(`to zigbee cyclic_Quantitative_irrigation ${value[irrigationCapacity as keyof typeof value]}`, NS);
                const irrigationInterval:string = 'irrigation_interval';
                // logger.debug(`to zigbee cyclic_Quantitative_irrigation ${value[irrigationInterval as keyof typeof value]}`, NS);

                const payloadValue = [];
                payloadValue[0] = 0x0A;
                payloadValue[1] = 0x00;
                payloadValue[2] = value[totalNumber as keyof typeof value];

                payloadValue[3] = value[irrigationCapacity as keyof typeof value] >> 24;
                payloadValue[4] = value[irrigationCapacity as keyof typeof value] >> 16;
                payloadValue[5] = value[irrigationCapacity as keyof typeof value] >> 8;
                payloadValue[6] = value[irrigationCapacity as keyof typeof value];

                payloadValue[7] = value[irrigationInterval as keyof typeof value] >> 24;
                payloadValue[8] = value[irrigationInterval as keyof typeof value] >> 16;
                payloadValue[9] = value[irrigationInterval as keyof typeof value] >> 8;
                payloadValue[10] = value[irrigationInterval as keyof typeof value];

                const payload = {[0x5009]: {value: payloadValue, type: 0x42}};
                await entity.write('customClusterEwelink', payload, defaultResponseOptions);
                return {state: {[key]: value}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('customClusterEwelink', [0x5009], defaultResponseOptions);
            },
        }];

        return {
            exposes: [exposes],
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
    externalSwitchTriggerMode: (): ModernExtend => {
        const clusterName = 'customClusterEwelink';
        const attributeName = 'externalTriggerMode';
        const exposes = e.enum('external_trigger_mode', ea.ALL, ['edge', 'pulse',
            'following(off)', 'following(on)']).withDescription('External trigger mode, which can be one of edge, pulse, ' +
            'following(off), following(on). The appropriate triggering mode can be selected according to the type of ' +
            'external switch to achieve a better use experience.');
        const fromZigbee: Fz.Converter[] = [{
            cluster: clusterName,
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const lookup:KeyValue = {'edge': 0, 'pulse': 1, 'following(off)': 2, 'following(on)': 130};
                // logger.debug(`from zigbee msg.data['externalTriggerMode'] ${msg.data['externalTriggerMode']}`, NS);
                if (msg.data.hasOwnProperty('externalTriggerMode')) {
                    let switchType = 'edge';
                    for (const name in lookup) {
                        if (lookup[name] === msg.data['externalTriggerMode']) {
                            switchType = name;
                            break;
                        }
                    }
                    // logger.debug(`form zigbee switchType ${switchType}`, NS);
                    return {['external_trigger_mode']: switchType};
                }
            },
        }];
        const toZigbee: Tz.Converter[] = [{
            key: ['external_trigger_mode'],
            convertSet: async (entity, key, value, meta) => {
                utils.assertString(value, key);
                value = value.toLowerCase();
                const lookup = {'edge': 0, 'pulse': 1, 'following(off)': 2, 'following(on)': 130};
                const tmpValue = utils.getFromLookup(value, lookup);
                await entity.write(
                    clusterName,
                    {[attributeName]: tmpValue},
                    defaultResponseOptions);
                return {state: {[key]: value}};
            },
            convertGet: async (entity, key, meta) => {
                await entity.read(clusterName, [attributeName], defaultResponseOptions);
            },
        }];
        return {
            exposes: [exposes],
            fromZigbee,
            toZigbee,
            isModernExtend: true,
        };
    },
};

const definitions: Definition[] = [
    {
        zigbeeModel: ['NSPanelP-Router'],
        model: 'NSPanelP-Router',
        vendor: 'SONOFF',
        description: 'Router',
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [],
    },
    {
        zigbeeModel: ['BASICZBR3'],
        model: 'BASICZBR3',
        vendor: 'SONOFF',
        description: 'Zigbee smart switch',
        // configureReporting fails for this device
        extend: [onOff({powerOnBehavior: false, skipDuplicateTransaction: true, configureReporting: false})],
    },
    {
        zigbeeModel: ['ZBMINI-L'],
        model: 'ZBMINI-L',
        vendor: 'SONOFF',
        description: 'Zigbee smart switch (no neutral)',
        extend: [
            onOff(),
            ota(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            // Unbind genPollCtrl to prevent device from sending checkin message.
            // Zigbee-herdsmans responds to the checkin message which causes the device
            // to poll slower.
            // https://github.com/Koenkk/zigbee2mqtt/issues/11676
            await device.getEndpoint(1).unbind('genPollCtrl', coordinatorEndpoint);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['ZBMINIL2'],
        model: 'ZBMINIL2',
        vendor: 'SONOFF',
        description: 'Zigbee smart switch (no neutral)',
        extend: [
            onOff(),
            ota(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            // Unbind genPollCtrl to prevent device from sending checkin message.
            // Zigbee-herdsmans responds to the checkin message which causes the device
            // to poll slower.
            // https://github.com/Koenkk/zigbee2mqtt/issues/11676
            await device.getEndpoint(1).unbind('genPollCtrl', coordinatorEndpoint);
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['01MINIZB'],
        model: 'ZBMINI',
        vendor: 'SONOFF',
        description: 'Zigbee two way smart switch',
        extend: [onOff({powerOnBehavior: false}), forcePowerSource({powerSource: 'Mains (single phase)'})],
    },
    {
        zigbeeModel: ['S31 Lite zb'],
        model: 'S31ZB',
        vendor: 'SONOFF',
        description: 'Zigbee smart plug (US version)',
        extend: [onOff({powerOnBehavior: false, skipDuplicateTransaction: true, configureReporting: false})],
        configure: async (device, coordinatorEndpoint) => {
            // Device does not support configureReporting for onOff, therefore just bind here.
            // https://github.com/Koenkk/zigbee2mqtt/issues/20618
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
        },
    },
    {
        fingerprint: [
            // ModelID is from the temperature/humidity sensor (SNZB-02) but this is SNZB-04, wrong modelID in firmware?
            // https://github.com/Koenkk/zigbee-herdsman-converters/issues/1449
            {
                type: 'EndDevice', manufacturerName: 'eWeLink', modelID: 'TH01', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 3, 1280, 1], outputClusters: [3]},
                ],
            },
        ],
        zigbeeModel: ['DS01', 'SNZB-04'],
        model: 'SNZB-04',
        vendor: 'SONOFF',
        whiteLabel: [{vendor: 'eWeLink', model: 'RHK06'}],
        description: 'Contact sensor',
        exposes: [e.contact(), e.battery_low(), e.battery(), e.battery_voltage()],
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint, {min: 3600, max: 7200});
            await reporting.batteryPercentageRemaining(endpoint, {min: 3600, max: 7200});
        },
    },
    {
        zigbeeModel: ['WB01', 'WB-01'],
        model: 'SNZB-01',
        vendor: 'SONOFF',
        whiteLabel: [{vendor: 'eWeLink', model: 'RHK07'}],
        description: 'Wireless button',
        exposes: [e.battery(), e.action(['single', 'double', 'long']), e.battery_voltage()],
        fromZigbee: [fz.ewelink_action, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genPowerCfg']);
            await reporting.batteryVoltage(endpoint, {min: 3600, max: 7200});
            await reporting.batteryPercentageRemaining(endpoint, {min: 3600, max: 7200});
        },
    },
    {
        fingerprint: [
            // ModelID is from the button (SNZB-01) but this is SNZB-02, wrong modelID in firmware?
            // https://github.com/Koenkk/zigbee2mqtt/issues/4338
            {
                type: 'EndDevice', manufacturerName: 'eWeLink', modelID: 'WB01', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 770, inputClusters: [0, 3, 1026, 1029, 1], outputClusters: [3]},
                ],
            },
            {
                type: 'EndDevice', manufacturerName: 'eWeLink', modelID: '66666', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 770, inputClusters: [0, 3, 1026, 1029, 1], outputClusters: [3]},
                ],
            },
            {
                type: 'EndDevice', manufacturerName: 'eWeLink', modelID: 'DS01', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 770, inputClusters: [0, 3, 1026, 1029, 1], outputClusters: [3]},
                ],
            },
        ],
        zigbeeModel: ['TH01'],
        model: 'SNZB-02',
        vendor: 'SONOFF',
        whiteLabel: [{vendor: 'eWeLink', model: 'RHK08'}],
        description: 'Temperature and humidity sensor',
        exposes: [e.battery(), e.temperature(), e.humidity(), e.battery_voltage()],
        fromZigbee: [fz.SNZB02_temperature, fz.humidity, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            try {
                const endpoint = device.getEndpoint(1);
                const bindClusters = ['msTemperatureMeasurement', 'msRelativeHumidity', 'genPowerCfg'];
                await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
                await reporting.temperature(endpoint, {min: 30, max: constants.repInterval.MINUTES_5, change: 20});
                await reporting.humidity(endpoint, {min: 30, max: constants.repInterval.MINUTES_5, change: 100});
                await reporting.batteryVoltage(endpoint, {min: 3600, max: 7200});
                await reporting.batteryPercentageRemaining(endpoint, {min: 3600, max: 7200});
            } catch (e) {/* Not required for all: https://github.com/Koenkk/zigbee2mqtt/issues/5562 */
                logger.error(`Configure failed: ${e}`, NS);
            }
        },
    },
    {
        zigbeeModel: ['SNZB-02D'],
        model: 'SNZB-02D',
        vendor: 'SONOFF',
        description: 'Temperature and humidity sensor with screen',
        extend: [
            forcePowerSource({powerSource: 'Battery'}),
            battery({percentage: true}),
            temperature(),
            humidity(),
            bindCluster({cluster: 'genPollCtrl', clusterType: 'input'}),
        ],
    },
    {
        fingerprint: [
            {
                type: 'EndDevice', manufacturerName: 'eWeLink', modelID: '66666', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 3, 1280, 1], outputClusters: [3]},
                ],
            },
            {
                // SNZB-O3 OUVOPO Wireless Motion Sensor (2023)
                type: 'EndDevice', manufacturerName: 'eWeLink', modelID: 'SNZB-03', endpoints: [
                    {ID: 1, profileID: 260, deviceID: 1026, inputClusters: [0, 3, 1280, 1], outputClusters: [3]},
                ],
            },
        ],
        zigbeeModel: ['MS01', 'MSO1'],
        model: 'SNZB-03',
        vendor: 'SONOFF',
        whiteLabel: [{vendor: 'eWeLink', model: 'RHK09'}],
        description: 'Motion sensor',
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ['genPowerCfg'];
            await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
            // 3600/7200 prevents disconnect
            // https://github.com/Koenkk/zigbee2mqtt/issues/13600#issuecomment-1283827935
            await reporting.batteryVoltage(endpoint, {min: 3600, max: 7200});
            await reporting.batteryPercentageRemaining(endpoint, {min: 3600, max: 7200});
        },
        exposes: [e.occupancy(), e.battery_low(), e.battery(), e.battery_voltage()],
    },
    {
        zigbeeModel: ['S26R2ZB'],
        model: 'S26R2ZB',
        vendor: 'SONOFF',
        description: 'Zigbee smart plug',
        extend: [onOff({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ['S40LITE'],
        model: 'S40ZBTPB',
        vendor: 'SONOFF',
        description: '15A Zigbee smart plug',
        extend: [
            onOff({powerOnBehavior: false, skipDuplicateTransaction: true}),
            ota(),
        ],
    },
    {
        zigbeeModel: ['DONGLE-E_R'],
        model: 'ZBDongle-E',
        vendor: 'SONOFF',
        description: 'Sonoff Zigbee 3.0 USB Dongle Plus (EFR32MG21) with router firmware',
        fromZigbee: [fz.linkquality_from_basic, fzLocal.router_config],
        toZigbee: [],
        exposes: [e.numeric('light_indicator_level', ea.STATE).withDescription('Brightness of the indicator light').withAccess(ea.STATE)],
        configure: async (device, coordinatorEndpoint) => {
            device.powerSource = 'Mains (single phase)';
            device.save();
        },
    },
    {
        zigbeeModel: ['ZBCurtain'],
        model: 'ZBCurtain',
        vendor: 'SONOFF',
        description: 'Zigbee smart curtain motor',
        fromZigbee: [fz.cover_position_tilt, fz.battery],
        toZigbee: [tz.cover_state, tz.cover_position_tilt],
        exposes: [e.cover_position(), e.battery()],
    },
    {
        zigbeeModel: ['Z111PL0H-1JX', 'SA-029-1'],
        model: 'SA-028/SA-029',
        vendor: 'SONOFF',
        whiteLabel: [{vendor: 'Woolley', model: 'SA-029-1'}],
        description: 'Smart Plug',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['SNZB-01P'],
        model: 'SNZB-01P',
        vendor: 'SONOFF',
        description: 'Wireless button',
        extend: [
            forcePowerSource({powerSource: 'Battery'}),
            ewelinkAction(),
            battery({
                percentageReportingConfig: {min: 3600, max: 7200, change: 0},
                voltage: true,
                voltageReporting: true,
                voltageReportingConfig: {min: 3600, max: 7200, change: 0},
            }),
            ota(),
        ],
    },
    {
        zigbeeModel: ['SNZB-02P'],
        model: 'SNZB-02P',
        vendor: 'SONOFF',
        description: 'Temperature and humidity sensor',
        extend: [
            forcePowerSource({powerSource: 'Battery'}),
            battery({percentage: true}),
            temperature(),
            humidity(),
            bindCluster({cluster: 'genPollCtrl', clusterType: 'input'}),
        ],
    },
    {
        zigbeeModel: ['SNZB-04P'],
        model: 'SNZB-04P',
        vendor: 'SONOFF',
        description: 'Contact sensor',
        exposes: [e.contact(), e.battery_low(), e.battery(), e.battery_voltage()],
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        extend: [
            binary({
                name: 'tamper',
                cluster: 0xFC11,
                attribute: {ID: 0x2000, type: 0x20},
                description: 'Tamper-proof status',
                valueOn: [true, 0x01],
                valueOff: [false, 0x00],
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.SHENZHEN_COOLKIT_TECHNOLOGY_CO_LTD},
                access: 'STATE_GET',
            }),
            ota(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint, {min: 3600, max: 7200});
            await reporting.batteryPercentageRemaining(endpoint, {min: 3600, max: 7200});
        },
    },
    {
        zigbeeModel: ['SNZB-03P'],
        model: 'SNZB-03P',
        vendor: 'SONOFF',
        description: 'Zigbee PIR sensor',
        fromZigbee: [fz.occupancy, fz.battery],
        exposes: [e.occupancy(), e.battery_low(), e.battery()],
        extend: [
            numeric({
                name: 'motion_timeout',
                cluster: 0x0406,
                attribute: {ID: 0x0020, type: 0x21},
                description: 'Unoccupied to occupied delay',
                valueMin: 5,
                valueMax: 60,
            }),
            enumLookup({
                name: 'illumination',
                lookup: {'dim': 0, 'bright': 1},
                cluster: 0xFC11,
                attribute: {ID: 0x2001, type: 0x20},
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.SHENZHEN_COOLKIT_TECHNOLOGY_CO_LTD},
                description: 'Only updated when occupancy is detected',
                access: 'STATE',
            }),
            ota(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryVoltage(endpoint, {min: 3600, max: 7200});
            await reporting.batteryPercentageRemaining(endpoint, {min: 3600, max: 7200});
        },
    },
    {
        zigbeeModel: ['SNZB-05P'],
        model: 'SNZB-05P',
        vendor: 'SONOFF',
        description: 'Zigbee water sensor',
        extend: [
            battery(),
            iasZoneAlarm({zoneType: 'water_leak', zoneAttributes: ['alarm_1', 'battery_low']}),
        ],
    },
    {
        zigbeeModel: ['SNZB-06P'],
        model: 'SNZB-06P',
        vendor: 'SONOFF',
        description: 'Zigbee occupancy sensor',
        fromZigbee: [fz.occupancy],
        exposes: [e.occupancy()],
        extend: [
            numeric({
                name: 'occupancy_timeout',
                cluster: 0x0406,
                attribute: {ID: 0x0020, type: 0x21},
                description: 'Unoccupied to occupied delay',
                valueMin: 15,
                valueMax: 65535,
            }),
            enumLookup({
                name: 'occupancy_sensitivity',
                lookup: {'low': 1, 'medium': 2, 'high': 3},
                cluster: 0x0406,
                attribute: {ID: 0x0022, type: 0x20},
                description: 'Sensitivity of human presence detection',
            }),
            enumLookup({
                name: 'illumination',
                lookup: {'dim': 0, 'bright': 1},
                cluster: 0xFC11,
                attribute: {ID: 0x2001, type: 0x20},
                description: 'Only updated when occupancy is detected',
                zigbeeCommandOptions: {manufacturerCode: Zcl.ManufacturerCode.SHENZHEN_COOLKIT_TECHNOLOGY_CO_LTD},
                access: 'STATE',
            }),
            ota(),
        ],
    },
    {
        zigbeeModel: ['TRVZB'],
        model: 'TRVZB',
        vendor: 'SONOFF',
        description: 'Zigbee thermostatic radiator valve',
        exposes: [
            e.climate()
                .withSetpoint('occupied_heating_setpoint', 4, 35, 0.5)
                .withLocalTemperature()
                .withLocalTemperatureCalibration(-7.0, 7.0, 0.2)
                .withSystemMode(['off', 'auto', 'heat'], ea.ALL, 'Mode of the thermostat')
                .withRunningState(['idle', 'heat'], ea.STATE_GET),
            e.battery(),
        ],
        fromZigbee: [
            fz.thermostat,
            fz.battery,
        ],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_local_temperature_calibration,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
        ],
        extend: [
            deviceAddCustomCluster(
                'customSonoffTrvzb',
                {
                    ID: 0xfc11,
                    attributes: {
                        childLock: {ID: 0x0000, type: Zcl.DataType.BOOLEAN},
                        tamper: {ID: 0x2000, type: Zcl.DataType.UINT8},
                        illumination: {ID: 0x2001, type: Zcl.DataType.UINT8},
                        openWindow: {ID: 0x6000, type: Zcl.DataType.BOOLEAN},
                        frostProtectionTemperature: {ID: 0x6002, type: Zcl.DataType.INT16},
                        idleSteps: {ID: 0x6003, type: Zcl.DataType.UINT16},
                        closingSteps: {ID: 0x6004, type: Zcl.DataType.UINT16},
                        valveOpeningLimitVoltage: {ID: 0x6005, type: Zcl.DataType.UINT16},
                        valveClosingLimitVoltage: {ID: 0x6006, type: Zcl.DataType.UINT16},
                        valveMotorRunningVoltage: {ID: 0x6007, type: Zcl.DataType.UINT16},
                        valveOpeningDegree: {ID: 0x600B, type: Zcl.DataType.UINT8},
                        valveClosingDegree: {ID: 0x600C, type: Zcl.DataType.UINT8},
                    },
                    commands: {},
                    commandsResponse: {},
                },
            ),
            binary({
                name: 'child_lock',
                cluster: 'customSonoffTrvzb',
                attribute: 'childLock',
                description: 'Enables/disables physical input on the device',
                valueOn: ['LOCK', 0x01],
                valueOff: ['UNLOCK', 0x00],
            }),
            binary({
                name: 'open_window',
                cluster: 'customSonoffTrvzb',
                attribute: 'openWindow',
                description: 'Automatically turns off the radiator when local temperature drops by more than 1.5°C in 4.5 minutes.',
                valueOn: ['ON', 0x01],
                valueOff: ['OFF', 0x00],
            }),
            numeric({
                name: 'frost_protection_temperature',
                cluster: 'customSonoffTrvzb',
                attribute: 'frostProtectionTemperature',
                description: 'Minimum temperature at which to automatically turn on the radiator, ' +
                    'if system mode is off, to prevent pipes freezing.',
                valueMin: 4.0,
                valueMax: 35.0,
                valueStep: 0.5,
                unit: '°C',
                scale: 100,
            }),
            numeric({
                name: 'idle_steps',
                cluster: 'customSonoffTrvzb',
                attribute: 'idleSteps',
                description: 'Number of steps used for calibration (no-load steps)',
                access: 'STATE_GET',
            }),
            numeric({
                name: 'closing_steps',
                cluster: 'customSonoffTrvzb',
                attribute: 'closingSteps',
                description: 'Number of steps it takes to close the valve',
                access: 'STATE_GET',
            }),
            numeric({
                name: 'valve_opening_limit_voltage',
                cluster: 'customSonoffTrvzb',
                attribute: 'valveOpeningLimitVoltage',
                description: 'Valve opening limit voltage',
                unit: 'mV',
                access: 'STATE_GET',
            }),
            numeric({
                name: 'valve_closing_limit_voltage',
                cluster: 'customSonoffTrvzb',
                attribute: 'valveClosingLimitVoltage',
                description: 'Valve closing limit voltage',
                unit: 'mV',
                access: 'STATE_GET',
            }),
            numeric({
                name: 'valve_motor_running_voltage',
                cluster: 'customSonoffTrvzb',
                attribute: 'valveMotorRunningVoltage',
                description: 'Valve motor running voltage',
                unit: 'mV',
                access: 'STATE_GET',
            }),
            numeric({
                name: 'valve_opening_degree',
                cluster: 'customSonoffTrvzb',
                attribute: 'valveOpeningDegree',
                entityCategory: 'config',
                description: 'Valve open position (percentage) control. ' +
                    'If the opening degree is set to 100%, the valve is fully open when it is opened. ' +
                    'If the opening degree is set to 0%, the valve is fully closed when it is opened, ' +
                    'and the default value is 100%. ' +
                    'Note: only version v1.1.4 or higher is supported.',
                valueMin: 0.0,
                valueMax: 100.0,
                valueStep: 1.0,
                unit: '%',
            }),
            numeric({
                name: 'valve_closing_degree',
                cluster: 'customSonoffTrvzb',
                attribute: 'valveClosingDegree',
                entityCategory: 'config',
                description: 'Valve closed position (percentage) control. ' +
                    'If the closing degree is set to 100%, the valve is fully closed when it is closed. ' +
                    'If the closing degree is set to 0%, the valve is fully opened when it is closed, ' +
                    'and the default value is 100%. ' +
                    'Note: Only version v1.1.4 or higher is supported.',
                valueMin: 0.0,
                valueMax: 100.0,
                valueStep: 1.0,
                unit: '%',
            }),
            sonoffExtend.weeklySchedule(),
            customTimeResponse('1970_UTC'),
            ota(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['hvacThermostat']);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatSystemMode(endpoint);
            await endpoint.read('hvacThermostat', ['localTemperatureCalibration']);
            await endpoint.read(0xFC11, [0x0000, 0x6000, 0x6002, 0x6003, 0x6004, 0x6005, 0x6006, 0x6007]);
        },
    },
    {
        zigbeeModel: ['S60ZBTPF'],
        model: 'S60ZBTPF',
        vendor: 'SONOFF',
        description: 'Zigbee smart plug',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['S60ZBTPG'],
        model: 'S60ZBTPG',
        vendor: 'SONOFF',
        description: 'Zigbee smart plug',
        extend: [onOff()],
    },
    {
        zigbeeModel: ['SWV'],
        model: 'SWV',
        vendor: 'SONOFF',
        description: 'Zigbee smart water valve',
        fromZigbee: [
            fz.flow,
        ],
        exposes: [
            e.numeric('flow', ea.STATE).withDescription('Current water flow').withUnit('m³/h'),
        ],
        extend: [
            ota(),
            battery(),
            onOff({
                powerOnBehavior: false,
                skipDuplicateTransaction: true,
                configureReporting: true,
            }),
            sonoffExtend.addCustomClusterEwelink(),
            enumLookup({
                name: 'current_device_status',
                lookup: {'normal_state': 0, 'water_shortage': 1, 'water_leakage': 2, 'water_shortage & water_leakage': 3},
                cluster: 'customClusterEwelink',
                attribute: {ID: 0x500C, type: 0x20},
                description: 'The water valve is in normal state, water shortage or water leakage',
                access: 'STATE_GET',
            }),
            sonoffExtend.cyclicTimedIrrigation(),
            sonoffExtend.cyclicQuantitativeIrrigation(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'genOnOff']);
            await reporting.bind(endpoint, coordinatorEndpoint, ['msFlowMeasurement']);
            await reporting.onOff(endpoint, {min: 1, max: 1800, change: 0});
            await endpoint.read('customClusterEwelink', [0x500C]);
        },
    },
    {
        zigbeeModel: ['ZBMicro'],
        model: 'ZBMicro',
        vendor: 'SONOFF',
        description: 'Zigbee USB repeater plug',
        extend: [
            ota(),
            onOff(),
            sonoffExtend.addCustomClusterEwelink(),
            binary({
                name: 'rf_turbo_mode',
                cluster: 'customClusterEwelink',
                attribute: 'radioPowerWithManuCode',
                zigbeeCommandOptions: manufacturerOptions,
                description: 'Enable/disable Radio power turbo mode',
                valueOff: [false, 0x09],
                valueOn: [true, 0x14],
            }),
            sonoffExtend.inchingControlSet(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint, {min: 1, max: 1800, change: 0});
            await endpoint.read('customClusterEwelink', ['radioPowerWithManuCode'], manufacturerOptions);
        },
    },
    {
        zigbeeModel: ['ZBMINIR2'],
        model: 'ZBMINIR2',
        vendor: 'SONOFF',
        description: 'Zigbee smart switch',
        exposes: [],
        extend: [
            ota(),
            onOff(),
            sonoffExtend.addCustomClusterEwelink(),
            binary({
                name: 'turbo_mode',
                cluster: 'customClusterEwelink',
                attribute: 'radioPower',
                description: 'Enable/disable Radio power turbo mode',
                valueOff: [false, 0x09],
                valueOn: [true, 0x14],
            }),
            binary({
                name: 'delayed_power_on_state',
                cluster: 'customClusterEwelink',
                attribute: 'delayedPowerOnState',
                description: 'Delayed Power-on State',
                valueOff: [false, 0],
                valueOn: [true, 1],
            }),
            numeric({
                name: 'delayed_power_on_time',
                cluster: 'customClusterEwelink',
                attribute: 'delayedPowerOnTime',
                description: 'Delayed Power-on time',
                valueMin: 0.5,
                valueMax: 3599.5,
                valueStep: 0.5,
                unit: 'seconds',
                scale: 2,
            }),
            binary({
                name: 'detach_relay_mode',
                cluster: 'customClusterEwelink',
                attribute: 'detachRelayMode',
                description: 'Enable/Disable detach relay mode',
                valueOff: [false, 0],
                valueOn: [true, 1],
            }),
            sonoffExtend.externalSwitchTriggerMode(),
            sonoffExtend.inchingControlSet(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'customClusterEwelink']);
            await reporting.onOff(endpoint, {min: 1, max: 1800, change: 0});
            await endpoint.read('customClusterEwelink', ['radioPower', 0x0014, 0x0015, 0x0016, 0x0017], defaultResponseOptions);
        },
    },
];

export default definitions;
module.exports = definitions;
