# Website QA and fixes — 2026-10-06

Scope: active Pure API dashboard (`index.html`), three seasons, broadcaster preparation. Historical data remains available for statistics and player context. Preparation now accepts future, unfinished games in 2026/27 only. No deployment or changes to unrelated working-tree files.

## Fixed defects

1. Future-game action used analytics games to locate teams, failing when the season contained only scheduled games. It now uses schedule teams and directly analyzes the clicked event ID.
2. Historical seasons offered preparation. Their preparation tab is disabled, with a reason; eligibility is also checked in the analysis function. Past/completed games are excluded from upcoming rounds and manual preparation.
3. Delayed auto-click could operate on a changed season or matchup. Removed delayed trigger; selected event, report date and exported teams are tied to the same event.
4. Changing team selectors retained an exportable report; a pending report could restore itself after reset. Reset now advances the report generation and disables export. Deferred-report regression verifies this interaction.
5. Schedule-only preparation lacked a match summary and workbook identity/source. Added selected teams, planned date, source in Excel, and a visible report that is brought into view. Export stays disabled until a report exists.
6. Player-name source errors were treated as successful end-of-pagination. Failed loads remain retryable; direct requests have time limits. Official numeric summary identities supply fallback names. Missing referenced IDs are resolved with at most six concurrent official individual-player requests; mismatched returned IDs are rejected. Profile bridges use official `id` and `link`, never names, jersey numbers, row positions or current-team assumptions.
7. Names loaded after the player/leader tab had been left could leave cached placeholders. Enrichment invalidates named views; reentry rebuilds them.
8. Name refresh could render averages under totals headers. Initialization now preserves the selected statistics view through shared totals mapping.
9. Player sorting lacked keyboard support. Enter/Space now activate sortable player headers.
10. Shared player-history controls could update a hidden panel after changing tabs. History remounts in the active panel; late preparation initialization checks season generation and active tab. Historical player details use the Players tab, without enabling historical match preparation.
11. Loading hundreds of historical rows above upcoming controls moved the controls during interaction. History now follows the schedule and matchup selection.

## Verification

- RED/GREEN regressions added for schedule-only click, exact selected event, future/latest-season eligibility, historical tab guard, pending report invalidation, summary/export identity, disabled stale export, numeric identity fallback, failed names retry, referenced-ID recovery, keyboard sorting, totals preservation, inactive-tab names enrichment and history remounting.
- `npm run check`: 44 JavaScript files, one inline script, all seven regression groups passed.
- Browser checked three-season navigation, games/round filters and clear, team search and totals, player search/names/history, league leaders, scheduled-game button and selector preparation, export generation and report reset.
- Live source: 2024/25 244 games with statistics; 2025/26 281; 2026/27 210 scheduled games and no seasonal statistics. Kafr Qasim historical labels preserved. Ricky Pack's official player ID 772662 resolved to his stable profile and the 2024/25 Kfar Saba summary from the 2025/26 player detail.
- Simulated API/proxy blocking in a browser tab produced a retryable season failure. Blocking removed; refresh returned all 210 scheduled games. Temporary network changes removed.
- Mobile RTL checked at 390px: page width 375px, no page overflow. Upcoming-game action also activated with Enter. Viewport override removed. Screenshot: `2026-10-06-qa-prep-preview.jpg`.
- Source limitations remain explicit: failures do not produce zero averages, synthetic names or unverified identity matches. Scheduled source dates can change; no roster membership is inferred from history.
- Excel data consistency, loading-history status, source URLs and asynchronous filename/date stability are tested. The in-app browser did not provide a downloaded-file path; browser generation succeeded, while workbook row consistency is covered by regression tests.

No publication performed. Local changes are ready for review and use.
