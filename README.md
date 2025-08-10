[![NPM](https://nodei.co/npm/zigbee-herdsman-converters.png)](https://nodei.co/npm/zigbee-herdsman-converters/)

# zigbee-herdsman-converters

Collection of device converters to be used with zigbee-herdsman.

## Contributing

See [Zigbee2MQTT how to support new devices](https://www.zigbee2mqtt.io/advanced/support-new-devices/01_support_new_devices.html).

### Creating a pull request

#### Github codespaces

You can use Github codespaces to create pull requests with a fully setup editor, right from your web browser:
- https://docs.github.com/en/codespaces/developing-in-a-codespace/creating-a-codespace-for-a-repository
- https://docs.github.com/en/codespaces/developing-in-a-codespace/using-github-codespaces-for-pull-requests

#### Locally

Install the prerequisites:

```sh
npm install -g pnpm
pnpm install --frozen-lockfile
```

#### Submitting your pull request

Before you submit a pull request, you should run the following commands to ensure your changes will pass the tests:

```sh
pnpm run check --fix
pnpm run build
pnpm test
```

If any of those commands finish with an error your PR won't pass the tests and will likely be rejected.

## Breaking changes

25.0.0

- Changed the `onEvent` api, see https://github.com/Koenkk/zigbee-herdsman-converters/pull/9650 for more info.
- A `device` argument has been added to `postProcessConvertedFromZigbeeMessage` (https://github.com/Koenkk/zigbee-herdsman-converters/pull/9693)
- `rawData` now needs to be provided to `Fz.Message.meta` (https://github.com/Koenkk/zigbee-herdsman-converters/pull/9775)

24.0.0

- It's not longer possible to call `definition.exposes(undefined, undefined)`, use `definition.exposes({isDummyDevice: true}, {})` instead (#9601)

23.0.0

- A `Publish` now has to be passed to toZigbee converters (#8875)

22.0.0

- `addDefinition` has been renamed to `addExternalDefinition`
- An import of `zigbee-herdsman-converters` does not expose all `definitions` anymore. Use this instead:
```js
(await import('zigbee-herdsman-converters/devices/index')).default.forEach((baseDefinition) => {
    const d = zhc.prepareDefinition(baseDefinition);
});
```

21.0.0

- Various breaking changes, see [CHANGELOG.md](https://github.com/Koenkk/zigbee-herdsman-converters/blob/v21.0.0/CHANGELOG.md#-breaking-changes).

20.0.0

- A toZigbee converter is now allowed to not define any `key`, in this case the converter should be used for any key.

19.0.0

- Legacy extend was removed

18.0.0

- After converting a message with a fromZigbee converter, `postProcessConvertedFromZigbeeMessage` should be called now (for applying calibration/precision)

17.0.0

- Various methods in `index.ts` are now async and return a `Promise`

15.0.0

- OTA `isUpdateAvailable` now returns an object instead of a boolean (e.g. `{available: true, currentFileVersion: 120, otaFileVersion: 125}`)
- OTA `updateToLatest` now returns a number (`fileVersion` of the new OTA) instead of a void
