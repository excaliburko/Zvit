export async function api(path,body,method=body===undefined?'GET':'POST'){
 const response=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const result=await response.json();
 if(response.status===401){document.documentElement.style.visibility='hidden';location.replace('/login');throw Error('Увійдіть до застосунку.');}
 if(!response.ok)throw Error(result.error||'Помилка сервера.');
 return result;
}
const LAST='zvit-last-session';
async function loadSession(){
 try{const current=await api('/api/session');try{localStorage.setItem(LAST,JSON.stringify(current))}catch{}return current}
 catch(error){
  // Без мережі відкриваємо застосунок для останнього користувача цього пристрою. Дані й так лежать тут локально, а сервер без входу нічого не віддасть.
  if(error instanceof TypeError){try{const saved=JSON.parse(localStorage.getItem(LAST));if(saved?.user?.id){saved.offline=true;return saved}}catch{}}
  throw error;
 }
}
export const session=await loadSession();
export const storageKey=`zvit-v1:${session.user.id}`;
const channel='BroadcastChannel'in window?new BroadcastChannel('zvit-auth'):null;
channel?.addEventListener('message',event=>{document.documentElement.style.visibility='hidden';location.replace(event.data==='login'?'/':'/login');});
export async function logout(){await api('/api/logout',{});try{localStorage.removeItem(LAST)}catch{};navigator.serviceWorker?.controller?.postMessage('forget');channel?.postMessage('logout');location.replace('/login');}
async function check(){try{const current=await api('/api/session');if(current.user.id!==session.user.id){document.documentElement.style.visibility='hidden';location.replace('/');}else if(session.offline){session.offline=false;document.body.classList.remove('offline');}}catch(error){if(error instanceof TypeError){document.body.classList.add('offline');return;}document.documentElement.style.visibility='hidden';location.replace('/login');}}
window.addEventListener('online',check);window.addEventListener('offline',()=>document.body.classList.add('offline'));
window.addEventListener('pageshow',event=>{if(event.persisted)check();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
setInterval(check,60000);
