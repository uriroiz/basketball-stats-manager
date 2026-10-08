const assert=require('assert'),load=require('./helpers/broadcast');
const c=load(['ibba_seasons','ibba_window_stats','ibba_analysis_scope','ibba_rich_insights','ibba_broadcast_copy','ibba_broadcast_editorial','ibba_broadcast_view','ibba_broadcast_workspace','ibba_broadcast_workspace_view']);
const R=c.window.IBBARichInsights,V=c.window.IBBABroadcastWorkspaceView,E=c.window.IBBABroadcastEditorial;
const game=(id,margin,{away=true,seasonKey='2025-26',hasResult=true,metrics=false}={})=>{
 const own={teamId:1,name:'מכבי רחובות',score:75+margin},rival={teamId:2,name:`יריבה ${id}`,score:75};
 return {gameId:String(id),seasonKey,date:`2026-01-${String((id-1)%28+1).padStart(2,'0')}`,hasResult,roundNumber:id,roundVerified:true,competitionPhase:'regular',
  teams:away?[rival,own]:[own,rival],metricAvailability:{1:metrics?['assists']:[]},teamStats:{[away?'away':'home']:{assists:8}}};
};
const context=games=>({match:{seasonKey:'2026-27',gameId:44,teams:[{teamId:1,name:'מכבי רחובות'},{teamId:2,name:'יריבה'}]},asOf:'2026-10-08',identity:r=>r,
 currentComplete:true,currentGames:[],currentResultGames:[],currentRegularGames:[],playerSummaries:{state:'ready',records:[],statuses:[]},
 priorSeasons:[{seasonKey:'2025-26',state:'ready',resultGames:games,regularGames:games}]});
const prepare=ctx=>E.prepare(R.generate(ctx).map(s=>({...s,text:c.window.IBBABroadcastCopy.format(s)})),ctx).allStories;
const awayGames=Array.from({length:16},(_,i)=>game(i+1,i<10?15:-5,{metrics:i<2}));
const venueContext=context([...awayGames,game(17,30,{away:false}),game(18,-10,{away:false}),game(19,4,{hasResult:false})]);
const venue=prepare(venueContext).find(s=>s.type==='VENUE_PROFILE'&&s.teamIds[0]===1&&s.facts.metric==='margin'&&s.facts.venue==='away');
const failures=[];
function regression(name,fn){try{fn();}catch(error){failures.push(`${name}: ${error.message}`);}}
regression('hide repeated generic details',()=>assert(!V.card({storyKey:'bare',text:'7.5 points over 16 games',facts:{value:7.5,total:16},sampleSize:16,analysisScope:{phase:'all',mode:'season'}}).includes('<details'),'no extra evidence means no disclosure'));
regression('away margins show outcomes',()=>{
 assert(Array.isArray(venue.detailGroups),'rich stories contain their exact supporting games');
 const group=venue.detailGroups[0];assert.strictEqual(group.games.length,16);
 assert(group.games.every(g=>g.venue==='away'));assert.strictEqual(venue.facts.value,7.5);
 const html=V.card(venue),plain=html.replace(/<[^>]*>/g,'');assert(plain.includes('10 ניצחונות')&&plain.includes('6 הפסדים'),'mean margin is accompanied by its actual record');
 assert.strictEqual((html.match(/<tr data-detail-game=/g)||[]).length,16);
 assert(html.includes('<bdi dir="ltr">90:75</bdi>')&&html.includes('<bdi dir="ltr">70:75</bdi>'),'score is consistently own team first');
 assert(!html.includes('<dt>נתון</dt>')&&!html.includes('<dt>משחקים</dt>'),'no generic restatement of the sentence');
 assert(html.includes('tabindex="0"')&&html.includes('<caption>'),'scroll area and table are accessible');
 assert(!group.games.some(g=>g.gameId==='17'||g.gameId==='19'));
});
regression('close-game record lists exactly its qualifying games',()=>{
 const ctx=context([3,5,1,2,-4,15].map((margin,i)=>game(i+1,margin)));const story=prepare(ctx).find(s=>s.type==='CLOSE_GAME_RECORD'&&s.teamIds[0]===1);
 assert.strictEqual(story.facts.wins,4);assert.strictEqual(story.facts.total,5);
 assert(Array.isArray(story.detailGroups));assert.strictEqual(story.detailGroups[0].games.length,5);
 assert(story.detailGroups[0].games.every(g=>Math.abs(g.points-g.opponentPoints)<=5));
 const html=V.card(story);assert.strictEqual((html.match(/<tr data-detail-game=/g)||[]).length,5);
 for(const score of ['78:75','80:75','76:75','77:75','71:75'])assert(html.includes(score));
 assert(!html.includes('90:75'));
});
regression('metric-specific games only',()=>{
 const assists=prepare(venueContext).find(s=>s.type==='WINDOW_STYLE'&&s.teamIds[0]===1&&s.facts.metric==='assists');
 assert(Array.isArray(assists.detailGroups));assert.deepStrictEqual(Array.from(assists.detailGroups[0].games,g=>g.gameId),['1','2']);
});
regression('distinct seasons and safe rendering',()=>{
 const ctx=context([game(1,4)]);ctx.match.roundVerified=true;ctx.match.competitionPhase='regular';ctx.match.roundNumber=1;
 ctx.priorSeasons.push({seasonKey:'2024-25',state:'ready',resultGames:[game(1,-2,{seasonKey:'2024-25'})],regularGames:[game(1,-2,{seasonKey:'2024-25'})]});
 const round=prepare(ctx).find(s=>s.type==='ROUND_TEAM_SUMMARY'&&s.teamIds[0]===1);
 assert(Array.isArray(round.detailGroups));assert.strictEqual(round.detailGroups[0].games.length,2,'same numeric game ID in different years remains two games');
 const hostile=JSON.parse(JSON.stringify(round));hostile.detailGroups[0].games[0].opponentName='<img src=x onerror=1>';
 const html=V.card(hostile);assert(html.includes('&lt;img')&&!html.includes('<img'));assert(html.includes('2024/25')&&html.includes('2025/26'));
});
regression('saved and changed results retain a faithful snapshot',()=>{
 assert(Array.isArray(venue.detailGroups));
 const store=new Map(),storage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)};
 const workspace=new c.window.IBBABroadcastWorkspace({storage});workspace.load(venueContext.match);
 workspace.apply({type:'add',matchRef:venueContext.match,story:venue});workspace.apply({type:'note',matchRef:venueContext.match,storyKey:venue.storyKey,note:'mention the away record'});
 const changedGames=JSON.parse(JSON.stringify(venueContext.priorSeasons[0].resultGames));changedGames[0].teams[1].score++;changedGames[1].teams[1].score--;
 const changed=prepare(context(changedGames)).find(s=>s.storyKey===venue.storyKey);
 assert.strictEqual(changed.facts.value,venue.facts.value);assert.notStrictEqual(changed.factFingerprint,venue.factFingerprint,'corrected results matter even if the mean is unchanged');
 workspace.reconcile({gameInfo:venueContext.match,allInsights:[changed],context:venueContext});
 const item=workspace.snapshot().state.items[0];assert.strictEqual(item.status,'changed');assert.strictEqual(item.note,'mention the away record');
 assert.strictEqual(item.storySnapshot.detailGroups[0].games[0].points,90);assert.strictEqual(item.pendingStory.detailGroups[0].games[0].points,91);
 const restored=new c.window.IBBABroadcastWorkspace({storage}).load(venueContext.match);
 assert.strictEqual(restored.state.items[0].storySnapshot.detailGroups[0].games.length,16,'offline personal page retains the supporting results');
});
regression('existing personal points gain evidence without replacing wording',()=>{
 const old={...venue,text:'the broadcaster chose this wording',detailGroups:undefined};old.factFingerprint=E.fingerprint(old);
 const workspace=new c.window.IBBABroadcastWorkspace({storage:{getItem:()=>null,setItem(){}}});workspace.load(venueContext.match);
 workspace.apply({type:'add',matchRef:venueContext.match,story:old});workspace.apply({type:'note',matchRef:venueContext.match,storyKey:old.storyKey,note:'keep this note'});
 workspace.reconcile({gameInfo:venueContext.match,allInsights:[venue],context:venueContext});
 const item=workspace.snapshot().state.items[0];assert.strictEqual(item.status,'active','adding supporting results alone is not a numerical change');
 assert.strictEqual(item.storySnapshot.text,old.text);assert.strictEqual(item.note,'keep this note');assert.strictEqual(item.storySnapshot.detailGroups[0].games.length,16);
});
regression('pooled meetings provide their actual historical scores',()=>{
 const ctx=context([game(1,3),game(1,3)]);ctx.priorSeasons.push({seasonKey:'2024-25',state:'ready',resultGames:[game(1,5,{seasonKey:'2024-25'})],regularGames:[]});
 const story=prepare(ctx).find(s=>s.type==='POOLED_H2H_RECORD');assert(Array.isArray(story.detailGroups));
 assert.strictEqual(story.detailGroups[0].games.length,2);assert.strictEqual((V.card(story).match(/<tr data-detail-game=/g)||[]).length,2);
});
regression('pooled record states total meetings and retains each season',()=>{
 const ctx=context([game(1,5),game(2,-7)]);
 ctx.priorSeasons.push({seasonKey:'2024-25',state:'ready',resultGames:[game(1,10,{seasonKey:'2024-25'}),game(2,3,{seasonKey:'2024-25'})],regularGames:[]});
 const story=prepare(ctx).find(s=>s.type==='POOLED_H2H_RECORD');
 assert.strictEqual(story.facts.total,4);assert.strictEqual(story.facts.winsByTeam[0].wins,3);
 assert(story.text.startsWith('מתוך 4 מפגשים')&&story.text.includes('בעונות האחרונות')&&story.text.includes('ניצחה ב־3'),'three wins come from four total meetings, not four per season');
 const html=V.card(story);assert(html.includes('<th scope="col">עונה</th>'));assert.strictEqual((html.match(/<tr data-detail-game=/g)||[]).length,4);
 assert.strictEqual(story.detailGroups[0].games.filter(g=>g.seasonKey==='2024-25').length,2);
 assert.strictEqual(story.detailGroups[0].games.filter(g=>g.seasonKey==='2025-26').length,2);
});
regression('pooled single-season meetings also identify the season in their table',()=>{
 const story=prepare(context([game(1,5)])).find(s=>s.type==='POOLED_H2H_RECORD');
 assert(story.text.includes('במפגש היחיד')&&story.text.includes('בעונת 2025/26'),'one meeting is described as one meeting');
 const html=V.card(story);assert(html.includes('<th scope="col">עונה</th>'),'every pooled meeting has an explicit season column');
 assert(html.includes('<td><bdi dir="ltr">2025/26</bdi></td>'));
});
if(failures.length){console.error(failures.join('\n'));process.exit(1);}
console.log('broadcast game details tests passed');
