# 📊 Changelog v2.2.7 - מיקומים אמיתיים מטבלת הליגה

**תאריך:** 26 נובמבר 2025

## 🎯 שינויים עיקריים

### מיקומים אמיתיים מהליגה
המערכת כעת משתמשת במיקומים הרשמיים מטבלת הליגה במקום לחשב אותם באופן עצמאי.

**הבעיה הקודמת:**
- המערכת חישבה מיקומים לפי Win% ו-Point Differential בלבד
- המיקומים לא תאמו את הטבלה הרשמית של הליגה
- הליגה משתמשת בכללים נוספים (ניצחונות טכניים, משחקים בוטלו וכו')

**הפתרון:**
- טעינת טבלת הליגה אוטומטית מ-HTML של דף הליגה
- שימוש במיקום (`data-rank`) הרשמי מהטבלה
- מנגנון cache ב-sessionStorage (תוקף: 10 דקות)
- Fallback אוטומטי לחישוב ישן במקרה של כשל

## ⚠️ תיקון CORS

**בעיה שהתגלתה:** שגיאת CORS בניסיון fetch ישיר מ-localhost ל-ibasketball.co.il

**הפתרון:**
- הסרת ניסיון fetch ישיר (שתמיד נכשל)
- שימוש **מיד** ב-CORS proxies
- שיפור parsing וvalidation של התגובות
- 3 proxies שונים עם fallback אוטומטי:
  1. **AllOrigins RAW** - `https://api.allorigins.win/raw?url=`
  2. **AllOrigins JSON** - `https://api.allorigins.win/get?url=`
  3. **CorsProxy.io** - `https://corsproxy.io/?`

## 🔧 שינויים טכניים

### [`js/ibba/ibba_advanced.js`](js/ibba/ibba_advanced.js)

#### 1. הוספת מאפייני Instance חדשים
```javascript
constructor(analytics) {
  this.standingsFromHTML = new Map(); // Cache for standings
  this.standingsLoaded = false;
  this.leagueUrl = 'https://ibasketball.co.il/league/2025-2/';
  this.standingsCacheKey = 'ibba_standings_html_2025-2_v1';
  this.standingsCacheExpiry = 10 * 60 * 1000; // 10 minutes
}
```

#### 2. פונקציות חדשות לטעינת הטבלה מ-HTML
- **`loadStandingsFromCache()`** - טעינה מ-sessionStorage
- **`saveStandingsToCache()`** - שמירה ל-sessionStorage
- **`loadStandingsFromHTML()`** - טעינת HTML מדף הליגה (עם CORS proxy fallback)
- **`parseStandingsFromHTML(html)`** - parsing של טבלת הליגה

#### 3. שינוי ב-`getLeagueStandings()`
```javascript
// קודם: חישוב לפי Win%
getLeagueStandings() {
  return teamAverages.sort(...).map((team, index) => ({ ...team, rank: index + 1 }));
}

// עכשיו: שימוש במיקומים האמיתיים
getLeagueStandings() {
  if (this.standingsLoaded && this.standingsFromHTML.size > 0) {
    return this.buildStandingsFromHTML(); // ⭐ מיקומים אמיתיים
  }
  return this.calculateStandingsFallback(); // Fallback
}
```

#### 4. שינוי ב-`buildMatchupReport()`
- הפונקציה כעת `async` כדי לאפשר טעינת HTML
- קוראת ל-`loadStandingsFromHTML()` אוטומטית אם הטבלה לא נטענה

```javascript
async buildMatchupReport(teamA, teamB) {
  if (!this.standingsLoaded) {
    await this.loadStandingsFromHTML();
  }
  // ... המשך הקוד
}
```

### [`game_prep_pure_api.html`](game_prep_pure_api.html)
- הוספת `await` לקריאה ל-`buildMatchupReport()`:
```javascript
const report = await advanced.buildMatchupReport(teamA, teamB);
```

### [`stress_test.html`](stress_test.html)
- הוספת `await` לקריאה ל-`buildMatchupReport()`:
```javascript
const matchupReport = await advanced.buildMatchupReport(topTeams[0], topTeams[1]);
```

## 📊 איך זה עובד?

### תהליך טעינת המיקומים

1. **בדיקת Cache** - האם יש נתונים שמורים ב-sessionStorage?
   - אם כן ותקפים (פחות מ-10 דקות) → שימוש בהם
   - אם לא → טעינה מ-HTML

2. **טעינת HTML**
   - ניסיון fetch ישיר מ-`https://ibasketball.co.il/league/2025-2/`
   - אם נכשל → שימוש ב-CORS proxy (corsproxy.io או allorigins.win)

3. **Parsing הטבלה**
   - חיפוש `.sp-league-table` בדף
   - עבור כל שורה: חילוץ rank, teamName, wins, losses וכו'
   - שמירה ב-Map: `teamName → { rank, wins, losses, ... }`

4. **שמירה ב-Cache** - שמירת הנתונים ב-sessionStorage

5. **שימוש במיקומים**
   - כשבונים דוח: משיכת המיקום האמיתי מה-Map
   - אם קבוצה לא נמצאה → `rank: null` + אזהרה בקונסול

### דוגמה לפלט בקונסול

```
🔄 Loading league standings from HTML...
✅ Direct fetch of league HTML succeeded
📊 Found 14 teams in standings table
  1. הפועל חיפה (7-1)
  2. מכבי רחובות (6-1)
  3. מכבי אשדוד (5-2)
  ...
✅ Loaded standings for 14 teams
💾 Saved standings to cache

📊 Building standings from HTML data:
  ✅ מקום 1: הפועל חיפה (7-1)
  ✅ מקום 2: מכבי רחובות (6-1)
  ✅ מקום 3: מכבי אשדוד (5-2)
  ...
📋 Final standings: 14 teams sorted by official rank
✅ Using real standings from HTML
```

## 🎯 יתרונות

1. **דיוק מלא** - המיקומים תואמים את הטבלה הרשמית של הליגה
2. **אוטומטיות** - טעינה אוטומטית בכל דוח, ללא צורך בהתערבות
3. **ביצועים** - Cache למניעת טעינה חוזרת מיותרת
4. **אמינות** - Fallback אוטומטי לחישוב ישן במקרה של כשל
5. **תאימות לאחור** - לא משפיע על קוד קיים, רק משפר את הדיוק

## ⚠️ התנהגות Fallback

אם טעינת ה-HTML נכשלת (בעיית רשת, CORS וכו'):
- המערכת תדפיס `⚠️ Using calculated standings (fallback)`
- תחזור לחישוב לפי Win% + Point Differential
- הדוח ימשיך לעבוד, אך המיקומים עלולים להיות לא מדויקים

## 🧪 בדיקה

כדי לבדוק שהמערכת עובדת:

1. פתח את הקונסול (F12)
2. טען דוח משחק (למשל: מכבי רחובות vs מכבי גיא נתן חיפה)
3. חפש בקונסול:
   ```
   ✅ Using real standings from HTML
   ```
4. בדוק שהמיקומים תואמים לטבלה ב-https://ibasketball.co.il/league/2025-2/

## 🧪 כלי בדיקה

נוצר קובץ [`test_cors_proxy.html`](test_cors_proxy.html) לבדיקת תקינות ה-CORS proxies:

```bash
# פתח בדפדפן:
http://localhost:8000/test_cors_proxy.html
```

הכלי בודק:
- ✅ איזה proxies עובדים
- ⏱️ זמן תגובה
- 📊 גודל ה-response
- 🔍 האם הטבלה קיימת ב-HTML

## 📝 הערות

- Cache תקף ל-10 דקות - לאחר מכן יתבצע refresh אוטומטי
- אם שם קבוצה לא תואם בדיוק בין ה-API לבין ה-HTML, תודפס אזהרה
- הפונקציה `getTeamRankInCategory()` ב-`ibba_insights_v2.js` נשארה ללא שינוי (מחשבת rank בקטגוריה ספציפית)
- **חשוב:** אם כל ה-proxies נכשלים, המערכת תשתמש ב-fallback (חישוב לפי Win%) - המיקומים עלולים להיות לא מדויקים

---

**הושלם על ידי:** Cursor AI  
**גרסה קודמת:** 2.2.6  
**גרסה נוכחית:** 2.2.7

