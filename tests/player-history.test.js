const assert=require('assert');const fs=require('fs');const vm=require('vm');
const c={window:{},URL,Map,Promise,console,DOMParser:class {parseFromString(){return {};}}};
vm.runInNewContext(fs.readFileSync('js/ibba/ibba_seasons.js','utf8'),c);
if(fs.existsSync('js/ibba/ibba_player_history.js'))vm.runInNewContext(fs.readFileSync('js/ibba/ibba_player_history.js','utf8'),c);
const H=c.window.IBBAPlayerHistory; assert(H,'official history parser must exist');
const headers=['#','שחקן','קבוצה','משחקים','דקות','נק׳','ריב','אס׳'];
function table(name,team,href,cloned=false,points='24') {
 const values=['1',name,team,'4','31',points,'3.5','3'];
 const cells=values.map(text=>({textContent:text,querySelector:()=>null}));
 cells[1].querySelector=()=>({getAttribute:()=>href});
 return {classList:{contains:()=>cloned},querySelectorAll:()=>headers.map(textContent=>({textContent})),tBodies:[{rows:[{cells}]}]};
}
const doc={querySelectorAll:()=>[table('ריקי פאק','מ.כ עוטף דרום','/player/1069ee7e3004def2-45364760/'),table('ריקי פאק','wrong','/player/1069ee7e3004def2-45364760/',true),table('Other','A','/?post_type=sp_player&p=609338',false,'—')]};
const history=new H();const records=history.parseOfficialSummaries(doc,c.window.IBBASeasons.getSeason('2025-26'));
assert.strictEqual(records.length,2);assert.strictEqual(records[0].points,24);assert.strictEqual(records[1].points,null);
const prior={...records[0],seasonKey:'2024-25',seasonLabel:'2024/25',team:'הפועל כפר סבא'};
assert.strictEqual(history.getPlayerHistory(records[0].playerRef,[prior,records[0]]).length,2);
assert.strictEqual(history.getPlayerHistory({name:'ריקי פאק'},records).length,0);
assert.strictEqual(prior.team,'הפועל כפר סבא');
history.registerPlayer({id:123,link:'https://ibasketball.co.il/player/1069ee7e3004def2-45364760/'});
assert.strictEqual(history.getPlayerHistory({playerId:123},records).length,1);
assert.strictEqual(history.getPlayerHistory({playerId:609338},records).length,1);
assert.throws(()=>history.parseOfficialSummaries({querySelectorAll:()=>[]},c.window.IBBASeasons.getSeason('2024-25')));
assert(H.insights([prior,records[0]]).some(t=>t.includes('לעומת')),'historical comparison names both seasons');
assert(H.exportRows({state:'ready',records:[records[0]],statuses:[]}).some(row=>row.includes('מ.כ עוטף דרום')));
async function run(){
 const h=new H();let calls=0;
 h.fetchText=async()=>{calls++;throw Error('offline');};
 const failed=await h.loadHistory('2025-26');assert.strictEqual(failed.statuses[0].state,'error');
 h.fetchText=async()=>{calls++;return 'html';};h.parseOfficialSummaries=()=>[prior];
 const success=await h.loadHistory('2025-26');assert.strictEqual(success.records.length,1);assert.strictEqual(calls,2);
 assert.strictEqual((await h.loadHistory('2024-25')).records.length,0);
 const exportData=H.exportRows({seasonKey:'2026-27',state:'loading',records:[],statuses:[]});
 assert(exportData.some(row=>row.includes('ההיסטוריה טרם נטענה')));
 console.log('player history tests passed');
}
run().catch(e=>{console.error(e);process.exit(1);});
