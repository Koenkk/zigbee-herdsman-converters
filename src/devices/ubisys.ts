import * as semver from 'semver';
import {Zcl} from 'zigbee-herdsman';

import fz from '../converters/fromZigbee';
import tz from '../converters/toZigbee';
import * as constants from '../lib/constants';
import * as exposes from '../lib/exposes';
import * as legacy from '../lib/legacy';
import {logger} from '../lib/logger';
import {commandsColorCtrl, commandsLevelCtrl, commandsOnOff, deviceEndpoints, electricityMeter, identify, onOff} from '../lib/modernExtend';
import * as ota from '../lib/ota';
import * as reporting from '../lib/reporting';
import {DefinitionWithExtend, Fz, OnEventType, Tz, OnEventData, Zh, KeyValue, KeyValueAny} from '../lib/types';
import {ubisysModernExtend} from '../lib/ubisys';
import * as utils from '../lib/utils';

const NS = 'zhc:ubisys';
const e = exposes.presets;
const ea = exposes.access;

const manufacturerOptions = {
    /*
     * Ubisys doesn't accept a manufacturerCode on some commands
     * This bug has been reported, but it has not been fixed:
     * https://github.com/Koenkk/zigbee-herdsman/issues/52
     */
    ubisys: {manufacturerCode: Zcl.ManufacturerCode.UBISYS_TECHNOLOGIES_GMBH},
    // @ts-expect-error
    ubisysNull: {manufacturerCode: null},
};

const ubisysOnEventReadCurrentSummDelivered = async function (type: OnEventType, data: OnEventData, device: Zh.Device) {
    if (data.type === 'attributeReport' && data.cluster === 'seMetering') {
        try {
            await data.endpoint.read('seMetering', ['currentSummDelivered']);
        } catch (error) {
            /* Do nothing*/
        }
    }
};

const ubisysPollCurrentSummDelivered = async (type: OnEventType, data: OnEventData, device: Zh.Device, endpointId: number, options: KeyValue) => {
    const endpoint = device.getEndpoint(endpointId);
    const poll = async () => {
        await endpoint.read('seMetering', ['currentSummDelivered']);
    };

    utils.onEventPoll(type, data, device, options, 'measurement', 60, poll);
};

const ubisys = {
    fz: {
        dimmer_setup: {
            cluster: 'manuSpecificUbisysDimmerSetup',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                if (msg.data.hasOwnProperty('capabilities')) {
                    const capabilities = msg.data.capabilities;
                    const forwardPhaseControl = capabilities & 1;
                    const reversePhaseControl = (capabilities & 2) >>> 1;
                    const reactanceDiscriminator = (capabilities & 0x20) >>> 5;
                    const configurableCurve = (capabilities & 0x40) >>> 6;
                    const overloadDetection = (capabilities & 0x80) >>> 7;
                    return {
                        capabilities_forward_phase_control: forwardPhaseControl ? true : false,
                        capabilities_reverse_phase_control: reversePhaseControl ? true : false,
                        capabilities_reactance_discriminator: reactanceDiscriminator ? true : false,
                        capabilities_configurable_curve: configurableCurve ? true : false,
                        capabilities_overload_detection: overloadDetection ? true : false,
                    };
                }
                if (msg.data.hasOwnProperty('status')) {
                    const status = msg.data.status;
                    const forwardPhaseControl = status & 1;
                    const reversePhaseControl = (status & 2) >>> 1;
                    const overload = (status & 8) >>> 3;
                    const capacitiveLoad = (status & 0x40) >>> 6;
                    const inductiveLoad = (status & 0x80) >>> 7;
                    return {
                        status_forward_phase_control: forwardPhaseControl ? true : false,
                        status_reverse_phase_control: reversePhaseControl ? true : false,
                        status_overload: overload ? true : false,
                        status_capacitive_load: capacitiveLoad ? true : false,
                        status_inductive_load: inductiveLoad ? true : false,
                    };
                }
                if (msg.data.hasOwnProperty('mode')) {
                    const mode = msg.data.mode;
                    const phaseControl = mode & 3;
                    const phaseControlValues = {0: 'automatic', 1: 'forward', 2: 'reverse'};
                    return {
                        mode_phase_control: utils.getFromLookup(phaseControl, phaseControlValues),
                    };
                }
            },
        } satisfies Fz.Converter,
        dimmer_setup_genLevelCtrl: {
            cluster: 'genLevelCtrl',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                if (msg.data.hasOwnProperty('ubisysMinimumOnLevel')) {
                    return {minimum_on_level: msg.data.ubisysMinimumOnLevel};
                }
            },
        } satisfies Fz.Converter,
        configure_device_setup: {
            cluster: 'manuSpecificUbisysDeviceSetup',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const result = (meta.state.hasOwnProperty('configure_device_setup') ? meta.state.configure_device_setup : {}) as KeyValue;
                if (msg.data['inputConfigurations'] != null) {
                    result['input_configurations'] = msg.data['inputConfigurations'];
                }
                if (msg.data['inputActions'] != null) {
                    result['input_actions'] = msg.data['inputActions'].map(function (el: KeyValue) {
                        return Object.values(el);
                    });
                }
                return {configure_device_setup: result};
            },
        } satisfies Fz.Converter,
    },
    tz: {
        configure_j1: {
            key: ['configure_j1'],
            convertSet: async (entity, key, value: KeyValueAny, meta) => {
                const log = (message: string) => {
                    logger.warning(`ubisys: ${message}`, NS);
                };
                const sleepSeconds = async (s: number) => {
                    return new Promise((resolve) => setTimeout(resolve, s * 1000));
                };
                const waitUntilStopped = async () => {
                    let operationalStatus = 0;
                    do {
                        await sleepSeconds(2);
                        const response = await entity.read('closuresWindowCovering', ['operationalStatus']);
                        // @ts-expect-error
                        operationalStatus = response.operationalStatus;
                    } while (operationalStatus != 0);
                    await sleepSeconds(2);
                };
                const writeAttrFromJson = async (
                    attr: string,
                    jsonAttr?: string,
                    converterFunc?: (v: unknown) => unknown,
                    delaySecondsAfter?: number,
                ) => {
                    if (!jsonAttr) jsonAttr = attr;
                    if (jsonAttr.startsWith('ubisys')) {
                        jsonAttr = jsonAttr.substring(6, 1).toLowerCase + jsonAttr.substring(7);
                    }
                    if (value.hasOwnProperty(jsonAttr)) {
                        let attrValue = value[jsonAttr];
                        if (converterFunc) {
                            attrValue = converterFunc(attrValue);
                        }
                        const attributes: KeyValue = {};
                        attributes[attr] = attrValue;
                        await entity.write('closuresWindowCovering', attributes, manufacturerOptions.ubisys);
                        if (delaySecondsAfter) {
                            await sleepSeconds(delaySecondsAfter);
                        }
                    }
                };
                const stepsPerSecond = value.steps_per_second || 50;
                const hasCalibrate = value.hasOwnProperty('calibrate');
                // cancel any running calibration
                // @ts-expect-error
                let mode = (await entity.read('closuresWindowCovering', ['windowCoveringMode'])).windowCoveringMode;
                const modeCalibrationBitMask = 0x02;
                if (mode & modeCalibrationBitMask) {
                    await entity.write('closuresWindowCovering', {windowCoveringMode: mode & ~modeCalibrationBitMask});
                    await sleepSeconds(2);
                }
                // delay a bit if reconfiguring basic configuration attributes
                await writeAttrFromJson('windowCoveringType', undefined, undefined, 2);
                await writeAttrFromJson('configStatus', undefined, undefined, 2);
                // @ts-expect-error
                if (await writeAttrFromJson('windowCoveringMode', undefined, undefined, 2)) {
                    mode = value['windowCoveringMode'];
                }
                if (hasCalibrate) {
                    log('Cover calibration starting...');
                    // first of all, move to top position to not confuse calibration later
                    log('  Moving cover to top position to get a good starting point...');
                    await entity.command('closuresWindowCovering', 'upOpen', {});
                    await waitUntilStopped();
                    log('  Settings some attributes...');
                    // reset attributes
                    await entity.write(
                        'closuresWindowCovering',
                        {
                            installedOpenLimitLiftCm: 0,
                            installedClosedLimitLiftCm: 240,
                            installedOpenLimitTiltDdegree: 0,
                            installedClosedLimitTiltDdegree: 900,
                            ubisysLiftToTiltTransitionSteps: 0xffff,
                            ubisysTotalSteps: 0xffff,
                            ubisysLiftToTiltTransitionSteps2: 0xffff,
                            ubisysTotalSteps2: 0xffff,
                        },
                        manufacturerOptions.ubisys,
                    );
                    // enable calibration mode
                    await sleepSeconds(2);
                    await entity.write('closuresWindowCovering', {windowCoveringMode: mode | modeCalibrationBitMask});
                    await sleepSeconds(2);
                    // move down a bit and back up to detect upper limit
                    log('  Moving cover down a bit...');
                    await entity.command('closuresWindowCovering', 'downClose', {});
                    await sleepSeconds(5);
                    await entity.command('closuresWindowCovering', 'stop', {});
                    await sleepSeconds(2);
                    log('  Moving up again to detect upper limit...');
                    await entity.command('closuresWindowCovering', 'upOpen', {});
                    await waitUntilStopped();
                    log('  Moving down to count steps from open to closed...');
                    await entity.command('closuresWindowCovering', 'downClose', {});
                    await waitUntilStopped();
                    log('  Moving up to count steps from closed to open...');
                    await entity.command('closuresWindowCovering', 'upOpen', {});
                    await waitUntilStopped();
                }
                // now write any attribute values present in JSON
                await writeAttrFromJson('installedOpenLimitLiftCm');
                await writeAttrFromJson('installedClosedLimitLiftCm');
                await writeAttrFromJson('installedOpenLimitTiltDdegree');
                await writeAttrFromJson('installedClosedLimitTiltDdegree');
                await writeAttrFromJson('ubisysTurnaroundGuardTime');
                await writeAttrFromJson('ubisysLiftToTiltTransitionSteps');
                await writeAttrFromJson('ubisysTotalSteps');
                await writeAttrFromJson('ubisysLiftToTiltTransitionSteps2');
                await writeAttrFromJson('ubisysTotalSteps2');
                await writeAttrFromJson('ubisysAdditionalSteps');
                await writeAttrFromJson('ubisysInactivePowerThreshold');
                await writeAttrFromJson('ubisysStartupSteps');
                // some convenience functions to not have to calculate
                await writeAttrFromJson('ubisysTotalSteps', 'open_to_closed_s', (s: number) => s * stepsPerSecond);
                await writeAttrFromJson('ubisysTotalSteps2', 'closed_to_open_s', (s: number) => s * stepsPerSecond);
                await writeAttrFromJson('ubisysLiftToTiltTransitionSteps', 'lift_to_tilt_transition_ms', (s: number) => (s * stepsPerSecond) / 1000);
                await writeAttrFromJson('ubisysLiftToTiltTransitionSteps2', 'lift_to_tilt_transition_ms', (s: number) => (s * stepsPerSecond) / 1000);
                if (hasCalibrate) {
                    log('  Finalizing calibration...');
                    // disable calibration mode again
                    await sleepSeconds(2);
                    await entity.write('closuresWindowCovering', {windowCoveringMode: mode & ~modeCalibrationBitMask});
                    await sleepSeconds(2);
                    // re-read and dump all relevant attributes
                    log('  Done - will now read back the results.');
                    await ubisys.tz.configure_j1.convertGet(entity, key, meta);
                }
            },
            convertGet: async (entity, key, meta) => {
                const log = (json: unknown) => {
                    logger.warning(`ubisys: Cover configuration read: ${JSON.stringify(json)}`, NS);
                };
                log(
                    await entity.read('closuresWindowCovering', [
                        'windowCoveringType',
                        'physicalClosedLimitLiftCm',
                        'physicalClosedLimitTiltDdegree',
                        'installedOpenLimitLiftCm',
                        'installedClosedLimitLiftCm',
                        'installedOpenLimitTiltDdegree',
                        'installedClosedLimitTiltDdegree',
                    ]),
                );
                log(
                    await entity.read('closuresWindowCovering', [
                        'configStatus',
                        'windowCoveringMode',
                        'currentPositionLiftPercentage',
                        'currentPositionLiftCm',
                        'currentPositionTiltPercentage',
                        'currentPositionTiltDdegree',
                        'operationalStatus',
                    ]),
                );
                log(
                    await entity.read(
                        'closuresWindowCovering',
                        [
                            'ubisysTurnaroundGuardTime',
                            'ubisysLiftToTiltTransitionSteps',
                            'ubisysTotalSteps',
                            'ubisysLiftToTiltTransitionSteps2',
                            'ubisysTotalSteps2',
                            'ubisysAdditionalSteps',
                            'ubisysInactivePowerThreshold',
                            'ubisysStartupSteps',
                        ],
                        manufacturerOptions.ubisys,
                    ),
                );
            },
        } satisfies Tz.Converter,
        dimmer_setup: {
            key: [
                'capabilities_forward_phase_control',
                'capabilities_reverse_phase_control',
                'capabilities_reactance_discriminator',
                'capabilities_configurable_curve',
                'capabilities_overload_detection',
                'status_forward_phase_control',
                'status_reverse_phase_control',
                'status_overload',
                'status_capacitive_load',
                'status_inductive_load',
                'mode_phase_control',
            ],
            convertSet: async (entity, key, value, meta) => {
                if (key === 'mode_phase_control') {
                    utils.assertString(value, 'mode_phase_control');
                    const phaseControl = value.toLowerCase();
                    const phaseControlValues = {automatic: 0, forward: 1, reverse: 2};
                    utils.validateValue(phaseControl, Object.keys(phaseControlValues));
                    await entity.write(
                        'manuSpecificUbisysDimmerSetup',
                        {mode: utils.getFromLookup(phaseControl, phaseControlValues)},
                        manufacturerOptions.ubisysNull,
                    );
                }
                await ubisys.tz.dimmer_setup.convertGet(entity, key, meta);
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificUbisysDimmerSetup', ['capabilities'], manufacturerOptions.ubisysNull);
                await entity.read('manuSpecificUbisysDimmerSetup', ['status'], manufacturerOptions.ubisysNull);
                await entity.read('manuSpecificUbisysDimmerSetup', ['mode'], manufacturerOptions.ubisysNull);
            },
        } satisfies Tz.Converter,
        dimmer_setup_genLevelCtrl: {
            key: ['minimum_on_level'],
            convertSet: async (entity, key, value, meta) => {
                if (key === 'minimum_on_level') {
                    await entity.write('genLevelCtrl', {ubisysMinimumOnLevel: value}, manufacturerOptions.ubisys);
                }
                await ubisys.tz.dimmer_setup_genLevelCtrl.convertGet(entity, key, meta);
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('genLevelCtrl', ['ubisysMinimumOnLevel'], manufacturerOptions.ubisys);
            },
        } satisfies Tz.Converter,
        configure_device_setup: {
            key: ['configure_device_setup'],
            convertSet: async (entity, key, value: KeyValueAny, meta) => {
                const devMgmtEp = meta.device.getEndpoint(232);
                const cluster = Zcl.Utils.getCluster('manuSpecificUbisysDeviceSetup', null, meta.device.customClusters);
                const attributeInputConfigurations = cluster.getAttribute('inputConfigurations');
                const attributeInputActions = cluster.getAttribute('inputActions');

                // ubisys switched to writeStructure a while ago, change log only goes back to 1.9.x
                // and it happened before that but to be safe we will only use writeStrucutre on 1.9.0 and up
                let useWriteStruct = false;
                if (meta.device.softwareBuildID != undefined) {
                    useWriteStruct = semver.gte(meta.device.softwareBuildID, '1.9.0', true);
                }
                if (useWriteStruct) {
                    logger.debug(`ubisys: using writeStructure for '${meta.options.friendly_name}'.`, NS);
                }

                if (value.hasOwnProperty('input_configurations')) {
                    // example: [0, 0, 0, 0]
                    if (useWriteStruct) {
                        await devMgmtEp.writeStructured(
                            'manuSpecificUbisysDeviceSetup',
                            [
                                {
                                    attrId: attributeInputConfigurations.ID,
                                    selector: {},
                                    dataType: Zcl.DataType.ARRAY,
                                    elementData: {
                                        elementType: Zcl.DataType.DATA8,
                                        elements: value.input_configurations,
                                    },
                                },
                            ],
                            manufacturerOptions.ubisysNull,
                        );
                    } else {
                        await devMgmtEp.write(
                            'manuSpecificUbisysDeviceSetup',
                            {[attributeInputConfigurations.name]: {elementType: Zcl.DataType.DATA8, elements: value.input_configurations}},
                            manufacturerOptions.ubisysNull,
                        );
                    }
                }

                if (value.hasOwnProperty('input_actions')) {
                    // example (default for C4): [[0,13,1,6,0,2], [1,13,2,6,0,2], [2,13,3,6,0,2], [3,13,4,6,0,2]]
                    if (useWriteStruct) {
                        await devMgmtEp.writeStructured(
                            'manuSpecificUbisysDeviceSetup',
                            [
                                {
                                    attrId: attributeInputActions.ID,
                                    selector: {},
                                    dataType: Zcl.DataType.ARRAY,
                                    elementData: {
                                        elementType: Zcl.DataType.OCTET_STR,
                                        elements: value.input_actions,
                                    },
                                },
                            ],
                            manufacturerOptions.ubisysNull,
                        );
                    } else {
                        await devMgmtEp.write(
                            'manuSpecificUbisysDeviceSetup',
                            {[attributeInputActions.name]: {elementType: Zcl.DataType.OCTET_STR, elements: value.input_actions}},
                            manufacturerOptions.ubisysNull,
                        );
                    }
                }

                if (value.hasOwnProperty('input_action_templates')) {
                    const templateTypes = {
                        // source: "ZigBee Device Physical Input Configurations Integrator’s Guide"
                        // (can be obtained directly from ubisys upon request)
                        toggle: {
                            getInputActions: (input: unknown, endpoint: Zh.Endpoint) => [[input, 0x0d, endpoint, 0x06, 0x00, 0x02]],
                        },
                        toggle_switch: {
                            getInputActions: (input: unknown, endpoint: Zh.Endpoint) => [
                                [input, 0x0d, endpoint, 0x06, 0x00, 0x02],
                                [input, 0x03, endpoint, 0x06, 0x00, 0x02],
                            ],
                        },
                        on_off_switch: {
                            getInputActions: (input: unknown, endpoint: Zh.Endpoint) => [
                                [input, 0x0d, endpoint, 0x06, 0x00, 0x01],
                                [input, 0x03, endpoint, 0x06, 0x00, 0x00],
                            ],
                        },
                        on: {
                            getInputActions: (input: unknown, endpoint: Zh.Endpoint) => [[input, 0x0d, endpoint, 0x06, 0x00, 0x01]],
                        },
                        off: {
                            getInputActions: (input: unknown, endpoint: Zh.Endpoint) => [[input, 0x0d, endpoint, 0x06, 0x00, 0x00]],
                        },
                        dimmer_single: {
                            getInputActions: (input: unknown, endpoint: Zh.Endpoint, template: KeyValue) => {
                                const moveUpCmd = template.no_onoff || template.no_onoff_up ? 0x01 : 0x05;
                                const moveDownCmd = template.no_onoff || template.no_onoff_down ? 0x01 : 0x05;
                                const moveRate = template.rate || 50;
                                return [
                                    [input, 0x07, endpoint, 0x06, 0x00, 0x02],
                                    [input, 0x86, endpoint, 0x08, 0x00, moveUpCmd, 0x00, moveRate],
                                    [input, 0xc6, endpoint, 0x08, 0x00, moveDownCmd, 0x01, moveRate],
                                    [input, 0x0b, endpoint, 0x08, 0x00, 0x03],
                                ];
                            },
                        },
                        dimmer_double: {
                            doubleInputs: true,
                            getInputActions: (inputs: unknown[], endpoint: Zh.Endpoint, template: KeyValue) => {
                                const moveUpCmd = template.no_onoff || template.no_onoff_up ? 0x01 : 0x05;
                                const moveDownCmd = template.no_onoff || template.no_onoff_down ? 0x01 : 0x05;
                                const moveRate = template.rate || 50;
                                return [
                                    [inputs[0], 0x07, endpoint, 0x06, 0x00, 0x01],
                                    [inputs[0], 0x06, endpoint, 0x08, 0x00, moveUpCmd, 0x00, moveRate],
                                    [inputs[0], 0x0b, endpoint, 0x08, 0x00, 0x03],
                                    [inputs[1], 0x07, endpoint, 0x06, 0x00, 0x00],
                                    [inputs[1], 0x06, endpoint, 0x08, 0x00, moveDownCmd, 0x01, moveRate],
                                    [inputs[1], 0x0b, endpoint, 0x08, 0x00, 0x03],
                                ];
                            },
                        },
                        cover: {
                            cover: true,
                            doubleInputs: true,
                            getInputActions: (inputs: unknown[], endpoint: Zh.Endpoint) => [
                                [inputs[0], 0x0d, endpoint, 0x02, 0x01, 0x00],
                                [inputs[0], 0x07, endpoint, 0x02, 0x01, 0x02],
                                [inputs[1], 0x0d, endpoint, 0x02, 0x01, 0x01],
                                [inputs[1], 0x07, endpoint, 0x02, 0x01, 0x02],
                            ],
                        },
                        cover_switch: {
                            cover: true,
                            doubleInputs: true,
                            getInputActions: (inputs: unknown[], endpoint: Zh.Endpoint) => [
                                [inputs[0], 0x0d, endpoint, 0x02, 0x01, 0x00],
                                [inputs[0], 0x03, endpoint, 0x02, 0x01, 0x02],
                                [inputs[1], 0x0d, endpoint, 0x02, 0x01, 0x01],
                                [inputs[1], 0x03, endpoint, 0x02, 0x01, 0x02],
                            ],
                        },
                        cover_up: {
                            cover: true,
                            getInputActions: (input: unknown, endpoint: Zh.Endpoint) => [[input, 0x0d, endpoint, 0x02, 0x01, 0x00]],
                        },
                        cover_down: {
                            cover: true,
                            getInputActions: (input: unknown, endpoint: Zh.Endpoint) => [[input, 0x0d, endpoint, 0x02, 0x01, 0x01]],
                        },
                        scene: {
                            scene: true,
                            getInputActions: (input: unknown, endpoint: Zh.Endpoint, groupId: number, sceneId: number) => [
                                [input, 0x07, endpoint, 0x05, 0x00, 0x05, groupId & 0xff, groupId >> 8, sceneId],
                            ],
                            getInputActions2: (input: unknown, endpoint: Zh.Endpoint, groupId: number, sceneId: number) => [
                                [input, 0x06, endpoint, 0x05, 0x00, 0x05, groupId & 0xff, groupId >> 8, sceneId],
                            ],
                        },
                        scene_switch: {
                            scene: true,
                            getInputActions: (input: unknown, endpoint: Zh.Endpoint, groupId: number, sceneId: number) => [
                                [input, 0x0d, endpoint, 0x05, 0x00, 0x05, groupId & 0xff, groupId >> 8, sceneId],
                            ],
                            getInputActions2: (input: unknown, endpoint: Zh.Endpoint, groupId: number, sceneId: number) => [
                                [input, 0x03, endpoint, 0x05, 0x00, 0x05, groupId & 0xff, groupId >> 8, sceneId],
                            ],
                        },
                    };

                    // first input
                    let input = 0;
                    // first client endpoint - depends on actual device
                    if (Array.isArray(meta.mapped)) throw new Error(`Not supported for groups`);
                    let endpoint = {S1: 2, S2: 3, D1: 2, J1: 2, C4: 1}[meta.mapped.model];
                    // default group id
                    let groupId = 0;

                    const templates = Array.isArray(value.input_action_templates) ? value.input_action_templates : [value.input_action_templates];
                    let resultingInputActions: unknown[] = [];
                    for (const template of templates) {
                        // @ts-expect-error
                        const templateType = templateTypes[template.type];
                        if (!templateType) {
                            throw new Error(
                                `input_action_templates: Template type '${template.type}' is not valid ` +
                                    `(valid types: ${Object.keys(templateTypes)})`,
                            );
                        }

                        if (template.hasOwnProperty('input')) {
                            input = template.input;
                        }
                        if (template.hasOwnProperty('endpoint')) {
                            endpoint = template.endpoint;
                        }
                        // C4 cover endpoints only start at 5
                        if (templateType.cover && meta.mapped.model === 'C4' && endpoint < 5) {
                            endpoint += 4;
                        }

                        let inputActions;
                        if (!templateType.doubleInputs) {
                            if (!templateType.scene) {
                                // single input, no scene(s)
                                inputActions = templateType.getInputActions(input, endpoint, template);
                            } else {
                                // scene(s) (always single input)
                                if (!template.hasOwnProperty('scene_id')) {
                                    throw new Error(`input_action_templates: Need an attribute 'scene_id' for '${template.type}'`);
                                }
                                if (template.hasOwnProperty('group_id')) {
                                    groupId = template.group_id;
                                }
                                inputActions = templateType.getInputActions(input, endpoint, groupId, template.scene_id);

                                if (template.hasOwnProperty('scene_id_2')) {
                                    if (template.hasOwnProperty('group_id_2')) {
                                        groupId = template.group_id_2;
                                    }
                                    inputActions = inputActions.concat(templateType.getInputActions2(input, endpoint, groupId, template.scene_id_2));
                                }
                            }
                        } else {
                            // double inputs
                            input = template.hasOwnProperty('inputs') ? template.inputs : [input, input + 1];
                            inputActions = templateType.getInputActions(input, endpoint, template);
                        }
                        resultingInputActions = resultingInputActions.concat(inputActions);

                        logger.warning(`ubisys: Using input(s) ${input} and endpoint ${endpoint} for '${template.type}'.`, NS);
                        // input might by now be an array (in case of double inputs)
                        input = (Array.isArray(input) ? Math.max(...input) : input) + 1;
                        endpoint += 1;
                    }

                    logger.debug(`ubisys: input_actions to be sent to '${meta.options.friendly_name}': ` + JSON.stringify(resultingInputActions), NS);
                    if (useWriteStruct) {
                        await devMgmtEp.writeStructured(
                            'manuSpecificUbisysDeviceSetup',
                            [
                                {
                                    attrId: attributeInputActions.ID,
                                    selector: {},
                                    dataType: Zcl.DataType.ARRAY,
                                    elementData: {
                                        elementType: Zcl.DataType.OCTET_STR,
                                        elements: resultingInputActions,
                                    },
                                },
                            ],
                            manufacturerOptions.ubisysNull,
                        );
                    } else {
                        await devMgmtEp.write(
                            'manuSpecificUbisysDeviceSetup',
                            {[attributeInputActions.name]: {elementType: Zcl.DataType.OCTET_STR, elements: resultingInputActions}},
                            manufacturerOptions.ubisysNull,
                        );
                    }
                }

                // re-read effective settings and dump them to the log
                await ubisys.tz.configure_device_setup.convertGet(entity, key, meta);
            },

            convertGet: async (entity, key, meta) => {
                const devMgmtEp = meta.device.getEndpoint(232);
                await devMgmtEp.read('manuSpecificUbisysDeviceSetup', ['inputConfigurations'], manufacturerOptions.ubisysNull);
                await devMgmtEp.read('manuSpecificUbisysDeviceSetup', ['inputActions'], manufacturerOptions.ubisysNull);
            },
        } satisfies Tz.Converter,
    },
};

const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ['S1 (5501)'],
        model: 'S1',
        vendor: 'Ubisys',
        description: 'Power switch S1',
        exposes: [
            e.switch(),
            e.action(['toggle', 'on', 'off', 'recall_*', 'brightness_move_up', 'brightness_move_down', 'brightness_stop']),
            e.power_on_behavior(),
            e.power().withAccess(ea.STATE_GET),
            e.energy().withAccess(ea.STATE_GET),
        ],
        fromZigbee: [
            fz.on_off,
            fz.metering,
            fz.command_toggle,
            fz.command_on,
            fz.command_off,
            fz.command_recall,
            fz.command_move,
            fz.command_stop,
            fz.power_on_behavior,
            ubisys.fz.configure_device_setup,
        ],
        toZigbee: [tz.on_off, tz.metering_power, tz.currentsummdelivered, ubisys.tz.configure_device_setup, tz.power_on_behavior],
        endpoint: (device) => {
            return {l1: 1, s1: 2, meter: 3};
        },
        meta: {multiEndpointEnforce: {power: 3, energy: 3}},
        extend: [ubisysModernExtend.addCustomClusterManuSpecificUbisysDeviceSetup()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        onEvent: async (type, data, device) => {
            /*
             * As per technical doc page 18 section 7.3.4
             * https://www.ubisys.de/wp-content/uploads/ubisys-s1-technical-reference.pdf
             *
             * This cluster uses the binding table for managing command targets.
             * When factory fresh, this cluster is bound to endpoint #1 to
             * enable local control.
             *
             * We use addBinding to 'record' this default binding.
             */
            if (type === 'deviceInterview') {
                const ep1 = device.getEndpoint(1);
                const ep2 = device.getEndpoint(2);
                ep2.addBinding('genOnOff', ep1);
            } else {
                await ubisysOnEventReadCurrentSummDelivered(type, data, device);
            }
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['S1-R (5601)'],
        model: 'S1-R',
        vendor: 'Ubisys',
        description: 'Power switch S1-R',
        exposes: [
            e.switch(),
            e.action(['toggle', 'on', 'off', 'recall_*', 'brightness_move_up', 'brightness_move_down', 'brightness_stop']),
            e.power_on_behavior(),
            e.power().withAccess(ea.STATE_GET),
            e.energy().withAccess(ea.STATE_GET),
        ],
        fromZigbee: [
            fz.on_off,
            fz.metering,
            fz.command_toggle,
            fz.command_on,
            fz.command_off,
            fz.command_recall,
            fz.command_move,
            fz.command_stop,
            fz.power_on_behavior,
            ubisys.fz.configure_device_setup,
        ],
        toZigbee: [tz.on_off, tz.metering_power, tz.currentsummdelivered, ubisys.tz.configure_device_setup, tz.power_on_behavior],
        meta: {multiEndpointEnforce: {power: 4, energy: 4}},
        endpoint: (device) => {
            return {l1: 1, s1: 2, meter: 4};
        },
        extend: [ubisysModernExtend.addCustomClusterManuSpecificUbisysDeviceSetup()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(4);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        onEvent: async (type, data, device) => {
            /*
             * As per technical doc page 18 section 7.3.4
             * https://www.ubisys.de/wp-content/uploads/ubisys-s1-technical-reference.pdf
             *
             * This cluster uses the binding table for managing command targets.
             * When factory fresh, this cluster is bound to endpoint #1 to
             * enable local control.
             *
             * We use addBinding to 'record' this default binding.
             */
            if (type === 'deviceInterview') {
                const ep1 = device.getEndpoint(1);
                const ep2 = device.getEndpoint(2);
                ep2.addBinding('genOnOff', ep1);
            } else {
                await ubisysOnEventReadCurrentSummDelivered(type, data, device);
            }
        },
        ota: ota.ubisys,
    },
    {
        // S1-R Series 2 uses the same modelId as the regular S1-R, but the energy clusters are located in endpoint 1 (instead of 4, like the regular S1-R).
        fingerprint: [
            {
                manufacturerName: 'ubisys',
                modelID: 'S1-R (5601)',
                endpoints: [
                    {ID: 1, profileID: 260, deviceID: 266, inputClusters: [0, 3, 4, 5, 6, 1794, 2820], outputClusters: []},
                    {ID: 2, profileID: 260, deviceID: 260, inputClusters: [0, 3], outputClusters: [3, 5, 6, 8, 768, 64514]},
                    {ID: 3, profileID: 260, deviceID: 260, inputClusters: [0, 3], outputClusters: [3, 5, 6, 8, 768, 64514]},
                    {ID: 232, profileID: 260, deviceID: 1287, inputClusters: [0, 61, 64512, 64599], outputClusters: [3, 25]},
                    {ID: 242, profileID: 41440, deviceID: 97, inputClusters: [], outputClusters: [33]},
                ],
            },
        ],
        model: 'S1-R-2',
        vendor: 'ubisys',
        description: 'Power switch S1-R (Series 2)',
        extend: [
            deviceEndpoints({endpoints: {'1': 1, '2': 2, '3': 3, '232': 232}, multiEndpointSkip: ['state', 'power', 'energy']}),
            identify(),
            onOff({powerOnBehavior: false}),
            electricityMeter({cluster: 'metering', configureReporting: false}),
            commandsOnOff({endpointNames: ['2', '3']}),
            commandsLevelCtrl({endpointNames: ['2', '3']}),
            commandsColorCtrl({endpointNames: ['2', '3']}),
        ],
        options: [exposes.options.measurement_poll_interval()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        onEvent: async (type, data, device, settings) => {
            /*
             * As per technical doc page 18 section 7.3.4
             * https://www.ubisys.de/wp-content/uploads/ubisys-s1-technical-reference.pdf
             *
             * This cluster uses the binding table for managing command targets.
             * When factory fresh, this cluster is bound to endpoint #1 to
             * enable local control.
             *
             * We use addBinding to 'record' this default binding.
             */
            if (type === 'deviceInterview') {
                const ep1 = device.getEndpoint(1);
                const ep2 = device.getEndpoint(2);
                ep2.addBinding('genOnOff', ep1);
            } else {
                await ubisysPollCurrentSummDelivered(type, data, device, 1, settings);
            }
        },
    },
    {
        zigbeeModel: ['S2 (5502)', 'S2-R (5602)'],
        model: 'S2',
        vendor: 'Ubisys',
        description: 'Power switch S2',
        exposes: [
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            e.action([
                'toggle_s1',
                'toggle_s2',
                'on_s1',
                'on_s2',
                'off_s1',
                'off_s2',
                'recall_*_s1',
                'recal_*_s2',
                'brightness_move_up_s1',
                'brightness_move_up_s2',
                'brightness_move_down_s1',
                'brightness_move_down_s2',
                'brightness_stop_s1',
                'brightness_stop_s2',
            ]),
            e.power_on_behavior().withEndpoint('l1'),
            e.power_on_behavior().withEndpoint('l2'),
            e.power().withAccess(ea.STATE_GET),
            e.energy().withAccess(ea.STATE_GET),
        ],
        fromZigbee: [
            fz.on_off,
            fz.metering,
            fz.command_toggle,
            fz.command_on,
            fz.command_off,
            fz.command_recall,
            fz.command_move,
            fz.command_stop,
            fz.power_on_behavior,
            ubisys.fz.configure_device_setup,
        ],
        toZigbee: [tz.on_off, tz.metering_power, ubisys.tz.configure_device_setup, tz.power_on_behavior, tz.currentsummdelivered],
        endpoint: (device) => {
            return {l1: 1, l2: 2, s1: 3, s2: 4, meter: 5};
        },
        meta: {multiEndpoint: true, multiEndpointSkip: ['power', 'energy'], multiEndpointEnforce: {power: 5, energy: 5}},
        extend: [ubisysModernExtend.addCustomClusterManuSpecificUbisysDeviceSetup()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(5);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        onEvent: async (type, data, device) => {
            /*
             * As per technical doc page 20 section 7.4.4 and
             *                      page 22 section 7.5.4
             * https://www.ubisys.de/wp-content/uploads/ubisys-s2-technical-reference.pdf
             *
             * This cluster uses the binding table for managing command targets.
             * When factory fresh, this cluster is bound to endpoint #1 to
             * enable local control.
             *
             * This cluster uses the binding table for managing command targets.
             * When factory fresh, this cluster is bound to endpoint #2 to
             * enable local control
             *
             * We use addBinding to 'record' this default binding.
             */
            if (type === 'deviceInterview') {
                const ep1 = device.getEndpoint(1);
                const ep2 = device.getEndpoint(2);
                const ep3 = device.getEndpoint(3);
                const ep4 = device.getEndpoint(4);
                ep3.addBinding('genOnOff', ep1);
                ep4.addBinding('genOnOff', ep2);
            } else {
                await ubisysOnEventReadCurrentSummDelivered(type, data, device);
            }
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['D1 (5503)', 'D1-R (5603)'],
        model: 'D1',
        vendor: 'Ubisys',
        description: 'Universal dimmer D1',
        fromZigbee: [
            fz.on_off,
            fz.brightness,
            fz.metering,
            fz.command_toggle,
            fz.command_on,
            fz.command_off,
            fz.command_recall,
            fz.command_move,
            fz.command_stop,
            fz.lighting_ballast_configuration,
            fz.level_config,
            ubisys.fz.dimmer_setup,
            ubisys.fz.dimmer_setup_genLevelCtrl,
            ubisys.fz.configure_device_setup,
        ],
        toZigbee: [
            tz.light_onoff_brightness,
            tz.ballast_config,
            tz.level_config,
            ubisys.tz.dimmer_setup,
            ubisys.tz.dimmer_setup_genLevelCtrl,
            ubisys.tz.configure_device_setup,
            tz.ignore_transition,
            tz.light_brightness_move,
            tz.light_brightness_step,
            tz.metering_power,
            tz.currentsummdelivered,
        ],
        exposes: [
            e.action([
                'toggle_s1',
                'toggle_s2',
                'on_s1',
                'on_s2',
                'off_s1',
                'off_s2',
                'recall_*_s1',
                'recal_*_s2',
                'brightness_move_up_s1',
                'brightness_move_up_s2',
                'brightness_move_down_s1',
                'brightness_move_down_s2',
                'brightness_stop_s1',
                'brightness_stop_s2',
            ]),
            e.light_brightness(),
            e
                .composite('level_config', 'level_config', ea.ALL)
                .withFeature(
                    e
                        .numeric('on_off_transition_time', ea.ALL)
                        .withDescription(
                            'Specifies the amount of time, in units of 0.1 seconds, which will be used during a transition to ' +
                                'either the on or off state, when an on/off/toggle command of the on/off cluster is used to turn the light on or off',
                        ),
                )
                .withFeature(
                    e
                        .numeric('on_level', ea.ALL)
                        .withValueMin(1)
                        .withValueMax(254)
                        .withPreset('previous', 255, 'Use previous value')
                        .withDescription('Specifies the level that shall be applied, when an on/toggle command causes the light to turn on.'),
                )
                .withFeature(
                    e
                        .binary('execute_if_off', ea.ALL, true, false)
                        .withDescription('Defines if you can send a brightness change without to turn on the light'),
                )
                .withFeature(
                    e
                        .numeric('current_level_startup', ea.ALL)
                        .withValueMin(1)
                        .withValueMax(254)
                        .withPreset('previous', 255, 'Use previous value')
                        .withDescription('Specifies the initial level to be applied after the device is supplied with power'),
                ),
            e.power().withAccess(ea.STATE_GET),
            e.energy().withAccess(ea.STATE_GET),
            e
                .numeric('ballast_minimum_level', ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription('Specifies the minimum light output of the ballast'),
            e
                .numeric('ballast_maximum_level', ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription('Specifies the maximum light output of the ballast'),
            e
                .numeric('minimum_on_level', ea.ALL)
                .withValueMin(0)
                .withValueMax(255)
                .withDescription(
                    'Specifies the minimum level that shall be applied, when an on/toggle command causes the ' +
                        'light to turn on. When this attribute is set to the invalid value (255) this feature is disabled ' +
                        'and standard rules apply: The light will either return to the previously active level (before it ' +
                        'was turned off) if the OnLevel attribute is set to the invalid value (255/previous); or to the specified ' +
                        'value of the OnLevel attribute if this value is in the range 0…254. Otherwise, if the ' +
                        'MinimumOnLevel is in the range 0…254, the light will be set to the the previously ' +
                        'active level (before it was turned off), or the value specified here, whichever is the larger ' +
                        'value. For example, if the previous level was 30 and the MinimumOnLevel was 40 then ' +
                        'the light would turn on and move to level 40. Conversely, if the previous level was 50, ' +
                        'and the MinimumOnLevel was 40, then the light would turn on and move to level 50.',
                ),
            e.binary('capabilities_forward_phase_control', ea.ALL, true, false).withDescription('The dimmer supports AC forward phase control.'),
            e.binary('capabilities_reverse_phase_control', ea.ALL, true, false).withDescription('The dimmer supports AC reverse phase control.'),
            e
                .binary('capabilities_reactance_discriminator', ea.ALL, true, false)
                .withDescription('The dimmer is capable of measuring the reactanceto distinguish inductive and capacitive loads.'),
            e
                .binary('capabilities_configurable_curve', ea.ALL, true, false)
                .withDescription('The dimmer is capable of replacing the built-in, default dimming curve.'),
            e
                .binary('capabilities_overload_detection', ea.ALL, true, false)
                .withDescription('The dimmer is capable of detecting an output overload and shutting the output off.'),
            e
                .binary('status_forward_phase_control', ea.ALL, true, false)
                .withDescription('The dimmer is currently operating in AC forward phase control mode.'),
            e
                .binary('status_reverse_phase_control', ea.ALL, true, false)
                .withDescription('The dimmer is currently operating in AC reverse phase control mode.'),
            e
                .binary('status_overload', ea.ALL, true, false)
                .withDescription('The output is currently turned off, because the dimmer has detected an overload.'),
            e
                .binary('status_capacitive_load', ea.ALL, true, false)
                .withDescription("The dimmer's reactance discriminator had detected a capacitive load."),
            e
                .binary('status_inductive_load', ea.ALL, true, false)
                .withDescription("The dimmer's reactance discriminator had detected an inductive load."),
            e.enum('mode_phase_control', ea.ALL, ['automatic', 'forward', 'reverse']).withDescription('Configures the dimming technique.'),
        ],
        extend: [
            ubisysModernExtend.addCustomClusterManuSpecificUbisysDeviceSetup(),
            ubisysModernExtend.addCustomClusterManuSpecificUbisysDimmerSetup(),
            ubisysModernExtend.addCustomClusterGenLevelCtrl(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(4);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
        meta: {multiEndpoint: true, multiEndpointSkip: ['state', 'brightness', 'power', 'energy'], multiEndpointEnforce: {power: 4, energy: 4}},
        endpoint: (device) => {
            return {default: 1, s1: 2, s2: 3, meter: 4};
        },
        onEvent: async (type, data, device) => {
            /*
             * As per technical doc page 23 section 7.3.4, 7.3.5
             * https://www.ubisys.de/wp-content/uploads/ubisys-d1-technical-reference.pdf
             *
             * We use addBinding to 'record' this default binding.
             */
            if (type === 'deviceInterview') {
                const ep1 = device.getEndpoint(1);
                const ep2 = device.getEndpoint(2);
                ep2.addBinding('genOnOff', ep1);
                ep2.addBinding('genLevelCtrl', ep1);
            } else {
                await ubisysOnEventReadCurrentSummDelivered(type, data, device);
            }
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['J1 (5502)', 'J1-R (5602)'],
        model: 'J1',
        vendor: 'Ubisys',
        description: 'Shutter control J1',
        fromZigbee: [fz.cover_position_tilt, fz.metering, ubisys.fz.configure_device_setup],
        toZigbee: [
            tz.cover_state,
            tz.cover_position_tilt,
            tz.metering_power,
            ubisys.tz.configure_j1,
            ubisys.tz.configure_device_setup,
            tz.currentsummdelivered,
        ],
        exposes: (device, options) => {
            const coverExpose = e.cover();
            const coverType = device?.getEndpoint(1).getClusterAttributeValue('closuresWindowCovering', 'windowCoveringType') ?? undefined;
            switch (
                coverType // cf. Ubisys J1 Technical Reference Manual, chapter 7.2.5.1 Calibration
            ) {
                case 0: // Roller Shade, Lift only
                case 1: // Roller Shade two motors, Lift only
                case 2: // Roller Shade exterior, Lift only
                case 3: // Roller Shade two motors exterior, Lift only
                case 4: // Drapery, Lift only
                case 5: // Awning, Lift only
                case 9: // Projector Screen, Lift only
                    coverExpose.withPosition();
                    break;
                case 6: // Shutter, Tilt only
                case 7: // Tilt Blind, Tilt only
                    coverExpose.withTilt();
                    break;
                case 8: // Tilt Blind, Lift & Tilt
                default:
                    coverExpose.withPosition().withTilt();
                    break;
            }
            return [coverExpose, e.power().withAccess(ea.STATE_GET), e.energy().withAccess(ea.STATE_GET), e.linkquality()];
        },
        extend: [ubisysModernExtend.addCustomClusterManuSpecificUbisysDeviceSetup(), ubisysModernExtend.addCustomClusterClosuresWindowCovering()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint3);
            await reporting.instantaneousDemand(endpoint3);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint1);
        },
        endpoint: (device) => {
            return {default: 1, meter: 3};
        },
        meta: {multiEndpointEnforce: {power: 3, energy: 3}},
        onEvent: async (type, data, device) => {
            /*
             * As per technical doc page 21 section 7.3.4
             * https://www.ubisys.de/wp-content/uploads/ubisys-j1-technical-reference.pdf
             *
             * We use addBinding to 'record' this default binding.
             */
            if (type === 'deviceInterview') {
                const ep1 = device.getEndpoint(1);
                const ep2 = device.getEndpoint(2);
                ep2.addBinding('closuresWindowCovering', ep1);
            } else {
                await ubisysOnEventReadCurrentSummDelivered(type, data, device);
            }
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['C4 (5504)'],
        model: 'C4',
        vendor: 'Ubisys',
        description: 'Control unit C4',
        fromZigbee: [
            fz.command_toggle,
            fz.command_on,
            fz.command_off,
            fz.command_recall,
            fz.command_move,
            fz.command_stop,
            legacy.fz.ubisys_c4_cover,
            ubisys.fz.configure_device_setup,
        ],
        toZigbee: [ubisys.tz.configure_device_setup],
        exposes: [
            e.action([
                'toggle_s1',
                'toggle_s2',
                'toggle_s3',
                'toggle_s4',
                'on_s1',
                'on_s2',
                'on_s3',
                'on_s4',
                'off_s1',
                'off_s2',
                'off_s3',
                'off_s4',
                'recall_*_s1',
                'recal_*_s2',
                'recall_*_s3',
                'recal_*_s4',
                'brightness_move_up_s1',
                'brightness_move_up_s2',
                'brightness_move_up_s3',
                'brightness_move_up_s4',
                'brightness_move_down_s1',
                'brightness_move_down_s2',
                'brightness_move_down_s3',
                'brightness_move_down_s4',
                'brightness_stop_s1',
                'brightness_stop_s2',
                'brightness_stop_s3',
                'brightness_stop_s4',
                'cover_open_s5',
                'cover_close_s5',
                'cover_stop_s5',
                'cover_open_s6',
                'cover_close_s6',
                'cover_stop_s6',
            ]),
        ],
        extend: [ubisysModernExtend.addCustomClusterManuSpecificUbisysDeviceSetup()],
        configure: async (device, coordinatorEndpoint) => {
            for (const ep of [1, 2, 3, 4]) {
                await reporting.bind(device.getEndpoint(ep), coordinatorEndpoint, ['genScenes', 'genOnOff', 'genLevelCtrl']);
            }
            for (const ep of [5, 6]) {
                await reporting.bind(device.getEndpoint(ep), coordinatorEndpoint, ['genScenes', 'closuresWindowCovering']);
            }
        },
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {s1: 1, s2: 2, s3: 3, s4: 4, s5: 5, s6: 6};
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['H1'],
        model: 'H1',
        vendor: 'Ubisys',
        description: 'Heating regulator',
        meta: {thermostat: {dontMapPIHeatingDemand: true}},
        fromZigbee: [fz.battery, fz.thermostat, fz.thermostat_weekly_schedule],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule,
            tz.thermostat_running_mode,
            tz.thermostat_pi_heating_demand,
            tz.battery_percentage_remaining,
        ],
        exposes: [
            e.battery().withAccess(ea.STATE_GET),
            e
                .climate()
                .withSystemMode(['off', 'heat'], ea.ALL)
                .withRunningMode(['off', 'heat'])
                .withSetpoint('occupied_heating_setpoint', 7, 30, 0.5)
                .withSetpoint('unoccupied_heating_setpoint', 7, 30, 0.5)
                .withLocalTemperature()
                .withPiHeatingDemand(ea.STATE_GET)
                .withWeeklySchedule(['heat']),
        ],
        extend: [
            ubisysModernExtend.addCustomClusterHvacThermostat(),
            ubisysModernExtend.openWindowState(),
            ubisysModernExtend.vacationMode(),
            ubisysModernExtend.localTemperatureOffset(),
            ubisysModernExtend.occupiedHeatingSetpointDefault(),
            ubisysModernExtend.remoteTemperatureDuration(),
            ubisysModernExtend.openWindowDetect(),
            ubisysModernExtend.openWindowTimeout(),
            ubisysModernExtend.openWindowDetectionPeriod(),
            ubisysModernExtend.openWindowSensitivity(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ['genBasic', 'genPowerCfg', 'genTime', 'hvacThermostat'];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);

            // reporting
            // NOTE: temperature is 0.5 deg steps
            // NOTE: unoccupied_heating_setpoint cannot be set via the device itself
            //       so we do not need to setup reporting for this, as reporting slots
            //       seem to be limited.
            await reporting.thermostatSystemMode(endpoint);
            await reporting.thermostatRunningMode(endpoint);
            await reporting.thermostatTemperature(endpoint, {min: 0, max: constants.repInterval.HOUR, change: 50});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint, {min: 0, max: constants.repInterval.HOUR, change: 50});
            await reporting.thermostatPIHeatingDemand(endpoint, {min: 15, max: constants.repInterval.HOUR, change: 1});
            await reporting.batteryPercentageRemaining(endpoint, {min: constants.repInterval.HOUR, max: 43200, change: 1});

            // read attributes
            // NOTE: configuring reporting on hvacThermostat seems to trigger an immediate
            //       report, so the values are available after configure has run.
            //       this does not seem to be the case for genPowerCfg, so we read
            //       the battery percentage
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);

            // write attributes
            // NOTE: device checks in every 1h once the device has entered deepsleep
            //       this might be a bit long if you want to set the temperature remotely
            //       update this to every 15 minutes. (value is in 1/4th of a second)
            await endpoint.write('genPollCtrl', {checkinInterval: 4 * 60 * 15});
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['H10'],
        model: 'H10',
        vendor: 'Ubisys',
        description: 'Heatingcontrol 10-Way',
        meta: {thermostat: {dontMapPIHeatingDemand: true}, multiEndpoint: true},
        fromZigbee: [fz.on_off, fz.thermostat, fz.thermostat_weekly_schedule],
        toZigbee: [
            tz.on_off,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_local_temperature,
            tz.thermostat_system_mode,
            tz.thermostat_weekly_schedule,
            tz.thermostat_clear_weekly_schedule,
            tz.thermostat_running_mode,
            tz.thermostat_pi_heating_demand,
        ],
        endpoint: (device) => {
            return {
                l1: 11,
                l2: 12,
                l3: 13,
                l4: 14,
                l5: 15,
                l6: 16,
                l7: 17,
                l8: 18,
                l9: 19,
                l10: 20,
                default: 21,
            };
        },
        exposes: [
            e.switch().withEndpoint('l1'),
            e.switch().withEndpoint('l2'),
            e.switch().withEndpoint('l3'),
            e.switch().withEndpoint('l4'),
            e.switch().withEndpoint('l5'),
            e.switch().withEndpoint('l6'),
            e.switch().withEndpoint('l7'),
            e.switch().withEndpoint('l8'),
            e.switch().withEndpoint('l9'),
            e.switch().withEndpoint('l10'),
        ],
        extend: [ubisysModernExtend.addCustomClusterHvacThermostat(), ubisysModernExtend.addCustomClusterGenLevelCtrl()],
        configure: async (device, coordinatorEndpoint) => {
            // setup ep 11-20 as on/off switches
            const heaterCoolerBinds = ['genOnOff'];
            for (let ep = 11; ep <= 20; ep++) {
                const endpoint = device.getEndpoint(ep);
                await reporting.bind(endpoint, coordinatorEndpoint, heaterCoolerBinds);
                await reporting.onOff(endpoint);
            }
        },
    },
    {
        zigbeeModel: ['R0 (5501)'],
        model: 'R0',
        vendor: 'Ubisys',
        description: 'Zigbee Router',
        fromZigbee: [fz.linkquality_from_basic],
        toZigbee: [],
        exposes: [],
        ota: ota.ubisys,
    },
];

export default definitions;
module.exports = definitions;
