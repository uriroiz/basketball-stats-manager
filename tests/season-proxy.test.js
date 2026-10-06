const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const source='https://ibasketball.co.il/league/2023-2-%d7%9c%d7%90%d7%95%d7%9e%d7%99%d7%aa/';
const body='<html>official historical summaries</html>';
const globals={URL,AbortController,AbortSignal,Buffer,setTimeout,clearTimeout,console,fetch:async()=>new Response(body,{headers:{'Content-Type':'text/html'}})};
const production={...globals};
vm.runInNewContext(fs.readFileSync('api/ibba.js','utf8').replace('export default async function handler','async function handler'),production);
let localHandler;
const local={...globals,process:{env:{}},...path,statSync:fs.statSync,createReadStream:fs.createReadStream,createServer:handler=>{localHandler=handler;return {listen(){}};}};
vm.runInNewContext(fs.readFileSync('tools/dev_server.mjs','utf8').replace(/^import .*;\r?\n/gm,'').replace('import.meta.dirname',JSON.stringify(path.resolve('tools'))),local);
async function request(kind,url){
 const result={status:0,body:null};
 if(kind==='production')await production.handler({method:'GET',headers:{host:'localhost:8000',origin:'http://localhost:8000'},query:{url},socket:{remoteAddress:'qa'}},{setHeader(){},status(code){result.status=code;return this;},json(value){result.body=value;return this;},send(value){result.body=String(value);return this;}});
 else await localHandler({method:'GET',headers:{host:'localhost:8000'},url:`/api/ibba?url=${encodeURIComponent(url)}`},{writeHead(code){result.status=code;},end(value){result.body=String(value);}});
 return result;
}
async function run(){
 for(const kind of ['production','local']){
  const allowed=await request(kind,source);
  assert.strictEqual(allowed.status,200,`${kind} proxy must load the requested 2023/24 summary page`);
  assert.strictEqual(allowed.body,body);
  for(const denied of [source.replace('ibasketball.co.il','example.com'),source.replace('2023-2-','2022-2-'),source.replace('/league/','/private/'),source.replace('https://','http://')])assert.strictEqual((await request(kind,denied)).status,403,`${kind} keeps other encoded paths and hosts blocked`);
 }
 console.log('season proxy tests passed');
}
run().catch(error=>{console.error(error);process.exit(1);});
