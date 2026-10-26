---
name: simplify-pr
description: Heavily simplify a contributor's zigbee-herdsman-converters PR (typically a new device with lots of custom converters/helpers) down to the bare minimum using modern extends, in line with other zhc code. Use when the user says "simplify <PR URL/number>".
---

# Simplify a PR

Input: a PR URL or number in `Koenkk/zigbee-herdsman-converters`.

1. Inspect: `gh pr view <N> --json title,body,headRefName,headRepositoryOwner,maintainerCanModify,files` and `gh pr diff <N>`.
2. Check out in an isolated worktree (never touch the main checkout or its branch, so several runs can go in parallel and each can be reviewed in VS Code):
   ```bash
   MAIN=$(git rev-parse --show-toplevel); git -C $MAIN fetch origin master pull/<N>/head:pr-<N>
   WT=$(dirname $MAIN)/zhc-pr-<N>; git -C $MAIN worktree add $WT pr-<N> && cd $WT && pnpm install --frozen-lockfile --prefer-offline
   ```
   If `$WT` already exists, reuse it instead of recreating it. Do ALL further work (edits, commands) inside `$WT` using absolute paths.
3. Undo all PR changes and stage that, so the index equals the PR's base and the simplified variant shows up as plain unstaged changes (`git diff`) for local review:
   ```bash
   git -C $WT diff --binary $(git -C $WT merge-base origin/master HEAD) HEAD | git -C $WT apply -R --index
   ```
   Then write the simplified variant from scratch on top of that, re-adding only what is needed, so unrelated churn (import reformatting, removed `export`, stray exported constants) disappears. Never stage the simplified variant.
4. Rewrite to the bare minimum (see AGENTS.md):
   - Custom cluster: inline `m.deviceAddCustomCluster(...)` with only the attributes actually used, plus a typed `interface XCluster {attributes: {...}; commands: never; commandResponses: never}` next to similar interfaces (pattern: `src/devices/amina.ts`).
   - Expose attributes with `m.numeric<"cluster", XCluster>()`, `m.enumLookup()`, `m.binary()` (use `access: "STATE_GET"`, `reporting`, `entityCategory: "config"`, `unit`, `valueMin/Max/Step`) instead of custom fz/tz converters and `e.*` exposes.
   - Use standard extends where they fit (`m.onOff({powerOnBehavior: false})`, `m.battery()`, etc.) instead of custom commands.
   - Drop: retry/delay helpers, throttling, lookup tables (e.g. voltage→% curves), string time parsing, per-day/program slot matrices, info/text exposes, `withoutExposes` hacks, `onEvent` unless essential. A small inline `{configure: [...], isModernExtend: true}` is fine when strictly required (e.g. time sync via `constants.OneJanuary2000`).
   - Keep the description short; no firmware version in it.
5. Verify: `pnpm exec tsc --noEmit -p .`, `pnpm run check --fix`, `pnpm run check`, `pnpm run build`, `pnpm test` (plain `pnpm vitest run` skips the test config and fails on `models-index.json`). Confirm any failures are unrelated (not in the touched device) by checking they also fail on `origin/master` (in a separate throwaway worktree if needed, never by switching branches in the main checkout).
6. Report to the user: the worktree path (so they can review the unstaged changes in VS Code), new vs old line count, what the definition now contains, what was dropped and the resulting behaviour changes (so the contributor can add back in a follow-up), and test results. Print the commit message (`refactor: simplify MODEL using modern extends`) and ask whether to push it to the PR. Do not commit or push before the user agrees.
7. When asked to push: stage everything (`git add -A`), commit with that message (with attribution) on top of the PR branch and from inside `$WT` run `git push https://github.com/<headRepositoryOwner>/zigbee-herdsman-converters.git HEAD:<headRefName>` (requires `maintainerCanModify`; no remote needed). Report the PR URL. Afterwards clean up: `git -C $MAIN worktree remove $WT && git -C $MAIN branch -D pr-<N>`.
