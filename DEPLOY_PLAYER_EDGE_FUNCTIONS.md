# Deploy Player Edge Functions to Supabase

## פריסה

```powershell
supabase db push
supabase functions deploy save-player delete-player
```

## בדיקה

1. התחבר כמנהל באמצעות משתמש Supabase Auth ש־`app_metadata.role` שלו הוא `admin`.
2. עבור לכלים המתקדמים ובצע איחוד ניסוי.
3. ודא ששמירת שחקן ומחיקת שחקן הצליחו.
4. התנתק וודא שניסיון חוזר נחסם.

הקליינט שולח JWT ב־`Authorization: Bearer ...`. ה־functions מאמתות את המשתמש לפני שימוש ב־service role, ו־RLS נשאר פעיל.
