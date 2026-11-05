SK.arrancar({ pagina: 'ajustes.html', titulo: 'Ajustes' }, async (ctx) => {
  const { h, poner, ok, sb, campo, opcion, tabla, textoError } = SK;
  const { perfil } = ctx;
  const raiz = h('div');
  poner(ctx.contenido, ctx.contenido.firstChild, raiz);
  const btn = (txt, clase, fn, exito) => { const b = h('button', { type: 'button', class: clase, text: txt }); b.addEventListener('click', ctx.accion(b, async () => { await fn(); await cargar(); }, exito)); return b; };
  const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const validaClave = (k) => k.length >= 6 && k.length <= 72;

  async function cargar() {
    const nombre = h('input', { type: 'text', maxlength: '100', value: perfil.nombre });
    const tel = h('input', { type: 'tel', maxlength: '15', value: perfil.telefono });
    const k1 = h('input', { type: 'password', maxlength: '72', autocomplete: 'new-password' });
    const k2 = h('input', { type: 'password', maxlength: '72', autocomplete: 'new-password' });
    const miCuenta = h('div', { class: 'fbox' }, h('h3', { text: 'Mi cuenta' }),
      h('div', { class: 'fgrid' }, campo('Usuario', h('input', { type: 'text', value: perfil.usuario, disabled: true })), campo('Correo', h('input', { type: 'text', value: perfil.correo, disabled: true })),
        campo('Nombre', nombre), campo('Teléfono', tel)),
      h('div', { class: 'btns' }, btn('Guardar datos', 'btn-primary', async () => {
        const n = nombre.value.trim(), t = tel.value.trim();
        if (n.length < 2) throw new Error('Escribe tu nombre.');
        if (!/^[0-9+ ]{7,15}$/.test(t)) throw new Error('Teléfono inválido (7 a 15 dígitos).');
        const { error } = await sb.from('perfiles').update({ nombre: n, telefono: t }).eq('id', perfil.id);
        if (error) throw new Error(textoError(error));
        perfil.nombre = n; perfil.telefono = t;
      }, 'Datos guardados.')),
      h('h4', { text: 'Cambiar contraseña' }),
      h('div', { class: 'fgrid' }, campo('Contraseña nueva', k1), campo('Repítela', k2)),
      h('p', { class: 'flabel', text: 'Mínimo 6 caracteres. Puedes usar las letras, números o símbolos que quieras.' }),
      h('div', { class: 'btns' }, btn('Cambiar contraseña', 'btn-sec', async () => {
        if (!validaClave(k1.value)) throw new Error('La contraseña debe tener mínimo 6 caracteres.');
        if (k1.value !== k2.value) throw new Error('Las contraseñas no coinciden.');
        const { error } = await sb.auth.updateUser({ password: k1.value });
        if (error) throw new Error('No se pudo cambiar la contraseña. Cierra sesión, vuelve a entrar e inténtalo otra vez.');
        k1.value = ''; k2.value = '';
      }, 'Contraseña cambiada.')));
    if (perfil.rol !== 'admin') { poner(raiz, miCuenta); return; }

    const [cfg, horarios, bloqueados] = await Promise.all([
      ok(sb.from('configuracion').select('*').maybeSingle()),
      ok(sb.from('horarios_atencion').select('*').order('dia_semana').order('hora_inicio')),
      ok(sb.from('dias_bloqueados').select('*').order('fecha')),
    ]);
    const num = (v, min, max, step) => h('input', { type: 'number', min: String(min), max: String(max), step: String(step || 1), value: String(v) });
    const c = { dur: num(cfg.duracion_cita_min, 10, 240, 5), pend: num(cfg.max_citas_pendientes, 1, 10), rep: num(cfg.max_reprogramaciones, 0, 10), val: num(cfg.dias_validez_cotizacion, 1, 90),
      rec: num(cfg.dias_primer_recordatorio, 1, 60), man: num(cfg.dias_contacto_manual, 2, 90), fot: num(cfg.max_fotos_por_solicitud, 0, 10) };
    const formCfg = h('div', { class: 'fbox' }, h('h3', { text: 'Reglas del taller' }),
      h('div', { class: 'fgrid' }, campo('Duración de cada cita (min)', c.dur), campo('Máx. citas pendientes por cliente', c.pend), campo('Máx. cambios por cita', c.rep), campo('Días de validez de una cotización', c.val),
        campo('Días para el recordatorio de retiro', c.rec), campo('Día en que debes llamar al cliente', c.man), campo('Máx. fotos por solicitud', c.fot)),
      h('div', { class: 'btns' }, btn('Guardar reglas', 'btn-primary', async () => {
        const { error } = await sb.from('configuracion').update({ duracion_cita_min: Number(c.dur.value), max_citas_pendientes: Number(c.pend.value), max_reprogramaciones: Number(c.rep.value),
          dias_validez_cotizacion: Number(c.val.value), dias_primer_recordatorio: Number(c.rec.value), dias_contacto_manual: Number(c.man.value), max_fotos_por_solicitud: Number(c.fot.value) }).eq('id', true);
        if (error) throw new Error('Revisa los valores. El día de llamada debe ser mayor que el del recordatorio.');
      }, 'Reglas guardadas.')));

    const dia = h('select', null, DIAS.slice(1).map((d, i) => opcion(String(i + 1), d)));
    const ini = h('input', { type: 'time', value: '08:00' }); const fin = h('input', { type: 'time', value: '12:00' });
    const formHor = h('div', { class: 'fbox' }, h('h3', { text: 'Horarios de atención para citas' }),
      tabla(['Día', 'Desde', 'Hasta', ''], horarios.map((x) => h('tr', null, h('td', { text: DIAS[x.dia_semana] }), h('td', { text: x.hora_inicio.slice(0, 5) }), h('td', { text: x.hora_fin.slice(0, 5) }),
        h('td', null, btn('Quitar', 'btn-peligro mini', async () => { const { error } = await sb.from('horarios_atencion').delete().eq('id', x.id); if (error) throw new Error(textoError(error)); })))), 'Aún no hay horarios: los clientes no podrán agendar.'),
      h('div', { class: 'fgrid' }, campo('Día', dia), campo('Desde', ini), campo('Hasta', fin)),
      h('div', { class: 'btns' }, btn('Agregar horario', 'btn-primary', async () => {
        const { error } = await sb.from('horarios_atencion').insert({ dia_semana: Number(dia.value), hora_inicio: ini.value, hora_fin: fin.value });
        if (error) throw new Error('Horario inválido o repetido.');
      }, 'Horario agregado.')),
      h('p', { class: 'flabel', text: 'Las citas se parten en bloques de la duración configurada (por ejemplo 08:00, 08:30, 09:00...).' }));

    const fecha = h('input', { type: 'date' }); const motivo = h('input', { type: 'text', maxlength: '200', placeholder: 'Ej: Festivo' });
    const formBloq = h('div', { class: 'fbox' }, h('h3', { text: 'Días sin atención' }),
      tabla(['Fecha', 'Motivo', ''], bloqueados.map((x) => h('tr', null, h('td', { text: x.fecha }), h('td', { text: x.motivo || '' }),
        h('td', null, btn('Quitar', 'btn-peligro mini', async () => { const { error } = await sb.from('dias_bloqueados').delete().eq('fecha', x.fecha); if (error) throw new Error(textoError(error)); })))), 'No hay días bloqueados.'),
      h('div', { class: 'fgrid' }, campo('Fecha', fecha), campo('Motivo', motivo)),
      h('div', { class: 'btns' }, btn('Bloquear día', 'btn-primary', async () => {
        if (!fecha.value) throw new Error('Elige una fecha.');
        const { error } = await sb.from('dias_bloqueados').insert({ fecha: fecha.value, motivo: motivo.value.trim() || null });
        if (error) throw new Error('No se pudo guardar (¿ya estaba bloqueado?).');
      }, 'Día bloqueado.')));
    poner(raiz, miCuenta, formCfg, formHor, formBloq);
  }
  await cargar();
});
