import {directoryFields,validDirectory,migrateDirectories,applyContact} from './contacts.mjs';
import {travelTemplate} from './travel-template.mjs';
import {previousDate,costTotal,travelCalc,round} from './calc.mjs';
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n).toLocaleString('uk-UA',{minimumFractionDigits:2,maximumFractionDigits:2}),num=n=>Number(n).toLocaleString('uk-UA',{maximumFractionDigits:2});
const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const date=s=>s?new Date(s+'T12:00:00').toLocaleDateString('uk-UA'):'__________';
const longDate=s=>{if(!s)return '________________';const d=new Date(s+'T12:00:00');return `«${String(d.getDate()).padStart(2,'0')}» ${['січня','лютого','березня','квітня','травня','червня','липня','серпня','вересня','жовтня','листопада','грудня'][d.getMonth()]} ${d.getFullYear()} року`};
const defaults=()=>({version:1,event:{venue:'',date:today(),number:'',city:'Київ',person:'',products:['Дона'],items:['Чай','Кава','Цукерки','Печиво'].map(name=>({name,qty:1,price:0}))},profile:{company:'«МЕДА Фармасьютікалз Світселенд ГмБх»',head:'В. С. Піонт',budgetHead:'Піонт В.С.',position:'Голова представництва'},products:['Дона','Целебрекс','Лірика','Алдара','Елідел'],travel:{liters:0,rate:10,startFuel:20,endTarget:20,adjustmentKm:0,refill:0,odometer:12675.7,basis:'seat · вересень 2026 · D21/F21/G21',driver:'',car:'SEAT',plate:'',from:today(),to:today(),rows:[{date:today(),route:'',km:0}]},archive:[]});
let state=defaults(),storageOK=true,view='home',docType='order',deferredInstall,contactKind='clinics';
try{const saved=JSON.parse(localStorage.getItem('zvit-v1'));if(saved&&saved.version===1&&saved.event&&saved.travel&&Array.isArray(saved.archive))state={...state,...saved,profile:{...state.profile,...saved.profile}}}catch{storageOK=false}
migrateDirectories(state);
state.travel.endTarget ??= state.travel.startFuel;state.travel.adjustmentKm ??= 0;
const parentOf={event:'home',travel:'home',contacts:'profile',signer:'profile'};
function save(){try{localStorage.setItem('zvit-v1',JSON.stringify(state));storageOK=true}catch{storageOK=false}}
function toast(msg){$('#toast').textContent=msg;$('#toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').classList.remove('show'),4000)}

/* ---------- Іконки ---------- */
const P={home:'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',doc:'M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h6',car:'M5 17h14M6 17v2M18 17v2M4 13l2-6h12l2 6v4H4zM7.5 14.5h.01M16.5 14.5h.01',list:'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',user:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',right:'m9 6 6 6-6 6',left:'m15 5-7 7 7 7',plus:'M12 5v14M5 12h14',print:'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7z',eye:'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',save:'M6 3h12v18l-6-4-6 4z',download:'M12 4v11M7 10l5 5 5-5M5 20h14',upload:'M12 20V9M7 14l5-5 5 5M5 4h14',phone:'M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2',x:'M6 6l12 12M18 6 6 18',building:'M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 8h3M8 12h3M8 16h3',pen:'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',search:'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',next:'M5 12h14M13 6l6 6-6 6',check:'M5 12.5l4.5 4.5L19 7'};
const icon=(n,c='')=>`<svg class="ic ${c}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[n]}"/></svg>`;

/* ---------- Будівельні блоки ---------- */
function field(label,key,value,type='text',extra=''){return `<label class="field"><span>${label}</span><input type="${type}" data-key="${key}" value="${esc(value)}" ${extra}></label>`}
const btn=(text,action,cls='button')=>`<button class="${cls}" data-action="${action}">${text}</button>`;
const group=(title,body,cls='')=>`<section class="group ${cls}">${title?`<h2 class="group-title">${title}</h2>`:''}<div class="card">${body}</div></section>`;
const row=(ic,title,sub,action,extra='')=>`<button class="row" data-action="${action}" ${extra}><span class="avatar">${icon(ic)}</span><span class="row-main"><b>${title}</b>${sub?`<small>${sub}</small>`:''}</span>${icon('right','chev')}</button>`;
const bar=(...b)=>b.join('');
const quick=(...a)=>`<div class="quick">${a.map(([ic,label,action])=>`<button data-action="${action}"><span class="q-icon">${icon(ic)}</span><span>${label}</span></button>`).join('')}</div>`;
const plural=(n,one,few,many)=>{const m10=n%10,m100=n%100;return `${n} ${m10===1&&m100!==11?one:m10>=2&&m10<=4&&(m100<12||m100>14)?few:many}`};
const monthName=s=>{if(!s)return '';const d=new Date(s+'T12:00:00');return d.toLocaleDateString('uk-UA',{month:'long',year:'numeric'})};

/* ---------- Головна ---------- */
function homeView(){
 const e=state.event,t=state.travel,r=travelCalc(t),recent=state.archive.slice(-4).reverse();
 return {body:`<header class="large-title"><div><small>Звіт</small><h1>Документи</h1></div><button class="round" data-view="profile" aria-label="Профіль">${icon('user')}</button></header>
 <div class="tiles">
  <button class="tile dark" data-view="event"><span class="tile-icon">${icon('doc')}</span><span class="tile-text"><b>Круглий стіл</b><small>${e.venue?esc(e.venue):'Наказ + кошторис'}</small></span><span class="tile-amount">${money(costTotal(e.items))} ₴</span></button>
  <button class="tile" data-view="travel"><span class="tile-icon">${icon('car')}</span><span class="tile-text"><b>Подорожній лист</b><small>${esc(monthName(t.from))}</small></span><span class="tile-amount">${r.total===undefined?'—':num(r.total)+' км'}</span></button>
 </div>
 <section class="group"><div class="group-head"><h2 class="group-title">Останні звіти</h2>${state.archive.length?`<button class="link" data-view="archive">Усі</button>`:''}</div>
 ${recent.length?`<div class="card">${recent.map(archiveRow).join('')}</div>`:`<div class="card empty">${icon('list','big')}<b>Тут з’являться збережені звіти</b><p>Заповніть документ і натисніть «Зберегти».</p></div>`}</section>`};
}

/* ---------- Круглий стіл ---------- */
function eventView(){const e=state.event;return {title:'Круглий стіл',
 body:`<section class="hero"><span class="hero-label">Кошторис події</span><div class="hero-amount" id="budget-total"></div><div class="hero-status" id="preview-status"></div></section>${quick(['eye','Перегляд','preview'],['save','Зберегти','save-event'],['plus','Нова подія','new-event'],['building','Довідники','manage-contacts'])}
 ${group('Клініка',`${contactPicker('clinics')}${field('Назва закладу','event.venue',e.venue,'text','placeholder="Наприклад, МЦ Леодерм" maxlength="180"')}${field('Місто','event.city',e.city,'text','maxlength="80"')}<div class="card-foot">${btn(icon('save')+'Зберегти в довідник','remember-clinic','link')}</div>`)}
 ${group('Подія',`<div class="field-grid">${field('Дата проведення','event.date',e.date,'date','required')}${field('Номер наказу','event.number',e.number,'text','placeholder="24/11" maxlength="40"')}</div><p class="hint" id="order-date"></p>`)}
 ${group('Відповідальна особа',`${contactPicker('representatives')}${field('ПІБ у давальному відмінку','event.person',e.person,'text','placeholder="Кузьмінській Уляні Іванівні" maxlength="180"')}<div class="card-foot">${btn(icon('save')+'Зберегти в довідник','remember-representative','link')}</div>`)}
 ${group('Препарати',`<div class="chips">${state.products.map(p=>`<button class="chip ${e.products.includes(p)?'checked':''}" data-product="${esc(p)}" aria-pressed="${e.products.includes(p)}">${e.products.includes(p)?icon('check'):''}${esc(p)}</button>`).join('')}</div><div class="inline-add"><input id="new-product" placeholder="Інший препарат" aria-label="Назва нового препарату" maxlength="80"><button class="round soft" data-action="add-product" aria-label="Додати препарат">${icon('plus')}</button></div>`)}
 ${group('Витрати',`<div class="budget-rows">${e.items.map((r,i)=>`<div class="budget-row"><input class="b-name" aria-label="Позиція ${i+1}" placeholder="Назва позиції" data-item="${i}" data-prop="name" value="${esc(r.name)}" maxlength="120"><button class="icon-btn" data-remove-item="${i}" aria-label="Видалити позицію ${i+1}">${icon('x')}</button><label class="mini"><span>К-сть</span><input data-item="${i}" data-prop="qty" type="number" inputmode="decimal" min="0.01" step="0.01" value="${r.qty}" aria-label="Кількість ${i+1}"></label><label class="mini"><span>Ціна, ₴</span><input data-item="${i}" data-prop="price" type="number" inputmode="decimal" min="0" step="0.01" value="${r.price}" aria-label="Ціна ${i+1}"></label><b class="b-total" data-line-total="${i}"></b></div>`).join('')}</div><button class="add-row" data-action="add-item">${icon('plus')}Додати позицію</button>`)}`,
 bar:`<button class="button pill" data-action="print-both">${icon('print')}Друкувати наказ і кошторис</button>`}}

/* ---------- Подорожній лист ---------- */
function travelView(){const t=state.travel;return {title:'Подорожній лист',
 body:`<section class="hero" id="travel-balance"></section>${quick(['eye','Перегляд','travel-preview'],['save','Зберегти','save-travel'],['next','Новий місяць','next-period'],['user','Водії','contacts-representatives'])}
 <details class="calc"><summary>Детальний розрахунок</summary><dl id="travel-dl"></dl></details>
 ${group('Пальне',`<div class="presets">${btn('SEAT · 10 л','preset-seat','chip')}${btn('VW · 9 л','preset-vw','chip')}</div><div class="field-grid">${field('Витрачено, л','travel.liters',t.liters,'number','min="0.01" step="0.01" inputmode="decimal"')}${field('Норма, л/100 км','travel.rate',t.rate,'number','min="0.01" step="0.01" inputmode="decimal"')}${field('Залишок на початок','travel.startFuel',t.startFuel,'number','min="0" step="0.01" inputmode="decimal"')}${field('Залишок на кінець','travel.endTarget',t.endTarget,'number','min="0" step="0.01" inputmode="decimal"')}</div>${field('Поправка пробігу, ± км','travel.adjustmentKm',t.adjustmentKm,'number','step="0.1"')}<p class="hint">Джерело залишків: ${esc(t.basis||'введені вручну')}</p>`)}
 ${group('Період',`<div class="field-grid">${field('Початок','travel.from',t.from,'date')}${field('Кінець','travel.to',t.to,'date')}</div>`)}
 ${group('Авто і водій',`${contactPicker('representatives','travel')}${field('Водій','travel.driver',t.driver,'text','maxlength="180"')}<div class="field-grid">${field('Автомобіль','travel.car',t.car,'text','maxlength="120"')}${field('Держномер','travel.plate',t.plate,'text','maxlength="30"')}</div>${field('Одометр на початок, км','travel.odometer',t.odometer,'number','min="0" step="0.01" inputmode="decimal"')}`)}
 ${group('Поїздки',`<div id="trip-rows">${tripRows()}</div><button class="add-row" data-action="add-trip">${icon('plus')}Додати поїздку</button>${state.travel.rows.length>1?`<div class="card-foot">${btn('Розподілити порівну','split-trips','link')}</div>`:''}`)}
 <details class="group more"><summary>Реквізити бланка та час роботи</summary><div class="card"><div class="field-grid">${field('Номер листа','travel.number',t.number||'','text','maxlength="30"')}${field('Режим роботи','travel.workMode',t.workMode||'','text','maxlength="80"')}${field('Марка пального','travel.fuelBrand',t.fuelBrand||'','text','maxlength="30"')}${field('Код марки','travel.fuelCode',t.fuelCode||'','text','maxlength="20"')}${field('Час виїзду','travel.departTime',t.departTime||'','time')}${field('Час повернення','travel.returnTime',t.returnTime||'','time')}${field('Годин у наряді','travel.hours',t.hours||'','number','min="0" step="0.1"')}${field('Колона','travel.column',t.column||'','text','maxlength="30"')}${field('Бригада','travel.brigade',t.brigade||'','text','maxlength="30"')}</div>${field('Особливі відмітки','travel.notes',t.notes||'','text','maxlength="300"')}</div></details>
`,
 bar:`<button class="button pill" data-action="print-travel">${icon('print')}Друкувати подорожній лист</button>`}}
function tripRows(){const result=travelCalc(state.travel);return state.travel.rows.map((r,i)=>{const last=i===state.travel.rows.length-1;return `<div class="trip"><div class="trip-top"><b>Поїздка ${i+1}</b>${last&&state.travel.rows.length>1?'<span class="tag">решта пробігу</span>':''}<button class="icon-btn" data-remove-trip="${i}" aria-label="Видалити поїздку ${i+1}" ${state.travel.rows.length===1?'disabled':''}>${icon('x')}</button></div><input aria-label="Маршрут поїздки ${i+1}" placeholder="Маршрут: звідки → куди" data-trip="${i}" data-prop="route" value="${esc(r.route)}" maxlength="200"><div class="field-grid"><label class="field"><span>Дата</span><input type="date" data-trip="${i}" data-prop="date" value="${esc(r.date)}"></label><label class="field"><span>Пробіг, км</span><div class="stepper">${last?'':`<button data-step-trip="${i}" data-step="-1" aria-label="Зменшити пробіг поїздки ${i+1}">−</button>`}<input type="number" min="0" step="0.01" inputmode="decimal" aria-label="Пробіг поїздки ${i+1}" data-trip="${i}" data-prop="km" value="${last?result.rows?.[i]?.km??0:r.km}" ${last?'readonly data-last-km':''}>${last?'':`<button data-step-trip="${i}" data-step="1" aria-label="Збільшити пробіг поїздки ${i+1}">+</button>`}</div></label></div></div>`}).join('')}

/* ---------- Звіти ---------- */
function archiveRow(r){return `<div class="row-wrap"><button class="row" data-action="open-${r.id}"><span class="avatar ${r.type}">${icon(r.type==='event'?'doc':'car')}</span><span class="row-main"><b>${esc(r.title)}</b><small>${r.type==='event'?'Наказ + кошторис':'Подорожній лист'} · ${date(r.date)}</small></span></button><button class="icon-btn" data-delete-archive="${r.id}" aria-label="Видалити звіт ${esc(r.title)}">${icon('x')}</button></div>`}
function archiveList(q){const rows=state.archive.filter(r=>r.title.toLowerCase().includes(q.toLowerCase()));return rows.length?`<div class="card">${rows.slice().reverse().map(archiveRow).join('')}</div>`:`<div class="card empty">${icon(q?'search':'list','big')}<b>${q?'Звітів не знайдено':'Тут будуть ваші звіти'}</b><p>Заповніть документ і натисніть «Зберегти».</p></div>`}
function archiveView(){return {body:`<header class="large-title"><div><small>${state.archive.length} збережено</small><h1>Звіти</h1></div></header><label class="search">${icon('search')}<input id="archive-search" type="search" placeholder="Заклад або водій" aria-label="Пошук звіту"></label><section class="group" id="archive-list">${archiveList('')}</section>`}}

/* ---------- Профіль ---------- */
function profileView(){const p=state.profile;return {body:`<header class="large-title"><div><small>Профіль</small><h1>Налаштування</h1></div></header>
 ${group('Довідники',row('building','Клініки',plural(state.clinics.length,'запис','записи','записів'),'contacts-clinics')+row('user','Представники',plural(state.representatives.length,'запис','записи','записів'),'contacts-representatives'))}
 ${group('Документи',row('pen','Підписант',esc(p.head+' · '+p.position),'open-signer'))}
 ${group('Дані',row('download','Завантажити резервну копію','JSON-файл з усіма даними','backup')+row('upload','Відновити з копії','Замінить поточні дані','restore')+row('phone','Встановити на телефон','Працює без інтернету','install'))}
 <p class="foot-note">${storageOK?'Усі дані зберігаються лише на цьому пристрої. Робіть резервну копію перед зміною телефону чи очищенням браузера.':'Локальне збереження недоступне. Завантажте резервну копію, щоб не втратити дані.'}</p>`}}
function signerView(){return {title:'Підписант',body:group('',`${field('Організація','profile.company',state.profile.company,'text','maxlength="200"')}${field('Посада','profile.position',state.profile.position,'text','maxlength="120"')}${field('Підпис у наказі','profile.head',state.profile.head,'text','maxlength="100"')}${field('Підпис у кошторисі','profile.budgetHead',state.profile.budgetHead,'text','maxlength="100"')}`)+'<p class="foot-note">Зміни застосовуються до нових документів.</p>'}}

/* ---------- Довідники ---------- */
const emptyContact=kind=>Object.fromEntries(directoryFields[kind].map(key=>[key,'']));
const contactDrafts={clinics:emptyContact('clinics'),representatives:emptyContact('representatives')};
const contactForm={clinics:false,representatives:false};
function contactPicker(kind,target='event'){
 const clinic=kind==='clinics', current=state[target], rows=state[kind];
 if(!rows.length)return '';
 const selected=rows.find(r=>r.id===current[clinic?'clinicId':'representativeId']&&(clinic?r.name===current.venue&&r.city===current.city:target==='travel'?r.name===current.driver:r.person===current.person));
 return `<label class="field picker"><span>${clinic?'Із довідника':target==='travel'?'Водій із представників':'Із довідника'}</span><select data-contact-picker="${kind}" data-target="${target}"><option value="">Ввести вручну</option>${rows.map(r=>`<option value="${esc(r.id)}" ${selected?.id===r.id?'selected':''}>${esc(r.name)}${clinic&&r.city?' · '+esc(r.city):''}</option>`).join('')}</select></label>`;
}
function contactsView(){
 const kind=contactKind,clinic=kind==='clinics',draft=contactDrafts[kind];
 const labels={name:clinic?'Назва клініки':'ПІБ представника',city:'Місто',address:'Адреса',contact:'Контактна особа',phone:'Телефон',person:'ПІБ у давальному відмінку'};
 const form=contactForm[kind]||draft.id?group(draft.id?'Редагування':'Новий запис',`${directoryFields[kind].map(key=>`<label class="field"><span>${labels[key]}</span><input data-directory="${kind}" data-contact-field="${key}" value="${esc(draft[key])}" maxlength="300" type="${key==='phone'?'tel':'text'}"></label>`).join('')}<div class="form-actions">${btn('Скасувати','cancel-'+kind,'button secondary')}${btn(draft.id?'Зберегти':'Додати','save-'+kind)}</div>`):'';
 return {title:'Довідники',body:`<div class="segmented"><button data-ckind="clinics" class="${clinic?'selected':''}">Клініки</button><button data-ckind="representatives" class="${clinic?'':'selected'}">Представники</button></div>
 ${form}
 <section class="group"><div class="card">${form?'':`<button class="add-row top" data-action="add-contact">${icon('plus')}Додати ${clinic?'клініку':'представника'}</button>`}${state[kind].map(r=>`<div class="row-wrap"><button class="row" data-edit-contact="${esc(r.id)}" data-contact-kind="${kind}"><span class="avatar">${icon(clinic?'building':'user')}</span><span class="row-main"><b>${esc(r.name)}</b><small>${[clinic?r.city:r.person,clinic?r.address:'',r.phone].filter(Boolean).map(esc).join(' · ')||'&nbsp;'}</small></span></button><button class="icon-btn" data-remove-contact="${esc(r.id)}" data-contact-kind="${kind}" aria-label="Видалити ${esc(r.name)}">${icon('x')}</button></div>`).join('')}${!state[kind].length&&!form?`<p class="hint pad">${clinic?'Назва й місто клініки підставляються в документи події.':'ПІБ підставляється у наказ і подорожній лист.'}</p>`:''}</div></section>`};
}
function saveContact(kind){
 const draft=contactDrafts[kind],row={id:draft.id||crypto.randomUUID(),...Object.fromEntries(directoryFields[kind].map(k=>[k,draft[k].trim()]))};
 if(!validDirectory([row],kind))return toast(kind==='clinics'?'Введіть назву клініки.':'Введіть ПІБ представника та ПІБ у давальному відмінку.');
 const index=state[kind].findIndex(r=>r.id===row.id);
 if(index<0&&state[kind].length>=500)return toast('У довіднику може бути до 500 записів.');
 if(index<0)state[kind].push(row);else state[kind][index]=row;
 contactDrafts[kind]=emptyContact(kind);contactForm[kind]=false;save();render();toast(storageOK?'Запис збережено.':'Не вдалося зберегти на пристрої. Завантажте резервну копію.');
}
function rememberContact(kind){
 const clinic=kind==='clinics',e=state.event,name=(clinic?e.venue:e.person).trim();
 if(!name)return toast(clinic?'Спочатку введіть назву клініки.':'Спочатку введіть відповідальну особу.');
 if(!clinic){
  const existing=state.representatives.find(r=>r.person.toLocaleLowerCase('uk')===name.toLocaleLowerCase('uk'));
  if(existing){applyContact(state,kind,existing.id);save();render();return toast('Представника вже збережено.');}
  contactDrafts.representatives={...emptyContact(kind),person:name};contactKind='representatives';contactForm.representatives=true;go('contacts');
  document.querySelector('[data-directory="representatives"]')?.focus();
  return toast('Додайте ПІБ у називному відмінку та збережіть запис.');
 }
 const row=state[kind].find(r=>r.name.toLocaleLowerCase('uk')===name.toLocaleLowerCase('uk')&&(!clinic||r.city.trim().toLocaleLowerCase('uk')===e.city.trim().toLocaleLowerCase('uk')));
 if(row){applyContact(state,kind,row.id);save();render();return toast('Такий запис уже збережено. Змінити його можна в довіднику.');}
 if(state[kind].length>=500)return toast('У довіднику може бути до 500 записів.');
 const record={...emptyContact(kind),id:crypto.randomUUID(),name,...(clinic?{city:e.city.trim()}:{person:name})};
 state[kind].push(record);applyContact(state,kind,record.id);save();render();toast(storageOK?'Дані збережено в довіднику.':'Не вдалося зберегти на пристрої. Завантажте резервну копію.');
}

/* ---------- Рендер ---------- */
const views={home:homeView,event:eventView,travel:travelView,archive:archiveView,profile:profileView,contacts:contactsView,signer:signerView};
function render(){
 const v=views[view](),pushed=!!parentOf[view];
 document.body.dataset.view=view;document.body.classList.toggle('pushed',pushed);
 $('#appbar').innerHTML=pushed?`<button class="round ghost" data-action="back" aria-label="Назад">${icon('left')}</button><b>${v.title}</b><span class="appbar-right">${v.right||''}</span>`:'';
 $('#content').innerHTML=v.body;
 $('#actionbar').innerHTML=v.bar||'';document.body.classList.toggle('has-bar',!!v.bar);
 const tab=parentOf[view]||view;document.querySelectorAll('.tabbar [data-view]').forEach(el=>{el.classList.toggle('active',el.dataset.view===tab);el.setAttribute('aria-current',el.dataset.view===tab?'page':'false')});
 updateDerived();
}
function go(next){if(next===view)return;const pushed=!!parentOf[next];view=next;if(next==='travel')docType='travel';else if(next==='event')docType='order';pushed?history.pushState({view:next,pushed:true},''):history.replaceState({view:next},'');render();window.scrollTo(0,0)}
function back(){if(history.state?.pushed)history.back();else{view=parentOf[view]||'home';history.replaceState({view},'');render()}}
window.addEventListener('popstate',e=>{if($('#preview-dialog').open)$('#preview-dialog').close();view=e.state?.view||'home';render()});
function updateDerived(){
 if(view==='event'){const total=$('#budget-total');if(total)total.innerHTML=money(costTotal(state.event.items))+' <small>₴</small>';state.event.items.forEach((r,i)=>{const el=document.querySelector(`[data-line-total="${i}"]`);if(el)el.textContent=money(r.qty*r.price)+' ₴'});const errs=eventErrors(true),st=$('#preview-status');if(st){st.className='hero-status '+(errs.length?'warn':'ok');st.innerHTML=errs.length?'Заповніть: '+esc(errs.join(', ')):icon('check')+'Наказ і кошторис готові до друку'}const od=$('#order-date');if(od)od.textContent=`Дата наказу — ${date(previousDate(state.event.date))}, за день до події. Ставиться автоматично.`}
 if(view==='travel'){const r=travelCalc(state.travel),v=(x,u)=>x===undefined?'—':num(x)+u;
  $('#travel-balance').innerHTML=`<span class="hero-label">Пробіг за період</span><div class="hero-amount">${r.total===undefined?'—':num(r.total)} <small>км</small></div><div class="hero-status ${r.error?'warn':'ok'}">${r.error?esc(r.error):icon('check')+'Баланс пального й пробігу сходиться'}</div><div class="hero-stats"><div><span>Видано</span><b>${v(r.refill,' л')}</b></div><div><span>Залишок</span><b>${v(r.endFuel,' л')}</b></div><div><span>Одометр</span><b>${v(r.endOdo,'')}</b></div></div>`;
  $('#travel-dl').innerHTML=[['Витрачено пального',num(state.travel.liters)+' л'],['Розраховано видано',v(r.refill,' л')],['За нормою',v(r.normFuel,' л')],['Фактично л/100 км',v(r.actualRate,'')],['Факт − норма',v(r.fuelDifference,' л')],['Залишок на кінець',v(r.endFuel,' л')],['Одометр на кінець',v(r.endOdo,' км')]].map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
  const last=$('[data-last-km]');if(last)last.value=r.rows?.at(-1)?.km??0}
}
function eventErrors(budget){const e=state.event;let errors=[];if(!e.venue.trim())errors.push('назву закладу');if(!e.date)errors.push('дату події');if(!e.person.trim())errors.push('відповідальну особу');if(!e.products.length)errors.push('хоча б один препарат');if(budget&&(!e.items.length||e.items.some(r=>!r.name.trim()||!(Number(r.qty)>0)||Number(r.price)<0||!Number.isFinite(Number(r.price)))))errors.push('коректні позиції кошторису');return errors}
function travelErrors(){const t=state.travel,r=travelCalc(t);if(r.error)return r.error;if([t.odometer,t.startFuel,t.endTarget].some(n=>!Number.isFinite(Number(n))||Number(n)<0))return 'Залишок, заправка й одометр мають бути невід’ємними.';if(!t.driver.trim()||!t.car.trim()||!t.plate.trim())return 'Заповніть водія, автомобіль і державний номер.';if(!t.from||!t.to||t.to<t.from)return 'Перевірте початок і кінець періоду.';if(t.rows.some(r=>!r.route.trim()||!r.date||r.date<t.from||r.date>t.to))return 'Заповніть маршрути й дати всіх поїздок у межах періоду.';return ''}
function documentHtml(type){const e=state.event,p=state.profile,d=previousDate(e.date),val=s=>esc(s||'________________');if(type==='order')return `<article class="paper order"><h1>Н А К А З №${val(e.number)}</h1><div class="order-date"><span>м. ${val(e.city)}</span><span>${longDate(d)}</span></div><div class="order-subject">«Про організацію круглого столу<br>у ${val(e.venue)}»</div><p class="command">Наказую:</p><p>${val(e.person)} провести круглий стіл ${date(e.date)} року у ${val(e.venue)} по препаратах: ${val(e.products.join(', '))}</p><p class="order-point">1. &nbsp; Скласти кошторис.</p><p>Підстава: Розпорядження керівника.</p><div class="order-sign"><span>${val(p.position)}<br>${val(p.company)}</span><span>${val(p.head)}</span></div></article>`;if(type==='budget'){const total=money(costTotal(e.items));return `<article class="paper budget"><h1>К О Ш Т О Р И С</h1><p class="budget-subject">Про організацію круглого столу у ${val(e.venue)}</p><div class="amount-line">${total}</div><div class="amount-hint">( сума витрат подано в гривнях)</div><table><thead><tr><th>№</th><th>Опис затрат</th><th>Сума</th></tr></thead><tbody>${e.items.map((r,i)=>`<tr><td>${i+1}</td><td>${val(r.name)}</td><td class="amount">${money(r.qty*r.price)}</td></tr>`).join('')}<tr><td>&nbsp;</td><td></td><td></td></tr><tr><td>&nbsp;</td><td></td><td></td></tr><tr><td></td><td>Всього</td><td class="amount">${total}</td></tr></tbody></table><p class="budget-date">дата: ${date(d)}</p><p class="budget-sign">${val(p.position)}:__________________ ${val(p.budgetHead)}</p></article>`}const t=state.travel,r=travelCalc(t);return travelTemplate(t,r)}
function fitPreview(){const box=$('#full-preview');box.querySelectorAll('.preview-scale').forEach(el=>{const doc=el.firstElementChild;el.style.zoom=1;const w=doc.offsetWidth;el.style.zoom=Math.min(1,(box.clientWidth-24)/w)})}
function preview(type){docType=type;const dlg=$('#preview-dialog');$('#preview-switch').innerHTML=type==='travel'?'':`<div class="segmented small"><button data-doc="order" class="${type==='order'?'selected':''}">Наказ</button><button data-doc="budget" class="${type==='budget'?'selected':''}">Кошторис</button></div>`;const html=documentHtml(type);$('#full-preview').innerHTML=type==='travel'?html.split(/(?=<article)/).filter(Boolean).map(a=>`<div class="preview-scale">${a}</div>`).join(''):`<div class="preview-scale">${html}</div>`;if(!dlg.open)dlg.showModal();requestAnimationFrame(fitPreview)}
window.addEventListener('resize',()=>{if($('#preview-dialog').open)fitPreview()});
function printDoc(type,both=false){if(type==='travel'){const err=travelErrors();if(err)return toast(err)}else{const errors=eventErrors(type==='budget'||both);if(errors.length)return toast('Заповніть: '+errors.join(', ')+'.')}$('#page-style').textContent=`@page { size: ${type==='travel'?'A5':'A4'} portrait; margin: 0; }`;$('#print-root').innerHTML=both?documentHtml('order')+documentHtml('budget'):documentHtml(type);document.body.classList.add('printing');window.print()}
window.addEventListener('afterprint',()=>document.body.classList.remove('printing'));
function storeReport(type){const errors=type==='event'?eventErrors(true).join(', '):travelErrors();if(errors)return toast(type==='event'?'Заповніть: '+errors:errors);const copy=structuredClone(type==='event'?state.event:state.travel);state.archive.push({id:crypto.randomUUID(),type,title:type==='event'?copy.venue:copy.driver,date:type==='event'?copy.date:copy.from,data:copy,profile:structuredClone(state.profile)});save();toast(storageOK?'Звіт збережено в архіві.':'Не вдалося зберегти. Завантажте резервну копію.');render()}
function backup(){const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`zvit-backup-${today()}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)}
function validBackup(s){const str=x=>typeof x==='string'&&x.length<2000,arr=x=>Array.isArray(x)&&x.length<500,num=x=>Number.isFinite(Number(x))&&Number(x)>=0;const event=e=>e&&['venue','date','number','city','person'].every(k=>str(e[k]))&&arr(e.products)&&e.products.every(str)&&arr(e.items)&&e.items.every(r=>str(r.name)&&num(r.qty)&&num(r.price));const travel=t=>t&&['driver','car','plate','from','to'].every(k=>str(t[k]))&&['liters','rate','startFuel','refill','odometer'].every(k=>num(t[k]))&&(t.endTarget===undefined||num(t.endTarget))&&(t.adjustmentKm===undefined||Number.isFinite(Number(t.adjustmentKm)))&&arr(t.rows)&&t.rows.length>0&&t.rows.every(r=>str(r.date)&&str(r.route)&&num(r.km));const profile=p=>p&&['company','head','budgetHead','position'].every(k=>str(p[k]));return s?.version===1&&validDirectory(s.clinics,'clinics')&&validDirectory(s.representatives,'representatives')&&event(s.event)&&travel(s.travel)&&profile(s.profile)&&arr(s.products)&&s.products.every(str)&&arr(s.archive)&&s.archive.every(r=>str(r.id)&&/^[a-zA-Z0-9-]+$/.test(r.id)&&str(r.title)&&str(r.date)&&profile(r.profile)&&(r.type==='event'?event(r.data):r.type==='travel'&&travel(r.data)))}
async function install(){if(deferredInstall){await deferredInstall.prompt();deferredInstall=null}else{toast('iPhone: Safari → Поділитися → На початковий екран. Android: меню → Встановити застосунок.')}}

/* ---------- Події ---------- */
document.addEventListener('click',async ev=>{const el=ev.target.closest('button');if(!el)return;const ds=el.dataset;
 if(ds.ckind){contactKind=ds.ckind;render();return}
 if(ds.editContact){const kind=ds.contactKind;contactDrafts[kind]={...state[kind].find(r=>r.id===ds.editContact)};render();window.scrollTo(0,0);document.querySelector(`[data-directory="${kind}"]`)?.focus();return}
 if(ds.removeContact){const kind=ds.contactKind;if(confirm('Видалити запис із довідника? Дані у звітах залишаться.')){state[kind]=state[kind].filter(r=>r.id!==ds.removeContact);if(contactDrafts[kind].id===ds.removeContact)contactDrafts[kind]=emptyContact(kind);save();render()}return}
 if(ds.view){go(ds.view);return}
 if(ds.doc){preview(ds.doc);return}
 if(ds.product){const a=state.event.products;a.includes(ds.product)?a.splice(a.indexOf(ds.product),1):a.push(ds.product);save();render();return}
 if(ds.removeItem!==undefined){state.event.items.splice(+ds.removeItem,1);save();render();return}
 if(ds.removeTrip!==undefined&&state.travel.rows.length>1){state.travel.rows.splice(+ds.removeTrip,1);save();render();return}
 if(ds.stepTrip!==undefined){const r=state.travel.rows[+ds.stepTrip];r.km=Math.max(0,round(Number(r.km)+Number(ds.step)));save();render();return}
 if(ds.deleteArchive){if(confirm('Видалити збережений звіт? Перед видаленням можна завантажити резервну копію.')){state.archive=state.archive.filter(r=>r.id!==ds.deleteArchive);save();render()}return}
 const a=ds.action;if(!a)return;
 if(a.startsWith('open-')&&a!=='open-signer'){const r=state.archive.find(r=>r.id===a.slice(5));if(r&&confirm('Відкрити звіт замість поточної чернетки? Незбережені в архіві зміни чернетки буде замінено.')){state[r.type==='event'?'event':'travel']=structuredClone(r.data);state.profile=structuredClone(r.profile);state.travel.endTarget??=state.travel.startFuel;state.travel.adjustmentKm??=0;save();go(r.type)}return}
 switch(a){
  case 'back':back();break;
  case 'open-signer':go('signer');break;
  case 'contacts-clinics':case 'contacts-representatives':contactKind=a.slice(9);go('contacts');break;
  case 'add-contact':contactForm[contactKind]=true;render();document.querySelector(`[data-directory="${contactKind}"]`)?.focus();break;
  case 'manage-contacts':contactKind='clinics';go('contacts');break;
  case 'remember-clinic':rememberContact('clinics');break;
  case 'remember-representative':rememberContact('representatives');break;
  case 'save-clinics':case 'save-representatives':saveContact(a.slice(5));break;
  case 'cancel-clinics':case 'cancel-representatives':{const k=a.slice(7);contactDrafts[k]=emptyContact(k);contactForm[k]=false;render();break}
  case 'preset-seat':case 'preset-vw':{if(!confirm('Завантажити норму, початковий залишок та одометр з Excel? Поточні значення цих полів буде замінено.'))break;const seat=a==='preset-seat';Object.assign(state.travel,{rate:seat?10:9,startFuel:seat?20:25,endTarget:seat?20:25,odometer:seat?12675.7:80238,car:seat?'SEAT':'VW',adjustmentKm:0,basis:seat?'seat · вересень 2026 · D21/F21/G21':'vw · жовтень 2024 · D53/F53/G53'});save();render();break}
  case 'next-period':{const err=travelErrors();if(err){toast(err);break}if(!confirm('Зберегти поточний звіт і почати наступний місяць із його кінцевим залишком та одометром?'))break;const result=travelCalc(state.travel);storeReport('travel');if(!storageOK)break;const next=new Date(state.travel.to+'T12:00:00Z');next.setUTCDate(1);next.setUTCMonth(next.getUTCMonth()+1);const from=next.toISOString().slice(0,10);next.setUTCMonth(next.getUTCMonth()+1);next.setUTCDate(0);Object.assign(state.travel,{liters:0,startFuel:result.endFuel,endTarget:result.endFuel,odometer:result.endOdo,adjustmentKm:0,from,to:next.toISOString().slice(0,10),basis:'попередній збережений звіт',rows:[{date:from,route:'',km:0}]});save();render();break}
  case 'new-event':if(confirm('Створити нову подію? Поточна чернетка буде замінена. Спочатку збережіть потрібний звіт.')){state.event=defaults().event;save();render()}break;
  case 'add-product':{const p=$('#new-product').value.trim();if(!p)return toast('Введіть назву препарату.');if(!state.products.includes(p))state.products.push(p);if(!state.event.products.includes(p))state.event.products.push(p);save();render();break}
  case 'add-item':state.event.items.push({name:'',qty:1,price:0});save();render();document.querySelector(`[data-item="${state.event.items.length-1}"]`)?.focus();break;
  case 'add-trip':{if(state.travel.rows.length>=5){toast('У бланку є 5 рядків завдань. Додаткові деталі можна внести в особливі відмітки.');break}const r=travelCalc(state.travel);if(r.rows)state.travel.rows=r.rows.map(({fuel,...row})=>row);state.travel.rows.push({date:state.travel.to,route:'',km:0});save();render();break}
  case 'split-trips':{const r=travelCalc(state.travel);if(r.total===undefined)return toast(r.error);state.travel.rows.forEach(row=>row.km=Math.floor(r.total/state.travel.rows.length*100)/100);save();render();break}
  case 'save-event':storeReport('event');break;
  case 'save-travel':storeReport('travel');break;
  case 'preview':preview(docType==='travel'?'order':docType);break;
  case 'travel-preview':preview('travel');break;
  case 'print':printDoc(docType);break;
  case 'print-both':printDoc('order',true);break;
  case 'print-travel':printDoc('travel');break;
  case 'backup':backup();break;
  case 'restore':$('#restore-file').click();break;
  case 'install':install();break}});
document.addEventListener('input',ev=>{const el=ev.target,ds=el.dataset;if(ds.directory){contactDrafts[ds.directory][ds.contactField]=el.value;return}if(el.id==='archive-search'){$('#archive-list').innerHTML=archiveList(el.value);return}if(ds.key){const [obj,key]=ds.key.split('.');state[obj][key]=el.type==='number'?Number(el.value):el.value;save();updateDerived()}if(ds.item!==undefined){state.event.items[+ds.item][ds.prop]=ds.prop==='name'?el.value:Number(el.value);save();updateDerived()}if(ds.trip!==undefined&&!el.readOnly){state.travel.rows[+ds.trip][ds.prop]=ds.prop==='km'?Number(el.value):el.value;save();updateDerived()}});
document.addEventListener('change',async ev=>{const picker=ev.target.dataset.contactPicker;if(picker){const target=ev.target.dataset.target||'event';if(ev.target.value)applyContact(state,picker,ev.target.value,target);else delete state[target][picker==='clinics'?'clinicId':'representativeId'];save();render();return}if(ev.target.id!=='restore-file')return;try{const f=ev.target.files[0];if(!f)return;if(f.size>5000000)throw Error('Файл завеликий.');const incoming=JSON.parse(await f.text());if(!validBackup(incoming))throw Error('Невірний формат резервної копії.');if(confirm('Замінити всі поточні дані даними з резервної копії?')){state=migrateDirectories(incoming);state.travel.endTarget??=state.travel.startFuel;state.travel.adjustmentKm??=0;save();render();toast('Дані відновлено.')}}catch(e){toast('Не вдалося відновити: '+e.message)}});
$('#close-preview').onclick=()=>$('#preview-dialog').close();$('#dialog-print').onclick=()=>printDoc(docType);
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e});if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>toast('Офлайн-режим недоступний у цьому браузері.'));
history.replaceState({view},'');render();if(!storageOK)toast('Локальне збереження недоступне. Робіть резервні копії.');
