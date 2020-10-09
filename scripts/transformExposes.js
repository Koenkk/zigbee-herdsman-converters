/**
 * This script adds an expose property to definitions when all converters of a definition are mapped below.
 * https://github.com/Koenkk/zigbee2mqtt/issues/4466
 */
const exposes = {
    occupancy: `exposes.boolean('occupancy')`,
    contact: `exposes.boolean('contact')`,
    battery_low: `exposes.boolean('battery_low')`,
    tamper: `exposes.boolean('tamper')`,
    water_leak: `exposes.boolean('water_leak')`,
    vibration: `exposes.boolean('vibration')`,
    battery: `exposes.numeric('battery').withUnit('%')`,
    temperature: `exposes.numeric('temperature').withUnit('°C')`,
    humidity: `exposes.numeric('humidity').withUnit('%')`,
    pressure: `exposes.numeric('pressure').withUnit('hPa')`,
    illuminance: `exposes.numeric('illuminance')`,
    illuminance_lux: `exposes.numeric('illuminance_lux').withUnit('lx')`,
    soil_moisture: `exposes.numeric('soil_moisture').withUnit('%')`,
    power: `exposes.numeric('power').withUnit('W')`,
    current: `exposes.numeric('current').withUnit('A')`,
    voltage: `exposes.numeric('voltage').withUnit('V')`,
    switch: `exposes.switch()`,
    energy: `exposes.numeric('energy').withUnit('kWh')`,
};

const mapping = {
    linkquality_from_basic: [],
    ias_occupancy_alarm_1: [exposes.occupancy, exposes.battery_low, exposes.tamper],
    ias_occupancy_alarm_2: [exposes.occupancy, exposes.battery_low, exposes.tamper],
    ias_water_leak_alarm_1: [exposes.water_leak, exposes.battery_low, exposes.tamper],
    ias_water_leak_alarm_2: [exposes.water_leak, exposes.battery_low, exposes.tamper],
    ias_water_leak_alarm_1_report: [exposes.water_leak, exposes.battery_low, exposes.tamper],
    ias_vibration_alarm_1: [exposes.vibration, exposes.battery_low, exposes.tamper],
    ias_vibration_alarm_2: [exposes.vibration, exposes.battery_low, exposes.tamper],
    ias_contact_alarm_1: [exposes.contact, exposes.battery_low, exposes.tamper],
    ias_contact_alarm_2: [exposes.contact, exposes.battery_low, exposes.tamper],
    battery: [exposes.battery],
    temperature: [exposes.temperature],
    humidity: [exposes.humidity],
    pressure: [exposes.pressure],
    soil_moisture: [exposes.soil_moisture],
    illuminance: [exposes.illuminance, exposes.illuminance_lux],
    electrical_measurement_power: [exposes.power, exposes.current, exposes.voltage],
    on_off: [exposes.switch],
    metering_power: [exposes.power, exposes.energy],
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
                        converters.forEach((c) => mapping[c].forEach((e) => exposes.add(e)));
                        const exposesStr = [...exposes].join(', ');
                        definition.properties.push(`exposes: [${exposesStr}],`);
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
