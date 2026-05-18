/**
 * Lógica do Editor de Fases
 */

const TILE_SIZE = window.EditorConfig?.TILE_SIZE || 32;
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
const PHASES_MANIFEST_PATH = `${PHASES_BASE_PATH}index.json`;
const PHASE_DISCOVERY_CANDIDATES = ['treino.json', ...Array.from({ length: 50 }, (_, i) => `fase${i + 1}.json`)];

// Estado da fase
let faseData = window.EditorConfig?.createEmptyFaseData() || {};

// Novo: dicionário de definições de itens carregados dos JSONs
let itemDefinitions = {};

let itemSelecionado = 'plataforma';
let gradeVisivel = true;

const stage = document.getElementById('game-stage');
const stageArea = document.getElementById('stage-area');
const btnExport = document.getElementById('btn-export');
const btnLinkSave = document.getElementById('btn-link-save');
const btnNewPhase = document.getElementById('btn-new-phase');
const btnSavePhase = document.getElementById('btn-save-phase');
const btnImport = document.getElementById('btn-import');
const btnClear = document.getElementById('btn-clear');
const saveStatus = document.getElementById('save-status');
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
let arquivoFaseAtual = '';

window.__EDITOR_DEBUG__ = window.__EDITOR_DEBUG__ || [];

function registrarDebugEditor(evento, dados = {}) {
    const entrada = {
        ts: new Date().toISOString(),
        evento,
        ...dados
    };

    window.__EDITOR_DEBUG__.push(entrada);
    if (window.__EDITOR_DEBUG__.length > 200) {
        window.__EDITOR_DEBUG__.shift();
    }

    console.debug('[Editor]', evento, entrada);
    return entrada;
}

function atualizarStatusSalvamento(status = {}) {
    if (!saveStatus) return;

    const { mensagem = 'aguardando fase ativa.', tipo = 'info' } = status;
    const cores = {
        success: '#28a745',
        error: '#ff6b6b',
        warning: '#ffc107',
        info: '#9ec5fe'
    };

    saveStatus.innerHTML = `<p><strong>Auto-save</strong>: ${mensagem}</p>`;
    saveStatus.style.color = cores[tipo] || cores.info;
}

function definirArquivoFaseAtual(arquivo = '') {
    arquivoFaseAtual = String(arquivo || '').trim();

    if (persistenciaEditor && typeof persistenciaEditor.setArquivoFaseAtual === 'function') {
        persistenciaEditor.setArquivoFaseAtual(arquivoFaseAtual);
    }

    if (btnLinkSave) {
        btnLinkSave.textContent = arquivoFaseAtual
            ? `Vincular Arquivo (${arquivoFaseAtual.replace(/\.json$/i, '')})`
            : 'Vincular Arquivo';
    }
}

function aplicarFaseDataEditor(novoEstado, opcoes = {}) {
    faseData = normalizeFaseData(novoEstado || createEmptyFaseData());

    registrarDebugEditor('faseData-aplicado', {
        proporcao: faseData.proporcao,
        posicaoInicialJogador: faseData.posicaoInicialJogador || '',
        objetivo: faseData.objetivo || '',
        autoSave: false,
        plataformas: Array.isArray(faseData.plataformas) ? faseData.plataformas.length : 0
    });

    if (Object.prototype.hasOwnProperty.call(opcoes, 'arquivoFaseAtual')) {
        definirArquivoFaseAtual(opcoes.arquivoFaseAtual);
    }

    atualizarStatusSalvamento({
        mensagem: arquivoFaseAtual ? `alterações pendentes em ${arquivoFaseAtual}.` : 'alterações pendentes; vincule um arquivo para salvar.',
        tipo: 'warning'
    });
}

function obterLegendaCoord(coord) {
    const PLATFORM_DEFS = window.EditorConfig?.PLATFORM_DEFS || [];
    const ENEMY_DEFS = window.EditorConfig?.ENEMY_DEFS || [];
    const SYSTEM_DEFS = window.EditorConfig?.SYSTEM_DEFS || [];

    for (const def of [...PLATFORM_DEFS, ...ENEMY_DEFS]) {
        if ((faseData[def.stateKey] || []).includes(coord)) return def.label;
    }

    if (faseData.posicaoGaiola === coord) return 'Gaiola com Cão';

    if (faseData.posicaoMusgoRoboAberto === coord) return 'Musgo (Robô Aberto)';
    if (faseData.posicaoMusgoRoboDesativado === coord) return 'Musgo (Robô Desativado)';

    for (const def of SYSTEM_DEFS) {
        if (faseData[def.stateKey] === coord) return def.label;
    }

    const item = iterarItensData(faseData.itens).find(i => i.pos === coord);
    if (item) {
        let nome = itemDefinitions[item.tipo]?.nome || (item.tipo === 'novelo' ? 'Novelo de Lã' : item.tipo);
        if (item.tipo === 'novelo') nome = 'Novelo de Lã';
        if (item.tipo === 'municao_plus') nome = 'Caixa de Munição';
        if (item.tipo === 'capsula') {
            const estado = item.robotEstado === 'desativado' ? 'robô desativado' : 'robô aberto';
            return `Item: ${nome} (${estado})`;
        }
        return 'Item: ' + nome;
    }

    return '';
}

// Inicialização

window.onload = async () => {
    console.group("🚀 [Editor] Inicialização");
    if (window.__EDITOR_DEBUG_LEVEL__ === 'full') {
        console.log("Configurações detectadas:", { 
            TileSize: TILE_SIZE,
            HasConfig: !!window.EditorConfig,
            SystemCount: window.EditorConfig?.SYSTEM_DEFS?.length,
            PaletaID: !!document.getElementById('palette'),
            StageID: !!document.getElementById('game-stage')
        });
    }

    const createEmptyFaseData = window.EditorConfig?.createEmptyFaseData || (() => ({}));

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
        setFaseData: (novoEstado, opcoes = {}) => { aplicarFaseDataEditor(novoEstado, opcoes); },
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
        setFaseData: (novoEstado, opcoes = {}) => { aplicarFaseDataEditor(novoEstado, opcoes); },
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
            console.debug('[Editor] fase aplicada', {
                proporcao: estado.proporcao,
                posicaoInicialJogador: estado.posicaoInicialJogador,
                objetivo: estado.objetivo
            });
            atualizarTamanhoStage();
        },
        onStatusChange: atualizarStatusSalvamento
    });

    definirArquivoFaseAtual('');
    atualizarStatusSalvamento({ mensagem: 'aguardando fase ativa.', tipo: 'info' });

    if (btnLinkSave) {
        btnLinkSave.onclick = async () => {
            if (!persistenciaEditor) return;
            await persistenciaEditor.vincularArquivoAtual();
        };
    }

    if (btnNewPhase) {
        btnNewPhase.onclick = async () => {
            // Detecta arquivos existentes para calcular o próximo número
            const arquivos = await uiEditor.detectarExistentes();
            let maxNum = 0;

            arquivos.forEach(arq => {
                const match = arq.match(/fase(\d+)\.json/i);
                if (match) {
                    const num = parseInt(match[1]);
                    if (num > maxNum) maxNum = num;
                }
            });

            const novoNome = `fase${maxNum + 1}.json`;

            if (confirm(`Deseja criar a "${novoNome}" do zero?`)) {
                aplicarFaseDataEditor(createEmptyFaseData({
                    proporcao: "1x1"
                }), { arquivoFaseAtual: novoNome });

                atualizarTamanhoStage();
                if (persistenciaEditor) {
                    await persistenciaEditor.salvarAutomaticamenteAgora();

                    // Atualiza o manifesto index.json automaticamente
                    try {
                        const resp = await fetch(PHASES_MANIFEST_PATH, { cache: 'no-store' });
                        if (resp.ok) {
                            const manifesto = await resp.json();
                            const lista = manifesto.fases || manifesto;
                            
                            if (Array.isArray(lista) && !lista.includes(novoNome)) {
                                lista.push(novoNome);
                                
                                // Ordena a lista numericamente para evitar que fase11 fique antes da fase2
                                lista.sort((a, b) => {
                                    const numA = parseInt(a.match(/\d+/)?.[0] || 0);
                                    const numB = parseInt(b.match(/\d+/)?.[0] || 0);
                                    return numA - numB;
                                });

                                await fetch('/save-phase', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                        fileName: 'index.json', 
                                        content: JSON.stringify(manifesto, null, 4) 
                                    })
                                });
                                console.log(`[Editor] Manifesto atualizado com a nova fase: ${novoNome}`);
                                if (uiEditor && uiEditor.detectarExistentes) await uiEditor.detectarExistentes();
                            }
                        }
                    } catch (e) { console.error("Erro ao atualizar index.json:", e); }
                }
            }
        };
    }

    if (btnSavePhase) {
        btnSavePhase.onclick = async () => {
            if (!persistenciaEditor) return;

            if (!persistenciaEditor.getArquivoFaseAtual()) {
                alert('Carregue uma fase antes de salvar.');
                return;
            }

            const resultado = await persistenciaEditor.salvarAutomaticamenteAgora();
            if (resultado?.saved) {
                atualizarStatusSalvamento({
                    mensagem: `fase salva em ${resultado.arquivo || persistenciaEditor.getArquivoFaseAtual()}.`,
                    tipo: 'success'
                });
            }
        };
    }

    uiEditor.configurarControlesDimensoes();
    atualizarTamanhoStage();
    uiEditor.configurarPaletaDinamicaItens();
    uiEditor.configurarPaletaGaiola();
    uiEditor.configurarStage();
    uiEditor.configurarFerramentasAutomaticas();
    uiEditor.configurarSpawnAleatorio();
    uiEditor.configurarTooltip();
    uiEditor.configurarTeclasGlobais();
    uiEditor.configurarSeletorFases({
        persistencia: persistenciaEditor,
        basePath: PHASES_BASE_PATH,
        manifestPath: PHASES_MANIFEST_PATH,
        arquivosCandidatos: PHASE_DISCOVERY_CANDIDATES,
        aoCarregarFase: (arquivo) => definirArquivoFaseAtual(arquivo)
    });

    console.groupEnd();

    btnExport.onclick = () => persistenciaEditor.exportarJSON();
    btnImport.onclick = () => persistenciaEditor.importarJSON();
    btnClear.onclick = () => {
        if(confirm("Deseja limpar todo o palco?")) {
            aplicarFaseDataEditor(createEmptyFaseData({
                proporcao: faseData.proporcao,
                posicaoInicialJogador: '',
                objetivo: '',
                inimigoAleatorio: [...(faseData.inimigoAleatorio || [1, 0])]
            }));
            atualizarVisual();
        }
    };

};

// Carrega todos os arquivos JSON de config/items/ e popula itemDefinitions
async function carregarItemDefinitions() {
    itemDefinitions = {};
    // Lista dos tipos de itens conhecidos (poderia ser dinâmico via API/FS)
    const tipos = ["revolver", "escudo", "bota", "jetpack", "garra", "cinto", "colete", "restauracao", "scrap", "capsula", "doze", "municao_plus", "novelo"];
    for (const tipo of tipos) {
        try {
            const resp = await fetch(`../../config/items/${tipo}.json`);
            if (resp.ok) {
                const data = await resp.json();
                itemDefinitions[data.id] = data;
                console.log(`[Editor] Definição carregada com sucesso: ${data.id}`);
            }
            else { console.warn(`[Editor] Falha ao encontrar arquivo JSON para o item: ${tipo}`); }
        } catch (e) { /* ignora erro */ }
    }
}


function ajustarViewportFase(coordFoco = '') {
    registrarDebugEditor('viewport-preservado', {
        foco: coordFoco || faseData.posicaoInicialJogador || faseData.objetivo || '',
        scrollLeft: stageArea?.scrollLeft || 0,
        scrollTop: stageArea?.scrollTop || 0,
        proporcao: faseData.proporcao
    });
}

function atualizarTamanhoStage(opcoes = {}) {
    const { recentralizar = false, coordFoco = '' } = opcoes;
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

    configurarGrade();
    atualizarVisual();

    if (recentralizar) {
        ajustarViewportFase(coordFoco);
    }
}

function configurarGrade() {
    renderizadorEditor.configurarGrade(COLS, ROWS, gradeVisivel);
}


function adicionarElemento(coord) {
    if (window.__EDITOR_DEBUG_LEVEL__ === 'full') {
        console.log(`[Editor] adicionarElemento: tipo=${itemSelecionado}, coord=${coord}`);
    }

    if (itemSelecionado === 'item_capsula') {
        const itensCapsula = Array.isArray(faseData.itens?.capsula) ? faseData.itens.capsula : [];
        const indiceCapsula = itensCapsula.findIndex((item) => {
            if (typeof item === 'string') return item === coord;
            return item && item.pos === coord;
        });

        if (indiceCapsula >= 0) {
            const entradaAtual = itensCapsula[indiceCapsula];
            const robotEstadoAtual = typeof entradaAtual === 'string' ? 'aberto' : (entradaAtual.robotEstado || 'aberto');
            const robotEstadoNovo = robotEstadoAtual === 'aberto' ? 'desativado' : 'aberto';

            itensCapsula[indiceCapsula] = typeof entradaAtual === 'string'
                ? { pos: coord, robotEstado: robotEstadoNovo }
                : { ...entradaAtual, robotEstado: robotEstadoNovo, pos: coord };

            faseData.itens.capsula = itensCapsula;
            aplicarFaseDataEditor(faseData);
            return;
        }
    }

    if (itemSelecionado === 'musgo') {
        const alvoRoboAberto = faseData.posicaoRoboAberto === coord;
        const alvoRoboDesativado = faseData.posicaoRoboDesativado === coord;

        if (alvoRoboAberto) {
            faseData.posicaoMusgoRoboAberto = coord;
            aplicarFaseDataEditor(faseData);
            return;
        }

        if (alvoRoboDesativado) {
            faseData.posicaoMusgoRoboDesativado = coord;
            aplicarFaseDataEditor(faseData);
            return;
        }

        return;
    }

    if (itemSelecionado === 'alavanca') {
        removerElemento(coord);
        faseData.posicaoAlavanca = coord;
        aplicarFaseDataEditor(faseData);
        return;
    }

    removerElemento(coord);

    const definition = window.EditorConfig?.getDefinitionByType(itemSelecionado);
    if (definition) {
        if (definition.kind === 'single') {
            faseData[definition.stateKey] = coord;

            if (definition.type === 'roboAberto' && faseData.posicaoMusgoRoboAberto && faseData.posicaoMusgoRoboAberto !== coord) {
                faseData.posicaoMusgoRoboAberto = '';
            }

            if (definition.type === 'roboDesativado' && faseData.posicaoMusgoRoboDesativado && faseData.posicaoMusgoRoboDesativado !== coord) {
                faseData.posicaoMusgoRoboDesativado = '';
            }
        } else {
            if (!Array.isArray(faseData[definition.stateKey])) faseData[definition.stateKey] = [];
            faseData[definition.stateKey].push(coord);
            faseData[definition.stateKey] = [...new Set(faseData[definition.stateKey])].sort(sortCoords);
        }
        aplicarFaseDataEditor(faseData);
        return;
    }

    if (itemSelecionado.startsWith('item_')) {
        const tipoReal = itemSelecionado.replace('item_', '');
        if (!faseData.itens || typeof faseData.itens !== 'object' || Array.isArray(faseData.itens)) {
            faseData.itens = {};
        }
        if (!Array.isArray(faseData.itens[tipoReal])) faseData.itens[tipoReal] = [];
        if (tipoReal === 'capsula') {
            const entradaAtual = faseData.itens[tipoReal].find((item) => {
                const posItem = typeof item === 'string' ? item : item?.pos;
                return posItem === coord;
            });

            if (!entradaAtual) {
                faseData.itens[tipoReal].push({ pos: coord, robotEstado: 'aberto' });
            }
        } else {
            faseData.itens[tipoReal].push(coord);
            faseData.itens[tipoReal] = [...new Set(faseData.itens[tipoReal])].sort(sortCoords);
        }
    }

    aplicarFaseDataEditor(faseData);
}

function removerElemento(coord) {
    if (window.__EDITOR_DEBUG_LEVEL__ === 'full') {
        console.log(`[Editor] removerElemento na coord=${coord}`);
    }

    const COORD_ARRAY_KEYS = window.EditorConfig?.COORD_ARRAY_KEYS || [];
    const SYSTEM_DEFS = window.EditorConfig?.SYSTEM_DEFS || [];

    COORD_ARRAY_KEYS.forEach((key) => {
        faseData[key] = (faseData[key] || []).filter(c => c !== coord);
    });

    if (!faseData.itens || typeof faseData.itens !== 'object' || Array.isArray(faseData.itens)) {
        faseData.itens = {};
    }

    Object.keys(faseData.itens).forEach((tipo) => {
        const posicoes = Array.isArray(faseData.itens[tipo]) ? faseData.itens[tipo] : [faseData.itens[tipo]];
        const filtradas = posicoes.filter((pos) => {
            const posCoord = typeof pos === 'string' ? pos : pos?.pos;
            return posCoord !== coord;
        });
        if (filtradas.length === 0) delete faseData.itens[tipo];
        else faseData.itens[tipo] = filtradas;
    });

    // Limpeza dinâmica baseada nas definições de sistema
    SYSTEM_DEFS.forEach(def => {
        if (faseData[def.stateKey] === coord) faseData[def.stateKey] = '';
    });

    if (faseData.posicaoMusgoRoboAberto === coord) faseData.posicaoMusgoRoboAberto = '';
    if (faseData.posicaoMusgoRoboDesativado === coord) faseData.posicaoMusgoRoboDesativado = '';

    aplicarFaseDataEditor(faseData);
}

function atualizarVisual() {
    renderizadorEditor.atualizarVisual();
    registrarDebugEditor('visual-atualizado', {
        imagensNoPalco: stage.querySelectorAll('img').length,
        scrollTop: stageArea?.scrollTop || 0,
        scrollLeft: stageArea?.scrollLeft || 0
    });
}

/**
 * Adiciona ou remove blocos da linha inferior (chão).
 * @param {boolean} fill - Se true, preenche; se false, remove.
 */
