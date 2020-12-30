'use strict';

const {isLegacyEnabled, precisionRound} = require('./utils');
const fromZigbeeConverters = require('../converters/fromZigbee');
const fromZigbeeStore = {};
const tuya = require('./tuya');
const constants = require('./constants');

// get object property name (key) by it's value
const getKey = (object, value) => {
    for (const key in object) {
        if (object[key]==value) return key;
    }
};

const numberWithinRange = (number, min, max) => {
    if (number > max) {
        return max;
    } else if (number < min) {
        return min;
    } else {
        return number;
    }
};

const holdUpdateBrightness324131092621 = (deviceID) => {
    if (fromZigbeeStore[deviceID] && fromZigbeeStore[deviceID].brightnessSince && fromZigbeeStore[deviceID].brightnessDirection) {
        const duration = Date.now() - fromZigbeeStore[deviceID].brightnessSince;
        const delta = (duration / 10) * (fromZigbeeStore[deviceID].brightnessDirection === 'up' ? 1 : -1);
        const newValue = fromZigbeeStore[deviceID].brightnessValue + delta;
        fromZigbeeStore[deviceID].brightnessValue = numberWithinRange(newValue, 1, 255);
    }
};

function getMetaValue(entity, definition, key, groupStrategy='first') {
    if (entity.constructor.name === 'Group' && entity.members.length > 0) {
        const values = [];
        for (const memberMeta of definition) {
            if (memberMeta.meta && memberMeta.meta.hasOwnProperty(key)) {
                if (groupStrategy === 'first') {
                    return memberMeta.meta[key];
                }

                values.push(memberMeta.meta[key]);
            } else {
                values.push(undefined);
            }
        }

        if (groupStrategy === 'allEqual' && (new Set(values)).size === 1) {
            return values[0];
        }
    } else if (definition && definition.meta && definition.meta.hasOwnProperty(key)) {
        return definition.meta[key];
    }

    return undefined;
}

const convertMultiByteNumberPayloadToSingleDecimalNumber = (chunks) => {
    // Destructuring "chunks" is needed because it's a Buffer
    // and we need a simple array.
    let value = 0;
    for (let i = 0; i < chunks.length; i++) {
        value = value << 8;
        value += chunks[i];
    }
    return value;
};

const tuyaGetDataValue = (dataType, data) => {
    switch (dataType) {
    case tuya.dataTypes.raw:
        return data;
    case tuya.dataTypes.bool:
        return data[0] === 1;
    case tuya.dataTypes.value:
        return convertMultiByteNumberPayloadToSingleDecimalNumber(data);
    case tuya.dataTypes.string:
        // eslint-disable-next-line
        let dataString = '';
        // Don't use .map here, doesn't work: https://github.com/Koenkk/zigbee-herdsman-converters/pull/1799/files#r530377091
        for (let i = 0; i < data.length; ++i) {
            dataString += String.fromCharCode(data[i]);
        }
        return dataString;
    case tuya.dataTypes.enum:
        return data[0];
    case tuya.dataTypes.bitmap:
        return convertMultiByteNumberPayloadToSingleDecimalNumber(data);
    }
};

const toPercentage = (value, min, max) => {
    if (value > max) {
        value = max;
    } else if (value < min) {
        value = min;
    }

    const normalised = (value - min) / (max - min);
    return Math.round(normalised * 100);
};

const postfixWithEndpointName = (name, msg, definition) => {
    if (definition.meta && definition.meta.multiEndpoint) {
        const endpointName = definition.hasOwnProperty('endpoint') ?
            getKey(definition.endpoint(msg.device), msg.endpoint.ID) : msg.endpoint.ID;
        return `${name}_${endpointName}`;
    } else {
        return name;
    }
};

const transactionStore = {};
const hasAlreadyProcessedMessage = (msg, transaction=null, key=null) => {
    const current = transaction !== null ? transaction : msg.meta.zclTransactionSequenceNumber;
    key = key || msg.device.ieeeAddr;
    if (transactionStore[key] === current) return true;
    transactionStore[key] = current;
    return false;
};

const addActionGroup = (payload, msg, definition) => {
    const disableActionGroup = definition.meta && definition.meta.disableActionGroup;
    if (!disableActionGroup && msg.groupID) {
        payload.action_group = msg.groupID;
    }
};

const ratelimitedDimmer = (model, msg, publish, options, meta) => {
    const deviceID = msg.device.ieeeAddr;
    const payload = {};
    let duration = 0;

    if (!fromZigbeeStore[deviceID]) {
        fromZigbeeStore[deviceID] = {lastmsg: false};
    }
    const s = fromZigbeeStore[deviceID];

    if (s.lastmsg) {
        duration = Date.now() - s.lastmsg;
    } else {
        s.lastmsg = Date.now();
    }

    if (duration > 500) {
        s.lastmsg = Date.now();
        payload.action = 'brightness';
        payload.brightness = msg.data.level;
        publish(payload);
    }
};

const ictcg1 = (model, msg, publish, options, action) => {
    const deviceID = msg.device.ieeeAddr;
    const payload = {};

    if (!fromZigbeeStore[deviceID]) {
        fromZigbeeStore[deviceID] = {since: false, direction: false, value: 255, publish: publish};
    }

    const s = fromZigbeeStore[deviceID];
    // if rate == 70 so we rotate slowly
    const rate = (msg.data.rate == 70) ? 0.3 : 1;

    if (action === 'move') {
        s.since = Date.now();
        const direction = msg.data.movemode === 1 ? 'left' : 'right';
        s.direction = direction;
        payload.action = `rotate_${direction}`;
    } else if (action === 'level') {
        s.value = msg.data.level;
        const direction = s.value === 0 ? 'left' : 'right';
        payload.action = `rotate_${direction}_quick`;
        payload.brightness = s.value;
    } else if (action === 'stop') {
        if (s.direction) {
            const duration = Date.now() - s.since;
            const delta = Math.round(rate * (duration / 10) * (s.direction === 'left' ? -1 : 1));
            const newValue = s.value + delta;
            if (newValue >= 0 && newValue <= 255) {
                s.value = newValue;
            }
        }
        payload.action = 'rotate_stop';
        payload.brightness = s.value;
        s.direction = false;
    }
    if (s.timerId) {
        clearInterval(s.timerId);
        s.timerId = false;
    }
    if (action === 'move') {
        s.timerId = setInterval(() => {
            const duration = Date.now() - s.since;
            const delta = Math.round(rate * (duration / 10) * (s.direction === 'left' ? -1 : 1));
            const newValue = s.value + delta;
            if (newValue >= 0 && newValue <= 255) {
                s.value = newValue;
            }
            payload.brightness = s.value;
            s.since = Date.now();
            s.publish(payload);
        }, 200);
    }
    return payload.brightness;
};

const fromZigbee = {
    WXKG11LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const data = msg.data;
                let clicks;

                if (data.onOff) {
                    clicks = 1;
                } else if (data['32768']) {
                    clicks = data['32768'];
                }

                const actionLookup = {1: 'single', 2: 'double', 3: 'triple', 4: 'quadruple'};
                if (actionLookup[clicks]) {
                    return {click: actionLookup[clicks]};
                }
            }
        },
    },
    SmartButton_skip: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const direction = msg.data.stepmode === 1 ? 'backward' : 'forward';
                return {
                    action: `skip_${direction}`,
                    step_size: msg.data.stepsize,
                    transition_time: msg.data.transtime,
                };
            } else {
                return fromZigbeeConverters.command_step.convert(model, msg, publish, options, meta);
            }
        },
    },
    konke_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const value = msg.data['onOff'];
                const lookup = {
                    128: {click: 'single'}, // single click
                    129: {click: 'double'}, // double and many click
                    130: {click: 'long'}, // hold
                };

                return lookup[value] ? lookup[value] : null;
            }
        },
    },
    xiaomi_action_click_multistate: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const value = msg.data['presentValue'];
                const lookup = {
                    1: {click: 'single'}, // single click
                    2: {click: 'double'}, // double click
                };

                return lookup[value] ? lookup[value] : null;
            }
        },
    },
    WXKG12LM_action_click_multistate: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const value = msg.data['presentValue'];
                const lookup = {
                    1: {click: 'single'}, // single click
                    2: {click: 'double'}, // double click
                };

                return lookup[value] ? lookup[value] : null;
            }
        },
    },
    terncy_raw: {
        cluster: 'manuSpecificClusterAduroSmart',
        type: 'raw',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                // 13,40,18,104, 0,8,1 - click
                // 13,40,18,22,  0,17,1
                // 13,40,18,32,  0,18,1
                // 13,40,18,6,   0,16,1
                // 13,40,18,111, 0,4,2 - double click
                // 13,40,18,58,  0,7,2
                // 13,40,18,6,   0,2,3 - triple click
                // motion messages:
                // 13,40,18,105, 4,167,0,7 - motion on right side
                // 13,40,18,96,  4,27,0,5
                // 13,40,18,101, 4,27,0,7
                // 13,40,18,125, 4,28,0,5
                // 13,40,18,85,  4,28,0,7
                // 13,40,18,3,   4,24,0,5
                // 13,40,18,81,  4,10,1,7
                // 13,40,18,72,  4,30,1,5
                // 13,40,18,24,  4,25,0,40 - motion on left side
                // 13,40,18,47,  4,28,0,56
                // 13,40,18,8,   4,32,0,40
                let value = {};
                if (msg.data[4] == 0) {
                    value = msg.data[6];
                    if (1 <= value && value <= 3) {
                        const actionLookup = {1: 'single', 2: 'double', 3: 'triple', 4: 'quadruple'};
                        return {click: actionLookup[value]};
                    }
                }
            }
        },
    },
    CCTSwitch_D0001_on_off: {
        cluster: 'genOnOff',
        type: ['commandOn', 'commandOff'],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {click: 'power'};
            }
        },
    },
    ptvo_switch_buttons: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
                const value = msg.data['presentValue'];

                const actionLookup = {
                    0: 'release',
                    1: 'single',
                    2: 'double',
                    3: 'tripple',
                    4: 'hold',
                };

                const action = actionLookup[value];

                if (button) {
                    return {click: button + (action ? `_${action}` : '')};
                }
            }
        },
    },
    ZGRC013_brightness_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const button = msg.endpoint.ID;
                const direction = msg.data.movemode == 0 ? 'up' : 'down';
                if (button) {
                    return {click: `${button}_${direction}`};
                }
            }
        },
    },
    ZGRC013_brightness_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStopWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const button = msg.endpoint.ID;
                if (button) {
                    return {click: `${button}_stop`};
                }
            }
        },
    },
    ZGRC013_scene: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {click: `scene_${msg.data.groupid}_${msg.data.sceneid}`};
            }
        },
    },
    ZGRC013_cmdOn: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const button = msg.endpoint.ID;
                if (button) {
                    return {click: `${button}_on`};
                }
            }
        },
    },
    ZGRC013_cmdOff: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const button = msg.endpoint.ID;
                if (button) {
                    return {click: `${button}_off`};
                }
            }
        },
    },
    ZGRC013_brightness: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const button = msg.endpoint.ID;
                const direction = msg.data.movemode == 0 ? 'up' : 'down';
                if (button) {
                    return {click: `${button}_${direction}`};
                }
            }
        },
    },
    CTR_U_scene: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {click: `scene_${msg.data.groupid}_${msg.data.sceneid}`};
            }
        },
    },
    st_button_state: {
        cluster: 'ssIasZone',
        type: 'commandStatusChangeNotification',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const buttonStates = {
                    0: 'off',
                    1: 'single',
                    2: 'double',
                    3: 'hold',
                };

                if (msg.data.hasOwnProperty('data')) {
                    const zoneStatus = msg.data.zonestatus;
                    return {click: buttonStates[zoneStatus]};
                } else {
                    const zoneStatus = msg.data.zonestatus;
                    return {click: buttonStates[zoneStatus]};
                }
            }
        },
    },
    QBKG11LM_click: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                if ([1, 2].includes(msg.data.presentValue)) {
                    const times = {1: 'single', 2: 'double'};
                    return {click: times[msg.data.presentValue]};
                }
            }
        },
    },
    QBKG12LM_click: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                if ([1, 2].includes(msg.data.presentValue)) {
                    const mapping = {5: 'left', 6: 'right', 7: 'both'};
                    const times = {1: 'single', 2: 'double'};
                    const button = mapping[msg.endpoint.ID];
                    return {click: `${button}_${times[msg.data.presentValue]}`};
                }
            }
        },
    },
    QBKG03LM_QBKG12LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                if (!msg.data['61440']) {
                    const mapping = {4: 'left', 5: 'right', 6: 'both'};
                    const button = mapping[msg.endpoint.ID];
                    return {click: button};
                }
            }
        },
    },
    QBKG04LM_QBKG11LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                if (!msg.data['61440']) {
                    return {click: 'single'};
                }
            }
        },
    },
    cover_stop: {
        cluster: 'closuresWindowCovering',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {click: 'release'};
            }
        },
    },
    cover_open: {
        cluster: 'closuresWindowCovering',
        type: 'commandUpOpen',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {click: 'open'};
            }
        },
    },
    cover_close: {
        cluster: 'closuresWindowCovering',
        type: 'commandDownClose',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {click: 'close'};
            }
        },
    },
    WXKG03LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {click: 'single'};
            }
        },
    },
    TS0218_click: {
        cluster: 'ssIasAce',
        type: 'commandEmergency',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {action: 'click'};
            } else {
                return fromZigbeeConverters.command_emergency.convert(model, msg, publish, options, meta);
            }
        },
    },
    xiaomi_on_off_action: {
        cluster: 'genOnOff',
        type: ['attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {action: getKey(model.endpoint(msg.device), msg.endpoint.ID)};
            } else {
                return fromZigbeeConverters.xiaomi_on_off_action.convert(model, msg, publish, options, meta);
            }
        },
    },
    WXKG02LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const lookup = {1: 'left', 2: 'right', 3: 'both'};
                return {click: lookup[msg.endpoint.ID]};
            }
        },
    },
    WXKG02LM_click_multistate: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            // Somestime WXKG02LM sends multiple messages on a single click, this prevents handling
            // of a message with the same transaction sequence number twice.
            const current = msg.meta.zclTransactionSequenceNumber;
            if (fromZigbeeStore[msg.device.ieeeAddr + 'legacy'] === current) return;
            fromZigbeeStore[msg.device.ieeeAddr + 'legacy'] = current;

            const buttonLookup = {1: 'left', 2: 'right', 3: 'both'};
            const button = buttonLookup[msg.endpoint.ID];
            const value = msg.data['presentValue'];

            const actionLookup = {
                0: 'long',
                1: null,
                2: 'double',
            };

            const action = actionLookup[value];

            if (button) {
                if (isLegacyEnabled(options)) {
                    return {click: button + (action ? `_${action}` : '')};
                }
            }
        },
    },
    WXKG01LM_click: {
        cluster: 'genOnOff',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const deviceID = msg.device.ieeeAddr;
                const state = msg.data['onOff'];
                const key = `${deviceID}_legacy`;

                if (!fromZigbeeStore[key]) {
                    fromZigbeeStore[key] = {};
                }

                const current = msg.meta.zclTransactionSequenceNumber;
                if (fromZigbeeStore[key].transaction === current) return;
                fromZigbeeStore[key].transaction = current;

                // 0 = click down, 1 = click up, else = multiple clicks
                if (state === 0) {
                    fromZigbeeStore[key].timer = setTimeout(() => {
                        publish({click: 'long'});
                        fromZigbeeStore[key].timer = null;
                        fromZigbeeStore[key].long = Date.now();
                        fromZigbeeStore[key].long_timer = setTimeout(() => {
                            fromZigbeeStore[key].long = false;
                        }, 4000); // After 4000 milliseconds of not reciving long_release we assume it will not happen.
                    }, options.long_timeout || 1000); // After 1000 milliseconds of not releasing we assume long click.
                } else if (state === 1) {
                    if (fromZigbeeStore[key].long) {
                        const duration = Date.now() - fromZigbeeStore[key].long;
                        publish({click: 'long_release', duration: duration});
                        fromZigbeeStore[key].long = false;
                    }

                    if (fromZigbeeStore[key].timer) {
                        clearTimeout(fromZigbeeStore[key].timer);
                        fromZigbeeStore[key].timer = null;
                        publish({click: 'single'});
                    }
                } else {
                    const clicks = msg.data['32768'];
                    const actionLookup = {1: 'single', 2: 'double', 3: 'triple', 4: 'quadruple'};
                    const payload = actionLookup[clicks] ? actionLookup[clicks] : 'many';
                    publish({click: payload});
                }
            }
        },
    },
    scenes_recall_click: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {click: msg.data.sceneid};
            }
        },
    },
    AV2010_34_click: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {click: msg.data.groupid};
            }
        },
    },
    E1743_brightness_down: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {click: 'brightness_down'};
            }
        },
    },
    E1743_brightness_up: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {click: 'brightness_up'};
            }
        },
    },
    E1743_brightness_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStopWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {click: 'brightness_stop'};
            }
        },
    },
    genOnOff_cmdOn: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {click: 'on'};
            }
        },
    },
    genOnOff_cmdOff: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {click: 'off'};
            }
        },
    },
    RM01_on_click: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
                return {action: `${button}_on`};
            } else {
                return fromZigbeeConverters.command_on.convert(model, msg, publish, options, meta);
            }
        },
    },
    RM01_off_click: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
                return {action: `${button}_off`};
            } else {
                return fromZigbeeConverters.command_off.convert(model, msg, publish, options, meta);
            }
        },
    },
    RM01_down_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
                return {
                    action: `${button}_down`,
                    step_mode: msg.data.stepmode,
                    step_size: msg.data.stepsize,
                    transition_time: msg.data.transtime,
                };
            } else {
                return fromZigbeeConverters.command_step.convert(model, msg, publish, options, meta);
            }
        },
    },
    RM01_up_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandStepWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
                return {
                    action: `${button}_up`,
                    step_mode: msg.data.stepmode,
                    step_size: msg.data.stepsize,
                    transition_time: msg.data.transtime,
                };
            } else {
                return fromZigbeeConverters.command_step.convert(model, msg, publish, options, meta);
            }
        },
    },
    RM01_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
                return {action: `${button}_stop`};
            } else {
                return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
            }
        },
    },
    xiaomi_multistate_action: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            // refactor to xiaomi_multistate_action]
            if (isLegacyEnabled(options)) {
                const button = getKey(model.endpoint(msg.device), msg.endpoint.ID);
                const value = msg.data['presentValue'];
                const actionLookup = {0: 'long', 1: null, 2: 'double'};
                const action = actionLookup[value];

                if (button) {
                    return {action: `${button}${(action ? `_${action}` : '')}`};
                }
            } else {
                return fromZigbeeConverters.xiaomi_multistate_action.convert(model, msg, publish, options, meta);
            }
        },
    },
    E1744_play_pause: {
        cluster: 'genOnOff',
        type: 'commandToggle',
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg)) return;
            if (isLegacyEnabled(options)) {
                return {action: 'play_pause'};
            } else {
                return fromZigbeeConverters.command_toggle.convert(model, msg, publish, options, meta);
            }
        },
    },
    E1744_skip: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg)) return;
            if (isLegacyEnabled(options)) {
                const direction = msg.data.stepmode === 1 ? 'backward' : 'forward';
                return {
                    action: `skip_${direction}`,
                    step_size: msg.data.stepsize,
                    transition_time: msg.data.transtime,
                };
            } else {
                return fromZigbeeConverters.command_step.convert(model, msg, publish, options, meta);
            }
        },
    },
    cmd_move: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg)) return;
            if (isLegacyEnabled(options)) {
                ictcg1(model, msg, publish, options, 'move');
                const direction = msg.data.movemode === 1 ? 'left' : 'right';
                return {action: `rotate_${direction}`, rate: msg.data.rate};
            } else {
                return fromZigbeeConverters.command_move.convert(model, msg, publish, options, meta);
            }
        },
    },
    cmd_move_with_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                ictcg1(model, msg, publish, options, 'move');
                const direction = msg.data.movemode === 1 ? 'left' : 'right';
                return {action: `rotate_${direction}`, rate: msg.data.rate};
            } else {
                return fromZigbeeConverters.command_move.convert(model, msg, publish, options, meta);
            }
        },
    },
    cmd_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            if (hasAlreadyProcessedMessage(msg)) return;
            if (isLegacyEnabled(options)) {
                const value = ictcg1(model, msg, publish, options, 'stop');
                return {action: `rotate_stop`, brightness: value};
            } else {
                return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
            }
        },
    },
    cmd_stop_with_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandStopWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const value = ictcg1(model, msg, publish, options, 'stop');
                return {action: `rotate_stop`, brightness: value};
            } else {
                return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
            }
        },
    },
    cmd_move_to_level_with_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveToLevelWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const value = ictcg1(model, msg, publish, options, 'level');
                const direction = msg.data.level === 0 ? 'left' : 'right';
                return {action: `rotate_${direction}_quick`, level: msg.data.level, brightness: value};
            } else {
                return fromZigbeeConverters.command_move_to_level.convert(model, msg, publish, options, meta);
            }
        },
    },
    immax_07046L_arm: {
        cluster: 'ssIasAce',
        type: 'commandArm',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const action = msg.data['armmode'];
                delete msg.data['armmode'];
                const modeLookup = {
                    0: 'disarm',
                    1: 'arm_stay',
                    3: 'arm_away',
                };
                return {action: modeLookup[action]};
            } else {
                return fromZigbeeConverters.command_arm.convert(model, msg, publish, options, meta);
            }
        },
    },
    KEF1PA_arm: {
        cluster: 'ssIasAce',
        type: 'commandArm',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const action = msg.data['armmode'];
                delete msg.data['armmode'];
                const modeLookup = {
                    0: 'home',
                    2: 'sleep',
                    3: 'away',
                };
                return {action: modeLookup[action]};
            } else {
                return fromZigbeeConverters.command_arm.convert(model, msg, publish, options, meta);
            }
        },
    },
    QBKG25LM_click: {
        cluster: 'genMultistateInput',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                if ([1, 2, 3, 0, 255].includes(msg.data.presentValue)) {
                    const mapping = {41: 'left', 42: 'center', 43: 'right'};
                    const times = {1: 'single', 2: 'double', 3: 'triple', 0: 'hold', 255: 'release'};
                    const button = mapping[msg.endpoint.ID];
                    return {action: `${button}_${times[msg.data.presentValue]}`};
                }
            } else {
                return fromZigbeeConverters.xiaomi_multistate_action.convert(model, msg, publish, options, meta);
            }
        },
    },
    QBKG03LM_buttons: {
        cluster: 'genOnOff',
        type: ['attributeReport'],
        convert: (model, msg, publish, options, meta) => {
            const mapping = {4: 'left', 5: 'right'};
            const button = mapping[msg.endpoint.ID];
            if (button) {
                const payload = {};
                payload[`button_${button}`] = msg.data['onOff'] === 1 ? 'release' : 'hold';
                return payload;
            }
        },
    },
    CTR_U_brightness_updown_click: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const deviceID = msg.device.ieeeAddr;
                const direction = msg.data.stepmode === 1 ? 'down' : 'up';

                // Save last direction for release event
                if (!fromZigbeeStore[deviceID]) {
                    fromZigbeeStore[deviceID] = {};
                }
                fromZigbeeStore[deviceID].direction = direction;

                return {
                    action: `brightness_${direction}_click`,
                    step_size: msg.data.stepsize,
                    transition_time: msg.data.transtime,
                };
            } else {
                return fromZigbeeConverters.command_step.convert(model, msg, publish, options, meta);
            }
        },
    },
    CTR_U_brightness_updown_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const deviceID = msg.device.ieeeAddr;
                const direction = msg.data.movemode === 1 ? 'down' : 'up';

                // Save last direction for release event
                if (!fromZigbeeStore[deviceID]) {
                    fromZigbeeStore[deviceID] = {};
                }
                fromZigbeeStore[deviceID].direction = direction;

                return {
                    action: `brightness_${direction}_hold`,
                    rate: msg.data.rate,
                };
            } else {
                return fromZigbeeConverters.command_move.convert(model, msg, publish, options, meta);
            }
        },
    },
    CTR_U_brightness_updown_release: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const deviceID = msg.device.ieeeAddr;
                if (!fromZigbeeStore[deviceID]) {
                    return null;
                }

                const direction = fromZigbeeStore[deviceID].direction;
                return {
                    action: `brightness_${direction}_release`,
                };
            } else {
                return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
            }
        },
    },
    osram_lightify_switch_cmdOn: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {action: 'up'};
            } else {
                return fromZigbeeConverters.command_on.convert(model, msg, publish, options, meta);
            }
        },
    },
    osram_lightify_switch_cmdOff: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {action: 'down'};
            } else {
                return fromZigbeeConverters.command_off.convert(model, msg, publish, options, meta);
            }
        },
    },
    osram_lightify_switch_cmdMoveWithOnOff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const deviceID = msg.device.ieeeAddr;
                if (!fromZigbeeStore[deviceID]) {
                    fromZigbeeStore[deviceID] = {direction: null};
                }
                fromZigbeeStore[deviceID].direction = 'up';
                return {action: 'up_hold'};
            } else {
                return fromZigbeeConverters.command_move.convert(model, msg, publish, options, meta);
            }
        },
    },
    osram_lightify_switch_AC0251100NJ_cmdStop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const map = {
                    1: 'up_release',
                    2: 'down_release',
                };

                return {action: map[msg.endpoint.ID]};
            } else {
                return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
            }
        },
    },
    osram_lightify_switch_cmdMove: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const deviceID = msg.device.ieeeAddr;
                if (!fromZigbeeStore[deviceID]) {
                    fromZigbeeStore[deviceID] = {direction: null};
                }
                fromZigbeeStore[deviceID].direction = 'down';
                return {action: 'down_hold'};
            } else {
                return fromZigbeeConverters.command_move.convert(model, msg, publish, options, meta);
            }
        },
    },
    osram_lightify_switch_cmdMoveHue: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveHue',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                if (msg.data.movemode === 0) {
                    return {action: 'circle_release'};
                }
            } else {
                return fromZigbeeConverters.command_move_hue.convert(model, msg, publish, options, meta);
            }
        },
    },
    osram_lightify_switch_cmdMoveToSaturation: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToSaturation',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {action: 'circle_hold'};
            } else {
                return fromZigbeeConverters.command_move_to_saturation.convert(model, msg, publish, options, meta);
            }
        },
    },
    osram_lightify_switch_cmdMoveToLevelWithOnOff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveToLevelWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {action: 'circle_click'};
            } else {
                return fromZigbeeConverters.command_move_to_level.convert(model, msg, publish, options, meta);
            }
        },
    },
    osram_lightify_switch_cmdMoveToColorTemp: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToColorTemp',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return null;
            } else {
                return fromZigbeeConverters.command_move_to_color_temp.convert(model, msg, publish, options, meta);
            }
        },
    },
    osram_lightify_switch_73743_cmdStop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const deviceID = msg.device.ieeeAddr;
                if (!fromZigbeeStore[deviceID]) {
                    fromZigbeeStore[deviceID] = {direction: null};
                }
                let direction;
                if (fromZigbeeStore[deviceID].direction) {
                    direction = `${fromZigbeeStore[deviceID].direction}_`;
                }
                return {action: `${direction}release`};
            } else {
                return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
            }
        },
    },
    osram_lightify_switch_AB371860355_cmdOn: {
        cluster: 'genOnOff',
        type: 'commandOn',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {action: 'left_top_click'};
            } else {
                return fromZigbeeConverters.command_on.convert(model, msg, publish, options, meta);
            }
        },
    },
    osram_lightify_switch_AB371860355_cmdOff: {
        cluster: 'genOnOff',
        type: 'commandOff',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {action: 'left_bottom_click'};
            } else {
                return fromZigbeeConverters.command_off.convert(model, msg, publish, options, meta);
            }
        },
    },
    osram_lightify_switch_AB371860355_cmdStepColorTemp: {
        cluster: 'lightingColorCtrl',
        type: 'commandStepColorTemp',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const pos = (msg.data.stepmode === 1) ? 'top' : 'bottom';
                return {action: `right_${pos}_click`};
            } else {
                return fromZigbeeConverters.command_step_color_temperature.convert(model, msg, publish, options, meta);
            }
        },
    },
    osram_lightify_switch_AB371860355_cmdMoveWithOnOff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {action: 'left_top_hold'};
            } else {
                return fromZigbeeConverters.command_move.convert(model, msg, publish, options, meta);
            }
        },
    },
    osram_lightify_switch_AB371860355_cmdMove: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {action: 'left_bottom_hold'};
            } else {
                return fromZigbeeConverters.command_move.convert(model, msg, publish, options, meta);
            }
        },
    },
    osram_lightify_switch_AB371860355_cmdStop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const pos = (msg.endpoint.ID === 1) ? 'top' : 'bottom';
                return {action: `left_${pos}_release`};
            } else {
                return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
            }
        },
    },
    osram_lightify_switch_AB371860355_cmdMoveHue: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveHue',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const pos = (msg.endpoint.ID === 2) ? 'top' : 'bottom';
                const action = (msg.data.movemode === 0) ? 'release' : 'hold';
                return {action: `right_${pos}_${action}`};
            } else {
                return fromZigbeeConverters.command_move_hue.convert(model, msg, publish, options, meta);
            }
        },
    },
    osram_lightify_switch_AB371860355_cmdMoveSat: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToSaturation',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const pos = (msg.endpoint.ID === 2) ? 'top' : 'bottom';
                return {action: `right_${pos}_hold`};
            } else {
                return fromZigbeeConverters.command_move_to_saturation.convert(model, msg, publish, options, meta);
            }
        },
    },
    insta_scene_click: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {
                    action: `select_${msg.data.sceneid}`,
                };
            } else {
                return fromZigbeeConverters.command_recall.convert(model, msg, publish, options, meta);
            }
        },
    },
    insta_down_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {
                    action: 'down',
                    step_mode: msg.data.stepmode,
                    step_size: msg.data.stepsize,
                    transition_time: msg.data.transtime,
                };
            } else {
                return fromZigbeeConverters.command_step.convert(model, msg, publish, options, meta);
            }
        },
    },
    insta_up_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandStepWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {
                    action: 'up',
                    step_mode: msg.data.stepmode,
                    step_size: msg.data.stepsize,
                    transition_time: msg.data.transtime,
                };
            } else {
                return fromZigbeeConverters.command_step.convert(model, msg, publish, options, meta);
            }
        },
    },
    insta_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {
                    action: 'stop',
                };
            } else {
                return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
            }
        },
    },
    tint404011_brightness_updown_click: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const direction = msg.data.stepmode === 1 ? 'down' : 'up';
                const payload = {
                    action: `brightness_${direction}_click`,
                    step_size: msg.data.stepsize,
                    transition_time: msg.data.transtime,
                };
                addActionGroup(payload, msg, model);
                return payload;
            } else {
                return fromZigbeeConverters.command_step.convert(model, msg, publish, options, meta);
            }
        },
    },
    tint404011_brightness_updown_hold: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const deviceID = msg.device.ieeeAddr;
                const direction = msg.data.movemode === 1 ? 'down' : 'up';

                // Save last direction for release event
                if (!fromZigbeeStore[deviceID]) {
                    fromZigbeeStore[deviceID] = {};
                }
                fromZigbeeStore[deviceID].movemode = direction;

                const payload = {
                    action: `brightness_${direction}_hold`,
                    rate: msg.data.rate,
                };
                addActionGroup(payload, msg, model);
                return payload;
            } else {
                return fromZigbeeConverters.command_move.convert(model, msg, publish, options, meta);
            }
        },
    },
    tint404011_brightness_updown_release: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const deviceID = msg.device.ieeeAddr;
                if (!fromZigbeeStore[deviceID]) {
                    return null;
                }

                const direction = fromZigbeeStore[deviceID].movemode;
                const payload = {action: `brightness_${direction}_release`};
                addActionGroup(payload, msg, model);
                return payload;
            } else {
                return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
            }
        },
    },
    tint404011_move_to_color_temp: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToColorTemp',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const payload = {
                    action: `color_temp`,
                    action_color_temperature: msg.data.colortemp,
                    transition_time: msg.data.transtime,
                };
                addActionGroup(payload, msg, model);
                return payload;
            } else {
                return fromZigbeeConverters.command_move_to_color_temp.convert(model, msg, publish, options, meta);
            }
        },
    },
    tint404011_move_to_color: {
        cluster: 'lightingColorCtrl',
        type: 'commandMoveToColor',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const payload = {
                    action_color: {
                        x: precisionRound(msg.data.colorx / 65535, 3),
                        y: precisionRound(msg.data.colory / 65535, 3),
                    },
                    action: 'color_wheel',
                    transition_time: msg.data.transtime,
                };
                addActionGroup(payload, msg, model);
                return payload;
            } else {
                return fromZigbeeConverters.command_move_to_color.convert(model, msg, publish, options, meta);
            }
        },
    },
    heiman_smart_controller_armmode: {
        cluster: 'ssIasAce',
        type: 'commandArm',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                if (msg.data.armmode != null) {
                    const lookup = {
                        0: 'disarm',
                        1: 'arm_partial_zones',
                        3: 'arm_all_zones',
                    };

                    const value = msg.data.armmode;
                    return {action: lookup[value] || `armmode_${value}`};
                }
            } else {
                return fromZigbeeConverters.command_arm.convert(model, msg, publish, options, meta);
            }
        },
    },
    LZL4B_onoff: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveToLevelWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {
                    action: msg.data.level,
                    transition_time: msg.data.transtime,
                };
            } else {
                return fromZigbeeConverters.command_move_to_level.convert(model, msg, publish, options, meta);
            }
        },
    },
    eria_81825_updown: {
        cluster: 'genLevelCtrl',
        type: 'commandStep',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const direction = msg.data.stepmode === 0 ? 'up' : 'down';
                return {action: `${direction}`};
            } else {
                return fromZigbeeConverters.command_step.convert(model, msg, publish, options, meta);
            }
        },
    },
    ZYCT202_stop: {
        cluster: 'genLevelCtrl',
        type: 'commandStop',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {action: 'stop', action_group: msg.groupID};
            } else {
                return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
            }
        },
    },
    ZYCT202_up_down: {
        cluster: 'genLevelCtrl',
        type: 'commandMove',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                const value = msg.data['movemode'];
                let action = null;
                if (value === 0) action = {'action': 'up-press', 'action_group': msg.groupID};
                else if (value === 1) action = {'action': 'down-press', 'action_group': msg.groupID};
                return action ? action : null;
            } else {
                return fromZigbeeConverters.command_move.convert(model, msg, publish, options, meta);
            }
        },
    },
    STS_PRS_251_beeping: {
        cluster: 'genIdentify',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                return {action: 'beeping'};
            } else {
                return fromZigbeeConverters.identify.convert(model, msg, publish, options, meta);
            }
        },
    },
    dimmer_passthru_brightness: {
        cluster: 'genLevelCtrl',
        type: 'commandMoveToLevelWithOnOff',
        convert: (model, msg, publish, options, meta) => {
            if (isLegacyEnabled(options)) {
                ratelimitedDimmer(model, msg, publish, options, meta);
            } else {
                return fromZigbeeConverters.command_move_to_level.convert(model, msg, publish, options, meta);
            }
        },
    },
    bitron_thermostat_att_report: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (!isLegacyEnabled(options)) {
                return fromZigbeeConverters.thermostat.convert(model, msg, publish, options, meta);
            }

            const result = {};
            if (typeof msg.data['localTemp'] == 'number') {
                result.local_temperature = precisionRound(msg.data['localTemp'], 2) / 100;
            }
            if (typeof msg.data['localTemperatureCalibration'] == 'number') {
                result.local_temperature_calibration =
                    precisionRound(msg.data['localTemperatureCalibration'], 2) / 10;
            }
            if (typeof msg.data['occupiedHeatingSetpoint'] == 'number') {
                result.occupied_heating_setpoint =
                    precisionRound(msg.data['occupiedHeatingSetpoint'], 2) / 100;
            }
            if (typeof msg.data['runningState'] == 'number') {
                result.running_state = msg.data['runningState'];
            }
            if (typeof msg.data['batteryAlarmState'] == 'number') {
                result.battery_alarm_state = msg.data['batteryAlarmState'];
            }
            return result;
        },
    },
    thermostat_att_report: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (!isLegacyEnabled(options)) {
                return fromZigbeeConverters.thermostat.convert(model, msg, publish, options, meta);
            }

            const result = {};
            if (typeof msg.data['localTemp'] == 'number') {
                result[postfixWithEndpointName('local_temperature', msg, model)] = precisionRound(msg.data['localTemp'], 2) / 100;
            }
            if (typeof msg.data['localTemperatureCalibration'] == 'number') {
                result[postfixWithEndpointName('local_temperature_calibration', msg, model)] =
                    precisionRound(msg.data['localTemperatureCalibration'], 2) / 10;
            }
            if (typeof msg.data['occupancy'] == 'number') {
                result[postfixWithEndpointName('occupancy', msg, model)] = msg.data['occupancy'];
            }
            if (typeof msg.data['occupiedHeatingSetpoint'] == 'number') {
                let ohs = precisionRound(msg.data['occupiedHeatingSetpoint'], 2) / 100;
                // Stelpro will return -325.65 when set to off
                ohs = ohs < - 250 ? 0 : ohs;
                result[postfixWithEndpointName('occupied_heating_setpoint', msg, model)] = ohs;
            }
            if (typeof msg.data['unoccupiedHeatingSetpoint'] == 'number') {
                result[postfixWithEndpointName('unoccupied_heating_setpoint', msg, model)] =
                    precisionRound(msg.data['unoccupiedHeatingSetpoint'], 2) / 100;
            }
            if (typeof msg.data['occupiedCoolingSetpoint'] == 'number') {
                result[postfixWithEndpointName('occupied_cooling_setpoint', msg, model)] =
                    precisionRound(msg.data['occupiedCoolingSetpoint'], 2) / 100;
            }
            if (typeof msg.data['unoccupiedCoolingSetpoint'] == 'number') {
                result[postfixWithEndpointName('unoccupied_cooling_setpoint', msg, model)] =
                    precisionRound(msg.data['unoccupiedCoolingSetpoint'], 2) / 100;
            }
            if (typeof msg.data['weeklySchedule'] == 'number') {
                result[postfixWithEndpointName('weekly_schedule', msg, model)] = msg.data['weeklySchedule'];
            }
            if (typeof msg.data['setpointChangeAmount'] == 'number') {
                result[postfixWithEndpointName('setpoint_change_amount', msg, model)] = msg.data['setpointChangeAmount'] / 100;
            }
            if (typeof msg.data['setpointChangeSource'] == 'number') {
                result[postfixWithEndpointName('setpoint_change_source', msg, model)] = msg.data['setpointChangeSource'];
            }
            if (typeof msg.data['setpointChangeSourceTimeStamp'] == 'number') {
                result[postfixWithEndpointName('setpoint_change_source_timestamp', msg, model)] = msg.data['setpointChangeSourceTimeStamp'];
            }
            if (typeof msg.data['remoteSensing'] == 'number') {
                result[postfixWithEndpointName('remote_sensing', msg, model)] = msg.data['remoteSensing'];
            }
            const ctrl = msg.data['ctrlSeqeOfOper'];
            if (typeof ctrl == 'number' && thermostatControlSequenceOfOperations.hasOwnProperty(ctrl)) {
                result[postfixWithEndpointName('control_sequence_of_operation', msg, model)] =
                    thermostatControlSequenceOfOperations[ctrl];
            }
            const smode = msg.data['systemMode'];
            if (typeof smode == 'number' && thermostatSystemModes.hasOwnProperty(smode)) {
                result[postfixWithEndpointName('system_mode', msg, model)] = thermostatSystemModes[smode];
            }
            const rmode = msg.data['runningMode'];
            if (typeof rmode == 'number' && thermostatSystemModes.hasOwnProperty(rmode)) {
                result[postfixWithEndpointName('running_mode', msg, model)] = thermostatSystemModes[rmode];
            }
            const state = msg.data['runningState'];
            if (typeof state == 'number' && constants.thermostatRunningStates.hasOwnProperty(state)) {
                result[postfixWithEndpointName('running_state', msg, model)] = constants.thermostatRunningStates[state];
            }
            if (typeof msg.data['pIHeatingDemand'] == 'number') {
                result[postfixWithEndpointName('pi_heating_demand', msg, model)] =
                    precisionRound(msg.data['pIHeatingDemand'] / 255.0 * 100.0, 0);
            }
            if (typeof msg.data['tempSetpointHold'] == 'number') {
                result[postfixWithEndpointName('temperature_setpoint_hold', msg, model)] = msg.data['tempSetpointHold'];
            }
            if (typeof msg.data['tempSetpointHoldDuration'] == 'number') {
                result[postfixWithEndpointName('temperature_setpoint_hold_duration', msg, model)] = msg.data['tempSetpointHoldDuration'];
            }
            return result;
        },
    },
    sinope_thermostat_att_report: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (!isLegacyEnabled(options)) {
                return fromZigbeeConverters.sinope_thermostat.convert(model, msg, publish, options, meta);
            }

            const result = fromZigbee.thermostat_att_report.convert(model, msg, publish, options, meta);
            // Sinope seems to report pIHeatingDemand between 0 and 100 already
            if (typeof msg.data['pIHeatingDemand'] == 'number') {
                result.pi_heating_demand = precisionRound(msg.data['pIHeatingDemand'], 0);
            }
            return result;
        },
    },
    stelpro_thermostat: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (!isLegacyEnabled(options)) {
                return fromZigbeeConverters.stelpro_thermostat.convert(model, msg, publish, options, meta);
            }

            const result = fromZigbee.thermostat_att_report.convert(model, msg, publish, options, meta);
            const mode = msg.data['StelproSystemMode'];
            if (mode == 'number') {
                result.stelpro_mode = mode;
                switch (mode) {
                case 5:
                    // 'Eco' mode is translated into 'auto' here
                    result.system_mode = thermostatSystemModes[1];
                    break;
                }
            }
            const piHeatingDemand = msg.data['pIHeatingDemand'];
            if (typeof piHeatingDemand == 'number') {
                // DEPRECATED: only return running_state here (change operation -> running_state)
                result.operation = piHeatingDemand >= 10 ? 'heating' : 'idle';
                result.running_state = piHeatingDemand >= 10 ? 'heat' : 'idle';
            }
            return result;
        },
    },
    viessmann_thermostat_att_report: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (!isLegacyEnabled(options)) {
                return fromZigbeeConverters.viessmann_thermostat.convert(model, msg, publish, options, meta);
            }

            const result = fromZigbee.thermostat_att_report.convert(model, msg, publish, options, meta);

            // ViessMann TRVs report piHeatingDemand from 0-5
            // NOTE: remove the result for now, but leave it configure for reporting
            //       it will show up in the debug log still to help try and figure out
            //       what this value potentially means.
            if (typeof msg.data['pIHeatingDemand'] == 'number') {
                delete result.pi_heating_demand;
            }

            return result;
        },
    },
    eurotronic_thermostat: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (!isLegacyEnabled(options)) {
                return fromZigbeeConverters.eurotronic_thermostat.convert(model, msg, publish, options, meta);
            }

            const result = fromZigbee.thermostat_att_report.convert(model, msg, publish, options, meta);
            // system_mode is always 'heat', we set it below based on eurotronic_host_flags
            if (result.system_mode) {
                delete result['system_mode'];
            }
            if (typeof msg.data[0x4003] == 'number') {
                result.current_heating_setpoint =
                    precisionRound(msg.data[0x4003], 2) / 100;
            }
            if (typeof msg.data[0x4008] == 'number') {
                result.eurotronic_host_flags = msg.data[0x4008];
                const resultHostFlags = {
                    'mirror_display': false,
                    'boost': false,
                    'window_open': false,
                    'child_protection': false,
                };
                if ((result.eurotronic_host_flags & 1 << 2) != 0) {
                    // system_mode => 'heat', boost mode
                    result.system_mode = thermostatSystemModes[4];
                    resultHostFlags.boost = true;
                } else if ((result.eurotronic_host_flags & (1 << 4)) != 0 ) {
                    // system_mode => 'off', window open detected
                    result.system_mode = thermostatSystemModes[0];
                    resultHostFlags.window_open = true;
                } else {
                    // system_mode => 'auto', default
                    result.system_mode = thermostatSystemModes[1];
                }
                if ((result.eurotronic_host_flags & (1 << 1)) != 0 ) {
                    // mirror_display
                    resultHostFlags.mirror_display = true;
                }
                if ((result.eurotronic_host_flags & (1 << 7)) != 0 ) {
                    // child protection
                    resultHostFlags.child_protection = true;
                }
                // keep eurotronic_system_mode for compatibility (is there a way to mark this as deprecated?)
                result.eurotronic_system_mode = result.eurotronic_host_flags;
                result.eurotronic_host_flags = resultHostFlags;
            }
            if (typeof msg.data[0x4002] == 'number') {
                result.eurotronic_error_status = msg.data[0x4002];
            }
            if (typeof msg.data[0x4000] == 'number') {
                result.eurotronic_trv_mode = msg.data[0x4000];
            }
            if (typeof msg.data[0x4001] == 'number') {
                result.eurotronic_valve_position = msg.data[0x4001];
            }
            return result;
        },
    },
    sinope_thermostat_state: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            const piHeatingDemand = msg.data['pIHeatingDemand'];
            if (typeof piHeatingDemand == 'number') {
                result.operation = piHeatingDemand >= 10 ? 'heating' : 'idle';
            }
            return result;
        },
    },
    wiser_thermostat: {
        cluster: 'hvacThermostat',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (!isLegacyEnabled(options)) {
                return fromZigbeeConverters.thermostat.convert(model, msg, publish, options, meta);
            }

            const result = {};
            if (typeof msg.data['localTemp'] == 'number') {
                result.local_temperature = precisionRound(msg.data['localTemp'], 2) / 100;
            }
            if (typeof msg.data['occupiedHeatingSetpoint'] == 'number') {
                result.occupied_heating_setpoint =
                    precisionRound(msg.data['occupiedHeatingSetpoint'], 2) / 100;
            }
            if (typeof msg.data['pIHeatingDemand'] == 'number') {
                result.pi_heating_demand = precisionRound(msg.data['pIHeatingDemand'], 2);
            }
            return result;
        },
    },
    hvac_user_interface: {
        cluster: 'hvacUserInterfaceCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (!isLegacyEnabled(options)) {
                return fromZigbeeConverters.hvac_user_interface.convert(model, msg, publish, options, meta);
            }

            const result = {};
            const lockoutMode = msg.data['keypadLockout'];
            if (typeof lockoutMode == 'number') {
                result.keypad_lockout = lockoutMode;
            }
            return result;
        },
    },
    thermostat_weekly_schedule_rsp: {
        cluster: 'hvacThermostat',
        type: ['commandGetWeeklyScheduleRsp'],
        convert: (model, msg, publish, options, meta) => {
            if (!isLegacyEnabled(options)) {
                return fromZigbeeConverters.thermostat_weekly_schedule.convert(model, msg, publish, options, meta);
            }

            const result = {};
            const key = postfixWithEndpointName('weekly_schedule', msg, model);
            result[key] = {};
            if (typeof msg.data['dayofweek'] == 'number') {
                result[key][msg.data['dayofweek']] = msg.data;
                for (const elem of result[key][msg.data['dayofweek']]['transitions']) {
                    if (typeof elem['heatSetpoint'] == 'number') {
                        elem['heatSetpoint'] /= 100;
                    }
                    if (typeof elem['coolSetpoint'] == 'number') {
                        elem['coolSetpoint'] /= 100;
                    }
                }
            }
            return result;
        },
    },
    terncy_knob: {
        cluster: 'manuSpecificClusterAduroSmart',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (!isLegacyEnabled(options)) {
                return fromZigbeeConverters.terncy_knob.convert(model, msg, publish, options, meta);
            }
            if (typeof msg.data['27'] === 'number') {
                return {
                    action: 'rotate',
                    direction: (msg.data['27'] > 0 ? 'clockwise' : 'counterclockwise'),
                    number: (Math.abs(msg.data['27']) / 12),
                };
            }
        },
    },
    wiser_itrv_battery: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (!isLegacyEnabled(options)) {
                return fromZigbeeConverters.battery.convert(model, msg, publish, options, meta);
            }

            const result = {};
            if (typeof msg.data['batteryVoltage'] == 'number') {
                const battery = {max: 30, min: 22};
                const voltage = msg.data['batteryVoltage'];
                result.battery = toPercentage(voltage, battery.min, battery.max);
                result.voltage = voltage / 10;
            }
            if (typeof msg.data['batteryAlarmState'] == 'number') {
                const battLow = msg.data['batteryAlarmState'];
                if (battLow) {
                    result['battery_low'] = true;
                } else {
                    result['battery_low'] = false;
                }
            }
            return result;
        },
    },
    ubisys_c4_scenes: {
        cluster: 'genScenes',
        type: 'commandRecall',
        convert: (model, msg, publish, options, meta) => {
            if (!isLegacyEnabled(options)) {
                return fromZigbeeConverters.command_recall.convert(model, msg, publish, options, meta);
            }
            return {action: `${msg.endpoint.ID}_scene_${msg.data.groupid}_${msg.data.sceneid}`};
        },
    },
    ubisys_c4_onoff: {
        cluster: 'genOnOff',
        type: ['commandOn', 'commandOff', 'commandToggle'],
        convert: (model, msg, publish, options, meta) => {
            if (!isLegacyEnabled(options)) {
                if (msg.type === 'commandOn') {
                    return fromZigbeeConverters.command_on.convert(model, msg, publish, options, meta);
                } else if (msg.type === 'commandOff') {
                    return fromZigbeeConverters.command_off.convert(model, msg, publish, options, meta);
                } else if (msg.type === 'commandToggle') {
                    return fromZigbeeConverters.command_toggle.convert(model, msg, publish, options, meta);
                }
            }
            return {action: `${msg.endpoint.ID}_${msg.type.substr(7).toLowerCase()}`};
        },
    },
    ubisys_c4_level: {
        cluster: 'genLevelCtrl',
        type: ['commandMoveWithOnOff', 'commandStopWithOnOff'],
        convert: (model, msg, publish, options, meta) => {
            if (!isLegacyEnabled(options)) {
                if (msg.type === 'commandMoveWithOnOff') {
                    return fromZigbeeConverters.command_move.convert(model, msg, publish, options, meta);
                } else if (msg.type === 'commandStopWithOnOff') {
                    return fromZigbeeConverters.command_stop.convert(model, msg, publish, options, meta);
                }
            }

            switch (msg.type) {
            case 'commandMoveWithOnOff':
                return {action: `${msg.endpoint.ID}_level_move_${msg.data.movemode ? 'down' : 'up'}`};
            case 'commandStopWithOnOff':
                return {action: `${msg.endpoint.ID}_level_stop`};
            }
        },
    },
    ubisys_c4_cover: {
        cluster: 'closuresWindowCovering',
        type: ['commandUpOpen', 'commandDownClose', 'commandStop'],
        convert: (model, msg, publish, options, meta) => {
            if (!isLegacyEnabled(options)) {
                if (msg.type === 'commandUpOpen') {
                    return fromZigbeeConverters.command_cover_open.convert(model, msg, publish, options, meta);
                } else if (msg.type === 'commandDownClose') {
                    return fromZigbeeConverters.command_cover_close.convert(model, msg, publish, options, meta);
                } else if (msg.type === 'commandStop') {
                    return fromZigbeeConverters.command_cover_stop.convert(model, msg, publish, options, meta);
                }
            }

            const lookup = {
                'commandUpOpen': 'open',
                'commandDownClose': 'close',
                'commandStop': 'stop',
            };
            return {action: `${msg.endpoint.ID}_cover_${lookup[msg.type]}`};
        },
    },
    tuya_thermostat_weekly_schedule: {
        cluster: 'manuSpecificTuya',
        type: ['commandGetData', 'commandSetDataResponse'],
        convert: (model, msg, publish, options, meta) => {
            if (!isLegacyEnabled(options)) {
                return fromZigbeeConverters.tuya_thermostat_weekly_schedule.convert(model, msg, publish, options, meta);
            }

            const dp = msg.data.dp;
            const value = tuyaGetDataValue(msg.data.datatype, msg.data.data);

            const thermostatMeta = getMetaValue(msg.endpoint, model, 'thermostat');
            const firstDayDpId = thermostatMeta.weeklyScheduleFirstDayDpId;
            const maxTransitions = thermostatMeta.weeklyScheduleMaxTransitions;
            let dataOffset = 0;
            let conversion = 'generic';

            function dataToTransitions(data, maxTransitions, offset) {
                // Later it is possible to move converter to meta or to other place outside if other type of converter
                // will be needed for other device. Currently this converter is based on ETOP HT-08 thermostat.
                // see also toZigbee.tuya_thermostat_weekly_schedule()
                function dataToTransition(data, index) {
                    return {
                        transitionTime: (data[index+0] << 8) + data [index+1],
                        heatSetpoint: (parseFloat((data[index+2] << 8) + data [index+3]) / 10.0).toFixed(1),
                    };
                }
                const result = [];
                for (let i = 0; i < maxTransitions; i++) {
                    result.push(dataToTransition(data, i * 4 + offset));
                }
                return result;
            }

            if (thermostatMeta.hasOwnProperty('weeklyScheduleConversion')) {
                conversion = thermostatMeta.weeklyScheduleConversion;
            }
            if (conversion == 'saswell') {
                // Saswell has scheduling mode in the first byte
                dataOffset = 1;
            }
            if (dp >= firstDayDpId && dp < firstDayDpId+7) {
                const dayOfWeek = dp - firstDayDpId + 1;
                return {
                    // Same as in hvacThermostat:getWeeklyScheduleRsp hvacThermostat:setWeeklySchedule cluster format
                    weekly_schedule: {
                        [dayOfWeek]: {
                            dayofweek: dayOfWeek,
                            numoftrans: maxTransitions,
                            mode: 1, // bits: 0-heat present, 1-cool present (dec: 1-heat,2-cool,3-heat+cool)
                            transitions: dataToTransitions(value, maxTransitions, dataOffset),
                        },
                    },
                };
            }
        },
    },
    hue_dimmer_switch: {
        cluster: 'manuSpecificPhilips',
        type: 'commandHueNotification',
        convert: (model, msg, publish, options, meta) => {
            if (!isLegacyEnabled(options)) {
                return fromZigbeeConverters.hue_dimmer_switch.convert(model, msg, publish, options, meta);
            }

            const multiplePressTimeout = options && options.hasOwnProperty('multiple_press_timeout') ?
                options.multiple_press_timeout : 0.25;

            const getPayload = function(button, pressType, pressDuration, pressCounter,
                brightnessSend, brightnessValue) {
                const payLoad = {};
                payLoad['action'] = `${button}-${pressType}`;
                payLoad['duration'] = pressDuration / 1000;
                if (pressCounter) {
                    payLoad['counter'] = pressCounter;
                }
                if (brightnessSend) {
                    payLoad['brightness'] = fromZigbeeStore[deviceID].brightnessValue;
                }
                return payLoad;
            };

            const deviceID = msg.device.ieeeAddr;
            const buttonLookup = {1: 'on', 2: 'up', 3: 'down', 4: 'off'};
            const button = buttonLookup[msg.data['button']];

            const typeLookup = {0: 'press', 1: 'hold', 2: 'release', 3: 'release'};
            const type = typeLookup[msg.data['type']];

            const brightnessEnabled = options && options.hasOwnProperty('send_brightess') ?
                options.send_brightess : true;
            const brightnessSend = brightnessEnabled && button && (button == 'up' || button == 'down');

            // Initialize store
            if (!fromZigbeeStore[deviceID]) {
                fromZigbeeStore[deviceID] = {pressStart: null, pressType: null,
                    delayedButton: null, delayedBrightnessSend: null, delayedType: null,
                    delayedCounter: 0, delayedTimerStart: null, delayedTimer: null};
                if (brightnessEnabled) {
                    fromZigbeeStore[deviceID].brightnessValue = 255;
                    fromZigbeeStore[deviceID].brightnessSince = null;
                    fromZigbeeStore[deviceID].brightnessDirection = null;
                }
            }

            if (button && type) {
                if (type == 'press') {
                    fromZigbeeStore[deviceID].pressStart = Date.now();
                    fromZigbeeStore[deviceID].pressType = 'press';
                    if (brightnessSend) {
                        const newValue = fromZigbeeStore[deviceID].brightnessValue + (button === 'up' ? 32 : -32);
                        fromZigbeeStore[deviceID].brightnessValue = numberWithinRange(newValue, 1, 255);
                    }
                } else if (type == 'hold') {
                    fromZigbeeStore[deviceID].pressType = 'hold';
                    if (brightnessSend) {
                        holdUpdateBrightness324131092621(deviceID);
                        fromZigbeeStore[deviceID].brightnessSince = Date.now();
                        fromZigbeeStore[deviceID].brightnessDirection = button;
                    }
                } else if (type == 'release') {
                    if (brightnessSend) {
                        fromZigbeeStore[deviceID].brightnessSince = null;
                        fromZigbeeStore[deviceID].brightnessDirection = null;
                    }
                    if (fromZigbeeStore[deviceID].pressType == 'hold') {
                        fromZigbeeStore[deviceID].pressType += '-release';
                    }
                }
                if (type == 'press') {
                    // pressed different button
                    if (fromZigbeeStore[deviceID].delayedTimer && (fromZigbeeStore[deviceID].delayedButton != button)) {
                        clearTimeout(fromZigbeeStore[deviceID].delayedTimer);
                        fromZigbeeStore[deviceID].delayedTimer = null;
                        publish(getPayload(fromZigbeeStore[deviceID].delayedButton,
                            fromZigbeeStore[deviceID].delayedType, 0, fromZigbeeStore[deviceID].delayedCounter,
                            fromZigbeeStore[deviceID].delayedBrightnessSend,
                            fromZigbeeStore[deviceID].brightnessValue));
                    }
                } else {
                    // released after press: start timer
                    if (fromZigbeeStore[deviceID].pressType == 'press') {
                        if (fromZigbeeStore[deviceID].delayedTimer) {
                            clearTimeout(fromZigbeeStore[deviceID].delayedTimer);
                            fromZigbeeStore[deviceID].delayedTimer = null;
                        } else {
                            fromZigbeeStore[deviceID].delayedCounter = 0;
                        }
                        fromZigbeeStore[deviceID].delayedButton = button;
                        fromZigbeeStore[deviceID].delayedBrightnessSend = brightnessSend;
                        fromZigbeeStore[deviceID].delayedType = fromZigbeeStore[deviceID].pressType;
                        fromZigbeeStore[deviceID].delayedCounter++;
                        fromZigbeeStore[deviceID].delayedTimerStart = Date.now();
                        fromZigbeeStore[deviceID].delayedTimer = setTimeout(() => {
                            publish(getPayload(fromZigbeeStore[deviceID].delayedButton,
                                fromZigbeeStore[deviceID].delayedType, 0, fromZigbeeStore[deviceID].delayedCounter,
                                fromZigbeeStore[deviceID].delayedBrightnessSend,
                                fromZigbeeStore[deviceID].brightnessValue));
                            fromZigbeeStore[deviceID].delayedTimer = null;
                        }, multiplePressTimeout * 1000);
                    } else {
                        const pressDuration =
                            (fromZigbeeStore[deviceID].pressType == 'hold' || fromZigbeeStore[deviceID].pressType == 'hold-release') ?
                                Date.now() - fromZigbeeStore[deviceID].pressStart : 0;
                        return getPayload(button,
                            fromZigbeeStore[deviceID].pressType, pressDuration, null, brightnessSend,
                            fromZigbeeStore[deviceID].brightnessValue);
                    }
                }
            }

            return {};
        },
    },
};

const thermostatControlSequenceOfOperations = {
    0: 'cooling only',
    1: 'cooling with reheat',
    2: 'heating only',
    3: 'heating with reheat',
    4: 'cooling and heating 4-pipes',
    5: 'cooling and heating 4-pipes with reheat',
};

const thermostatSystemModes = {
    0: 'off',
    1: 'auto',
    3: 'cool',
    4: 'heat',
    5: 'emergency heating',
    6: 'precooling',
    7: 'fan_only',
    8: 'dry',
    9: 'Sleep',
};

module.exports = {
    fromZigbee,
    thermostatControlSequenceOfOperations,
    thermostatSystemModes,
};
