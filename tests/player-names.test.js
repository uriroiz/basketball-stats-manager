const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadPlayerNames(consoleImpl) {
  const file = path.join(__dirname, '..', 'js', 'ibba', 'ibba_player_names.js');
  const source = fs.readFileSync(file, 'utf8');
  const storage = new Map();
  const context = {
    console: consoleImpl,
    fetch: async () => {
      throw new Error('proxy down');
    },
    setTimeout: () => 1,
    clearTimeout: () => {},
    AbortController,
    window: {},
    sessionStorage: {
      getItem: key => storage.get(key) || null,
      setItem: (key, value) => storage.set(key, value),
      removeItem: key => storage.delete(key)
    },
    DOMParser: class {
      parseFromString() {
        return { querySelectorAll: () => [] };
      }
    }
  };

  vm.runInNewContext(source, context);
  return context.window.IBBAPlayerNames;
}

async function run() {
  const errors = [];
  const warnings = [];
  const IBBAPlayerNames = loadPlayerNames({
    log() {},
    warn: (...args) => warnings.push(args.join(' ')),
    error: (...args) => errors.push(args.join(' '))
  });

  const loader = new IBBAPlayerNames(null);
  const count = await loader.loadPlayerStatsFromHTML();

  assert.strictEqual(count, 0);
  assert.strictEqual(errors.length, 0, 'optional enrichment failure should not log console.error');
  assert(warnings.some(line => line.includes('Failed to load player stats from HTML')));

  console.log('player-names tests passed');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
