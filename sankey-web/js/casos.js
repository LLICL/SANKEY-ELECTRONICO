SK.arrancar({ pagina: 'casos.html', titulo: 'Solicitudes', roles: ['cliente', 'tecnico', 'admin'] }, async (ctx) => {
  const { h, poner, ok, rpc, sb, campo, tabla, insignia, vacio, pestanas, ESTADOS, fechaCorta, subirFotos, confirmar } = SK;
  const { contenido, perfil, avisar } = ctx;
  const esCliente = perfil.rol === 'cliente';
  if (!esCliente && !ctx.permisos.gestionar_casos) { location.replace('panel.html'); return; }
  const irCaso = (id) => () => { location.href = 'caso.html?id=' + encodeURIComponent(id); };

  // Grupos de estados para los filtros
  const GRUPOS = {
    todas: () => true,
    activas: (c) => ['aceptada', 'en_revision', 'cotizacion_aprobada', 'cotizacion_rechazada', 'en_reparacion', 'solicitud_enviada'].includes(c.estado),
    aprobar: (c) => c.estado === 'cotizada',
    listas: (c) => c.estado === 'lista_para_retirar',
    finalizadas: (c) => ['entregada', 'cerrada', 'rechazada', 'cancelada'].includes(c.estado),
  };
  const ocultable = (c) => esCliente ? ['rechazada', 'cancelada', 'entregada', 'cerrada'].includes(c.estado) : ['rechazada', 'cancelada', 'cerrada'].includes(c.estado);
  const flagOculto = (c) => esCliente ? c.oculto_cliente : c.oculto_admin;

  // ----- Formulario de nueva solicitud (solo clientes) -----
  let formulario = null;
  if (esCliente) {
    const cfg = await ok(sb.from('configuracion').select('max_fotos_por_solicitud').maybeSingle());
    const maxFotos = cfg ? cfg.max_fotos_por_solicitud : 5;
    const tipo = h('input', { type: 'text', maxlength: '60', placeholder: 'Ej: Televisor, parlante, radio', list: 'tipos-equipo' });
    const lista = h('datalist', { id: 'tipos-equipo' }, ['Televisor', 'Freidora de aire', 'Parlante', 'Radio', 'Amplificador', 'Nevera', 'Lavadora', 'Celular'].map((t) => h('option', { value: t })));
    const marca = h('input', { type: 'text', maxlength: '60' });
    const modelo = h('input', { type: 'text', maxlength: '60' });
    const serie = h('input', { type: 'text', maxlength: '60' });
    const falla = h('textarea', { maxlength: '1000', placeholder: 'Cuéntanos qué le pasa al equipo: desde cuándo falla, si hace ruido, si no enciende…' });
    const fotos = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: true });
    const enviar = h('button', { type: 'button', class: 'btn-primary btn-grande', text: 'Enviar solicitud' });
    const cancelar = h('button', { type: 'button', class: 'btn-sec', text: 'Cancelar', onclick: () => { formulario.classList.add('oculto'); } });
    enviar.addEventListener('click', ctx.accion(enviar, async () => {
      if (fotos.files.length > maxFotos) throw new Error('Puedes adjuntar máximo ' + maxFotos + ' fotos.');
      const id = await rpc('crear_caso', { p_tipo: tipo.value, p_marca: marca.value, p_modelo: modelo.value, p_serie: serie.value, p_falla: falla.value });
      try { if (fotos.files.length) await subirFotos(id, Array.from(fotos.files), 'solicitud'); }
      catch (e) { sessionStorage.setItem('sk_aviso', 'Tu solicitud se creó, pero hubo un problema con las fotos: ' + e.message); }
      location.href = 'caso.html?id=' + encodeURIComponent(id);
    }));
    formulario = h('div', { class: 'fbox', id: 'nueva' }, h('h3', { text: 'Nueva solicitud de reparación' }), lista,
      h('div', { class: 'fgrid' }, campo('Tipo de equipo *', tipo), campo('Marca', marca), campo('Modelo', modelo), campo('Serie', serie)),
      campo('Falla que presenta *', falla),
      campo('Fotos (opcional, máx. ' + maxFotos + ', 5 MB cada una)', fotos), h('div', { class: 'btns' }, enviar, cancelar));
    if (location.hash !== '#nueva') formulario.classList.add('oculto');
  }

  // ----- Lista -----
  const buscar = h('input', { type: 'search', placeholder: 'Buscar por equipo, marca o ' + (esCliente ? 'número' : 'cliente'), maxlength: '60', 'aria-label': 'Buscar' });
  const zona = h('div');
  const zonaPest = h('div');
  const verOcultas = h('input', { type: 'checkbox' });
  let datos = [];
  let grupo = 'todas';

  async function cargarDatos() {
    datos = await ok(sb.from('casos').select('id,numero,tipo_equipo,marca,modelo,estado,creado_en,oculto_cliente,oculto_admin,cliente:perfiles!casos_cliente_id_fkey(nombre)').order('creado_en', { ascending: false }).limit(500));
  }
  const visibles = () => datos.filter((c) => verOcultas.checked || !flagOculto(c));

  async function ocultar(c, ocultarlo) {
    if (ocultarlo && !(await confirmar('¿Quitar esta solicitud de tu lista?', 'No se borra: el taller conserva el historial y puedes volver a verla con "Mostrar quitadas".', 'Quitar de mi lista'))) return;
    try { await rpc('ocultar_caso', { p_caso: c.id, p_ocultar: ocultarlo }); avisar('ok', ocultarlo ? 'Solicitud quitada de tu lista.' : 'Solicitud restaurada.'); await cargarDatos(); pintar(); }
    catch (e) { avisar('err', e.message); }
  }

  function pintar() {
    const base = visibles();
    const items = [['todas', 'Todas'], ['activas', 'Activas'], ['aprobar', 'Por aprobar'], ['listas', 'Listas'], ['finalizadas', 'Finalizadas']]
      .map(([id, texto]) => ({ id, texto, n: base.filter(GRUPOS[id]).length }));
    poner(zonaPest, pestanas(items, grupo, (g) => { grupo = g; pintarLista(); }));
    pintarLista();
  }
  function pintarLista() {
    const q = buscar.value.trim().toLowerCase();
    const filas = visibles().filter((c) => GRUPOS[grupo](c) &&
      (!q || [c.tipo_equipo, c.marca, c.modelo, c.cliente && c.cliente.nombre, String(c.numero)].join(' ').toLowerCase().includes(q)));
    const cols = (esCliente ? ['N°', 'Equipo', 'Estado', 'Fecha'] : ['N°', 'Cliente', 'Equipo', 'Estado', 'Fecha']).concat(['Acciones']);
    const vacioMsg = !datos.length && esCliente
      ? vacio('Aún no tienes solicitudes', 'Cuéntanos qué equipo necesita reparación y te respondemos pronto.', h('button', { type: 'button', class: 'btn-primary', text: 'Crear mi primera solicitud', onclick: () => { formulario.classList.remove('oculto'); formulario.scrollIntoView({ behavior: 'smooth' }); } }))
      : vacio('No hay solicitudes con ese filtro', 'Prueba con otra pestaña o borra la búsqueda.');
    poner(zona, tabla(cols, filas.map((c) => h('tr', { class: 'clic' + (flagOculto(c) ? ' tenue' : ''), onclick: irCaso(c.id) },
      h('td', { text: '#' + c.numero }), esCliente ? null : h('td', { text: c.cliente ? c.cliente.nombre : '' }),
      h('td', { text: c.tipo_equipo + (c.marca ? ' ' + c.marca : '') + (c.modelo ? ' ' + c.modelo : '') }),
      h('td', null, insignia(ESTADOS, c.estado)), h('td', { text: fechaCorta(c.creado_en) }),
      h('td', null, h('div', { class: 'btns acciones-fila' },
        h('a', { class: 'btn-primary mini', href: 'caso.html?id=' + encodeURIComponent(c.id), text: 'Ver', 'aria-label': 'Ver solicitud #' + c.numero, onclick: (ev) => ev.stopPropagation() }),
        ocultable(c) ? h('button', { type: 'button', class: 'btn-sec mini', text: flagOculto(c) ? 'Restaurar' : 'Quitar',
          onclick: (ev) => { ev.stopPropagation(); ocultar(c, !flagOculto(c)); } }) : null)))), vacioMsg));
  }

  buscar.addEventListener('input', pintarLista);
  verOcultas.addEventListener('change', pintar);
  const btnNueva = esCliente ? h('button', { type: 'button', class: 'btn-primary btn-grande', text: '+ Nueva solicitud', onclick: () => { formulario.classList.toggle('oculto'); if (!formulario.classList.contains('oculto')) formulario.scrollIntoView({ behavior: 'smooth' }); } }) : null;
  await cargarDatos();
  poner(contenido, contenido.firstChild, btnNueva ? h('div', { class: 'btns' }, btnNueva) : null, formulario,
    h('div', { class: 'filtros' }, h('div', null, h('label', { class: 'flabel', text: 'Buscar' }), buscar),
      h('label', { class: 'check' }, verOcultas, h('span', { text: 'Mostrar quitadas' }))),
    zonaPest, zona);
  pintar();
});