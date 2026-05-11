# GitHub Copilot Instructions

## Priority Guidelines

When generating code for this repository:

1. **Version Compatibility**: Always detect and respect the exact versions of languages, frameworks, and libraries used in this project
2. **Context Files**: Prioritize patterns and standards defined in the `.github/copilot` directory
3. **Codebase Patterns**: When context files don't provide specific guidance, scan the codebase for established patterns
4. **Architectural Consistency**: Maintain the modular architecture with clear separation between converters, devices, and library code
5. **Code Quality**: Prioritize maintainability, testability, and consistency in all generated code

## Technology Stack

### Core Technologies

**Language & Runtime:**
- TypeScript 5.9.3 (target: esnext, module: commonjs)
- Node.js 24.x (as specified in CI)
- ECMAScript: esnext features

**Key Language Features to Use:**
- Strict mode enabled (`alwaysStrict: true`)
- `noImplicitAny: true` and `noImplicitThis: true`
- Async/await for asynchronous operations
- Type inference and explicit typing where appropriate
- No unused imports (enforced by Biome)

**Package Manager:**
- pnpm 10.12.1 (specified in `packageManager` field)

**Key Dependencies:**
- `zigbee-herdsman` ^6.2.0 (primary Zigbee library)
- `buffer-crc32` ^1.0.0
- `iconv-lite` ^0.7.0
- `semver` ^7.7.1

**Development Tools:**
- Biome 2.2.5 (linter and formatter, replaces ESLint/Prettier)
- Vitest 3.1.1 (testing framework)
- TypeScript compiler with incremental builds

### TypeScript Configuration

Always respect these TypeScript settings:
- Module system: CommonJS (`module: "commonjs"`)
- Target: ESNext (`target: "esnext"`)
- Synthetic default imports enabled
- ES module interop enabled
- Declaration files and maps generated
- Source maps enabled
- Incremental and composite builds enabled

## Project Architecture

### Directory Structure

```
src/
  index.ts                    # Main entry point, device lookup
  indexer.ts                  # Build-time model index generator
  converters/
    fromZigbee.ts             # Zigbee → MQTT converters
    toZigbee.ts               # MQTT → Zigbee converters
  devices/
    *.ts                      # Device definitions by vendor
  lib/
    modernExtend.ts           # Modern extend system (primary API)
    exposes.ts                # Expose definitions
    types.ts                  # Type definitions
    utils.ts                  # Utility functions
    constants.ts              # Constants
    reporting.ts              # Reporting configurations
    store.ts                  # Global state management
    logger.ts                 # Logging utilities
    ota.ts                    # OTA update utilities
    light.ts                  # Light-specific utilities
    color.ts                  # Color conversion utilities
    [vendor].ts               # Vendor-specific utilities (ikea, philips, tuya, etc.)
test/
  *.test.ts                   # Test files
  utils.ts                    # Test utilities
  vitest.config.mts           # Vitest configuration
```

### Architecture Principles

1. **Device Definitions**: Each device file exports `definitions: DefinitionWithExtend[]`
2. **Converters**: Separate from/to Zigbee converters with strict interfaces
3. **Modern Extends**: Primary API for composing device functionality
4. **Vendor Libraries**: Vendor-specific logic isolated in `lib/[vendor].ts`
5. **Type Safety**: Everything is strongly typed using types from `lib/types.ts`

## Code Quality Standards

### Maintainability

**Naming Conventions:**
- **Constants**: `UPPER_SNAKE_CASE` or `camelCase` or `PascalCase` (flexible, per Biome config)
- **Variables**: `camelCase` for most variables
- **Exported definitions**: `definitions` for device arrays, `fz` for fromZigbee, `tz` for toZigbee, `e` for exposes presets, `ea` for exposes access, `m` for modernExtend
- **Namespace constants**: Always define `const NS = "zhc:modulename"` for logging context
- **Type definitions**: `PascalCase` for interfaces and types
- **Functions**: `camelCase` for functions

**File Organization:**
- Device files: Import converters, exposes, modern extends, vendor libs at top
- Use consistent import aliases: `* as fz`, `* as tz`, `* as exposes`, `* as m`, vendor-specific like `* as tuya`
- Group imports: external dependencies, then internal modules
- Export patterns: `export const definitions: DefinitionWithExtend[] = [...]`

**Code Structure:**
- Keep functions focused on single responsibilities
- Use early returns to reduce nesting
- Prefer composition over inheritance
- Use modern extends for device definitions rather than manual converter composition

### Testing

**Testing Framework:**
- Vitest 3.1.1 with V8 coverage
- Test files use `.test.ts` extension
- Located in `test/` directory

**Testing Patterns:**
- Import from vitest: `import {describe, expect, it, vi} from "vitest"`
- Use `describe` blocks for grouping related tests
- Use `expect` for assertions (not `assert` from node)
- Mock devices using `mockDevice` from `test/utils.ts`
- Test files should mirror source structure

**Test Structure:**
```typescript
import {describe, expect, it} from "vitest";

describe("Feature Name", () => {
    it("should describe expected behavior", () => {
        // Arrange
        // Act
        // Assert
        expect(result).toStrictEqual(expected);
    });
});
```

### Documentation

**JSDoc Style:**
- Document public APIs and complex functions
- Use TSDoc syntax for parameter and return documentation
- Include `@param` for parameters, `@returns` for return values
- Keep documentation concise and focused on behavior

**Inline Comments:**
- Use comments sparingly for non-obvious behavior
- Prefer self-documenting code with clear naming
- Document "why" not "what" when commenting
- Use `// biome-ignore` directives when suppressing linter rules with explanation

## Code Formatting and Linting

### Biome Configuration

**Formatting Rules (enforced by Biome):**
- Indent style: 4 spaces
- Line width: 150 characters
- Bracket spacing: false (`{foo}` not `{ foo }`)
- No trailing commas in type parameters

**Linting Rules:**
- `useAwait`: error (no async functions without await)
- `noUnusedImports`: error (automatically removed)
- `noUnusedFunctionParameters`: off (parameters may be required by interface)
- `useLiteralKeys`: off
- `noParameterAssign`: off
- `useAsConstAssertion`: error (use `as const` where appropriate)
- `useDefaultParameterLast`: error
- `useEnumInitializers`: error
- `useSelfClosingElements`: error
- `useSingleVarDeclarator`: error
- `noUnusedTemplateLiteral`: error
- `useNumberNamespace`: error
- `noInferrableTypes`: error (let TypeScript infer obvious types)
- `noUselessElse`: error

**Key Rules to Follow:**
- Use `// biome-ignore [rule]: reason` to suppress specific violations
- Never reassign parameters; create new variables instead
- Use single variable declarators (`const a = 1; const b = 2;` not `const a = 1, b = 2;`)
- Self-closing JSX/TSX elements required

**Running Linter:**
```bash
pnpm run check          # Check for issues
pnpm run check:w        # Check and auto-fix
```

## Device Definition Patterns

### Basic Device Structure

```typescript
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["model_id"],
        model: "PRODUCT_CODE",
        vendor: "Vendor Name",
        description: "Product description",
        extend: [
            m.light({colorTemp: {range: [153, 500]}, color: true}),
            m.battery(),
            m.identify(),
        ],
    },
];
```

### Modern Extend Usage

**Preferred Pattern:**
Always use modern extends when possible rather than manual fromZigbee/toZigbee arrays:

```typescript
// ✅ Good - using modern extends
extend: [
    m.light({colorTemp: true, color: true}),
    m.battery(),
    m.identify(),
]

// ❌ Avoid - manual converter arrays (legacy pattern)
fromZigbee: [fz.on_off, fz.brightness, fz.color_colortemp],
toZigbee: [tz.on_off, tz.brightness, tz.color_colortemp],
exposes: [e.light_brightness_colortemp_color()],
```

**Common Modern Extends:**
- `m.light(options)` - Light devices
- `m.battery(options)` - Battery reporting
- `m.identify()` - Identify command
- `m.onOff()` - On/off functionality
- `m.temperature()` - Temperature sensor
- `m.humidity()` - Humidity sensor
- `m.occupancy()` - Occupancy/motion sensor
- `m.contact()` - Contact sensor
- Vendor-specific extends from vendor libraries (e.g., `philips.m.light()`, `tuya.modernExtend.tuyaLight()`)

### Vendor-Specific Patterns

**Using Vendor Libraries:**
```typescript
// Import vendor-specific utilities
import * as philips from "../lib/philips";
import * as ikea from "../lib/ikea";
import * as tuya from "../lib/tuya";

// Use vendor modern extends
extend: [
    philips.m.light({colorTemp: {range: [153, 500]}, color: true}),
    ikea.ikeaBattery(),
    tuya.modernExtend.tuyaLight(),
]
```

## Converter Patterns

### FromZigbee Converter Structure

```typescript
export const converter_name: Fz.Converter<
    "clusterName",
    undefined,
    ["attributeReport", "readResponse"]
> = {
    cluster: "clusterName",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        // Extract data from msg
        // Process and transform
        // Return result object
        return {property: value};
    },
};
```

**Key Patterns:**
- Always properly type the converter with `Fz.Converter<ClusterType, Options, MessageTypes>`
- Return objects with camelCase property names
- Use utility functions from `utils.ts` for common operations
- Check for `hasAlreadyProcessedMessage` to avoid duplicates when appropriate
- Use `postfixWithEndpointName` for multi-endpoint devices

### ToZigbee Converter Structure

```typescript
export const converter_name: Tz.Converter = {
    key: ["property_name"],
    convertSet: async (entity, key, value, meta) => {
        // Validate input
        utils.assertNumber(value, "property_name");
        
        // Send command
        await entity.command("clusterName", "commandName", {param: value}, utils.getOptions(meta.mapped, entity));
        
        // Return state update
        return {state: {property_name: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("clusterName", ["attributeName"]);
    },
};
```

**Key Patterns:**
- Always use async/await for entity operations
- Validate inputs using `utils.assertNumber`, `utils.assertString`, `utils.validateValue`
- Use `utils.getOptions(meta.mapped, entity)` for command options
- Return state updates from `convertSet`
- Implement `convertGet` for readable properties

## Utility Function Patterns

### Common Utility Imports

```typescript
import {
    assertNumber,
    assertString,
    getFromLookup,
    hasAlreadyProcessedMessage,
    postfixWithEndpointName,
    precisionRound,
    validateValue,
    isNumber,
    isString,
    isObject,
} from "./utils";
```

### Validation Patterns

```typescript
// Number validation
utils.assertNumber(value, "property_name");

// String validation
utils.assertString(value, "property_name");

// Enum validation
utils.validateValue(state, ["on", "off", "toggle"]);

// Type checks
if (utils.isNumber(value)) { /* ... */ }
if (utils.isString(value)) { /* ... */ }
if (utils.isObject(value)) { /* ... */ }
```

### Number Utilities

```typescript
// Precision rounding
const rounded = utils.precisionRound(value, 2);

// Range mapping
const mapped = utils.mapNumberRange(value, 0, 100, 0, 255);

// Range clamping
const clamped = utils.numberWithinRange(value, min, max);
```

## Logging Patterns

Always define a namespace constant for logging:

```typescript
const NS = "zhc:modulename";

// Use logger from lib/logger.ts
import {logger} from "../lib/logger";

logger.debug(`Message`, NS);
logger.info(`Message`, NS);
logger.warning(`Message`, NS);
logger.error(`Message`, NS);
```

**Common Namespace Patterns:**
- Main module: `"zhc"`
- Converters: `"zhc:fz"` or `"zhc:tz"`
- Device vendors: `"zhc:vendorname"`
- Library modules: `"zhc:modulename"`

## Error Handling

**Error Patterns:**
```typescript
// Throw descriptive errors
throw new Error("The on_time value must be a number!");

// Use assertions from node:assert
import assert from "node:assert";
assert(condition, "Error message");

// Validate before processing
if (!value) {
    logger.warning(`Invalid value for ${key}`, NS);
    return;
}
```

## Type System Patterns

### Import Type Definitions

```typescript
import type {
    Configure,
    Definition,
    DefinitionWithExtend,
    Expose,
    Fz,
    KeyValue,
    KeyValueAny,
    OnEvent,
    Tz,
    Zh,
} from "../lib/types";
```

### Type Usage

- Use `Zh.Device` for Zigbee devices
- Use `Zh.Endpoint` for endpoints
- Use `KeyValue` for string-keyed objects
- Use `KeyValueAny` for any-valued objects
- Use type imports with `import type` syntax
- Let TypeScript infer return types when obvious

## Version Control & Build

### Build Process

```bash
pnpm run build          # Compile TypeScript and generate index
pnpm run build:watch    # Watch mode
```

**Key Build Steps:**
1. TypeScript compilation to `dist/`
2. `indexer.js` generates `models-index.json`
3. Declaration files and maps created

### Pre-commit Checks

The following commands run automatically via husky pre-commit hook:

```bash
pnpm run build
pnpm run check
pnpm run test
```

**Always ensure these pass before committing.**

### Testing Commands

```bash
pnpm test               # Run all tests
pnpm run test:coverage  # Run with coverage
pnpm bench              # Run benchmarks
```

## Exposes Patterns

### Common Exposes

```typescript
const e = exposes.presets;
const ea = exposes.access;

// Use presets
e.light_brightness_colortemp_color()
e.battery()
e.temperature()
e.humidity()
e.occupancy()
e.contact()

// Custom exposes
e.numeric("property", ea.ALL)
    .withValueMin(0)
    .withValueMax(100)
    .withUnit("unit")
    .withDescription("Description")

e.binary("property", ea.ALL, "ON", "OFF")
    .withDescription("Description")

e.enum("property", ea.ALL, ["option1", "option2"])
    .withDescription("Description")
```

### Access Patterns

```typescript
ea.STATE           // Read-only
ea.SET             // Write-only
ea.GET             // Can request read
ea.ALL             // Read/write/get
ea.STATE_SET       // Read and write
ea.STATE_GET       // Read and request read
```

## Color Handling

For color-related device definitions:

```typescript
// Import color utilities
import * as libColor from "../lib/color";

// In toZigbee converters
const newColor = libColor.Color.fromConverterArg(value);

// Color modes
{color: true}                                    // Basic color
{color: {modes: ["xy", "hs"]}}                  // Specific modes
{color: {modes: ["xy", "hs"], enhancedHue: true}} // Enhanced hue
```

## OTA Updates

When implementing OTA support:

```typescript
import * as ota from "../lib/ota";

// In device definition
ota: ota.zigbeeOTA,
```

## Store (Global State)

For devices requiring state management:

```typescript
import * as globalStore from "../lib/store";

// Get value
const value = globalStore.getValue(device, "key", defaultValue);

// Set value
globalStore.putValue(device, "key", value);

// Check if exists
const exists = globalStore.hasValue(device, "key");

// Clear value
globalStore.clearValue(device, "key");
```

## Common Patterns to Follow

### 1. Multi-endpoint Devices

```typescript
// Use postfixWithEndpointName
return postfixWithEndpointName(result, msg, model);

// Or use exposeEndpoints utility
exposeEndpoints(endpoints, e.light_brightness())
```

### 2. Duplicate Message Prevention

```typescript
if (hasAlreadyProcessedMessage(msg, model)) return;
```

### 3. Options Handling

```typescript
const options = getOptions(meta);
const timeout = options.occupancy_timeout || 90;
```

### 4. Transition Time

```typescript
const transtime = utils.getTransition(entity, key, meta).time;
```

### 5. Meta Information

```typescript
const supportsFeature = utils.getMetaValue(
    entity,
    meta.mapped,
    "featureName",
    "allEqual",
    defaultValue
);
```

## Breaking Changes Awareness

When modifying core APIs, be aware of these recent breaking changes:

- `onEvent` API changed in recent versions (check device argument)
- `postProcessConvertedFromZigbeeMessage` requires `device` argument
- `rawData` must be provided to `Fz.Message.meta`
- Legacy extend system removed (use modern extends)
- Various async APIs in index.ts

## General Best Practices

1. **Consistency First**: Match existing patterns in similar files
2. **Type Safety**: Leverage TypeScript's type system fully
3. **Modern Extends**: Prefer modern extend composition over manual converters
4. **Utilities**: Use existing utility functions rather than reimplementing
5. **Testing**: Write tests for new converters and utilities
6. **Documentation**: Keep comments focused on "why" not "what"
7. **Logging**: Use namespaced logger for debugging
8. **Validation**: Validate all inputs before processing
9. **Error Messages**: Provide clear, actionable error messages
10. **Vendor Libraries**: Use vendor-specific libraries for brand-specific logic

## Device Definition Checklist

When creating or modifying device definitions:

- [ ] Import all required modules at top
- [ ] Define constants for exposes (`e`) and access (`ea`)
- [ ] Export `definitions: DefinitionWithExtend[]`
- [ ] Include `zigbeeModel` array with all model IDs
- [ ] Specify `model`, `vendor`, `description`
- [ ] Use modern extends in `extend` array
- [ ] Avoid manual `fromZigbee`/`toZigbee` arrays unless necessary
- [ ] Add vendor-specific extends from vendor libraries when applicable
- [ ] Include OTA support if applicable
- [ ] Test the definition with actual hardware or mock devices

## Contributing Workflow

1. **Setup**: `pnpm install --frozen-lockfile`
2. **Develop**: Make changes following patterns above
3. **Format**: `pnpm run check --fix`
4. **Build**: `pnpm run build`
5. **Test**: `pnpm test`
6. **Commit**: Pre-commit hooks will run automatically

## Resources

- Main documentation: https://www.zigbee2mqtt.io/
- Device support guide: https://www.zigbee2mqtt.io/advanced/support-new-devices/01_support_new_devices.html
- zigbee-herdsman: https://github.com/Koenkk/zigbee-herdsman

---

**Remember**: When in doubt, search the codebase for similar implementations and follow those patterns. Consistency with existing code is more valuable than external best practices that don't match this project's style.
