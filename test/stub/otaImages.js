const fs = require("fs");
const path = require("path");

const otaImagesFilesWithMeta = {
    "10005777-4.1-TRADFRI-control-outlet-2.0.022.ota.ota.signed": {
        manufacturer: "Ikea",
        headerField: 0,
        elements: 1
    },
    "A60_DIM_Z3_IM003D_00103101-encrypted_11_20_2018_Tue_122925_01_withoutMF.ota": {
        manufacturer: "Ledvance",
        headerField: 0,
        elements: 1
    },
    "ZLL_MK_0x01020509_CLA60_TW.ota": {
        manufacturer: "Ledvance",
        headerField: 0,
        elements: 4
    },
    "ZLL_MK_0x01020510_CLASSIC_A60_RGBW.ota": {
        manufacturer: "Ledvance",
        headerField: 0,
        elements: 6
    },
    "SAL2PU1_02015120_OTA.ota": {
        manufacturer: "Salus",
        headerField: 0,
        elements: 1
    },
    "10F2-7B09-0000-0004-01090206-spo-fmi4.ota.zigbee": {
        manufacturer: "Ubisys",
        headerField: 4,
        minimumHardwareVersion: 0,
        maximumHardwareVersion: 4,
        elements: 1
    },
    "10005778-10.1-TRADFRI-onoff-shortcut-control-2.2.010.ota.ota.signed": {
        manufacturer: "",
        headerField: 0,
        elements: 1
    },
    "100B-0112-01001500-ConfLightBLE-Lamps-EFR32MG13.zigbee": {
        manufacturer: "",
        headerField: 0,
        elements: 26
    },
};

const otaImages = Object.entries(otaImagesFilesWithMeta).map(
    ([filename, meta]) => [
        filename,
        {
            ...meta,
            data: fs.readFileSync(
                path.join(__dirname, "otaImageFiles", filename)
            )
        }
    ]
);

module.exports = otaImages;
