(function () {
    window.isMochilaMenuOpen = false;
    let mochilaAreaSelecionada = 'colete';
    let mochilaSlotSelecionado = 0;
    let cintoSlotSelecionado = 3;
    let mochilaSlotElements = [];
    let cintoSlotElements = [];
    let cintoLinhaAtual = [];
    let botaoVoltarBaseAtivo = null;
    let botaoFecharMochilaAtivo = null;
    let selecaoVoltarBase = false;
    let selecaoFecharMochila = false;
    let modoFocoMochila = 'teclado';

    const COLUNAS_COLETE = 3;
    const TOTAL_CELULAS_CINTO = 7;
    const INDICE_SLOT_CINTO = 3;

    function capacidadeColete() {
        return Math.max(1, Number(window.coleteConfig?.capacidade ?? 6));
    }

    function temSecaoCinto(controle) {
        return !!(controle?.temCinto || controle?.cintoSlot);
    }

    function garantirSlotsColete(controle) {
        if (!controle) return [];
        if (!Array.isArray(controle.coleteSlots)) {
            controle.coleteSlots = [];
        }

        while (controle.coleteSlots.length < capacidadeColete()) {
            controle.coleteSlots.push(null);
        }

        if (controle.coleteSlots.length > capacidadeColete()) {
            controle.coleteSlots = controle.coleteSlots.slice(0, capacidadeColete());
        }

        return controle.coleteSlots;
    }

    function teclaEhAcaoMenu(tecla, acao) {
        const binds = window.controlesConfig?.[acao];
        if (!Array.isArray(binds)) return false;
        return binds.some(bind => String(bind).toLowerCase() === String(tecla || '').toLowerCase());
    }

    function obterItensCinto(controle = window.playerControle) {
        if (typeof window.obterItensDisponiveisNoCinto === 'function') {
            return window.obterItensDisponiveisNoCinto(controle) || [];
        }
        return [];
    }

    function obterSlotCintoAtual() {
        if (typeof window.obterSlotCinto === 'function') {
            return window.obterSlotCinto();
        }
        return null;
    }

    function construirLinhaCinto(controle = window.playerControle) {
        const itens = obterItensCinto(controle).slice(0, 6);
        const celulas = Array.from({ length: TOTAL_CELULAS_CINTO }, (_, indice) => ({
            tipoUI: indice === INDICE_SLOT_CINTO ? 'slot-cinto' : 'placeholder',
            item: null
        }));

        itens.slice(0, 3).forEach((item, indice) => {
            celulas[indice] = { tipoUI: 'item-corpo', item };
        });

        itens.slice(3, 6).forEach((item, indice) => {
            celulas[INDICE_SLOT_CINTO + 1 + indice] = { tipoUI: 'item-corpo', item };
        });

        celulas[INDICE_SLOT_CINTO] = {
            tipoUI: 'slot-cinto',
            item: obterSlotCintoAtual()
        };

        return celulas;
    }

    function obterSpriteSlot(slot) {
        return slot?.spriteColetavel || slot?.spriteEquipado || '';
    }

    function formatarSlotColete(slot, indice) {
        if (!slot) {
            return {
                titulo: `SLOT ${indice + 1}`,
                subtitulo: 'Vazio',
                dica: 'Aguardando item',
                cor: '#9a9a9a',
                sprite: ''
            };
        }

        if (slot.tipo === 'base_portatil') {
            return {
                titulo: String(slot.nome || `SLOT ${indice + 1}`),
                subtitulo: 'Base portátil',
                dica: 'Enter reinstala no chão',
                cor: '#ffd36f',
                sprite: obterSpriteSlot(slot)
            };
        }

        const podeUsar = typeof window.itemColetePodeSerUsadoAgora === 'function'
            ? window.itemColetePodeSerUsadoAgora(slot)
            : false;

        return {
            titulo: String(slot.nome || slot.tipo || `SLOT ${indice + 1}`),
            subtitulo: podeUsar ? 'Pronto para usar' : 'Enter usa ou larga',
            dica: teclaEhAcaoMenu('k', 'chute') ? 'Chute larga direto' : 'Item guardado',
            cor: slot.consumivel ? '#7bd4ff' : '#9be28f',
            sprite: obterSpriteSlot(slot)
        };
    }

    function formatarCelulaCinto(celula) {
        if (!celula || celula.tipoUI === 'placeholder') {
            return {
                titulo: '---',
                subtitulo: 'Sem item',
                dica: 'Espaço livre',
                cor: '#7b7b7b',
                sprite: ''
            };
        }

        if (celula.tipoUI === 'item-corpo') {
            return {
                titulo: String(celula.item?.nome || celula.item?.tipo || 'Item'),
                subtitulo: 'No jogador',
                dica: 'Enter guarda no cinto',
                cor: '#8fd6ff',
                sprite: obterSpriteSlot(celula.item)
            };
        }

        if (!celula.item) {
            return {
                titulo: 'SLOT DO CINTO',
                subtitulo: 'Vazio',
                dica: 'Guarda 1 item do corpo',
                cor: '#f7e27b',
                sprite: ''
            };
        }

        if (celula.item?.tipo === 'base_portatil') {
            return {
                titulo: String(celula.item.nome || 'Base portátil'),
                subtitulo: 'Base portátil',
                dica: 'Enter reinstala no chão',
                cor: '#ffd36f',
                sprite: obterSpriteSlot(celula.item)
            };
        }

        const podeUsar = typeof window.itemCintoPodeSerUsadoAgora === 'function'
            ? window.itemCintoPodeSerUsadoAgora(celula.item)
            : false;

        return {
            titulo: String(celula.item.nome || celula.item.tipo || 'Item'),
            subtitulo: podeUsar ? 'Pronto para usar' : 'Enter usa ou larga',
            dica: teclaEhAcaoMenu('k', 'chute') ? 'Chute larga direto' : 'Item guardado',
            cor: celula.item.consumivel ? '#7bd4ff' : '#9be28f',
            sprite: obterSpriteSlot(celula.item)
        };
    }

    function criarOverlayBase() {
        const viewport = document.getElementById('jogo-container') || document.getElementById('game-stage')?.parentElement;
        if (!viewport) return null;

        const rect = viewport.getBoundingClientRect();
        const overlay = document.createElement('div');
        overlay.id = 'colete-backpack-overlay';
        overlay.style = `
            position: fixed;
            top: ${rect.top}px;
            left: ${rect.left}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            background: var(--cor-fundo-overlay);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            box-sizing: border-box;
            pointer-events: all;
        `;

        return overlay;
    }

    function baseSobJogador(controle = window.playerControle) {
        if (!controle) return null;
        const jogador = {
            left: Number(controle.x || 0),
            right: Number(controle.x || 0) + Number(controle.largura || 20),
            bottom: Number(controle.y || 0),
            top: Number(controle.y || 0) + Number(controle.altura || 32)
        };
        return (window.craftsAtivos || []).find((craft) => {
            if (!craft) return false;
            const base = {
                left: Number(craft.x || 0),
                right: Number(craft.x || 0) + Number(craft.largura || 32),
                bottom: Number(craft.y || 0),
                top: Number(craft.y || 0) + Number(craft.altura || 32)
            };
            return jogador.left < base.right - 4
                && jogador.right > base.left + 4
                && jogador.bottom < base.top + 8
                && jogador.top > base.bottom + 4;
        }) || null;
    }

    function aplicarEstiloSelecao(slotEl, selecionado) {
        if (!slotEl) return;
        slotEl.classList.toggle('is-key-selected', selecionado);
        slotEl.style.background = selecionado
            ? 'linear-gradient(180deg, #3a3a3a 0%, #2c2c2c 100%)'
            : 'linear-gradient(180deg, #2a2a2a 0%, #1c1c1c 100%)';
        slotEl.style.borderColor = selecionado ? '#f7e27b' : '#4a4a4a';
        slotEl.style.boxShadow = selecionado
            ? '0 0 10px rgba(0, 255, 255, 0.7), 0 0 25px rgba(0, 255, 255, 0.45), 0 0 50px rgba(255, 0, 255, 0.3)'
            : 'inset 0 0 8px rgba(0,0,0,0.25)';
        slotEl.style.transform = selecionado ? 'scale(1.03)' : 'scale(1)';
    }

    function atualizarSelecaoSlots() {
        const focoTeclado = modoFocoMochila === 'teclado';
        botaoFecharMochilaAtivo?.classList.toggle('menu-nav-selected', focoTeclado && selecaoFecharMochila);
        if (botaoVoltarBaseAtivo) {
            botaoVoltarBaseAtivo.style.borderColor = focoTeclado && selecaoVoltarBase ? '#f7e27b' : 'rgba(0, 238, 255, 0.6)';
            botaoVoltarBaseAtivo.style.boxShadow = focoTeclado && selecaoVoltarBase
                ? '0 0 0 3px rgba(247,226,123,0.45), 0 0 22px rgba(0,238,255,0.4)'
                : '0 2px 10px rgba(0,0,0,0.35)';
            botaoVoltarBaseAtivo.style.transform = focoTeclado && selecaoVoltarBase ? 'translateY(-1px)' : 'translateY(0)';
        }
        cintoSlotElements.forEach((slotEl, indice) => {
            const selecionado = focoTeclado && mochilaAreaSelecionada === 'cinto' && indice === cintoSlotSelecionado;
            aplicarEstiloSelecao(slotEl, selecionado);
        });

        mochilaSlotElements.forEach((slotEl, indice) => {
            const selecionado = focoTeclado && mochilaAreaSelecionada === 'colete' && indice === mochilaSlotSelecionado;
            aplicarEstiloSelecao(slotEl, selecionado);
        });
    }

    function ativarFocoMouse() {
        modoFocoMochila = 'mouse';
        selecaoVoltarBase = false;
        selecaoFecharMochila = false;
        atualizarSelecaoSlots();
    }

    function ativarFocoTeclado() {
        if (modoFocoMochila === 'teclado') return;
        modoFocoMochila = 'teclado';
        atualizarSelecaoSlots();
    }

    function ajustarSelecaoCintoValida() {
        if (!cintoLinhaAtual.length) return;

        const celulaAtual = cintoLinhaAtual[cintoSlotSelecionado];
        const selecaoAtualValida = celulaAtual
            && celulaAtual.tipoUI !== 'placeholder'
            && (celulaAtual.tipoUI !== 'slot-cinto' || !!celulaAtual.item);

        if (selecaoAtualValida) return;

        const primeiroItemCorpo = cintoLinhaAtual.findIndex(celula => celula?.tipoUI === 'item-corpo');
        cintoSlotSelecionado = primeiroItemCorpo >= 0 ? primeiroItemCorpo : INDICE_SLOT_CINTO;
    }

    function renderizarSlotsMochila(controle = window.playerControle) {
        const slots = garantirSlotsColete(controle);

        if (!temSecaoCinto(controle) && mochilaAreaSelecionada === 'cinto') {
            mochilaAreaSelecionada = 'colete';
        }

        cintoLinhaAtual = construirLinhaCinto(controle);
        ajustarSelecaoCintoValida();
        cintoSlotElements.forEach((slotEl, indice) => {
            if (!slotEl) return;
            const celula = cintoLinhaAtual[indice];
            const info = formatarCelulaCinto(celula);
            const ehPlaceholder = celula?.tipoUI === 'placeholder';
            
            // Empilhamento (Stacking): Canto superior direito, fundo verde
            const quantidade = celula?.item?.quantidade || 1;
            const ehEmpilhavel = ['scrap'].includes(celula?.item?.tipo) || celula?.item?.tipo?.endsWith('_plus');
            const badgeStack = (quantidade > 1 && ehEmpilhavel)
                ? `<span style="position: absolute; top: 5px; right: 5px; background: #00ff00; color: #000; font-size: 10px; font-weight: bold; padding: 0 4px; border-radius: 4px; z-index: 2; box-shadow: 0 0 3px rgba(0,0,0,0.5);">${quantidade}</span>`
                : '';

            // Sinal azul de "+" para itens melhorados
            const badgePlus = (celula?.item?.tipo?.endsWith('_plus'))
                ? `<span style="position: absolute; top: 3px; left: 5px; color: #0088ff; font-weight: 900; font-size: 16px; text-shadow: 0 0 2px #000; z-index: 2;">+</span>`
                : '';

            slotEl.style.opacity = ehPlaceholder ? '0.45' : '1';
            slotEl.style.position = 'relative'; // Garante posicionamento do badge
            slotEl.innerHTML = `
                ${badgeStack}${badgePlus}
                ${info.sprite ? `<img src="${info.sprite}" alt="${info.titulo}" style="width: 28px; height: 28px; image-rendering: pixelated; margin-bottom: 6px;">` : ''}
                <div style="font-size: 11px; font-weight: bold; letter-spacing: 1px; color: #f2f2f2; text-transform: uppercase; text-align: center;">${info.titulo}</div>
                <div style="font-size: 10px; color: ${info.cor}; margin-top: 6px; text-align: center;">${info.subtitulo}</div>
                <div style="font-size: 9px; color: #a8a8a8; margin-top: 4px; text-align: center;">${info.dica}</div>
            `;
        });

        mochilaSlotElements.forEach((slotEl, indice) => {
            if (!slotEl) return;
            const slotData = slots[indice];
            const info = formatarSlotColete(slotData, indice);
            
            // Empilhamento (Stacking): Canto superior direito, fundo verde
            const quantidade = slotData?.quantidade || 1;
            const ehEmpilhavel = ['scrap'].includes(slotData?.tipo) || slotData?.tipo?.endsWith('_plus');
            const badgeStack = (quantidade > 1 && ehEmpilhavel)
                ? `<span style="position: absolute; top: 5px; right: 5px; background: #00ff00; color: #000; font-size: 10px; font-weight: bold; padding: 0 4px; border-radius: 4px; z-index: 2; box-shadow: 0 0 3px rgba(0,0,0,0.5);">${quantidade}</span>`
                : '';

            // Sinal azul de "+" para itens melhorados
            const badgePlus = (slotData?.tipo?.endsWith('_plus'))
                ? `<span style="position: absolute; top: 3px; left: 5px; color: #0088ff; font-weight: 900; font-size: 18px; text-shadow: 0 0 2px #000; z-index: 2;">+</span>`
                : '';

            slotEl.style.position = 'relative';
            slotEl.innerHTML = `
                ${badgeStack}${badgePlus}
                ${info.sprite ? `<img src="${info.sprite}" alt="${info.titulo}" style="width: 30px; height: 30px; image-rendering: pixelated; margin-bottom: 6px;">` : ''}
                <div style="font-size: 12px; font-weight: bold; letter-spacing: 1px; color: #f2f2f2; text-transform: uppercase; text-align: center;">${info.titulo}</div>
                <div style="font-size: 11px; color: ${info.cor}; margin-top: 8px; text-align: center;">${info.subtitulo}</div>
                <div style="font-size: 10px; color: #a8a8a8; margin-top: 6px; text-align: center;">${info.dica}</div>
            `;
        });

        atualizarSelecaoSlots();
    }

    function fecharMenuMochilaUI() {
        const overlay = document.getElementById('colete-backpack-overlay');
        if (overlay) overlay.remove();
        mochilaSlotElements = [];
        cintoSlotElements = [];
        cintoLinhaAtual = [];
        botaoVoltarBaseAtivo = null;
        botaoFecharMochilaAtivo = null;
        selecaoVoltarBase = false;
        selecaoFecharMochila = false;
    }

    function criarBlocoTitulo(tipo) {
        const el = document.createElement('div');
        const titulos = {
            colete: { nome: 'Colete', sprite: window.config?.spriteItemColete || 'assets/personagem/colete_coletavel.png' },
            cinto: { nome: 'Cinto', sprite: window.config?.spriteItemCinto || 'assets/personagem/cinto_coletavel.png' }
        };
        const titulo = titulos[tipo];
        el.style.cssText = 'display: flex; align-items: center; min-height: 40px;';
        el.title = titulo.nome;
        const imagem = document.createElement('img');
        imagem.src = titulo.sprite;
        imagem.alt = titulo.nome;
        imagem.style.cssText = 'width: 52px; height: 40px; object-fit: contain; image-rendering: pixelated;';
        el.appendChild(imagem);
        return el;
    }

    function criarCelulaPadrao() {
        const slot = document.createElement('div');
        slot.classList.add('img-button', 'retro-grid');
        const baseStyle = `
            min-height: 96px;
            background: linear-gradient(180deg, #2a2a2a 0%, #1c1c1c 100%);
            border: 2px solid #4a4a4a;
            border-radius: 10px;
            padding: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease, background 0.12s ease;
            cursor: pointer;
            user-select: none;
        `;
        slot.style.cssText = baseStyle;
        
        // Efeito de hover
        slot.addEventListener('mouseenter', () => {
            ativarFocoMouse();
            slot.style.background = 'linear-gradient(180deg, #3a3a3a 0%, #2c2c2c 100%)';
            slot.style.transform = 'scale(1.03)';
        });
        slot.addEventListener('mouseleave', () => {
            if (!slot.classList.contains('is-key-selected')) {
                slot.style.background = 'linear-gradient(180deg, #2a2a2a 0%, #1c1c1c 100%)';
                slot.style.transform = 'scale(1)';
            }
        });
        
        return slot;
    }

    function criarCelulaCinto() {
        const celula = document.createElement('div');
        celula.style = `
            min-height: 84px;
            background: linear-gradient(180deg, #2a2a2a 0%, #1c1c1c 100%);
            border: 2px solid #4a4a4a;
            border-radius: 10px;
            padding: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease;
            cursor: pointer;
            user-select: none;
        `;
        celula.addEventListener('mouseenter', () => {
            ativarFocoMouse();
            celula.style.background = 'linear-gradient(180deg, #3a3a3a 0%, #2c2c2c 100%)';
            celula.style.transform = 'scale(1.03)';
        });
        celula.addEventListener('mouseleave', () => {
            if (!celula.classList.contains('is-key-selected')) {
                celula.style.background = 'linear-gradient(180deg, #2a2a2a 0%, #1c1c1c 100%)';
                celula.style.transform = 'scale(1)';
            }
        });
        return celula;
    }

    function abrirMenuMochilaUI(controle = window.playerControle) {
        if (!controle) return;

        garantirSlotsColete(controle);
        const overlay = criarOverlayBase();
        if (!overlay) return;

        const container = document.createElement('div');
        container.style = `
            width: min(94%, 760px);
            min-height: 420px;
            background: linear-gradient(180deg, #1e1e1e 0%, #141414 100%);
            border: 3px solid #4a4a4a;
            border-radius: 12px;
            box-shadow: 0 0 50px rgba(0,0,0,0.75);
            color: #fff;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            overflow: hidden;
        `;

        const header = document.createElement('div');
        header.style = 'padding: 18px 20px 14px; border-bottom: 1px solid #333; background: #222; text-align: center; position: relative;';
        
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'menu-close-button menu-nav-item';
        closeBtn.setAttribute('aria-label', 'Fechar armazenamento');
        closeBtn.title = 'Fechar';
        closeBtn.addEventListener('mouseenter', ativarFocoMouse);
        closeBtn.onclick = () => {
            window.toggleMochilaMenu(window.playerControle);
        };
        botaoFecharMochilaAtivo = closeBtn;
        header.appendChild(closeBtn);

        const craftSobJogador = baseSobJogador(controle);
        botaoVoltarBaseAtivo = null;
        selecaoVoltarBase = false;
        selecaoFecharMochila = false;
        if (craftSobJogador) {
            const voltarBaseBtn = document.createElement('button');
            voltarBaseBtn.type = 'button';
            voltarBaseBtn.className = 'menu-nav-item';
            voltarBaseBtn.setAttribute('aria-label', 'Voltar para o menu da base');
            voltarBaseBtn.title = 'Voltar para o menu da base';
            voltarBaseBtn.innerHTML = '<span aria-hidden="true" style="font-size:18px; line-height:1;">↩</span><span>VOLTAR À BASE</span>';
            voltarBaseBtn.style.cssText = 'position:absolute; top:12px; left:15px; display:flex; align-items:center; gap:9px; padding:9px 14px; border:1px solid rgba(0,238,255,0.6); border-radius:8px; background:linear-gradient(135deg, rgba(0,115,130,0.42), rgba(20,28,34,0.96)); color:#e8fdff; font:700 11px/1 "Segoe UI", Tahoma, sans-serif; letter-spacing:1px; text-shadow:0 1px 3px #000; cursor:pointer; transition:transform .12s ease, box-shadow .12s ease, border-color .12s ease;';
            voltarBaseBtn.onmouseenter = () => {
                ativarFocoMouse();
                voltarBaseBtn.style.boxShadow = '0 0 15px rgba(0,238,255,0.35)';
            };
            voltarBaseBtn.onmouseleave = () => atualizarSelecaoSlots();
            voltarBaseBtn.onclick = () => {
                const contexto = {
                    craftId: String(craftSobJogador.id || ''),
                    x: craftSobJogador.x,
                    y: craftSobJogador.y,
                    nivel: String(craftSobJogador.nivel || 1),
                    modoRenascimento: String(craftSobJogador.modoRenascimento || ''),
                    sprite: craftSobJogador.elementos?.[Math.max(0, Number(craftSobJogador.nivel || 1) - 1)]?.src
                        || craftSobJogador.elementos?.[0]?.src
                        || 'assets/craft/craft_nivel1.png',
                    interactor: controle
                };
                window.toggleMochilaMenu(controle);
                window.abrirTelaInteracao?.('craft_base', contexto);
            };
            botaoVoltarBaseAtivo = voltarBaseBtn;
            header.appendChild(voltarBaseBtn);
        }

        const title = document.createElement('h2');
        title.style = 'margin: 0; letter-spacing: 2px; text-transform: uppercase;';
        title.textContent = 'Slots do Cinto e Colete';
        header.appendChild(title);

        const subtitle = document.createElement('p');
        subtitle.style = 'margin: 8px 0 0; color: #d0d0d0; font-size: 13px;';
        subtitle.textContent = `Cinto com 1 slot central • Colete com ${capacidadeColete()} slots`;
        header.appendChild(subtitle);

        const body = document.createElement('div');
        body.style = 'padding: 20px; display: flex; flex-direction: column; gap: 16px;';

        const descricao = document.createElement('div');
        descricao.style = 'font-size: 12px; color: #b8b8b8; text-align: center; line-height: 1.4;';
        descricao.textContent = 'Na faixa do cinto, ENTER guarda o item do corpo no slot central. No slot central e nos slots do colete, ENTER usa ou larga. CHUTE larga direto do slot selecionado.';
        body.appendChild(descricao);

        const secaoColete = document.createElement('div');
        secaoColete.style = 'display: flex; flex-direction: column; gap: 8px;';
        secaoColete.appendChild(criarBlocoTitulo('colete'));

        const grid = document.createElement('div');
        grid.style = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;';

        mochilaSlotElements = Array.from({ length: capacidadeColete() }, (_, indice) => {
            const slot = criarCelulaPadrao();
            
            // Evento de clique para selecionar o slot
            slot.addEventListener('click', (e) => {
                e.stopPropagation();
                mochilaAreaSelecionada = 'colete';
                mochilaSlotSelecionado = indice;
                atualizarSelecaoSlots();
            });
            
            // Duplo clique para acionar a ação (usar/dropar)
            slot.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                e.preventDefault();
                mochilaAreaSelecionada = 'colete';
                mochilaSlotSelecionado = indice;
                acionarSelecaoAtual();
            });
            
            // Botão direito do mouse para dropar
            slot.addEventListener('contextmenu', (e) => {
                e.stopPropagation();
                e.preventDefault();
                mochilaAreaSelecionada = 'colete';
                mochilaSlotSelecionado = indice;
                droparSelecaoAtual();
            });
            
            grid.appendChild(slot);
            return slot;
        });

        secaoColete.appendChild(grid);
        body.appendChild(secaoColete);

        if (temSecaoCinto(controle)) {
            const secaoCinto = document.createElement('div');
            secaoCinto.style = 'display: flex; flex-direction: column; gap: 8px;';
            secaoCinto.appendChild(criarBlocoTitulo('cinto'));

            const linhaCinto = document.createElement('div');
            linhaCinto.style = 'display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px;';

            cintoSlotElements = Array.from({ length: TOTAL_CELULAS_CINTO }, (_, indice) => {
                const celula = criarCelulaPadrao();
                celula.style.minHeight = '84px';
                
                // Evento de clique para selecionar o slot do cinto
                celula.addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Verifica se a célula é válida para seleção (não é placeholder)
                    const celulaAtual = cintoLinhaAtual[indice];
                    if (!celulaAtual || celulaAtual.tipoUI === 'placeholder') return;
                    
                    mochilaAreaSelecionada = 'cinto';
                    cintoSlotSelecionado = indice;
                    atualizarSelecaoSlots();
                });
                
                // Duplo clique para acionar a ação
                celula.addEventListener('dblclick', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const celulaAtual = cintoLinhaAtual[indice];
                    if (!celulaAtual || celulaAtual.tipoUI === 'placeholder') return;
                    
                    mochilaAreaSelecionada = 'cinto';
                    cintoSlotSelecionado = indice;
                    acionarSelecaoAtual();
                });
                
                // Botão direito do mouse para dropar
                celula.addEventListener('contextmenu', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    const celulaAtual = cintoLinhaAtual[indice];
                    if (!celulaAtual || celulaAtual.tipoUI === 'placeholder') return;
                    
                    mochilaAreaSelecionada = 'cinto';
                    cintoSlotSelecionado = indice;
                    droparSelecaoAtual();
                });
                
                linhaCinto.appendChild(celula);
                return celula;
            });

            secaoCinto.appendChild(linhaCinto);
            body.appendChild(secaoCinto);
        } else {
            cintoSlotElements = [];
        }

        const footer = document.createElement('div');
        footer.style = 'padding-top: 8px; text-align: center; font-size: 11px; color: #888; text-transform: uppercase;';
        footer.textContent = 'CLIQUE seleciona • DUPLO CLIQUE usa • BOTÃO DIR. dropa • ESC fecha';

        body.appendChild(footer);
        container.appendChild(header);
        container.appendChild(body);
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        renderizarSlotsMochila(controle);
        // [MODAIS] Repoem o tamanho antigo (scale) sem tocar na camera.
        if (typeof window.sincronizarEscalaModais === 'function') {
            try { window.sincronizarEscalaModais(); } catch (_) {}
        }
    }

    function moverSelecaoColete(deltaLinha, deltaColuna) {
        const linhas = Math.max(1, Math.ceil(capacidadeColete() / COLUNAS_COLETE));
        const linhaAtual = Math.floor(mochilaSlotSelecionado / COLUNAS_COLETE);
        const colunaAtual = mochilaSlotSelecionado % COLUNAS_COLETE;
        const novaLinha = (linhaAtual + deltaLinha + linhas) % linhas;
        const novaColuna = (colunaAtual + deltaColuna + COLUNAS_COLETE) % COLUNAS_COLETE;
        mochilaSlotSelecionado = Math.min((novaLinha * COLUNAS_COLETE) + novaColuna, capacidadeColete() - 1);
        atualizarSelecaoSlots();
    }

    function moverSelecaoCinto(delta) {
        if (!cintoLinhaAtual.length) return;

        for (let tentativa = 0; tentativa < TOTAL_CELULAS_CINTO; tentativa++) {
            cintoSlotSelecionado = (cintoSlotSelecionado + delta + TOTAL_CELULAS_CINTO) % TOTAL_CELULAS_CINTO;
            if (cintoLinhaAtual[cintoSlotSelecionado]?.tipoUI !== 'placeholder') {
                break;
            }
        }

        atualizarSelecaoSlots();
    }

    function acionarSelecaoAtual() {
        if (mochilaAreaSelecionada === 'cinto') {
            const celula = cintoLinhaAtual[cintoSlotSelecionado];
            if (!celula) return;

            if (celula.tipoUI === 'item-corpo' && typeof window.guardarEquipamentoNoCinto === 'function') {
                window.guardarEquipamentoNoCinto(celula.item?.tipo);
            } else if (celula.tipoUI === 'slot-cinto' && typeof window.usarOuDroparItemCinto === 'function') {
                window.usarOuDroparItemCinto();
            }

            renderizarSlotsMochila(window.playerControle);
            return;
        }

        if (typeof window.usarOuDroparItemColete === 'function') {
            window.usarOuDroparItemColete(mochilaSlotSelecionado);
            renderizarSlotsMochila(window.playerControle);
        }
    }

    function droparSelecaoAtual() {
        if (mochilaAreaSelecionada === 'cinto') {
            const celula = cintoLinhaAtual[cintoSlotSelecionado];
            if (celula?.tipoUI === 'slot-cinto' && typeof window.droparItemCinto === 'function') {
                window.droparItemCinto();
                renderizarSlotsMochila(window.playerControle);
            }
            return;
        }

        if (typeof window.droparItemColete === 'function') {
            window.droparItemColete(mochilaSlotSelecionado);
            renderizarSlotsMochila(window.playerControle);
        }
    }

    function handleMochilaMenuInput(e) {
        if (!window.isMochilaMenuOpen) return;

        const key = String(e.key || '').toLowerCase();
        if (key === 'escape' || key === 'esc') {
            e.preventDefault();
            // Consome o ESC aqui: sem isso ele borbulha ate o listener global
            // (controles.js) que abre o pause por cima — jogo segue pausado e
            // a camera congela (mesmo "bug" das skills/base).
            e.stopPropagation();
            window.toggleMochilaMenu(window.playerControle);
            return;
        }

        if (['arrowleft', 'a', 'arrowright', 'd', 'arrowup', 'w', 'arrowdown', 's', 'enter', ' '].includes(key)) {
            ativarFocoTeclado();
        }

        if (key === 'arrowleft' || key === 'a') {
            e.preventDefault();
            if (selecaoFecharMochila) {
                if (botaoVoltarBaseAtivo) {
                    selecaoFecharMochila = false;
                    selecaoVoltarBase = true;
                    atualizarSelecaoSlots();
                }
                return;
            }
            if (selecaoVoltarBase) return;
            if (mochilaAreaSelecionada === 'cinto') moverSelecaoCinto(-1);
            else moverSelecaoColete(0, -1);
            return;
        }
        if (key === 'arrowright' || key === 'd') {
            e.preventDefault();
            if (selecaoVoltarBase && botaoFecharMochilaAtivo) {
                selecaoVoltarBase = false;
                selecaoFecharMochila = true;
                atualizarSelecaoSlots();
                return;
            }
            if (selecaoVoltarBase) return;
            if (mochilaAreaSelecionada === 'cinto') moverSelecaoCinto(1);
            else moverSelecaoColete(0, 1);
            return;
        }
        if (key === 'arrowup' || key === 'w') {
            e.preventDefault();
            if (selecaoVoltarBase || selecaoFecharMochila) return;
            if (mochilaAreaSelecionada === 'cinto') {
                mochilaAreaSelecionada = 'colete';
                atualizarSelecaoSlots();
            } else if (botaoVoltarBaseAtivo && mochilaSlotSelecionado < COLUNAS_COLETE) {
                selecaoVoltarBase = true;
                atualizarSelecaoSlots();
            } else if (botaoFecharMochilaAtivo && mochilaSlotSelecionado < COLUNAS_COLETE) {
                selecaoFecharMochila = true;
                atualizarSelecaoSlots();
            } else {
                moverSelecaoColete(-1, 0);
            }
            return;
        }
        if (key === 'arrowdown' || key === 's') {
            e.preventDefault();
            if (selecaoVoltarBase || selecaoFecharMochila) {
                selecaoVoltarBase = false;
                selecaoFecharMochila = false;
                atualizarSelecaoSlots();
            } else if (mochilaAreaSelecionada === 'colete') {
                const totalLinhasColete = Math.max(1, Math.ceil(capacidadeColete() / COLUNAS_COLETE));
                const linhaAtual = Math.floor(mochilaSlotSelecionado / COLUNAS_COLETE);
                if (linhaAtual >= totalLinhasColete - 1 && temSecaoCinto(window.playerControle)) {
                    mochilaAreaSelecionada = 'cinto';
                    ajustarSelecaoCintoValida();
                    atualizarSelecaoSlots();
                } else {
                    moverSelecaoColete(1, 0);
                }
            }
            return;
        }
        if (key === 'enter' || key === ' ') {
            e.preventDefault();
            if (selecaoVoltarBase && botaoVoltarBaseAtivo) botaoVoltarBaseAtivo.click();
            else if (selecaoFecharMochila && botaoFecharMochilaAtivo) botaoFecharMochilaAtivo.click();
            else acionarSelecaoAtual();
            return;
        }
        if (teclaEhAcaoMenu(key, 'chute')) {
            e.preventDefault();
            droparSelecaoAtual();
        }
    }

    window.toggleMochilaMenu = (controle = window.playerControle) => {
        if (!controle) return false;
        const temUtilidades = !!controle.temColete || !!controle.temCinto || !!controle.cintoSlot;
        if (!window.isMochilaMenuOpen && !temUtilidades) return false;
        if (!window.isMochilaMenuOpen && (window.isMenuOpen || window.isSkillMenuOpen)) return false;

        window.isMochilaMenuOpen = !window.isMochilaMenuOpen;

        // [E2] Pausa com dono proprio (mochila).
        if (typeof window.setPausado === 'function') {
            window.setPausado(window.isMochilaMenuOpen, 'mochila');
        } else if (typeof window.togglePause === 'function') {
            window.togglePause('mochila');
        }
        window.TutorialControles?.sincronizarVisibilidade?.();

        if (window.isMochilaMenuOpen) {
            mochilaAreaSelecionada = controle?.temColete ? 'colete' : (temSecaoCinto(controle) ? 'cinto' : 'colete');
            mochilaSlotSelecionado = 0;
            cintoSlotSelecionado = INDICE_SLOT_CINTO;
            abrirMenuMochilaUI(controle);
            window.addEventListener('keydown', handleMochilaMenuInput);
        } else {
            window.removeEventListener('keydown', handleMochilaMenuInput);
            fecharMenuMochilaUI();
            // [FIX B] Snap instantaneo ao fechar mochila.
            if (typeof window.recolocarCameraNoJogador === 'function') {
                try { window.recolocarCameraNoJogador(); } catch (_) {}
            }
        }

        return true;
    };

    window.atualizarMochilaUI = (controle = window.playerControle) => {
        if (window.isMochilaMenuOpen) {
            renderizarSlotsMochila(controle);
        }
    };

    window.abrirMenuMochilaUI = abrirMenuMochilaUI;
    window.fecharMenuMochilaUI = fecharMenuMochilaUI;
})();
