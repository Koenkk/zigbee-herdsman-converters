---
name: add-device-from-issue
description: Add support for a device reported in a zigbee2mqtt GitHub issue (e.g. "[External Converter]" or "[New device support]" issues), preferring to merge its fingerprint into an existing definition. Use when the user says "add <github issue/comment URL>".
---

# Add device from a zigbee2mqtt issue

Input: a URL like `https://github.com/Koenkk/zigbee2mqtt/issues/<N>#issuecomment-<ID>`.

## 1. Gather the data

The linked comment is often just a bot message (stale notice, "thank you" template, "similar device found"), so always read the issue itself, plus all of its comments:

```bash
gh api repos/Koenkk/zigbee2mqtt/issues/comments/<ID> --jq .body
gh issue view <N> -R Koenkk/zigbee2mqtt --json title,body --jq '.title,.body'
gh api repos/Koenkk/zigbee2mqtt/issues/<N>/comments --jq '.[].body'
```

Extract:
- `modelId` and `manufacturerName` (e.g. `TS0601` / `_TZE284_xxxxxxxx`)
- the external converter: datapoints (`tuyaDatapoints`), exposes, endpoints
- what the reporter says works and what doesn't
- any bot hint like "similar device ... `_TZE204_xxxxxxxx` is already supported"

## 2. Check whether it is already supported

```bash
grep -rn "<manufacturerName>" src/devices/
```

If it's already there, stop and tell the user.

## 3. Find an existing definition to merge into

Try these in order:
1. **Same suffix, different prefix.** For Tuya, `_TZE200_abc`, `_TZE204_abc` and `_TZE284_abc` are usually the same device. Run `grep -rn "_abc\"" src/devices/`.
2. **Same datapoints.** Look for a definition with the same `model:` family (e.g. `TS0601_dimmer_*`, `TS0601_switch_*`) whose `tuyaDatapoints` list has the same DP numbers and meanings as the external converter.

If you find a match, add the manufacturerName to the end of that definition's `tuya.fingerprint(...)` list. Add a `tuya.whitelabel(...)` only when the issue gives a real brand and model.

If nothing matches, add a new definition next to similar ones, using modern extends (see AGENTS.md). Don't add tests.

## 4. Validate

```bash
pnpm exec biome check src/devices/<file>.ts
```

## 5. Report back

- where the fingerprint went (file:line) and which definition it joined
- any differences from the reporter's converter, for example:
  - value scaling (`raw` vs `scale0_254to0_1000`)
  - different enum values or converters
  - exposes that are missing or extra
- whether the match is confirmed (the reporter said it works) or only inferred
- the commit message:
  - merged into an existing definition: ``fix(detect): Detect `<manufacturerName>` as <Vendor> <model>``
  - new definition: `feat(add): <MODEL>`

Don't commit unless asked.
