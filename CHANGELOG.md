# Changelog

## [24.14.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v24.14.0...v24.14.1) (2025-08-08)


### Bug Fixes

* **detect:** Detect `_TZE284_y4jqpry8` as Zemismart ZMS-206US-4 ([#9761](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9761)) ([d6c655f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d6c655fb24cc325b9619980f87d3b1283dd27582))
* SONOFF S60ZBTPF: fix power not updating https://github.com/Koenkk/zigbee2mqtt/issues/28187 ([c723489](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c72348940681a6faf818b09ed41ea6575d0fd416))

## [24.14.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v24.13.0...v24.14.0) (2025-08-07)


### Features

* **add:** E1XCTW3001 ([#9749](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9749)) ([9df9a11](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9df9a1148ca970105bc22e5c6dd2feecb6a46f85))
* **add:** Sinope: support electrical measurements for some devices ([#9753](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9753)) ([54c6238](https://github.com/Koenkk/zigbee-herdsman-converters/commit/54c6238c33e1a39af09338fa2ce60d6400f6457d))
* **add:** TQM-300ZB, WCM-300Z ([#9744](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9744)) ([2ddc7f5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2ddc7f5bd54210cb0df0c09f6755603a8a56e6f1))
* **add:** ZC-W1 https://github.com/Koenkk/zigbee2mqtt/issues/28167 ([10f859d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/10f859d2275152a92e381c20d9f9ff8d0051c443))


### Bug Fixes

* Aqara WS-K07E and WS-K08E: fix configure failing https://github.com/Koenkk/zigbee2mqtt/issues/27525 ([7fbe167](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7fbe16730fcb744bd0c1db0a6b6bf99038dcf576))
* Cleanup for https://github.com/Koenkk/zigbee-herdsman/pull/1424 ([#9754](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9754)) ([5baf028](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5baf02889c6c9aa791b41d3ebff55b11fc3edc34))
* Connecto COZIGPMS: remove not supported battery expose https://github.com/Koenkk/zigbee2mqtt.io/pull/4018 ([d35a294](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d35a2942b432f91c130e1ec2c6209554b67d0c85))
* **detect:** Detect `_TZE200_6y7kyjga` as Moes BRT-100-TRV ([#9759](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9759)) ([d4acd60](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d4acd6005c22adb6376e104422c2b77dfea7e4ba))
* **detect:** Detect `_TZE204_zuepxzck` as Zemismart ZMS-206US-1 ([#9755](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9755)) ([fb3d1b6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fb3d1b66b8fd10efc3191bab24b20c7bbecc5d90))
* Fix state not reported for some Ledvane plugs https://github.com/Koenkk/zigbee2mqtt/issues/28177 ([0943ea8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0943ea8b05af5fff2ce738d6a3e18ce4d213d755))
* Inovelli VZM31: temporarily remove fanTimerMode ([#9756](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9756)) ([0a03e53](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0a03e535e8c285953387dc2408c52d783fb9afc7))

## [24.13.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v24.12.0...v24.13.0) (2025-08-05)


### Features

* **add:** 915005914701 https://github.com/Koenkk/zigbee2mqtt/issues/28174 ([9225b68](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9225b6890ef55e941074e2e41e2a5c41506cfeb2))
* **add:** 929003846201 ([#9742](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9742)) ([6f96585](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6f965850d6be9a6d7ccb00b2964504d19a850c83))
* **add:** Soil Pro ([#9264](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9264)) ([c98ad88](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c98ad88125f81126abafe416e8575c093f401f36))
* **add:** TOSA1 ([#9747](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9747)) ([6e09cc4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6e09cc40ccc0379324a4c71891e3d100270fa29f))
* **add:** ZS-D1, ZS-D2, ZS-D3 ([#9745](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9745)) ([985caf6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/985caf6d9cca2a1d36bf5380089a77f5832fe445))


### Bug Fixes

* **detect:** Detect `_TZE200_ba69l9ol` as Tuya TS0601_cover_1 https://github.com/Koenkk/zigbee2mqtt/issues/27843 ([ee7b2a6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ee7b2a661b2359ff2b689cebe9d298cd3a45e5e8))
* **detect:** Detect `_TZE284_1wnh8bqp` as Tuya TS0601_temperature_humidity_sensor_2 ([#9746](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9746)) ([6010b11](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6010b11c2cc1991fce6955045e12ccd916fbfd70))

## [24.12.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v24.11.0...v24.12.0) (2025-08-04)


### Features

* Add support for Inovelli's custom ledEffectComplete command ([#9735](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9735)) ([122f731](https://github.com/Koenkk/zigbee-herdsman-converters/commit/122f731ff81fdf425d6057346624f714c16c4c20))
* **add:** STLO-23 ([#9734](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9734)) ([6d39c4a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6d39c4a16a3ea13bb8f155399338e8bba5fc277f))
* **add:** TPZ-1, TPZ-2, TPZ-3, TPZ-4, SFL01-Z, SFL03-Z, SFL04-Z ([#9728](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9728)) ([4e7a685](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4e7a68510b6f9ea1184eb1f5b6f2512eac948dbf))
* **add:** WISZB-131 ([#9740](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9740)) ([4dda8b8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4dda8b80e7d0d476090d46a51b952590eda6ae38))
* Bosch BMCT-DZ: support OTA https://github.com/Koenkk/zigbee2mqtt/discussions/28165 ([95fe925](https://github.com/Koenkk/zigbee-herdsman-converters/commit/95fe9259f5a988c6aa93f4028ef424cffce398a5))
* Shelly 2PM: support tilt ([#9736](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9736)) ([b254f83](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b254f83cbefd65f1a0621d2c8648f47c6496d781))
* Tuya TRV601 and TS0601_thermostat_1: support new options ([#9730](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9730)) ([72a8a3a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/72a8a3ad759d85d6dda0b09385b82d6b8127696f))


### Bug Fixes

* **detect:** Detect `_TZ3000_4ux0ondb` as BSEED FK86ZEUSK1W https://github.com/Koenkk/zigbee2mqtt/issues/28157 ([b9a2584](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b9a2584bd11a374e19058e1aacfc7e954e42cac9))
* **detect:** Detect `_TZ3000_gwkzibhs` with appVersion 147 as ZG-101Z/D ([#9727](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9727)) ([8aea562](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8aea562f0de232bb465c26e40c7bd81ce6fab30c))
* **detect:** Detect `_TZE204_gops3slb` as Tuya ZWT198/ZWT100-BH ([#9731](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9731)) ([9ee2c9d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9ee2c9d48d4d118e1db2884dc7e5fa58419b3356))
* **ignore:** bump the minor-patch group with 3 updates ([#9741](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9741)) ([b7861a1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b7861a13f4b5d64ff4fc503479e50bf44f90690d))
* Tuya _TZE284_ye5jkfsb: fix `local_temperature` divided by 10 https://github.com/Koenkk/zigbee2mqtt/issues/28099 ([88f4465](https://github.com/Koenkk/zigbee-herdsman-converters/commit/88f446579bcde50494dec2a80857b0fbffdc766d))
* Tuya PJ-1203A: fix timestamp exposes https://github.com/Koenkk/zigbee-herdsman-converters/issues/9016 ([6b4e0ab](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6b4e0abc79c30fb38fc241440a265050464c66a1))
* YSRSAI YSR-MINI-01_dimmer: fix state not reported when changed via the device https://github.com/Koenkk/zigbee2mqtt/issues/28133 ([8cc9d56](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8cc9d561a16a171026cdc99010114a3963656cd2))

## [24.11.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v24.10.0...v24.11.0) (2025-08-01)


### Features

* **add:** 4512789 ([#9720](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9720)) ([a0e118b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a0e118b0d195f8aeef3f6738593c7fb1bb06fb1e))
* **add:** ZG-204ZH ([#9716](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9716)) ([8ad4e9e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8ad4e9e98ce3a8022c4369d6674fde21328e45e5))


### Bug Fixes

* Allow light messages to pass a null state to indicate no state change ([#9712](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9712)) ([a04aaa5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a04aaa54baa5b2e1a5489c2da56d6e2c10b7943f))
* **detect:** Detect `_TZE204_1wnh8bqp` as Tuya TS0601_temperature_humidity_sensor_2 https://github.com/Koenkk/zigbee2mqtt/issues/28139 ([9c4f340](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9c4f340a17285b479d3f8614470f2b20206a9faa))
* **detect:** Detect `_TZE204_wfxuhoea` as Tuya GDC311ZBQ1 https://github.com/Koenkk/zigbee-herdsman-converters/issues/9719 ([e232a75](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e232a759016b1ee399cbef971b099b461bd0bd07))
* **detect:** Detect `_TZE204_wskr3up8` as Nova Digital FZB-6 ([#9714](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9714)) ([9cbbb4f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9cbbb4fd4cd721f5c86e4438b29e3f16b9e5ea64))
* **detect:** Detect `_TZE284_cvub6xbb` as Tuya TGM50-ZB https://github.com/Koenkk/zigbee-herdsman-converters/issues/9718 ([37d3f48](https://github.com/Koenkk/zigbee-herdsman-converters/commit/37d3f4823c52ae021e28a15ba7a1f246ab654801))
* **detect:** Detect `_TZE284_xpvamyfz` as Nous E10 https://github.com/Koenkk/zigbee2mqtt/issues/28136 ([8728cb7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8728cb76d624d176426a41d29fc03f2d11d988c4))
* **detect:** Detect `eco-dim07-Pro-zigbee` as Eco-Dim.07/Eco-Dim.10 https://github.com/Koenkk/zigbee2mqtt/issues/28112 ([68ca801](https://github.com/Koenkk/zigbee-herdsman-converters/commit/68ca8014a03ed2d65d9d33943aa0cf02f5cb5f48))
* Inovelli: add MoveToLevel support ([#9713](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9713)) ([6dbef9d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6dbef9d91498e946e57488e32856965e76a18981))
* SONOFF SWV: fix on_time multiplied by 10 https://github.com/Koenkk/zigbee2mqtt/issues/27980 ([a204ef1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a204ef1131fe4d06594591cff8edf866ae5b7395))
* Tuya TS0601_water_valve: fix temperature conversion ([#9717](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9717)) ([5109c36](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5109c369fe279bdd482705b3c661b4903322f2c9))

## [24.10.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v24.9.0...v24.10.0) (2025-07-30)


### Features

* **add:** 929003812801 ([#9708](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9708)) ([e1da849](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e1da8493488dbda9955a216e1b7d08e1f72eaa30))
* **add:** C-ZB-RD1, C-ZB-RD1P-DIM, C-ZB-RD1P-DPM, C-ZB-RD1P-REM ([#9709](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9709)) ([e006b26](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e006b26f86a1a823411e815b270c11875c0f2418))
* iCasa ICZB-RM11S: expose `action_group` https://github.com/Koenkk/zigbee2mqtt/issues/27557 ([0a44040](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0a440405b839d8e6ab0b51a9c95d1a3ca26b7500))


### Bug Fixes

* **detect:** Detect `_TZ3000_1adss9de` as Nous L6Z https://github.com/Koenkk/zigbee2mqtt/issues/22462 ([4ff580a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4ff580afdc727c0e2a407096a2cec4d39318e33c))
* **detect:** Detect `_TZE204_jktmrpoj` as Moes ZM-102-M ([#9706](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9706)) ([272beb7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/272beb7d9594b7d02380d0a9bc0887274bff1b7a))
* **detect:** Detect `929003808201_0*` as Philips 5062431P7 https://github.com/Koenkk/zigbee2mqtt/issues/28115 ([428a4c5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/428a4c56a8d58737ef222bb433c71b8adc0cb086))
* **ignore:** fixes for e006b26f86a1a823411e815b270c11875c0f2418 ([a3c9db6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a3c9db60793791bb3fedd8da4c243432e5872448))

## [24.9.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v24.8.0...v24.9.0) (2025-07-29)


### Features

* **add:** 046677590161 ([#9698](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9698)) ([f3b3361](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f3b33616878727ab993605b91c9a9accb7122526))
* **add:** 2PM ([#9697](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9697)) ([8320975](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8320975e2bcb1c4ee36c76f691b8672238b6b613))
* **add:** E10 ([#9703](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9703)) ([8c35918](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8c35918dc42ece5eae9aac417e0b7bc03bbcff2f))
* **add:** ElectricityMeter-ABC-DIY ([#9663](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9663)) ([148ab14](https://github.com/Koenkk/zigbee-herdsman-converters/commit/148ab14814eee05fa58dcbdf153e0c0d8c639872))
* **add:** H1 ([#9705](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9705)) ([aa03465](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aa034654a31659f9abbdea6f7721c3488b6732e6))
* **add:** RB 282 C https://github.com/Koenkk/zigbee2mqtt/issues/28091 ([d553f9c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d553f9c1f2baf6b9936757544f948ec50867eaf9))
* **add:** TS0601_water_valve ([#9701](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9701)) ([1c36bc5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1c36bc54ee2a61fd34b0282d0c49bd80b0589607))
* **add:** ZHT-S03 ([#9690](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9690)) ([6510ef5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6510ef5134f952255d36f77eccc86632e6f26e66))
* POK010: add humidity ([#9704](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9704)) ([e8faad8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e8faad8b0e9953e309c50083d8d727927b5c7689))


### Bug Fixes

* Add some options to QA and Girier devices ([#9691](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9691)) ([44d4291](https://github.com/Koenkk/zigbee-herdsman-converters/commit/44d42911a2ea6cce427abb1ebc24b9f022562f1e))
* **detect:** Detect `_TZE204_6a4vxfnv` as Tuya TS0601_floor_thermostat ([#9694](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9694)) ([8cafb55](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8cafb558f20e3a9dea5e69bb6b50b055ff5f02b0))
* **detect:** Detect `_TZE284_ye5jkfsb` as Moes BHT-002 https://github.com/Koenkk/zigbee2mqtt/issues/28099 ([67a08ff](https://github.com/Koenkk/zigbee-herdsman-converters/commit/67a08ff66244f8e81378c7b5a18e4113d9b0dfb5))
* Don't throw `Failed to apply calibration to` when value is an empty string ([#9700](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9700)) ([501d8a2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/501d8a2a15b3047aa1f88e0e030785187949571e))
* **ignore:** bump the minor-patch group with 3 updates ([#9699](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9699)) ([d27e97b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d27e97b4d360d5b77603c106ac776015b47bf9b0))
* **ignore:** fix aa034654a31659f9abbdea6f7721c3488b6732e6 ([97aa0e7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/97aa0e747c55f3000339f3a46c8a2c8b5c7c49ef))

## [24.8.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v24.7.0...v24.8.0) (2025-07-26)


### Features

* **add:** 929004297401 ([#9682](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9682)) ([10ff1b3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/10ff1b3d68e9be8fe5cc4b845c3f1a50c028240e))
* Tuya TS0601_dimmer_3: expose `light_type` ([#9685](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9685)) ([2a1abfe](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2a1abfea46840b202d599d06e323578518ebe98f))


### Bug Fixes

* **detect:** Detect `_TZE200_py4cm3he` as GIEX TV06 ([#9689](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9689)) ([44df9fc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/44df9fc5793e12252d23b227f34639b4d617bdfe))
* **ignore:** fix breaking changes of https://github.com/Koenkk/zigbee2mqtt/pull/28077 ([14d7fe2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/14d7fe23401e8250e56b766fefe6df6be7a9ffc0))
* LiXee zlinky: fix default value for measurement_poll_chunk in description ([#9687](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9687)) ([ca255bd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ca255bd986c715c07198820f127d367e11f800b4))
* Set calibration option step at 0.1 ([#9683](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9683)) ([f206a3f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f206a3f44a8308fee370c0e2e581d8949f51872a))
* Tuya BLE-YL01: improve reliability ([#9681](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9681)) ([c097329](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c097329668ee2854875463e925022d7cac3b6ae8))

## [24.7.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v24.6.0...v24.7.0) (2025-07-24)


### Features

* **add:** 91-943-PRO https://github.com/Koenkk/zigbee2mqtt/issues/28063 ([217e1e0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/217e1e08ebb78b4d145c4676467ec7e0e23138e8))
* **add:** E25-230 ([#9673](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9673)) ([119a11c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/119a11c4b8e702ba49985a7084ff15935c349220))
* **add:** S57007 ([#9642](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9642)) ([3ab3a39](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3ab3a397c1075d776cdd5ec74d7b9de4822d629b))
* **add:** SZT04 ([#9674](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9674)) ([e5d2e10](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e5d2e1046292308e55c9438937a0fc130e5589f1))
* Frient SMRZB-153 and EMIZB-151: enable OTA https://github.com/Koenkk/zigbee2mqtt/discussions/28056 ([a380f8c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a380f8c94af63e8578b5bfb24264b8bc47aa2424))
* Philips 9290035639: improve `contact` reliability by using manuspecific cluster ([#9668](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9668)) ([48a455f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/48a455f16d2e369c95ca2c85fff60466ef4e2233))


### Bug Fixes

* Candeo C210 and LC20: various improvements ([#9680](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9680)) ([46f31e1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/46f31e1346f3269414cc8f152ac34cd82ee7725a))

## [24.6.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v24.5.0...v24.6.0) (2025-07-22)


### Features

* **add:** SLZB-MR3 https://github.com/Koenkk/zigbee2mqtt/issues/28050 ([8a49af0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8a49af0d7a57584133edb7308197b8d5d6fc2d01))


### Bug Fixes

* **detect:** Detect `_TZ3210_ljoasixl` as Moes ZB-TD5-RCW-GU10 ([#9665](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9665)) ([41698e4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/41698e4811923fdbdf30088c5a4e1d813ce78144))
* HOBEIAN ZG-223Z: fix illumunace unit ([#9664](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9664)) ([b13a178](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b13a178e7c507ee149699942bc9b7ae0dca21bb8))
* Ubisys H1: improve code ([#9669](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9669)) ([ea65244](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ea652447a47fa8916348b9cff5afd745b9038f56))

## [24.5.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v24.4.0...v24.5.0) (2025-07-21)


### Features

* **add:** _TZ3000_h1ipgkwn ([#9648](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9648)) ([f1ca5eb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f1ca5eb5b3d028955186fa8f3fe8330a15fb75e1))
* **add:** FWGU10Bulb03UK ([#9656](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9656)) ([a63b260](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a63b2602e33bf33a12f7f32ad05dbc0a0184f2a1))
* **add:** GM25TEQ-TYZ-2/25 ([#9653](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9653)) ([18ea9e9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/18ea9e97dcf4888839a0cbf23b41e25e9028adf3))
* **add:** ROB_200-026-1 ([#9654](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9654)) ([9e186e7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9e186e7a0010d6803c120143da4f70f13e387e90))
* Bosch BMCT-SLZ: support electrical measurements ([#9657](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9657)) ([2c9eabc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2c9eabcd5bca9649c0b760887d9376e054efb9da))


### Bug Fixes

* **detect:** Detect `_TZ3210_09hzmirw` as EcoDim ED-10032 ([#9638](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9638)) ([ae9e41f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ae9e41f896e7c065fa8ae579355a6d36ef2de903))
* **detect:** Detect `LCY001` as Philips 046677577490 ([#9661](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9661)) ([be3146b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/be3146bafa971c1fde7a29fe0b8b2e0777346729))
* **detect:** Detect `YRD450-F TS` as Yale YRD450-BLE ([#9651](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9651)) ([b5ee0b9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b5ee0b9c1d858d05c252f7357309283f385c6be9))
* Develco SPLZB-131: disable unsupported power on behaviour ([#9627](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9627)) ([38f0a65](https://github.com/Koenkk/zigbee-herdsman-converters/commit/38f0a65289b073cc037bb52d294e14fb0042e091))
* OWON THS317-ET: expose battery voltage ([#9630](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9630)) ([50d4908](https://github.com/Koenkk/zigbee-herdsman-converters/commit/50d4908ac921653bc4b7dc73950626771bc51efd))
* ROB_200-026-1: improve code ([#9660](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9660)) ([408c74d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/408c74d9cae7e975d19ace91d4f3987aa27856d4))
* Tuya TS0726_1_gang_scene_switch: fix scene action ([#9655](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9655)) ([b4fba21](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b4fba21340b91c25bf692c5f8920940f88205970))
* Tuya: log data query failure https://github.com/Koenkk/zigbee2mqtt/issues/18704 ([56f120e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/56f120e059efc8e18324478dedbd2c9436a75ca2))
* Ubisys H1: expose battery voltage ([#9628](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9628)) ([dc4de70](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dc4de706dd3563e7b9defd007f01bfd6c1cf5e5d))

## [24.4.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v24.3.0...v24.4.0) (2025-07-18)


### Features

* **add:** 4563 ([#9644](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9644)) ([2f10bf0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2f10bf001f069a32d4ebc4cf7f0c7e852d0e624b))
* **add:** LF-GAZ150B6250-24 ([#9636](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9636)) ([0ab7332](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0ab733293368b68741e4b50c52b1940b800cd186))
* **add:** SLZB-07P10 ([#9637](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9637)) ([17ea330](https://github.com/Koenkk/zigbee-herdsman-converters/commit/17ea330b314e80013d30d2fd00fbf591946d3769))


### Bug Fixes

* Candeo: small improvements ([#9643](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9643)) ([36acca7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/36acca76307243fbd21a8d62a9c9edf6734d740f))
* **detect:** Detect `_TZ3000_femsaaua` as LoraTap SC500ZB https://github.com/Koenkk/zigbee-herdsman-converters/issues/9640 ([bfec20b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bfec20b76b9d402f4cc845126df23cbbe2baf747))
* **detect:** Detect `_TZE284_2se8efxh` as Tuya TS0601_soil https://github.com/Koenkk/zigbee2mqtt/issues/22364 ([3c42bfa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3c42bfaedde642281b0df9962fa23793aa6265fb))
* Eco-Dim.07/Eco-Dim.10: fix description ([#9646](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9646)) ([9d72c39](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9d72c396b71750b40bdbfaaa16f12dc19a6bd9d5))
* MAZDA TR-M2Z: fix local temperature calibration ([#9641](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9641)) ([ab715a5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ab715a59bdd6eaef576f6d89251167d9e0d7df7d))
* Minor code cleanup ([#9645](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9645)) ([5373958](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5373958c3aa2f87c0cd1eadda01f595f948eed5c))

## [24.3.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v24.2.0...v24.3.0) (2025-07-17)


### Features

* **add:** 4099854513718 ([#9625](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9625)) ([559120d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/559120d3cd8b3fee339baa9cae89dc4c5ad0807f))
* **add:** 929003099102 https://github.com/Koenkk/zigbee2mqtt/issues/19658 ([f8e5b66](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f8e5b66e6900dabc9af9fab46fd70a83528c5b6c))
* **add:** intuisradiator ([#9620](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9620)) ([d367e2a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d367e2a9cd918a6cfeda20ff273f9a57381be72f))
* **add:** ZMS-206US-1 https://github.com/Koenkk/zigbee2mqtt/issues/27996 ([c6c7bd4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c6c7bd4fb97c1de9ad2581e1b42bdf64049ab6e8))
* **add:** ZS-301Z https://github.com/Koenkk/zigbee2mqtt/issues/27956 ([bee62e4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bee62e45f1ab780c5fa2dbc07c7b1b08fa18e7dd))
* Danfoss Icon: support more features ([#9632](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9632)) ([ed2dcf1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ed2dcf10339d4f8a0417147ba6807aec1d8f1827))
* S520530W: expose action ([#9622](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9622)) ([5075e9a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5075e9a2f1c1f85067f8cec22afa5839e14914af))


### Bug Fixes

* **detect:** Detect `_TZE200_wdfurkoa` as Zemismart ZM25R1 https://github.com/Koenkk/zigbee2mqtt/issues/27981 ([4ce4c2a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4ce4c2abf0fe851bdd8fe2d93a1f5871c3b7eb41))
* **detect:** Detect `_TZE284_e2bedvo9` as Tuya ZSS-QY-SSD-A-EN https://github.com/zigbee2mqtt/hassio-zigbee2mqtt/issues/789 ([2d8e0c1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2d8e0c1914e5def2672bbad8c995271e09d2afeb))
* Fix ZG-101ZD and ZG-303Z bug ([#9623](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9623)) ([4275931](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4275931105788ec04b5b671640a2c86efa97f131))

## [24.2.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v24.1.0...v24.2.0) (2025-07-14)


### Features

* **add:** 915005988502 https://github.com/Koenkk/zigbee2mqtt/issues/27974 ([bd695fb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bd695fb31ce9b9625ac819c236171e6a68031e1d))
* **add:** A5 ([#9613](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9613)) ([a58ce07](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a58ce07dfa22dd54f7d0d7595d589f56a388aecc))


### Bug Fixes

* eWeLink CK-BL702-AL-01_1: fix not controllable https://github.com/Koenkk/zigbee-herdsman-converters/issues/9617 ([bf81743](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bf81743423c9482f67c812525e6a4405672e1142))
* Inovelli: add P34 to VZM32-SN ([#9614](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9614)) ([9f245a6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9f245a68f785af37b06f45cca4a788b212b26f89))
* Tuya ZG-205ZL: add far and near motion_state values https://github.com/Koenkk/zigbee2mqtt/issues/27968 ([81c5567](https://github.com/Koenkk/zigbee-herdsman-converters/commit/81c55675f5e942681213f4e8805fa92b6f6afe93))

## [24.1.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v24.0.0...v24.1.0) (2025-07-12)


### Features

* **add:** SLZB06-Mg26 ([#9610](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9610)) ([57f061b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/57f061b021fbec2d631ebb093385aff2c5bf7b65))


### Bug Fixes

* Tuya `_TZ3000_ww6drja5`: fix use reporting instead of polling https://github.com/Koenkk/zigbee-herdsman-converters/issues/9612 ([a27d7c3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a27d7c30506158bad0d4fc63eb6b55dfabc27c67))
* Tuya TS0601_knob_dimmer_switch: fix control ([#9608](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9608)) ([4b0d8ef](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4b0d8ef587e2f4393d4204ffb78d081355b3b491))
* ZG9098A-Win: configure reporting and endpoint ([#9609](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9609)) ([f7a2823](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f7a28235b6a1c3bfe2fff92ca0fb4b3eba1173df))

## [24.0.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.72.1...v24.0.0) (2025-07-10)


### ⚠ BREAKING CHANGES

* **ignore:** fix c4c519d332e7c15e44a49f70546df1a6e58fe49d ([#9607](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9607))

### Features

* **add:** HY607W-3A ([#9602](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9602)) ([bc69cf7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bc69cf738f82b2431ad233b33d31ab617f9d764b))
* **add:** SFL02-Z https://github.com/Koenkk/zigbee-herdsman-converters/issues/9541 ([7877d20](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7877d20a69486ca93753bbdcc37456f2689ed8c9))


### Bug Fixes

* **ignore:** fix c4c519d332e7c15e44a49f70546df1a6e58fe49d ([#9607](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9607)) ([82503aa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/82503aa17b17afcaae5578022ef761051066ac23))

## [23.72.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.72.0...v23.72.1) (2025-07-09)


### Bug Fixes

* Develco (Frient) KEPZB-110: fix tamper and battery values ([#9594](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9594)) ([9b11d54](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9b11d545086fc987e99162cf5d6a9197a94a7d9e))
* **ignore:** Add dummy device type ([#9601](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9601)) ([c4c519d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c4c519d332e7c15e44a49f70546df1a6e58fe49d))

## [23.72.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.71.0...v23.72.0) (2025-07-09)


### Features

* **add:** TS0001_1_gang_switch ([#9592](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9592)) ([d0f1400](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d0f140027c9e6a70024010f378b733d80e6cad2b))
* **add:** TS0726_1_gang_scene_switch ([#9598](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9598)) ([b9b0f6a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b9b0f6a8cca928864d074186595ae402ac7e4199))


### Bug Fixes

* **detect:** Detect `_TZE284_33bwcga2` as Tuya TS0601_soil_3 https://github.com/Koenkk/zigbee-herdsman-converters/issues/9591 ([9a49bfe](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9a49bfe32c4319a8548ee276bc6c914c7b67950c))
* **detect:** Detect `915005822001` as Philips 7602031P7 https://github.com/Koenkk/zigbee2mqtt/issues/27942 ([0b0718e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0b0718e4f096b4712279cd167b4ae77f9210a88b))

## [23.71.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.70.1...v23.71.0) (2025-07-08)


### Features

* **add:** 046677577490 ([#9587](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9587)) ([9d5a4ff](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9d5a4ffb501c621a9613da493f0ee0bc8a578423))
* **add:** 4058075364561 ([#9586](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9586)) ([63ccd5d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/63ccd5da4d652b9f32ef93200c447778430ea676))


### Bug Fixes

* **detect:** Detect `_TZE284_upagmta9` as Tuya ZTH05 ([#9590](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9590)) ([4a905dc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4a905dc927897f70fcc6abc15b9b8f3939aac8f4))
* **ignore:** bump the minor-patch group with 2 updates ([#9584](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9584)) ([61c8fe4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/61c8fe463ab5464de2050e0f0ec32a1debfae18b))
* Inovelli VZM30-SN: add outputMode parameter ([#9596](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9596)) ([903d980](https://github.com/Koenkk/zigbee-herdsman-converters/commit/903d9800b919c990224abe29e1f48dd4e56063b8))
* Inovelli: support `fanTimerMode` for all devices ([#9597](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9597)) ([4e77809](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4e7780934499d138297c920a2c28a155691a0d65))
* Tuya _TZE204_aoclfnxz: fix local temperature calibration step size ([#9588](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9588)) ([923ba45](https://github.com/Koenkk/zigbee-herdsman-converters/commit/923ba45804d482714287f1292ca883d34c48551e))
* Tuya TS0601_knob_dimmer_switch: fix state control ([#9593](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9593)) ([dec0f2a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dec0f2ab396e1baa0edb22fdea9f2a526cf7c789))
* Tuya TS0601_water_switch: fix state not controllable https://github.com/Koenkk/zigbee2mqtt/issues/27833 ([4268ca8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4268ca8aa9cef311904410d66d6894831dec1e97))

## [23.70.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.70.0...v23.70.1) (2025-07-06)


### Bug Fixes

* Aqara VC-X01D: fix battery % divided by 2 https://github.com/Koenkk/zigbee2mqtt/issues/27915 ([e64eab8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e64eab876f9265630409c2674b79032cc669177d))
* **detect:** Detect `_TZ3000_kaflzta4` as Moes ERS-10TZBVB-AA and `_TZE200_afycb3cg` as Tuya ZG-103Z ([#9581](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9581)) ([adb5266](https://github.com/Koenkk/zigbee-herdsman-converters/commit/adb52665baea839b4451545327462164aa014c35))
* **detect:** Detect `_TZ3000_liygxtcq` as Tuya TS0004_switch_module ([#9583](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9583)) ([248e50f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/248e50f8b12fe51c3b7bf371886d65c772ad6cb2))
* **detect:** Detect `_TZE200_fphxkxue` as Moes ZWV-YC ([#9582](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9582)) ([51be0a4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/51be0a470258fecc09ef53e4ddd8c5b8e68fce2c))
* TS0505B_1 transition fixes ([#9578](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9578)) ([3c1d56c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3c1d56c1db0422b3edd800f611764f9d507b9193))
* Tuya TS0601_air_quality_sensor: fix formaldehyd and voc units https://github.com/Koenkk/zigbee2mqtt/issues/27914 ([e310570](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e31057010670dd6a8cf14b78e1b8a11ea826b9c0))
* Tuya TS0601_water_switch: fix battery % https://github.com/Koenkk/zigbee2mqtt/issues/27833 ([64c6e9e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/64c6e9e33084fd1a6dc8ae2f491c25b7bf121467))

## [23.70.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.69.0...v23.70.0) (2025-07-04)


### Features

* **add:** COZIGPMS ([#9572](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9572)) ([c421d33](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c421d337d5a57f1bb94ca7665fdd2643236f6496))
* Enhance light_colortemp_move converter to support min/max constraints ([#9567](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9567)) ([11372d2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/11372d217fcd786b39157ee8a68ffb03562aff51))
* Novato ZPV-01: support battery ([#9577](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9577)) ([96cbefc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/96cbefc7e358164176e40bab70bf42e716b321b3))


### Bug Fixes

* **detect:** Detect `_TZ3000_uilitwsy` as `ZM-L03E-Z` and detect ` _TZ3000_66fekqhh` as ZWOT16-W2 ([#9575](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9575)) ([94213d0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/94213d0b279fa7ec86d74018b437dba1e2880f04))
* **detect:** Detect `_TZE284_k7v0eqke` as Zemismart ZMS-206EU-3 https://github.com/Koenkk/zigbee2mqtt/issues/27133 ([6bbcbfb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6bbcbfb1a5bc514481c6065c1f62f4f5c050860b))
* **detect:** Detect `_TZE284_uqfph8ah` as BSEED BSEED_TS0601_cover https://github.com/Koenkk/zigbee2mqtt/issues/27790 ([e0e11cb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e0e11cbafc9b25c7ac124a7ebe15ff305bbc82cc))
* **detect:** Detect `1 Mini` as Shelly S4SW-001X8EU and `1PM Mini` as Shelly S4SW-001P8EU https://github.com/Koenkk/zigbee2mqtt/issues/27897 ([9a20565](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9a20565b5eee919caf65c9aedddf752986cf6807))
* **detect:** Detect `eco-dim07-zigbee` as Eco-Dim.07/Eco-Dim.10 https://github.com/Koenkk/zigbee2mqtt/issues/27891 ([26a2e77](https://github.com/Koenkk/zigbee-herdsman-converters/commit/26a2e776c9dbefec0c22d53a8a84eb788e89f54a))
* **detect:** Detect `NimlyShared` as Onesti Products AS Nimly https://github.com/Koenkk/zigbee-herdsman-converters/pull/9527 ([c9ff530](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c9ff530b8bfd255ac027fc3fc02543b07e847eed))
* **ignore:** Fix duplicate ZG-101Z/D model ([6bacca9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6bacca94248ec23a410f1f08a9e2e917988517e0))
* Smartwings WM25L-Z: fix power source (battery) https://github.com/Koenkk/zigbee2mqtt/issues/27859 ([58517d1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/58517d18e2560b5b1189cc0bbaefc59a4f3b0684))
* Tuya TS0601_knob_dimmer_switch: fix endpoints ([#9573](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9573)) ([3a307e7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3a307e77e33ba41de733976024f9218c2228a384))

## [23.69.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.68.0...v23.69.0) (2025-07-01)


### Features

* **add:** C-ZB-SR5BR ([#9565](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9565)) ([0bf65c4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0bf65c4bab437890b37eedb4a73598508b7c556f))
* Sunricher SR-ZG9001K8-DIM: support multi endpoint commands for on/off and level control ([#9568](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9568)) ([e72fba2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e72fba20b00f8c4dad9cdaa382a6956ea0e696d7))

## [23.68.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.67.0...v23.68.0) (2025-06-30)


### Features

* **add:** L14 ([#9552](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9552)) ([b3dcc94](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b3dcc94598a73d04588c5b69270b8199d721ca74))
* **add:** ZBM5-1C-80/86, ZBM5-2C-80/86, ZBM5-3C-80/86 ([#9563](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9563)) ([7bd9fb6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7bd9fb64d95b357b97bce8b4f2dc7548e1bc2439))
* Saswell SEA801-Zigbee/SEA802-Zigbee: expose `anti_scaling` ([#9564](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9564)) ([aaba795](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aaba795227e475dff6b7f417e849c434fc206046))


### Bug Fixes

* **detect:** Detect `_TZ3000_5af5r192` as Moes ZWV-YC ([#9566](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9566)) ([c4d4616](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c4d461688e564ff4d22633b75c766d50ce85ed13))
* **ignore:** bump the minor-patch group with 3 updates ([#9562](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9562)) ([eadb1ab](https://github.com/Koenkk/zigbee-herdsman-converters/commit/eadb1abf99fc4f3fc3a9b8a2441c471d5f191a2d))
* Improvements for LoraTap SC500ZBv2 and for Nous B4Z (with common reusability) ([#9560](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9560)) ([087efc8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/087efc8a45879d1047278a2c81463791901863b9))

## [23.67.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.66.0...v23.67.0) (2025-06-29)


### Features

* **add:** R3 Smart Switch ([#9551](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9551)) ([21e1c54](https://github.com/Koenkk/zigbee-herdsman-converters/commit/21e1c5426eba5c415fe7c0e2c3c0cad867ce10c5))
* **add:** ZG-807Z, ZG-101ZS, ZG-305Z ([#9555](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9555)) ([79c9a8a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/79c9a8a13e8c85ea4c31014caa132fccdb992527))


### Bug Fixes

* **detect:** Detect `_TZB210_ue01a0s2` as MiBoxer FUT035Z+ https://github.com/Koenkk/zigbee2mqtt/issues/26009 ([3c44c4e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3c44c4e261d2c6d064b39388ab07892dc5b98181))
* **ignore:** Migrate to Biome 2 ([#9544](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9544)) ([576e8b7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/576e8b70ba5378bfac1187a3b38824cf790c851d))
* Inovelli VZM32-SN: remove extra mmwave Control Command ([#9558](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9558)) ([3dd6c61](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3dd6c6127d4092a5adb89ba9213f0daaea077e4a))

## [23.66.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.65.0...v23.66.0) (2025-06-27)


### Features

* **add:** _TZE284_debczeci https://github.com/Koenkk/zigbee-herdsman-converters/issues/9548 ([dc6258f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dc6258f5c3255cee07699da869f23f4cd5e4837e))
* **add:** A7Z ([#9553](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9553)) ([258f21a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/258f21a24045d00ee6361bffed87f7a9d1ef9f3f))
* **add:** E9 ([#9556](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9556)) ([16e01db](https://github.com/Koenkk/zigbee-herdsman-converters/commit/16e01db9a4f5c4b9a59f9973f3c9950f41be03bb))
* **add:** TS0201-z-SlD, ZG-222ZA-z-SlD ([#9557](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9557)) ([b3fa88f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b3fa88f3930c5c6b7c6a449ca8928a9ade2844e6))
* **add:** ZC-LS02 https://github.com/Koenkk/zigbee2mqtt/issues/27677 ([522ffd4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/522ffd4b47211b94224db329071c24abb067cec4))
* Sunricher SR-ZG9032A-MW: support more features ([#9554](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9554)) ([671b29e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/671b29e8fca0a41cbc53eda64e9a3e6fb47b8b76))
* Ubisys H10: support cooling  ([#9546](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9546)) ([d8357f0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d8357f09bffc9668a4dca990138885d0828f0463))


### Bug Fixes

* **detect:** Detect `_TZ3002_phu8ygaw` as Tuya TS0726_multi_4_gang ([#9549](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9549)) ([64b94c1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/64b94c1774cb9793f010c15775ab9bfec646fd0a))
* **detect:** Detect `_TZE284_awepdiwi` as Tuya TS0601_soil_2 ([#9550](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9550)) ([33fc228](https://github.com/Koenkk/zigbee-herdsman-converters/commit/33fc2285b3f43ba346d80f68826e0ca4cdefc39b))

## [23.65.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.64.0...v23.65.0) (2025-06-24)


### Features

* **add:** SR-ZG2819S-DIM ([#9540](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9540)) ([8ad5fa1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8ad5fa167760a6c09a81511201637bea4c07ce5f))
* Tuya TS0601_cover_6: support `illuminance` ([#9536](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9536)) ([6f70494](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6f704940e59b4ea072ee9cf407d8fe4d84f3c4c6))


### Bug Fixes

* Adjust the reporting frequency threshold of some Bituo devices ([#9537](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9537)) ([04f5bf8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/04f5bf83c4d5c0a3e7a27227f6c085e9f8673fca))
* **detect:** Detect `_TZE200_u6x1zyv2` as HOBEIAN ZG-223Z ([#9542](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9542)) ([ab204be](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ab204be1bd9bbb28a36170a972a98e6673fb2e8c))
* **ignore:** Fix TS0601_knob_dimmer_switch brightness ([#9538](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9538)) ([8f1c2f6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8f1c2f6668d1fd653b7cab6d11d6cc1aa23edd5f))

## [23.64.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.63.0...v23.64.0) (2025-06-23)


### Features

* **add:** SZLMR10, CZF02, SZT06 ([#9525](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9525)) ([5642595](https://github.com/Koenkk/zigbee-herdsman-converters/commit/56425957d563609994f16c9319c5f3e2b1191dae))
* Third Reality 3RSM0147Z: expose soil moisture ([#9532](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9532)) ([e9f05f7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e9f05f749c9da12f8e28fe89bbaf0d3830285f8d))


### Bug Fixes

* amina S: fix charge limit reading ([#9534](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9534)) ([aea9104](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aea9104b9d831fa48f05962ea4f88d150337613d))
* **ignore:** bump @types/node from 22.15.30 to 24.0.3 ([#9531](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9531)) ([ec28d03](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ec28d032a472f70c983ae897198a18f3621513a2))
* **ignore:** bump the minor-patch group with 3 updates ([#9530](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9530)) ([899748e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/899748e4e0932a71e312508d2f0aa057bc24c5ff))
* **ignore:** Fix TS0601_knob_dimmer_switch brightness ([#9533](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9533)) ([1d93d28](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1d93d284ef5125886e1e5343aff9978b23aa0600))

## [23.63.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.62.0...v23.63.0) (2025-06-22)


### Features

* **add:** MB60L-ZG-ZT-TY ([#9528](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9528)) ([1cd6e0e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1cd6e0ed564de8ba2c230e49e77db8a28ae8c815))
* **add:** RB-ElectricityDsp-061-3 ([#9524](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9524)) ([3c373de](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3c373decfeae6eb8066052acdb660627ed08ca93))


### Bug Fixes

* Aqara JY-GZ-01AQ: improve battery % calculation ([#9523](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9523)) ([4254a97](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4254a975aaceb42ce18bd1abe523024dc311bd22))
* **detect:** Detect `NimlyPRO24` as Nimly ([#9527](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9527)) ([fd6c655](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fd6c6555b5c12ea91a92c3f5dc3582acedfa0903))
* SONOFF TRVZB: fix `Exception while calling fromZigbee converter: Expected one of: 0, 1, got: '2'}` https://github.com/Koenkk/zigbee2mqtt/issues/27080 ([89a0bf1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/89a0bf1cfad638a6d9da4e2305601879af11b4d1))

## [23.62.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.61.0...v23.62.0) (2025-06-19)


### Features

* **add:** HS2FD-EF1-3.0 ([#9521](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9521)) ([8d88c89](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8d88c89e8ec34a1d9ffe1754e0e2c144f9f4af33))
* **add:** VZM32-SN ([#9515](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9515)) ([f2ab2c8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f2ab2c8f6858c42547207ab49785085eb1b6d8d5))


### Bug Fixes

* Efekta high_co2_gas: fix `INVALID_DATA_TYPE` ([#9519](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9519)) ([1199a50](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1199a50d8d5f02f8411c09a98e07d6f576f3aba1))

## [23.61.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.60.0...v23.61.0) (2025-06-18)


### Features

* **add:** C-ZB-DM201-2G ([#9516](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9516)) ([cb1c2d1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cb1c2d11bbb150a686b546ad8a3e73a50394d96d))
* **add:** ECB62-ZB ([#9502](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9502)) ([68b5a7e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/68b5a7ea5b40f07b33574b3ed371e3f86f1578d3))
* **add:** TS0601_knob_dimmer_switch ([#9506](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9506)) ([6480706](https://github.com/Koenkk/zigbee-herdsman-converters/commit/648070688bb57457f86aa908793ebe445f765018))


### Bug Fixes

* eWeLink CK-BL702-AL-01_1: fix integration https://github.com/Koenkk/zigbee2mqtt/issues/27758 ([550666e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/550666e658cf31a61c808a9c52876ccaf044380f))

## [23.60.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.59.0...v23.60.0) (2025-06-17)


### Features

* **add:** FDS315 ([#9488](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9488)) ([fcd75dd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fcd75dd3d0575fa7de1adb88e2b4a444390557a7))
* **add:** HSSA18-Z-MID ([#9510](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9510)) ([a7b46fe](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a7b46feb3ce23803cda1abfa53f3e88e3a5d51d3))
* **add:** MG-GPO01 ([#9491](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9491)) ([8904940](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8904940ea9801bb228a14136105ca1ca450a44cb))
* **add:** SR-ZG2836D5-G4 ([#9507](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9507)) ([78a5719](https://github.com/Koenkk/zigbee-herdsman-converters/commit/78a5719191420ff11664890dad84b853da0a4697))
* **add:** SZ-ESW02N-CZ3 ([#9499](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9499)) ([2f04aa3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2f04aa3532e52f6b9389f076369622dbf10675ef))
* **add:** ZBSM20WT ([#9503](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9503)) ([3126add](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3126add5308a26ce0e57f0355d0530d1376a4edc))
* **add:** ZG-102ZA ([#9508](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9508)) ([f6ef143](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f6ef14347b1b1fe89986c5252b3623abef05705c))


### Bug Fixes

* **detect:** Detect `_TZ3000_g8n1n7lg` as Tuya ZG-001 https://github.com/Koenkk/zigbee2mqtt/issues/27715 ([c899cce](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c899cceb8eae5d588c4e0d5a889df3a5ee2f2909))
* **detect:** Detect `_TZE204_mexisfik` as Tuya MG-ZG04W https://github.com/Koenkk/zigbee2mqtt/issues/27716 ([165fd2b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/165fd2b645b08a011b277ddc802289bddcaab09a))
* **detect:** Detect `3P power consumption module` as Legrand 412175 ([#9498](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9498)) ([1334832](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1334832d1edbb2af684c7b3bb6b91c692198e61d))
* Fix detection of SR-ZG9101SAC-HP-SWITCH-2CH ([#9501](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9501)) ([c7cc3e7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c7cc3e711a05a6448a215d5446e529e3904c169f))
* **ignore:** bump the minor-patch group with 3 updates ([#9504](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9504)) ([63f2d7a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/63f2d7a2e4793f6dc25f02a4edb30ecb2d629d2b))
* Third Reality 3RSB22BZ: fix power source https://github.com/Koenkk/zigbee2mqtt/issues/27724 ([f0039cd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f0039cd8dd6d79e52d3bf3b61b7ecb3f7ae53e95))

## [23.59.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.58.0...v23.59.0) (2025-06-13)


### Features

* **add:** SNT858Z ([#9480](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9480)) ([0841340](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0841340f43ccad8dab8bef23015bcec7aa93c4f0))
* Aqara ZNJLBL01LM: support OTA https://github.com/Koenkk/zigbee-OTA/pull/787 ([86ce116](https://github.com/Koenkk/zigbee-herdsman-converters/commit/86ce1160ec186ccbd498e4458621624489dbf446))
* AwoX 33952: support more actions ([#9407](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9407)) ([b6d210c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b6d210cb93d6eb1504c40d355e8fe8b023b2e838))
* Bed.box: support more features ([#9489](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9489)) ([5ccc357](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5ccc357a09ba691ea6dd8786dd6a89145c78bd49))


### Bug Fixes

* Convert color x/y string to number https://github.com/Nerivec/zigbee2mqtt-windfront/issues/64 ([875f0ba](https://github.com/Koenkk/zigbee-herdsman-converters/commit/875f0ba369eedaacfa498a3452755db68ec9fc6c))
* **ignore:** Sprut.device Bed.box Implementation ([#9493](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9493)) ([db07bef](https://github.com/Koenkk/zigbee-herdsman-converters/commit/db07befe3892484452465e8b4460babff9a0d7fa))

## [23.58.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.57.1...v23.58.0) (2025-06-11)


### Features

* **add:** 9028412A ([#9471](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9471)) ([f6b3d96](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f6b3d968b54730484fa25989beeed5ac03f56086))
* **add:** CoZB_dha ([#9484](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9484)) ([674a7b7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/674a7b7af82422093b2e5e52bb3b231831eae0ec))

## [23.57.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.57.0...v23.57.1) (2025-06-10)


### Bug Fixes

* Candeo C-ZB-SEMO: improve illuminance reading ([#9482](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9482)) ([9867d9a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9867d9a3411dba7af87a40c94ff28376bebdd455))
* **detect:** Detect `_TZ3210_dwzfzfjc` as Moes ZB-LZD10-RCW ([#9481](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9481)) ([12bdf30](https://github.com/Koenkk/zigbee-herdsman-converters/commit/12bdf30f389e3e0942b1866fb823f9cdbb1ad488))
* **detect:** Detect `_TZE608_xkr8gep3` as Tuya TS0603 ([#9483](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9483)) ([c7811c5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c7811c517137f99548296a6e401705cb42e0a9fc))
* **ignore:** bump the minor-patch group with 4 updates ([#9479](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9479)) ([ffb36f4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ffb36f447fae426560c70583fde6c49bb27aa522))
* Tuya TS0726: fix scene actions ([#9472](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9472)) ([ed574c7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ed574c7387223b2cb9201f004c01c6dd3ecd0fea))

## [23.57.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.56.0...v23.57.0) (2025-06-07)


### Features

* **add:** SR-ZG9032A-MW, SR-ZG9098A-Win, SR-ZG9098A-Light ([#9473](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9473)) ([3e91f5d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3e91f5d2b84770d3d49003efa5bb3d3624a672cf))


### Bug Fixes

* **detect:** Detect `_TZE284_libht6ua` as Tuya TS0601_cover_6 https://github.com/Koenkk/zigbee2mqtt/issues/27643 ([9f1ce5f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9f1ce5f25cf4148950b49fb5699c7f5ec060c52a))

## [23.56.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.55.0...v23.56.0) (2025-06-06)


### Features

* Add neutral current support ([#9455](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9455)) ([3d7097a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3d7097a64228127142d0921cd6d162bf3bcb4a92))
* **add:** HY368 ([#9466](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9466)) ([1ae3259](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1ae32590b1b9732f28b9fe8e0eedcf8071fa4f37))
* **add:** JR-ZPM01 ([#9456](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9456)) ([861d4d3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/861d4d3081c7251db2c1cfd2be3fff18210f99ed))
* **add:** SM-PW801EZ ([#9453](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9453)) ([c8e2dde](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c8e2ddebb3c6771985632e6bf1bef0ec8f98e566))
* **add:** ZWOT12 ([#9457](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9457)) ([5867263](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5867263d80fa085889d74659f6023867bcb5afa3))
* Aqara KD-R01D: add `hold`, `double` and `release` actions ([#9460](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9460)) ([a6d7cc4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a6d7cc4acc94eaea3c85f39a779fd97a235513b1))
* Aqara KD-R01D: support multi-click ([#9463](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9463)) ([95c28be](https://github.com/Koenkk/zigbee-herdsman-converters/commit/95c28bee4cf2b296d61ea6ea7a934f3069fca7c6))
* Aqara ZNXDD01LM: support `on_level` ([#9465](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9465)) ([02c89e0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/02c89e0e2e88d16c19ea50b26935ac64696e24ac))


### Bug Fixes

* Aqara S04D: fix threshold scale ([#9462](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9462)) ([5c6e0c3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5c6e0c3201e40801c55877135ed7fcacf6ad527b))
* Aqara SRTS-A01: fix `Value: '2' not found in: [0, 1]` https://github.com/Koenkk/zigbee2mqtt/issues/27615 ([f6ac246](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f6ac246b959eb8abbe68d7ad419bca8016ff6a48))
* **detect:** Detect `_TZ1800_akzvkzqq` as Lidl HG06668 ([#9459](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9459)) ([568dc46](https://github.com/Koenkk/zigbee-herdsman-converters/commit/568dc464599831f991e9079e38937c9236b796e9))
* **detect:** Detect `_TZE284_utkemkbs` as Tuya SZTH02 ([#9469](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9469)) ([c3d4888](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c3d48889bfabb82782e5b7c85ba175ec6c65b2cd))
* EFEKTA_eTH102z: fix `invert` type ([#9461](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9461)) ([0a3b30f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0a3b30feea867aa34e603c5039b6665e55f346c3))
* **ignore:** Aqara S04D - Fix correct attribute ([#9470](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9470)) ([6c45dbc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6c45dbce612a537b040ff327a0b4d3a1c647e46a))
* Neo NAS-PS10B2: fix `lux_value` and `motion_sensitivity` ([#9458](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9458)) ([3060435](https://github.com/Koenkk/zigbee-herdsman-converters/commit/30604357f80b57913d0b3cdbc1eeeefcf1a9caeb))
* Tuya BLE-YL01: improve reporting stability https://github.com/Koenkk/zigbee2mqtt/issues/23946 ([c8957d1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c8957d1155fcb059c9519c7b538bf1548e0ab592))

## [23.55.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.54.0...v23.55.0) (2025-06-04)


### Features

* Tuya M8Pro: support more features ([#9450](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9450)) ([5a7cc4a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5a7cc4a9a2d9dd6255101778748f0c00f2ae3f7b))


### Bug Fixes

* **detect:** Detect `_TZ3000_bguser20` as Tuya WSD500A ([#9448](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9448)) ([d30547a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d30547af30827960221c9e4818b5bd1676c45cf8))
* **detect:** Detect `_TZE284_wwaeqnrf` as Zemismart ZMS-206US-4 https://github.com/Koenkk/zigbee2mqtt/issues/27305 ([9bfe100](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9bfe1007b99dc385624e1d2b07860318098d81b5))
* Third Reality: update 3R plug gen3/e3/UZ1 and add private cluster ([#9452](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9452)) ([4281c7b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4281c7bc1b66d5a80539a1f122da778da81fb320))

## [23.54.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.53.0...v23.54.0) (2025-06-02)


### Features

* **add:** ZSS-S01-GWM-C-MS ([#9444](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9444)) ([c231dad](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c231daddcc02c3c989e27bb751cd85d9f01a0f02))
* Innr RF 271 T and RF 273 T: enable OTA ([#9445](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9445)) ([9c212a2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9c212a29eba27e97498e623780f20b3b026df4b5))


### Bug Fixes

* **detect:** Detect `_TZE204_3ctwoaip` as Zemismart ZMS-206EU-2 https://github.com/Koenkk/zigbee2mqtt/issues/27286 ([830b118](https://github.com/Koenkk/zigbee-herdsman-converters/commit/830b118ab654362287e262936271038411ff4e9b))
* SmartThings IM6001-MPP01: fix configure failing https://github.com/Koenkk/zigbee2mqtt/issues/27140 ([3675a53](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3675a53c8801df0c07b8b257c8189c499897295b))

## [23.53.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.52.1...v23.53.0) (2025-06-01)


### Features

* **add:** 929003777201, 929003817101 ([#9441](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9441)) ([9a5cbe6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9a5cbe6f13a4fb4a4627204485b20387a0ffd1dd))
* **add:** EFEKTA_TH_POW_R, EFEKTA_T1_MAX_R ([#9439](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9439)) ([89a9fae](https://github.com/Koenkk/zigbee-herdsman-converters/commit/89a9fae109aee3fdc8b397d6d3e78bf820eab76e))
* **add:** TRV06-AT ([#9437](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9437)) ([b77571d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b77571d0ce1596725fb08c1f6c5cb2b67e1830c0))


### Bug Fixes

* **detect:** Detect `_TZ3000_ruldv5dt` as Tuya ZG-2002-RF ([#9440](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9440)) ([8d9dab6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8d9dab689a1a8e0c46db50a47844d0ebbacb5d5b))
* **ignore:** Revert "feat: Hue: add `execute_if_off` for colour lights ([#9426](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9426))" ([#9442](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9442)) ([5703738](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5703738d650971ca17bb9065a1cee9dfdcbb5fb6))

## [23.52.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.52.0...v23.52.1) (2025-05-31)


### Bug Fixes

* **detect:** Detect `RODRET wireless dimmer` as IKEA E2201 https://github.com/Koenkk/zigbee2mqtt/issues/27491 ([004ee99](https://github.com/Koenkk/zigbee-herdsman-converters/commit/004ee9937410e3839b8927d176f79b607ab8799b))
* **detect:** Detect SV02-412-MP-1.0 as Keen Home SV02  ([#9433](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9433)) ([03737fc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/03737fc039eb611556ad6018f35cf1f6250114df))
* **ignore:** bump the minor-patch group with 2 updates ([#9435](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9435)) ([919cbc1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/919cbc10d8e987d97bb4ea92efc8ea68fa5f5906))
* **ignore:** fix battery reporting not configured https://github.com/Koenkk/zigbee2mqtt/issues/27556 ([acd5f48](https://github.com/Koenkk/zigbee-herdsman-converters/commit/acd5f48ed25aa50af67aac56d9ef22fe1651c348))

## [23.52.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.51.0...v23.52.0) (2025-05-30)


### Features

* **add:** CS-201Z ([#9430](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9430)) ([a99b281](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a99b281511e7ae07e12b95720be922003acc3924))
* **add:** TYONOFFTS, TYSCENECUBE ([#9427](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9427)) ([3e21843](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3e21843f01dd9cd4c7e044fa49e1427028b689b6))
* Hue: add `execute_if_off` for colour lights ([#9426](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9426)) ([afdfbe4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/afdfbe4449893c129fedb9a3a23ac93ab1f305dc))


### Bug Fixes

* **detect:** Detect `_TZ3000_cmcjbqup` as Tuya SPM01 ([#9429](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9429)) ([37af76f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/37af76f21ad6498b69f9940c6d6ceef2578817a4))
* Harmonize capitalization of vendor names ([#9431](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9431)) ([145e93f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/145e93ff1519275146b2ccc07561f8c29f63233c))

## [23.51.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.50.1...v23.51.0) (2025-05-28)


### Features

* **add:** 412175 ([#9422](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9422)) ([89d8af2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/89d8af26b26302903c016bd2ec8a573a16916643))
* **add:** SYZB-6W ([#9421](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9421)) ([d30e9b6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d30e9b6b79a3972b6bc3007e43790b00514997c3))


### Bug Fixes

* 3RDP01072Z: fix divisor ([#9423](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9423)) ([8c343f2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8c343f27b8707c701e4149de74f8f0120c2072c7))
* Add some new HOBEIAN models ([#9394](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9394)) ([063e830](https://github.com/Koenkk/zigbee-herdsman-converters/commit/063e83085d42f5beab2cc6f659825e2006c1d539))
* Bacchus: change electicity meter reporting ([#9424](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9424)) ([0dbbca6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0dbbca6d4dbb8e0a49272612aa886200eace6d54))
* M515EGBZTN: fix integration ([#9420](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9420)) ([c6369f1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c6369f1357b988a1891d6ed16e4fe88c5ef93af1))

## [23.50.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.50.0...v23.50.1) (2025-05-27)


### Bug Fixes

* 3RDTS01056Z: fix configure failing on battery reporting ([#9419](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9419)) ([dda2bc0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dda2bc0a3aeeb047c11638a9581ab4888a8e3064))
* Add various TS0726 models https://github.com/Koenkk/zigbee2mqtt/issues/27167 ([1dfea7c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1dfea7c027c1b6a1d44694873f0e61d951974a45))
* **detect:** Detect `_TZ3002_gdwja9a7` as Tuya TS0726_2_gang https://github.com/Koenkk/zigbee2mqtt/issues/27523 ([a3b7633](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a3b76337c39bf549da2e8170128364492d0bc8be))
* Improve modernExtend default args ([#9417](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9417)) ([417037d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/417037df5c032509632ad32b36822ea515af947d))

## [23.50.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.49.0...v23.50.0) (2025-05-26)


### Features

* **add:** 929003812901 https://github.com/Koenkk/zigbee2mqtt/issues/27510 ([f441b6d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f441b6dde178fc13a208bbce27605613ae9ef58c))
* **add:** 929003846601 ([#9400](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9400)) ([fac8ccd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fac8ccdd5cd9e9e12f5e41b1fa87b3e9f6fec5f1))
* **add:** Duck Pool Thermometer ([#9414](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9414)) ([d72a8bf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d72a8bf4a0027a23809313b342ca0c7d8757749d))
* **add:** LKTMZL02-z ([#9390](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9390)) ([f885179](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f885179ef54b9a3dbf701d2a3ab631c305fdcd9d))
* **add:** SR-ZG9095B ([#9395](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9395)) ([bf9ecff](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bf9ecffdab445d132a9c08f3494ce710b3fd3684))
* **add:** TO-Q-SY1-ZT ([#9388](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9388)) ([dec54ae](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dec54ae854bdd85dec9260ea54c5cf6d7af4be92))
* **add:** TS0001_repeater ([#9389](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9389)) ([17dfde2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/17dfde232c9e1680242cc6c8eeb93e0c4f9d84dd))
* **add:** ZC-GM42 ([#9398](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9398)) ([ae8dd45](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ae8dd450892164e9505f778be2df84b8a9b3d9f8))
* **add:** ZTM1-EN ([#9404](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9404)) ([2f68c6e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2f68c6ed410d12648b70ea25bdb0365a2c82ab89))
* **add:** ZTRV-S01 ([#9393](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9393)) ([306a011](https://github.com/Koenkk/zigbee-herdsman-converters/commit/306a011bda4018d232801923976b5e563a1d6ad6))
* b-parasite: expose identify ([#9386](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9386)) ([e76fb06](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e76fb0629dbc04bb9e5cd4bbf63086ed333aea4b))
* Enable battery voltage reporting on some IKEA devices ([#9391](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9391)) ([c3733fe](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c3733fe87386cd956909a6699c776d4ffc2c6dd5))
* POK002_POK007: expose `max_moisture` ([#9412](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9412)) ([7a88204](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7a8820474e66de7b6a5be916f2c607a24cb911a4))


### Bug Fixes

* 3RSB02015Z: fix `3rSmartBlindGen2SpecialCluster` cluster ([#9375](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9375)) ([d4fc16d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d4fc16de6c12c32c3b80b2d3658857fe0fd40fa1))
* Aqara W100: improve integration ([#9415](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9415)) ([611d2e2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/611d2e2fb2852ee166f749490a40b08403bf3a45))
* Configure battery attributes only for a single endpoint ([#9416](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9416)) ([070f5c2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/070f5c2dc93744fb0ff9387d63431fe1e00f2016))
* **detect:** Detect _TZE200_vs0skpuc as a HOBEIAN ZG-227Z ([#9392](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9392)) ([1f7e761](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1f7e761648e984c7abfb3b22df98da7ab44721d2))
* **detect:** Detect `_TZ3210_2uk4z8ce` as Moes ZP-LZ-FR2U ([#9387](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9387)) ([f914aa5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f914aa5f8bd226e672186b36c22993c4b5fd9155))
* **detect:** Detect `_TZE284_n4ttsck2` as ONENUO 288WZ smoke detector ([#9397](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9397)) ([0e70071](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0e70071d225b99e7f16f003b340168e253c22e8c))
* **detect:** Detect `_TZE284_oitavov2` as Tuya TS0601_soil ([#9402](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9402)) ([c466726](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c466726b1c7f2688b1b0a92a7b9a3dec797d9d57))
* **detect:** Detect `929003808001_01` and `929003808001_02` as Philips 5062231P7 ([#9401](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9401)) ([8b41faa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8b41faac18741aec5df8fa3cca7ec97300c2cd52))
* Fix OTA hardware version check ([#9368](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9368)) ([0987371](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0987371b7c8f011c4a4cb914832d70ba0df3af56))
* Senoro.Win: fix alarm ([#9383](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9383)) ([0120125](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0120125483839ff284e7bfad2b0f23ed6872ef02))
* SNZB02-LD: remove non-working options ([#9399](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9399)) ([8c08f4f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8c08f4f3f4fbf50fea68aed3ce9a8c8ac6ea4a4c))
* THERM_SLACKY_DIY_R01: fix some converters ([#9408](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9408)) ([267b6f8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/267b6f8b110d611b13ad6734193ce1f565026df2))
* Tuya TS0001_power: fix power monitoring for appVersion: 100 & 162, manufName: _TZ3000_xkap8wtb ([#9385](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9385)) ([1eacb30](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1eacb30c2a1d4e9a78c3d12862d57c04c7785af2))

## [23.49.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.48.0...v23.49.0) (2025-05-22)


### Features

* **add:** E1M-G7H https://github.com/Koenkk/zigbee2mqtt/discussions/27446 ([bf7bbf7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bf7bbf7e918da2cbc60c8639d00683df49f9eafe))
* **add:** EFEKTA_AQ_Smart_Monitor_Gen2 ([#9381](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9381)) ([d478dd7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d478dd7fc3aa69ba63eac95d7727fda32d70a0d6))
* **add:** HA-ZM12mw2-4K ([#9376](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9376)) ([bc832e2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bc832e2e649bf6e91bfa495e4204ba973aeaa243))
* **add:** WS-K03E ([#9382](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9382)) ([a0edd40](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a0edd4018ac1995dd6c589612678da5ec3c4487c))


### Bug Fixes

* **detect:** Detect `_TZ3000_rdhukkmi` as Tuya ZY-ZTH02 and `_TZ3000_bguser20` as TH03 ([#9379](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9379)) ([7d2129a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7d2129a2b729effd117c0cdbbf1ed4ed093d6b0b))

## [23.48.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.47.0...v23.48.0) (2025-05-21)


### Features

* **add:** 046677577520 ([#9377](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9377)) ([6de2371](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6de2371242260b36af64e405d562165e2bebb284))
* **add:** 929003736401 ([#9372](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9372)) ([90ee764](https://github.com/Koenkk/zigbee-herdsman-converters/commit/90ee764ceaa68397d7fa4f9869daed0db32f5e50))
* **add:** AD-CTW123001 https://github.com/Koenkk/zigbee-herdsman-converters/issues/9373 ([70d739a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/70d739a8375b6f86c5b73f1119f57c7a72c6af14))
* **add:** R7067 ([#9370](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9370)) ([4ec897a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4ec897ac62abbedcd03c403cec08f4e1f53b574e))
* **add:** Senoro.Win ([#9371](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9371)) ([f369f75](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f369f752c9915b115a25cd2757a29a659cf7a527))


### Bug Fixes

* **detect:** Detect `_TZE284_d7lpruvi` as Tuya TS0601_temperature_humidity_sensor_2 ([#9374](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9374)) ([09464fd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/09464fdb8e8398f78893f1c325a0a76d05b90195))

## [23.47.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.46.0...v23.47.0) (2025-05-20)


### Features

* **add:** 067797 ([#9366](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9366)) ([7fee57d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7fee57d383149b4f14ab0d67a22d6752eb157284))
* **add:** 5717 ([#9364](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9364)) ([59c942e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/59c942eddc399ff1401355f929ebb7b2afaeb5b9))
* **add:** ZC-LP01 ([#9365](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9365)) ([71a98bb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/71a98bb62566bb8265de411d9389f7674d5d8de4))
* SONOFF S60ZBTPF and S60ZBTPG: expose more features ([#9263](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9263)) ([6f82625](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6f82625178c8eb41e0aecc22b1e72fa24ff8c77d))


### Bug Fixes

* **detect:** Detect `_TZE204_tdhnhhiy` as Tuya TS0601_switch_8 https://github.com/Koenkk/zigbee2mqtt/issues/27454 ([9bb691a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9bb691a4841d2543db2334a755d2b7467efd97ed))
* **detect:** Detect `_TZE284_6ycgarab` as Tuya ZSS-QY-SSD-A-EN https://github.com/Koenkk/zigbee-herdsman-converters/issues/9289 ([64e063a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/64e063a6226089ae4c8c984abdbee9dd720444fa))
* Fix RADION TriTech ZB typo https://github.com/Koenkk/zigbee2mqtt/discussions/27455 ([6edb338](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6edb33873930a6bf67aa00b2f69aa96cdd37e9fc))
* Tuya MG-ZG01W: simplify integration ([#9363](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9363)) ([a60a23f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a60a23fc36ed62fd1b56694980e206960ef62bb3))

## [23.46.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.45.0...v23.46.0) (2025-05-18)


### Features

* **add:** 929003802101 ([#9359](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9359)) ([b872831](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b8728312feb4e8348a8ece4e2a582168ace6d9c4))


### Bug Fixes

* 3RTHS24BZ: fix power source ([#9357](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9357)) ([37353d5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/37353d5ee4a8d3b77cc6096f89f1b857080c9504))
* **detect:** Detect `_TZE200_gnw1rril` as Tuya TS0601_cover_10 ([#9346](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9346)) ([0e5fefb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0e5fefb0d2df78a5f34925a3c50b764ebdad4f82))
* Efekta: support `lux_factor` for various devices ([#9354](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9354)) ([ac6e170](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ac6e170f49fbc49c3914de873c37b2d07d129be4))
* Philips 4034031P7: add color temp range ([#9358](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9358)) ([99b951a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/99b951a2f8c41c2223d53c3f30b7d80469ef5229))
* Zemismart ZMS-206US-4: allow to `name` for `l4` https://github.com/Koenkk/zigbee2mqtt/issues/27305 ([272cf02](https://github.com/Koenkk/zigbee-herdsman-converters/commit/272cf02808f568abd77b8cb8166f78fe475922a6))

## [23.45.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.44.0...v23.45.0) (2025-05-16)


### Features

* **add:** 3RWP01073Z ([#9352](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9352)) ([a3a8f98](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a3a8f98ff5e2e53c20f3bd0ebf3dae82d371bab6))
* **add:** M3TYW-2.0-13 ([#9310](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9310)) ([17fbde4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/17fbde4d7c870857617415552a2f5a264265960d))
* **add:** RD24G01 ([#9355](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9355)) ([dec978b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dec978b42ad01134fae0e2ddfa90dee5af4380e3))
* **add:** ZM79E-DT ([#9343](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9343)) ([dc5245b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dc5245bef93cb7fd5f3b38160bb82667692adfdd))
* Tuya SPM02V2.5: expose `data_report_duration` ([#9348](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9348)) ([fff31a8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fff31a86ec202898c02b402506f39a4f2d5aa421))


### Bug Fixes

* 3RDP01072Z: add private cluster ([#9349](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9349)) ([7adeb14](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7adeb14174d564b4c24f7011501bfc99150e0b53))
* **detect:** Detect `1GANG/DALI/1` as Schneider Electric MEG5116-0300/MEG5171-0000 ([#9353](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9353)) ([7b66631](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7b666319dcfca0f81eb7fdbc9ce8ecc6fb70333b))
* Fix typo in modernExtend and fromZigbee ([#9347](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9347)) ([3fcf488](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3fcf48875fa87cc42e017aed4795b43205f15514))
* Remove `cool` `running_state` from `_TZE200_aoclfnxz` https://github.com/Koenkk/zigbee2mqtt/issues/20959 ([6bc4e51](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6bc4e51540a9d5759224ad476d8963440d06565a))

## [23.44.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.43.0...v23.44.0) (2025-05-14)


### Features

* **add:** 929003808701 ([#9340](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9340)) ([cb94e10](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cb94e10a8eff4b4a8722684adb4b1c7edc062edf))
* **add:** CGG1, MJWSD06MMC ([#9337](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9337)) ([02cb5c9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/02cb5c91f72bd365fa8d9b302a5e904089b69a65))
* **add:** EPIR_Zm ([#9341](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9341)) ([3a5dedd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3a5dedd173657f31fa262040fd94a46d99a8bd4a))
* **add:** SDM01W-U01, SDM01B-U01 ([#9338](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9338)) ([62ffe54](https://github.com/Koenkk/zigbee-herdsman-converters/commit/62ffe544401ac5f0f207fb361b683d5fd3397149))
* **add:** SNZB-02WD ([#9336](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9336)) ([d2e5e06](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d2e5e068508251d4643a6132e9e4d329864e7afe))
* **add:** ZBWD20RD ([#9342](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9342)) ([2de58fe](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2de58fe0740f9fcf27358603b066cb235df9be98))
* **add:** ZG-102ZM, ZG-204ZV, ZG-223Z ([#9332](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9332)) ([2b91263](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2b912633ffc9dc0fd0c907c6fd52d7bb9aca9b94))


### Bug Fixes

* **detect:** Detect `_TZB210_rs0ufzwg` as MiBoxer FUT039Z ([#9344](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9344)) ([3124fff](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3124fff99114837e190b061f556d2da350cdcd99))
* Tuya NAS-PS10B2: fix `work_mode` and `lux_value` ([#9339](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9339)) ([64e167a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/64e167a821e330e2d600de744bbda7a0c8a69acf))

## [23.43.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.42.0...v23.43.0) (2025-05-13)


### Features

* Add `_TZ3000_lzdjjfss` and update Sunricher SR-ZG2858A ([#9328](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9328)) ([8a7685d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8a7685d0febc2b53eb600b3d234755da0d7fc235))
* **add:** NTS2-W-B ([#9334](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9334)) ([7db5c91](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7db5c9137a2cbd4135960420a8cb26499daf0f66))
* Third Reality 3RSPE02065Z, 3RSPU01080Z and 3RSP02064Z: support `ac_frequency` and `power_factor` ([#9333](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9333)) ([6e299c1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6e299c14ebe11999a9e4d33f0eba2f8c8b7093fb))


### Bug Fixes

* GWRJN5169: improve integration ([#9331](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9331)) ([634af89](https://github.com/Koenkk/zigbee-herdsman-converters/commit/634af89450ce45f14ae6df130aca8127a5598da9))
* **ignore:** Correct Nova Digital names from NovaDigital to Nova Digital ([#9329](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9329)) ([e0b0377](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e0b03772188d3ebcdda910f625853cab5b21fc97))
* Improvements for varoius Zigbee TLC devices ([#9330](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9330)) ([a3c4f4b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a3c4f4bec5b76bb043275219fd35f8dda6608877))

## [23.42.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.41.0...v23.42.0) (2025-05-12)


### Features

* **add:** 5715/5717 ([#9319](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9319)) ([e042abf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e042abf2a8c95e5027f2d8e0034aaa78e4bece3c))
* **add:** CSP052 ([#9316](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9316)) ([0df79c2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0df79c2a28101577e8a255f8ea05fd2580ec5d49))
* **add:** EPJ-ZB ([#9317](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9317)) ([e7a6c07](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e7a6c071b5ff37d0a6b2e6b31d3c2be5203418b1))
* **add:** NTZB-04-W-B ([#9326](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9326)) ([b33a7de](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b33a7debb6f972970c009d00a60c8a5a3cedb10b))
* **add:** ZBEK-33 ([#9321](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9321)) ([4a2adc1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4a2adc1f3b722189623bea3b85d7fac3089367c8))
* **add:** ZTS-8W-B ([#9327](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9327)) ([9701276](https://github.com/Koenkk/zigbee-herdsman-converters/commit/970127626ce3ebaeaade45aec06c7e6c3e5c292f))


### Bug Fixes

* **detect:** Detect `_TZ3000_nuenzetq` as Tuya ZG-2002-RF ([#9323](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9323)) ([8127678](https://github.com/Koenkk/zigbee-herdsman-converters/commit/812767882e4d7335fbece3871c7c51e684bf47fb))
* Tuya TS0726_3_gang_scene_switch: add missing action ([#9313](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9313)) ([47b4787](https://github.com/Koenkk/zigbee-herdsman-converters/commit/47b4787665ffbf2568be16707cbe320abd8d31e0))

## [23.41.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.40.1...v23.41.0) (2025-05-10)


### Features

* **add:** ZWSMD-4 ([#9309](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9309)) ([5386fed](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5386fed78e47cffb5f405e16a9a92260b1c8f65c))
* SONOFF S60ZBTPF: support electricity measurements ([#9307](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9307)) ([2263abf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2263abf35afcdfb2cc015a7d3aa313ce1d23e2a7))
* Support OTA for Bosch BMCT-SLZ ([#9305](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9305)) ([40b025c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/40b025cdaa64a9837a24c3a943cc47f53c635e0b))


### Bug Fixes

* **detect:** Detect `_TZ3000_fie1dpkm` as Nedis ZBSC10WT ([#9308](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9308)) ([df6405e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/df6405ee7bf9270af8120c89592e5b3f4ef9cb51))
* **detect:** Detect `_TZE200_4aijvczq` as ME168_Girier ([#9304](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9304)) ([5cf7736](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5cf773672a54805e7ccfb796183adc63646357af))
* Move some AVATTO devices from `tuya.ts` to `avatto.ts` ([#9311](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9311)) ([c9104c1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c9104c1f01c1e56fcb2245c84746febc9d830a0d))
* SlackDiy: address preset and measurement preset for electricity meter ([#9306](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9306)) ([7330c6f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7330c6f2689eaf8c08e53c588287e72eacd6bb2e))
* Tuya TS0203: fix contact incorrectly going to `true` https://github.com/Koenkk/zigbee2mqtt/issues/27269 ([f53ceca](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f53ceca4c5e7405a0e5291fb9436b646ce17ffba))

## [23.40.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.40.0...v23.40.1) (2025-05-08)


### Bug Fixes

* **detect:** Detect `_TZ3000_lmlsduws` as Aubess TMZ02 https://github.com/Koenkk/zigbee2mqtt/issues/27321 ([8ceca2c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8ceca2c6e07399494dcf5502845ca20abd65b17d))
* **detect:** Detect `_TZE200_gkfbdvyx` as Tuya ZY-M100-24GV3 https://github.com/zigbee2mqtt/hassio-zigbee2mqtt/issues/767 ([2c66d2b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2c66d2ba503fba624946e3c5a75b720785d8c7b1))
* **detect:** Detect `_TZE284_dqolcpcp` as Tuya TS0601_switch_12 https://github.com/Koenkk/zigbee2mqtt/discussions/27354 ([da540f0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/da540f0285a6d4fe6ec09e6a77024db3dcf534b1))
* **detect:** Detect `1745430A7` as Philips 1743430P7 ([#9300](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9300)) ([768a116](https://github.com/Koenkk/zigbee-herdsman-converters/commit/768a116a59896e895be8de6cdfa6dbd6f7b811d6))
* Expose Tilt for Schneider/Merten MEG5113-0300/MEG5165-0000 ([#9303](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9303)) ([63a0a10](https://github.com/Koenkk/zigbee-herdsman-converters/commit/63a0a10c63e190e676f74114a909755e4b57bd5e))
* **ignore:** ZG2189S-RGBW and CCT ([#9302](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9302)) ([d7b5fbb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d7b5fbb9427e76e4671ea70df04d24ed345fdda6))

## [23.40.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.39.0...v23.40.0) (2025-05-07)


### Features

* **add:** STLO-34 ([#9296](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9296)) ([9465284](https://github.com/Koenkk/zigbee-herdsman-converters/commit/94652841016d90af50bc30c8fef0b4b1a7a04378))


### Bug Fixes

* Fix various null checks ([#9284](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9284)) ([a7f2316](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a7f23169d662b478d8cdab9e9ae530051b8b98c2))
* HK-SL-DIM-AU-R-A support externalSwitchType ([#9294](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9294)) ([650784a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/650784af9120252abad971d6511618efbe1139db))
* Innr FL 142 C and FL 122 C: support OTA ([#9298](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9298)) ([72e0d84](https://github.com/Koenkk/zigbee-herdsman-converters/commit/72e0d8495ca378d085ad0cb49c73f8a94a815937))
* Superled 70012: disable effect ([#9295](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9295)) ([cff5677](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cff567703e6745f7eba100e6faf8c3acbf5f592d))
* Update Sunricher 4 channel remotes ([#9293](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9293)) ([080c12d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/080c12d060183c2a50dc850506e354f3bbb2ab78))

## [23.39.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.38.0...v23.39.0) (2025-05-06)


### Features

* **add:** SR-ZG9001K8-DIM ([#9287](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9287)) ([bd94efc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bd94efca3bdd2a2d07489a2a14bdcda82cbbdb9c))


### Bug Fixes

* **detect:** Detect `929003807801` as Philips 046677584719 https://github.com/Koenkk/zigbee2mqtt/issues/27338 ([f47eabc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f47eabc96f68c1f93c6f62a15472801a270de1e9))
* EFEKTA_AQ_Smart_Monitor: fix integration ([#9291](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9291)) ([02bcd62](https://github.com/Koenkk/zigbee-herdsman-converters/commit/02bcd62a83c54b7e77bc4f8100f7953c3780c183))
* Fix Inovelli UI LED1-7 to API 0-6 for individualLedEffect ([#9288](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9288)) ([0f49898](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0f49898394f29c20cf0d3a3d7aac6bf9255070fb))
* Fix some duplicate model identifiers ([#9285](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9285)) ([c822332](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c8223323e861f41c0e861740eeed5c3ac2fc5d3c))
* Tuya TLC2206: fix power source ([#9282](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9282)) ([0f64f34](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0f64f34eb4b137cec1f65c07ec0cc6c33a127e10))

## [23.38.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.37.0...v23.38.0) (2025-05-05)


### Features

* **add:** ZMS-206US-4 ([#9279](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9279)) ([5649dda](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5649dda8e8ef7d2dd98a371051171b4cd0957b16))
* Shelly S4SW-*: enable energy measurements ([#9278](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9278)) ([6e03ba8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6e03ba8f5d263e3fa301559e03bc2ad9b5051056))


### Bug Fixes

* Update Philips Tento lights ([#9275](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9275)) ([030b10e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/030b10e4fb5ae2d8f4a8dc35e5c67c66f4a2ae3d))

## [23.37.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.36.0...v23.37.0) (2025-05-03)


### Features

* **add:** TS0601_water_switch ([#8898](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8898)) ([a61f8d3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a61f8d3936f6b89f2830f8e7f35451cb3734c624))
* **add:** ZMS-206EU-2 https://github.com/Koenkk/zigbee2mqtt/issues/27286 ([b347f62](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b347f621df847ca9dbaec3a1d2b06055bc9fb6df))


### Bug Fixes

* **detect:** Detect `_TZ3000_402vrq2i` as Tuya ZG-101Z_D https://github.com/Koenkk/zigbee2mqtt/issues/27239 ([4d1f478](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4d1f47831425bcb526508d429ade1ab541c5de34))
* **detect:** Detect `_TZE204_r731zlxk` as Zemismart TB26-6 ([#9271](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9271)) ([8761a28](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8761a2896147bb9a06f080916f290beb4d344242))
* improve IKEA light unfreeze logic ([#9273](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9273)) ([8920396](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8920396277dc960f46cc67ef4a28089e5e01cd5e))
* Update SNZB-02LD description ([#9274](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9274)) ([f3813a2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f3813a2535f2f2cf69e8926842469a5ef6db0740))

## [23.36.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.35.0...v23.36.0) (2025-05-01)


### Features

* **add:** TH-S04D ([#9260](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9260)) ([ce5d7e7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ce5d7e749612494491e9f57619cd58ec8d4166f1))
* **add:** ZBN-JT-63 ([#9261](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9261)) ([ff3f945](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ff3f9452ff54edddbf4bf5a13d5dc52fcf42cb83))
* **add:** ZHT-002 ([#9265](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9265)) ([d8fd92a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d8fd92a237c48f51da347fa7c4208912eb4d478f))


### Bug Fixes

* GIEX GX03: fix `valve_2` status ([#9266](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9266)) ([5d0d744](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5d0d744c68b36940a4172ec3f9d30e28319675c0))
* Third Reality 3RDP01072Z: fix energy value ([#9250](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9250)) ([41fdd08](https://github.com/Koenkk/zigbee-herdsman-converters/commit/41fdd0819694b1895ae6d3c9a64d9d10b4bfa9bc))

## [23.35.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.34.0...v23.35.0) (2025-04-28)


### Features

* **add:** 70012 ([#9254](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9254)) ([3745371](https://github.com/Koenkk/zigbee-herdsman-converters/commit/374537192824bd418cfd8b348adb047bf32b8723))
* **add:** GWA1501 ([#9259](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9259)) ([e890dc8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e890dc8051ca7609fb9e4acb1319dae905612616))
* **add:** Open_PM_Monitor ([#9256](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9256)) ([9452676](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9452676b88d134d2384cd9f3608c88405ac54162))
* **add:** TLC2206 ([#9249](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9249)) ([4cf56d6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4cf56d6c88d65caa2c30bbaf40fd96f649c36656))


### Bug Fixes

* **ignore:** Remove and enforce `noUnusedImports` ([#9253](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9253)) ([b906518](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b906518a0db0fc1e992bb14422e17ef63c4e8493))
* SONOFF ZBM5-1C-120: fix state postfixed with endpoint name https://github.com/Koenkk/zigbee2mqtt/issues/27217 ([809dab8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/809dab88aa66acc73e16dfd4cb7009d3b0cac78d))

## [23.34.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.33.0...v23.34.0) (2025-04-26)


### Features

* **add:** 81998, 81949 ([#9243](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9243)) ([7625579](https://github.com/Koenkk/zigbee-herdsman-converters/commit/76255797f3257e53ac4af6d88d19a1a56fca6569))
* **add:** 8719514434592 ([#9241](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9241)) ([85f5ff8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/85f5ff83f5efc9ae9107da160b4d2accac3d49bc))
* **add:** POK017 ([#9245](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9245)) ([7f56a0d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7f56a0d76adc2988a74e49fd838c41c8df5ea657))
* **add:** RCL 231 T ([#9239](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9239)) ([1ce06e5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1ce06e5fa93d7d58ad907cf58efdcec27f97d530))
* **add:** ZMS1-TYZ ([#9235](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9235)) ([70e9c15](https://github.com/Koenkk/zigbee-herdsman-converters/commit/70e9c1500282293479ee617eb929665972bd2233))


### Bug Fixes

* **detect:** Detect `_TZE284_f5efvtbv` as AVATTO WSMD-4 https://github.com/Koenkk/zigbee2mqtt/discussions/26003 ([844e90e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/844e90ece12a5d94e22eb88327e86b00aa6ed8bb))
* Fix modern extends numeric/binary not configuring attributes ([#9242](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9242)) ([5dbeb01](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5dbeb018fdf5744bc91ffad2393cd9a290737dcf))
* **ignore:** better exposes typing ([#9244](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9244)) ([6e8b715](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6e8b7153904e3d4841c0643a39096882b25abe14))
* Sonoff ZBM5-1C-120: fix state ([#9248](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9248)) ([e731b22](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e731b221ad6e26485113347ef137bc1647e9412c))
* Third Reality 3RDTS01056Z power source ([#9246](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9246)) ([4df7803](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4df7803cff4937f4856892f14699748baf0cf737))

## [23.33.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.32.0...v23.33.0) (2025-04-23)


### Features

* **add:** 3RSB02015Z ([#9226](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9226)) ([bf1562d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bf1562d111346ef9fac058dd98b3033546a015cd))
* **add:** CMA30651, CSP041 ([#9234](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9234)) ([3711424](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3711424da218a079af84fa943036ea3e8280f554))
* **add:** Mercury_Counter, Mercury_3ph_Counter, Water_Station, Presence_Sensor_v2, Bacchus Water level meter ([#9228](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9228)) ([de45aa8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/de45aa8442c19c256c839f913afaa09ddb2b214a))
* **add:** ZGA1-EN ([#9231](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9231)) ([1bb62eb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1bb62ebfd8e77381cecfa267ab844f5c38c3b865))
* Immax 07505L: add more features ([#9224](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9224)) ([d2eff8e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d2eff8e0337865f8e279290d59326f4bc454a431))


### Bug Fixes

* Add endpoint suffix to level_config converter result ([#9225](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9225)) ([689fee0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/689fee012fc4e0d3b4becf1baed0b77e14745522))
* **detect:** Detect `ZMS-206US-3` as Zemismart ZMS-206US-3 ([#9232](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9232)) ([1f05dc0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1f05dc09581a496c0dabce7563d6435bc32f560f))
* EFEKTA_iAQ_S_III: fix illuminance ([#9233](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9233)) ([40c0866](https://github.com/Koenkk/zigbee-herdsman-converters/commit/40c0866fdf86467cb98d6dc4dec1e97bafd9d7ab))

## [23.32.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.31.0...v23.32.0) (2025-04-21)


### Features

* **add:** 1241970 ([#9219](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9219)) ([5014f3a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5014f3af354e8ad30dce99cdeb9cc0fc3f08a9f7))
* **add:** 501.41 ([#9216](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9216)) ([32ae2f3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/32ae2f34f503eacc16cf249fa8755f53f4a34554))


### Bug Fixes

* **detect:** Detect `_TZE204_iyki9kjp` as Zemismart ZMS-206EU-3 https://github.com/Koenkk/zigbee2mqtt/issues/27133 ([8673dbc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8673dbc152d60ce850616bf1db8b659e1870f7cc))
* **detect:** Detect `_TZE284_hdyjyqjm` as Tuya ZTH08 ([#9210](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9210)) ([d692fb8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d692fb8c2234e12d94c2e45c9e7c4b08107813a1))
* Tuya ZG-101Z/D: expose `operation_mode` ([#9217](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9217)) ([5deccda](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5deccda7fb5e1fedccf95408d8069d58d8a75eee))

## [23.31.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.30.0...v23.31.0) (2025-04-19)


### Features

* **add:** 90.500.090 ([#9206](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9206)) ([0ff8923](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0ff89237b9582a72e7b6fc5fe4f03995815e8b38))
* **add:** SLACKY_DIY_CO2_SENSOR_R02 ([#9205](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9205)) ([e8af2b0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e8af2b086c346726cd6bd2d80433241982be4036))
* **add:** XZ-AKT101 [@wangling75](https://github.com/wangling75) https://github.com/Koenkk/zigbee-herdsman-converters/pull/9204 ([9a63216](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9a632160f921269e5242616e1605634e15b1a6bb))


### Bug Fixes

* Add endpoint name postfix to color cluster state. ([#9203](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9203)) ([9e0d977](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9e0d977bfedd6583323dfff3a41a131c91989587))
* **detect:** Detect CK-BL702-AL-01(7009_Z102LG04-1) as Tuya CK-BL702-AL-01 ([#9207](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9207)) ([38889eb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/38889ebfaf29263e04c7f1899d3d3acb49774cb3))
* Tuya _TZ3000_xkap8wtb: fix configure failing ([#9202](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9202)) ([b75ac67](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b75ac679de764afcad2c0eb1c2889969e57dd6a4))

## [23.30.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.29.0...v23.30.0) (2025-04-18)


### Features

* **add:** 3RSPE02065Z, 3RSPU01080Z ([#9192](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9192)) ([c9281ca](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c9281ca7c1c7df60fcadca496c3f5b7a0758dac1))
* **add:** 5480 ([#9190](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9190)) ([141de11](https://github.com/Koenkk/zigbee-herdsman-converters/commit/141de115c2d379a9dc948556316baeb77e266b06))
* **add:** FAM-300Z ([#9201](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9201)) ([9936e80](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9936e8022660c52ebe2d48242e15857b519ae2b2))
* **add:** LED2110R3 ([#9199](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9199)) ([eded590](https://github.com/Koenkk/zigbee-herdsman-converters/commit/eded59090ab9560c133999d25175762d282e7ba0))
* **add:** LZWSM16-1 ([#9194](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9194)) ([4ba993e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4ba993e416fbfd71e6d48d640ae2762c88e067b2))


### Bug Fixes

* AVATTO LZWSM16-2 & LZWSM16-3: fix power source ([#9198](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9198)) ([b008a5a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b008a5a0dd077a609fe1b25adf013a29233fd9a3))
* Fix color temp not reported correctly for multi endpoint lights ([#9196](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9196)) ([e2a08b4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e2a08b4eb1aaa23a2444a57b14ed37f793ac03ff))
* Iluminize 5110.40: enable reporting ([#9200](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9200)) ([83721f0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/83721f0b220ced17ee446c674fad0598a873edb3))

## [23.29.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.28.0...v23.29.0) (2025-04-16)


### Features

* **add:** _TZE200_b0ihkhxh, _TZE200_htj3hcpl, _TZE200_pcg0rykt, _TZE200_7a5ob7xq, _TZE200_xo3vpoah ([#9176](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9176)) ([6769400](https://github.com/Koenkk/zigbee-herdsman-converters/commit/67694003565fbb1b66a153d54b391a71c449b520))
* **add:** 915005988602 https://github.com/Koenkk/zigbee2mqtt/issues/27073 ([cd3e734](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cd3e734b9d4e02fff852a73a0f4c0e61de3dd982))
* **add:** ZVL-DUAL ([#9188](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9188)) ([49fbe7d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/49fbe7d1fbc50717724cb94e36354d3a773e2add))


### Bug Fixes

* **detect:** Detect `_TZ3210_bfwvfyx1` as CK-BL702-AL-01_1  https://github.com/Koenkk/zigbee2mqtt/issues/25904 ([7d7063d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7d7063d5d2f0566d871cabb887cdda94eab8c37e))
* **detect:** Detect `_TZE284_1youk3hj` as NEO NAS-PS10B2 https://github.com/Koenkk/zigbee2mqtt/discussions/27132 ([87e7260](https://github.com/Koenkk/zigbee-herdsman-converters/commit/87e72604a5c4a6e8fe74da7fb3795522e2e9c155))
* Fix some `_TZ3000_abrsvsou` incorrectly detected as ZG-101Z/D https://github.com/Koenkk/zigbee2mqtt/issues/25053 ([e3a7a58](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e3a7a58220f3caeb06e3263b3e90f19cd2da217f))

## [23.28.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.27.0...v23.28.0) (2025-04-15)


### Features

* **add:** 4058075364547 ([#9185](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9185)) ([5a41a6f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5a41a6fb19706b2134d7fb13262fa124bb06dbcb))
* **add:** HY-SZLUMPIR ([#9173](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9173)) ([71164b7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/71164b720b522557bd1c93eb82880d842c56eae0))
* **add:** SBDV-00202, SBDV-00199, SBDV-00196 ([#9182](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9182)) ([9a8de45](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9a8de451e568e8eaf36a19c58722612e8f889ad4))


### Bug Fixes

* Bosch BTH-RA: fix `pi_heating_demand` not settable via HA https://github.com/Koenkk/zigbee2mqtt/issues/25971 ([e530087](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e530087218aa98fffc088ec988953e235d465ff3))
* **detect:** Detect `_TZE284_ac0fhfiq` as Tuya TS0601_bidirectional_energy https://github.com/Koenkk/zigbee2mqtt/issues/27126 ([0196f4b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0196f4bc713b17b4dedc87a13364f75ffa1eba71))
* Lincukoo SZLR08 and SZLM04U improvements ([#9175](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9175)) ([462dcad](https://github.com/Koenkk/zigbee-herdsman-converters/commit/462dcad0e779eadce72f72242abc222beddc50bb))
* Vimar 14595.0: fix endpoint ([#9183](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9183)) ([f85b241](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f85b241be16ea00a94381913c535bf58a9f006f6))

## [23.27.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.26.0...v23.27.0) (2025-04-14)


### Features

* **add:** HS15A-M ([#9140](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9140)) ([bc94e15](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bc94e15df0adfa211f8474bfd808b894297192df))
* **add:** SNZB-02LD ([#9177](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9177)) ([097ee4c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/097ee4c34f52650d874ff7ebb20a2b47d68d0ced))
* Gledopto GL-D-015P: support power on behaviour ([#9174](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9174)) ([88c0070](https://github.com/Koenkk/zigbee-herdsman-converters/commit/88c0070a5ca53ffbcb5a6e8a65e0d4c1379ba024))
* Workaround IKEA bulbs freezing during a brightness & color transition ([#8637](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8637)) ([861282e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/861282e7f6c5d2276fb18cad9278d8c5396248d2))


### Bug Fixes

* **detect:** Detect `_TZE200_2imwyigp` as Tuya MG-ZG03W https://github.com/Koenkk/zigbee2mqtt/issues/27103 ([6ad4a9e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6ad4a9e87c0fbd31508457116196e62802270016))
* Fix typos ([#9178](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9178)) ([78f65a1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/78f65a198476978235afbf0d6b1a0e12c9b8386c))
* **ignore:** Update sonoff.ts ([#9180](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9180)) ([ccf74d8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ccf74d835df80e4c3b5d3c2fdfb826a41d434fa0))

## [23.26.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.25.0...v23.26.0) (2025-04-13)


### Features

* **add:** 404122/404123 ([#9172](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9172)) ([9bb704d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9bb704d01d3b204738493c0bba328bee059ee1a3))
* **add:** 929003808501 ([#9163](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9163)) ([0549838](https://github.com/Koenkk/zigbee-herdsman-converters/commit/05498380f1bcf3cc4463133d60859920f642c8bd))
* **add:** SZW08, SZLR08, SZLM04U ([#9167](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9167)) ([53ef9cb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/53ef9cb0b38afa71d4acf46d7c85c806f1ece382))
* **add:** TS0726_4_gang_scene_switch, TS0726_3_gang_scene_switch, TS0726_2_gang_scene_switch, TS0003_3_gang_switch ([#9158](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9158)) ([7a5cd1c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7a5cd1c1f6b10ec3d6da3d3e1da15bd8028e7364))


### Bug Fixes

* Allow scheduling OTA on device request ([#9048](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9048)) ([7286e85](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7286e8572c4cba1546273011eeb4962c272553f4))
* **detect:** Detect `_TZ3000_s678wazd` as Tuya TS0726_4_gang https://github.com/Koenkk/zigbee-herdsman-converters/issues/9138 ([55a5202](https://github.com/Koenkk/zigbee-herdsman-converters/commit/55a52021cde6c6d118eae7d9753f2f7795ec753a))
* do not throw when exposes function throws ([#9169](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9169)) ([625a913](https://github.com/Koenkk/zigbee-herdsman-converters/commit/625a9130552c4213f2ecd4ee6c1d5ee3845299bf))
* **ignore:** update dependencies ([#9170](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9170)) ([8c8cae8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8c8cae87ca900c4c00e00a237bb66146dce334e5))

## [23.25.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.24.0...v23.25.0) (2025-04-10)


### Features

* **add:** EFEKTA_eFlora_Max_Pro ([#9155](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9155)) ([bfc30ed](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bfc30edf0c7ac6bf042b1a537f8fec4570de1edf))


### Bug Fixes

* **detect:** Detect `929003617901` as Philips 929003115701 and `929003618201` as Philips 929003116101 ([#9154](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9154)) ([8d7f62a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8d7f62a1d673a22a82c1b244bc7ecdbb57be8758))
* Rename `TS0601_smart_CO_air_box` to `DCR-CO` https://github.com/Koenkk/zigbee2mqtt.io/pull/3681 ([e1060be](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e1060be944f1f381e81cfb415afc686c2bfdc8d2))
* Tuya TS0601_smart_CO_air_box: fix `carbon_monodixe` expose ([#9159](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9159)) ([333f3e0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/333f3e0198cd2535e6bbfee0f5ac7ac080b48e13))
* Zen-01-W: expose battery voltage ([#9156](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9156)) ([1ab25a5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1ab25a53910f4b8e8ac3f62295ad10ceb663e654))

## [23.24.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.23.0...v23.24.0) (2025-04-09)


### Features

* **add:** C-ZB-SEWA, C-ZB-SETE, C-ZB-SEDC, C-ZB-SEMO ([#9060](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9060)) ([2127ccb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2127ccb89b4d91df4c92a09ca2e7d7e184bf7f5c))
* **add:** IRB-4-1-00, SEM-4-1-00 ([#9145](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9145)) ([5e090bb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5e090bb930525b7fc0824ceec0ac5587b19a9ded))
* **add:** Presence_Sensor_v2.6 ([#9146](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9146)) ([453e0e2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/453e0e2155e2d5a95d84c977ecb4ae74571d45fe))
* Aqara Z1 Pro Led toggle ([#9152](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9152)) ([b1ea96f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b1ea96f097c53e78b363433e0b96e992afe7914d))
* Update PMM-300Z2 and PMM-300Z3 ([#9144](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9144)) ([f9aef45](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f9aef455c972d8bd884cecd8da0046d922162576))


### Bug Fixes

* Added update frequency adjustment for some Bituo Tuya devices ([#9143](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9143)) ([c97d4c7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c97d4c7309dc415c1a8ce54c9575ac6332c34251))
* Aqara WS-K02E: fix endpoints ([#9150](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9150)) ([b0b201a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b0b201a9a4e5b413aa227e41a3be4a95d61f08a4))
* **detect:** Detect `_TZB210_eiwanbeb` as MiBoxer E2-ZR ([#9153](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9153)) ([96cb4a0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/96cb4a0c12f5383150b3c69cd9125b15212302c8))
* **detect:** Detect `_TZE200_wbhaespm` as SUTON STB3L-125-ZJ https://github.com/zigbee2mqtt/hassio-zigbee2mqtt/issues/753 ([d6cc664](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d6cc6643dd636b46e2bc2916a8cf1549f125d819))
* **detect:** Detect `929003785001_01` and `929003785001_02` as Philips 4090330P9 ([#9149](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9149)) ([0d6175b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0d6175b64cf4e85969e2af32e0fb1ef0cea620b8))
* Fix error in Zosung converter https://github.com/Koenkk/zigbee2mqtt/issues/27046 ([ceb76d2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ceb76d2cd98d1b4c4d0e35a791cbb642a532879d))
* Third Reality 3RWK0148Z: fix `wateringTimes` type ([#9142](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9142)) ([a185394](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a1853946870fc7c14df19b9b2168d843919fbb51))
* TS stricter ([#9147](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9147)) ([eeae452](https://github.com/Koenkk/zigbee-herdsman-converters/commit/eeae452a46a898e8d22d873844896b25a3ef95ba))

## [23.23.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.22.0...v23.23.0) (2025-04-07)


### Features

* **add:** 07527L ([#9136](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9136)) ([2642539](https://github.com/Koenkk/zigbee-herdsman-converters/commit/26425398822805e3386163d5dd2eb5114acd6dc7))
* **add:** HS09 ([#9137](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9137)) ([7e94c08](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7e94c0835f1371d3692a34b9d289ee5ad3d6a049))
* **add:** WS-K02E ([#9139](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9139)) ([3529740](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3529740657aea2241fe647062327a0be616cb519))


### Bug Fixes

* **detect:** Detect `_TZ3002_m3pafcnk` as Tuya TS0726_multi_3_gang https://github.com/Koenkk/zigbee-herdsman-converters/issues/9138 ([faecab0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/faecab07bf7c0a8c8055dee129730b4b118b8317))

## [23.22.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.21.0...v23.22.0) (2025-04-06)


### Features

* **add:** Flower_Sensor_v2 ([#9121](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9121)) ([f41d471](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f41d4711b644b6edb297a2cd31022b97b4d5a066))
* **add:** FLS-M [@blastwavehosting](https://github.com/blastwavehosting) https://github.com/Koenkk/zigbee2mqtt/issues/26982 ([7d6672b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7d6672b82a539ab5e40db339383444ee862c06b4))
* **add:** PN16 ([#9134](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9134)) ([c3b915f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c3b915f2a917e8fea79bb8a05171d048548b03bc))
* Tuya TS0001_power: support OTA ([#9133](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9133)) ([c33147c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c33147c7015f1fc561e93cdd350db3467a1ece90))
* Zen Zen-01-W: support fan mode and state ([#9125](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9125)) ([10595c5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/10595c50ac8b7a44d05a28074a4a99d6889814fe))


### Bug Fixes

* Bosch BSIR-EZ: fix tamper https://github.com/Koenkk/zigbee-herdsman-converters/issues/8741 ([190f427](https://github.com/Koenkk/zigbee-herdsman-converters/commit/190f4273e5e8ca0bdc8f42e4888663a492c939e1))
* **detect:** Detect `_TZB210_6eed09b9` as MiBoxer FUT103ZR ([#9124](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9124)) ([ae59ecd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ae59ecdff871754050889ff9dfedeed6f81b8423))
* **detect:** Detect `_TZE200_uiyqstza` as Lidl 368308_2010 ([#9127](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9127)) ([d0193cf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d0193cf186e8091ec8365fb604d0434cb0f24926))
* **ignore:** update dependencies ([#9128](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9128)) ([f055b02](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f055b029c31c43f9826c752ca64136cb359a47c5))
* Semver validation before comparison ([#9130](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9130)) ([138099a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/138099a1660d1a704af9e20bc70db82326cccac1))

## [23.21.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.20.1...v23.21.0) (2025-04-05)


### Features

* **add:** YY-LT500 ([#9117](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9117)) ([c8e89a7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c8e89a754a6ab23f4b7077a0b6e48402c7bc92b1))


### Bug Fixes

* Add battery voltage to pvvx/ZigbeeTLc devices ([#9120](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9120)) ([c09f072](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c09f072f7037fce29c8184a3e38395118f12cf08))
* **detect:** Detect `_TZ3000_qaa59zqd` as Moes ZM-104B-M https://github.com/Koenkk/zigbee2mqtt.io/pull/3658 ([7a828de](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7a828dea3d970dfd0d3f751fb4953130f722ff91))
* **detect:** Detect `_TZE284_eekpf0ft` as Tuya TR-M3Z https://github.com/Koenkk/zigbee2mqtt/discussions/26997 ([1b9d7fb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1b9d7fb99b4d5bedd607d7cbf8f9377fd1999048))
* **ignore:** naming style in easyiot converter ([#9118](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9118)) ([a2c60c2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a2c60c2ecba11eab60a50240f0e07944de099790))
* Tuya ZY-M100-S_2: fix illuminance not updating https://github.com/Koenkk/zigbee2mqtt/issues/26993 ([1ba52d8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1ba52d838290fbf6381900ac2f261c712bd790be))

## [23.20.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.20.0...v23.20.1) (2025-04-04)


### Bug Fixes

* Fixed pairing of Livolo TI0001 switches ([#9116](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9116)) ([da402f5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/da402f5dbd0b9079977ab95199e0e49986372b91))

## [23.20.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.19.1...v23.20.0) (2025-04-03)


### Features

* **add:** ZG-101Z/D https://github.com/Koenkk/zigbee2mqtt/issues/25053 ([aaa251d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aaa251d4df3a8cac5190d9b0166413dfd7cae421))


### Bug Fixes

* **detect:** Detect `_TZ3000_bmhwnl7s` as Lonsonho TS130F_dual ([#9113](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9113)) ([c44809e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c44809ea6c923020579f128713fa475f954040e7))
* Tuya ZY-M100-S_2: fix presence and illuminance https://github.com/Koenkk/zigbee-herdsman-converters/pull/9115 [@jernau](https://github.com/jernau)H ([e0d8975](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e0d8975a98f49860b8e8dee85cae171632fbdf51))

## [23.19.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.19.0...v23.19.1) (2025-04-02)


### Bug Fixes

* Configure reporting for various Sunricher devices ([#9110](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9110)) ([4b11bdc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4b11bdcb75feb345c99857fcf59d9cc6235c82b2))
* **detect:** Detect `_TZE284_chbyv06x` as DYGSM DY-RQ500A https://github.com/Koenkk/zigbee2mqtt/issues/26940 ([3cf11ea](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3cf11ea2cbd9e976e7ec70257b885fd5ac351af7))
* Fix LiXee devices causing `mqtt disconnected due to malformed` https://github.com/Koenkk/zigbee2mqtt/issues/26939 ([a04fe79](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a04fe79ec1c074da30b8b07257901cbb3b0ce094))
* LiXee: fix `kwhPrecision is not defined` error https://github.com/Koenkk/zigbee-herdsman-converters/issues/9109 ([8a979de](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8a979de634ba4b3e04a04ca8fda06ac6b30dfb09))
* Tuya TS0002_limited: support countdown ([#9111](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9111)) ([0424844](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0424844760aa7207ce33d448d608719d14054464))

## [23.19.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.18.0...v23.19.0) (2025-04-01)


### Features

* **add:** S4SW-001P8EU, S4SW-001P16EU ([#9107](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9107)) ([e806be7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e806be7fea6cb8dc8656a94a95c78f05e2a2ff17))


### Bug Fixes

* Fix GL-C-007-2ID not being detected correctly ([#9103](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9103)) ([458adf7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/458adf705043b238cf95f6aab72ac66813107792))

## [23.18.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.17.0...v23.18.0) (2025-04-01)


### Features

* **add:** RS 241 T https://github.com/Koenkk/zigbee2mqtt/issues/26926 ([b22c9b8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b22c9b8c34c8f1f3afb4da9fa88e8cc5351c249c))
* **add:** S4SW-001X16EU ([#9097](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9097)) ([74bec68](https://github.com/Koenkk/zigbee-herdsman-converters/commit/74bec6846e906f3b68c4d56b31b59ef43bcf57d8))


### Bug Fixes

* **ignore:** update dependencies ([#9106](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9106)) ([d3a953d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d3a953dcba5028271bace4df25e9cc4a721dc612))
* PTM216Z: fix action value ([#9102](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9102)) ([8a796ed](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8a796edfe1ba28aa45243d3d194c65076e6de5c1))

## [23.17.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.16.0...v23.17.0) (2025-03-31)


### Features

* Tuya TS110E_1gang_2: expose countdown https://github.com/Koenkk/zigbee2mqtt/issues/26791 ([c37e999](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c37e999e75254ca44e64dd35ee8cfaabd2a776be))


### Bug Fixes

* Paulmann 501.34: fix action values [#9075](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9075) ([#9099](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9099)) ([8eb7016](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8eb7016652da620ddafd1ffcf646c6a2d0cd2b6d))
* Philips Hue Wall Switch 929003017102: re-add brightness actions ([#9098](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9098)) ([b41b7c6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b41b7c62e9d7e430d61c20718d9a018ec63db334))

## [23.16.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.15.0...v23.16.0) (2025-03-30)


### Features

* **add:** 929003056801 ([#9094](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9094)) ([d595176](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d595176ef74771625bc7a9098414a30a35346dc4))
* **add:** EFEKTA_Pixel_Open_Air_II ([#9096](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9096)) ([4ef31b0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4ef31b0e139a269ec38b3b2412e4fb3949bc2ec4))
* **add:** SR-ZG9101CS ([#9080](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9080)) ([8894142](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8894142a83bedafe65eebac1fb4498922ccaa869))


### Bug Fixes

* **detect:** Detect `_TZE200_clrdrnya` as Tuya MTG235-ZB-RL https://github.com/Koenkk/zigbee2mqtt/discussions/25712 ([3976c8d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3976c8db0c3ce5e76b11d8f8e628a61156957a06))
* **ignore:** update dependencies ([#9093](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9093)) ([2e048d0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2e048d0d4207a7b5c2854292e8a23247d34b08b3))
* Schneider S520567: expose tilt ([#9095](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9095)) ([23074f1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/23074f17702c7154187ac351a9af84405efe2e89))
* Tuya TYZGTH1CH-D1RF: auto settings ([#9091](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9091)) ([3cd11cc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3cd11cce570a92db10ed34533df27905230661a6))

## [23.15.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.14.0...v23.15.0) (2025-03-28)


### Features

* **add:** 929003777301 ([#9084](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9084)) ([eb466ac](https://github.com/Koenkk/zigbee-herdsman-converters/commit/eb466acd15143293eb71d500f3f60848ffa4fb86))
* **add:** Egony_Flower ([#9085](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9085)) ([2a46236](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2a46236afffd849cea3ee3362470a41e9b3efc26))
* **add:** PZ2 ([#9083](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9083)) ([331654e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/331654e11b605127989047acdae5216f80a66c3c))
* **add:** ZSS-S01-TH https://github.com/Koenkk/zigbee2mqtt/issues/25849 ([0a49588](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0a49588fe5c514fbfa80633ed8b626d0fe8da401))
* **add:** ZTH08 ([#9090](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9090)) ([2b146b9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2b146b9069f72ddbf43c5842e11fc4e73128c37d))


### Bug Fixes

* **detect:** Detect `_TZ3000_m4ah6bcz` as Tuya TS0726_multi_1_gang ([#9089](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9089)) ([2a7ca11](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2a7ca1131af42ce2442ca3345e39670ded2224ce))
* Tuya TS011F_with_threshold: enable onOffCountdown ([#9086](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9086)) ([63e418d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/63e418d0ddcd24b520dcf169699f3a76050af8e2))

## [23.14.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.13.0...v23.14.0) (2025-03-27)


### Features

* **add:** 1402790 ([#9079](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9079)) ([28b0ed4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/28b0ed4915d7c0f0a0aac63b11017ed14d0a2cbb))
* **add:** feat(add): SLACKY_DIY_CO2_SENSOR_R01, Watermeter_TLSR8258, Smoke Sensor TLSR8258, Electricity Meter TLSR8258, THERM_SLACKY_DIY_R01, THERM_SLACKY_DIY_R02, THERM_SLACKY_DIY_R03, THERM_SLACKY_DIY_R04, THERM_SLACKY_DIY_R05, THERM_SLACKY_DIY_R06, THERM_SLACKY_DIY_R07, THERM_SLACKY_DIY_R08 ([#8949](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8949)) ([9206ecc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9206eccf1644dd385afdf8bbd0070c9bf01cccf6))
* **add:** Push_LE, Push_LO ([#9073](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9073)) ([4e23f72](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4e23f72096d3064853486120b8a33d22b426b3c2))
* **add:** Push_LE, Push_LO ([#9082](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9082)) ([a43635a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a43635ad52494a84da28e4d5888f21a756eebc6b))
* **add:** SPM02-U00, SDM02-U00, SPM01-U00, SPM02-U02, SDM02-U02 ([#9069](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9069)) ([9f1e179](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9f1e179142501fb7647b2664f984edc38c67656b))
* **add:** TS0726_multi_1_gang, TS0726_multi_4_gang ([#9077](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9077)) ([3ec928e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3ec928eb1f2fbf06dcd85522dcc4a3074ace5695))
* **add:** TS0726_multi_3_gang ([#9066](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9066)) ([2a66be2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2a66be223df055f3b04e9a912f573508a9519c90))


### Bug Fixes

* Fix the issue of incorrectly identifying powerFactor Phase B/Phase C ([#9074](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9074)) ([f529236](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f5292368d1bc54fd011914633b1fe849dc05f10e))
* NEO NAS-PS10B2: fix `lux_value` ([#9064](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9064)) ([5182726](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5182726dcbb2053fb390ccdd947b404f2cf18833))
* Sonoff TRVZB: fix rounding of externalTemperatureInput ([#9072](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9072)) ([e7f477e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e7f477ebb76f5020fc2a70cfca5a27735b1a0d8f))

## [23.13.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.12.0...v23.13.0) (2025-03-25)


### Features

* **add:** S4SW-001X8EU https://github.com/Koenkk/zigbee-herdsman-converters/issues/9057 ([5a60855](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5a60855bd45a16d54d0bebd2bc744add75e8786a))
* **add:** TS0601_dimmer_1_gang_3 https://github.com/Koenkk/zigbee2mqtt/issues/26526 ([60f5605](https://github.com/Koenkk/zigbee-herdsman-converters/commit/60f5605715fbd75d3aa0ca14d87962f983739885))
* **add:** WS-K04E ([#9054](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9054)) ([8547aa5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8547aa5942ebaf2b518c54d17155755527d01930))
* **add:** ZG-WK-DA-Wh-Zigbee ([#9058](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9058)) ([db9f408](https://github.com/Koenkk/zigbee-herdsman-converters/commit/db9f408abf87d6d6ccd45115ae056458db08c135))
* **add:** ZMS-206EU-3 ([#9056](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9056)) ([ae43c5a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ae43c5a1ffb6324c58495462f4e23680a9cf64f6))


### Bug Fixes

* **detect:** Detect `_TZE204_oh8y8pv8` as Tuya ZWT198/ZWT100-BH ([#9063](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9063)) ([f68a3b6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f68a3b620beeaabe24ad565f82ce9008a4bec562))
* EFEKTA: various fixes ([#9055](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9055)) ([ab9edb4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ab9edb4a4a04b282eb966b12d8201faeb4985a3f))
* Fix soil electrical conductivity unit is µS/cm (microsiemens per centimetre) ([#9061](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9061)) ([2831099](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2831099f376f5d2f3bcb1660bc5973e7d7e278fd))
* Namron 4512788: disable effects and enable configuring reporting ([#9062](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9062)) ([24c0608](https://github.com/Koenkk/zigbee-herdsman-converters/commit/24c06080b7c0e31c1394aa3793a4959a875d3ff4))

## [23.12.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.11.0...v23.12.0) (2025-03-23)


### Features

* **add:** 929003103601 https://github.com/Koenkk/zigbee2mqtt/issues/26750 ([c9a067a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c9a067a9b0cf26dc4d8419020f4a7fad4769223c))


### Bug Fixes

* Battery for Yandex wireless switch ([#9051](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9051)) ([b017e58](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b017e58468a6550af0a260c6ce02037c5469b89b))
* Generate definition when candidates present but no match found ([#9046](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9046)) ([a4c9ae8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a4c9ae856eecf0698bf96c96d507f7c670ec0b8f))
* Gledopto GL-C-009P: configure reporting ([#9047](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9047)) ([2bb3beb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2bb3bebf6ab72c359b9e486611cd8614162dabf0))
* **ignore:** update dependencies ([#9050](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9050)) ([0f46b24](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0f46b24a948cef7c9eeef53cda0765ca0f231131))
* Tuya TS110E_2gang_2: expose light type and power on behaviour for l2 ([#9052](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9052)) ([d7829b3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d7829b39b8c8ce0b4686985a63fcbabe7bc7a16c))

## [23.11.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.10.0...v23.11.0) (2025-03-21)


### Features

* **add:** EFEKTA_eFlora, EFEKTA_eFlora_Pro, EFEKTA_eTH102zex ([#9043](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9043)) ([17822f8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/17822f87130cd7f1a7ee3bd22dbe952e5450afa2))
* **add:** Leleka ([#9001](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9001)) ([5d56367](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5d56367bcffdcf33954e6e915fc1846984ace797))
* **add:** RemoteControl_v1.0 ([#9044](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9044)) ([94ff86d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/94ff86d3faa55830a60f61eb1d9247bb5d5a5537))
* **add:** YNDX_00530 ([#9017](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9017)) ([0c7f856](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0c7f856eb5f311429dd79a777b0436dcd51311fc))


### Bug Fixes

* MAZDA TR-M2Z: improve system mode and presets ([#9040](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9040)) ([52969df](https://github.com/Koenkk/zigbee-herdsman-converters/commit/52969dfb4eec15356d4f58ddf155478981fa3fbf))
* Rename some Tongou devices ([#9041](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9041)) ([68d9d8b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/68d9d8bd731dcd447bed181c0f9d0adbf4de6d98))
* Third Reality 3RSMR01067Z: expose voltage and battery low ([#9042](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9042)) ([7a55249](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7a552494a474f3c4345961e41f6d261bdae7f4be))

## [23.10.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.9.1...v23.10.0) (2025-03-20)


### Features

* **add:** CMR-1 ([#9037](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9037)) ([9f74366](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9f74366479610138fb8d16f8f2bb228cb23b723b))
* **add:** ZDMS16-US-W2 ([#9023](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9023)) ([bd011f3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bd011f3119b00b8d159f521c1d59b9cbffb62f7c))
* **add:** zFlora_S, zFlora_S_Max, zFlora_Pro, zFlora_ProMax ([#9030](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9030)) ([58da882](https://github.com/Koenkk/zigbee-herdsman-converters/commit/58da8826dc36974868c3a5e321e92021b870556e))
* Aqara FP1E: support OTA https://github.com/Koenkk/zigbee-OTA/pull/724 ([c50d201](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c50d201cd3aae277de441e6cb39f35e16561eea8))
* Generate definition for unsupported Green Power devices ([#9020](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9020)) ([9edfa9c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9edfa9c3b0c7da0d1132c5f7bfccd30a1811f63b))
* Innr AE 270 T: expose power on behavior ([#9036](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9036)) ([c9e0df1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c9e0df111212bcb642d47cf64aea92be2b58f07b))
* Onesti easyCodeTouch_v1: expose lastest pincode save time ([#9018](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9018)) ([9fe8693](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9fe869336fb191fb6a4d15b44bdeba4753fe4ee0))


### Bug Fixes

* Add SR-ZG2833PAC to PTM 215Z whiteLabel ([#9032](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9032)) ([96b1ff1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/96b1ff1f450a3b48b23e6c6b88973c37fae83eaa))
* Busch-Jaeger 6735/6736/6737: various improvements and fixes ([#9021](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9021)) ([8fc8350](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8fc835096d9e2acd0ef34261e6c4bec88a320982))
* Candeo C204, C-ZB-DM204, C205 & C-ZB-SM205-2G: various improvements ([#9033](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9033)) ([73ec80c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/73ec80cdd24f0f12e9ba004cc080d177b3dacdb7))
* **detect:** Detect `_TZE284_mrffaamu` as Tuya TOQCB2-80 https://github.com/Koenkk/zigbee2mqtt/issues/26807 ([45be739](https://github.com/Koenkk/zigbee-herdsman-converters/commit/45be73961961b1337d13428666b7143ce781bdd1))
* Generated source for https://github.com/Koenkk/zigbee2mqtt/pull/26522 ([#9003](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9003)) ([0b990c7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0b990c7d6346131b33d7e02defa01a7d12c368a3))
* Gledopto GL-SD-301P: expose power on behavior ([#9039](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9039)) ([0c24fcf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0c24fcf6e84601d467deb37e82a65d9ea3b50bb9))
* Namron 3802966: fix color temperature range ([#9035](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9035)) ([ad42cc2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ad42cc21c9961b986c37bf540538ae6d10277d3c))

## [23.9.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.9.0...v23.9.1) (2025-03-18)


### Bug Fixes

* **ignore:** fix provenance ([f5fbb3f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f5fbb3fff56fa0c84f9319a292ccd97961d454b7))

## [23.9.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.8.0...v23.9.0) (2025-03-18)


### Features

* **add:** 07504L ([#9005](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9005)) ([66072f4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/66072f484fbb7076789c900b23bf392d9295b88f))
* **add:** GWA1502 ([#9009](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9009)) ([c02c960](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c02c960d35b4d48788e0be26fd2c33df6eabb1dd))
* Cando C203: improve support ([#8907](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8907)) ([23d5ee6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/23d5ee680b17eafcaa044916fa7046ed4a8a4268))


### Bug Fixes

* Fixes for PST POW v2 and PST POW DUO v2 ([#9010](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9010)) ([8a206dc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8a206dc5feeb180928a9db609c6513572547fcd0))
* Third Reality 3RSMR01067Z: expose `occupancy` ([#8925](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8925)) ([efee803](https://github.com/Koenkk/zigbee-herdsman-converters/commit/efee8037ae11c14ed06f718d00725e1c8b1ea21a))
* Tuya 2CT: expose `power` ([#9014](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9014)) ([00b6a08](https://github.com/Koenkk/zigbee-herdsman-converters/commit/00b6a08be4b2d0c88f9ef1b34f786a5383edcadf))
* Tuya TS0726_4_gang_switch_and_2_scene: support backlight ([#9013](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9013)) ([38d5a49](https://github.com/Koenkk/zigbee-herdsman-converters/commit/38d5a4921b6509409bac2c95bed26312dba181f8))

## [23.8.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.7.0...v23.8.0) (2025-03-16)


### Features

* **add:** 371222402 ([#8997](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8997)) ([7913ff9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7913ff991dd0d6d0563422a635324edd790d68b7))
* **add:** EFEKTA_iAQ_S_II ([#9004](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9004)) ([c74a46b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c74a46b3ac088c2e2267a93106577f60e98b6f78))
* **add:** EFEKTA_iAQ_S_III ([#8993](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8993)) ([0bd1559](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0bd15593ff5cc0e59aec2c9a06ee52dccffee294))
* **add:** POFLW-WH02 ([#9006](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9006)) ([3a81898](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3a818983ee2061502e590294896ab73bc1c13083))
* **add:** TS0726_4_gang_switch_and_2_scene ([#8996](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8996)) ([1fa2d3e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1fa2d3e57bd8dd86c11c560048c1cbc78f3a8b7c))
* Tuya TRV602Z: support more features ([#8992](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8992)) ([1d340ff](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1d340ff35689475e6c3c0dac1f724ae0c3d5169e))


### Bug Fixes

* **detect:** Detect `_TZE204_l8xiyymq` as ZSVIOT PN6 ([#8995](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8995)) ([0f92235](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0f92235d23ea48cbc8e17ff8dc538fcf47f31ec7))
* **detect:** Detect `\u0000B` as Tuya TS0601_pir https://github.com/Koenkk/zigbee2mqtt/issues/26727 ([c2fc309](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c2fc30931f07b0f2f24e670f714159446d2fc00e))
* Home Assistant: e power, current and voltage as normal sensor data ([#8999](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8999)) ([3a9dc91](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3a9dc9140e33aadb7f4a025fe5dec32f352401bf))
* **ignore:** update dependencies ([#9007](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9007)) ([d26aa5e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d26aa5ed22a81a2cea20ffaf228fe26b07475457))
* Moes UFO-R11: fix `Exception while calling fromZigbee converter` https://github.com/Koenkk/zigbee2mqtt/issues/26659 ([db168d4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/db168d47c2b5f8cde2d6be7d16f7ad15f0aad172))
* Tuya TS0601_thermostat_3: expose `pi_heating_demand` ([#9002](https://github.com/Koenkk/zigbee-herdsman-converters/issues/9002)) ([dffd62f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dffd62fc9daac4c4102098421ac767ce24096598))

## [23.7.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.6.0...v23.7.0) (2025-03-13)


### Features

* **add:** 98425271 ([#8989](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8989)) ([8355b2b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8355b2bec64c6397d43426248b0e044393c6722c))
* **add:** EFEKTA_TH_v1_LR, EFEKTA_TH_v1, EFEKTA_TH_v2_LR ([#8988](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8988)) ([fb5e646](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fb5e646c929037aca4fef678cb39230c9a705ad7))
* **add:** HLL6948V1 ([#8966](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8966)) ([036b85b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/036b85bcd00dd975b48711471ec79d3d1bf61782))
* **add:** SQM300ZC4 ([#8978](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8978)) ([6476905](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6476905b92508534b39203ffe4f50e79f760533a))
* Niko 552-72201: add led enable & led state ([#8975](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8975)) ([0f37143](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0f3714387ecbfda9fbbc431140c16b3d06a8c970))


### Bug Fixes

* Add `lowStatusReportingConfig` to `battery` modernExtend ([#8965](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8965)) ([4d37030](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4d370301380e6396730c47bcfeb5b2d73bab98be))
* Convert more of NodOn to modern extend ([#8987](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8987)) ([81d0c74](https://github.com/Koenkk/zigbee-herdsman-converters/commit/81d0c74852bf2ab497e3a102023bf3839dbbee0d))
* **detect:** Detect `_TZE200_wvovwe9h` as Tuya TS0601_switch_2_gang https://github.com/Koenkk/zigbee-herdsman-converters/issues/8983 ([c2de8e2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c2de8e24ba810e21cf024ba4fb11a9ba637ec4f4))
* Disable `producedEnergy` for `gasMeter` modernExtend ([#8977](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8977)) ([854742e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/854742e2ae2f53499fcd84088c952f831367f4c6))
* **ignore:** fix 036b85bcd00dd975b48711471ec79d3d1bf61782 ([ebe3a04](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ebe3a040d7f68c9349555d2665dac14c739e277a))
* **ignore:** Fix TW-03 support ([#8980](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8980)) ([a737b6c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a737b6cb3bc6531462e907311a9124a36efede0c))
* Orvibo: fix random on/off and expose `power_on_behavior`  ([#8984](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8984)) ([adcba6f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/adcba6f02a8a2fe77b54a4e2f9dfd0f29f79bf56))
* Sonoff ZBMINIR2: add config entity category to selected exposed options ([#8982](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8982)) ([658050f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/658050f346ba9094e1a5d22f979efc5951da888c))

## [23.6.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.5.0...v23.6.0) (2025-03-11)


### Features

* **add:** _TZ3000_mw1pqqqt ([#8963](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8963)) ([24835d1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/24835d183f2f61cd0fbefe6abeb24ce973be39c8))
* **add:** EFEKTA_T1_v2_LR, EFEKTA_T1_v2 ([#8971](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8971)) ([093effd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/093effd688036d9ac8b81277c304151af1626682))
* **add:** PCT512 ([#8972](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8972)) ([7264783](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7264783ba0b8e3f6e6e1dde0e1c518a419b423ff))
* Samotech SM309-S SM308-S: add external switch type ([#8970](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8970)) ([5afcc0a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5afcc0a95c492b63e5ea55ab91821032337f66d5))


### Bug Fixes

* **detect:** Detect `_TZ3000_qhyadm57` as Tuya TS0726_switch_4g_2s ([#8967](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8967)) ([e1dbf5b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e1dbf5b04f2af347902c6b1a6b5a382063b4fe81))
* **detect:** Detect `_TZE200_hojryzzd` as Tuya TS0601_cover_1 ([#8969](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8969)) ([e0a230c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e0a230c80c6c0e1c60f626b4621d1081478bf16a))
* **ignore:** Small improvements ([#8974](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8974)) ([9717391](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9717391e42d037d7953407735f9fededd6b57903))

## [23.5.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.4.0...v23.5.0) (2025-03-10)


### Features

* **add:** 7848 ([#8944](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8944)) ([e72841c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e72841c8df3284ebe64f4ce9adde254b08950dcc))
* **add:** 915005732902 ([#8954](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8954)) ([c95e3a3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c95e3a36289d8159d2afaef97544a753d4848053))
* **add:** Bed.box ([#8932](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8932)) ([df36445](https://github.com/Koenkk/zigbee-herdsman-converters/commit/df364453a178142b013ec29644942175bca90eb7))
* **add:** ROB_200-011-1 ([#8953](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8953)) ([23ccd31](https://github.com/Koenkk/zigbee-herdsman-converters/commit/23ccd31474a3412e6dbc28281241d00593ae03a7))
* **add:** ZD1-EN https://github.com/Koenkk/zigbee2mqtt/issues/26652 ([d64c84b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d64c84bbebb4c910baf7d3e3c2d533bbd7d2d169))
* **add:** ZN2S-US1-SD https://github.com/Koenkk/zigbee2mqtt/discussions/26609 ([cf7ea54](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cf7ea54a72a1835f3f5871beee47b51466be2e67))


### Bug Fixes

* Add label to modern extends binary function ([#8943](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8943)) ([d101973](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d101973b8f7ce737dc583bcf9b79350dddf6f0cd))
* **detect:** Detect `_TZE200_gjldowol` as Tuya ZG-204ZL ([#8947](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8947)) ([3796f87](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3796f876f33ed849fd10482b31a969728a1a9450))
* **detect:** Detect `_TZE204_w1wwxoja` as Tuya TS0601_switch_6_gang ([#8938](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8938)) ([8d21b38](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8d21b389364565c8766538b03c02cb0397a5942c))
* **detect:** Detect `915005822501` as Philips 7602031P7 ([#8948](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8948)) ([a0abdc2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a0abdc2de7ab217f8b61f729b28ca0962a044f47))
* EFEKTA: various fixes ([#8955](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8955)) ([2d9c14c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2d9c14c7538fd92e98f73403ed34b1942c60325a))
* Fix duplicate options and toZigbee converters ([#8957](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8957)) ([64dce29](https://github.com/Koenkk/zigbee-herdsman-converters/commit/64dce2936ebd2fcf7cf6319d2249ce76eadc683e))
* **ignore:** update dependencies ([#8950](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8950)) ([70e1681](https://github.com/Koenkk/zigbee-herdsman-converters/commit/70e16817890bfca458737f4924873aaf748e9947))
* Re-add on_time and off_wait_time to the light_onoff_brightness converter ([#8942](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8942)) ([d029330](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d029330ad508ca49cb7761990d4d6c1d83a9de4b))
* ShinaSystem: use metering cluster for power measurements ([#8909](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8909)) ([c05d482](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c05d482f8ea4727d0f97167cd18ee985d73b7535))
* Tuya TS0012_switch_module and TS0013_switch_module: support countdown ([#8962](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8962)) ([ddcc094](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ddcc09471dfaa23fd49d83488cb8b2968ae87054))
* Tuya ZWT198/ZWT100-BH: preset inverted ([#8952](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8952)) ([97b106e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/97b106ea4f908280f08cd506efa79dbf31952780))

## [23.4.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.3.0...v23.4.0) (2025-03-06)


### Features

* Add external switch type extension to Samotech devices and move Sunricher extend functions to a unified module ([#8940](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8940)) ([4ce95db](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4ce95dbc27773b50e130b10e67bc15c217b5f594))
* **add:** 929003809501 https://github.com/Koenkk/zigbee2mqtt/issues/26365 ([4b7c15c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4b7c15c91a5f8582c18ab7a4d46123a1db45d062))
* **add:** TW-03 ([#8934](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8934)) ([3b7b016](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3b7b016d9d59b5f572ba0bb6167e9ac10ac7f282))


### Bug Fixes

* Biome improvements ([#8931](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8931)) ([fbf8004](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fbf8004086ac702bbfaead3708d72e7198bd0c50))
* **detect:** Detect `_TZ3000_gazjngjl` as Tuya TS011F_2_gang_power https://github.com/Koenkk/zigbee2mqtt/issues/26559 ([4470cc7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4470cc75817c3d10f40044b93bb48fe379d6a97c))
* **detect:** Detect `_TZE284_iadro9bf` as Tuya ZY-M100-S_2 https://github.com/Koenkk/zigbee2mqtt/issues/26615 ([176fd73](https://github.com/Koenkk/zigbee-herdsman-converters/commit/176fd73af072cf426142d8b0174d238af694c9e8))
* **detect:** Detect `JETSTROM 6060 JP` as IKEA L2207 https://github.com/Koenkk/zigbee2mqtt/issues/26594 ([9a8a44c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9a8a44c620beaa5773c4c4dc2233b1263671f416))
* Fix `scene_remove_all` failing for groups https://github.com/Koenkk/zigbee2mqtt/issues/26599 ([5ee1a60](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5ee1a60c74788e86f9058ff99e41dd0a02c89439))
* Fixes in the PTVO converter ([#8936](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8936)) ([23dc7d0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/23dc7d070115465e21f620b905ebccc12fb1e8aa))
* Tuya PA-44Z: revert expose the test property to ring the alarm ([#8935](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8935)) ([72a422b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/72a422b1009455d587d74723a2ff02971c91a891))

## [23.3.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.2.0...v23.3.0) (2025-03-03)


### Features

* **add:** 1871154 ([#8928](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8928)) ([ae8c770](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ae8c77005b1b09fd8224e02bb5b48987aaf0f727))
* **add:** 500.43 ([#8921](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8921)) ([a32df66](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a32df6625f31f9e2d9cc6305971b6f5b022cd166))
* **add:** A9Z ([#8916](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8916)) ([bb50060](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bb500608aff7562621dd255bdaf5c17594632e12))
* **add:** Fire Fence ([#8910](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8910)) ([6ac5946](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6ac5946cf432086a6b646266a8c23ea426478913))
* **add:** ZS05 ([#8912](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8912)) ([2f2fae1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2f2fae14d0b5ab109a4979bdffb74b4a5661b05c))
* SONOFF SNZB-02D: support OTA https://github.com/Koenkk/zigbee-OTA/pull/711 ([05cf125](https://github.com/Koenkk/zigbee-herdsman-converters/commit/05cf125f1b42e14fc3ecc00aad063cedf2cd3e62))
* SONOFF TRVZB: support `temperature_accuracy` ([#8837](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8837)) ([cb76a40](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cb76a40e7a9a67e594dd7e518ad34970c036a7ba))


### Bug Fixes

* Aqara SJCGQ11LM: read status when pairing https://github.com/Koenkk/zigbee2mqtt.io/pull/3549 ([846cdd9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/846cdd9e2d4bd76de33bd8a891f7a534603c2ed6))
* **detect:** Detect `FLS-PP3 White\u0000` as Dresden Elektronik Mega23M12 ([#8918](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8918)) ([4ed7846](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4ed784654f12d173c8bddcc1a80c8d21cd8d4afa))
* Eurotronic COZB0001 : add new dateCode ([#8914](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8914)) ([bab91ea](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bab91eaba8760a94d558faa8e88f0d4ba71bc5af))
* **ignore:** update dependencies ([#8924](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8924)) ([e545832](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e545832c54ea6b69f0d1fc4367cad2820ae31ef3))
* Moes ZHT-SR: fix sensor select and backlight switch ([#8920](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8920)) ([7b27dca](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7b27dca5b93d988292d8778eb61aab8942147f65))
* Nous D2Z: rename to DZ ([#8917](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8917)) ([f7551d1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f7551d1285bf448af6a9ef6cdb097ce88b9853df))
* Tuya TS0601_smart_air_house_keeper: filter more strange values for PM2.5 ([#8905](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8905)) ([abb6bd8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/abb6bd87b7392cb53e05818ad42bb16db6e2d969))
* Tuya TS0601_thermostat_4: fix local temperature calibration precision ([#8927](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8927)) ([1bd7318](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1bd73182ebbe9adbe7215e04588490f227ad9ecf))

## [23.2.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.1.1...v23.2.0) (2025-03-01)


### Features

* Add "off" backlight to "-G2" Sinope thermostat variants ([#8903](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8903)) ([918d14a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/918d14aa0676f57eb3f05a8b8b7e275958b531dd))
* **add:** dqhome.re4 ([#8888](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8888)) ([d37fac9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d37fac908b31a3a353c12a647befec4c255ba75d))
* **add:** EFEKTA_Smart_AQ_Box_R3 ([#8906](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8906)) ([fb51ace](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fb51ace1b30d6bc238b0ae12603f92cb357a260a))
* **add:** KD-R01D ([#8896](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8896)) ([0e5475b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0e5475b8810558f13f19f5f16997d4bf3de1ee95))
* **add:** POK016 ([#8895](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8895)) ([1b38695](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1b386951a9ccdd3c67418f9f14c962f411df2c8a))
* **add:** TO-Q-SYS-J2T ([#8899](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8899)) ([5ae8596](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5ae8596936c6214a15f94ed79f6843f42b511aaf))
* **add:** ZDM150 ([#8860](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8860)) ([94c3458](https://github.com/Koenkk/zigbee-herdsman-converters/commit/94c345865dcda82eb64521e9d66ff343779209a1))


### Bug Fixes

* **detect:** Detect `_TZE200_w6n8jeuu` as Tuya ZTH05Z https://github.com/Koenkk/zigbee2mqtt/issues/23469 ([e2af37e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e2af37e545940766cedba7c86856f6551337bd2e))
* **detect:** Detect `_TZE284_chbyv06x` as Tuya TS0601_gas_sensor_2 ([#8900](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8900)) ([3b82d20](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3b82d20a4d0f966734f1fa469dc17bd803b31fbe))
* **detect:** Detect `SIN-4-UNK` as NodOn SIN-4-RS-20 https://github.com/Koenkk/zigbee2mqtt/issues/26508 ([a9083f3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a9083f3dc0e2fe4e446fb9da78ab06a23e9c3879))
* Rename `BHT-002-GCLZB` to `BHT-002` ([#8904](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8904)) ([6cd9c12](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6cd9c121868c4dabf9534e128503111907a969ea))
* Update `TS0205_smoke_2` description https://github.com/Koenkk/zigbee2mqtt.io/pull/3550 ([c4cd13d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c4cd13d1982f939b93f359bc0dc5a0ed8bf0b085))

## [23.1.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.1.0...v23.1.1) (2025-02-26)


### Bug Fixes

* **ignore:** Fix definition resolving ([#8892](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8892)) ([27fb004](https://github.com/Koenkk/zigbee-herdsman-converters/commit/27fb0047b3ec1458646c2db28ab7ee5e5d817c3c))
* Update 3R button action ([#8893](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8893)) ([bdd038e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bdd038e52296f370e8a7417466cedf84e508d3d6))

## [23.1.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v23.0.0...v23.1.0) (2025-02-25)


### Features

* **add:** EFEKTA_AQ_Smart_Monitor ([#8887](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8887)) ([4ad8787](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4ad8787a43b8db7a0935c3754f7ed0f023595f09))


### Bug Fixes

* Add various `_TZE284_*` models ([#8886](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8886)) ([3325f29](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3325f29e0da78a34ae226dd9b78394b35c2228d5))
* Cleanup exports in fz/tz ([#8885](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8885)) ([89ab46f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/89ab46f435273bee930cec78e2f2d050e6fa5af8))
* **detect:** Detect `_TZE284_vawy74yh` as Moes ZM-SSD01 https://github.com/Koenkk/zigbee-herdsman-converters/issues/8884 ([3444a1c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3444a1cecef494ce006e3bb61a5d23160d4d6b28))
* **ignore:** include changelog in package (required by chagnelog generator) ([365f0cc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/365f0cc316cc07ea3730bba360e4f2bb5e16202d))
* Iluminze 511.344: mark identify as sleepy ([#8883](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8883)) ([a4126e5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a4126e553a14613b2c3cfd55e66ec602aae71300))

## [23.0.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v22.2.0...v23.0.0) (2025-02-24)


### ⚠ BREAKING CHANGES

* **ignore:** Update breaking changes

### Features

* Added gas_meter to modernExtend ([#8863](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8863)) ([0a35289](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0a352899ca5653f9b63f0bd6814152b9f4d4bc6e))
* Extend support for custom zigbee frames with `zcl_command` ([#8867](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8867)) ([8dc1719](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8dc1719896a1f12a532c2497f06d1059bfb1c06c))
* Sonoff TRVZB: expose external temperature sensor attributes ([#8873](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8873)) ([91c52a2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/91c52a29d9c715babc365d2e363295826288bb04))


### Bug Fixes

* Add `manuSpecificPhilips3` to every Philips light ([#8872](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8872)) ([bc2abbc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bc2abbcadaed3c1d01ce700b3b501419dfa7757c))
* Adds publish to Tz.Meta type ([#8875](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8875)) ([5d9c8cb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5d9c8cbe95072b73622602ff3673aab612130fa8))
* **detect:** Detect `_TZ3000_0ghwhypc` as Tuya TS0001_power TS0001_power ([cc2cf88](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cc2cf885b97a3bbf19e144329e19807af47ac2c5))
* **detect:** Detect `_TZE204_gkfbdvyx` as Tuya ZY-M100-24GV3 ([#8870](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8870)) ([ef49a24](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ef49a2491fad5979e95a063e8a8465d78c1f5ce6))
* **detect:** Detect `_TZE204_nladmfvf` as Tuya TS0601_cover_1 ([#8880](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8880)) ([abecb14](https://github.com/Koenkk/zigbee-herdsman-converters/commit/abecb141d57157fb0ccf3cbf62ead72689359965))
* Fix `TypeError: Cannot read properties of undefined (reading 'read')` error when reading power from WS-USC03 https://github.com/Koenkk/zigbee2mqtt/issues/20286 ([ecd523f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ecd523f2894778b5b88cc4199cd7ffaac4b0ddb2))
* **ignore:** Add `exports` for clean imports ([fdb6600](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fdb660009411f3a0e161e9c280539ad23c675bf9))
* **ignore:** Add back `module.exports` to from/toZigbee to prevent external converter breaking change ([5d34368](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5d34368fd2f3c0b2feb17472407e2db10e0bf155))
* **ignore:** Update breaking changes ([a8bb45f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a8bb45f06c1ad986a93a9a0caf0e49bce2fd16e1))
* **ignore:** update dependencies ([#8874](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8874)) ([330bd7c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/330bd7c4a95c52c67253932babeb793fb6bf06d1))
* Migrate from eslint/prettier to Biome ([#8859](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8859)) ([009890b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/009890b0d5cce8ff27ac1f2770ec31543e96b185))
* Poll battery % of Profalux remote ([#8877](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8877)) ([86e7d12](https://github.com/Koenkk/zigbee-herdsman-converters/commit/86e7d12d72483d90ffacf0299c210594a42d8be2))
* Publish `dist` folder instead of root ([#8869](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8869)) ([f13e121](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f13e12191754514c331625ca8c279c920dab0948))

## [22.2.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v22.1.0...v22.2.0) (2025-02-22)


### Features

* **add:** 046677584719 ([#8866](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8866)) ([d59f6a3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d59f6a36f650acc522b85941c192fd2514584b74))
* **add:** SR-ZG2856-Pro ([#8856](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8856)) ([8ee754b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8ee754bb5773e2411db81a3f778138a0d9ac53f1))
* **add:** TE-1Z ([#8784](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8784)) ([d1d710b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d1d710b8188a86f8087f8efc7d1d1eaab9bbe273))
* Support `data_report_duration` for Tuya SPM01V2 ([#8843](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8843)) ([fbe5296](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fbe5296910735766877066df2e1a199d4cc255ea))


### Bug Fixes

* **detect:** Detect `_TZE284_yjjdcqsq` as Tuya ZTH01 https://github.com/Koenkk/zigbee2mqtt/issues/26412 ([92f0403](https://github.com/Koenkk/zigbee-herdsman-converters/commit/92f040391a13fbd7582d872a1764df3f22c10792))
* Fix definition generator hanging https://github.com/Koenkk/zigbee2mqtt/issues/26430 ([c074866](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c074866ddf187d6160b2ce4028645e36eecfeb44))

## [22.1.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v22.0.1...v22.1.0) (2025-02-20)


### Features

* **add:** 1003296 https://github.com/Koenkk/zigbee2mqtt/discussions/26344 ([62ad8a1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/62ad8a198869bbb5e49b5c074d64338731549d12))
* **add:** CK-TLSR8656-SS5-01(7019), CK-TLSR8656-SS5-01(7003), CK-TLSR8656-SS5-01(7000), CK-TLSR8656-SS5-01(7014), CK-TLSR8656-SS5-01(7002) ([#8855](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8855)) ([61015b3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/61015b3ed64673b30d26fcb41f599cbfac977f55))
* **add:** D2Z ([#8857](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8857)) ([4876979](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4876979fbeb8aaf3d83ca5887e22f84ae9fe1283))
* **add:** FanBee ([#8188](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8188)) ([81eb119](https://github.com/Koenkk/zigbee-herdsman-converters/commit/81eb119589bdecf25e020a04d9493aaea540e76f))
* **add:** SR-ZG9093TRV ([#8835](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8835)) ([c38c536](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c38c5366ed617f65a8967595c2c6fa040a04f644))


### Bug Fixes

* Add 3RSB22BZ private cluster ([#8858](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8858)) ([8f6996d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8f6996d231fddcb9aa483a6b58d6382e90ab9fbd))
* Cleanup exports ([#8833](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8833)) ([eba94f4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/eba94f48dc43dd8fc9c5c9a461bef7ce09e84ef5))
* **detect:** Detect `_TZ3210_c7nc9w3c` as LELLKI WP30-EU https://github.com/Koenkk/zigbee2mqtt/issues/26424 ([c5ec687](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c5ec687f2a47b73bb2ebac6995cbfb4c0bef8878))
* Fix dimmingMode parameter for Inovelli devices ([#8829](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8829)) ([e8e27b9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e8e27b90d47fe15fc6f0a32b98214afa5a6d4813))
* **ignore:** Add switch actions description ([f43d589](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f43d5890be927cd73660967304f6dd41fd693e9f))
* Increase TS0601_thermostat_4 maximum heating value and permissible calibration limits ([#8841](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8841)) ([efd306c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/efd306c11b86951bd5666e5b5aba57fe2e088f73))
* Tuya PA-44Z: expose the test property to ring the alarm ([#8845](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8845)) ([a977136](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a9771369c0898638e5298bf9e852a7a12c5deb69))
* Ubisys H10: enable OTA ([#8839](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8839)) ([26aba90](https://github.com/Koenkk/zigbee-herdsman-converters/commit/26aba90e7bd71bd4b06472b853f9ee3e69931f39))

## [22.0.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v22.0.0...v22.0.1) (2025-02-18)


### Bug Fixes

* **ignore:** Export ExternalDefinitionWithExtend ([2c42233](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2c422336fc83e2f860627a338c62d5d02751f673))

## [22.0.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.38.0...v22.0.0) (2025-02-18)


### ⚠ BREAKING CHANGES

* Load converters on-demand ([#8471](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8471))

### Features

* **add:** 1241755 ([#8818](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8818)) ([9baab2f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9baab2f30d53c580c7748d4e42784a8a3ddd2276))
* **add:** ZB-PM-01 ([#8821](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8821)) ([6b5b74e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6b5b74eff37de47957daef3212c522ab8c03fb21))
* **add:** ZM-18-USB ([#8827](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8827)) ([3a7fed4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3a7fed430313ceca1db522b5da1a7cede7efaaf4))
* Load converters on-demand ([#8471](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8471)) ([8fef2e4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8fef2e44830a77e91b12eaea9b6940e9fa7ef849))


### Bug Fixes

* Fix duplicate linkquality sensor for some router devices https://github.com/Koenkk/zigbee-herdsman-converters/issues/8809 ([4a55fc6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4a55fc622da466b3573cbf4210c90aeb9a3957d2))
* Fix multiple versions of the name Nova Digital ([#8826](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8826)) ([e04bd69](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e04bd69a9148e0d6082501c4f1003d46fb073223))
* Fix Silabs GBL validation https://github.com/Koenkk/zigbee-OTA/issues/631 ([1f27210](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1f2721048b73fcc703aa44caaa82328ce3aa7129))
* Fix Tuya `_TZE204_xnbkhhdr` inverted `preset` ([#8825](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8825)) ([0ccf1a9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0ccf1a9438217093502e27157671dc541d8400f1))
* MAZDA TR-M2Z: fix deprecated window_detection exposes ([#8824](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8824)) ([54ad105](https://github.com/Koenkk/zigbee-herdsman-converters/commit/54ad105bc10ef96f7f1a0b33197bf6e40d42abc1))

## [21.38.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.37.0...v21.38.0) (2025-02-17)


### Features

* **add:** 929003809601 https://github.com/Koenkk/zigbee2mqtt/issues/26365 ([96f47ca](https://github.com/Koenkk/zigbee-herdsman-converters/commit/96f47ca0cdf7aed39d1550e1277eb1401238e6b4))
* **add:** FZB-4 ([#8817](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8817)) ([d9b5bef](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d9b5bef4419f56e90bf775da0c16f2fbed0eac2d))
* **add:** ZBCMR-01 ([#8813](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8813)) ([b7b98dd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b7b98dd8d434524c46f528cf5ac1671d2e24644e))


### Bug Fixes

* Aeotec ZGA004: fix state https://github.com/Koenkk/zigbee2mqtt/discussions/26289 ([97e7bc3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/97e7bc36066836c9adb43a6a5abf8258863c8a06))
* **detect:** Detect `_TZ3000_n0lphcok` as Tuya TS0207_repeater https://github.com/Koenkk/zigbee2mqtt/issues/26361 ([a1c45fc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a1c45fc1d3e75ce5b3c6caf1d3a3a5e2cb38fce5))
* Fix duplicate action for Hue dimmer switch and wall switch https://github.com/Koenkk/zigbee2mqtt/issues/26374 ([184b536](https://github.com/Koenkk/zigbee-herdsman-converters/commit/184b5361a77bdd5e751175e046e0b73c4df4e770))
* HS2WD-E: remove unsupported features from exposes ([#8820](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8820)) ([8412feb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8412febdab8d3f439a9928658f5334c0009c1146))
* **ignore:** update dependencies ([#8814](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8814)) ([842e8e5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/842e8e51d73fdd36b929be611f9e612de3cc0ec9))
* Moes ZHT-SR: fix local temperature calibration ([#8811](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8811)) ([10cb52b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/10cb52b2f83c7486621d38fd8096c17a51f64719))
* Update default ac frequency precision ([#8816](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8816)) ([495ac22](https://github.com/Koenkk/zigbee-herdsman-converters/commit/495ac226f381fa4a33eb12c809f9bd3f09e1216f))

## [21.37.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.36.0...v21.37.0) (2025-02-14)


### Features

* **add:** ZHT-SR ([#8803](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8803)) ([f529ec7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f529ec7ba422c072cdd027be819ab990b8594e49))
* Aqara DJT12LM: support more features ([#8788](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8788)) ([536f4d4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/536f4d400dbd72296237ba4da8718ac8226c767a))
* Orvibo T40W4Z: support more features ([#8789](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8789)) ([4b4ff8a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4b4ff8af34d30808cace19705eddea44fae897d4))
* Sunricher R-ZG9030F-PS : support indicatorLight, detectionArea, illuminanceThreshold ([#8810](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8810)) ([0063d6c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0063d6c1c29ba64e53dab1873af202fd9bf31721))


### Bug Fixes

* Aqara XDD13LM: fix color temperature range ([#8804](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8804)) ([3f60c2f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3f60c2f06873aff669af92a9ed67cc3ed2eaa9ec))
* Centralite 3156105: add reporting for missing attributes & fix for non-heat pump configurations ([#8806](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8806)) ([f552c37](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f552c379fcaf77c4a89601b9bdb9cf067f75923f))
* **detect:** Detect `_TZE284_dikb3dp6` as Tuya SPM02V3 ([#8805](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8805)) ([a29bc3f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a29bc3f5373a90840fd9db1ec454b9a719194769))
* **detect:** Detect `SLZB-06P7` as SMLIGHT SLZB-06P7 https://github.com/Koenkk/zigbee2mqtt/issues/26228 ([738bbb7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/738bbb7924e14a79c6689ebf9ef4595e6fd76959))
* Philips 8719514440937/8719514440999: fix duplicate actions https://github.com/Koenkk/zigbee2mqtt/issues/26341 ([69ce1dd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/69ce1dd16502ea8c35bfbdac684f62b832f8438c))
* Rename E160x/E170x/E190x and E22x4 ([#8801](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8801)) ([9a33433](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9a33433b49d6753a78380bac7554003345d856c8))

## [21.36.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.35.0...v21.36.0) (2025-02-12)


### Features

* **add:** BX82-TYZ1 ([#8791](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8791)) ([5c230bb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5c230bba9032405587414d5c1d84181d0e528faa))
* **add:** COZB0001 ([#8802](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8802)) ([b58349a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b58349a048714202ebfe17437940b7001b21477e))
* **add:** ME168 ([#8799](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8799)) ([65abdb3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/65abdb3d033777d6e1a3c4451cdb11599c462cb6))
* Improve Tuya BAB-1413_Pro integration ([#8800](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8800)) ([dc90fb3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dc90fb39cb6877af8e3b8be2a3f523f12c6e32d1))


### Bug Fixes

* Expose `update_frequency` for Tuya SDM01V1.5 ([#8792](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8792)) ([80e718a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/80e718abd30a73ed43a2284b313d6310817ecf18))
* Expose more actions for 511.344 ([#8798](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8798)) ([38b1bd0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/38b1bd0c8ec1cad09160eb958de50d0c5bd7ef2d))
* Fix duplicate actions for IKEA E1524/E1810 https://github.com/Koenkk/zigbee2mqtt/issues/26281 ([056bca6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/056bca65405459fdafd65776272ead6202dc972a))

## [21.35.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.34.0...v21.35.0) (2025-02-10)


### Features

* **add:** 3RSMR01067Z ([#8786](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8786)) ([cea6699](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cea6699eda355e08d48993e3fec39e6c190f6bdd))


### Bug Fixes

* Add scene commands for SR-ZG2836D5 ([#8787](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8787)) ([c10e63c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c10e63c996d219fd85556721254dfbf716022014))
* Expose `action_group` for EGLO 99099 ([#8785](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8785)) ([9c3b987](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9c3b9876056c84a94ae7083a36bedc7b6aafe9ec))
* Sonoff: improve inching control ([#8790](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8790)) ([a228c1c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a228c1ced713ec83abf983b1dbf3f7ab1434a7c7))

## [21.34.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.33.0...v21.34.0) (2025-02-09)


### Features

* **add:** EFEKTA_PST_DUO_V1_LR, EFEKTA_PST_DUO_V1, EFEKTA_PST_V1, EFEKTA_PST_POW_V2_LR, EFEKTA_PST_POW_V1_LR, EFEKTA_PST_V1_LR, EFEKTA_T8_POW, EFEKTA_T1_Y_LR ([#8779](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8779)) ([f3e3173](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f3e317375c141874bbedfdbcceb662d787c46b14))


### Bug Fixes

* **detect:** Detect `_TZE284_qyflbnbj` as Tuya TS0601_temperature_humidity_sensor_1 ([#8777](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8777)) ([ccaaa7f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ccaaa7ff4c18557f76b445a39507c92edcee430d))
* **ignore:** update dependencies ([#8781](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8781)) ([9e475c2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9e475c252da3f3ea0a66bb5c6f22416c7719d755))
* System mode in Namron thermostat ([#8753](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8753)) ([f44625f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f44625f2351ad90c2158762f4fc8d0452633dbef))

## [21.33.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.32.0...v21.33.0) (2025-02-08)


### Features

* **add:** EFEKTA_ePST_POW_E_LR, EFEKTA_eTH_POW_E_LR ([#8773](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8773)) ([3be5204](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3be5204da05114f2f73f7fc27f9245538c1736ed))
* Sonoff ZBM5 add toggle action ([#8772](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8772)) ([eb1013a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/eb1013a21fcc3d975a03d58e621533ff5a867853))


### Bug Fixes

* **detect:** Detect `_TZE284_ogx8u5z6` as Tuya TS0601_thermostat_3 ([#8774](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8774)) ([e2b1ab2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e2b1ab294000b7758bc5c9506f01d39510b47208))
* Fix 511.020 vendor name ([#8768](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8768)) ([3cc7e89](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3cc7e89985b4bfa938b51cc906a32cff6416c595))
* Fix Illuminize 5144 series configure failing ([#8735](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8735)) ([5884112](https://github.com/Koenkk/zigbee-herdsman-converters/commit/58841121a0f472f119b5cd9479fb00438d91cc7e))
* **ignore:** fix SLZB-06p10 fingerprint modelID https://github.com/Koenkk/zigbee-herdsman-converters/commit/bcb6b21caa30d067d38403662718027a672a33cf ([e51ca10](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e51ca10624525d9fb892022e9a61bb35494eda89))

## [21.32.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.31.0...v21.32.0) (2025-02-07)


### Features

* **add:** 10447293 ([#8765](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8765)) ([3591875](https://github.com/Koenkk/zigbee-herdsman-converters/commit/35918755f1c21d6fa01a89c779aec9a5d0449bde))
* **add:** 929003822901 ([#8762](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8762)) ([2c0bf51](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2c0bf5189b49740698ebb6b71fc4948ed744cd68))
* **add:** QS-Zigbee-SEC01-DC ([#8757](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8757)) ([6afe9fc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6afe9fc17b36e9905e5d6525c787ea0548bb6c02))
* **add:** SLZB-06p10 https://github.com/Koenkk/zigbee2mqtt/issues/26208 ([bcb6b21](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bcb6b21caa30d067d38403662718027a672a33cf))
* **add:** TS0901 https://github.com/Koenkk/zigbee2mqtt.io/pull/3487 ([1d49847](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1d498476910ce15711d27c5e7d1cd20f52cd3ebf))
* **add:** VNTH-T2_v2 ([#8750](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8750)) ([49fdcc3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/49fdcc306f3b2bb858ae641c54e46b87adf57c8e))


### Bug Fixes

* **detect:** Detect `_TZE204_iadro9bf` as Tuya ZY-M100-S_2  ([#8759](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8759)) ([0908d44](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0908d446d34d36a165d450094993976e13f7351b))
* **detect:** Detect `_TZE204_ogx8u5z6` as Tuya TS0601_thermostat_3 ([#8766](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8766)) ([8a3efaa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8a3efaa9eade426a67773682b88d4a449832d076))
* Fix typo in `RF 274 T` vendor name ([#8756](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8756)) ([72d84f9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/72d84f9b9be97a137edde5b58c62275a37aa3a41))
* Set some category to config for SR-ZG9033TH ([#8758](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8758)) ([f2cc9f4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f2cc9f4823333c2f154f3e59ed19f77fa63d2965))

## [21.31.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.30.0...v21.31.0) (2025-02-06)


### Features

* **add:** SLZB-06Mg24 ([#8754](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8754)) ([bac86f3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bac86f3c4fe4b992faafd3bbe09262406f2ffb99))


### Bug Fixes

* Enable OTA for newer Hue Motion Sensors ([#8749](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8749)) ([40be450](https://github.com/Koenkk/zigbee-herdsman-converters/commit/40be450d7c47e9e559459553210b824c5d08848b))
* Improve battery report PO-THCO-EAU ([#8752](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8752)) ([1799090](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1799090feed6cf95bb10e55ed2291f9697d8b938))

## [21.30.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.29.0...v21.30.0) (2025-02-05)


### Features

* Add Orvibo MixSwitch zigbee models ([#8701](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8701)) ([4f43cad](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4f43cad72303308346ea5d5ae4b5b5ac885f4d32))
* **add:** 7963223 ([#8745](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8745)) ([0f59d49](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0f59d49a4a06c33de3fa1a2d2e081a878c8723f5))
* **add:** EFEKTA_Air_Quality_Station ([#8726](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8726)) ([e92b434](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e92b434d62557cc61522f018ca8ca16c7719bafa))
* **add:** PO-THCO-EAU ([#8729](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8729)) ([80c08ec](https://github.com/Koenkk/zigbee-herdsman-converters/commit/80c08ec18dce36e9c15b04116e58530f47da7f45))
* **add:** Yali Parada Plus ([#8732](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8732)) ([f6c2922](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f6c2922dd8f7e55febc515be2cc99cc8f863aaab))


### Bug Fixes

* Add `ZG2819S-RGBW` as whitelabel of `511.344` ([#8740](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8740)) ([f6444b0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f6444b0dd1de688dfa0f790d0eed284f4a47c92f))
* Change ZG9030A-MW occupancy to endpoint 2 and change some category to config ([#8743](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8743)) ([f462174](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f462174c8d8bb50f77aedc78661b1936cbf15008))
* Fix 501.39 detection https://github.com/Koenkk/zigbee2mqtt/issues/26158 ([603e698](https://github.com/Koenkk/zigbee-herdsman-converters/commit/603e698304778fad62f61f695955c3535ebf8e59))
* Fix LiXee integration ([#8748](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8748)) ([622631f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/622631f9e4edd64590959db1479f6bee0f7f0d7b))
* **ignore:** Fix ZWPM16-2 integration ([#8739](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8739)) ([5f26553](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5f265535ffb59cb0fd6ef3cbeaae57238fe19755))
* PTVO converters: added rounding for pressure, humidity, illuminance. ([#8746](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8746)) ([0769495](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0769495956dcdd005866df503ef4fa78eea39f3e))

## [21.29.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.28.0...v21.29.0) (2025-02-04)


### Features

* Add support for light_brightness_move and light_brightness step to Inovelli switches ([#8727](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8727)) ([dded1fa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dded1fac067a96e9833fe416ab35858f339c3608))
* **add:** FB56-DOS06HM1.1 ([#8704](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8704)) ([2680dfd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2680dfd538e10ecb96f797da68b7fb92f22633e2))
* Support power on behaviour for LEDVANCE 4058075729322 https://github.com/Koenkk/zigbee2mqtt/issues/26163 ([4d5a7d3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4d5a7d372f80d5b324bc9f78c317620062223989))


### Bug Fixes

* Adapt SP 24x converter for new firmware version ([#8715](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8715)) ([67c008d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/67c008dc69bce05a3a37df7d6500098e54ce10e4))
* Added type for LightArgs.levelConfig  ([#8724](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8724)) ([8dc7622](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8dc76221a4445d5bd723e9dbbade2327537d0bdf))
* **detect:** Detect `_TZE204_cvub6xbb` as Tuya TGM50-ZB ([#8725](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8725)) ([4a66a0a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4a66a0a87371ed785c0ed131e08b5d459f5cb8ec))
* **detect:** Detect `HK-LN-SOCKET-EU-5` as LED-Trading 9134 https://github.com/Koenkk/zigbee2mqtt/issues/26165 ([9137e5b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9137e5b88b6cf6333ba3fc4c3060497958430fcc))
* Disable `power_on_behaviour` for Schneider Electric MEG5126-0300 ([#8719](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8719)) ([4cd9699](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4cd9699a7b8260299b559ebde8b4c95eff7dc0e4))
* Fix CO2 values [#26108](https://github.com/Koenkk/zigbee-herdsman-converters/issues/26108) ([#8733](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8733)) ([eb7693f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/eb7693fb8b4a5807676ce774a52f8d2ac3a36f27))
* Fix Namron 4512768 power measurements https://github.com/Koenkk/zigbee2mqtt/issues/25964 ([ad60fd4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ad60fd4c171d5e84cad6a37f93f744809289f405))
* **ignore:** Correction name of lines L1/L2 ([#8720](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8720)) ([5313dae](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5313daed547c4c7d58ec648390a2deb0d27168f7))
* Prevent Tuya packets from being reprocessed by checking entire packet instead of `seq` only ([#8723](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8723)) ([e3bd7b6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e3bd7b63efae425eb92bb2db11be94c10d05b840))
* Revert "Invert direction for Smartwings shades" ([#8736](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8736)) ([a6f234d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a6f234d32c67ed011e20188a7bd4b99d59784e9a))
* Tuya BAC-003: Add optional device state property as per issue request ([#8730](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8730)) ([8b2d5d4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8b2d5d424983547ffecd634606247e81b8e92d4b))
* Tuya BAC-006: publishDuplicateTransaction, optional heating, optional device state ([#8731](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8731)) ([d88f402](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d88f402f505f87226b288e43ea8c21f6181df998))

## [21.28.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.27.1...v21.28.0) (2025-02-02)


### Features

* Add energy to AVATTO ZWPM16 ([#8714](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8714)) ([0539610](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0539610b5461aa6b10f3a31d015e1cecb4e4b5fe))
* **add:** 81813-V2 https://github.com/Koenkk/zigbee2mqtt/issues/26070 ([2f9caa6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2f9caa6943d2bec787ff18d47ef63ba613f1f6fc))
* **add:** ZWPM16-2 ([#8716](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8716)) ([ea46a3f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ea46a3f4c46e35f5ce0ec938f9e4f33ac0f6556c))
* Improve integration of various Enbrighten devices ([#8703](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8703)) ([5f64f0e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5f64f0e088cfe040c8ad70a504ec2990f34cb5e1))
* Improvements for Inovelli devices ([#8700](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8700)) ([959b96e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/959b96e1cc593e8ebf5cae3c7e689c2474a511be))
* Yokis : updating device definition ([#8705](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8705)) ([6106f9d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6106f9d24f5acfd831d303db411e6c577e48aed5))


### Bug Fixes

* **detect:** Detect `_TZE284_myd45weu` as Tuya TS0601_soil https://github.com/Koenkk/zigbee2mqtt/discussions/26073 ([eb426d4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/eb426d4ce862c392e3b45ac27a6e95cc042ad72a))
* Fix CO2 values https://github.com/Koenkk/zigbee2mqtt/issues/26108 ([91a0af2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/91a0af2a93c9f5484fb4e9e36159233230bfe11d))
* Fix enum mapping for Namron Edge Thermostat ([#8709](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8709)) ([71a88c9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/71a88c9572c2c477be29b40eaeccdfb73e6d2656))
* Remove unsupported tilt from Tuya TS0301 https://github.com/Koenkk/zigbee2mqtt/issues/21924 ([8953938](https://github.com/Koenkk/zigbee-herdsman-converters/commit/895393891d5777e98452dd28822fa037fa4a4f37))

## [21.27.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.27.0...v21.27.1) (2025-02-01)


### Bug Fixes

* **ignore:** update dependencies ([#8706](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8706)) ([75d9b53](https://github.com/Koenkk/zigbee-herdsman-converters/commit/75d9b538c19e45053540c3dd6f244541ceedaeb2))

## [21.27.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.26.0...v21.27.0) (2025-01-30)


### Features

* **add:** DSZ12060 ([#8699](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8699)) ([074d472](https://github.com/Koenkk/zigbee-herdsman-converters/commit/074d472b61092c357455739b6ee1da6b1ec34801))
* **add:** GL-G-005P ([#8693](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8693)) ([09c20f0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/09c20f0d4fbca4845ba4b5b9487786f6b5eded48))
* **add:** POK014, POK015 ([#8695](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8695)) ([123b4e4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/123b4e4086eb19dc33d9710740e2eb5abb2f069e))
* **add:** WSMD-4 ([#8690](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8690)) ([d5726d5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d5726d590bb39a685af17327db18e8493871248f))


### Bug Fixes

* **detect:** Detect `_TZE284_vvmbj46n` as Tuya ZTH05Z https://github.com/Koenkk/zigbee2mqtt/discussions/26036 ([560ae94](https://github.com/Koenkk/zigbee-herdsman-converters/commit/560ae94e38d2dbc8da05ca97ab1b9298134c0e71))
* **detect:** Detect `SLP3` as Hive 1613V https://github.com/Koenkk/zigbee2mqtt.io/pull/3471 ([9164583](https://github.com/Koenkk/zigbee-herdsman-converters/commit/916458308338238ecf8910083dcde6202d12f3a1))
* Improve Tuya BAC-003 support ([#8694](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8694)) ([9a94890](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9a948901b5ae606d7da9a6db0395713fd8438394))
* TYBAC-006: Update system_mode to support "off", dropping "state" ([#8691](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8691)) ([301258d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/301258ddba975198decaf8f48b1aaadea8f2756a))

## [21.26.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.25.0...v21.26.0) (2025-01-28)


### Features

* SNZB-02D: add support for temperature and humidity calibration ([#8685](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8685)) ([77fe20f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/77fe20ffb9f2910e1820a689c4afe08316b203b4))


### Bug Fixes

* Add Lidl HG09155C and HG09155B to the list of Lidl devices ([#8686](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8686)) ([d15812a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d15812a4beba7408f78766fc324b0f216d37f02e))
* **detect:** Detect `_TZE204_5slehgeo` as Moes ZTS-EUR-C https://github.com/Koenkk/zigbee2mqtt/issues/26011 ([1272419](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1272419b5fa9b1a14e82e4c25cc98cb6dcecc200))
* Encoding error in boost-heating emoji (♨) ([#8687](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8687)) ([2afdd6e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2afdd6e3f77f6f528e0a46f8159b38b307723524))
* **ignore:** Fix BRT-100-TRV step accuracy ([#8688](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8688)) ([cec6ecf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cec6ecf195dbd12e72ab55509b0b1631a01e08cc))

## [21.25.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.24.0...v21.25.0) (2025-01-27)


### Features

* Add Niko switch action reporting functionality ([#8635](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8635)) ([4ae589e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4ae589e429467334708e811a1f5b812206a7f75f))
* **add:** DS-Z-001DE ([#8682](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8682)) ([809bb75](https://github.com/Koenkk/zigbee-herdsman-converters/commit/809bb75926520ca76b99cb14aaf51678ce81bfaf))
* **add:** SBDV-00185 ([#8677](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8677)) ([7201875](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7201875778d72cacd37166358a6cd6f2f1c9af85))
* **add:** SM0502 ([#8667](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8667)) ([04df965](https://github.com/Koenkk/zigbee-herdsman-converters/commit/04df965c6aac64645283f4b8d01edc9b9bda452e))
* Improve Ubisys S1-R (Series 2) support ([#8627](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8627)) ([d8ade3e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d8ade3e53c92ad6a40137a42a6702e15a567dd5e))
* SNZB-02D: add support for comfort levels and temperature units. ([#8684](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8684)) ([1fc8d0e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1fc8d0e28dfa011db04c154f0d3653182e1ac14c))


### Bug Fixes

* Decrease SmartThings IM6001-MPP01 reporting interval ([#8676](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8676)) ([b9766c5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b9766c59886e897bdb199fc4674f181c4ac9c46d))
* **detect:** Detect `_TZE200_vvmbj46n` as ONENUO TH05Z ([#8675](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8675)) ([fd55801](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fd558012bd303d75530291d0eb8f0486c5876499))
* Fix missing action messages for Legrand Wireless Shutter switch 0067646 ([#8679](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8679)) ([8a9a6d3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8a9a6d306c1dd1816a3e88131a7810dc1a23ab9b))
* Fix Tuya ZY-M100-24GV3 losing settings ([#8674](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8674)) ([55e18a6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/55e18a61f2887267ed1da07871e10099ff0a5bb6))
* **ignore:** update dependencies ([#8678](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8678)) ([20981bc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/20981bcc7fb7b7a3da90f68095e8f87d60d4d303))
* Improve AVATTO ME168 support ([#8651](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8651)) ([a797ca6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a797ca6122dcec0b93f92a484b2f420906968889))
* Invert direction for Smartwings shades ([#8681](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8681)) ([d48ac2e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d48ac2e0105f46669c662f55414aa33f8fde4abe))

## [21.24.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.23.0...v21.24.0) (2025-01-25)


### Features

* **add:** 4512783/4512784 ([#8650](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8650)) ([79e4c85](https://github.com/Koenkk/zigbee-herdsman-converters/commit/79e4c8560f96e6ba52a94370137d420e2a9641b8))
* **add:** ATMS10013Z3 ([#8658](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8658)) ([b60bbb8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b60bbb8ee44bec8199a8e64ab9449f3705ff23fb))
* **add:** ROB_200-001-0 ([#8671](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8671)) ([3fe7f91](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3fe7f91c9e8f6010fbf4df96251fe9e3b8083e2d))
* **add:** SR-ZG9070A-SS ([#8662](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8662)) ([6bcf334](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6bcf33454fffb79d0f2596eeffaa91616234dce7))
* **add:** ZG-303Z, ZG-302ZM ([#8670](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8670)) ([9760eb1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9760eb1e7841b6f84633a0cd7b11ae2712b4dd6f))
* Allow more precise control of Aqara DJT11LM sensitivity https://github.com/Koenkk/zigbee2mqtt/issues/3028 ([719f27f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/719f27f06a52851e1909ee18d7a14bf35b32718c))
* Improvements for LiXee ([#8673](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8673)) ([284e855](https://github.com/Koenkk/zigbee-herdsman-converters/commit/284e8557ac7bde72429daee2f168f89e0050d4cd))


### Bug Fixes

* **detect:** Detect `_TZ3210_iw0zkcu8` as `_TZ3210_iw0zkcu8` ([#8659](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8659)) ([b79bc94](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b79bc945d477ca118280537cb075798ea49cd5b9))
* **detect:** Detect `_TZE200_wtikaxzs` as Nous E6 ([#8574](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8574)) ([d95f3c9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d95f3c95ecbd7ebc5ad158b9dd501a6398b6653c))
* **detect:** Detect TS011F instead of BSD29_1 ([#8669](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8669)) ([b997ae4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b997ae4d7ae573a682ea1776eda84cd5329bdf72))
* Fixes for Namron Edge Thermostat ([#8672](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8672)) ([ad0bdf4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ad0bdf4f366abfa49cc373ceb13a335634b3d270))
* **ignore:** Forgoten FlipIndicator for Aqara WS-K07E, WS-K08E ([#8665](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8665)) ([4471082](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4471082e3040f3ca42c7cf80b3aa7eef9fe36ae4))

## [21.23.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.22.0...v21.23.0) (2025-01-22)


### Features

* **add:** WS-K07E, WS-K08E ([#8660](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8660)) ([9c3433f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9c3433f2237b0e4842ef984b37fbe494c17dcb40))
* **add:** ZWPM16 ([#8640](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8640)) ([21d0967](https://github.com/Koenkk/zigbee-herdsman-converters/commit/21d0967db03fcbabc039fa2c19223b6091d424a4))


### Bug Fixes

* **detect:** Detect `_TZE204_2imwyigp` as Tuya MG-ZG03W https://github.com/Koenkk/zigbee2mqtt/issues/20265 ([400fa2c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/400fa2c34d91b090c32dc2956ff17e376b89a98f))
* **detect:** Detect `af22cef59b2543d1be1dfab4f1c9c920` as ORVIBO DD10Z ([#8657](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8657)) ([14c4664](https://github.com/Koenkk/zigbee-herdsman-converters/commit/14c466491a9363fc06922381cd151ceef372232e))
* Support OTA for Namron 1402769 @IDmedia https://github.com/Koenkk/zigbee-OTA/pull/655 ([3d892ed](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3d892edcb684dda14467a360cc953d86df629530))

## [21.22.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.21.1...v21.22.0) (2025-01-20)


### Features

* **add:** 3RSP02065Z, 3RSP02064Z ([#8654](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8654)) ([a3c7bda](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a3c7bda5d37d104c7f9a3eb63193e5cbaff71dbc))
* **add:** SR-ZG9030F-PS ([#8652](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8652)) ([701acf4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/701acf41d9562243684431e5d76f473f24025fa9))


### Bug Fixes

* **detect:** Detect `_TZE284_iwn0gpzz` as Tuya SPM01V2.5 https://github.com/Koenkk/zigbee2mqtt/discussions/25891 ([15f15aa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/15f15aa151239c1d5af5d776449a6f8077d59da6))
* Fix CO2 value interpretation ([#8644](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8644)) ([8a70e68](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8a70e68fdcd3717a0acf66987ada4960fce4cb1f))
* **ignore:** Refactor Tuya fingerprint ([#8648](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8648)) ([f42aa50](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f42aa5080ee933e8cde9fc08c67a88bf886d71ff))
* **ignore:** update dependencies ([#8641](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8641)) ([5c0b54b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5c0b54b0b237c78bdc32f34bb6745a9ca5946c59))

## [21.21.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.21.0...v21.21.1) (2025-01-19)


### Bug Fixes

* Add missing actions for Philips Hue Tap (8718696743133) ([#8633](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8633)) ([7643376](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7643376580da97cdd31e2c4deee7672f402b2f99))
* **detect:** Detect `_TZE200_jkfbph7l` as AVATTO ME167 ([#8638](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8638)) ([6e09825](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6e098258b3879e4f0956171262294ca4ed0cc359))
* **detect:** Detect `_TZE204_g5xqosu7` as Tuya TS0601_cover_8 ([#8634](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8634)) ([ce1827e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ce1827ed29f2eafdf81f7187514051a0d2fab98d))
* **detect:** Detect `_TZE204_tgdnh7pw` as AVATTO ZDMS16-1 https://github.com/Koenkk/zigbee-herdsman-converters/issues/8639 ([db5c39b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/db5c39b459058d903ac6f96b47729c496f580250))
* **detect:** Detect `_TZE284_dhke3p9w` as FORIA F00YK04-18-1 https://github.com/Koenkk/zigbee-herdsman-converters/issues/8632 ([cdb1b50](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cdb1b50df2552594cd554dcd3226b8ed3a506d77))
* **ignore:** fix external definition generator ([dc858cf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dc858cf578174d24f3a97010c3eaecbc41e9fa09))

## [21.21.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.20.0...v21.21.0) (2025-01-17)


### Features

* **add:** AE-940K, AE-669K ([#8618](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8618)) ([357445c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/357445cdd2ccbddd3f5de6eefd16736a76ead65a))
* **add:** SR-ZG9060A-GS, SR-ZG9060B-CS, SR-ZG9050C-WS, SR-ZG9050B-WS ([#8620](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8620)) ([e15957a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e15957a49e383284a7d5565f467b5bbb47c74c76))


### Bug Fixes

* Add custom cluster for Wirenboard ([#8624](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8624)) ([058443c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/058443c48fd9d402fed9448f7257568a8fb653a8))
* **detect:** Detect `_TZE204_xalsoe3m` as Moes BHT-002-GCLZB ([#8628](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8628)) ([2196eba](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2196eba66b25b0c7d536ba4a420d7897a36c5a9b))
* Fix `data.substr is not a function` for Xiaomi A6121 https://github.com/Koenkk/zigbee2mqtt/issues/25491 ([58b4a87](https://github.com/Koenkk/zigbee-herdsman-converters/commit/58b4a87052ab38af6ef3f83e347aa374168bfb52))
* Fix no state reported for GL-SD-001P https://github.com/Koenkk/zigbee2mqtt/issues/23661 ([7b45348](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7b453485011f2e0c4a0cf2c59f9cfbc37d389bf9))
* **ignore:** Refactor modern extend imports ([#8613](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8613)) ([7fe7490](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7fe7490f637d405432853504f5901dd25a1c8230))
* **ignore:** Update ZG-205Z/A motion state values https://github.com/Koenkk/zigbee2mqtt/issues/25682 ([b9ab59d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b9ab59d6c447d9f18e6a6749301e6b456b1bd88c))
* Improve Imhotep Creation E-Ctrl integration ([#8625](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8625)) ([cce4d94](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cce4d94d9877783bc34d4a5da29fa55a77b44776))

## [21.20.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.19.0...v21.20.0) (2025-01-15)


### Features

* **add:** C-ZB-DM204 ([#8609](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8609)) ([ef7ac30](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ef7ac30befdfa980f139249ea62c8db7a985d9a5))
* Expose `uart_connection` and `uart_baud_rate` for WB-MSW-ZIGBEE v.4 ([#8616](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8616)) ([b33bc18](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b33bc18a0c9061f24edda3047e55d5775116ea4e))


### Bug Fixes

* Configure state reporting for Gledopto GL-SD-001 https://github.com/Koenkk/zigbee2mqtt/issues/23661 ([a5088d9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a5088d982f4705aefcf710c4b0fcb81e2563c0ef))
* **detect:** Detect `_TZE204_57hjqelq` as Roximo CRTZ01 ([#8607](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8607)) ([341f3ef](https://github.com/Koenkk/zigbee-herdsman-converters/commit/341f3efd3f0f03e88d032cf98e3321b146c477d7))
* **detect:** Detect `_TZE284_ne4pikwm` as Nedis ZBHTR20WT ([#8619](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8619)) ([502b3c3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/502b3c32863d2774c9a6e223a8f06012dbf8e22f))
* **detect:** Detect `_TZE284_ny94onlb` as Tuya SPM02V2.5 ([#8617](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8617)) ([7ce4846](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7ce48463f368b5102037e192238799072290b377))
* **detect:** Detect `_TZE284_xnbkhhdr` as Tuya ZWT198/ZWT100-BH ([#8614](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8614)) ([6ae4e45](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6ae4e4588a35c0af61bdedbe1f5df200a2664035))

## [21.19.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.18.0...v21.19.0) (2025-01-13)


### Features

* **add:** GWA1201_TWO_WAY_SWITCH ([#8601](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8601)) ([26b2a0e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/26b2a0ef4015686d255a123a1abd2750ad2c3aa1))
* **add:** SR-ZG2835RAC-UK ([#8602](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8602)) ([bae1461](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bae1461cbd3878f78a48d0fbe76ad54adbdf8645))


### Bug Fixes

* **detect:** Detect `_TZE204_2cyb66xl` as AVATTO ZDMS16-1 https://github.com/Koenkk/zigbee-herdsman-converters/pull/8436 ([50f1453](https://github.com/Koenkk/zigbee-herdsman-converters/commit/50f14531cb149cfe63eabe485eb4026a3415798c))
* Fix duplicate publish for some Tuya devics https://github.com/Koenkk/zigbee2mqtt/issues/25605 ([d7f9a3c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d7f9a3c1aeccd1cd3e912ebe07fa8b337fbcda3d))
* Fix Tuya ZG-227ZL batterty % https://github.com/Koenkk/zigbee2mqtt/issues/25581 ([ab83fc5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ab83fc5c791dc59f78b1fa596bb1fbf65ffbf8c4))

## [21.18.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.17.0...v21.18.0) (2025-01-12)


### Features

* Add `illuminance_raw` ([#8592](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8592)) ([3d98d3f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3d98d3f54bc63a720111f58194269250f5fb324a))
* **add:** 929003151601, 929003151701 ([#8598](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8598)) ([9193662](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9193662502a3eb32a56bf78ad6f0a5a41bf304b9))


### Bug Fixes

* Fix inverted `position` for Tuya TS0601_cover_3 ([#8595](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8595)) ([0b74e57](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0b74e5798955a52c9dbbbed84b1262825471cd70))
* **ignore:** Remove linkquality expose ([#8599](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8599)) ([f913273](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f913273750f220c680c1d66d4b64971443a7d161))

## [21.17.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.16.0...v21.17.0) (2025-01-12)


### Features

* **add:** Add thermostat endpoints to Ubisys H10 ([#8589](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8589)) ([05865e9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/05865e983e39ce03578a6bfdb40099dffe041537))


### Bug Fixes

* Add additional `motion_state` to Tuya ZG-205Z/A https://github.com/Koenkk/zigbee2mqtt/issues/25682 ([8b0ccfe](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8b0ccfe23ef88569e0d6edaf6941193f2e540c3b))
* **detect:** Detect `_TZ3000_v1w2k9dd` as Tuya ZY-ZTH02 ([#8591](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8591)) ([b2316dc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b2316dc792a0e8511cbc396c903ff165580d947f))
* **detect:** Detect `_TZE204_jygvp6fk` as Tuya TS0601_temperature_humidity_sensor_2 https://github.com/Koenkk/zigbee2mqtt/issues/25753 ([9605278](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9605278fd0603f744373bc5f56d6a015e5a320d2))
* **ignore:** update dependencies ([#8594](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8594)) ([38d3c7d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/38d3c7d66630dcba3aab1f76ecc248925445a2a1))
* MAZDA TR-M2Z Remove 'temperature' exposes ([#8593](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8593)) ([1875596](https://github.com/Koenkk/zigbee-herdsman-converters/commit/187559687cd8046417125806453319ac5605c18c))
* PRO-900Z: Removed `valve_state` and added climate `running_state` ([#8588](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8588)) ([e8b0a37](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e8b0a37195c2b330b5e531b7a7ffd55a3fa2bc0b))
* Rename `Avatto` to `AVATTO` https://github.com/Koenkk/zigbee2mqtt/discussions/25763 ([3e1ddcd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3e1ddcd94db6c72ee9370666398ddb08511c7e72))

## [21.16.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.15.0...v21.16.0) (2025-01-10)


### Features

* **add:** 2CT @JBLSteeve https://github.com/Koenkk/zigbee2mqtt/issues/25328 ([31d460e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/31d460ef9e527b2983602ee783479e50658a81c9))
* **add:** 501.39 ([#8582](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8582)) ([ace4a44](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ace4a44257d25a300f7a73185a14c4ca075eaf1e))
* **add:** RF 274 T ([#8585](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8585)) ([7b2fc3e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7b2fc3eb14cfe94c0e79cce54187b1446cd52683))


### Bug Fixes

* **detect:** Detect `_TZ3000_do6txrcw` as Tuya TS0222 ([#8584](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8584)) ([3cf6397](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3cf639703d4ff0e7e6a1e5f41019882d78692db4))
* **detect:** Detect `_TZE200_127x7wnl` as Moes ZTS-EUR-C ([#8586](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8586)) ([fb5bd37](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fb5bd372ccb8ed93391fdfb4a64fbf2ffb524bd7))
* **detect:** Detect `_TZE200_7shyddj3` as Tuya TS0601_cover_1 ([#8587](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8587)) ([72a6b9d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/72a6b9db3420df1d69f844019b4a4a8dc7506a3b))
* **detect:** Detect `_TZE200_clrdrnya` as Wenzhi WZ-M100 https://github.com/Koenkk/zigbee2mqtt/discussions/25712 ([a7ad848](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a7ad848859b9e98122b0bde5d45a7a1a7848327f))
* **detect:** Detect `_TZE204_a2jcoyuk` as Tuya TS0601_cover_1 https://github.com/Koenkk/zigbee2mqtt/issues/25429 ([52bd7f6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/52bd7f6e514b47b391eea33f50ed29bb0b37ff3b))
* Fix configure reporting failing for QBKG20LM https://github.com/Koenkk/zigbee2mqtt/issues/25674 ([c324f74](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c324f749ea3298fd7dc69c16c255a974b4b9022b))

## [21.15.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.14.0...v21.15.0) (2025-01-08)


### Features

* **add:** 929003667001 ([#8576](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8576)) ([5009796](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5009796f1c240de3ac2d59ff9302cb0577a5280b))
* **add:** ID200W-ZIGB ([#8564](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8564)) ([42a7417](https://github.com/Koenkk/zigbee-herdsman-converters/commit/42a7417b722a794bc49bb201d38ba21c87120da9))


### Bug Fixes

* **detect:** Detect `_TZE200_h2rctifa` as Tuya ZS-TYG3-SM-61Z ([#8573](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8573)) ([8f2e68a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8f2e68a427aa7b45e60d7b4b7bc8bf6182656cbf))
* **detect:** Detect `_TZE200_ybsqljjg` as AVATTO ME168 ([#8580](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8580)) ([6d6c058](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6d6c058f8f26b26114d00f09e943ba05d19573ba))
* **detect:** Detect `_TZE204_81yrt3lo` as Tuya PJ-1203A ([#8578](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8578)) ([234d683](https://github.com/Koenkk/zigbee-herdsman-converters/commit/234d683f23c4e69da8af6004e5260be76558d83f))
* **detect:** Detect `_TZE204_uo8qcagcn` as Tuya TS0601_gas_sensor_4 ([#8579](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8579)) ([7d90392](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7d90392060c4c6fda76088cea9824992425f2c81))
* Fix `Value: '4' not found in: [0, 1]` error for Aqara SRTS-A01 https://github.com/Koenkk/zigbee2mqtt/issues/25020 ([af9a81d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/af9a81dfb5a0a4014c1cfd0dd127275384eab284))
* Fix Aqara SRTS-A01 child lock https://github.com/Koenkk/zigbee2mqtt/issues/25561 ([a91d4e2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a91d4e25356e75920162af5440214322d65a7031))
* Fix Centralite 4257050-ZHAC to ignore 'transition' ([#8571](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8571)) ([86483ed](https://github.com/Koenkk/zigbee-herdsman-converters/commit/86483ed8a49b007d5eb78874b1c4009ddfe25ea4))
* Fix detect `TH01` as temperature sensor https://github.com/Koenkk/zigbee2mqtt/issues/25365 ([cc3956a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cc3956a9890930241ac4938e680f77ad936d047b))
* Fix missing `commandMoveHue` converter for OSRAM AC0251100NJ/AC0251600NJ/AC0251700NJ https://github.com/Koenkk/zigbee2mqtt/issues/25652 ([1a9cd8c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1a9cd8cccb1176ae26fb3dbe92f40f3f55375034))
* Fix Salus FC600 OTA ([#8572](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8572)) ([eccc950](https://github.com/Koenkk/zigbee-herdsman-converters/commit/eccc950f3154aa0edcaacfb0ff579597b4c52843))

## [21.14.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.13.0...v21.14.0) (2025-01-06)


### Features

* **add:** 511.020 ([#8567](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8567)) ([72f75b6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/72f75b61ab65242b70e3247cdf0bea09c59b6c1f))
* **add:** 929003823201 ([#8568](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8568)) ([ff52cc1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ff52cc16fc976d4570a78436b51a87bce3b9d399))


### Bug Fixes

* Add 550B1012 whitelabel  ([#8569](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8569)) ([bec15f2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bec15f2c43241bf10f71765c3a271ba9e0562a1f))
* **detect:** Detect `_TZ3000_x3ewpzyr` as Tuya XSH01A https://github.com/Koenkk/zigbee2mqtt/issues/23155 ([633b76c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/633b76c68ff1b68b96cd577f980bdda03a0ba0ca))
* Fix configure of some IKEA remotes failing https://github.com/Koenkk/zigbee2mqtt/discussions/25613 ([2e97241](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2e972417d72407a5a936ae4abd4864a47601a7bd))
* Fix no state reported for GL-SD-003P https://github.com/Koenkk/zigbee2mqtt/issues/23661 ([4560ac5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4560ac5adab11cc78b02ad092e9ff133d8a1e981))
* Fix ZWT198/ZWT100-BH preset modes ([#8565](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8565)) ([33b785a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/33b785a628589e07a42a9b8cfa3254cf56c20b3f))

## [21.13.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.12.0...v21.13.0) (2025-01-05)


### Features

* **add:** TS0726_3_gang ([#8563](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8563)) ([fcb6184](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fcb6184bffecffbd26713388a1a8b5c444a46d79))
* Expose battery % for Lutron Z3-1BRL https://github.com/Koenkk/zigbee2mqtt/issues/25361 ([4d72d7b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4d72d7bf1b984e8d3781748cd1893efe9d8f240f))


### Bug Fixes

* **detect:** Detect `_TZ3000_3ias4w4oz` as Nedis ZBPO130FWT ([#8552](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8552)) ([7e7e28a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7e7e28affbbd423bd5c6b1a20372c27cfc1066cc))
* **detect:** Detect `_TZ3000_jsfzkftc` as Tuya TS0001_power https://github.com/Koenkk/zigbee2mqtt/issues/25426 ([9ee4e02](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9ee4e02bb23fe60e731d1d1fd7e243c57466084f))
* **detect:** Detect `_TZE204_7bztmfm1` as Tuya TS0601_smart_CO_air_box ([#8559](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8559)) ([07a87da](https://github.com/Koenkk/zigbee-herdsman-converters/commit/07a87da72e71b6fe3327ff01318944296235b947))
* **detect:** Detect `_TZE204_tzreobvu` as Tuya TOQCB2-80 ([#8562](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8562)) ([18a95b7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/18a95b73f166670618d2680adc29a870cd484546))
* **detect:** Detect `_TZE284_rccxox8pz` as Tuya PA-44Z ([#8558](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8558)) ([6f44769](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6f4476944b3c3a252cbb4771fa89b6e789d3223f))
* **detect:** Detect `TH01` as Zbeacon TH01 https://github.com/Koenkk/zigbee2mqtt/issues/25365 ([576ec47](https://github.com/Koenkk/zigbee-herdsman-converters/commit/576ec476a91f96884fe7d05ec8b240e1d9354c07))
* Fix duplicated Tuya vendor  ([#8557](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8557)) ([d031c2b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d031c2b49d27d450e37e830eef82dd55be08842b))
* Increase BRT-100-TRV step accuracy ([#8561](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8561)) ([bdbd922](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bdbd922e39f19e4103b210ea46ed522d5cac42ea))

## [21.12.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.11.0...v21.12.0) (2025-01-03)


### Features

* Add preset for Salus FC600 ([#8551](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8551)) ([c45179c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c45179c1e7c82731f46c33f84c340f03522130fe))
* **add:** 050-0511558F ([#8549](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8549)) ([897380f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/897380fca445f24a1716795cbcf8e3529a6407f0))
* **add:** D692-ZG ([#8534](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8534)) ([d65fcf7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d65fcf7963e2dec53fb507f8d75cae3c5ea0855d))
* **add:** MTD085-ZB ([#8490](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8490)) ([35f89fb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/35f89fb594c4d12ca7ec058e009346a4ac7d8301))
* **add:** MTR500E-UP, MTR1300E-UP, MTR2000E-UP, MTV300E-UP, MVR500E-UP, E2BP-UP, E4BP-UP, TLC1-UP, TLC2-UP, TLC4-UP, TLC8-UP, TLM1-UP, TLM2-UP, TLM4-UP, GALET4-UP ([#8537](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8537)) ([099eb66](https://github.com/Koenkk/zigbee-herdsman-converters/commit/099eb666505c4f8796c3ba0d4e5277201610c3b6))
* Implement PowerOnBehaviour for Aqara T1M lamp (CL-L02D) ([#8550](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8550)) ([e2ae7d6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e2ae7d685ced88b7a1cfa42a785175e49a71f37c))


### Bug Fixes

* Add endpoint capability to lock type ([#8529](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8529)) ([8f0f023](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8f0f023df4d10477aed23e1b16c335a2d3c9d38a))
* **detect:** Detect `FLS-PP3\u0000` as Mega23M12 https://github.com/Koenkk/zigbee2mqtt/issues/25382 ([5be3337](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5be3337374c8ee4120966e8cb30b8a80f624391f))
* Fix configure failure for Datek HSE2905E ([#8546](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8546)) ([979ac52](https://github.com/Koenkk/zigbee-herdsman-converters/commit/979ac527def1e8a5e443004dd2bbffd80aebc019))
* **ignore:** update dependencies ([#8555](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8555)) ([6214cc0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6214cc084e5137528ec328b23205e2b2d9b0f0e0))

## [21.11.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.10.0...v21.11.0) (2024-12-30)


### Features

* **add:** 050-0131558M, 050-1212558H ([#8523](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8523)) ([042c4bc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/042c4bc731ab549fd11ac2b29517f2e9d4c5b431))
* **add:** FC600 ([#8528](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8528)) ([54d802e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/54d802eb41f1635a066d868604f8ebfefae0d434))
* **add:** ROB_200-081-0 ([#8539](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8539)) ([867d9a4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/867d9a4380017e43328907bab3630d53e0faf300))
* **add:** SR-ZG2835RAC-NK4 ([#8540](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8540)) ([484ade6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/484ade6ee994da1f20e8025e5898edb957c16be8))
* **add:** SR-ZG2836D5 ([#8541](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8541)) ([0062a4f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0062a4f04f9fb8d0d14493a890e1d58cddbee7da))
* **add:** TH01 https://github.com/Koenkk/zigbee2mqtt/issues/25365 ([c5041a2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c5041a2ea4cc6b1b21c0060790b06ba76eec55b2))
* **add:** TR-M3Z ([#8542](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8542)) ([e5c89cb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e5c89cbf16430bc36fd71896aca54cccd5743e6a))


### Bug Fixes

* **detect:** Detect `_TZE284_locansqn` as Nous SZ-T04 ([#8536](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8536)) ([23b81a3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/23b81a3a365d4b6be94d97962d27ba164a0ae2c7))
* **detect:** Detect `RBSH-SWD2-ZB` as Bosch BSEN-C2 ([#8530](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8530)) ([bcfb7f7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bcfb7f728969e804c06e48a5c555250ba50afe1d))
* Fix read pilot wire mode for Nodon and Equation modules ([#8535](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8535)) ([6c75e42](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6c75e42ac377957f5ca660697c16daa541a7ecb4))
* **ignore:** update dependencies ([#8531](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8531)) ([786c59b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/786c59b5d7d0b9f1b1022b8919455a205d20b9d5))
* Update zigbee-herdsman and use new exports ([#8527](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8527)) ([b8a076e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b8a076e30515399ba2f1caaa38cf93d51b2e073a))

## [21.10.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.9.2...v21.10.0) (2024-12-28)


### Features

* **add:** SR-ZG9002K16-Pro ([#8515](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8515)) ([c844888](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c844888118c02147c86fa744600a1db38336c734))
* **add:** SR-ZG9033TH ([#8522](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8522)) ([929baa0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/929baa0cfce372940eb13498ccab41e4aecab177))


### Bug Fixes

* **detect:** Detect `MHO-C401-z` and `MHO-C401-bz` as Xiaomi LYWSD03MMC-z ([#8520](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8520)) ([a8c1978](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a8c19780160a0cf981df9f158ebccb3b01d44c1c))
* Fix configure failing of SONOFF SNZB-06P ([#8521](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8521)) ([8c63663](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8c63663e6fed067c44208e59f4dbcc1166c11502))
* Increase TS0601_thermostat_3 schedule transitions from 4 to 6 ([#8524](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8524)) ([20c0958](https://github.com/Koenkk/zigbee-herdsman-converters/commit/20c0958f6e99343040b334898de494fb97f18aa8))

## [21.9.2](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.9.1...v21.9.2) (2024-12-25)


### Bug Fixes

* **ignore:** fix `_colorTempRangeProvided` added to exposes ([53830e7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/53830e71fe3f5b3e407b34cb93f76ac529e9f8e0))

## [21.9.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.9.0...v21.9.1) (2024-12-24)


### Bug Fixes

* **ignore:** fix build ([653e698](https://github.com/Koenkk/zigbee-herdsman-converters/commit/653e698bfd57d0a465a6326d1cf97a9204d4acd0))
* **ignore:** fix build ([562915b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/562915b279935188e8404c4aa9b82de64fc054d5))
* **ignore:** improve build ([7330742](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7330742bde70c7020652aa2f8f70090f04ca978a))

## [21.9.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.8.0...v21.9.0) (2024-12-24)


### Features

* **add:** _TZE200_i48qyn9s ([#8505](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8505)) ([3fccb35](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3fccb35678736750b8ee1511fbf200d4afc4cf2b))
* **add:** 3RDP01072Z ([#8494](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8494)) ([223fad4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/223fad439e83893e0956688c822dda83d46210cf))
* **add:** 929003823101, 929003822701 https://github.com/Koenkk/zigbee2mqtt/issues/25305 ([5210be7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5210be7d2c45c4d781ee42f4c6cc34b671341ca4))
* **add:** CK-MG22-JLDJ-01(7015), MYRX25Z-1, AM25B-1-25-ES-E-Z ([#8510](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8510)) ([c146ce8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c146ce80802eb0aa6fe2f3292279acd73aa36c70))
* **add:** SR-ZG9030A-MW ([#8509](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8509)) ([0a714e0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0a714e0a2172222a67c616c2b3799334717d04f8))
* **add:** Z111PL0H-1JX ([#8503](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8503)) ([feaf578](https://github.com/Koenkk/zigbee-herdsman-converters/commit/feaf578fa776a03e09d96149b3c00d09a390b83a))
* Use Vitest for testing ([#8507](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8507)) ([6d740d7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6d740d7e1b15cdb5a881ef9b69914fe2650e4117))


### Bug Fixes

* Fix MAZDA MZV-T1Z `system_mode` ([#8487](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8487)) ([0f85431](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0f85431313291d5fe3cf07819ce211bd79fc893a))
* Fix mode enum values for TRV603 ([#8512](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8512)) ([ead17e1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ead17e18f26e824305face85c8b5338de11a7937))
* Fix Tuya TS011F_2_gang_power gangs not controlled individually https://github.com/Koenkk/zigbee2mqtt/issues/23402 ([9713bfc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9713bfc592ede1babdcb0e46ec570d9860a34806))
* **ignore:** Nedis thermostat model number typo correction ([#8508](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8508)) ([019479b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/019479b677485cfb5fcadf261e8adcd4b7f33a18))
* Improve TRV602Z integration ([#8502](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8502)) ([9bb99f0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9bb99f0c972c5a339c846ac966bf2739d591fe42))

## [21.8.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.7.0...v21.8.0) (2024-12-22)


### Features

* **add:** 9290035842 https://github.com/Koenkk/zigbee2mqtt/issues/25290 ([fbe8d70](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fbe8d70a9513110c30da5ee530d702e7123d923d))
* **add:** ZBTHR20WT ([#8504](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8504)) ([163c429](https://github.com/Koenkk/zigbee-herdsman-converters/commit/163c42937c92cf53ec4b9880f9014b5742cfe3c2))


### Bug Fixes

* Added references to Legrand 199142 (same as 064888) and BTicino 3577C (same as Legrand 067694) ([#7823](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7823)) ([0615d3c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0615d3c9a0b44a5660d74745f29d9cb95c49c4a2))
* **detect:** Detect `ROB_200-040-0` as SR-ZG9092A https://github.com/Koenkk/zigbee2mqtt/issues/25281 ([6f8ab95](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6f8ab959be503c6a65e8040db592b439eb0d925a))
* Fix Tuya TS011F_2_gang_power not controllable https://github.com/Koenkk/zigbee2mqtt/issues/23402 ([5140e0d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5140e0deb81ec35b03cf7c93edc51160ed2fff0c))

## [21.7.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.6.0...v21.7.0) (2024-12-21)


### Features

* **add:** 4512758 ([#8497](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8497)) ([38eea59](https://github.com/Koenkk/zigbee-herdsman-converters/commit/38eea599f895bccba7c884f68a72e2e061f27e52))
* **add:** 929002297503 ([#8498](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8498)) ([102df3a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/102df3aae24bfb144342ec5ca0c6ba56b47aa206))
* **add:** PO-BOCO-ELEC ([#8489](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8489)) ([8f313c3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8f313c3643b07fbba2d7a2e7447293590ee0f7e7))
* ota and power on for Innr AE 270 T ([#8493](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8493)) ([c7fde7c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c7fde7c1850199192f032d376b7645a50fd8d8ff))


### Bug Fixes

* Correct `929003817002` `zigbeeModel` ([#8499](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8499)) ([678064a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/678064abd63b77db93180ac424bf68218587a9f0))
* **detect:** Detect `_TZE284_rjxqso4a` as Moes ZC-HM ([#8496](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8496)) ([caebbc2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/caebbc2512a6be08abe0e3ee26743abe7c3f4ab2))
* Fix incorrect `color_mode` after pairing device https://github.com/Koenkk/zigbee2mqtt/issues/25193 ([b48b948](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b48b948914c662477febf2a55830017dac1216b4))
* Fix Tuya ZG-227ZL battery % ([#8491](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8491)) ([3e2bd0e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3e2bd0e0c66bad9f1f89b2439662d1949b7b2c1d))
* Support hs color for LED2109G6 https://github.com/Koenkk/zigbee2mqtt.io/pull/3344 ([1c315a8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1c315a82794e45b0df5962d67e0eac66d0ea47c8))

## [21.6.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.5.0...v21.6.0) (2024-12-17)


### Features

* Add supported effects to Hue Gradient Tube Large ([#8483](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8483)) ([0e3e33a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0e3e33a770a2c8f388c5747492f534eaea309ebc))
* **add:** 4512788 ([#8488](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8488)) ([3a7c23f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3a7c23f33b707fbcbfb92ca9d774461cadbaae2b))
* **add:** 8719514419155 https://github.com/Koenkk/zigbee2mqtt/issues/25230 ([e34f35c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e34f35cfc3d1a180bc741c012e0b8da7ef20b63d))
* **add:** 929003822801 ([#8485](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8485)) ([0214e48](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0214e48369bcc93c55faa1494197a85e664f1c25))
* **add:** GL-D-008P ([#8486](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8486)) ([83615e6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/83615e64263b818bd0db11d98849f830f1d730a1))
* **add:** TS0726_2_gang https://github.com/Koenkk/zigbee2mqtt/issues/25180 ([6049904](https://github.com/Koenkk/zigbee-herdsman-converters/commit/60499040155a04a7db608cbce3f425472068fadb))
* **add:** ZSS-QY-WL-C-MS https://github.com/Koenkk/zigbee2mqtt/issues/25238 ([425b994](https://github.com/Koenkk/zigbee-herdsman-converters/commit/425b99412a1344fb6ac4b677bb474cbc7e319ea4))


### Bug Fixes

* ELKO: Resolve order of magnitude issue with floor_temp ([#8482](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8482)) ([460d07b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/460d07b43998a3bc0438f845f438683082115657))

## [21.5.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.4.0...v21.5.0) (2024-12-15)


### Features

* **add:** ZBDS10WT https://github.com/Koenkk/zigbee2mqtt/issues/23607 ([7a6fc6f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7a6fc6f0214d4dd531df7173c7b46deef12164e5))


### Bug Fixes

* Add occupancy timeout for Tuya IH012-RT01/ZMS-102 ([#8333](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8333)) ([7a14d5b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7a14d5b044b5047ae50dcd1726a40d9241c086a5))
* Danfoss: Update time regularly to account for loss and drift ([#8479](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8479)) ([fdde721](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fdde7217a1e7350b7b4b482ca393e0d8ac81f9b4))
* **detect:** Detect `_TZ3000_hojntt34` as Nous L13Z https://github.com/Koenkk/zigbee2mqtt/discussions/25201 ([246002e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/246002e06f67d271649020bd49e7e8474f67cb5d))
* **detect:** Detect `_TZE200_p3dbf6qs` as AVATTO ME167 https://github.com/Koenkk/zigbee-herdsman-converters/issues/8474 ([3b081b7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3b081b742fd3c81eef34efe9b369f6e8d30464b7))
* **detect:** Detect `_TZE204_3ejwxpmu` as Tuya TS0601_temperature_humidity_co2_sensor ([#8478](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8478)) ([fdca712](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fdca7126b7744964b201d3023ee8a40516b2d9d4))
* Disable unsupported power on behaviour for Cando C202.1 https://github.com/Koenkk/zigbee2mqtt/issues/24328 ([6e822be](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6e822be6f389f5d16050c806904801bb3af1f4c2))
* Fix inverted `state` on Tuya motorized blinds ([#8481](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8481)) ([6ed8eb3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6ed8eb3e948d394148025e5090690b5d128b88b8))
* **ignore:** update dependencies ([#8480](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8480)) ([3da7ee6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3da7ee69d41dc687c15220ef8f8466f2f11e0f30))

## [21.4.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.3.0...v21.4.0) (2024-12-13)


### Features

* Add `network_indicator` to SONOFF ZBMINIR2 ([#8470](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8470)) ([cd310fb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cd310fb0521c9a81bfab3f5fd7111da83c31d5da))
* Add switch scene support for the Miboxer FUT089Z remote ([#8475](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8475)) ([86b1c71](https://github.com/Koenkk/zigbee-herdsman-converters/commit/86b1c71164c755929ac395c97cc2c4430f0c1504))
* **add:** PJ3201A ([#8421](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8421)) ([2fced63](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2fced638f5a58cee2325d5248797c5cea8fd8fb3))
* **add:** Powerswitch-ZK(W) ([#8460](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8460)) ([a291886](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a291886566ce85c92c2fe757ed4bf1c612356a13))
* **add:** VZM30-SN ([#8469](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8469)) ([ccb2165](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ccb2165a8eeae487607339c8af6c5d8fc7e80824))


### Bug Fixes

* Add hs support for IKEA LED2111G6 https://github.com/Koenkk/zigbee2mqtt.io/pull/3324 ([1d3883a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1d3883a0929270f50227f67c23eddb48f53f932b))
* Danfoss eTRV - timestatus should be set to 1 when setting time ([#8473](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8473)) ([e726a8f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e726a8fff1a9ebaa165fb672b18e61903ed5f830))
* **detect:** Detect `_TZ3000_l6rsaipj` as Tuya TS0222_light ([#8472](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8472)) ([6cc4c86](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6cc4c863a2aa2aec36de47519fc4b17462eb3ce6))
* **detect:** Detect `_TZ3000_shopg9ss` as Tuya TS0207_repeater https://github.com/Koenkk/zigbee2mqtt/issues/25150 ([49be0f2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/49be0f25d1161db867d11aac3045a4357c9cf983))
* **detect:** Detect `_TZE204_p1qrtljn` as TECH VNTH-T2 ([#8461](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8461)) ([2e4b3b0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2e4b3b0ac559cba174673fb9e69b3169d9b327a2))
* **detect:** Detect `_TZE204_z7a2jmyy` as Neo NAS-WV03B https://github.com/Koenkk/zigbee2mqtt/issues/22813 ([989f2d9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/989f2d91a4c3328d6eb90d254593bb7a4b6b76ca))
* **detect:** Detect `TRADFRI bulb E17 CWS globe 810lm` as IKEA LED2111G6 ([#8468](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8468)) ([7c85824](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7c85824a122aacd2e8ce49bf0e73f4c07d61e683))
* Fix Giex GX03 battery value ([#8464](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8464)) ([ea9f815](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ea9f81597f6863d41a55f36653cc7f17fb2c9abb))
* Fix ZNQBKG26LM not supported power_outage_memory and led_disabled_night ([#8466](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8466)) ([e27d004](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e27d004bc371113c454402bfd03d5123e423649a))
* Minor SNZB-03P documentation fix ([#8467](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8467)) ([9f17ff9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9f17ff9a3f57e29b7bd4b22a757ed618fccccf55))
* Update 3r virate xyz axis ([#8462](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8462)) ([6e3c0e3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6e3c0e3ed47184800542509227db3d518cf471dc))

## [21.3.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.2.1...v21.3.0) (2024-12-09)


### Features

* **add:** 014G2480 ([#8442](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8442)) ([8ea8466](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8ea8466239da90137747efb45dd50a16e909209e))
* **add:** AE 270 T-2 ([#8458](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8458)) ([50ac7b5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/50ac7b575990a380735ce1e1e3832c8c7b95661a))
* **add:** E3-ZR ([#8451](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8451)) ([7aea893](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7aea893bfc7391a89b9e8383c5877b059e6817fa))
* **add:** GX04, GX03 ([#8383](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8383)) ([fcd5cf7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fcd5cf77df3b0b07c039b840f3faa6c70d0dba04))
* **add:** NHMOTION/UNIDIM/1 ([#8187](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8187)) ([e356332](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e356332c4d4df8ac3ad56dcf57c6d397551f02f7))
* **add:** RDM-35274001 ([#8445](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8445)) ([00ed002](https://github.com/Koenkk/zigbee-herdsman-converters/commit/00ed002588706b8bcb20f84681ff51dc0df098cc))
* **add:** RTE 77.001B ([#8444](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8444)) ([92b2d55](https://github.com/Koenkk/zigbee-herdsman-converters/commit/92b2d551cc6e9ddf304bfffbe3e87c8b28ecd402))
* **add:** S520619 ([#8452](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8452)) ([fe08be8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fe08be8e1ae85ed98046fe5abe7728bfc486126d))
* **add:** Silabs series 2 router ([#8456](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8456)) ([c4f3807](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c4f38074b789e8541c3a1952230946af05afaa66))
* **add:** TR-M2Z ([#8417](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8417)) ([c86175b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c86175b976372cd1707f3a5d721d3c628e3f3051))
* **add:** TRV603-WZ ([#8443](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8443)) ([a59fca8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a59fca865a3e024aaa844e5c6722aa3d9f21a520))
* **add:** TRV801Z ([#8453](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8453)) ([d881fe9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d881fe96ab0e569d0e24200a2c7ff090011c3b8d))
* **add:** TS0505 ([#8425](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8425)) ([d9978b2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d9978b2c7cdf0791ff8a8c2c23e4aab3c11b9c04))


### Bug Fixes

* Add modern extend for 'text' converter ([#7846](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7846)) ([1fb99be](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1fb99be47261177d1f44be72cb89226f777ae499))
* Amina S boolean values ([#8440](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8440)) ([7c89566](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7c895668fde39734e0faa61f29bd324e7673837f))
* **detect:** Detect `_TZE200_9mjy74mp` as Moes TRV801 https://github.com/Koenkk/zigbee-herdsman-converters/pull/8418 ([e7ba34b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e7ba34bea6c022ec41acc8e1841effd233ae877a))
* **detect:** Detect `_TZE204_nqqylykc` as Avatto ZDMS16-1 ([#8436](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8436)) ([60d22c5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/60d22c5bc62f3785f32b6d4ba74afe2470aa916a))
* **detect:** Detect `_TZE284_ap9owrsa` as Tuya TS0601_soil_3  ([#8447](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8447)) ([d5d498d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d5d498d176ad74a2b92bea0bfda2a665c3329f06))
* **detect:** Detect `0x0200` as Danfoss Icon ([#8457](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8457)) ([4502db9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4502db97cc97a934c51277b28d0354f76f85c875))
* **detect:** Detect `HK-SENSOR-SMO` as HEIMAN HS1SA ([#8459](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8459)) ([da0db21](https://github.com/Koenkk/zigbee-herdsman-converters/commit/da0db21df96be0b022d3ffbcabee5f3c7a6cd719))
* Fix bug in tuyaModernExtend ([#8435](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8435)) ([36f5592](https://github.com/Koenkk/zigbee-herdsman-converters/commit/36f55928f91e6a0925d54d2b6b15bef80d7bda92))
* Fix description of Livarno Home HG06104A ([#8454](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8454)) ([bd2f02d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bd2f02db6d2efc520bdd81daa08e027b3cdced76))
* Fix Tuya TS0601_soil_3 battery % ([#8449](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8449)) ([656623f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/656623fa8ba22cf4b1e0290368d82b52a9e0139f))
* Fix Tuya ZWT198/ZWT100-BH `preset` ([#8446](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8446)) ([a471a49](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a471a497af4d4bbbe40e510aa005a550412214b8))
* **ignore:** `deviceLogString` not called properly ([#8441](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8441)) ([3807b3d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3807b3dc2bf3ba6ac78c39b765b280a465f95c2a))
* **ignore:** Fix MAZDA TR-M2Z Get system mode with preset enabled ([#8439](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8439)) ([764c7a7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/764c7a757889bf860525335b570cb34217486c2c))
* **ignore:** update dependencies ([#8455](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8455)) ([c6f6bef](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c6f6befd0a14bbd8851eb7e3d59205a1fdbcb4d6))
* Improve PJ-ZGD01 integration ([#8448](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8448)) ([5cce0fc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5cce0fcaee828f67290254347bc880b302e266f3))
* Rename `HG06492B` to `HG06492B/HG08130B` ([#8450](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8450)) ([505fed7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/505fed7c3585c7b0ab271304774f73f512296ff6))
* Update 3r Vibration sensor xyz axis ([#8434](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8434)) ([d8c660c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d8c660c1893c72cc9d6d7960c3439937a3f5e268))

## [21.2.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.2.0...v21.2.1) (2024-12-03)


### Bug Fixes

* **ignore:** fix X701A ([c1d8c3c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c1d8c3c218f67523903a234f3afd4a286144eb6a))

## [21.2.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.1.0...v21.2.0) (2024-12-03)


### Features

* **add:** DR3000 ([#8424](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8424)) ([2d41a04](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2d41a04a7a1c5ca97063cc438a25571c0589b764))
* **add:** RF 271 T, RF 273 T ([#8429](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8429)) ([b636059](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b636059240de84c2333f9efb455db77bbdc37ba6))
* Improvement to W599001 Smoke Alarm ([#8393](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8393)) ([098daba](https://github.com/Koenkk/zigbee-herdsman-converters/commit/098daba7caba5af3b55a3d305c7b699398804714))


### Bug Fixes

* add SR-ZG9002KR12-Pro SR-ZG9002KR12-Pro configure and use extend instead only fromZigbee ([#8427](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8427)) ([0ce8cd8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0ce8cd8e24f00e927ab97abc6dee7276a7706828))
* **detect:** Detect `_TZE204_wktrysab` as Tuya TS0601_switch_8 ([#8423](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8423)) ([9ea3f04](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9ea3f04efe41648ca0aaa16af4255f5f13b3f918))
* **detect:** Detect `_TZE284_hecsejsb` as Tongou TOWSMR1 https://github.com/Koenkk/zigbee-herdsman-converters/pull/8426 ([8411b28](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8411b28f51b4cf0300104e56a0542461d37fb7ec))
* **detect:** Detect `929003810001_01` and `929003810001_02` as 5063230P7 ([#8430](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8430)) ([dbf7869](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dbf7869eae6a2283ff13b00f12c19eab354e56db))
* **detect:** Detect `LCL007` as Philips 8718699703424 ([#8432](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8432)) ([e2c5da5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e2c5da54acf7d7847d21b7faa68930a374330a93))
* Fix `Handling of poll check-in failed` for Tuya TS0203 https://github.com/Koenkk/zigbee2mqtt/issues/24938 ([286d454](https://github.com/Koenkk/zigbee-herdsman-converters/commit/286d45497aa81952bde2779498673ba66b6e7466))
* Fix some Third Reality devices bugs ([#8428](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8428)) ([8528633](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8528633662cb6149c3c5534d0a2eb205deb4e7c8))

## [21.1.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v21.0.0...v21.1.0) (2024-12-02)


### Features

* **add:** A6Z https://github.com/Koenkk/zigbee2mqtt/issues/24967 ([b7877b7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b7877b7d0b10f64a827e19801d39a4b021043dd3))
* **add:** TRV801 ([#8415](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8415)) ([7fb34d9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7fb34d9b1485ea436486be96ba68284b4653299c))
* **add:** WT-1 ([#8422](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8422)) ([068658f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/068658f3cef2bf37e3ca8bfd668823ad5d4b15f8))
* **add:** X701A ([#8156](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8156)) ([5478391](https://github.com/Koenkk/zigbee-herdsman-converters/commit/547839101d21dcf48b4404c30b7d1f0003609051))


### Bug Fixes

* Add new transitionCount parameter on thermostatScheduleDayMultiDP ([#8414](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8414)) ([9bf46b4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9bf46b41ccc190860f5128f81a17264fac58d386))
* Change endpoint for Yandex switches ([#8420](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8420)) ([f648f16](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f648f161fe94c3c5e2ebfc2d02a5c3c3e065c62e))
* **detect:** Detect `_TZE284_kobbcyum` as Tongou TOWSMR1 https://github.com/Koenkk/zigbee2mqtt/issues/24516 ([8eb499f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8eb499fd6f83548fdad5b88a6cd9678d38935740))
* Fix `LGT002` and `LGT003` not marked as supported https://github.com/Koenkk/zigbee2mqtt/issues/24965 ([e58aead](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e58aead21b686d3f4c53f7477ac5d2c1bf168aa2))
* Fix the temperature compensation issue of 'HHST001' and add blind spot temperature function ([#8419](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8419)) ([26aa30d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/26aa30d7b1a766a7c42bf0ca354e4022e33c3964))

## [21.0.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.58.0...v21.0.0) (2024-12-01)


### ⚠ BREAKING CHANGES

* Busch-Jaeger 6735/6736/6737: Don't expose legacy payload anymore ([#8380](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8380))
* Busch-Jaeger 6735/6736/6737: Drop deprecated switch state ([#8362](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8362))
* Remove `illuminance_lux` ([#8304](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8304))
* Remove legacy ([#8291](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8291))
* Renamed occupancy to presence for Tuya ZY-M100-24G https://github.com/Koenkk/zigbee-herdsman-converters/pull/8229
* Rework OTA (add downgrade capability) ([#8273](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8273))
* Cleanup `child_lock` ([#8219](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8219))
* Remove `readAfterWriteTime` ([#8089](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8089))

### Features

* Remove legacy ([#8291](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8291)) ([edf43be](https://github.com/Koenkk/zigbee-herdsman-converters/commit/edf43be9383362e03993a1578830929c785c1782))
* Rework OTA (add downgrade capability) ([#8273](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8273)) ([25a36b9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/25a36b9ba241622465cdb78174a47bac678cb406))
* Support live loading of external converters ([#8332](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8332)) ([52f1736](https://github.com/Koenkk/zigbee-herdsman-converters/commit/52f173693bae355ebfe02f6a60188b2dccec09e0))


### Bug Fixes

* Busch-Jaeger 6735/6736/6737: Don't expose legacy payload anymore ([#8380](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8380)) ([633f19b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/633f19bf91f7032634c187f39662fbbc09ae2e95))
* Busch-Jaeger 6735/6736/6737: Drop deprecated switch state ([#8362](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8362)) ([088f6e7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/088f6e78c1550cf89d5cd85f5ef8401a165bf0e0))
* Cleanup `child_lock` ([#8219](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8219)) ([16fb435](https://github.com/Koenkk/zigbee-herdsman-converters/commit/16fb43522b919fa7c33995ef142de78e6e80ee6f))
* **ignore:** Add test case to check expose property uniqueness ([3c273b9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3c273b95a6256de4b9fa133a87def98f5b5023d6))
* **ignore:** bump zh ([0b931e9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0b931e908987bf1fa8924d658955ea67db44f0c5))
* **ignore:** some small fixes ([6022d92](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6022d9255322e9f10427b556bf93a5680b7ab830))
* **ignore:** Update dependencies ([#8406](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8406)) ([6ad5f7b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6ad5f7b966b69db072ab757cace2bdb48fcf3739))
* **ignore:** update dependencies ([#8413](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8413)) ([50553f1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/50553f139b74fbeef9a9a36061bc8094a8204d8c))
* Remove `illuminance_lux` ([#8304](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8304)) ([56232c0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/56232c0c3ccc4d4468ed3086d0911c230a583a72))
* Remove `readAfterWriteTime` ([#8089](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8089)) ([b870303](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b870303f90a47e36b6b5e7c254e5bc97efdc9c88))
* Renamed occupancy to presence for Tuya ZY-M100-24G https://github.com/Koenkk/zigbee-herdsman-converters/pull/8229 ([9aa788a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9aa788ad3594f9b6617873e20342636af5aa0995))

## [20.58.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.57.0...v20.58.0) (2024-12-01)


### Features

* Add inverted modes for POK008 ([#8404](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8404)) ([e31a859](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e31a859e0086ad885a946af00c2e10d96739d7ab))


### Bug Fixes

* **detect:** Detect `_TZ3000_zl1kmjqx` as Tuya IH-K009 ([#8407](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8407)) ([39eef27](https://github.com/Koenkk/zigbee-herdsman-converters/commit/39eef279871ce94cb3444141c56dab7e96299cd4))
* Fix Philips Hue gradient color encoding ([#8409](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8409)) ([3308b50](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3308b5034f7fd1aac3e56822e30578c6e7b48dfe))
* Poll interval battery fix for Smarthings Multipurpose Sensor 2018 ([#8408](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8408)) ([33da00c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/33da00cbe1e631a1c8323dd31e92d15a37c9796f))

## [20.57.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.56.0...v20.57.0) (2024-11-30)


### Features

* **add:** 929003711401 https://github.com/Koenkk/zigbee2mqtt/issues/24965 ([8e3ed7c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8e3ed7c41eaa4d008d7c459ee98c8353b96423bc))
* **add:** Push_ME ([#8399](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8399)) ([91d4798](https://github.com/Koenkk/zigbee-herdsman-converters/commit/91d479850bc8901072fd23cd46686153d08c6f86))


### Bug Fixes

* **detect:** Detect `_TZ3000_9r5jaajv` as Tuya TS0215A_sos ([#8397](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8397)) ([6fd1c15](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6fd1c15f98fdc454392603abfac155f17bfc2af5))
* **detect:** Detect `_TZE200_lrznf59v` as Brennenstuhl HT CZ 01 https://github.com/Koenkk/zigbee2mqtt/issues/24942 ([6636ec5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6636ec57fc1121beddff6c9a55d0fd01367d4288))
* **detect:** Detect `_TZE200_zppcgbdj` as Nous E6 ([#8405](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8405)) ([839d8cd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/839d8cd2c4aabc5971751b85ef9005a550c33e74))

## [20.56.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.55.0...v20.56.0) (2024-11-28)


### Features

* Add SR-ZG9002KR12-Pro expose and add ZG9380A zigbeeModel for SR-ZG9042MP ([#8388](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8388)) ([f482272](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f482272ff1aff08da904e6028a93cf7df77d29e6))
* **add:** SR-ZG2836D5-Pro ([#8392](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8392)) ([2d229ff](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2d229ffdae8f31c9dc1825ffa1ee4940d9cd029c))

## [20.55.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.54.0...v20.55.0) (2024-11-27)


### Features

* Expose `test` for W599001 ([#8382](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8382)) ([d68f0dd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d68f0dd98cbadf8bafdc0216bc10705599b8e53a))


### Bug Fixes

* eWelink: fix some device detections ([#8385](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8385)) ([164654d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/164654dacffb6ed02521c83f320d690a62e1245c))
* Fix `window` `CLOSE` value for Tuya TS0601_thermostat_1 ([#8389](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8389)) ([144753e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/144753ef153ece87f1b758fe0bc58f4ee299416c))
* Fix battery % multiplied by two for ROB_200-008-0 https://github.com/Koenkk/zigbee2mqtt/issues/24930 ([6bd889b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6bd889bb6e87d5568e56fa36441345b001424fe4))
* Fix setting schedule for some Tuya thermostats when no `working_day` has been set yet ([#8386](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8386)) ([a7517c4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a7517c4186be8f68eeef76db1499bd8d23f6c662))

## [20.54.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.53.0...v20.54.0) (2024-11-25)


### Features

* Add switch type to TS110E_2gang_2 ([#8379](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8379)) ([2488b72](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2488b72ee503d01c83ee583741e3b160b516b04b))
* **add:** S901D-ZG ([#8370](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8370)) ([1e8cf70](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1e8cf70686c2a36b2e457f07e7e7cd054f622fe8))
* **add:** TOWSMR1 ([#8364](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8364)) ([213e201](https://github.com/Koenkk/zigbee-herdsman-converters/commit/213e201eb08f1a8465d6ff900426d1dd3eb04773))


### Bug Fixes

* Fix 'programming_operation_mode' expose ([#8374](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8374)) ([e1fd3f9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e1fd3f93b5ebd054a255aef035268ddda60e2d4d))

## [20.53.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.52.0...v20.53.0) (2024-11-24)


### Features

* **add:** 929003151501 ([#8368](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8368)) ([7ffa36c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7ffa36cfeb37433f4d718122c7d57cf0b9455532))
* **add:** GL-C-310P ([#8366](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8366)) ([d00eb09](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d00eb090510f3a1eae36df847011036857d87e74))
* **add:** TS0505B_4 ([#8361](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8361)) ([e4c0956](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e4c0956af0931135c7d3a88ecf020a8fe13dec22))
* **add:** ZB-DoorSensor-D000 ([#8372](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8372)) ([f944ca0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f944ca0ee56d07eeaf2d8fcfdb24437080c2574c))


### Bug Fixes

* Bosch BSP-FZ2 (Plug Compact): fix failing interview due to wrong device configuration ([#8359](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8359)) ([7c1ac76](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7c1ac7625f2301c1bd64285fe6253a77f8732c92))
* **ignore:** fix 53d6b99 https://github.com/Koenkk/zigbee-herdsman-converters/pull/8354 ([8d7d673](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8d7d673b03a01417ea84fe9d62f597700de5a089))
* **ignore:** Notification of successful device update after re-interview for Yandex devices ([#8348](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8348)) ([9045784](https://github.com/Koenkk/zigbee-herdsman-converters/commit/90457845803e7c1bea4f251d927fc303f61eaa53))
* **ignore:** Update dependencies ([#8365](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8365)) ([010866e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/010866e244b5cfdd8992d0ed6c704067dd2b490e))
* Update Schneider PIR switch/Rotary dimmer config ([#8371](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8371)) ([32cc3e6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/32cc3e6b5ca79b276432a18d0bcc93425e66e3a4))

## [20.52.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.51.0...v20.52.0) (2024-11-22)


### Features

* **add:** HAL550 ([#8356](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8356)) ([c4919b7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c4919b74f890f3fdbac71b5b4a1de9a0601e8d30))
* **add:** SR-ZG9002KR12-Pro ([#8355](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8355)) ([d13a730](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d13a730de3eb3c34e76b95af237506dd1427b751))


### Bug Fixes

* **detect:** Detect `_TZE204_jtbgusdc` as Avatto ZDMS16-2 https://github.com/Koenkk/zigbee2mqtt/issues/24840 ([1153ccf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1153ccfc9e1f9a97fccf4daf432e1c1e2d37e675))
* **detect:** Detect `_TZE204_qyflbnbj` as Tuya TS0601_temperature_humidity_sensor_1 ([#8358](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8358)) ([1ca3d57](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1ca3d57bcb2405c24fdc0e8b8b3a2e20db3c3158))

## [20.51.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.50.0...v20.51.0) (2024-11-21)


### Features

* **add:** SR-ZG9042MP ([#8347](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8347)) ([f4ff3d8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f4ff3d8e2e477f2186c81e3fd1597a5403e51049))
* Support OTA for Tuya TS0201 ([#8350](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8350)) ([8e3d26e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8e3d26e5cce136a65d0283800e480414ea769560))


### Bug Fixes

* **detect:** Detect `_TZE200_ya4ft0w4` as Tuya ZY-M100-24G wall mounted variant ([#8352](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8352)) ([237923b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/237923b67080fbe048e3153d96c7433b10644a63))
* **detect:** Detect `_TZE204_o3x45p96` as AVATTO_TRV06 ([#8349](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8349)) ([865478b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/865478b854647eddcabaa92dbf79aa6d8db4f15d))
* **detect:** Detect `_TZE204_ogkdpgy2` as Tuya TS0601_co2_sensor ([#8354](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8354)) ([53d6b99](https://github.com/Koenkk/zigbee-herdsman-converters/commit/53d6b99555114b760394e32857f17052e6a1e1f2))
* **detect:** Detect `RBSH-TRV1-ZB-EU` as Bosch BTH-RA ([#8351](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8351)) ([d7dca0b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d7dca0b0f68bf8b2f6feb1a6587a2f33a8b5d665))

## [20.50.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.49.1...v20.50.0) (2024-11-20)


### Features

* **add:** AVATTO_TRV06 ([#8343](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8343)) ([3c2d52c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3c2d52c601d10a549fbe7f127c56f1080497c131))
* **add:** YNDX_00537, YNDX_00538, YNDX_00534, YNDX_00535, YNDX_00531, YNDX_00532 ([#8345](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8345)) ([4afed8c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4afed8c3634407b92d6c0154276074f7ca7e939b))
* **add:** ZSS-QT-LS-C ([#8294](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8294)) ([18b80ed](https://github.com/Koenkk/zigbee-herdsman-converters/commit/18b80ed29e069751f7bd9bcf2d75ffbe8e65f6d4))


### Bug Fixes

* Add Nedis ZBWS40WT as whitelabel for Tuya TS0044 ([#8342](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8342)) ([545b2af](https://github.com/Koenkk/zigbee-herdsman-converters/commit/545b2afcea4b6eed0045f4f5e99c3ee53f491598))
* Add new fingerprint for GL-C-007-2ID https://github.com/Koenkk/zigbee2mqtt/issues/24745 ([ac7e475](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ac7e4758c3af5ff924bcb75fc28a51340ac24f1d))
* Elko Super Thermostat: configurable reporting of local temperature based on sensor choice ([#8313](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8313)) ([9c0d004](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9c0d004b0d84f09773e059321eb8208b39a7f1b2))

## [20.49.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.49.0...v20.49.1) (2024-11-19)


### Bug Fixes

* **ignore:** fix f982c46bda87f66191d47f2d22d831e106ad7cfa ([0e3eb39](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0e3eb398b9533875600583bc148ad18975b40c47))

## [20.49.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.48.0...v20.49.0) (2024-11-19)


### Features

* **add:** HHST001 ([#8337](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8337)) ([fcf278d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fcf278d76a6caa475b548fa46d44d1daf550eb4a))
* **add:** SR-ZG2835PAC-AU ([#8338](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8338)) ([d66acfc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d66acfc8b5d1475ba2ca7cc978d0487521b2ab91))
* **add:** VNTH-T2 ([#8323](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8323)) ([f982c46](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f982c46bda87f66191d47f2d22d831e106ad7cfa))


### Bug Fixes

* **detect:** Detect `_TZE284_o3x45p96` as AVATTO TRV06_1 ([#8339](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8339)) ([14f56db](https://github.com/Koenkk/zigbee-herdsman-converters/commit/14f56dbd43353a0d1a0bda90e06047b45ba9796f))
* Fixed presence state for Tuya RT_ZCZ03Z (_TZE204_uxllnywp) ([#8335](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8335)) ([27c4c48](https://github.com/Koenkk/zigbee-herdsman-converters/commit/27c4c48aa3f5f3fdb015079b437c66739c7bf398))

## [20.48.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.47.0...v20.48.0) (2024-11-18)


### Features

* **add:** EFR32MG21.Router ([#8334](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8334)) ([42004da](https://github.com/Koenkk/zigbee-herdsman-converters/commit/42004da71f36bbf5d0c976fd4976983010faa971))
* **add:** NH3527A ([#8300](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8300)) ([6dd98f8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6dd98f89a9fc09a01f2396ec37b1ea83741ab1ba))
* **add:** ZBM5-1C-120, ZBM5-2C-120, ZBM5-3C-120 ([#8314](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8314)) ([6113ce2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6113ce277075e6be2ffacea0a484299d959e16ad))
* **add:** ZNTGMK12LM ([#8315](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8315)) ([38644c2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/38644c287a09508c415c1c0682833bdb64c82fb7))
* Expose switch type for TS110E_1gang_2 ([#8326](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8326)) ([f711098](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f7110985024ac51bb1523ac389de843abf186f95))


### Bug Fixes

* Detect new model of LED2109G6 and fix model of LED2201G8 ([#8330](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8330)) ([df7e3eb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/df7e3eb1c8453ec3702fb5ca2dd68b599c1e7a5a))
* **detect:** Detect `_TZ3000_9kbbfeho` as Tuya TS0222_light ([#8318](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8318)) ([5466e60](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5466e6096970b24cb4f6a68aae0baacde355bb24))
* **detect:** Detect `_TZ3000_upgcbody` as Tuya TS0207_water_leak_detector_1 https://github.com/Koenkk/zigbee2mqtt/issues/24759 ([16efcd2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/16efcd232b9167285ab55e60e5011c3831ffafd4))
* **detect:** Detect `_TZE200_ojtqawav` as Tuya TS0601_switch_1_gang https://github.com/Koenkk/zigbee2mqtt/issues/24747 ([347eeb3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/347eeb3a4ce88bf7f2eb9490f8881e1d45f5e04c))
* **detect:** Detect `_TZE200_qjp4ynvi` as Tuya TS0601_thermostat ([#8319](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8319)) ([3f3549f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3f3549f79a38e8daabbca41760672bc73e0c42c6))
* **detect:** Detect `TRADFRIbulbG125E26WSopal440lm` as IKEA LED1936G5 ([#8328](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8328)) ([c7e6744](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c7e6744be4ee25b5113a0b6487114f316612588e))
* Fix overall power for TS0601_3_phase_clamp_meter ([#8329](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8329)) ([71b0617](https://github.com/Koenkk/zigbee-herdsman-converters/commit/71b06171d41389afdde402a8f4b6afc7210baf89))
* Fix Somfy SOMFY-1241752 integration ([#8325](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8325)) ([0306b39](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0306b3969990effe612477f6f93aa47364004e32))
* Fixed LoraTap SC400ZB-EU calibration time reading ([#8321](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8321)) ([761650e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/761650e1fe2833acd3c02a4722ad6f778b77a80a))
* **ignore:** fix 42004da71f36bbf5d0c976fd4976983010faa971 ([936e0f4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/936e0f4f1b999f520676bc07076d1c4076624171))
* **ignore:** fix c7e6744be4ee25b5113a0b6487114f316612588e ([fc44f1c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fc44f1cce4a903061f82ee203be2029815593b81))

## [20.47.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.46.0...v20.47.0) (2024-11-14)


### Features

* **add:** C203 ([#8309](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8309)) ([f9fdbd5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f9fdbd541653fbf05347caea66d999e815065cd0))


### Bug Fixes

* **detect:** Detect `_TZE204_g4au0afs` as Tuya TS0601_switch_6_gang https://github.com/Koenkk/zigbee2mqtt/issues/24743 ([8e8cefc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8e8cefc4307d735f61dad076ac9e99bc9f337b65))
* **detect:** Detect `_TZE284_p3dbf6qs` as Tuya TS0601_thermostat_3 https://github.com/Koenkk/zigbee2mqtt/issues/24742 ([1e70867](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1e708678d3c6bb58cccede24ef314ffe5c65f3f4))
* **detect:** Detect `SNZB-05` as Tuya TS0207_water_leak_detector https://github.com/Koenkk/zigbee2mqtt/issues/24759 ([4c83855](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4c83855f37f2219aa9c886b892421b781dc23eca))

## [20.46.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.45.0...v20.46.0) (2024-11-13)


### Features

* Add Livarno Home (Lidl) HG08131A, HG08131B, HG08131C ([#8307](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8307)) ([963d9a9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/963d9a9eaf06e64c0751f3adb4c623d9692729b1))
* Support OTA for RB 272 T ([#8310](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8310)) ([3e08ed6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3e08ed6d294ef5ce428a03afbb6cfcafe67d63af))


### Bug Fixes

* Add back colour to Gledopto GL-C-003P ([#8305](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8305)) ([829eb5f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/829eb5fff07f34a988596b4b92a9793e3759d978))
* **detect:** Detect `_TZE200_9xfjixap` as Avatto ME167 ([#8312](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8312)) ([14f3c9f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/14f3c9fcabf62210e817aaa1bc6ffa4c09dec7c9))
* Fix attribute name for Elko Super RF ([#8308](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8308)) ([ebbe3b2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ebbe3b247c6ad546bbd6c53efc9920c8fe60899d))

## [20.45.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.44.0...v20.45.0) (2024-11-12)


### Features

* **add:** TS0105 https://github.com/Koenkk/zigbee2mqtt/issues/24722 ([ebfb2d5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ebfb2d55d31fffc3c72e075bdc0871a9c2a29fa8))


### Bug Fixes

* Fix EcoDim ED-10012 and ED-10014 battery % https://github.com/Koenkk/zigbee2mqtt/issues/24698 ([8047ae2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8047ae24e0c1c15bf703c42517cab7e5b8fb9ec6))
* Fix hasAlreadyProcessedMessage when device has multiple endpoints ([#8301](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8301)) ([ba97340](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ba97340d2416dfde77794d780fec9c44d403fa90))
* Fix preset value for Tuya `_TZE200_viy9ihs7`  ([#8298](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8298)) ([e96ca33](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e96ca33e1c2c73156e1f7f0b766e79d9556a0577))

## [20.44.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.43.0...v20.44.0) (2024-11-10)


### Features

* **add:** 9290002269A ([#8292](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8292)) ([a4ee66a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a4ee66ae90a0379fb3ab226a6a7092a9773f7cc9))
* **add:** 929003666901 ([#8288](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8288)) ([15835f6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/15835f6fa2e9658e6dbb1f1599c5ab88b7051622))


### Bug Fixes

* **detect:** Detect `TRADFRI bulb E26 WW globe 810lm` as IKEA LED2103G5 ([#8297](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8297)) ([84f70d4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/84f70d45edc13dc03ff0cc450f64a315f3530860))
* Fix Gledopto GL-SD-301P not reporting state changes https://github.com/Koenkk/zigbee-herdsman-converters/pull/8183 ([b81dfcb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b81dfcb165dee80ac307bfc00e62ad4362e44c6b))
* Fix SNZB-04 status incorrect after some time https://github.com/Koenkk/zigbee2mqtt/issues/24668 ([b251c68](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b251c68c8bdf46390571fd7481fff1a6491a64e1))
* **ignore:** update dependencies ([#8295](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8295)) ([fe8e4f4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fe8e4f4caf928c6bb16744853717c230d67bb7e7))

## [20.43.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.42.0...v20.43.0) (2024-11-07)


### Features

* **add:** 81868 ([#8286](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8286)) ([0eae0c9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0eae0c9115e12fc14e374ba54b625a2f8789d583))
* **add:** C-RFZB-SM1 ([#8285](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8285)) ([880047a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/880047a5556e729de3f9245b332914ea79013134))
* **add:** SR-ZG9101SAC-HP-CLN ([#8282](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8282)) ([7b4b5fe](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7b4b5fe7aac910f9be8c784e2ba4672eb6f64351))


### Bug Fixes

* **detect:** Detect `_TZE200_en3wvcbx` as Tuya TS0601_cover_1 ([#8284](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8284)) ([3a26152](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3a26152a0f011ff04e5ace4e941817d38ad12463))

## [20.42.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.41.0...v20.42.0) (2024-11-06)


### Features

* Add running state to Saswell TRV ([#8280](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8280)) ([ef0cf9e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ef0cf9e6d131f6a614624dabe7937dde7df59f96))
* **add:** NAS-PS10B2 ([#8242](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8242)) ([ad4d87d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ad4d87dab7bd60010a28152d8ee26d32ef0c5094))

## [20.41.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.40.0...v20.41.0) (2024-11-05)


### Features

* **add:** 9290023351B ([#8268](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8268)) ([979ad07](https://github.com/Koenkk/zigbee-herdsman-converters/commit/979ad07153cfaf07f0e84dd4b0ebda42664ca131))
* **add:** TS130F_GIRIER https://github.com/Koenkk/zigbee2mqtt/issues/22321 ([9e3ada2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9e3ada2896612ad3724260577c5d244c17330aa3))


### Bug Fixes

* Disable unsupported power on behaviour for Third Reality 3RWK0148Z ([#8275](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8275)) ([a77be07](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a77be07bcd1e8db66266f0c9f283dbcca7abd81a))
* Fix battery % for Legrand 067646 ([#8278](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8278)) ([e6a3f39](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e6a3f399c0c1a6be491104ac014d8a984c356cea))

## [20.40.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.39.2...v20.40.0) (2024-11-04)


### Features

* **add:** T440 ([#8267](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8267)) ([11ab760](https://github.com/Koenkk/zigbee-herdsman-converters/commit/11ab760120ede189bfaafed57a71a2a092a8299c))
* **add:** T462 ([#8264](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8264)) ([2868504](https://github.com/Koenkk/zigbee-herdsman-converters/commit/28685042a3d7e94fcacb850d5dd1e384b1969f21))


### Bug Fixes

* changed device vendor name from Namron AS to Namron to match with other devices ([#8269](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8269)) ([e4dca4d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e4dca4dea4d92b6932f1adf4daa11f6b76a56f51))
* Fix `motion_sensitivity` and `occupancy_sensitivity` for Tuya ZY-M100-24G ([#8272](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8272)) ([f9aa47b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f9aa47bef30bb26e648c76ccce77e2942743d3bc))
* Fix Develco SMSZB-120 and HESZB-120 configure ([#8261](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8261)) ([d57705b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d57705b968e641340f4b191bef884d31023f986a))
* Fixed unit errors for water level sensor ME201WZ ([#8265](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8265)) ([f0c6a78](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f0c6a7884c067e5235443b18fc641d4803dc4c85))

## [20.39.2](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.39.1...v20.39.2) (2024-11-03)


### Bug Fixes

* **detect:** Detect `_TZ3000_402vrq2i` as Tuya ERS-10TZBVK-AA ([#8257](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8257)) ([fe67b32](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fe67b327bdfb65315c3a2601d8af33d3ebc920b3))
* Fix force power source not working when `Unknown` https://github.com/Koenkk/zigbee2mqtt/issues/24340 ([5902888](https://github.com/Koenkk/zigbee-herdsman-converters/commit/59028880c89a210c9b54780a19c00ffade8e2c81))
* Fix Moes MS-108ZR cover state inverted https://github.com/Koenkk/zigbee2mqtt/issues/24597 ([5ff65c0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5ff65c07b1edb5399c723346982c36317ba9e261))
* **ignore:** fix f54366e8ad8aaf820a36de7b47720fcd906eab61 ([9e776ee](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9e776ee5f2df6abe14ae2bff167d14e46dd084fe))
* **ignore:** update dependencies ([#8258](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8258)) ([8cd25aa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8cd25aae2490e53dda31af595a578503029c3819))

## [20.39.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.39.0...v20.39.1) (2024-11-02)


### Bug Fixes

* **ignore:** fix f54366e8ad8aaf820a36de7b47720fcd906eab61 ([02cd009](https://github.com/Koenkk/zigbee-herdsman-converters/commit/02cd009fe39b29a5b9c0ded1e8f3e9d64dcd1ee1))

## [20.39.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.38.0...v20.39.0) (2024-11-02)


### Features

* **add:** 929003054201 ([#8254](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8254)) ([d3e6dc1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d3e6dc1b4d3e82c86f4b550f4e8ca9548ff6c610))
* **add:** 929003823501 https://github.com/Koenkk/zigbee2mqtt/issues/24574 ([c2c1a93](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c2c1a93d57dd8ba668201dc3a12818cd008268bb))
* **add:** 929003823901 https://github.com/Koenkk/zigbee2mqtt/issues/24573 ([4460ddb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4460ddb401104be287530d0dd21d88e6eac0eae9))
* **add:** eTH730 ([#8246](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8246)) ([6e686b0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6e686b02a9c92c64414a6b5272c082328c372a23))
* **add:** LMZA4376 ([#8243](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8243)) ([014dcda](https://github.com/Koenkk/zigbee-herdsman-converters/commit/014dcda5a2482921f403b0e90ea87ac423413c09))
* **add:** ME201WZ ([#8253](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8253)) ([f44fa14](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f44fa14c3c10ea3431832f75442c552b2c6e0568))
* **add:** WLS098-ZIGBEE ([#8224](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8224)) ([36d96d9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/36d96d98353ae79b16c99e1cadc6d4630ce0ba7e))


### Bug Fixes

* Define endpoint in definition.toZigbee containing key 'state' ([#8190](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8190)) ([f54366e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f54366e8ad8aaf820a36de7b47720fcd906eab61))
* **detect:** Detect `_TZ3000_hy6ncvmw` as Tuya  TS0222_light https://github.com/Koenkk/zigbee2mqtt/issues/24577 ([91ed22b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/91ed22b66b9eac6de45d6ae44a8e602a1c056735))
* **detect:** Detect `929003811101_*` and `929003811001` as Philips 929003047101 https://github.com/Koenkk/zigbee2mqtt/issues/24599 ([805ee64](https://github.com/Koenkk/zigbee-herdsman-converters/commit/805ee64825183d0844c1c3c4c4ff211c3505ad29))
* device/zigbeetlc: Removed no longer needed endpoint quirk ([#8241](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8241)) ([f54114a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f54114a3de95b9380f895007a68809ea1a958346))
* Fix Chacon ZB-ERSM-01 cover state inverted ([#8250](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8250)) ([d0b843f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d0b843fe97f79c6cd883ca7d4b1a449d0cd2a653))
* Fix SNZB-03 detected as SQ510A https://github.com/Koenkk/zigbee2mqtt/issues/24588 ([8cbca45](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8cbca454f1922dada30d651f79177b8055c7c097))
* Fix temperature values divided by 10 for RMDZB-1PNL63 ([#8247](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8247)) ([77a5a37](https://github.com/Koenkk/zigbee-herdsman-converters/commit/77a5a378e3e21790d47fee7be1fc511233ed2ef3))
* Fix ZB-WB01 button mapping ([#8240](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8240)) ([c9e164d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c9e164d99e33c70423c37d232b0c9d7cc3379889))
* Switch IKEA E2206 to Zigbee OTA ([#8248](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8248)) ([e283938](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e2839384e937416d1f038debe17b1b7cfdc24d45))
* tuyaTz.datapoints wrongly updates { state: } object ([#8233](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8233)) ([0012650](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0012650fc2bc2f3ee6a68114022ab56df88607af))

## [20.38.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.37.0...v20.38.0) (2024-10-31)


### Features

* **add:** 929003809101 ([#8238](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8238)) ([aaed22d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aaed22d2d35cdfd7df64f56fc410a4f06dc1201a))
* **add:** amina S ([#8191](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8191)) ([24e4ab9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/24e4ab91647b97e7148df608af3d0f728500be3d))
* **add:** HA-08_THERMO ([#8227](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8227)) ([533fc18](https://github.com/Koenkk/zigbee-herdsman-converters/commit/533fc1810eae3f6e39a14c0f1d6b97d4cec78bed))
* **add:** NAS-TH07B2 ([#8234](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8234)) ([fff3657](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fff36571cf6877c7d05695f28a709c223feb4b06))
* **add:** RMDZB-1PNL63 ([#8236](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8236)) ([2119cb0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2119cb0ece87f36cfbbb12fce0220a5ba15cd4ae))
* **add:** RS485, ZB-PM01, ZB-WC01, ZB-WB01, ZB-WB02, ZB-WB03, ZB-WB08, ZB-PSW04, ZB-SW08 ([#8222](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8222)) ([0a8da2d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0a8da2d69f2920868e0f47b36b9909d170213cb2))
* **add:** TS0601_GTZ10 ([#8235](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8235)) ([ea835fe](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ea835fe773071d600a4e36489b67d36a8ea5314f))


### Bug Fixes

* **detect:** Detect `_TZ3000_6l1pjfqe` as TOMZN TOB9Z-63M https://github.com/Koenkk/zigbee-herdsman-converters/issues/8232 ([54c64c8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/54c64c806893251497972e797f2fe9043b32d836))
* **detect:** Detect `_TZ3210_3mpwqzuu` as Tuya TS110E_2gang_2 ([#8228](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8228)) ([e8c01b5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e8c01b58244241501b738c5af865250b32df3586))
* **detect:** Detect `TRADFRI bulb E12 CWS globe 800lm` as IKEA LED2111G6 https://github.com/Koenkk/zigbee2mqtt/discussions/7215 ([d740396](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d7403960efe011f64d88e9b3b2902b6d6a705ff8))
* Develco MOSZB-153: Fix illuminance reporting & unlock LED, timeout control ([#8223](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8223)) ([f5c73fb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f5c73fb73aec2d8b2a0cfbc54a454359f3204c6f))
* **ignore:** update dependencies ([#8239](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8239)) ([5156abc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5156abc03d7e8a7a85e35a2990df9325de7bb910))
* Improvements to Tuya ZY-M100-24G ('_TZE204_ijxvkhd0') ([#8229](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8229)) ([949b083](https://github.com/Koenkk/zigbee-herdsman-converters/commit/949b0838b95bd2e723558b692265a12dde8bbab1))

## [20.37.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.36.0...v20.37.0) (2024-10-30)


### Features

* **add:** 929003736101 [@markuswebert](https://github.com/markuswebert) https://github.com/Koenkk/zigbee2mqtt/issues/24540 ([ed54796](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ed547960c959ba9e617e62a167946542d6ea9d59))
* **add:** SC500ZB ([#8218](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8218)) ([53fb204](https://github.com/Koenkk/zigbee-herdsman-converters/commit/53fb204325eb0b61063ce5cd644c13cb7bf9eea1))
* Linptech ES1ZZ: add led indicator and fix the illuminance calculation ([#8226](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8226)) ([820bdeb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/820bdeb71319fbb64d97432a4529d8321231ab31))


### Bug Fixes

* **detect:** Detect `_TZE200_ydrdfkim` as Nous SZ-T04 ([#8225](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8225)) ([2a97d06](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2a97d061efe5b7c95d33a6d98b2ec2ed4aed8e57))
* Fix TS0222_light not exposing illuminance ([#8220](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8220)) ([255c180](https://github.com/Koenkk/zigbee-herdsman-converters/commit/255c180bd7afe81d08e508e80f338841feda8a98))
* **ignore:** update dependencies ([#8192](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8192)) ([5d0ca39](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5d0ca39277af13557d9fc7211162504dd2f461a2))

## [20.36.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.35.0...v20.36.0) (2024-10-29)


### Features

* Add two private attributes for SR-ZG9040A/ZG9041A-D. ([#8210](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8210)) ([7310253](https://github.com/Koenkk/zigbee-herdsman-converters/commit/73102533c618401a67683cd063ada6ccaaba6da1))
* **add:** MOSZB-153 ([#8195](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8195)) ([a3cde02](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a3cde0224e82b7d9bc640a82c56335864cde9c82))
* **add:** POK012 ([#8213](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8213)) ([2cb90e5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2cb90e5dc3bfd6d7021366d438d74b7e6eb195f4))
* **add:** SP-PS3-02, SP-WS-02 ([#8208](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8208)) ([d42ffbd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d42ffbd235102c7f9a6c8f4291a09f8cad38a681))


### Bug Fixes

* Correct local temperature calibration min and max value on SONOFF TRVZB ([#8214](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8214)) ([db1a214](https://github.com/Koenkk/zigbee-herdsman-converters/commit/db1a2143e7c23104706741f62fc3f807bba739d4))
* **ignore:** Develco: Bind genBinaryInput cluster instead of genpolllctrl  ([#8209](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8209)) ([7923565](https://github.com/Koenkk/zigbee-herdsman-converters/commit/792356515c7a3aa5d58a1d0f72709baa575d994b))
* Improve OSRAM AC01353010G batter % calculation ([#8212](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8212)) ([a188512](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a188512dbdf5148fbc94dadb07d9fe29a2bb40b2))

## [20.35.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.34.0...v20.35.0) (2024-10-27)


### Features

* **add:** 915005821901 ([#8194](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8194)) ([538861e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/538861e5568a973cdc40701a5f19c72a25693b20))
* **add:** 929003817002 ([#8197](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8197)) ([75337b7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/75337b7ae9c847149a3c3183847c58515aef203b))
* **add:** ZB-ERSM-01 ([#8196](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8196)) ([e545ca4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e545ca4226b33f12f6f7bb0b82ee2812621e2875))


### Bug Fixes

* Fix Lidl HG06335/HG07310 not reporting status https://github.com/Koenkk/zigbee2mqtt/issues/24169 ([bfc4ca3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bfc4ca35cb9adc70d61bca7a71e0abed4c6168f0))
* Fix state attribute incorrect for Tuya TS0601_dimmer_2 https://github.com/Koenkk/zigbee2mqtt/discussions/24471 ([a9d9f5a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a9d9f5a26f6f4e629718847a23de492921685508))
* Remove unsupported color from Innr RB 279 T  ([#8199](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8199)) ([158bf4c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/158bf4cbc94202825399f26c435f12895cd00bea))

## [20.34.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.33.0...v20.34.0) (2024-10-26)


### Features

* **add:** 929003808901 https://github.com/Koenkk/zigbee2mqtt/issues/24485 ([724b188](https://github.com/Koenkk/zigbee-herdsman-converters/commit/724b1883a02636c6896abd1d27c11ca668c2a2d8))
* **add:** AE 264 ([#8177](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8177)) ([8e988c0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8e988c0504316b08f1e80fc38644cf11fa49528c))
* **add:** GL-SD-301P ([#8183](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8183)) ([a59bd1e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a59bd1e5437d6557ce5f1faf6539878cf4f9e506))
* **add:** SQ510A https://github.com/Koenkk/zigbee2mqtt/issues/24141 ([5ff3e9f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5ff3e9f569011610c80eda9943b61c6d2e717fb5))
* **add:** TRV-4-1-00, SDC-4-1-00 ([#8180](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8180)) ([854080d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/854080d81c3fd622d2a6a15b5435193ecad8af68))


### Bug Fixes

* **detect:** Detect `_TZ3000_6l1pjfqe` as TOMZN TOB9Z-63M ([#8185](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8185)) ([b5dfc25](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b5dfc2533819c59d8db00939c781094cc02930be))
* Fix configure failing with `TABLE_FULL` for Develco SMSZB-120 and HESZB-120 ([#8189](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8189)) ([b27a810](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b27a8100414336744f667111304df1687796ec79))
* **ignore:** fix typo https://github.com/Koenkk/zigbee2mqtt.io/pull/3132 ([e578aed](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e578aed52e31cf205aa33ff7ca6ad0d3f17873c2))
* Prevent IKEA PARASOLL and BADRING being stuck on a previously reported state after it rapidly changes back and forth. ([#8174](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8174)) ([94e554b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/94e554bc5c1d7b54bd094a3d1c6866d228a02aa3))

## [20.33.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.32.0...v20.33.0) (2024-10-23)


### Features

* **add:** 929003047801 ([#8166](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8166)) ([511a622](https://github.com/Koenkk/zigbee-herdsman-converters/commit/511a62278d756a04aa50adea5c48e00ff8d29520))
* **add:** C-ZB-SM205-2G ([#8168](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8168)) ([91ffaed](https://github.com/Koenkk/zigbee-herdsman-converters/commit/91ffaedc29a93cd861e298fea9b14bdc635fb0d0))
* **add:** TRV602Z ([#8170](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8170)) ([af278d3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/af278d3a520a3fb37e7417f41e613cc39c485ea9))
* **add:** TS0222_light ([#8169](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8169)) ([33e6328](https://github.com/Koenkk/zigbee-herdsman-converters/commit/33e63289ef3448414b8744a8a87c1b355d7489e7))
* **add:** TS0601_thermostat_thermosphere ([#8176](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8176)) ([8e3be61](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8e3be6114defda2550f2fb6d9f9840b2b24ee2a0))


### Bug Fixes

* Add missing off_wait_time to light_onoff_brightness converter ([#8175](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8175)) ([daaa6ba](https://github.com/Koenkk/zigbee-herdsman-converters/commit/daaa6ba58b4c2a1b5c3e5741826ce97a796dbf65))
* Fix power source uknown for various SONOFF devices https://github.com/Koenkk/zigbee2mqtt/issues/24025 ([7e8a807](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7e8a807a334c4f21a59ef8770ceee935a9fa4c3a))
* Update 3r cluster id ([#8171](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8171)) ([19f84f2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/19f84f2e2dd6462f7207d6dc3a9972711355fdbf))

## [20.32.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.31.0...v20.32.0) (2024-10-21)


### Features

* **add:** 8720169264151 ([#8160](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8160)) ([8cd4a4f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8cd4a4fb3f2132bc3ae42a349cc0e3cd30b9cfb2))
* **add:** E8331DST300ZB ([#8068](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8068)) ([a84184c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a84184c3f246238778a44300b00b06b882587fba))
* **add:** E8331SRY800ZB_NEW ([#8165](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8165)) ([34629bf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/34629bf84dee89f68683b67658b8150065a8a94f))
* **add:** EMIZB-151 ([#8129](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8129)) ([f066285](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f066285e0508a6b3e961299232f372e252edee09))
* **add:** NT-S2 ([#8161](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8161)) ([08bda4f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/08bda4fca4f903300bfcc26336ca504cdae23209))


### Bug Fixes

* **detect:** Detect `_TZB210_lnnkh3f9` as MiBoxer FUT106ZR ([#8163](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8163)) ([b9c99bf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b9c99bff84a0ace848350e36b7ccc2a31691c306))
* **ignore:** update dependencies ([#8162](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8162)) ([6b846a2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6b846a2f6aa1f20201fd73646689f57326cd5a5b))

## [20.31.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.30.0...v20.31.0) (2024-10-19)


### Features

* **add:** TRV06_1 ([#8151](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8151)) ([8c5bf29](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8c5bf2928146e966e46ec970573fa1d4b74b7d2b))
* Tuya BAC-003 & BAC-002-ALZB: Add support for current_cooling_setpoint ([#8157](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8157)) ([de18b34](https://github.com/Koenkk/zigbee-herdsman-converters/commit/de18b34c6f6d4728affc4be229890aa4cedfae31))


### Bug Fixes

* **detect:** Detect `lumi.light.acn025` as Aqara SSWQD03LM ([#8158](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8158)) ([d28465b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d28465babfe86b3dcce559e48ed7fe855f2da820))
* Fix configure failing when configuring too many attributes at once https://github.com/Koenkk/zigbee-herdsman-converters/pull/8129 ([5c1f2d5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5c1f2d561b4cc7c4f032ec85df2979905d95877f))
* **ignore:** ZigUSB_C6: add OTA and ability to restart USB with one command ([#8155](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8155)) ([79d7e71](https://github.com/Koenkk/zigbee-herdsman-converters/commit/79d7e71db34995e38a10c9d7a031ec897499dcae))

## [20.30.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.29.0...v20.30.0) (2024-10-18)


### Features

* **add:** 3RCB01057Z ([#8149](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8149)) ([d10a64e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d10a64e7fb36ef19a84b860c4d3268f3dfd8dd87))
* **add:** FZB-3 ([#8152](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8152)) ([6be6a87](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6be6a87bafe9ca668896598e7aad580e5e7b880f))
* **add:** M8Pro [@turbofex](https://github.com/turbofex) https://github.com/Koenkk/zigbee2mqtt/issues/23812 ([ea9d562](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ea9d5626e632395fbea6d7f19f27cfbb06e8c227))
* **add:** PAT04-A ([#8153](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8153)) ([6e1895e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6e1895e07fdac426fab54111fd6807efc64ba03e))
* **add:** SLZB-0xp7 https://github.com/Koenkk/zigbee2mqtt/issues/24379 ([a1f4495](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a1f4495a127f6783368849b7a7c85ffba20f6e95))
* **add:** SQM300Z4, SQM300Z6 ([#8154](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8154)) ([902596e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/902596ef64ae2111acd3cb00271a72ce1faec0d1))
* **add:** WS-US-ZB ([#8148](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8148)) ([9102e9d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9102e9d4029b75b1db036fe98d50d9930898c5e2))
* **add:** ZigUSB_C6 ([#8120](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8120)) ([ba5a32d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ba5a32ddc6b77432d279c0902c597eb0a9702672))


### Bug Fixes

* Allow reporting minimum to be specified in device file for electricityMeter configuration ([#8123](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8123)) ([ebd3b74](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ebd3b74f8ec810285c078787a13cd29ec4e7facf))

## [20.29.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.28.0...v20.29.0) (2024-10-16)


### Features

* Add ota to SIN-4-FP-21_EQU ([#8146](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8146)) ([9445044](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9445044b99cb8d1951888ca5cae34b4c27cec7b4))
* **add:** C-ZB-LC20-RGBW, C-ZB-LC20-RGBCCT, C-ZB-LC20-RGB, C-ZB-LC20-Dim, C-ZB-LC20-CCT ([#8142](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8142)) ([5ead414](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5ead414316a4314ee25114037e5256c863deeaee))


### Bug Fixes

* **detect:** Detect `_TZ3000_jwcixnrz` as Tuya TS0215A_remote https://github.com/Koenkk/zigbee2mqtt/issues/4951 ([6336044](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6336044e51897577e00d6cb26105a1eebeea9c44))
* **detect:** Detect `_TZE200_kds0pmmv` as Tuya TV02-Zigbee https://github.com/Koenkk/zigbee2mqtt/issues/24335 ([d1e5bb8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d1e5bb847942cc38195a1d0acf74fe569638cff1))
* Fix power source unknown for various Tuya lights https://github.com/Koenkk/zigbee2mqtt/issues/24340 ([70f1d77](https://github.com/Koenkk/zigbee-herdsman-converters/commit/70f1d77eb7f9f36e17a9041d75cf5996e9a075d9))
* update 3r product ([#8144](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8144)) ([bfdf450](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bfdf450eb7e7f1b994f2ba10505a2b1b49ca2bae))
* Update frient powermeter led 2 ([#8044](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8044)) ([6e84179](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6e841795d6c7358b6a08aff28a522d0547debf34))
* Use zigbeeOTA for Lixee ([#8136](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8136)) ([54481a6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/54481a6be6c1f255f75d455ae7123a66a8315bbf))

## [20.28.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.27.2...v20.28.0) (2024-10-14)


### Features

* **add:** HS-720ES ([#8124](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8124)) ([5e439af](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5e439afe7aa7562f4f4540e9a1ba6331302adc0f))
* Support calibration up/down for Tuya `_TZ3000_cet6ch1r` ([#8099](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8099)) ([9aef8e4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9aef8e4f1517fc5dbb1851b4b4d4bdc1057f595d))


### Bug Fixes

* Corrections to TOMZN TOB9Z-VAP vs TOB9Z-M ([#8134](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8134)) ([f51a6cd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f51a6cd6775865bd4d0f82b12102ec451511e8ca))
* **detect:** Detect `_TYST11_udank5zs` and `_TZE284_udank5zs` as Tuya TS0601_cover_1 ([#8133](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8133)) ([526f1a2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/526f1a2b2018632248c6d59ffe7849f10c875125))
* **detect:** Detect `_TZ3000_6l1pjfqe` as TOB9Z-VAP https://github.com/Koenkk/zigbee-herdsman-converters/issues/8126 ([d476ca1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d476ca13a3982fce6dfbb73b3825cfd00bc6e77f))
* Fix battery % reporting of Third Reality 3RSS009Z https://github.com/Koenkk/zigbee2mqtt/issues/23486 ([1169443](https://github.com/Koenkk/zigbee-herdsman-converters/commit/11694436f22d415706580f38afdc02824efd5d68))

## [20.27.2](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.27.1...v20.27.2) (2024-10-13)


### Bug Fixes

* **ignore:** fix publish ([b72f679](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b72f6795d8657cc2f05c91877dfc05a9e11aa56b))

## [20.27.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.27.0...v20.27.1) (2024-10-13)


### Bug Fixes

* **ignore:** fix pnpm publish ([e280180](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e28018050ba71a42451bcd222ab9afc9208eb16d))

## [20.27.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.26.0...v20.27.0) (2024-10-13)


### Features

* **add:** RB 247 T https://github.com/Koenkk/zigbee2mqtt/issues/24304 ([bc95025](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bc950257b64ac18149faa28732ab9b223d8888cd))


### Bug Fixes

* **detect:** Detect `_TZ3000_n2egfsli` as Tuya WL-19DWZ https://github.com/Koenkk/zigbee2mqtt/issues/24305 ([a551de6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a551de6956b5e12f35c5183f236505a20808c023))
* **ignore:** Switch to pnpm ([#8121](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8121)) ([b53aef5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b53aef5c1d93f33f68835ea96d2902c5a93e8979))
* **ignore:** update dependencies ([#8122](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8122)) ([d3c47df](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d3c47dfb488d500ee1de30bd40462769b12a199a))

## [20.26.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.25.0...v20.26.0) (2024-10-12)


### Features

* **add:** 046677584658 https://github.com/Koenkk/zigbee2mqtt/discussions/24269 ([870c47b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/870c47b5b4c555a6bab5d1dd23c69061809440d5))
* **add:** 1745930V7 ([#8111](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8111)) ([a7a331d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a7a331d17e5fb019fbff40227dac3586ee4842e2))
* **add:** 3RWK0148Z ([#8106](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8106)) ([357c46e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/357c46efc4edd2afbec040c869c3172830ff6832))
* **add:** 4512782 ([#8119](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8119)) ([a4727d7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a4727d7fa1c6d9ddc90fcb3f62cbd95b09c1ef4c))
* **add:** HK-SL-DIM-AU-R-A ([#8118](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8118)) ([df23a20](https://github.com/Koenkk/zigbee-herdsman-converters/commit/df23a20b11cce8ff3da62d2033820e51a08bbf59))
* **add:** SLR1d ([#8105](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8105)) ([171aaea](https://github.com/Koenkk/zigbee-herdsman-converters/commit/171aaea6fb200c30556486cd2f9dd86ba03a242b))
* **add:** TSL-TRV-TV05ZG ([#8109](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8109)) ([784e172](https://github.com/Koenkk/zigbee-herdsman-converters/commit/784e1729833e7a7ca9d4411a1fa3f0b9d960af73))
* **add:** YMI70A ([#8095](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8095)) ([9c405da](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9c405da8330a4a416b86f58debe9da538b764dcf))


### Bug Fixes

* **detect:** Detect `_TZ3210_ifga63rg` as Moes ZB-TDC6-RCW-E14 ([#8114](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8114)) ([f9d88fa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f9d88facda769b040bd8d7d9c956a10748585fa5))
* **detect:** Detect `LCZ002` as Philips 8719514419278 ([#8110](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8110)) ([6c3ec8a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6c3ec8a5a0a1e33b63056c468b5a2f5f4c1c7000))
* **detect:** Detect `TRADFRIbulbE17WScandleopal440lm` as IKEA LED1949C5 ([#8112](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8112)) ([e644326](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e64432683aefe2fccfcb0b49b4df87174454b9c8))
* Fix Tuya ZY-M100-24GV2 move/presence sensitivty range https://github.com/Koenkk/zigbee2mqtt/issues/24049 ([e9cc0de](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e9cc0def058c7e65b8b2b235102b98ee5c1bfe5d))
* Improve reporting of IKEA E2206 ([#8060](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8060)) ([6e66a7d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6e66a7d3ab8fde6ac1d26076d189d1b54f20e320))

## [20.25.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.24.0...v20.25.0) (2024-10-10)


### Features

* **add:** 929003816901 ([#8102](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8102)) ([4b88f21](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4b88f212c5871b054f7c47e73f5093d29e88485b))
* **add:** E22-N1E ([#8107](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8107)) ([5c3c560](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5c3c5605b0c1a8139bc82a2ba1f5ef68ab90a2e5))
* **add:** GL-SD-001P ([8eea12a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8eea12a411d895315f5a1dc95805f7c16b6251ff))


### Bug Fixes

* Change ZWT198/ZWT100-BH minimum deadzone value and step ([#8100](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8100)) ([35822d5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/35822d5f5906fb54780fa148a86ebef183220ef4))
* **detect:** Detect `_TZ3000_wmlc9p9z` as Tuya TS0207_repeater https://github.com/Koenkk/zigbee2mqtt/issues/7901 ([508ab1d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/508ab1ddefcea5a0204920c8025228c75e13b3cc))
* **detect:** Detect `_TZE284_nlrfgpny` as Neo NAS-AB06B2 ([#8091](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8091)) ([53f2959](https://github.com/Koenkk/zigbee-herdsman-converters/commit/53f2959a5bf0935fa74b10b126bff52b522c559c))
* **detect:** Detect `PLUG COMPACT EU EM T` as LEDVANCE 4099854293276 ([#8086](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8086)) ([dbde944](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dbde944ae2a1b601d4fbb25d904798d881c9851c))
* **detect:** Detect `SPM01X` as SPM01-U01 and SPM02X as SPM02-U01 ([#8101](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8101)) ([96b0cad](https://github.com/Koenkk/zigbee-herdsman-converters/commit/96b0cada2e3e36e38639f0119baa8d737b116cdd))
* Fix Aqara DJT11LM x/y/` values https://github.com/Koenkk/zigbee2mqtt/discussions/24185 ([6e6921e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6e6921ea83a56ea56942292f4e27a9269a15ebcb))
* Fix Legrand device pairing ([#8093](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8093)) ([ef59340](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ef59340c723f2cf8ea8381997a9de69b431c657e))
* Fix Lumi ZNCLBL01LM state and position reporting https://github.com/Koenkk/zigbee2mqtt/issues/23557 ([1c92165](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1c92165a06fe89337c83cf87ec19f261f3e55454))
* Fix ShinaSystem PMM-300Z2 and PMM-300Z3 ac frequency ([#8094](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8094)) ([6b36819](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6b368190fc311ae33a7bd768f89050e9462404d4))
* Fix some Tuya devices not reporting data https://github.com/Koenkk/zigbee2mqtt/issues/24261 ([bdefb31](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bdefb3122faea816593f00955f8d39651f8aa9e5))
* Fix Tuya ZWT198/ZWT100-BH `manuSpecificTuya.mcuVersionRequest` times out https://github.com/Koenkk/zigbee2mqtt/issues/23874 ([0366d33](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0366d33b3bc3d1ba360b941bce27cfa39b62c26a))
* Remove position from Siterwell GS361A-H04 ([#8092](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8092)) ([51d99cc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/51d99cc42ba5919fd35d16a7a8ad13528a3553c7))

## [20.24.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.23.1...v20.24.0) (2024-10-06)


### Features

* **add:** S32055 ([#8083](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8083)) ([b355787](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b355787b47ff5c29072fe4788f53e028302ab392))
* **add:** TS0726_switch_4g_2s ([#8085](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8085)) ([bd38d99](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bd38d9951b13dfe21c4634df05d54a3f273040e3))
* **add:** Y1_IN ([#8082](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8082)) ([bbbeab6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bbbeab699cf15cf3665c103fc5cc6db4e3ae8d56))


### Bug Fixes

* `Failed to apply calibration to ...` when using an empty string ([#8088](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8088)) ([92441ff](https://github.com/Koenkk/zigbee-herdsman-converters/commit/92441ff768f2ffaa4b301211e505854df1089bfc))
* **ignore:** Revert _TZE204_aoclfnxz fixes [#2](https://github.com/Koenkk/zigbee-herdsman-converters/issues/2) ([#8081](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8081)) ([a824298](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a824298bc19628ed01bc4cf7c414813125116c74))
* **ignore:** update dependencies ([#8084](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8084)) ([b3a6da5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b3a6da5dff36a04c738d91653d8c9fae4734046c))

## [20.23.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.23.0...v20.23.1) (2024-10-05)


### Bug Fixes

* **detect:** Detect `_TZ3000_abjodzas` as Nous LZ3 ([#8080](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8080)) ([c24b03d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c24b03d98eb7d26892388eaede35c20dbf125637))
* **detect:** Detect `_TZE204_loejka0i` as Tuya SDM01 ([#8075](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8075)) ([16ab95a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/16ab95ace855e08b5d166040775d3e600f79dce8))
* **detect:** Detect `_TZE284_wtikaxzs` as Nous E6 ([#8078](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8078)) ([91ebad2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/91ebad24e1b5fb0709c57becd2ab606e904bef9d))
* **detect:** Detect `SCM-6-OTA_00.00.03.20TC` as Lupus LS12128 https://github.com/Koenkk/zigbee2mqtt/issues/24208 ([4d01e56](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4d01e5639fe09e5ee079145a40d4529bf270970d))
* Fix `_TZE204_aoclfnxz` integration ([#8076](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8076)) ([1fa471d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1fa471d13f4cc9c64750471911606424c3121d4b))
* Fix E2206 OTA https://github.com/Koenkk/zigbee2mqtt.io/pull/3067 ([af93115](https://github.com/Koenkk/zigbee-herdsman-converters/commit/af931155781dfb565818eae41a5bcdfe3f773291))
* Fix Moes MS-108ZR cover inverted https://github.com/Koenkk/zigbee2mqtt/issues/23483 ([675a0f3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/675a0f34cf5a52f6aadc60bbbf66f69976b655cc))

## [20.23.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.22.0...v20.23.0) (2024-10-03)


### Features

* **add:** 929003711201, 929003711301 ([#8069](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8069)) ([b2949e2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b2949e2f8fad39d252b536f132d0fae3d666205a))
* **add:** E13-A21 ([#8045](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8045)) ([bef15e0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bef15e0278279557d74236d1c7f90996a0d8a95e))
* **add:** R7047 ([#8067](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8067)) ([f5def68](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f5def68df7961563bc456c6b15a2e5ca7c1d7da8))


### Bug Fixes

* Fix `_TZ3210_mja6r5ix` integration https://github.com/Koenkk/zigbee2mqtt/issues/24074 ([6c19808](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6c1980821e0baa37f90043615794d539139c6d52))
* Fix Avatto ZWT198 _TZE204_xnbkhhdr, fix reversed 6-1 and 5-2 in 'working_day' datapoint ([#8066](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8066)) ([c8b28a1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c8b28a1df084c0195290b8360149c0e1d3c3d437))
* Fix power source unknown for some Tuya switches ([#8073](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8073)) ([d7880b9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d7880b989d1ca43b896da893e02ab584402f25f5))

## [20.22.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.21.0...v20.22.0) (2024-10-02)


### Features

* Expose test attribute for HEIMAN HS1SA ([#8061](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8061)) ([a4d9c01](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a4d9c0108936b91d64cd5d6a3209400d7706ca0b))


### Bug Fixes

* **detect:** Detect `_TZE284_0zaf1cr8` as Nous E8 https://github.com/Koenkk/zigbee2mqtt/issues/23941 ([101b9cd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/101b9cd48cfca5e8773631a325f5735fc0de3f24))
* Fixes for `_TZE204_aoclfnxz` integration ([#8063](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8063)) ([6bd9ab9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6bd9ab922e454b6c2075fdca62ce4251682cc35f))

## [20.21.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.20.0...v20.21.0) (2024-10-01)


### Features

* Add current level startup to all IKEA TRADFRI lights ([#8049](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8049)) ([3f9376f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3f9376fbf899d07a950668939a5555f2ad8366d3))
* **add:** FP1E ([#8043](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8043)) ([047cfc0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/047cfc0c66e36dc77947f5ffb278c4567bd3c730))
* **add:** ZPIR-10 ([#8055](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8055)) ([6dc2d41](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6dc2d41913522a0bf794ae9c26ba1b7a9e7f95ee))


### Bug Fixes

* **detect:** Detect `_TZE200_bdblidq3` as BSEED BSEED_TS0601_cover ([#8054](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8054)) ([0aa4e12](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0aa4e12e9230744722b720d0b827ff58f783cbd7))
* **detect:** Detect `_TZE200_rxq4iti9` as EARU TRV06 ([#8056](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8056)) ([3247132](https://github.com/Koenkk/zigbee-herdsman-converters/commit/32471322b8d165c15de2d45cfb96dbfbea9daab7))
* **detect:** Detect `_TZE204_c2fmom5z` as Tuya TS0601_air_quality_sensor ([#8051](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8051)) ([5628b9c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5628b9c4351dd4e1c746787563191479ecd21b46))
* **detect:** Detect `_TZE284_0zaf1cr8` as Nous E8 https://github.com/Koenkk/zigbee2mqtt/issues/23941 ([13ca5a0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/13ca5a04abfb6e38a03aee0d3eb4737a18e33071))
* Fix incorrect logging when value is not in Tuya lookup https://github.com/Koenkk/zigbee2mqtt/issues/24090 ([6b9a567](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6b9a56780a4be37f820ef8542f19aff54533c540))
* Fix Tuya ZY-M100-24GV2 integration https://github.com/Koenkk/zigbee2mqtt/issues/21738 ([fedd916](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fedd91693c73036842682c96826665b66f5a2426))
* Fix Tuya ZY-M100-24GV3 move/presenence sentivity range https://github.com/Koenkk/zigbee2mqtt/issues/24049 ([3aeb8ec](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3aeb8ecead7fbc97d62b4c9cba8c4e0d6723e6ba))
* **ignore:** update dependencies ([#8059](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8059)) ([c4bd3b8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c4bd3b8a1a45bc1afa752042cf72b21a93744fa4))
* Mark GL-C-003P as color temp only (instead of color) https://github.com/Koenkk/zigbee2mqtt/issues/24091 ([ef49933](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ef499333aadd6d80717180a834861f1d10b12956))

## [20.20.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.19.0...v20.20.0) (2024-09-29)


### Features

* **add:** ZBEK-32 ([#8050](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8050)) ([98440a0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/98440a0cb2fef62c09ca1ac07a838ee956eaf772))


### Bug Fixes

* **detect:** Detect `_TZE200_rxypyjkw` as Evanell EZ200 ([#8032](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8032)) ([40115c6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/40115c6a4dfd4d0cafaec9b84c0d28809a1c20e1))
* Fix Lumi pet feeder LED indicator control ([#8041](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8041)) ([e7bd227](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e7bd227ec0814af6bb91bb5c22b7f4e862acada6))
* Fix scaling ignored when precision is specified in a `modernExtend.numeric` ([#8048](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8048)) ([aed79ed](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aed79eda0f47dc26043ec03b44677fe313a1edc2))
* **ignore:** update dependencies ([#8046](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8046)) ([c251468](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c2514686b79cf13e8d0ccf71e4f19c822d0b125a))

## [20.19.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.18.0...v20.19.0) (2024-09-28)


### Features

* **add:** 929003823001, 929003823601 ([#8037](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8037)) ([45b3e0d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/45b3e0d8f92807a9765584a7517767fc0e87de7b))
* **add:** SPM01V2.5, SPM02V2.5, SPM02V3, SDM01V1.5, SDM02V1 ([#8033](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8033)) ([6928928](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6928928f0104dd3e3ba03cac35e67ba926eecd3a))
* **add:** TGM50-ZB ([#8030](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8030)) ([2085336](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2085336f9e5aeb99da3616cc5b93bc87da510b92))
* **add:** TRV07 ([#8029](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8029)) ([6ba63c2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6ba63c2c2b6e3750a00ae2b11e67b47080c7270d))
* Improve multi-endpoint support for lights ([#8031](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8031)) ([2f0567d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2f0567de785ee06e6de67a5b2cad3886fd487e0a))
* Improvements for tint (Mueller Licht) ([#8040](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8040)) ([c2c0b4f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c2c0b4f79b47cd2bbd555ab2b6b14001ea874c54))


### Bug Fixes

* **detect:** Detect `_TZE204_clrdrnya` as Tuya MTG235-ZB-RL ([#8036](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8036)) ([ab5bc53](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ab5bc53612cdb5d424c765b1b603468d4f4f450d))
* **detect:** Detect `TRADFRI bulb E26 CWS globe 800lm` as IKEA LED2109G6 [@pushpinderbal](https://github.com/pushpinderbal) https://github.com/Koenkk/zigbee2mqtt/issues/24123 ([f67d7ff](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f67d7ff214d452554d1de0dbc6afaa71ce8184c4))

## [20.18.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.17.1...v20.18.0) (2024-09-25)


### Features

* **add:** CSAC451-WTC-E ([#8021](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8021)) ([9a74a84](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9a74a84e97e12654c8ad611a0de3730d312f1d6f))


### Bug Fixes

* **detect:** Detect `_TZ3210_ohvnwamm` as Fantem ZB003-X ([#8020](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8020)) ([03c67d9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/03c67d992c1d34444d7c9a0af8048f7b526a0f4c))
* Fix vendor naming resulting in duplicate vendors ([#8024](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8024)) ([a13c401](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a13c40155cc4322979bd815c60e7833f35b17807))
* Log Lumi `Unhandled key` as debug https://github.com/Koenkk/zigbee2mqtt/issues/24081 ([1c4df30](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1c4df30b1e45852bb0e443aab91b7a26a19793af))

## [20.17.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.17.0...v20.17.1) (2024-09-24)


### Bug Fixes

* Expose `toggle` command for SONOFF ZBMINIR2 https://github.com/Koenkk/zigbee-herdsman-converters/issues/8018 ([88fc9f6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/88fc9f600411d04eb040afe398cb02e9ae23e805))
* **ignore:** Fix parsing of serveral uint48 attributes https://github.com/Koenkk/zigbee2mqtt/issues/23457 ([843f7a2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/843f7a2160215d230e6bd53ebc053e4ac4573df3))
* Improve `_TZE204_aoclfnxz` integration ([#8005](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8005)) ([ad72d4a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ad72d4a8b74e0e4cd4c56d8458cb70a3a4126471))

## [20.17.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.16.3...v20.17.0) (2024-09-23)


### Features

* **add:** 371050043 ([#8013](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8013)) ([4f9c0d0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4f9c0d0e10ad1815e17c3463ccd8b7c10393d2fe))
* **add:** C201 ([#8015](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8015)) ([2ebb7ca](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2ebb7caac550a6c4916bd4990b504508c4efd9fb))
* **add:** SR-ZG9011A-DS ([#8016](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8016)) ([8941a0e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8941a0e5bce1fc795025a9edf5daf6f21e04190f))
* Improve support for the SUTON STB3L-125-ZJ DIN rail RCBO (TZE204_wbhaespm) ([#8011](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8011)) ([93dbdfc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/93dbdfcfe8da0f6167feda1b007fffb6a661e41b))


### Bug Fixes

* **detect:** Detect `_TZ3000_8n7lqbm0` as Tuya TS0001 https://github.com/Koenkk/zigbee2mqtt/issues/24039 ([0512cac](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0512cac1b1838cb1db0af0442a2f5f330fb6a842))
* **detect:** Detect `_TZE204_dpqsvdbi` as Tuya TS0601_cover_1 https://github.com/Koenkk/zigbee2mqtt/discussions/24027 ([41be85d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/41be85d25f800b5851547d007aed6af30de70311))
* Fix `_TZ3210_mja6r5ix` not controllable ([#7567](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7567)) ([3fe484c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3fe484c3326fb3bdbd5109c306af5acd6cbe0d59))
* Fix `_TZE204_m1wl5fvq` not being detected as supported ([#8017](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8017)) ([66349c1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/66349c18a580a5fcefdcb60e6e4ae6d65b5dd6b4))
* Fix battery reporting for Tuya `_TZ3210_up3pngle` ([#8004](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8004)) ([615eb00](https://github.com/Koenkk/zigbee-herdsman-converters/commit/615eb00f66267429fa8434a233b39f2259af3d1a))
* Fix configure failing for ZG-101ZL https://github.com/Koenkk/zigbee2mqtt/issues/24013 ([e35ac56](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e35ac56975c10f5dfbf305cd9353f29b30725fa0))
* Fix custom cluster missing in configure https://github.com/Koenkk/zigbee2mqtt/issues/23993 ([711060a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/711060aac01bf0130bb001f2b623f1f2916de206))
* Fix power source unknown for some lights and switches https://github.com/Koenkk/zigbee2mqtt/issues/24074 ([e12576c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e12576cab71008469ac9466a475379f6f4f67be2))
* **ignore:** fix e12576cab71008469ac9466a475379f6f4f67be2 ([a6fc860](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a6fc860969cbcc45f42de63c8ad19325a4ef5783))
* **ignore:** update dependencies ([#8012](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8012)) ([3f05910](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3f05910853839ba25607cbd2ac96e9018588f864))

## [20.16.3](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.16.2...v20.16.3) (2024-09-19)


### Bug Fixes

* Add custom cluster for Perenio PEHPL0X ([#8007](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8007)) ([03b2255](https://github.com/Koenkk/zigbee-herdsman-converters/commit/03b2255eb4d5e1031dc5767da1127f49e5244bf7))
* **detect:** Detect `_TZE200_rndg81sf` as Tuya TS0601_thermostat https://github.com/Koenkk/zigbee-herdsman-converters/issues/7998 ([9a5d705](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9a5d70583f562edf0ea64c0e49cca65924e3dcf9))
* Fix power source unknown for all battery powered devices https://github.com/Koenkk/zigbee2mqtt/issues/24007 ([885d241](https://github.com/Koenkk/zigbee-herdsman-converters/commit/885d241390c2eaab8c06abb1c29a7a8bdff0881a))
* **ignore:** fix 3d90c8afca9ac22b1c2bd77e290c9ca9ee712098 ([89962a5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/89962a5bccbf966ed2f9dbb7b485e6d15cbac532))

## [20.16.2](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.16.1...v20.16.2) (2024-09-18)


### Bug Fixes

* **detet:** Detect `_TZ3000_bjawzodf` as Tuya WSD500A ([#8001](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8001)) ([09c745c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/09c745c9f422cb3ce57b534f244be7c5bef226f1))
* Fix power source unknown for Sonoff plugs SA-028/SA-09 ([#8003](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8003)) ([831dd1b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/831dd1b6eb77dc6f79b4291d1f2473e2142b367e))
* Hint for required firmware for auto close valve in SONOFF SWV ([#8002](https://github.com/Koenkk/zigbee-herdsman-converters/issues/8002)) ([cb2a0b0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cb2a0b066b4b25402213ea9ead9ec2877bf9f511))
* **ignore:** `writeUint` -&gt; `writeUInt` ([a084f2e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a084f2e8b2e5133630fd745f686aa9dc39317adc))
* Send transition when IKEA bulb is turned OFF when not already OFF https://github.com/Koenkk/zigbee2mqtt/issues/23825 ([21fbf64](https://github.com/Koenkk/zigbee-herdsman-converters/commit/21fbf64e07bf2bde419ef31edd9113505424bd04))

## [20.16.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.16.0...v20.16.1) (2024-09-17)


### Bug Fixes

* **ignore:** Refactor for `reportableChange` change of https://github.com/Koenkk/zigbee-herdsman/pull/1190 ([#7996](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7996)) ([e8883c0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e8883c0d012ecf9b3f103ca070e44877da4f368f))

## [20.16.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.15.0...v20.16.0) (2024-09-16)


### Features

* **add:** ROB_200-004-1 [@william-sy](https://github.com/william-sy) https://github.com/Koenkk/zigbee2mqtt/issues/23965 ([77603de](https://github.com/Koenkk/zigbee-herdsman-converters/commit/77603de41095012cbc8497ea63d0d292cd35f622))
* **add:** ZY_HPS01 ([#7987](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7987)) ([16a859e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/16a859e2f4fff5a6304766bd7ae5494b6a91a95c))


### Bug Fixes

* Add status shutter for Legrand 067776 ([#7992](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7992)) ([19a9847](https://github.com/Koenkk/zigbee-herdsman-converters/commit/19a9847d7fcbeaf1ba464dae88c2049521926573))
* **detect:** Detect `_TZ3210_k1msuvg6` as Tuya TS110E_1gang_2 @RoGu777 https://github.com/Koenkk/zigbee2mqtt/issues/23967 ([401d1c4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/401d1c4be1690c89c9d05dd69ce998af284484bc))
* **detect:** Detect `SA-028-1` as SONOFF SA-028/SA-029 ([#7991](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7991)) ([305d492](https://github.com/Koenkk/zigbee-herdsman-converters/commit/305d49289292d222b8efa0eb6785fabff4c873fe))
* Fix Tuya `_TZE204_lzriup1j` `working_day` https://github.com/Koenkk/zigbee2mqtt/issues/23979 ([fb000f0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fb000f03f793e587774ad25c15862bfbd50fb41f))
* Fixes in ptvo.switch converter ([#7993](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7993)) ([427c644](https://github.com/Koenkk/zigbee-herdsman-converters/commit/427c6449e9b1d3e3b1fd275dd8f540b214c70df7))
* **ignore:** update dependencies ([#7989](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7989)) ([6b83620](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6b8362013eb779c326de81caf20362147cd38aff))
* TO-Q-SY2-163JZT unable to set over voltage higher than 255 ([#7995](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7995)) ([34b0c30](https://github.com/Koenkk/zigbee-herdsman-converters/commit/34b0c30bf764daf74fded6d902e35b3567a7f271))

## [20.15.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.14.1...v20.15.0) (2024-09-14)


### Features

* **add:** E2206 ([#7988](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7988)) ([b197ca0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b197ca0568252018e0c6102148816edd97d0228e))
* **add:** TRV06 https://github.com/Koenkk/zigbee2mqtt/issues/23755 ([5efc97c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5efc97cd1b11e70d4064cda8fc0fd7fe6cb27ce9))
* **add:** ZB-SP1000 ([#7977](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7977)) ([24e7045](https://github.com/Koenkk/zigbee-herdsman-converters/commit/24e7045dd70c912f2686a8d67074e0156e92e485))


### Bug Fixes

* **detect:** Detect `_TZB210_lmqquxus` as Tuya TS0502B https://github.com/Koenkk/zigbee2mqtt/issues/16768 ([3d90c8a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3d90c8afca9ac22b1c2bd77e290c9ca9ee712098))
* **detect:** Detect `_TZE204_r32ctezx` as Tuya TS0601_fan_switch ([#7985](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7985)) ([9c99f39](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9c99f39834cf21f2d1a6453cdd6c4c2034f11374))
* **ignore:** https://github.com/Koenkk/zigbee2mqtt.io/pull/3019 ([202a4bb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/202a4bbce48b369bf7894bdccce515db716a8e0b))
* Increase poll interval of Livolo TI0001-hygrometer and TI0001-pir to 300 seconds ([#7986](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7986)) ([1121ba1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1121ba125ae5c8e0dee26c70f89a6fc9a3a054ce))
* Rename `AEOTEC` -&gt; `Aeotec` ([#7982](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7982)) ([0502b9e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0502b9e0569bc702b92b5072a4e9b5da14fba69c))
* Rename `ubisys` -&gt; `Ubisys` and update converters for C4 ([#7981](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7981)) ([4e81c45](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4e81c459a0d41581f872f91d10df7b99eb9453b5))
* Update Danfoss 014G2461 external_measured_room_sensor description ([#7983](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7983)) ([7ec0bea](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7ec0bea0e2ef58d25586a8e7b8cf96bee19adb2c))

## [20.14.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.14.0...v20.14.1) (2024-09-12)


### Bug Fixes

* **ignore:** Fix 3RTHS24BZ exposes ([a0cf779](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a0cf779ff125b22f6bba95f6c854fbf4dc448b24))

## [20.14.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.13.0...v20.14.0) (2024-09-12)


### Features

* **add:** 929003116301, 929003116401, 929003116501, 929003116601 ([#7968](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7968)) ([c29cbf7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c29cbf7ac7a3301cb6f6f91ab85f25f6bf5ae41c))
* **add:** LST103 ([#7979](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7979)) ([622e65e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/622e65ecc3285eb5f65c6d02fbaa12a20e91d77e))
* OWON PC 321 - support clear measurement data ([#7895](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7895)) ([42a3c21](https://github.com/Koenkk/zigbee-herdsman-converters/commit/42a3c2120ed19afb99100b74258368d23fa5194b))


### Bug Fixes

* Fix `preset` value for Tuya ZWT198/ZWT100-BH ([#7966](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7966)) ([f843534](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f843534c9094c1573034b0c51620fd35b38a9eaf))
* Fix SLZB-06p7 configure failing https://github.com/Koenkk/zigbee2mqtt/issues/23918 ([5a6c1f9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5a6c1f9afe98f4bf0433185f06c64ac574447061))
* Fix Tuya energy polling not working when measurement interval is set to "" https://github.com/Koenkk/zigbee2mqtt/issues/23887 ([861f8df](https://github.com/Koenkk/zigbee-herdsman-converters/commit/861f8df48f5587a5dfb8becd8ec052f229e722a8))
* Fix Ubisys C4 integration ([#7972](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7972)) ([a699873](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a699873ae2246b460ad1be0d8a7cd95b4c33c2c3))
* **ignore:** Add more Third Reality custom clusters  ([#7969](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7969)) ([3ef88dd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3ef88dd28bcf6802f255465e07676a189e360a73))
* **ignore:** Add more Third Reality custom clusters ([#7967](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7967)) ([e24cbb0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e24cbb092455e92768e718c0c459b68b921fb906))
* **ignore:** Add more Third Reality custom clusters ([#7970](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7970)) ([cc4c516](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cc4c5168054f37ad633ee67924499bf8c161c35b))
* **ignore:** Add more Third Reality custom clusters ([#7978](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7978)) ([6c4b506](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6c4b506e60543a615902ee37a3192130ec5975aa))
* **ignore:** Improve performance when logging is disabled ([#7955](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7955)) ([decaa92](https://github.com/Koenkk/zigbee-herdsman-converters/commit/decaa92b5a8ad8ded8e2e6d7c086518f46d9a03f))
* Migrate to eslint 9 ([#7961](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7961)) ([c7b8902](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c7b89022bedfa0ec218fc7ffc9058ac7b80b19d9))

## [20.13.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.12.1...v20.13.0) (2024-09-09)


### Features

* **add:** 3RSM0147Z ([#7916](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7916)) ([0670d9f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0670d9f8b8ccd03734f5e5cd37320c5041ff2812))
* **add:** P5630S ([#7964](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7964)) ([f003373](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f003373cad3aec3e6691835ff9aba46583620e68))
* **add:** SE20-O ([#7957](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7957)) ([5e526c4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5e526c41d95d980b2af8f04c2ba380389ee99b12))


### Bug Fixes

* **detect:** Detect `_TZE200_abatw3kj` as RTX TS0601_RTX_DIN ([#7958](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7958)) ([78384a9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/78384a981af1393436f0e605700c9447e0ee39bc))
* Fix remove unsupported color from Innr RB 178 T https://github.com/Koenkk/zigbee2mqtt/issues/23911 ([822f991](https://github.com/Koenkk/zigbee-herdsman-converters/commit/822f9911fc164dd1f29ec77cccc1470f8117a287))
* Fix S1-R (5601) fingerprint ([#7959](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7959)) ([b123439](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b1234398df5bb37d6e7d1bfed7a77ca13aedcaf7))
* Fix Tuya-RB-SRAIN01 `cleaning_reminder` value ([#7953](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7953)) ([d0d8ec3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d0d8ec30df24c65fc9e05fcfc637af8a7aba4822))
* **ignore:** Fix some Tuya whitelabels ([1c61743](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1c61743e881f35de22fbfa4ad453cb68f93ce1fe))
* **ignore:** update dependencies ([#7954](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7954)) ([6f3e786](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6f3e786a76044e67a974d4a97659dbcdf4e4aa95))
* Improve compatibility with _TZ3000_303avxxt DIN rail switch ([#7965](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7965)) ([9862541](https://github.com/Koenkk/zigbee-herdsman-converters/commit/98625415e170ef812c51a9198738e3c84d1a57d4))
* Improve compatibility with _TZ3000_zjchz7pd DIN rail switch ([#7963](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7963)) ([8625590](https://github.com/Koenkk/zigbee-herdsman-converters/commit/862559017ccab08b57ee5e054ae1158097199b52))

## [20.12.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.12.0...v20.12.1) (2024-09-07)


### Bug Fixes

* **ignore:** fix e5c62b11a68e33b1877fe7f1796eba97bd72bb87 ([4097368](https://github.com/Koenkk/zigbee-herdsman-converters/commit/40973686f3eb125dbe4d9c38ee39719ccc7b62bd))

## [20.12.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.11.0...v20.12.0) (2024-09-07)


### Features

* **add:** 501.40 ([#7947](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7947)) ([ad373af](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ad373af414c56410585130b271cb188cf5413472))
* **add:** S1-R-2 ([#7915](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7915)) ([0b51cc0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0b51cc068f54da5d384cf34f1feef98a4d98e0fe))


### Bug Fixes

* Fix `Invalid Version` error when controlling TRADFRI light https://github.com/Koenkk/zigbee2mqtt/issues/23863 ([e5c62b1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e5c62b11a68e33b1877fe7f1796eba97bd72bb87))
* Fix on_off_countdown when payload had no `state` ([#7948](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7948)) ([f7b8999](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f7b8999aaf145b597f9a644fc0754708cef4adf6))
* Fix state and position access of various Tuya covers https://github.com/Koenkk/zigbee2mqtt/issues/19665 ([5429c21](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5429c21931c87ec5bf963a48fe32c3c7679f1c4c))
* Fix Zemismart ZMR4 integration https://github.com/Koenkk/zigbee2mqtt/issues/23187 ([0573499](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0573499913c2507b800a517bdc476c170dea2bec))
* **ignore:** update dependencies ([#7949](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7949)) ([b800705](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b800705aa8ddb4ef3ce68e6ad15c36034420cf38))
* Tuya RB-SRAIN01: change 'water-leak' to 'rain'; remove 'battery_low' and 'tamper' ([#7946](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7946)) ([d14b371](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d14b37116f79f7ba2b36eb1d4aa149f634812f25))

## [20.11.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.10.0...v20.11.0) (2024-09-05)


### Features

* **add:** 929003736201 ([#7941](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7941)) ([9454abc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9454abc01b8a27f49c24630d8225594bbf7e2fb8))
* **add:** RF 262 https://github.com/Koenkk/zigbee2mqtt/issues/23854 ([84b7500](https://github.com/Koenkk/zigbee-herdsman-converters/commit/84b7500d02325e7d3cff031743fa91b0aec1e91f))
* **add:** SSKT11IW-F1 ([#7940](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7940)) ([907bb12](https://github.com/Koenkk/zigbee-herdsman-converters/commit/907bb12ec9a5ad3ac9f8de718648fd1dbb079217))


### Bug Fixes

* **detect:** Detect `_TZB210_ayx58ft5` as MiBoxer E2-ZR [#23379](https://github.com/Koenkk/zigbee-herdsman-converters/issues/23379) ([#7943](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7943)) ([0246b74](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0246b742adda663f7a3bb9eb99c83e3c87f8e09c))
* Don't ignore off transition for TRADFRI bulbs with firmware 1.0.021 https://github.com/Koenkk/zigbee2mqtt/issues/23825 ([f3034ff](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f3034ffd409577f433eede8f2e700e776eb942cc))
* Fix electricityMeter modern extend showing disabled exposes https://github.com/Koenkk/zigbee-herdsman-converters/issues/7831 ([6de4a02](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6de4a02eb5556baa3ae9a488d0d5f68389481c70))
* Fix Ledvance OTA failing with `AssertionError [ERR_ASSERTION]: Size mismatch` https://github.com/Koenkk/zigbee2mqtt/issues/22687 ([7c7f454](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7c7f45434468fd4efb40ea34f694020811ca9494))
* **ignore:** cleaner fix for 7c7f45434468fd4efb40ea34f694020811ca9494 ([725cdb1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/725cdb18bc249ee0b11eabd97299b4b334e66866))
* Inovelli blue switches min/max modification ([#7944](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7944)) ([955f1c5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/955f1c5f20691007d6a044407b531a89bdd08e62))

## [20.10.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.9.0...v20.10.0) (2024-09-03)


### Features

* **add:** TS0601_din_4 ([#7932](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7932)) ([86b661b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/86b661b4e3968954a05b883944a98cb5f93641b6))
* **add:** ZA03 ([#7936](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7936)) ([2a69053](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2a690532b9851d45bdf90e4937c8ea7e14f9ca36))


### Bug Fixes

* Add `rain_intensity` unit to Tuya RB-SRAIN01 https://github.com/Koenkk/zigbee2mqtt/issues/23815 ([b3ee487](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b3ee4876d1bce6fa628f4d21090ea872324b2cdd))
* Add three phase support for modernExted electricityMeter. ([#7930](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7930)) ([f6b8786](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f6b8786915ef144e9efe9b3b4fbad108ddb97b0e))
* **detect:** Detect `_TZE200_7ytb3h8u` as GiEX GX02 ([#7935](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7935)) ([b1a0f65](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b1a0f6500cc8d3213bfef22f0a32488219fe626f))
* **detect:** Detect `HOMA1022` as HLD503-Z-CT [@mullahomes2012](https://github.com/mullahomes2012) https://github.com/Koenkk/zigbee2mqtt/issues/23826 ([4530176](https://github.com/Koenkk/zigbee-herdsman-converters/commit/453017670e7ace6c3d0c930a172b18379132bfbf))

## [20.9.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.8.5...v20.9.0) (2024-09-02)


### Features

* **add:** 1811680, 1811681 ([#7925](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7925)) ([6f70b83](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6f70b83540a5a4ee949923bd07fa884df8fc1ebd))
* **add:** 4099854295232, 4099854293276 ([#7899](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7899)) ([8ebacac](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8ebacac1ce7ea50d06dd486555521696bf7e7f66))
* **add:** SQM300Z1, SQM300Z2, SQM300Z3 ([#7928](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7928)) ([bf9c47f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bf9c47f88f50042c904f19c1d05c04f4ee782251))
* Support inching feature for various Tuya TS000X devices and cleanup definitions ([#7898](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7898)) ([a26bb89](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a26bb89ad8e24b262da4a640bf1177b398c42b22))


### Bug Fixes

* Add water leak expose to Tuya RB-SRAIN01 ([#7931](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7931)) ([c7f5aa2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c7f5aa27d299caf382666f07992c4dba3878a51e))

## [20.8.5](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.8.4...v20.8.5) (2024-09-01)


### Bug Fixes

* **ignore:** Improve typings ([#7869](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7869)) ([76f938b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/76f938b324d7feee8a7d2efec9c251d330aa4754))

## [20.8.4](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.8.3...v20.8.4) (2024-09-01)


### Bug Fixes

* **ignore:** fix 7f73aee511c6b280aad8ffc4c032e99a9375cb6c ([41477bc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/41477bcfde1bc9a2eb7251d96246c78b95c55ca8))

## [20.8.3](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.8.2...v20.8.3) (2024-09-01)


### Bug Fixes

* **ignore:** fix 7f73aee511c6b280aad8ffc4c032e99a9375cb6c ([f417096](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f4170965765547ab1eccf51daa972fa22a70eb9d))

## [20.8.2](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.8.1...v20.8.2) (2024-09-01)


### Bug Fixes

* **ignore:** fix THE01860A ([#7923](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7923)) ([403213e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/403213ef81bf0197da7dca01df1cfcca9d1d374d))
* **ignore:** Only set `noOffTransition=true` when firmware &gt; 1.0.012 https://github.com/Koenkk/zigbee2mqtt/issues/22030 ([7f73aee](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7f73aee511c6b280aad8ffc4c032e99a9375cb6c))
* **ignore:** update dependencies ([#7922](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7922)) ([70f2a29](https://github.com/Koenkk/zigbee-herdsman-converters/commit/70f2a29cebeb626b425179ac8913c4e0ea04812c))

## [20.8.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.8.0...v20.8.1) (2024-08-30)


### Bug Fixes

* Changed enum to numeric expose for counters in 'ptvo_counter_2ch' device ([#7919](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7919)) ([59dece5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/59dece551ecbc19f6e241ab3ddf38ffceafd5e76))
* **detect:** Detect `_TZE204_hcxvyxa5` as Neo NAS-AB02B2 https://github.com/Koenkk/zigbee2mqtt/issues/23529 ([a63fa20](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a63fa20ca58d829b485694372f30c8e38c96560c))
* Fix configure failing for SONOFF ZBMINI-L and ZBMINIL2 https://github.com/Koenkk/zigbee2mqtt/issues/23776 ([67682e9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/67682e9ab2ca541d7fb18be88c37e1e80f977b8b))
* **ignore:** Rename `heimanSpecificFormaldehydeMeasurement` to `msFormaldehyde` https://github.com/Koenkk/zigbee2mqtt/issues/23776 ([137028d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/137028d2e2d22a40b0f89e778c54c0b9ce97ac8a))

## [20.8.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.7.0...v20.8.0) (2024-08-29)


### Features

* **add:** THE01860A ([#7914](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7914)) ([941ad3c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/941ad3cabb9a26ece89d3cfa401bdaf27f7eaac1))
* **add:** TSKT106W-M1, SZSN325W-Q, TSKT114W-S1, NZRC106W-M2, SZT211_AW-P1, SSS401ZB-T, TZSC302W-V1, TSKT222W-H4, TCUR218W-V1 ([#7889](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7889)) ([00c1237](https://github.com/Koenkk/zigbee-herdsman-converters/commit/00c1237aac202875e348a6e1f44002860684e41c))
* **add:** VC-X01D ([#7912](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7912)) ([a9b7c26](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a9b7c265d41003e7a9f60fc23b3f97351b288697))
* **add:** ZG-103Z ([#7908](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7908)) ([89532ee](https://github.com/Koenkk/zigbee-herdsman-converters/commit/89532ee4180fbf5301837c03701f3c7ce6815253))
* Support genBinaryOutput and genBinaryInput in definition generator ([#7913](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7913)) ([8a178b6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8a178b6ce222d2ac81f7d4291674d0e6b5bafb73))


### Bug Fixes

* **detect:** Detect `_TZE204_lawxy9e2` as Tuya TS0601_fan_5_levels_and_light_switch ([#7861](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7861)) ([0fec9a6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0fec9a666f62737f2f16e6f13785d9cdbc20fbfc))
* **ignore:** `heimanSpecificFormaldehydeMeasurement` -&gt; `msFormaldehyde` https://github.com/Koenkk/zigbee-herdsman/pull/1166 ([1094069](https://github.com/Koenkk/zigbee-herdsman-converters/commit/10940691d6b9eddf4c29a0ae20bace4937b19dd7))

## [20.7.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.6.0...v20.7.0) (2024-08-27)


### Features

* **add:** ZY-M100-24GV3 ([#7909](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7909)) ([9acc033](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9acc03311711a108cf08bcd743808946a3fa908d))
* Support `auto_close_when_water_shortage` for SONOFF SWV ([#7891](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7891)) ([889d1cf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/889d1cf6fff9ae80e40bf6512b2cf71df819d05e))


### Bug Fixes

* Add unit for OWON PC321 power factor https://github.com/Koenkk/zigbee2mqtt/issues/23741 ([a9ee942](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a9ee9429e4e189935e9315c26388c2065509f0f7))
* **detect:** Detect `_TZ3000_et7afzxz` as Zemismart ZMR4 https://github.com/Koenkk/zigbee2mqtt/discussions/23753 ([c6bf57c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c6bf57c2cf220c06e301be8eb9b907c95aeb3243))
* **detect:** Detect `_TZE204_iuk8kupi` as Tuya DCR-RQJ ([#7906](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7906)) ([aa52bcd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aa52bcd09c93c930e5865742855a7d308dfee259))
* **detect:** Detect variant of Eco-dim.05 correctly ([#7902](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7902)) ([ca6dcac](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ca6dcac82eb2233eac2ff9cb9aa2a058d0f80dd7))
* Fix `state` for some Tuya covers not updating https://github.com/Koenkk/zigbee2mqtt/issues/19665 ([f25b2bc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f25b2bc4afe935fda731aa33fbaba5f9c5afb464))
* Standarize namron smart plugs ([#7907](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7907)) ([e0b3480](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e0b3480690d8f07b700f030593ad53d5caf685f7))

## [20.6.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.5.0...v20.6.0) (2024-08-26)


### Features

* **add:** 5144.01, 5144.11, 5144.21 [@senna1992](https://github.com/senna1992) https://github.com/Koenkk/zigbee2mqtt/issues/23701 ([eabbce1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/eabbce1e78ee38ff069983321bf889e7b17f0c88))
* **add:** POK009, POK010 ([#7900](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7900)) ([7d6023e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7d6023e9a74d790107716ce8e84ce4bbd7566f4e))
* **add:** PRO-900Z ([#7880](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7880)) ([abc6c63](https://github.com/Koenkk/zigbee-herdsman-converters/commit/abc6c63c2926e3924d584cb202059616f74709bd))


### Bug Fixes

* **ignore:** update dependencies ([#7897](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7897)) ([064bcf2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/064bcf2175a53bdfe1c70e9bd80bf751da4e4942))

## [20.5.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.4.0...v20.5.0) (2024-08-24)


### Features

* **add:** SNZB-01-KF ([#7888](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7888)) ([11d6f98](https://github.com/Koenkk/zigbee-herdsman-converters/commit/11d6f98f7ba0abc0f8dc0d76d0bf1a394b340814))


### Bug Fixes

* Add missing actions to 404049D [@kaiseracm](https://github.com/kaiseracm) https://github.com/Koenkk/zigbee2mqtt.io/pull/2966 ([907d5ec](https://github.com/Koenkk/zigbee-herdsman-converters/commit/907d5ec980993b8dec1d84941c16f6044ecf0215))
* **detect:** Detect `_TZE204_fwondbzy` as Moes ZSS-QY-HP ([#7892](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7892)) ([fbab353](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fbab35328890ccce730723e196064667282d0ab2))
* **detect:** Detect `_TZE204_yvx5lh6k` as Tuya TS0601_air_quality_sensor https://github.com/Koenkk/zigbee2mqtt/issues/23559 ([8d7f1c4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8d7f1c4aa7c253646fef7603bb1e07a307d64349))
* Fix 3RDTS01056Z power source https://github.com/Koenkk/zigbee2mqtt/issues/23694 ([bf34dbb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bf34dbb962c3411f1c0a595a7b9182cab14cd803))
* Fix some commands send to wrong endpoint when using modernExtend ([#7896](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7896)) ([c877514](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c877514a2a04f38f2dca52346da277296ed02b0c))
* **ignore:** fix 5a3af85dd57a008fab09134207d403d5745bd34c ([8455cf3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8455cf3945b20dc9864a732a3a8f7d7dccf7ac63))
* **ignore:** Use `noOffTransition` for all IKEA lights https://github.com/Koenkk/zigbee2mqtt/issues/19211 ([8085c5e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8085c5e14e1eb67ead5150bcd4f94a05e4a3c896))
* Support endpoint for window covering modernExtend https://github.com/Koenkk/zigbee-herdsman-converters/pull/7889 ([5a3af85](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5a3af85dd57a008fab09134207d403d5745bd34c))

## [20.4.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.3.0...v20.4.0) (2024-08-21)


### Features

* **add:** STB3L-125-ZJ ([#7893](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7893)) ([805d9e0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/805d9e074c1815d9edf4915bf556d49916914754))
* **add:** THS317-ET-TY https://github.com/Koenkk/zigbee2mqtt/issues/19804 ([6801823](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6801823cc26b7f16461d6671101fd3b842c4783d))
* Enable on/off  countdown for AutomatOn AUT000069 ([#7877](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7877)) ([21b8a99](https://github.com/Koenkk/zigbee-herdsman-converters/commit/21b8a99735bd021679534fcfd94bd3d5b564e4c1))


### Bug Fixes

* Adjust battery % calculation for CSM-300ZB_V2 ([#7887](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7887)) ([7b89352](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7b89352f4caf747919a6a95af10fd037a39fd263))
* **detect:** Detect `_TZ3000_kky16aay` as Tuya TS0222_temperature_humidity ([#7886](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7886)) ([893fd74](https://github.com/Koenkk/zigbee-herdsman-converters/commit/893fd745f7fa3a24f6248981581ea6ea4bdf203c))
* **detect:** Detect `_TZE204_xnbkhhdr` as Tuya ZWT198/ZWT100-BH https://github.com/Koenkk/zigbee2mqtt/issues/23611 ([8705f77](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8705f77d83dcfa42e9ccc3ad284070abcf7cff00))
* **detect:** Detect `C-ZB-DM204` as Candeo C204 ([#7882](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7882)) ([5c27f3f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5c27f3f02320c88f8cbdb34085bb35a300a33c21))
* **ignore:** change meta "last_event1" to "last_event" (TOQCB2-80) ([#7883](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7883)) ([636c27f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/636c27f57360cc4c8bf00a2eba38dc64a1b0f9e5))
* **ignore:** improve 6801823cc26b7f16461d6671101fd3b842c4783d ([322f4e1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/322f4e1f6141d004ed3b0162733675e3f7388706))
* Rename `Owon` to `OWON` ([#7885](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7885)) ([f838130](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f838130346c1ab6a70412e13db012f7fe900fa8e))

## [20.3.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.2.0...v20.3.0) (2024-08-19)


### Features

* **add:** 929003666701 ([#7874](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7874)) ([863e2aa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/863e2aa9878826072729e1f305c589486ab61bff))
* **add:** 929003823701 ([#7863](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7863)) ([86cb1dc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/86cb1dcef9691826ed38e767d915c6cf05906792))
* **add:** AB390020055 ([#7851](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7851)) ([ecbba70](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ecbba700ed411c1029ba954ac9f01193f4a1b566))
* **add:** D4Z ([5878016](https://github.com/Koenkk/zigbee-herdsman-converters/commit/58780162e2fb0efe1ce4bd2ffeb3d73162f9a2e6))
* **add:** ROB_200-070-0 ([#7876](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7876)) ([4b1cc51](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4b1cc516650b7c1bc686457c8e7ebd25dbd933d1))


### Bug Fixes

* Add "off" system mode to Vimar 02973.B. ([#7875](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7875)) ([3c46c9f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3c46c9fd53113f72a3d12c17faff35eefb85ceae))
* **detect:** Detect `_TZ3000_prits6g4` as Tuya TS0001_switch_module ([#7868](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7868)) ([294b41c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/294b41c66bdff3842bcce708ba038dcfe67851ec))
* **detect:** Detect `_TZ3000_zjchz7pd` as Immax 07573L ([#7870](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7870)) ([99defa3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/99defa3625f750263892fa5ba8d367c62e8b7a67))
* Fix IKEA E2013 contact not updating ([#7866](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7866)) ([112abd1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/112abd1f543c0f71590639c39a3034ca843b55ab))
* Fix IKEA E2202 not reporting water leak ([#7865](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7865)) ([b524c39](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b524c39dbebcf32a8912e53820bca3bd362989ea))
* Fix negative readings for several Tuya TS0601 power meters https://github.com/Koenkk/zigbee2mqtt/issues/18603 ([f7dfbc4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f7dfbc4dcd9c8744973a3536d43893faae643fa3))
* Fixes for ELKO Super TR + ctm_thermostat ([#7871](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7871)) ([d37d7a3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d37d7a3e53b5ac99e27937e401a2d268c5cc450a))
* Ignore identify cluster for definition generator ([#7864](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7864)) ([5c92fca](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5c92fca6c8f1186d0d8414c8bd86cd2c42b29651))
* **ignore:** Fix switched lookups, remove redundant manuSpecificLumi control ([#7859](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7859)) ([bbea11d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bbea11d6be2366f841c2fc56e45f9b51f2b60787))
* **ignore:** update dependencies ([#7867](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7867)) ([2b939f5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2b939f531128544a2941324b2a576e2b1265480e))
* Improve Gledopto GL-D-013P support ([#7860](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7860)) ([fc114fe](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fc114fe93af75f8620248c9766f97274ba597e38))
* Update Gledopto Pro LED controllers to standard light ModernExtend ([#7872](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7872)) ([9fbb603](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9fbb6034de6b944b31b3919a9673026031f1558c))

## [20.2.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.1.1...v20.2.0) (2024-08-15)


### Features

* **add:** ZNCLDJ01LM ([#7848](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7848)) ([f5ab382](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f5ab382fda22b30057604f4bf7d0e5633f3044d1))


### Bug Fixes

* **detect:** Detect `_TZ3000_qlmnxmac` as Tuya TS011F_2_gang_wall https://github.com/Koenkk/zigbee2mqtt/issues/23542 ([7a48ca8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7a48ca8a19f53683ab7fca215af7344a3b975e98))
* **detect:** Detect `_TZE200_moycceze` as Immax 07505L ([#7855](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7855)) ([f223c73](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f223c73574d2d647a32a7977db89f3b609abc02b))
* **detect:** Detect `_TZE204_lawxy9e2` as Tuya TS0601_fan_and_light_switch ([#7857](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7857)) ([8fc79a3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8fc79a3f8faa77bdb000687f3aac37329cc6e813))
* **detect:** Detect `AG0002` as Lanesto 322054 https://github.com/Koenkk/zigbee2mqtt/discussions/23600 ([d718546](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d718546ccb991f30fdb733c2ef450982854ba78b))
* Fix Lonsonho QS-Zigbee-C01 `calibration_time` https://github.com/Koenkk/zigbee2mqtt.io/pull/2936 ([e8d133a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e8d133a97f3049f3206e6ab85435592ec9ebae92))
* **ignore:** Add `noOffTransition` to more IKEA bulbs https://github.com/Koenkk/zigbee2mqtt/issues/22030 ([ce092ee](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ce092ee34ff793291236fa8db8002f3d2dddfaed))

## [20.1.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.1.0...v20.1.1) (2024-08-13)


### Bug Fixes

* **ignore:** fix c6193181845cf95d832ff1522114408bcfaedeb9 ([9ff4359](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9ff4359d36490f18362d75b5b3c02889753fd0eb))

## [20.1.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v20.0.0...v20.1.0) (2024-08-13)


### Features

* **add:** E8 ([e56b539](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e56b539e718859d1eab3a60985f86c4e93973b54))


### Bug Fixes

* **detect:** Detect `TRADFRI bulb E17 WS candle 440lm` as IKEA LED1835C6 ([#7852](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7852)) ([e898f03](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e898f0303cd55d3fedc810a9e6e315e98dd55333))
* Fix `illuminance` value incorect for Tuya ZG-205Z/A https://github.com/Koenkk/zigbee2mqtt/issues/23496 ([7929df0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7929df08f49c66603828dbff222b41fe8ed72369))
* Fix some IKEA lights turning ON when receiving OFF if already OFF https://github.com/Koenkk/zigbee2mqtt/issues/22030 ([c619318](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c6193181845cf95d832ff1522114408bcfaedeb9))

## [20.0.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.75.0...v20.0.0) (2024-08-12)


### ⚠ BREAKING CHANGES

* **ignore:** Document breaking change

### Features

* **add:** 84870054 ([#7845](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7845)) ([790e07c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/790e07c561935c01e76f4771d91c8eb3781fc0c3))
* **add:** CSP042 ([#7842](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7842)) ([d9db2d8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d9db2d8a831bcacd6a5da628a4e692c3985a79c1))
* **add:** PN6 ([#7840](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7840)) ([95e581e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/95e581edb5b1b901b061ce5e0bda0afc85fc9db3))
* **add:** RB-SRAIN01 https://github.com/Koenkk/zigbee2mqtt/issues/23532 ([805f5a4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/805f5a46cc6bfdf93ac392aebfb6258fa8242fb7))
* **add:** ZM90E-DT250N/A400 @StevenBoelhouwer https://github.com/Koenkk/zigbee2mqtt/issues/23576 ([ae2f706](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ae2f706898bde0fa7bcf4bf067b9955d9e549aab))
* **add:** ZWSH16 ([#7844](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7844)) ([a3282e6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a3282e62006868fc0b075718d4d6da092bea01ce))
* **ignore:** Document breaking change ([6e96d84](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6e96d847ddf633725108c08ddfcd6088a9fe3a71))


### Bug Fixes

* **detect:** Detect `_TZE204_m1wl5fvq` as Tuya TS0601_cover_1 ([#7849](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7849)) ([0afa501](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0afa501f78ba027d7aa4cce6401dcd02ab3d8632))
* **detect:** Detect `_TZE284_znvwzxkq` as Tuya TS0601_dimmer_3 https://github.com/Koenkk/zigbee2mqtt/issues/23581 ([cdd05b1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cdd05b1c42be371736a7ece4cb948a96d5cdbafe))
* Fix Ledvance/OSRAM/Sylvania OTA broken for some models https://github.com/Koenkk/zigbee2mqtt/discussions/23534 ([d28d199](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d28d1994b84aad59c044e3445215fd2d2c77b680))
* Fix Tuya ZY-M100-24GV2 sensitivity divided by 10 https://github.com/Koenkk/zigbee2mqtt/issues/23582 ([b316973](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b3169739e07ee6ffa90da93d21eefe78bb046d07))
* **ignore:** update dependencies ([#7847](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7847)) ([b182c7b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b182c7b3cc71c7777fa05cac300049c01fe456f1))

## [19.75.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.74.0...v19.75.0) (2024-08-08)


### Features

* **add:** TS0001_switch_module_2 ([#7832](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7832)) ([35ffe00](https://github.com/Koenkk/zigbee-herdsman-converters/commit/35ffe00680b344f9ff317bb68f1f15680346aa84))


### Bug Fixes

* Add back TS110E_1gang_1 ([#7781](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7781)) ([51a6890](https://github.com/Koenkk/zigbee-herdsman-converters/commit/51a689073cd9479615a77bf7510492302d602b24))
* Allow toZigbee converter to match on any key https://github.com/Koenkk/zigbee2mqtt/issues/23485 ([36e7440](https://github.com/Koenkk/zigbee-herdsman-converters/commit/36e7440a4fa34b6757ce534771408d5fa0360db5))
* Convert ELKO 4523430 to use modern extend syntax ([#7839](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7839)) ([432fda5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/432fda5492c786ca02e2e0ceaf5046992235746d))
* **detect:** Detect `_TZ3000_v4l4b0lp` as Tuya TS0003_switch_3_gang_with_backlight ([#7833](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7833)) ([aa0d4ef](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aa0d4ef336f954f461d3e3f54557d23a2161d192))
* **detect:** Detect `_TZE204_bxoo2swd` as Tuya ZM-105B-M ([#7835](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7835)) ([104dde6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/104dde61a7dafc8a1586c257f7b1d2a4b3085751))
* **detect:** Detect `_TZE608_fmemczv1` as Tuya TS0603 ([#7834](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7834)) ([701b725](https://github.com/Koenkk/zigbee-herdsman-converters/commit/701b725b83cd538228aaa70033419e8c89ed1247))

## [19.74.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.73.1...v19.74.0) (2024-08-06)


### Features

* Make Lupus 12126 and 12127 OTA capable ([#7817](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7817)) ([bef6ae0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bef6ae06444ba77534c3406f519f3ba4573fe9e8))


### Bug Fixes

* **detect:** Detect `_TZE204_khx7nnka` as Tuya XFY-CGQ-ZIGB https://github.com/Koenkk/zigbee2mqtt/issues/23506 ([ab780c9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ab780c96a19bbc0d948b57f5b8440fb3a98d0a70))
* Fix electricity meter exposes of AEOTEC ZGA003 ([#7829](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7829)) ([36d662e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/36d662e7238867d0a8de6ae26510164f506d9de8))
* **ignore:** update dependencies ([#7825](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7825)) ([ef2f515](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ef2f5151e80227c0d9f638a7b03becebcaf309d2))
* Remove unsupported `battery_low` from SONOFF SNZB-03P https://github.com/Koenkk/zigbee2mqtt/issues/23522 ([00d5851](https://github.com/Koenkk/zigbee-herdsman-converters/commit/00d58514f9741a295eb23f368d35fed4dbd2cec3))

## [19.73.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.73.0...v19.73.1) (2024-08-05)


### Bug Fixes

* Add read-write interfaces for private cluster in 3RSNL02043Z ([#7827](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7827)) ([43e2610](https://github.com/Koenkk/zigbee-herdsman-converters/commit/43e26101d84cef9e68737f8856b28cfe4f617717))
* **detect:** Detect `_TZE204_dwcarsat` as Tuya TS0601_smart_air_house_keeper https://github.com/Koenkk/zigbee2mqtt/issues/23410 ([ffc3919](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ffc3919f0a899f70d1164ac6fa8442e016124214))
* Fix battery % multiplied by 2 for ROBB ROB_200-009-0 https://github.com/Koenkk/zigbee2mqtt/issues/23519 ([6733f6f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6733f6f773a8e1260465d58a5c11c5e7cc73baa6))
* Fix configure failing for some Hue light which support gradient ([#7814](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7814)) ([e841249](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e8412498e258c21959544d6370dca1c468aa6404))
* **ignore:** add test for e8412498e258c21959544d6370dca1c468aa6404 ([96d4be5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/96d4be563c509150913096ce0fda7352824bbf4c))
* **ignore:** fix e8412498e258c21959544d6370dca1c468aa6404 ([4f10a79](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4f10a79da513f3b573994df86a0201ca577d286a))

## [19.73.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.72.0...v19.73.0) (2024-08-03)


### Features

* **add:** 929003666501 ([#7819](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7819)) ([b7e21e2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b7e21e2af4bc45e62f44c74f3ab46e8b928d2084))
* **add:** TS0601_soil_3 ([#7815](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7815)) ([a8cae46](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a8cae4697a0cf49a4bbeba88f9581b6cc7a90cbb))
* **add:** ZC0101 [@vkanev](https://github.com/vkanev) https://github.com/Koenkk/zigbee-herdsman-converters/pull/7767 ([173472a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/173472ae752de1fd413da24ce493bad3b40a29ae))


### Bug Fixes

* **detect:** Detect `_TZ3000_ikuxinvo` as Tuya TS0001_power https://github.com/Koenkk/zigbee2mqtt/issues/23471 ([1f6431b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1f6431b79cd5b67abb0c9f2b122c34132e690307))
* **detect:** Detect `_TZ3000_kxlmv9ag` as Tuya TS0207_repeater @MartinNeurol https://github.com/Koenkk/zigbee2mqtt/issues/23458 ([29d0348](https://github.com/Koenkk/zigbee-herdsman-converters/commit/29d0348af5b4cf11beb56a8c3bfd308babcff1ea))
* **detect:** Detect `_TZE200_libht6ua` as Tuya TS0601_cover_6 ([#7821](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7821)) ([88f7ce7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/88f7ce70c9ba627fa2fe1988f21e776f12a988b8))
* Fix Tuya TS0601_soil_2 datapoint mappings ([#7816](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7816)) ([8b2b0c0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8b2b0c010b4362cfa604b6f51efa78cab0be848e))
* Inovelli - Adding custom device specific cluster to converter ([#7822](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7822)) ([4dc632c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4dc632c8d315a722e16870805bae6acf0cc8b240))
* Remove unsupported color_xy from Sengled Z01-A19NAE26 https://github.com/Koenkk/zigbee2mqtt/issues/23462 ([8e066c1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8e066c10f9e8ff78c51b15640bc50b57477b905f))
* Update Aqara WS-EUK03 power measurement ([#7818](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7818)) ([88f482a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/88f482adb864e4d3e0263dc9dc18fda2125f55c0))

## [19.72.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.71.1...v19.72.0) (2024-08-01)


### Features

* **add:** CSP043, CSP051 ([#7798](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7798)) ([56e2820](https://github.com/Koenkk/zigbee-herdsman-converters/commit/56e2820613d1646af62610b7db3b952da0ca8782))
* **add:** NAS-WV05B2-L, NAS-WV05B2, NAS-STH02B2 ([#7812](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7812)) ([caea2cf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/caea2cfc9f5cb47a88da1d14bdf3bef77c262019))
* **add:** SLZB-06 https://github.com/Koenkk/zigbee2mqtt/issues/23442 ([4e0bec8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4e0bec8ff3fa96bc262befa16402968f5e89b114))
* **add:** TS0502C ([#7804](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7804)) ([d8b3142](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d8b31428be4275d3b52f7bc7d4de5886eebdfc50))


### Bug Fixes

* **detect:** Detect `_TZ3000_cpozgbrx` as PSMART T461 ([#7796](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7796)) ([97f8236](https://github.com/Koenkk/zigbee-herdsman-converters/commit/97f8236ec184a3b5df09adca1168868deceaaa91))
* **detect:** Detect `_TZE204_fwondbzy` as Tuya TS0601_smart_human_presence_sensor_1 ([#7801](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7801)) ([9a2340a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9a2340a37aec7c3ba4cf5cd6afe151605fdf3f94))
* **detect:** Detect `_TZE204_myd45weu` as Tuya QT-07S ([#7811](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7811)) ([dc6eb59](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dc6eb59d6f32ef22c64e1a5a83074b0f4fafa439))
* Fix `illuminance` multiplied by 100 for Tuya ZG-205Z/A https://github.com/Koenkk/zigbee2mqtt/issues/19803 ([1a923cf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1a923cf8c359483446873f5445e2607a208808c6))
* Fix `manuSpecificUbisysDimmerSetup` cluster ID ([#7809](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7809)) ([9f009e4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9f009e431dc8264cd4d3a697537710f6d0613009))
* Fix configure failing for Tuya TS0205 https://github.com/Koenkk/zigbee2mqtt/issues/22421 ([c6d0b49](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c6d0b49d6162503c84585a565dd7292d26c571d3))
* Fix no `occupancy` for WB-MSW-ZIGBEE v.4 ([#7800](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7800)) ([2de3432](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2de3432521cd9bfe7731bfd290abb02ca35a740b))
* Fix no converter available errors for Tuya TOQCB2-80 ([#7810](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7810)) ([042edd0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/042edd0ac64e956a8526ce0eed73fdf54115a3dd))
* **ignore:** update dependencies ([#7806](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7806)) ([bbe1858](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bbe18586cd13b500a7d97a5d177744f4e236b50c))
* Increase max Tuya BLE-YL01 `ec_max` value https://github.com/zigbee2mqtt/hassio-zigbee2mqtt/issues/630 ([632a268](https://github.com/Koenkk/zigbee-herdsman-converters/commit/632a268a7b60c996ef55d552a523941c1d55d116))
* lumiOutageCountRestoreBindReporting sometimes stuck ([#7805](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7805)) ([bc57b14](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bc57b149f7be1c133764225924c71609e52cb8e7))
* Support `endpointNames` for `electricityMeter` https://github.com/Koenkk/zigbee2mqtt/discussions/23419 ([bc9dce7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bc9dce75ad8785bd8ae8822f50cea7c3adaadc2f))

## [19.71.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.71.0...v19.71.1) (2024-07-23)


### Bug Fixes

* **ignore:** Fix `_colorTempRangeProvided` added to exposes when running in Jest tests ([444910e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/444910e1957b9c89f56199da7c1e292037efc4fa))

## [19.71.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.70.0...v19.71.0) (2024-07-23)


### Features

* **add:** 10454470 ([#7795](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7795)) ([775eb63](https://github.com/Koenkk/zigbee-herdsman-converters/commit/775eb63dad43f06efd0563faf3e3b2af64dc3ac9))
* **add:** NAS-WV03B2 ([#7790](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7790)) ([e9bebcb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e9bebcbac050362f2bd1ff79c1a056ee05d1b3fb))
* **add:** TQL25-2211 ([#7792](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7792)) ([514a0b0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/514a0b040b37711a152dc7767f0a7c6cae1dbabb))
* **add:** WZ-M100 ([#7782](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7782)) ([725b8af](https://github.com/Koenkk/zigbee-herdsman-converters/commit/725b8af56379d1b58c1f404ab867d85efabeb7a5))


### Bug Fixes

* Add `quadruple` to Aqara WXKG13LM ([#7793](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7793)) ([ba77829](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ba77829cde52ac8ab0d4f950c6c27bc6e7a7bac1))
* Add typing for battery voltage ([#7786](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7786)) ([4ad862e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4ad862eb05559826a4723119dba7b5acbc9831b7))
* **detect:** Detect `_TZ3000_egvb1p2g` as Moes ERS-10TZBVB-AA ([#7780](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7780)) ([1f1c553](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1f1c553b9ce1c6bab4f53f365c0feba7cf66515b))
* **detect:** Detect `_TZ3000_mgusv51k` as Tuya FS-05R ([#7791](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7791)) ([e90a15c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e90a15ce50d2cd08c4dcb5bfdd85d8d612410512))
* **detect:** Detect `_TZE200_2vfxweng` as Tuya TS0601_cover_10 ([#7789](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7789)) ([f99e884](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f99e8846360bfd06d6fac7e85f4a95e96cf15fbc))
* **detect:** Detect `_TZE204_mby4kbtq` as Tuya TS0601_gas_sensor_4 https://github.com/Koenkk/zigbee2mqtt/issues/20991 ([6e19776](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6e197760bdde4398a73f0b98fe904b547e14015b))
* Fix configure of `HESZB-120` failing with Ember https://github.com/Koenkk/zigbee2mqtt/issues/22492 ([9ede78a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9ede78a950d703dac4e60271e08dabf7808661e6))
* Fix duplicate actions for various Tuya TS004X devices https://github.com/Koenkk/zigbee2mqtt/issues/22416 ([102ed47](https://github.com/Koenkk/zigbee-herdsman-converters/commit/102ed4723df2c076382dd0627827c760d1ab9b30))
* Fix Tuya TS0601_smart_air_house_keeper `voc` unit https://github.com/Koenkk/zigbee2mqtt/issues/23362 ([c192bbd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c192bbd21792b9699832c0d12c232d6013cffd84))
* **ignore:** Fix tests for Windows ([#7788](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7788)) ([07bf729](https://github.com/Koenkk/zigbee-herdsman-converters/commit/07bf72933ef3e9a491ed5a8daba7f1aa3333ff7f))
* **ignore:** Remove some unecessary string concatenations ([423305d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/423305d36cba7bf45d158b2025fa832e9b023668))
* **ignore:** update dependencies ([#7787](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7787)) ([23acfc6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/23acfc6af899a8537b948824b0155421125059dc))

## [19.70.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.69.0...v19.70.0) (2024-07-16)


### Features

* **add:** 4512707 https://github.com/Koenkk/zigbee2mqtt/issues/22400 ([f270434](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f2704346e27431ae3f77c398e4f434c88adec149))
* **add:** D160-ZG ([#7763](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7763)) ([5fd150e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5fd150ea2f3652f8812f30e4ffdbcbc7cbe887b1))
* **add:** ZC0101 ([#7767](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7767)) ([982dc21](https://github.com/Koenkk/zigbee-herdsman-converters/commit/982dc219119f881c6df482724a89be61f8858c52))


### Bug Fixes

* Fix wrong vendor name and model for `_TZE204_ztqnh5cg` ([#7774](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7774)) ([e8537e9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e8537e93e72e4f61de6a9833afefb64ee1a81acc))
* **ignore:** Add `pm1` expose ([#7773](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7773)) ([bdd715e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bdd715e16b05171a6eb696db71a7e194e746edbc))
* Sonoff TRV: move superfluous entities from sensors device category ([#7772](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7772)) ([1644634](https://github.com/Koenkk/zigbee-herdsman-converters/commit/16446345f4a32493de9c269fa478a8fb4ddcfd0b))

## [19.69.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.68.0...v19.69.0) (2024-07-15)


### Features

* **add:** 83633205 ([#7762](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7762)) ([74026d7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/74026d7c0e81ef5e35ee8bca9fbaffcd52275a98))
* **add:** 9290037121 ([#7766](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7766)) ([bef5a1d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bef5a1d7f40f708c3cd0fadb7c25df31b8ba5c2c))
* **add:** GL-MC-002P ([#7768](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7768)) ([084443a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/084443a600595a988b7ef53c6d61efc47b49c16c))


### Bug Fixes

* **ignore:** update dependencies ([#7771](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7771)) ([b5a118a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b5a118a23c54111f285a6cad6b9ad5aea305e62c))

## [19.68.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.67.0...v19.68.0) (2024-07-13)


### Features

* **add:** MCT-302 SMA ([#7759](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7759)) ([fc6fd20](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fc6fd20c8730b32ea1c382539d024eb9cf04a679))
* **add:** POK001, POK002_POK007, POK003, POK004, POK005, POK006, POK008, POK011 ([#7758](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7758)) ([63dc05f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/63dc05f79530690fc9d4241c08a3b71c425a7803))
* **add:** TOB9Z-M ([#7761](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7761)) ([81683bf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/81683bfbcebed3b5bf4b17f02cf83dfce305fc22))
* **add:** ZG-205Z ([#7756](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7756)) ([23336fe](https://github.com/Koenkk/zigbee-herdsman-converters/commit/23336fec5e7b15d9eb20f97ba0225c54e9095934))
* Ubisys H1 open window support ([#7764](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7764)) ([d8dcfcb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d8dcfcb43cd956897f7f053a9908cae431a70adb))


### Bug Fixes

* **detect:** Detect `_TZE200_sbyx0lm6` as Tuya MTG075-ZB-RL https://github.com/Koenkk/zigbee2mqtt/issues/23337 ([3e77af0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3e77af04e2a6e81843edd69223e3707acee12923))
* **detect:** Detect `RH0039` as Lanesto 322054 @JoostV https://github.com/Koenkk/zigbee2mqtt/discussions/23322 ([10c51b4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/10c51b47ebf3637fe902ed03698c767c5dc49103))
* Migrate more to modernExtend for Develco devices ([#7711](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7711)) ([65a0d08](https://github.com/Koenkk/zigbee-herdsman-converters/commit/65a0d087ca194299085cce6041c2709e0cdf27d0))
* Rename `TB26-1` to `TB26-3` https://github.com/Koenkk/zigbee2mqtt/issues/23336 ([f8fea48](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f8fea48e4a0c01586b5e8e3982b401d9bb49b1a7))

## [19.67.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.66.0...v19.67.0) (2024-07-11)


### Features

* **add:** AE 262 https://github.com/Koenkk/zigbee2mqtt/issues/23318 ([1d35a97](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1d35a97a0e018fade53710931574fe0c4946973f))
* **add:** TS0601_cover_10 [@ajgon](https://github.com/ajgon) https://github.com/Koenkk/zigbee2mqtt/discussions/19635 ([9446716](https://github.com/Koenkk/zigbee-herdsman-converters/commit/94467162420380dc8f5b8ca6d8e9ccb3fc4353c7))


### Bug Fixes

* **detect:** Detect `_TZ3000_hzlsaltw` as Tuya TS0001_power https://github.com/Koenkk/zigbee2mqtt/issues/23143 ([30a972e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/30a972e19148c6f3c60615a7feb23ca3854be2c3))
* **detect:** Detect `_TZE200_wktrysab` as Tuya TS0601_switch_8 https://github.com/Koenkk/zigbee2mqtt/issues/23315 ([23aeb42](https://github.com/Koenkk/zigbee-herdsman-converters/commit/23aeb427813172d232ef85bade556a6d73fd9d43))
* Fix `getFromLookup` when retrieved value is `null` https://github.com/Koenkk/zigbee2mqtt/issues/21357 ([1d71b43](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1d71b43ab6c04303e765787a6ff477401f806f5c))
* Fix Lumi ZNJLBL01LM position incorrect when device restarts https://github.com/Koenkk/zigbee2mqtt/issues/23056 ([371b6ac](https://github.com/Koenkk/zigbee-herdsman-converters/commit/371b6ac1e241956d3883c6ca58ce0a21137c14b5))
* Fix missing color command for ZG2858A ([#7757](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7757)) ([fed7357](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fed7357be3798a53a31aee35bfd5769c993e045d))
* **ignore:** Update tuya.ts ([#7755](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7755)) ([0f09176](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0f0917687d962efcca7788ac392d32fe76afdc16))

## [19.66.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.65.0...v19.66.0) (2024-07-09)


### Features

* **add:** SmartShades3 [@ratsept](https://github.com/ratsept) https://github.com/Koenkk/zigbee2mqtt/issues/23287 ([6eeb4a9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6eeb4a9cb510779873c53ff6b6a6379fed83e08d))
* **add:** TOQCB2-80 ([#7752](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7752)) ([61dcfc8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/61dcfc82387fbaf2b672c6e4badb6e5f1400650b))
* **add:** ZMR4 ([#7734](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7734)) ([c0cd207](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c0cd2072e0eadc345d1a48cb3432241e6a10081a))
* **add:** ZY-M100-S_3 ([#7742](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7742)) ([2cd4283](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2cd4283d7c102eb63461da255489bae05c534294))
* Make 6735/6736/6737 state poll interval configurable and default to 60 seconds https://github.com/Koenkk/zigbee-herdsman-converters/issues/7733 ([6f5707b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6f5707bff5f79bc8c6c7dc1b78c9b4d8a4d0f607))


### Bug Fixes

* **detect:** Detect `_TZ3000_ypgri8yz` as Girier ZB08 ([#7744](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7744)) ([56fc8a4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/56fc8a42a1973887efa390c5d23c8a9102df8961))
* **detect:** Detect `_TZE204_gbagoilo` as TS0601_switch_1_gang and `_TZE200_qanl25yu` as TS0601_fan_and_light_switch ([#7751](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7751)) ([7572c9f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7572c9f8516a76ba9691ee470675b6c1f66b4915))
* **detect:** Detect `LH05121` as Konke TW-S1 [@serot23](https://github.com/serot23) https://github.com/Koenkk/zigbee2mqtt/issues/23268 ([ba04002](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ba04002f9b2e110d1d3f8f962163796d999c4409))
* Fix AEOTEC ZGA002 state, voltage, power, current and energy postfix ([#7745](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7745)) ([1c04b56](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1c04b56b8d6ce505ac339008857ff95e66eced92))
* Fix Lidl FB20-002 not sending on action after triggering it once https://github.com/Koenkk/zigbee2mqtt/issues/6509 ([1fe26bb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1fe26bb1ed52f10ab7c7a7b219d500476f852958))
* Ignore reported battery % if battery % is computed from voltage ([#7681](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7681)) ([3ffbe2f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3ffbe2f59c0becbe21bef68d452232caa51f9f25))
* **ignore:** update dependencies ([#7746](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7746)) ([6612be1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6612be1c2c58701c70772c414e86bb04e1611fe7))
* ZigbeeTLc: Adjust parameter scaling to ZigbeeTLc firmware v1.2.2 ([#7753](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7753)) ([ab8e0e8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ab8e0e8d61144d4ebe5bf0d3765308cd1f3f0199))

## [19.65.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.64.0...v19.65.0) (2024-07-06)


### Features

* Support `silene` for Tuya PA-44Z ([#7743](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7743)) ([47f0dc3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/47f0dc36e07f83cab38f2af2e31607a48fbf030f))


### Bug Fixes

* Add `noise_level` for Livolo TI0001-illuminance ([#7727](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7727)) ([97a7c78](https://github.com/Koenkk/zigbee-herdsman-converters/commit/97a7c784a83c6d74818ab59c769a932cca4f52ed))
* **detect:** Detect `_TZ3000_mq4wujmp` as Moes ZWV-YC ([#7739](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7739)) ([b39ffe8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b39ffe8c1768fca232243c81e6c194ee6665cb20))
* **detect:** Detect `_TZ3210_hquixjeg` as LEDRON QS-Zigbee-D04 ([#7740](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7740)) ([7d5bfc2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7d5bfc24b72f2288910fc472e3fe1d21ff37001c))
* **detect:** Detect `_TZE284_sgabhwa6` as Tuya TS0601_soil_2 ([#7741](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7741)) ([a161ed3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a161ed3a0b64d4c8ea87edeed9fbdc334a010757))
* **detect:** Detect `LXN56-0S27LX1.3` as Nue / 3A HGZB-20-UK ([#7732](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7732)) ([8dcbe19](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8dcbe1981efbf70d80b3c93b359b7951331cff69))
* Fix all channel trigger simultaneously for Zemismart ZMO-606-S2 ([#7726](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7726)) ([78dcd9d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/78dcd9d370f5d45ace64a37ee760fa28b18f72aa))
* Fix Home Assistant discovery for various switches https://github.com/zigbee2mqtt/hassio-zigbee2mqtt/issues/519 ([49ac786](https://github.com/Koenkk/zigbee-herdsman-converters/commit/49ac786b37d479f7606a55c6326e067277b6dc3b))
* Fix TS130F calibration_time access ([#7738](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7738)) ([4a81f8c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4a81f8cf5ea7e1562b1b337a1c4360ae378ea071))
* Fix ZigDC inputs action ([#7736](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7736)) ([7723ecb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7723ecbc780e80fbac822333f4ac3efa8043bbf5))
* **ignore:** revert 48dbf83 ([08e9e94](https://github.com/Koenkk/zigbee-herdsman-converters/commit/08e9e94f8c7f82ce0d00614efe3eacdfb8a29fd6))

## [19.64.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.63.0...v19.64.0) (2024-07-03)


### Features

* **add:** D10110_1 https://github.com/Koenkk/zigbee2mqtt/issues/21924 ([029257d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/029257dda6bf586eb3f3dd0340ba99a7df71a1b9))
* **add:** MUR36014 ([#7721](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7721)) ([18acd00](https://github.com/Koenkk/zigbee-herdsman-converters/commit/18acd00bbbe6e4b228ae59a6f6fc5e4e6a275c4c))


### Bug Fixes

* **detect:** Detect `_TZE200_libht6ua` as Tuya TS0601_cover_1 ([#7730](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7730)) ([bb5a8c9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bb5a8c90619ad79764797bed838a829699b9940c))
* Fix configure failing for various LifeControl MCLH-0X devices https://github.com/Koenkk/zigbee2mqtt/issues/22809 ([e73f434](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e73f434f57aba6f61106f2bdb9c6449551d0d711))
* **ignore:** Fix fingerprint.modelID for E2006 ([#7728](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7728)) ([4a97f4f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4a97f4f0c5332b74708fd03e88c23e847e00cb60))
* Improve battery % calculation for Tuya TS0203 and WSD500A ([#7725](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7725)) ([9b6f729](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9b6f7297be0e7403bb531ae50e5f8797523d350e))

## [19.63.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.62.0...v19.63.0) (2024-07-02)


### Features

* **add:** 31154 https://github.com/Koenkk/zigbee2mqtt/issues/23228 ([3928ffe](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3928ffe0058f804cc3d93a569527207b1e64857d))
* **add:** E2006 ([#7717](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7717)) ([91338b6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/91338b6dba8a2061214e7b823019456d175e266c))
* **add:** RT_ZCZ03Z ([#7722](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7722)) ([f976fee](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f976fee8941250ab2718f810ed9a2db66132e349))
* **add:** YMC420-W ([#7719](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7719)) ([7df9894](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7df9894acb4b904cc1f5a3799d9798ec86eb0edd))
* Expose deviceRunTime for STARKVIND air purifier ([#7716](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7716)) ([8b07e08](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8b07e0864922d4694a61c5fd3a4bfa6d96d4d016))


### Bug Fixes

* Change S8 vendor to SODA https://github.com/Koenkk/zigbee-herdsman-converters/issues/7565 ([aa65ca3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aa65ca335e9448678fc847dc257004dae5a5ed56))
* **detect:** Detect `_TZ3000_ctftgjwb` as Nous B1Z ([#7724](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7724)) ([e399257](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e3992573a16c0c8d9c32c8a4b14e52916a19afb7))
* **detect:** Detect `_TZ3000_eqsair32` as Zemismart TB26-1 https://github.com/Koenkk/zigbee2mqtt/issues/23216 ([fc71782](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fc717820d4dff06345fa9666c17e6f6cf3be1e45))
* **detect:** Detect `_TZ3000_kz1anoi8` as Moes ZWV-YC https://github.com/Koenkk/zigbee2mqtt/issues/22950 ([dbcc7a4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dbcc7a4452de69dbbfde2d85e56a8e19fbbf8581))
* **detect:** Detect `_TZ3210_jjqdqxfq` as Moes ZB-LZD10-RCW https://github.com/Koenkk/zigbee2mqtt/issues/23230 ([5bba2a4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5bba2a469a674e16400d454d23d0c9a861b54b43))
* Disable unsupported Hue effects for Philips 3216331P5 https://github.com/Koenkk/zigbee2mqtt/issues/23227 ([527b291](https://github.com/Koenkk/zigbee-herdsman-converters/commit/527b291100d25f5db1212625fb9f5ced3cced3b4))
* Fix Bosch BTH-RA Home Assistant discovery ([#7720](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7720)) ([14062ae](https://github.com/Koenkk/zigbee-herdsman-converters/commit/14062aece873fbf5215b6f65717ffdebb461db94))
* Fix Bosch BWA-1 water_leak returns `null` ([#7715](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7715)) ([2bb89bc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2bb89bce8b634f2109f8dd51e455ccd7341d3ffb))
* Fix electrical measurements for Tuya `_TZ3000_x3ewpzyr` not working https://github.com/Koenkk/zigbee2mqtt/issues/23155 ([9de3efe](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9de3efea8e01e4daa3a411a25962004a6b6cc75f))
* **ignore:** 9de3efea8e01e4daa3a411a25962004a6b6cc75f ([64fa1e9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/64fa1e9508defd5a8ec44580328091c64009f48d))
* **ignore:** Make `37022474` models unique ([1b6d976](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1b6d976916dcb7f8f98acd732d55512bb35d0731))
* Recategorize configurable attributes for Inovelli ([#7723](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7723)) ([d39fb62](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d39fb62c7af49084f23c106691eeb683320736b2))

## [19.62.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.61.0...v19.62.0) (2024-06-30)


### Features

* **add:** TI0001-illuminance ([#7707](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7707)) ([09b6b36](https://github.com/Koenkk/zigbee-herdsman-converters/commit/09b6b369f85bf08470fd4cdf1f797e81086c8b21))


### Bug Fixes

* **detect:** Detect `_TZ3000_mmkbptmx` as Tuya TS0004_switch_module ([#7712](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7712)) ([866c7cb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/866c7cbebd7d77b78c135a19228a11f4b3a66fdc))
* **ignore:** update dependencies ([#7708](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7708)) ([2192c97](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2192c97a838166197f8dde0aac30a104ab6a1b34))
* **ignore:** update dependencies ([#7713](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7713)) ([8be6da7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8be6da7e8ea258ddb097328c0b104d4e65db25e1))
* Refactor develcoSpecificAirQuality into manuSpecificDevelcoAirQuality ([#7706](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7706)) ([fdcd407](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fdcd407b14bfb7860a27df1b67af7b8aeb6bedfa))

## [19.61.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.60.1...v19.61.0) (2024-06-29)


### Features

* **add:** E8334RWMZB, E8331SRY800ZB ([#7700](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7700)) ([f745d05](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f745d05306c65ea402b3a72094ce915d95c54690))
* **add:** SPM915 [@mario42004](https://github.com/mario42004) https://github.com/Koenkk/zigbee2mqtt/issues/23172 ([bc53254](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bc532543fa8964797276bfdf8ac45a9d57f710be))


### Bug Fixes

* **detect:** Detect `_TZ3000_v7chgqso` as Nous E3, `_TZ3000_abjodzasas` as Nous LZ3, `_TZ3000_yruungrl` as Nous B4Z and `_TZ3000_6km7djcm` as Nous LZ4 ([#7705](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7705)) ([578ec18](https://github.com/Koenkk/zigbee-herdsman-converters/commit/578ec18fe0c03efc339b4502b7a994a9e04fbfaa))
* Fix Bosch BSD-2 alarm states ([#7703](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7703)) ([d54c804](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d54c80455f12d82851004726c338036cc9397326))
* Fix energy reporting change for ShinaSystem PMM-300Z1, PMM-300Z2 and PMM-300Z3 ([#7697](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7697)) ([e84de6a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e84de6ac05589ba42e40fafff898256dd7982c13))
* Fix HA discovery for Bosch BTH-RA ([#7685](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7685)) ([caf39c1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/caf39c1367d27894cd2c670bfc0b2b014ecd611b))
* Fix leadingTrailingEdge for Inovelli VZM36 ([#7696](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7696)) ([9bc3d95](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9bc3d9500d1aabcf020b87f25b4a5d1223a4bf00))
* Implement prettier ([#7702](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7702)) ([607a13e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/607a13e9a112abbf1a8d34fcabee8f82a07f80a8))

## [19.60.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.60.0...v19.60.1) (2024-06-25)


### Bug Fixes

* Allow `exposes` in `ModernExtend` interface to be a function https://github.com/Koenkk/zigbee-herdsman-converters/pull/7683 ([059dfb8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/059dfb88464287ac63da5cff880db97ce1fe1ba4))
* **ignore:** fix fd2e5f54563861b58324f4db08f36a507a13df63 ([1f5eb4e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1f5eb4ec6850e2859694d0510cb9025360b43a36))

## [19.60.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.59.2...v19.60.0) (2024-06-25)


### Features

* Add support for leading/trailing edge dimming parameter for inovelli fan canopy module ([#7694](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7694)) ([9d317cc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9d317cceae2c21ee6e70c20202bbe3f73d77185d))
* **add:** TS0601_dimmer_1_gang_2 https://github.com/Koenkk/zigbee2mqtt/issues/23059 ([2d5a0d1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2d5a0d15003abf13204d6b46855c870d1cf2520a))
* **add:** ZigDC ([#7686](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7686)) ([be53d8a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/be53d8a9ced36316753dc1d07834239702592034))
* **add:** ZMO-606-P2, ZMO-606-S2, ZMO-606-20A ([#7687](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7687)) ([2deff77](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2deff7707d67ef9d61a16c708106af349f636c76))
* Support power measurements for Legrand 412171 @CodeForLove83 https://github.com/Koenkk/zigbee2mqtt/issues/23033 ([fd2e5f5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fd2e5f54563861b58324f4db08f36a507a13df63))


### Bug Fixes

* **detect:** Detect `_TZ3000_huvxrx4i` as Tuya TS0002_power ([#7692](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7692)) ([503588b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/503588b80b24563dda937b7866d9955cea1a8a1f))
* **detect:** Detect `_TZ3000_rcuyhwe3` as Tuya ZD06 ([#7693](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7693)) ([cbd4b94](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cbd4b94a0506465da1a00c614425d244cc5d0305))
* **detect:** Detect `TRADFRI bulb E26 CWS globe 806lm` as IKEA LED2109G6 ([#7690](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7690)) ([f7e1347](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f7e1347a6d483ac29936ce12ae5d4d6ee5a90759))
* **ignore:** fix fd2e5f54563861b58324f4db08f36a507a13df63 ([c561e7f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c561e7f0c72f5d30fa3010fd0c0f03340db0f425))
* Remove unsupported tamper from Lidl HG06336 https://github.com/Koenkk/zigbee2mqtt/issues/18228 ([b6f9310](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b6f93104aeb5b7de25e48afc47d01b4b0146e0e3))

## [19.59.2](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.59.1...v19.59.2) (2024-06-24)


### Bug Fixes

* BHI-US: Add missing expose of button actions ([#7679](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7679)) ([15ac786](https://github.com/Koenkk/zigbee-herdsman-converters/commit/15ac7861bd31e53c3b9803100f2b455a9213f320))
* **detect:** Detect `_TZ3000_okaz9tjs` as Elivco LSPA9 ([#7684](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7684)) ([30de4a9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/30de4a923d58380cf92b8832a1d23324a0a5aa04))
* **detect:** Detect `_TZE204_a7sghmms` as Giex QT06_2 ([#7680](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7680)) ([c8622be](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c8622becf0662a57244134396eacd808cede7b1a))
* **detect:** Detect `_TZE204_rzrrjkz2` as Neo NAS-WV03B ([#7688](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7688)) ([6b609b8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6b609b8d13632ba1c1bfeee5e3b85c83f2f74983))
* Improve Third Reality 3RSS009Z battery % calculation ([#7682](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7682)) ([483befe](https://github.com/Koenkk/zigbee-herdsman-converters/commit/483befe2e4dc2d5c64ea638716cd96e5da789648))
* Minor `modernExtend` updates for Bosch BMCT-SLZ ([#7654](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7654)) ([f65c5b5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f65c5b5d5e2a65ff1db1a65df284362d058e709b))

## [19.59.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.59.0...v19.59.1) (2024-06-23)


### Bug Fixes

* Add 4512727 as whitelabel to EnOcean PTM 215Z ([#7675](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7675)) ([3ed341f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3ed341f56d9503312d52b78f5f444bac145aef69))
* Fix 'customized' spelling for Tuya `color_power_on_behavior` ([#7673](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7673)) ([daa6b98](https://github.com/Koenkk/zigbee-herdsman-converters/commit/daa6b98bc72d6785e1ff4ac4a4763e03e29ee3a5))
* Omit battery_low for Tuya TS0203  models that don't have it ([#7677](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7677)) ([cbaa6f4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cbaa6f45dcb61822ed7a44493ec304b386aaf08a))

## [19.59.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.58.0...v19.59.0) (2024-06-22)


### Features

* **add:** 4503145 ([#7671](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7671)) ([e70b268](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e70b268ac293dea0503abddf99aec142f1bb244c))


### Bug Fixes

* **detect:** Detect `_TZE204_uab532m0` as Neo NAS-WV03B ([#7670](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7670)) ([cc8bff0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cc8bff02f706007f990126310fee13f1e64781f4))
* **detect:** Detect `TRADFRI bulb GU10 WS 380lm` as LED2005R5/LED2106R3 ([#7665](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7665)) ([b9fd804](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b9fd804ce9d8cb7f9b84933854a1dbb4f730f014))
* Fix BITUO TECHNIK SPM01-U01 energy reporting ([#7667](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7667)) ([9e5dcc2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9e5dcc23bb5a841ce8d2cb10d7909e5d96666800))
* Inovelli - fix fan mode issue with vzm36 ([#7664](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7664)) ([a746d1c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a746d1c58d4862aeec5bfbe22a566faf48cb234b))
* Refactor Iluminize 511.344 to modernExtend ([#7668](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7668)) ([d1f8a39](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d1f8a3947ff0c84541cdff8396a3bc31c748a2f5))

## [19.58.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.57.1...v19.58.0) (2024-06-20)


### Features

* **add:** AZAI6ZBEMHI ([#7636](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7636)) ([b64bf08](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b64bf0849ccd627f53207cc74e523d311497bd92))
* **add:** GL-FL-007P ([#7663](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7663)) ([33b317a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/33b317a7cb82c327590a84c2aebe0dc479bb6adc))
* **add:** NAS-WV03B ([#7630](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7630)) ([565c8bb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/565c8bbc30940ad393ab0cd7d2c2d8e1cbe7346f))
* **add:** SE-20-250-1000-W2Z2 [@morcus](https://github.com/morcus) https://github.com/Koenkk/zigbee-herdsman-converters/issues/7649 ([26e80de](https://github.com/Koenkk/zigbee-herdsman-converters/commit/26e80de5be93434032d99918ce2df32529dd6c21))
* **add:** SLZB-07 https://github.com/Koenkk/zigbee2mqtt/issues/23076 ([fbb3bc5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fbb3bc52db68dad1b6679f5d1f197ef88caf46bc))
* **add:** TI0001-hygrometer ([#7648](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7648)) ([7f31562](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7f31562b976aa72205d9fab357a4c8d011a0e042))
* **add:** TOWSMR1 [@terzo33](https://github.com/terzo33) https://github.com/Koenkk/zigbee2mqtt/issues/23054 ([da43878](https://github.com/Koenkk/zigbee-herdsman-converters/commit/da43878ebe33e89c44868d36d7074657f2037db5))
* **add:** TS011F_2_gang_power https://github.com/Koenkk/zigbee2mqtt/issues/22981 ([13ff5c5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/13ff5c5bc1324a0150d837c768f8cf81f099ab3f))
* **add:** TS0501B_dimmer_2 ([#7638](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7638)) ([aafe5c6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aafe5c6437f612419b5ac7524227c0330a04f188))
* **add:** TYZGTH1CH-D1RF ([#7657](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7657)) ([350a429](https://github.com/Koenkk/zigbee-herdsman-converters/commit/350a4291697623093090a97d16169d0b7280d2c5))
* **add:** TYZGTH4CH-D1RF ([#7661](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7661)) ([181ee0b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/181ee0bc7021423b24a500dd0e62611b8d80c90f))
* Support electrical measurements for MG-ZG01W ([#7656](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7656)) ([f9c6313](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f9c6313e517b4d805a75940cb608f98a57338a42))


### Bug Fixes

* **ignore:** Fix QA TS1201 whiteLabel ([#7660](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7660)) ([c929179](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c9291796dcc6b1704bc600795dd5e0a3f10fa3b3))

## [19.57.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.57.0...v19.57.1) (2024-06-18)


### Bug Fixes

* **detect:** Detect `TRADFRI bulb E26 WS globe 1100lm` as IKEA LED2201G8 ([#7651](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7651)) ([85c0ed5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/85c0ed5285f898960a8bcdf45c76323f0061320b))
* **ignore:** Add qa to /devices/index.ts ([#7650](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7650)) ([940dffe](https://github.com/Koenkk/zigbee-herdsman-converters/commit/940dffe7739b2cb10f4e024dc8401b39c8307488))
* SPLZB-132: read develco specific sw/hw versions ([#7653](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7653)) ([a03a5e9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a03a5e99684b1bf164a4b7f71cadd7b8979951e8))

## [19.57.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.56.0...v19.57.0) (2024-06-16)


### Features

* **add:** ZNDDQDQ11LM ([#7645](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7645)) ([2301f75](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2301f752409ccf56f58ae8d7b1cf29d114bfef4c))


### Bug Fixes

* **detect:** Detect `_TZB210_ayx58ft5`  as MiBoxer E2-ZR ([#7642](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7642)) ([387e4ca](https://github.com/Koenkk/zigbee-herdsman-converters/commit/387e4caf0a45253e83757451a84298940db6a26b))
* **ignore:** Rename various commands ([#7634](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7634)) ([b1dee37](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b1dee370445e0264180c18b712b2cfab7520d4b5))
* **ignore:** update dependencies ([#7644](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7644)) ([fd009fc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fd009fca1468647d084a20ceff3b1c84a9985ce1))

## [19.56.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.55.0...v19.56.0) (2024-06-15)


### Features

* **add:** QAT42Z3, QAT42Z1, QAT42Z2, QARZ1DC, QARZDC1LR, QARZ2LR, QARZ3LR, QARZ4LR, QAT42Z1H, QAT42Z2H, QAT42Z3H, QAT44Z6H, QAT44Z4H, QADZ1, QADZ2 ([#7610](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7610)) ([d21ed6a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d21ed6a222be5e82334211929568969525ad8d0f))
* Enable modern OTA for BTH-RM & minor cleanup ([#7633](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7633)) ([53def67](https://github.com/Koenkk/zigbee-herdsman-converters/commit/53def671536f9ba0289e99d2dece68c03ada645b))


### Bug Fixes

* Add "off" fan mode for Inovelli ([#7641](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7641)) ([00d8880](https://github.com/Koenkk/zigbee-herdsman-converters/commit/00d8880d0f46bc82b4f6b7c9be20f7371da8eaf0))
* Fixes for TICMeter ([#7640](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7640)) ([40fa490](https://github.com/Koenkk/zigbee-herdsman-converters/commit/40fa490bbc9eb2114506806f87f0611d85c52ad9))
* Improve support of Sunricher ZG2858A ([#7637](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7637)) ([6fbad86](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6fbad86bf3270b0fb79577a644dcb77dabc785bc))

## [19.55.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.54.0...v19.55.0) (2024-06-13)


### Features

* **add:** E8333SRY800ZB_NEW ([#7631](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7631)) ([56c659c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/56c659cdc8d027534c181e6641b87076944884d5))
* **add:** SLZB-06p7 https://github.com/zigbee2mqtt/hassio-zigbee2mqtt/issues/613 ([ac97cc3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ac97cc3c84da0985ad4c2934e2a9af8f6e1115e6))
* **add:** YK-S03 ([#7613](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7613)) ([4812c1b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4812c1bc77683beb786644de86ac8c642d895a50))

## [19.54.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.53.0...v19.54.0) (2024-06-12)


### Features

* Support OTA for PMM-300Z2, PMM-300Z3 ([#7627](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7627)) ([f4c2336](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f4c2336c4c390146910161a030632159595e1399))


### Bug Fixes

* **detect:** Detect `_TZ3000_nss8amz9` as Nedis ZBSM10WT https://github.com/Koenkk/zigbee2mqtt/issues/23009 ([3e1f07a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3e1f07adafac0e4f759aa63e5c1e266ebe1cce62))
* **detect:** Detect `_TZE200_vdiuwbkq` as Zemismart M515EGBZTN ([#7629](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7629)) ([3d0e5fc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3d0e5fc4ff009ea4408b727fb08d66f192e89252))
* **ignore:** Fix ZTH01 and ZTH02 model ids ([#7626](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7626)) ([93dee37](https://github.com/Koenkk/zigbee-herdsman-converters/commit/93dee37414438ccd160ca165ab3333d3eaa4eeff))

## [19.53.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.52.0...v19.53.0) (2024-06-10)


### Features

* **add:** SIRZB-111 https://github.com/Koenkk/zigbee2mqtt/issues/22999 ([2afc1b4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2afc1b4fff0c51b69ec761fc84cd04f3884482c7))
* **add:** TS0601_soil_2  ([#7609](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7609)) ([effabda](https://github.com/Koenkk/zigbee-herdsman-converters/commit/effabda08f74ab2e1a95ee1c0c2ee9bb5a7c734e))


### Bug Fixes

* Add manuSpecificIkeaUnknown ([#7615](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7615)) ([852007d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/852007d28870bf3f254db601688ba986392b651b))
* add manuSpecificIkeaUnknown to all ikea devices ([#7621](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7621)) ([162d717](https://github.com/Koenkk/zigbee-herdsman-converters/commit/162d717a699f0a5df0c4b016529b617f1dee1da7))
* **detect:** Detect `_TZE204_57hjqelq` as Tuya TS0601_cover_1 ([#7625](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7625)) ([d65f82f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d65f82f3a821b68284a2fc0c9c543b5d24f5ac58))
* **detect:** Detect `ZTH01Z-z`, `ZTH01Z-bz`, `ZTH02Z-z` and `ZTH02Z-bz` as Tuya TS0201-z ([#7623](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7623)) ([fe0e19f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fe0e19fcff0473967fa8d37e0eca17d0fea1ec6b))
* Fix Tuya BLE-YL01 `free_chlorine` multiplied by 10 https://github.com/Koenkk/zigbee2mqtt/issues/22985 ([bac88c5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bac88c55d58bcfe0cc1eb2863ba4da323d588173))
* **ignore:** lint ([#7622](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7622)) ([8994426](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8994426959208acb41941e7ed04403c711f52dab))
* **ignore:** remove power on behaviour from AU-A1ZB110 https://github.com/Koenkk/zigbee2mqtt/issues/22971 ([2a35705](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2a35705451e58c3245721d6333e58aa49659a2bb))
* **ignore:** update dependencies ([#7620](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7620)) ([43556ca](https://github.com/Koenkk/zigbee-herdsman-converters/commit/43556cadee78576780396f9fa31aa1b4b38e6fc9))
* Remove unsupported `battery_low` from SONOFF TRVZB https://github.com/Koenkk/zigbee-herdsman-converters/issues/7582 ([3b4aa1f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3b4aa1f2a63ba2074ee10d7650b4c55dfd5fe31c))

## [19.52.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.51.0...v19.52.0) (2024-06-08)


### Features

* Add pincode support for Kwikset 99140-002 ([#7611](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7611)) ([a778395](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a77839567dd1cd1479c6a0a9ef4e943682b4bf32))
* **add:** AU-A1ZB110 @Puntoboy https://github.com/Koenkk/zigbee2mqtt/issues/22971 ([4110576](https://github.com/Koenkk/zigbee-herdsman-converters/commit/41105760127769e7368d735c263c1d10cc12c3a8))
* **add:** mKomfy_Tak [@mixedbreed](https://github.com/mixedbreed) https://github.com/Koenkk/zigbee2mqtt/issues/22974 ([e596402](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e5964022da63c2ba93e06facf646a12507e38d57))
* **add:** ST8EM-CON @Dis90 https://github.com/Koenkk/zigbee2mqtt/issues/22962 ([a958464](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a9584642c818d1bf5785a6cd92a8a1d2e7f2c0b0))
* Support `calibration_shutter_button_hold_time` and `calibration_shutter_delay_start_time` for Bosch BMCT-SLZ ([#7612](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7612)) ([68bf57b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/68bf57b090a49b19f0dc033001053b85d455af34))


### Bug Fixes

* **detect:** Detect `_TZE204_lh3arisb` as Novato WPK @NTV20244 https://github.com/Koenkk/zigbee2mqtt/discussions/22965 ([6b3bac6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6b3bac6cd27f1d7f3841ac23f46d43078b873e64))
* **detect:** Detect `_TZE284_7ytb3h8u` as Giex QT06_2 https://github.com/Koenkk/zigbee-herdsman-converters/pull/7603 ([dbef5e6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dbef5e6b8c7b98ef230860880ac225eccfa2eb31))
* Fix `LXN56-TS27LX1.2` support [@kamaldeepdhiman](https://github.com/kamaldeepdhiman) https://github.com/Koenkk/zigbee2mqtt/issues/21330 ([0b898ff](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0b898ff84c5668ac533a79668be3cf1a3f161e52))
* **ignore:** fix a9584642c818d1bf5785a6cd92a8a1d2e7f2c0b0 ([6c05da3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6c05da3a5f253223315fcf3366c5d40ee19c4079))
* **ignore:** fix e5964022da63c2ba93e06facf646a12507e38d57 ([60c2f0d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/60c2f0d8bbfc75daa79fb0860544b82389f7edaa))
* **ignore:** Max value for bosh shutter button calibration ([#7617](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7617)) ([cc65e2e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cc65e2ef63f24a3404e602731b043bf2f75a3f29))
* Move manuSpecificIkeaAirPurifier to zhc ([#7614](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7614)) ([2def940](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2def940c913c3afafd6a5509ca485c57cee6cdde))

## [19.51.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.50.1...v19.51.0) (2024-06-05)


### Features

* **add:** 8719514329843 https://github.com/Koenkk/zigbee2mqtt/issues/22937 ([bd855f8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bd855f897af86f1cf9a97dbb956d294c12de1f71))
* Optimize OTA ([#7585](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7585)) ([d96e000](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d96e0004b94d9e8b96886cbbe526da2214d60b4d))


### Bug Fixes

* Enable OTA for frient EMIZB-141 https://github.com/Koenkk/zigbee-OTA/pull/502 ([7237acb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7237acbe9a7a3796725c341294a3be08a6c212ac))
* Fix definition generator for lights only supporting `genLevelCtrl` https://github.com/Koenkk/zigbee2mqtt/issues/22937 ([b7575ff](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b7575fffaec883fb2b36877764308c3e7ab8e182))
* Fix typo in ZG-204ZM (`dadar` -&gt; `radar`) https://github.com/Koenkk/zigbee-herdsman-converters/issues/7590 ([cf870f6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cf870f6992d4b33338eb142bb437377b35125f09))

## [19.50.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.50.0...v19.50.1) (2024-06-04)


### Bug Fixes

* **detect:** Detect `_TZ3290_rlkmy85q4pzoxobl` as Tuya UFO-R4Z ([#7598](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7598)) ([3465fe0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3465fe0a200c4ccf8d5b82c7b58d20081e6faa9d))
* **detect:** Detect `_TZE204_4fblxpma` as GiEX GX02 ([#7603](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7603)) ([48dbf83](https://github.com/Koenkk/zigbee-herdsman-converters/commit/48dbf830ef6cbe404f2f1b7ea9e70a20295abac9))
* Fix E8332SRY800ZB with multiple model ([#7605](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7605)) ([812ce0e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/812ce0e7a635234c3b6b881415164152822f3300))
* **ignore:** fix 48dbf830ef6cbe404f2f1b7ea9e70a20295abac9 ([b16d852](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b16d852e0c17ef8b780810f2596847273f8f977c))
* Log `Images currently unavailable for` as `debug` https://github.com/Koenkk/zigbee-herdsman-converters/pull/7585 ([5c49ca5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5c49ca57ee529d35bc673bf023ee4d43bb5fcd04))
* STARKVIND `child_lock` broken ([#7602](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7602)) ([18f841f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/18f841fb5b6e940e88ba113723bf000ae747aefb))

## [19.50.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.49.0...v19.50.0) (2024-06-03)


### Features

* **add:** LXN56-TS27LX1.2 ([#7599](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7599)) ([ed81a6f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ed81a6f48559dbc05a9a831d9dcf334f088fee35))
* **add:** SNZB-05P ([#7577](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7577)) ([3e1b399](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3e1b399f3e62b81f9c32fe2b041a17a35541ed7e))
* **add:** SODA_S8 [@clumsy-stefan](https://github.com/clumsy-stefan) https://github.com/Koenkk/zigbee-herdsman-converters/issues/7565 ([f4a013f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f4a013fe39b6e59083ee0fc9ffd7b13c7889aa1d))
* **add:** ZY-M100-24GV2 ([#7600](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7600)) ([1ec4268](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1ec426821f2390c1b8b2168584dca89b9166ed0a))

## [19.49.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.48.0...v19.49.0) (2024-06-02)


### Features

* Support `move_to_hue_and_saturation` action for MiBoxer FUT089Z ([#7595](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7595)) ([b1b6399](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b1b63993779b58228589225a6154429d287a5be8))


### Bug Fixes

* **detect:** Detect `_TZB210_wxazcmsh` as MiBoxer FUT037Z+ ([#7592](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7592)) ([cb73277](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cb73277cee49aa353f9b6e4150b06cdd29d809d1))
* **detect:** Detect `_TZE204_myd45weu` as Tuya TS0601_soil ([#7593](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7593)) ([9ac8b3d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9ac8b3db959a9b58ae3db7391e1b5c2bad716dfa))
* **detect:** Detect `_TZE284_cjbofhxw` as Tuya PJ-1203-W [@lyonelf](https://github.com/lyonelf) https://github.com/Koenkk/zigbee2mqtt/issues/22784 ([d935abb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d935abb18658fb2d59fe5c35f87ffcbe50b32cbe))
* Disable OTA for Ledvance 74746 https://github.com/Koenkk/zigbee2mqtt/issues/20983 ([4ef710a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4ef710acf0fdf08d4112e25cb0e8dbc0669157d2))
* **ignore:** update dependencies ([#7594](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7594)) ([dd81383](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dd81383380cc9c99cc7305f85433719ff2b7a458))
* WISZB-120: Use "battery_voltage" instead of "voltage" ([#7597](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7597)) ([c806775](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c80677579655a8be6bfb4dbd1831b55125c9032c))

## [19.48.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.47.1...v19.48.0) (2024-06-01)


### Features

* **add:** 929003597901 ([#7591](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7591)) ([df25055](https://github.com/Koenkk/zigbee-herdsman-converters/commit/df250551f9305f510a7993b1db27678efbc82388))


### Bug Fixes

* **detect:** Detect `_TZE200_7ytb3h8u` as Giex QT06_2 ([#7589](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7589)) ([9b2adff](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9b2adfff042c7dfd6910896d4b2346d18d7af38b))
* Fix TuYa ZG-204ZM `motion_detection_mode` values https://github.com/Koenkk/zigbee-herdsman-converters/issues/7590 ([7eddd40](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7eddd4061a776d5b5ae922ca6488fd3cbd95ec35))
* Rename `TuYa` to `Tuya` https://github.com/Koenkk/zigbee2mqtt/discussions/22876 ([b325535](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b32553502d4bf16ea8e3f61aba7af2343f9c996b))
* Ubisys writeStructure for config was not using ZLC.DataType ([#7587](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7587)) ([9b20309](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9b203099427eab893e09f6a61fde8dd21a56d98e))

## [19.47.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.47.0...v19.47.1) (2024-06-01)


### Bug Fixes

* **ignore:** Fix TS0001_switch_1_gang whitelabels ([0f3b6f2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0f3b6f2cb5d0e6e147c6f9ab0591267d8838d881))
* **ignore:** Update zh to 0.49.2 ([29ed735](https://github.com/Koenkk/zigbee-herdsman-converters/commit/29ed735a39b4b01606aa1b918a8646e68d631684))

## [19.47.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.46.0...v19.47.0) (2024-05-31)


### Features

* Support new features for TuYa ZG-225Z and ZG-204ZM ([#7553](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7553)) ([058eac7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/058eac74b03e1833881233b86d0dfa48dde27dc5))


### Bug Fixes

* **detect:** Detect `SV01-612-EP-1.4` as Keen Home SV01 ([#7581](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7581)) ([3f27d31](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3f27d317c451e1e1d5b46312277d09025909cefa))
* Enforce no floating promises with eslint ([#7583](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7583)) ([ed0704b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ed0704b42b3dee3e477dfd1194a100be83bcbd7f))
* Expose message to TuYa valueConverters https://github.com/Koenkk/zigbee-herdsman-converters/pull/7271 ([2c3667b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2c3667bc328e2522e3941274391c9ceee6d00e34))

## [19.46.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.45.0...v19.46.0) (2024-05-30)


### Features

* **add:** 046677585235 https://github.com/Koenkk/zigbee2mqtt/issues/22828 ([f0186d7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f0186d7d1b05e0cbeca2e29ad6c6ace543f441cc))
* **add:** RB 262 https://github.com/Koenkk/zigbee2mqtt/issues/22821 ([15c09e2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/15c09e22811a9687103a0ed5ce16ed5754e306d1))
* **add:** ZGA002, ZGA003, ZGA004 ([#7579](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7579)) ([fff4ffb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fff4ffb2d249b74e2b7804ef2c0f565f9b752cc8))


### Bug Fixes

* Convert Sonoff SNZB-02D & SNZB-02P to `modernExtend` ([#7572](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7572)) ([825a7fa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/825a7fae5b72cdbf5566501530bbb4645173dc2c))
* **detect:** Detect `_TZE200_emxxanvi` as TuYa TS0601_switch_6_gang ([#7580](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7580)) ([9cf481a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9cf481a0b7d62966c6a3558c96b748c3400e6650))
* **detect:** Detect `_TZE204_7gclukjs` as TuYa ZY-M100-24G https://github.com/Koenkk/zigbee2mqtt/discussions/22790 ([5283a67](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5283a67b79e806a56e54b4159cdc49e228b0f3a4))
* Expose voltage for WISZB-120 ([#7575](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7575)) ([b2f2f11](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b2f2f11d0bee69d4ed643461940c8601cf826ad6))
* **ignore:** Fix TS0201-z vendor https://github.com/Koenkk/zigbee2mqtt.io/pull/2778 ([273d843](https://github.com/Koenkk/zigbee-herdsman-converters/commit/273d84390a2758d43d0f34e1a2a09aeb210d089c))
* Remove last `manuSpecificBosch*` usage ([#7574](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7574)) ([08fc7f2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/08fc7f2d0a61ecdd85efd52c97baae144844d675))
* Set entity category to configuration for Sonoff TRVZB open/close degree entities ([#7573](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7573)) ([e7ca0f8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e7ca0f860f6345396732686558e5ec15b4232b9b))

## [19.45.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.44.0...v19.45.0) (2024-05-28)


### Features

* Enable OTA for some Develco devices ([#7561](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7561)) ([90d336e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/90d336e22dcfaf56a08b5f3bec17d05494b554ca))


### Bug Fixes

* **detect:** Detect `_TZ3000_zrm3oxsh` as EARU EAYCB-Z-2P ([#7568](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7568)) ([8c41f14](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8c41f1406eee4053087ab79e61937c4da25aa2b7))
* **detect:** Detect `_TZ3000_zrm3oxsh` as TuYa TS011F_with_threshold ([#7571](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7571)) ([51191e1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/51191e1f7e0cb328f24423635d38d50746c5434b))
* **detect:** Detect `_TZE200_2odrmqwq` as TuYa TS0601_cover_1 [@mrespin](https://github.com/mrespin) https://github.com/Koenkk/zigbee2mqtt/issues/22795 ([b41636e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b41636e651279459883ed9204ffedcdf8dca021b))
* Partly convert Bosch BMCT-SLZ to `modernExtend` ([#7569](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7569)) ([8242bb7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8242bb7b23ded4e1cdfddb1f87f991601e3aceef))

## [19.44.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.43.0...v19.44.0) (2024-05-27)


### Features

* Add `cover_mode` to NodOn SIN-4-RS-20 and SIN-4-RS-20_PRO https://github.com/Koenkk/zigbee2mqtt/issues/22728 ([e9f3896](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e9f389673ddb7d98388a00e2242718b3422c4540))
* **add:** 404051 @Chrischan-git https://github.com/Koenkk/zigbee2mqtt/issues/22707 ([cc15841](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cc15841e139d02ae49ac46eeb3480edc9f5b5074))
* **add:** 98426061 ([#7563](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7563)) ([ee40ebe](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ee40ebeb9da273446c86298f99861df916b510e4))
* **add:** TS0601_cover_9 [@slothking87](https://github.com/slothking87) https://github.com/Koenkk/zigbee2mqtt/issues/22772 ([bf0f575](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bf0f575b82ee7021d0d34f4905561d8929fc4bf2))
* **add:** TS0603 ([#7541](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7541)) ([0741be4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0741be4cb2d657e6b5b6e84e67c28f8bdffa4b06))
* **add:** ZPV-01 @NTV20244 ([2ac26ba](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2ac26ba51fb21e9f3d13451e2fea71dbc8eadd62))
* Floor sensor support for Danfoss Icon ([#7566](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7566)) ([5aa7d27](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5aa7d277d5ec6f92d0c095dce2aa2110c83fa77e))
* Improvements for ISM300Z3 ([#7549](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7549)) ([42fabf6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/42fabf636e2dfea7013ebc9704ba024b568a61a8))


### Bug Fixes

* Add Envilar 7853 whiteLabel info ([#7551](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7551)) ([5f4d72c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5f4d72c233486aa2f2a0eceea5f42ef19fbc3948))
* Add missing effects to LCX015 ([#7557](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7557)) ([fea6bfc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fea6bfcd0950e2f0cd4feb5357d4a89f5d1e2c53))
* Convert Bosch BSD-2 to `modernExtend` ([#7548](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7548)) ([c9a1c14](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c9a1c14ea354a99c6ce9fdc0afe4b6f7e62da2d1))
* Convert Bosch Twinguard to `modernExtend` ([#7560](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7560)) ([0427cb9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0427cb9195992971bb1f77ced4e874517834c083))
* **detect:** Detect `_TZ3000_qaabwu5c` as Nous L6Z https://github.com/Koenkk/zigbee2mqtt/issues/22462 ([6462710](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6462710f9bee56029dcf7d37d2ad331a7e9742cd))
* **detect:** Detect `_TZE200_ft523twt` as Woox R7049 ([#7558](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7558)) ([0516131](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0516131456aaca3cb98cee38b3ae6d3948794c47))
* **detect:** Detect `TRADFRI bulb E26 WS globe 1055lm` as IKEA LED2201G8 ([#7546](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7546)) ([3817344](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3817344929b3e8b82f48d7bc21f64f19a14d98a6))
* Fix iHORN LH03121 zone type https://github.com/Koenkk/zigbee-herdsman-converters/issues/7556 ([5e1d7b9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5e1d7b9676d2a71ac7dcd00d9e3516bc0b8d3ab1))
* Fix IKEA E2112 OTA ([#7562](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7562)) ([3a1e1f1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3a1e1f12b8f7dcfa1181d3d8d6fea4902b7e78b4))
* Fixes in the PTVO converter ([#7554](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7554)) ([4dc88a7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4dc88a7a27d6be151295b77cae7069bfeb55c1c4))
* Increased the temperature setting interval for the Moes thermostats (BHT-002-GCLZB) ([#7550](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7550)) ([fc59171](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fc59171c3cd9de72a41364d51256569a5d456e01))

## [19.43.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.42.0...v19.43.0) (2024-05-21)


### Features

* **add:** WDE011680 ([#7543](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7543)) ([34d65a2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/34d65a2ce8274c3a62617acece0f1d04bed83656))


### Bug Fixes

* **detect:** Detect `_TZE200_xlppj4f5` as QOTO QT-05M ([#7539](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7539)) ([812720f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/812720f06fdc49c935dd36125a81b97feb464eae))
* **detect:** Detect `_TZE204_bdblidq3` as BSEED BSEED_TS0601_cover @Piscator74  https://github.com/Koenkk/zigbee2mqtt/discussions/22718 ([24ec662](https://github.com/Koenkk/zigbee-herdsman-converters/commit/24ec662cb45f38c2da1f261c94a434206d8d9aa6))
* **detect:** Detect `GWA1512_SmokeSensor` as Develco SMSZB-120 ([#7542](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7542)) ([f548d53](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f548d532b18b95b79378ca65af493898de1fa394))
* Fix `brightness` reporting for TuYa TS110E_2gang_2 https://github.com/Koenkk/zigbee2mqtt/issues/21903 ([05bd548](https://github.com/Koenkk/zigbee-herdsman-converters/commit/05bd548566eadb48a61b3a5ff7a0b32ca3ba3a30))
* Update TuYa TS0210 `sensitivity` description https://github.com/Koenkk/zigbee-herdsman-converters/commit/16fddf99b54a0db551df5885901c5a42c41b374d ([650fa9f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/650fa9f43c5ebaffdc915e502d15930f4b99c8aa))

## [19.42.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.41.0...v19.42.0) (2024-05-20)


### Features

* **add:** AE 270 T ([#7537](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7537)) ([b65b3e4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b65b3e405c72d7ec8d4675b1ea6ad291b71de4ef))
* **add:** E8332DST350ZB, E8331SRY800ZB, E8332SRY800ZB, E8333SRY800ZB, E8332SCN300ZB ([#7522](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7522)) ([e12a256](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e12a2563d1c15b32d6afda0fa90756941fcffe52))
* **add:** TCM-300Z ([#7538](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7538)) ([380417b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/380417b050475be9311485d23f55dab473e468de))
* Allow to change sensitivity of Aqara ZNXNKG02LM ([#7536](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7536)) ([0b953ea](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0b953ea8b0067a4e55de42bc1783a663bff0dc15))


### Bug Fixes

* Bug fixes in the PTVO device converter ([#7534](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7534)) ([1f9f764](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1f9f764cb2bccad0c2e8395c4f13a6a62f9921a1))
* **detect:** Detect `_TZ3000_j61x9rxn` as TuYa TS0044_1 [@ferarias](https://github.com/ferarias) https://github.com/Koenkk/zigbee2mqtt/issues/22669 ([7e347fa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7e347fa6f9a2fbb68aad7a27d9ee41f79a73d33d))
* Fix `Failed to configure TypeError: func is not a function` https://github.com/Koenkk/zigbee2mqtt/issues/22573 ([4f0a38c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4f0a38caba2306cf7c962bdc8f1bb50411868802))
* Fix red color not working for Paulmann 500.4X https://github.com/Koenkk/zigbee2mqtt/issues/22686 ([588b035](https://github.com/Koenkk/zigbee-herdsman-converters/commit/588b0353bd9246a947922d78d21b778f8a255068))
* Improve `modernExtend` for Bosch BSEN-C*, BWA-1 & BTH-* ([#7525](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7525)) ([ac9a1b3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ac9a1b34d2bcec320f0613c5bc7ca92d5550f38c))

## [19.41.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.40.0...v19.41.0) (2024-05-18)


### Features

* **add:** RB 267 ([#7527](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7527)) ([010319f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/010319fc669fbdc2d7ef9ad3aa12ee4f3c540a0e))


### Bug Fixes

* **detect:** Detect `_TZB210_417ikxay` as MiBoxer FUT037Z+ https://github.com/Koenkk/zigbee2mqtt/issues/21659 ([668db65](https://github.com/Koenkk/zigbee-herdsman-converters/commit/668db653c96ee23be0d9abe0ef3417e4bb007b06))
* **detect:** Detect `_TZE204_v5xjyphj` as IOTPerfect PF-PM02D-TYZ https://github.com/Koenkk/zigbee2mqtt/issues/22664 ([945ec3f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/945ec3fe7e66d3f0a2c8a3f0af4ceb51c87328a5))
* **detect:** Detect `YRD410 PB` as Yale YRD410-BLE ([#7526](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7526)) ([fb8969c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fb8969c4961223b69a1a12d0dc5e8a4c625d0fba))
* Fix cannot find manuSpecificUbisysDeviceSetup ([#7532](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7532)) ([5f82043](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5f82043add431ed0eb9b40b728db480d46911f23))
* Fix ID checks for scene/group 0 ([#7529](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7529)) ([92b9918](https://github.com/Koenkk/zigbee-herdsman-converters/commit/92b9918a0a74c9d104a4a5a96f4547ddc039854a))
* Improvements for Aqara Spotlight T3 ([#7530](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7530)) ([c831f5c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c831f5cf0ad04fa0965ef9f657d289131eb3a943))

## [19.40.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.39.0...v19.40.0) (2024-05-15)


### Features

* Support more features for WETEN PCI E ([#7519](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7519)) ([4625587](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4625587758538febd3011596fc4c665f4bba0e88))


### Bug Fixes

* Convert Bosch BWA-1 to `modernExtend` ([#7523](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7523)) ([7456646](https://github.com/Koenkk/zigbee-herdsman-converters/commit/74566466f79c89427fbfeae6dd9a73b12f8260fe))
* **detect:** Detect `_TZ3210_hicxa0rh` as TuYa TS0505B_1 https://github.com/Koenkk/zigbee2mqtt/issues/22628 ([2dcf46e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2dcf46ec04bb8167bbe01046405f13dd65f37a4c))
* **detect:** Detect `TRADFRI bulb E12 WS candle 450lm` as IKEA LED2107C4 https://github.com/Koenkk/zigbee2mqtt/issues/22625 ([b0f1828](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b0f1828fa6c350e28053fcbf4f4f78de2a7f4ce1))

## [19.39.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.38.0...v19.39.0) (2024-05-14)


### Features

* **add:** 1CH-HP-RELAY-7853 ([#7517](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7517)) ([c7e6706](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c7e670672eb9c584429fe5462eb835c0ae9b0da0))
* Support more features for Zemismart ZM25R1 ([#7516](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7516)) ([6e53611](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6e5361164b11432f980fa7411d6e7fd0a9daba0c))


### Bug Fixes

* Add shared `modernExtend` for Bosch BTH-* ([#7520](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7520)) ([97fbbe3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/97fbbe36845244a62d2dd8cf572379e93e98d15f))
* **detect:** Detect `_TZE204_xu4a5rhj` as TuYa TS0601_cover_1 https://github.com/Koenkk/zigbee2mqtt/issues/22614 ([75a9996](https://github.com/Koenkk/zigbee-herdsman-converters/commit/75a9996ebd21db3a480abb048244522acc3e2a71))
* Fix 3RSNL02043Z `occupancy` report ([#7521](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7521)) ([dbd93c6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dbd93c68795292310d9da75cab9648e9b934132c))
* Fix ShinaSystem USM-300ZB not reporting humidity ([#7509](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7509)) ([168b01f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/168b01fc7288e9ea5176e135764803a7ea20d267))
* Note QOTO QT-05M timer must be set after starting auto shutdown ([#7510](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7510)) ([50ae491](https://github.com/Koenkk/zigbee-herdsman-converters/commit/50ae4914b4dc41119f5aeed8be91ef4a11def011))

## [19.38.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.37.2...v19.38.0) (2024-05-12)


### Features

* **add:** HO-C401N-z ([#7507](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7507)) ([c385d3f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c385d3fa7766ac5ab33bcc7124a1691663b6b8b6))
* **add:** TS0601_temperature_humidity_sensor_3 ([#7505](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7505)) ([83f8551](https://github.com/Koenkk/zigbee-herdsman-converters/commit/83f8551869113d215858d0cf03d5781a1688df1a))
* **add:** ZBMINIR2 ([#7506](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7506)) ([03b3caa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/03b3caa24632053d50ea5564600160ec03f69e87))


### Bug Fixes

* Convert Bosch BTH-RA to `modernExtend` ([#7498](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7498)) ([bb2bdee](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bb2bdeedcb9473d60a55a9a28859091f8eb6e315))
* Fix electrical measurements not working for  `_TZ3000_cehuw1lw` with swBuilId `1.0.5` ([#7482](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7482)) ([4182889](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4182889448e29e1bcf8e4aae961fe5dea0fa0543))
* Fix IKEA E2103 battery % multiplied by 2 https://github.com/Koenkk/zigbee2mqtt/issues/22528 ([5032c2a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5032c2a6bae52fb8cacb36b6135b551ecacd3146))
* **ignore:** Update dependencies ([#7508](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7508)) ([b53ba20](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b53ba20f6b21ba12efc7d2f5210eeb7153b0f8a3))
* **ignore:** Zigbee spec revamp ([#7488](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7488)) ([162f3cd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/162f3cdb26d9235d337b748c98d18627680bd01a))

## [19.37.2](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.37.1...v19.37.2) (2024-05-09)


### Bug Fixes

* **detect:** Detect `_TZE200_s1xgth2u` as TuYa TS0601_temperature_humidity_sensor_1 [@vivalton](https://github.com/vivalton) https://github.com/Koenkk/zigbee2mqtt/issues/17008 ([d1df40d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d1df40d12ea644ef8637703e9e538f483242d344))
* **ignore:** `ü` -&gt; `u` for `muller_licht.ts` ([4a325d3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4a325d3c510dd49abc4537feef32659912ab0b9f))
* **ignore:** update dependencies ([#7502](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7502)) ([559c7e3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/559c7e356ae9475145bbcd2f0c881cd2c070d8a5))

## [19.37.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.37.0...v19.37.1) (2024-05-08)


### Bug Fixes

* Fix Backlight for TuYa TS0013 ([#7497](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7497)) ([085aebc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/085aebc008c0bfa76b4e3bb3d3c8a1e31cbcbe01))

## [19.37.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.36.1...v19.37.0) (2024-05-07)


### Features

* Improve support for Bosch BTH-RM230Z & BTH-RM ([#7490](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7490)) ([5aa38e9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5aa38e9c87f0bd30a8c60bc354bac80770122e01))


### Bug Fixes

* Fix configure failing and no lock/unlock action for Yale YAYRD256HA2619 https://github.com/Koenkk/zigbee-herdsman-converters/pull/7330 ([597b7d3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/597b7d3e716e3bec81b77b3f3115b88da84502cf))
* Fix IKEA E2001/E2002 configure https://github.com/Koenkk/zigbee2mqtt/issues/22458 ([ec20f70](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ec20f700bd3b372cc9c249d44db5e2767992df88))
* Fix Iluminize 511.10 not detected as supported https://github.com/Koenkk/zigbee2mqtt/issues/22468 ([4a02de0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4a02de087d2a5271ad63d8def0cf1da38fb52f45))
* Rename `TONGOU` -&gt; `Tongou` https://github.com/Koenkk/zigbee2mqtt.io/pull/2742 ([9668d36](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9668d36dff60a721c66110dc85236e0d4184b211))

## [19.36.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.36.0...v19.36.1) (2024-05-06)


### Bug Fixes

* Add missing `manuSpecificLumi` to Aqara ZNJLBL01LM https://github.com/Koenkk/zigbee2mqtt/issues/22475 ([0bdd6bf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0bdd6bf799d131a06a013dc3003eadcd760faf5d))

## [19.36.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.35.0...v19.36.0) (2024-05-05)


### Features

* Add `colorloop` effect for color lights ([#7479](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7479)) ([b251e87](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b251e8736bf397c9f6528ad70c4946b21431a17c))
* Improve support for Bosch  BTH-RM230Z ([#7484](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7484)) ([2101914](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2101914e85d864246694a1f8d334a92781ffe9bc))


### Bug Fixes

* Expose missing actions for Hue Wall Switch Module (929003017102/RDM001) ([#7489](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7489)) ([aa96bc3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aa96bc30cd50d40c7406523d2bb02cc63e2ad2b1))
* Fix `power` not updating for Aurora Lighting AU-A1ZBDSS https://github.com/Koenkk/zigbee2mqtt/issues/22464 ([04a1def](https://github.com/Koenkk/zigbee-herdsman-converters/commit/04a1def080cbf1be9f774dfa2a0a0991a4170291))
* Fix IKEA E1524/E1810 and E2001/E2002 right/left hold action not working https://github.com/Koenkk/zigbee2mqtt/issues/22458 ([4fc2717](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4fc27178e0c2af383182479391a3ca19e26bc3a9))
* Fix inverted cover status for LED-Trading 9135 ([#7486](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7486)) ([9d3e85c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9d3e85cd48be895a1cfae2c51fce50cbf7d82f57))
* Fix no action on color wheel for Sunricher ZG2858A https://github.com/Koenkk/zigbee2mqtt/issues/22467 ([987343c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/987343ce9bdb4f7f5cc3ddd7c619047d760374b2))
* **ignore:** update dependencies ([#7485](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7485)) ([7fc3276](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7fc327694289b6c9ef820ece02a834ee920484a7))

## [19.35.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.34.0...v19.35.0) (2024-05-04)


### Features

* **add:** THS317-ET-EY [@awhitwam](https://github.com/awhitwam) https://github.com/Koenkk/zigbee2mqtt/issues/19804 ([6696098](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6696098219fea6f1d354b534299b5446110be165))


### Bug Fixes

* **detect:** Detect `_TZE204_pfayrzcw` as TuYa MTG035-ZB-RL https://github.com/Koenkk/zigbee2mqtt/issues/22440 ([95f7efb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/95f7efba2686b312ef8eb7d26606f4f62198e7d2))
* **detect:** Detect `_TZE204_znvwzxkq` as Zemismart ZN2S-RS3E-DH https://github.com/Koenkk/zigbee2mqtt/issues/21940 ([d604f89](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d604f8903c126260a9a03ecdcc23d20b11880c1e))
* Fix `motor_state` for ZNCLDJ12LM ([#7483](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7483)) ([8fe5f3f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8fe5f3fe459a9ff82378fbd678f03eb10d43c95a))
* Fix no actions for some TuYa TS0026 https://github.com/Koenkk/zigbee2mqtt/issues/22328 ([71e39f7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/71e39f759ab0aebe9304e374488119f1e842c875))

## [19.34.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.33.0...v19.34.0) (2024-05-02)


### Features

* **add:** TICMeter ([#7460](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7460)) ([2e43952](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2e43952f93f5cae6cdaa9a31ec6756c7ad4dcfab))
* Allow exposes function in combination with modernExtend ([#7463](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7463)) ([06303b4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/06303b4495bc84f2d161e96c8a2f0922b2ae534f))
* Support on/off countdown for various TuYa devices ([#7475](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7475)) ([0005865](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0005865611c7697a3921a188cb5fcd7a49554f8a))


### Bug Fixes

* **detect:** Detect `_TZE200_2se8efxh` as TuYa TS0601_soil [@supaeasy](https://github.com/supaeasy) https://github.com/Koenkk/zigbee2mqtt/issues/22364 ([670aa9a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/670aa9addb9ee42a27deff1a13a4bd9d0ecb4740))
* Disable unsupported power outage memory for Aqara CL-L02D https://github.com/Koenkk/zigbee2mqtt/issues/22219 ([5d3cc86](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5d3cc8629ccb55e9520b79bd5028408b17df3807))
* Fix `motor_state` for Lumi ZNJLBL01LM https://github.com/Koenkk/zigbee2mqtt/issues/22387 ([df0569c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/df0569c59b91debd138ebf9c50d4554ad4b0e40b))
* Fix `ReferenceError: meta is not defined` for Lumi devices https://github.com/Koenkk/zigbee2mqtt/issues/22403 ([d8b47c4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d8b47c4b68fe95ebc07d3950a8607e90c2631e7d))
* Move Ubisys clusters/attributes out of zh ([#7451](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7451)) ([5a02438](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5a02438c2526ff5d32fa01dc0096a4c665e7ec36))
* Support color for Philips 7602031K6 https://github.com/Koenkk/zigbee2mqtt/discussions/22212 ([b99bbf1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b99bbf1fb439100c08fd21ab8927f10542159052))

## [19.33.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.32.0...v19.33.0) (2024-05-01)


### Features

* ZCL types revamp ([#7456](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7456)) ([bab4322](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bab43229b331b271b3a17c2a8c76856720f58981))


### Bug Fixes

* **detect:** Detect `_TZ3000_gdyjfvgm` as TuYa TS011F_5 [@mircicd](https://github.com/mircicd) https://github.com/Koenkk/zigbee2mqtt/discussions/22356 ([51b1f70](https://github.com/Koenkk/zigbee-herdsman-converters/commit/51b1f7051171d27eb03599d9f14af21be5086e66))
* Rework and expand occupancy extend ([#7441](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7441)) ([0ca12a2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0ca12a2f105070abea9e4c1cbcd80a103a9a2b36))

## [19.32.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.31.1...v19.32.0) (2024-05-01)


### Features

* **add:** LYWSD03MMC-z, CGDK2, TS0201-z ([#7457](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7457)) ([cb6dd3e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cb6dd3ed2d1001912ec699025d66939de04c5542))
* **add:** TS0002_switch_module_4 ([#7469](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7469)) ([6a544cc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6a544cc798008ef10159e7bc551867dbb29fed19))
* Improvements for TuYa PJ-1203A ([#7455](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7455)) ([6152028](https://github.com/Koenkk/zigbee-herdsman-converters/commit/61520281646c67873590d24a7d1d290c02a510b0))
* Support `on_level` for Legrand 067771 ([#7472](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7472)) ([425d755](https://github.com/Koenkk/zigbee-herdsman-converters/commit/425d7551c86ede1f040012d629e9f01e8ece21fd))
* Use common `motor_state` values for Bosch & Lumi devices ([#7470](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7470)) ([5f578b1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5f578b163c22db66e87e0968074371243a80d875))


### Bug Fixes

* Correct attribute name for Aqara curtain hand open ([#7476](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7476)) ([1f91c88](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1f91c882813b7cd289676a3fcc45acacd1fb8c55))
* **detect:** Detect `_TZ3000_tgddllx4` as Colorock CR-MNZ1 ([#7474](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7474)) ([1fd4f7b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1fd4f7bed34dd56fbc620f1bc87ea48ddf9a08e9))
* Fix `cover_position_tilt_disable_report` ([#7467](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7467)) ([9db6203](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9db6203c657978107f5bfc249278bba5bae4c5f5))
* Fix Eurotronic Zigbee Spirit system mode/host flags ([#7473](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7473)) ([b4a0cba](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b4a0cba4922ee12bc7c056d92919fe7e3b0ea37f))
* Fix ROBB ROB_200-024-0 battery percentage divided by 2 https://github.com/Koenkk/zigbee2mqtt/issues/22348 ([3839ea6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3839ea6df4f0e66d9fc6f01faffd1298d7e508e5))
* Fix typo "indetify" to "identify" ([#7468](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7468)) ([584b0b5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/584b0b5c16c2bad9a7f41932ac42bf35deb6cec6))
* **ignore:** Revert "fix(ignore): fix datatype" ([04e4a50](https://github.com/Koenkk/zigbee-herdsman-converters/commit/04e4a50673c29888f3a488ccd17473ec10af8432))
* **ignore:** update dependencies ([#7477](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7477)) ([9845942](https://github.com/Koenkk/zigbee-herdsman-converters/commit/984594233a3cec84900028e7deef402e38085d51))

## [19.31.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.31.0...v19.31.1) (2024-04-29)


### Bug Fixes

* **ignore:** fix datatype ([b19c1f5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b19c1f542a7e332d924e609134b852f45552a717))

## [19.31.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.30.0...v19.31.0) (2024-04-29)


### Features

* OTA support for Innr SP 240,242 and 244 ([#7464](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7464)) ([f8b2e55](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f8b2e55bf685ab0316acecb1ef3147ad6d0f71a2))


### Bug Fixes

* Fix `Value '5' is not allowed` for TuYa TS0601_fan_5_levels_and_light_switch https://github.com/Koenkk/zigbee2mqtt/issues/21787 ([c7123ab](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c7123ab65cc52441997f5a40f1fb26b5408dc819))

## [19.30.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.29.0...v19.30.0) (2024-04-28)


### Features

* Add toggle for `cover_position_tilt_disable_report` ([#7461](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7461)) ([a811aca](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a811acaa94a8343b7247b3a925dbdc3c09c0f1dc))
* **add:** CCT5010-0003 ([#7454](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7454)) ([df05493](https://github.com/Koenkk/zigbee-herdsman-converters/commit/df054935493d6dbce1e28f61e68f6e14fd6e2073))
* **add:** OLS 210 https://github.com/Koenkk/zigbee2mqtt/issues/22291 ([401cbe2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/401cbe22f25b9e600ea57407cbcc64c1f0327768))
* Expose `broadcast_alarm` for Bosch BSD-2 ([#7427](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7427)) ([bba8c0b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bba8c0b2ff6e87e38560cb7f7e4992dabc538f1b))


### Bug Fixes

* Fix illuminance not reporting for Bosch RFDL-ZB-MS @Ltek https://github.com/Koenkk/zigbee2mqtt/issues/22294 ([652188d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/652188dbc3fd7f01a9d1a941e03097c6ef76243f))
* Fix invalid `contact` for MCCGQ01LM ([#7452](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7452)) ([d9640a4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d9640a4d39fcc924d97e2a1034105c75452ff8c2))
* Fix TuYa TS0601_illuminance_temperature_humidity_sensor_2 exposes units https://github.com/Koenkk/zigbee2mqtt/issues/22332 ([f01f126](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f01f1263ed3f91481723bcaf240c7dc2f9d265f2))
* **ignore:** update dependencies ([#7458](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7458)) ([c254062](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c254062beaa4f1d23ad2402c4092e5ce588f5099))
* **ignore:** update dependencies ([#7462](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7462)) ([bc8d371](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bc8d37191ed76cba8d4223db8121a1ac6a8ceb4d))
* IKEA VINDSTYRKA uses different DataType for measuredValue ([#7450](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7450)) ([6d328d1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6d328d12dc6f82bf58b188e308112dbff140ca1c))
* Improve position reporting for Bosch BMCT-SLZ ([#7438](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7438)) ([badb0e5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/badb0e5a58c11f3b4932ae54f90044f3d856fe7d))

## [19.29.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.28.0...v19.29.0) (2024-04-27)


### Features

* **add:** HK-SL-DIM-US-A ([#7445](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7445)) ([311c378](https://github.com/Koenkk/zigbee-herdsman-converters/commit/311c378f97d3e294f99554fc4849a908755a83a9))
* **add:** SBDV-00154 ([#7446](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7446)) ([4b40445](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4b404450b2613e553b717b3d9554f690ac38e227))
* **add:** ZWV-YC [@hyperlogic-dev](https://github.com/hyperlogic-dev) https://github.com/Koenkk/zigbee2mqtt/issues/21788 ([4b57e3e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4b57e3e40b6be6fdccd304f629f8083c89a11581))


### Bug Fixes

* Add Yandex whitelabels ([#7447](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7447)) ([7cf138a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7cf138ab02fb8a279133a928168c9baf51eea71f))
* **detect:** Detect `_TZE200_g5xqosu7` as TuYa TS0601_cover_8 @Killi77 https://github.com/Koenkk/zigbee-herdsman-converters/issues/7308 ([43a1a05](https://github.com/Koenkk/zigbee-herdsman-converters/commit/43a1a0591861745b81a3d12999d7f3ff6a8931a0))
* Refactor modernExtend configure to array ([#7444](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7444)) ([b876f55](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b876f557a623be8c1cd2a9cce114be58e134de83))
* Update WS-K01D description ([#7448](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7448)) ([d5fd600](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d5fd60033abe6f7adebda0588a947171badf83db))

## [19.28.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.27.0...v19.28.0) (2024-04-25)


### Features

* **add:** VIYU_C35_470_CCT_10454468 ([#7435](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7435)) ([260daff](https://github.com/Koenkk/zigbee-herdsman-converters/commit/260daff06201ec1bd47f6d78dbb27bfd2d78c81b))


### Bug Fixes

* Fix configure failing for `_TZ3290_gnl5a6a5xvql7c2a` https://github.com/Koenkk/zigbee2mqtt/issues/22312 ([d558b55](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d558b550d82c822872eea9f28f9e2047756982b8))
* **ignore:** fix 99613a7a522f916cc3a0bfc2b52ac26363c07b3a ([99af051](https://github.com/Koenkk/zigbee-herdsman-converters/commit/99af051397753f44c9f3de7e3eb0afb679b6de7e))
* **ignore:** fix d558b550d82c822872eea9f28f9e2047756982b8 ([915f784](https://github.com/Koenkk/zigbee-herdsman-converters/commit/915f784da0b77640b6da00a1b5f2af233eb316eb))
* Improvements for FORIA and LEDRON devices ([#7437](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7437)) ([3d5322a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3d5322a59f46057b0db634438bb3a663506d5196))
* Improvements for PTVO ([@ptvoinfo](https://github.com/ptvoinfo)) ([#7443](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7443)) ([68b6e08](https://github.com/Koenkk/zigbee-herdsman-converters/commit/68b6e087227a9419739ad1a986712e4d9a119209))
* Refactor F00YK04-18-1 to modernExtend ([#7439](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7439)) ([f01909f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f01909f88622efdfa5136cc1d5417490714f90f7))

## [19.27.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.26.0...v19.27.0) (2024-04-23)


### Features

* Add custom cluster for SONOFF TRVZB ([#7432](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7432)) ([99613a7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/99613a7a522f916cc3a0bfc2b52ac26363c07b3a))
* **add:** RB 243 ([#7425](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7425)) ([7ee566b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7ee566b85c310c9f1b9cecb63d78e609d3b216e1))


### Bug Fixes

* **detect:** Detect `_TZE200_snloy4rwz` as Nous SZ-T04 ([#7424](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7424)) ([cd2670f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cd2670fd4e604f701269034f1855bd78cba04b57))
* **detect:** Detect `440400982843` as Philips 915005733701 ([#7428](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7428)) ([edc9fb9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/edc9fb974808801fe278a3d6c041a78af4b23f59))
* **ignore:** update zigbee-herdsman to 0.43.0 ([#7431](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7431)) ([f93b210](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f93b2105188b7cf96b264bcf2cc163ddb583aa5a))
* Increase Elko 4523430 max load ([#7430](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7430)) ([85c1cd1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/85c1cd1a7ffba2ab7b0e9b8549bb4dda67dfa39c))

## [19.26.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.25.0...v19.26.0) (2024-04-21)


### Features

* Add smoke sensitivity option for Bosch BSD-2 ([#7416](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7416)) ([31ad5a7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/31ad5a753aacc311fe0996a3a696ea0dcf51dc90))
* **add:** 81898 ([#7420](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7420)) ([b7d939b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b7d939b21dd39f20b2786078cfabc9675195f3a6))
* **add:** RB 272 T ([#7414](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7414)) ([93ff4ed](https://github.com/Koenkk/zigbee-herdsman-converters/commit/93ff4ed6efb01e9a4824a616facff73f5c2c851c))
* **add:** TRV601 ([#7407](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7407)) ([a8443ce](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a8443ceeebae59e4fcdc12b7a560822755aba1d0))
* **ignore:** Legrand 067776(A): Improved PR#[#7412](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7412) ([#7413](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7413)) ([37e46eb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/37e46eb5ad60fcb3ebf2b3ef614833127bd0133f))


### Bug Fixes

* **detect:** Detect `_TZE200_0nauxa0p` as Lonsonho EDM-1ZBB-EU ([#7422](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7422)) ([fd484a9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fd484a9feeafc4adba5acfb0c24219b3d3f9636d))
* GS: use alarm_2 for SGPHM-I1 and attribute cleanup ([#7417](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7417)) ([0f23246](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0f232468a78f0acba06f4a48069cdfdafd013766))
* **ignore:** fix b7d939b21dd39f20b2786078cfabc9675195f3a6 ([6689a08](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6689a082e551cd6a86c1384a8784235fc014fe79))

## [19.25.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.24.0...v19.25.0) (2024-04-20)


### Features

* **add:** MEG5116-0300_MEG5162-0000, MEG5116-0300_MEG5151-0000 ([#7408](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7408)) ([bf55e18](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bf55e186edd492742efaffe1ac1f52a40d79a8c9))
* **add:** TS0601_floor_thermostat ([#7409](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7409)) ([9a6b1fb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9a6b1fbef9d28f0d5b4e2c21cf43ed9e426f588f))
* Legrand 067776(A): Added support for showing / hiding the tilt control ([#7412](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7412)) ([79864a1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/79864a185e5fdeb4c2c0543affc3ae974a061d34))


### Bug Fixes

* Rework `zoneStatus` converter for Bosch BSD-2 ([#7399](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7399)) ([ad3dc6d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ad3dc6dc31cec20b27f862fa61db78ac39f489d4))

## [19.24.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.23.0...v19.24.0) (2024-04-18)


### Features

* Add Calibration attributes for SIN-4-RS-20 ([#7230](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7230)) ([8f4e11a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8f4e11a7e58d258a0c435bc9c3256957623917dc))
* Add valve opening and closing configuration for Sonoff TRVZB ([#7130](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7130)) ([87601c2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/87601c2ef2bd2a39def901580fb7f3630e751840))
* **add:** TS0505B_3 ([#7349](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7349)) ([060afba](https://github.com/Koenkk/zigbee-herdsman-converters/commit/060afba7b22e07c956858c9afdefbf9830283187))


### Bug Fixes

* **ignore:** fix afc386ed6623b5492d2d3440aa7dbe389ca8d533 ([76c7244](https://github.com/Koenkk/zigbee-herdsman-converters/commit/76c72447d157300b161d89f64145be9e84187476))

## [19.23.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.22.0...v19.23.0) (2024-04-16)


### Features

* **add:** HK-SENSOR-4IN1-A ([#7391](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7391)) ([3ef3f23](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3ef3f23d5caa3c2d17da07732c10dcaba3b22166))
* **add:** L2205 ([#7402](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7402)) ([42de059](https://github.com/Koenkk/zigbee-herdsman-converters/commit/42de059319ce6dbd1f49ee396e4684bf71385126))
* **add:** MEG5126-0300/MEG5152-0000 ([#7385](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7385)) ([7bc953c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7bc953c99ef4d996f275b8d50abf14304370bbfe))
* **add:** TS0601_gas_sensor_4 ([#7397](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7397)) ([daa8a4d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/daa8a4d336f1b31f740239db0b9f1e455f6c5312))
* **add:** ZR360CDB ([#7401](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7401)) ([ee4c197](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ee4c197aa48af5a5c21b51dcfb2ca75d429b6e8d))


### Bug Fixes

* **detect:** Detect `_TZE200_qyss8gjy` as TuYa TS0601_light https://github.com/Koenkk/zigbee2mqtt/issues/22209 ([b740134](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b7401344f1a91934323e1fa7d2fbba8397b6bb2c))
* **detect:** Detect `LTC010` as Philips 6109331C5 https://github.com/Koenkk/zigbee2mqtt/issues/22230 ([2555267](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2555267ea74ffb2ea1d15622c9761a588826bac1))

## [19.22.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.21.0...v19.22.0) (2024-04-15)


### Features

* **add:** ZDMS16-1, ZDMS16-2 ([#7398](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7398)) ([da646ed](https://github.com/Koenkk/zigbee-herdsman-converters/commit/da646ed04b0d21e9bead5185320e4457583d5f70))


### Bug Fixes

* **ignore:** update dependencies ([a5e7cdf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a5e7cdfec08f7d2bc595d6dfd83dab9b1e54b5f0))
* Remove unsupported color from Innr RS 128 T https://github.com/Koenkk/zigbee2mqtt/discussions/22205 ([57ffe0d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/57ffe0de55d53276cf53e87dc4ce8dc5f7c0d3ac))

## [19.21.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.20.0...v19.21.0) (2024-04-13)


### Features

* Added levelConfig to MEG5126-0300/MEG5172-0000 ([#7395](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7395)) ([8ca9dd8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8ca9dd81ebd470d0cd1602065fbd59d1171d13f3))
* **add:** SDM01 ([#7384](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7384)) ([04198e0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/04198e075782b8361668d370a50fc0bd45e5ffae))
* ptvo.switch: expose DC power metering ([#7390](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7390)) ([be49ef4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/be49ef4e55eb9cfd82e6a7b03c86e50c94e66445))


### Bug Fixes

* Aqara: refactor rotary knobs to modern extend ([#7392](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7392)) ([fedbf7a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fedbf7a80653d999c0d475d9b8e65d50a5da4c3a))
* Disable unsupported power on behaviour for Hive HALIGHTDIMWWE27 https://github.com/Koenkk/zigbee2mqtt/issues/22183 ([3fc4c50](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3fc4c5053b0ad30671c6c89f5c74304463353ded))
* Fix brightness out of range for various TuYa devices https://github.com/Koenkk/zigbee2mqtt/issues/22078 ([afc386e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/afc386ed6623b5492d2d3440aa7dbe389ca8d533))
* Sonoff: force power source for SNZB-01P ([#7393](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7393)) ([13afed5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/13afed5690db216016dc023ab214417544ef63f6))

## [19.20.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.19.1...v19.20.0) (2024-04-11)


### Features

* **add:** 501.37 ([#7380](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7380)) ([c400db4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c400db4fb3ecd68e56c9ed06c4cf66126c007c4c))


### Bug Fixes

* **detect:** Detect `_TZE204_cirvgep4` as TuYa ZTH08-E ([#7387](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7387)) ([bdb1092](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bdb109239af24af93f465310fad5e92c9f9a46fb))
* **detect:** Detect `_TZE204_vevc4c6g` as TuYa TS0601_dimmer_1 [@mrespin](https://github.com/mrespin) https://github.com/Koenkk/zigbee2mqtt/issues/21980 ([dd6f853](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dd6f853e1e612be0a122d517e061e478287f2c5b))
* Improvements for Bosch 8750001213 Twinguard  ([#7383](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7383)) ([06458b1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/06458b1bb5ae29a1976b7dca1764f031d6bbe497))
* Minor improvements for Bosch BWA-1, BSD-2, BSEN-C2 & BSEN-CV ([#7386](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7386)) ([e02e867](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e02e867683a3310890fc073a22a9a621b511b8f5))

## [19.19.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.19.0...v19.19.1) (2024-04-10)


### Bug Fixes

* **detect:** Detect `TRADFRI bulb E26 WW globe 806lm` as IKEA LED2103G5 https://github.com/Koenkk/zigbee2mqtt/issues/20400 ([600808e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/600808e0653701bfeeb5044fb38b2b03a70da9c8))
* Fix `alarm_on_motion` option for Bosch BWA-1 ([#7378](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7378)) ([b5ef792](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b5ef792dd030c1c82d1f2d1b16b038e763331f2b))
* Fix Bosch BTH-RA `display_ontime` ([#7379](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7379)) ([a0a1bff](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a0a1bff6e4b39d30fcb1a516dcefc791a0900dc9))
* Fix TS0601_gas_sensor_3 detection https://github.com/Koenkk/zigbee2mqtt/issues/21741 ([ef4a07a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ef4a07a1e31e222975a7e22b09e8d3f2051f3e58))
* Inovelli: update some attribute descriptions for clarity ([#7381](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7381)) ([817e904](https://github.com/Koenkk/zigbee-herdsman-converters/commit/817e9040232d9062edab751a897dab47eb33c62e))
* Use endpoint ids for filtering instead of friendly names ([#7374](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7374)) ([efe8860](https://github.com/Koenkk/zigbee-herdsman-converters/commit/efe886032f37bd7fbf7ef34bcc9d06c9da11f2b7))

## [19.19.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.18.0...v19.19.0) (2024-04-09)


### Features

* **add:** MWM002 ([#7370](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7370)) ([ace7392](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ace7392f4ff4b657e01df8ea93fc86f91992e8dc))


### Bug Fixes

* **detect:** Detect `06e01d220c` as Yale YMF40A RL https://github.com/Koenkk/zigbee2mqtt/issues/11199 ([dd9f149](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dd9f1490fa3ebb3aaaf56b4c56d44a7afd500000))
* **detect:** Detect `RGBWW Lighting` as 511.050 ([#7369](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7369)) ([15682b8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/15682b8ea0a1658c61ff77fedd03232f6504ab50))
* Fix Inovelli VZM35 Breeze Mode ([#7373](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7373)) ([87322ef](https://github.com/Koenkk/zigbee-herdsman-converters/commit/87322ef29112a41e531f7be70e52efc80e4e32d7))
* Fix Legrand identify ([#7377](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7377)) ([76ce844](https://github.com/Koenkk/zigbee-herdsman-converters/commit/76ce8448a8707e1af3f5baab712257192cee4b0c))
* Fixes for Bosch BSD-2 & BWA-1 ([#7372](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7372)) ([c39d544](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c39d54401d6f975e7bdbe804e2e8a9f5e8c17cf3))
* Report Aqara LLKZMK12LM `energy` in kWh instead of Wh https://github.com/Koenkk/zigbee2mqtt/issues/22148 ([dda6b7b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dda6b7b82f5b88f26b26384a31311fd250cf8a15))
* Use legacyAction in modern extends to avoid problems from converter duplication ([#7376](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7376)) ([6ce51f9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6ce51f9cdbf2fb2fe2f7c4e9a1808e25769a4ae8))

## [19.18.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.17.0...v19.18.0) (2024-04-08)


### Features

* **add:** 3RDTS01056Z ([#7361](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7361)) ([e14ce72](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e14ce72c669053b833e1f4f4ebb13ab0b0b69d10))
* **add:** EKAC-T3095Z ([#7340](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7340)) ([0120e5e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0120e5e029d6efc2228d828ee40ce5d00313df96))
* **add:** PIR313-P, DWS312 ([#7362](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7362)) ([2388f8d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2388f8da8cb5ee6fbe7233a02c1cf51513b285d8))
* **add:** SZT06 V2.0 ([#7365](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7365)) ([398084b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/398084b6245e28b15889fcd7f8e24d196c0fbdd3))


### Bug Fixes

* Add RoomsAI 1-2-3 gang touch switches ([#7364](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7364)) ([42bbac4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/42bbac44e4cb1a53c5e22a181d504ce621b33546))
* Added typing for `lookup`; fixed resulting issues. ([#7367](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7367)) ([cd9f978](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cd9f978466c42106856e698eeb37bda3e5457534))
* **detect:** Detect `_TZ3000_wkai4ga5` and `_TZ3000_uaa99arv` as TuYa TS0044 https://github.com/Koenkk/zigbee2mqtt/issues/21458 ([30ec39a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/30ec39a43dd28c0a8c50abc9811bfac0e7fefd0f))
* Fix Aqara FP1 zones problem ([#7360](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7360)) ([0204ac3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0204ac3dcf925e6c6d4f6b208defe646eb0d06f9))
* Fix missing `ssIasZone` cluster on Bosch BWA-1 ([#7359](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7359)) ([27d72d4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/27d72d409fcfd14c87c925a25a48146cfb17ec8c))
* Fix TuYa TS0726 not sending actions ([#7354](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7354)) ([7e7cb0d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7e7cb0da1088747bb41c1c9944a47569e455b7d9))
* Improve bindings and `configure` for Bosch BSD-2, BWA-1, BSEN-C2 & BSEN-CV ([#7355](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7355)) ([f92d964](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f92d96411e7c9cccf1358e3547b8a2e16eac24da))
* Improvements for Legrand Devices ([#7358](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7358)) ([00b10b7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/00b10b7cf082eb3438f76f094970c6739f969853))

## [19.17.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.16.0...v19.17.0) (2024-04-07)


### Features

* **add:** alab.switch ([#7342](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7342)) ([7cc28d7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7cc28d7234c7fd1095ece258262b9ff9ad36635e))
* **add:** SMRZB-153 https://github.com/Koenkk/zigbee2mqtt/issues/21814 ([d75e90b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d75e90b2480314cf4aa7a9ec3213f897639fd6c1))
* **add:** TS0601_fan_5_levels_and_light_switch ([#7346](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7346)) ([5513fa2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5513fa2ed62aec6a5f3b3dd96c599954cc554852))
* **add:** ZNXNKG01LM ([#7351](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7351)) ([01074c7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/01074c7131736ce30ccd50a1dc5e4dfbcdd25bbe))
* Separate Sber devices and add SBDV-00079 ([#7328](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7328)) ([82348a3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/82348a36899f2983d7308b0724e547b73a94dc5b))


### Bug Fixes

* Fix `genLevelCtrl` target cluster type ([#7343](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7343)) ([0625713](https://github.com/Koenkk/zigbee-herdsman-converters/commit/06257135259d03d64dcb9d9606d8ee69934f7bc5))
* Fix SPM01-U01 and SPM02-U01 not reporting energy ([#7350](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7350)) ([781f691](https://github.com/Koenkk/zigbee-herdsman-converters/commit/781f691dfefb4f7b11c1226d9e089d1871fc8e20))
* Fixes for Bosch BWA-1 & related converters ([#7345](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7345)) ([abed8b6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/abed8b6eb0521e0717e7fc2b894ac68b1182d5c2))

## [19.16.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.15.0...v19.16.0) (2024-04-06)


### Features

* **add:** 929003555701 ([#7338](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7338)) ([b4fd9f5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b4fd9f5651b7ab72dad9e22eeb74979d8acdb28e))


### Bug Fixes

* Add cluster type option to `setupConfigureForBinding` ([#7337](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7337)) ([56829c0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/56829c0ebcfa2b4baba771dbeb8471ab3877e0ae))
* **detect:** Detect `_TZE200_lawxy9e2` as TuYa TS0601_fan_and_light_switch https://github.com/Koenkk/zigbee2mqtt/issues/22097 ([a029794](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a029794324964fd3cd0570bc7a304252340916c6))
* Fix `has multiple 'ota', this is not allowed` error for Hue devices with multiple endpoints https://github.com/Koenkk/zigbee2mqtt/issues/22061 ([f7ab37d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f7ab37d81cfe8603c0d85110f5da76b28f61b4eb))
* Fix alarm states for Bosch BSD-2 ([#7329](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7329)) ([e8d4e77](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e8d4e77a6cb1f26a2363957e4d62df77b63b9ddb))

## [19.15.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.14.0...v19.15.0) (2024-04-04)


### Features

* **add:** 98424072 ([#7333](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7333)) ([01adf2a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/01adf2a5a5a4d40a17af026ec075ecaff0ef1188))
* **add:** E21-N14A ([#7327](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7327)) ([354d695](https://github.com/Koenkk/zigbee-herdsman-converters/commit/354d695d13aaff80c41869d9a5813370e384c43a))
* **add:** YAYRD256HA2619 ([#7330](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7330)) ([e437ee0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e437ee0665324c93245a222bf3d3c65f0190688a))


### Bug Fixes

* **detect:** Detect `_TZ3000_zwszqdpy` as Ledron YK-16 https://github.com/Koenkk/zigbee2mqtt/issues/22067 ([d11578d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d11578d018a67e587e84f3a36a0db3a4c698af69))
* Expose `identify` for Climax PRL-1ZBS-12/24V ([#7332](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7332)) ([3d91c57](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3d91c57c830ed8feac56f2f127a2fd37b4e6cb2b))
* Fix `sensor` expose for TuYa MTG075-ZB-RL @BKuba65 https://github.com/Koenkk/zigbee-herdsman-converters/issues/7331 ([12fead2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/12fead2d455ac3524b8a91db74e8c951af18f29f))
* Invert cover state for Sunricher SR-ZG9080A ([#7334](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7334)) ([7e14233](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7e14233241be3a174b3eb881deaba65f2a2ce4f9))
* Updates for Schneider Electric WDE002906/MEG5001-0300 ([#7268](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7268)) ([f9a025c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f9a025c041c8dfc47d10e46bb65075c983a50696))

## [19.14.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.13.0...v19.14.0) (2024-04-03)


### Features

* **add:** F00YK04-18-1 ([#7316](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7316)) ([585b2b7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/585b2b71329654de77753d16e7e293951a90909c))


### Bug Fixes

* Added BTicino FC80GCS and 4411C ([#7322](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7322)) ([a65a3d0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a65a3d0d91f1795684435912a8b3e5bf83fb0a89))
* Cleanup old logger leftovers ([#7319](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7319)) ([9c1cd72](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9c1cd722d5ff1feb9e427adb6e32c2c4e144a46a))
* **detect:** Detect `_TZ3000_g9g2xnch` as TuYa YSR-MINI-Z https://github.com/Koenkk/zigbee2mqtt/issues/22037 ([2c99470](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2c99470cdc7768902311d3703642476d0e10629f))
* **detect:** Detect `_TZE200_rsj5pu8y` as TuYa TS0601_cover_1 https://github.com/Koenkk/zigbee2mqtt/issues/22037 ([832f643](https://github.com/Koenkk/zigbee-herdsman-converters/commit/832f643f31e84b07ade1be663a57f916395f0baa))
* Fix color not controllable for various Sengled bulbs ([#7317](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7317)) ([6500935](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6500935b2fee1604bc8a10f866e3ed7f31ba5dcd))
* Improve logging levels ([#7325](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7325)) ([461ffa4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/461ffa499c8c90156401c2f24544f892d230d33e))
* Use cluster names to bind Bosch Twinguard ([#7318](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7318)) ([9d06b7e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9d06b7e66183ec232d80b6ff962938d9f98c92e7))

## [19.13.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.12.1...v19.13.0) (2024-04-02)


### Features

* Improve logging ([#7289](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7289)) ([5fa8327](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5fa8327da80fc9eb85d284f67cef970c30939079))

## [19.12.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.12.0...v19.12.1) (2024-04-02)


### Bug Fixes

* **ignore:** fix ikea.ts ([cb9910f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cb9910f44ae49195638b8114d71e8633b0003088))

## [19.12.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.11.2...v19.12.0) (2024-04-02)


### Features

* **add:** BMCT-DZ ([#7305](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7305)) ([125f37f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/125f37f1082f47568197bcaeed694fd33494c67e))
* **add:** COZIGVS ([#7302](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7302)) ([c8055b6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c8055b65926408e5cde48c9f0489890b6b8d2e13))
* **add:** F00MB00-04-1 ([#7306](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7306)) ([dcdb8a9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dcdb8a92127e0114b34240f6943366cc90e001a5))
* **add:** F00XN00-04-1 ([#7310](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7310)) ([ec8acc9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ec8acc9e5369087075869683161a57a5c2574367))
* **add:** ZBMicro ([#7234](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7234)) ([d972ea6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d972ea68745164b324bb0a0903f8e5da0143528c))


### Bug Fixes

* Change AQI scale for Bosch 8750001213 Twinguard  ([#7313](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7313)) ([c6f18b4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c6f18b40229bb5d9f080b1836074cd8d7cdad8ca))
* Convert IKEA to modern extend ([#7220](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7220)) ([c5b17c4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c5b17c4bdd62e40c5442cb2c05db26c495f551f8))
* **detect:** Detect `_TZ3000_zwszqdpy` as Ledron YK-16 ([#7309](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7309)) ([c8dc935](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c8dc935581d4dd7d8eff507367e591c72200c961))
* **detect:** Detect `_TZE204_bjzrowv2` as TuYa TS0601_cover_1 https://github.com/Koenkk/zigbee2mqtt/issues/22016 ([dbf535c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dbf535c94244d6fb7966e1110342aad55994dc6b))
* Fix `args` not used & casing for link quality modern extend. ([#7311](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7311)) ([28eba92](https://github.com/Koenkk/zigbee-herdsman-converters/commit/28eba92a7ddb232fe6c4653f0fae4b380261bf4c))
* Merge TuYa TS0601_dimmer to TS0601_dimmer_1 ([#7231](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7231)) ([23b5f08](https://github.com/Koenkk/zigbee-herdsman-converters/commit/23b5f085bfdce1b64188f8021a7b81f22c0b43ab))

## [19.11.2](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.11.1...v19.11.2) (2024-04-01)


### Bug Fixes

* Fix `XX has multiple 'ota'` when generating definition https://github.com/Koenkk/zigbee-herdsman-converters/pull/7287 ([daf21b5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/daf21b51ac618c11da8ee720e518e8883742dc1c))

## [19.11.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.11.0...v19.11.1) (2024-03-31)


### Bug Fixes

* **ignore:** fix `NAS-PS09B2` model ([bb360c8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bb360c82d82ff32f0f45cf2e61af7d1ac403eddb))
* **ignore:** update dependencies ([#7285](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7285)) ([4ac8bdd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4ac8bdd82b12e698c4ad69aed4e8af68d3020f62))
* **ignore:** update dependencies ([#7293](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7293)) ([896544c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/896544c72b3054ad347a030da6df58b25b5a95ca))

## [19.11.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.10.0...v19.11.0) (2024-03-31)


### Features

* **add:** 929003621301 ([#7287](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7287)) ([c5cb9d5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c5cb9d56721d6a38e3a72e79e8a0233f6a273a2c))
* Improve Aqara DJT12LM support ([#7201](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7201)) ([f04123f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f04123fcd830d9da9c1ec0354e68a68c4544f5ac))
* Improve support for Bosch 8750001213 Twinguard ([#7286](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7286)) ([0d559fb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0d559fb2c02e90e7647553fa1ef231a9842d0a38))
* Support `emergency_heating` mode for Zen-01-W https://github.com/Koenkk/zigbee2mqtt/issues/21960 ([81fb3e9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/81fb3e9f5a4142888fe7fa73a6e939d49385d3bc))


### Bug Fixes

* **detect:** Detect `_TZ3000_ouwfc1qj` as TuYa TS0003_1 https://github.com/Koenkk/zigbee2mqtt/issues/19876 ([2bb5f30](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2bb5f30a4068574c1030c55c29f88a4fe6a41ea3))
* **detect:** Detect `_TZE200_wehza30a` as Zemismart ZM25RX-08/30 ([#7283](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7283)) ([734a44d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/734a44d978b281d782be0f3162a878de17d4a571))
* Ignore GreenPower endpoint in definition generator ([#7291](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7291)) ([05911ba](https://github.com/Koenkk/zigbee-herdsman-converters/commit/05911bac62521fc31a0a7f560a6deac076894da6))

## [19.10.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.9.0...v19.10.0) (2024-03-29)


### Features

* **add:** EFEKTA_iAQ3 ([#7279](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7279)) ([a517008](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a5170089dde9e054683377c75fdbb9df1e693616))
* **add:** WS-K01D ([#7282](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7282)) ([e6f46bc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e6f46bc04163f691ea0227aeecea005acc9914ab))
* Improve Danfoss Icon2 support ([#7281](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7281)) ([690b8b7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/690b8b736d13db3325e3f072d57ab69d623426b2))


### Bug Fixes

* **detect:** Detect `d90d7c61c44d468a8e906ca0841e0a0c`as HEIMAN HS3CG ([#7278](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7278)) ([7eb5b1f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7eb5b1fbfe7db01e0ef535701f7680c178499a09))

## [19.9.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.8.0...v19.9.0) (2024-03-27)


### Features

* **add:** CTM_MBD_Dim ([#7266](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7266)) ([93e3813](https://github.com/Koenkk/zigbee-herdsman-converters/commit/93e38133c83277604d6d145048ccbd4edb991d53))
* **add:** LH03121 ([#7275](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7275)) ([a92b3f1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a92b3f13f2c04e676980f66ce01a7e8bcb331312))


### Bug Fixes

* **detect:** Detect `_TZE200_kb5noeto` as TuYa ZG-204ZM ([#7273](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7273)) ([3a8832a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3a8832a8a3586356e7ba76bcd92ce3177f6b934e))
* **detect:** Detect `_TZE200_lpwgshtl` as TuYa TS0601_thermostat https://github.com/Koenkk/zigbee2mqtt/issues/21961 ([a615c80](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a615c8077123197a6d30aac334160e5dd4cf1058))
* Inovelli: fix some non-working parameters ([#7272](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7272)) ([110103b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/110103b4d9aa552cb4dfe70f642bfee665fc62e2))

## [19.8.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.7.0...v19.8.0) (2024-03-26)


### Features

* **add:** ZG-204ZM ([#7262](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7262)) ([c97e3e5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c97e3e51d6801bd6bd265f617e14b1d944001dd4))


### Bug Fixes

* **detect:** Detect `_TZE200_eevqq1uv` as TuYa TS0601_cover_3 https://github.com/Koenkk/zigbee-herdsman-converters/issues/7264 ([40e9bdc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/40e9bdc0e0cf5a4e5c08b8325ec59b3ffd98b32d))
* Set MCLH-02 color temp range and convert LifeControl to modern extend  ([#7269](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7269)) ([d3b18c6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d3b18c6c1dd95db35abc01758dc5e720dfe25052))

## [19.7.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.6.0...v19.7.0) (2024-03-25)


### Features

* Add `zclcommand` converter ([#7251](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7251)) ([6559f89](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6559f89dea338742612ebfdebd93d5e415cbdfe6))
* **add:** 442296118491 ([#7263](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7263)) ([9e7f8ef](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9e7f8ef327f91f56a863ddcf63ae4b4445adc925))
* **add:** THPZ1 ([#7250](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7250)) ([e1f014f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e1f014fc35a7391621cbc075f28d39f116af5fd8))
* Modern extend improvements ([#7239](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7239)) ([8f80a50](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8f80a50b5d8376c9868cc92759e94774efd4bd5b))


### Bug Fixes

* Fix OWON PC321 current value ([#7261](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7261)) ([9c5e61f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9c5e61f329ac995584c50de8751e61da7f42449e))
* **ignore:** fix 44e290acb81bdf640a3c3aa6d6ec22eef3a35946 ([0fc1809](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0fc1809f8523c9ed6d4f10ab8543bcc424581110))
* **ignore:** Fix power source for SLZB-06M https://github.com/Koenkk/zigbee2mqtt/issues/21339 ([44e290a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/44e290acb81bdf640a3c3aa6d6ec22eef3a35946))
* **ignore:** Try to fix unrealistic pressure readings from WSDCGQ12LM. ([#7260](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7260)) ([2b1dd8a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2b1dd8a9bbef083a8998697079c41c2cdd1e7b31))

## [19.6.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.5.0...v19.6.0) (2024-03-24)


### Features

* **add:** LED2111G6 [@leoshusar](https://github.com/leoshusar) https://github.com/Koenkk/zigbee-herdsman-converters/issues/7258 ([09d4e69](https://github.com/Koenkk/zigbee-herdsman-converters/commit/09d4e69033e8e9daa2734ee554b36556a2f4a830))
* **add:** NAS-PS09B2 ([#7256](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7256)) ([31fa55f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/31fa55f8ab399813697dc754865aedc1cdc72c73))
* **add:** SLZB-06M https://github.com/Koenkk/zigbee2mqtt/issues/21339 ([15856c8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/15856c89be87525b4a778db25b746d2bd7e519a2))


### Bug Fixes

* Adding some parameters and fixing some ranges for Inovelli devices ([#7252](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7252)) ([b26ed0a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b26ed0a4670a6fa6da7dc3895f6ca1c7c340f567))
* **detect:** Detect `_TZ3000_kycczpw8` as TuYa WHD02 [@sprut2](https://github.com/sprut2) https://github.com/Koenkk/zigbee2mqtt/issues/21926 ([31d0880](https://github.com/Koenkk/zigbee-herdsman-converters/commit/31d088011a1728923a49f772f047bab17241ae08))
* Fix negative temperature value for TuYa TS0601_temperature_humidity_sensor_1 incorrect https://github.com/Koenkk/zigbee2mqtt/issues/21752 ([8dce09a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8dce09a4caa4258040384f68bbdcb77a22b0a55e))
* Fix unrealistic pressure readings from Lumi WSDCGQ12LM ([#7259](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7259)) ([bca06e3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bca06e31c184a2315cd19044bbae2eb9b7810ac6))
* Fixes for TuYa BAC-003 ([#7257](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7257)) ([9aa2008](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9aa2008651b97e653b7cd1daab9b54b847403738))
* **ignore:** update dependencies ([#7254](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7254)) ([14dffaa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/14dffaa06511876d096aa72e669df4b032f4cf33))
* Set color temperature range for BDHM8E27W70-I1 and expose battery voltages ([#7253](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7253)) ([dbda415](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dbda415f5cf420d631802a8ef46aaef597d29357))

## [19.5.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.4.2...v19.5.0) (2024-03-21)


### Features

* **add:** DIO-300Z ([#7246](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7246)) ([663e069](https://github.com/Koenkk/zigbee-herdsman-converters/commit/663e069d9d94762ab2c321eea7e46c8c642f6af2))
* **add:** L2206 ([#7248](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7248)) ([af204a4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/af204a49c87e0102a643f240d2e1512a50cb2fed))


### Bug Fixes

* **ignore:** Change description for Nimly ([#7247](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7247)) ([634046f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/634046f2652e1372c72ec9c0e9471f9404964e11))
* **ignore:** fix 6b3911a ([4d0dc21](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4d0dc21f642833cec196d4082bcb3b3f287a81ca))

## [19.4.2](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.4.1...v19.4.2) (2024-03-20)


### Bug Fixes

* Fix Inovelli  vzm35-sn and vzm36 not reporting fan speed correctly ([#7245](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7245)) ([9ae2bbf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9ae2bbfa7af67bc669d4211d803835df9940e170))
* Fix TuYa ERS-10TZBVK-AA action not working https://github.com/Koenkk/zigbee2mqtt/issues/21855 ([e9ab863](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e9ab863e5b317ded38a24e0f3256adada5fc9f31))
* **ignore:** Refactor `skipTimeResponse` to `customReadResponse` ([#7242](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7242)) ([6b3911a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6b3911a45601e5b01e916c74bcf51b9848d2e757))
* Update Third Reality 3RTHS0224Z description ([#7233](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7233)) ([34d4955](https://github.com/Koenkk/zigbee-herdsman-converters/commit/34d49555f9525f8786fd8ecf5a87a2c5f7da358a))

## [19.4.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.4.0...v19.4.1) (2024-03-19)


### Bug Fixes

* Fix pairing of Legrand devices failing ([#7228](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7228)) ([8c36b33](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8c36b3313bbc4a9e95bedd5a3a277ebb2d660d76))
* **ignore:** update dependencies ([#7240](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7240)) ([9c9ac0a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9c9ac0ad37a51f82d608bdfdce6a289c80830fc1))

## [19.4.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.3.0...v19.4.0) (2024-03-19)


### Features

* **add:** 99106 ([#7214](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7214)) ([ccdcfe5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ccdcfe56b92f6805035cdd8dcc051e09707a356f))
* **add:** CK-BL702-ROUTER-01(7018) https://github.com/Koenkk/zigbee2mqtt/issues/21858 ([e65baba](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e65baba8ce40850b88460823a9d4de69dab8f290))
* **add:** Nimly ([#7237](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7237)) ([6ba7b16](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6ba7b1665ddef62721460333046bba81b6011ca5))
* **add:** SWV ([#7132](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7132)) ([56815b5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/56815b5dfbab1dd43510a695dd6857455ebc6bec))


### Bug Fixes

* **detect:** Detect `_TZ3000_fdxihpp7` as TuYa WHD02 ([#7236](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7236)) ([2c3252e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2c3252ecae7198e0f7eea0144cc869978a3ccb78))
* **detect:** Detect `HK-SENSOR-4IN1-A` as Namron 4512770 ([#7235](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7235)) ([9fcc7c7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9fcc7c710ed46b3974b44e1a1e0962904649597d))
* **ignore:** fix 56815b5dfbab1dd43510a695dd6857455ebc6bec ([a149303](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a149303a04c728982855a88ddbf6517852d27f38))

## [19.3.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.2.1...v19.3.0) (2024-03-17)


### Features

* **add:** CK-BL702-AL-01(7009_Z102LG03-1) https://github.com/Koenkk/zigbee2mqtt/issues/20999 ([f898d92](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f898d924d4f033ba236e6781dba8bfdf135a1e3a))
* **add:** MEG5126-0300/MEG5172-0000 ([#7222](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7222)) ([65fd4eb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/65fd4ebc4654d52c7286dd8255b392567a61fc7d))


### Bug Fixes

* **detect:** Detect `_TZ3000_fdxihpp7` as TuYa WHD02 @HD78 https://github.com/Koenkk/zigbee2mqtt/issues/21711 ([9c6ebe7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9c6ebe74847ac72e0dec1646d5312a1c5e247124))
* **detect:** Detect `_TZE204_7ytb3h8u` as GiEX GX02 [@dgaust](https://github.com/dgaust) https://github.com/Koenkk/zigbee2mqtt/issues/21844 ([f3e846f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f3e846fbf7cf24c11e8e42e82dc04590576852c5))
* **detect:** Detect `_TZE204_xpq2rzhq` as TuYa TS0601_smart_human_presence_sensor_1 https://github.com/Koenkk/zigbee2mqtt/issues/21744 ([523c1e7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/523c1e7147a2178382c9cb883e047bffdd0c2a18))
* Fix iasZoneAlarm extend ([#7219](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7219)) ([4af499f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4af499fce7756f1514bf767461bf9d591a1ca7e3))
* **ignore:** fix lint ([6a49a17](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6a49a17af9177afc5e70356ecc6def9c818a9778))
* **ignore:** Reverse alarm state for contact zone ([#7227](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7227)) ([60c2a29](https://github.com/Koenkk/zigbee-herdsman-converters/commit/60c2a2959b9ac6567a901fbe32d27b660915d614))
* **ignore:** revert f898d924d4f033ba236e6781dba8bfdf135a1e3a ([ab4e718](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ab4e718c2dd1189365cbe07419ea2ee0020256ac))
* **ignore:** update dependencies ([#7226](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7226)) ([870fd17](https://github.com/Koenkk/zigbee-herdsman-converters/commit/870fd1742a482e7170115a4055d099290d2131c0))
* Increase TuYa `TS0601_thermostat_3` local temperature calibraion range https://github.com/Koenkk/zigbee2mqtt/issues/21828 ([3bcf47b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3bcf47bfcc056c594c34594c774927fbc9597f5f))
* Properly define generated device to be multiEndpoint ([#7204](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7204)) ([55bb36f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/55bb36f7ade4c247bc7e4e3d1399a9457c2d6598))
* Support `auto` `system_mode` for Bosch Radiator thermostat II ([#7049](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7049)) ([396ed1e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/396ed1e3b3d4331a6946b15a57a7d48ee85af493))
* Update manufacturer codes to use ZCL definition ([#7223](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7223)) ([ca21a1b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ca21a1b43acff2c7813be7ad2f328c2b4b7bfeaf))

## [19.2.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.2.0...v19.2.1) (2024-03-14)


### Bug Fixes

* **ignore:** fix a18cdee95434aa7b71294a34c34f3703cf18d33b ([3770d59](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3770d59b11ad9397a03fc9b9ca0e0003e55fff5a))

## [19.2.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.1.1...v19.2.0) (2024-03-14)


### Features

* **add:** 07767L ([#7211](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7211)) ([fb90742](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fb90742b8c59300ec1bd47eec7e4d441d2fd85da))
* **add:** HCXDD12LM, CL-L02D ([#7203](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7203)) ([a18cdee](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a18cdee95434aa7b71294a34c34f3703cf18d33b))


### Bug Fixes

* **detect:** Detect `_TZE200_lawxy9e2` as TuYa TS0601_fan_switch [@dotosouza](https://github.com/dotosouza) https://github.com/Koenkk/zigbee2mqtt/issues/21787 ([6eeeb73](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6eeeb73a02d213c1c249cc9929ab6a0b736e059f))
* Fixes for ptvo.switch ([#7215](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7215)) ([b92e6a5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b92e6a5f702381a398c2970627844f5b53d5eb88))
* **ignore:** Fix no action for TuYa TS004X devices https://github.com/Koenkk/zigbee2mqtt/issues/21784 ([9e4e1fd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9e4e1fd8b65a8acb5f5efc460f44414f5e83dc88))

## [19.1.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.1.0...v19.1.1) (2024-03-13)


### Bug Fixes

* **detect:** Detect `_TZ3000_aaifmpuq` as Nous B3Z ([#7209](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7209)) ([4e01a45](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4e01a454bf3a1e7942c226856a2c8ec0af9fcd3f))
* **detect:** Detect `_TZ3000_qlai3277` as Nous B2Z ([#7207](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7207)) ([3c91bee](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3c91beed8ff54a4a80e7e17f737aed2a5822b951))
* Fix crash when customTimeResponse fails [@srett](https://github.com/srett) https://github.com/Koenkk/zigbee2mqtt/issues/21775 ([10a834a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/10a834ae0c11e06ea0ca46b87943fe91dc3437dc))
* Fix for Legrand OTA updates (newer firmwares) ([#7212](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7212)) ([a1dc6db](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a1dc6db70b096ddcf6488904f288605296ff6ef5))

## [19.1.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v19.0.0...v19.1.0) (2024-03-12)


### Features

* **add:** SR-ZS ([#7195](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7195)) ([45a4a41](https://github.com/Koenkk/zigbee-herdsman-converters/commit/45a4a41ef4b90eabe4a35fe37f5df769a3c12edf))


### Bug Fixes

* Fix Develco FLSZB-110 temperature reporting ([#7202](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7202)) ([fc52b55](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fc52b5576c88e9517e2eb406eeee8bb20bbcf6e6))

## [19.0.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.49.0...v19.0.0) (2024-03-11)


### ⚠ BREAKING CHANGES

* Remove legacy extend support ([#7200](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7200))

### Features

* Remove legacy extend support ([#7200](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7200)) ([0558a15](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0558a1527d4e112747ce912ac68a054314e3fc06))


### Bug Fixes

* Refactor all switches to modernExtend ([#7198](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7198)) ([cb24821](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cb24821aebe8c2be5cef27bbd3a71f5937580b1f))

## [18.49.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.48.0...v18.49.0) (2024-03-11)


### Features

* **add:** LED2109G6 [@millionsofjeffries](https://github.com/millionsofjeffries) https://github.com/Koenkk/zigbee2mqtt/issues/21755 ([dbf268e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dbf268ead2d2397a1544aac3354e7d0a50b96f27))
* **add:** TS0601_gas_sensor_3 [@onmobs](https://github.com/onmobs) https://github.com/Koenkk/zigbee2mqtt/issues/21741 ([abd30a8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/abd30a89429a373fdfafc15e72a828d4c1503c86))
* Improve Aqara ZNCLDJ14LM support ([#7191](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7191)) ([c951b18](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c951b187489280d02f92f070b385efb00da3cac8))
* Support battery and OTA for IKEA E2202 ([#7196](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7196)) ([e2860b2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e2860b2ec6ab4ccabbb418565bfd0aa5a5bf385e))


### Bug Fixes

* Fix some Aqara modernExtend ([#7192](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7192)) ([d22efc7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d22efc74acb70a2e41adfa216469ceef147c1446))
* **ignore:** add back level config https://github.com/Koenkk/zigbee-herdsman-converters/pull/7168 ([63756b5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/63756b57cf711dd01304b582684ca57db80464c6))
* Refactor more devices to modernExtend ([#7194](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7194)) ([fe6f97e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fe6f97ec8da0a3e5048bddff155b283c96035819))

## [18.48.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.47.0...v18.48.0) (2024-03-10)


### Features

* **add:** 929002401101 ([#7189](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7189)) ([53b5512](https://github.com/Koenkk/zigbee-herdsman-converters/commit/53b55128acdd715fa5bf920a4c70fe8671e6813e))
* **add:** SPM02-U01 ([#7190](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7190)) ([04b5259](https://github.com/Koenkk/zigbee-herdsman-converters/commit/04b52591207643d87aeaad5db6380def14a5874b))
* **add:** ZP1-EN, ZR1-EN ([#7187](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7187)) ([939a3ea](https://github.com/Koenkk/zigbee-herdsman-converters/commit/939a3ea1ce839a5b43b177941ac976f269e4b173))


### Bug Fixes

* Don't allow sceneID 0 ([#7185](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7185)) ([5ad3798](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5ad37981bed2997044ffd8d20adb2b1f90b9eadf))
* Fix 8719514440937/8719514440999 description ([#7183](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7183)) ([3edfa24](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3edfa24bd7583557f7adc9b4569f5fb041fe979a))
* **ignore:** update dependencies ([#7188](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7188)) ([4c6d8ba](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4c6d8ba76b8a77d9b1003622d80988f7125a2f79))
* **ignore:** Update manufacturer codes ([#7186](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7186)) ([c337428](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c3374288dfd5f2058c1f9f45d35c5bc2ac854d50))

## [18.47.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.46.0...v18.47.0) (2024-03-08)


### Features

* Add additional exposes for 8719514440937/8719514440999 ([#7177](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7177)) ([cb5f0d4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cb5f0d4a323dfb49737fb7e1cab1e06d4e6cb84a))
* **add:** E2202 ([#7163](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7163)) ([f370b34](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f370b346d9d33c87018e326ada31d24cfead4240))
* Added OTA support for various Schneider Electric devices ([#7178](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7178)) ([1499b09](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1499b098bf8f124894d20535ab97dc9171f021de))
* **add:** ZNQBKG42LM, ZNQBKG43LM, ZNQBKG44LM, ZNQBKG45LM ([#7160](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7160)) ([c1c6095](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c1c609520c4e5bc0bd396bc2a958a75250623f5c))


### Bug Fixes

* **detect:** Detect `_TZ3000_b3mgfu0d` as TuYa TS004F ([#7175](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7175)) ([07fe9d6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/07fe9d61d64cdd93b015bed38cbf1f108073d7af))
* Fix alarm for HESZB-120 ([#7179](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7179)) ([0d46740](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0d4674053d3d579998b6861bdfe6a4206c975d83))
* Fix battery modernExtend ([#7180](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7180)) ([332da4b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/332da4b263d2d531d87831c8b62dcf4cf4a37506))

## [18.46.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.45.0...v18.46.0) (2024-03-07)


### Features

* **add:** Icon2 ([#7166](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7166)) ([fb64f43](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fb64f435d8868cc978967ebfb00b27ee556d72b2))
* **add:** OSL 132 C ([#7171](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7171)) ([80fec9e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/80fec9e724e96ef3bb46189d821f4270e46b6464))
* BAC-002-ALZB & BAC-003 fan control units support ([#7173](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7173)) ([3d1c5d7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3d1c5d78648357360fe7613d7623a8177c045627))
* **ignore:** Refactor more to modernExtend ([#7168](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7168)) ([ed7ed68](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ed7ed68b9d08a50ce0507183b7daa27b031cc07b))

## [18.45.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.44.0...v18.45.0) (2024-03-06)


### Features

* New modern extends and GS device converters update ([#7134](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7134)) ([519130e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/519130efb93cef0707ff53a78b5c01ede000c57f))


### Bug Fixes

* **detect:** Detect `_TZ3000_uaa99arv` as TuYa TS0044_1 https://github.com/Koenkk/zigbee2mqtt/issues/21458 ([685c361](https://github.com/Koenkk/zigbee-herdsman-converters/commit/685c361f3545c21c1f34855f3972ae6bfdcc2b54))
* Inovelli bug fixes ([#7164](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7164)) ([4a18e29](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4a18e2966318e3153cff32198c71dc554528d72a))
* Use writeStructure for Ubisys input configuration ([#7155](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7155)) ([def8f5c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/def8f5cafd4ea3a88737e9957c7dfa8212a94871))

## [18.44.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.43.0...v18.44.0) (2024-03-05)


### Features

* Add status LED switch for WB-MSW-ZIGBEE v.4 and refactor to modern extend ([#7074](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7074)) ([5bdb3e2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5bdb3e266b0e3a242c7c745a66ee9b0de49a6ce7))
* **add:** EA4161C-BI ([#7158](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7158)) ([d768c10](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d768c10ac1c9b680b3470fbbc4677aec1ea97737))
* **add:** TRZB3 ([#7157](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7157)) ([55a7640](https://github.com/Koenkk/zigbee-herdsman-converters/commit/55a76407eac371c1e9c101017057d1bed4ecf5d4))
* Support `indicator_mode` for Schneider Electric EKO09716 ([#7162](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7162)) ([fcbee33](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fcbee3340f0e01a44c9f4e27417b08e61e4a94f4))


### Bug Fixes

* Fix power source for Aqara WS-USC01 ([#7159](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7159)) ([c9ccc92](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c9ccc9215c12f98018df1f99e37c398dc7a9795d))
* **ignore:** update dependencies ([#7151](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7151)) ([2748f64](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2748f64c59d7d27f12c7f9abd064add387e765f0))

## [18.43.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.42.0...v18.43.0) (2024-03-04)


### Features

* Add impulse mode configuration on SIN-4-1-2X devices from NodOn ([#7142](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7142)) ([d892a53](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d892a536b7772a0818eac2fe738fd15edc7c22b2))
* **add:** 929003531502 [@galligan](https://github.com/galligan) https://github.com/Koenkk/zigbee2mqtt/issues/21645 ([ba7d5a7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ba7d5a7f91db218b5a9ee782d2dbb6d3af7952a0))
* **add:** ZB-3008 ([#7145](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7145)) ([ab72097](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ab720971f1bbfa2eb806459bf3f70a788ab9f2d5))


### Bug Fixes

* Add Aqara WB-R02D and DW-S03D whitelabels ([#7156](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7156)) ([c0be3df](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c0be3dffbf9344dc6085fafcf2cc614fc4aee24f))
* Fix `led_indicator` reversed for Aqara ZNCWWSQ01LM https://github.com/Koenkk/zigbee2mqtt/issues/17148 ([3a5c6ae](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3a5c6ae2572bb9e6ad070f6fae99799bf9f6b739))
* Fix `Value '4' is not allowed` for TuYa YXZBRB58 https://github.com/Koenkk/zigbee2mqtt/issues/21648 ([33e902e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/33e902e9f9902d543a40171823903a8e845343c5))
* Fix incorrect `long` `click` send for WXKG01LM https://github.com/Koenkk/zigbee2mqtt/issues/21661 ([baac6a0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/baac6a00ed4d846323a5b68ffa61ba851b75b035))
* Fix LEDVANCE ota failing https://github.com/Koenkk/zigbee2mqtt/issues/16900 ([7561baa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7561baa779d9ca858058795786a1cc7bfd183366))
* Fix no `energy` for Aqara QBKG24LM https://github.com/Koenkk/zigbee2mqtt/issues/20692 ([b002c99](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b002c994e0633fcb201c44e579bf121a61a5dd31))
* Fix occupancy extend undefined args ([#7143](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7143)) ([69f5bdd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/69f5bdd4142a31c9ace37acd0bffe737fac24449))
* Fix the broken LED indicator for Schneider Electric wiser devices ([#7152](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7152)) ([ea055df](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ea055dfdbe66de0b5c5b0803af479804cea5a176))
* Make Philips 324131092621 configure more reliable ([#7149](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7149)) ([5e987c4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5e987c495aa76486c99eda85953ffbc06fa07c2c))
* Reference new named cluster and attribute for Schneider Electric switchActions ([#7144](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7144)) ([05770b3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/05770b3a58f09b29afffe46e558a52ecbe11b747))
* Remove unsupported electricity measurements from Samotech SM323_v1 https://github.com/Koenkk/zigbee2mqtt/issues/21449 ([c09d44f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c09d44feedbe45ee46b16442a31dd5d807d8aec5))

## [18.42.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.41.0...v18.42.0) (2024-03-01)


### Features

* Support fanTimerMode for Inovelli VZM35-SN ([#7023](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7023)) ([0d71ea4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0d71ea4fb315befd233f968f9c676fe980b4194b))


### Bug Fixes

* **ignore:** update dependencies ([#7141](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7141)) ([9b8536a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9b8536a72c47fa6807e7509421ba41644bc2d4fd))
* Reference attributes directly from cluster for various Schneider Electric specific attributes ([#7139](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7139)) ([0ed1497](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0ed14973316f468f6cf4bbb96b63e5ab02057a23))

## [18.41.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.40.0...v18.41.0) (2024-02-29)


### Features

* Add `short_press_2_of_2` action to EnOcean PTM 216Z ([#7127](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7127)) ([bc0506c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bc0506cd8e40d7c4ec5b108cc2c652c7b184dead))
* Enable LED indicator functionality for 41E10PBSWMZ-VW ([#7131](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7131)) ([d2efa24](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d2efa2421ab40e2b55aa9c4a8d0c5152dd9cb163))
* Support `switch_type` for TuYa TS0601_dimmer_5 @RafaelDuncan https://github.com/Koenkk/zigbee-herdsman-converters/pull/7072 ([81f256e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/81f256ef139a2f95833cb1a05189fe8c21f0b370))


### Bug Fixes

* **detect:** Detect `_TZ3000_4ugnzsli` as Luminea ZX-5232 ([#7136](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7136)) ([83a4847](https://github.com/Koenkk/zigbee-herdsman-converters/commit/83a484763974a228b454308c753cd4ba936b6b4f))
* **detect:** Detect `_TZE204_aagrxlbd` as TuYa TS0601_switch_4_gang_1 https://github.com/Koenkk/zigbee-herdsman-converters/issues/7133 ([e2445f9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e2445f9401d39572ac5a157ce30a0e4f0fb9ac20))
* Fix battery percentage doubled for ROBB ROB_200-025-0 https://github.com/Koenkk/zigbee2mqtt/issues/21607 ([4f6fadf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4f6fadfdb3478be3d7c11c091d4ce58aaadccc09))
* Fixes issue of passing function to TuYa lookup value converter ([#7135](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7135)) ([03c02d8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/03c02d8c28771eb8143024dfa653e72bd910aa9f))
* **ignore:** Use the correct cluster name ([#7138](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7138)) ([dd0c3d6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dd0c3d6b817d69b0ef4421f415622965a4bb72da))

## [18.40.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.39.1...v18.40.0) (2024-02-27)


### Features

* **add:** TS0001_switch_module, TS0002_switch_module_1 ([#7126](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7126)) ([c469be8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c469be8e7dca241f8491c81b3e621ea7fd3c90f2))


### Bug Fixes

* **detect:** Detect `_TZ3000_kvwrdf47` as TuYa TS0052_2 [@raarts](https://github.com/raarts)  https://github.com/Koenkk/zigbee2mqtt/issues/18535 ([cdb27a0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cdb27a0248a14f82c50cff9311a65d87cecde083))
* Fix `Attempt to access memory outside buffer bounds` error after pairing of Aqara SRTS-A01 https://github.com/Koenkk/zigbee-herdsman-converters/issues/7128 ([2d3e581](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2d3e58180679426fa21031809eca73741acc575a))
* Fix `identify` failing for Legrand devices https://github.com/Koenkk/zigbee2mqtt/issues/21589 ([40cdb8b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/40cdb8bfb15773dd9de617a93ccf8ca6f635d46b))
* Fix `power_on_behavior` for TuYa TS011F_2_gang_wall https://github.com/Koenkk/zigbee2mqtt/issues/20032 ([0495bce](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0495bce4d671fd61fbe1b0cfb62a496b9af90c9e))
* Fix Aqara KQJCMB11LM value https://github.com/Koenkk/zigbee2mqtt/issues/21475 ([6e6c89e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6e6c89e4ef6114ac719c8889920f912d8d4e1ee2))

## [18.39.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.39.0...v18.39.1) (2024-02-26)


### Bug Fixes

* **ignore:** fix 1ec99a5e8305c37479913a7a1b69a0c9a48b38eb ([afc29c1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/afc29c186a34e64ec5d01611f79b571a74195a1c))

## [18.39.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.38.0...v18.39.0) (2024-02-26)


### Features

* **add:** ZNDDQDQ12LM https://github.com/Koenkk/zigbee2mqtt/issues/19833 ([6febddf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6febddfde00fdbf86bb2e623ef3fcbcabc103d9e))


### Bug Fixes

* Correction to the model name for Moes bulbs ([#7123](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7123)) ([25fb16c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/25fb16c2442eeaeb72d7d62f3062c74268e931e4))
* Fix Orvibo ST30 configure failing https://github.com/Koenkk/zigbee2mqtt/issues/21570 ([c871d0b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c871d0b96b78baedf1898018969a0698131e9670))
* Fix Owon PC321 current value ([#7121](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7121)) ([2a3f27d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2a3f27da4e99e0259a3132bc103e5eec3368f436))
* Removed links from description fields ([#7122](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7122)) ([9d1c46d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9d1c46df0e47be3b07033933bbd96ba2d394b0e9))
* Update QBKG18LM converter and refactor all Aqara T1 wall switches to modern extend ([#7120](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7120)) ([1ec99a5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1ec99a5e8305c37479913a7a1b69a0c9a48b38eb))

## [18.38.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.37.1...v18.38.0) (2024-02-25)


### Features

* Add color support to Acuity Brands Lighting RB56SC and RB56AC ([#7113](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7113)) ([0528bac](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0528bacf8c090e50b2b32f644503261165584d22))
* **add:** WDE002497 ([#7119](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7119)) ([e5cce33](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e5cce330b52503fe86efca163c37137cd90bd840))
* Expose Breeze Mode to Inovelli VZM35 ([#7115](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7115)) ([ff1beb0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ff1beb05b6a85b293cf4e4a77388c3c1fc23a114))
* Support `motor_speed` for Aqara ZNJLBL01LM ([#7109](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7109)) ([925c23e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/925c23e063e6f48934ee65d36875bc289916f912))


### Bug Fixes

* **ignore:** more fixes for 03364563b3630fe6e43076aac12f4abd445852a3 https://github.com/Koenkk/zigbee2mqtt/issues/21442 ([e379960](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e379960853d55dd7eb4a6aa15fd60f3029be17ab))
* **ignore:** update dependencies ([#7112](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7112)) ([13eb265](https://github.com/Koenkk/zigbee-herdsman-converters/commit/13eb265238de5777f16216719c0325627cc79ce5))
* Improve `trigger_count` for MCCGQ11LM and SJCGQ11LM ([#7111](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7111)) ([f1c80bb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f1c80bb474c74477f140f9e5caa7dea91d9eaddb))
* Lumi: add `quirkCheckinInterval(1_HOUR)` to battery devices to fix configure failing ([#7117](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7117)) ([627affe](https://github.com/Koenkk/zigbee-herdsman-converters/commit/627affe49c439fee1fa0e69128d842e2d822d710))

## [18.37.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.37.0...v18.37.1) (2024-02-24)


### Bug Fixes

* Add missing color for EGLO 99099 https://github.com/Koenkk/zigbee2mqtt/issues/21442 ([0336456](https://github.com/Koenkk/zigbee-herdsman-converters/commit/03364563b3630fe6e43076aac12f4abd445852a3))
* **detect:** Detect `_TZE200_cduqh1l0` as TuYa TS0601_switch_6_gang https://github.com/Koenkk/zigbee2mqtt/issues/21225 ([cb4d26d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cb4d26d9a6fbc6816ecf95e547c1567d66448c27))
* Fix Orvibo ST30 configure failing https://github.com/Koenkk/zigbee2mqtt/issues/21541 ([967a9d9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/967a9d9b0d0b491c71717eb16485778c3ea3badb))
* Use deviceEndpoints extend instead of endpoint definitions ([#7107](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7107)) ([1d33581](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1d33581432fcce6a8bc69c05c792394c423f2c99))

## [18.37.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.36.0...v18.37.0) (2024-02-22)


### Features

* **add:** 3RTHS0224Z ([#7105](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7105)) ([a9d639d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a9d639dbeb51a553b5a9d676c8c23764e8c6c580))
* **add:** 500.46 ([#7106](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7106)) ([762f865](https://github.com/Koenkk/zigbee-herdsman-converters/commit/762f86548ed2440433bb2952126f8a0470696adb))
* Enable OTA for Frient HESZB-120 ([93a6eef](https://github.com/Koenkk/zigbee-herdsman-converters/commit/93a6eef4212e55511ed01f243fac020d9ac50de6))
* Modern extend enhancements ([#7083](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7083)) ([80ec3f5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/80ec3f59d87b21d8f1cfe73aee15ecfd82ad64bb))


### Bug Fixes

* **detect:** Detect `_TZ3000_wkai4ga5` as TuYa TS0044_1 https://github.com/Koenkk/zigbee2mqtt/issues/21458 ([5cbfd86](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5cbfd86043e74552d83db20bc0408b4a30df750f))
* Expose `battery` for TuYa LKWSZ211 @KipK https://github.com/Koenkk/zigbee2mqtt/discussions/19765 ([c7a889b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c7a889b232def8fe2275fb6838b179de9ba7134a))
* Fix `action` values of Vesternet VES-ZB-REM-013 ([#7027](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7027)) ([a0d4a9e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a0d4a9e3201f209310a4cf36b7ac59bd072b91ed))
* Fix system mode for Acova PERCALE 2 and TAFFETAS 2 ([#7104](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7104)) ([6b355d6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6b355d6477fe5d8c93beefdd25b956f354b8647c))
* Fix various Linptech ES1ZZ(TY) exposes ([#7099](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7099)) ([6140c2d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6140c2d7ede9bed14b531cfd2c36c6d75e9fafe1))
* **ignore:** Added battery_low() to TS0205 Smoke Sensor ([#7101](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7101)) ([482e249](https://github.com/Koenkk/zigbee-herdsman-converters/commit/482e249a528b361e20a070b910a892df2b399175))
* **ignore:** fix a9d639d ([f865e1a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f865e1af39788fbe8384cf678505e46d970fc081))
* Remove unsupported effect and power on behaviour for Samotech SM325-ZG ([#7098](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7098)) ([9658b12](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9658b12fb629735dd2b57647d443be1b6b8b67c5))

## [18.36.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.35.0...v18.36.0) (2024-02-20)


### Features

* **add:** SM323_v1 https://github.com/Koenkk/zigbee2mqtt/issues/21449 ([22848ad](https://github.com/Koenkk/zigbee-herdsman-converters/commit/22848ad1af86cf7e4cebe5d7f2c95e588e0e8248))
* **add:** STPH-4-1-20 ([#7073](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7073)) ([3260f02](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3260f02ee37936799b367298f527d268bc395f7f))
* **add:** TS0601_smoke_6 ([#7084](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7084)) ([378a4e8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/378a4e8ce0878c7198e05e7c55776ee11afba02d))
* **add:** ZigUSB ([#7077](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7077)) ([9f76149](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9f761492fcfeffc4ef2f88f4e96ea3b6afa8ac0b))


### Bug Fixes

* Add missing `action_group` to various EGLO 99099 events https://github.com/Koenkk/zigbee2mqtt/issues/21442 ([401f7cc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/401f7cc3a0a1a47954ab7beb88092dfe877bd0f3))
* **detect:** Detect `_TZ3000_fbjdkph9` as Mercator Ikuü SSW02 [@tortfeaser](https://github.com/tortfeaser) https://github.com/Koenkk/zigbee2mqtt.io/pull/2531 ([ed86c7f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ed86c7fcb879e5427ced1c462dc860b3c8d72dd8))
* **detect:** Detect `50067` as Paulmann 500.67 https://github.com/Koenkk/zigbee-herdsman-converters/issues/7091 ([a570fcc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a570fccd89bee9a4b49bdea5134cfe37b8180079))
* Fix `Failed to find endpoint which support OTA cluster` for various TuYa TS011F_plug_3 https://github.com/Koenkk/zigbee2mqtt/issues/20955 ([b94c652](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b94c65229dd24d431b1c5b316d05569780f2c69a))
* Fix switch missing for CH2AX/SWITCH/1 and CH10AX/SWITCH/1 ([#7094](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7094)) ([3b10a7c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3b10a7c087e3084c0585bcc3ccbe7dabd8c98114))

## [18.35.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.34.0...v18.35.0) (2024-02-19)


### Features

* **add:** SM325-ZG ([#7088](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7088)) ([b983a11](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b983a11799833a7c94ead0bbe867ec1548392279))


### Bug Fixes

* **detect:** Detect `_TZ3000_bsvqrxru` as TuYa TS0202_1 https://github.com/Koenkk/zigbee2mqtt/issues/21408 ([05973ad](https://github.com/Koenkk/zigbee-herdsman-converters/commit/05973aded56e4c5872a96845df402e1b3e6fa64a))
* **detect:** Detect `GWA1511_MotionSensor` as Develco MOSZB-140 https://github.com/Koenkk/zigbee2mqtt/issues/21014 ([bc0db42](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bc0db421367c5c15d8177d8abc7c3055d025a75a))
* **detect:** Detect `lumi.light.acn024` as Aqara SSWQD03LM ([#7090](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7090)) ([59f05d3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/59f05d316acb4dd6b28b17a0a9780c2e4b6edb73))

## [18.34.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.33.2...v18.34.0) (2024-02-18)


### Features

* Add `trigger_count` for Aqara MCCGQ11LM and SJCGQ11LM ([#7086](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7086)) ([d28a885](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d28a8857b301b5aa139f987a8863fd3f822b520b))
* **add:** C205 [@chrisandsally](https://github.com/chrisandsally) https://github.com/Koenkk/zigbee2mqtt/issues/21435 ([72c45d9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/72c45d9ce26fafd4f6df5ca99e8c6fac17df097d))
* **add:** TS0052_2 [@eduardorgos](https://github.com/eduardorgos) https://github.com/Koenkk/zigbee2mqtt/issues/18535 ([648b5db](https://github.com/Koenkk/zigbee-herdsman-converters/commit/648b5db2f068c0e6ce50d819e10599359c9b91d7))


### Bug Fixes

* Add OTA for TuYa TS011F_2_gang_wall https://github.com/Koenkk/zigbee2mqtt/issues/20032 ([b76606b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b76606baffb9ed586a5cec293c2e23414dba0488))
* BMCT-SLZ: Expose switch type in shutter mode and fix UNSUPPORTED_ATTRIBUTE error ([#7087](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7087)) ([ae53b0b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ae53b0b9705546971466bf52d3d2996db2aaa7bb))
* **detect:** Detect `_TZ3000_upgcbody` as TuYa `TS0207_water_leak_detector` https://github.com/Koenkk/zigbee2mqtt/issues/21247 ([253ec2b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/253ec2b58ffe4c8cd06be9c8f3e7156f07c461bb))
* **detect:** Detect `_TZE200_bxdyeaa9` as Woox R7049 https://github.com/Koenkk/zigbee2mqtt/issues/19506 ([8fce3e8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8fce3e89c05316110b0598f75d767a3b45a82035))
* **detect:** Detect `_TZE200_mp902om5` as TuYa MTG075-ZB-RL [@jeffgoh](https://github.com/jeffgoh) https://github.com/Koenkk/zigbee2mqtt/issues/21445 ([4bb2088](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4bb2088560dc8309fbfcf5cbfe6daf9c9d5efdd4))
* **detect:** Detect `_TZE200_znlqjmih` as TuYa TS0601_thermostat https://github.com/Koenkk/zigbee2mqtt/issues/21440 ([4bf282d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4bf282d8436ba373fec1997273e88c16784c871b))
* **detect:** Detect `929003056201_01` and `929003056201_02` as Philips 3417931P6 @AlexL00 https://github.com/Koenkk/zigbee2mqtt/issues/21418 ([29a6c90](https://github.com/Koenkk/zigbee-herdsman-converters/commit/29a6c90b1aaea031752ab54503334c9ab2e5e2cf))
* **detect:** Detect `GWA1511_MotionSensor` as Develco MOSZB-141 https://github.com/Koenkk/zigbee2mqtt/issues/21014 ([ddf7e4f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ddf7e4f8ba3468b6778ed2d1900f6fc707c33628))
* **detect:** Detect `GWA1513_WindowSensor` as Develco WISZB-138 https://github.com/Koenkk/zigbee2mqtt/issues/21016 ([a47208f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a47208fcfa1c9be4f00cbb19f985d2b596ade4c8))
* **ignore:** fix 648b5db2f068c0e6ce50d819e10599359c9b91d7 ([431a7a2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/431a7a2f2d7fc3289124e5295907a777e5bcc4ed))
* **ignore:** update dependencies ([#7085](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7085)) ([fc0ca99](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fc0ca99891ad39a9e7976c8f5e8430209788dee0))
* Remove unsupported `tamper` from various TuYa TS0207_water_leak_detector ([#7079](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7079)) ([e8a96a5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e8a96a5520770acceb0fae1bc5b9d0bcc0303aa4))

## [18.33.2](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.33.1...v18.33.2) (2024-02-15)


### Bug Fixes

* **detect:** Detect `_TZE204_5cuocqty` as TuYa TS0601_dimmer_5 ([#7072](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7072)) ([299b7c3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/299b7c3c1a10364ac02708fc9070fee41af704f0))
* Enable configure reporting for SBM300ZX ([#7069](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7069)) ([4b2826a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4b2826acc38d540a9540cfc6516b5f764ae653ae))
* **ignore:** fix d8f8bb3 https://github.com/Koenkk/zigbee2mqtt/issues/20032 ([afbaf66](https://github.com/Koenkk/zigbee-herdsman-converters/commit/afbaf6661360dadca4214b994ec93d963de8c63d))

## [18.33.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.33.0...v18.33.1) (2024-02-14)


### Bug Fixes

* **detect:** Detect `_TZ3000_rgpqqmbj`, `_TZ3000_8nyaanzb`, `_TZ3000_iy2c3n6p` as Rylike RY-WS02Z https://github.com/Koenkk/zigbee2mqtt/issues/20032 ([d8f8bb3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d8f8bb3084f19ef21207d3677bf3f0da5286f4f9))
* **detect:** Detect `_TZB210_zmppwawa` as MiBoxer FUTC11ZR https://github.com/Koenkk/zigbee2mqtt/issues/21382 ([e743bcc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e743bccd478bc9faf6f2d484f159c4a9b8909ca1))
* Fix `Cannot read properties of undefined (reading '1')` error for various Develco plugs https://github.com/Koenkk/zigbee2mqtt/issues/21317 ([f8aa2b7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f8aa2b75d6add076934750affb34ce93a42aa02c))

## [18.33.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.32.0...v18.33.0) (2024-02-13)


### Features

* Add new identify expose ([#7060](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7060)) ([0eb5cdd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0eb5cdd89fc310ac9099c6ce6b58d1026cc7eaff))
* **add:** VZM36 ([#7063](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7063)) ([43104e8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/43104e8b02c6f303f4a9a3af2ae880ff79c78511))


### Bug Fixes

* **detect:** Detect `LWB019` as Philips 9290011370 ([#7064](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7064)) ([444826b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/444826b004985522633b8489ca53ac109965f5e6))
* Fix preset for TuYa ZWT198/ZWT100-BH (`_TZE204_lzriup1j`) https://github.com/Koenkk/zigbee2mqtt/issues/21353 ([950761e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/950761e93419ce8d81d60416015303dd5d69183b))
* Fix Schneider Electric MEG5126-0300/MEG5171-0000 endpoints ([#7062](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7062)) ([a1329fa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a1329fa4ffebafcc2463f95a9c177da4d1d3b10b))
* Rename MOES to Moes to unify vendor ([#7066](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7066)) ([ad565c1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ad565c1aac19d37054ff1be3c1c9c32d2732da48))
* Update various min/step values for Moes BRT-100-TRV ([#7065](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7065)) ([142e667](https://github.com/Koenkk/zigbee-herdsman-converters/commit/142e66776a7423aad8167421e5d1563374c324cf))

## [18.32.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.31.0...v18.32.0) (2024-02-12)


### Features

* **add:** MEG5126-0300/MEG5171-0000 ([#7050](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7050)) ([8231fad](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8231fad9c0c5f58560683bd18c0ff60fc390f8b6))
* **add:** QBKG33LM, QBKG17LM, QBKG27LM ([#7059](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7059)) ([4bcd149](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4bcd149a98ff2279735c2ebc0b6463989265b5e9))


### Bug Fixes

* Fix Aqara JTQJ-BF-01LM/BW device type and power source ([#7037](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7037)) ([96e6e92](https://github.com/Koenkk/zigbee-herdsman-converters/commit/96e6e92e142cf8efefbfab808b165f26df04017e))
* Fix state not updating for MakeGood MG-AUZG01 https://github.com/Koenkk/zigbee2mqtt/issues/20032 ([07cec96](https://github.com/Koenkk/zigbee-herdsman-converters/commit/07cec96be27cbb945f943485bd236e8449437fd8))

## [18.31.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.30.0...v18.31.0) (2024-02-11)


### Features

* **add:** ROB_200-003-1 ([#7053](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7053)) ([47eb672](https://github.com/Koenkk/zigbee-herdsman-converters/commit/47eb672fd1654522e18f07449c1ee03268096c44))
* support _TZE204_ztqnh5cg ([#7056](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7056)) ([b7711cc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b7711ccf1bbd6a384522960bacce33bdf88113a6))


### Bug Fixes

* Change `window_open` to `window_detection` for Bosch thermostats ([#7047](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7047)) ([a9fb46c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a9fb46c9e800a74864218202ee0bc87bea32d19a))
* **detect:** Detect `_TZ3000_eo3dttwe` as TuYa TS0215A_remote ([#7048](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7048)) ([aeea2fc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aeea2fc1b056c61c22e0bcd876e383825c883ccb))
* **detect:** Detect `_TZE204_q76rtoa9` as Neo q76rtoa9 ([#7051](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7051)) ([36a31e8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/36a31e8bab8ce6b9cba29698f1ae1df4a5a734b8))
* **detect:** Detect `755WSA as Schneider Electric W599001 ([#7055](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7055)) ([f1688c9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f1688c97984d4690794220a3e603cc49721e5c35))
* Fix move and presense sensitivity for TuYa ZY-M100-24G https://github.com/Koenkk/zigbee2mqtt/issues/21282 ([af40f72](https://github.com/Koenkk/zigbee-herdsman-converters/commit/af40f72a94a471a68e36fbfffdbdab88a297e9e1))
* Fixes for YSRAI YSR-MINI-01_wwcw ([#7054](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7054)) ([a4e4c6c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a4e4c6cf5e22c190a0ee9f10ae3693d6620057fa))
* **ignore:** update dependencies ([#7028](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7028)) ([816b3b5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/816b3b51abf1e89b331b6f8e930ffdb5705bf9fc))
* Refactor Lumi specific converters ([#6982](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6982)) ([f666002](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f6660029beab9d7062482aa856c39c20ae55e01a))
* Update WETEN PCI E `buzzer_feedback` description ([#7058](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7058)) ([7c22972](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7c229729b372755c28755b633d5a965a1364f8b3))

## [18.30.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.29.1...v18.30.0) (2024-02-08)


### Features

* Support more features for Aqara ZNQBKG26LM and ZNQBKG26LM ([#7044](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7044)) ([22772e4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/22772e4f2be6c71e4f032ac8537be6f051430c6a))


### Bug Fixes

* **detect:** Detect `_TZ3210_vfwhhldz` as TuYa TS110E_2gang_2 ([#7036](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7036)) ([b9bafcc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b9bafcc84d4c2bdd0d631473a5a13242fcaf0676))
* **detect:** Detect `_TZE200_qrztc3ev` as Nous SZ-T04 @Matriciel https://github.com/Koenkk/zigbee2mqtt/discussions/21314 ([7b42a1e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7b42a1ef18771b9e22bdc1c971460c978a5ff31a))
* **detect:** Detect `_TZE200_utkemkbs` and `_TZE204_utkemkbs` as TuYa SZTH02 ([#7040](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7040)) ([35ff688](https://github.com/Koenkk/zigbee-herdsman-converters/commit/35ff68829c3e356e85d3addb189f1a73a436ad4e))
* Fix Aqara Z1 triple and quadruple switch middle button not working ([#7039](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7039)) ([c921d2a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c921d2a8239c0c9b6b710e2812b8a0993a5251c7))
* Fix negative power values for Develco EMIZB-132 ([#7038](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7038)) ([fcd0fd1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fcd0fd1086d9eb42b45d6adeac5614a9e8a533bb))
* Fix no battery % reported for TuYa TS0205 ([#6724](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6724)) ([375f2fd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/375f2fd7aa322aac2da1b6b1b236ccd3f2bb32a0))
* Fix ZNCZ12LM and WXKG14LM description ([#7041](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7041)) ([41c2143](https://github.com/Koenkk/zigbee-herdsman-converters/commit/41c2143627699db8cf35e1524ee120c7c7f1f825))
* LiXee: slip relais and status register sub-values into their own JSON structure ([#7042](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7042)) ([8cdc101](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8cdc10105cd8ece8c9115f362eb39782a14aee9b))

## [18.29.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.29.0...v18.29.1) (2024-02-07)


### Bug Fixes

* **ignore:** fix 15c887eebe5b00e0e1591731b6bfa0dff158be9b ([9284c7a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9284c7a9484705fb25a7a87ae97c1be0543fec1b))

## [18.29.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.28.3...v18.29.0) (2024-02-07)


### Features

* **add:** E2204 https://github.com/Koenkk/zigbee2mqtt/issues/21115 ([a1d789d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a1d789d0f3d9762f62827cdc8265f4f33e690c2b))
* **add:** LCM-1C09-ZB ([#7032](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7032)) ([a41d6f8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a41d6f868b8fe269346be41a299ceeadd6bfa15b))
* **add:** PC311-Z-TY https://github.com/Koenkk/zigbee2mqtt/issues/20095 ([6cc1bd4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6cc1bd439d90bd94d2f8a38d2d93fe9a590083b6))


### Bug Fixes

* **detect:** Detect `TRADFRI bulb GU10 WW 380lm` as IKEA LED2104R3 ([#7031](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7031)) ([9d5a9c4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9d5a9c414511e893a47e3533f984387d0afcb523))
* Fix `1_single` instead of `single` action for TuYa TS0041A and TS0041 https://github.com/Koenkk/zigbee2mqtt/issues/21158 ([15c887e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/15c887eebe5b00e0e1591731b6bfa0dff158be9b))
* Fix spelling error in ZY-M100-24G presence description ([#7030](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7030)) ([cb17428](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cb1742820e1e6154be5b38b66a2da4f222fbbb0b))
* Fixes for Bosch BTH-RM ([#7029](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7029)) ([848148f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/848148fbb890748e0a0470b7134d164afd5ac047))

## [18.28.3](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.28.2...v18.28.3) (2024-02-06)


### Bug Fixes

* Aqara ZNQBKG38LM, ZNQBKG39LM, ZNQBKG40LM and ZNQBKG41LM improvements ([#7018](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7018)) ([3845d7f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3845d7f0dc55ac8a0415a4358cdd7adba15e36c4))
* **detect:** Detect `\u001aTRADFRI bulb GU10 WW 345lm8` as IKEA LED2104R3 https://github.com/Koenkk/zigbee2mqtt/issues/21240 ([b432617](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b432617f8e40336ef149ab896e2feda0944dcbac))
* EMIZB-132: Avoid reporting of zero energy (currentSummDelivered) ([#7025](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7025)) ([df73bfc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/df73bfc9d123da470245ce06e5a032ffb643f384))
* Fix Gledopto GL-SD-001 commands timing out https://github.com/Koenkk/zigbee2mqtt/issues/21259 ([3948f1f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3948f1f8c1f8f61c5a97275400e5c5fb76de3be3))
* Fix Xiaomi LYWSD03MMC integration ([#7015](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7015)) ([2310100](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2310100e95abae5e6de3c9fc45e78e901bf0d877))
* **ignore:** update zh to 0.33.8 ([b6b68ac](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b6b68acfeb3464e7eb9fe7dd9b7514f9c59afd20))

## [18.28.2](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.28.1...v18.28.2) (2024-02-05)


### Bug Fixes

* Avoid negative values (-2 147 483 648) for EMIZB-132 ([#7021](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7021)) ([ca54765](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ca54765596f4f54319b32708e8eafa4bc5c0b763))
* **detect:** Detect `_TZE200_wnp4d4va` as Mercator Ikuü  SSW06G ([#6984](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6984)) ([fb1a590](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fb1a5901038576dc06939a8c01eb6d26edceb096))
* **detect:** Detect `0x8040`, `0x8041` and `0x8042` as Danfoss Icon ([#7017](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7017)) ([e63585a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e63585a96a586a26c73fac2e2d28211afb68355c))
* **detect:** Detect `TRADFRI bulb GU10 WW 345lm8` as IKEA LED2104R3 https://github.com/Koenkk/zigbee2mqtt/issues/21240 ([68901cc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/68901cc413ea547b2441e2688e8a81e351bab653))
* Disable blinking of internal green led of WB-MSW-ZIGBEE v.4 ([#7016](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7016)) ([30d4f48](https://github.com/Koenkk/zigbee-herdsman-converters/commit/30d4f48980e9b5fe296af217d285aafe39ead25a))
* Disable unsupported OTA for Aqara MCCGQ14LM https://github.com/Koenkk/zigbee2mqtt/issues/21232 ([a6582a6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a6582a6f875a4a1c6a7cc4c51a1257736f23a3ef))
* Fix `No converter available` error for TuYa ZY-M100-24G https://github.com/Koenkk/zigbee2mqtt/issues/21230 ([f0e5de3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f0e5de3073f1f5a737bd24f7922fc95366ab19f5))
* Fix configure of eWeLink ZB-SW0X failing https://github.com/Koenkk/zigbee2mqtt/issues/21203 ([531f0aa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/531f0aa50155af085e20b77a0e9fb85e078c48b5))
* Rename `3137308/3137309` to `3004482/3137308/3137309` https://github.com/Koenkk/zigbee2mqtt/issues/20886 ([0ed81aa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0ed81aaf29114ae3d3ef6332d63a929e56e119dc))
* Update Open\'R description ([#7019](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7019)) ([6aa4354](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6aa4354b276261679b81bc43499b33cba59f8b23))

## [18.28.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.28.0...v18.28.1) (2024-02-04)


### Bug Fixes

* Fix fan control of BAC-002-ALZB ([#7011](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7011)) ([c01ea9e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c01ea9e2ef1f45a1b3bca87e6e7d4a1a379bfb8b))
* Fix no actions for TuYa TS0042 https://github.com/Koenkk/zigbee2mqtt/issues/21196 ([445b1f8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/445b1f88f9f9d279c2c3b904856db6ddfe4a5bcd))
* Fix power source for Namron 1402767 https://github.com/Koenkk/zigbee2mqtt/issues/21212 ([deb3a86](https://github.com/Koenkk/zigbee-herdsman-converters/commit/deb3a867aafc35c025522c9ba64a3c4c3dad74ec))
* Improve SONOFF SNZB-02 reporting intervals ([#7013](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7013)) ([c52a1cc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c52a1cc14c83cb7b4c136dda319b09bbd8bcbc39))

## [18.28.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.27.1...v18.28.0) (2024-02-04)


### Features

* Add OTA support for the Namron 540139X panel heaters ([#7008](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7008)) ([1b57e29](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1b57e29e08c7d389ca82515a8bc594527fc80ddf))
* Expose identify for IKEA E2013 and E2134 ([#7000](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7000)) ([52bfef5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/52bfef5e19698ba1f20ee9cfe78b3d4f79aa9e15))


### Bug Fixes

* 'transition' is not a number, got string () when `transition: ""`([#7003](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7003)) ([c879def](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c879deff072d8b48f09b7e08e690eb6f843101ff))
* `\u001aTRADFRI bulb GU10 WW 345lm` not detected as supported https://github.com/Koenkk/zigbee2mqtt/issues/20551 ([5fcd14b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5fcd14ba9d98a979d3a3c7ef7569ca87b448e314))
* Fix Aqara ZNQBKG38LM, ZNQBKG39LM, ZNQBKG40LM and ZNQBKG41LM bugs ([#7010](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7010)) ([d1b18ad](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d1b18ad11c28962e94068cdd2f194637802ae9ab))
* **ignore:** update dependencies ([#6970](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6970)) ([f167ce8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f167ce8e41336f1be79aacd47fc72432bb268565))

## [18.27.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.27.0...v18.27.1) (2024-02-03)


### Bug Fixes

* **detect:** Detect `_TZE200_e9ba97vf` and `_TZE200_kds0pmmv` as Moes TV01-ZB https://github.com/Koenkk/zigbee2mqtt/issues/21186 ([891a4fb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/891a4fb98348d76421972e1471d3b4af39511b92))
* **detect:** Detect `_TZE200_sgpeacqp` as TuYa TS0601_smart_human_presence_sensor_1 ([#7005](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7005)) ([4d9d859](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4d9d8593db955fd4aaae7182eb4b24aea890642d))
* Fix `single_1` instead of `single` action for various TuYa devices https://github.com/Koenkk/zigbee2mqtt/issues/21158 ([c7dc11e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c7dc11ec755d5c37d48d30e745f22a5c7417c80e))

## [18.27.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.26.0...v18.27.0) (2024-02-03)


### Features

* **add:** 8719514338487 ([#6999](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6999)) ([e8146b1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e8146b116cd87d9aca87f0db3832eaff2e042404))
* **add:** BAC-003 [@pippocuce](https://github.com/pippocuce) https://github.com/Koenkk/zigbee2mqtt/issues/17521 ([b170998](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b1709982ddc3569691c54f6688d4a2c0f0d081f7))
* **add:** ZS-SR-EUC ([#6985](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6985)) ([a16bf09](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a16bf092aed9674d6452c778bdbd9ce802157eb1))
* Support more features for Bosch BTH-RM ([#6996](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6996)) ([0f61647](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0f61647a3cc03ac6f43177301fd84e187f002b58))


### Bug Fixes

* **detect:** Detect `_TZ3290_gnl5a6a5xvql7c2a` as TuYa iH-F8260 [@kikher](https://github.com/kikher) https://github.com/Koenkk/zigbee2mqtt/issues/21172 ([3818d79](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3818d79f4eedd8f4e788bd6d991dcc289c8d4686))
* **detect:** Detect `WATER_TPV13` as HEIMAN HS1WL/HS3WL https://github.com/Koenkk/zigbee2mqtt/issues/21174 ([5059488](https://github.com/Koenkk/zigbee-herdsman-converters/commit/50594880d0742ce5da3782c991a16a7c68306fc0))
* Fix failing commands to Aqara ZNCWWSQ01LM causing a crash https://github.com/Koenkk/zigbee2mqtt/issues/17148 ([710ab22](https://github.com/Koenkk/zigbee-herdsman-converters/commit/710ab2242470bf29397e5a7b504c34eab098b8e0))
* Fix Light Solution 3137308/3137309 not exposing dimming functionality https://github.com/Koenkk/zigbee2mqtt/issues/21183 ([4d9df26](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4d9df263b2abead775b8c69325704aeef691ddb6))
* **ignore:** fix e122451 ([10cd944](https://github.com/Koenkk/zigbee-herdsman-converters/commit/10cd9445c8a3b5f52ae70d62c33e636a81f98b4c))
* LiXee: Correct stge parsing by converting String to raw hex number ([#6997](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6997)) ([9ec258c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9ec258c8950932bf36131988aecd57abc5fdb940))
* Log instead of throwing exception when generateDefinition can handle only 1 endpoint ([#7001](https://github.com/Koenkk/zigbee-herdsman-converters/issues/7001)) ([6c4475c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6c4475c4fd13fd4b6b069c90ecf1cfef071d5f96))

## [18.26.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.25.1...v18.26.0) (2024-02-01)


### Features

* Support button state during rotation for Lumi ZNXNKG02LM ([#6992](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6992)) ([b667d44](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b667d448fe22ba4f0d1ae0edc929b8c338fa5f40))


### Bug Fixes

* **detect:** Detect `_TZ3000_18ejxno0` as Moes ZS-EUB_2gang ([#6804](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6804)) ([d4c8c9f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d4c8c9f667950243ee7925194b425018b20792fe))
* **detect:** Detect `TRADFRI bulb E26 WW G95 CL 470lm` as IKEA LED2102G3 https://github.com/Koenkk/zigbee2mqtt/issues/19382 ([f35ae3d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f35ae3d5d1c5e3ab22d39a63f377bc69dc66f8fb))
* Fix `battery` not exposed for Aqara MCCGQ12LM https://github.com/Koenkk/zigbee2mqtt/issues/19559 ([e122451](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e122451393c87fffd63c1afd34b4bfe3b167ad68))
* manuSpecificLumiicLumi should be manuSpecificLumi ([#6990](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6990)) ([b918dd7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b918dd764dca37957c577b3226526d2f2999a328))
* Niko 552-72301 state ([#6993](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6993)) ([aebfa99](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aebfa997703e22019e460e22bc0a6693186a63a9)), closes [#20972](https://github.com/Koenkk/zigbee-herdsman-converters/issues/20972)
* Update Vesternet VES-ZB-SWI-015 to configure power reporting based on firmware version ([#6991](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6991)) ([993b361](https://github.com/Koenkk/zigbee-herdsman-converters/commit/993b361804a85c5da7a68bb501ba8eff27db5ca8))

## [18.25.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.25.0...v18.25.1) (2024-01-31)


### Bug Fixes

* **detect:** Detect `_TZ3000_imaccztn` as MHCOZY TYWB 4ch-RF ([#6981](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6981)) ([c46539c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c46539c152cdd334f7ae6bb6ba201f30eeb3e22b))
* Fix `Cannot read properties of undefined (reading 'find')` https://github.com/Koenkk/zigbee2mqtt/issues/21123 ([f171433](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f1714330daf860167f0e9c6bc04f2b1336fbfa8d))
* Fix display of incorrect firmware version for Aqara `ZNCLBL01LM` ([#6983](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6983)) ([2e693cb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2e693cb16420a5baed051e51862267e457f56ba8))
* **ignore:** fix c46539c152cdd334f7ae6bb6ba201f30eeb3e22b ([f15f085](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f15f0854f879b98525f779bced24ef4eceb45e0a))

## [18.25.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.24.0...v18.25.0) (2024-01-30)


### Features

* **add:** RSH-HS06 https://github.com/Koenkk/zigbee2mqtt/issues/20815 ([f1cdde8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f1cdde884a835071b775cfc78c0b01f848a88aa7))
* Support multi endpoint for generate definition ([#6930](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6930)) ([a1b6c28](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a1b6c282e6f98447028bcd912b7a9ac6953e05b2))
* Update all Lumi (Aqara and Xiaomi) terminology, device `vendor` and `description` ([#6969](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6969)) ([a1ddacd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a1ddacd2d934af9239edd84960ddefc88bc9eeb4))

## [18.24.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.23.1...v18.24.0) (2024-01-29)


### Features

* **add:** ZTH05Z ([#6966](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6966)) ([a0431c7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a0431c75efb2ae104d05cdc384e001050069f735))


### Bug Fixes

* Add identify to IKEA E1743/E2001/E2002 ([#6975](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6975)) ([81a0e23](https://github.com/Koenkk/zigbee-herdsman-converters/commit/81a0e236135f6a11d81df07f7ab6e02235878dcf))
* **detect:** Detect `_TZ3000_p3fph1go` as TuYa TS0215A_SOS [@pottenmak](https://github.com/pottenmak) https://github.com/Koenkk/zigbee2mqtt/issues/21102 ([c56c5db](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c56c5db9336adafd046c4c1309fbab84ec1f63a7))
* Fix Xiaomi LLKZMK12LM actions https://github.com/Koenkk/zigbee2mqtt.io/pull/2522 ([e5b664f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e5b664f77b680c8081b48b7d4c12973139455fdd))
* Migrate DiY MHO-C401N to modernExtend ([#6976](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6976)) ([61086b3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/61086b36834ad10bf4819314e3e25110de49ded0))

## [18.23.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.23.0...v18.23.1) (2024-01-28)


### Bug Fixes

* **ignore:** fix efac56192c9c923d5b23d3b317f50effa9b7699e ([9bbcc9b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9bbcc9b46bf3118c90c17ca6075d1ad8b9e20038))

## [18.23.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.22.0...v18.23.0) (2024-01-28)


### Features

* Support more features and fix brightness for TuYa TS0052 https://github.com/Koenkk/zigbee2mqtt/issues/19847 ([efac561](https://github.com/Koenkk/zigbee-herdsman-converters/commit/efac56192c9c923d5b23d3b317f50effa9b7699e))


### Bug Fixes

* Add entity_category for more entities ([#6967](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6967)) ([9fab669](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9fab669857a1de2f99f4c64223fbd0d8c05d8325))
* Fix IKEA E2112 configure failing ([#6971](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6971)) ([e4b88b8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e4b88b8704bc6baa00671a685eec0ce12c6781b0))
* Fix no `battery` value for Xiaomi SJCGQ12LM https://github.com/Koenkk/zigbee2mqtt/issues/20764 ([484c881](https://github.com/Koenkk/zigbee-herdsman-converters/commit/484c88185ef4b31a50437e2055539f1c9430ddb5))
* Improve TuYa ZY-M100-24G support ([#6959](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6959)) ([f1ee1b9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f1ee1b92c8436574b0a8cee9cd13d8dbe78aef37))

## [18.22.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.21.0...v18.22.0) (2024-01-27)


### Features

* **add:** Open\'R ([#6890](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6890)) ([a95f998](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a95f998d1050d70e74cdeb49508e1225abc67bc3))
* Support electricity metering for SKHMP30-I1 ([#6958](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6958)) ([30fcec8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/30fcec89fb6b591a525c933dc3252cc808d6acec))


### Bug Fixes

* Add back `detect_interval` to Aqara RTCGQ14LM ([#6964](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6964)) ([0b1176f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0b1176fba5ba3813efc5173bfb5ed27ee818d9d2))
* **detect:** Detect `_TZ3000_dlhhrhs8` as TuYa QS-zigbee-S08-16A-RF  https://github.com/Koenkk/zigbee2mqtt/issues/20964 ([b8f3c91](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b8f3c913c47feda18c47e3b16f5a22192d10756c))
* **detect:** Detect `_TZE204_ztqnh5cg` as iHenso _TZE204_ztqnh5cg ([#6960](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6960)) ([0b789e2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0b789e2165b877063d74be8b307d4e4cd95e245a))
* **ignore:** Refactor more lights to modernExtend ([#6782](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6782)) ([e8affe5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e8affe51a841563097c9803fa4e2133be1cc3f6f))

## [18.21.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.20.0...v18.21.0) (2024-01-25)


### Features

* **add:** HMSZB-120 ([#6949](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6949)) ([cc6e06a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cc6e06afb524ba9ea20b3a0fe950354b7683530e))


### Bug Fixes

* Correct scaling on Ubisys H1 local temperature offset ([#6955](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6955)) ([12c6442](https://github.com/Koenkk/zigbee-herdsman-converters/commit/12c64427f3aa7bb02db107ee7c00283d574d44de))
* **detect:** Detect `_TZE200_mja3fuja` as TuYa TS0601_air_quality_sensor ([#6953](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6953)) ([af703cc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/af703cc8860eaaa658c1cdaf10ed23105213ec37))
* Fix certain IKEA bulbs switching on to lowest brightness on toggle ([#6954](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6954)) ([a5c24e3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a5c24e3864b63e5b0b6cb0074938b5e5d9b43912))
* Fix TuYa `TS0601_dimmer_2` and `TS0601_dimmer_3` not controllable from HA https://github.com/Koenkk/zigbee2mqtt/issues/19874 ([8b6891b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8b6891b96b8a58b4fda67666657150ee5222b332))
* **ignore:** fix co2 scale https://github.com/Koenkk/zigbee-herdsman-converters/pull/6890 ([9af89a1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9af89a10eb4d7dabd68df9dfc3538b8a9f66596c))

## [18.20.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.19.0...v18.20.0) (2024-01-24)


### Features

* **add:** 4058075724587 ([#6947](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6947)) ([505370f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/505370f82defb0f5fb20cc650ad84db6f8f8cd1c))
* **add:** PCI E ([#6880](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6880)) ([e5b3561](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e5b3561b0e4e03997f2e4f56e2e30cb036ab67ae))
* Support gradients for Philips 915005988501 ([#6948](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6948)) ([cc6bdd8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cc6bdd89da49f367b9822e335b92150ec6ac4450))
* Support new Inovelli VZM35 firmware features ([#6936](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6936)) ([8d8c2a6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8d8c2a6d678bb68ff352fdb3d46676455b581ca4))


### Bug Fixes

* **detect:** Detect `_TZ3000_lvhy15ix` as TuYa TS0003_switch_module_2 https://github.com/Koenkk/zigbee2mqtt/issues/20961 ([b60dce9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b60dce9d11f8211fa73b93408c05c29f8fe50f69))
* **detect:** Detect `_TZE200_icka1clh` as TuYa TS0601_cover_4 ([#6950](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6950)) ([5fc3ede](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5fc3edec3b035d1726bb8c0eb1a96f9e2c8a0b5a))
* **ignore:** fix co2 scale https://github.com/Koenkk/zigbee-herdsman-converters/pull/6890 ([daf85eb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/daf85ebd933cc181a1b4bbb2b23bc1f3c32e37b0))
* Remove useless `remote_temperature` from Ubisys H1 ([#6951](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6951)) ([a8cd162](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a8cd162e888c373fccdd87e91289576e606929a9))

## [18.19.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.18.0...v18.19.0) (2024-01-23)


### Features

* **add:** LKWSZ211 ([#6944](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6944)) ([bb2ffdc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bb2ffdc861ef9146159a56f625c76d0016519488))
* **add:** TS004F_6_button, ZNQBKG38LM, ZNQBKG39LM, ZNQBKG40LM, ZNQBKG41LM ([#6945](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6945)) ([a7e3b9a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a7e3b9a28a7e017ac99cdb782414c846bb528002))
* Support more features for LYWSD03MMC ([#6939](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6939)) ([6de8b7c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6de8b7c41efd9defffa4c17f88c69b67195d0d20))


### Bug Fixes

* **detect:** Detect `_TZE204_shkxsgis` as Zemismart TB26-4 [@willrnsantana](https://github.com/willrnsantana) https://github.com/Koenkk/zigbee2mqtt/issues/20944 ([0f01221](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0f012215e9ca3944777e19ca1f60b6fde1d14471))
* **detect:** Detect `929003574301` as Philips `915005996701` [@dimatx](https://github.com/dimatx) https://github.com/Koenkk/zigbee2mqtt/issues/20934 ([88f1469](https://github.com/Koenkk/zigbee-herdsman-converters/commit/88f1469496e39376db1d147c8c9acbee525ae20a))
* Fix ORVIBO RL804QZB configure failing https://github.com/Koenkk/zigbee2mqtt/issues/20918 ([81d28af](https://github.com/Koenkk/zigbee-herdsman-converters/commit/81d28af9d1cc13ca6aece7c36a313e9a3ca6b921))
* **ignore:** fix 1b14c25 ([a6e5a4e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a6e5a4e7895a390749a6a665a3f218c83c43d908))

## [18.18.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.17.0...v18.18.0) (2024-01-21)


### Features

* Expose `mode` for TuYa TRV602 @BAUBLITZ https://github.com/Koenkk/zigbee-herdsman-converters/pull/6766 ([f7cb1f1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f7cb1f160f07fcca7a354429cad9d63c7272ea85))
* Improve Aqara SRTS-A01 integration ([#6922](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6922)) ([f9a17e4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f9a17e4e512bbed069994d5ef80aa6829ee35c1b))


### Bug Fixes

* Fix `Failed to find endpoint which support OTA cluster` error for Xiaomi devices https://github.com/Koenkk/zigbee2mqtt/issues/10660 ([aaa5018](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aaa501810357c58a1c82b27c7a9fb8b7c09ff735))
* Fix Onesti easyCodeTouch_v1 battery percentage divided by 2 ([#6940](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6940)) ([ec956f7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ec956f7a1aeb8162f5188d995ff763260fef1c35))
* **ignore:** update dependencies ([#6938](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6938)) ([d6bbb85](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d6bbb8590f2d39655bfb48ab68766c12af597d7c))
* Update Aqara WP-P01D description ([#6937](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6937)) ([e3e82ff](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e3e82ffeb03a4002025828f20ef6d8e99fa4f892))
* Update TuYa TS0210 sensivity description https://github.com/Koenkk/zigbee2mqtt/issues/18929 ([16fddf9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/16fddf99b54a0db551df5885901c5a42c41b374d))

## [18.17.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.16.0...v18.17.0) (2024-01-20)


### Features

* Add ability to set weekly schedule to Sonoff TRVZB ([#6443](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6443)) ([241fc9a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/241fc9a63f74cc9fcad0774da94d0a5d0ec5da8d))
* **add:** 3137309 [@agoberg2](https://github.com/agoberg2) https://github.com/Koenkk/zigbee2mqtt/issues/20886 ([8caf853](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8caf8537ddb4ca8e8061e84f3e6da497c9ad946b))
* **add:** WP-P01D ([#6925](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6925)) ([a9e5efa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a9e5efa06d319100a51e9f8998d8dbe9b42e7b19))
* Enable identify for IKEA Vallhorn and Parasoll ([#6934](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6934)) ([c8a2cee](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c8a2cee2caef969a32d18f4723d3e3734e3f80d9))


### Bug Fixes

* Disable unsupported configure reporting for ShinaSystem SBM300ZX https://github.com/Koenkk/zigbee2mqtt/issues/20687 ([8ff72e7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8ff72e77e2d09bb217f2b8bf16a95d99d17a92fb))
* Remove unsupported color from Innr RB 278 T https://github.com/Koenkk/zigbee2mqtt/issues/20884 ([d0b3cd6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d0b3cd66d46d662b1dd462fa4648414f4dd95a67))

## [18.16.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.15.1...v18.16.0) (2024-01-19)


### Features

* **add:** 915005914501 ([#6932](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6932)) ([9b764ea](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9b764ea36d40cdf82e4d45600af48dad9d8d6c12))


### Bug Fixes

* Fix too small frames leading to errors for Xiaomi ZNCWWSQ01LM https://github.com/Koenkk/zigbee2mqtt/issues/17148 ([4737a3f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4737a3ffa3951b241b150757c08835f424deeecc))
* **ignore:** Fix Nue / 3A HGZB-42 configure failing https://github.com/Koenkk/zigbee2mqtt/issues/20867 ([a8a8009](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a8a800998c53e67fe620298bc365a4a0ddab0c77))

## [18.15.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.15.0...v18.15.1) (2024-01-18)


### Bug Fixes

* **detect:** Detect `_TZ3000_0s9gukzt` as Nous E4 ([#6929](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6929)) ([db9facf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/db9facfab396232460176e4dd57d839cfa6ee8e3))
* **detect:** Detect `_TZE204_9qhuzgo0` as TuYa TS0601_dimmer_1 https://github.com/Koenkk/zigbee2mqtt/issues/20801 ([cb26d75](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cb26d750cc2e2e8cd2f0b9c6d7ded2d20a644e48))
* **detect:** Detect `929003053901` as Philips 3261048P6 ([#6921](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6921)) ([bdbda27](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bdbda2777ab713d9f8531a761c3c057e7ffe4ea0))
* **detect:** Detect `E220-KR5N0Z0-HA` as LELLKI WP33-EU/WP34-EU ([#6923](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6923)) ([f840df6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f840df6e771282b14f5053a100c197e6f308970e))
* Fix negative temperature values for TuYa TS0601_air_quality_sensor incorrect https://github.com/Koenkk/zigbee2mqtt/issues/20774 ([3840ea4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3840ea49154cc3585b28bc2fcd60213e07247688))

## [18.15.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.14.0...v18.15.0) (2024-01-17)


### Features

* **add:** TS0501B_dimmer [@amaduain](https://github.com/amaduain) https://github.com/Koenkk/zigbee-herdsman-converters/issues/6858 ([c35d1c0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c35d1c0eaa1b757a62c9d67f0cdcc6fc707d38aa))
* Support `sensor` for TuYa ZWT198/ZWT100-BH ([#6917](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6917)) ([9373087](https://github.com/Koenkk/zigbee-herdsman-converters/commit/93730875fe850aa8b0f9e7bf82f3db1ee559e17a))


### Bug Fixes

* Add whitelabel for Owon to TS0601_3_phase_clamp_meter ([#6919](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6919)) ([e86c287](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e86c287e5d6b6d8e3c562436cebaa3b92325a33c))
* **detect:** Detect `_TZE204_3t91nb6k as TuYa TS0601_switch_2_gang https://github.com/Koenkk/zigbee2mqtt/issues/20729 ([17101f1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/17101f1f0959bc0fc2881e12bd6ded51a35fda7d))
* Disable unsupported `power_on_behavior` for Vimar 14592.0 https://github.com/Koenkk/zigbee2mqtt/discussions/20854 ([8328b8a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8328b8aa4f8236f66024d6c0e23f365aed350b5e))
* Fix missing `color_temperature_move_stop` https://github.com/Koenkk/zigbee-herdsman-converters/issues/6918 ([eab49cb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/eab49cbf2929d06f2886a8225367b9d9cccf97b8))
* **ignore:** Export various TuYa send functions https://github.com/Koenkk/zigbee2mqtt/issues/19874 ([1636d5c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1636d5c85c151e6bed8b8658aa8953fb7464ee71))
* **ignore:** fix 386294c ([e1b662f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e1b662fa141ef39244f769684c8d268d98b35c02))
* **ignore:** fix 386294c1ee70afacf29ca6be653fae173c9b4c54 ([1b14c25](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1b14c25510f92cb5e93fcd189e724935972a146e))
* **ignore:** Refactor some TuYa lights to modernExtend https://github.com/Koenkk/zigbee-herdsman-converters/issues/6858 ([386294c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/386294c1ee70afacf29ca6be653fae173c9b4c54))

## [18.14.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.13.0...v18.14.0) (2024-01-16)


### Features

* **add:** CCTFR6730 ([#6908](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6908)) ([ad2d111](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ad2d1114d4f7ae9bb516c6dc48e5959ff49cbec3))


### Bug Fixes

* **detect:** Detect `_TZE204_lzriup1j` as TuYa ZWT198/ZWT100-BH ([#6912](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6912)) ([34de76f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/34de76fe3d1ffb2aa6dbcd712ceb5178f38712f9))
* Fix Profalux NSAV061 configure failing ([#6913](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6913)) ([278c125](https://github.com/Koenkk/zigbee-herdsman-converters/commit/278c125399950e728fb8b5713863d7d98ec6f63b))
* Fix SONOFF SNZB-06P and SNZB-03P configure failing https://github.com/Koenkk/zigbee-herdsman-converters/issues/6829 ([d600fe4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d600fe4e90bba01f02893d4e3fef4cf99148e3ae))
* **ignore:** Fix some modernExtend and replace readOnly with access ([#6915](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6915)) ([7cb4cf0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7cb4cf0b865d14f6b64b451b88e8a6fce6b6e806))
* Remove deprecated `sendWhen` from converters ([#6906](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6906)) ([7073128](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7073128f7faacf5c8be204259e2680af98590bec))
* Rename Sprut to Wirenboard ([#6911](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6911)) ([3206130](https://github.com/Koenkk/zigbee-herdsman-converters/commit/320613013e68b52daaea75aef26166f90106f492))

## [18.13.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.12.0...v18.13.0) (2024-01-15)


### Features

* Add ability to re-evaluate exposes on incoming Zigbee messages ([#6869](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6869)) ([132d45e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/132d45e5f68b133ff02242153d9f458b74c5b260))
* **add:** HA-ZX1 ([#6903](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6903)) ([e8e0b87](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e8e0b87b215fa83ec058a8ca95d4ee1d4cfb6903))
* Support `do_not_disturb` for TuYa TS0505B_2 https://github.com/Koenkk/zigbee2mqtt/issues/19718 ([af81fbd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/af81fbdc08d1a83e96bfebfdc34aaa880d3c3cce))
* Support alarm triggering for Bosch BSD-2 ([#6862](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6862)) ([6362f20](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6362f2085610a2568388bdfb4d6909775bc2634c))


### Bug Fixes

* **detect:** Detect `_TZ3000_o1jzcxou` as TuYa TS011F_plug_1 https://github.com/Koenkk/zigbee2mqtt/issues/20702 ([cca57d7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cca57d722f13818af0b1a841c075ab791dcb7de5))
* **detect:** Detect `_TZE200_9p5xmj5r` as Hiladuo B09M3R35GC ([#6893](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6893)) ([cfc2937](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cfc2937f612b687080b4b2557a167bbb02a78c46))
* **detect:** Detect `_TZE204_9yapgbuv` as TuYa ZTH02 ([#6894](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6894)) ([a413f00](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a413f00e42f9b719ab35b955bf422eec2aafed21))
* Fix `max_temperature_limit` range for Moes BHT-002-GCLZB https://github.com/Koenkk/zigbee2mqtt/issues/20809 ([6ef3528](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6ef352835316d3d1cfc8d6b1e264a40263dd9823))
* Fix no OTA cluster for TuYa TS011F_plug_1 https://github.com/Koenkk/zigbee2mqtt/issues/20765 ([ec95294](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ec95294f063279679f6ecb3ade68e3d896991311))
* Fix Xiaomi VOCKQJK11LM losing bindings on power outage ([#6909](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6909)) ([6acce9c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6acce9ccdceb1f2dd162e30c1036b2d28732c77d))
* **ignore:** fix a413f00e42f9b719ab35b955bf422eec2aafed21 ([ae01713](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ae01713a859ebf87da03a10c16758440bbd8ceb2))
* **ignore:** update dependencies ([#6905](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6905)) ([55894cb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/55894cbd3aaf36800d86bf9208b62084164ffe7d))

## [18.12.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.11.0...v18.12.0) (2024-01-13)


### Features

* **add:** HT-INS-2 ([#6895](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6895)) ([fa2b139](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fa2b139da542385630a31a7f8e571c4b7da8707c))
* **add:** L2207 ([#6891](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6891)) ([4da96c5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4da96c5fb50fb991b0c01f40e2eb37cd8e89d18d))
* Support co2 in defintion generator https://github.com/Koenkk/zigbee-herdsman-converters/pull/6890 ([6c724a1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6c724a19be51f9b6844a9da91fd5b8183f35c128))


### Bug Fixes

* Added White Label For Moes ERS-10TZBVB-AA ([#6897](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6897)) ([14422ce](https://github.com/Koenkk/zigbee-herdsman-converters/commit/14422ce4fdcb07da2e3b2e1bcfe91712007069a4))
* Added White Label For Schneider CCTFR6500 ([#6896](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6896)) ([80cc974](https://github.com/Koenkk/zigbee-herdsman-converters/commit/80cc9740c579c677403f859394a18b52369e2b1a))
* **detect:** Detect `_TZ3000_0ht8dnxj` as TuYa TS004F ([#6888](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6888)) ([d49a030](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d49a0303b55f8a67a444b6e36f2f2753693e0e0b))
* **detect:** Detect `_TZ3000_8h7wgocw` as Danor SK-Z802C-US ([#6900](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6900)) ([5e57f13](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5e57f133087057606a9fa38ab825a051c84cc691))
* Disable unsupported `power_on_behavior` for various ShinaSystem devices ([#6886](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6886)) ([a7277de](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a7277de441b54b2adbeb433b4397a3ae37c19ccf))
* Fix battery reporting for E2013 ([#6892](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6892)) ([af0d9e4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/af0d9e424e4f20c21e4b489a318376e6e5ba2ab7))
* Fix Danfoss 014G2461 setpoint limit ([#6901](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6901)) ([9abfb9c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9abfb9c8b0002fc1430522e6e4b289b9a4aeed29))
* Fix no OTA endpoint available for various Xiaomi devices https://github.com/Koenkk/zigbee2mqtt/issues/10660 ([166b7af](https://github.com/Koenkk/zigbee-herdsman-converters/commit/166b7afd06aec1c553b04f0e670e1bc59113c1e1))
* Fix Xiaomi ZNCWWSQ01LM 0 days schedule parsing https://github.com/Koenkk/zigbee2mqtt/issues/20130 ([9496119](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9496119f286c9761f14bae65577c3c00029ebf4b))
* **ignore:** change pendingRequestTimeout quirk to checkinInterval ([#6884](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6884)) ([35f962c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/35f962cf7401811f7139b9d150eadf771c46dab8))
* **ignore:** update dependencies ([#6899](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6899)) ([5e58f2e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5e58f2e66e9ebfb863539bcca233a2ee2ca6bf37))

## [18.11.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.10.1...v18.11.0) (2024-01-11)


### Features

* **add:** 41ECSFWMZ-VW ([#6875](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6875)) ([c84bfd7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c84bfd7b05af3961f9c49193dbb848599810b23a))
* **add:** ZB-TTS01 ([#6881](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6881)) ([45bddc0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/45bddc002cee6a7389c6e6d4467e9e2b51d6f26b))
* Improve OWON PC321: add power factor and summation attributes ([#6879](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6879)) ([76310d5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/76310d5cdffda9a4992b8d11b90ebb2a28d14001))
* Lixee : explode STGE into sub-values ([#6882](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6882)) ([4bc707a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4bc707ad415dfc29b47cad1880b82416a6f7a881))
* Support OTA for AU-A1ZBDSS https://github.com/Koenkk/zigbee-OTA/issues/403 ([5feb3b6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5feb3b6adeb0e1d264025fc09929e9dfb1527914))


### Bug Fixes

* Add new model IDs to `LED2002G5`, `LED1738G7` and `LED1935C3` ([#6872](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6872)) ([11df892](https://github.com/Koenkk/zigbee-herdsman-converters/commit/11df892b390c435ae1d72b3cbfc8efe3fd539bcc))
* **detect:** Detect `_TZE200_yia0p3tr` as TuYa TS0601_cover_1 @IceEyz https://github.com/Koenkk/zigbee2mqtt/issues/20725 ([f83994e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f83994e792b09f87f26119e0691dca660d07e758))
* Fix setting ELKO 4523430 `display_text` https://github.com/Koenkk/zigbee-herdsman-converters/issues/6883 ([495a32e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/495a32ee5fe63b2b8e75de12b250269f086a82b8))
* Move devices to modernExtend.quirkPendingRequestTimeout ([#6874](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6874)) ([d284368](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d284368128618053c7efca8d75152d8026e6bc7e))
* Remove unused `imageSize` parameter from `upgradeEndResponse` https://github.com/Koenkk/zigbee2mqtt/issues/17374 ([42e1cec](https://github.com/Koenkk/zigbee-herdsman-converters/commit/42e1cecd35fd7c45919a2d7d102bba78dec3e684))

## [18.10.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.10.0...v18.10.1) (2024-01-09)


### Bug Fixes

* **detect:** Detect `TH1320ZB-04` as Sinopé TH1320ZB-04 ([#6867](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6867)) ([0c33647](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0c336472fbdea3a80296bbe36a35917cfc41cc73))
* Fix configure for Hej switches https://github.com/Koenkk/zigbee2mqtt/issues/20666 ([5ffd5a7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5ffd5a7d791bc6d446d4aa402aa6d9e14d431c1f))
* Fix configure for SONOFF S31ZB. https://github.com/Koenkk/zigbee2mqtt/issues/20618 ([759a395](https://github.com/Koenkk/zigbee-herdsman-converters/commit/759a395a34b1b89586e10d44d3ca78d396c4b0cf))
* Fix LiXee typo activeEnerfyOutD0x to activeEnergyOutD0x ([#6866](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6866)) ([91a7de4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/91a7de4478e5e914766d80c7dfe65d2edbb035cd))
* Fix reported "latest version" when "no update available" ([#6864](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6864)) ([5f26292](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5f2629252c2778655f6798695da00ae386dd9fc7))
* ptvo.switch: fixed an error message when Z2M tries to read an OnOff ([#6868](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6868)) ([f88f026](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f88f026fb9094e4881dcdf39b9265d04081aa54d))
* Replace `defaultSendRequestWhen` with `pendingRequestTimeout` ([#6865](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6865)) ([05e8da6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/05e8da64a684904d5e8301e6beb31964f616c29f))
* Update `power` expose and add `power_reactive` to Develco EMIZB-132 ([#6823](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6823)) ([0f7b04b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0f7b04b3729ef186d1a0df32d3d1c78bf4bbdc29))

## [18.10.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.9.0...v18.10.0) (2024-01-08)


### Features

* Add category attribute to exposes  ([#6837](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6837)) ([3a1b7a9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3a1b7a9b0c12499f93044c0f00d356673d8acc4a))
* Add missing clusters to Xioami VOCKQJK11LM ([#6840](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6840)) ([148e14e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/148e14e8438b86e3c0452b61b29c3220f7531906))
* Expose action_group for paul neuhaus q-remote ([#6863](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6863)) ([2b640b7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2b640b72a242e3de213b2a478f46335a74299dd6))


### Bug Fixes

* Add categories to several config/diagnostic exposes ([#6855](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6855)) ([2c08cdc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2c08cdc6cae73555f66469036f2dd6c5b0535a14))
* **detect:** Detect `_TZ3000_ssp0maqm` as TuYa TS0215A_sos https://github.com/Koenkk/zigbee-herdsman-converters/pull/6817 ([30e111d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/30e111d339c74a27b40680ce29f19e963dd03023))
* **detect:** Detect `_TZE204_n9ctkb6j` as TuYa TS0601_dimmer_1 ([#6861](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6861)) ([ff2c3ed](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ff2c3ed2a9f08b989d9296662a0e4336a63a03d5))
* **detect:** Detect `HK-SENSOR-CT-A` as Sunricher SR-ZG9010A ([#6857](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6857)) ([0d84a96](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0d84a967ba21429a42618e9ec9b6a3c1b8d6db53))
* Fix `weekly_schedule` `Error: 'transitionTime hour' is not a number, got string (00)` error ([#6860](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6860)) ([6a2bd70](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6a2bd70604ce107505db9d26225ba002dab08a49))
* **ignore:** Fix battery description https://github.com/Koenkk/zigbee2mqtt.io/pull/2474 ([df0e52d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/df0e52d8e85812ba3bb564cbbe31f2fddf0ca936))
* OTA logging: fixed typos / minor changes ([#6854](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6854)) ([22c4673](https://github.com/Koenkk/zigbee-herdsman-converters/commit/22c4673533b9380dc4d8abb115c70069e607ee13))
* Rename LED2005R5 to LED2005R5/LED2106R3 https://github.com/Koenkk/zigbee2mqtt/issues/20660 ([2e1df4e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2e1df4e586d3f4d1f0dad9df45910892991e181d))

## [18.9.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.8.0...v18.9.0) (2024-01-07)


### Features

* **add:** 7377019 ([#6852](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6852)) ([1471bc8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1471bc864a811adba8c55402162199bae3aaeb93))


### Bug Fixes

* Add `ignore_tuya_set_time` to TuYa X5H-GB-B ([#6850](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6850)) ([ec2e9b5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ec2e9b5b6a3e1a24e28ba5edaf1754572a92791a))
* **detect:** Detect `_TZE200_kvpwq8z7` as TuYa TS0601_gas_sensor_1 ([#6848](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6848)) ([763ae37](https://github.com/Koenkk/zigbee-herdsman-converters/commit/763ae373866f95460fa2a82cff3662d092500fb6))
* Expose `battery` for IKEA E2013 ([#6846](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6846)) ([5403c8a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5403c8aa704fa1a8db7f2fcc01623dd26215b7a9))
* Fix `power_factor` unit for various devices and add SPM01-D2TZ-U01 ([#6847](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6847)) ([57e7990](https://github.com/Koenkk/zigbee-herdsman-converters/commit/57e7990018ccdad7d4e79ff592e7185c737ae9b2))
* **ignore:** update dependencies ([#6849](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6849)) ([acc678b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/acc678bfd04f07526ef1f147059fc7193425b206))

## [18.8.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.7.0...v18.8.0) (2024-01-06)


### Features

* Expose `action` for MiBoxer FUT089Z https://github.com/Koenkk/zigbee2mqtt-user-extensions/issues/7 ([b881ab3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b881ab3ece047f96ca55ad15521772d56112abed))


### Bug Fixes

* Disable configure for Lonsonho QS-Zigbee-S05-LN https://github.com/Koenkk/zigbee2mqtt/issues/20526 ([ae89e9c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ae89e9cf37e1b17219a8508089b42cf2255fb11c))
* Improved OTA errors & logging ([#6843](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6843)) ([087f797](https://github.com/Koenkk/zigbee-herdsman-converters/commit/087f7978318fe551a7bb89f019348374319cc86d))

## [18.7.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.6.0...v18.7.0) (2024-01-06)


### Features

* **add:** WL4210 ([#6842](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6842)) ([45c7c68](https://github.com/Koenkk/zigbee-herdsman-converters/commit/45c7c681e38f605e20c09434f6975fa3932d98d7))
* **add:** ZM25R1 [@vinta7](https://github.com/vinta7) https://github.com/Koenkk/zigbee2mqtt/issues/19605 ([0573868](https://github.com/Koenkk/zigbee-herdsman-converters/commit/05738687fce5bae056292b15e2ab08d4bf9e31c7))
* Expose `sensor_temp` for Xiaomi SRTS-A01 ([#6841](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6841)) ([f8a1b2c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f8a1b2c3ee663e3aafd70ff2ebaff9a4836cddca))
* Support custom CA certs for OTA firmware downloads (fixes Hue OTA updates) ([#6831](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6831)) ([228f25b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/228f25b81c17e80b1cf18944e634357002d2ecfe))


### Bug Fixes

* **detect:** Detect `TRADFRI bulb E26 WS globe 1160lm` as IKEA LED2003G10 https://github.com/Koenkk/zigbee2mqtt/issues/20592 ([f91372d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f91372db3030021364d2f0fb4a6e3524e0b9578e))
* Disable unsupported powerOnBehavior for various Hej switches ([#6844](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6844)) ([b0f0563](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b0f0563a28d14d120140b1a4b199fec9b963bbab))
* Fix LELLKI WP33-EU/WP34-EU single switch toggling all switches https://github.com/Koenkk/zigbee2mqtt/issues/20590 ([d9af38f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d9af38ff1eba586f58c23c385da24d185172d197))
* Fix TuYa BLE-YL01 salinity unit https://github.com/Koenkk/zigbee2mqtt/issues/18704 ([7915542](https://github.com/Koenkk/zigbee-herdsman-converters/commit/79155421e0526738dfdb338fe8ee9f4c4c89b1d0))
* Fix Zemismart ZM25TQ power source https://github.com/Koenkk/zigbee2mqtt/discussions/14689 ([adc15fe](https://github.com/Koenkk/zigbee-herdsman-converters/commit/adc15fe430a42709d3caf095103e1279df8b79f4))
* **ignore:** Update `power_on_behaviour` exposes text ([dc248ab](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dc248ab82e7ee6007b8da776e3a7390a55330299))

## [18.6.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.5.0...v18.6.0) (2024-01-05)


### Features

* **add:** 3RTHS0224BZ ([#6827](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6827)) ([44da5db](https://github.com/Koenkk/zigbee-herdsman-converters/commit/44da5db1110ce51acb49c29493fefa058a445f50))
* **add:** BMCT-RZ ([#6825](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6825)) ([31e459b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/31e459bba75a7f05244eb4687bf246e9e4d0187b))
* **add:** MAI-ZTM20C ([#6835](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6835)) ([1fc4182](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1fc4182a6c90b173764b90df9d93ae767e550a0f))
* Support OTA for IKEA E2134 ([#6836](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6836)) ([601da38](https://github.com/Koenkk/zigbee-herdsman-converters/commit/601da389155a06b319c9fd0a84c4e79dd27c7bc0))


### Bug Fixes

* **detect:** Detect `_TZE204_mtoaryre` as TuYa MTG075-ZB-RL ([#6828](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6828)) ([1313fcb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1313fcbdf4f0339932b369d92d40203a10949b80))
* Fix `action` values for IKEA E2213 ([#6834](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6834)) ([f05053e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f05053eccc2cdc37c0298b79f12b46daee8ec057))
* Fix current calibration not working https://github.com/Koenkk/zigbee2mqtt/discussions/19949 ([cb0c46a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cb0c46a2e11257b70c7dcf5becafd73c63b1f6ce))

## [18.5.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.4.0...v18.5.0) (2024-01-04)


### Features

* Add new features to Ubisys H1 ([#6810](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6810)) ([e8c2180](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e8c218041009807d6942985f7e55438326550cd5))
* **add:** 8719514343320 https://github.com/Koenkk/zigbee2mqtt/issues/20561 ([73c9c1c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/73c9c1caa36ba2be13e36250754e22ae6d7b1c7a))
* **add:** TS0601_cover_8 ([#6830](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6830)) ([d07f94b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d07f94b5284ac7a73361686d716cb9029e087313))


### Bug Fixes

* Add `up_clickdown` and `down_clickdown` action to Sinopé TH1123ZB  ([#6822](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6822)) ([2ae708f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2ae708f119f31c0c49d20f5a8a7b1d52182e9d7a))
* **detect:** Detect `_TZ3000_ssp0maqm` as Woox R7052 ([#6817](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6817)) ([43e9e24](https://github.com/Koenkk/zigbee-herdsman-converters/commit/43e9e24c44cc81828b960021f670b1a8ff88f8cd))
* **detect:** Detect `_TZE200_py4cm3he` as TuYa TV02-Zigbee ([#6821](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6821)) ([aa1f112](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aa1f11216d4cfd94a043ebc676eb213b982e45cb))
* **detect:** Detect `\u001TRADFRI bulb GU10 WW 345lm` as IKEA LED2104R3 https://github.com/Koenkk/zigbee2mqtt/issues/20551 ([e50b811](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e50b811b06a1250f09603ec26e64d3457d93110d))
* Disable unsupported `powerOnBehaviour` for Quotra B07JHL6DRV ([#6813](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6813)) ([4c1d6c5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4c1d6c5546a8ee10ce92c05a50a70d29895d5a91))
* Disable unsupported powerOnBehavior for eWelink SWITCH-ZR02 ([#6824](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6824)) ([e9024c1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e9024c1d58d43ca03eee42bab3ea0b1bf52df8d7))
* Disable unsuppoted `powerOnBehaviour` for 43082 ([#6815](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6815)) ([0673e92](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0673e9273c24440b59c25c68617012e65b550356))
* Don't fail configure when reading `startUpOnOff` fails https://github.com/Koenkk/zigbee2mqtt/issues/20526 ([0de716c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0de716c31bd420f7e53682df21eb1e4a16735bbd))
* Expose `door_state` for Dataek 0402946 https://github.com/Koenkk/zigbee-herdsman-converters/issues/6820 ([72804c1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/72804c1aeda64b98fee0f4e84e0ebccbab97fae1))
* Expose `week` for TuYa TS0601_thermostat https://github.com/nurikk/zigbee2mqtt-frontend/pull/1851 ([55389d5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/55389d5b680de4384fd6bf01a3fd7e36aa7f06e1))
* Fix `preset` and `system_mode` not settable for TuYa TS0601_thermostat_1 and TRV602 ([#6819](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6819)) ([807c248](https://github.com/Koenkk/zigbee-herdsman-converters/commit/807c248b599563ab86651c5e2a82886cc419db62))
* Fix `Value '2' is not allowed` for TuYa TV02-Zigbee https://github.com/Koenkk/zigbee2mqtt/issues/20486 ([9fee202](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9fee202e9aa729ac51b5628734f213dfb4682ade))
* Fix `week` missing for HKGK BAC-002-ALZB https://github.com/nurikk/zigbee2mqtt-frontend/pull/1851 ([e89fbef](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e89fbefb6b23e0d7687521547dc20aff0bf00067))
* Fix definition generator crashing startup https://github.com/Koenkk/zigbee2mqtt/issues/20528 ([f2b5c3c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f2b5c3cfc6c80b7cc75d0729dd8ff15f529602d8))
* Fix IKEA E1743 battery % divided by 2 https://github.com/Koenkk/zigbee-herdsman-converters/commit/597599e7e41d3b882ca01e9834b4e2a5acba2d2d ([dfc62f1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dfc62f1c843dd1ecdf6e3309c2fc1b44222d6f5c))
* Fix invalid power 0 for TS011F_plug_1 https://github.com/Koenkk/zigbee2mqtt/issues/20493 ([61c6a96](https://github.com/Koenkk/zigbee-herdsman-converters/commit/61c6a96dfb615baee39d2f2ea8a3ab6499d89e8a))
* Fix no electrical measurements for MakeGood MG-AUZG01 https://github.com/Koenkk/zigbee2mqtt/issues/20531 ([82afaaf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/82afaafe198fbf4477b7bb4d008f77d1dbab086e))
* Fix no value when calibration/precision option is invalid https://github.com/Koenkk/zigbee2mqtt/issues/20493 ([9c7f6dd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9c7f6dd30a1e96b238584ac0e66339da9b5fafa3))
* **ignore:** `powerOnBehaviour` -&gt; `powerOnBehavior` https://github.com/Koenkk/zigbee-herdsman-converters/pull/6815 ([eef38b0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/eef38b0c159d5ce052ca0dc4f1f26b32f649ae58))
* **ignore:** fix 0673e9273c24440b59c25c68617012e65b550356 ([6fd241f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6fd241fb4bbac24620de7b887368d8fd161a6a28))
* **ignore:** fix 72804c1 ([f01e0f4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f01e0f40bd7363c06726929a4c3e501415ba0f7c))
* **ignore:** fix lint ([779c652](https://github.com/Koenkk/zigbee-herdsman-converters/commit/779c652f666aed6c8afa41b2b27b8bf7645cffa9))
* **ignore:** improve message of 0de716c ([91bad76](https://github.com/Koenkk/zigbee-herdsman-converters/commit/91bad76ae9f8af8ce50e48716c3c568a5eb6bff6))

## [18.4.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.3.0...v18.4.0) (2024-01-02)


### Features

* Adapt exposes according to covering type for Ubisys J1 ([#6809](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6809)) ([d2993ee](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d2993ee036f98144adaf5ea36c9e2da28e79c920))
* **add:** 4512752/4512753 ([#6811](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6811)) ([9f28f8f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9f28f8fdc0f20998ec717b1da1f5dc7f680d75de))
* Expose `keypad_lockout` for Schneider Electric WV704R0A0902 ([#6807](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6807)) ([ee056c7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ee056c7d8dd9ba19887e24f1d075e793f63bfc4a))


### Bug Fixes

* **detect:** Detect `_TZ3000_ssp0maqm` as TuYa TS0215A_sos https://github.com/Koenkk/zigbee2mqtt/discussions/20496 ([57e427e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/57e427e2b2d4dc113c15698a039b8deb3dabc54b))
* Disable powerOnBehavior for RM3500ZB ([#6814](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6814)) ([c8db692](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c8db692e00aef02ca91a0e338164d06207264dcc))
* Disable unsupported `power_on_behavior` for TS0003 https://github.com/Koenkk/zigbee2mqtt/issues/20354 ([a23709b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a23709b2e1072b66dd45db67c491ccf02b17e6da))
* Disable unsupported `power_on_behaviour` for Ksentry KS-SM001 https://github.com/Koenkk/zigbee2mqtt/issues/20515 ([2fa71de](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2fa71de9f11e7251db9b853e75e14a340005b9e4))
* Fix `Cannot set properties of undefined (setting 'power')}` for TuYa TS011F_plug_1 https://github.com/Koenkk/zigbee2mqtt/issues/16709 ([30722e4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/30722e41aca92d23154cc8f9610fe5fbc1d112cc))
* Fix `Error: Cluster 'liXeePrivate' has no attribute 'relaisX'` https://github.com/Koenkk/zigbee2mqtt/issues/20492 ([6f232dd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6f232dd7d0fbc62e48c0c3ab6b784190a2d08f22))
* Fix Bosch BMCT-SLZ configure failing ([#6806](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6806)) ([4968ced](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4968ced60aecf4633fa68dc164c78d752a101f13))
* Fix color not supported for Xiaomi LGYCDD01LM ([#6812](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6812)) ([ab0a776](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ab0a77682e1fdd04b8cfdcd59b2b01de3aed1d54))
* Fix color temperature not supported for Ltech TY-75-24-G2Z2_CCT https://github.com/Koenkk/zigbee2mqtt/issues/17953 ([1c88a37](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1c88a37fc06ff27be9205e1dda925c87c49c3d25))
* Fix configure failing for eWeLink ZB-SW01 https://github.com/Koenkk/zigbee2mqtt/issues/20483 ([5d1d217](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5d1d217ebaa21b00035bff1966280624302fbf63))
* Fix Hue firework effect ([#6802](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6802)) ([8282949](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8282949d9113ea14d35eeebe7beba7f1663a22fd))
* Fix light turning off when setting color through HSV https://github.com/Koenkk/zigbee2mqtt/issues/20276 ([67cd975](https://github.com/Koenkk/zigbee-herdsman-converters/commit/67cd97504ece586fd10e857378877c50b8b950a5))
* Fix max setpoint for Hive UK7004240 https://github.com/Koenkk/zigbee2mqtt/issues/20331 ([ac7f50b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ac7f50b41073120f8b69606c9ac58fea6201ca6d))
* Fix no `action` for Xiaomi ZNQBKG25LM [@utegental](https://github.com/utegental) https://github.com/Koenkk/zigbee2mqtt/issues/20503 ([7979578](https://github.com/Koenkk/zigbee-herdsman-converters/commit/79795781289bd5b2a576b4e18cdfc1abfdf58264))
* **ignore:** fix ac7f50b ([b75df02](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b75df027ad75e9885985d4c2d8722d3fb96c06a4))
* Temperature expose unit https://github.com/Koenkk/zigbee-herdsman-converters/issues/6808 ([ecc31f6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ecc31f69d49fa270b48f50a5389aaba75463d8ac))

## [18.3.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.2.0...v18.3.0) (2024-01-01)


### Features

* **add:** 8719514434479 https://github.com/Koenkk/zigbee2mqtt/issues/20453 ([762460a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/762460abd2c42f462aabb933099c5e1b33e1665f))
* **add:** LDSENK01S ([#6800](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6800)) ([78e4abc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/78e4abc54ae437c68bc956e891c3c533d2bf5bb9))
* **add:** ZCM-1800 ([#6793](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6793)) ([6e7a912](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6e7a9124713ed417b2fd15e737f553d84f04c12b))
* Expose relais for LiXee ([#6791](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6791)) ([0413087](https://github.com/Koenkk/zigbee-herdsman-converters/commit/04130873bf4a6115e5937a0e6c0a4078a8e5540a))


### Bug Fixes

* **ignore:** update dependencies ([#6798](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6798)) ([1ec95a3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1ec95a3c898e426093419e1fd527b0681784955f))
* Several fixes for Bosch BMCT-SLZ Light/Roller Shutter Switch ([#6785](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6785)) ([caddaab](https://github.com/Koenkk/zigbee-herdsman-converters/commit/caddaab299888c38bf2d3f7127f42c5e26baf51d))

## [18.2.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.1.0...v18.2.0) (2023-12-30)


### Features

* **add:** 4512762 ([#6794](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6794)) ([e3271b4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e3271b4dcb7e3c253b174a915d492f9671cf452f))
* **add:** NSPanelP-Router https://github.com/Koenkk/zigbee2mqtt/issues/19721 ([1c6a720](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1c6a720f5d8132d619ce3d73ebdafc0067261806))


### Bug Fixes

* **detect:** Detect `_TZE204_nlrfgpny` as Neo NAS-AB06B2 ([#6792](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6792)) ([1b578ea](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1b578eab93a79b9c74881b0d488127c260172e8f))
* **detect:** Detect `929003479601` as Philips 915005987701 ([#6790](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6790)) ([bec9cad](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bec9cad6eaec95e173cbb437734ff09a0f24beae))
* Fix Schneider Electric WV704R0A0902 `occupied_heating_setpoint` min and step size ([#6797](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6797)) ([925865d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/925865db2ef7e162811777f4f1ef59122ab82c8b))
* **ignore:** fix 88cb63243947360c57d0999f08573014398fdb1f ([3b36bc7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3b36bc7b5e6dbbd795821ac1301e812a130a65e6))
* **ignore:** Revert 5f511d3 https://github.com/Koenkk/zigbee-herdsman-converters/pull/6731 ([88cb632](https://github.com/Koenkk/zigbee-herdsman-converters/commit/88cb63243947360c57d0999f08573014398fdb1f))
* Improve a5a837e https://github.com/Koenkk/zigbee2mqtt/issues/20431 ([63a738d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/63a738d34bfeb920f2af798170f8879287b5f757))
* Remove unsupported `power_on_behaviour` for Sunricher ZG9101SAC-HP-Switch ([#6796](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6796)) ([50adc01](https://github.com/Koenkk/zigbee-herdsman-converters/commit/50adc0122937011b6ca475ebd6e3a09623f0ca2a))
* Rename `BSD29` to `BSD29/BSD59` https://github.com/Koenkk/zigbee2mqtt/issues/20431 ([a5a837e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a5a837e63d8204528f6a8f35e108db8d4a01ec0a))

## [18.1.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.0.2...v18.1.0) (2023-12-29)


### Features

* **add:** YRM476 https://github.com/Koenkk/zigbee2mqtt/issues/20383 ([4013a89](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4013a898a980e6b22a2db0ae0248cbbf84433268))


### Bug Fixes

* **detect:** Detect `_TZ3000_lmlsduws` as TuYa TS0002_switch_module [@asfyra](https://github.com/asfyra) https://github.com/Koenkk/zigbee2mqtt/issues/19670 ([c3555af](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c3555af2c37c8b1c142c23d8b287abc0f13bdb99))
* **detect:** Detect `_TZ3000_pvlvoxvt` as TuYa TS011F_2_gang_2_usb_wall ([#6781](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6781)) ([b819271](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b8192713b4c0cc1c2a50191cf4a8b3c04fd2ddec))
* **detect:** Detect `_TZE204_yojqa8xn` as TuYa TS0601_gas_sensor_2 ([#6783](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6783)) ([7de9f08](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7de9f08996d1874f33ccf72782d6c7505c7e7f3d))
* **detect:** Detect `TRADFRI bulb E26 WW globe 800lm` as IKEA LED2103G5 https://github.com/Koenkk/zigbee2mqtt/issues/20400 ([29dbbfb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/29dbbfbd8e1dce93005cc6e62774d6e6cc37da09))
* Disable unsupported `power_on_behavior` for various Dawon DNS devices ([#6784](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6784)) ([d3632de](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d3632de52891e06aaf7720f2a10ae58f51a261a7))
* Fix IKEA E1743 battery percentage multiplied by two https://github.com/Koenkk/zigbee2mqtt/issues/20299 ([597599e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/597599e7e41d3b882ca01e9834b4e2a5acba2d2d))
* **ignore:** more fixes for b27dced8a30875494a4beaa41cceb3bdef7e74f2 ([00d8e75](https://github.com/Koenkk/zigbee-herdsman-converters/commit/00d8e75973a440da369f5da81bfca33e398221a2))

## [18.0.2](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.0.1...v18.0.2) (2023-12-27)


### Bug Fixes

* **ignore:** Revert module to commonjs ([411a92a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/411a92aed1b72a356d3445ad4c708c1df4b6e622))

## [18.0.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v18.0.0...v18.0.1) (2023-12-27)


### Bug Fixes

* Fix TuYa BLE-YL01 values not updating https://github.com/Koenkk/zigbee2mqtt/issues/18704 ([b4918d5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b4918d5028bb810e8bdd1375904d4c6356e7dc9a))
* **ignore:** fix b27dced8a30875494a4beaa41cceb3bdef7e74f2 ([5bb113c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5bb113c282739febf7f08ec8dca62c213b13c985))
* **ignore:** Fix unit of ShinaSystem GCM-300Z exposes ([#6776](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6776)) ([39b31cc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/39b31cc7f1fb95c7141be7e3e076a0bffaf6852c))
* **ignore:** Update precision option description ([7f5aa25](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7f5aa253985f6e95323486c792aab724bdca1139))
* **ignore:** Update tsconfig for Node 18 ([b27dced](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b27dced8a30875494a4beaa41cceb3bdef7e74f2))
* Update LED2103G5 description https://github.com/Koenkk/zigbee2mqtt/issues/20402 ([c23c72e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c23c72eec516b7855cf1a638b35784bc9a81571e))

## [18.0.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v17.1.1...v18.0.0) (2023-12-26)


### ⚠ BREAKING CHANGES

* Improve consistency of calibrate and precision round options ([#6769](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6769))

### Features

* Improve consistency of calibrate and precision round options ([#6769](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6769)) ([204ee90](https://github.com/Koenkk/zigbee-herdsman-converters/commit/204ee901a06953d43762f75b9973c0ab4c9cdc0d))


### Bug Fixes

* Fix power source/type for Xiaomi QBKG20LM https://github.com/Koenkk/zigbee2mqtt/issues/20384 ([340228b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/340228b79c44bbac22475bea298ef86039968395))
* Fix set upper/bottom limit expose for TuYa TS0601_cover_4 https://github.com/Koenkk/zigbee2mqtt/issues/19690 ([bb4a44f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bb4a44f46181cb561661e0de206edb3463571e7c))
* **ignore:** Fix configure for SONOFF BASICZBR3 failing ([4e5f3ec](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4e5f3ec6a016d67fcc637f772bbfde7e488253e1))
* Support OTA for TuYa TS110E_1gang_2 [@mrmaximas](https://github.com/mrmaximas) https://github.com/Koenkk/zigbee2mqtt/issues/18702 ([0ad15d9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0ad15d9f58a7d75e9611b9531401243dcc052f9d))

## [17.1.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v17.1.0...v17.1.1) (2023-12-26)


### Bug Fixes

* **ignore:** Export setDataDir ([961ee0b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/961ee0b079f68450f201e501e23395233f9efc32))

## [17.1.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v17.0.0...v17.1.0) (2023-12-26)


### Features

* **add:** TRV602 ([#6766](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6766)) ([c4dedf1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c4dedf14530cfe96159f4f7b2718d37c4ae1edfd))
* Expose `illuminance_lux` for IKEA E2134 ([#6770](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6770)) ([3b3f41b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3b3f41bd8ad7fd8f9e465a80857b471933096a57))
* Support battery and lock in definition generator https://github.com/Koenkk/zigbee2mqtt/issues/20383 ([d7f5dad](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d7f5dad746b682cd59bcdb7d8f3e239c53824eb5))
* Support JetHome OTA for WS7 ([#6575](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6575)) ([a768618](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a7686185f41f09471a7c5a1ef23c6d161da64058))

## [17.0.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.18.0...v17.0.0) (2023-12-25)


### ⚠ BREAKING CHANGES

* **ignore:** Extend definition generator ([#6760](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6760))

### Features

* **ignore:** Extend definition generator ([#6760](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6760)) ([12e159a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/12e159a64823dd899f4d0953a0782bb52f68da65))

## [16.18.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.17.0...v16.18.0) (2023-12-25)


### Features

* **ignore:** Prepare merging TuYa datapoints to modernExtend ([#6733](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6733)) ([8f9e954](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8f9e954506791a951d5789e41a9d06838b126da9))
* Improvements and fixes for Bosch BTH-RA ([#6761](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6761)) ([47412c4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/47412c46cd83d019ed23f679fdeb852abadbcfc6))


### Bug Fixes

* **detect:** Detect `_TZ3210_ngqk6jia` as Lonsonho QS-Zigbee-D02-TRIAC-LN_1 https://github.com/Koenkk/zigbee2mqtt/issues/20361 ([53fe338](https://github.com/Koenkk/zigbee-herdsman-converters/commit/53fe338ac097f2a02961b9f2765dc639da750aad))
* **detect:** Detect `_TZE200_ijey4q29` as TuYa ZG-102ZL ([#6767](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6767)) ([387deaa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/387deaac511c07cb08da88ffbbed0bafb8efcd32))
* Fix colour glitches for Lidl HG06467  ([#6765](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6765)) ([0a382df](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0a382dffcee0e1513c2d0a5aa4f1320ae25b3847))
* **ignore:** update dependencies ([#6763](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6763)) ([3b8c681](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3b8c6819ef037872f9e1a73cf502616f97cca8fb))

## [16.17.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.16.0...v16.17.0) (2023-12-23)


### Features

* **add:** 929003575501 ([#6758](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6758)) ([08e1f8d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/08e1f8d6ffad7abc991805c957675b92cead8e66))


### Bug Fixes

* Fix `Value '2' is not allowed` error for TuYa TV02-Zigbee https://github.com/Koenkk/zigbee-herdsman-converters/issues/6755 ([1757241](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1757241e8ea3b557c22aa45746a5f7a5278a61f3))
* Fix Ubisys H10 vacation_mode after firmware upgrade ([#6754](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6754)) ([cd26e33](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cd26e33826bb5e29e01f571e48cd467e1b40014c))

## [16.16.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.15.1...v16.16.0) (2023-12-22)


### Features

* Generate definition for unsupported devices (disabled for now) ([#6692](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6692)) ([3468c09](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3468c097176b1eb98ecf471050ed14cf987da30d))
* Support more actions for Philips 8719514440937/8719514440999 https://github.com/Koenkk/zigbee2mqtt/issues/20321 ([f7c316d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f7c316d79fb9f0c789faa9e82bf6b28d2b4a24f0))


### Bug Fixes

* Change max `occupied_heating_setpoint_scheduled` for Danfoss 014G2461 to 32 https://github.com/Koenkk/zigbee2mqtt/issues/20331 ([c714ce2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c714ce25c4fe9c9baa6e2cb3aa8d55889fdcdc79))
* **detect:** Detect `eTRV0103` as Danfoss 014G2461 https://github.com/Koenkk/zigbee2mqtt/discussions/20339 ([baf2bff](https://github.com/Koenkk/zigbee-herdsman-converters/commit/baf2bffb7a8e3ed45ffb0abfd5472b48b9dcd063))
* Fix Innr SP 242 losing reporting configuration on power-cycle https://github.com/Koenkk/zigbee-herdsman-converters/issues/6747 ([9e34323](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9e34323d8071d1fb87939c1acda1663c2fed1229))
* Fix Iris 3460-L battery and action reporting ([#6750](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6750)) ([6a36902](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6a36902673bc99da076ad80fce1fe20dd3f942ad))
* **ignore:** fix e92a9ef4ba241d572651c462793df4a18c15f2bf ([65cd37f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/65cd37f3025fd166d41e028ce3b64d90682bf005))
* **ignore:** Fix modernExtend color/color temp read https://github.com/Koenkk/zigbee2mqtt/issues/20306 ([473b9c0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/473b9c03e99fdc73d04dcfbaf5f14369e666a399))

## [16.15.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.15.0...v16.15.1) (2023-12-21)


### Bug Fixes

* **detect:** Detect `_TZ3000_ljhbw1c9` as TuYa TS0012_switch_module https://github.com/Koenkk/zigbee2mqtt/issues/20162 ([e92a9ef](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e92a9ef4ba241d572651c462793df4a18c15f2bf))
* Fix mcuVersionRequest log for Zemismart ZM25RX-08/30 ([#6748](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6748)) ([095ef2b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/095ef2bd1428327a9b3508360d90cf9716704234))
* **ignore:** fix 7a2898b5aa37a740a62cb0189d4ebc0d8a76a6e9 ([dc6db4b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dc6db4b3f991d3d8754d8dd2e0f41ebe593d3f02))
* **ignore:** fix 7a2898b5aa37a740a62cb0189d4ebc0d8a76a6e9 ([fa36136](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fa36136ef04831aa8c529493925cb49816665775))
* **ignore:** Hue lights don't support hue/saturation https://github.com/Koenkk/zigbee2mqtt/issues/20306 ([7a2898b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7a2898b5aa37a740a62cb0189d4ebc0d8a76a6e9))

## [16.15.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.14.1...v16.15.0) (2023-12-20)


### Features

* **add:** GCM-300Z ([#6738](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6738)) ([aca4d58](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aca4d58926f2f22f372a4463307919690e9df4cf))
* Expose energy for Xiaomi QBKG26LM and QBKG24LM ([#6719](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6719)) ([9210a86](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9210a86cfa736b2995d5419a82ed8be74b74a071))
* Support `power_on_behavoir` for LELLKI WP33-EU/WP34-EU https://github.com/Koenkk/zigbee2mqtt/issues/20172 ([f6aaa87](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f6aaa87eef54dd362dba81513b0d1bde058c8627))


### Bug Fixes

* Fix for Bosch BTH-RA (radiator thermostat II) inability for the heating algorithm to learn when using remote temp ([#6742](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6742)) ([d91e2f3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d91e2f3b5f602487357fc9414740365c496866dc))
* Fix Paulmann 291.52 color temp range ([#6744](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6744)) ([4bcb369](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4bcb36973acfa1379f1f3e7faa90db50b6db3bb0))
* **ignore:** Small refactor to modernExtend reporting config ([#6746](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6746)) ([61f448d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/61f448d01a2bbbe9cb95fd54d194b293fd78c103))
* Xiaomi VOCKQJK11LM Improvements and modernExtend conversion ([#6739](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6739)) ([d33480e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d33480e93e20cd898d7b88048f8e1f66c9b8baeb))

## [16.14.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.14.0...v16.14.1) (2023-12-19)


### Bug Fixes

* **ignore:** fix dbada8607da74712b833a99b3c2e5e395b414f1c ([44c9793](https://github.com/Koenkk/zigbee-herdsman-converters/commit/44c9793c60d7e3266a498a2a5c22ca36ee8de298))

## [16.14.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.13.0...v16.14.0) (2023-12-19)


### Features

* **add:** ZG-102Z ([#6737](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6737)) ([b10de65](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b10de65a6b757670b3a669f89ade26350fcb98c9))
* **add:** ZWSM16-2-Zigbee, ZWSM16-3-Zigbee, ZWSM16-4-Zigbee ([#6734](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6734)) ([54690b8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/54690b8f15235a94cc6d81799c9d31a01dbdd13d))
* **ignore:** Refactor Tradfri lights to modernExtend ([#6735](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6735)) ([5791ad6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5791ad68fa7bf3c9d1d7e50e34a1f458a7e97085))


### Bug Fixes

* **ignore:** fix 60e31d454dc5f3f56ae3c7c0c33518d96eb27267 ([db923c5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/db923c56efdee1185c5cf724e25d41280bb45fb5))
* **ignore:** fix for TS011F_plug_1 configure https://github.com/Koenkk/zigbee2mqtt/issues/19977 ([9100fd8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9100fd835fa424c990a972675ad2972eed979edf))
* Improve reporting configuration for Sinope RM3500ZB ([#6727](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6727)) ([dbada86](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dbada8607da74712b833a99b3c2e5e395b414f1c))

## [16.13.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.12.0...v16.13.0) (2023-12-18)


### Features

* **add:** 915005914601 @GizzGool https://github.com/Koenkk/zigbee2mqtt.io/pull/2409 ([e256a9f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e256a9fe632bfe3367dbee2456fcafd0fac4ce51))
* Improvements for Xiaomi VOCKQJK11LM ([#6723](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6723)) ([9a0a56a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9a0a56a1d2602bd1e3f555472820df62fb36b288))
* Support new features for various SONOFF devices ([#6710](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6710)) ([03e0703](https://github.com/Koenkk/zigbee-herdsman-converters/commit/03e070307ec6915eb26c0d3f25d56ed19a40fcbd))
* Support new features for Yale ZYA-C4-MOD-S ([#6713](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6713)) ([b677679](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b677679a65fdb225b8f3e05d32dfa0186a97e153))


### Bug Fixes

* Detect all TuYa TS0210 as supported https://github.com/Koenkk/zigbee2mqtt/issues/20272 ([81e3af5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/81e3af5f91acab0fab15b1d533c39e59c91fa180))
* Fix electrical measurements not working for TuYa plug with appVersion 112 ([#6731](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6731)) ([3554e43](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3554e4391367e9519b659039fd66c724f6e41f02))
* Set `power` to `0` when `current` is `0` for TuYa TS011F_plug_1 https://github.com/Koenkk/zigbee2mqtt/discussions/19680 ([60e31d4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/60e31d454dc5f3f56ae3c7c0c33518d96eb27267))

## [16.12.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.11.0...v16.12.0) (2023-12-17)


### Features

* **add:** SP 244 https://github.com/Koenkk/zigbee2mqtt/issues/20234 ([3873452](https://github.com/Koenkk/zigbee-herdsman-converters/commit/387345264b8fca263f41749d1ef874cce07697c3))
* Support electricity measurements for Samotech SM323 https://github.com/Koenkk/zigbee2mqtt/issues/19599 ([86f41ce](https://github.com/Koenkk/zigbee-herdsman-converters/commit/86f41ced96496189285422d7c51d3e3595ea5092))


### Bug Fixes

* **detect:** Detect `_TZ3000_iv6ph5tr` as KnockautX FMS2C017 https://github.com/Koenkk/zigbee2mqtt/issues/20156 ([0d34878](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0d34878a0f1f89435ca85a74f533e9b920102f26))
* **detect:** Detect `_TZE204_dvosyycn` as TuYa TS0601_switch_8 https://github.com/Koenkk/zigbee2mqtt/issues/19591 ([22da09c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/22da09cff07ac540e838f0ff871f68378f1ebde1))
* **detect:** Detect `_TZE204_fncxk3ob` as TuYa YXZBSL ([#6728](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6728)) ([40d04a8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/40d04a85e637f4bf5a1794ce2743919faf04fb07))
* **detect:** Detect `_TZE204_yjjdcqsq` as TuYa TS0601_temperature_humidity_sensor_2 https://github.com/Koenkk/zigbee2mqtt/issues/20235 ([95398b5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/95398b53a6af0526906c5f4d9ee50bbc9056d688))
* **detect:** Detect `YRD430 PB` as Yale YRD430-BLE ([#6722](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6722)) ([2587bd4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2587bd4b9caea51c34e04aff7e4e5f5eae52ec0a))
* Fix `get_list` for HEIMAN HS2IRC https://github.com/Koenkk/zigbee2mqtt/issues/20250 ([348937e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/348937e4e4fa8b461ca2dad54ad748ff749a2baf))
* **ignore:** improve 27e6d1e74c7a06e05568bcb45d486fee8fc7a11f ([8333048](https://github.com/Koenkk/zigbee-herdsman-converters/commit/83330486b73d23d71c539c4e6a6185d9f1758fdf))
* **ignore:** update dependencies ([#6725](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6725)) ([0443e71](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0443e7129cebb1a87177b2d3ecad27353343cdc5))
* Improve reporting for TuYa TS011F_plug_1 https://github.com/Koenkk/zigbee2mqtt/issues/19977 ([5f511d3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5f511d34cc1f28d3a8690639b87fbaa47bb791f4))
* Remove unsused attribute reading from Lytko L101Z-SLN ([#6730](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6730)) ([c3dfae6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c3dfae6d4c08c2fb0f22924de58d9b954d19f28d))

## [16.11.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.10.0...v16.11.0) (2023-12-16)


### Features

* **add:** 4509243 ([#6717](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6717)) ([f143c7f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f143c7f84a737f620ebe2afec948c08b0191f33f))


### Bug Fixes

* Add color temp range for Philips 5061031P7 ([#6718](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6718)) ([1bbbb5d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1bbbb5d74b14a9cfcd4435c45a9efc31ff6aa60d))
* Configure reporting for HeatIt 1444420 ([#6716](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6716)) ([69bd6a6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/69bd6a6f133131857ba3b779da4ab40548a50fe5))
* **detect:** Detect `_TZE200_vvmbj46n` as TuYa TH05Z ([#6705](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6705)) ([11ddeb5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/11ddeb54a3c9f52c2bd0e2480ffbc292b3e46793))
* **ignore:** fix 172a386bdfced76f9d965262b04f9d52fc67c56d ([75e57b8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/75e57b8397b4f6915094391fa2ed49018580ad5f))
* Set power to 0 when `TS011F_plug_1` changes state to `OFF` https://github.com/Koenkk/zigbee2mqtt/discussions/19680 ([27e6d1e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/27e6d1e74c7a06e05568bcb45d486fee8fc7a11f))

## [16.10.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.9.0...v16.10.0) (2023-12-15)


### Features

* **add:** 1740393P0 ([#6714](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6714)) ([0740d10](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0740d10d0ff31ef26bc656d52c749cb0517eed09))
* **add:** 70552 ([#6708](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6708)) ([743c649](https://github.com/Koenkk/zigbee-herdsman-converters/commit/743c6494b9b232b2f0214ec9e2b5ccd009dbc61c))
* **add:** SP 242 ([#6703](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6703)) ([02ae4a2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/02ae4a2415f79d8e2b5c7a66dc15c29abf654368))
* **add:** SPM01V2, SPM02V2 ([#6702](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6702)) ([adaa308](https://github.com/Koenkk/zigbee-herdsman-converters/commit/adaa308664c7e25faa33b3d781ab1d8b80eedb58))
* **add:** SZR07U ([#6712](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6712)) ([05485ec](https://github.com/Koenkk/zigbee-herdsman-converters/commit/05485eca99e9a7835ba37f26bd48077706682895))


### Bug Fixes

* **detect:** Detect `_TZ3000_0dumfk2z` as TuYa TS0215A_sos ([#6707](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6707)) ([796380a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/796380ade9d4d4c56b39fe2815c4d733807c520d))
* **detect:** Detect `_TZE200_la2c2uo9` as Moes MS-105Z ([#6706](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6706)) ([f04a7a7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f04a7a717053dab94f3efb7bc0866460944f0e1a))
* **detect:** Detect `_TZE200_tsxpl0d0` as KnockautX FMD2C018 https://github.com/Koenkk/zigbee2mqtt/issues/20153 ([9627644](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9627644c9145ad5c557891f37652552868983672))
* **detect:** Detect `929003621001_0X` as Philips 5061031P7 [@wbsantos](https://github.com/wbsantos) https://github.com/Koenkk/zigbee2mqtt/issues/20215 ([a7775f4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a7775f4ff8c4b9b0a1e8998c05447a3e624e1bd2))
* Fix duplicate `action` being published under rare circumstances https://github.com/Koenkk/zigbee2mqtt/issues/20024 ([172a386](https://github.com/Koenkk/zigbee-herdsman-converters/commit/172a386bdfced76f9d965262b04f9d52fc67c56d))
* Fix state not controllable for Namron 4512767 ([#6700](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6700)) ([cbcdda3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cbcdda34498b96874379a532ab125bd902b528d0))
* Fix TuYa `_TZ3210_jd3z4yig` and `_TZ3210_r5afgmkl` https://github.com/Koenkk/zigbee2mqtt/issues/20217 ([ad20e9f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ad20e9f5db9fc3d8bf15fe4ee4c2899301f30752))
* Fixes missing energy reporting and incorrect current multiplier for TuYa `_TZ3000_okaz9tjs` and `_TZ3000_typdpbpg` ([#6701](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6701)) ([3f27f0e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3f27f0e9d08947d9872f93eeb2184b87b79cb5ed))
* **ignore:** fix getAxios() in ota.common: Add support for HTTP 302 redirects, when no hostname in Location header ([#6711](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6711)) ([944e941](https://github.com/Koenkk/zigbee-herdsman-converters/commit/944e9416ef1e99ca5ac4bb454e749b01570ec4e0))

## [16.9.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.8.0...v16.9.0) (2023-12-13)


### Features

* **add:** 404127 ([#6697](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6697)) ([8b88029](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8b88029b3a2ab14653f7d04d65ef40261d79c6d3))
* **add:** ROB_200-024-0 ([#6686](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6686)) ([0067ea3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0067ea382f9cba82327c32a17fa7fea73e840b6c))
* Support OTA for SONOFF TRVZB ([#6681](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6681)) ([9316a5e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9316a5e8b6e2067fbd867898646e800de8608734))


### Bug Fixes

* **detect:** Detect `_TZB210_rwy5hexp` as MiBoxer FUT106ZR https://github.com/Koenkk/zigbee2mqtt/discussions/19431 ([a59d7c3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a59d7c33f5272fb54f9a68d30cba9d0d17ed749c))
* **detect:** Detect `c8daea86aa9c415aa524365775b1218c` and `c8daea86aa9c415aa524365775b1218` as ORVIBO W40CZ ([#6696](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6696)) ([c14c895](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c14c8951e35ab195ce8cc2e5c5978cdd0b95153e))
* Fix `'Error: Expected one of: true, false, got: 'true''` errors https://github.com/Koenkk/zigbee2mqtt/issues/20196 ([8ddba37](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8ddba37851dba80fe0afd9f40e9e8fdb95873058))
* Fix `Cannot read properties of undefined` for Schneider Electric A9MEM1570 https://github.com/Koenkk/zigbee2mqtt/issues/20193 ([9513f4b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9513f4b638b15b6bbff5f58dafc5f3c80dd8bc07))
* Fix `hcho` value for HEIMAN HS2AQ-EM ([#6699](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6699)) ([ab11b8a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ab11b8a796bab2620e233e5a7a0b92506c6d6639))
* Fix configure for eWeLink SA-003-Zigbee failing https://github.com/Koenkk/zigbee2mqtt/issues/19865 ([b403cc0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b403cc032f5ad5b4073690b57ac58b4419254e52))
* Fix no electrical measurements for Immax 07752L https://github.com/Koenkk/zigbee2mqtt/issues/18326 ([4210477](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4210477e8897bf87059cc577a7a30fe52f86e94c))

## [16.8.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.7.0...v16.8.0) (2023-12-12)


### Features

* **add:** 300-9715V10 ([#6690](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6690)) ([bc43504](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bc4350418f394a94dfeb88d06e4affd63d5c807b))
* **add:** L2208 ([#6687](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6687)) ([ce757a3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ce757a3d7e03caa540951df99206cc27ac601fa8))


### Bug Fixes

* Disable unsupported `power_on_behaviour` for LELLKI WP33-EU/WP34-EU https://github.com/Koenkk/zigbee2mqtt/issues/20172 ([7d9b710](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7d9b710f78ff187002e7745933443ae93583488c))
* Fix device type for Xiaomi SP-EUC01 https://github.com/Koenkk/zigbee2mqtt/issues/20184 ([e18d637](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e18d637ea92c02fd4ce5c859c117f154ffa7aa98))
* **ignore:** fix e18d637ea92c02fd4ce5c859c117f154ffa7aa98 ([e237b3c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e237b3c90272be7bfe106aca2da1a45e31b48e93))
* Remove unsupported color for Philips 8719514491106 https://github.com/Koenkk/zigbee2mqtt/issues/20168 ([d0d67cc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d0d67ccc86fac7187cb114ef6ec428e417c4fdc9))

## [16.7.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.6.0...v16.7.0) (2023-12-11)


### Features

* **add:** 8719514434530 https://github.com/Koenkk/zigbee2mqtt/issues/20146 ([f16bc06](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f16bc0686f8820a49208d0c3c8186b3e4675ea59))
* **add:** SDO-4-1-20 ([#6661](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6661)) ([1be12da](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1be12da7f1fe451a78475847edbb1de6d7504576))
* Support color for Philips 929003598001 ([#6683](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6683)) ([a97f268](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a97f268bf40224d77c518bd9338ec50408cf8534))


### Bug Fixes

* **detect:** Detect `_TZ3000_helyqdvs` as TuYa TS011F_2_gang_wall @Testmangh https://github.com/Koenkk/zigbee2mqtt/issues/20147 ([54443b5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/54443b5a5f481739d53b0106b92bcbb3b1a5ec11))
* **detect:** Detect `_TZ3000_kpatq5pq` as AVATTO LZWSM16-2 https://github.com/Koenkk/zigbee2mqtt/issues/20162 ([071c09d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/071c09dcb3e67b1caf470226c53dfb260b09f6b7))
* **detect:** Detect `_TZ3000_sznawwyw` as AVATTO LZWSM16-3 https://github.com/Koenkk/zigbee2mqtt/issues/20162 ([5d37110](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5d37110eaf661355e129bfc5f50638d869113360))
* **detect:** Detect `_TZE204_x8fp01wi` as TuYa TS0601_3_phase_clamp_meter_relay @AkLim94 https://github.com/Koenkk/zigbee2mqtt/discussions/20155 ([64c18bf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/64c18bf408c62d77a86551bb0162224e95533bee))
* **detect:** Detect `WaterSensor2-EF-3.0` as HEIMAN HS1WL/HS3WL ([#6682](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6682)) ([e8d68e7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e8d68e73e7765a06150a55fa1f170e840a539a36))
* **ignore:** Enable powerOnBehaviour for Innr SP 240 https://github.com/Koenkk/zigbee-herdsman-converters/pull/6637 ([ed2ce0a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ed2ce0ae514927e064b4bf557d97985f860cb991))
* **ignore:** fix cc816f490e5c46cb5bf57db3e387eadd83dc5486 ([c7ee833](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c7ee83322f9cd4f5c83da7f042e2a5ae5468ec09))

## [16.6.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.5.0...v16.6.0) (2023-12-10)


### Features

* **add:** E2213 ([#6574](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6574)) ([abe682d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/abe682d1422276918ad069671c3ea6e134772994))
* **add:** SIN-4-1-21_EQU [@inoxas78](https://github.com/inoxas78)  https://github.com/Koenkk/zigbee2mqtt/issues/20137 ([dfe42be](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dfe42bede51a8a147ec58624b0f2ef16ddafee34))
* **add:** SP 240 ([#6637](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6637)) ([8eb43be](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8eb43be096eedcc322813987de3d6baf30c470ac))
* **ignore:** Refactor ledvance to modernExtend ([#6670](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6670)) ([c361f9b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c361f9bf65992f1feeb57a46a1cd8ab8ea8dbdf3))
* **ignore:** Refactor various lights to modernExtend ([#6676](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6676)) ([5fe7f66](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5fe7f6618a82877d89997650b5c7dca992ae47fc))
* **ignore:** Refactor various switches to modernExtend ([#6675](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6675)) ([5f33787](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5f3378765bdf1de5327a4859164fcee68dd0794e))
* **ignore:** Refactor various switches to modernExtend ([#6677](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6677)) ([26a724e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/26a724e36d063b63d8b40d988a45f30e5f999bc2))


### Bug Fixes

* Correct LiXee logging ([#6672](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6672)) ([5e2b0b2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5e2b0b2ddd604eb216c31a62ecd520de292c3839))
* **detect:** Detect `_TZE200_wktrysab` as TuYa WLS098-8GANAG https://github.com/Koenkk/zigbee2mqtt/issues/20136 ([3fdee2a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3fdee2a485861f4ab2b09bc3aded3d7012ee273f))
* **detect:** Detect `_TZE204_bkkmqmyo` as Hiking DDS238-2 ([#6678](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6678)) ([88140b9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/88140b91222c474da83e2ffc57380dc33742228d))
* Fix `current_heating_setpoint` step size for Moes BHT-002-GCLZB ([#6634](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6634)) ([634ca26](https://github.com/Koenkk/zigbee-herdsman-converters/commit/634ca26ee24409070dc923062f69fa327e884ce2))
* Fix duplicate events for IKEA Symfonisk remote ([#6679](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6679)) ([78ca7db](https://github.com/Koenkk/zigbee-herdsman-converters/commit/78ca7db77c838ca885e26f15c1eba661120e8a8f))
* Fix schedule expose for BAC-002-ALZB and TS0601_thermostat https://github.com/nurikk/zigbee2mqtt-frontend/pull/1851 ([4117881](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4117881927684ba15f908c2d2e6bf0532f54dbcc))
* **ignore:** fix 634ca26ee24409070dc923062f69fa327e884ce2 ([51f73d3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/51f73d31507ba87997fde9535bca8a3cbefc2f2a))
* **ignore:** update dependencies ([#6680](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6680)) ([412fe61](https://github.com/Koenkk/zigbee-herdsman-converters/commit/412fe613ef6e276237f819d23cfed44559d10c64))
* Use reporting instead of polling for TS011F_plug appVersion 66 https://github.com/Koenkk/zigbee2mqtt/issues/20110 ([d15371a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d15371a655092a4bb49dede1cb5cfbedc87ecae4))

## [16.5.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.4.0...v16.5.0) (2023-12-09)


### Features

* Support scene transition times with a resolution of 100ms instead of 1 second ([#6656](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6656)) ([cc816f4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cc816f490e5c46cb5bf57db3e387eadd83dc5486))


### Bug Fixes

* **detect:** Detect `_TZ3000_gntwytxo` as Moes ZSS-X-GWM-C ([#6662](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6662)) ([d069040](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d06904030c78c117afba575903fe8703b119a9d1))
* **detect:** Detect `_TZ3000_wpueorev` as TuYa ZN231392 https://github.com/Koenkk/zigbee2mqtt/issues/20111 ([0e9f8d4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0e9f8d4d8fc3e50db2cbe2905c29045061d355a2))
* **detect:** Detect `_TZ3290_xjpbcxn92aaxvmlz` as Moes UFO-R11 https://github.com/Koenkk/zigbee-herdsman-converters/issues/6663 ([2ed78c4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2ed78c43f3c1894d8c837fd5cc925616f7766ed7))
* Fixes for MCCGQ13LM, E2007 and TuYa typos ([#6666](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6666)) ([5ba0dcd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5ba0dcd7444c05e123723abe40ddbac0e3a970c8))

## [16.4.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.3.1...v16.4.0) (2023-12-09)


### Features

* **ignore:** Refactor various Philips devices to modernExtend ([#6668](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6668)) ([269889b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/269889bc09dd4e029f93702b80da5cb500bf6b8a))


### Bug Fixes

* **ignore:** fix eacd234c9ea2b7b69e261bcdaeeef3e473ff08a6 ([340417a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/340417a57f5a97550773407e80ca914a17582f78))
* **ignore:** update dependencies ([#6669](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6669)) ([238ca89](https://github.com/Koenkk/zigbee-herdsman-converters/commit/238ca89f2008777536d76569c53ac19527766719))

## [16.3.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.3.0...v16.3.1) (2023-12-08)


### Bug Fixes

* **ignore:** Revert "fix(ignore): Refactor Philips lights to modernExtend ([#6659](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6659))" ([57d6204](https://github.com/Koenkk/zigbee-herdsman-converters/commit/57d62041e7ea742d3aa2bffdc3c35e0b9c55274f))

## [16.3.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.2.0...v16.3.0) (2023-12-08)


### Features

* **add:** TS0601_switch_8_2 ([#6545](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6545)) ([3b6eb9c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3b6eb9cae777ceb0bd074278cbdc8f843b8d94b0))


### Bug Fixes

* **detect:** Detect `_TZ3000_kstbkt6a` as Aubess IH-K665 https://github.com/Koenkk/zigbee2mqtt/issues/20106 ([23fa0a2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/23fa0a24cc8304b75a26b5bbfea656c0b9a7f5a4))
* **detect:** Detect `_TZE200_na98lvjp` as Ltech TY-75-24-G2Z2 https://github.com/Koenkk/zigbee2mqtt/issues/20066 ([aab51b9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aab51b9ecbe1e7ab4730c3aa6f4854b8127d3511))
* **ignore:** fix 4cd4877732c0204800ebf5b230bb064ea28e3fea ([#6654](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6654)) ([19477ff](https://github.com/Koenkk/zigbee-herdsman-converters/commit/19477ffcf7c3ba01dbd902735a60361e0dfb1bd2))
* **ignore:** fix aab51b9ecbe1e7ab4730c3aa6f4854b8127d3511 ([8c19f36](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8c19f36a3983582b7eef156cb86e043b7035689f))
* **ignore:** Improve fromZigbee ignore converters and modernExtend.test ([aa7be01](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aa7be0191ffca5642de81358834a02ba131b52d3))
* **ignore:** Refactor Philips lights to modernExtend ([#6659](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6659)) ([84dece2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/84dece2bbe1103d69f0a3721e1ca00e0b1b85c72))

## [16.2.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.1.0...v16.2.0) (2023-12-07)


### Features

* **add:** BHI-US ([#6651](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6651)) ([7adcbfc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7adcbfc1b8f537231c325d01bb09fed005473425))
* **add:** E2013 ([#6632](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6632)) ([1a80e65](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1a80e654fe99275ef46b6f292f90dc7c28a8f197))
* Adds calibration offsets for tilt on Xiaomi DJT11LM sensor ([#6622](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6622)) ([36c8c4a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/36c8c4ac41f4ee243bc50299f04bcb77f8073e4b))
* **add:** S60ZBTPF, S60ZBTPG ([#6624](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6624)) ([a74bdb8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a74bdb8d289344daa285e8316d1deac9952bcd4a))
* **add:** SR-ZG9101SAC-HP-SWITCH-2CH ([#6623](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6623)) ([ddf7dcf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ddf7dcf5e3065abc565c6f01d71c4184f5d42223))
* **add:** ZWT07 ([#6645](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6645)) ([52c2d2b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/52c2d2bad2e78af6610f201054e9469c39e050eb))
* Extend temperature range for IKEA LED1923R5/LED1925G6 to 153-500 mireds ([#6642](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6642)) ([934bbc9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/934bbc95613314dacb3ecad6a84660ff06ceb945))
* **ignore:** Refactor lights to modernExtend ([#6653](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6653)) ([eacd234](https://github.com/Koenkk/zigbee-herdsman-converters/commit/eacd234c9ea2b7b69e261bcdaeeef3e473ff08a6))
* Support `power_outage_memory` for Xiaomi WS-USC01 [@caryyu0306](https://github.com/caryyu0306) https://github.com/Koenkk/zigbee2mqtt/issues/19884 ([3b07bf1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3b07bf1d7b87491a3275163cc6acc71c40a17dab))
* Support more system modes for HKGK BAC-002-ALZB ([#6644](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6644)) ([4cd4877](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4cd4877732c0204800ebf5b230bb064ea28e3fea))


### Bug Fixes

* Adjust Develco MOSZB-140 min occupancy timeout to 5 ([#6647](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6647)) ([b17c6e2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b17c6e20d5a2df71ce33024d6f7ecaf1b336b20f))
* **detect:** Detect `_TZ3000_8nyaanzb` as Makegood MG-AUZG01 @MnM001 ([2ab9cfd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2ab9cfd2a3673c4ad8dfbf597d234230ece743e5))
* **detect:** Detect `_TZ3000_cvis4qmw` as AVATTO TS0006_1 [@cmagno369](https://github.com/cmagno369) https://github.com/Koenkk/zigbee2mqtt/discussions/20014 ([6bc162e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6bc162e9b8ac0a856d86893fa30ed846d40f4bd6))
* **detect:** Detect `_TZ3000_iy2c3n6p` and `_TZ3000_rgpqqmbj` as MakeGood MG-AUZG01 https://github.com/Koenkk/zigbee2mqtt/issues/20032 ([cc56397](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cc563977dd2f78693833f7d450db3f7d463a9e72))
* **detect:** Detect `_TZ3000_zl1kmjqx` as TuYa RSH-HS06 ([#6649](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6649)) ([985e3a5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/985e3a543c6e387df20d2693aa143ca92b48dc62))
* **detect:** Detect `TRADFRI bulb GU10 WW 345lm` as IKEA LED2104R3 ([#6643](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6643)) ([237da65](https://github.com/Koenkk/zigbee-herdsman-converters/commit/237da6519ceae5276cb33172bab0d21ee65d82eb))
* **detect:** Detect `TRADFRI bulb GU10 WW 345lm` as LED2106R3 https://github.com/Koenkk/zigbee2mqtt/discussions/20046 ([66d28a4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/66d28a40e73920c05af1782cf86ee02fbdf12634))
* Fix `local_temperature` spikes for Moes BHT-002-GCLZB https://github.com/Koenkk/zigbee2mqtt/issues/20049 ([94cef5b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/94cef5b0c2f02d055d7a06c6f6e2f8f5b7a0ae84))
* Fix `operation_mode` not working for Xiaomi Opple https://github.com/Koenkk/zigbee2mqtt/issues/20053 ([0659817](https://github.com/Koenkk/zigbee-herdsman-converters/commit/06598174879e4e182ce730e8a9b6a67ab51ab73d))
* Fix `scene_store` for devices not working https://github.com/nurikk/zigbee2mqtt-frontend/issues/1853 ([01883b1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/01883b1a410250228f9c459e4569167c9fb2683b))
* Fix description for Xiaomi `ZNGZDJ16LM` ([#6636](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6636)) ([0272073](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0272073f3d1b26d299848cebaba8a6b180efe3fc))
* Fix dot actions not working for IKEA E2123 https://github.com/Koenkk/zigbee2mqtt/discussions/20003 ([8de3baa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8de3baaf4b42a4aae44641b5b72d8cb0e7d7d74c))
* Fix interlock for Aqara dual relay module T2 ([#6638](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6638)) ([1283468](https://github.com/Koenkk/zigbee-herdsman-converters/commit/128346812e951b9df0b92fb165e0597177ca510f))
* Fix setting `illuminance_threshold` for TuYa MTG075-ZB-RL ([#6652](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6652)) ([db78ea1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/db78ea11b8c722cb021d313ae0dee3ed05b9695a))
* **ignore:** fix 52c2d2bad2e78af6610f201054e9469c39e050eb ([38a693f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/38a693f978dbc443710d3b2614e043760913f4d8))
* Remove unsupported tamper for TuYa `_TZ3000_bpkijo14` ([#6650](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6650)) ([96c768a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/96c768ac0cb3631fc81d8ebb1c779677089f8345))
* Replace `battery_low` with `battery` for Xiaomi MCCGQ12LM ([#6646](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6646)) ([8eeccb3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8eeccb3ef53a03f94ee399c972abc0b912b66bf8))
* Set color temperature range for IKEA LED1624G9 ([#6640](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6640)) ([41a2c52](https://github.com/Koenkk/zigbee-herdsman-converters/commit/41a2c52973eb271d182d3e8820151b307df16624))

## [16.1.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.0.2...v16.1.0) (2023-12-05)


### Features

* **add:** 4512770 ([#6630](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6630)) ([29ea643](https://github.com/Koenkk/zigbee-herdsman-converters/commit/29ea6430780b5ba86a037b778a3a93016b1087d3))
* **add:** MHO-C401N ([#6627](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6627)) ([86047b9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/86047b9e43cb576af72769df1c13ae2dfb1efb1e))
* **add:** ZNGZDJ16LM [@rugal7699](https://github.com/rugal7699) https://github.com/Koenkk/zigbee2mqtt/issues/20031 ([ae895ef](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ae895ef7ac1ee16370df368ee4002f1e2e2ac592))
* Expose battery for LiXee ZiPulses ([#6626](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6626)) ([aa46fd7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aa46fd7a2c674743fae18a6243af2a511733b0cd))


### Bug Fixes

* **ignore:** another fix for scene_add https://github.com/Koenkk/zigbee2mqtt/issues/20001 ([b83c880](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b83c8801c984d0c5bf91461a9118622211bb165a))
* **ignore:** fix getFromLookup for value in multiple casing https://github.com/Koenkk/zigbee2mqtt/discussions/20003 ([b9fd416](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b9fd4168a9236edc97b4e5d6331ca1d78e038fde))

## [16.0.2](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.0.1...v16.0.2) (2023-12-04)


### Bug Fixes

* Add DCM-K01 as whitelabel of LLKZMK12LM ([#6620](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6620)) ([e23ac5e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e23ac5e416ef1fd05699e7aebd68323a66beaae2))
* **detect:** Detect `_TZE204_oqtpvx51` as TuYa YXZBRB58 ([#6619](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6619)) ([21b747e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/21b747e1651c91390db2ea855475a03735ce6552))
* Fix `scene_add` not working for groups https://github.com/Koenkk/zigbee2mqtt/issues/20001 ([dc6b1ae](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dc6b1ae0b69387abc52c4f2ef74fa7d16c82d1f1))
* **ignore:** fix dc6b1ae0b69387abc52c4f2ef74fa7d16c82d1f1 ([77cb2c8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/77cb2c8df711457fb4cd2a065ce64dd18174d5e1))

## [16.0.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v16.0.0...v16.0.1) (2023-12-04)


### Bug Fixes

* **ignore:** export types ([440a4d0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/440a4d0ad597335deda05d6453be70c20540e3b7))

## [16.0.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.132.0...v16.0.0) (2023-12-03)


### ⚠ BREAKING CHANGES

* **ignore:** Fix typing and remove legacy from index ([#6614](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6614))

### Features

* **ignore:** Fix typing and remove legacy from index ([#6614](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6614)) ([42d37a0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/42d37a09dc6bd80c62dbdc25b7423042cab99f92))

## [15.132.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.131.0...v15.132.0) (2023-12-03)


### Features

* **add:** 291.52 ([#6613](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6613)) ([9e8ca67](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9e8ca67a5ee5b7fb3fda959b46e825b2d40566a7))
* **add:** 83633204 ([#6604](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6604)) ([64a4b11](https://github.com/Koenkk/zigbee-herdsman-converters/commit/64a4b11f95e9817f40a7a536809e8cac46949d5a))


### Bug Fixes

* **detect:** Detect `_TZ3000_rgpqqmbj` as Rylike RY-WS02Z [@darkxst](https://github.com/darkxst) https://github.com/Koenkk/zigbee2mqtt/issues/19992 ([16dfd83](https://github.com/Koenkk/zigbee-herdsman-converters/commit/16dfd830623505d08a25fa65ca743d92e79aec20))
* Expose switch for Namron 4512767 https://github.com/Koenkk/zigbee2mqtt/issues/19989 ([1f60050](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1f60050a1c779e7f92303c87fbf65d562da27e98))
* Fixes and improvements for NodOn SIN-4-1-20,  SIN-4-RS-20 and SIN-4-FP-2X ([#6606](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6606)) ([11eca0d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/11eca0d8bedc244b678d2cdd152a3834be291148))
* **ignore:** update dependencies ([#6608](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6608)) ([49ee772](https://github.com/Koenkk/zigbee-herdsman-converters/commit/49ee77281ccab230b2848e275207ff0112e8eb83))

## [15.131.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.130.1...v15.131.0) (2023-12-02)


### Features

* **add:** GL-P-101P ([#6601](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6601)) ([afda456](https://github.com/Koenkk/zigbee-herdsman-converters/commit/afda45659a94f4d8085a4832a0140afbd837bc99))


### Bug Fixes

* Fix power source for Xiaomi QBKG21LM ([#6599](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6599)) ([58a883a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/58a883ad8043ad5c1d386681245d1cf9067b75d7))
* Fix setting Xiaomi `operation_mode` not working https://github.com/Koenkk/zigbee2mqtt/issues/19960 ([392ad72](https://github.com/Koenkk/zigbee-herdsman-converters/commit/392ad722e0f9ad9f151b9bfacab433f3492904f1))
* **ignore:** Migrate Innr to modernExtend ([#6591](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6591)) ([8207e09](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8207e09c9b864f8cba94e909f6b2da7633bbcfbf))
* **ignore:** Refactor some lights to modernExtend ([#6592](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6592)) ([7b68902](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7b6890235c43a532245e03bd940ffbc72cc155b8))
* Make `pilot_wire_mode` more consistent ([#6597](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6597)) ([4093ebe](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4093ebe344d8ade7329fa034a7150a6cdbce6ce4))
* Reduce spamming of Develco SPLZB-131 ([#6603](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6603)) ([90c125d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/90c125dade8334c11e4f63610bcbfe7549d9ab41))
* Remove unsupported `power_on_behaviour` for Schneider Electric MEG5161-0000 https://github.com/Koenkk/zigbee2mqtt/issues/19950 ([0895f47](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0895f4717e227d4b2f780270307522c4aed3be86))
* Set Danfoss 014G2461 `load_room_mean` max to 3600 https://github.com/Koenkk/zigbee-herdsman-converters/issues/6600 ([2f99af9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2f99af95e0e3c4ab60e5f7013e0d3c62ff1267d2))

## [15.130.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.130.0...v15.130.1) (2023-12-01)


### Bug Fixes

* **ignore:** Add missing frient import ([2c722d4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2c722d49737b80c3bf7098d2a031f1093fed5c62))

## [15.130.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.129.0...v15.130.0) (2023-12-01)


### Features

* **add:** TS0601_switch_10 @Neil-M0NFI https://github.com/Koenkk/zigbee2mqtt/discussions/19938 ([77da13d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/77da13d3db98de610ccc16d627cbbcf11b88ab7e))


### Bug Fixes

* **detect:** Detect `ZL1-EN` as ORVIBO SW30 ([#6594](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6594)) ([c356984](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c3569844eb08e7c9fca354b59378f59bdd631945))

## [15.129.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.128.0...v15.129.0) (2023-11-30)


### Features

* **add:** ML-ST-R200 ([#6587](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6587)) ([e63415f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e63415f88f37eefc09a129f7603f60a10b6f5e58))
* **add:** ZG-101Z ([#6586](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6586)) ([4ce6450](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4ce6450b2a55761f7e9f38688b645748885b876d))
* **ignore:** Extend modernExtend ([#6588](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6588)) ([66bfa64](https://github.com/Koenkk/zigbee-herdsman-converters/commit/66bfa640d81c500cc80f21223262574ed2eed518))
* Support `device_temperature` for Develco SPLZB-131 ([#6584](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6584)) ([14dbb1a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/14dbb1a03587c204047aa470b548cc5d68300076))


### Bug Fixes

* Fix configure failing for TuYa `_TZ3000_0zfrhq4i` https://github.com/Koenkk/zigbee2mqtt/discussions/19680 ([6b885ce](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6b885cecf0116fc012deb3546238172367694193))
* **ignore:** fix d18f537b9152ffc274bf5cc7af7d88ce5fdfa003 ([6e0e699](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6e0e6990e2f08324f7aee6b90fe0799d0552f1dd))
* **ignore:** Prepare for large scale refactoring ([87d6359](https://github.com/Koenkk/zigbee-herdsman-converters/commit/87d635954e10a43e6210a5728e5c75bc4422d62d))
* **ignore:** update dependencies ([#6589](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6589)) ([30ec89f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/30ec89f46a7e1dfed6b9bc37ff11738fa069e0f6))
* **ignore:** update dependencies ([#6593](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6593)) ([196e562](https://github.com/Koenkk/zigbee-herdsman-converters/commit/196e5622a441acdc51cc2e92a0dd421760cea57e))

## [15.128.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.127.0...v15.128.0) (2023-11-28)


### Features

* **add:** EMIZB-141 ([#6582](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6582)) ([b7b6788](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b7b678862a3871b53606022daf6bd1e1ad8f3e06))
* Support `invert_cover` for Zemismart ZM25RX-08/30 ([#6492](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6492)) ([ea29d3d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ea29d3d969ea2e711c549122eb9bc26d28b79034))
* Support schedule for Avatto ZWT198 and other improvements ([#6571](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6571)) ([d18f537](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d18f537b9152ffc274bf5cc7af7d88ce5fdfa003))


### Bug Fixes

* **detect:** Detect `_TZ3000_18ejxno0` as Moes ZS-US2-WH-MS https://github.com/Koenkk/zigbee2mqtt/issues/19897 ([8ac28b8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8ac28b82fa7c3ce4dfcc207bbf58ff2502be19ee))
* Fixes for TuYa `_TZE204_5toc8efa` ([#6581](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6581)) ([bbc21c2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bbc21c2f880407005d26d9e0bad650dad1845aaa))
* Read SONOFF TRVZB attributes during `configure` ([#6580](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6580)) ([9e56d19](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9e56d19a1389c0f37b1770e46fdda829e0543051))

## [15.127.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.126.0...v15.127.0) (2023-11-27)


### Features

* Add modern extends ([#6519](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6519)) ([de81739](https://github.com/Koenkk/zigbee-herdsman-converters/commit/de81739242f329e00647fd36c8a1c78c3ee00a48))
* **add:** 4512761 ([#6573](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6573)) ([2e73b9b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2e73b9ba427f9db2b4cfda6003cdc8418a863f9c))
* **add:** 4512773 ([#6568](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6568)) ([adc0234](https://github.com/Koenkk/zigbee-herdsman-converters/commit/adc02346a0b8d2af98f4c52db67a2314f05f866b))
* **add:** E2134 ([#6578](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6578)) ([437468a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/437468a773935e15f0b5f7df74c5a3ce9a33eb1d))
* Support more features for SONOFF TRVZB ([#6566](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6566)) ([aafa31e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aafa31e32642c5a8ed9feb8c14e24ef76986e8f8))
* Support more features for Xiaomi LGYCDD01LM and LLKZMK12LM ([#6554](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6554)) ([3db5698](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3db5698a6b34d92bce5069862fcb8f735fd9a557))
* Support OTA for Namron 4512750 and 4512751 ([#6576](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6576)) ([a8c1b40](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a8c1b40557c47bbe456bd6628b0cc95b19523322))


### Bug Fixes

* **ignore:** update dependencies ([#6565](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6565)) ([3c8be47](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3c8be4777165effa7782671227520eec6e3af14e))

## [15.126.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.125.1...v15.126.0) (2023-11-26)


### Features

* **add:** 4512768 ([#6561](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6561)) ([3f41409](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3f4140942d850c8dc019d6a0a03c12bbc538dc3c))
* Support EDF tariff for LiXee ([#6569](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6569)) ([a9fc43f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a9fc43f3eae9bf5e656703612cbfaf291234e1bb))


### Bug Fixes

* **detect:** Detect `_TZ3000_saiqcn0y` as TuYa TH02Z https://github.com/Koenkk/zigbee-herdsman-converters/issues/6515 ([3598a89](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3598a899366cc46e88a937a2cde23b8a197f3bc2))
* **detect:** Detect `_TZ3000_w0ypwa1f` as TuYa ZN231392 ([#6570](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6570)) ([f8d5865](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f8d58651463cbc6fab5b2297f1d42c0fac698269))
* Disable unsupported power_on_behaviour for Xioami JWSP001A ([#6558](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6558)) ([0303e10](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0303e10fe9e9c933816938da66377018438cf22c))
* Improvements for Bosch BTH-RM230Z ([#6562](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6562)) ([6ae4215](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6ae42156a87fe9b709d02a698a408dcc8aa9128b))

## [15.125.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.125.0...v15.125.1) (2023-11-26)


### Bug Fixes

* **detect:** Detect `_TZE204_chbyv06x` as TuYa TS0601_gas_sensor_2 ([#6563](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6563)) ([d0aafe2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d0aafe21dfadd399a98cc9176d2276d318cbf2a7))
* **ignore:** Revert "feat(add): ZB-R01 https://github.com/Koenkk/zigbee2mqtt/issues/19653" ([b061446](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b061446cfe2ec9d1ff2cf6a19669c8e29fb55b47))

## [15.125.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.124.0...v15.125.0) (2023-11-24)


### Features

* Add `system_mode` for TuYa BAB-1413_Pro ([#6555](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6555)) ([90c2434](https://github.com/Koenkk/zigbee-herdsman-converters/commit/90c24344c3b100967445e45d882f9ede73c81280))


### Bug Fixes

* **detect:** Detect `_TZ3000_skueekg3` as TuYa WHD02 ([#6552](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6552)) ([3675cef](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3675cef00b55aab8f760219e57871ef411f5ad8a))
* **detect:** Detect `_TZE204_iaeejhvf` as TuYa MTG075-ZB-RL ([#6550](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6550)) ([50684fd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/50684fd406cd1d44965b84c09514c6b3405ed297))

## [15.124.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.123.1...v15.124.0) (2023-11-23)


### Features

* Add OTA and add more actions for JetHome WS7 ([#6546](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6546)) ([6569bad](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6569bad47a8b2c3b90b67f1cde1090d3a5509bb4))
* **add:** 14595.0 https://github.com/Koenkk/zigbee2mqtt/issues/18323 ([3a10293](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3a10293dcd0563345b33849b3a45889312af0c3e))
* **add:** 501.22 ([#6544](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6544)) ([5b00e09](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5b00e0900cee8e0385b4ddc31fe18cedb011d89b))
* **add:** ZB-IR01 ([#6532](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6532)) ([6d5dfe8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6d5dfe84f82f9e3a24de07b173dd6edac1ab9722))


### Bug Fixes

* **detect:** Detect `_TZ3218_t9ynfz4x` as Linptech ES1ZZ(TY) https://github.com/Koenkk/zigbee2mqtt/issues/19825 ([920461c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/920461c806f0f79ee9564cd4572a924ed82a00b7))
* **ignore:** Combine extend exposes/fromZigbee/toZigbee https://github.com/Koenkk/zigbee-herdsman-converters/pull/6519 ([fd4d40b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fd4d40b61276e59947cfca642aec58ed52a9684e))

## [15.123.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.123.0...v15.123.1) (2023-11-22)


### Bug Fixes

* **ignore:** Revert "fix: Combine extend exposes/fromZigbee/toZigbee" ([ce1d0ca](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ce1d0cab74df1c6b1680a9e5d2b97b18931e5e75))

## [15.123.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.122.0...v15.123.0) (2023-11-22)


### Features

* Add new fingerprint to SNZB-03 ([#6542](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6542)) ([f906b26](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f906b2644ccc4a5a3cfb9933482622710b7b50d6))
* Add new Tariff names for LiXee ([#6531](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6531)) ([c276f74](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c276f7441286ab76040998134038b034f1e6f019))
* **add:** 5121.10 ([#6541](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6541)) ([523349e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/523349e729608df702dd6a19b96d66a7ec7e92c4))
* **add:** ZB-R01 https://github.com/Koenkk/zigbee2mqtt/issues/19653 ([bb508d2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bb508d228e5b34d5bf5ef1fdb54b9fbeb50e1621))


### Bug Fixes

* **ignore:** Revert "fix: Fix Vesternet VES-ZB-SWI-015 configure failing ([#6412](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6412))" ([#6540](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6540)) ([139c6c8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/139c6c8b49822f5516e10163b82e36cbd790b81a))
* **ignore:** Update `as` assertions to `satisfies` ([#6527](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6527)) ([14cd7e6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/14cd7e63a8bbce9f937a0bed8bbe6eb8a31862d5))
* Various fixes for TuYa BAB-1413_Pro ([#6534](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6534)) ([6468cac](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6468cacb4c064753e40fb3024c806194d7f98306))

## [15.122.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.121.0...v15.122.0) (2023-11-21)


### Features

* **add:** SNZB-03P ([#6521](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6521)) ([45e9266](https://github.com/Koenkk/zigbee-herdsman-converters/commit/45e926642243217225971633862268ecccd69883))
* **add:** ZSS-HM-SSD01, TS0601_dimmer_4, TS0601_dimmer_5 ([#6497](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6497)) ([6cbbe8c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6cbbe8c2ad602b94eaf80f4383ec256045c3e4e0))


### Bug Fixes

* Combine extend exposes/fromZigbee/toZigbee ([7761fc7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7761fc751d881c9cd726798d267f566bc1e01e08))
* Fix index.test.ts imports ([c77cfdd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c77cfdd4a1aca662c20cd512a3fce6e5273b03d1))
* Fix Innr RB 279 T not controllable ([#6522](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6522)) ([cd07d62](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cd07d62bdda6df346cff1c1c6a429c84dd16d3f7))
* Fix TuYa BAB-1413_Pro `preset` values ([#6526](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6526)) ([0673b8a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0673b8adbd76a56e0154a8467fd4ae6eff014272))
* Fix TuYa TS0502B not reporting values ([#6509](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6509)) ([716aba3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/716aba3347d1a0c695e167ead2a1d8ffb2707c9c))
* **ignore:** add missing extend types ([5580254](https://github.com/Koenkk/zigbee-herdsman-converters/commit/558025449874c834b5f9946d631b3e4500d318a0))
* **ignore:** update dependencies ([#6506](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6506)) ([a78c0bf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a78c0bf7eaf1a2d8f4d7ef0d256b4d569fdc65fe))
* Revert stop and antri-freeze values for Nodon cable outlet ([#6513](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6513)) ([25ba90d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/25ba90d0161a02742eba570c5767973677fb65b1))

## [15.121.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.120.0...v15.121.0) (2023-11-19)


### Features

* **add:** 9290018216A ([#6510](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6510)) ([8d8ad7d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8d8ad7dd0f2c2223d3d1c8def29e8d4d4465d489))
* **add:** LED2106R3 https://github.com/Koenkk/zigbee2mqtt/discussions/19760 ([6ce404d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6ce404d203b0946b7eaefe7abfc211568c55774a))


### Bug Fixes

* Fix time incorrect for ZWT198 and add a mode ([#6511](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6511)) ([d9375f6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d9375f6b008afd146889e5c2c5e5c0461dfda31c))

## [15.120.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.119.0...v15.120.0) (2023-11-18)


### Features

* **add:** 4512767 ([#6496](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6496)) ([86b9423](https://github.com/Koenkk/zigbee-herdsman-converters/commit/86b9423985fbfaa17cbf40f605237ce57c7b5aa6))
* **add:** CK-BL702-MSW-01(7010) ([#6501](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6501)) ([39e6dcf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/39e6dcf671a05119009d1a3c2a940cca57af7d21))
* **add:** L2112 ([#6500](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6500)) ([9d53667](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9d536676f728c82f899537305c98021e9074d91c))
* **add:** YRD652HA20BP ([#6498](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6498)) ([80042cb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/80042cbad46f211b1487f335d50902d768e30aea))
* Expose switch type for TuYa QS-Zigbee-SEC02-U ([#6494](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6494)) ([f22de41](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f22de4177303b62f1ee10e013f7a9189e1aa4a4b))
* **ignore:** Add back E-Ctrl and BRI4P ([#6493](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6493)) ([ec34675](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ec346759248d31c32bd7adb63ecbbe5f777dafe9))


### Bug Fixes

* **detect:** detect `_TZ3000_saiqcn0y` as WSD500A ([#6491](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6491)) ([c2a0c4c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c2a0c4cd3134e840fe9daaa421688c3d2f1ebdeb))
* **detect:** Detect `TRADFRI bulb E26 WW G95 CL 440lm` as IKEA LED2102G3 ([#6490](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6490)) ([d56edec](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d56edec98aaf7c7bbe849f5d7259e1046f49e9fd))
* Fix Namron 4512737/4512738 `window_open_check` min value ([#6502](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6502)) ([26a1ac6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/26a1ac689e6df800fcb6ba7211c64d192fdb20ee))
* Fix text for QBKG32LM operation_mode ([#6505](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6505)) ([f27afb7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f27afb70ca8b068280efb87ded27097a7ccd77d9))
* Fix Zemismart ZM25RX-08/30 state reverted ([#6503](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6503)) ([1605fd5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1605fd59ab863ff07d5670da7d3322d498824896))

## [15.119.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.118.0...v15.119.0) (2023-11-16)


### Features

* **ignore:** Refactor toZigbee to TS ([#6299](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6299)) ([e089bf2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e089bf242b228209cfae800be44807aa7eafb33a))


### Bug Fixes

* **ignore:** Revert "feat(add): E-Ctrl, BRI4P ([#6478](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6478))" ([#6488](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6488)) ([149c800](https://github.com/Koenkk/zigbee-herdsman-converters/commit/149c80060085bdd1ee20f24fd38abd254ad09b50))

## [15.118.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.117.0...v15.118.0) (2023-11-16)


### Features

* **add:** 4512766 ([#6485](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6485)) ([a6c27f2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a6c27f2fe759efea29f6687d7a15816aef64a3dd))
* **add:** 929003598001 https://github.com/Koenkk/zigbee2mqtt/issues/19726 ([ff3f0c7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ff3f0c722355d0cfce5a090597550adae51ced1c))
* **add:** E-Ctrl, BRI4P ([#6478](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6478)) ([e39ed00](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e39ed00d7f5eb3a0ac3f2fd4f2503c38d8f8291c))
* **add:** TS0601_futurehome_thermostat ([#6325](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6325)) ([82b3b15](https://github.com/Koenkk/zigbee-herdsman-converters/commit/82b3b1524fa0f11fc1507479db7ec1f99cf8c386))
* **add:** WXKG22LM ([#6481](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6481)) ([88f8946](https://github.com/Koenkk/zigbee-herdsman-converters/commit/88f8946694f71b89101b10bfe152990537dbd76c))

## [15.117.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.116.0...v15.117.0) (2023-11-15)


### Features

* **add:** 4512750 ([#6471](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6471)) ([275b6f1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/275b6f1e3e3ef7c6cb507db054b8c98a2e10e7f2))
* **add:** SIN-4-1-21 ([#6476](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6476)) ([81b6c11](https://github.com/Koenkk/zigbee-herdsman-converters/commit/81b6c112ac87a0aacee8a6867f0f0032d6149222))
* **add:** TDL01LM https://github.com/Koenkk/zigbee2mqtt/issues/19711 ([263b574](https://github.com/Koenkk/zigbee-herdsman-converters/commit/263b5748b2bfffdc1d961c5a1a974c6a23aaff75))
* Support OTA for  Develco SPLZB-13x ([#6479](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6479)) ([b4fb4c8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b4fb4c88e58488751ccfbf43c10f974ed2ac06f5))


### Bug Fixes

* **detect:** Detect `_TZ3000_lsunm46z` as TuYa TS0003_switch_3_gang_with_backlight https://github.com/Koenkk/zigbee-herdsman-converters/issues/6370 ([be1bd2b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/be1bd2b4621610f57e2756bb43400ddcab6057c1))
* Fix power source for TuYa TS0601_cover_4 https://github.com/Koenkk/zigbee-herdsman-converters/pull/6351 ([19e3628](https://github.com/Koenkk/zigbee-herdsman-converters/commit/19e3628ae6b37176b791172e005a2aa4fe93b55c))
* Fix TuYa TS0601_temperature_humidity_sensor_2 (ZTH01/ZTH02/ZTH05/ZTH08-E) not reporting https://github.com/Koenkk/zigbee2mqtt/issues/19137 ([c6af421](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c6af42110ec166795794b254ddd9613d29d3fe22))
* **ignore:** fix 263b5748b2bfffdc1d961c5a1a974c6a23aaff75 ([782a551](https://github.com/Koenkk/zigbee-herdsman-converters/commit/782a551bee69e03f96a0f1a0717d86eb02b98f68))
* **ignore:** fix 275b6f1e3e3ef7c6cb507db054b8c98a2e10e7f2 ([d5a9772](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d5a9772bb8062e6fd2cfa6acdc62a26c01a840da))
* **ignore:** fix be1bd2b4621610f57e2756bb43400ddcab6057c1 ([74cab74](https://github.com/Koenkk/zigbee-herdsman-converters/commit/74cab74d9f5d493d81c6a1686a3022f06c554334))
* Replace `battery` with `battery_low` for Xiaomi MCCGQ12LM https://github.com/Koenkk/zigbee2mqtt/issues/19559 ([3d5090c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3d5090cf054ff1076ca31b206707709983190375))

## [15.116.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.115.0...v15.116.0) (2023-11-14)


### Features

* Expose `on_transition_time` and `off_transition_time` for Vesternet VES-ZB-DIM-004 ([#6447](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6447)) ([aec2760](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aec276094383f6e8b067e189ba7650124d855120))


### Bug Fixes

* Fix reporting for mTouch One ([#6472](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6472)) ([4a62596](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4a62596dbad7b11ddae55916a279579f4c7f9cc1))
* **ignore:** Fix nodon_fil_pilote_mode converter ([#6473](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6473)) ([17f5a40](https://github.com/Koenkk/zigbee-herdsman-converters/commit/17f5a4028e4594e5d2457f65c482d3602ab8db45))
* Rename `81812` to `81812/81814` ([#6470](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6470)) ([2736049](https://github.com/Koenkk/zigbee-herdsman-converters/commit/273604964f55fe823ec84c7255933e0d89b63bb2))
* stop and anti-freeze mode are reversed ([17f5a40](https://github.com/Koenkk/zigbee-herdsman-converters/commit/17f5a4028e4594e5d2457f65c482d3602ab8db45))

## [15.115.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.114.0...v15.115.0) (2023-11-13)


### Features

* **add:** 288WZ ([#6460](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6460)) ([f2b9c45](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f2b9c459a309c0454251f486e63cb7d44d01a1f2))
* **add:** BAB-1413_Pro ([#6464](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6464)) ([e71c757](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e71c7576eca702fa4c411bb7e4bf1d445865d922))
* **add:** QBKG30LM ([#6467](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6467)) ([2663942](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2663942a8b4edf1748f65043158ffc94c9516737))
* Support OTA to Develco SPLZB-131. ([#6462](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6462)) ([e33080b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e33080b89291bc9dba683753100756254d78dfeb))
* Support tilt for Profalux MOT-C1ZxxC/F ([#6459](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6459)) ([ef8abcc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ef8abcc2949da2f9dd3e694c958f23f31f6de14e))


### Bug Fixes

* **ignore:** Fix for [#6450](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6450) ([#6461](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6461)) ([a1e6e88](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a1e6e884a5adcf8649bf6e4e737d5b8e4eef5f32))
* **ignore:** Fix nodon_fil_pilote_mode fz converter ([#6465](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6465)) ([046be41](https://github.com/Koenkk/zigbee-herdsman-converters/commit/046be4187912f5c8b3d8c9616501be03d20b2274))

## [15.114.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.113.0...v15.114.0) (2023-11-12)


### Features

* **add:** 10454469 ([#6451](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6451)) ([c3e653b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c3e653bf4a221b121afba26f41f4702bd071b298))
* **add:** SLC603 ([#6455](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6455)) ([668a7a8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/668a7a802ddc350f07da009a7258b901c21591eb))
* Improve Aqara ZNXDD01LM support ([#6450](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6450)) ([d404727](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d40472790f545dfc8f1a017dcd8e962a683f80b8))
* Support OTA for Insta 57008000 ([#6456](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6456)) ([085c42e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/085c42e5da15e28a60293182fed56e72577ec041))


### Bug Fixes

* **detect:** Detect `_TZE200_rufdtfyv` as Immax 07732L ([#6458](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6458)) ([3f6d090](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3f6d090d17f24a44a7db667f3b638dac986e7694))
* **detect:** Detect `AD-ColorTemperature3001` as AduroSmart 81812 ([#6384](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6384)) ([16c8356](https://github.com/Koenkk/zigbee-herdsman-converters/commit/16c8356d5da6f4510aee699649391a7bbb888bea))
* **detect:** Detect `CK-BL702-AL-01(7009_Z102LG04-2)` as TuYa CK-BL702-AL-01 https://github.com/Koenkk/zigbee2mqtt/issues/19182 ([2965304](https://github.com/Koenkk/zigbee-herdsman-converters/commit/29653044f43b6c54f6a6c7c6ebab5ec45c05045a))
* **detect:** Detect `ID Lock 202` as Datek 0402946 ([#6453](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6453)) ([921ce6c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/921ce6c8e534e79fd078d7d13105e3c3ec3a8ec0))
* Fix expose backlight mode for TuYa TS0003_switch_3_gang_with_backlight https://github.com/Koenkk/zigbee-herdsman-converters/issues/6370 ([40642e9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/40642e9695103ab53620237b6966ce7af2b4411e))
* Fix power source for TuYa TS0601_gas_sensor_2 https://github.com/Koenkk/zigbee-herdsman-converters/pull/6351 ([4b9a824](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4b9a8249469feaa23ed720ebbbed3e00428f7f8a))
* Fix TuYa TYBAC-006 valve not controllable and time being incorrect ([#6440](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6440)) ([6ea5b83](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6ea5b83bc9daaf98e15679dbea28162fe1c76fe0))
* **ignore:** update dependencies ([#6452](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6452)) ([ac46039](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ac46039bff33c1e451fbd3ee4d15937519f43702))

## [15.113.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.112.0...v15.113.0) (2023-11-10)


### Features

* **add:** 929003597701 @MicEs1 https://github.com/Koenkk/zigbee2mqtt/issues/19658 ([d60eb07](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d60eb07d7b272ce11c16b2e6feeb9641003f73d6))
* **add:** TS0601_thermostat_4 ([#6442](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6442)) ([8c13303](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8c13303704e4de9dbf5c6df149431330c5fd653e))
* Support OTA for SONOFF SNZB-06P @North-Sea-ice-free https://github.com/Koenkk/zigbee-OTA/pull/397 ([e1f1765](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e1f17650bd847a3a36170b326536cd96f587176c))


### Bug Fixes

* **detect:** Detect `_TZ3210_r5afgmkl` as TuYa TS0505B_2 https://github.com/Koenkk/zigbee2mqtt/issues/17612 ([fc2e662](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fc2e662b943da834ac8c732e8fd9d4ce214b5fc4))
* Fix Enbrighten 43080 not reporting brightness on physical change https://github.com/Koenkk/zigbee2mqtt/issues/19633 ([820999d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/820999d895fe32ab503d5df0656f74315d983225))
* Fix expose backlight mode for TuYa TS130F https://github.com/Koenkk/zigbee-herdsman-converters/issues/6370 ([0d074ac](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0d074ac2c5c8504fc511c28883224f59e88a01f4))
* Fix NodOn `mode` converter ([#6441](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6441)) ([e12575c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e12575c2dc74066797af2ae5a8e872fbcb3c570b))
* **ignore:** fix fc2e662b943da834ac8c732e8fd9d4ce214b5fc4 ([f8255d5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f8255d5c15d6a50edc587034cb81bb46277aa986))
* **ignore:** revert [#6282](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6282) ([#6445](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6445)) ([6bac17b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6bac17bd912850f6156eea6659dad7b8d4a0cbfa))

## [15.112.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.111.0...v15.112.0) (2023-11-09)


### Features

* Add `temperature_display_mode` for LYWSD03MMC ([#6437](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6437)) ([5b5532e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5b5532ea2734ee607ba7ba3b2da892a7ca5bc9e5))
* Update SIN-4-FP-21 and SIN-4-FP-20 from NodOn ([#6429](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6429)) ([1d692cc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1d692ccf6e27687b173aee03e6e048bac0c1d631))


### Bug Fixes

* **detect:** Detect `_TZ3210_778drfdt` as MiBoxer FUT037Z https://github.com/Koenkk/zigbee2mqtt/issues/19343 ([2ec4b6f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2ec4b6fcdf6c808b6b028a541d658492c9ffe6a7))
* Fix Vimar 14594 not reporting position [@lanny318](https://github.com/lanny318) https://github.com/Koenkk/zigbee2mqtt/issues/18628 ([9486f23](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9486f235a77b2ec694118cd4fe8317f06e49f494))

## [15.111.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.110.0...v15.111.0) (2023-11-08)


### Features

* **add:** ptvo_counter_2ch ([#6395](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6395)) ([2aee14e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2aee14ee2c8775cf6d842db9bd7994c14f385dc2))
* **add:** RB56AC ([#6435](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6435)) ([b6f362d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b6f362d9b6a4b467cf295892a195c225a75cbef8))
* Separately detect Busch-Jaeger 6737, 6735 and 6736 devices ([#6282](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6282)) ([f4e446a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f4e446a48f2cae20de6d0ea029941345b4de65c3))
* Support `frost_protection_temperature` for SONOFF TRVZB ([#6425](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6425)) ([4d93c07](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4d93c07127949ab5ab3b4a224b035d35fe0cd945))


### Bug Fixes

* Consolidated Legrand options ([#6436](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6436)) ([d567768](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d5677682acabf52df20a903cb7d98641d7396fa9))
* **detect:** Detect `_TZE204_zougpkpy` as DYGSM DY-RQ500A ([#6351](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6351)) ([96274ed](https://github.com/Koenkk/zigbee-herdsman-converters/commit/96274ed67d0801b78522353ef419858603a5854d))
* Fix `gas_value` and `co` value for TuYa DCR-RQJ ([#6433](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6433)) ([7f13ad6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7f13ad6507efa433b600045fe749b3b33deae38d))
* Fix `gas`/`carbon_monoxide` value always `false` for TS0601_gas_sensor_2/DCR-RQJ https://github.com/Koenkk/zigbee-herdsman-converters/pull/6351 ([297090c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/297090c5ef9ba87abb396923f3248e79540484cc))
* Fix configure failing for SONOFF SNZB-02P https://github.com/Koenkk/zigbee-herdsman-converters/issues/6396 ([7840d72](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7840d72e96c279998dd4c05f24f80aabc2702c0d))

## [15.110.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.109.0...v15.110.0) (2023-11-07)


### Features

* **add:** 84845509 https://github.com/Koenkk/zigbee2mqtt/issues/19610 ([ac341cf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ac341cf9a7cf33006f4e360a647e0dbbc79f78f1))
* **add:** 929003597601 @MicEs1 https://github.com/Koenkk/zigbee2mqtt/issues/19604 ([8685bde](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8685bde2c3f399f69dcdf1577a81257ce6beba52))
* Expose battery for Schneider Electric 550D6001 ([#6431](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6431)) ([b1b8997](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b1b89977965e864a1eb1a0c80663d4d21d90ccf8))


### Bug Fixes

* **detect:** Detect `_TZ3000_decxrtwa` as Moes ZSS-JM-GWM-C-MS ([#6427](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6427)) ([a65ecd8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a65ecd8ac289dfcbb6ded55cff746d41629586bf))
* **detect:** Detect `_TZE200_gd4rvykv` as Saswell SEA801-Zigbee/SEA802-Zigbee https://github.com/Koenkk/zigbee2mqtt/issues/16966 ([4a0bfa8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4a0bfa80815aa5275fdbbf63f9d71e978fdb586f))
* **detect:** Detect `050` as Shenzhen Homa HLD503-Z-CT @ChrisSmartHome https://github.com/Koenkk/zigbee2mqtt/issues/19608 ([ce40150](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ce40150d481c5d5d9d10e8b389e0930b42f7d432))
* Fix Inovelli VZW35\VZM31 lookup values for aux switch button presses ([#6424](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6424)) ([7967cee](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7967cee56ec717b34eb11ced46038c470cd52d3c))
* Fixed BTicino K4027C family detection ([#6423](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6423)) ([c14fe4d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c14fe4d0234b5c2a6a93334a8e3c99a93f537d25))
* **ignore:** fix 4a0bfa80815aa5275fdbbf63f9d71e978fdb586f ([41d9981](https://github.com/Koenkk/zigbee-herdsman-converters/commit/41d9981dcbb8be9d66205ebc7f479f0121fc1f84))

## [15.109.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.108.0...v15.109.0) (2023-11-06)


### Features

* **add:** 929003621101 ([#6417](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6417)) ([ed90660](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ed9066067fa4485ffcee0e75a564f11f389c017c))
* **add:** SIN-4-FP-21_EQU ([#6414](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6414)) ([cb031f5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cb031f516261b2e87b348be87bd7dcaa24d109ff))
* **add:** U2-86K11ND10-ZD, U2-86K21ND10-ZD, U2-86K31ND10-ZD ([#6419](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6419)) ([acc0510](https://github.com/Koenkk/zigbee-herdsman-converters/commit/acc0510273418ea0124e19f8937e9600a7c33e5c))
* Support `local_temperature_calibration` for SONOFF TRVZB ([#6415](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6415)) ([c50064a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c50064a65e7679e4b289b0b970f2404f5aab232d))
* Support colortemp for OSRAM 4062172044776_1 ([#6410](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6410)) ([2dd5f2b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2dd5f2bda3da2870973b8b92ecb31fc2032a96e4))
* Support extra effects for Philips 929003535301 and 929003674601 ([#6413](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6413)) ([6b98633](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6b986331511c8e13c5191a6b039aa73f5b9e25e1))


### Bug Fixes

* Add whitelabels for Develco SMSZB-120 and SMSZB-120 ([#6416](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6416)) ([b5f810a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b5f810a60c63f2266dd6e61ed5b29b26b2c87112))
* **detect:** Detect `_TZE200_locansqn` as TuYa TH01Z ([#6409](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6409)) ([3cd463d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3cd463d19f4d89683a2b9ec3d1909923121b7877))
* Fix setting `unitOfMeasure` for LiXee ZiPulses https://github.com/Koenkk/zigbee2mqtt/issues/19240 ([cc663f4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cc663f4221bc37afedfe51cbd80887eaa9a466c1))
* Fix Vesternet VES-ZB-SWI-015 configure failing ([#6412](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6412)) ([de87c4b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/de87c4b302fbad3678e4cafbebbc2e80e5fefc1c))
* **ignore:** Fix typo, change to `commission` ([#6408](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6408)) ([59f18b2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/59f18b23b67f832b50a1b05dd4482d52cb6f6cd1))

## [15.108.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.107.0...v15.108.0) (2023-11-05)


### Features

* **add:** 929003674601 ([#6400](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6400)) ([669e555](https://github.com/Koenkk/zigbee-herdsman-converters/commit/669e5556c25222c324f9bf037b125139f70347fd))
* Expose more features for SONOFF TRVZB ([#6404](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6404)) ([f4fb42b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f4fb42b148a18f291311ff5ee59461345b3d6c66))


### Bug Fixes

* **detect:** Detect `_TZ3000_juq7i1fr` as Mercator Ikuü SMFL20W-ZB ([#6401](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6401)) ([60501e8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/60501e8503324a99dd1c5ed6f282d44f2a83507f))
* **detect:** Detect `_TZ3210_m3mxv66l` as Immax 07502L [@mazany](https://github.com/mazany) https://github.com/Koenkk/zigbee-herdsman-converters/issues/6407 ([246b900](https://github.com/Koenkk/zigbee-herdsman-converters/commit/246b9007e86c73146ba8041f8b0dda8d40ebf065))
* **detect:** Detect `_TZ3210_r5afgmkl` as TuYa TS0505B_1_1 https://github.com/Koenkk/zigbee2mqtt/issues/17612 ([6339b60](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6339b6034de34f8a633e4f753dc6e506ac9b001c))
* Fix Bticino K4027C family detection  ([#6405](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6405)) ([c48f8c1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c48f8c12a03918e98a0e26e2c72683a3e7891169))
* Fix incorrect time and `min_temperature_limit`/`manual_mode` for  TuYa TYBAC-006  ([#6403](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6403)) ([aa870af](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aa870afab93d3fc179b1c78f2eb852ba61b93833))
* **ignore:** update dependencies ([#6398](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6398)) ([97730d5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/97730d5a684c5b18e7012e4cb66e746230212098))
* Increase TuYa TS011F_with_threshold max `over_voltage_threshold` to 265 https://github.com/Koenkk/zigbee2mqtt/issues/19588 ([c22d145](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c22d1455dac6244677d49b1b3ef9a0676846851f))
* Remove unsupported color from IKEA LED2201G8 https://github.com/Koenkk/zigbee2mqtt/issues/19585 ([220ac54](https://github.com/Koenkk/zigbee-herdsman-converters/commit/220ac54670d2329899fc47f7d5535b162b85018e))
* Correct misspells ([#6406](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6406)) ([255beac](https://github.com/Koenkk/zigbee-herdsman-converters/commit/255beac9189ae5adbd78d1f3a359131bd889ec53))

## [15.107.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.106.0...v15.107.0) (2023-11-03)


### Features

* **add:** BSIR-EZ ([#6313](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6313)) ([e3ed58b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e3ed58b5210bb77d2467c555216c3a0f0fa966d3))
* **add:** DCR-RQJ ([#6386](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6386)) ([4e2caec](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4e2caecd65fb23d535698143a6a01df562d4e251))
* Consolidate Legrand toZigbee converters and add `led_if_on` to Legrand 067776/067776A ([#6390](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6390)) ([caa1904](https://github.com/Koenkk/zigbee-herdsman-converters/commit/caa190443aa50ffe7968e86ecafe30da47891e75))
* Expose blacklight switch for TuYa TS130F and TS0003_switch_3_gang_with_backlight https://github.com/Koenkk/zigbee-herdsman-converters/issues/6370 ([59b1e3c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/59b1e3cd485b78dc55ddb1e68881f27d1bece7ea))


### Bug Fixes

* Cleanup Legrand Greenpower fromZigbee converters ([#6374](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6374)) ([d66a16d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d66a16dbbf384a44237d05f822a84ac6d75ae6f1))
* **detect:** Detect `_TZ3000_lsunm46z` as Zemismart ZM-L03E-Z https://github.com/Koenkk/zigbee-herdsman-converters/issues/6370 ([eede1f6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/eede1f6134c6ad393591d52a82255338c4243ee8))
* **detect:** Detect `_TZ3210_s9lumfhn` as Moes ZB-LZD10-RCW ([#6375](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6375)) ([b1d273f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b1d273fd642da8788ac2fdff856b9baab6176181))
* **detect:** Detect `_TZE204_e5m9c5hl` as Wenzhi WZ-M100-W https://github.com/Koenkk/zigbee-herdsman-converters/pull/6308 ([b743378](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b743378aeb7ace3b9db4d806ddb3886d51f8da7f))
* Fix no 0 power values for TuYa TS011F https://github.com/Koenkk/zigbee2mqtt/issues/16709 ([4334375](https://github.com/Koenkk/zigbee-herdsman-converters/commit/43343759964372b61fa0bd0e2a7ffbd321811f35))
* Remove OTA From Candeo C202/HK-DIM-A ([#6387](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6387)) ([8e6ff24](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8e6ff24ec6e48db98c62be2a14577b133d1e1f34))
* SONOFF TRVZB child lock status incorrectly set to UNLOCKED ([#6383](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6383)) ([82a57de](https://github.com/Koenkk/zigbee-herdsman-converters/commit/82a57deb7f214287a971de6589524ea5473a5174))

## [15.106.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.105.1...v15.106.0) (2023-11-01)


### Features

* **add:** 9290031347 ([#6376](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6376)) ([1142a73](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1142a7360cdba91e19800c522fb968da1b17470e))
* **add:** 9290036744 ([#6379](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6379)) ([baa388a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/baa388a9c42b4010e9199595fd8c761f4894be97))
* **add:** SIN-4-FP-21 ([#6381](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6381)) ([a8d77f7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a8d77f75d6434095a750569a870de99800991cc4))
* **add:** ZCM-300 ([#6380](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6380)) ([e01adb4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e01adb48ca747d5dec161c6b506cb0a6f7b3d2aa))
* Support backlight mode for TuYa TS0004 ([#6367](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6367)) ([e7d9b1d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e7d9b1d37172b1fe3daca60c5005b310437c7dfa))


### Bug Fixes

* **detect:** Detect `_TZE204_d0ypnbvn` as IOTPerfect PF-PM02D-TYZ ([#6378](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6378)) ([f32a2ce](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f32a2cebb5985637703baccb048e70d6cbdee71d))

## [15.105.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.105.0...v15.105.1) (2023-10-31)


### Bug Fixes

* **detect:** Detect `_TZ3000_xsjsnzhz` as TuYa TS0210 ([#6371](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6371)) ([463eca1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/463eca10c7e9685ca2f407da20f76c3550e7ff82))
* **detect:** Detect `_TZE204_u9bfwha0` as Moes BHT-002-GCLZB ([#6369](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6369)) ([c71d9c7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c71d9c7a1c210f04c76c3c9d44a33de7394bfa46))
* Fix reported battery value incorrect for IKEA E1744 https://github.com/Koenkk/zigbee2mqtt/issues/19502 ([8fe1172](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8fe1172a36d9caa0f6b860bfb6f01aab76dc3fb7))
* **ignore:** Small code improvements for Legrand fz converters ([#6368](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6368)) ([5b65eac](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5b65eacb8731392af5a272d3f4c256372b553731))

## [15.105.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.104.0...v15.105.0) (2023-10-30)


### Features

* **add:** 81812 ([#6361](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6361)) ([3f00ec9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3f00ec999230f15218ae8503ce0f995431288c38))
* **add:** BSD29 [@englishteeth](https://github.com/englishteeth) https://github.com/Koenkk/zigbee2mqtt/issues/19334 ([1b880cf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1b880cf840c9d3c6215c01c868e595949a828552))
* **add:** ES1ZZ(TY) ([#6365](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6365)) ([df5f2ac](https://github.com/Koenkk/zigbee-herdsman-converters/commit/df5f2acc89d7659e9c61cb0992772af50cbdf30d))
* **add:** QUAD-ZIG-SW ([#6364](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6364)) ([a8963f4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a8963f4fdbc59355fa0ff2d9e09c875729f92a04))
* **add:** WXKG05LM [@jeong840](https://github.com/jeong840) https://github.com/Koenkk/zigbee2mqtt/issues/19332 ([dfd366e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dfd366e696cdb36f8507a514939793f55f363aad))
* Expose current for Xiaomi DLKZMK11LM ([#6363](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6363)) ([bdcdc98](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bdcdc984872728b6feb670466333768820eaf3df))
* Support calibration + Venetian mode for Legrand 067776(A) ([#6333](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6333)) ([a7b5667](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a7b5667677b5d662080a7cd7087b8623e3944856))


### Bug Fixes

* Fix Innr RB 266 not controllable https://github.com/Koenkk/zigbee2mqtt/issues/18961 ([6e8beda](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6e8bedad8544ece17db901dddbd8a8265c6055e7))
* **ignore:** fix 1b880cf840c9d3c6215c01c868e595949a828552 ([d205e89](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d205e89c4c19037655d27addd5defd7a9012da63))
* **ignore:** Remove _TZE204_zenj4lxv from ZS-SR-EUD-1 (this is a ZS-SR-EUD-2) https://github.com/Koenkk/zigbee2mqtt/issues/18650 ([44da61b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/44da61b574c8bff42bfed23441b7bca54767a1d6))
* **ignore:** update dependencies ([#6350](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6350)) ([df3a42c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/df3a42c6d4eda41e8058fc32a3bb59809adbdf50))
* Support color temp for Namron 1402768 [@uphillbattle](https://github.com/uphillbattle)  https://github.com/Koenkk/zigbee2mqtt/issues/18440 ([6562d79](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6562d7935958c00311b45dd18ffd5fc54a79b9ec))

## [15.104.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.103.0...v15.104.0) (2023-10-29)


### Features

* **add:** 1402768 https://github.com/Koenkk/zigbee2mqtt/issues/18440 ([ea1690d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ea1690d1436bccfc65c8cc0e2c76881fd6c774cd))
* **add:** 150257 ([#6349](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6349)) ([b0cc074](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b0cc074cbf25fc549cfee1821fea1ec0170a27fb))
* **add:** 45723 ([#6344](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6344)) ([3ed6bf7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3ed6bf764694461b69f568c2ef507538d973730c))
* **add:** GL-S-014P ([#6348](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6348)) ([4a2d7b6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4a2d7b69b79e97a58f25eb642b875ca539eac775))
* **add:** ML-ST-D200-NF ([#6347](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6347)) ([7b862de](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7b862de57642e30c37dc7fe90bf0137e9923808f))
* **add:** ZM25RX-08/30 ([#6341](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6341)) ([04de79c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/04de79c9b5de80825e31d2d00381ef2a608fdbd4))


### Bug Fixes

* **detect:** Detect `MAI-ZTS` as Profalux NB102 https://github.com/Koenkk/zigbee2mqtt/issues/19453 ([9867ac3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9867ac3b16ba55147a407a34017f02a8e39d19c2))
* **detect:** Detect `RDM004` as Philips 929003017102 https://github.com/Koenkk/zigbee-herdsman-converters/issues/6269 ([d10da25](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d10da25ef5e797d407d6daa41eadbb966586d18d))
* **detect:** Detect `SNZB-04` as SONOFF SNZB-04 @Emyrk https://github.com/Koenkk/zigbee2mqtt/issues/19464 ([8502d18](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8502d18f7e133b708e0416a5c05e7618d28de726))
* Fix Namron 1402767 not being responsive [@oyvindhauge](https://github.com/oyvindhauge) https://github.com/Koenkk/zigbee2mqtt/issues/18440 ([e0df9a9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e0df9a9fab3c04fb3e9c878e5edab63dee4e9056))

## [15.103.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.102.0...v15.103.0) (2023-10-27)


### Features

* **add:** FL 122 C https://github.com/Koenkk/zigbee2mqtt/issues/19440 ([1c78360](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1c78360dedd727f6287e2da6eadd52c3681e445e))
* **add:** TS0601_fan_and_light_switch ([#6339](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6339)) ([5fbcda2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5fbcda26a2441651347bb27a638c76b2eb93c563))
* Expose `action_direction`, `action_type` and `action_time` for Philips 8719514440937/8719514440999 ([#6321](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6321)) ([0f145e3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0f145e33feaa5fe5a3565f50706fa3ff1812cf27))
* Expose vibration for Bosch BSEN-CV ([#6340](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6340)) ([12e190c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/12e190c5dbdf2fe1d9de48491d7d955719059f45))
* Support setting vacation_mode on Ubisys H1 ([#6342](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6342)) ([d6996a6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d6996a6ee905e1b174ca4e0906481ae0c9023793))


### Bug Fixes

* **detect:** Detect `WheelThermostat_v1.0` as Vimar 02973.B https://github.com/Koenkk/zigbee2mqtt/issues/19389 ([3faa4db](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3faa4dbab09da692981ca7368e1a5adbb0668dd2))
* **ignore:** Fix Moes BHT-002-GCLZB `current_heating_setpoint` by 10. https://github.com/Koenkk/zigbee2mqtt/issues/19412 ([dd423f1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dd423f15f0971571380e7664d828a7d0d7779fd2))
* **ignore:** Reduce LYWSD03MMC reporting interval ([#6338](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6338)) ([fab8c33](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fab8c332f69946ed3b610e0980c025be29267a82))

## [15.102.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.101.0...v15.102.0) (2023-10-25)


### Features

* **add:** L258 ([#6191](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6191)) ([c5365fa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c5365faae4505644affa74db75e271c472915fb9))


### Bug Fixes

* **detect:** Detect `TY0201` as TuYa TS0201 ([#6329](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6329)) ([df61379](https://github.com/Koenkk/zigbee-herdsman-converters/commit/df613797c4ab679d5a9676358978729e898a3563))
* Fix ELKO 4523430 updating every second ([#6336](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6336)) ([d9bb5e5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d9bb5e5f8276ccd505bb13af3be59f38e00c6fb0))
* Fix set LiXee ZLinky_TIC default `measurement_poll_chunk` to 4 to reduce spamming https://github.com/fairecasoimeme/Zlinky_TIC/issues/194 ([b930eee](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b930eeec4761370e4202d2c483f720eec5381f7f))
* Fix TuYa ZG-205Z/A description ([#6335](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6335)) ([68f391d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/68f391dce4c3dc368b8a6106b795384145f7424e))

## [15.101.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.100.0...v15.101.0) (2023-10-23)


### Features

* Support child lock for SONOFF TRVZB ([#6328](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6328)) ([39d7d54](https://github.com/Koenkk/zigbee-herdsman-converters/commit/39d7d5403218e027168fbf4a0915911c0afffd6a))


### Bug Fixes

* **detect:** Detect `_TZ3000_xdo0hj1k` as Lonsonho TS130F_dual https://github.com/Koenkk/zigbee2mqtt/issues/19393 ([7dfacf6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7dfacf6708d7d687ee2f125ffcb33456ce70e3ac))
* **detect:** Detect `_TZE200_ywe90lt0` as TuYa TS0601_light ([#6324](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6324)) ([89744d2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/89744d21919eca9f6c9acf3f91293bd620581699))
* Fix duplicate actions for TuYa ERS-10TZBVK-AA and ERS-10TZBVB-AA ([#6326](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6326)) ([d69dc7a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d69dc7a13fbf9254219c5cfda84e50f5629bf1d0))
* Fix timeout of Gledopto GL-SD-003P https://github.com/Koenkk/zigbee2mqtt/issues/8349 ([f9547ce](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f9547ce7dc01674fecb078e0980ac0602e23d0b3))

## [15.100.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.99.0...v15.100.0) (2023-10-22)


### Features

* Support OTA for Candeo C202 https://github.com/Koenkk/zigbee2mqtt/issues/19370 ([b211cc4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b211cc4c1be5f9dde201e511ff3f50716ed25bbc))
* Support OTA for Candeo HK-DIM-A https://github.com/Koenkk/zigbee2mqtt/issues/19370 ([ca79905](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ca799050c761ff8268e57227db36e6beffe8d35c))


### Bug Fixes

* Fix Lidl PSBZS A1 reset frost lock ([#6319](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6319)) ([1e98c20](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1e98c203332ac72fccf6a8afff1c7ed5a619e8e1))
* Fix OTA cluster missing for Xiaomi QBKG04LM https://github.com/Koenkk/zigbee2mqtt/issues/19369 ([ad7d02a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ad7d02a87b5ed96de0704392e0e860ad9c3887df))
* **ignore:** update dependencies ([#6323](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6323)) ([447615f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/447615f163ca2c8656a45d4a272c55418a817a09))

## [15.99.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.98.0...v15.99.0) (2023-10-21)


### Features

* **add:** ZC-HM ([#6309](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6309)) ([5cd3ff2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5cd3ff2ca6bb9469e19cce4bad9bac06f9b0e7da))
* PTVO device converter improvements. ([#6318](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6318)) ([e480d23](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e480d23d8e5a3e08ba5977cacf4890518292b61e))


### Bug Fixes

* **detect:** Detect `TRADFRI bulb E26 WW G95 CL 450lm` as IKEA LED2102G3 ([#6315](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6315)) ([c5b7cee](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c5b7cee1c249208437b518ff7adf924866966aab))
* Fix various values for `_TZE200_5toc8efa` divided by 10 ([#6316](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6316)) ([d7ef1a8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d7ef1a8effa29692156062774bbd4724bcbbfd3c))

## [15.98.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.97.0...v15.98.0) (2023-10-20)


### Features

* Expose more actions for TuYa TS004F and add `_TZ3000_nuombroo` ([#6303](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6303)) ([e81ba3f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e81ba3f4c8c24c87cbe512e7a35fde088be3e759))


### Bug Fixes

* **detect:** Detect `_TZE204_1fuxihti` as TuYa TS0601_cover_1 https://github.com/Koenkk/zigbee2mqtt/issues/19000 ([de3e73d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/de3e73d48221388de0ca36c899508574429c13ce))
* **detect:** Detect `929003531602` as Philips 915005996901 ([#6310](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6310)) ([e5b3f20](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e5b3f2061233ff2500905ab9563d424798c8a86f))
* **detect:** Update fingerprints for Vesternet Zigbee devices ([#6311](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6311)) ([4a8d546](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4a8d546d9c1150d81e42d56a85e2315c32c4ed11))
* Fix invalid 0 measurements for `_TZ3000_cehuw1lw` https://github.com/Koenkk/zigbee2mqtt/issues/16709 ([75d2870](https://github.com/Koenkk/zigbee-herdsman-converters/commit/75d28701a7b321ab95c4137a4ce753ff329a2178))
* Fix state and position of TuYa TS0601_cover_6 inverted https://github.com/Koenkk/zigbee2mqtt/issues/17436 ([c31f402](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c31f40277521b16dbdd178b15fd05a5af1cc2f3d))

## [15.97.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.96.0...v15.97.0) (2023-10-18)


### Features

* **add:** 1005318 ([#6304](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6304)) ([bda4f6d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bda4f6deb2e10d54a9e88780b613dd5aa39d8561))


### Bug Fixes

* **detect:** Detect `_TZB210_lmqquxus` as MiBoxer FUT035Z https://github.com/Koenkk/zigbee2mqtt/issues/16768 ([9564e0c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9564e0c9fbd24106b51c7dc8a9c660564a050e6b))
* **detect:** Detect `_TZE204_e5m9c5hl` as Wenzhi WZ-M100-W ([#6308](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6308)) ([389f8f2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/389f8f2b363113e21697fad0847ff1c0b61869ad))
* Fix `maxContentLength size of -1 exceeded` when trying to update Ubisys devices ([#6305](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6305)) ([e687d2b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e687d2ba575a34dbae9e8a2a1a50c840d0ac8d4a))
* **ignore:** Move `LYWSD03MMC` to `Custom devices (DiY)` https://github.com/Koenkk/zigbee-herdsman-converters/pull/6301 ([b35b8e5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b35b8e57c560c6951acdc40d0c7bfc8e37dad78e))

## [15.96.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.95.0...v15.96.0) (2023-10-17)


### Features

* **add:** 9290031512 https://github.com/Koenkk/zigbee2mqtt/issues/19323 ([670e0e2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/670e0e24e0aaba1980091ccde6274fec7d56c165))
* **add:** 929003598101 ([#6300](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6300)) ([51fc08f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/51fc08faee0760489588d7becd98b1eaf8d71f6b))
* **add:** LYWSD03MMC ([#6301](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6301)) ([c851073](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c851073cc42c195877650801da7f9b38989dcea5))
* Expose calibrate option for Xiaomi SRTS-A01 https://github.com/Koenkk/zigbee2mqtt.io/pull/2274 ([2a58fbe](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2a58fbef89b13d28334c49ef6fa60f4562646b64))


### Bug Fixes

* **detect:** Detect `_TZE200_z1tyspqw` as id3 GTZ06 https://github.com/Koenkk/zigbee2mqtt/issues/19321 ([500c53a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/500c53aacf5f7150280a3655b731f1c148f55784))
* **ignore:** fix 2a58fbef89b13d28334c49ef6fa60f4562646b64 ([41c7f29](https://github.com/Koenkk/zigbee-herdsman-converters/commit/41c7f29677ca410e4fb2834e7b7b53aebc3cc077))
* **ignore:** fix 500c53a ([df577b8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/df577b8f3b1351fe5ee66be5e0f733499fd8d1aa))
* Reduce LiXee ZLinky_TIC spamming https://github.com/fairecasoimeme/Zlinky_TIC/issues/194 ([c665f88](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c665f880b2ea59530c8391c9309263b0a11be2a5))

## [15.95.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.94.2...v15.95.0) (2023-10-16)


### Features

* **add:** 9290030520 ([#6288](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6288)) ([6db7bfa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6db7bfa16c42e2a3fdcc239e9edc475e34011cbb))
* **add:** 929003498601 ([#6295](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6295)) ([b5a6a0b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b5a6a0beaab2af7603214d2d72eba5a6b12b42e3))
* **add:** OSP 210 ([#6294](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6294)) ([3456444](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3456444feea924e62390f4d260aebb0383c1df45))
* **add:** VZM35-SN ([#6290](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6290)) ([0b4b49c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0b4b49c8ae5bb32e5063c05ff1beb0c5a0665123))


### Bug Fixes

* **detect:** Detect `_TZ3000_yfekcy3n` as TuYa DS04 ([#6296](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6296)) ([acf1004](https://github.com/Koenkk/zigbee-herdsman-converters/commit/acf1004dc68155b083e9a568fe19cc2325231ff3))
* **detect:** Detect `_TZE200_jkbljri7` as TuYa MIR-HE200-TY ([#6293](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6293)) ([90913a2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/90913a20323cdb1a2f3f15f5279576a97d8bd8be))
* **detect:** Detect `FEB56-ZSN26YS1.3` as Nue / 3A HGZB-045 ([#6292](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6292)) ([cbe9760](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cbe976079e5cd20c8cb325d0a09dcee698eba2d0))
* **detect:** Detect `TRADFRI bulb E26 CWS 810lm` as IKEA LED1924G9 ([#6291](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6291)) ([b1917d3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b1917d3dae6f8e051edde307ea81a69a562ee5ea))
* **ignore:** Revert "fix: Fix incorrect Yookee D10110 cover position ([#6211](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6211))" ([#6289](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6289)) ([33c36fd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/33c36fd1587b073d53479dcdac9056316d870d8f))

## [15.94.2](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.94.1...v15.94.2) (2023-10-15)


### Bug Fixes

* **detect:** Detect `_TZ3000_empogkya` as Zemismart ZM-L03E-Z and `_TZ3000_lubfc1t5` as TuYa M10Z ([#6281](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6281)) ([2f60e66](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2f60e663d1631ad72f5eeb1474b3ba2444a1453c))
* **detect:** Detect `PCM002` as Philips 915005733701 ([#6287](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6287)) ([7d8c4a5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7d8c4a5ade0c69028a41adee760360d084584ec3))
* Fixes for `_TZE200_5toc8efa` thermostat ([#6276](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6276)) ([4d3212f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4d3212f8c9c68fef250a571d3059b88c03e7a63b))
* **ignore:** update dependencies ([#6285](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6285)) ([c3e8a76](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c3e8a7695df174c99ed09ff12c1df02b03c7df2e))

## [15.94.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.94.0...v15.94.1) (2023-10-14)


### Bug Fixes

* **detect:** Detect ` Smart shedder module` as Legrand 412172 @Rjevski https://github.com/Koenkk/zigbee2mqtt/issues/19242 ([4f9e053](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4f9e053d7e2b7c37ea54ace397903d489d09ce45))
* **detect:** Detect `_TZE200_e5hpkc6d` as Futurehome Co020 ([#6279](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6279)) ([72d3775](https://github.com/Koenkk/zigbee-herdsman-converters/commit/72d3775384c771ef8054c8ef9dd08b036070319a))
* **ignore:** Refactor fromZigbee to TS ([#6284](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6284)) ([602a921](https://github.com/Koenkk/zigbee-herdsman-converters/commit/602a921d42dfef31b7ba5a3c899f2e2daadab00f))

## [15.94.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.93.0...v15.94.0) (2023-10-13)


### Features

* **add:** KK-LP-Q01D [@sj8023ld](https://github.com/sj8023ld) https://github.com/Koenkk/zigbee2mqtt/issues/19285 ([d19daae](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d19daaef69687dc66738c627e03fa1dc7be5852c))
* **add:** KK-LP-Q02D, KK-LP-Q03D, KK-QD-Y01w ([#6278](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6278)) ([6230454](https://github.com/Koenkk/zigbee-herdsman-converters/commit/623045479aa62c0ca08ad88c1b26e2b086336c3a))


### Bug Fixes

* **detect:** Detect `_TZ3000_u3nv1jwk` as TuYa TM-YKQ004 https://github.com/Koenkk/zigbee2mqtt/issues/19264 ([010de26](https://github.com/Koenkk/zigbee-herdsman-converters/commit/010de26a7f3b0ed7eb67c8987a73724a2c513064))
* **detect:** Detect `_TZE200_dikkika5` as KOJIMA KOJIMA-THS-ZG-LCD [@do6pbln9l](https://github.com/do6pbln9l) https://github.com/Koenkk/zigbee2mqtt/issues/19275 ([83873bc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/83873bce9dd6ae275788b98e25d7b093fe0ee7df))
* **detect:** Detect `_TZE204_zougpkpy` as TuYa DY-RQ500A @Waterbrain https://github.com/Koenkk/zigbee2mqtt/issues/19256 ([b9f0fb1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b9f0fb190d9784d693605512fc01149ee05419b4))

## [15.93.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.92.1...v15.93.0) (2023-10-12)


### Features

* **add:** CTL-R1-TY-Zigbee ([#6264](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6264)) ([18f68d6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/18f68d6c8d123f1e216b8a662f8f8c68a7fdc92a))
* **ignore:** Enable incremental TSC builds ([#6273](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6273)) ([d54d5a6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d54d5a6a13502ea042c9aa92bb60fd31677d3c69))
* Increase max supported pincodes to 1000 for Onesti Products AS easyCodeTouch_v1 ([#6271](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6271)) ([40defe1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/40defe13d8184c1f985dda06e10bd60e3922339f))


### Bug Fixes

* **detect:** Detect `_TZ3000_qgwcxxws` as TuYa MINI-ZSB https://github.com/Koenkk/zigbee2mqtt/issues/19259 ([6e5e81d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6e5e81dee44e277ba0ebc72e0b3ff2cd2bbde27c))
* **detect:** Detect `_TZ3210_mja6r5ix` and `_TZ3210_it1u8ahz` as TS0505B_2 ([#6266](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6266)) ([10d6da4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/10d6da40a00b5a8e0ac9dbaf8f26fe9e64adff9b))
* **detect:** Detect `_TZE204_hlx9tnzb` as Moes ZS-SR-EUD-1 https://github.com/Koenkk/zigbee2mqtt/issues/19272 ([121d790](https://github.com/Koenkk/zigbee-herdsman-converters/commit/121d790f7173695edc6f0844a7ef6c2e55b2075c))
* Fix invalid 0 power measurements for TuYa `_TZ3000_1h2x4akh` https://github.com/Koenkk/zigbee2mqtt/issues/16709 ([f03d6fc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f03d6fce29484bb2a7627049c29967a5d77fe586))
* **ignore:** fix 803c995 ([ea15a0e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ea15a0e4516b9894092689741dcaf90447b99af0))
* Normalise various vendor names ([#6270](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6270)) ([3e2b500](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3e2b5002dc468faf08adbe4083bda83e6dbef46a))

## [15.92.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.92.0...v15.92.1) (2023-10-10)


### Bug Fixes

* **ignore:** dummy change to trigger update ([487436f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/487436f66e5999b66763a5d498edb5dd21e7c010))

## [15.92.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.91.0...v15.92.0) (2023-10-10)


### Features

* **add:** 9290031508 ([#6258](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6258)) ([af74d48](https://github.com/Koenkk/zigbee-herdsman-converters/commit/af74d48b1da2d91bdf5c5e984d15f1c659310635))


### Bug Fixes

* **detect:** Detect `_TZ3000_3uimvkn6` as Lidl HG08673-BS https://github.com/Koenkk/zigbee2mqtt/issues/19230 ([bc02465](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bc02465132b58243db8db601291861c11a8db9cb))
* Various fixes for Bosch BTH-RM ([#6261](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6261)) ([d2cf9bf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d2cf9bfa198006cd8862f5517976a867cee15776))

## [15.91.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.90.0...v15.91.0) (2023-10-09)


### Features

* **add:** 1744230P7 ([#6257](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6257)) ([dc32e87](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dc32e87b9bf48785e290aab543f78dcdfabde600))
* **add:** HS1MIS-3.0 [@mario42004](https://github.com/mario42004) https://github.com/Koenkk/zigbee2mqtt/issues/19233 ([567a749](https://github.com/Koenkk/zigbee-herdsman-converters/commit/567a749416590d048bb6ed788c27a9545ac8450b))
* **add:** LED2107C4 [@ggtimtom](https://github.com/ggtimtom) https://github.com/Koenkk/zigbee-herdsman-converters/issues/6253 ([bf93bf4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bf93bf4cd8d973b0547c39186c41e92c2e3a3d46))
* **ignore:** Enable incremental TSC builds ([#6260](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6260)) ([f7be0f9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f7be0f96da5c6cf68fb0e9802c674e4ccaaaa744))
* Support action, identify and led_in_dark for Legrand 067776 switches  ([#6256](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6256)) ([4f07af6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4f07af6d90f7682d82f7f35158642e3ad74f8bd9))


### Bug Fixes

* **detect:** Detect `_TZ3000_wlquqiiz` as TuYa TS0207_repeater https://github.com/Koenkk/zigbee2mqtt/issues/19196 ([e639392](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e6393923c6d747181017b88a61d71ef9ad958118))
* **detect:** Detect `_TZE200_ttcovulf` as TuYa ZG-204ZL ([#6254](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6254)) ([fd8f01a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fd8f01a6832126cb60aa1e203139730a7af82762))
* **detect:** Detect `_TZE200_upagmta9` as TuYa ZTH05 https://github.com/Koenkk/zigbee2mqtt/issues/19216 ([15ffc51](https://github.com/Koenkk/zigbee-herdsman-converters/commit/15ffc51c15d4a3f2590da574fecbecf9fd510be6))
* Fix presence and detection distance for TuYa ZY-M100-24G ([#6259](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6259)) ([f796697](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f796697e69479e2ba5d62013e462698377801275))
* Fix read commands for Inovelli VZM31-SN not working https://github.com/Koenkk/zigbee2mqtt/issues/16609 ([803c995](https://github.com/Koenkk/zigbee-herdsman-converters/commit/803c995935bfa59539d533a9b9298b4601252128))
* **ignore:** Legrand and Bticino readability improvements ([#6252](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6252)) ([f277bef](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f277bef2f84d50aea70c25261db0c2ded84b7396))
* Remove OTA from Moes BRT-100-TRV since it bricks device https://github.com/Koenkk/zigbee2mqtt/issues/18840 ([26951d7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/26951d7fba9636c34c4d7da09fc40de49f817981))

## [15.90.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.89.1...v15.90.0) (2023-10-08)


### Features

* **add:** 550B1024 https://github.com/Koenkk/zigbee2mqtt/issues/18538 ([a6036e3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a6036e312732c4208770748d9ed2067939615815))
* Support more features for Legrand 067772 ([#6247](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6247)) ([40aaf57](https://github.com/Koenkk/zigbee-herdsman-converters/commit/40aaf5711e4aaa03488c53eb8c3ac888da39c183))


### Bug Fixes

* **detect:** Detect `_TZ3000_nlsszmzl` as TuYa TS0207_repeater https://github.com/Koenkk/zigbee2mqtt/issues/19196 ([a2de545](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a2de5453b96c7c83cbe3df25d985452bced0b096))
* Fix typo in OTA and add more debug logging ([#6250](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6250)) ([95c187a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/95c187ae418f5f1fbcdb3464b209fa89ebfcb4dc))
* Fixes for `_TZE200_5toc8efa` thermostat ([#6237](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6237)) ([a5c26e5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a5c26e5ebed9966981ea642b07d4f934330352c3))

## [15.89.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.89.0...v15.89.1) (2023-10-07)


### Bug Fixes

* Fix some OTA updates not working due to incorrect transaction sequence number. https://github.com/Koenkk/zigbee2mqtt/issues/19129 ([f615b7e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f615b7ea1e6de6bacada1ab68855cb7053159f1a))
* **ignore:** update dependencies ([#6246](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6246)) ([3de0e50](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3de0e50f743fbcd2703da7f3e75b2d22631b10f8))
* Remove unsupported tamper from `_TZ3000_n2egfsli` and `_TZ3000_2mbfxlzr` ([#6244](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6244)) ([f99a503](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f99a50342d51b5589ffa2a43c8e7635b60c0fc21))
* Rename SPM01 to Yagusmart SPM01-D2TZ ([#6228](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6228)) ([9316178](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9316178f59c8f1c67e12a0240ffcdca1aad32b51))

## [15.89.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.88.0...v15.89.0) (2023-10-06)


### Features

* **add:** FL 142 C ([#6241](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6241)) ([d1e38e3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d1e38e33b649fc40f5e11f66948d60cbd843bd61))


### Bug Fixes

* **detect:** Detect `_TZ3000_bsvqrxru` as TuYa HW500A ([#6230](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6230)) ([f631811](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f631811ad2cee081a37b0676fabdf9a33d505f3e))
* **detect:** Detect `_TZ3000_fllyghyj` as TuYA TH02Z ([#6238](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6238)) ([0f578ed](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0f578edbbe0e4bd72106c92131dab2ccec7d5090))
* **detect:** Detect `_TZ3000_mugyhz0q` as TuYa 899WZ  ([#6231](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6231)) ([412590c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/412590c54a576bb479b7ab041d90e00f8a6b71f3))
* **detect:** Detect `_TZE200_rccxox8p` as TuYa PA-44Z https://github.com/Koenkk/zigbee2mqtt/issues/17524 ([a58e85d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a58e85d19eab8a2b756a3dc938483b31288eb3ae))
* **detect:** Detect `_TZE204_dtzziy1e` as TuYa MTG275-ZB-RL ([#6235](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6235)) ([d72a6d4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d72a6d45df01cf6c5b8f936b27193a535220f5fa))
* **detect:** Detect `250bccf66c41421b91b5e3242942c164` as ORVIBO DD10Z ([#6242](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6242)) ([fb92ce1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fb92ce17796a9e7519755158332ef76c30e76066))

## [15.88.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.87.0...v15.88.0) (2023-10-05)


### Features

* **add:** SP02-ZB001 ([#6234](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6234)) ([7fa9429](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7fa9429929e5b8978a0a9f217511a96ed0d6622d))
* Expose more actions for iCasa ICZB-KPD14S and ICZB-KPD18S ([#6222](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6222)) ([6bbf333](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6bbf3339356deabff2ce5c0f989e651faefd6345))


### Bug Fixes

* **detect:** Detect `_TZ3000_2mbfxlzr` as TuYa MC500A ([#6239](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6239)) ([ebfc824](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ebfc824e7c15af62a0a5dcb135d092e82eac2373))
* **detect:** Detect `_TZ3000_7d8yme6f` as TuYa ZD08 ([#6240](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6240)) ([65bc25a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/65bc25ade5313e62501de6f9e10fda74dc4a4b27))
* **detect:** Detect `_TZ3000_lugaswf8` as TuYa ZG-2002-RF ([#6236](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6236)) ([851fe33](https://github.com/Koenkk/zigbee-herdsman-converters/commit/851fe330a3bff181558f1efa70cb30dbaba5efa7))
* **detect:** Detect `_TZ3000_mrpevh8p` as TuYa SH-SC07 ([#6225](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6225)) ([465413a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/465413a49df8ae413ca1605b841525620a9da5cc))
* **detect:** Detect `_TZE204_e5hpkc6d` as Connecte 4500994 https://github.com/Koenkk/zigbee2mqtt/issues/19174 ([853e8d8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/853e8d83826389e7a1e1f1796ddad1d87244e08b))
* **detect:** Detect `_TZE204_iik0pquw` as ZYXH TY-04Z ([#6226](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6226)) ([19e8dc3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/19e8dc35017ecd4ee48fc3a2c14dbd918826526b))
* Normalise some vendor names ([#6232](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6232)) ([b2119ce](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b2119ce46cf85f47c8f4dff539f5b5ef16c5d71d))
* Rename `900024` to `900024/12253` and support hue and saturation https://github.com/Koenkk/zigbee2mqtt/issues/18941 ([4c1e41c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4c1e41c774349494924638b88d1a4222cc37a717))

## [15.87.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.86.1...v15.87.0) (2023-10-03)


### Features

* Expose battery for Schneider Electric WV704R0A0902 ([#6220](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6220)) ([6957b4f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6957b4f12906f6fdb7fc5056031191a80af09bdc))


### Bug Fixes

* **detect:** Detect `_TZE204_clrdrnya` as TuYa MTG075-ZB-RL @LuisAlbertoFP https://github.com/Koenkk/zigbee2mqtt/issues/18677 ([5c98b41](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5c98b417aac7d0dba07228efacd6953279bce01b))
* Fix `local_temperature` divided by 10 for `_TZE200_5toc8efa` https://github.com/Koenkk/zigbee2mqtt/issues/18791 ([e12a381](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e12a381e046afaae8935070977166ff76a3d47e0))
* Fix incorrect Yookee D10110 cover position ([#6211](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6211)) ([2edb88a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2edb88a076eba4448861a60013ab8174f7220764))

## [15.86.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.86.0...v15.86.1) (2023-10-03)


### Bug Fixes

* Correct typos ([#6213](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6213)) ([8e17b4e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8e17b4e7abdda2e04cae42218d14d0b517983438))

## [15.86.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.85.0...v15.86.0) (2023-10-03)


### Features

* **add:** 552-720X1, 552-720X2 ([#6216](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6216)) ([08aeb57](https://github.com/Koenkk/zigbee-herdsman-converters/commit/08aeb57a29845b38f70ef961850e368f9a182c8d))
* **add:** BSEN-CV ([#6218](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6218)) ([d2ba8a1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d2ba8a106c09991b78abd78253366593ac3ddf6d))
* **add:** LED2201G8 https://github.com/Koenkk/zigbee2mqtt/issues/19118 ([db966bc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/db966bcb43f18bf26dbe47189bbdb6413f8259ac))
* **add:** MOT-C1ZxxC/F ([#5788](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5788)) ([893fa57](https://github.com/Koenkk/zigbee-herdsman-converters/commit/893fa578581d1303741b9e3194377af4a0441a65))


### Bug Fixes

* **detect:** Detect `_TZ3000_h8ngtlxy` as TuYa ZN231392 ([#6208](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6208)) ([b1a697e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b1a697e29ffdd30df8ba7afe4fda218c8a151fc4))
* **detect:** Detect `_TZ3000_lf56vpxj` as TuYa ZP01 https://github.com/Koenkk/zigbee2mqtt/issues/19105 ([69bc287](https://github.com/Koenkk/zigbee-herdsman-converters/commit/69bc2877b7841a60bf137961dcbfe07f43bf28c2))
* **detect:** Detect `_TZ3000_zl1kmjqx` as TuYa IH-K009 ([#6210](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6210)) ([efce388](https://github.com/Koenkk/zigbee-herdsman-converters/commit/efce3883082e10cd4c73c7d854a4ad15e03f2814))
* **detect:** Detect `_TZ3210_rcggc0ys` as Moes ZLD-RCW_2 https://github.com/Koenkk/zigbee2mqtt/issues/19130 ([0587220](https://github.com/Koenkk/zigbee-herdsman-converters/commit/05872205c00be503630898c67936a5948090d362))
* **detect:** Detect `_TZE200_bkkmqmyo` as Hiking DDS238-2 https://github.com/Koenkk/zigbee2mqtt/issues/19117 ([f823fe2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f823fe2569ed4b0613023a5be9d2910922416665))
* **detect:** Detect `_TZE200_rtrmfadk` as TuYa TS0601_thermostat_1 https://github.com/Koenkk/zigbee2mqtt/issues/19103 ([edf7a49](https://github.com/Koenkk/zigbee-herdsman-converters/commit/edf7a49e00feebd98557e14610f31711ab3151c2))
* Fix typo ([#6212](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6212)) ([c4d597e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c4d597e98ee293993f6cb58e432e7fb44bb598e1))
* Fix `_TZE200_5toc8efa` `current_heating_setpoint` multiplied by 10 https://github.com/Koenkk/zigbee2mqtt/issues/18791 ([8c4d1e3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8c4d1e377e7096dbd1dabedc9ca79106568db0b9))
* Fix battery missing for Zemismart ZM85EL-2Z https://github.com/Koenkk/zigbee2mqtt/issues/18413 ([424476f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/424476fe561f0c430f99b4fe10e19fd621d954c5))
* Fix invalid device model for `TRADFRI bulb GU10 WS 345lm` ([#6217](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6217)) ([3154183](https://github.com/Koenkk/zigbee-herdsman-converters/commit/31541836b67be651fd7e757c2173af2576dfc085))
* **ignore:** correct typos ([#6214](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6214)) ([dc17051](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dc17051ffcad9eeb2b8225e4900d98206f6d5a1f))
* **ignore:** correct typos ([#6215](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6215)) ([a9165c3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a9165c3c7574307d3b14a7aa9da4cc6e8ddf9f0f))
* **ignore:** update dependencies ([#6209](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6209)) ([accc23e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/accc23ed8c39e549703db2ca7e1e6b993eab1803))
* Rename `BHT-006GBZB` to `BHT-002/BHT-006` https://github.com/Koenkk/zigbee2mqtt/issues/19091 ([1f7528d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1f7528d4da324ad4ff74d95c3d9a4fd618d2dd8e))

## [15.85.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.84.0...v15.85.0) (2023-09-28)


### Features

* **add:** 4512765 ([#6204](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6204)) ([0b78786](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0b7878650ca2bbfe4a13d086abcb66d3499b2e13))


### Bug Fixes

* **detect:** Detect `3450-Geu` as Iris 3450-L https://github.com/Koenkk/zigbee2mqtt/issues/19101 ([d118ec6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d118ec685b54838edce6ec03866aaf95a6c0b77b))

## [15.84.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.83.0...v15.84.0) (2023-09-27)


### Features

* **add:** 9290035753 ([#6200](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6200)) ([86fd64d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/86fd64d1126a04dd31782786c9559e8828495237))
* **add:** BLE-YL01 [@cloudbr34k84](https://github.com/cloudbr34k84) https://github.com/Koenkk/zigbee2mqtt/issues/18704 ([b98aace](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b98aacee6c35fbe19a44b1ef3d1d3ea64a57f54c))
* Expose `low_water_temp_protection` for Sinopé RM3500ZB ([#6201](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6201)) ([e5362d4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e5362d412ef9fa7ee06e2cb85323ed376848ce02))
* Support color for Philips 7602031N6 ([#6202](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6202)) ([7fb0917](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7fb09179207cb97a8fb6da5fc6ff92ade2c04291))


### Bug Fixes

* **ignore:** fix b98aacee6c35fbe19a44b1ef3d1d3ea64a57f54c ([1001027](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1001027b46f6490e0ddf91e9d7e2536d81628378))

## [15.83.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.82.0...v15.83.0) (2023-09-26)


### Features

* **add:** 8719514491229 [@ckref](https://github.com/ckref) https://github.com/Koenkk/zigbee2mqtt/issues/19073 ([b24aa12](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b24aa1272d5ba1924866c7bcb03260791d1b18e4))


### Bug Fixes

* **detect:** Detect `_TZ3000_qeuvnohg` as Tongou TO-Q-SY1-JZT https://github.com/Koenkk/zigbee2mqtt/issues/19086 ([7962848](https://github.com/Koenkk/zigbee-herdsman-converters/commit/79628488555716c6d6cdd3cb5159abeb2cc053b6))
* **detect:** Detect `_TZE204_rhblgy0z` as TuYa TS0601_din_3 https://github.com/Koenkk/zigbee2mqtt/issues/19080 ([885f992](https://github.com/Koenkk/zigbee-herdsman-converters/commit/885f9928460b98dcc41971a1a7b23387e07e160a))
* **detect:** Detect `_TZE204_upagmta9` as TuYa ZTH05 ([#6198](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6198)) ([5043907](https://github.com/Koenkk/zigbee-herdsman-converters/commit/50439077f9c0df08c790ab8a502b670b7d35bb8b))
* **detect:** Detect `TRADFRIbulbG125E26WSopal470lm` as IKEA LED1936G5 https://github.com/Koenkk/zigbee2mqtt/discussions/19084 ([eb30b05](https://github.com/Koenkk/zigbee-herdsman-converters/commit/eb30b053e091ad75b69301959a701ae3be88ddf4))

## [15.82.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.81.1...v15.82.0) (2023-09-24)


### Features

* **add:** 9290035639 [@nullcreek](https://github.com/nullcreek) https://github.com/Koenkk/zigbee2mqtt/issues/19054 ([169998e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/169998eb747a5e2b17f932015c04c36519036e78))
* **add:** 929003596101 [@sympapa](https://github.com/sympapa) https://github.com/Koenkk/zigbee2mqtt/issues/19064 ([9560079](https://github.com/Koenkk/zigbee-herdsman-converters/commit/956007923011beedb359400ff8b1144f9e4d8269))
* **add:** MEG5116-0300/MEG5171-0000 ([#6194](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6194)) ([9f31dbb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9f31dbb90fe000db155be54b8db8600af42193f2))
* Support min/max brightness and countdown for TuYa TS0601_dimmer_3 ([#6190](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6190)) ([2c820cf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2c820cf133b8612d3401a29abf62c60b07b75839))


### Bug Fixes

* **detect:** Detect `_TZE204_ptaqh9tk` as TuYa TS0601_switch https://github.com/Koenkk/zigbee2mqtt/issues/18337 ([f92ffc9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f92ffc9a1034aaf5bc74414a9fe7b64aad9b0807))
* **detect:** Detect `SMARTCODE_DEADBOLT_10_W3_L` as Kwikset 99140-031L ([#6196](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6196)) ([3e84210](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3e8421087ec630ea07794f72bf98f60392bf3cdf))
* Fix Legrand OTA not working ([#6193](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6193)) ([cba37b6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cba37b6a7d560a0dd9420e7f06a3d74a43ce8d23))
* **ignore:** fix link in cba37b6a7d560a0dd9420e7f06a3d74a43ce8d23 ([e01c192](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e01c1920a18a76a3eee0a8e06ecf5d04bcd5b885))
* **ignore:** update dependencies ([#6195](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6195)) ([b7ec8a3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b7ec8a32124d7176d70e885fff13700e326bb8df))

## [15.81.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.81.0...v15.81.1) (2023-09-21)


### Bug Fixes

* Fix battery missing for `_TZE200_pw7mji0l` (Zemismart ZM25EL). https://github.com/Koenkk/zigbee2mqtt/issues/18939 ([3dc555b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3dc555becbee8bf00c82d26a20aa50bfd92008cf))
* Fix power source missing for 1402769 https://github.com/Koenkk/zigbee2mqtt/issues/19036 ([7876d5c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7876d5c840581e60b1efe0dda0e6c884d1de8795))
* Improve missing TuYa datapoint logging https://github.com/Koenkk/zigbee2mqtt/issues/19011 ([76a4aa4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/76a4aa4cc467f2d204b54b99aeff9752fc5ae4d9))

## [15.81.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.80.0...v15.81.0) (2023-09-20)


### Features

* **add:** rtsc11r @MasterFeige https://github.com/Koenkk/zigbee2mqtt/issues/18963 ([54ffe76](https://github.com/Koenkk/zigbee-herdsman-converters/commit/54ffe76c8e6ad6d22c402d16b525cd4d273d3c0d))
* **add:** TYBAC-006 ([#6174](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6174)) ([c1083ba](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c1083ba745467c10966ec9fde25aec4ef4be42d7))


### Bug Fixes

* **detect:** Detect `E220-KR5N0Z0-HA` as LELLKI WP33-EU/WP34-EU ([#6185](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6185)) ([9e563a5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9e563a57bc63bb99333e28dee14f1300f4925b73))
* **detect:** Detect `SWITCH-ZR03-2` as eWeLink ZB-SW02 [@zdenekstepanek](https://github.com/zdenekstepanek) https://github.com/Koenkk/zigbee2mqtt/discussions/19024 ([64ca85e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/64ca85e3d4c7a1a019c232bac922bf88a826b21f))
* Fix inconsistent second units (s) ([#6187](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6187)) ([2ba421b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2ba421b9c7be17dbe2794226df8c8883f903e764))

## [15.80.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.79.0...v15.80.0) (2023-09-19)


### Features

* Add OTA support for Xiaomi `LLKZMK12LM` ([#6180](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6180)) ([67977d4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/67977d4c99e2308913600010bd793efed9e0bcd2))
* **add:** 8718696126523 https://github.com/Koenkk/zigbee2mqtt/issues/19020 ([49c4453](https://github.com/Koenkk/zigbee-herdsman-converters/commit/49c4453fe99de23c0971534d4368ab456c20c3d3))
* **add:** 8719514491342 ([#6178](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6178)) ([0202524](https://github.com/Koenkk/zigbee-herdsman-converters/commit/02025249792d0afc01b405220213038200f6b1aa))
* **add:** 9290036745 ([#6179](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6179)) ([e3b1adb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e3b1adb60df42507c8938e0fd3e725b6bba7a170))
* **add:** SS300 ([#6173](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6173)) ([c78fad1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c78fad16e46648156b25dcec877b00642b9f1dca))
* **add:** TS0601_pir @Bacchus777 https://github.com/Koenkk/zigbee2mqtt/issues/12883 ([121edf1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/121edf1bac103aeb1f5e5612afd4a4ed34e37f24))
* **add:** VM-Zigbee-S02-0-10V ([#6176](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6176)) ([22a0008](https://github.com/Koenkk/zigbee-herdsman-converters/commit/22a000860137cb1e150eb418016d299ff9beaa2d))
* **add:** ZK03839 https://github.com/Koenkk/zigbee2mqtt/issues/19018 ([0ab9aa7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0ab9aa73c18db8c97d58631ab23bc530846081b2))
* Expose `power_on_behavior` and `backlight_mode` for TuYa TS0601_dimmer_1, TS0601_dimmer_2 and TS0601_dimmer_3 ([#6172](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6172)) ([3d27893](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3d2789341a5dfe4ddbc3a55b90c2ad1698907353))


### Bug Fixes

* Arm mode and melody fix for NAS-AB06B2 ([#6182](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6182)) ([42bbfaf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/42bbfaf53d26a78d21920ce3be7f5573eea3fb3b))
* Fix PJ-1203A power_factor divided by 100 ([#6181](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6181)) ([472f8d7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/472f8d7255a8cb0e1f1ad5fd3352c066955a98f8))
* Fix power source for Schneider Electric W599001/W599501 https://github.com/Koenkk/zigbee-herdsman-converters/issues/6145 ([21f66c3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/21f66c36dfa62f8ce331da68cd054e7659c55918))
* **ignore:** Fix 49c4453fe99de23c0971534d4368ab456c20c3d3 ([1b21049](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1b21049b0e826b4c4d6626b1afb63e407f5caa43))
* **ignore:** small improvements for 22a000860137cb1e150eb418016d299ff9beaa2d ([1a6f282](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1a6f282e0fa31bb48878a33287de819c94267f00))
* Rename LED2103GS to LED2103G5 https://github.com/Koenkk/zigbee2mqtt/discussions/18987 ([355333a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/355333ad34f5cf2349de91faa5e10551e9513793))
* Restore power_on_behavior for Gledopto GL-C-006P and GL-LB-001P ([#6175](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6175)) ([1f73585](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1f73585e16543af694ef742033ef9bb63ef18594))

## [15.79.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.78.0...v15.79.0) (2023-09-17)


### Features

* **add:** W45CZ ([#6169](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6169)) ([a6c95a1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a6c95a1ca7e78de3a8a65b20d3b7a7de72972444))
* Expose color options for Ikea lights ([#6163](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6163)) ([c487ae3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c487ae31e223ec5c9568a7a3092130367dd31b1a))


### Bug Fixes

* **detect:** Detect `_TZE200_1fuxihti` as TuYa TS0601_cover_1 https://github.com/Koenkk/zigbee-herdsman-converters/issues/6170 ([02202f7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/02202f76c4387706f17d59281310ece6694596fa))
* Fix Innr BY 266 and RS 227 T not controllable https://github.com/Koenkk/zigbee2mqtt/issues/18961 ([91a47a8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/91a47a8d0b09f1317f47e10042f433929b70737b))
* Fix ZNLDP13LM power source and device type https://github.com/Koenkk/zigbee2mqtt/issues/19001 ([66ba117](https://github.com/Koenkk/zigbee-herdsman-converters/commit/66ba117e8ae10bf5f1598baee69aae9b91a0ad43))

## [15.78.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.77.0...v15.78.0) (2023-09-17)


### Features

* **add:** LED2103GS [@yaskad](https://github.com/yaskad) https://github.com/Koenkk/zigbee2mqtt/issues/18996 ([f928941](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f92894112f152a5b685d0f4deecf3682db182071))
* **add:** NAS-AB06B2 ([#6164](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6164)) ([794f63d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/794f63da1aaf6092c039a6915da1d0811dc43e6c))
* **ignore:** Refactor all devices to TS ([#6166](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6166)) ([beddf3b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/beddf3bb982d3e15daa91fb5904f27815b027193))


### Bug Fixes

* **ignore:** update dependencies ([#6168](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6168)) ([367d88c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/367d88c6416b6a41d03db11b5ec249fb873aaa26))

## [15.77.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.76.0...v15.77.0) (2023-09-16)


### Features

* **add:** LLKZMK12LM [@kei81131](https://github.com/kei81131) https://github.com/Koenkk/zigbee2mqtt/issues/18856 ([071b52e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/071b52ec5b63523b0209ff3d9e20f2275d75ef30))
* **add:** TS0601_switch_12 @Franckybel https://github.com/Koenkk/zigbee2mqtt/issues/18371 ([4784bf1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4784bf1d86f8c33d17ccaf4fc6b6b5603f04d465))


### Bug Fixes

* **detect:** Detect `_TZE200_rks0sgb7` as TuYa PJ-1203A [@1vanj0](https://github.com/1vanj0) https://github.com/Koenkk/zigbee2mqtt/issues/18734 ([813f384](https://github.com/Koenkk/zigbee-herdsman-converters/commit/813f3848a2b7b69a4872899a74bb1780d2c393fd))

## [15.76.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.75.0...v15.76.0) (2023-09-14)


### Features

* Expose power outage memory for Mercator Ikuü SPP02GIP ([#6159](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6159)) ([b92fdd9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b92fdd97cfbfb02597d5d1bcb67465305ccda480))


### Bug Fixes

* **detect:** Detect `_TZ3000_skueekg3` as TuYa WHD02 ([#6160](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6160)) ([32eebe7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/32eebe703255824501ed6c1d20a0603c4ec24851))
* **detect:** Detect `_TZ3000_uwkja6z1` as Nous A4Z ([#6162](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6162)) ([ea7644a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ea7644abba3f583895bc6fcf0e9cf2ac97029621))

## [15.75.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.74.0...v15.75.0) (2023-09-13)


### Features

* **add:** RB56SC ([#6156](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6156)) ([ec2a508](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ec2a5088d2e0e7b6b9bfd2ba944007514db1614b))
* **add:** ZWT198 ([#6155](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6155)) ([0eb982d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0eb982d8c40f0b120a347f464c6c9f366f10e0e4))


### Bug Fixes

* **detect:** Detect `_TZE200_gaj531w3` as Yushun YS-MT750L https://github.com/Koenkk/zigbee2mqtt/issues/18954 ([a81f017](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a81f017403b5fa801504ab850e1f6463a60bb404))
* **detect:** Detect `_TZE204_hlx9tnzb` as ZS-SR-EUD-1 and `_TZE204_1v1dxkck` as `ZS-SR-EUD-3` https://github.com/Koenkk/zigbee-herdsman-converters/pull/6136 ([a011a93](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a011a937f7a4422d006d395d9d41e2817ab4800c))
* **detect:** Detect `_TZE204_wvovwe9h` as TuYa TS0601_switch_2_gang @BandBxx https://github.com/Koenkk/zigbee2mqtt/issues/18336 ([d0131f1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d0131f1c3c79d47078aee8e5b8c61c5f81bf5675))

## [15.74.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.73.0...v15.74.0) (2023-09-11)


### Features

* **add:** 9290030516 [@tanders587](https://github.com/tanders587) https://github.com/Koenkk/zigbee2mqtt/issues/18919 ([6af4451](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6af44511c2e77dafaf1a7ac4476d63605f403e94))
* **add:** TS0601_cover_7 https://github.com/Koenkk/zigbee2mqtt/issues/18103 ([90849d2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/90849d2de306aeafac4f32574635f4ca73ac14b0))


### Bug Fixes

* **detect:** Detect `929003597801` as 3216131P6 @MistaWu https://github.com/Koenkk/zigbee2mqtt/issues/18942 ([56f56eb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/56f56eb25309b6d9cc2595a7f620d36ad45a16ec))
* Fix unit missing for `voltage_phase_c` ([#6154](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6154)) ([8567f8d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8567f8d7680e04104dc2dc5ee53ae60b3af4cb21))
* **ignore:** update dependencies ([#6152](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6152)) ([472dae8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/472dae8fe050a5412ad1a9c90f80b06d7b6df764))

## [15.73.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.72.0...v15.73.0) (2023-09-09)


### Features

* Add battery for W599501 https://github.com/Koenkk/zigbee-herdsman-converters/issues/6145 ([93dc92d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/93dc92d632e26b21e5a65805e1eeceab72a8d534))
* **add:** 929003596001 [@sympapa](https://github.com/sympapa) https://github.com/Koenkk/zigbee2mqtt/issues/18915 ([7014f87](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7014f872013ed278e4e06d65a4245f44364abdc6))
* **add:** TS0601_illuminance_temperature_humidity_sensor_2 ([#6149](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6149)) ([7d2d53e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7d2d53eb021fa327c93d7158176366bb6416e22e))


### Bug Fixes

* **detect:** Detect `_TZE200_a0syesf5` as Mercator Ikuü SSWRM-ZB https://github.com/Koenkk/zigbee2mqtt/issues/18847 ([370b181](https://github.com/Koenkk/zigbee-herdsman-converters/commit/370b181d47c15e90ee5b462c4f633fa783c7002d))
* **detect:** Detect `Wireless Scenes Command` as Legrand 067755 ([#6134](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6134)) ([a8bd840](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a8bd840df6186ea54022032001bcf5844b2edcc3))

## [15.72.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.71.0...v15.72.0) (2023-09-07)


### Features

* **add:** LED2104R3 ([#6147](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6147)) ([47402ad](https://github.com/Koenkk/zigbee-herdsman-converters/commit/47402ade7687e14ec56bdefe206b4dd412968e59))
* **add:** W599501 [@ronniebach](https://github.com/ronniebach) https://github.com/Koenkk/zigbee-herdsman-converters/issues/6145 ([4654b1b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4654b1bc414566eac2d8034e992d141468b93475))
* Support battery for TRVZB ([#6146](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6146)) ([3f33a87](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3f33a87f54f492fc9e046c163ee7b00edb4cd061))


### Bug Fixes

* Rename 948.47 to 948.47/29165 and add color temp range ([#6141](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6141)) ([57bd2c7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/57bd2c77888ef915eb420e770fa73a7b426b686f))

## [15.71.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.70.0...v15.71.0) (2023-09-06)


### Features

* **add:** 10454467 ([#6143](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6143)) ([07fa6a3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/07fa6a3ee35a37e9df5b8ab76e59649935340f7c))
* **add:** 1822647A https://github.com/Koenkk/zigbee2mqtt/issues/18884 ([69c8ed1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/69c8ed161e3e181fd6dd0112157c700dc202ff00))
* **add:** GL-LB-001P https://github.com/Koenkk/zigbee2mqtt/issues/18870 ([a4c676d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a4c676d363ca3ed010e1a94f87c161938e1b69ef))
* **add:** SNZB-06P, TRVZB ([#6144](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6144)) ([939884c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/939884c282e19ce2e9eafaf56fc10c3d1fb370c2))
* Detect all TuYa TS0202 as supported https://github.com/Koenkk/zigbee2mqtt/issues/18682 ([9304327](https://github.com/Koenkk/zigbee-herdsman-converters/commit/93043279a82ca30bcadfea6870e0798ef5a724c8))


### Bug Fixes

* **detect:** Detect `_TZ3000_jmrgyl7o` as Luminea ZX-5311 https://github.com/Koenkk/zigbee2mqtt/issues/18682 ([7e34d14](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7e34d140c0441bda41a27ac5cd014bff1f04f79e))

## [15.70.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.69.0...v15.70.0) (2023-09-04)


### Features

* **add:** ROB_200-063-0 ([#6138](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6138)) ([7493914](https://github.com/Koenkk/zigbee-herdsman-converters/commit/74939141029df3f1f7d658df296ca856b13641c7))
* Support color for HORNBACH 10454471 https://github.com/Koenkk/zigbee2mqtt/issues/18850 ([3665121](https://github.com/Koenkk/zigbee-herdsman-converters/commit/36651214dfb94516e714db7983e8b462a18d536b))


### Bug Fixes

* **detect:** Detect `_TZB000_42ha4rsc` as Lidl HG09648 https://github.com/Koenkk/zigbee2mqtt/issues/18745 ([a118719](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a11871926c6de02ad4004fb51662b2bfefa60a2f))
* **detect:** Detect `_TZE200_cirvgep4z` as TuYa ZTH08-E https://github.com/Koenkk/zigbee2mqtt/issues/17008 ([e71ba2a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e71ba2aa57c943d8e1c0aea907f3b4536835e2fe))
* **detect:** Detect `_TZE204_zenj4lxv` as Moes ZS-SR-EUD-2 ([#6136](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6136)) ([20253c7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/20253c76011a2b6d088b3662e20446478c2b9643))
* Fix 9290030517 discovery ([#6135](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6135)) ([455fe49](https://github.com/Koenkk/zigbee-herdsman-converters/commit/455fe49f05feec288817f06c6b981601d69bd04e))
* Remove unsupported color from Gledopto GL-B-002P and GL-B-004P https://github.com/Koenkk/zigbee2mqtt/issues/18846 ([e929f8a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e929f8a8628c3d27981889b140b860d1323b4cce))

## [15.69.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.68.0...v15.69.0) (2023-09-03)


### Features

* **add:** 929003536001 ([#6130](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6130)) ([7200aba](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7200aba6223f02f4dd1762a69f75fa6d181efd98))
* **add:** SLT3d https://github.com/Koenkk/zigbee2mqtt/issues/18844 ([a064263](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a0642635fb26c27205859e93b93c665fd32ac51c))
* Support more features for TuYa TS030F @JuMi2006 https://github.com/Koenkk/zigbee2mqtt/issues/18745 ([2d899b4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2d899b49aa71c6c911786a096b1bcdc42fcbe556))


### Bug Fixes

* Fix TuYa YXZBRB58 `detection_delay` and `fading_time` ([#6131](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6131)) ([42b904a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/42b904a7250b044045eeef6d6ef3f1853ca1e345))
* **ignore:** update dependencies ([#6132](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6132)) ([5ad72d6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5ad72d66d59affd4ac60bd08f6ddd6f882bd35c5))

## [15.68.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.67.1...v15.68.0) (2023-09-02)


### Features

* Detect all TuYa TS0014 as supported https://github.com/Koenkk/zigbee2mqtt/issues/18818 ([dde585f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dde585f544c6bc4f5785c9f675d1e816ccf58a58))


### Bug Fixes

* Add back tamper for TuYa TS0202 https://github.com/Koenkk/zigbee2mqtt/issues/18832 ([1c64b6d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1c64b6d5fa1f418ca34393756182b9bddd257537))
* **detect:** Detect `Dimmable`/`Paulmann Licht GmbH` as 93999 https://github.com/Koenkk/zigbee2mqtt/issues/18799 ([5a0e2f4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5a0e2f4f1d4284da51eb466ac188e2a4bdcb0688))
* Rename `LED1923R5` to `LED1923R5/LED1925G6` https://github.com/Koenkk/zigbee2mqtt/issues/18821 ([3aad8a8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3aad8a810b1ebc6435d0c7d16bc564e5dcbc708c))

## [15.67.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.67.0...v15.67.1) (2023-09-01)


### Bug Fixes

* **ignore:** update dependencies ([#6126](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6126)) ([9854ff9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9854ff9ae2052ac0d4393a02377d7fe949943777))

## [15.67.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.66.1...v15.67.0) (2023-09-01)


### Features

* **add:** QBKG32LM [@ssnaveen10](https://github.com/ssnaveen10) https://github.com/Koenkk/zigbee2mqtt/issues/18772 ([f3bffc2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f3bffc248f80da42e3da5e3548f010fbf718842d))


### Bug Fixes

* **detect:** Detect `_TZ3210_weaqkhab` as Lonsonho QS-Zigbee-D02-TRIAC-L_1. https://github.com/Koenkk/zigbee2mqtt/issues/18803 ([71e2af0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/71e2af0a88d552017e9a46acbde134b0e5e0f498))

## [15.66.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.66.0...v15.66.1) (2023-08-31)


### Bug Fixes

* **ignore:** fix 888918c119756090bb123b061c83587155168ae0 ([b18397a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b18397a9b48609caf635380d0c5dd720bbce9cab))

## [15.66.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.65.0...v15.66.0) (2023-08-31)


### Features

* **add:** L101Z-SBI, L101Z-SBN, L101Z-SLN, L101Z-DBI, L101Z-DBN, L101Z-DLN ([#6121](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6121)) ([e441f99](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e441f9915dae7b5bf7e9a4bb254c78bb4fcb407a))
* **add:** RBSH-RTH0 ([#6120](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6120)) ([33f6ddc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/33f6ddc973deeb5d3743438a267911de71b5ed50))
* **add:** TS030F @JuMi2006 https://github.com/Koenkk/zigbee2mqtt/issues/18745 ([368b00c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/368b00cc8c82b3ea72a9d28aacc757088d596795))


### Bug Fixes

* Add some Legrand/BTicino whitelabel models ([#6122](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6122)) ([f7985b5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f7985b542ee50706a5b14413d25bfcad9fad2b20))
* Fix Iris 3460-L configure failing https://github.com/Koenkk/zigbee2mqtt/issues/18797 ([5ce5a01](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5ce5a01f10f55f7496bb86f2e3307eaab194b8cd))

## [15.65.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.64.0...v15.65.0) (2023-08-30)


### Features

* **add:** 929003123801 ([#6115](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6115)) ([dd5c667](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dd5c6676e53f9f9648c19977019a2a55ed8a33e1))
* **add:** PJ-1203A ([#6116](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6116)) ([888918c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/888918c119756090bb123b061c83587155168ae0))


### Bug Fixes

* **detect:** Detect `_TZ3000_aa5t61rh` as TS0002_switch_module_3 ([#6117](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6117)) ([eb83e94](https://github.com/Koenkk/zigbee-herdsman-converters/commit/eb83e949ebbea0e6c959c41abfb35d47dd1af8f1))
* Fix middle volume value for TuYa YXZBSL ([#6119](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6119)) ([2db8db2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2db8db243b645a0e81a24eada2601fb863810637))

## [15.64.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.63.0...v15.64.0) (2023-08-29)


### Features

* **add:** 07752L https://github.com/Koenkk/zigbee2mqtt/issues/18326 ([e479f95](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e479f95589e01c3c7b3544027cf6ba3af686ebe2))


### Bug Fixes

* **detect:** Detect `_TZE204_rhblgy0z` as TuYa TS0601_din_1 ([#6111](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6111)) ([d2c0dd2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d2c0dd2ba1680a94b670c65179715810e5cf1acd))
* **detect:** Detect `929002376402` as 929002376401 ([#6112](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6112)) ([21a0401](https://github.com/Koenkk/zigbee-herdsman-converters/commit/21a0401168d8a0ddb95de7a53634ae6e416631a2))
* Enable hue/saturation for Paulmann lights ([#6114](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6114)) ([1b401e9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1b401e9ba3847e6f24109d3b4dacf01385bfad56))

## [15.63.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.62.0...v15.63.0) (2023-08-27)


### Features

* **add:** 929003054401 ([#6106](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6106)) ([b99e40d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b99e40d10359d7cbc351414f150e899342b91501))
* Expose `store_1` action for Müller Licht 404002 ([#6108](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6108)) ([9f11f58](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9f11f5842f31e9450040a04511fc7b43862be679))


### Bug Fixes

* Add `whiteLabel` for Xiaomi `LGYCDD01LM` ([#6107](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6107)) ([977f525](https://github.com/Koenkk/zigbee-herdsman-converters/commit/977f525408cd9acda948a2d0c1f411569e69bc64))
* Add ZWT-100-16A as whitelabel of X5H-GB-B. https://github.com/Koenkk/zigbee2mqtt.io/pull/2191 ([bb9eb2a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bb9eb2acd0cf70abcf51fa5e601454203ca2d9e1))
* Disable unsupported `power_on_behaviour` for Aurora Lighting AU-A1ZBMPRO1ZX https://github.com/Koenkk/zigbee2mqtt/issues/18743 ([1752715](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1752715daad6a267cc3b7e7440d2581e26a003ed))
* **ignore:** update dependencies ([#6109](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6109)) ([0fe33ad](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0fe33adb16bbdba060e7ff9f1c7234bbff325435))

## [15.62.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.61.0...v15.62.0) (2023-08-26)


### Features

* **add:** 4512760 [@erwahlb](https://github.com/erwahlb) https://github.com/Koenkk/zigbee2mqtt/issues/18732 ([2bcb272](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2bcb27250b3f3f1417c0bfe98de0aed9fe1cb9e3))
* **add:** 5047330P6 https://github.com/Koenkk/zigbee2mqtt/discussions/18712 ([8518fa6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8518fa68aca04602ff5ad52af2950e606e9299c3))
* **add:** 929003046601 ([#6104](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6104)) ([a25c4b7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a25c4b71d032a2a29dbb4e59dba52313f95f05b2))
* **add:** RLS-K01D @FabienVINCENT https://github.com/Koenkk/zigbee2mqtt/issues/18471 ([1443b52](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1443b52bd653b45c9a0dde3009b2383f80860109))
* Support battery for Namron 4512764 ([#6103](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6103)) ([53b6d91](https://github.com/Koenkk/zigbee-herdsman-converters/commit/53b6d916e5a1939f2283d6483b8ae2e97960595d))

## [15.61.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.60.0...v15.61.0) (2023-08-24)


### Features

* **add:** 13190230 ([#6100](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6100)) ([25af7ba](https://github.com/Koenkk/zigbee-herdsman-converters/commit/25af7ba13eb015f3c8703c5d634b2e69b006bfed))
* **add:** 4512764 ([#6101](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6101)) ([5f9c6a3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5f9c6a37b61062733f7ffbfb32851c03f83f1641))
* **add:** HA-ZBM-MW2 ([#6098](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6098)) ([ccc9591](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ccc9591d868f119d772853e6b4fe2210dce54068))


### Bug Fixes

* **detect:** Detect `_TYZB01_2jzbhombz` as SBDV-00029, `_TYZB01_ub7urdza` as SBDV-00032 and `_TYZB01_epni2jgy` as SBDV-00030 ([#6099](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6099)) ([36f18fb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/36f18fb614d3e682c27539de29958ee357e96677))
* **detect:** Detect `HK_DIM_A` as `HK-DIM-A` https://github.com/Koenkk/zigbee2mqtt/discussions/18634 ([05c8c04](https://github.com/Koenkk/zigbee-herdsman-converters/commit/05c8c047029c7e4d0ed073373428f4e7947d34d0))
* **detect:** Detect `NimlyTouch` as Onesti Products AS easyCodeTouch_v1 ([#6096](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6096)) ([bc58c71](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bc58c71d71bff895c7c089e233bc26387984dfc5))
* Disable unsupported `power_on_behaviour` for Vimar 03981. https://github.com/Koenkk/zigbee2mqtt/issues/18693 ([bf32ce2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bf32ce2b74689328048b407e56ca936dc7a54a0b))
* Override labels in exposes ([#6102](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6102)) ([8aa90d8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8aa90d808f8b773489b2f06c5837bdb5c6884931))

## [15.60.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.59.0...v15.60.0) (2023-08-20)


### Features

* Add `scene_rename` command ([#6092](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6092)) ([bc696cf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bc696cf421143d8c479476ff089e7fbb7e07d39a))
* **add:** 10454471 ([#6093](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6093)) ([47d1bc4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/47d1bc4875ef0838c59c5e42b901e5b1f9f91024))
* **add:** 600087L ([#6090](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6090)) ([5264bd0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5264bd0cfae8491322bf6f0b0f8ae4fcf6d6e5f2))
* **add:** SBTZB-110 ([#6088](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6088)) ([7910e32](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7910e327589124055829be2e4af314d99f2b9e75))

## [15.59.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.58.1...v15.59.0) (2023-08-19)


### Features

* **add:** 9290030518 ([#6085](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6085)) ([b843b4f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b843b4f4280583d856f96b99180c85be84884e5a))
* **add:** ZG-205Z/A ([#6084](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6084)) ([74df0f3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/74df0f386fd7e444edb9bf83f8aef95e2e92df33))


### Bug Fixes

* **ignore:** revert 126c55eae80d78cf270e8c616909e53c59c1844c ([ddb5115](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ddb51157e0b9af4c7d61717b7d859e69db40e4d4))

## [15.58.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.58.0...v15.58.1) (2023-08-18)


### Bug Fixes

* **detect:** Detect all `TS0225` as supported https://github.com/Koenkk/zigbee2mqtt/issues/18612 ([126c55e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/126c55eae80d78cf270e8c616909e53c59c1844c))
* Fix `Cannot read properties of undefined (reading 'hasOwnProperty')}` error for some Schneider Electric devices. https://github.com/Koenkk/zigbee2mqtt/issues/18656 ([5e8130b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5e8130b60c502793344b0df136a2648bcf399b33))
* Fix OTA upgrade not working for Xiaomi ZNCLBL01LM https://github.com/Koenkk/zigbee2mqtt/discussions/18651 ([7c94ab7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7c94ab7535c74c4d5dc9271e58532ca6f4aa9694))

## [15.58.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.57.0...v15.58.0) (2023-08-17)


### Features

* Add label to exposes ([#6066](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6066)) ([8f62565](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8f625659de14c9b93033e99b5d123d63a5ac8875))
* **add:** 915005988001 ([#6080](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6080)) ([e61be78](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e61be7869f3c5e58fa39b827fe397570167a39ec))
* Support fan mode, keypad lockout and OTA and remove pi heating demand for Zen Zen-01-W ([#6078](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6078)) ([520128a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/520128a0269e7c7d11b54a12a1b587885e4b45d3))
* Support schedule for TuYa TS0601_thermostat_3 and add `_TZE200_p3dbf6qs` and `_TZE200_rxntag7i` ([#6067](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6067)) ([3a948ab](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3a948abc5cc94c0a4be2ede464834431d4cd4148))
* Support tamper for TuYa TS0207_water_leak_detector ([#6079](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6079)) ([b166a63](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b166a63ff5a4d1046929d89a0920cad298460a7e))


### Bug Fixes

* **detect:** Detect `_TZ3000_mh9px7cq` as TuYa TS0044_1. https://github.com/Koenkk/zigbee2mqtt/issues/17704 ([0ecd6eb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0ecd6eb318ee4d4d07f9d97dd87fd767dcad9aa7))
* **detect:** Detect `_TZ3000_qystbcjg` as UNSH SMKG-1KNL-EU-Z ([#6081](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6081)) ([bd6e043](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bd6e04395782ccf634bd0211d16656a902dc1af6))
* **detect:** Detect `_TZE204_nklqjk62` as TuYa PJ-ZGD01 https://github.com/Koenkk/zigbee2mqtt/issues/18633 ([2bfcce8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2bfcce8c36fc559b3700a6ab967ed68020259bdc))
* Fix Philips 9290022166 not controllable https://github.com/Koenkk/zigbee2mqtt/issues/18636 ([9025674](https://github.com/Koenkk/zigbee-herdsman-converters/commit/90256743d15c86928567d8d49e7395173ef95aaa))

## [15.57.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.56.0...v15.57.0) (2023-08-14)


### Features

* **add:** MEG5126-0300 [@tech2mar](https://github.com/tech2mar) https://github.com/Koenkk/zigbee2mqtt/issues/18595 ([e3473ef](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e3473ef97078c007e06e59b17ab210560cf99415))


### Bug Fixes

* **detect:** Detect `_TZE200_ves1ycwx` as TuYa SPM02 ([#6076](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6076)) ([eea6818](https://github.com/Koenkk/zigbee-herdsman-converters/commit/eea68187083ef0b2908fa2a064ba651e8ba5a512))
* Fix no firmware versions shown for Xiaomi RTCZCGQ11LM ([#6068](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6068)) ([4d535ef](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4d535effcbd6fbae0317ded493e116faf30e00ed))
* Fix Xiaoimi JTQJ-BF-01LM/BW device type and power source. https://github.com/Koenkk/zigbee2mqtt/issues/18597 ([194ae56](https://github.com/Koenkk/zigbee-herdsman-converters/commit/194ae568d4a9b5e8e942c005c7c33b9508f9ae98))
* **ignore:** Fix e3473ef97078c007e06e59b17ab210560cf99415 ([b717b62](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b717b62472854ac32e8cf043d7b59a45a0e391cf))
* **ignore:** update dependencies ([#6074](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6074)) ([7ce0d3f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7ce0d3f6adf4d92e49998df96a5f099d2a766f7a))

## [15.56.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.55.3...v15.56.0) (2023-08-12)


### Features

* **add:** LM4110ZB ([#6069](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6069)) ([c8d91e4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c8d91e486da593a244d6fdaf00de89bade2bc072))
* Refactor and add totalApparentPower for 3 phases data for LiXee ([#6070](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6070)) ([9edcb95](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9edcb954a35346912175b609f373ae743cab5170))


### Bug Fixes

* Add missing actions to Philips 324131092621 ([#6071](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6071)) ([452f30e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/452f30e49a811cf18f3e7cda1fec7cd45ca33206))
* **detect:** Detect `_TZ3000_msl6wxk9` as TuYa ZMS-102 ([#6065](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6065)) ([bae5254](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bae525499d31e42867ab3b0ffd64f14903faf37e))
* Fix `_TZ3000_lepzuhto` not detected as supported. https://github.com/Koenkk/zigbee-herdsman-converters/pull/5864 ([8bacfd3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8bacfd389ce5b4e51506b3c302e0a260fad3885f))

## [15.55.3](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.55.2...v15.55.3) (2023-08-10)


### Bug Fixes

* **detect:** Detect `Remote Control`/`MLI` as Müller Licht 404049D. https://github.com/Koenkk/zigbee2mqtt/issues/18569 ([bf70a7e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bf70a7e3f8356ed3a8063ae376ab6327b6a1ee99))
* Fix Niko 552-721X2 state incorrect when controlled physically.  https://github.com/Koenkk/zigbee2mqtt/issues/17749 ([ef5b19b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ef5b19b7748ec0cd6632408acecd36262266b50d))
* Remove unsupported `power_outage_count` from Xiaomi GZCGQ01LM. https://github.com/Koenkk/zigbee2mqtt/issues/18558 ([68d71ed](https://github.com/Koenkk/zigbee-herdsman-converters/commit/68d71ed5f251f77f2711ce5722965c17489ec815))
* Remove unsupported `tamper` from TuYa ZM-35H-Q, TS0202 and IH012-RT01 ([#6062](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6062)) ([7f4c2d6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7f4c2d6b4a715c78f0f26390285574fee4a1ad53))
* Update description of TuYa TS0207_water_leak_detector_2 ([#6063](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6063)) ([68b0c89](https://github.com/Koenkk/zigbee-herdsman-converters/commit/68b0c89abcb33a3cb57a04eae7dc1092c1d419db))

## [15.55.2](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.55.1...v15.55.2) (2023-08-09)


### Bug Fixes

* **detect:** Detect `_TZE204_dtzziy1e` as TuYa MTG075-ZB-RL. https://github.com/Koenkk/zigbee-herdsman-converters/issues/5930 ([1273634](https://github.com/Koenkk/zigbee-herdsman-converters/commit/12736341b681b96b1057cc3087f3d7a3afaa0eb9))
* **detect:** Detect `RGBW` as Paulmann 371000002 ([#6058](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6058)) ([ff87637](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ff87637655d8493efc80221fea48a39383063a29))

## [15.55.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.55.0...v15.55.1) (2023-08-08)


### Bug Fixes

* **detect:** Detect `_TYZB01_j7iyqfcs` as TuYa TS0202 https://github.com/Koenkk/zigbee2mqtt/issues/10397 ([3c4bc93](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3c4bc93e7d50190637320b6c62ca5e6e7caafe92))
* Remove unsupported color for ADEO IA-CDZFB2AA007NA-MZN-02 and IG-CDZB2AG009RA-MZN-01 ([#6057](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6057)) ([eb6a61b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/eb6a61b4e9fcfdc1e3f5a5decb8466f6e17a11c8))

## [15.55.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.54.1...v15.55.0) (2023-08-07)


### Features

* **add:** HA-ZSM-MW2, E0040006 ([#6053](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6053)) ([98ed3a6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/98ed3a6179769d0cc889fdddd35d57527952e1ca))
* **add:** LP_CF_7904008_EU https://github.com/Koenkk/zigbee2mqtt/issues/17871 ([e92b260](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e92b260b903b54e064c3906260181edcf4717b76))
* Support OTA for BTicino L4411C/N4411C/NT4411C and K4003C/L4003C/N4003C/NT4003C ([#6052](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6052)) ([d0e7bf4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d0e7bf44c68403080252ae03c031123d96138ea4))


### Bug Fixes

* **detect:** Detect `_TZ3000_odzoiovu` as TuYa TS0003_switch_module_2 ([#6056](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6056)) ([b75e56a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b75e56a23fe9ef84c8f2d927d5f11fa9eb03c098))
* Fix Eco-Dim.05 not detected as supported. https://github.com/Koenkk/zigbee2mqtt/issues/18540 ([99b560a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/99b560a87568841fe1f05826658305176ed4371f))
* Fix OTA endpoint missing ofr Xiaomi GZCGQ11LM. https://github.com/Koenkk/zigbee2mqtt/issues/18531 ([cf884df](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cf884dfc500ba3748196fae9d6314fecdfe3dbb8))
* **ignore:** Add missing tuya.tz.datpoint keys ([#6055](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6055)) ([95f40d8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/95f40d82335f43f2c0a37f90a2362ef3633f8867))

## [15.54.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.54.0...v15.54.1) (2023-08-06)


### Bug Fixes

* **ignore:** Fix missing ZY-M100-24G keys. https://github.com/Koenkk/zigbee2mqtt/issues/18237 ([d0e8519](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d0e8519777590b76c38054ad91e4eb3c4e14f73c))
* **ignore:** update dependencies ([#6025](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6025)) ([ee4858b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ee4858b568074bf12186a9186d4e4ec35801cf13))

## [15.54.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.53.0...v15.54.0) (2023-08-05)


### Features

* Add OTA support for Bticino 4027C ([#6049](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6049)) ([72505b9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/72505b90123ad90604e9dd08e0fa77ef3fd33a1d))
* **add:** SZ-WTD03 ([#6048](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6048)) ([9de8d85](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9de8d853c40db0bff3738c8231449b2cbde8d904))
* **add:** ZY-M100-24G @VladKorr https://github.com/Koenkk/zigbee2mqtt/issues/18237 ([39f13a9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/39f13a9401576f2aedb5bba02b3f095d6926af89))
* Support OTA for Gledopto GL-D-007P @BradleyFord https://github.com/Koenkk/zigbee-OTA/pull/342 ([3298895](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3298895e54849e7527f80b43919f3b38c6d9a91c))

## [15.53.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.52.0...v15.53.0) (2023-08-04)


### Features

* **add:** CCTFR6100Z3 https://github.com/Koenkk/zigbee2mqtt/issues/17377 ([fa2cea5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fa2cea5a4911afb0737fbd3ff47e473456bfa749))
* **add:** MTG075-ZB-RL ([#6045](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6045)) ([36b5336](https://github.com/Koenkk/zigbee-herdsman-converters/commit/36b5336ebe084bffff2701cdfe2f3baa057abdee))
* **add:** RS 232 C ([#6046](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6046)) ([ad5336c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ad5336c9c972446e00c460953eb0b88e2bfc97b7))


### Bug Fixes

* **detect:** Detect `_TZ1800_ho6i0zk9` as Lidl HG06336 ([#6044](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6044)) ([75b6e66](https://github.com/Koenkk/zigbee-herdsman-converters/commit/75b6e66e4ca4571fca0ac8a0bcf61e6ca94b02b2))
* **detect:** Detect `_TZ3210_x13bu7za` as Lidl 399629_2110 .https://github.com/Koenkk/zigbee2mqtt/issues/18516 ([727da01](https://github.com/Koenkk/zigbee-herdsman-converters/commit/727da01b551792554fc6529dbec811d28a9d71b1))
* **detect:** Detect `NimlyIn` as Onesti Products AS easyCodeTouch_v1 https://github.com/Koenkk/zigbee-herdsman-converters/issues/6043 ([c7c2fdb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c7c2fdb79d15593f8f811b5da27b1008b3efae34))
* **detect:** Detect `PSMP5_00.00.03.05TC` as Lupus 12050 https://github.com/Koenkk/zigbee2mqtt/issues/18522 ([859227e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/859227ee64b9b41f36b9638ddc166829cda5dd56))
* Fixes for Third Reality 3RSNL02043Z ([#6042](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6042)) ([cca4ed0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cca4ed0bda6fbecdfba5732cedf71edd7480d71c))

## [15.52.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.51.0...v15.52.0) (2023-08-03)


### Features

* Add `led_in_dark` fromZigbee converter for Legrand + Bticino devices ([#6032](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6032)) ([88f17a5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/88f17a5c133e19e7dfd938b3c2fe035afdb37e63))
* **add:** 84845506 ([#6035](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6035)) ([e4df600](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e4df6009ba9659c94cfdbee92a3d0edfd97f3e10))
* **add:** GW-Z-0010 ([#6037](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6037)) ([4b94f1b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4b94f1be8efc24d847ff3aeffa8e9e7886867818))
* **add:** IH012-RT02 ([#6041](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6041)) ([98a1fb1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/98a1fb137ead6f285a9405b8cd0c817b2e8aa943))
* **add:** TS0225 ([#6036](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6036)) ([d64badb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d64badbd46fe0b55d470281beecee0b747d011da))


### Bug Fixes

* **detect:** Detect `_TZ3210_cieijuw1` as Nous P3Z. https://github.com/Koenkk/zigbee2mqtt/issues/18512 ([d62667b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d62667b21eadcc1355fe774ad691850263158ebd))
* Fix Lixee tempo tarf & review RP state ([#6038](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6038)) ([4ca7f57](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4ca7f570ee30d0f400f3b01de57852cfe941a138))
* Fix TuYa TS0201 `_TZ3210_ncw88jfq` humidity off by a factor of 10. https://github.com/Koenkk/zigbee2mqtt/issues/18513 ([30c5bfa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/30c5bfaf2138beb1d141c0315c0aa738c0cc6726))
* **ignore:** Support color for Philips 8719514419278. https://github.com/Koenkk/zigbee2mqtt/issues/18465 ([5b2de68](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5b2de684d63052eab559ce18660a90e59db25b81))

## [15.51.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.50.1...v15.51.0) (2023-08-02)


### Features

* **add:** 8719514419278 https://github.com/Koenkk/zigbee2mqtt/issues/18465 ([77547a0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/77547a0888dbc5f955027c0bdfb11543d99bf202))


### Bug Fixes

* **detect:** Detect `_TZ3210_j4pdtz9v` as TuYa TS0001_fingerbot. https://github.com/Koenkk/zigbee2mqtt/issues/18494 ([5723131](https://github.com/Koenkk/zigbee-herdsman-converters/commit/57231316ac1f135e3e5a1adb400978e885653b75))
* Various fixes for ptvo.switch ([#6033](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6033)) ([25a2a79](https://github.com/Koenkk/zigbee-herdsman-converters/commit/25a2a792ca80af3eadc0bc51c31999e48fb003c8))

## [15.50.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.50.0...v15.50.1) (2023-08-01)


### Bug Fixes

* **ignore:** Fix changelog and model ([4e67577](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4e67577bfca5fa1d91c061fed56b1dab2a614415))

## [15.50.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.49.0...v15.50.0) (2023-07-31)


### Features

* **add:** 1444420 ([#6018](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6018)) ([306ac92](https://github.com/Koenkk/zigbee-herdsman-converters/commit/306ac92efa4fcbf57bcd9efb0ae6b7b031404e41))
* **add:** 84870058 ([#6028](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6028)) ([993b030](https://github.com/Koenkk/zigbee-herdsman-converters/commit/993b03096811b1b0f3ba2b83cdf495c101dcdc10))
* **add:** 9290024406A @RPiNut https://github.com/Koenkk/zigbee2mqtt/issues/18455 ([f11b5d7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f11b5d7b600334383a95520475834384dea21c1d))
* **add:** H10 ([#6023](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6023)) ([c40f88d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c40f88de240ec003bf32a4312b9be598672161b6))
* **add:** SIN-4-1-22_LEX ([#5991](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5991)) ([5855048](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5855048a73738b4d843f5ef5619b11fcb56340b7))
* **add:** TS0203_1 @AskDev2022 https://github.com/Koenkk/zigbee2mqtt/issues/18447 ([09b592e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/09b592e9cec90844f78301c88b5d565792770016))
* **ignore:** Support battery for SOMFY-1241752 ([#6026](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6026)) ([582536f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/582536f6152611fccc3d5c82da37beefe31a7789))


### Bug Fixes

* **detect:** Detect `_TZE204_ntcy3xu1` as TuYa TS0601_smoke_1 ([#6027](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6027)) ([4c15386](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4c1538624758665e7a1293f0c463dea43c38ba5a))
* **ignore:** fix f11b5d7b600334383a95520475834384dea21c1d ([277e6eb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/277e6ebbb5dfeb53ccb5c576096c28b8eeb64549))
* **ignore:** Fixes for easyCodeTouch_v1 ([#6024](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6024)) ([1a6ac0e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1a6ac0eccd915e1878935cd185be5183beb4fbef))

## [15.49.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.48.0...v15.49.0) (2023-07-27)


### Features

* Add new features for Onesti Products AS easyCodeTouch_v1 ([#6010](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6010)) ([62fbaa2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/62fbaa2cec1b1846813707a25390dc4227f56380))
* **add:** SOMFY-1241752 ([#6019](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6019)) ([ccffb64](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ccffb6437c0810e744e700ffd32f4b83d3c60bb0))
* **add:** ZY-M100-S_2 ([#5990](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5990)) ([90519ec](https://github.com/Koenkk/zigbee-herdsman-converters/commit/90519ecfbd064fc16a8eb757cfc00feead3876e1))
* **detect:** Detect `_TZ3000_qomxlryd` as ORBIS Windows & Door Sensor, `_TZ3000_qomxlryd` as ORBIS Motion Sensor, `_TZ3000_awvmkayh` as ORBIS Water Sensor and `_TYZB01_821siati` as ORBIS Vibration Sensor ([#6013](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6013)) ([7ad7aa3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7ad7aa3fde3e47b36b4b3e1cddadc7f47abc1c33))


### Bug Fixes

* Fix configure failing for OWON PCT504 ([#6020](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6020)) ([cfc5e64](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cfc5e649b20cc17638690813fbdbd59a14c8b5f7))
* Fix typo with Noes A1Z ([#6021](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6021)) ([69c3223](https://github.com/Koenkk/zigbee-herdsman-converters/commit/69c32231aaa6557ab7773fb1af356c6f86303264))

## [15.48.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.47.0...v15.48.0) (2023-07-26)


### Features

* **add:** 915005988201 ([#6012](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6012)) ([680379a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/680379aa0466d04920efe9a1d822427d77681ce5))


### Bug Fixes

* **detect:** Detect `_TZE204_qasjif9e` as TuYa TS0601_smart_human_presence_sensor_1. https://github.com/Koenkk/zigbee2mqtt/issues/18434 ([acfdb9a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/acfdb9abb37c98e06d82f35a566edd1526d2e50a))
* Fix on/off reporting and disable unsupported power on behaviour for Schneider Electric S520530W ([#6011](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6011)) ([72e3107](https://github.com/Koenkk/zigbee-herdsman-converters/commit/72e3107ab97993cc7bb4375099fa14867c0c6096))

## [15.47.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.46.0...v15.47.0) (2023-07-25)


### Features

* **add:** WB-MSW-ZIGBEE v.4 ([#6006](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6006)) ([db83556](https://github.com/Koenkk/zigbee-herdsman-converters/commit/db8355656b175c6ea8c80d85cf290f1731c3aa6a))
* **add:** ZYXH ([#6007](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6007)) ([4e31caa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4e31caa73db228513701af3645b36c7536144ba1))
* Expose `battery` for Visonic MP-840 ([#6008](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6008)) ([e6b2b53](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e6b2b53ca51e9010db620c49f5fe76dbd2576a99))


### Bug Fixes

* **ignore:** Improvements for U86Z223A10-ZJU01(GD) ([#5997](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5997)) ([2062d03](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2062d03d53d2e2baea9a0cfe71b161128fef6af3))

## [15.46.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.45.0...v15.46.0) (2023-07-24)


### Features

* **add:** GB-540 ([#5998](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5998)) ([ad7c18f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ad7c18fe590761a4a99763c7b8afe02b64c56e42))
* **add:** QS-Zigbee-SEC01-U ([#6002](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6002)) ([90d5b44](https://github.com/Koenkk/zigbee-herdsman-converters/commit/90d5b44d40c15400143452dfcd2fa205a8b667bc))
* **add:** YXZBSL ([#6000](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6000)) ([e08d2a3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e08d2a34cff818a107a554298451c90861767fba))
* **detect:** Detect `_TZ3210_0aqbrnts` as EFK is-thpl-zb. https://github.com/Koenkk/zigbee2mqtt/issues/18418 ([56333a0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/56333a0b7add7661c5fa71074e3b2bad2ca1c033))
* **detect:** Detect `_TZ3210_ol1uhvza` as Lonsonho QS-Zigbee-C03 ([#6004](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6004)) ([a023458](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a0234581a488e721cd5a6da49a49b159bcf2b4bc))
* **detect:** Detect `ZB-SmartPlugIR-1.0.0` as EDP PLUG EDP RE:DY ([#6003](https://github.com/Koenkk/zigbee-herdsman-converters/issues/6003)) ([a73f551](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a73f551874aca1ee8a7a91d08326adf15cf76926))
* Support `action` and `switch_mode` for TuYa TS0726. https://github.com/Koenkk/zigbee-herdsman-converters/pull/5657 ([e464459](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e464459bc72c2ccc5efaa3bc7465755e8ac67d21))

## [15.45.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.44.0...v15.45.0) (2023-07-23)


### Features

* Add findByModel function for easier inheritance in external converters ([#5987](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5987)) ([83cfeeb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/83cfeeb06bb5cf5c65bfbd480310e22828e110f7))
* **add:** 10454466 ([#5995](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5995)) ([53f57c2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/53f57c2960ecfb910e40e9b5f16a0093552019fe))
* **add:** 4033931P6 ([#5989](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5989)) ([83f6c5f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/83f6c5f782b466b51aacb91657c9e7f06fd5b9ae))
* **add:** 929003521501, 929003521701 ([#5994](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5994)) ([0e36764](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0e36764dc376d05c58d40339bf917b20647549a2))
* **add:** QBKG18LM [@cloudyngcloudy](https://github.com/cloudyngcloudy) https://github.com/Koenkk/zigbee-herdsman-converters/issues/5993 ([964ff3f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/964ff3fc918093b738670aa4dcac20b539575ef5))
* **add:** SPM02 ([#5992](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5992)) ([0d15404](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0d1540429ce84ce78ece5b3b03ece657e5a00a58))
* **add:** U86Z223A10-ZJU01(GD) ([#5976](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5976)) ([dcb2b69](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dcb2b693802b066ee663f9ff75e67a043889ffe0))


### Bug Fixes

* Disable unsupported `power_on_behavior` for Leviton DG15S-1BW. https://github.com/Koenkk/zigbee2mqtt/issues/18391 ([14ddcd0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/14ddcd0336db9f5310b1589f632c85f4dfd0c3ab))
* Disable unsupported `power_on_behavior` for ZLED-RGB9. https://github.com/Koenkk/zigbee2mqtt/issues/18364 ([03aa13a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/03aa13aab66c62b9b0e50415bd74095e276557ea))
* **ignore:** update dependencies ([#5996](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5996)) ([4b9062a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4b9062a7b37e608279e98342e8301ba7d63f7724))

## [15.44.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.43.0...v15.44.0) (2023-07-19)


### Features

* **add:** 915005987801 [@grahamhayes](https://github.com/grahamhayes) https://github.com/Koenkk/zigbee2mqtt/issues/18358 ([7cad5e8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7cad5e895d341677a6a162eff956aa7cde2d9439))
* **add:** YXZBRB58 ([#5985](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5985)) ([2ec578a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2ec578a399353f5ea46e4cb0bda7d8c9c32013d4))


### Bug Fixes

* **detect:** Detect `_TZE200_zxxfv8wi` as HUARUI CMD900LE  ([#5984](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5984)) ([d5b5c15](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d5b5c15fdf7d74a9e5e365b5fc953fee0ccf3ee1))

## [15.43.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.42.0...v15.43.0) (2023-07-18)


### Features

* Add "Tempo" Tarif for LiXee ZLinky_TIC ([#5977](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5977)) ([6924dd1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6924dd113193d827fd821d6b002a9f7cd756641e))
* **add:** 1402767 ([#5978](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5978)) ([f8e4677](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f8e46771f6f766f8995dc4d95fe4cfd12b4e2d52))
* **add:** 8719514491106 https://github.com/Koenkk/zigbee2mqtt/issues/18338 ([908247d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/908247d0d7ad0fc7f6a10f27aee1f54a0d1643b4))
* **detect:** Detect `_TZ3210_tkkb1ym8` as TuYa TS110E_1gang_2. https://github.com/Koenkk/zigbee2mqtt/issues/18349 ([302d15e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/302d15ecd67d6c7ac802f3c994219a7137c5cdd7))
* **detect:** Detect `TAFFETAS2 D1.00P1.03Z1.00` as Acova PERCALE 2 https://github.com/Koenkk/zigbee2mqtt/discussions/18355 ([6ef7901](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6ef7901b899f4eaeb11850ac8a7237493d161553))
* Support hue and saturation for Calex 421792 ([#5979](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5979)) ([17868fe](https://github.com/Koenkk/zigbee-herdsman-converters/commit/17868fe22f3c80561eb301e32796ba3d181f99be))
* Support sensitivity for ADEO LDSENK08. https://github.com/Koenkk/zigbee2mqtt/issues/16574 ([95b3407](https://github.com/Koenkk/zigbee-herdsman-converters/commit/95b3407d96623e36006c1a9d8c2418c42f5e2b87))

## [15.42.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.41.0...v15.42.0) (2023-07-17)


### Features

* **add:** 929003053401 [@maxk1337](https://github.com/maxk1337) https://github.com/Koenkk/zigbee2mqtt/issues/18341 ([933ff2f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/933ff2fe3ead2cc010cb72749c807864bb0aa770))
* **add:** M9-zigbee-SL ([#5965](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5965)) ([fc33990](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fc3399013aa0aeb6f2912138e60bed20f6047c05))
* Support pin and add `fingerprint` action for Heimgard Technologies HC-SLM-1 ([#5971](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5971)) ([eff5688](https://github.com/Koenkk/zigbee-herdsman-converters/commit/eff568876c710ba40eb91c701e5d12f5693f5ecf))


### Bug Fixes

* **ignore:** update dependencies ([#5973](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5973)) ([709590b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/709590b3552bb56988dbc55e6b7813c2a708353c))
* Mark MOTDETAT as not reportable for LiXee ZLinky_TIC ([#5970](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5970)) ([106d585](https://github.com/Koenkk/zigbee-herdsman-converters/commit/106d5852da3370c1bf5b7c8e4fe60f5a4781275c))

## [15.41.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.40.0...v15.41.0) (2023-07-15)


### Features

* **add:** BSP-GZ2 [@stefano-bortolotti](https://github.com/stefano-bortolotti) https://github.com/Koenkk/zigbee2mqtt/issues/13069 ([406569a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/406569a571ead75acd27505fc549d357f44ce51d))
* **add:** HT-SMO-2, HT-DWM-2 ([#5967](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5967)) ([9f13d39](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9f13d39ba65907fef2115a29c11220a002e3b235))
* Expose power outage memory for Mercator Ikuü SPP02G ([#5968](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5968)) ([88809d3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/88809d3d712d264a0473b8673af5fa941aa474cd))


### Bug Fixes

* **detect:** Detect `EBF_RGB_Zm_CLP` as EGLO 900091. https://github.com/Koenkk/zigbee2mqtt/issues/18322 ([33f4cb0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/33f4cb08c73026422566db2f2ffa2673b01fd38c))
* Update some Lidl light model numbers. https://github.com/Koenkk/zigbee2mqtt.io/pull/2132 ([bedeac7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bedeac7445aa8a9f19d547074987d064f0f59d80))

## [15.40.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.39.1...v15.40.0) (2023-07-13)


### Features

* **add:** E2201 ([#5964](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5964)) ([3440313](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3440313f70db9c5b4c33646091dbf704bd5db985))
* Support OTA for Legrand 067773 and 067774 ([#5963](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5963)) ([ac5e430](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ac5e4302a3a9cae06633c0a3290e755c8f8f6419))


### Bug Fixes

* **detect:** Detect `_TZ3000_ksw8qtmt` as Nous 1AZ. https://github.com/Koenkk/zigbee2mqtt/issues/18295 ([a6665af](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a6665af5de43c2b424dfaa01cb3a8ae797144d21))
* Fix `power_outage_memory` not working for Xiaomi ZNCZ12LM [@thekev](https://github.com/thekev) https://github.com/Koenkk/zigbee2mqtt/issues/15111 ([c0ef3c9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c0ef3c97de422e31d20787b69fbbb3e05e12e3fe))
* **ignore:** Fix a6665af5de43c2b424dfaa01cb3a8ae797144d21 ([7cd42cb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7cd42cbaa739aa8adcccf8bae84cec3a33ff51f8))
* **ignore:** Improve RTCZCGQ11LM zones description. https://github.com/Koenkk/zigbee2mqtt.io/pull/2127 ([910abaa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/910abaa1a2c3c7f98ce3ababa3b329c5769015d7))

## [15.39.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.39.0...v15.39.1) (2023-07-11)


### Bug Fixes

* **detect:** Detect `_TZE200_eanjj2pa` as Nous SZ-T04 ([#5960](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5960)) ([4d26608](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4d26608bfdbc3e6f3207b36660e159eb1bc5e75e))
* Fix invalid 0 power measurements for TuYa `_TZ3000_b28wrpvx` https://github.com/Koenkk/zigbee2mqtt/issues/16709 ([95e27ca](https://github.com/Koenkk/zigbee-herdsman-converters/commit/95e27cae9d453c1cae106edb7d09fc96be3d126b))

## [15.39.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.38.0...v15.39.0) (2023-07-10)


### Features

* **add:** 9290030519 ([#5958](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5958)) ([e3b5e19](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e3b5e197ad10122a99827c3c387b15e235b9e3b3))
* Expose `toggle` action for Philips 929003017102. https://github.com/Koenkk/zigbee2mqtt/issues/10740 ([73a0554](https://github.com/Koenkk/zigbee-herdsman-converters/commit/73a0554dab5602dcf5171ba53fccff964834d745))


### Bug Fixes

* **detect:** Detect `_TYZB01_hlla45kx` as ClickSmart+ CMA30036. https://github.com/Koenkk/zigbee2mqtt/issues/18265 ([bed01f6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bed01f64f756fb7d7108eedc03bd14463218313f))

## [15.38.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.37.0...v15.38.0) (2023-07-09)


### Features

* **add:** A319463 https://github.com/Koenkk/zigbee2mqtt.io/pull/2081 ([012f2d1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/012f2d103c156203d45796673e80fec3fd840bb2))
* **add:** C210 ([#5956](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5956)) ([0faa805](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0faa805f867279c01bee99ab009917a4c0ecf96b))
* **add:** ZS-TYG3-SM-61Z, ZS-TYG3-SM-21Z, ZS-TYG3-SM-31Z, ZS-TYG3-SM-41Z ([#5935](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5935)) ([fa5e2b9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fa5e2b959ffa925ba5c4abb95eb64ae6e1f9ef2e))


### Bug Fixes

* Fix Third Reality 3RSNL02043Z occupancy detection not working. https://github.com/Koenkk/zigbee2mqtt/issues/18238 ([34f1d2d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/34f1d2dc4fe63d48b05b2fd68d17fbcbcd5de638))
* **ignore:** Fix 012f2d103c156203d45796673e80fec3fd840bb2 ([38e1ae3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/38e1ae37bb98d954fe8736b94f9126c8f84df8ab))
* **ignore:** Fix 012f2d103c156203d45796673e80fec3fd840bb2 for real now ([6544f66](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6544f665490b44d0a57f82aafacaf86370e87a0a))
* **ignore:** update dependencies ([#5957](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5957)) ([c6f268f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c6f268f12807fdb3a5eabfa1b5c1921f965b27ab))

## [15.37.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.36.0...v15.37.0) (2023-07-07)


### Features

* **add:** MG-ZG01W, MG-ZG02W, MG-ZG03W ([#5939](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5939)) ([9a375a9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9a375a90e459e82229961116fc039c792ae35a32))
* **add:** TS0003_switch_3_gang_with_backlight ([#5953](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5953)) ([ee9a7ab](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ee9a7ab3b7a81b55d6a7b4f05b1614958743a6db))
* Update NodOn / ADEO description files and support OTA for some ([#5952](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5952)) ([ae047bb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ae047bb8ed7c8cf4f2a3e3d240e1524222f849fb))


### Bug Fixes

* **detect:** Detect `_TYZB01_mtunwanm` as ClickSmart+ CMA30035 https://github.com/Koenkk/zigbee2mqtt/issues/18242 ([d071c33](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d071c33d79604d139cf1c3157d18a15a6d057b8f))

## [15.36.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.35.1...v15.36.0) (2023-07-05)


### Features

* **add:** B1027EB4Z01 ([#5949](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5949)) ([1a5dc36](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1a5dc3664b58bfa8bcbf0c4c67f1fabb14046898))


### Bug Fixes

* Fix timers of RTX ZVG1 and Saswell SAS980SWT-7-Z01 ([#5948](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5948)) ([0c9bc38](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0c9bc38aea01c22242ac5df1872264878ba51a4e))
* Fix various Eco-Dim.07/Eco-Dim.10 variants not recognised ([#5946](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5946)) ([ac852a8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ac852a866b03870e7ae07e8b0679f42852ed28db))

## [15.35.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.35.0...v15.35.1) (2023-07-04)


### Bug Fixes

* Fix `is not a number, got string` errors https://github.com/Koenkk/zigbee2mqtt/issues/18169 ([05e3d2e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/05e3d2e0bf3a211dc20f1f7df8ae755658b350c1))

## [15.35.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.34.0...v15.35.0) (2023-07-04)


### Features

* **add:** 3RSPE01044BZ ([#5944](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5944)) ([783e2e6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/783e2e6a889ba63335aca6e00fbcf95e95c690ac))
* **add:** PEZ1-042-1020-C1D1 [@tetienne](https://github.com/tetienne) https://github.com/Koenkk/zigbee2mqtt/issues/18195 ([00ce858](https://github.com/Koenkk/zigbee-herdsman-converters/commit/00ce85823b71e5040b91696b96883f831dbce4da))
* Support colors for ADEO BD05C-FL-21-G-ENK https://github.com/Koenkk/zigbee2mqtt/issues/18111 ([e15efae](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e15efaeccdd983d10cc78c33bb05fc7056afdf58))


### Bug Fixes

* Add TuYa exports to `legacy.ts` https://github.com/Koenkk/zigbee-herdsman-converters/issues/5727 ([a974d57](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a974d5715076c364dccad933ea21f11e0a6f3ab8))
* Fix `Cannot read properties of null (reading 'from')` error for some TuYa devices https://github.com/Koenkk/zigbee2mqtt/issues/18184 ([dcf2cde](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dcf2cde582cd4735eb3ba26447264006b2db1249))
* Fix Namron/Lightsolutions Eco-Dim.07/Eco-Dim.10 not recognised https://github.com/Koenkk/zigbee2mqtt/issues/18171 ([06e4c15](https://github.com/Koenkk/zigbee-herdsman-converters/commit/06e4c1597412f0f631c7b975cd72747201b45b28))
* Fix no energy measurements for `_TZ3000_qeuvnohg` (will use polling now) ([#5943](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5943)) ([3bf2799](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3bf27990a43936d7f0a3a2588b3f98cc78b365ce))
* Fix QT-07S not reporting values [@phoenixswiss](https://github.com/phoenixswiss) https://github.com/Koenkk/zigbee-herdsman-converters/issues/5941 ([6f45381](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6f45381501f30cec76f64f268fa6c31c0022a0f6))
* Fix setting color temperature for groups with non color temperature lights not working https://github.com/Koenkk/zigbee2mqtt/issues/18168 ([16fa87f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/16fa87fcf75840cdc6b68be50df22c298203371a))

## [15.34.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.33.1...v15.34.0) (2023-07-02)


### Features

* Add OTA for multiple Legrand devices ([#5936](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5936)) ([b4e5a28](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b4e5a287d2faa94b7c2bc7e1a3f3050f020017cf))


### Bug Fixes

* **detect:** Detect `_TZE200_a8sdabtg` as TuYa ZG-227Z. https://github.com/Koenkk/zigbee2mqtt/issues/18158 ([70a9083](https://github.com/Koenkk/zigbee-herdsman-converters/commit/70a90831171e9414fa34758bb5595526847c9d48))
* **detect:** Detect `_TZE200_feolm6rk` as TuYa TS0601_cover_1 [@1060778506](https://github.com/1060778506) https://github.com/Koenkk/zigbee-herdsman-converters/issues/5843 ([0dddb8b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0dddb8ba40ce65749fe9b8d6c541b173800b526c))
* Fix `Expected one of: 1, 2, got: '29146'` error https://github.com/Koenkk/zigbee2mqtt/issues/17961 ([3fba669](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3fba669c63b66c9a0c87e8f5d2755d93557442a2))
* Fix Eco-Dim.07/Eco-Dim.10 not detected as supported https://github.com/Koenkk/zigbee2mqtt/issues/18171 ([aa8bc2b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aa8bc2bd05bfaed8e9b7d088ff901081c6093b85))
* **ignore:** update dependencies ([#5937](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5937)) ([3ee5226](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3ee5226d1eace678de8c5351bd8aab907e6e1134))
* Silence `Moes BHT-002: Unrecognized DP` warning message https://github.com/Koenkk/zigbee2mqtt/issues/17861 ([fb273e3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fb273e35cea228334710ed3fa24a688243f83e2d))

## [15.33.1-hotfix.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.33.1...v15.33.1-hotfix.0) (2023-07-08)


### Bug Fixes

* Fix `Expected one of: 1, 2, got: '29146'` error https://github.com/Koenkk/zigbee2mqtt/issues/17961 ([3fba669](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3fba669c63b66c9a0c87e8f5d2755d93557442a2))
* Fix Eco-Dim.07/Eco-Dim.10 not detected as supported https://github.com/Koenkk/zigbee2mqtt/issues/18171 ([aa8bc2b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aa8bc2bd05bfaed8e9b7d088ff901081c6093b85))
* Fix Namron/Lightsolutions Eco-Dim.07/Eco-Dim.10 not recognised https://github.com/Koenkk/zigbee2mqtt/issues/18171 ([06e4c15](https://github.com/Koenkk/zigbee-herdsman-converters/commit/06e4c1597412f0f631c7b975cd72747201b45b28))
* Fix `Cannot read properties of null (reading 'from')` error for some TuYa devices https://github.com/Koenkk/zigbee2mqtt/issues/18184 ([dcf2cde](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dcf2cde582cd4735eb3ba26447264006b2db1249))
* Add TuYa exports to `legacy.ts` https://github.com/Koenkk/zigbee-herdsman-converters/issues/5727 ([a974d57](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a974d5715076c364dccad933ea21f11e0a6f3ab8))
* Support colors for ADEO BD05C-FL-21-G-ENK https://github.com/Koenkk/zigbee2mqtt/issues/18111 ([e15efae](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e15efaeccdd983d10cc78c33bb05fc7056afdf58))
* Fix setting color temperature for groups with non color temperature lights not working https://github.com/Koenkk/zigbee2mqtt/issues/18168 ([16fa87f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/16fa87fcf75840cdc6b68be50df22c298203371a))
* Fix `is not a number, got string` errors https://github.com/Koenkk/zigbee2mqtt/issues/18169 ([05e3d2e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/05e3d2e0bf3a211dc20f1f7df8ae755658b350c1))
* Fix various Eco-Dim.07/Eco-Dim.10 variants not recognised ([#5946](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5946)) ([ac852a8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ac852a866b03870e7ae07e8b0679f42852ed28db))

## [15.33.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.33.0...v15.33.1) (2023-07-01)


### Bug Fixes

* Fix naming inconsistency for vendor Nous ([#5934](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5934)) ([6c458b0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6c458b02e986e2fba539aa6ea2aec377126fad8b))
* **ignore:** update dependencies ([#5932](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5932)) ([92afa1f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/92afa1ff3de67ad51a963243c3de1a0bbc98fd16))

## [15.33.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.32.0...v15.33.0) (2023-06-30)


### Features

* Add additional `pressed` action for HEIMAN HS2SS-E_V03 ([#5928](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5928)) ([1ff7011](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1ff7011ca707151e5f752769d38a03244dc62fba))
* **add:** 4058075729162, 4058075729087, 4058075729346 ([#5917](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5917)) ([6b8eec8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6b8eec87a5cf2f674a8400f39a3847a261dead89))
* **add:** SWS6TZ-WHITE ([#5927](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5927)) ([9132fca](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9132fca175550c3ed3ce87406d0ba979f06a500e))


### Bug Fixes

* Change brightness min reporting to 1 to prevent spamming of some devices ([#5925](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5925)) ([e82fe59](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e82fe59d00290b0351564dfa9bf25ac3312aaa19))
* Fix naming inconsistency for vendor LED-Trading ([#5931](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5931)) ([b1f6e97](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b1f6e9755cb23f417f7cf0dbb82e2b50bb640cfb))

## [15.32.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.31.0...v15.32.0) (2023-06-27)


### Features

* **add:** 03982 ([#5916](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5916)) ([db7eda8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/db7eda8f3ed0bd31c165ddf965ec1f2a6944c44c))
* **add:** BTH-RM ([#5915](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5915)) ([0f180fd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0f180fdddfaedbb6169ea93eb2e7edeeb7cc5205))
* **add:** Hive ([#5902](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5902)) ([ba89faf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ba89fafa6bb9791c8440da9f76880ea5326474ef))
* **add:** TS0601_bidirectional_energy [@fred-c1](https://github.com/fred-c1) https://github.com/Koenkk/zigbee2mqtt/issues/18130 ([72969d4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/72969d405375322639c82eded687e7a85ed32226))


### Bug Fixes

* **detect:** Detect `_TZE200_bv1jcqqu` as Zemismart ZM25RX-08/30 [@tekman54190](https://github.com/tekman54190) https://github.com/Koenkk/zigbee2mqtt/issues/17979 ([67c9b2f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/67c9b2f6ba9b2d533604dac27133a99f4c58eda5))
* **detect:** Detect `SV01-612-MP-1.4` as Keen Home SV01 ([#5923](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5923)) ([367b12f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/367b12f50b091ddc38ded46fa841359ba2cef100))
* **ignore:** fix 67c9b2f6ba9b2d533604dac27133a99f4c58eda5 ([90ff2f4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/90ff2f4a4cda0858b7ae38d7d1e3ed6c76dec604))

## [15.31.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.30.0...v15.31.0) (2023-06-26)


### Features

* Support occupancy and illuminance for Third Reality 3RSNL02043Z ([#5914](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5914)) ([c1f9b33](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c1f9b33b1fe24242762a2be459be5f5f9c063405))


### Bug Fixes

* **detect:** Detect `_TZE200_ga1maeof` as TuYa TS0601_soil ([#5911](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5911)) ([143bc6f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/143bc6ff7500b3f85c35dd3c5a18f4d17b078de1))
* Fix actions missing for PTM 215Z detected as Hue tap. https://github.com/Koenkk/zigbee2mqtt/issues/18088 ([aae25f7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aae25f7d09c1fc319997767da08cb9c15cbe46af))

## [15.30.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.29.0...v15.30.0) (2023-06-25)


### Features

* **add:** BD05C-FL-21-G-ENK https://github.com/Koenkk/zigbee2mqtt/issues/18111 ([b8bf5f0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b8bf5f0df00bf9d74f4e3f92d37659db12ad3d1b))
* **add:** ZNQBKG25LM ([#5909](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5909)) ([cd12999](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cd12999e080b7773c20c9d6c662457e336264463))
* Support child lock for TuYa TS011F_2_gang_2_usb_wall [@rodrigogbs](https://github.com/rodrigogbs) https://github.com/Koenkk/zigbee2mqtt/issues/11483 ([d2d86b1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d2d86b180f59f3d0fda881883f0bc89b95bffb63))


### Bug Fixes

* **detect:** Detect `_TZ3000_u3oupgdy` as MHCOZY TYWB 4ch-RF. https://github.com/Koenkk/zigbee2mqtt/issues/18102 ([c3094ab](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c3094abecb8dca6fa757fdc7ebbfe0c6ff6b257e))
* Fix EWeLink ZB-SW02 description. https://github.com/Koenkk/zigbee2mqtt/issues/18107 ([2ab9e85](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2ab9e8515bcc772408d8ffde8ca3285c816a90ee))
* Fix MULTI-ZIG-SW not working ([#5905](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5905)) ([68b0149](https://github.com/Koenkk/zigbee-herdsman-converters/commit/68b01497a538831a2a1287b2dfa64b73f4c52fb0))
* **ignore:** update dependencies ([#5910](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5910)) ([06ccb4b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/06ccb4bc8314ccbef8f261a953d8c58298563054))

## [15.29.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.28.0...v15.29.0) (2023-06-23)


### Features

* **add:** U86Z13A16-ZJH(HA) ([#5904](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5904)) ([9302b7e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9302b7ea8515d557ddb4b402fa8ada645f64ad75))


### Bug Fixes

* **detect:** Detect `_TZ3000_0s1izerx` as TuYa ZTH01/ZTH02. https://github.com/Koenkk/zigbee2mqtt/issues/18098 ([55c814d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/55c814dd5c262a2a61c9fe2e7aa1ea331a7a641d))
* **detect:** Detect `_TZE204_aoclfnxz` as Moes BHT-006GBZB. https://github.com/Koenkk/zigbee2mqtt/issues/18097 ([08e8fc5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/08e8fc576163d542fce595f8b9665a9454855b84))
* Fix TuYa TS000F_power current value incorrect https://github.com/Koenkk/zigbee2mqtt/issues/18041 ([044dab3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/044dab3ce10bc82128fd64178fa233ef4279a996))

## [15.28.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.27.0...v15.28.0) (2023-06-22)


### Features

* **add:** C202 https://github.com/Koenkk/zigbee2mqtt/issues/18081 ([30e6fcd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/30e6fcd2eec8098282056615bb7db14f4b352787))
* **add:** ST8EM-CON [@saschaludwig](https://github.com/saschaludwig) https://github.com/Koenkk/zigbee2mqtt/issues/18087 ([6c5930c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6c5930c741a426d97f77edc117adcc72832cd596))
* **add:** TERNCY-WS01 [@gcmilo704](https://github.com/gcmilo704) https://github.com/Koenkk/zigbee2mqtt/issues/18086 ([5016e9f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5016e9fce912bc60fa45b0811174e0e5edb08455))


### Bug Fixes

* Move 99099 from AwoX to EGLO. https://github.com/Koenkk/zigbee2mqtt.io/pull/2095 ([21e2b55](https://github.com/Koenkk/zigbee-herdsman-converters/commit/21e2b55c9dc799d4e1296b7e7de92664293406a0))

## [15.27.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.26.0...v15.27.0) (2023-06-20)


### Features

* Support OTA for Legrand 067771 and 067772 ([#5899](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5899)) ([bcd4a14](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bcd4a1482b5555bf75ea58feccc857d0ce99afbc))


### Bug Fixes

* **detect:** Detect `_TZE200_qtbrwrfv` as Alecto SMART-SMOKE10. https://github.com/Koenkk/zigbee-herdsman-converters/issues/5900 ([79cf184](https://github.com/Koenkk/zigbee-herdsman-converters/commit/79cf184a463a9656952cf27aea4b264d1834eba0))
* Fix invalid thermostat value handling ([#5892](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5892)) ([13d7016](https://github.com/Koenkk/zigbee-herdsman-converters/commit/13d7016fc05d297ec4bd03c9a80524a0c266c53e))
* **ignore:** Fix TuYa clock sync not working. https://github.com/Koenkk/zigbee2mqtt/issues/18002 ([05defde](https://github.com/Koenkk/zigbee-herdsman-converters/commit/05defded905f4e644380c0a8558136c107032e6d))

## [15.26.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.25.0...v15.26.0) (2023-06-19)


### Features

* **add:** 4512749-N ([#5895](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5895)) ([27357cd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/27357cd8b114e0414ad30d4d42038b8ed1d7c5a1))
* **add:** CL001 ([#5893](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5893)) ([c077311](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c07731147cda18f2675386603c36a8af6137db8a))
* **add:** TS0001_fingerbot ([#5883](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5883)) ([f9be764](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f9be7640d9b676cc0c87565b9bc756b34d4f71be))
* **add:** TS0002_switch_module_3 ([#5889](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5889)) ([eea6d94](https://github.com/Koenkk/zigbee-herdsman-converters/commit/eea6d94047a3f6d87e3061374ba5b558b4361192))
* **detect:** Detect `_TZE200_44af8vyi` as TuYa TS0601_temperature_humidity_sensor_1. https://github.com/Koenkk/zigbee2mqtt/issues/18057 ([87b1217](https://github.com/Koenkk/zigbee-herdsman-converters/commit/87b12172e769cfe605a3259eb4e31b4cfeb5233c))


### Bug Fixes

* Fix `ptvo.switch` not working ([#5894](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5894)) ([bd16a15](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bd16a15ee725de76693f795637dbb1624fb055fe))
* **ignore:** Fix zigbee OTA. https://github.com/Koenkk/zigbee2mqtt/issues/18060 ([cd321fb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cd321fb6d27e195cfabd2f437e036faadb194a1c))
* Rename ZY-M100-S to ZY-M100-L and TS0601_smart_human_presence_sensor_2 to ZY-M100-S ([#5891](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5891)) ([d575cdf](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d575cdf8de0f3a3c4cdf45216cfa2192781ee02a))
* RTX ZVG1 water_consumed unit (l -&gt; L) ([#5897](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5897)) ([d2dba53](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d2dba53c1d264e9edc201efacd75da28ccb2aa7f))

## [15.25.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.24.0...v15.25.0) (2023-06-18)


### Features

* **add:** 929003116101, 929003115701 ([#5884](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5884)) ([e6b763d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e6b763da327067514babfb2ab3e434bafa572b11))
* **add:** 98847 ([#5888](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5888)) ([0a8bd27](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0a8bd271d753f79a6998f7a1bf1ea520433bc0ba))


### Bug Fixes

* Fix Lidl HG08164 disconnecting from network ([#5886](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5886)) ([1f8bdf9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1f8bdf95c11f82eb263414772564d75f48bcd408))
* **ignore:** update dependencies ([#5890](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5890)) ([bcbaf02](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bcbaf02df613d0aa3674c26021ead383a7b927a9))

## [15.24.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.23.0...v15.24.0) (2023-06-14)


### Features

* **add:** MULTI-ZIG-SW ([#5877](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5877)) ([069b6c3](https://github.com/Koenkk/zigbee-herdsman-converters/commit/069b6c3e3028123a17293aac7ec9cc35697e2735))
* **add:** RB 255 C @B08Z https://github.com/Koenkk/zigbee2mqtt/issues/17978 ([324f5bc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/324f5bce234cce8e0aa8e48a2e9c9b755d19ca84))


### Bug Fixes

* **detect:** Detect `_TZ3000_g92baclx` as TuYa TS0001_power ([#5881](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5881)) ([3a1f5e9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3a1f5e97c074c834c51285b68cf5f879333068cb))
* **detect:** Detect `_TZE200_axgvo9jh` as Somgoms ZSTY-SM-1DMZG-US-W_1. https://github.com/Koenkk/zigbee2mqtt/issues/18016 ([348b639](https://github.com/Koenkk/zigbee-herdsman-converters/commit/348b6394e56b111123b35b4c6bd909c65ad189ff))
* **detect:** Detect `HK_DIM_A` as Candeo HK-DIM-A [@maans2001](https://github.com/maans2001) https://github.com/Koenkk/zigbee2mqtt/issues/18024 ([03c1590](https://github.com/Koenkk/zigbee-herdsman-converters/commit/03c15903e97f8488071010268f989c428bdc70d9))

## [15.23.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.22.0...v15.23.0) (2023-06-13)


### Features

* **add:** 3RSNL02043Z ([#5875](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5875)) ([f5c68ac](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f5c68ac048bcccb247e3800c25e393031b2e6c01))
* Allow to set more sensitivity levels for TuYa TS0210. https://github.com/Koenkk/zigbee2mqtt/issues/17977 ([a6ae4fd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a6ae4fd73b6e0d54a0f9ba053a51307d1e0548c6))
* Support OTA for Moes MS-108ZR [@cserem](https://github.com/cserem) https://github.com/Koenkk/zigbee-OTA/pull/325 ([1e9c995](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1e9c9958da8dad118cd9128c105535c30d2638ea))


### Bug Fixes

* Fix LifeControl MCLH-04 battery % incorrect. https://github.com/Koenkk/zigbee2mqtt/issues/18007 ([1d4e3cc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1d4e3cc732397fe1a2cd7ba7075f888d404ba3dd))

## [15.22.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.21.2...v15.22.0) (2023-06-12)


### Features

* **add:** 929003128401 @KHOne23 https://github.com/Koenkk/zigbee2mqtt/issues/17981 ([2966ed2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2966ed2473639de61a2d66a9eb3e8883eb5cbf38))
* **add:** 968.93 [@gritche2](https://github.com/gritche2) https://github.com/Koenkk/zigbee-herdsman-converters/issues/5876 ([004d872](https://github.com/Koenkk/zigbee-herdsman-converters/commit/004d87258114cb7a91716381b2370838e5128a84))
* **add:** NAS-AB06B2 ([#5878](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5878)) ([9ce2bea](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9ce2beadec6389d641475e4c3350e61940638f5c))
* **add:** SIN-4-1-20_LEX ([#5868](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5868)) ([3541b57](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3541b57f5cd3d5c8f02a5ff369bf6b8d8644ed06))
* **detect:** Detect `_TZ3000_rqbjepe8` as Nous A4Z ([#5879](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5879)) ([2f00e18](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2f00e18dee8f66bf2407a6913a052af433715020))
* **detect:** Detect `_TZE200_leaqthqq` as TuYa TS0601_switch_5_gang. https://github.com/Koenkk/zigbee2mqtt/issues/17969 ([1e7eb70](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1e7eb7014eb84b1dd70330d61b954761892bfacf))
* Support `power_on_behavior` for Gledopto GL-B-007P. https://github.com/Koenkk/zigbee2mqtt/issues/17970 ([4cbe8f7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4cbe8f7cf098e046a4ddaf9398c1c178af1bc6b6))


### Bug Fixes

* **detect:** Detect `_TZ3000_ss98ec5d` as Moes ZK-EU. https://github.com/Koenkk/zigbee2mqtt/issues/17996 ([3676845](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3676845d19c8d944a230669436dd88cb5259101e))
* **detect:** Detect `_TZ3000_zw7wr5uo` as Mercator Ikuü SMI7040 ([#5870](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5870)) ([bf0e379](https://github.com/Koenkk/zigbee-herdsman-converters/commit/bf0e37924aaaf0da895c3d94e2b2aec02dfaa9c9))
* **detect:** Detect `_TZE200_nyvavzbj` as Immax 07505L. https://github.com/Koenkk/zigbee2mqtt/discussions/17973 ([ca82536](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ca82536ff1bd9abf7fa7a8b27392690105c2e1c3))
* Disable OTA for Philips 9290030674 as none is available currently. https://github.com/Koenkk/zigbee2mqtt/issues/14923 ([260826c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/260826cb22d6f106993dd2a41666668ee9e1d44c))
* Disable OTA for Philips 9290030675 since non is available. https://github.com/Koenkk/zigbee2mqtt/issues/14923 ([f45cb2b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f45cb2b5d207d78ed06164b55c43adc9e1bc0b4d))
* **ignore:** Lowercase some Mercator Ikuü descriptions. https://github.com/Koenkk/zigbee-herdsman-converters/pull/5871 ([0479cbd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0479cbd4ddde11ed93fcebb016f0970269648511))
* **ignore:** update dependencies ([#5874](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5874)) ([7b1f1d8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7b1f1d8ed1935d152f8e7efc96d20b3d589d6f15))
* Normalise Mercator Ikuü vendor and device naming ([#5871](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5871)) ([f5502a7](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f5502a7626aead1eb94f1430ee237fd0b3fb72fd))
* TS refactor ([d0d1832](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d0d18322484b58e902734ab697b12e7a98606727))

## [15.21.2](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.21.1...v15.21.2) (2023-06-08)


### Bug Fixes

* **ignore:** Fix 0d0ceb2631ff65379ddbd7a99591453558741b4c ([7c03d14](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7c03d14745b289bd8b56c9e08e69d5948644943b))

## [15.21.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.21.0...v15.21.1) (2023-06-08)


### Bug Fixes

* **ignore:** Fix exports ([0d0ceb2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0d0ceb2631ff65379ddbd7a99591453558741b4c))

## [15.21.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.20.0...v15.21.0) (2023-06-08)


### Features

* **add:** D077-ZG https://github.com/Koenkk/zigbee-herdsman-converters/issues/5859 ([c66dc5f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c66dc5fa847474f4af3d97650479925206c1be3f))
* **add:** OFL 122 C https://github.com/Koenkk/zigbee2mqtt/issues/17965 ([80725bd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/80725bde8c4cf486edc606a19e1d6fec7169823b))
* **add:** ZNQBKG24LM ([#5863](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5863)) ([55731de](https://github.com/Koenkk/zigbee-herdsman-converters/commit/55731defe6820bbedc077c4391d3f25af1c872b2))
* **detect:** Detect `_TZ3000_lepzuhto` as EARU EAKCB-T-M-Z ([#5864](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5864)) ([9db91c5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9db91c5f291d352bd87c6a570ab25481e1e72447))


### Bug Fixes

* Disable unsupported `power_on_behavior` for LEDVANCE 4058075729322 @GerdRuetten  https://github.com/Koenkk/zigbee2mqtt.io/pull/2078 ([7047c6b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7047c6bb74c3adde468aff6dd8da2df6eb4f317d))
* Fix Ubisys C4, D1, J1, R0, S2 and S1-R latest OTA not available @WhistleMaster  https://github.com/Koenkk/zigbee-OTA/pull/317 ([7e5aef0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7e5aef02105533f2242c0372b1006ba0de0fa2d4))
* **ignore:** TS refactor ([62f09d4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/62f09d4592a4e9f38874eba217560bad6cb6412e))
* **ignore:** TS refactor ([#5850](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5850)) ([0c3f1b9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0c3f1b9f3fb45fb6e3c24b97b7765245238e11ac))

## [15.20.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.19.1...v15.20.0) (2023-06-08)


### Features

* **add:** 929002401001 ([#5854](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5854)) ([d294d0a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d294d0aba2fcfc6483c8bb813e878f4229164d5d))
* **add:** 948.47 [@fsedarkalex](https://github.com/fsedarkalex) https://github.com/Koenkk/zigbee2mqtt/issues/17933 ([9e98fa6](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9e98fa6795cd95deadceb3c6aa21f21957748425))
* **add:** 99099 ([#5853](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5853)) ([1bf3f61](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1bf3f6118f5b309e358ed309aee7915eda41d5dc))
* **detect:** Detect `SM323` as Samotech SM323. https://github.com/Koenkk/zigbee2mqtt/issues/17937 ([03f8046](https://github.com/Koenkk/zigbee-herdsman-converters/commit/03f804694814d94e01f37b4973e16a6b9326c5d1))
* Expose power per phase and add desriptions for TuYa TS0601_rcbo ([#5856](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5856)) ([beee574](https://github.com/Koenkk/zigbee-herdsman-converters/commit/beee574e08cebbe9a08563a905f2153dd727005b))


### Bug Fixes

* Fix strange "Â" in device description and unit. https://github.com/Koenkk/zigbee-herdsman-converters/issues/5857 ([e662c7b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e662c7b747a025f8c91c43d34bb0f4e6c1dbca90))
* **ignore:** Fix axis reporting for 3RVS01031Z ([#5858](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5858)) ([12a6213](https://github.com/Koenkk/zigbee-herdsman-converters/commit/12a621320e2ad5805236146ef5b20eb02e648e32))
* **ignore:** Fix errors in Xiaomi converters. https://github.com/Koenkk/zigbee2mqtt/issues/17952 ([65e0602](https://github.com/Koenkk/zigbee-herdsman-converters/commit/65e060265216ab26d68a6e6553a401638213116f))
* update changelog ([f054270](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f054270576cfcd06944b208528f4df65207c0428))

## [15.19.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.19.0...v15.19.1) (2023-06-07)


### Bug Fixes

* Fix type imports ([aa5ad41](https://github.com/Koenkk/zigbee-herdsman-converters/commit/aa5ad41f643db6c7abad3415ca2fbdf501cfd6d2))
* **ignore:** Fix exports ([fceae62](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fceae624a37b55719c1d2f475b90a6187a8d2809))

## [15.19.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.18.0...v15.19.0) (2023-06-07)


### Features

* **add:** 12226 [@fsedarkalex](https://github.com/fsedarkalex) https://github.com/Koenkk/zigbee2mqtt/issues/17932 ([85bedb2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/85bedb2aaa46946170dfbbdf3d0196f4c2a16798))
* **add:** 948.47 [@fsedarkalex](https://github.com/fsedarkalex) https://github.com/Koenkk/zigbee2mqtt/issues/17933 ([dd9c620](https://github.com/Koenkk/zigbee-herdsman-converters/commit/dd9c6202fd36b9aae0862178740e1a97cde312da))
* **detect:** Detect `_TZ3000_nnwehhst` as TuYa TS0003_switch_module_1 [@mersadk](https://github.com/mersadk) https://github.com/Koenkk/zigbee2mqtt/issues/17928 ([ba9c117](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ba9c11798d6c7c54df2d458187d1dd3a6af7eabc))
* **detect:** Detect `_TZE200_bjzrowv2` as TuYa TS0601_cover_1 ([#5851](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5851)) ([4846e14](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4846e14b33470d90ad055415f8b56464abc0cf1d))
* **detect:** Detect `RDM003` as Philips 8718699693985 ([#5849](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5849)) ([2f5a7dd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2f5a7dde51be43cc0f1314476cc211d0f1f2d1be))
* Expose `MOTDETAT` for Lixee ZiPulses ([#5848](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5848)) ([d2268ae](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d2268aeb13d7d94ec8addcb02603977f58d42b0d))


### Bug Fixes

* **ignore:** Fix dd9c6202fd36b9aae0862178740e1a97cde312da ([82ad852](https://github.com/Koenkk/zigbee-herdsman-converters/commit/82ad852c4217fab872e0f687ef2f6dbda088946f))
* **ignore:** TS refactor ([22bf5b2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/22bf5b2edc2d136dc182131c8cac7f4d058c5579))
* **ignore:** TS refactor ([9b361c8](https://github.com/Koenkk/zigbee-herdsman-converters/commit/9b361c8742d56d3e02723f49d289ec6cd9d2d15f))
* TS refactor ([5394cfb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5394cfbd52c53a5bf7d3c8a8662662ea5722237a))
* TS refactor ([4e96286](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4e962860e127229259f43915c26afb0583ff94b3))
* TS refactor ([e1f8b3c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e1f8b3c537a99891dfb451734e52bfd2da643a20))

## [15.18.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.17.0...v15.18.0) (2023-06-05)


### Features

* **detect:** Detect `_TZE200_9cxuhakf` as Mercator Ikuü SSWM-DIMZ. https://github.com/Koenkk/zigbee2mqtt/issues/17913 ([93ea5da](https://github.com/Koenkk/zigbee-herdsman-converters/commit/93ea5da558c221eae85f4c59d7f3d76608f70a7d))
* **detect:** Detect `_TZE200_bqcqqjpb` as Yushun YS-MT750L ([#5840](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5840)) ([5f31082](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5f310822db20460c7d6ee85b180cd9682928ad64))
* **detect:** Detect `_TZE200_mja3fuja` as TuYa TS0601_smart_air_house_keeper. https://github.com/Koenkk/zigbee2mqtt/issues/17439 ([994e681](https://github.com/Koenkk/zigbee-herdsman-converters/commit/994e68197cee2c0f0cd85ff4b5762d9b171859ab))


### Bug Fixes

* Disable unsupported `power_on_behaviour` for Innr FL 130 C ([#5842](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5842)) ([0de0829](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0de0829374afa7b8db36099f787d58e7c0606f1d))

## [15.17.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.16.0...v15.17.0) (2023-06-04)


### Features

* **detect:** Detect `_TZ3000_4rbqgcuv` as AVATTO ZWSM16-1-Zigbee https://github.com/Koenkk/zigbee2mqtt/issues/17907 ([5916a1e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5916a1e15645d5b396a884884f548ac479bdf8f5))
* **detect:** Detect `_TZ3000_mtnpt6ws` as AVATTO ZWSM16-2-Zigbee. https://github.com/Koenkk/zigbee2mqtt/issues/17902 ([cca94e4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cca94e43516623b1b9232665fc9402042d68d9fc))


### Bug Fixes

* **ignore:** update dependencies ([#5839](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5839)) ([302153c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/302153cdd5cc6b6f293cbb7bf692819bea2c74df))

## [15.16.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.15.1...v15.16.0) (2023-06-03)


### Features

* **add:** 929003128701 https://github.com/Koenkk/zigbee2mqtt/issues/17890 ([e675f98](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e675f98109264e9f10234e0cf9af72b8372d842d))
* **add:** TH-110-ZB ([#5835](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5835)) ([667a66f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/667a66fa6eb754b65783f77c9a251cf445e34c0e))
* **detect:** Detect `_TZE200_nw1r9hp6` as Zemismart ZM85EL-2Z. https://github.com/Koenkk/zigbee2mqtt/issues/11251 ([636d1b4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/636d1b4705117bcc80090e2b90cbfa800678f3fb))
* **detect:** Detect `_TZE204_wbhaespm` as RTX ZCR1-40EM ([#5834](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5834)) ([eae029d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/eae029d0023af7c38c6fa41e401a9c2c9a00858a))


### Bug Fixes

* Fix TuYa TS011F_1 and TS011F_4 not detected https://github.com/Koenkk/zigbee2mqtt/issues/17883 ([7452dc1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7452dc1ace5caab1d62254cf54c7bfa143634e56))

## [15.15.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.15.0...v15.15.1) (2023-06-02)


### Bug Fixes

* **ignore:** Fix getFromLookup. https://github.com/Koenkk/zigbee2mqtt/issues/17880 ([6dedb6b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6dedb6b8d8a32bacf08a7a8043e889460aa033be))
* TS refactor ([cdbca3a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cdbca3aa91cf0ce9220cb6328a840277bf281960))
* TS refactor ([d498494](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d4984944a161b96a855abc59171d7abd49695db8))

## [15.15.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.14.1...v15.15.0) (2023-06-02)


### Features

* Support OTA for NodOn SIN-4-RS-20 @AlexisPolegato https://github.com/Koenkk/zigbee-OTA/pull/318 ([96f288b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/96f288b37c6c2d98b795d105a2b49847c434ac47))


### Bug Fixes

* **ignore:** Fix assertNumber https://github.com/Koenkk/zigbee2mqtt/issues/17866 ([2b70550](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2b70550d72675f78490bae23ace168c554f8d223))

## [15.14.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.14.0...v15.14.1) (2023-06-01)


### Bug Fixes

* **ignore:** Improve Access type check ([beadb08](https://github.com/Koenkk/zigbee-herdsman-converters/commit/beadb081d02a61930ab653c213c291a980dcbb56))

## [15.14.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.13.1...v15.14.0) (2023-06-01)


### Features

* **add:** HA-ZGMW2-E https://github.com/Koenkk/zigbee2mqtt/issues/17840 ([2842729](https://github.com/Koenkk/zigbee-herdsman-converters/commit/284272920586be98fd910157067608564fb5577b))
* **add:** ZSS-QY-SSD-A-EN ([#5827](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5827)) ([5baf7b4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5baf7b4bbbdb89e27e99c54414b7285cbb212781))
* Make lookup commands to TuYa devices case insensitive. https://github.com/Koenkk/zigbee2mqtt/issues/17856 ([1b99bf2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1b99bf27c19749f8225acfa060ca2eaa7253da3a))


### Bug Fixes

* Align options.supportsHS with meta.supportsHueAndSaturation ([#5811](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5811)) ([e6f0399](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e6f0399352bf9291399303f646c29444ae3026e2))
* **detect:** Detect `_TZE204_5toc8efa` as Moes BHT-002-GCLZB. https://github.com/Koenkk/zigbee2mqtt/issues/17857 ([facac61](https://github.com/Koenkk/zigbee-herdsman-converters/commit/facac619288228fcd8bfff05ae8e439bb94b6eb0))
* Fix HSV colors incorrect (disable gamma correction) ([#5820](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5820)) ([b91a81b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b91a81baef9cc10a655ba1af8687e913147ab7df))
* Fix TuYa TS0601_dimmer_knob `indicator_mode` ([#5830](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5830)) ([901ca75](https://github.com/Koenkk/zigbee-herdsman-converters/commit/901ca759b7bfa5bf409504f30a27c7a6bec820b9))
* **ignore:** TS refactor ([#5812](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5812)) ([ece02be](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ece02be31b93040d75d030a3d637b18198555567))

## [15.13.1-hotfix.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.13.1-hotfix.0...v15.13.1-hotfix.1) (2023-06-07)


### Bug Fixes

* **ignore:** Fix 6e91fbb2947d0d272df6941092b490c2fcf6d5bc ([df01d07](https://github.com/Koenkk/zigbee-herdsman-converters/commit/df01d077a944f139039054add18aeb08f68f252a))

## [15.13.1-hotfix.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.13.1...v15.13.1-hotfix.0) (2023-06-07)


### Bug Fixes

* Fix occupancy detection not working for TuYa TS0202 (`_TZ3040_bb6xaihh`). https://github.com/Koenkk/zigbee2mqtt/issues/17364 ([6538217](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6538217f642f0820aa6158087d6e6caca41cf922))
* Fix incorrect actions for TuYa TS0044. https://github.com/Koenkk/zigbee2mqtt/issues/17862 ([6e91fbb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6e91fbb2947d0d272df6941092b490c2fcf6d5bc))
* Fix IKEA E2103 battery reporting https://github.com/Koenkk/zigbee2mqtt/issues/17888 ([a60fa86](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a60fa868d986e2d7aaed75cfc2b5850866ef7896))
* Fix some TuYa TS011F detected incorrectly. ([d5958a5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d5958a5d1f60938cf875fc468716634736ee29c5))
* IKEA FYRTUR and friends on fwVer &gt;= 24 have wrong checkinInterval after OTA ([#5838](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5838)) ([17a92fa](https://github.com/Koenkk/zigbee-herdsman-converters/commit/17a92fae4695fee39656b13e6fec534eae2786d4))
* Fix IKEA E2123  SYMFONISK gen2 battery % incorrect ([#5844](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5844)) ([582f76f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/582f76f61866d7879c721b4076a318c8c9410110))

## [15.13.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.13.0...v15.13.1) (2023-06-01)


### Bug Fixes

* Fix ci and exports ([3c6d5df](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3c6d5dffd98dac29c985abd7ad58d11fee3c65af))
* **ignore:** Fix `_TZE204_ztc6ggyl` whitelabel ([750814d](https://github.com/Koenkk/zigbee-herdsman-converters/commit/750814d8fe7b634e57341197507bf0a9882d4192))
* **ignore:** Fix °C unit ([485078c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/485078c1c550ce1c24e4896cbe58f717d1803b42))
* **ignore:** Fix tests ([a9b47b4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/a9b47b43d5e0eae3918d5aad99e8841f01be8aa6))

## [15.13.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.12.0...v15.13.0) (2023-05-31)


### Features

* **add:** GW02 ([#5818](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5818)) ([37d83d9](https://github.com/Koenkk/zigbee-herdsman-converters/commit/37d83d930b80f0e93c39c89f5686fabf7eb1756e))
* Expose `filter_age` for IKEA E2007 ([#5816](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5816)) ([39a1928](https://github.com/Koenkk/zigbee-herdsman-converters/commit/39a19280e2dba2e0bbbee3d54667c52f85b31a5d))
* Expose `x_axis`, `y_axis` and `z_axis` for Third Reality 3RVS01031Z ([#5822](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5822)) ([54218df](https://github.com/Koenkk/zigbee-herdsman-converters/commit/54218dfb735fee6c95b46dfd87a452f00b016901))


### Bug Fixes

* **detect:** Detect `_TZ3210_dse8ogfy` as Adaprox TS0001_1. https://github.com/Koenkk/zigbee2mqtt/issues/17841 ([5ac0a39](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5ac0a39d1c01a6b649019a473780e764d88ac016))
* Fix missing OTA endpoint for Xiaomi SSM-U01. https://github.com/Koenkk/zigbee2mqtt/issues/17835 ([354bedc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/354bedc2376d9d073d423239bb679ca8c834e16d))

## [15.12.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.11.0...v15.12.0) (2023-05-30)


### Features

* **add:** b-parasite ([#5810](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5810)) ([b1c249a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/b1c249a36c116b2a6f7fd8d9d842212be41b62fa))
* Support `tamper` and `battery` for Develco WISZB-121 ([#5813](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5813)) ([fb2a454](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fb2a4547d323d2a26d0fffe3b05f3b5d5346140f))
* TS refactor ([e1fa8e1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e1fa8e1b6d32c0cf78453028703c8935c799d7f3))


### Bug Fixes

* Fix missing power source of Sonoff SNZB-02D ([#5808](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5808)) ([30b2a9b](https://github.com/Koenkk/zigbee-herdsman-converters/commit/30b2a9bc038180ae8f6d63735876a5c922b2be56))
* Fix occupancy detection not working for TuYa TS0202 (`_TZ3040_bb6xaihh`). https://github.com/Koenkk/zigbee2mqtt/issues/17364 ([6538217](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6538217f642f0820aa6158087d6e6caca41cf922))
* **ignore:** Export Lock class ([#5814](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5814)) ([0a8161f](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0a8161f146c99c222fb14077894f70e6c57f8050))
* **ignore:** fix 1409e99e975144187b9ea58eadbf9de6a8fec95c ([4649dcc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4649dccd59a1319fd8c0c81420fcb0491a9c52a3))
* **ignore:** fix minor comment typo in src/lib/light.js ([#5809](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5809)) ([0ef8e51](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0ef8e51a8b64d9256a37c59f24c9ecbd3b92e6ed))
* **ignore:** Fix TAFFETAS2 model ID ([#5815](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5815)) ([3fd3bc4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3fd3bc4d32335f9474f36f2fdfdf51acfa01d2a8))
* **ignore:** TS refactor ([7d98618](https://github.com/Koenkk/zigbee-herdsman-converters/commit/7d98618204f2288fc4cbb07d091305f8a5921fe7))
* **ignore:** update dependencies ([#5807](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5807)) ([13bc7c4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/13bc7c45dc28fc07f07707b665ad19793c261a42))

## [15.11.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.10.0...v15.11.0) (2023-05-27)


### Features

* **add:** 1402769 https://github.com/Koenkk/zigbee-herdsman-converters/issues/5766 ([5735246](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5735246aea06e8266e7bc491ca30ad02ab73fdad))
* **add:** MC-02 ([#5799](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5799)) ([87b196c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/87b196cbc2e206c31959709e09298db3f34440c9))
* Support `power_on_behavior` and `switch_type` for TuYa TS110E_1gang_1 [@reyko01](https://github.com/reyko01)  https://github.com/Koenkk/zigbee2mqtt/issues/15372 ([fb7c604](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fb7c6045a2117f7176ceaad034b88706c350cc43))
* **ignore:** TS refactor ([#5804](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5804)) ([1b6d940](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1b6d940c14e73c99dad328aad3b6618f2471a917))

## [15.10.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.9.0...v15.10.0) (2023-05-26)


### Features

* **add:** LDSENK02S ([#5803](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5803)) ([cad4c52](https://github.com/Koenkk/zigbee-herdsman-converters/commit/cad4c5299158ba1df3e97a146c95146ad535e4c4))
* **ignore:** TS refactor ([#5801](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5801)) ([d11cbe1](https://github.com/Koenkk/zigbee-herdsman-converters/commit/d11cbe137e5fb4d0e6d8eabdb7eba5064409b8e5))


### Bug Fixes

* **ignore:** fix trailing space in SNZB-02P description ([#5800](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5800)) ([5900bf0](https://github.com/Koenkk/zigbee-herdsman-converters/commit/5900bf0001ae0f3218c87488944b874aeb0f8c39))

## [15.9.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.8.2...v15.9.0) (2023-05-25)


### Features

* **add:** SNZB-01P, SNZB-02P, SNZB-04P ([#5796](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5796)) ([c6f590e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/c6f590e7c3df3f9f9b72eea28924b78f5228241d))
* Support OTA for Develco WISZB-120 [@ultrabug](https://github.com/ultrabug) https://github.com/Koenkk/zigbee-OTA/pull/311 ([4b84aff](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4b84aff3562fc801719d9e03f37fe31b7a99dcd1))


### Bug Fixes

* Fix BTicino K4027C/L4027C/N4027C/NT4027C not updating state. https://github.com/Koenkk/zigbee2mqtt/issues/17785 ([49aff15](https://github.com/Koenkk/zigbee-herdsman-converters/commit/49aff1525c2033bdad4bbcb79828dbfbd32c4921))

## [15.8.2](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.8.1...v15.8.2) (2023-05-24)


### Bug Fixes

* **ignore:** ci.yml ([e7c1d90](https://github.com/Koenkk/zigbee-herdsman-converters/commit/e7c1d90e2826fc88354df66872ff978571347d61))

## [15.8.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.8.0...v15.8.1) (2023-05-24)


### Bug Fixes

* **ignore:** fix ci.yml ([38cda3a](https://github.com/Koenkk/zigbee-herdsman-converters/commit/38cda3afa354620fc2888bc65d5f764a7f6ffa8e))

## [15.8.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.7.1...v15.8.0) (2023-05-24)


### Features

* **add:** 9135 [@anharald](https://github.com/anharald) https://github.com/Koenkk/zigbee2mqtt/issues/17786 ([16ba1db](https://github.com/Koenkk/zigbee-herdsman-converters/commit/16ba1db909eb78b0c3c1e1e1403294c019432ab8))
* **add:** S902M-ZG https://github.com/Koenkk/zigbee2mqtt/issues/14733 ([2b45558](https://github.com/Koenkk/zigbee-herdsman-converters/commit/2b45558cebb255d339573149ee630d677a8cf7fc))
* **add:** SM0202 https://github.com/Koenkk/zigbee2mqtt/issues/15772 ([fcb9c1e](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fcb9c1e5d93f9f550c16e542e945a74c2fac5272))
* Improvements for Custom devices (DiY) ptvo.info ([#5792](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5792)) ([6f2b2bc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/6f2b2bc904e668103acc9b6b9f67699e6c556553))

## [15.7.1](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.7.0...v15.7.1) (2023-05-24)


### Bug Fixes

* **add:** T2106 ([#5789](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5789)) ([3b2082c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/3b2082c0ad159f193afe4261d989c162ac96156b))
* **detect:** Detect `SV01-412-MP-1.3` as Keen Home SV01 ([#5787](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5787)) ([fdaa6a4](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fdaa6a41641d16c07e593bbe571f6939ac3f7f21))
* **ignore:** fix update_dependencies.yml ([8d82943](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8d8294357907ce2ae810242cc0ecc02d8c622116))
* **ignore:** improve CI setup ([595a5fd](https://github.com/Koenkk/zigbee-herdsman-converters/commit/595a5fdc9fc672b7313314db84ace4258e06c0c9))

## [15.7.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.6.0...v15.7.0) (2023-05-23)


### Features

* Log TuYa `Unhandled DP` and `NOT RECOGNIZED DP` as debug instead of warn. https://github.com/Koenkk/zigbee2mqtt/issues/17615 ([4717a6c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/4717a6c8ad9ab9b0bf62ce65c9fd277555f92745))


### Bug Fixes

* **add:** GL-SD-003P https://github.com/Koenkk/zigbee2mqtt/issues/17773 ([ade80ab](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ade80abd29dfea8c7209689950d344165e282f4b))
* **detect:** Detect `_TYZB01_sqmd19i1` as TuYa TS0207_water_leak_detector_3. https://github.com/Koenkk/zigbee2mqtt/issues/17763 ([844c712](https://github.com/Koenkk/zigbee-herdsman-converters/commit/844c712a5275621926e2937da866548a1e8ea5f3))
* **detect:** Detect `_TZ3000_ocjlo4ea` as TuYa TS0207_water_leak_detector_1. https://github.com/Koenkk/zigbee2mqtt/issues/17761 ([ab00fbb](https://github.com/Koenkk/zigbee-herdsman-converters/commit/ab00fbb43b35a7d51f810bc235ed00de380c96d2))
* **detect:** Detect `_TZ3000_upgcbody` as TuYa `TS0207_water_leak_detector_2`. https://github.com/Koenkk/zigbee2mqtt/issues/17762 ([82cdaf5](https://github.com/Koenkk/zigbee-herdsman-converters/commit/82cdaf5b94770c1afdbe2d44b1ce0ae447032005))
* **detect:** Detect `_TZ3000_wbloefbf` as TuYa TS011F_switch_5_gang. https://github.com/Koenkk/zigbee2mqtt/issues/17726 ([748939c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/748939ca1fceef635ecc28194591c29f0a9a68e8))
* **detect:** Detect `_TZ3210_it1u8ahz` as TuYa TS0505B_1_2. https://github.com/Koenkk/zigbee2mqtt/issues/17759 ([f77f831](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f77f831897db41b68abb0e09ccfd964017ff1345))
* **detect:** Detect `_TZE204_cjbofhxw` as TuYa PJ-MGW1203 https://github.com/Koenkk/zigbee2mqtt/issues/17637 ([f2303f2](https://github.com/Koenkk/zigbee-herdsman-converters/commit/f2303f280017e4cf72fdd5a23e131dc2873c76f5))
* Fix `voltage`, `power` and `current` readings of TuYa TS011F_plug. https://github.com/Koenkk/zigbee2mqtt/issues/16709 ([8d8cc09](https://github.com/Koenkk/zigbee-herdsman-converters/commit/8d8cc09250b729760859a66bdd118ca5ad14d76c))
* **ignore:** Fix 4717a6c8ad9ab9b0bf62ce65c9fd277555f92745 ([fd883af](https://github.com/Koenkk/zigbee-herdsman-converters/commit/fd883af9cf1f131cca01eb2b0e08e3962818e4d3))

## [15.6.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.5.0...v15.6.0) (2023-05-23)


### Features

* Support `illuminance_lux ` for Xiaomi ZNCLBL01LM ([#5781](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5781)) ([1710dbc](https://github.com/Koenkk/zigbee-herdsman-converters/commit/1710dbc35e20f07d1a743f00a6f2269b692637a9))

## [15.5.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.4.0...v15.5.0) (2023-05-22)


### Features

* **detect:** Detect `_TZ3000_l6iqph4f` as Lonsonho TS130F_dual. https://github.com/Koenkk/zigbee2mqtt/issues/17753 ([57af54c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/57af54ca8cfe0b5f34dd6fa1b911ec514f50d5f8))

## [15.4.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.3.0...v15.4.0) (2023-05-22)


### Features

* **add:** 199182 ([#5768](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5768)) ([81089ff](https://github.com/Koenkk/zigbee-herdsman-converters/commit/81089ff51df4f33db2b15e7ba0b926a3027cfb58))

## [15.3.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.2.0...v15.3.0) (2023-05-22)


### Features

* **detect:** Detect `_TZ3000_eei0ubpy` as TuYa TS0002_switch_module. https://github.com/Koenkk/zigbee2mqtt/issues/17752 ([0e61bac](https://github.com/Koenkk/zigbee-herdsman-converters/commit/0e61bace69791e6bb5ebefed990fd87c6619c80b))

## [15.2.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.1.0...v15.2.0) (2023-05-22)


### Features

* Support more features for Acova TAFFETAS2 ([#5773](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5773)) ([965eb3c](https://github.com/Koenkk/zigbee-herdsman-converters/commit/965eb3c2edeb0427f1de788932971dc95ac7eda3))

## [15.1.0](https://github.com/Koenkk/zigbee-herdsman-converters/compare/v15.0.117...v15.1.0) (2023-05-22)


### Features

* **add:** HSE2936T ([#5772](https://github.com/Koenkk/zigbee-herdsman-converters/issues/5772)) ([2342194](https://github.com/Koenkk/zigbee-herdsman-converters/commit/23421941b103eede5c8351ba5a61ae04fec034bf))
