import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as e from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, KeyValueAny} from "../lib/types";

const ea = e.access;

// Structural alias for one meta.tuyaDatapoints entry — derived from
// DefinitionWithExtend itself so it always matches the real tuple shape
// (number/string/converter, plus an optional per-entry meta object) without
// having to name the library's internal type.
type TuyaDpEntry = NonNullable<NonNullable<DefinitionWithExtend["meta"]>["tuyaDatapoints"]>[number];

// --- MakeGood / Sparkelec TS0601 RGB-backlight range helpers ---
//
//   _TZE200_lq0ffndf  MG-GPO02Z  (Sparkelec SGPO2TZ)   2 channels
//   _TZE200_4jvmbiph  MG-AU03    (Sparkelec SGPO2XTZ)  3 channels
//
// DP 107 is a raw blob of 1 + (10 * channel count) bytes, so a single
// converter parameterised by channel count serves both devices.

// The device reports `false` rather than 0 when a countdown is idle.
const countdownConverter = {
    from: (value: unknown) => (value == null || value === false ? 0 : Number(value)),
    to: (value: unknown) => Number(value),
};

// DP 20 reports an energy increment since the last report rather than a
// running total, so the cumulative figure is accumulated here. Note this
// means the total lives in Zigbee2MQTT state — clearing device state resets
// the displayed total even though the device keeps counting.
const energyConverter = {
    from: (value: unknown, meta: {state?: {energy?: number}}) => {
        const previous = Number(meta?.state?.energy) || 0;
        if (value == null) return previous;

        const increment = tuya.valueConverter.divideBy1000.from(value as number);

        // Only add positive deltas; ignore zero reports and any reset/rollover.
        if (increment > 0) return Number((previous + increment).toFixed(3));
        return previous;
    },
    to: (value: unknown) => value,
};

const BACKLIGHT_CHANNEL_SIZE = 10;

const backlightDefaults = {
    on_brightness: 100,
    on_hue: 0,
    on_saturation: 1000,
    off_brightness: 10,
    off_hue: 240,
    off_saturation: 1000,
};

const clampBacklight = (value: unknown, min: number, max: number) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return min;
    return Math.max(min, Math.min(max, Math.round(numeric)));
};

const backlightColorConverter = (channelCount: number) => {
    const length = 1 + channelCount * BACKLIGHT_CHANNEL_SIZE;
    const offsetOf = (index: number) => 1 + index * BACKLIGHT_CHANNEL_SIZE;
    const channelNames = Array.from({length: channelCount}, (_v, i) => `socket${i + 1}`);

    return {
        from(value: unknown) {
            if (!value) return null;

            const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value as string);
            if (buffer.length !== length) return null;

            const parseChannel = (o: number) => ({
                on_brightness: buffer[o],
                on_hue: buffer.readUInt16BE(o + 1),
                on_saturation: buffer.readUInt16BE(o + 3),
                off_brightness: buffer[o + 5],
                off_hue: buffer.readUInt16BE(o + 6),
                off_saturation: buffer.readUInt16BE(o + 8),
            });

            const result: Record<string, unknown> = {mode: buffer[0] === 1 ? "multi" : "single"};
            for (const [index, name] of channelNames.entries()) {
                result[name] = parseChannel(offsetOf(index));
            }
            return result;
        },

        to(value: unknown, meta: {state?: {"backlight_color"?: KeyValueAny}}) {
            let config: KeyValueAny = value;

            if (typeof value === "string") {
                try {
                    config = JSON.parse(value);
                } catch {
                    throw new Error("backlight_color must contain valid JSON");
                }
            }

            if (!config || typeof config !== "object") {
                throw new Error("backlight_color must be an object");
            }

            // Merge over current state so a partial update does not reset the
            // features (or the channels) it did not mention.
            const current = meta?.state?.backlight_color ?? {};
            const mergeChannel = (name: string) => ({
                ...backlightDefaults,
                ...(current[name] ?? {}),
                ...(config[name] ?? {}),
            });

            const buffer = Buffer.alloc(length);
            buffer[0] = (config.mode ?? current.mode ?? "single") === "multi" ? 1 : 0;

            for (const [index, name] of channelNames.entries()) {
                const channel = mergeChannel(name);
                const o = offsetOf(index);

                buffer[o] = clampBacklight(channel.on_brightness, 0, 100);
                buffer.writeUInt16BE(clampBacklight(channel.on_hue, 0, 359), o + 1);
                buffer.writeUInt16BE(clampBacklight(channel.on_saturation, 0, 1000), o + 3);

                buffer[o + 5] = clampBacklight(channel.off_brightness, 0, 100);
                buffer.writeUInt16BE(clampBacklight(channel.off_hue, 0, 359), o + 6);
                buffer.writeUInt16BE(clampBacklight(channel.off_saturation, 0, 1000), o + 8);
            }

            // tuya.tz.datapoints dispatches on Array.isArray() and wraps the
            // result with Buffer.from() before sendDataPointRaw, so return an
            // array rather than the Buffer itself.
            return [...buffer];
        },
    };
};

const channelBacklightFeature = (property: string, label: string) =>
    e
        .composite(property, property, ea.STATE_SET)
        .withLabel(label)
        .withDescription(`${label} backlight settings`)
        .withFeature(
            e
                .numeric("on_brightness", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(100)
                .withValueStep(1)
                .withUnit("%")
                .withDescription("Brightness while on"),
        )
        .withFeature(
            e
                .numeric("on_hue", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(359)
                .withValueStep(1)
                .withDescription("Hue while on: 0 red, 60 yellow, 120 green, 180 cyan, 240 blue, 270 purple, 300 magenta"),
        )
        .withFeature(
            e
                .numeric("on_saturation", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(1000)
                .withValueStep(1)
                .withDescription("Saturation while on: 0 white, 1000 full colour"),
        )
        .withFeature(
            e
                .numeric("off_brightness", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(100)
                .withValueStep(1)
                .withUnit("%")
                .withDescription("Brightness while off — backlight mode ON only"),
        )
        .withFeature(
            e
                .numeric("off_hue", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(359)
                .withValueStep(1)
                .withDescription("Hue while off — multi mode only"),
        )
        .withFeature(
            e
                .numeric("off_saturation", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(1000)
                .withValueStep(1)
                .withDescription("Saturation while off — multi mode only"),
        );

const backlightColorExpose = (labels: string[]) => {
    let composite = e
        .composite("backlight_color", "backlight_color", ea.STATE_SET)
        .withDescription("Backlight colour configuration, only meaningful when backlight mode is ON")
        .withFeature(
            e
                .enum("mode", ea.STATE_SET, ["single", "multi"])
                .withDescription("single: one colour per channel; multi: separate on and off colours per channel"),
        );

    labels.forEach((label, index) => {
        composite = composite.withFeature(channelBacklightFeature(`socket${index + 1}`, label));
    });

    return composite.withCategory("config");
};

const countdownExpose = (endpoint: string) =>
    e
        .numeric("countdown", ea.STATE_SET)
        .withEndpoint(endpoint)
        .withUnit("s")
        .withValueMin(0)
        .withValueMax(43200)
        .withValueStep(1)
        .withDescription("Auto-off/on countdown timer")
        .withCategory("config");

// Datapoints and exposes shared by every device in this range. `channels` is
// the list of endpoint keys, in datapoint order.
const powerOnBehaviorExpose = (channel: string) =>
    e
        .enum("power_on_behavior", ea.STATE_SET, ["off", "on", "previous"])
        .withEndpoint(channel)
        .withDescription("Behavior when power is restored")
        .withCategory("config");

const commonExposes = (channels: string[], labels: string[]) => [
    ...channels.map((channel) => tuya.exposes.switch().withEndpoint(channel)),
    ...channels.map((channel) => countdownExpose(channel)),
    ...channels.map((channel) => powerOnBehaviorExpose(channel)),
    e.binary("all_on_off", ea.STATE_SET, "ON", "OFF").withDescription("Turn all channels on or off simultaneously"),
    e.numeric("power", ea.STATE).withUnit("W").withDescription("Instantaneous power"),
    e.numeric("current", ea.STATE).withUnit("A").withDescription("Instantaneous current"),
    e.numeric("voltage", ea.STATE).withUnit("V").withDescription("Instantaneous voltage"),
    e.numeric("energy", ea.STATE).withUnit("kWh").withDescription("Cumulative energy consumption"),
    tuya.exposes.backlightModeOffOn().withAccess(ea.STATE_SET),
    backlightColorExpose(labels),
    e.binary("child_lock", ea.STATE_SET, "LOCK", "UNLOCK").withDescription("Prevent physical control of the sockets").withCategory("config"),
];

const commonMeta = (channels: string[]): DefinitionWithExtend["meta"] => ({
    multiEndpoint: true,
    multiEndpointSkip: ["power", "current", "voltage", "energy", "all_on_off", "backlight_mode", "backlight_color", "child_lock"],
    tuyaDatapoints: [
        // Relays: DP 1..n
        ...channels.map((channel, i): TuyaDpEntry => [i + 1, `state_${channel}`, tuya.valueConverter.onOff]),

        // Countdown timers: DP 7..
        ...channels.map((channel, i): TuyaDpEntry => [i + 7, `countdown_${channel}`, countdownConverter]),

        // Backlight enable
        [16, "backlight_mode", tuya.valueConverter.onOff],

        // Electrical measurements
        [20, "energy", energyConverter],
        [21, "current", tuya.valueConverter.divideBy1000],
        [22, "power", tuya.valueConverter.divideBy10],
        [23, "voltage", tuya.valueConverter.divideBy10],
        // DP 24 is reported by the device but its meaning is unconfirmed, so it is not exposed.

        // Power-on behaviour: DP 29..
        ...channels.map((channel, i): TuyaDpEntry => [i + 29, `power_on_behavior_${channel}`, tuya.valueConverter.powerOnBehaviorEnum]),

        [101, "child_lock", tuya.valueConverter.lockUnlock],
        [107, "backlight_color", backlightColorConverter(channels.length)],
        [136, "all_on_off", tuya.valueConverter.onOff],
        // DP 165 is reported by the device but its meaning is unconfirmed, so it is not exposed.
    ],
});

// --- Definitions ---

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS011F", ["_TZ3000_dd8wwzcy"]),
        model: "MG-AUZG01",
        vendor: "MakeGood",
        description: "Double Zigbee power point",
        extend: [
            tuya.modernExtend.tuyaBase(),
            tuya.modernExtend.tuyaOnOff({powerOutageMemory: true, indicatorMode: true, endpoints: ["l1", "l2"], electricalMeasurements: true}),
        ],
        meta: {multiEndpointSkip: ["power", "current", "voltage", "energy"], multiEndpoint: true},
        endpoint: (device) => {
            return {l1: 1, l2: 2};
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.bind(device.getEndpoint(2), coordinatorEndpoint, ["genOnOff"]);
            await reporting.rmsVoltage(endpoint, {change: 5});
            await reporting.rmsCurrent(endpoint, {change: 50});
            await reporting.activePower(endpoint, {change: 10});
            await reporting.currentSummDelivered(endpoint);
            endpoint.saveClusterAttributeKeyValue("haElectricalMeasurement", {acCurrentDivisor: 1000, acCurrentMultiplier: 1});
            endpoint.saveClusterAttributeKeyValue("seMetering", {divisor: 100, multiplier: 1});
            device.save();
        },
    },
    {
        fingerprint: tuya.fingerprint("TS011F", ["_TZ3210_bep7ccew", "_TZ3210_qlmnxmac"]),
        whiteLabel: [tuya.whitelabel("Melery", "_TZ3210_qlmnxmac", "2 gang power point with power monitoring", ["_TZ3210_qlmnxmac"])],
        model: "MG-GPO01",
        vendor: "MakeGood",
        description: "Double Zigbee power point",
        fromZigbee: [fz.identify, fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior, tz.electrical_measurement_power],
        extend: [
            m.deviceEndpoints({endpoints: {right: 1, left: 2}}),
            m.identify(),
            tuya.modernExtend.tuyaBase(),
            tuya.modernExtend.tuyaOnOff({
                endpoints: ["right", "left"],
                powerOutageMemory: true,
                indicatorMode: true,
                childLock: true,
                onOffCountdown: true,
                electricalMeasurements: true,
            }),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.onOff(endpoint1);
            await reporting.rmsVoltage(endpoint1, {min: 5, max: 3600, change: 1});
            await reporting.rmsCurrent(endpoint1, {min: 5, max: 3600, change: 1});
            await reporting.activePower(endpoint1, {min: 5, max: 3600, change: 1});
            await reporting.currentSummDelivered(endpoint1, {min: 5, max: 3600, change: 5});
            await reporting.bind(endpoint2, coordinatorEndpoint, ["genOnOff"]);
            endpoint1.saveClusterAttributeKeyValue("haElectricalMeasurement", {
                acCurrentDivisor: 1000,
                acCurrentMultiplier: 1,
                acPowerDivisor: 1,
                acPowerMultiplier: 1,
                acVoltageDivisor: 1,
                acVoltageMultiplier: 1,
            });
            endpoint1.saveClusterAttributeKeyValue("seMetering", {
                divisor: 100,
                multiplier: 1,
            });
            device.save();
        },
        meta: {
            multiEndpoint: true,
            multiEndpointSkip: ["power", "current", "voltage", "energy"],
        },
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_lq0ffndf"]),
        model: "MG-GPO02Z",
        vendor: "MakeGood",
        description: "Double GPO with energy monitoring and RGB backlights",
        whiteLabel: [tuya.whitelabel("Sparkelec", "SGPO2TZ", "Double GPO with energy monitoring and RGB backlights", ["_TZE200_lq0ffndf"])],
        extend: [tuya.modernExtend.tuyaBase({dp: true, timeStart: "1970"})],
        // Both sockets are on endpoint 1; the l1/l2 split is by datapoint. This
        // mapping exists only so withEndpoint() postfixes the property names.
        endpoint: () => ({l1: 1, l2: 1}),
        exposes: commonExposes(["l1", "l2"], ["Socket 1", "Socket 2"]),
        meta: commonMeta(["l1", "l2"]),
    },
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_4jvmbiph"]),
        model: "MG-AU03",
        vendor: "MakeGood",
        description: "Double GPO with light switch, energy monitoring and RGB backlights",
        whiteLabel: [
            tuya.whitelabel("Sparkelec", "SGPO2XTZ", "Double GPO with light switch, energy monitoring and RGB backlights", ["_TZE200_4jvmbiph"]),
        ],
        extend: [tuya.modernExtend.tuyaBase({dp: true, timeStart: "1970"})],
        endpoint: () => ({l1: 1, l2: 1, l3: 1}),
        // Labels assume block order matches datapoint order (l1, l2, l3) — still to confirm.
        exposes: commonExposes(["l1", "l2", "l3"], ["Socket 1", "Socket 2", "Socket 3"]),
        meta: commonMeta(["l1", "l2", "l3"]),
    },
];
