/**
 * common.js — Go2Econtact site d'aide
 * Injecte le header et le footer communs sur toutes les pages.
 * 
 * Prérequis dans chaque page HTML :
 *   <div id="site-header"></div>   — en haut du body
 *   <div id="site-footer"></div>   — en bas du container
 *   <script src="js/common.js"></script>
 */

(function () {

    const HEADER_HTML = `
        <div class="header">
            <a href="../index.html">← Retour à FIP Toolkit</a>
        </div>`;

    const FOOTER_HTML = `
        <div class="footer-nav">
            <h3>Ressources complémentaires</h3>
            <div class="nav-links-grid">
                <a href="index.html" class="nav-button">Accueil</a>
                <a href="popup.html" class="nav-button">Popup</a>
                <a href="tutoriel.html" class="nav-button">Tutoriel</a>
                <a href="documentation.html" class="nav-button">Documentation</a>
                <a href="faq.html" class="nav-button">FAQ</a>
                <a href="changelog.html" class="nav-button">Changelog</a>
                <a href="legal.html" class="nav-button">Informations légales</a>
            </div>
        </div>`;

    document.addEventListener('DOMContentLoaded', function () {
        const headerEl = document.getElementById('site-header');
        if (headerEl) headerEl.innerHTML = HEADER_HTML;

        const footerEl = document.getElementById('site-footer');
        if (footerEl) footerEl.innerHTML = FOOTER_HTML;
    });

})();