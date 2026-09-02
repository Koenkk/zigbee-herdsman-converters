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

    it("publishes a value for every property the cover exposes", async () => {
        const {exposes, payload} = await convertLiftReport(50);

        const cover = exposes.find((expose) => expose.type === "cover");
        if (cover?.features === undefined) throw new Error("no cover expose on the definition");

        // A lift percentage report carries no tilt, so tilt_cover is expected to
        // be absent here. Every other declared property must be published,
        // otherwise the entity has no state in Z2M and Home Assistant.
        const declared = cover.features.map((feature) => feature.property).filter((property) => property !== "tilt_cover");
        expect(declared).toContain("state_cover");
        expect(Object.keys(payload).sort()).toEqual(declared.sort());
    });

    it("reports state alongside position for a lift percentage report", async () => {
        expect((await convertLiftReport(50)).payload).toStrictEqual({position_cover: 50, state_cover: "OPEN"});
        expect((await convertLiftReport(0)).payload).toStrictEqual({position_cover: 0, state_cover: "CLOSE"});
        expect((await convertLiftReport(100)).payload).toStrictEqual({position_cover: 100, state_cover: "OPEN"});
    });

    it("reports state on a read response as well as an attribute report", async () => {
        const {payload} = await convertReport({currentPositionLiftPercentage: 30}, "readResponse");
        expect(payload).toStrictEqual({position_cover: 30, state_cover: "OPEN"});
    });

    it("does not derive state from a tilt report", async () => {
        const {payload} = await convertReport({currentPositionTiltPercentage: 100});
        expect(payload).toStrictEqual({tilt_cover: 100});
    });
});
