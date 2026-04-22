(function () {
    const FILTRO_PREVIEW_VISUAL = 'brightness(0.6) sepia(1) hue-rotate(-50deg) saturate(30)';

    function criarVisualFantasma(opcoes = {}) {
        const {
            src = '',
            x = 0,
            y = 0,
            width = 32,
            height = 32,
            zIndex = 20,
            filter = FILTRO_PREVIEW_VISUAL,
            layer = null,
            parentElement = document.getElementById('game-stage') || document.getElementById('jogo-container')
        } = opcoes;

        const visual = document.createElement('img');
        visual.src = src;
        visual.style.cssText = `position: absolute; width: ${width}px; height: ${height}px; left: ${x}px; bottom: ${y}px; z-index: ${zIndex}; image-rendering: pixelated; pointer-events: none; filter: ${filter};`;

        if (typeof adicionarAoLayer === 'function' && layer) {
            adicionarAoLayer(visual, layer);
        } else if (parentElement) {
            parentElement.appendChild(visual);
        }

        return visual;
    }

    window.FILTRO_VISUAL_PREVIEW = FILTRO_PREVIEW_VISUAL;
    window.criarVisualFantasma = criarVisualFantasma;

    function criarSistemaAcoesEspeciaisJogador(opcoes = {}) {
        const {
            controle,
            config,
            elemento,
            armaElemento,
            escudoElemento,
            botaElemento,
            jetpackElemento,
            jetFogoElemento,
            garraElemento,
            cintoElemento,
            coleteElemento,
            atualizarVisualEscudo = () => {},
            salvarInventario = () => {},
            acaoAtiva = () => false,
            consumirAcao = () => {}
        } = opcoes;

        if (!controle || !config || !elemento?.parentElement) {
            throw new Error('Controle, config e elemento do jogador são obrigatórios para ações especiais.');
        }

        function obterSpriteVisualItem(tipo) {
            return window.obterSpriteItem(tipo, config);
        }

        function dispararSinalizador() {
            const xPartida = controle.x + 12;
            const yPartida = controle.y + 32;
            const alturaSubida = 150;

            const sinalizador = document.createElement('img');
            sinalizador.src = config.spriteProjetil;
            sinalizador.style.cssText = `
                position: absolute;
                width: ${config.PROJETIL_LARGURA}px;
                height: ${config.PROJETIL_ALTURA}px;
                left: ${xPartida}px;
                bottom: ${yPartida}px;
                image-rendering: pixelated;
                transform: translateY(0) rotate(-90deg);
                transition: transform 1.0s linear;
            `;

            adicionarAoLayer(sinalizador, window.LAYERS.EFEITOS);

            requestAnimationFrame(() => {
                sinalizador.style.transform = `translateY(-${alturaSubida}px) rotate(-90deg)`;
            });

            setTimeout(() => {
                const posX = xPartida;
                const posY = yPartida + alturaSubida;
                sinalizador.remove();

                const explosao = document.createElement('img');
                explosao.src = '../../assets/personagem/explosao.png';
                explosao.style.position = 'absolute';
                explosao.style.width = '32px';
                explosao.style.height = '32px';
                explosao.style.left = (posX - 12) + 'px';
                explosao.style.bottom = (posY - 12) + 'px';
                explosao.style.imageRendering = 'pixelated';
                explosao.style.pointerEvents = 'none';
                explosao.style.transform = 'scale(0.1)';
                explosao.style.transition = 'transform 0.8s ease-out, opacity 0.8s ease-out';

                adicionarAoLayer(explosao, window.LAYERS.EFEITOS);

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        explosao.style.transform = 'scale(4)';
                        explosao.style.opacity = '0';
                    });
                });

                setTimeout(() => {
                    explosao.remove();
                }, 800);
            }, 1050);

            const tempoEspera = (config.airdrop1?.espera || 10) * 1000;
            setTimeout(() => {
                const colunasTotais = Math.floor((window.mundoLargura || 640) / 32);
                const colAleatoria = Math.floor(Math.random() * Math.max(1, colunasTotais));
                const xFinal = colAleatoria * 32;
                const yFinal = 448;

                const airdropImg = document.createElement('img');
                airdropImg.src = '../../assets/personagem/airdrop.png';
                airdropImg.style.position = 'absolute';
                airdropImg.style.width = '32px';
                airdropImg.style.height = '32px';
                airdropImg.style.left = xFinal + 'px';
                airdropImg.style.bottom = yFinal + 'px';
                airdropImg.style.imageRendering = 'pixelated';

                adicionarAoLayer(airdropImg, window.LAYERS.ITENS);
                window.itensColetaveis.push({
                    x: xFinal,
                    y: yFinal,
                    elemento: airdropImg,
                    velocidadeY: 0,
                    tipo: 'airdrop'
                });
                console.log(`AirDrop: Suprimentos detectados na coluna ${colAleatoria + 1}!`);
            }, tempoEspera);
        }

        function iniciarVendaItem(tipo) {
            if (tipo === 'colete' && Array.isArray(controle.coleteSlots) && controle.coleteSlots.some(Boolean)) {
                console.log('Colete: esvazie a mochila antes de vender o colete.');
                return false;
            }

            controle.vendaEmCurso = true;
            controle.vendaTimer = 0;
            controle.vendaTipo = tipo;

            if (tipo === 'revolver') {
                controle.temArma = false;
                armaElemento.style.display = 'none';
            } else if (tipo === 'escudo') {
                controle.temEscudo = false;
                atualizarVisualEscudo();
            } else if (tipo === 'bota') {
                controle.temBota = false;
                botaElemento.style.display = 'none';
            } else if (tipo === 'jetpack') {
                controle.temJetpack = false;
                controle.jetpackAtivo = false;
                jetpackElemento.style.display = 'none';
                jetFogoElemento.style.display = 'none';
            } else if (tipo === 'garra') {
                controle.temGarra = false;
                garraElemento.style.display = 'none';
            } else if (tipo === 'cinto') {
                controle.temCinto = false;
                cintoElemento.style.display = 'none';
            } else if (tipo === 'colete') {
                controle.temColete = false;
                if (coleteElemento) coleteElemento.style.display = 'none';
            }

            controle.vendaVisual = criarVisualFantasma({
                src: obterSpriteVisualItem(tipo),
                x: controle.x,
                y: controle.y + 40,
                parentElement: elemento.parentElement,
                zIndex: 20
            });
            salvarInventario();
            return true;
        }

        function cancelarVendaItem() {
            if (!controle.vendaEmCurso) return;

            controle.inventario.push(controle.vendaTipo);

            if (controle.vendaTipo === 'revolver') {
                controle.temArma = true;
                armaElemento.style.display = 'block';
            } else if (controle.vendaTipo === 'escudo') {
                controle.temEscudo = true;
                atualizarVisualEscudo();
            } else if (controle.vendaTipo === 'bota') {
                controle.temBota = true;
                botaElemento.style.display = 'block';
            } else if (controle.vendaTipo === 'jetpack') {
                controle.temJetpack = true;
                jetpackElemento.style.display = 'block';
            } else if (controle.vendaTipo === 'garra') {
                controle.temGarra = true;
                garraElemento.style.display = 'block';
            } else if (controle.vendaTipo === 'cinto') {
                controle.temCinto = true;
                cintoElemento.style.display = 'block';
            } else if (controle.vendaTipo === 'colete') {
                controle.temColete = true;
                if (coleteElemento) coleteElemento.style.display = 'block';
            }

            if (controle.vendaVisual?.remove) controle.vendaVisual.remove();
            controle.vendaVisual = null;
            controle.vendaEmCurso = false;
            salvarInventario();
        }

        function processarComandosEspeciais() {
            const segurandoCima = acaoAtiva('cima');
            const apertouTiro = acaoAtiva('tiro');
            const apertouAirdropRapido = acaoAtiva('airdrop');
            const apertouTecla5 = controle.teclas['5'];

            const solicitouAirdrop = apertouAirdropRapido || apertouTecla5 || (segurandoCima && apertouTiro);

            if (solicitouAirdrop) {
                const isDebug = !!apertouTecla5;
                const temSkill = window.temSkill?.((window.SKILLS || {}).AIRDROP);
                
                if (isDebug) {
                    console.log("[DEBUG] Airdrop forçado via tecla 5.");
                } else {
                    console.log(`[AIRDROP] Solicitação recebida. Skill: ${temSkill}, Já usado: ${controle.airdropUsadoNoNivel}`);
                }
                
                if (!temSkill && !isDebug) {
                    console.warn("[AIRDROP] Bloqueado: Habilidade AIRDROP necessária.");
                    return;
                }

                if (controle.airdropUsadoNoNivel && !isDebug) return;

                dispararSinalizador();
                if (!isDebug) controle.airdropUsadoNoNivel = true;
                console.log('Skill AirDrop: Suporte aéreo solicitado!');
                
                if (isDebug) {
                    controle.teclas['5'] = false; // Consome o input de debug para evitar disparos contínuos
                } else if (apertouAirdropRapido) {
                    consumirAcao('airdrop');
                } else {
                    consumirAcao('tiro');
                }
                return;
            }

            const segurandoBaixoVenda = acaoAtiva('baixo');
            if (
                window.temSkill?.((window.SKILLS || {}).VENDER) &&
                segurandoBaixoVenda &&
                apertouTiro &&
                !controle.vendaEmCurso &&
                Array.isArray(controle.inventario) &&
                controle.inventario.length > 0
            ) {
                const tipo = controle.inventario.pop();
                const iniciouVenda = iniciarVendaItem(tipo);
                if (!iniciouVenda) {
                    controle.inventario.push(tipo);
                }
            }
        }

        function atualizarVenda() {
            if (!controle.vendaEmCurso || !controle.vendaVisual) return false;

            controle.vendaTimer++;
            controle.vendaVisual.style.left = controle.x + 'px';
            controle.vendaVisual.style.bottom = (controle.y + 40) + 'px';

            if (controle.vendaTimer > 60) {
                controle.vendaVisual.style.filter = 'sepia(1) saturate(10) hue-rotate(90deg)';
            }

            if (acaoAtiva('pulo')) {
                cancelarVendaItem();
            } else if (controle.vendaTimer >= 120) {
                if (typeof window.ganharXP === 'function') window.ganharXP(1);
                controle.vendaVisual.remove();
                controle.vendaVisual = null;
                controle.vendaEmCurso = false;
            }

            return true;
        }

        function processarAcoesEspeciais() {
            processarComandosEspeciais();
            return atualizarVenda();
        }

        return {
            dispararSinalizador,
            processarAcoesEspeciais,
            atualizarVenda,
            cancelarVendaItem
        };
    }

    window.criarSistemaAcoesEspeciaisJogador = criarSistemaAcoesEspeciaisJogador;
})();