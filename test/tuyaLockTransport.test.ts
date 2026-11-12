import {describe, expect, it, vi} from "vitest";
import {sendEncryptedLockPackets} from "../src/lib/tuyaLockTransport";
import {mockDevice} from "./utils";

const endpoint = () => mockDevice({modelID: "TY0A01", endpoints: [{ID: 1}]}).getEndpoint(1);

describe("Encrypted Tuya lock public transport", () => {
    it("uses only the public command API with APS acknowledgement and the original deadline", async () => {
        const ep = endpoint();
        const payload = Buffer.from("aabbccdd", "hex");
        const expiresAt = performance.now() + 5000;
        await sendEncryptedLockPackets(ep, "ifr7001Tuya", [{command: "dataRequest", payload, expiresAt}]);
        expect(ep.command).toHaveBeenCalledExactlyOnceWith(
            "ifr7001Tuya",
            "dataRequest",
            {payload},
            {
                disableDefaultResponse: true,
                disableResponse: true,
                disableRecovery: true,
                sendPolicy: "immediate",
                timeout: 5000,
                requestApsAck: true,
                sendDeadline: expiresAt,
            },
        );
    });
    it("stops a batch on transmission failure without retrying or sending later packets", async () => {
        const ep = endpoint();
        vi.mocked(ep.command).mockRejectedValueOnce(new Error("Radio refused packet"));
        const packet = {command: "dataRequest", payload: Buffer.from("aabb", "hex")};
        await expect(sendEncryptedLockPackets(ep, "ifr7001Tuya", [packet, packet])).rejects.toThrow("Radio refused");
        expect(ep.command).toHaveBeenCalledTimes(1);
    });
    it("checks each packet's deadline after the previous send completes", async () => {
        const ep = endpoint();
        const clock = vi.spyOn(performance, "now").mockReturnValue(10);
        vi.mocked(ep.command).mockImplementationOnce(() => {
            clock.mockReturnValue(100);
            return Promise.resolve({});
        });
        const packet = {command: "dataRequest", payload: Buffer.from("aabb", "hex"), expiresAt: 50};
        try {
            await expect(sendEncryptedLockPackets(ep, "ifr7001Tuya", [packet, packet])).rejects.toThrow("expired before transmission");
            expect(ep.command).toHaveBeenCalledTimes(1);
        } finally {
            clock.mockRestore();
        }
    });
    it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
        "rejects invalid deadline %s before calling the endpoint",
        async (expiresAt) => {
            const ep = endpoint();
            await expect(
                sendEncryptedLockPackets(ep, "ifr7001Tuya", [{command: "dataRequest", payload: Buffer.alloc(16), expiresAt}]),
            ).rejects.toThrow("Invalid Tuya lock packet deadline");
            expect(ep.command).not.toHaveBeenCalled();
        },
    );
});
