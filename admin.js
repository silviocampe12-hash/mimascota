// Modo de desarrollo LOCAL, no autenticación. Nunca usar para conceder permisos reales.
import { h } from './seguridad.js';
const KEY='mimo_admin_demo_v1';
export function esAdminDemo(){try{return sessionStorage.getItem(KEY)==='1';}catch{return false;}}
export function cambiarAdminDemo(activo){
 if(activo)sessionStorage.setItem(KEY,'1');else sessionStorage.removeItem(KEY);
}
export function exigirAdminDemo(){if(!esAdminDemo())throw Error('Activá primero el modo administrador de prueba.');}
export function accesoRuta(ruta,tieneMascota,admin=esAdminDemo()){
 return admin||tieneMascota||['mascota','persona','admin'].includes(ruta);
}
export function crearAdmin(render){
 return ()=>h('section',{class:'mimo-pila especial-pagina'},h('h1',{},'Administración'),
 h('p',{class:'pronto'},'MODO DE PRUEBA LOCAL. Cualquier persona con acceso al código puede activarlo. No hay autenticación ni permisos de servidor. Usá solamente datos ficticios o autorizados.'),
 h('article',{class:'especial-card'},h('h2',{},esAdminDemo()?'Administrador de prueba activo':'Activar administrador de prueba'),
 h('p',{},'Permite recorrer las secciones sin mascota registrada y crear, editar, publicar localmente y archivar fichas especiales de terceros. No convierte tu perfil personal en rescatista ni veterinario.'),
 h('button',{type:'button',class:'btn',onclick:()=>{try{cambiarAdminDemo(!esAdminDemo());render();}catch(e){alert('No se pudo cambiar el modo: '+e.message);}}},esAdminDemo()?'Salir del modo administrador':'Activar modo administrador')),
 esAdminDemo()?h('div',{class:'grilla'},h('article',{class:'especial-card'},h('h2',{},'Rescatistas'),h('p',{},'Personas y organizaciones que ayudan a animales.'),h('a',{class:'btn',href:'#rescatistas'},'Gestionar rescatistas')),h('article',{class:'especial-card'},h('h2',{},'Veterinarios'),h('p',{},'Fichas profesionales de terceros, sin modificar guardias.'),h('a',{class:'btn',href:'#profesionales'},'Gestionar veterinarios'))):null,
 h('p',{class:'suave'},'El modo dura en esta sesión de la pestaña. Las fichas de prueba quedan en el almacenamiento de este navegador. Cerrar el modo no borra los registros.'));
}
