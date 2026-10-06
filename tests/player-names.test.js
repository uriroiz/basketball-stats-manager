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
  const unavailable=new IBBAPlayerNames(null);
  unavailable.fetchPlayersPage=async()=>{throw Error('All proxies failed for page 1');};
  await assert.rejects(()=>unavailable.loadAllPlayerNames(),/All proxies failed/,'source failure must not become successful empty player list');
  assert.strictEqual(unavailable.isLoaded,false,'failed names load remains retryable');
  const fallback=new IBBAPlayerNames(null);
  fallback.addOfficialSummaryNames([{playerRef:'post:609338',name:'Verified player',team:'Historical team'},{playerRef:'profile:/player/some-profile',name:'Profile only'},{playerRef:'post:0',name:'Invalid identity'}]);
  assert.strictEqual(fallback.getPlayerName(609338),'Verified player');
  assert.strictEqual(fallback.namesMap.size,1,'only explicit numeric post identities map to performance player IDs');
  assert.strictEqual(fallback.getPlayerTeam(609338),null,'summary names do not assert current membership');
  const referenced=new IBBAPlayerNames(null);const requested=[];
  referenced.fetchPlayerById=async id=>{requested.push(id);return id==='772662'?{id:772662,title:{rendered:'ריקי פאק'},link:'https://ibasketball.co.il/player/profile/'}:{id:999,title:{rendered:'Wrong identity'}};};
  await referenced.loadReferencedPlayers([{players:[{playerId:'772662'},{playerId:'772662'},{playerId:'906516'}]}]);
  assert.strictEqual(referenced.getPlayerName('772662'),'ריקי פאק','known event ID resolves from official individual player API');
  assert.strictEqual(referenced.getPlayerName('906516'),null,'mismatched API identity never used');
  assert.strictEqual(requested.filter(id=>id==='772662').length,1,'duplicate appearances request identity once');
  const progressive=new IBBAPlayerNames(null);let releaseLast;const last=new Promise(resolve=>releaseLast=resolve),updates=[];
  progressive.fetchPlayerById=async id=>{if(id==='7')await last;return {id:Number(id),title:{rendered:`Player ${id}`}};};
  const progress=progressive.loadReferencedPlayers([{players:[1,2,3,4,5,6,7].map(playerId=>({playerId}))}],()=>true,()=>updates.push(progressive.getPlayerName(1)));
  for(let i=0;i<12;i++)await Promise.resolve();
  assert(updates.includes('Player 1'),'resolved names become available to the UI before the final request finishes');
  releaseLast();await progress;

  console.log('player-names tests passed');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
