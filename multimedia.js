import { baseArchivos, cuentaAlmacen, nubeActiva } from './almacenamiento.js?v=15';
import { sb, resultado } from './supabase.js?v=11';
// IndexedDB guarda los archivos como Blob; localStorage conserva solo sus referencias.
let conexion;
function abrir() {
  return conexion ??= new Promise((resolve,reject) => {
    const req = indexedDB.open(baseArchivos(),1);
    req.onupgradeneeded = () => req.result.createObjectStore('archivos',{keyPath:'id'});
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => { conexion = undefined; reject(req.error); };
  });
}
async function operar(modo,accion) {
  const db = await abrir();
  return new Promise((resolve,reject) => {
    const tx = db.transaction('archivos',modo);
    const req = accion(tx.objectStore('archivos'));
    tx.oncomplete = () => resolve(req.result);
    tx.onabort = tx.onerror = () => reject(tx.error || req.error);
  });
}
const imagenes = ['image/jpeg','image/png','image/webp','image/gif','image/avif'];
const videos = ['video/mp4','video/webm','video/ogg','video/quicktime'];
export function validarArchivo(file,clinico=false) {
  const tipos = clinico ? [...imagenes,'application/pdf'] : [...imagenes,...videos];
  if (!file || !tipos.includes(file.type)) throw new Error('Formato no compatible.');
  if (file.size > (clinico ? 15 : 50)*1024*1024) throw new Error('Archivo demasiado grande.');
}
export const guardarArchivo = (id,file) => operar('readwrite',s => s.put({id,blob:file}));
export const leerArchivoLocal = async id => (await operar('readonly',s => s.get(id)))?.blob;
export const borrarArchivo = id => operar('readwrite',s => s.delete(id));

const bucket=()=>sb.storage.from('mimo-privado-v15');
const ruta=id=>{if(!/^[A-Za-z0-9_-]{1,100}$/.test(String(id)))throw Error('Identificador de archivo inválido.');return cuentaAlmacen()+'/'+id;};
export async function guardarArchivoNube(id,file,migracion=false){
 if(!nubeActiva())throw Error('Almacenamiento privado no iniciado.');
 validarArchivo(file,file.type==='application/pdf');
 const path=ruta(id);
 if(migracion){try{if(await leerArchivoNube(id))return;}catch{}}
 await resultado(bucket().upload(path,file,{contentType:file.type,upsert:false}));
}
export async function leerArchivoNube(id){return await resultado(bucket().download(ruta(id)));}
// Las referencias ya confirmadas se descargan únicamente de la cuenta autenticada.
// Los archivos previos se dejan en el navegador; los módulos locales todavía pueden consultarlos.
export async function leerArchivo(id){
 const local=await leerArchivoLocal(id).catch(()=>undefined);if(local)return local;
 if(nubeActiva())return leerArchivoNube(id).catch(()=>undefined);
}
export async function borrarArchivoNube(id){await resultado(bucket().remove([ruta(id)]));}
