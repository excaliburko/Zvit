import {fraction} from './fuel.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num=n=>Number.isFinite(Number(n))?Number(n).toLocaleString('uk-UA',{maximumFractionDigits:2}):'—';
const date=s=>s?new Date(s+'T12:00:00').toLocaleDateString('uk-UA'):'';
const fill=(x,y,w,h,value,extra='')=>`<span class="form-value ${extra}" style="left:${x}%;top:${y}%;width:${w}%;height:${h}%">${esc(value)}</span>`;
export function travelTemplate(t,r){
 const rows=r.rows||t.rows||[];
 const tasks=rows.slice(0,5).map((row,i)=>fill(6.1,46.8+i*3.2,22.7,2.8,row.route,'small')).join('');
 const front=`<article class="paper a5-form"><img class="blank-form" src="./a5-front.png" alt="Лицьова сторона подорожнього листа A5">${fill(40,18.3,21,1.6,t.number)}${fill(28.5,20.7,40,1.7,date(t.from)+' – '+date(t.to))}${fill(28,22.4,44,1.7,t.workMode)}${fill(19,26.1,53,1.7,[t.car,t.plate,t.garage].filter(Boolean).join(' · '))}${fill(13,29.7,59,1.7,[t.driver,t.license].filter(Boolean).join(' · '))}${fill(14,33.1,25,1.7,t.column)}${fill(50,33.1,22,1.7,t.brigade)}${fill(74.5,40.7,17,2.5,t.fuelBrand)}${fill(74.5,44,17,2.5,t.fuelCode)}${fill(74.5,47.3,17,2.5,num(r.refill))}${fill(74.5,51.5,17,3,num(t.startFuel))}${fill(74.5,56.5,17,2.5,num(r.endFuel))}${fill(34.8,69.2,13.5,2.5,num(t.odometer))}${fill(34.8,72.5,13.5,2.5,num(r.endOdo))}${fill(34.8,82.2,13.5,2.5,t.departTime)}${fill(34.8,85.5,13.5,2.5,t.returnTime)}${tasks}${fill(29.3,46.8,9.5,2.8,t.departTime)}${fill(39.3,46.8,9,2.8,t.returnTime)}</article>`;
 const notes=[t.notes,...rows.filter(row=>row.route.trim()).map(row=>`${date(row.date)} · ${row.route} · ${num(row.km)} км`)].filter(Boolean).join('\n');
 const back=`<article class="paper a5-form"><img class="blank-form" src="./a5-back.png" alt="Зворотна сторона подорожнього листа A5">${fill(5.7,20.4,9.4,3.2,fraction(t.rate,r.normFuel))}${fill(15.5,20.4,9,3.2,fraction(r.actualRate,t.liters))}${fill(25.2,20.4,13,3.2,num(r.total))}${fill(38.8,20.4,13.2,3.2,t.hours)}${fill(6,43.3,85,25.8,notes,'notes')}</article>`;
 return front+back;
}
