# Deploy Player Edge Functions to Supabase

## ✅ הצעדים הבאים:

### 1️⃣ פרסום Edge Functions:

```powershell
cd C:\Scripts\League_Stats
supabase functions deploy save-player delete-player
```

**תוצאה צפויה:**
```
Deploying Function: save-player
Uploading asset (save-player): supabase/functions/save-player/index.ts
Deploying Function: delete-player
Uploading asset (delete-player): supabase/functions/delete-player/index.ts
Deployed Functions on project ruzfbkxiqusfbiyxyegb: save-player, delete-player
```

---

### 2️⃣ בדיקה מקומית:

1. **רענן את `index.html`** (Ctrl+Shift+R)
2. **התחבר כמנהל** (סיסמה: `UriPixellot1982!`)
3. **עבור לכלים מתקדמים → איחוד ידני של שחקנים**
4. **טען שחקנים**
5. **בצע איחוד:**
   - מקור: רוברט טרנר
   - יעד: רוברט יוג'ין טרנר

---

### 3️⃣ לוגים צפויים:

```
✅ Merged games total: 6
📊 Recalculating stats for target player...
✅ Stats recalculated successfully
💾 Saving updated target player with 6 games
🔐 Checking authentication...
🔐 Admin password retrieved: YES (length: 16)
✅ Authentication OK, proceeding to save...
💾 Calling dbAdapter.savePlayer for target...
💾 Saving player via Edge Function (authenticated)...  ← חדש!
✅ Player saved via Edge Function: {...}              ← חדש!
🗑️ Deleting source player...
🗑️ Deleting player via Edge Function (authenticated)... ← חדש!
✅ Player deleted via Edge Function: {...}             ← חדש!
✅ איחוד הושלם בהצלחה!
```

---

### 4️⃣ אחרי הפרסום ובדיקה מוצלחת:

```powershell
git push origin main
```

---

## 🎯 מה השתנה:

1. **`dbSavePlayer`** - עכשיו שומר דרך Edge Function `save-player` עם Service Role Key
2. **`dbDeletePlayer`** - עכשיו מוחק דרך Edge Function `delete-player` עם Service Role Key
3. **שני Edge Functions חדשים** - מאפשרים לעקוף RLS באופן מאובטח
4. **RLS נשאר מופעל** - משתמשים רגילים לא יכולים לשנות נתונים ישירות

---

## ✅ תוצאה:

- ✅ איחוד שחקנים יעבוד!
- ✅ רוברט טרנר יאוחד לתוך רוברט יוג'ין טרנר
- ✅ סך הכל: 6 משחקים (1 + 5)
- ✅ רוברט טרנר יימחק מהמערכת
- ✅ המשתמשים הרגילים יראו רק את רוברט יוג'ין טרנר עם 6 משחקים

