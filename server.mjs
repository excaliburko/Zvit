import {validFuel} from './dist/fuel.mjs';
import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createAuthStore,verifyPassword} from './auth.mjs';
const root=fileURLToPath(new URL('./dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'};
const publicPaths=new Set(['/login','/login.html','/login.css','/login.js','/icon.svg','/icon-192.png','/icon-512.png','/manifest.webmanifest','/sw.js']);
export function createServer({auth}={}){
 const attempts=new Map();let verifications=0;
 return http.createServer(async(req,res)=>{
  const send=(status,body,type='text/plain; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'same-origin'});res.end(req.method==='HEAD'?undefined:body);};
  const json=(status,value)=>send(status,JSON.stringify(value),'application/json; charset=utf-8');
  const redirect=()=>{res.setHeader('Location','/login');send(303,'');};
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{return send(400,'Bad request');}
  if(pathname==='/health')return ['GET','HEAD'].includes(req.method)?send(200,'ok'):send(405,'Method not allowed');
  const cookie=String(req.headers.cookie||'').match(/(?:^|;\s*)zvit_session=([a-f0-9]{64})(?:;|$)/)?.[1]||'';
  const user=auth?.session(cookie);
  const secure=process.env.NODE_ENV==='production'||req.headers['x-forwarded-proto']==='https';
  const setCookie=token=>res.setHeader('Set-Cookie',`zvit_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${token?43200:0}${secure?'; Secure':''}`);
  try{
   if(pathname.startsWith('/api/')){
    if(!auth)return json(503,{error:'Вхід ще не налаштовано. Зверніться до адміністратора.'});
    if(pathname==='/api/session'&&req.method==='GET')return user?json(200,{user}):json(401,{error:'Увійдіть до застосунку.'});
    if(pathname==='/api/fuel'&&req.method==='GET')return user?json(200,{records:auth.db.prepare('SELECT payload FROM fuel_records WHERE user_id=? ORDER BY period_start').all(user.id).map(row=>JSON.parse(row.payload))}):json(401,{error:'Увійдіть до застосунку.'});
    if(pathname==='/api/users'&&req.method==='GET')return !user?json(401,{error:'Увійдіть до застосунку.'}):user.role==='admin'?json(200,{users:auth.list()}):json(403,{error:'Потрібен доступ адміністратора.'});
    if(!['POST','PATCH'].includes(req.method))return json(405,{error:'Метод не підтримується.'});
    const origin=req.headers.origin;
    if(req.headers['sec-fetch-site']==='cross-site'||(origin&&new URL(origin).host!==req.headers.host))return json(403,{error:'Запит з іншого сайту заборонено.'});
    if(!String(req.headers['content-type']).startsWith('application/json'))return json(415,{error:'Потрібен JSON.'});
    let size=0,parts=[];for await(const part of req){size+=part.length;if(size>8192)return json(413,{error:'Запит завеликий.'});parts.push(part);}
    let body;try{body=JSON.parse(Buffer.concat(parts).toString());if(!body||typeof body!=='object'||Array.isArray(body))throw Error();}catch{return json(400,{error:'Некоректний запит.'});}
    const passwordOK=value=>typeof value==='string'&&value.length>=12&&value.length<=256;
    if(pathname==='/api/login'&&req.method==='POST'){
     const ip=String(process.env.NODE_ENV==='production'?req.headers['x-real-ip']||req.headers['x-forwarded-for']||req.socket.remoteAddress:req.socket.remoteAddress).split(',')[0].trim();
     const now=Date.now();for(const [key,value]of attempts)if(value.until<now)attempts.delete(key);
     if(!attempts.has(ip)){if(attempts.size>=10000)return json(429,{error:'Спробуйте пізніше.'});attempts.set(ip,{count:0,until:now+60000});}
     const attempt=attempts.get(ip);
     if(attempt.count>=10||verifications>=4){res.setHeader('Retry-After','60');return json(429,{error:'Забагато спроб. Зачекайте хвилину.'});}
     attempt.count++;
     const username=typeof body.username==='string'?body.username.trim():'';
     if(!username||username.length>180||typeof body.password!=='string'||body.password.length>256)return json(401,{error:'Невірний логін або пароль.'});
     const row=auth.find(username),dummy=auth.find(process.env.BOOTSTRAP_ADMIN_USERNAME||'admin');
     verifications++;let valid;try{valid=await verifyPassword(body.password,row?.password_hash||dummy?.password_hash||'');}finally{verifications--;}
     if(!valid||!row?.active)return json(401,{error:'Невірний логін або пароль.'});
     if(cookie)auth.revoke(cookie);setCookie(auth.issue(row.id));attempts.delete(ip);return json(200,{ok:true});
    }
    if(pathname==='/api/logout'&&req.method==='POST'){auth.revoke(cookie);setCookie('');return json(200,{ok:true});}
    if(!user)return json(401,{error:'Увійдіть до застосунку.'});
    if(pathname==='/api/fuel'&&req.method==='POST'){if(!validFuel(body))return json(400,{error:'Перевірте дані пального та період.'});const vehicle=body.car.trim().toUpperCase()+'|'+body.plate.trim().toUpperCase();auth.db.prepare('INSERT INTO fuel_records VALUES(?,?,?,?,?) ON CONFLICT(user_id,vehicle,period_start,period_end) DO UPDATE SET payload=excluded.payload').run(user.id,vehicle,body.from,body.to,JSON.stringify(body));return json(200,{ok:true});}
    if(pathname==='/api/fuel/import'&&req.method==='POST'){if(user.role!=='admin')return json(403,{error:'Імпорт Excel доступний адміністратору.'});const rows=JSON.parse(await fs.readFile(new URL('./fuel-seed.json',import.meta.url),'utf8'));const insert=auth.db.prepare('INSERT OR IGNORE INTO fuel_records VALUES(?,?,?,?,?)');auth.db.exec('BEGIN');try{for(const row of rows)insert.run(user.id,row.car+'|',row.from,row.to,JSON.stringify(row));auth.db.exec('COMMIT');}catch(error){auth.db.exec('ROLLBACK');throw error;}return json(200,{ok:true});}
    if(pathname==='/api/password'&&req.method==='POST'){
     if(!passwordOK(body.password))return json(400,{error:'Новий пароль має містити від 12 до 256 символів.'});
     const current=auth.find(user.username);
     if(typeof body.currentPassword!=='string'||body.currentPassword.length>256||!await verifyPassword(body.currentPassword,current.password_hash))return json(400,{error:'Поточний пароль невірний.'});
     await auth.password(user.id,body.password);setCookie('');return json(200,{ok:true});
    }
    if(pathname==='/api/users'&&req.method==='POST'){
     if(user.role!=='admin')return json(403,{error:'Потрібен доступ адміністратора.'});
     if(typeof body.username!=='string'||!/^[-a-zA-Z0-9_.@]{3,80}$/.test(body.username)||typeof body.name!=='string'||!body.name.trim()||body.name.length>180||!passwordOK(body.password))return json(400,{error:'Перевірте ПІБ, логін (3–80 латинських символів) і пароль (від 12 символів).'});
     if(auth.find(body.username))return json(409,{error:'Такий логін уже існує.'});
     return json(201,{user:await auth.add({...body,name:body.name.trim()})});
    }
    const account=pathname.match(/^\/api\/users\/([a-f0-9-]{36})$/);
    if(account&&req.method==='PATCH'){
     if(user.role!=='admin')return json(403,{error:'Потрібен доступ адміністратора.'});
     const target=auth.list().find(row=>row.id===account[1]);if(!target)return json(404,{error:'Користувача не знайдено.'});
     if(target.id===user.id)return json(400,{error:'Власний пароль змінюйте в налаштуваннях. Власний доступ заблокувати не можна.'});
     if(body.password!==undefined){if(!passwordOK(body.password))return json(400,{error:'Пароль має містити від 12 до 256 символів.'});await auth.password(target.id,body.password);}
     if(typeof body.active==='boolean')auth.active(target.id,body.active);
     return json(200,{ok:true});
    }
    return json(404,{error:'Не знайдено.'});
   }
   if(pathname==='/account-list'&&req.method==='GET'){
    if(!user)return json(401,{error:'Увійдіть до застосунку.'});
    return user.role==='admin'?json(200,{users:auth.list()}):json(403,{error:'Потрібен доступ адміністратора.'});
   }
   if(!['GET','HEAD'].includes(req.method)){res.setHeader('Allow','GET, HEAD');return send(405,'Method not allowed');}
   if(!publicPaths.has(pathname)&&!user){if(pathname==='/'||pathname==='/index.html')return redirect();return send(401,'Authentication required');}
   const mapped=pathname==='/login'?'/login.html':pathname==='/'?'/index.html':pathname;
   const file=path.resolve(root,'.'+mapped),relative=path.relative(root,file);
   if(relative.startsWith('..')||path.isAbsolute(relative))return send(403,'Forbidden');
   try{send(200,await fs.readFile(file),types[path.extname(file)]||'application/octet-stream');}catch{send(404,'Not found');}
  }catch(error){console.error('Request failed:',error.code||error.name);if(!res.headersSent)json(500,{error:'Помилка сервера. Спробуйте ще раз.'});else res.end();}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{process.loadEnvFile();}catch(error){if(error.code!=='ENOENT')throw error;}
 const dataDir=path.resolve(process.env.DATA_DIR||'data');
 // Railway mounts volumes as root. Drop privileges before opening the database.
 if(process.getuid?.()===0){await fs.mkdir(dataDir,{recursive:true});await fs.chown(dataDir,1000,1000);process.setgid(1000);process.setuid(1000);}
 const auth=createAuthStore(path.join(dataDir,'auth.sqlite'),{username:process.env.BOOTSTRAP_ADMIN_USERNAME,passwordHash:process.env.BOOTSTRAP_ADMIN_HASH});
 const server=createServer({auth}),port=Number(process.env.PORT||4173);
 server.listen(port,'0.0.0.0',()=>console.log(`Listening on port ${port}`));
 for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(()=>{auth.close();process.exit(0);}));
}
