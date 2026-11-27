// Turneros de Mimos: agenda y avisos, sin acceso directo a las tablas privadas.
import { h } from './seguridad.js?v=15';
import { sb, resultado } from './supabase.js?v=11';
const zona='America/Argentina/Cordoba';
const rpc=(accion,datos={})=>resultado(sb.rpc('mimo_turnos',{accion,datos}));
const extra=(accion,datos={})=>resultado(sb.rpc('mimo_turnos_extra',{accion,datos}));
const servicios={peluqueria:['Baño','Corte','Baño y corte','Higiene y cepillado'],veterinaria:['Consulta general','Control','Vacunación','Chequeo preventivo']};
const etiquetas={peluqueria:'Peluquería',veterinaria:'Consulta veterinaria'};
const estados={reservado:'Reservado',cancelado:'Cancelado',atendido:'Atendido'};
const avisos={reserva:'Turno reservado',recordatorio:'Faltan 30 minutos',inicio:'Hora del turno'};
const dateFmt=new Intl.DateTimeFormat('sv-SE',{timeZone:zona,year:'numeric',month:'2-digit',day:'2-digit'});
const timeFmt=new Intl.DateTimeFormat('es-AR',{timeZone:zona,hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const fullFmt=new Intl.DateTimeFormat('es-AR',{timeZone:zona,dateStyle:'full',timeStyle:'short'});
const mesFmt=new Intl.DateTimeFormat('es-AR',{month:'long',year:'numeric',timeZone:'UTC'});
const hoy=()=>dateFmt.format(new Date());
const iso=d=>d.toISOString().slice(0,10);
const fechaUTC=s=>new Date(s+'T12:00:00Z');
const sumar=(s,n)=>{const d=fechaUTC(s);d.setUTCDate(d.getUTCDate()+n);return iso(d);};
const hora=h=>String(h).padStart(2,'0')+':00';
const cuando=t=>fullFmt.format(new Date(t));
const franja=t=>timeFmt.format(new Date(t.inicio))+'–'+timeFmt.format(new Date(t.fin));
const nota=t=>h('p',{class:'turnos-nota'},t);
const fila=(...c)=>h('div',{class:'turnos-fila'},...c);
const card=(...c)=>h('article',{class:'turnos-tarjeta'},...c);
const btn=(t,fn,cls='',props={})=>h('button',{type:'button',class:'turnos-boton '+cls,...props,onclick:fn},t);
const cambio=()=>window.dispatchEvent(new Event('mimo-turnos-cambio'));
const puedeCancelar=t=>t.estado==='reservado'&&Date.parse(t.inicio)>Date.now();
const label=(t,c)=>h('label',{class:'turnos-campo'},t,c);
const alertaTexto=a=>avisos[a.clase]||'Aviso de turno';
function ejecutar(b,estado,fn){return async e=>{const x=e.currentTarget;if(x.disabled)return;x.disabled=true;estado.textContent='';try{await fn();}catch(err){estado.textContent=err.message||'No se pudo completar la operación';}finally{x.disabled=false;}};}
function calendario(fecha,mes,seleccionar,mover,gestor=false){
 const primero=new Date(Date.UTC(mes.getUTCFullYear(),mes.getUTCMonth(),1,12));
 const offset=(primero.getUTCDay()+6)%7;
 const total=new Date(Date.UTC(mes.getUTCFullYear(),mes.getUTCMonth()+1,0,12)).getUTCDate();
 const desde=gestor?sumar(hoy(),-90):hoy(),hasta=sumar(hoy(),90);
 const anterior=new Date(Date.UTC(mes.getUTCFullYear(),mes.getUTCMonth()-1,1,12));
 const siguiente=new Date(Date.UTC(mes.getUTCFullYear(),mes.getUTCMonth()+1,1,12));
 const mesActual=desde.slice(0,7),mesMax=hasta.slice(0,7);
 const c=h('div',{class:'turnos-calendario'},fila(btn('‹',()=>mover(anterior),'',{disabled:iso(anterior).slice(0,7)<mesActual,'aria-label':'Mes anterior'}),h('strong',{class:'turnos-mes'},mesFmt.format(mes)),btn('›',()=>mover(siguiente),'',{disabled:iso(siguiente).slice(0,7)>mesMax,'aria-label':'Mes siguiente'})));
 const g=h('div',{class:'turnos-dias'});
 for(const d of ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'])g.append(h('span',{class:'turnos-semana'},d));
 for(let i=0;i<offset;i++)g.append(h('span',{'aria-hidden':'true'}));
 for(let i=1;i<=total;i++){
  const s=iso(new Date(Date.UTC(mes.getUTCFullYear(),mes.getUTCMonth(),i,12)));
  g.append(btn(String(i),()=>seleccionar(s),s===fecha?'turnos-elegido':'',{disabled:s<desde||s>hasta,'aria-pressed':s===fecha,'aria-label':s}));
 }
 c.append(g);return c;
}
export function turneroPerfil(perfil='demo'){
 if(!document.querySelector('link[href*="turnos.css"]'))document.head.append(h('link',{rel:'stylesheet',href:'./turnos.css?v=23'}));
 const demo=perfil==='demo', root=h('section',{class:'turnos-modulo'});
 let tipo='veterinaria', fecha=hoy(), mes=fechaUTC(fecha), duracion=1, seleccion=null, datos=null, version=0, nombreMascota='', servicio='', cargando=false;
 const msg=h('p',{class:'turnos-estado',role:'status','aria-live':'polite'}), cuerpo=h('div',{}), tabs=h('div',{class:'turnos-pestanas',role:'group','aria-label':'Tipo de agenda'});
 function parametros(){return {perfil,tipo,fecha};}
 function cabecera(){
  tabs.replaceChildren(...Object.keys(etiquetas).map(k=>btn(etiquetas[k],()=>{if(tipo===k)return;tipo=k;duracion=1;seleccion=null;servicio='';datos=null;msg.textContent='';cargar();},tipo===k?'turnos-elegido':'',{'aria-pressed':tipo===k})));
 }
 async function cargar(silencioso=false){
  silencioso=silencioso===true;const g=++version;cabecera();cargando=true;
  if(!silencioso){datos=null;cuerpo.replaceChildren(nota('Consultando disponibilidad…'));}
  try{const d=await rpc('listar',parametros());if(g!==version)return;const igual=silencioso&&JSON.stringify(datos)===JSON.stringify(d);datos=d;if(!silencioso||seleccion!==null&&!disponible(seleccion))seleccion=null;cargando=false;if(!igual)pintar();}
  catch(e){if(g===version){cargando=false;if(silencioso){msg.textContent='No se pudo actualizar la disponibilidad. Reintentando…';return;}cuerpo.replaceChildren(nota('No se pudo cargar la agenda: '+e.message),btn('Reintentar',()=>cargar()));}}
 }
 function disponible(hh,d=duracion){
  if(!datos?.activa||hh<9||hh+d>20||Date.parse(fecha+'T'+hora(hh)+':00-03:00')<=Date.now())return false;
  return !(datos.ocupados||[]).some(o=>hh<o.hora+o.duracion&&hh+d>o.hora);
 }
 function pintar(){
  if(!datos||cargando)return;
  const d=datos, bloques=[];
  if(d.puede_habilitar)bloques.push(card(h('strong',{},d.activa?'Agenda habilitada':'Agenda deshabilitada'),nota('El responsable decide si este servicio recibe reservas.'),btn(d.activa?'Deshabilitar nuevas reservas':'Habilitar agenda',ejecutar(null,msg,async()=>{if(!d.activa&&!confirm('¿Confirmás que el titular autorizó habilitar los turnos de este servicio?'))return;await rpc('habilitar',{perfil,tipo,habilitada:!d.activa});await cargar();msg.textContent='Configuración guardada.';}))));
  bloques.push(calendario(fecha,mes,s=>{fecha=s;mes=fechaUTC(s);seleccion=null;msg.textContent='';cargar();},m=>{mes=m;pintar();},d.gestor));
  if(d.activa){
   const dur=h('select',{'aria-label':'Duración del turno',onchange:e=>{duracion=Number(e.currentTarget.value);seleccion=null;pintar();}},[1,2,3,4].map(n=>h('option',{value:n,selected:n===duracion},n+' '+(n===1?'hora':'horas'))));
   const slots=h('div',{class:'turnos-horas',role:'group','aria-label':'Horarios disponibles'});
   for(let hh=9;hh<20;hh++){
    const libre=disponible(hh);const ocupado=(datos.ocupados||[]).some(o=>hh<o.hora+o.duracion&&hh+1>o.hora);const pasado=Date.parse(fecha+'T'+hora(hh)+':00-03:00')<=Date.now();
    const texto=libre?'Libre':ocupado?'Ocupado':pasado?'Pasado':'Sin bloque';const b=btn(hora(hh),()=>{seleccion=hh;pintar();},seleccion===hh?'turnos-elegido':'',{disabled:!libre,'aria-pressed':seleccion===hh,'aria-label':hora(hh),title:texto});b.append(h('small',{},texto));slots.append(b);
   }
   bloques.push(card(h('h3',{},'Elegí un horario'),nota('Horario de prueba: 09:00 a 20:00 · Argentina'),label('Duración',dur),slots,nota('Los horarios grises no están disponibles para la duración elegida.')));
   if(seleccion!==null&&disponible(seleccion)){
    const mascota=h('input',{name:'mascota',value:nombreMascota,required:true,maxlength:80,placeholder:'Nombre de tu mascota',oninput:e=>{nombreMascota=e.currentTarget.value;}});
    const opciones=h('select',{name:'servicio',required:true,onchange:e=>{servicio=e.currentTarget.value;}},servicios[tipo].map(s=>h('option',{value:s,selected:s===(servicio||servicios[tipo][0])},s)));
    const confirmar=h('form',{class:'turnos-form',onsubmit:async e=>{
      e.preventDefault();const f=e.currentTarget,b=f.querySelector('button[type=submit]');if(b.disabled)return;b.disabled=true;msg.textContent='Reservando…';
      try{const fd=new FormData(f);await rpc('reservar',{...parametros(),hora:seleccion,duracion,mascota:fd.get('mascota'),servicio:fd.get('servicio')});nombreMascota='';servicio='';seleccion=null;await cargar();cambio();msg.textContent='Turno confirmado. Podés verlo en Mis turnos.';}
      catch(err){msg.textContent=err.message;await cargar();}finally{b.disabled=false;}
    }},h('h3',{},'Confirmar turno'),h('strong',{},fecha+' · '+hora(seleccion)+' a '+hora(seleccion+duracion)),label('Mascota',mascota),label('Servicio',opciones),demo?nota('Reserva ficticia, únicamente para probar Mimos.'):nota('La reserva queda registrada en la agenda del profesional.'),h('button',{type:'submit',class:'turnos-boton turnos-primario'},'Confirmar reserva'));
    bloques.push(card(confirmar));
   }
  }else bloques.push(nota('Este servicio todavía no recibe reservas.'));
  const lista=d.turnos||[];
  bloques.push(card(h('h3',{},d.gestor?'Agenda del día · gestión':'Mis turnos del día'),nota(d.gestor?'Solo el responsable autorizado o administrador ve el listado completo.':'Los datos de otros clientes no son visibles.'),...(!lista.length?[nota('No hay turnos en esta fecha.')]:lista.map(t=>{
   const controles=[];
   if(t.estado==='reservado'&&(d.gestor||puedeCancelar(t)))controles.push(btn('Cancelar',ejecutar(null,msg,async()=>{if(!confirm('¿Cancelar este turno?'))return;await rpc('cancelar',{...parametros(),id:t.id});await cargar();cambio();msg.textContent='Turno cancelado.';}),'turnos-peligro'));
   if(d.gestor&&t.estado==='reservado'&&Date.parse(t.inicio)>Date.now()){
    const actual=Math.round((Date.parse(t.fin)-Date.parse(t.inicio))/3600000);
    const dd=h('select',{'aria-label':'Nueva duración'},[1,2,3,4].map(n=>h('option',{value:n,selected:n===actual},n+' h')));
    controles.push(fila(dd,btn('Guardar duración',ejecutar(null,msg,async()=>{await extra('duracion',{id:t.id,duracion:Number(dd.value)});await cargar();cambio();msg.textContent='Duración actualizada.';}))));
   }
   if(d.gestor&&t.estado==='reservado'&&Date.parse(t.inicio)<=Date.now())controles.push(btn('Marcar atendido',ejecutar(null,msg,async()=>{await rpc('atender',{...parametros(),id:t.id});await cargar();cambio();msg.textContent='Turno atendido.';})));
   return h('div',{class:'turnos-reserva'},fila(h('strong',{},franja(t)),h('span',{class:'turnos-etiqueta'},estados[t.estado]||t.estado)),h('p',{},t.mascota+' · '+t.servicio),fila(...controles));
  }))));
  cuerpo.replaceChildren(...bloques);
 }
 root.append(h('h2',{},'Turnos'),nota(demo?'Agenda de demostración · No corresponde a una atención real.':'Reservá un horario de atención. No es un servicio de urgencias.'),tabs,msg,cuerpo);
 cargar();const reloj=setInterval(()=>{if(!root.isConnected){clearInterval(reloj);return;}if(!document.hidden&&!cargando&&!root.querySelector('button[type=submit]:disabled')&&!root.contains(document.activeElement))cargar(true);},30000);return root;
}
export const panelTurnos=turneroPerfil;
export function misTurnosVista(){
 const root=h('section',{class:'turnos-modulo turnos-pagina'}), estado=h('p',{class:'turnos-estado',role:'status','aria-live':'polite'}), listado=h('div',{},nota('Cargando…'));
 let sec=0;
 async function cargar(){
  const g=++sec;
  try{
   const [ts,as]=await Promise.all([extra('mis_turnos'),extra('avisos')]);if(g!==sec)return;
   const cards=ts.map(t=>card(fila(h('strong',{},t.nombre),h('span',{class:'turnos-etiqueta'},estados[t.estado]||t.estado)),h('p',{},etiquetas[t.tipo]+' · '+t.servicio),h('p',{},t.mascota+' · '+cuando(t.inicio)+' a '+timeFmt.format(new Date(t.fin))),puedeCancelar(t)?btn('Cancelar turno',ejecutar(null,estado,async()=>{if(!confirm('¿Cancelar esta reserva?'))return;await rpc('cancelar',{perfil:t.perfil,tipo:t.tipo,fecha:dateFmt.format(new Date(t.inicio)),id:t.id});await cargar();cambio();estado.textContent='Turno cancelado.';}),'turnos-peligro'):null));
   const nots=as.map(a=>card(fila(h('strong',{},alertaTexto(a)),h('span',{class:'turnos-etiqueta'},a.leido_en?'Leído':'Nuevo')),h('p',{},a.nombre+' · '+a.mascota+' · '+a.servicio),nota(cuando(a.inicio)),a.leido_en?null:btn('Marcar leído',ejecutar(null,estado,async()=>{await extra('leer_aviso',{id:a.id,clase:a.clase});await cargar();cambio();}))));
   listado.replaceChildren(h('h2',{},'Mis reservas'),...(cards.length?cards:[nota('Todavía no reservaste ningún turno.')]),h('h2',{},'Avisos de turnos'),nota('Se muestran la confirmación, el aviso 30 minutos antes y el inicio. Historial de los últimos 7 días.'),...(nots.length?nots:[nota('No hay avisos disponibles.')]));
  }catch(e){if(g===sec)listado.replaceChildren(nota('No se pudo consultar: '+e.message));}
 }
 root.append(h('h1',{},'Mis turnos'),nota('Reservas y avisos en tu cuenta de Mimos.'),h('a',{href:'#profesionales',class:'turnos-boton'},'Ver directorio veterinario'),btn('Actualizar',cargar),estado,listado);cargar();return root;
}
export function iniciarAvisosTurnos(){
 const box=h('aside',{class:'turnos-aviso-global',hidden:true,'aria-live':'polite','aria-label':'Notificaciones de turnos'});
 document.body.append(box);
 let revision=0, ocupado=false;
 async function actualizar(){
  if(ocupado||document.hidden||!sb)return;ocupado=true;const g=revision;
  try{
   const s=await resultado(sb.auth.getSession());if(g!==revision)return;
   if(!s?.session){box.hidden=true;box.replaceChildren();return;}
   const ns=await extra('avisos');if(g!==revision)return;
   const a=ns.find(n=>!n.leido_en);if(!a){box.hidden=true;box.replaceChildren();return;}
   const msg=h('p',{role:'status',class:'turnos-nota'});
   box.replaceChildren(h('strong',{},alertaTexto(a)),h('p',{},a.mascota+' · '+a.servicio+' · '+cuando(a.inicio)),fila(h('a',{href:'./#turnos',class:'turnos-boton'},'Mis turnos'),btn('Marcar leído',ejecutar(null,msg,async()=>{await extra('leer_aviso',{id:a.id,clase:a.clase});box.hidden=true;await actualizar();}))),msg);box.hidden=false;
  }catch(e){if(g===revision){box.hidden=true;box.replaceChildren();}}finally{ocupado=false;}
 }
 if(!sb)return;
 sb.auth.onAuthStateChange((event)=>{revision++;box.hidden=true;box.replaceChildren();if(event!=='SIGNED_OUT')setTimeout(actualizar,0);});
 const timer=setInterval(actualizar,30000);
 window.addEventListener('mimo-turnos-cambio',actualizar);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)actualizar();});
 window.addEventListener('pagehide',()=>{clearInterval(timer);});
 actualizar();
}
