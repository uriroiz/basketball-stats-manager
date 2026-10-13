const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const html = fs.readFileSync('index.html', 'utf8');
const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
  .find(match => match[1].includes('async function selectSeason'))[1];
function page() {
  const nodes = new Map();
  const document = {
    readyState: 'loading', addEventListener() {}, querySelectorAll: () => [],
    getElementById(id) {
      if (!nodes.has(id)) nodes.set(id, { value: '', innerHTML: '', textContent: '', disabled: false,
        style: {}, dataset: {}, options: [], setAttribute() {},
        classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } } });
      return nodes.get(id);
    }
  };
  const c = vm.createContext({ window: { appConfig: { seasonKey: '2024-25' } }, document,
    location: { href: 'http://localhost/?season=2024-25&view=players' },
    history: { replaceState() {} }, localStorage: { setItem() {} }, URL, URLSearchParams,
    console: { log() {}, warn() {}, error() {} }, setTimeout: () => 1, clearTimeout() {} });
  vm.runInContext(fs.readFileSync('js/ibba/ibba_seasons.js', 'utf8'), c);
  vm.runInContext(script, c);
  return { c, document };
}
const flush = async () => { for (let i = 0; i < 12; i++) await Promise.resolve(); };

async function run() {
  // Removing referenced-ID startup or waiting for names before enabling panels must fail this test.
  {
    const { c } = page();
    let finish, enabled = false, calls = 0, cancelCalls = 0;
    const pending = new Promise(resolve => { finish = resolve; });
    const games = [{ gameId: 1, players: [{ playerId: 7 }] }];
    c.window.playerNamesLoader = { cancel() { cancelCalls++; } };
    c.window.IBBAAnalytics = function () {};
    c.window.IBBAPlayerNames = function () {
      this.loadAllPlayerNames = () => { throw Error('slow catalog must not run'); };
      this.loadReferencedPlayers = (input, isCurrent, onProgress) => {
        calls++; assert.strictEqual(input, games); assert.strictEqual(isCurrent(), true);
        this.progress = onProgress; return pending;
      };
    };
    for (const method of ['processGames', 'populateFilters', 'applyFilters', 'disableTabs', 'updateProgress', 'switchTab']) c[method] = () => {};
    c.restorePreparationFromUrl = async () => {};
    c.enableTabs = () => { enabled = true; };
    c.refreshNamedViews = () => {};
    c.seasonResult = { scheduleGames: games, analyticsGames: games, complete: true };
    vm.runInContext('seasonController.select=async(key,apply)=>apply(seasonResult,()=>true)', c);
    const selecting = c.selectSeason('2024-25');
    await flush();
    assert.strictEqual(calls, 1, 'season startup starts one referenced-ID load instead of the slow league catalog');
    assert.strictEqual(enabled, true, 'names do not block access to season panels');
    assert.strictEqual(cancelCalls, 1, 'switching season cancels the previous name requests');
    let updates = 0; c.refreshNamedViews = () => { updates++; };
    c.window.playerNamesLoader.progress();
    assert.strictEqual(updates, 1, 'progress publishes names to the active season');
    const previousLoader = c.window.playerNamesLoader;
    c.window.playerNamesLoader = null;
    previousLoader.progress();
    // A replaced loader must never republish, even if the season callback is still current.
    finish(); await selecting;
    assert.strictEqual(updates, 1, 'a replaced loader cannot redraw the new season');
  }
  // Losing progress counts or counting the global cache rather than displayed players must fail.
  {
    const { c, document } = page();
    const names = new Map([['7', 'Verified name'], ['999', 'Other season']]);
    c.window.playerNamesLoader = { isLoading: true, getPlayerName: id => names.get(String(id)) || null };
    c.window.ibbaAnalytics = { getPlayerAverages: () => [{ playerId: 7 }, { playerId: 8 }] };
    c.populatePlayerTeamFilter = () => {}; c.filterPlayers = () => {};
    c.initPlayerStats();
    assert(document.getElementById('playerNamesStatus').textContent.includes('1 מתוך 2'), 'progress describes displayed players only');
    names.set('8', 'Second name'); c.initPlayerStats();
    assert(document.getElementById('playerNamesStatus').textContent.includes('מרענן'), 'cached names stay visible during background refresh');
    c.window.playerNamesLoader.isLoading = false; c.initPlayerStats();
    assert.strictEqual(document.getElementById('playerNamesStatus').style.display, 'none', 'completed names remove the loading message');
    c.window.playerNamesLoader.isLoading = true;
    vm.runInContext('currentTab="leaders";allGames=[{}]', c);
    c.refreshNamedViews = undefined;
    c.initLeaderStats = () => {};
    vm.runInContext('updatePlayerNamesStatus()', c);
    assert(document.getElementById('playerNamesStatus').textContent.includes('מרענן'), 'status remains valid independently of active tab');
  }
  // Clearing cached names on refresh, using the old Supabase/catalog flow or not forcing verification must fail.
  for (const method of ['refreshPlayerData', 'forceRefreshPlayerNames']) {
    const { c } = page();
    let finish, calls = 0, cleared = false, updates = 0;
    const pending = new Promise(resolve => { finish = resolve; });
    const names = new Map([['7', { name: 'Verified name' }]]);
    const loader = {
      namesMap: names, getPlayerName: id => names.get(String(id))?.name,
      clearCache() { cleared = true; }, loadFromSupabase() { throw Error('old refresh path'); },
      loadReferencedPlayers: (games, current, progress, options) => {
        calls++; assert.strictEqual(options.refresh, true); return pending;
      }
    };
    c.window.playerNamesLoader = loader; c.window.ibbaAnalytics = {};
    c.refreshNamedViews = () => { updates++; };
    const loading = c[method](); await flush();
    assert.strictEqual(calls, 1, `${method} uses the verified batch loader`);
    assert.strictEqual(cleared, false, `${method} preserves visible names`);
    assert.strictEqual(loader.getPlayerName(7), 'Verified name');
    c.window.playerNamesLoader = null; finish(); await loading;
    assert.strictEqual(updates, 0, `${method} ignores stale completion`);
  }
  console.log('player names UI tests passed');
}
run().catch(error => { console.error(error); process.exit(1); });
