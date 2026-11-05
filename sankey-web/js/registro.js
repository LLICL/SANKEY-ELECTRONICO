(function () {
  'use strict';
  const { h, poner, sb, acceso } = SK;
  const app = document.getElementById('app');
  const aviso = h('div');
  const f = {
    usuario: h('input', { type: 'text', maxlength: '20', autocomplete: 'username', autocapitalize: 'none', required: true }),
    nombre: h('input', { type: 'text', maxlength: '100', autocomplete: 'name', required: true }),
    correo: h('input', { type: 'email', maxlength: '120', autocomplete: 'email', required: true }),
    telefono: h('input', { type: 'tel', maxlength: '15', autocomplete: 'tel', required: true }),
    clave: h('input', { type: 'password', maxlength: '72', autocomplete: 'new-password', required: true }),
    clave2: h('input', { type: 'password', maxlength: '72', autocomplete: 'new-password', required: true }),
    acepto: h('input', { type: 'checkbox' }),
  };
  const boton = h('button', { type: 'submit', class: 'btn-primary', text: 'Crear cuenta' });
  const L = (t, c, ayuda) => { const id = 'f' + Math.random().toString(36).slice(2, 8); c.id = id; return [h('label', { class: 'flabel', for: id, text: t }), c, ayuda ? h('div', { class: 'ayuda', text: ayuda }) : null]; };
  const form = h('form', { novalidate: true },
    L('Usuario', f.usuario, 'De 4 a 20 caracteres: letras minúsculas, números o guion bajo.'),
    L('Nombre completo', f.nombre), L('Correo electrónico', f.correo, 'Te enviaremos un enlace para confirmarlo.'),
    L('Teléfono', f.telefono, 'Solo números (7 a 15 dígitos).'),
    L('Contraseña', f.clave, 'Mínimo 6 caracteres. Puedes usar las letras, números o símbolos que quieras.'),
    L('Repite la contraseña', f.clave2),
    h('label', { class: 'check' }, f.acepto, h('span', { text: 'Acepto que SANKEY use mis datos (nombre, correo, teléfono y datos de mis equipos) solo para gestionar mis reparaciones y citas.' })),
    boton);

  function error(t) { poner(aviso, h('div', { class: 'msg err', role: 'alert', text: t })); }
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (boton.disabled) return;
    poner(aviso);
    const u = f.usuario.value.trim().toLowerCase(), n = f.nombre.value.trim(), c = f.correo.value.trim().toLowerCase(), t = f.telefono.value.trim(), k = f.clave.value;
    if (!/^[a-z0-9_]{4,20}$/.test(u)) return error('Usuario inválido: 4 a 20 caracteres, solo minúsculas, números o _.');
    if (n.length < 2) return error('Escribe tu nombre completo.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c)) return error('Escribe un correo válido.');
    if (!/^[0-9+ ]{7,15}$/.test(t)) return error('Teléfono inválido: solo números, de 7 a 15 dígitos.');
    if (k.length < 6 || k.length > 72) return error('La contraseña debe tener mínimo 6 caracteres.');
    if (k !== f.clave2.value) return error('Las contraseñas no coinciden.');
    if (!f.acepto.checked) return error('Debes aceptar el uso de tus datos para continuar.');

    boton.disabled = true; boton.textContent = 'Creando...';
    const { error: e } = await sb.auth.signUp({
      email: c, password: k,
      options: { emailRedirectTo: new URL('ingresar.html', location.href).href, data: { usuario: u, nombre: n, telefono: t, acepto_privacidad: 'true' } },
    });
    boton.disabled = false; boton.textContent = 'Crear cuenta';
    if (e) {
      if (/weak|password/i.test(e.message || '')) return error('Esa contraseña es muy débil. Usa una más larga y variada.');
      return error('No se pudo crear la cuenta. Revisa los datos; puede que el usuario o el correo ya estén en uso.');
    }
    f.clave.value = ''; f.clave2.value = '';
    poner(app, acceso('¡Revisa tu correo!', 'Si los datos son válidos, te enviamos un enlace para confirmar tu cuenta. Después podrás ingresar.',
      h('a', { class: 'btn-primary btn-enlace', href: 'ingresar.html', text: 'Ir a ingresar' })));
  });

  poner(app, acceso('Crear cuenta', 'Para pedir reparaciones y ver su avance.',
    [aviso, form, h('a', { class: 'otro', href: 'ingresar.html', text: 'Ya tengo cuenta' })]));
})();
