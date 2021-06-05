const exposes = require('../lib/exposes');
const fz = {...require('../converters/fromZigbee'), legacy: require('../lib/legacy').fromZigbee};
const tz = require('../converters/toZigbee');
const constants = require('../lib/constants');
const reporting = require('../lib/reporting');
const e = exposes.presets;

module.exports = [
    {
        zigbeeModel: ['101.301.001649', '101.301.001838', '101.301.001802', '101.301.001738', '101.301.001412', '101.301.001765',
            '101.301.001814'],
        model: 'MEAZON_BIZY_PLUG',
        vendor: 'Meazon',
        description: 'Bizy plug meter',
        fromZigbee: [fz.command_on, fz.legacy.genOnOff_cmdOn, fz.command_off, fz.legacy.genOnOff_cmdOff, fz.on_off, fz.meazon_meter],
        exposes: [e.switch(), e.power(), e.voltage(), e.current()],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(10);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint, {min: 1, max: 0xfffe});
            const options = {manufacturerCode: 4406, disableDefaultResponse: false};
            await endpoint.write('seMetering', {0x1005: {value: 0x063e, type: 25}}, options);
            await endpoint.configureReporting('seMetering', [{reportableChange: 1, attribute: {ID: 0x2000, type: 0x29},
                minimumReportInterval: 1, maximumReportInterval: constants.repInterval.MINUTES_5}], options);
        },
    },
    {
        zigbeeModel: ['102.106.000235', '102.106.001111', '102.106.000348', '102.106.000256', '102.106.001242', '102.106.000540'],
        model: 'MEAZON_DINRAIL',
        vendor: 'Meazon',
        description: 'DinRail 1-phase meter',
        fromZigbee: [fz.command_on, fz.legacy.genOnOff_cmdOn, fz.command_off, fz.legacy.genOnOff_cmdOff, fz.on_off, fz.meazon_meter],
        exposes: [e.switch(), e.power(), e.voltage(), e.current()],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(10);
            await reporting.bind(endpoint, coordinatorEndpoint, ['genOnOff', 'seMetering']);
            await reporting.onOff(endpoint);
            const options = {manufacturerCode: 4406, disableDefaultResponse: false};
            await endpoint.write('seMetering', {0x1005: {value: 0x063e, type: 25}}, options);
            await reporting.onOff(endpoint);
            await endpoint.configureReporting('seMetering', [{attribute: {ID: 0x2000, type: 0x29},
                minimumReportInterval: 1, maximumReportInterval: constants.repInterval.MINUTES_5, reportableChange: 1}], options);
        },
    },
];
