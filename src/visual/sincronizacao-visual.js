/**
 * Centraliza a sincronização de posição e transform de acessórios em relação ao corpo da entidade.
 * Resolve a duplicação apontada no item 1.5 da auditoria.
 */
window.sincronizarAcessoriosEntidade = function(entidade, elementos, opcoes = {}) {
    if (!entidade || !elementos) return;

    // Prioriza coordenadas passadas por opção (ex: quando sendo carregado pela garra) ou as da entidade
    const x = opcoes.x !== undefined ? opcoes.x : entidade.x;
    const y = opcoes.y !== undefined ? opcoes.y : entidade.y;

    // Usa o transform do elemento base ou reconstrói a partir da direção
    const baseTransform = opcoes.transform || entidade.elemento?.style.transform || (entidade.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)');
    
    // Offset global de agachamento (padrão -6px para o colete e acessórios de tronco)
    const agachadoVisualAtivo = !!(entidade.estaAgachado && entidade.noChao);
    const offsetYAgachado = agachadoVisualAtivo ? (opcoes.offsetAgachado ?? -6) : 0;

    Object.entries(elementos).forEach(([chave, el]) => {
        if (!el || el.style.display === 'none') return;
        
        // Se a garra está em animação (esticando/voltando), ela segue sua própria lógica física.
        // Só sincronizamos aqui se a flag forçarSincroniaGarra for passada (ex: durante stun ou morte).
        if (chave === 'garraElemento' && entidade.garraAnimEstado && entidade.garraAnimEstado !== 'idle' && !opcoes.forçarSincroniaGarra) {
            return;
        }

        let posY = y;
        let transform = baseTransform;

        // Aplicação de regras específicas de offset e transform
        if (chave === 'coleteElemento') posY += offsetYAgachado;
        if (chave === 'jetFogoElemento' && opcoes.offsetYFogo !== undefined) posY += opcoes.offsetYFogo;
        
        // Se houver uma string de transform específica (ex: recuo de arma)
        if (chave === 'armaElemento' && opcoes.transformArma) {
            transform = opcoes.transformArma;
        }

        el.style.left = x + 'px';
        el.style.bottom = posY + 'px';
        el.style.transform = transform;
    });
};

// Mantém compatibilidade com referências legadas
window.sincronizarAcessoriosPortador = window.sincronizarAcessoriosEntidade;