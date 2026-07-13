/**
 * Ce code source est soumis aux termes de la licence publique Mozilla,
 * version 2.0. Si une copie de la MPL n'a pas été distribuée avec ce fichier,
 * vous pouvez en obtenir une à l'adresse http://mozilla.org/MPL/2.0/.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 *
 * Go2Econtact - Utilitaires de validation partagés
 * Fonctions communes au wizard et au simulateur (formats email/domaine/pattern,
 * nettoyage de textarea, échappement HTML, feedback d'erreur de champ)
 *
 * @author Hervé ROUVROY
 * @copyright 2025 Hervé ROUVROY
 * @license MPL-2.0
 * @version 1.0
 * @see https://fiptoolkit.github.io/fip-toolkit/go2econtact/
 */

/**
 * CONTEXTE MÉTIER :
 * Ce fichier centralise les règles de validation utilisées à l'identique par
 * wizard.js (assistant de configuration) et simulateur.js (test de règles).
 * Chargé avant l'un et l'autre sur leurs pages respectives.
 */

/**
 * Validation email simple
 *
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Validation domaine avec support complet wildcards
 *
 * @param {string} domain
 * @returns {boolean}
 */
function isValidDomainWithWildcards(domain) {
    // Cas spéciaux wildcards d'abord
    if (domain === '*') return true;                    // TOUS les domaines
    if (domain === '*.*') return true;                  // Domaines avec point
    if (/^\*\.[a-zA-Z]{2,}$/.test(domain)) return true; // *.fr, *.com, etc.

    // Domaines normaux : exiger au moins un point
    const domainRegex = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return domainRegex.test(domain);
}

/**
 * Validation pattern avec wildcard domaine seulement
 *
 * @param {string} pattern
 * @returns {boolean}
 */
function isValidPatternFormat(pattern) {
    const patternRegex = /^[^\s@*]+@(\*|\*\.[a-zA-Z0-9.-]+|[a-zA-Z0-9.-]+)$/;
    return patternRegex.test(pattern.trim());
}

/**
 * Échapper HTML pour éviter les injections XSS
 *
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Afficher un message d'erreur sous un champ de formulaire
 *
 * @param {HTMLElement} field
 * @param {string} message
 */
function showFieldError(field, message) {
    field.classList.add('is-invalid');

    // Supprimer ancien message d'erreur s'il existe
    const existingError = field.parentElement.querySelector('.form-error');
    if (existingError) {
        existingError.remove();
    }

    // Ajouter nouveau message
    const errorSpan = document.createElement('span');
    errorSpan.className = 'form-error';
    errorSpan.textContent = message;
    field.parentElement.appendChild(errorSpan);
}

/**
 * Effacer le message d'erreur d'un champ de formulaire
 *
 * @param {HTMLElement} field
 */
function clearFieldError(field) {
    field.classList.remove('is-invalid');
    const errorSpan = field.parentElement.querySelector('.form-error');
    if (errorSpan) {
        errorSpan.remove();
    }
}

/**
 * Afficher la liste des lignes invalides sous un textarea
 *
 * @param {HTMLTextAreaElement} textarea
 * @param {string[]} invalidLines
 */
function showTextareaErrors(textarea, invalidLines) {
    textarea.classList.add('is-invalid');

    clearTextareaErrors(textarea);

    const errorDiv = document.createElement('div');
    errorDiv.className = 'form-error textarea-error-list';
    errorDiv.innerHTML = `⚠️ ${invalidLines.length} ligne${invalidLines.length > 1 ? 's' : ''} invalide${invalidLines.length > 1 ? 's' : ''} : `
        + invalidLines.map(l => `<code>${escapeHtml(l)}</code>`).join(', ');

    textarea.parentNode.appendChild(errorDiv);
}

/**
 * Effacer la liste d'erreurs affichée sous un textarea
 *
 * @param {HTMLTextAreaElement} textarea
 */
function clearTextareaErrors(textarea) {
    textarea.classList.remove('is-invalid');
    const existing = textarea.parentNode.querySelector('.textarea-error-list');
    if (existing) existing.remove();
}

/**
 * Nettoyer et valider le contenu d'un textarea ligne par ligne, selon un type
 * (email / domain / pattern / subject). Les lignes invalides restent visibles
 * dans le textarea — seul un message d'erreur est affiché sous le champ.
 *
 * @param {HTMLTextAreaElement} textarea
 * @param {'email'|'domain'|'pattern'|'subject'} type
 * @returns {{valid: string[], invalid: string[]}}
 */
function cleanAndValidateTextarea(textarea, type) {
    // Auto-conversion majuscules pour les préfixes sujets (reproduit options.js)
    if (type === 'subject') {
        textarea.value = textarea.value.replace(/^\[(commence|contient|finit)\]/gim, m => m.toUpperCase());
    }
    const lines = textarea.value.split('\n');
    const validLines = [];
    const invalidLines = [];

    lines.forEach(line => {
        const cleaned = line.trim();
        if (!cleaned) return;

        let isValid = false;

        if (type === 'email') {
            isValid = isValidEmailFormat(cleaned);
        } else if (type === 'domain') {
            isValid = isValidDomainWithWildcards(cleaned);
        } else if (type === 'pattern') {
            isValid = isValidPatternFormat(cleaned);
        } else if (type === 'subject') {
            isValid = /^\[(COMMENCE|CONTIENT|FINIT)\].+$/.test(cleaned);
        }

        if (isValid) {
            validLines.push(cleaned);
        } else {
            invalidLines.push(cleaned);
        }
    });

    // Ne pas modifier textarea.value — les lignes invalides restent visibles
    if (invalidLines.length > 0) {
        showTextareaErrors(textarea, invalidLines);
    } else {
        clearTextareaErrors(textarea);
    }

    return { valid: validLines, invalid: invalidLines };
}