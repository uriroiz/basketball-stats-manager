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
        style: {}, dataset: {}, options: [], attributes: {},
        setAttribute(name,value) { this.attributes[name]=String(value); },
        getAttribute(name) { return this.attributes[name] ?? null; },
        removeAttribute(name) { delete this.attributes[name]; },
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
  {
    const {c,document}=page();
    c.updatePlayerNamesStatus();
    assert.strictEqual(document.getElementById('playerNamesStatus').textContent,'','status is safe before the names loader exists');
  }
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
  // A manual refresh must keep visible progress and report unchanged or newly resolved names.
  for (const method of ['refreshPlayerData', 'forceRefreshPlayerNames']) {
    const { c, document } = page();
    const rows=[{playerId:7},{playerId:8},{playerId:9}];
    const names=new Map([['7','Known player']]);
    let finish, progress;
    const pending=new Promise(resolve=>{finish=resolve;});
    const loader={isLoading:false,sourceState:'partial',getPlayerName:id=>names.get(String(id))||null,
      loadReferencedPlayers(games,current,onProgress){this.isLoading=true;progress=onProgress;onProgress();return pending.then(()=>{this.isLoading=false;onProgress();});}};
    c.window.playerNamesLoader=loader;c.window.ibbaAnalytics={getPlayerAverages:()=>rows};
    c.refreshNamedViews=()=>c.updatePlayerNamesStatus(rows);
    const button=document.getElementById('refreshPlayersBtn');button.innerHTML='רענן';
    const nameButton=document.getElementById('refreshPlayerNamesBtn');nameButton.innerHTML='רענן שמות';
    c.updatePlayerNamesStatus(rows);
    const loading=c[method]();await flush();
    assert(button.textContent.includes('מרענן'),'manual refresh changes the button label immediately');
    assert.strictEqual(button.disabled,true);assert.strictEqual(nameButton.disabled,true);
    assert.strictEqual(button.getAttribute('aria-busy'),'true');
    progress();assert(document.getElementById('playerNamesStatus').textContent.includes('מרענן'),'progress callbacks must retain explicit refresh feedback');
    finish();await loading;
    const outcome=document.getElementById('playerNamesStatus').textContent;
    assert(outcome.includes('הסתיים')&&outcome.includes('ללא שמות נוספים')&&outcome.includes('2'),'unchanged refresh reports completion and the remaining count');
    c.updatePlayerNamesStatus(rows);assert.strictEqual(document.getElementById('playerNamesStatus').textContent,outcome,'later table redraw retains the refresh outcome');
    assert.strictEqual(button.disabled,false);assert.strictEqual(nameButton.disabled,false);
    assert.strictEqual(button.innerHTML,'רענן');assert.strictEqual(button.getAttribute('aria-busy'),null);
    loader.loadReferencedPlayers=async()=>{names.set('8','New player');loader.isLoading=false;};
    await c[method]();assert(document.getElementById('playerNamesStatus').textContent.includes('נוסף שם אחד'),'partial recovery reports newly resolved names');
    assert(document.getElementById('playerNamesStatus').textContent.includes('שם אחד עדיין'),'partial recovery keeps remaining names explicit');
    loader.loadReferencedPlayers=async()=>{names.set('9','Last player');loader.sourceState='ready';};
    await c[method]();assert(document.getElementById('playerNamesStatus').textContent.includes('כל 3 השמות זמינים'),'complete recovery reports all names available');
  }
  // A rejected source keeps names and an actionable result, including after a table redraw.
  {
    const {c,document}=page();
    const rows=[{playerId:7},{playerId:8}];
    const loader={getPlayerName:id=>id===7?'Known player':null,
      loadReferencedPlayers:async()=>{throw Error('source unavailable');}};
    c.window.playerNamesLoader=loader;c.window.ibbaAnalytics={getPlayerAverages:()=>rows};
    const button=document.getElementById('refreshPlayersBtn');button.innerHTML='רענן';
    button.setAttribute('aria-busy','false');
    await c.forceRefreshPlayerNames();
    const outcome=document.getElementById('playerNamesStatus').textContent;
    assert(outcome.includes('נכשל')&&outcome.includes('נשמרו'),'source failure is explicit and preserves names');
    c.updatePlayerNamesStatus(rows);assert.strictEqual(document.getElementById('playerNamesStatus').textContent,outcome);
    assert.strictEqual(loader.getPlayerName(7),'Known player');assert.strictEqual(button.disabled,false);
    assert.strictEqual(button.getAttribute('aria-busy'),'false','original accessibility state is restored');
  }
  // Starting a refresh after changing season cannot be affected by the old refresh finishing.
  {
    const {c,document}=page();
    let finishOld,finishNew,calls=0;
    const oldPending=new Promise(resolve=>{finishOld=resolve;});
    const newPending=new Promise(resolve=>{finishNew=resolve;});
    c.window.ibbaAnalytics={getPlayerAverages:()=>[{playerId:7},{playerId:8}]};
    c.refreshNamedViews=()=>c.updatePlayerNamesStatus();
    c.window.playerNamesLoader={getPlayerName:()=>null,loadReferencedPlayers:()=>oldPending};
    const button=document.getElementById('refreshPlayersBtn');button.innerHTML='רענן';
    const oldRefresh=c.forceRefreshPlayerNames();
    vm.runInContext('seasonController.gate.version++',c);
    c.resetPlayerNamesRefresh();
    assert.strictEqual(button.disabled,false,'season reset restores the controls immediately');
    c.window.playerNamesLoader={getPlayerName:id=>id===7?'New season player':null,
      loadReferencedPlayers:()=>{calls++;return newPending;}};
    const newRefresh=c.forceRefreshPlayerNames();
    await c.forceRefreshPlayerNames();assert.strictEqual(calls,1,'double activation shares the running refresh');
    finishOld();await oldRefresh;
    assert.strictEqual(button.disabled,true,'stale completion cannot enable controls during the new refresh');
    assert.strictEqual(button.getAttribute('aria-busy'),'true');
    assert(document.getElementById('playerNamesStatus').textContent.includes('מרענן'),'old result cannot replace active progress');
    finishNew();await newRefresh;
    assert.strictEqual(button.disabled,false);assert.strictEqual(button.innerHTML,'רענן');
    assert(document.getElementById('playerNamesStatus').textContent.includes('שם אחד עדיין'),'outcome belongs to the new season');
    c.resetPlayerNamesRefresh();c.updatePlayerNamesStatus();
    assert(!document.getElementById('playerNamesStatus').textContent.includes('הסתיים'),'season reset clears the prior outcome');
  }
  // Cooldown/partial verification can resolve immediately without claiming cached names were newly verified.
  {
    const {c,document}=page();
    c.window.ibbaAnalytics={getPlayerAverages:()=>[{playerId:7}]};
    c.window.playerNamesLoader={sourceState:'partial',getPlayerName:()=> 'Cached name',loadReferencedPlayers:async()=>{}};
    c.refreshNamedViews=()=>c.updatePlayerNamesStatus();
    await c.forceRefreshPlayerNames();
    const outcome=document.getElementById('playerNamesStatus').textContent;
    assert(outcome.includes('שם השחקן זמין')&&outcome.includes('לא ניתן היה להשלים'),'cached availability does not imply complete fresh verification');
    assert(!outcome.includes('נוסף שם'),'an unchanged cached name is not newly resolved');
  }
  {
    const {c,document}=page();
    c.window.ibbaAnalytics={getPlayerAverages:()=>[]};
    c.window.playerNamesLoader={sourceState:'ready',getPlayerName:()=>null,loadReferencedPlayers:async()=>{}};
    c.refreshNamedViews=()=>c.updatePlayerNamesStatus();
    await c.forceRefreshPlayerNames();
    assert(document.getElementById('playerNamesStatus').textContent.includes('אין שחקנים עם סטטיסטיקה'),'an empty season does not claim zero names were refreshed');
  }
  console.log('player names UI tests passed');
}
run().catch(error => { console.error(error); process.exit(1); });
