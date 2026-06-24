import * as exposes from "../lib/exposes";
import type {DefinitionWithExtend, Fz, KeyValue, Tz} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

/* =========================================================
   UART TX helper
   Sends an ASCII string over genMultistateValue cluster.
   Follows ptvo_switch_uart pattern: plain string, type 0x42,
   writes to the first endpoint supporting the cluster.
   PTVO strips the Zigbee CharacterString length byte before
   forwarding to UART, so the MCU receives plain ASCII.
========================================================= */
async function uartWrite(meta: Tz.Meta, str: string): Promise<void> {
    if (!str.endsWith("\n")) str += "\n";
    // Raw attribute write: attribute 0x000E (stateText), type 0x42 (CharacterString)
    // PTVO strips the length byte before forwarding to UART
    // biome-ignore lint/suspicious/noExplicitAny: raw Zigbee attribute payload
    const payload: any = {14: {value: str, type: 0x42}};
    for (const ep of meta.device.endpoints) {
        if (ep.supportsInputCluster("genMultistateValue") || ep.supportsOutputCluster("genMultistateValue")) {
            await ep.write("genMultistateValue", payload);
            return;
        }
    }
    await meta.device.endpoints[0].write("genMultistateValue", payload);
}

const fzLocal = {
    /* RX — BADGE / PIN / ABANDON / TAMPER_ON / TAMPER_OFF
       PTVO sends raw ASCII bytes via genMultistateValue attributeReport.
       Format: "BADGE:XXXXXXXX\n", "PIN:XXXXXX\n", "ABANDON\n",
               "TAMPER_ON\n", "TAMPER_OFF\n"
       State is cleared automatically 5 seconds after publishing. */
    ptvo_wiegand_uart: {
        cluster: "genMultistateValue",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const raw = (msg.data as KeyValue)?.stateText ?? msg.data;
            if (!raw) return;

            let data: number[];
            if (Buffer.isBuffer(raw) || raw instanceof Uint8Array) {
                data = Array.from(raw);
            } else if (Array.isArray(raw)) {
                data = raw as number[];
            } else if (typeof raw === "object") {
                data = Object.values(raw as object) as number[];
            } else {
                return;
            }

            const str = data
                .map((b: number) => String.fromCharCode(b))
                .join("")
                .replace(/[\r\n]+$/, "");

            const clear: KeyValue = {action: "clear", pin_number: 0, badge_number: 0, event: "none"};
            const clearAfter = (): void => {
                if (typeof publish === "function") setTimeout(() => publish(clear), 5000);
            };

            if (str.startsWith("PIN:")) {
                const pin = str.slice(4);
                if (/^\d{6}$/.test(pin)) {
                    clearAfter();
                    return {action: `PIN:${pin}`, pin_number: Number.parseInt(pin, 10), event: "pin"};
                }
            }
            if (str.startsWith("BADGE:")) {
                const badge = str.slice(6);
                if (/^\d+$/.test(badge) && badge.length >= 4) {
                    clearAfter();
                    return {action: `BADGE:${badge}`, badge_number: Number.parseInt(badge, 10), event: "badge"};
                }
            }
            if (str === "ABANDON") {
                clearAfter();
                return {action: "ABANDON", event: "abandon"};
            }
            if (str === "TAMPER_ON") {
                clearAfter();
                return {action: "TAMPER_ON", event: "tamper_on"};
            }
            if (str === "TAMPER_OFF") {
                clearAfter();
                return {action: "TAMPER_OFF", event: "tamper_off"};
            }
        },
    } satisfies Fz.Converter<"genMultistateValue", undefined, ["attributeReport", "readResponse"]>,
};

const tzLocal = {
    /* TX — CODE_OK / CODE_KO: grant or deny access */
    ptvo_uart_action: {
        key: ["action"],
        convertSet: async (entity, key, value, meta) => {
            if (value !== "CODE_OK" && value !== "CODE_KO") {
                throw new Error(`ptvo_uart_action: unsupported value: ${String(value)}`);
            }
            await uartWrite(meta, value as string);
        },
    } satisfies Tz.Converter,

    /* TX — DELAY_LOCKOUT=X  (1-255 minutes, persisted in MCU EEPROM) */
    ptvo_delay_lockout: {
        key: ["delay_lockout"],
        convertSet: async (entity, key, value, meta) => {
            const v = Number.parseInt(String(value), 10);
            if (Number.isNaN(v) || v < 1 || v > 255) {
                throw new Error(`ptvo_delay_lockout: invalid value (1-255): ${String(value)}`);
            }
            await uartWrite(meta, `DELAY_LOCKOUT=${v}`);
        },
    } satisfies Tz.Converter,

    /* TX — UNLOCK_CODE=XXXXXXXXXX (10 digits, persisted in MCU EEPROM)
       padStart restores leading zeros that may be lost by integer conversion. */
    ptvo_unlock_code: {
        key: ["unlock_code"],
        convertSet: async (entity, key, value, meta) => {
            const str = String(Math.round(Number(value))).padStart(10, "0");
            if (!/^\d{10}$/.test(str)) {
                throw new Error(`ptvo_unlock_code: exactly 10 digits required: ${String(value)}`);
            }
            await uartWrite(meta, `UNLOCK_CODE=${str}`);
        },
    } satisfies Tz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["ptvo_wiegand"],
        model: "ptvo_wiegand",
        vendor: "ptvo.info",
        description: "UART Wiegand badge reader",
        fromZigbee: [fzLocal.ptvo_wiegand_uart],
        toZigbee: [tzLocal.ptvo_uart_action, tzLocal.ptvo_delay_lockout, tzLocal.ptvo_unlock_code],
        exposes: [
            e.enum("action", ea.SET, ["CODE_OK", "CODE_KO"]),
            e
                .numeric("delay_lockout", ea.SET)
                .withValueMin(1)
                .withValueMax(255)
                .withUnit("min")
                .withDescription("Lockout duration after too many wrong attempts (1-255 min, stored in EEPROM)"),
            e
                .numeric("unlock_code", ea.SET)
                .withValueMin(0)
                .withValueMax(9999999999)
                .withDescription("Emergency unlock code (10 digits, leading zeros preserved, stored in EEPROM)"),
            e.numeric("pin_number", ea.STATE),
            e.numeric("badge_number", ea.STATE),
            e.enum("event", ea.STATE, ["none", "pin", "badge", "abandon", "tamper_on", "tamper_off"]),
        ],
        meta: {multiEndpoint: true},
        endpoint: () => ({l1: 1, l2: 2, l3: 3}),
    },
];
