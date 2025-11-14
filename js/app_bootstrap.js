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

    // Load initial data for default "games" tab
    console.log('🎬 [bootstrap] Loading default games tab');
    if (typeof renderGamesTable === 'function') {
      await renderGamesTable();
    }
    if (typeof renderTeamsAggregate === 'function') {
      // Pre-load teams data (not visible but cached)
      await renderTeamsAggregate();
    }
    if (typeof renderPlayersTable === 'function') {
      // Pre-load players data (not visible but cached)
      await renderPlayersTable();
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
