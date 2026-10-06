const assert=require('assert'),fs=require('fs'),vm=require('vm');const c={window:{},console,Date,URL,URLSearchParams};
for(const n of ['ibba_seasons','ibba_window_stats','ibba_rich_insights','ibba_broadcast_copy','ibba_historical_insights','ibba_broadcast_report'])vm.runInNewContext(fs.readFileSync(`js/ibba/${n}.js`,'utf8'),c);
const B=c.window.IBBABroadcastReport;
const game=(id,key,points)=>({gameId:id,seasonKey:key,date:'2026-01-01',roundNumber:id,roundVerified:true,competitionPhase:'regular',hasResult:true,teams:[{teamId:1,name:'A',score:points},{teamId:2,name:'B',score:70}]});
const prior=key=>({seasonKey:key,state:'ready',resultGames:[game(1,key,80)],regularGames:[game(1,key,80)],sameRoundGames:[game(1,key,80)],beforeRoundGames:[],statGames:[],coverage:{roundWindowComplete:true}});
const match={seasonKey:'2026-27',roundNumber:1,roundVerified:true,competitionPhase:'regular',teams:[{teamId:1,name:'A'},{teamId:2,name:'B'}]};
const context={match,asOf:'2026-10-06',currentGames:[],currentResultGames:[],currentScheduleGames:[],currentRegularGames:[],currentComplete:true,priorSeasons:[prior('2024-25'),prior('2025-26')],identity:r=>r,playerSummaries:{state:'ready',records:[{playerRef:'post:7',name:'Selected',seasonKey:'2025-26',seasonLabel:'2025/26',team:'A',games:5,points:10},{playerRef:'post:8',name:'UNSELECTED',seasonKey:'2025-26',team:'A'}]},teamSummaries:[]};
const report=B.compose({seasonKey:match.seasonKey,gameInfo:match,context,currentSeason:null,sourceStatuses:[]},['post:7']);
assert(report.allInsights.some(s=>s.type==='ROUND_SCORING'));assert.strictEqual(report.currentSeason,null);
const rows=B.exportRows(report);assert(rows.some(row=>row.includes(report.topStories[0].text)));assert(!JSON.stringify(rows).includes('UNSELECTED'));
const rich=report.allInsights.find(s=>s.type==='ROUND_SCORING');assert(rows.some(row=>row.includes(JSON.stringify(rich.facts))),'export carries structured facts');
for(const round of [2,10,25]){const ctx={...context,match:{...match,roundNumber:round},currentResultGames:[game(1,'2026-27',90)],currentRegularGames:[game(1,'2026-27',90)]};const r=B.compose({...report,context:ctx},['post:7']);assert(r.allInsights.some(s=>s.type==='SAME_STAGE_COMPARISON'));if(round===25)assert(r.allInsights.some(s=>s.dataState==='partial'));}
const changed=B.compose({...report,copyVariant:1},['post:7']);const changedRich=changed.allInsights.find(s=>s.id===rich.id);assert.notStrictEqual(changedRich.text,rich.text);assert.deepStrictEqual(changedRich.facts,rich.facts);
console.log('rich broadcast integration tests passed');
