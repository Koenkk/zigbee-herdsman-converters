import {beforeEach, describe, expect, it} from "vitest";
import {Zcl} from "zigbee-herdsman";
import {findByDevice} from "../src/index";
import type {Definition, Fz, KeyValueAny, Tz} from "../src/lib/types";
import {mockDevice} from "./utils";

describe("Heiman HS9MS-E camera attributes", () => {
    let device: ReturnType<typeof mockDevice>;
    let definition: Definition;

    beforeEach(async () => {
        device = mockDevice({
            modelID: "HS9MS-E",
            manufacturerName: "HEIMAN",
            endpoints: [{ID: 1, inputClusters: ["genBasic", "genPowerCfg", "ssIasZone"], inputClusterIDs: [0xfc90]}],
        });
        definition = await findByDevice(device);
        await definition.onEvent?.({type: "start", data: {device, deviceExposesChanged: () => {}, state: {}, options: {}}});
    });

    it("registers the camera wire types and corrected existing attribute IDs", () => {
        const attributes = device.customClusters.heimanClusterSpecial.attributes;
        expect(device.customClusters.heimanClusterSpecial.manufacturerCode).toBe(0x120b);
        expect(attributes).toMatchObject({
            cameraGop: {ID: 0x1ffa, type: Zcl.DataType.UINT16},
            cameraAudioEnable: {ID: 0x1ffb, type: Zcl.DataType.UINT8},
            cameraRtspUser: {ID: 0x1ffc, type: Zcl.DataType.CHAR_STR},
            cameraRtspPassword: {ID: 0x1ffd, type: Zcl.DataType.CHAR_STR},
            cameraDayNightMode: {ID: 0x1ffe, type: Zcl.DataType.UINT8},
            cameraStatus: {ID: 0x1fff, type: Zcl.DataType.OCTET_STR},
            serverPort: {ID: 0x2008, type: Zcl.DataType.UINT16},
            cameraReady: {ID: 0x2011, type: Zcl.DataType.UINT8},
            wifiProvisioningStatus: {ID: 0x2012, type: Zcl.DataType.UINT8},
            flashLightBrightness: {ID: 0x2013, type: Zcl.DataType.UINT8},
            cameraCaptureInterval: {ID: 0x2017, type: Zcl.DataType.UINT32},
            cameraOsdText: {ID: 0x201c, type: Zcl.DataType.CHAR_STR},
            cameraBitRate: {ID: 0x201f, type: Zcl.DataType.UINT32},
        });
    });

    it.each([
        {key: "camera_gop", value: 15, attribute: "cameraGop"},
        {key: "camera_audio_enable", value: true, attribute: "cameraAudioEnable", written: 1},
        {key: "camera_rtsp_user", value: "viewer", attribute: "cameraRtspUser"},
        {key: "wifi_ssid", value: "home-network", attribute: "wifiSsid"},
        {key: "wifi_password", value: "password", attribute: "wifiPassword"},
        {key: "wifi_ssid_candidate", value: "backup-network", attribute: "wifiSsidCandidate"},
        {key: "wifi_password_candidate", value: "backup-password", attribute: "wifiPasswordCandidate"},
        {key: "server_url", value: "https://camera.example", attribute: "serverAddress"},
        {key: "server_url_candidate", value: "https://backup.example", attribute: "serverAddressCandidate"},
        {key: "server_port", value: 554, attribute: "serverPort"},
        {key: "camera_capture_interval", value: 60, attribute: "cameraCaptureInterval"},
        {key: "camera_osd_text", value: "Front door", attribute: "cameraOsdText"},
        {key: "camera_bit_rate", value: 2048, attribute: "cameraBitRate"},
    ])("reads and writes $key", async ({key, value, attribute, written}) => {
        const endpoint = device.getEndpoint(1);
        const meta = {device, mapped: definition, state: {}, message: {}, options: {}} as Tz.Meta;
        const converter = definition.toZigbee.find((candidate) => candidate.key.includes(key));
        expect(converter).toBeDefined();
        await converter.convertSet(endpoint, key, value, meta);
        expect(endpoint.write).toHaveBeenCalledWith("heimanClusterSpecial", {[attribute]: written ?? value}, undefined);
        await converter.convertGet(endpoint, key, meta);
        expect(endpoint.read).toHaveBeenCalledWith("heimanClusterSpecial", [attribute], undefined);
    });

    it("decodes the read-only camera status as hexadecimal", async () => {
        const endpoint = device.getEndpoint(1);
        const message = {
            cluster: "heimanClusterSpecial",
            type: "readResponse",
            data: {cameraStatus: Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 255])},
            device,
            endpoint,
            meta: {},
            groupID: 0,
            linkquality: 100,
        } as unknown as Fz.Message;
        const meta = {device, state: {}, deviceExposesChanged: null} as unknown as Fz.Meta;
        const result: KeyValueAny = {};
        for (const converter of definition.fromZigbee.filter(
            (candidate) => candidate.cluster === "heimanClusterSpecial" && candidate.type.includes("readResponse"),
        )) {
            Object.assign(
                result,
                converter.convert(definition, message, () => {}, {}, meta),
            );
        }
        expect(result.camera_status).toBe("0001020304050607ff");
        const converter = definition.toZigbee.find((candidate) => candidate.key.includes("camera_status"));
        await converter.convertGet(endpoint, "camera_status", {device, mapped: definition, state: {}, message: {}, options: {}} as Tz.Meta);
        expect(endpoint.read).toHaveBeenCalledWith("heimanClusterSpecial", ["cameraStatus"]);
    });

    it("rejects an OSD string exceeding the firmware's byte limit", async () => {
        const converter = definition.toZigbee.find((candidate) => candidate.key.includes("camera_osd_text"));
        const meta = {device, mapped: definition, state: {}, message: {}, options: {}} as Tz.Meta;
        await expect(converter.convertSet(device.getEndpoint(1), "camera_osd_text", "测".repeat(22), meta)).rejects.toThrow("64 bytes");
    });

    it("rejects Wi-Fi and server strings exceeding their firmware byte limits", async () => {
        const meta = {device, mapped: definition, state: {}, message: {}, options: {}} as Tz.Meta;
        for (const {key, maxLength} of [
            {key: "wifi_ssid", maxLength: 32},
            {key: "wifi_password", maxLength: 64},
            {key: "wifi_ssid_candidate", maxLength: 32},
            {key: "wifi_password_candidate", maxLength: 32},
            {key: "server_url", maxLength: 251},
            {key: "server_url_candidate", maxLength: 251},
        ]) {
            const converter = definition.toZigbee.find((candidate) => candidate.key.includes(key));
            await expect(converter.convertSet(device.getEndpoint(1), key, "a".repeat(maxLength + 1), meta)).rejects.toThrow(`${maxLength} bytes`);
        }
    });

    it("maps the server address using the cluster attribute name", async () => {
        const endpoint = device.getEndpoint(1);
        const converter = definition.toZigbee.find((candidate) => candidate.key.includes("server_url"));
        const meta = {device, mapped: definition, state: {}, message: {}, options: {}} as Tz.Meta;
        await converter.convertSet(endpoint, "server_url", "https://camera.example", meta);
        expect(endpoint.write).toHaveBeenCalledWith("heimanClusterSpecial", {serverAddress: "https://camera.example"}, undefined);
        const message = {
            cluster: "heimanClusterSpecial",
            type: "readResponse",
            data: {serverAddress: "https://camera.example"},
            device,
            endpoint,
            meta: {},
            groupID: 0,
            linkquality: 100,
        } as unknown as Fz.Message;
        const fromZigbee = definition.fromZigbee.find(
            (candidate) =>
                candidate.cluster === "heimanClusterSpecial" && candidate.convert(definition, message, () => {}, {}, {device} as Fz.Meta)?.server_url,
        );
        expect(fromZigbee).toBeDefined();
    });

    it("decodes the unsigned Wi-Fi RSSI byte as a signed dBm value", () => {
        const converter = definition.fromZigbee.find((candidate) => {
            if (candidate.cluster !== "heimanClusterSpecial") return false;
            const message = {
                cluster: "heimanClusterSpecial",
                type: "attributeReport",
                data: {wifiRssi: 200},
                device,
                endpoint: device.getEndpoint(1),
                meta: {},
                groupID: 0,
                linkquality: 100,
            } as unknown as Fz.Message;
            return candidate.convert(definition, message, () => {}, {}, {device} as Fz.Meta)?.wifi_rssi === -56;
        });
        expect(converter).toBeDefined();
    });
});
