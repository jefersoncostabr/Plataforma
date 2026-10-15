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
            window.AudioManager?.playSFX('sinalizador', 0.7);
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

                if (typeof window.criarExplosaoSinalizador === 'function') {
                    window.criarExplosaoSinalizador(posX, posY, { layer: window.LAYERS?.EFEITOS });
                }
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

        function tipoEstaEquipado(tipo) {
            if ((tipo === 'revolver' || tipo === 'doze') && controle.temArma) {
                return (controle.heldWeaponType || tipo) === tipo;
            }
            if (tipo === 'escudo') return !!(controle.temEscudo || controle.escudoVermelho);
            if (tipo === 'bota') return !!controle.temBota;
            if (tipo === 'jetpack') return !!controle.temJetpack;
            if (tipo === 'garra') return !!controle.temGarra;
            if (tipo === 'cinto') return !!controle.temCinto;
            if (tipo === 'colete') return !!controle.temColete;
            return false;
        }

        function proximoAlvoVenda() {
            if (!Array.isArray(controle.inventario)) controle.inventario = [];
            if (!Array.isArray(controle.coleteSlots)) controle.coleteSlots = [];

            const indiceMochila = controle.coleteSlots.findIndex(Boolean);
            if (indiceMochila >= 0) {
                const entrada = controle.coleteSlots[indiceMochila];
                return { tipo: entrada?.tipo || entrada?.id || entrada, origem: 'mochila', indice: indiceMochila };
            }
            if (controle.cintoSlot) {
                const entrada = controle.cintoSlot;
                return { tipo: entrada?.tipo || entrada?.id || entrada, origem: 'slot-cinto' };
            }

            // Igual ao drop: o colete só pode ser vendido depois de esvaziar a mochila.
            if (controle.temColete && controle.inventario.includes('colete')) {
                return { tipo: 'colete', origem: 'equipado' };
            }

            const arma = controle.temArma ? (controle.heldWeaponType || (controle.inventario.includes('doze') ? 'doze' : 'revolver')) : null;
            const equipamentos = [
                arma,
                (controle.temEscudo || controle.escudoVermelho) ? 'escudo' : null,
                controle.temBota ? 'bota' : null,
                controle.temJetpack ? 'jetpack' : null,
                controle.temGarra ? 'garra' : null,
                controle.temCinto ? 'cinto' : null
            ];
            const equipado = equipamentos.find(tipo => tipo && controle.inventario.includes(tipo));
            if (equipado) return { tipo: equipado, origem: 'equipado' };

            const tipo = controle.inventario[controle.inventario.length - 1];
            return tipo ? { tipo, origem: 'inventario' } : null;
        }

        function iniciarVendaItem(tipo, alvo = {}) {
            const ehEquipado = alvo.origem === 'equipado';
            if (ehEquipado && tipo === 'colete' && Array.isArray(controle.coleteSlots) && controle.coleteSlots.some(Boolean)) {
                return false;
            }

            const transacao = { ...alvo, tipo, entradaOriginal: null, removeuTipoInventario: false };
            if (alvo.origem === 'mochila') {
                const entrada = controle.coleteSlots[alvo.indice];
                transacao.entradaOriginal = (typeof entrada === 'object')
                    ? { ...entrada, dados: { ...(entrada.dados || {}) } }
                    : entrada;
                if (Number(entrada?.quantidade || 1) > 1) {
                    controle.coleteSlots[alvo.indice] = { ...entrada, quantidade: Number(entrada.quantidade) - 1 };
                } else {
                    controle.coleteSlots[alvo.indice] = null;
                }
            } else if (alvo.origem === 'slot-cinto') {
                const entrada = controle.cintoSlot;
                transacao.entradaOriginal = (typeof entrada === 'object')
                    ? { ...entrada, dados: { ...(entrada.dados || {}) } }
                    : entrada;
                if (Number(entrada?.quantidade || 1) > 1) {
                    controle.cintoSlot = { ...entrada, quantidade: Number(entrada.quantidade) - 1 };
                } else {
                    controle.cintoSlot = null;
                }
            }

            if (alvo.origem === 'mochila' || alvo.origem === 'slot-cinto') {
                const continuaGuardado = controle.coleteSlots.some(entrada => (entrada?.tipo || entrada?.id || entrada) === tipo)
                    || (controle.cintoSlot && (controle.cintoSlot?.tipo || controle.cintoSlot?.id || controle.cintoSlot) === tipo);
                if (!continuaGuardado && !tipoEstaEquipado(tipo)) {
                    const indiceInventario = controle.inventario.lastIndexOf(tipo);
                    if (indiceInventario >= 0) {
                        controle.inventario.splice(indiceInventario, 1);
                        transacao.removeuTipoInventario = true;
                    }
                }
            } else {
                const indiceInventario = controle.inventario.lastIndexOf(tipo);
                if (indiceInventario >= 0) controle.inventario.splice(indiceInventario, 1);
            }
            controle.vendaOrigem = transacao;

            controle.vendaEmCurso = true;
            controle.vendaTimer = 0;
            controle.vendaTipo = tipo;

            if (ehEquipado && (tipo === 'revolver' || tipo === 'doze')) {
                controle.temArma = false;
                armaElemento.style.display = 'none';
            } else if (ehEquipado && tipo === 'escudo') {
                controle.temEscudo = false;
                atualizarVisualEscudo();
            } else if (ehEquipado && tipo === 'bota') {
                controle.temBota = false;
                botaElemento.style.display = 'none';
            } else if (ehEquipado && tipo === 'jetpack') {
                controle.temJetpack = false;
                controle.jetpackAtivo = false;
                jetpackElemento.style.display = 'none';
                jetFogoElemento.style.display = 'none';
            } else if (ehEquipado && tipo === 'garra') {
                controle.temGarra = false;
                garraElemento.style.display = 'none';
            } else if (ehEquipado && tipo === 'cinto') {
                controle.temCinto = false;
                cintoElemento.style.display = 'none';
            } else if (ehEquipado && tipo === 'colete') {
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

            const transacao = controle.vendaOrigem || { origem: 'inventario', tipo: controle.vendaTipo };
            if (transacao.origem === 'mochila') {
                const indice = transacao.indice;
                if (!controle.coleteSlots[indice]) controle.coleteSlots[indice] = transacao.entradaOriginal;
                else {
                    const indiceLivre = controle.coleteSlots.findIndex(entrada => !entrada);
                    if (indiceLivre >= 0) controle.coleteSlots[indiceLivre] = transacao.entradaOriginal;
                    else controle.inventario.push(transacao.tipo);
                }
                if (transacao.removeuTipoInventario && !controle.inventario.includes(transacao.tipo)) {
                    controle.inventario.push(transacao.tipo);
                }
            } else if (transacao.origem === 'slot-cinto') {
                if (!controle.cintoSlot) controle.cintoSlot = transacao.entradaOriginal;
                else controle.inventario.push(transacao.tipo);
                if (transacao.removeuTipoInventario && !controle.inventario.includes(transacao.tipo)) {
                    controle.inventario.push(transacao.tipo);
                }
            } else {
                controle.inventario.push(transacao.tipo);
            }

            if (transacao.origem === 'equipado' && (controle.vendaTipo === 'revolver' || controle.vendaTipo === 'doze')) {
                controle.temArma = true;
                armaElemento.style.display = 'block';
            } else if (transacao.origem === 'equipado' && controle.vendaTipo === 'escudo') {
                controle.temEscudo = true;
                atualizarVisualEscudo();
            } else if (transacao.origem === 'equipado' && controle.vendaTipo === 'bota') {
                controle.temBota = true;
                botaElemento.style.display = 'block';
            } else if (transacao.origem === 'equipado' && controle.vendaTipo === 'jetpack') {
                controle.temJetpack = true;
                jetpackElemento.style.display = 'block';
            } else if (transacao.origem === 'equipado' && controle.vendaTipo === 'garra') {
                controle.temGarra = true;
                garraElemento.style.display = 'block';
            } else if (transacao.origem === 'equipado' && controle.vendaTipo === 'cinto') {
                controle.temCinto = true;
                cintoElemento.style.display = 'block';
            } else if (transacao.origem === 'equipado' && controle.vendaTipo === 'colete') {
                controle.temColete = true;
                if (coleteElemento) coleteElemento.style.display = 'block';
            }

            if (controle.vendaVisual?.remove) controle.vendaVisual.remove();
            controle.vendaVisual = null;
            controle.vendaEmCurso = false;
            controle.vendaOrigem = null;
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
                    // console.log("[DEBUG] Airdrop forçado via tecla 5.");
                } else {
                    // console.log(`[AIRDROP] Solicitação recebida. Skill: ${temSkill}, Já usado: ${controle.airdropUsadoNoNivel}`);
                } // This is a valid debug log, keeping it.
                
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
            const combinacaoVendaAtiva = segurandoBaixoVenda && apertouTiro;

            const alvoVenda = proximoAlvoVenda();
            if (
                window.temSkill?.((window.SKILLS || {}).VENDER) &&
                combinacaoVendaAtiva &&
                !controle.vendaEmCurso &&
                alvoVenda?.tipo
            ) {
                iniciarVendaItem(alvoVenda.tipo, alvoVenda);
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
                controle.vendaOrigem = null;
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
