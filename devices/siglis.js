const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const e = exposes.presets;

const siglisManufacturerCode = 0x129C;
const zigfredEndpoint = 5;

const zifgredFromZigbee = {
    cluster: 'manuSpecificSiglisZigfred',
    type: ['attributeReport'],
    convert: (model, msg, publish, options, meta) => {
        const buttonEvent = msg.data['buttonEvent'];

        if (buttonEvent != null) {
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

            const button = buttonEvent & 0xff;
            const state = (buttonEvent >> 8) & 0xff;

            const buttonName = buttonLookup[button];
            const stateName = actionLookup[state];

            if (buttonName && stateName) {
                const action = `${buttonName}_${stateName}`;
                return {action};
            }
        }
    },
};

module.exports = [
    {
        zigbeeModel: ['zigfred uno'],
        model: 'ZFU-1D-CH',
        vendor: 'Siglis',
        description: 'zigfred uno smart in-wall switch',
        exposes: [e.light_brightness_colorxy().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.light_brightness().withEndpoint('l3'),
            e.action([
                'button_1_single', 'button_1_double', 'button_1_hold', 'button_1_release',
                'button_2_single', 'button_2_double', 'button_2_hold', 'button_2_release',
                'button_3_single', 'button_3_double', 'button_3_hold', 'button_3_release',
                'button_4_single', 'button_4_double', 'button_4_hold', 'button_4_release',
            ])],
        fromZigbee: [
            zifgredFromZigbee,
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
        configure: async (device, coordinatorEndpoint, logger) => {
            const controlEp = device.getEndpoint(zigfredEndpoint);
            const relayEp = device.getEndpoint(6);
            const dimmerEp = device.getEndpoint(7);

            // Bind Control EP (LED)
            await reporting.bind(controlEp, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'manuSpecificSiglisZigfred']);
            await reporting.onOff(controlEp);
            await reporting.brightness(controlEp);
            const payload = [{
                attribute: 'buttonEvent',
                minimumReportInterval: 0,
                maximumReportInterval: 0,
                reportableChange: 0,
            }];
            await controlEp.configureReporting('manuSpecificSiglisZigfred', payload, {manufacturerCode: siglisManufacturerCode});

            // Bind Relay EP
            await reporting.bind(relayEp, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(relayEp);

            // Bind Dimmer EP
            await reporting.bind(dimmerEp, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(dimmerEp);
            await reporting.brightness(dimmerEp);
        },
    },
    {
        zigbeeModel: ['zigfred plus'],
        model: 'ZFP-A1-CH',
        vendor: 'Siglis',
        description: 'zigfred plus smart in-wall switch',
        exposes: [
            e.light_brightness_colorxy().withEndpoint('l1'),
            e.light_brightness().withEndpoint('l2'),
            e.light_brightness().withEndpoint('l3'),
            e.light_brightness().withEndpoint('l4'),
            e.light_brightness().withEndpoint('l5'),
            e.cover_position_tilt().withEndpoint('l6'),
            e.cover_position_tilt().withEndpoint('l7'),
            e.action([
                'button_1_single', 'button_1_double', 'button_1_hold', 'button_1_release',
                'button_2_single', 'button_2_double', 'button_2_hold', 'button_2_release',
                'button_3_single', 'button_3_double', 'button_3_hold', 'button_3_release',
                'button_4_single', 'button_4_double', 'button_4_hold', 'button_4_release',
            ])],
        fromZigbee: [
            zifgredFromZigbee,
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
            tz.cover_state,
            tz.cover_position_tilt,
        ],
        meta: {multiEndpoint: true, coverInverted: true},
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
        configure: async (device, coordinatorEndpoint, logger) => {
            const controlEp = device.getEndpoint(zigfredEndpoint);
            const dimmer1Ep = device.getEndpoint(7);
            const dimmer2Ep = device.getEndpoint(8);
            const dimmer3Ep = device.getEndpoint(9);
            const dimmer4Ep = device.getEndpoint(10);
            const cover1Ep = device.getEndpoint(11);
            const cover2Ep = device.getEndpoint(12);

            // Bind Control EP (LED)
            await reporting.bind(controlEp, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl', 'manuSpecificSiglisZigfred']);
            await reporting.onOff(controlEp);
            await reporting.brightness(controlEp);
            const payload = [{
                attribute: 'buttonEvent',
                minimumReportInterval: 0,
                maximumReportInterval: 0,
                reportableChange: 0,
            }];
            await controlEp.configureReporting('manuSpecificSiglisZigfred', payload, {manufacturerCode: siglisManufacturerCode});

            // Bind Dimmer 1 EP
            await reporting.bind(dimmer1Ep, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(dimmer1Ep);
            await reporting.brightness(dimmer1Ep);

            // Bind Dimmer 2 EP
            await reporting.bind(dimmer2Ep, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(dimmer2Ep);
            await reporting.brightness(dimmer2Ep);

            // Bind Dimmer 3 EP
            await reporting.bind(dimmer3Ep, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(dimmer3Ep);
            await reporting.brightness(dimmer3Ep);

            // Bind Dimmer 4 EP
            await reporting.bind(dimmer4Ep, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(dimmer4Ep);
            await reporting.brightness(dimmer4Ep);

            // Bind Cover 1 EP
            await reporting.bind(cover1Ep, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(cover1Ep);
            await reporting.currentPositionTiltPercentage(cover1Ep);

            // Bind Cover 2 EP
            await reporting.bind(cover2Ep, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(cover2Ep);
            await reporting.currentPositionTiltPercentage(cover2Ep);
        },
    },
];
