import {afterEach, describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import * as globalStore from "../src/lib/store";
import type {Fz} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("Moes meter segmented reports", () => {
    afterEach(() => globalStore.clear());
    const payload = Buffer.from("010001020004000004d2", "hex");

    const setup = async () => {
        const device = mockDevice({modelID: "TS0601", manufacturerName: "_TZE284_cf4b5ktf", endpoints: [{ID: 1}]});
        const definition = await findByDevice(device);
        const endpoint = device.getEndpoint(1);
        const publish = vi.fn();
        const meta = {device, state: {}, deviceExposesChanged: () => {}};
        const convert = async (type: string, data: object) => {
            const converter = definition.fromZigbee.find((entry) => entry.cluster === "zosungIRTransmit" && entry.type.includes(type));
            if (!converter) throw new Error(`Missing converter for ${type}`);
            await converter.convert(definition, {device, endpoint, meta: {}, data} as unknown as Fz.Message<"zosungIRTransmit">, publish, {}, meta);
        };
        const start = () => convert("commandZosungSendIRCode00", {seq: 1, length: payload.length, unk2: 0xef00, cmd: 2});
        const fragment = (position: number, part: Buffer, crc = part.reduce((sum, byte) => (sum + byte) & 0xff, 0)) =>
            convert("commandZosungSendIRCode03Resp", {seq: 1, position, msgpart: part, msgpartcrc: crc});
        return {publish, start, fragment};
    };

    it.each([0, 3])("ignores a repeated valid fragment at position %s and publishes the complete report once", async (duplicatePosition) => {
        const {publish, start, fragment} = await setup();
        await start();
        for (const [position, end] of [
            [0, 3],
            [3, 6],
            [6, 10],
        ]) {
            const part = payload.subarray(position, end);
            await fragment(position, part);
            if (position === duplicatePosition) await fragment(position, part);
        }
        await fragment(6, payload.subarray(6));
        expect(publish.mock.calls).toEqual([[{energy: 12.34}]]);
    });

    it.each([
        {name: "checksum", position: 0, part: payload.subarray(0, 3), crc: 255},
        {name: "conflicting duplicate", position: 0, part: Buffer.from([9, 9, 9])},
        {name: "out of order", position: 6, part: payload.subarray(6)},
        {name: "overlapping", position: 0, part: payload.subarray(0, 6)},
        {name: "empty", position: 0, part: Buffer.alloc(0)},
        {name: "oversized", position: 3, part: Buffer.alloc(payload.length)},
    ])("rejects an invalid $name fragment without publishing a partial report", async ({position, part, crc}) => {
        const {publish, start, fragment} = await setup();
        await start();
        await fragment(0, payload.subarray(0, 3));
        await fragment(position, part, crc);
        await fragment(3, payload.subarray(3));
        expect(publish).not.toHaveBeenCalled();
    });
});
