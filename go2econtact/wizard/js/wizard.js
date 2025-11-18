/**
 * Ce code source est soumis aux termes de la licence publique Mozilla,
 * version 2.0. Si une copie de la MPL n'a pas été distribuée avec ce fichier,
 * vous pouvez en obtenir une à l'adresse http://mozilla.org/MPL/2.0/.
 * 
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 * 
 * Go2Econtact - Logique du wizard de configuration guidée
 * Interface web pour créer des règles d'inclusion/exclusion
 * 
 * @author Hervé ROUVROY
 * @copyright 2025 Hervé ROUVROY
 * @license MPL-2.0
 * @version 1.0
 * @see https://fiptoolkit.github.io/fip-toolkit/go2econtact/
 */

/**
 * CONTEXTE MÉTIER :
 * Wizard guidé pour aider les utilisateurs non-techniques à configurer
 * les règles d'inclusion/exclusion de l'extension Go2Econtact.
 * Navigation pas-à-pas avec validation et export JSON.
 */

// ============================================
// ÉTAT DU WIZARD
// ============================================

const wizardState = {
    currentStep: 1,
    totalSteps: 4,
    config: {
        internalDomain: '',
        exclusion: {
            domains: [],
            addresses: [],
            patterns: []
        },
        inclusion: {
            addresses: [],
            domains: []
        }
    }
};

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Wizard Go2Econtact initialisé');
    
    // Attacher les événements
    attachEventListeners();
    
    // Charger config sauvegardée si présente
    loadConfigFromSession();
    
    // Afficher la première étape
    showStep(1);
});

// ============================================
// ÉVÉNEMENTS
// ============================================

function attachEventListeners() {
    // Boutons navigation
    const btnPrevious = document.getElementById('btnPrevious');
    const btnNext = document.getElementById('btnNext');
    const btnFinish = document.getElementById('btnFinish');
    
    btnPrevious.addEventListener('click', () => previousStep());
    btnNext.addEventListener('click', () => nextStep());
    btnFinish.addEventListener('click', () => finishWizard());
    
    // Bouton patterns par défaut
    const btnAddPatterns = document.querySelector('[data-action="add-default-patterns"]');
    if (btnAddPatterns) {
        btnAddPatterns.addEventListener('click', addDefaultPatterns);
    }
    
    // Boutons export (étape 4)
    const btnExportJson = document.getElementById('btnExportJson');
    const btnCopyJson = document.getElementById('btnCopyJson');
    
    if (btnExportJson) {
        btnExportJson.addEventListener('click', exportConfigJson);
    }
    
    if (btnCopyJson) {
        btnCopyJson.addEventListener('click', copyConfigToClipboard);
    }
    
    // Validation en temps réel
    attachValidationListeners();
}

function attachValidationListeners() {
    const internalDomain = document.getElementById('internalDomain');
    
    // Validation domaine interne
    if (internalDomain) {
        internalDomain.addEventListener('blur', () => {
            validateDomain(internalDomain);
        });
    }
   
    // Validation textarea wizard
    const wizardTextareas = [
        { id: 'exclusionDomains', type: 'domain' },
        { id: 'exclusionAddresses', type: 'email' },
        { id: 'exclusionPatterns', type: 'pattern' },
        { id: 'inclusionAddresses', type: 'email' },
        { id: 'inclusionDomains', type: 'domain' }
    ];
    
    wizardTextareas.forEach(({ id, type }) => {
        const textarea = document.getElementById(id);
        if (textarea) {
            textarea.addEventListener('blur', () => {
                cleanAndValidateWizardTextarea(textarea, type);
            });
        }
    });
}

// ============================================
// NAVIGATION ENTRE ÉTAPES
// ============================================

function showStep(stepNumber) {
    // Cacher toutes les étapes
    const allSteps = document.querySelectorAll('.wizard-step');
    allSteps.forEach(step => {
        step.classList.remove('active');
    });
    
    // Afficher l'étape demandée
    const currentStepElement = document.querySelector(`.wizard-step[data-step="${stepNumber}"]`);
    if (currentStepElement) {
        currentStepElement.classList.add('active');
    }
    
    // Mettre à jour la barre de progression
    updateProgressBar(stepNumber);
    
    // Mettre à jour les boutons de navigation
    updateNavigationButtons(stepNumber);
    
    // Si étape 4 (récapitulatif), générer le résumé
    if (stepNumber === 4) {
        generateSummary();
    }
    
    // Mettre à jour l'état
    wizardState.currentStep = stepNumber;
    
    // Scroller en haut
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgressBar(stepNumber) {
    const progressSteps = document.querySelectorAll('.progress-step');
    
    progressSteps.forEach((step, index) => {
        const stepNum = index + 1;
        
        if (stepNum < stepNumber) {
            // Étape complétée
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (stepNum === stepNumber) {
            // Étape active
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            // Étape future
            step.classList.remove('active', 'completed');
        }
    });
}

function updateNavigationButtons(stepNumber) {
    const btnPrevious = document.getElementById('btnPrevious');
    const btnNext = document.getElementById('btnNext');
    const btnFinish = document.getElementById('btnFinish');
    
    // Bouton Précédent : caché à l'étape 1
    if (stepNumber === 1) {
        btnPrevious.style.display = 'none';
    } else {
        btnPrevious.style.display = 'inline-block';
    }
    
    // Bouton Suivant : caché à l'étape 4
    if (stepNumber === wizardState.totalSteps) {
        btnNext.style.display = 'none';
        btnFinish.style.display = 'inline-block';
    } else {
        btnNext.style.display = 'inline-block';
        btnFinish.style.display = 'none';
    }
}

function nextStep() {
    // Valider l'étape actuelle
    if (!validateCurrentStep()) {
        return;
    }
    
    // Sauvegarder les données de l'étape
    saveCurrentStepData();
    
    // Passer à l'étape suivante
    if (wizardState.currentStep < wizardState.totalSteps) {
        showStep(wizardState.currentStep + 1);
    }
}

function previousStep() {
    // Sauvegarder les données (sans validation stricte)
    saveCurrentStepData();
    
    // Revenir à l'étape précédente
    if (wizardState.currentStep > 1) {
        showStep(wizardState.currentStep - 1);
    }
}

function finishWizard() {
    // Sauvegarder les données
    saveCurrentStepData();
    
    console.log('Configuration finale:', wizardState.config);
    
    // Optionnel : Rediriger vers simulateur avec config pré-remplie
    // window.location.href = 'simulateur.php';
}

// ============================================
// VALIDATION
// ============================================

function validateCurrentStep() {
    const step = wizardState.currentStep;
    
    switch (step) {
        case 1:
            return validateStep1();
        case 2:
            return validateStep2();
        case 3:
            return validateStep3();
        case 4:
            return true; // Pas de validation nécessaire pour le récap
        default:
            return true;
    }
}

function validateStep1() {
    const internalDomain = document.getElementById('internalDomain');
    const value = internalDomain.value.trim();
    
    // Optionnel : pas d'erreur si vide
    if (!value) {
        return true;
    }
    
    // Validation format
    return validateDomain(internalDomain);
}

function validateStep2() {
    // Validation des exclusions (optionnel)
    // Pour l'instant, on accepte tout
    return true;
}

function validateStep3() {
    // Validation des inclusions (optionnel)
    return true;
}

function validateDomain(inputElement) {
    const value = inputElement.value.trim();
    
    if (!value) {
        clearFieldError(inputElement);
        return true;
    }
    
    // Validation domaine avec wildcards
    if (!isValidDomainWithWildcards(value)) {
        showFieldError(inputElement, 'Format de domaine invalide (ex: societe.fr ou *.societe.fr)');
        return false;
    }
    
    clearFieldError(inputElement);
    return true;
}

/**
 * Validation domaine avec support complet wildcards
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

function clearFieldError(field) {
    field.classList.remove('is-invalid');
    const errorSpan = field.parentElement.querySelector('.form-error');
    if (errorSpan) {
        errorSpan.remove();
    }
}

/**
 * Validation email simple
 */
function isValidEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Validation pattern avec guidance vers bon champ
 */
function isValidPatternFormat(pattern) {
    const patternRegex = /^[^\s@*]+@(\*|\*\.[a-zA-Z0-9.-]+|[a-zA-Z0-9.-]+)$/;
    return patternRegex.test(pattern.trim());
}

/**
 * Nettoyage textarea wizard avec feedback
 */
function cleanAndValidateWizardTextarea(textarea, type) {
    const lines = textarea.value.split('\n');
    const validLines = [];
    const invalidLines = [];
    const suggestions = [];
    
    lines.forEach(line => {
        const cleaned = line.trim();
        if (!cleaned) return;
        
        let isValid = false;
        let suggestion = '';
        
        if (type === 'email') {
            isValid = isValidEmailFormat(cleaned);
            if (!isValid && cleaned.startsWith('*@')) {
                suggestion = 'Utilisez la section "Domaines" pour ' + cleaned.substring(2);
            }
        } else if (type === 'domain') {
            // Réutiliser validateDomain existant (mais juste le test)
            const domainRegex = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
            isValid = isValidDomainWithWildcards(cleaned);
        } else if (type === 'pattern') {
            isValid = isValidPatternFormat(cleaned);
            if (!isValid && cleaned.startsWith('*@')) {
                suggestion = 'Utilisez la section "Domaines" pour ' + cleaned.substring(2);
            }
        }
        
        if (isValid) {
            validLines.push(cleaned);
        } else {
            invalidLines.push(cleaned);
            if (suggestion) suggestions.push(suggestion);
        }
    });
    
    textarea.value = validLines.join('\n');
    
    if (invalidLines.length > 0) {
        showWizardValidationFeedback(textarea, invalidLines.length, suggestions);
    }
    
    return { valid: validLines, invalid: invalidLines };
}

/**
 * Feedback wizard avec classes existantes
 */
function showWizardValidationFeedback(textarea, removedCount, suggestions = []) {
    // Utiliser classe existante
    textarea.classList.add('is-invalid');
    
    // Badge avec classe CSS
    const badge = document.createElement('div');
    badge.className = 'validation-badge';
    badge.textContent = `${removedCount} supprimé${removedCount > 1 ? 's' : ''}`;
    
    if (suggestions.length > 0) {
        badge.title = suggestions.join('\n');
    }
    
    textarea.parentNode.appendChild(badge);
    
    // Supprimer après 3 secondes
    setTimeout(() => {
        textarea.classList.remove('is-invalid');
        if (badge.parentNode) badge.remove();
    }, 3000);
}

// ============================================
// SAUVEGARDE DES DONNÉES
// ============================================

function saveCurrentStepData() {
    const step = wizardState.currentStep;
    
    switch (step) {
        case 1:
            saveStep1Data();
            break;
        case 2:
            saveStep2Data();
            break;
        case 3:
            saveStep3Data();
            break;
    }
    
    // Sauvegarder en sessionStorage
    saveConfigToSession();
}

function saveStep1Data() {
    const internalDomain = document.getElementById('internalDomain').value.trim();
    wizardState.config.internalDomain = internalDomain;
}

function saveStep2Data() {
    wizardState.config.exclusion = {
        domains: textareaToArray(document.getElementById('exclusionDomains').value),
        addresses: textareaToArray(document.getElementById('exclusionAddresses').value),
        patterns: textareaToArray(document.getElementById('exclusionPatterns').value)
    };
}

function saveStep3Data() {
    wizardState.config.inclusion = {
        addresses: textareaToArray(document.getElementById('inclusionAddresses').value),
        domains: textareaToArray(document.getElementById('inclusionDomains').value)
    };
}

function textareaToArray(text) {
    return text
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0);
}

function saveConfigToSession() {
    try {
        sessionStorage.setItem('go2econtact_wizard_config', JSON.stringify(wizardState.config));
    } catch (e) {
        console.warn('Impossible de sauvegarder la config:', e);
    }
}

function loadConfigFromSession() {
    try {
        const saved = sessionStorage.getItem('go2econtact_wizard_config');
        if (saved) {
            wizardState.config = JSON.parse(saved);
            populateFormFromConfig();
        }
    } catch (e) {
        console.warn('Impossible de charger la config:', e);
    }
}

function populateFormFromConfig() {
    const config = wizardState.config;
    
    // Étape 1
    document.getElementById('internalDomain').value = config.internalDomain || '';
    
    // Étape 2
    document.getElementById('exclusionDomains').value = arrayToTextarea(config.exclusion.domains);
    document.getElementById('exclusionAddresses').value = arrayToTextarea(config.exclusion.addresses);
    document.getElementById('exclusionPatterns').value = arrayToTextarea(config.exclusion.patterns);
    
    // Étape 3
    document.getElementById('inclusionAddresses').value = arrayToTextarea(config.inclusion.addresses);
    document.getElementById('inclusionDomains').value = arrayToTextarea(config.inclusion.domains);
}

function arrayToTextarea(arr) {
    return arr.join('\n');
}

// ============================================
// PATTERNS PAR DÉFAUT
// ============================================

function addDefaultPatterns() {
    const patternsTextarea = document.getElementById('exclusionPatterns');
    
    const defaultPatterns = [
        'noreply@*',
        'no-reply@*',
        'postmaster@*',
        'mailer-daemon@*'
    ];
    
    // Récupérer les patterns existants
    const existingPatterns = textareaToArray(patternsTextarea.value);
    
    // Fusionner (éviter doublons)
    const allPatterns = [...new Set([...existingPatterns, ...defaultPatterns])];
    
    // Remettre dans le textarea
    patternsTextarea.value = allPatterns.join('\n');
    
    // Feedback visuel
    patternsTextarea.classList.add('is-valid');
    setTimeout(() => {
        patternsTextarea.classList.remove('is-valid');
    }, 1000);
}

// ============================================
// GÉNÉRATION RÉCAPITULATIF
// ============================================

function generateSummary() {
    const summaryContent = document.getElementById('summary-content');
    
    // S'assurer que la config est à jour
    saveCurrentStepData();
    
    const config = wizardState.config;
    
    let html = '';
    
    // Encadré comportement par défaut
    html += `
        <div class="info-box">
            <strong>📬 Règle par défaut</strong>
            <p>Tous les emails reçoivent un AR, <strong>SAUF</strong> votre organisation/association/service (page 1) et les exclusions (page 2).</p>
            <p>Les inclusions (page 3) servent uniquement à forcer l'envoi d'AR pour des exceptions spécifiques.</p>
        </div>
    `;
    
    // Domaine interne
    html += `
        <div class="summary-section">
            <h3>📧 Domaine interne</h3>
            ${config.internalDomain 
                ? `<p>Les emails de <code>${escapeHtml(config.internalDomain)}</code> ne recevront pas d'AR par défaut.</p>`
                : `<p class="summary-empty">Aucun domaine interne configuré</p>`
            }
        </div>
    `;
    
    // Exclusions
    const hasExclusions = 
        config.exclusion.domains.length > 0 ||
        config.exclusion.addresses.length > 0 ||
        config.exclusion.patterns.length > 0;
    
    html += `
        <div class="summary-section">
            <h3>🚫 Exclusions (ne recevront JAMAIS d'AR)</h3>
    `;
    
    if (hasExclusions) {
        if (config.exclusion.domains.length > 0) {
            html += `
                <h4>Domaines exclus :</h4>
                <ul class="summary-list">
                    ${config.exclusion.domains.map(d => `<li>${escapeHtml(d)}</li>`).join('')}
                </ul>
            `;
        }
        
        if (config.exclusion.addresses.length > 0) {
            html += `
                <h4>Adresses exclues :</h4>
                <ul class="summary-list">
                    ${config.exclusion.addresses.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
                </ul>
            `;
        }
        
        if (config.exclusion.patterns.length > 0) {
            html += `
                <h4>Patterns exclus :</h4>
                <ul class="summary-list">
                    ${config.exclusion.patterns.map(p => `<li>${escapeHtml(p)}</li>`).join('')}
                </ul>
            `;
        }
    } else {
        html += `<p class="summary-empty">Aucune exclusion configurée</p>`;
    }
    
    html += `</div>`;
    
    // Inclusions
    const hasInclusions = 
        config.inclusion.addresses.length > 0 ||
        config.inclusion.domains.length > 0;
    
    html += `
        <div class="summary-section">
            <h3>⭐ Inclusions (recevront TOUJOURS un AR)</h3>
    `;
    
    if (hasInclusions) {
        if (config.inclusion.addresses.length > 0) {
            html += `
                <h4>Adresses prioritaires :</h4>
                <ul class="summary-list">
                    ${config.inclusion.addresses.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
                </ul>
            `;
        }
        
        if (config.inclusion.domains.length > 0) {
            html += `
                <h4>Domaines prioritaires :</h4>
                <ul class="summary-list">
                    ${config.inclusion.domains.map(d => `<li>${escapeHtml(d)}</li>`).join('')}
                </ul>
            `;
        }
    } else {
        html += `<p class="summary-empty">Aucune inclusion configurée → Comportement par défaut appliqué (tous les emails externes recevront un AR)</p>`;
    }
    
    html += `</div>`;
    
    summaryContent.innerHTML = html;
}

// ============================================
// EXPORT JSON
// ============================================

function exportConfigJson() {
    // S'assurer que la config est à jour
    saveCurrentStepData();
    
    // Format harmonisé avec l'extension Thunderbird
    const harmonizedConfig = {
        extension: "Go2Econtact",
        version: "1.0", 
        exportedAt: new Date().toISOString(),
        partialConfig: true,
        settings: wizardState.config
    };
    const json = JSON.stringify(harmonizedConfig, null, 2);
    
    // Créer un blob
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Créer un lien de téléchargement
    const a = document.createElement('a');
    a.href = url;
    const today = new Date().toISOString().split('T')[0];
    a.download = `Go2Econtact-wizard-config-${today}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Nettoyer
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Configuration exportée:', config);
}

function copyConfigToClipboard() {
    // S'assurer que la config est à jour
    saveCurrentStepData();
    
    const config = wizardState.config;
    
    // Générer le texte au format exploitable pour Thunderbird
    let text = '';
    
    // Domaine interne
    text += '=== DOMAINE INTERNE ===\n';
    if (config.internalDomain) {
        text += config.internalDomain + '\n';
    } else {
        text += '(aucun)\n';
    }
    text += '\n';
    
    // Exclusions - Domaines
    text += '=== EXCLUSIONS - DOMAINES ===\n';
    if (config.exclusion.domains.length > 0) {
        text += config.exclusion.domains.join('\n') + '\n';
    } else {
        text += '(aucun)\n';
    }
    text += '\n';
    
    // Exclusions - Adresses
    text += '=== EXCLUSIONS - ADRESSES ===\n';
    if (config.exclusion.addresses.length > 0) {
        text += config.exclusion.addresses.join('\n') + '\n';
    } else {
        text += '(aucun)\n';
    }
    text += '\n';
    
    // Exclusions - Patterns
    text += '=== EXCLUSIONS - PATTERNS ===\n';
    if (config.exclusion.patterns.length > 0) {
        text += config.exclusion.patterns.join('\n') + '\n';
    } else {
        text += '(aucun)\n';
    }
    text += '\n';
    
    // Inclusions - Adresses
    text += '=== INCLUSIONS - ADRESSES (recevront TOUJOURS un AR) ===\n';
    if (config.inclusion.addresses.length > 0) {
        text += config.inclusion.addresses.join('\n') + '\n';
    } else {
        text += '(aucun)\n';
    }
    text += '\n';
    
    // Inclusions - Domaines
    text += '=== INCLUSIONS - DOMAINES (recevront TOUJOURS un AR) ===\n';
    if (config.inclusion.domains.length > 0) {
        text += config.inclusion.domains.join('\n') + '\n';
    } else {
        text += '(aucun)\n';
    }
    text += '\n';
    
    // Instructions
    text += '---\n';
    text += 'Instructions : Copiez chaque section dans le champ correspondant de l\'extension Thunderbird Go2Econtact (onglet Général)\n';
    
    // Copier dans le presse-papier
    navigator.clipboard.writeText(text).then(() => {
        // Feedback visuel
        const btn = document.getElementById('btnCopyJson');
        const originalText = btn.textContent;
        btn.textContent = '✓ Copié !';
        btn.style.background = '#28a745';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
        
    }).catch(err => {
        console.error('Erreur copie presse-papier:', err);
        alert('Impossible de copier dans le presse-papier');
    });
}

// ============================================
// UTILITAIRES
// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}