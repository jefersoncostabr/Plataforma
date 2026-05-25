(function () {
    const INVENTARIO_STORAGE_KEY = 'plataformaInventario';
    const INVENTARIO_RUNTIME_KEY = '__plataformaInventarioRuntime';
    const CHECKPOINT_EQUIPAMENTO_STORAGE_KEY = 'plataformaCheckpointEquipamento';
    const COLETE_CONFIG_PADRAO = {
        capacidade: 6,
        itens: {
            revolver: { permitidoNoColete: true, equipavel: true, usarSoSePrecisar: true },
            doze: { permitidoNoColete: true, equipavel: true, usarSoSePrecisar: true },
            escudo: { permitidoNoColete: true, equipavel: true, usarSoSePrecisar: true },
            bota: { permitidoNoColete: true, equipavel: true, usarSoSePrecisar: true },
            jetpack: { permitidoNoColete: true, equipavel: true, usarSoSePrecisar: true },
            garra: { permitidoNoColete: true, equipavel: true, usarSoSePrecisar: true },
            cinto: { permitidoNoColete: true, equipavel: true, usarSoSePrecisar: true },
            colete: { permitidoNoColete: true, equipavel: true, usarSoSePrecisar: true },
            restauracao: { permitidoNoColete: true, consumivel: true, usarSoSePrecisar: true },
            base_portatil: { permitidoNoColete: true, consumivel: true, usarSoSePrecisar: true },
            scrap: { permitidoNoColete: true, consumivel: false, usarSoSePrecisar: false },
            novelo: { permitidoNoColete: true, consumivel: false, usarSoSePrecisar: false },
            bateria: { permitidoNoColete: true, consumivel: false, usarSoSePrecisar: false }
        }
    };

    function obterSlotAtivoId() {
        if (window.SaveSlots && typeof window.SaveSlots.getActiveSlotId === 'function') {
            return window.SaveSlots.getActiveSlotId();
        }
        return 'slot1';
    }

    function resolverChaveStorage(baseKey) {
        if (window.SaveSlots && typeof window.SaveSlots.getStorageKey === 'function') {
            return window.SaveSlots.getStorageKey(baseKey, obterSlotAtivoId());
        }
        return baseKey;
    }

    function resolverChaveRuntime() {
        return `${INVENTARIO_RUNTIME_KEY}_${obterSlotAtivoId()}`;
    }

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

    function obterNomeCanonicoItem(tipo, itemData = null, nomeRaw = null) {
        if (tipo === 'revolver') {
            return itemData?.nome || window.itemDefinitions?.revolver?.nome || 'Revólver';
        }
        if (tipo === 'doze') {
            return itemData?.nome || window.itemDefinitions?.doze?.nome || 'Doze';
        }
        return nomeRaw || itemData?.nome || tipo || 'Item';
    }

    function normalizarTipoArmaArmazenada(tipoRaw, raw = {}) {
        const tipoBase = String(tipoRaw || '').trim().toLowerCase();
        if (tipoBase !== 'revolver' && tipoBase !== 'doze') return tipoRaw;

        const nome = String(raw?.nome || '').toLowerCase();
        const spriteColetavel = String(raw?.spriteColetavel || '').toLowerCase();
        const spriteEquipado = String(raw?.spriteEquipado || '').toLowerCase();
        const dadoTipo = String(raw?.dados?.heldWeaponType || raw?.heldWeaponType || '').toLowerCase();

        const indicaDoze = nome.includes('doze') || spriteColetavel.includes('doze') || spriteEquipado.includes('doze') || dadoTipo === 'doze';
        const indicaRevolver = nome.includes('rev') || spriteColetavel.includes('revolver') || spriteEquipado.includes('revolver') || dadoTipo === 'revolver';

        if (indicaDoze && !indicaRevolver) return 'doze';
        if (indicaRevolver && !indicaDoze) return 'revolver';
        return tipoBase;
    }

    function normalizarEntradaArmazenada(slot = null) {
        if (!slot) return null;

        const raw = (typeof slot === 'string') ? { tipo: slot } : slot;
        const tipoOriginal = raw?.tipo || raw?.id || null;
        const tipo = normalizarTipoArmaArmazenada(tipoOriginal, raw);
        const regra = obterRegraColete(tipo) || {};
        const itemData = (tipo && window.itemDefinitions && window.itemDefinitions[tipo]) ? window.itemDefinitions[tipo] : null;
        const dadosOriginais = (raw?.dados && typeof raw.dados === 'object') ? raw.dados : {};

        // Suporte para itens melhorados (plus) sem definição explícita no JSON
        if (!itemData && tipo && tipo.endsWith('_plus')) {
            const baseTipo = tipo.replace('_plus', '');
            const baseDef = window.itemDefinitions?.[baseTipo];
            const isAmmo = tipo === 'municao_plus';
            return {
                tipo,
                nome: isAmmo ? 'Caixa de Munição' : ((baseDef?.nome || baseTipo) + ' +'),
                // Força o sprite correto para cx_municao.png
                spriteColetavel: isAmmo ? '../../assets/personagem/cx_municao.png' : (obterSpriteItem(tipo, window.config || {}) || baseDef?.spriteColetavel || obterSpriteItem(baseTipo, window.config || {}) || ''),
                spriteEquipado: isAmmo ? '../../assets/personagem/cx_municao.png' : (baseDef?.spriteEquipado || ''),
                consumivel: false,
                usarSoSePrecisar: false,
                quantidade: Number.isFinite(raw?.quantidade) ? Math.max(1, raw.quantidade) : 1,
                dados: { ...dadosOriginais }
            };
        }

        return {
            tipo,
            nome: obterNomeCanonicoItem(tipo, itemData, raw?.nome),
            spriteColetavel: raw?.spriteColetavel || itemData?.spriteColetavel || obterSpriteItem(tipo, window.config || {}) || '',
            spriteEquipado: raw?.spriteEquipado || itemData?.spriteEquipado || '',
            consumivel: raw?.consumivel != null
                ? !!raw.consumivel
                : !!(itemData?.consumivel || regra.consumivel || tipo === 'restauracao' || tipo === 'base_portatil'),
            usarSoSePrecisar: raw?.usarSoSePrecisar != null
                ? !!raw.usarSoSePrecisar
                : !!(regra.usarSoSePrecisar || tipo === 'restauracao' || tipo === 'base_portatil'),
            quantidade: Number.isFinite(raw?.quantidade) ? Math.max(1, raw.quantidade) : 1,
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


    // Função movida para o topo para garantir visibilidade
    function obterRegraColete(tipo) {
        return window.coleteConfig?.itens?.[tipo] || COLETE_CONFIG_PADRAO.itens?.[tipo] || (tipo?.endsWith('_plus') ? { permitidoNoColete: true } : null);
    }

    function itemPodeIrParaColete(tipo) {
        return !!obterRegraColete(tipo)?.permitidoNoColete;
    }

    function lerEstadoInventarioDoStorage(storageKey = INVENTARIO_STORAGE_KEY) {
        const chaveFinal = resolverChaveStorage(storageKey);
        try {
            const raw = localStorage.getItem(chaveFinal);
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (error) {
            console.error(`Erro ao ler inventário salvo (${chaveFinal}):`, error);
            return null;
        }
    }

    function lerEstadoInventarioRuntime() {
        const estado = window[resolverChaveRuntime()];
        return estado && typeof estado === 'object'
            ? JSON.parse(JSON.stringify(estado))
            : null;
    }

    function salvarEstadoInventarioRuntime(estado) {
        window[resolverChaveRuntime()] = estado && typeof estado === 'object'
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
            heldWeaponType: controle.heldWeaponType || (controle.inventario.includes('doze') ? 'doze' : (controle.inventario.includes('revolver') ? 'revolver' : null)),
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

    function baseComPersistenciaAtiva() {
        if (typeof window.obterConfigRenascimentoBase !== 'function') return false;
        const craft = window.obterConfigRenascimentoBase();
        const modo = String(craft?.modoRenascimento || '').trim().toLowerCase();
        return !!(craft && (modo === 'spawnpoint' || modo === 'memoria' || modo === 'ambos'));
    }

    function carregarInventarioSalvo() {
        if (!baseComPersistenciaAtiva()) {
            return null;
        }

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
            const chaveFinal = resolverChaveStorage(storageKey);

            if (storageKey === INVENTARIO_STORAGE_KEY) {
                salvarEstadoInventarioRuntime(estado);
                
                // Só persiste no localStorage se as condições de "Base Instalada" forem atendidas.
                if (podePersistirDados()) {
                    localStorage.setItem(chaveFinal, JSON.stringify(estado));
                }
                return true;
            }

            localStorage.setItem(chaveFinal, JSON.stringify(estado));
            return true;
        } catch (error) {
            console.error(`Erro ao salvar inventário (${resolverChaveStorage(storageKey)}):`, error);
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

            localStorage.setItem(resolverChaveStorage(CHECKPOINT_EQUIPAMENTO_STORAGE_KEY), JSON.stringify(estado));
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
        if (!baseComPersistenciaAtiva()) {
            salvarEstadoInventarioRuntime(null);
            try {
                localStorage.removeItem(resolverChaveStorage(INVENTARIO_STORAGE_KEY));
            } catch (_) {}
            return false;
        }

        const checkpoint = carregarCheckpointEquipamentoSalvo();
        if (!checkpoint) {
            salvarEstadoInventarioRuntime(null);
            try {
                localStorage.removeItem(resolverChaveStorage(INVENTARIO_STORAGE_KEY));
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
            localStorage.removeItem(resolverChaveStorage(INVENTARIO_STORAGE_KEY));
            return true;
        } catch (error) {
            console.error('Erro ao aplicar checkpoint de equipamento:', error);
            return false;
        }
    }

    function limparInventarioSalvo() {
        window[resolverChaveRuntime()] = null;
        localStorage.removeItem(resolverChaveStorage(INVENTARIO_STORAGE_KEY));
    }

    function limparCheckpointEquipamentoSalvo() {
        localStorage.removeItem(resolverChaveStorage(CHECKPOINT_EQUIPAMENTO_STORAGE_KEY));
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

        if (controle.inventario.includes('revolver') || controle.inventario.includes('doze')) {
            controle.temArma = true;
            controle.heldWeaponType = inventarioSalvo.heldWeaponType || (controle.inventario.includes('doze') ? 'doze' : 'revolver');
        }
        if (controle.inventario.includes('escudo')) controle.temEscudo = true;
        if (controle.inventario.includes('bota')) controle.temBota = true;
        if (controle.inventario.includes('jetpack')) controle.temJetpack = true;
        if (controle.inventario.includes('garra')) controle.temGarra = true;
        if (controle.inventario.includes('cinto')) controle.temCinto = true;
        if (controle.inventario.includes('colete')) controle.temColete = true;

        // Define a seleção inicial do cinto com base na prioridade: Escudo > Revólver
        if (controle.temEscudo) {
            controle.selecaoCinto = 'escudo';
        } else if (controle.temArma) {
            controle.selecaoCinto = 'arma';
        } else {
            controle.selecaoCinto = 'todos'; // Padrão se nenhum dos dois estiver equipado
        }
    }

    /**
     * Obtém o sprite correto para o item.
     * @param {string} tipo - Tipo do item.
     * @param {Object} config - Configurações.
     * @param {string} contexto - 'equipado' ou 'coletavel' (padrão).
     */
    function obterSpriteItem(tipo, config = window.config || {}, contexto = 'coletavel') {
        // Prioridade 1: Configurações do Motor (Fallbacks para estados de animação)
        // Se o item estiver equipado, priorizamos as chaves de config do motor de animação
        if (contexto === 'equipado') {
            if (tipo === 'revolver' && config.spriteArmaPlayer) return config.spriteArmaPlayer;
            if (tipo === 'doze') return config.spriteDozePlayer || '../../assets/personagem/doze.png';
            if (tipo === 'escudo' && config.spriteEscudoPlayer) return config.spriteEscudoPlayer;
            if (tipo === 'bota' && config.spriteBotaParado) return config.spriteBotaParado;
            if (tipo === 'jetpack' && config.spriteJetpackPlayer) return config.spriteJetpackPlayer;
            if (tipo === 'garra' && config.spriteGarraPlayer) return config.spriteGarraPlayer;
            if (tipo === 'cinto' && config.spriteCintoPlayer) return config.spriteCintoPlayer;
            if (tipo === 'colete' && config.spriteColeteParado) return config.spriteColeteParado;
            // Definição centralizada do caminho do muzzle flash (usado em efeitos-visuais.js)
            if (tipo === 'muzzle_flash') return config.spriteMuzzleFlash || '../../assets/vfx/efeito_disparo.png';
            // Estados de animação e Personagem
            if (tipo === 'agachado' && config.spriteAgachadoPlayer) return config.spriteAgachadoPlayer;
            if (tipo === 'agachado2' && config.spriteAgachadoAndandoPlayer) return config.spriteAgachadoAndandoPlayer;
            if (tipo === 'feno' && config.spriteAlvoFeno) return config.spriteAlvoFeno;
        }

        // Prioridade 2: Definições dinâmicas de itens (JSONs/itens.js)
        if (window.itemDefinitions && window.itemDefinitions[tipo]) {
            const def = window.itemDefinitions[tipo];
            if (contexto === 'equipado') return def.spriteEquipado || def.spriteColetavel || '';
            return def.spriteColetavel || def.spriteEquipado || '';
        }

        // Prioridade 3: Fallbacks conhecidos para itens no chão (coletáveis)
        if (contexto !== 'equipado') {
            if (tipo === 'revolver') return config.spriteItemRevolver || '../../assets/personagem/revolver_pegavel.png';
            if (tipo === 'doze') return config.spriteItemDoze || '../../assets/personagem/doze_coletavel.png';
            if (tipo === 'escudo') return config.spriteItemEscudo || '../../assets/personagem/escudo_pegavel.png';
            if (tipo === 'bota') return config.spriteItemBota || '../../assets/personagem/bota_pegavel.png';
            if (tipo === 'jetpack') return config.spriteItemJetpack || '../../assets/personagem/jetpack_pegavel.png';
            if (tipo === 'garra') return config.spriteItemGarra || '../../assets/personagem/garra_coletavel.png';
            if (tipo === 'cinto') return config.spriteItemCinto || '../../assets/personagem/cinto_coletavel.png';
            if (tipo === 'colete') return config.spriteItemColete || '../../assets/personagem/colete_coletavel.png';
            if (tipo === 'municao_plus') return '../../assets/personagem/cx_municao.png';
            if (tipo === 'novelo') return '../../assets/personagem/novelo.png';
            if (tipo === 'bateria') return '../../assets/personagem/objetos/bateria_coletavel.png';
        }

        // Prioridade 4: Efeitos e Elementos de Jogo (Centralização 5.3)
        if (tipo === 'impacto') return config.spriteImpacto || '../../assets/personagem/impacto.png';
        if (tipo === 'explosao') return config.spriteExplosao || '../../assets/personagem/explosao.png';
        if (tipo === 'airdrop') return config.spriteAirdrop || '../../assets/personagem/airdrop.png';
        if (tipo === 'paraquedas') return config.spriteParaquedas || '../../assets/personagem/paraquedas.png';
        if (tipo === 'feno') return '../../assets/personagem/alvoFeno.png';
        
        // Frames específicos de animação procedural
        if (tipo === 'garra_using1') return config.spriteGarraUsing1 || '../../assets/personagem/garra_using1.png';
        if (tipo === 'garra_using2') return config.spriteGarraUsing2 || '../../assets/personagem/garra_using2.png';
        if (tipo === 'garra_braco') return config.spriteGarraBraco || '../../assets/personagem/garra_braco.png';
        if (tipo === 'garra_catching') return config.spriteGarraCatching || '../../assets/personagem/garra_catching.png';
        
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
        if (Array.isArray(controle.inventario)) {
            const temDoze = controle.inventario.includes('doze');
            const temRevolver = controle.inventario.includes('revolver');
            
            if (temDoze || temRevolver) {
                controle.temArma = true;
                // Só define heldWeaponType se não houver um ativo para não sobrescrever a arma atual.
                if (!controle.heldWeaponType) {
                    controle.heldWeaponType = temDoze ? 'doze' : 'revolver';
                }
            }
        }

        const mMax = (controle.heldWeaponType === 'doze') ? 2 : 5;
        controle.municao = mMax;

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

    function criarEntradaColete(item = {}, itemData = null) {
        const tipo = item?.tipo || itemData?.id || null;
        const regra = obterRegraColete(tipo) || {};
        const dadosOriginais = (item?.dados && typeof item.dados === 'object') ? item.dados : {};
        return {
            tipo,
            nome: obterNomeCanonicoItem(tipo, itemData, item?.nome),
            spriteColetavel: itemData?.spriteColetavel || item?.spriteColetavel || '',
            spriteEquipado: itemData?.spriteEquipado || item?.spriteEquipado || '',
            consumivel: !!(itemData?.consumivel || regra.consumivel),
            usarSoSePrecisar: !!regra.usarSoSePrecisar,
            quantidade: Number.isFinite(item?.quantidade) ? Math.max(1, item.quantidade) : 1,
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

        function obterTipoArmaAtivaDoControle() {
            if (controle.heldWeaponType === 'revolver' || controle.heldWeaponType === 'doze') {
                return controle.heldWeaponType;
            }

            const armaElemento = document.getElementById('player-weapon');
            const srcArma = String(armaElemento?.src || '').toLowerCase();
            if (srcArma.includes('doze')) return 'doze';
            if (srcArma.includes('revolver')) return 'revolver';

            const inventario = Array.isArray(controle.inventario) ? controle.inventario : [];
            const temDoze = inventario.includes('doze');
            const temRevolver = inventario.includes('revolver');

            if (temDoze && !temRevolver) return 'doze';
            if (temRevolver && !temDoze) return 'revolver';
            if (temDoze && temRevolver) return 'doze';
            return 'revolver';
        }

        function normalizarTipoArmaDoSlot(slot = null) {
            if (!slot) return null;
            const tipoAjustado = normalizarTipoArmaArmazenada(slot.tipo, slot);
            if (tipoAjustado === 'doze' || tipoAjustado === 'revolver') {
                return tipoAjustado;
            }
            return slot.tipo;
        }

        function ehTipoArma(tipo) {
            return tipo === 'revolver' || tipo === 'doze';
        }

        function obterMaxMunicaoPorArma(tipoArma) {
            return tipoArma === 'doze' ? 2 : 5;
        }

        function obterArmaEquipadaParaColeta() {
            if (controle.heldWeaponType === 'revolver' || controle.heldWeaponType === 'doze') {
                return controle.heldWeaponType;
            }

            const inventario = Array.isArray(controle.inventario) ? controle.inventario : [];
            const temDoze = inventario.includes('doze');
            const temRevolver = inventario.includes('revolver');

            // Sem estado confiavel de arma ativa, evita inferencia errada por sprite.
            if (temDoze && !temRevolver) return 'doze';
            if (temRevolver && !temDoze) return 'revolver';
            return null;
        }

        function tentarConverterArmaColetadaEmMunicao(item) {
            if (!item || !ehTipoArma(item.tipo) || !controle.temArma) return false;

            const armaEquipada = obterArmaEquipadaParaColeta();
            if (!armaEquipada) return false;
            if (armaEquipada !== item.tipo) return false;

            const maxMunicao = obterMaxMunicaoPorArma(armaEquipada);
            const municaoAtual = Number(controle.municao || 0);
            if (municaoAtual >= maxMunicao) return false;

            const ganhoBruto = Number(item.municao);
            const ganhoMunicao = Number.isFinite(ganhoBruto) && ganhoBruto > 0 ? ganhoBruto : 1;

            controle.municao = Math.min(maxMunicao, municaoAtual + ganhoMunicao);
            window.AudioManager?.playSFX('recarga', 0.6);
            salvarInventario();
            atualizarMochilaUI();
            return true;
        }

        function registrarItemNoInventario(tipo) {
            if (!tipo || tipo === 'airdrop' || tipo === 'restauracao') return;
            if (!Array.isArray(controle.inventario)) controle.inventario = [];
            if (!controle.inventario.includes(tipo)) controle.inventario.push(tipo);
        }

        function removerTipoDoInventario(tipo) {
            if (!tipo || !Array.isArray(controle.inventario)) return;
            controle.inventario = controle.inventario.filter((itemTipo) => itemTipo !== tipo);
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
            const maxMunicao = (controle.heldWeaponType === 'doze') ? 2 : 5;
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
            if (tipo === 'revolver' || tipo === 'doze') return !!controle.temArma;
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
            if (tipo === 'revolver' || tipo === 'doze') {
                const maxMunicao = (tipo === 'doze') ? 2 : 5;
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
            if (tipo === 'scrap') return false;
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

            if (tipo === 'revolver' || tipo === 'doze') {
                controle.temArma = true;
                controle.heldWeaponType = tipo;
                const munPadrao = (tipo === 'doze') ? 2 : 5;
                controle.municao = Number(extras?.municao ?? itemData?.efeitos?.jogador?.municao ?? munPadrao);
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
                // Se o item não possui efeitos lógicos definidos, ele não deve ser "consumido" ao tentar usar
                if (Object.keys(itemData.efeitos.jogador).length === 0) return false;

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

            // Tenta empilhar se for scrap ou item plus (Limite 5)
            if (item?.tipo === 'scrap' || item?.tipo?.endsWith('_plus')) {
                for (let i = 0; i < (controle.coleteSlots || []).length; i++) {
                    const slot = normalizarEntradaArmazenada(controle.coleteSlots[i]);
                    if (slot && slot.tipo === item.tipo && slot.quantidade < 5) {
                        slot.quantidade++;
                        controle.coleteSlots[i] = slot;
                        salvarInventario();
                        if (typeof window.atualizarMochilaUI === 'function') window.atualizarMochilaUI(controle);
                        return true;
                    }
                }
            }

            const indiceLivre = encontrarSlotLivreColete();
            if (indiceLivre < 0) return false;

            controle.coleteSlots[indiceLivre] = criarEntradaColete(item, itemData);
            salvarInventario();
            atualizarMochilaUI();
            return true;
        }

        /**
         * Sistema de reparo automático: Consome versões "+" dos itens para restaurar
         * equipamentos que ficaram vermelhos (quebrados) instantaneamente.
         */
        function verificarAutoReparoEquipamentos() {
            if (!controle) return;
            const alvos = [
                { tipo: 'bota', quebrado: !!controle.botaVermelha },
                { tipo: 'escudo', quebrado: !!controle.escudoVermelho },
                { tipo: 'garra', quebrado: !!controle.garraVermelha },
                { tipo: 'jetpack', quebrado: !!(controle.temJetpack && (controle.cooldownVooJetpack || 0) > 0) },
                { tipo: 'revolver', quebrado: !!(controle.temArma && controle.heldWeaponType === 'revolver' && (controle.municao || 0) <= 0) },
                { tipo: 'doze', quebrado: !!(controle.temArma && controle.heldWeaponType === 'doze' && (controle.municao || 0) <= 0) }
            ];

            alvos.forEach(alvo => {
                if (alvo.quebrado) {
                    const tipoPlus = (alvo.tipo === 'revolver' || alvo.tipo === 'doze') ? 'municao_plus' : (alvo.tipo + '_plus');
                    let consumiu = false;

                    // 1. Procura no Cinto primeiro
                    const slotC = normalizarEntradaArmazenada(controle.cintoSlot);
                    if (slotC && slotC.tipo === tipoPlus && slotC.quantidade > 0) {
                        slotC.quantidade--;
                        controle.cintoSlot = slotC.quantidade > 0 ? slotC : null;
                        consumiu = true;
                    }

                    // 2. Procura nos slots do Colete se não achou no cinto
                    if (!consumiu && Array.isArray(controle.coleteSlots)) {
                        for (let i = 0; i < (controle.coleteSlots || []).length; i++) {
                            const slot = normalizarEntradaArmazenada(controle.coleteSlots[i]);
                            if (slot && slot.tipo === tipoPlus && slot.quantidade > 0) {
                                slot.quantidade--;
                                controle.coleteSlots[i] = slot.quantidade > 0 ? slot : null;
                                consumiu = true;
                                break;
                            }
                        }
                    }

                    if (consumiu) {
                        // Executa a restauração baseada no tipo para limpar o estado "vermelho"
                        if (alvo.tipo === 'bota') { 
                            controle.botaUsosDash = 0; controle.botaVermelha = false; if (typeof window.atualizarVisualBota === 'function') window.atualizarVisualBota();
                        } else if (alvo.tipo === 'escudo') { 
                            controle.escudoProtegido = 0; controle.escudoVermelho = false; if (typeof window.atualizarVisualEscudo === 'function') window.atualizarVisualEscudo();
                        } else if (alvo.tipo === 'garra') { 
                            controle.garraImpactosSolidos = 0; controle.garraVermelha = false; if (typeof window.atualizarVisualGarra === 'function') window.atualizarVisualGarra();
                        } else if (alvo.tipo === 'jetpack') {
                            controle.cooldownVooJetpack = 0; controle.timerVooRestante = Number(config?.jetpackDuracaoVoo || 400);
                            if (typeof controle.iniciarJetpack === 'function') { controle.iniciarJetpack(); } else { controle.jetpackAtivo = true; }
                        } else if (alvo.tipo === 'revolver' || alvo.tipo === 'doze') {
                            const armaEl = obterElementos().armaElemento;
                            const maxBalas = (controle.heldWeaponType === 'doze') ? 2 : 5;
                            controle.municao = maxBalas;
                            // Efeito Visual de Recarga Plus
                            if (armaEl) {
                                const filtroOriginal = armaEl.style.filter;
                                armaEl.style.filter = 'hue-rotate(90deg) brightness(2) drop-shadow(0 0 8px #0f0)';
                                if (typeof window.flashElement === 'function') window.flashElement(armaEl, 400, 10);
                                setTimeout(() => { if (armaEl) armaEl.style.filter = filtroOriginal; }, 500);
                            }
                        }

                        window.AudioManager?.playSFX('recarga', 0.8);
                        salvarInventario();
                        if (typeof window.atualizarMochilaUI === 'function') window.atualizarMochilaUI(controle);
                    }
                }
            });
        }

        function obterDadosExtrasDoItemAtivo(tipo) {
            if (tipo === 'revolver' || tipo === 'doze') {
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

            if (tipo === 'revolver' || tipo === 'doze') {
                controle.temArma = false;
                controle.municao = 0;
                if (armaElemento) armaElemento.style.display = 'none';
                return true;
            }
            // Lógica para materiais empilháveis (ex: scrap)
            if (tipo === 'scrap') {
                // Tenta remover 1 unidade do colete
                if (Array.isArray(controle.coleteSlots)) {
                    for (let i = controle.coleteSlots.length - 1; i >= 0; i--) {
                        const slot = normalizarEntradaArmazenada(controle.coleteSlots[i]);
                        if (slot && slot.tipo === 'scrap') {
                            if (slot.quantidade > 1) {
                                slot.quantidade--;
                                controle.coleteSlots[i] = slot;
                            } else {
                                controle.coleteSlots[i] = null;
                            }
                            salvarInventario();
                            if (typeof window.atualizarMochilaUI === 'function') window.atualizarMochilaUI(controle);
                            return true;
                        }
                    }
                }
                // Tenta remover do cinto
                const slotC = normalizarEntradaArmazenada(controle.cintoSlot);
                if (slotC && slotC.tipo === 'scrap') {
                    if (slotC.quantidade > 1) {
                        slotC.quantidade--;
                        controle.cintoSlot = slotC;
                    } else {
                        controle.cintoSlot = null;
                    }
                    salvarInventario();
                    if (typeof window.atualizarMochilaUI === 'function') window.atualizarMochilaUI(controle);
                    return true;
                }
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

            const tipoArmaAtiva = obterTipoArmaAtivaDoControle();
            adicionar(tipoArmaAtiva, controle.temArma);
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

            // Tenta empilhar no cinto se for scrap ou item plus (Limite 5)
            const slotCintoAtual = normalizarEntradaArmazenada(controle.cintoSlot);
            if ((item.tipo === 'scrap' || item.tipo?.endsWith('_plus')) && slotCintoAtual && slotCintoAtual.tipo === item.tipo && slotCintoAtual.quantidade < 5) {
                slotCintoAtual.quantidade++;
                controle.cintoSlot = slotCintoAtual;
                salvarInventario();
                if (typeof window.atualizarMochilaUI === 'function') window.atualizarMochilaUI(controle);
                return true;
            }

            controle.cintoSlot = normalizarEntradaArmazenada(controle.cintoSlot);
            if (controle.cintoSlot) return false;

            controle.cintoSlot = criarEntradaColete(item, itemData);
            salvarInventario();
            atualizarMochilaUI();
            return true;
        }

        function guardarEquipamentoNoCinto(tipo) {
            if (!controle.temCinto || !tipo) return false;
            if (tipo === 'revolver' || tipo === 'doze') {
                tipo = obterTipoArmaAtivaDoControle();
            }
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
            const tipoSlot = normalizarTipoArmaDoSlot(slot);
            if (tipoSlot !== slot.tipo) {
                slot.tipo = tipoSlot;
                slot.nome = obterNomeCanonicoItem(tipoSlot, window.itemDefinitions?.[tipoSlot] || null, slot.nome);
                controle.cintoSlot = slot;
            }
            if (!precisaDeItemAgora(tipoSlot)) return false;

            const armaAntesTipo = ehTipoArma(tipoSlot) ? obterTipoArmaAtivaDoControle() : null;
            const armaAntesMunicao = Number(controle.municao || 0);
            const houveTrocaDeArma = !!(ehTipoArma(tipoSlot) && controle.temArma && ehTipoArma(armaAntesTipo) && armaAntesTipo !== tipoSlot);

            const itemData = window.itemDefinitions?.[tipoSlot] || null;
            const aplicou = aplicarItemNoCorpo(tipoSlot, itemData, slot.dados || {});
            if (!aplicou) return false;

            if (houveTrocaDeArma) {
                const itemAnteriorData = window.itemDefinitions?.[armaAntesTipo] || null;

                // Mecânica solicitada:
                // Se a arma anterior estava vermelha (sem munição) e estamos guardando/selecionando Enter
                // para usar uma arma diferente a partir do cinto, a arma vermelha deve desaparecer
                // (não ir para o armazenamento/cinto).
                const armaAnteriorVermelha = Number(armaAntesMunicao || 0) <= 0;
                if (armaAnteriorVermelha) {
                    controle.cintoSlot = null;
                } else {
                    controle.cintoSlot = criarEntradaColete({
                        tipo: armaAntesTipo,
                        municao: armaAntesMunicao
                    }, itemAnteriorData);
                }
            } else {
                controle.cintoSlot = null;
            }
            salvarInventario();
            atualizarMochilaUI();
            return true;
        }

        function usarOuDroparItemDoCinto() {
            const slot = obterSlotCinto();
            // Impede que materiais de crafting sumam ou sejam dropados ao apertar Enter no menu
            if (slot?.tipo === 'scrap') {
                return { acao: 'nenhum' };
            }

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

        function itemVermelhoDeveSerDestruidoNoDrop(tipo, extras = {}) {
            if (tipo === 'escudo') return !!extras?.escudoVermelho;
            if (tipo === 'bota') return !!extras?.botaVermelha;
            if (tipo === 'garra') return !!extras?.garraVermelha;
            return false;
        }

        function droparTipoNoMundo(tipo, extras = {}) {
            if (!tipo) return false;
            if (itemVermelhoDeveSerDestruidoNoDrop(tipo, extras)) return true;

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
            const tipoSlot = normalizarTipoArmaDoSlot(slot);
            if (tipoSlot !== slot.tipo) {
                slot.tipo = tipoSlot;
                slot.nome = obterNomeCanonicoItem(tipoSlot, window.itemDefinitions?.[tipoSlot] || null, slot.nome);
                controle.coleteSlots[indice] = slot;
            }
            if (!precisaDeItemAgora(tipoSlot)) return false;

            const armaAntesTipo = ehTipoArma(tipoSlot) ? obterTipoArmaAtivaDoControle() : null;
            const armaAntesMunicao = Number(controle.municao || 0);
            const houveTrocaDeArma = !!(ehTipoArma(tipoSlot) && controle.temArma && ehTipoArma(armaAntesTipo) && armaAntesTipo !== tipoSlot);

            const itemData = window.itemDefinitions?.[tipoSlot] || null;
            const aplicou = aplicarItemNoCorpo(tipoSlot, itemData, slot.dados || {});
            if (!aplicou) return false;

            if (houveTrocaDeArma) {
                const itemAnteriorData = window.itemDefinitions?.[armaAntesTipo] || null;
                controle.coleteSlots[indice] = criarEntradaColete({
                    tipo: armaAntesTipo,
                    municao: armaAntesMunicao
                }, itemAnteriorData);
            } else {
                controle.coleteSlots[indice] = null;
            }
            salvarInventario();
            atualizarMochilaUI();
            return true;
        }

        function usarOuDroparItemDoColete(indice) {
            const slot = obterSlotsColete()[indice];
            // Impede que materiais de crafting sumam ou sejam dropados ao apertar Enter no menu
            if (slot?.tipo === 'scrap') {
                return { acao: 'nenhum' };
            }

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
            if (item.coletavel === false || itemData?.coletavel === false) return false;

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

            // --- CORREÇÃO ARMAS ---
            if (ehTipoArma(item.tipo)) {
                const armaEquipada = obterArmaEquipadaParaColeta();
                // Sem arma na mão: comportamento primário é equipar.
                if (!controle.temArma || !armaEquipada) {
                    const equipou = aplicarItemNoCorpo(item.tipo, itemData, item);
                    if (equipou) {
                        return true;
                    }
                }

                // Com a mesma arma na mão: tenta converter em munição.
                if (armaEquipada === item.tipo) {
                    if (tentarConverterArmaColetadaEmMunicao(item)) {
                        return true;
                    }

                    const maxMunicao = obterMaxMunicaoPorArma(item.tipo);
                    const municaoAtual = Number(controle.municao || 0);
                    if (municaoAtual >= maxMunicao) {
                        const guardouEmSlot = guardarItemNoCinto(item, itemData) || guardarItemNoColete(item, itemData);
                        if (guardouEmSlot) {
                            registrarItemNoInventario(item.tipo);
                            salvarInventario();
                            atualizarMochilaUI();
                            return true;
                        }
                    }
                }

                // Arma diferente da mão: não troca automaticamente.
                // Só coleta se houver espaço no cinto ou na mochila (colete).
                if (armaEquipada && armaEquipada !== item.tipo) {
                    // Exceção: se arma atual está "vermelha" (sem munição), faz troca imediata e elimina a arma vermelha.
                    const armaAtualVermelha = Number(controle.municao || 0) <= 0;
                    if (armaAtualVermelha) {
                        removerTipoDoInventario(armaEquipada);
                        const equipou = aplicarItemNoCorpo(item.tipo, itemData, item);
                        if (equipou) {
                            salvarInventario();
                            atualizarMochilaUI();
                            return true;
                        }
                    }

                    const guardouEmSlot = guardarItemNoCinto(item, itemData) || guardarItemNoColete(item, itemData);
                    if (guardouEmSlot) {
                        registrarItemNoInventario(item.tipo);
                        salvarInventario();
                        atualizarMochilaUI();
                        return true;
                    }
                    return false;
                }

                // Fallback: tenta converter em munição quando aplicável.
                if (tentarConverterArmaColetadaEmMunicao(item)) {
                    return true;
                }

                // Se não conseguiu equipar nem converter em munição (ex.: munição cheia), não consome o item.
                return false;
            }

            if (tentarConverterArmaColetadaEmMunicao(item)) {
                return true;
            }

            // Apenas tenta aplicar no corpo se for um equipamento vestível (corpo)
                // Tratamento especial para munição_plus: incrementa munição da arma atual até o máximo
                if (item.tipo === 'municao_plus') {
                    if (!controle.temArma) {
                        // Se não tem arma, guarda a munição no colete ou cinto
                        const guardouEmSlot = guardarItemNoColete(item, itemData) || guardarItemNoCinto(item, itemData);
                        if (guardouEmSlot) {
                            registrarItemNoInventario(item.tipo);
                            return true;
                        }
                        return false;
                    }
                
                    const maxMunicao = (controle.heldWeaponType === 'doze') ? 2 : 5;
                    const municaoAtual = Number(controle.municao || 0);
                
                    if (municaoAtual < maxMunicao) {
                        // Incrementa munição até o máximo
                        // controle.municao = Math.min(maxMunicao, municaoAtual + 1);
                        // Recarrega o pente completamente ao coletar a caixa
                        controle.municao = maxMunicao;
                        window.AudioManager?.playSFX('recarga', 0.6);
                        salvarInventario();
                        atualizarMochilaUI();
                        return true;
                    } else {
                        // Se munição está no máximo, tenta guardar a caixa no colete/cinto
                        const guardouEmSlot = guardarItemNoColete(item, itemData) || guardarItemNoCinto(item, itemData);
                        if (guardouEmSlot) {
                            registrarItemNoInventario(item.tipo);
                            return true;
                        }
                        return false;
                    }
                }

            const ehEquipamentoCorpo = ['revolver', 'doze', 'escudo', 'bota', 'jetpack', 'garra', 'cinto', 'colete'].includes(item.tipo);
            if (ehEquipamentoCorpo && (!itemJaAtivoNoCorpo(item.tipo) || precisaDeItemAgora(item.tipo))) {
                return aplicarItemNoCorpo(item.tipo, itemData, item);
            }

            const guardouEmSlot = guardarItemNoColete(item, itemData) || guardarItemNoCinto(item, itemData);
            
            if (guardouEmSlot) {
                registrarItemNoInventario(item.tipo);
                return true;
            }

            // Se não coube em nenhum lugar, retorna false para o item permanecer no mundo
            return false;
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

            if (tipo === 'revolver' || tipo === 'doze') {
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

            // Inimigos sempre dropam seus itens, independentemente do estado de durabilidade
            // A regra de durabilidade (item quebrado/vazio) se aplica apenas ao jogador
            const registrarDrop = (tipo, extras = {}) => {
                if (!tipo) return;

                // Se o item tem quantidade, dropa unidades individuais no chão
                const qty = extras.quantidade || 1;
                const extrasSemQty = { ...extras };
                delete extrasSemQty.quantidade;
                for (let i = 0; i < qty; i++) {
                    itensParaDropar.push({ tipo, extras: extrasSemQty });
                }
                tiposRegistrados.add(tipo);
            };

            if (Array.isArray(inimigo.inventario)) {
                [...inimigo.inventario].reverse().forEach((tipo) => {
                    const extras = {};
                    if (tipo === 'revolver' || tipo === 'doze') {
                        // Se munição estiver vazia (0), dropa com 1 bala para ainda ser utilizável
                        const municaoAtual = Number(inimigo.municao ?? 0);
                        extras.municao = municaoAtual <= 0 ? 1 : municaoAtual;
                    }
                    if (tipo === 'escudo') {
                        // Se escudo estiver vermelho (quebrado), dropa com durabilidade 1
                        if (inimigo.escudoVermelho) {
                            extras.escudoProtegido = 1;
                            extras.escudoVermelho = true;
                        } else {
                            extras.escudoProtegido = Number(inimigo.escudoProtegido || 0);
                            extras.escudoVermelho = false;
                        }
                    }
                    if (tipo === 'bota') {
                        // Se bota estiver vermelha (quebrada), dropa com durabilidade 1
                        if (inimigo.botaVermelha) {
                            extras.botaUsosDash = 1;
                            extras.botaVermelha = true;
                        } else {
                            extras.botaUsosDash = Number(inimigo.botaUsosDash || 0);
                            extras.botaVermelha = false;
                        }
                    }
                    if (tipo === 'garra') {
                        // Se garra estiver vermelha (quebrada), dropa com durabilidade 1
                        if (inimigo.garraVermelha) {
                            extras.garraImpactosSolidos = 1;
                            extras.garraVermelha = true;
                        } else {
                            extras.garraImpactosSolidos = Number(inimigo.garraImpactosSolidos || 0);
                            extras.garraVermelha = false;
                        }
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

            // Identifica qual arma dropar baseada no que está na mão
            const tipoArmaAtiva = inimigo.heldWeaponType || (inimigo.inventario.includes('doze') ? 'doze' : 'revolver');
            const municaoArma = Math.max(1, Number(inimigo.municao ?? 0));

            adicionarEquipamentoAtivo(tipoArmaAtiva, !!inimigo.temArma, {
                municao: municaoArma
            });
            // Escudo: se estiver vermelho, dropa com durabilidade 1
            const escudoProtegido = inimigo.escudoVermelho ? 1 : Number(inimigo.escudoProtegido || 0);
            adicionarEquipamentoAtivo('escudo', !!(inimigo.temEscudo || inimigo.escudoVermelho), {
                escudoProtegido: escudoProtegido,
                escudoVermelho: !!inimigo.escudoVermelho
            });
            // Bota: se estiver vermelha, dropa com durabilidade 1
            const botaUsos = inimigo.botaVermelha ? 1 : Number(inimigo.botaUsosDash || 0);
            adicionarEquipamentoAtivo('bota', !!inimigo.temBota, {
                botaUsosDash: botaUsos,
                botaVermelha: !!inimigo.botaVermelha
            });
            adicionarEquipamentoAtivo('jetpack', !!inimigo.temJetpack);
            // Garra: se estiver vermelha, dropa com durabilidade 1
            const garraImpactos = inimigo.garraVermelha ? 1 : Number(inimigo.garraImpactosSolidos || 0);
            adicionarEquipamentoAtivo('garra', !!inimigo.temGarra, {
                garraImpactosSolidos: garraImpactos,
                garraVermelha: !!inimigo.garraVermelha
            });
            adicionarEquipamentoAtivo('cinto', !!inimigo.temCinto);
            adicionarEquipamentoAtivo('colete', !!inimigo.temColete);
            adicionarEquipamentoAtivo('bateria', !!inimigo.temBateria);

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
        window.verificarAutoReparoEquipamentos = verificarAutoReparoEquipamentos;
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
