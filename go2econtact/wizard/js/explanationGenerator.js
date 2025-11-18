/**
 * explanationGenerator.js
 * 
 * Génère des explications détaillées en langage naturel
 * pour chaque décision de l'algorithme Go2Econtact
 * Version JavaScript pur pour GitHub Pages (sans backend PHP)
 * 
 * Objectif : Rendre compréhensible le système inclusion/exclusion
 * pour des utilisateurs non-techniques
 * 
 * @author Hervé ROUVROY (port JS depuis PHP)
 * @version 2.0
 * @license MPL-2.0
 */

class ExplanationGenerator {
    
    /**
     * Générer une explication détaillée basée sur la décision
     * 
     * @param {string} email Email testé
     * @param {Object} decision Résultat de FilterEngine.shouldSendAR()
     * @param {Object} config Configuration utilisée
     * @returns {string} Explication en français (5-10 lignes)
     */
    generate(email, decision, config) {
        const reason = decision.reason;
        const rule = decision.rule;
        
        // Sélectionner le template selon la raison
        switch (reason) {
            case 'Inclusion forcée (exception)':
                return this._explainInclusion(email, rule);
                
            case 'Exclusion':
                return this._explainExclusion(email, rule, config);
                
            case 'Email interne (non dans INCLUSION)':
                return this._explainInternal(email, config.internalDomain);
                
            case 'Email externe non exclu':
                return this._explainExternalAllowed(email, config);
                
            default:
                return "Cette adresse a été analysée selon vos règles de configuration.";
        }
    }
    
    /**
     * Explication : INCLUSION forcée
     * @private
     */
    _explainInclusion(email, rule) {
        return "Cette adresse <strong>RECEVRA un accusé de réception</strong> car elle est explicitement dans votre liste d'<strong>INCLUSIONS</strong>. " +
               "Les inclusions ont la <strong>priorité ABSOLUE</strong> sur toutes les autres règles (exclusions, domaine interne, patterns automatiques). " +
               "C'est une exception que vous avez volontairement créée pour forcer l'envoi d'un AR à cette adresse, quelles que soient les autres règles configurées. " +
               (rule ? `Règle appliquée : <em>${this._escapeHtml(rule)}</em>.` : "");
    }
    
    /**
     * Explication : EXCLUSION (domaine, adresse ou pattern)
     * @private
     */
    _explainExclusion(email, rule, config) {
        // Déterminer le type d'exclusion
        if (rule && rule.includes('Domaine exclu')) {
            return this._explainExclusionDomain(email, rule);
        } else if (rule && rule.includes('Adresse exclue')) {
            return this._explainExclusionAddress(email, rule);
        } else if (rule && rule.includes('Pattern exclu')) {
            return this._explainExclusionPattern(email, rule);
        }
        
        // Fallback générique
        return "Cette adresse <strong>NE RECEVRA PAS</strong> d'accusé de réception car elle est dans votre liste d'<strong>EXCLUSIONS</strong>. " +
               "Vous avez configuré cette règle pour bloquer systématiquement les AR vers cette adresse. " +
               "Si vous souhaitez quand même envoyer un AR à cette adresse spécifique, vous devez l'ajouter dans la liste INCLUSION qui a la priorité absolue.";
    }
    
    /**
     * Explication : Exclusion par domaine
     * @private
     */
    _explainExclusionDomain(email, rule) {
        // Extraire le domaine du rule
        const match = rule.match(/Domaine exclu: (.+)/);
        const domain = match ? match[1] : 'ce domaine';
        
        return "Cette adresse <strong>NE RECEVRA PAS</strong> d'accusé de réception car son domaine (<code>" + this._escapeHtml(domain) + "</code>) est dans votre liste d'<strong>EXCLUSIONS</strong>. " +
               "Vous avez configuré ce domaine pour bloquer systématiquement tous les AR vers ses adresses. " +
               "Les exclusions de domaine s'appliquent à toutes les adresses email de ce domaine (et ses sous-domaines si vous utilisez le wildcard <code>*.</code>). " +
               "Si vous souhaitez quand même envoyer un AR à cette adresse spécifique, vous devez l'ajouter dans la liste <strong>INCLUSION</strong> qui a la priorité absolue sur les exclusions.";
    }
    
    /**
     * Explication : Exclusion par adresse spécifique
     * @private
     */
    _explainExclusionAddress(email, rule) {
        return "Cette adresse <strong>NE RECEVRA PAS</strong> d'accusé de réception car elle est <strong>explicitement</strong> dans votre liste d'exclusions. " +
               "Vous avez ajouté cette adresse précise pour qu'elle ne reçoive jamais d'AR automatique. " +
               "C'est une exclusion ciblée qui ne concerne que cette adresse spécifique. " +
               "Si vous avez changé d'avis et souhaitez maintenant qu'elle reçoive des AR, vous pouvez soit la retirer de la liste d'exclusions, " +
               "soit l'ajouter dans la liste <strong>INCLUSION</strong> qui annulera l'exclusion (priorité absolue).";
    }
    
    /**
     * Explication : Exclusion par pattern automatique
     * @private
     */
    _explainExclusionPattern(email, rule) {
        // Extraire le pattern du rule
        const match = rule.match(/Pattern exclu: (.+)/);
        const pattern = match ? match[1] : '';
        
        const patternExplanation = this._explainPattern(pattern);
        
        return "Cette adresse <strong>NE RECEVRA PAS</strong> d'accusé de réception car elle correspond au pattern automatique <code>" + this._escapeHtml(pattern) + "</code>. " +
               patternExplanation + " " +
               "Ces patterns sont conçus pour bloquer automatiquement les emails robots et automatiques qui ne nécessitent généralement pas d'accusé de réception. " +
               "Si vous voulez forcer l'envoi d'un AR pour cette adresse malgré le pattern, vous devez l'ajouter dans la liste <strong>INCLUSION</strong> qui a la priorité absolue.";
    }
    
    /**
     * Expliquer un pattern spécifique
     * @private
     */
    _explainPattern(pattern) {
        const explanations = {
            'noreply@*': "Ce pattern bloque toutes les adresses commençant par 'noreply@' (emails 'ne pas répondre' standard).",
            'no-reply@*': "Ce pattern bloque toutes les adresses commençant par 'no-reply@' (variante avec tiret).",
            'postmaster@*': "Ce pattern bloque toutes les adresses 'postmaster@' (administrateurs de serveurs de messagerie).",
            'mailer-daemon@*': "Ce pattern bloque toutes les adresses 'mailer-daemon@' (emails d'erreur automatiques des serveurs)."
        };
        
        return explanations[pattern] || "Ce pattern bloque automatiquement certains types d'emails.";
    }
    
    /**
     * Explication : Email interne (domaine interne)
     * @private
     */
    _explainInternal(email, internalDomain) {
        const domainDisplay = internalDomain;
        
        return "Cette adresse <strong>NE RECEVRA PAS</strong> d'accusé de réception car elle appartient à votre <strong>domaine interne</strong> (<code>" + this._escapeHtml(domainDisplay) + "</code>). " +
               "Par défaut, les emails internes (collègues de votre organisation) ne reçoivent pas d'AR automatique pour éviter les envois inutiles en interne. " +
               "C'est un comportement standard dans les organisations pour réserver les AR uniquement aux contacts externes. " +
               "Si vous souhaitez quand même envoyer un AR à cette adresse interne (par exemple pour des tests ou pour un cas particulier), " +
               "vous devez l'ajouter dans la liste <strong>INCLUSION</strong> qui forcera l'envoi même pour les adresses internes.";
    }
    
    /**
     * Explication : Email externe accepté (cas par défaut)
     * @private
     */
    _explainExternalAllowed(email, config) {
        const hasInternalDomain = config.internalDomain && config.internalDomain.trim() !== '';
        
        let explanation = "Cette adresse <strong>RECEVRA un accusé de réception</strong> car elle est <strong>EXTERNE</strong> ";
        
        if (hasInternalDomain) {
            explanation += "(n'appartient pas à votre domaine interne <code>" + this._escapeHtml(config.internalDomain) + "</code>) ";
        }
        
        explanation += "et n'est dans <strong>AUCUNE</strong> liste d'exclusion. ";
        explanation += "C'est le comportement par défaut de Go2Econtact : tous les emails externes non exclus reçoivent automatiquement un accusé de réception différé. ";
        explanation += "Si vous ne souhaitez pas envoyer d'AR à cette adresse, vous devez l'ajouter dans la liste d'exclusions (soit l'adresse spécifique, soit son domaine complet).";
        
        return explanation;
    }
    
    /**
     * Générer un résumé court (pour notifications, logs, etc.)
     * 
     * @param {Object} decision
     * @returns {string} Résumé court (1 phrase)
     */
    generateShortSummary(decision) {
        if (decision.allowed) {
            switch (decision.reason) {
                case 'Inclusion forcée (exception)':
                    return "AR envoyé (inclusion prioritaire)";
                case 'Email externe non exclu':
                    return "AR envoyé (email externe)";
                default:
                    return "AR envoyé";
            }
        } else {
            switch (decision.reason) {
                case 'Exclusion':
                    return "AR bloqué (exclusion)";
                case 'Email interne (non dans INCLUSION)':
                    return "AR bloqué (domaine interne)";
                default:
                    return "AR bloqué";
            }
        }
    }
    
    /**
     * Échapper HTML pour éviter les injections XSS
     * @private
     */
    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export pour utilisation
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ExplanationGenerator;
}