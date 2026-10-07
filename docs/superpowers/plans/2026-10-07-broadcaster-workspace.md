# Broadcaster Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** לתת לשדרן המלצות ממוקדות ודף אישי הנשמר לכל משחק, עם טווחי נתונים ברורים, ייצוא תואם וגרסה 2.3.0 בכותרת האתר.

**Architecture:** המנועים הקיימים ממשיכים להפיק עובדות. מודול טווח מתאר את משמעותן, מודול עריכה מאחד ומדרג סיפורים, ושירות מצב אישי שומר תמונות של הנקודות שנבחרו. תצוגה ובקר ממוקדים מתחברים למסלול ההכנה הקיים; רענון אינו מחליף אוטומטית נקודות שמורות.

**Tech Stack:** JavaScript במבנה IIFE הקיים, בדיקות Node/assert/vm, localStorage, HTML/CSS ו־XLSX/JSZip הקיימים. אין תלויות חדשות.

**Spec:** [המפרט המאושר](../specs/2026-10-07-broadcaster-workspace-design.md).

## Global Constraints

- עונות נתמכות: 2023/24, 2024/25, 2025/26 ו־2026/27. הכנה חדשה למשחק נשארת זמינה רק לעונה הפעילה ולמשחק עתידי.
- אין מקור, תלות, מסד נתונים או הרשאות proxy חדשים.
- אין הסקה של שלב חדש מתאריך, ממספר משחקים או מהיעדר אימות עונה סדירה.
- נתון חסר נשאר חסר; אין ממוצע חלופי מסיכומים רשמיים.
- אין איחוד לפי דמיון טקסט, שם קבוצה או שם שחקן. זהות, מדד, טווח ומשמעות הם המפתח.
- המשפטים נשארים בעברית טבעית, בלי ״לפי האיגוד״, ״במשחקים שנבדקו״, תגי ״מדגם קטן״ או ״מקורות וראיות״ בכל כרטיס.
- פעולות הסידור זמינות בכפתורים ובמקלדת; גרירה אינה תנאי לשימוש.
- פיצול הקוד מתמקד ביכולות החדשות; אין ארגון מחדש גורף של `index.html`.
- הפיתוח יבוצע במסלול הפעיל עם קומיטים ממוקדים. שינויים קיימים שאינם שייכים למשימה לא יצורפו. פרסום האתר הוא שלב נפרד.
- בקשת המשתמש הנוספת: גרסה 2.3.0 תוצג בכותרת העמוד הפעיל ותעודכן גם ב־package.json.

## Review Focus

1. שני מקורות באותה עונה: כשל בסיכום שחקנים אינו פוסל סיפור משחק שהמקור שלו נטען בהצלחה. נבדק במשימות 1 ו־3.
2. אותו מספר מזהה משחק בשתי עונות: שני משחקים נפרדים, ללא כפילות של אותה רשומה בתוך עונה. נבדק במשימה 2.
3. נקודה שמורה ורענון בשני חלונות: הערה מקומית אינה נדרסת וניתן לשחזר אותה לאחר התנגשות. נבדק במשימות 3 ו־4.
4. נתוני משחק מתעדכנים בזמן ייצוא: הקובץ שומר תמונת משחק, נקודות והערות אחת. נבדק במשימה 5.
5. קישור ישיר למשחק שנדחה, הסתיים או אינו בלו״ז: אין הכנה חדשה למשחק עבר ואין פתיחת דף של משחק אחר. נבדק במשימה 4.

---

## File Structure

| קובץ | אחריות |
| --- | --- |
| Create `js/ibba/ibba_analysis_scope.js` | טווח, בסיס, מכנים ותוויות, ללא ניתוח משפטים |
| Create `js/ibba/ibba_broadcast_editorial.js` | מפתח סיפור יציב, איחוד, דירוג ובחירת המלצות |
| Create `js/ibba/ibba_broadcast_workspace.js` | מצב אישי לפי משחק, אחסון, פעולות ושחזור |
| Create `js/ibba/ibba_broadcast_workspace_view.js` | HTML נגיש לדף האישי, פעולות ופירוט |
| Create `js/ibba/ibba_broadcast_workspace_controller.js` | חיבור תצוגה, שירות מצב ואירועים; שימור מיקוד וטיוטות |
| Modify `js/ibba/ibba_rich_insights.js`, `ibba_historical_insights.js`, `ibba_insights_v2.js` | הוספת טווחים מובנים בנקודת יצירת הנתונים |
| Modify `js/ibba/ibba_broadcast_report.js`, `ibba_broadcast_copy.js`, `ibba_broadcast_view.js` | חיבור העריכה, ניסוח סיכום מפגשים והפרדת טווחים בתצוגה |
| Modify `index.html`, `css/styles.css` | חיבור המסלול הפעיל, קישור ישיר, תצוגה וייצוא |
| Modify `js/app_version.js`, `package.json` | גרסה מוצגת וסקריפטי בדיקות |
| Create/extend tests listed below | בדיקות חוזים, מקרי כשל ושילוב עם המסלול הפעיל |

All paths are relative to `C:/dev/League_Stats`. Browser globals follow the existing `window.IBBA…` convention. The existing test VM loaders must load new dependencies before their consumers; preserve meaningful assertions rather than weakening tests to fit the new output. Test snippets below show the decisive assertions; each test supplies its VM-loaded class and the fixtures described in its task.

## Shared Data Contracts

`MatchRef = { seasonKey: string, gameId: string|number }`. Storage identity uses both fields. Dates are ISO strings in stored data, not Date objects.

`AnalysisScope`:

```js
{
  basis: 'gameCalculation' | 'officialSummary',
  phase: 'regular' | 'all' | 'unknown',
  mode: 'season' | 'single' | 'rounds' | 'recent' | 'meetings',
  requestedSeasonKeys: string[],
  contributingSeasonKeys: string[],
  asOf: string | null,
  windows: Array<{ seasonKey, phase, mode, teamId, opponentId,
    venue, fromRound, toRound, count, offset, asOf, gameRefs }>,
  metricSamples: Array<{ metric, entityRef, seasonKey, unit,
    gameCount, numerator, denominator, gameRefs }>
}
```

Optional window fields use `null` when absent. `gameRefs` contain `{seasonKey, gameId}`; a metric denominator is distinct from its contributing game count. Comparison stories retain both windows and samples. A mixed or unverifiable phase is `unknown`; it cannot be treated as a regular-season comparison. Full-season profiles currently expressed as `recent` without a count become `season` in this descriptive contract, without changing selected games.

An `EditorialStory` retains existing facts, evidence and copy, and adds `analysisScope`, `storyKey` and `factFingerprint`. Semantic keys contain type, official entities, metric/quarter/condition, requested windows and basis; they exclude text, metric values, sample counts, evidence and rolling game IDs. `factFingerprint` includes those facts, contributing seasons and sample/game identities, excluding wording and presentation metadata.

`WorkspaceState = { schemaVersion: 1, matchRef, matchSnapshot, revision, writerId, updatedAt, selectedPlayerRefs, items }`.

`WorkspaceItem = { storyKey, storySnapshot, savedAt, note, used, status, pendingStory }`, where status is `active`, `changed` or `missing`. Array order is broadcast order. Transient storage notices, conflict drafts and one-step undo are returned by the service but not mistaken for persisted facts.

## Task 1 — Describe analysis scope and separate comparison blocks

**Files:** Create scope module and `tests/analysis-scope.test.js`; modify the three insight engines, report adapter, broadcast view, and existing scope-sensitive tests.

**Interfaces:**

- `IBBAAnalysisScope.fromSnapshots(snapshots, { facts, requestedSeasonKeys, asOf }) -> AnalysisScope`.
- `IBBAAnalysisScope.forOfficialSummary(record, { seasonKey, entityRef, metricUnits }) -> AnalysisScope`.
- `IBBAAnalysisScope.label(scope) -> string` and `groupKey(scope) -> string`; grouping excludes season columns, dates/cutoff, game identities and values but retains phase, basis and relative window meaning. A five-game window in two different seasons can occupy two columns in one block.
- Legacy detector outputs carry `analysisScope` from the actual games/windows used. The report supplies season IDs and cutoff; it does not guess detector windows from copy.

- [ ] Write failing tests `scope_preserves_metric_denominators`, `scope_separates_official_regular_from_all_games`, `scope_keeps_comparison_windows`, and `legacy_scope_describes_actual_selection`: assert `regular/officialSummary` differs from `all/gameCalculation`, games stay unchanged, percentage attempts differ from gameCount, `unknown` is never inferred as regular, and a recent-five detector has count 5 with matching gameRefs.

```js
assert.notStrictEqual(S.groupKey(allGamesScope), S.groupKey(officialRegularScope));
assert.strictEqual(recentFiveScope.windows[0].count, 5);
assert.strictEqual(ftSample.gameCount, 2);
assert.strictEqual(ftSample.denominator, 20); // two games, twenty attempts
```

- [ ] Run `node tests/analysis-scope.test.js`; confirm failure is the absent scope API or the intended wrong grouping.
- [ ] Implement the scope API. At `IBBARichInsights.story` consume snapshots and exact metric sample sets; at historical `make` pass explicit game/summary scope from each caller. At legacy detector creation preserve its real selected window and denominator; aggregate-only outputs lacking detail keep unknown fields instead of inventing evidence. Current team/player entities resolve through the report's official match/API context.
- [ ] Update `IBBABroadcastView.groups/renderGroups`: scope/basis participate in grouping, seasons remain columns, common game counts appear once in headers, differing counts remain beside their cells. Missing metrics stay `—`. Unknown-scope stories remain readable individually and cannot merge into a falsely comparable numeric block.
- [ ] Extend view/regression tests for different sample counts, equal values with different basis, and official multi-team player summaries. Run scope, broadcast-view, rich-insights, historical-insights, insights-regressions and broadcast-report tests; require pass without changed detector thresholds.
- [ ] Commit only Task 1 files: `feat: describe broadcast analysis scopes`.

## Task 2 — Stable editorial selection and pooled meetings

**Files:** Create editorial module and `tests/broadcast-editorial.test.js`; modify report and copy modules; extend report/copy/integration tests.

**Interfaces:**

- `IBBABroadcastEditorial.storyKey(story) -> string|null`; official identity is required for merging. An unresolvable candidate stays in the detailed report rather than being joined by its name.
- `IBBABroadcastEditorial.fingerprint(story) -> string` uses stable object ordering.
- `IBBABroadcastEditorial.prepare(candidates, context, { limit=6, variant=0 }={}) -> { allStories, topStories }` returns copies, never mutates input or fetches data.
- `IBBABroadcastReport.compose` exposes `allInsights` with keys/fingerprints and uses editorial `topStories`. Its existing `selectTopStories` entry point remains a compatible wrapper for consumers/tests.

- [ ] Write failing tests: `same_facts_same_order`, `rewording_preserves_story_key`, `new_games_change_fingerprint_not_rolling_key`, `current_change_precedes_historical_round`, `conditional_25_of_27_precedes_profile`, `one_of_one_gets_no_extreme_bonus`, `both_teams_and_family_diversity`, `never_pad_short_list`.
- [ ] Add `pool_h2h_by_official_pair_and_season_game_key`: fixture has 2+2 wins, a duplicate row, and the same numeric ID in different seasons. Assert four unique games, one pooled recommendation, yearly detail retained, equal records name both teams, differing records name the leader. Partial seasons cannot produce an “all meetings” claim for that season. Add a single/+30/−28 round fixture; retain actual outcomes.

```js
assert.strictEqual(pooled.facts.total, 4);
assert.strictEqual(result.topStories.filter(s => s.type === 'POOLED_H2H_RECORD').length, 1);
assert.strictEqual(E.storyKey(original), E.storyKey(reworded));
assert.strictEqual(E.storyKey(original), E.storyKey(newRollingGame));
assert.notStrictEqual(E.fingerprint(original), E.fingerprint(newRollingGame));
assert(result.topStories.findIndex(s => s.storyKey === E.storyKey(currentChange))
  < result.topStories.findIndex(s => s.storyKey === E.storyKey(historicalRound)));
```

- [ ] Run `node tests/broadcast-editorial.test.js`; confirm intended failures.
- [ ] Implement the six ranking tiers from the spec: current changes/streaks and selected-current-player matchup; latest meeting/specific historical-player matchup; conditional record with total >=10 and win ratio >=0.8 or <=0.2; pooled meetings; verified round/window context; other profiles. Break ties by existing detector priority, newest contributing season, stable storyKey. Represent both teams where valid, max two per family while alternatives remain, then fill up to six valid stories.
- [ ] Move compatible round merging from report into editorial. Pool meeting records from context games of fully loaded seasons using `(seasonKey, gameId)` and official team IDs. Add structured `POOLED_H2H_RECORD` copy with seasons, winsByTeam and total; retain source rows in the full report. Prevent repeated yearly H2H/round cards from competing with their merged highlight.
- [ ] Run editorial, broadcast-report, broadcast-copy, rich-broadcast-integration and historical-insights tests. Verify existing real legacy `RISING_STAR` integration still appears once current data is available. Commit: `feat: prioritize and combine broadcast stories`.

## Task 3 — Personal workspace persistence and reconciliation

**Files:** Create workspace module and `tests/broadcast-workspace.test.js`.

**Interfaces:**

- `new IBBABroadcastWorkspace({storage, now, writerId})` uses injected storage/clock.
- `load(matchRef) -> { state, notice, conflict, writable }` reads only `ibba_broadcast_workspace_v1:<seasonKey>:<gameId>`.
- `apply(command) -> result` handles `add`, `remove`, `undo`, `move`, `note`, `used`, `update`, `players`, `reset`, `acceptRemote`, `keepLocal`.
- Every command has `type` and `matchRef`; a command targeting another loaded game is rejected. `add` receives `story`, `move` receives `storyKey` and `direction: -1|1`, `note` receives `storyKey` and `note`, and `used` receives `storyKey` and boolean `used`. Remove/update receive `storyKey`; players receives `selectedPlayerRefs`. Undo/reset/acceptRemote/keepLocal operate on the loaded match.
- `reconcile(report) -> result` and `receiveExternal({key,newValue}) -> result` retain saved snapshots/notes. All returned state is detached from caller/report input.
- `snapshot() -> result` returns a detached state for export.

- [ ] Write tests for add/deduplicate, order/move boundary, note/used, remove/undo, reload, two games between the same teams, same game ID across seasons, and shared season key prefix. Assert snapshots retain facts/scope/evidence and saved text after rewording.
- [ ] Write `reconcile_preserves_notes_and_order`: identical fingerprints stay active; changed facts move to changed with a pending snapshot; update accepts it while keeping note/order/used; successfully loaded but missing stories become missing. Requested versus contributing seasons preserve the semantic key on late enrichment. Source failure keeps the saved snapshot and a central date/status notice.
- [ ] Write failures for blocked getters/setters, quota, corrupt JSON, unsupported schema, duplicate saved keys, wrong matchRef, and two writers. Preserve local edits on storage events/conflict, including an external revision arriving after a local write. Corrupt stored input is not overwritten until explicit reset.

```js
ws.apply({ type: 'note', matchRef, storyKey: 's', note: 'לפתיחה' });
ws.apply({ type: 'used', matchRef, storyKey: 's', used: true });
const reconciled = ws.reconcile(changedReport).state.items[0];
assert.strictEqual(reconciled.status, 'changed');
assert.strictEqual(reconciled.note, 'לפתיחה');
assert.strictEqual(reconciled.used, true);
assert.strictEqual(reloaded.snapshot().state.items[0].storySnapshot.text, savedText);
assert.strictEqual(corruptStorageWrites, 0);
```

- [ ] Run `node tests/broadcast-workspace.test.js`; confirm expected missing module/behavior failure.
- [ ] Implement schema validation, command reducer, snapshot cloning, revision/writer comparison, and source-specific reconciliation. Check current revision before writing; retain a recovery draft if a conflict is detected. A failed game source cannot erase its saved stories; a failed player summary cannot invalidate a ready game-calculation story. An enrichment still loading cannot count as a successfully removed story.
- [ ] Run workspace tests and editorial tests. Require the exact storage failure notice from the spec, and never report successful persistence after a failed write. Commit: `feat: save personal broadcast preparation`.

## Task 4 — Integrate accessible workspace, actions and deep links

**Files:** Create workspace view/controller and `tests/broadcast-workspace-view.test.js`, `tests/broadcast-workspace-ui.test.js`; modify index, CSS, broadcast view and season UI tests.

**Interfaces:**

- `IBBABroadcastWorkspaceView.render(report, result, { readOnly=false }={}) -> string` escapes all text and uses `IBBABroadcastView.text` for numeric RTL isolation.
- `new IBBABroadcastWorkspaceController({ workspace, root, clipboard, onChange })`.
- `open(match, {readOnly=false}={})`, `publish(report)`, `refreshStarted()`, `showSourceError(error)`, `snapshot()`, `detach()`. All calls enforce the open matchRef. Delegated root events and one storage listener are registered once and detached when appropriate.
- Index creates/opens the controller before loading sources. Existing reportVersion/season gate checks run before `publish`; `resetPreparationReport` detaches the prior controller without deleting storage.
- Index adds `restorePreparationFromUrl({seasonKey, scheduleGames, isCurrent}) -> Promise<boolean>` after season data is applied; validates `season/view/game` against the same season's official schedule.

- [ ] Write view tests for empty instructions, add/copy/details, saved notes, up/down/used/remove/undo, changed preview/update, missing story review area, escaping, readonly state, central storage notice, labels/live region and disabled move boundaries.
- [ ] Write UI tests for opening A then B with reversed responses, refresh preserving notes/family/filter/details and player selection, keyboard focus/caret after actions, a draft during an external write, and no repeated listeners after ten renders. Manual copy fallback selects displayed text without removing the saved note.
- [ ] Write deep-link tests: valid future match restores; wrong/unknown ID stays in chooser; unavailable source displays only a saved matching snapshot; updated date uses the same workspace; completed/past/cancelled game is read-only. An old-season deep link cannot enable new preparation. URL update preserves unrelated params and season selection precedence.

```js
assert.strictEqual(boundStorageListeners, 1);
assert.strictEqual(activeWorkspace.state.matchRef.gameId, matchB.gameId);
assert.strictEqual(document.activeElement.selectionStart, savedCaret);
assert.strictEqual(restoredPastMatch.readOnly, true);
assert.strictEqual(pastMatchAnalysisCalls, 0);
assert(!rendered.includes('<img src=x onerror='));
```

- [ ] Run new view/UI and `node tests/season-ui.test.js`; confirm meaningful failures before changing index.
- [ ] Implement personal section above recommendations; up to six editorial cards with actions; short group summaries followed by closed details tables. Chooser remains first. Preserve explicitly opened tables, search/filter, focus/caret and selected players across renders; do not automatically reopen ROUND. The personal page remains accessible during source loading/failure.
- [ ] Wire report composition/reword/player changes through controller, so saved copy stays unchanged and source refresh reconciles facts. Add unique data-action/story-key attributes for both recommended and detailed stories. Pending/missing stories stay in a separate review section. Read-only preparation does not load a new game analysis.
- [ ] Add CSS for stacked cards, visible focus, readable spacing and table-only horizontal scroll. Validate view/UI/season tests, then check at 390×844 and desktop in the browser: add, type, move, copy, mark used, refresh, reload and switch game/season.
- [ ] Commit: `feat: add broadcaster preparation workspace UI`.

## Task 5 — Export the selected preparation snapshot

**Files:** Modify report/workspace/index export connections; create `tests/broadcast-workspace-export.test.js`; extend season UI export race tests.

**Interfaces:**

- `IBBABroadcastReport.exportRows(report, { mode='full', workspace=null }={}) -> Array<Array<string|number|null>>`. Default full keeps compatibility with existing callers.
- `IBBABroadcastReport.captureExport(report, workspaceResult, { mode }) -> { mode, match, seasonKey, rows, capturedAt }`; creates a synchronous detached snapshot before any XLSX/ZIP await. Rejects a mismatched report/workspace matchRef.
- Modes: `personal`, `recommended`, `full`. Active personal stories retain stored text, order, note and used flag. Changed/missing stories are excluded from current personal points. A cached snapshot exported during source failure is labelled centrally with its saved date/status.

- [ ] Write failing tests comparing displayed saved text/order/notes/used to export rows, empty personal -> visibly labelled recommended choice, no recommendations -> disabled first choice, full evidence/facts preserved, different basis/scopes separated, and no mutation of inputs.
- [ ] Write export race fixtures: source failure with saved workspace; history still loading; match switch or changed note while JSZip awaits; report/workspace mismatch. Assert the downloaded file describes exactly the originally captured match and state.

```js
const snapshot = B.captureExport(reportA, workspaceA, { mode: 'personal' });
workspaceA.state.items[0].note = 'changed later';
assert(snapshot.rows.some(row => row.includes(originalNote)));
assert(!snapshot.rows.some(row => row.includes('changed later')));
assert.strictEqual(snapshot.match.gameId, reportA.gameInfo.gameId);
assert.throws(() => B.captureExport(reportB, workspaceA, { mode: 'personal' }));
```

- [ ] Run export/season UI tests; confirm intended failures.
- [ ] Implement a labelled export selector next to `prepExport`: first choice personal when active points exist, otherwise recommended; full always available when a full report is ready. With only cached saved data, personal remains available but full is disabled with an explanation. Keep full export's existing detailed analyses and selected player history. Build filenames/season/header from captured match, never mutable selects or gamePrepState after awaits.
- [ ] Run export, broadcast-report and season UI tests. Inspect a real generated workbook using the existing XLSX APIs: personal and full exports contain the expected sections and match metadata. Commit: `feat: export personal broadcast preparation`.

## Task 6 — Version 2.3.0 and complete local verification

**Files:** Modify `js/app_version.js`, index and package; create `tests/app-version.test.js`; create `docs/superpowers/plans/2026-10-07-broadcaster-workspace-qa.md` and `CHANGELOG_v2.3.0.md`.

**Interfaces:** Existing `VersionManager` remains the owner of the display. Initialize version fields to major 2, minor 3, patch 0. `getVersionString()` returns stable `v2.3.0` for the release display; runtime-generated timestamps may stay diagnostic metadata but cannot make a reload appear to be a different release. Load `js/app_version.js` once and add a `.version-display` element in the active header with accessible text.

- [ ] Write `header_displays_release_2_3_0` and `reload_keeps_release_version`: VM test loads the real module with the header element, expects `v2.3.0`, and checks package version matches. Verify the active HTML actually loads the module and has one display. Run test and confirm failure before updating version.

```js
assert.strictEqual(manager.getVersionString(), 'v2.3.0');
assert.strictEqual(versionElement.textContent, 'v2.3.0');
assert.strictEqual(JSON.parse(fs.readFileSync('package.json', 'utf8')).version, '2.3.0');
assert.strictEqual((html.match(/class="[^"]*\bversion-display\b/g) || []).length, 1);
assert(html.includes('src="js/app_version.js"'));
```

- [ ] Implement version/header/package changes. Add all new test suites to npm test in dependency-independent sequence; preserve existing suites. Add changelog describing recommendations, personal saving, meaningful scopes and export.
- [ ] Run `npm run check`; require all test suites, all JavaScript syntax and the inline HTML script syntax to pass. If the Windows sandbox again prevents Node subprocess launch with EPERM, run the same command with approved escalation; do not change the checker to conceal a failure.
- [ ] Perform browser QA using real local data: select planned Ashkelon derby and Migdal HaEmek–Nahariya; verify all three historical seasons, round outcomes, pooled matchups and report scopes. Check saved points survive reload and stay isolated between two matches. Confirm selected players retain verified historical teams.
- [ ] Exercise source retry, unavailable storage, changed saved facts and late responses using clearly identified synthetic/test fixtures where current 2026/27 statistics do not yet exist. Verify a real legacy current-season detector is still integrated using the existing regression fixture; never present synthetic results as live data.
- [ ] Check every new action with keyboard and at 390×844; inspect browser errors, global page overflow, table scroll, focus retention and clipboard fallback. Download both export choices. Smoke-check games/team/player/leader screens and season switching; prep only permits new future-game reports.
- [ ] Record exact commands/results, checked flows and remaining source limitations in the QA document. Review the task diff against all ten spec sections, stage only task files, run `git diff --cached --check`, and commit: `feat: release broadcaster workspace v2.3.0`.

## Baseline and execution handoff

Baseline on 7.10.2026: `npm run check` passed after escalation for the Windows `spawnSync EPERM` sandbox restriction: 52 JavaScript files, one inline HTML script and 20 existing test suites. This is baseline evidence, not verification of the implementation above.

Local header inspection found no visible version in the active index. `js/app_version.js` contains an unused older 1.3.0 manager, while package.json is 2.0.0 and prior release documents reach 2.2.6. Task 6 makes the requested displayed release explicit and consistent at 2.3.0.

Recommended execution: **Native** in this session, using `superpowers:executing-plans`; the six tasks share story/scope/workspace interfaces. A final independent review follows execution. **Subagent-driven** is also available if chosen, with implementation and review gates per task. The written plan awaits user review and execution-method selection before product changes.
