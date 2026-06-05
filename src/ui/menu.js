/**
 * Gerenciador do Menu de Pause
 */

window.isMenuOpen = false;
let menuSelectedIndex = -1;
let menuMode = 'main'; // main | controls
let controlsSelectedIndex = -1;
let settingsSelectedIndex = -1;
let controlsBindingAction = null;
let controlsMenuHtmlContent = ''; // Para armazenar o conteúdo HTML carregado
let settingsMenuHtmlContent = ''; // Para armazenar o conteúdo HTML carregado
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
    { id: 'esquerda', label: 'Esquerda' },
    { id: 'direita', label: 'Direita' },
    { id: 'cima', label: 'Cima' },
    { id: 'baixo', label: 'Baixo' },
    { id: 'pulo', label: 'Pular' },
    { id: 'chute', label: 'Chutar' },
    { id: 'tiro', label: 'Atirar/Ação' },
    { id: 'garra', label: 'Garra' },
    { id: 'cinto', label: 'Cinto' },
    { id: 'mochila', label: 'Cinto / Colete' },
    { id: 'interagir', label: 'Interagir / Craft' },
    { id: 'abertura', label: 'Abrir/Fechar Robo' },
    { id: 'troca_pet', label: 'Pets' },
    { id: 'debugProximoNivel', label: 'Próxima Fase' },
    { id: 'debugSpawnInimigo', label: 'Spawn Inimigo' },
    { id: 'debugReset', label: 'Reset Total' },
    { id: 'pause', label: 'Pausar' },
    { id: 'debugGrade', label: 'Grade' }
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

    const configuracoesOption = {
        label: 'CONFIGURAÇÕES', action: () => {
            menuMode = 'settings';
            settingsSelectedIndex = 0;
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
        configuracoesOption,
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
            configuracoesOption,
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

    const key = e.key.toLowerCase();

    if (menuMode === 'controls') {
        handleControlsInput(e);
        return;
    }

    if (menuMode === 'settings') {
        handleSettingsInput(e);
        return;
    }

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

function getSettingsNavItems() {
    return Array.from(document.querySelectorAll('#pause-menu-overlay .menu-nav-item[data-menu-mode="settings"]'));
}

function obterModoTelaAtualMenu() {
    if (typeof window.obterModoTelaAtual === 'function') {
        return window.obterModoTelaAtual();
    }
    return 'normal';
}

function formatarRotuloModoTela(modo) {
    const valor = String(modo || 'normal').toLowerCase();
    if (valor === 'stretch') return '100% VIEWPORT';
    if (valor === 'fullscreen') return 'FULLSCREEN';
    return 'NORMAL';
}

function sincronizarEstadoBotoesTela(raiz = document) {
    const modoAtual = obterModoTelaAtualMenu();
    const botoes = raiz.querySelectorAll('[data-nav-type="screen"]');
    botoes.forEach((botao) => {
        const ativo = botao.dataset.screenMode === modoAtual;
        botao.classList.toggle('menu-screen-active', ativo);
        botao.setAttribute('aria-pressed', ativo ? 'true' : 'false');
    });


}


window.addEventListener('screen-mode-change', () => {
    if (window.isMenuOpen && menuMode === 'settings') {
        sincronizarEstadoBotoesTela(document);
    }
});

function handleSettingsInput(e) {
    const key = e.key.toLowerCase();
    const currentItems = getSettingsNavItems();
    if (!currentItems || currentItems.length === 0) return;

    if (key === 'escape') {
        menuMode = 'main';
        renderMenuUI();
        return;
    }

    if (key === 'arrowup' || key === 'w') {
        settingsSelectedIndex = (settingsSelectedIndex <= 0) ? currentItems.length - 1 : settingsSelectedIndex - 1;
        updateMenuVisuals();
    } else if (key === 'arrowdown' || key === 's') {
        settingsSelectedIndex = (settingsSelectedIndex === -1 || settingsSelectedIndex >= currentItems.length - 1) ? 0 : settingsSelectedIndex + 1;
        updateMenuVisuals();
    } else if (key === 'arrowleft' || key === 'a' || key === 'arrowright' || key === 'd') {
        const item = currentItems[settingsSelectedIndex];
        if (item && item.dataset.navType === 'volume') {
            const direcao = (key === 'arrowleft' || key === 'a') ? -1 : 1;
            ajustarVolumeMenu(direcao * MENU_VOLUME_STEP);
            updateMenuVisuals();
        }
    } else if (key === 'enter' || key === ' ') {
        e.preventDefault();
        const item = currentItems[settingsSelectedIndex];
        if (item) {
            if (item.dataset.navType === 'close') {
                menuMode = 'main';
                renderMenuUI();
            } else {
                item.click();
            }
        }
    }
}

/**
 * Carrega o conteúdo HTML para o menu de configurações.
 */
async function loadSettingsMenuHtml() {
    if (settingsMenuHtmlContent) return; // Carrega apenas uma vez
    try {
        const response = await fetch('src/ui/settings-menu.html?v=20260602-screen-mode-status');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        settingsMenuHtmlContent = await response.text();
    } catch (e) {
        console.error("Falha ao carregar settings-menu.html:", e);
        settingsMenuHtmlContent = `<div class="menu-settings-container">Erro ao carregar configurações.</div>`; // Conteúdo de fallback
    }
}

/**
 * Carrega o conteúdo HTML para o menu de controles.
 */
async function loadControlsMenuHtml() {
    if (controlsMenuHtmlContent) return; // Carrega apenas uma vez
    try {
        const response = await fetch('src/ui/controls-menu.html');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        controlsMenuHtmlContent = await response.text();
    } catch (e) {
        console.error("Falha ao carregar controls-menu.html:", e);
        controlsMenuHtmlContent = `<div class="menu-controls-container">Erro ao carregar controles.</div>`;
    }
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
 * Usa as classes CSS padrão para posicionamento fixo.
 */
function criarElementoOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'pause-menu-overlay';
    overlay.className = 'pause-menu-overlay';
    return overlay;
}

// Função para criar o título do menu
/**
 * Cria o título do menu baseado no modo atual (Main ou Controles).
 */
function criarElementoTitulo() {
    const title = document.createElement('h1');
    let texto = '';
    if (menuMode === 'controls') {
        texto = 'CONTROLES';
    } else if (menuMode === 'settings') {
        // texto = 'CONFIGURAÇÕES';
        // console.log('[DEBUG-MENU] Criando elemento H1 para o título de CONFIGURAÇÕES (criarElementoTitulo)');
    } else {
        texto = window.isFirstStart ? 'PRINCIPAL' : 'PAUSE';
    }
    title.innerText = texto;
    title.className = menuMode === 'controls' ? 'menu-title menu-title--controls' : 'menu-title';
    return title;
}

/**
 * Decide qual conteúdo renderizar dentro do overlay baseado no modo do menu.
 */
async function preencherConteudoPorModo(overlay) {
    if (menuMode === 'controls') {
        await renderControlsContent(overlay);
    } else if (menuMode === 'settings') {
        await renderSettingsContent(overlay);
    } else {
        renderMainMenuContent(overlay);
    }
}

async function renderMenuUI() {
    removeMenuUI();

    const targetLayer = obterConteinerDestino();
    if (!targetLayer) {
        console.error('[MENU-UI] Falha ao renderizar: Conteiner de destino não encontrado.');
        return;
    }

    const overlay = criarElementoOverlay();
    
    const closeAction = (menuMode === 'controls' || menuMode === 'settings')
        ? acaoVoltarParaMenuInicial 
        : () => {
            window.togglePauseMenu();
        };

    targetLayer.appendChild(overlay);

    // Container principal para conteúdo escalável (Suporta 1x, 2x, 3x automaticamente)
    const mainLayout = document.createElement('div');
    mainLayout.className = 'menu-layout-container';
    overlay.appendChild(mainLayout);

    // Adiciona o título dinâmico ao topo do container
    mainLayout.appendChild(criarElementoTitulo());        

   
    await preencherConteudoPorModo(mainLayout);

    // Sincroniza a escala do menu com o aumento da tela
    if (typeof window.aplicarEscalaJogo === 'function') {
        window.aplicarEscalaJogo();
    }

    updateMenuVisuals();
}

function obterIconePorLabel(label) {
    const l = String(label || '').trim().toUpperCase();
    if (l === 'INICIAR') return 'assets/icones/play.png';
    if (l === 'RETORNAR') return 'assets/icones/voltar.png';
    if (l === 'CONTROLES') return 'assets/icones/controle.png';
    if (l === 'REINICIAR') return 'assets/icones/voltar_jogo.png';
    if (l === 'SKILLS') return 'assets/icones/skill.png';
    if (l === 'CONFIGURAÇÕES') return 'assets/icones/config.png';
    if (l === 'TREINO') return 'assets/icones/treinar.png';
    if (l === 'SAIR') return 'assets/icones/lixo.png';
    return null;
}

function renderMainMenuContent(overlay) {
    const slotSelecionado = getSlotSelecionadoMenu();

    const layout = document.createElement('div');
    layout.className = 'menu-main-layout';

    // Estilos do container de opções (botões principais)
    const optionsContainer = document.createElement('div');
    optionsContainer.id = 'menu-options-container';
    optionsContainer.className = 'menu-options-container';

    // Container interno para organizar os botões em grade
    const buttonsGrid = document.createElement('div');
    buttonsGrid.className = 'menu-buttons-grid';

    const currentOptions = getMainMenuOptions();
    console.log('[Menu] Analisando layout. Total de opções:', currentOptions.length);

    // Split visual em 2 colunas: a lógica de layout fica no CSS.
    // JS só habilita a classe quando há mais de 3 opções.
    if (currentOptions.length > 3) {
        buttonsGrid.classList.add('menu-buttons-grid--split');
    }

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
            btn.appendChild(img);
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
        buttonsGrid.appendChild(criarBotaoMenu(opt));
    });

    const labelInfo = document.createElement('div');
    labelInfo.id = 'menu-selected-label';
    
    // Se estiver em modo split (2 colunas), a legenda deve ocupar a largura total da grade
    if (currentOptions.length > 3) {
        labelInfo.style.gridColumn = '1 / -1';
    }

    buttonsGrid.appendChild(labelInfo);
    optionsContainer.appendChild(buttonsGrid);

    // Estilos da coluna da direita (painéis de resumo e dificuldade)
    // Coluna da direita para agrupar o Painel de Resumo, a dificuldade e o controle de volume
    const rightColumn = document.createElement('div');
    rightColumn.className = 'menu-right-column';

    rightColumn.appendChild(criarPainelResumoSalvo(slotSelecionado));

    rightColumn.appendChild(criarPainelDificuldade());

    layout.appendChild(optionsContainer);
    layout.appendChild(rightColumn);
    overlay.appendChild(layout);
}

async function renderSettingsContent(overlay) {
    await loadSettingsMenuHtml(); // Garante que o HTML seja carregado antes de renderizar

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = settingsMenuHtmlContent;
    const settingsContainer = tempDiv.firstElementChild; // Pega o container principal do HTML carregado

    if (!settingsContainer) {
        console.error("Container do menu de configurações não encontrado no HTML carregado.");
        return;
    }
    settingsContainer.classList.add('menu-panel-base'); // Adiciona os estilos comuns de painel

    // --- SEÇÃO DE VOLUME ---
    const volumePlaceholder = settingsContainer.querySelector('#volume-control-placeholder');
    if (volumePlaceholder && window.AudioManager && typeof window.AudioManager.renderVolumeControl === 'function') {
        // Renderiza o controle de volume no placeholder
        window.AudioManager.renderVolumeControl(volumePlaceholder);
        const volumeWrapper = volumePlaceholder.querySelector('.volume-control-wrapper');
        if (volumeWrapper) { // Garante que o wrapper foi criado pelo AudioManager
            volumeWrapper.classList.add('menu-nav-item'); // Adiciona nav-item para navegação
            volumeWrapper.dataset.menuMode = 'settings';
            volumeWrapper.dataset.navType = 'volume';
            volumeWrapper.onmouseenter = () => {
                settingsSelectedIndex = getSettingsNavItems().indexOf(volumeWrapper);
                updateMenuVisuals();
            };
        }
    }

    // --- SEÇÃO DE TAMANHO DA TELA - Event Listeners ---
    const screenButtons = settingsContainer.querySelectorAll('[data-nav-type="screen"]');
    screenButtons.forEach(btn => {

        btn.onmouseenter = () => {
            settingsSelectedIndex = getSettingsNavItems().indexOf(btn);
            updateMenuVisuals();
        };
        
        btn.onclick = async () => {
            const modo = btn.dataset.screenMode;
            if (typeof window.aplicarModoTela === 'function') {
                await window.aplicarModoTela(modo);
            } else if (typeof window.aplicarEscalaJogo === 'function') {
                window.aplicarEscalaJogo();
            }
            sincronizarEstadoBotoesTela(settingsContainer);
        };
    });

    sincronizarEstadoBotoesTela(settingsContainer);

    overlay.appendChild(settingsContainer);
}

async function renderControlsContent(overlay) {
    await loadControlsMenuHtml();

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = controlsMenuHtmlContent;
    
    // Busca os elementos no fragmento carregado (podem ser irmãos na raiz do arquivo)
    const container = tempDiv.querySelector('.menu-controls-container');
    const template = tempDiv.querySelector('#control-row-template');

    if (!container) {
        console.error("Container do menu de controles não encontrado no HTML carregado.");
        return;
    }

    const listContainer = container.querySelector('#controls-list-container');
    if (listContainer && Array.isArray(CONTROLES_MENU_ITEMS) && CONTROLES_MENU_ITEMS.length > 0) {
        listContainer.innerHTML = ''; // Limpa antes de preencher

        CONTROLES_MENU_ITEMS.forEach((item, index) => {
            let linha;

            if (template?.content?.firstElementChild) {
                linha = template.content.firstElementChild.cloneNode(true);
            } else {
                linha = document.createElement('div');
                linha.className = 'menu-option menu-option--control menu-controls-line';
                linha.innerHTML = '<span class="menu-controls-label"></span><span class="menu-controls-key"></span>';
            }

            const bind = getTeclaPrincipal(item.id);
            const aguardando = controlsBindingAction === item.id ? '  <AGUARDANDO...>' : '';

            const label = linha.querySelector('.menu-controls-label');
            const keyDisplay = linha.querySelector('.menu-controls-key');

            if (!label || !keyDisplay) return;

            label.textContent = item.label;
            keyDisplay.textContent = `${bind}${aguardando}`;

            linha.onmouseenter = () => {
                controlsSelectedIndex = index;
                updateMenuVisuals();
            };

            linha.onclick = () => {
                controlsSelectedIndex = index;
                controlsBindingAction = item.id;
                renderMenuUI();
            };

            listContainer.appendChild(linha);
        });
    } else {
        console.error('Falha ao montar lista de controles:', {
            hasList: !!listContainer,
            hasTemplate: !!template,
            hasItems: !!CONTROLES_MENU_ITEMS
        });
    }

    // Configura botões de ação (Salvar/Restaurar) presentes no HTML
    const salvarBtn = container.querySelector('#btn-save-controls');
    if (salvarBtn) {
        // Gerencia a interação visual quando o botão de salvar é focado via teclado ou mouse
        salvarBtn.onmouseenter = () => {
            controlsSelectedIndex = CONTROLES_MENU_ITEMS.length;
            updateMenuVisuals();
        };
        // Executa a persistência dos novos comandos no LocalStorage e retorna ao menu principal
        salvarBtn.onclick = () => {
            salvarControlesNoStorage();
            menuMode = 'main';
            menuSelectedIndex = 0;
            renderMenuUI();
        };
    }

    const resetBtn = container.querySelector('#btn-reset-controls');
    if (resetBtn) {
        resetBtn.onmouseenter = () => {
            controlsSelectedIndex = CONTROLES_MENU_ITEMS.length + 1;
            updateMenuVisuals();
        };
        resetBtn.onclick = () => {
            window.controlesConfig = normalizarControles(CONTROLES_PADRAO);
            salvarControlesNoStorage();
            renderMenuUI();
        };
    }

    overlay.appendChild(container);
}

// Função para atualizar os visuais dos itens do menu (seleção, hover, etc.)
function updateMenuVisuals() {
    if (menuMode === 'controls') {
        const elements = document.querySelectorAll('.menu-controls-container .menu-option');

        elements.forEach((el, index) => {
            const isSelected = index === controlsSelectedIndex;
            el.classList.toggle('selected', isSelected);
        });

        return;
    }

    if (menuMode === 'settings') {
        sincronizarEstadoBotoesTela(document);
        const items = getSettingsNavItems();
        items.forEach((item, index) => {
            const isSelected = index === settingsSelectedIndex;
            
            if (item.classList.contains('menu-option')) {
                item.classList.toggle('selected', isSelected);
            } else {
                item.classList.toggle('menu-nav-selected', isSelected);
            }

            if (isSelected) {
                item.style.transform = 'scale(1.05)';
            } else {
                item.style.transform = 'scale(1)';
            }
        });
        return;
    }

    const items = getMainMenuNavItems();
    let selectedLabelText = '';

    items.forEach((item, index) => {
        const isSelected = index === menuSelectedIndex;
        // Alterna classes para estilos de seleção
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
