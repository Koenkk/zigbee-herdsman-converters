# Changelog

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
