const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
function adapter(fetch) {
  const c = {window:{},fetch,console:{log(){},warn(){},error(){}},URL,Date,
    document:{createElement:()=>({set innerHTML(v){this.textContent=v;},textContent:''})}};
  vm.runInNewContext(fs.readFileSync('js/ibba/ibba_adapter.js','utf8'),c);
  return new c.window.IBBAAdapter({key:'2026-27',leagueId:119894,seasonId:119888,seasonMonths:['2026-10','2026-11']});
}
async function run() {
  const urls=[];
  const a = adapter(async url => {
    urls.push(url); const u=new URL(url);
    return {ok:true,json:async()=>Number(u.searchParams.get('offset'))===0
      ? Array.from({length:100},(_,i)=>({id:i+1})) : [{id:101}]};
  });
  assert.strictEqual(a.leagueId,119894,'explicit season controls adapter');
  const r=await a.fetchSeasonGames();
  assert.strictEqual(r.games.length,101);
  assert(urls.every(u=>u.includes('seasons=119888')&&u.includes('leagues=119894')));
  const future=a.convertToInternalFormat({id:1,teams:[10,20],date:'2026-10-13',title:{rendered:'Home — Away'},performance:''});
  assert.strictEqual(future.homeScore,null);
  assert.strictEqual(future.hasResult,false);
  assert.strictEqual(future.hasPlayerStats,false);
  const resultOnly=a.convertToInternalFormat({id:2,teams:[10,20],date:'2024-01-01',title:{rendered:'Home — Away'},results:{10:{pts:'80'},20:{pts:'75'}}});
  assert.strictEqual(resultOnly.homeScore,80);
  assert.strictEqual(resultOnly.hasPlayerStats,false);
  assert.strictEqual(resultOnly.hasResult,true);
  const b=adapter(async url=>({ok:true,json:async()=>{
    const u=new URL(url); if(!u.searchParams.get('month')) return [];
    if(u.searchParams.get('month')==='2026-11') throw Error('offline');
    return [{id:5},{id:5}];
  }}));
  b.fetchViaProxy=async()=>{throw Error('offline');};
  const partial=await b.fetchSeasonGames();
  assert.strictEqual(partial.games.length,1);
  assert.strictEqual(partial.complete,false);
  assert.deepStrictEqual(Array.from(partial.failedMonths),['2026-11']);
  console.log('season adapter tests passed');
}
run().catch(e=>{console.error(e);process.exit(1);});
