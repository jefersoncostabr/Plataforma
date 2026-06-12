/**
 * TESTE ISOLADO: Mecânica de Níveis e Custos de Skills
 * Objetivo: Validar se a hierarquia gera os custos corretos (1 + nível).
 */
(function() {
    window.executarTesteSkills = function() {
        console.log("%c--- DIAGNÓSTICO DE SKILLS (NÍVEIS E CUSTOS) ---", "color: #00ff00; font-weight: bold;");
        
        if (!window.skillsData) {
            console.warn("Aviso: Dados de skills não carregados no window.skillsData.");
            return;
        }

        const diagnostico = Object.keys(window.skillsData).map(id => {
            const nivel = window.getSkillDepth ? window.getSkillDepth(id, window.skillsData) : 0;
            const custoCalculado = 1 + nivel;
            const pai = window.skillsData[id].parent || "RAIZ (Nível 0)";
            return { "Habilidade": id, "Nível": nivel, "Custo Esperado": `${custoCalculado} SP`, "Dependência": pai };
        });

        console.table(diagnostico);
        console.log("%cPara excluir este teste, remova o arquivo 'teste-niveis-skills.js'.", "color: #888; font-style: italic;");
    };
})();