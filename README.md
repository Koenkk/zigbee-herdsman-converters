[![NPM](https://nodei.co/npm/zigbee-shepherd-converters.png)](https://nodei.co/npm/zigbee-shepherd-converters/)

# ZigBee Shepherd Converters
Collection of device converters to be used with zigbee-shepherd.

Part of https://github.com/Koenkk/zigbee2mqtt .

# Contributing
To get started clone this repo and install the requriements with `npm install`. To add a new device, you'll need to add it's configuration to devices.js and potentially create a new converter for it. For more information see [this](http://www.zigbee2mqtt.io/how_tos/how_to_support_new_devices.html) page.

If you'd like to submit a pull request, you should run the following commands to ensure your changes will pass the tests:
```
npm run verify

npm run eslint

npm run test
```
If any of those commands finish with an error your PR won't pass the tests and will likely be rejected.
