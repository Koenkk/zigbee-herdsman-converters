/* eslint-disable linebreak-style */
const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const ea = exposes.access;


const zigfredEndpoint = 5;

const buttonLookup = {
    0: 'button_1',
    1: 'button_2',
    2: 'button_3',
    3: 'button_4',
};

const actionLookup = {
    0: 'release',
    1: 'single',
    2: 'double',
    3: 'hold',
};

const zifgredFromZigbeeButtonEvent = {
    cluster: 'manuSpecificSiglisZigfred',
    type: ['commandSiglisZigfredButtonEvent'],
    convert: (model, msg, publish, options, meta) => {
        const button = msg.data.button;
        const type = msg.data.type;

        const buttonName = buttonLookup[button];
        const typeName = actionLookup[type];

        if (buttonName && typeName) {
            const action = `${buttonName}_${typeName}`;
            return {action};
        }
    },
};

const coverAndLightToZigbee = {
    key: ['state', 'brightness', 'brightness_percent', 'on_time'],
    options: [exposes.options.transition()],
    convertSet: async (entity, key, value, meta) => {
        const isCover = (typeof value === 'string' && ['open', 'close', 'stop'].includes(value.toLowerCase()));
        if (isCover) {
            return tz.cover_state.convertSet(entity, key, value, meta);
        } else {
            return tz.light_onoff_brightness.convertSet(entity, key, value, meta);
        }
    },
    convertGet: async (entity, key, meta) => {
        if (key === 'brightness') {
            await entity.read('genLevelCtrl', ['currentLevel']);
        } else if (key === 'state') {
            await tz.on_off.convertGet(entity, key, meta);
        }
    },
};

const buttonEventExposes = e.action([
    'button_1_single', 'button_1_double', 'button_1_hold', 'button_1_release',
    'button_2_single', 'button_2_double', 'button_2_hold', 'button_2_release',
    'button_3_single', 'button_3_double', 'button_3_hold', 'button_3_release',
    'button_4_single', 'button_4_double', 'button_4_hold', 'button_4_release',
]);

function checkOption(options, key) {
    if (options && options.hasOwnProperty(key)) {
        return options[key];
    } else {
        return false;
    }
}

function setOption(options, key, enabled) {
    if (options) {
        options[key] = enabled;
    }
}

module.exports = [
    {
        zigbeeModel: ['zigfred uno'],
        model: 'ZFU-1D-CH',
        vendor: 'Siglis',
        description: 'zigfred uno smart in-wall switch',
        options: [
            exposes.binary(`front_surface_enabled`, ea.SET, true, false)
                .withDescription('Front Surface LED enabled'),
            exposes.binary(`relay_enabled`, ea.SET, true, false)
                .withDescription('Relay enabled'),
            exposes.binary(`dimmer_enabled`, ea.SET, true, false)
                .withDescription('Dimmer enabled'),
        ],
        exposes: (device, options) => {
            const expose = [];

            expose.push(buttonEventExposes);
            expose.push(e.linkquality());

            if (device != null && options != null) {
                if (checkOption(options, 'front_surface_enabled')) {
                    expose.push(e.light_brightness_colorxy().withEndpoint('l1'));
                }

                if (checkOption(options, 'relay_enabled')) {
                    expose.push(e.switch().withEndpoint('l2'));
                }

                if (checkOption(options, 'dimmer_enabled')) {
                    expose.push(e.light_brightness().withEndpoint('l3'));
                }
            }

            return expose;
        },
        fromZigbee: [
            zifgredFromZigbeeButtonEvent,
            fz.color_colortemp,
            fz.on_off,
            fz.brightness,
            fz.level_config,
            fz.power_on_behavior,
            fz.ignore_basic_report,
        ],
        toZigbee: [
            tz.light_onoff_brightness,
            tz.light_color,
            tz.ignore_transition,
            tz.ignore_rate,
            tz.light_brightness_move,
            tz.light_brightness_step,
            tz.level_config,
            tz.power_on_behavior,
            tz.light_hue_saturation_move,
            tz.light_hue_saturation_step,
            tz.light_color_options,
            tz.light_color_mode,
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {
                'l1': zigfredEndpoint,
                'l2': 6,
                'l3': 7,
            };
        },
        configure: async (device, coordinatorEndpoint, logger, options) => {
            if (device != null) {
                const controlEp = device.getEndpoint(zigfredEndpoint);
                const relayEp = device.getEndpoint(6);
                const dimmerEp = device.getEndpoint(7);

                // Bind Control EP (LED)
                setOption(options, 'front_surface_enabled', (await controlEp.read('genBasic', ['deviceEnabled'])).deviceEnabled);
                if (checkOption(options, 'front_surface_enabled')) {
                    await reporting.bind(controlEp, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'manuSpecificSiglisZigfred']);
                    await reporting.onOff(controlEp);
                    await reporting.brightness(controlEp);
                }

                // Bind Relay EP
                setOption(options, 'relay_enabled', (await controlEp.read('genBasic', ['deviceEnabled'])).deviceEnabled);
                if (checkOption(options, 'relay_enabled')) {
                    await reporting.bind(relayEp, coordinatorEndpoint, ['genOnOff']);
                    await reporting.onOff(relayEp);
                }

                // Bind Dimmer EP
                setOption(options, 'dimmer_enabled', (await controlEp.read('genBasic', ['deviceEnabled'])).deviceEnabled);
                if (checkOption(options, 'dimmer_enabled')) {
                    await reporting.bind(dimmerEp, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
                    await reporting.onOff(dimmerEp);
                    await reporting.brightness(dimmerEp);
                }
            }
        },
    },
    {
        zigbeeModel: ['zigfred plus'],
        model: 'ZFP-1A-CH',
        vendor: 'Siglis',
        description: 'zigfred plus smart in-wall switch',
        options: [
            exposes.binary(`front_surface_enabled`, ea.SET, true, false)
                .withDescription('Front Surface LED enabled'),
            exposes.binary(`dimmer_1_enabled`, ea.SET, true, false)
                .withDescription('Dimmer 1 enabled'),
            exposes.binary(`dimmer_2_enabled`, ea.SET, true, false)
                .withDescription('Dimmer 2 enabled'),
            exposes.binary(`dimmer_3_enabled`, ea.SET, true, false)
                .withDescription('Dimmer 3 enabled'),
            exposes.binary(`dimmer_4_enabled`, ea.SET, true, false)
                .withDescription('Dimmer 4 enabled'),
            exposes.binary(`cover_1_enabled`, ea.SET, true, false)
                .withDescription('Cover 1 enabled'),
            exposes.binary(`cover_1_tilt_enabled`, ea.SET, true, false)
                .withDescription('Cover 1 tiltable'),
            exposes.binary(`cover_2_enabled`, ea.SET, true, false)
                .withDescription('Cover 2 enabled'),
            exposes.binary(`cover_2_tilt_enabled`, ea.SET, true, false)
                .withDescription('Cover 2 tiltable'),
        ],
        exposes: (device, options) => {
            const expose = [];

            expose.push(buttonEventExposes);
            expose.push(e.linkquality());

            if (device != null && options != null) {
                if (checkOption(options, 'front_surface_enabled')) {
                    expose.push(e.light_brightness_colorxy().withEndpoint('l1'));
                }

                if (checkOption(options, 'dimmer_1_enabled')) {
                    expose.push(e.light_brightness().withEndpoint('l2'));
                }

                if (checkOption(options, 'dimmer_2_enabled')) {
                    expose.push(e.light_brightness().withEndpoint('l3'));
                }

                if (checkOption(options, 'dimmer_3_enabled')) {
                    expose.push(e.light_brightness().withEndpoint('l4'));
                }

                if (checkOption(options, 'dimmer_4_enabled')) {
                    expose.push(e.light_brightness().withEndpoint('l5'));
                }

                if (checkOption(options, 'cover_1_enabled')) {
                    if (checkOption(options, 'cover_2_tilt_enabled')) {
                        expose.push(exposes.cover()
                            .setAccess('state', exposes.access.STATE_SET | exposes.access.STATE_GET)
                            .withPosition().withTilt().withEndpoint('l6'));
                    } else {
                        expose.push(exposes.cover()
                            .setAccess('state', exposes.access.STATE_SET | exposes.access.STATE_GET)
                            .withPosition().withEndpoint('l6'));
                    }
                }

                if (checkOption(options, 'cover_2_enabled')) {
                    if (checkOption(options, 'cover_2_tilt_enabled')) {
                        expose.push(exposes.cover()
                            .setAccess('state', exposes.access.STATE_SET | exposes.access.STATE_GET)
                            .withPosition().withTilt().withEndpoint('l7'));
                    } else {
                        expose.push(exposes.cover()
                            .setAccess('state', exposes.access.STATE_SET | exposes.access.STATE_GET)
                            .withPosition().withEndpoint('l7'));
                    }
                }
            }

            return expose;
        },
        fromZigbee: [
            zifgredFromZigbeeButtonEvent,
            fz.color_colortemp,
            fz.on_off,
            fz.brightness,
            fz.level_config,
            fz.power_on_behavior,
            fz.ignore_basic_report,
            fz.cover_position_tilt,
            fz.command_cover_open,
            fz.command_cover_close,
            fz.command_cover_stop,
        ],
        toZigbee: [
            tz.light_color,
            tz.ignore_transition,
            tz.ignore_rate,
            tz.light_brightness_move,
            tz.light_brightness_step,
            tz.level_config,
            tz.power_on_behavior,
            tz.light_hue_saturation_move,
            tz.light_hue_saturation_step,
            tz.light_color_options,
            tz.light_color_mode,
            tz.cover_position_tilt,
            coverAndLightToZigbee,
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {
                'l1': zigfredEndpoint,
                'l2': 7,
                'l3': 8,
                'l4': 9,
                'l5': 10,
                'l6': 11,
                'l7': 12,
            };
        },
        configure: async (device, coordinatorEndpoint, logger, options) => {
            if (device != null) {
                // Bind Control EP (LED)
                const controlEp = device.getEndpoint(zigfredEndpoint);
                setOption(options, 'front_surface_enabled', (await controlEp.read('genBasic', ['deviceEnabled'])).deviceEnabled);
                if (checkOption(options, 'front_surface_enabled')) {
                    await reporting.bind(controlEp, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'manuSpecificSiglisZigfred']);
                    await reporting.onOff(controlEp);
                    await reporting.brightness(controlEp);
                }

                // Bind Dimmer 1 EP
                const dimmer1Ep = device.getEndpoint(7);
                setOption(options, 'dimmer_1_enabled', (await dimmer1Ep.read('genBasic', ['deviceEnabled'])).deviceEnabled);
                if (checkOption(options, 'dimmer_1_enabled')) {
                    await reporting.bind(dimmer1Ep, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
                    await reporting.onOff(dimmer1Ep);
                    await reporting.brightness(dimmer1Ep);
                }

                // Bind Dimmer 2 EP
                const dimmer2Ep = device.getEndpoint(8);
                setOption(options, 'dimmer_2_enabled', (await dimmer2Ep.read('genBasic', ['deviceEnabled'])).deviceEnabled);
                if (checkOption(options, 'dimmer_2_enabled')) {
                    await reporting.bind(dimmer2Ep, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
                    await reporting.onOff(dimmer2Ep);
                    await reporting.brightness(dimmer2Ep);
                }

                // Bind Dimmer 3 EP
                const dimmer3Ep = device.getEndpoint(9);
                setOption(options, 'dimmer_3_enabled', (await dimmer3Ep.read('genBasic', ['deviceEnabled'])).deviceEnabled);
                if (checkOption(options, 'dimmer_3_enabled')) {
                    await reporting.bind(dimmer3Ep, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
                    await reporting.onOff(dimmer3Ep);
                    await reporting.brightness(dimmer3Ep);
                }

                // Bind Dimmer 4 EP
                const dimmer4Ep = device.getEndpoint(10);
                setOption(options, 'dimmer_4_enabled', (await dimmer4Ep.read('genBasic', ['deviceEnabled'])).deviceEnabled);
                if (checkOption(options, 'dimmer_4_enabled')) {
                    await reporting.bind(dimmer4Ep, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
                    await reporting.onOff(dimmer4Ep);
                    await reporting.brightness(dimmer4Ep);
                }

                // Bind Cover 1 EP
                const cover1Ep = device.getEndpoint(11);
                setOption(options, 'cover_1_enabled', (await cover1Ep.read('genBasic', ['deviceEnabled'])).deviceEnabled);
                if (checkOption(options, 'cover_1_enabled')) {
                    await reporting.bind(cover1Ep, coordinatorEndpoint, ['closuresWindowCovering']);
                    await reporting.currentPositionLiftPercentage(cover1Ep);
                    setOption(
                        options,
                        'cover_1_tilt_enabled',
                        (await cover1Ep.read('closuresWindowCovering', ['windowCoveringType'])).windowCoveringType === 0x08);
                    if (checkOption(options, 'cover_1_tilt_enabled')) {
                        await reporting.currentPositionTiltPercentage(cover1Ep);
                    }
                }

                // Bind Cover 2 EP
                const cover2Ep = device.getEndpoint(12);
                setOption(options, 'cover_2_enabled', (await cover2Ep.read('genBasic', ['deviceEnabled'])).deviceEnabled);
                if (checkOption(options, 'cover_2_enabled')) {
                    await reporting.bind(cover2Ep, coordinatorEndpoint, ['closuresWindowCovering']);
                    await reporting.currentPositionLiftPercentage(cover2Ep);
                    setOption(
                        options,
                        'cover_2_tilt_enabled',
                        (await cover2Ep.read('closuresWindowCovering', ['windowCoveringType'])).windowCoveringType === 0x08);
                    if (checkOption(options, 'cover_2_tilt_enabled')) {
                        await reporting.currentPositionTiltPercentage(cover2Ep);
                    }
                }
            }
        },
    },
];
