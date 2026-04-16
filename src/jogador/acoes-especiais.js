(function () {
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
            atualizarVisualEscudo = () => {},
            salvarInventario = () => {},
            acaoAtiva = () => false,
            consumirAcao = () => {}
        } = opcoes;

        if (!controle || !config || !elemento?.parentElement) {
            throw new Error('Controle, config e elemento do jogador são obrigatórios para ações especiais.');
        }

        function obterSpriteVisualItem(tipo) {
            if (tipo === 'revolver') return config.spriteItemRevolver || '../../assets/personagem/revolver_pegavel.png';
            if (tipo === 'escudo') return config.spriteItemEscudo || '../../assets/personagem/escudo_pegavel.png';
            if (tipo === 'bota') return config.spriteItemBota || '../../assets/personagem/bota_pegavel.png';
            if (tipo === 'jetpack') return config.spriteItemJetpack || '../../assets/personagem/jetpack_pegavel.png';
            if (tipo === 'garra') return config.spriteItemGarra || '../../assets/personagem/garra_coletavel.png';
            if (tipo === 'cinto') return config.spriteItemCinto || '../../assets/personagem/cinto_coletavel.png';
            return '';
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
            }

            const visual = document.createElement('img');
            visual.style.cssText = 'position: absolute; width: 32px; height: 32px; z-index: 20; image-rendering: pixelated;';
            visual.src = obterSpriteVisualItem(tipo);
            elemento.parentElement.appendChild(visual);
            controle.vendaVisual = visual;
            salvarInventario();
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
            }

            if (controle.vendaVisual?.remove) controle.vendaVisual.remove();
            controle.vendaVisual = null;
            controle.vendaEmCurso = false;
            salvarInventario();
        }

        function processarComandosEspeciais() {
            const segurandoCima = acaoAtiva('cima');
            const apertouTiro = acaoAtiva('tiro');

            if (segurandoCima && window.temSkill?.((window.SKILLS || {}).AIRDROP) && apertouTiro && !controle.airdropUsadoNoNivel) {
                dispararSinalizador();
                controle.airdropUsadoNoNivel = true;
                console.log('Skill AirDrop: Suporte aéreo solicitado!');
                consumirAcao('tiro');
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
                iniciarVendaItem(tipo);
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