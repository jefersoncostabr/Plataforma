(function () {
    // Caminhos padronizados para os assets
    const SPRITE_PARADO = '../../assets/personagem/cao_parado.png';
    const SPRITE_MOV = '../../assets/personagem/cao_mov.png';
    
    const DISTANCIA_PARA_SEGUIR = 45; 
    const DISTANCIA_MAX_PLAYER = 600; // Teleporta se ficar muito para trás
    const VELOCIDADE_CAO = 3;

    let cao = null;
    let loopAtivoGlobal = false;
    let idLoopAtual = 0;

    /**
     * Inicializa ou reposiciona o cachorro NPC próximo ao jogador.
     */
    window.inicializarCaoNPC = function (x, y) {
        console.log("[CAO] Função inicializarCaoNPC chamada para criar/reposicionar o cão.");
        console.log("[CAO] Criando entidade lógica em:", x, y);
        const palco = document.getElementById('game-stage') || document.getElementById('jogo-container');
        if (!palco) return;

        // Cancela loops anteriores para evitar que a física duplique (causando quedas através do chão)
        idLoopAtual++;
        const meuId = idLoopAtual;
        window.idCaoAtivo = meuId;

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
            idAtivo: meuId
        };
        // REGISTRO GLOBAL: Essencial para o movimento.js encontrar o cachorro
        window.caoEntidade = cao;
        
        // Só inicia o loop se não houver um rodando
        if (!loopAtivoGlobal) {
            loopAtivoGlobal = true;
            requestAnimationFrame(() => cicloVidaCao(meuId));
        }
    };
    // Cria o alias para a função que o inicial.js está chamando
    window.iniciarCao = (pos, cfg) => window.inicializarCaoNPC(pos.x, pos.y);

    function cicloVidaCao(idControle) {
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
            const cfg = window.config || {};

            if (window.controlandoCao) {
                const teclas = window.playerControle?.teclas || {};
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
                    window.aplicarFisica(cao, mockTeclas, 8.5, cfg.inimigoGravidade || 0.6, 0);
                    if (cao.velocidadeY > 0) cao.noChao = false;
                }

                // Lógica de retorno ao player: Baixo + Q + Colisão
                const segurandoBaixo = teclas['s'] || teclas['S'] || teclas['ArrowDown'];
                const apertandoQ = teclas['q'] || teclas['Q'];
                
                if (segurandoBaixo && apertandoQ && player) {
                    const hitboxCao = { x: cao.x, y: cao.y, largura: cao.largura, altura: cao.altura };
                    const hitboxPlayer = { 
                        x: player.x + (player.offsetX || 0),
                        y: player.y, 
                        largura: player.largura, 
                        altura: player.altura 
                    };
                    const colidindo = typeof window.detectarColisaoHitbox === 'function' && 
                                     window.detectarColisaoHitbox(hitboxCao, hitboxPlayer, -15, -15, -15);
                    
                    console.log("[DEBUG CAO] Colisão com Player:", colidindo);

                    if (colidindo) {
                        console.log("[SISTEMA] Troca realizada: Cachorro -> Jogador");
                        window.controlandoCao = false;
                        teclas['q'] = false; // Consome a tecla para evitar re-trigger imediato
                        teclas['Q'] = false;
                    }
                }
            } else {
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

            // Gravidade e Física Vertical
            if (typeof window.aplicarFisica === 'function') {
                window.aplicarFisica(cao, {}, 0, cfg.inimigoGravidade || 0.6, 0);
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
        if (typeof window.atualizarAnimacao === 'function') {
            window.atualizarAnimacao(cao, cao.elemento, SPRITE_PARADO, SPRITE_MOV, null, null, null);
        }

        cao.elemento.style.left = cao.x + 'px';
        cao.elemento.style.bottom = cao.y + 'px';
        cao.elemento.style.transform = cao.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
        requestAnimationFrame(() => cicloVidaCao(idControle));
    }
})();