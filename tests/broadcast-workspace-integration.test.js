const assert=require('assert'),fs=require('fs'),vm=require('vm'),load=require('./helpers/broadcast');
const nodes=new Map();
const node=id=>{const classes=new Set();return {id,innerHTML:'',value:'',textContent:'',disabled:false,options:[],style:{},dataset:{},events:{},
 classList:{add(v){classes.add(v);},remove(v){classes.delete(v);},toggle(v,on){const enabled=on??!classes.has(v);enabled?classes.add(v):classes.delete(v);},contains(v){return classes.has(v);}},addEventListener(n,f){this.events[n]=f;},removeEventListener(n){delete this.events[n];},setAttribute(){},scrollIntoView(){},focus(){},contains(){return false;},
 querySelector(s){return id==='prepWorkspace'&&s==='#broadcastPersonal'?document.getElementById('broadcastPersonal'):null;},querySelectorAll(){return[];}};};
const document={readyState:'loading',activeElement:null,addEventListener(){},querySelectorAll:()=>[],getElementById:id=>{if(!nodes.has(id))nodes.set(id,node(id));return nodes.get(id);}};
const stored=new Map(),storage={getItem:k=>stored.get(k)??null,setItem:(k,v)=>stored.set(k,v)};
const location={href:'http://localhost/?season=2026-27&view=gamePrep&game=44&keep=value'};
const c=load(['ibba_seasons','ibba_analysis_scope','ibba_broadcast_copy','ibba_broadcast_view','ibba_broadcast_editorial','ibba_broadcast_workspace','ibba_broadcast_workspace_view','ibba_broadcast_workspace_controller'],
 {document,location,history:{replaceState:(_,__,url)=>location.href=String(url)},localStorage:storage,window:{appConfig:{seasonKey:'2026-27',seasonLabel:'2026/27'},localStorage:storage},console:{log(){},warn(){},error(){}},setTimeout,clearTimeout});
const html=fs.readFileSync('index.html','utf8'),script=Array.from(html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)).find(m=>m[1].includes('async function selectSeason'))[1];
vm.runInContext(script,c);
assert.strictEqual(typeof c.restorePreparationFromUrl,'function','active page restores game deep links');
async function run(){
 const realSwitch=c.switchTab,realLoad=c.loadBroadcastPreparation;
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
 const oldMatch={...match,seasonKey:'2025-26',date:'2026-01-01',hasResult:true};
 location.href='http://localhost/?season=2025-26&view=gamePrep&game=44';c.window.appConfig.seasonKey='2025-26';
 await c.restorePreparationFromUrl({seasonKey:'2025-26',scheduleGames:[oldMatch],complete:true});
 assert(document.getElementById('prepGameChooser').classList.contains('hidden'));
 assert(document.getElementById('prepExportStatus').textContent.includes('הדף השמור'));
 c.resetPreparationReport();
 assert(!document.getElementById('prepExportStatus').textContent.includes('הדף השמור'),'reset clears cached export messaging from the previous season');
 c.window.appConfig.seasonKey='2026-27';realSwitch('gamePrep');
 assert(!document.getElementById('prepGameChooser').classList.contains('hidden'),'returning to active season restores the upcoming-match chooser');
 c.window.matchContextService={};c.window.IBBABroadcastReport={build:async()=>({seasonKey:match.seasonKey,gameInfo:match,currentSeason:null,topStories:[],allInsights:[],historicalInsights:[],families:{},selectedPlayerRefs:[],sourceStatuses:[],historicalContext:{state:'ready'},context:{match,priorSeasons:[],playerSummaries:{state:'ready',records:[],statuses:[]}}})};
 await realLoad(match);
 assert(document.getElementById('prepExport').disabled,'actual empty report publication preserves recommended-export availability');
 const closeStory=(teamId,teamName,text)=>({type:'CLOSE_GAME_RECORD',family:'DECIDING',teamIds:[teamId],teamName,
  seasonKeys:['2025-26'],scope:'historical',sampleSize:5,facts:{wins:4,total:5,threshold:5},text});
 const homeStory=closeStory(1,'A','home-close'),awayStory=closeStory(2,'B','away-close');
 const organizedReport={seasonKey:match.seasonKey,gameInfo:match,context:{match,priorSeasons:[]},topStories:[homeStory],
  allInsights:[homeStory,awayStory],families:{DECIDING:[homeStory,awayStory]},sourceStatuses:[],historicalContext:{state:'ready'}};
 c.renderBroadcastReport(organizedReport);
 let rendered=document.getElementById('broadcastReport').innerHTML;
 assert(rendered.includes('data-broadcast-team="1"')&&rendered.includes('data-broadcast-team="2"'),'active comparison screen explicitly sections both official teams');
 const familyMarkup=rendered.split('data-broadcast-family="DECIDING"')[1];
 assert.strictEqual(familyMarkup.split('home-close').length-1,1,'comparison family does not repeat recommendation cards above the same facts');
 assert(familyMarkup.includes('away-close'),'opponent facts remain visible in the same family');
 c.renderBroadcastReport({...organizedReport,allInsights:[homeStory],families:{DECIDING:[homeStory]}});
 rendered=document.getElementById('broadcastReport').innerHTML;
 assert(rendered.includes('data-broadcast-team="2"')&&rendered.includes('אין נתונים זמינים לנושא זה'),'team without prior league games is explained instead of silently omitted');
 const roundSummary={...homeStory,type:'ROUND_TEAM_SUMMARY',family:'ROUND',storyKey:'round-summary',text:'round-results-outside-recommendations',
  facts:{round:1,metric:'margin',value:2,roundMetrics:{points:82,opponentPoints:80,margin:2}}};
 const roundMetric={...roundSummary,type:'ROUND_SCORING',storyKey:'round-margin',text:'raw-round-metric'};
 c.renderBroadcastReport({...organizedReport,topStories:[],allInsights:[roundMetric,roundSummary],families:{ROUND:[roundMetric,roundSummary]}});
 rendered=document.getElementById('broadcastReport').innerHTML;
 assert(rendered.includes('round-results-outside-recommendations'),'combined round result remains visible even when not selected for the recommendations');
 assert(rendered.includes('data-workspace-action="add" data-story-key="round-summary"'),'combined round result remains saveable without duplicate recommendation cards');
 console.log('broadcast workspace integration tests passed');
}
run().catch(e=>{console.error(e);process.exit(1);});
