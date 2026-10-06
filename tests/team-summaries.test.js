const assert=require('assert'),fs=require('fs'),vm=require('vm');const c={window:{},URL,URLSearchParams,console};
for(const name of ['ibba_seasons','ibba_team_summaries'])if(fs.existsSync('js/ibba/'+name+'.js'))vm.runInNewContext(fs.readFileSync('js/ibba/'+name+'.js','utf8'),c);
assert(c.window.IBBATeamSummaries,'official team summary service must exist');
const T=c.window.IBBATeamSummaries;
// Reduced actual official HTML, converted to the DOM contract needed by parser.
function doc(key,cloned=false){const html=fs.readFileSync('tests/fixtures/historical-insights/'+key+'-team-summary.html','utf8');const cells=new Map(Array.from(html.matchAll(/<td class="([^"]+)"[^>]*>(.*?)<\/td>/gs),m=>[m[1],m[2]]));const row={querySelector:selector=>{const raw=cells.get(selector.slice(1));return raw==null?null:{textContent:raw.replace(/<[^>]+>/g,''),querySelector:()=>({getAttribute:()=>raw.match(/href="([^"]+)"/)[1]})};}};const table={classList:{contains:()=>cloned},closest:()=>null,querySelector:s=>s==='th.data-g'?{}:s==='th.data-ptspg'?{}:null,querySelectorAll:()=>[row]};return {querySelectorAll:()=>[{textContent:'סטטיסטיקה קבוצתית - רגילה',nextElementSibling:{querySelector:()=>table}}]};}
const service=new T({});const season=c.window.IBBASeasons.getSeason('2025-26');const rows=service.parseOfficialSummaries(doc('2025-26'),season);
assert.strictEqual(rows[0].metrics.points,85.2);assert.strictEqual(rows[0].games,30);assert.strictEqual(rows[0].name,'אליצור יבנה');assert(rows[0].teamRef.includes('/team/168-'));
assert.strictEqual(service.parseOfficialSummaries(doc('2025-26',true),season).length,0);
assert.throws(()=>service.parseOfficialSummaries({querySelectorAll:()=>[]},season),/סיכום/);
async function run(){let fail=true;const t=new T({fetchText:async()=>{if(fail)throw Error('offline');return '';}});t.parseOfficialSummaries=()=>rows;c.DOMParser=class{parseFromString(){return {};}};assert.strictEqual((await t.load('2025-26')).state,'error');fail=false;assert.strictEqual((await t.load('2025-26')).state,'ready');console.log('team summaries tests passed');}
run().catch(e=>{console.error(e);process.exit(1)});
