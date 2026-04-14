/**
 * Gerencia a criação e o estado dos itens coletáveis no jogo.
 */

// Array global para armazenar todos os itens coletáveis ativos no palco.
// É importante que este array seja acessível globalmente para o loop de atualização do jogo.
window.itensColetaveis = [];
window.itemDefinitions = {};

/**
 * Carrega as definições de todos os itens a partir dos arquivos JSON.
 */
window.carregarItemDefinitions = async function() {
    const tipos = ["revolver", "escudo", "bota", "jetpack", "garra", "cinto"];
    for (const tipo of tipos) {
        try {
            // Tenta carregar o JSON. O caminho assume que o jogo roda da raiz.
            const resp = await fetch(`config/items/${tipo}.json`);
            if (resp.ok) {
                const data = await resp.json();
                window.itemDefinitions[data.id] = data;
            }
        } catch (e) { console.error(`Erro ao carregar item ${tipo}:`, e); }
    }
};

/**
 * Cria um elemento visual para um item coletável e o adiciona ao palco do jogo.
 *
 * @param {object} itemData - Objeto contendo os dados do item (id, nome, spriteColetavel, efeitos, etc.).
 * @param {number} x - Posição X (em pixels) onde o item será criado.
 * @param {number} y - Posição Y (em pixels) onde o item será criado.
 * @returns {object} O objeto do item criado, incluindo seu elemento HTML.
 */
window.criarItemColetavel = function(itemData, x, y) {
    const itemImg = document.createElement('img');
    itemImg.src = itemData.spriteColetavel;
    itemImg.style.position = 'absolute';
    itemImg.style.width = '32px'; // Assumindo tamanho padrão de tile
    itemImg.style.height = '32px'; // Assumindo tamanho padrão de tile
    itemImg.style.left = x + 'px';
    itemImg.style.bottom = y + 'px';
    itemImg.style.zIndex = String(itemData.zIndex ?? 5); // Z-index padrão, pode ser sobrescrito
    itemImg.style.imageRendering = 'pixelated';
    itemImg.style.pointerEvents = 'none'; // Itens não devem bloquear eventos do mouse

    // Adiciona ao layer de itens, se disponível, ou diretamente ao body/game-stage
    if (window.LAYERS && window.LAYERS.ITENS && typeof adicionarAoLayer === 'function') {
        adicionarAoLayer(itemImg, window.LAYERS.ITENS);
    } else {
        // Fallback se o sistema de layers não estiver pronto ou não for usado
        const gameStage = document.getElementById('game-stage');
        if (gameStage) {
            gameStage.appendChild(itemImg);
        } else {
            document.body.appendChild(itemImg);
        }
    }

    // Retorna o objeto do item para ser adicionado a window.itensColetaveis
    return {
        id: itemData.id,
        tipo: itemData.id,
        nome: itemData.nome,
        x: x,
        y: y,
        elemento: itemImg,
        velocidadeY: 0, // Inicia sem velocidade vertical, gravidade será aplicada
        // Outras propriedades do item podem ser adicionadas aqui, se necessário
    };
};

/**
 * Limpa todos os itens coletáveis existentes no palco e cria novos baseados nos dados da fase.
 *
 * @param {Array<object>} itensFase - Um array de objetos de item, cada um com 'tipo' e 'pos'.
 */
window.resetarItens = function(itensFase) {
    console.log("Resetando itens. Itens na fase:", itensFase);
    // Remove todos os elementos visuais dos itens antigos
    window.itensColetaveis.forEach(item => {
        if (item.elemento && item.elemento.parentNode) {
            item.elemento.parentNode.removeChild(item.elemento);
        }
    });
    window.itensColetaveis = []; // Limpa o array de itens

    // Cria novos itens baseados nos dados da fase
    itensFase.forEach(itemDataFase => {
        const itemDef = window.itemDefinitions[itemDataFase.tipo];
        if (itemDef) {
            const posPixels = window.gridParaPixels(itemDataFase.pos);
            const novoItem = window.criarItemColetavel(itemDef, posPixels.x, posPixels.y);
            window.itensColetaveis.push(novoItem);
        } else {
            console.warn(`Definição de item não encontrada para o tipo: ${itemDataFase.tipo}. Item não será criado.`);
        }
    });
};