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
const PHASES_MANIFEST_PATH = `${PHASES_BASE_PATH}manifesto-fases.json`;
const PHASE_DISCOVERY_CANDIDATES = [
    'treino.json',
    'fase_teste.json',
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
    { value: 'humano', label: 'Humano' },
    { value: 'cabecao', label: 'Cabeção' },
    { value: 'ninja', label: 'Ninja' }
];
const BOSS_EQUIP_OPTIONS = ['revolver', 'escudo', 'bota', 'jetpack', 'garra', 'cinto', 'colete', 'doze', 'bateria'];
const BOSS_MAX_STAGES = Math.max(1, Number(window.EditorConfig?.BOSS_MAX_STAGES ?? 5));
let chefeRascunhoPosicionamento = null;
let inimigoComplexoRascunhoPosicionamento = null;

const COMPLEX_ENEMY_BASE_OPTIONS = [
    { value: 'inimigo_comum', label: 'Inimigo comum' },
    { value: 'humano', label: 'Humano' },
    { value: 'cabecao', label: 'Cabeção' },
    { value: 'ninja', label: 'Ninja' }
];

const stage = document.getElementById('game-stage');
const stageArea = document.getElementById('stage-area');
const btnExport = document.getElementById('btn-export');
const btnReorderThis = document.getElementById('btn-reorder-this');
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
const spawnHumanoCheck = document.getElementById('spawn-humano');
const humanoFreqSelect = document.getElementById('humano-freq');
const spawnCabecaoCheck = document.getElementById('spawn-cabecao');
const cabecaoFreqSelect = document.getElementById('cabecao-freq');

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

function obterInimigosComplexosLista() {
    if (!Array.isArray(faseData.inimigosComplexos)) {
        faseData.inimigosComplexos = [];
    }
    return faseData.inimigosComplexos;
}

function obterInimigoComplexoPorCoord(coord) {
    return obterInimigosComplexosLista().find(
        (inimigo) => String(inimigo?.coord || '').trim() === String(coord || '').trim()
    ) || null;
}

function removerInimigoComplexoPorCoord(coord) {
    const lista = obterInimigosComplexosLista();
    const tamanhoAntes = lista.length;

    faseData.inimigosComplexos = lista.filter(
        (inimigo) => String(inimigo?.coord || '').trim() !== String(coord || '').trim()
    );

    return faseData.inimigosComplexos.length !== tamanhoAntes;
}

function normalizarInimigoComplexo(inimigo = {}) {
    const basesValidas = COMPLEX_ENEMY_BASE_OPTIONS.map((opcao) => opcao.value);
    const equipamentosValidos = BOSS_EQUIP_OPTIONS;

    const baseNpc = basesValidas.includes(inimigo.baseNpc)
        ? inimigo.baseNpc
        : 'inimigo_comum';

    const equipamentos = Array.isArray(inimigo.equipamentos)
        ? [...new Set(
            inimigo.equipamentos
                .map((equipamento) => String(equipamento || '').trim().toLowerCase())
                .filter((equipamento) => equipamentosValidos.includes(equipamento))
        )]
        : [];

    return {
        id: String(inimigo.id || `inimigo-complexo-${Date.now()}-${Math.floor(Math.random() * 1000)}`),
        coord: String(inimigo.coord || '').trim(),
        baseNpc,
        equipamentos
    };
}

function normalizarEtapasChefe(etapas) {
    const entrada = Array.isArray(etapas) ? etapas : [];
    const normalizadas = entrada.map((etapa) => {
        const validBases = BOSS_BASE_OPTIONS.map(o => o.value);
        const baseNpc = validBases.includes(etapa?.baseNpc) ? etapa.baseNpc : 'inimigo_comum';
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
    let ativaBooleanoAoDerrotar = !!chefeAtual?.ativaBooleanoAoDerrotar;
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
                etapas[idx].baseNpc = selectBase.value;
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

        const wrapBooleanoDerrota = document.createElement('label');
        wrapBooleanoDerrota.style.display = 'flex';
        wrapBooleanoDerrota.style.alignItems = 'center';
        wrapBooleanoDerrota.style.gap = '8px';
        wrapBooleanoDerrota.style.margin = '10px 0';

        const chkBooleanoDerrota = document.createElement('input');
        chkBooleanoDerrota.type = 'checkbox';
        chkBooleanoDerrota.checked = ativaBooleanoAoDerrotar;
        chkBooleanoDerrota.onchange = () => {
            ativaBooleanoAoDerrotar = !!chkBooleanoDerrota.checked;
        };

        const txtBooleanoDerrota = document.createElement('span');
        txtBooleanoDerrota.textContent = 'Ativar booleano ao derrotar este chefe';

        wrapBooleanoDerrota.appendChild(chkBooleanoDerrota);
        wrapBooleanoDerrota.appendChild(txtBooleanoDerrota);
        modal.appendChild(wrapBooleanoDerrota);

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
                etapas: etapasFinal,
                ativaBooleanoAoDerrotar: !!ativaBooleanoAoDerrotar
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

function abrirModalInimigoComplexo(inimigoAtual = null) {
    let overlay = document.getElementById('boss-editor-overlay');

    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'boss-editor-overlay';
        overlay.className = 'boss-editor-overlay';
        document.body.appendChild(overlay);
    }

    const rascunho = normalizarInimigoComplexo(inimigoAtual || {});
    const equipamentos = [...rascunho.equipamentos];

    overlay.innerHTML = '';
    overlay.style.display = 'flex';

    const modal = document.createElement('div');
    modal.className = 'boss-editor-modal';

    const titulo = document.createElement('h3');
    titulo.className = 'boss-editor-title';
    titulo.textContent = inimigoAtual ? 'Editar inimigo complexo' : 'Novo inimigo complexo';
    modal.appendChild(titulo);

    const dica = document.createElement('p');
    dica.className = 'boss-editor-hint';
    dica.textContent = 'Escolha o tipo de inimigo e os equipamentos. Este inimigo não terá transformação.';
    modal.appendChild(dica);

    const seletorBase = document.createElement('select');
    COMPLEX_ENEMY_BASE_OPTIONS.forEach((opcao) => {
        const item = document.createElement('option');
        item.value = opcao.value;
        item.textContent = opcao.label;
        seletorBase.appendChild(item);
    });
    seletorBase.value = rascunho.baseNpc;
    modal.appendChild(seletorBase);

    const grade = document.createElement('div');
    grade.className = 'boss-equip-grid';

    BOSS_EQUIP_OPTIONS.forEach((equipamento) => {
        const label = document.createElement('label');
        const checkbox = document.createElement('input');

        checkbox.type = 'checkbox';
        checkbox.checked = equipamentos.includes(equipamento);
        checkbox.onchange = () => {
            const indice = equipamentos.indexOf(equipamento);

            if (checkbox.checked && indice < 0) {
                equipamentos.push(equipamento);
            } else if (!checkbox.checked && indice >= 0) {
                equipamentos.splice(indice, 1);
            }
        };

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(` ${equipamento}`));
        grade.appendChild(label);
    });

    modal.appendChild(grade);

    const acoes = document.createElement('div');
    acoes.className = 'boss-modal-actions';

    const cancelar = document.createElement('button');
    cancelar.type = 'button';
    cancelar.textContent = 'Cancelar';
    cancelar.onclick = () => {
        overlay.style.display = 'none';
        overlay.innerHTML = '';
    };

    const confirmar = document.createElement('button');
    confirmar.type = 'button';
    confirmar.textContent = 'Confirmar';
    confirmar.onclick = () => {
        const configurado = normalizarInimigoComplexo({
            ...rascunho,
            baseNpc: seletorBase.value,
            equipamentos
        });

        if (inimigoAtual?.coord) {
            configurado.coord = inimigoAtual.coord;
            removerInimigoComplexoPorCoord(inimigoAtual.coord);
            obterInimigosComplexosLista().push(configurado);
            aplicarFaseDataEditor(faseData);
        } else {
            inimigoComplexoRascunhoPosicionamento = configurado;
            alert('Configuração salva. Agora clique no palco para posicionar o inimigo complexo.');
        }

        overlay.style.display = 'none';
        overlay.innerHTML = '';
        atualizarVisual();
    };

    acoes.appendChild(cancelar);
    acoes.appendChild(confirmar);
    modal.appendChild(acoes);
    overlay.appendChild(modal);
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

    // Injeta o novo NPC Humano nas configurações do editor para aparecer na paleta
    if (window.EditorConfig) {
        window.EditorConfig.ENEMY_DEFS = window.EditorConfig.ENEMY_DEFS || [];
        if (!window.EditorConfig.ENEMY_DEFS.find(d => d.type === 'humano')) {
            // Definição do NPC humano para o editor:
            // sprite: imagem usada quando o NPC está parado
            // spriteAndando: imagem usada quando o NPC está andando
            const humanoDef = {
                type: 'humano',
                label: 'Inimigo: Humano',
                stateKey: 'humano',
                sprite: '../../assets/personagem/humano/humano.png', // <-- Caminho correto para sprite parado
                spriteAndando: '../../assets/personagem/humano/humano_andando.png', // <-- Caminho correto para sprite andando
                kind: 'multiple'
            };
            console.log('[EDITOR] Definindo NPC humano:', humanoDef);
            window.EditorConfig.ENEMY_DEFS.push(humanoDef);
            if (!window.EditorConfig.COORD_ARRAY_KEYS?.includes('humano')) {
                window.EditorConfig.COORD_ARRAY_KEYS?.push('humano');
            }
        }
        if (!window.EditorConfig.ENEMY_DEFS.find(d => d.type === 'cabecao')) {
            window.EditorConfig.ENEMY_DEFS.push({
                type: 'cabecao', label: 'Inimigo: Cabeção', stateKey: 'cabecao',
                sprite: '../../assets/personagem/inimigo_bb/inbb_parado.png', kind: 'multiple'
            });
            if (!window.EditorConfig.COORD_ARRAY_KEYS?.includes('cabecao')) window.EditorConfig.COORD_ARRAY_KEYS?.push('cabecao');
        }
        if (!window.EditorConfig.ENEMY_DEFS.find(d => d.type === 'ninja')) {
            window.EditorConfig.ENEMY_DEFS.push({
                type: 'ninja',
                label: 'Inimigo: Ninja',
                stateKey: 'ninja',
                sprite: '../../assets/personagem/ninja/ninja.png',
                spriteAndando: '../../assets/personagem/ninja/ninja_andando.png',
                kind: 'multiple'
            });

            if (!window.EditorConfig.COORD_ARRAY_KEYS?.includes('ninja')) {
                window.EditorConfig.COORD_ARRAY_KEYS?.push('ninja');
            }
        }
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
        spawnHumanoCheck,
        humanoFreqSelect,
        spawnCabecaoCheck,
        cabecaoFreqSelect,
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

            if (tipo === 'inimigo_complexo') {
                inimigoComplexoRascunhoPosicionamento = null;
                abrirModalInimigoComplexo(null);
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
            ,humanoEnabled: document.getElementById('spawn-humano')?.checked || false,
            humanoDiff: parseInt(document.getElementById('humano-freq')?.value || 1)
            ,cabecaoEnabled: document.getElementById('spawn-cabecao')?.checked || false,
            cabecaoDiff: parseInt(document.getElementById('cabecao-freq')?.value || 1),
            ninjaEnabled: document.getElementById('spawn-ninja')?.checked || false,
            ninjaDiff: parseInt(document.getElementById('ninja-freq')?.value || 1)
        }) || {},
        aplicarEstadoUI: (estado) => {
            proportionSelect.value = estado.proporcao;
            spawnRandomCheck.checked = estado.inimigoAleatorio[0] > 0;
            randomDiffSelect.value = estado.inimigoAleatorio[0] || 1;
            randomTypeSelect.value = estado.inimigoAleatorio[1] || 0;
            document.getElementById('random-config-fields').style.opacity = spawnRandomCheck.checked ? '1' : '0.3';
            
            if (spawnHumanoCheck) {
                spawnHumanoCheck.checked = Array.isArray(estado.humanoAleatorio) && estado.humanoAleatorio[0] > 0;
                if (humanoFreqSelect) humanoFreqSelect.value = estado.humanoAleatorio?.[0] || 1;
                document.getElementById('humano-config-fields').style.opacity = spawnHumanoCheck.checked ? '1' : '0.3';
                document.getElementById('humano-config-fields').style.pointerEvents = spawnHumanoCheck.checked ? 'auto' : 'none';
            }
            const cabecaoCheckAtual = document.getElementById('spawn-cabecao');
            if (cabecaoCheckAtual) {
                cabecaoCheckAtual.checked = Array.isArray(estado.cabecaoAleatorio) && estado.cabecaoAleatorio[0] > 0;
                const freqAtual = document.getElementById('cabecao-freq');
                if (freqAtual) freqAtual.value = estado.cabecaoAleatorio?.[0] || 1;
                const fields = document.getElementById('cabecao-config-fields');
                if (fields) { fields.style.opacity = cabecaoCheckAtual.checked ? '1' : '0.3'; fields.style.pointerEvents = cabecaoCheckAtual.checked ? 'auto' : 'none'; }
            }
            const ninjaCheckAtual = document.getElementById('spawn-ninja');
            if (ninjaCheckAtual) {
                ninjaCheckAtual.checked = Array.isArray(estado.ninjaAleatorio) && estado.ninjaAleatorio[0] > 0;
                const freqAtual = document.getElementById('ninja-freq');
                if (freqAtual) freqAtual.value = estado.ninjaAleatorio?.[0] || 1;
                const fields = document.getElementById('ninja-config-fields');
                if (fields) { fields.style.opacity = ninjaCheckAtual.checked ? '1' : '0.3'; fields.style.pointerEvents = ninjaCheckAtual.checked ? 'auto' : 'none'; }
            }

            const bonusCheck = document.getElementById('bonus-active');
            if (bonusCheck) {
                bonusCheck.checked = !!estado.faseBonus;
                if (document.getElementById('bonus-qual')) document.getElementById('bonus-qual').value = estado.qualBonus || 0;
                if (document.getElementById('bonus-nivel')) document.getElementById('bonus-nivel').value = estado.nivelBonus || 'a';
                document.getElementById('bonus-config-fields').style.opacity = bonusCheck.checked ? '1' : '0.3';
                document.getElementById('bonus-config-fields').style.pointerEvents = bonusCheck.checked ? 'auto' : 'none';
            }

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

    if (btnNewPhase) {
        btnNewPhase.onclick = async () => {
            // 1. Escolher nível
            const nivelOpcao = prompt(
                "Em qual nível deseja criar a nova fase?\n\n" +
                "0: Raiz (config/fases/)\n" +
                "1: Nível 1 (config/fases/nivel_1/)\n" +
                "2: Nível 2 (config/fases/nivel_2/)",
                "2"
            );
            if (nivelOpcao === null) return; // Cancelou o prompt
            let prefixo = "";
            if (nivelOpcao === "1") prefixo = "nivel_1/";
            else if (nivelOpcao === "2") prefixo = "nivel_2/";
            else if (nivelOpcao !== "0") { alert("Opção inválida."); return; }

            // 2. Escolher modo de criação
            const modo = prompt(
                "Como deseja criar a nova fase?\n" +
                "1: Criar no fim (padrão)\n" +
                "2: Inserir em posição específica (por número)",
                "1"
            );
            if (modo === null) return;
            if (modo !== "1" && modo !== "2") {
                alert("Opção inválida.");
                return;
            }

            // Usa a lista já carregada; não limpa nem pisca o menu antes da criação.
            const arquivos = uiEditor?.getArquivosFasesDetectados?.() || [];
            let maxNum = 0;
            const numsExistentes = [];
            arquivos.forEach(arq => {
                const pertenceAoNivel = prefixo ? arq.startsWith(prefixo) : !arq.includes('/');
                if (pertenceAoNivel) {
                    const match = arq.match(/fase(\d+)\.json$/i);
                    if (match) {
                        const num = parseInt(match[1]);
                        numsExistentes.push(num);
                        if (num > maxNum) maxNum = num;
                    }
                }
            });

            let novoNome = "";
            let N = null;
            if (modo === "2") {
                // Pergunta o número antes de iniciar qualquer operação assíncrona.
                const limiteFim = maxNum + 1;
                const nStr = prompt(`Informe a posição (1 a ${limiteFim}). Para inserir no fim, use ${limiteFim}:`, "1");
                if (nStr === null) return;
                N = parseInt(nStr);
                if (isNaN(N) || N <= 0 || N > limiteFim) {
                    alert("Número inválido.");
                    return;
                }
            } else {
                N = maxNum + 1;
            }
            novoNome = `${prefixo}fase${N}.json`;

            // Checa se já existe faseN.json
            const existeFaseN = numsExistentes.includes(N);

            // Se modo inserção e já existe, pedir confirmação para shift/renomeação

            if (modo === "2" && existeFaseN) {
                if (!confirm(`A fase ${novoNome} já existe. Deseja inserir aqui e renumerar as fases seguintes?`)) {
                    alert("Operação cancelada.");
                    return;
                }
                // Determina o escopo para o backend
                let scope = '';
                if (prefixo === 'nivel_1/') scope = 'nivel_1';
                else if (prefixo === 'nivel_2/') scope = 'nivel_2';

                // Chama o endpoint de shift/renomeação
                try {
                    const resp = await fetch('/shift-phases', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ scope, N })
                    });
                    const data = await resp.json();
                    if (!data.ok) {
                        atualizarStatusSalvamento({ mensagem: 'Erro ao renumerar fases: ' + (data.error || 'Erro desconhecido.'), tipo: 'error' });
                        return;
                    }
                } catch (e) {
                    atualizarStatusSalvamento({ mensagem: 'Erro ao renumerar fases: ' + e.message, tipo: 'error' });
                    return;
                }
            }

            // A escolha do modo já confirma a criação. Evita abrir outro diálogo
            // depois das operações assíncronas, quando o navegador pode bloqueá-lo.
            aplicarFaseDataEditor(createEmptyFaseData({
                proporcao: "1x1"
            }), { arquivoFaseAtual: novoNome });

            atualizarTamanhoStage();
            if (persistenciaEditor) {
                const resultadoSalvamento = await persistenciaEditor.salvarAutomaticamenteAgora();
                if (!resultadoSalvamento?.saved) {
                    const motivo = resultadoSalvamento?.error?.message ||
                        'O servidor local do editor não confirmou a gravação.';
                    atualizarStatusSalvamento({
                        mensagem: `A fase ${novoNome} não foi gravada em config/fases/${novoNome}: ${motivo}`,
                        tipo: 'error'
                    });
                    return;
                }

                if (uiEditor && uiEditor.detectarExistentes) {
                    await uiEditor.detectarExistentes();
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

    if (btnReorderThis) {
        btnReorderThis.onclick = async () => {
            const arquivoOrigem = String(arquivoFaseAtual || '').replace(/\\/g, '/');

            if (!arquivoOrigem) {
                alert('Carregue uma fase antes de reordená-la.');
                return;
            }

            const partesOrigem = arquivoOrigem.match(
                /^(?:(nivel_\d+)\/)?(fase\d+\.json)$/i
            );

            if (!partesOrigem) {
                alert('O arquivo carregado não tem o formato de uma fase reconhecida.');
                return;
            }

            const pastaNivel = partesOrigem[1] || '';
            const prefixo = pastaNivel ? `${pastaNivel}/` : '';
            const arquivosDetectados = uiEditor?.getArquivosFasesDetectados?.() || [];

            const fasesDoNivel = arquivosDetectados
                .filter((arquivo) => {
                    const caminho = String(arquivo).replace(/\\/g, '/');
                    const pertenceAoNivel = prefixo
                        ? caminho.startsWith(prefixo)
                        : !caminho.includes('/');

                    return pertenceAoNivel && /fase\d+\.json$/i.test(caminho);
                })
                .sort((a, b) => {
                    const numeroA = Number(a.match(/fase(\d+)\.json$/i)?.[1] || 0);
                    const numeroB = Number(b.match(/fase(\d+)\.json$/i)?.[1] || 0);
                    return numeroA - numeroB;
                });

            const indiceAtual = fasesDoNivel.findIndex(
                (arquivo) =>
                    String(arquivo).replace(/\\/g, '/').toLowerCase() ===
                    arquivoOrigem.toLowerCase()
            );

            if (indiceAtual < 0) {
                alert('A fase carregada não está na lista detectada. Atualize a lista e tente novamente.');
                return;
            }

            const ordemAtual = indiceAtual + 1;
            const totalFases = fasesDoNivel.length;

            const resposta = prompt(
                `A fase carregada está na posição ${ordemAtual} de ${totalFases}.\n` +
                `Informe a nova posição, de 1 a ${totalFases}:`,
                String(ordemAtual)
            );

            if (resposta === null) return;

            const novaOrdem = Number(resposta.trim());

            if (!Number.isInteger(novaOrdem) || novaOrdem < 1 || novaOrdem > totalFases) {
                alert(`Digite um número inteiro entre 1 e ${totalFases}.`);
                return;
            }

            const nomeDestino = `${prefixo}fase${novaOrdem}.json`;
            const destinoJaExiste = fasesDoNivel.some(
                (arquivo) =>
                    String(arquivo).replace(/\\/g, '/').toLowerCase() ===
                    nomeDestino.toLowerCase()
            );

            let confirmado = false;

            if (destinoJaExiste && nomeDestino.toLowerCase() !== arquivoOrigem.toLowerCase()) {
                confirmado = confirm(
                    `Já existe ${nomeDestino}.\n\n` +
                    `Se continuar, essa fase e as demais serão renumeradas. Deseja continuar?`
                );

                if (!confirmado) return;
            }

            try {
                if (!persistenciaEditor) {
                    throw new Error('A persistência do editor não foi inicializada.');
                }

                const resultadoSalvar = await persistenciaEditor.salvarAutomaticamenteAgora();

                if (!resultadoSalvar?.saved && resultadoSalvar?.mode !== 'noop') {
                    const motivo = resultadoSalvar?.error?.message ||
                        'O servidor local não confirmou o salvamento.';
                    throw new Error(motivo);
                }

                const respostaServidor = await fetch('/reorder-phase', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        sourceFile: arquivoOrigem,
                        targetPosition: novaOrdem,
                        confirmed: confirmado
                    })
                });

                const dadosServidor = await respostaServidor.json();

                if (!respostaServidor.ok || !dadosServidor.ok) {
                    throw new Error(dadosServidor.error || 'O servidor não conseguiu reordenar as fases.');
                }

                definirArquivoFaseAtual(dadosServidor.fileName);

                if (uiEditor?.detectarExistentes) {
                    await uiEditor.detectarExistentes();
                }

                atualizarStatusSalvamento({
                    mensagem: `Fase reordenada para ${dadosServidor.fileName}.`,
                    tipo: 'success'
                });
            } catch (erro) {
                console.error('[Editor] Erro ao reordenar fase:', erro);

                atualizarStatusSalvamento({
                    mensagem: `Não foi possível reordenar a fase: ${erro.message}`,
                    tipo: 'error'
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

        // Linha 3: Reordenar esta fase e Limpar Tudo
        const row3 = document.createElement('div');
        row3.style.cssText = 'display: flex; gap: 5px;';
        if (btnReorderThis) row3.appendChild(btnReorderThis);
        if (btnClear) row3.appendChild(btnClear);

        group.appendChild(row1);
        group.appendChild(row2);
        group.appendChild(row3);
        parentContainer.appendChild(group);
    }

    uiEditor.configurarControlesDimensoes();
    atualizarTamanhoStage();
    uiEditor.configurarPaletaBlocos();
    uiEditor.configurarPaletaDinamicaItens();

    uiEditor.configurarPaletaGaiola();
    diagnosticarPaletaInimigos();
    uiEditor.configurarStage();
    uiEditor.configurarFerramentasAutomaticas();
    uiEditor.configurarSpawnAleatorio();
    uiEditor.configurarTooltip();
    uiEditor.configurarTeclasGlobais();
    if (btnNewPhase) btnNewPhase.disabled = true;
    await uiEditor.configurarSeletorFases({
        persistencia: persistenciaEditor,
        basePath: PHASES_BASE_PATH,
        manifestPath: PHASES_MANIFEST_PATH,
        arquivosCandidatos: PHASE_DISCOVERY_CANDIDATES,
        aoCarregarFase: (arquivo) => definirArquivoFaseAtual(arquivo)
    });
    if (btnNewPhase) btnNewPhase.disabled = false;

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
    const tipos = ["revolver", "escudo", "bota", "jetpack", "garra", "cinto", "colete", "restauracao", "scrap", "capsula", "doze", "municao_plus", "airdrop_plus", "novelo", "bateria"];
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


let menuBlocosCache = null;

function obterMenuBlocosCache(){
    if (menuBlocosCache) return menuBlocosCache;
    menuBlocosCache = window.__EDITOR_MENU_BLOCOS_CACHE__ || null;
    if (!menuBlocosCache) {
        menuBlocosCache = {
            loaded: false,
            menusByType: {},
        };
    }
    return menuBlocosCache;
}

async function carregarMenuBlocosIndex(){
    const cache = obterMenuBlocosCache();
    if (cache.loaded) return cache;

    // Carrega via loader (já existe no editor)
    let menuDef = null;
    try {
        if (window.EditorMenuBlocosLoader?.carregarMenuBlocosJson) {
            menuDef = await window.EditorMenuBlocosLoader.carregarMenuBlocosJson();
        } else {
            const resp = await fetch('../../tools/editor/menu_blocos.json', { cache: 'no-store' });
            menuDef = resp.ok ? await resp.json() : null;
        }
    } catch (e) {
        console.error('[Editor] Falha ao carregar menu_blocos.json', e);
        menuDef = null;
    }

    const itemsByType = {};
    const menus = menuDef?.paletteBlocks?.menus;
    if (Array.isArray(menus)) {
        menus.forEach(menu => {
            const items = Array.isArray(menu?.cycle?.items) ? menu.cycle.items : [];
            items.forEach(it => {
                if (!it?.type) return;
                itemsByType[it.type] = it;
            });
        });
    }

    cache.menusByType = itemsByType;
    cache.loaded = true;
    window.__EDITOR_MENU_BLOCOS_CACHE__ = cache;
    return cache;
}

function adicionarElemento(coord) {
    if (window.__EDITOR_DEBUG_LEVEL__ === 'full') {
        console.log(`[Editor] adicionarElemento: tipo=${itemSelecionado}, coord=${coord}`);
    }


    const chefeExistenteNoClique = obterChefePorCoord(coord);
    if (chefeExistenteNoClique && itemSelecionado !== 'chefe') {
        abrirModalConfigChefe(chefeExistenteNoClique);
        return;
    }

    const inimigoComplexoExistente = obterInimigoComplexoPorCoord(coord);
    if (inimigoComplexoExistente && itemSelecionado !== 'inimigo_complexo') {
        abrirModalInimigoComplexo(inimigoComplexoExistente);
        return;
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
        obterChefesLista().push({
            id: chefeRascunhoPosicionamento.id || gerarIdChefe(),
            coord,
            etapas: normalizarEtapasChefe(chefeRascunhoPosicionamento.etapas),
            ativaBooleanoAoDerrotar: !!chefeRascunhoPosicionamento.ativaBooleanoAoDerrotar
        });

        chefeRascunhoPosicionamento = null;
        aplicarFaseDataEditor(faseData);
        return;
    }

    if (itemSelecionado === 'inimigo_complexo') {
        const existente = obterInimigoComplexoPorCoord(coord);

        if (existente) {
            abrirModalInimigoComplexo(existente);
            return;
        }

        if (!inimigoComplexoRascunhoPosicionamento) {
            abrirModalInimigoComplexo(null);
            return;
        }

        removerInimigoComplexoPorCoord(coord);
        obterInimigosComplexosLista().push(normalizarInimigoComplexo({
            ...inimigoComplexoRascunhoPosicionamento,
            coord
        }));

        inimigoComplexoRascunhoPosicionamento = null;
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

            const defsMesmoStateKey = (window.EditorConfig?.PLATFORM_DEFS || [])
                .filter((def) => def?.stateKey === definition.stateKey);
            const stateKeyCompartilhado = defsMesmoStateKey.length > 1;

            // Remove existente na mesma coordenada (string ou objeto)
            faseData[definition.stateKey] = (faseData[definition.stateKey] || []).filter((entrada) => {
                const c = typeof entrada === 'string'
                    ? entrada
                    : String(entrada?.coord || entrada?.pos || '').trim();
                return c !== coord;
            });

            if (definition.kind === 'multiple') {
                // Adiciona como objeto { coord } para suportar metadados e compatibilidade
                faseData[definition.stateKey].push({ coord, type: itemSelecionado });
            } else {
                // Para stateKeys compartilhados (ex.: plataformas), guardamos também o type.
                if (stateKeyCompartilhado) {
                    faseData[definition.stateKey].push({ coord, type: itemSelecionado });
                } else {
                    faseData[definition.stateKey].push(coord);
                }
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

    removerInimigoComplexoPorCoord(coord);

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
