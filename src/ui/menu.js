/**
 * Gerenciador do Menu de Pause
 */

window.isMenuOpen = false;
let menuSelectedIndex = 0;
let menuMode = 'main'; // main | controls
let controlsSelectedIndex = 0;
let controlsBindingAction = null;

const CONTROLES_STORAGE_KEY = 'plataformaControles';
const CONTROLES_PADRAO = {
    esquerda: ['ArrowLeft', 'a', 'A'],
    direita: ['ArrowRight', 'd', 'D'],
    cima: ['ArrowUp', 'w', 'W'],
    baixo: ['ArrowDown', 's', 'S'],
    pulo: [' '],
    chute: ['k', 'K'],
    tiro: ['i', 'I'],
    garra: ['j', 'J']
};

const CONTROLES_MENU_ITEMS = [
    { id: 'esquerda', label: 'Mover Esquerda' },
    { id: 'direita', label: 'Mover Direita' },
    { id: 'cima', label: 'Mover Cima' },
    { id: 'baixo', label: 'Mover Baixo' },
    { id: 'pulo', label: 'Pular' },
    { id: 'chute', label: 'Chutar' },
    { id: 'tiro', label: 'Atirar/Acao' },
    { id: 'garra', label: 'Garra' }
];

function normalizarControles(raw) {
    const base = { ...CONTROLES_PADRAO };
    if (!raw || typeof raw !== 'object') return base;

    Object.keys(base).forEach((acao) => {
        const valor = raw[acao];
        if (Array.isArray(valor) && valor.length > 0) {
            base[acao] = valor.map(v => String(v));
        }
    });

    return base;
}

function carregarControlesDoStorage() {
    let raw = {};
    try {
        const valor = localStorage.getItem(CONTROLES_STORAGE_KEY);
        if (valor) raw = JSON.parse(valor);
    } catch (_) {
        raw = {};
    }

    window.controlesConfig = normalizarControles(window.controlesConfig || raw);
}

function salvarControlesNoStorage() {
    const cfg = normalizarControles(window.controlesConfig);
    window.controlesConfig = cfg;
    localStorage.setItem(CONTROLES_STORAGE_KEY, JSON.stringify(cfg));
}

function formatarTecla(tecla) {
    if (tecla === ' ') return 'Espaco';
    return tecla;
}

function getTeclaPrincipal(acao) {
    const cfg = window.controlesConfig || CONTROLES_PADRAO;
    const binds = cfg[acao];
    if (!Array.isArray(binds) || binds.length === 0) return '-';
    return formatarTecla(String(binds[0]));
}

function definirTeclaAcao(acao, tecla) {
    const cfg = normalizarControles(window.controlesConfig || {});

    Object.keys(cfg).forEach((k) => {
        cfg[k] = cfg[k].filter(v => String(v).toLowerCase() !== String(tecla).toLowerCase());
        if (cfg[k].length === 0) cfg[k] = [...CONTROLES_PADRAO[k]];
    });

    cfg[acao] = [String(tecla)];
    window.controlesConfig = cfg;
    salvarControlesNoStorage();
}

carregarControlesDoStorage();

/**
 * Retorna a lista de opcoes do menu, ajustando o comportamento para o inicio do jogo.
 */
const getActiveMenuOptions = () => {
    const baseOptions = [
        {
            label: 'RETORNAR', action: () => {
                window.isFirstStart = false;
                window.togglePauseMenu();
            }
        },
        {
            label: 'SKILLS', action: () => {
                window.togglePauseMenu();
                window.toggleSkillMenu();
            }
        },
        {
            label: 'CONTROLES', action: () => {
                menuMode = 'controls';
                controlsSelectedIndex = 0;
                controlsBindingAction = null;
                renderMenuUI();
            }
        },
        {
            label: 'TREINO', action: () => {
                window.isTraining = true;
                window.togglePauseMenu();
                if (typeof carregarFase === 'function') carregarFase('../../config/fases/treino.json');
            }
        },
        {
            label: 'REINICIAR', action: () => {
                window.isFirstStart = false;
                window.togglePauseMenu();
                if (typeof window.reiniciarJogo === 'function') window.reiniciarJogo();
            }
        },
        {
            label: 'SAIR', action: () => {
                if (confirm('Deseja realmente sair do jogo?')) {
                    window.close();
                    setTimeout(() => {
                        alert('O navegador impediu o fechamento automatico. Por favor, feche a aba manualmente.');
                    }, 300);
                }
            }
        }
    ];

    if (window.isFirstStart) {
        return [
            {
                label: 'INICIAR', action: async () => {
                    window.isFirstStart = false;
                    window.togglePauseMenu();
                    if (typeof window.reiniciarJogo === 'function') {
                        await window.reiniciarJogo(false);
                    }
                }
            },
            baseOptions[2],
            baseOptions[4]
        ];
    }

    return baseOptions;
};

window.togglePauseMenu = () => {
    if (window.isSkillMenuOpen) {
        if (typeof fecharMenuSkillsUI === 'function') fecharMenuSkillsUI();
        window.isSkillMenuOpen = false;

        window.isMenuOpen = true;
        menuMode = 'main';
        menuSelectedIndex = 0;
        renderMenuUI();
        window.addEventListener('keydown', handleMenuInput);
        return;
    }

    window.isMenuOpen = !window.isMenuOpen;

    if (typeof window.togglePause === 'function') {
        window.togglePause();
    }

    if (window.isMenuOpen) {
        menuMode = 'main';
        menuSelectedIndex = 0;
        controlsSelectedIndex = 0;
        controlsBindingAction = null;
        renderMenuUI();
        window.addEventListener('keydown', handleMenuInput);
    } else {
        removeMenuUI();
        window.removeEventListener('keydown', handleMenuInput);
    }
};

function handleMenuInput(e) {
    if (!window.isMenuOpen) return;

    if (menuMode === 'controls') {
        handleControlsInput(e);
        return;
    }

    const key = e.key.toLowerCase();
    const currentOptions = getActiveMenuOptions();
    if (!currentOptions || currentOptions.length === 0) return;

    if (key === 'arrowup' || key === 'w') {
        menuSelectedIndex = (menuSelectedIndex - 1 + currentOptions.length) % currentOptions.length;
        updateMenuVisuals();
    } else if (key === 'arrowdown' || key === 's') {
        menuSelectedIndex = (menuSelectedIndex + 1) % currentOptions.length;
        updateMenuVisuals();
    } else if (key === 'enter' || key === ' ') {
        e.preventDefault();
        try {
            currentOptions[menuSelectedIndex].action();
        } catch (error) {
            console.error('Menu: Erro ao executar acao do menu:', error);
        }
    }
}

function handleControlsInput(e) {
    const entries = [...CONTROLES_MENU_ITEMS, { id: 'save_back' }, { id: 'reset_default' }];
    const key = e.key.toLowerCase();

    if (controlsBindingAction) {
        e.preventDefault();
        if (key === 'escape') {
            controlsBindingAction = null;
            renderMenuUI();
            return;
        }

        definirTeclaAcao(controlsBindingAction, e.key);
        controlsBindingAction = null;
        renderMenuUI();
        return;
    }

    if (key === 'escape') {
        menuMode = 'main';
        menuSelectedIndex = 0;
        renderMenuUI();
        return;
    }

    if (key === 'arrowup' || key === 'w') {
        controlsSelectedIndex = (controlsSelectedIndex - 1 + entries.length) % entries.length;
        updateMenuVisuals();
        return;
    }

    if (key === 'arrowdown' || key === 's') {
        controlsSelectedIndex = (controlsSelectedIndex + 1) % entries.length;
        updateMenuVisuals();
        return;
    }

    if (key !== 'enter' && key !== ' ') return;
    e.preventDefault();

    const selected = entries[controlsSelectedIndex];
    if (!selected) return;

    if (selected.id === 'save_back') {
        salvarControlesNoStorage();
        menuMode = 'main';
        menuSelectedIndex = 0;
        renderMenuUI();
        return;
    }

    if (selected.id === 'reset_default') {
        window.controlesConfig = normalizarControles(CONTROLES_PADRAO);
        salvarControlesNoStorage();
        renderMenuUI();
        return;
    }

    controlsBindingAction = selected.id;
    renderMenuUI();
}

function renderMenuUI() {
    removeMenuUI();

    let targetLayer = document.getElementById('layer-ui');
    if (!targetLayer) targetLayer = document.getElementById('jogo-container');
    if (!targetLayer) {
        console.error('Menu: Nao foi possivel encontrar o container para renderizar a interface.');
        return;
    }

    const camX = Math.round(window.cameraX || 0);
    const camY = Math.round(window.cameraY || 0);

    const overlay = document.createElement('div');
    overlay.id = 'pause-menu-overlay';
    overlay.style = `
        position: absolute;
        left: ${camX}px; top: ${camY}px;
        width: 640px; height: 480px;
        background: var(--cor-fundo-overlay); z-index: 10000;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        color: white; font-family: 'Segoe UI', Tahoma, sans-serif;
        border-radius: 4px;
    `;

    const title = document.createElement('h1');
    title.innerText = menuMode === 'controls'
        ? 'CONTROLES'
        : (window.isFirstStart ? 'MENU PRINCIPAL' : 'PAUSE');
    title.style.marginBottom = menuMode === 'controls' ? '12px' : '30px';
    title.style.letterSpacing = '6px';
    overlay.appendChild(title);

    if (menuMode === 'controls') {
        renderControlsContent(overlay);
    } else {
        renderMainMenuContent(overlay);
    }

    targetLayer.appendChild(overlay);
    updateMenuVisuals();
}

function renderMainMenuContent(overlay) {
    const optionsContainer = document.createElement('div');
    optionsContainer.id = 'menu-options-container';
    optionsContainer.style.display = 'flex';
    optionsContainer.style.flexDirection = 'column';
    optionsContainer.style.gap = '15px';
    optionsContainer.style.width = '220px';

    const currentOptions = getActiveMenuOptions();
    currentOptions.forEach((opt, index) => {
        const btn = document.createElement('div');
        btn.className = 'menu-option';
        btn.innerText = opt.label;
        btn.style = `
            padding: 12px;
            font-size: 18px;
            font-weight: bold;
            cursor: pointer;
            text-align: center;
            transition: transform 0.1s;
            border: 2px solid transparent;
            border-radius: 5px;
        `;

        btn.onmouseenter = () => {
            menuSelectedIndex = index;
            updateMenuVisuals();
        };

        btn.onclick = (e) => {
            e.stopPropagation();
            opt.action();
        };

        optionsContainer.appendChild(btn);
    });

    overlay.appendChild(optionsContainer);
}

function renderControlsContent(overlay) {
    const help = document.createElement('div');
    help.style.fontSize = '14px';
    help.style.opacity = '0.9';
    help.style.marginBottom = '14px';
    help.style.textAlign = 'center';
    help.innerText = controlsBindingAction
        ? 'Pressione uma tecla para redefinir. Esc cancela.'
        : 'Enter/Espaco para alterar, Esc para voltar.';
    overlay.appendChild(help);

    const optionsContainer = document.createElement('div');
    optionsContainer.id = 'menu-options-container';
    optionsContainer.style.display = 'flex';
    optionsContainer.style.flexDirection = 'column';
    optionsContainer.style.gap = '8px';
    optionsContainer.style.width = '420px';

    CONTROLES_MENU_ITEMS.forEach((item, index) => {
        const linha = document.createElement('div');
        linha.className = 'menu-option';
        const bind = getTeclaPrincipal(item.id);
        const aguardando = controlsBindingAction === item.id ? '  <AGUARDANDO...>' : '';
        linha.innerText = `${item.label}: ${bind}${aguardando}`;
        linha.style = `
            padding: 9px 12px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            text-align: left;
            transition: transform 0.1s;
            border: 2px solid transparent;
            border-radius: 5px;
        `;

        linha.onmouseenter = () => {
            controlsSelectedIndex = index;
            updateMenuVisuals();
        };

        linha.onclick = () => {
            controlsSelectedIndex = index;
            controlsBindingAction = item.id;
            renderMenuUI();
        };

        optionsContainer.appendChild(linha);
    });

    const salvarBtn = document.createElement('div');
    salvarBtn.className = 'menu-option';
    salvarBtn.innerText = 'SALVAR E VOLTAR';
    salvarBtn.style = `
        margin-top: 8px;
        padding: 10px 12px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        text-align: center;
        transition: transform 0.1s;
        border: 2px solid transparent;
        border-radius: 5px;
    `;
    salvarBtn.onmouseenter = () => {
        controlsSelectedIndex = CONTROLES_MENU_ITEMS.length;
        updateMenuVisuals();
    };
    salvarBtn.onclick = () => {
        salvarControlesNoStorage();
        menuMode = 'main';
        menuSelectedIndex = 0;
        renderMenuUI();
    };
    optionsContainer.appendChild(salvarBtn);

    const resetBtn = document.createElement('div');
    resetBtn.className = 'menu-option';
    resetBtn.innerText = 'RESTAURAR PADRAO';
    resetBtn.style = `
        padding: 10px 12px;
        font-size: 16px;
        font-weight: bold;
        cursor: pointer;
        text-align: center;
        transition: transform 0.1s;
        border: 2px solid transparent;
        border-radius: 5px;
    `;
    resetBtn.onmouseenter = () => {
        controlsSelectedIndex = CONTROLES_MENU_ITEMS.length + 1;
        updateMenuVisuals();
    };
    resetBtn.onclick = () => {
        window.controlesConfig = normalizarControles(CONTROLES_PADRAO);
        salvarControlesNoStorage();
        renderMenuUI();
    };
    optionsContainer.appendChild(resetBtn);

    overlay.appendChild(optionsContainer);
}

function updateMenuVisuals() {
    const elements = document.querySelectorAll('.menu-option');
    const selected = menuMode === 'controls' ? controlsSelectedIndex : menuSelectedIndex;

    elements.forEach((el, index) => {
        if (index === selected) {
            el.style.backgroundColor = 'white';
            el.style.color = 'black';
            el.style.border = '2px solid #fff';
            el.style.transform = 'scale(1.03)';
        } else {
            el.style.backgroundColor = 'rgba(255,255,255,0.1)';
            el.style.color = 'white';
            el.style.border = '2px solid transparent';
            el.style.transform = 'scale(1.0)';
        }
    });
}

function removeMenuUI() {
    const overlay = document.getElementById('pause-menu-overlay');
    if (overlay) overlay.remove();
}
