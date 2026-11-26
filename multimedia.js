import { baseArchivos } from './almacenamiento.js?v=11';
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
export const leerArchivo = async id => (await operar('readonly',s => s.get(id)))?.blob;
export const borrarArchivo = id => operar('readwrite',s => s.delete(id));
