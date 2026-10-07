const assert=require('assert'),fs=require('fs'),vm=require('vm');const c={window:{},console,URLSearchParams,URL};
for(const name of ['ibba_seasons','ibba_broadcast_copy'])if(fs.existsSync(`js/ibba/${name}.js`))vm.runInNewContext(fs.readFileSync(`js/ibba/${name}.js`,'utf8'),c);
const C=c.window.IBBABroadcastCopy;assert(C,'broadcast copy service exists');
const story={type:'PLAYER_WINDOW_CHANGE',teamName:'A',playerName:'Player',historicalTeam:'Old club',seasonKeys:['2025-26'],windows:[{mode:'recent',count:5}],facts:{metric:'points',value:90,referenceValue:80,difference:10}};
for(let variant=0;variant<3;variant++){const text=C.format(story,{variant});for(const part of ['90','80','10','2025/26','Old club'])assert(text.includes(part));assert(!text.includes('לפי האיגוד'));}
assert.strictEqual(C.formatNumber(null),'—');assert.strictEqual(C.formatNumber(90),'90');assert.strictEqual(C.formatNumber(33.333,{percent:true}),'33.3%');
assert(!C.format({...story,type:'WINDOW_VS_LEAGUE'}).includes('עלייה'),'league comparison is a gap, not temporal improvement');
const profile={type:'WINDOW_STYLE',teamName:'עירוני אשקלון',seasonKeys:['2023-24'],facts:{metric:'threePointsAttempted',value:21.9},sampleSize:27};
assert(C.format(profile).includes('זרקה 21.9 פעמים לשלוש בממוצע למשחק (27 משחקים)'), 'seasonal shooting copy states average and its denominator');
assert(!C.format(profile).includes('במשחקים שנבדקו'));
assert(C.format({...profile,facts:{metric:'ftPercentage',value:66.5}}).includes('קלעה 66.5% מהעונשין'));
assert(!C.format({...profile,type:'CLOSE_GAME_RECORD',facts:{wins:3,total:9,losses:6}}).includes('הפסדים'));
assert(C.format({...story,facts:{metric:'contributionPercentage',value:15.4}}).includes('15.4% מנקודות הקבוצה'),'percentage text does not repeat the word percent');
const round={type:'ROUND_TEAM_SUMMARY',teamName:'א.ס. אשקלון/קרית גת',seasonKeys:['2025-26'],scope:'historical',sampleSize:1,facts:{metric:'margin',value:-7,round:1,roundMetrics:{points:87,opponentPoints:94,margin:-7}}};
for(const variant of [0,1]) {
 const text=C.format(round,{variant});
 assert(!text.includes('ממוצע')&&text.includes('87')&&text.includes('94')&&text.includes('7 נקודות'),'single game is an actual score/margin, not an average');
 assert(text.includes('הפסידה'),'negative single-game margin describes a loss');
}
assert(C.format({...round,facts:{...round.facts,value:7,roundMetrics:{points:94,opponentPoints:87,margin:7}}}).includes('ניצחה'),'positive single-game margin describes a win');
assert(C.format({...round,sampleSize:3}).includes('ממוצע'),'multiple games retain average wording');
const pooled={...round,seasonKeys:['2024-25','2025-26'],sampleSize:2,facts:{metric:'margin',value:1,round:1,roundMetrics:{points:81.5,opponentPoints:80.5,margin:1},roundResults:[{seasonKey:'2024-25',gameId:'1',margin:30},{seasonKey:'2025-26',gameId:'1',margin:-28}]}};
for(const variant of [0,1]) {
 const text=C.format(pooled,{variant});
 assert(text.includes('ניצחון ב־30 נקודות')&&text.includes('הפסד ב־28 נקודות'),'a +1 average cannot hide a blowout win and a blowout loss');
 assert(text.includes('1 נקודה לזכותה')&&text.includes('81.5')&&text.includes('80.5')&&text.includes('2 משחקים'),'retain aggregate scoring and clearly label the average margin');
}
const losing={...pooled,facts:{...pooled.facts,value:-1,roundMetrics:{points:80.5,opponentPoints:81.5,margin:-1},roundResults:[{margin:1},{margin:-3}]}};
assert(C.format(losing).includes('1 נקודה לחובתה')&&C.format(losing).includes('ניצחון ב־1 נקודה'),'singular margin and direction remain accurate');
const wins={...pooled,facts:{...pooled.facts,value:5,roundMetrics:{points:85.5,opponentPoints:80.5,margin:5},roundResults:[{margin:2},{margin:8}]}};
assert(!C.format(wins).includes('הפסד'),'two wins must not be described as a split record');
assert(C.format({...profile,type:'CLOSE_GAME_RECORD',facts:{wins:3,total:9}}).includes('עד 5 נקודות'),'close-game threshold uses digits');
assert(C.format(story).includes('ב־5 המשחקים האחרונים'),'recent-window quantities use digits consistently');
const reversal=C.format({...profile,type:'LEAD_REVERSAL',facts:{count:7,total:36}});
assert(reversal.includes('פיגרה בסיום לפחות רבע אחד')&&reversal.includes('ניצחה בסיום המשחק')&&reversal.includes('7 מתוך 36'),'comeback wording makes numerator and result explicit');
assert(!reversal.includes('נתוני ארבעת הרבעים'),'source eligibility is not technical broadcast prose');
console.log('broadcast copy tests passed');
