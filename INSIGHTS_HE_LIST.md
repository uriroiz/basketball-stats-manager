## IBBA Insights – רשימת ניסוחים בעברית (Generated)

- מקור טמפלטים: `C:/Scripts/League_Stats/js/ibba/ibba_insights_templates.js`
- מקור טקסטים קשיחים: `C:/Scripts/League_Stats/js/ibba/ibba_insights_v2.js`

## 1) טמפלטים דינמיים (8 וריאציות לכל סוג)

### קטגוריה: `player`

- **ASSIST_MACHINE**
  - (1) `${playerName} מוביל באסיסטים: ${apg} מסירות מדויקות למשחק`
  - (2) `${playerName} מחלק כדורים: ${apg} אסיסטים בממוצע לערב`
  - (3) `מנהל המשחק הבולט: ${playerName} עם ${apg} אסיסטים`
  - (4) `הפליימייקר ${playerName} רושם ${apg} אסיסטים למשחק בממוצע`
  - (5) `${playerName} מפעיל את כולם: עם ממוצע ${apg} אסיסטים לערב`
  - (6) `${playerName} עם ממוצע מרשים של ${apg} אסיסטים למשחק`
  - (7) `המוח מאחורי ההתקפה: ${playerName} עם ${apg} מסירות מפתח בממוצע`
  - (8) `${playerName} מעורב בכל סל: ${apg} אסיסטים למשחק בממוצע`

- **DOUBLE_DOUBLE_MACHINE**
  - (1) `${playerName} עקבי מאוד: ${doubleDoubles} דאבל-דאבלים ב-${games} משחקים`
  - (2) `מכונת דאבל-דאבל: ${playerName} עם ${doubleDoubles}/${games} דאבל-דאבל`
  - (3) `${playerName} ממלא סטטים - ${doubleDoubles} דאבל-דאבלים ב-${games} משחקים`
  - (4) `${playerName} מצטיין בעקביות: ${doubleDoubles}/${games} דאבל-דאבל`
  - (5) `${playerName} תורם בכל דרך - ${doubleDoubles} דאבל-דאבלים בעונה`
  - (6) `עקביות מרשימה: ${playerName} עם ${doubleDoubles} דאבל-דאבלים ב-${games} משחקים`
  - (7) `${playerName} שחקן השלם - ${doubleDoubles}/${games} דאבל-דאבל`
  - (8) `כוח עבודה: ${playerName} עם ${doubleDoubles} דאבל-דאבלים ב-${games} משחקים`

- **REBOUND_MACHINE**
  - (1) `${playerName} שולט מתחת לסלים עם ${rpg} כדורים חוזרים למשחק`
  - (2) `${playerName} מוביל בכדורים חוזרים: ${rpg} למשחק בממוצע`
  - (3) `הריבאונדר המרכזי ${playerName} גובה ${rpg} כדורים חוזרים לערב`
  - (4) `${playerName} אחד הטובים מתחת לסלים: ${rpg} כדורים חוזרים בממוצע`
  - (5) `העוגן בצבע: ${playerName} עם ${rpg} כדורים חוזרים למשחק`
  - (6) `${playerName} עם ממוצע גבוה של ${rpg} כדורים חוזרים לערב`
  - (7) `${playerName} דומיננטי בצבע ורושם ${rpg} ריבאונדים בממוצע`
  - (8) `${playerName} חוטף הכל: ${rpg} כדורים חוזרים למשחק בממוצע`

- **SUPER_SUB**
  - (1) `${playerName} עולה מהספסל של ${teamName} ומוסיף ${ppg} נק' בממוצע`
  - (2) `מחליף זהב: ${playerName} (${teamName}) עם ${ppg} נק' למשחק`
  - (3) `${teamName} נהנית מ-${playerName} שמייצר ${ppg} נק' כמחליף`
  - (4) `${playerName} - מחליף מפתיע של ${teamName} עם ${ppg} נקודות בממוצע`
  - (5) `שחקן השישי של ${teamName}: ${playerName} מוסיף ${ppg} נק'`
  - (6) `${teamName}: ${playerName} עולה מהספסל ומתפוצץ עם ${ppg} נק'`
  - (7) `מחליף איכותי ב-${teamName} - ${playerName} (${ppg} נק' למשחק)`
  - (8) `${playerName} של ${teamName}: ${ppg} נקודות כשחקן ספסל`

- **TEAM_LEADER**
  - (1) `${playerName} מוביל את ${teamName} עם ${ppg} נק' למשחק${pctText}`
  - (2) `הכוכב של ${teamName}: ${playerName} עם ${ppg} נק' בממוצע${pctText}`
  - (3) `${playerName} סוחב את ${teamName} - ${ppg} נק' למשחק${pctText}`
  - (4) `${playerName} המנוע של ${teamName}: ${ppg} נק' למשחק${pctText}`
  - (5) `${playerName} הקלף המנצח של ${teamName} - ${ppg} נק' בממוצע${pctText}`
  - (6) `מוביל ההתקפה: ${playerName} של ${teamName} עם ${ppg} נק' למשחק${pctText}`
  - (7) `${playerName} הכתובת של ${teamName} - ${ppg} נק' בממוצע${pctText}`
  - (8) `הכוכב המוביל: ${playerName} עם ${ppg} נק' למשחק${pctText}`

### קטגוריה: `streaks`

- **AWAY_STRUGGLE**
  - (1) `${teamName} מתקשים בחוץ - ${wins} נצחונות מ-${games} משחקים (${pct}%)`
  - (2) `בעיית החוץ של ${teamName}: רק ${wins}-${losses} הרחק מהבית`
  - (3) `${teamName} לא מוצאים את עצמם בחוץ - ${pct}% נצחונות`
  - (4) `קשה ל-${teamName} לנצח בחוץ: ${wins}-${losses} השנה`
  - (5) `${teamName} עם מאזן חוץ חלש: ${wins} נצחונות מ-${games}`
  - (6) `ההרחקה מהבית לא עושה טוב ל-${teamName}: ${pct}% נצחונות`
  - (7) `${teamName} צריכים לשפר בחוץ - רק ${wins}-${losses}`
  - (8) `מאזן חוץ בעייתי ל-${teamName}: ${wins}-${losses} (${pct}%)`

- **AWAY_WIN_EFFICIENT**
  - (1) `${teamName} יודעים לנצח בחוץ גם עם מעט נקודות - ${ppg} נק' (ממוצע: ${leagueAvg})`
  - (2) `יעילות בחוץ: ${teamName} מנצחים עם ${ppg} נק' (${diff} פחות מהממוצע)`
  - (3) `${teamName} מנצחים צמוד בחוץ: ${ppg} נק' בממוצע`
  - (4) `ניצחונות יעילים בחוץ: ${teamName} עם ${ppg} נק' (ליגה: ${leagueAvg})`
  - (5) `${teamName} לא צריכים הרבה כדי לנצח בחוץ: ${ppg} נק'`
  - (6) `ניצחונות צמודים בחוץ: ${teamName} ${ppg} נק' בממוצע`
  - (7) `${teamName} משחקים חכם בחוץ - ${ppg} נק' מספיקים לנצח`
  - (8) `יעילות התקפית בחוץ: ${teamName} מנצחים עם ${ppg} נק' בממוצע`

- **BLOWOUT_WINS**
  - (1) `${teamName} בדומיננטיות מלאה: השיגה ${blowouts} ניצחונות בהפרש גדול ב-5 המשחקים האחרונים`
  - (2) `${teamName} ניצחה ${blowouts} פעמים בהפרש משמעותי מתוך 5 האחרונים`
  - (3) `כוח מרשים: ${teamName} עם ${blowouts} ניצחונות של 15+ נקודות ב-5 המשחקים האחרונים`
  - (4) `${teamName} מנצחת ובגדול – ${blowouts} ניצחונות משכנעים ב-5 מחזורים`
  - (5) `הצהרת כוונות: ${teamName} רשמה ${blowouts} ניצחונות ב-15+ נקודות לאחרונה`
  - (6) `${teamName} השיגה ${blowouts} ניצחונות דומיננטיים ב-5 המשחקים האחרונים`
  - (7) `יכולת דומיננטית: ${teamName} ניצחה ${blowouts} פעמים בהפרש דו-ספרתי גבוה`
  - (8) `${teamName} מציגה עוצמה התקפית – ${blowouts} ניצחונות גדולים ב-5 האחרונים`

- **CLUTCH_WINS**
  - (1) `${teamName} ברצף של ${clutchWins} ניצחונות צמודים - יודעת לסגור משחקים`
  - (2) `${teamName} חזקה במשחקים צמודים: ${clutchWins} ניצחונות ברצף`
  - (3) `${teamName} יודעת לנצח צמוד - ${clutchWins} ברצף בהפרש קטן`
  - (4) `${teamName} עם ${clutchWins} ניצחונות צמודים ברצף (עד 5 נק')`
  - (5) `${teamName} מנצחת במשחקים קרובים - ${clutchWins} ברצף`
  - (6) `עצבים של פלדה: ${teamName} זכתה ${clutchWins} פעמים ברצף במשחקים צמודים`
  - (7) `${teamName} על רצף קלאץ' - ${clutchWins} ניצחונות צמודים`
  - (8) `יכולת ביצוע גבוהה: ${teamName} עם ${clutchWins} ניצחונות צמודים ברצף`

- **HOME_FORTRESS**
  - (1) `${teamName} מבצר בבית - ${wins}-${losses} השנה (${pct}%)`
  - (2) `קשה לנצח את ${teamName} אצלם: ${pct}% נצחונות בבית`
  - (3) `${teamName} כמעט בלתי מנוצחים בבית (${wins}-${losses})`
  - (4) `היתרון הביתי של ${teamName} אמיתי: ${wins}-${losses} בבית`
  - (5) `${teamName} שולטים בפרקט הביתי - ${pct}% נצחונות`
  - (6) `הביתיות של ${teamName} מרשימה: ${wins} נצחונות מ-${wins}+${losses} משחקים`
  - (7) `לא מפתיע לראות את ${teamName} מנצחים בבית (${wins}-${losses})`
  - (8) `הביתיות משחקת ל-${teamName}: ${wins} נצחונות ורק ${losses} הפסדים`

- **HOME_WIN_ABOVE_AVG**
  - (1) `${teamName} מנצחים בבית עם ${ppg} נק' - ${diff} מעל ממוצע הליגה (${leagueAvg})`
  - (2) `כשמנצחים בבית, ${teamName} עושים את זה בגדול: ${ppg} נק' (ממוצע: ${leagueAvg})`
  - (3) `${teamName} מייצרים ${ppg} נק' בבית - +${diff} מממוצע הליגה`
  - (4) `התקפה ביתית חזקה: ${teamName} עם ${ppg} נק' (${diff} מעל הממוצע)`
  - (5) `${teamName} בבית = הרבה נקודות: ${ppg} בממוצע (+${diff} מהליגה)`
  - (6) `ניקוד גבוה בבית: ${teamName} ${ppg} נק' (ממוצע ליגה ${leagueAvg})`
  - (7) `${teamName} פורצים בבית: ${ppg} נק' בממוצע - ${diff} יותר מהממוצע`
  - (8) `כוח התקפי ביתי: ${teamName} עם ${ppg} נק' (+${diff} מהליגה)`

- **LINEUP_DEPENDENT**
  - (1) `רק ${benchPct}% מהנקודות של ${teamName} מגיעות מהספסל - ${benchPpg} נק' למשחק, הרבה מתחת לממוצע בליגה`
  - (2) `${teamName} תלויה בחמישייה הפותחת: הספסל תורם רק ${benchPct}% (${benchPpg} נק')`
  - (3) `המחליפים של ${teamName} מייצרים רק ${benchPct}% מהנקודות - ${benchPpg} למשחק`
  - (4) `${teamName} עם ספסל חלש: רק ${benchPpg} נק' מהמחליפים, ${benchPct}% מסך הנקודות`
  - (5) `תרומה נמוכה מהספסל: ${teamName} מקבלת רק ${benchPpg} נק' למשחק מהמחליפים (${benchPct}%)`
  - (6) `${benchPct}% בלבד מהייצור של ${teamName} מגיע מהספסל - ${benchPpg} נק' בממוצע`
  - (7) `הספסל של ${teamName} צריך לעזור יותר: רק ${benchPpg} נק' למשחק (${benchPct}%)`
  - (8) `חוסר עומק ב${teamName}: המחליפים עם רק ${benchPpg} נק' - ${benchPct}% מהנקודות`

- **LOSING_STREAK**
  - (1) `${teamName} ברצף של ${losses} הפסדים - מגיעה עם נקודת שאלה`
  - (2) `משבר: ${teamName} עם ${losses} הפסדים ברצף`
  - (3) `${teamName} בקשיים - ${losses} הפסדים רצופים`
  - (4) `${teamName} במשבר עם ${losses} הפסדים ברצף`
  - (5) `${teamName} מחפשת את עצמה - ${losses} הפסדים רצופים`
  - (6) `מומנטום שלילי: ${teamName} הפסידה ${losses} פעמים ברצף`
  - (7) `${teamName} על סדרת הפסדים - ${losses} ברצף`
  - (8) `רצף קשה: ${teamName} עם ${losses} הפסדים רצופים`

- **ROAD_WARRIOR**
  - (1) `${teamName} לוחמי חוץ - ${wins}-${losses} הרחק מהבית (${pct}%)`
  - (2) `מפתיע: ${teamName} עם ${pct}% נצחונות בחוץ!`
  - (3) `${teamName} מצטיינים דווקא בחוץ: ${wins}-${losses}`
  - (4) `קבוצת חוץ: ${teamName} עם ${wins} נצחונות מ-${wins}+${losses} משחקים`
  - (5) `${teamName} לא מפחדים לשחק בחוץ - ${pct}% נצחונות`
  - (6) `הדרך לא מפריעה ל-${teamName}: ${wins}-${losses} בחוץ`
  - (7) `${teamName} עם מאזן חוץ מרשים - ${pct}% נצחונות`
  - (8) `לוחמי כביש: ${teamName} ${wins}-${losses} הרחק מהבית`

- **STRONG_BENCH**
  - (1) `${benchPct}% מהנקודות של ${teamName} מגיעות מהספסל - ${benchPpg} נק' למשחק, הרבה מעל הממוצע בליגה`
  - (2) `הספסל של ${teamName} תורם ${benchPpg} נק' למשחק (${benchPct}%) - מהחזקים בליגה`
  - (3) `המחליפים של ${teamName} מייצרים ${benchPct}% מהנקודות - ${benchPpg} למשחק`
  - (4) `${teamName} עם ספסל עמוק: ${benchPpg} נק' מהמחליפים, ${benchPct}% מסך הנקודות`
  - (5) `תרומה משמעותית מהספסל: ${teamName} מקבלת ${benchPpg} נק' למשחק מהמחליפים (${benchPct}%)`
  - (6) `${benchPct}% מהייצור של ${teamName} מגיע מהספסל - ${benchPpg} נק' בממוצע`
  - (7) `הספסל של ${teamName} לא מפסיק לייצר: ${benchPpg} נק' למשחק (${benchPct}%)`
  - (8) `עומק סגל ל${teamName}: המחליפים עם ${benchPpg} נק' - ${benchPct}% מהנקודות`

- **VENUE_SPLIT**
  - (1) `פער דרמטי: ${teamName} ${homeWins}-${homeLosses} בבית (${homePct}%) אבל ${awayWins}-${awayLosses} בחוץ (${awayPct}%)`
  - (2) `שתי קבוצות שונות: ${teamName} בבית (${homePct}%) לעומת חוץ (${awayPct}%)`
  - (3) `${teamName} עם פער של ${gap}% בין בית לחוץ`
  - (4) `הבדל משמעותי: ${teamName} ${homeWins}-${homeLosses} בבית, ${awayWins}-${awayLosses} בחוץ`
  - (5) `${teamName}: ${homePct}% בבית לעומת ${awayPct}% בחוץ - פער של ${gap}%`
  - (6) `הביתיות קריטית ל-${teamName}: ${homePct}% בבית מול ${awayPct}% בחוץ`
  - (7) `פערי מגרש: ${teamName} הרבה יותר טובים בבית (${homePct}%) מאשר בחוץ (${awayPct}%)`
  - (8) `${teamName} קבוצה אחרת לגמרי בחוץ: ${awayPct}% לעומת ${homePct}% בבית`

- **WINNING_STREAK**
  - (1) `${teamName} על הגל עם רצף של ${wins} ניצחונות`
  - (2) `${teamName} מגיעה בפורמה חמה – ${wins} ניצחונות רצופים`
  - (3) `${teamName} ניצחה ${wins} משחקים ברצף, ומראה מומנטום חזק`
  - (4) `רצף של ${wins} ניצחונות רצופים ל-${teamName}`
  - (5) `המומנטום כולו אצל ${teamName}, שניצחה ${wins} פעמים ברצף`
  - (6) `${teamName} רשמה ${wins} ניצחונות ברצף, ומגיעה בביטחון מלא`
  - (7) `בזכות ${wins} ניצחונות רצופים, ${teamName} נמצאת בכושר שיא`
  - (8) `${teamName} נמצאת בסדרת ניצחונות: זכתה ב-${wins} המשחקים האחרונים`

### קטגוריה: `team`

- **ASSIST_HEAVY**
  - (1) `${assistRatio}% מהסלים של ${teamName}${rankText} מגיעים מאסיסט – משחק קבוצתי בולט`
  - (2) `משחק קבוצתי מעולה: ${assistRatio}% מהסלים של ${teamName}${rankText} עם אסיסט`
  - (3) `${teamName}${rankText} משחקת יחד: ${assistRatio}% מהסלים מאסיסטים`
  - (4) `על הנייר, ${teamName}${rankText} מצטיינת במשחק קבוצתי: ${assistRatio}% מהסלים מאסיסט`
  - (5) `${teamName}${rankText} עם כימיה התקפית: ${assistRatio}% מהסלים עם אסיסט`
  - (6) `משחק צוותי במיטבו: ${assistRatio}% מהסלים של ${teamName}${rankText} מאסיסט`
  - (7) `${teamName}${rankText} משתפת פעולה: ${assistRatio}% מהסלים מגיעים מאסיסטים`
  - (8) `תרבות של שיתוף ב-${teamName}${rankText}: ${assistRatio}% מהסלים עם אסיסט`

- **BEST_QUARTER**
  - (1) `הרבע ${quarterName} הוא נקודת חוזק של ${teamName} בעונה – ${diff}+ נק' בממוצע ברבע הזה`
  - (2) `${teamName} חזקה במיוחד ברבע ${quarterName}: ${diff}+ נק' בממוצע`
  - (3) `על הנייר, הרבע ${quarterName} זה הזמן של ${teamName} – ${diff}+ נק' בממוצע`
  - (4) `${teamName} מצטיינת ברבע ${quarterName} עם ${diff}+ נק' בממוצע`
  - (5) `נקודת חוזק ברורה: ${teamName} ברבע ${quarterName} (${diff}+ נק' בממוצע)`
  - (6) `${teamName} שולטת ברבע ${quarterName} – ${diff}+ נק' בממוצע ברבע הזה`
  - (7) `הרבע ${quarterName} שייך ל-${teamName}: ${diff}+ נק' בממוצע`
  - (8) `${teamName} במיטבה ברבע ${quarterName} – ${diff}+ נק' בממוצע`

- **COMEBACK_KINGS**
  - (1) `${teamName} מגיעה עם יכולת קאמבק חריגה – ${comebacks} ניצחונות אחרי פיגור של ${deficitThreshold}+ נקודות`
  - (2) `מלכת הקאמבקים: ${teamName} עם ${comebacks} ניצחונות אחרי פיגור גדול`
  - (3) `${teamName} לא מוותרת – ${comebacks} הפיכות אחרי פיגור של ${deficitThreshold}+ נקודות`
  - (4) `על הנייר, ${teamName} יודעת לחזור: ${comebacks} ניצחונות מפיגור של ${deficitThreshold}+ נק'`
  - (5) `${teamName} עם מנטליות של לוחמת – ${comebacks} קאמבקים מפיגור גדול`
  - (6) `יכולת קאמבק מרשימה: ${teamName} זכתה ${comebacks} פעמים אחרי פיגור של ${deficitThreshold}+ נק'`
  - (7) `${teamName} מתמחה בהפיכות – ${comebacks} ניצחונות מפיגור של ${deficitThreshold}+ נקודות`
  - (8) `לא נגמר עד שנגמר: ${teamName} עם ${comebacks} קאמבקים מפיגור משמעותי`

- **DAY_OF_WEEK**
  - (1) `${teamName} חזקה ב${day}: ${wins} ניצחונות מתוך ${games} משחקים`
  - (2) `${teamName} מצטיינת ב${day}: ${winPct}% ניצחונות`
  - (3) `${day} מתאים ל-${teamName}: השיגה ${wins} ניצחונות מתוך ${games}`
  - (4) `${day} הוא הזמן של ${teamName}: ${wins} ניצחונות מתוך ${games} משחקים`
  - (5) `${teamName} בפורמה הגבוהה ביותר ב${day} (${winPct}% ניצחונות)`
  - (6) `${teamName} ניצחה ${wins} פעמים מתוך ${games} מפגשים ב${day}`
  - (7) `המאזן מוכיח: ${teamName} שולטת ב${day} עם ${wins}/${games} ניצחונות`
  - (8) `${day} הוא יום טוב ל-${teamName}: מאזן של ${wins}/${games} ניצחונות`

- **DEFENSIVE_WALL**
  - (1) `${teamName}${rankText} מגיעה עם הגנה מצוינת – היריבות שלה על ${oppPpg} נק' למשחק, ${diff} פחות מהממוצע`
  - (2) `חומת הגנה של ${teamName}${rankText}: מגבילה יריבות ל-${oppPpg} נק' בלבד (${diff} מתחת לממוצע)`
  - (3) `${teamName}${rankText} עם אחת ההגנות הטובות בליגה – ${oppPpg} נק' ליריבות, ${diff} מתחת לממוצע`
  - (4) `הגנה איכותית במיוחד ל-${teamName}${rankText}: ${oppPpg} נק' ליריבות (${diff} פחות מהממוצע)`
  - (5) `${teamName}${rankText} יודעת לסגור משחקים – רק ${oppPpg} נק' ליריבות, ${diff} מתחת לממוצע`
  - (6) `על הנייר, ${teamName}${rankText} עם הגנה דומיננטית: ${oppPpg} נק' ליריבות (${diff} פחות מהממוצע)`
  - (7) `${teamName}${rankText} מביאה הגנה קשוחה – מגבילה ל-${oppPpg} נק' למשחק (${diff} מתחת לממוצע)`
  - (8) `יכולת הגנתית גבוהה ל-${teamName}${rankText} – רק ${oppPpg} נק' ליריבות, ${diff} פחות מהממוצע`

- **FAST_BREAK_KINGS**
  - (1) `${teamName}${rankText} מגיעה כקבוצה מהטובות במתפרצות – ${fastBreakPpg} נק' למשחק מהתקפות מהירות`
  - (2) `מלכת ההתקפות המתפרצות: ${teamName}${rankText} עם ${fastBreakPpg} נק' למשחק`
  - (3) `${teamName}${rankText} רצה קדימה – ${fastBreakPpg} נק' בממוצע מהתקפות מהירות`
  - (4) `על הנייר, ${teamName}${rankText} מצטיינת במתפרצות: ${fastBreakPpg} נק' למשחק`
  - (5) `${teamName}${rankText} אוהבת לרוץ – ${fastBreakPpg} נק' למשחק מהתקפות מהירות`
  - (6) `התקפות מתפרצות זה החוזק של ${teamName}${rankText}: ${fastBreakPpg} נק' למשחק`
  - (7) `${teamName}${rankText} דוהרת לסל – ${fastBreakPpg} נק' בממוצע מהתקפות מהירות`
  - (8) `כוח במעברים מהירים ל-${teamName}${rankText}: ${fastBreakPpg} נק' למשחק במתפרצות`

- **FOURTH_QUARTER_COLLAPSE**
  - (1) `${teamName} מגיעה עם סימן שאלה ברבע הסיום – הפסידה ${q4Losses} מתוך ${gamesWithQ4Data} רבעים רביעיים בעונה`
  - (2) `בעיה ברבעים רביעיים: ${teamName} הפסידה ${q4Losses}/${gamesWithQ4Data} רבעים אחרונים`
  - (3) `${teamName} נופלת ברבעים רביעיים – ${q4Losses} מתוך ${gamesWithQ4Data} בעונה`
  - (4) `על הנייר, ${teamName} עם נקודת תורפה ברבע 4: ${q4Losses}/${gamesWithQ4Data} הפסדים`
  - (5) `${teamName} מתקשה ברבעים רביעיים – הפסידה ${q4Losses} מתוך ${gamesWithQ4Data}`
  - (6) `רבע 4 זה האתגר של ${teamName}: ${q4Losses}/${gamesWithQ4Data} הפסדים`
  - (7) `${teamName} לא חזקה בפיניש – ${q4Losses} מתוך ${gamesWithQ4Data} רבעים רביעיים הפסידה`
  - (8) `סימן שאלה ברבע האחרון: ${teamName} עם ${q4Losses}/${gamesWithQ4Data} הפסדים`

- **HIGH_SCORING_OFFENSE**
  - (1) `${teamName}${rankText} עם אחת ההתקפות הטובות: ${ppg} נק' למשחק`
  - (2) `כוח אש התקפי: ${teamName}${rankText} קולעת ${ppg} נק' בממוצע`
  - (3) `${teamName}${rankText} עם ממוצע ${ppg} נק' לערב – ${diff} מעל הממוצע`
  - (4) `התקפה מפוצצת: ${teamName}${rankText} ממוצע ${ppg} נקודות למשחק`
  - (5) `${teamName}${rankText} מובילה בניקוד עם ${ppg} נק' למשחק`
  - (6) `${teamName}${rankText} היא מכונת נקודות: ${ppg} נק' בממוצע לערב`
  - (7) `הקבוצה עם תפוקה התקפית גבוהה: ${teamName}${rankText} עם ${ppg} נקודות`
  - (8) `${teamName}${rankText} רושמת ${ppg} נק' למשחק – ${diff} יותר מהממוצע`

- **PAINT_DOMINANCE**
  - (1) `${teamName}${rankText} מגיעה עם כוח בצבע – ${paintPct}% מהנקודות שלה משם, ${paintPpg} נק' למשחק`
  - (2) `שליטה מוחלטת בצבע ל-${teamName}${rankText}: ${paintPct}% מהנקודות, ${paintPpg} נק' למשחק`
  - (3) `${teamName}${rankText} חיה בצבע – ${paintPct}% מהניקוד שלה, ${paintPpg} נק' למשחק`
  - (4) `הצבע שייך ל-${teamName}${rankText}: ${paintPct}% מהנקודות משם (${paintPpg} נק' למשחק)`
  - (5) `${teamName}${rankText} דומיננטית בצבע עם ${paintPct}% מהנקודות – ${paintPpg} נק' למשחק`
  - (6) `על הנייר, ${teamName}${rankText} שולטת בצבע: ${paintPct}% מהניקוד (${paintPpg} נק' למשחק)`
  - (7) `${teamName}${rankText} עם כוח בצבע – ${paintPct}% מהנקודות שם, ${paintPpg} נק' בממוצע`
  - (8) `דומיננטיות בצבע ל-${teamName}${rankText}: ${paintPpg} נק' למשחק (${paintPct}% מסך הנקודות)`

- **REBOUND_DOMINANCE**
  - (1) `${teamName} עם יתרון ברור בכדורים חוזרים על ${opponentName}: ${diff} יותר בממוצע`
  - (2) `${teamName} שולטת מתחת לסלים: ${diff} כדורים חוזרים יותר מ-${opponentName}`
  - (3) `היתרון המרכזי של ${teamName} הוא בכדורים חוזרים: פלוס ${diff} על ${opponentName}`
  - (4) `${teamName} עדיפה על ${opponentName} בכדורים חוזרים: ${diff}+ למשחק`
  - (5) `שליטה מתחת לשני הסלים: ${teamName} לוקחת ${diff} כדורים יותר בממוצע`
  - (6) `${teamName} עם עדיפות מוחלטת בריבאונד: ${diff} כדורים יותר מהיריבה`
  - (7) `הכוח של ${teamName} הוא בריבאונד, עם יתרון של ${diff} כדורים חוזרים`
  - (8) `${teamName} עם הפרש של ${diff} כדורים חוזרים בממוצע על פני ${opponentName}`

- **THREE_POINT_DEPENDENT**
  - (1) `${threePointPct}% מנקודות ${teamName}${rankText} מקו השלוש – תלות גבוהה במשחק המרחק`
  - (2) `${teamName}${rankText} תלויה בשלוש: ${threePointPct}% מהניקוד שלה מקו הרחוק`
  - (3) `על הנייר, ${teamName}${rankText} חיה מהשלוש – ${threePointPct}% מהנקודות משם`
  - (4) `${teamName}${rankText} משחקת מרחק: ${threePointPct}% מהניקוד מקו השלוש`
  - (5) `תלות משמעותית בשלוש ל-${teamName}${rankText}: ${threePointPct}% מהנקודות`
  - (6) `${teamName}${rankText} מסתמכת על קו השלוש – ${threePointPct}% מסך הניקוד משם`
  - (7) `משחק מרחק דומיננטי: ${teamName}${rankText} עם ${threePointPct}% מהנקודות מהשלוש`
  - (8) `${teamName}${rankText} עם זהות ברורה: ${threePointPct}% מהנקודות מקו השלוש`

## 2) טקסטים קשיחים בתוך `ibba_insights_v2.js`

### ABOVE_AVERAGE

- **text**
  - `${teamName} מעל הממוצע! ${categoriesList}`

- **textShort**
  - `מעל ממוצע ב-${aboveCategories.length} קטגוריות`

### ASSIST_HEAVY

- **textShort**
  - `${assistRatio.toFixed(1)}% סלים מאסיסט`

### ASSIST_MACHINE

- **textShort**
  - `${playerName}: ${apg.toFixed(1)} אסיסטים למשחק`

### BELOW_AVERAGE

- **text**
  - `${teamName} מתחת לממוצע: ${categoriesList}`

- **textShort**
  - `מתחת לממוצע ב-${belowCategories.length} קטגוריות`

### BENCH_POWER

- **text**
  - `${teamName}${rankText} - ${actionText}! ${benchPpg} נק' למשחק מהספסל (${benchPct}% מהנקודות)`

- **textShort**
  - `${benchPpg} נק' מהספסל`

### BEST_CATEGORY

- **textShort**
  - `מקום ${bestCategory.rank} ${bestCategory.label}`

### BEST_QUARTER

- **textShort**
  - `רבע ${qNum}: +${bestAvgDiff.toFixed(1)} נק'`

### BLOCK_PARTY

- **text**
  - `${teamName}${rankText} ${actionText} - ${bpg.toFixed(1)} חסימות למשחק!${playerDetail}`

- **textShort**
  - `${bpg.toFixed(1)} חסימות למשחק`

### BLOWOUT_WINS

- **textShort**
  - `${blowouts} ניצחונות גדולים ב-5 אחרונים`

### BOOM_OR_BUST

- **text**
  - `תנודתיות קיצונית! ${playerName} (${teamName}) מחבר ${mean} נק' בממוצע, אבל יש לו הבדלים גדולים בין משחק למשחק: מ- ${low} נק' עד ערב שיא של ${high}+.`

- **textShort**
  - `${playerName}: לא עקבי`

### CLOSE_LOSSES

- **text**
  - `${teamName} עם ${closeLosses} הפסדים צמודים בעונה - קרובה לפריצה! רק צריכה מזל קטן`

- **textShort**
  - `${closeLosses} הפסדים צמודים בעונה`

### CLUTCH_STREAK

- **textShort**
  - `${clutchWins} ניצחונות צמודים ברצף`

### COLD_SPELL

- **text**
  - `${playerName} במשבר - רק ${recentAvg.toFixed(1)} נק' ב-3 משחקים אחרונים (לעומת ${seasonAvg.toFixed(1)} עונתי) - ירידה של ${percentBelow}%${minutesNote}`

- **textShort**
  - `${playerName} במשבר (${recentAvg.toFixed(1)} vs ${seasonAvg.toFixed(1)})`

### COMEBACK_KINGS

- **textShort**
  - `${bigComebacks} קאמבקים מפיגור גדול`

### DAY_OF_WEEK

- **textShort**
  - `${bestDay.day}: ${bestDay.winPct.toFixed(0)}%`

### DEFENSIVE_WALL

- **textShort**
  - `הגנה: ${oppPpg.toFixed(1)} נק' ליריבות`

### DOUBLE_DOUBLE_MACHINE

- **textShort**
  - `${playerName}: ${data.doubleDoubles}/${data.games} דאבל-דאבל`

### FAST_BREAK_KINGS

- **textShort**
  - `${fastBreakPpg.toFixed(1)} נק' התקפות מתפרצות`

### FOURTH_QUARTER_COLLAPSE

- **textShort**
  - `${q4Losses}/${gamesWithQ4Data} הפסדי רבע 4`

### FREE_THROW_FACTORY

- **text**
  - `${teamName} מגיעה הרבה לקו החינם – ${ftaPerGame.toFixed(1)} זריקות חופשיות למשחק בממוצע`

- **textShort**
  - `${ftaPerGame.toFixed(1)} זריקות חופשיות למשחק`

### H2H_FLIP

- **text**
  - `שינוי כיוון במפגשים! ${teamA} שלטה בתחילה (${firstHalfWinsA}/${mid}), אבל ${teamB} זוכה לאחרונה (${secondHalfWinsB}/${secondHalf.length})`
  - `שינוי כיוון במפגשים! ${teamB} שלטה בתחילה (${firstHalfWinsB}/${mid}), אבל ${teamA} זוכה לאחרונה (${secondHalfWinsA}/${secondHalf.length})`

- **textShort**
  - `${teamA} הפכה את המגמה`
  - `${teamB} הפכה את המגמה`

### H2H_MARGIN_TREND

- **textShort**
  - `${improving ? 'מצמצמת' : 'מרחיבה'} הפער במפגשים`

### H2H_TOP_SCORER

- **text**
  - `${playerName} מ-${topScorer.teamName} שולט במפגשים! ${maxPpg.toFixed(1)} נק' בממוצע במפגשים ישירים (${topScorer.games} משחקים)`

- **textShort**
  - `${playerName}: ${maxPpg.toFixed(1)} נק' במפגשים`

### H2H_VENUE

- **text**
  - `יתרון מגרש במפגשים: ${teamA} ${homeWins}-${homeGames.length - homeWins} בבית, ${awayWins}-${awayGames.length - awayWins} בחוץ נגד ${teamB}`

- **textShort**
  - `בבית: ${homeWins}-${homeGames.length - homeWins}, בחוץ: ${awayWins}-${awayGames.length - awayWins}`

### HIGH_SCORING

- **textShort**
  - `${ppg.toFixed(1)} נק' למשחק`

### HOME_COURT_HERO

- **text**
  - `${playerName} אוהב את הבית! ${hero.homePpg.toFixed(1)} נק' בבית לעומת ${hero.awayPpg.toFixed(1)} בחוץ (+${hero.diff.toFixed(1)})`

- **textShort**
  - `${playerName}: +${hero.diff.toFixed(1)} נק' בבית`

### HOT_HAND

- **text**
  - `${playerName} בוער! ${recentAvg.toFixed(1)} נק' ב-3 משחקים אחרונים (לעומת ${seasonAvg.toFixed(1)} עונתי) - +${percentAbove}%${minutesNote}`

- **textShort**
  - `${playerName} בוער (${recentAvg.toFixed(1)} vs ${seasonAvg.toFixed(1)})`

### KILLER_VS_TEAM

- **text**
  - `${playerName} = הרוצח של ${opponentName}! ממוצע של ${h2hAvg.toFixed(1)} נק' במפגשים (לעומת ${seasonAvg.toFixed(1)} עונתי) - +${percentAbove}%`

- **textShort**
  - `${playerName} רוצח של ${opponentName}`

### LEAGUE_LEADER

- **text**
  - `${teamName} ${leaderText}! ${topCat.icon} מקום ${topCat.rank} ${topCat.label} (${topCat.value}), ${secondCat.icon} מקום ${secondCat.rank} ${secondCat.label} (${secondCat.value})`

- **textShort**
  - `${leaderText}: ${topCat.label} + ${secondCat.label}`

### LOSING_STREAK

- **textShort**
  - `${losses} הפסדים ברצף`

### MR_CONSISTENT

- **text**
  - `${playerName} (${teamName}) זה עקביות כמו שעון שוויצרי! כמעט תמיד הוא מספק את הסחורה בטווח הצר של ${low} עד ${high} נקודות.`

- **textShort**
  - `${playerName}: עקביות גבוהה`

### PAINT_DOMINANCE

- **textShort**
  - `${paintPct.toFixed(0)}% נק' מהצבע`

### PAINT_DOMINATORS

- **text**
  - `${teamName} שולטת בצבע - ${twoPointPpg.toFixed(1)} נק' למשחק מזריקות של 2 (${twoPointFGM} סלים למשחק, ${(twoPointPpg - leagueTwoPpg).toFixed(1)} מעל ממוצע הליגה)`

- **textShort**
  - `${twoPointPpg.toFixed(1)} נק' מזריקות 2`

### POINT_DIFF_TREND

- **text**
  - `${teamName} ${improving ? 'במגמת עלייה' : 'במגמת ירידה'} - הפרש נקודות של \u200E${recentAvgDiff > 0 ? '+' : ''}${recentAvgDiff.toFixed(1)}\u200E ב-5 אחרונים (לעומת \u200E${seasonAvgDiff > 0 ? '+' : ''}${seasonAvgDiff.toFixed(1)}\u200E עונתי)`

- **textShort**
  - `${improving ? 'עלייה' : 'ירידה'} בהפרש נקודות`

### QUARTER_DOMINANCE

- **text**
  - `${teamName} שולטת ברבע ${qNum} - ניצחה ${quarterWins[q]}/${quarterGames[q]} רבעים (${winPct.toFixed(0)}%)`

- **textShort**
  - `שליטה ברבע ${qNum}`

### REBOUND_DOMINANCE

- **textShort**
  - `+${diff.toFixed(1)} ריבאונדים`

### REBOUND_MACHINE

- **textShort**
  - `${playerName}: ${rpg.toFixed(1)} ריבאונדים למשחק`

### RISING_STAR

- **text**
  - `${playerName} במגמת עלייה! ${star.firstAvg.toFixed(1)} נק' בתחילה → ${star.secondAvg.toFixed(1)} נק' לאחרונה (+${star.improvementPct.toFixed(0)}%)`

- **textShort**
  - `${playerName}: +${star.improvementPct.toFixed(0)}% שיפור`

### SCHEDULE_STRENGTH

- **textShort**
  - `vs חצי עליון: ${vsTopWins}-${vsTopTotal - vsTopWins} (${topPct.toFixed(0)}%), vs תחתון: ${vsBottomWins}-${vsBottomTotal - vsBottomWins} (${bottomPct.toFixed(0)}%)`

### SEASON_HALVES

- **text**
  - `${teamName} ${trend} במהלך העונה! מחצית ראשונה: ${firstWinPct.toFixed(0)}% (${firstWins}/${firstHalf.length}) → מחצית שנייה: ${secondWinPct.toFixed(0)}% (${secondWins}/${secondHalf.length})`

- **textShort**
  - `${trend}: ${change > 0 ? '+' : ''}${change.toFixed(0)}%`

### SECOND_CHANCE_MASTERS

- **text**
  - `${teamName}${rankText} - ${actionText}! ${secondChancePpg} נק' למשחק מהזדמנות שנייה`

- **textShort**
  - `${secondChancePpg} נק' הזדמנות 2`

### SLOW_STARTERS

- **text**
  - `${teamName} מתחילה לאט אבל מסיימת חזק - ${comebackWins} ניצחונות מתוך ${halftimeDeficits} משחקים שבהם פיגרה במחצית המשחק (${(comebackPct * 100).toFixed(0)}%)`

- **textShort**
  - `${comebackWins}/${halftimeDeficits} קאמבקים ממחצית`

### STARTING_VS_BENCH

- **text**
  - `${teamName}: ${insight} – ${startersPpg.toFixed(1)} vs ${benchPpg.toFixed(1)} נק' למשחק`

- **textShort**
  - `${startersPct}% חמישייה, ${benchPct}% ספסל`

### TEAM_LEADER

- **textShort**
  - `${playerName}: מוביל עם ${maxPpg.toFixed(1)} נק'`

### THREE_POINT_DEFENSE_BAD

- **text**
  - `${teamName} נותנת יותר מדי משלוש! יריבות קולעות ${opp3PPct.toFixed(1)}% (ממוצע ליגתי ${league3PPct.toFixed(1)}%)`

- **textShort**
  - `הגנת 3P חלשה: ${opp3PPct.toFixed(1)}%`

### THREE_POINT_DEFENSE_GOOD

- **text**
  - `${teamName} הגנה מצוינת על שלוש! יריבות קולעות ${opp3PPct.toFixed(1)}% (ממוצע ליגתי ${league3PPct.toFixed(1)}%)`

- **textShort**
  - `הגנת 3P: ${opp3PPct.toFixed(1)}%`

### THREE_POINT_DEPENDENT

- **textShort**
  - `${threePointPct.toFixed(0)}% מהנקודות משלוש`

### TURNOVER_CAPITALIZATION

- **text**
  - `${teamName}${rankText} - ${actionText}! ${pointsFromToPpg} נק' למשחק מאיבודים של היריבה`

- **textShort**
  - `${pointsFromToPpg} נק' מאיבודים`

### TURNOVER_CREATORS

- **text**
  - `${teamName}${rankText} ${actionText} - ${spg.toFixed(1)} חטיפות למשחק (${diff} מעל ממוצע הליגה)`

- **textShort**
  - `${spg.toFixed(1)} חטיפות למשחק`

### WINNING_STREAK

- **textShort**
  - `${wins} ניצחונות ברצף`

### WORST_CATEGORY

- **text**
  - `${teamName}: אתגר עיקרי - מקום ${worstCategory.rank} ${worstCategory.label} (${worstCategory.value})`

- **textShort**
  - `אתגר: מקום ${worstCategory.rank} ${worstCategory.label}`
