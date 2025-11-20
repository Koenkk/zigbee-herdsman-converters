import assert from "node:assert";
import {type Controller, Zcl} from "zigbee-herdsman";
import type {RawPayload} from "zigbee-herdsman/dist/controller/tstype";
import type {CustomClusters} from "zigbee-herdsman/dist/zspec/zcl/definition/tstype";
import {logger} from "../lib/logger";
import * as utils from "../lib/utils";

const NS = "zhc:raw";

/** biome-ignore-start lint/style/useNamingConvention: MQTT convention */
export interface MqttRawPayload {
    ieee_address?: string;
    network_address?: number;
    group_id?: number;
    dst_endpoint?: number;
    /** defaults to `ZSpec.HA_ENDPOINT` */
    src_endpoint?: number;
    /** defaults to false */
    interpan?: boolean;
    /** defaults to `ZSpec.HA_PROFILE_ID` */
    profile_id?: number;
    /** Expected as `number` for ZDO */
    cluster_key?: number | string;
    /** Only used for ZDO */
    zdo_args?: unknown[];
    /** Only used for ZCL */
    zcl?: {
        frame_type?: number;
        direction?: number;
        disable_default_response?: boolean;
        manufacturer_code?: number;
        tsn?: number;
        command_key: string;
        payload?: Record<string, unknown> | Record<string, unknown>[];
    };
    /** defaults to false */
    disable_response?: boolean;
    /** defaults to 10000 */
    timeout?: number;
}
/** biome-ignore-end lint/style/useNamingConvention: MQTT convention */

const ClusterHueTouchlink: CustomClusters = {
    manuSpecificPhilipsPairing: {
        ID: 0x1000,
        manufacturerCode: Zcl.ManufacturerCode.SIGNIFY_NETHERLANDS_B_V,
        attributes: {},
        commands: {
            hueResetRequest: {
                ID: 0,
                parameters: [
                    {name: "extendedPanId", type: Zcl.DataType.IEEE_ADDR},
                    {name: "serialCount", type: Zcl.DataType.UINT8},
                    {name: "serialNumbers", type: Zcl.BuffaloZclDataType.LIST_UINT32},
                ],
            },
        },
        commandsResponse: {},
    },
};

export const RAW_PAYLOADS: Record<string, MqttRawPayload> = {};

/** biome-ignore-start lint/style/useNamingConvention: MQTT convention */
export const QUICK_ACTIONS: Record<string, (controller: Controller, args: Record<string, unknown>) => ReturnType<typeof controller.sendRaw>> = {
    hue_factory_reset: async (controller, args): Promise<undefined> => {
        assert(typeof args.extended_pan_id === "string" && /^0x[a-f0-9]{16}$/.test(args.extended_pan_id));
        assert(Array.isArray(args.serial_numbers));

        const rawPayload: RawPayload = {
            clusterKey: "manuSpecificPhilipsPairing",
            interPan: true,
            zcl: {
                frameType: Zcl.FrameType.SPECIFIC,
                direction: Zcl.Direction.CLIENT_TO_SERVER,
                disableDefaultResponse: true,
                manufacturerCode: Zcl.ManufacturerCode.SIGNIFY_NETHERLANDS_B_V,
                tsn: 0,
                commandKey: "hueResetRequest",
                payload: {extendedPanId: args.extended_pan_id, serialCount: args.serial_numbers.length, serialNumbers: args.serial_numbers},
            },
            disableResponse: true,
        };

        controller.touchlink.lock(true);

        try {
            for (const channel of [11, 15, 20, 25, 12, 13, 14, 16, 17, 18, 19, 21, 22, 23, 24, 26]) {
                await controller.touchlink.setChannelInterPAN(channel);

                try {
                    await controller.sendRaw(rawPayload, ClusterHueTouchlink);

                    // Try not to completely flood the airspace
                    await utils.sleep(1000);
                } catch (error) {
                    logger.warning(`Hue reset request failed to send: '${error}'`, NS);
                }
            }
        } finally {
            controller.touchlink.restoreChannelInterPAN();
            controller.touchlink.lock(false);
        }
    },
};
/** biome-ignore-end lint/style/useNamingConvention: MQTT convention */
