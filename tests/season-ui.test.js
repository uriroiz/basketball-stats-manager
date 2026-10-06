const assert=require('assert');const fs=require('fs');const vm=require('vm');
const nodes=new Map();
const element=()=>({value:'',innerHTML:'',textContent:'',disabled:false,style:{},
  classList:{add(){},remove(){},contains(){return false;}},addEventListener(){},setAttribute(){},querySelectorAll(){return[];},querySelector(){return null;}});
const document={readyState:'loading',addEventListener(){},querySelectorAll:()=>[],getElementById:id=>{if(!nodes.has(id))nodes.set(id,element());return nodes.get(id);}};
const c=vm.createContext({window:{appConfig:{seasonKey:'2026-27'}},document,URL,URLSearchParams,console:{log(){},warn(){},error(){}},setTimeout:()=>1,clearTimeout(){},Map,Promise});
vm.runInContext(fs.readFileSync('js/ibba/ibba_seasons.js','utf8'),c);
const html=fs.readFileSync('index.html','utf8');
const script=Array.from(html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)).find(m=>m[2].includes('async function selectSeason'))[2];
vm.runInContext(script,c);
assert.strictEqual(vm.runInContext('typeof resetPreparationReport',c),'function','report reset must exist');
vm.runInContext(`gamePrepState.teamAveragesData={old:true};gamePrepState.headToHeadData=[1];currentAdvancedReport={old:true};resetPreparationReport();`,c);
assert.strictEqual(vm.runInContext('gamePrepState.teamAveragesData',c),null);
assert.strictEqual(vm.runInContext('currentAdvancedReport',c),null);
assert.strictEqual(vm.runInContext('gamePrepState.headToHeadData.length',c),0);
vm.runInContext(`currentTeamStatsView='totals';currentPlayerStatsView='totals';toggleTeamStatsView=()=>{currentTeamStatsView='averages';};togglePlayerStatsView=()=>{currentPlayerStatsView='averages';};resetSeasonViews();`,c);
assert.strictEqual(vm.runInContext('currentTeamStatsView',c),'averages');
assert.strictEqual(vm.runInContext('currentPlayerStatsView',c),'averages');
async function run(){
 let release; const pending=new Promise(r=>release=r);let initialized=0;
 c.window.playerNamesLoader={clearCache(){},loadFromSupabase:()=>pending};
 c.initPlayerStats=()=>initialized++;
 const refresh=vm.runInContext('refreshPlayerData()',c);
 vm.runInContext(`seasonController.gate.begin('2024-25');window.playerNamesLoader=null;window.ibbaAnalytics=null;`,c);
 release(1);await refresh;assert.strictEqual(initialized,0,'old refresh must not repopulate new season');
 console.log('season UI tests passed');
}
run().catch(e=>{console.error(e);process.exit(1);});
