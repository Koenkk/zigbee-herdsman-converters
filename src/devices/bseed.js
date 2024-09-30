"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const exposes = __importStar(require("../lib/exposes"));
const legacy = __importStar(require("../lib/legacy"));
const e = exposes.presets;
const ea = exposes.access;
const definitions = [
    {
        fingerprint: [
            { modelID: 'TS0601', manufacturerName: '_TZE200_yenbr4om' },
            { modelID: 'TS0601', manufacturerName: '_TZE204_bdblidq3' },
			{ modelID: 'TS0601', manufacturerName: '_TZE200_bdblidq3' },
        ],
        model: 'BSEED_TS0601_cover',
        vendor: 'BSEED',
        description: 'Zigbee curtain switch',
        fromZigbee: [legacy.fz.tuya_cover],
        toZigbee: [legacy.tz.tuya_cover_control],
        exposes: [e.cover_position().setAccess('position', ea.STATE_SET)],
    },
];
exports.default = definitions;
module.exports = definitions;
//# sourceMappingURL=bseed.js.map