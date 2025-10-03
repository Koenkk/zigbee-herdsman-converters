import * as m from 'zigbee-herdsman-converters/lib/modernExtend';

export default {
    zigbeeModel: ['MIR-MC100-E'],
    model: 'MIR-MC100-E',
    vendor: 'Intelbras',
    description: 'Sensor de presença Intelbras',
    extend: [
        m.battery(),
        m.iasZoneAlarm({
            zoneType: 'generic',
            zoneAttributes: ['alarm_1','battery_low']
        })
    ],
    meta: {},
};