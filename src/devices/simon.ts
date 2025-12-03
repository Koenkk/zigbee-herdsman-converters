import * as m from 'zigbee-herdsman-converters/lib/modernExtend';

export default {
    zigbeeModel: ['SM0501'],
    model: 'SM0501',
    vendor: '_TZ2000_xfsnto6r',
    description: 'Automatically generated definition',
    extend: [m.deviceEndpoints({"endpoints":{"1":1,"3":3,"4":4}}), m.light(), m.light(), m.light()],
};
