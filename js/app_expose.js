// --- Stage 1/2: stable namespace exposure to avoid broken globals ---
(function(){
  try {
    var _App = (window.App && typeof window.App==='object') ? window.App : {};
    Object.defineProperty(_App, 'DB_AVAILABLE', { get: function(){ try { return DB_AVAILABLE; } catch(e){ return false; } } });
    Object.defineProperty(_App, 'DB', { get: function(){ try { return DB; } catch(e){ return null; } } });
    if (typeof initDb !== 'undefined') _App['initDb'] = initDb;
    if (typeof loadTeamsIndex !== 'undefined') _App['loadTeamsIndex'] = loadTeamsIndex;
    if (typeof loadPlayerMappingsIndex !== 'undefined') _App['loadPlayerMappingsIndex'] = loadPlayerMappingsIndex;
    if (typeof setNextGameSerialToUI !== 'undefined') _App['setNextGameSerialToUI'] = setNextGameSerialToUI;
    if (typeof listTeams !== 'undefined') _App['listTeams'] = listTeams;
    if (typeof listPlayerMappings !== 'undefined') _App['listPlayerMappings'] = listPlayerMappings;
    if (typeof initFormValidation !== 'undefined') _App['initFormValidation'] = initFormValidation;
    if (typeof renderTeamsAggregate !== 'undefined') _App['renderTeamsAggregate'] = renderTeamsAggregate;
    if (typeof renderPlayersTable !== 'undefined') _App['renderPlayersTable'] = renderPlayersTable;
    if (typeof renderGamesTable !== 'undefined') _App['renderGamesTable'] = renderGamesTable;
    if (typeof switchTab !== 'undefined') _App['switchTab'] = switchTab;
    if (typeof showOk !== 'undefined') _App['showOk'] = showOk;
    if (typeof showError !== 'undefined') _App['showError'] = showError;
    if (typeof parseNow !== 'undefined') _App['parseNow'] = parseNow;
    if (typeof saveToDatabase !== 'undefined') _App['saveToDatabase'] = saveToDatabase;
    if (typeof resolvePlayerId !== 'undefined') _App['resolvePlayerId'] = resolvePlayerId;
    if (typeof generatePlayerId !== 'undefined') _App['generatePlayerId'] = generatePlayerId;
    if (typeof canonicalKey !== 'undefined') _App['canonicalKey'] = canonicalKey;
    if (typeof savePlayersWithNewSystem !== 'undefined') _App['savePlayersWithNewSystem'] = savePlayersWithNewSystem;
    if (typeof cleanupOldPlayerSystem !== 'undefined') _App['cleanupOldPlayerSystem'] = cleanupOldPlayerSystem;
    if (typeof loadTransfers !== 'undefined') _App['loadTransfers'] = loadTransfers;
    if (typeof updateTransferStatus !== 'undefined') _App['updateTransferStatus'] = updateTransferStatus;
    if (typeof closeDbConnection !== 'undefined') _App['closeDbConnection'] = closeDbConnection;
    if (typeof loadPlayersForComparison !== 'undefined') _App['loadPlayersForComparison'] = loadPlayersForComparison;
    if (typeof comparePlayers !== 'undefined') _App['comparePlayers'] = comparePlayers;
    if (typeof getPlayersForTeam !== 'undefined') _App['getPlayersForTeam'] = getPlayersForTeam;
    if (typeof displayAdvancedAnalysis !== 'undefined') {
      _App['displayAdvancedAnalysis'] = displayAdvancedAnalysis;
      window.displayAdvancedAnalysis = displayAdvancedAnalysis; // Direct window exposure
    }
    if (typeof getTeamsAggregate !== 'undefined') {
      _App['getTeamsAggregate'] = getTeamsAggregate;
      window.getTeamsAggregate = getTeamsAggregate; // Direct window exposure
    }
    window.App = Object.freeze(_App);
  } catch(e) {
    console && console.warn && console.warn('App namespace exposure failed:', e);
  }
})();
