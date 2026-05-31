// src/ui/cheat-menu.js
(function () {
    // Estado
    let isOpen = false;
    const teclasPressionadas = new Set();
    const COMBO = ['q', 'e', 'j', 'k'];
    let overlayEl = null;

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
        const wasCombo = comboAtivo();
        teclasPressionadas.add(key);
        // Só abre se combo ficou completo neste keydown
        if (!isOpen && comboAtivo() && !wasCombo) {
            window.toggleCheatMenu();
        }
        if (isOpen && e.key === 'Escape') {
            window.toggleCheatMenu();
        }
    }
    function onKeyUp(e) {
        const key = e.key.toLowerCase();
        teclasPressionadas.delete(key);
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
        if (
            typeof window.togglePause === 'function' &&
            !window.isPaused &&
            !window.isMenuOpen &&
            !window.isSkillMenuOpen &&
            !window.isMochilaMenuOpen &&
            !window.isInteractionMenuOpen
        ) {
            window.togglePause();
            cheatMenuPausou = true;
            cheatMenuAbertoViaCombo = true;
        }
        // Overlay escuro centralizado
        overlayEl = document.createElement('div');
        overlayEl.className = 'cheat-menu-overlay';
        overlayEl.tabIndex = -1;
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
        box.appendChild(title);

        // Botões (agora <button>, padrão menu principal)
        const options = getCheatOptions();
        let cheatMenuBtns = [];
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
            btn.onfocus = () => selectBtn(btn);
            btn.onblur = () => selectBtn(null);
            btn.onkeydown = (e) => {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    const idx = cheatMenuBtns.indexOf(btn);
                    const next = cheatMenuBtns[(idx + 1) % cheatMenuBtns.length];
                    next.focus();
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    const idx = cheatMenuBtns.indexOf(btn);
                    const prev = cheatMenuBtns[(idx - 1 + cheatMenuBtns.length) % cheatMenuBtns.length];
                    prev.focus();
                } else if (e.key === 'Enter' || e.key === ' ') {
                    btn.click();
                }
            };
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
        closeBtn.className = 'cheat-menu-close-btn menu-nav-item';
        closeBtn.textContent = 'X';
        closeBtn.setAttribute('aria-label', 'Fechar menu');
        closeBtn.title = 'Fechar';
        closeBtn.onclick = (e) => {
            console.log('[CHEAT-MENU] Botão X clicado');
            e.stopPropagation();
            window.toggleCheatMenu();
        };
        closeBtn.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                console.log('[CHEAT-MENU] Botão X ativado por teclado:', e.key);
                e.preventDefault();
                closeBtn.click();
            }
        };
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
        // Foco acessível
        setTimeout(() => cheatMenuBtns[0]?.focus(), 10);
    }
    function removeCheatMenu() {
        if (!isOpen) return;
        isOpen = false;
        if (overlayEl) overlayEl.remove();
        overlayEl = null;
        // Só despausa se foi aberto via combo no gameplay
        if (
            cheatMenuAbertoViaCombo &&
            typeof window.togglePause === 'function' &&
            window.isPaused
        ) {
            window.togglePause();
        }
    }

    // Opções do menu
    function getCheatOptions() {
        return [
            { label: 'PRÓX. FASE', action: () => window.proximoNivel?.(), closeOnClick: true },
            { label: 'GANHAR XP', action: () => window.ganharXP?.(10), closeOnClick: true },
            { label: 'AIRDROP', action: () => { if(window.playerControle) { window.playerControle.teclas['5'] = true; setTimeout(()=>window.playerControle.teclas['5']=false,100); } }, closeOnClick: true },
            { label: 'MATAR INIMIGOS', action: () => { if(window.inimigos && window.removerInimigoDerrotado) { for(const i of window.inimigos) window.removerInimigoDerrotado(i); } }, closeOnClick: true },
            { label: 'RESET SKILLS', action: () => { window.playerSkills?.resetarSkills?.(); window.playerXP=0; window.salvarProgressoSkills?.(); }, closeOnClick: true },
            { label: 'APAGAR SAVE', action: () => window.apagarBasePersistidaDev?.(), closeOnClick: true },
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
