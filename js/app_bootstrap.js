// Bootstrap: ensure DB and indices are ready before any save attempts
window.addEventListener('load', async () => {
  try {
    if (typeof initDb === 'function') {
      await initDb();
    }
    if (typeof loadTeamsIndex === 'function') {
      await loadTeamsIndex();
    }
    if (typeof loadPlayerMappingsIndex === 'function') {
      await loadPlayerMappingsIndex();
    }
    if (typeof listTeams === 'function') {
      await listTeams();
    }
    if (typeof setNextGameSerialToUI === 'function') {
      await setNextGameSerialToUI();
    }
    if (typeof initFormValidation === 'function') {
      initFormValidation();
    }
    if (typeof initGameAnalysis === 'function') {
      initGameAnalysis();
    }
    if (typeof initPlayerMergeTool === 'function') {
      initPlayerMergeTool();
    }

    // Small visual cue
    if (typeof DB_AVAILABLE !== 'undefined' && !DB_AVAILABLE) {
      typeof showError === 'function' && showError("מסד הנתונים המקומי אינו זמין (ייתכן חלון פרטי/אורח).");
    }
  } catch (err) {
    console.error('Bootstrap init error:', err);
    if (typeof showError === 'function') {
      showError('שגיאה באתחול: ' + (err && err.message ? err.message : err));
    }
  }
});
