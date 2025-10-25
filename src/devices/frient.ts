import {develcoModernExtend} from "../lib/develco";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";
import * as fz from '../converters/fromZigbee';
import * as exposes from '../lib/exposes';
import * as reporting from '../lib/reporting';

// NOTE! Develco and Frient is the same company, therefore we use develco specific things in here.
const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["WISZB-131"],
        model: "WISZB-131",
        vendor: "Frient",
        description: "Temperature and contact sensor",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "contact", zoneAttributes: ["alarm_1", "battery_low"]}), m.temperature()],
    },
    {
        zigbeeModel: ["EMIZB-141"],
        model: "EMIZB-141",
        vendor: "Frient",
        description: "Electricity meter interface 2 LED",
        extend: [
            m.electricityMeter({cluster: "metering", power: {divisor: 1000, multiplier: 1}, energy: {divisor: 1000, multiplier: 1}}),
            m.battery(),
            develcoModernExtend.addCustomClusterManuSpecificDevelcoGenBasic(),
            develcoModernExtend.readGenBasicPrimaryVersions(),
            develcoModernExtend.pulseConfiguration(),
            develcoModernExtend.currentSummation(),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["SMRZB-153"],
        model: "SMRZB-153",
        vendor: "Frient",
        description: "Smart Cable - Power switch with power measurement",
        extend: [m.onOff({configureReporting: false}), m.electricityMeter()],
        ota: true,
        endpoint: () => {
            return {default: 2};
        },
    },
    {
        zigbeeModel: ['EMIZB-151'],
        model: 'EMIZB-151',
        vendor: 'Frient',
        description: 'HAN P1 power-meter sensor with energy measures',
        
        extend: [m.electricityMeter({threePhase: true})],
        
        fromZigbee: [fz.metering],
        
        exposes: [
          e.numeric('energy_tier1', ea.STATE).withUnit('kWh').withDescription('Energy consumed in tariff 1 (peak/high) - OBIS 1.8.1'),
          e.numeric('energy_tier2', ea.STATE).withUnit('kWh').withDescription('Energy consumed in tariff 2 (off-peak/low) - OBIS 1.8.2'),
          e.numeric('produced_energy', ea.STATE).withUnit('kWh').withDescription('Total energy returned to the grid - OBIS 2.8.0'),
          e.numeric('produced_energy_tier1', ea.STATE).withUnit('kWh').withDescription('Energy produced in tariff 1 (peak/high) - OBIS 2.8.1'),
          e.numeric('produced_energy_tier2', ea.STATE).withUnit('kWh').withDescription('Energy produced in tariff 2 (off-peak/low) - OBIS 2.8.2'),
        ],
        
        ota: true,
        
        endpoint: (device) => ({default: 2}),
        
        configure: async (device, coordinatorEndpoint, logger) => {
          const endpoint = device.getEndpoint(2);
    
          try {
            await reporting.bind(endpoint, coordinatorEndpoint, ['seMetering']);
          } catch (error) {
            // Binding can fail but device may still work
          }
    
          await reporting.readMeteringMultiplierDivisor(endpoint).catch(() => {});
    
          const meteringAttributes = [
            'instantaneousDemand',
            'currentSummDelivered',
            'currentSummReceived',
            'currentTier1SummDelivered',
            'currentTier2SummDelivered',
            'currentTier1SummReceived',
            'currentTier2SummReceived',
          ];
    
          await endpoint.read('seMetering', meteringAttributes).catch(() => {});
    
          for (const attr of meteringAttributes) {
            await endpoint.configureReporting('seMetering', [{
              attribute: attr,
              minimumReportInterval: 300,
              maximumReportInterval: 3600,
              reportableChange: 1000,
            }]).catch(() => {});
          }
        },
      },
    },
    {
        zigbeeModel: ["REXZB-111"],
        model: "REXZB-111",
        vendor: "Frient",
        description: "Zigbee repeater with backup battery",
        extend: [m.battery(), m.iasZoneAlarm({zoneType: "generic", zoneAttributes: ["alarm_1", "alarm_2", "tamper", "battery_low"]}), m.identify()],
    },
];
