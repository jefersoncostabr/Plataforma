/**
 * Lógica do Editor de Fases
 */

const TILE_SIZE = window.EditorConfig?.TILE_SIZE || 32;
const {
    PLATFORM_DEFS = [],
    ENEMY_DEFS = [],
    SYSTEM_DEFS = [],
    COORD_ARRAY_KEYS = [],
    createEmptyFaseData = () => ({})
} = window.EditorConfig || {};
const {
    rowToLetters = (row) => String.fromCharCode(97 + row),
    pointToCoord = () => 'a1',
    coordToParts = () => null,
    sortCoords = () => 0,
    normalizeFaseData = (data) => data,
    iterarItensData = () => []
} = window.EditorUtils || {};

let COLS = 20; 
let ROWS = 15; 
const PHASES_BASE_PATH = '../../config/fases/';
const PHASE_DISCOVERY_CANDIDATES = ['treino.json', ...Array.from({ length: 50 }, (_, i) => `fase${i + 1}.json`)];

// Estado da fase
let faseData = createEmptyFaseData();

// Novo: dicionário de definições de itens carregados dos JSONs
let itemDefinitions = {};

let itemSelecionado = 'plataforma';
let gradeVisivel = true;

const stage = document.getElementById('game-stage');
const stageArea = document.getElementById('stage-area');
const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('btn-import');
const btnClear = document.getElementById('btn-clear');
const output = document.getElementById('json-output');
const proportionSelect = document.getElementById('proportion-select'); // Novo elemento necessário no HTML

// Elementos de Configuração
const spawnRandomCheck = document.getElementById('spawn-random');
const randomDiffSelect = document.getElementById('random-diff');
const randomTypeSelect = document.getElementById('random-type');

let tooltipElement;
let renderizadorEditor;
let persistenciaEditor;
let uiEditor;

function obterLegendaCoord(coord) {
    for (const def of [...PLATFORM_DEFS, ...ENEMY_DEFS]) {
        if ((faseData[def.stateKey] || []).includes(coord)) return def.label;
    }

    for (const def of SYSTEM_DEFS) {
        if (faseData[def.stateKey] === coord) return def.label;
    }

    const item = iterarItensData(faseData.itens).find(i => i.pos === coord);
    if (item) {
        const nome = itemDefinitions[item.tipo]?.nome || item.tipo;
        return 'Item: ' + nome;
    }

    return '';
}

// Inicialização

window.onload = async () => {
    await carregarItemDefinitions();

    renderizadorEditor = window.criarRenderizadorEditor({
        stage,
        getFaseData: () => faseData,
        getItemDefinitions: () => itemDefinitions
    });

    uiEditor = window.criarUIEditor({
        stage,
        palette: document.getElementById('palette'),
        proportionSelect,
        spawnRandomCheck,
        randomDiffSelect,
        randomTypeSelect,
        getFaseData: () => faseData,
        setFaseData: (novoEstado) => { faseData = novoEstado; },
        atualizarTamanhoStage,
        atualizarVisual,
        adicionarElemento,
        removerElemento,
        setItemSelecionado: (tipo) => { itemSelecionado = tipo; },
        getItemDefinitions: () => itemDefinitions,
        tileSize: TILE_SIZE,
        pointToCoord,
        getLegendaCoord: obterLegendaCoord
    });

    persistenciaEditor = window.criarPersistenciaEditor({
        output,
        getFaseData: () => faseData,
        setFaseData: (novoEstado) => { faseData = novoEstado; },
        getRandomConfig: () => ({
            enabled: document.getElementById('spawn-random').checked,
            diff: parseInt(document.getElementById('random-diff').value),
            type: parseInt(document.getElementById('random-type').value)
        }),
        aplicarEstadoUI: (estado) => {
            proportionSelect.value = estado.proporcao;
            spawnRandomCheck.checked = estado.inimigoAleatorio[0] > 0;
            randomDiffSelect.value = estado.inimigoAleatorio[0] || 1;
            randomTypeSelect.value = estado.inimigoAleatorio[1] || 0;
            document.getElementById('random-config-fields').style.opacity = spawnRandomCheck.checked ? '1' : '0.3';
            atualizarTamanhoStage();
        }
    });

    uiEditor.configurarControlesDimensoes();
    atualizarTamanhoStage();
    uiEditor.configurarPaletaDinamicaItens();
    uiEditor.configurarStage();
    uiEditor.configurarFerramentasAutomaticas();
    uiEditor.configurarSpawnAleatorio();
    uiEditor.configurarTooltip();
    uiEditor.configurarTeclasGlobais();
    uiEditor.configurarSeletorFases({
        persistencia: persistenciaEditor,
        basePath: PHASES_BASE_PATH,
        arquivosCandidatos: PHASE_DISCOVERY_CANDIDATES
    });

    btnExport.onclick = () => persistenciaEditor.exportarJSON();
    btnImport.onclick = () => persistenciaEditor.importarJSON();
    btnClear.onclick = () => {
        if(confirm("Deseja limpar todo o palco?")) {
            faseData = createEmptyFaseData({
                proporcao: faseData.proporcao,
                posicaoInicialJogador: '',
                objetivo: '',
                inimigoAleatorio: [...(faseData.inimigoAleatorio || [1, 0])]
            });
            atualizarVisual();
        }
    };

};

// Carrega todos os arquivos JSON de config/items/ e popula itemDefinitions
async function carregarItemDefinitions() {
    itemDefinitions = {};
    // Lista dos tipos de itens conhecidos (poderia ser dinâmico via API/FS)
    const tipos = ["revolver","escudo","bota","jetpack","garra","cinto","restauracao"];
    for (const tipo of tipos) {
        try {
            const resp = await fetch(`../../config/items/${tipo}.json`);
            if (resp.ok) {
                const data = await resp.json();
                itemDefinitions[data.id] = data;
            }
        } catch (e) { /* ignora erro */ }
    }
}


function atualizarTamanhoStage() {
    const [hMult, wMult] = faseData.proporcao.split('x').map(Number);
    COLS = 20 * (wMult || 1);
    ROWS = 15 * (hMult || 1);

    const larguraCalculada = (COLS * TILE_SIZE) + 'px';
    stage.style.width = larguraCalculada;
    stage.style.height = (ROWS * TILE_SIZE) + 'px';

    if (output) {
        output.style.width = larguraCalculada;
        output.style.boxSizing = 'border-box'; // Garante que a largura total inclua bordas
    }

    if (stageArea) {
        stageArea.scrollTop = 0;
        stageArea.scrollLeft = 0;
    }

    configurarGrade();
    atualizarVisual();
}

function configurarGrade() {
    renderizadorEditor.configurarGrade(COLS, ROWS, gradeVisivel);
}


function adicionarElemento(coord) {
    removerElemento(coord);

    const definition = window.EditorConfig?.getDefinitionByType(itemSelecionado);
    if (definition) {
        if (definition.kind === 'single') {
            faseData[definition.stateKey] = coord;
        } else {
            if (!Array.isArray(faseData[definition.stateKey])) faseData[definition.stateKey] = [];
            faseData[definition.stateKey].push(coord);
            faseData[definition.stateKey] = [...new Set(faseData[definition.stateKey])].sort(sortCoords);
        }
        return;
    }

    if (itemSelecionado.startsWith('item_')) {
        const tipoReal = itemSelecionado.replace('item_', '');
        if (!faseData.itens || typeof faseData.itens !== 'object' || Array.isArray(faseData.itens)) {
            faseData.itens = {};
        }
        if (!Array.isArray(faseData.itens[tipoReal])) faseData.itens[tipoReal] = [];
        faseData.itens[tipoReal].push(coord);
        faseData.itens[tipoReal] = [...new Set(faseData.itens[tipoReal])].sort(sortCoords);
    }
}

function removerElemento(coord) {
    COORD_ARRAY_KEYS.forEach((key) => {
        faseData[key] = (faseData[key] || []).filter(c => c !== coord);
    });

    if (!faseData.itens || typeof faseData.itens !== 'object' || Array.isArray(faseData.itens)) {
        faseData.itens = {};
    }

    Object.keys(faseData.itens).forEach((tipo) => {
        const posicoes = Array.isArray(faseData.itens[tipo]) ? faseData.itens[tipo] : [faseData.itens[tipo]];
        const filtradas = posicoes.filter((pos) => pos !== coord);
        if (filtradas.length === 0) delete faseData.itens[tipo];
        else faseData.itens[tipo] = filtradas;
    });

    if (faseData.posicaoInicialJogador === coord) faseData.posicaoInicialJogador = '';
    if (faseData.objetivo === coord) faseData.objetivo = '';
}

function atualizarVisual() {
    renderizadorEditor.atualizarVisual();
}

/**
 * Adiciona ou remove blocos da linha inferior (chão).
 * @param {boolean} fill - Se true, preenche; se false, remove.
 */

