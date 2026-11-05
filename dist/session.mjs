export async function api(path,body,method=body===undefined?'GET':'POST'){
 const response=await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
 const result=await response.json();
 if(response.status===401){document.documentElement.style.visibility='hidden';location.replace('/login');throw Error('Увійдіть до застосунку.');}
 if(!response.ok)throw Error(result.error||'Помилка сервера.');
 return result;
}
export const session=await api('/api/session');
export const storageKey=`zvit-v1:${session.user.id}`;
const channel='BroadcastChannel'in window?new BroadcastChannel('zvit-auth'):null;
channel?.addEventListener('message',event=>{document.documentElement.style.visibility='hidden';location.replace(event.data==='login'?'/':'/login');});
export async function logout(){await api('/api/logout',{});channel?.postMessage('logout');location.replace('/login');}
async function check(){try{const current=await api('/api/session');if(current.user.id!==session.user.id){document.documentElement.style.visibility='hidden';location.replace('/');}}catch{document.documentElement.style.visibility='hidden';location.replace('/login');}}
window.addEventListener('pageshow',event=>{if(event.persisted)check();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)check();});
setInterval(check,60000);
