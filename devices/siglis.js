const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
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
                1: 'click',
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
        model: 'zigfred uno',
        vendor: 'Siglis',
        description: 'smart in-Wall switch',
        exposes: [e.light_brightness_colorxy().withEndpoint('l1'), e.switch().withEndpoint('l2'), e.light_brightness().withEndpoint('l3'),
            e.action([
                'button_1_click', 'button_1_hold', 'button_1_release', 'button_2_click', 'button_2_hold', 'button_2_release',
                'button_3_click', 'button_3_hold', 'button_3_release', 'button_4_click', 'button_4_hold', 'button_4_release'])],
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
            await reporting.bind(controlEp, coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(controlEp, coordinatorEndpoint, ['genLevelCtrl']);
            await reporting.onOff(controlEp);
            await reporting.brightness(controlEp);
            await reporting.bind(controlEp, coordinatorEndpoint, ['manuSpecificSiglisZigfred']);
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
            await reporting.bind(dimmerEp, coordinatorEndpoint, ['genOnOff']);
            await reporting.bind(dimmerEp, coordinatorEndpoint, ['genLevelCtrl']);
            await reporting.onOff(dimmerEp);
            await reporting.brightness(dimmerEp);
        },
    },
];
