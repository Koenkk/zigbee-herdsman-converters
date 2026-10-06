import {DataType} from "zigbee-herdsman/dist/zspec/zcl";
import {OneJanuary2000} from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, KeyValue, ModernExtend} from "../lib/types";

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
        currentTariffLabel: string;
    };
    commands: never;
    commandResponses: never;
}

const dayColors = ["not_used", "blue", "white", "red"];

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
            },
            commands: {},
            commandsResponse: {},
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
                currentTariffLabel: {ID: 0x0106, name: "currentTariffLabel", type: DataType.OCTET_STR},
            },
            commands: {},
            commandsResponse: {},
        }),
    ],
    peakPeriodStatus: (): ModernExtend => ({
        exposes: [
            e.text("current_day_color", ea.STATE).withDescription("Tempo colour of the current day"),
            e.text("next_day_color", ea.STATE).withDescription("Tempo colour of the next day"),
        ],
        fromZigbee: [
            {
                cluster: "dailySchedule",
                type: ["attributeReport", "readResponse"],
                convert: (model, msg) => {
                    const status = msg.data.linkyPeakPeriodStatus;
                    if (status !== undefined) return {current_day_color: dayColors[status & 0b11], next_day_color: dayColors[(status >> 2) & 0b11]};
                },
            } satisfies Fz.Converter<"dailySchedule", ErlDailySchedule, ["attributeReport", "readResponse"]>,
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
            numeric("available_power", "seMeterIdentification", "availablePower", "Subscribed power", "VA"),
            numeric("power_threshold", "seMeterIdentification", "powerThreshold", "Cut-off power", "VA"),
            numeric("linky_mode_of_operation", "seMetering", "linkyModeOfOperation", "TIC mode: 0 is historique, 1 is standard"),
            // Tariff
            text("current_tariff_label", "dailySchedule", "currentTariffLabel", "Name of the tariff plan"),
            text("current_tier_label", "dailySchedule", "currentTierLabel", "Name of the tariff register in use"),
            numeric("current_delivered_tier", "dailySchedule", "currentDeliveredTier", "Tariff register currently in use"),
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
            numeric("current_day_max_demand_received", "seMetering", "currentDayMaxDemandReceived", "Maximum received power of the current day", "W"),
            numeric(
                "previous_day_max_demand_delivered",
                "seMetering",
                "previousDayMaxDemandDelivered",
                "Maximum delivered power of the previous day",
                "W",
            ),
            numeric(
                "previous_day_max_demand_received",
                "seMetering",
                "previousDayMaxDemandReceived",
                "Maximum received power of the previous day",
                "W",
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
            edflabExtend.writeTimeDailyUtc(),
        ],
    },
];
