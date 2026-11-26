// Feed local: los archivos nuevos viven en IndexedDB y las publicaciones en localStorage.
import { h } from './seguridad.js';
import { avatar, huella } from './mascota.js';
import { POSTS } from './datos.js';
import { nuevoId } from './mascotas.js';
import { validarArchivo, guardarArchivo, leerArchivo, borrarArchivo } from './multimedia.js';
const KEY='mimo_comunidad_v1', formatos=['Texto','Fotos','Video','Reel'];
const temas=['Momentos','Consultas','Experiencias','Rescates','Adopciones','Alertas','Educación','Eventos','Solidarias'];
const filtros=['Todo','Siguiendo','Reels','Guardados','Mis publicaciones'];
const lista=x=>Array.isArray(x)?x:[];
const leer=(k,def)=>{try{return JSON.parse(localStorage.getItem(k))??def;}catch{return def;}};
const texto=(x,n=2000)=>String(x??'').trim().slice(0,n);
const fecha=x=>{const d=new Date(x);return Number.isFinite(+d)?d.toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'}):'Sin fecha';};
const btn=(label,fn,props={})=>h('button',{type:'button',class:'social-accion',onclick:fn,...props},label);
const fila=(...c)=>h('div',{class:'social-fila'},...c);
const nota=t=>h('p',{class:'suave'},t);
const card=(...c)=>h('article',{class:'social-card'},...c);
const option=(v,sel)=>h('option',{value:v,selected:v===sel},v==="Texto"?"Publicacion":v);
const select=(name,values,selected)=>h('select',{name},values.map(v=>option(v,selected)));
const label=(t,el)=>h('label',{class:'mimo-campo'},t,el);
const inicial=()=>({posts:[],likes:[],guardados:[],siguiendo:[],ocultos:[],comentarios:[],denuncias:[]});
export function cargarComunidad(){
  const raw=localStorage.getItem(KEY);if(raw===null)return inicial();
  const d=JSON.parse(raw);if(!d||!Object.keys(inicial()).every(k=>Array.isArray(d[k])))throw Error('Datos de Comunidad inválidos.');return d;
}
// Las publicaciones de otros módulos se proyectan sin copiar la historia clínica ni la galería privada.
export function fuentes(){
  const perfil=leer('mimo_ayuda_v1',{})?.persona||{};
  const mascotas=lista(leer('mimo_mascotas',[]));
  const nombre=texto(perfil.nombre,80)||'Mi perfil';
  const roles=lista(perfil.publicos).filter(x=>lista(perfil.roles).includes(x));
  const galeria=mascotas.flatMap(m=>lista(m.galeria).filter(a=>a.compartido===true).map(a=>({id:'gal:'+m.id+':'+a.id,autor:nombre,autorId:'local',roles,mascota:m.nombre,avatarPet:m,fecha:a.creadoEn,formato:a.tipo?.startsWith('video/')?'Video':'Fotos',tema:'Momentos',texto:a.descripcion||'',media:[{id:a.id,tipo:a.tipo}],origen:'galeria',propio:true,visibilidad:'Comunidad'})));
  const avisos=lista(leer('mimo_ayuda_v1',{})?.avisos).filter(a=>a.social===true&&a.estado==='Abierto').map(a=>({id:'aviso:'+a.id,autor:nombre,autorId:'local',roles,fecha:a.fecha,formato:a.fotoId?'Fotos':'Texto',tema:'Alertas',texto:`${a.tipo}: ${a.nombre} · ${a.especie}\nZona: ${a.zona}\n${a.detalle||''}`,media:a.fotoId?[{id:a.fotoId,tipo:'image/jpeg'}]:[],origen:'aviso',propio:true,visibilidad:'Comunidad'}));
  const demos=POSTS.map(p=>({id:'demo:'+p.id,autor:p.autor,autorId:'demo:'+p.id,mascota:p.autor,avatarPet:p,formato:'Texto',tema:'Momentos',texto:p.texto,media:[],demo:true,baseLikes:p.likes,visibilidad:'Comunidad'}));
  return {nombre,roles,mascotas,externos:[...galeria,...avisos,...demos]};
}
export function filtrarFeed(posts,estado,filtro,tema,q=''){
  const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return posts.filter(p=>!estado.ocultos.includes(p.id)&& (p.visibilidad==='Comunidad'||(p.propio&&filtro==='Mis publicaciones')) && (tema==='Todos'||p.tema===tema) && norm([p.autor,p.mascota,p.texto,p.tema].join(' ')).includes(norm(q)) && (filtro==='Todo'||filtro==='Siguiendo'&&estado.siguiendo.includes(p.autorId)||filtro==='Reels'&&p.formato==='Reel'||filtro==='Guardados'&&estado.guardados.includes(p.id)||filtro==='Mis publicaciones'&&p.propio)).sort((a,b)=>(Date.parse(b.fecha)||0)-(Date.parse(a.fecha)||0));
}
// La recodificación de imágenes no conserva el EXIF original. Los videos se guardan sin recodificar.
async function prepararFoto(file){
  validarArchivo(file,true);if(!file.type.startsWith('image/'))throw Error('Elegí una foto compatible.');
  const b=await createImageBitmap(file);try{const c=document.createElement('canvas'),s=Math.min(1,1800/Math.max(b.width,b.height));c.width=Math.max(1,Math.round(b.width*s));c.height=Math.max(1,Math.round(b.height*s));c.getContext('2d').drawImage(b,0,0,c.width,c.height);const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.88));if(!blob)throw Error('No se pudo convertir la foto.');return blob;}finally{b.close();}
}
function revisarVideo(file,reel){
  validarArchivo(file);if(!['video/mp4','video/webm','video/ogg'].includes(file.type))throw Error('Usá MP4, WebM u Ogg compatible con tu navegador.');
  return new Promise((resolve,reject)=>{const v=document.createElement('video'),u=URL.createObjectURL(file);let terminado=false;const fin=e=>{if(terminado)return;terminado=true;clearTimeout(timer);v.onloadedmetadata=v.onerror=null;v.removeAttribute('src');v.load();URL.revokeObjectURL(u);e?reject(e):resolve(file);};const timer=setTimeout(()=>fin(Error('No se pudo comprobar el video.')),10000);v.preload='metadata';v.onloadedmetadata=()=>fin(!Number.isFinite(v.duration)||v.duration<=0?Error('Video inválido.'):reel&&v.duration>90?Error('El reel debe durar hasta 90 segundos.'):null);v.onerror=()=>fin(Error('El navegador no reconoce este video.'));v.src=u;});
}
export function crearComunidad(render){
  let estado,fallo='',filtro='Todo',tema='Todos',q='',editId=null,comentando=null;
  try{estado=cargarComunidad();}catch(e){fallo=e.message;}
  const urls=new Set();
  const limpiar=()=>{for(const u of urls)URL.revokeObjectURL(u);urls.clear();};
  const guardar=next=>{localStorage.setItem(KEY,JSON.stringify(next));estado=next;};
  const cambiar=(k,v)=>guardar({...estado,[k]:v});
  const intentar=fn=>async(...args)=>{try{await fn(...args);}catch(e){alert(e.message||String(e));}};
  const toggle=(k,id)=>intentar(()=>{cambiar(k,estado[k].includes(id)?estado[k].filter(x=>x!==id):[...estado[k],id]);render();});
  function medio(m,reel){
    const box=h('div',{class:reel?'social-reel':'social-media'},nota('Cargando archivo…'));
    leerArchivo(m.id).then(blob=>{if(!box.isConnected)return;if(!blob){box.replaceChildren(nota('Archivo no disponible'));return;}const u=URL.createObjectURL(blob);urls.add(u);const el=m.tipo.startsWith('video/')?h('video',{src:u,controls:true,playsinline:true,preload:'metadata',loop:reel}):h('img',{src:u,alt:'Imagen de la publicación',loading:'lazy'});el.addEventListener('error',()=>box.replaceChildren(nota('No se pudo reproducir este archivo.')));box.replaceChildren(el);}).catch(()=>{if(box.isConnected)box.replaceChildren(nota('Archivo no disponible'));});return box;
  }
  function autor(p){
    const pet=p.avatarPet;const foto=pet?.fotoPrincipalId&&lista(pet.galeria).some(a=>a.id===pet.fotoPrincipalId&&a.compartido===true); // nunca expone la foto privada del perfil
    const img=foto?h('div',{class:'social-avatar'},medio({id:pet.fotoPrincipalId,tipo:'image/jpeg'},false)):pet&&['perro','gato'].includes(String(pet.tipo||pet.especie).toLowerCase())?avatar({...pet,tipo:String(pet.tipo||pet.especie).toLowerCase()},true):h('span',{class:'social-avatar social-inicial','aria-hidden':'true'},(p.autor||'M').slice(0,1).toUpperCase());
    return h('div',{class:'social-autor'},img,h('div',{},h('strong',{},p.autor),p.mascota&&p.mascota!==p.autor?h('p',{class:'social-mascota'},'Con '+p.mascota):null,nota(p.demo?'Perfil ficticio':`${fecha(p.fecha)} · ${p.visibilidad==='Privada'?'Solo yo':'Publicación local'}`),p.roles?.length?nota(p.roles.join(' · ')+' (autodeclarado)'):null),!p.propio?btn(estado.siguiendo.includes(p.autorId)?'Siguiendo':'Seguir',toggle('siguiendo',p.autorId),{'aria-pressed':String(estado.siguiendo.includes(p.autorId))}):null);
  }
  function editor(ctx){
    const p=estado.posts.find(x=>x.id===editId);const type=select('formato',formatos,p?.formato||'Texto');if(p)type.disabled=true;
    const archivo=h('input',{type:'file',name:'media',multiple:true,accept:'image/*'}),ayuda=nota('Hasta 4 fotos o 1 video de hasta 50 MB.');
    const mediaLabel=label('Archivos',archivo);const ajustar=()=>{const t=type.value;mediaLabel.hidden=t==='Texto'||!!p;archivo.multiple=t==='Fotos';archivo.accept=t==='Fotos'?'image/jpeg,image/png,image/webp,image/gif,image/avif':'video/mp4,video/webm,video/ogg';ayuda.textContent=t==='Reel'?'Video de hasta 90 segundos. Se recomienda formato vertical 9:16.':t==='Video'?'Un video de hasta 50 MB.':t==='Fotos'?'Hasta cuatro fotos de 15 MB cada una.':'Podés publicar solo texto.';};type.addEventListener('change',()=>{archivo.value='';ajustar();});ajustar();
    const mascotas=h('select',{name:'mascota'},h('option',{value:''},'Sin asociar mascota'),ctx.mascotas.map(m=>h('option',{value:m.id,selected:p?.mascotaId===m.id},m.nombre)));
    const vis=select('visibilidad',['Privada','Comunidad'],p?.visibilidad||'Privada');
    const f=h('form',{class:'social-editor',onsubmit:intentar(async e=>{e.preventDefault();const form=e.currentTarget,b=form.querySelector('button[type=submit]');b.disabled=true;const nuevos=[];let persistido=false;
      try{const d=new FormData(form),t=p?.formato||String(d.get('formato')),body=texto(d.get('texto')),files=[...archivo.files];if(!formatos.includes(t))throw Error('Formato inválido.');if(t==='Texto'&&!body)throw Error('Escribí algo.');if(!p&&t!=='Texto'&&(!files.length||files.length>(t==='Fotos'?4:1)))throw Error('Seleccioná los archivos correspondientes al formato.');if(d.get('visibilidad')==='Comunidad'&&!d.get('consentimiento'))throw Error('Confirmá que autorizás la publicación.');
      for(const file of p||t==='Texto'?[]:files){const blob=t==='Fotos'?await prepararFoto(file):await revisarVideo(file,t==='Reel');const id=nuevoId();await guardarArchivo(id,blob);nuevos.push({id,tipo:blob.type});}
      const m=ctx.mascotas.find(x=>x.id===d.get('mascota'));const post={id:p?.id||nuevoId(),autorId:'local',propio:true,mascotaId:m?.id||'',formato:t,tema:String(d.get('tema')),texto:body,media:p?.media||nuevos,fecha:p?.fecha||new Date().toISOString(),visibilidad:String(d.get('visibilidad')),comentarios:d.get('permitir')==='on'};
      cambiar('posts',p?estado.posts.map(x=>x.id===p.id?post:x):[post,...estado.posts]);persistido=true;editId=null;filtro=post.visibilidad==='Privada'?'Mis publicaciones':'Todo';tema='Todos';q='';render();
      }catch(err){if(!persistido)await Promise.allSettled(nuevos.map(x=>borrarArchivo(x.id)));throw err;}finally{b.disabled=false;}})},h('textarea',{name:'texto',rows:3,maxlength:2000,placeholder:'¿Qué querés compartir hoy?','aria-label':'Texto de la publicación'},p?.texto||''),h('div',{class:'social-form-grid'},label('Formato',type),label('Tema',select('tema',temas,p?.tema||'Momentos')),label('Mascota',mascotas),label('Visibilidad',vis)),mediaLabel,ayuda,h('label',{class:'social-check'},h('input',{type:'checkbox',name:'permitir',checked:p?.comentarios!==false}),' Permitir comentarios'),h('label',{class:'social-check'},h('input',{type:'checkbox',name:'consentimiento'}),' Autorizo compartir estos contenidos y no divulgar datos privados de terceros.'),nota('Las publicaciones solo se ven en este navegador. Los videos conservan sus metadatos originales.'),fila(h('button',{type:'submit',class:'btn'},p?'Guardar cambios':'Publicar'),p?btn('Cancelar edición',()=>{editId=null;render();}):null));
    return card(h('h2',{},p?'Editar publicación':'Crear publicación'),f);
  }
  function reportar(p){return intentar(()=>{const motivo=prompt('Motivo de la denuncia (no incluyas información privada):');if(!motivo?.trim())return;cambiar('denuncias',[...estado.denuncias,{id:nuevoId(),post:p.id,motivo:texto(motivo,500),fecha:new Date().toISOString()}]);alert('Denuncia guardada localmente. Aún no se envía a moderación.');});}
  function quitar(p){return intentar(async()=>{if(!confirm('¿Eliminar esta publicación y sus archivos locales?'))return;guardar({...estado,posts:estado.posts.filter(x=>x.id!==p.id),comentarios:estado.comentarios.filter(x=>x.post!==p.id),likes:estado.likes.filter(x=>x!==p.id),guardados:estado.guardados.filter(x=>x!==p.id)});render();await Promise.allSettled(p.media.map(x=>borrarArchivo(x.id)));});}
  function comentarios(p,ctx){
    const items=estado.comentarios.filter(x=>x.post===p.id);return h('div',{class:'social-comentarios'},items.map(c=>h('div',{class:'social-comentario'},h('strong',{},ctx.nombre),nota(fecha(c.fecha)),h('p',{},c.texto),btn('Eliminar comentario',intentar(()=>{cambiar('comentarios',estado.comentarios.filter(x=>x.id!==c.id));render();})))),p.comentarios===false?nota('Comentarios desactivados.'):h('form',{class:'social-comentar',onsubmit:intentar(e=>{e.preventDefault();const t=texto(new FormData(e.currentTarget).get('comentario'),500);if(!t)return;cambiar('comentarios',[...estado.comentarios,{id:nuevoId(),post:p.id,texto:t,fecha:new Date().toISOString()}]);render();})},h('input',{name:'comentario',placeholder:'Escribí un comentario…','aria-label':'Comentario',maxlength:500,required:true}),h('button',{type:'submit',class:'btn'},'Enviar')));
  }
  function publicacion(p,ctx){
    const liked=estado.likes.includes(p.id),saved=estado.guardados.includes(p.id),count=estado.comentarios.filter(x=>x.post===p.id).length;
    return card(autor(p),fila(h('span',{class:'social-etiqueta'},p.tema),h('span',{class:'social-etiqueta'},p.formato==="Texto"?"Publicacion":p.formato),p.visibilidad==='Privada'?h('span',{class:'social-etiqueta'},'Privada'):null),p.texto?h('p',{class:'social-texto'},p.texto):null,p.media.length?h('div',{class:p.formato==='Fotos'&&p.media.length>1?'social-fotos':'social-contenido'},p.media.map(m=>medio(m,p.formato==='Reel'))):null,p.origen?h('a',{href:p.origen==='galeria'?'#mascota':'#perdidos'},p.origen==='galeria'?'Gestionar desde Mi mascota':'Ver aviso en Perdidos'):null,h('div',{class:'social-interacciones'},h('button',{type:'button',class:'me-gusta','aria-pressed':String(liked),onclick:toggle('likes',p.id),'aria-label':'Dar o quitar huellita'},huella(p.avatarPet?.tipo||p.avatarPet?.especie||'perro'),String((p.baseLikes||0)+(liked?1:0))),btn(`Comentarios (${count})`,()=>{comentando=comentando===p.id?null:p.id;render();},{'aria-expanded':String(comentando===p.id)}),btn(saved?'Guardado':'Guardar',toggle('guardados',p.id),{'aria-pressed':String(saved)}),h('details',{class:'social-menu'},h('summary',{'aria-label':'Más opciones'},'···'),fila(p.propio&&!p.origen?btn('Editar',()=>{editId=p.id;render();document.querySelector('.social-editor')?.scrollIntoView({block:'center'});}):null,p.propio&&!p.origen?btn('Eliminar',quitar(p)):null,btn('Ocultar',toggle('ocultos',p.id)),btn('Denunciar',reportar(p))))),comentando===p.id?comentarios(p,ctx):null);
  }
  function vista(){
    if(fallo)return card(h('h1',{},'Comunidad'),nota('No se pudieron leer tus datos: '+fallo));
    const ctx=fuentes(), propios=estado.posts.map(p=>{const m=ctx.mascotas.find(x=>x.id===p.mascotaId);return {...p,autor:ctx.nombre,roles:ctx.roles,mascota:m?.nombre,avatarPet:m};});const posts=filtrarFeed([...propios,...ctx.externos],estado,filtro,tema,q);
    return h('section',{class:'social-feed'},h('header',{class:'social-cabecera'},h('h1',{},'Comunidad'),nota('Momentos, ideas y ayuda para todos los animales. Prototipo local.')),editor(ctx),h('nav',{class:'social-tabs','aria-label':'Filtros de Comunidad'},filtros.map(t=>btn(t,()=>{filtro=t;comentando=null;render();},{'aria-pressed':String(t===filtro)}))),h('div',{class:'social-busqueda'},h('form',{onsubmit:e=>{e.preventDefault();q=texto(new FormData(e.currentTarget).get('q'),100);render();}},h('input',{type:'search',name:'q',value:q,placeholder:'Buscar publicaciones','aria-label':'Buscar publicaciones'}),h('button',{class:'btn',type:'submit'},'Buscar')),label('Tema',h('select',{onchange:e=>{tema=e.target.value;render();}},['Todos',...temas].map(t=>option(t,tema))))),estado.ocultos.length?btn('Restaurar publicaciones ocultas',intentar(()=>{cambiar('ocultos',[]);render();})):null,posts.length?posts.map(p=>publicacion(p,ctx)):card(nota('No hay publicaciones para mostrar con estos filtros.')));
  }
  return {vista,limpiar};
}
