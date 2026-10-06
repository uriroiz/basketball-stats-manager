const assert=require('assert'),fs=require('fs'),vm=require('vm');const c={window:{},console,URLSearchParams,URL};
for(const name of ['ibba_seasons','ibba_broadcast_copy'])if(fs.existsSync(`js/ibba/${name}.js`))vm.runInNewContext(fs.readFileSync(`js/ibba/${name}.js`,'utf8'),c);
const C=c.window.IBBABroadcastCopy;assert(C,'broadcast copy service exists');
const story={type:'PLAYER_WINDOW_CHANGE',teamName:'A',playerName:'Player',historicalTeam:'Old club',seasonKeys:['2025-26'],windows:[{mode:'recent',count:5}],facts:{metric:'points',value:90,referenceValue:80,difference:10}};
for(let variant=0;variant<3;variant++){const text=C.format(story,{variant});for(const part of ['90','80','10','2025/26','Old club'])assert(text.includes(part));assert(!text.includes('לפי האיגוד'));}
assert.strictEqual(C.formatNumber(null),'—');assert.strictEqual(C.formatNumber(90),'90');assert.strictEqual(C.formatNumber(33.333,{percent:true}),'33.3%');
console.log('broadcast copy tests passed');
