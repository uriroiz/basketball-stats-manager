# 🚀 מדריך העלאה ל-Production

מדריך שלב אחר שלב להעלאת Basketball Stats Manager לענן.

## שלב 1: הכנת Supabase

### 1.1 יצירת חשבון והפרויקט

1. היכנס ל-[Supabase](https://supabase.com)
2. לחץ "Start your project"
3. הירשם עם GitHub או Email
4. לחץ "New Project"
5. מלא:
   - **Name**: Basketball Stats Manager
   - **Database Password**: בחר סיסמה חזקה (שמור אותה!)
   - **Region**: בחר אזור קרוב (Europe West מומלץ)
6. לחץ "Create new project" והמתן ~2 דקות

### 1.2 קבלת מפתחות API

1. בפרויקט שלך, לך ל-**Settings** → **API**
2. העתק:
   - **Project URL** (למשל: `https://xxxxx.supabase.co`)
   - **anon/public key** (מפתח ארוך שמתחיל ב-`eyJ...`)
3. שמור אותם בצד - תצטרך אותם!

### 1.3 יצירת טבלאות

1. לך ל-**SQL Editor** (בתפריט השמאלי)
2. לחץ "New query"
3. פתח את הקובץ `supabase_schema.sql` מהפרויקט
4. העתק את כל התוכן והדבק בעורך
5. לחץ **Run** (או Ctrl+Enter)
6. ודא שקיבלת הודעת הצלחה ירוקה

### 1.4 בדיקה

1. לך ל-**Table Editor**
2. ודא שהטבלאות נוצרו:
   - games
   - players
   - teams
   - player_mappings
   - player_aliases
   - appearances
   - player_stats
   - transfer_events
   - team_aliases

✅ Supabase מוכן!

---

## שלב 2: העברת נתונים קיימים (אופציונלי)

אם יש לך נתונים מקומיים שאתה רוצה להעביר:

### 2.1 הכן את קובץ ההעברה

1. פתח את `migrate_to_supabase.html` **באותו דפדפן** שבו עבדת עד כה
2. הדבק את ה-**Supabase URL** וה-**Anon Key** שהעתקת
3. לחץ "🔌 בדוק חיבור"
4. אם החיבור הצליח, לחץ "▶️ התחל העברה"
5. המתן עד שהעברה תושלם (עשוי לקחת מספר דקות)

✅ הנתונים הועברו!

---

## שלב 3: העלאה ל-GitHub

### 3.1 יצירת Repository

1. היכנס ל-[GitHub](https://github.com)
2. לחץ על ה-**+** בפינה הימנית → **New repository**
3. מלא:
   - **Repository name**: `basketball-stats-manager`
   - **Description**: "Basketball Statistics Manager with IBBA Protocol Support"
   - **Public** או **Private** (בחר לפי העדפה)
   - **אל תסמן** "Add a README" (כבר יש לנו)
4. לחץ "Create repository"

### 3.2 העלאת הקוד

פתח terminal/command prompt בתיקיית הפרויקט והרץ:

```bash
# אתחול Git
git init

# הוסף את כל הקבצים
git add .

# Commit ראשון
git commit -m "Initial commit - Basketball Stats Manager"

# קישור ל-GitHub (החלף YOUR_USERNAME ו-YOUR_REPO בשלך)
git remote add origin https://github.com/YOUR_USERNAME/basketball-stats-manager.git

# העלאה
git branch -M main
git push -u origin main
```

✅ הקוד ב-GitHub!

---

## שלב 4: Deploy ל-Vercel

### 4.1 יצירת חשבון והתחברות

1. היכנס ל-[Vercel](https://vercel.com)
2. לחץ "Sign Up" ובחר **Continue with GitHub**
3. אשר את הגישה לGitHub

### 4.2 ייבוא הפרויקט

1. בדשבורד של Vercel, לחץ "Add New..." → "Project"
2. מצא את ה-repository `basketball-stats-manager`
3. לחץ "Import"

### 4.3 הגדרת Environment Variables

**זה השלב החשוב ביותר!**

בדף ההגדרות:

1. לחץ על "Environment Variables"
2. הוסף 3 משתנים:

**משתנה 1:**
- **Name**: `VITE_SUPABASE_URL`
- **Value**: ה-URL מ-Supabase (למשל: `https://xxxxx.supabase.co`)
- **Environments**: סמן Production, Preview, Development

**משתנה 2:**
- **Name**: `VITE_SUPABASE_ANON_KEY`
- **Value**: ה-Anon Key מ-Supabase (למפתח הארוך)
- **Environments**: סמן Production, Preview, Development

**משתנה 3:**
- **Name**: `ADMIN_PASSWORD`
- **Value**: סיסמה לכניסת מנהל (בחר סיסמה חזקה!)
- **Environments**: סמן Production, Preview, Development

### 4.4 הגדרות Build

- **Framework Preset**: Other
- **Build Command**: (השאר ריק)
- **Output Directory**: `.` (נקודה בודדת)
- **Install Command**: (השאר ריק)

### 4.5 Deploy!

1. לחץ **"Deploy"**
2. המתן 1-2 דקות
3. 🎉 האתר שלך באוויר!

✅ האתר פעיל ב-Production!

---

## שלב 5: הגדרת משתני סביבה באתר Live

כדי שהאתר יעבוד עם Supabase, צריך להעביר את המשתנים גם לדף עצמו.

### 5.1 יצירת קובץ config חיצוני

צור קובץ `env.js` בתיקיית הפרויקט:

```javascript
window.SUPABASE_URL = 'YOUR_SUPABASE_URL_HERE';
window.SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY_HERE';
window.ADMIN_PASSWORD = 'YOUR_ADMIN_PASSWORD_HERE';
```

### 5.2 עדכן את index.html

הוסף את השורה הזו ב-`<head>` לפני כל הסקריפטים האחרים:

```html
<script src="env.js"></script>
```

### 5.3 Push את השינויים

```bash
git add env.js index.html
git commit -m "Add environment configuration"
git push
```

Vercel יעשה deploy אוטומטי!

⚠️ **חשוב**: אל תעלה את `env.js` עם הערכים האמיתיים ל-GitHub אם ה-repo ציבורי!
במקום זה, השתמש ב-Vercel Environment Variables.

---

## שלב 6: בדיקה

### 6.1 בדוק שהאתר עובד

1. לחץ על ה-URL שVercel נתן לך
2. ודא שהעמוד נטען
3. בדוק שיש טאבים גלויים: "כל המשחקים", "סטטיסטיקות קבוצתיות", וכו'
4. הטאבים הפרטיים צריכים להיות מוסתרים

### 6.2 בדוק התחברות מנהל

1. לחץ "🔐 כניסת מנהל"
2. הזן את הסיסמה שהגדרת ב-Environment Variables
3. ודא שהטאבים הפרטיים מופיעים
4. נסה לטעון משחק חדש (אם יש לך JSON)

### 6.3 בדוק חיבור ל-Supabase

1. פתח Console (F12)
2. חפש הודעה "✅ Supabase initialized"
3. אם אתה רואה "ℹ️ Supabase not configured" - בדוק את ה-Environment Variables

---

## 🎉 סיימנו!

האתר שלך עכשיו:
- ✅ פועל בענן עם Vercel
- ✅ מחובר ל-Supabase
- ✅ מאובטח עם authentication
- ✅ זמין לכולם באינטרנט

---

## 📝 עדכונים עתידיים

כשתרצה לעדכן את האתר:

```bash
# ערוך קבצים
# ...

# Commit
git add .
git commit -m "תיאור השינוי"

# Push
git push
```

Vercel יעשה deploy אוטומטית!

---

## 🆘 בעיות נפוצות

### האתר לא טוען

- בדוק ב-Console (F12) האם יש שגיאות
- ודא ש-Environment Variables הוגדרו נכון ב-Vercel
- נסה לעשות Redeploy ב-Vercel

### לא מצליח להתחבר כמנהל

- ודא שה-`ADMIN_PASSWORD` הוגדר נכון
- נקה Cache של הדפדפן
- נסה בחלון פרטי/incognito

### הנתונים לא מוצגים

- ודא שהטבלאות ב-Supabase נוצרו (שלב 1.3)
- בדוק ב-Supabase Table Editor שיש נתונים
- ודא שה-Row Level Security מוגדר נכון

### שגיאת CORS

- זה לא אמור לקרות ב-production דרך Vercel
- אם קורה, בדוק שה-Supabase URL נכון

---

## 📞 עזרה נוספת

- [Supabase Documentation](https://supabase.com/docs)
- [Vercel Documentation](https://vercel.com/docs)
- פתח Issue ב-GitHub Repository

