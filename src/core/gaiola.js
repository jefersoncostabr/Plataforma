/**
 * Módulo para gerenciar a entidade "Gaiola com Cão".
 * A gaiola é um objeto estático que o jogador pode colidir para libertar o cão.
 */
(function () {
    let gaiolasAtivas = [];
    let config = {};

    /**
     * Cria e posiciona a gaiola no cenário.
     * @param {Object} pos - Posição da gaiola (x, y).
     * @param {Object} gameConfig - Configurações do jogo.
     * @param {string} tipo - Tipo de pet ('cao' ou 'gato').
     * @returns {Object} O objeto da gaiola criada.
     */
    window.criarGaiola = function (pos, gameConfig, tipo = 'cao') {
        config = gameConfig;

        const resgatado = tipo === 'cao' ? window.isCaoResgatado : window.isGatoResgatado;
        if (resgatado) {
            return null; // Não cria a gaiola se o pet já foi resgatado
        }

        // Sprite do pet (fundo)
        const elementoPetFundo = document.createElement('img');
        const spritePet = tipo === 'cao' 
            ? (config.spriteCao || '../../assets/personagem/cao_parado.png')
            : (config.spriteGato || '../../assets/personagem/gato_parado.png');
            
        elementoPetFundo.src = spritePet;
        elementoPetFundo.style.position = 'absolute';
        elementoPetFundo.style.width = '32px';
        elementoPetFundo.style.height = '32px';
        elementoPetFundo.style.left = pos.x + 'px';
        elementoPetFundo.style.bottom = pos.y + 'px';
        elementoPetFundo.style.zIndex = window.LAYERS.ITENS - 1; // Atrás da gaiola
        elementoPetFundo.style.imageRendering = 'pixelated';
        window.adicionarAoLayer(elementoPetFundo, window.LAYERS.ITENS);

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

        const gaiolaObj = {
            x: pos.x,
            y: pos.y,
            tipo: tipo,
            largura: 32,
            altura: 32,
            elementoGaiola: elementoGaiola,
            elementoPet: elementoPetFundo,
            // Hitbox de colisão conforme especificado: 12x12px, 11º pixel da esquerda, na base
            hitbox: {
                x: pos.x + 11,
                y: pos.y,
                largura: 12,
                altura: 12
            }
        };
        gaiolasAtivas.push(gaiolaObj);
        return gaiolaObj;
    };

    window.limparGaiolas = () => { 
        gaiolasAtivas.forEach(g => {
            if (g.elementoGaiola) g.elementoGaiola.remove();
            if (g.elementoPet) g.elementoPet.remove();
        });
        gaiolasAtivas = []; 
    };

    /**
     * Atualiza a lógica da gaiola, verificando colisão com o jogador.
     */
    window.atualizarGaiola = function () {
        if (!window.playerControle || gaiolasAtivas.length === 0) return;

        const playerHitbox = {
            x: window.playerControle.x + (window.playerControle.offsetX || 0),
            y: window.playerControle.y,
            largura: window.playerControle.largura,
            altura: window.playerControle.altura
        };

        for (let i = gaiolasAtivas.length - 1; i >= 0; i--) {
            const g = gaiolasAtivas[i];
            const resgatado = g.tipo === 'cao' ? window.isCaoResgatado : window.isGatoResgatado;
            
            if (!resgatado && typeof detectarColisaoHitbox === 'function') {
                const colidiu = detectarColisaoHitbox(playerHitbox, g.hitbox, 0, 0, 0);
                
                if (colidiu) {
                    console.log(`[GAIOLA] Colisão detectada! Libertando: ${g.tipo}`);
                if (typeof window.libertarPet === 'function') {
                    window.libertarPet(g.tipo, g);
                    gaiolasAtivas.splice(i, 1);
                }
            }
            }
        }
    };
})();