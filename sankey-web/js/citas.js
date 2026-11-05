SK.arrancar({ pagina: 'citas.html', titulo: 'Citas', roles: ['cliente', 'admin'] }, async (ctx) => {
  const { h, poner, vaciar, ok, rpc, sb, campo, opcion, tabla, insignia, ESTADOS_CITA, fechaHora, hoyISO, pedirTexto } = SK;
  const { contenido, perfil, avisar } = ctx;
  const raiz = h('div');
  poner(contenido, contenido.firstChild, raiz);
  const hora = (v) => new Date(v).toLocaleTimeString('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' });
  const btn = (txt, clase, fn, exito) => { const b = h('button', { type: 'button', class: clase, text: txt }); b.addEventListener('click', ctx.accion(b, async () => { await fn(); await cargar(); }, exito)); return b; };
  let reprogramando = null; // cita que el cliente está moviendo

  async function cargar() {
    if (perfil.rol === 'cliente') return vistaCliente();
    return vistaAdmin();
  }

  async function vistaCliente() {
    const [citas, casos] = await Promise.all([
      ok(sb.from('citas').select('id,inicio,estado,motivo_cambio,caso_id').order('inicio', { ascending: false }).limit(60)),
      ok(sb.from('casos').select('id,numero,tipo_equipo').in('estado', ['solicitud_enviada', 'aceptada', 'en_revision', 'cotizada', 'cotizacion_aprobada', 'en_reparacion', 'lista_para_retirar']).order('numero', { ascending: false })),
    ]);
    const fecha = h('input', { type: 'date', min: hoyISO(0), max: hoyISO(60) });
    const casoSel = h('select', null, opcion('', 'Sin relacionar a un caso'), casos.map((c) => opcion(c.id, '#' + c.numero + ' ' + c.tipo_equipo)));
    const zonaSlots = h('div', { class: 'slots' });
    const ver = h('button', { type: 'button', class: 'btn-primary', text: 'Ver horarios libres' });
    ver.addEventListener('click', ctx.accion(ver, async () => {
      vaciar(zonaSlots);
      if (!fecha.value) throw new Error('Elige una fecha.');
      const libres = await rpc('horarios_libres', { p_fecha: fecha.value });
      if (!libres.length) { poner(zonaSlots, h('div', { class: 'vacio', text: 'No hay horarios libres ese día. Prueba otra fecha o propón una hora.' })); return; }
      libres.forEach((s) => zonaSlots.append(h('button', { type: 'button', text: hora(s.inicio), onclick: ctx.accion(ver, async () => {
        if (reprogramando) {
          const m = await pedirTexto('Reprogramar cita', '¿Por qué cambias la cita?', 'Reprogramar'); if (!m) return;
          await rpc('cambiar_cita', { p_cita: reprogramando, p_accion: 'reprogramar', p_nuevo_inicio: s.inicio, p_motivo: m });
          reprogramando = null; await cargar(); avisar('ok', 'Cita reprogramada. Te enviamos la confirmación por correo.');
        } else {
          await rpc('agendar_cita', { p_inicio: s.inicio, p_caso: casoSel.value || null });
          await cargar(); avisar('ok', 'Cita confirmada. Te enviamos la confirmación por correo.');
        }
      }) })));
    }));
    const propFecha = h('input', { type: 'datetime-local' });
    const proponer = btn('Proponer esta hora', 'btn-sec', async () => {
      if (!propFecha.value) throw new Error('Elige fecha y hora.');
      await rpc('proponer_cita', { p_inicio: new Date(propFecha.value).toISOString(), p_caso: casoSel.value || null });
    }, 'Propuesta enviada. El taller te confirmará.');

    const filas = citas.map((c) => {
      const abierta = ['confirmada', 'pendiente_confirmacion'].includes(c.estado) && new Date(c.inicio) > new Date();
      return h('tr', null, h('td', { text: fechaHora(c.inicio) }), h('td', null, insignia(ESTADOS_CITA, c.estado)), h('td', { text: c.motivo_cambio || '' }),
        h('td', null, abierta ? h('div', { class: 'btns' },
          h('button', { type: 'button', class: 'btn-sec mini', text: 'Cambiar hora', onclick: () => { reprogramando = c.id; cargar().then(() => avisar('info', 'Elige el nuevo horario para tu cita del ' + fechaHora(c.inicio) + '.')); } }),
          btn('Cancelar', 'btn-peligro mini', async () => { const m = await pedirTexto('Cancelar cita', '¿Por qué cancelas la cita?', 'Cancelar cita', { peligro: true }); if (m) await rpc('cambiar_cita', { p_cita: c.id, p_accion: 'cancelar', p_motivo: m }); })) : null));
    });
    poner(raiz,
      h('div', { class: 'fbox' }, h('h3', { text: reprogramando ? 'Elige el nuevo horario' : 'Agendar una cita de revisión' }),
        h('div', { class: 'fgrid' }, campo('Fecha', fecha), reprogramando ? null : campo('Relacionada con', casoSel)),
        h('div', { class: 'btns' }, ver, reprogramando ? h('button', { type: 'button', class: 'btn-sec', text: 'No cambiar', onclick: () => { reprogramando = null; cargar(); } }) : null), zonaSlots,
        reprogramando ? null : [h('h4', { text: '¿Ningún horario te sirve? Propón uno' }), h('div', { class: 'fgrid' }, campo('Fecha y hora', propFecha)), proponer]),
      h('h3', { text: 'Mis citas' }), tabla(['Fecha y hora', 'Estado', 'Motivo del cambio', ''], filas, 'No tienes citas.'));
  }

  async function vistaAdmin() {
    const citas = await ok(sb.from('citas').select('id,inicio,estado,motivo_cambio,cliente:perfiles!citas_cliente_id_fkey(nombre,telefono)').in('estado', ['confirmada', 'pendiente_confirmacion']).order('inicio').limit(200));
    const pend = citas.filter((c) => c.estado === 'pendiente_confirmacion');
    const nueva = h('input', { type: 'datetime-local' });
    const mover = (c) => { const b = h('button', { type: 'button', class: 'btn-sec mini', text: 'Reprogramar' });
      b.addEventListener('click', ctx.accion(b, async () => {
        if (!nueva.value) throw new Error('Elige primero la nueva fecha y hora en el recuadro de arriba.');
        const m = await pedirTexto('Reprogramar cita', 'Motivo (se envía al cliente)', 'Reprogramar'); if (!m) return;
        await rpc('responder_cita', { p_cita: c.id, p_accion: 'reprogramar', p_nuevo_inicio: new Date(nueva.value).toISOString(), p_motivo: m }); await cargar();
      }, 'Cita reprogramada.')); return b; };
    const filas = citas.map((c) => h('tr', null, h('td', { text: fechaHora(c.inicio) }), h('td', { text: c.cliente ? c.cliente.nombre : '' }), h('td', { text: c.cliente ? c.cliente.telefono : '' }),
      h('td', null, insignia(ESTADOS_CITA, c.estado)),
      h('td', null, h('div', { class: 'btns' },
        c.estado === 'pendiente_confirmacion' ? btn('Confirmar', 'btn-ok mini', () => rpc('responder_cita', { p_cita: c.id, p_accion: 'confirmar' }), 'Cita confirmada.') : null,
        c.estado === 'confirmada' && new Date(c.inicio) < new Date() ? [btn('Realizada', 'btn-ok mini', () => rpc('marcar_cita', { p_cita: c.id, p_estado: 'realizada' })), btn('No asistió', 'btn-sec mini', () => rpc('marcar_cita', { p_cita: c.id, p_estado: 'no_asistio' }))] : null,
        mover(c), btn('Cancelar', 'btn-peligro mini', async () => { const m = await pedirTexto('Cancelar cita', 'Motivo (se envía al cliente)', 'Cancelar cita', { peligro: true }); if (m) await rpc('responder_cita', { p_cita: c.id, p_accion: 'cancelar', p_motivo: m }); })))));
    poner(raiz,
      pend.length ? h('div', { class: 'msg aviso', text: 'Hay ' + pend.length + ' propuesta(s) de cita por confirmar.' }) : null,
      h('div', { class: 'fbox' }, h('h3', { text: 'Para reprogramar' }), h('p', { class: 'flabel', text: 'Elige aquí la nueva fecha y hora y luego pulsa "Reprogramar" en la cita.' }), h('div', { class: 'fgrid' }, campo('Nueva fecha y hora', nueva))),
      h('h3', { text: 'Citas pendientes y próximas' }), tabla(['Fecha y hora', 'Cliente', 'Teléfono', 'Estado', ''], filas, 'No hay citas.'),
      h('p', { class: 'flabel', text: 'Los horarios de atención y días sin atención se configuran en Ajustes.' }));
  }
  await cargar();
});
