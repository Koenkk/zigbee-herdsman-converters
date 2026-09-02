import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fz, ModernExtend} from "../lib/types";

const e = exposes.presets;

const actionTypes = ["click", "double_click", "hold"] as const;

function decodeZoneStatus(zoneStatus: number, buttonCount: number): string | undefined {
    if (!Number.isInteger(zoneStatus) || zoneStatus < 1 || zoneStatus > buttonCount * 6 - 1) {
        return;
    }

    const offset = (zoneStatus - 1) % 6;
    if (offset !== 0 && offset !== 2 && offset !== 4) {
        return;
    }

    const button = Math.floor((zoneStatus - 1) / 6) + 1;
    const actionType = actionTypes[offset / 2];
    return `button_${button}_${actionType}`;
}

function buttonActions(buttonCount: number): string[] {
    return Array.from({length: buttonCount}, (_, buttonIndex) => actionTypes.map((actionType) => `button_${buttonIndex + 1}_${actionType}`)).flat();
}

function linxuraButton(buttonCount: number): ModernExtend {
    const fromZigbee = {
        cluster: "ssIasZone",
        type: ["attributeReport", "readResponse", "commandStatusChangeNotification"],
        convert: (model, msg, publish, options, meta) => {
            const zoneStatus = "zonestatus" in msg.data ? msg.data.zonestatus : msg.data.zoneStatus;
            if (zoneStatus === undefined) {
                return;
            }

            const action = decodeZoneStatus(zoneStatus, buttonCount);
            if (action !== undefined) {
                return {action};
            }
        },
    } satisfies Fz.Converter<"ssIasZone", undefined, ["attributeReport", "readResponse", "commandStatusChangeNotification"]>;

    return {
        fromZigbee: [fromZigbee],
        exposes: [e.action(buttonActions(buttonCount))],
        configure: [m.setupConfigureForBinding("ssIasZone", "input")],
        isModernExtend: true,
    };
}

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "Aura Smart Button", manufacturerName: "Linxura"}],
        model: "SHCB-1-MO",
        vendor: "Linxura",
        description: "Aura 12-button smart controller",
        extend: [
            linxuraButton(12),
            m.battery({
                percentageReportingConfig: {min: "1_HOUR", max: 0, change: 1},
            }),
        ],
    },
    {
        fingerprint: [{modelID: "Smart Controller", manufacturerName: "Linxura"}],
        model: "SCHA-1-MO",
        vendor: "Linxura",
        description: "4-button smart controller",
        extend: [linxuraButton(4)],
    },
];
