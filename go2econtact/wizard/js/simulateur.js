/**
 * SIMULATEUR.JS Version JavaScript pur pour GitHub Pages
 * Gestion du formulaire, validation, simulation locale, affichage résultats
 * 
 * SANS BACKEND PHP :
 * - Simulation côté client avec filterEngine.js
 * - Explications côté client avec explanationGenerator.js
 * - Pas de tracking analytics (stats MySQL supprimées)
 * - Historique conservé en sessionStorage
 * 
 * @author Hervé ROUVROY
 * @version 3.0
 * @license MPL-2.0
 */

// ============================================
// ÉTAT DE L'APPLICATION
// ============================================

const appState = {
    config: null,           // Configuration actuelle
    testHistory: [],        // Historique des tests
    isLoading: false,       // État de chargement
    sessionId: null,        // ID unique de session
    sessionStartTime: null, // Timestamp début session
    deviceType: null,       // Type d'appareil (info locale, pas de tracking)
    browserFamily: null     // Famille de navigateur (info locale, pas de tracking)
};

// Instances des moteurs de décision et d'explication
let filterEngine = null;
let explanationGenerator = null;

// ============================================
// INITIALISATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Simulateur Go2Econtact v3 initialisé (JavaScript pur)');
    
    // Initialiser les moteurs
    filterEngine = new FilterEngine();
    explanationGenerator = new ExplanationGenerator();
    
    // Initialiser la session (info locale uniquement)
    initSession();
    
    // Attacher les événements
    attachEventListeners();
    
    // Charger l'historique depuis sessionStorage si présent
    loadHistoryFromSession();
});

// ============================================
// GESTION SESSION (LOCAL UNIQUEMENT)
// ============================================

/**
 * Initialiser la session (pas de tracking backend)
 */
function initSession() {
    // Générer un ID de session unique (local)
    appState.sessionId = generateSessionId();
    
    // Détecter le type d'appareil (info locale)
    appState.deviceType = detectDeviceType();
    
    // Détecter le navigateur (info locale)
    appState.browserFamily = detectBrowser();
    
    // Enregistrer le timestamp de début
    appState.sessionStartTime = Date.now();
    
    console.log('Session locale:', {
        id: appState.sessionId,
        device: appState.deviceType,
        browser: appState.browserFamily
    });
}

/**
 * Générer un ID de session unique
 */
function generateSessionId() {
    // Vérifier si déjà en sessionStorage
    let sessionId = sessionStorage.getItem('go2econtact_session_id');
    
    if (!sessionId) {
        // Générer nouveau ID : timestamp + random
        sessionId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        sessionStorage.setItem('go2econtact_session_id', sessionId);
    }
    
    return sessionId;
}

/**
 * Détecter le type d'appareil
 */
function detectDeviceType() {
    const ua = navigator.userAgent;
    
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        return 'tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        return 'mobile';
    }
    return 'desktop';
}

/**
 * Détecter le navigateur
 */
function detectBrowser() {
    const ua = navigator.userAgent;
    
    if (ua.indexOf('Firefox') > -1) return 'Firefox';
    if (ua.indexOf('Edg') > -1) return 'Edge';
    if (ua.indexOf('Chrome') > -1) return 'Chrome';
    if (ua.indexOf('Safari') > -1) return 'Safari';
    if (ua.indexOf('Opera') > -1 || ua.indexOf('OPR') > -1) return 'Opera';
    
    return 'unknown';
}

// ============================================
// ÉVÉNEMENTS
// ============================================

function attachEventListeners() {
    // Bouton de test
    const btnTest = document.getElementById('btnTest');
    btnTest.addEventListener('click', handleTest);
    
    // Validation en temps réel de l'email de test
    const testEmail = document.getElementById('testEmail');
    testEmail.addEventListener('input', validateEmailInput);
    testEmail.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleTest();
        }
    });
    
    // Nettoyage des textareas (validation)
    const textareas = {
        'exclusionDomains': 'domain',
        'exclusionAddresses': 'email',
        'exclusionPatterns': 'pattern',
        'inclusionAddresses': 'email',
        'inclusionDomains': 'domain',
        'exclusionSubjects': 'subject'
    };
    
    for (const [id, type] of Object.entries(textareas)) {
        const textarea = document.getElementById(id);
        if (textarea) {
            textarea.addEventListener('blur', () => {
                cleanAndValidateSimulatorTextarea(textarea, type);
            });
        }
    }
    
    // Validation domaine interne
    const internalDomain = document.getElementById('internalDomain');
    if (internalDomain) {
        internalDomain.addEventListener('blur', () => {
            const value = internalDomain.value.trim();
            if (value && !isValidDomain(value)) {
                showFieldError(internalDomain, 'Format de domaine invalide');
            } else {
                clearFieldError(internalDomain);
            }
        });
    }
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validation email simple
 */
function isValidEmailFormat(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Validation domaine avec support wildcards
 */
function isValidDomain(domain) {
    // Cas spéciaux wildcards d'abord
    if (domain === '*') return true;
    if (domain === '*.*') return true;
    if (/^\*\.[a-zA-Z]{2,}$/.test(domain)) return true;
    
    // Domaines normaux : exiger au moins un point
    const domainRegex = /^(\*\.)?[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return domainRegex.test(domain);
}

/**
 * Validation pattern avec wildcard domaine seulement
 */
function isValidPatternFormat(pattern) {
    const patternRegex = /^[^\s@*]+@(\*|\*\.[a-zA-Z0-9.-]+|[a-zA-Z0-9.-]+)$/;
    return patternRegex.test(pattern.trim());
}

/**
 * Nettoyage textarea simulateur
 */
function cleanAndValidateSimulatorTextarea(textarea, type) {
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
            isValid = isValidDomain(cleaned);
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

/**
 * Feedback simulateur (réutilise classes CSS wizard existantes)
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

function clearTextareaErrors(textarea) {
    textarea.classList.remove('is-invalid');
    const existing = textarea.parentNode.querySelector('.textarea-error-list');
    if (existing) existing.remove();
}

function validateEmailInput() {
    const testEmail = document.getElementById('testEmail');
    const email = testEmail.value.trim();
    
    if (!email) {
        testEmail.classList.remove('is-valid', 'is-invalid');
        return;
    }
    
    if (isValidEmailFormat(email)) {
        testEmail.classList.remove('is-invalid');
        testEmail.classList.add('is-valid');
    } else {
        testEmail.classList.remove('is-valid');
        testEmail.classList.add('is-invalid');
    }
}

// ============================================
// RÉCUPÉRATION CONFIG DEPUIS FORMULAIRE
// ============================================

function getConfigFromForm() {
    // Domaine interne
    const internalDomain = document.getElementById('internalDomain').value.trim();
    
    // Exclusions
    const exclusionDomains = document.getElementById('exclusionDomains').value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '');
    
    const exclusionAddresses = document.getElementById('exclusionAddresses').value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '');
    
    const exclusionPatterns = document.getElementById('exclusionPatterns').value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '');
    
    // Inclusions
    const inclusionAddresses = document.getElementById('inclusionAddresses').value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '');
    
    const inclusionDomains = document.getElementById('inclusionDomains').value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '');
    
    const exclusionSubjects = document.getElementById('exclusionSubjects').value
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '');

    const subject = document.getElementById('testSubject').value.trim();

    return {
        internalDomain: internalDomain,
        subject: subject,
        exclusion: {
            domains: exclusionDomains,
            addresses: exclusionAddresses,
            patterns: exclusionPatterns,
            subjects: exclusionSubjects
        },
        inclusion: {
            addresses: inclusionAddresses,
            domains: inclusionDomains
        }
    };
}

// ============================================
// GESTION TEST SIMULATION
// ============================================

async function handleTest() {
    hideError();
    
    const testEmail = document.getElementById('testEmail');
    const email = testEmail.value.trim();
    const btnTest = document.getElementById('btnTest');
    
    // Validation
    if (!email) {
        showFieldError(testEmail, 'Veuillez saisir une adresse email');
        return;
    }
    
    if (!isValidEmailFormat(email)) {
        showFieldError(testEmail, 'Format d\'email invalide');
        return;
    }
    
    clearFieldError(testEmail);
    
    // État loading
    setLoading(true);
    btnTest.disabled = true;
    btnTest.classList.add('loading');
    
    try {
        // Récupérer la configuration du formulaire
        const config = getConfigFromForm();
        appState.config = config;
        
        // SIMULATION LOCALE (sans appel PHP)
        const decision = filterEngine.shouldSendAR(email, config);
        const explanation = explanationGenerator.generate(email, decision, config);
        
        // Construire la réponse au format attendu
        const data = {
            success: true,
            allowed: decision.allowed,
            reason: decision.reason,
            rule_applied: decision.rule,
            explanation: explanation
        };
        
        // Afficher le résultat
        displayResult(email, data);
        
        // Ajouter à l'historique
        addToHistory(email, data);
        
    } catch (error) {
        console.error('Erreur simulation:', error);
        showError('Une erreur est survenue lors de la simulation. Veuillez réessayer.');
        
    } finally {
        // Retirer état loading
        setLoading(false);
        btnTest.disabled = false;
        btnTest.classList.remove('loading');
    }
}

// ============================================
// AFFICHAGE RÉSULTAT
// ============================================

function displayResult(email, data) {
    const resultZone = document.getElementById('result-zone');
    const decisionDiv = document.getElementById('result-decision');
    const explanationDiv = document.getElementById('result-explanation');
    
    // Déterminer classe et icône
    const isAllowed = data.allowed;
    const statusClass = isAllowed ? 'allowed' : 'blocked';
    const icon = isAllowed ? '✅' : '❌';
    const verb = isAllowed ? 'RECEVRA' : 'NE RECEVRA PAS';
    
    // Remplir décision
    decisionDiv.className = `result-decision ${statusClass}`;
    decisionDiv.innerHTML = `
        <span class="result-decision-icon">${icon}</span>
        <span><strong>${escapeHtml(email)}</strong> ${verb} un accusé de réception</span>
    `;
    
    // Remplir explication
    explanationDiv.innerHTML = `
        <h3>💬 Explication détaillée</h3>
        <p>${data.explanation}</p>
        ${data.rule_applied ? `<p>Règle appliquée : <span class="result-rule">${escapeHtml(data.rule_applied)}</span></p>` : ''}
    `;
    
    // Afficher la zone résultat
    resultZone.style.display = 'block';
    resultZone.classList.add('fade-in');
    
    // Scroller vers le résultat
    resultZone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ============================================
// GESTION HISTORIQUE
// ============================================

function addToHistory(email, data) {
    const historyItem = {
        email: email,
        allowed: data.allowed,
        reason: data.reason,
        timestamp: new Date().toISOString()
    };
    
    // Ajouter au début du tableau
    appState.testHistory.unshift(historyItem);
    
    // Limiter à 10 entrées
    if (appState.testHistory.length > 10) {
        appState.testHistory = appState.testHistory.slice(0, 10);
    }
    
    // Sauvegarder en session
    saveHistoryToSession();
    
    // Afficher l'historique
    displayHistory();
}

function displayHistory() {
    const historyZone = document.getElementById('history-zone');
    
    if (appState.testHistory.length === 0) {
        historyZone.innerHTML = '<p class="text-muted">Aucun test effectué pour le moment</p>';
        return;
    }
    
    const historyHTML = `
        <ul class="history-list">
            ${appState.testHistory.map(item => `
                <li class="history-item">
                    <span class="history-item-email">${escapeHtml(item.email)}</span>
                    <span class="history-item-result ${item.allowed ? 'allowed' : 'blocked'}">
                        ${item.allowed ? '✅ AR' : '❌ Pas AR'}
                    </span>
                    <span class="history-item-time">${formatTime(item.timestamp)}</span>
                </li>
            `).join('')}
        </ul>
    `;
    
    historyZone.innerHTML = historyHTML;
}

function saveHistoryToSession() {
    try {
        sessionStorage.setItem('go2econtact_history', JSON.stringify(appState.testHistory));
    } catch (e) {
        console.warn('Impossible de sauvegarder l\'historique:', e);
    }
}

function loadHistoryFromSession() {
    try {
        const saved = sessionStorage.getItem('go2econtact_history');
        if (saved) {
            appState.testHistory = JSON.parse(saved);
            displayHistory();
        }
    } catch (e) {
        console.warn('Impossible de charger l\'historique:', e);
    }
}

// ============================================
// GESTION ERREURS
// ============================================

function showError(message) {
    const errorZone = document.getElementById('error-zone');
    errorZone.innerHTML = `
        <h3>⚠️ Erreur</h3>
        <p>${escapeHtml(message)}</p>
    `;
    errorZone.style.display = 'block';
    errorZone.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
    const errorZone = document.getElementById('error-zone');
    errorZone.style.display = 'none';
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

// ============================================
// ÉTAT UI
// ============================================

function setLoading(isLoading) {
    appState.isLoading = isLoading;
}

// ============================================
// UTILITAIRES
// ============================================

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'À l\'instant';
    if (diffMins === 1) return 'Il y a 1 minute';
    if (diffMins < 60) return `Il y a ${diffMins} minutes`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return 'Il y a 1 heure';
    if (diffHours < 24) return `Il y a ${diffHours} heures`;
    
    return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}