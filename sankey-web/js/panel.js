SK.arrancar({ pagina: 'panel.html', titulo: 'Inicio' }, async (ctx) => {
  const { h, poner, ok, sb, tarjeta, tabla, insignia, ESTADOS, fechaCorta, fechaHora } = SK;
  const { perfil, contenido } = ctx;
  const irCaso = (id) => () => { location.href = 'caso.html?id=' + encodeURIComponent(id); };
  const ACTIVOS = ['solicitud_enviada', 'aceptada', 'en_revision', 'cotizada', 'cotizacion_aprobada', 'cotizacion_rechazada', 'en_reparacion', 'lista_para_retirar'];

  if (perfil.rol === 'cliente') {
    const [casos, cots, citas] = await Promise.all([
      ok(sb.from('casos').select('id,numero,tipo_equipo,marca,estado,creado_en,oculto_cliente').order('creado_en', { ascending: false }).limit(50)),
      ok(sb.from('cotizaciones').select('id,caso_id').eq('estado', 'pendiente_aprobacion')),
      ok(sb.from('citas').select('id,inicio').in('estado', ['confirmada', 'pendiente_confirmacion']).gt('inicio', new Date().toISOString()).order('inicio').limit(5)),
    ]);
    casos.splice(0, casos.length, ...casos.filter((c) => !c.oculto_cliente));
    const activos = casos.filter((c) => ACTIVOS.includes(c.estado)).length;
    const listos = casos.filter((c) => c.estado === 'lista_para_retirar').length;
    poner(contenido, contenido.firstChild,
      h('div', { class: 'bienvenida' },
        h('div', null, h('h3', { text: 'Hola, ' + perfil.nombre.split(' ')[0] }), h('p', { text: 'Pide una reparación en minutos y sigue cada paso desde aquí.' })),
        h('div', { class: 'btns' }, h('a', { class: 'btn-cian btn-grande', href: 'casos.html#nueva', text: '+ Nueva solicitud' }),
          h('a', { class: 'btn-sec', href: 'citas.html', text: 'Agendar una cita' }))),
      cots.length ? h('div', { class: 'proximo' }, h('div', null, h('strong', { text: 'Tienes ' + cots.length + (cots.length === 1 ? ' cotización esperando' : ' cotizaciones esperando') + ' tu respuesta' }), h('span', { text: 'Apruébala o recházala para que el taller continúe.' })),
        h('a', { class: 'btn-primary', href: 'casos.html', text: 'Ver solicitudes' })) : null,
      listos ? h('div', { class: 'proximo' }, h('div', null, h('strong', { text: listos === 1 ? 'Tienes un equipo listo para retirar' : 'Tienes ' + listos + ' equipos listos para retirar' }), h('span', { text: 'Pasa por el taller: Carrera 16 #21-62, Sincelejo.' }))) : null,
      h('div', { class: 'tarjetas' },
        tarjeta('Solicitudes activas', activos, 't-morado', 'casos.html'), tarjeta('Cotizaciones por responder', cots.length, 't-amarillo', 'casos.html'),
        tarjeta('Listos para retirar', listos, 't-verde', 'casos.html'), tarjeta('Próxima cita', citas[0] ? fechaHora(citas[0].inicio) : 'Ninguna', 't-azul', 'citas.html')),
      h('h3', { text: 'Mis últimas solicitudes' }),
      tabla(['N°', 'Equipo', 'Estado', 'Fecha', 'Acciones'], casos.slice(0, 8).map((c) =>
        h('tr', { class: 'clic', onclick: irCaso(c.id) }, h('td', { text: '#' + c.numero }), h('td', { text: c.tipo_equipo + (c.marca ? ' ' + c.marca : '') }),
          h('td', null, insignia(ESTADOS, c.estado)), h('td', { text: fechaCorta(c.creado_en) }), h('td', null, h('a', { class: 'btn-primary mini', href: 'caso.html?id=' + encodeURIComponent(c.id), text: 'Ver', 'aria-label': 'Ver solicitud #' + c.numero, onclick: (ev) => ev.stopPropagation() })))), SK.vacio('Aún no has enviado solicitudes', 'Pulsa "Nueva solicitud" y cuéntanos qué equipo necesita reparación.')));
    return;
  }

  // Equipo (admin / técnico)
  const casos = ctx.permisos.gestionar_casos
    ? await ok(sb.from('casos').select('id,numero,tipo_equipo,marca,estado,requiere_contacto_manual,creado_en,cliente:perfiles!casos_cliente_id_fkey(nombre)').order('creado_en', { ascending: false }).limit(1000))
    : [];
  const cuenta = (e) => casos.filter((c) => c.estado === e).length;
  const nuevas = casos.filter((c) => c.estado === 'solicitud_enviada');
  const porCotizar = casos.filter((c) => ['aceptada', 'en_revision', 'cotizacion_rechazada'].includes(c.estado)).length;
  poner(contenido, contenido.firstChild,
    ctx.esAdmin && nuevas.length ? h('div', { class: 'msg aviso', text: 'Hay ' + nuevas.length + ' solicitud(es) nueva(s) por revisar.' }) : null,
    casos.some((c) => c.requiere_contacto_manual && c.estado === 'lista_para_retirar') ? h('div', { class: 'msg info', text: 'Hay equipos sin retirar que requieren llamada al cliente (ver "Sin retirar").' }) : null,
    ctx.permisos.gestionar_casos ? h('div', { class: 'tarjetas' },
      tarjeta('Solicitudes nuevas', nuevas.length, 't-azul', 'casos.html'), tarjeta('Por cotizar', porCotizar, 't-amarillo', 'casos.html'),
      tarjeta('Cotizaciones por aprobar', cuenta('cotizada'), 't-morado', 'casos.html'), tarjeta('En reparación', cuenta('en_reparacion'), 't-azul', 'casos.html'),
      tarjeta('Listos sin retirar', cuenta('lista_para_retirar'), 't-verde', 'retiros.html')) : h('div', { class: 'msg info', text: 'Tu administrador aún no te ha asignado funciones. Pídele que active las que necesites.' }),
    ctx.permisos.gestionar_casos ? h('h3', { text: ctx.esAdmin ? 'Solicitudes nuevas' : 'Mis casos recientes' }) : null,
    ctx.permisos.gestionar_casos ? tabla(['N°', 'Cliente', 'Equipo', 'Estado', 'Fecha', 'Acciones'],
      (ctx.esAdmin ? nuevas : casos.filter((c) => ACTIVOS.includes(c.estado))).slice(0, 10).map((c) =>
        h('tr', { class: 'clic', onclick: irCaso(c.id) }, h('td', { text: '#' + c.numero }), h('td', { text: c.cliente ? c.cliente.nombre : '' }),
          h('td', { text: c.tipo_equipo + (c.marca ? ' ' + c.marca : '') }), h('td', null, insignia(ESTADOS, c.estado)), h('td', { text: fechaCorta(c.creado_en) }), h('td', null, h('a', { class: 'btn-primary mini', href: 'caso.html?id=' + encodeURIComponent(c.id), text: 'Ver', 'aria-label': 'Ver solicitud #' + c.numero, onclick: (ev) => ev.stopPropagation() })))),
      'Nada pendiente por ahora.') : null);
});