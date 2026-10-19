// src/ui/cheat-menu.js
(function () {
    // Estado
    let isOpen = false;
    const teclasPressionadas = new Set();
    const COMBO = ['q', 'e', 'j', 'k'];
    let overlayEl = null;
    let cheatMenuBtns = [];

    // Utilitário: verifica se todos do combo estão pressionados
    function comboAtivo() {
        // Retorna true se TODAS as teclas do combo estiverem pressionadas
        return COMBO.every(t => teclasPressionadas.has(t));
    }

    // Abrir/fechar menu
    window.toggleCheatMenu = function () {
        if (isOpen) {
            removeCheatMenu();
        } else {
            renderCheatMenu();
        }
    };

    // Keydown/up listeners
    function onKeyDown(e) {
        const key = e.key.toLowerCase();
        if (isOpen) return;
        const wasCombo = comboAtivo();
        teclasPressionadas.add(key);
        // Só abre se combo ficou completo neste keydown
        if (!isOpen && comboAtivo() && !wasCombo) {
            window.toggleCheatMenu();
        }
    }
    function onKeyUp(e) {
        const key = e.key.toLowerCase();
        teclasPressionadas.delete(key);
    }

    function handleCheatMenuInput(e) {
        if (!isOpen || !cheatMenuBtns.length) return;

        const tecla = String(e.key || '').toLowerCase();
        const indiceAtual = Math.max(0, cheatMenuBtns.indexOf(document.activeElement));
        if (tecla === 'escape' || tecla === 'esc') {
            e.preventDefault();
            e.stopPropagation();
            window.toggleCheatMenu();
            return;
        }

        let proximoIndice = indiceAtual;
        if (tecla === 'home') proximoIndice = 0;
        else if (tecla === 'end') proximoIndice = cheatMenuBtns.length - 1;
        else if (['arrowdown', 's'].includes(tecla)) proximoIndice = (indiceAtual + 1) % cheatMenuBtns.length;
        else if (['arrowup', 'w'].includes(tecla)) proximoIndice = (indiceAtual - 1 + cheatMenuBtns.length) % cheatMenuBtns.length;
        else if (tecla === 'enter' || tecla === ' ') {
            e.preventDefault();
            e.stopPropagation();
            cheatMenuBtns[indiceAtual]?.click();
            return;
        } else if (tecla === 'tab') {
            const primeiro = cheatMenuBtns[0];
            const ultimo = cheatMenuBtns[cheatMenuBtns.length - 1];
            if (e.shiftKey && document.activeElement === primeiro) {
                e.preventDefault();
                ultimo.focus();
            } else if (!e.shiftKey && document.activeElement === ultimo) {
                e.preventDefault();
                primeiro.focus();
            }
            return;
        } else {
            return;
        }

        e.preventDefault();
        e.stopPropagation();
        cheatMenuBtns[proximoIndice]?.focus();
    }

    // Overlay e botões
    // Flag para saber se o cheat menu pausou o jogo
    let cheatMenuPausou = false;
    // Flag para saber se foi aberto via combo no gameplay
    let cheatMenuAbertoViaCombo = false;

    function renderCheatMenu() {
        if (isOpen) return;
        isOpen = true;
        cheatMenuPausou = false;
        cheatMenuAbertoViaCombo = false;
        // Pausar jogo se estiver no gameplay (não pausado e não em menus)
        // [E2] Pausa com dono proprio (cheat).
        if (
            typeof window.setPausado === 'function' &&
            !window.isPaused &&
            !window.isMenuOpen &&
            !window.isSkillMenuOpen &&
            !window.isMochilaMenuOpen &&
            !window.isInteractionMenuOpen
        ) {
            window.setPausado(true, 'cheat');
            cheatMenuPausou = true;
            cheatMenuAbertoViaCombo = true;
        } else if (
            typeof window.togglePause === 'function' &&
            !window.isPaused &&
            !window.isMenuOpen &&
            !window.isSkillMenuOpen &&
            !window.isMochilaMenuOpen &&
            !window.isInteractionMenuOpen
        ) {
            window.togglePause('cheat');
            cheatMenuPausou = true;
            cheatMenuAbertoViaCombo = true;
        }
        // Overlay escuro centralizado
        overlayEl = document.createElement('div');
        overlayEl.className = 'cheat-menu-overlay';
        overlayEl.tabIndex = -1;
        overlayEl.setAttribute('role', 'dialog');
        overlayEl.setAttribute('aria-modal', 'true');
        overlayEl.addEventListener('mousedown', (e) => {
            if (e.target === overlayEl) window.toggleCheatMenu();
        });

        // Container dos botões (padrão menu principal)
        const box = document.createElement('div');
        box.className = 'cheat-menu-box';

        // Título
        const title = document.createElement('h2');
        title.textContent = 'CHEAT MENU';
        title.className = 'cheat-menu-title';
        title.id = 'cheat-menu-title';
        overlayEl.setAttribute('aria-labelledby', title.id);
        box.appendChild(title);

        // Botões (agora <button>, padrão menu principal)
        const options = getCheatOptions();
        cheatMenuBtns = [];
        for (const opt of options) {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'cheat-menu-select-btn menu-nav-item';
            btn.dataset.menuMode = 'cheat';
            btn.dataset.navType = 'action';
            btn.title = opt.label;
            btn.innerText = opt.label;
            btn.onmouseenter = () => selectBtn(btn);
            btn.onmouseleave = () => selectBtn(null);
            btn.onfocus = () => {
                selectBtn(btn);
                btn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            };
            btn.onblur = () => selectBtn(null);
            btn.onclick = (e) => {
                e.stopPropagation();
                opt.action();
                if (opt.closeOnClick) window.toggleCheatMenu();
            };
            cheatMenuBtns.push(btn);
            box.appendChild(btn);
        }
        // Botão fechar igual ao menu principal: X, só classes, sem sobrescrita de estilo
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.className = 'menu-close-button menu-nav-item';
        closeBtn.setAttribute('aria-label', 'Fechar menu');
        closeBtn.title = 'Fechar';
        closeBtn.dataset.menuMode = 'cheat';
        closeBtn.dataset.navType = 'action';
        closeBtn.onmouseenter = () => selectBtn(closeBtn);
        closeBtn.onfocus = () => {
            selectBtn(closeBtn);
            closeBtn.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        };
        closeBtn.onblur = () => selectBtn(null);
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            window.toggleCheatMenu();
        };
        cheatMenuBtns.push(closeBtn);
        box.appendChild(closeBtn);
        // Garante que overlay não bloqueie pointer-events do botão X
        overlayEl.style.pointerEvents = 'auto';

        // Seleção visual (hover/focus)
        function selectBtn(btn) {
            for (const b of cheatMenuBtns) {
                if (b === btn) {
                    b.classList.add('selected');
                } else {
                    b.classList.remove('selected');
                }
            }
        }

        overlayEl.appendChild(box);
        document.body.appendChild(overlayEl);
        window.addEventListener('keydown', handleCheatMenuInput, true);
        // [MODAIS] Repoem o tamanho antigo (scale) sem tocar na camera.
        if (typeof window.sincronizarEscalaModais === 'function') {
            try { window.sincronizarEscalaModais(); } catch (_) {}
        }
        // Foco acessível
        setTimeout(() => cheatMenuBtns[0]?.focus(), 10);
    }
    function removeCheatMenu() {
        if (!isOpen) return;
        isOpen = false;
        window.removeEventListener('keydown', handleCheatMenuInput, true);
        if (overlayEl) overlayEl.remove();
        overlayEl = null;
        cheatMenuBtns = [];
        // Só despausa se foi aberto via combo no gameplay
        // [E2] Libera so o dono 'cheat'; se outro menu pausou por cima, o jogo
        // continua pausado corretamente.
        if (
            cheatMenuAbertoViaCombo &&
            typeof window.setPausado === 'function' &&
            window.isPaused
        ) {
            window.setPausado(false, 'cheat');
        } else if (
            cheatMenuAbertoViaCombo &&
            typeof window.togglePause === 'function' &&
            window.isPaused
        ) {
            window.togglePause('cheat');
        }
        // [FIX B] Cheat menu tambem pausa sem setar flag is*MenuOpen; ao
        // fechar, recoloca a camera para nao herdar posicao obsoleta.
        if (typeof window.recolocarCameraNoJogador === 'function') {
            try { window.recolocarCameraNoJogador(); } catch (_) {}
        }
    }

    function spawnInimigoCheat(tipoEscolhido) {
        if (typeof window.criarInimigoAleatorio !== 'function') return;
        const plataformas = Object.keys(window.plataformas || {}).filter((coord) => /^[a-z]+\d+$/i.test(coord));
        if (!plataformas.length) {
            console.warn('[Cheats] Não foi possível criar inimigo: a fase não tem plataformas disponíveis.');
            return;
        }
        const tipoHumano = Number(window.GAME_CONSTANTS?.INIMIGO_HUMANO_ID ?? 13);
        const tipo = tipoEscolhido === 'aleatorio'
            ? (Math.random() < 0.5 ? 0 : tipoHumano)
            : tipoEscolhido === 'humano' ? tipoHumano : 0;
        window.criarInimigoAleatorio(plataformas, tipo);
    }

    // Opções do menu
    function getCheatOptions() {
        return [
            { label: 'PRÓX. FASE', action: () => window.proximoNivel?.(), closeOnClick: true },
            { label: 'GANHAR XP', action: () => window.ganharXP?.(10), closeOnClick: true },
            { label: 'AIRDROP', action: () => { if(window.playerControle) { window.playerControle.teclas['5'] = true; setTimeout(()=>window.playerControle.teclas['5']=false,100); } }, closeOnClick: true },
            { label: 'SPAWN INIMIGO ALEATÓRIO', action: () => spawnInimigoCheat('aleatorio'), closeOnClick: true },
            { label: 'SPAWN ROBÔ', action: () => spawnInimigoCheat('robo'), closeOnClick: true },
            { label: 'SPAWN HUMANO', action: () => spawnInimigoCheat('humano'), closeOnClick: true },
            { label: `VOO INFINITO: ${window.playerControle?.vooInfinitoCheat ? 'DESATIVAR' : 'ATIVAR'}`, action: () => window.alternarVooInfinitoTeste?.(), closeOnClick: true },
            { label: 'MATAR INIMIGOS', action: () => { if(window.inimigos && window.removerInimigoDerrotado) { for(const i of window.inimigos) window.removerInimigoDerrotado(i); } }, closeOnClick: true },
            { label: 'RESET SKILLS', action: () => { window.playerSkills?.resetarSkills?.(); window.playerXP=0; window.salvarProgressoSkills?.(); }, closeOnClick: true },
            { label: 'APAGAR SAVE', action: () => window.apagarBasePersistidaDev?.(), closeOnClick: true },
            { label: 'APAGAR TODOS OS SAVES', action: () => {
                if (!confirm('Apagar todos os salvamentos dos três slots? Esta ação não pode ser desfeita.')) return;
                if (typeof window.SaveSlots?.clearAllSaves !== 'function') {
                    alert('Não foi possível apagar os saves: o sistema de salvamento não está disponível.');
                    return;
                }
                window.SaveSlots.clearAllSaves();
                window.location.reload();
            }, closeOnClick: false },
            { label: 'RESET TOTAL', action: () => { window.resetarJogadorParaZeroMantendoSkills?.(); window.limparCraftPersistido?.(); }, closeOnClick: true },
            { label: 'TOGGLE GRADE', action: () => {
                // Tenta chamar com o id correto se necessário
                if (typeof window.configurarGrade === 'function') {
                    // Se já existe grade, só alterna visibilidade
                    if (document.getElementById('grade-auxiliar')) {
                        const grade = document.getElementById('grade-auxiliar');
                        grade.style.display = grade.style.display === 'none' ? 'block' : 'none';
                    } else {
                        window.configurarGrade('game-stage');
                        // Exibe imediatamente
                        const grade = document.getElementById('grade-auxiliar');
                        if (grade) grade.style.display = 'block';
                    }
                }
            }, closeOnClick: false },
        ];
    }

    // Listeners globais
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
})();
