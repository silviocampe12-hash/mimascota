// Biblioteca de Mimo: fichas editoriales con referencias, sin aportes públicos automáticos.
import { h } from './seguridad.js';
const KEY='mimo_biblioteca_favoritos';
const revision='Pendiente de revisión profesional en Mimo';
// Cada artículo conserva su especie, categoría, texto y fuente externa.
const ficha=(id,titulo,especie,tema,texto,fuente,url)=>({id,titulo,especie,tema,texto,fuente,url,revision});
export const ARTICULOS=[
  ficha('adopcion','Preparar la llegada de un animal','Todas','Adopción',[
    'Antes de adoptar, evaluá el tiempo, el espacio y los gastos de cuidado a largo plazo.',
    'Prepará un lugar tranquilo, agua, alimento adecuado y una consulta veterinaria. Acordá con el refugio los pasos de adaptación.'
  ],'ASPCA — Consejos de adopción','https://www.aspca.org/adopt-pet/adoption-tips'),
  ficha('higiene','Higiene al convivir con animales','Todas','Prevención',[
    'Lavarse las manos con agua y jabón después de manipular animales, sus residuos o elementos de cuidado ayuda a reducir riesgos sanitarios.',
    'Consultá al equipo de salud y al veterinario si hay personas especialmente vulnerables en casa.'
  ],'CDC — Higiene alrededor de animales','https://www.cdc.gov/hygiene/about/hygiene-practices-around-animals.html'),
  ficha('urgencia','Prepararse para una urgencia','Todas','Emergencias',[
    'Tené anotados los contactos veterinarios confirmados y una forma segura de trasladar al animal.',
    'Los primeros auxilios no reemplazan la atención profesional. Ante una emergencia, contactá inmediatamente a un servicio veterinario confirmado; no esperes una respuesta en redes sociales.'
  ],'AVMA — Primeros auxilios','https://avma.org/resources/pet-owners/emergencycare/13-animal-emergencies-require-immediate-veterinary-consultation-andor-care'),
  ficha('perros','Convivencia responsable con perros','Perro','Bienestar',[
    'La supervisión de los niños durante el contacto con perros y el uso responsable de la correa ayudan a prevenir incidentes.',
    'Acordá con el veterinario un plan individual de cuidados preventivos.'
  ],'CDC — Perros y salud','https://www.cdc.gov/healthy-pets/about/dogs.html'),
  ficha('conejo','Bienestar de los conejos','Conejo','Bienestar',[
    'Los conejos necesitan espacio, enriquecimiento, refugio, alimento apropiado y compañía compatible de su especie.',
    'Antes de incorporar uno al hogar, consultá a un veterinario con experiencia en conejos.'
  ],'RSPCA — Cuidados de conejos','https://www.rspca.org.uk/adviceandwelfare/pets/rabbits'),
  ficha('gatos','Un hogar enriquecido para gatos','Gato','Bienestar',[
    'Ofrecé lugares para esconderse, superficies para rascar y oportunidades de juego y exploración segura.',
    'Adaptá el ambiente a la personalidad y las necesidades de cada gato.'
  ],'RSPCA — Cuidados de gatos','https://www.rspca.org.uk/en/adviceandwelfare/pets/cats'),
  ficha('peces','Preparar un acuario adecuado','Pez','Hábitat',[
    'La calidad del agua, la temperatura y la filtración deben corresponder a las especies del acuario.',
    'Investigá la compatibilidad y las necesidades de los peces antes de incorporarlos.'
  ],'RSPCA — Ambiente para peces','https://www.rspca.org.uk/adviceandwelfare/pets/fish/environment'),
  ficha('reptiles','Cuidados especializados de reptiles','Reptil','Prevención',[
    'Los reptiles necesitan cuidados específicos de su especie y atención de un veterinario con experiencia.',
    'Lavá tus manos después de manipularlos o limpiar su hábitat. No captures animales silvestres para tenerlos como mascotas.'
  ],'CDC — Reptiles y anfibios','https://www.cdc.gov/healthy-pets/about/reptiles-and-amphibians.html'),
  ficha('aves','Higiene y cuidados de aves','Ave','Prevención',[
    'Lavá tus manos después de tocar aves, limpiar su alojamiento o manipular sus accesorios.',
    'Identificá un veterinario con experiencia en aves y planificá controles regulares.'
  ],'CDC — Aves','https://www.cdc.gov/healthy-pets/about/birds.html'),
  ficha('cuidados','Cuidados a lo largo de la vida','Todas','Salud',[
    'La atención veterinaria regular, el agua fresca y una alimentación apropiada son parte del cuidado cotidiano.',
    'Las necesidades cambian según especie, edad y estado de salud. No apliques indicaciones de una especie a otra.'
  ],'CDC — Mascotas y otros animales','https://www.cdc.gov/healthy-pets/pets-animals/')
];
export function buscarArticulos(q='',especie='Todas',tema='Todos') {
  const norm=s=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return ARTICULOS.filter(a=>(especie==='Todas'||a.especie==='Todas'||a.especie===especie)&&(tema==='Todos'||a.tema===tema)&&norm([a.titulo,a.tema,a.especie,...a.texto].join(' ')).includes(norm(q.trim())));
}
export function crearBiblioteca(render) {
  let q='',especie='Todas',tema='Todos',soloFavoritos=false,abierto=null,favs=[];
  try {const x=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(x))favs=x;}catch{}
  const btn=(t,fn)=>h('button',{class:'chip',type:'button',onclick:fn},t);
  const card=(...c)=>h('article',{class:'tarjeta'},...c);
  const selector=(label,opts,valor,fn)=>h('label',{class:'mimo-campo'},label,h('select',{onchange:e=>{fn(e.target.value);abierto=null;render();}},opts.map(x=>h('option',{value:x,selected:x===valor},x))));
  function favorito(id) {
    const next=favs.includes(id)?favs.filter(x=>x!==id):[...favs,id];
    try{localStorage.setItem(KEY,JSON.stringify(next));favs=next;render();}catch(e){alert('No se pudieron guardar los favoritos.');}
  }
  function sugerir(a) {
    const texto=prompt('¿Qué información habría que revisar? No incluyas datos personales ni clínicos.');
    if(!texto?.trim())return;
    try {const k='mimo_biblioteca_correcciones',prev=JSON.parse(localStorage.getItem(k)||'[]');localStorage.setItem(k,JSON.stringify([...prev,{articulo:a.id,texto:texto.trim().slice(0,1000),fecha:new Date().toISOString()}]));alert('Sugerencia guardada localmente. Aún no se envía a un editor.');}catch(e){alert('No se pudo guardar la sugerencia.');}
  }
  function articulo(a) {
    return card(h('p',{class:'suave'},`${a.especie} · ${a.tema}`),h('h2',{},a.titulo),h('p',{},a.texto[0]),h('div',{class:'fila'},btn(abierto===a.id?'Cerrar artículo':'Leer artículo',()=>{abierto=abierto===a.id?null:a.id;render();}),btn(favs.includes(a.id)?'Quitar favorito':'Guardar favorito',()=>favorito(a.id))),abierto===a.id?h('div',{class:'mimo-pila'},a.texto.slice(1).map(t=>h('p',{},t)),h('p',{class:'suave'},a.revision),h('p',{class:'suave'},'Fuente consultada: 25/11/2026'),h('a',{href:a.url,target:'_blank',rel:'noopener noreferrer'},a.fuente),h('p',{class:'suave'},'Información general, no diagnóstico ni tratamiento.'),btn('Sugerir corrección',()=>sugerir(a))):null);
  }
  return ()=>{
    const lista=buscarArticulos(q,especie,tema).filter(a=>!soloFavoritos||favs.includes(a.id));
    return h('section',{class:'mimo-pila'},h('h1',{},'Biblioteca'),h('p',{class:'pronto'},'Aprendé sobre el cuidado responsable de animales. Fichas iniciales con fuentes externas; revisión veterinaria de Mimo pendiente.'),h('form',{class:'mimo-form',onsubmit:e=>{e.preventDefault();q=e.currentTarget.elements.q.value;abierto=null;render();}},h('label',{class:'mimo-campo'},'Buscar por tema o palabra',h('input',{name:'q',type:'search',value:q})),h('button',{class:'btn',type:'submit'},'Buscar')),h('div',{class:'fila'},selector('Especie',['Todas','Perro','Gato','Conejo','Ave','Reptil','Pez','Otra'],especie,x=>especie=x),selector('Tema',['Todos',...new Set(ARTICULOS.map(a=>a.tema))],tema,x=>tema=x),btn(soloFavoritos?'Mostrar todos':'Mis favoritos',()=>{soloFavoritos=!soloFavoritos;render();})),h('p',{class:'suave'},`${lista.length} artículos`),h('div',{class:'grilla'},lista.length?lista.map(articulo):h('p',{},'No hay artículos con estos filtros.')));
  };
}
