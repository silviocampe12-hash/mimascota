
// Mimo · modelo de perfiles de mascotas

const KEY_PETS = 'mimo_mascotas';
const KEY_SELECTED = 'mimo_mascota_seleccionada';
const KEY_LEGACY = 'mascota';

export const nuevoId = () =>
  globalThis.crypto?.randomUUID?.() ??
  `mimo-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const normalizarVacuna = (v) => ({
  id: v.id || nuevoId(),
  nombre: String(v.nombre || v.n || 'Vacuna'),
  fechaAplicacion: v.fechaAplicacion || '',
  lugar: v.lugar || '',
  profesional: v.profesional || '',
  proximaDosis: v.proximaDosis || v.vence || '',
  observaciones: v.observaciones || '',
  archivoId: v.archivoId || null,
});

export const crearMascota = (datos = {}) => ({
  id: datos.id || nuevoId(),
  nombre: String(datos.nombre || 'Mi mascota').slice(0, 40),
  especie: datos.especie || datos.tipo || 'perro',
  raza: datos.raza || '',
  sexo: datos.sexo || '',
  nacimiento: datos.nacimiento || '',
  edadAproximada: Number(datos.edadAproximada ?? datos.edad ?? 0),
  peso: Number(datos.peso || 0),
  tamano: datos.tamano || '',
  color: datos.color || '',
  castrado: Boolean(datos.castrado),
  sobreMi: datos.sobreMi || '',

  fotoPrincipalId: datos.fotoPrincipalId || null,
  galeria: Array.isArray(datos.galeria) ? datos.galeria : [],

  salud: {
    vacunas: (datos.salud?.vacunas || datos.vacunas || [])
      .map(normalizarVacuna),
    medicamentos: datos.salud?.medicamentos || [],
    consultas: datos.salud?.consultas || [],
    estudios: datos.salud?.estudios || [],
    cirugias: datos.salud?.cirugias || [],
    desparasitaciones: datos.salud?.desparasitaciones || [],
    alergias: datos.salud?.alergias || [],
    antecedentes: datos.salud?.antecedentes || [],
    otros: datos.salud?.otros || [],
  },

  agenda: Array.isArray(datos.agenda) ? datos.agenda : [],
  actividades: Array.isArray(datos.actividades) ? datos.actividades : [],

  // Conservamos la antigua programación semanal.
  rutinaPaseos: Array.isArray(datos.rutinaPaseos)
    ? datos.rutinaPaseos
    : Array.isArray(datos.paseos) ? datos.paseos : [],

  creadoEn: datos.creadoEn || new Date().toISOString(),
});

export const cargarMascotas = () => {
  try {
    const guardadas = JSON.parse(
      localStorage.getItem(KEY_PETS) || 'null'
    );

    if (Array.isArray(guardadas) && guardadas.length) {
      return guardadas.map(crearMascota);
    }

    // Recuperamos los datos de la versión anterior.
    const anterior = JSON.parse(
      localStorage.getItem(KEY_LEGACY) || 'null'
    );

    if (anterior && typeof anterior === 'object') {
      const migrada = crearMascota({
        ...anterior,
        especie: anterior.tipo || 'gato',
        edadAproximada: anterior.edad || 0,
        salud: { vacunas: anterior.vacunas || [] },
        rutinaPaseos: anterior.paseos || [],
      });

      localStorage.setItem(KEY_PETS, JSON.stringify([migrada]));
      localStorage.setItem(KEY_SELECTED, migrada.id);

      return [migrada];
    }

    // Perfil inicial de demostración.
    const inicial = crearMascota({
      nombre: 'Mora',
      especie: 'gato',
      edadAproximada: 3,
      peso: 4.2,
      sobreMi: '¡Hola! Este es mi perfil de ejemplo.',
    });

    localStorage.setItem(KEY_PETS, JSON.stringify([inicial]));
    localStorage.setItem(KEY_SELECTED, inicial.id);

    return [inicial];

  } catch (error) {
    console.error('Error al cargar mascotas:', error);
    return [crearMascota({ nombre: 'Mora', especie: 'gato' })];
  }
};

export const guardarMascotas = (mascotas) => {
  try {
    localStorage.setItem(KEY_PETS, JSON.stringify(mascotas));
    return true;
  } catch (error) {
    console.error('Error al guardar mascotas:', error);
    return false;
  }
};

export const obtenerMascotaSeleccionadaId = () =>
  localStorage.getItem(KEY_SELECTED);

export const guardarMascotaSeleccionadaId = (id) =>
  localStorage.setItem(KEY_SELECTED, id);

export const eliminarMascota = (mascotas, id) =>
  mascotas.filter((mascota) => mascota.id !== id);
