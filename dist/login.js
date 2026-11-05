const form=document.querySelector('#login-form'),error=document.querySelector('#login-error'),submit=document.querySelector('#submit-login');
document.querySelector('#toggle-password').addEventListener('click',ev=>{const input=document.querySelector('#password'),show=input.type==='password';input.type=show?'text':'password';ev.currentTarget.textContent=show?'Сховати':'Показати';ev.currentTarget.setAttribute('aria-label',show?'Сховати пароль':'Показати пароль');ev.currentTarget.setAttribute('aria-pressed',String(show));});
form.addEventListener('submit',async ev=>{
 ev.preventDefault();error.hidden=true;submit.disabled=true;submit.textContent='Входимо…';
 try{
  const response=await fetch('/api/login',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({username:form.username.value.trim(),password:form.password.value})});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'Не вдалося увійти. Спробуйте ще раз.');
  if('BroadcastChannel'in window){const channel=new BroadcastChannel('zvit-auth');channel.postMessage('login');channel.close();}
  location.replace('/');
 }catch(e){error.textContent=e instanceof TypeError?'Немає з’єднання із сервером. Перевірте підключення та спробуйте ще раз.':e.message;error.hidden=false;}
 finally{submit.disabled=false;submit.innerHTML='Увійти <span aria-hidden="true">→</span>';}
});
if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
window.addEventListener('pageshow',()=>{document.querySelector('#password').value='';});
