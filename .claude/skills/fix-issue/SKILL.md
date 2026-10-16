---
name: fix-issue
description: Fix a bug reported in a zigbee2mqtt GitHub issue locally (e.g. missing exposes, wrong values, broken converter for an existing device) and produce a commit message following the PR title rules. Use when the user says "fix <github issue URL>".
---

# Fix a zigbee2mqtt issue locally

Input: a URL like `https://github.com/Koenkk/zigbee2mqtt/issues/<N>` (optionally `#issuecomment-<ID>`).

1. Fetch the issue: `gh issue view <N> -R Koenkk/zigbee2mqtt --json title,body,comments` (`gh issue view --comments` may print nothing; use `--json`). If a comment ID is given, focus on that comment.
2. Identify the device from the issue (model, `modelId`/`manufName` in the `database.db` entry) and find its definition: `grep -rn '"MODEL"' src/devices/`.
3. Find the root cause by comparing what the issue reports (payload, exposes, logs) with the definition. Typical cases:
   - Values present in the MQTT payload but not exposed → the `fromZigbee` converter publishes them but `exposes`/extend lacks them; add the matching `e.*()` exposes (or modern extend).
   - Wrong value/scale/unit → fix the converter or extend options.
   - Check what the converters used actually publish before adding exposes.
4. Make the minimal fix, following the surrounding code style. Prefer modern extends for new functionality (see AGENTS.md), but don't rewrite an existing legacy definition just to fix a bug. Do not add tests.
5. Do not commit unless asked. Report the root cause and the change in a few sentences; mention that build/tests were not run unless you ran them.
6. Provide a commit message using the rules in the prompt in `.github/workflows/pr_title.yml` (re-read it each time), with the issue URL appended, e.g.:
   ```
   fix: HOBEIAN ZG-102ZA: expose `battery_low` and `tamper` https://github.com/Koenkk/zigbee2mqtt/issues/33249
   ```
   Description: lowercase start, short, imperative, no trailing period.
