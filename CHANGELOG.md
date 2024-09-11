# Changelog

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
