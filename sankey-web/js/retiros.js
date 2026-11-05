SK.arrancar({ pagina: 'retiros.html', titulo: 'Equipos sin retirar', roles: ['admin', 'tecnico'], permiso: 'gestionar_casos' }, async (ctx) => {
  const { h, poner, ok, sb, tabla, insignia, fechaCorta } = SK;
  const casos = await ok(sb.from('casos').select('id,numero,tipo_equipo,marca,listo_para_retirar_en,recordatorios_activos,requiere_contacto_manual,ultimo_recordatorio_en,cliente:perfiles!casos_cliente_id_fkey(nombre,telefono)').eq('estado', 'lista_para_retirar').order('listo_para_retirar_en'));
  const dias = (v) => Math.floor((Date.now() - new Date(v).getTime()) / 86400000);
  const filas = casos.map((c) => h('tr', { class: 'clic', onclick: () => { location.href = 'caso.html?id=' + encodeURIComponent(c.id); } },
    h('td', { text: '#' + c.numero }), h('td', { text: c.cliente ? c.cliente.nombre : '' }),
    h('td', null, c.cliente ? h('a', { href: 'tel:' + c.cliente.telefono.replace(/[^0-9+]/g, ''), text: c.cliente.telefono, onclick: (e) => e.stopPropagation() }) : null),
    h('td', { text: c.tipo_equipo + (c.marca ? ' ' + c.marca : '') }), h('td', { text: fechaCorta(c.listo_para_retirar_en) + ' (' + dias(c.listo_para_retirar_en) + ' días)' }),
    h('td', null, c.requiere_contacto_manual ? h('span', { class: 'badge b-rojo', text: 'Llamar al cliente' }) : !c.recordatorios_activos ? h('span', { class: 'badge b-gris', text: 'Recordatorios pausados' }) : c.ultimo_recordatorio_en ? h('span', { class: 'badge b-amarillo', text: 'Recordatorio enviado' }) : h('span', { class: 'badge b-azul', text: 'Esperando' }))));
  poner(ctx.contenido, ctx.contenido.firstChild, h('p', { class: 'flabel', text: 'Se envía un recordatorio automático por correo y, pasados los días configurados, el sistema te marca "Llamar al cliente".' }),
    tabla(['N°', 'Cliente', 'Teléfono', 'Equipo', 'Lista desde', 'Seguimiento'], filas, 'No hay equipos esperando ser retirados.'));
});
