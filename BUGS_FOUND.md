# 🐛 Basketball Stats Manager - Bug Report

## Critical Issues Found

### 🔴 Issue #1: Missing Player Merge Tool Initialization
**File:** `js/app_bootstrap.js`  
**Severity:** HIGH  
**Description:** The `initPlayerMergeTool()` function is never called during application bootstrap, meaning the player merge feature buttons do not have event listeners attached.

**Location:** Should be added in `app_bootstrap.js` window load event  
**Impact:** Player merge functionality is non-functional - buttons won't respond to clicks

---

### 🔴 Issue #2: Missing Team Merge Tool Initialization  
**File:** `js/app_bootstrap.js`  
**Severity:** HIGH  
**Description:** The `setupTeamMergeEventListeners()` function is never called during application bootstrap, meaning the team merge feature buttons do not have event listeners attached.

**Location:** Should be added in `app_bootstrap.js` window load event  
**Impact:** Team merge functionality is non-functional - buttons won't respond to clicks

---

### 🟡 Issue #3: Missing Event Listener Wiring in app_events.js
**File:** `js/app_events.js`  
**Severity:** MEDIUM  
**Description:** Event listeners for the following buttons are not set up in `app_events.js`:
- `scanPlayerAliasesBtn` (line 20 in `player_merge_tool.js`)
- `mergePlayersBtn` (line 24 in `player_merge_tool.js`)  
- `scanTeamAliasesBtn` (line 30 in `team_merge_tool.js`)
- `mergeTeamsBtn` (line 32 in `team_merge_tool.js`)

**Current Status:** These functions ARE defined in their respective modules, but are NOT wired up to the button click events through `app_events.js`

**Impact:** Users cannot trigger team/player merge operations through the UI

---

### 🟡 Issue #4: Incomplete Database Version Handling
**File:** `js/app_utils.js` (lines 455-465)  
**Severity:** MEDIUM  
**Description:** 
```javascript
if (DB.version < REQUIRED_DB_VERSION) {
  DB.close();
  DB_AVAILABLE = false;
  // ... error handling
  resolve(null);  // ← ISSUE: Resolution happens AFTER close, causing state conflicts
}
```

When database version is less than required, the database is closed but `DB_AVAILABLE` is set to true in `onsuccess` first (line 451), then immediately set to false (line 457). This creates a race condition.

**Impact:** Database version conflicts may not be handled cleanly

---

## Summary of Affected Features

### ❌ **Non-Functional Features:**
1. **Player Merge Tool** - Cannot scan or merge players with duplicate names
2. **Team Merge Tool** - Cannot merge team aliases or consolidate team names
3. **Import/Export Advanced Tools** - Some buttons may not be responsive

### ✅ **Functional Features:**
- Game parsing and statistics
- Team management (basic)
- Player management (basic)  
- Game preparation analysis
- Database backup/restore

---

## Recommended Fixes

### Fix #1: Update `js/app_bootstrap.js`
Add initialization calls for the merge tools:
```javascript
if (typeof initPlayerMergeTool === 'function') {
  initPlayerMergeTool();
}
if (typeof setupTeamMergeEventListeners === 'function') {
  setupTeamMergeEventListeners();
}
```

### Fix #2: Verify Event Listener Setup
Ensure `app_events.js` includes event wiring for merge tool buttons, or remove the initialization calls and let the modules self-initialize.

### Fix #3: Refactor Database Version Handling
Move the version check before setting `DB_AVAILABLE = true` to prevent race conditions.

---

## Testing Checklist

- [ ] Player merge buttons respond to clicks
- [ ] Team merge buttons respond to clicks
- [ ] Scan operations complete without errors
- [ ] Merge operations complete without errors
- [ ] Database version conflicts handled cleanly


