const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadAdapter(fetchImpl) {
  const file = path.join(__dirname, '..', 'js', 'ibba', 'ibba_adapter.js');
  const source = fs.readFileSync(file, 'utf8');
  const context = {
    console: { log() {}, warn() {}, error() {} },
    fetch: fetchImpl,
    window: {},
    document: {}
  };

  vm.runInNewContext(source, context);
  return context.window.IBBAAdapter;
}

async function run() {
  const urls = [];
  const IBBAAdapter = loadAdapter(async url => {
    urls.push(url);
    const parsed = new URL(url);
    const month = parsed.searchParams.get('month');
    const data = month === '2026-06'
      ? [
          { id: 1, date: '2026-06-04T20:00:00', performance: { a: {} } },
          { id: 2, date: '2026-06-08T20:00:00', performance: { a: {} } }
        ]
      : [];

    return {
      ok: true,
      json: async () => data
    };
  });

  const adapter = new IBBAAdapter();
  const games = await adapter.fetchGames(50, '2026-06-25T00:00:00', null);

  assert.deepStrictEqual(Array.from(games, game => game.id), [2, 1]);
  assert(urls.some(url => url.includes('month=2026-06')), 'fetches month fallback data');
  assert(urls.every(url => url.includes('leagues=119474')), 'keeps league filter');

  console.log('ibba-adapter tests passed');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
