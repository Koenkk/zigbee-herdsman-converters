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
    key: ['state', 'brightness', 'brightness_percent', 'on_time', 'position', 'tilt'],
    options: [exposes.options.transition()],
    convertSet: async (entity, key, value, meta) => {
        const isCover = entity.ID === 0x0b || entity.ID === 0x0c;
        if (isCover) {
            if (key === 'state') {
                return tz.cover_state.convertSet(entity, key, value, meta);
            } else if (key === 'position' || key === 'tilt') {
                return tz.cover_position_tilt.convertSet(entity, key, value, meta);
            }
        } else {
            if (key === 'state' || key === 'brightness' || key === 'brightness_percent' || key === 'on_time') {
                return tz.light_onoff_brightness.convertSet(entity, key, value, meta);
            }
        }
    },
    convertGet: async (entity, key, meta) => {
        if (key === 'state' && (entity.ID === 0x0b || entity.ID === 0x0c)) {
            await tz.cover_position_tilt.convertGet(entity, 'position', meta);
        } else if (key === 'brightness') {
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

function checkOption(device, options, key) {
    if (options != null && options.hasOwnProperty(key)) {
        if (options[key] === 'true') {
            return true;
        } else if (options[key] === 'false') {
            return false;
        }
    }

    return checkMetaOption(device, key);
}

function checkMetaOption(device, key) {
    if (device != null) {
        const enabled = device.meta[key];
        if (enabled === undefined) {
            return false;
        } else {
            return !!enabled;
        }
    }

    return false;
}

function setMetaOption(device, key, enabled) {
    if (device != null && key != null) {
        device.meta[key] = enabled;
    }
}

module.exports = [
    {
        zigbeeModel: ['zigfred uno'],
        model: 'ZFU-1D-CH',
        vendor: 'Siglis',
        description: 'zigfred uno smart in-wall switch',
        options: [
            exposes.enum(`front_surface_enabled`, ea.SET, ['auto', 'true', 'false'])
                .withDescription('Front Surface LED enabled'),
            exposes.enum(`relay_enabled`, ea.SET, ['auto', 'true', 'false'])
                .withDescription('Relay enabled'),
            exposes.enum(`dimmer_enabled`, ea.SET, ['auto', 'true', 'false'])
                .withDescription('Dimmer enabled'),
            exposes.enum(`dimmer_dimming_enabled`, ea.SET, ['auto', 'true', 'false'])
                .withDescription('Dimmer dimmable'),
        ],
        exposes: (device, options) => {
            const expose = [];

            expose.push(buttonEventExposes);
            expose.push(e.linkquality());

            if (checkOption(device, options, 'front_surface_enabled')) {
                expose.push(e.light_brightness_colorxy().withEndpoint('l1'));
            }

            if (checkOption(device, options, 'relay_enabled')) {
                expose.push(e.switch().withEndpoint('l2'));
            }

            if (checkOption(device, options, 'dimmer_enabled')) {
                if (checkOption(device, options, 'dimmer_dimming_enabled')) {
                    expose.push(e.light_brightness().withEndpoint('l3'));
                } else {
                    expose.push(e.switch().withEndpoint('l3'));
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
                setMetaOption(device, 'front_surface_enabled', (await controlEp.read('genBasic', ['deviceEnabled'])).deviceEnabled);
                if (checkMetaOption(device, 'front_surface_enabled')) {
                    await reporting.bind(controlEp, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'manuSpecificSiglisZigfred']);
                    await reporting.onOff(controlEp);
                    await reporting.brightness(controlEp);
                }

                // Bind Relay EP
                setMetaOption(device, 'relay_enabled', (await relayEp.read('genBasic', ['deviceEnabled'])).deviceEnabled);
                if (checkMetaOption(device, 'relay_enabled')) {
                    await reporting.bind(relayEp, coordinatorEndpoint, ['genOnOff']);
                    await reporting.onOff(relayEp);
                }

                // Bind Dimmer EP
                setMetaOption(device, 'dimmer_enabled', (await dimmerEp.read('genBasic', ['deviceEnabled'])).deviceEnabled);
                if (checkMetaOption(device, 'dimmer_enabled')) {
                    await reporting.bind(dimmerEp, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
                    await reporting.onOff(dimmerEp);
                    await reporting.brightness(dimmerEp);
                }
                setMetaOption(device, 'dimmer_dimming_enabled', true);

                device.save();
            }
        },
    },
    {
        zigbeeModel: ['zigfred plus'],
        model: 'ZFP-1A-CH',
        vendor: 'Siglis',
        description: 'zigfred plus smart in-wall switch',
        options: [
            exposes.enum(`front_surface_enabled`, ea.SET, ['auto', 'true', 'false'])
                .withDescription('Front Surface LED enabled'),
            exposes.enum(`dimmer_1_enabled`, ea.SET, ['auto', 'true', 'false'])
                .withDescription('Dimmer 1 enabled'),
            exposes.enum(`dimmer_1_dimming_enabled`, ea.SET, ['auto', 'true', 'false'])
                .withDescription('Dimmer 1 dimmable'),
            exposes.enum(`dimmer_2_enabled`, ea.SET, ['auto', 'true', 'false'])
                .withDescription('Dimmer 2 enabled'),
            exposes.enum(`dimmer_2_dimming_enabled`, ea.SET, ['auto', 'true', 'false'])
                .withDescription('Dimmer 2 dimmable'),
            exposes.enum(`dimmer_3_enabled`, ea.SET, ['auto', 'true', 'false'])
                .withDescription('Dimmer 3 enabled'),
            exposes.enum(`dimmer_3_dimming_enabled`, ea.SET, ['auto', 'true', 'false'])
                .withDescription('Dimmer 3 dimmable'),
            exposes.enum(`dimmer_4_enabled`, ea.SET, ['auto', 'true', 'false'])
                .withDescription('Dimmer 4 enabled'),
            exposes.enum(`dimmer_4_dimming_enabled`, ea.SET, ['auto', 'true', 'false'])
                .withDescription('Dimmer 4 dimmable'),
            exposes.enum(`cover_1_enabled`, ea.SET, ['auto', 'true', 'false'])
                .withDescription('Cover 1 enabled'),
            exposes.enum(`cover_1_tilt_enabled`, ea.SET, ['auto', 'true', 'false'])
                .withDescription('Cover 1 tiltable'),
            exposes.enum(`cover_2_enabled`, ea.SET, ['auto', 'true', 'false'])
                .withDescription('Cover 2 enabled'),
            exposes.enum(`cover_2_tilt_enabled`, ea.SET, ['auto', 'true', 'false'])
                .withDescription('Cover 2 tiltable'),
        ],
        exposes: (device, options) => {
            const expose = [];

            expose.push(buttonEventExposes);
            expose.push(e.linkquality());

            if (checkOption(device, options, 'front_surface_enabled')) {
                expose.push(e.light_brightness_colorxy().withEndpoint('l1'));
            }

            if (checkOption(device, options, 'dimmer_1_enabled')) {
                if (checkOption(device, options, 'dimmer_1_dimming_enabled')) {
                    expose.push(e.light_brightness().withEndpoint('l2'));
                } else {
                    expose.push(e.switch().withEndpoint('l2'));
                }
            }

            if (checkOption(device, options, 'dimmer_2_enabled')) {
                if (checkOption(device, options, 'dimmer_2_dimming_enabled')) {
                    expose.push(e.light_brightness().withEndpoint('l3'));
                } else {
                    expose.push(e.switch().withEndpoint('l3'));
                }
            }

            if (checkOption(device, options, 'dimmer_3_enabled')) {
                if (checkOption(device, options, 'dimmer_3_dimming_enabled')) {
                    expose.push(e.light_brightness().withEndpoint('l4'));
                } else {
                    expose.push(e.switch().withEndpoint('l4'));
                }
            }

            if (checkOption(device, options, 'dimmer_4_enabled')) {
                if (checkOption(device, options, 'dimmer_4_dimming_enabled')) {
                    expose.push(e.light_brightness().withEndpoint('l5'));
                } else {
                    expose.push(e.switch().withEndpoint('l5'));
                }
            }

            if (checkOption(device, options, 'cover_1_enabled')) {
                if (checkOption(device, options, 'cover_1_tilt_enabled')) {
                    expose.push(exposes.cover()
                        .setAccess('state', exposes.access.STATE_SET | exposes.access.STATE_GET)
                        .withPosition().withTilt().withEndpoint('l6'));
                } else {
                    expose.push(exposes.cover()
                        .setAccess('state', exposes.access.STATE_SET | exposes.access.STATE_GET)
                        .withPosition().withEndpoint('l6'));
                }
            }

            if (checkOption(device, options, 'cover_2_enabled')) {
                if (checkOption(device, options, 'cover_2_tilt_enabled')) {
                    expose.push(exposes.cover()
                        .setAccess('state', exposes.access.STATE_SET | exposes.access.STATE_GET)
                        .withPosition().withTilt().withEndpoint('l7'));
                } else {
                    expose.push(exposes.cover()
                        .setAccess('state', exposes.access.STATE_SET | exposes.access.STATE_GET)
                        .withPosition().withEndpoint('l7'));
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
                setMetaOption(device, 'front_surface_enabled', (await controlEp.read('genBasic', ['deviceEnabled'])).deviceEnabled);
                if (checkMetaOption(device, 'front_surface_enabled')) {
                    await reporting.bind(controlEp, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'manuSpecificSiglisZigfred']);
                    await reporting.onOff(controlEp);
                    await reporting.brightness(controlEp);
                }

                // Bind Dimmer 1 EP
                const dimmer1Ep = device.getEndpoint(7);
                setMetaOption(device, 'dimmer_1_enabled', (await dimmer1Ep.read('genBasic', ['deviceEnabled'])).deviceEnabled);
                if (checkMetaOption(device, 'dimmer_1_enabled')) {
                    await reporting.bind(dimmer1Ep, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
                    await reporting.onOff(dimmer1Ep);
                    await reporting.brightness(dimmer1Ep);
                }
                setMetaOption(device, 'dimmer_1_dimming_enabled', true);

                // Bind Dimmer 2 EP
                const dimmer2Ep = device.getEndpoint(8);
                setMetaOption(device, 'dimmer_2_enabled', (await dimmer2Ep.read('genBasic', ['deviceEnabled'])).deviceEnabled);
                if (checkMetaOption(device, 'dimmer_2_enabled')) {
                    await reporting.bind(dimmer2Ep, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
                    await reporting.onOff(dimmer2Ep);
                    await reporting.brightness(dimmer2Ep);
                }
                setMetaOption(device, 'dimmer_2_dimming_enabled', true);

                // Bind Dimmer 3 EP
                const dimmer3Ep = device.getEndpoint(9);
                setMetaOption(device, 'dimmer_3_enabled', (await dimmer3Ep.read('genBasic', ['deviceEnabled'])).deviceEnabled);
                if (checkMetaOption(device, 'dimmer_3_enabled')) {
                    await reporting.bind(dimmer3Ep, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
                    await reporting.onOff(dimmer3Ep);
                    await reporting.brightness(dimmer3Ep);
                }
                setMetaOption(device, 'dimmer_3_dimming_enabled', true);

                // Bind Dimmer 4 EP
                const dimmer4Ep = device.getEndpoint(10);
                setMetaOption(device, 'dimmer_4_enabled', (await dimmer4Ep.read('genBasic', ['deviceEnabled'])).deviceEnabled);
                if (checkMetaOption(device, 'dimmer_4_enabled')) {
                    await reporting.bind(dimmer4Ep, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
                    await reporting.onOff(dimmer4Ep);
                    await reporting.brightness(dimmer4Ep);
                }
                setMetaOption(device, 'dimmer_4_dimming_enabled', true);

                // Bind Cover 1 EP
                const cover1Ep = device.getEndpoint(11);
                setMetaOption(device, 'cover_1_enabled', (await cover1Ep.read('genBasic', ['deviceEnabled'])).deviceEnabled);
                if (checkMetaOption(device, 'cover_1_enabled')) {
                    await reporting.bind(cover1Ep, coordinatorEndpoint, ['closuresWindowCovering']);
                    await reporting.currentPositionLiftPercentage(cover1Ep);
                    setMetaOption(
                        device,
                        'cover_1_tilt_enabled',
                        (await cover1Ep.read('closuresWindowCovering', ['windowCoveringType'])).windowCoveringType === 0x08);
                    if (checkMetaOption(device, 'cover_1_tilt_enabled')) {
                        await reporting.currentPositionTiltPercentage(cover1Ep);
                    }
                } else {
                    setMetaOption(device, 'cover_1_tilt_enabled', false);
                }

                // Bind Cover 2 EP
                const cover2Ep = device.getEndpoint(12);
                setMetaOption(device, 'cover_2_enabled', (await cover2Ep.read('genBasic', ['deviceEnabled'])).deviceEnabled);
                if (checkMetaOption(device, 'cover_2_enabled')) {
                    await reporting.bind(cover2Ep, coordinatorEndpoint, ['closuresWindowCovering']);
                    await reporting.currentPositionLiftPercentage(cover2Ep);
                    setMetaOption(
                        device,
                        'cover_2_tilt_enabled',
                        (await cover2Ep.read('closuresWindowCovering', ['windowCoveringType'])).windowCoveringType === 0x08);
                    if (checkMetaOption(device, 'cover_2_tilt_enabled')) {
                        await reporting.currentPositionTiltPercentage(cover2Ep);
                    }
                } else {
                    setMetaOption(device, 'cover_2_tilt_enabled', false);
                }

                device.save();
            }
        },
    },
];
