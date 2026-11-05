SK.arrancar({ pagina: 'equipo.html', titulo: 'Equipo y clientes', roles: ['admin'] }, async (ctx) => {
  const { h, poner, ok, rpc, sb, cfg, campo, tabla, confirmar, pedirTexto } = SK;
  const raiz = h('div');
  poner(ctx.contenido, ctx.contenido.firstChild, raiz);
  const btn = (txt, clase, fn, exito) => { const b = h('button', { type: 'button', class: clase, text: txt }); b.addEventListener('click', ctx.accion(b, async () => { await fn(); await cargar(); }, exito)); return b; };
  const PERMISOS = [['gestionar_casos', 'Gestionar casos asignados'], ['crear_cotizaciones', 'Crear y aprobar cotizaciones'], ['gestionar_inventario', 'Gestionar inventario'], ['ver_reportes', 'Ver reportes'], ['gestionar_clientes', 'Ver datos de clientes']];
  let abierto = null;

  async function funcion(cuerpo) {
    const { data: { session } } = await sb.auth.getSession();
    const r = await fetch(cfg.URL + '/functions/v1/gestionar-equipo', {
      method: 'POST', headers: { 'Content-Type': 'application/json', apikey: cfg.CLAVE, Authorization: 'Bearer ' + session.access_token }, body: JSON.stringify(cuerpo) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || 'No se pudo completar la acción.');
    return j;
  }

  async function cargar() {
    const [perfiles, permisos] = await Promise.all([
      ok(sb.from('perfiles').select('id,usuario,nombre,correo,telefono,rol,activo').order('nombre')),
      ok(sb.from('permisos_equipo').select('*')),
    ]);
    const tecnicos = perfiles.filter((p) => p.rol === 'tecnico');
    const clientes = perfiles.filter((p) => p.rol === 'cliente');
    const f = { usuario: h('input', { type: 'text', maxlength: '20', autocapitalize: 'none' }), nombre: h('input', { type: 'text', maxlength: '100' }), correo: h('input', { type: 'email', maxlength: '120' }),
      telefono: h('input', { type: 'tel', maxlength: '15' }), clave: h('input', { type: 'password', maxlength: '72', autocomplete: 'new-password' }) };
    const crear = btn('Crear técnico', 'btn-primary', async () => {
      await funcion({ accion: 'crear', usuario: f.usuario.value, nombre: f.nombre.value, correo: f.correo.value, telefono: f.telefono.value, clave: f.clave.value });
      f.clave.value = '';
    }, 'Técnico creado. Ahora asígnale sus funciones.');

    const filasTec = [];
    for (const t of tecnicos) {
      filasTec.push(h('tr', null, h('td', { text: t.nombre }), h('td', { text: t.usuario }), h('td', { text: t.correo }), h('td', { text: t.activo ? 'Activo' : 'Desactivado' }),
        h('td', null, h('div', { class: 'btns' },
          h('button', { type: 'button', class: 'btn-sec mini', text: 'Funciones', onclick: () => { abierto = abierto === t.id ? null : t.id; cargar(); } }),
          btn(t.activo ? 'Desactivar' : 'Activar', t.activo ? 'btn-peligro mini' : 'btn-ok mini', async () => { if (!t.activo || await confirmar('¿Desactivar a ' + t.nombre + '?', 'No podrá entrar al sistema hasta que lo actives de nuevo.', 'Desactivar', true)) await rpc('admin_cambiar_activo', { p_usuario: t.id, p_activo: !t.activo }); }),
          btn('Nueva clave', 'btn-sec mini', async () => { const k = await pedirTexto('Nueva clave temporal', 'Clave temporal (mínimo 6 caracteres)', 'Cambiar clave', { multilinea: false, minimo: 6 }); if (k) await funcion({ accion: 'clave', usuario_id: t.id, clave: k }); }, 'Clave cambiada. Compártela por un canal seguro.')))));
      if (abierto === t.id) {
        const p = permisos.find((x) => x.usuario_id === t.id) || {};
        const cajas = PERMISOS.map(([k, txt]) => ({ k, caja: h('input', { type: 'checkbox', checked: !!p[k] }), txt }));
        filasTec.push(h('tr', null, h('td', { colspan: '5' }, h('div', { class: 'perm-grid' }, cajas.map((c) => h('label', { class: 'perm-item' }, c.caja, h('span', { text: c.txt })))),
          btn('Guardar funciones', 'btn-primary', () => rpc('admin_guardar_permisos', { p_usuario: t.id, p_permisos: Object.fromEntries(cajas.map((c) => [c.k, c.caja.checked])) }), 'Funciones guardadas.'))));
      }
    }
    poner(raiz,
      h('div', { class: 'fbox' }, h('h3', { text: 'Nuevo técnico' }),
        h('div', { class: 'fgrid' }, campo('Usuario', f.usuario), campo('Nombre completo', f.nombre), campo('Correo', f.correo), campo('Teléfono', f.telefono), campo('Clave temporal', f.clave)),
        h('p', { class: 'flabel', text: 'El técnico podrá cambiar su clave en "Mi cuenta". Un técnico nuevo no puede hacer nada hasta que le actives funciones.' }), crear),
      h('h3', { text: 'Técnicos' }), tabla(['Nombre', 'Usuario', 'Correo', 'Estado', ''], filasTec, 'Aún no hay técnicos.'),
      h('h3', { text: 'Clientes' }),
      tabla(['Nombre', 'Usuario', 'Correo', 'Teléfono', 'Estado', ''], clientes.map((c) => h('tr', null, h('td', { text: c.nombre }), h('td', { text: c.usuario }), h('td', { text: c.correo }), h('td', { text: c.telefono }), h('td', { text: c.activo ? 'Activo' : 'Desactivado' }),
        h('td', null, btn(c.activo ? 'Desactivar' : 'Activar', c.activo ? 'btn-peligro mini' : 'btn-ok mini', async () => { if (!c.activo || await confirmar('¿Desactivar a ' + c.nombre + '?', 'No podrá entrar al sistema hasta que lo actives de nuevo.', 'Desactivar', true)) await rpc('admin_cambiar_activo', { p_usuario: c.id, p_activo: !c.activo }); })))), 'Aún no hay clientes.'));
  }
  await cargar();
});
