const common = require("../ota/common");
const otaImages = require("./stub/otaImages");

describe("ota/common.js", () => {
    it("Can correctly parse OTA image files", () => {
        otaImages.forEach(otaImage => {
            const start = otaImage.data.indexOf(common.upgradeFileIdentifier);

            const image = common.parseImage(otaImage.data.slice(start));

            if (image.elements.length !== otaImage.elements) {
                throw new Error(`${otaImage.filename}: parseImage() returned incorrect number of sub-elements`);
            }
        });
    });
});
