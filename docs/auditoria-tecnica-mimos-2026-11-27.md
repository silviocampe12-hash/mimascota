# Auditoría técnica de Mimos — 27 de noviembre de 2026

**Repositorio:** `silviocampe12-hash/mimascota`  
**Rama intervenida:** `feature/perfiles-mascotas` (`main` sin modificar)  
**Backend:** Supabase proyecto `mimo`  
**Método:** inspección estática de los módulos JavaScript, HTML y CSS; comprobación de funciones, permisos y pruebas transaccionales en PostgreSQL. **No equivale a prueba completa en navegadores, dispositivos o cuentas de usuarios reales.**

## Cambios implementados en esta revisión

- [x] **Navegación unificada.** Tres páginas (`index.html`, `social-v13.html`, `invitaciones.html`) emplean el mismo `menu-unificado.js`; se eliminó la copia de los menús dentro de cada HTML. Se consolidaron los estilos de `menu-v14.css`.
- [x] **Comunidad es un enlace directo** a `#social`, no abre un submenú.
- [x] **Búsqueda en la lupa**: abre panel con campo y filtros `Todos / Mascotas / Personas`; la consulta conserva el filtro al abrir resultados.
- [x] **Mensajes en la barra inferior**; búsqueda y perfil superiores más grandes. La pantalla Mensajes se deja vacía deliberadamente (solo título) mientras no se reactive el módulo.
- [x] **«Ver perfil» solo en resultados de mascotas**: abre ficha pública propia mediante parámetros de usuario y mascota; las fichas de personas no ofrecen «Ver perfil».
- [x] **Privacidad del perfil respetada en la ficha pública de mascota** en Supabase: sin acceso para no seguidores de cuentas privadas; se habilita después de aceptar seguimiento; se deniega a bloqueados. El servidor nunca entrega datos clínicos o ubicación privada.
- [x] **Opciones de los mensajes en «···»** dentro del código de mensajería, oculto por ahora.
- [x] **Guardia veterinaria fuera del menú Explorar** y conservada como botón inferior exclusivo.
- [x] **Casillas de Mostrar en Comunidad/Permitir comentarios trasladadas a Privacidad social**, persistidas en Supabase mediante `mimo_preferencias_publicaciones`.
- [x] **Candado al publicar** con las opciones `Solo para mí`, `Solo amigos (personas que sigo)` y `Público (todos en la app)`. Las publicaciones existentes conservan la compatibilidad `Comunidad`/`Privada`; los datos del dueño no fueron borrados.
- [x] **Consultas de mascota pública y búsqueda** protegidas con RPC de Supabase (`mimo_buscar_v2`, `mimo_ficha_mascota_v1`); se añadieron migraciones SQL versionadas.

## Verificaciones efectuadas

- Búsqueda de perfiles y mascotas devuelve las dos cuentas y dos mascotas existentes **sin casillas de visibilidad**, en el momento del test.
- Ficha pública de mascota funciona en consulta autenticada.
- Prueba transaccional: cuenta privada bloquea ficha a no seguidores, un seguimiento pendiente requiere aceptación, seguimiento aceptado permite verla y un bloqueo revoca el acceso. **Todo se ejecutó con ROLLBACK**, sin guardar cambios de prueba.
- RPC de búsqueda, ficha y preferencias accesibles a `authenticated`, no a `anon`.
- Preferencias `mostrar` y `comentarios` se guardaron y releyeron en una transacción revertida.
- Inspección de referencias y comprobación sintáctica de los módulos modificados.
- **Pendiente verificar en navegador real**: desplegables, rutas profundas, móviles, recuperación de sesión, fotos, y visualización cuando se publica la rama.

## P0 — BLOQUEANTES antes de anunciar servicios compartidos

- [ ] **Comunidad todavía guarda publicaciones, likes y comentarios en almacenamiento local**, y archivos adjuntos en IndexedDB. Las audiencias del nuevo candado se guardan como opción del post, pero **NO distribuyen ni restringen publicaciones entre cuentas**: no hay todavía feed compartido ni reglas servidor para `Solo amigos`. Implementar persistencia en Supabase, ACL/RLS por autor, seguidores y bloqueos, y almacenamiento multimedia privado con acceso autorizado. `Solo amigos` se definió en la interfaz como *usuarios que sigue el autor*; la política del servidor debe respetar exactamente esa regla. No activar difusión de publicaciones antes de completar esto.
- [ ] **Guardias veterinarias locales y sin verificación profesional** (`guardias.js`). Registrar profesional autenticado, matrícula verificada, turnos y teléfonos autorizados, RLS y revisión de horarios; nunca confundir demostraciones con guardias reales.
- [ ] **Perdidos, rescates y denuncias siguen locales** (`ayuda.js`); no llegan al resto de la comunidad ni a moderadores. Darles almacenamiento compartido y moderación antes de anunciar circulación real.
- [ ] **Datos ficticios en `datos.js` / mapa**: eliminar ejemplos de clínicas y teléfonos de pantallas orientadas a servicios reales o mantenerlos explícitamente en entorno de demostración.

## P1 — PRIORIDAD ALTA

- [ ] **Unificar seguimiento local de Comunidad con seguidores de Supabase.** `comunidad.js` mantiene un `siguiendo` local distinto de las solicitudes y seguidores sociales reales.
- [ ] **Revisar identidad y matriculación de directorios** (`perfiles-especiales.js`), junto con consentimientos y vinculación institucional.
- [ ] **Fotografías públicas de mascotas:** la ficha muestra un icono. Sus fotos originales están en almacenamiento privado; decidir un mecanismo explícito y seguro de publicación de miniaturas sin exponer galerías o archivos clínicos.
- [ ] **Pruebas reales en 320/360/390 px y escritorio**, con teclado, lector de pantalla, navegación entre páginas, filtros, menús y ubicación del botón Guardia.
- [ ] **Pruebas de concurrencia y reconexión de `mimo_cuenta_datos`**, especialmente entre dispositivos, caducidad de sesiones e importación local (`nube.js`).
- [ ] **No eliminar el módulo de chat existente**: está oculto a pedido del proyecto; reactivarlo solo tras decidir la experiencia final y probar controles de privacidad.
- [ ] **Ajustar flujos de registro de personas sin mascota** para publicar/participar según el alcance elegido. El acceso general ya no exige mascota, pero el editor de publicaciones sigue dependiendo de una mascota propia.
- [ ] **Inicio tipo dashboard y ocultación temporal de Catálogo/Tienda** siguen siendo decisiones de producto pendientes; no se modificaron aquí.

## P2 — MANTENIMIENTO Y SIMPLIFICACIÓN

- [ ] Centralizar helpers DOM repetidos (`card`, `form`, `campo`, `btn`, `nota`) y validación de fotos entre módulos, sin romper contratos.
- [ ] Sustituir avisos técnicos y cuadros `alert/confirm/prompt` por experiencia consistente, conservando errores útiles.
- [ ] Consolidar rutas `#hash` y `?vista=` en un router probado (el menú ya está centralizado).
- [ ] Quitar `menu-v14.js` **solo después de validar despliegue/caché**; dejó de estar referenciado desde los tres HTML y se conserva temporalmente para compatibilidad.
- [ ] Agregar pruebas automáticas de UI/routing, validación de permisos/RLS, migraciones y manejo de medios.
- [ ] Expandir documentación de instalación, despliegue y rollback. Verificar consistencia entre la rama que usa GitHub Pages y la rama de desarrollo.

**Restricción de seguridad:** los valores `solo_yo`, `amigos`, `publico` actuales son metadatos de posts locales; NO deben interpretarse como publicación entre cuentas ni como permisos de Supabase ya implementados. No asumir que cambiar un desplegable crea una política de acceso real.
