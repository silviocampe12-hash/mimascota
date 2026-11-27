// No modifica el router ni la sesión. Conserva el botón de salida original.
const nav=document.querySelector('.mimo-nav');
if(nav){
 const panels=[...nav.querySelectorAll('[data-panel]')], triggers=[...nav.querySelectorAll('[data-menu]')];
 let opened=null;
 const close=(focus=false)=>{const prev=opened;opened=null;panels.forEach(p=>p.hidden=true);triggers.forEach(b=>b.setAttribute('aria-expanded','false'));if(focus&&prev)prev.focus();};
 triggers.forEach(b=>b.addEventListener('click',()=>{const same=opened===b;close();if(same)return;const panel=panels.find(p=>p.dataset.panel===b.dataset.menu);if(!panel)return;opened=b;panel.hidden=false;b.setAttribute('aria-expanded','true');panel.querySelector('a,button:not(.mimo-close)')?.focus();}));
 nav.addEventListener('click',e=>{if(e.target.closest('.mimo-close'))close(true);else if(e.target.closest('a'))close();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&opened)close(true);});
 document.addEventListener('pointerdown',e=>{if(opened&&!nav.contains(e.target))close();});
 function current(){const route=location.hash.slice(1),page=location.pathname.split('/').pop(),view=new URLSearchParams(location.search).get('vista');const urgencia=(page===''||page==='index.html')&&route==='urgencias';let group=urgencia?'urgencias':page==='invitaciones.html'?'ayudar':page==='social-v13.html'?(view==='eventos'?'explorar':view==='privacidad'?'perfil':'comunidad'):['ayuda','perdidos','rescatistas'].includes(route)?'ayudar':['mapa','catalogo','tienda','biblioteca','profesionales'].includes(route)?'explorar':['persona','mascota','admin',''].includes(route)?'perfil':'comunidad';triggers.forEach(b=>b.dataset.current=String(b.dataset.menu===group));const sos=nav.querySelector('.mimo-urgencias');if(urgencia)sos?.setAttribute('aria-current','page');else sos?.removeAttribute('aria-current');}
 function visibility(){document.body.classList.toggle('mimo-menu-activo',!nav.hidden);if(nav.hidden)close();}
 if(!nav.classList.contains('dock')){const old=document.getElementById('salir');const update=()=>{nav.hidden=!!old?.hidden;visibility();};if(old){new MutationObserver(update).observe(old,{attributes:true,attributeFilter:['hidden']});nav.querySelector('[data-salir]')?.addEventListener('click',()=>old.click());update();}}
 new MutationObserver(visibility).observe(nav,{attributes:true,attributeFilter:['hidden']});visibility();current();window.addEventListener('hashchange',()=>{close();current();});window.addEventListener('popstate',current);window.addEventListener('mimo-navegacion',current);
}
