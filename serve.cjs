const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const {seed} = require('./dist/engine');

const types = {'.html':'text/html', '.css':'text/css', '.js':'text/javascript'};
const database = path.join(__dirname,'roster-data.json');
const send = (res,status,body)=>{
  res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});
  res.end(JSON.stringify(body));
};
function readDatabase(){
  if(!fs.existsSync(database))return {revision:0,state:seed()};
  return JSON.parse(fs.readFileSync(database,'utf8'));
}
async function masterData(req,res){
  if(req.method==='GET'){send(res,200,readDatabase());return;}
  if(req.method!=='PUT'){send(res,405,{error:'Method not allowed'});return;}
  if(req.headers['content-type']!=='application/json'){send(res,415,{error:'JSON required'});return;}
  let size=0;
  const parts=[];
  for await (const piece of req){
    size+=piece.length;
    if(size>8*1024*1024){send(res,413,{error:'Roster is too large'});return;}
    parts.push(piece);
  }
  let input;
  try {input=JSON.parse(Buffer.concat(parts).toString('utf8'));} catch {send(res,400,{error:'Invalid JSON'});return;}
  if(!input?.state||!['pods','employees','brands','processes','rules','assignments'].every(key=>Array.isArray(input.state[key]))||
    !['holidays','exceptions','plans'].every(key=>input.state[key]&&typeof input.state[key]==='object'&&!Array.isArray(input.state[key]))){
    send(res,400,{error:'Invalid roster data'});return;
  }
  const current=readDatabase();
  if(input.revision!==current.revision){send(res,409,{error:'The roster changed in another tab'});return;}
  const revision=current.revision+1;
  fs.writeFileSync(database+'.tmp',JSON.stringify({revision,state:input.state}));
  fs.renameSync(database+'.tmp',database);
  send(res,200,{revision});
}
http.createServer((req,res)=>{
  const pathname = new URL(req.url,'http://localhost').pathname;
  if(pathname==='/api/state'){
    masterData(req,res).catch(()=>{
      if(!res.headersSent)send(res,500,{error:'The roster could not be saved or read'});
      else res.end();
    });
    return;
  }
  const file = pathname === '/' ? 'index.html' : pathname.slice(1);
  if (!['index.html','style.css','engine.js','app.js'].includes(file)) {
    res.writeHead(404).end('Not found');
    return;
  }
  res.setHeader('Content-Type', types[path.extname(file)] + '; charset=utf-8');
  fs.createReadStream(path.join(__dirname,'dist',file)).pipe(res);
}).listen(4173,'127.0.0.1',()=>console.log('Smart Roster: http://localhost:4173'));

