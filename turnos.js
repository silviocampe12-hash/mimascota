// Turnero piloto: un módulo aislado, sin modificar la agenda personal ni la mensajería.
import {h} from './seguridad.js?v=15';
import {sb,resultado} from './supabase.js?v=11';

const TZ='America/Argentina/Cordoba';
const tipos={peluqueria:['Baño','Corte','Baño y corte','Higiene y cepillado'],veterinaria:['Consulta general','Control','Vacunación','Chequeo preventivo']};
const nombre={peluqueria:'Peluquería',veterinaria:'Veterinaria'};
const aviso={reserva:'Nueva reserva confirmada',recordatorio:'Recordatorio de 30 minutos',inicio:'Inicio del turno'};
const pad=n=>String(n).padStart(2,'0');
const diaLocal=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const fechaUTC=s=>new Date(s+'T12:00:00Z');
const iso=d=>d.toISOString().slice(0,10);
const moverDia=(s,n)=>{const d=fechaUTC(s);d.setUTCDate(d.getUTCDate()+n);return iso(d);};
const mesMover=(s,n)=>{const d=fechaUTC(s+'-01');d.setUTCMonth(d.getUTCMonth()+n);return iso(d).slice(0,7);};
const formatoFecha=s=>new Intl.DateTimeFormat('es-AR',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long'}).format(fechaUTC(s));
const formatoHora=t=>new Intl.DateTimeFormat('es-AR',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(t));
const fechaHora=t=>new Intl.DateTimeFormat('es-AR',{timeZone:TZ,day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(t));
const horaTexto=n=>pad(n)+':00';
const boton=(t,fn,clase='chip',opts={})=>h('button',{type:'button',class:clase,onclick:fn,...opts},t);
const nota=t=>h('p',{class:'suave'},t);
function css(){if(!document.getElementById('mimo-turnero-css'))document.head.append(h('link',{id:'mimo-turnero-css',rel:'stylesheet',href:'./turnos.css?v=1'}));}

export function panelTurnos(perfil){
 css();
 const demo=perfil==='demo';
 let tipo='veterinaria',fecha=diaLocal(),mes=fecha.slice(0,7),duracion=1,hora=null,mascota='',servicio=tipos[tipo][0],datos=null,serie=0,ocupadoGuardando=false;
 const root=h('section',{class:'turnero-piloto','aria-label':'Agenda de turnos'});
 const tabs=h('div',{class:'turnero-tabs','aria-label':'Tipo de servicio'});
 const estado=h('p',{class:'turnero-estado',role:'status','aria-live':'polite'});
 const calendario=h('div',{class:'turnero-calendario'});
 const configuracion=h('div',{class:'turnero-config'});
 const huecos=h('div',{class:'turnero-huecos'});
 const formulario=h('form',{class:'turnero-form'});
 const lista=h('div',{class:'turnero-lista'});
 const alertas=h('div',{class:'turnero-alertas'});
 const avisoVivo=h('p',{class:'turnero-aviso','aria-live':'polite'});
 let confirmar=null, resumen=null, ultimaFirma='', alertasVistas=new Set();
 const rpc=(accion,extra={})=>resultado(sb.rpc('mimo_turnos',{accion,datos:{perfil,tipo,fecha,...extra}}));
 const mensaje=(t,error=false)=>{estado.textContent=t;estado.classList.toggle('turnero-error',error);};
 const fechaLimite=()=>moverDia(diaLocal(),90);
 const fechaMin=()=>moverDia(diaLocal(),-90);
 function ocupado(n,d=1){return (datos?.ocupados||[]).some(x=>x.hora<n+d&&x.hora+x.duracion>n);}
 function pasado(n){return Date.parse(fecha+'T'+horaTexto(n)+':00-03:00')<=Date.now();}
 function libre(n){return !!datos?.activa&&fecha>=diaLocal()&&n>=9&&n+duracion<=20&&!pasado(n)&&!ocupado(n,duracion);}
 function actualizarSeleccion(){
   if(hora!==null&&!libre(hora))hora=null;
   if(resumen)resumen.textContent=hora===null?'Seleccioná un horario libre.':formatoFecha(fecha)+' · '+horaTexto(hora)+'–'+horaTexto(hora+duracion)+' h';
   if(confirmar)confirmar.disabled=ocupadoGuardando||hora===null||!datos?.activa;
 }
 function pintarTabs(){
   tabs.replaceChildren(...Object.keys(tipos).map(t=>boton(nombre[t],()=>{if(t===tipo||ocupadoGuardando)return;tipo=t;duracion=1;hora=null;servicio=tipos[t][0];datos=null;ultimaFirma='';alertasVistas=new Set();avisoVivo.textContent='';alertas.replaceChildren();pintarTodo();cargar();},'turnero-tab',{'aria-pressed':String(t===tipo)})));
 }
 function pintarCalendario(){
   const primero=fechaUTC(mes+'-01'), inicio=(primero.getUTCDay()+6)%7, dias=new Date(Date.UTC(primero.getUTCFullYear(),primero.getUTCMonth()+1,0)).getUTCDate();
   const titulo=new Intl.DateTimeFormat('es-AR',{timeZone:'UTC',month:'long',year:'numeric'}).format(primero);
   const nav=h('div',{class:'turnero-nav'},boton('‹',()=>{mes=mesMover(mes,-1);pintarCalendario();},'chip',{'aria-label':'Mes anterior',disabled:mes<=fechaMin().slice(0,7)}),h('strong',{},titulo),boton('›',()=>{mes=mesMover(mes,1);pintarCalendario();},'chip',{'aria-label':'Mes siguiente',disabled:mes>=fechaLimite().slice(0,7)}));
   const grilla=h('div',{class:'turnero-dias'},...['Lu','Ma','Mi','Ju','Vi','Sá','Do'].map(x=>h('span',{class:'turnero-semana'},x)));
   for(let i=0;i<inicio;i++)grilla.append(h('span',{'aria-hidden':'true'}));
   for(let i=1;i<=dias;i++){const key=mes+'-'+pad(i);grilla.append(boton(String(i),()=>{if(ocupadoGuardando)return;fecha=key;hora=null;datos=null;pintarCalendario();pintarDatos();cargar();},'turnero-dia'+(key===fecha?' elegido':'')+(key===diaLocal()?' hoy':''),{'aria-label':formatoFecha(key),'aria-pressed':String(key===fecha),disabled:key<fechaMin()||key>fechaLimite()}));}
   calendario.replaceChildren(nav,grilla,h('p',{class:'turnero-fecha'},formatoFecha(fecha)));
 }
 function pintarConfig(){
   if(!datos){configuracion.replaceChildren();return;}
   configuracion.replaceChildren(datos.activa?nota('Horarios de prueba: 09 a 20 h · Argentina'):nota('Esta agenda todavía no está habilitada por el responsable.'),datos.puede_habilitar?boton(datos.activa?'Deshabilitar agenda':'Habilitar agenda',async()=>{if(ocupadoGuardando)return;const habilitada=!datos.activa;if(habilitada&&!window.confirm('¿Confirmás que el titular autorizó habilitar los turnos de este servicio?'))return;await mutar('habilitar',{habilitada},habilitada?'Agenda habilitada.':'Agenda deshabilitada.');}):null);
 }
 function pintarHuecos(){
   if(!datos){huecos.replaceChildren(nota('Consultando disponibilidad…'));actualizarSeleccion();return;}
   if(!datos.activa){huecos.replaceChildren();actualizarSeleccion();return;}
   actualizarSeleccion();
   const grilla=h('div',{class:'turnero-horas'});
   for(let n=9;n<20;n++){
     const estadoHora=ocupado(n)?'Ocupado':pasado(n)?'Pasado':n+duracion>20||ocupado(n,duracion)?'Sin bloque completo':'Libre';
     const disponible=libre(n);
     grilla.append(boton(h('span',{},h('strong',{},horaTexto(n)),h('small',{},estadoHora)),()=>{hora=n;pintarHuecos();},'turnero-hora'+(hora===n?' elegido':''),{disabled:!disponible||ocupadoGuardando,'aria-pressed':String(hora===n)}));
   }
   huecos.replaceChildren(h('h4',{},'Horarios'),grilla);
   actualizarSeleccion();
 }
 function pintarFormulario(){
   const campoMascota=h('input',{name:'mascota',required:true,maxlength:80,value:mascota,placeholder:demo?'Ej.: Luna (prueba)':'Nombre de tu mascota',oninput:e=>{mascota=e.target.value;}});
   const campoServicio=h('select',{name:'servicio',onchange:e=>{servicio=e.target.value;}},...tipos[tipo].map(s=>h('option',{value:s,selected:s===servicio},s)));
   const dur=h('select',{name:'duracion',onchange:e=>{duracion=Number(e.target.value);pintarHuecos();}},...[1,2,3,4].map(d=>h('option',{value:d,selected:d===duracion},d+' '+(d===1?'hora':'horas'))));
   resumen=h('p',{class:'turnero-resumen'});
   confirmar=h('button',{type:'submit',class:'btn',disabled:true},demo?'Reservar turno de prueba':'Reservar turno');
   formulario.replaceChildren(h('div',{class:'turnero-campos'},h('label',{},'Mascota',campoMascota),h('label',{},'Servicio',campoServicio),h('label',{},'Duración',dur)),huecos,resumen,confirmar);
   actualizarSeleccion();
 }
 function pintarLista(){
   if(!datos){lista.replaceChildren();return;}
   const visibles=datos.turnos||[];
   lista.replaceChildren(h('h4',{},datos.gestor?'Agenda del día · Administración / responsable':'Mis turnos del día'),...(visibles.length?visibles.map(x=>{
     const inicio=Date.parse(x.inicio);
     return h('article',{class:'turnero-turno'},h('div',{},h('strong',{},formatoHora(x.inicio)+'–'+formatoHora(x.fin)+' · '+x.mascota),nota(x.servicio+' · '+({reservado:'Reservado',cancelado:'Cancelado',atendido:'Atendido'}[x.estado]||x.estado))),h('div',{class:'turnero-acciones'},x.estado==='reservado'&&(datos.gestor||x.propio&&inicio>Date.now())?boton('Cancelar',async()=>{if(window.confirm('¿Cancelar este turno?'))await mutar('cancelar',{id:x.id},'Turno cancelado.');}):null,x.estado==='reservado'&&datos.gestor&&inicio<=Date.now()?boton('Marcar atendido',()=>mutar('atender',{id:x.id},'Turno atendido.')):null));
   }):[nota('Todavía no hay turnos para esta fecha.')]));
 }
 function pintarAlertas(){
   if(!datos)return;
   const items=datos.alertas||[], firma=JSON.stringify(items);
   if(firma===ultimaFirma)return;
   const nuevas=items.filter(x=>!alertasVistas.has(x.id));
   if(ultimaFirma&&nuevas.length)avisoVivo.textContent=aviso[nuevas[0].clase]+': '+nuevas[0].mascota+' · '+fechaHora(nuevas[0].inicio);
   items.forEach(x=>alertasVistas.add(x.id));ultimaFirma=firma;
   alertas.replaceChildren(h('h4',{},'Avisos del turnero'),...(items.length?items.map(x=>h('article',{class:'turnero-notificacion'},h('strong',{},aviso[x.clase]||'Aviso'),nota(x.mascota+' · '+x.servicio+' · turno '+fechaHora(x.inicio)),h('small',{},'Aviso: '+fechaHora(x.momento)))):[nota('No hay avisos pendientes.')]),nota('Los avisos se actualizan mientras esta agenda está abierta. No se envían mensajes externos.'));
 }
 function pintarDatos(){
   pintarConfig();pintarHuecos();pintarLista();pintarAlertas();
   formulario.hidden=!(datos?.activa);actualizarSeleccion();
 }
 function pintarTodo(){pintarTabs();pintarCalendario();pintarFormulario();pintarDatos();}
 async function cargar(silencioso=false){
   const version=++serie;
   if(!silencioso)mensaje('Cargando agenda…');
   try{const r=await rpc('listar');if(version!==serie)return;datos=r;pintarDatos();if(!silencioso)mensaje('');}
   catch(e){if(version!==serie)return;datos=null;pintarDatos();mensaje('No se pudo consultar la agenda: '+e.message,true);}
 }
 async function mutar(accion,payload,exito){
   if(ocupadoGuardando)return;
   ocupadoGuardando=true;actualizarSeleccion();mensaje('Guardando…');
   const contexto=tipo+'|'+fecha;
   try{await rpc(accion,payload);if(contexto===tipo+'|'+fecha){if(accion==='reservar'){hora=null;mascota='';duracion=1;pintarFormulario();}await cargar(true);mensaje(exito);}}
   catch(e){await cargar(true);mensaje(e.message,true);}
   finally{ocupadoGuardando=false;pintarHuecos();actualizarSeleccion();}
 }
 formulario.addEventListener('submit',async e=>{e.preventDefault();if(hora===null||!libre(hora)){mensaje('Seleccioná un horario disponible.',true);return;}if(!mascota.trim()){mensaje('Ingresá el nombre de tu mascota.',true);return;}await mutar('reservar',{hora,duracion,mascota:mascota.trim(),servicio},'Turno reservado correctamente.');});
 root.append(h('div',{class:'turnero-encabezado'},h('h3',{},'Agenda de turnos'),h('span',{class:'turnero-etiqueta'},demo?'DEMOSTRACIÓN':'TURNOS')),...(demo?[nota('Simulación: no es una veterinaria real. No uses datos sensibles.')]:[]),tabs,estado,configuracion,calendario,formulario,lista,avisoVivo,alertas);
 pintarTodo();cargar();
 const reloj=setInterval(()=>{if(!root.isConnected){clearInterval(reloj);return;}if(!ocupadoGuardando)cargar(true);},30000);
 return root;
}
