/**
 * lightbox.js — Comportements spécifiques aux pages de documentation Go2Econtact
 *
 * Actuellement : lightbox pour les captures d'écran (.screenshot)
 *
 * Usage : charger ce fichier dans les pages qui contiennent des captures.
 * Ne pas inclure dans _common.php — uniquement sur les pages concernées.
 *
 * @author Hervé ROUVROY
 * @license MPL-2.0
 */

(function () {

    // ============================================================
    // LIGHTBOX — ouverture des captures d'écran en grand format
    // ============================================================

    // Créer l'overlay une seule fois dans le DOM
    function createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'lightbox-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-label', 'Capture d\'écran agrandie');
        overlay.innerHTML = `
            <div class="lightbox-inner">
                <img src="" alt="">
                <p class="lightbox-caption"></p>
                <p class="lightbox-hint">Cliquez n'importe où ou appuyez sur Échap pour fermer</p>
            </div>`;
        document.body.appendChild(overlay);
        return overlay;
    }

    // Ouvrir la lightbox avec fade in
    function openLightbox(overlay, src, alt, caption) {
        const img     = overlay.querySelector('img');
        const cap     = overlay.querySelector('.lightbox-caption');

        img.src       = src;
        img.alt       = alt;
        cap.textContent = caption;
        cap.style.display = caption ? '' : 'none';

        overlay.classList.add('is-open');
        // Déclencher le fade après que le display:flex est appliqué
        requestAnimationFrame(() => {
            requestAnimationFrame(() => overlay.classList.add('is-visible'));
        });

        document.body.style.overflow = 'hidden';
    }

    // Fermer la lightbox avec fade out
    function closeLightbox(overlay) {
        overlay.classList.remove('is-visible');
        overlay.addEventListener('transitionend', function handler() {
            overlay.classList.remove('is-open');
            overlay.removeEventListener('transitionend', handler);
            document.body.style.overflow = '';
        });
    }

    // Initialisation — attend que le DOM soit prêt
    // Utilise MutationObserver pour gérer les fragments chargés en AJAX
    function init() {
        const overlay = createOverlay();

        // Fermeture au clic sur l'overlay (hors image)
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay || e.target.closest('.lightbox-inner') === null) {
                closeLightbox(overlay);
            }
        });

        // Fermeture à la touche Échap
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && overlay.classList.contains('is-open')) {
                closeLightbox(overlay);
            }
        });

        // Délégation d'événements sur le document entier
        // Fonctionne pour les captures dans les fragments AJAX chargés dynamiquement
        document.addEventListener('click', function (e) {
            const figure = e.target.closest('figure.screenshot');
            if (!figure) return;

            const img     = figure.querySelector('img');
            const caption = figure.querySelector('figcaption');

            if (!img) return;

            const src = img.dataset.full || img.src;
            const alt = img.alt || '';
            const cap = caption ? caption.textContent.trim() : '';

            openLightbox(overlay, src, alt, cap);
        });
    }

    // Lancer après chargement du DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();