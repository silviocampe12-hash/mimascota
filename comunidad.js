// Feed local: los archivos nuevos viven en IndexedDB y las publicaciones en localStorage.
import { h } from './seguridad.js';
import { POSTS } from './datos.js';
import { avatar, huella, nuevoId } from './mascotas.js?v=8';
import { perfilVisible } from './usuario.js?v=9';
import { validarArchivo, guardarArchivo, leerArchivo, borrarArchivo } from './multimedia.js';
const KEY='mimo_comunidad_v1';
const filtros=['Todo','Siguiendo','Reels','Guardados','Mis publicaciones'];
const lista=x=>Array.isArray(x)?x:[];
const leer=(k,def)=>{try{return JSON.parse(localStorage.getItem(k))??def;}catch{return def;}};
const texto=(x,n=2000)=>String(x??'').trim().slice(0,n);
const fecha=x=>{const d=new Date(x);return Number.isFinite(+d)?d.toLocaleString('es-AR',{dateStyle:'short',timeStyle:'short'}):'Sin fecha';};
const btn=(label,fn,props={})=>h('button',{type:'button',class:'social-accion',onclick:fn,...props},label);
const fila=(...c)=>h('div',{class:'social-fila'},...c);
const nota=t=>h('p',{class:'suave'},t);
const card=(...c)=>h('article',{class:'social-card'},...c);
const option=(v,sel,t=v)=>h('option',{value:v,selected:v===sel},t);
const label=(t,el)=>h('label',{class:'mimo-campo'},t,el);
const inicial=()=>({posts:[],likes:[],guardados:[],siguiendo:[],ocultos:[],comentarios:[],denuncias:[]});
export function cargarComunidad(){
  const raw=localStorage.getItem(KEY);if(raw===null)return inicial();
  const d=JSON.parse(raw);if(!d||!Object.keys(inicial()).every(k=>Array.isArray(d[k])))throw Error('Datos de Comunidad inválidos.');return d;
}
// Las publicaciones de otros módulos se proyectan sin copiar la historia clínica ni la galería privada.
export function fuentes(){
  const perfil=perfilVisible();
  const mascotas=lista(leer('mimo_mascotas',[]));
  const nombre=texto(perfil.nombre,80)||'Mi perfil';
  const roles=perfil.roles;
  const galeria=mascotas.flatMap(m=>lista(m.galeria).filter(a=>a.compartido===true).map(a=>({id:'gal:'+m.id+':'+a.id,autor:nombre,autorId:'local',roles,fotoPersona:perfil.fotoId,mascota:m.nombre,avatarPet:m,fecha:a.creadoEn,formato:a.tipo?.startsWith('video/')?'Video':'Fotos',texto:a.descripcion||'',media:[{id:a.id,tipo:a.tipo}],origen:'galeria',propio:true,visibilidad:'Comunidad'})));
  const demos=POSTS.map(p=>({id:'demo:'+p.id,autor:p.autor,autorId:'demo:'+p.id,mascota:p.autor,avatarPet:p,formato:'Texto',texto:p.texto,media:[],demo:true,baseLikes:p.likes,visibilidad:'Comunidad'}));
  return {nombre,roles,mascotas,perfil,externos:[...galeria,...demos]};
}
export function filtrarFeed(posts,estado,filtro,q=''){
  const norm=x=>String(x??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return posts.filter(p=>!estado.ocultos.includes(p.id)&& (p.visibilidad==='Comunidad'||(p.propio&&filtro==='Mis publicaciones')) && norm([p.autor,p.mascota,p.texto].join(' ')).includes(norm(q)) && (filtro==='Todo'||filtro==='Siguiendo'&&estado.siguiendo.includes(p.autorId)||filtro==='Reels'&&p.formato==='Reel'||filtro==='Guardados'&&estado.guardados.includes(p.id)||filtro==='Mis publicaciones'&&p.propio)).sort((a,b)=>(Date.parse(b.fecha)||0)-(Date.parse(a.fecha)||0));
}
// La recodificación de imágenes no conserva el EXIF original. Los videos se guardan sin recodificar.
async function prepararFoto(file){
  validarArchivo(file,true);if(!file.type.startsWith('image/'))throw Error('Elegí una foto compatible.');
  const b=await createImageBitmap(file);try{const c=document.createElement('canvas'),s=Math.min(1,1800/Math.max(b.width,b.height));c.width=Math.max(1,Math.round(b.width*s));c.height=Math.max(1,Math.round(b.height*s));c.getContext('2d').drawImage(b,0,0,c.width,c.height);const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.88));if(!blob)throw Error('No se pudo convertir la foto.');return blob;}finally{b.close();}
}
// Detecta el formato a partir del archivo, no de una opción elegida por el usuario.
export function detectarFormato(files){
  if(!files.length)return 'Texto';
  if(files.every(f=>['image/jpeg','image/png','image/webp','image/gif','image/avif'].includes(f.type))){
    if(files.length>4)throw Error('Podés adjuntar hasta cuatro fotos.');
    for(const f of files)validarArchivo(f,true);
    return 'Fotos';
  }
  if(files.length===1&&['video/mp4','video/webm','video/ogg','video/quicktime'].includes(files[0].type)){
    validarArchivo(files[0]);return 'Video';
  }
  throw Error('Elegí hasta cuatro fotos o un solo video compatible, sin mezclarlos.');
}
export function formatoVideo(duracion,ancho,alto){
  if(!Number.isFinite(duracion)||duracion<=0||!ancho||!alto)throw Error('Video inválido.');
  return alto>ancho&&duracion<=90?'Reel':'Video';
}
function revisarVideo(file){
  validarArchivo(file);
  return new Promise((resolve,reject)=>{
    const v=document.createElement('video'),u=URL.createObjectURL(file);let terminado=false;
    const fin=(e,resultado)=>{if(terminado)return;terminado=true;clearTimeout(timer);v.onloadedmetadata=v.onerror=null;v.removeAttribute('src');v.load();URL.revokeObjectURL(u);e?reject(e):resolve(resultado);};
    const timer=setTimeout(()=>fin(Error('No se pudo comprobar el video.')),10000);
    v.preload='metadata';v.onloadedmetadata=()=>{try{fin(null,formatoVideo(v.duration,v.videoWidth,v.videoHeight));}catch(e){fin(e);}};
    v.onerror=()=>fin(Error('El navegador no puede abrir este video. Probá con MP4 o WebM.'));v.src=u;
  });
}
// Ícono propio, sin dependencias de fuentes ni imágenes externas.
function iconoCamara(){
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  for(const [k,v] of Object.entries({viewBox:'0 0 24 24',width:'25',height:'25',fill:'none',stroke:'currentColor','stroke-width':'1.8','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true'}))svg.setAttribute(k,v);
  const path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d','M4 6h4l2-3h4l2 3h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z');
  const circle=document.createElementNS('http://www.w3.org/2000/svg','circle');circle.setAttribute('cx','12');circle.setAttribute('cy','13');circle.setAttribute('r','4');svg.append(path,circle);return svg;
}
export function crearComunidad(render){
  let estado,fallo='',filtro='Todo',q='',editId=null,comentando=null;
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
    const img=p.fotoPersona?h('div',{class:'social-avatar'},medio({id:p.fotoPersona,tipo:'image/jpeg'},false)):foto?h('div',{class:'social-avatar'},medio({id:pet.fotoPrincipalId,tipo:'image/jpeg'},false)):pet&&['perro','gato'].includes(String(pet.tipo||pet.especie).toLowerCase())?avatar({...pet,tipo:String(pet.tipo||pet.especie).toLowerCase()},true):h('span',{class:'social-avatar social-inicial','aria-hidden':'true'},(p.autor||'M').slice(0,1).toUpperCase());
    return h('div',{class:'social-autor'},img,h('div',{},h('strong',{},p.autor),p.mascota&&p.mascota!==p.autor?h('p',{class:'social-mascota'},'Con '+p.mascota):null,nota(p.demo?'Perfil ficticio':`${fecha(p.fecha)} · ${p.visibilidad==='Privada'?'Solo yo':'Publicación local'}`),p.roles?.length?nota(p.roles.join(' · ')+' (autodeclarado)'):null),!p.propio?btn(estado.siguiendo.includes(p.autorId)?'Siguiendo':'Seguir',toggle('siguiendo',p.autorId),{'aria-pressed':String(estado.siguiendo.includes(p.autorId))}):null);
  }
  function editor(ctx){
    const p=estado.posts.find(x=>x.id===editId);
    if(!ctx.perfil.activo)return card(h('h2',{},'Crear publicación'),nota('Completá tu perfil personal y registrá una mascota real para publicar.'),h('a',{class:'btn',href:'#persona'},'Completar mi perfil'));
    ctx={...ctx,mascotas:ctx.mascotas.filter(m=>!m.demo)};
    if(!ctx.mascotas.length)return card(h('h2',{},'Crear publicación'),nota('Para publicar, primero registrá una mascota.'),h('a',{class:'btn',href:'#mascota'},'Ir a Mis mascotas'));
    // La mascota única se asigna automáticamente; con varias se muestra un selector obligatorio.
    const seleccion=ctx.mascotas.find(m=>m.id===p?.mascotaId)?.id||ctx.mascotas[0].id;
    const mascotas=ctx.mascotas.length>1?h('select',{name:'mascota',required:true},ctx.mascotas.map(m=>option(m.id,seleccion,m.nombre))):h('input',{type:'hidden',name:'mascota',value:seleccion});
    const campoMascota=ctx.mascotas.length>1?label('Publicar con',mascotas):mascotas;
    let files=[];
    const adjuntos=h('div',{class:'social-adjuntos',hidden:true});
    const previewUrls=new Set();
    function limpiarPreview(){for(const u of previewUrls){URL.revokeObjectURL(u);urls.delete(u);}previewUrls.clear();}
    function mostrarAdjuntos(){
      limpiarPreview();adjuntos.hidden=!files.length;
      adjuntos.replaceChildren(...files.map(file=>{
        const u=URL.createObjectURL(file);urls.add(u);previewUrls.add(u);
        const preview=file.type.startsWith('image/')?h('img',{src:u,alt:'Foto seleccionada'}):h('video',{src:u,controls:true,playsinline:true,preload:'metadata'});
        return h('div',{class:'social-adjunto'},preview,h('span',{},file.name),btn('Quitar',()=>{files=files.filter(x=>x!==file);mostrarAdjuntos();}));
      }));
    }
    // Dos entradas nativas de cámara y una de galería. El navegador decide qué interfaz abrir.
    const aceptar='image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/ogg,video/quicktime';
    const galeria=h('input',{type:'file',accept:aceptar,multiple:true,hidden:true});
    const camara=h('input',{type:'file',accept:'image/*',capture:'environment',hidden:true});
    const grabar=h('input',{type:'file',accept:'video/*',capture:'environment',hidden:true});
    const menu=h('div',{class:'social-camara-menu',hidden:true});
    const boton=btn(iconoCamara(),()=>{menu.hidden=!menu.hidden;boton.setAttribute('aria-expanded',String(!menu.hidden));},{class:'social-camara','aria-label':'Añadir fotos o videos','aria-expanded':'false',title:'Añadir fotos o videos'});
    function elegir(input){menu.hidden=true;boton.setAttribute('aria-expanded','false');input.click();}
    menu.append(btn('Galería',()=>elegir(galeria)),btn('Tomar foto',()=>elegir(camara)),btn('Grabar video',()=>elegir(grabar)));
    for(const input of [galeria,camara,grabar])input.addEventListener('change',()=>{
      const seleccionados=[...input.files];input.value='';if(!seleccionados.length)return;
      try{detectarFormato(seleccionados);files=seleccionados;mostrarAdjuntos();}catch(e){alert(e.message);}
    });
    const textoInput=h('textarea',{name:'texto',rows:3,maxlength:2000,placeholder:'¿Qué querés compartir hoy?','aria-label':'Texto de la publicación'},p?.texto||'');
    const f=h('form',{class:'social-editor',onsubmit:intentar(async e=>{
      e.preventDefault();const form=e.currentTarget,b=form.querySelector('button[type=submit]');if(b.disabled)return;
      b.disabled=true;const nuevos=[];let persistido=false;
      try{
        const d=new FormData(form),body=texto(d.get('texto')),seleccionados=[...files];
        let t=p?.formato||detectarFormato(seleccionados);
        if(t==='Texto'&&!body)throw Error('Escribí algo o adjuntá una foto o un video.');
        const m=fuentes().mascotas.find(x=>x.id===d.get('mascota'));if(!m)throw Error('Seleccioná una mascota registrada.');
        if(!p&&t==='Video')t=await revisarVideo(seleccionados[0]);
        for(const file of p?[]:seleccionados){const blob=t==='Fotos'?await prepararFoto(file):file;const id=nuevoId();await guardarArchivo(id,blob);nuevos.push({id,tipo:blob.type});}
        const post={id:p?.id||nuevoId(),autorId:'local',propio:true,mascotaId:m.id,formato:t,texto:body,media:p?.media||nuevos,fecha:p?.fecha||new Date().toISOString(),visibilidad:d.get('publica')==='on'?'Comunidad':'Privada',comentarios:d.get('permitir')==='on'};
        cambiar('posts',p?estado.posts.map(x=>x.id===p.id?post:x):[post,...estado.posts]);persistido=true;editId=null;filtro=post.visibilidad==='Privada'?'Mis publicaciones':'Todo';q='';render();
      }catch(err){if(!persistido)await Promise.allSettled(nuevos.map(x=>borrarArchivo(x.id)));throw err;}finally{b.disabled=false;}
    })},h('div',{class:'social-compositor'},textoInput,p?null:boton),p?null:menu,galeria,camara,grabar,adjuntos,
      p&&p.media.length?nota('Podés editar el texto y las opciones. Los archivos adjuntos se conservan.'):null,
      campoMascota,
      h('label',{class:'social-check'},h('input',{type:'checkbox',name:'publica',checked:p?.visibilidad==='Comunidad'}),' Mostrar en Comunidad'),
      h('label',{class:'social-check'},h('input',{type:'checkbox',name:'permitir',checked:p?.comentarios!==false}),' Permitir comentarios'),
      nota('Si no marcás Mostrar en Comunidad, queda en Mis publicaciones. Prototipo local.'),
      fila(h('button',{type:'submit',class:'btn'},p?'Guardar cambios':'Publicar'),p?btn('Cancelar edición',()=>{editId=null;render();}):null));
    return card(h('h2',{},p?'Editar publicación':'Crear publicación'),f);
  }
  function reportar(p){return intentar(()=>{const motivo=prompt('Motivo de la denuncia (no incluyas información privada):');if(!motivo?.trim())return;cambiar('denuncias',[...estado.denuncias,{id:nuevoId(),post:p.id,motivo:texto(motivo,500),fecha:new Date().toISOString()}]);alert('Denuncia guardada localmente. Aún no se envía a moderación.');});}
  function quitar(p){return intentar(async()=>{if(!confirm('¿Eliminar esta publicación y sus archivos locales?'))return;guardar({...estado,posts:estado.posts.filter(x=>x.id!==p.id),comentarios:estado.comentarios.filter(x=>x.post!==p.id),likes:estado.likes.filter(x=>x!==p.id),guardados:estado.guardados.filter(x=>x!==p.id)});render();await Promise.allSettled(p.media.map(x=>borrarArchivo(x.id)));});}
  function comentarios(p,ctx){
    const items=estado.comentarios.filter(x=>x.post===p.id);return h('div',{class:'social-comentarios'},items.map(c=>h('div',{class:'social-comentario'},h('strong',{},ctx.nombre),nota(fecha(c.fecha)),h('p',{},c.texto),btn('Eliminar comentario',intentar(()=>{cambiar('comentarios',estado.comentarios.filter(x=>x.id!==c.id));render();})))),p.comentarios===false?nota('Comentarios desactivados.'):h('form',{class:'social-comentar',onsubmit:intentar(e=>{e.preventDefault();const t=texto(new FormData(e.currentTarget).get('comentario'),500);if(!t)return;cambiar('comentarios',[...estado.comentarios,{id:nuevoId(),post:p.id,texto:t,fecha:new Date().toISOString()}]);render();})},h('input',{name:'comentario',placeholder:'Escribí un comentario…','aria-label':'Comentario',maxlength:500,required:true}),h('button',{type:'submit',class:'btn'},'Enviar')));
  }
  function publicacion(p,ctx){
    const liked=estado.likes.includes(p.id),saved=estado.guardados.includes(p.id),count=estado.comentarios.filter(x=>x.post===p.id).length;
    return card(autor(p),fila(h('span',{class:'social-etiqueta'},p.formato==='Texto'?'Publicación':p.formato),p.visibilidad==='Privada'?h('span',{class:'social-etiqueta'},'Privada'):null),p.media.length?h('div',{class:p.formato==='Fotos'&&p.media.length>1?'social-fotos':'social-contenido'},p.media.map(m=>medio(m,p.formato==='Reel'))):null,p.texto?.trim()?h('p',{class:p.media.length?'social-texto social-pie':'social-texto'},p.texto):null,p.origen==='galeria'?h('a',{href:'#mascota'},'Gestionar desde Mi mascota'):null,h('div',{class:'social-interacciones'},h('button',{type:'button',class:'me-gusta','aria-pressed':String(liked),onclick:toggle('likes',p.id),'aria-label':'Dar o quitar huellita'},huella(p.avatarPet?.tipo||p.avatarPet?.especie||'perro'),String((p.baseLikes||0)+(liked?1:0))),btn(`Comentarios (${count})`,()=>{comentando=comentando===p.id?null:p.id;render();},{'aria-expanded':String(comentando===p.id)}),btn(saved?'Guardado':'Guardar',toggle('guardados',p.id),{'aria-pressed':String(saved)}),h('details',{class:'social-menu'},h('summary',{'aria-label':'Más opciones'},'···'),fila(p.propio&&!p.origen?btn('Editar',()=>{editId=p.id;render();document.querySelector('.social-editor')?.scrollIntoView({block:'center'});}):null,p.propio&&!p.origen?btn('Eliminar',quitar(p)):null,btn('Ocultar',toggle('ocultos',p.id)),btn('Denunciar',reportar(p))))),comentando===p.id?comentarios(p,ctx):null);
  }
  function vista(){
    if(fallo)return card(h('h1',{},'Comunidad'),nota('No se pudieron leer tus datos: '+fallo));
    const ctx=fuentes(), propios=estado.posts.map(p=>{const m=ctx.mascotas.find(x=>x.id===p.mascotaId);return {...p,autor:ctx.nombre,roles:ctx.roles,fotoPersona:ctx.perfil.fotoId,mascota:m?.nombre,avatarPet:m};});const posts=filtrarFeed([...propios,...ctx.externos],estado,filtro,q);
    return h('section',{class:'social-feed'},h('header',{class:'social-cabecera'},h('h1',{},'Comunidad'),nota('Compartí el día a día de tus mascotas. Prototipo local.')),editor(ctx),h('nav',{class:'social-tabs','aria-label':'Filtros de Comunidad'},filtros.map(t=>btn(t,()=>{filtro=t;comentando=null;render();},{'aria-pressed':String(t===filtro)}))),h('div',{class:'social-busqueda'},h('form',{onsubmit:e=>{e.preventDefault();q=texto(new FormData(e.currentTarget).get('q'),100);render();}},h('input',{type:'search',name:'q',value:q,placeholder:'Buscar publicaciones','aria-label':'Buscar publicaciones'}),h('button',{class:'btn',type:'submit'},'Buscar'))),estado.ocultos.length?btn('Restaurar publicaciones ocultas',intentar(()=>{cambiar('ocultos',[]);render();})):null,posts.length?posts.map(p=>publicacion(p,ctx)):card(nota('No hay publicaciones para mostrar con estos filtros.')));
  }
  return {vista,limpiar};
}
