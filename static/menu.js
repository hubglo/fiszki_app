document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menuToggle');
    const sideMenu = document.getElementById('sideMenu');
    const menuOverlay = document.getElementById('menuOverlay');

    if (!menuToggle || !sideMenu || !menuOverlay) return;

    const openMenu = () => {
        sideMenu.classList.add('is-open');
        menuOverlay.classList.add('is-open');
        menuToggle.setAttribute('aria-expanded', 'true');
    };

    const closeMenu = () => {
        sideMenu.classList.remove('is-open');
        menuOverlay.classList.remove('is-open');
        menuToggle.setAttribute('aria-expanded', 'false');
    };

    menuToggle.addEventListener('click', () => {
        if (sideMenu.classList.contains('is-open')) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    menuOverlay.addEventListener('click', closeMenu);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeMenu();
        }
    });

    sideMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });
});
