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
                spriteAndando: config.spriteCaoAndando || '../../assets/personagem/cao_mov.png',
                estaSeguindo: true, // Novo: controla se o NPC deve seguir o player
                ultimoToqueQ: 0,    // Novo: para detectar clique duplo
                qPressionadoAnterior: false
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

                // --- LÓGICA DE RETORNO (Double Tap Q) ---
                const apertouQ = teclas['q'] || teclas['Q'];
                if (apertouQ && !caoControle.qPressionadoAnterior) {
                    const agora = Date.now();
                    // Se apertar Q duas vezes em menos de 300ms
                    if (agora - caoControle.ultimoToqueQ < 300) {
                        window.controlandoCao = false;
                        caoControle.estaSeguindo = false; // Fica parado ao voltar pro player
                        teclas['q'] = false;
                        teclas['Q'] = false;
                        window.AudioManager?.playSFX('engrenagem', 0.5);
                    }
                    caoControle.ultimoToqueQ = agora;
                }
                caoControle.qPressionadoAnterior = apertouQ;

            } else {
                // Inteligência de Seguimento (NPC)
                
                // Verifica se o jogador encostou no cão para ele voltar a seguir
                const colidindoComPlayer = typeof window.detectarColisaoHitbox === 'function' && 
                                          window.detectarColisaoHitbox(caoControle, player, 0, 0, 0);
                if (colidindoComPlayer) {
                    caoControle.estaSeguindo = true;
                }

                const distanciaX = player.x - caoControle.x;
                const distanciaMinima = config.distanciaMinimaCaoSeguir || 48;

                if (caoControle.estaSeguindo && Math.abs(distanciaX) > distanciaMinima && !player.estaMorrendo) {
                    const dir = Math.sign(distanciaX);
                    const deslocX = dir * (config.velocidadeCao || 2.5);
                    
                    const paramsColisao = { 
                        maxPasso: 1,
                        largura: caoControle.largura,
                        altura: caoControle.altura,
                        offsetX: caoControle.offsetX
                    };

                    if (typeof window.aplicarDeslocamentoHorizontalComColisaoPadrao === 'function') {
                        window.aplicarDeslocamentoHorizontalComColisaoPadrao(caoControle, deslocX, window.plataformas, paramsColisao);
                    } else {
                        caoControle.x += deslocX;
                    }
                    
                    // --- SALTO DE OBSTRUÇÃO ---
                    // Se o cão estiver no chão e houver um bloco à frente, ele pula para tentar subir
                    if (caoControle.noChao && typeof window.verificarColisaoComTiles === 'function') {
                        const margemCheck = dir > 0 ? (caoControle.offsetX + caoControle.largura + 4) : (caoControle.offsetX - 6);
                        const bloqueioFrente = window.verificarColisaoComTiles(
                            caoControle.x + margemCheck, 
                            caoControle.y + 2, 
                            2, 
                            8, 
                            window.plataformas
                        );
                        
                        if (bloqueioFrente) {
                            caoControle.velocidadeY = config.forcaPuloCao || 8.5;
                            caoControle.noChao = false;
                        }
                    }
                    
                    caoControle.direcao = dir > 0 ? 'd' : 'e';
                    movendoHorizontal = true;
                }

                if (typeof window.aplicarFisica === 'function') {
                    window.aplicarFisica(caoControle, {}, 0, config.gravidadeCao || 0.6, 0);
                }

                // --- SALTO PARA ALCANÇAR O PLAYER ---
                // Se o player estiver acima do cão e próximo horizontalmente, o cão pula para subir
                if (caoControle.estaSeguindo && caoControle.noChao && player.y > (caoControle.y + 32) && Math.abs(distanciaX) < 80) {
                    caoControle.velocidadeY = (config.forcaPuloCao || 8.5) + 0.5;
                    caoControle.noChao = false;
                }
            }

            // --- MECÂNICA DE TRAMPOLIM (Pular na cabeça do Jogador) ---
            // Se o cão estiver caindo e atingir o topo da cabeça do jogador, ele ganha um impulso extra.
            if (caoControle.velocidadeY < 0 && player && !player.estaMorrendo) {
                const hitboxCaoBase = {
                    x: caoControle.x + caoControle.offsetX,
                    y: caoControle.y,
                    largura: caoControle.largura,
                    altura: 6
                };
                const hitboxPlayerTopo = {
                    x: player.x + (player.offsetX || 0),
                    y: player.y + (player.altura || 25) - 4, // Pega os 8px do topo do player
                    largura: player.largura || 20,
                    altura: 8
                };

                if (typeof window.detectarColisaoHitbox === 'function' && 
                    window.detectarColisaoHitbox(hitboxCaoBase, hitboxPlayerTopo, 0, 0, 0)) {
                    caoControle.velocidadeY = config.forcaPuloTrampolim || 12; // Impulso de trampolim
                    caoControle.noChao = false;
                    window.AudioManager?.playSFX('pulo', 0.6); // Feedback sonoro
                }
            }

            // --- COLISÃO VERTICAL REFINADA ---
            caoControle.noChao = false;
            if (typeof window.verificarColisaoComTiles === 'function') {
                // Lógica para queda/parado (Verifica apenas a base para suporte de chão)
                if (caoControle.velocidadeY <= 0) {
                    const hitSolo = window.verificarColisaoComTiles(
                        caoControle.x + caoControle.offsetX, 
                        caoControle.y, 
                        caoControle.largura, 
                        6, // Checa apenas os 6px de baixo
                        window.plataformas
                    );
                    if (hitSolo) {
                        caoControle.noChao = true;
                        caoControle.y = window.aplicarSnapColisaoPadrao(caoControle.y, 0, caoControle.altura, hitSolo, 'cima');
                        caoControle.velocidadeY = 0;
                    }
                } 
                // Lógica para subida (Verifica apenas o topo para evitar snap falso no chão)
                else if (caoControle.velocidadeY > 0) {
                    const hitTeto = window.verificarColisaoComTiles(
                        caoControle.x + caoControle.offsetX, 
                        caoControle.y + 6, // Começa do meio da hitbox para cima
                        caoControle.largura, 
                        6, // Checa os 6px de cima
                        window.plataformas
                    );
                    if (hitTeto) {
                        caoControle.y = window.aplicarSnapColisaoPadrao(caoControle.y, 0, caoControle.altura, hitTeto, 'baixo');
                        caoControle.velocidadeY = 0;
                    }
                }
            }

            // Segurança: Teleporte se o cão cair no buraco ou sumir do mapa
            if (caoControle.y < -128 || (Math.abs(player.x - caoControle.x) > 800)) {
                caoControle.x = player.x;
                caoControle.y = player.y + 10;
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