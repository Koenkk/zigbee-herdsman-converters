'use strict';

/**
 * Documentation of 'meta'
 *
 * configureKey: required when a 'configure' is defined, this key is used by the application to determine if the
 *               content of the configure has been changed and thus needs to re-execute it. For a currently
 *               unsupported device you can set this to 1.
 * multiEndpoint: enables the multi endpoint functionallity in e.g. fromZigbee.on_off, example: normally this
 *                converter would return {"state": "OFF"}, when multiEndpoint is enabled the 'endpoint' method
 *                of the device definition will be called to determine the endpoint name which is then used as
 *                key e.g. {"state_left": "OFF"}. Only needed when device sends the same attribute from
 *                multiple endpoints.
 * disableDefaultResponse: used by toZigbee converters to disable the default response of some devices as they
 *                         don't provide one.
 * applyRedFix: see toZigbee.light_color
 * enhancedHue: see toZigbee.light_color
 * supportsHueAndSaturation: see toZigbee.light_color
 * timeout: timeout for commands to this device used in toZigbee.
 * coverInverted: Set to true for cover controls that report position=100 as open
 * turnsOffAtBrightness1: Indicates light turns off when brightness 1 is set
 * pinCodeCount: Amount of pincodes the lock can handle
 * disableActionGroup: Prevents some converters adding the action_group to the payload
 * tuyaThermostatSystemMode/tuyaThermostatPreset: TuYa specific thermostat options
 * thermostat: see e.g. HT-08 definition
 * battery:
 *    {dontDividePercentage: true}: prevents batteryPercentageRemainig from being divided (ZCL 200=100%, but some report 100=100%)
 *    {voltageToPercentage: '3V_2100'}: convert voltage to percentage using specified option. See utils.batteryVoltageToPercentage()
 */

const assert = require('assert');
const tz = require('./converters/toZigbee');
const exposes = require('./lib/exposes');
const e = exposes.presets;

const devices = [
    ...require('./devices/adeo'),
    ...require('./devices/adurosmart'),
    ...require('./devices/airam'),
    ...require('./devices/ajax_online'),
    ...require('./devices/aldi'),
    ...require('./devices/anchor'),
    ...require('./devices/atsmart'),
    ...require('./devices/aurora_lighting'),
    ...require('./devices/awox'),
    ...require('./devices/axis'),
    ...require('./devices/belkin'),
    ...require('./devices/bitron'),
    ...require('./devices/blaupunkt'),
    ...require('./devices/blitzwolf'),
    ...require('./devices/bosch'),
    ...require('./devices/brimate'),
    ...require('./devices/bticino'),
    ...require('./devices/busch-jaeger'),
    ...require('./devices/byun'),
    ...require('./devices/calex'),
    ...require('./devices/centralite'),
    ...require('./devices/climax'),
    ...require('./devices/commercial_electric'),
    ...require('./devices/cr_smart_home'),
    ...require('./devices/cree'),
    ...require('./devices/custom_devices_diy'),
    ...require('./devices/cy-lighting'),
    ...require('./devices/danalock'),
    ...require('./devices/danfoss'),
    ...require('./devices/databyte.ch'),
    ...require('./devices/datek'),
    ...require('./devices/dawon_dns'),
    ...require('./devices/develco'),
    ...require('./devices/digi'),
    ...require('./devices/diyruz'),
    ...require('./devices/dresden_elektronik'),
    ...require('./devices/easyaccess'),
    ...require('./devices/eatonhalo_led'),
    ...require('./devices/echostar'),
    ...require('./devices/ecodim'),
    ...require('./devices/ecolink'),
    ...require('./devices/ecosmart'),
    ...require('./devices/ecozy'),
    ...require('./devices/edp'),
    ...require('./devices/elko'),
    ...require('./devices/enbrighten'),
    ...require('./devices/envilar'),
    ...require('./devices/eurotronic'),
    ...require('./devices/ewelink'),
    ...require('./devices/ezex'),
    ...require('./devices/fantem'),
    ...require('./devices/feibit'),
    ...require('./devices/fireangel'),
    ...require('./devices/frankever'),
    ...require('./devices/ge'),
    ...require('./devices/gewiss'),
    ...require('./devices/gledopto'),
    ...require('./devices/gmy'),
    ...require('./devices/green_power'),
    ...require('./devices/gs'),
    ...require('./devices/hampton_bay'),
    ...require('./devices/heiman'),
    ...require('./devices/hej'),
    ...require('./devices/hgkg'),
    ...require('./devices/hive'),
    ...require('./devices/hommyn'),
    ...require('./devices/honyar'),
    ...require('./devices/hornbach'),
    ...require('./devices/icasa'),
    ...require('./devices/ihorn'),
    ...require('./devices/ikea'),
    ...require('./devices/iluminize'),
    ...require('./devices/ilux'),
    ...require('./devices/immax'),
    ...require('./devices/innr'),
    ...require('./devices/insta'),
    ...require('./devices/iris'),
    ...require('./devices/javis'),
    ...require('./devices/jiawen'),
    ...require('./devices/kami'),
    ...require('./devices/keen_home'),
    ...require('./devices/klikaanklikuit'),
    ...require('./devices/kmpcil'),
    ...require('./devices/konke'),
    ...require('./devices/ksentry'),
    ...require('./devices/kwikset'),
    ...require('./devices/led_trading'),
    ...require('./devices/ledvance'),
    ...require('./devices/leedarson'),
    ...require('./devices/legrand'),
    ...require('./devices/letv'),
    ...require('./devices/leviton'),
    ...require('./devices/lidl'),
    ...require('./devices/lifecontrol'),
    ...require('./devices/lightsolutions'),
    ...require('./devices/linkind'),
    ...require('./devices/livingwise'),
    ...require('./devices/livolo'),
    ...require('./devices/lonsonho'),
    ...require('./devices/lubeez'),
    ...require('./devices/lupus'),
    ...require('./devices/lutron'),
    ...require('./devices/m-elec'),
    ...require('./devices/matcall_bv'),
    ...require('./devices/meazon'),
    ...require('./devices/moes'),
    ...require('./devices/mycket'),
    ...require('./devices/müller_licht'),
    ...require('./devices/namron'),
    ...require('./devices/nanoleaf'),
    ...require('./devices/neo'),
    ...require('./devices/net2grid'),
    ...require('./devices/netvox'),
    ...require('./devices/niko'),
    ...require('./devices/ninja_blocks'),
    ...require('./devices/niviss'),
    ...require('./devices/nordtronic'),
    ...require('./devices/nue_3a'),
    ...require('./devices/nyce'),
    ...require('./devices/openlumi'),
    ...require('./devices/orvibo'),
    ...require('./devices/osram'),
    ...require('./devices/oujiabao'),
    ...require('./devices/owon'),
    ...require('./devices/paul_neuhaus'),
    ...require('./devices/paulmann'),
    ...require('./devices/peq'),
    ...require('./devices/philips'),
    ...require('./devices/plugwise'),
    ...require('./devices/prolight'),
    ...require('./devices/qmotion'),
    ...require('./devices/rgb_genie'),
    ...require('./devices/robb'),
    ...require('./devices/salus_controls'),
    ...require('./devices/samotech'),
    ...require('./devices/schlage'),
    ...require('./devices/schneider_electric'),
    ...require('./devices/schwaiger'),
    ...require('./devices/securifi'),
    ...require('./devices/sengled'),
    ...require('./devices/sercomm'),
    ...require('./devices/shenzhen_homa'),
    ...require('./devices/sinope'),
    ...require('./devices/siterwell'),
    ...require('./devices/smart9'),
    ...require('./devices/smart_home_pty'),
    ...require('./devices/smartenit'),
    ...require('./devices/smartthings'),
    ...require('./devices/sohan_electric'),
    ...require('./devices/somgoms'),
    ...require('./devices/sonoff'),
    ...require('./devices/stelpro'),
    ...require('./devices/sunricher'),
    ...require('./devices/swann'),
    ...require('./devices/sylvania'),
    ...require('./devices/tci'),
    ...require('./devices/terncy'),
    ...require('./devices/third_reality'),
    ...require('./devices/titan_products'),
    ...require('./devices/trust'),
    ...require('./devices/tuya'),
    ...require('./devices/ubisys'),
    ...require('./devices/universal_electronics_inc'),
    ...require('./devices/useelink'),
    ...require('./devices/viessmann'),
    ...require('./devices/vimar'),
    ...require('./devices/visonic'),
    ...require('./devices/wally'),
    ...require('./devices/waxman'),
    ...require('./devices/weiser'),
    ...require('./devices/weten'),
    ...require('./devices/xfinity'),
    ...require('./devices/xiaomi'),
    ...require('./devices/yale'),
    ...require('./devices/yookee'),
    ...require('./devices/ysrsai'),
    ...require('./devices/zemismart'),
    ...require('./devices/zen'),
    ...require('./devices/zipato'),
];

module.exports = devices.map((device) => {
    const {extend, ...deviceWithoutExtend} = device;

    if (extend) {
        if (extend.hasOwnProperty('configure') && device.hasOwnProperty('configure')) {
            assert.fail(`'${device.model}' has configure in extend and device, this is not allowed`);
        }

        device = {
            ...extend,
            ...deviceWithoutExtend,
            meta: extend.meta || deviceWithoutExtend.meta ? {
                ...extend.meta,
                ...deviceWithoutExtend.meta,
            } : undefined,
        };
    }

    if (device.toZigbee.length > 0) {
        device.toZigbee.push(tz.scene_store, tz.scene_recall, tz.scene_add, tz.scene_remove, tz.scene_remove_all, tz.read, tz.write);
    }

    if (device.exposes) {
        device.exposes = device.exposes.concat([e.linkquality()]);
    }

    return device;
});
