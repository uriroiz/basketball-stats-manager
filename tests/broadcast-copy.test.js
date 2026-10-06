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
console.log('broadcast copy tests passed');
