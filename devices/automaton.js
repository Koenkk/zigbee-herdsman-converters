const fz = require('../converters/fromZigbee');
const tz = require('../converters/toZigbee');
const exposes = require('../lib/exposes');
const reporting = require('../lib/reporting');
const tuya = require('../lib/tuya');
const utils = require('../lib/utils');
const e = exposes.presets;

const fzLocal = {
  power_on_behavior: {
      cluster: 'manuSpecificTuya_3',
      type: ['attributeReport', 'readResponse'],
      convert: (model, msg, publish, options, meta) => {
          const attribute = 'powerOnBehavior';
          const lookup = { 0: 'off', 1: 'on', 2: 'previous' };

          if (msg.data.hasOwnProperty(attribute)) {
              const property = utils.postfixWithEndpointName('power_on_behavior', msg, model, meta);
              return { [property]: lookup[msg.data[attribute]] };
          }
      },
  },
  child_lock: {
      cluster: 'genOnOff',
      type: ['attributeReport', 'readResponse'],
      convert: (model, msg, publish, options, meta) => {
          if (msg.data.hasOwnProperty('32768')) {
              const value = msg.data['32768'];
              return { child_lock: value ? 'LOCK' : 'UNLOCK' };
          }
      },
  }
}

const tzLocal = {
  power_on_behavior: {
      key: ['power_on_behavior'],
      convertSet: async (entity, key, value, meta) => {
          value = value.toLowerCase();
          const lookup = { 'off': 0, 'on': 1, 'previous': 2 };
          utils.validateValue(value, Object.keys(lookup));
          const pState = lookup[value];
          await entity.write('manuSpecificTuya_3', { 'powerOnBehavior': pState }, { disableDefaultResponse: true });
          return { state: { power_on_behavior: value } };
      },
      convertGet: async (entity, key, meta) => {
          await entity.read('manuSpecificTuya_3', ['powerOnBehavior']);
      },
  },
  child_lock: {
      key: ['child_lock'],
      convertSet: async (entity, key, value, meta) => {
          await entity.write('genOnOff', { 0x8000: { value: value === 'LOCK', type: 0x10 } });
      },
  }
}

const definition = {
    fingerprint: tuya.fingerprint('TS011F', ['_TZ3000_j0ktmul1']),
    model: 'AUT000069',
    vendor: 'AutomatOn',
    description: 'Underfloor heating controller - 5 zones',
    fromZigbee: [fz.on_off, fz.ignore_basic_report, fzLocal.power_on_behavior, fzLocal.child_lock],
    toZigbee: [tz.on_off, tzLocal.power_on_behavior, tzLocal.child_lock],
    exposes: [
        e.child_lock(),
        e.switch().withEndpoint('l1'),
        e.switch().withEndpoint('l2'),
        e.switch().withEndpoint('l3'),
        e.switch().withEndpoint('l4'),
        e.switch().withEndpoint('l5'),
        e.power_on_behavior().withEndpoint('l1'),
        e.power_on_behavior().withEndpoint('l2'),
        e.power_on_behavior().withEndpoint('l3'),
        e.power_on_behavior().withEndpoint('l4'),
        e.power_on_behavior().withEndpoint('l5'),
    ],
    endpoint: (device) => {
        return { 'l1': 1, 'l2': 2, 'l3': 3, 'l4': 4, 'l5': 5 };
    },
    meta: { multiEndpoint: true },
    configure: async (device, coordinatorEndpoint, logger) => {
        await tuya.configureMagicPacket(device, coordinatorEndpoint, logger);
        await reporting.bind(device.getEndpoint(1), coordinatorEndpoint, ['genOnOff']);
        await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ['genOnOff']);
        await reporting.bind(device.getEndpoint(3), coordinatorEndpoint, ['genOnOff']);
        await reporting.bind(device.getEndpoint(4), coordinatorEndpoint, ['genOnOff']);
        await reporting.bind(device.getEndpoint(5), coordinatorEndpoint, ['genOnOff']);
        device.powerSource = 'Mains (single phase)';
        device.save();
    },
};

module.exports = definition;