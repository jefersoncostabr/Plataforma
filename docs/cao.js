/**
 * Módulo para gerenciar o comportamento do cão NPC.
 * O cão pode estar em dois estados: preso na gaiola (PRE_RESGATE) ou seguindo o jogador (ATIVO).
 */
(function () {
    // Flag global para controlar se o cão já foi resgatado.
    // Deve ser persistida no sistema de salvamento do jogo.
    window.isCaoResgatado = window.isCaoResgatado ?? false;

    let caoElemento = null;
    let caoControle = null;
    let config = {};

    /**
     * Inicializa o cão no cenário.
     * Se já resgatado, spawna o cão livre. Caso contrário, não faz nada (a gaiola será spawnada).
     * @param {Object} pos - Posição inicial do cão (x, y).
     * @param {Object} gameConfig - Configurações do jogo.
     */
    window.iniciarCao = function (pos, gameConfig) {
        config = gameConfig || window.config || {};

        if (window.isCaoResgatado) {
            if (caoElemento) {
                caoElemento.remove(); // Remove qualquer instância antiga
            }
            caoElemento = document.createElement('img');
            caoElemento.id = 'cao';
            caoElemento.src = config.spriteCao || '../../assets/personagem/cao_parado.png';
            caoElemento.style.position = 'absolute';
            caoElemento.style.width = '32px';
            caoElemento.style.height = '32px';
            caoElemento.style.left = pos.x + 'px';
            caoElemento.style.bottom = pos.y + 'px';
            caoElemento.style.zIndex = '100'; 
            caoElemento.style.imageRendering = 'pixelated';
            window.adicionarAoLayer(caoElemento, window.LAYERS?.INIMIGOS || 'layer-inimigos');

            caoControle = {
                x: pos.x,
                y: pos.y,
                largura: 32,
                altura: 32,
                elemento: caoElemento,
                velocidade: config.velocidadeCao || 2,
                direcao: 'd',
                noChao: false,
                velocidadeY: 0,
                cooldownPulo: 0,
                contadorAnimacao: 0,
                frameAtual: 0,
                spriteParado: config.spriteCao || '../../assets/personagem/cao_parado.png',
                spriteAndando: config.spriteCaoAndando || '../../assets/personagem/cao_mov.png'
            };
            window.cicloVidaCao(); // Inicia o comportamento de seguir
        }
    };

    /**
     * Lógica principal de comportamento do cão (seguir o jogador).
     */
    window.cicloVidaCao = function () {
        if (!window.isCaoResgatado || !caoControle || !window.playerControle) {
            requestAnimationFrame(window.cicloVidaCao);
            return;
        }

        const player = window.playerControle;
        const distanciaX = player.x - caoControle.x;
        const distanciaY = player.y - caoControle.y;
        const distanciaMinima = config.distanciaMinimaCaoSeguir || 48; // Distância para o cão começar a se mover

        let movendoHorizontal = false;

        if (Math.abs(distanciaX) > distanciaMinima) {
            if (distanciaX > 0) {
                caoControle.x += caoControle.velocidade;
                caoControle.direcao = 'd';
            } else {
                caoControle.x -= caoControle.velocidade;
                caoControle.direcao = 'e';
            }
            movendoHorizontal = true;
        }

        // Aplica gravidade ao cão
        if (typeof aplicarFisica === 'function') {
            aplicarFisica(caoControle, {}, config.forcaPuloCao || 8, config.gravidadeCao || 0.6, config.cooldownPuloCao || 30);
        }

        // Colisão vertical simples para o cão (chão)
        caoControle.noChao = false;
        const hitV = typeof verificarColisaoComTiles === 'function' ? verificarColisaoComTiles(caoControle.x, caoControle.y, caoControle.largura, caoControle.altura, window.plataformas) : null;
        if (hitV) {
            caoControle.noChao = true;
            caoControle.velocidadeY = 0;
            caoControle.y = window.aplicarSnapColisaoPadrao(caoControle.y, 0, caoControle.altura, hitV, 'cima');
        }

        caoControle.elemento.style.left = caoControle.x + 'px';
        caoControle.elemento.style.bottom = caoControle.y + 'px';
        caoControle.elemento.style.transform = caoControle.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';

        if (typeof atualizarAnimacao === 'function') {
            atualizarAnimacao(caoControle, caoControle.elemento, caoControle.spriteParado, caoControle.spriteAndando);
        }

        requestAnimationFrame(window.cicloVidaCao);
    };

    /**
     * Função para liberar o cão da gaiola.
     * @param {Object} gaiolaObj - O objeto da gaiola a ser removido.
     */
    window.libertarCao = function (gaiolaObj) {
        if (window.isCaoResgatado) return; // Já resgatado, evita duplicidade

        window.isCaoResgatado = true;
        if (window.AudioManager) {
            window.AudioManager.playSFX('madeiraQuebrando', 0.7); // Assumindo que existe um SFX de madeira quebrando
        }

        if (gaiolaObj && gaiolaObj.elementoGaiola) {
            gaiolaObj.elementoGaiola.remove();
        }
        if (gaiolaObj && gaiolaObj.elementoCao) {
            gaiolaObj.elementoCao.remove(); // Remove o sprite do cão que estava na gaiola
        }

        // Adicionar efeito de partículas de madeira (placeholder)
        if (typeof window.criarEfeitoParticulas === 'function' && gaiolaObj) {
            window.criarEfeitoParticulas(gaiolaObj.x + gaiolaObj.largura / 2, gaiolaObj.y + gaiolaObj.altura / 2, 'madeira');
        }

        // Spawna o cão livre na posição da gaiola
        window.iniciarCao({ x: gaiolaObj.x, y: gaiolaObj.y }, config || window.config);
        console.log("Cão resgatado!");

        // TODO: Adicionar a flag isCaoResgatado ao sistema de salvamento
        // if (typeof window.saveGame === 'function') {
        //     window.saveGame();
        // }
    };
})();