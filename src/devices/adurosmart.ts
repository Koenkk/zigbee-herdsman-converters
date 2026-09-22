import * as adurosmart from "../lib/adurosmart";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend, Fingerprint} from "../lib/types";

const manufacturerNames = ["AduroSmart ERIA", "ERIA", "AduroSmart Eria"];

function fingerprints(modelIDs: string[], manufacturers = manufacturerNames): Fingerprint[] {
    return modelIDs.flatMap((modelID) => manufacturers.map((manufacturerName) => ({modelID, manufacturerName})));
}

const dimmableLight = () => [m.light({powerOnBehavior: false}), adurosmart.extend.onOffReporting()];
const tunableWhiteLight = () => [m.light({powerOnBehavior: false, colorTemp: {range: [153, 500]}})];
const colorLight = () => [m.light({powerOnBehavior: false, colorTemp: {range: [153, 500]}, color: {modes: ["xy", "hs"]}})];
const onOffDevice = () => [m.onOff({powerOnBehavior: false, configureReporting: false}), adurosmart.extend.onOffReporting()];
const powerMeasuringDevice = () => [...onOffDevice(), adurosmart.extend.electricityMeter()];

export const definitions: DefinitionWithExtend[] = [
    {
        fingerprint: fingerprints(["CSW_ADUROLIGHT"]),
        model: "81822",
        vendor: "AduroSmart",
        description: "ERIA Wireless Contact Sensor",
        extend: adurosmart.extend.contactSensor(),
    },
    {
        fingerprint: fingerprints(["AD-CTW123001", "AD-CTW143001", "AD-ColorTemperature3001"]),
        model: "81812/81814",
        vendor: "AduroSmart",
        description: "ERIA Tunable White Bulb",
        extend: tunableWhiteLight(),
    },
    {
        fingerprint: fingerprints(["AD-E1XCTW3001", "AD-E1XCT3001"]),
        model: "E1XCTW3001",
        vendor: "AduroSmart",
        description: "ERIA Tunable White Candelabra",
        extend: tunableWhiteLight(),
    },
    {
        fingerprint: fingerprints(["AD-DL4CT3001", "AD-DL4CTW3001"]),
        model: "AD-DL4CT3001",
        vendor: "AduroSmart",
        description: "ERIA Tunable White 4’’ Downlight",
        extend: tunableWhiteLight(),
    },
    {
        fingerprint: fingerprints(["AD-DL6CT3001", "AD-DL6CTW3001"]),
        model: "AD-DL6CT3001",
        vendor: "AduroSmart",
        description: "ERIA Tunable White 5/6’’ Downlight",
        extend: tunableWhiteLight(),
    },
    {
        fingerprint: fingerprints(["AD-DimmableLight3001"]),
        model: "81810",
        vendor: "AduroSmart",
        description: "ERIA Soft White Bulb",
        extend: [m.light({powerOnBehavior: false})],
    },
    {
        fingerprint: fingerprints(["BDP3001", "BDP3"], ["AduroSmart ERIA", "AduroSmart Eria"]),
        model: "81855",
        vendor: "AduroSmart",
        description: "ERIA Dimmable Plug (EU)",
        extend: dimmableLight(),
    },
    {
        fingerprint: fingerprints(["BDP3001", "BDP3"], ["ERIA"]),
        model: "81860",
        vendor: "AduroSmart",
        description: "ERIA Dimmable Plug (US)",
        extend: dimmableLight(),
    },
    {
        fingerprint: fingerprints(["Adurolight_NCC"]),
        model: "81825",
        vendor: "AduroSmart",
        description: "ERIA Wireless Dimming Remote Switch",
        extend: [adurosmart.extend.dimmerRemote()],
    },
    {
        fingerprint: fingerprints(["AD-Dimmer"]),
        model: "81849",
        vendor: "AduroSmart",
        description: "ERIA Built-in Dimmer",
        extend: dimmableLight(),
    },
    {
        fingerprint: fingerprints(["AD-FLMCT3001"]),
        model: "AD-FLMCT3001",
        vendor: "AduroSmart",
        description: "ERIA Tunable White Filament Bulb",
        extend: tunableWhiteLight(),
    },
    {
        fingerprint: fingerprints(["DimmerM3002"]),
        model: "81883",
        vendor: "AduroSmart",
        description: "ERIA Mini Built-in Dimmer",
        extend: [
            ...dimmableLight(),
            adurosmart.extend.electricityMeter(),
            adurosmart.extend.dimmerLoadControlMode(),
            adurosmart.extend.dimmerSwitchMode(),
            adurosmart.extend.dimmerInvertSwitch(),
            adurosmart.extend.dimmerSceneActivation(),
            adurosmart.extend.dimmerS1DoubleClickScene(),
            adurosmart.extend.dimmerS2DoubleClickScene(),
            adurosmart.extend.dimmerMinBrightnessLevel(),
            adurosmart.extend.dimmerMaxBrightnessLevel(),
            adurosmart.extend.dimmerManualDimmingStepSize(),
            adurosmart.extend.dimmerManualDimmingTime(),
        ],
    },
    {
        fingerprint: fingerprints(["ONOFF_METER_RELAY"]),
        model: "83839",
        vendor: "AduroSmart",
        description: "ERIA Mini Built-in On/Off Relay",
        extend: powerMeasuringDevice(),
    },
    {
        fingerprint: fingerprints(["VMS_ADUROLIGHT"], ["AduroSmart Eria"]),
        model: "81823",
        vendor: "AduroSmart",
        description: "ERIA Wireless Motion Sensor",
        extend: adurosmart.extend.motionSensor(),
    },
    {
        fingerprint: fingerprints(["CSW_81909"]),
        model: "81910",
        vendor: "AduroSmart",
        description: "ERIA 5-in-1 Multi Contact Sensor",
        extend: adurosmart.extend.multiContactSensor(),
    },
    {
        fingerprint: fingerprints(["VMS_ADUROLIGHT"], ["AduroSmart ERIA", "ERIA"]),
        model: "81915",
        vendor: "AduroSmart",
        description: "ERIA 4-in-1 Multi Motion Sensor",
        extend: adurosmart.extend.multiMotionSensor(),
    },
    {
        fingerprint: fingerprints(["BPU3"], ["AduroSmart ERIA", "AduroSmart Eria"]),
        model: "81856",
        vendor: "AduroSmart",
        description: "ERIA On/Off Smart Plug (EU)",
        extend: onOffDevice(),
    },
    {
        fingerprint: fingerprints(["BPU3"], ["ERIA"]),
        model: "81869",
        vendor: "AduroSmart",
        description: "ERIA On/Off Smart Plug (US)",
        extend: onOffDevice(),
    },
    {
        fingerprint: fingerprints(["AD-SmartPlug3001"], ["AduroSmart ERIA", "AduroSmart Eria"]),
        model: "81848",
        vendor: "AduroSmart",
        description: "ERIA Power Measuring Plug (EU)",
        extend: powerMeasuringDevice(),
    },
    {
        fingerprint: fingerprints(["AD-SmartPlug3001"], ["ERIA"]),
        model: "81853",
        vendor: "AduroSmart",
        description: "ERIA Power Measuring Plug (US)",
        extend: powerMeasuringDevice(),
    },
    {
        fingerprint: fingerprints(["ONOFFRELAY"]),
        model: "81898",
        vendor: "AduroSmart",
        description: "ERIA Built-in On/Off Relay",
        extend: onOffDevice(),
    },
    {
        fingerprint: fingerprints(["AD-RGBW3001", "AD-RGBWH3001", "AD-BR3RGBW3001"]),
        model: "81809/81813",
        vendor: "AduroSmart",
        description: "ERIA Colors & White Bulb",
        extend: colorLight(),
    },
    {
        fingerprint: fingerprints(["AD-E14RGBW3001"]),
        model: "81895",
        vendor: "AduroSmart",
        description: "ERIA Colors & White Candelabra",
        extend: colorLight(),
    },
    {
        fingerprint: fingerprints(["AD-DL4RGBW3001"]),
        model: "AD-DL4RGBW3001",
        vendor: "AduroSmart",
        description: "ERIA Colors & White 4’’ Downlight",
        extend: colorLight(),
    },
    {
        fingerprint: fingerprints(["AD-DL6RGBW3001"]),
        model: "AD-DL6RGBW3001",
        vendor: "AduroSmart",
        description: "ERIA Colors & White 5/6’’ Downlight",
        extend: colorLight(),
    },
    {
        fingerprint: fingerprints(["Extended Color WS Strip V1.0"]),
        model: "Extended Color WS Strip V1.0",
        vendor: "AduroSmart",
        description: "ERIA Sync Gaming LED Lightstrip",
        extend: colorLight(),
    },
    {
        fingerprint: fingerprints(["AD-GU10RGB3001", "AD-GU10RGBW3001"]),
        model: "AD-GU10RGB3001",
        vendor: "AduroSmart",
        description: "ERIA Colors & White Spotlight",
        extend: colorLight(),
    },
    {
        fingerprint: fingerprints(["Extended Color LED Strip V1.0"]),
        model: "81863",
        vendor: "AduroSmart",
        description: "ERIA Extended Colors LED Lightstrip",
        extend: colorLight(),
    },
    {
        fingerprint: fingerprints(["ADUROLIGHT_CSC"]),
        model: "15090054",
        vendor: "AduroSmart",
        description: "ERIA Wireless Scene Remote Switch",
        extend: [adurosmart.extend.sceneRemote()],
    },
    {
        fingerprint: fingerprints(["Smart Siren"]),
        model: "81868",
        vendor: "AduroSmart",
        description: "ERIA Plug-in Siren",
        extend: adurosmart.extend.siren(),
    },
];
