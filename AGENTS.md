# AGENTS.md

## Project Overview

zigbee-herdsman-converters is a TypeScript library that provides device converters for Zigbee devices, used by zigbee-herdsman. It contains:

- **Device definitions** for 3000+ Zigbee devices from various vendors
- **Converters** that translate between Zigbee messages and MQTT/JSON format
- **Modern extend system** for composing device functionality
- **Vendor-specific libraries** for brand-specific logic (Philips, IKEA, Tuya, etc.)

**Architecture:**
- `src/converters/` - fromZigbee and toZigbee converter implementations
- `src/devices/` - Device definitions organized by vendor (700+ files)
- `src/lib/` - Core utilities, modern extends, vendor libraries, types
- `test/` - Vitest test suite

**Tech Stack:**
- TypeScript 5.9.3 (target: esnext, module: commonjs)
- Node.js 24.x
- Package manager: pnpm 10.12.1 (required)
- Linter/Formatter: Biome 2.2.5
- Testing: Vitest 3.1.1
- Main dependency: zigbee-herdsman ^6.2.0

## Setup Commands

**Prerequisites:**
```bash
# Install pnpm globally if not already installed
npm install -g pnpm

# Install dependencies (REQUIRED: use --frozen-lockfile)
pnpm install --frozen-lockfile
```

**Build:**
```bash
# Full build (compile TypeScript + generate device index)
pnpm run build

# Watch mode (auto-rebuild on changes)
pnpm run build:watch

# Clean build artifacts
pnpm run clean
```

## Development Workflow

**Before starting development:**
1. Always run `pnpm install --frozen-lockfile` after pulling changes
2. Build the project at least once: `pnpm run build`
3. Refer to `.github/copilot-instructions.md` for detailed coding standards

**Key development files:**
- Device definitions: `src/devices/[vendor].ts`
- Converters: `src/converters/fromZigbee.ts` and `src/converters/toZigbee.ts`
- Modern extends: `src/lib/modernExtend.ts`
- Vendor libraries: `src/lib/[vendor].ts` (e.g., philips.ts, ikea.ts, tuya.ts)
- Type definitions: `src/lib/types.ts`

**Adding a new device:**
1. Find or create the appropriate vendor file in `src/devices/`
2. Import required modules at top (fz, tz, exposes, m, vendor libs)
3. Add device definition to the `definitions` array using modern extends
4. Prefer modern extends over manual converter arrays
5. Test the device definition

**Code formatting:**
- Indent: 4 spaces
- Line width: 150 characters
- No bracket spacing
- Run `pnpm run check --fix` to auto-format

## Testing Instructions

**Run all tests:**
```bash
pnpm test
```

**Run tests with coverage:**
```bash
pnpm run test:coverage
```

**Run benchmarks:**
```bash
pnpm bench
```

**Test file patterns:**
- Test files located in `test/` directory
- Use `.test.ts` extension
- Import test utilities: `import {describe, expect, it, vi} from "vitest"`
- Mock devices using `mockDevice` from `test/utils.ts`

**Test structure pattern:**
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

**Before committing, ensure all tests pass:**
```bash
pnpm run build
pnpm run check
pnpm test
```

## Code Style Guidelines

**Import patterns:**
```typescript
import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as [vendor] from "../lib/[vendor]";  // e.g., philips, ikea, tuya
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;
const ea = exposes.access;
```

**Device definition structure:**
```typescript
export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["model_id"],
        model: "PRODUCT_CODE",
        vendor: "Vendor Name",
        description: "Product description",
        extend: [
            m.light({colorTemp: true, color: true}),
            m.battery(),
            m.identify(),
        ],
    },
];
```

**Naming conventions:**
- Variables: `camelCase`
- Constants: `UPPER_SNAKE_CASE`, `camelCase`, or `PascalCase` (flexible)
- Types/Interfaces: `PascalCase`
- Namespace constants: `const NS = "zhc:modulename"`
- Export aliases: `fz`, `tz`, `e`, `ea`, `m`

**TypeScript rules:**
- Strict mode enabled
- `noImplicitAny: true`
- `noImplicitThis: true`
- Module: CommonJS
- Target: ESNext

**Linting rules (enforced by Biome):**
- No unused imports (auto-removed)
- No parameter reassignment (create new variables)
- Single variable declarators (`const a = 1; const b = 2;`)
- Always use `async/await` in async functions
- Use `as const` assertions where appropriate

**Error handling:**
```typescript
// Use node:assert for assertions
import assert from "node:assert";
assert(condition, "Error message");

// Throw descriptive errors
throw new Error("The on_time value must be a number!");

// Validate inputs
utils.assertNumber(value, "property_name");
utils.validateValue(state, ["on", "off", "toggle"]);
```

**Logging:**
```typescript
const NS = "zhc:modulename";
import {logger} from "../lib/logger";

logger.debug(`Message`, NS);
logger.info(`Message`, NS);
logger.warning(`Message`, NS);
logger.error(`Message`, NS);
```

## Build and Deployment

**Build process:**
1. TypeScript compilation (`tsc`) outputs to `dist/`
2. `indexer.js` generates `models-index.json` for device lookup
3. Declaration files (`.d.ts`) and source maps created

**Build outputs:**
- `dist/` - Compiled JavaScript and type definitions
- `models-index.json` - Generated device model index
- `tsconfig.tsbuildinfo` - TypeScript incremental build info

**Package exports:**
- Main: `./dist/index.js`
- Converters: `./dist/converters/*.js`
- Devices: `./dist/devices/*.js`
- Libraries: `./dist/lib/*.js`

**Pre-commit hooks (automated via Husky):**
```bash
pnpm run build
pnpm run check
pnpm run test
```

**CI/CD pipeline (.github/workflows/ci.yml):**
- Runs on pull requests and pushes
- Node.js 24.x
- Steps: install → build → check → test → bench
- Auto-publishes on tag push (if authorized)

## Pull Request Guidelines

**Before creating a PR:**
```bash
# 1. Format code
pnpm run check --fix

# 2. Build
pnpm run build

# 3. Run tests
pnpm test
```

**PR requirements:**
- All pre-commit checks must pass (build, check, test)
- If adding a new device, include link to device picture PR in zigbee2mqtt.io repo
- Device picture requirements:
  - Filename: `MODEL.png` (exact match to device model)
  - Size: 512x512px
  - Transparent background
  - Upload to `zigbee2mqtt.io/public/images/devices/`

**Code review focus:**
- Use of modern extends (preferred over manual converters)
- Proper typing with TypeScript
- Follows established patterns in similar device files
- No linting errors (run `pnpm run check`)
- All tests pass

## Common Patterns

**FromZigbee converter:**
```typescript
export const converter_name: Fz.Converter<
    "clusterName",
    undefined,
    ["attributeReport", "readResponse"]
> = {
    cluster: "clusterName",
    type: ["attributeReport", "readResponse"],
    convert: (model, msg, publish, options, meta) => {
        // Extract and transform data
        return {property: value};
    },
};
```

**ToZigbee converter:**
```typescript
export const converter_name: Tz.Converter = {
    key: ["property_name"],
    convertSet: async (entity, key, value, meta) => {
        utils.assertNumber(value, "property_name");
        await entity.command("clusterName", "commandName", 
            {param: value}, 
            utils.getOptions(meta.mapped, entity)
        );
        return {state: {property_name: value}};
    },
    convertGet: async (entity, key, meta) => {
        await entity.read("clusterName", ["attributeName"]);
    },
};
```

**Modern extends (PREFERRED):**
```typescript
extend: [
    m.light({colorTemp: {range: [153, 500]}, color: true}),
    m.battery(),
    m.identify(),
    m.onOff(),
    m.temperature(),
    m.humidity(),
]
```

**Vendor-specific extends:**
```typescript
import * as philips from "../lib/philips";
import * as ikea from "../lib/ikea";
import * as tuya from "../lib/tuya";

extend: [
    philips.m.light({colorTemp: true, color: true}),
    ikea.ikeaBattery(),
    tuya.modernExtend.tuyaLight(),
]
```

**Validation utilities:**
```typescript
import * as utils from "../lib/utils";

utils.assertNumber(value, "property_name");
utils.assertString(value, "property_name");
utils.validateValue(state, ["on", "off", "toggle"]);
utils.isNumber(value);
utils.isString(value);
utils.isObject(value);
```

**State management:**
```typescript
import * as globalStore from "../lib/store";

globalStore.getValue(device, "key", defaultValue);
globalStore.putValue(device, "key", value);
globalStore.hasValue(device, "key");
globalStore.clearValue(device, "key");
```

## Troubleshooting

**Build errors:**
- Ensure pnpm version matches: `pnpm --version` should be 10.12.1
- Clean and rebuild: `pnpm run clean && pnpm run build`
- Check TypeScript version: `pnpm list typescript`

**Test failures:**
- Run single test: `pnpm vitest run -t "test name"`
- Check test output for specific errors
- Ensure all dependencies installed: `pnpm install --frozen-lockfile`

**Linting errors:**
- Auto-fix: `pnpm run check --fix`
- Manual check: `pnpm run check`
- Common issues:
  - Unused imports (auto-removed)
  - Parameter reassignment (create new variable)
  - Missing `await` in async functions

**Type errors:**
- Check `src/lib/types.ts` for type definitions
- Use `import type` for type-only imports
- Ensure proper typing for converters:
  - `Fz.Converter<ClusterType, Options, MessageTypes>`
  - `Tz.Converter`

**Device not found:**
- Check `zigbeeModel` matches device's model ID exactly
- Ensure device file is in `src/devices/`
- Rebuild to regenerate device index: `pnpm run build`

## Additional Resources

- Main documentation: https://www.zigbee2mqtt.io/
- Device support guide: https://www.zigbee2mqtt.io/advanced/support-new-devices/01_support_new_devices.html
- zigbee-herdsman: https://github.com/Koenkk/zigbee-herdsman
- Detailed coding standards: `.github/copilot-instructions.md`
- GitHub Codespaces: Available for web-based development

## Quick Reference Commands

```bash
# Initial setup
pnpm install --frozen-lockfile

# Development cycle
pnpm run build:watch          # Watch mode
pnpm run check --fix          # Format code
pnpm test                     # Run tests

# Pre-commit (automatic via Husky)
pnpm run build
pnpm run check
pnpm test

# Coverage and benchmarks
pnpm run test:coverage
pnpm bench

# Clean slate
pnpm run clean
```

---

**Remember:** Always use modern extends for device definitions (not manual converter arrays), follow patterns in existing device files, and ensure all pre-commit checks pass before creating a PR.
