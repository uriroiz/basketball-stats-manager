const assert=require('assert'),fs=require('fs'),vm=require('vm');
const c={window:{},URL,URLSearchParams,Date};
for(const n of ['ibba_seasons','ibba_broadcast_copy','ibba_broadcast_view'])if(fs.existsSync(`js/ibba/${n}.js`))vm.runInNewContext(fs.readFileSync(`js/ibba/${n}.js`,'utf8'),c);
const V=c.window.IBBABroadcastView;assert(V,'broadcast presentation service exists');
const s=(key,metric,value,extras={})=>({type:'WINDOW_STYLE',family:'PROFILE',teamIds:[1],teamName:'עירוני אשקלון',seasonKeys:[key],scope:'historical',sampleSize:27,facts:{metric,value},text:`בעונת ${key.replace('-','/')}, עירוני אשקלון: ${value}.`,...extras});
const stories=[s('2023-24','ftPercentage',66.5),s('2024-25','ftPercentage',70),s('2025-26','ftPercentage',75),s('2023-24','threePointsAttempted',21.9),s('2025-26','margin',-5)];
const groups=V.groups(stories);
assert.strictEqual(groups.length,1,'one comparison block replaces repeated team/year cards');
assert.strictEqual(groups[0].rows.length,3,'each metric appears once');
assert.strictEqual(V.groups([{...stories[0],teamIds:[],teamName:'A'},{...stories[0],teamIds:[],teamName:'B'}]).length,2,'legacy named teams cannot merge because IDs are absent');
const table=V.renderGroups(stories);
assert.strictEqual((table.match(/<table\b/g)||[]).length,1);
for(const label of ['2023/24','2024/25','2025/26'])assert.strictEqual(table.split(label).length-1,1,'season is one table column, not repeated metadata');
assert(table.includes('<bdi dir="ltr">-5</bdi>'),'signed metric is isolated from RTL');
assert(!table.includes('מדגם קטן')&&!table.includes('מידע חלקי')&&!table.includes('מקורות וראיות'));
assert(table.includes('—'),'missing season metric stays missing');
assert(V.renderCard({...stories[0],text:'<img src=x onerror=alert(1)> -5',smallSample:true,dataState:'partial'}).includes('&lt;img'),'story text is escaped');
assert(V.text("ג'וש -5").includes('ג&#39;וש <bdi dir="ltr">-5</bdi>'),'bidi formatting does not split HTML entities in player names');
assert(!V.renderCard({...stories[0],text:'בעונת 2023/24 נתון'}).includes('2023/24 ·'),'card has no redundant season footer');
assert(!V.renderCard({...stories[0],text:'רשמה 8 ניצחונות ב־27 משחקים.'}).includes('broadcast-count'),'count already in the sentence is not repeated underneath');
const game=(id,key,date)=>({gameId:id,seasonKey:key,date,hasResult:true,teams:[{teamId:1,name:'A',score:82},{teamId:2,name:'B',score:85}]});
const context={match:{teams:[{teamId:1},{teamId:2}]},priorSeasons:[{resultGames:[game(1,'2025-26','2026-04-10'),game(1,'2025-26','2026-04-10'),{...game(3,'2025-26','2026-04-01'),teams:[{teamId:1},{teamId:99}]}]},{resultGames:[game(2,'2023-24','2024-01-01')]}]};
const meetings=V.meetings(context);
assert.deepStrictEqual(Array.from(meetings,g=>g.gameId),[1,2],'all seasons, distinct games, official team match, newest first');
assert.strictEqual(V.meetingTable(context).split('<tr>').length-1,3,'one meeting row per game, not twelve metric cards');
const notices=V.sourceNotices([{seasonKey:'2023-24',state:'error',error:'upstream'},{seasonKey:'2023-24',state:'partial'},{seasonKey:'2025-26',state:'ready'},{seasonKey:'2024-25',state:'loading'}]);
assert.strictEqual(notices.length,1,'one source failure notice per season; loading is displayed separately');
assert(notices[0].includes('2023/24')&&!notices[0].includes('upstream'),'actionable message, no raw diagnostic errors');
const matchup=V.renderGroups(['points','margin'].map(metric=>s('2025-26',metric,84,{type:'H2H_WINDOW_PROFILE',facts:{metric,value:84,wins:1,total:2}})));
assert.strictEqual(matchup.split('ניצחונות מתוך המפגשים').length-1,1,'record appears once alongside matchup averages');
assert(matchup.includes('1</bdi> מתוך <bdi dir="ltr">2'),'record facts survive numeric presentation');
assert(!V.renderGroups([s('2025-26','margin',-7,{sampleSize:1})]).includes('הפרש ממוצע'),'single-game comparison labels margin without average');
// Distinct stories must identify their topic before opening; generic scope headings
// hide the difference between a close-game record, halftime record and comeback.
vm.runInNewContext(fs.readFileSync('js/ibba/ibba_analysis_scope.js','utf8'),c);
const seasonScope={basis:'gameCalculation',phase:'all',mode:'season',windows:[{phase:'all',mode:'season'}]};
const deciding=[
  {...s('2025-26',null,null),type:'CLOSE_GAME_RECORD',facts:{wins:4,total:5},analysisScope:seasonScope,text:'ניצחה ב־4 מתוך 5 משחקים צמודים.'},
  {...s('2025-26',null,null),type:'HALFTIME_RECORD',facts:{position:'leading',wins:21,total:23},analysisScope:seasonScope,text:'ניצחה ב־21 מתוך 23 משחקים שבהם הובילה במחצית.'},
  {...s('2025-26',null,null),type:'LEAD_REVERSAL',facts:{count:7,total:36},analysisScope:seasonScope,text:'ניצחה אחרי פיגור בסיום רבע.'},
  {...s('2025-26','quarterMargin',3.1),type:'QUARTER_WINDOW',facts:{metric:'quarterMargin',value:3.1,quarter:4},analysisScope:seasonScope,text:'הפרש ברבע הרביעי.'}
];
const summaries=V.renderGroups(deciding).match(/<summary>.*?<\/summary>/g)||[];
assert.strictEqual(new Set(summaries).size,4,'each closed accordion identifies a distinct basketball topic');
for(const term of ['משחקים צמודים','מחצית','פיגור','רבעים'])assert(summaries.some(title=>title.includes(term)),`${term} is visible before opening its table`);
const legacyQuarterStories=['SLOW_STARTERS','COMEBACK_KINGS','BEST_QUARTER'].map((type,index)=>({...deciding[0],type,id:`legacy-quarter-${index}`,scope:'current',family:'DECIDING',text:`נקודה קיימת ${index}`,analysisScope:seasonScope}));
const legacyHeadings=V.renderGroups(legacyQuarterStories).match(/<summary>.*?<\/summary>/g)||[];
assert.strictEqual(new Set(legacyHeadings).size,3,'current-season legacy quarter stories have distinct visible topics when statistics arrive');
for(const term of ['פתיחה','פיגור','הרבע החזק'])assert(legacyHeadings.some(title=>title.includes(term)),`${term} identifies the existing current-season quarter analysis`);
const tableKeys=html=>[...html.matchAll(/data-broadcast-table="([^"]+)"/g)].map(match=>match[1]);
assert.strictEqual(new Set(tableKeys(V.renderGroups(deciding))).size,4,'opening one topic cannot reopen all others through a shared key');
assert.deepStrictEqual(tableKeys(V.renderGroups(deciding)),tableKeys(V.renderGroups(deciding.map(story=>({...story,teamName:'שם מתוקן'})))),'official team group identity remains stable when display names change');
const meetingStyle={...stories[0],type:'H2H_WINDOW_PROFILE',referenceName:'שם יריבה קודם',analysisScope:{...seasonScope,mode:'meetings',windows:[{phase:'all',mode:'meetings',opponentId:2}]}};
assert.deepStrictEqual(tableKeys(V.renderGroups([meetingStyle])),tableKeys(V.renderGroups([{...meetingStyle,referenceName:'שם יריבה מתוקן'}])),'official opponent identity keeps open state stable when its display name changes');
const unknownScope=deciding.slice(0,2).map((story,index)=>({...story,id:`unverified-${index}`,analysisScope:{...seasonScope,phase:'unknown'}}));
assert.deepStrictEqual(tableKeys(V.renderGroups(unknownScope)).sort(),tableKeys(V.renderGroups([...unknownScope].reverse())).sort(),'unverified scopes stay separate without tying their open state to array order');

// Match sections use official IDs, including numeric/string equivalence, never names.
const teamContext={match:{teams:[{teamId:1,name:'מכבי רחובות'},{teamId:'2',name:'מכבי קריית מוצקין'}]}};
const teamOnly={...deciding[0],teamName:'מכבי רחובות',text:'רחובות — נקודת משחקים צמודים',storyKey:'home-story'};
const awayOnly={...deciding[1],teamIds:[2],teamName:'מכבי קריית מוצקין',text:'מוצקין — נקודת מחצית',storyKey:'away-story'};
const shared={...teamOnly,teamIds:[1,2],type:'POOLED_H2H_RECORD',text:'מפגשים משותפים — 3 ניצחונות מתוך 4',storyKey:'pair-story'};
const player={...teamOnly,playerRef:'post:55',playerName:'שחקן ותיק',text:'נקודת שחקן עצמאית',storyKey:'player-story'};
const unmatched={...teamOnly,teamIds:[],teamName:'מכבי רחובות',text:'נקודה ללא מזהה רשמי',storyKey:'unmatched-story'};
const teamMarkup=V.renderTeamGroups([awayOnly,shared,teamOnly,player,unmatched],teamContext);
const headings=[...teamMarkup.matchAll(/<h[2-6][^>]*>(.*?)<\/h[2-6]>/g)].map(match=>match[1]);
assert(headings[0].includes('מכבי רחובות')&&headings[0].includes('בית'),'first match team is clearly headed as home');
assert(headings[1].includes('מכבי קריית מוצקין')&&headings[1].includes('חוץ'),'second match team is clearly headed as away');
for(const text of ['רחובות — נקודת משחקים צמודים','מוצקין — נקודת מחצית','מפגשים משותפים —','נקודת שחקן עצמאית','נקודה ללא מזהה רשמי'])assert.strictEqual(teamMarkup.split(text).length-1,1,`${text} appears once, in its own relevant section`);
const emptyAway=V.renderTeamGroups([teamOnly],teamContext);
assert(emptyAway.includes('מכבי קריית מוצקין')&&emptyAway.includes('אין נתונים זמינים לנושא זה בעונות שנבחרו.'),'missing rival data has an explicit team-level state, not an omitted team');
vm.runInNewContext(fs.readFileSync('js/ibba/ibba_broadcast_workspace_view.js','utf8'),c);
const roundSummary={...teamOnly,type:'ROUND_TEAM_SUMMARY',family:'ROUND',text:'במחזור 1, רחובות ניצחה ב־2 נקודות והפסידה ב־4 נקודות.',storyKey:'saved-round-summary',facts:{metric:'margin',value:-1,round:1,roundMetrics:{points:82,opponentPoints:83,margin:-1}}};
const roundMetric={...roundSummary,type:'ROUND_SCORING',storyKey:'raw-round-margin',text:'ממוצע הפרש הנקודות במחזור',facts:{metric:'margin',value:-1,round:1}};
const beforeSummary=JSON.stringify(roundSummary);
const roundMarkup=V.renderTeamGroups([roundSummary,roundMetric],teamContext);
assert(roundMarkup.includes('רחובות ניצחה ב־')&&roundMarkup.includes('והפסידה ב־'),'combined round outcome remains in its team section even when the metric table also exists');
assert(roundMarkup.includes('data-story-key="saved-round-summary"'),'combined outcome can be saved independently of the raw margin metric');
assert.strictEqual(JSON.stringify(roundSummary),beforeSummary,'rendering a compact summary does not rewrite the report or workspace snapshot');
const summaryOnlyMarkup=V.renderTeamGroups([roundSummary],{match:{teams:[teamContext.match.teams[0]]}});
assert(!summaryOnlyMarkup.includes('אין נתונים זמינים'),'a team with only a combined outcome is not labeled as empty');
const nullTeams=V.renderTeamGroups([{...teamOnly,teamIds:[null],teamName:'<img src=x>',text:'לא משויך'}],{match:{teams:[{teamId:null,name:'לא מזוהה'},{teamId:2,name:'קבוצה אחרת'}]}});
assert.strictEqual(nullTeams.split('אין נתונים זמינים לנושא זה בעונות שנבחרו.').length-1,2,'missing official IDs never associate an unknown story with an unknown match team');
assert(nullTeams.includes('&lt;img src=x&gt;')&&!nullTeams.includes('<img'),'unassigned stories stay available with escaped markup');

// One topic still keeps incompatible analysis scopes and venues apart.
const scopes=[
  {...stories[0],analysisScope:seasonScope},
  {...stories[0],analysisScope:{...seasonScope,basis:'officialSummary'}},
  {...stories[0],analysisScope:{...seasonScope,phase:'regular'}},
  {...stories[0],facts:{...stories[0].facts,venue:'away'},analysisScope:seasonScope},
  {...stories[0],analysisScope:{...seasonScope,mode:'recent',windows:[{phase:'all',mode:'recent',count:5}]}}
];
assert.strictEqual(V.groups(scopes).length,5,'official/game-derived, phase, venue and sample window are never combined');
console.log('broadcast view tests passed');
