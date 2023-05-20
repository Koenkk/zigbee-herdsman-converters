const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const constants = require('../lib/constants');
const reporting = require('../lib/reporting');
const extend = require('../lib/extend');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['ZBT-DimmableLight'],
        model: '4713407',
        vendor: 'Airam',
        description: 'LED OP A60 ZB 9W/827 E27',
        extend: extend.light_onoff_brightness({noConfigure: true}),
        configure: async (device, coordinatorEndpoint, logger) => {
            await extend.light_onoff_brightness().configure(device, coordinatorEndpoint, logger);
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
            await reporting.onOff(endpoint);
            const payload = [{attribute: 'currentLevel', minimumReportInterval: 300, maximumReportInterval: constants.repInterval.HOUR,
                reportableChange: 1}];
            await endpoint.configureReporting('genLevelCtrl', payload);
        },
    },
    {
        zigbeeModel: ['ZBT-Remote-EU-DIMV1A2'],
        model: 'AIRAM-CTR.U',
        vendor: 'Airam',
        description: 'CTR.U remote',
        exposes: [e.action(['on', 'off', 'brightness_down_click', 'brightness_up_click', 'brightness_down_hold', 'brightness_up_hold',
            'brightness_down_release', 'brightness_up_release'])],
        fromZigbee: [fz.command_on, fz.legacy.genOnOff_cmdOn, fz.command_off, fz.legacy.genOnOff_cmdOff,
            fz.legacy.CTR_U_brightness_updown_click, fz.ignore_basic_report,
            fz.legacy.CTR_U_brightness_updown_hold, fz.legacy.CTR_U_brightness_updown_release, fz.command_recall, fz.legacy.CTR_U_scene],
        toZigbee: [],
    },
    {
        zigbeeModel: ['ZBT-Remote-EU-DIMV2A2'],
        model: 'CTR.UBX',
        vendor: 'Airam',
        description: 'CTR.U remote BX',
        fromZigbee: [fz.command_on, fz.command_off, fz.command_step, fz.command_move, fz.command_stop, fz.command_recall,
            fz.ignore_basic_report],
        exposes: [e.action(['on', 'off', 'brightness_step_up', 'brightness_step_down', 'brightness_move_up', 'brightness_move_down',
            'brightness_stop', 'recall_*'])],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genBasic', 'genOnOff', 'genLevelCtrl', 'genScenes']);
        },
    },
    {
        zigbeeModel: ['Dimmable-GU10-4713404'],
        model: '4713406',
        vendor: 'Airam',
        description: 'GU10 spot 4.8W 2700K 385lm',
        extend: extend.light_onoff_brightness(),
    },
];
