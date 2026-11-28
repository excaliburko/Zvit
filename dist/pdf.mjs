// Друк у застосунку на iPhone: iOS ігнорує window.print() у режимі «На початковий екран».
// Тому сторінки документа малюються в зображення, складаються в PDF і віддаються системному меню «Поділитися»,
// де є «Друкувати».
let lib=null;
function loadLib(){return lib||(lib=new Promise((ok,fail)=>{if(window.html2canvas)return ok(window.html2canvas);const s=document.createElement('script');s.src='./vendor/html2canvas.min.js';s.onload=()=>ok(window.html2canvas);s.onerror=()=>{lib=null;fail(Error('Не вдалося завантажити модуль друку.'))};document.head.append(s)}))}
export const iosStandalone=()=>navigator.standalone===true&&navigator.maxTouchPoints>1;
const MM=25.4/96;
const svgCache=new Map();
async function svgToPng(img){if(!svgCache.has(img.src))svgCache.set(img.src,new Promise((ok,fail)=>{const im=new Image();im.onload=()=>{const w=2480,h=Math.round(w*(im.naturalHeight||1500)/(im.naturalWidth||1059)),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,w,h);x.drawImage(im,0,0,w,h);ok(c.toDataURL('image/png'))};im.onerror=()=>fail(Error('Не вдалося завантажити бланк.'));im.src=img.src}));const url=await svgCache.get(img.src);await new Promise(r=>{img.onload=img.onerror=r;img.src=url})}
async function pageImages(html){const h2c=await loadLib();const host=document.createElement('div');host.className='pdf-host';host.innerHTML=html;document.body.append(host);try{await Promise.all([...host.querySelectorAll('img')].map(i=>i.complete?0:new Promise(r=>{i.onload=i.onerror=r})));await Promise.all([...host.querySelectorAll('img')].filter(i=>/\.svg(\?|$)/.test(i.src)).map(svgToPng));if(document.fonts?.ready)await document.fonts.ready;const out=[];for(const el of host.querySelectorAll('.paper')){const w=el.offsetWidth,h=el.offsetHeight;const scale=Math.min(3,2480/w);const c=await h2c(el,{scale,backgroundColor:'#ffffff',logging:false,useCORS:true,ignoreElements:n=>n.parentElement===document.body&&n!==host});const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.92));out.push({jpg:new Uint8Array(await blob.arrayBuffer()),pw:c.width,ph:c.height,wmm:w*MM,hmm:h*MM})}return out}finally{host.remove()}}
function buildPdf(pages){const enc=new TextEncoder(),parts=[],offs=[];let len=0;const push=x=>{const b=typeof x==='string'?enc.encode(x):x;parts.push(b);len+=b.length};const obj=(n,body)=>{offs[n]=len;push(`${n} 0 obj\n`);body();push('\nendobj\n')};
 push('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');const n=pages.length,kids=pages.map((_,i)=>`${3+i*3} 0 R`).join(' ');
 obj(1,()=>push('<< /Type /Catalog /Pages 2 0 R >>'));obj(2,()=>push(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`));
 pages.forEach((p,i)=>{const pg=3+i*3,im=pg+1,ct=pg+2,W=(p.wmm*72/25.4).toFixed(2),H=(p.hmm*72/25.4).toFixed(2),cs=`q ${W} 0 0 ${H} 0 0 cm /Im0 Do Q`;
  obj(pg,()=>push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${ct} 0 R >>`));
  obj(im,()=>{push(`<< /Type /XObject /Subtype /Image /Width ${p.pw} /Height ${p.ph} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.jpg.length} >>\nstream\n`);push(p.jpg);push('\nendstream')});
  obj(ct,()=>push(`<< /Length ${cs.length} >>\nstream\n${cs}\nendstream`))});
 const total=2+n*3,xref=len;push(`xref\n0 ${total+1}\n0000000000 65535 f \n`+Array.from({length:total},(_,i)=>String(offs[i+1]).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size ${total+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`);
 return new Blob(parts,{type:'application/pdf'})}
const cache=new Map();
export function preparePdf(html){if(!cache.has(html)){const p=pageImages(html).then(buildPdf);p.catch(()=>cache.delete(html));cache.clear();cache.set(html,p)}return cache.get(html)}
export async function sharePdf(blob,name){const file=new File([blob],name+'.pdf',{type:'application/pdf'});if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:name});return true}const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=file.name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);return true}
