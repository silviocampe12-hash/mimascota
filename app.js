// Mimo · router, estado y vistas
import { h, limpiar, numero, leer, guardar } from './seguridad.js'
import { VETS, PRODUCTOS } from './datos.js'
import { crearVistaMascotas, limpiarMedios } from './perfiles.js?v=8'
import { crearVistaGuardias } from './guardias.js?v=8'
import { crearAyuda } from './ayuda.js?v=8'
import { crearBiblioteca } from './biblioteca.js'
import { crearComunidad } from './comunidad.js?v=9'

import { crearPersona, mascotasReales } from './usuario.js?v=9'
import { esAdminDemo, accesoRuta, crearAdmin } from './admin.js?v=10'
import { crearEspeciales } from './perfiles-especiales.js?v=10'

/* ───────── Estado ───────── */
const estado = {
  productos: [...PRODUCTOS, ...leer('productos', [])],
  filtroMapa: 'Todos', marca: 'Todas',
}
const pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

const perfiles = crearVistaMascotas(render)
const vistaGuardias = crearVistaGuardias(render)
const ayuda = crearAyuda(render)
const biblioteca = crearBiblioteca(render)
const comunidad = crearComunidad(render)
const persona = crearPersona(render)
const admin = crearAdmin(render)
const especiales = crearEspeciales(render)
const agregar = (clave, item) => { guardar(clave, [...leer(clave, []), item].slice(-50)); estado.productos.push(item); render() }

/* ───────── Piezas reutilizables ───────── */
const campo = (nombre, ph, extra = {}) => h('input', { name: nombre, placeholder: ph, maxlength: 60, required: true, 'aria-label': ph, ...extra })
const formulario = (alEnviar, ...hijos) => h('form', { onsubmit: (e) => { e.preventDefault(); alEnviar(Object.fromEntries(new FormData(e.target))) } }, ...hijos, h('button', { class: 'btn' }, 'Guardar'))
const chips = (lista, actual, alElegir) => h('div', { class: 'fila' }, lista.map((x) => h('button', { class: 'chip', 'aria-pressed': x === actual, onclick: () => alElegir(x) }, x)))

/* ───────── Vistas ───────── */
const vistas = {
  social: comunidad.vista,

  mapa: () => h('section', {},
    h('h1', {}, 'Mapa'),
    h('p', { class: 'suave' }, 'Ubicaciones ficticias de demostración. No utilizar como información de emergencia.'),
    chips(['Todos', 'Veterinaria', 'Tienda', 'Peluquería', 'Parque'], estado.filtroMapa, (f) => { estado.filtroMapa = f; render() }),
    h('div', { id: 'mapa', role: 'application', 'aria-label': 'Mapa de lugares para mascotas' })),

  mascota: perfiles.vista,

  urgencias: () => h('section', {class:'mimo-pila'}, h('a',{class:'chip especial-enlace',href:'#profesionales'},'Directorio de profesionales'), vistaGuardias()),
  profesionales: especiales.veterinarios,
  rescatistas: especiales.rescatistas,
  admin,

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

  perdidos: ayuda.perdidos,
  ayuda: ayuda.rescates,
  persona: persona.vista,
  biblioteca,

}

/* ───────── Mapa (Leaflet) ───────── */
let mapa
const iniciarMapa = () => {
  mapa?.remove()
  mapa = L.map('mapa').setView([-31.4201, -64.1888], 13)
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapa)
  VETS.filter((v) => estado.filtroMapa === 'Todos' || v.tipo === estado.filtroMapa).forEach((v) => {
    const icono = L.divIcon({ className: '', html: `<span class="pin">${v.h24 ? '🚑' : '🐾'}</span>`, iconSize: [30, 30] })
    L.marker([v.lat, v.lng], { icon: icono }).addTo(mapa).bindPopup(h('div', {}, h('strong', {}, v.nombre), h('br'), `${v.tipo} · Ejemplo ficticio`))
  })
}

/* ───────── Router ───────── */
function render() {
  limpiarMedios()
  ayuda.limpiar()
  comunidad.limpiar()
  persona.limpiar()
  const solicitada = location.hash.slice(1)
  let ruta = Object.hasOwn(vistas, solicitada) ? solicitada : 'mascota'
  // El modo de prueba no cambia el perfil ni concede permisos reales.
  const administrador = esAdminDemo()
  let tieneMascota = false
  try { tieneMascota = mascotasReales().length > 0 } catch {}
  const permitido = accesoRuta(ruta,tieneMascota,administrador)
  const enlaceAdmin = document.getElementById('nav-admin')
  if (enlaceAdmin) enlaceAdmin.hidden = !administrador
  mapa?.remove(); mapa = undefined
  const contenido = permitido ? vistas[ruta]() : h('section',{class:'mimo-pila'},
    h('h1',{},'Completá tu registro'),h('p',{class:'pronto'},'Para acceder a esta sección, primero registrá una mascota propia. Los ejemplos no cuentan.'),
    h('div',{class:'fila'},h('a',{class:'btn',href:'#mascota'},'Registrar mascota'),h('a',{class:'chip',href:'#persona'},'Mi perfil')))
  document.getElementById('vista').replaceChildren(contenido)
  document.querySelectorAll('.dock a').forEach((a) => a.classList.toggle('activa', a.hash === `#${ruta}` && !a.classList.contains('marca')))
  if (permitido && ruta === 'mapa') iniciarMapa()
}

addEventListener('hashchange', () => { render(); scrollTo(0, 0) })
render()
