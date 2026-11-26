// Mimo: guardias veterinarias. Prototipo local, sin verificación profesional.
import { h } from './seguridad.js';
import { nuevoId } from './mascotas.js?v=8';
const KEY = 'mimo_guardias_v1';
const ZONA = 'America/Argentina/Buenos_Aires';
const formato = new Intl.DateTimeFormat('es-AR',{timeZone:ZONA,dateStyle:'short',timeStyle:'short'});
const campoFecha = new Intl.DateTimeFormat('sv-SE',{timeZone:ZONA,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const fechaInput = ms => campoFecha.format(new Date(ms)).replace(' ','T');
// En esta versión todos los horarios corresponden a Argentina (UTC-3).
export const instante = valor => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(valor) ? Date.parse(`${valor}:00-03:00`) : NaN;
export function estadoGuardia(g,ahora=Date.now()) {
  if (g.cancelada) return 'Cancelada';
  if (ahora < instante(g.inicio)) return 'Próxima';
  if (ahora < instante(g.fin)) return 'En guardia';
  return 'Finalizada';
}
export function telefonoInternacional(valor) {
  const n = String(valor || '').trim().replace(/[\s()-]/g,'');
  return /^\+[1-9]\d{7,14}$/.test(n) ? n : '';
}
export const enlacesContacto = g => g.demo ? {} : {
  llamada: telefonoInternacional(g.telefono) ? `tel:${telefonoInternacional(g.telefono)}` : '',
  whatsapp: telefonoInternacional(g.whatsapp) ? `https://wa.me/${telefonoInternacional(g.whatsapp).slice(1)}` : ''
};
function ejemplos() {
  const ahora=Date.now(), hora=3600000;
  const base={demo:true,localidad:'Localidad de ejemplo',direccion:'Domicilio ficticio',modalidad:'Presencial',especies:'Perros y gatos',telefono:'',whatsapp:''};
  return [
    {...base,id:'demo-1',nombre:'Dra. Veterinaria (ejemplo)',inicio:fechaInput(ahora-hora),fin:fechaInput(ahora+3*hora)},
    {...base,id:'demo-2',nombre:'Clínica veterinaria (ejemplo)',inicio:fechaInput(ahora+4*hora),fin:fechaInput(ahora+10*hora),modalidad:'A coordinar por teléfono'}
  ];
}
const boton=(texto,fn,clase='btn')=>h('button',{type:'button',class:clase,onclick:fn},texto);
const card=(...hijos)=>h('article',{class:'tarjeta'},...hijos);
const suave=texto=>h('p',{class:'suave'},texto);
const fila=(...hijos)=>h('div',{class:'fila'},...hijos);
const campo=(name,etiqueta,type='text',value='',required=true)=>h('label',{class:'mimo-campo'},etiqueta,h('input',{name,type,value,required,maxlength:150}));
const mostrarFecha=v=>formato.format(instante(v));
export function crearVistaGuardias(render) {
  let guardias=[], error='', gestion=false, editId=null;
  try {
    const datos=JSON.parse(localStorage.getItem(KEY)||'[]');
    if(!Array.isArray(datos)) throw Error('Datos de guardias inválidos.');
    guardias=datos;
  } catch(e) { error=e.message; }
  function persistir(nuevas) {
    localStorage.setItem(KEY,JSON.stringify(nuevas));
    guardias=nuevas;
  }
  function guardar(d) {
    const inicio=instante(d.inicio), fin=instante(d.fin);
    if(!Number.isFinite(inicio)||!Number.isFinite(fin)||fin<=inicio||fin<=Date.now()) throw Error('Ingresá un turno válido con fecha de fin futura.');
    if(!d.nombre.trim()||!d.localidad.trim()) throw Error('Completá profesional y localidad.');
    const telefono=telefonoInternacional(d.telefono), whatsapp=telefonoInternacional(d.whatsapp);
    if((d.telefono&&!telefono)||(d.whatsapp&&!whatsapp)||(!telefono&&!whatsapp)) throw Error('Ingresá al menos un contacto válido, con + y código de país.');
    if(!d.autorizado) throw Error('Confirmá que los contactos son propios o autorizados.');
    const anterior=guardias.find(g=>g.id===editId);
    const g={id:anterior?.id||nuevoId(),nombre:d.nombre.trim(),localidad:d.localidad.trim(),direccion:d.direccion.trim(),especies:d.especies.trim(),modalidad:d.modalidad,inicio:d.inicio,fin:d.fin,telefono,whatsapp,cancelada:anterior?.cancelada||false,demo:false};
    persistir(anterior?guardias.map(x=>x.id===g.id?g:x):[...guardias,g]);
    editId=null; render();
  }
  function tarjeta(g,administrar=false) {
    const estado=estadoGuardia(g), links=enlacesContacto(g);
    const contacto=estado==='En guardia'&&!g.demo&&!administrar;
    return card(h('h3',{},g.nombre),h('p',{},`${g.localidad} · ${g.modalidad}`),
      g.direccion?h('p',{},g.direccion):null,g.especies?h('p',{},`Atiende: ${g.especies}`):null,
      h('p',{},`Desde ${mostrarFecha(g.inicio)} hasta ${mostrarFecha(g.fin)}`),
      h('p',{},h('span',{class:estado==='En guardia'?'estado':'estado vencida'},estado)),
      suave(g.demo?'Ejemplo ficticio · sin contacto real':'Registro local de prueba · no verificado'),
      contacto?fila(links.llamada?h('a',{class:'btn sos',href:links.llamada},'☎ Llamar'):null,links.whatsapp?h('a',{class:'btn',href:links.whatsapp,target:'_blank',rel:'noopener noreferrer'},'WhatsApp'):null):null,
      g.demo&&estado==='En guardia'?fila(h('button',{class:'btn sos',disabled:true},'Llamar'),h('button',{class:'btn',disabled:true},'WhatsApp')):null,
      administrar?fila(boton('Editar',()=>{editId=g.id;render();},'chip'),boton(g.cancelada?'Reactivar':'Cancelar guardia',()=>{
        try { if(g.cancelada&&instante(g.fin)<=Date.now()) throw Error('El turno ya terminó. Editá sus fechas.');
          persistir(guardias.map(x=>x.id===g.id?{...x,cancelada:!x.cancelada}:x));render(); } catch(e){alert(e.message);}
      },'chip'),boton('Eliminar',()=>{if(confirm('¿Eliminar esta guardia?')){try{persistir(guardias.filter(x=>x.id!==g.id));editId=null;render();}catch(e){alert(e.message);}}},'chip')):null);
  }
  function formulario() {
    const g=guardias.find(x=>x.id===editId)||{};
    const ahora=Date.now();
    const modal=h('select',{name:'modalidad'},['Presencial','A coordinar por teléfono','A domicilio'].map(v=>h('option',{value:v,selected:v===g.modalidad},v)));
    return card(h('h2',{},editId?'Editar guardia':'Programar guardia'),
      h('form',{class:'mimo-form',onsubmit:e=>{e.preventDefault();try{guardar(Object.fromEntries(new FormData(e.currentTarget)));}catch(err){alert(err.message);}}},
        campo('nombre','Nombre del profesional o clínica','text',g.nombre),campo('localidad','Localidad y provincia','text',g.localidad),
        campo('direccion','Dirección (opcional)','text',g.direccion,false),campo('especies','Especies que atiende','text',g.especies,false),
        h('label',{class:'mimo-campo'},'Modalidad de guardia',modal),
        campo('inicio','Inicio de guardia (Argentina)','datetime-local',g.inicio||fechaInput(ahora)),campo('fin','Fin de guardia (Argentina)','datetime-local',g.fin||fechaInput(ahora+3600000)),
        campo('telefono','Número para llamadas (+54...)','tel',g.telefono,false),campo('whatsapp','Número de WhatsApp (+549...)','tel',g.whatsapp,false),
        h('label',{},h('input',{type:'checkbox',name:'autorizado',required:true}),' Confirmo que los números son propios o tengo autorización para usarlos.'),
        h('button',{class:'btn',type:'submit'},'Guardar guardia')),suave('Los números y turnos se guardan solo en este navegador.'));
  }
  function listado(caja) {
    const todos=[...guardias,...ejemplos()];
    const grupo=estado=>todos.filter(g=>estadoGuardia(g)===estado).sort((a,b)=>instante(a.inicio)-instante(b.inicio));
    const activos=grupo('En guardia'), proximos=grupo('Próxima');
    caja.replaceChildren(h('h2',{},'En guardia ahora'),
      guardias.some(g=>estadoGuardia(g)==='En guardia')?null:suave('No hay guardias reales verificadas en este prototipo.'),
      h('div',{class:'grilla'},activos.map(g=>tarjeta(g))),h('h2',{},'Próximas guardias'),
      h('div',{class:'grilla'},proximos.length?proximos.map(g=>tarjeta(g)):suave('Sin turnos próximos.')));
  }
  return function vista() {
    const encabezado=[h('h1',{},'Guardias veterinarias'),h('p',{class:'pronto'},'Demostración local: no es un servicio de emergencias operativo. Ante una urgencia, contactá directamente a un servicio veterinario confirmado.'),
      suave('Horarios de Argentina. La guardia declarada no garantiza disponibilidad ni respuesta inmediata.')];
    if(error) return h('section',{class:'mimo-pila'},...encabezado,card(h('p',{},`No se pudo leer el almacenamiento: ${error}`)));
    const alternar=boton(gestion?'Ver guardias':'Soy veterinario · gestionar guardias',()=>{gestion=!gestion;editId=null;render();},'chip');
    if(gestion) return h('section',{class:'mimo-pila'},...encabezado,alternar,formulario(),h('h2',{},'Mis turnos locales'),h('div',{class:'grilla'},guardias.length?guardias.map(g=>tarjeta(g,true)):suave('Todavía no programaste turnos.')));
    const caja=h('div',{class:'mimo-pila'}); listado(caja);
    const reloj=setInterval(()=>{if(!caja.isConnected){clearInterval(reloj);return;}listado(caja);},30000);
    return h('section',{class:'mimo-pila'},...encabezado,caja,alternar);
  };
}
