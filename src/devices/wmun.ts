import * as m from "../lib/modernExtend";
import * as zosung from "../lib/zosung";
const ez = zosung.presetsZosung;
const fzZosung = zosung.fzZosung;
const tzZosung = zosung.tzZosung;
import type {DefinitionWithExtend} from "../lib/types";

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: [{modelID: "TS1201", manufacturerName: "_TZ3290_u9xac5rv"}],
        model: "ZS05",
        vendor: "WMUN",
        description: "Universal smart IR remote control on batteries",
        exposes: [ez.learn_ir_code(), ez.learned_ir_code(), ez.ir_code_to_send()],
        extend: [m.battery()],
        fromZigbee: [
            fzZosung.zosung_send_ir_code_00,
            fzZosung.zosung_send_ir_code_01,
            fzZosung.zosung_send_ir_code_02,
            fzZosung.zosung_send_ir_code_03,
            fzZosung.zosung_send_ir_code_04,
            fzZosung.zosung_send_ir_code_05,
        ],
        toZigbee: [tzZosung.zosung_ir_code_to_send, tzZosung.zosung_learn_ir_code],
    },
];
