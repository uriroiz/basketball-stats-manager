# Three-season broadcast preparation implementation plan

Approved in chat on 2026-10-06. Execute inline with superpowers:executing-plans.
Spec: ../specs/2026-10-06-multi-season-broadcast-preparation-design.md

## Constraints
Only 2024/25, 2025/26, 2026/27. Default 2026/27; URL then saved preference.
IBBA source only. Missing scores remain null. Official historical summaries only.
Match official IDs/links, never names; preserve historical teams. No new dependencies.
Preserve unrelated working-tree changes. No deployment in this task.

## Tasks
- [ ] 1. Central season registry and IBBASeasonData: selection, deduplicated loads, cache invalidation and partial results. RED/GREEN tests in tests/seasons.test.js.
- [ ] 2. Adapter: explicit season, both filters, offset pagination, monthly fallback, deduplication, null scores and separate analytics eligibility. RED/GREEN adapter tests.
- [ ] 3. Global season selector: latest-request guard, reset reports/filters/caches, schedule display, empty statistics, scheduled-game preparation. Test reversed responses and upcoming module.
- [ ] 4. IBBAPlayerHistory: official summary tables, header mapping, ignored DTFC clones, post/profile identities and official API bridges, no future history. Test transfers, collisions and missing values.
- [ ] 5. Shared searchable history UI in preparation/player details, lazy loads, local retry and separate historicalContext/Insights. Test no current roster and no current statistics.
- [ ] 6. Export season/history/status/source even without seasonal insights; integrate npm tests and syntax checks, browser RTL/mobile/keyboard/live-source validation and final review.

Each task: write failing behavior tests, observe RED, implement, observe GREEN including existing suite, commit only task files. Save test evidence and decisions in progress ledger.

## Acceptance
All three seasons selectable without data leakage. Scheduled games visible without invented statistics.
History matches source and respects season/team identity. Partial source failures are visible and retryable.
Export agrees with report including historical loading state. npm run check and inline HTML syntax verified.
Baseline npm test passed; syntax runner previously hit sandbox spawnSync EPERM.
