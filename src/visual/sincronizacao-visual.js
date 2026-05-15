/**
 * Módulo de Sincronização e Gerenciamento Visual de Equipamentos
 * Centraliza a criação e o posicionamento de acessórios (Itens 1.5 e Média Prioridade).
 */

/**
 * Cria ou atualiza os elementos de imagem dos equipamentos de uma entidade (Jogador ou Inimigo).
 * @param {Object} entidade - Objeto de controle da entidade.
 * @param {HTMLElement} parentElement - O elemento pai onde os acessórios serão injetados.
 * @param {Object} config - Configurações globais do jogo.
 */
window.inicializarVisualEquipamentoEntidade = function(entidade, parentElement, config) {
    if (!entidade || !parentElement) return;

    const mapaEquipamentos = {
        'armaElemento':   { flag: 'temArma',    z: '6', sprite: 'revolver', fallback: '../../assets/personagem/revolver.png', offY: 1 },
        'escudoElemento': { flag: 'temEscudo',  z: '8', sprite: 'escudo',   fallback: '../../assets/personagem/escudo.png', offY: 0 },
        'botaElemento':   { flag: 'temBota',    z: '7', sprite: 'bota',     fallback: '../../assets/personagem/bota_parado.png', offY: 0 },
        'jetpackElemento':{ flag: 'temJetpack', z: '3', sprite: 'jetpack',  fallback: '../../assets/personagem/jetpack.png', offY: 0 },
        'garraElemento':  { flag: 'temGarra',   z: '9', sprite: 'garra',    fallback: '../../assets/personagem/garra.png', offY: 0 },
        'cintoElemento':  { flag: 'temCinto',   z: '6', sprite: 'cinto',    fallback: '../../assets/personagem/cinto.png', offY: -2 },
        'coleteElemento': { flag: 'temColete',  z: '6', sprite: 'colete',   fallback: '../../assets/personagem/colete.png', offY: 0 }
    };

    Object.entries(mapaEquipamentos).forEach(([key, info]) => {
        // Sempre cria o elemento, mas controla sua visibilidade depois
        
        // Se a entidade tem o item mas o elemento ainda não foi criado
        if (!entidade[key]) { // Cria se não existir
            const img = document.createElement('img');
            img.style.position = 'absolute';
            img.style.width = '32px';
            img.style.height = '32px';
            img.style.zIndex = info.z;
            img.style.imageRendering = 'pixelated';
            img.style.pointerEvents = 'none';
            
            // Obtém o sprite usando a função centralizada do item 1.4
            let itemSpriteKey = info.sprite;
            if (key === 'armaElemento' && entidade.heldWeaponType) {
                itemSpriteKey = entidade.heldWeaponType;
            }

            img.src = typeof window.obterSpriteItem === 'function' 
                ? window.obterSpriteItem(itemSpriteKey, config, 'equipado') 
                : info.fallback;

            if (typeof window.adicionarAoLayer === 'function' && window.LAYERS?.INIMIGOS && entidade.isEnemy) {
                window.adicionarAoLayer(img, window.LAYERS.INIMIGOS);
            } else {
                parentElement.appendChild(img);
            }
            entidade[key] = img;
        }

        // Gerencia visibilidade
        if (entidade[key]) {
            const ocultarPeloCinto = !!(entidade.itensGuardadosNoCinto && key !== 'cintoElemento');
            let visivel = !!entidade[info.flag] && !ocultarPeloCinto;

            // Mecânica de seleção seletiva do cinto (Item 1.5 - Toggle E)
            if (visivel && entidade.temCinto && entidade.selecaoCinto && entidade.selecaoCinto !== 'todos') {
                if (key === 'armaElemento' && entidade.selecaoCinto !== 'arma') visivel = false;
                if (key === 'escudoElemento' && entidade.selecaoCinto !== 'escudo') visivel = false;
            }

            entidade[key].style.display = visivel ? 'block' : 'none';
        }
    });

    // Caso especial: Fogo do Jetpack (Sempre criado para evitar erros de undefined no motor de animação)
    if (!entidade.jetFogoElemento) {
        const jetFogo = document.createElement('img');
        jetFogo.src = config.spriteJetFogo || 'assets/personagem/jet.png';
        jetFogo.style.position = 'absolute';
        jetFogo.style.width = '32px';
        jetFogo.style.height = '32px';
        jetFogo.style.zIndex = '3';
        jetFogo.style.imageRendering = 'pixelated';
        jetFogo.style.pointerEvents = 'none';
        jetFogo.style.display = 'none';
        if (typeof window.adicionarAoLayer === 'function' && window.LAYERS?.INIMIGOS && entidade.isEnemy) {
            window.adicionarAoLayer(jetFogo, window.LAYERS.INIMIGOS);
        } else {
            parentElement.appendChild(jetFogo);
        }
        entidade.jetFogoElemento = jetFogo;
    }
};

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

    // Offsets base por tipo de elemento para ajuste fino visual
    const offsetsBase = {
        'armaElemento': { y: 1 },
        'escudoElemento': { y: 0 },
        'cintoElemento': { y: -2 },
        'jetpackElemento': { y: 0 },
        'coleteElemento': { y: 0 }
    };

    Object.entries(elementos).forEach(([chave, el]) => {
        // Proteção extra: garante que o elemento existe e possui a propriedade style
        if (!el || !el.style || el.style.display === 'none') return;
        
        // Se a garra está em animação (esticando/voltando), ela segue sua própria lógica física.
        // Só sincronizamos aqui se a flag forçarSincroniaGarra for passada (ex: durante stun ou morte).
        if (chave === 'garraElemento' && entidade.garraAnimEstado && entidade.garraAnimEstado !== 'idle' && !opcoes.forçarSincroniaGarra) {
            return;
        }

        let posX = x;
        let posY = y;
        let transform = baseTransform;

        // Ajuste horizontal específico para a arma "doze" (shotgun)
        if (chave === 'armaElemento' && el.src.includes('doze')) {
            const direcaoFator = entidade.direcao === 'e' ? -1 : 1;
            posX += (4 * direcaoFator);
        }

        // Aplica ajuste fino de pixel
        const off = offsetsBase[chave];
        if (off) posY += off.y;

        // Aplicação de regras específicas de offset e transform
        if (chave === 'coleteElemento') posY += offsetYAgachado;
        if (chave === 'jetFogoElemento' && opcoes.offsetYFogo !== undefined) posY += opcoes.offsetYFogo;
        
        // Se houver uma string de transform específica (ex: recuo de arma)
        if (chave === 'armaElemento' && opcoes.transformArma) {
            transform = opcoes.transformArma;
        }

        el.style.left = posX + 'px';
        el.style.bottom = posY + 'px';
        el.style.transform = transform;
    });
};

// Mantém compatibilidade com referências legadas
window.sincronizarAcessoriosPortador = window.sincronizarAcessoriosEntidade;