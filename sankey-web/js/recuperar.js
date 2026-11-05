(function () {
  'use strict';
  const { h, poner, sb, acceso } = SK;
  const aviso = h('div');
  const correo = h('input', { id: 'correo', type: 'email', maxlength: '120', autocomplete: 'email', required: true });
  const boton = h('button', { type: 'submit', class: 'btn-primary', text: 'Enviar enlace' });
  const form = h('form', { novalidate: true }, h('label', { class: 'flabel', for: 'correo', text: 'Tu correo electrónico' }), correo, boton);
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (boton.disabled) return;
    const c = correo.value.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c)) { poner(aviso, h('div', { class: 'msg err', text: 'Escribe un correo válido.' })); return; }
    boton.disabled = true;
    await sb.auth.resetPasswordForEmail(c, { redirectTo: new URL('restablecer.html', location.href).href });
    // Siempre el mismo mensaje: no revelamos si el correo existe.
    poner(aviso, h('div', { class: 'msg ok', text: 'Si ese correo está registrado, te enviamos un enlace para crear una contraseña nueva.' }));
    setTimeout(() => { boton.disabled = false; }, 30000);
  });
  poner(document.getElementById('app'), acceso('Recuperar contraseña', 'Te enviaremos un enlace por correo.',
    [aviso, form, h('a', { class: 'otro', href: 'ingresar.html', text: 'Volver a ingresar' })]));
})();
