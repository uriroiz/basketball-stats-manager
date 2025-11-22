# Basketball Stats Manager 🏀

מערכת לניהול וניתוח סטטיסטיקות כדורסל בזמן אמת מ-IBBA API.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/basketball-stats-manager)

## 🌟 Pure API Version 2.0

**גרסה חדשה!** המערכת עברה לגרסת Pure API - כל הנתונים נטענים בזמן אמת ישירות מ-ibasketball.co.il ללא צורך במסד נתונים.

### מה השתנה?

- ✅ **ללא צורך בהתקנה מורכבת** - פשוט פתח ותתחיל להשתמש
- ✅ **נתונים תמיד מעודכנים** - טעינה ישירה מה-API של IBBA
- ✅ **ללא צורך ב-Supabase** - אין צורך בהגדרת מסד נתונים
- ✅ **פריסה פשוטה** - העלאה ל-Vercel/GitHub Pages מיידית

> 💡 **מחפש את הגרסה הישנה עם Supabase?**  
> הגרסה הקודמת עם מסד נתונים זמינה ב-branch: [`archive/supabase-version`](https://github.com/YOUR_USERNAME/basketball-stats-manager/tree/archive/supabase-version)

## ✨ Features

- **All Games** - כל המשחקים שנשחקו בליגה
- **Team Statistics** - סטטיסטיקות קבוצתיות מצטברות
- **Player Statistics** - סטטיסטיקות שחקנים מפורטות
- **League Leaders** - מובילי הליגה בכל הקטגוריות (נקודות, ריבאונדים, אסיסטים, חטיפות, חסימות, אחוזי קליעה)
- **Game Preparation** - כלי הכנה למשחק עם ניתוחים מתקדמים:
  - משחקים קרובים מהליגה
  - השוואת קבוצות ושחקנים
  - מפגשים ישירים בעונה
  - ממוצעים ו-5 משחקים אחרונים
  - ניתוח פרה-גיים לשדרנים

## 🚀 Quick Start

### דרישות מוקדמות

- דפדפן מודרני (Chrome, Firefox, Safari, Edge)
- אין צורך בכלים נוספים!

### שימוש מקומי

1. **Clone the repository**:
```bash
git clone https://github.com/YOUR_USERNAME/basketball-stats-manager.git
cd basketball-stats-manager
```

2. **הרץ שרת מקומי**:
```bash
# עם Python
python -m http.server 8000

# או עם Node.js (npx)
npx serve .

# או פשוט פתח את index.html בדפדפן
```

3. **פתח בדפדפן**:
   - גלוש ל-http://localhost:8000 (אם השתמשת בשרת)
   - או פתח את `index.html` ישירות

זהו! המערכת תטען את כל הנתונים אוטומטית מ-API.

## 📖 שימוש

### טעינת נתונים

המערכת טוענת אוטומטית את:
- כל המשחקים שנשחקו
- סטטיסטיקות קבוצות ושחקנים
- טבלת העונה
- משחקים קרובים

### ניווט בטאבים

1. **כל המשחקים** - צפה בכל המשחקים עם אפשרות סינון לפי מחזור/קבוצה
2. **סטטיסטיקות קבוצתיות** - סטטיסטיקות מצטברות לכל קבוצה
3. **סטטיסטיקות שחקנים** - סטטיסטיקות מפורטות לכל שחקן
4. **מובילי הליגה** - הדירוג בכל הקטגוריות המרכזיות
5. **הכנה למשחק** - כלי ניתוח למשחק הבא

### הכנה למשחק

הטאב "הכנה למשחק" מאפשר:
- בחירת שתי קבוצות להשוואה
- צפייה בסטטיסטיקות מפורטות
- השוואת שחקנים
- ניתוח 5 משחקים אחרונים
- מפגשים ישירים בעונה
- יצירת ניתוח פרה-גיים מוכן לשדרנים

## 🔧 Deployment

### Deploy ל-Vercel (מומלץ)

1. **Push לGitHub**:
   ```bash
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/basketball-stats-manager.git
   git push -u origin main
   ```

2. **Deploy ל-Vercel**:
   - היכנס ל-[Vercel Dashboard](https://vercel.com/dashboard)
   - לחץ "Add New Project"
   - ייבא את ה-Repository מ-GitHub
   - לחץ "Deploy"

3. **זהו!** אין צורך בהגדרות נוספות או environment variables.

### Deploy ל-GitHub Pages

1. **עבור להגדרות הריפוזיטורי ב-GitHub**
2. **Settings → Pages**
3. **בחר Branch: main**
4. **לחץ Save**

האתר יהיה זמין ב-`https://YOUR_USERNAME.github.io/basketball-stats-manager/`

## 🗂️ מבנה הפרויקט

```
basketball-stats-manager/
├── index.html              # דף ראשי - Pure API Dashboard
├── ibba_dashboard_v1.html  # קובץ המקור (גיבוי)
├── package.json            # הגדרות פרויקט
├── vercel.json            # הגדרות Vercel
├── css/
│   └── styles.css         # עיצוב מותאם אישית
└── js/
    ├── config.js          # הגדרות אפליקציה
    ├── ibba/
    │   ├── ibba_adapter.js      # מתאם API
    │   ├── ibba_analytics.js    # חישובי סטטיסטיקות
    │   └── ibba_player_names.js # ניהול שמות שחקנים
    └── app_upcoming_games_pure.js # משחקים קרובים
```

## 🆘 Troubleshooting

### הנתונים לא נטענים

- בדוק את חיבור האינטרנט
- פתח Console (F12) לבדיקת שגיאות
- נסה לרענן את העמוד

### שגיאת CORS בטעינה

- השתמש בשרת מקומי (Python/Node.js) ולא בפתיחה ישירה של הקובץ
- או השתמש ב-Chrome עם `--disable-web-security` (בזהירות)
- או התקן הרחבה כמו "CORS Unblock"

### הנתונים איטיים להיטען

- זה תלוי במהירות ה-API של IBBA
- המערכת מציגה progress bar במהלך הטעינה
- אפשר לסנן לפי מחזור ספציפי לטעינה מהירה יותר

## 🎯 היתרונות של Pure API

1. **פשטות** - ללא צורך בהתקנה מורכבת או הגדרת מסד נתונים
2. **עדכניות** - הנתונים תמיד מעודכנים מהמקור
3. **אמינות** - ללא תלות בשרת חיצוני או מסד נתונים
4. **נייד** - אפשר להעביר את כל הפרויקט בקובץ HTML בודד
5. **חינמי** - ללא עלויות של Supabase או כל שירות cloud אחר

## 📊 טכנולוגיות

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Styling**: Tailwind CSS (via CDN)
- **API**: IBBA Official API (ibasketball.co.il)
- **Deployment**: Vercel / GitHub Pages

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

## 🔗 קישורים שימושיים

- [Demo Live](https://basketball-stats-manager.vercel.app/)
- [GitHub Repository](https://github.com/YOUR_USERNAME/basketball-stats-manager)
- [IBBA Official Website](https://ibasketball.co.il)
- [גרסת Supabase (ארכיון)](https://github.com/YOUR_USERNAME/basketball-stats-manager/tree/archive/supabase-version)

---

**Made with ❤️ for Israeli Basketball**

**Version 2.0** - Pure API Edition
