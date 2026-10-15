import {describe, expect, it} from "vitest";
import {findByDevice} from "../src/index";
import type {Fz, KeyValueAny} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("Schneider Electric S520567", () => {
    const convertReport = async (data: KeyValueAny, type: "attributeReport" | "readResponse" = "attributeReport") => {
        const device = mockDevice({
            modelID: "NHPB/SHUTTER/1",
            manufacturerName: "Schneider Electric",
            endpoints: [
                {ID: 5, inputClusters: ["closuresWindowCovering"]},
                {ID: 21, inputClusters: ["genOnOff"]},
            ],
        });
        const definition = await findByDevice(device);
        const converter = definition.fromZigbee?.find(
            (c) => c.cluster === "closuresWindowCovering" && c.type.includes(type) && c.options !== undefined,
        );
        if (converter === undefined) throw new Error("no closuresWindowCovering position converter on the definition");

        const msg = {
            data,
            endpoint: device.getEndpoint(5),
            device,
            meta: null,
            groupID: null,
            type,
            cluster: "closuresWindowCovering",
            linkquality: 255,
        } as unknown as Fz.Message<"closuresWindowCovering", undefined, "attributeReport" | "readResponse">;

        const meta = {state: {}, device, deviceExposesChanged: () => {}} as unknown as Fz.Meta;
        const payload = await converter.convert(definition, msg, () => {}, {}, meta);
        if (payload === undefined) throw new Error("converter published nothing");

        const exposes = typeof definition.exposes === "function" ? definition.exposes(device, {}) : definition.exposes;

        return {exposes, payload};
    };

    const convertLiftReport = (currentPositionLiftPercentage: number) => convertReport({currentPositionLiftPercentage});

    it("reports state alongside position for a lift percentage report", async () => {
        expect((await convertLiftReport(50)).payload).toStrictEqual({position: 50, state: "OPEN"});
        expect((await convertLiftReport(0)).payload).toStrictEqual({position: 0, state: "CLOSE"});
        expect((await convertLiftReport(100)).payload).toStrictEqual({position: 100, state: "OPEN"});
    });

    it("reports state on a read response as well as an attribute report", async () => {
        const {payload} = await convertReport({currentPositionLiftPercentage: 30}, "readResponse");
        expect(payload).toStrictEqual({position: 30, state: "OPEN"});
    });

    it("does not derive state from a tilt report", async () => {
        const {payload} = await convertReport({currentPositionTiltPercentage: 100});
        expect(payload).toStrictEqual({tilt: 100});
    });
});
