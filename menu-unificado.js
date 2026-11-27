// Navegación única para todas las páginas de Mimos.
// La plantilla se define una sola vez: las páginas solo contienen <nav class="mimo-nav">.
(() => {
  'use strict';
  const nav = document.querySelector('nav.mimo-nav');
  if (!nav) return;
  const home = location.pathname.endsWith('/') || location.pathname.endsWith('/index.html');
  const route = (hash) => './#' + hash;
  const icon = {
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
    community: '<path d="M3 11a7 7 0 0 1 14 0v1a3 3 0 0 1-3 3H9l-4 3v-4a7 7 0 0 1-2-3Z"/><path d="M17 7a6 6 0 0 1 3 10l1 4-4-3h-3"/>',
    explore: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z"/>',
    help: '<path d="M12 20s-8-4.5-8-11a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 6.5-8 11-8 11Z"/>',
    messages: '<path d="M20 11.5a8 8 0 0 1-8 8 8 8 0 0 1-3.5-.8L4 20l1.3-4.5A8 8 0 1 1 20 11.5Z"/><path d="M8 11h8M8 14h5"/>',
    sos: '<path d="M12 5v14M5 12h14"/>'
  };
  const svg = (key) => '<svg viewBox="0 0 24 24" aria-hidden="true">' + icon[key] + '</svg>';
  const currentUrl = new URL(location.href);
  const currentFilter = ['todos','mascotas','personas'].includes(currentUrl.searchParams.get('filtro')) ?
    currentUrl.searchParams.get('filtro') : 'todos';

  nav.innerHTML = `
    <div class="mimo-top"><div class="mimo-actions">
      <div class="mimo-search-anchor">
        <button type="button" class="mimo-search-toggle" data-search-toggle aria-label="Abrir búsqueda" aria-controls="mimo-busqueda-global" aria-expanded="false">
          ${svg('search')}<span>Buscar</span>
        </button>
        <section id="mimo-busqueda-global" class="mimo-search-panel" hidden aria-label="Buscar perfiles">
          <form class="mimo-search-form" role="search" data-search-form>
            <label for="mimo-search-input">Buscar personas o mascotas</label>
            <div class="mimo-search-field">
              <input id="mimo-search-input" type="search" name="q" maxlength="80" placeholder="Nombre de persona o mascota" autocomplete="off"/>
              <button type="submit" aria-label="Buscar perfiles">${svg('search')}</button>
            </div>
          </form>
          <div class="mimo-search-filtros" role="group" aria-label="Tipo de resultado">
            <button type="button" data-search-filter="todos" aria-pressed="false">Todos</button>
            <button type="button" data-search-filter="mascotas" aria-pressed="false">Mascotas</button>
            <button type="button" data-search-filter="personas" aria-pressed="false">Personas</button>
          </div>
        </section>
      </div>
      <div class="mimo-perfil-anchor">
        <button type="button" data-menu="perfil" aria-controls="menu-perfil" aria-expanded="false" aria-label="Abrir menú de mi perfil">
          ${svg('profile')}<span>Perfil</span>
        </button>
        <section class="mimo-panel" data-panel="perfil" id="menu-perfil" hidden>
          <h2>Mi cuenta</h2><button type="button" class="mimo-close" aria-label="Cerrar menú">×</button>
          <a href="${route('persona')}">Mi perfil</a>
          <a href="${route('mascota')}">Mis mascotas</a>
          <a href="./social-v13.html?vista=privacidad">Privacidad social</a>
          <a href="${route('admin')}" id="nav-admin" hidden>Administración</a>
          ${home?'<button type="button" id="cerrar-sesion">Cerrar sesión</button>':'<button type="button" data-salir>Cerrar sesión</button>'}
        </section>
      </div>
    </div></div>
    <section class="mimo-panel" data-panel="explorar" id="menu-explorar" hidden>
      <h2>Explorar</h2><button type="button" class="mimo-close" aria-label="Cerrar menú">×</button>
      <a href="${route('mapa')}">Mapa</a>
      <a href="./social-v13.html?vista=eventos">Eventos</a>
      <a href="${route('biblioteca')}">Biblioteca</a>
      <a href="${route('catalogo')}">Catálogo</a>
      <a href="${route('tienda')}">Tienda</a>
      <a href="${route('profesionales')}">Directorio veterinario</a>
    </section>
    <section class="mimo-panel" data-panel="ayudar" id="menu-ayudar" hidden>
      <h2>Ayudar</h2><button type="button" class="mimo-close" aria-label="Cerrar menú">×</button>
      <a href="${route('ayuda')}">Adopción y ayuda</a>
      <a href="${route('perdidos')}">Perdidos y encontrados</a>
      <a href="${route('rescatistas')}">Rescatistas y protectoras</a>
      <a href="./invitaciones.html">Perfiles institucionales</a>
    </section>
    <div class="mimo-bottom">
      <a class="mimo-brand" href="${route('mascota')}" aria-label="Mimos: mis mascotas">Mimos</a>
      <a class="mimo-bottom-destino" data-nav="comunidad" href="${route('social')}" aria-label="Ir a Comunidad">${svg('community')}<span>Comunidad</span></a>
      <button type="button" data-menu="explorar" aria-controls="menu-explorar" aria-expanded="false">${svg('explore')}<span>Explorar</span></button>
      <button type="button" data-menu="ayudar" aria-controls="menu-ayudar" aria-expanded="false">${svg('help')}<span>Ayudar</span></button>
      <a class="mimo-bottom-destino" data-nav="mensajes" href="./social-v13.html?vista=mensajes" aria-label="Abrir Mensajes">${svg('messages')}<span>Mensajes</span></a>
      <a class="mimo-urgencias" data-nav="urgencias" href="${route('urgencias')}" aria-label="Guardia veterinaria: urgencias">
        <span class="mimo-sos-circle">${svg('sos')}</span><span class="mimo-sos-label">Guardia</span>
      </a>
    </div>`;

  const panels = [...nav.querySelectorAll('[data-panel]')];
  const triggers = [...nav.querySelectorAll('[data-menu]')];
  const searchToggle = nav.querySelector('[data-search-toggle]');
  const searchPanel = nav.querySelector('#mimo-busqueda-global');
  const searchInput = nav.querySelector('#mimo-search-input');
  let opened = null;
  let filter = currentFilter;
  function closeMenus(returnFocus = false) {
    const former = opened;
    opened = null;
    for (const panel of panels) panel.hidden = true;
    for (const trigger of triggers) trigger.setAttribute('aria-expanded','false');
    if (returnFocus && former) former.focus();
  }
  function closeSearch(returnFocus = false) {
    searchPanel.hidden = true;
    searchToggle.setAttribute('aria-expanded','false');
    if (returnFocus) searchToggle.focus();
  }
  for (const trigger of triggers) {
    trigger.addEventListener('click', () => {
      const wasOpen = opened === trigger;
      closeSearch();
      closeMenus();
      if (wasOpen) return;
      const panel = panels.find(x => x.dataset.panel === trigger.dataset.menu);
      if (!panel) return;
      opened = trigger;
      panel.hidden = false;
      trigger.setAttribute('aria-expanded','true');
      panel.querySelector('a,button:not(.mimo-close)')?.focus();
    });
  }
  searchToggle.addEventListener('click', () => {
    const wasOpen = !searchPanel.hidden;
    closeMenus();
    closeSearch();
    if (!wasOpen) {
      searchPanel.hidden = false;
      searchToggle.setAttribute('aria-expanded','true');
      searchInput.focus();
    }
  });
  function setFilter(value) {
    if (!['todos','mascotas','personas'].includes(value)) return;
    filter = value;
    nav.querySelectorAll('[data-search-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.searchFilter===filter)));
  }
  nav.querySelectorAll('[data-search-filter]').forEach(b=>b.addEventListener('click',()=>setFilter(b.dataset.searchFilter)));
  setFilter(filter);
  const qs = currentUrl.searchParams.get('q');
  if (qs) searchInput.value = qs.slice(0,80);
  nav.querySelector('[data-search-form]').addEventListener('submit',e=>{
    e.preventDefault();
    const dest = new URL('./social-v13.html',location.href);
    dest.searchParams.set('vista','buscar');
    dest.searchParams.set('filtro',filter);
    const q = searchInput.value.trim().slice(0,80);
    if (q) dest.searchParams.set('q',q);
    location.assign(dest.href);
  });
  nav.addEventListener('click', e=>{
    if (e.target.closest('.mimo-close')) closeMenus(true);
    else if (e.target.closest('a')) {closeMenus(); closeSearch();}
  });
  document.addEventListener('keydown',e=>{
    if (e.key==='Escape') {
      if (!searchPanel.hidden) closeSearch(true);
      else closeMenus(true);
    }
  });
  document.addEventListener('pointerdown',e=>{
    if (!nav.contains(e.target)) {closeMenus();closeSearch();}
  });

  function updateCurrent() {
    const page = location.pathname.split('/').pop();
    const view = new URLSearchParams(location.search).get('vista');
    const hash = location.hash.slice(1);
    const isHome = !page || page==='index.html';
    const category = isHome
      ? hash==='social' ? 'comunidad' : hash==='urgencias' ? 'urgencias' :
        ['ayuda','perdidos','rescatistas'].includes(hash)?'ayudar':
        ['mapa','catalogo','tienda','biblioteca','profesionales'].includes(hash)?'explorar':'perfil'
      :page==='social-v13.html'
        ? view==='mensajes'?'mensajes':view==='eventos'?'explorar':view==='privacidad'?'perfil':view==='buscar'?'buscar':'comunidad'
        :page==='invitaciones.html'?'ayudar':'';
    for (const a of nav.querySelectorAll('[data-nav]')) {
      if (a.dataset.nav===category) a.setAttribute('aria-current','page');
      else a.removeAttribute('aria-current');
    }
    for (const b of triggers) b.dataset.current=String(b.dataset.menu===category);
    searchToggle.dataset.current=String(category==='buscar');
  }
  function visibility(){
    document.body.classList.toggle('mimo-menu-activo',!nav.hidden);
    if(nav.hidden){closeMenus();closeSearch();}
  }
  if (!nav.classList.contains('dock')) {
    const old = document.getElementById('salir');
    const sync = () => {nav.hidden=!!old?.hidden;visibility();};
    if(old) {
      new MutationObserver(sync).observe(old,{attributes:true,attributeFilter:['hidden']});
      nav.querySelector('[data-salir]')?.addEventListener('click',()=>old.click());
      sync();
    }
  }
  new MutationObserver(visibility).observe(nav,{attributes:true,attributeFilter:['hidden']});
  visibility();
  updateCurrent();
  window.addEventListener('hashchange',()=>{closeMenus();closeSearch();updateCurrent();});
  window.addEventListener('popstate',updateCurrent);
  window.addEventListener('mimo-navegacion',updateCurrent);
})();
