import { h } from './seguridad.js?v=15';
import { esAdmin, rolActual, cuentaActual, verificar, salir } from './sesion.js?v=22';
export function accesoRuta(ruta,tieneMascota,admin=esAdmin()){
 if(ruta==='admin')return admin;
 // Las secciones comunes no requieren una mascota ni un permiso administrativo.
 return true;
}
export function crearAdmin(render){return ()=>h('section',{class:'mimo-pila especial-pagina'},h('h1',{},'Administración'),h('article',{class:'especial-card'},h('h2',{},rolActual()||'Sin permiso administrativo'),h('p',{},cuentaActual()?.email||''),h('p',{class:'suave'},'Permiso comprobado en Supabase. Los directorios tienen protección de servidor. Los demás módulos aún son prototipos locales.'),h('button',{type:'button',class:'chip',onclick:async()=>{try{await verificar();render();}catch(e){alert(e.message);render();}}},'Actualizar permisos'),h('button',{type:'button',class:'chip',onclick:()=>salir().catch(e=>alert(e.message))},'Cerrar sesión')),esAdmin()?h('div',{class:'grilla'},h('article',{class:'especial-card'},h('h2',{},'Rescatistas'),h('a',{class:'btn',href:'#rescatistas'},'Gestionar rescatistas')),h('article',{class:'especial-card'},h('h2',{},'Veterinarios'),h('a',{class:'btn',href:'#profesionales'},'Gestionar veterinarios'))):null);}
