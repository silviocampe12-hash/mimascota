// La cuenta se fija una sola vez por carga. Los dos datos privados de v15 viven en memoria y Supabase.
let cuenta=null, nube=null;
const claves=new Set(['mimo_persona_v1','mimo_mascotas']);
export function fijarCuenta(id){
 if(!/^[0-9a-f-]{36}$/i.test(id)||cuenta&&cuenta!==id)throw Error('Cambio de cuenta: recargá Mimo.');
 cuenta=id;
}
export function cuentaAlmacen(){if(!cuenta)throw Error('Iniciá sesión primero.');return cuenta;}
function prefijo(){return 'mimo:v11:'+cuentaAlmacen()+':';}
export const almacenLocal={getItem:k=>localStorage.getItem(prefijo()+k),setItem:(k,v)=>localStorage.setItem(prefijo()+k,v),removeItem:k=>localStorage.removeItem(prefijo()+k)};
export function activarNube(datos){nube=new Map(datos);}
export const nubeActiva=()=>nube!==null;
export function establecerDatoNube(k,v){if(!nube||!claves.has(k))throw Error('Almacenamiento remoto no iniciado.');nube.set(k,JSON.stringify(v));}
export const almacen={getItem:k=>claves.has(k)&&nube?nube.get(k)??null:almacenLocal.getItem(k),setItem:(k,v)=>{if(claves.has(k)&&nube)throw Error('Usá el guardado privado de Supabase.');almacenLocal.setItem(k,v);},removeItem:k=>{if(claves.has(k)&&nube)throw Error('Usá el guardado privado de Supabase.');almacenLocal.removeItem(k);}};
export const baseArchivos=()=>prefijo()+'archivos';
