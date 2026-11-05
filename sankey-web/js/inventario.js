SK.arrancar({ pagina: 'inventario.html', titulo: 'Inventario', roles: ['admin', 'tecnico'], permiso: 'gestionar_inventario' }, async (ctx) => {
  const { h, poner, ok, rpc, sb, campo, tabla, dinero, fechaHora, pedirTexto } = SK;
  const { contenido } = ctx;
  const raiz = h('div');
  poner(contenido, contenido.firstChild, raiz);
  const btn = (txt, clase, fn, exito) => { const b = h('button', { type: 'button', class: clase, text: txt }); b.addEventListener('click', ctx.accion(b, async () => { await fn(); await cargar(); }, exito)); return b; };
  let editando = null;

  async function cargar() {
    const [reps, movs] = await Promise.all([
      ok(sb.from('repuestos').select('*').order('nombre')),
      ok(sb.from('movimientos_inventario').select('id,tipo,cantidad,stock_total_resultante,nota,creado_en,repuesto:repuestos(nombre)').order('creado_en', { ascending: false }).limit(30)),
    ]);
    const nombre = h('input', { type: 'text', maxlength: '100', value: editando ? editando.nombre : '' });
    const desc = h('input', { type: 'text', maxlength: '300', value: editando ? editando.descripcion || '' : '' });
    const costo = h('input', { type: 'number', min: '0', step: '100', value: editando ? String(editando.costo) : '0' });
    const precio = h('input', { type: 'number', min: '0', step: '100', value: editando ? String(editando.precio_venta) : '0' });
    const minimo = h('input', { type: 'number', min: '0', step: '1', value: editando ? String(editando.stock_minimo) : '2' });
    const activo = h('input', { type: 'checkbox', checked: editando ? editando.activo : true });
    const bajos = reps.filter((r) => r.activo && r.stock_disponible <= r.stock_minimo);
    const mover = (r, tipo, titulo) => btn(titulo, 'btn-sec mini', async () => {
      const t = await pedirTexto(titulo, 'Cantidad (número entero)', 'Continuar', { multilinea: false, minimo: 1 }); if (!t) return;
      const n = Number(t); if (!Number.isInteger(n)) throw new Error('Escribe un número entero.');
      const nota = (await pedirTexto(titulo, 'Nota: de dónde viene o por qué (opcional)', 'Guardar', { minimo: 0 })) || '';
      await rpc('mover_inventario', { p_repuesto: r.id, p_tipo: tipo, p_cantidad: n, p_nota: nota });
    }, 'Inventario actualizado.');
    poner(raiz,
      bajos.length ? h('div', { class: 'msg aviso', text: 'Stock bajo: ' + bajos.map((r) => r.nombre).join(', ') }) : null,
      h('div', { class: 'fbox' }, h('h3', { text: editando ? 'Editar repuesto' : 'Nuevo repuesto' }),
        h('div', { class: 'fgrid' }, campo('Nombre *', nombre), campo('Descripción', desc), campo('Costo ($)', costo), campo('Precio de venta ($)', precio), campo('Stock mínimo', minimo)),
        h('label', { class: 'check' }, activo, h('span', { text: 'Activo (aparece al cotizar)' })),
        h('div', { class: 'btns' },
          btn(editando ? 'Guardar cambios' : 'Crear repuesto', 'btn-primary', async () => {
            await rpc('guardar_repuesto', { p_id: editando ? editando.id : null, p_nombre: nombre.value, p_descripcion: desc.value, p_costo: Number(costo.value || 0), p_precio_venta: Number(precio.value || 0), p_stock_minimo: Number(minimo.value || 0), p_activo: activo.checked });
            editando = null;
          }, 'Repuesto guardado.'),
          editando ? h('button', { type: 'button', class: 'btn-sec', text: 'Cancelar edición', onclick: () => { editando = null; cargar(); } }) : null),
        h('p', { class: 'flabel', text: 'El stock se mueve con "Entrada" y "Ajuste". Nunca se edita a mano: queda registrado quién y cuándo.' })),
      h('h3', { text: 'Repuestos' }),
      tabla(['Repuesto', 'Total', 'Reservado', 'Disponible', 'Mín.', 'Costo', 'Precio', 'Estado', ''], reps.map((r) => h('tr', null,
        h('td', { text: r.nombre }), h('td', { text: String(r.stock_total) }), h('td', { text: String(r.stock_reservado) }),
        h('td', null, h('strong', { text: String(r.stock_disponible) })), h('td', { text: String(r.stock_minimo) }),
        h('td', { text: dinero(r.costo) }), h('td', { text: dinero(r.precio_venta) }), h('td', { text: r.activo ? 'Activo' : 'Inactivo' }),
        h('td', null, h('div', { class: 'btns' }, mover(r, 'entrada', '+ Entrada'), mover(r, 'ajuste_mas', 'Ajuste +'), mover(r, 'ajuste_menos', 'Ajuste −'),
          h('button', { type: 'button', class: 'btn-sec mini', text: 'Editar', onclick: () => { editando = r; cargar(); window.scrollTo({ top: 0 }); } }))))), 'Aún no hay repuestos.'),
      h('h3', { text: 'Últimos movimientos' }),
      tabla(['Fecha', 'Repuesto', 'Tipo', 'Cant.', 'Stock total', 'Nota'], movs.map((m) => h('tr', null, h('td', { text: fechaHora(m.creado_en) }), h('td', { text: m.repuesto ? m.repuesto.nombre : '' }),
        h('td', { text: { entrada: 'Entrada', ajuste_mas: 'Ajuste +', ajuste_menos: 'Ajuste −', reserva: 'Reserva', liberacion: 'Liberación', salida_instalado: 'Instalado', devolucion: 'Devolución' }[m.tipo] }),
        h('td', { text: String(m.cantidad) }), h('td', { text: String(m.stock_total_resultante) }), h('td', { text: m.nota || '' }))), 'Sin movimientos.'));
  }
  await cargar();
});
