import {Buffer} from "node:buffer";
import {Zcl} from "zigbee-herdsman";
import {DataType} from "zigbee-herdsman/dist/zspec/zcl";
import * as tz from "../converters/toZigbee";
import {OneJanuary2000} from "../lib/constants";
import * as exposes from "../lib/exposes";
import {logger} from "../lib/logger";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, KeyValue, ModernExtend, Tz} from "../lib/types";

/** EDFLab ZIGBEE_ERL - Zigbee interface for the TIC port of the French Linky meter.
 *
 * Specifications published by the Connectivity Standards Alliance:
 * - ERL interface device: https://csa-iot.org/wp-content/uploads/2025/06/17-05031-011-ERL_Interface_Device_Specification.pdf
 * - Linky Metering cluster: https://csa-iot.org/wp-content/uploads/2025/06/17-05019-012-Linky-Metering-Cluster.pdf
 * - DailySchedule cluster: https://csa-iot.org/wp-content/uploads/2025/06/17-05035-016-Daily_Schedule_Cluster.pdf
 */

const e = exposes.presets;
const ea = exposes.access;

const NS = "zhc:edflab";

/** The meter answers every command asynchronously and never sends a default response. Both waits must be
 * disabled, otherwise zigbee-herdsman times out after ten seconds even though the answer was received
 * and processed. */
const ASYNC_COMMAND = {disableResponse: true, disableDefaultResponse: true} as const;

/** Provider identifier used by the ERL. */
const ERL_PROVIDER_ID = 0x00000000;

/** 64-bit bitmaps are decoded as BigInt by zigbee-herdsman; publish them as a hex string to keep the
 * payload JSON-serialisable. */
const toHex64 = (value: unknown): string => {
    if (typeof value === "bigint" || typeof value === "number") return `0x${value.toString(16).padStart(16, "0")}`;
    if (Array.isArray(value)) return `0x${value.map((part) => Number(part).toString(16).padStart(8, "0")).join("")}`;
    return String(value);
};

/** BigInt-tolerant serialisation: Metering payloads carry 48-bit registers and 64-bit bitmaps. */
const toJson = (value: unknown): string => JSON.stringify(value, (_key, val) => (typeof val === "bigint" ? val.toString() : val));

/** Meter labels and identifiers are fixed-length octet strings padded with null bytes or spaces.
 * Published as is, the null bytes show up as replacement characters in user interfaces. */
const NUL_BYTE = String.fromCharCode(0);
const toText = (value: unknown): string => String(value).replaceAll(NUL_BYTE, "").trimEnd();

/** The ZCL UTCTime type counts seconds since 1 January 2000. */
const nowAsZclUtc = (): number => Math.round((Date.now() - OneJanuary2000) / 1000);

/** Renders a ZCL timestamp as Y-M-D HH:MM:SS in the coordinator time zone. The meter local time stays
 * available separately through the LocalTime attribute. 0x00000000 and 0xFFFFFFFF mean "not set".
 * A missing timestamp may also surface as NaN, which has to be rejected explicitly: it passes every
 * comparison and would render as "NaN-NaN-NaN NaN:NaN:NaN". The published JSON gives no hint of it,
 * since JSON.stringify renders NaN as null. */
const zclUtcToText = (seconds: number | undefined): string => {
    const value = Number(seconds);
    if (seconds === undefined || seconds === null || !Number.isFinite(value) || value === 0 || value === 0xffffffff) return "not set";
    const date = new Date(OneJanuary2000 + value * 1000);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

/** Start times of schedule entries are expressed in minutes since midnight. */
const minutesToClock = (minutes: number): string => `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/** Time reference of the schedule start times. */
const scheduleTimeReferences: {[key: number]: string} = {0: "UTC time", 1: "standard time", 2: "local time"};

/** Schedule type. Only the Linky tariff calendar is defined. */
const scheduleTypes: {[key: number]: string} = {0: "Linky tariff calendar", 255: "unspecified"};

/** Day colour, two bits each in LinkyPeakPeriodStatus. */
const linkyDayColors: {[key: number]: string} = {0: "not used", 1: "blue", 2: "white", 3: "red"};

/** Mobile peak prior notice, bits 4 and 5. */
const linkyPeakPriorNotices: {[key: number]: string} = {0: "no peak planned", 1: "peak 1 notice", 2: "peak 2 notice", 3: "peak 3 notice"};

/** Mobile peak in progress, bits 6 and 7. */
const linkyOnPeakStates: {[key: number]: string} = {0: "off peak", 1: "peak 1 in progress", 2: "peak 2 in progress", 3: "peak 3 in progress"};

/** Integration period returned by GetProfileResponse. Value 8 (1 minute) extends the historical ZCL
 * enumeration, which stopped at 7. */
const profileIntervalPeriods: {[key: number]: string} = {
    0: "daily",
    1: "60 minutes",
    2: "30 minutes",
    3: "15 minutes",
    4: "10 minutes",
    5: "7.5 minutes",
    6: "5 minutes",
    7: "2.5 minutes",
    8: "1 minute",
};

/** Status returned by GetProfileResponse. */
const profileStatuses: {[key: number]: string} = {
    0: "success",
    1: "undefined interval channel requested",
    2: "interval channel not supported",
    3: "invalid end time",
    4: "no intervals available",
};

/** Format of the PublishSnapshot sub-payload. "Delivered" is the energy drawn from the grid,
 * "Received" the energy fed back into it. */
const snapshotPayloadTypes: {[key: number]: string} = {
    0: "TOU registers delivered, with billing",
    1: "TOU registers received, with billing",
    2: "block tier registers delivered, with billing",
    3: "block tier registers received, with billing",
    4: "TOU registers delivered, no billing",
    5: "TOU registers received, no billing",
    6: "block tier registers delivered, no billing",
    7: "block tier registers received, no billing",
    128: "data unavailable",
};

/** Snapshot cause, a 32 bit bitmap: a scheduled snapshot is bit 16, that is 0x00010000. Some ERL
 * firmwares numbered the ranks instead and report 16 for that same cause, so both conventions are
 * accepted when reading the field. */
const snapshotCauses: {[key: number]: string} = {
    0: "general",
    1: "end of billing period",
    2: "end of block period",
    3: "change of tariff information",
    4: "change of price matrix",
    5: "change of block thresholds",
    6: "change of calorific value",
    7: "change of conversion factor",
    8: "change of calendar",
    9: "critical peak pricing",
    10: "manually triggered from client",
    11: "end of resolve period",
    12: "change of tenancy",
    13: "change of supplier",
    14: "change of meter mode",
    15: "debt payment",
    16: "scheduled snapshot",
    17: "OTA firmware download",
};

/** Being a bitmap, the field may be reported as a BigInt.
 * Past the last known rank the value can only be a bitmap, and its active bits are listed; below it,
 * the value is read as a rank. Both readings agree on the only cause the ERL produces, the scheduled
 * snapshot. */
const snapshotCauseToText = (cause: number | undefined): string | undefined => {
    if (cause === undefined || cause === null) return undefined;
    const value = Number(cause);
    if (!Number.isFinite(value)) return undefined;
    const lastRank = Math.max(...Object.keys(snapshotCauses).map(Number));
    if (value <= lastRank) return snapshotCauses[value] ?? `unknown (${value})`;
    const causes: string[] = [];
    for (let bit = 0; bit < 32; bit += 1) {
        if ((value >>> bit) & 1) causes.push(snapshotCauses[bit] ?? `bit ${bit}`);
    }
    return causes.length > 0 ? causes.join(", ") : `unknown (${value})`;
};

/** A snapshot is returned as several PublishSnapshot commands: one per energy direction, the delivered
 * one being further split into one to three fragments depending on how many registers the tariff plan
 * holds — four commands at most. Only the sub-payload is split, the leading fields being repeated
 * identically in every fragment. Since a split may fall in the middle of a 48 bit register, fragments
 * are reassembled before any decoding. */
const snapshotFragments = new Map<string, Map<number, Buffer>>();

/** The directions of a single snapshot arrive as separate commands: they are gathered under their
 * common identifier, and a new identifier starts a fresh aggregate. */
const snapshotAggregates = new Map<string, KeyValue>();

/** 48 bit register; 0xFFFFFFFFFFFF means not available. */
const readSummation = (buffer: Buffer, offset: number): number | null => {
    const value = buffer.readUIntLE(offset, 6);
    return value === 0xffffffffffff ? null : value;
};

/** PublishSnapshot sub-payload. The eight types all start with the current 48 bit register; the billing
 * variants (0 and 1) then carry the billed amounts; the number of tiers in use follows, and as many 48
 * bit registers. The block tier types (2, 3, 6 and 7) append a second series indexed by block that the
 * Linky does not use: those are left as raw hexadecimal. */
const parseSnapshotSubPayload = (payloadType: number, buffer: Buffer | undefined): KeyValue | undefined => {
    /* Type 128 states that no data is available: the sub-payload is empty. */
    if (payloadType === 128) return {available: false};
    if (!buffer || buffer.length === 0) return undefined;
    const withBilling = payloadType === 0 || payloadType === 1;
    if (!withBilling && payloadType !== 4 && payloadType !== 5) return undefined;
    /* 6 bytes of register plus 1 byte of tier count, and 17 more bytes when billing is included. */
    if (buffer.length < (withBilling ? 24 : 7)) return undefined;
    /* The energy direction is not repeated here: it is carried by the snapshot section this
       sub-payload is filed under. */
    const result: KeyValue = {};
    let offset = 0;
    result.current_summation = readSummation(buffer, offset);
    offset += 6;
    if (withBilling) {
        result.bill_to_date = buffer.readUInt32LE(offset);
        offset += 4;
        result.bill_to_date_time = buffer.readUInt32LE(offset);
        result.bill_to_date_time_text = zclUtcToText(buffer.readUInt32LE(offset));
        offset += 4;
        result.projected_bill = buffer.readUInt32LE(offset);
        offset += 4;
        result.projected_bill_time = buffer.readUInt32LE(offset);
        result.projected_bill_time_text = zclUtcToText(buffer.readUInt32LE(offset));
        offset += 4;
        /* Most significant nibble: number of decimals of both amounts above. */
        result.bill_trailing_digit = buffer.readUInt8(offset) >> 4;
        offset += 1;
    }
    const tiers = buffer.readUInt8(offset);
    offset += 1;
    result.number_of_tiers_in_use = tiers;
    const tierSummation: (number | null)[] = [];
    for (let tier = 0; tier < tiers && offset + 6 <= buffer.length; tier += 1) {
        tierSummation.push(readSummation(buffer, offset));
        offset += 6;
    }
    result.tier_summation = tierSummation;
    return result;
};

/** Each Linky profile entry is 4 bytes: start time on 16 bits, tariff register on 8 bits, state of the
 * 8 auxiliary load switches on 8 bits. */
/* The keys below are the published JSON contract, hence snake_case: they are typed as KeyValue
   rather than through a dedicated interface. */
const parseDayScheduleEntries = (buffer: Buffer | undefined): KeyValue[] => {
    const entries: KeyValue[] = [];
    if (!buffer) return entries;
    for (let offset = 0; offset + 4 <= buffer.length; offset += 4) {
        const switchState = buffer.readUInt8(offset + 3);
        entries.push({
            start_time: minutesToClock(buffer.readUInt16LE(offset)),
            register_tier: buffer.readUInt8(offset + 2),
            auxiliary_load_switch_state: switchState,
            /* Bit 0 is auxiliary switch 1, bit 7 is auxiliary switch 8. */
            auxiliary_switches: Array.from({length: 8}, (_unused, index) => ((switchState >> index) & 1) === 1),
        });
    }
    return entries;
};

/** A day profile may be split over several commands: fragments are accumulated until the last one. */
const dayProfileFragments = new Map<string, Map<number, ReturnType<typeof parseDayScheduleEntries>>>();

/** Metering attributes added on top of the standard cluster. */
interface ErlMetering {
    attributes: {
        numberOfTiersInUse: number;
        serviceDisconnectReason: number;
        linkyModeOfOperation: number;
        currentDayMaxDemandDelivered: number | bigint;
        currentDayMaxDemandDeliveredTime: number;
        currentDayMaxDemandReceived: number | bigint;
        currentDayMaxDemandReceivedTime: number;
        previousDayMaxDemandDelivered: number | bigint;
        previousDayMaxDemandDeliveredTime: number;
        previousDayMaxDemandReceived: number | bigint;
        previousDayMaxDemandReceivedTime: number;
        currentReactiveSummationQ1: number | bigint;
        currentReactiveSummationQ2: number | bigint;
        currentReactiveSummationQ3: number | bigint;
        currentReactiveSummationQ4: number | bigint;
    };
    commands: never;
    commandResponses: never;
}

/** The Messaging cluster carries no attribute, only commands. */
interface ErlMessaging {
    attributes: never;
    commands: {
        getLastMessage: Record<string, never>;
        messageConfirmation: {messageId: number; confirmationTime: number};
    };
    commandResponses: {
        displayMessage: {messageId: number; messageControl: number; startTime: number; durationInMinutes: number | null; message: string};
        cancelMessage: {messageId: number; messageControl: number};
    };
}

/** The proprietary DailySchedule cluster. */
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

const edflabModernExtend = {
    /** Metering attributes described by the device specification but missing from zigbee-herdsman: the
     * number of tariff registers in use, the daily maximum demands, and the per-quadrant reactive energy
     * registers required by the PICS. */
    addMeteringAttributes: (): ModernExtend =>
        m.deviceAddCustomCluster("seMetering", {
            ID: 0x0702,
            name: "seMetering",
            attributes: {
                numberOfTiersInUse: {ID: 0x0023, name: "numberOfTiersInUse", type: DataType.UINT8},
                serviceDisconnectReason: {ID: 0x0208, name: "serviceDisconnectReason", type: DataType.ENUM8},
                linkyModeOfOperation: {ID: 0x0209, name: "linkyModeOfOperation", type: DataType.ENUM8},
                currentDayMaxDemandDelivered: {ID: 0x045d, name: "currentDayMaxDemandDelivered", type: DataType.UINT48},
                currentDayMaxDemandDeliveredTime: {ID: 0x045e, name: "currentDayMaxDemandDeliveredTime", type: DataType.UTC},
                currentDayMaxDemandReceived: {ID: 0x045f, name: "currentDayMaxDemandReceived", type: DataType.UINT48},
                currentDayMaxDemandReceivedTime: {ID: 0x0460, name: "currentDayMaxDemandReceivedTime", type: DataType.UTC},
                previousDayMaxDemandDelivered: {ID: 0x0461, name: "previousDayMaxDemandDelivered", type: DataType.UINT48},
                previousDayMaxDemandDeliveredTime: {ID: 0x0462, name: "previousDayMaxDemandDeliveredTime", type: DataType.UTC},
                previousDayMaxDemandReceived: {ID: 0x0463, name: "previousDayMaxDemandReceived", type: DataType.UINT48},
                previousDayMaxDemandReceivedTime: {ID: 0x0464, name: "previousDayMaxDemandReceivedTime", type: DataType.UTC},
                currentReactiveSummationQ1: {ID: 0x0d05, name: "currentReactiveSummationQ1", type: DataType.UINT48},
                currentReactiveSummationQ2: {ID: 0x0d06, name: "currentReactiveSummationQ2", type: DataType.UINT48},
                currentReactiveSummationQ3: {ID: 0x0d07, name: "currentReactiveSummationQ3", type: DataType.UINT48},
                currentReactiveSummationQ4: {ID: 0x0d08, name: "currentReactiveSummationQ4", type: DataType.UINT48},
            },
            commands: {},
            /* zigbee-herdsman stops at the SnapshotPayloadType field: the sub-payload that follows is
               marked as a TODO in its cluster definition, so its bytes are dropped while parsing. The
               command is redeclared here with that last field read as is, the custom definition taking
               precedence over the standard one; parseSnapshotSubPayload interprets it. */
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
    /** Daily meter time synchronisation.
     *
     * The ERL expects a plain UTC timestamp: seconds elapsed since 1 January 2000 00:00:00 UTC. When the
     * attribute holds 0x00000000 or 0xFFFFFFFF the ERL considers itself unsynchronised and the Metering
     * commands stop answering altogether.
     *
     * The synchronisation is performed only when the meter runs in TIC historique mode. In TIC standard
     * mode the meter maintains its own clock, and overwriting it would hide the drifts that this
     * interface is meant to expose. The interval is configurable, 0 disables the synchronisation.
     *
     * The writeTimeDaily modern extend cannot be used here: it adds the time zone offset and therefore
     * writes a local time. */
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
                /* 0 is TIC historique, 1 is TIC standard. The value is read during configure; read it
                   again when the cache is empty. */
                let mode = endpoint.getClusterAttributeValue("seMetering", "linkyModeOfOperation");
                if (mode === undefined || mode === null) {
                    try {
                        await endpoint.read<"seMetering", ErlMetering>("seMetering", ["linkyModeOfOperation"]);
                        mode = endpoint.getClusterAttributeValue("seMetering", "linkyModeOfOperation");
                    } catch (error) {
                        logger.warning(`Unknown meter mode of operation, time synchronisation skipped (${error})`, NS);
                        return;
                    }
                }
                if (mode !== 0) {
                    logger.debug("Meter running in TIC standard mode, time synchronisation left to the meter", NS);
                    return;
                }
                try {
                    await endpoint.write("genTime", {time: nowAsZclUtc()}, {sendPolicy: "queue"});
                } catch (error) {
                    logger.error(`Time synchronisation failed for '${device.ieeeAddr}' (${error})`, NS);
                }
            },
        }),
    /** The Messaging cluster (0x0703) is present but commented out in zigbee-herdsman, so it has to be
     * declared in full. It carries no attribute, only commands. */
    addMessaging: (): ModernExtend =>
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
    /** The DailySchedule cluster (0x070D) carries the Linky tariff calendar: day profiles, tariff
     * register in use, auxiliary load switch labels and mobile peak periods. */
    addDailySchedule: (): ModernExtend =>
        m.deviceAddCustomCluster("dailySchedule", {
            ID: 0x070d,
            name: "dailySchedule",
            attributes: {
                auxSwitch1Label: {ID: 0x0000, name: "auxSwitch1Label", type: DataType.OCTET_STR, write: true},
                auxSwitch2Label: {ID: 0x0001, name: "auxSwitch2Label", type: DataType.OCTET_STR, write: true},
                auxSwitch3Label: {ID: 0x0002, name: "auxSwitch3Label", type: DataType.OCTET_STR, write: true},
                auxSwitch4Label: {ID: 0x0003, name: "auxSwitch4Label", type: DataType.OCTET_STR, write: true},
                auxSwitch5Label: {ID: 0x0004, name: "auxSwitch5Label", type: DataType.OCTET_STR, write: true},
                auxSwitch6Label: {ID: 0x0005, name: "auxSwitch6Label", type: DataType.OCTET_STR, write: true},
                auxSwitch7Label: {ID: 0x0006, name: "auxSwitch7Label", type: DataType.OCTET_STR, write: true},
                auxSwitch8Label: {ID: 0x0007, name: "auxSwitch8Label", type: DataType.OCTET_STR, write: true},
                currentAuxiliaryLoadSwitchState: {ID: 0x0100, name: "currentAuxiliaryLoadSwitchState", type: DataType.BITMAP8, report: true},
                currentDeliveredTier: {ID: 0x0101, name: "currentDeliveredTier", type: DataType.ENUM8, report: true},
                currentTierLabel: {ID: 0x0102, name: "currentTierLabel", type: DataType.OCTET_STR},
                linkyPeakPeriodStatus: {ID: 0x0103, name: "linkyPeakPeriodStatus", type: DataType.BITMAP8, report: true},
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
                        /* Sequence of 4-byte entries, decoded by the converter: the "Series of Schedule
                           Entries" type does not exist in the ZCL. */
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
};

/** Converts a camelCase ZCL attribute name into the snake_case property published by Zigbee2MQTT. */
const toSnakeCase = (attribute: string): string =>
    attribute
        .split(/(?=[A-Z])/)
        .join("_")
        .toLowerCase();

const fzLocal = {
    meterIdentification: {
        cluster: "seMeterIdentification",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg) => {
            const result: KeyValue = {};
            const elements = ["meterTypeId", "availablePower", "powerThreshold", "pod", "companyName", "dataQualityId", "model"] as const;
            for (const at of elements) {
                if (msg.data[at] === undefined) continue;
                if (at === "pod" || at === "companyName") result[toSnakeCase(at)] = toText(msg.data[at]);
                /* Published as meter_model: "model" alone would be confused with the device model shown
                   by the gateway. */ else if (at === "model") result.meter_model = toText(msg.data[at]);
                else result[toSnakeCase(at)] = msg.data[at];
            }
            return result;
        },
    } satisfies Fz.Converter<"seMeterIdentification", undefined, ["readResponse", "attributeReport"]>,
    metering: {
        cluster: "seMetering",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg) => {
            const result: KeyValue = {};
            const elements = [
                "currentSummDelivered",
                "currentSummReceived",
                "activeRegisterTierDelivered",
                "currentTier1SummDelivered",
                "currentTier2SummDelivered",
                "currentTier3SummDelivered",
                "currentTier4SummDelivered",
                "currentTier5SummDelivered",
                "currentTier6SummDelivered",
                "serviceDisconnectReason",
                "linkyModeOfOperation",
                "instantaneousDemand",
                "status",
                "extendedStatus",
                "siteId",
                "meterSerialNumber",
                "moduleSerialNumber",
                "currentDayMaxDemandDelivered",
                "currentDayMaxDemandDeliveredTime",
                "currentDayMaxDemandReceived",
                "currentDayMaxDemandReceivedTime",
                "previousDayMaxDemandDelivered",
                "previousDayMaxDemandDeliveredTime",
                "previousDayMaxDemandReceived",
                "previousDayMaxDemandReceivedTime",
                "numberOfTiersInUse",
                "currentReactiveSummationQ1",
                "currentReactiveSummationQ2",
                "currentReactiveSummationQ3",
                "currentReactiveSummationQ4",
            ] as const;
            for (const at of elements) {
                if (msg.data[at] === undefined) continue;
                const atSnake = toSnakeCase(at);
                if (at === "siteId" || at === "meterSerialNumber" || at === "moduleSerialNumber") {
                    result[atSnake] = toText(msg.data[at]);
                } else if (at === "extendedStatus") {
                    /* 64-bit bitmap decoded as BigInt: it must be converted before publishing, otherwise
                       JSON.stringify throws and the whole device stops publishing. */
                    result[atSnake] = toHex64(msg.data[at]);
                } else if (at.endsWith("Time")) {
                    result[atSnake] = msg.data[at];
                    result[`${atSnake}_text`] = zclUtcToText(msg.data[at] as number);
                } else if (typeof msg.data[at] === "bigint") {
                    /* Registers are declared on 48 bits and may arrive as BigInt depending on the type
                       announced in the frame. Real values fit well within a JavaScript number. */
                    result[atSnake] = Number(msg.data[at]);
                } else {
                    result[atSnake] = msg.data[at];
                }
            }
            return result;
        },
    } satisfies Fz.Converter<"seMetering", ErlMetering, ["readResponse", "attributeReport"]>,
    dailySchedule: {
        cluster: "dailySchedule",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg) => {
            const result: KeyValue = {};
            const stringAttributes = [
                "auxSwitch1Label",
                "auxSwitch2Label",
                "auxSwitch3Label",
                "auxSwitch4Label",
                "auxSwitch5Label",
                "auxSwitch6Label",
                "auxSwitch7Label",
                "auxSwitch8Label",
                "currentTierLabel",
                "currentTariffLabel",
            ] as const;
            const elements = [
                ...stringAttributes,
                "currentAuxiliaryLoadSwitchState",
                "currentDeliveredTier",
                "linkyPeakPeriodStatus",
                "peakStartTime",
                "peakEndTime",
            ] as const;
            for (const at of elements) {
                if (msg.data[at] === undefined) continue;
                const atSnake = toSnakeCase(at);
                if (at === "linkyPeakPeriodStatus") {
                    const status = msg.data[at] as number;
                    result[atSnake] = status;
                    result.current_day_color = linkyDayColors[status & 0b11];
                    result.next_day_color = linkyDayColors[(status >> 2) & 0b11];
                    result.peak_period_prior_notice = linkyPeakPriorNotices[(status >> 4) & 0b11];
                    result.on_peak = linkyOnPeakStates[(status >> 6) & 0b11];
                } else if (at === "peakStartTime" || at === "peakEndTime") {
                    result[atSnake] = msg.data[at];
                    result[`${atSnake}_text`] = zclUtcToText(msg.data[at] as number);
                } else if ((stringAttributes as readonly string[]).includes(at)) {
                    result[atSnake] = toText(msg.data[at]);
                } else {
                    result[atSnake] = msg.data[at];
                }
            }
            return result;
        },
    } satisfies Fz.Converter<"dailySchedule", ErlDailySchedule, ["readResponse", "attributeReport"]>,
    time: {
        cluster: "genTime",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg) => {
            const result: KeyValue = {};
            const elements = [
                "time",
                "timeStatus",
                "timeZone",
                "dstStart",
                "dstEnd",
                "dstShift",
                "standardTime",
                "localTime",
                "lastSetTime",
                "validUntilTime",
            ] as const;
            for (const at of elements) {
                if (msg.data[at] !== undefined) result[toSnakeCase(at)] = msg.data[at];
            }
            /* ZCL timestamps count from 1 January 2000: publish a readable form next to each raw value. */
            for (const at of ["time", "dstStart", "dstEnd", "standardTime", "localTime", "lastSetTime", "validUntilTime"] as const) {
                if (msg.data[at] !== undefined) result[`${toSnakeCase(at)}_text`] = zclUtcToText(msg.data[at] as number);
            }
            return result;
        },
    } satisfies Fz.Converter<"genTime", undefined, ["readResponse", "attributeReport"]>,
    electricalMeasurement: {
        cluster: "haElectricalMeasurement",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg) => {
            const result: KeyValue = {};
            const elements = [
                "measurementType",
                "totalActivePower",
                "totalApparentPower",
                "rmsVoltage",
                "rmsCurrent",
                "activePower",
                "apparentPower",
                "rmsVoltagePhB",
                "rmsCurrentPhB",
                "activePowerPhB",
                "apparentPowerPhB",
                "rmsVoltagePhC",
                "rmsCurrentPhC",
                "activePowerPhC",
                "apparentPowerPhC",
            ] as const;
            for (const at of elements) {
                if (msg.data[at] !== undefined) result[toSnakeCase(at)] = msg.data[at];
            }
            return result;
        },
    } satisfies Fz.Converter<"haElectricalMeasurement", undefined, ["readResponse", "attributeReport"]>,
    messagingDisplay: {
        cluster: "seMessaging",
        type: ["commandDisplayMessage"],
        convert: (model, msg) => {
            const data = msg.data;
            return {
                message_data: toJson({
                    message_id: data.messageId,
                    message_control: data.messageControl,
                    start_time: data.startTime,
                    start_time_text: zclUtcToText(data.startTime),
                    /* zigbee-herdsman returns null for the invalid 16-bit value (0xFFFF), which means an
                       unbounded display duration here. */
                    duration_in_minutes: data.durationInMinutes ?? "unlimited",
                    message: toText(data.message),
                }),
            };
        },
    } satisfies Fz.Converter<"seMessaging", ErlMessaging, ["commandDisplayMessage"]>,
    messagingCancel: {
        cluster: "seMessaging",
        type: ["commandCancelMessage"],
        convert: (model, msg) => ({message_data: toJson({message_id: msg.data.messageId, cancelled: true})}),
    } satisfies Fz.Converter<"seMessaging", ErlMessaging, ["commandCancelMessage"]>,
    publishSchedule: {
        cluster: "dailySchedule",
        type: ["commandPublishSchedule"],
        convert: (model, msg) => {
            const data = msg.data;
            return {
                schedule_data: toJson({
                    provider_id: data.providerId,
                    issuer_event_id: data.issuerEventId,
                    schedule_id: data.scheduleId,
                    day_id: data.dayId,
                    start_time: data.startTime,
                    start_time_text: zclUtcToText(data.startTime),
                    schedule_type: scheduleTypes[data.scheduleType] ?? `unknown (${data.scheduleType})`,
                    schedule_time_reference: scheduleTimeReferences[data.scheduleTimeReference] ?? `unknown (${data.scheduleTimeReference})`,
                    schedule_name: toText(data.scheduleName),
                }),
            };
        },
    } satisfies Fz.Converter<"dailySchedule", ErlDailySchedule, ["commandPublishSchedule"]>,
    publishDayProfile: {
        cluster: "dailySchedule",
        type: ["commandPublishDayProfile"],
        convert: (model, msg) => {
            const data = msg.data;
            const key = `${msg.device.ieeeAddr}|${data.dayId}|${data.issuerEventId}`;
            const fragments = dayProfileFragments.get(key) ?? new Map<number, KeyValue[]>();
            fragments.set(data.commandIndex, parseDayScheduleEntries(data.dayScheduleEntries));
            dayProfileFragments.set(key, fragments);
            /* Publish nothing until every fragment has been received. */
            if (fragments.size < data.totalNumberOfCommands) return;
            dayProfileFragments.delete(key);
            const entries = [...fragments.keys()].sort((a, b) => a - b).flatMap((index) => fragments.get(index) ?? []);
            return {
                day_profile_data: toJson({
                    provider_id: data.providerId,
                    issuer_event_id: data.issuerEventId,
                    day_id: data.dayId,
                    schedule_type: scheduleTypes[data.scheduleType] ?? `unknown (${data.scheduleType})`,
                    total_number_of_schedule_entries: data.totalNumberOfScheduleEntries,
                    entries: entries,
                }),
            };
        },
    } satisfies Fz.Converter<"dailySchedule", ErlDailySchedule, ["commandPublishDayProfile"]>,
    cancelSchedule: {
        cluster: "dailySchedule",
        type: ["commandCancelSchedule"],
        convert: (model, msg) => {
            const data = msg.data;
            return {
                schedule_cancellation: toJson({
                    provider_id: data.providerId,
                    schedule_id: data.scheduleId,
                    schedule_type: scheduleTypes[data.scheduleType] ?? `unknown (${data.scheduleType})`,
                }),
            };
        },
    } satisfies Fz.Converter<"dailySchedule", ErlDailySchedule, ["commandCancelSchedule"]>,
    cancelAllSchedules: {
        cluster: "dailySchedule",
        type: ["commandCancelAllSchedules"],
        convert: () => ({schedule_cancellation: toJson({cancelled: "all schedules"})}),
    } satisfies Fz.Converter<"dailySchedule", ErlDailySchedule, ["commandCancelAllSchedules"]>,
    meteringProfile: {
        cluster: "seMetering",
        type: ["commandGetProfileRsp"],
        convert: (model, msg) => {
            const data = msg.data;
            return {
                profile_data: toJson({
                    end_time: data.endTime,
                    end_time_text: zclUtcToText(data.endTime),
                    status: profileStatuses[data.status] ?? `unknown (${data.status})`,
                    interval_period: profileIntervalPeriods[data.profileIntervalPeriod] ?? `unknown (${data.profileIntervalPeriod})`,
                    number_of_periods_delivered: data.numberOfPeriodsDelivered,
                    intervals: data.intervals,
                }),
            };
        },
    } satisfies Fz.Converter<"seMetering", undefined, ["commandGetProfileRsp"]>,
    meteringSnapshot: {
        cluster: "seMetering",
        type: ["commandPublishSnapshot"],
        convert: (model, msg) => {
            const data = msg.data;
            const device = msg.device.ieeeAddr;
            const fragment = (data as KeyValue).subPayload as Buffer | undefined;
            const expected = data.totalNumberOfCommands ?? 1;

            /* Fragments of one direction are gathered before any decoding. */
            const key = `${device}|${data.id}|${data.payloadType}`;
            const fragments = snapshotFragments.get(key) ?? new Map<number, Buffer>();
            fragments.set(data.commandIndex ?? 0, fragment ? Buffer.from(fragment) : Buffer.alloc(0));
            snapshotFragments.set(key, fragments);
            /* Nothing is published for that direction until every fragment is in. */
            if (fragments.size < expected) return;
            snapshotFragments.delete(key);
            const subPayload = Buffer.concat([...fragments.keys()].sort((a, b) => a - b).map((index) => fragments.get(index) as Buffer));

            /* Even types carry the delivered energy, odd ones the received energy; type 128 reports a
               snapshot without data and belongs to no direction. */
            const section = data.payloadType === 128 ? "unavailable" : data.payloadType % 2 === 0 ? "delivered" : "received";

            /* The ERL reports the same identifier and timestamp for every snapshot — those of the most
               recent one — whatever offset was requested, so they cannot tell them apart. Since a
               GetSnapshot returns a single command per direction, a direction filled a second time
               announces a new snapshot rather than a complement of the current one. */
            const previous = snapshotAggregates.get(device);
            const continues = previous !== undefined && previous.id === data.id && previous[section] === undefined;
            const snapshot: KeyValue = continues
                ? previous
                : {
                      id: data.id,
                      time: data.time,
                      time_text: zclUtcToText(data.time),
                      total_snapshots_found: data.totalSnapshotsFound,
                      cause: data.cause,
                      cause_text: snapshotCauseToText(data.cause),
                      commands_received: 0,
                  };
            if (!continues) {
                /* Fragments orphaned by the previous snapshot have no purpose any more. */
                for (const orphan of snapshotFragments.keys()) {
                    if (orphan.startsWith(`${device}|`)) snapshotFragments.delete(orphan);
                }
            }

            snapshot[section] = {
                payload_type: data.payloadType,
                payload_type_text: snapshotPayloadTypes[data.payloadType] ?? `unknown (${data.payloadType})`,
                fragments: expected,
                ...(parseSnapshotSubPayload(data.payloadType, subPayload) ?? {}),
                sub_payload_hex: subPayload.length > 0 ? subPayload.toString("hex") : undefined,
            };
            /* Recomputed rather than accumulated, so that a replayed command does not inflate it. */
            snapshot.commands_received = ["delivered", "received", "unavailable"].reduce(
                (total, name) => total + (((snapshot[name] as KeyValue | undefined)?.fragments as number | undefined) ?? 0),
                0,
            );
            snapshotAggregates.set(device, snapshot);
            return {snapshot_data: toJson(snapshot)};
        },
    } satisfies Fz.Converter<"seMetering", undefined, ["commandPublishSnapshot"]>,
    meteringSampledData: {
        cluster: "seMetering",
        type: ["commandGetSampledDataRsp"],
        convert: (model, msg) => {
            const data = msg.data;
            return {
                sampled_data: toJson({
                    id: data.id,
                    start_time: data.startTime,
                    start_time_text: zclUtcToText(data.startTime),
                    type: data.type,
                    request_interval: data.requestInterval,
                    number_of_samples: data.numberOfSamples,
                    samples: data.samples,
                }),
            };
        },
    } satisfies Fz.Converter<"seMetering", undefined, ["commandGetSampledDataRsp"]>,
};

/** Maps each published property to the cluster and ZCL attribute carrying it. The grouped commands
 * below only answer to their own name, whereas the refresh button of a gateway emits a /get carrying
 * the property name itself. Without this table every individual refresh fails. */
const attributeByProperty: {[property: string]: [string, string]} = {
    /* Metering */
    active_register_tier_delivered: ["seMetering", "activeRegisterTierDelivered"],
    current_day_max_demand_delivered: ["seMetering", "currentDayMaxDemandDelivered"],
    current_day_max_demand_delivered_time: ["seMetering", "currentDayMaxDemandDeliveredTime"],
    current_day_max_demand_received: ["seMetering", "currentDayMaxDemandReceived"],
    current_day_max_demand_received_time: ["seMetering", "currentDayMaxDemandReceivedTime"],
    current_reactive_summation_q1: ["seMetering", "currentReactiveSummationQ1"],
    current_reactive_summation_q2: ["seMetering", "currentReactiveSummationQ2"],
    current_reactive_summation_q3: ["seMetering", "currentReactiveSummationQ3"],
    current_reactive_summation_q4: ["seMetering", "currentReactiveSummationQ4"],
    current_summ_delivered: ["seMetering", "currentSummDelivered"],
    current_summ_received: ["seMetering", "currentSummReceived"],
    current_tier1_summ_delivered: ["seMetering", "currentTier1SummDelivered"],
    current_tier2_summ_delivered: ["seMetering", "currentTier2SummDelivered"],
    current_tier3_summ_delivered: ["seMetering", "currentTier3SummDelivered"],
    current_tier4_summ_delivered: ["seMetering", "currentTier4SummDelivered"],
    current_tier5_summ_delivered: ["seMetering", "currentTier5SummDelivered"],
    current_tier6_summ_delivered: ["seMetering", "currentTier6SummDelivered"],
    extended_status: ["seMetering", "extendedStatus"],
    instantaneous_demand: ["seMetering", "instantaneousDemand"],
    linky_mode_of_operation: ["seMetering", "linkyModeOfOperation"],
    meter_serial_number: ["seMetering", "meterSerialNumber"],
    module_serial_number: ["seMetering", "moduleSerialNumber"],
    number_of_tiers_in_use: ["seMetering", "numberOfTiersInUse"],
    previous_day_max_demand_delivered: ["seMetering", "previousDayMaxDemandDelivered"],
    previous_day_max_demand_delivered_time: ["seMetering", "previousDayMaxDemandDeliveredTime"],
    previous_day_max_demand_received: ["seMetering", "previousDayMaxDemandReceived"],
    previous_day_max_demand_received_time: ["seMetering", "previousDayMaxDemandReceivedTime"],
    service_disconnect_reason: ["seMetering", "serviceDisconnectReason"],
    site_id: ["seMetering", "siteId"],
    status: ["seMetering", "status"],
    /* ElectricalMeasurement */
    active_power: ["haElectricalMeasurement", "activePower"],
    active_power_ph_b: ["haElectricalMeasurement", "activePowerPhB"],
    active_power_ph_c: ["haElectricalMeasurement", "activePowerPhC"],
    apparent_power: ["haElectricalMeasurement", "apparentPower"],
    apparent_power_ph_b: ["haElectricalMeasurement", "apparentPowerPhB"],
    apparent_power_ph_c: ["haElectricalMeasurement", "apparentPowerPhC"],
    measurement_type: ["haElectricalMeasurement", "measurementType"],
    rms_current: ["haElectricalMeasurement", "rmsCurrent"],
    rms_current_ph_b: ["haElectricalMeasurement", "rmsCurrentPhB"],
    rms_current_ph_c: ["haElectricalMeasurement", "rmsCurrentPhC"],
    rms_voltage: ["haElectricalMeasurement", "rmsVoltage"],
    rms_voltage_ph_b: ["haElectricalMeasurement", "rmsVoltagePhB"],
    rms_voltage_ph_c: ["haElectricalMeasurement", "rmsVoltagePhC"],
    total_active_power: ["haElectricalMeasurement", "totalActivePower"],
    total_apparent_power: ["haElectricalMeasurement", "totalApparentPower"],
    /* DailySchedule */
    aux_switch1_label: ["dailySchedule", "auxSwitch1Label"],
    aux_switch2_label: ["dailySchedule", "auxSwitch2Label"],
    aux_switch3_label: ["dailySchedule", "auxSwitch3Label"],
    aux_switch4_label: ["dailySchedule", "auxSwitch4Label"],
    aux_switch5_label: ["dailySchedule", "auxSwitch5Label"],
    aux_switch6_label: ["dailySchedule", "auxSwitch6Label"],
    aux_switch7_label: ["dailySchedule", "auxSwitch7Label"],
    aux_switch8_label: ["dailySchedule", "auxSwitch8Label"],
    current_auxiliary_load_switch_state: ["dailySchedule", "currentAuxiliaryLoadSwitchState"],
    current_delivered_tier: ["dailySchedule", "currentDeliveredTier"],
    current_tariff_label: ["dailySchedule", "currentTariffLabel"],
    current_tier_label: ["dailySchedule", "currentTierLabel"],
    linky_peak_period_status: ["dailySchedule", "linkyPeakPeriodStatus"],
    peak_end_time: ["dailySchedule", "peakEndTime"],
    peak_start_time: ["dailySchedule", "peakStartTime"],
    /* Time */
    dst_end: ["genTime", "dstEnd"],
    dst_shift: ["genTime", "dstShift"],
    dst_start: ["genTime", "dstStart"],
    last_set_time: ["genTime", "lastSetTime"],
    local_time: ["genTime", "localTime"],
    standard_time: ["genTime", "standardTime"],
    time: ["genTime", "time"],
    time_status: ["genTime", "timeStatus"],
    time_zone: ["genTime", "timeZone"],
    valid_until_time: ["genTime", "validUntilTime"],
    /* MeterIdentification */
    available_power: ["seMeterIdentification", "availablePower"],
    company_name: ["seMeterIdentification", "companyName"],
    data_quality_id: ["seMeterIdentification", "dataQualityId"],
    meter_model: ["seMeterIdentification", "model"],
    meter_type_id: ["seMeterIdentification", "meterTypeId"],
    pod: ["seMeterIdentification", "pod"],
    power_threshold: ["seMeterIdentification", "powerThreshold"],
};

const asObject = (value: unknown): {[key: string]: number | undefined} =>
    typeof value === "object" && value !== null ? (value as {[key: string]: number | undefined}) : {};

/** The cluster and attribute of a refresh are resolved at runtime from attributeByProperty, so the
 * statically typed overloads of read() cannot apply here. */
type DynamicRead = (cluster: string, attributes: string[]) => Promise<unknown>;

const tzLocal = {
    /** Refreshes a single quantity, triggered by its own name. This is what the refresh button of a
     * gateway does. The grouped commands below remain the way to read everything at once. */
    getProperty: {
        key: Object.keys(attributeByProperty),
        convertGet: async (entity, key) => {
            const [cluster, attribute] = attributeByProperty[key];
            await (entity.read as unknown as DynamicRead)(cluster, [attribute]);
        },
    } satisfies Tz.Converter,
    getAvailablePower: {
        key: ["currentAvailablePower"],
        convertGet: async (entity) => {
            await entity.read("seMeterIdentification", [
                "availablePower",
                "meterTypeId",
                "powerThreshold",
                "pod",
                "companyName",
                "dataQualityId",
                "model",
            ]);
        },
    } satisfies Tz.Converter,
    getTotalIndexes: {
        key: ["currentTotalSummDelivered"],
        convertGet: async (entity) => {
            await entity.read<"seMetering", ErlMetering>("seMetering", ["currentSummDelivered", "currentSummReceived", "instantaneousDemand"]);
        },
    } satisfies Tz.Converter,
    getTierIndexes: {
        key: ["currentTierSummDelivered"],
        convertGet: async (entity) => {
            await entity.read<"seMetering", ErlMetering>("seMetering", [
                "currentTier1SummDelivered",
                "currentTier2SummDelivered",
                "currentTier3SummDelivered",
                "currentTier4SummDelivered",
                "currentTier5SummDelivered",
                "currentTier6SummDelivered",
            ]);
        },
    } satisfies Tz.Converter,
    getMaxDemands: {
        key: ["currentMaxDemands"],
        convertGet: async (entity) => {
            await entity.read<"seMetering", ErlMetering>("seMetering", [
                "currentDayMaxDemandDelivered",
                "currentDayMaxDemandDeliveredTime",
                "currentDayMaxDemandReceived",
                "currentDayMaxDemandReceivedTime",
                "previousDayMaxDemandDelivered",
                "previousDayMaxDemandDeliveredTime",
                "previousDayMaxDemandReceived",
                "previousDayMaxDemandReceivedTime",
            ]);
        },
    } satisfies Tz.Converter,
    getReactiveSummations: {
        key: ["currentReactiveSummations"],
        convertGet: async (entity) => {
            await entity.read<"seMetering", ErlMetering>("seMetering", [
                "currentReactiveSummationQ1",
                "currentReactiveSummationQ2",
                "currentReactiveSummationQ3",
                "currentReactiveSummationQ4",
            ]);
        },
    } satisfies Tz.Converter,
    getMeterStatus: {
        key: ["currentMeterStatus"],
        convertGet: async (entity) => {
            await entity.read<"seMetering", ErlMetering>("seMetering", [
                "status",
                "extendedStatus",
                "siteId",
                "meterSerialNumber",
                "moduleSerialNumber",
                "numberOfTiersInUse",
            ]);
        },
    } satisfies Tz.Converter,
    getActivePower: {
        key: ["currentActivePower"],
        convertGet: async (entity) => {
            await entity.read("haElectricalMeasurement", ["totalActivePower", "activePower", "activePowerPhB", "activePowerPhC"]);
        },
    } satisfies Tz.Converter,
    getTime: {
        key: ["currentTime"],
        convertGet: async (entity) => {
            await entity.read("genTime", [
                "time",
                "timeStatus",
                "timeZone",
                "dstStart",
                "dstEnd",
                "dstShift",
                "standardTime",
                "localTime",
                "lastSetTime",
                "validUntilTime",
            ]);
        },
    } satisfies Tz.Converter,
    getProfile: {
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
    getSnapshot: {
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
                    /* Bitmap of causes, the ERL only producing the scheduled snapshot: that is
                       bit 16, 0x00010000. Firmwares older than October 2026 expected rank 16 here;
                       on those, the value has to be entered by hand or the request stays unanswered. */
                    cause: request.cause ?? 0x00010000,
                },
                ASYNC_COMMAND,
            );
        },
    } satisfies Tz.Converter,
    getSampledData: {
        key: ["get_sampled_data"],
        convertSet: async (entity, key, value) => {
            const request = asObject(value);
            await entity.command(
                "seMetering",
                "getSampledData",
                {
                    sampleId: request.sample_id ?? 0,
                    earliestSampleTime: request.earliest_sample_time ?? 0,
                    /* Parameters expected by the ERL: type 4 (InstantaneousDemand), samples every two
                       seconds. The answer is capped at 22 samples, beyond which the frame would exceed
                       the maximum size of an unfragmented APS payload. */
                    type: request.type ?? 4,
                    numberOfSamples: request.number_of_samples ?? 22,
                },
                ASYNC_COMMAND,
            );
        },
    } satisfies Tz.Converter,
    getLastMessage: {
        key: ["get_last_message"],
        convertSet: async (entity) => {
            await entity.command<"seMessaging", "getLastMessage", ErlMessaging>("seMessaging", "getLastMessage", {}, ASYNC_COMMAND);
        },
    } satisfies Tz.Converter,
    confirmMessage: {
        key: ["confirm_message"],
        convertSet: async (entity, key, value) => {
            const request = asObject(value);
            await entity.command<"seMessaging", "messageConfirmation", ErlMessaging>(
                "seMessaging",
                "messageConfirmation",
                {
                    messageId: request.message_id ?? 0,
                    confirmationTime: request.confirmation_time ?? nowAsZclUtc(),
                },
                ASYNC_COMMAND,
            );
        },
    } satisfies Tz.Converter,
    getSchedule: {
        key: ["get_schedule"],
        convertSet: async (entity, key, value) => {
            const request = asObject(value);
            await entity.command<"dailySchedule", "getSchedule", ErlDailySchedule>(
                "dailySchedule",
                "getSchedule",
                {
                    providerId: request.provider_id ?? ERL_PROVIDER_ID,
                    earliestStartTime: request.earliest_start_time ?? 0,
                    minIssuerEventId: request.min_issuer_event_id ?? 0xffffffff,
                    /* The ERL rejects the value 0 ("all schedules"): it expects 1 or 2, meaning the
                       current schedule and the following one. */
                    numberOfSchedules: request.number_of_schedules ?? 1,
                    scheduleType: request.schedule_type ?? 0,
                },
                ASYNC_COMMAND,
            );
        },
    } satisfies Tz.Converter,
    getDayProfile: {
        key: ["get_day_profile"],
        convertSet: async (entity, key, value) => {
            const request = asObject(value);
            await entity.command<"dailySchedule", "getDayProfile", ErlDailySchedule>(
                "dailySchedule",
                "getDayProfile",
                {
                    providerId: request.provider_id ?? ERL_PROVIDER_ID,
                    dayId: request.day_id ?? 0,
                },
                ASYNC_COMMAND,
            );
        },
    } satisfies Tz.Converter,
    getScheduleCancellation: {
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
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ZIGBEE_ERL"],
        model: "ZIGBEE_ERL",
        vendor: "EDFLab",
        description: "Linky meter TIC interface",
        extend: [
            m.onOff({powerOnBehavior: false}),
            m.identify(),
            edflabModernExtend.addDailySchedule(),
            edflabModernExtend.addMeteringAttributes(),
            edflabModernExtend.addMessaging(),
            edflabModernExtend.writeTimeDailyUtc(),
        ],
        fromZigbee: [
            fzLocal.meterIdentification,
            fzLocal.metering,
            fzLocal.dailySchedule,
            fzLocal.electricalMeasurement,
            fzLocal.time,
            fzLocal.messagingDisplay,
            fzLocal.messagingCancel,
            fzLocal.publishSchedule,
            fzLocal.publishDayProfile,
            fzLocal.cancelSchedule,
            fzLocal.cancelAllSchedules,
            fzLocal.meteringProfile,
            fzLocal.meteringSnapshot,
            fzLocal.meteringSampledData,
        ],
        toZigbee: [
            tz.read,
            tz.write,
            tz.command,
            tzLocal.getAvailablePower,
            tzLocal.getTotalIndexes,
            tzLocal.getTierIndexes,
            tzLocal.getMaxDemands,
            tzLocal.getReactiveSummations,
            tzLocal.getMeterStatus,
            tzLocal.getActivePower,
            tzLocal.getTime,
            tzLocal.getProfile,
            tzLocal.getSnapshot,
            tzLocal.getSampledData,
            tzLocal.getLastMessage,
            tzLocal.confirmMessage,
            tzLocal.getSchedule,
            tzLocal.getDayProfile,
            tzLocal.getScheduleCancellation,
            tzLocal.getProperty,
        ],
        exposes: [
            /* Tariff calendar */
            e.numeric("current_delivered_tier", ea.STATE_GET).withDescription("Tariff register currently in use"),
            e.text("current_tariff_label", ea.STATE_GET).withDescription("Name of the tariff plan"),
            e.text("current_tier_label", ea.STATE_GET).withDescription("Name of the tariff register in use"),
            e.numeric("active_register_tier_delivered", ea.STATE_GET).withDescription("Active tariff register"),
            e.numeric("number_of_tiers_in_use", ea.STATE_GET).withDescription("Number of tariff registers in use"),
            /* Auxiliary load switches */
            e.numeric("current_auxiliary_load_switch_state", ea.STATE_GET).withDescription("State of the auxiliary load switches"),
            e.text("aux_switch1_label", ea.STATE_GET).withDescription("Label of auxiliary load switch 1"),
            e.text("aux_switch2_label", ea.STATE_GET).withDescription("Label of auxiliary load switch 2"),
            e.text("aux_switch3_label", ea.STATE_GET).withDescription("Label of auxiliary load switch 3"),
            e.text("aux_switch4_label", ea.STATE_GET).withDescription("Label of auxiliary load switch 4"),
            e.text("aux_switch5_label", ea.STATE_GET).withDescription("Label of auxiliary load switch 5"),
            e.text("aux_switch6_label", ea.STATE_GET).withDescription("Label of auxiliary load switch 6"),
            e.text("aux_switch7_label", ea.STATE_GET).withDescription("Label of auxiliary load switch 7"),
            e.text("aux_switch8_label", ea.STATE_GET).withDescription("Label of auxiliary load switch 8"),
            /* Mobile peak periods */
            e.numeric("linky_peak_period_status", ea.STATE_GET).withDescription("Tempo colour and mobile peak status"),
            e.text("current_day_color", ea.STATE).withDescription("Tempo colour of the current day"),
            e.text("next_day_color", ea.STATE).withDescription("Tempo colour of the next day"),
            e.text("peak_period_prior_notice", ea.STATE).withDescription("Mobile peak prior notice"),
            e.text("on_peak", ea.STATE).withDescription("Mobile peak in progress"),
            e.numeric("peak_start_time", ea.STATE_GET).withUnit("s").withDescription("Start of the mobile peak period"),
            e.text("peak_start_time_text", ea.STATE).withDescription("Start of the mobile peak period, as Y-M-D HH:MM:SS"),
            e.numeric("peak_end_time", ea.STATE_GET).withUnit("s").withDescription("End of the mobile peak period"),
            e.text("peak_end_time_text", ea.STATE).withDescription("End of the mobile peak period, as Y-M-D HH:MM:SS"),
            /* Meter identification */
            e.text("pod", ea.STATE_GET).withDescription("Point of delivery identifier (PRM)"),
            e.text("company_name", ea.STATE_GET).withDescription("Name of the energy supplier"),
            e.text("meter_model", ea.STATE_GET).withDescription("Meter model"),
            e.numeric("meter_type_id", ea.STATE_GET).withDescription("Consumer or producer"),
            e.numeric("data_quality_id", ea.STATE_GET).withDescription("Quality of the transmitted data"),
            e.text("site_id", ea.STATE_GET).withDescription("Site identifier"),
            e.text("meter_serial_number", ea.STATE_GET).withDescription("Meter serial number"),
            e.text("module_serial_number", ea.STATE_GET).withDescription("Module serial number"),
            /* Meter state */
            e.numeric("status", ea.STATE_GET).withDescription("Meter status flags (8-bit bitmap)"),
            e.text("extended_status", ea.STATE_GET).withDescription("Extended meter status flags (64-bit bitmap, hexadecimal)"),
            e.numeric("service_disconnect_reason", ea.STATE_GET).withDescription("Reason of the last service disconnection"),
            e.numeric("linky_mode_of_operation", ea.STATE_GET).withDescription("TIC mode: 0 is historique, 1 is standard"),
            /* Energy registers */
            e.numeric("current_summ_delivered", ea.STATE_GET).withUnit("Wh").withDescription("Total delivered energy"),
            e.numeric("current_summ_received", ea.STATE_GET).withUnit("Wh").withDescription("Total received energy"),
            e.numeric("current_tier1_summ_delivered", ea.STATE_GET).withUnit("Wh").withDescription("Delivered energy, register 1"),
            e.numeric("current_tier2_summ_delivered", ea.STATE_GET).withUnit("Wh").withDescription("Delivered energy, register 2"),
            e.numeric("current_tier3_summ_delivered", ea.STATE_GET).withUnit("Wh").withDescription("Delivered energy, register 3"),
            e.numeric("current_tier4_summ_delivered", ea.STATE_GET).withUnit("Wh").withDescription("Delivered energy, register 4"),
            e.numeric("current_tier5_summ_delivered", ea.STATE_GET).withUnit("Wh").withDescription("Delivered energy, register 5"),
            e.numeric("current_tier6_summ_delivered", ea.STATE_GET).withUnit("Wh").withDescription("Delivered energy, register 6"),
            e.numeric("current_reactive_summation_q1", ea.STATE_GET).withUnit("varh").withDescription("Reactive energy, quadrant 1"),
            e.numeric("current_reactive_summation_q2", ea.STATE_GET).withUnit("varh").withDescription("Reactive energy, quadrant 2"),
            e.numeric("current_reactive_summation_q3", ea.STATE_GET).withUnit("varh").withDescription("Reactive energy, quadrant 3"),
            e.numeric("current_reactive_summation_q4", ea.STATE_GET).withUnit("varh").withDescription("Reactive energy, quadrant 4"),
            /* Demand */
            e.numeric("instantaneous_demand", ea.STATE_GET).withUnit("W").withDescription("Instantaneous active power"),
            e.numeric("current_day_max_demand_delivered", ea.STATE_GET).withUnit("W").withDescription("Maximum delivered power of the current day"),
            e
                .numeric("current_day_max_demand_delivered_time", ea.STATE_GET)
                .withUnit("s")
                .withDescription("Time of the current day delivered maximum"),
            e
                .text("current_day_max_demand_delivered_time_text", ea.STATE)
                .withDescription("Time of the current day delivered maximum, as Y-M-D HH:MM:SS"),
            e.numeric("current_day_max_demand_received", ea.STATE_GET).withUnit("W").withDescription("Maximum received power of the current day"),
            e.numeric("current_day_max_demand_received_time", ea.STATE_GET).withUnit("s").withDescription("Time of the current day received maximum"),
            e
                .text("current_day_max_demand_received_time_text", ea.STATE)
                .withDescription("Time of the current day received maximum, as Y-M-D HH:MM:SS"),
            e.numeric("previous_day_max_demand_delivered", ea.STATE_GET).withUnit("W").withDescription("Maximum delivered power of the previous day"),
            e
                .numeric("previous_day_max_demand_delivered_time", ea.STATE_GET)
                .withUnit("s")
                .withDescription("Time of the previous day delivered maximum"),
            e
                .text("previous_day_max_demand_delivered_time_text", ea.STATE)
                .withDescription("Time of the previous day delivered maximum, as Y-M-D HH:MM:SS"),
            e.numeric("previous_day_max_demand_received", ea.STATE_GET).withUnit("W").withDescription("Maximum received power of the previous day"),
            e
                .numeric("previous_day_max_demand_received_time", ea.STATE_GET)
                .withUnit("s")
                .withDescription("Time of the previous day received maximum"),
            e
                .text("previous_day_max_demand_received_time_text", ea.STATE)
                .withDescription("Time of the previous day received maximum, as Y-M-D HH:MM:SS"),
            /* Electrical measurements */
            e.numeric("measurement_type", ea.STATE_GET).withDescription("Single-phase or three-phase measurement"),
            e.numeric("available_power", ea.STATE_GET).withUnit("VA").withValueMin(0).withValueMax(36000).withDescription("Subscribed power"),
            e.numeric("power_threshold", ea.STATE_GET).withUnit("VA").withValueMin(0).withDescription("Cut-off power"),
            e.numeric("total_active_power", ea.STATE_GET).withUnit("W").withDescription("Total active power"),
            e.numeric("active_power", ea.STATE_GET).withUnit("W").withDescription("Active power, phase A"),
            e.numeric("active_power_ph_b", ea.STATE_GET).withUnit("W").withDescription("Active power, phase B"),
            e.numeric("active_power_ph_c", ea.STATE_GET).withUnit("W").withDescription("Active power, phase C"),
            e.numeric("total_apparent_power", ea.STATE_GET).withUnit("VA").withValueMin(0).withDescription("Total apparent power"),
            e.numeric("apparent_power", ea.STATE_GET).withUnit("VA").withValueMin(0).withDescription("Apparent power, phase A"),
            e.numeric("apparent_power_ph_b", ea.STATE_GET).withUnit("VA").withValueMin(0).withDescription("Apparent power, phase B"),
            e.numeric("apparent_power_ph_c", ea.STATE_GET).withUnit("VA").withValueMin(0).withDescription("Apparent power, phase C"),
            e.numeric("rms_current", ea.STATE_GET).withUnit("A").withValueMin(0).withDescription("Current, phase A"),
            e.numeric("rms_current_ph_b", ea.STATE_GET).withUnit("A").withValueMin(0).withDescription("Current, phase B"),
            e.numeric("rms_current_ph_c", ea.STATE_GET).withUnit("A").withValueMin(0).withDescription("Current, phase C"),
            e.numeric("rms_voltage", ea.STATE_GET).withUnit("V").withValueMin(0).withDescription("Voltage, phase A"),
            e.numeric("rms_voltage_ph_b", ea.STATE_GET).withUnit("V").withValueMin(0).withDescription("Voltage, phase B"),
            e.numeric("rms_voltage_ph_c", ea.STATE_GET).withUnit("V").withValueMin(0).withDescription("Voltage, phase C"),
            /* Meter clock */
            e.numeric("time", ea.STATE_GET).withUnit("s").withDescription("Meter time, in seconds since 1 January 2000"),
            e.text("time_text", ea.STATE).withDescription("Meter time, as Y-M-D HH:MM:SS"),
            e.numeric("time_status", ea.STATE_GET).withDescription("Time synchronisation flags (8-bit bitmap)"),
            e.numeric("time_zone", ea.STATE_GET).withUnit("s").withDescription("Time zone offset"),
            e.numeric("dst_start", ea.STATE_GET).withUnit("s").withDescription("Start of daylight saving time"),
            e.text("dst_start_text", ea.STATE).withDescription("Start of daylight saving time, as Y-M-D HH:MM:SS"),
            e.numeric("dst_end", ea.STATE_GET).withUnit("s").withDescription("End of daylight saving time"),
            e.text("dst_end_text", ea.STATE).withDescription("End of daylight saving time, as Y-M-D HH:MM:SS"),
            e.numeric("dst_shift", ea.STATE_GET).withUnit("s").withDescription("Offset applied during daylight saving time"),
            e.numeric("standard_time", ea.STATE_GET).withUnit("s").withDescription("Standard time"),
            e.text("standard_time_text", ea.STATE).withDescription("Standard time, as Y-M-D HH:MM:SS"),
            e.numeric("local_time", ea.STATE_GET).withUnit("s").withDescription("Local time"),
            e.text("local_time_text", ea.STATE).withDescription("Meter local time, as Y-M-D HH:MM:SS"),
            e.numeric("last_set_time", ea.STATE_GET).withUnit("s").withDescription("Last time synchronisation"),
            e.text("last_set_time_text", ea.STATE).withDescription("Last time synchronisation, as Y-M-D HH:MM:SS"),
            e.numeric("valid_until_time", ea.STATE_GET).withUnit("s").withDescription("End of validity of the meter time"),
            e.text("valid_until_time_text", ea.STATE).withDescription("End of validity of the meter time, as Y-M-D HH:MM:SS"),
            /* Commands */
            e
                .composite("get_profile", "get_profile", ea.SET)
                .withDescription("Requests the consumption history (GetProfile). The answer is published in profile_data.")
                .withFeature(e.numeric("interval_channel", ea.SET).withDescription("0 is delivered consumption, 1 is received consumption"))
                .withFeature(e.numeric("end_time", ea.SET).withDescription("End timestamp, in seconds since 1 January 2000"))
                .withFeature(e.numeric("number_of_periods", ea.SET).withDescription("Number of requested periods")),
            e
                .composite("get_snapshot", "get_snapshot", ea.SET)
                .withDescription("Requests a billing snapshot (GetSnapshot). The answer is published in snapshot_data.")
                .withFeature(e.numeric("earliest_start_time", ea.SET).withDescription("Earliest timestamp, in seconds since 1 January 2000"))
                .withFeature(e.numeric("latest_end_time", ea.SET).withDescription("Latest timestamp, in seconds since 1 January 2000"))
                .withFeature(e.numeric("offset", ea.SET).withDescription("Rank of the requested snapshot"))
                .withFeature(
                    e
                        .numeric("cause", ea.SET)
                        .withDescription(
                            "Snapshot cause, as a bitmap: 65536 is the scheduled snapshot, the only one the ERL produces. 4294967295 requests them all.",
                        ),
                ),
            e
                .composite("get_sampled_data", "get_sampled_data", ea.SET)
                .withDescription("Requests measurement samples (GetSampledData). The answer is published in sampled_data.")
                .withFeature(e.numeric("sample_id", ea.SET).withDescription("Identifier of the sample set"))
                .withFeature(e.numeric("earliest_sample_time", ea.SET).withDescription("Earliest timestamp, in seconds since 1 January 2000"))
                .withFeature(e.numeric("type", ea.SET).withDescription("Sample type: 4 is instantaneous demand"))
                .withFeature(e.numeric("number_of_samples", ea.SET).withDescription("Number of requested samples, 22 at most")),
            e
                .composite("get_schedule", "get_schedule", ea.SET)
                .withDescription("Requests the tariff calendar (GetSchedule). The answer is published in schedule_data.")
                .withFeature(e.numeric("earliest_start_time", ea.SET).withDescription("Earliest timestamp, in seconds since 1 January 2000"))
                .withFeature(e.numeric("min_issuer_event_id", ea.SET).withDescription("Minimum issuer event identifier"))
                .withFeature(
                    e.numeric("number_of_schedules", ea.SET).withDescription("Number of schedules: 1 (current) or 2 (current and following)"),
                )
                .withFeature(e.numeric("schedule_type", ea.SET).withDescription("0 is the Linky tariff calendar")),
            e
                .composite("get_day_profile", "get_day_profile", ea.SET)
                .withDescription("Requests the profile of one day (GetDayProfile). The answer is published in day_profile_data.")
                .withFeature(e.numeric("day_id", ea.SET).withDescription("Day identifier, obtained through GetSchedule")),
            e.enum("get_schedule_cancellation", ea.SET, ["send"]).withDescription("Requests the last schedule cancellation"),
            e.enum("get_last_message", ea.SET, ["send"]).withDescription("Requests the last message broadcast by the distributor"),
            e
                .composite("confirm_message", "confirm_message", ea.SET)
                .withDescription("Acknowledges a displayed message")
                .withFeature(e.numeric("message_id", ea.SET).withDescription("Identifier of the message to confirm"))
                .withFeature(e.numeric("confirmation_time", ea.SET).withDescription("Confirmation timestamp, in seconds since 1 January 2000")),
            /* Command answers */
            e.text("message_data", ea.STATE).withDescription("Last message received from the distributor"),
            e.text("schedule_data", ea.STATE).withDescription("Last tariff calendar received"),
            e.text("day_profile_data", ea.STATE).withDescription("Last day profile received"),
            e.text("schedule_cancellation", ea.STATE).withDescription("Last schedule cancellation received"),
            e.text("profile_data", ea.STATE).withDescription("Last answer to GetProfile"),
            e.text("snapshot_data", ea.STATE).withDescription("Last snapshot received"),
            e.text("sampled_data", ea.STATE).withDescription("Last samples received"),
        ],
        configure: async (device) => {
            const endpoint = device.getEndpoint(1);
            /* Every read is tolerant to failure: an ERL that does not implement one of these attributes
               must not make the whole configuration fail. */
            const readAttributes = async (cluster: string, attributes: string[], what: string) => {
                try {
                    await (endpoint.read as unknown as DynamicRead)(cluster, attributes);
                } catch (error) {
                    logger.warning(`Could not read ${what} (${error})`, NS);
                }
            };
            await readAttributes("seMetering", ["serviceDisconnectReason", "linkyModeOfOperation"], "the meter mode of operation");
            await readAttributes(
                "dailySchedule",
                [
                    "currentDeliveredTier",
                    "currentAuxiliaryLoadSwitchState",
                    "currentTierLabel",
                    "linkyPeakPeriodStatus",
                    "currentTariffLabel",
                    "peakStartTime",
                    "peakEndTime",
                ],
                "the tariff calendar",
            );
            await readAttributes(
                "dailySchedule",
                [
                    "auxSwitch1Label",
                    "auxSwitch2Label",
                    "auxSwitch3Label",
                    "auxSwitch4Label",
                    "auxSwitch5Label",
                    "auxSwitch6Label",
                    "auxSwitch7Label",
                    "auxSwitch8Label",
                ],
                "the auxiliary load switch labels",
            );
            await readAttributes("seMetering", ["status", "extendedStatus", "siteId", "meterSerialNumber"], "the meter state and identifiers");
            await readAttributes(
                "haElectricalMeasurement",
                ["totalActivePower", "activePower", "activePowerPhB", "activePowerPhC"],
                "the active powers",
            );
            await readAttributes(
                "seMetering",
                ["currentReactiveSummationQ1", "currentReactiveSummationQ2", "currentReactiveSummationQ3", "currentReactiveSummationQ4"],
                "the reactive energy registers",
            );
            await readAttributes(
                "genTime",
                ["time", "timeStatus", "timeZone", "dstStart", "dstEnd", "dstShift", "standardTime", "localTime", "lastSetTime", "validUntilTime"],
                "the meter time",
            );
            await readAttributes("seMeterIdentification", ["companyName", "dataQualityId", "model"], "the meter identification");
            /* The maximum demands are not reportable: without this read they would stay frozen at the
               value captured when the device was paired. */
            await readAttributes(
                "seMetering",
                [
                    "currentDayMaxDemandDelivered",
                    "currentDayMaxDemandDeliveredTime",
                    "currentDayMaxDemandReceived",
                    "currentDayMaxDemandReceivedTime",
                    "previousDayMaxDemandDelivered",
                    "previousDayMaxDemandDeliveredTime",
                    "previousDayMaxDemandReceived",
                    "previousDayMaxDemandReceivedTime",
                ],
                "the maximum demands",
            );
        },
    },
];
