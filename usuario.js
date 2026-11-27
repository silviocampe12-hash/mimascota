import { almacen } from './almacenamiento.js?v=15';
// Perfil personal local. Los expedientes de entrevista nunca forman parte del perfil visible.
import { h } from './seguridad.js?v=15';
import { nuevoId } from './mascotas.js?v=15';
import { validarArchivo, guardarArchivoNube as guardarArchivo, leerArchivoNube as leerArchivo, borrarArchivoNube as borrarArchivo } from './multimedia.js?v=15';
import { guardarNube } from './nube.js?v=15';
import { sincronizarFotoPublica } from './social-publico.js?v=16';
import { PAISES, ubicacionPublica, coordenadasValidas, validarUbicacion, capturarUbicacion } from './ubicacion.js?v=9';
const KEY='mimo_persona_v1';
export const DUENO='Dueño de mascotas';
export const ROLES=['Adoptante','Hogar provisorio (provi)','Padrino o madrina','Voluntario'];
const lista=x=>Array.isArray(x)?x:[];
const texto=(x,n=200)=>String(x??'').trim().slice(0,n);
const leer=(k,def)=>{const s=almacen.getItem(k);return s===null?def:JSON.parse(s);};
export const mascotasReales=()=>lista(leer('mimo_mascotas',[])).filter(m=>m&&!m.demo&&m.id);
const rolesValidos=x=>ROLES.filter(r=>lista(x).includes(r));
export const requiereVivienda=r=>r.includes(ROLES[0])||r.includes(ROLES[1]);
// La ubicación se gestiona una sola vez en el perfil. La ficha de vivienda es privada.
export const VIVIENDA=[
 ['barrio','Barrio o zona (opcional)'],
 ['tipo','Tipo de vivienda',['Casa','Departamento','Otro']],
 ['tenencia','Situación de la vivienda',['Propia','Alquilada','Prestada / compartida','Otra']],
 ['permiso','¿Está permitida la convivencia con animales?',['Sí','No','A confirmar']],
 ['patio','¿Tiene patio o espacio exterior?',['Sí, privado','Compartido','No']],
 ['cerramientos','Cerramientos, balcones, ventanas y accesos: ¿cómo se aseguran?'],
 ['convivencia','¿Con quién convive? ¿Están de acuerdo con recibir un animal?'],
 ['animales','Otros animales y posibilidad de separarlos durante la adaptación'],
 ['tiempo','Horas aproximadas que el animal estaría solo por día',['0 a 2','3 a 5','6 a 8','Más de 8','Variable']],
 ['experiencia','Experiencia previa en el cuidado de animales'],
 ['preferencias','Especies, tamaños o necesidades que podría atender'],
 ['cuidados','Plan de alimentación, gastos veterinarios y cuidados cotidianos'],
 ['contingencia','¿Quién cuidaría al animal ante viajes o imprevistos?']
];
export const PROVI=[['duracion','Tiempo durante el cual podría ofrecer hogar provisorio'],['capacidad','Cantidad de animales que podría recibir'],['traslado','Disponibilidad para traslados y controles veterinarios'],['separacion','Espacio separado para adaptación o indicaciones veterinarias']];
export const ADOPCION=[['motivo','¿Por qué desea adoptar?'],['compromiso','¿Cómo se organizaría para el cuidado a largo plazo?']];
const camposPara=r=>requiereVivienda(r)?[...VIVIENDA,...(r.includes(ROLES[0])?ADOPCION:[]),...(r.includes(ROLES[1])?PROVI:[])]:[];
export function leerPersona(){
 const raw=leer(KEY,null);
 if(raw!==null){if(!raw||typeof raw!=='object'||!Array.isArray(raw.roles))throw Error('Perfil local inválido.');return raw;}
 // La versión anterior tenía un único nombre. Se conserva sin inventar el apellido.
 const anterior=leer('mimo_ayuda_v1',{})?.persona||{};
 return {nombre:texto(anterior.nombre,80),apellido:'',edad:'',fotoId:null,roles:[],pendientes:rolesValidos(anterior.roles),vivienda:{},ubicacion:{},creado:false};
}
export function validarPersona(p,hayMascota){
 // El perfil personal también puede ser de adoptantes y colaboradores sin mascotas.
 if(!texto(p.nombre,80)||!texto(p.apellido,80))throw Error('Completá nombre y apellido.');
 if(String(p.edad).trim()===''||!Number.isInteger(Number(p.edad))||Number(p.edad)<1||Number(p.edad)>120)throw Error('Ingresá una edad válida.');
 const roles=rolesValidos(p.roles);
 if(roles.length&&!p.fotoId)throw Error('Para ofrecer colaboración necesitás una foto de perfil.');
 const ubicacion=validarUbicacion(p.ubicacion,requiereVivienda(roles));
 const vivienda={};
 for(const [k,label,opts] of camposPara(roles)){
  const v=texto(p.vivienda?.[k],600);
  if(k!=='barrio'&&!v)throw Error('Completá: '+label);
  if(opts&&!opts.includes(v))throw Error('Elegí una opción válida: '+label);
  vivienda[k]=v;
 }
 return {nombre:texto(p.nombre,80),apellido:texto(p.apellido,80),edad:Number(p.edad),fotoId:p.fotoId||null,roles,vivienda,ubicacion,creado:true,pendientes:[]};
}
// Única proyección para la comunidad: nunca devuelve la ficha de entrevista.
export function perfilVisible(){
 try{const p=leerPersona(),ubicacion=ubicacionPublica(p.ubicacion),activo=p.creado===true&&!!ubicacion;
  const roles=rolesValidos(p.roles).filter(r=>!requiereVivienda([r])||coordenadasValidas(p.ubicacion?.gps));
  return {nombre:[p.nombre,p.apellido].filter(Boolean).join(' ')||'Mi perfil',edad:activo?p.edad:null,fotoId:activo?p.fotoId:null,roles:activo?[...(mascotasReales().length?[DUENO]:[]),...(p.fotoId?roles:[])]:[],ubicacion:activo?ubicacion:null,activo};
 }catch{return {nombre:'Mi perfil',edad:null,fotoId:null,roles:[],ubicacion:null,activo:false};}
}
async function prepararFoto(file){
 validarArchivo(file,true);if(!file.type.startsWith('image/'))throw Error('Elegí una imagen válida.');
 const b=await createImageBitmap(file);
 try{const c=document.createElement('canvas'),s=Math.min(1,800/Math.max(b.width,b.height));c.width=Math.max(1,Math.round(b.width*s));c.height=Math.max(1,Math.round(b.height*s));c.getContext('2d').drawImage(b,0,0,c.width,c.height);const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',.88));if(!blob)throw Error('No se pudo procesar la foto.');return blob;}finally{b.close();}
}
const nota=t=>h('p',{class:'suave'},t);
const card=(...c)=>h('section',{class:'persona-card'},...c);
const boton=(t,fn)=>h('button',{type:'button',class:'chip',onclick:fn},t);
const campo=(n,t,v='',opts={})=>h('label',{class:'mimo-campo'},t,h('input',{name:n,value:v,...opts}));
const entrada=(k,t,opts,v)=>h('label',{class:'mimo-campo'},t,opts?h('select',{name:k,required:true},h('option',{value:'',selected:!v},'Elegí una opción'),opts.map(o=>h('option',{value:o,selected:o===v},o))):h('textarea',{name:k,rows:2,maxlength:600,required:k!=='barrio'},v||''));
const check=(t,checked,fn)=>h('label',{class:'persona-check'},h('input',{type:'checkbox',checked,onchange:e=>fn(e.target.checked)}),t);
export function crearPersona(render){
 const urls=new Set();const limpiar=()=>{for(const u of urls)URL.revokeObjectURL(u);urls.clear();};
 function foto(p,puedeActualizar=()=>true){const box=h('div',{class:'persona-foto'},(p.nombre||'M').slice(0,1).toUpperCase());if(p.fotoId)leerArchivo(p.fotoId).then(b=>{if(!b||!box.isConnected||!puedeActualizar())return;const u=URL.createObjectURL(b);urls.add(u);box.replaceChildren(h('img',{src:u,alt:'Foto de perfil'}));}).catch(()=>{});return box;}
 function vista(){
  let p,mascotas;try{p=leerPersona();mascotas=mascotasReales();}catch(e){return card(h('h1',{},'Mi perfil'),nota('No se pudieron leer los datos. No se modificó nada: '+e.message));}
  const visible=perfilVisible();let elegidos=rolesValidos([...p.roles,...lista(p.pendientes)]),quitar=false;
  const panel= h('div',{class:'persona-entrevista'}),aviso=h('p',{class:'persona-aviso'}),archivo=h('input',{name:'foto',type:'file',accept:'image/jpeg,image/png,image/webp,image/gif,image/avif',hidden:true});
  let borrador={...p.vivienda},prevUrl=null,fotoTocada=false;
  const preview=foto(p,()=>!fotoTocada);
  const camara=h('button',{type:'button',class:'persona-camara','aria-label':'Elegir foto de perfil',title:'Elegir foto de perfil',onclick:()=>archivo.click()},'📷');
  const avatarEditor=h('div',{class:'persona-avatar-editor'},preview,camara,archivo);
  const anteriorUb=p.ubicacion||{};let gps=coordenadasValidas(anteriorUb.gps)?anteriorUb.gps:null;
  let solicitud=0;
  const estadoGPS=h('p',{class:'persona-aviso',role:'status','aria-live':'polite'});
  const requisitoGPS=h('p',{class:'suave'});
  const gpsEstado=()=>{estadoGPS.textContent=gps?`Ubicación registrada · precisión estimada: ${Math.round(gps.precision)} m. Solo se guarda al guardar el perfil.`:'Sin ubicación precisa registrada.';};
  const activarGPS=h('button',{type:'button',class:'btn',onclick:async()=>{
   if(!confirm('¿Estás en tu vivienda o en la ubicación que querés registrar? Las coordenadas quedarán privadas en tu cuenta de Supabase.'))return;
   const id=++solicitud;activarGPS.disabled=true;estadoGPS.textContent='Solicitando ubicación…';
   try{const nueva=await capturarUbicacion();if(id===solicitud&&estadoGPS.isConnected){gps=nueva;gpsEstado();}}
   catch(e){if(id===solicitud&&estadoGPS.isConnected)estadoGPS.textContent=e.message+(gps?' Se conserva la ubicación anterior.':'');}
   finally{if(id===solicitud)activarGPS.disabled=false;}
  }},'📍 Activar / actualizar ubicación');
  const quitarGPS=boton('Quitar ubicación precisa',()=>{solicitud++;gps=null;activarGPS.disabled=false;gpsEstado();});
  gpsEstado();
  const ubicacionCard=card(h('h2',{},'Ubicación'),nota('País, provincia o región y ciudad organizan Mimo por zonas. Elegilos según tu residencia. La ubicación precisa nunca aparece en el perfil visible.'),h('div',{class:'persona-campos'},h('label',{class:'mimo-campo'},'País',h('select',{name:'pais',required:true,autocomplete:'country'},h('option',{value:'',selected:!anteriorUb.pais},'Elegí tu país'),PAISES.map(o=>h('option',{value:o.codigo,selected:o.codigo===anteriorUb.pais},o.nombre)))),campo('provincia','Provincia / estado / región',anteriorUb.provincia||'',{required:true,maxlength:100,autocomplete:'address-level1'}),campo('ciudad','Ciudad / localidad',anteriorUb.ciudad||'',{required:true,maxlength:100,autocomplete:'address-level2'})),p.vivienda?.localidad?nota('Localidad registrada anteriormente: '+p.vivienda.localidad+'. Completá los nuevos campos por separado.'):null,requisitoGPS,h('div',{class:'persona-gps-acciones'},activarGPS,quitarGPS),estadoGPS,nota('El navegador obtiene la posición actual. La precisión puede variar; no verifica el domicilio ni completa automáticamente la ciudad. La ubicación precisa solo se guarda en tu cuenta privada.'));

  for(const el of ubicacionCard.querySelectorAll('input,select'))el.addEventListener('change',()=>{if(gps){solicitud++;gps=null;activarGPS.disabled=false;gpsEstado();estadoGPS.textContent='Cambió la ciudad, provincia o país. Volvé a capturar la ubicación si corresponde.';}});
  function refrescar(){
   for(const el of panel.querySelectorAll('input,textarea,select'))borrador[el.name]=el.value;
   panel.replaceChildren();panel.hidden=!requiereVivienda(elegidos);
   if(!panel.hidden)panel.append(h('h2',{},'Ficha privada para entrevista'),nota('Se guarda de forma privada en tu cuenta. No se comparte con rescatistas. No ingreses direcciones exactas ni datos de terceros.'),h('div',{class:'persona-campos'},...camposPara(elegidos).map(([k,t,opts])=>entrada(k,t,opts,borrador[k]))));
   aviso.textContent=elegidos.length?'La foto es obligatoria para activar estas opciones de colaboración.':'La foto es opcional para el perfil básico.';
   requisitoGPS.textContent=requiereVivienda(elegidos)?'Ubicación precisa obligatoria para adoptantes y provis.':'Ubicación precisa opcional para el resto de los roles.';
  }
  function vistaFoto(){if(prevUrl){URL.revokeObjectURL(prevUrl);urls.delete(prevUrl);prevUrl=null;}const file=archivo.files?.[0];if(file){prevUrl=URL.createObjectURL(file);urls.add(prevUrl);preview.replaceChildren(h('img',{src:prevUrl,alt:'Vista previa'}));}else if(quitar){preview.textContent=(p.nombre||'M').slice(0,1).toUpperCase();}refrescar();}
  archivo.addEventListener('change',()=>{if(archivo.files?.length){fotoTocada=true;quitar=false;vistaFoto();}});
  const roles=h('div',{class:'persona-roles'},...ROLES.map((r,i)=>h('div',{class:'persona-rol'},check(r,elegidos.includes(r),v=>{elegidos=v?[...elegidos,r]:elegidos.filter(x=>x!==r);refrescar();}),nota(['Quiero adoptar y completar mi ficha.','Puedo recibir temporalmente a un animal.','Estoy disponible para apoyar un caso.','Puedo colaborar con mi tiempo.'][i]))));
  const form=h('form',{class:'persona-form',onsubmit:async e=>{
   e.preventDefault();const f=e.currentTarget,b=f.querySelector('button[type=submit]');b.disabled=true;let nuevo=null;
   try{const d=new FormData(f),file=archivo.files?.[0];let fotoId=quitar?null:p.fotoId;
    if(file){const blob=await prepararFoto(file);nuevo=nuevoId();await guardarArchivo(nuevo,blob);fotoId=nuevo;}
    else if(elegidos.length&&fotoId&&!(await leerArchivo(fotoId)))throw Error('La foto guardada no está disponible. Seleccioná otra.');
    const vivienda=Object.fromEntries(camposPara(elegidos).map(([k])=>[k,d.get(k)]));
    const ubicacion={pais:d.get('pais'),provincia:d.get('provincia'),ciudad:d.get('ciudad'),gps};
    const next=validarPersona({nombre:d.get('nombre'),apellido:d.get('apellido'),edad:d.get('edad'),fotoId,roles:elegidos,vivienda,ubicacion},mascotasReales().length>0);
    await guardarNube(KEY,next);
    if(p.fotoId&&p.fotoId!==fotoId)await borrarArchivo(p.fotoId).catch(console.error);
    sincronizarFotoPublica().catch(e=>console.warn('No se pudo actualizar la miniatura pública',e));
    render();alert('Perfil actualizado correctamente.');
   }catch(err){/* No borrar archivos ante una respuesta ambigua del servidor. */alert(err.message);}finally{b.disabled=false;}
  }},card(h('h2',{},'Datos personales'),h('div',{class:'persona-foto-control'},h('strong',{},'Foto de perfil'),boton('Quitar foto',()=>{fotoTocada=true;quitar=true;archivo.value='';vistaFoto();}),aviso),h('div',{class:'persona-campos'},campo('nombre','Nombre',p.nombre,{required:true,maxlength:80,autocomplete:'given-name'}),campo('apellido','Apellido',p.apellido,{required:true,maxlength:80,autocomplete:'family-name'}),campo('edad','Edad',p.edad,{type:'number',min:1,max:120,step:1,required:true}))),ubicacionCard,card(h('h2',{},'Cómo participo'),h('div',{class:'persona-rol persona-base'},h('strong',{},'✓ '+DUENO),nota('Rol base obligatorio. No se puede quitar.')),roles),panel,card(h('h2',{},'Mis mascotas'),mascotas.length?h('div',{class:'persona-animales'},...mascotas.map(m=>h('span',{},m.nombre+' · '+m.especie))):nota('Todavía no hay mascotas reales registradas. Los perfiles de ejemplo no cuentan.'),h('a',{href:'#mascota',class:'chip'},'Gestionar mis mascotas')),h('button',{type:'submit',class:'btn'},'Guardar perfil'));
  refrescar();
  return h('section',{class:'persona-pagina'},h('header',{class:'persona-cabecera'},h('h1',{},'Mi perfil'),nota('Tu identidad en Mimo. Los datos se guardan de forma privada en tu cuenta.')),card(h('div',{class:'persona-identidad'},avatarEditor,h('div',{},h('h2',{},visible.nombre),visible.activo?h('p',{},`${visible.edad} años`):nota('Perfil pendiente de completar'),visible.ubicacion?h('p',{class:'suave'},`${visible.ubicacion.ciudad} · ${visible.ubicacion.provincia} · ${visible.ubicacion.nombrePais}`):null,visible.activo?h('div',{class:'persona-animales'},...visible.roles.map(r=>h('span',{},r))):null)),nota('Vista previa local de tu perfil; la búsqueda social muestra el nombre público y los nombres de tus mascotas, salvo que elijas poner tu perfil privado. Las coordenadas y la ficha de vivienda son privadas.')),form);
 }
 return {vista,limpiar};
}
