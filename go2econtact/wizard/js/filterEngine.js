/**
 * filterEngine.js
 * 
 * Reproduction EXACTE de l'algorithme de décision Go2Econtact (FilterEngine.php)
 * Version JavaScript pur pour GitHub Pages (sans backend PHP)
 * 
 * ORDRE DE PRIORITÉ (CRITIQUE) :
 * 1. INCLUSION (priorité absolue) - Force AR même si exclu/interne
 * 2. EXCLUSION - Bloque AR (domaines, adresses, patterns)
 *    (dont sujets — vérifiés en priorité #1 dans l'exclusion)
 * 3. Domaine interne - Bloque AR si pas dans INCLUSION
 * 4. Par défaut - Email externe non exclu = AR envoyé
 * 
 * @author Hervé ROUVROY (port JS depuis PHP)
 * @version 2.1
 * @license MPL-2.0
 */

class FilterEngine {
    constructor() {
        /**
         * Règle appliquée (pour traçabilité)
         * @type {string|null}
         */
        this.lastAppliedRule = null;
    }
    
    /**
     * Point d'entrée principal - Détermine si un email doit recevoir un AR
     * Reproduction de shouldProcessEmail() + applyFilters() de background.js
     * 
     * @param {string} email Adresse email à tester
     * @param {Object} config Configuration (internalDomain, exclusion, inclusion)
     * @returns {Object} {allowed: boolean, reason: string, rule: string|null}
     */
    shouldSendAR(email, config) {
        // Normaliser l'email
        email = email.toLowerCase().trim();
        
        // Réinitialiser la règle appliquée
        this.lastAppliedRule = null;
        
        // 1. PRIORITÉ ABSOLUE : Vérifier INCLUSION
        if (this._isInInclusionList(email, config.inclusion)) {
            return {
                allowed: true,
                reason: 'Inclusion forcée (exception)',
                rule: this.lastAppliedRule
            };
        }

        // 2. Vérifier si email INTERNE (avant exclusion — conforme background.js)
        const isExternal = this._isExternalEmail(email, config.internalDomain);

        if (!isExternal) {
            this.lastAppliedRule = 'Domaine interne: ' + config.internalDomain;
            return {
                allowed: false,
                reason: 'Email interne (non dans INCLUSION)',
                rule: this.lastAppliedRule
            };
        }

        // 3. Vérifier EXCLUSION (seulement pour emails externes)
        if (this._isInExclusionList(email, config.exclusion, config.subject || null)) {
            return {
                allowed: false,
                reason: 'Exclusion',
                rule: this.lastAppliedRule
            };
        }

        // 4. Par défaut : Email externe non exclu = OK
        return {
            allowed: true,
            reason: 'Email externe non exclu',
            rule: null
        };
    }
    
    /**
     * Vérifier si email dans liste INCLUSION
     * Reproduction de isInInclusionList() de background.js
     * 
     * @param {string} email Email normalisé (lowercase)
     * @param {Object} inclusion {addresses: [], domains: []}
     * @returns {boolean}
     * @private
     */
    _isInInclusionList(email, inclusion) {
        if (!inclusion) {
            return false;
        }
        
        // Vérifier adresses exactes
        if (inclusion.addresses && Array.isArray(inclusion.addresses)) {
            for (const address of inclusion.addresses) {
                if (address.toLowerCase() === email) {
                    this.lastAppliedRule = `Adresse incluse: ${address}`;
                    return true;
                }
            }
        }
        
        // Vérifier domaines (avec wildcards)
        if (inclusion.domains && Array.isArray(inclusion.domains)) {
            const domain = this._extractDomain(email);
            if (domain) {
                for (const domainPattern of inclusion.domains) {
                    if (this._matchesWildcard(domain, this._normalizeDomainPattern(domainPattern))) {
                        this.lastAppliedRule = `Domaine inclus: ${domainPattern}`;
                        return true;
                    }
                }
            }
        }
        
        return false;
    }
    
    /**
     * Vérifier si email dans liste EXCLUSION
     * Reproduction de isInExclusionList() de background.js
     * 
     * @param {string} email Email normalisé (lowercase)
     * @param {Object} exclusion {domains: [], addresses: [], patterns: []}
     * @returns {boolean}
     * @private
     */
    _isInExclusionList(email, exclusion, subject = null) {
        if (!exclusion) {
            return false;
        }

        // Vérifier sujets (PRIORITÉ #1 — reproduit background.js)
        if (subject && exclusion.subjects && Array.isArray(exclusion.subjects)) {
            const subjectLower = subject.toLowerCase();
            for (const subjectPattern of exclusion.subjects) {
                if (this._matchesSubjectPattern(subjectLower, subjectPattern)) {
                    this.lastAppliedRule = `Sujet exclu: ${subjectPattern}`;
                    return true;
                }
            }
        }

        const domain = this._extractDomain(email);
        
        // Vérifier domaines (avec wildcards)
        if (exclusion.domains && Array.isArray(exclusion.domains)) {
            if (domain) {
                for (const domainPattern of exclusion.domains) {
                    if (this._matchesWildcard(domain, this._normalizeDomainPattern(domainPattern))) {
                        this.lastAppliedRule = `Domaine exclu: ${domainPattern}`;
                        return true;
                    }
                }
            }
        }
        
        // Vérifier adresses exactes
        if (exclusion.addresses && Array.isArray(exclusion.addresses)) {
            for (const address of exclusion.addresses) {
                if (address.toLowerCase() === email) {
                    this.lastAppliedRule = `Adresse exclue: ${address}`;
                    return true;
                }
            }
        }
        
        // Vérifier patterns (wildcards sur email complet)
        if (exclusion.patterns && Array.isArray(exclusion.patterns)) {
            for (const pattern of exclusion.patterns) {
                if (this._matchesWildcard(email, pattern)) {
                    this.lastAppliedRule = `Pattern exclu: ${pattern}`;
                    return true;
                }
            }
        }
        
        return false;
    }
    
    /**
     * Vérifier si email est EXTERNE (pas dans domaine interne)
     * Reproduction de isExternalEmail() de background.js
     * 
     * @param {string} email Email normalisé
     * @param {string} internalDomain Domaine interne (peut être vide ou avec wildcard)
     * @returns {boolean}
     * @private
     */
    _isExternalEmail(email, internalDomain) {
        // Pas de domaine interne configuré = tous les emails sont externes
        if (!internalDomain || internalDomain.trim() === '') {
            return true;
        }
        
        const domain = this._extractDomain(email);
        if (!domain) {
            return false; // Email invalide
        }
        
        internalDomain = internalDomain.toLowerCase();
        
        // Vérifier correspondance exacte
        if (domain === internalDomain) {
            return false; // Email interne
        }
        
        // Vérifier si domaine interne commence par wildcard (*.societe.fr)
        if (internalDomain.startsWith('*.')) {
            const baseDomain = internalDomain.substring(2); // Enlever "*."
            
            // Vérifier si le domaine se termine par le baseDomain
            if (this._endsWith(domain, baseDomain)) {
                return false; // Email interne (sous-domaine)
            }
        }
        
        return true; // Email externe
    }
    
    /**
     * Vérifier si texte correspond à un pattern avec wildcards (*)
     * Reproduction de matchesWildcard() de background.js
     * 
     * EXEMPLES :
     * - "*.example.com" correspond à "mail.example.com"
     * - "noreply@*" correspond à "noreply@gmail.com"
     * - "test.*@domain.fr" correspond à "test.user@domain.fr"
     * 
     * @param {string} text Texte à tester
     * @param {string} pattern Pattern avec wildcards
     * @returns {boolean}
     * @private
     */
    _matchesWildcard(text, pattern) {
        // Normaliser
        text = text.toLowerCase();
        pattern = pattern.toLowerCase();
        
        // Échapper les caractères spéciaux regex sauf *
        // Remplacer les caractères regex par leur version échappée
        pattern = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
        
        // Remplacer * par .*
        pattern = pattern.replace(/\*/g, '.*');
        
        // Créer la regex complète
        const regex = new RegExp('^' + pattern + '$');
        
        return regex.test(text);
    }
    
    /**
     * Vérifier si un sujet correspond à un pattern préfixé
     * Reproduction de matchesSubjectPattern() de background.js
     * Le sujet doit être passé déjà en lowercase.
     *
     * @param {string} subject Sujet normalisé (lowercase)
     * @param {string} pattern Pattern de la forme [COMMENCE|CONTIENT|FINIT]texte
     * @returns {boolean}
     * @private
     */
    _matchesSubjectPattern(subject, pattern) {
        if (!pattern || !subject) return false;

        const match = pattern.match(/^\[(COMMENCE|CONTIENT|FINIT)\](.+)$/);
        if (!match) return false;

        const [, type, content] = match;
        const contentLower = content.toLowerCase();

        switch (type) {
            case 'COMMENCE': return subject.startsWith(contentLower);
            case 'CONTIENT': return subject.includes(contentLower);
            case 'FINIT':    return subject.endsWith(contentLower);
            default:         return false;
        }
    }

    /**
     * Normalise un pattern de domaine — reproduit normalizeDomainPattern() de background.js
     * @societe.fr  → *.societe.fr
     * @*           → *
     * *.societe.fr → *.societe.fr (inchangé)
     *
     * @param {string} domainPattern
     * @returns {string}
     * @private
     */
    _normalizeDomainPattern(domainPattern) {
        if (!domainPattern) return domainPattern;
        if (domainPattern.startsWith('@')) {
            if (domainPattern === '@*') return '*';
            return '*' + domainPattern.substring(1);
        }
        return domainPattern;
    }

    /**
     * Extraire le domaine d'une adresse email
     * 
     * @param {string} email
     * @returns {string|null} Domaine ou null si invalide
     * @private
     */
    _extractDomain(email) {
        const parts = email.split('@');
        
        if (parts.length === 2 && parts[1].trim() !== '') {
            return parts[1].toLowerCase();
        }
        
        return null;
    }
    
    /**
     * Vérifier si une chaîne se termine par une autre
     * 
     * @param {string} haystack
     * @param {string} needle
     * @returns {boolean}
     * @private
     */
    _endsWith(haystack, needle) {
        if (needle.length === 0) {
            return true;
        }
        
        return haystack.slice(-needle.length) === needle;
    }
}

// Export pour utilisation
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilterEngine;
}