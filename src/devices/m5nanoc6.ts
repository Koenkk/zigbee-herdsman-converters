import * as m from 'zigbee-herdsman-converters/lib/modernExtend';

export default {
    zigbeeModel: ['ZBColorLightBulb'],
    model: 'ZBColorLightBulb',
    vendor: 'Espressif',
    description: 'Automatically generated definition',
    extend: [m.light({"color":{"modes":["xy","hs"]}})],
    meta: {},
};

