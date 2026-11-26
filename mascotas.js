// Modelo de datos: una colección local de mascotas independientes.
import { esColor } from './seguridad.js';
const KEY = 'mimo_mascotas', SELECTED = 'mimo_mascota_seleccionada';
export const nuevoId = () => crypto.randomUUID?.() ?? `mimo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const fechaLocal = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const categorias = ['vacunas','medicamentos','consultas','estudios','cirugias','desparasitaciones','alergias','antecedentes','peso','otros'];
const lista = v => Array.isArray(v) ? v : [];
const vacuna = v => ({ ...v, id: v.id || nuevoId(), nombre: v.nombre || v.n || 'Vacuna', fechaAplicacion: v.fechaAplicacion || '', proximaDosis: v.proximaDosis || v.vence || '' });
export function crearMascota(d = {}) {
  return {
    id: d.id || nuevoId(), nombre: String(d.nombre || 'Mi mascota').slice(0,40), especie: d.especie || d.tipo || 'perro',
    raza: d.raza || '', sexo: d.sexo || '', nacimiento: d.nacimiento || '', edadAproximada: d.edadAproximada ?? d.edad ?? '', peso: d.peso ?? '',
    tamano: d.tamano || '', color: d.color || '', castrado: d.castrado === true ? 'Sí' : d.castrado === false ? 'No' : d.castrado || '', sobreMi: d.sobreMi || '',
    c1: esColor(d.c1) ? d.c1 : '#5B3DF5', c2: esColor(d.c2) ? d.c2 : '#FFC9B5',
    fotoPrincipalId: d.fotoPrincipalId || null, galeria: lista(d.galeria),
    salud: Object.fromEntries(categorias.map(k => [k, k === 'vacunas' ? lista(d.salud?.[k] ?? d.vacunas).map(vacuna) : lista(d.salud?.[k])])),
    agenda: lista(d.agenda), actividades: lista(d.actividades), rutinaPaseos: lista(d.rutinaPaseos ?? d.paseos),
    demo: Boolean(d.demo), creadoEn: d.creadoEn || new Date().toISOString()
  };
}
function demos() {
  const hoy = fechaLocal(), futuro = new Date(); futuro.setDate(futuro.getDate()+14);
  return [crearMascota({ nombre:'Mora', especie:'gato', raza:'Mestiza', edad:3, peso:4.2, demo:true, sobreMi:'Me gusta dormir al sol.', salud:{vacunas:[{nombre:'Vacuna de ejemplo',fechaAplicacion:hoy,proximaDosis:fechaLocal(futuro),lugar:'Veterinaria ficticia'}]}, agenda:[{id:nuevoId(),tipo:'Consulta',titulo:'Control de ejemplo',fecha:fechaLocal(futuro)}], actividades:[{id:nuevoId(),tipo:'Juego',fecha:hoy,duracion:20,intensidad:'Moderada'}] }),
    crearMascota({nombre:'Toby',especie:'perro',raza:'Mestizo',edad:5,peso:12,demo:true,c1:'#8B5E3C',sobreMi:'Perfil ficticio.',actividades:[{id:nuevoId(),tipo:'Paseo',fecha:hoy,duracion:30,distancia:2,intensidad:'Moderada'}]})];
}
export function cargarMascotas() {
  const actual = localStorage.getItem(KEY);
  if (actual !== null) {
    const datos = JSON.parse(actual);
    if (!Array.isArray(datos)) throw new Error('Colección de mascotas inválida');
    const perfiles = datos.map(crearMascota);
    guardarMascotas(perfiles); return perfiles;
  }
  const anterior = JSON.parse(localStorage.getItem('mascota') || 'null');
  const perfiles = anterior ? [crearMascota(anterior)] : demos();
  guardarMascotas(perfiles); return perfiles;
}
export const guardarMascotas = mascotas => localStorage.setItem(KEY, JSON.stringify(mascotas));
export const obtenerMascotaSeleccionadaId = () => localStorage.getItem(SELECTED);
export const guardarMascotaSeleccionadaId = id => id ? localStorage.setItem(SELECTED,id) : localStorage.removeItem(SELECTED);
export const eliminarMascota = (mascotas,id) => mascotas.filter(m => m.id !== id);

// Avatares, colores y huellitas
// Avatar bicolor de perro/gato y huellitas

export const COLORES = ['#5B3DF5', '#FFC9B5', '#1E1546', '#F2A93B', '#8B5E3C', '#E8E4F5', '#FF7BAC', '#3DBE9A']

const OREJAS = {
  perro: (m) => `<path d="M38 52c-22 6-28 44-14 66 12 4 26-8 30-30z" fill="${m}"/><path d="M162 52c22 6 28 44 14 66-12 4-26-8-30-30z" fill="${m}"/>`,
  gato: (m) => `<path d="M40 96 34 26l54 30z" fill="${m}"/><path d="M160 96l6-70-54 30z" fill="${m}"/>`,
}
const MANCHA = {
  perro: (m) => `<ellipse cx="76" cy="92" rx="24" ry="26" fill="${m}"/>`,
  gato: (m) => `<path d="M100 52v22M84 56l4 18M116 56l-4 18" stroke="${m}" stroke-width="7" stroke-linecap="round"/>`,
}
const BIGOTES = '<path d="M60 126l-30-6m30 12-30 6m110-12 30-6m-30 12 30 6" stroke="#1E1546" stroke-width="3" stroke-linecap="round"/>'

export const avatar = ({ tipo, c1, c2 }, mini = false) => {
  const t = tipo === 'gato' ? 'gato' : 'perro'
  const b = esColor(c1) ? c1 : '#5B3DF5'
  const m = esColor(c2) ? c2 : '#FFC9B5'
  const el = document.createElement('div')
  el.className = mini ? 'avatar mini' : 'avatar'
  el.innerHTML = `<svg viewBox="0 0 200 200" role="img" aria-label="Mascota: ${t}">
    ${OREJAS[t](m)}
    <ellipse cx="100" cy="106" rx="62" ry="58" fill="${b}"/>
    ${MANCHA[t](m)}
    <ellipse cx="100" cy="130" rx="28" ry="20" fill="#fff" opacity=".9"/>
    <circle cx="76" cy="96" r="7" fill="#1E1546"/><circle cx="124" cy="96" r="7" fill="#1E1546"/>
    <path d="M92 120h16l-8 9z" fill="#1E1546"/>
    <path d="M100 129v6m-10 2c6 6 14 6 20 0" stroke="#1E1546" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${t === 'gato' ? BIGOTES : ''}
  </svg>`
  return el
}

// Perro: almohadillas redondas · Gato: dedos pequeños y almohadilla en corazón
export const huella = (tipo) => {
  const el = document.createElement('span')
  el.innerHTML = tipo === 'gato'
    ? `<svg class="huella" viewBox="0 0 24 24"><circle cx="5" cy="11" r="2"/><circle cx="9.5" cy="6.5" r="2"/><circle cx="14.5" cy="6.5" r="2"/><circle cx="19" cy="11" r="2"/><path d="M12 20c-5-3-6-5-5-7 1.5-2 4-1 5 .5 1-1.5 3.5-2.5 5-.5 1 2 0 4-5 7z"/></svg>`
    : `<svg class="huella" viewBox="0 0 24 24"><ellipse cx="6" cy="10" rx="2.2" ry="3"/><ellipse cx="10.5" cy="6" rx="2.2" ry="3"/><ellipse cx="15.5" cy="6" rx="2.2" ry="3"/><ellipse cx="19" cy="10" rx="2.2" ry="3"/><path d="M12 12c-4 0-7 3.5-6 6.5 1 2 3.5 1.5 6 1.5s5 .5 6-1.5c1-3-2-6.5-6-6.5z"/></svg>`
  return el.firstChild
}
