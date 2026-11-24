// Avatar bicolor de perro/gato y huellitas
import { esColor } from './seguridad.js'

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
