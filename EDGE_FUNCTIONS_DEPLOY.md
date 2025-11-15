# Supabase Edge Functions - מדריך Deploy

## מה זה Edge Functions?

Edge Functions הן פונקציות serverless שרצות ב-Deno על השרתים של Supabase. הן מאפשרות לך להריץ קוד בצד השרת עם גישה ל-Service Role Key (שעוקף את Row Level Security), מה שמאפשר לאדמין לשמור נתונים באופן מאובטח.

---

## 📋 דרישות מקדימות

1. **Supabase CLI מותקן**
   ```bash
   npm install -g supabase
   ```

2. **Deno מותקן** (לבדיקה מקומית)
   - Windows: `choco install deno` או `scoop install deno`
   - אחר: https://deno.land/#installation

3. **חשבון Supabase** עם הפרויקט שלך

---

## 🚀 שלבי Deploy

### שלב 1: התחברות ל-Supabase

```bash
# התחבר ל-Supabase (יפתח דפדפן לאימות)
supabase login

# קישור הפרויקט המקומי לפרויקט ב-Supabase
supabase link --project-ref YOUR_PROJECT_REF
```

**איפה מוצאים את PROJECT_REF?**
- עבור ל-Supabase Dashboard
- בחר בפרויקט שלך
- ה-URL יהיה: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

---

### שלב 2: הגדרת Environment Variables

Edge Functions צריכות את המשתנים הבאים:
- `ADMIN_PASSWORD` - הסיסמה לאימות אדמין
- `SUPABASE_URL` - (אוטומטי)
- `SUPABASE_SERVICE_ROLE_KEY` - (אוטומטי)

**הגדר את ADMIN_PASSWORD:**

```bash
# הגדרת סיסמה בסביבת Production
supabase secrets set ADMIN_PASSWORD="your_secure_password_here"

# בדיקה שהסיסמה נשמרה
supabase secrets list
```

⚠️ **חשוב:** השתמש באותה סיסמה שהגדרת ב-`env.js` / Vercel Environment Variables!

---

### שלב 3: Deploy של Edge Functions

```bash
# Deploy של כל ה-Functions בפעם אחת
supabase functions deploy

# או Deploy של function ספציפית
supabase functions deploy save-game
supabase functions deploy save-team
```

---

### שלב 4: אימות ה-Deploy

```bash
# קבלת רשימת Functions שפורסמו
supabase functions list

# צפייה בלוגים של Function
supabase functions logs save-game
```

---

## 🧪 בדיקה מקומית (אופציונלי)

לפני Deploy, אפשר להריץ את ה-Edge Functions מקומית:

### 1. התחל את Supabase Local Development

```bash
supabase start
```

זה יפעיל:
- Local Postgres DB
- Local API Gateway
- Local Edge Functions Runtime

### 2. הגדר משתני סביבה מקומיים

צור קובץ `.env` בתיקייה הראשית:

```env
ADMIN_PASSWORD=your_password_here
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_ROLE_KEY=your_local_service_role_key
```

**איפה מוצאים את LOCAL SERVICE_ROLE_KEY?**
כשאתה מריץ `supabase start`, זה מדפיס את ה-keys. חפש:
```
service_role key: eyJh...
```

### 3. הרץ Edge Function מקומית

```bash
supabase functions serve save-game
```

Edge Function תהיה זמינה ב:
```
http://localhost:54321/functions/v1/save-game
```

### 4. בדוק עם cURL

```bash
curl -X POST http://localhost:54321/functions/v1/save-game \
  -H "Content-Type: application/json" \
  -H "x-admin-password: your_password_here" \
  -H "apikey: YOUR_ANON_KEY" \
  -d '{
    "gameData": {
      "gameSerial": 999,
      "date": "2025-01-19",
      "cycle": "1",
      "teams": ["Test Team 1", "Test Team 2"],
      "timestamp": "2025-01-19T12:00:00Z",
      "originalJson": "{}"
    },
    "playersData": []
  }'
```

---

## 🔒 אבטחה

### Row Level Security (RLS)

אחרי Deploy של Edge Functions, **אפשר להפעיל RLS מחדש**:

```sql
-- Enable RLS on all tables
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Create policies: Allow READ for everyone, but WRITE only via Service Role
DROP POLICY IF EXISTS "Allow all operations on games" ON public.games;
DROP POLICY IF EXISTS "Allow all operations on players" ON public.players;
DROP POLICY IF EXISTS "Allow all operations on teams" ON public.teams;

-- Games policies
CREATE POLICY "Allow read access for all" ON public.games FOR SELECT USING (true);
CREATE POLICY "Allow insert for service role only" ON public.games FOR INSERT WITH CHECK (false);
CREATE POLICY "Allow update for service role only" ON public.games FOR UPDATE USING (false);
CREATE POLICY "Allow delete for service role only" ON public.games FOR DELETE USING (false);

-- Players policies
CREATE POLICY "Allow read access for all" ON public.players FOR SELECT USING (true);
CREATE POLICY "Allow insert for service role only" ON public.players FOR INSERT WITH CHECK (false);
CREATE POLICY "Allow update for service role only" ON public.players FOR UPDATE USING (false);
CREATE POLICY "Allow delete for service role only" ON public.players FOR DELETE USING (false);

-- Teams policies
CREATE POLICY "Allow read access for all" ON public.teams FOR SELECT USING (true);
CREATE POLICY "Allow insert for service role only" ON public.teams FOR INSERT WITH CHECK (false);
CREATE POLICY "Allow update for service role only" ON public.teams FOR UPDATE USING (false);
CREATE POLICY "Allow delete for service role only" ON public.teams FOR DELETE USING (false);
```

**למה זה בטוח?**
- משתמשים רגילים (Anon Key) יכולים רק **לקרוא** נתונים
- רק Edge Functions (Service Role Key) יכולות **לכתוב** נתונים
- Edge Functions בודקות את הסיסמה לפני כתיבה

---

## 🐛 פתרון בעיות

### שגיאה: "Function not found"
```bash
# ודא ש-Function פורסמה
supabase functions list

# נסה Deploy שוב
supabase functions deploy save-game --no-verify-jwt
```

### שגיאה: "Unauthorized"
- ודא שהסיסמה ב-`supabase secrets` זהה לזו שבקוד
- בדוק את הלוגים: `supabase functions logs save-game`

### שגיאה: "CORS error"
- Edge Functions כבר כוללות CORS headers
- ודא שה-headers הנכונים נשלחים מהקליינט (`x-admin-password`, `apikey`)

### Edge Function לא מקבלת requests
```bash
# בדוק status של Function
supabase functions inspect save-game

# צפה בלוגים בזמן אמת
supabase functions logs save-game --tail
```

---

## 📝 עדכון Functions

אחרי שינוי בקוד:

```bash
# Deploy מחדש
supabase functions deploy save-game

# בדוק שהשינוי עבר
supabase functions logs save-game --tail
```

---

## 💡 טיפים

1. **תמיד בדוק לוגים** אחרי Deploy:
   ```bash
   supabase functions logs save-game --tail
   ```

2. **שמור את PROJECT_REF** במקום בטוח - תצטרך אותו בכל Deploy

3. **עדכן סיסמה בכל המקומות**:
   - `env.js` (לפיתוח מקומי)
   - Vercel Environment Variables
   - Supabase Secrets: `supabase secrets set ADMIN_PASSWORD="new_password"`

4. **בדוק ש-RLS מופעל** בטבלאות לפני Deploy ציבורי

---

## ✅ סיימת!

אחרי שה-Edge Functions פורסמו, האפליקציה שלך:
- ✅ משתמשת ב-Edge Functions לכתיבה (מאובטח)
- ✅ משתמשת ב-Direct Supabase לקריאה (מהיר)
- ✅ מוגנת ב-RLS (רק קריאה ציבורית)
- ✅ דורשת אימות אדמין לכתיבה

**🎉 הפרויקט שלך מאובטח ומוכן לפרסום!**

