const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const extend = require('zigbee-herdsman-converters/lib/extend');
const e = exposes.presets;
const ea = exposes.access;

module.exports = [
  {
      zigbeeModel: ['E-Wand'],
      model: 'CP180335E-01',
      vendor: 'Current Products Corp',
      description: 'Gen. 2 Hybrid E-Wand',
      fromZigbee: [fz.cover_position_tilt, fz.battery],
      toZigbee: [tz.cover_state, tz.cover_position_tilt],
      meta: { configureKey: 1 },
      configure: async (device, coordinatorEndpoint, logger) => {
          const endpoint = device.getEndpoint(1);
          await reporting.bind(endpoint, coordinatorEndpoint, ['genPowerCfg', 'closuresWindowCovering']);
          await reporting.batteryPercentageRemaining(endpoint);
          await reporting.currentPositionTiltPercentage(endpoint);
      },
      exposes: [e.battery(), e.cover_tilt()],
  },
];
