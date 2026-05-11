import * as m from "../lib/modernExtend";
import * as tuya from "../lib/tuya";
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: tuya.fingerprint("TS0001", ["_TZ3000_bezfthwc"]),
        model: "RDCBC/Z",
        vendor: "SOHAN Electric",
        description: "DIN circuit breaker (1 pole / 2 poles)",
        extend: [m.onOff()],
        fromZigbee: [],
    },
];
