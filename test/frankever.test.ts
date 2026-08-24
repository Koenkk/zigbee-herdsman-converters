import {describe, expect, it} from "vitest";
import {findByDevice, type Tz} from "../src/index";
import * as tuya from "../src/lib/tuya";
import type {Fz} from "../src/lib/types";
import {mockDevice} from "./utils";

// Converter state is cached per device address, so every case needs its own.
const mockFkBv05 = (ieeeAddr: string) => mockDevice({modelID: "TS0601", manufacturerName: "_TZE200_nbqnmkee", endpoints: [{}], ieeeAddr});

describe("FK-BV05", () => {
    // The datapoint spec defines dp 5 with "Multiple: 1" (0.1 L per unit) and dp 6 with "Multiple: 0" (1 L per unit).
    it.each([
        {dp: 5, raw: 300, expected: {water_consumed_last: 30}},
        {dp: 6, raw: 30, expected: {water_consumed_total: 30}},
    ])("reports dp $dp in liters", async ({dp, raw, expected}) => {
        const device = mockFkBv05(`0xfkbv05000${dp}`);
        const definition = await findByDevice(device);
        const converters = definition.fromZigbee.filter((c) => c.cluster === "manuSpecificTuya");
        const converter = converters[converters.length - 1];
        if (!converter) throw new Error("no tuya datapoint fromZigbee converter");
        const msg = {
            data: {seq: 1, dpValues: [{dp, datatype: tuya.dataTypes.number, data: Buffer.from(tuya.convertDecimalValueTo4ByteHexArray(raw))}]},
            device,
            endpoint: device.endpoints[0],
            type: "commandDataReport",
            meta: {zclTransactionSequenceNumber: dp},
            // biome-ignore lint/suspicious/noExplicitAny: generic
        } as unknown as Fz.Message<any, any, any>;

        // biome-ignore lint/suspicious/noExplicitAny: generic
        const result = await converter.convert(definition, msg, null, {}, {device, state: {}} as any);

        expect(result).toStrictEqual(expected);
    });

    // Sending these as a 4-byte value instead of an enum is rejected by the device.
    it.each([
        {key: "weather_delay", value: "24h", dp: 10, encoded: 1},
        {key: "power_off_state", value: "maintain", dp: 110, encoded: 2},
    ])("sends $key as an enum datapoint", async ({key, value, dp, encoded}) => {
        const device = mockFkBv05(`0xfkbv05100${dp}`);
        const definition = await findByDevice(device);
        const converter = definition.toZigbee.find((c) => !c.key);
        if (!converter?.convertSet) throw new Error("no tuya datapoint toZigbee converter");
        const meta = {
            state: {},
            device,
            message: {[key]: value},
            mapped: definition,
            options: {},
            publish: null,
            endpoint_name: null,
        } as unknown as Tz.Meta;

        await converter.convertSet(device.endpoints[0], key, value, meta);

        expect(device.endpoints[0].command).toHaveBeenCalledWith(
            "manuSpecificTuya",
            "dataRequest",
            {seq: expect.any(Number), dpValues: [{dp, datatype: tuya.dataTypes.enum, data: Buffer.from([encoded])}]},
            {disableDefaultResponse: true},
        );
    });
});
