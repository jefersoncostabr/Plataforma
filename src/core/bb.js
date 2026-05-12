(function () {
    // Estado global do BB
    window.bbEntidade = null;
    window.controlandoBB = false;
    let bbIdAtivo = 0;

    /**
     * Inicializa o BB com a mesma física do cao
     */
    window.inicializarBB = function (x, y, gameConfig) {
        const palco = document.getElementById('game-stage') || document.getElementById('jogo-container');
        if (!palco) return;

        bbIdAtivo++;
        const meuId = bbIdAtivo;

        const config = gameConfig || window.config || {};

        // Remove BB anterior
        const idElemento = 'pet-bb';
        const antigo = document.getElementById(idElemento);
        if (antigo) antigo.remove();

        // Cria elemento do BB
        const img = document.createElement('img');
        const spritePadrao = config.spriteBB || '../../assets/personagem/bb/bb-parado.png';
        img.src = spritePadrao;
        img.id = idElemento;
        img.className = 'npc-pet npc-bb';
        img.style.cssText = `position: absolute; width: 32px; height: 32px; image-rendering: pixelated; z-index: 100; pointer-events: none; transform-origin: center center; transition: transform 0.05s linear;`;
        img.style.left = x + 'px';
        img.style.bottom = y + 'px';

        if (window.LAYERS && window.LAYERS.INIMIGOS) {
            window.adicionarAoLayer(img, window.LAYERS.INIMIGOS);
        } else {
            palco.appendChild(img);
        }

        // Configuração do BB com mesma física do cao
        const bb = {
            elemento: img,
            tipo: 'bb',
            x: x,
            y: y,
            largura: 9,
            altura: 15,
            offsetX: 11,
            velocidadeY: 0,
            noChao: false,
            movendoHorizontal: false,
            direcao: 'd',
            contadorAnimacao: 0,
            frameAtual: 0,
            cooldownPulo: 0,
            kPressionadoAnterior: false,
            spriteParado: spritePadrao,
            spriteAndando: config.spriteBBAndando || '../../assets/personagem/bb/bb-andando.png',
            spriteInteracao: config.spriteBBInteracao || '../../assets/personagem/bb/bb-interacao.png',
            ultimoToqueQ: 0,
            qPressionadoAnterior: false,
            interagindo: false,
            // Suporte a Inventário e Controle de Base
            inventario: [],
            coleteSlots: Array.from({ length: 6 }, () => null),
            cintoSlot: null,
            temColete: true,
            temCinto: true,
            estaAgachado: false
        };

        // Inicializa um sistema de crafting dedicado ao BB
        bb.craftingSystem = window.criarSistemaCraftingJogador({
            controle: bb,
            config: config,
            elemento: img,
            salvarInventario: () => {}, // O inventário do BB é volátil (não persiste no save global)
            acaoAtiva: (acao) => {
                if (!window.controlandoBB) return false;
                const teclas = window.playerControle?.teclas || {};
                const binds = window.controlesConfig?.[acao] || [];
                return binds.some(k => teclas[k] || teclas[k.toLowerCase()] || teclas[k.toUpperCase()]);
            },
            consumirAcao: (acao) => {
                const teclas = window.playerControle?.teclas || {};
                const binds = window.controlesConfig?.[acao] || [];
                binds.forEach(k => {
                    teclas[k] = false;
                    teclas[k.toLowerCase()] = false;
                    teclas[k.toUpperCase()] = false;
                });
            }
        });

        window.bbEntidade = bb;
        requestAnimationFrame(() => cicloVidaBB(bb, meuId));
    };

    function cicloVidaBB(bb, idControle) {
        // Verifica se este BB foi substituído
        if (bbIdAtivo !== idControle) return;

        const player = window.playerControle;

        if (!window.isPaused && bb && window.config) {
            const config = window.config;

            // Configurações de física (iguais ao cao)
            let forcaPuloBase = (config.gravidadeUniversal 
                ? (config.forcaGravidade?.forcaPulo ?? 10) 
                : (config.forcaPuloCao ?? 10)) - 2;

            let gravidade = config.gravidadeUniversal 
                ? (config.forcaGravidade?.gravidade ?? 0.5) 
                : (config.gravidadeCao ?? 0.5);
                
            let velocidadeBase = (config.velocidadeCao || 3) - 2;

            let teclasParaFisica = {};

            if (bb.cooldownPulo > 0) bb.cooldownPulo--;

            if (window.controlandoBB) {
                const teclas = window.playerControle?.teclas || {};

                bb.movendoHorizontal = false;
                let deslocX = 0;

                // Movimento horizontal
                if (teclas['a'] || teclas['A'] || teclas['ArrowLeft']) {
                    deslocX = -velocidadeBase;
                    bb.direcao = 'e';
                    bb.movendoHorizontal = true;
                } else if (teclas['d'] || teclas['D'] || teclas['ArrowRight']) {
                    deslocX = velocidadeBase;
                    bb.direcao = 'd';
                    bb.movendoHorizontal = true;
                }

                // Lógica de Agachar (necessária para posicionar ou evoluir a base)
                const baixoBinds = window.controlesConfig?.['baixo'] || ['s', 'S', 'ArrowDown'];
                bb.estaAgachado = baixoBinds.some(k => teclas[k]);

                // Processa interações de Crafting/Base (Menu, Evoluir ou Recolher)
                if (bb.craftingSystem) {
                    bb.craftingSystem.processarInteracaoCraft();
                }

                if (deslocX !== 0) {
                    window.aplicarDeslocamentoHorizontalComColisaoPadrao(bb, deslocX, window.plataformas, {
                        maxPasso: 1,
                        cancelarKnockbackAoColidir: true
                    });
                }

                // Pulo
                teclasParaFisica[' '] = !!teclas[' '];

                // Interação K
                const kPressionado = teclas['k'] || teclas['K'];
                if (kPressionado && !bb.kPressionadoAnterior) {
                    bb.interagindo = true;
                    setTimeout(() => { bb.interagindo = false; }, 300);
                }
                bb.kPressionadoAnterior = kPressionado;

                // Double Tap Q para voltar
                const apertouQ = !!(teclas['q'] || teclas['Q']);
                if (apertouQ && !bb.qPressionadoAnterior) {
                    const agora = Date.now();
                    if (agora - (bb.ultimoToqueQ || 0) < 300) {
                        if (window.playerControle?.bloqueadoPorResgateBB) {
                            bb.ultimoToqueQ = agora;
                            bb.qPressionadoAnterior = apertouQ;
                            return;
                        }

                        window.controlandoBB = false;
                        teclas['q'] = false;
                        teclas['Q'] = false;
                        window.AudioManager?.playSFX('engrenagem', 0.5);
                        window.cameraZoomFactor = 1;
                    }
                    bb.ultimoToqueQ = agora;
                }
                bb.qPressionadoAnterior = apertouQ;
            }

            // Gravidade e física vertical
            if (typeof window.aplicarFisica === 'function') {
                window.aplicarFisica(bb, teclasParaFisica, forcaPuloBase, gravidade, 30);
            }

            // Colisão vertical
            bb.noChao = false;
            if (typeof window.verificarColisaoComTiles === 'function') {
                if (bb.velocidadeY <= 0) {
                    const hitSolo = window.verificarColisaoComTiles(
                        bb.x + bb.offsetX,
                        bb.y,
                        bb.largura,
                        6,
                        window.plataformas
                    );
                    if (hitSolo) {
                        bb.noChao = true;
                        bb.y = window.aplicarSnapColisaoPadrao(bb.y, 0, bb.altura, hitSolo, 'cima');
                        bb.velocidadeY = 0;
                    }
                } else if (bb.velocidadeY > 0) {
                    const hitTeto = window.verificarColisaoComTiles(
                        bb.x + bb.offsetX,
                        bb.y + (bb.altura - 6),
                        bb.largura,
                        6,
                        window.plataformas
                    );
                    if (hitTeto) {
                        bb.y = window.aplicarSnapColisaoPadrao(bb.y, 0, bb.altura, hitTeto, 'baixo');
                        bb.velocidadeY = 0;
                    }
                }
            }

            if (typeof window.atualizarParaquedasBB === 'function') {
                window.atualizarParaquedasBB(bb, config);
            }
        }

        // Sincronização visual
        if (bb.interagindo) {
            bb.elemento.src = bb.spriteInteracao;
        } else {
            // Animação: alterna entre parado e andando quando em movimento
            if (bb.movendoHorizontal && bb.noChao) {
                bb.contadorAnimacao++;
                if (bb.contadorAnimacao >= 10) {
                    bb.frameAtual = bb.frameAtual === 0 ? 1 : 0;
                    bb.elemento.src = bb.frameAtual === 0 ? bb.spriteParado : bb.spriteAndando;
                    bb.contadorAnimacao = 0;
                }
            } else {
                // Parado no chão
                bb.elemento.src = bb.spriteParado;
                bb.contadorAnimacao = 0;
                bb.frameAtual = 0;
            }
        }

        bb.elemento.style.left = bb.x + 'px';
        bb.elemento.style.bottom = bb.y + 'px';

        // Aplicar rotação de pulo (igual ao cao)
        if (typeof window.aplicarRotacaoVerticalPet === 'function') {
            window.aplicarRotacaoVerticalPet(bb);
        } else {
            bb.elemento.style.transform = bb.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
        }

        requestAnimationFrame(() => cicloVidaBB(bb, idControle));
    }

    /**
     * Função de console para ativar o modo de controle do BB
     * Uso: window.controlarBB()
     */
    window.controlarBB = function () {
        if (!window.bbEntidade) {
            const player = window.playerControle;
            if (!player) {
                console.error('BB não inicializado e player não encontrado');
                return;
            }
            // Inicializa BB na posição do player
            window.inicializarBB(player.x, player.y, window.config);
        }
        
        // Garante que a colisão está correta (fix para cache)
        if (window.bbEntidade) {
            window.bbEntidade.largura = 9;
            window.bbEntidade.offsetX = 11;
        }
        
        window.controlandoBB = true;
        // Mesmo comportamento dos pets: ao assumir controle, aplica ampliacao da camera.
        window.cameraZoomFactor = 1.5;
        console.log('🎮 Controlando BB. Aperte Q 2x para voltar ao player.');
    };

    /**
     * Função para voltar ao controle do player
     */
    window.controlarPlayer = function () {
        if (window.playerControle?.bloqueadoPorResgateBB) {
            console.log('Player indisponível após resgate. Continue com o BB.');
            return;
        }

        window.controlandoBB = false;
        // Reset camera zoom when returning control to player
        window.cameraZoomFactor = 1;
        console.log('🎮 Voltou ao controle do player.');
    };

    /**
     * Posiciona o BB no palco se não estiver
     */
    window.garantirBBNoEstado = function (x, y) {
        if (!window.bbEntidade || !window.bbEntidade.elemento) {
            window.inicializarBB(x || 100, y || 100, window.config);
        }
    };

})();
