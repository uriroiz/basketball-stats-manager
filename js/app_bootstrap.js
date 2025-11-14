// Bootstrap: ensure DB and indices are ready before any save attempts
window.addEventListener('load', async () => {
  console.log('=== Application Bootstrap Starting ===');
  
  try {
    // 1. Initialize database FIRST and WAIT for it
    if (typeof initDb === 'function') {
      console.log('📦 Initializing database...');
      await initDb();
      console.log('✅ Database initialized');
    } else {
      console.error('❌ initDb function not found!');
    }

    // 2. Wait additional time for dbAdapter to be ready
    if (typeof window.ensureDbReady === 'function') {
      console.log('⏳ Ensuring dbAdapter is ready...');
      await window.ensureDbReady();
      console.log('✅ dbAdapter confirmed ready');
    }

    // 3. Load indices
    if (typeof loadTeamsIndex === 'function') {
      await loadTeamsIndex();
    }
    if (typeof loadPlayerMappingsIndex === 'function') {
      await loadPlayerMappingsIndex();
    }

    // 4. Load initial teams data (for manageTeams tab)
    if (typeof listTeams === 'function') {
      console.log('📋 Loading teams...');
      await listTeams();
    } else {
      console.warn('⚠️ listTeams function not found');
    }

    // 5. Other initialization
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

    // 6. Load initial data for default "games" tab
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

    console.log('✅ Bootstrap complete');
    
  } catch (err) {
    console.error('❌ Bootstrap initialization error:', err);
    if (typeof showError === 'function') {
      showError('שגיאה באתחול: ' + (err && err.message ? err.message : err));
    } else {
      alert('אירעה שגיאה באתחול האפליקציה. אנא רענן את הדף.');
    }
  }
});
