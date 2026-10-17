import {Zcl} from "zigbee-herdsman";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

interface RamsesTxCluster {
    attributes: never;
    commands: {nativeMode: {enabled: boolean}};
    commandResponses: never;
}

/**
 * ELECRAM Ramses_esp32c6 — RAMSES II RF-to-Zigbee bridge (ESP32-C6).
 *
 * This device uses two manufacturer-specific clusters (command mode only):
 *
 *   0xFC00  ramsesRxCluster  OUTPUT cluster — ESP32 (client) → Coordinator (server)
 *     commands:         sendText  id=0x00  ESP32 sends a RAMSES frame (or chunk) to the coordinator
 *     commandsResponse: ackText   id=0x01  Coordinator ACKs each chunk back to the ESP32
 *
 *   0xFC01  ramsesTxCluster  INPUT cluster — Coordinator (client) → ESP32 (server)
 *     commands:         setText   id=0x00  Coordinator sends a RAMSES frame (or chunk) to the ESP32
 *     commandsResponse: ackChunk  id=0x01  ESP32 ACKs each chunk back to the coordinator
 *
 * This mirrors the ZHA quirk in zhaquirks/elecram/ramses_esp.py 1:1.
 * All MQTT bridging logic is handled by the external extension
 * ramses-esp-bridge.mjs — this definition only registers the custom clusters
 * so zigbee-herdsman can encode/decode their frames correctly.
 */
export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["Ramses_esp32c6"],
        model: "Ramses_esp32c6",
        vendor: "ELECRAM",
        description: "RAMSES II RF-to-Zigbee bridge (ESP32-C6)",
        ota: true,
        extend: [
            // 0xFC00 OUTPUT cluster: ESP32 (client) sends frames to coordinator (server).
            // Mirrors RamsesRXCluster / ClientCommandDefs + ServerCommandDefs in ramses_esp.py.
            m.deviceAddCustomCluster("ramsesRxCluster", {
                name: "ramsesRxCluster",
                ID: 0xfc00,
                attributes: {},
                commands: {
                    // Client command: ESP32 sends a RAMSES frame (or chunk) to coordinator.
                    sendText: {
                        name: "sendText",
                        ID: 0x00,
                        parameters: [{name: "text", type: Zcl.DataType.CHAR_STR}],
                    },
                },
                commandsResponse: {
                    receiveChunk: {
                        name: "receiveChunk",
                        ID: 0x02,
                        parameters: [
                            {name: "message_id", type: Zcl.DataType.UINT32},
                            {name: "sequence", type: Zcl.DataType.UINT8},
                            {name: "total", type: Zcl.DataType.UINT8},
                            {name: "text", type: Zcl.DataType.CHAR_STR},
                        ],
                    },
                    // Server→client response: coordinator ACKs each received chunk.
                    ackText: {
                        name: "ackText",
                        ID: 0x01,
                        parameters: [{name: "text", type: Zcl.DataType.CHAR_STR}],
                    },
                },
            }),

            // 0xFC01 INPUT cluster: coordinator (client) sends frames to ESP32 (server).
            // Mirrors RamsesTXCluster / ClientCommandDefs + ServerCommandDefs in ramses_esp.py.
            m.deviceAddCustomCluster("ramsesTxCluster", {
                name: "ramsesTxCluster",
                ID: 0xfc01,
                attributes: {},
                commands: {
                    // Client command: coordinator sends a RAMSES frame (or chunk) to ESP32.
                    setText: {
                        name: "setText",
                        ID: 0x00,
                        parameters: [{name: "text", type: Zcl.DataType.CHAR_STR}],
                    },
                    sendChunk: {
                        name: "sendChunk",
                        ID: 0x02,
                        parameters: [
                            {name: "message_id", type: Zcl.DataType.UINT32},
                            {name: "sequence", type: Zcl.DataType.UINT8},
                            {name: "total", type: Zcl.DataType.UINT8},
                            {name: "text", type: Zcl.DataType.CHAR_STR},
                        ],
                    },
                    nativeMode: {
                        name: "nativeMode",
                        ID: 0x03,
                        parameters: [{name: "enabled", type: Zcl.DataType.BOOLEAN}],
                    },
                },
                commandsResponse: {
                    // Server→client response: ESP32 ACKs each received chunk.
                    ackChunk: {
                        name: "ackChunk",
                        ID: 0x01,
                        parameters: [{name: "text", type: Zcl.DataType.CHAR_STR}],
                    },
                },
            }),
        ],
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
        configure: async (device) => {
            const endpoint = device.getEndpoint(10);
            if (endpoint.supportsOutputCluster("genOta")) {
                await endpoint.command<"ramsesTxCluster", "nativeMode", RamsesTxCluster>(
                    "ramsesTxCluster",
                    "nativeMode",
                    {enabled: true},
                    {disableDefaultResponse: true},
                );
            }
        },
    },
];
