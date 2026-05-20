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
    iterarItensData = () => [],
    obterCoordEntrada
} = window.EditorUtils || {};
const createEmptyFaseData = window.EditorConfig?.createEmptyFaseData || (() => ({}));

let COLS = 20; 
let ROWS = 15; 
// LOCALIZAÇÃO: Define o diretório base para leitura e gravação das fases (relativo ao editor.html)
const PHASES_BASE_PATH = '../../config/fases/';
const PHASES_MANIFEST_PATH = `${PHASES_BASE_PATH}index.json`;
const PHASE_DISCOVERY_CANDIDATES = [
    'treino.json',
    ...Array.from({ length: 50 }, (_, i) => `nivel_1/fase${i + 1}.json`),
    ...Array.from({ length: 50 }, (_, i) => `nivel_2/fase${i + 1}.json`)
];

// Estado da fase
let faseData = window.EditorConfig?.createEmptyFaseData() || {};

// Novo: dicionário de definições de itens carregados dos JSONs
let itemDefinitions = {};

let itemSelecionado = 'plataforma';
let gradeVisivel = true;
const BOSS_BASE_OPTIONS = [
    { value: 'inimigo_comum', label: 'Inimigo comum' },
    { value: 'inimigo_bb', label: 'BB' }
];
const BOSS_EQUIP_OPTIONS = ['revolver', 'escudo', 'bota', 'jetpack', 'garra', 'cinto', 'colete', 'doze', 'bateria'];
const BOSS_MAX_STAGES = Math.max(1, Number(window.EditorConfig?.BOSS_MAX_STAGES ?? 5));
let chefeRascunhoPosicionamento = null;

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

function diagnosticarPaletaInimigos() {
    const defs = window.EditorConfig?.ENEMY_DEFS || [];
    const categoriaInimigos = Array.from(document.querySelectorAll('#palette .category')).find((cat) => {
        const titulo = (cat.querySelector('h4')?.innerText || '').trim().toLowerCase();
        return titulo === 'inimigos' || titulo === 'inimigo' || titulo === 'enemies';
    });

    if (!categoriaInimigos) {
        console.error('[Editor][Diagnostico] Categoria de inimigos nao encontrada na paleta.');
        return;
    }

    const tiposNoDOM = Array.from(categoriaInimigos.querySelectorAll('.palette-item[data-type]'))
        .map((el) => el.getAttribute('data-type'))
        .filter(Boolean);
    const tiposEsperados = defs.map((def) => def.type);
    const faltandoNoDOM = tiposEsperados.filter((tipo) => !tiposNoDOM.includes(tipo));
    const extrasNoDOM = tiposNoDOM.filter((tipo) => !tiposEsperados.includes(tipo));
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

function obterChefesLista() {
    if (!Array.isArray(faseData.chefes)) faseData.chefes = [];
    return faseData.chefes;
}

function obterChefePorCoord(coord) {
    return obterChefesLista().find((chefe) => String(chefe?.coord || '').trim() === String(coord || '').trim()) || null;
}

function removerChefePorCoord(coord) {
    if (!Array.isArray(faseData.chefes) || faseData.chefes.length === 0) return false;
    const antes = faseData.chefes.length;
    faseData.chefes = faseData.chefes.filter((chefe) => String(chefe?.coord || '').trim() !== String(coord || '').trim());
    return faseData.chefes.length !== antes;
}

function normalizarEtapasChefe(etapas) {
    const entrada = Array.isArray(etapas) ? etapas : [];
    const normalizadas = entrada.map((etapa) => {
        const baseNpc = String(etapa?.baseNpc || '').trim().toLowerCase() === 'inimigo_bb' ? 'inimigo_bb' : 'inimigo_comum';
        const equipamentos = Array.isArray(etapa?.equipamentos)
            ? [...new Set(etapa.equipamentos.map((e) => String(e || '').trim().toLowerCase()).filter((e) => BOSS_EQUIP_OPTIONS.includes(e)))]
            : [];
        return { baseNpc, equipamentos };
    }).slice(0, BOSS_MAX_STAGES);

    if (normalizadas.length === 0) {
        normalizadas.push({ baseNpc: 'inimigo_comum', equipamentos: [] });
    }

    return normalizadas;
}

function gerarIdChefe() {
    return `chefe-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function abrirModalConfigChefe(chefeAtual = null) {
    let overlay = document.getElementById('boss-editor-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'boss-editor-overlay';
        overlay.className = 'boss-editor-overlay';
        document.body.appendChild(overlay);
    }

    const titulo = chefeAtual ? 'Editar chefe' : 'Novo chefe';
    const etapasIniciais = normalizarEtapasChefe(chefeAtual?.etapas || [{ baseNpc: 'inimigo_comum', equipamentos: [] }]);
    let etapas = etapasIniciais.map((e) => ({ ...e, equipamentos: [...e.equipamentos] }));

    const render = () => {
        overlay.innerHTML = '';
        overlay.style.display = 'flex';

        const modal = document.createElement('div');
        modal.className = 'boss-editor-modal';

        const h = document.createElement('h3');
        h.className = 'boss-editor-title';
        h.textContent = `${titulo} (1 a ${BOSS_MAX_STAGES} etapas)`;
        modal.appendChild(h);

        const hint = document.createElement('p');
        hint.className = 'boss-editor-hint';
        hint.textContent = 'Cada etapa define NPC base e equipamentos. Depois clique no palco para posicionar a estrela do chefe.';
        modal.appendChild(hint);

        const lista = document.createElement('div');
        lista.className = 'boss-stage-list';

        etapas.forEach((etapa, idx) => {
            const row = document.createElement('div');
            row.className = 'boss-stage-row';

            const top = document.createElement('div');
            top.className = 'boss-stage-row-top';

            const label = document.createElement('div');
            label.className = 'boss-stage-label';
            label.textContent = `Etapa ${idx + 1}`;

            const actions = document.createElement('div');
            actions.className = 'boss-stage-actions';

            const selectBase = document.createElement('select');
            BOSS_BASE_OPTIONS.forEach((op) => {
                const opt = document.createElement('option');
                opt.value = op.value;
                opt.textContent = op.label;
                selectBase.appendChild(opt);
            });
            selectBase.value = etapa.baseNpc;
            selectBase.onchange = () => {
                etapas[idx].baseNpc = selectBase.value === 'inimigo_bb' ? 'inimigo_bb' : 'inimigo_comum';
            };

            const btnRemover = document.createElement('button');
            btnRemover.type = 'button';
            btnRemover.style.background = '#7a2424';
            btnRemover.textContent = 'Remover';
            btnRemover.disabled = etapas.length <= 1;
            btnRemover.onclick = () => {
                if (etapas.length <= 1) return;
                etapas.splice(idx, 1);
                render();
            };

            actions.appendChild(selectBase);
            actions.appendChild(btnRemover);
            top.appendChild(label);
            top.appendChild(actions);
            row.appendChild(top);

            const equipGrid = document.createElement('div');
            equipGrid.className = 'boss-equip-grid';
            BOSS_EQUIP_OPTIONS.forEach((equip) => {
                const id = `boss-equip-${idx}-${equip}`;
                const wrap = document.createElement('label');
                const chk = document.createElement('input');
                chk.type = 'checkbox';
                chk.id = id;
                chk.checked = etapa.equipamentos.includes(equip);
                chk.onchange = () => {
                    if (chk.checked) {
                        if (!etapas[idx].equipamentos.includes(equip)) etapas[idx].equipamentos.push(equip);
                    } else {
                        etapas[idx].equipamentos = etapas[idx].equipamentos.filter((e) => e !== equip);
                    }
                };
                wrap.appendChild(chk);
                wrap.appendChild(document.createTextNode(` ${equip}`));
                equipGrid.appendChild(wrap);
            });

            row.appendChild(equipGrid);
            lista.appendChild(row);
        });

        modal.appendChild(lista);

        const actions = document.createElement('div');
        actions.className = 'boss-modal-actions';

        const left = document.createElement('div');
        left.style.display = 'flex';
        left.style.gap = '8px';

        const btnAddEtapa = document.createElement('button');
        btnAddEtapa.type = 'button';
        btnAddEtapa.style.background = '#0d6efd';
        btnAddEtapa.textContent = 'Adicionar etapa';
        btnAddEtapa.disabled = etapas.length >= BOSS_MAX_STAGES;
        btnAddEtapa.onclick = () => {
            if (etapas.length >= BOSS_MAX_STAGES) return;
            etapas.push({ baseNpc: 'inimigo_comum', equipamentos: [] });
            render();
        };
        left.appendChild(btnAddEtapa);
        actions.appendChild(left);

        const right = document.createElement('div');
        right.style.display = 'flex';
        right.style.gap = '8px';

        const btnCancelar = document.createElement('button');
        btnCancelar.type = 'button';
        btnCancelar.style.background = '#555';
        btnCancelar.textContent = 'Cancelar';
        btnCancelar.onclick = () => {
            overlay.style.display = 'none';
            overlay.innerHTML = '';
        };

        const btnConfirmar = document.createElement('button');
        btnConfirmar.type = 'button';
        btnConfirmar.style.background = '#198754';
        btnConfirmar.textContent = 'Confirmar';
        btnConfirmar.onclick = () => {
            const etapasFinal = normalizarEtapasChefe(etapas);
            const chefeBase = {
                id: chefeAtual?.id || gerarIdChefe(),
                coord: String(chefeAtual?.coord || '').trim(),
                etapas: etapasFinal
            };

            if (chefeAtual?.coord) {
                removerChefePorCoord(chefeAtual.coord);
                obterChefesLista().push(chefeBase);
                aplicarFaseDataEditor(faseData);
            } else {
                chefeRascunhoPosicionamento = chefeBase;
                alert('Configuração salva. Agora clique no palco para posicionar o chefe.');
            }

            overlay.style.display = 'none';
            overlay.innerHTML = '';
            atualizarVisual();
        };

        right.appendChild(btnCancelar);
        right.appendChild(btnConfirmar);
        actions.appendChild(right);

        modal.appendChild(actions);
        overlay.appendChild(modal);
    };

    render();
}

function obterLegendaCoord(coord) {
    const PLATFORM_DEFS = window.EditorConfig?.PLATFORM_DEFS || [];
    const ENEMY_DEFS = window.EditorConfig?.ENEMY_DEFS || [];
    const SYSTEM_DEFS = window.EditorConfig?.SYSTEM_DEFS || [];

    const extrairCoord = (entrada) => {
        if (typeof obterCoordEntrada === 'function') return obterCoordEntrada(entrada);
        if (typeof entrada === 'string') return entrada;
        return String(entrada?.coord || entrada?.pos || '').trim();
    };

    for (const def of [...PLATFORM_DEFS, ...ENEMY_DEFS]) {
        const entrada = (faseData[def.stateKey] || []).find((item) => extrairCoord(item) === coord);
        if (!entrada) continue;

        if (typeof entrada === 'object' && Array.isArray(entrada.skills) && entrada.skills.length > 0) {
            return `${def.label} [${entrada.skills.join(', ')}]`;
        }

        return def.label;
    }

    const chefe = obterChefePorCoord(coord);
    if (chefe) {
        return `Chefe (${Array.isArray(chefe.etapas) ? chefe.etapas.length : 0} etapas)`;
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
    if (window.__EDITOR_DEBUG_LEVEL__ === 'full') {
        console.log("Configurações detectadas:", { 
            TileSize: TILE_SIZE,
            HasConfig: !!window.EditorConfig,
            SystemCount: window.EditorConfig?.SYSTEM_DEFS?.length,
            PaletaID: !!document.getElementById('palette'),
            StageID: !!document.getElementById('game-stage')
        });
    }

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
        onSelecionarItem: (tipo) => {
            if (tipo === 'chefe') {
                chefeRascunhoPosicionamento = null;
                abrirModalConfigChefe(null);
            }
        },
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
            const nivelOpcao = prompt(
                "Em qual nível deseja criar a nova fase?\n\n" +
                "0: Raiz (config/fases/)\n" +
                "1: Nível 1 (config/fases/nivel_1/)\n" +
                "2: Nível 2 (config/fases/nivel_2/)",
                "2"
            );

            if (nivelOpcao === null) return; // Cancelou o prompt

            // LOCALIZAÇÃO: Define o prefixo (subpasta) com base na escolha de nível no prompt
            let prefixo = "";
            if (nivelOpcao === "1") prefixo = "nivel_1/";
            else if (nivelOpcao === "2") prefixo = "nivel_2/";
            else if (nivelOpcao !== "0") { alert("Opção inválida."); return; }

            // Detecta arquivos existentes para calcular o próximo número NO NÍVEL ESCOLHIDO
            const arquivos = await uiEditor.detectarExistentes();
            let maxNum = 0;

            arquivos.forEach(arq => {
                // Verifica se o arquivo pertence ao nível selecionado para reiniciar a contagem
                const pertenceAoNivel = prefixo ? arq.startsWith(prefixo) : !arq.includes('/');
                if (pertenceAoNivel) {
                    const match = arq.match(/fase(\d+)\.json$/i);
                    if (match) {
                        const num = parseInt(match[1]);
                        if (num > maxNum) maxNum = num;
                    }
                }
            });

            // LOCALIZAÇÃO: Define o nome final do arquivo que será enviado ao servidor para gravação física
            const novoNome = `${prefixo}fase${maxNum + 1}.json`;
            console.log(`[Editor] Gerando nova fase: ${novoNome} (Baseado em ${maxNum} arquivos existentes no nível selecionado)`);
            console.log(`[Editor] DEBUG: Prefixo: "${prefixo}", Novo Nome Calculado: "${novoNome}"`);

            if (confirm(`Deseja criar a "${novoNome}" do zero?`)) {
                aplicarFaseDataEditor(createEmptyFaseData({
                    proporcao: "1x1"
                }), { arquivoFaseAtual: novoNome });

                atualizarTamanhoStage();
                console.log(`[Editor] DEBUG: Chamando salvarAutomaticamenteAgora com arquivoFaseAtual: "${novoNome}"`);
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

    // --- Organização dos botões para economia de espaço (3 linhas) ---
    const parentContainer = btnNewPhase?.parentElement;
    if (parentContainer) {
        const group = document.createElement('div');
        group.id = 'editor-controls-reorganized';
        group.style.cssText = 'display: flex; flex-direction: column; gap: 5px; margin-top: 10px;';

        // Linha 1: Nova Fase e Salvar Fase
        const row1 = document.createElement('div');
        row1.style.cssText = 'display: flex; gap: 5px;';
        if (btnNewPhase) row1.appendChild(btnNewPhase);
        if (btnSavePhase) row1.appendChild(btnSavePhase);

        // Linha 2: Importar JSON e Exportar JSON
        const row2 = document.createElement('div');
        row2.style.cssText = 'display: flex; gap: 5px;';
        if (btnImport) row2.appendChild(btnImport);
        if (btnExport) row2.appendChild(btnExport);

        // Linha 3: Vincular Arquivo e Limpar Tudo
        const row3 = document.createElement('div');
        row3.style.cssText = 'display: flex; gap: 5px;';
        if (btnLinkSave) row3.appendChild(btnLinkSave);
        if (btnClear) row3.appendChild(btnClear);

        group.appendChild(row1);
        group.appendChild(row2);
        group.appendChild(row3);
        parentContainer.appendChild(group);
    }

    uiEditor.configurarControlesDimensoes();
    atualizarTamanhoStage();
    uiEditor.configurarPaletaDinamicaItens();
    uiEditor.configurarPaletaGaiola();
    diagnosticarPaletaInimigos();
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
    const tipos = ["revolver", "escudo", "bota", "jetpack", "garra", "cinto", "colete", "restauracao", "scrap", "capsula", "doze", "municao_plus", "novelo", "bateria"];
    for (const tipo of tipos) {
        try {
            const resp = await fetch(`../../config/items/${tipo}.json`);
            if (resp.ok) {
                const data = await resp.json();
                itemDefinitions[data.id] = data;
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

    if (itemSelecionado === 'chefe') {
        const chefeExistente = obterChefePorCoord(coord);
        if (chefeExistente) {
            abrirModalConfigChefe(chefeExistente);
            return;
        }

        if (!chefeRascunhoPosicionamento) {
            abrirModalConfigChefe(null);
            return;
        }

        removerChefePorCoord(coord);
        const chefeFinal = {
            id: chefeRascunhoPosicionamento.id || gerarIdChefe(),
            coord,
            etapas: normalizarEtapasChefe(chefeRascunhoPosicionamento.etapas)
        };
        obterChefesLista().push(chefeFinal);
        chefeRascunhoPosicionamento = null;
        aplicarFaseDataEditor(faseData);
        return;
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

            // Remove existente na mesma coordenada (string ou objeto)
            faseData[definition.stateKey] = (faseData[definition.stateKey] || []).filter((entrada) => {
                const c = typeof entrada === 'string'
                    ? entrada
                    : String(entrada?.coord || entrada?.pos || '').trim();
                return c !== coord;
            });

            if (definition.type === 'inimigo_bb') {
                faseData[definition.stateKey].push({ coord, skills: ['Dash', 'SuperSalto'] });
            } else {
                faseData[definition.stateKey].push(coord);
            }

            faseData[definition.stateKey] = (faseData[definition.stateKey] || []).sort((a, b) => {
                const ca = typeof a === 'string' ? a : String(a?.coord || a?.pos || '').trim();
                const cb = typeof b === 'string' ? b : String(b?.coord || b?.pos || '').trim();
                return sortCoords(ca, cb);
            });
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
        faseData[key] = (faseData[key] || []).filter((entrada) => {
            const c = typeof entrada === 'string'
                ? entrada
                : String(entrada?.coord || entrada?.pos || '').trim();
            return c !== coord;
        });
    });

    removerChefePorCoord(coord);

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
