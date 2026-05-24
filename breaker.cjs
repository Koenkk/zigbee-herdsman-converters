const tuya = require("zigbee-herdsman-converters/lib/tuya");
const exposes = require("zigbee-herdsman-converters/lib/exposes");
const reporting = require("zigbee-herdsman-converters/lib/reporting");
const utils = require("zigbee-herdsman-converters/lib/utils");
const fz = require("zigbee-herdsman-converters/converters/fromZigbee");
const e = exposes.presets;
const ea = exposes.access;

const Ts011fThreshold = {
    cluster: "manuSpecificTuya3",
    type: ["commandDataReport", "commandDataResponse"],
    convert: (model, msg, publish, options, meta) => {
        const splitToAttributes = (value) => {
            const result = {};
            let i = 0;
            while (i < value.length) {
                const attribute = value[i++];
                const state = value[i++];
                const number = value.readUInt16BE(i);
                i += 2;
                result[attribute] = [state, number];
            }
            return result;
        };
        const command = msg.data.cmd;
        const data = msg.data.data;
        const lookup = {0: "OFF", 1: "ON"};
        if (command === 0xe6 || command === 0xe7) {
            const value = splitToAttributes(data);
            return {
                temperature_threshold: value[0x05]?.[1],
                temperature_breaker: value[0x05] ? lookup[value[0x05][0]] : undefined,
                power_threshold: value[0x07]?.[1],
                power_breaker: value[0x07] ? lookup[value[0x07][0]] : undefined,
                over_current_threshold: value[0x01]?.[1],
                over_current_breaker: value[0x01] ? lookup[value[0x01][0]] : undefined,
                over_voltage_threshold: value[0x03]?.[1],
                over_voltage_breaker: value[0x03] ? lookup[value[0x03][0]] : undefined,
                under_voltage_threshold: value[0x04]?.[1],
                under_voltage_breaker: value[0x04] ? lookup[value[0x04][0]] : undefined,
            };
        }
    },
};

const Ts011fThresholdTz = {
    key: [
        "temperature_threshold",
        "temperature_breaker",
        "power_threshold",
        "power_breaker",
        "over_current_threshold",
        "over_current_breaker",
        "over_voltage_threshold",
        "over_voltage_breaker",
        "under_voltage_threshold",
        "under_voltage_breaker",
    ],
    convertSet: async (entity, key, value, meta) => {
        const onOffLookup = {ON: 1, OFF: 0, on: 1, off: 0};
        if (key === "temperature_threshold" || key === "temperature_breaker") {
            const state =
                key === "temperature_breaker"
                    ? utils.getFromLookup(value, onOffLookup)
                    : utils.getFromLookup(meta.state.temperature_breaker ?? "off", onOffLookup);
            const threshold =
                key === "temperature_breaker"
                    ? utils.toNumber(meta.state.temperature_threshold ?? 40, "temperature_threshold")
                    : utils.toNumber(value, "temperature_threshold");
            const buf = Buffer.from([5, state, 0, threshold]);
            await entity.command("manuSpecificTuya3", "setOptions2", {data: buf});
            return {state: {[key]: value}};
        }
        const typeLookup = {
            power_threshold: 7,
            power_breaker: 7,
            over_current_threshold: 1,
            over_current_breaker: 1,
            over_voltage_threshold: 3,
            over_voltage_breaker: 3,
            under_voltage_threshold: 4,
            under_voltage_breaker: 4,
        };
        const thresholdKey = key.endsWith("_breaker") ? key.replace("_breaker", "_threshold") : key;
        const breakerKey = key.endsWith("_breaker") ? key : key.replace("_threshold", "_breaker");
        const type = typeLookup[key];
        const state = key.endsWith("_breaker")
            ? utils.getFromLookup(value, onOffLookup)
            : utils.getFromLookup(meta.state[breakerKey] ?? "off", onOffLookup);
        const threshold = key.endsWith("_breaker")
            ? utils.toNumber(
                  meta.state[thresholdKey] ??
                      (thresholdKey === "power_threshold"
                          ? 1
                          : thresholdKey === "over_voltage_threshold"
                            ? 220
                            : thresholdKey === "under_voltage_threshold"
                              ? 76
                              : 1),
                  thresholdKey,
              )
            : utils.toNumber(value, thresholdKey);
        const buf = Buffer.alloc(4);
        buf.writeUInt8(type, 0);
        buf.writeUInt8(state, 1);
        buf.writeUInt16BE(threshold, 2);
        const command = type === 7 ? "setOptions2" : "setOptions3";
        await entity.command("manuSpecificTuya3", command, {data: buf});
        return {state: {[key]: value}};
    },
};

const definition = {
    fingerprint: [{modelID: "TS011F", manufacturerName: "_TZ3000_yi0n4xfd"}],
    model: "TO-Q-SY2-163JZT",
    vendor: "Tongou",
    description: "Smart circuit breaker with over/under voltage & current protection",
    extend: [
        tuya.modernExtend.tuyaBase(),
        tuya.modernExtend.tuyaOnOff({
            electricalMeasurements: true,
            electricalMeasurementsFzConverter: tuya.fz.TS011F_electrical_measurement,
            powerOutageMemory: true,
            indicatorMode: true,
            onOffCountdown: true,
            childLock: true,
        }),
        tuya.modernExtend.tuyaOnOffAction(),
    ],
    fromZigbee: [Ts011fThreshold, fz.temperature],
    toZigbee: [Ts011fThresholdTz],
    exposes: [
        e.temperature(),
        e
            .numeric("temperature_threshold", ea.STATE_SET)
            .withValueMin(40)
            .withValueMax(100)
            .withValueStep(1)
            .withUnit("°C")
            .withDescription("High temperature threshold"),
        e.binary("temperature_breaker", ea.STATE_SET, "ON", "OFF").withDescription("High temperature breaker"),
        e
            .numeric("power_threshold", ea.STATE_SET)
            .withValueMin(1)
            .withValueMax(26)
            .withValueStep(1)
            .withUnit("kW")
            .withDescription("High power threshold"),
        e.binary("power_breaker", ea.STATE_SET, "ON", "OFF").withDescription("High power breaker"),
        e
            .numeric("over_current_threshold", ea.STATE_SET)
            .withValueMin(1)
            .withValueMax(64)
            .withValueStep(1)
            .withUnit("A")
            .withDescription("Over-current threshold"),
        e.binary("over_current_breaker", ea.STATE_SET, "ON", "OFF").withDescription("Over-current breaker"),
        e
            .numeric("over_voltage_threshold", ea.STATE_SET)
            .withValueMin(220)
            .withValueMax(265)
            .withValueStep(1)
            .withUnit("V")
            .withDescription("Over-voltage threshold"),
        e.binary("over_voltage_breaker", ea.STATE_SET, "ON", "OFF").withDescription("Over-voltage breaker"),
        e
            .numeric("under_voltage_threshold", ea.STATE_SET)
            .withValueMin(76)
            .withValueMax(240)
            .withValueStep(1)
            .withUnit("V")
            .withDescription("Under-voltage threshold"),
        e.binary("under_voltage_breaker", ea.STATE_SET, "ON", "OFF").withDescription("Under-voltage breaker"),
    ],
    configure: async (device, coordinatorEndpoint) => {
        await tuya.configureMagicPacket(device, coordinatorEndpoint);
        const endpoint = device.getEndpoint(1);
        try {
            await endpoint.command("genBasic", "tuyaSetup", {});
        } catch {
            // Some hubs or devices may not support genBasic tuyaSetup; ignore errors
        }
        await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement"]);
        await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
        await reporting.rmsVoltage(endpoint, {change: 5});
        await reporting.rmsCurrent(endpoint, {change: 50});
        await reporting.activePower(endpoint, {change: 10});
        await reporting.currentSummDelivered(endpoint);
        endpoint.saveClusterAttributeKeyValue("haElectricalMeasurement", {
            acCurrentDivisor: 1000,
            acCurrentMultiplier: 1,
        });
        endpoint.saveClusterAttributeKeyValue("seMetering", {
            divisor: 100,
            multiplier: 1,
        });
        device.save();
    },
};

module.exports = definition;
