# SDD ledger — plan: docs/superpowers/plans/2026-10-06-multi-season-broadcast-preparation.md

Base: 934c65d. Execution: inline.
Pre-flight: tasks 1/2 produce season datasets consumed by tasks 3/5; schedule and analytics remain separate.
Pre-flight: task 4 produces official identity records consumed by task 5 and task 6; no name matching.
Ruling: use the authorized current feature checkout unless user opts into a worktree; do not move existing edits.
Ruling: use this tracked ledger instead of shell-only SDD helpers on Windows; preserves decisions and verification without bash dependencies.
Task 1: complete. RED: season registry absent. GREEN: node tests/seasons.test.js and npm test passed.
Task 2: complete. RED: explicit season ignored. GREEN: pagination, null results, monthly partial failure and existing suite passed. Commit b5aaca6.
Task 3: complete. RED: asynchronous season controller absent. GREEN: reversed-response test and existing suite passed. Commit 5821497. Browser verification remains in task 6.
Task 4: complete. RED: summary parser absent. GREEN: official ID/profile matching, cloned tables, missing values, transfer teams, source failure/retry tests passed.
Ruling: add only the exact encoded 2024/25 league path to existing league-page proxy permission; no new domains or endpoint classes. Existing slug regex rejected the official historical URL.
Task 5: complete; shared searchable history component and separate historical context. Browser verified schedule-only preparation and sourced two-season player insights.
Task 6: complete. npm run check passed: 44 JS files, one inline HTML script, seven regression groups. Export regression verifies selected season, explicit pending-history status, and original teams/date after a concurrent season switch.
Live browser: 2026/27 = 210 schedule / 0 analytics; 2025/26 = 281 / 281; 2024/25 = 244 / 244. Example historical games: 1198671 (76–87), 1085434 (89–75). Scheduled opener 13 October 2026: Elitzur Shomron vs Elitzur Netanya.
Live official summaries: 538 records across two previous seasons. Ricky Pack's stable profile has Kfar Saba in 2024/25 (15 games, 23.5 points) and Otef Darom in 2025/26 (4 games, 24 points). UI preserves both teams and cites each season.
Browser: URL season links/reload, rapid 2024/25 → 2026/27 switching, schedule-only report and Excel generation succeeded. Download-event capture did not expose a saved path in the in-app browser; workbook data and asynchronous filename/date consistency verified by regression instead. Source failures/retry and out-of-order responses are exercised deterministically in Node tests.
RTL/keyboard/mobile: 390px viewport, search → player select via Tab, horizontal history table overflow (754px content within 327px container), no page overflow. Screenshot: 2026-10-06-history-preview.jpg.
Independent reviewer identified stale report contents, asynchronous name refresh, empty player statistics, inaccessible schedule-only export, and filename races; corrected with regressions. Final loading behavior publishes schedule before optional player-name enrichment.
Delivery: local feature commits only. No deployment; unrelated existing edits preserved. History remains dependent on official source availability and verified identities; missing values and failed seasons are visible.
