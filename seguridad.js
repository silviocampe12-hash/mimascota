import { almacen } from './almacenamiento.js?v=11';
// Utilidades de seguridad: sanitizado, validación, persistencia y DOM seguro

export const limpiar = (v, max = 80) => String(v ?? '').replace(/[<>"'`]/g, '').trim().slice(0, max)
export const esColor = (c) => /^#[0-9a-f]{6}$/i.test(c)
export const telefono = (t) => String(t).replace(/[^\d+]/g, '').slice(0, 16)
export const numero = (v, min, max) => Math.min(max, Math.max(min, Number(v) || 0))

export const leer = (clave, defecto) => {
  try { return JSON.parse(almacen.getItem(clave)) ?? defecto } catch { return defecto }
}
export const guardar = (clave, valor) => {
  try { almacen.setItem(clave, JSON.stringify(valor)) } catch { /* sin espacio */ }
}

// Crea elementos sin innerHTML: todo texto entra como nodo de texto
export const h = (tag, props = {}, ...hijos) => {
  const el = document.createElement(tag)
  for (const [k, v] of Object.entries(props)) {
    if (k === 'style') Object.assign(el.style, v)
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v)
    else if (v !== false && v != null) el.setAttribute(k, v)
  }
  el.append(...hijos.flat().filter((x) => x != null && x !== false))
  return el
}
