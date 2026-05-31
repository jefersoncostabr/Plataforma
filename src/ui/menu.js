/**
 * Gerenciador do Menu de Pause
 */

window.isMenuOpen = false;
let menuSelectedIndex = -1;
let menuMode = 'main'; // main | controls
let controlsSelectedIndex = -1;
let controlsBindingAction = null;
let menuSelectedSlotId = null;
const menuDraftDifficultyBySlot = {};

window.gameDifficulty = window.gameDifficulty || 'normal';

const MENU_VOLUME_STEP = 0.05;

const DEFAULT_SLOT_IDS = ['slot1', 'slot2', 'slot3'];
const DIFFICULTY_LEVELS = ['easy', 'normal', 'hard'];

function getSlotIds() {
    const ids = window.SaveSlots?.SLOT_IDS;
    return Array.isArray(ids) && ids.length > 0 ? ids : DEFAULT_SLOT_IDS;
}

function normalizarSlotId(slotId) {
    const alvo = String(slotId || '').toLowerCase();
    return getSlotIds().includes(alvo) ? alvo : 'slot1';
}

function getStorageKeyForSlot(baseKey, slotId) {
    const id = normalizarSlotId(slotId);
    if (window.SaveSlots && typeof window.SaveSlots.getStorageKey === 'function') {
        return window.SaveSlots.getStorageKey(baseKey, id);
    }
    return baseKey;
}

function getSlotLabel(slotId) {
    const index = getSlotIds().indexOf(normalizarSlotId(slotId));
    return `SLOT ${Math.max(1, index + 1)}`;
}

function formatarDificuldade(valor) {
    const normalized = String(valor || 'normal').toLowerCase();
    if (normalized === 'easy') return 'Easy';
    if (normalized === 'hard') return 'Hard';
    return 'Normal';
}

function getSlotDifficultyPersistida(slotId) {
    const id = normalizarSlotId(slotId);
    if (window.SaveSlots && typeof window.SaveSlots.getSlotDifficulty === 'function') {
        return window.SaveSlots.getSlotDifficulty(id);
    }
    return 'normal';
}

function slotDificuldadeTravada(slotId) {
    if (window.SaveSlots && typeof window.SaveSlots.isDifficultyLocked === 'function') {
        return window.SaveSlots.isDifficultyLocked(normalizarSlotId(slotId));
    }
    return false;
}

function slotTemSave(slotId) {
    const id = normalizarSlotId(slotId);
    if (window.SaveSlots && typeof window.SaveSlots.isSlotOccupied === 'function') {
        return window.SaveSlots.isSlotOccupied(id);
    }
    return false;
}

function inicializarDraftDificuldades() {
    getSlotIds().forEach((slotId) => {
        if (!slotTemSave(slotId) && !menuDraftDifficultyBySlot[slotId]) {
            menuDraftDifficultyBySlot[slotId] = 'normal';
        }
    });
}

function getSlotSelecionadoMenu() {
    inicializarDraftDificuldades();
    if (!menuSelectedSlotId) {
        const ativo = window.SaveSlots?.getActiveSlotId?.() || 'slot1';
        menuSelectedSlotId = normalizarSlotId(ativo);
    }
    return menuSelectedSlotId;
}

function getDificuldadeDraftSlot(slotId) {
    const id = normalizarSlotId(slotId);
    if (!menuDraftDifficultyBySlot[id]) {
        menuDraftDifficultyBySlot[id] = 'normal';
    }
    return menuDraftDifficultyBySlot[id];
}

function alternarDificuldadeDraftSlot(slotId, direcao = 1) {
    const id = normalizarSlotId(slotId);
    const atual = getDificuldadeDraftSlot(id);
    const indiceAtual = Math.max(0, DIFFICULTY_LEVELS.indexOf(atual));
    const proximoIndice = (indiceAtual + (direcao >= 0 ? 1 : -1) + DIFFICULTY_LEVELS.length) % DIFFICULTY_LEVELS.length;
    const proxima = DIFFICULTY_LEVELS[proximoIndice];
    menuDraftDifficultyBySlot[id] = proxima;
    return proxima;
}

function selecionarSlotMenu(slotId, opcoes = {}) {
    const id = normalizarSlotId(slotId);
    const ciclarSeVazio = !!opcoes.ciclarSeVazio;
    const direcao = Number(opcoes.direcao || 1);

    menuSelectedSlotId = id;
    if (window.SaveSlots && typeof window.SaveSlots.setActiveSlotId === 'function') {
        window.SaveSlots.setActiveSlotId(id);
    }

    const slotOcupado = slotTemSave(id);
    if (window.isFirstStart && ciclarSeVazio && !slotOcupado && !slotDificuldadeTravada(id)) {
        window.gameDifficulty = alternarDificuldadeDraftSlot(id, direcao);
        return;
    }

    window.gameDifficulty = slotOcupado ? getSlotDifficultyPersistida(id) : getDificuldadeDraftSlot(id);
}

function excluirSaveDoSlot(slotId) {
    const id = normalizarSlotId(slotId);
    if (!slotTemSave(id)) return;

    const confirmar = confirm(`Excluir o save do ${getSlotLabel(id)}? Esta acao nao pode ser desfeita.`);
    if (!confirmar) return;

    if (window.SaveSlots && typeof window.SaveSlots.clearSlot === 'function') {
        window.SaveSlots.clearSlot(id);
    }

    menuDraftDifficultyBySlot[id] = 'normal';
    if (menuSelectedSlotId === id) {
        window.gameDifficulty = getDificuldadeDraftSlot(id);
    }

    renderMenuUI();
}

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
    interagir: ['e', 'E'],
    abertura: ['y', 'Y'],
    troca_pet: ['q', 'Q']
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
    { id: 'abertura', label: 'Abrir/Fechar Armadura (Y)' },
    { id: 'troca_pet', label: 'Controlar Pets (Q)' },
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

function lerJsonStorage(chave, slotId = null) {
    const chaveFinal = slotId ? getStorageKeyForSlot(chave, slotId) : chave;
    try {
        const valor = localStorage.getItem(chaveFinal);
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

function criarPainelResumoSalvo(slotId = getSlotSelecionadoMenu()) {
    const inventarioSalvo = lerJsonStorage('plataformaCheckpointEquipamento', slotId) || {};
    const baseSalva = lerJsonStorage('plataformaCraftPersistente', slotId) || {};
    const skillsSalvas = lerJsonStorage('plataformaSkills', slotId) || {};
    const equipamentos = extrairEquipamentosConquistados(inventarioSalvo);
    const qtdSkills = Array.isArray(skillsSalvas?.acquired)
        ? new Set(skillsSalvas.acquired.map((item) => String(item || ''))).size
        : Array.isArray(skillsSalvas?.playerSkills)
            ? new Set(skillsSalvas.playerSkills.map((item) => String(item || ''))).size
            : 0;
    const xp = Number(skillsSalvas?.playerXP ?? skillsSalvas?.xp ?? 0);
    const modoBase = String(baseSalva?.modoRenascimento || '').toLowerCase();
    const nivelBase = Math.max(0, Number(baseSalva?.nivel || 0));
    const slotOcupado = slotTemSave(slotId);
    const dificuldade = slotTemSave(slotId)
        ? getSlotDifficultyPersistida(slotId)
        : getDificuldadeDraftSlot(slotId);

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

    const tituloWrap = document.createElement('div');
    tituloWrap.style.display = 'flex';
    tituloWrap.style.alignItems = 'center';
    tituloWrap.style.justifyContent = 'space-between';
    tituloWrap.style.gap = '8px';

    const titulo = document.createElement('div');
    titulo.textContent = `${getSlotLabel(slotId)} ${slotOcupado ? 'SALVO' : 'NOVO'}`;
    titulo.style.fontSize = '11px';
    titulo.style.fontWeight = '800';
    titulo.style.letterSpacing = '2px';
    titulo.style.opacity = '0.9';
    tituloWrap.appendChild(titulo);

    if (slotOcupado) {
        const excluirBtn = document.createElement('button');
        excluirBtn.type = 'button';
        excluirBtn.className = 'menu-slot-delete-btn';
        excluirBtn.textContent = 'EXCLUIR';
        excluirBtn.title = `Excluir save do ${getSlotLabel(slotId)}`;
        excluirBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            excluirSaveDoSlot(slotId);
        };
        tituloWrap.appendChild(excluirBtn);
    }

    painel.appendChild(tituloWrap);

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
    skillsRow.appendChild(criarChipResumo(formatarDificuldade(dificuldade), '#37474f'));
    skillsRow.appendChild(criarChipResumo(`★ ${qtdSkills}`, '#3f51b5'));
    skillsRow.appendChild(criarChipResumo(`XP ${xp}`, '#5b2a86'));
    if (inventarioSalvo && Object.keys(inventarioSalvo).length > 0) {
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
        baseInfo.appendChild(criarChipResumo(`N${nivelBase}`, nivelBase >= 4 ? '#ffd700' : '#00695c'));
        baseInfo.appendChild(criarChipResumo(
            modoBase === 'ambos' ? 'SP+MEM' : modoBase === 'spawnpoint' ? 'SP' : modoBase === 'memoria' ? 'MEM' : 'OFF',
            modoBase === 'ambos' ? '#ff6f00' : modoBase === 'spawnpoint' ? '#1565c0' : modoBase === 'memoria' ? '#8e24aa' : '#555'
        ));
        baseInfo.appendChild(criarChipResumo(formatarFaseResumo(baseSalva?.faseOriginal || baseSalva?.fase), '#424242'));
    } else {
        baseInfo.appendChild(criarChipResumo('SEM BASE', '#555'));
    }

    baseBox.appendChild(baseInfo);
    painel.appendChild(baseBox);

    return painel;
}

function criarPainelDificuldade() {
    const painel = document.createElement('div');
    painel.className = 'menu-difficulty-panel';

    const opcoes = document.createElement('div');
    opcoes.className = 'menu-difficulty-options';

    const slotSelecionado = getSlotSelecionadoMenu();
    const slotAtivoPersistido = normalizarSlotId(window.SaveSlots?.getActiveSlotId?.() || slotSelecionado);

    getSlotIds().forEach((slotId) => {
        const slotOcupado = slotTemSave(slotId);
        const slotTravado = slotDificuldadeTravada(slotId);
        const slotEmUso = slotOcupado && slotId === slotAtivoPersistido;
        const dificuldade = slotOcupado ? getSlotDifficultyPersistida(slotId) : getDificuldadeDraftSlot(slotId);

        const linha = document.createElement('div');
        linha.className = 'menu-difficulty-option menu-slot-option';
        if (window.isFirstStart) {
            linha.classList.add('menu-nav-item');
            linha.dataset.menuMode = 'main';
            linha.dataset.navType = 'slot';
        }
        linha.dataset.slotId = slotId;
        linha.dataset.slotEmpty = slotOcupado ? '0' : '1';
        linha.dataset.slotLocked = slotTravado ? '1' : '0';
        linha.dataset.slotDifficulty = dificuldade;
        linha.dataset.slotStatus = slotOcupado ? 'ocupado' : 'vazio';

        if (slotOcupado) {
            linha.classList.add('menu-slot-option--occupied');
        }
        if (slotEmUso) {
            linha.classList.add('menu-slot-option--in-use');
        }

        if (slotSelecionado === slotId) {
            linha.classList.add('menu-slot-option--active');
        }

        const nome = document.createElement('span');
        nome.className = 'menu-slot-name';
        nome.textContent = getSlotLabel(slotId);

        const badge = document.createElement('span');
        badge.className = 'menu-slot-badge';
        badge.textContent = slotEmUso ? 'EM USO' : (slotOcupado ? 'SALVO' : 'NOVO');

        const status = document.createElement('span');
        status.className = 'menu-slot-status';
        status.textContent = formatarDificuldade(dificuldade);

        linha.onmouseenter = () => {
            if (!window.isFirstStart) return;
            menuSelectedIndex = getMainMenuNavItems().indexOf(linha);
            updateMenuVisuals();
        };

        linha.onmouseleave = () => {
            if (!window.isFirstStart) return;
            menuSelectedIndex = -1;
            updateMenuVisuals();
        };

        linha.onclick = () => {
            if (!window.isFirstStart) return;
            selecionarSlotMenu(slotId, { ciclarSeVazio: true, direcao: 1 });
            menuSelectedIndex = getMainMenuNavItems().indexOf(linha);
            renderMenuUI();
        };

        linha.appendChild(nome);
        linha.appendChild(badge);
        linha.appendChild(status);
        opcoes.appendChild(linha);
    });

    painel.appendChild(opcoes);
    return painel;
}

function criarAcaoSairDoJogo() {
    return () => {
        if (confirm('Deseja realmente sair do jogo?')) {
            window.close();
            setTimeout(() => {
                alert('O navegador impediu o fechamento automatico. Por favor, feche a aba manualmente.');
            }, 300);
        }
    };
}

function acaoVoltarParaMenuInicial() {
    window.isFirstStart = true;
    menuMode = 'main';
    menuSelectedIndex = 0;
    controlsSelectedIndex = 0;
    controlsBindingAction = null;

    const slotAtivo = window.SaveSlots?.getActiveSlotId?.() || getSlotSelecionadoMenu();
    menuSelectedSlotId = normalizarSlotId(slotAtivo);
    renderMenuUI();
}

/**
 * Retorna a lista de opcoes do menu, ajustando o comportamento para o inicio do jogo.
 */
const getActiveMenuOptions = () => {
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
            label: 'SAIR', action: criarAcaoSairDoJogo()
        }
    ];

    if (window.isFirstStart) {
        return [
            {
                label: 'INICIAR', action: async () => {
                    const slotId = getSlotSelecionadoMenu();
                    if (!slotId) {
                        alert('Selecione um slot antes de iniciar.');
                        return;
                    }

                    const slotOcupado = slotTemSave(slotId);
                    const dificuldadeInicial = slotOcupado
                        ? getSlotDifficultyPersistida(slotId)
                        : getDificuldadeDraftSlot(slotId);

                    if (window.SaveSlots && typeof window.SaveSlots.setActiveSlotId === 'function') {
                        window.SaveSlots.setActiveSlotId(slotId);
                    }

                    if (window.SaveSlots && typeof window.SaveSlots.setSlotDifficulty === 'function') {
                        window.SaveSlots.setSlotDifficulty(slotId, dificuldadeInicial);
                    }

                    window.gameDifficulty = dificuldadeInicial;
                    if (window.SaveSlots && typeof window.SaveSlots.lockDifficultyForSlot === 'function') {
                        window.SaveSlots.lockDifficultyForSlot(slotId);
                    }

                    if (typeof window.carregarDadosSkills === 'function') {
                        await window.carregarDadosSkills(false);
                    }

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

function getMainMenuOptions() {
    return getActiveMenuOptions().filter((opt) => opt.label !== 'SAIR');
}

function getCloseMenuOption() {
    return getActiveMenuOptions().find((opt) => opt.label === 'SAIR') || {
        label: 'SAIR',
        action: criarAcaoSairDoJogo()
    };
}

function getMainMenuNavItems() {
    return Array.from(document.querySelectorAll('#pause-menu-overlay .menu-nav-item[data-menu-mode="main"]'));
}

function ajustarVolumeMenu(delta) {
    if (!window.AudioManager || typeof window.AudioManager.setMasterVolume !== 'function') return;

    const volumeAtual = Number(window.AudioManager.masterVolume || 0);
    const proximoVolume = Math.max(0, Math.min(1, Number((volumeAtual + delta).toFixed(2))));
    window.AudioManager.setMasterVolume(proximoVolume);
}

function ativarItemMenuPrincipal(item) {
    if (!item) return;

    const navType = item.dataset.navType;

    if (navType === 'slot') {
        selecionarSlotMenu(item.dataset.slotId, { ciclarSeVazio: true, direcao: 1 });
        renderMenuUI();
        updateMenuVisuals();
        return;
    }

    if (navType === 'volume') {
        return;
    }

    item.click();
}

function tratarAjusteHorizontalMenuPrincipal(item, key) {
    if (!item) return false;

    const direcao = (key === 'arrowleft' || key === 'a')
        ? -1
        : (key === 'arrowright' || key === 'd')
            ? 1
            : 0;

    if (!direcao) return false;

    if (item.dataset.navType === 'slot') {
        if (!window.isFirstStart) return false;

        selecionarSlotMenu(item.dataset.slotId, {
            ciclarSeVazio: item.dataset.slotEmpty === '1' && item.dataset.slotLocked !== '1',
            direcao
        });
        renderMenuUI();
        updateMenuVisuals();
        return true;
    }

    if (item.dataset.navType === 'volume') {
        ajustarVolumeMenu(direcao * MENU_VOLUME_STEP);
        updateMenuVisuals();
        return true;
    }

    return false;
}

window.togglePauseMenu = () => {
    if (window.isSkillMenuOpen) {
        if (typeof fecharMenuSkillsUI === 'function') fecharMenuSkillsUI();
        window.isSkillMenuOpen = false;

        window.isMenuOpen = true;
        menuMode = 'main';
        menuSelectedIndex = 0;
        menuSelectedSlotId = window.SaveSlots?.getActiveSlotId?.() || menuSelectedSlotId;
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
        menuSelectedSlotId = window.SaveSlots?.getActiveSlotId?.() || menuSelectedSlotId;
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
        menuSelectedSlotId = window.SaveSlots?.getActiveSlotId?.() || menuSelectedSlotId;
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
    const currentItems = getMainMenuNavItems();
    if (!currentItems || currentItems.length === 0) return;

    if (key === 'arrowup' || key === 'w') {
        menuSelectedIndex = (menuSelectedIndex <= 0) ? currentItems.length - 1 : menuSelectedIndex - 1;
        updateMenuVisuals();
    } else if (key === 'arrowdown' || key === 's') {
        menuSelectedIndex = (menuSelectedIndex === -1 || menuSelectedIndex >= currentItems.length - 1) ? 0 : menuSelectedIndex + 1;
        updateMenuVisuals();
    } else if (tratarAjusteHorizontalMenuPrincipal(currentItems[menuSelectedIndex], key)) {
        e.preventDefault();
    } else if (key === 'enter' || key === ' ') {
        e.preventDefault();
        if (menuSelectedIndex === -1) {
            menuSelectedIndex = 0;
        }

        try {
            ativarItemMenuPrincipal(currentItems[menuSelectedIndex]);
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
        menuSelectedIndex = -1;
        renderMenuUI();
        return;
    }

    if (key === 'arrowup' || key === 'w') {
        controlsSelectedIndex = (controlsSelectedIndex <= 0) ? entries.length - 1 : controlsSelectedIndex - 1;
        updateMenuVisuals();
        return;
    }

    if (key === 'arrowdown' || key === 's') {
        controlsSelectedIndex = (controlsSelectedIndex === -1 || controlsSelectedIndex >= entries.length - 1) ? 0 : controlsSelectedIndex + 1;
        updateMenuVisuals();
        return;
    }

    if (key !== 'enter' && key !== ' ') return;
    e.preventDefault();
    if (controlsSelectedIndex === -1) {
        controlsSelectedIndex = 0;
    }

    const selected = entries[controlsSelectedIndex];
    if (!selected) return;

    if (selected.id === 'save_back') {
        salvarControlesNoStorage();
        menuMode = 'main';
        menuSelectedIndex = -1;
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

/**
 * Obtém o contêiner alvo para renderizar a interface do menu.
 * Sempre usa o body para evitar herdar transformações de escala do jogo-container.
 */
function obterConteinerDestino() {
    return document.body;
}

/**
 * Cria e estiliza o elemento de overlay (fundo) do menu.
 * Usa position:fixed para se posicionar relativo à viewport, independente de qualquer
 * transform:scale() aplicado ao jogo-container.
 */
function criarElementoOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'pause-menu-overlay';

    overlay.style.cssText = `
        position: fixed;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        width: 820px; height: 580px;
        background: var(--cor-fundo-overlay); z-index: 99999;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        color: white; font-family: 'Segoe UI', Tahoma, sans-serif;
        border-radius: 4px;
    `;
    return overlay;
}

/**
 * Cria o título do menu baseado no modo atual (Main ou Controles).
 */
function criarElementoTitulo() {
    const title = document.createElement('h1');
    title.innerText = menuMode === 'controls'
        ? 'CONTROLES'
        : (window.isFirstStart ? 'PRINCIPAL' : 'PAUSE');
    title.style.marginBottom = menuMode === 'controls' ? '12px' : '30px';
    title.style.letterSpacing = '6px';
    return title;
}

/**
 * Decide qual conteúdo renderizar dentro do overlay baseado no modo do menu.
 */
function preencherConteudoPorModo(overlay) {
    if (menuMode === 'controls') {
        renderControlsContent(overlay);
    } else {
        renderMainMenuContent(overlay);
    }
}

function renderMenuUI() {
    removeMenuUI();

    const targetLayer = obterConteinerDestino();
    if (!targetLayer) {
        console.error('[MENU-UI] Falha ao renderizar: Conteiner de destino não encontrado.');
        return;
    }

    const overlay = criarElementoOverlay();
    
    // CORREÇÃO DA LÓGICA: 
    // Se estamos nos controles, X volta pro principal. 
    // Se estamos no principal, X fecha o menu (resume o jogo).
    const closeAction = menuMode === 'controls' 
        ? acaoVoltarParaMenuInicial 
        : () => {
            console.log('[MENU-UI] X clicado no modo principal: Retomando jogo...');
            window.togglePauseMenu();
        };

    const title = criarElementoTitulo();

    if (typeof closeAction === 'function') {
        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'menu-close-button menu-nav-item';
        closeButton.dataset.menuMode = 'main';
        closeButton.dataset.navType = 'close';
        closeButton.textContent = 'X';
        closeButton.setAttribute('aria-label', 'Voltar ao menu inicial');
        closeButton.title = 'Menu inicial';
        
        // Garante que o botão seja clicável e fique acima de outros elementos
        closeButton.style.zIndex = '1000001';
        closeButton.style.pointerEvents = 'auto';

        closeButton.onmouseenter = () => {
            menuSelectedIndex = getMainMenuNavItems().indexOf(closeButton);
            updateMenuVisuals();
        };
        closeButton.onmouseleave = () => {
            menuSelectedIndex = -1;
            updateMenuVisuals();
        };

        const fecharAction = (e) => {
            if (e) {
                console.log('[MENU-UI] Evento capturado no X:', e.type);
                e.preventDefault();
                e.stopImmediatePropagation(); // Impede que o handleMenuInput global interfira
            }
            
            console.log('[MENU-UI] Executando closeAction...');
            closeAction();
        };

        closeButton.onclick = fecharAction;
        // O handleMenuInput já cuida do Enter se o botão estiver selecionado, 
        // mas adicionamos aqui para caso o foco manual esteja no elemento.
        closeButton.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') fecharAction(e);
        };

        overlay.appendChild(closeButton);
    }

    overlay.appendChild(title);
    preencherConteudoPorModo(overlay);

    targetLayer.appendChild(overlay);
    updateMenuVisuals();
}

function obterIconePorLabel(label) {
    const l = String(label || '').trim().toUpperCase();
    if (l === 'INICIAR') return 'assets/icones/play.png';
    if (l === 'RETORNAR') return 'assets/icones/voltar.png';
    if (l === 'CONTROLES') return 'assets/icones/controle.png';
    if (l === 'REINICIAR') return 'assets/icones/voltar_jogo.png';
    if (l === 'SKILLS') return 'assets/icones/skill.png';
    if (l === 'TREINO') return 'assets/icones/treinar.png';
    if (l === 'SAIR') return 'assets/icones/lixo.png';
    return null;
}

function renderMainMenuContent(overlay) {
    const slotSelecionado = getSlotSelecionadoMenu();

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
    optionsContainer.style.alignItems = 'center';
    optionsContainer.style.gap = '12px';
    optionsContainer.style.width = '120px';

    const currentOptions = getMainMenuOptions();

    // Função auxiliar para criar os botões e evitar repetição de código
    const criarBotaoMenu = (opt) => {
        const btn = document.createElement('div');
        btn.className = 'menu-option menu-option--main menu-nav-item';
        btn.dataset.menuMode = 'main';
        btn.dataset.navType = 'action';
        btn.title = opt.label; // Tooltip e legenda

        const iconePath = obterIconePorLabel(opt.label);
        if (iconePath) {
            const img = document.createElement('img');
            img.src = iconePath;
            img.alt = opt.label;
            img.style.width = '32px';
            img.style.height = '32px';
            img.style.imageRendering = 'pixelated';
            img.style.objectFit = 'contain';
            btn.appendChild(img);

            btn.style.width = '56px';
            btn.style.height = '56px';
            btn.style.padding = '0';
            btn.style.display = 'flex';
            btn.style.alignItems = 'center';
            btn.style.justifyContent = 'center';
            btn.style.borderRadius = '10px';
        } else {
            btn.innerText = opt.label;
        }

        btn.onmouseenter = () => {
            menuSelectedIndex = getMainMenuNavItems().indexOf(btn);
            updateMenuVisuals();
        };

        btn.onmouseleave = () => {
            menuSelectedIndex = -1;
            updateMenuVisuals();
        };

        btn.onclick = (e) => {
            e.stopPropagation();
            opt.action();
        };
        return btn;
    };

    currentOptions.forEach((opt) => {
        optionsContainer.appendChild(criarBotaoMenu(opt));
    });

    // Legenda abaixo dos ícones para indicar o item selecionado
    const labelInfo = document.createElement('div');
    labelInfo.id = 'menu-selected-label';
    labelInfo.style = `
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 2px;
        color: #79ffb6;
        text-align: center;
        margin-top: 8px;
        min-height: 18px;
        text-transform: uppercase;
        text-shadow: 0 0 8px rgba(121,255,182,0.4);
    `;
    optionsContainer.appendChild(labelInfo);

    // Coluna da direita para agrupar o Painel de Resumo, a dificuldade e o controle de volume
    const rightColumn = document.createElement('div');
    rightColumn.style.display = 'flex';
    rightColumn.style.flexDirection = 'column';
    rightColumn.style.gap = '10px';
    rightColumn.style.width = '188px'; // Mantém a largura consistente com o painel de resumo

    rightColumn.appendChild(criarPainelResumoSalvo(slotSelecionado));

    rightColumn.appendChild(criarPainelDificuldade());

    layout.appendChild(optionsContainer);
    layout.appendChild(rightColumn);
    overlay.appendChild(layout);

    // Injeta a barra de volume do AudioManager na coluna da direita (abaixo do resumo)
    if (window.AudioManager && typeof window.AudioManager.renderVolumeControl === 'function') {
        window.AudioManager.renderVolumeControl(rightColumn);

        const volumeWrapper = rightColumn.querySelector('.volume-control-wrapper');
        const volumeSlider = volumeWrapper?.querySelector('.volume-slider');

        if (volumeWrapper) {
            volumeWrapper.classList.add('menu-volume-panel', 'menu-nav-item');
            volumeWrapper.dataset.menuMode = 'main';
            volumeWrapper.dataset.navType = 'volume';

            volumeWrapper.onmouseenter = () => {
                menuSelectedIndex = getMainMenuNavItems().indexOf(volumeWrapper);
                updateMenuVisuals();
            };

            volumeWrapper.onmouseleave = () => {
                menuSelectedIndex = -1;
                updateMenuVisuals();
            };

            volumeWrapper.onclick = () => {
                menuSelectedIndex = getMainMenuNavItems().indexOf(volumeWrapper);
                updateMenuVisuals();
            };
        }

        if (volumeSlider) {
            volumeSlider.tabIndex = -1;
        }
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
        linha.className = 'menu-option menu-option--control';
        const bind = getTeclaPrincipal(item.id);
        const aguardando = controlsBindingAction === item.id ? '  <AGUARDANDO...>' : '';
        linha.innerText = `${item.label}: ${bind}${aguardando}`;

        linha.onmouseenter = () => {
            controlsSelectedIndex = index;
            updateMenuVisuals();
        };

        linha.onmouseleave = () => {
            controlsSelectedIndex = -1;
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
    salvarBtn.className = 'menu-option menu-option--action menu-option--save';
    salvarBtn.innerText = 'SALVAR E VOLTAR';
    salvarBtn.onmouseenter = () => {
        controlsSelectedIndex = CONTROLES_MENU_ITEMS.length;
        updateMenuVisuals();
    };
    salvarBtn.onmouseleave = () => {
        controlsSelectedIndex = -1;
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
    resetBtn.className = 'menu-option menu-option--action';
    resetBtn.innerText = 'RESTAURAR PADRAO';
    resetBtn.onmouseenter = () => {
        controlsSelectedIndex = CONTROLES_MENU_ITEMS.length + 1;
        updateMenuVisuals();
    };
    resetBtn.onmouseleave = () => {
        controlsSelectedIndex = -1;
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
    if (menuMode === 'controls') {
        const elements = document.querySelectorAll('.menu-option');

        elements.forEach((el, index) => {
            el.classList.toggle('selected', index === controlsSelectedIndex);
        });

        return;
    }

    const items = getMainMenuNavItems();
    let selectedLabelText = '';

    items.forEach((item, index) => {
        const isSelected = index === menuSelectedIndex;
        item.classList.toggle('selected', isSelected && item.classList.contains('menu-option'));
        item.classList.toggle('menu-nav-selected', isSelected && !item.classList.contains('menu-option'));

        if (isSelected) {
            if (item.title) {
                selectedLabelText = item.title;
            } else if (item.dataset.navType === 'volume') {
                selectedLabelText = 'VOLUME';
            } else if (item.dataset.navType === 'close') {
                selectedLabelText = 'VOLTAR';
            }
        }
    });

    const labelInfo = document.getElementById('menu-selected-label');
    if (labelInfo) {
        labelInfo.innerText = selectedLabelText || 'SELECIONE';
    }
}

function removeMenuUI() {
    const overlay = document.getElementById('pause-menu-overlay');
    if (overlay) overlay.remove();
}
