import {describe, expect, it, vi} from "vitest";
import {findByDevice} from "../src/index";
import * as tuya from "../src/lib/tuya";
import type {Expose} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("NOUS D1Z", () => {
    const createDevice = () => mockDevice({modelID: "TS0601", manufacturerName: "_TZE204_vfnf7zhq", endpoints: [{ID: 1}]});

    it("matches only the new fingerprint and maps only the verified datapoints", async () => {
        const device = createDevice();
        const definition = await findByDevice(device);
        expect(definition.model).toBe("D1Z");
        expect(definition.vendor).toBe("Nous");
        expect(definition.meta?.tuyaDatapoints?.map(([dp]) => dp)).toEqual([1, 6, 16]);
        expect((definition.exposes as Expose[]).map((expose) => expose.property ?? expose.type)).toEqual([
            "switch",
            "voltage",
            "current",
            "power",
            "energy",
        ]);

        const olderDevice = mockDevice({modelID: "TS011F", manufacturerName: "_TZ3000_2iiimqs9", endpoints: [{ID: 1}]});
        expect((await findByDevice(olderDevice)).model).toBe("DZ");

        const d5z = mockDevice({modelID: "TS0601", manufacturerName: "_TZE204_t9ffmdin", endpoints: [{ID: 1}]});
        const d5zDefinition = await findByDevice(d5z);
        expect(d5zDefinition.model).toBe("D5Z");
        expect(d5zDefinition.meta?.tuyaDatapoints?.find(([dp]) => dp === 16)?.[2]).toBe(tuya.valueConverter.onOffWithZeros);
    });

    it("decodes relay state and metering reports", async () => {
        const device = createDevice();
        const definition = await findByDevice(device);
        const converter = definition.fromZigbee.find((candidate) => candidate === tuya.fz.datapoints);
        expect(converter).toBeDefined();

        const msg = {
            device,
            endpoint: device.getEndpoint(1),
            meta: {zclTransactionSequenceNumber: 101},
            data: {
                dpValues: [
                    {dp: 16, datatype: 1, data: Buffer.from([1])},
                    {dp: 6, datatype: 0, data: Buffer.from([0x08, 0xfc, 0, 0x03, 0xe8, 0, 0, 0x64])},
                    {dp: 1, datatype: 2, data: Buffer.from([0, 0, 0, 100])},
                ],
            },
        };
        const publish = vi.fn();
        const meta = {device, state: {}};
        expect(converter?.convert(definition, msg as never, publish, {}, meta as never)).toEqual({
            state: "ON",
            voltage: 230,
            current: 1,
            power: 100,
            energy: 1,
        });
        msg.data.dpValues = [{dp: 16, datatype: 1, data: Buffer.from([0])}];
        msg.meta.zclTransactionSequenceNumber = 102;
        expect(converter?.convert(definition, msg as never, publish, {}, meta as never)).toEqual({state: "OFF"});
        expect(publish).not.toHaveBeenCalled();
    });

    it("sends ON and OFF commands through datapoint 16", async () => {
        const device = createDevice();
        const definition = await findByDevice(device);
        const converter = definition.toZigbee.find((candidate) => candidate.convertSet === tuya.tz.datapoints.convertSet);
        expect(converter).toBeDefined();

        for (const [state, data] of [
            ["ON", 1],
            ["OFF", 0],
        ] as const) {
            await converter?.convertSet?.(device.getEndpoint(1), "state", state, {
                state: {},
                device,
                message: {state},
                mapped: definition,
                options: {},
                publish: () => {},
                endpoint_name: undefined,
                deviceExposesChanged: () => {},
            });
            expect(device.getEndpoint(1).command).toHaveBeenCalledWith(
                "manuSpecificTuya",
                "dataRequest",
                {seq: 1, dpValues: [{dp: 16, datatype: 1, data: Buffer.from([data])}]},
                {disableDefaultResponse: true},
            );
        }
    });
});
