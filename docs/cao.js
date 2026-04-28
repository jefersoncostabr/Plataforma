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
    let loopIniciado = false;
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
                largura: 12, // Hitbox precisa de 12x12
                altura: 12,
                offsetX: 11, // Iniciando no 11º pixel horizontal (centralizado na base)
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

            // Registro global para sincronia com movimento.js e câmera
            window.caoEntidade = caoControle;

            if (!loopIniciado) {
                loopIniciado = true;
                window.cicloVidaCao(); 
            }
        }
    };

    /**
     * Lógica principal de comportamento do cão (seguir o jogador).
     */
    window.cicloVidaCao = function () {
        if (!caoControle || !window.playerControle) {
            requestAnimationFrame(window.cicloVidaCao);
            return;
        }

        const player = window.playerControle;
        let movendoHorizontal = false;

        if (!window.isPaused) {
            if (window.controlandoCao) {
                const teclas = player.teclas || {};
                let deslocX = 0;

                // --- COMANDOS DE MOVIMENTO MANUAL ---
                if (teclas['a'] || teclas['A'] || teclas['ArrowLeft']) {
                    deslocX = -(config.velocidadeCao || 3);
                    caoControle.direcao = 'e';
                    movendoHorizontal = true;
                } else if (teclas['d'] || teclas['D'] || teclas['ArrowRight']) {
                    deslocX = (config.velocidadeCao || 3);
                    caoControle.direcao = 'd';
                    movendoHorizontal = true;
                }

                if (deslocX !== 0) {
                    // Aplica deslocamento com colisão
                    if (typeof window.aplicarDeslocamentoHorizontalComColisaoPadrao === 'function') {
                        window.aplicarDeslocamentoHorizontalComColisaoPadrao(caoControle, deslocX, window.plataformas, { 
                            maxPasso: 1,
                            largura: caoControle.largura,
                            altura: caoControle.altura,
                            offsetX: caoControle.offsetX
                        });
                    } else {
                        caoControle.x += deslocX;
                    }
                }

                // --- COMANDO DE PULO ---
                if (typeof window.aplicarFisica === 'function') {
                    // Mapeia Espaço, W ou Seta Cima para o pulo do cão
                    const mockTeclas = { ' ': !!(teclas[' '] || teclas['w'] || teclas['W'] || teclas['ArrowUp']) };
                    window.aplicarFisica(caoControle, mockTeclas, 8.5, config.gravidadeCao || 0.6, 0);
                    if (caoControle.velocidadeY > 0) caoControle.noChao = false;
                }

                // Lógica de retorno (Baixo + Q)
                const segurandoBaixo = teclas['s'] || teclas['S'] || teclas['ArrowDown'];
                const apertandoQ = teclas['q'] || teclas['Q'];
                if (segurandoBaixo && apertandoQ) {
                    const colidindo = typeof window.detectarColisaoHitbox === 'function' && 
                                     window.detectarColisaoHitbox(caoControle, player, -10, -10, -10);
                    if (colidindo) {
                        window.controlandoCao = false;
                        teclas['q'] = false;
                    }
                }
            } else {
                // Inteligência de Seguimento (NPC)
                const distanciaX = player.x - caoControle.x;
                const distanciaMinima = config.distanciaMinimaCaoSeguir || 48;

                if (Math.abs(distanciaX) > distanciaMinima && !player.estaMorrendo && !window.isPaused) {
                    const dir = Math.sign(distanciaX);
                    const deslocX = dir * (config.velocidadeCao || 2.5);
                    
                    if (typeof window.aplicarDeslocamentoHorizontalComColisaoPadrao === 'function') {
                        window.aplicarDeslocamentoHorizontalComColisaoPadrao(caoControle, deslocX, window.plataformas, { 
                            maxPasso: 1,
                            largura: caoControle.largura,
                            altura: caoControle.altura,
                            offsetX: caoControle.offsetX
                        });
                    } else {
                        caoControle.x += deslocX;
                    }
                    
                    caoControle.direcao = dir > 0 ? 'd' : 'e';
                    movendoHorizontal = true;
                }

                if (typeof window.aplicarFisica === 'function') {
                    window.aplicarFisica(caoControle, {}, 0, config.gravidadeCao || 0.6, 0);
                }
            }

            // Colisão Vertical (Solo)
            caoControle.noChao = false;
            const hitV = typeof window.verificarColisaoComTiles === 'function' ? 
                            window.verificarColisaoComTiles(caoControle.x + caoControle.offsetX, caoControle.y, caoControle.largura, caoControle.altura, window.plataformas) : null;
            if (hitV) {
                if (caoControle.velocidadeY < 0) {
                    caoControle.noChao = true;
                    caoControle.y = window.aplicarSnapColisaoPadrao(caoControle.y, 0, caoControle.altura, hitV, 'cima');
                } else if (caoControle.velocidadeY > 0) {
                    caoControle.y = window.aplicarSnapColisaoPadrao(caoControle.y, 0, caoControle.altura, hitV, 'baixo');
                }
                caoControle.velocidadeY = 0;
            }
        }

        // Sincronização Visual
        caoControle.movendoHorizontal = movendoHorizontal;
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

        // TODO: Adicionar a flag isCaoResgatado ao sistema de salvamento
        // if (typeof window.saveGame === 'function') {
        //     window.saveGame();
        // }
    };
})();