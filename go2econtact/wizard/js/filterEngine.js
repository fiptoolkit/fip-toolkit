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
    
    /**
     * Point d'entrée principal - Détermine si un email doit recevoir un AR
     * Reproduction de shouldProcessEmail() + applyFilters() de background.js
     * 
     * @param {string} email Adresse email à tester
     * @param {Object} config Configuration (internalDomains, exclusion, inclusion)
     * @returns {Object} {allowed: boolean, reason: string, rule: string|null}
     */
    shouldSendAR(email, config) {
        // Normaliser l'email
        email = email.toLowerCase().trim();

        // 1. PRIORITÉ ABSOLUE : Vérifier INCLUSION
        const inclusionRule = this._isInInclusionList(email, config.inclusion);
        if (inclusionRule) {
            return {
                allowed: true,
                reason: 'Inclusion forcée (exception)',
                rule: inclusionRule
            };
        }

        // 2. Vérifier si email INTERNE (avant exclusion — conforme background.js)
        const internalRule = this._isInInternalDomainsList(email, config.internalDomains);
        if (internalRule) {
            return {
                allowed: false,
                reason: 'Email interne (non dans INCLUSION)',
                rule: internalRule
            };
        }

        // 3. Vérifier EXCLUSION (seulement pour emails externes)
        const exclusionRule = this._isInExclusionList(email, config.exclusion, config.subject || null);
        if (exclusionRule) {
            return {
                allowed: false,
                reason: 'Exclusion',
                rule: exclusionRule
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
     * @returns {string|null} Règle appliquée si correspondance, null sinon
     * @private
     */
    _isInInclusionList(email, inclusion) {
        if (!inclusion) {
            return null;
        }

        // Vérifier adresses exactes
        const addressRule = this._findMatchingAddressRule(email, inclusion.addresses, 'Adresse incluse');
        if (addressRule) return addressRule;

        // Vérifier domaines (avec wildcards)
        const domain = this._extractDomain(email);
        const domainRule = this._findMatchingDomainRule(domain, inclusion.domains, 'Domaine inclus');
        if (domainRule) return domainRule;

        return null;
    }

    /**
     * Cherche une correspondance de domaine (avec wildcard) dans une liste de
     * patterns. Factorisé pour éviter la duplication entre _isInInclusionList,
     * _isInExclusionList et _isInInternalDomainsList.
     * Reproduction de findMatchingDomainRule() de background.js
     *
     * @param {string|null} domain Domaine à tester (ex: "mail.societe.fr")
     * @param {string[]} patternList Liste de patterns domaine (notation *)
     * @param {string} ruleLabel Préfixe du libellé retourné (ex: "Domaine exclu")
     * @returns {string|null} "${ruleLabel}: ${pattern}" si correspondance, sinon null
     * @private
     */
    _findMatchingDomainRule(domain, patternList, ruleLabel) {
        if (!domain || !patternList || !Array.isArray(patternList)) return null;
        for (const pattern of patternList) {
            if (this._matchesWildcard(domain, pattern)) {
                return `${ruleLabel}: ${pattern}`;
            }
        }
        return null;
    }

    /**
     * Cherche une correspondance d'adresse exacte dans une liste. Factorisé
     * pour la même raison que _findMatchingDomainRule.
     * Reproduction de findMatchingAddressRule() de background.js
     *
     * @param {string} emailLower Adresse à tester (déjà en minuscules)
     * @param {string[]} addressList Liste d'adresses exactes
     * @param {string} ruleLabel Préfixe du libellé retourné (ex: "Adresse exclue")
     * @returns {string|null} "${ruleLabel}: ${address}" si correspondance, sinon null
     * @private
     */
    _findMatchingAddressRule(emailLower, addressList, ruleLabel) {
        if (!addressList || !Array.isArray(addressList)) return null;
        for (const address of addressList) {
            if (emailLower === address.toLowerCase()) {
                return `${ruleLabel}: ${address}`;
            }
        }
        return null;
    }
    
    /**
     * Vérifier si email dans liste EXCLUSION
     * Reproduction de isInExclusionList() de background.js
     * 
     * @param {string} email Email normalisé (lowercase)
     * @param {Object} exclusion {domains: [], blockedTlds: [], addresses: [], patterns: [], subjects: []}
     * @returns {string|null} Règle appliquée si correspondance, null sinon
     * @private
     */
    _isInExclusionList(email, exclusion, subject = null) {
        if (!exclusion) {
            return null;
        }

        // Vérifier sujets (PRIORITÉ #1 — reproduit background.js)
        if (subject && exclusion.subjects && Array.isArray(exclusion.subjects)) {
            const subjectLower = subject.toLowerCase();
            for (const subjectPattern of exclusion.subjects) {
                if (this._matchesSubjectPattern(subjectLower, subjectPattern)) {
                    return `Sujet exclu: ${subjectPattern}`;
                }
            }
        }

        const domain = this._extractDomain(email);

        // Vérifier domaines (avec wildcards)
        const domainRule = this._findMatchingDomainRule(domain, exclusion.domains, 'Domaine exclu');
        if (domainRule) return domainRule;

        // Vérifier TLD/pays entièrement bloqués (suffixe littéral, sans caractère
        // joker) — "gouv.fr" bloque gouv.fr ET tous ses sous-domaines, y compris
        // le domaine racine lui-même — contrairement à *.gouv.fr (cf. _matchesWildcard)
        if (exclusion.blockedTlds && Array.isArray(exclusion.blockedTlds) && domain) {
            const domainLower = domain.toLowerCase();
            for (const tld of exclusion.blockedTlds) {
                const tldLower = tld.toLowerCase();
                if (domainLower === tldLower || domainLower.endsWith('.' + tldLower)) {
                    return `TLD bloqué: ${tld}`;
                }
            }
        }

        // Vérifier adresses exactes
        const addressRule = this._findMatchingAddressRule(email, exclusion.addresses, 'Adresse exclue');
        if (addressRule) return addressRule;

        // Vérifier patterns (wildcards sur email complet)
        if (exclusion.patterns && Array.isArray(exclusion.patterns)) {
            for (const pattern of exclusion.patterns) {
                if (this._matchesWildcard(email, pattern)) {
                    return `Filtre exclu : ${pattern}`;
                }
            }
        }

        return null;
    }
    
    /**
     * Vérifie si l'expéditeur appartient à l'un des domaines internes configurés
     * Reproduction de isInInternalDomainsList() de background.js
     *
     * @param {string} email Email normalisé (lowercase)
     * @param {string[]} internalDomains Domaines internes (notation *)
     * @returns {string|null} Règle appliquée si correspondance (email interne), null sinon (externe)
     * @private
     */
    _isInInternalDomainsList(email, internalDomains) {
        if (!internalDomains || !Array.isArray(internalDomains) || internalDomains.length === 0) {
            return null; // Pas de domaine interne configuré = tous les emails sont externes
        }

        const domain = this._extractDomain(email);
        if (!domain) {
            return 'Adresse invalide (domaine non extrait)';
        }

        return this._findMatchingDomainRule(domain, internalDomains, 'Domaine interne');
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
        const textLower = text.toLowerCase();
        const patternLower = pattern.toLowerCase();

        // CAS 1 : *.domain.com → UNIQUEMENT sous-domaines (notation DNS)
        if (patternLower.startsWith('*.')) {
            const domain = patternLower.substring(2); // Enlever *.

            // Wildcard supplémentaire dans le reste du pattern (*.* , *.societe.* …)
            // — un endsWith() littéral ne peut pas gérer un '*' au milieu du
            // pattern, déléguer à la regex bornée par label
            if (domain.includes('*')) {
                return this._buildWildcardRegex(patternLower).test(textLower);
            }

            if (!textLower.endsWith('.' + domain) || textLower === domain) return false;

            // Protection TLD seul : *.fr ne doit pas matcher societe.fr
            // Si domain est un TLD sans point (ex: 'fr', 'com'), exiger que le
            // préfixe avant .domain contienne lui-même un point (= vrai sous-domaine)
            if (!domain.includes('.')) {
                const prefix = textLower.slice(0, textLower.length - domain.length - 1);
                if (!prefix.includes('.')) return false;
            }

            return true;
        }

        // CAS 2 : Domaine avec wildcard ailleurs qu'en tête (societe.*, societe.*.paris.fr)
        //         ou pattern d'adresse classique (noreply@*, test.*@domain.fr, etc.)
        return this._buildWildcardRegex(patternLower).test(textLower);
    }

    /**
     * Construit la regex pour un pattern contenant un caractère joker '*' qui
     * n'est pas un simple préfixe *.domain (déjà traité par CAS 1 de
     * _matchesWildcard). Reproduction de buildWildcardRegex() de background.js.
     *
     * Notation domaine (societe.*, *.societe.*, mail.*.societe.fr) : le '*'
     * ne remplace jamais une partie d'un label DNS, seulement un label entier
     * — et le dernier label est borné ([^.]+) pour éviter qu'un joker final
     * ne s'étende sur plusieurs niveaux de domaine (ex: societe.multi.evil).
     * Notation adresse (noreply@*, test.*@domain.fr) : le '@' change la
     * sémantique, le joker s'étend alors librement (.*).
     *
     * @param {string} patternLower Pattern déjà en minuscules
     * @returns {RegExp}
     * @private
     */
    _buildWildcardRegex(patternLower) {
        if (patternLower.includes('@')) {
            const regexPattern = patternLower.replace(/\./g, '\\.').replace(/\*/g, '.*');
            return new RegExp('^' + regexPattern + '$', 'i');
        }

        const labels = patternLower.split('.');
        const lastIndex = labels.length - 1;
        const regexParts = labels.map((label, idx) => {
            if (label === '*') {
                if (labels.length === 1) return '.*'; // '*' seul = absolument tout
                return idx === lastIndex ? '[^.]+' : '.*';
            }
            return label;
        });
        return new RegExp('^' + regexParts.join('\\.') + '$', 'i');
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
}

// Export pour utilisation
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FilterEngine;
}