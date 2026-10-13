const assert=require('assert'),fs=require('fs'),vm=require('vm');const c={window:{appConfig:{seasonKey:'2026-27'}},console,URL,URLSearchParams};
for(const file of ['ibba_seasons','ibba_player_history','ibba_history_view'])vm.runInNewContext(fs.readFileSync(`js/ibba/${file}.js`,'utf8'),c);
const service=new c.window.IBBAPlayerHistory(),view=new c.window.IBBAHistoryView(service);
const row=(id,seasonKey='2025-26',team='A')=>({playerRef:`post:${id}`,name:'Same name',seasonKey,seasonLabel:'2025/26',team,points:10});
const records=[row(1),row(1,'2024-25'),row(1,'2025-26','B'),row(2)];
assert.strictEqual(service.groupRecords(records).length,2);assert.strictEqual(service.groupRecords(records)[0].records.length,3);
service.registerPlayer({id:1,link:'https://ibasketball.co.il/player/official/'});
assert.strictEqual(service.groupRecords([row(1),{...row(1),playerRef:'profile:/player/official'}]).length,1);
view.data={state:'ready',records:Array.from({length:26},(_,i)=>row(i)),statuses:[]};
assert.strictEqual(view.visiblePlayers().length,0,'default does not dump database');
view.query='Same';assert.strictEqual(view.visiblePlayers().length,25);view.page=2;assert.strictEqual(view.visiblePlayers().length,1);
view.setBroadcastSelection(['post:5'],{ready:true});view.query='nothing';assert.strictEqual(view.context({selectedRefs:['post:5']}).records.length,1);
const nodes=new Map();const node=()=>({listeners:{},addEventListener(type,handler){this.listeners[type]=handler;},focus(){this.focused=true;},setSelectionRange(){},value:''});
view.panel={id:'playerHistoryPrep',innerHTML:'',querySelector:s=>{if(!nodes.has(s))nodes.set(s,node());return nodes.get(s);},querySelectorAll:()=>[]};
view.query='';view.render();assert(!view.panel.innerHTML.includes('<th scope="col" class="p-3 text-right border-b">מקור'));
assert(!view.panel.innerHTML.includes('history-player'));assert(view.panel.innerHTML.includes('פירוט עונות'));
view.setBroadcastSelection([],{ready:false});view.query='Same';view.render();assert(view.panel.innerHTML.includes('disabled'),'add requires ready report');
view.query='';view.render();assert(view.panel.innerHTML.includes('26 שחקנים זמינים לחיפוש'),'empty search must not imply the loaded history has zero players');
c.document={activeElement:{className:'history-search',selectionStart:3},querySelector:()=>null};
view.panel.contains=()=>true;
nodes.get('.history-search').focused=false;view.render();assert(nodes.get('.history-search').focused,'render after a late bridge must retain current search focus');
const failedStatuses=[
  {seasonKey:'2023-24',label:'2023/24',state:'error',error:'HTTP 429',records:[]},
  {seasonKey:'2024-25',label:'2024/25',state:'error',error:'HTTP 403',records:[]},
  {seasonKey:'2025-26',label:'2025/26',state:'error',error:'Origin not allowed',records:[]}
];
const sourceTests=[];
const test=(name,run)=>sourceTests.push({name,run});
test('failed sources without records do not imply confirmed zero players or missing player history',()=>{
  for(const selection of [{query:'',selected:null},{query:'Missing player',selected:null},{query:'',selected:{playerId:99}}]){
    Object.assign(view,selection);view.data={state:'partial',records:[],statuses:failedStatuses};view.render();
    assert(!view.panel.innerHTML.includes('0 שחקנים'),'source failure must not masquerade as an empty verified database');
    assert(!view.panel.innerHTML.includes('לא נמצאה היסטוריה'),'unavailable source cannot prove player absence');
    assert(!view.panel.innerHTML.includes('חפשו שחקן או קבוצה מהעבר'),'a failed empty source should offer retry before search guidance');
    assert(view.panel.innerHTML.includes('אינה זמינה כרגע'),'unavailability must stay explicit');
  }
});
test('source failures use one readable message listing affected seasons without raw errors',()=>{
  view.query='';view.selected=null;view.data={state:'partial',records:[],statuses:failedStatuses};view.render();
  assert(!/HTTP|429|403|Origin not allowed/.test(view.panel.innerHTML),'raw transport diagnostics must not fill the history panel');
  for(const label of ['2023/24','2024/25','2025/26'])assert.strictEqual(view.panel.innerHTML.split(label).length-1,1,'each failed season belongs to one source message');
  assert.strictEqual(view.panel.innerHTML.split('נסו רענון היסטוריה').length-1,1,'one retry message covers the failed seasons');
  assert(view.panel.innerHTML.includes('history-retry'),'retry must remain available');
});
test('partial records remain searchable and selectable while unavailable seasons are explained once',()=>{
  view.query='Same';view.selected=null;view.broadcastReady=true;
  view.data={state:'partial',records:[row(5)],statuses:failedStatuses.slice(0,2)};view.render();
  assert(view.panel.innerHTML.includes('Same name')&&view.panel.innerHTML.includes('data-history-ref="post:5"'),'loaded records remain usable');
  assert(!view.panel.innerHTML.includes('disabled'),'source failure must not block an available player when the report is ready');
  assert(!/HTTP|429|403/.test(view.panel.innerHTML));
  assert.strictEqual(view.panel.innerHTML.split('נסו רענון היסטוריה').length-1,1);
});
test('history loading suppresses previous failure diagnostics and empty results',()=>{
  view.query='Missing';view.data={state:'loading',records:[],statuses:failedStatuses};view.render();
  assert(view.panel.innerHTML.includes('טוען היסטוריה'));
  assert(!/HTTP|429|403|Origin not allowed|0 שחקנים|לא נמצאה היסטוריה/.test(view.panel.innerHTML));
});
test('top-level history failure without per-season statuses still shows unavailability',()=>{
  view.query='';view.data={state:'error',records:[],statuses:[]};view.render();
  assert(view.panel.innerHTML.includes('אינה זמינה כרגע'));
  assert(!view.panel.innerHTML.includes('0 שחקנים'));
});
test('retry replaces failed availability with live recovered records',async()=>{
  view.query='';view.selected=null;view.data={state:'partial',records:[],statuses:failedStatuses};view.render();
  service.loadHistory=async()=>({seasonKey:'2026-27',state:'ready',records:Array.from({length:26},(_,i)=>row(i)),statuses:[]});
  await nodes.get('.history-retry').listeners.click();
  assert(view.panel.innerHTML.includes('26 שחקנים זמינים לחיפוש'),'successful retry restores verified availability');
  assert(!view.panel.innerHTML.includes('אינה זמינה כרגע')&&!view.panel.innerHTML.includes('נסו רענון היסטוריה'));
  view.query='Same';view.render();assert.strictEqual(view.visiblePlayers().length,25);view.page=2;view.render();assert.strictEqual(view.visiblePlayers().length,1);
});
async function run(){let failures=0;for(const {name,run}of sourceTests){try{await run();console.log(`PASS ${name}`);}catch(error){failures++;console.error(`FAIL ${name}: ${error.message}`);}}if(failures)throw Error(`${failures} history source-state tests failed`);console.log('history view tests passed');}
run().catch(error=>{console.error(error);process.exit(1);});
