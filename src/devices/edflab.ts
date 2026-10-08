import {Buffer} from "node:buffer";
import {Zcl} from "zigbee-herdsman";
import {DataType} from "zigbee-herdsman/dist/zspec/zcl";
import {OneJanuary2000} from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, KeyValue, ModernExtend, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

interface ErlDailySchedule {
    attributes: {
        auxSwitch1Label: string;
        auxSwitch2Label: string;
        auxSwitch3Label: string;
        auxSwitch4Label: string;
        auxSwitch5Label: string;
        auxSwitch6Label: string;
        auxSwitch7Label: string;
        auxSwitch8Label: string;
        currentAuxiliaryLoadSwitchState: number;
        currentDeliveredTier: number;
        currentTierLabel: string;
        linkyPeakPeriodStatus: number;
        peakStartTime: number;
        peakEndTime: number;
        currentTariffLabel: string;
    };
    commands: {
        getSchedule: {providerId: number; earliestStartTime: number; minIssuerEventId: number; numberOfSchedules: number; scheduleType: number};
        getDayProfile: {providerId: number; dayId: number};
        getScheduleCancellation: Record<string, never>;
    };
    commandResponses: {
        publishSchedule: {
            providerId: number;
            issuerEventId: number;
            scheduleId: number;
            dayId: number;
            startTime: number;
            scheduleType: number;
            scheduleTimeReference: number;
            scheduleName: string;
        };
        publishDayProfile: {
            providerId: number;
            issuerEventId: number;
            dayId: number;
            totalNumberOfScheduleEntries: number;
            commandIndex: number;
            totalNumberOfCommands: number;
            scheduleType: number;
            dayScheduleEntries: Buffer;
        };
        cancelSchedule: {providerId: number; scheduleId: number; scheduleType: number};
        cancelAllSchedules: Record<string, never>;
    };
}

interface ErlMessaging {
    attributes: never;
    commands: {
        getLastMessage: Record<string, never>;
        messageConfirmation: {messageId: number; confirmationTime: number};
    };
    commandResponses: {
        displayMessage: {messageId: number; messageControl: number; startTime: number; durationInMinutes: number; message: string};
        cancelMessage: {messageId: number; messageControl: number};
    };
}

const dayColors = ["not_used", "blue", "white", "red"];
const peakPriorNotices = ["no_peak_planned", "peak_1_notice", "peak_2_notice", "peak_3_notice"];
const onPeakStates = ["off_peak", "peak_1_in_progress", "peak_2_in_progress", "peak_3_in_progress"];
const scheduleTimeReferences = ["utc_time", "standard_time", "local_time"];
const scheduleTypes: {[key: number]: string} = {0: "linky_tariff_calendar", 255: "unspecified"};
const profileStatuses = [
    "success",
    "undefined_interval_channel_requested",
    "interval_channel_not_supported",
    "invalid_end_time",
    "no_intervals_available",
];
// Value 8 (1 minute) extends the historical ZCL enumeration, which stopped at 7
const profileIntervalPeriods = [
    "daily",
    "60_minutes",
    "30_minutes",
    "15_minutes",
    "10_minutes",
    "7_5_minutes",
    "5_minutes",
    "2_5_minutes",
    "1_minute",
];
const snapshotPayloadTypes: {[key: number]: string} = {
    0: "tou_registers_delivered_with_billing",
    1: "tou_registers_received_with_billing",
    2: "block_tier_registers_delivered_with_billing",
    3: "block_tier_registers_received_with_billing",
    4: "tou_registers_delivered_no_billing",
    5: "tou_registers_received_no_billing",
    6: "block_tier_registers_delivered_no_billing",
    7: "block_tier_registers_received_no_billing",
    128: "data_unavailable",
};
const snapshotCauses = [
    "general",
    "end_of_billing_period",
    "end_of_block_period",
    "change_of_tariff_information",
    "change_of_price_matrix",
    "change_of_block_thresholds",
    "change_of_calorific_value",
    "change_of_conversion_factor",
    "change_of_calendar",
    "critical_peak_pricing",
    "manually_triggered_from_client",
    "end_of_resolve_period",
    "change_of_tenancy",
    "change_of_supplier",
    "change_of_meter_mode",
    "debt_payment",
    "scheduled_snapshot",
    "ota_firmware_download",
];
// Scheduled snapshot is bit 16, older firmwares numbered the ranks instead and report 16
const SCHEDULED_SNAPSHOT = 0x00010000;
const PROVIDER_ID = 0x00000000;

// The meter answers asynchronously and never sends a default response
const ASYNC_COMMAND = {disableResponse: true, disableDefaultResponse: true} as const;
const asObject = (value: unknown): {[key: string]: number | undefined} =>
    typeof value === "object" && value !== null ? (value as {[key: string]: number | undefined}) : {};

const toJson = (value: unknown): string => JSON.stringify(value, (_key, val) => (typeof val === "bigint" ? val.toString() : val));
const nowAsZclUtc = () => Math.round((Date.now() - OneJanuary2000) / 1000);

// NaN has to be rejected explicitly: it passes every comparison, and JSON.stringify renders it as null
const zclUtcToText = (seconds: number | undefined): string => {
    const value = Number(seconds);
    if (seconds === undefined || seconds === null || !Number.isFinite(value) || value === 0 || value === 0xffffffff) return "not_set";
    const date = new Date(OneJanuary2000 + value * 1000);
    const pad = (part: number) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const snapshotCauseToText = (cause: number | undefined): string | undefined => {
    if (cause === undefined || cause === null) return undefined;
    const value = Number(cause);
    if (!Number.isFinite(value)) return undefined;
    if (value < snapshotCauses.length) return snapshotCauses[value];
    const causes = Array.from({length: 32}, (_, bit) => ((value >>> bit) & 1 ? (snapshotCauses[bit] ?? `bit_${bit}`) : undefined)).filter(Boolean);
    return causes.length > 0 ? causes.join(", ") : `unknown_${value}`;
};

// 0xFFFFFFFFFFFF means not available
const readSummation = (buffer: Buffer, offset: number): number | null => {
    const value = buffer.readUIntLE(offset, 6);
    return value === 0xffffffffffff ? null : value;
};

// Types 0 and 1 insert the billed amounts between the register and the tier count
const parseSnapshotSubPayload = (payloadType: number, buffer: Buffer | undefined): KeyValue | undefined => {
    if (payloadType === 128) return {available: false};
    if (!buffer || buffer.length === 0) return undefined;
    const withBilling = payloadType === 0 || payloadType === 1;
    if (!withBilling && payloadType !== 4 && payloadType !== 5) return undefined;
    if (buffer.length < (withBilling ? 24 : 7)) return undefined;
    const result: KeyValue = {current_summation: readSummation(buffer, 0)};
    let offset = 6;
    if (withBilling) {
        result.bill_to_date = buffer.readUInt32LE(offset);
        result.bill_to_date_time_text = zclUtcToText(buffer.readUInt32LE(offset + 4));
        result.projected_bill = buffer.readUInt32LE(offset + 8);
        result.projected_bill_time_text = zclUtcToText(buffer.readUInt32LE(offset + 12));
        result.bill_trailing_digit = buffer.readUInt8(offset + 16) >> 4;
        offset += 17;
    }
    const tiers = buffer.readUInt8(offset);
    offset += 1;
    result.number_of_tiers_in_use = tiers;
    result.tier_summation = Array.from({length: tiers}, (_, i) =>
        offset + i * 6 + 6 <= buffer.length ? readSummation(buffer, offset + i * 6) : null,
    );
    return result;
};

// Each entry is 4 bytes: start time on 16 bits, tariff register on 8 bits, switch states on 8 bits
const parseDayScheduleEntries = (buffer: Buffer | undefined): KeyValue[] => {
    const entries: KeyValue[] = [];
    if (!buffer) return entries;
    for (let offset = 0; offset + 4 <= buffer.length; offset += 4) {
        const minutes = buffer.readUInt16LE(offset);
        const switchState = buffer.readUInt8(offset + 3);
        entries.push({
            start_time: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
            register_tier: buffer.readUInt8(offset + 2),
            auxiliary_load_switch_state: switchState,
            auxiliary_switches: Array.from({length: 8}, (_, i) => ((switchState >> i) & 1) === 1),
        });
    }
    return entries;
};

// A day profile and a snapshot may both be split over several commands
const dayProfileFragments = new Map<string, Map<number, KeyValue[]>>();
const snapshotFragments = new Map<string, Map<number, Buffer>>();
const snapshotAggregates = new Map<string, KeyValue>();

const numeric = (name: string, cluster: string, attribute: string, description: string, unit?: string) =>
    m.numeric({name, cluster, attribute: attribute as never, description, unit, access: "STATE_GET", reporting: false});

// Octet strings are padded with null bytes or spaces
const text = (name: string, cluster: string, attribute: string, description: string): ModernExtend => ({
    ...m.text({name, cluster, attribute: attribute as never, description, access: "STATE_GET"}),
    fromZigbee: [
        {
            cluster,
            type: ["attributeReport", "readResponse"],
            convert: (model, msg) => {
                const value = (msg.data as KeyValue)[attribute];
                if (value !== undefined) return {[name]: String(value).replaceAll("\0", "").trimEnd()};
            },
        } satisfies Fz.Converter<string, undefined, ["attributeReport", "readResponse"]>,
    ],
});

// ZCL timestamps count from 1 January 2000, so a readable form is published next to the raw value
const timestamp = (name: string, cluster: string, attribute: string, description: string): ModernExtend => ({
    ...m.numeric({name, cluster, attribute: attribute as never, description, access: "STATE_GET", reporting: false}),
    exposes: [
        e.numeric(name, ea.STATE_GET).withUnit("s").withDescription(description),
        e.text(`${name}_text`, ea.STATE).withDescription(`${description}, as Y-M-D HH:MM:SS`),
    ],
    fromZigbee: [
        {
            cluster,
            type: ["attributeReport", "readResponse"],
            convert: (model, msg) => {
                const value = (msg.data as KeyValue)[attribute] as number | undefined;
                if (value !== undefined) return {[name]: value, [`${name}_text`]: zclUtcToText(value)};
            },
        } satisfies Fz.Converter<string, undefined, ["attributeReport", "readResponse"]>,
    ],
});

const edflabExtend = {
    addCustomClusters: (): ModernExtend[] => [
        m.deviceAddCustomCluster("seMetering", {
            ID: 0x0702,
            name: "seMetering",
            attributes: {
                numberOfTiersInUse: {ID: 0x0023, name: "numberOfTiersInUse", type: DataType.UINT8},
                linkyModeOfOperation: {ID: 0x0209, name: "linkyModeOfOperation", type: DataType.ENUM8},
                currentDayMaxDemandDelivered: {ID: 0x045d, name: "currentDayMaxDemandDelivered", type: DataType.UINT48},
                currentDayMaxDemandReceived: {ID: 0x045f, name: "currentDayMaxDemandReceived", type: DataType.UINT48},
                previousDayMaxDemandDelivered: {ID: 0x0461, name: "previousDayMaxDemandDelivered", type: DataType.UINT48},
                previousDayMaxDemandReceived: {ID: 0x0463, name: "previousDayMaxDemandReceived", type: DataType.UINT48},
                currentReactiveSummationQ1: {ID: 0x0d05, name: "currentReactiveSummationQ1", type: DataType.UINT48},
                currentReactiveSummationQ2: {ID: 0x0d06, name: "currentReactiveSummationQ2", type: DataType.UINT48},
                currentReactiveSummationQ3: {ID: 0x0d07, name: "currentReactiveSummationQ3", type: DataType.UINT48},
                currentReactiveSummationQ4: {ID: 0x0d08, name: "currentReactiveSummationQ4", type: DataType.UINT48},
                serviceDisconnectReason: {ID: 0x0208, name: "serviceDisconnectReason", type: DataType.ENUM8},
                currentDayMaxDemandDeliveredTime: {ID: 0x045e, name: "currentDayMaxDemandDeliveredTime", type: DataType.UTC},
                currentDayMaxDemandReceivedTime: {ID: 0x0460, name: "currentDayMaxDemandReceivedTime", type: DataType.UTC},
                previousDayMaxDemandDeliveredTime: {ID: 0x0462, name: "previousDayMaxDemandDeliveredTime", type: DataType.UTC},
                previousDayMaxDemandReceivedTime: {ID: 0x0464, name: "previousDayMaxDemandReceivedTime", type: DataType.UTC},
            },
            commands: {},
            // zigbee-herdsman stops at payloadType, the sub-payload after it is a TODO in its definition
            commandsResponse: {
                publishSnapshot: {
                    ID: 0x06,
                    name: "publishSnapshot",
                    parameters: [
                        {name: "id", type: DataType.UINT32},
                        {name: "time", type: DataType.UTC},
                        {name: "totalSnapshotsFound", type: DataType.UINT8},
                        {name: "commandIndex", type: DataType.UINT8},
                        {name: "totalNumberOfCommands", type: DataType.UINT8},
                        {name: "cause", type: DataType.BITMAP32},
                        {name: "payloadType", type: DataType.ENUM8},
                        {name: "subPayload", type: Zcl.BuffaloZclDataType.BUFFER},
                    ],
                },
            },
        }),
        m.deviceAddCustomCluster("dailySchedule", {
            ID: 0x070d,
            name: "dailySchedule",
            attributes: {
                ...Object.fromEntries(
                    Array.from(
                        {length: 8},
                        (_, i) => [`auxSwitch${i + 1}Label`, {ID: i, name: `auxSwitch${i + 1}Label`, type: DataType.OCTET_STR, write: true}] as const,
                    ),
                ),
                currentAuxiliaryLoadSwitchState: {ID: 0x0100, name: "currentAuxiliaryLoadSwitchState", type: DataType.BITMAP8},
                currentDeliveredTier: {ID: 0x0101, name: "currentDeliveredTier", type: DataType.ENUM8},
                currentTierLabel: {ID: 0x0102, name: "currentTierLabel", type: DataType.OCTET_STR},
                linkyPeakPeriodStatus: {ID: 0x0103, name: "linkyPeakPeriodStatus", type: DataType.BITMAP8},
                peakStartTime: {ID: 0x0104, name: "peakStartTime", type: DataType.UTC},
                peakEndTime: {ID: 0x0105, name: "peakEndTime", type: DataType.UTC},
                currentTariffLabel: {ID: 0x0106, name: "currentTariffLabel", type: DataType.OCTET_STR},
            },
            commands: {
                getSchedule: {
                    ID: 0x00,
                    name: "getSchedule",
                    parameters: [
                        {name: "providerId", type: DataType.UINT32},
                        {name: "earliestStartTime", type: DataType.UTC},
                        {name: "minIssuerEventId", type: DataType.UINT32},
                        {name: "numberOfSchedules", type: DataType.UINT8},
                        {name: "scheduleType", type: DataType.ENUM8},
                    ],
                },
                getDayProfile: {
                    ID: 0x01,
                    name: "getDayProfile",
                    parameters: [
                        {name: "providerId", type: DataType.UINT32},
                        {name: "dayId", type: DataType.UINT16},
                    ],
                },
                getScheduleCancellation: {ID: 0x05, name: "getScheduleCancellation", parameters: []},
            },
            commandsResponse: {
                publishSchedule: {
                    ID: 0x00,
                    name: "publishSchedule",
                    parameters: [
                        {name: "providerId", type: DataType.UINT32},
                        {name: "issuerEventId", type: DataType.UINT32},
                        {name: "scheduleId", type: DataType.UINT32},
                        {name: "dayId", type: DataType.UINT16},
                        {name: "startTime", type: DataType.UTC},
                        {name: "scheduleType", type: DataType.ENUM8},
                        {name: "scheduleTimeReference", type: DataType.UINT8},
                        {name: "scheduleName", type: DataType.OCTET_STR},
                    ],
                },
                publishDayProfile: {
                    ID: 0x01,
                    name: "publishDayProfile",
                    parameters: [
                        {name: "providerId", type: DataType.UINT32},
                        {name: "issuerEventId", type: DataType.UINT32},
                        {name: "dayId", type: DataType.UINT16},
                        {name: "totalNumberOfScheduleEntries", type: DataType.UINT8},
                        {name: "commandIndex", type: DataType.UINT8},
                        {name: "totalNumberOfCommands", type: DataType.UINT8},
                        {name: "scheduleType", type: DataType.ENUM8},
                        {name: "dayScheduleEntries", type: Zcl.BuffaloZclDataType.BUFFER},
                    ],
                },
                cancelSchedule: {
                    ID: 0x05,
                    name: "cancelSchedule",
                    parameters: [
                        {name: "providerId", type: DataType.UINT32},
                        {name: "scheduleId", type: DataType.UINT32},
                        {name: "scheduleType", type: DataType.ENUM8},
                    ],
                },
                cancelAllSchedules: {ID: 0x06, name: "cancelAllSchedules", parameters: []},
            },
        }),
        // Cluster 0x0703 is commented out in zigbee-herdsman, so it has to be declared entirely
        m.deviceAddCustomCluster("seMessaging", {
            ID: 0x0703,
            name: "seMessaging",
            attributes: {},
            commands: {
                getLastMessage: {ID: 0x00, name: "getLastMessage", parameters: []},
                messageConfirmation: {
                    ID: 0x01,
                    name: "messageConfirmation",
                    parameters: [
                        {name: "messageId", type: DataType.UINT32},
                        {name: "confirmationTime", type: DataType.UTC},
                    ],
                },
            },
            commandsResponse: {
                displayMessage: {
                    ID: 0x00,
                    name: "displayMessage",
                    parameters: [
                        {name: "messageId", type: DataType.UINT32},
                        {name: "messageControl", type: DataType.BITMAP8},
                        {name: "startTime", type: DataType.UTC},
                        {name: "durationInMinutes", type: DataType.UINT16},
                        {name: "message", type: DataType.OCTET_STR},
                    ],
                },
                cancelMessage: {
                    ID: 0x01,
                    name: "cancelMessage",
                    parameters: [
                        {name: "messageId", type: DataType.UINT32},
                        {name: "messageControl", type: DataType.BITMAP8},
                    ],
                },
            },
        }),
    ],
    peakPeriodStatus: (): ModernExtend => ({
        exposes: [
            e.text("current_day_color", ea.STATE).withDescription("Tempo colour of the current day"),
            e.text("next_day_color", ea.STATE).withDescription("Tempo colour of the next day"),
            e.text("peak_period_prior_notice", ea.STATE).withDescription("Mobile peak prior notice"),
            e.text("on_peak", ea.STATE).withDescription("Mobile peak in progress"),
        ],
        fromZigbee: [
            {
                cluster: "dailySchedule",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg) => {
                    const status = msg.data.linkyPeakPeriodStatus;
                    if (status !== undefined)
                        return {
                            current_day_color: dayColors[status & 0b11],
                            next_day_color: dayColors[(status >> 2) & 0b11],
                            peak_period_prior_notice: peakPriorNotices[(status >> 4) & 0b11],
                            on_peak: onPeakStates[(status >> 6) & 0b11],
                        };
                },
            } satisfies Fz.Converter<"dailySchedule", ErlDailySchedule, ["attributeReport", "readResponse"]>,
        ],
        isModernExtend: true,
    }),
    // The meter answers asynchronously and never sends a default response, so both waits must be disabled:
    // zigbee-herdsman would otherwise fail the command after ten seconds even though the answer arrived.
    commands: (): ModernExtend => ({
        exposes: [
            e
                .composite("get_profile", "get_profile", ea.SET)
                .withDescription("Requests the load curve. The answer is published in profile_data.")
                .withFeature(e.numeric("interval_channel", ea.SET).withDescription("0 is delivered, 1 is received"))
                .withFeature(e.numeric("end_time", ea.SET).withDescription("End timestamp, in seconds since 1 January 2000"))
                .withFeature(e.numeric("number_of_periods", ea.SET).withDescription("Number of periods requested")),
            e
                .composite("get_snapshot", "get_snapshot", ea.SET)
                .withDescription("Requests a billing snapshot. The answer is published in snapshot_data.")
                .withFeature(e.numeric("earliest_start_time", ea.SET).withDescription("Earliest timestamp, in seconds since 1 January 2000"))
                .withFeature(e.numeric("latest_end_time", ea.SET).withDescription("Latest timestamp, in seconds since 1 January 2000"))
                .withFeature(e.numeric("offset", ea.SET).withDescription("Rank of the wanted snapshot, 0 is the most recent"))
                .withFeature(e.numeric("cause", ea.SET).withDescription("Cause bitmap, 65536 is a scheduled snapshot, 4294967295 requests them all")),
            e
                .composite("get_sampled_data", "get_sampled_data", ea.SET)
                .withDescription("Requests measurement samples. The answer is published in sampled_data.")
                .withFeature(e.numeric("sample_id", ea.SET).withDescription("Identifier of the sample set"))
                .withFeature(e.numeric("earliest_sample_time", ea.SET).withDescription("Earliest timestamp, in seconds since 1 January 2000"))
                .withFeature(e.numeric("type", ea.SET).withDescription("Sample type, 4 is instantaneous demand"))
                // 23 samples no longer fit in a single APS frame
                .withFeature(e.numeric("number_of_samples", ea.SET).withDescription("Number of samples requested, 22 at most")),
            e
                .composite("get_schedule", "get_schedule", ea.SET)
                .withDescription("Requests the tariff calendar. The answer is published in schedule_data.")
                .withFeature(e.numeric("earliest_start_time", ea.SET).withDescription("Earliest timestamp, in seconds since 1 January 2000"))
                .withFeature(e.numeric("min_issuer_event_id", ea.SET).withDescription("Minimum issuer event identifier"))
                // The ERL rejects 0, which the specification defines as "all schedules"
                .withFeature(e.numeric("number_of_schedules", ea.SET).withDescription("1 is the current calendar, 2 the current and the next one"))
                .withFeature(e.numeric("schedule_type", ea.SET).withDescription("0 is the Linky tariff calendar")),
            e
                .composite("get_day_profile", "get_day_profile", ea.SET)
                .withDescription("Requests the profile of one day. The answer is published in day_profile_data.")
                .withFeature(e.numeric("day_id", ea.SET).withDescription("Day identifier, obtained through get_schedule")),
            e.enum("get_schedule_cancellation", ea.SET, ["send"]).withDescription("Requests the last schedule cancellation"),
            e.enum("get_last_message", ea.SET, ["send"]).withDescription("Requests the last message broadcast by the distributor"),
            e
                .composite("confirm_message", "confirm_message", ea.SET)
                .withDescription("Acknowledges a displayed message")
                .withFeature(e.numeric("message_id", ea.SET).withDescription("Identifier of the message to confirm"))
                .withFeature(e.numeric("confirmation_time", ea.SET).withDescription("Confirmation timestamp, in seconds since 1 January 2000")),
            e.text("profile_data", ea.STATE).withDescription("Last answer to get_profile"),
            e.text("snapshot_data", ea.STATE).withDescription("Last snapshot received"),
            e.text("sampled_data", ea.STATE).withDescription("Last samples received"),
            e.text("schedule_data", ea.STATE).withDescription("Last tariff calendar received"),
            e.text("day_profile_data", ea.STATE).withDescription("Last day profile received"),
            e.text("schedule_cancellation", ea.STATE).withDescription("Last schedule cancellation received"),
            e.text("message_data", ea.STATE).withDescription("Last message received from the distributor"),
        ],
        fromZigbee: [
            {
                cluster: "seMetering",
                type: ["commandGetProfileRsp"],
                convert: (model, msg) => ({
                    profile_data: toJson({
                        end_time_text: zclUtcToText(msg.data.endTime),
                        status: profileStatuses[msg.data.status] ?? `unknown_${msg.data.status}`,
                        interval_period: profileIntervalPeriods[msg.data.profileIntervalPeriod] ?? `unknown_${msg.data.profileIntervalPeriod}`,
                        number_of_periods_delivered: msg.data.numberOfPeriodsDelivered,
                        intervals: msg.data.intervals,
                    }),
                }),
            } satisfies Fz.Converter<"seMetering", undefined, ["commandGetProfileRsp"]>,
            {
                cluster: "seMetering",
                type: ["commandGetSampledDataRsp"],
                convert: (model, msg) => ({
                    sampled_data: toJson({
                        id: msg.data.id,
                        start_time_text: zclUtcToText(msg.data.startTime),
                        type: msg.data.type,
                        request_interval: msg.data.requestInterval,
                        number_of_samples: msg.data.numberOfSamples,
                        samples: msg.data.samples,
                    }),
                }),
            } satisfies Fz.Converter<"seMetering", undefined, ["commandGetSampledDataRsp"]>,
            // One snapshot comes as one command per direction, the delivered one being split in up to
            // three fragments. A split may fall inside a 48 bit register, so fragments are reassembled
            // before decoding. The identifier does not tell snapshots apart on older firmwares, so a
            // direction filled twice means a new snapshot.
            {
                cluster: "seMetering",
                type: ["commandPublishSnapshot"],
                convert: (model, msg) => {
                    const device = msg.device.ieeeAddr;
                    const expected = msg.data.totalNumberOfCommands ?? 1;
                    const key = `${device}|${msg.data.id}|${msg.data.payloadType}`;
                    const fragments = snapshotFragments.get(key) ?? new Map<number, Buffer>();
                    const fragment = (msg.data as KeyValue).subPayload as Buffer | undefined;
                    fragments.set(msg.data.commandIndex ?? 0, fragment ? Buffer.from(fragment) : Buffer.alloc(0));
                    snapshotFragments.set(key, fragments);
                    if (fragments.size < expected) return;
                    snapshotFragments.delete(key);
                    const subPayload = Buffer.concat([...fragments.keys()].sort((a, b) => a - b).map((i) => fragments.get(i) as Buffer));

                    const section = msg.data.payloadType === 128 ? "unavailable" : msg.data.payloadType % 2 === 0 ? "delivered" : "received";
                    const previous = snapshotAggregates.get(device);
                    const continues = previous !== undefined && previous.id === msg.data.id && previous[section] === undefined;
                    const snapshot: KeyValue = continues
                        ? previous
                        : {
                              id: msg.data.id,
                              time_text: zclUtcToText(msg.data.time),
                              total_snapshots_found: msg.data.totalSnapshotsFound,
                              cause: snapshotCauseToText(msg.data.cause),
                          };
                    if (!continues) {
                        for (const orphan of snapshotFragments.keys()) {
                            if (orphan.startsWith(`${device}|`)) snapshotFragments.delete(orphan);
                        }
                    }
                    snapshot[section] = {
                        payload_type: snapshotPayloadTypes[msg.data.payloadType] ?? `unknown_${msg.data.payloadType}`,
                        fragments: expected,
                        ...(parseSnapshotSubPayload(msg.data.payloadType, subPayload) ?? {}),
                        sub_payload_hex: subPayload.length > 0 ? subPayload.toString("hex") : undefined,
                    };
                    snapshotAggregates.set(device, snapshot);
                    return {snapshot_data: toJson(snapshot)};
                },
            } satisfies Fz.Converter<"seMetering", undefined, ["commandPublishSnapshot"]>,
            {
                cluster: "dailySchedule",
                type: ["commandPublishSchedule"],
                convert: (model, msg) => ({
                    schedule_data: toJson({
                        issuer_event_id: msg.data.issuerEventId,
                        schedule_id: msg.data.scheduleId,
                        day_id: msg.data.dayId,
                        start_time_text: zclUtcToText(msg.data.startTime),
                        schedule_type: scheduleTypes[msg.data.scheduleType] ?? `unknown_${msg.data.scheduleType}`,
                        schedule_time_reference:
                            scheduleTimeReferences[msg.data.scheduleTimeReference] ?? `unknown_${msg.data.scheduleTimeReference}`,
                        schedule_name: String(msg.data.scheduleName),
                    }),
                }),
            } satisfies Fz.Converter<"dailySchedule", ErlDailySchedule, ["commandPublishSchedule"]>,
            {
                cluster: "dailySchedule",
                type: ["commandPublishDayProfile"],
                convert: (model, msg) => {
                    const key = `${msg.device.ieeeAddr}|${msg.data.dayId}|${msg.data.issuerEventId}`;
                    const fragments = dayProfileFragments.get(key) ?? new Map<number, KeyValue[]>();
                    fragments.set(msg.data.commandIndex, parseDayScheduleEntries(msg.data.dayScheduleEntries));
                    dayProfileFragments.set(key, fragments);
                    if (fragments.size < msg.data.totalNumberOfCommands) return;
                    dayProfileFragments.delete(key);
                    return {
                        day_profile_data: toJson({
                            issuer_event_id: msg.data.issuerEventId,
                            day_id: msg.data.dayId,
                            schedule_type: scheduleTypes[msg.data.scheduleType] ?? `unknown_${msg.data.scheduleType}`,
                            total_number_of_schedule_entries: msg.data.totalNumberOfScheduleEntries,
                            entries: [...fragments.keys()].sort((a, b) => a - b).flatMap((i) => fragments.get(i) as KeyValue[]),
                        }),
                    };
                },
            } satisfies Fz.Converter<"dailySchedule", ErlDailySchedule, ["commandPublishDayProfile"]>,
            {
                cluster: "dailySchedule",
                type: ["commandCancelSchedule"],
                convert: (model, msg) => ({
                    schedule_cancellation: toJson({
                        schedule_id: msg.data.scheduleId,
                        schedule_type: scheduleTypes[msg.data.scheduleType] ?? `unknown_${msg.data.scheduleType}`,
                    }),
                }),
            } satisfies Fz.Converter<"dailySchedule", ErlDailySchedule, ["commandCancelSchedule"]>,
            {
                cluster: "dailySchedule",
                type: ["commandCancelAllSchedules"],
                convert: () => ({schedule_cancellation: toJson({cancelled: "all_schedules"})}),
            } satisfies Fz.Converter<"dailySchedule", ErlDailySchedule, ["commandCancelAllSchedules"]>,
            {
                cluster: "seMessaging",
                type: ["commandDisplayMessage"],
                convert: (model, msg) => ({
                    message_data: toJson({
                        message_id: msg.data.messageId,
                        message_control: msg.data.messageControl,
                        start_time_text: zclUtcToText(msg.data.startTime),
                        // null is the invalid 16-bit value, meaning an unbounded display duration
                        duration_in_minutes: msg.data.durationInMinutes ?? "unlimited",
                        message: String(msg.data.message).replaceAll("\0", "").trimEnd(),
                    }),
                }),
            } satisfies Fz.Converter<"seMessaging", ErlMessaging, ["commandDisplayMessage"]>,
            {
                cluster: "seMessaging",
                type: ["commandCancelMessage"],
                convert: (model, msg) => ({
                    message_data: toJson({message_id: msg.data.messageId, message_control: msg.data.messageControl, cancelled: true}),
                }),
            } satisfies Fz.Converter<"seMessaging", ErlMessaging, ["commandCancelMessage"]>,
        ],
        toZigbee: [
            {
                key: ["get_profile"],
                convertSet: async (entity, key, value) => {
                    const request = asObject(value);
                    await entity.command(
                        "seMetering",
                        "getProfile",
                        {
                            intervalChannel: request.interval_channel ?? 0,
                            endTime: request.end_time ?? nowAsZclUtc(),
                            numberOfPeriods: request.number_of_periods ?? 1,
                        },
                        ASYNC_COMMAND,
                    );
                },
            } satisfies Tz.Converter,
            {
                key: ["get_snapshot"],
                convertSet: async (entity, key, value) => {
                    const request = asObject(value);
                    await entity.command(
                        "seMetering",
                        "getSnapshot",
                        {
                            earliestStartTime: request.earliest_start_time ?? 0,
                            latestEndTime: request.latest_end_time ?? nowAsZclUtc(),
                            offset: request.offset ?? 0,
                            cause: request.cause ?? SCHEDULED_SNAPSHOT,
                        },
                        ASYNC_COMMAND,
                    );
                },
            } satisfies Tz.Converter,
            {
                key: ["get_sampled_data"],
                convertSet: async (entity, key, value) => {
                    const request = asObject(value);
                    await entity.command(
                        "seMetering",
                        "getSampledData",
                        {
                            sampleId: request.sample_id ?? 0,
                            earliestSampleTime: request.earliest_sample_time ?? 0,
                            type: request.type ?? 4,
                            numberOfSamples: request.number_of_samples ?? 22,
                        },
                        ASYNC_COMMAND,
                    );
                },
            } satisfies Tz.Converter,
            {
                key: ["get_schedule"],
                convertSet: async (entity, key, value) => {
                    const request = asObject(value);
                    await entity.command<"dailySchedule", "getSchedule", ErlDailySchedule>(
                        "dailySchedule",
                        "getSchedule",
                        {
                            providerId: request.provider_id ?? PROVIDER_ID,
                            earliestStartTime: request.earliest_start_time ?? 0,
                            minIssuerEventId: request.min_issuer_event_id ?? 0xffffffff,
                            numberOfSchedules: request.number_of_schedules ?? 1,
                            scheduleType: request.schedule_type ?? 0,
                        },
                        ASYNC_COMMAND,
                    );
                },
            } satisfies Tz.Converter,
            {
                key: ["get_day_profile"],
                convertSet: async (entity, key, value) => {
                    const request = asObject(value);
                    await entity.command<"dailySchedule", "getDayProfile", ErlDailySchedule>(
                        "dailySchedule",
                        "getDayProfile",
                        {providerId: request.provider_id ?? PROVIDER_ID, dayId: request.day_id ?? 0},
                        ASYNC_COMMAND,
                    );
                },
            } satisfies Tz.Converter,
            {
                key: ["get_schedule_cancellation"],
                convertSet: async (entity) => {
                    await entity.command<"dailySchedule", "getScheduleCancellation", ErlDailySchedule>(
                        "dailySchedule",
                        "getScheduleCancellation",
                        {},
                        ASYNC_COMMAND,
                    );
                },
            } satisfies Tz.Converter,
            {
                key: ["get_last_message"],
                convertSet: async (entity) => {
                    await entity.command<"seMessaging", "getLastMessage", ErlMessaging>("seMessaging", "getLastMessage", {}, ASYNC_COMMAND);
                },
            } satisfies Tz.Converter,
            {
                key: ["confirm_message"],
                convertSet: async (entity, key, value) => {
                    const request = asObject(value);
                    await entity.command<"seMessaging", "messageConfirmation", ErlMessaging>(
                        "seMessaging",
                        "messageConfirmation",
                        {messageId: request.message_id ?? 0, confirmationTime: request.confirmation_time ?? nowAsZclUtc()},
                        ASYNC_COMMAND,
                    );
                },
            } satisfies Tz.Converter,
        ],
        isModernExtend: true,
    }),
    // A 64 bit bitmap is decoded as a BigInt, which JSON.stringify cannot serialise: publishing it
    // raw makes the whole device stop publishing, so it goes out as a hex string.
    extendedStatus: (): ModernExtend => ({
        exposes: [e.text("extended_status", ea.STATE_GET).withDescription("Extended meter status flags, as hexadecimal")],
        fromZigbee: [
            {
                cluster: "seMetering",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg) => {
                    const value = msg.data.extendedStatus;
                    if (value !== undefined) return {extended_status: `0x${BigInt(value).toString(16).padStart(16, "0")}`};
                },
            } satisfies Fz.Converter<"seMetering", undefined, ["attributeReport", "readResponse"]>,
        ],
        toZigbee: [
            {
                key: ["extended_status"],
                convertGet: async (entity) => {
                    await entity.read("seMetering", ["extendedStatus"]);
                },
            } satisfies Tz.Converter,
        ],
        isModernExtend: true,
    }),
    // The ERL expects UTC (writeTimeDaily writes local time) and stops answering when its time is not set.
    // Only needed in TIC historique mode (0), in TIC standard mode the meter maintains its own clock.
    writeTimeDailyUtc: (): ModernExtend =>
        m.poll({
            key: "time_sync",
            defaultIntervalSeconds: 60 * 60 * 24,
            option: e
                .numeric("time_sync_poll_interval", ea.SET)
                .withUnit("s")
                .withValueMin(0)
                .withDescription("Interval between two meter time synchronisations. 0 disables the synchronisation."),
            poll: async (device) => {
                const endpoint = device.getEndpoint(1);
                if (endpoint.getClusterAttributeValue("seMetering", "linkyModeOfOperation") !== 0) return;
                await endpoint.write("genTime", {time: Math.round((Date.now() - OneJanuary2000) / 1000)});
            },
        }),
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ZIGBEE_ERL"],
        model: "ZIGBEE_ERL",
        vendor: "EDFLab",
        description: "Linky meter TIC interface",
        extend: [
            ...edflabExtend.addCustomClusters(),
            m.onOff({powerOnBehavior: false}),
            m.identify(),
            // Meter identification
            text("pod", "seMeterIdentification", "pod", "Point of delivery identifier (PRM)"),
            text("company_name", "seMeterIdentification", "companyName", "Name of the energy supplier"),
            text("meter_serial_number", "seMetering", "meterSerialNumber", "Meter serial number"),
            text("site_id", "seMetering", "siteId", "Site identifier"),
            text("module_serial_number", "seMetering", "moduleSerialNumber", "Module serial number"),
            text("meter_model", "seMeterIdentification", "model", "Meter model"),
            numeric("meter_type_id", "seMeterIdentification", "meterTypeId", "Consumer or producer"),
            numeric("data_quality_id", "seMeterIdentification", "dataQualityId", "Quality of the transmitted data"),
            numeric("status", "seMetering", "status", "Meter status flags"),
            numeric("service_disconnect_reason", "seMetering", "serviceDisconnectReason", "Service disconnect reason"),
            numeric("measurement_type", "haElectricalMeasurement", "measurementType", "Single-phase or three-phase"),
            numeric("available_power", "seMeterIdentification", "availablePower", "Subscribed power", "VA"),
            numeric("power_threshold", "seMeterIdentification", "powerThreshold", "Cut-off power", "VA"),
            numeric("linky_mode_of_operation", "seMetering", "linkyModeOfOperation", "TIC mode: 0 is historique, 1 is standard"),
            // Tariff
            text("current_tariff_label", "dailySchedule", "currentTariffLabel", "Name of the tariff plan"),
            text("current_tier_label", "dailySchedule", "currentTierLabel", "Name of the tariff register in use"),
            numeric("current_delivered_tier", "dailySchedule", "currentDeliveredTier", "Tariff register currently in use"),
            numeric("active_register_tier_delivered", "seMetering", "activeRegisterTierDelivered", "Active delivered tariff register"),
            timestamp("peak_start_time", "dailySchedule", "peakStartTime", "Start of the mobile peak"),
            timestamp("peak_end_time", "dailySchedule", "peakEndTime", "End of the mobile peak"),
            numeric("number_of_tiers_in_use", "seMetering", "numberOfTiersInUse", "Number of tariff registers in use"),
            numeric("linky_peak_period_status", "dailySchedule", "linkyPeakPeriodStatus", "Tempo colour and mobile peak status"),
            edflabExtend.peakPeriodStatus(),
            numeric(
                "current_auxiliary_load_switch_state",
                "dailySchedule",
                "currentAuxiliaryLoadSwitchState",
                "State of the auxiliary load switches",
            ),
            ...Array.from({length: 8}, (_, i) =>
                text(`aux_switch${i + 1}_label`, "dailySchedule", `auxSwitch${i + 1}Label`, `Label of auxiliary load switch ${i + 1}`),
            ),
            // Energy
            numeric("current_summ_delivered", "seMetering", "currentSummDelivered", "Total delivered energy", "Wh"),
            numeric("current_summ_received", "seMetering", "currentSummReceived", "Total received energy", "Wh"),
            ...Array.from({length: 6}, (_, i) =>
                numeric(
                    `current_tier${i + 1}_summ_delivered`,
                    "seMetering",
                    `currentTier${i + 1}SummDelivered`,
                    `Delivered energy, register ${i + 1}`,
                    "Wh",
                ),
            ),
            ...Array.from({length: 4}, (_, i) =>
                numeric(
                    `current_reactive_summation_q${i + 1}`,
                    "seMetering",
                    `currentReactiveSummationQ${i + 1}`,
                    `Reactive energy, quadrant ${i + 1}`,
                    "varh",
                ),
            ),
            // Demand
            numeric("instantaneous_demand", "seMetering", "instantaneousDemand", "Instantaneous active power", "W"),
            numeric(
                "current_day_max_demand_delivered",
                "seMetering",
                "currentDayMaxDemandDelivered",
                "Maximum delivered power of the current day",
                "W",
            ),
            timestamp(
                "current_day_max_demand_delivered_time",
                "seMetering",
                "currentDayMaxDemandDeliveredTime",
                "Timestamp of the current day maximum delivered power",
            ),
            numeric("current_day_max_demand_received", "seMetering", "currentDayMaxDemandReceived", "Maximum received power of the current day", "W"),
            timestamp(
                "current_day_max_demand_received_time",
                "seMetering",
                "currentDayMaxDemandReceivedTime",
                "Timestamp of the current day maximum received power",
            ),
            numeric(
                "previous_day_max_demand_delivered",
                "seMetering",
                "previousDayMaxDemandDelivered",
                "Maximum delivered power of the previous day",
                "W",
            ),
            timestamp(
                "previous_day_max_demand_delivered_time",
                "seMetering",
                "previousDayMaxDemandDeliveredTime",
                "Timestamp of the previous day maximum delivered power",
            ),
            numeric(
                "previous_day_max_demand_received",
                "seMetering",
                "previousDayMaxDemandReceived",
                "Maximum received power of the previous day",
                "W",
            ),
            timestamp(
                "previous_day_max_demand_received_time",
                "seMetering",
                "previousDayMaxDemandReceivedTime",
                "Timestamp of the previous day maximum received power",
            ),
            // Electrical measurements
            numeric("total_active_power", "haElectricalMeasurement", "totalActivePower", "Total active power", "W"),
            numeric("total_apparent_power", "haElectricalMeasurement", "totalApparentPower", "Total apparent power", "VA"),
            ...(["", "PhB", "PhC"] as const).flatMap((phase, i) => {
                const suffix = phase ? `_ph_${phase.slice(-1).toLowerCase()}` : "";
                const label = `phase ${"ABC"[i]}`;
                return [
                    numeric(`active_power${suffix}`, "haElectricalMeasurement", `activePower${phase}`, `Active power, ${label}`, "W"),
                    numeric(`apparent_power${suffix}`, "haElectricalMeasurement", `apparentPower${phase}`, `Apparent power, ${label}`, "VA"),
                    numeric(`rms_current${suffix}`, "haElectricalMeasurement", `rmsCurrent${phase}`, `Current, ${label}`, "A"),
                    numeric(`rms_voltage${suffix}`, "haElectricalMeasurement", `rmsVoltage${phase}`, `Voltage, ${label}`, "V"),
                ];
            }),
            // Meter clock
            timestamp("time", "genTime", "time", "Meter time"),
            timestamp("standard_time", "genTime", "standardTime", "Standard time"),
            timestamp("local_time", "genTime", "localTime", "Local time of the meter"),
            timestamp("last_set_time", "genTime", "lastSetTime", "Last time the meter clock was set"),
            timestamp("valid_until_time", "genTime", "validUntilTime", "End of validity of the time"),
            timestamp("dst_start", "genTime", "dstStart", "Start of daylight saving time"),
            timestamp("dst_end", "genTime", "dstEnd", "End of daylight saving time"),
            numeric("time_status", "genTime", "timeStatus", "Time synchronisation flags"),
            numeric("time_zone", "genTime", "timeZone", "Time zone offset", "s"),
            numeric("dst_shift", "genTime", "dstShift", "Offset applied during daylight saving time", "s"),
            edflabExtend.writeTimeDailyUtc(),
            edflabExtend.extendedStatus(),
            edflabExtend.commands(),
        ],
    },
];
