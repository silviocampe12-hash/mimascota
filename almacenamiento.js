// La cuenta se fija una sola vez por carga de la aplicación. No se migran datos anteriores.
// Separación funcional de prototipos, NO protección frente a inspección del navegador.
let cuenta=null;
export function fijarCuenta(id){
 if(!/^[0-9a-f-]{36}$/i.test(id)||cuenta&&cuenta!==id)throw Error('Cambio de cuenta: recargá Mimo.');
 cuenta=id;
}
function prefijo(){if(!cuenta)throw Error('Iniciá sesión primero.');return 'mimo:v11:'+cuenta+':';}
export const almacen={getItem:k=>localStorage.getItem(prefijo()+k),setItem:(k,v)=>localStorage.setItem(prefijo()+k,v),removeItem:k=>localStorage.removeItem(prefijo()+k)};
export const baseArchivos=()=>prefijo()+'archivos';
