// Funcionalidad para el sitio web SANKEY
document.addEventListener("DOMContentLoaded", () => {
    const modalLogin = document.getElementById('modalLogin');
    const navLogin = document.getElementById('navLogin');
    const closeModal = document.getElementById('closeModal');
    
    // Verificar estado de sesión
    function verificarSesion() {
        const usuarioLogueado = localStorage.getItem('usuarioLogueado');
        const navLoginBtn = document.getElementById('navLogin');
        const navUser = document.getElementById('navUser');
        const navLogout = document.getElementById('navLogout');
        
        if (usuarioLogueado) {
            if (navLoginBtn) navLoginBtn.style.display = 'none';
            if (navUser) {
                navUser.textContent = `Hola, ${usuarioLogueado}`;
                navUser.style.display = 'block';
            }
            if (navLogout) navLogout.style.display = 'block';
        } else {
            if (navLoginBtn) {
                navLoginBtn.style.display = 'block';
                navLoginBtn.textContent = 'Iniciar Sesión';
            }
            if (navUser) navUser.style.display = 'none';
            if (navLogout) navLogout.style.display = 'none';
        }
    }
    
    verificarSesion();
    
    // Abrir modal de login
    if (navLogin) {
        navLogin.addEventListener('click', (e) => {
            e.preventDefault();
            if (modalLogin) {
                modalLogin.classList.add('active');
                // Limpiar mensaje al abrir
                const loginMessage = document.getElementById('loginMessage');
                if (loginMessage) {
                    loginMessage.textContent = '';
                    loginMessage.className = 'login-message';
                }
            }
        });
    }
    
    // Cerrar modal
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            if (modalLogin) {
                modalLogin.classList.remove('active');
            }
        });
    }
    
    // Cerrar modal al hacer clic fuera
    if (modalLogin) {
        modalLogin.addEventListener('click', (e) => {
            if (e.target === modalLogin) {
                modalLogin.classList.remove('active');
            }
        });
    }
    
    // Cerrar sesión
    const navLogout = document.getElementById('navLogout');
    if (navLogout) {
        navLogout.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('usuarioLogueado');
            verificarSesion();
            alert('Sesión cerrada correctamente');
        });
    }
    
    // Botón Solicitar Servicio
    const btnSolicitarServicio = document.getElementById('btnSolicitarServicio');
    if (btnSolicitarServicio) {
        btnSolicitarServicio.addEventListener('click', (e) => {
            e.preventDefault();
            const usuarioLogueado = localStorage.getItem('usuarioLogueado');
            
            if (!usuarioLogueado) {
                if (modalLogin) {
                    modalLogin.classList.add('active');
                    const loginMessage = document.getElementById('loginMessage');
                    if (loginMessage) {
                        loginMessage.textContent = '';
                        loginMessage.className = 'login-message';
                    }
                }
            } else {
                alert('Formulario de solicitud de servicio (próximamente)');
            }
        });
    }
    
    // Formulario de inicio de sesión
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const usuario = document.getElementById('usuario').value.trim();
            const password = document.getElementById('password').value.trim();
            const loginMessage = document.getElementById('loginMessage');
            
            if (loginMessage) {
                loginMessage.className = 'login-message';
            }
            
            if (!usuario || !password) {
                if (loginMessage) {
                    loginMessage.textContent = 'Por favor, completa todos los campos';
                    loginMessage.classList.add('error');
                }
                return;
            }
            
            // Simulación de inicio de sesión
            if (password.length >= 4) {
                localStorage.setItem('usuarioLogueado', usuario);
                if (loginMessage) {
                    loginMessage.textContent = '¡Inicio de sesión exitoso!';
                    loginMessage.classList.add('success');
                }
                verificarSesion();
                loginForm.reset();
                
                setTimeout(() => {
                    if (modalLogin) {
                        modalLogin.classList.remove('active');
                    }
                    if (loginMessage) {
                        loginMessage.textContent = '';
                        loginMessage.className = 'login-message';
                    }
                }, 1000);
            } else {
                if (loginMessage) {
                    loginMessage.textContent = 'Contraseña incorrecta';
                    loginMessage.classList.add('error');
                }
            }
        });
    }
    
    // Botón de registro
    const btnRegistro = document.getElementById('btnRegistro');
    if (btnRegistro) {
        btnRegistro.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Formulario de registro (próximamente)');
        });
    }
    
    // Smooth scroll para los enlaces de navegación
    const navLinks = document.querySelectorAll('nav a[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            if (targetId === '#' || targetId === '') return;
            
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                e.preventDefault();
                const navHeight = document.querySelector('nav').offsetHeight;
                const targetPosition = targetSection.offsetTop - navHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
    
    // Animación al hacer scroll para las imágenes
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'scale(1)';
            }
        });
    }, observerOptions);
    
    const items = document.querySelectorAll('.item-imagen');
    items.forEach((item, index) => {
        item.style.opacity = '0';
        item.style.transform = 'scale(0.9)';
        item.style.transition = `opacity 0.5s ease ${index * 0.05}s, transform 0.5s ease ${index * 0.05}s`;
        observer.observe(item);
    });
});
