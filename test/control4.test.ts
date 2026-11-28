import {describe, expect, it, vi} from "vitest";
import {Zcl} from "zigbee-herdsman";
import {findByDevice} from "../src/index";
import type {Fz} from "../src/lib/types";
import {mockDevice} from "./utils";

// Frames captured from an SR260 (firmware 2.2.50) joined to an EM357 coordinator.
const COORDINATOR = "0x000fff0000622978";

const sr260 = async () => {
    const device = mockDevice(
        {
            modelID: "C4-Zigbee",
            manufacturerID: 0xabcd,
            ieeeAddr: "0x000fff00005a90e5",
            endpoints: [
                {ID: 1, inputClusters: ["genPowerCfg", "genBasic"]},
                {ID: 2, inputClusters: []},
                {ID: 0xc5, inputClusters: []},
            ],
        },
        "EndDevice",
    );
    const definition = await findByDevice(device);
    return {device, definition};
};

const convert = async (cluster: string, type: string, endpointId: number, data: unknown) => {
    const {device, definition} = await sr260();
    device.meta.c4Coordinator = COORDINATOR;
    const endpoint = device.getEndpoint(endpointId);
    const results = [];
    for (const c of definition.fromZigbee.filter((c) => c.cluster === cluster && c.type.includes(type))) {
        const msg = {data, endpoint, device, type, cluster, linkquality: 255, groupID: 0, meta: {}} as unknown as Fz.Message;
        results.push(await c.convert(definition, msg, () => {}, {}, {state: {}, device} as unknown as Fz.Meta));
    }
    return {endpoint, results: results.filter((r) => r !== undefined)};
};

const text = (s: string) => Buffer.from(`${s}\r\n`, "latin1");

describe("Control4 SR260", () => {
    it("turns its text frames into actions and battery", async () => {
        const decode = async (s: string) => (await convert("genPowerCfg", "raw", 0xc5, text(s))).results[0];
        expect(await decode("0t422c sa c4.zr.bb 02 0000 0000")).toStrictEqual({action: "control4_press"});
        expect(await decode("0tecf3 sa c4.zr.bh 0c 0000 0000")).toStrictEqual({action: "volume_up_hold"});
        expect(await decode("0tecfa sa c4.zr.be 0c 0000 0000")).toStrictEqual({action: "volume_up_release"});
        expect(await decode("0t4236 sa c4.zr.bb 31 0000 0000 00000000")).toStrictEqual({action: "pound_press"});
        expect(await decode("0t422b sa c4.zr.mot")).toStrictEqual({action: "wake"});
        expect(await decode("0tece9 sa c4.zr.bl 4d")).toStrictEqual({battery: 77});
        // A controller's reply, an unknown key, a menu announcement: nothing.
        expect(await decode("0r0001 000")).toBeUndefined();
        expect(await decode("0t0001 sa c4.zr.bb 32 0000 0000")).toBeUndefined();
        expect(await decode("0t0001 sa c4.ln.is 0001 0003 0001")).toBeUndefined();
    });

    it("answers the identity read on its own profile", async () => {
        const {device, definition} = await sr260();
        device.meta.c4Coordinator = COORDINATOR;
        await definition.onEvent?.({type: "start", data: {device, state: {}, options: {}, deviceExposesChanged: () => {}}});
        const endpoint = device.getEndpoint(2);
        const readResponse = vi.spyOn(endpoint, "readResponse").mockResolvedValue(undefined);
        const read = (attrIds: number[]) =>
            device.customReadResponse?.(
                Zcl.Frame.create(
                    Zcl.FrameType.GLOBAL,
                    Zcl.Direction.CLIENT_TO_SERVER,
                    false,
                    undefined,
                    0x75,
                    "read",
                    "genPowerCfg",
                    attrIds.map((attrId) => ({attrId})),
                    {},
                ),
                endpoint,
            );
        expect(read([0x0008, 0x0009, 0x000a])).toBe(true);
        expect(read([0x000c, 0x0001])).toBe(true);
        const options = {profileId: 0xc25d, srcEndpoint: 2, disableDefaultResponse: true};
        expect(readResponse.mock.calls).toStrictEqual([
            [
                "genPowerCfg",
                0x75,
                {
                    8: {value: 0, type: Zcl.DataType.UINT16},
                    9: {value: COORDINATOR, type: Zcl.DataType.IEEE_ADDR},
                    10: {value: 2, type: Zcl.DataType.UINT8},
                },
                options,
            ],
            ["genPowerCfg", 0x75, {12: {value: undefined, type: Zcl.DataType.NO_DATA}, 1: {value: undefined, type: Zcl.DataType.NO_DATA}}, options],
        ]);
        // Reads on other endpoints are left to zigbee-herdsman.
        expect(
            device.customReadResponse?.(Zcl.Frame.create(0, 0, false, undefined, 1, "read", "genPowerCfg", [{attrId: 0}], {}), device.getEndpoint(1)),
        ).toBe(false);
    });

    it("answers its check-in with the identity", async () => {
        const {device, definition} = await sr260();
        device.meta.c4Coordinator = COORDINATOR;
        const endpoint = device.getEndpoint(2);
        const report = vi.spyOn(endpoint, "report").mockResolvedValue(undefined);
        const converter = definition.fromZigbee.find((c) => c.cluster === "genPowerCfg" && c.type.includes("attributeReport"));
        const checkin = {4: "2.2.50", 5: 7, 6: 6424, 7: "c4:control4_sr260:C4-SR260"};
        const msg = {data: checkin, endpoint, device, type: "attributeReport", cluster: "genPowerCfg", meta: {}} as unknown as Fz.Message;
        await converter?.convert(definition, msg, () => {}, {}, {state: {}, device} as unknown as Fz.Meta);
        expect(report.mock.calls).toStrictEqual([
            [
                "genPowerCfg",
                {
                    8: {value: 0, type: Zcl.DataType.UINT16},
                    9: {value: COORDINATOR, type: Zcl.DataType.IEEE_ADDR},
                    10: {value: 2, type: Zcl.DataType.UINT8},
                },
                {profileId: 0xc25d, srcEndpoint: 2, disableDefaultResponse: true},
            ],
        ]);
    });
});
