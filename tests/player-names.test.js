const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const NOW = 1791417600000, DAY = 86400000, IDENTITY_KEY = 'ibba_player_identities_v1';
const games = (...ids) => [{ players: ids.map(playerId => ({ playerId })) }];
const player = (id, name = `Player ${id}`, link = `https://ibasketball.co.il/player/profile-${id}/`) =>
  ({ id: Number(id), title: { rendered: name }, link, number: '17', current_teams: [333] });
const response = value => ({ ok: true, status: 200, json: async () => value, text: async () => value });
const failedResponse = (status, retryAfter = null) => ({ ok: false, status,
  headers: { get: name => name.toLowerCase() === 'retry-after' ? retryAfter : null } });
const leagueHTML = rows => JSON.stringify({ rows }) + ' '.repeat(1100);
const targetURL = url => url.startsWith('/api/ibba?url=') ? decodeURIComponent(url.slice(14)) : url;
const includeIDs = url => new URL(targetURL(url)).pathname.includes('/sportspress/v2/players')
  ? new URL(targetURL(url)).searchParams.get('include')?.split(',') : undefined;
const searchIDs = url => new URL(targetURL(url)).pathname === '/wp-json/wp/v2/search'
  ? new URL(targetURL(url)).searchParams.get('include')?.split(',') : undefined;
const individualRequest = url => /\/sportspress\/v2\/players\/[1-9]\d*$/.test(new URL(targetURL(url)).pathname);
const searchPlayer = (id, title = `Search Player ${id}`, url = `https://ibasketball.co.il/player/search-${id}/`) =>
  ({ id: Number(id), title, url, type: 'post', subtype: 'sp_player' });
function deferred() { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; }
async function settle() { for (let i = 0; i < 30; i++) await Promise.resolve(); }
const cached = (id, name, verifiedAt = NOW, link = null) => [String(id), { name, link, verifiedAt }];
const cacheStorage = entries => new Map([[IDENTITY_KEY, JSON.stringify({ players: entries })]]);

// Browser DOM boundary: production history parsing still identifies the rows and references.
function parseDocument(source) {
  if (!source.trim().startsWith('{')) return { body: { textContent: source.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ') }, querySelectorAll: () => [] };
  const { rows } = JSON.parse(source), headers = ['שחקן', 'קבוצה', 'משחקים', 'דקות', "נק'", 'ריב', "אס'"];
  const tableRows = rows.map(row => ({ cells: [row.name, row.team || 'Season team', '4', '31', '12', '3', '2'].map((textContent, index) =>
    ({ textContent, querySelector: () => index === 0 && row.href ? { getAttribute: () => row.href } : null })) }));
  const table = { classList: { contains: () => false }, querySelectorAll: () => headers.map(textContent => ({ textContent })), tBodies: [{ rows: tableRows }] };
  return { querySelectorAll: selector => selector === 'table' ? [table] : selector === 'tr[data-pm]' ? rows.filter(row => row.pm != null).map(row =>
    ({ getAttribute: attribute => ({ 'data-id': row.id, 'data-pm': String(row.pm) })[attribute] ?? null })) : [] };
}

function fixture({ storage = new Map(), session = new Map(), fetchImpl, searchImpl, seasonId = 119472, now = NOW, storageThrows = false, withHistory = true } = {}) {
  const requests = [], timers = new Set();
  const browserStorage = values => ({
    getItem(key) { if (storageThrows) throw Error('storage unavailable'); return values.get(key) || null; },
    setItem(key, value) { if (storageThrows) throw Error('storage unavailable'); values.set(key, value); },
    removeItem(key) { if (storageThrows) throw Error('storage unavailable'); values.delete(key); }
  });
  const context = {
    console: { log() {}, warn() {}, error() {} }, URL, AbortController,
    Date: class extends Date { static now() { return typeof now === 'function' ? now() : now; } },
    setTimeout(callback, duration) { const timer = setTimeout(callback, duration); timers.add(timer); return timer; },
    clearTimeout(timer) { timers.delete(timer); clearTimeout(timer); },
    window: { appConfig: { seasonId, seasonKey: seasonId === 119472 ? '2025-26' : '2024-25', playersPageUrl: 'https://ibasketball.co.il/league/2025-2/' } },
    localStorage: browserStorage(storage), sessionStorage: browserStorage(session),
    fetch: async (url, options) => {
      requests.push(url);
      if (searchIDs(url)) return searchImpl ? searchImpl(url, options) : failedResponse(404);
      return fetchImpl ? fetchImpl(url, options) : response(leagueHTML([]));
    },
    DOMParser: class { parseFromString(source) { return parseDocument(source); } }
  };
  for (const file of ['ibba_seasons.js', 'ibba_player_history.js', 'ibba_player_names.js'])
    if (withHistory || file !== 'ibba_player_history.js')
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'ibba', file), 'utf8'), context);
  if (withHistory) context.window.historyView = { service: new context.window.IBBAPlayerHistory() };
  const loader = new context.window.IBBAPlayerNames();
  return { loader, requests, storage, session, history: context.window.historyView?.service, timers };
}
const tests = [];
function test(name, run) { tests.push({ name, run }); }

test('cold load combines requested batch identities with explicit official summary IDs', async () => {
  const f = fixture({ fetchImpl: async url => {
    if (includeIDs(url)) {
      const query = new URL(targetURL(url)).searchParams;
      assert.strictEqual(query.get('per_page'), '100');
      assert.strictEqual(query.get('_fields'), 'id,title,link');
      assert.strictEqual(query.has('leagues'), false);
      return response([player(1, '<b>First &amp; One</b>'), player(2)]);
    }
    if (targetURL(url).includes('/league/')) return response(leagueHTML([
      { name: 'Official Three', href: '/?post_type=sp_player&p=3', id: '3', pm: 9 },
      { name: 'Do not guess', href: '/player/profile-only/', id: '4' }
    ]));
    throw Error(`Unexpected individual request ${url}`);
  } });
  await f.loader.loadReferencedPlayers(games(1, 2, 3, 1, 'invalid', 0));
  assert.deepStrictEqual([1, 2, 3].map(id => f.loader.getPlayerName(id)), ['First & One', 'Player 2', 'Official Three']);
  assert.strictEqual(f.loader.getPlayerName(4), null);
  assert.strictEqual(f.loader.getPlayerData(3).totalPlusMinus, 9);
  assert.strictEqual(f.loader.getPlayerTeam(1), null);
  assert.strictEqual(f.history.identity({ playerId: 1 }), 'profile:/player/profile-1');
  assert.strictEqual(f.loader.sourceState, 'ready');
  assert.strictEqual(f.requests.filter(url => includeIDs(url)).length, 1);
  assert.strictEqual(f.timers.size, 0, 'settled requests release timeout resources');
});

test('public search resolves cold identities in three bounded batches without SportsPress requests', async () => {
  const gate = deferred(); let active = 0, peak = 0;
  const f = fixture({ searchImpl: async url => {
    const query = new URL(targetURL(url)).searchParams;
    assert.strictEqual(query.get('type'), 'post');
    assert.strictEqual(query.get('subtype'), 'sp_player');
    assert.strictEqual(query.get('per_page'), '100');
    assert.strictEqual(query.has('search'), false, 'identities must be requested by official IDs, never by names');
    active++; peak = Math.max(peak, active); await gate.promise; active--;
    return response(searchIDs(url).map(id => searchPlayer(id)));
  }, fetchImpl: async url => targetURL(url).includes('/league/') ? response(leagueHTML([])) : failedResponse(401) });
  const work = f.loader.loadReferencedPlayers(games(...Array.from({ length: 205 }, (_, i) => i + 1)));
  await settle(); assert.strictEqual(active, 3);
  gate.resolve(); await work;
  assert.strictEqual(peak, 3);
  assert.deepStrictEqual(f.requests.filter(url => searchIDs(url)).map(url => searchIDs(url).length), [100, 100, 5]);
  assert.strictEqual(f.requests.filter(url => includeIDs(url) || individualRequest(url)).length, 0);
  assert.strictEqual(f.loader.getPlayerName(205), 'Search Player 205');
  assert.strictEqual(f.history.identity({ playerId: 205 }), 'profile:/player/search-205');
  assert.strictEqual(f.loader.getPlayerTeam(205), null);
  assert.strictEqual(f.loader.sourceState, 'ready');
  assert.strictEqual(f.timers.size, 0);
});

test('public search rejects unrelated identities, wrong post types, malformed titles and unsafe profile links', async () => {
  const f = fixture({ searchImpl: async () => response([
    searchPlayer(1, '<b>First &amp; One</b>'),
    searchPlayer(999, 'Unrequested'), { ...searchPlayer(2), type: 'term' },
    { ...searchPlayer(3), subtype: 'sp_team' }, searchPlayer(4, ' '),
    searchPlayer(5, 'Foreign', 'https://example.com/player/foreign/'),
    searchPlayer(6, 'HTTP', 'http://ibasketball.co.il/player/http/'),
    searchPlayer(7, 'Post Only', 'https://ibasketball.co.il/?p=7'),
    { ...searchPlayer(8), id: '8' }, searchPlayer(9, 'Private URL', 'https://user:pass@ibasketball.co.il/player/private/'),
    searchPlayer(10, 'Wrong Port', 'https://ibasketball.co.il:8080/player/port/'),
    searchPlayer(11, 'Nested Path', 'https://ibasketball.co.il/player/one/extra/'),
    searchPlayer(12, 'Wrong Post', 'https://ibasketball.co.il/player/twelve/?p=999')
  ]), fetchImpl: async url => targetURL(url).includes('/league/') ? response(leagueHTML([])) : failedResponse(401) });
  await f.loader.loadReferencedPlayers(games(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12));
  assert.strictEqual(f.loader.getPlayerName(1), 'First & One');
  for (const id of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 999]) assert.strictEqual(f.loader.getPlayerName(id), null);
  assert.strictEqual(f.loader.sourceState, 'partial');
  assert.deepStrictEqual(f.requests.filter(url => includeIDs(url)).map(url => includeIDs(url)),
    [['10', '11', '12', '2', '3', '4', '5', '6', '7', '8', '9'], ['10', '11', '12', '2', '3', '4', '5', '6', '7', '8', '9']],
    'only identities not validated by public search should reach secondary direct/proxy collections');
});

test('public search names survive a denied secondary API and recover more identities on refresh', async () => {
  let round = 0;
  const f = fixture({ searchImpl: async () => response(++round === 1 ? [searchPlayer(1)] : [searchPlayer(1), searchPlayer(2)]),
    fetchImpl: async url => targetURL(url).includes('/league/') ? response(leagueHTML([])) : failedResponse(401) });
  await f.loader.loadReferencedPlayers(games(1, 2));
  assert.strictEqual(f.loader.getPlayerName(1), 'Search Player 1');
  assert.strictEqual(f.loader.getPlayerName(2), null);
  const apiRequests = f.requests.filter(url => includeIDs(url)).length;
  await f.loader.loadReferencedPlayers(games(1, 2), () => true, () => {}, { refresh: true });
  assert.strictEqual(f.loader.getPlayerName(2), 'Search Player 2');
  assert.strictEqual(f.requests.filter(url => includeIDs(url)).length, apiRequests);
  assert.strictEqual(f.loader.sourceState, 'ready');
});

test('a partial public-search collection falls back only for unresolved identities', async () => {
  const f = fixture({ searchImpl: async () => response([searchPlayer(1)]), fetchImpl: async url => {
    if (includeIDs(url)) { assert.deepStrictEqual(includeIDs(url), ['2']); return response([player(2)]); }
    return response(leagueHTML([]));
  } });
  await f.loader.loadReferencedPlayers(games(1, 2));
  assert.strictEqual(f.loader.getPlayerName(1), 'Search Player 1');
  assert.strictEqual(f.loader.getPlayerName(2), 'Player 2');
  assert.strictEqual(f.loader.sourceState, 'ready');
});

test('public-search network failure uses secondary identities without requesting an unsupported search proxy', async () => {
  const f = fixture({ searchImpl: async () => { throw Error('CORS unavailable'); }, fetchImpl: async url => {
    if (includeIDs(url)) return response([player(1)]);
    return response(leagueHTML([]));
  } });
  await f.loader.loadReferencedPlayers(games(1));
  assert.strictEqual(f.loader.getPlayerName(1), 'Player 1');
  assert.strictEqual(f.loader.sourceState, 'ready');
  assert.deepStrictEqual(f.requests.filter(url => searchIDs(url)),
    ['https://ibasketball.co.il/wp-json/wp/v2/search?type=post&subtype=sp_player&include=1&per_page=100']);
  assert.strictEqual(f.timers.size, 0);
});

test('cancelled public-search responses cannot change identities or persistent storage', async () => {
  const gate = deferred();
  const f = fixture({ searchImpl: async () => gate.promise });
  const work = f.loader.loadReferencedPlayers(games(1)); await settle(); f.loader.cancel();
  gate.resolve(response([searchPlayer(1)])); await work;
  assert.strictEqual(f.loader.getPlayerName(1), null);
  assert.strictEqual(f.storage.has(IDENTITY_KEY), false);
  assert.strictEqual(f.timers.size, 0);
});

test('invalid batch identities and blank titles fall back only for unresolved requested IDs', async () => {
  const individual = [];
  const f = fixture({ fetchImpl: async url => {
    if (includeIDs(url)) return response([player(1), player(999, 'Wrong identity'), player(2, '<b> </b>')]);
    if (targetURL(url).includes('/league/')) return response(leagueHTML([]));
    const id = targetURL(url).split('/').pop(); individual.push(id);
    return response(id === '2' ? player(2, 'Recovered Two') : player(888, 'Mismatch'));
  } });
  await f.loader.loadReferencedPlayers(games(1, 2, 3));
  assert.deepStrictEqual(individual.sort(), ['2', '3']);
  assert.strictEqual(f.loader.getPlayerName(2), 'Recovered Two');
  assert.strictEqual(f.loader.getPlayerName(3), null);
  assert.strictEqual(f.loader.getPlayerName(999), null);
  assert.strictEqual(f.loader.sourceState, 'partial');
});

test('direct collection failure uses the same include endpoint through the proxy', async () => {
  const f = fixture({ fetchImpl: async url => {
    if (includeIDs(url)) { if (!url.startsWith('/api/')) throw Error('CORS'); return response([player(8)]); }
    return response(leagueHTML([]));
  } });
  await f.loader.loadReferencedPlayers(games(8));
  assert.strictEqual(f.loader.getPlayerName(8), 'Player 8');
  const batchURLs = f.requests.filter(url => includeIDs(url));
  assert.strictEqual(batchURLs.length, 2);
  assert.strictEqual(targetURL(batchURLs[1]), batchURLs[0]);
});

test('individual fallback preserves its endpoint through the proxy after collection failure', async () => {
  const f = fixture({ fetchImpl: async url => {
    if (includeIDs(url)) throw Error('collection unavailable');
    if (targetURL(url).includes('/league/')) return response(leagueHTML([]));
    if (!url.startsWith('/api/')) throw Error('CORS');
    assert.strictEqual(targetURL(url), 'https://ibasketball.co.il/wp-json/sportspress/v2/players/9');
    return response(player(9));
  } });
  await f.loader.loadReferencedPlayers(games(9));
  assert.strictEqual(f.loader.getPlayerName(9), 'Player 9');
});

test('source-wide API denial stops queued batches and does not fan out into individual requests', async () => {
  for (const status of [401, 403]) {
    const f = fixture({ fetchImpl: async url => targetURL(url).includes('/league/')
      ? response(leagueHTML([])) : failedResponse(status) });
    await f.loader.loadReferencedPlayers(games(...Array.from({ length: 405 }, (_, i) => i + 1)));
    assert.strictEqual(f.requests.filter(individualRequest).length, 0);
    assert(f.requests.filter(url => includeIDs(url)).length <= 6, 'only the three in-flight batches may reach direct and proxy routes');
    assert.strictEqual(f.loader.sourceState, 'error');
    assert.strictEqual(f.loader.isLoading, false);
    assert.strictEqual(f.timers.size, 0);
  }
});

test('HTML access denial leaves successful API collections and missing-record recovery usable', async () => {
  const f = fixture({ fetchImpl: async url => {
    if (includeIDs(url)) return response([player(1)]);
    if (targetURL(url).includes('/league/')) return failedResponse(403);
    return response(player(2));
  } });
  await f.loader.loadReferencedPlayers(games(1, 2));
  assert.strictEqual(f.loader.getPlayerName(1), 'Player 1');
  assert.strictEqual(f.loader.getPlayerName(2), 'Player 2');
  assert.strictEqual(f.loader.sourceState, 'ready');
});

test('rate limits suppress refresh requests until Retry-After expires, then recover without losing cached names', async () => {
  let time = NOW, available = false;
  const storage = cacheStorage([cached(1, 'Known One')]);
  const f = fixture({ storage, now: () => time, fetchImpl: async url => {
    if (!available) return failedResponse(429, '120');
    return includeIDs(url) ? response([player(1, 'Fresh One'), player(2)]) : response(leagueHTML([]));
  } });
  await f.loader.loadReferencedPlayers(games(1, 2), () => true, () => {}, { refresh: true });
  assert.strictEqual(f.loader.getPlayerName(1), 'Known One');
  assert.strictEqual(f.loader.getPlayerName(2), null);
  assert.strictEqual(f.loader.sourceState, 'partial');
  const failedRequests = f.requests.length;
  available = true;
  await f.loader.loadReferencedPlayers(games(1, 2), () => true, () => {}, { refresh: true });
  time += 119999;
  await f.loader.loadReferencedPlayers(games(1, 2), () => true, () => {}, { refresh: true });
  assert.strictEqual(f.requests.length, failedRequests, 'refresh must respect the source cooldown');
  time += 2;
  await f.loader.loadReferencedPlayers(games(1, 2), () => true, () => {}, { refresh: true });
  assert.strictEqual(f.loader.getPlayerName(1), 'Fresh One');
  assert.strictEqual(f.loader.getPlayerName(2), 'Player 2');
  assert.strictEqual(f.loader.sourceState, 'ready');
  assert.strictEqual(f.timers.size, 0);
});

test('an in-flight valid batch persists its identities even when another batch is denied', async () => {
  const first = deferred();
  const f = fixture({ fetchImpl: async url => {
    if (includeIDs(url)) return includeIDs(url)[0] === '1' ? first.promise : failedResponse(401);
    return response(leagueHTML([]));
  } });
  const work = f.loader.loadReferencedPlayers(games(...Array.from({ length: 105 }, (_, i) => i + 1)));
  await settle(); first.resolve(response([player(1)])); await work;
  assert.strictEqual(f.loader.getPlayerName(1), 'Player 1');
  assert.strictEqual(JSON.parse(f.storage.get(IDENTITY_KEY)).players[0][0], '1');
  assert.strictEqual(f.loader.sourceState, 'partial');
  assert.strictEqual(f.requests.filter(individualRequest).length, 0);
});

test('denied individual responses stop the remaining recovery queue', async () => {
  const f = fixture({ fetchImpl: async url => {
    if (includeIDs(url)) return response([]);
    if (targetURL(url).includes('/league/')) return response(leagueHTML([]));
    return failedResponse(401);
  } });
  await f.loader.loadReferencedPlayers(games(...Array.from({ length: 35 }, (_, i) => i + 1)));
  assert(f.requests.filter(individualRequest).length <= 12,
    'at most six individual requests may already be in flight through direct and proxy routes');
  assert.strictEqual(f.loader.sourceState, 'error');
});

test('a cancelled late denial cannot prevent the next generation from resolving names', async () => {
  const first = deferred(); let batches = 0;
  const f = fixture({ fetchImpl: async url => includeIDs(url)
    ? (++batches === 1 ? first.promise : response([player(1)])) : response(leagueHTML([])) });
  const old = f.loader.loadReferencedPlayers(games(1)); await settle(); f.loader.cancel();
  first.resolve(failedResponse(403)); await old;
  await f.loader.loadReferencedPlayers(games(1), () => true, () => {}, { refresh: true });
  assert.strictEqual(f.loader.getPlayerName(1), 'Player 1');
  assert.strictEqual(f.loader.sourceState, 'ready');
});

test('fresh cross-season persistent identities avoid name requests and rebuild official profile bridges', async () => {
  const f = fixture({ storage: cacheStorage([cached(7, 'Cached Seven', NOW - DAY, 'https://ibasketball.co.il/player/seven/')]), seasonId: 777 });
  assert.strictEqual(f.requests.length, 0, 'constructor must not begin network requests');
  assert.strictEqual(f.loader.getPlayerName(7), 'Cached Seven');
  await f.loader.loadReferencedPlayers(games(7));
  assert.strictEqual(f.requests.filter(url => !targetURL(url).includes('/league/')).length, 0);
  assert.strictEqual(f.history.identity({ playerId: 7 }), 'profile:/player/seven');
  assert.strictEqual(f.loader.getPlayerTeam(7), null);
});

test('stale cached names remain visible while their background refresh is pending', async () => {
  const gate = deferred(), storage = cacheStorage([cached(7, 'Old Seven', NOW - 8 * DAY)]);
  const f = fixture({ storage, fetchImpl: async url => includeIDs(url) ? gate.promise : response(leagueHTML([])) });
  const work = f.loader.loadReferencedPlayers(games(7)); await settle();
  assert.strictEqual(f.loader.getPlayerName(7), 'Old Seven');
  assert.strictEqual(f.loader.sourceState, 'loading');
  gate.resolve(response([player(7, 'New Seven')])); await work;
  assert.strictEqual(f.loader.getPlayerName(7), 'New Seven');
  assert.strictEqual(JSON.parse(storage.get(IDENTITY_KEY)).players[0][1].verifiedAt, NOW);
});

test('partial successes below 100 persist before a delayed source finishes', async () => {
  const html = deferred(), updates = [];
  const f = fixture({ fetchImpl: async url => includeIDs(url) ? response([player(1)]) : html.promise });
  const work = f.loader.loadReferencedPlayers(games(1), () => true, progress => updates.push(progress)); await settle();
  assert.strictEqual(f.loader.getPlayerName(1), 'Player 1');
  assert.strictEqual(JSON.parse(f.storage.get(IDENTITY_KEY)).players[0][0], '1');
  assert(updates.some(progress => progress.total === 1 && progress.resolved === 1));
  html.resolve(response(leagueHTML([]))); await work;
});

test('legacy per-season cache migrates identities without resetting age or carrying season fields globally', async () => {
  const session = new Map([['ibba_player_names_api_119472_v8', JSON.stringify({ timestamp: NOW - 8 * DAY,
    players: [['4', { name: 'Legacy Four', jersey: '12', teamId: 333, totalPlusMinus: 27, link: 'https://ibasketball.co.il/player/four/' }]] })]]);
  const f = fixture({ session });
  assert.strictEqual(f.requests.length, 0);
  assert.strictEqual(f.loader.getPlayerName(4), 'Legacy Four');
  assert.deepStrictEqual(JSON.parse(f.storage.get(IDENTITY_KEY)).players[0][1],
    { name: 'Legacy Four', link: 'https://ibasketball.co.il/player/four/', verifiedAt: NOW - 8 * DAY });
  const other = fixture({ storage: f.storage, seasonId: 777 });
  assert.strictEqual(other.loader.getPlayerTeam(4), null);
  assert.strictEqual(other.loader.getPlayerData(4).totalPlusMinus, undefined);
});

test('malformed and unavailable storage leave cold network resolution usable', async () => {
  for (const options of [{ storage: new Map([[IDENTITY_KEY, '{malformed']]) }, { storageThrows: true }]) {
    const f = fixture({ ...options, fetchImpl: async url => includeIDs(url) ? response([player(2)]) : response(leagueHTML([])) });
    await f.loader.loadReferencedPlayers(games(2));
    assert.strictEqual(f.loader.getPlayerName(2), 'Player 2');
    assert.strictEqual(f.loader.sourceState, 'ready');
  }
});

test('malformed cached identities and foreign links cannot create profile aliases', async () => {
  const storage = cacheStorage([cached(2, ' '), cached('x', 'Bad ID'), cached(3, 'Valid Three', NOW, 'https://example.com/player/three/'),
    cached(4, 'Valid Four', NOW, 'https://ibasketball.co.il/league/four/')]);
  const f = fixture({ storage }); await f.loader.loadReferencedPlayers(games(3, 4));
  assert.strictEqual(f.loader.getPlayerName(3), 'Valid Three');
  assert.strictEqual(f.loader.getPlayerName(4), 'Valid Four');
  assert.strictEqual(f.loader.getPlayerName(2), null);
  assert.strictEqual(f.loader.getPlayerName('x'), null);
  assert.strictEqual(f.history.identity({ playerId: 3 }), 'post:3');
  assert.strictEqual(f.history.identity({ playerId: 4 }), 'post:4');
});

test('explicit refresh preserves known names on complete source failure', async () => {
  const storage = cacheStorage([cached(5, 'Known Five')]), f = fixture({ storage, fetchImpl: async () => { throw Error('offline'); } });
  await f.loader.loadReferencedPlayers(games(5), () => true, () => {}, { refresh: true });
  assert.strictEqual(f.loader.getPlayerName(5), 'Known Five');
  assert.strictEqual(f.loader.sourceState, 'partial');
  assert.strictEqual(JSON.parse(storage.get(IDENTITY_KEY)).players[0][1].verifiedAt, NOW);
  assert.strictEqual(f.timers.size, 0);
});

test('duplicate referenced loads coalesce network work and notify both live consumers', async () => {
  const batch = deferred(), a = [], b = [];
  const f = fixture({ fetchImpl: async url => includeIDs(url) ? batch.promise : response(leagueHTML([])) });
  const first = f.loader.loadReferencedPlayers(games(6, 6), () => true, value => a.push(value));
  const second = f.loader.loadReferencedPlayers(games(6), () => true, value => b.push(value));
  await settle(); batch.resolve(response([player(6)])); await Promise.all([first, second]);
  assert.strictEqual(f.requests.filter(url => includeIDs(url)).length, 1);
  assert(a.some(value => value.resolved === 1) && b.some(value => value.resolved === 1));
});

test('cancel aborts work and blocks late responses from changing names, cache, or UI', async () => {
  const batch = deferred(), signals = [], updates = [];
  const f = fixture({ fetchImpl: async (url, { signal }) => { signals.push(signal); return includeIDs(url) ? batch.promise : response(leagueHTML([])); } });
  const work = f.loader.loadReferencedPlayers(games(6), () => true, value => updates.push(value));
  await settle(); f.loader.cancel(); const count = updates.length;
  assert(signals.some(signal => signal.aborted));
  batch.resolve(response([player(6, 'Too Late')])); await work;
  assert.strictEqual(f.loader.getPlayerName(6), null);
  assert.strictEqual(f.storage.has(IDENTITY_KEY), false);
  assert.strictEqual(updates.length, count);
  assert.strictEqual(f.loader.isLoading, false);
  assert.strictEqual(f.timers.size, 0);
});

test('refresh generation wins over a slower preceding name response', async () => {
  const oldBatch = deferred(); let batches = 0;
  const f = fixture({ fetchImpl: async url => includeIDs(url) ? (++batches === 1 ? oldBatch.promise : response([player(6, 'Newest Six')])) : response(leagueHTML([])) });
  const old = f.loader.loadReferencedPlayers(games(6)); await settle();
  await f.loader.loadReferencedPlayers(games(6), () => true, () => {}, { refresh: true });
  oldBatch.resolve(response([player(6, 'Stale Six')])); await old;
  assert.strictEqual(f.loader.getPlayerName(6), 'Newest Six');
  assert.strictEqual(JSON.parse(f.storage.get(IDENTITY_KEY)).players[0][1].name, 'Newest Six');
  assert.strictEqual(f.loader.sourceState, 'ready');
});

test('season validity check blocks late HTML names and PlusMinus enrichment', async () => {
  const html = deferred(); let current = true;
  const f = fixture({ fetchImpl: async url => includeIDs(url) ? response([player(1)]) : html.promise });
  const work = f.loader.loadReferencedPlayers(games(1, 2), () => current); await settle(); current = false;
  html.resolve(response(leagueHTML([{ name: 'Late Two', href: '/?p=2', id: '1', pm: 88 }]))); await work;
  assert.strictEqual(f.loader.getPlayerName(2), null);
  assert.strictEqual(f.loader.getPlayerData(1).totalPlusMinus, undefined);
});

test('include collections never exceed 100 requested unique numeric identities', async () => {
  const f = fixture({ fetchImpl: async url => includeIDs(url) ? response(includeIDs(url).map(id => player(id))) : response(leagueHTML([])) });
  await f.loader.loadReferencedPlayers(games(...Array.from({ length: 205 }, (_, i) => i + 1)));
  assert.deepStrictEqual(f.requests.filter(url => includeIDs(url)).map(url => includeIDs(url).length), [100, 100, 5]);
  assert.strictEqual(f.loader.getPlayerName(205), 'Player 205');
});

test('identity storage keeps the newest 5000 verification timestamps', async () => {
  const storage = cacheStorage(Array.from({ length: 5001 }, (_, i) => cached(i + 1, `Cached ${i + 1}`, NOW - (5001 - i))));
  const f = fixture({ storage, fetchImpl: async url => includeIDs(url) ? response([player(6000)]) : response(leagueHTML([])) });
  await f.loader.loadReferencedPlayers(games(6000));
  const saved = JSON.parse(storage.get(IDENTITY_KEY)).players;
  assert.strictEqual(saved.length, 5000);
  assert.strictEqual(saved.some(([id]) => id === '1' || id === '2'), false);
  assert.strictEqual(saved.find(([id]) => id === '3')[1].verifiedAt, NOW - 4999);
});

test('optional HTML failure remains retryable and summary names require explicit post IDs', async () => {
  const f = fixture({ fetchImpl: async () => { throw Error('proxy down'); } });
  assert.strictEqual(await f.loader.loadPlayerStatsFromHTML(), 0);
  f.loader.addOfficialSummaryNames([{ playerRef: 'post:609338', name: 'Verified player', team: 'Historical team' },
    { playerRef: 'profile:/player/profile', name: 'Profile only' }, { playerRef: 'post:0', name: 'Invalid identity' }]);
  assert.strictEqual(f.loader.getPlayerName(609338), 'Verified player');
  assert.strictEqual(f.loader.namesMap.size, 1);
  assert.strictEqual(f.loader.getPlayerTeam(609338), null);
  const unavailable = fixture({ fetchImpl: async () => { throw Error('proxy down'); } });
  await assert.rejects(() => unavailable.loader.loadAllPlayerNames(), /All proxies failed/);
  assert.strictEqual(unavailable.loader.isLoaded, false);
  assert.strictEqual(unavailable.timers.size, 0, 'legacy source failures also release timeout resources');
});

test('early HTML PlusMinus survives a later API identity without crossing seasons', async () => {
  const batch = deferred();
  const f = fixture({ fetchImpl: async url => includeIDs(url) ? batch.promise : response(leagueHTML([
    { name: 'Profile One', href: '/player/profile-1/', id: '1', pm: 18 }
  ])) });
  const work = f.loader.loadReferencedPlayers(games(1)); await settle();
  assert.strictEqual(f.loader.getPlayerName(1), null, 'profile-only summary cannot guess an event ID');
  batch.resolve(response([player(1)])); await work;
  assert.strictEqual(f.loader.getPlayerData(1).totalPlusMinus, 18);
  assert.strictEqual(JSON.parse(f.storage.get(IDENTITY_KEY)).players[0][1].totalPlusMinus, undefined);
  const nextSeason = fixture({ storage: f.storage, seasonId: 777 });
  assert.strictEqual(nextSeason.loader.getPlayerData(1).totalPlusMinus, undefined);
});

test('sparse warm identity cache still permits a complete legacy admin catalog', async () => {
  const f = fixture({ storage: cacheStorage([cached(7, 'Cached Seven')]), fetchImpl: async url => {
    if (targetURL(url).includes('/league/')) return response(leagueHTML([]));
    const query = new URL(targetURL(url)).searchParams;
    assert.strictEqual(query.get('leagues'), '119474');
    return response(query.get('page') === '1' ? [player(9, 'Admin Nine')] : []);
  } });
  await f.loader.loadAllPlayerNames();
  assert.strictEqual(f.loader.getPlayerName(9), 'Admin Nine');
  assert.strictEqual(f.loader.getPlayerJersey(9), '17');
  assert.strictEqual(f.loader.getPlayerTeam(9), 333);
});

test('individual recovery stays within six concurrent requests and publishes early progress', async () => {
  const gate = deferred(); let active = 0, peak = 0;
  const f = fixture({ fetchImpl: async url => {
    if (includeIDs(url)) return response([]);
    if (targetURL(url).includes('/league/')) return response(leagueHTML([]));
    active++; peak = Math.max(peak, active); await gate.promise; active--;
    return response(player(targetURL(url).split('/').pop()));
  } });
  const work = f.loader.loadReferencedPlayers(games(...Array.from({ length: 13 }, (_, i) => i + 1)));
  await settle(); assert.strictEqual(active, 6);
  gate.resolve(); await work;
  assert.strictEqual(peak, 6);
  assert.strictEqual(f.loader.getPlayerName(13), 'Player 13');
});

test('individual recovery publishes six names before its final delayed request', async () => {
  const last = deferred(), updates = [];
  const f = fixture({ fetchImpl: async url => {
    if (includeIDs(url)) return response([]);
    if (targetURL(url).includes('/league/')) return response(leagueHTML([]));
    const id = targetURL(url).split('/').pop();
    if (id === '7') await last.promise;
    return response(player(id));
  } });
  const work = f.loader.loadReferencedPlayers(games(1, 2, 3, 4, 5, 6, 7), () => true, progress => updates.push(progress));
  await settle();
  assert(updates.some(progress => progress.total === 7 && progress.resolved === 6));
  assert.strictEqual(f.loader.getPlayerName(1), 'Player 1');
  assert.strictEqual(f.loader.getPlayerName(7), null);
  last.resolve(); await work;
});

test('clearCache remains usable when browser storage is unavailable', async () => {
  const f = fixture({ storageThrows: true, fetchImpl: async url => includeIDs(url) ? response([player(5)]) : response(leagueHTML([])) });
  await f.loader.loadReferencedPlayers(games(5));
  f.loader.clearCache();
  assert.strictEqual(f.loader.getPlayerName(5), null);
  await f.loader.loadReferencedPlayers(games(5));
  assert.strictEqual(f.loader.getPlayerName(5), 'Player 5');
});

test('clearCache removes persistent identities and cancels pending reapplication', async () => {
  const batch = deferred(), storage = cacheStorage([cached(5, 'Known Five')]);
  const f = fixture({ storage, fetchImpl: async url => includeIDs(url) ? batch.promise : response(leagueHTML([])) });
  const work = f.loader.loadReferencedPlayers(games(5), () => true, () => {}, { refresh: true }); await settle();
  f.loader.clearCache();
  assert.strictEqual(storage.has(IDENTITY_KEY), false);
  batch.resolve(response([player(5, 'Late Five')])); await work;
  assert.strictEqual(f.loader.getPlayerName(5), null);
  assert.strictEqual(f.loader.isLoaded, false);
});

test('legacy pages without the optional history module retain shared official profile links', async () => {
  const profile = 'https://ibasketball.co.il/player/seven/';
  const storage = cacheStorage([cached(7, 'Known Seven', NOW, profile)]);
  const f = fixture({ storage, withHistory: false, fetchImpl: async url => {
    if (targetURL(url).includes('/league/')) return response(leagueHTML([]));
    return response(new URL(targetURL(url)).searchParams.get('page') === '1' ? [player(9)] : []);
  } });
  assert.strictEqual(f.loader.getPlayerData(7).link, profile);
  await f.loader.loadAllPlayerNames();
  const identities = JSON.parse(storage.get(IDENTITY_KEY)).players;
  assert.strictEqual(identities.find(([id]) => id === '7')[1].link, profile);
  assert.strictEqual(identities.find(([id]) => id === '9')[1].link, 'https://ibasketball.co.il/player/profile-9/');
  const main = fixture({ storage });
  assert.strictEqual(main.history.identity({ playerId: 7 }), 'profile:/player/seven');
  assert.strictEqual(main.history.identity({ playerId: 9 }), 'profile:/player/profile-9');
});

test('cached and API numeric post links cannot bridge two different player IDs', async () => {
  const storage = cacheStorage([cached(7, 'Cached Seven', NOW, 'https://ibasketball.co.il/?p=8'),
    cached(9, 'Cached Nine', NOW, 'https://ibasketball.co.il/?p=9')]);
  const f = fixture({ storage, fetchImpl: async url => includeIDs(url) ? response([
    player(1, 'API One', 'https://ibasketball.co.il/?p=2'), player(3, 'API Three', 'https://ibasketball.co.il/?p=3')
  ]) : response(leagueHTML([])) });
  await f.loader.loadReferencedPlayers(games(1, 3, 7, 9));
  assert.strictEqual(f.loader.getPlayerName(1), 'API One');
  assert.strictEqual(f.loader.getPlayerName(7), 'Cached Seven');
  assert.strictEqual(f.history.identity({ playerId: 1 }), 'post:1');
  assert.strictEqual(f.history.identity({ playerId: 7 }), 'post:7');
  assert.strictEqual(f.loader.getPlayerData(1).link, null);
  assert.strictEqual(f.loader.getPlayerData(7).link, null);
  assert.strictEqual(f.loader.getPlayerData(3).link, 'https://ibasketball.co.il/?p=3');
  assert.strictEqual(f.loader.getPlayerData(9).link, 'https://ibasketball.co.il/?p=9');
});

test('stale legacy identities remain visible without stale jersey, team or PlusMinus values', async () => {
  const session = new Map([['ibba_player_names_api_119472_v8', JSON.stringify({ timestamp: NOW - 8 * DAY,
    players: [['1', { name: 'Legacy One', jersey: '8', teamId: 444, totalPlusMinus: 999 }]] })]]);
  const f = fixture({ session, fetchImpl: async url => { if (includeIDs(url)) return response([player(1)]); throw Error('HTML unavailable'); } });
  assert.strictEqual(f.loader.getPlayerName(1), 'Legacy One');
  assert.strictEqual(f.loader.getPlayerJersey(1), '');
  assert.strictEqual(f.loader.getPlayerTeam(1), null);
  await f.loader.loadReferencedPlayers(games(1));
  assert.strictEqual(f.loader.getPlayerData(1).totalPlusMinus, undefined);
});

test('saving names after HTML failure does not extend cached seasonal verification age', async () => {
  const verified = NOW - 4 * 60 * 1000;
  const session = new Map([['ibba_player_names_api_119472_v8', JSON.stringify({ timestamp: verified,
    players: [['1', { name: 'Legacy One', jersey: '8', teamId: 444, totalPlusMinus: 19 }]] })]]);
  const f = fixture({ session, fetchImpl: async url => { if (includeIDs(url)) return response([player(1)]); throw Error('HTML unavailable'); } });
  assert.strictEqual(f.loader.getPlayerData(1).totalPlusMinus, 19);
  await f.loader.loadReferencedPlayers(games(1), () => true, () => {}, { refresh: true });
  const later = fixture({ session, storage: f.storage, now: NOW + 2 * 60 * 1000 });
  assert.strictEqual(later.loader.getPlayerName(1), 'Player 1');
  assert.strictEqual(later.loader.getPlayerData(1).totalPlusMinus, undefined);
  assert.strictEqual(later.loader.getPlayerTeam(1), null);
});

test('post-only summary names preserve an existing official profile bridge', async () => {
  const profile = 'https://ibasketball.co.il/player/seven/';
  const f = fixture({ storage: cacheStorage([cached(7, 'Known Seven', NOW, profile)]),
    fetchImpl: async () => response(leagueHTML([{ name: 'Official Seven', href: '/?p=7', id: '7' }])) });
  await f.loader.loadReferencedPlayers(games(7));
  assert.strictEqual(f.history.identity({ playerId: 7 }), 'profile:/player/seven');
  assert.strictEqual(f.loader.getPlayerData(7).link, profile);
  assert.strictEqual(JSON.parse(f.storage.get(IDENTITY_KEY)).players[0][1].link, profile);
});

test('post-only API refresh preserves an existing official profile bridge', async () => {
  const profile = 'https://ibasketball.co.il/player/seven/';
  const f = fixture({ storage: cacheStorage([cached(7, 'Known Seven', NOW, profile)]),
    fetchImpl: async url => includeIDs(url) ? response([player(7, 'Official Seven', 'https://ibasketball.co.il/?p=7')]) : response(leagueHTML([])) });
  await f.loader.loadReferencedPlayers(games(7), () => true, () => {}, { refresh: true });
  assert.strictEqual(f.history.identity({ playerId: 7 }), 'profile:/player/seven');
  assert.strictEqual(f.loader.getPlayerData(7).link, profile);
});

test('legacy admin catalog excludes unrelated shared identities while preserving its map and global cache', async () => {
  const storage = cacheStorage([cached(999, 'Other Season Player', NOW, 'https://ibasketball.co.il/player/other-season/')]);
  const f = fixture({ storage, fetchImpl: async url => {
    if (targetURL(url).includes('/league/')) return response(leagueHTML([{ name: 'Official Two', href: '/?p=2', id: '2' }]));
    return response(new URL(targetURL(url)).searchParams.get('page') === '1' ? [player(1, 'Catalog One')] : []);
  } });
  const originalMap = f.loader.namesMap;
  const catalog = await f.loader.loadAllPlayerNames();
  assert.strictEqual(catalog, originalMap);
  assert.deepStrictEqual(Array.from(catalog.keys()).sort(), ['1', '2']);
  assert.strictEqual(f.loader.getPlayerTeam(1), 333);
  assert.strictEqual(f.loader.getPlayerName(999), null);
  const main = fixture({ storage });
  assert.strictEqual(main.loader.getPlayerName(999), 'Other Season Player');
  assert.strictEqual(main.history.identity({ playerId: 999 }), 'profile:/player/other-season');
  await f.loader.loadReferencedPlayers(games(999));
  assert.strictEqual(f.loader.getPlayerName(999), 'Other Season Player', 'referenced loads can reuse an identity excluded from the legacy catalog');
  assert.strictEqual(f.loader.namesMap, originalMap);
});

test('failed legacy catalog does not report generic shared identities as a successful season catalog', async () => {
  const storage = cacheStorage([cached(999, 'Other Season Player')]);
  const f = fixture({ storage, fetchImpl: async () => { throw Error('all season sources unavailable'); } });
  const originalMap = f.loader.namesMap;
  await assert.rejects(() => f.loader.loadAllPlayerNames(), /All proxies failed/);
  assert.strictEqual(f.loader.namesMap, originalMap);
  assert.strictEqual(f.loader.namesMap.size, 0);
  assert.strictEqual(f.loader.isLoaded, false);
  assert.strictEqual(f.loader.sourceState, 'error');
  assert.strictEqual(fixture({ storage }).loader.getPlayerName(999), 'Other Season Player');
});

async function run() {
  let failures = 0;
  for (const { name, run } of tests) {
    try { await run(); console.log(`PASS ${name}`); }
    catch (error) { failures++; console.error(`FAIL ${name}\n${error.stack}`); }
  }
  if (failures) throw Error(`${failures} player-name behavior tests failed`);
  console.log(`${tests.length} player-names tests passed`);
}
run().catch(error => { console.error(error); process.exit(1); });
