(function () {
    const INVENTARIO_STORAGE_KEY = 'plataformaInventario';
    const INVENTARIO_RUNTIME_KEY = '__plataformaInventarioRuntime';
    const CHECKPOINT_EQUIPAMENTO_STORAGE_KEY = 'plataformaCheckpointEquipamento';
    const COLETE_CONFIG_PADRAO = {
        capacidade: 6,
        itens: {
            revolver: { permitidoNoColete: true, equipavel: true, usarSoSePrecisar: true },
            escudo: { permitidoNoColete: true, equipavel: true, usarSoSePrecisar: true },
            bota: { permitidoNoColete: true, equipavel: true, usarSoSePrecisar: true },
            jetpack: { permitidoNoColete: true, equipavel: true, usarSoSePrecisar: true },
            garra: { permitidoNoColete: true, equipavel: true, usarSoSePrecisar: true },
            cinto: { permitidoNoColete: true, equipavel: true, usarSoSePrecisar: true },
            colete: { permitidoNoColete: true, equipavel: true, usarSoSePrecisar: true },
            restauracao: { permitidoNoColete: true, consumivel: true, usarSoSePrecisar: true },
            base_portatil: { permitidoNoColete: true, consumivel: true, usarSoSePrecisar: true }
        }
    };

    function normalizarConfigColete(raw = {}) {
        const base = JSON.parse(JSON.stringify(COLETE_CONFIG_PADRAO));
        const capacidade = Number(raw?.capacidade);
        if (Number.isFinite(capacidade) && capacidade > 0) {
            base.capacidade = Math.max(1, Math.floor(capacidade));
        }

        if (raw?.itens && typeof raw.itens === 'object') {
            Object.entries(raw.itens).forEach(([tipo, regras]) => {
                base.itens[tipo] = {
                    ...(base.itens[tipo] || {}),
                    ...(regras || {})
                };
            });
        }

        return base;
    }

    async function carregarConfigColete() {
        if (window.coleteConfig) return window.coleteConfig;

        try {
            const resposta = await fetch('../../config/colete-itens.json');
            if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
            const dados = await resposta.json();
            window.coleteConfig = normalizarConfigColete(dados);
        } catch (error) {
            console.warn('Colete: usando configuração padrão do colete.', error);
            window.coleteConfig = normalizarConfigColete();
        }

        return window.coleteConfig;
    }

    function obterCapacidadeColete() {
        return Math.max(1, Number(window.coleteConfig?.capacidade ?? COLETE_CONFIG_PADRAO.capacidade));
    }

    function normalizarEntradaArmazenada(slot = null) {
        if (!slot) return null;

        const raw = (typeof slot === 'string') ? { tipo: slot } : slot;
        const tipo = raw?.tipo || raw?.id || null;
        const regra = obterRegraColete(tipo) || {};
        const itemData = (tipo && window.itemDefinitions && window.itemDefinitions[tipo]) ? window.itemDefinitions[tipo] : null;
        const dadosOriginais = (raw?.dados && typeof raw.dados === 'object') ? raw.dados : {};

        return {
            tipo,
            nome: raw?.nome || itemData?.nome || tipo || 'Item',
            spriteColetavel: raw?.spriteColetavel || itemData?.spriteColetavel || obterSpriteItem(tipo, window.config || {}) || '',
            spriteEquipado: raw?.spriteEquipado || itemData?.spriteEquipado || '',
            consumivel: raw?.consumivel != null
                ? !!raw.consumivel
                : !!(itemData?.consumivel || regra.consumivel || tipo === 'restauracao' || tipo === 'base_portatil'),
            usarSoSePrecisar: raw?.usarSoSePrecisar != null
                ? !!raw.usarSoSePrecisar
                : !!(regra.usarSoSePrecisar || tipo === 'restauracao' || tipo === 'base_portatil'),
            dados: {
                ...dadosOriginais,
                municao: Number.isFinite(Number(raw?.municao ?? dadosOriginais?.municao)) ? Number(raw?.municao ?? dadosOriginais?.municao) : undefined,
                escudoProtegido: Number.isFinite(Number(raw?.escudoProtegido ?? dadosOriginais?.escudoProtegido)) ? Number(raw?.escudoProtegido ?? dadosOriginais?.escudoProtegido) : undefined,
                escudoVermelho: !!(raw?.escudoVermelho ?? dadosOriginais?.escudoVermelho),
                botaUsosDash: Number.isFinite(Number(raw?.botaUsosDash ?? dadosOriginais?.botaUsosDash)) ? Number(raw?.botaUsosDash ?? dadosOriginais?.botaUsosDash) : undefined,
                botaVermelha: !!(raw?.botaVermelha ?? dadosOriginais?.botaVermelha),
                garraImpactosSolidos: Number.isFinite(Number(raw?.garraImpactosSolidos ?? dadosOriginais?.garraImpactosSolidos)) ? Number(raw?.garraImpactosSolidos ?? dadosOriginais?.garraImpactosSolidos) : undefined,
                garraVermelha: !!(raw?.garraVermelha ?? dadosOriginais?.garraVermelha),
                craftNivel: Number.isFinite(Number(raw?.craftNivel ?? dadosOriginais?.craftNivel)) ? Number(raw?.craftNivel ?? dadosOriginais?.craftNivel) : undefined,
                craftTipoBase: raw?.craftTipoBase || dadosOriginais?.craftTipoBase,
                craftModoRenascimento: raw?.craftModoRenascimento || dadosOriginais?.craftModoRenascimento || null
            }
        };
    }

    function normalizarSlotsColete(slots = null) {
        const capacidade = obterCapacidadeColete();
        const base = Array.isArray(slots) ? [...slots] : [];

        while (base.length < capacidade) {
            base.push(null);
        }

        return base.slice(0, capacidade).map((slot) => normalizarEntradaArmazenada(slot));
    }

    function obterRegraColete(tipo) {
        return window.coleteConfig?.itens?.[tipo] || COLETE_CONFIG_PADRAO.itens?.[tipo] || null;
    }

    function itemPodeIrParaColete(tipo) {
        return !!obterRegraColete(tipo)?.permitidoNoColete;
    }

    function criarEntradaColete(item = {}, itemData = null) {
        const tipo = item?.tipo || itemData?.id || null;
        const regra = obterRegraColete(tipo) || {};
        const dadosOriginais = (item?.dados && typeof item.dados === 'object') ? item.dados : {};
        return {
            tipo,
            nome: itemData?.nome || item?.nome || tipo || 'Item',
            spriteColetavel: itemData?.spriteColetavel || item?.spriteColetavel || '',
            spriteEquipado: itemData?.spriteEquipado || item?.spriteEquipado || '',
            consumivel: !!(itemData?.consumivel || regra.consumivel),
            usarSoSePrecisar: !!regra.usarSoSePrecisar,
            dados: {
                ...dadosOriginais,
                municao: Number.isFinite(Number(item?.municao ?? dadosOriginais?.municao)) ? Number(item?.municao ?? dadosOriginais?.municao) : undefined,
                escudoProtegido: Number.isFinite(Number(item?.escudoProtegido ?? dadosOriginais?.escudoProtegido)) ? Number(item?.escudoProtegido ?? dadosOriginais?.escudoProtegido) : undefined,
                escudoVermelho: !!(item?.escudoVermelho ?? dadosOriginais?.escudoVermelho),
                botaUsosDash: Number.isFinite(Number(item?.botaUsosDash ?? dadosOriginais?.botaUsosDash)) ? Number(item?.botaUsosDash ?? dadosOriginais?.botaUsosDash) : undefined,
                botaVermelha: !!(item?.botaVermelha ?? dadosOriginais?.botaVermelha),
                garraImpactosSolidos: Number.isFinite(Number(item?.garraImpactosSolidos ?? dadosOriginais?.garraImpactosSolidos)) ? Number(item?.garraImpactosSolidos ?? dadosOriginais?.garraImpactosSolidos) : undefined,
                garraVermelha: !!(item?.garraVermelha ?? dadosOriginais?.garraVermelha),
                craftNivel: Number.isFinite(Number(item?.craftNivel ?? dadosOriginais?.craftNivel)) ? Number(item?.craftNivel ?? dadosOriginais?.craftNivel) : undefined,
                craftTipoBase: item?.craftTipoBase || dadosOriginais?.craftTipoBase,
                craftModoRenascimento: item?.craftModoRenascimento || dadosOriginais?.craftModoRenascimento || null
            }
        };
    }

    function lerEstadoInventarioDoStorage(storageKey = INVENTARIO_STORAGE_KEY) {
        try {
            const raw = localStorage.getItem(storageKey);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (error) {
            console.error(`Erro ao ler inventário salvo (${storageKey}):`, error);
            return null;
        }
    }

    function lerEstadoInventarioRuntime() {
        const estado = window[INVENTARIO_RUNTIME_KEY];
        return estado && typeof estado === 'object'
            ? JSON.parse(JSON.stringify(estado))
            : null;
    }

    function salvarEstadoInventarioRuntime(estado) {
        window[INVENTARIO_RUNTIME_KEY] = estado && typeof estado === 'object'
            ? JSON.parse(JSON.stringify(estado))
            : null;
        return true;
    }

    function serializarInventarioDoControle(controle) {
        if (!controle) return null;

        return {
            temEscudo: !!controle.temEscudo,
            escudoVermelho: !!controle.escudoVermelho,
            escudoProtegido: Number(controle.escudoProtegido || 0),
            temArma: !!controle.temArma,
            municao: Number(controle.municao || 0),
            temBota: !!controle.temBota,
            botaVermelha: !!controle.botaVermelha,
            botaUsosDash: Number(controle.botaUsosDash || 0),
            temJetpack: !!controle.temJetpack,
            temCinto: !!controle.temCinto,
            temGarra: !!controle.temGarra,
            garraVermelha: !!controle.garraVermelha,
            garraImpactosSolidos: Number(controle.garraImpactosSolidos || 0),
            temColete: !!controle.temColete,
            inventario: Array.isArray(controle.inventario) ? [...controle.inventario] : [],
            coleteSlots: normalizarSlotsColete(controle.coleteSlots),
            cintoSlot: normalizarEntradaArmazenada(controle.cintoSlot)
        };
    }

    function inventarioTemConteudo(estado = null) {
        if (!estado || typeof estado !== 'object') return false;

        return !!(
            estado.temEscudo
            || estado.temArma
            || estado.temBota
            || estado.temJetpack
            || estado.temCinto
            || estado.temGarra
            || estado.temColete
            || Number(estado.municao || 0) > 0
            || (Array.isArray(estado.inventario) && estado.inventario.length > 0)
            || (Array.isArray(estado.coleteSlots) && estado.coleteSlots.some(Boolean))
            || estado.cintoSlot
        );
    }

    function carregarInventarioSalvo() {
        const runtime = lerEstadoInventarioRuntime();
        const checkpoint = carregarCheckpointEquipamentoSalvo();

        // Se estamos em uma transição vitoriosa de fase, o runtime (progresso acumulado) é a prioridade.
        if (window.__transicaoFaseAtiva && inventarioTemConteudo(runtime)) {
            return runtime;
        }

        // Se morremos ou reiniciamos, o checkpoint da base é a única fonte de verdade para persistência.
        return checkpoint;
    }

    function podePersistirDados() {
        // Só permite salvar no disco (localStorage) se houver uma base instalada no nível atual.
        const temBase = Array.isArray(window.craftsAtivos) && window.craftsAtivos.length > 0;
        
        // Permite salvar se houver uma transição de fase ou evento forçado (checkpoint/fim de fase).
        const salvamentoForcado = !!window.__forcarSalvarInventario;
        return temBase || salvamentoForcado;
    }

    function carregarCheckpointEquipamentoSalvo() {
        const checkpoint = lerEstadoInventarioDoStorage(CHECKPOINT_EQUIPAMENTO_STORAGE_KEY);
        return checkpoint && typeof checkpoint === 'object' ? checkpoint : null;
    }

    function salvarInventarioDoControle(controle, storageKey = INVENTARIO_STORAGE_KEY) {
        if (!controle) return false;
        try {
            const estado = serializarInventarioDoControle(controle);
            if (!estado) return false;

            if (storageKey === INVENTARIO_STORAGE_KEY) {
                salvarEstadoInventarioRuntime(estado);
                
                // Só persiste no localStorage se as condições de "Base Instalada" forem atendidas.
                if (podePersistirDados()) {
                    localStorage.setItem(INVENTARIO_STORAGE_KEY, JSON.stringify(estado));
                }
                return true;
            }

            localStorage.setItem(storageKey, JSON.stringify(estado));
            return true;
        } catch (error) {
            console.error(`Erro ao salvar inventário (${storageKey}):`, error);
            return false;
        }
    }

    function salvarCheckpointEquipamentoDoControle(controle, extras = {}) {
        if (!controle) {
            return { ok: false, motivo: 'Controle do jogador indisponível.' };
        }

        try {
            const estado = {
                ...serializarInventarioDoControle(controle),
                salvoEm: Date.now(),
                craftId: String(extras?.craftId || ''),
                fase: String(extras?.fase || window.faseAtualNome || ''),
                nivelBase: Number(extras?.nivelBase || 0)
            };

            localStorage.setItem(CHECKPOINT_EQUIPAMENTO_STORAGE_KEY, JSON.stringify(estado));
            return {
                ok: true,
                motivo: 'Equipamento salvo nesta base. O personagem renascerá com esse loadout.'
            };
        } catch (error) {
            console.error('Erro ao salvar checkpoint de equipamento:', error);
            return { ok: false, motivo: 'Falha ao salvar o checkpoint de equipamento.' };
        }
    }

    function aplicarCheckpointEquipamentoComoInventarioPadrao() {
        const checkpoint = carregarCheckpointEquipamentoSalvo();
        if (!checkpoint) {
            salvarEstadoInventarioRuntime(null);
            try {
                localStorage.removeItem(INVENTARIO_STORAGE_KEY);
            } catch (_) {}
            return false;
        }

        try {
            const estado = {
                ...checkpoint,
                inventario: Array.isArray(checkpoint.inventario) ? [...checkpoint.inventario] : [],
                coleteSlots: normalizarSlotsColete(checkpoint.coleteSlots),
                cintoSlot: normalizarEntradaArmazenada(checkpoint.cintoSlot)
            };

            salvarEstadoInventarioRuntime(estado);
            localStorage.removeItem(INVENTARIO_STORAGE_KEY);
            return true;
        } catch (error) {
            console.error('Erro ao aplicar checkpoint de equipamento:', error);
            return false;
        }
    }

    function limparInventarioSalvo() {
        window[INVENTARIO_RUNTIME_KEY] = null;
        localStorage.removeItem(INVENTARIO_RUNTIME_KEY); // Limpeza extra de segurança
        localStorage.removeItem(INVENTARIO_STORAGE_KEY);
    }

    function limparCheckpointEquipamentoSalvo() {
        localStorage.removeItem(CHECKPOINT_EQUIPAMENTO_STORAGE_KEY);
    }

    function aplicarInventarioSalvoNoControle(controle, inventarioSalvo = carregarInventarioSalvo()) {
        if (!controle || !inventarioSalvo || typeof inventarioSalvo !== 'object') return;

        controle.temEscudo = !!inventarioSalvo.temEscudo;
        controle.escudoVermelho = !!inventarioSalvo.escudoVermelho;
        controle.escudoProtegido = Number(inventarioSalvo.escudoProtegido || 0);
        controle.temArma = !!inventarioSalvo.temArma;
        controle.municao = Number(inventarioSalvo.municao || 0);
        controle.temBota = !!inventarioSalvo.temBota;
        controle.botaVermelha = !!inventarioSalvo.botaVermelha;
        controle.botaUsosDash = Number(inventarioSalvo.botaUsosDash || 0);
        controle.temJetpack = !!inventarioSalvo.temJetpack;
        controle.temCinto = !!inventarioSalvo.temCinto;
        controle.temGarra = !!inventarioSalvo.temGarra;
        controle.garraVermelha = !!inventarioSalvo.garraVermelha;
        controle.garraImpactosSolidos = Number(inventarioSalvo.garraImpactosSolidos || 0);
        controle.temColete = !!inventarioSalvo.temColete;
        controle.inventario = Array.isArray(inventarioSalvo.inventario) ? [...inventarioSalvo.inventario] : [];
        controle.coleteSlots = normalizarSlotsColete(inventarioSalvo.coleteSlots);
        controle.cintoSlot = normalizarEntradaArmazenada(inventarioSalvo.cintoSlot);

        if (controle.inventario.includes('revolver')) controle.temArma = true;
        if (controle.inventario.includes('escudo')) controle.temEscudo = true;
        if (controle.inventario.includes('bota')) controle.temBota = true;
        if (controle.inventario.includes('jetpack')) controle.temJetpack = true;
        if (controle.inventario.includes('garra')) controle.temGarra = true;
        if (controle.inventario.includes('cinto')) controle.temCinto = true;
        if (controle.inventario.includes('colete')) controle.temColete = true;
    }

    function obterSpriteItem(tipo, config = window.config || {}) {
        // Prioridade 1: Definições dinâmicas de itens (JSONs)
        if (window.itemDefinitions && window.itemDefinitions[tipo]) {
            const def = window.itemDefinitions[tipo];
            return def.spriteColetavel || def.spriteEquipado || '';
        }

        // Prioridade 2: Configurações globais ou Fallbacks conhecidos
        if (tipo === 'revolver') return config.spriteItemRevolver || config.spriteArmaPlayer || '../../assets/personagem/revolver_pegavel.png';
        if (tipo === 'escudo') return config.spriteItemEscudo || config.spriteEscudoPlayer || '../../assets/personagem/escudo_pegavel.png';
        if (tipo === 'bota') return config.spriteItemBota || config.spriteBotaParado || '../../assets/personagem/bota_pegavel.png';
        if (tipo === 'jetpack') return config.spriteItemJetpack || config.spriteJetpackPlayer || '../../assets/personagem/jetpack_pegavel.png';
        if (tipo === 'garra') return config.spriteItemGarra || config.spriteGarraPlayer || '../../assets/personagem/garra_coletavel.png';
        if (tipo === 'cinto') return config.spriteItemCinto || config.spriteCintoPlayer || '../../assets/personagem/cinto_coletavel.png';
        if (tipo === 'colete') return config.spriteItemColete || config.spriteColeteParado || '../../assets/personagem/colete_coletavel.png';
        if (tipo === 'restauracao') return '../../assets/personagem/restauracao.png';
        if (tipo === 'base_portatil') {
            return typeof window.obterSpriteCraftNivel === 'function'
                ? window.obterSpriteCraftNivel(1, 'item')
                : '../../assets/craft/craft_nivel1.png';
        }
        return '';
    }

    window.obterSpriteItem = obterSpriteItem;

    function aplicarRestauracaoPadrao(controle, config = {}, callbacks = {}) {
        if (!controle) return;

        controle.municao = Number(config?.maxMunicao ?? window.config?.maxMunicao ?? 5);
        controle.escudoProtegido = 0;
        controle.escudoVermelho = false;
        controle.botaUsosDash = 0;
        controle.botaVermelha = false;
        controle.garraImpactosSolidos = 0;
        controle.garraVermelha = false;
        
        // Suporta tanto o sistema de dano do jogador quanto o de vida dos inimigos
        controle.dano = Math.max(0, Number(controle.dano || 0) - 1);
        if (controle.vida !== undefined) {
            controle.vida = Math.max(0, Number(controle.vida || 0) - 1);
        }

        if (Array.isArray(controle.inventario) && controle.inventario.includes('escudo')) {
            controle.temEscudo = true;
        }
        if (Array.isArray(controle.inventario) && controle.inventario.includes('garra')) {
            controle.temGarra = true;
        }
        if (Array.isArray(controle.inventario) && controle.inventario.includes('revolver')) {
            controle.temArma = true;
        }
        if (Array.isArray(controle.inventario) && controle.inventario.includes('bota')) {
            controle.temBota = true;
        }
        if (Array.isArray(controle.inventario) && controle.inventario.includes('jetpack')) {
            controle.temJetpack = true;
        }
        if (Array.isArray(controle.inventario) && controle.inventario.includes('cinto')) {
            controle.temCinto = true;
        }
        if (Array.isArray(controle.inventario) && controle.inventario.includes('colete')) {
            controle.temColete = true;
        }

        // Sincronização visual para itens que não possuem callbacks dedicados expostos
        const armaElemento = document.getElementById('player-weapon');
        if (armaElemento) {
            armaElemento.style.display = controle.temArma ? 'block' : 'none';
        }

        if (typeof callbacks.atualizarVisualEscudo === 'function') {
            callbacks.atualizarVisualEscudo();
        }
        if (typeof callbacks.atualizarVisualBota === 'function') {
            callbacks.atualizarVisualBota();
        }
        if (typeof callbacks.atualizarVisualGarra === 'function') {
            callbacks.atualizarVisualGarra();
        }
    }

    window.aplicarRestauracaoPadrao = aplicarRestauracaoPadrao;

    function criarSistemaInventarioJogador(opcoes = {}) {
        const {
            controle,
            config,
            atualizarVisualEscudo = () => {},
            getElementos = () => ({})
        } = opcoes;

        if (!controle) {
            throw new Error('Controle do jogador é obrigatório para inicializar o inventário.');
        }

        controle.coleteSlots = normalizarSlotsColete(controle.coleteSlots);
        controle.cintoSlot = normalizarEntradaArmazenada(controle.cintoSlot);
        carregarConfigColete().then(() => {
            controle.coleteSlots = normalizarSlotsColete(controle.coleteSlots);
            controle.cintoSlot = normalizarEntradaArmazenada(controle.cintoSlot);
            if (window.isMochilaMenuOpen && typeof window.atualizarMochilaUI === 'function') {
                window.atualizarMochilaUI(controle);
            }
        }).catch(() => {});

        function obterElementos() {
            return getElementos() || {};
        }

        function atualizarMochilaUI() {
            if (typeof window.atualizarMochilaUI === 'function') {
                window.atualizarMochilaUI(controle);
            }
        }

        function sincronizarElementoComJogador(elemento, offsetY = 0) {
            if (!elemento) return;
            elemento.style.left = controle.x + 'px';
            elemento.style.bottom = (controle.y + offsetY) + 'px';
            elemento.style.transform = controle.direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
        }

        function registrarItemNoInventario(tipo) {
            if (!tipo || tipo === 'airdrop' || tipo === 'restauracao') return;
            if (!Array.isArray(controle.inventario)) controle.inventario = [];
            if (!controle.inventario.includes(tipo)) controle.inventario.push(tipo);
        }

        function coleteTemConteudo() {
            return Array.isArray(controle.coleteSlots) && controle.coleteSlots.some(Boolean);
        }

        function salvarInventario() {
            salvarInventarioDoControle(controle);
        }

        function aplicarInventarioSalvo() {
            aplicarInventarioSalvoNoControle(controle);
        }

        function precisaRestauracaoAgora() {
            const maxMunicao = Number(config?.maxMunicao ?? window.config?.maxMunicao ?? 5);
            return (controle.dano || 0) > 0
                || !!controle.escudoVermelho
                || ((controle.temEscudo || controle.escudoVermelho) && (controle.escudoProtegido || 0) > 0)
                || !!controle.botaVermelha
                || ((controle.temBota || controle.botaVermelha) && Number(controle.botaUsosDash || 0) > 0)
                || !!controle.garraVermelha
                || ((controle.temGarra || controle.garraVermelha) && Number(controle.garraImpactosSolidos || 0) > 0)
                || (controle.temArma && (controle.municao || 0) < maxMunicao);
        }

        function itemJaAtivoNoCorpo(tipo) {
            if (tipo === 'revolver') return !!controle.temArma;
            if (tipo === 'escudo') return !!controle.temEscudo || !!controle.escudoVermelho;
            if (tipo === 'bota') return !!controle.temBota;
            if (tipo === 'jetpack') return !!controle.temJetpack;
            if (tipo === 'garra') return !!controle.temGarra;
            if (tipo === 'cinto') return !!controle.temCinto;
            if (tipo === 'colete') return !!controle.temColete;
            return false;
        }

        function precisaDeItemAgora(tipo) {
            if (tipo === 'restauracao') return precisaRestauracaoAgora();
            if (tipo === 'base_portatil') {
                return typeof window.podeInstalarBasePortatil === 'function'
                    ? window.podeInstalarBasePortatil()
                    : true;
            }
            if (tipo === 'revolver') {
                const maxMunicao = Number(config?.maxMunicao ?? window.config?.maxMunicao ?? 5);
                return !controle.temArma || Number(controle.municao || 0) < maxMunicao;
            }
            if (tipo === 'escudo') {
                return !controle.temEscudo || !!controle.escudoVermelho || Number(controle.escudoProtegido || 0) > 0;
            }
            if (tipo === 'bota') {
                return !controle.temBota || !!controle.botaVermelha || Number(controle.botaUsosDash || 0) > 0;
            }
            if (tipo === 'garra') {
                return !controle.temGarra || !!controle.garraVermelha || Number(controle.garraImpactosSolidos || 0) > 0;
            }
            return !itemJaAtivoNoCorpo(tipo);
        }

        function aplicarRestauracao() {
            return window.aplicarRestauracaoPadrao?.(controle, config, {
                atualizarVisualEscudo,
                atualizarVisualBota: window.atualizarVisualBota,
                atualizarVisualGarra: window.atualizarVisualGarra
            });
        }

        function aplicarItemNoCorpo(tipo, itemData = null, extras = {}) {
            const {
                armaElemento,
                escudoElemento,
                botaElemento,
                jetpackElemento,
                jetFogoElemento,
                garraElemento,
                cintoElemento,
                coleteElemento
            } = obterElementos();

            if (tipo === 'restauracao') {
                aplicarRestauracao();
                salvarInventario();
                atualizarMochilaUI();
                return true;
            }

            if (tipo === 'base_portatil') {
                const instalouBase = typeof window.instalarBasePortatilDoSlot === 'function'
                    ? window.instalarBasePortatilDoSlot(extras || {})
                    : false;
                if (!instalouBase) return false;
                salvarInventario();
                atualizarMochilaUI();
                return true;
            }

            if (tipo === 'revolver') {
                controle.temArma = true;
                controle.municao = Number(extras?.municao ?? itemData?.efeitos?.jogador?.municao ?? config?.maxMunicao ?? 5);
                window.AudioManager?.playSFX('recarga', 0.6);
                if (armaElemento) {
                    if (itemData?.spriteEquipado) armaElemento.src = itemData.spriteEquipado;
                    armaElemento.style.display = 'block';
                    sincronizarElementoComJogador(armaElemento);
                }
            } else if (tipo === 'escudo') {
                controle.temEscudo = true;
                controle.escudoVermelho = !!extras?.escudoVermelho;
                controle.escudoProtegido = Number(extras?.escudoProtegido || 0);
                if (escudoElemento) {
                    if (itemData?.spriteEquipado) escudoElemento.src = itemData.spriteEquipado;
                    escudoElemento.style.display = 'block';
                    sincronizarElementoComJogador(escudoElemento);
                }
                atualizarVisualEscudo();
            } else if (tipo === 'bota') {
                controle.temBota = true;
                controle.botaUsosDash = Number(extras?.botaUsosDash || 0);
                controle.botaVermelha = !!extras?.botaVermelha;
                if (botaElemento) {
                    if (itemData?.spriteEquipado) botaElemento.src = itemData.spriteEquipado;
                    botaElemento.style.display = 'block';
                    sincronizarElementoComJogador(botaElemento);
                }
                if (typeof window.atualizarVisualBota === 'function') {
                    window.atualizarVisualBota();
                }
            } else if (tipo === 'jetpack') {
                controle.temJetpack = true;
                controle.timerVooRestante = Number(config?.jetpackDuracaoVoo ?? 360);
                controle.cooldownVooJetpack = 0;
                if (jetpackElemento) {
                    if (itemData?.spriteEquipado) jetpackElemento.src = itemData.spriteEquipado;
                    jetpackElemento.style.display = 'block';
                    sincronizarElementoComJogador(jetpackElemento);
                }
                if (jetFogoElemento) jetFogoElemento.style.display = 'none';
            } else if (tipo === 'garra') {
                controle.temGarra = true;
                controle.garraImpactosSolidos = Number(extras?.garraImpactosSolidos || 0);
                controle.garraVermelha = !!extras?.garraVermelha;
                if (garraElemento) {
                    if (itemData?.spriteEquipado) garraElemento.src = itemData.spriteEquipado;
                    garraElemento.style.display = 'block';
                    sincronizarElementoComJogador(garraElemento);
                }
                if (typeof window.atualizarVisualGarra === 'function') {
                    window.atualizarVisualGarra();
                }
            } else if (tipo === 'cinto') {
                controle.temCinto = true;
                if (cintoElemento) {
                    if (itemData?.spriteEquipado) cintoElemento.src = itemData.spriteEquipado;
                    cintoElemento.style.display = 'block';
                    sincronizarElementoComJogador(cintoElemento);
                }
            } else if (tipo === 'colete') {
                controle.temColete = true;
                if (coleteElemento) {
                    if (itemData?.spriteEquipado) coleteElemento.src = itemData.spriteEquipado;
                    coleteElemento.style.display = 'block';
                    sincronizarElementoComJogador(coleteElemento, (controle.estaAgachado && controle.noChao) ? -6 : 0);
                }
            } else if (itemData?.efeitos?.jogador) {
                Object.entries(itemData.efeitos.jogador).forEach(([chave, valor]) => {
                    if (chave !== 'inventarioAdd') {
                        controle[chave] = valor;
                    }
                });
            } else {
                return false;
            }

            registrarItemNoInventario(tipo);
            salvarInventario();
            atualizarMochilaUI();
            return true;
        }

        function encontrarSlotLivreColete() {
            controle.coleteSlots = normalizarSlotsColete(controle.coleteSlots);
            return controle.coleteSlots.findIndex(slot => !slot);
        }

        function guardarItemNoColete(item, itemData = null) {
            if (!controle.temColete) return false;
            if (!itemPodeIrParaColete(item?.tipo)) return false;

            const indiceLivre = encontrarSlotLivreColete();
            if (indiceLivre < 0) return false;

            controle.coleteSlots[indiceLivre] = criarEntradaColete(item, itemData);
            salvarInventario();
            atualizarMochilaUI();
            return true;
        }

        function obterDadosExtrasDoItemAtivo(tipo) {
            if (tipo === 'revolver') {
                return { municao: controle.municao };
            }
            if (tipo === 'escudo') {
                return {
                    escudoProtegido: controle.escudoProtegido,
                    escudoVermelho: controle.escudoVermelho
                };
            }
            if (tipo === 'bota') {
                return {
                    botaUsosDash: Number(controle.botaUsosDash || 0),
                    botaVermelha: !!controle.botaVermelha
                };
            }
            if (tipo === 'garra') {
                return {
                    garraImpactosSolidos: Number(controle.garraImpactosSolidos || 0),
                    garraVermelha: !!controle.garraVermelha
                };
            }
            return {};
        }

        function removerItemDoCorpoSemDropar(tipo) {
            const {
                armaElemento,
                escudoElemento,
                botaElemento,
                jetpackElemento,
                jetFogoElemento,
                garraElemento,
                cintoElemento,
                coleteElemento
            } = obterElementos();

            if (tipo === 'revolver') {
                controle.temArma = false;
                controle.municao = 0;
                if (armaElemento) armaElemento.style.display = 'none';
                return true;
            }
            if (tipo === 'escudo') {
                controle.temEscudo = false;
                controle.escudoVermelho = false;
                controle.escudoProtegido = 0;
                atualizarVisualEscudo();
                if (escudoElemento) escudoElemento.style.display = 'none';
                return true;
            }
            if (tipo === 'bota') {
                controle.temBota = false;
                controle.botaUsosDash = 0;
                controle.botaVermelha = false;
                if (botaElemento) botaElemento.style.display = 'none';
                if (typeof window.atualizarVisualBota === 'function') {
                    window.atualizarVisualBota();
                }
                return true;
            }
            if (tipo === 'jetpack') {
                controle.temJetpack = false;
                controle.jetpackAtivo = false;
                controle.timerAtivacaoJetpack = 0;
                controle.timerVooRestante = 0;
                controle.cooldownVooJetpack = 0;
                if (jetpackElemento) jetpackElemento.style.display = 'none';
                if (jetFogoElemento) jetFogoElemento.style.display = 'none';
                return true;
            }
            if (tipo === 'garra') {
                controle.temGarra = false;
                controle.garraImpactosSolidos = 0;
                controle.garraVermelha = false;
                if (garraElemento) garraElemento.style.display = 'none';
                if (typeof window.atualizarVisualGarra === 'function') {
                    window.atualizarVisualGarra();
                }
                return true;
            }
            if (tipo === 'cinto') {
                if (obterSlotCinto()) {
                    console.log('Cinto: esvazie o slot central antes de consumir o cinto.');
                    return false;
                }
                controle.temCinto = false;
                if (cintoElemento) cintoElemento.style.display = 'none';
                return true;
            }
            if (tipo === 'colete') {
                if (coleteTemConteudo()) {
                    console.log('Colete: esvazie os slots antes de guardar no cinto.');
                    return false;
                }
                controle.temColete = false;
                if (coleteElemento) coleteElemento.style.display = 'none';
                return true;
            }
            return false;
        }

        function obterItensDisponiveisNoCinto() {
            const itens = [];
            const adicionar = (tipo, ativo) => {
                if (!ativo) return;
                if (tipo === 'colete' && coleteTemConteudo()) return;
                const itemData = window.itemDefinitions?.[tipo] || null;
                itens.push(criarEntradaColete({ tipo, ...obterDadosExtrasDoItemAtivo(tipo) }, itemData));
            };

            adicionar('revolver', controle.temArma);
            adicionar('escudo', controle.temEscudo || controle.escudoVermelho);
            adicionar('bota', controle.temBota);
            adicionar('jetpack', controle.temJetpack);
            adicionar('garra', controle.temGarra);
            adicionar('colete', controle.temColete);
            return itens;
        }

        function obterSlotCinto() {
            controle.cintoSlot = normalizarEntradaArmazenada(controle.cintoSlot);
            return controle.cintoSlot;
        }

        function guardarItemNoCinto(item, itemData = null) {
            if (!controle.temCinto) return false;
            if (!item?.tipo) return false;
            if (!itemPodeIrParaColete(item.tipo)) return false;

            controle.cintoSlot = normalizarEntradaArmazenada(controle.cintoSlot);
            if (controle.cintoSlot) return false;

            controle.cintoSlot = criarEntradaColete(item, itemData);
            salvarInventario();
            atualizarMochilaUI();
            return true;
        }

        function guardarEquipamentoNoCinto(tipo) {
            if (!controle.temCinto || !tipo) return false;
            controle.cintoSlot = normalizarEntradaArmazenada(controle.cintoSlot);
            if (controle.cintoSlot) return false;
            if (!itemJaAtivoNoCorpo(tipo)) return false;

            const itemData = window.itemDefinitions?.[tipo] || null;
            const extras = obterDadosExtrasDoItemAtivo(tipo);
            if (!removerItemDoCorpoSemDropar(tipo)) return false;

            controle.cintoSlot = criarEntradaColete({ tipo, ...extras }, itemData);
            salvarInventario();
            atualizarMochilaUI();
            return true;
        }

        function droparItemDoCinto() {
            controle.cintoSlot = normalizarEntradaArmazenada(controle.cintoSlot);
            const slot = controle.cintoSlot;
            if (!slot) return false;

            const dropou = droparTipoNoMundo(slot.tipo, slot.dados || {});
            if (!dropou) return false;

            controle.cintoSlot = null;
            salvarInventario();
            atualizarMochilaUI();
            return true;
        }

        function usarItemDoCinto() {
            controle.cintoSlot = normalizarEntradaArmazenada(controle.cintoSlot);
            const slot = controle.cintoSlot;
            if (!slot) return false;
            if (!precisaDeItemAgora(slot.tipo)) return false;

            const itemData = window.itemDefinitions?.[slot.tipo] || null;
            const aplicou = aplicarItemNoCorpo(slot.tipo, itemData, slot.dados || {});
            if (!aplicou) return false;

            controle.cintoSlot = null;
            salvarInventario();
            atualizarMochilaUI();
            return true;
        }

        function usarOuDroparItemDoCinto() {
            const slot = obterSlotCinto();
            if (slot?.tipo === 'base_portatil') {
                if (usarItemDoCinto()) {
                    return { acao: 'usado' };
                }
                return { acao: 'nenhum' };
            }

            if (usarItemDoCinto()) {
                return { acao: 'usado' };
            }
            if (droparItemDoCinto()) {
                return { acao: 'dropado' };
            }
            return { acao: 'nenhum' };
        }

        function droparTipoNoMundo(tipo, extras = {}) {
            if (!tipo) return false;

            const direcaoFace = controle.direcao === 'd' ? 1 : -1;
            let dropX = controle.x + (64 * direcaoFace);
            if (typeof limitarPosicaoAoPalco === 'function') {
                const posFinal = limitarPosicaoAoPalco(dropX, controle.y, 32, 32);
                dropX = posFinal.x;
            }

            if (window.itemDefinitions && window.itemDefinitions[tipo] && typeof window.criarItemColetavel === 'function') {
                const itemData = window.itemDefinitions[tipo];
                const novoItem = window.criarItemColetavel(itemData, dropX, controle.y);
                if (extras && typeof extras === 'object') {
                    Object.entries(extras).forEach(([chave, valor]) => {
                        if (valor !== undefined) novoItem[chave] = valor;
                    });
                }
                novoItem.velocidadeY = 5;
                window.itensColetaveis.push(novoItem);
                return true;
            }

            const itemImg = document.createElement('img');
            itemImg.src = obterSpriteItem(tipo, config);
            itemImg.style.position = 'absolute';
            itemImg.style.width = '32px';
            itemImg.style.height = '32px';
            itemImg.style.imageRendering = 'pixelated';
            adicionarAoLayer(itemImg, window.LAYERS.ITENS);

            window.itensColetaveis.push({
                tipo,
                x: dropX,
                y: controle.y,
                elemento: itemImg,
                velocidadeY: 5,
                ...extras
            });
            return true;
        }

        function droparItemDoColete(indice) {
            controle.coleteSlots = normalizarSlotsColete(controle.coleteSlots);
            const slot = controle.coleteSlots[indice];
            if (!slot) return false;

            const dropou = droparTipoNoMundo(slot.tipo, slot.dados || {});
            if (!dropou) return false;

            controle.coleteSlots[indice] = null;
            salvarInventario();
            atualizarMochilaUI();
            return true;
        }

        function usarItemDoColete(indice) {
            controle.coleteSlots = normalizarSlotsColete(controle.coleteSlots);
            const slot = controle.coleteSlots[indice];
            if (!slot) return false;
            if (!precisaDeItemAgora(slot.tipo)) return false;

            const itemData = window.itemDefinitions?.[slot.tipo] || null;
            const aplicou = aplicarItemNoCorpo(slot.tipo, itemData, slot.dados || {});
            if (!aplicou) return false;

            controle.coleteSlots[indice] = null;
            salvarInventario();
            atualizarMochilaUI();
            return true;
        }

        function usarOuDroparItemDoColete(indice) {
            const slot = obterSlotsColete()[indice];
            if (slot?.tipo === 'base_portatil') {
                if (usarItemDoColete(indice)) {
                    return { acao: 'usado' };
                }
                return { acao: 'nenhum' };
            }

            if (usarItemDoColete(indice)) {
                return { acao: 'usado' };
            }

            if (droparItemDoColete(indice)) {
                return { acao: 'dropado' };
            }

            return { acao: 'nenhum' };
        }

        function obterSlotsColete() {
            controle.coleteSlots = normalizarSlotsColete(controle.coleteSlots);
            return controle.coleteSlots;
        }

        function tentarColetarItemJogador(item) {
            if (!item || !item.tipo) return false;
            if (item.tipo === 'airdrop') return null;

            const itemData = window.itemDefinitions?.[item.tipo] || null;

            if (item.tipo === 'restauracao') {
                if (precisaRestauracaoAgora()) {
                    aplicarRestauracao();
                    salvarInventario();
                    atualizarMochilaUI();
                    return true;
                }
                return guardarItemNoColete(item, itemData) || guardarItemNoCinto(item, itemData);
            }

            if (item.tipo === 'base_portatil') {
                return guardarItemNoCinto(item, itemData) || guardarItemNoColete(item, itemData);
            }

            if (!itemJaAtivoNoCorpo(item.tipo) || precisaDeItemAgora(item.tipo)) {
                return aplicarItemNoCorpo(item.tipo, itemData, item);
            }

            return guardarItemNoColete(item, itemData) || guardarItemNoCinto(item, itemData);
        }

        function droparItemJogador() {
            if (!window.temSkill?.((window.SKILLS || {}).DROPAR)) {
                console.log("Habilidade 'Dropar' não adquirida.");
                return;
            }
            if (!controle.inventario || controle.inventario.length === 0) return;

            const {
                armaElemento,
                botaElemento,
                jetpackElemento,
                jetFogoElemento,
                garraElemento,
                cintoElemento,
                coleteElemento
            } = obterElementos();

            const tipo = controle.inventario[controle.inventario.length - 1];
            if (tipo === 'colete' && coleteTemConteudo()) {
                console.log('Colete: esvazie a mochila antes de dropar o colete.');
                return;
            }
            if (tipo === 'cinto' && obterSlotCinto()) {
                console.log('Cinto: esvazie o slot central antes de dropar o cinto.');
                return;
            }

            const slotCintoAtual = obterSlotCinto();
            controle.inventario.pop();
            const extras = (slotCintoAtual?.tipo === tipo)
                ? { ...(slotCintoAtual.dados || {}) }
                : {};

            if (slotCintoAtual?.tipo === tipo) {
                controle.cintoSlot = null;
            }

            if (tipo === 'revolver') {
                extras.municao = controle.municao;
                controle.temArma = false;
                controle.municao = 0;
                if (armaElemento) armaElemento.style.display = 'none';
            } else if (tipo === 'escudo') {
                extras.escudoProtegido = controle.escudoProtegido;
                extras.escudoVermelho = controle.escudoVermelho;
                controle.temEscudo = false;
                controle.escudoVermelho = false;
                controle.escudoProtegido = 0;
                atualizarVisualEscudo();
            } else if (tipo === 'bota') {
                extras.botaUsosDash = Number(controle.botaUsosDash || 0);
                extras.botaVermelha = !!controle.botaVermelha;
                controle.temBota = false;
                controle.botaUsosDash = 0;
                controle.botaVermelha = false;
                if (botaElemento) botaElemento.style.display = 'none';
                if (typeof window.atualizarVisualBota === 'function') {
                    window.atualizarVisualBota();
                }
            } else if (tipo === 'jetpack') {
                controle.temJetpack = false;
                controle.jetpackAtivo = false;
                controle.timerAtivacaoJetpack = 0;
                if (jetpackElemento) jetpackElemento.style.display = 'none';
                if (jetFogoElemento) jetFogoElemento.style.display = 'none';
            } else if (tipo === 'garra') {
                extras.garraImpactosSolidos = Number(controle.garraImpactosSolidos || 0);
                extras.garraVermelha = !!controle.garraVermelha;
                controle.temGarra = false;
                controle.garraImpactosSolidos = 0;
                controle.garraVermelha = false;
                if (garraElemento) garraElemento.style.display = 'none';
                if (typeof window.atualizarVisualGarra === 'function') {
                    window.atualizarVisualGarra();
                }
            } else if (tipo === 'cinto') {
                controle.temCinto = false;
                if (cintoElemento) cintoElemento.style.display = 'none';
            } else if (tipo === 'colete') {
                controle.temColete = false;
                if (coleteElemento) coleteElemento.style.display = 'none';
                if (window.isMochilaMenuOpen && typeof window.toggleMochilaMenu === 'function') {
                    window.toggleMochilaMenu(controle);
                }
            }

            droparTipoNoMundo(tipo, extras);
            salvarInventario();
            atualizarMochilaUI();
        }

        function droparItensInimigo(inimigo) {
            if (!inimigo) return;

            const itensParaDropar = [];
            const tiposRegistrados = new Set();

            const registrarDrop = (tipo, extras = {}) => {
                if (!tipo) return;
                itensParaDropar.push({ tipo, extras });
                tiposRegistrados.add(tipo);
            };

            if (Array.isArray(inimigo.inventario)) {
                [...inimigo.inventario].reverse().forEach((tipo) => {
                    const extras = {};
                    if (tipo === 'revolver') extras.municao = Number(inimigo.municao || config?.maxMunicao || 5);
                    if (tipo === 'escudo') {
                        extras.escudoProtegido = Number(inimigo.escudoProtegido || 0);
                        extras.escudoVermelho = !!inimigo.escudoVermelho;
                    }
                    if (tipo === 'bota') {
                        extras.botaUsosDash = Number(inimigo.botaUsosDash || 0);
                        extras.botaVermelha = !!inimigo.botaVermelha;
                    }
                    if (tipo === 'garra') {
                        extras.garraImpactosSolidos = Number(inimigo.garraImpactosSolidos || 0);
                        extras.garraVermelha = !!inimigo.garraVermelha;
                    }
                    registrarDrop(tipo, extras);
                });
            }

            if (Array.isArray(inimigo.coleteSlots)) {
                inimigo.coleteSlots.forEach((slot) => {
                    if (slot?.tipo) registrarDrop(slot.tipo, slot.dados || {});
                });
            }

            if (inimigo.cintoSlot?.tipo) {
                registrarDrop(inimigo.cintoSlot.tipo, inimigo.cintoSlot.dados || {});
            }

            const adicionarEquipamentoAtivo = (tipo, ativo, extras = {}) => {
                if (!ativo || tiposRegistrados.has(tipo)) return;
                registrarDrop(tipo, extras);
            };

            adicionarEquipamentoAtivo('revolver', !!inimigo.temArma, {
                municao: Number(inimigo.municao || config?.maxMunicao || 5)
            });
            adicionarEquipamentoAtivo('escudo', !!(inimigo.temEscudo || inimigo.escudoVermelho), {
                escudoProtegido: Number(inimigo.escudoProtegido || 0),
                escudoVermelho: !!inimigo.escudoVermelho
            });
            adicionarEquipamentoAtivo('bota', !!inimigo.temBota, {
                botaUsosDash: Number(inimigo.botaUsosDash || 0),
                botaVermelha: !!inimigo.botaVermelha
            });
            adicionarEquipamentoAtivo('jetpack', !!inimigo.temJetpack);
            adicionarEquipamentoAtivo('garra', !!inimigo.temGarra, {
                garraImpactosSolidos: Number(inimigo.garraImpactosSolidos || 0),
                garraVermelha: !!inimigo.garraVermelha
            });
            adicionarEquipamentoAtivo('cinto', !!inimigo.temCinto);
            adicionarEquipamentoAtivo('colete', !!inimigo.temColete);

            itensParaDropar.forEach(({ tipo, extras = {} }) => {
                const itemImg = document.createElement('img');
                itemImg.src = window.itemDefinitions?.[tipo]?.spriteColetavel || obterSpriteItem(tipo, config);
                itemImg.style.position = 'absolute';
                itemImg.style.width = '32px';
                itemImg.style.height = '32px';
                itemImg.style.imageRendering = 'pixelated';
                adicionarAoLayer(itemImg, window.LAYERS.ITENS);

                let dropX = inimigo.x;
                let tentativa = 0;
                const estaOcupado = (checkX) => window.itensColetaveis.some(it =>
                    Math.abs(it.x - checkX) < 20 && Math.abs(it.y - inimigo.y) < 20
                );

                while (estaOcupado(dropX)) {
                    tentativa++;
                    const direcao = tentativa % 2 === 0 ? -1 : 1;
                    const multiplier = Math.ceil(tentativa / 2);
                    dropX = inimigo.x + (32 * multiplier * direcao);
                }

                window.itensColetaveis.push({
                    x: dropX,
                    y: inimigo.y,
                    elemento: itemImg,
                    velocidadeY: 5,
                    tipo,
                    ...extras
                });
            });
        }

        window.salvarInventario = salvarInventario;
        window.limparInventarioSalvo = limparInventarioSalvo;
        window.limparCheckpointEquipamentoSalvo = limparCheckpointEquipamentoSalvo;
        window.carregarInventarioSalvo = carregarInventarioSalvo;
        window.droparItensInimigo = droparItensInimigo;
        window.aplicarInventarioSalvoNoControle = aplicarInventarioSalvoNoControle;
        window.carregarCheckpointEquipamentoSalvo = carregarCheckpointEquipamentoSalvo;
        window.aplicarCheckpointEquipamentoComoInventarioPadrao = aplicarCheckpointEquipamentoComoInventarioPadrao;
        window.salvarCheckpointEquipamentoDoControle = salvarCheckpointEquipamentoDoControle;
        window.salvarCheckpointEquipamentoAtual = (extras = {}) => {
            const resultado = salvarCheckpointEquipamentoDoControle(controle, extras);
            if (resultado?.ok && typeof window.salvarProgressoSkills === 'function') {
                window.salvarProgressoSkills();
            }
            return resultado;
        };
        window.tentarColetarItemJogador = tentarColetarItemJogador;
        window.removerItemDoCorpoSemDropar = removerItemDoCorpoSemDropar;
        window.usarOuDroparItemColete = usarOuDroparItemDoColete;
        window.droparItemColete = droparItemDoColete;
        window.obterSlotsColete = obterSlotsColete;
        window.obterSlotCinto = obterSlotCinto;
        window.obterItensDisponiveisNoCinto = obterItensDisponiveisNoCinto;
        window.guardarItemNoCinto = guardarItemNoCinto;
        window.guardarEquipamentoNoCinto = guardarEquipamentoNoCinto;
        window.usarOuDroparItemCinto = usarOuDroparItemDoCinto;
        window.droparItemCinto = droparItemDoCinto;
        window.itemColetePodeSerUsadoAgora = (slotOuIndice) => {
            const slot = typeof slotOuIndice === 'number' ? obterSlotsColete()[slotOuIndice] : slotOuIndice;
            return !!slot && precisaDeItemAgora(slot.tipo);
        };
        window.itemCintoPodeSerUsadoAgora = () => {
            const slot = obterSlotCinto();
            return !!slot && precisaDeItemAgora(slot.tipo);
        };

        return {
            carregarInventarioSalvo,
            salvarInventario,
            limparInventarioSalvo,
            aplicarInventarioSalvo,
            droparItemJogador,
            droparItensInimigo,
            tentarColetarItemJogador,
            usarOuDroparItemDoColete,
            droparItemDoColete,
            obterSlotsColete
        };
    }

    window.carregarConfigColete = carregarConfigColete;
    window.carregarInventarioSalvo = carregarInventarioSalvo;
    window.limparInventarioSalvo = limparInventarioSalvo;
    window.aplicarInventarioSalvoNoControle = aplicarInventarioSalvoNoControle;
    window.criarSistemaInventarioJogador = criarSistemaInventarioJogador;
})();
