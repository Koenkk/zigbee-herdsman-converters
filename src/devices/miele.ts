import * as exposes from "../lib/exposes";
import type {DefinitionWithExtend, Fz, KeyValueAny} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

const DEFAULT_ZONE_MAX_POWER = 9;
const ZONE_RECORD_START = 8;
const ZONE_RECORD_SIZE = 3;
const ZONE_PROGRAM_START = 56;
const MIELE_FD02_CLUSTER = "64770";
const MIELE_FD02_TELEMETRY_ATTRIBUTE = 0x0020;

const MODES = [
    "off",
    "normal",
    "twin_booster_1",
    "twin_booster_2",
    "keep_warm",
    "keep_warm_plus",
    "tempcontrol_fry_1",
    "tempcontrol_fry_2",
    "tempcontrol_fry_3",
    "tempcontrol_simmer",
    "unknown",
];

type ZoneLayout = {
    id: number;
    recordOffset: number;
    programOffset: number;
    maxPower: number;
};

type Zone = {
    id: number;
    state: "ON" | "OFF";
    power: number;
    mode: string;
    maxPower: number;
    raw: number;
    flags: number;
    zoneFlags: number;
    program: number;
};

type Aggregate = Record<"zone_count" | "active_zones" | "hob_power" | "extractor_demand", number>;

export function buildSequentialZoneLayout(
    zoneCount: number,
    options: {recordStart?: number; recordSize?: number; programStart?: number; maxPower?: number} = {},
): ZoneLayout[] {
    const {
        recordStart = ZONE_RECORD_START,
        recordSize = ZONE_RECORD_SIZE,
        programStart = ZONE_PROGRAM_START,
        maxPower = DEFAULT_ZONE_MAX_POWER,
    } = options;

    return Array.from({length: zoneCount}, (_, zone) => ({
        id: zone,
        recordOffset: recordStart + zone * recordSize,
        programOffset: programStart + zone,
        maxPower,
    }));
}

const KM6839_ZONE_LAYOUT = buildSequentialZoneLayout(4);

function getBuffer(value: unknown): Buffer | undefined {
    if (Buffer.isBuffer(value)) {
        return value;
    }

    if (Array.isArray(value)) {
        return Buffer.from(value);
    }

    if (value && typeof value === "object" && "data" in value && Array.isArray(value.data)) {
        return Buffer.from(value.data);
    }
}

function tempControlMode(program: number): string | undefined {
    switch (program & ~0x10) {
        case 7:
            return "tempcontrol_fry_1";
        case 8:
            return "tempcontrol_fry_2";
        case 9:
            return "tempcontrol_fry_3";
    }
}

export function decodeZone(data: Buffer, zoneLayout: ZoneLayout): Zone {
    const offset = zoneLayout.recordOffset;

    const raw = data[offset];
    const flags = data[offset + 1];
    const zoneFlags = data[offset + 2];
    const program = data[zoneLayout.programOffset];

    let state: "ON" | "OFF" = "OFF";
    let power = 0;
    let mode = "off";

    const tcMode = tempControlMode(program);

    if (tcMode !== undefined) {
        state = "ON";
        mode = tcMode;
    } else if (program === 4) {
        state = "ON";
        mode = "tempcontrol_simmer";
    } else if (raw === 110) {
        state = "ON";
        mode = program === 2 ? "keep_warm_plus" : "keep_warm";
    } else if ((flags & 0x80) !== 0) {
        state = "ON";
        power = zoneLayout.maxPower;
        mode = "twin_booster_2";
    } else if ((flags & 0x40) !== 0) {
        state = "ON";
        power = zoneLayout.maxPower;
        mode = "twin_booster_1";
    } else if (raw >= 1 && raw <= 17 && (raw & 1) === 1) {
        state = "ON";
        power = (raw + 1) / 2;
        mode = "normal";
    } else if (raw === 0 || raw === 101 || raw === 102 || raw === 103) {
        state = "OFF";
        power = 0;
        mode = "off";
    } else {
        state = raw !== 0 ? "ON" : "OFF";
        power = 0;
        mode = raw !== 0 ? "unknown" : "off";
    }

    return {
        id: zoneLayout.id,
        state,
        power,
        mode,
        maxPower: zoneLayout.maxPower,
        raw,
        flags,
        zoneFlags,
        program,
    };
}

export function decodeZones(data: Buffer, zoneLayouts: ZoneLayout[]): Zone[] {
    return zoneLayouts.map((zoneLayout) => decodeZone(data, zoneLayout));
}

function clampPercentage(value: number): number {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Math.min(100, Math.max(0, Math.round(value)));
}

function normalizedPower(zone: Zone): number {
    if (!Number.isFinite(zone.maxPower) || zone.maxPower <= 0) {
        return 0;
    }

    return Math.min(1, Math.max(0, zone.power / zone.maxPower));
}

export function aggregateZones(zones: Zone[]): Aggregate {
    if (!zones.length) {
        return {
            zone_count: 0,
            active_zones: 0,
            hob_power: 0,
            extractor_demand: 0,
        };
    }

    const normalized = zones.map(normalizedPower);
    const average = normalized.reduce((sum, power) => sum + power, 0) / zones.length;
    const maximum = Math.max(...normalized);

    return {
        zone_count: zones.length,
        active_zones: zones.filter((zone) => zone.state === "ON").length,
        hob_power: clampPercentage(100 * average),
        extractor_demand: clampPercentage(100 * (0.5 * average + 0.5 * maximum)),
    };
}

const fzLocal = {
    mieleFD02: {
        cluster: MIELE_FD02_CLUSTER,
        type: ["attributeReport", "readResponse"],
        convert: (model, msg) => {
            const messageData = msg.data as Record<string | number, unknown>;
            const data = getBuffer(messageData[MIELE_FD02_TELEMETRY_ATTRIBUTE] ?? messageData[MIELE_FD02_TELEMETRY_ATTRIBUTE.toString()]);

            if (!data || data.length < 60) {
                return;
            }

            const zones = decodeZones(data, KM6839_ZONE_LAYOUT);
            const result: KeyValueAny = aggregateZones(zones);

            for (const decoded of zones) {
                result[`zone_${decoded.id}_state`] = decoded.state;
                result[`zone_${decoded.id}_power`] = decoded.power;
                result[`zone_${decoded.id}_mode`] = decoded.mode;
            }

            return result;
        },
    } satisfies Fz.Converter<typeof MIELE_FD02_CLUSTER, undefined, readonly ["attributeReport", "readResponse"]>,
};

const zoneExposes = KM6839_ZONE_LAYOUT.flatMap((zone) => [
    e.binary(`zone_${zone.id}_state`, ea.STATE, "ON", "OFF").withDescription(`Zone ${zone.id} cooking state`),
    e
        .numeric(`zone_${zone.id}_power`, ea.STATE)
        .withValueMin(0)
        .withValueMax(zone.maxPower)
        .withValueStep(1)
        .withDescription(`Zone ${zone.id} manual power level; 0 for special automatic modes`),
    e.enum(`zone_${zone.id}_mode`, ea.STATE, MODES).withDescription(`Zone ${zone.id} operating mode`),
]);

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [
            {
                manufacturerID: 4393,
                endpoints: [
                    {ID: 210, profileID: 0xc51e, deviceID: 0x0052},
                    {ID: 212, profileID: 0xc51e, deviceID: 0x0052},
                    {ID: 213, profileID: 0xc51e, deviceID: 0x0052},
                    {ID: 214, profileID: 0xc51e, deviceID: 0x0052},
                    {ID: 216, profileID: 0xc51e, deviceID: 0x0052},
                ],
            },
        ],
        model: "KM6839",
        vendor: "Miele",
        description: "Induction hob",
        fromZigbee: [fzLocal.mieleFD02],
        toZigbee: [],
        exposes: [
            e.numeric("zone_count", ea.STATE).withValueMin(0).withValueStep(1).withDescription("Number of available cooking zones"),
            e.numeric("active_zones", ea.STATE).withValueMin(0).withValueStep(1).withDescription("Number of cooking zones currently on"),
            e
                .numeric("hob_power", ea.STATE)
                .withUnit("%")
                .withValueMin(0)
                .withValueMax(100)
                .withValueStep(1)
                .withDescription("Average hob power across available zones"),
            e
                .numeric("extractor_demand", ea.STATE)
                .withUnit("%")
                .withValueMin(0)
                .withValueMax(100)
                .withValueStep(1)
                .withDescription("Extractor demand derived from average and peak zone power"),
            ...zoneExposes,
        ],
    },
];
