import {Zcl} from "zigbee-herdsman";

import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Expose, Fz, KeyValue, ModernExtend, OnEvent, Tz, Zh} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;
const CLUSTER = "airwickCtrl";
const ENDPOINT = 10;
const ZIGBEE_EPOCH_UNIX = 946684800;
const SCHEDULE_INFO = "Пн–Пт 07:00–22:00; Сб–Вс 09:00–22:00; каждые 30 мин; длительность задаётся отдельно";

const DAYS = [
    {key: "mon", label: "Понедельник"},
    {key: "tue", label: "Вторник"},
    {key: "wed", label: "Среда"},
    {key: "thu", label: "Четверг"},
    {key: "fri", label: "Пятница"},
    {key: "sat", label: "Суббота"},
    {key: "sun", label: "Воскресенье"},
] as const;

const attrs = {
    mode: {name: "mode", ID: 0x0000, type: Zcl.DataType.ENUM8, write: true, max: 3},
    autoIntervalMin: {name: "autoIntervalMin", ID: 0x0001, type: Zcl.DataType.UINT16, write: true, max: 1440},
    scheduleDays: {name: "scheduleDays", ID: 0x0002, type: Zcl.DataType.UINT8, write: true, max: 0x7f},
    scheduleStartMin: {name: "scheduleStartMin", ID: 0x0003, type: Zcl.DataType.UINT16, write: true, max: 1439},
    scheduleEndMin: {name: "scheduleEndMin", ID: 0x0004, type: Zcl.DataType.UINT16, write: true, max: 1439},
    scheduleIntervalMin: {name: "scheduleIntervalMin", ID: 0x0005, type: Zcl.DataType.UINT16, write: true, max: 1440},
    timezoneMin: {name: "timezoneMin", ID: 0x0006, type: Zcl.DataType.INT16, write: true, min: -720, max: 840},
    sprayCount: {name: "sprayCount", ID: 0x0007, type: Zcl.DataType.UINT32, max: 0xffffffff},
    lastSprayReason: {name: "lastSprayReason", ID: 0x0008, type: Zcl.DataType.UINT8, max: 5},
    lastSprayTime: {name: "lastSprayTime", ID: 0x0009, type: Zcl.DataType.UTC, max: 0xfffffffe},
    nextSprayTime: {name: "nextSprayTime", ID: 0x000a, type: Zcl.DataType.UTC, max: 0xfffffffe},
    timeValid: {name: "timeValid", ID: 0x000b, type: Zcl.DataType.BOOLEAN},
    physicalMode: {name: "physicalMode", ID: 0x000d, type: Zcl.DataType.UINT8, max: 0xff},
    resetCounter: {name: "resetCounter", ID: 0x000e, type: Zcl.DataType.BOOLEAN, write: true},
    settingsVersion: {name: "settingsVersion", ID: 0x000f, type: Zcl.DataType.UINT8, max: 0xff},
    syncTime: {name: "syncTime", ID: 0x0010, type: Zcl.DataType.UINT32, write: true, max: 0xfffffffe},
    batteryMv: {name: "batteryMv", ID: 0x0011, type: Zcl.DataType.UINT16, max: 0xffff},
    sprayDurationMs: {name: "sprayDurationMs", ID: 0x0012, type: Zcl.DataType.UINT16, write: true, min: 300, max: 1000},
    program1Enabled: {name: "program1Enabled", ID: 0x0020, type: Zcl.DataType.BOOLEAN, write: true},
    program1Days: {name: "program1Days", ID: 0x0021, type: Zcl.DataType.UINT8, write: true, max: 0x7f},
    program1StartMin: {name: "program1StartMin", ID: 0x0022, type: Zcl.DataType.UINT16, write: true, max: 1439},
    program1EndMin: {name: "program1EndMin", ID: 0x0023, type: Zcl.DataType.UINT16, write: true, max: 1439},
    program1IntervalMin: {name: "program1IntervalMin", ID: 0x0024, type: Zcl.DataType.UINT16, write: true, max: 1440},
    program2Enabled: {name: "program2Enabled", ID: 0x0028, type: Zcl.DataType.BOOLEAN, write: true},
    program2Days: {name: "program2Days", ID: 0x0029, type: Zcl.DataType.UINT8, write: true, max: 0x7f},
    program2StartMin: {name: "program2StartMin", ID: 0x002a, type: Zcl.DataType.UINT16, write: true, max: 1439},
    program2EndMin: {name: "program2EndMin", ID: 0x002b, type: Zcl.DataType.UINT16, write: true, max: 1439},
    program2IntervalMin: {name: "program2IntervalMin", ID: 0x002c, type: Zcl.DataType.UINT16, write: true, max: 1440},
    program3Enabled: {name: "program3Enabled", ID: 0x0030, type: Zcl.DataType.BOOLEAN, write: true},
    program3Days: {name: "program3Days", ID: 0x0031, type: Zcl.DataType.UINT8, write: true, max: 0x7f},
    program3StartMin: {name: "program3StartMin", ID: 0x0032, type: Zcl.DataType.UINT16, write: true, max: 1439},
    program3EndMin: {name: "program3EndMin", ID: 0x0033, type: Zcl.DataType.UINT16, write: true, max: 1439},
    program3IntervalMin: {name: "program3IntervalMin", ID: 0x0034, type: Zcl.DataType.UINT16, write: true, max: 1440},
    program4Enabled: {name: "program4Enabled", ID: 0x0038, type: Zcl.DataType.BOOLEAN, write: true},
    program4Days: {name: "program4Days", ID: 0x0039, type: Zcl.DataType.UINT8, write: true, max: 0x7f},
    program4StartMin: {name: "program4StartMin", ID: 0x003a, type: Zcl.DataType.UINT16, write: true, max: 1439},
    program4EndMin: {name: "program4EndMin", ID: 0x003b, type: Zcl.DataType.UINT16, write: true, max: 1439},
    program4IntervalMin: {name: "program4IntervalMin", ID: 0x003c, type: Zcl.DataType.UINT16, write: true, max: 1440},
    program5Enabled: {name: "program5Enabled", ID: 0x0040, type: Zcl.DataType.BOOLEAN, write: true},
    program5Days: {name: "program5Days", ID: 0x0041, type: Zcl.DataType.UINT8, write: true, max: 0x7f},
    program5StartMin: {name: "program5StartMin", ID: 0x0042, type: Zcl.DataType.UINT16, write: true, max: 1439},
    program5EndMin: {name: "program5EndMin", ID: 0x0043, type: Zcl.DataType.UINT16, write: true, max: 1439},
    program5IntervalMin: {name: "program5IntervalMin", ID: 0x0044, type: Zcl.DataType.UINT16, write: true, max: 1440},
    program6Enabled: {name: "program6Enabled", ID: 0x0048, type: Zcl.DataType.BOOLEAN, write: true},
    program6Days: {name: "program6Days", ID: 0x0049, type: Zcl.DataType.UINT8, write: true, max: 0x7f},
    program6StartMin: {name: "program6StartMin", ID: 0x004a, type: Zcl.DataType.UINT16, write: true, max: 1439},
    program6EndMin: {name: "program6EndMin", ID: 0x004b, type: Zcl.DataType.UINT16, write: true, max: 1439},
    program6IntervalMin: {name: "program6IntervalMin", ID: 0x004c, type: Zcl.DataType.UINT16, write: true, max: 1440},
    program7Enabled: {name: "program7Enabled", ID: 0x0050, type: Zcl.DataType.BOOLEAN, write: true},
    program7Days: {name: "program7Days", ID: 0x0051, type: Zcl.DataType.UINT8, write: true, max: 0x7f},
    program7StartMin: {name: "program7StartMin", ID: 0x0052, type: Zcl.DataType.UINT16, write: true, max: 1439},
    program7EndMin: {name: "program7EndMin", ID: 0x0053, type: Zcl.DataType.UINT16, write: true, max: 1439},
    program7IntervalMin: {name: "program7IntervalMin", ID: 0x0054, type: Zcl.DataType.UINT16, write: true, max: 1440},
} as const;

const customCluster = m.deviceAddCustomCluster(CLUSTER, {
    name: CLUSTER,
    ID: 0xfc00,
    attributes: attrs,
    commands: {},
    commandsResponse: {},
});

const MODE_NAMES = ["OFF", "AUTO", "SCHEDULE", "PROGRAMMABLE"] as const;
const REASON_NAMES = ["нет", "Zigbee", "кнопка", "AUTO", "SCHEDULE", "PROGRAM"] as const;
const LIION_CURVE_X2 = [
    [4200, 200],
    [4180, 196],
    [4160, 192],
    [4140, 188],
    [4120, 184],
    [4100, 180],
    [4080, 176],
    [4060, 171],
    [4040, 166],
    [4020, 160],
    [4000, 154],
    [3980, 148],
    [3960, 142],
    [3940, 135],
    [3920, 128],
    [3900, 120],
    [3880, 112],
    [3860, 104],
    [3840, 96],
    [3820, 88],
    [3800, 80],
    [3780, 72],
    [3760, 64],
    [3740, 56],
    [3720, 48],
    [3700, 40],
    [3680, 32],
    [3660, 25],
    [3640, 19],
    [3620, 14],
    [3600, 10],
    [3580, 7],
    [3560, 5],
    [3540, 3],
    [3520, 2],
    [3500, 1],
    [3400, 0],
] as const;

function liionPercentFromMv(value: unknown): number | undefined {
    const mv = Number(value);
    if (!Number.isFinite(mv) || mv < 2500 || mv > 4400) return undefined;
    if (mv >= LIION_CURVE_X2[0][0]) return 100;

    for (let i = 1; i < LIION_CURVE_X2.length; i++) {
        const [highMv, highX2] = LIION_CURVE_X2[i - 1];
        const [lowMv, lowX2] = LIION_CURVE_X2[i];
        if (mv >= lowMv) {
            const x2 = lowX2 + Math.floor(((mv - lowMv) * (highX2 - lowX2) + Math.floor((highMv - lowMv) / 2)) / (highMv - lowMv));
            return x2 / 2;
        }
    }

    return 0;
}

const lastClockSyncAttempt = new Map<string, number>();
const CLOCK_SYNC_THROTTLE_MS = 60000;

function minutesToTime(value: unknown): string {
    const v = Number(value);
    if (!Number.isFinite(v) || v < 0 || v > 1439) return "—";
    const h = Math.floor(v / 60);
    const min = v % 60;
    return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function timeToMinutes(value: unknown): number {
    const s = String(value).trim();
    const match = /^(\d{1,2}):(\d{2})$/.exec(s);
    if (!match) throw new Error("Время нужно вводить как ЧЧ:ММ, например 07:30");

    const h = Number(match[1]);
    const min = Number(match[2]);
    if (h > 23 || min > 59) throw new Error("Некорректное время; допустимо 00:00–23:59");

    return h * 60 + min;
}

function timezoneMinutes(meta: {state?: KeyValue}): number {
    const h = Number(meta.state?.timezone_hours);
    return Number.isFinite(h) ? Math.round(h * 60) : 180;
}

function formatZigbeeTime(value: unknown, tzMinutes: number): string {
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0 || v >= 0xffffffff) return "—";

    const date = new Date((v + ZIGBEE_EPOCH_UNIX + tzMinutes * 60) * 1000);
    const d = String(date.getUTCDate()).padStart(2, "0");
    const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
    const y = date.getUTCFullYear();
    const h = String(date.getUTCHours()).padStart(2, "0");
    const mi = String(date.getUTCMinutes()).padStart(2, "0");
    return `${d}.${mo}.${y} ${h}:${mi}`;
}

type DynamicEndpoint = {
    write: (cluster: string, attributes: Record<string, unknown>) => Promise<unknown>;
    read: (cluster: string, attributes: string[]) => Promise<unknown>;
    configureReporting: (cluster: string, items: Array<Record<string, unknown>>) => Promise<unknown>;
};

function dynamicEndpoint(entity: Zh.Endpoint | Zh.Group): DynamicEndpoint {
    return entity as unknown as DynamicEndpoint;
}

// biome-ignore lint/suspicious/noExplicitAny: the custom cluster is registered dynamically at runtime.
const fzAirwick: Fz.Converter<any, any, any> = {
    cluster: CLUSTER,
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        const d = msg.data;
        const out: KeyValue = {schedule_info: SCHEDULE_INFO};
        const tz = d.timezoneMin !== undefined ? Number(d.timezoneMin) : timezoneMinutes(meta);

        if (d.mode !== undefined) out.mode = MODE_NAMES[Number(d.mode)] ?? "UNKNOWN";
        if (d.autoIntervalMin !== undefined) out.auto_interval_min = Number(d.autoIntervalMin);
        if (d.sprayDurationMs !== undefined) out.spray_duration_ms = Number(d.sprayDurationMs);
        if (d.timezoneMin !== undefined) out.timezone_hours = Number(d.timezoneMin) / 60;
        if (d.sprayCount !== undefined) out.spray_count = Number(d.sprayCount);
        if (d.lastSprayReason !== undefined) out.last_spray_reason = REASON_NAMES[Number(d.lastSprayReason)] ?? "неизвестно";
        if (d.lastSprayTime !== undefined) out.last_spray_time = formatZigbeeTime(d.lastSprayTime, tz);
        if (d.nextSprayTime !== undefined) out.next_spray_time = formatZigbeeTime(d.nextSprayTime, tz);

        if (d.timeValid !== undefined) {
            out.time_valid = d.timeValid ? "ON" : "OFF";
            if (!d.timeValid && meta.device) {
                const key = meta.device.ieeeAddr ?? "airwick";
                const nowMs = Date.now();
                const lastMs = lastClockSyncAttempt.get(key) ?? 0;
                if (nowMs - lastMs >= CLOCK_SYNC_THROTTLE_MS) {
                    lastClockSyncAttempt.set(key, nowMs);
                    void syncClock(meta.device).catch(() => {});
                }
            }
        }

        if (d.batteryMv !== undefined) {
            const pct = liionPercentFromMv(d.batteryMv);
            if (pct !== undefined) {
                out.battery_v = Number(d.batteryMv) / 1000;
                out.battery = pct;
            }
        }

        for (let slot = 0; slot < 7; slot++) {
            const n = slot + 1;
            const key = DAYS[slot].key;
            if (d[`program${n}Enabled`] !== undefined) out[`program_${key}_enabled`] = d[`program${n}Enabled`] ? "ON" : "OFF";
            if (d[`program${n}StartMin`] !== undefined) out[`program_${key}_start`] = minutesToTime(d[`program${n}StartMin`]);
            if (d[`program${n}EndMin`] !== undefined) out[`program_${key}_end`] = minutesToTime(d[`program${n}EndMin`]);
            if (d[`program${n}IntervalMin`] !== undefined) out[`program_${key}_interval_min`] = Number(d[`program${n}IntervalMin`]);
        }

        return out;
    },
};

const programKeys: string[] = [];
for (const day of DAYS) {
    programKeys.push(`program_${day.key}_enabled`, `program_${day.key}_start`, `program_${day.key}_end`, `program_${day.key}_interval_min`);
}

const tzAirwick: Tz.Converter = {
    key: ["auto_interval_min", "spray_duration_ms", "timezone_hours", ...programKeys],
    convertSet: async (entity, key, value) => {
        if (key === "spray_duration_ms") {
            const n = Number(value);
            if (!Number.isInteger(n) || n < 300 || n > 1000) throw new Error("Длительность должна быть 300–1000 мс");
            await dynamicEndpoint(entity).write(CLUSTER, {sprayDurationMs: n});
            return {state: {spray_duration_ms: n}};
        }

        if (key === "auto_interval_min") {
            const n = Number(value);
            await dynamicEndpoint(entity).write(CLUSTER, {autoIntervalMin: n});
            return {state: {auto_interval_min: n}};
        }

        if (key === "timezone_hours") {
            const hours = Number(value);
            await dynamicEndpoint(entity).write(CLUSTER, {timezoneMin: Math.round(hours * 60)});
            return {state: {timezone_hours: hours}};
        }

        const match = /^program_(mon|tue|wed|thu|fri|sat|sun)_(enabled|start|end|interval_min)$/.exec(key);
        if (match) {
            const slot = DAYS.findIndex((day) => day.key === match[1]);
            const n = slot + 1;
            const field = match[2];

            if (field === "enabled") {
                const on = value === "ON" || value === true || value === 1;
                await dynamicEndpoint(entity).write(CLUSTER, {[`program${n}Enabled`]: on});
                return {state: {[key]: on ? "ON" : "OFF"}};
            }

            if (field === "start" || field === "end") {
                const minutes = timeToMinutes(value);
                const attr = `program${n}${field === "start" ? "StartMin" : "EndMin"}`;
                await dynamicEndpoint(entity).write(CLUSTER, {[attr]: minutes});
                return {state: {[key]: minutesToTime(minutes)}};
            }

            if (field === "interval_min") {
                const minutes = Number(value);
                await dynamicEndpoint(entity).write(CLUSTER, {[`program${n}IntervalMin`]: minutes});
                return {state: {[key]: minutes}};
            }
        }
    },
    convertGet: async (entity, key) => {
        if (key === "spray_duration_ms") return dynamicEndpoint(entity).read(CLUSTER, ["sprayDurationMs"]);
        if (key === "auto_interval_min") return dynamicEndpoint(entity).read(CLUSTER, ["autoIntervalMin"]);
        if (key === "timezone_hours") return dynamicEndpoint(entity).read(CLUSTER, ["timezoneMin"]);

        const match = /^program_(mon|tue|wed|thu|fri|sat|sun)_(enabled|start|end|interval_min)$/.exec(key);
        if (match) {
            const slot = DAYS.findIndex((day) => day.key === match[1]);
            const n = slot + 1;
            const field = match[2];
            const attr =
                field === "enabled"
                    ? `program${n}Enabled`
                    : field === "start"
                      ? `program${n}StartMin`
                      : field === "end"
                        ? `program${n}EndMin`
                        : `program${n}IntervalMin`;
            await dynamicEndpoint(entity).read(CLUSTER, [attr]);
        }
    },
};

const tzResetCounter: Tz.Converter = {
    key: ["reset_counter"],
    convertSet: async (entity) => {
        await dynamicEndpoint(entity).write(CLUSTER, {resetCounter: true});
        return {state: {reset_counter: null, spray_count: 0}};
    },
};

const tzSpray: Tz.Converter = {
    key: ["spray"],
    convertSet: async (entity) => {
        await entity.command("genOnOff", "on", {}, {});
        return {state: {spray: null}};
    },
};

const readOnlyGet: Tz.Converter = {
    key: ["mode", "spray_count", "last_spray_reason", "last_spray_time", "next_spray_time", "time_valid", "battery_v", "battery"],
    convertGet: async (entity, key) => {
        const map: Record<string, string> = {
            mode: "mode",
            spray_count: "sprayCount",
            last_spray_reason: "lastSprayReason",
            last_spray_time: "lastSprayTime",
            next_spray_time: "nextSprayTime",
            time_valid: "timeValid",
            battery_v: "batteryMv",
            battery: "batteryMv",
        };
        await dynamicEndpoint(entity).read(CLUSTER, [map[key]]);
    },
};

const ui: Expose[] = [
    e
        .enum("spray", ea.SET, ["РАСПЫЛИТЬ"])
        .withLabel("Распылить")
        .withDescription("Одно нажатие — одно распыление. Элемент не имеет фиксированного состояния."),
    e
        .enum("mode", ea.STATE_GET, [...MODE_NAMES])
        .withLabel("Режим")
        .withDescription("Текущий режим, задаваемый физическим переключателем."),
    e.numeric("battery_v", ea.STATE_GET).withLabel("Напряжение аккумулятора").withUnit("V").withValueStep(0.001),
    e.numeric("battery", ea.STATE_GET).withLabel("Заряд аккумулятора").withUnit("%").withValueMin(0).withValueMax(100).withValueStep(0.5),
    e
        .numeric("spray_duration_ms", ea.ALL)
        .withLabel("Длительность распыления")
        .withDescription("Общая для OFF, AUTO, SCHEDULE и PROGRAMMABLE; сохраняется при переключении режимов.")
        .withUnit("мс")
        .withValueMin(300)
        .withValueMax(1000)
        .withValueStep(10),
    e
        .numeric("auto_interval_min", ea.ALL)
        .withLabel("AUTO: интервал")
        .withUnit("мин")
        .withValueMin(1)
        .withValueMax(1440)
        .withValueStep(1)
        .withCategory("config"),
    e.text("schedule_info", ea.STATE).withLabel("SCHEDULE").withDescription("Встроенное расписание; редактирование не требуется."),
];

for (const day of DAYS) {
    ui.push(
        e.binary(`program_${day.key}_enabled`, ea.ALL, "ON", "OFF").withLabel(`PROGRAM — ${day.label}: включён`).withCategory("config"),
        e.text(`program_${day.key}_start`, ea.ALL).withLabel(`PROGRAM — ${day.label}: начало`).withDescription("ЧЧ:ММ").withCategory("config"),
        e.text(`program_${day.key}_end`, ea.ALL).withLabel(`PROGRAM — ${day.label}: конец`).withDescription("ЧЧ:ММ").withCategory("config"),
        e
            .numeric(`program_${day.key}_interval_min`, ea.ALL)
            .withLabel(`PROGRAM — ${day.label}: интервал`)
            .withUnit("мин")
            .withValueMin(1)
            .withValueMax(1440)
            .withValueStep(1)
            .withCategory("config"),
    );
}

ui.push(
    e
        .numeric("timezone_hours", ea.ALL)
        .withLabel("Часовой пояс UTC")
        .withUnit("ч")
        .withValueMin(-12)
        .withValueMax(14)
        .withValueStep(0.5)
        .withCategory("config"),
    e.numeric("spray_count", ea.STATE_GET).withLabel("Счётчик распылений").withValueMin(0),
    e.enum("reset_counter", ea.SET, ["СБРОСИТЬ"]).withLabel("Сбросить счётчик").withCategory("config"),
    e
        .enum("last_spray_reason", ea.STATE_GET, [...REASON_NAMES])
        .withLabel("Причина последнего распыления")
        .withCategory("diagnostic"),
    e.text("last_spray_time", ea.STATE_GET).withLabel("Последнее распыление").withCategory("diagnostic"),
    e.text("next_spray_time", ea.STATE_GET).withLabel("Следующее распыление").withCategory("diagnostic"),
    e.binary("time_valid", ea.STATE_GET, "ON", "OFF").withLabel("Время синхронизировано").withCategory("diagnostic"),
);

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function retry<T>(operation: () => Promise<T>, attempts = 3, delayMs = 350): Promise<T> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt < attempts) await delay(delayMs * attempt);
        }
    }

    throw lastError;
}

async function syncClock(device: Zh.Device): Promise<void> {
    const endpoint = device.getEndpoint(ENDPOINT);
    if (!endpoint) throw new Error(`AirWick endpoint ${ENDPOINT} not found`);

    const now = Math.floor(Date.now() / 1000) - ZIGBEE_EPOCH_UNIX;
    if (now > 0) await dynamicEndpoint(endpoint).write(CLUSTER, {syncTime: now});
}

async function configureReliableReporting(endpoint: Zh.Endpoint): Promise<void> {
    await retry(() =>
        dynamicEndpoint(endpoint).configureReporting(CLUSTER, [{attribute: "mode", minimumReportInterval: 0, maximumReportInterval: 3600}]),
    );
    await retry(() =>
        dynamicEndpoint(endpoint).configureReporting(CLUSTER, [{attribute: "timeValid", minimumReportInterval: 0, maximumReportInterval: 3600}]),
    );
    await retry(() =>
        dynamicEndpoint(endpoint).configureReporting(CLUSTER, [
            {attribute: "batteryMv", minimumReportInterval: 30, maximumReportInterval: 3600, reportableChange: 10},
        ]),
    );

    for (const attribute of ["sprayCount", "lastSprayReason", "lastSprayTime", "nextSprayTime"]) {
        await retry(() =>
            dynamicEndpoint(endpoint).configureReporting(CLUSTER, [
                {attribute, minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 1},
            ]),
        );
    }

    await retry(() => endpoint.configureReporting("genOnOff", [{attribute: "onOff", minimumReportInterval: 0, maximumReportInterval: 3600}]));
}

async function refreshState(device: Zh.Device): Promise<void> {
    const endpoint = device.getEndpoint(ENDPOINT);
    if (!endpoint) throw new Error(`AirWick endpoint ${ENDPOINT} not found`);

    const chunks: string[][] = [
        ["mode", "autoIntervalMin", "timezoneMin", "sprayCount", "batteryMv", "sprayDurationMs"],
        ["lastSprayReason", "lastSprayTime", "nextSprayTime", "timeValid"],
    ];

    for (let slot = 1; slot <= 7; slot++) {
        chunks.push([`program${slot}Enabled`, `program${slot}StartMin`, `program${slot}EndMin`, `program${slot}IntervalMin`]);
    }

    for (const attributes of chunks) {
        await retry(() => dynamicEndpoint(endpoint).read(CLUSTER, attributes));
        await delay(100);
    }

    await retry(() => endpoint.read("genOnOff", ["onOff"]));
}

async function configure(device: Zh.Device, coordinatorEndpoint: Zh.Endpoint): Promise<void> {
    const endpoint = device.getEndpoint(ENDPOINT);
    if (!endpoint) throw new Error(`AirWick endpoint ${ENDPOINT} not found`);

    await retry(() => endpoint.bind(CLUSTER, coordinatorEndpoint));
    await retry(() => endpoint.bind("genOnOff", coordinatorEndpoint));
    await retry(() => endpoint.bind("genPowerCfg", coordinatorEndpoint));
    await retry(() => syncClock(device));
    await configureReliableReporting(endpoint);
    await refreshState(device);
}

const onEvent: OnEvent.Handler = async (event) => {
    if (event.type === "start") {
        await delay(800);
        try {
            await retry(() => syncClock(event.data.device), 2, 500);
        } catch {
            // While powered, firmware keeps time via uptime and retries time sync itself.
        }
        return;
    }

    if (event.type === "deviceAnnounce") {
        await delay(1200);
        try {
            await syncClock(event.data.device);
        } catch {
            // Non-fatal: firmware keeps its uptime-based clock and retries itself.
        }
    }
};

function withoutExposes(extend: ModernExtend): ModernExtend {
    return {...extend, exposes: []};
}

function airwickFeatures(): ModernExtend {
    return {
        fromZigbee: [fzAirwick],
        toZigbee: [tzAirwick, tzResetCounter, tzSpray, readOnlyGet],
        exposes: ui,
        configure: [configure],
        onEvent: [onEvent],
        isModernExtend: true,
    };
}

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["AirWick_nRF52840"],
        model: "AirWick_nRF52840",
        vendor: "DIY",
        description: "AirWick smart aerosol dispenser nRF52840 v0.27; v0.26 plus persistent 300–1000 ms pulse for all modes",
        extend: [
            customCluster,
            withoutExposes(m.forcePowerSource({powerSource: "Battery"})),
            withoutExposes(m.battery({percentage: true, voltage: false})),
            withoutExposes(m.onOff()),
            airwickFeatures(),
        ],
    },
];
