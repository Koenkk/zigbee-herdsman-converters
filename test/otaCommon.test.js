const common = require("../ota/common");
const otaImages = require("./stub/otaImages");

describe("ota/common.js", () => {
    it.each(otaImages)("Can correctly parse OTA image file %s", (_, otaImage) => {
        const start = otaImage.data.indexOf(common.upgradeFileIdentifier);

        const image = common.parseImage(otaImage.data.slice(start));

        expect(image.header.otaHeaderFieldControl).toBe(otaImage.headerField);

        expect(image.header.minimumHardwareVersion).toBe(otaImage.minimumHardwareVersion);
        expect(image.header.maximumHardwareVersion).toBe(otaImage.maximumHardwareVersion);

        expect(image.elements.length).toBe(otaImage.elements);
    });
});
