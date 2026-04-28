(function () {
    console.log("%c[SISTEMA CAO] Tentando carregar módulo do cão...", "color: cyan;");
    
    window.isCaoResgatado = typeof window.isCaoResgatado !== 'undefined' ? window.isCaoResgatado : false;

    // Caminhos padronizados para os assets
    const SPRITE_PARADO = '../../assets/personagem/cao_parado.png';
    const SPRITE_MOV = '../../assets/personagem/cao_mov.png';
    const SPRITE_MORDENDO = '../../assets/personagem/cao_mordendo.png';

    const DISTANCIA_PARA_SEGUIR = 45; 
    const DISTANCIA_MAX_PLAYER = 600; // Teleporta se ficar muito para trás
    const VELOCIDADE_CAO = 3;

    let cao = null;
    let loopAtivoGlobal = false;
    let idLoopAtual = 0;
    let config = {}; // Variável para armazenar as configurações do jogo

    /**
     * Inicializa ou reposiciona o cachorro NPC próximo ao jogador.
     */
    window.inicializarCaoNPC = function (x, y, gameConfig) {
        console.log("[CAO] Função inicializarCaoNPC chamada para criar/reposicionar o cão.");
        console.log("[CAO] Criando entidade lógica em:", x, y);
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
        img.src = SPRITE_PARADO;
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
            ultimoToqueQ: 0,       // Restaurado para Double Tap
            qPressionadoAnterior: false // Restaurado para Double Tap
        };
        // REGISTRO GLOBAL: Essencial para o movimento.js encontrar o cachorro
        window.caoEntidade = cao;
        
        console.log(`[SISTEMA CAO] Cachorro inicializado com ID: ${meuId}. Iniciando Loop...`);
        // Só inicia o loop se não houver um rodando
        if (!loopAtivoGlobal) {
            loopAtivoGlobal = true;
            requestAnimationFrame(() => cicloVidaCao(meuId));
        }
    };
    // Cria o alias para a função que o inicial.js está chamando
    window.iniciarCao = (pos, gameConfig) => window.inicializarCaoNPC(pos.x, pos.y, gameConfig);

    function cicloVidaCao(idControle) {
        if (!loopAtivoGlobal) loopAtivoGlobal = true;
        // Se o cachorro foi reinicializado, este loop antigo deve morrer
        if (window.idCaoAtivo !== idControle) {
            loopAtivoGlobal = false;
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
                
                // DEBUG PROFUNDO: Verifica o estado bruto do objeto de teclas
                if (teclas['k'] || teclas['K'] || teclas['KeyK'] || teclas['v'] || teclas['V']) {
                    console.log("[DEBUG CAO] Tecla de ataque detectada no loop:", {
                        k: teclas['k'], K: teclas['K'], KeyK: teclas['KeyK'],
                        v: teclas['v'], V: teclas['V']
                    });
                }

                cao.movendoHorizontal = false;
                let deslocX = 0;

                // Controle manual do cachorro
                if (teclas['a'] || teclas['A'] || teclas['ArrowLeft']) {
                    deslocX = -VELOCIDADE_CAO;
                    cao.direcao = 'e';
                    cao.movendoHorizontal = true;
                } else if (teclas['d'] || teclas['D'] || teclas['ArrowRight']) {
                    deslocX = VELOCIDADE_CAO;
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
                    const mockTeclas = { ' ': !!(teclas[' '] || teclas['w'] || teclas['W'] || teclas['ArrowUp']) };
                    window.aplicarFisica(cao, mockTeclas, 8.5, config.inimigoGravidade || 0.6, 0);
                    if (cao.velocidadeY > 0) cao.noChao = false;
                }

                // Lógica de mordida: Enquanto 'k', 'v' ou 'x' estiverem pressionados
                const kPressionado = teclas['k'] || teclas['K'] || teclas['KeyK'];
                const vPressionado = teclas['v'] || teclas['V'] || teclas['KeyV'];
                const xPressionado = teclas['x'] || teclas['X'] || teclas['KeyX'];
                
                const apertandoChute = !!(
                    kPressionado || vPressionado || xPressionado ||
                    (window.teclasPressionadas && (window.teclasPressionadas['k'] || window.teclasPressionadas['K'])) ||
                    (window.playerControle?.acoesDiscretas?.chute)
                );

                // LOG DE PRESSIONAMENTO SIMPLES (Solicitado)
                if (kPressionado) {
                    console.log("[DEBUG CAO] Loop detectou tecla K pressionada!");
                }

                cao.kPressionadoAnterior = kPressionado;

                if (apertandoChute !== cao.mordendo) {
                    console.log(`%c[DEBUG CAO] Mudança Visual Mordida: ${apertandoChute}`, "color: #00ff00");
                }

                cao.mordendo = apertandoChute;

                // --- LÓGICA DE RETORNO (Double Tap Q) ---
                const apertouQ = !!(teclas['q'] || teclas['Q'] || teclas['KeyQ']);
                if (apertouQ && !cao.qPressionadoAnterior) {
                    const agora = Date.now();
                    if (agora - (cao.ultimoToqueQ || 0) < 300) {
                        console.log("[SISTEMA] Double Tap Q: Retornando controle ao Jogador");
                        window.controlandoCao = false;
                        
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
            cao.mordendo = false; // Garante que não morda sozinho quando NPC
            const deltaX = player ? (player.x - cao.x) : 0;
            cao.movendoHorizontal = false;

            // Inteligência de Seguimento e Movimento Horizontal com Colisão
            if (player && !player.estaMorrendo && Math.abs(deltaX) > DISTANCIA_PARA_SEGUIR) {
                const direcaoX = Math.sign(deltaX);
                const deslocX = direcaoX * VELOCIDADE_CAO;
                
                // Usa o sistema global de movimento para evitar atravessar paredes
                window.aplicarDeslocamentoHorizontalComColisaoPadrao(cao, deslocX, window.plataformas, {
                    maxPasso: 1,
                    cancelarKnockbackAoColidir: true
                });

                cao.direcao = direcaoX > 0 ? 'd' : 'e';
                cao.movendoHorizontal = true;

                // Salto de Obstrução (Se bater em algo e estiver no chão, tenta pular)
                const bloqueioFrente = window.verificarColisaoComTiles(cao.x + (direcaoX > 0 ? 25 : -5), cao.y + 5, 5, 5, window.plataformas);
                if (bloqueioFrente && cao.noChao) cao.velocidadeY = 8.5;
            }

            // Salta se o jogador estiver acima (em plataformas altas)
            if (player && cao.noChao && player.y > cao.y + 32 && Math.abs(deltaX) < 80) {
                cao.velocidadeY = 9.0;
            }
            // Segurança: Teleporte se estiver muito longe ou caiu em buraco
            if (cao.y < -128 || (player && Math.abs(player.x - cao.x) > DISTANCIA_MAX_PLAYER)) {
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
                    console.log("%c[SISTEMA] Salto Trampolim Ativado!", "color: #ffaa00; font-weight: bold;");
                    cao.velocidadeY = config.forcaPuloTrampolim || 12; 
                    cao.noChao = false;
                    window.AudioManager?.playSFX('pulo', 0.6);
                }
            }

            // Gravidade e Física Vertical (Sempre ativa)
            if (typeof window.aplicarFisica === 'function') {
                window.aplicarFisica(cao, {}, 0, config.inimigoGravidade || 0.6, 0);
            }

            // 4. Colisão Vertical (Solo)
            cao.noChao = false;
            const hitV = typeof window.verificarColisaoComTiles === 'function' && 
                            window.verificarColisaoComTiles(cao.x + cao.offsetX, cao.y, cao.largura, cao.altura, window.plataformas);
            if (hitV) {
                if (cao.velocidadeY < 0) { cao.noChao = true; cao.y = window.aplicarSnapColisaoPadrao(cao.y, 0, cao.altura, hitV, 'cima'); }
                else if (cao.velocidadeY > 0) { cao.y = window.aplicarSnapColisaoPadrao(cao.y, 0, cao.altura, hitV, 'baixo'); }
                cao.velocidadeY = 0;
            }
        }

        // Sincronização Visual
        if (cao.mordendo) {
            cao.elemento.src = SPRITE_MORDENDO;
        } else if (typeof window.atualizarAnimacao === 'function') {
            window.atualizarAnimacao(cao, cao.elemento, SPRITE_PARADO, SPRITE_MOV, null, null, null);
        }

        cao.elemento.style.left = cao.x + 'px';
        cao.elemento.style.bottom = cao.y + 'px';
        cao.elemento.style.transform = cao.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
        requestAnimationFrame(() => cicloVidaCao(idControle));
    }

    // ESCUTA GLOBAL DE EVENTOS (Deep Debug)
    document.addEventListener('keydown', (e) => {
        // Se for a tecla K, logamos com destaque
        if (e.key.toLowerCase() === 'k') {
            console.log("%c[DEBUG HARDWARE] Tecla 'K' detectada pelo navegador!", "background: #222; color: #bada55; padding: 2px 5px;");
            console.log({
                key: e.key,
                code: e.code,
                controlandoCao: window.controlandoCao,
                isPaused: window.isPaused,
                isCaoResgatado: window.isCaoResgatado
            });
        }

        // Log para identificar se algum script está bloqueando o evento
        console.log(`[TECLA DETECTADA] Key: ${e.key} | Code: ${e.code} | Target: ${e.target.tagName}`);
    }, true); // O parâmetro 'true' (capture) garante que peguemos a tecla antes de outros scripts

    /**
     * Função para liberar o cão da gaiola.
     * Chamada pelo gaiola.js quando o player colide.
     */
    window.libertarCao = function (gaiolaObj) {
        console.log("[CAO] window.libertarCao executada!");
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

    console.log("%c[SISTEMA CAO] Arquivo cao.js carregado com sucesso!", "color: yellow; font-weight: bold;");
})();