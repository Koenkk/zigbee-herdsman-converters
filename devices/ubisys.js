const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const ota = require('../lib/ota');
const utils = require('../lib/utils');
const reporting = require('../lib/reporting');
const constants = require('../lib/constants');
const herdsman = require('zigbee-herdsman');
const e = exposes.presets;
const ea = exposes.access;

const manufacturerOptions = {
    /*
     * Ubisys doesn't accept a manufacturerCode on some commands
     * This bug has been reported, but it has not been fixed:
     * https://github.com/Koenkk/zigbee-herdsman/issues/52
     */
    ubisys: {manufacturerCode: herdsman.Zcl.ManufacturerCode.UBISYS},
    ubisysNull: {manufacturerCode: null},
    tint: {manufacturerCode: herdsman.Zcl.ManufacturerCode.MUELLER_LICHT_INT},
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
                        mode_phase_control: phaseControlValues[phaseControl],
                    };
                }
            },
        },
        dimmer_setup_genLevelCtrl: {
            cluster: 'genLevelCtrl',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                if (msg.data.hasOwnProperty('ubisysMinimumOnLevel')) {
                    return {minimum_on_level: msg.data.ubisysMinimumOnLevel};
                }
            },
        },
        configure_device_setup: {
            cluster: 'manuSpecificUbisysDeviceSetup',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                const result = {};
                if (msg.data.hasOwnProperty('input_configurations')) {
                    result['input_configurations'] = msg.data['input_configurations'];
                }
                if (msg.data.hasOwnProperty('inputActions')) {
                    result['input_actions'] = msg.data['inputActions'].map(function(el) {
                        return Object.values(el);
                    });
                }
                return {configure_device_setup: result};
            },
        },
        thermostat_vacation_mode: {
            cluster: 'hvacThermostat',
            type: ['attributeReport', 'readResponse'],
            convert: (model, msg, publish, options, meta) => {
                if (msg.data.hasOwnProperty('ocupancy')) {
                    return {vacation_mode: msg.data.ocupancy === 0};
                }
            },
        },
    },
    tz: {
        configure_j1: {
            key: ['configure_j1'],
            convertSet: async (entity, key, value, meta) => {
                const log = (message) => {
                    meta.logger.warn(`ubisys: ${message}`);
                };
                const sleepSeconds = async (s) => {
                    return new Promise((resolve) => setTimeout(resolve, s * 1000));
                };
                const waitUntilStopped = async () => {
                    let operationalStatus = 0;
                    do {
                        await sleepSeconds(2);
                        operationalStatus = (await entity.read('closuresWindowCovering',
                            ['operationalStatus'])).operationalStatus;
                    } while (operationalStatus != 0);
                    await sleepSeconds(2);
                };
                const writeAttrFromJson = async (attr, jsonAttr = attr, converterFunc, delaySecondsAfter) => {
                    if (jsonAttr.startsWith('ubisys')) {
                        jsonAttr = jsonAttr.substring(6, 1).toLowerCase + jsonAttr.substring(7);
                    }
                    if (value.hasOwnProperty(jsonAttr)) {
                        let attrValue = value[jsonAttr];
                        if (converterFunc) {
                            attrValue = converterFunc(attrValue);
                        }
                        const attributes = {};
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
                let mode = (await entity.read('closuresWindowCovering', ['windowCoveringMode'])).windowCoveringMode;
                const modeCalibrationBitMask = 0x02;
                if (mode & modeCalibrationBitMask) {
                    await entity.write('closuresWindowCovering', {windowCoveringMode: mode & ~modeCalibrationBitMask});
                    await sleepSeconds(2);
                }
                // delay a bit if reconfiguring basic configuration attributes
                await writeAttrFromJson('windowCoveringType', undefined, undefined, 2);
                await writeAttrFromJson('configStatus', undefined, undefined, 2);
                if (await writeAttrFromJson('windowCoveringMode', undefined, undefined, 2)) {
                    mode = value['windowCoveringMode'];
                }
                if (hasCalibrate) {
                    log('Cover calibration starting...');
                    // first of all, move to top position to not confuse calibration later
                    log('  Moving cover to top position to get a good starting point...');
                    await entity.command('closuresWindowCovering', 'upOpen');
                    await waitUntilStopped();
                    log('  Settings some attributes...');
                    // reset attributes
                    await entity.write('closuresWindowCovering', {
                        installedOpenLimitLiftCm: 0,
                        installedClosedLimitLiftCm: 240,
                        installedOpenLimitTiltDdegree: 0,
                        installedClosedLimitTiltDdegree: 900,
                        ubisysLiftToTiltTransitionSteps: 0xffff,
                        ubisysTotalSteps: 0xffff,
                        ubisysLiftToTiltTransitionSteps2: 0xffff,
                        ubisysTotalSteps2: 0xffff,
                    }, manufacturerOptions.ubisys);
                    // enable calibration mode
                    await sleepSeconds(2);
                    await entity.write('closuresWindowCovering', {windowCoveringMode: mode | modeCalibrationBitMask});
                    await sleepSeconds(2);
                    // move down a bit and back up to detect upper limit
                    log('  Moving cover down a bit...');
                    await entity.command('closuresWindowCovering', 'downClose');
                    await sleepSeconds(5);
                    await entity.command('closuresWindowCovering', 'stop');
                    await sleepSeconds(2);
                    log('  Moving up again to detect upper limit...');
                    await entity.command('closuresWindowCovering', 'upOpen');
                    await waitUntilStopped();
                    log('  Moving down to count steps from open to closed...');
                    await entity.command('closuresWindowCovering', 'downClose');
                    await waitUntilStopped();
                    log('  Moving up to count steps from closed to open...');
                    await entity.command('closuresWindowCovering', 'upOpen');
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
                await writeAttrFromJson('ubisysTotalSteps', 'open_to_closed_s', (s) => s * stepsPerSecond);
                await writeAttrFromJson('ubisysTotalSteps2', 'closed_to_open_s', (s) => s * stepsPerSecond);
                await writeAttrFromJson('ubisysLiftToTiltTransitionSteps', 'lift_to_tilt_transition_ms',
                    (s) => s * stepsPerSecond / 1000);
                await writeAttrFromJson('ubisysLiftToTiltTransitionSteps2', 'lift_to_tilt_transition_ms',
                    (s) => s * stepsPerSecond / 1000);
                if (hasCalibrate) {
                    log('  Finalizing calibration...');
                    // disable calibration mode again
                    await sleepSeconds(2);
                    await entity.write('closuresWindowCovering', {windowCoveringMode: mode & ~modeCalibrationBitMask});
                    await sleepSeconds(2);
                    // re-read and dump all relevant attributes
                    log('  Done - will now read back the results.');
                    ubisys.tz.configure_j1.convertGet(entity, key, meta);
                }
            },
            convertGet: async (entity, key, meta) => {
                const log = (json) => {
                    meta.logger.warn(`ubisys: Cover configuration read: ${JSON.stringify(json)}`);
                };
                log(await entity.read('closuresWindowCovering', [
                    'windowCoveringType',
                    'physicalClosedLimitLiftCm',
                    'physicalClosedLimitTiltDdegree',
                    'installedOpenLimitLiftCm',
                    'installedClosedLimitLiftCm',
                    'installedOpenLimitTiltDdegree',
                    'installedClosedLimitTiltDdegree',
                ]));
                log(await entity.read('closuresWindowCovering', [
                    'configStatus',
                    'windowCoveringMode',
                    'currentPositionLiftPercentage',
                    'currentPositionLiftCm',
                    'currentPositionTiltPercentage',
                    'currentPositionTiltDdegree',
                    'operationalStatus',
                ]));
                log(await entity.read('closuresWindowCovering', [
                    'ubisysTurnaroundGuardTime',
                    'ubisysLiftToTiltTransitionSteps',
                    'ubisysTotalSteps',
                    'ubisysLiftToTiltTransitionSteps2',
                    'ubisysTotalSteps2',
                    'ubisysAdditionalSteps',
                    'ubisysInactivePowerThreshold',
                    'ubisysStartupSteps',
                ], manufacturerOptions.ubisys));
            },
        },
        dimmer_setup: {
            key: ['capabilities_forward_phase_control',
                'capabilities_reverse_phase_control',
                'capabilities_reactance_discriminator',
                'capabilities_configurable_curve',
                'capabilities_overload_detection',
                'status_forward_phase_control',
                'status_reverse_phase_control',
                'status_overload',
                'status_capacitive_load',
                'status_inductive_load',
                'mode_phase_control'],
            convertSet: async (entity, key, value, meta) => {
                if (key === 'mode_phase_control') {
                    const phaseControl = value.toLowerCase();
                    const phaseControlValues = {'automatic': 0, 'forward': 1, 'reverse': 2};
                    utils.validateValue(phaseControl, Object.keys(phaseControlValues));
                    await entity.write('manuSpecificUbisysDimmerSetup',
                        {'mode': phaseControlValues[phaseControl]}, manufacturerOptions.ubisysNull);
                }
                ubisys.tz.dimmer_setup.convertGet(entity, key, meta);
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('manuSpecificUbisysDimmerSetup', ['capabilities'], manufacturerOptions.ubisysNull);
                await entity.read('manuSpecificUbisysDimmerSetup', ['status'], manufacturerOptions.ubisysNull);
                await entity.read('manuSpecificUbisysDimmerSetup', ['mode'], manufacturerOptions.ubisysNull);
            },
        },
        dimmer_setup_genLevelCtrl: {
            key: ['minimum_on_level'],
            convertSet: async (entity, key, value, meta) => {
                if (key === 'minimum_on_level') {
                    await entity.write('genLevelCtrl', {'ubisysMinimumOnLevel': value}, manufacturerOptions.ubisys);
                }
                ubisys.tz.dimmer_setup_genLevelCtrl.convertGet(entity, key, meta);
            },
            convertGet: async (entity, key, meta) => {
                await entity.read('genLevelCtrl', ['ubisysMinimumOnLevel'], manufacturerOptions.ubisys);
            },
        },
        configure_device_setup: {
            key: ['configure_device_setup'],
            convertSet: async (entity, key, value, meta) => {
                const devMgmtEp = meta.device.getEndpoint(232);

                if (value.hasOwnProperty('input_configurations')) {
                    // example: [0, 0, 0, 0]
                    await devMgmtEp.write(
                        'manuSpecificUbisysDeviceSetup',
                        {'inputConfigurations': {elementType: 'data8', elements: value.input_configurations}},
                        manufacturerOptions.ubisysNull,
                    );
                }

                if (value.hasOwnProperty('input_actions')) {
                    // example (default for C4): [[0,13,1,6,0,2], [1,13,2,6,0,2], [2,13,3,6,0,2], [3,13,4,6,0,2]]
                    await devMgmtEp.write(
                        'manuSpecificUbisysDeviceSetup',
                        {'inputActions': {elementType: 'octetStr', elements: value.input_actions}},
                        manufacturerOptions.ubisysNull,
                    );
                }

                if (value.hasOwnProperty('input_action_templates')) {
                    const templateTypes = {
                        // source: "ZigBee Device Physical Input Configurations Integrator’s Guide"
                        // (can be obtained directly from ubisys upon request)
                        'toggle': {
                            getInputActions: (input, endpoint) => [
                                [input, 0x0D, endpoint, 0x06, 0x00, 0x02],
                            ],
                        },
                        'toggle_switch': {
                            getInputActions: (input, endpoint) => [
                                [input, 0x0D, endpoint, 0x06, 0x00, 0x02],
                                [input, 0x03, endpoint, 0x06, 0x00, 0x02],
                            ],
                        },
                        'on_off_switch': {
                            getInputActions: (input, endpoint) => [
                                [input, 0x0D, endpoint, 0x06, 0x00, 0x01],
                                [input, 0x03, endpoint, 0x06, 0x00, 0x00],
                            ],
                        },
                        'on': {
                            getInputActions: (input, endpoint) => [
                                [input, 0x0D, endpoint, 0x06, 0x00, 0x01],
                            ],
                        },
                        'off': {
                            getInputActions: (input, endpoint) => [
                                [input, 0x0D, endpoint, 0x06, 0x00, 0x00],
                            ],
                        },
                        'dimmer_single': {
                            getInputActions: (input, endpoint, template) => {
                                const moveUpCmd = template.no_onoff || template.no_onoff_up ? 0x01 : 0x05;
                                const moveDownCmd = template.no_onoff || template.no_onoff_down ? 0x01 : 0x05;
                                const moveRate = template.rate || 50;
                                return [
                                    [input, 0x07, endpoint, 0x06, 0x00, 0x02],
                                    [input, 0x86, endpoint, 0x08, 0x00, moveUpCmd, 0x00, moveRate],
                                    [input, 0xC6, endpoint, 0x08, 0x00, moveDownCmd, 0x01, moveRate],
                                    [input, 0x0B, endpoint, 0x08, 0x00, 0x03],
                                ];
                            },
                        },
                        'dimmer_double': {
                            doubleInputs: true,
                            getInputActions: (inputs, endpoint, template) => {
                                const moveUpCmd = template.no_onoff || template.no_onoff_up ? 0x01 : 0x05;
                                const moveDownCmd = template.no_onoff || template.no_onoff_down ? 0x01 : 0x05;
                                const moveRate = template.rate || 50;
                                return [
                                    [inputs[0], 0x07, endpoint, 0x06, 0x00, 0x01],
                                    [inputs[0], 0x06, endpoint, 0x08, 0x00, moveUpCmd, 0x00, moveRate],
                                    [inputs[0], 0x0B, endpoint, 0x08, 0x00, 0x03],
                                    [inputs[1], 0x07, endpoint, 0x06, 0x00, 0x00],
                                    [inputs[1], 0x06, endpoint, 0x08, 0x00, moveDownCmd, 0x01, moveRate],
                                    [inputs[1], 0x0B, endpoint, 0x08, 0x00, 0x03],
                                ];
                            },
                        },
                        'cover': {
                            cover: true,
                            doubleInputs: true,
                            getInputActions: (inputs, endpoint) => [
                                [inputs[0], 0x0D, endpoint, 0x02, 0x01, 0x00],
                                [inputs[0], 0x07, endpoint, 0x02, 0x01, 0x02],
                                [inputs[1], 0x0D, endpoint, 0x02, 0x01, 0x01],
                                [inputs[1], 0x07, endpoint, 0x02, 0x01, 0x02],
                            ],
                        },
                        'cover_switch': {
                            cover: true,
                            doubleInputs: true,
                            getInputActions: (inputs, endpoint) => [
                                [inputs[0], 0x0D, endpoint, 0x02, 0x01, 0x00],
                                [inputs[0], 0x03, endpoint, 0x02, 0x01, 0x02],
                                [inputs[1], 0x0D, endpoint, 0x02, 0x01, 0x01],
                                [inputs[1], 0x03, endpoint, 0x02, 0x01, 0x02],
                            ],
                        },
                        'cover_up': {
                            cover: true,
                            getInputActions: (input, endpoint) => [
                                [input, 0x0D, endpoint, 0x02, 0x01, 0x00],
                            ],
                        },
                        'cover_down': {
                            cover: true,
                            getInputActions: (input, endpoint) => [
                                [input, 0x0D, endpoint, 0x02, 0x01, 0x01],
                            ],
                        },
                        'scene': {
                            scene: true,
                            getInputActions: (input, endpoint, groupId, sceneId) => [
                                [input, 0x07, endpoint, 0x05, 0x00, 0x05, groupId & 0xff, groupId >> 8, sceneId],
                            ],
                            getInputActions2: (input, endpoint, groupId, sceneId) => [
                                [input, 0x06, endpoint, 0x05, 0x00, 0x05, groupId & 0xff, groupId >> 8, sceneId],
                            ],
                        },
                        'scene_switch': {
                            scene: true,
                            getInputActions: (input, endpoint, groupId, sceneId) => [
                                [input, 0x0D, endpoint, 0x05, 0x00, 0x05, groupId & 0xff, groupId >> 8, sceneId],
                            ],
                            getInputActions2: (input, endpoint, groupId, sceneId) => [
                                [input, 0x03, endpoint, 0x05, 0x00, 0x05, groupId & 0xff, groupId >> 8, sceneId],
                            ],
                        },
                    };

                    // first input
                    let input = 0;
                    // first client endpoint - depends on actual device
                    let endpoint = {'S1': 2, 'S2': 3, 'D1': 2, 'J1': 2, 'C4': 1}[meta.mapped.model];
                    // default group id
                    let groupId = 0;

                    const templates = Array.isArray(value.input_action_templates) ? value.input_action_templates :
                        [value.input_action_templates];
                    let resultingInputActions = [];
                    for (const template of templates) {
                        const templateType = templateTypes[template.type];
                        if (!templateType) {
                            throw new Error(`input_action_templates: Template type '${template.type}' is not valid ` +
                                `(valid types: ${Object.keys(templateTypes)})`);
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
                                    inputActions = inputActions.concat(templateType.getInputActions2(input, endpoint, groupId,
                                        template.scene_id_2));
                                }
                            }
                        } else {
                            // double inputs
                            input = template.hasOwnProperty('inputs') ? template.inputs : [input, input + 1];
                            inputActions = templateType.getInputActions(input, endpoint, template);
                        }
                        resultingInputActions = resultingInputActions.concat(inputActions);

                        meta.logger.warn(`ubisys: Using input(s) ${input} and endpoint ${endpoint} for '${template.type}'.`);
                        // input might by now be an array (in case of double inputs)
                        input = (Array.isArray(input) ? Math.max(...input) : input) + 1;
                        endpoint += 1;
                    }

                    meta.logger.debug(`ubisys: input_actions to be sent to '${meta.options.friendlyName}': ` +
                        JSON.stringify(resultingInputActions));
                    await devMgmtEp.write(
                        'manuSpecificUbisysDeviceSetup',
                        {'inputActions': {elementType: 'octetStr', elements: resultingInputActions}},
                        manufacturerOptions.ubisysNull,
                    );
                }

                // re-read effective settings and dump them to the log
                ubisys.tz.configure_device_setup.convertGet(entity, key, meta);
            },

            convertGet: async (entity, key, meta) => {
                const devMgmtEp = meta.device.getEndpoint(232);
                await devMgmtEp.read('manuSpecificUbisysDeviceSetup', ['inputConfigurations', 'inputActions'],
                    manufacturerOptions.ubisysNull);
            },
        },
        thermostat_vacation_mode: {
            key: ['vacation_mode'],
            convertGet: async (entity, key, meta) => {
                await entity.read('hvacThermostat', ['ocupancy']);
            },
        },
    },
};

module.exports = [
    {
        zigbeeModel: ['S1 (5501)'],
        model: 'S1',
        vendor: 'Ubisys',
        description: 'Power switch S1',
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET).withEndpoint('meter').withProperty('power'),
            e.action([
                'toggle', 'on', 'off', 'recall_*',
                'brightness_move_up', 'brightness_move_down', 'brightness_stop',
            ]),
            e.power_on_behavior()],
        fromZigbee: [fz.on_off, fz.metering, fz.command_toggle, fz.command_on, fz.command_off, fz.command_recall, fz.command_move,
            fz.command_stop, fz.power_on_behavior, ubisys.fz.configure_device_setup],
        toZigbee: [tz.on_off, tz.metering_power, ubisys.tz.configure_device_setup, tz.power_on_behavior],
        endpoint: (device) => {
            return {'l1': 1, 's1': 2, 'meter': 3};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
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
            }
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['S1-R (5601)'],
        model: 'S1-R',
        vendor: 'Ubisys',
        description: 'Power switch S1-R',
        exposes: [e.switch(), e.power().withAccess(ea.STATE_GET).withEndpoint('meter').withProperty('power'),
            e.action([
                'toggle', 'on', 'off', 'recall_*',
                'brightness_move_up', 'brightness_move_down', 'brightness_stop',
            ]),
            e.power_on_behavior()],
        fromZigbee: [fz.on_off, fz.metering, fz.command_toggle, fz.command_on, fz.command_off, fz.command_recall, fz.command_move,
            fz.command_stop, fz.power_on_behavior, ubisys.fz.configure_device_setup],
        toZigbee: [tz.on_off, tz.metering_power, ubisys.tz.configure_device_setup, tz.power_on_behavior],
        endpoint: (device) => {
            return {'l1': 1, 's1': 2, 'meter': 4};
        },
        configure: async (device, coordinatorEndpoint, logger) => {
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
            }
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['S2 (5502)', 'S2-R (5602)'],
        model: 'S2',
        vendor: 'Ubisys',
        description: 'Power switch S2',
        exposes: [
            e.switch().withEndpoint('l1'), e.switch().withEndpoint('l2'),
            e.power().withAccess(ea.STATE_GET).withEndpoint('meter').withProperty('power'),
            e.action(['toggle_s1', 'toggle_s2', 'on_s1', 'on_s2', 'off_s1', 'off_s2', 'recall_*_s1', 'recal_*_s2', 'brightness_move_up_s1',
                'brightness_move_up_s2', 'brightness_move_down_s1', 'brightness_move_down_s2', 'brightness_stop_s1',
                'brightness_stop_s2']),
            e.power_on_behavior().withEndpoint('l1'), e.power_on_behavior().withEndpoint('l2')],
        fromZigbee: [fz.on_off, fz.metering, fz.command_toggle, fz.command_on, fz.command_off, fz.command_recall, fz.command_move,
            fz.command_stop, fz.power_on_behavior, ubisys.fz.configure_device_setup],
        toZigbee: [tz.on_off, tz.metering_power, ubisys.tz.configure_device_setup, tz.power_on_behavior],
        endpoint: (device) => {
            return {'l1': 1, 'l2': 2, 's1': 3, 's2': 4, 'meter': 5};
        },
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint, logger) => {
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
            }
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['D1 (5503)', 'D1-R (5603)'],
        model: 'D1',
        vendor: 'Ubisys',
        description: 'Universal dimmer D1',
        fromZigbee: [fz.on_off, fz.brightness, fz.metering, fz.command_toggle, fz.command_on, fz.command_off, fz.command_recall,
            fz.command_move, fz.command_stop, fz.lighting_ballast_configuration, fz.level_config, ubisys.fz.dimmer_setup,
            ubisys.fz.dimmer_setup_genLevelCtrl, ubisys.fz.configure_device_setup],
        toZigbee: [tz.light_onoff_brightness, tz.ballast_config, tz.level_config, ubisys.tz.dimmer_setup,
            ubisys.tz.dimmer_setup_genLevelCtrl, ubisys.tz.configure_device_setup, tz.ignore_transition, tz.light_brightness_move,
            tz.light_brightness_step],
        exposes: [e.light_brightness().withLevelConfig(), e.power(),
            exposes.numeric('ballast_minimum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the minimum light output of the ballast'),
            exposes.numeric('ballast_maximum_level', ea.ALL).withValueMin(1).withValueMax(254)
                .withDescription('Specifies the maximum light output of the ballast'),
            exposes.numeric('minimum_on_level', ea.ALL).withValueMin(0).withValueMax(255)
                .withDescription('Specifies the minimum light output after switching on'),
            exposes.binary('capabilities_forward_phase_control', ea.ALL, true, false)
                .withDescription('The dimmer supports AC forward phase control.'),
            exposes.binary('capabilities_reverse_phase_control', ea.ALL, true, false)
                .withDescription('The dimmer supports AC reverse phase control.'),
            exposes.binary('capabilities_reactance_discriminator', ea.ALL, true, false)
                .withDescription('The dimmer is capable of measuring the reactanceto distinguish inductive and capacitive loads.'),
            exposes.binary('capabilities_configurable_curve', ea.ALL, true, false)
                .withDescription('The dimmer is capable of replacing the built-in, default dimming curve.'),
            exposes.binary('capabilities_overload_detection', ea.ALL, true, false)
                .withDescription('The dimmer is capable of detecting an output overload and shutting the output off.'),
            exposes.binary('status_forward_phase_control', ea.ALL, true, false)
                .withDescription('The dimmer is currently operating in AC forward phase control mode.'),
            exposes.binary('status_reverse_phase_control', ea.ALL, true, false)
                .withDescription('The dimmer is currently operating in AC reverse phase control mode.'),
            exposes.binary('status_overload', ea.ALL, true, false)
                .withDescription('The output is currently turned off, because the dimmer has detected an overload.'),
            exposes.binary('status_capacitive_load', ea.ALL, true, false)
                .withDescription('The dimmer\'s reactance discriminator had detected a capacitive load.'),
            exposes.binary('status_inductive_load', ea.ALL, true, false)
                .withDescription('The dimmer\'s reactance discriminator had detected an inductive load.'),
            exposes.enum('mode_phase_control', ea.ALL, ['automatic', 'forward', 'reverse'])
                .withDescription('Configures the dimming technique.')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(4);
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
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
        toZigbee: [tz.cover_state, tz.cover_position_tilt, tz.metering_power,
            ubisys.tz.configure_j1, ubisys.tz.configure_device_setup],
        exposes: [e.cover_position_tilt(),
            e.power().withAccess(ea.STATE_GET).withEndpoint('meter').withProperty('power')],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint3 = device.getEndpoint(3);
            await reporting.bind(endpoint3, coordinatorEndpoint, ['seMetering']);
            await reporting.readMeteringMultiplierDivisor(endpoint3);
            await reporting.instantaneousDemand(endpoint3);
            await reporting.bind(endpoint1, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(endpoint1);
        },
        endpoint: (device) => {
            return {'default': 1, 'meter': 3};
        },
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
            }
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['C4 (5504)'],
        model: 'C4',
        vendor: 'Ubisys',
        description: 'Control unit C4',
        fromZigbee: [fz.legacy.ubisys_c4_scenes, fz.legacy.ubisys_c4_onoff, fz.legacy.ubisys_c4_level, fz.legacy.ubisys_c4_cover,
            ubisys.fz.configure_device_setup],
        toZigbee: [ubisys.tz.configure_device_setup],
        exposes: [e.action([
            '1_scene_*', '1_on', '1_off', '1_toggle', '1_level_move_down', '1_level_move_up',
            '2_scene_*', '2_on', '2_off', '2_toggle', '2_level_move_down', '2_level_move_up',
            '3_scene_*', '3_on', '3_off', '3_toggle', '3_level_move_down', '3_level_move_up',
            '4_scene_*', '4_on', '4_off', '4_toggle', '4_level_move_down', '4_level_move_up',
            '5_scene_*', '5_cover_open', '5_cover_close', '5_cover_stop',
            '6_scene_*', '6_cover_open', '6_cover_close', '6_cover_stop'])],
        configure: async (device, coordinatorEndpoint, logger) => {
            for (const ep of [1, 2, 3, 4]) {
                await reporting.bind(device.getEndpoint(ep), coordinatorEndpoint, ['genScenes', 'genOnOff', 'genLevelCtrl']);
            }
            for (const ep of [5, 6]) {
                await reporting.bind(device.getEndpoint(ep), coordinatorEndpoint, ['genScenes', 'closuresWindowCovering']);
            }
        },
        ota: ota.ubisys,
    },
    {
        zigbeeModel: ['H1'],
        model: 'H1',
        vendor: 'Ubisys',
        description: 'Heating regulator',
        meta: {thermostat: {dontMapPIHeatingDemand: true}},
        fromZigbee: [fz.battery, fz.thermostat, fz.thermostat_weekly_schedule, ubisys.fz.thermostat_vacation_mode],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint, tz.thermostat_unoccupied_heating_setpoint,
            tz.thermostat_local_temperature, tz.thermostat_system_mode,
            tz.thermostat_weekly_schedule, tz.thermostat_clear_weekly_schedule,
            tz.thermostat_running_mode, ubisys.tz.thermostat_vacation_mode,
            tz.thermostat_pi_heating_demand,
        ],
        exposes: [
            e.battery(),
            exposes.climate()
                .withSystemMode(['off', 'heat'], ea.ALL)
                .withRunningMode(['off', 'heat'])
                .withSetpoint('occupied_heating_setpoint', 7, 30, 0.5)
                .withLocalTemperature()
                .withPiHeatingDemand(ea.STATE_GET),
            exposes.binary('vacation_mode', ea.STATE_GET, true, false)
                .withDescription('When Vacation Mode is active the schedule is disabled and unoccupied_heating_setpoint is used.'),
        ],
        configure: async (device, coordinatorEndpoint, logger) => {
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
            await reporting.thermostatTemperature(endpoint,
                {min: 0, max: constants.repInterval.HOUR, change: 50});
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint,
                {min: 0, max: constants.repInterval.HOUR, change: 50});
            await reporting.thermostatPIHeatingDemand(endpoint);
            await reporting.thermostatOcupancy(endpoint);
            await reporting.batteryPercentageRemaining(endpoint,
                {min: constants.repInterval.HOUR, max: 43200, change: 1});


            // read attributes
            // NOTE: configuring reporting on hvacThermostat seems to trigger an imediat
            //       report, so the values are available after configure has run.
            //       this does not seem to be the case for genPowerCfg, so we read
            //       the battery percentage
            await endpoint.read('genPowerCfg', ['batteryPercentageRemaining']);

            // write attributes
            // NOTE: device checks in every 1h once the device has entered deepsleep
            //       this might be a bit long if you want to set the temperature remotely
            //       update this to every 15 minutes. (value is in 1/4th of a second)
            await endpoint.write('genPollCtrl', {'checkinInterval': (4 * 60 * 15)});
        },
        ota: ota.ubisys,
    },
];
