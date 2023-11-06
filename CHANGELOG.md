# Changelog

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
