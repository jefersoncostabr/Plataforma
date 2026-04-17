(function () {
    window.isMochilaMenuOpen = false;
    let mochilaSlotSelecionado = 0;
    let mochilaSlotElements = [];

    function capacidadeColete() {
        return Math.max(1, Number(window.coleteConfig?.capacidade ?? 6));
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

    function formatarSlot(slot, indice) {
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

    function atualizarSelecaoSlots() {
        mochilaSlotElements.forEach((slotEl, indice) => {
            if (!slotEl) return;
            const selecionado = indice === mochilaSlotSelecionado;
            slotEl.style.borderColor = selecionado ? '#f7e27b' : '#4a4a4a';
            slotEl.style.boxShadow = selecionado
                ? '0 0 0 2px rgba(247,226,123,0.55), inset 0 0 12px rgba(247,226,123,0.18)'
                : 'inset 0 0 8px rgba(0,0,0,0.25)';
            slotEl.style.transform = selecionado ? 'scale(1.03)' : 'scale(1)';
        });
    }

    function renderizarSlotsMochila(controle = window.playerControle) {
        const slots = garantirSlotsColete(controle);
        mochilaSlotElements.forEach((slotEl, indice) => {
            if (!slotEl) return;
            const info = formatarSlot(slots[indice], indice);
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
    }

    function abrirMenuMochilaUI(controle = window.playerControle) {
        if (!controle) return;

        garantirSlotsColete(controle);
        const overlay = criarOverlayBase();
        if (!overlay) return;

        const container = document.createElement('div');
        container.style = `
            width: min(92%, 560px);
            min-height: 360px;
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
            <h2 style="margin: 0; letter-spacing: 2px; text-transform: uppercase;">Slots do Colete</h2>
            <p style="margin: 8px 0 0; color: #d0d0d0; font-size: 13px;">Capacidade atual: ${capacidadeColete()} slots</p>
        `;

        const body = document.createElement('div');
        body.style = 'padding: 20px; display: flex; flex-direction: column; gap: 16px;';

        const descricao = document.createElement('div');
        descricao.style = 'font-size: 12px; color: #b8b8b8; text-align: center; line-height: 1.4;';
        descricao.textContent = 'WASD ou setas navegam. ENTER usa o item se necessário ou o larga no chão. CHUTE larga direto o item.';

        const grid = document.createElement('div');
        grid.style = 'display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;';

        mochilaSlotElements = Array.from({ length: capacidadeColete() }, () => {
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
            grid.appendChild(slot);
            return slot;
        });

        const footer = document.createElement('div');
        footer.style = 'padding-top: 8px; text-align: center; font-size: 11px; color: #888; text-transform: uppercase;';
        footer.textContent = 'ESC fecha • ENTER usa ou larga • CHUTE larga direto';

        body.appendChild(descricao);
        body.appendChild(grid);
        body.appendChild(footer);
        container.appendChild(header);
        container.appendChild(body);
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        renderizarSlotsMochila(controle);
    }

    function moverSelecao(deltaLinha, deltaColuna) {
        const colunas = 3;
        const linhas = Math.max(1, Math.ceil(capacidadeColete() / colunas));
        const linhaAtual = Math.floor(mochilaSlotSelecionado / colunas);
        const colunaAtual = mochilaSlotSelecionado % colunas;
        const novaLinha = (linhaAtual + deltaLinha + linhas) % linhas;
        const novaColuna = (colunaAtual + deltaColuna + colunas) % colunas;
        mochilaSlotSelecionado = Math.min((novaLinha * colunas) + novaColuna, capacidadeColete() - 1);
        atualizarSelecaoSlots();
    }

    function handleMochilaMenuInput(e) {
        if (!window.isMochilaMenuOpen) return;

        const key = String(e.key || '').toLowerCase();
        if (key === 'arrowleft' || key === 'a') {
            e.preventDefault();
            moverSelecao(0, -1);
            return;
        }
        if (key === 'arrowright' || key === 'd') {
            e.preventDefault();
            moverSelecao(0, 1);
            return;
        }
        if (key === 'arrowup' || key === 'w') {
            e.preventDefault();
            moverSelecao(-1, 0);
            return;
        }
        if (key === 'arrowdown' || key === 's') {
            e.preventDefault();
            moverSelecao(1, 0);
            return;
        }
        if (key === 'enter' || key === ' ') {
            e.preventDefault();
            if (typeof window.usarOuDroparItemColete === 'function') {
                window.usarOuDroparItemColete(mochilaSlotSelecionado);
                renderizarSlotsMochila(window.playerControle);
            }
            return;
        }
        if (teclaEhAcaoMenu(key, 'chute')) {
            e.preventDefault();
            if (typeof window.droparItemColete === 'function') {
                window.droparItemColete(mochilaSlotSelecionado);
                renderizarSlotsMochila(window.playerControle);
            }
        }
    }

    window.toggleMochilaMenu = (controle = window.playerControle) => {
        if (!controle) return false;
        if (!window.isMochilaMenuOpen && !controle.temColete) return false;
        if (!window.isMochilaMenuOpen && (window.isMenuOpen || window.isSkillMenuOpen)) return false;

        window.isMochilaMenuOpen = !window.isMochilaMenuOpen;

        if (typeof window.togglePause === 'function') {
            window.togglePause();
        }

        if (window.isMochilaMenuOpen) {
            mochilaSlotSelecionado = 0;
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
