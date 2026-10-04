---
name: simplify-pr
description: Heavily simplify a contributor's zigbee-herdsman-converters PR (typically a new device with lots of custom converters/helpers) down to the bare minimum using modern extends, in line with other zhc code. Use when the user says "simplify <PR URL/number>".
---

# Simplify a PR

Input: a PR URL or number in `Koenkk/zigbee-herdsman-converters`.

1. Inspect: `gh pr view <N> --json title,body,headRefName,headRepositoryOwner,maintainerCanModify,files` and `gh pr diff <N>`.
2. Check out: `gh pr checkout <N> -b pr-<N>`. Restore the touched files to master (`git checkout master -- <files>`) and re-add only what is needed, so unrelated churn (import reformatting, removed `export`, stray exported constants) disappears.
3. Rewrite to the bare minimum (see AGENTS.md):
   - Custom cluster: inline `m.deviceAddCustomCluster(...)` with only the attributes actually used, plus a typed `interface XCluster {attributes: {...}; commands: never; commandResponses: never}` next to similar interfaces (pattern: `src/devices/amina.ts`).
   - Expose attributes with `m.numeric<"cluster", XCluster>()`, `m.enumLookup()`, `m.binary()` (use `access: "STATE_GET"`, `reporting`, `entityCategory: "config"`, `unit`, `valueMin/Max/Step`) instead of custom fz/tz converters and `e.*` exposes.
   - Use standard extends where they fit (`m.onOff({powerOnBehavior: false})`, `m.battery()`, etc.) instead of custom commands.
   - Drop: retry/delay helpers, throttling, lookup tables (e.g. voltage→% curves), string time parsing, per-day/program slot matrices, info/text exposes, `withoutExposes` hacks, `onEvent` unless essential. A small inline `{configure: [...], isModernExtend: true}` is fine when strictly required (e.g. time sync via `constants.OneJanuary2000`).
   - Keep the description short; no firmware version in it.
4. Verify: `pnpm exec tsc --noEmit -p .`, `pnpm run check --fix`, `pnpm run check`, `pnpm run build`, `pnpm vitest run`. Confirm any failures are unrelated (not in the touched device) by comparing with master.
5. Report to the user: new vs old line count, what the definition now contains, what was dropped and the resulting behaviour changes (so the contributor can add back in a follow-up), and test results. Ask before committing/pushing.
6. When asked to push: commit `refactor: simplify MODEL using modern extends` (with attribution) on top of the PR branch and `git push <contributor remote> HEAD:<headRefName>` (requires `maintainerCanModify`).
