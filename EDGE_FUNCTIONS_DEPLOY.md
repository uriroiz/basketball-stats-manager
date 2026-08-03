# Supabase Edge Functions - מדריך פריסה מאובטח

ה־Edge Functions מקבלות JWT תקף של משתמש Supabase Auth ומאשרות פעולות כתיבה רק כאשר
`app_metadata.role` שווה ל־`admin`. אין להגדיר או לשלוח סיסמת מנהל משותפת.

## דרישות

- Supabase CLI מחובר לפרויקט.
- משתמש מנהל ב־Supabase Auth.
- metadata בלתי ניתן לשינוי מהקליינט:

```sql
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb)
  || '{"role":"admin"}'::jsonb
WHERE email = 'admin@example.com';
```

## פריסה

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
supabase secrets set ALLOWED_ORIGINS="https://basketball-stats-manager.vercel.app"
supabase functions deploy save-game save-team save-player delete-game delete-player recalculate-stats clean-orphaned-games
```

אין להשתמש ב־`--no-verify-jwt`; כל הפונקציות מוגדרות עם `verify_jwt = true`.
`SUPABASE_URL`, `SUPABASE_ANON_KEY` ו־`SUPABASE_SERVICE_ROLE_KEY` זמינים לפונקציות באופן אוטומטי.

## בדיקה

1. התחבר דרך מסך המנהל עם האימייל והסיסמה של משתמש ה־Auth.
2. בצע פעולת כתיבה קטנה ובדוק שהצליחה.
3. התנתק וודא שאותה פעולה מחזירה `401`.
4. התחבר כמשתמש ללא role מנהל וודא שהפעולה מחזירה `403`.
5. בדוק לוגים דרך Dashboard > Edge Functions > Logs.

קריאה ציבורית נשארת תחת RLS. כתיבה ישירה וכתיבה דרך Edge Functions מוגבלות למנהל.
