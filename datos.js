// Datos de demostración (luego se reemplazan por una base de datos real)

export const VETS = [
  { id: 1, nombre: 'Clínica Cuatro Patas', tipo: 'Veterinaria', h24: true, tel: '+543514000001', lat: -31.4201, lng: -64.1888 },
  { id: 2, nombre: 'Urgencias Pelaje', tipo: 'Veterinaria', h24: true, tel: '+543514000002', lat: -31.4135, lng: -64.1810 },
  { id: 3, nombre: 'Vet del Parque', tipo: 'Veterinaria', h24: false, tel: '+543514000003', lat: -31.4290, lng: -64.1950 },
  { id: 4, nombre: 'Peluquería Bigotes', tipo: 'Peluquería', h24: false, tel: '+543514000004', lat: -31.4170, lng: -64.1930 },
  { id: 5, nombre: 'Pet Shop Colita', tipo: 'Tienda', h24: false, tel: '+543514000005', lat: -31.4240, lng: -64.1770 },
  { id: 6, nombre: 'Plaza Cachorros', tipo: 'Parque', h24: true, tel: '', lat: -31.4110, lng: -64.1900 },
]

export const POSTS = [
  { id: 1, autor: 'Tofu', tipo: 'perro', c1: '#F2A93B', c2: '#FFFFFF', texto: 'Primer día de playa. Cero dignidad, mucha arena.', likes: 42 },
  { id: 2, autor: 'Sushi', tipo: 'gato', c1: '#1E1546', c2: '#E8E4F5', texto: 'Estoy en la caja. No es la mía. Ahora sí.', likes: 87 },
  { id: 3, autor: 'Canela', tipo: 'perro', c1: '#8B5E3C', c2: '#FFC9B5', texto: 'Aprendí a dar la pata. Pedí snack a cambio.', likes: 19 },
]

export const PRODUCTOS = [
  { marca: 'Pelaje Feliz', nombre: 'Alimento adulto 15 kg', precio: 48900 },
  { marca: 'Pelaje Feliz', nombre: 'Snack dental', precio: 5200 },
  { marca: 'Mundo Gato', nombre: 'Rascador torre', precio: 36500 },
  { marca: 'Mundo Gato', nombre: 'Arena aglomerante 10 kg', precio: 14800 },
  { marca: 'Dogtor', nombre: 'Correa reflectiva', precio: 9300 },
  { marca: 'Dogtor', nombre: 'Cama ortopédica', precio: 41000 },
]

export const PERDIDOS = [
  { nombre: 'Luna', tipo: 'gato', c1: '#E8E4F5', c2: '#8B5E3C', zona: 'Nueva Córdoba', fecha: '2026-11-20', tel: '+543514000010' },
  { nombre: 'Rocky', tipo: 'perro', c1: '#8B5E3C', c2: '#1E1546', zona: 'Cerro de las Rosas', fecha: '2026-11-22', tel: '+543514000011' },
]
