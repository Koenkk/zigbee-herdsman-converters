const fs = require("fs");
const path = require("path");

const otaImagesFilesWithMeta = {
    "10005777-4.1-TRADFRI-control-outlet-2.0.022.ota.ota.signed": {
        manufacturer: "Ikea",
        elements: 1
    },
    "A60_DIM_Z3_IM003D_00103101-encrypted_11_20_2018_Tue_122925_01_withoutMF.ota": {
        manufacturer: "Ledvance",
        elements: 1
    },
    "ZLL_MK_0x01020509_CLA60_TW.ota": {
        manufacturer: "Ledvance",
        elements: 4
    },
    "ZLL_MK_0x01020510_CLASSIC_A60_RGBW.ota": {
        manufacturer: "Ledvance",
        elements: 6
    },
    "SAL2PU1_02015120_OTA.ota": {
        manufacturer: "Salus",
        elements: 1
    }
};

const otaImages = Object.entries(otaImagesFilesWithMeta).map(
    ([filename, meta]) => {
        const { manufacturer, elements } = meta;

        return {
            filename,
            manufacturer,
            elements,
            data: fs.readFileSync(
                path.join(__dirname, "otaImageFiles", filename)
            )
        };
    }
);

module.exports = otaImages;
