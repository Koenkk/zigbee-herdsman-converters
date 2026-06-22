import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz} from "../lib/types";

const e = exposes.presets;

// The Wyze Lock v1 reports lock state via manufacturer-specific cluster 64512 (0xFC00)
// raw frames rather than standard ZCL lock operation events.
// Only len=85 frames reliably encode physical lock state at byte 80:
//   low two bits 0b11 = locked, 0b00 = unlocked.
// Heartbeat/rejoin frames (len=123) always have byte 80 = 0 regardless of actual state
// and must be skipped to avoid corrupting HA state on Z2M restart.
// fz.lock is intentionally excluded: the device sends a ZCL lockState attribute report
// (cluster 0x0101) approximately every hour that always contains lockState=1 (locked)
// regardless of the actual physical state, causing false "locked" updates in HA.
const fzLocal = {
    wyzeLockRaw: {
        cluster: 64512,
        type: ["raw"],
        convert: (model, msg) => {
            if (msg.data?.length !== 85) return undefined;
            const stateBit = msg.data[80] & 3;
            if (stateBit === 3) return {state: "LOCK", lock_state: "locked"};
            if (stateBit === 0) return {state: "UNLOCK", lock_state: "unlocked"};
        },
    } satisfies Fz.Converter<64512, undefined, ["raw"]>,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Ford"],
        model: "WLCKG1",
        vendor: "Wyze",
        description: "Lock",
        fromZigbee: [fz.battery, fzLocal.wyzeLockRaw],
        toZigbee: [tz.lock],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.endpoints[0];
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresDoorLock", "genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.lock(), e.battery()],
    },
];
