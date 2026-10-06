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
assert.strictEqual(typeof S.getUpcomingGames,'function','shared upcoming eligibility required');
const fixtures=[{gameId:1,seasonKey:'2026-27',date:'2026-10-13',hasResult:false},{gameId:2,seasonKey:'2026-27',date:'2026-10-01',hasResult:false},{gameId:3,seasonKey:'2026-27',date:'2026-10-15',hasResult:true},{gameId:4,seasonKey:'2024-25',date:'2026-10-20',hasResult:false}];
assert.deepStrictEqual(Array.from(S.getUpcomingGames(fixtures,'2026-27',new Date('2026-10-06')),g=>g.gameId),[1]);
assert.strictEqual(S.getUpcomingGames(fixtures,'2024-25',new Date('2026-10-06')).length,0,'no prep in historical season even if bad future date');
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
  const applied=[]; const pending={};
  assert(context.window.IBBASeasonController,'season controller must guard asynchronous UI updates');
  const controller=new context.window.IBBASeasonController({loadSeason:key=>new Promise(r=>pending[key]=r)});
  const older=controller.select('2025-26',r=>applied.push(r.seasonKey));
  const newer=controller.select('2026-27',r=>applied.push(r.seasonKey));
  pending['2026-27']({seasonKey:'2026-27'}); await newer;
  pending['2025-26']({seasonKey:'2025-26'}); await older;
  assert.deepStrictEqual(applied,['2026-27']);
  console.log('season tests passed');
}
run().catch(e=>{console.error(e);process.exit(1);});
