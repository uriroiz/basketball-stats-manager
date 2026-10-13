const assert=require('node:assert/strict'),fs=require('node:fs');
const path='data/ibba-player-identities.json';
assert(fs.existsSync(path),'verified official identities must be shipped for names missing from the live public API');
const data=JSON.parse(fs.readFileSync(path,'utf8'));
assert.equal(data.schemaVersion,1);assert(Number.isFinite(Date.parse(data.generatedAt)));
const ids=new Set();
for(const player of data.players) {
  assert(Number.isSafeInteger(player.id)&&player.id>0);assert(!ids.has(player.id),'one verified record per official ID');ids.add(player.id);
  assert(player.name.trim());assert(player.verifiedAt>0&&player.verifiedAt<=Date.now());
  const link=new URL(player.link);assert.equal(link.hostname,'ibasketball.co.il');assert.equal(link.protocol,'https:');assert.equal(link.searchParams.get('p'),String(player.id));
  assert(/^https:\/\/ibasketball\.co\.il\/league\/(202[34]-2-%d7%9c%d7%90%d7%95%d7%9e%d7%99%d7%aa|2025-2)\/$/.test(player.sourceUrl));
  assert.deepEqual(Object.keys(player).sort(),['id','link','name','sourceUrl','verifiedAt'],'snapshot contains identities only, without seasonal membership or statistics');
}
for(const id of [906516,609338,1012625,1004839,1033288,930957,1033758,1038270,255521,585304,240275,1007379,283240,273871,1037891,175232,173864,836809,267720,832079,
  1020004,1250011,1254394,1254395,1256059,1276914,1307718,1314951,1321165,1329515,175411,175851,179186,179360,181181,283351,291122,835010,838528,934397])assert(ids.has(id),`missing official player ${id} is available from the verified cache`);
assert.equal(data.players.find(p=>p.id===906516).name,'וינס קול');
assert.equal(data.players.find(p=>p.id===609338).name,"ג'ונתן פיירל");
console.log('verified identity cache data tests passed');
