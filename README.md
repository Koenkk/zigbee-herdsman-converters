[![NPM](https://nodei.co/npm/zigbee-herdsman-converters.png)](https://nodei.co/npm/zigbee-herdsman-converters/)

# zigbee-herdsman-converters
Collection of device converters to be used with zigbee-herdsman.

## Breaking changes
19.0.0
- Legacy extend was removed

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
