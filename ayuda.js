import { almacen } from './almacenamiento.js?v=11';
// Mimo: avisos, rescates y perfil personal. Prototipo local sin permisos reales.
import { h } from './seguridad.js?v=11';
import { cargarMascotas, nuevoId, fechaLocal } from './mascotas.js?v=11';
import { validarArchivo, guardarArchivo, leerArchivo, borrarArchivo } from './multimedia.js?v=11';
const opcionesAyuda = ['Adopción','Hogar provisorio','Apadrinamiento','Insumos','Traslado'];
const key = 'mimo_ayuda_v1';
const card = (...c) => h('article',{class:'tarjeta'},...c);
const pila = (...c) => h('section',{class:'mimo-pila'},...c);
const fila = (...c) => h('div',{class:'fila'},...c);
const nota = t => h('p',{class:'suave'},t);
const btn = (t,fn,clase='chip') => h('button',{type:'button',class:clase,onclick:fn},t);
const campo = (n,t,v='',type='text',req=false) => h('label',{class:'mimo-campo'},t,h('input',{name:n,value:v,type,required:req,maxlength:160,accept:type==='file'?'image/jpeg,image/png,image/webp,image/gif,image/avif':null}));
const texto = (n,t,v='') => h('label',{class:'mimo-campo'},t,h('textarea',{name:n,rows:3,maxlength:1000},v));
const select = (n,t,opts,v) => h('label',{class:'mimo-campo'},t,h('select',{name:n},opts.map(x=>h('option',{value:x,selected:x===v},x))));
const checks = (n,opts,actual=[]) => h('fieldset',{},h('legend',{},n==='roles'?'Cómo participás':'Formas de ayudar'),opts.map(x=>h('label',{class:'fila'},h('input',{name:n,type:'checkbox',value:x,checked:actual.includes(x)}),x)));
const limpiar = (v,n=160) => String(v??'').trim().slice(0,n);
const tel = v => /^\+[1-9]\d{7,14}$/.test(v)?v:'';
const demoAvisos = [{id:'demo-perdido',tipo:'Perdida',nombre:'Luna',especie:'Gato',zona:'Barrio de ejemplo',fecha:fechaLocal(),detalle:'Pelaje claro. Aviso ficticio.',estado:'Abierto',demo:true},{id:'demo-encontrado',tipo:'Encontrada',nombre:'Sin identificar',especie:'Perro',zona:'Plaza de ejemplo',fecha:fechaLocal(),detalle:'Collar azul. Aviso ficticio.',estado:'Abierto',demo:true}];
const demoRescates = [{id:'demo-rescate',nombre:'Benito',especie:'Perro',zona:'Localidad de ejemplo',detalle:'Animal ficticio en recuperación.',ayudas:['Adopción','Hogar provisorio','Apadrinamiento'],necesidad:'Alimento y controles',estado:'Activo',demo:true}];
export function leerAyuda() {
  const raw=almacen.getItem(key);
  if(raw===null) {
    const anterior=JSON.parse(almacen.getItem('perdidos')||'[]');
    const avisos=Array.isArray(anterior)?anterior.map(x=>({id:nuevoId(),tipo:'Perdida',nombre:limpiar(x.nombre)||'Sin identificar',especie:limpiar(x.tipo),zona:limpiar(x.zona),fecha:limpiar(x.fecha),detalle:'Aviso importado: revisá los datos y autorizá el contacto de nuevo.',estado:'Abierto',social:false,contacto:''})):[];
    const inicial={avisos,rescates:[],persona:{nombre:'',roles:[],publicos:[]},denuncias:[],intereses:[]};
    almacen.setItem(key,JSON.stringify(inicial));return inicial;
  }
  const d=JSON.parse(raw);
  if(!d||!['avisos','rescates','denuncias','intereses'].every(k=>Array.isArray(d[k]))||!d.persona) throw Error('Datos locales inválidos.');
  return d;
}
export const filtrar = (items,q) => items.filter(x=>[x.nombre,x.especie,x.zona,x.detalle,...(x.ayudas||[])].join(' ').toLocaleLowerCase('es').includes(q.toLocaleLowerCase('es')));
export function crearAyuda(render) {
  let data,fallo='',tabAviso='Todos',tabRescate='Todas',qAviso='',qRescate='',editAviso=null,editRescate=null,borradorRescate=null;
  try { data=leerAyuda(); } catch(e) { fallo=e.message; }
  const save = next => { almacen.setItem(key,JSON.stringify(next)); data=next; };
  const cambiar = (k,v) => save({...data,[k]:v});
  const upsert = (k,x) => cambiar(k,data[k].some(a=>a.id===x.id)?data[k].map(a=>a.id===x.id?x:a):[...data[k],x]);
  const intentar = fn => async (...args)=>{try{await fn(...args);}catch(e){alert(e.message);}};
  const error = () => pila(h('h1',{},'No disponible'),nota('No se modificaron tus datos: '+fallo));
  const form = (campos,fn,t='Guardar') => h('form',{class:'mimo-form',onsubmit:intentar(async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('button[type=submit]');b.disabled=true;try{await fn(new FormData(f));}finally{b.disabled=false;}})},...campos,h('button',{type:'submit',class:'btn'},t));
  const buscador = (q,fn) => h('form',{onsubmit:e=>{e.preventDefault();fn(e.currentTarget.elements.q.value);render();}},campo('q','Buscar',q),h('button',{class:'btn',type:'submit'},'Buscar'));
  const tabs = (opts,v,fn) => fila(...opts.map(x=>h('button',{type:'button',class:'chip','aria-pressed':String(x===v),onclick:()=>{fn(x);render();}},x)));
  const urls = new Set();
  function foto(id) {
    if(!id) return null;
    const box=h('div',{class:'mimo-medio'},nota('Cargando imagen…'));
    leerArchivo(id).then(b=>{if(!box.isConnected)return;if(!b){box.replaceChildren(nota('Imagen no disponible'));return;}const u=URL.createObjectURL(b);urls.add(u);box.replaceChildren(h('img',{src:u,alt:'Imagen del aviso'}));}).catch(()=>box.replaceChildren(nota('Imagen no disponible')));
    return box;
  }
  async function guardarFoto(file,anterior) {
    if(!file?.size) return anterior||null;
    validarArchivo(file,true);
    if(!['image/jpeg','image/png','image/webp','image/gif','image/avif'].includes(file.type)) throw Error('Elegí una imagen compatible.');
    // Reexportar como JPEG elimina metadatos de ubicación de la foto original.
    const bitmap=await createImageBitmap(file); const c=document.createElement('canvas');
    const escala=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));
    c.width=Math.max(1,Math.round(bitmap.width*escala));c.height=Math.max(1,Math.round(bitmap.height*escala));
    c.getContext('2d').drawImage(bitmap,0,0,c.width,c.height);bitmap.close();
    const blob=await new Promise(resolve=>c.toBlob(resolve,'image/jpeg',.85));
    if(!blob) throw Error('No se pudo procesar la foto.');
    const id=nuevoId();await guardarArchivo(id,blob);return id;
  }
  async function guardarConFoto(k,x,file,anterior) {
    x.fotoId=await guardarFoto(file,anterior?.fotoId);
    try {upsert(k,x);} catch(e){if(x.fotoId&&x.fotoId!==anterior?.fotoId)await borrarArchivo(x.fotoId);throw e;}
    if(anterior?.fotoId&&x.fotoId!==anterior.fotoId) await borrarArchivo(anterior.fotoId).catch(console.error);
  }
  const contacto = x => !x.demo&&tel(x.contacto)&&x.estado!=='Cerrado'&&x.estado!=='Finalizado'?fila(h('a',{class:'btn',href:'tel:'+x.contacto},'Llamar'),h('a',{class:'btn',href:'https://wa.me/'+x.contacto.slice(1),target:'_blank',rel:'noopener noreferrer'},'WhatsApp')):null;
  function denunciar(x,k) {
    const motivo=prompt('Motivo de la denuncia (se guarda solo en este navegador):');
    if(!motivo?.trim())return;
    cambiar('denuncias',[...data.denuncias,{id:nuevoId(),objeto:x.id,modulo:k,motivo:limpiar(motivo,500),fecha:new Date().toISOString()}]);
    alert('Denuncia local registrada. Todavía no se envía a moderadores.');
  }
  function eliminar(k,x) {
    return intentar(async()=>{if(!confirm('¿Eliminar este registro local?'))return;cambiar(k,data[k].filter(a=>a.id!==x.id));render();if(x.fotoId)await borrarArchivo(x.fotoId);});
  }
  function seleccionarPerfil() {
    let mascotas=[];try{mascotas=cargarMascotas();}catch{}
    const s=h('select',{onchange:e=>{const m=mascotas.find(x=>x.id===e.target.value);const form=e.target.closest('form');if(m){form.elements.nombre.value=m.nombre;form.elements.especie.value=m.especie;}}},h('option',{value:''},'Cargar manualmente'),mascotas.map(m=>h('option',{value:m.id},m.nombre)));
    return h('label',{class:'mimo-campo'},'Usar nombre y especie de mi mascota (opcional)',s);
  }
  function editorAviso() {
    const a=data.avisos.find(x=>x.id===editAviso)||{};
    return card(h('h2',{},editAviso?'Editar aviso':'Crear aviso'),form([
      seleccionarPerfil(),select('tipo','Tipo',['Perdida','Encontrada'],a.tipo),campo('nombre','Nombre (si se conoce)',a.nombre),campo('especie','Especie',a.especie,'text',true),campo('zona','Última zona conocida / localidad (sin domicilio privado)',a.zona,'text',true),campo('fecha','Fecha del hecho',a.fecha||fechaLocal(),'date',true),texto('detalle','Características visibles y descripción pública',a.detalle),campo('contacto','Teléfono autorizado para llamada y WhatsApp (+54...)',a.contacto,'tel'),campo('foto','Foto pública opcional','','file'),h('label',{},h('input',{type:'checkbox',name:'consentimiento',required:true}),' Confirmo que autorizo estos datos para el aviso y no incluyo información privada de terceros.')],async f=>{
      const d=Object.fromEntries(f),c=limpiar(d.contacto);if(c&&!tel(c))throw Error('Usá un número internacional válido con +.');
      if(!limpiar(d.especie)||!limpiar(d.zona)||!d.fecha||d.fecha>fechaLocal())throw Error('Completá especie, zona y fecha válida.');
      const x={id:a.id||nuevoId(),tipo:d.tipo,nombre:limpiar(d.nombre)||'Sin identificar',especie:limpiar(d.especie),zona:limpiar(d.zona),fecha:d.fecha,detalle:limpiar(d.detalle,1000),contacto:c,social:false,estado:a.estado||'Abierto'};
      await guardarConFoto('avisos',x,d.foto,a);editAviso=null;render();
    },'Guardar aviso'),editAviso?btn('Cancelar edición',()=>{editAviso=null;render();}):null);
  }
  async function cartel(a) {
    const c=document.createElement('canvas');c.width=1000;c.height=1200;const ctx=c.getContext('2d');
    ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#1E1546';ctx.fillRect(0,0,1000,140);ctx.fillStyle='#fff';ctx.font='bold 52px sans-serif';ctx.textAlign='center';ctx.fillText(a.tipo.toUpperCase()+' · MIMO',500,85);
    let y=190;ctx.fillStyle='#1E1546';ctx.font='bold 44px sans-serif';ctx.fillText(a.nombre,500,y,900);y+=35;
    if(a.fotoId){const blob=await leerArchivo(a.fotoId);if(blob){const b=await createImageBitmap(blob);const s=Math.min(900/b.width,540/b.height);ctx.drawImage(b,(1000-b.width*s)/2,y,b.width*s,b.height*s);y+=b.height*s+45;b.close();}}
    ctx.font='32px sans-serif';const lineas=[a.especie,a.zona,a.fecha,a.contacto?'Contacto: '+a.contacto:'Sin contacto público',a.detalle];
    for(const t of lineas){let l='';for(const w of String(t).split(/\s+/)){if(ctx.measureText(l+' '+w).width>900&&l){if(y>1140)break;ctx.fillText(l,500,y,900);y+=42;l=w;}else l+=(l?' ':'')+w;}if(y>1140)break;ctx.fillText(l,500,y,900);y+=42;}
    const blob=await new Promise(r=>c.toBlob(r,'image/png'));if(!blob)throw Error('No se pudo crear el cartel.');const u=URL.createObjectURL(blob);h('a',{href:u,download:'mimo-aviso.png'}).click();setTimeout(()=>URL.revokeObjectURL(u),60000);
  }
  function avisoCard(a,social=false) {
    return card(h('h3',{},`${a.tipo}: ${a.nombre}`),nota(a.demo?'Ejemplo ficticio':`Aviso local no verificado · ${a.estado}`),foto(a.fotoId),h('p',{},`${a.especie} · ${a.zona} · ${a.fecha}`),h('p',{},a.detalle),!a.demo&&a.zona?h('a',{href:'https://www.openstreetmap.org/search?query='+encodeURIComponent(a.zona),target:'_blank',rel:'noopener noreferrer'},'Buscar zona en el mapa'):null,contacto(a),!a.demo&&!social?fila(btn(a.estado==='Cerrado'?'Reabrir':'Cerrar búsqueda',intentar(()=>{upsert('avisos',{...a,estado:a.estado==='Cerrado'?'Abierto':'Cerrado'});render();})),btn('Editar',()=>{editAviso=a.id;render();}),a.estado==='Abierto'?btn('Descargar cartel',intentar(()=>cartel(a))):null,a.tipo==='Encontrada'?btn('Preparar caso de rescate',()=>{if(!confirm('¿Tenés autorización o responsabilidad sobre este animal para preparar un caso de rescate? No se cierra el aviso de búsqueda.'))return;borradorRescate={nombre:a.nombre,especie:a.especie,zona:a.zona,detalle:a.detalle,ayudas:[]};editRescate=null;location.hash='ayuda';render();}):null,btn('Eliminar',eliminar('avisos',a))):null,btn('Denunciar',intentar(()=>denunciar(a,'avisos'))));
  }
  function perdidos() {
    if(fallo)return error();const items=filtrar([...data.avisos,...demoAvisos],qAviso).filter(a=>tabAviso==='Todos'||a.tipo===tabAviso||a.estado===tabAviso);
    return pila(h('h1',{},'Perdidos y encontrados'),nota('Demostración local. No difunde avisos a otros usuarios. No publiques domicilios particulares.'),tabs(['Todos','Perdida','Encontrada','Cerrado'],tabAviso,x=>tabAviso=x),buscador(qAviso,x=>qAviso=x),h('div',{class:'grilla'},items.length?items.map(a=>avisoCard(a)):nota('Sin resultados.')),editorAviso());
  }
  function editorRescate() {
    const a=data.rescates.find(x=>x.id===editRescate)||borradorRescate||{};
    return card(h('h2',{},editRescate?'Editar caso':'Registrar caso de rescate'),nota('Formulario de prueba. La identidad del rescatista aún no se verifica.'),form([campo('nombre','Nombre',a.nombre,'text',true),campo('especie','Especie',a.especie,'text',true),campo('zona','Localidad',a.zona,'text',true),texto('detalle','Descripción y requisitos',a.detalle),checks('ayudas',opcionesAyuda,a.ayudas),texto('necesidad','Necesidades concretas de ayuda',a.necesidad),campo('contacto','Contacto autorizado (+54...)',a.contacto,'tel'),campo('foto','Foto pública opcional','','file'),h('label',{},h('input',{type:'checkbox',required:true}),' Confirmo que estos datos pueden mostrarse en el aviso.')],async f=>{
      const d=Object.fromEntries(f),c=limpiar(d.contacto),ayudas=f.getAll('ayudas').filter(x=>opcionesAyuda.includes(x));
      if(!limpiar(d.nombre)||!limpiar(d.especie)||!limpiar(d.zona)||!ayudas.length)throw Error('Completá los datos y elegí una forma de ayuda.');if(c&&!tel(c))throw Error('Número internacional inválido.');
      await guardarConFoto('rescates',{id:a.id||nuevoId(),nombre:limpiar(d.nombre),especie:limpiar(d.especie),zona:limpiar(d.zona),detalle:limpiar(d.detalle,1000),necesidad:limpiar(d.necesidad,1000),contacto:c,ayudas,estado:a.estado||'Activo'},d.foto,a);editRescate=null;borradorRescate=null;render();
    },'Guardar caso'),editRescate||borradorRescate?btn('Cancelar',()=>{editRescate=null;borradorRescate=null;render();}):null);
  }
  function interes(a,tipo) {
    if(data.intereses.some(x=>x.caso===a.id&&x.tipo===tipo)){alert('Ya registraste este interés local.');return;}
    cambiar('intereses',[...data.intereses,{id:nuevoId(),caso:a.id,nombre:a.nombre,tipo,fecha:fechaLocal()}]);alert('Interés registrado localmente. No se envió una solicitud ni se realizó ningún pago.');render();
  }
  function rescateCard(a) {
    return card(h('h3',{},a.nombre),nota(a.demo?'Ejemplo ficticio':`Caso local no verificado · ${a.estado}`),foto(a.fotoId),h('p',{},`${a.especie} · ${a.zona}`),h('p',{},a.detalle),h('p',{},'Necesidades: '+a.necesidad),h('p',{},a.ayudas.join(' · ')),a.estado==='Activo'?fila(...a.ayudas.map(t=>btn('Me interesa: '+t,intentar(()=>interes(a,t))))):null,contacto(a),!a.demo?fila(btn('Editar',()=>{editRescate=a.id;render();}),btn(a.estado==='Activo'?'Finalizar':'Reabrir',intentar(()=>{upsert('rescates',{...a,estado:a.estado==='Activo'?'Finalizado':'Activo'});render();})),btn('Eliminar',eliminar('rescates',a))):null,btn('Denunciar',intentar(()=>denunciar(a,'rescates'))));
  }
  function rescates() {
    if(fallo)return error();const items=filtrar([...data.rescates,...demoRescates],qRescate).filter(a=>tabRescate==='Todas'||a.ayudas.includes(tabRescate));
    return pila(h('h1',{},'Adopción y ayuda'),nota('Prototipo: no procesa dinero, solicitudes reales ni verifica rescatistas.'),tabs(['Todas',...opcionesAyuda],tabRescate,x=>tabRescate=x),buscador(qRescate,x=>qRescate=x),h('div',{class:'grilla'},items.length?items.map(rescateCard):nota('Sin resultados.')),card(h('h2',{},'Mis intereses'),data.intereses.length?data.intereses.map(x=>fila(h('p',{},`${x.nombre} · ${x.tipo}`),btn('Retirar',intentar(()=>{cambiar('intereses',data.intereses.filter(i=>i.id!==x.id));render();})) )):nota('Todavía no registraste intereses.')),editorRescate());
  }
  return {perdidos,rescates,social:()=>fallo?[]:data.avisos.filter(a=>a.social&&a.estado==='Abierto').map(a=>avisoCard(a,true)),limpiar:()=>{for(const u of urls)URL.revokeObjectURL(u);urls.clear();}};
}
