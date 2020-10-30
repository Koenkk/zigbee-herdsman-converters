/**
 * This script adds an expose property to definitions when all converters of a definition are mapped below.
 * https://github.com/Koenkk/zigbee2mqtt/issues/4466
 */
const exposes = {
    occupancy: `e.occupancy()`,
    contact: `e.contact()`,
    battery_low: `e.battery_low()`,
    tamper: `e.tamper()`,
    water_leak: `e.water_leak()`,
    vibration: `e.vibration()`,
    battery: `e.battery()`,
    temperature: `e.temperature()`,
    humidity: `e.humidity()`,
    pressure: `e.pressure()`,
    illuminance: `e.illuminance()`,
    illuminance_lux: `e.illuminance_lux()`,
    soil_moisture: `e.soil_moisture()`,
    power: `e.power()`,
    current: `e.current()`,
    voltage: `e.voltage()`,
    switch: `e.switch()`,
    energy: `e.energy()`,
    cover_position: `e.cover_position()`,
    smoke: `e.smoke()`,
    gas: `e.gas()`,
    sos: `e.sos()`,
    carbon_monoxide: `e.carbon_monoxide()`,
    lock: `e.lock()`,
    lock_state: `e.lock_state()`,
};

const mapping = {
    linkquality_from_basic: [],
    ias_contact_alarm_1_report: [exposes.contact, exposes.battery_low, exposes.tamper],
    ias_occupancy_alarm_1: [exposes.occupancy, exposes.battery_low, exposes.tamper],
    ias_occupancy_alarm_2: [exposes.occupancy, exposes.battery_low, exposes.tamper],
    ias_water_leak_alarm_1: [exposes.water_leak, exposes.battery_low, exposes.tamper],
    ias_water_leak_alarm_2: [exposes.water_leak, exposes.battery_low, exposes.tamper],
    ias_water_leak_alarm_1_report: [exposes.water_leak, exposes.battery_low, exposes.tamper],
    ias_vibration_alarm_1: [exposes.vibration, exposes.battery_low, exposes.tamper],
    ias_occupancy_alarm_1_with_timeout: [exposes.occupancy, exposes.battery_low, exposes.tamper],
    ias_vibration_alarm_2: [exposes.vibration, exposes.battery_low, exposes.tamper],
    ias_contact_alarm_1: [exposes.contact, exposes.battery_low, exposes.tamper],
    ias_contact_alarm_2: [exposes.contact, exposes.battery_low, exposes.tamper],
    ias_smoke_alarm_1: [exposes.smoke, exposes.battery_low, exposes.tamper],
    ias_gas_alarm_1: [exposes.gas, exposes.battery_low, exposes.tamper],
    ias_gas_alarm_2: [exposes.gas, exposes.battery_low, exposes.tamper],
    ias_carbon_monoxide_alarm_1: [exposes.carbon_monoxide, exposes.battery_low, exposes.tamper],
    ias_sos_alarm_2: [exposes.sos, exposes.battery_low, exposes.tamper],
    battery: [exposes.battery],
    temperature: [exposes.temperature],
    humidity: [exposes.humidity],
    pressure: [exposes.pressure],
    soil_moisture: [exposes.soil_moisture],
    illuminance: [exposes.illuminance, exposes.illuminance_lux],
    electrical_measurement_power: [exposes.power, exposes.current, exposes.voltage],
    peanut_electrical: [exposes.power, exposes.current, exposes.voltage],
    on_off: [exposes.switch],
    metering_power: [exposes.power, exposes.energy],
    cover_position_via_brightness: [exposes.cover_position],
    cover_position_tilt: [exposes.cover_position],
    keen_home_smart_vent_pressure: [exposes.pressure],
    xiaomi_battery: [exposes.battery],
    xiaomi_temperature: [exposes.temperature],
    WSDCGQ01LM_WSDCGQ11LM_interval: [],
    WSDCGQ11LM_pressure: [exposes.pressure],
    xiaomi_contact: [exposes.contact],
    xiaomi_contact_interval: [exposes.contact],
    occupancy: [exposes.occupancy],
    occupancy_with_timeout: [exposes.occupancy],
    RTCGQ11LM_interval: [],
    RTCGQ11LM_illuminance: [exposes.illuminance, exposes.illuminance_lux],
    xiaomi_power: [exposes.power],
    xiaomi_plug_state: [exposes.power, exposes.temperature, exposes.voltage],
    xiaomi_switch_basic: [exposes.power, exposes.energy, exposes.temperature, exposes.voltage],
    xiaomi_switch_opple_basic: [exposes.power, exposes.energy, exposes.temperature, exposes.voltage, exposes.current],
    lock: [exposes.lock],
    lock_operation_event: [],
    lock_programming_event: [],
    lock_pin_code_response: [],
    heiman_pm25: ['e.pm25()'],
    heiman_hcho: ['e.hcho()'],
    heiman_air_quality: [`e.voc()`, `e.aqi()`, `e.pm10()`],
    tuya_cover: [exposes.cover_position],
    cover_state_via_onoff: [],
    device_temperature: [`e.device_temperature()`],
};

module.exports = function(fileInfo, api, options) {
    const j = api.jscodeshift;
    const ast = api.jscodeshift(fileInfo.source);
    let total = 0;
    let exposesCount = 0;
    ast.find(j.VariableDeclarator).forEach((v) => {
        if (v.value.id.name === 'devices') {
            v.value.init.elements.forEach((definition) => {
                total++;
                let exposesProp = definition.properties.find((p) => p.key.name === 'exposes');
                const extend = definition.properties.find((p) => p.key.name === 'extend');
                const fromZigbee = definition.properties.find((p) => p.key.name === 'fromZigbee');

                if (exposesProp === undefined && fromZigbee && fromZigbee.value.elements) {
                    const model = definition.properties.find((p) => p.key.name === 'model').value.value;
                    const converters = fromZigbee.value.elements.map((f) => f.property.name).filter((f) => !f.startsWith('ignore_'));
                    if (converters.every((c) => c in mapping)) {
                        const exposes = new Set();
                        let exposesStr = '';
                        converters.forEach((c) => mapping[c].forEach((e) => exposes.add(e)));
                        exposesStr = `exposes: [${[...exposes].join(', ')}],`;

                        definition.properties.push(exposesStr);
                        console.log(`Migrated '${model}'`);
                        exposesProp = true;
                    }
                }

                if (extend || exposesProp) {
                    exposesCount++;
                }
            });
        }
    });

    console.log(`Exposes progress: ${exposesCount}/${total}`);
    return ast.toSource().split(',\n\n        ').join(',\n        ');
};
