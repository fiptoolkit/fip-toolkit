/**
 * common.js — Go2Econtact site d'aide
 * Injecte le header et le footer communs sur toutes les pages.
 *
 * Prérequis dans chaque page HTML :
 *   <div id="site-header"></div>   — en haut du body
 *   <div id="site-footer"></div>   — en bas du container
 *   <script src="js/common.js"></script>        (pages racine go2econtact/)
 *   <script src="../js/common.js"></script>     (pages sous-dossier wizard/)
 *
 * Le script détecte automatiquement sa profondeur et ajuste les chemins.
 */

(function () {

    // Détection de la profondeur : sous-dossier (wizard/) ou racine (go2econtact/)
    const inSubfolder = window.location.pathname.includes('/wizard/');
    const base = inSubfolder ? '../' : '';

    const HEADER_HTML = `
        <div class="header">
            <a href="${base}../index.html">← Retour à FIP Toolkit</a>
        </div>`;

    // Liste des pages du footer — donnée séparée du gabarit de rendu ci-dessous
    const FOOTER_LINKS = [
        { href: 'index.html', label: 'Accueil' },
        { href: 'popup.html', label: 'Popup' },
        { href: 'tutoriel.html', label: 'Tutoriel' },
        { href: 'documentation.html', label: 'Documentation' },
        { href: 'faq.html', label: 'FAQ' },
        { href: 'changelog.html', label: 'Nouveautés' },
        { href: 'legal.html', label: 'Informations légales' }
    ];

    const FOOTER_HTML = `
        <div class="footer-nav">
            <h3>Ressources complémentaires</h3>
            <div class="nav-links-grid">
                ${FOOTER_LINKS.map(link => `<a href="${base}${link.href}" class="nav-button">${link.label}</a>`).join('\n                ')}
            </div>
        </div>`;

    document.addEventListener('DOMContentLoaded', function () {
        const headerEl = document.getElementById('site-header');
        if (headerEl) headerEl.innerHTML = HEADER_HTML;

        const footerEl = document.getElementById('site-footer');
        if (footerEl) footerEl.innerHTML = FOOTER_HTML;
    });

})();