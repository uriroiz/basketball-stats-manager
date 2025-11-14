# Supabase Setup Guide

## שלב 1: יצירת חשבון והפרויקט

1. היכנס ל-[Supabase](https://supabase.com) והירשם (חינמי לחלוטין)
2. לחץ על "New Project"
3. מלא את הפרטים:
   - **Name**: Basketball Stats Manager (או כל שם שתבחר)
   - **Database Password**: שמור סיסמה חזקה (תצטרך אותה רק לגישה ישירה ל-DB)
   E?Mw&?-+RKf8K3.
   - **Region**: בחר את האזור הקרוב ביותר (Europe West או Middle East אם זמין)
4. לחץ "Create new project" והמתן כ-2 דקות עד שהפרויקט מוכן

## שלב 2: קבלת המפתחות

1. בפרויקט שלך, לך ל-**Settings** (משמאל למטה) → **API**
2. העתק את הערכים הבאים:
   - **Project URL** (למשל: `https://xxxxx.supabase.co`)
   https://ruzfbkxiqusfbiyxyegb.supabase.co
   - **anon/public key** (מפתח ארוך שמתחיל ב-`eyJ...`)
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1emZia3hpcXVzZmJpeXh5ZWdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMxMTkyNDEsImV4cCI6MjA3ODY5NTI0MX0.UjzpGJ9Xx_T-74FBamNF9T7pQWyEFgcSYf_TkQs3E38
3. שמור אותם - תצטרך להוסיף ל-`.env` מקומית ול-Vercel

## שלב 3: יצירת הטבלאות

1. לך ל-**SQL Editor** (בתפריט השמאלי)
2. לחץ על **"New query"**
3. העתק והדבק את הקוד SQL מ-`supabase_schema.sql` (קובץ בפרויקט)
4. לחץ **Run** (או Ctrl+Enter)
5. אם הכל עבר בהצלחה, תראה הודעת הצלחה

## שלב 4: הגדרת אבטחה (Row Level Security)

הקוד SQL כבר מגדיר את כל כללי האבטחה:
- **קריאה ציבורית**: כל אחד יכול לקרוא מטבלאות games, players, teams
- **כתיבה מוגנת**: רק משתמשים מאושרים (authenticated) יכולים לכתוב
- זה מספיק למבנה הפשוט שלנו

## שלב 5: בדיקה

1. לך ל-**Table Editor** (בתפריט)
2. בדוק שהטבלאות נוצרו: games, players, teams, וכו'
3. הטבלאות צריכות להיות ריקות כרגע - נמלא אותן בשלב הבא

## הערות חשובות

- **גבולות החינמיים של Supabase**:
  - 500MB מקום בדאטאבייס
  - 2GB העברת נתונים (bandwidth) לחודש
  - 50,000 משתמשים פעילים לחודש
  - זה מספיק בשפע לפרויקט הסטטיסטיקות

- **גיבויים**: Supabase עושה גיבויים אוטומטיים, אבל מומלץ לעשות גיבוי ידני מפעם לפעם דרך הכפתור "Backup Database" באפליקציה

## מה הלאה?

לאחר שהפרויקט ב-Supabase מוכן:
1. צור קובץ `.env` בפרויקט (על בסיס `env.example`)
2. הדבק את Project URL ו-anon key
3. המשך להרצת האפליקציה והעברת הנתונים הקיימים

