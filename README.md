# Basketball Stats Manager 🏀

מערכת לניהול וניתוח סטטיסטיקות כדורסל עם תמיכה בפרוטוקול IBBA.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=YOUR_GITHUB_REPO_URL)

## ✨ Features

- **Import & Parse** - ייבוא משחקים מ-JSON (IBBA protocol)
- **Player Statistics** - מעקב אחר סטטיסטיקות שחקנים מצטברות
- **Team Statistics** - ניתוח ביצועים קבוצתיים
- **Game Preparation** - כלי הכנה למשחק הבא עם ניתוחים מתקדמים
- **Team Management** - ניהול מיפויים של קבוצות (עברית/אנגלית)
- **Player Management** - ניהול מיפויים של שחקנים
- **Transfer Management** - מעקב אוטומטי אחר העברות שחקנים
- **Cloud Database** - שמירת נתונים ב-Supabase (PostgreSQL)
- **Admin Authentication** - הגנה על כלי ניהול עם סיסמה

## 🚀 Quick Start

### דרישות מוקדמות

- דפדפן מודרני (Chrome, Firefox, Safari, Edge)
- חשבון Supabase (חינמי) - [הרשמה](https://supabase.com)
- חשבון GitHub (להעלאת הקוד)
- חשבון Vercel (חינמי) - [הרשמה](https://vercel.com)

### התקנה מקומית

1. **Clone the repository**:
```bash
git clone YOUR_GITHUB_REPO_URL
cd basketball-stats-manager
```

2. **הגדר את Supabase**:
   - צור פרויקט חדש ב-[Supabase Dashboard](https://app.supabase.com)
   - העתק את `env.example` ל-`.env`
   - הוסף את ה-URL וה-Key מ-Supabase:
     ```
     VITE_SUPABASE_URL=https://your-project.supabase.co
     VITE_SUPABASE_ANON_KEY=your-anon-key-here
     ADMIN_PASSWORD=your-secure-password
     ```

3. **צור טבלאות ב-Supabase**:
   - פתח את **SQL Editor** ב-Supabase Dashboard
   - הרץ את הקוד מ-`supabase_schema.sql`

4. **הרץ מקומית**:
   ```bash
   # עם Python
   python -m http.server 8000
   
   # או עם Node.js (npx)
   npx serve .
   ```

5. **פתח בדפדפן**:
   - גלוש ל-http://localhost:8000

### העברת נתונים קיימים

אם יש לך נתונים ב-IndexedDB המקומי:

1. פתח את `migrate_to_supabase.html` באותו דפדפן
2. הזן את פרטי ה-Supabase (URL + Key)
3. לחץ "בדוק חיבור"
4. לחץ "התחל העברה"
5. המתן עד לסיום

## 📖 שימוש

### משתמש רגיל (קריאה בלבד)

- **כל המשחקים** - צפייה בכל המשחקים שנשמרו
- **סטטיסטיקות קבוצתיות** - סטטיסטיקות מצטברות לכל קבוצה
- **סטטיסטיקות שחקנים** - סטטיסטיקות מצטברות לכל שחקן
- **הכנה למשחק** - ניתוח משחק עתידי והשוואות

### מנהל (עם הרשאות)

1. לחץ על "🔐 כניסת מנהל" בראש העמוד
2. הזן את הסיסמה (מוגדרת ב-`.env`)
3. קבל גישה לכל הכלים:
   - **ייבוא וניתוח** - טען משחקים חדשים
   - **ניהול קבוצות** - ערוך מיפויים של קבוצות
   - **ניהול שחקנים** - ערוך מיפויים של שחקנים
   - **ניהול העברות** - אשר/דחה העברות
   - **כלים מתקדמים** - גיבוי, מיזוגים, וכלים נוספים

## 🔧 Deployment

### Deploy ל-Vercel

1. **Push לGitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin YOUR_GITHUB_REPO_URL
   git push -u origin main
   ```

2. **Deploy ל-Vercel**:
   - היכנס ל-[Vercel Dashboard](https://vercel.com/dashboard)
   - לחץ "Add New Project"
   - ייבא את ה-Repository מ-GitHub
   - הוסף Environment Variables:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
     - `ADMIN_PASSWORD`
   - לחץ "Deploy"

3. **הגדרות Vercel**:
   - Framework Preset: Other
   - Build Command: (השאר ריק)
   - Output Directory: `.`

## 🗂️ מבנה הפרויקט

```
basketball-stats-manager/
├── index.html              # דף ראשי
├── migrate_to_supabase.html # כלי העברת נתונים
├── supabase_schema.sql     # הגדרת טבלאות
├── package.json            # הגדרות פרויקט
├── vercel.json            # הגדרות Vercel
├── .gitignore             # קבצים שלא להעלות
├── env.example            # תבנית למשתני סביבה
├── SUPABASE_SETUP.md      # הדרכת התקנת Supabase
├── css/
│   └── styles.css         # עיצוב
└── js/
    ├── config.js          # הגדרות אפליקציה
    ├── auth.js            # אימות מנהל
    ├── db_adapter.js      # שכבת database
    ├── app_utils.js       # פונקציות עזר
    ├── app_db_save.js     # שמירה למסד
    ├── app_teams_ui.js    # ניהול קבוצות
    ├── app_events.js      # טיפול באירועים
    ├── app_bootstrap.js   # אתחול
    ├── app_last_mile.js   # פונקציות סופיות
    ├── app_game_analysis.js # ניתוח משחקים
    ├── gameAnalysis.js    # אלגוריתמי ניתוח
    ├── preGamePrep.js     # הכנה למשחק
    ├── preGameNarratives.js # נרטיבים למשדרים
    ├── team_merge_tool.js # מיזוג קבוצות
    └── player_merge_tool.js # מיזוג שחקנים
```

## 🔐 אבטחה

- **Row Level Security (RLS)** - קריאה ציבורית, כתיבה רק למשתמשים מאומתים
- **Admin Authentication** - גישה לכלי ניהול מוגנת בסיסמה
- **HTTPS** - חיבור מוצפן דרך Vercel
- **Environment Variables** - מפתחות רגישים לא נשמרים בקוד

## 💾 Backup & Restore

### גיבוי

1. היכנס כמנהל
2. עבור ל-"כלים מתקדמים"
3. לחץ "גיבוי מסד נתונים"
4. שמור את קובץ ה-JSON

### שחזור

1. היכנס כמנהל
2. עבור ל-"כלים מתקדמים"
3. לחץ "שחזור מגיבוי"
4. בחר את קובץ ה-JSON

## 📊 Database Schema

הפרויקט משתמש ב-9 טבלאות ראשיות:

- `games` - נתוני משחקים
- `players` - סטטיסטיקות שחקנים
- `teams` - נתוני קבוצות
- `player_mappings` - מיפוי שמות שחקנים
- `player_aliases` - שמות נוספים לשחקנים
- `appearances` - הופעות שחקנים במשחקים
- `player_stats` - סטטיסטיקות מפורטות
- `transfer_events` - העברות שחקנים
- `team_aliases` - שמות נוספים לקבוצות

## 🆘 Troubleshooting

### הנתונים לא מוצגים

- ודא שהטבלאות ב-Supabase נוצרו (הרץ `supabase_schema.sql`)
- בדוק שה-Environment Variables נכונים
- פתח Console (F12) לבדיקת שגיאות

### לא ניתן להתחבר כמנהל

- ודא שה-`ADMIN_PASSWORD` מוגדר נכון
- נקה את ה-localStorage ונסה שוב
- בדוק את ה-Console לשגיאות

### שגיאת CORS בטעינת JSON

- השתמש בכפתור "פתח קישור" והעתק ידנית
- התקן הרחבה כמו "CORS Unblock"
- או השתמש בדפדפן עם `--disable-web-security`

## 🤝 Contributing

תרומות מתקבלות בברכה! אנא:

1. Fork the repository
2. צור branch חדש (`git checkout -b feature/amazing-feature`)
3. Commit השינויים (`git commit -m 'Add amazing feature'`)
4. Push ל-branch (`git push origin feature/amazing-feature`)
5. פתח Pull Request

## 📝 License

MIT License - ראה [LICENSE](LICENSE) לפרטים נוספים.

## 📞 Contact

יש שאלות? פתח Issue או צור קשר דרך GitHub.

---

Made with ❤️ for Israeli Basketball

