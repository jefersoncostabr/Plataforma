(function () {
    const TILE_SIZE = 32;
    const NIVEL_MAXIMO_CRAFT = 3;
    const CRAFT_PERSISTENCE_KEY = 'plataformaCraftPersistente';
    const SPRITES_CRAFT = {
        1: '../../assets/craft/craft_nivel1.png',
        2: '../../assets/craft/craft_nivel2.png',
        3: '../../assets/craft/craft_nivel3.png'
    };

    function lerCraftPersistidoStorage() {
        try {
            const raw = localStorage.getItem(CRAFT_PERSISTENCE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (error) {
            console.warn('Craft: falha ao ler base persistida.', error);
            return null;
        }
    }

    function gerarSpriteCraftNivel(nivel = 1, tipoBase = 'item') {
        const temaPorNivel = {
            1: { fundo: '#355cdd', detalhe: '#9fc1ff', brilho: '#e9f2ff', texto: 'I' },
            2: { fundo: '#6a3fd2', detalhe: '#d4b3ff', brilho: '#ffe88c', texto: 'II' },
            3: { fundo: '#1d9b5f', detalhe: '#86f0b8', brilho: '#fff1a6', texto: 'III' }
        };

        const tema = temaPorNivel[nivel] || temaPorNivel[1];
        const sigla = String(tipoBase || 'C').slice(0, 1).toUpperCase();
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32" shape-rendering="crispEdges">
                <rect x="6" y="20" width="20" height="8" fill="#3d2b1f"/>
                <rect x="8" y="6" width="16" height="14" rx="2" ry="2" fill="${tema.fundo}"/>
                <rect x="10" y="8" width="12" height="4" fill="${tema.detalhe}"/>
                <rect x="12" y="14" width="8" height="4" fill="${tema.brilho}"/>
                <text x="16" y="18" text-anchor="middle" font-size="6" font-family="monospace" fill="#101010">${sigla}</text>
                <text x="16" y="30" text-anchor="middle" font-size="5" font-family="monospace" fill="#ffffff">${tema.texto}</text>
            </svg>
        `;
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }

    function obterSpriteCraftNivel(nivel = 1, tipoBase = 'item') {
        return SPRITES_CRAFT[nivel] || gerarSpriteCraftNivel(nivel, tipoBase);
    }

    function criarElementoCraft(craft, nivel = 1) {
        const el = document.createElement('img');
        el.className = 'craft-ativo';
        el.style.position = 'absolute';
        el.style.width = '32px';
        el.style.height = '32px';
        el.style.imageRendering = 'pixelated';
        el.style.pointerEvents = 'none';
        el.style.zIndex = String(12 + nivel);
        el.dataset.craftId = String(craft.id);
        el.dataset.craftNivel = String(nivel);
        return el;
    }

    function criarSistemaCraftingJogador(opcoes = {}) {
        const {
            controle,
            config = {},
            elemento,
            salvarInventario = () => {},
            acaoAtiva = () => false,
            consumirAcao = () => {},
            flashElement = undefined
        } = opcoes;

        if (!controle || !elemento) {
            throw new Error('Controle e elemento do jogador são obrigatórios para o sistema de crafting.');
        }

        if (typeof window.removerTodosCrafts === 'function') {
            window.removerTodosCrafts();
        }

        window.craftsAtivos = [];

        controle.craftPreviewAtivo = false;
        controle.craftPreviewVisual = null;
        controle.craftPreviewPosicao = null;
        controle.craftPreviewTipo = null;
        controle.craftPreviewOrigem = null;

        function obterNomeFaseAtual() {
            return String(window.faseAtualNome || '').trim().toLowerCase();
        }

        function obterCraftPersistido() {
            const craft = lerCraftPersistidoStorage();
            if (!craft || typeof craft !== 'object') return null;

            const x = Number(craft.x);
            const y = Number(craft.y);
            const nivel = Math.max(1, Math.min(NIVEL_MAXIMO_CRAFT, Number(craft.nivel || 1)));
            if (!Number.isFinite(x) || !Number.isFinite(y)) return null;

            return {
                id: String(craft.id || 'craft-persistente'),
                fase: String(craft.fase || '').trim().toLowerCase(),
                faseOriginal: String(craft.faseOriginal || craft.fase || '').trim(),
                posicaoGrid: String(craft.posicaoGrid || ''),
                x,
                y,
                largura: 32,
                altura: 32,
                nivel,
                tipoBase: String(craft.tipoBase || 'item'),
                elementos: []
            };
        }

        function salvarCraftPersistido(craft) {
            const faseOriginal = String(window.faseAtualNome || '').trim();
            if (!craft || !faseOriginal) return false;

            const posicaoGrid = typeof window.ViewportUtils?.pixelsParaGrid === 'function'
                ? window.ViewportUtils.pixelsParaGrid(craft.x, craft.y)
                : '';

            const registro = {
                id: String(craft.id || 'craft-persistente'),
                fase: faseOriginal.toLowerCase(),
                faseOriginal,
                posicaoGrid,
                x: Number(craft.x || 0),
                y: Number(craft.y || 0),
                nivel: Math.max(1, Math.min(NIVEL_MAXIMO_CRAFT, Number(craft.nivel || 1))),
                tipoBase: String(craft.tipoBase || 'item')
            };

            try {
                localStorage.setItem(CRAFT_PERSISTENCE_KEY, JSON.stringify(registro));
                return true;
            } catch (error) {
                console.warn('Craft: falha ao salvar base persistida.', error);
                return false;
            }
        }

        function limparCraftPersistido() {
            try {
                localStorage.removeItem(CRAFT_PERSISTENCE_KEY);
            } catch (error) {
                console.warn('Craft: falha ao limpar base persistida.', error);
            }
        }

        function existeBasePersistidaEmOutraFase() {
            const craft = obterCraftPersistido();
            const faseAtual = obterNomeFaseAtual();
            return !!(craft && craft.fase && faseAtual && craft.fase !== faseAtual);
        }

        function restaurarCraftPersistenteDaFaseAtual() {
            const craftPersistido = obterCraftPersistido();
            const faseAtual = obterNomeFaseAtual();

            if (!craftPersistido || !faseAtual || craftPersistido.fase !== faseAtual) {
                return false;
            }

            if (!Array.isArray(window.craftsAtivos)) {
                window.craftsAtivos = [];
            }

            const existente = encontrarCraftNaPosicao(craftPersistido.x, craftPersistido.y);
            if (existente) {
                existente.nivel = craftPersistido.nivel;
                existente.tipoBase = craftPersistido.tipoBase;
                atualizarVisualCraft(existente);
                return true;
            }

            const craft = {
                ...craftPersistido,
                elementos: []
            };

            window.craftsAtivos.push(craft);
            atualizarVisualCraft(craft);
            return true;
        }

        function obterUltimoItemInventario() {
            if (!Array.isArray(controle.inventario) || controle.inventario.length === 0) return null;
            return controle.inventario[controle.inventario.length - 1] || null;
        }

        function obterFonteItemParaCraft() {
            if (Array.isArray(controle.coleteSlots)) {
                const indiceColete = controle.coleteSlots.findIndex(slot => slot?.tipo);
                if (indiceColete >= 0) {
                    const slotColete = controle.coleteSlots[indiceColete];
                    return {
                        origem: 'colete',
                        indice: indiceColete,
                        tipo: slotColete.tipo,
                        dados: slotColete.dados || {}
                    };
                }
            }

            const slotCinto = typeof window.obterSlotCinto === 'function'
                ? window.obterSlotCinto()
                : (controle.cintoSlot || null);

            if (slotCinto?.tipo) {
                return {
                    origem: 'cinto',
                    tipo: slotCinto.tipo,
                    dados: slotCinto.dados || {}
                };
            }

            const tipoInventario = obterUltimoItemInventario();
            if (tipoInventario) {
                return {
                    origem: 'inventario',
                    tipo: tipoInventario,
                    dados: {}
                };
            }

            return null;
        }

        function obterPosicaoCraftNoGrid() {
            const xCru = Math.floor((controle.x + ((controle.largura || 32) / 2)) / TILE_SIZE) * TILE_SIZE;
            const yCru = Math.floor((controle.y + 1) / TILE_SIZE) * TILE_SIZE;

            if (typeof limitarPosicaoAoPalco === 'function') {
                const ajustada = limitarPosicaoAoPalco(xCru, yCru, TILE_SIZE, TILE_SIZE);
                return { x: ajustada.x, y: ajustada.y };
            }

            return { x: xCru, y: yCru };
        }

        function encontrarCraftNaPosicao(x, y) {
            return (window.craftsAtivos || []).find((craft) => craft && craft.x === x && craft.y === y) || null;
        }

        function podeConsumirItemParaCraft(fonte) {
            const tipo = typeof fonte === 'string' ? fonte : fonte?.tipo;
            const origem = typeof fonte === 'string' ? null : fonte?.origem;

            if (!tipo) {
                console.log('Craft: nenhum item disponível para usar no craft.');
                return false;
            }

            if (tipo === 'colete' && origem === 'inventario' && Array.isArray(controle.coleteSlots) && controle.coleteSlots.some(Boolean)) {
                console.log('Craft: esvazie os Slots do Colete antes de usar o colete equipado no craft.');
                return false;
            }

            if (tipo === 'cinto' && origem === 'inventario') {
                console.log('Craft: o cinto equipado no corpo não pode ser usado no craft.');
                return false;
            }

            return true;
        }

        function consumirItemDoInventarioParaCraft(fonte) {
            const tipo = typeof fonte === 'string' ? fonte : fonte?.tipo;
            if (!podeConsumirItemParaCraft(fonte)) return false;

            if (fonte?.origem === 'colete') {
                const indice = Number(fonte.indice);
                if (!Array.isArray(controle.coleteSlots) || indice < 0) return false;
                const slot = controle.coleteSlots[indice];
                if (!slot || slot.tipo !== tipo) return false;
                controle.coleteSlots[indice] = null;
                salvarInventario();
                if (typeof window.atualizarMochilaUI === 'function') window.atualizarMochilaUI(controle);
                return true;
            }

            if (fonte?.origem === 'cinto') {
                const slotCinto = typeof window.obterSlotCinto === 'function'
                    ? window.obterSlotCinto()
                    : controle.cintoSlot;
                if (!slotCinto || slotCinto.tipo !== tipo) return false;
                controle.cintoSlot = null;
                salvarInventario();
                if (typeof window.atualizarMochilaUI === 'function') window.atualizarMochilaUI(controle);
                return true;
            }

            if (!Array.isArray(controle.inventario) || controle.inventario.length === 0) return false;

            const ultimo = controle.inventario[controle.inventario.length - 1];
            if (ultimo !== tipo) return false;

            const precisaRemocaoVisual = ['revolver', 'escudo', 'bota', 'jetpack', 'garra', 'cinto', 'colete'].includes(tipo);
            if (precisaRemocaoVisual && typeof window.removerItemDoCorpoSemDropar === 'function') {
                const removeu = window.removerItemDoCorpoSemDropar(tipo);
                if (!removeu) return false;
            }

            controle.inventario.pop();
            salvarInventario();
            return true;
        }

        function obterSpritePreviewItem(tipo) {
            return obterSpriteCraftNivel(1, tipo);
        }

        function limparPreviewCraft() {
            if (controle.craftPreviewVisual?.remove) {
                controle.craftPreviewVisual.remove();
            }
            controle.craftPreviewVisual = null;
            controle.craftPreviewAtivo = false;
            controle.craftPreviewPosicao = null;
            controle.craftPreviewTipo = null;
            controle.craftPreviewOrigem = null;
        }

        function areaValidaParaNovoCraft(posicao) {
            if (!posicao) return false;
            if (encontrarCraftNaPosicao(posicao.x, posicao.y)) return false;
            if (typeof window.verificarAreaTotalmenteLivre === 'function') {
                return window.verificarAreaTotalmenteLivre(posicao.x, posicao.y, TILE_SIZE, TILE_SIZE);
            }
            return true;
        }

        function atualizarVisualCraft(craft) {
            if (!craft) return;
            if (!Array.isArray(craft.elementos)) {
                craft.elementos = [];
            }

            const palco = document.getElementById('game-stage') || document.getElementById('jogo-container');

            for (let nivel = 1; nivel <= craft.nivel; nivel++) {
                let camada = craft.elementos[nivel - 1];
                if (!camada) {
                    camada = criarElementoCraft(craft, nivel);
                    craft.elementos[nivel - 1] = camada;

                    if (typeof adicionarAoLayer === 'function' && window.LAYERS?.DECORACOES) {
                        adicionarAoLayer(camada, window.LAYERS.DECORACOES);
                    } else if (palco) {
                        palco.appendChild(camada);
                    }
                }

                const deslocamentoY = 0;
                camada.src = obterSpriteCraftNivel(nivel, craft.tipoBase);
                camada.style.left = `${craft.x}px`;
                camada.style.bottom = `${craft.y + deslocamentoY}px`;
                camada.style.display = 'block';
            }

            craft.elementos.forEach((camada, indice) => {
                if (!camada) return;
                camada.style.display = indice < craft.nivel ? 'block' : 'none';
            });
        }

        function iniciarPreviewCraft() {
            const fonte = obterFonteItemParaCraft();
            const tipo = fonte?.tipo || null;
            const posicao = obterPosicaoCraftNoGrid();
            const faseAtual = obterNomeFaseAtual();
            const craftPersistido = obterCraftPersistido();

            if (!podeConsumirItemParaCraft(fonte)) return false;
            if (!areaValidaParaNovoCraft(posicao)) {
                if (typeof flashElement === 'function') {
                    flashElement(elemento, 120, 4);
                }
                return false;
            }

            if (craftPersistido && craftPersistido.fase === faseAtual) {
                restaurarCraftPersistenteDaFaseAtual();
                if (typeof flashElement === 'function') {
                    flashElement(elemento, 120, 4);
                }
                console.log('Craft: a base única desta campanha já está instalada nesta fase.');
                return false;
            }

            if (existeBasePersistidaEmOutraFase()) {
                if (typeof flashElement === 'function') {
                    flashElement(elemento, 120, 4);
                }
                console.log(`Craft: a base única já foi instalada em ${craftPersistido?.faseOriginal || craftPersistido?.fase || 'outra fase'}.`);
                return false;
            }

            limparPreviewCraft();
            controle.craftPreviewAtivo = true;
            controle.craftPreviewTipo = tipo;
            controle.craftPreviewOrigem = fonte;
            controle.craftPreviewPosicao = posicao;
            controle.craftPreviewVisual = typeof window.criarVisualFantasma === 'function'
                ? window.criarVisualFantasma({
                    src: obterSpritePreviewItem(tipo),
                    x: posicao.x,
                    y: posicao.y,
                    layer: window.LAYERS?.EFEITOS,
                    zIndex: 28
                })
                : criarElementoCraft({ id: 'preview', x: posicao.x, y: posicao.y, nivel: 1, tipoBase: tipo });

            if (controle.craftPreviewVisual && !controle.craftPreviewVisual.parentElement) {
                const palco = document.getElementById('game-stage') || document.getElementById('jogo-container');
                palco?.appendChild(controle.craftPreviewVisual);
            }

            return true;
        }

        function confirmarCraftNivel1() {
            if (!controle.craftPreviewAtivo || !controle.craftPreviewPosicao || !controle.craftPreviewTipo) return false;
            if (!areaValidaParaNovoCraft(controle.craftPreviewPosicao)) {
                limparPreviewCraft();
                return false;
            }

            const fonteConsumida = controle.craftPreviewOrigem || obterFonteItemParaCraft();
            const tipoConsumido = fonteConsumida?.tipo || controle.craftPreviewTipo;
            if (!consumirItemDoInventarioParaCraft(fonteConsumida)) {
                return false;
            }

            const craft = {
                id: `craft-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                x: controle.craftPreviewPosicao.x,
                y: controle.craftPreviewPosicao.y,
                largura: 32,
                altura: 32,
                nivel: 1,
                tipoBase: tipoConsumido,
                elementos: []
            };

            window.craftsAtivos.push(craft);
            atualizarVisualCraft(craft);
            salvarCraftPersistido(craft);
            limparPreviewCraft();
            return true;
        }

        function evoluirCraftExistente(craft) {
            if (!craft) return false;
            if (craft.nivel >= NIVEL_MAXIMO_CRAFT) return true;

            const fonteConsumida = obterFonteItemParaCraft();
            if (!fonteConsumida?.tipo) {
                return false;
            }

            if (!consumirItemDoInventarioParaCraft(fonteConsumida)) {
                return false;
            }

            craft.nivel = Math.min(NIVEL_MAXIMO_CRAFT, craft.nivel + 1);
            atualizarVisualCraft(craft);
            salvarCraftPersistido(craft);
            return true;
        }

        function cancelarCraftSeInvalido() {
            if (!controle.craftPreviewAtivo) return false;

            const estadoInvalido = !controle.estaAgachado
                || !controle.noChao
                || !!controle.stunned
                || !!controle.vendaEmCurso
                || !!window.isPaused
                || !!window.isMenuOpen
                || !!window.isSkillMenuOpen
                || !!window.isMochilaMenuOpen
                || acaoAtiva('pulo');

            if (estadoInvalido) {
                limparPreviewCraft();
                return true;
            }

            const posicaoAtual = obterPosicaoCraftNoGrid();
            if (!areaValidaParaNovoCraft(posicaoAtual)) {
                limparPreviewCraft();
                return true;
            }

            const fonteAtual = obterFonteItemParaCraft();
            if (!fonteAtual?.tipo) {
                limparPreviewCraft();
                return true;
            }

            controle.craftPreviewPosicao = posicaoAtual;
            controle.craftPreviewTipo = fonteAtual.tipo;
            controle.craftPreviewOrigem = fonteAtual;

            if (controle.craftPreviewVisual) {
                controle.craftPreviewVisual.src = obterSpritePreviewItem(controle.craftPreviewTipo);
                controle.craftPreviewVisual.style.left = `${posicaoAtual.x}px`;
                controle.craftPreviewVisual.style.bottom = `${posicaoAtual.y}px`;
            }

            return false;
        }

        function processarInteracaoCraft() {
            cancelarCraftSeInvalido();

            if (!acaoAtiva('interagir')) return false;
            consumirAcao('interagir');

            if (window.isPaused || window.isMenuOpen || window.isSkillMenuOpen || window.isMochilaMenuOpen) return false;
            if (controle.stunned || controle.vendaEmCurso || !controle.noChao || !controle.estaAgachado) {
                limparPreviewCraft();
                return false;
            }

            const posicao = obterPosicaoCraftNoGrid();
            const craftExistente = encontrarCraftNaPosicao(posicao.x, posicao.y);
            if (craftExistente) {
                return evoluirCraftExistente(craftExistente);
            }

            if (controle.craftPreviewAtivo) {
                return confirmarCraftNivel1();
            }

            return iniciarPreviewCraft();
        }

        function removerTodosCrafts(removerPersistencia = false) {
            if (!Array.isArray(window.craftsAtivos)) {
                window.craftsAtivos = [];
                if (removerPersistencia) limparCraftPersistido();
                return;
            }
            window.craftsAtivos.forEach((craft) => {
                if (Array.isArray(craft?.elementos)) {
                    craft.elementos.forEach((camada) => camada?.remove?.());
                }
            });
            window.craftsAtivos = [];
            limparPreviewCraft();
            if (removerPersistencia) {
                limparCraftPersistido();
            }
        }

        window.limparCraftPersistido = limparCraftPersistido;
        window.restaurarCraftPersistenteDaFaseAtual = restaurarCraftPersistenteDaFaseAtual;
        window.removerTodosCrafts = removerTodosCrafts;
        window.obterCraftNaPosicao = encontrarCraftNaPosicao;
        window.obterCraftPersistido = obterCraftPersistido;

        return {
            processarInteracaoCraft,
            limparPreviewCraft,
            removerTodosCrafts,
            restaurarCraftPersistenteDaFaseAtual
        };
    }

    window.criarSistemaCraftingJogador = criarSistemaCraftingJogador;
})();