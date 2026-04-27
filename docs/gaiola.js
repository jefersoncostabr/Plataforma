/**
 * Módulo para gerenciar a entidade "Gaiola com Cão".
 * A gaiola é um objeto estático que o jogador pode colidir para libertar o cão.
 */
(function () {
    let gaiolaObj = null;
    let config = {};

    /**
     * Cria e posiciona a gaiola no cenário.
     * @param {Object} pos - Posição da gaiola (x, y).
     * @param {Object} gameConfig - Configurações do jogo.
     * @returns {Object} O objeto da gaiola criada.
     */
    window.criarGaiola = function (pos, gameConfig) {
        config = gameConfig;

        if (window.isCaoResgatado) {
            return null; // Não cria a gaiola se o cão já foi resgatado
        }

        // Sprite do cão (fundo)
        const elementoCaoFundo = document.createElement('img');
        elementoCaoFundo.src = config.spriteCao || '../../assets/personagem/cao_parado.png';
        elementoCaoFundo.style.position = 'absolute';
        elementoCaoFundo.style.width = '32px';
        elementoCaoFundo.style.height = '32px';
        elementoCaoFundo.style.left = pos.x + 'px';
        elementoCaoFundo.style.bottom = pos.y + 'px';
        elementoCaoFundo.style.zIndex = window.LAYERS.ITENS - 1; // Atrás da gaiola
        elementoCaoFundo.style.imageRendering = 'pixelated';
        window.adicionarAoLayer(elementoCaoFundo, window.LAYERS.ITENS);

        // Sprite da gaiola (frente)
        const elementoGaiola = document.createElement('img');
        elementoGaiola.src = config.spriteGaiola || '../../assets/personagem/gaiola1.png';
        elementoGaiola.style.position = 'absolute';
        elementoGaiola.style.width = '32px';
        elementoGaiola.style.height = '32px';
        elementoGaiola.style.left = pos.x + 'px';
        elementoGaiola.style.bottom = pos.y + 'px';
        elementoGaiola.style.zIndex = window.LAYERS.ITENS; // Z-index superior ao cão
        elementoGaiola.style.imageRendering = 'pixelated';
        window.adicionarAoLayer(elementoGaiola, window.LAYERS.ITENS);

        gaiolaObj = {
            x: pos.x,
            y: pos.y,
            largura: 32,
            altura: 32,
            elementoGaiola: elementoGaiola,
            elementoCao: elementoCaoFundo,
            // Hitbox de colisão conforme especificado: 12x12px, 11º pixel da esquerda, na base
            hitbox: {
                x: pos.x + 11,
                y: pos.y,
                largura: 12,
                altura: 12
            }
        };
        return gaiolaObj;
    };

    /**
     * Atualiza a lógica da gaiola, verificando colisão com o jogador.
     */
    window.atualizarGaiola = function () {
        if (window.isCaoResgatado || !gaiolaObj || !window.playerControle) {
            return; // Gaiola não existe ou cão já resgatado
        }

        const playerHitbox = {
            x: window.playerControle.x + (window.playerControle.offsetX || 0),
            y: window.playerControle.y,
            largura: window.playerControle.largura,
            altura: window.playerControle.altura
        };

        // Detecta colisão com a hitbox específica da gaiola
        if (typeof detectarColisaoHitbox === 'function' && detectarColisaoHitbox(playerHitbox, gaiolaObj.hitbox, 0, 0, 0)) {
            window.libertarCao(gaiolaObj);
        }
    };
})();