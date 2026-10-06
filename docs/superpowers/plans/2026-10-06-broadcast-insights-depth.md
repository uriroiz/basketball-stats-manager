# תכנית מימוש — Insights עשירים לאורך העונה

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans or superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** לתת לשדרנים את כל משפחות התובנות המבוססות הזמינות, עם חישובי מחזורים וחלונות משחקים, משפטים זורמים והיסטוריית שחקנים נוחה.

**Architecture:** להוסיף שירות חישובי חלונות ומנוע תובנות המבוסס עליו סביב שירותי העונות והדוח הקיימים. עובדות, מדגמים, כיסוי וניסוחים נשמרים בדוח אחד שהמסך וה־Excel צורכים. מנוע V2 נשאר לניתוחים העונתיים הקיימים; אין הזנת כמה עונות כאילו היו עונה אחת.

**Tech Stack:** JavaScript במבנה הקיים, Node/VM לבדיקות, IBBA API ודפי האיגוד, XLSX ו־JSZip שכבר נטענים. ללא תלויות או אחסון חדשים.

**Spec:** [המפרט המאושר](../specs/2026-10-06-broadcast-insights-depth-design.md).

## Global Constraints

- שלוש העונות הקיימות בלבד; הכנה למשחק עתידי בעונה האחרונה בלבד. אין פרסום או הרחבת הרשאות proxy.
- חישובי ממוצעים מחלונות משחקים מותרים. סיכומים עונתיים רשמיים נשארים נפרדים ואינם משוכתבים.
- ממוצע = סכום / מספר משחקים תקפים; אחוז קליעה = סך קליעות / סך ניסיונות. אין ממוצע של אחוזים או ממוצעים בעלי מכנים שונים.
- חסר נשאר חסר, אפס מפורש תקף. ניקוד/ספיגה דורשים תוצאה בלבד, לא שחקנים. דקות זמן מנורמלות לפני חישוב.
- זהות רשמית בלבד; אין חיבור לפי שם או חולצה ואין הסקת סגל מהעבר.
- מחזור סדיר מאומת בלבד להשוואות מחזורים. חיתוך הזמן הנוכחי הוא המוקדם בין יצירת הדוח למועד המשחק.
- עובדה מותרת ממשחק אחד; ממוצע שתי הופעות מחזור היסטוריות מסומן ״מדגם קטן״. מגמה חדשה דורשת לפחות חמישה משחקים תקפים בכל צד; ספים גבוהים יותר של גלאים קיימים נשמרים.
- עד שמונה נקודות בולטות בראש הדוח; כל התובנות התקפות זמינות בהמשך ללא מכסה מחייבת.
- אין ״לפי האיגוד״ או ״סיכום תוצאות משחקי האיגוד״ במשפט לשידור. עונה וקבוצה היסטורית נשמרות כשנדרשות להבנה.
- חיפוש שחקנים: שורה אחת לזהות, עמודים של 25; פירוט עונה/קבוצה בפתיחה; ללא טור מקור.
- אין ייצוא אוטומטי של מאגר השחקנים. הייצוא כולל רק שחקנים שנבחרו, את הסיפורים, הראיות ומצב הנתונים.
- עיגול בתצוגה בלבד. אין תחזיות, שיאי קריירה, דירוג רשמי משוחזר או המצאת מקור חסר.
- לשמר שינויים קיימים שאינם קשורים למשימה; קומיטים כוללים רק קבצים מפורשים של המשימה.

## Review Focus

1. סטטיסטיקה בסיסית כמחרוזת: `off='4', def='5'` חייבים להסתכם ב־9, לא 45; שדה חסר לא ייכנס כמספר אפס. בדיקות במשימה 1.
2. משחק נדחה או מחזור שלא קיים בעונה קצרה: חלון מחזורים אינו חמשת המשחקים הכרונולוגיים האחרונים. כיסוי חסר נשמר לכל קבוצה בנפרד. בדיקות במשימות 2–4.
3. מקור שלם להעברה אך טבלת שחקן חלקית: ממוצע ניקוד קבוצתי זמין, אבל ממוצע מדד חסר והופעת אפס של שחקן אינם נוצרים. בדיקות במשימות 1, 3 ו־6.
4. גישור זהות שחוזר אחרי שינוי משחק או עימוד: אין איחוד לפי שם, הוספה לדוח אחר או אובדן מיקוד. בדיקות במשימה 8.
5. שינוי ניסוח בזמן ייצוא/טעינה: הטקסט, השנים והמכנים בחוברת תואמים לתמונת הדוח שנבחרה; כשל רענון אינו משאיר נתון קודם כנתון חדש. בדיקות במשימות 7 ו־9.

## מבנה הקבצים והחוזים

- שינוי `js/ibba/ibba_adapter.js`: ערכים מספריים וזמינות שדות לפי קבוצה/שחקן; שמירת תאימות למנוע הישן.
- שינוי `js/ibba/ibba_match_context.js`: נתוני תוצאות נוכחיים ללא תלות בשחקנים, כיסוי לכל קבוצה ושימוש נכון במטמון הסדיר.
- יצירת `js/ibba/ibba_window_stats.js`: בחירת חלון וחישוב מדדים בלבד; ללא טקסט או DOM.
- יצירת `js/ibba/ibba_rich_insights.js`: שש משפחות סיפורים עם עובדות ומכנים, מתוך החלונות.
- יצירת `js/ibba/ibba_broadcast_copy.js`: ניסוחים קצרים ומבוססי עובדות, ללא הורדת נתונים.
- שינוי `js/ibba/ibba_broadcast_report.js`: דוח אחד, הסרת כפילות, דירוג, פירוט כל התובנות וייצוא.
- שינוי `js/ibba/ibba_history_view.js` ו־`js/ibba/ibba_player_history.js`: חיפוש מאוחד, עימוד, פירוט ופעולות בחירה.
- שינוי `index.html`: סדר טעינת המודולים, רכיבי הדוח והאירועים בלבד; אין שכתוב כולל של המסך.
- הרחבת הבדיקות הקיימות ויצירת שש קבוצות בדיקה: זמינות, חלונות, סיפורים, ניסוחים, תצוגת היסטוריה ושילוב מקצה לקצה.

**WindowSpec:** `{seasonKey, phase:'regular'|'any', mode:'rounds'|'recent', fromRound?, toRound?, count?, teamId?, opponentId?, venue?:'home'|'away', asOf?}`. בחלון `recent` המיון לפי תאריך ואז מזהה משחק; החלון נבחר אחרי סינון קבוצה/יריבה/בית. `asOf` חותך תוצאות, לא מוחק משחק מתוכנן מהכיסוי.

**Window:** `{spec, scheduledGames, resultGames, coverageByTeam, transportComplete}`. הכיסוי מקבל הוכחת מחזור מהנתונים המאומתים; הצלחת בקשות בלבד אינה הופכת אותו לשלם.

**Metric:** `{value:number|null, numerator:number|null, denominator:number, gameIds:string[], excludedGameIds:string[], dataState:'ready'|'partial'|'unavailable'}`. `denominator` הוא משחקים בממוצע למשחק וניסיונות באחוז קליעה; `sampleSize` בתובנה נשמר בנפרד כמספר משחקים.

**Snapshot:** `{entityRef, seasonKeys, window, gamesPlayed, wins, losses, metrics, evidence, coverage}`. חישובים לשחקן אינם משתמשים במשחקים שלא הופיע בהם בפועל.

שמות המדדים בממשק: `points`, `opponentPoints`, `margin`, `fieldGoalsMade`, `fieldGoalsAttempted`, `threePointsMade`, `threePointsAttempted`, `freeThrowsMade`, `freeThrowsAttempted`, `fgPercentage`, `threePointPercentage`, `ftPercentage`, `offensiveRebounds`, `defensiveRebounds`, `totalRebounds`, `assists`, `turnovers`, `steals`, `blocks`, `minutesPlayed`, `assistTurnoverRatio`, ומדדי `pointsFastBreak/pointsFromTurnovers/pointsInPaint/pointsSecondChance/pointsBench` הקיימים. ב־Snapshot ערך מדד בסיסי הוא ממוצע למשחק; `numerator` שומר את הסכום הלא מעוגל. רבעים ומאזנים מותנים נשמרים תחת `quarterMargins`, `closeRecord`, `halftimeRecord`, `leadReversals` עם ספירות משחקים משלהם.

**RichInsight:** הרחבת המבנה הקיים עם `family`, `factKey`, `facts`, `metricDefinitions`, `windows[]`, `samples[]`, `coverage[]`, `evidence[]`, `priority`, `text`, `broadcastShort`, `scope`, `seasonKeys`, `teamIds`, `playerRef`, `historicalTeam`. `samples[]` מתאר כל צד בהשוואה; אין מכנה משותף מטעה. המנוע הקיים מותאם למבנה בלי לשנות את עובדותיו.

`samples[] = {entityRef,seasonKeys,gameCount,metricGameCounts}`. עובדות השוואה כוללות `metric`, `value`, `referenceValue`, `difference`; עובדת מאזן כוללת `wins`, `losses`, `total`. סוגי תובנות עשירים רשאים להוסיף עובדות מובנות נוספות, ללא פירוש מספרים מתוך טקסט.

---

### משימה 1 — ערכי מקור וזמינות מדדים

**Files:** שינוי `js/ibba/ibba_adapter.js`; יצירת `tests/metric-availability.test.js`; הרחבת `tests/season-adapter.test.js`; הרחבת fixtures קיימים בלבד בדוגמאות מצומצמות.

**Interfaces:** משחק מוסיף `metricAvailability:{[teamId]:string[]}` ו־`playerObservations:[{playerId,teamId,teamName,stats,availableMetrics,participation:'verified'|'unknown'}]`. רשימת `players` ו־`hasPlayerStats` נשארות עבור תאימות. `stats` בתצפית החדשה מכיל מספר או `null`; דקות חיוביות או מדד משחק מפורש שאינו אפס מאמתים הופעה. רשומת סגל או שורת 0 דקות עם כל מדדי המשחק 0 אינן הוכחת הופעה. נרמול דקות הוא `IBBAAdapter.parseMinutes(value)->number|null`, עם תמיכה במספר דקות או `MM:SS` ושניות 0–59.

- [x] לכתוב בדיקות: `off='4',def='5'` נותנים 9; `pbc=0` זמין רק לקבוצה שבה פורסם; חסר `ast` אינו אפס; שחקן עם נקודות אך בלי חסימות נשמר בתצפיות; רשומת סגל אינה הופעה; `'12:30'` נותן 12.5 ו־`'12:75'` נותן `null`.

```js
assert.strictEqual(Adapter.parseMinutes('12:30'), 12.5);
assert.strictEqual(Adapter.parseMinutes('12:75'), null);
assert.strictEqual(game.teamStats.home.totalRebounds, 9);
assert(!game.metricAvailability[awayId].includes('assists'));
```
- [x] להריץ `node tests/metric-availability.test.js` ולראות כשל על החוזה החדש.
- [x] לממש מיפוי שדות מפורש מתוך `performance[teamId]['0']`, רשומות השחקנים ו־`sp_teams`; לתעד שדות ופירושם ב־`docs/superpowers/plans/2026-10-06-rich-insights-source-metrics.md`. לתקן גם את חיבור מחרוזות הריבאונד במסלול התאימות.
- [x] להריץ את הבדיקה החדשה ואת `node tests/ibba-adapter.test.js` ו־`node tests/season-adapter.test.js`; לצפות PASS, כולל משחק עתידי ללא תוצאה.
- [x] לשמור קומיט `fix: preserve numeric metrics and source availability` של קבצי המשימה בלבד.

### משימה 2 — הקשר משחק עם תוצאות וכיסוי עצמאי

**Files:** שינוי `js/ibba/ibba_match_context.js`; הרחבת `tests/match-context.test.js`, `tests/seasons.test.js` ו־`tests/season-adapter.test.js`.

**Interfaces:** `load(match,{refresh,now})` מוסיף `currentResultGames`, `currentRegularGames`, `currentScheduleGames` ו־`currentCoverageByTeam`; `currentGames` נשאר למסלול V2 עם סטטיסטיקה מלאה. עונות קודמות מוסיפות `coverageByTeam:{[teamId]:{complete,missingRounds,availableRounds}}`; הכיסוי הישן נשמר לתאימות. אין שירות מטמון עונות שני.

- [x] לכתוב בדיקות: תוצאה בלי שחקנים נכנסת ל־`currentResultGames` בלבד; מחזור נדחה נשמר; קבוצה א׳ עם מחזורים 1–4 שלמים אינה חלקית בגלל חוסר בקבוצה ב׳; משחק אחרי `asOf` לא נכנס; מחזור 27 לא מושלם בעונה בת 26 מחזורים; רענון חוזר טוען מחדש גם את הטבלה הסדירה.

```js
assert.strictEqual(context.currentResultGames.length, 1);
assert.strictEqual(context.currentGames.length, 0);
assert.strictEqual(prior.coverageByTeam[teamAId].complete, true);
assert.strictEqual(prior.coverageByTeam[teamBId].complete, false);
```
- [x] להריץ `node tests/match-context.test.js` ולראות כשל בחוזה/כיסוי החדש.
- [x] לממש כיסוי בנפרד לכל קבוצה מתוך מחזורים וסדר משחקים מאומתים. ברענון לבטל פעם אחת את שני וריאנטי העונה ואז להתחיל טעינה רגילה וסדירה במקביל, בלי שאחת תבטל את בקשת האחרת.
- [x] להריץ `node tests/match-context.test.js`, `node tests/seasons.test.js` ו־`node tests/season-adapter.test.js`; לצפות PASS וכיסוי מפורש למשחק חסר.
- [x] לשמור קומיט `feat: expose result windows and per-team coverage`.

### משימה 3 — שירות חישובי חלונות

**Files:** יצירת `js/ibba/ibba_window_stats.js` ו־`tests/window-stats.test.js`; הוספת טעינת המודול ב־`index.html` לפני המנועים החדשים.

**Interfaces:** `IBBAWindowStats.selectGames(games,spec,{transportComplete,coverageByTeam}={}) -> Window`; `team(window,teamId)->Snapshot`; `player(window,playerRef,identity)->Snapshot`; `league(window)->Snapshot`; `pool(snapshots)->Snapshot`. ליגת חלון כוללת את כל הקבוצות, לא רק את שתי הקבוצות שנבחרו. ניקוד הליגה למשחק הוא סכום נקודות הופעות הקבוצות חלקי מספר הופעות הקבוצות, עם תווית ״נקודות למשחק לקבוצה בליגה״.

- [x] לכתוב assertions עם fixtures סינתטיים: 80 ו־100 נקודות נותנים 90; אחוז שלשות מ־1/2 ו־3/10 הוא `100*4/12`, לא 40; 2 משחקים עם סכום 100 ועוד 8 עם סכום 800 נותנים 90 באיחוד; מכנה אפס נותן `null`; משחק כפול לא נספר; תוצאה ללא שחקנים מספיקה לניקוד.

```js
assert.strictEqual(snapshot.metrics.points.value, 90);
assert.strictEqual(snapshot.metrics.threePointPercentage.value, 100 * 4 / 12);
assert.strictEqual(snapshot.metrics.threePointPercentage.denominator, 12);
assert.strictEqual(zeroAttempts.metrics.threePointPercentage.value, null);
```
- [x] להוסיף בדיקות לחלון מחזורים מול חלון כרונולוגי עם משחק נדחה, סינון בית/חוץ לפני בחירת חמשת האחרונים, זהות שחקן שהחליף קבוצה, רבע חסר וריבאונד חסר. להריץ `node tests/window-stats.test.js` ולראות כשל רלוונטי.
- [x] לממש סכומים ומכנים לכל מדד על משחקיו התקפים בלבד: ניקוד/ספיגה/הפרש; קליעות/ניסיונות ו־FG/3PT/FT; ריבאונדים, אסיסטים, איבודים, חטיפות, חסימות, דקות, אסיסטים/איבודים; מדדי `sp_teams` הזמינים. להוסיף מאזן צמוד עד 5 נקודות, יתרון/פיגור במחצית, היפוך תוצאה והפרש רבעים; הארכה אינה מחליפה רבע רביעי.
- [x] להריץ `node tests/window-stats.test.js` ו־`node tests/metric-availability.test.js`; לצפות PASS לערכי הביניים הלא מעוגלים ולמכנים/משחקי המקור.
- [x] לשמור קומיט `feat: calculate verified round and game windows`.

### משימה 4 — מחזורים, השוואות שלב ומומנטום

**Files:** יצירת `js/ibba/ibba_rich_insights.js` ו־`tests/rich-insights.test.js`; שימוש ב־`IBBAWindowStats` ממשימה 3.

**Interfaces:** `IBBARichInsights.generate(context,{playerRefs=[]}={}) -> RichInsight[]`. בחלק זה מפיק משפחות `ROUND` ו־`MOMENTUM`; אינו משנה את הנתונים הפעילים או שולח בקשות. מזהה תובנה יציב מתוך סוג, ישות, עונות, חלונות ומדד.

- [x] לכתוב בדיקות: מחזור 1 עם שתי הופעות היסטוריות 80/100 מפיק ממוצע 90 ומדגם 2; לפני מחזור 10 החלון 1–9 בלבד; 5 אחרונים של 90 לעומת 5 קודמים של 80 נותנים הפרש 10; עם ארבעה משחקים בצד אחד אין תובנת מגמה; אין השוואת ניקוד של 0 משחקים ואין השלמת מחזור חסר.

```js
assert.strictEqual(roundStory.facts.value, 90);
assert.strictEqual(roundStory.samples[0].gameCount, 2);
assert.strictEqual(changeStory.facts.difference, 10);
assert(!fourGameStories.some(s => s.type === 'RECENT_WINDOW_CHANGE'));
```
- [x] להריץ `node tests/rich-insights.test.js` ולראות כשל על המנוע/סוגי התובנות החדשים.
- [x] לממש סוגים: `ROUND_SCORING`, `SAME_STAGE_COMPARISON`, `ROUND_WINDOW_PROFILE`, `WINDOW_VS_LEAGUE`, `RECENT_WINDOW_CHANGE`, `HISTORICAL_WINDOW_COMPARISON`, `WINS_MILESTONE`, `STREAK_REFERENCE`. חלונות: אותו מחזור בעבר; 1 עד N−1; 1–5 ו־6–10 רק לאחר השלמתם; חמשת המחזורים שלפני N; חמשת המשחקים האחרונים מול חמשת הקודמים. שינויים בניקוד, ספיגה, הפרש ומאזן נשמרים כעובדות נפרדות אך יוסרו כפילויות סיפור בהמשך.
- [x] להריץ את הבדיקה החדשה ו־`node tests/historical-insights.test.js`; לצפות PASS לרצפים שאינם מתחברים בין עונות ולליגה מחלון נכון.
- [x] לשמור קומיט `feat: add round and season-development stories`.

### משימה 5 — סגנון, הכרעת משחקים ורבעים

**Files:** הרחבת `js/ibba/ibba_rich_insights.js` ו־`tests/rich-insights.test.js`; תיקון גלאים קיימים ב־`js/ibba/ibba_insights_v2.js` רק אם בדיקות מזהות צריכת אפסים מלאכותיים; הרחבת `tests/insights-regressions.test.js`.

**Interfaces:** `generate` מוסיף משפחות `PROFILE` ו־`DECIDING`; משתמש באותם `Snapshot` ו־`RichInsight`.

- [x] לכתוב בדיקות: 4 ניצחונות צמודים מתוך 6 נשמרים כ־4/6; נתוני מחצית זמינים מפיקים מאזן אחרי יתרון/פיגור; רבע ראשון חסר אינו פוגע במדד רבע רביעי זמין; נתון ספסל מפורש 0 אינו חסר; שתי נקודות אינן נקודות בצבע; אי־זמינות אצל צד אחד מוציאה רק את השוואת המדד הזה.

```js
assert.strictEqual(closeStory.facts.wins, 4);
assert.strictEqual(closeStory.facts.total, 6);
assert(!missingPaintStories.some(s => s.facts.metric === 'pointsInPaint'));
```
- [x] להריץ `node tests/rich-insights.test.js` ו־`node tests/insights-regressions.test.js` ולראות כשל בסוגים החדשים או בזמינות.
- [x] לממש `WINDOW_STYLE`, `MATCHUP_STYLE`, `VENUE_PROFILE`, `CLOSE_GAME_RECORD`, `HALFTIME_RECORD`, `QUARTER_WINDOW`, `LEAD_REVERSAL`, `LATE_GAME_CHANGE`. `MATCHUP_STYLE` משווה ריבאונד התקפה/הגנה, איבודים/חטיפות ונפח שלשות/קליעת יריבות משלוש, כמדדים נפרדים עם יחידות ומכנים — לא כהסתברות לניצחון. רקע היסטורי מסומן בעונתו; שינוי רבעים דורש 5 משחקים בכל חלון.
- [x] להריץ את שתי הבדיקות ו־`node tests/window-stats.test.js`; לצפות PASS, כולל אי־טענה לפיגור מרבי.
- [x] לשמור קומיט `feat: add playing-style and deciding-game stories`.

### משימה 6 — יריבות ושחקנים בכל חלונות העונה

**Files:** הרחבת `js/ibba/ibba_rich_insights.js` ו־`tests/rich-insights.test.js`; שימוש ב־`js/ibba/ibba_player_history.js` הקיים לגישור זהויות.

**Interfaces:** `generate` מוסיף משפחות `MATCHUP` ו־`PLAYERS`. כל סיפור שחקן מקבל `playerRef`, קבוצתו ההיסטורית או רשימת הקבוצות בחלון, ודגימות הופעות מאומתות. רק refs נבחרים או רשימת סגל רשמית מפורשת נכללים; אין חיבור לפי שם.

- [x] לכתוב בדיקות: שחקן במזהה קבוע מול יריבה לאחר מעבר קבוצה; ממוצעי נקודות/ריבאונדים/אסיסטים ו־2 דאבל־דאבלים מתוך 5 הופעות; משחק שבו לא הופיע לא נספר כאפס; חסר ריבאונד אינו דאבל־דאבל; 4 מול 5 הופעות אינם מגמה; שם זהה עם מזהה שונה לא מתחבר.

```js
assert.strictEqual(playerSnapshot.gamesPlayed, 5);
assert.strictEqual(doubleDoubleStory.facts.count, 2);
assert.strictEqual(doubleDoubleStory.facts.total, 5);
assert(!otherIdentityStories.some(s => s.playerRef === selectedRef));
```
- [x] להוסיף בדיקות למפגש בית/חוץ, שני מפגשים שאינם ״מגמה״, שלב לא מאומת שמאפשר עובדת מפגש בלבד, ורצף נוכחי שמצורף לתוצאת עבר בלי להאריך אותו. להריץ `node tests/rich-insights.test.js` ולראות כשל בסוגים החדשים.
- [x] לממש `H2H_WINDOW_PROFILE`, `H2H_VENUE_PROFILE`, `H2H_CHANGE`, `CURRENT_STREAK_HISTORICAL_MATCHUP`, `PLAYER_OPPONENT_PROFILE`, `PLAYER_ROUND_PROFILE`, `PLAYER_WINDOW_CHANGE`, `PLAYER_DOUBLE_DOUBLES`, `PLAYER_CONSISTENCY`, `PLAYER_CONTRIBUTION_CHANGE`. לשמר סיכומים רשמיים, הופעות בודדות והגלאים הקיימים; להשוואת תרומה להשתמש רק במשחקים שבהם נקודות השחקן ונקודות קבוצתו ידועות.
- [x] להריץ `node tests/rich-insights.test.js`, `node tests/player-history.test.js` ו־`node tests/window-stats.test.js`; לצפות PASS לכל זהות ומכנה.
- [x] לשמור קומיט `feat: enrich opponent and player broadcast context`.

### משימה 7 — ניסוחים קצרים ובחירת סיפורים

**Files:** יצירת `js/ibba/ibba_broadcast_copy.js` ו־`tests/broadcast-copy.test.js`; שינוי `js/ibba/ibba_historical_insights.js`, `js/ibba/ibba_player_history.js`, `js/ibba/ibba_broadcast_report.js`, `index.html`; הרחבת `tests/broadcast-report.test.js`.

**Interfaces:** `IBBABroadcastCopy.format(insight,{variant=0}={}) -> string`, `formatNumber(value,{percent=false}={}) -> string`. `IBBABroadcastReport.compose(report,playerRefs)` מוסיף `allInsights` ו־`families`, ומשמר `historicalInsights`, `insightsV2` ו־`topStories` לתאימות. `factKey` מסיר כפילויות גם כשהסוג/הטקסט שונה.

- [x] לכתוב בדיקות: הטקסטים אינם כוללים ״לפי האיגוד״ או ״סיכום תוצאות משחקי האיגוד״; נשמרת עונת עבר וקבוצה; כל variant משמר 90/80 והפרש 10; החסר אינו מודפס כ־0; שתי תובנות על אותה עובדה אינן שני כרטיסים; שתי קבוצות עם סיפורים תקפים מופיעות ב־topStories; שלושה סיפורים אינם הופכים לשמונה.

```js
assert(!Copy.format(story).includes('לפי האיגוד'));
assert(Copy.format(story).includes('2025/26'));
assert.strictEqual(Report.selectTopStories(threeDistinctStories).length, 3);
assert.strictEqual(deduplicated.filter(s => s.factKey === story.factKey).length, 1);
```
- [x] להריץ `node tests/broadcast-copy.test.js` ו־`node tests/broadcast-report.test.js` ולראות כשל על הניסוח והאיחוד.
- [x] לממש ניסוחים עובדתיים קצרים מתוך `facts` בלבד. תעדוף: עובדה רלוונטית למחזור/יריבה, שינוי תקף, מדגם וכיסוי; לבחור עד 8 תוך גיוון משפחות ושני הצדדים, ללא סימולציית תחזית. לשמור את כל הסיפורים התקפים ב־`allInsights`. החלפת ניסוח מרכיבה מחדש את הדוח ואינה מסירה ראיות.
- [x] להריץ את הבדיקות החדשות ו־`node tests/historical-insights.test.js` ו־`node tests/season-ui.test.js`; לצפות PASS גם בעת רענון עם מקור חלקי.
- [x] לשמור קומיט `feat: produce fluent and balanced broadcast stories`.

### משימה 8 — חיפוש שחקנים מאוחד ופירוט לפי עונות

**Files:** שינוי `js/ibba/ibba_history_view.js`, `js/ibba/ibba_player_history.js` ופעולות הוספה/הסרה ב־`index.html`; יצירת `tests/history-view.test.js`; הרחבת `tests/season-ui.test.js`.

**Interfaces:** `historyService.groupRecords(records)->[{playerRef,name,seasons,teams,records}]` הוא מתודת מופע של `IBBAPlayerHistory` ומשתמש ב־`identity` ובגישורים של אותו שירות; `IBBAHistoryView` שומר `query`, `page`, `selected` ו־refs שנבחרו לדוח. `setBroadcastSelection(refs,{ready})` מעדכן רשימת שחקנים נבחרים וזמינות פעולות. `context({selectedRefs}={})` מאפשר לקבל רשומות נבחרות ללא תלות בחיפוש התצוגה.

- [x] לכתוב בדיקות: שתי עונות של שחקן הן שורת חיפוש אחת; שתי קבוצות באותה עונה נשארות בפירוט; שני שחקנים בשם זהה אינם מתאחדים; 26 זהויות נותנות 25 בעמוד ראשון ואחת בשני; ברירת המחדל מציגה בחירות ולא 538 רשומות; אין כותרת ״מקור״ בטבלה.

```js
assert.strictEqual(historyService.groupRecords(twoSeasonRecords).length, 1);
assert.strictEqual(historyService.groupRecords(twoSeasonRecords)[0].records.length, 2);
assert.strictEqual(firstPagePlayers.length, 25);
assert.strictEqual(secondPagePlayers.length, 1);
assert(!visibleHeaders.includes('מקור'));
```
- [x] להוסיף בדיקות לפוקוס חיפוש/עימוד, הוספה לפני שהדוח מוכן, גישור שחקן שמסתיים אחרי החלפת משחק ומצב הצלחה לאחר הוספה/הסרה. להריץ `node tests/history-view.test.js` ולראות כשל על התצוגה/החוזה.
- [x] לממש קיבוץ לפי identity רשמי; חיפוש בשם או בקבוצה היסטורית, עמוד של 25, פתיחת פירוט עונה/קבוצה, מקורות בפרטים מתקפלים ופעולות מקלדת עם `aria-live`. שגיאת גישור נשארת מקומית; כשל אינו מאפשר איחוד לפי שם. אין טבלת ענק או בורר של מאות אפשרויות כברירת מחדל.
- [x] להריץ `node tests/history-view.test.js`, `node tests/player-history.test.js` ו־`node tests/season-ui.test.js`; לצפות PASS לשימור בחירות ומיקוד.
- [x] לשמור קומיט `feat: make player history searchable and compact`.

### משימה 9 — מסך הדוח וייצוא מאותה תמונת נתונים

**Files:** שינוי `index.html` ו־`js/ibba/ibba_broadcast_report.js`; יצירת `tests/rich-broadcast-integration.test.js`; הרחבת `tests/season-ui.test.js` ו־`tests/broadcast-report.test.js`.

**Interfaces:** `renderBroadcastReport(report)` מציג topStories ועד שש קבוצות ב־״כל התובנות״ עם סינון משפחה. `IBBABroadcastReport.exportRows(report)` צורך `allInsights`, החלונות/המדגמים של כל צד ומצב המקורות. היסטוריה לייצוא נלקחת מ־`report.selectedPlayerRefs` ו־`report.context.playerSummaries`, ולא מהחיפוש החי או מכל רשומות המאגר.

- [x] לכתוב בדיקות שילוב: מחזור 1 בלי ניתוח עונתי מציג ממוצע עבר; מחזור 2 עם משחק תוצאה בלבד; מחזור 10 עם חלונות ו־V2; מחזור 25 עם עונה חסרה. בדיקות ייצוא משוות טקסט, עובדות, שני מכנים, עונות, טווחים ומקורות למסך; שחקן שלא נבחר אינו נכלל.

```js
assert(report.allInsights.some(s => s.type === 'ROUND_SCORING'));
assert.strictEqual(report.currentSeason, null); // מחזור 1 ללא סטטיסטיקה נוכחית
assert(exportRows.some(row => row.includes(report.topStories[0].text)));
assert(!exportedPlayerRefs.includes(unselectedPlayerRef));
```
- [x] להוסיף בדיקות: ייצוא בעת טעינת היסטוריה מציין טעינה; שינוי משחק/עונה/ניסוח אחרי תחילת יצירת XLSX אינו משנה את הקובץ; רענון כושל מסומן, ללא כרטיס המציג נתון ישן כחדש. להריץ `node tests/rich-broadcast-integration.test.js` ולראות כשל רלוונטי.
- [x] לחבר את השירותים בסדר `adapter/context → window_stats → rich_insights/copy → report`, לשמר מסכי הכנה עונתיים ומזהי טעינה. לכל מדגם/כיסוי תג קצר, עם ראיות מתקפלות; אין חזרה על הסבר המקור במשפט. הייצוא שומר את אותה תמונת דוח לפני כל await ומפרט רק שחקנים נבחרים.
- [x] להריץ `node tests/rich-broadcast-integration.test.js`, `node tests/season-ui.test.js` ו־`node tests/broadcast-report.test.js`; לצפות PASS גם לתגובות מאוחרות.
- [x] לשמור קומיט `feat: integrate complete insights and matching Excel export`.

### משימה 10 — אימות מלא, דוגמאות מקור ומסירה

**Files:** שינוי `package.json`; יצירת `docs/superpowers/plans/2026-10-06-rich-insights-qa.md`; עדכון מסמך מיפוי המקור ממשימה 1 וסימון התכנית.

- [x] לצרף את שש קבוצות הבדיקות החדשות ל־`npm test`; להריץ `npm run check`. לצפות PASS לכל הבדיקות ולתחביר הקבצים והסקריפט הפנימי ב־HTML. Windows עשוי לדרוש אישור sandbox להפעלת תהליכי Node בבדיקת התחביר; אין שינוי הרשאות האפליקציה.
- [x] לאמת לפחות דוגמה רשמית לכל מדד חדש שמופיע בדוח, לרבות שדות בסיסיים/מתקדמים ודקות, ממוצע מחזור משתי עונות, חלון מאוחר, אחוז משוקלל ושחקן שעבר קבוצה. לתעד נתונים חסרים; מדד לא מאומת לא יוצג.
- [x] לבדוק מקומית בדפדפן את שלוש העונות, מחזורים 1/2/10/25, חיפוש 26+ שחקנים ועימוד, הוספה/הסרה, שינוי ניסוח, מעבר מהיר, כשל וניסיון חוזר. תרחישי תוצאות 2026/27 משתמשים ב־fixtures מסומנים כל עוד אין תוצאות חיות. לא להשאיר החלפות שירות או נתוני בדיקה בדפדפן בסיום.
- [x] לבדוק RTL, מקלדת, רוחב 390 פיקסלים, גלילה פנימית בפירוט וחוברת XLSX שנקראת בחזרה עם RTL ותוכן תואם. לשמור צילומי מסך בדוח QA, ולהבחין בין יצירת הקובץ לבין הורדתו בפועל אם כלי הדפדפן אינו מספק אישור הורדה.
- [x] לבצע סקירה עצמאית של כלל השינוי, לתקן ממצאים מהותיים עם בדיקת RED→GREEN ולהריץ את הבדיקות הרלוונטיות מחדש. לתעד היקף, מגבלות מקור, בדיקות וממצאים; לשמור קומיט `test: verify full broadcast insights and document local QA`.

## מסירת התכנית

מצב: כל עשר המשימות הושלמו מקומית לאחר אישור המשתמש. בוצע רצף באמצעות `superpowers:executing-plans`, בדיקות RED→GREEN וסקירה עצמאית. ממצאים, החלטות ומגבלות מפורטים ב־[דוח QA](2026-10-06-rich-insights-qa.md).

בדיקת סיום: `npm run check` עבר בכל 18 קבוצות הבדיקה; תחביר 51 קובצי JavaScript וסקריפט HTML אחד עבר. שלוש העונות, מחזורים מוקדמים ומאוחרים, כשל והתאוששות, מקלדת, RTL ותוכן XLSX נבדקו מקומית. פרסום האתר נשאר שלב נפרד.
