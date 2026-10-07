const assert=require('assert'),load=require('./helpers/broadcast');
const c=load(['ibba_seasons','ibba_analysis_scope','ibba_broadcast_copy','ibba_broadcast_editorial']);
const E=c.window.IBBABroadcastEditorial;assert(E,'editorial service exists');
const scope=c.window.IBBAAnalysisScope.fromGames([{seasonKey:'2025-26',gameId:1}],{phase:'all',mode:'recent',count:5});
const story=(type,team=1,extras={})=>({type,family:'PROFILE',teamIds:[team],seasonKeys:['2025-26'],analysisScope:scope,text:type,
 facts:{metric:'points',value:80},dataState:'ready',...extras});
const s=story('WINDOW_STYLE'),reword={...s,text:'new wording'},changed={...s,facts:{metric:'points',value:85},evidence:[{seasonKey:'2025-26',gameId:2}]};
assert.strictEqual(E.storyKey(s),E.storyKey(reword));
assert.strictEqual(E.storyKey(s),E.storyKey(changed));
assert.notStrictEqual(E.fingerprint(s),E.fingerprint(changed));
assert.strictEqual(E.fingerprint(s),E.fingerprint({...s,analysisScope:{...scope,asOf:'2026-10-08',windows:scope.windows.map(w=>({...w,asOf:'2026-10-08'}))}}),'refresh cutoff alone is not a changed fact');
assert.strictEqual(E.storyKey({...s,teamIds:[],teamName:'same name'}),null,'name alone never merges');
const current=story('RECENT_WINDOW_CHANGE',1,{scope:'current',family:'MOMENTUM',seasonKeys:['2026-27'],facts:{metric:'points',difference:8,value:90,referenceValue:82}});
const round=story('ROUND_TEAM_SUMMARY',2,{family:'ROUND',facts:{round:1,roundMetrics:{points:80,opponentPoints:70,margin:10}}});
const strong=story('HALFTIME_RECORD',1,{family:'DECIDING',facts:{position:'leading',wins:25,total:27}});
const tiny=story('HALFTIME_RECORD',1,{family:'DECIDING',seasonKeys:['2024-25'],analysisScope:{...scope,requestedSeasonKeys:['2024-25']},facts:{position:'leading',wins:1,total:1}});
const candidates=[round,s,tiny,strong,current];
const result=E.prepare(candidates,{match:{teams:[{teamId:1},{teamId:2}]}});
assert(result.topStories.findIndex(x=>x.type===current.type)<result.topStories.findIndex(x=>x.type===round.type));
assert.strictEqual(E.tier(tiny),6,'one of one has no exceptional-record priority');
assert(result.topStories.findIndex(x=>x.facts.total===27)<result.topStories.findIndex(x=>x.type==='WINDOW_STYLE'));
assert.deepStrictEqual(Array.from(E.prepare([...candidates].reverse(),{match:{teams:[{teamId:1},{teamId:2}]}}).topStories,x=>x.storyKey),Array.from(result.topStories,x=>x.storyKey));
assert.strictEqual(E.prepare([s,s],{}).topStories.length,1);
assert.strictEqual(E.prepare([s],{}).topStories.length,1,'no padding');
const unresolved={...s,teamIds:[],playerRef:null,id:'unresolved',text:'unresolved identity'};
const detailed=E.prepare([unresolved],{});
assert.strictEqual(detailed.allStories.length,1,'unresolved stories remain in detailed results');
assert.strictEqual(detailed.topStories.length,0,'unresolved identities never become unsaveable recommendations');
const game=(id,key,winner=1)=>({gameId:id,seasonKey:key,hasResult:true,date:`${key.slice(0,4)}-12-01`,teams:[{teamId:1,name:'A',score:winner===1?85:82},{teamId:2,name:'B',score:winner===2?85:82}]});
const context={match:{seasonKey:'2026-27',teams:[{teamId:1,name:'A'},{teamId:2,name:'B'}]},priorSeasons:[
 {seasonKey:'2024-25',state:'ready',resultGames:[game(1,'2024-25'),game(2,'2024-25'),game(2,'2024-25')]},
 {seasonKey:'2025-26',state:'ready',resultGames:[game(1,'2025-26'),game(2,'2025-26')]},
 {seasonKey:'2023-24',state:'error',resultGames:[game(9,'2023-24')]}]};
const pooled=E.prepare([],context).topStories.find(x=>x.type==='POOLED_H2H_RECORD');
assert.strictEqual(pooled.facts.total,4);
assert.strictEqual(pooled.seasonKeys.length,2);
assert(pooled.text.includes('4')&&pooled.text.includes('2024/25')&&!pooled.text.includes('2023/24'));
assert.strictEqual(pooled.evidence.length,4);
context.priorSeasons[1].resultGames=[game(1,'2025-26',2),game(2,'2025-26',2)];
const tied=E.prepare([],context).topStories[0];
assert(tied.text.includes('כל קבוצה ניצחה')&&tied.text.includes('2'));
const input=JSON.stringify(candidates);E.prepare(candidates,{});assert.strictEqual(JSON.stringify(candidates),input);
const metrics=['points','opponentPoints','margin'].map((metric,index)=>story('ROUND_SCORING',1,{family:'ROUND',facts:{metric,value:[81.5,80.5,1][index],round:1,roundResults:[{seasonKey:'2024-25',gameId:1,margin:30},{seasonKey:'2025-26',gameId:1,margin:-28}]},sampleSize:2}));
const merged=E.prepare(metrics,{}).topStories;
assert.strictEqual(merged.length,1);
assert(merged[0].text.includes('30')&&merged[0].text.includes('28'),'actual outcomes survive merge');
const actual=load(['ibba_seasons','ibba_window_stats','ibba_analysis_scope','ibba_rich_insights','ibba_broadcast_copy','ibba_broadcast_editorial','ibba_broadcast_workspace']);
const opponentGames=[1,2].map(id=>({gameId:String(id),seasonKey:'2025-26',date:`2026-01-0${id}`,hasResult:true,roundVerified:true,competitionPhase:'regular',roundNumber:id,
 teams:[{teamId:3,name:'Old club',score:80},{teamId:id,name:id===1?'A':'B',score:70}],playerObservations:[{playerId:7,teamId:3,teamName:'Old club',participation:'verified',availableMetrics:['points'],stats:{points:id*10}}]}));
const playerContext={match:{seasonKey:'2026-27',gameId:44,teams:[{teamId:1,name:'A'},{teamId:2,name:'B'}]},asOf:'2026-10-07',currentComplete:true,currentResultGames:[],currentRegularGames:[],
 identity:r=>typeof r==='object'?`post:${r.playerId}`:r,playerSummaries:{records:[]},priorSeasons:[{seasonKey:'2025-26',state:'ready',resultGames:opponentGames,regularGames:opponentGames}]};
const profiles=actual.window.IBBABroadcastEditorial.prepare(actual.window.IBBARichInsights.generate(playerContext,{playerRefs:['post:7']}),playerContext).allStories.filter(s=>s.type==='PLAYER_OPPONENT_PROFILE'&&s.facts.metric==='points');
assert.strictEqual(profiles.length,2);
assert.notStrictEqual(profiles[0].storyKey,profiles[1].storyKey,'official opposing teams produce distinct player story keys');
assert.deepStrictEqual(Array.from(profiles,s=>String(s.analysisScope.windows[0].opponentId)).sort(),['1','2']);
const workspace=new actual.window.IBBABroadcastWorkspace({storage:{getItem:()=>null,setItem(){}}});workspace.load(playerContext.match);
for(const story of profiles)workspace.apply({type:'add',matchRef:playerContext.match,story});
workspace.reconcile({gameInfo:playerContext.match,allInsights:profiles,context:playerContext});
assert.strictEqual(workspace.snapshot().state.items.length,2,'both opponent stories save independently');
assert(workspace.snapshot().state.items.every(i=>i.status==='active'),'unchanged report never swaps the opposing team');
console.log('broadcast editorial tests passed');
