const xiaomi = require('./xiaomi');

function decodeTrvFirmwareVersionString(value) {
    // Add prefix to follow Aqara's versioning schema: https://www.aqara.com/en/version/radiator-thermostat-e1
    const firmwareVersionPrefix = '0.0.0_';

    // Reinterpret from LE integer to byte sequence(e.g., `[25,8,0,0]` corresponds to 0.0.0_0825)
    const buffer = Buffer.alloc(4);
    buffer.writeUInt32LE(value);
    const firmwareVersionNumber = buffer.reverse().subarray(1).join('');

    return firmwareVersionPrefix + firmwareVersionNumber;
}

function decodeTrvPreset(value) {
    // Setup mode is the initial device state after powering it ("F11" on display) and not a real preset that can be deliberately
    // set by users, therefore it is exposed as a separate flag.
    return {
        setup: value === 3,
        preset: {2: 'away', 1: 'auto', 0: 'manual'}[value],
    };
}

function decodeTrvHeartbeat(meta, model, messageBuffer) {
    const data = xiaomi.buffer2DataObject(meta, model, messageBuffer);
    const payload = {};

    Object.entries(data).forEach(([key, value]) => {
        switch (parseInt(key)) {
        case 3:
            payload.device_temperature = value;
            break;
        case 5:
            payload.power_outage_count = value - 1;
            break;
        case 10:
            // unidentified number, e.g. 32274, 3847
            break;
        case 13:
            payload.firmware_version = decodeTrvFirmwareVersionString(value);
            break;
        case 17:
            // unidentified flag/enum, e.g. 1
            break;
        case 101:
            Object.assign(payload, decodeTrvPreset(value));
            break;
        case 102:
            payload.local_temperature = value/100;
            break;
        case 103:
            // This takes the following values:
            //  - `occupied_heating_setpoint` if `system_mode` is `heat` and `preset` is `manual`
            //  - `away_preset_temperature` if `system_mode` is `heat` and `preset` is `away`
            //  - `5` if `system_mode` is `off`
            // It thus behaves similar to `occupied_heating_setpoint` except in `off` mode. Due to this difference,
            // this value is written to another property to avoid an inconsistency of the `occupied_heating_setpoint`.
            // TODO How to handle this value? Find better name?
            payload.internal_heating_setpoint = value/100;
            break;
        case 104:
            payload.valve_alarm = value === 1;
            break;
        case 105:
            payload.battery = value;
            break;
        case 106:
            // unidentified flag/enum, e.g. 0
            break;
        }
    });

    return payload;
}

module.exports = {
    decodeTrvPreset,
    decodeTrvHeartbeat,
};
