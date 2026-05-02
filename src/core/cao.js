(function () {
    window.isCaoResgatado = typeof window.isCaoResgatado !== 'undefined' ? window.isCaoResgatado : false;

    // Caminhos padronizados para os assets
    let cao = null;
    let idLoopAtual = 0;
    let config = {}; // Variável para armazenar as configurações do jogo

    /**
     * Inicializa ou reposiciona o cachorro NPC próximo ao jogador.
     */
    window.inicializarCaoNPC = function (x, y, gameConfig) {
        const palco = document.getElementById('game-stage') || document.getElementById('jogo-container');
        if (!palco) return;

        // Cancela loops anteriores para evitar que a física duplique (causando quedas através do chão)
        idLoopAtual++;
        const meuId = idLoopAtual;
        window.idCaoAtivo = meuId;

        config = gameConfig || window.config || {}; // Armazena as configurações

        // Remove instância anterior se houver (evita duplicidade em trocas de fase)
        if (cao && cao.elemento) cao.elemento.remove();

        const img = document.createElement('img');
        img.src = config.spriteCao || '../../assets/personagem/cao_parado.png';
        img.id = 'cao-aliado'; // ID fixo para busca direta via getElementById
        img.className = 'npc-cao';
        // Z-index 100 para garantir que ele fique sempre visível sobre o cenário
        img.style.cssText = `position: absolute; width: 32px; height: 32px; image-rendering: pixelated; z-index: 100; pointer-events: none;`;
        img.style.left = x + 'px';
        img.style.bottom = y + 'px';
        
        if (window.LAYERS && window.LAYERS.INIMIGOS) {
            window.adicionarAoLayer(img, window.LAYERS.INIMIGOS);
        } else {
            palco.appendChild(img);
        }

        cao = {
            elemento: img,
            x: x,
            y: y,
            largura: 20,
            altura: 20,
            offsetX: 5,
            velocidadeY: 0,
            noChao: false,
            movendoHorizontal: false,
            direcao: 'd',
            contadorAnimacao: 0,
            frameAtual: 0,
            idAtivo: meuId,
            mordendo: false,
            kPressionadoAnterior: false,
            spriteParado: config.spriteCao || '../../assets/personagem/cao_parado.png',
            spriteAndando: config.spriteCaoAndando || '../../assets/personagem/cao_mov.png',
            estaSeguindo: true,    // Novo: controla se o NPC deve seguir o player
            ultimoToqueQ: 0,       // Restaurado para Double Tap
            qPressionadoAnterior: false, // Restaurado para Double Tap
            inimigoPreso: null,    // NOVO: Referência ao inimigo segurado
            latidoPressionadoAnterior: false // NOVO: Controle discreto para detecção de clique do latido
        };
        // REGISTRO GLOBAL: Essencial para o movimento.js encontrar o cachorro
        window.caoEntidade = cao;
        
        // Sempre inicia um novo ciclo de vida para o cachorro com o novo ID único.
        // Isso garante que o loop seja reiniciado corretamente em transições de fase.
        requestAnimationFrame(() => cicloVidaCao(meuId));
    };
    // Cria o alias para a função que o inicial.js está chamando
    window.iniciarCao = (pos, gameConfig) => window.inicializarCaoNPC(pos.x, pos.y, gameConfig);

    function cicloVidaCao(idControle) {
        // Se o cachorro foi reinicializado, este loop antigo deve morrer
        if (window.idCaoAtivo !== idControle) {
            return;
        }

        // AUTO-CONEXÃO: Se o objeto local sumiu mas o global existe (recuperado pelo DOM), sincroniza
        if (!cao && window.caoEntidade) {
            cao = window.caoEntidade;
            cao.idAtivo = idControle;
        }

        const player = window.playerControle;
        
        // 1. Processamento de Lógica e Física (Apenas se o jogo NÃO estiver pausado)
        if (!window.isPaused && cao) {

            if (window.controlandoCao) {
                const teclas = window.playerControle?.teclas || {};

                cao.movendoHorizontal = false;
                let deslocX = 0;

                // Controle manual do cachorro
                if (teclas['a'] || teclas['A'] || teclas['ArrowLeft']) {
                    deslocX = -(config.velocidadeCao || 3);
                    cao.direcao = 'e';
                    cao.movendoHorizontal = true;
                } else if (teclas['d'] || teclas['D'] || teclas['ArrowRight']) {
                    deslocX = (config.velocidadeCao || 3);
                    cao.direcao = 'd';
                    cao.movendoHorizontal = true;
                }

                if (deslocX !== 0) {
                    window.aplicarDeslocamentoHorizontalComColisaoPadrao(cao, deslocX, window.plataformas, {
                        maxPasso: 1,
                        cancelarKnockbackAoColidir: true
                    });
                }

                if (typeof window.aplicarFisica === 'function') {
                    // Mapeia Espaço, W ou Seta Cima para o pulo do cão
                    const mockTeclas = { ' ': !!(teclas[' '] || teclas['w'] || teclas['W'] || teclas['ArrowUp']) };
                    window.aplicarFisica(cao, mockTeclas, config.forcaPuloCaoManual || config.forcaPuloCaoObstaculo || 8.5, config.gravidadeCao || config.inimigoGravidade || 0.6, 0);
                    if (cao.velocidadeY > 0) cao.noChao = false;
                }

                // Lógica de mordida: Enquanto 'k', 'v' ou 'x' estiverem pressionados
                const kPressionado = teclas['k'] || teclas['K'] || teclas['KeyK'];
                const vPressionado = teclas['v'] || teclas['V'] || teclas['KeyV'];
                const xPressionado = teclas['x'] || teclas['X'] || teclas['KeyX'];
                
                const latidoAtivo = !!(kPressionado || vPressionado || xPressionado);

                // --- LÓGICA DE AGARRAR/SOLTAR INIMIGO (Bark interaction) ---
                if (latidoAtivo && !cao.latidoPressionadoAnterior) {
                    if (cao.inimigoPreso) {
                        // Solta o inimigo
                        cao.inimigoPreso.stunTimer = 60; // Mantém stun por 1s ao soltar
                        cao.inimigoPreso = null;
                        window.AudioManager?.playSFX('pulo', 0.5);
                    } else {
                        // Tenta agarrar um inimigo próximo
                        if (window.inimigos && typeof window.detectarColisaoHitbox === 'function') {
                            for (let inimigo of window.inimigos) {
                                if (inimigo.estaMorto || inimigo.estaMorrendo || inimigo.tipo === window.GAME_CONSTANTS.INIMIGO_FENO_ID) continue;
                                
                                // Detecção com margem negativa (-10px) para EXPANDIR a área e facilitar a captura
                                if (window.detectarColisaoHitbox(cao, inimigo, -10, -10, -10)) {
                                    cao.inimigoPreso = inimigo;
                                    inimigo.stunned = true;
                                    inimigo.stunTimer = 100;
                                    window.AudioManager?.playSFX('madeiraQuebrando', 0.6);
                                    break;
                                }
                            }
                        }
                    }
                }
                cao.latidoPressionadoAnterior = latidoAtivo;

                const apertandoChute = latidoAtivo || !!(
                    (window.teclasPressionadas && (window.teclasPressionadas['k'] || window.teclasPressionadas['K'])) ||
                    (window.playerControle?.acoesDiscretas?.chute)
                );

                cao.mordendo = apertandoChute || !!cao.inimigoPreso;

                // --- LÓGICA DE RETORNO (Double Tap Q) ---
                const apertouQ = !!(teclas['q'] || teclas['Q'] || teclas['KeyQ']);
                if (apertouQ && !cao.qPressionadoAnterior) {
                    const agora = Date.now();
                    if (agora - (cao.ultimoToqueQ || 0) < 300) {
                        window.controlandoCao = false;
                        cao.estaSeguindo = false; // Fica parado ao voltar pro player até que o player o toque
                        
                        // CONSUMIR ENTRADA: Limpa o estado do Q para evitar que o movimento.js
                        // detecte a tecla e retome o controle do cão imediatamente.
                        teclas['q'] = false;
                        teclas['Q'] = false;
                        if (teclas['KeyQ']) teclas['KeyQ'] = false;

                        window.AudioManager?.playSFX('engrenagem', 0.5);
                    }
                    cao.ultimoToqueQ = agora;
                }
                cao.qPressionadoAnterior = apertouQ;

            } else {
            cao.mordendo = !!cao.inimigoPreso; // Mantém o visual de segurando mesmo em modo NPC

            // Re-ativa o seguimento se o player encostar (Melhoria vinda do docs/cao.js)
            const colidindoComPlayer = typeof window.detectarColisaoHitbox === 'function' && 
                                      window.detectarColisaoHitbox(cao, player, 0, 0, 0);
            if (colidindoComPlayer) cao.estaSeguindo = true;

            const deltaX = player ? (player.x - cao.x) : 0;
            const distSeguir = config.distanciaMinimaCaoSeguir || 45;
            cao.movendoHorizontal = false;

            // Inteligência de Seguimento e Movimento Horizontal com Colisão
            if (cao.estaSeguindo && player && !player.estaMorrendo && Math.abs(deltaX) > distSeguir) {
                const direcaoX = Math.sign(deltaX);
                const deslocX = direcaoX * (config.velocidadeCao || 3);
                
                // Usa o sistema global de movimento para evitar atravessar paredes
                window.aplicarDeslocamentoHorizontalComColisaoPadrao(cao, deslocX, window.plataformas, {
                    maxPasso: 1,
                    cancelarKnockbackAoColidir: true
                });

                cao.direcao = direcaoX > 0 ? 'd' : 'e';
                cao.movendoHorizontal = true;

                // Salto de Obstrução (Se bater em algo e estiver no chão, tenta pular)
                const margemCheck = direcaoX > 0 ? 25 : -5;
                const bloqueioFrente = window.verificarColisaoComTiles(cao.x + margemCheck, cao.y + 5, 5, 5, window.plataformas);
                if (bloqueioFrente && cao.noChao) cao.velocidadeY = config.forcaPuloCaoObstaculo || 8.5;
            }

            // Salta se o jogador estiver acima (em plataformas altas)
            const alcancePuloY = config.caoAlcancePuloY || 32;
            if (cao.estaSeguindo && player && cao.noChao && player.y > cao.y + alcancePuloY && Math.abs(deltaX) < (config.caoAlcancePuloX || 80)) {
                cao.velocidadeY = config.forcaPuloCaoPlayerAcima || 9.0;
            }
            // Segurança: Teleporte se estiver muito longe ou caiu em buraco
            const distMax = config.distanciaMaxTeleporteCao || 600;
            if (cao.y < -128 || (player && Math.abs(player.x - cao.x) > distMax)) {
                if (player && player.noChao) {
                    cao.x = player.x - (player.direcao === 'd' ? 32 : -32);
                    cao.y = player.y;
                    cao.velocidadeY = 0;
                }
            }
            }

            // --- MECÂNICA DE TRAMPOLIM (Pular na cabeça do Jogador) ---
            // Movido para fora para funcionar em ambos os modos (Controle e NPC)
            if (cao.velocidadeY < 0 && player && !player.estaMorrendo) {
                const hitboxCaoBase = {
                    x: cao.x + cao.offsetX,
                    y: cao.y,
                    largura: cao.largura,
                    altura: 6
                };
                const hitboxPlayerTopo = {
                    x: player.x + (player.offsetX || 0),
                    y: player.y + (player.altura || 25) - 4, // Pega o topo do player
                    largura: player.largura || 20,
                    altura: 8
                };

                const colidiuTrampolim = typeof window.detectarColisaoHitbox === 'function' &&
                                         window.detectarColisaoHitbox(hitboxCaoBase, hitboxPlayerTopo, 0, 0, 0);

                if (colidiuTrampolim) {
                    cao.velocidadeY = config.forcaPuloCaoTrampolim || 12; 
                    cao.noChao = false;
                    window.AudioManager?.playSFX('pulo', 0.6);
                }
            }

            // Gravidade e Física Vertical (Sempre ativa)
            if (typeof window.aplicarFisica === 'function') {
                window.aplicarFisica(cao, {}, 0, config.gravidadeCao || config.inimigoGravidade || 0.6, 0);
            }

            // 4. Colisão Vertical REFINADA (Melhoria vinda do docs/cao.js)
            cao.noChao = false;
            if (typeof window.verificarColisaoComTiles === 'function') {
                if (cao.velocidadeY <= 0) {
                    const hitSolo = window.verificarColisaoComTiles(
                        cao.x + cao.offsetX, 
                        cao.y, 
                        cao.largura, 
                        6, // Checa apenas os 6px de baixo para maior estabilidade
                        window.plataformas
                    );
                    if (hitSolo) {
                        cao.noChao = true;
                        cao.y = window.aplicarSnapColisaoPadrao(cao.y, 0, cao.altura, hitSolo, 'cima');
                        cao.velocidadeY = 0;
                    }
                } else if (cao.velocidadeY > 0) {
                    const hitTeto = window.verificarColisaoComTiles(
                        cao.x + cao.offsetX, 
                        cao.y + 6, // Começa do meio da hitbox para cima
                        cao.largura, 
                        6, // Checa os 6px de cima
                        window.plataformas
                    );
                    if (hitTeto) {
                        cao.y = window.aplicarSnapColisaoPadrao(cao.y, 0, cao.altura, hitTeto, 'baixo');
                        cao.velocidadeY = 0;
                    }
                }
            }

            // --- LÓGICA DE MANTER INIMIGO PRESO (Executa em ambos os modos) ---
            if (cao.inimigoPreso) {
                const inimigo = cao.inimigoPreso;
                // Se o inimigo morrer (pelo ataque do player), o cão solta automaticamente
                if (inimigo.estaMorto || inimigo.estaMorrendo) {
                    cao.inimigoPreso = null;
                } else {
                    inimigo.x = cao.x;
                    inimigo.y = cao.y;
                    inimigo.stunned = true;
                    // Renova o stun para garantir que o inimigo não tente fugir ou atacar enquanto preso
                    if (inimigo.stunTimer < 30) inimigo.stunTimer = 60;
                    inimigo.noChao = cao.noChao;
                    inimigo.velocidadeY = cao.velocidadeY;
                    
                    // Atualização visual imediata do inimigo
                    if (inimigo.elemento) {
                        inimigo.elemento.style.left = inimigo.x + 'px';
                        inimigo.elemento.style.bottom = inimigo.y + 'px';
                    }
                    // Sincroniza todos os equipamentos que o inimigo possa ter coletado
                    if (typeof window.sincronizarAcessoriosEntidade === 'function') {
                        window.sincronizarAcessoriosEntidade(inimigo, {
                            armaElemento: inimigo.armaElemento,
                            escudoElemento: inimigo.escudoElemento,
                            botaElemento: inimigo.botaElemento,
                            jetpackElemento: inimigo.jetpackElemento,
                            garraElemento: inimigo.garraElemento,
                            cintoElemento: inimigo.cintoElemento,
                            coleteElemento: inimigo.coleteElemento
                        });
                    }
                }
            }
        }

        // Sincronização Visual
        if (cao.mordendo) {
            cao.elemento.src = config.spriteCaoMordendo || '../../assets/personagem/cao_mordendo.png';
        } else if (typeof window.atualizarAnimacao === 'function') {
            window.atualizarAnimacao(cao, cao.elemento, cao.spriteParado, cao.spriteAndando, null, null, null);
        }

        cao.elemento.style.left = cao.x + 'px';
        cao.elemento.style.bottom = cao.y + 'px';
        cao.elemento.style.transform = cao.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
        requestAnimationFrame(() => cicloVidaCao(idControle));
    }

    // ESCUTA GLOBAL DE EVENTOS (Deep Debug)
    document.addEventListener('keydown', (e) => {
    }, true); // O parâmetro 'true' (capture) garante que peguemos a tecla antes de outros scripts

    /**
     * Função para liberar o cão da gaiola.
     * Chamada pelo gaiola.js quando o player colide.
     */
    window.libertarCao = function (gaiolaObj) {
        if (window.isCaoResgatado) return;

        window.isCaoResgatado = true;
        
        if (window.AudioManager) {
            window.AudioManager.playSFX('madeiraQuebrando', 0.7);
        }

        // Remove os elementos visuais da gaiola
        if (gaiolaObj) {
            if (gaiolaObj.elementoGaiola) gaiolaObj.elementoGaiola.remove();
            if (gaiolaObj.elementoCao) gaiolaObj.elementoCao.remove();
            
            // Spawna o cão livre na posição da gaiola
            window.iniciarCao({ x: gaiolaObj.x, y: gaiolaObj.y }, config || window.config);
            
            if (typeof window.criarEfeitoParticulas === 'function') {
                window.criarEfeitoParticulas(gaiolaObj.x + 16, gaiolaObj.y + 16, 'madeira');
            }
        }
    };

})();