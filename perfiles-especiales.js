// Directorios especiales: fichas de terceros, no cuentas ni credenciales verificadas.
import { h } from './seguridad.js';
import { nuevoId } from './mascotas.js?v=8';
import { PAISES, ubicacionPublica } from './ubicacion.js?v=9';
import { esAdminDemo, exigirAdminDemo } from './admin.js?v=10';
const KEY='mimo_especiales_v1';
const TIPOS=['rescatista','veterinario'];
const ORGANIZACIONES=['Rescatista independiente','Grupo de rescate','Refugio','Protectora'];
const AYUDAS=['Adopciones','Hogares provisorios','Apadrinamiento','Voluntariado','Insumos','Traslados'];
const ESTADOS=['Borrador','Publicado local','Archivado'];
const texto=(x,n=180)=>String(x??'').trim().slice(0,n);
const lista=x=>Array.isArray(x)?x:[];
const normal=x=>texto(x,1500).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function leerEspeciales(){
 const raw=localStorage.getItem(KEY);if(raw===null)return [];
 const datos=JSON.parse(raw);if(!Array.isArray(datos)||datos.some(p=>!p||!TIPOS.includes(p.tipo)||!ESTADOS.includes(p.estado)||!p.id))throw Error('Los datos de perfiles especiales no se pudieron leer.');return datos;
}
export function validarEspecial(d,tipo,anterior={}){
 if(!TIPOS.includes(tipo))throw Error('Tipo de perfil inválido.');
 const nombre=texto(d.nombre,100),ubicacion=ubicacionPublica(d.ubicacion),estado=texto(d.estado)||'Borrador';
 if(!nombre||!ubicacion)throw Error('Completá nombre, país, región y ciudad.');
 if(!ESTADOS.includes(estado))throw Error('Estado inválido.');
 const autorizado=d.autorizado===true;
 if(estado==='Publicado local'&&!autorizado)throw Error('Confirmá la autorización del titular antes de publicar la ficha de prueba.');
 const organizacion=tipo==='rescatista'?texto(d.organizacion):'';
 if(tipo==='rescatista'&&!ORGANIZACIONES.includes(organizacion))throw Error('Elegí el tipo de rescatista u organización.');
 const matricula=tipo==='veterinario'?texto(d.matricula,80):'',autoridad=tipo==='veterinario'?texto(d.autoridad,180):'';
 if(tipo==='veterinario'&&estado==='Publicado local'&&(!matricula||!autoridad))throw Error('Registrá matrícula y autoridad emisora antes de publicar la ficha de prueba.');
 const ayudas=tipo==='rescatista'?AYUDAS.filter(x=>lista(d.ayudas).includes(x)):[];
 return {id:anterior.id||nuevoId(),tipo,nombre,organizacion,ubicacion:{pais:ubicacion.pais,provincia:ubicacion.provincia,ciudad:ubicacion.ciudad},zona:texto(d.zona,300),especies:texto(d.especies,300),descripcion:texto(d.descripcion,1200),ayudas,matricula,autoridad,especialidad:tipo==='veterinario'?texto(d.especialidad,300):'',contacto:texto(d.contacto,180),notas:texto(d.notas,1200),autorizado,estado,creadoEn:anterior.creadoEn||new Date().toISOString(),actualizadoEn:new Date().toISOString()};
}
// Proyección de directorio: excluye datos de contacto, notas, autorización y datos internos.
export function fichaPublica(p){
 return {id:p.id,tipo:p.tipo,nombre:p.nombre,organizacion:p.organizacion,ubicacion:ubicacionPublica(p.ubicacion),zona:p.zona,especies:p.especies,descripcion:p.descripcion,ayudas:lista(p.ayudas),especialidad:p.especialidad,matricula:p.matricula,autoridad:p.autoridad};
}
export function guardarEspecial(d,tipo,id=null){
 exigirAdminDemo();const datos=leerEspeciales(),prev=id?datos.find(p=>p.id===id&&p.tipo===tipo):null;
 if(id&&!prev)throw Error('La ficha no existe.');const p=validarEspecial(d,tipo,prev||{});
 localStorage.setItem(KEY,JSON.stringify(prev?datos.map(x=>x.id===id?p:x):[...datos,p]));return p;
}
export function archivarEspecial(id){
 exigirAdminDemo();const datos=leerEspeciales();if(!datos.some(p=>p.id===id))throw Error('La ficha no existe.');
 localStorage.setItem(KEY,JSON.stringify(datos.map(p=>p.id===id?{...p,estado:'Archivado',actualizadoEn:new Date().toISOString()}:p)));
}
export function buscarEspeciales(datos,tipo,q='',admin=false){
 return datos.filter(p=>p.tipo===tipo&&(admin||p.estado==='Publicado local')&&normal([p.nombre,p.organizacion,p.ubicacion?.ciudad,p.ubicacion?.provincia,p.ubicacion?.pais,p.zona,p.especies,p.descripcion,p.especialidad].join(' ')).includes(normal(q))).sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
}
const nota=t=>h('p',{class:'suave'},t);
const card=(...c)=>h('article',{class:'especial-card'},...c);
const btn=(t,fn,clase='chip')=>h('button',{type:'button',class:clase,onclick:fn},t);
const campo=(n,t,v='',opts={})=>h('label',{class:'mimo-campo'},t,h('input',{name:n,value:v,...opts}));
const area=(n,t,v='',max=1200)=>h('label',{class:'mimo-campo'},t,h('textarea',{name:n,rows:3,maxlength:max},v));
const selector=(n,t,opts,v)=>h('label',{class:'mimo-campo'},t,h('select',{name:n,required:true},h('option',{value:'',selected:!v},'Seleccionar'),opts.map(x=>{const o=typeof x==='string'?{codigo:x,nombre:x}:x;return h('option',{value:o.codigo,selected:o.codigo===v},o.nombre);} )));
const dato=(t,v)=>v?h('p',{},h('strong',{},t+': '),v):null;
export function crearEspeciales(render){
 const busquedas={rescatista:'',veterinario:''},edicion={rescatista:null,veterinario:null},detalle={rescatista:null,veterinario:null};
 const intentar=fn=>(...a)=>{try{fn(...a);}catch(e){alert(e.message);}};
 function ficha(p){
  const u=p.ubicacion;return card(h('div',{class:'especial-identidad'},h('span',{class:'especial-avatar','aria-hidden':'true'},p.nombre.slice(0,1).toUpperCase()),h('div',{},h('h2',{},p.nombre),nota(p.tipo==='rescatista'?p.organizacion:'Profesional veterinario'),nota('Ficha local · Identidad no verificada'))),u?dato('Ubicación',[u.ciudad,u.provincia,u.nombrePais].join(' · ')):null,dato('Zona de actividad',p.zona),dato('Especies',p.especies),dato('Sobre el perfil',p.descripcion),p.tipo==='rescatista'?dato('Formas de colaborar',p.ayudas.join(' · ')):dato('Especialidad',p.especialidad),p.tipo==='veterinario'?dato('Matrícula declarada (sin verificar)',p.matricula):null,p.tipo==='veterinario'?dato('Autoridad emisora',p.autoridad):null,nota('No hay cuenta asociada, solicitudes, pagos ni contacto directo habilitado.'));
 }
 function editor(tipo,p){
  const x=p||{},u=x.ubicacion||{},rescate=tipo==='rescatista';
  return card(h('h2',{},p?'Editar ficha':'Crear ficha de tercero'),nota('Datos de prueba. La ficha no crea una cuenta ni acredita identidad profesional. No ingreses documentación sensible.'),h('form',{class:'especial-form',onsubmit:intentar(e=>{
   e.preventDefault();const d=new FormData(e.currentTarget);const obj={...Object.fromEntries(d),ubicacion:{pais:d.get('pais'),provincia:d.get('provincia'),ciudad:d.get('ciudad')},ayudas:d.getAll('ayudas'),autorizado:d.has('autorizado')};guardarEspecial(obj,tipo,p?.id||null);edicion[tipo]=null;render();
  })},campo('nombre',rescate?'Nombre visible / organización':'Nombre y apellido profesional',x.nombre||'',{required:true,maxlength:100}),rescate?selector('organizacion','Tipo de perfil',ORGANIZACIONES,x.organizacion||''):null,h('div',{class:'especial-grid'},selector('pais','País',PAISES,u.pais||''),campo('provincia','Provincia / región',u.provincia||'',{required:true,maxlength:100}),campo('ciudad','Ciudad / localidad',u.ciudad||'',{required:true,maxlength:100})),campo('zona','Zona de actividad o cobertura (opcional)',x.zona||'',{maxlength:300}),campo('especies','Especies que atiende o rescata',x.especies||'',{maxlength:300}),area('descripcion','Presentación / trayectoria',x.descripcion||''),rescate?h('fieldset',{class:'especial-checks'},h('legend',{},'Formas de colaborar'),AYUDAS.map(a=>h('label',{class:'fila'},h('input',{type:'checkbox',name:'ayudas',value:a,checked:lista(x.ayudas).includes(a)}),a))):h('div',{class:'especial-grid'},campo('matricula','Matrícula declarada',x.matricula||'',{maxlength:80}),campo('autoridad','Autoridad emisora / jurisdicción',x.autoridad||'',{maxlength:180}),campo('especialidad','Especialidad',x.especialidad||'',{maxlength:300})),h('h3',{},'Gestión privada (solo en esta demostración)'),campo('contacto','Contacto de coordinación (no visible)',x.contacto||'',{maxlength:180}),area('notas','Notas de revisión (sin documentos ni datos sensibles)',x.notas||''),selector('estado','Estado de la ficha',ESTADOS,x.estado||'Borrador'),h('label',{class:'fila'},h('input',{type:'checkbox',name:'autorizado',checked:x.autorizado===true}),'Tengo autorización del titular para publicar esta ficha de prueba.'),h('div',{class:'fila'},h('button',{type:'submit',class:'btn'},'Guardar ficha'),btn('Cancelar',()=>{edicion[tipo]=null;render();}))));
 }
 function vista(tipo){
  const admin=esAdminDemo(),titulo=tipo==='rescatista'?'Rescatistas y protectoras':'Perfiles veterinarios';let datos;
  if(!admin)edicion[tipo]=null;
  try{datos=leerEspeciales();}catch(e){return h('section',{class:'mimo-pila'},h('h1',{},titulo),nota(e.message));}
  const visibles=buscarEspeciales(datos,tipo,busquedas[tipo],admin);
  const abierto=visibles.find(p=>p.id===detalle[tipo]);
  const edit=edicion[tipo]&&edicion[tipo]!=='nuevo'?datos.find(p=>p.id===edicion[tipo]&&p.tipo===tipo):null;
  return h('section',{class:'mimo-pila especial-pagina'},h('h1',{},titulo),nota('Directorio de prueba. No existen perfiles verificados ni cuentas de terceros.'),tipo==='rescatista'?h('a',{class:'chip especial-enlace',href:'#ayuda'},'Ver adopciones y casos de ayuda'):h('a',{class:'chip especial-enlace',href:'#urgencias'},'Ver guardias veterinarias'),admin?h('p',{class:'pronto'},'Administrador local activo. Los borradores y archivados solo se muestran en este modo de prueba.'):null,admin?btn('Crear perfil',()=>{edicion[tipo]='nuevo';detalle[tipo]=null;render();},'btn especial-enlace'):null,admin&&edicion[tipo]?editor(tipo,edit):null,
  h('form',{class:'especial-buscar',onsubmit:e=>{e.preventDefault();busquedas[tipo]=texto(new FormData(e.currentTarget).get('q'));detalle[tipo]=null;render();}},h('input',{name:'q',type:'search',value:busquedas[tipo],placeholder:'Buscar nombre, ciudad o especie','aria-label':'Buscar perfiles'}),h('button',{class:'btn',type:'submit'},'Buscar')),
  abierto?ficha(fichaPublica(abierto)):null,
  h('div',{class:'grilla'},visibles.length?visibles.map(p=>card(h('div',{class:'especial-identidad'},h('span',{class:'especial-avatar','aria-hidden':'true'},p.nombre.slice(0,1).toUpperCase()),h('div',{},h('h3',{},p.nombre),nota(p.ubicacion.ciudad+' · '+p.ubicacion.provincia))),nota(admin?p.estado+' · No verificado':'Ficha local no verificada'),btn(abierto?.id===p.id?'Cerrar ficha':'Ver perfil',()=>{detalle[tipo]=abierto?.id===p.id?null:p.id;render();}),admin?h('div',{class:'fila'},btn('Editar',()=>{edicion[tipo]=p.id;render();}),p.estado!=='Archivado'?btn('Archivar',intentar(()=>{if(confirm('¿Archivar esta ficha de prueba?')){archivarEspecial(p.id);detalle[tipo]=null;edicion[tipo]=null;render();}})):null):null)):nota('Todavía no hay fichas para mostrar.')));
 }
 return {rescatistas:()=>vista('rescatista'),veterinarios:()=>vista('veterinario')};
}
