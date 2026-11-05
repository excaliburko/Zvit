const CACHE='zvit-auth-v1';
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith('zvit-')).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 if(event.request.method!=='GET'||new URL(event.request.url).origin!==location.origin)return;
 event.respondWith(fetch(event.request,{cache:'no-store'}).catch(()=>new Response(event.request.mode==='navigate'?'<!doctype html><html lang="uk"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Звіт · Немає з’єднання</title><body style="font:18px system-ui;padding:40px;color:#173b35"><h1>Немає з’єднання із сервером</h1><p>Для захищеного входу потрібне підключення. Збережені звіти залишаються на цьому пристрої.</p><a href="/login">Спробувати ще раз</a></body></html>':'Offline',{status:503,headers:{'Content-Type':event.request.mode==='navigate'?'text/html; charset=utf-8':'text/plain','Cache-Control':'no-store'}})));
});
