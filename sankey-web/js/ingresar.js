(async function () {
  'use strict';
  const { h, poner, sb, cfg, acceso } = SK;
  const app = document.getElementById('app');

  // Si ya hay sesión válida, directo al panel.
  const ya = await (async () => { try { const { data: { session } } = await sb.auth.getSession(); return session; } catch { return null; } })();
  if (ya) {
    const { data } = await sb.from('perfiles').select('activo').eq('id', ya.user.id).maybeSingle();
    if (data && data.activo) { location.replace('panel.html'); return; }
    await sb.auth.signOut();
  }

  const aviso = h('div', { 'aria-live': 'polite' });
  const usuario = h('input', { type: 'text', id: 'usuario', autocomplete: 'username', maxlength: '120', required: true, autocapitalize: 'none' });
  const clave = h('input', { type: 'password', id: 'clave', autocomplete: 'current-password', maxlength: '200', required: true });
  const boton = h('button', { type: 'submit', class: 'btn-primary', text: 'Ingresar' });
  const form = h('form', { novalidate: true },
    h('label', { class: 'flabel', for: 'usuario', text: 'Usuario o correo' }), usuario,
    h('label', { class: 'flabel', for: 'clave', text: 'Contraseña' }), clave, boton);

  form.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    if (boton.disabled) return;
    poner(aviso);
    if (!usuario.value.trim() || !clave.value) { poner(aviso, h('div', { class: 'msg err', role: 'alert', text: 'Escribe tu usuario y contraseña.' })); return; }
    boton.disabled = true; boton.textContent = 'Ingresando...';
    try {
      const r = await fetch(cfg.URL + '/functions/v1/login-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: cfg.CLAVE },
        body: JSON.stringify({ identificador: usuario.value.trim(), clave: clave.value }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.session) { poner(aviso, h('div', { class: 'msg err', role: 'alert', text: j.error || 'Usuario o contraseña incorrectos.' })); return; }
      const { error } = await sb.auth.setSession(j.session);
      if (error) { poner(aviso, h('div', { class: 'msg err', role: 'alert', text: 'No se pudo iniciar la sesión.' })); return; }
      clave.value = '';
      location.replace('panel.html');
    } catch {
      poner(aviso, h('div', { class: 'msg err', role: 'alert', text: 'Sin conexión con el servidor. Inténtalo de nuevo.' }));
    } finally { boton.disabled = false; boton.textContent = 'Ingresar'; }
  });

  poner(app, acceso('Ingresar', 'Usa tu usuario o tu correo para ver tus solicitudes.',
    [aviso, form,
      h('a', { class: 'otro', href: 'recuperar.html', text: '¿Olvidaste tu contraseña?' }),
      h('a', { class: 'btn-sec otro-btn', href: 'registro.html', text: 'Crear cuenta nueva' })]));
  usuario.focus();
})();
