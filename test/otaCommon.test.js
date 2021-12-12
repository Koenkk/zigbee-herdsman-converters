const crypto = require('crypto');
const fs = require('fs');
const path = require("path");
const common = require("../lib/ota/common");
const otaImages = require("./stub/otaImages");

describe("ota/common.js", () => {
    it.each(otaImages)("Can correctly parse OTA image file %s", (_, otaImage) => {
        const start = otaImage.data.indexOf(common.upgradeFileIdentifier);

        const image = common.parseImage(otaImage.data.slice(start));

        expect(common.validateImageData(image)).toBeUndefined();

        expect(image.header.otaHeaderFieldControl).toBe(otaImage.headerField);

        expect(image.header.minimumHardwareVersion).toBe(otaImage.minimumHardwareVersion);
        expect(image.header.maximumHardwareVersion).toBe(otaImage.maximumHardwareVersion);

        expect(image.elements.length).toBe(otaImage.elements);
    });

    describe('Image checksum validation', () => {
        const data = fs.readFileSync(
            path.join(__dirname, "stub", "otaImageFiles", "SAL2PU1_02015120_OTA.ota")
        );
        const hash = crypto.createHash('sha512');
        hash.update(data);

        const start = data.indexOf(common.upgradeFileIdentifier);
        const image = common.parseImage(data.slice(start));

        const mockLogger = { debug: jest.fn() }
        const mockGetImageMeta = jest.fn().mockResolvedValue({
            fileVersion: image.header.fileVersion,
            sha512: hash.digest('hex'),
        });
        const device = { ieeeAddr: '0x000000000000000' };

        it("Valid OTA image file passes checksum verification", async () => {
            const mockDownloadImage = jest.fn().mockResolvedValue({ data });
            await expect(common.getNewImage(
                {
                    manufacturerCode: image.header.manufacturerCode,
                    imageType: image.header.imageType,
                    fileVersion: image.header.fileVersion - 1,
                },
                mockLogger,
                device,
                mockGetImageMeta,
                mockDownloadImage
            )).resolves.toBeInstanceOf(Object);
        });

        it("Invalid OTA image file fails checksum verification", async () => {
            const mockDownloadImage = jest.fn().mockResolvedValue({ data: 'invalid data' });

            await expect(common.getNewImage(
                { fileVersion: image.header.fileVersion - 1 },
                mockLogger,
                { ieeeAddr: '0x000000000000000' },
                mockGetImageMeta,
                mockDownloadImage
            )).rejects.toThrow(/File checksum validation failed/);
        });
    });

});
