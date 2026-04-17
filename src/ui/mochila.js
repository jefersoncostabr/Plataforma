(function () {
    window.isMochilaMenuOpen = false;
    let mochilaAreaSelecionada = 'colete';
    let mochilaSlotSelecionado = 0;
    let cintoSlotSelecionado = 3;
    let mochilaSlotElements = [];
    let cintoSlotElements = [];
    let cintoLinhaAtual = [];

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

    function formatarSlotColete(slot, indice) {
        if (!slot) {
            return {
                titulo: `SLOT ${indice + 1}`,
                subtitulo: 'Vazio',
                dica: 'Aguardando item',
                cor: '#9a9a9a'
            };
        }

        const podeUsar = typeof window.itemColetePodeSerUsadoAgora === 'function'
            ? window.itemColetePodeSerUsadoAgora(slot)
            : false;

        return {
            titulo: String(slot.nome || slot.tipo || `SLOT ${indice + 1}`),
            subtitulo: podeUsar ? 'Pronto para usar' : 'Enter usa ou larga',
            dica: teclaEhAcaoMenu('k', 'chute') ? 'Chute larga direto' : 'Item guardado',
            cor: slot.consumivel ? '#7bd4ff' : '#9be28f'
        };
    }

    function formatarCelulaCinto(celula) {
        if (!celula || celula.tipoUI === 'placeholder') {
            return {
                titulo: '---',
                subtitulo: 'Sem item',
                dica: 'Espaço livre',
                cor: '#7b7b7b'
            };
        }

        if (celula.tipoUI === 'item-corpo') {
            return {
                titulo: String(celula.item?.nome || celula.item?.tipo || 'Item'),
                subtitulo: 'No jogador',
                dica: 'Enter guarda no cinto',
                cor: '#8fd6ff'
            };
        }

        if (!celula.item) {
            return {
                titulo: 'SLOT DO CINTO',
                subtitulo: 'Vazio',
                dica: 'Guarda 1 item do corpo',
                cor: '#f7e27b'
            };
        }

        const podeUsar = typeof window.itemCintoPodeSerUsadoAgora === 'function'
            ? window.itemCintoPodeSerUsadoAgora(celula.item)
            : false;

        return {
            titulo: String(celula.item.nome || celula.item.tipo || 'Item'),
            subtitulo: podeUsar ? 'Pronto para usar' : 'Enter usa ou larga',
            dica: teclaEhAcaoMenu('k', 'chute') ? 'Chute larga direto' : 'Item guardado',
            cor: celula.item.consumivel ? '#7bd4ff' : '#9be28f'
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

    function aplicarEstiloSelecao(slotEl, selecionado) {
        if (!slotEl) return;
        slotEl.style.borderColor = selecionado ? '#f7e27b' : '#4a4a4a';
        slotEl.style.boxShadow = selecionado
            ? '0 0 0 2px rgba(247,226,123,0.55), inset 0 0 12px rgba(247,226,123,0.18)'
            : 'inset 0 0 8px rgba(0,0,0,0.25)';
        slotEl.style.transform = selecionado ? 'scale(1.03)' : 'scale(1)';
    }

    function atualizarSelecaoSlots() {
        cintoSlotElements.forEach((slotEl, indice) => {
            const selecionado = mochilaAreaSelecionada === 'cinto' && indice === cintoSlotSelecionado;
            aplicarEstiloSelecao(slotEl, selecionado);
        });

        mochilaSlotElements.forEach((slotEl, indice) => {
            const selecionado = mochilaAreaSelecionada === 'colete' && indice === mochilaSlotSelecionado;
            aplicarEstiloSelecao(slotEl, selecionado);
        });
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
            const info = formatarCelulaCinto(cintoLinhaAtual[indice]);
            const ehPlaceholder = cintoLinhaAtual[indice]?.tipoUI === 'placeholder';
            slotEl.style.opacity = ehPlaceholder ? '0.45' : '1';
            slotEl.innerHTML = `
                <div style="font-size: 11px; font-weight: bold; letter-spacing: 1px; color: #f2f2f2; text-transform: uppercase; text-align: center;">${info.titulo}</div>
                <div style="font-size: 10px; color: ${info.cor}; margin-top: 6px; text-align: center;">${info.subtitulo}</div>
                <div style="font-size: 9px; color: #a8a8a8; margin-top: 4px; text-align: center;">${info.dica}</div>
            `;
        });

        mochilaSlotElements.forEach((slotEl, indice) => {
            if (!slotEl) return;
            const info = formatarSlotColete(slots[indice], indice);
            slotEl.innerHTML = `
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
    }

    function criarBlocoTitulo(texto) {
        const el = document.createElement('div');
        el.style = 'font-size: 12px; letter-spacing: 1px; text-transform: uppercase; color: #d8d8d8; text-align: left;';
        el.textContent = texto;
        return el;
    }

    function criarCelulaPadrao() {
        const slot = document.createElement('div');
        slot.style = `
            min-height: 96px;
            background: linear-gradient(180deg, #2a2a2a 0%, #1c1c1c 100%);
            border: 2px solid #4a4a4a;
            border-radius: 10px;
            padding: 10px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease;
        `;
        return slot;
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
        header.style = 'padding: 18px 20px 14px; border-bottom: 1px solid #333; background: #222; text-align: center;';
        header.innerHTML = `
            <h2 style="margin: 0; letter-spacing: 2px; text-transform: uppercase;">Slots do Cinto e Colete</h2>
            <p style="margin: 8px 0 0; color: #d0d0d0; font-size: 13px;">Cinto com 1 slot central • Colete com ${capacidadeColete()} slots</p>
        `;

        const body = document.createElement('div');
        body.style = 'padding: 20px; display: flex; flex-direction: column; gap: 16px;';

        const descricao = document.createElement('div');
        descricao.style = 'font-size: 12px; color: #b8b8b8; text-align: center; line-height: 1.4;';
        descricao.textContent = 'Na faixa do cinto, ENTER guarda o item do corpo no slot central. No slot central e nos slots do colete, ENTER usa ou larga. CHUTE larga direto do slot selecionado.';
        body.appendChild(descricao);

        const secaoColete = document.createElement('div');
        secaoColete.style = 'display: flex; flex-direction: column; gap: 8px;';
        secaoColete.appendChild(criarBlocoTitulo('Colete'));

        const grid = document.createElement('div');
        grid.style = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;';

        mochilaSlotElements = Array.from({ length: capacidadeColete() }, () => {
            const slot = criarCelulaPadrao();
            grid.appendChild(slot);
            return slot;
        });

        secaoColete.appendChild(grid);
        body.appendChild(secaoColete);

        if (temSecaoCinto(controle)) {
            const secaoCinto = document.createElement('div');
            secaoCinto.style = 'display: flex; flex-direction: column; gap: 8px;';
            secaoCinto.appendChild(criarBlocoTitulo('Cinto'));

            const linhaCinto = document.createElement('div');
            linhaCinto.style = 'display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px;';

            cintoSlotElements = Array.from({ length: TOTAL_CELULAS_CINTO }, () => {
                const celula = criarCelulaPadrao();
                celula.style.minHeight = '84px';
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
        footer.textContent = 'ESC fecha • ENTER guarda, usa ou larga • CHUTE larga direto';

        body.appendChild(footer);
        container.appendChild(header);
        container.appendChild(body);
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        renderizarSlotsMochila(controle);
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
            window.toggleMochilaMenu(window.playerControle);
            return;
        }

        if (key === 'arrowleft' || key === 'a') {
            e.preventDefault();
            if (mochilaAreaSelecionada === 'cinto') moverSelecaoCinto(-1);
            else moverSelecaoColete(0, -1);
            return;
        }
        if (key === 'arrowright' || key === 'd') {
            e.preventDefault();
            if (mochilaAreaSelecionada === 'cinto') moverSelecaoCinto(1);
            else moverSelecaoColete(0, 1);
            return;
        }
        if (key === 'arrowup' || key === 'w') {
            e.preventDefault();
            if (mochilaAreaSelecionada === 'cinto') {
                mochilaAreaSelecionada = 'colete';
                atualizarSelecaoSlots();
            } else {
                moverSelecaoColete(-1, 0);
            }
            return;
        }
        if (key === 'arrowdown' || key === 's') {
            e.preventDefault();
            if (mochilaAreaSelecionada === 'colete') {
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
            acionarSelecaoAtual();
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

        if (typeof window.togglePause === 'function') {
            window.togglePause();
        }

        if (window.isMochilaMenuOpen) {
            mochilaAreaSelecionada = controle?.temColete ? 'colete' : (temSecaoCinto(controle) ? 'cinto' : 'colete');
            mochilaSlotSelecionado = 0;
            cintoSlotSelecionado = INDICE_SLOT_CINTO;
            abrirMenuMochilaUI(controle);
            window.addEventListener('keydown', handleMochilaMenuInput);
        } else {
            window.removeEventListener('keydown', handleMochilaMenuInput);
            fecharMenuMochilaUI();
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
