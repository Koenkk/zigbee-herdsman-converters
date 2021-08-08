const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
    {
        zigbeeModel: ['ZBT-RGBWSwitch-D0801'],
        model: 'ZS230002',
        vendor: 'Linkind',
        description: '5-key smart bulb dimmer switch light remote control',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step, fz.command_move,
            fz.command_stop, fz.command_move_to_color_temp, fz.command_move_to_color,
            fz.command_move_to_level, fz.command_move_color_temperature, fz.battery],
        exposes: [e.battery(), e.battery_low(), e.action(['on', 'off', 'brightness_step_up',
            'brightness_step_down', 'color_temperature_move', 'color_move', 'brightness_move_up', 'brightness_move_down', 'brightness_stop',
            'brightness_move_to_level', 'color_temperature_move_up', 'color_temperature_move_down'])],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['ZBT-CCTLight-D0106', 'ZBT-CCTLight-GLS0108', 'ZBT-CCTLight-GLS0109'],
        model: 'ZL1000100-CCT-US-V1A02',
        vendor: 'Linkind',
        description: 'Zigbee LED 9W A19 bulb, dimmable & tunable',
        extend: extend.light_onoff_brightness_colortemp({colorTempRange: [153, 370]}),
    },
    {
        zigbeeModel: ['ZBT-CCTLight-C4700107', 'ZBT-CCTLight-M3500107'],
        model: 'ZL1000400-CCT-EU-2-V1A02',
        vendor: 'Linkind',
        description: 'Zigbee LED 5.4W C35 bulb E14, dimmable & tunable',
        extend: extend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['ZBT-CCTLight-BR300107'],
        model: 'ZL100050004',
        vendor: 'Linkind',
        description: 'Zigbee LED 7.4W BR30 bulb E26, dimmable & tunable',
        extend: extend.light_onoff_brightness_colortemp(),
    },
    {
        zigbeeModel: ['ZBT-DIMLight-D0120'],
        model: 'ZL1000701-27-EU-V1A02',
        vendor: 'Linkind',
        description: 'Zigbee A60 filament bulb 6.3W',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['ZBT-DIMLight-A4700003'],
        model: 'ZL1000700-22-EU-V1A02',
        vendor: 'Linkind',
        description: 'Zigbee A60 led filament, dimmable warm light (2200K), E27. 4.2W, 420lm',
        extend: extend.light_onoff_brightness(),
    },
    {
        zigbeeModel: ['ZB-MotionSensor-D0003'],
        model: 'ZS1100400-IN-V1A02',
        vendor: 'Linkind',
        description: 'PIR motion sensor, wireless motion detector',
        fromZigbee: [fz.ias_occupancy_alarm_1],
        toZigbee: [],
        exposes: [e.occupancy(), e.battery_low(), e.tamper()],
    },
    {
        zigbeeModel: ['ZB-DoorSensor-D0003'],
        model: 'ZS110050078',
        vendor: 'Linkind',
        description: 'Door/window Sensor',
        fromZigbee: [fz.ias_contact_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.battery()],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['ZBT-DIMSwitch-D0001'],
        model: 'ZS232000178',
        vendor: 'Linkind',
        description: '1-key remote control',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        exposes: [e.action(['on', 'off', 'brightness_move_up', 'brightness_move_down', 'brightness_stop']), e.battery(), e.battery_low()],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg']);
            await reporting.batteryPercentageRemaining(endpoint);
        },
    },
    {
        zigbeeModel: ['ZBT-OnOffPlug-D0011', 'ZBT-OnOffPlug-D0001'],
        model: 'ZS190000118',
        vendor: 'Linkind',
        description: 'Control outlet',
        extend: extend.switch(),
        toZigbee: extend.switch().toZigbee.concat([tz.power_on_behavior]),
        fromZigbee: extend.switch().fromZigbee.concat([fz.power_on_behavior]),
        exposes: extend.switch().exposes.concat([exposes.enum('power_on_behavior', ea.ALL, ['off', 'previous', 'on', 'toggle'])
            .withDescription('Controls the behaviour when the device is powered on')]),
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff']);
            await reporting.onOff(endpoint);
        },
    },
    {
        zigbeeModel: ['ZB-KeyfodGeneric-D0001'],
        model: 'ZS130000178',
        vendor: 'Linkind',
        description: 'Security system key fob',
        fromZigbee: [fz.command_arm, fz.command_panic],
        toZigbee: [],
        exposes: [e.action(['panic', 'disarm', 'arm_partial_zones', 'arm_all_zones'])],
        onEvent: async (type, data, device) => {
            // Since arm command has a response zigbee-herdsman doesn't send a default response.
            // This causes the remote to repeat the arm command, so send a default response here.
            if (data.type === 'commandArm' && data.cluster === 'ssIasAce') {
                await data.endpoint.defaultResponse(0, 0, 1281, data.meta.zclTransactionSequenceNumber);
            }
        },
    },
];
