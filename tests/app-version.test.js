const assert=require('assert'),fs=require('fs'),vm=require('vm');
const moduleText=fs.readFileSync('js/app_version.js','utf8'),html=fs.readFileSync('index.html','utf8');
function reload(){const el={textContent:''},c={document:{querySelector:()=>el,addEventListener:(event,cb)=>cb()},window:{},console:{log(){}},Date,navigator:{userAgent:'test'}};vm.runInNewContext(moduleText,c);return {manager:c.window.versionManager,el};}
const first=reload(),second=reload();
assert.strictEqual(first.manager.getVersionString(),'v2.3.0','header displays release 2.3.0');
assert.strictEqual(first.el.textContent,'v2.3.0');assert.strictEqual(second.manager.getVersionString(),first.manager.getVersionString(),'reload keeps release version');
assert.strictEqual(JSON.parse(fs.readFileSync('package.json','utf8')).version,'2.3.0');
assert.strictEqual((html.match(/class="[^"]*\bversion-display\b/g)||[]).length,1);
assert.strictEqual((html.match(/src="js\/app_version.js"/g)||[]).length,1);
console.log('app version tests passed');
