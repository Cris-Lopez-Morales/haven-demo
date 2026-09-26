import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { interpretWithAI,validatePayload } from './ai.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=Number(process.env.PORT||3000);
const key=process.env.OPENAI_API_KEY||'';
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
let requests=0,windowStart=Date.now();
const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
const server=http.createServer(async(req,res)=>{
  try{
    const host=req.headers.host||'';
    // Local development server only: reject DNS rebinding and cross-origin calls.
    if(!new RegExp(`^(?:localhost|127\\.0\\.0\\.1):${port}$`).test(host))return json(res,403,{error:'Use the local server URL.'});
    const url=new URL(req.url,`http://${host}`);
    if(url.pathname==='/api/assistant/status'&&req.method==='GET')return json(res,200,{available:!!key});
    if(url.pathname==='/api/assistant'){
      if(req.method!=='POST')return json(res,405,{error:'POST required'});
      if(req.headers.origin&&req.headers.origin!==`http://${host}`)return json(res,403,{error:'Same-origin requests only'});
      if(!key)return json(res,503,{error:'AI is not configured. Local demo is available.'});
      if(!req.headers['content-type']?.startsWith('application/json'))return json(res,415,{error:'JSON required'});
      if(Date.now()-windowStart>60000){windowStart=Date.now();requests=0;}
      if(++requests>20)return json(res,429,{error:'Please wait before sending more AI messages.'});
      let size=0;const chunks=[];
      for await(const chunk of req){size+=chunk.length;if(size>24000){json(res,413,{error:'Request too large'});return;}chunks.push(chunk);}
      let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));validatePayload(body);}catch{return json(res,400,{error:'Invalid assistant request'});}
      try{return json(res,200,await interpretWithAI(body,{apiKey:key,model:process.env.OPENAI_MODEL||'gpt-4.1-mini'}));}
      catch{return json(res,502,{error:'AI unavailable; please use the local demo.'});}
    }
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end('Method not allowed');return;}
    const pathname=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
    // Deliberately do not serve arbitrary repo files, .env, or configuration.
    if(!/^\/(?:index\.html|dist\/index\.html|src\/styles\.css|build\/[a-z-]+\.js)$/.test(pathname)){res.writeHead(404);res.end('Not found');return;}
    const filename=path.resolve(root,'.'+pathname);
    if(!filename.startsWith(root+path.sep)){res.writeHead(404);res.end('Not found');return;}
    const body=await readFile(filename);
    res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache','Referrer-Policy':'same-origin'});
    res.end(req.method==='HEAD'?undefined:body);
  }catch{if(!res.headersSent){res.writeHead(404);res.end('Not found');}else res.end();}
});
server.listen(port,'127.0.0.1',()=>console.log(`Haven is ready at http://localhost:${port}\nAssistant: ${key?'optional connected AI available (opt in inside chat)':'local demo; no API key required'}\nPress Ctrl+C to stop.`));
server.on('error',error=>{console.error(error.message);process.exitCode=1;});
