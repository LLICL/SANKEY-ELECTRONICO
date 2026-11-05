// Funciones compartidas por todas las páginas.
// Regla de seguridad: NUNCA se usa innerHTML con datos. Todo se escribe con textContent.
(function () {
  'use strict';
  const cfg = window.SANKEY;
  const sb = window.supabase.createClient(cfg.URL, cfg.CLAVE, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });

  // ---------- Construir elementos de forma segura ----------
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === null || v === undefined || v === false || k === 'style') continue;
        if (k === 'class') e.className = v;
        else if (k === 'text') e.textContent = v;
        else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
        else if (k === 'value') e.value = v;
        else if (k === 'disabled' || k === 'checked' || k === 'selected') e[k] = !!v;
        else e.setAttribute(k, v === true ? '' : String(v));
      }
    }
    for (const c of kids.flat(Infinity)) {
      if (c === null || c === undefined || c === false) continue;
      e.append(c.nodeType ? c : document.createTextNode(String(c)));
    }
    return e;
  }
  function vaciar(el) { while (el.firstChild) el.removeChild(el.firstChild); return el; }
  function poner(el, ...kids) { vaciar(el); el.append(...kids.flat(Infinity).filter((k) => k !== null && k !== undefined && k !== false)); return el; }

  // ---------- Iconos (dibujados con trazos, sin imágenes externas) ----------
  const NS = 'http://www.w3.org/2000/svg';
  const ICONOS = {
    inicio: 'M3 11.5 12 4l9 7.5M5 10v10h5v-6h4v6h5V10',
    casos: 'M9 4h6a1 1 0 0 1 1 1v1H8V5a1 1 0 0 1 1-1zM8 6H6a1 1 0 0 0-1 1v13a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-2M9 12h6M9 16h4',
    retiros: 'M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7M10 20a2 2 0 0 0 4 0',
    citas: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
    inventario: 'M3 7.5 12 3l9 4.5v9L12 21l-9-4.5zM3 7.5 12 12l9-4.5M12 12v9',
    reportes: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
    equipo: 'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21v-1a6 6 0 0 1 12 0v1M17 11a3 3 0 1 0 0-6M22 21v-1a5 5 0 0 0-4-4.9',
    ajustes: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
    salir: 'M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h5M15 8l4 4-4 4M19 12H9',
    menu: 'M4 7h16M4 12h16M4 17h16',
  };
  function icono(nombre, tam) {
    const s = document.createElementNS(NS, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', String(tam || 20)); s.setAttribute('height', String(tam || 20));
    s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2');
    s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(NS, 'path'); p.setAttribute('d', ICONOS[nombre] || ICONOS.inicio); s.append(p);
    return s;
  }

  // ---------- Formatos ----------
  const dinero = (n) => '$' + Number(n || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });
  const fechaHora = (v) => v ? new Date(v).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' }) : '';
  const fechaCorta = (v) => v ? new Date(v).toLocaleDateString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium' }) : '';
  const hoyISO = (offset = 0) => {
    const d = new Date(Date.now() + offset * 86400000);
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(d);
  };

  const ESTADOS = {
    solicitud_enviada: ['Solicitud enviada', 'b-azul'], aceptada: ['Aceptada', 'b-morado'], rechazada: ['Rechazada', 'b-rojo'],
    en_revision: ['En revisión', 'b-morado'], cotizada: ['Cotización enviada', 'b-amarillo'],
    cotizacion_aprobada: ['Cotización aprobada', 'b-verde'], cotizacion_rechazada: ['Cotización rechazada', 'b-rojo'],
    en_reparacion: ['En reparación', 'b-azul'], lista_para_retirar: ['Lista para retirar', 'b-verde'],
    entregada: ['Entregada', 'b-gris'], cerrada: ['Cerrada', 'b-gris'], cancelada: ['Cancelada', 'b-gris'],
  };
  const ESTADOS_COT = {
    borrador: ['Borrador', 'b-gris'], pendiente_aprobacion: ['Pendiente de aprobación', 'b-amarillo'], aprobada: ['Aprobada', 'b-verde'],
    rechazada: ['Rechazada', 'b-rojo'], reemplazada: ['Reemplazada', 'b-gris'], vencida: ['Vencida', 'b-gris'],
  };
  const ESTADOS_CITA = {
    confirmada: ['Confirmada', 'b-verde'], pendiente_confirmacion: ['Por confirmar', 'b-amarillo'], reprogramada: ['Reprogramada', 'b-gris'],
    cancelada: ['Cancelada', 'b-rojo'], realizada: ['Realizada', 'b-azul'], no_asistio: ['No asistió', 'b-rojo'],
  };
  const insignia = (mapa, clave) => { const [t, c] = mapa[clave] || [clave, 'b-gris']; return h('span', { class: 'badge ' + c, text: t }); };

  // Etapas visibles para el seguimiento de un caso.
  const ETAPAS = ['Solicitud', 'Aceptada', 'Cotización', 'Reparación', 'Lista', 'Entregada'];
  const ETAPA_DE = { solicitud_enviada: 0, aceptada: 1, en_revision: 1, cotizada: 2, cotizacion_rechazada: 2, cotizacion_aprobada: 3, en_reparacion: 3, lista_para_retirar: 4, entregada: 5, cerrada: 5 };
  function etapasCaso(estado) {
    const actual = ETAPA_DE[estado];
    if (actual === undefined) return null; // rechazada o cancelada: no hay recorrido
    return h('ol', { class: 'etapas', 'aria-label': 'Etapas del caso' }, ETAPAS.map((t, i) =>
      h('li', { class: i < actual || estado === 'cerrada' || estado === 'entregada' ? 'hecha' : i === actual ? 'actual' : '', 'aria-current': i === actual ? 'step' : null, text: t })));
  }

  // ---------- Errores amigables ----------
  function textoError(error) {
    if (!error) return 'Ocurrió un error. Inténtalo de nuevo.';
    // 'P0001' = mensaje escrito por nosotros dentro de la base de datos (seguro de mostrar).
    if (error.code === 'P0001' && error.message) return error.message;
    if (error.code === '23505') return 'Ese dato ya existe.';
    if (error.code === '23514' || error.code === '22P02') return 'Hay datos con formato inválido. Revísalos.';
    if (error.code === '42501' || error.code === 'PGRST301') return 'No tienes permiso para hacer esto.';
    if (/Failed to fetch|NetworkError|network/i.test(error.message || '')) return 'Sin conexión con el servidor. Revisa tu internet.';
    return 'Ocurrió un error. Inténtalo de nuevo.';
  }
  async function rpc(nombre, args) {
    const { data, error } = await sb.rpc(nombre, args || {});
    if (error) throw new Error(textoError(error));
    return data;
  }
  async function ok(promesa) {
    const { data, error } = await promesa;
    if (error) throw new Error(textoError(error));
    return data;
  }

  // ---------- Ventanas de confirmación (reemplazan a confirm y prompt del navegador) ----------
  function ventana({ titulo, texto, etiqueta, multilinea, boton, peligro, minimo, valor }) {
    return new Promise((resolver) => {
      const previo = document.activeElement;
      const pedir = !!etiqueta;
      let campo = null;
      if (pedir) campo = multilinea ? h('textarea', { maxlength: '500', id: 'dlg-campo' }) : h('input', { type: 'text', maxlength: '500', id: 'dlg-campo' });
      if (campo && valor) campo.value = valor;
      const error = h('p', { class: 'flabel', role: 'alert' });
      const ok_ = h('button', { type: 'button', class: peligro ? 'btn-peligro' : 'btn-primary', text: boton || 'Aceptar' });
      const no = h('button', { type: 'button', class: 'btn-sec', text: 'Volver' });
      const caja = h('div', { class: 'modal' + (peligro ? ' peligro' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'dlg-titulo' },
        h('h3', { id: 'dlg-titulo', text: titulo }), texto ? h('p', { text: texto }) : null,
        pedir ? h('div', { class: 'campo' }, h('label', { class: 'flabel', for: 'dlg-campo', text: etiqueta }), campo, error) : null,
        h('div', { class: 'btns' }, no, ok_));
      const fondo = h('div', { class: 'modal-fondo' }, caja);
      const cerrar = (r) => { document.removeEventListener('keydown', tecla, true); fondo.remove(); if (previo && previo.focus) previo.focus(); resolver(r); };
      const aceptar = () => {
        if (!pedir) return cerrar(true);
        const v = campo.value.trim();
        const min = minimo === undefined ? 3 : minimo;
        if (v.length < min) { error.textContent = min === 1 ? 'Este dato es obligatorio.' : 'Escribe al menos ' + min + ' caracteres.'; campo.focus(); return; }
        cerrar(v);
      };
      const tecla = (e) => {
        if (e.key === 'Escape') { e.preventDefault(); cerrar(pedir ? null : false); }
        else if (e.key === 'Tab') { // mantiene el foco dentro de la ventana
          const f = caja.querySelectorAll('button, input, textarea'); const a = f[0], z = f[f.length - 1];
          if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
          else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
        }
      };
      ok_.addEventListener('click', aceptar);
      no.addEventListener('click', () => cerrar(pedir ? null : false));
      fondo.addEventListener('mousedown', (e) => { if (e.target === fondo) cerrar(pedir ? null : false); });
      document.addEventListener('keydown', tecla, true);
      document.body.append(fondo);
      (campo || ok_).focus();
    });
  }
  const confirmar = (titulo, texto, boton, peligro) => ventana({ titulo, texto, boton, peligro });
  const pedirTexto = (titulo, etiqueta, boton, opciones) => ventana(Object.assign({ titulo, etiqueta, boton, multilinea: true }, opciones || {}));

  // ---------- Avisos flotantes ----------
  let zonaAvisos = null;
  function avisar(tipo, texto) {
    if (!zonaAvisos) { zonaAvisos = h('div', { class: 'avisos', role: 'status', 'aria-live': 'polite' }); document.body.append(zonaAvisos); }
    if (!texto) { vaciar(zonaAvisos); return; }
    const cerrar = h('button', { type: 'button', 'aria-label': 'Cerrar aviso', text: '×' });
    const a = h('div', { class: 'aviso-flota ' + (tipo || 'info'), role: tipo === 'err' ? 'alert' : null }, h('span', { text: texto }), cerrar);
    cerrar.addEventListener('click', () => a.remove());
    zonaAvisos.append(a);
    if (tipo === 'ok') setTimeout(() => a.remove(), 5000);
  }

  // ---------- Sesión y perfil ----------
  async function cargarPerfil() {
    const { data: { session } } = await sb.auth.getSession();
    if (!session) return null;
    const { data: perfil } = await sb.from('perfiles').select('id,usuario,nombre,correo,telefono,rol,activo').eq('id', session.user.id).maybeSingle();
    if (!perfil || !perfil.activo) { await sb.auth.signOut(); return null; }
    let permisos = { gestionar_casos: false, crear_cotizaciones: false, gestionar_inventario: false, ver_reportes: false, gestionar_clientes: false };
    if (perfil.rol === 'admin') { for (const k of Object.keys(permisos)) permisos[k] = true; }
    else if (perfil.rol === 'tecnico') {
      const { data } = await sb.from('permisos_equipo').select('*').eq('usuario_id', perfil.id).maybeSingle();
      if (data) permisos = data;
    }
    return { perfil, permisos };
  }

  function menu(perfil, permisos) {
    const m = [['panel.html', 'Inicio', 'inicio']];
    if (perfil.rol === 'cliente') {
      m.push(['casos.html', 'Mis solicitudes', 'casos'], ['citas.html', 'Mis citas', 'citas']);
    } else {
      if (permisos.gestionar_casos) m.push(['casos.html', 'Casos', 'casos'], ['retiros.html', 'Sin retirar', 'retiros']);
      if (perfil.rol === 'admin') m.push(['citas.html', 'Citas', 'citas']);
      if (permisos.gestionar_inventario) m.push(['inventario.html', 'Inventario', 'inventario']);
      if (permisos.ver_reportes) m.push(['reportes.html', 'Reportes', 'reportes']);
      if (perfil.rol === 'admin') m.push(['equipo.html', 'Equipo y clientes', 'equipo']);
    }
    m.push(['ajustes.html', perfil.rol === 'admin' ? 'Ajustes' : 'Mi cuenta', 'ajustes']);
    return m;
  }

  async function salir() { await sb.auth.signOut(); location.replace('index.html'); }

  // arrancar: valida sesión, rol y permiso; dibuja el marco; llama a fn(ctx).
  async function arrancar(opts, fn) {
    const app = document.getElementById('app');
    let cargado;
    try { cargado = await cargarPerfil(); } catch { cargado = null; }
    if (!cargado) { location.replace('ingresar.html'); return; }
    const { perfil, permisos } = cargado;
    if (opts.roles && !opts.roles.includes(perfil.rol)) { location.replace('panel.html'); return; }
    if (opts.permiso && !permisos[opts.permiso]) { location.replace('panel.html'); return; }

    const cerrarMenu = () => document.body.classList.remove('menu-abierto');
    const nav = h('nav', { 'aria-label': 'Principal' }, menu(perfil, permisos).map(([href, t, ic]) =>
      h('a', { href, class: href === opts.pagina ? 'activo' : '', 'aria-current': href === opts.pagina ? 'page' : null, onclick: cerrarMenu }, icono(ic), t)));
    const lateral = h('aside', { class: 'sidebar', id: 'lateral' },
      h('div', { class: 'logo' }, h('a', { class: 'marca', href: 'index.html', text: 'SANKEY' })),
      h('div', { class: 'usuario' }, h('strong', { text: perfil.nombre }),
        h('span', { class: 'rol-badge ' + (perfil.rol === 'admin' ? 'rol-admin' : 'rol-emp'), text: { admin: 'Administrador', tecnico: 'Técnico', cliente: 'Cliente' }[perfil.rol] })),
      nav,
      h('div', { class: 'logout' }, h('button', { type: 'button', onclick: salir }, icono('salir', 18), 'Cerrar sesión')));
    const contenido = h('div', { class: 'contenido' }, h('div', { class: 'vacio', text: 'Cargando…' }));
    const btnMenu = h('button', { type: 'button', class: 'menu-btn', 'aria-label': 'Abrir menú', 'aria-controls': 'lateral', onclick: () => document.body.classList.toggle('menu-abierto') }, icono('menu', 24));
    const principal = h('main', { class: 'main' },
      h('div', { class: 'topbar' }, btnMenu, h('h2', { text: opts.titulo }), h('span', { class: 'sitio', text: 'Centro de Servicio Electrónico' })), contenido);
    poner(app, lateral, h('div', { class: 'telon', onclick: cerrarMenu }), principal);
    document.title = opts.titulo + ' · SANKEY';
    try { const pend = sessionStorage.getItem('sk_aviso'); if (pend) { sessionStorage.removeItem('sk_aviso'); avisar('err', pend); } } catch { /* sin almacenamiento */ }
    sb.auth.onAuthStateChange((ev) => { if (ev === 'SIGNED_OUT') location.replace('index.html'); });

    const ctx = { sb, perfil, permisos, contenido, avisar, esAdmin: perfil.rol === 'admin', esEquipo: perfil.rol !== 'cliente' };
    // Envuelve una acción de botón: lo deshabilita mientras trabaja y muestra errores.
    ctx.accion = (btn, trabajo, exito) => async () => {
      if (btn.disabled) return;
      btn.disabled = true; avisar('', '');
      try { await trabajo(); if (exito) avisar('ok', exito); }
      catch (e) { avisar('err', e.message || 'Ocurrió un error.'); }
      finally { btn.disabled = false; }
    };
    poner(contenido, h('div')); // quita el "Cargando…" (las páginas conservan este primer hijo)
    try { await fn(ctx); }
    catch (e) {
      poner(contenido, h('div', { class: 'msg err', role: 'alert', text: e.message || 'No se pudo cargar la página.' }),
        h('div', { class: 'btns' }, h('button', { type: 'button', class: 'btn-primary', text: 'Reintentar', onclick: () => location.reload() })));
    }
  }

  // ---------- Fotos ----------
  const TIPOS_FOTO = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  async function subirFotos(casoId, archivos, tipo, avanceId) {
    let n = 0;
    for (const f of archivos) {
      const ext = TIPOS_FOTO[f.type];
      if (!ext) throw new Error('Solo se permiten fotos JPG, PNG o WEBP.');
      if (f.size > 5 * 1024 * 1024) throw new Error('Cada foto debe pesar máximo 5 MB.');
      const ruta = casoId + '/' + crypto.randomUUID() + '.' + ext;
      const { error } = await sb.storage.from('fotos').upload(ruta, f, { contentType: f.type, upsert: false });
      if (error) throw new Error('No se pudo subir la foto.');
      await rpc('registrar_foto', { p_caso: casoId, p_ruta: ruta, p_tipo: tipo, p_avance: avanceId || null, p_descripcion: null });
      n++;
    }
    return n;
  }
  async function mostrarFotos(contenedor, fotos) {
    vaciar(contenedor);
    for (const f of fotos) {
      const { data } = await sb.storage.from('fotos').createSignedUrl(f.ruta, 300);
      if (!data) continue;
      const img = h('img', { src: data.signedUrl, alt: 'Foto del caso', loading: 'lazy' });
      img.addEventListener('click', () => {
        const v = h('div', { class: 'visor', role: 'dialog', 'aria-label': 'Foto ampliada' }, h('img', { src: data.signedUrl, alt: 'Foto ampliada' }));
        v.addEventListener('click', () => v.remove());
        document.body.append(v);
      });
      contenedor.append(img);
    }
  }

  // ---------- Pequeños ayudantes de formularios y listas ----------
  const campo = (etiqueta, control) => h('div', { class: 'campo' }, h('label', { class: 'flabel', text: etiqueta }), control);
  const opcion = (valor, texto) => h('option', { value: valor, text: texto });
  function tabla(columnas, filas, vacio) {
    if (!filas.length) return h('div', { class: 'tbl-box' }, vacio && vacio.nodeType ? vacio : h('div', { class: 'vacio', text: vacio || 'No hay datos.' }));
    return h('div', { class: 'tbl-box' }, h('table', null,
      h('thead', null, h('tr', null, columnas.map((c) => h('th', { scope: 'col', text: c })))),
      h('tbody', null, filas)));
  }
  // Mensaje de lista vacía con un siguiente paso claro.
  const vacio = (titulo, texto, accion) => h('div', { class: 'vacio' }, h('strong', { text: titulo }), texto ? h('p', { text: texto }) : null, accion ? h('div', { class: 'btns' }, accion) : null);
  const tarjeta = (titulo, valor, color, href) => h(href ? 'a' : 'div', { class: 'tarjeta ' + (color || ''), href: href || null }, h('h3', { text: titulo }), h('p', { text: String(valor) }));
  // Pestañas de filtro con contador. items: [{ id, texto, n }]
  function pestanas(items, activo, alCambiar) {
    const caja = h('div', { class: 'pestanas', role: 'group', 'aria-label': 'Filtrar por' });
    items.forEach((it) => {
      const b = h('button', { type: 'button', 'aria-pressed': it.id === activo ? 'true' : 'false' }, it.texto, h('span', { class: 'n', text: String(it.n) }));
      b.addEventListener('click', () => { caja.querySelectorAll('button').forEach((x) => x.setAttribute('aria-pressed', 'false')); b.setAttribute('aria-pressed', 'true'); alCambiar(it.id); });
      caja.append(b);
    });
    return caja;
  }

  // ---------- Diseño de ingresar / registro / recuperar ----------
  function acceso(titulo, sub, cuerpo) {
    return h('div', { class: 'acceso' },
      h('div', { class: 'acceso-marca' },
        h('a', { class: 'marca', href: 'index.html', text: 'SANKEY' }),
        h('div', { class: 'texto' }, h('h1', { text: 'Repara con tranquilidad y sigue cada paso' }),
          h('ul', null, h('li', { text: 'Pide tu reparación en minutos' }), h('li', { text: 'Aprueba cotizaciones con un botón' }), h('li', { text: 'Mira los avances y fotos de tu equipo' }))),
        h('div', { class: 'letrero' }, h('img', { src: 'img/logo-sankey.jpg', width: '250', height: '133', alt: 'Letrero de SANKEY, centro de servicio electrónico' }))),
      h('div', { class: 'acceso-form' }, h('div', { class: 'caja' },
        h('a', { class: 'volver', href: 'index.html', text: '← Volver al inicio' }),
        h('h2', { text: titulo }), sub ? h('p', { class: 'sub-caja', text: sub }) : null, cuerpo)));
  }

  window.SK = { sb, cfg, h, vaciar, poner, icono, dinero, fechaHora, fechaCorta, hoyISO, ESTADOS, ESTADOS_COT, ESTADOS_CITA, insignia, etapasCaso,
    textoError, rpc, ok, arrancar, subirFotos, mostrarFotos, campo, opcion, tabla, vacio, tarjeta, pestanas, confirmar, pedirTexto, avisar, acceso, salir };
})();
