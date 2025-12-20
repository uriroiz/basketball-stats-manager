# תיקון תאריך קובץ Excel

## הבעיה
קובץ האקסל מכניס תאריך יצירת הקובץ (היום) ולא תאריך המשחק.

## הפתרון
1. שמירת מידע המשחק (כולל תאריך) בזמן analyzeGame
2. גישה למידע זה ב-exportInsightsToExcel
3. שימוש בתאריך המשחק במקום new Date()

## יישום

### שלב 1: הוספת פונקציה לחיפוש משחק
בindex.html, נוסיף פונקציה שתחפש משחק לפי קבוצות:

```javascript
function findGameByTeams(homeTeam, awayTeam) {
  // חיפוש בכל המשחקים
  if (!allGames || allGames.length === 0) return null;
  
  const game = allGames.find(g => 
    g.homeTeam === homeTeam && g.awayTeam === awayTeam
  );
  
  return game;
}
```

### שלב 2: שמירת המשחק ב-currentAdvancedReport
ב-performAdvancedAnalysis, נוסיף את המשחק המלא:

```javascript
const game = findGameByTeams(homeTeam, awayTeam);
currentAdvancedReport = report;
currentAdvancedReport.gameInfo = game; // הוספה
```

### שלב 3: שימוש בתאריך המשחק ב-exportInsightsToExcel
```javascript
// במקום:
const now = new Date();

// נשתמש ב:
let dateToUse;
if (currentAdvancedReport.gameInfo && currentAdvancedReport.gameInfo.date) {
  dateToUse = new Date(currentAdvancedReport.gameInfo.date);
} else {
  dateToUse = new Date(); // fallback
}
```






