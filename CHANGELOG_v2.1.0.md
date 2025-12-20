# 📋 Change Log - גרסה 2.1.0

## 🆕 מה חדש

### סטטיסטיקות מתקדמות
נוספו 6 סטטיסטיקות חדשות מ-IBBA API:

| סטטיסטיקה | שדה | תיאור |
|-----------|-----|-------|
| **נק' התקפה מתפרצת** | `pointsFastBreak` | נקודות מהתקפות מהירות |
| **נק' מאיבודים** | `pointsFromTurnovers` | נקודות כתוצאה מאיבודים של היריבה |
| **נק' בצבע** | `pointsInPaint` | נקודות שנקלעו מתוך הצבע |
| **נק' הזדמנות שנייה** | `pointsSecondChance` | נקודות מריבאונד התקפי |
| **נק' הספסל** | `pointsBench` | נקודות משחקני ספסל |
| **Permalink** | `permalink` | קישור למשחק באתר IBBA |

---

## 🎯 5 Insights חדשים

### 1. ⚡ Fast Break Kings
- **תנאי:** 15+ נק' למשחק מהתקפות מתפרצות
- **קטגוריה:** OFFENSE
- **חשיבות:** HIGH
- **דוגמה:** "מכבי אשדוד (מקום 2 בליגה בהתקפות מתפרצות) מלכת ההתקפות המתפרצות! 18.5 נק' למשחק מהתקפות מהירות"

### 2. 🎯 Paint Dominance
- **תנאי:** 45%+ מהנקודות מתוך הצבע
- **קטגוריה:** OFFENSE
- **חשיבות:** HIGH
- **דוגמה:** "הפועל חיפה (מקום 1 בליגה בנקודות בצבע) שולטת בצבע - 52% מהנקודות מתוך הצבע (42.3 נק' למשחק)"

### 3. 🪑 Bench Power
- **תנאי:** 30+ נק' למשחק מהספסל
- **קטגוריה:** OFFENSE
- **חשיבות:** MEDIUM
- **דוגמה:** "מכבי תל אביב (מקום 1 בליגה בתרומת ספסל) עם ספסל חזק! 35.2 נק' למשחק מהספסל (38% מהנקודות)"

### 4. 💰 Turnover Capitalization
- **תנאי:** 18+ נק' למשחק מאיבודים של היריבה
- **קטגוריה:** DEFENSE
- **חשיבות:** HIGH
- **דוגמה:** "הפועל ירושלים (מקום 1 בליגה בניצול איבודים) מנצלת טעויות - 22.1 נק' למשחק מאיבודים של היריבה!"

### 5. 🔄 Second Chance Masters
- **תנאי:** 15+ נק' למשחק מהזדמנות שנייה
- **קטגוריה:** OFFENSE
- **חשיבות:** MEDIUM
- **דוגמה:** "אליצור יבנה (מקום 3 בליגה בהזדמנות שנייה) לא מוותרת - 16.8 נק' למשחק מהזדמנות שנייה!"

---

## 📝 קבצים שעודכנו

### `js/ibba/ibba_adapter.js`
- ✅ הוסף שדה `permalink` לכל משחק
- ✅ הוסף 6 שדות מתקדמים ל-`normalizeTeamStats`
- ✅ עדכן `extractTeamStats` לקרוא מ-`sp_teams`

### `js/ibba/ibba_analytics.js`
- ✅ הוסף accumulation של 5 סטטיסטיקות מתקדמות
- ✅ הוסף ממוצעים: `fastBreakPpg`, `paintPpg`, `benchPpg`, `pointsFromToPpg`, `secondChancePpg`
- ✅ הוסף סכומים ל-Insights: `_totalPointsFastBreak`, `_totalPointsInPaint`, וכו'

### `js/ibba/ibba_insights_v2.js`
- ✅ הוסף 5 פונקציות detect חדשות
- ✅ שילוב ב-`generateMatchupInsights`
- ✅ עדכן הערת גרסה ל-2.1.0

### `game_prep_pure_api.html`
- ✅ הוסף מספר גרסה בכותרת: "גרסה 2.1.0 - סטטיסטיקות מתקדמות"

---

## 🧪 איך לבדוק

### בדיקה 1: וודא שהנתונים מגיעים

פתח קונסול בדפדפן ב-`game_prep_pure_api.html`:

```javascript
// טען משחק
const adapter = new IBBAAdapter();
const game = await adapter.fetchGame(1199028);
const converted = adapter.convertToInternalFormat(game);

// בדוק סטטיסטיקות מתקדמות
console.log('🆕 Advanced Stats:', {
  permalink: converted.permalink,
  home: {
    fastBreak: converted.teamStats.home.pointsFastBreak,
    paint: converted.teamStats.home.pointsInPaint,
    turnovers: converted.teamStats.home.pointsFromTurnovers,
    secondChance: converted.teamStats.home.pointsSecondChance,
    bench: converted.teamStats.home.pointsBench
  }
});
```

**תוצאה צפויה:**
```javascript
{
  permalink: "https://ibasketball.co.il/match/741628/",
  home: {
    fastBreak: 22,
    paint: 56,
    turnovers: 17,
    secondChance: 11,
    bench: 23
  }
}
```

### בדיקה 2: בדוק Insights

```javascript
// אחרי טעינת משחקים
const report = await window.buildReport('מכבי אשדוד', 'אליצור יבנה');

// חפש Insights חדשים
const newInsights = Object.values(report.categorizedInsights)
  .flat()
  .filter(i => ['FAST_BREAK_KINGS', 'PAINT_DOMINANCE', 'BENCH_POWER', 
                'TURNOVER_CAPITALIZATION', 'SECOND_CHANCE_MASTERS']
                .includes(i.type));

console.log('🆕 New Insights Found:', newInsights.length);
newInsights.forEach(i => console.log(`  ${i.icon} ${i.text}`));
```

---

## ⚠️ בעיות אפשריות ופתרונות

### בעיה: "לא רואה Insights חדשים"

**פתרון 1: רענן את הדפדפן**
```
Ctrl + Shift + R (Windows)
Cmd + Shift + R (Mac)
```

**פתרון 2: נקה Cache**
1. פתח Developer Tools (F12)
2. לחץ ימני על כפתור Refresh
3. בחר "Empty Cache and Hard Reload"

**פתרון 3: בדוק שהנתונים מגיעים**
```javascript
// בדוק אם יש נתונים
const teamAvg = window.analytics.getTeamAverages().find(t => t.teamName === 'מכבי אשדוד');
console.log('Advanced Stats:', {
  fastBreakPpg: teamAvg.fastBreakPpg,
  paintPpg: teamAvg.paintPpg,
  benchPpg: teamAvg.benchPpg
});
```

### בעיה: "הסטטיסטיקות הן 0"

זה תקין אם:
- המשחקים ישנים (לפני שה-API התחיל לספק את הנתונים)
- הקבוצה לא עברה את הסף המינימלי

---

## 📊 סטטיסטיקות גרסה

- **סה"כ Insights במערכת:** 49 (44 קיימים + 5 חדשים)
- **סה"כ קטגוריות:** 8
- **סה"כ סטטיסטיקות מתקדמות:** 6
- **גרסה:** 2.1.0
- **תאריך:** {{ TODAY }}










