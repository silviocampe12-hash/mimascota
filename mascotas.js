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
