import {sb,resultado} from './supabase.js?v=11';
import {h} from './seguridad.js?v=15';
import {almacen,fijarCuenta} from './almacenamiento.js?v=15';
import {prepararNube} from './nube.js?v=15';
import {sincronizarFotoPublica} from './social-publico.js?v=16';
const privacidadRpc=(accion,datos={})=>resultado(sb.rpc('mimo_v16',{accion,datos}));
const root=document.getElementById('root'),status=document.getElementById('status'),logout=document.getElementById('salir');
const rpc=(accion,datos={})=>resultado(sb.rpc('mimo_v13',{accion,datos}));
const tabs=['eventos','mensajes','privacidad','buscar'];let tab=new URLSearchParams(location.search).get('vista');if(!tabs.includes(tab))tab='eventos';
let user,profile,admin=false,active=null,folder='chats',poll=null,generation=0,busy=null,evQuery='',personQuery='',map=null,chatSig='',lastActivity=0;
const notice=(s='',error=false)=>{status.textContent=s;status.className=error?'error':''};
const note=s=>h('p',{class:'muted'},s),card=(...c)=>h('section',{class:'card'},...c),row=(...c)=>h('div',{class:'row'},...c);
const button=(t,fn,cls='')=>h('button',{type:'button',class:cls,onclick:async e=>{const b=e.currentTarget;b.disabled=true;try{await fn();}catch(err){notice(err.message,true);}finally{b.disabled=false;}}},t);
const field=(n,t,v='',opts={})=>h('label',{},t,h('input',{name:n,value:v,...opts}));
const area=(n,t,v='',opts={})=>h('label',{},t,h('textarea',{name:n,rows:3,...opts},v));
const select=(n,t,options,v)=>h('label',{},t,h('select',{name:n,required:true},options.map(([k,l])=>h('option',{value:k,selected:k===v},l))));
const check=(n,t,v)=>h('label',{class:'check'},h('input',{name:n,type:'checkbox',checked:!!v}),t);
const form=(t,fn,...children)=>h('form',{onsubmit:async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('button[type=submit]');b.disabled=true;try{await fn(new FormData(f),f);}catch(err){notice(err.message,true);}finally{b.disabled=false;}}},...children,h('button',{type:'submit',class:'primary'},t));
const date=x=>new Date(x).toLocaleString('es-AR',{dateStyle:'medium',timeStyle:'short'});
const relative=x=>{let s=Math.max(0,Math.floor((Date.now()-Date.parse(x))/1000));if(s<60)return 'hace instantes';if(s<3600)return `hace ${Math.floor(s/60)} min`;if(s<86400)return `hace ${Math.floor(s/3600)} h`;return `hace ${Math.floor(s/86400)} d`;};
const presence=x=>!x?'':Date.now()-Date.parse(x)<90000?'En línea (mensajes)':'Última actividad '+relative(x);
function stop(){generation++;clearInterval(poll);poll=null;map?.remove();map=null;chatSig='';}
function go(t){if(!tabs.includes(t))return;tab=t;active=null;const u=new URL(location.href);u.searchParams.set('vista',t);history.replaceState(null,'',u);window.dispatchEvent(new Event('mimo-navegacion'));render();}
for(const b of document.querySelectorAll('[data-tab]'))b.addEventListener('click',()=>go(b.dataset.tab));
logout.addEventListener('click',async()=>{stop();await sb.auth.signOut({scope:'local'});location.replace('./');});
async function boot(){if(!sb)throw Error('No se pudo cargar Supabase.');const {session}=await resultado(sb.auth.getSession());if(!session){root.replaceChildren(card(h('h1',{},'Ingresá a Mimo'),note('Necesitás iniciar sesión con tu cuenta.'),h('a',{href:'./',class:'action'},'Iniciar sesión')));notice();return;}const x=await resultado(sb.auth.getUser());user=x.user;if(!user)throw Error('Sesión no válida');fijarCuenta(user.id);await prepararNube({importar:false});await sincronizarFotoPublica().catch(e=>console.warn('Miniatura pública no sincronizada',e));logout.hidden=false;const r=await resultado(sb.from('permisos').select('rol').eq('usuario_id',user.id).maybeSingle());admin=['administrador','superadministrador'].includes(r?.rol);profile=await rpc('mi_perfil');sb.auth.onAuthStateChange((event,s)=>{if(event==='SIGNED_OUT'||(s?.user?.id&&s.user.id!==user.id)){stop();location.replace('./');}});await render();}
async function render(){stop();const g=generation;notice();document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===tab)));if(tab==='privacidad'){privacy();if(profile?.id)await privacyExtras(g);return;}if(!profile?.id&&tab!=='buscar'){privacy();return;}if(tab==='eventos'){await events(g);return;}if(tab==='buscar'){await searchProfiles(g);return;}await messages(g);}
function privacy(){const first=!profile?.id;root.replaceChildren(card(h('h1',{},first?'Activá tu perfil social':'Privacidad y perfil social'),note('El nombre que elijas aparecerá ante otros usuarios. No se publica tu correo, domicilio ni datos privados del perfil personal.'),form('Guardar configuración',async d=>{await rpc('guardar_perfil',{nombre:d.get('nombre'),modo:d.get('modo'),leidos:d.has('leidos'),presencia:d.has('presencia')});profile=await rpc('mi_perfil');notice('Configuración guardada');if(first){if(tab==='privacidad')tab='mensajes';const u=new URL(location.href);u.searchParams.set('vista',tab);history.replaceState(null,'',u);window.dispatchEvent(new Event('mimo-navegacion'));await render();}},field('nombre','Nombre visible',profile?.nombre||'',{required:true,maxlength:80}),select('modo','Quién puede enviarte mensajes',[['todos','Todos · mensajes directos'],['seguidos','Personas que sigo · otros en Solicitudes'],['nadie','Nadie']],profile?.modo||'seguidos'),check('leidos','Mostrar confirmaciones de lectura (recíprocas)',profile?.leidos??true),check('presencia','Mostrar en línea y última actividad (recíproco)',profile?.presencia??false),note('Las solicitudes no muestran confirmaciones. Una conversación aceptada permanece directa hasta que la bloquees o selecciones Nadie. El estado en línea refleja únicamente actividad en Mensajes.'))),card(h('h2',{},'Seguidores y bloqueos'),note('Las relaciones de esta sección se guardan en Supabase. Los seguidores del prototipo local de Comunidad no se importan.'),button('Buscar personas y mascotas',()=>go('buscar'))));}

// Búsqueda pública: nombres de personas y mascotas proyectados desde su perfil real.
let searchQuery='',searchFilter='todos';
const normalizeName=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const miniAvatar=p=>p.foto&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(p.foto)?
  h('img',{class:'search-avatar',src:p.foto,alt:'Foto de perfil',loading:'lazy'}):
  h('span',{class:'search-avatar','aria-hidden':'true'},(p.nombre||'?').slice(0,1).toUpperCase());

async function privacyExtras(g){
  const [estado,pendientes,bloqueados]=await Promise.all([
    privacidadRpc('mi_estado'),privacidadRpc('solicitudes'),privacidadRpc('bloqueados')
  ]);
  if(g!==generation||tab!=='privacidad'||!estado)return;
  root.append(card(
    h('h2',{},'Visibilidad de mi perfil'),
    note(estado.privado?
      'Perfil privado: en la búsqueda aparecen tu nombre y foto. Tus mascotas y el resto de tu perfil solo se ven si aceptás el seguimiento.':
      'Perfil público: tu nombre y las mascotas registradas aparecen en las búsquedas automáticamente, sin casillas ni autorizaciones. Tus datos personales privados y fichas de salud nunca se publican.'),
    button(estado.privado?'Cambiar a perfil público':'Cambiar a perfil privado',async()=>{
      await privacidadRpc('guardar_privacidad',{privado:!estado.privado});
      await render();
    },'primary')
  ),card(h('h2',{},'Solicitudes para seguirme'),
    pendientes.length?pendientes.map(p=>row(miniAvatar(p),h('strong',{},p.nombre),
      button('Aceptar',async()=>{await privacidadRpc('aceptar',{persona:p.id});await render();},'primary'),
      button('Rechazar',async()=>{await privacidadRpc('rechazar',{persona:p.id});await render();})
    )):note('No tenés solicitudes pendientes.')
  ),card(h('h2',{},'Usuarios bloqueados'),
    bloqueados.length?bloqueados.map(p=>row(h('strong',{},p.nombre),
      button('Desbloquear',async()=>{await privacidadRpc('desbloquear',{persona:p.id});await render();})
    )):note('No hay usuarios bloqueados.')
  ));
}
async function contactPerson(p){
  const list=await rpc('chats');
  const c=list.find(x=>x.persona===p.id);
  tab='mensajes';folder=c?.estado==='solicitud'?'solicitudes':'chats';
  active=c?{id:c.id}:{new:true,persona:p.id,nombre:p.nombre};
  const u=new URL(location.href);u.searchParams.set('vista',tab);history.replaceState(null,'',u);
  window.dispatchEvent(new Event('mimo-navegacion'));
  await render();
}
function profileActions(p){
  if(p.id===user.id)return note('Tu perfil');
  if(p.privado&&!p.seguido)return row(
    p.pendiente?note('Solicitud pendiente'):button('Solicitar seguimiento',async()=>{
      await privacidadRpc('seguir',{persona:p.id});await render();
    },'primary'),
    p.pendiente?button('Cancelar solicitud',async()=>{
      await privacidadRpc('dejar',{persona:p.id});await render();
    }):null,
    button('Bloquear',async()=>{if(confirm('¿Bloquear este perfil?')){
      await privacidadRpc('bloquear',{persona:p.id});await render();
    }},'danger')
  );
  return row(
    button(p.seguido?'Dejar de seguir':'Seguir',async()=>{
      await privacidadRpc(p.seguido?'dejar':'seguir',{persona:p.id});await render();
    }),
    profile?.id?button('Mensaje',()=>contactPerson(p),'primary'):null,
    button('Bloquear',async()=>{if(confirm('¿Bloquear este perfil?')){
      await privacidadRpc('bloquear',{persona:p.id});await render();
    }},'danger')
  );
}
function profileCard(p,pet=null){
  const restringido=p.privado&&!p.seguido&&p.id!==user.id;
  return card(
    row(miniAvatar(p),h('div',{},
      h('span',{class:'pill'},restringido?'Perfil privado':pet?'Mascota':'Persona'),
      h('h2',{},restringido?p.nombre:pet?pet.nombre:p.nombre),
      !restringido&&pet?note(pet.especie+' · Responsable: '+p.nombre):
      note(restringido?'Contenido disponible cuando acepten tu seguimiento':'Perfil social de Mimos')
    )),
    restringido?null:h('details',{},h('summary',{},'Ver perfil'),
      h('p',{},'Nombre visible: '+p.nombre),
      p.mascotas.length?h('div',{},h('strong',{},'Mascotas'),
        ...p.mascotas.map(m=>h('p',{},m.nombre+' · '+m.especie))
      ):note('Sin mascotas registradas.')),
    profileActions(p)
  );
}
async function searchProfiles(g){
  const results=h('div',{class:'grid',id:'search-results'});
  const qField=field('q','Nombre de persona o mascota',searchQuery,{
    type:'search',maxlength:80,placeholder:'Ej. Mora o María'
  });
  const filter=row(...[['todos','Todos'],['personas','Personas'],['mascotas','Mascotas']]
    .map(([k,t])=>button(t,()=>{searchFilter=k;return render();},searchFilter===k?'primary':'')));
  root.replaceChildren(
    h('h1',{},'Buscar personas y mascotas'),
    note('Los perfiles públicos aparecen automáticamente. Los perfiles privados solo muestran su foto y nombre hasta que acepten el seguimiento.'),
    card(form('Buscar',async d=>{searchQuery=String(d.get('q')||'').trim();await render();},qField),
      button('Mostrar todos',async()=>{searchQuery='';await render();}),filter),
    results
  );
  try{
    results.replaceChildren(note('Buscando perfiles…'));
    const people=await privacidadRpc('buscar',{q:searchQuery});
    if(g!==generation)return;
    const q=normalizeName(searchQuery),cards=[];
    for(const p of people){
      if(searchFilter!=='mascotas'&&(p.coincide_persona||!q))cards.push(profileCard(p));
      if(searchFilter!=='personas'&&(!p.privado||p.seguido||p.id===user.id)){
        for(const pet of p.mascotas)
          if(!q||normalizeName(pet.nombre).includes(q))cards.push(profileCard(p,pet));
      }
    }
    results.replaceChildren(...(cards.length?cards:[note('No encontramos perfiles con ese nombre.')]));
  }catch(e){if(g===generation)results.replaceChildren(note('No se pudo buscar: '+e.message));}
}

const cats=['Adopción','Castración','Vacunación','Encuentro','Solidario','Educación','Otro'];
function localInput(x){if(!x)return '';const d=new Date(x);return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);}
function mapUrl(e){const q=e.lat!=null&&e.lng!=null?`${e.lat},${e.lng}`:[e.lugar,e.ciudad,e.provincia,e.pais].join(', ');return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(q);}
function validImage(s){return typeof s==='string'&&s.length<=220000&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(s);}
async function compress(file){if(!file||!file.size)return '';if(file.size>12*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Elegí JPG, PNG o WebP de hasta 12 MB');const b=await createImageBitmap(file);try{const c=document.createElement('canvas');for(const max of [1000,800,640,480]){const ratio=Math.min(1,max/Math.max(b.width,b.height));c.width=Math.max(1,Math.round(b.width*ratio));c.height=Math.max(1,Math.round(b.height*ratio));const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(b,0,0,c.width,c.height);for(const quality of [.78,.60,.42]){const url=c.toDataURL('image/jpeg',quality);if(validImage(url))return url;}}throw Error('No se pudo reducir la imagen');}finally{b.close();}}
async function events(g){root.replaceChildren(h('div',{class:'row spread'},h('h1',{},'Eventos'),button('＋ Crear evento',()=>eventForm(),'primary')),form('Buscar',async d=>{evQuery=String(d.get('q'));await render();},field('q','Buscar título, ciudad o categoría',evQuery,{type:'search',maxlength:100})),note('Castraciones, encuentros, adopciones y actividades de la comunidad. Datos publicados por sus organizadores.'),h('div',{id:'eventlist',class:'grid'},'Cargando…'));try{const list=await rpc('eventos',{q:evQuery});if(g!==generation)return;const el=document.getElementById('eventlist');el.replaceChildren(...(list.length?list.map(eventCard):[note('No hay eventos para mostrar.')]));}catch(e){if(g===generation)notice(e.message,true);}}
function eventCard(e){const ended=Date.parse(e.fin)<Date.now();return h('article',{class:'card'+(e.cancelado?' cancelled':'')},validImage(e.imagen)?h('img',{class:'eventimg',src:e.imagen,alt:'Imagen del evento',loading:'lazy'}):h('div',{class:'eventimg eventplaceholder','aria-hidden':'true'},'🐾'),row(h('span',{class:'pill'},e.categoria),e.cancelado?h('span',{class:'pill'},'Cancelado'):ended?h('span',{class:'pill'},'Finalizado'):null),h('h2',{},e.titulo),note('Por '+e.organizador),h('p',{},'📅 '+date(e.inicio)+' — '+date(e.fin)),h('p',{},'📍 '+[e.lugar,e.ciudad,e.provincia,e.pais].join(' · ')),h('a',{href:mapUrl(e),target:'_blank',rel:'noopener noreferrer',class:'action'},'Ver ubicación'),h('p',{},e.descripcion),e.requisitos?h('p',{},'Requisitos: '+e.requisitos):null,e.costo?h('p',{},'Costo: '+e.costo):null,note(`${e.asistentes} asistirán · ${e.interesados} interesados`),!e.cancelado&&!ended?row(...[['voy','Voy'],['interesa','Me interesa'],['ninguno','Quitar respuesta']].map(([s,t])=>button((e.mi_asistencia===s?'✓ ':'')+t,async()=>{await rpc('asistencia',{id:e.id,estado:s});await render();},e.mi_asistencia===s?'primary':''))):null,(e.autor===user.id||admin)&&!e.cancelado?row(e.autor===user.id&&!ended?button('Editar',()=>eventForm(e)):null,button('Cancelar evento',async()=>{if(confirm('¿Cancelar el evento para todos?')){await rpc('cancelar_evento',{id:e.id});await render();}},'danger')):null);}
function eventForm(e={}){stop();let point=e.lat!=null?{lat:Number(e.lat),lng:Number(e.lng)}:null,chosen=e.imagen||'';const mapEl=h('div',{class:'map'}),pos=note(point?`${point.lat}, ${point.lng}`:'Sin punto marcado; se usará la dirección.'),preview=h('div',{},validImage(chosen)?h('img',{class:'eventimg',src:chosen,alt:'Imagen actual'}):null),file=h('input',{type:'file',accept:'image/jpeg,image/png,image/webp'});let marker;
file.addEventListener('change',async()=>{try{if(file.files[0]){chosen=await compress(file.files[0]);preview.replaceChildren(h('img',{class:'eventimg',src:chosen,alt:'Vista previa'}));}}catch(err){notice(err.message,true);file.value='';}});
const setPoint=(lat,lng)=>{point={lat:Number(lat.toFixed(6)),lng:Number(lng.toFixed(6))};pos.textContent=`${point.lat}, ${point.lng}`;if(map){marker?.remove();marker=L.marker([point.lat,point.lng]).addTo(map);}};
root.replaceChildren(card(row(h('h1',{},e.id?'Editar evento':'Crear evento'),button('Volver',()=>render())),form('Guardar evento',async d=>{if(file.files[0])chosen=await compress(file.files[0]);const start=new Date(d.get('inicio')),end=new Date(d.get('fin'));if(!(end>start))throw Error('El final debe ser posterior al inicio');await rpc('guardar_evento',{...Object.fromEntries(d),id:e.id||null,inicio:start.toISOString(),fin:end.toISOString(),lat:point?.lat??null,lng:point?.lng??null,imagen:chosen});await render();},field('titulo','Título',e.titulo||'',{required:true,maxlength:100}),select('categoria','Categoría',cats.map(x=>[x,x]),e.categoria||cats[0]),area('descripcion','Descripción',e.descripcion||'',{required:true,maxlength:2000}),h('div',{class:'grid'},field('inicio','Inicio',localInput(e.inicio),{type:'datetime-local',required:true}),field('fin','Final',localInput(e.fin),{type:'datetime-local',required:true})),note('Las fechas se interpretan en la zona horaria de este dispositivo.'),h('div',{class:'grid'},field('pais','País',e.pais||'Argentina',{required:true,maxlength:80}),field('provincia','Provincia',e.provincia||'',{required:true,maxlength:100}),field('ciudad','Localidad',e.ciudad||'',{required:true,maxlength:100})),field('lugar','Lugar / dirección pública',e.lugar||'',{required:true,maxlength:180}),note('Marcá opcionalmente el lugar en el mapa. No publiques domicilios privados ni ubicaciones sensibles.'),mapEl,pos,button('Quitar punto',()=>{point=null;marker?.remove();pos.textContent='Sin punto marcado';}),field('costo','Costo / gratuito',e.costo||'',{maxlength:100}),area('requisitos','Requisitos, inscripción, qué llevar',e.requisitos||'',{maxlength:1000}),h('label',{},'Imagen de portada',file),preview,button('Quitar imagen',()=>{chosen='';file.value='';preview.replaceChildren();}))));if(globalThis.L){map=L.map(mapEl).setView(point?[point.lat,point.lng]:[-32,-64],point?15:5);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:19}).addTo(map);if(point)setPoint(point.lat,point.lng);map.on('click',x=>setPoint(x.latlng.lat,x.latlng.lng));}else mapEl.replaceChildren(note('Mapa no disponible. Podés guardar la dirección igualmente.'));}
async function messages(g){root.replaceChildren(h('h1',{},'Mensajes'),h('div',{class:'chatlayout'+(active?' open':''),id:'layout'},h('aside',{class:'chat-sidebar card'},row(button('Chats',()=>{folder='chats';active=null;render();},folder==='chats'?'primary':''),button('Solicitudes',()=>{folder='solicitudes';active=null;render();},folder==='solicitudes'?'primary':''),button('Personas',()=>{folder='personas';active=null;render();},folder==='personas'?'primary':'')),h('div',{id:'chatlist',class:'chatlist'},'Cargando…'),folder==='personas'?form('Buscar',async d=>{personQuery=String(d.get('q'));await render();},field('q','Buscar personas',personQuery,{type:'search',maxlength:80})):null),h('section',{class:'chatpanel card',id:'chatpanel'},note('Elegí una conversación o buscá a alguien.'))));if(active?.new)showNew(active);try{await refresh(g);}catch(e){if(g===generation)notice(e.message,true);}if(g===generation)poll=setInterval(()=>{if(!document.hidden)refresh(g).catch(e=>{if(g===generation)notice(e.message,true);});},5000);}
async function refresh(g){if(busy===g||g!==generation||document.hidden)return;busy=g;try{if(Date.now()-lastActivity>4500){await rpc('actividad');lastActivity=Date.now();}const list=await rpc('chats');if(g!==generation)return;const el=document.getElementById('chatlist');if(!el)return;const requests=list.filter(c=>c.estado==='solicitud'&&c.iniciador!==user.id).length;const btns=document.querySelectorAll('.chat-sidebar>div.row button');if(btns[1])btns[1].textContent='Solicitudes'+(requests?` (${requests})`:'');if(folder==='personas'){const people=await privacidadRpc('buscar',{q:personQuery});if(g!==generation)return;el.replaceChildren(...(people.length?people.map(p=>personCard(p,list)):[note('No hay personas con ese nombre.')]));}else{const shown=list.filter(c=>folder==='solicitudes'?c.estado==='solicitud':c.estado==='aceptado');el.replaceChildren(...(shown.length?shown.map(c=>button(c.nombre+' · '+(c.estado==='solicitud'?(c.iniciador===user.id?'Enviada':'Nueva solicitud'):(c.pendientes?`${c.pendientes} nuevos`:'')),()=>openChat(c), 'chatentry'+(active?.id===c.id?' primary':''))):[note(folder==='solicitudes'?'Sin solicitudes.':'Todavía no hay conversaciones.')]));for(let i=0;i<shown.length;i++){const c=shown[i];el.children[i].append(h('small',{},c.ultimo||'Sin mensajes'));}}
if(active?.id){if(!list.some(c=>c.id===active.id)){active=null;document.getElementById('layout')?.classList.remove('open');document.getElementById('chatpanel')?.replaceChildren(note('Conversación no disponible.'));return;}const id=active.id,c=await rpc('abrir',{chat:id,visible:!document.hidden&&document.hasFocus()});if(g!==generation||active?.id!==id)return;showChat(c);}}finally{if(busy===g)busy=null;}}
function personCard(p,list){
  if(p.id===user.id)return h('div',{class:'person'},h('strong',{},p.nombre),note('Tu perfil'));
  const privado=p.privado&&!p.seguido;
  return h('div',{class:'person'},row(miniAvatar(p),h('strong',{},p.nombre),
    privado?note('Perfil privado'):null),
    row(
      button(p.seguido?'Dejar de seguir':p.pendiente?'Cancelar solicitud':privado?'Solicitar seguimiento':'Seguir',
        async()=>{await privacidadRpc(p.seguido||p.pendiente?'dejar':'seguir',{persona:p.id});await render();}),
      privado?null:button('Mensaje',()=>{
        const c=list.find(x=>x.persona===p.id);
        if(c)openChat(c);
        else{active={new:true,persona:p.id,nombre:p.nombre};document.getElementById('layout').classList.add('open');showNew(active);}
      },'primary'),
      button('Bloquear',async()=>{if(confirm('¿Bloquear a esta persona?')){
        await privacidadRpc('bloquear',{persona:p.id});active=null;await render();
      }},'danger')
    )
  );
}

function openChat(c){active={id:c.id};document.getElementById('layout')?.classList.add('open');chatSig='';document.getElementById('chatpanel')?.replaceChildren(note('Cargando conversación…'));render().catch(e=>notice(e.message,true));}
function back(){active=null;document.getElementById('layout')?.classList.remove('open');document.getElementById('chatpanel')?.replaceChildren(note('Elegí una conversación.'));}
function composer(person,after){const ta=h('textarea',{name:'texto',placeholder:'Escribí un mensaje…','aria-label':'Mensaje',maxlength:4000,required:true,rows:2});const f=h('form',{class:'compose',onsubmit:async e=>{e.preventDefault();const b=f.querySelector('button');b.disabled=true;try{const x=await rpc('enviar',{persona:person,texto:ta.value});ta.value='';await after(x);}catch(err){notice(err.message,true);}finally{b.disabled=false;}}},ta,h('button',{type:'submit',class:'primary'},'Enviar'));ta.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(!f.querySelector('button').disabled)f.requestSubmit();}});return f;}
function showNew(p){document.getElementById('chatpanel')?.replaceChildren(h('div',{class:'chathead'},row(button('‹ Volver',back),h('strong',{},p.nombre))),h('div',{class:'messages'},note('El primer mensaje puede llegar como solicitud según la privacidad del destinatario.')),composer(p.persona,async x=>{folder=x.estado==='solicitud'?'solicitudes':'chats';active={id:x.chat};await render();}));}
function bubble(m,c){const mine=m.emisor===user.id;let receipt='';if(mine&&c.estado==='aceptado'&&!m.solicitud&&!m.eliminado)receipt=m.leido?'✓✓ Leído '+relative(m.leido):m.recibido?'✓✓ Recibido':'✓ Enviado';return h('div',{class:'bubble'+(mine?' mine':'')},h('p',{},m.eliminado?'Mensaje eliminado':m.texto),h('div',{class:'meta'},h('time',{datetime:m.creado},date(m.creado)),receipt?h('span',{class:m.leido?'read':'',title:m.leido?date(m.leido):receipt,'data-read':m.leido||null},receipt):null),h('details',{},h('summary',{},'Opciones'),button('Eliminar para mí',async()=>{await rpc('eliminar_mio',{chat:c.id,mensaje:m.id});chatSig='';await refresh(generation);}),mine&&!m.eliminado?button('Eliminar para todos',async()=>{if(confirm('¿Eliminar el contenido para ambos?')){await rpc('eliminar_todos',{chat:c.id,mensaje:m.id});chatSig='';await refresh(generation);}},'danger'):null));}
function showChat(c){const panel=document.getElementById('chatpanel');if(!panel)return;const sig=JSON.stringify(c);const old=panel.querySelector('.messages');const same=panel.dataset.chat===c.id&&panel.dataset.estado===c.estado;const wasBottom=!old||old.scrollHeight-old.scrollTop-old.clientHeight<80;const oldTop=old?.scrollTop||0;const header=h('div',{class:'chathead'},row(button('‹ Volver',back),h('strong',{},c.nombre),button('Bloquear',async()=>{if(confirm('¿Bloquear a esta persona?')){await rpc('bloquear',{persona:c.persona});active=null;await render();}},'danger')),h('small',{class:'online'},presence(c.actividad)));const list=h('div',{class:'messages',role:'log','aria-label':'Conversación'},...c.mensajes.map(m=>bubble(m,c)));if(same&&old){panel.querySelector('.chathead')?.replaceWith(header);if(sig!==chatSig&&!old.querySelector('details[open]')){old.replaceWith(list);list.scrollTop=wasBottom?list.scrollHeight:oldTop;}else{for(const t of old.querySelectorAll('[data-read]'))t.textContent='✓✓ Leído '+relative(t.dataset.read);}if(!old.querySelector('details[open]'))chatSig=sig;return;}panel.dataset.chat=c.id;panel.dataset.estado=c.estado;panel.replaceChildren(header,list,c.estado==='solicitud'?h('div',{class:'notice'},c.iniciador===user.id?note('Solicitud enviada. Esperá a que la acepten.'):row(note('Solicitud de mensaje. No se envían confirmaciones de lectura.'),button('Aceptar',async()=>{await rpc('aceptar',{chat:c.id});folder='chats';await render();},'primary'),button('Rechazar',async()=>{await rpc('rechazar',{chat:c.id});active=null;await render();},'danger'))):composer(c.persona,async()=>{chatSig='';await refresh(generation);}));list.scrollTop=list.scrollHeight;chatSig=sig;}
window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&tab==='mensajes'&&profile?.id)refresh(generation).catch(e=>notice(e.message,true));});boot().catch(e=>notice('No se pudo conectar: '+e.message,true));
