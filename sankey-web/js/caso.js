SK.arrancar({ pagina: 'casos.html', titulo: 'Detalle del caso' }, async (ctx) => {
  const { h, poner, vaciar, ok, rpc, sb, campo, opcion, tabla, insignia, ESTADOS, ESTADOS_COT, dinero, fechaHora, fechaCorta,
    subirFotos, mostrarFotos, pedirTexto, confirmar, etapasCaso, vacio } = SK;
  const { contenido, perfil, permisos, esAdmin, esEquipo, avisar } = ctx;
  const id = new URLSearchParams(location.search).get('id') || '';
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) { location.replace('casos.html'); return; }
  const raiz = h('div');
  poner(contenido, contenido.firstChild, raiz);

  const ABIERTOS = ['aceptada', 'en_revision', 'cotizada', 'cotizacion_aprobada', 'cotizacion_rechazada', 'en_reparacion', 'lista_para_retirar'];
  const bloque = (titulo, ...kids) => h('div', { class: 'fbox' }, titulo ? h('h3', { text: titulo }) : null, kids);
  const dato = (k, v) => h('div', { class: 'dato' }, h('span', { text: k }), h('span', null, v));
  const boton = (texto, clase, fn, exito) => { const b = h('button', { type: 'button', class: clase, text: texto }); b.addEventListener('click', ctx.accion(b, async () => { await fn(); await cargar(); }, exito)); return b; };

  async function cargar() {
    const caso = await ok(sb.from('casos').select('*, cliente:perfiles!casos_cliente_id_fkey(nombre,telefono,correo), asignado:perfiles!casos_asignado_a_fkey(nombre)').eq('id', id).maybeSingle());
    if (!caso) { poner(raiz, h('div', { class: 'msg err', text: 'No encontramos ese caso.' })); return; }
    const [avances, fotos, cots, contactos] = await Promise.all([
      ok(sb.from('avances').select('*').eq('caso_id', id).order('creado_en', { ascending: false })),
      ok(sb.from('fotos_caso').select('id,avance_id,tipo,ruta').eq('caso_id', id)),
      ok(sb.from('cotizaciones').select('*').eq('caso_id', id).order('version', { ascending: false })),
      esEquipo ? ok(sb.from('contactos_manuales').select('*').eq('caso_id', id).order('creado_en', { ascending: false })) : [],
    ]);
    const items = cots.length ? await ok(sb.from('items_cotizacion')
      .select('id,cotizacion_id,repuesto_id,descripcion,cantidad,precio_unitario,subtotal,es_externo,estado_inventario')
      .in('cotizacion_id', cots.map((c) => c.id)).order('descripcion')) : [];
    const gestiona = esAdmin || (esEquipo && permisos.gestionar_casos && caso.asignado_a === perfil.id);
    const puedeCotizar = gestiona && permisos.crear_cotizaciones;
    const esCliente = perfil.rol === 'cliente';

    // ---------- Resumen ----------
    const zonaFotosSol = h('div', { class: 'fotos' });
    const resumen = bloque('Caso #' + caso.numero,
      h('div', { class: 'dos' },
        h('div', null,
          dato('Estado', insignia(ESTADOS, caso.estado)), dato('Equipo', caso.tipo_equipo),
          caso.marca ? dato('Marca', caso.marca) : null, caso.modelo ? dato('Modelo', caso.modelo) : null, caso.serie ? dato('Serie', caso.serie) : null,
          dato('Creada', fechaHora(caso.creado_en))),
        h('div', null,
          esEquipo ? dato('Cliente', caso.cliente ? caso.cliente.nombre : '') : null,
          esEquipo && caso.cliente ? dato('Teléfono', caso.cliente.telefono) : null,
          esEquipo ? dato('Técnico asignado', caso.asignado ? caso.asignado.nombre : 'Sin asignar') : null,
          caso.listo_para_retirar_en ? dato('Lista desde', fechaCorta(caso.listo_para_retirar_en)) : null,
          caso.entregado_en ? dato('Entregada', fechaCorta(caso.entregado_en)) : null)),
      h('h4', { text: 'Falla reportada' }), h('p', { text: caso.descripcion_falla }),
      caso.motivo_rechazo ? h('div', { class: 'msg err', text: 'Motivo del rechazo: ' + caso.motivo_rechazo }) : null,
      fotos.some((f) => f.tipo === 'solicitud') ? [h('h4', { text: 'Fotos de la solicitud' }), zonaFotosSol] : null);
    mostrarFotos(zonaFotosSol, fotos.filter((f) => f.tipo === 'solicitud'));

    // ---------- Acciones ----------
    const acciones = [];
    if (esCliente && caso.estado === 'solicitud_enviada') {
      acciones.push(boton('Cancelar solicitud', 'btn-peligro', async () => {
        if (!(await confirmar('¿Cancelar esta solicitud?', 'El taller ya no la atenderá. Podrás crear otra cuando quieras.', 'Sí, cancelar', true))) return;
        await rpc('cancelar_caso_cliente', { p_caso: id });
      }, 'Solicitud cancelada.'));
    }
    const terminal = esCliente ? ['rechazada', 'cancelada', 'entregada', 'cerrada'] : ['rechazada', 'cancelada', 'cerrada'];
    if ((esCliente || esAdmin) && terminal.includes(caso.estado)) {
      const oculto = esCliente ? caso.oculto_cliente : caso.oculto_admin;
      acciones.push(h('div', { class: 'btns' }, oculto
        ? boton('Volver a mostrar en mi lista', 'btn-sec', () => rpc('ocultar_caso', { p_caso: id, p_ocultar: false }), 'Solicitud restaurada.')
        : boton(esCliente ? 'Quitar de mi lista' : 'Ocultar de la lista', 'btn-sec', async () => {
          if (!(await confirmar('¿Quitar esta solicitud de la lista?', 'No se borra: se guarda el historial y puedes restaurarla desde la lista con "Mostrar quitadas".', 'Quitar'))) return;
          await rpc('ocultar_caso', { p_caso: id, p_ocultar: true }); location.href = 'casos.html';
        })));
    }
    if (esAdmin) {
      const tecnicos = await ok(sb.from('perfiles').select('id,nombre,rol').in('rol', ['tecnico', 'admin']).eq('activo', true).order('nombre'));
      const selTec = h('select', null, tecnicos.map((t) => opcion(t.id, t.nombre + (t.id === perfil.id ? ' (yo)' : '') + (t.rol === 'admin' ? ' · admin' : ''))));
      selTec.value = caso.asignado_a || perfil.id;
      if (caso.estado === 'solicitud_enviada') {
        const motivo = h('textarea', { maxlength: '500', placeholder: 'Motivo (obligatorio si rechazas)' });
        acciones.push(h('div', { class: 'fbox' }, h('h3', { text: 'Revisar solicitud' }),
          campo('Quién la atenderá', selTec),
          h('div', { class: 'btns' }, boton('Aceptar y asignar', 'btn-ok', () => rpc('aceptar_caso', { p_caso: id, p_asignado: selTec.value }), 'Solicitud aceptada.')),
          h('h4', { text: 'O rechazarla' }), campo('Motivo del rechazo', motivo),
          h('div', { class: 'btns' }, boton('Rechazar solicitud', 'btn-peligro', () => rpc('rechazar_caso', { p_caso: id, p_motivo: motivo.value }), 'Solicitud rechazada.'))));
      } else if (ABIERTOS.includes(caso.estado)) {
        acciones.push(h('div', { class: 'fbox' }, h('h3', { text: 'Reasignar' }), campo('Atiende', selTec),
          h('div', { class: 'btns' }, boton('Guardar asignación', 'btn-sec', () => rpc('reasignar_caso', { p_caso: id, p_asignado: selTec.value }), 'Caso reasignado.'))));
      }
    }
    if (gestiona) {
      const sig = [];
      const cambio = (txt, nuevo, clase, conf) => sig.push(boton(txt, clase || 'btn-primary', async () => {
        if (conf && !(await confirmar('Confirma la acción', conf, 'Continuar', clase === 'btn-peligro'))) return; await rpc('cambiar_estado_caso', { p_caso: id, p_nuevo: nuevo });
      }, 'Estado actualizado.'));
      if (caso.estado === 'aceptada') cambio('Iniciar revisión', 'en_revision');
      if (caso.estado === 'cotizacion_aprobada') cambio('Iniciar reparación', 'en_reparacion');
      if (caso.estado === 'en_reparacion') cambio('Marcar lista para retirar', 'lista_para_retirar', 'btn-ok', 'Se avisará al cliente por correo. ¿Continuar?');
      if (caso.estado === 'lista_para_retirar') cambio('Registrar entrega al cliente', 'entregada', 'btn-ok', '¿El cliente ya recogió el equipo?');
      if (caso.estado === 'cotizacion_rechazada') { cambio('Volver a revisión', 'en_revision'); cambio('Cerrar caso', 'cerrada', 'btn-sec', '¿Cerrar el caso sin reparar?'); }
      if (esAdmin && caso.estado === 'entregada') cambio('Cerrar caso', 'cerrada', 'btn-sec');
      if (esAdmin && ABIERTOS.includes(caso.estado)) cambio('Cancelar caso', 'cancelada', 'btn-peligro', 'Se libera lo reservado del inventario. ¿Cancelar el caso?');
      if (esAdmin && caso.estado === 'lista_para_retirar') {
        sig.push(boton(caso.recordatorios_activos ? 'Pausar recordatorios' : 'Reactivar recordatorios', 'btn-sec', () => rpc('alternar_recordatorios', { p_caso: id, p_activo: !caso.recordatorios_activos })));
      }
      if (sig.length) acciones.push(h('div', { class: 'fbox' }, h('h3', { text: 'Acciones' }), h('div', { class: 'btns' }, sig)));
    }

    // ---------- Cotizaciones ----------
    const bloquesCot = cots.filter((c) => esEquipo || c.estado !== 'borrador').map((c) => {
      const its = items.filter((i) => i.cotizacion_id === c.id);
      const pendientesReserva = its.some((i) => i.estado_inventario === 'sin_reservar' && !i.es_externo);
      const tabItems = tabla(esEquipo ? ['Material', 'Cant.', 'Precio', 'Subtotal', 'Inventario', ''] : ['Material', 'Cant.', 'Precio', 'Subtotal'],
        its.map((i) => h('tr', null, h('td', { text: i.descripcion + (i.es_externo ? ' (externo)' : '') }), h('td', { text: String(i.cantidad) }),
          h('td', { text: dinero(i.precio_unitario) }), h('td', { text: dinero(i.subtotal) }),
          esEquipo ? h('td', { text: { no_aplica: '—', sin_reservar: 'Sin reservar', reservado: 'Reservado', instalado: 'Instalado', liberado: 'Liberado' }[i.estado_inventario] }) : null,
          esEquipo ? h('td', null, (gestiona && c.estado === 'aprobada' && !i.es_externo && ['reservado', 'sin_reservar'].includes(i.estado_inventario))
            ? boton('Marcar instalado', 'btn-ok mini', () => rpc('marcar_instalado', { p_item: i.id }), 'Material descontado del inventario.') : null) : null)), 'Sin materiales.');
      const acc = [];
      if (esCliente && c.estado === 'pendiente_aprobacion') {
        acc.push(boton('Aprobar cotización', 'btn-ok btn-grande', async () => { if (await confirmar('¿Aprobar esta cotización?', 'Total a pagar: ' + dinero(c.total) + '. El taller empezará la reparación.', 'Sí, aprobar')) await rpc('aprobar_cotizacion', { p_cot: c.id }); }, 'Cotización aprobada. ¡Gracias!'));
        acc.push(boton('Rechazar', 'btn-sec', async () => { const m = await pedirTexto('Rechazar cotización', 'Cuéntanos el motivo', 'Rechazar cotización', { peligro: true }); if (m) await rpc('rechazar_cotizacion', { p_cot: c.id, p_motivo: m }); }, 'Cotización rechazada.'));
      }
      if (esCliente && c.estado === 'aprobada' && c.tipo_aprobacion === 'taller' && !c.disputada) {
        acc.push(boton('No estoy de acuerdo con esta aprobación', 'btn-peligro', async () => { const m = await pedirTexto('No estoy de acuerdo', 'Cuéntanos por qué no estás de acuerdo', 'Enviar desacuerdo', { peligro: true }); if (m) await rpc('disputar_cotizacion', { p_cot: c.id, p_motivo: m }); }, 'Registramos tu desacuerdo. El taller te contactará.'));
      }
      if (puedeCotizar && c.estado === 'pendiente_aprobacion') {
        const medio = h('select', null, opcion('llamada', 'Llamada'), opcion('whatsapp', 'WhatsApp'), opcion('presencial', 'Presencial'));
        const nota = h('input', { type: 'text', maxlength: '500', placeholder: 'Nota (opcional)' });
        acc.push(h('div', { class: 'fgrid' }, campo('El cliente confirmó por', medio), campo('Nota', nota)),
          boton('Registrar aprobación del cliente', 'btn-ok', () => rpc('aprobar_cotizacion_taller', { p_cot: c.id, p_medio: medio.value, p_nota: nota.value }), 'Aprobación registrada.'));
      }
      if (gestiona && c.estado === 'aprobada' && pendientesReserva) acc.push(boton('Reservar materiales pendientes', 'btn-sec', async () => { const n = await rpc('reservar_pendientes_caso', { p_caso: id }); if (!n) throw new Error('Aún no hay stock suficiente.'); }));
      return h('div', { class: 'cot ' + c.estado },
        h('h4', null, 'Versión ' + c.version + ' ', insignia(ESTADOS_COT, c.estado), ' · ', h('strong', { text: dinero(c.total) })),
        h('p', { class: 'flabel', text: 'Mano de obra: ' + dinero(c.mano_obra) + (c.valida_hasta ? ' · Válida hasta ' + fechaCorta(c.valida_hasta) : '') }),
        c.motivo_cambio ? h('p', { text: 'Motivo del cambio: ' + c.motivo_cambio }) : null,
        c.estado === 'aprobada' ? h('p', { class: 'flabel', text: c.tipo_aprobacion === 'taller' ? 'Aprobada por el taller en nombre del cliente (' + c.medio_confirmacion + ') el ' + fechaHora(c.aprobada_en) + (c.nota_aprobacion ? ' · ' + c.nota_aprobacion : '') : 'Aprobada por el cliente el ' + fechaHora(c.aprobada_en) }) : null,
        c.estado === 'rechazada' && c.rechazo_motivo ? h('p', { class: 'flabel', text: 'Motivo del rechazo: ' + c.rechazo_motivo }) : null,
        c.disputada ? h('div', { class: 'msg aviso', text: 'El cliente NO está de acuerdo con esta aprobación: ' + c.disputa_motivo }) : null,
        tabItems, h('div', { class: 'resumen-cot' }, dato('Mano de obra', dinero(c.mano_obra)), dato('Total', h('strong', { text: dinero(c.total) }))),
        h('div', { class: 'btns' }, acc));
    });
    const seccionCot = bloque('Cotizaciones', bloquesCot.length ? bloquesCot : vacio('Aún no hay cotizaciones', esCliente ? 'Cuando el taller revise tu equipo, aquí verás el precio para aprobar.' : null));

    // ---------- Formulario nueva cotización ----------
    let formCot = null;
    if (puedeCotizar && ['aceptada', 'en_revision', 'cotizada', 'cotizacion_aprobada', 'cotizacion_rechazada', 'en_reparacion'].includes(caso.estado)) {
      const repuestos = await ok(sb.from('repuestos').select('id,nombre,precio_venta,stock_disponible').eq('activo', true).order('nombre'));
      const filas = h('div');
      const mano = h('input', { type: 'number', min: '0', step: '1000', value: '0' });
      const motivo = h('input', { type: 'text', maxlength: '500', placeholder: 'Ej: Se encontró otra falla en la tarjeta' });
      const agregar = (tipo, pre) => {
        const cant = h('input', { type: 'number', min: '1', max: '1000', value: String(pre ? pre.cantidad : 1), 'aria-label': 'Cantidad' });
        let ctl, precio;
        if (tipo === 'inventario') {
          ctl = h('select', { 'aria-label': 'Repuesto' }, repuestos.map((r) => opcion(r.id, r.nombre + ' (' + r.stock_disponible + ' disp.)')));
          if (pre && pre.repuesto_id) ctl.value = pre.repuesto_id;
          precio = h('input', { type: 'text', disabled: true, value: 'Precio del inventario' });
        } else {
          ctl = h('input', { type: 'text', maxlength: '150', placeholder: 'Material externo', value: pre ? pre.descripcion : '', 'aria-label': 'Descripción' });
          precio = h('input', { type: 'number', min: '0', step: '500', placeholder: 'Precio unit.', value: pre ? String(pre.precio_unitario) : '', 'aria-label': 'Precio' });
        }
        const fila = h('div', { class: 'fila-item', 'data-tipo': tipo }, ctl, cant, precio, h('button', { type: 'button', class: 'btn-sec mini', text: 'Quitar', onclick: () => fila.remove() }));
        fila._leer = () => tipo === 'inventario'
          ? { tipo, repuesto_id: ctl.value, cantidad: Number(cant.value) }
          : { tipo, descripcion: ctl.value, cantidad: Number(cant.value), precio_unitario: Number(precio.value) };
        filas.append(fila);
      };
      const base = cots.find((c) => c.estado === 'pendiente_aprobacion') || cots.find((c) => c.estado === 'aprobada') || cots[0];
      if (base) {
        mano.value = String(base.mano_obra);
        items.filter((i) => i.cotizacion_id === base.id).forEach((i) => { if (i.es_externo || repuestos.some((r) => r.id === i.repuesto_id)) agregar(i.es_externo ? 'externo' : 'inventario', i); });
      }
      formCot = bloque(cots.length ? 'Nueva versión de la cotización' : 'Crear cotización',
        cots.length ? h('div', { class: 'msg info', text: 'La nueva versión reemplaza a la pendiente y el cliente deberá aprobarla. Lo ya instalado se conserva si lo mantienes en la lista.' }) : null,
        campo('Mano de obra ($)', mano), filas,
        h('div', { class: 'btns' }, h('button', { type: 'button', class: 'btn-sec mini', text: '+ Repuesto del inventario', onclick: () => { if (!repuestos.length) { avisar('err', 'No hay repuestos activos en el inventario.'); return; } agregar('inventario'); } }),
          h('button', { type: 'button', class: 'btn-sec mini', text: '+ Material externo', onclick: () => agregar('externo') })),
        cots.length ? campo('Motivo del cambio *', motivo) : null,
        h('div', { class: 'btns' }, boton('Enviar cotización al cliente', 'btn-primary', async () => {
          const lista = Array.from(filas.children).map((f) => f._leer());
          await rpc('crear_cotizacion', { p_caso: id, p_mano_obra: Number(mano.value || 0), p_items: lista, p_motivo: cots.length ? motivo.value : null });
        }, 'Cotización enviada al cliente.')));
    }

    // ---------- Avances ----------
    let formAv = null;
    if (gestiona && !['solicitud_enviada', 'rechazada', 'cancelada', 'cerrada'].includes(caso.estado)) {
      const msg = h('textarea', { maxlength: '2000', placeholder: 'Escribe el avance de la reparación' });
      const vis = h('input', { type: 'checkbox', checked: true });
      const files = h('input', { type: 'file', accept: 'image/jpeg,image/png,image/webp', multiple: true });
      formAv = bloque('Publicar avance', campo('Mensaje', msg), campo('Fotos (opcional)', files),
        h('label', { class: 'check' }, vis, h('span', { text: 'Visible para el cliente (se le avisa por correo)' })),
        h('div', { class: 'btns' }, boton('Publicar', 'btn-primary', async () => {
          const aid = await rpc('publicar_avance', { p_caso: id, p_mensaje: msg.value, p_visible: vis.checked });
          if (files.files.length) await subirFotos(id, Array.from(files.files), 'avance', aid);
        }, 'Avance publicado.')));
    }
    const listaAv = avances.map((a) => { const z = h('div', { class: 'fotos' }); mostrarFotos(z, fotos.filter((f) => f.avance_id === a.id));
      return h('div', { class: 'linea' }, h('small', { text: fechaHora(a.creado_en) + (esEquipo && !a.visible_cliente ? ' · interno (el cliente no lo ve)' : '') }), h('div', { text: a.mensaje }), z); });
    const seccionAv = bloque('Avances de la reparación', listaAv.length ? listaAv : vacio('Aún no hay avances', esCliente ? 'Aquí verás las novedades y fotos de tu reparación.' : null));

    // ---------- Contacto manual ----------
    let seccionContacto = null;
    if (esEquipo && caso.estado === 'lista_para_retirar') {
      const medio = h('select', null, opcion('llamada', 'Llamada'), opcion('whatsapp', 'WhatsApp'));
      const res = h('input', { type: 'text', maxlength: '500', placeholder: 'Ej: No contestó / Dijo que pasa el viernes' });
      seccionContacto = bloque('Contacto con el cliente (equipo sin retirar)',
        caso.requiere_contacto_manual ? h('div', { class: 'msg aviso', text: 'Pasaron los días de recordatorio automático. Llama al cliente' + (caso.cliente ? ' al ' + caso.cliente.telefono : '') + '.' }) : null,
        contactos.map((c) => h('div', { class: 'linea' }, h('small', { text: fechaHora(c.creado_en) + ' · ' + c.medio }), h('div', { text: c.resultado }))),
        gestiona ? [h('div', { class: 'fgrid' }, campo('Medio', medio), campo('Resultado', res)), boton('Registrar contacto', 'btn-primary', () => rpc('registrar_contacto', { p_caso: id, p_medio: medio.value, p_resultado: res.value }), 'Contacto registrado.')] : null);
    }

    const pasos = etapasCaso(caso.estado);
    const cotPend = cots.find((c) => c.estado === 'pendiente_aprobacion');
    const lleva = (cls, titulo, texto) => h('div', { class: 'proximo ' + cls }, h('div', null, h('strong', { text: titulo }), h('span', { text: texto })));
    let proximo = null;
    if (esCliente) {
      if (caso.estado === 'solicitud_enviada') proximo = lleva('calma', 'Recibimos tu solicitud', 'El taller la revisará pronto. Te avisaremos por correo.');
      else if (['aceptada', 'en_revision'].includes(caso.estado)) proximo = lleva('calma', 'Estamos revisando tu equipo', 'Pronto recibirás una cotización para aprobar.');
      else if (cotPend) proximo = lleva('', 'Tu cotización está lista', 'Revísala abajo y apruébala o recházala. Total: ' + dinero(cotPend.total) + '.');
      else if (caso.estado === 'cotizacion_aprobada' || caso.estado === 'en_reparacion') proximo = lleva('calma', 'Tu equipo está en reparación', 'Mira los avances más abajo.');
      else if (caso.estado === 'lista_para_retirar') proximo = lleva('', '¡Tu equipo está listo!', 'Pasa a retirarlo por el taller en Carrera 16 #21-62, Sincelejo.');
      else if (caso.estado === 'rechazada' || caso.estado === 'cancelada') proximo = lleva('mal', caso.estado === 'rechazada' ? 'Solicitud rechazada' : 'Solicitud cancelada', 'Puedes crear una nueva solicitud cuando quieras.');
    } else if (gestiona) {
      if (caso.estado === 'solicitud_enviada' && esAdmin) proximo = lleva('', 'Solicitud nueva', 'Acéptala y asígnala, o recházala con un motivo.');
      else if (['aceptada', 'en_revision', 'cotizacion_rechazada'].includes(caso.estado)) proximo = lleva('', 'Falta cotizar', 'Revisa el equipo y envía una cotización al cliente.');
      else if (cotPend) proximo = lleva('calma', 'Esperando al cliente', 'El cliente debe aprobar la cotización (o registra su aprobación si confirmó por llamada).');
      else if (caso.estado === 'cotizacion_aprobada') proximo = lleva('', 'Cotización aprobada', 'Inicia la reparación.');
      else if (caso.estado === 'en_reparacion') proximo = lleva('calma', 'En reparación', 'Publica avances y marca la lista cuando termines.');
      else if (caso.estado === 'lista_para_retirar') proximo = lleva('', 'Lista para retirar', 'Registra la entrega cuando el cliente la recoja.');
    }
    poner(raiz, pasos ? h('div', { class: 'fbox' }, pasos) : null, proximo, resumen, acciones, seccionCot, formCot, seccionAv, formAv, seccionContacto);
  }
  await cargar();
});