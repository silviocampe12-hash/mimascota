import { sb, exigirCliente, resultado, REDIRECT_URL } from './supabase.js?v=11';
import { fijarCuenta } from './almacenamiento.js?v=11';
import { h } from './seguridad.js?v=11';
let usuario=null,rol=null,recovery=false,revision=0;
export const cuentaActual=()=>usuario;
export const rolActual=()=>rol;
export const esAdmin=()=>['superadministrador','administrador'].includes(rol);
export async function verificar(){
 const n=++revision;rol=null;
 const data=await resultado(exigirCliente().auth.getUser());
 const u=data.user;if(!u)throw Error('No hay sesión válida.');
 const p=await resultado(sb.from('permisos').select('rol').eq('usuario_id',u.id).maybeSingle());
 if(n!==revision)throw Error('La sesión cambió.');
 usuario=u;rol=p?.rol||null;return u;
}
export function iniciarCuenta(){if(!usuario)throw Error('No hay cuenta verificada.');fijarCuenta(usuario.id);}
export async function salir(){revision++;usuario=null;rol=null;try{await resultado(exigirCliente().auth.signOut({scope:'local'}));}finally{sessionStorage.removeItem('mimo-auth-v11');sessionStorage.removeItem('mimo-recovery-v11');location.replace(location.pathname);}}
const nota=t=>h('p',{class:'suave'},t);
const campo=(n,t,type,nueva=false)=>h('label',{class:'mimo-campo'},t,h('input',{name:n,type,required:true,autocomplete:type==='email'?'email':'current-password',...(type==='password'?{...(nueva?{minlength:8}:{}),maxlength:128}:{maxlength:254})}));
export function pantallaAcceso(modo='login',mensaje=''){
 const raiz=document.getElementById('vista');document.querySelector('.dock').hidden=true;
 const aviso=h('p',{class:'pronto',role:'status'},mensaje);const titulo={login:'Iniciar sesión',registro:'Crear cuenta',recuperar:'Recuperar contraseña',cambiar:'Elegir nueva contraseña'}[modo];
 const btn=(texto,fn)=>h('button',{type:'button',class:'chip',onclick:fn},texto);
 const form=h('form',{class:'mimo-form',onsubmit:async e=>{
  e.preventDefault();const f=e.currentTarget,b=f.querySelector('button[type=submit]');b.disabled=true;aviso.textContent='Conectando…';
  try{const a=exigirCliente().auth,d=new FormData(f),email=String(d.get('email')||'').trim(),password=String(d.get('password')||'');
   if(modo==='login'){await resultado(a.signInWithPassword({email,password}));await entrar();}
   if(modo==='registro'){const x=await resultado(a.signUp({email,password,options:{emailRedirectTo:REDIRECT_URL}}));if(x.session)await entrar();else pantallaAcceso('login','Si el registro está habilitado, revisá tu correo y confirmá la cuenta.');}
   if(modo==='recuperar'){await resultado(a.resetPasswordForEmail(email,{redirectTo:REDIRECT_URL+'?recuperar=1'}));aviso.textContent='Si la cuenta existe y el envío está habilitado, recibirás un correo.';}
   if(modo==='cambiar'){await resultado(a.updateUser({password}));sessionStorage.removeItem('mimo-recovery-v11');await salir();}
  }catch(err){aviso.textContent='No se pudo completar: '+err.message;}finally{b.disabled=false;}
 }},modo==='cambiar'?null:campo('email','Correo electrónico','email'),modo==='recuperar'?null:campo('password',modo==='cambiar'?'Nueva contraseña':'Contraseña','password',modo!=='login'),h('button',{type:'submit',class:'btn'},titulo));
 raiz.replaceChildren(h('section',{class:'persona-pagina'},h('header',{class:'persona-cabecera'},h('h1',{},'Mimo'),nota('Acceso de prueba con Supabase')),h('article',{class:'persona-card'},h('h2',{},titulo),form,aviso,modo==='login'?h('div',{class:'fila'},btn('Crear cuenta',()=>pantallaAcceso('registro')),btn('Olvidé mi contraseña',()=>pantallaAcceso('recuperar'))):btn(modo==='cambiar'?'Cancelar y salir':'Volver',()=>modo==='cambiar'?salir():pantallaAcceso()),nota('Solo datos ficticios durante esta etapa.'))));
}
let cargando=false,arrancado=false;
async function entrar(){if(cargando||arrancado||recovery)return;cargando=true;try{await verificar();iniciarCuenta();document.querySelector('.dock').hidden=false;await import('./aplicacion.js?v=11');arrancado=true;}catch(e){pantallaAcceso('login','No se pudo verificar el acceso: '+e.message);}finally{cargando=false;}}
export async function iniciar(){
 if(!sb){pantallaAcceso('login','No se pudo cargar Supabase. Recargá la página.');return;}
 const url=new URL(location.href),marca=url.searchParams.has('recuperar'),hash=new URLSearchParams(location.hash.slice(1));
 recovery=marca||hash.get('type')==='recovery'||sessionStorage.getItem('mimo-recovery-v11')==='1';
 if(recovery)sessionStorage.setItem('mimo-recovery-v11','1');
 sb.auth.onAuthStateChange((event,session)=>{
  if(event==='PASSWORD_RECOVERY'){recovery=true;sessionStorage.setItem('mimo-recovery-v11','1');setTimeout(()=>pantallaAcceso('cambiar'),0);}
  if(event==='SIGNED_OUT'&&arrancado){revision++;usuario=null;rol=null;setTimeout(()=>location.replace(location.pathname),0);}
  if(arrancado&&session?.user?.id&&session.user.id!==usuario?.id){rol=null;setTimeout(()=>location.replace(location.pathname),0);}
 });
 try{const {session}=await resultado(sb.auth.getSession());if(recovery){if(session)pantallaAcceso('cambiar');else{sessionStorage.removeItem('mimo-recovery-v11');recovery=false;pantallaAcceso('login','El enlace de recuperación no es válido o venció. Solicitá otro.');}return;}
 if(session)await entrar();else pantallaAcceso();}catch(e){pantallaAcceso('login',e.message);}
}
