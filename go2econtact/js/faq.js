/**
 * faq.js — Go2Econtact site d'aide
 * Accordéon de la page FAQ : bascule l'affichage de la réponse au clic
 * sur la question correspondante.
 */

document.addEventListener('DOMContentLoaded', function() {
    const questions = document.querySelectorAll('.faq-question');
    questions.forEach(question => {
        question.addEventListener('click', function() {
            this.classList.toggle('active');
            const answer = this.nextElementSibling;
            answer.classList.toggle('active');
        });
    });
});