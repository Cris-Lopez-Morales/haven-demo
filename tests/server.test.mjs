import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import net from 'node:net';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
async function start(key='') {
  const probe=net.createServer();probe.listen(0,'127.0.0.1');await once(probe,'listening');const port=probe.address().port;await new Promise(resolve=>probe.close(resolve));
  const child=spawn(process.execPath,['scripts/serve.mjs'],{cwd:root,env:{...process.env,PORT:String(port),OPENAI_API_KEY:key},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>{child.kill();reject(new Error('Server startup timed out'));},4000);child.stdout.on('data',data=>{if(data.toString().includes('Haven is ready')){clearTimeout(timeout);resolve();}});child.on('exit',()=>{clearTimeout(timeout);reject(new Error('Server failed to start'));});});
  return {url:`http://127.0.0.1:${port}`,close:()=>{child.kill();return once(child,'exit');}};
}
test('Local server serves both app variants, discloses offline mode, and protects private files',async()=>{
  const server=await start();try{
    for(const pathname of ['/','/dist/index.html','/build/app.js','/src/styles.css']){const response=await fetch(server.url+pathname);assert.equal(response.status,200);}
    const status=await fetch(server.url+'/api/assistant/status');assert.deepEqual(await status.json(),{available:false});
    const unavailable=await fetch(server.url+'/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(unavailable.status,503);
    for(const pathname of ['/.env','/.env.example','/package.json','/scripts/ai.mjs','/docs/README.md'])assert.equal((await fetch(server.url+pathname)).status,404);
  }finally{await server.close();}
});
test('Configured server requires same origin, bounded JSON and valid inputs without contacting the provider',async()=>{
  const server=await start('TEST-KEY-NOT-A-REAL-CREDENTIAL');try{
    assert.deepEqual(await(await fetch(server.url+'/api/assistant/status')).json(),{available:true});
    assert.equal((await fetch(server.url+'/api/assistant')).status,405);
    assert.equal((await fetch(server.url+'/api/assistant',{method:'POST',headers:{Origin:'https://not-haven.invalid','Content-Type':'application/json'},body:'{}'})).status,403);
    assert.equal((await fetch(server.url+'/api/assistant',{method:'POST',headers:{'Content-Type':'text/plain'},body:'{}'})).status,415);
    assert.equal((await fetch(server.url+'/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status,400);
    assert.equal((await fetch(server.url+'/api/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({message:'x'.repeat(25000)})})).status,413);
  }finally{await server.close();}
});
