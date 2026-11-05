SK.arrancar({ pagina: 'reportes.html', titulo: 'Reportes', roles: ['admin', 'tecnico'], permiso: 'ver_reportes' }, async (ctx) => {
  const { h, poner, rpc, tarjeta, tabla, dinero, ESTADOS } = SK;
  const r = await rpc('reporte_resumen');
  const estados = Object.entries(r.casos_por_estado || {});
  const max = Math.max(1, ...estados.map(([, n]) => n));
  poner(ctx.contenido, ctx.contenido.firstChild,
    h('div', { class: 'tarjetas' }, tarjeta('Utilidad estimada (entregados)', dinero(r.utilidad_estimada), 't-verde'), tarjeta('Equipos sin retirar', r.sin_retirar, 't-amarillo'), tarjeta('Por llamar al cliente', r.contacto_manual, 't-rojo')),
    h('div', { class: 'fbox' }, h('h3', { text: 'Casos por estado' }), estados.map(([e, n]) => h('div', { class: 'barra' }, h('span', { class: 'flabel', text: (ESTADOS[e] ? ESTADOS[e][0] : e) + ': ' + n }), h('progress', { max: String(max), value: String(n) })))),
    h('h3', { text: 'Aprobado por mes (últimos 6 meses)' }), tabla(['Mes', 'Cotizaciones', 'Total aprobado'], (r.aprobado_por_mes || []).map((m) => h('tr', null, h('td', { text: m.mes }), h('td', { text: String(m.cantidad) }), h('td', { text: dinero(m.total) }))), 'Sin datos todavía.'),
    h('h3', { text: 'Repuestos más usados' }), tabla(['Repuesto', 'Unidades'], (r.repuestos_mas_usados || []).map((m) => h('tr', null, h('td', { text: m.nombre }), h('td', { text: String(m.cantidad) }))), 'Sin datos todavía.'),
    h('h3', { text: 'Stock bajo' }), tabla(['Repuesto', 'Disponible', 'Mínimo'], (r.stock_bajo || []).map((m) => h('tr', null, h('td', { text: m.nombre }), h('td', { text: String(m.disponible) }), h('td', { text: String(m.minimo) }))), 'Todo el inventario está en orden.'),
    h('h3', { text: 'Reparaciones por técnico' }), tabla(['Técnico', 'Reparaciones terminadas'], (r.reparaciones_por_tecnico || []).map((m) => h('tr', null, h('td', { text: m.nombre }), h('td', { text: String(m.cantidad) }))), 'Sin datos todavía.'));
});
