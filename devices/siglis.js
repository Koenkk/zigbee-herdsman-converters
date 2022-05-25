const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const e = exposes.presets;
const assert = require('assert');


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

class ZigfredBase {
    withEndpoint(endpointName) {
        this.endpoint = endpointName;

        if (this.hasOwnProperty('property')) {
            this.property = `${this.property}_${this.endpoint}`;
        }

        if (this.features) {
            for (const feature of this.features) {
                if (feature.property) {
                    feature.property = `${feature.property}_${endpointName}`;
                    feature.endpoint = endpointName;
                }
            }
        }

        return this;
    }

    withAccess(a) {
        assert(this.hasOwnProperty('access'), 'Cannot add access if not defined yet');
        this.access = a;
        return this;
    }

    withProperty(property) {
        this.property = property;
        return this;
    }

    withDescription(description) {
        this.description = description;
        return this;
    }

    removeFeature(feature) {
        assert(this.features, 'Does not have any features');
        const f = this.features.find((f) => f.name === feature);
        assert(f, `Does not have feature '${feature}'`);
        this.features.splice(this.features.indexOf(f), 1);
        return this;
    }

    setAccess(feature, a) {
        assert(this.features, 'Does not have any features');
        const f = this.features.find((f) => f.name === feature);
        assert(f.access !== a, `Access mode not changed for '${f.name}'`);
        f.access = a;
        return this;
    }
}

class ZigfredEnum extends ZigfredBase {
    constructor(name, access, values) {
        super();
        this.type = 'enum';
        this.name = name;
        this.property = name;
        this.access = access;
        this.values = values;
    }
}

class ZigfredNumeric extends ZigfredBase {
    constructor(name, access) {
        super();
        this.type = 'numeric';
        this.name = name;
        this.property = name;
        this.access = access;
    }

    withUnit(unit) {
        this.unit = unit;
        return this;
    }

    withValueMax(value) {
        this.value_max = value;
        return this;
    }

    withValueMin(value) {
        this.value_min = value;
        return this;
    }

    withValueStep(value) {
        this.value_step = value;
        return this;
    }

    withPreset(name, value, description) {
        if (!this.presets) this.presets = [];
        this.presets.push({name, value, description});
        return this;
    }
}

class ZigfredCover extends ZigfredBase {
    constructor() {
        super();
        this.type = 'cover';
        this.features = [];
        this.features.push(new ZigfredEnum('state', exposes.access.STATE_SET | exposes.access.STATE_GET, ['OPEN', 'CLOSE', 'STOP']));
    }

    withPosition() {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        this.features.push(
            new ZigfredNumeric('position', exposes.access.ALL).withValueMin(0).withValueMax(100).withDescription('Position of this cover'));
        return this;
    }

    withTilt() {
        assert(!this.endpoint, 'Cannot add feature after adding endpoint');
        this.features.push(
            new ZigfredNumeric('tilt', exposes.access.ALL).withValueMin(0).withValueMax(100).withDescription('Tilt of this cover'));
        return this;
    }
}


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
        model: 'ZFP-1A-CH',
        vendor: 'Siglis',
        description: 'zigfred plus smart in-wall switch',
        exposes: [
            e.light_brightness_colorxy().withEndpoint('l1'),
            e.light_brightness().withEndpoint('l2'),
            e.light_brightness().withEndpoint('l3'),
            e.light_brightness().withEndpoint('l4'),
            e.light_brightness().withEndpoint('l5'),
            new ZigfredCover().withPosition().withTilt().withEndpoint('l6'),
            new ZigfredCover().withPosition().withTilt().withEndpoint('l7'),
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
            // Bind Control EP (LED)
            const controlEp = device.getEndpoint(zigfredEndpoint);
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
            const dimmer1Ep = device.getEndpoint(7);
            await reporting.bind(dimmer1Ep, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(dimmer1Ep);
            await reporting.brightness(dimmer1Ep);

            // Bind Dimmer 2 EP
            const dimmer2Ep = device.getEndpoint(8);
            await reporting.bind(dimmer2Ep, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(dimmer2Ep);
            await reporting.brightness(dimmer2Ep);

            // Bind Dimmer 3 EP
            const dimmer3Ep = device.getEndpoint(9);
            await reporting.bind(dimmer3Ep, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(dimmer3Ep);
            await reporting.brightness(dimmer3Ep);

            // Bind Dimmer 4 EP
            const dimmer4Ep = device.getEndpoint(10);
            await reporting.bind(dimmer4Ep, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(dimmer4Ep);
            await reporting.brightness(dimmer4Ep);

            // Bind Cover 1 EP
            const cover1Ep = device.getEndpoint(11);
            await reporting.bind(cover1Ep, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(cover1Ep);
            await reporting.currentPositionTiltPercentage(cover1Ep);

            // Bind Cover 2 EP
            const cover2Ep = device.getEndpoint(12);
            await reporting.bind(cover2Ep, coordinatorEndpoint, ['closuresWindowCovering']);
            await reporting.currentPositionLiftPercentage(cover2Ep);
            await reporting.currentPositionTiltPercentage(cover2Ep);
        },
    },
];
