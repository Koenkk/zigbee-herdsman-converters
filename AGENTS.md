# Agents Instructions for zigbee-herdsman-converters

## Priority Guidelines

When generating code for this repository:

1. **Version Compatibility**: Always respect the exact versions of Node.js, TypeScript, and libraries used in this project
2. **Codebase Patterns**: Scan the codebase for established patterns before generating code
3. **Architectural Consistency**: Maintain the layered architecture and established module boundaries
4. **Performance**: Keep to best-practices to maintain high performance
5. **Code Quality**: Prioritize maintainability, type safety, and consistency with existing patterns
6. **Testing**: Follow the established Vitest testing patterns

## Technology Stack & Versions

### Core Technologies

- **Runtime**: Node.js
- **Language**: TypeScript
- **Package Manager**: pnpm

### Development Tools

- **Testing**: Vitest with @vitest/coverage-v8
- **Benchmarking**: Vitest
- **Code Quality**: Biome (formatting, linting)
- **Build**: TypeScript compiler

## Project Architecture

### Project Structure

```
src/
├── index.ts             # Main entry point, device lookup
├── indexer.ts           # Build-time model index generator
├── converters/
|   ├── fromZigbee.ts    # Zigbee → MQTT converters
|   └── toZigbee.ts      # MQTT → Zigbee converters
├── devices/             # Device definitions by vendor
└── lib/
    ├── modernExtend.ts  # Modern extend system (primary API)
    ├── exposes.ts       # Expose definitions
    ├── types.ts         # Primary type definitions
    ├── store.ts         # Global state management
    ├── logger.ts        # Logging utilities
    ├── utils.ts         # Cross-cutting utilities
    ├── constants.ts     # Cross-cutting constants
    ├── reporting.ts     # Cross-cutting reporting configurations
    ├── light.ts         # Cross-cutting light-specific utilities
    ├── color.ts         # Cross-cutting color conversion utilities
    └── [vendor].ts      # Vendor-specific utilities (ikea, philips, tuya, etc.)
test/                    # Vitest test/bench files with mocks
dist/                    # Compiled JavaScript output
```

### Key Architectural Principles

1. **Device Definitions**: Each device file exports `definitions: DefinitionWithExtend[]`
2. **Converters**: Separate from/to Zigbee converters with strict interfaces
3. **Modern Extends**: Primary API for composing device functionality
4. **Vendor Libraries**: Vendor-specific logic isolated in `lib/[vendor].ts`
5. **Type Safety**: Everything is strongly typed using types from `lib/types.ts`

## Code Style & Formatting

See [Biome configuration](biome.json)

## Code Documentation

Use JSDoc, following existing patterns.

## Additional Resources

- [GitHub Repository](https://github.com/Koenkk/zigbee-herdsman-converters)
- Related Project: [Zigbee2MQTT](https://www.zigbee2mqtt.io/)
