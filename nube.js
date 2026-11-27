import { sb, resultado } from './supabase.js?v=11';
import { cuentaAlmacen, almacenLocal, activarNube, establecerDatoNube, nubeActiva } from './almacenamiento.js?v=15';
import { leerArchivoLocal, guardarArchivoNube, leerArchivoNube } from './multimedia.js?v=15';
const CLAVES=['mimo_persona_v1','mimo_mascotas'];
const revs=new Map(), enCurso=new Set();
const tabla=()=>sb.from('mimo_cuenta_datos');
const mensaje='Los datos cambiaron en otro dispositivo. Recargá Mimo antes de volver a editar. No se sobrescribió la versión de la nube.';
export async function guardarNube(clave,contenido){
 if(!nubeActiva()||!CLAVES.includes(clave))throw Error('No se abrió tu almacenamiento privado.');
 if(enCurso.has(clave))throw Error('Hay un guardado en curso. Esperá a que termine.');
 enCurso.add(clave);
 try{
  const propietario=cuentaAlmacen(), r=revs.get(clave);
  let fila;
  if(r===undefined){
   const {data,error}=await tabla().insert({propietario,clave,contenido}).select('revision').single();
   if(error?.code==='23505')throw Error(mensaje);
   if(error)throw Error(error.message);fila=data;
  }else{
   fila=await resultado(tabla().update({contenido,revision:r+1,actualizado_en:new Date().toISOString()}).eq('propietario',propietario).eq('clave',clave).eq('revision',r).select('revision').maybeSingle());
   if(!fila)throw Error(mensaje);
  }
  revs.set(clave,Number(fila.revision));establecerDatoNube(clave,contenido);
 }finally{enCurso.delete(clave);}
}
function datosLocales(clave){
 const raw=almacenLocal.getItem(clave); if(!raw)return null;
 const x=JSON.parse(raw);
 if(clave==='mimo_mascotas'){
  if(!Array.isArray(x))throw Error('Colección local inválida');
  const reales=x.filter(p=>p&&p.id&&!p.demo);return reales.length?reales:null;
 }
 return x&&typeof x==='object'&&x.creado===true?x:null;
}
function referencias(clave,datos){
 if(clave==='mimo_persona_v1')return datos.fotoId?[datos.fotoId]:[];
 return [...new Set(datos.flatMap(m=>[m.fotoPrincipalId,...(m.galeria||[]).map(a=>a.id),...Object.values(m.salud||{}).flat().map(a=>a?.archivoId)].filter(Boolean)))];
}
async function copiarArchivos(clave,datos){
 const faltan=[];
 for(const id of referencias(clave,datos)){
  const blob=await leerArchivoLocal(id);
  if(!blob){try{if(await leerArchivoNube(id))continue;}catch{}faltan.push(id);continue;}
  await guardarArchivoNube(id,blob,true);
 }
 return faltan;
}
// Nunca se sustituye una fila existente con una copia local. Se pregunta una vez por dato.
export async function prepararNube({importar=true}={}){
 const propietario=cuentaAlmacen();
 const filas=await resultado(tabla().select('clave,contenido,revision').eq('propietario',propietario));
 revs.clear();const datos=[];
 for(const f of filas){if(CLAVES.includes(f.clave)){revs.set(f.clave,Number(f.revision));datos.push([f.clave,JSON.stringify(f.contenido)]);}}
 activarNube(datos);
 if(!importar)return;
 for(const clave of CLAVES){
  let local;try{local=datosLocales(clave);}catch(e){alert('No se pudo interpretar tu copia local. Se conserva sin modificar: '+e.message);continue;}
  if(!local)continue;
  const etiqueta=clave==='mimo_persona_v1'?'perfil personal (incluye datos privados guardados)':'mascotas, salud, agenda y archivos';
  const marca='mimo_v15_importado_'+clave;
  if(revs.has(clave)){
   if(!almacenLocal.getItem(marca)){alert('Ya existe una versión en la nube de '+etiqueta+'. No se reemplazará con este navegador. La copia anterior se conserva localmente.');try{almacenLocal.setItem(marca,'nube-existente');}catch{}}
   continue;
  }
  if(!confirm('Encontramos '+etiqueta+' en este navegador. ¿Querés copiarlo a tu cuenta privada de Supabase? Se conservará el original local.'))continue;
  try{
   const faltan=await copiarArchivos(clave,local);
   if(faltan.length&&!confirm(`Hay ${faltan.length} archivo(s) que no están disponibles en este dispositivo. ¿Guardar los datos igualmente? Las referencias se conservan.`))continue;
   await guardarNube(clave,local);try{almacenLocal.setItem(marca,'importado');}catch{}
   alert('Importado a Supabase: '+etiqueta+(faltan.length?'. Algunos archivos no pudieron recuperarse.':'.'));
  }catch(e){alert('No se completó la importación de '+etiqueta+'. Tu copia local se conserva. '+e.message);}
 }
}
