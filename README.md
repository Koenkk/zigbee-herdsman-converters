[![NPM](https://nodei.co/npm/zigbee-herdsman-converters.png)](https://nodei.co/npm/zigbee-herdsman-converters/)

# zigbee-herdsman-converters
Collection of device converters to be used with zigbee-herdsman.

## Breaking changes
18.0.0
- After converting a message with a fromZigbee converter, `postProcessConvertedFromZigbeeMessage` should be called now (for applying calibration/precision)

17.0.0
- Various methods in `index.ts` are now async and return a `Promise`

15.0.0
- OTA `isUpdateAvailable` now returns an object instead of a boolean (e.g. `{available: true, currentFileVersion: 120, otaFileVersion: 125}`)
- OTA `updateToLatest` now returns a number (`fileVersion` of the new OTA) instead of a void

## Contributing
See [Zigbee2MQTT how to support new devices](https://www.zigbee2mqtt.io/advanced/support-new-devices/01_support_new_devices.html).

## Submitting a pull request
If you'd like to submit a pull request, you should run the following commands to ensure your changes will pass the tests:
```sh
npm install
npm run lint
npm run build
npm test
```

If any of those commands finish with an error your PR won't pass the tests and will likely be rejected.

## Documentation of definition meta property
- `multiEndpoint`: enables the multi endpoint functionality in e.g. fromZigbee.on_off, example: normally this converter would return {"state": "OFF"}, when multiEndpoint is enabled the 'endpoint' method of the device definition will be called to determine the endpoint name which is then used as key e.g. {"state_left": "OFF"}. Only needed when device sends the same attribute from multiple endpoints. (default: false)
- `multiEndpointSkip`: array of attributes to not suffix with the endpoint name
- `multiEndpointEnforce`: enforce a certain endpoint for an attribute, e.g. {"power": 4} see utils.enforceEndpoint()
- `disableDefaultResponse`: used by toZigbee converters to disable the default response of some devices as they don't provide one. (default: false)
- `applyRedFix`: see toZigbee.light_color (default: false)
- `supportsEnhancedHue`: see toZigbee.light_color (default: true)
- `supportsHueAndSaturation`: see toZigbee.light_color (default: true), usually set by light_* extends via options.
- `timeout`: timeout for commands to this device used in toZigbee. (default: 10000)
- `coverInverted`: Set to true for cover controls that report position=100 as open (default: false)
- `coverStateFromTilt`: Set cover state based on tilt
- `turnsOffAtBrightness1`: Indicates light turns off when brightness 1 is set (default: false)
- `pinCodeCount`: Amount of pincodes the lock can handle
- `disableActionGroup`: Prevents some converters adding the action_group to the payload (default: false)
- `tuyaThermostatSystemMode`/`tuyaThermostatPreset`: TuYa specific thermostat options
- `thermostat`: see e.g. HT-08 definition
  - `{dontMapPIHeatingDemand: true}`: do not map `pIHeatingDemand`/`pICoolingDemand` from 0-255 -> 0-100, see fromZigbee.thermostat (default: false)
- `battery`:
  - `{dontDividePercentage: true}`: prevents batteryPercentageRemaining from being divided (ZCL 200=100%, but some report 100=100%) (default: false)
  - `{voltageToPercentage: '3V_2100'}`: convert voltage to percentage using specified option. See utils.batteryVoltageToPercentage() (default: null, no voltage to percentage conversion)
