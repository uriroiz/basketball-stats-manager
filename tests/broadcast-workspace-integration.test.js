const assert=require('assert'),fs=require('fs'),vm=require('vm'),load=require('./helpers/broadcast');
const nodes=new Map();
const node=id=>({id,innerHTML:'',value:'',textContent:'',disabled:false,style:{},dataset:{},events:{},
 classList:{add(){},remove(){},toggle(){},contains(){return false;}},addEventListener(n,f){this.events[n]=f;},removeEventListener(n){delete this.events[n];},setAttribute(){},scrollIntoView(){},focus(){},contains(){return false;},
 querySelector(s){return id==='prepWorkspace'&&s==='#broadcastPersonal'?document.getElementById('broadcastPersonal'):null;},querySelectorAll(){return[];}});
const document={readyState:'loading',activeElement:null,addEventListener(){},querySelectorAll:()=>[],getElementById:id=>{if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id);}};
const stored=new Map(),storage={getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,v)};
const location={href:'http://localhost/?season=2026-27&view=gamePrep&game=44&keep=value'};
const c=load(['ibba_seasons','ibba_analysis_scope','ibba_broadcast_copy','ibba_broadcast_view','ibba_broadcast_editorial','ibba_broadcast_workspace','ibba_broadcast_workspace_view','ibba_broadcast_workspace_controller'],
 {document,location,history:{replaceState:(_,__,url)=>location.href=String(url)},localStorage:storage,window:{appConfig:{seasonKey:'2026-27',seasonLabel:'2026/27'},localStorage:storage},console:{log(){},warn(){},error(){}},setTimeout,clearTimeout});
const html=fs.readFileSync('index.html','utf8'),script=Array.from(html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)).find(m=>m[1].includes('async function selectSeason'))[1];
vm.runInContext(script,c);
assert.strictEqual(typeof c.restorePreparationFromUrl,'function','active page restores game deep links');
async function run(){
 vm.runInContext('allGames=[{}]',c);c.initTeamStats=()=>{};c.switchTab('teams');
 assert(location.href.includes('view=teams'),'switching panels updates the restorable URL');
 assert(!location.href.includes('game='),'leaving preparation clears the game deep link');
 assert(location.href.includes('keep=value'));
 location.href='http://localhost/?season=2026-27&view=gamePrep&game=44&keep=value';
 const match={seasonKey:'2026-27',gameId:44,date:'2099-10-13',homeTeam:'A',awayTeam:'B',teams:[{teamId:1,name:'A'},{teamId:2,name:'B'}]};
 vm.runInContext('scheduleGames=[]',c);c.switchTab=()=>{};c.initGamePrep=async()=>{};let calls=0;
 c.window.IBBABroadcastReport={};c.loadBroadcastPreparation=async()=>{calls++;};
 vm.runInContext(`scheduleGames=${JSON.stringify([match])}`,c);
 await c.restorePreparationFromUrl({seasonKey:'2026-27',scheduleGames:[match],isCurrent:()=>true,complete:true});
 assert.strictEqual(calls,1);assert.strictEqual(c.window.broadcastWorkspaceController.snapshot().state.matchRef.gameId,'44');
 assert(location.href.includes('keep=value')&&location.href.includes('game=44'));
 const ws=c.window.broadcastWorkspaceController.workspace;
 ws.apply({type:'add',matchRef:match,story:{storyKey:'s',text:'saved',factFingerprint:'f'}});
 await c.restorePreparationFromUrl({seasonKey:'2026-27',scheduleGames:[{...match,date:'2026-01-01',hasResult:true}],isCurrent:()=>true,complete:true});
 assert.strictEqual(calls,1,'past game only restores stored points');assert(c.window.broadcastWorkspaceController.readOnly);
 assert.strictEqual(c.window.broadcastWorkspaceController.snapshot().state.items[0].storySnapshot.text,'saved');
 await c.restorePreparationFromUrl({seasonKey:'2026-27',scheduleGames:[],isCurrent:()=>true,complete:false});
 assert(c.window.broadcastWorkspaceController.snapshot().cached);
 assert.strictEqual(calls,1,'offline snapshot does not start a new analysis');
 const old=c.window.broadcastWorkspaceController;
 const stale=await c.restorePreparationFromUrl({seasonKey:'2026-27',scheduleGames:[match],isCurrent:()=>false});
 assert.strictEqual(stale,false);assert.strictEqual(c.window.broadcastWorkspaceController,old);
 location.href='http://localhost/?season=2026-27&view=gamePrep&game=999';
 await c.restorePreparationFromUrl({seasonKey:'2026-27',scheduleGames:[match],isCurrent:()=>true,complete:true});
 assert.strictEqual(calls,1);assert(document.getElementById('seasonStatus').textContent.includes('לא נמצא'));
 console.log('broadcast workspace integration tests passed');
}
run().catch(e=>{console.error(e);process.exit(1);});
