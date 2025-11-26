/**
 * IBBA Insights Templates - Hebrew Variations
 * Version: 2.2.3 - RTL & Linguistic Fixes
 * 
 * מערכת טמפלטים דינמית עם 8 וריאציות בעברית לכל סוג Insight.
 * מטרה: למנוע חזרתיות ולהפוך את המערכת לטבעית ומגוונת יותר.
 */

const IBBAInsightTemplates = {
  team: {
    REBOUND_DOMINANCE: [
      "${teamName} עם יתרון ברור בכדורים חוזרים על ${opponentName}: ${diff} יותר בממוצע",
      "${teamName} שולטת מתחת לסלים: ${diff} כדורים חוזרים יותר מ-${opponentName}",
      "היתרון המרכזי של ${teamName} הוא בכדורים חוזרים: פלוס ${diff} על ${opponentName}",
      "${teamName} עדיפה על ${opponentName} בכדורים חוזרים: ${diff}+ למשחק",
      "שליטה מתחת לשני הסלים: ${teamName} לוקחת ${diff} כדורים יותר בממוצע",
      "${teamName} עם עדיפות מוחלטת בריבאונד: ${diff} כדורים יותר מהיריבה",
      "הכוח של ${teamName} הוא בריבאונד, עם יתרון של ${diff} כדורים חוזרים",
      "${teamName} עם הפרש של ${diff} כדורים חוזרים בממוצע על פני ${opponentName}"
    ],
    
    HIGH_SCORING_OFFENSE: [
      "${teamName}${rankText} עם אחת ההתקפות הטובות: ${ppg} נק' למשחק",
      "כוח אש התקפי: ${teamName}${rankText} קולעת ${ppg} נק' בממוצע",
      "${teamName}${rankText} עם ממוצע ${ppg} נק' לערב – ${diff} מעל הממוצע",
      "התקפה מפוצצת: ${teamName}${rankText} ממוצע ${ppg} נקודות למשחק",
      "${teamName}${rankText} מובילה בניקוד עם ${ppg} נק' למשחק",
      "${teamName}${rankText} היא מכונת נקודות: ${ppg} נק' בממוצע לערב",
      "הקבוצה עם תפוקה התקפית גבוהה: ${teamName}${rankText} עם ${ppg} נקודות",
      "${teamName}${rankText} רושמת ${ppg} נק' למשחק – ${diff} יותר מהממוצע"
    ],
    
    DEFENSIVE_WALL: [
      "${teamName}${rankText} מגיעה עם הגנה מצוינת – היריבות שלה על ${oppPpg} נק' למשחק, ${diff} פחות מהממוצע",
      "חומת הגנה של ${teamName}${rankText}: מגבילה יריבות ל-${oppPpg} נק' בלבד (${diff} מתחת לממוצע)",
      "${teamName}${rankText} עם אחת ההגנות הטובות בליגה – ${oppPpg} נק' ליריבות, ${diff} מתחת לממוצע",
      "הגנה איכותית במיוחד ל-${teamName}${rankText}: ${oppPpg} נק' ליריבות (${diff} פחות מהממוצע)",
      "${teamName}${rankText} יודעת לסגור משחקים – רק ${oppPpg} נק' ליריבות, ${diff} מתחת לממוצע",
      "על הנייר, ${teamName}${rankText} עם הגנה דומיננטית: ${oppPpg} נק' ליריבות (${diff} פחות מהממוצע)",
      "${teamName}${rankText} מביאה הגנה קשוחה – מגבילה ל-${oppPpg} נק' למשחק (${diff} מתחת לממוצע)",
      "יכולת הגנתית גבוהה ל-${teamName}${rankText} – רק ${oppPpg} נק' ליריבות, ${diff} פחות מהממוצע"
    ],
    
    PAINT_DOMINANCE: [
      "${teamName}${rankText} מגיעה עם כוח בצבע – ${paintPct}% מהנקודות שלה משם, ${paintPpg} נק' למשחק",
      "שליטה מוחלטת בצבע ל-${teamName}${rankText}: ${paintPct}% מהנקודות, ${paintPpg} נק' למשחק",
      "${teamName}${rankText} חיה בצבע – ${paintPct}% מהניקוד שלה, ${paintPpg} נק' למשחק",
      "הצבע שייך ל-${teamName}${rankText}: ${paintPct}% מהנקודות משם (${paintPpg} נק' למשחק)",
      "${teamName}${rankText} דומיננטית בצבע עם ${paintPct}% מהנקודות – ${paintPpg} נק' למשחק",
      "על הנייר, ${teamName}${rankText} שולטת בצבע: ${paintPct}% מהניקוד (${paintPpg} נק' למשחק)",
      "${teamName}${rankText} עם כוח בצבע – ${paintPct}% מהנקודות שם, ${paintPpg} נק' בממוצע",
      "דומיננטיות בצבע ל-${teamName}${rankText}: ${paintPpg} נק' למשחק (${paintPct}% מסך הנקודות)"
    ],
    
    FAST_BREAK_KINGS: [
      "${teamName}${rankText} מגיעה כקבוצה מהטובות במתפרצות – ${fastBreakPpg} נק' למשחק מהתקפות מהירות",
      "מלכת ההתקפות המתפרצות: ${teamName}${rankText} עם ${fastBreakPpg} נק' למשחק",
      "${teamName}${rankText} רצה קדימה – ${fastBreakPpg} נק' בממוצע מהתקפות מהירות",
      "על הנייר, ${teamName}${rankText} מצטיינת במתפרצות: ${fastBreakPpg} נק' למשחק",
      "${teamName}${rankText} אוהבת לרוץ – ${fastBreakPpg} נק' למשחק מהתקפות מהירות",
      "התקפות מתפרצות זה החוזק של ${teamName}${rankText}: ${fastBreakPpg} נק' למשחק",
      "${teamName}${rankText} דוהרת לסל – ${fastBreakPpg} נק' בממוצע מהתקפות מהירות",
      "כוח במעברים מהירים ל-${teamName}${rankText}: ${fastBreakPpg} נק' למשחק במתפרצות"
    ],
    
    THREE_POINT_DEPENDENT: [
      "${threePointPct}% מנקודות ${teamName}${rankText} מקו השלוש – תלות גבוהה במשחק המרחק",
      "${teamName}${rankText} תלויה בשלוש: ${threePointPct}% מהניקוד שלה מקו הרחוק",
      "על הנייר, ${teamName}${rankText} חיה מהשלוש – ${threePointPct}% מהנקודות משם",
      "${teamName}${rankText} משחקת מרחק: ${threePointPct}% מהניקוד מקו השלוש",
      "תלות משמעותית בשלוש ל-${teamName}${rankText}: ${threePointPct}% מהנקודות",
      "${teamName}${rankText} מסתמכת על קו השלוש – ${threePointPct}% מסך הניקוד משם",
      "משחק מרחק דומיננטי: ${teamName}${rankText} עם ${threePointPct}% מהנקודות מהשלוש",
      "${teamName}${rankText} עם זהות ברורה: ${threePointPct}% מהנקודות מקו השלוש"
    ],
    
    ASSIST_HEAVY: [
      "${assistRatio}% מהסלים של ${teamName}${rankText} מגיעים מאסיסט – משחק קבוצתי בולט",
      "משחק קבוצתי מעולה: ${assistRatio}% מהסלים של ${teamName}${rankText} עם אסיסט",
      "${teamName}${rankText} משחקת יחד: ${assistRatio}% מהסלים מאסיסטים",
      "על הנייר, ${teamName}${rankText} מצטיינת במשחק קבוצתי: ${assistRatio}% מהסלים מאסיסט",
      "${teamName}${rankText} עם כימיה התקפית: ${assistRatio}% מהסלים עם אסיסט",
      "משחק צוותי במיטבו: ${assistRatio}% מהסלים של ${teamName}${rankText} מאסיסט",
      "${teamName}${rankText} משתפת פעולה: ${assistRatio}% מהסלים מגיעים מאסיסטים",
      "תרבות של שיתוף ב-${teamName}${rankText}: ${assistRatio}% מהסלים עם אסיסט"
    ],
    
    DAY_OF_WEEK: [
      "${teamName} חזקה ב${day}: ${wins} ניצחונות מתוך ${games} משחקים",
      "${teamName} מצטיינת ב${day}: ${winPct}% ניצחונות",
      "${day} מתאים ל-${teamName}: השיגה ${wins} ניצחונות מתוך ${games}",
      "${day} הוא הזמן של ${teamName}: ${wins} ניצחונות מתוך ${games} משחקים",
      "${teamName} בפורמה הגבוהה ביותר ב${day} (${winPct}% ניצחונות)",
      "${teamName} ניצחה ${wins} פעמים מתוך ${games} מפגשים ב${day}",
      "המאזן מוכיח: ${teamName} שולטת ב${day} עם ${wins}/${games} ניצחונות",
      "${day} הוא יום טוב ל-${teamName}: מאזן של ${wins}/${games} ניצחונות"
    ],
    
    BEST_QUARTER: [
      "הרבע ${quarterName} הוא נקודת חוזק של ${teamName} בעונה – ${diff}+ נק' בממוצע ברבע הזה",
      "${teamName} חזקה במיוחד ברבע ${quarterName}: ${diff}+ נק' בממוצע",
      "על הנייר, הרבע ${quarterName} זה הזמן של ${teamName} – ${diff}+ נק' בממוצע",
      "${teamName} מצטיינת ברבע ${quarterName} עם ${diff}+ נק' בממוצע",
      "נקודת חוזק ברורה: ${teamName} ברבע ${quarterName} (${diff}+ נק' בממוצע)",
      "${teamName} שולטת ברבע ${quarterName} – ${diff}+ נק' בממוצע ברבע הזה",
      "הרבע ${quarterName} שייך ל-${teamName}: ${diff}+ נק' בממוצע",
      "${teamName} במיטבה ברבע ${quarterName} – ${diff}+ נק' בממוצע"
    ],
    
    FOURTH_QUARTER_COLLAPSE: [
      "${teamName} מגיעה עם סימן שאלה ברבע הסיום – הפסידה ${q4Losses} מתוך ${gamesWithQ4Data} רבעים רביעיים בעונה",
      "בעיה ברבעים רביעיים: ${teamName} הפסידה ${q4Losses}/${gamesWithQ4Data} רבעים אחרונים",
      "${teamName} נופלת ברבעים רביעיים – ${q4Losses} מתוך ${gamesWithQ4Data} בעונה",
      "על הנייר, ${teamName} עם נקודת תורפה ברבע 4: ${q4Losses}/${gamesWithQ4Data} הפסדים",
      "${teamName} מתקשה ברבעים רביעיים – הפסידה ${q4Losses} מתוך ${gamesWithQ4Data}",
      "רבע 4 זה האתגר של ${teamName}: ${q4Losses}/${gamesWithQ4Data} הפסדים",
      "${teamName} לא חזקה בפיניש – ${q4Losses} מתוך ${gamesWithQ4Data} רבעים רביעיים הפסידה",
      "סימן שאלה ברבע האחרון: ${teamName} עם ${q4Losses}/${gamesWithQ4Data} הפסדים"
    ],
    
    COMEBACK_KINGS: [
      "${teamName} מגיעה עם יכולת קאמבק חריגה – ${comebacks} ניצחונות אחרי פיגור של ${deficitThreshold}+ נקודות",
      "מלכת הקאמבקים: ${teamName} עם ${comebacks} ניצחונות אחרי פיגור גדול",
      "${teamName} לא מוותרת – ${comebacks} הפיכות אחרי פיגור של ${deficitThreshold}+ נקודות",
      "על הנייר, ${teamName} יודעת לחזור: ${comebacks} ניצחונות מפיגור של ${deficitThreshold}+ נק'",
      "${teamName} עם מנטליות של לוחמת – ${comebacks} קאמבקים מפיגור גדול",
      "יכולת קאמבק מרשימה: ${teamName} זכתה ${comebacks} פעמים אחרי פיגור של ${deficitThreshold}+ נק'",
      "${teamName} מתמחה בהפיכות – ${comebacks} ניצחונות מפיגור של ${deficitThreshold}+ נקודות",
      "לא נגמר עד שנגמר: ${teamName} עם ${comebacks} קאמבקים מפיגור משמעותי"
    ]
  },
  
  player: {
    REBOUND_MACHINE: [
      "${playerName} שולט מתחת לסלים עם ${rpg} כדורים חוזרים למשחק",
      "${playerName} מוביל בכדורים חוזרים: ${rpg} למשחק בממוצע",
      "הריבאונדר המרכזי ${playerName} גובה ${rpg} כדורים חוזרים לערב",
      "${playerName} אחד הטובים מתחת לסלים: ${rpg} כדורים חוזרים בממוצע",
      "העוגן בצבע: ${playerName} עם ${rpg} כדורים חוזרים למשחק",
      "${playerName} עם ממוצע גבוה של ${rpg} כדורים חוזרים לערב",
      "${playerName} דומיננטי בצבע ורושם ${rpg} ריבאונדים בממוצע",
      "${playerName} חוטף הכל: ${rpg} כדורים חוזרים למשחק בממוצע"
    ],
    
    ASSIST_MACHINE: [
      "${playerName} מוביל באסיסטים: ${apg} מסירות מדויקות למשחק",
      "${playerName} מחלק כדורים: ${apg} אסיסטים בממוצע לערב",
      "מנהל המשחק הבולט: ${playerName} עם ${apg} אסיסטים",
      "הפליימייקר ${playerName} רושם ${apg} אסיסטים למשחק בממוצע",
      "${playerName} מפעיל את כולם: עם ממוצע ${apg} אסיסטים לערב",
      "${playerName} עם ממוצע מרשים של ${apg} אסיסטים למשחק",
      "המוח מאחורי ההתקפה: ${playerName} עם ${apg} מסירות מפתח בממוצע",
      "${playerName} מעורב בכל סל: ${apg} אסיסטים למשחק בממוצע"
    ],
    
    TEAM_LEADER: [
      "${playerName} מוביל את ${teamName} עם ${ppg} נק' למשחק${pctText}",
      "הכוכב של ${teamName}: ${playerName} עם ${ppg} נק' בממוצע${pctText}",
      "${playerName} סוחב את ${teamName} - ${ppg} נק' למשחק${pctText}",
      "${playerName} המנוע של ${teamName}: ${ppg} נק' למשחק${pctText}",
      "${playerName} הקלף המנצח של ${teamName} - ${ppg} נק' בממוצע${pctText}",
      "מוביל ההתקפה: ${playerName} של ${teamName} עם ${ppg} נק' למשחק${pctText}",
      "${playerName} הכתובת של ${teamName} - ${ppg} נק' בממוצע${pctText}",
      "הכוכב המוביל: ${playerName} עם ${ppg} נק' למשחק${pctText}"
    ],
    
    DOUBLE_DOUBLE_MACHINE: [
      "${playerName} עקבי מאוד: ${doubleDoubles} דאבל-דאבלים ב-${games} משחקים",
      "מכונת דאבל-דאבל: ${playerName} עם ${doubleDoubles}/${games} דאבל-דאבל",
      "${playerName} ממלא סטטים - ${doubleDoubles} דאבל-דאבלים ב-${games} משחקים",
      "${playerName} מצטיין בעקביות: ${doubleDoubles}/${games} דאבל-דאבל",
      "${playerName} תורם בכל דרך - ${doubleDoubles} דאבל-דאבלים בעונה",
      "עקביות מרשימה: ${playerName} עם ${doubleDoubles} דאבל-דאבלים ב-${games} משחקים",
      "${playerName} שחקן השלם - ${doubleDoubles}/${games} דאבל-דאבל",
      "כוח עבודה: ${playerName} עם ${doubleDoubles} דאבל-דאבלים ב-${games} משחקים"
    ]
  },
  
  streaks: {
    WINNING_STREAK: [
      "${teamName} על הגל עם רצף של ${wins} ניצחונות",
      "${teamName} מגיעה בפורמה חמה – ${wins} ניצחונות רצופים",
      "${teamName} ניצחה ${wins} משחקים ברצף, ומראה מומנטום חזק",
      "רצף של ${wins} ניצחונות רצופים ל-${teamName}",
      "המומנטום כולו אצל ${teamName}, שניצחה ${wins} פעמים ברצף",
      "${teamName} רשמה ${wins} ניצחונות ברצף, ומגיעה בביטחון מלא",
      "בזכות ${wins} ניצחונות רצופים, ${teamName} נמצאת בכושר שיא",
      "${teamName} נמצאת בסדרת ניצחונות: זכתה ב-${wins} המשחקים האחרונים"
    ],
    
    LOSING_STREAK: [
      "${teamName} ברצף של ${losses} הפסדים - מגיעה עם נקודת שאלה",
      "משבר: ${teamName} עם ${losses} הפסדים ברצף",
      "${teamName} בקשיים - ${losses} הפסדים רצופים",
      "${teamName} במשבר עם ${losses} הפסדים ברצף",
      "${teamName} מחפשת את עצמה - ${losses} הפסדים רצופים",
      "מומנטום שלילי: ${teamName} הפסידה ${losses} פעמים ברצף",
      "${teamName} על סדרת הפסדים - ${losses} ברצף",
      "רצף קשה: ${teamName} עם ${losses} הפסדים רצופים"
    ],
    
    CLUTCH_WINS: [
      "${teamName} ברצף של ${clutchWins} ניצחונות צמודים - יודעת לסגור משחקים",
      "${teamName} חזקה במשחקים צמודים: ${clutchWins} ניצחונות ברצף",
      "${teamName} יודעת לנצח צמוד - ${clutchWins} ברצף בהפרש קטן",
      "${teamName} עם ${clutchWins} ניצחונות צמודים ברצף (עד 5 נק')",
      "${teamName} מנצחת במשחקים קרובים - ${clutchWins} ברצף",
      "עצבים של פלדה: ${teamName} זכתה ${clutchWins} פעמים ברצף במשחקים צמודים",
      "${teamName} על רצף קלאץ' - ${clutchWins} ניצחונות צמודים",
      "יכולת ביצוע גבוהה: ${teamName} עם ${clutchWins} ניצחונות צמודים ברצף"
    ],
    
    BLOWOUT_WINS: [
      "${teamName} בדומיננטיות מלאה: השיגה ${blowouts} ניצחונות בהפרש גדול ב-5 המשחקים האחרונים",
      "${teamName} ניצחה ${blowouts} פעמים בהפרש משמעותי מתוך 5 האחרונים",
      "כוח מרשים: ${teamName} עם ${blowouts} ניצחונות של 15+ נקודות ב-5 המשחקים האחרונים",
      "${teamName} מנצחת ובגדול – ${blowouts} ניצחונות משכנעים ב-5 מחזורים",
      "הצהרת כוונות: ${teamName} רשמה ${blowouts} ניצחונות ב-15+ נקודות לאחרונה",
      "${teamName} השיגה ${blowouts} ניצחונות דומיננטיים ב-5 המשחקים האחרונים",
      "יכולת דומיננטית: ${teamName} ניצחה ${blowouts} פעמים בהפרש דו-ספרתי גבוה",
      "${teamName} מציגה עוצמה התקפית – ${blowouts} ניצחונות גדולים ב-5 האחרונים"
    ]
  }
};

/**
 * בחירת טמפלט רנדומלי מרשימת וריאציות
 */
function getRandomTemplate(templates) {
  if (!templates || templates.length === 0) {
    console.warn('⚠️ No templates provided to getRandomTemplate');
    return '';
  }
  const index = Math.floor(Math.random() * templates.length);
  return templates[index];
}

/**
 * מילוי טמפלט עם משתנים
 */
function fillTemplate(template, variables) {
  if (!template) return '';
  
  let filled = template;
  
  // החלפת כל המשתנים
  Object.keys(variables).forEach(key => {
    const value = variables[key];
    const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
    filled = filled.replace(regex, value);
  });
  
  return filled;
}

/**
 * פונקציה ראשית: קבלת טקסט רנדומלי ממולא
 */
function getRandomText(category, insightType, variables) {
  try {
    // בדיקת קיום הקטגוריה
    if (!IBBAInsightTemplates[category]) {
      console.warn(`⚠️ Category "${category}" not found in templates`);
      return null;
    }
    
    // בדיקת קיום סוג ה-Insight
    if (!IBBAInsightTemplates[category][insightType]) {
      console.warn(`⚠️ Insight type "${insightType}" not found in category "${category}"`);
      return null;
    }
    
    // קבלת הטמפלטים
    const templates = IBBAInsightTemplates[category][insightType];
    
    // בחירה רנדומלית
    const template = getRandomTemplate(templates);
    
    // מילוי המשתנים
    const filled = fillTemplate(template, variables);
    
    return filled;
  } catch (error) {
    console.error(`❌ Error in getRandomText: ${error.message}`);
    return null;
  }
}

// Export to global scope
window.IBBAInsightTemplates = {
  templates: IBBAInsightTemplates,
  getRandomTemplate,
  fillTemplate,
  getRandomText
};

console.log('✅ IBBAInsightTemplates loaded successfully!');

