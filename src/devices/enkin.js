const {light, forcePowerSource} = require('zigbee-herdsman-converters/lib/modernExtend');

const {bind, onOff} = require('zigbee-herdsman-converters/lib/reporting');

const definitions = [{
    zigbeeModel: ['ZDM150'],
    model: 'ZDM150',
    vendor: 'Enkin',
    description: '150W Dimmer Module',
    extend: [light({powerOnBehavior: false, effect: false, configureReporting: true}), forcePowerSource({powerSource: 'Mains (single phase)'})],

    configure: async (device, coordinatorEndpoint) => {
        device.powerSource = 'Mains (single phase)';

        const endpoint = device.getEndpoint(1);
        await bind(endpoint, coordinatorEndpoint, ['genOnOff', 'genLevelCtrl']);
        await onOff(endpoint, {min: 0, max: 0xfffe});

        await endpoint.configureReporting('genOnOff', [
            {attribute: 'onOff', minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 1},
        ]);
        await endpoint.configureReporting('genLevelCtrl', [
            {attribute: 'currentLevel', minimumReportInterval: 3, maximumReportInterval: 3600, reportableChange: 1},
        ]);

        device.save();

    },
    meta: {},
}];

module.exports = definitions;

