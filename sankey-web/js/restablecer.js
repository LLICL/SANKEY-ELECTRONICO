(async function () {
  'use strict';
  const { h, poner, sb, acceso } = SK;
  const app = document.getElementById('app');
  const aviso = h('div');
  // Supabase lee el enlace del correo y abre una sesión temporal de recuperación.
  await new Promise((r) => setTimeout(r, 600));
  const { data: { session } } = await sb.auth.getSession();
  if (!session) {
    poner(app, acceso('Enlace no válido', 'El enlace venció o ya fue usado. Pide uno nuevo.',
      h('a', { class: 'btn-primary btn-enlace', href: 'recuperar.html', text: 'Pedir otro enlace' })));
    return;
  }
  const k1 = h('input', { type: 'password', maxlength: '72', autocomplete: 'new-password', required: true });
  const k2 = h('input', { type: 'password', maxlength: '72', autocomplete: 'new-password', required: true });
  const boton = h('button', { type: 'submit', class: 'btn-primary', text: 'Guardar contraseña' });
  const form = h('form', { novalidate: true },
    h('label', { class: 'flabel', text: 'Contraseña nueva' }), k1, h('div', { class: 'ayuda', text: 'Mínimo 6 caracteres. Puedes usar las letras, números o símbolos que quieras.' }),
    h('label', { class: 'flabel', text: 'Repite la contraseña' }), k2, boton);
  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (boton.disabled) return;
    const k = k1.value;
    if (k.length < 6 || k.length > 72) { poner(aviso, h('div', { class: 'msg err', text: 'La contraseña debe tener mínimo 6 caracteres.' })); return; }
    if (k !== k2.value) { poner(aviso, h('div', { class: 'msg err', text: 'Las contraseñas no coinciden.' })); return; }
    boton.disabled = true;
    const { error } = await sb.auth.updateUser({ password: k });
    if (error) { boton.disabled = false; poner(aviso, h('div', { class: 'msg err', text: 'No se pudo cambiar la contraseña. Pide un enlace nuevo.' })); return; }
    await sb.auth.signOut();
    poner(app, acceso('¡Listo!', 'Tu contraseña fue cambiada. Ya puedes ingresar.',
      h('a', { class: 'btn-primary btn-enlace', href: 'ingresar.html', text: 'Ir a ingresar' })));
  });
  poner(app, acceso('Nueva contraseña', 'Elige una contraseña que recuerdes.', [aviso, form]));
})();
