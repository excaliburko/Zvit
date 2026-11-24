// Мережа спочатку, кеш як запасний варіант: після оновлення сайту завжди береться свіжий код,
// а без інтернету застосунок відкривається з останньої збереженої версії. API ніколи не кешується.
const CACHE='zvit-shell-v21';
const SHELL=['/','/app.js','/style.css','/session.mjs','/fuel.mjs','/calc.mjs','/contacts.mjs','/travel-template.mjs','/a5-front.svg','/a5-back.svg','/icon.svg','/icon-192.png','/manifest.webmanifest','/login','/login.css','/login.js'];
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('zvit-')&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('message',event=>{
 if(event.data==='warm')event.waitUntil(caches.open(CACHE).then(cache=>Promise.all(SHELL.map(url=>fetch(url,{cache:'no-store',credentials:'same-origin'}).then(res=>res.ok&&!res.redirected&&cache.put(url,res)).catch(()=>{})))));
 if(event.data==='forget')event.waitUntil(caches.delete(CACHE));
});
const offlinePage=()=>new Response('<!doctype html><html lang="uk"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Звіт · Немає з’єднання</title><body style="font:17px system-ui;padding:48px 24px;color:#111;text-align:center"><h1 style="font-size:24px">Немає з’єднання</h1><p style="color:#8a8a91">Підключіться до інтернету й спробуйте ще раз.</p><a href="/" style="display:inline-block;margin-top:16px;padding:14px 24px;border-radius:26px;background:#111;color:#fff;text-decoration:none">Спробувати ще раз</a></body></html>',{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);
 if(req.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/api/'))return;
 const nav=req.mode==='navigate',key=nav?(url.pathname==='/login'||url.pathname==='/login.html'?'/login':'/'):url.pathname;
 event.respondWith((async()=>{
  try{
   const res=await fetch(req,{cache:'no-store'});
   if(res.ok&&!res.redirected&&(nav?key==='/'||key==='/login':SHELL.includes(key))){const copy=res.clone();caches.open(CACHE).then(cache=>cache.put(key,copy)).catch(()=>{})}
   return res;
  }catch{
   const hit=await caches.match(key);
   return hit||(nav?offlinePage():new Response('Offline',{status:503,headers:{'Content-Type':'text/plain'}}));
  }
 })());
});
