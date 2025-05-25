// Add this definition to a new file or an appropriate existing file in the Zigbee2MQTT device definitions.
// Example: devices/awox.js or a new file like devices/awox_33952.js

const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const ota = require('zigbee-herdsman-converters/lib/ota');
const e = exposes.presets;
const ea = exposes.access;

const definition = {
    zigbeeModel: ['ERCU_Zm'],
    model: '33952',
    vendor: 'AwoX',
    description: 'AwoX Remote Controller',
    supports: 'on/off, dimming, scene control, color control, color temperature control',
    fromZigbee: [fz.legacy_action_rate, fz.on_off, fz.awox_remote_actions], // Using a unique name for the custom converter
    toZigbee: [],
    exposes: [
        e.action([
            'on', 'off',
            'brightness_step_up', 'brightness_step_down',
            'color_blue', 'color_green', 'color_yellow', 'color_red',
            'color_temp_warm', 'color_temp_cold',
            'light_movement',
            'refresh',
            'scene_1', 'scene_2',
        ]),
    ],
    configure: async (device, coordinator, ledger) => {
        // No specific configuration needed based on current observations.
    },
};

const awox_remote_actions = {
    cluster: 'genOnOff', // Base cluster, actual actions depend on type and payload
    type: ['commandOn', 'commandOff', 'raw', 'commandStepWithOnOff', 'commandStep', 'commandEnhancedMoveHue', 'commandRecall', 'commandStepColorTemp'],
    convert: (model, msg, publish, options, meta) => {
        const payload = msg.data;
        let action = null;

        // Prioritize specific actions over generic on/off
        if (msg.cluster === 'lightingColorCtrl') {
            if (msg.type === 'raw') {
                const colorByte = payload.data[4];
                switch (colorByte) {
                    case 0xD6: action = 'color_blue'; break;
                    case 0xD4: action = 'color_green'; break;
                    case 0xD2: action = 'color_yellow'; break;
                    case 0xD0: action = 'color_red'; break;
                }
            } else if (msg.type === 'commandEnhancedMoveHue') {
                action = 'light_movement';
            } else if (msg.type === 'commandStepColorTemp') {
                if (payload.stepmode === 1) {
                    action = 'color_temp_warm';
                } else if (payload.stepmode === 3) {
                    action = 'color_temp_cold';
                }
            }
        } else if (msg.cluster === 'genLevelCtrl') {
            if (msg.type === 'commandStepWithOnOff' && payload.stepmode === 0) {
                action = 'brightness_step_up';
            } else if (msg.type === 'commandStep' && payload.stepmode === 1) {
                action = 'brightness_step_down';
            } else if (msg.type === 'raw' && payload.data && payload.data[1] === 0xDF) {
                action = 'refresh';
            }
        } else if (msg.cluster === 'genScenes') {
            if (msg.type === 'commandRecall') {
                if (payload.sceneid === 1) {
                    action = 'scene_1';
                } else if (payload.sceneid === 2) {
                    action = 'scene_2';
                }
            }
        }
        // Handle generic On/Off last if no specific action is found
        else if (msg.cluster === 'genOnOff') {
            if (msg.type === 'commandOn') {
                action = 'on';
            } else if (msg.type === 'commandOff') {
                action = 'off';
            }
        }

        if (action) {
            return {action: action};
        }
    },
};

module.exports = [
    definition,
];
