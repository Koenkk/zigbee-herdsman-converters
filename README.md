[![NPM](https://nodei.co/npm/zigbee-herdsman-converters.png)](https://nodei.co/npm/zigbee-herdsman-converters/)

# zigbee-herdsman-converters
Collection of device converters to be used with zigbee-herdsman.

# Contributing
To get started clone this repo and install the requirements with `npm ci`. To add a new device, you'll need to add it's configuration to devices.js and potentially create a new converter for it. For more information see [this](http://www.zigbee2mqtt.io/how_tos/how_to_support_new_devices.html) page.

If you'd like to submit a pull request, you should run the following commands to ensure your changes will pass the tests:
```sh
npm run lint
npm test
```
If any of those commands finish with an error your PR won't pass the tests and will likely be rejected.
