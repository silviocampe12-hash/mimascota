import { h } from './seguridad.js';
import { avatar, COLORES } from './mascota.js';
import { crearMascota,cargarMascotas,guardarMascotas,obtenerMascotaSeleccionadaId,guardarMascotaSeleccionadaId,nuevoId,fechaLocal,eliminarMascota } from './mascotas.js';
import { validarArchivo,guardarArchivo,leerArchivo,borrarArchivo } from './multimedia.js';
const H = h, boton = (texto,fn,clase='btn') => H('button',{type:'button',class:clase,onclick:fn},texto);
const card = (...hijos) => H('article',{class:'tarjeta'},...hijos);
const fila = (...hijos) => H('div',{class:'fila'},...hijos);
const vacio = texto => H('p',{class:'suave'},texto);
const aviso = error => alert(error?.message || String(error));
const opciones = (nombre,valores,valor) => H('select',{name:nombre},valores.map(v => H('option',{value:v,selected:v===valor},v||'Sin especificar')));
// Campos declarativos: nombre, etiqueta, tipo, opciones y obligatoriedad.
const C = (nombre,etiqueta,tipo='text',opts=null,required=false) => ({nombre,etiqueta,tipo,opts,required});
function campo(c,d={}) {
  const valor = d[c.nombre] ?? '', props = {name:c.nombre,required:c.required};
  let input;
  if (c.opts) input = opciones(c.nombre,c.opts,valor);
  else if (c.tipo==='textarea') input = H('textarea',{...props,rows:3,maxlength:2000},String(valor));
  else input = H('input',{...props,type:c.tipo,value:c.tipo==='file'?null:valor,maxlength:200,min:c.tipo==='number'?0:null,step:c.tipo==='number'?'any':null,accept:c.tipo==='file'?'image/*,application/pdf':null});
  if (c.required) input.required=true;
  return H('label',{class:'mimo-campo'},H('span',{},c.etiqueta),input);
}
function formulario(campos,datos,guardar,texto='Guardar') {
  return H('form',{class:'mimo-form',onsubmit:async e=>{
    e.preventDefault(); const form=e.currentTarget, submit=form.querySelector('button[type=submit]');
    submit.disabled=true;
    try { await guardar(Object.fromEntries(new FormData(form))); } catch(error) { aviso(error); }
    finally { submit.disabled=false; }
  }},campos.map(c=>campo(c,datos)),H('button',{class:'btn',type:'submit'},texto));
}
const perfilCampos = [C('nombre','Nombre','text',null,true),C('especie','Especie','text',null,true),C('raza','Raza'),C('sexo','Sexo','text',['','Hembra','Macho','Otro / desconocido']),C('nacimiento','Fecha de nacimiento','date'),C('edadAproximada','Edad aproximada (años)','number'),C('peso','Peso (kg)','number'),C('tamano','Tamaño'),C('color','Color y características'),C('castrado','Esterilizado / castrado','text',['','Sí','No','No corresponde']),C('sobreMi','Sobre mí','textarea')];
const fecha = (n='fecha',t='Fecha') => C(n,t,'date',null,true);
const texto = (n,t=n,req=false) => C(n,t,'text',null,req);
const notas = C('observaciones','Observaciones','textarea');
const lugar = texto('lugar','Lugar / establecimiento'), profesional = texto('profesional','Profesional');
const prox = C('proximaDosis','Próxima fecha / refuerzo','date');
const clinica = {
  vacunas:['Vacunas',[texto('nombre','Vacuna',true),C('fechaAplicacion','Fecha de aplicación','date'),lugar,profesional,prox,notas]],
  medicamentos:['Medicamentos',[texto('nombre','Medicamento',true),texto('dosis','Dosis indicada'),texto('frecuencia','Frecuencia indicada'),fecha('inicio','Inicio'),C('fin','Fin','date'),profesional,prox,notas]],
  consultas:['Consultas',[fecha(),texto('motivo','Motivo',true),lugar,profesional,texto('diagnostico','Diagnóstico registrado'),C('indicaciones','Indicaciones','textarea'),prox,notas]],
  estudios:['Estudios',[fecha(),texto('nombre','Estudio',true),lugar,profesional,C('resultado','Resultado','textarea'),notas]],
  cirugias:['Cirugías',[fecha(),texto('nombre','Procedimiento',true),lugar,profesional,C('evolucion','Evolución','textarea'),notas]],
  desparasitaciones:['Desparasitación',[fecha(),texto('nombre','Producto',true),profesional,prox,notas]],
  alergias:['Alergias',[texto('nombre','Alérgeno o sospecha',true),C('fecha','Fecha conocida','date'),notas]],
  antecedentes:['Enfermedades y antecedentes',[texto('nombre','Enfermedad / lesión / antecedente',true),C('fecha','Fecha conocida','date'),profesional,notas]],
  peso:['Control de peso',[fecha(),C('peso','Peso (kg)','number',null,true),notas]],
  otros:['Otros cuidados',[fecha(),texto('nombre','Cuidado o tratamiento',true),lugar,profesional,prox,notas]]
};
const agendaCampos = [C('tipo','Tipo','text',['Vacuna','Consulta','Medicamento','Peluquería','Desparasitación','Control','Otro']),texto('titulo','Título',true),fecha(),C('hora','Hora','time'),lugar,notas];
const actividadCampos = [C('tipo','Tipo','text',['Paseo','Juego','Entrenamiento','Natación','Otro']),fecha(),C('hora','Hora','time'),C('duracion','Duración (minutos)','number',null,true),C('distancia','Distancia (km, opcional)','number'),C('intensidad','Intensidad','text',['Baja','Moderada','Alta']),notas];
const urls = new Set();
export function limpiarMedios() { for (const url of urls) URL.revokeObjectURL(url); urls.clear(); }
function medio(id,tipo,principal=false) {
  const caja=H('div',{class:principal?'mimo-principal':'mimo-medio'},vacio('Cargando archivo…'));
  leerArchivo(id).then(blob=>{
    if (!caja.isConnected) return;
    if (!blob) { caja.replaceChildren(vacio('Archivo no disponible')); return; }
    const url=URL.createObjectURL(blob); urls.add(url);
    const el=tipo.startsWith('video/')?H('video',{src:url,controls:true,preload:'metadata'}):H('img',{src:url,alt:'Foto de mascota',loading:'lazy'});
    caja.replaceChildren(el);
  }).catch(()=>{ if(caja.isConnected) caja.replaceChildren(vacio('No se pudo abrir el archivo')); });
  return caja;
}
function retrato(m,mini=false) {
  if(m.fotoPrincipalId && !mini) return medio(m.fotoPrincipalId,'image/jpeg',true);
  if(['perro','gato'].includes(m.especie.toLowerCase())) return avatar({...m,tipo:m.especie.toLowerCase()},mini);
  return H('div',{class:`avatar${mini?' mini':''}`,role:'img','aria-label':m.especie},'\u{1F43E}');
}
function edad(m) {
  if(!m.nacimiento) return m.edadAproximada===''?'Edad sin registrar':`${m.edadAproximada} años aprox.`;
  const hoy=fechaLocal(), n=m.nacimiento;
  return `${Math.max(0,Number(hoy.slice(0,4))-Number(n.slice(0,4))-(hoy.slice(5)<n.slice(5)?1:0))} años`;
}
export function crearVistaMascotas(render) {
  let mascotas=[], fallo=null, seleccion=null, tab='Perfil', categoria='vacunas', editId=null, nuevo=false, editarPerfil=false;
  try { mascotas=cargarMascotas(); seleccion=obtenerMascotaSeleccionadaId(); } catch(e) { fallo=e; }
  const actual=()=>mascotas.find(m=>m.id===seleccion);
  function persistir(next) { guardarMascotas(next); mascotas=next; }
  function cambiar(id,fn) { if(!mascotas.some(m=>m.id===id)) throw Error('El perfil ya no existe.'); persistir(mascotas.map(m=>m.id===id?fn(m):m)); }
  function elegir(id) { guardarMascotaSeleccionadaId(id); seleccion=id; tab='Perfil'; editId=null; nuevo=false; editarPerfil=false; render(); }
  function actualizar(m,datos) { cambiar(m.id,x=>({...x,...datos})); }
  function ficha(m) {
    if(editarPerfil) return card(H('h2',{},'Editar perfil'),formulario(perfilCampos,m,d=>{
      if(!String(d.nombre).trim()||!String(d.especie).trim()) throw Error('Completá nombre y especie.');
      if(d.nacimiento && d.nacimiento>fechaLocal()) throw Error('La fecha de nacimiento no puede ser futura.');
      actualizar(m,{...d,nombre:d.nombre.trim(),especie:d.especie.trim()}); editarPerfil=false; render();
    }),boton('Cancelar',()=>{editarPerfil=false;render();},'chip'));
    return card(H('h2',{},'Perfil'),H('p',{},m.raza||'Raza sin registrar'),H('p',{},`Sexo: ${m.sexo||'Sin registrar'} · ${m.peso===''?'Peso sin registrar':m.peso+' kg'}`),H('p',{},`Tamaño: ${m.tamano||'—'} · Color: ${m.color||'—'}`),H('p',{},`Esterilización: ${m.castrado||'Sin registrar'}`),H('h3',{},'Sobre mí'),H('p',{},m.sobreMi||'Todavía no hay descripción.'),boton('Editar perfil',()=>{editarPerfil=true;render();}),H('p',{class:'suave'},'Colores del avatar'),fila(COLORES.map(c=>H('button',{type:'button',class:'muestra',style:{background:c},'aria-label':`Color principal ${c}`,'aria-pressed':String(m.c1===c),onclick:()=>{actualizar(m,{c1:c});render();}}))),fila(COLORES.map(c=>H('button',{type:'button',class:'muestra',style:{background:c},'aria-label':`Color secundario ${c}`,'aria-pressed':String(m.c2===c),onclick:()=>{actualizar(m,{c2:c});render();}}))));
  }
  function registros(m,clave,campos,items,guardar,extra=null) {
    const edit=items.find(r=>r.id===editId), conArchivo=clave==='salud';
    return H('div',{class:'mimo-pila'},items.length?[...items].sort((a,b)=>(b.fecha||b.fechaAplicacion||b.inicio||'').localeCompare(a.fecha||a.fechaAplicacion||a.inicio||'')).map(r=>card(H('h3',{},r.nombre||r.titulo||r.motivo||r.tipo||(r.peso!==undefined?`${r.peso} kg`:'Registro')),campos.filter(c=>r[c.nombre]!==''&&r[c.nombre]!=null).map(c=>H('p',{},H('strong',{},`${c.etiqueta}: `),String(r[c.nombre]))),r.archivoId?boton('Abrir adjunto privado',async()=>{try{const blob=await leerArchivo(r.archivoId);if(!blob)throw Error('Archivo no disponible');const url=URL.createObjectURL(blob);const a=H('a',{href:url,download:r.archivoNombre||'adjunto'});a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}catch(e){aviso(e);}},'chip'):null,extra?.(r),fila(boton('Editar',()=>{editId=r.id;render();},'chip'),boton('Eliminar',async()=>{if(!confirm('¿Eliminar este registro?'))return;try{guardar(items.filter(x=>x.id!==r.id));editId=null;render();if(r.archivoId)await borrarArchivo(r.archivoId);}catch(e){aviso(e);}},'chip')))):vacio('Todavía no hay registros.'),card(H('h3',{},edit?'Editar registro':'Agregar registro'),formulario([...campos,...(conArchivo?[C('archivo','Adjunto privado (opcional)','file')]:[])],edit||{fecha:fechaLocal(),inicio:fechaLocal()},async d=>{
      const file=d.archivo; delete d.archivo;
      if(d.peso!==undefined && !(Number(d.peso)>0)) throw Error('El peso registrado debe ser mayor que cero.');
      if(clave==='actividad' && !(Number(d.duracion)>0)) throw Error('La duración debe ser mayor que cero.');
      if(clave==='actividad' && d.fecha>fechaLocal()) throw Error('Registrá actividades ya realizadas.');
      if(d.fin && d.inicio && d.fin<d.inicio) throw Error('El fin no puede ser anterior al inicio.');
      if(d.proximaDosis && d.fechaAplicacion && d.proximaDosis<d.fechaAplicacion) throw Error('La próxima dosis no puede ser anterior a la aplicación.');
      const r={...edit,...d,id:edit?.id||nuevoId()}; let archivoNuevo;
      if(file?.size){validarArchivo(file,true);archivoNuevo=nuevoId();await guardarArchivo(archivoNuevo,file);r.archivoId=archivoNuevo;r.archivoNombre=file.name;}
      try { guardar(edit?items.map(x=>x.id===edit.id?r:x):[...items,r]); } catch(e){if(archivoNuevo)await borrarArchivo(archivoNuevo);throw e;}
      editId=null;render();if(archivoNuevo&&edit?.archivoId)await borrarArchivo(edit.archivoId);
    }),edit?boton('Cancelar edición',()=>{editId=null;render();},'chip'):null));
  }
  function salud(m) {
    const key=categoria, [titulo,campos]=clinica[key];
    return H('div',{class:'mimo-pila'},fila(Object.entries(clinica).map(([k,[t]])=>H('button',{type:'button',class:'chip','aria-pressed':String(k===categoria),onclick:()=>{categoria=k;editId=null;render();}},t))),H('h2',{},titulo),registros(m,'salud',campos,m.salud[key],items=>cambiar(m.id,x=>({...x,salud:{...x.salud,[key]:items}}))));
  }
  function agenda(m) {
    const automaticos=Object.entries(m.salud).flatMap(([k,items])=>items.filter(r=>r.proximaDosis).map(r=>({id:r.id,titulo:r.nombre||r.motivo||clinica[k]?.[0],fecha:r.proximaDosis,tipo:clinica[k]?.[0]})));
    const estado=r=>r.completado?'Completado':r.fecha<fechaLocal()?'Vencido':'Pendiente';
    return H('div',{class:'mimo-pila'},card(H('h2',{},'Recordatorios de salud'),automaticos.length?automaticos.sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(r=>H('p',{},`${r.fecha} · ${r.titulo} · ${estado(r)}`)):vacio('Sin próximas fechas clínicas.'),vacio('Los recordatorios clínicos se editan desde Salud.')),H('h2',{},'Turnos y cuidados'),registros(m,'agenda',agendaCampos,m.agenda,items=>actualizar(m,{agenda:items}),r=>fila(H('span',{class:'estado'},estado(r)),boton(r.completado?'Reabrir':'Marcar realizado',()=>{actualizar(m,{agenda:m.agenda.map(x=>x.id===r.id?{...x,completado:!x.completado}:x)});render();},'chip'))),m.rutinaPaseos.length?card(H('h3',{},'Rutina anterior conservada'),m.rutinaPaseos.map(r=>H('p',{},`${r.dia} ${r.hora} · ${r.min} min programados`))):null);
  }
  function actividad(m) {
    const desde=new Date();desde.setDate(desde.getDate()-6);const hoy=fechaLocal();
    const resumen=(inicio)=>{const a=m.actividades.filter(r=>r.fecha>=inicio&&r.fecha<=hoy);const min=a.reduce((s,r)=>s+Number(r.duracion||0),0);return `${a.length} actividades · ${a.filter(r=>r.tipo==='Paseo').length} paseos · ${min} min · promedio ${a.length?Math.round(min/a.length):0} min`;};
    return H('div',{class:'mimo-pila'},card(H('h2',{},'Actividad registrada'),H('h3',{},'Últimos 7 días'),H('p',{},resumen(fechaLocal(desde))),H('h3',{},'Mes actual'),H('p',{},resumen(hoy.slice(0,7)+'-01'))),registros(m,'actividad',actividadCampos,m.actividades,items=>actualizar(m,{actividades:items})));
  }
  function galeria(m) {
    return H('div',{class:'mimo-pila'},card(H('h2',{},'Galería'),vacio('Todo archivo nuevo queda privado. Compartir publica una copia lógica solo en esta demostración local.'),H('form',{class:'mimo-form',onsubmit:async e=>{e.preventDefault();const f=e.currentTarget,b=f.querySelector('button');b.disabled=true;let id;try{const file=f.elements.archivo.files[0];validarArchivo(file);id=nuevoId();await guardarArchivo(id,file);try{cambiar(m.id,x=>({...x,galeria:[...x.galeria,{id,tipo:file.type,nombre:file.name,descripcion:f.elements.descripcion.value,compartido:false,creadoEn:new Date().toISOString()}]}));}catch(error){await borrarArchivo(id);throw error;}render();}catch(error){aviso(error);}finally{b.disabled=false;}}},H('label',{class:'mimo-campo'},'Foto o video',H('input',{name:'archivo',type:'file',accept:'image/*,video/*',required:true})),campo(C('descripcion','Descripción','textarea')),H('button',{class:'btn',type:'submit'},'Guardar en mi galería'))),H('div',{class:'grilla'},m.galeria.map(a=>card(medio(a.id,a.tipo),H('p',{},a.descripcion||a.nombre),H('p',{class:'suave'},a.compartido?'Compartido en Comunidad (local)':'Privado'),fila(a.tipo.startsWith('image/')?boton(m.fotoPrincipalId===a.id?'Quitar foto principal':'Usar como foto principal',()=>{actualizar(m,{fotoPrincipalId:m.fotoPrincipalId===a.id?null:a.id});render();},'chip'):null,boton(a.compartido?'Dejar de compartir':'Compartir en Comunidad',()=>{if(!a.compartido&&!confirm('¿Compartir este archivo en la Comunidad de demostración?'))return;actualizar(m,{galeria:m.galeria.map(x=>x.id===a.id?{...x,compartido:!x.compartido}:x)});render();},'chip'),boton('Eliminar',async()=>{if(!confirm('¿Eliminar este archivo de la galería y Comunidad?'))return;try{actualizar(m,{galeria:m.galeria.filter(x=>x.id!==a.id),fotoPrincipalId:m.fotoPrincipalId===a.id?null:m.fotoPrincipalId});render();await borrarArchivo(a.id);}catch(e){aviso(e);}},'chip'))))));
  }
  function vista() {
    if(fallo) return card(H('h1',{},'Mis mascotas'),H('p',{},'No se pudo abrir el almacenamiento. No se sobrescribieron tus datos.'),vacio(fallo.message));
    const m=actual();
    if(nuevo) return H('section',{class:'mimo-pila'},H('h1',{},'Agregar mascota'),card(formulario(perfilCampos,{especie:'perro'},d=>{if(!d.nombre.trim()||!d.especie.trim())throw Error('Completá nombre y especie.');if(d.nacimiento&&d.nacimiento>fechaLocal())throw Error('La fecha de nacimiento no puede ser futura.');const pet=crearMascota(d);persistir([...mascotas,pet]);elegir(pet.id);})),boton('Cancelar',()=>{nuevo=false;render();},'chip'));
    if(!m) return H('section',{class:'mimo-pila'},H('h1',{},'Mis mascotas'),vacio('Perfiles locales de demostración. No hay cuenta ni sincronización real.'),H('div',{class:'grilla'},mascotas.map(p=>card(retrato(p),H('h2',{},p.nombre),H('p',{},`${p.especie} · ${edad(p)}${p.demo?' · Ejemplo':''}`),boton('Abrir perfil',()=>elegir(p.id))))),boton('Agregar mascota',()=>{nuevo=true;render();}));
    const tabs={Perfil:ficha,Salud:salud,Agenda:agenda,Actividad:actividad,Galería:galeria};
    return H('section',{class:'mimo-pila'},fila(boton('Todas mis mascotas',()=>elegir(null),'chip'),boton('Agregar mascota',()=>{nuevo=true;render();},'chip')),H('div',{class:'hero'},retrato(m),H('div',{},H('h1',{},m.nombre),H('p',{},`${m.especie} · ${edad(m)}${m.demo?' · Ejemplo ficticio':''}`))),fila(Object.keys(tabs).map(t=>H('button',{type:'button',class:'chip','aria-pressed':String(tab===t),onclick:()=>{tab=t;editId=null;editarPerfil=false;render();}},t))),tabs[tab](m),boton('Eliminar perfil',async()=>{if(!confirm(`¿Eliminar a ${m.nombre} y todos sus registros locales?`))return;try{persistir(eliminarMascota(mascotas,m.id));elegir(null);const ids=[...m.galeria.map(a=>a.id),...Object.values(m.salud).flat().map(r=>r.archivoId).filter(Boolean)];await Promise.all(ids.map(borrarArchivo));}catch(e){aviso(e);}},'chip'));
  }
  function publicaciones() {
    return mascotas.flatMap(m=>m.galeria.filter(a=>a.compartido===true).map(a=>card(fila(retrato(m,true),H('h3',{},m.nombre)),medio(a.id,a.tipo),H('p',{},a.descripcion||''),vacio('Publicación de demostración local'),boton('Dejar de compartir',()=>{actualizar(m,{galeria:m.galeria.map(x=>x.id===a.id?{...x,compartido:false}:x)});render();},'chip'))));
  }
  return {vista,publicaciones,colores:()=>({c1:actual()?.c1||'#5B3DF5',c2:actual()?.c2||'#FFC9B5'})};
}
