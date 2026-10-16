const assert=require('assert'),fs=require('fs'),vm=require('vm');
const nodes=new Map();
const document={readyState:'loading',addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,{innerHTML:''});return nodes.get(id);}};
const c=vm.createContext({window:{},document,URL,console:{log(){}},setTimeout:()=>1});
vm.runInContext(fs.readFileSync('js/ibba/ibba_seasons.js','utf8'),c);
const script=Array.from(fs.readFileSync('index.html','utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)).find(m=>m[1].includes('async function selectSeason'))[1];
vm.runInContext(script,c);
const home='א.ס. אשקלון/קרית גת',away='מכבי אב-גד רעננה';
const firstRound=[
  {homeTeam:'עירוני אשקלון',awayTeam:home,homeScore:88,awayScore:68,hasResult:true},
  {homeTeam:away,awayTeam:'הפועל חבל מודיעין',homeScore:84,awayScore:72,hasResult:true}
];
c.fixtures=firstRound;vm.runInContext('allGames=fixtures',c);
c.window.ibbaAnalytics={getTeamAverages:()=>[home,away].map(teamName=>({teamName,gamesPlayed:1,ppg:80,rpg:30,apg:15,spg:9,bpg:2,efficiencyAvg:90}))};
c.loadTeamAverages(home,away,firstRound);
let stored=vm.runInContext('gamePrepState.teamAveragesData',c);
assert.strictEqual(stored.homeStats.seasonRecord,'0-1','overall record preserves the first away defeat despite no home games');
assert.strictEqual(stored.awayStats.seasonRecord,'1-0','overall record preserves the first home win despite no away games');
let rendered=document.getElementById('teamAverages').innerHTML;
assert(rendered.includes('מאזן העונה'),'card distinguishes overall season record from the venue split');
assert(rendered.includes('טרם שיחקה בבית')&&rendered.includes('טרם שיחקה בחוץ'),'empty venue is explicit rather than an unexplained 0-0');
assert(!rendered.includes('הפרש ממוצע בניצחונות'),'empty venue does not publish zero winning margins');
assert.strictEqual(c.getHomeAwayRecord(away,true).record,'1-0');
assert.strictEqual(c.getHomeAwayRecord(home,false).record,'0-1');
assert.strictEqual(c.getHomeAwayRecord(away,true).avgWinsMargin,12);
assert.strictEqual(c.getHomeAwayRecord(home,false).avgLossesMargin,-20);

const results=[...firstRound,
  {homeTeam:home,awayTeam:'יריבה',homeScore:90,awayScore:80,hasResult:true,hasPlayerStats:false},
  {homeTeam:'יריבה',awayTeam:away,homeScore:81,awayScore:85,hasResult:true,hasPlayerStats:false},
  {homeTeam:home,awayTeam:'יריבה',homeScore:81,awayScore:80,hasResult:false},
  {homeTeam:home,awayTeam:away,homeScore:null,awayScore:null,hasResult:false},
  {homeTeam:home,awayTeam:away,homeScore:'',awayScore:80},
  {homeTeam:home,awayTeam:away,homeScore:80,awayScore:80},
  {homeTeam:home,awayTeam:away,homeScore:undefined,awayScore:80}
];
c.loadTeamAverages(home,away,results);
stored=vm.runInContext('gamePrepState.teamAveragesData',c);
assert.strictEqual(stored.homeStats.record,'1-0','results without player stats still count at home');
assert.strictEqual(stored.awayStats.record,'1-0','results without player stats still count away');
assert.strictEqual(stored.homeStats.seasonRecord,'1-1');assert.strictEqual(stored.awayStats.seasonRecord,'2-0');
assert.strictEqual(stored.homeStats.recordGames,1);assert.strictEqual(stored.awayStats.recordGames,1);
assert.strictEqual(stored.homeStats.avgWinsMargin,10);assert.strictEqual(stored.awayStats.avgWinsMargin,4);
assert.strictEqual(stored.homeStats.avgLossesMargin,null,'missing losses have no average loss margin');
rendered=document.getElementById('teamAverages').innerHTML;
assert(rendered.includes('dir="ltr">1-0</bdi>'),'wins and losses keep their order in RTL');
assert(rendered.includes('הפרש ממוצע בניצחונות בבית'));
assert(!rendered.includes('הפרש ממוצע בהפסדים'),'absent losses do not appear as zero-point defeats');

const multi=[
  {homeTeam:home,awayTeam:'יריבה',homeScore:'90',awayScore:'80'},
  {homeTeam:home,awayTeam:'יריבה',homeScore:95,awayScore:81},
  {homeTeam:home,awayTeam:'יריבה',homeScore:70,awayScore:80}
];
const record=c.getHomeAwayRecord(home,true,multi);
assert.strictEqual(record.record,'2-1');assert.strictEqual(record.games,3);
assert.strictEqual(record.avgWinsMargin,12);assert.strictEqual(record.avgLossesMargin,-10);
let rows,downloaded=false;
c.window.IBBABroadcastReport={exportRows:()=>[]};
c.XLSX={utils:{book_new:()=>({SheetNames:['הכנה למשחק']}),aoa_to_sheet:value=>{rows=value;return{};},book_append_sheet(){}},write:()=>[]};
c.JSZip={loadAsync:async()=>({file:()=>null,generateAsync:async()=>({})})};
c.URL={createObjectURL:()=> 'blob:qa',revokeObjectURL(){}};
document.createElement=()=>({click(){downloaded=true;}});c.alert=message=>{throw Error(message);};
vm.runInContext(`currentAdvancedReport={seasonKey:'2026-27',gameInfo:{homeTeam:${JSON.stringify(home)},awayTeam:${JSON.stringify(away)},date:'2026-10-23'}}`,c);
async function checkExport(){
  c.loadTeamAverages(home,away,firstRound);
  await c.exportInsightsToExcel({mode:'full'});
  assert(downloaded,'full report exports despite missing venue margins');
  assert.deepStrictEqual(Array.from(rows.find(r=>r[0]==='מאזן העונה (ניצחונות–הפסדים)')),['מאזן העונה (ניצחונות–הפסדים)','0-1','1-0']);
  assert.deepStrictEqual(Array.from(rows.find(r=>r[0]==='מאזן (בית/חוץ)')),['מאזן (בית/חוץ)','טרם שיחקה בבית','טרם שיחקה בחוץ']);
  assert.deepStrictEqual(Array.from(rows.find(r=>r[0]==='הפרש ממוצע בניצחונות')),['הפרש ממוצע בניצחונות','—','—']);
  c.loadTeamAverages(home,away,results);
  await c.exportInsightsToExcel({mode:'full'});
  assert.deepStrictEqual(Array.from(rows.find(r=>r[0]==='הפרש ממוצע בניצחונות')),['הפרש ממוצע בניצחונות','10.0','4.0']);
  assert.deepStrictEqual(Array.from(rows.find(r=>r[0]==='הפרש ממוצע בהפסדים')),['הפרש ממוצע בהפסדים','—','—']);
  console.log('home/away record tests passed');
}
checkExport().catch(error=>{console.error(error);process.exit(1);});
