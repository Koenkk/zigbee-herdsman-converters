import {beforeEach, describe, expect, it} from "vitest";
import {Zcl} from "zigbee-herdsman";
import {findByDevice} from "../src/index";
import type {Definition, Fz, KeyValueAny, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

// These tests pin the on-air Zigbee behaviour of the ND-01 converter to exactly
// what the firmware implements, so the modernExtend definition is guaranteed to
// talk to real hardware correctly.
//
// Firmware wire contract:
//   Custom cluster 0xFC00 (plain attributes, NO manufacturer code):
//     ID 0x0001 ledBrightness UINT8
//     ID 0x0002 sirenVolume   UINT8
//     ID 0x0003 sensitivity   UINT8
//     ID 0x0004 alarmDuration UINT16
//     ID 0x0005 alarmDelay    UINT8
//   EP1 = genOnOff (armed) + ssIasZone (motion) + custom cluster
//   EP2 = genOnOff (siren)

function buildDevice() {
    return mockDevice({
        modelID: "ND-01",
        manufacturerName: "NoDieby",
        endpoints: [
            {ID: 1, inputClusters: ["genBasic", "genIdentify", "ssIasZone", "genOnOff"], inputClusterIDs: [0xfc00]},
            {ID: 2, inputClusters: ["genBasic", "genOnOff"]},
        ],
    });
}

function buildMeta(device: ReturnType<typeof mockDevice>, definition: Definition, overrides?: Partial<Tz.Meta>): Tz.Meta {
    return {
        state: {},
        device,
        message: {} as KeyValueAny,
        mapped: definition,
        options: {},
        endpoint_name: undefined,
        ...overrides,
    } as Tz.Meta;
}

describe("NoDieby ND-01", () => {
    let device: ReturnType<typeof mockDevice>;
    let definition: Definition;

    beforeEach(async () => {
        device = buildDevice();
        definition = await findByDevice(device);
        // Registers the custom cluster on the device (deviceAddCustomCluster).
        await definition.configure?.(device, device.getEndpoint(1), definition);
    });

    it("registers the custom cluster exactly as the firmware expects (ID, type, no manufacturer code)", () => {
        const cluster = device.customClusters.nodiebyConfig;
        expect(cluster.ID).toBe(0xfc00);
        expect(cluster.manufacturerCode).toBeUndefined();
        expect(cluster.attributes).toMatchObject({
            ledBrightness: {ID: 0x0001, type: Zcl.DataType.UINT8},
            sirenVolume: {ID: 0x0002, type: Zcl.DataType.UINT8},
            sensitivity: {ID: 0x0003, type: Zcl.DataType.UINT8},
            alarmDuration: {ID: 0x0004, type: Zcl.DataType.UINT16},
            alarmDelay: {ID: 0x0005, type: Zcl.DataType.UINT8},
        });
    });

    it("reads IAS zoneStatus on configure so occupancy is initialised at join", () => {
        // iasZoneAlarm is event-driven; without this read occupancy stays unknown
        // until the first notification. Configure ran in beforeEach.
        expect(device.getEndpoint(1).read).toHaveBeenCalledWith("ssIasZone", ["zoneStatus"]);
    });

    describe("toZigbee (commands sent to the device)", () => {
        const findTz = (key: string): Tz.Converter => definition.toZigbee.find((c) => c.key.includes(key));

        const writeCases: {key: string; value: number | string; attribute: string; written: number}[] = [
            {key: "led_brightness", value: 50, attribute: "ledBrightness", written: 50},
            {key: "volume", value: 80, attribute: "sirenVolume", written: 80},
            {key: "sensitivity", value: "high", attribute: "sensitivity", written: 2},
            {key: "alarm_duration", value: 200, attribute: "alarmDuration", written: 200},
            {key: "alarm_delay", value: 30, attribute: "alarmDelay", written: 30},
        ];

        it.each(writeCases)("set $key writes to the custom cluster on EP1 without a manufacturer code", async ({key, value, attribute, written}) => {
            const ep = device.getEndpoint(1);
            const meta = buildMeta(device, definition, {endpoint_name: "alarm", message: {[key]: value}});

            const result = await findTz(key).convertSet(ep, key, value, meta);

            expect(ep.write).toHaveBeenCalledWith("nodiebyConfig", {[attribute]: written}, undefined);
            expect(result).toStrictEqual({state: {[key]: value}});
        });

        it.each(writeCases)("get $key reads the matching custom attribute on EP1", async ({key, attribute}) => {
            const ep = device.getEndpoint(1);
            const meta = buildMeta(device, definition, {endpoint_name: "alarm"});

            await findTz(key).convertGet(ep, key, meta);

            expect(ep.read).toHaveBeenCalledWith("nodiebyConfig", [attribute], undefined);
        });

        it("set armed state toggles genOnOff on EP1", async () => {
            const ep = device.getEndpoint(1);
            const meta = buildMeta(device, definition, {endpoint_name: "alarm", message: {state: "ON"}});

            await findTz("state").convertSet(ep, "state", "ON", meta);

            expect(ep.command).toHaveBeenCalledWith("genOnOff", "on", {}, expect.anything());
        });

        it("set siren state toggles genOnOff on EP2", async () => {
            const ep = device.getEndpoint(2);
            const meta = buildMeta(device, definition, {endpoint_name: "siren", message: {state: "OFF"}});

            await findTz("state").convertSet(ep, "state", "OFF", meta);

            expect(ep.command).toHaveBeenCalledWith("genOnOff", "off", {}, expect.anything());
        });
    });

    describe("fromZigbee (messages received from the device)", () => {
        // Mirrors Z2M runtime: every fromZigbee converter matching the cluster/type runs and the results are merged.
        const runFz = (cluster: string, type: string, data: KeyValueAny, endpointId = 1) => {
            const converters = definition.fromZigbee.filter((c) => c.cluster === cluster && c.type.includes(type));
            const endpoint = device.getEndpoint(endpointId);
            const msg = {data, endpoint, type, cluster, device, meta: {}, groupID: 0, linkquality: 100} as unknown as Fz.Message;
            const meta = {state: {}, device, deviceExposesChanged: null} as unknown as Fz.Meta;
            let result: KeyValueAny | undefined;
            for (const converter of converters) {
                const partial = converter.convert(definition, msg, () => {}, {}, meta);
                if (partial !== undefined) result = {...result, ...partial};
            }
            return result;
        };

        it("maps an IAS zone status change to occupancy", () => {
            expect(runFz("ssIasZone", "commandStatusChangeNotification", {zonestatus: 1})).toMatchObject({occupancy: true});
            expect(runFz("ssIasZone", "commandStatusChangeNotification", {zonestatus: 0})).toMatchObject({occupancy: false});
        });

        it("maps custom cluster attribute reports to the right exposes on EP1", () => {
            expect(runFz("nodiebyConfig", "attributeReport", {ledBrightness: 42})).toStrictEqual({led_brightness_alarm: 42});
            expect(runFz("nodiebyConfig", "attributeReport", {sirenVolume: 75})).toStrictEqual({volume_alarm: 75});
            expect(runFz("nodiebyConfig", "attributeReport", {sensitivity: 0})).toStrictEqual({sensitivity_alarm: "low"});
            expect(runFz("nodiebyConfig", "attributeReport", {alarmDuration: 250})).toStrictEqual({alarm_duration_alarm: 250});
            expect(runFz("nodiebyConfig", "attributeReport", {alarmDelay: 10})).toStrictEqual({alarm_delay_alarm: 10});
        });

        it("maps genOnOff reports to the armed (EP1) and siren (EP2) switches", () => {
            expect(runFz("genOnOff", "attributeReport", {onOff: 1}, 1)).toMatchObject({state_alarm: "ON"});
            expect(runFz("genOnOff", "attributeReport", {onOff: 0}, 2)).toMatchObject({state_siren: "OFF"});
        });
    });
});
