import * as exposes from "../lib/exposes";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend, Fz, OnEvent} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

// DAEWOO WKE502Z — Zigbee keypad with RFID badge reader (TS0601 / _TZE200_rt5dklro)
//
// Key discovery: dp:101 "hub mode" flag — MUST be written true after every power cycle
// for dp:27 (arm_away) and dp:28 (arm_home) to fire. Without it the keypad processes
// arm actions locally but sends no Zigbee frame. Resets to false on every power cycle.
//
// ACK protocol: after dp:27/dp:28, the keypad retries until the hub writes dp:23=true.
// This converter handles both the hub mode re-arm (deviceAnnounce) and the ACK automatically.
//
// Confirmed DP map via serial (MCU UART) + Zigbee capture:
//   DP 3  (u32)  — battery %
//   DP 23 (bool) — arm state; hub must write true to ACK arm_away/arm_home
//   DP 24 (bool) — tamper
//   DP 25 (enum) — arm mode at STARTUP ONLY: 0=disarmed, 2=armed
//   DP 26        — disarm action
//   DP 27        — arm_away action (requires dp:101=true; retries until ACK dp:23=true)
//   DP 28        — arm_home action (requires dp:101=true; retries until ACK dp:23=true)
//   DP 29        — sos action (unconditional)
//   DP 101(bool) — hub mode flag
//   DP 103       — arm delay time (0–180 s)
//   DP 104       — beep on key press (volatile)
//   DP 105       — quick arm home (volatile)
//   DP 106       — quick disarm (volatile)
//   DP 107       — quick arm away (volatile)
//   DP 108       — admin code
//   DP 109       — last added user code
//   DP 110       — quick SOS (volatile)
//   DP 111       — arm delay beep
//   DP 112 (u32) — user_id: RFID badge slot or PIN user index

function localISOString(): string {
    const now = new Date();
    const off = -now.getTimezoneOffset();
    const sign = off >= 0 ? "+" : "-";
    const pad = (n: number) => String(Math.abs(n)).padStart(2, "0");
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .replace("Z", `${sign}${pad(Math.floor(Math.abs(off) / 60))}:${pad(Math.abs(off) % 60)}`);
}

// ACK arm_away (dp:27) and arm_home (dp:28) with dp:23=true so the keypad stops retrying.
// Code validation is done by the keypad hardware before sending these DPs.
const fzAck = {
    cluster: "manuSpecificTuya",
    type: ["commandDataResponse", "commandDataReport", "commandActiveStatusReport", "commandActiveStatusReportAlt"],
    convert: async (_model, msg, _publish, _options, meta) => {
        if (msg.data.dpValues.some((d) => d.dp === 27 || d.dp === 28)) {
            const endpoint = meta.device.getEndpoint(1);
            if (endpoint) {
                await tuya.sendDataPointBool(endpoint, 23, true, "dataRequest", 1);
            }
        }
    },
} satisfies Fz.Converter<
    "manuSpecificTuya",
    undefined,
    ["commandDataResponse", "commandDataReport", "commandActiveStatusReport", "commandActiveStatusReportAlt"]
>;

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0601", ["_TZE200_rt5dklro"]),
        model: "WKE502Z",
        vendor: "DAEWOO",
        description: "Smart Zigbee keypad with RFID badge reader",
        extend: [tuya.modernExtend.tuyaBase({dp: true})],
        fromZigbee: [fzAck],
        exposes: [
            e.action(["disarm", "arm_away", "arm_home", "sos"]),
            e.numeric("arm_mode", ea.STATE).withDescription("Arm mode reported at startup only: 0=disarmed, 2=armed. NOT updated in real-time."),
            e
                .binary("armed", ea.STATE_SET, true, false)
                .withDescription("Arm state — write true to manually confirm arm_away/arm_home to the keypad"),
            e.binary("sos_alarm", ea.STATE, true, false).withDescription("SOS alarm active — set true by SOS keypress, cleared false by disarm"),
            e.battery(),
            e.tamper(),
            e.text("user_id", ea.STATE).withDescription("User ID (RFID badge slot or PIN index) that triggered the last action"),
            e.text("user_last_seen", ea.STATE).withDescription("ISO timestamp of last user authentication — updates on every badge/code event"),
            e.text("last_added_user_code", ea.STATE).withDescription("Last code entered by a user"),
            e.text("admin_code", ea.STATE_SET).withDescription("Admin code (change with caution)"),
            e
                .numeric("arm_delay_time", ea.STATE_SET)
                .withValueMin(0)
                .withValueMax(180)
                .withUnit("s")
                .withDescription("Delay before arming (0-180 s)"),
            e.binary("beep_sound_enabled", ea.STATE_SET, "ON", "OFF").withDescription("Enable keypad beep on key press"),
            e.binary("arm_delay_beep_sound", ea.STATE_SET, "ON", "OFF").withDescription("Beep during arm delay countdown"),
            e.binary("quick_home_enabled", ea.STATE_SET, "ON", "OFF").withDescription("Allow arm-home without entering a code"),
            e.binary("quick_arm_enabled", ea.STATE_SET, "ON", "OFF").withDescription("Allow arm-away without entering a code"),
            e.binary("quick_disarm_enabled", ea.STATE_SET, "ON", "OFF").withDescription("Allow disarm without entering a code"),
            e.binary("quick_sos_enabled", ea.STATE_SET, "ON", "OFF").withDescription("Allow SOS without entering a code"),
        ],
        meta: {
            tuyaDatapoints: [
                // dp:23 from: null key → Object.assign (armed state only, no action — avoids
                // spurious 'arm' events when the hub ACK or SOS follow-up dp:23=true arrive)
                [23, null, {from: (v: boolean | number) => ({armed: v === true || v === 1})}],
                // dp:23 to: write armed=true/false → sends dp:23=1/0 (hub ACK for arm_away/arm_home)
                [23, "armed", {to: (v: boolean) => (v ? 1 : 0)}],

                [3, "battery", tuya.valueConverter.raw],

                [
                    24,
                    "tamper",
                    {
                        from: (v: boolean | number) => v === true || v === 1,
                        to: (v: boolean) => (v ? 1 : 0),
                    },
                ],

                [25, "arm_mode", tuya.valueConverter.raw],

                // Action DPs: include user_last_seen so it always refreshes even when dp:112
                // does not accompany the action frame (observed for arm_away / arm_home)
                [26, null, {from: () => ({action: "disarm", sos_alarm: false, user_last_seen: localISOString()})}],
                [27, null, {from: () => ({action: "arm_away", armed: true, user_last_seen: localISOString()})}],
                [28, null, {from: () => ({action: "arm_home", armed: true, user_last_seen: localISOString()})}],
                [29, null, {from: () => ({action: "sos", sos_alarm: true, user_last_seen: localISOString()})}],

                [103, "arm_delay_time", tuya.valueConverter.raw],
                [104, "beep_sound_enabled", tuya.valueConverter.onOff],
                [105, "quick_home_enabled", {from: tuya.valueConverter.onOff.from, to: (v: string) => v === "ON"}],
                [106, "quick_disarm_enabled", tuya.valueConverter.onOff],
                [107, "quick_arm_enabled", tuya.valueConverter.onOff],
                [108, "admin_code", tuya.valueConverter.raw],
                [109, "last_added_user_code", tuya.valueConverter.raw],
                [110, "quick_sos_enabled", {from: tuya.valueConverter.onOff.from, to: (v: string) => v === "ON"}],
                [111, "arm_delay_beep_sound", tuya.valueConverter.onOff],
                // dp:112: overrides user_last_seen with a fresher timestamp when user_id is present
                [112, null, {from: (v: number) => ({user_id: String(v), user_last_seen: localISOString()})}],
                [101, null, {from: () => undefined}], // hub mode echo — suppress "not defined" warning
            ],
        },
        configure: async (device, coordinatorEndpoint) => {
            await tuya.configureMagicPacket(device, coordinatorEndpoint);
            const endpoint = device.getEndpoint(1);
            if (endpoint) {
                // Enable hub mode so arm_away (dp:27) and arm_home (dp:28) fire over Zigbee
                await tuya.sendDataPointBool(endpoint, 101, true, "dataRequest", 1);
            }
        },
        onEvent: (async (event) => {
            if (event.type === "deviceAnnounce") {
                const endpoint = event.data.device.getEndpoint(1);
                if (endpoint) {
                    // Re-enable hub mode after every power cycle
                    await tuya.sendDataPointBool(endpoint, 101, true, "dataRequest", 1);
                    // DP 104/105/106/107/110 are volatile: reset to firmware defaults on power cycle.
                    // Restore from Z2M cached state so user settings survive reboots.
                    const s = event.data.state;
                    const volatileBoolDps: [number, string][] = [
                        [104, "beep_sound_enabled"],
                        [105, "quick_home_enabled"],
                        [106, "quick_disarm_enabled"],
                        [107, "quick_arm_enabled"],
                        [110, "quick_sos_enabled"],
                    ];
                    for (const [dp, key] of volatileBoolDps) {
                        if (s[key] !== undefined) {
                            await tuya.sendDataPointBool(endpoint, dp, s[key] === "ON" || s[key] === true, "dataRequest", 1);
                        }
                    }
                }
            }
        }) satisfies OnEvent.Handler,
    },
];
