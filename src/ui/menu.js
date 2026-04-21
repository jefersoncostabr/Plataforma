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
    garra: ['j', 'J'],
    cinto: ['l', 'L'],
    mochila: ['Enter'],
    interagir: ['e', 'E']
};

const CONTROLES_MENU_ITEMS = [
    { id: 'esquerda', label: 'Mover Esquerda' },
    { id: 'direita', label: 'Mover Direita' },
    { id: 'cima', label: 'Mover Cima' },
    { id: 'baixo', label: 'Mover Baixo' },
    { id: 'pulo', label: 'Pular' },
    { id: 'chute', label: 'Chutar' },
    { id: 'tiro', label: 'Atirar/Acao' },
    { id: 'garra', label: 'Garra' },
    { id: 'cinto', label: 'Cinto' },
    { id: 'mochila', label: 'Slots do Cinto e Colete' },
    { id: 'interagir', label: 'Interagir / Craft' },
    { id: 'debugProximoNivel', label: 'Debug: Próxima Fase (4)' },
    { id: 'debugSpawnInimigo', label: 'Debug: Spawn Inimigo (6)' },
    { id: 'debugReset', label: 'Debug: Reset Total (0)' },
    { id: 'pause', label: 'Pausar Jogo' },
    { id: 'debugGrade', label: 'Grade de Debug (G)' }
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

const EQUIPAMENTOS_RESUMO = [
    { tipo: 'revolver', label: 'Revólver', configKey: 'spriteItemRevolver', fallback: 'assets/personagem/revolver_pegavel.png' },
    { tipo: 'escudo', label: 'Escudo', configKey: 'spriteEscudoPlayer', fallback: 'assets/personagem/escudo.png' },
    { tipo: 'bota', label: 'Bota', configKey: 'spriteItemBota', fallback: 'assets/personagem/bota_pegavel.png' },
    { tipo: 'jetpack', label: 'Jetpack', configKey: 'spriteItemJetpack', fallback: 'assets/personagem/jetpack_pegavel.png' },
    { tipo: 'garra', label: 'Garra', configKey: 'spriteItemGarra', fallback: 'assets/personagem/garra_coletavel.png' },
    { tipo: 'cinto', label: 'Cinto', configKey: 'spriteItemCinto', fallback: 'assets/personagem/cinto_coletavel.png' },
    { tipo: 'colete', label: 'Colete', configKey: 'spriteItemColete', fallback: 'assets/personagem/colete_coletavel.png' }
];

function lerJsonStorage(chave) {
    try {
        const valor = localStorage.getItem(chave);
        return valor ? JSON.parse(valor) : null;
    } catch (_) {
        return null;
    }
}

function obterSpriteResumoEquipamento(item) {
    const spriteItem = window.itemDefinitions?.[item.tipo];
    return spriteItem?.spriteColetavel
        || spriteItem?.spriteEquipado
        || window.config?.[item.configKey]
        || item.fallback;
}

function extrairEquipamentosConquistados(estado = {}) {
    const encontrados = new Set();
    const inventario = Array.isArray(estado?.inventario) ? estado.inventario : [];
    const slotsColete = Array.isArray(estado?.coleteSlots) ? estado.coleteSlots : [];
    const slotCinto = estado?.cintoSlot || null;

    inventario.forEach((tipo) => {
        if (tipo) encontrados.add(String(tipo));
    });

    slotsColete.forEach((slot) => {
        if (slot?.tipo) encontrados.add(String(slot.tipo));
    });

    if (slotCinto?.tipo) encontrados.add(String(slotCinto.tipo));
    if (estado?.temArma) encontrados.add('revolver');
    if (estado?.temEscudo || estado?.escudoVermelho) encontrados.add('escudo');
    if (estado?.temBota) encontrados.add('bota');
    if (estado?.temJetpack) encontrados.add('jetpack');
    if (estado?.temGarra) encontrados.add('garra');
    if (estado?.temCinto) encontrados.add('cinto');
    if (estado?.temColete) encontrados.add('colete');

    return EQUIPAMENTOS_RESUMO.filter((item) => encontrados.has(item.tipo));
}

function formatarFaseResumo(nomeArquivo = '') {
    const valor = String(nomeArquivo || '').trim().toLowerCase();
    if (!valor) return '--';
    if (valor.includes('treino')) return 'TR';

    const numero = valor.match(/(\d+)/);
    if (numero?.[1]) return `F${numero[1]}`;

    return valor.replace('.json', '').slice(0, 5).toUpperCase();
}

function criarChipResumo(texto, cor = '#3a3a3a', corTexto = '#fff') {
    const chip = document.createElement('span');
    chip.textContent = texto;
    chip.style.display = 'inline-flex';
    chip.style.alignItems = 'center';
    chip.style.justifyContent = 'center';
    chip.style.minWidth = '30px';
    chip.style.padding = '2px 6px';
    chip.style.borderRadius = '999px';
    chip.style.background = cor;
    chip.style.color = corTexto;
    chip.style.fontSize = '10px';
    chip.style.fontWeight = '700';
    chip.style.letterSpacing = '0.5px';
    return chip;
}

function criarPainelResumoSalvo() {
    const inventarioSalvo = lerJsonStorage('plataformaCheckpointEquipamento') || {};
    const baseSalva = lerJsonStorage('plataformaCraftPersistente') || {};
    const skillsSalvas = lerJsonStorage('plataformaSkills') || {};
    const equipamentos = extrairEquipamentosConquistados(inventarioSalvo);
    const qtdSkills = Array.isArray(skillsSalvas?.acquired)
        ? new Set(skillsSalvas.acquired.map((item) => String(item || ''))).size
        : Array.isArray(skillsSalvas?.playerSkills)
            ? new Set(skillsSalvas.playerSkills.map((item) => String(item || ''))).size
            : 0;
    const xp = Number(skillsSalvas?.playerXP ?? skillsSalvas?.xp ?? 0);
    const modoBase = String(baseSalva?.modoRenascimento || '').toLowerCase();
    const nivelBase = Math.max(0, Number(baseSalva?.nivel || 0));

    const painel = document.createElement('div');
    painel.style.width = '188px';
    painel.style.minHeight = '148px';
    painel.style.padding = '10px';
    painel.style.border = '1px solid rgba(255,255,255,0.16)';
    painel.style.borderRadius = '10px';
    painel.style.background = 'rgba(255,255,255,0.05)';
    painel.style.boxShadow = '0 6px 18px rgba(0,0,0,0.24)';
    painel.style.display = 'flex';
    painel.style.flexDirection = 'column';
    painel.style.gap = '8px';

    const titulo = document.createElement('div');
    titulo.textContent = 'SALVO';
    titulo.style.fontSize = '11px';
    titulo.style.fontWeight = '800';
    titulo.style.letterSpacing = '2px';
    titulo.style.opacity = '0.9';
    painel.appendChild(titulo);

    const equipamentosWrap = document.createElement('div');
    equipamentosWrap.style.display = 'flex';
    equipamentosWrap.style.flexWrap = 'wrap';
    equipamentosWrap.style.gap = '6px';

    if (equipamentos.length === 0) {
        const vazio = document.createElement('div');
        vazio.textContent = 'Sem equipamentos';
        vazio.style.fontSize = '11px';
        vazio.style.opacity = '0.72';
        equipamentosWrap.appendChild(vazio);
    } else {
        equipamentos.forEach((item) => {
            const icone = document.createElement('img');
            icone.src = obterSpriteResumoEquipamento(item);
            icone.alt = item.label;
            icone.title = item.label;
            icone.style.width = '22px';
            icone.style.height = '22px';
            icone.style.objectFit = 'contain';
            icone.style.imageRendering = 'pixelated';
            icone.style.padding = '2px';
            icone.style.borderRadius = '6px';
            icone.style.background = 'rgba(255,255,255,0.08)';
            equipamentosWrap.appendChild(icone);
        });
    }

    painel.appendChild(equipamentosWrap);

    const skillsRow = document.createElement('div');
    skillsRow.style.display = 'flex';
    skillsRow.style.flexWrap = 'wrap';
    skillsRow.style.gap = '6px';
    skillsRow.appendChild(criarChipResumo(`★ ${qtdSkills}`, '#3f51b5'));
    skillsRow.appendChild(criarChipResumo(`XP ${xp}`, '#5b2a86'));
    if (lerJsonStorage('plataformaCheckpointEquipamento')) {
        skillsRow.appendChild(criarChipResumo('CP', '#0c8b62'));
    }
    painel.appendChild(skillsRow);

    const baseBox = document.createElement('div');
    baseBox.style.display = 'flex';
    baseBox.style.alignItems = 'center';
    baseBox.style.gap = '8px';
    baseBox.style.minHeight = '38px';

    const baseImg = document.createElement('img');
    baseImg.alt = 'Base';
    baseImg.style.width = '26px';
    baseImg.style.height = '26px';
    baseImg.style.objectFit = 'contain';
    baseImg.style.imageRendering = 'pixelated';
    baseImg.style.background = 'rgba(255,255,255,0.08)';
    baseImg.style.borderRadius = '6px';
    baseImg.style.padding = '2px';
    baseImg.src = typeof window.obterSpriteCraftNivel === 'function'
        ? window.obterSpriteCraftNivel(Math.max(1, nivelBase || 1), 'item')
        : 'assets/craft/craft_nivel1.png';
    baseBox.appendChild(baseImg);

    const baseInfo = document.createElement('div');
    baseInfo.style.display = 'flex';
    baseInfo.style.flexWrap = 'wrap';
    baseInfo.style.gap = '4px';

    if (nivelBase > 0) {
        baseInfo.appendChild(criarChipResumo(`N${nivelBase}`, '#00695c'));
        baseInfo.appendChild(criarChipResumo(
            modoBase === 'spawnpoint' ? 'SP' : modoBase === 'memoria' ? 'MEM' : 'OFF',
            modoBase === 'spawnpoint' ? '#1565c0' : modoBase === 'memoria' ? '#8e24aa' : '#555'
        ));
        baseInfo.appendChild(criarChipResumo(formatarFaseResumo(baseSalva?.faseOriginal || baseSalva?.fase), '#424242'));
    } else {
        baseInfo.appendChild(criarChipResumo('SEM BASE', '#555'));
    }

    baseBox.appendChild(baseInfo);
    painel.appendChild(baseBox);

    return painel;
}

/**
 * Retorna a lista de opcoes do menu, ajustando o comportamento para o inicio do jogo.
 */
const getActiveMenuOptions = () => {
    const temColete = !!window.playerControle?.temColete;
    const coleleOption = temColete ? {
        label: 'COLETE', action: () => {
            window.togglePauseMenu();
            if (typeof window.toggleMochilaMenu === 'function') {
                window.toggleMochilaMenu(window.playerControle);
            }
        }
    } : null;

    const controlesOption = {
        label: 'CONTROLES', action: () => {
            menuMode = 'controls';
            controlsSelectedIndex = 0;
            controlsBindingAction = null;
            renderMenuUI();
        }
    };

    const reiniciarOption = {
        label: 'REINICIAR', action: () => {
            window.isFirstStart = false;
            window.togglePauseMenu();
            if (typeof window.reiniciarJogo === 'function') window.reiniciarJogo();
        }
    };

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
        ...(coleleOption ? [coleleOption] : []),
        controlesOption,
        {
            label: 'TREINO', action: () => {
                window.isTraining = true;
                window.togglePauseMenu();
                if (typeof carregarFase === 'function') carregarFase('../../config/fases/treino.json');
            }
        },
        reiniciarOption,
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
            controlesOption,
            reiniciarOption
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

    if (window.isMochilaMenuOpen) {
        if (typeof fecharMenuMochilaUI === 'function') fecharMenuMochilaUI();
        window.isMochilaMenuOpen = false;

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
    const layout = document.createElement('div');
    layout.style.display = 'flex';
    layout.style.alignItems = 'center';
    layout.style.justifyContent = 'center';
    layout.style.gap = '18px';
    layout.style.width = '100%';

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

    // Coluna da direita para agrupar o Painel de Resumo e o Controle de Volume
    const rightColumn = document.createElement('div');
    rightColumn.style.display = 'flex';
    rightColumn.style.flexDirection = 'column';
    rightColumn.style.gap = '10px';
    rightColumn.style.width = '188px'; // Mantém a largura consistente com o painel de resumo

    rightColumn.appendChild(criarPainelResumoSalvo());

    layout.appendChild(optionsContainer);
    layout.appendChild(rightColumn);
    overlay.appendChild(layout);

    // Injeta a barra de volume do AudioManager na coluna da direita (abaixo do resumo)
    if (window.AudioManager && typeof window.AudioManager.renderVolumeControl === 'function') {
        window.AudioManager.renderVolumeControl(rightColumn);
    }
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
    optionsContainer.style.gap = '4px';
    optionsContainer.style.width = '340px';
    optionsContainer.style.maxHeight = '260px';
    optionsContainer.style.overflowY = 'auto';
    optionsContainer.style.paddingRight = '6px';

    CONTROLES_MENU_ITEMS.forEach((item, index) => {
        const linha = document.createElement('div');
        linha.className = 'menu-option';
        const bind = getTeclaPrincipal(item.id);
        const aguardando = controlsBindingAction === item.id ? '  <AGUARDANDO...>' : '';
        linha.innerText = `${item.label}: ${bind}${aguardando}`;
        linha.style = `
            padding: 5px 8px;
            font-size: 13px;
            font-weight: bold;
            cursor: pointer;
            text-align: left;
            transition: transform 0.1s;
            border: 2px solid transparent;
            border-radius: 4px;
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
        padding: 7px 8px;
        font-size: 13px;
        font-weight: bold;
        cursor: pointer;
        text-align: center;
        transition: transform 0.1s;
        border: 2px solid transparent;
        border-radius: 4px;
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
        padding: 7px 8px;
        font-size: 13px;
        font-weight: bold;
        cursor: pointer;
        text-align: center;
        transition: transform 0.1s;
        border: 2px solid transparent;
        border-radius: 4px;
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
