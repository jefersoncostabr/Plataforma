/**
 * Sistema de Layers para Gerenciamento de Profundidade Visual
 * 
 * Organiza elementos do jogo em camadas para melhor controle visual
 * e performance. Cada camada tem um z-index específico.
 */

// Definição centralizadas dos layers
window.LAYERS = {
    FUNDO: 'layer-fundo',           // Céu, background
    PLATAFORMAS: 'layer-plataformas', // Plataformas do cenário
    DECORACOES: 'layer-decoracoes',   // Elementos decorativos
    INIMIGOS: 'layer-inimigos',       // Inimigos
    JOGADOR: 'layer-jogador',         // Jogador
    ITENS: 'layer-itens',             // Itens coletáveis
    PROJETEIS: 'layer-projeteis',     // Projéteis
    EFEITOS: 'layer-efeitos',         // Efeitos visuais, partículas
    UI: 'layer-ui'                    // UI no palco (objetivo, HUD)
};

/**
 * Obtém o elemento da camada especificada
 * @param {string} layerId - ID do layer (ex: window.LAYERS.PLATAFORMAS)
 * @returns {HTMLElement|null} Elemento da camada ou null
 */
function obterLayer(layerId) {
    return document.getElementById(layerId);
}

/**
 * Adiciona um elemento a uma camada específica
 * @param {HTMLElement} elemento - Elemento a adicionar
 * @param {string} layerId - ID do layer
 */
function adicionarAoLayer(elemento, layerId) {
    const layer = obterLayer(layerId);
    if (layer) {
        layer.appendChild(elemento);
    } else {
        console.warn(`[LAYERS] Layer ${layerId} não encontrado`);
    }
}

/**
 * Remove um elemento de qualquer layer
 * @param {HTMLElement} elemento - Elemento a remover
 */
function removerDoLayer(elemento) {
    if (elemento && elemento.parentNode) {
        elemento.parentNode.removeChild(elemento);
    }
}

/**
 * Limpa todos os elementos de uma camada específica
 * @param {string} layerId - ID do layer
 * @param {string[]} exceptIds - IDs de elementos a manter (opcional)
 */
function limparLayer(layerId, exceptIds = []) {
    const layer = obterLayer(layerId);
    if (!layer) return;

    const filhos = Array.from(layer.children);
    filhos.forEach(filho => {
        if (!exceptIds.includes(filho.id)) {
            filho.remove();
        }
    });
}

/**
 * Limpa TODOS os layers exceto aqueles especificados
 * Mantém sempre o jogador (#player)
 * @param {string[]} layersParaManter - IDs de layers a preservar
 */
function limparTodosLayers(layersParaManter = [window.LAYERS.JOGADOR]) {
    Object.values(window.LAYERS).forEach(layerId => {
        if (!layersParaManter.includes(layerId)) {
            limparLayer(layerId);
        }
    });

    // Garante que o jogador não é removido
    const player = document.getElementById('player');
    if (player && !player.parentNode.classList.contains('game-layer')) {
        const layerJogador = obterLayer(window.LAYERS.JOGADOR);
        if (layerJogador) {
            layerJogador.appendChild(player);
        }
    }
}

/**
 * Obtém referência rápida a todos os layers
 * Útil para depuração
 */
function obterTodosLayers() {
    const layers = {};
    Object.entries(window.LAYERS).forEach(([nome, id]) => {
        layers[nome] = {
            id: id,
            elemento: obterLayer(id),
            filhos: obterLayer(id)?.children.length || 0
        };
    });
    return layers;
}

/**
 * Log de debug dos layers
 */
function debugLayers() {
    console.log('[LAYERS DEBUG]');
    obterTodosLayers && Object.entries(obterTodosLayers()).forEach(([nome, info]) => {
        console.log(`  ${nome}: ${info.filhos} elementos`);
    });
}
