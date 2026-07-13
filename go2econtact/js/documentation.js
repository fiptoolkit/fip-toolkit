/**
 * documentation.js — Go2Econtact site d'aide
 * Navigation niveau 1/2 de la page Documentation : charge en AJAX le
 * fragment HTML correspondant à l'onglet sélectionné dans doc/*.html.
 */

const detailZone = document.getElementById('doc-detail');
const cards      = document.querySelectorAll('.doc-nav-card');

function loadDetail(page) {
    detailZone.innerHTML = '<div class="doc-loading">Chargement…</div>';
    fetch(page)
        .then(response => {
            if (!response.ok) throw new Error('Fichier introuvable');
            return response.text();
        })
        .then(html => {
            detailZone.innerHTML = html;
        })
        .catch(() => {
            detailZone.innerHTML = '<div class="doc-error">Impossible de charger cette section. Vérifiez votre connexion.</div>';
        });
}

cards.forEach(card => {
    card.addEventListener('click', () => {
        cards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        loadDetail(card.dataset.page);
    });

    card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            card.click();
        }
    });
});

// Chargement initial : Envoyer Plus Tard
loadDetail('doc/sendlater.html');