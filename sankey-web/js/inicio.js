// Página de inicio pública: menú en celulares y botones según haya sesión o no.
(function () {
  'use strict';
  const cab = document.getElementById('cabecera');
  const btn = document.getElementById('btnMenu');
  if (btn && cab) {
    btn.addEventListener('click', () => {
      const abierta = cab.classList.toggle('abierta');
      btn.setAttribute('aria-expanded', String(abierta));
    });
    cab.querySelectorAll('nav a').forEach((a) => a.addEventListener('click', () => { cab.classList.remove('abierta'); btn.setAttribute('aria-expanded', 'false'); }));
  }
  // Si la persona ya tiene sesión, le ofrecemos ir directo a su panel.
  SK.sb.auth.getSession().then(({ data }) => {
    if (!data || !data.session) return;
    document.querySelectorAll('[data-sesion="no"]').forEach((e) => e.classList.add('oculto'));
    document.querySelectorAll('[data-sesion="si"]').forEach((e) => e.classList.remove('oculto'));
    document.querySelectorAll('[data-solicitar]').forEach((e) => { e.setAttribute('href', 'casos.html#nueva'); });
  }).catch(() => {});
})();
