import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as e from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz, KeyValueAny, Tz} from "../lib/types";

const ea = e.access;

// --- MG-GPO02Z / SGPO2TZ helpers ---

const powerOnBehaviorConverter = tuya.valueConverterBasic.lookup({
    power_off: tuya.enum(0),
    power_on: tuya.enum(1),
    last: tuya.enum(2),
});

const childLockConverter = tuya.valueConverterBasic.lookup({LOCK: true, UNLOCK: false});

const countdownConverter = {
    from: (value: unknown) => (value == null || value === false ? 0 : Number(value)),
    to: (value: unknown) => Number(value),
};

const energyConverter = {
    from: (value: unknown, meta: {state?: {energy?: number}}) => {
        if (value == null) return 0;
        const newEnergy = tuya.valueConverter.divideBy1000.from(value as number);
        const lastEnergy = meta.state?.energy ?? 0;
        if (newEnergy > 0) return Number((lastEnergy + newEnergy).toFixed(3));
        return lastEnergy;
    },
    to: (value: unknown) => value,
};

const backlightColorConverter = {
    from(value: unknown) {
        if (!value) return null;
        const buf = Buffer.isBuffer(value) ? value : Buffer.from(value as string);
        if (buf.length !== 21) return null;
        const parseSocket = (o: number) => ({
            onBrightness: buf[o],
            onHue: buf.readUInt16BE(o + 1),
            onSaturation: buf.readUInt16BE(o + 3),
            offBrightness: buf[o + 5],
            offHue: buf.readUInt16BE(o + 6),
            offSaturation: buf.readUInt16BE(o + 8),
        });
        return {
            mode: buf[0] === 1 ? "multi" : "single",
            socket1: parseSocket(1),
            socket2: parseSocket(11),
        };
    },
    to(value: unknown) {
        return value;
    },
};

const backlightColorToZigbee: Tz.Converter = {
    key: ["backlight_color"],
    convertSet: async (entity, key, value, meta) => {
        let cfg = value as KeyValueAny;
        if (typeof value === "string") {
            try {
                cfg = JSON.parse(value);
            } catch {
                throw new Error("backlight_color must be valid JSON");
            }
        }

        const buf = Buffer.alloc(21);
        buf[0] = cfg.mode === "multi" ? 1 : 0;

        const clamp = (v: unknown, min: number, max: number) => Math.max(min, Math.min(max, Number(v) || 0));

        const writeSocket = (s: KeyValueAny, o: number) => {
            buf[o] = clamp(s.onBrightness ?? 100, 0, 100);
            buf.writeUInt16BE(clamp(s.onHue ?? 0, 0, 360), o + 1);
            buf.writeUInt16BE(clamp(s.onSaturation ?? 1000, 0, 1000), o + 3);
            buf[o + 5] = clamp(s.offBrightness ?? 10, 0, 100);
            buf.writeUInt16BE(clamp(s.offHue ?? 240, 0, 360), o + 6);
            buf.writeUInt16BE(clamp(s.offSaturation ?? 1000, 0, 1000), o + 8);
        };

        writeSocket(cfg.socket1 ?? {}, 1);
        writeSocket(cfg.socket2 ?? {}, 11);

        await tuya.sendDataPointRaw(entity, 107, [...buf]);
        return {state: {backlight_color: cfg}};
    },
};

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
        description: "Dual GPO with energy monitoring and RGB backlights",
        whiteLabel: [tuya.whitelabel("Sparkelec", "_TZE200_lq0ffndf", "Dual GPO with energy monitoring and RGB backlights", ["_TZE200_lq0ffndf"])],
        configure: tuya.configureMagicPacket,
        fromZigbee: [tuya.fz.datapoints],
        toZigbee: [backlightColorToZigbee, tuya.tz.datapoints],
        endpoint: () => ({l1: 1, l2: 1}),
        exposes: [
            tuya.exposes.switch().withEndpoint("l1"),
            tuya.exposes.switch().withEndpoint("l2"),

            e.numeric("countdown_l1", ea.STATE_SET)
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(43200)
                .withDescription("Auto-off/on countdown timer for socket 1"),
            e.numeric("countdown_l2", ea.STATE_SET)
                .withUnit("s")
                .withValueMin(0)
                .withValueMax(43200)
                .withDescription("Auto-off/on countdown timer for socket 2"),

            e.enum("power_on_behavior", ea.STATE_SET, ["power_off", "power_on", "last"])
                .withEndpoint("l1")
                .withDescription("Behavior when power is restored — socket 1"),
            e.enum("power_on_behavior", ea.STATE_SET, ["power_off", "power_on", "last"])
                .withEndpoint("l2")
                .withDescription("Behavior when power is restored — socket 2"),

            e.binary("all_on_off", ea.STATE_SET, "ON", "OFF").withDescription("Master switch — all sockets simultaneously"),

            e.numeric("power", ea.STATE).withUnit("W").withDescription("Instantaneous power"),
            e.numeric("current", ea.STATE).withUnit("A").withDescription("Instantaneous current"),
            e.numeric("voltage", ea.STATE).withUnit("V").withDescription("Instantaneous voltage"),
            e.numeric("energy", ea.STATE).withUnit("kWh").withDescription("Cumulative energy consumption"),

            tuya.exposes.backlightModeOffOn(),

            e.composite("backlight_color", "backlight_color", ea.STATE_SET)
                .withDescription("Backlight color config is only meaningful when backlight mode is ON")
                .withFeature(
                    e.enum("mode", ea.STATE_SET, ["single", "multi"]).withDescription(
                        "single: one color per socket; multi: separate on/off colors per socket",
                    ),
                )
                .withFeature(
                    e
                        .composite("socket1", "socket1", ea.STATE_SET)
                        .withDescription("Socket 1 LED")
                        .withFeature(
                            e.numeric("onBrightness", ea.STATE_SET).withValueMin(0).withValueMax(100).withUnit("%").withDescription("Brightness when socket is ON"),
                        )
                        .withFeature(
                            e
                                .numeric("onHue", ea.STATE_SET)
                                .withValueMin(0)
                                .withValueMax(360)
                                .withDescription("Hue (0=red, 60=yellow, 120=green, 180=cyan, 240=blue, 300=magenta, 360=purple)"),
                        )
                        .withFeature(
                            e
                                .numeric("onSaturation", ea.STATE_SET)
                                .withValueMin(0)
                                .withValueMax(1000)
                                .withDescription("Saturation when ON (0=white, 1000=full color)"),
                        )
                        .withFeature(
                            e
                                .numeric("offBrightness", ea.STATE_SET)
                                .withValueMin(0)
                                .withValueMax(100)
                                .withUnit("%")
                                .withDescription("Brightness when socket is OFF — backlight mode ON only"),
                        )
                        .withFeature(
                            e.numeric("offHue", ea.STATE_SET).withValueMin(0).withValueMax(360).withDescription("Hue when OFF — multi-color mode only"),
                        )
                        .withFeature(
                            e
                                .numeric("offSaturation", ea.STATE_SET)
                                .withValueMin(0)
                                .withValueMax(1000)
                                .withDescription("Saturation when OFF — multi-color mode only"),
                        ),
                )
                .withFeature(
                    e
                        .composite("socket2", "socket2", ea.STATE_SET)
                        .withDescription("Socket 2 LED")
                        .withFeature(
                            e.numeric("onBrightness", ea.STATE_SET).withValueMin(0).withValueMax(100).withUnit("%").withDescription("Brightness when socket is ON"),
                        )
                        .withFeature(
                            e
                                .numeric("onHue", ea.STATE_SET)
                                .withValueMin(0)
                                .withValueMax(360)
                                .withDescription("Hue (0=red, 60=yellow, 120=green, 180=cyan, 240=blue, 300=magenta, 360=purple)"),
                        )
                        .withFeature(
                            e
                                .numeric("onSaturation", ea.STATE_SET)
                                .withValueMin(0)
                                .withValueMax(1000)
                                .withDescription("Saturation when ON (0=white, 1000=full color)"),
                        )
                        .withFeature(
                            e
                                .numeric("offBrightness", ea.STATE_SET)
                                .withValueMin(0)
                                .withValueMax(100)
                                .withUnit("%")
                                .withDescription("Brightness when socket is OFF — backlight mode ON only"),
                        )
                        .withFeature(
                            e.numeric("offHue", ea.STATE_SET).withValueMin(0).withValueMax(360).withDescription("Hue when OFF — multi-color mode only"),
                        )
                        .withFeature(
                            e
                                .numeric("offSaturation", ea.STATE_SET)
                                .withValueMin(0)
                                .withValueMax(1000)
                                .withDescription("Saturation when OFF — multi-color mode only"),
                        ),
                ),

            e.binary("child_lock", ea.STATE_SET, "LOCK", "UNLOCK").withDescription("Prevent physical control of the sockets"),
        ],
        meta: {
            multiEndpoint: true,
            multiEndpointSkip: ["power", "current", "voltage", "energy", "all_on_off"],
            tuyaDatapoints: [
                [1, "state_l1", tuya.valueConverter.onOff],
                [2, "state_l2", tuya.valueConverter.onOff],
                [7, "countdown_l1", countdownConverter],
                [8, "countdown_l2", countdownConverter],
                [16, "backlight_mode", tuya.valueConverter.onOff],
                [20, "energy", energyConverter],
                [21, "current", tuya.valueConverter.divideBy1000],
                [22, "power", tuya.valueConverter.divideBy10],
                [23, "voltage", tuya.valueConverter.divideBy10],
                [29, "power_on_behavior_l1", powerOnBehaviorConverter],
                [30, "power_on_behavior_l2", powerOnBehaviorConverter],
                [101, "child_lock", childLockConverter],
                [107, "backlight_color", backlightColorConverter],
                [136, "all_on_off", tuya.valueConverter.onOff],
            ],
        },
    },
];
