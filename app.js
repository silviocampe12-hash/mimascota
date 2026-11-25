// Mimo · router, estado y vistas
import { h, limpiar, telefono, numero, esColor, leer, guardar } from './seguridad.js'
import { avatar, huella, COLORES } from './mascota.js'
import { VETS, POSTS, PRODUCTOS, PERDIDOS } from './datos.js'
import { crearVistaMascotas, limpiarMedios } from './perfiles.js'

/* ───────── Estado ───────── */
const estado = {
  productos: [...PRODUCTOS, ...leer('productos', [])],
  perdidos: [...PERDIDOS, ...leer('perdidos', [])],
  likes: new Set(), filtroMapa: 'Todos', marca: 'Todas', busqueda: '',
}
const pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

const perfiles = crearVistaMascotas(render)
const agregar = (clave, item) => { guardar(clave, [...leer(clave, []), item].slice(-50)); estado[clave === 'productos' ? 'productos' : 'perdidos'].push(item); render() }

/* ───────── Piezas reutilizables ───────── */
const campo = (nombre, ph, extra = {}) => h('input', { name: nombre, placeholder: ph, maxlength: 60, required: true, 'aria-label': ph, ...extra })
const formulario = (alEnviar, ...hijos) => h('form', { onsubmit: (e) => { e.preventDefault(); alEnviar(Object.fromEntries(new FormData(e.target))) } }, ...hijos, h('button', { class: 'btn' }, 'Guardar'))
const chips = (lista, actual, alElegir) => h('div', { class: 'fila' }, lista.map((x) => h('button', { class: 'chip', 'aria-pressed': x === actual, onclick: () => alElegir(x) }, x)))
const llamar = (tel, texto = 'Llamar') => tel && h('a', { class: 'btn sos', href: `tel:${telefono(tel)}` }, texto)

/* ───────── Vistas ───────── */
const vistas = {
  social: () => h('section', {},
    h('h1', {}, 'Comunidad'),
    h('p', { class: 'suave' }, 'Comunidad de demostración: las publicaciones propias solo se ven en este navegador.'),
    h('div', { class: 'grilla' }, perfiles.publicaciones()),
    h('div', { class: 'grilla' }, POSTS.map((p) => {
      const activo = estado.likes.has(p.id)
      return h('article', { class: 'tarjeta' },
        h('div', { class: 'fila' }, avatar(p, true), h('h3', {}, p.autor)),
        h('p', {}, p.texto),
        h('button', { class: 'me-gusta', 'aria-pressed': activo, onclick: () => { activo ? estado.likes.delete(p.id) : estado.likes.add(p.id); render() } },
          huella(p.tipo), `${p.likes + (activo ? 1 : 0)}`))
    }))),

  mapa: () => h('section', {},
    h('h1', {}, 'Mapa'),
    chips(['Todos', 'Veterinaria', 'Tienda', 'Peluquería', 'Parque'], estado.filtroMapa, (f) => { estado.filtroMapa = f; render() }),
    h('div', { id: 'mapa', role: 'application', 'aria-label': 'Mapa de lugares para mascotas' })),

  mascota: perfiles.vista,

  urgencias: () => h('section', {},
    h('h1', {}, 'Urgencias'),
    h('p', { class: 'suave' }, 'Veterinarias con guardia, un toque para llamar.'),
    h('div', { class: 'grilla' }, VETS.filter((v) => v.h24 && v.tel).map((v) =>
      h('article', { class: 'tarjeta' }, h('p', { class: 'urgencia' }, v.nombre), h('p', {}, 'Abierto las 24 horas'), llamar(v.tel))))),

  catalogo: () => {
    const marcas = [...new Set(estado.productos.map((p) => p.marca))]
    const lista = estado.productos.filter((p) => estado.marca === 'Todas' || p.marca === estado.marca)
    return h('section', {},
      h('h1', {}, 'Catálogo'),
      chips(['Todas', ...marcas], estado.marca, (x) => { estado.marca = x; render() }),
      h('div', { class: 'grilla', style: { marginTop: '1.2rem' } }, lista.map((p) => h('article', { class: 'tarjeta' }, h('p', { class: 'suave' }, p.marca), h('h3', {}, p.nombre), h('p', {}, pesos.format(p.precio))))),
      h('h2', { style: { marginTop: '2rem' } }, 'Sumar producto'),
      formulario((d) => agregar('productos', { marca: limpiar(d.marca, 30), nombre: limpiar(d.nombre, 50), precio: numero(d.precio, 0, 9999999) }),
        campo('marca', 'Marca'), campo('nombre', 'Producto'), campo('precio', 'Precio', { type: 'number', min: 0 })))
  },

  tienda: () => h('section', {},
    h('h1', {}, 'Tienda'),
    h('p', { class: 'pronto' }, 'Estamos armando la tienda. Por ahora podés mirar qué va a tener.'),
    h('div', { class: 'grilla' }, estado.productos.slice(0, 6).map((p) => h('article', { class: 'tarjeta' }, h('h3', {}, p.nombre), h('p', {}, pesos.format(p.precio)), h('button', { class: 'btn', disabled: true }, 'Disponible pronto'))))),

  perdidos: () => {
    const q = estado.busqueda.toLowerCase()
    const lista = estado.perdidos.filter((p) => `${p.nombre} ${p.tipo} ${p.zona}`.toLowerCase().includes(q))
    return h('section', {},
      h('h1', {}, 'Perdidos'),
      h('input', { type: 'search', placeholder: 'Buscar por nombre, zona o tipo', 'aria-label': 'Buscar', value: estado.busqueda, oninput: (e) => { estado.busqueda = limpiar(e.target.value, 40); render(e.target) } }),
      h('div', { class: 'grilla', style: { marginTop: '1.2rem' } }, lista.length ? lista.map((p) => h('article', { class: 'tarjeta' }, avatar(p, true), h('h3', {}, p.nombre), h('p', {}, `Visto en ${p.zona} · ${p.fecha}`), llamar(p.tel, 'Tengo información'))) : h('p', {}, 'Sin resultados.')),
      h('h2', { style: { marginTop: '2rem' } }, 'Reportar una mascota perdida'),
      formulario((d) => agregar('perdidos', { nombre: limpiar(d.nombre, 24), tipo: d.tipo === 'perro' ? 'perro' : 'gato', ...perfiles.colores(), zona: limpiar(d.zona, 40), fecha: new Date().toISOString().slice(0, 10), tel: telefono(d.tel) }),
        campo('nombre', 'Nombre'), h('select', { name: 'tipo', 'aria-label': 'Tipo' }, h('option', { value: 'gato' }, 'Gato'), h('option', { value: 'perro' }, 'Perro')), campo('zona', 'Zona'), campo('tel', 'Teléfono', { type: 'tel' })))
  },
}

/* ───────── Mapa (Leaflet) ───────── */
let mapa
const iniciarMapa = () => {
  mapa?.remove()
  mapa = L.map('mapa').setView([-31.4201, -64.1888], 13)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapa)
  VETS.filter((v) => estado.filtroMapa === 'Todos' || v.tipo === estado.filtroMapa).forEach((v) => {
    const icono = L.divIcon({ className: '', html: `<span class="pin">${v.h24 ? '🚑' : '🐾'}</span>`, iconSize: [30, 30] })
    L.marker([v.lat, v.lng], { icon: icono }).addTo(mapa).bindPopup(h('div', {}, h('strong', {}, v.nombre), h('br'), `${v.tipo}${v.h24 ? ' · 24 h' : ''}`))
  })
}

/* ───────── Router ───────── */
function render(foco) {
  limpiarMedios()
  const ruta = vistas[location.hash.slice(1)] ? location.hash.slice(1) : 'mascota'
  document.getElementById('vista').replaceChildren(vistas[ruta]())
  document.querySelectorAll('.dock a').forEach((a) => a.classList.toggle('activa', a.hash === `#${ruta}` && !a.classList.contains('marca')))
  if (ruta === 'mapa') iniciarMapa()
  if (foco) document.querySelector('input[type=search]')?.focus()
}

addEventListener('hashchange', () => { render(); scrollTo(0, 0) })
render()
