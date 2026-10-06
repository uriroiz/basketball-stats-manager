const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const context = {window: {}, URLSearchParams, console, Map, Promise};
const file = 'js/ibba/ibba_seasons.js';
if (fs.existsSync(file)) vm.runInNewContext(fs.readFileSync(file, 'utf8'), context);
const S = context.window.IBBASeasons;
assert(S, 'season registry must be available');
assert.strictEqual(S.getSeason('2026-27').leagueId, 119894);
assert.strictEqual(S.getSeason('2024-25').seasonId, 18985);
assert.strictEqual(S.getSeason('2025-26').seasonId, 119472);
assert.strictEqual(S.getSeason('2026-27').seasonMonths.length, 12);
const storage = {getItem: () => '2024-25'};
assert.strictEqual(S.resolveInitialSeason({search:'?season=2025-26'}, storage), '2025-26');
assert.strictEqual(S.resolveInitialSeason({search:''}, storage), '2024-25');
assert.strictEqual(S.resolveInitialSeason({search:'?season=bad'}, storage), '2026-27');
assert.strictEqual(S.resolveInitialSeason({search:''}, {getItem(){throw Error('blocked');}}), '2026-27');
async function run() {
  let calls = 0, release;
  const data = new context.window.IBBASeasonData(() => ({
    fetchSeasonGames: () => {calls++; return new Promise(r => { release = r; });},
    convertToInternalFormat: x => x
  }));
  const first = data.loadSeason('2026-27');
  const second = data.loadSeason('2026-27');
  release({games:[{gameId:1,hasPlayerStats:false},{gameId:2,hasResult:true,hasPlayerStats:true}],complete:true,failedMonths:[]});
  const result = await first;
  assert.strictEqual((await second), result);
  assert.strictEqual(calls,1);
  assert.strictEqual(result.scheduleGames.length,2);
  assert.strictEqual(result.analyticsGames.length,1);
  data.invalidateSeason('2026-27');
  const third = data.loadSeason('2026-27');
  release({games:[],complete:false,failedMonths:['2026-10']});
  assert.strictEqual((await third).complete,false);
  const fourth = data.loadSeason('2026-27');
  release({games:[],complete:true,failedMonths:[]});
  await fourth;
  assert.strictEqual(calls,3,'partial results are retried');
  const gate = new S.SelectionGate();
  const a = gate.begin('2025-26');
  const b = gate.begin('2026-27');
  assert.strictEqual(gate.isCurrent(a),false);
  assert.strictEqual(gate.isCurrent(b),true);
  console.log('season tests passed');
}
run().catch(e=>{console.error(e);process.exit(1);});
