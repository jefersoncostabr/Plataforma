(function () {
    // Caminhos padronizados para os assets
    const SPRITE_PARADO = '../../assets/personagem/cao_parado.png';
    const SPRITE_MOV = '../../assets/personagem/cao_mov.png';
    
    const DISTANCIA_PARA_SEGUIR = 45; 
    const DISTANCIA_MAX_PLAYER = 600; // Teleporta se ficar muito para trás
    const VELOCIDADE_CAO = 3;

    let cao = null;
    let loopAtivo = false;
    let idLoopAtual = 0;

    /**
     * Inicializa ou reposiciona o cachorro NPC próximo ao jogador.
     */
    window.inicializarCaoNPC = function (x, y) {
        const palco = document.getElementById('game-stage') || document.getElementById('jogo-container');
        if (!palco) return;

        // Cancela loops anteriores para evitar que a física duplique (causando quedas através do chão)
        idLoopAtual++;
        const meuId = idLoopAtual;

        // Remove instância anterior se houver (evita duplicidade em trocas de fase)
        if (cao && cao.elemento) cao.elemento.remove();

        const img = document.createElement('img');
        img.src = SPRITE_PARADO;
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

        requestAnimationFrame(() => cicloVidaCao(meuId));
    };

    function cicloVidaCao(idControle) {
        // Se o cachorro foi reinicializado, este loop antigo deve morrer
        if (!cao || cao.idAtivo !== idControle) {
            return;
        }

        const player = window.playerControle;
        
        // 1. Processamento de Lógica e Física (Apenas se o jogo NÃO estiver pausado)
        if (!window.isPaused) {
            const cfg = window.config || {};
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