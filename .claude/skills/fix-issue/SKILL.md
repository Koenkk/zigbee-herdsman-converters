---
name: fix-issue
description: Fix a bug reported in a zigbee2mqtt GitHub issue in an isolated worktree (e.g. missing exposes, wrong values, broken converter for an existing device), print a commit message following the PR title rules and offer to open a PR. Use when the user says "fix <github issue URL>".
---

# Fix a zigbee2mqtt issue in a worktree

Input: a URL like `https://github.com/Koenkk/zigbee2mqtt/issues/<N>` (optionally `#issuecomment-<ID>`), or an issue in `Koenkk/zigbee-herdsman-converters`.

1. Fetch the issue: `gh issue view <N> -R <owner/repo> --json title,body,comments` (`gh issue view --comments` may print nothing; use `--json`). If a comment ID is given, focus on that comment.
2. Create an isolated worktree on a fresh branch from the latest master (never touch the main checkout or its branch, so several runs can go in parallel and each can be reviewed in VS Code):
   ```bash
   MAIN=$(git rev-parse --show-toplevel); git -C $MAIN fetch origin master
   WT=$(dirname $MAIN)/zhc-fix-<N>; git -C $MAIN worktree add -b fix-<N> $WT origin/master && cd $WT && pnpm install --frozen-lockfile --prefer-offline
   ```
   If `$WT` or branch `fix-<N>` already exists, reuse it instead of recreating it. Do ALL further work (edits, commands) inside `$WT` using absolute paths.
3. Identify the device from the issue (model, `modelId`/`manufName` in the `database.db` entry) and find its definition: `grep -rn '"MODEL"' $WT/src/devices/`.
4. Find the root cause by comparing what the issue reports (payload, exposes, logs) with the definition. Typical cases:
   - Values present in the MQTT payload but not exposed → the `fromZigbee` converter publishes them but `exposes`/extend lacks them; add the matching `e.*()` exposes (or modern extend).
   - Wrong value/scale/unit → fix the converter or extend options.
   - Check what the converters used actually publish before adding exposes.
5. Make the minimal fix, following the surrounding code style. Prefer modern extends for new functionality (see AGENTS.md), but don't rewrite an existing legacy definition just to fix a bug. Do not add tests.
6. Verify inside `$WT`: `pnpm run check --fix`, `pnpm run check`, `pnpm exec tsc --noEmit -p .`.
7. Report to the user: the worktree path (so they can open/review it in VS Code), the root cause and the change in a few sentences, and the verification results. Print the commit message using the rules in the prompt in `.github/workflows/pr_title.yml` (re-read it each time), with the issue URL appended, e.g.:
   ```
   fix: HOBEIAN ZG-102ZA: expose `battery_low` and `tamper` https://github.com/Koenkk/zigbee2mqtt/issues/33249
   ```
   Description: lowercase start, short, imperative, no trailing period. Then ask whether to commit and push it as a PR. Do not commit or push before the user agrees.
8. When asked to push: from inside `$WT`, commit with that message (with attribution), `git push -u origin fix-<N>`, and `gh pr create -R Koenkk/zigbee-herdsman-converters --base master --head fix-<N> --title "<commit message>" --body "<short summary, issue URL>"` (body ends with the attribution). Report the PR URL. Afterwards clean up: `git -C $MAIN worktree remove $WT && git -C $MAIN branch -D fix-<N>`.
