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
    normalizeFaseData = (data) => data
} = window.EditorUtils || {};

let COLS = 20; 
let ROWS = 15; 

// Estado da fase
let faseData = createEmptyFaseData();

// Novo: dicionário de definições de itens carregados dos JSONs
let itemDefinitions = {};

let itemSelecionado = 'plataforma';
let gradeVisivel = true;

const stage = document.getElementById('game-stage');
const btnExport = document.getElementById('btn-export');
const btnImport = document.getElementById('btn-import');
const btnClear = document.getElementById('btn-clear');
const output = document.getElementById('json-output');
const proportionSelect = document.getElementById('proportion-select'); // Novo elemento necessário no HTML

// Referências para os novos elementos que serão criados via JS
let fillBottomCheckbox;
let blockTypeSelect;

// Elementos de Configuração
const spawnRandomCheck = document.getElementById('spawn-random');
const randomDiffSelect = document.getElementById('random-diff');
const randomTypeSelect = document.getElementById('random-type');

let tooltipElement;
let renderizadorEditor;
let persistenciaEditor;

function obterLegendaCoord(coord) {
    for (const def of [...PLATFORM_DEFS, ...ENEMY_DEFS]) {
        if ((faseData[def.stateKey] || []).includes(coord)) return def.label;
    }

    for (const def of SYSTEM_DEFS) {
        if (faseData[def.stateKey] === coord) return def.label;
    }

    const item = (faseData.itens || []).find(i => i.pos === coord);
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

    configurarControlesDimensoes();
    atualizarTamanhoStage();
    configurarPaletaDinamicaItens();
    configurarStage();
    configurarFerramentasAutomaticas();

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

    window.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 'g') {
            gradeVisivel = !gradeVisivel;
            document.getElementById('grade-auxiliar').style.display = gradeVisivel ? 'block' : 'none';
        }
    });

    spawnRandomCheck.onchange = (e) => {
        document.getElementById('random-config-fields').style.opacity = e.target.checked ? "1" : "0.3";
        document.getElementById('random-config-fields').style.pointerEvents = e.target.checked ? "auto" : "none";
    };

    tooltipElement = document.createElement('div');
    tooltipElement.id = 'editor-tooltip';
    document.body.appendChild(tooltipElement);

    stage.addEventListener('mousemove', (e) => {
        const rect = stage.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = rect.bottom - e.clientY;
        const coord = pointToCoord(x, y, TILE_SIZE);
        const legenda = obterLegendaCoord(coord);

        if (legenda) {
            tooltipElement.innerText = legenda;
            tooltipElement.style.display = 'block';
            tooltipElement.style.left = (e.clientX + 15) + 'px';
            tooltipElement.style.top = (e.clientY + 15) + 'px';
        } else {
            tooltipElement.style.display = 'none';
        }
    });
    stage.addEventListener('mouseleave', () => tooltipElement.style.display = 'none');
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

// Monta a paleta de itens dinamicamente
function configurarPaletaDinamicaItens() {
    const palette = document.getElementById('palette');
    if (!palette) return;

    // Remove itens antigos
    const oldItens = palette.querySelectorAll('.palette-item[data-type^="item_"]');
    oldItens.forEach(el => el.remove());

    // Adiciona cada item da definição
    const catItens = Array.from(palette.querySelectorAll('.category')).find(cat => {
        const texto = cat.querySelector('h4')?.innerText.trim().toLowerCase();
        return texto === 'itens' || texto === 'items';
    });

    if (catItens) {
        for (const tipo in itemDefinitions) {
            const def = itemDefinitions[tipo];
            const img = document.createElement('img');
            img.src = def.spriteColetavel;
            img.className = 'palette-item';
            img.setAttribute('data-type', 'item_' + def.id);
            img.title = def.nome || def.id;
            catItens.appendChild(img);
        }
    }

    // Reconfigura seleção
    configurarPaleta();
}

function configurarControlesDimensoes() {
    if (!proportionSelect) return;
    
    proportionSelect.onchange = (e) => {
        faseData.proporcao = e.target.value;
        atualizarTamanhoStage();
    };
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

    configurarGrade();
    atualizarVisual();
}

function configurarGrade() {
    renderizadorEditor.configurarGrade(COLS, ROWS, gradeVisivel);
}

function configurarFerramentasAutomaticas() {
    const palette = document.getElementById('palette');
    if (!palette) return;

    const toolsContainer = document.createElement('div');
    toolsContainer.className = 'editor-tools';
    toolsContainer.innerHTML = `
        <strong>Automação</strong>
        <label>
            <input type="checkbox" id="fill-bottom-checkbox"> Preencher Chão (Linha A)
        </label>
        <label>
            Bloco:
            <select id="block-type-select">
                <option value="padrao">Padrão (Grama)</option>
                <option value="neve">Neve</option>
                <option value="terraInferior">Terra Inferior</option>
                <option value="terraSuperior">Terra Superior</option>
            </select>
        </label>
    `;
    palette.appendChild(toolsContainer);

    fillBottomCheckbox = document.getElementById('fill-bottom-checkbox');
    blockTypeSelect = document.getElementById('block-type-select');

    // Sincroniza estado inicial
    fillBottomCheckbox.checked = faseData.plataformas.some(c => c.startsWith('a'));

    fillBottomCheckbox.onchange = (e) => {
        fillBottomLayer(e.target.checked);
        atualizarVisual();
    };
}

function configurarPaleta() {
    const items = document.querySelectorAll('.palette-item');
    items.forEach(item => {
        item.onclick = () => {
            items.forEach(i => i.classList.remove('selected'));
            item.classList.add('selected');
            itemSelecionado = item.getAttribute('data-type');
        };
    });
}

function configurarStage() {
    stage.addEventListener('mousedown', (e) => {
        const rect = stage.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = rect.bottom - e.clientY;

        const coord = pointToCoord(x, y, TILE_SIZE);

        if (e.button === 0) adicionarElemento(coord);
        else if (e.button === 2) removerElemento(coord);
        atualizarVisual();
    });
    stage.oncontextmenu = (e) => e.preventDefault();
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
        faseData.itens.push({ tipo: tipoReal, pos: coord });
    }
}

function removerElemento(coord) {
    COORD_ARRAY_KEYS.forEach((key) => {
        faseData[key] = (faseData[key] || []).filter(c => c !== coord);
    });

    faseData.itens = (faseData.itens || []).filter(i => i.pos !== coord);

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
function fillBottomLayer(fill) {
    const bottomRowCoords = [];
    for (let c = 1; c <= COLS; c++) {
        bottomRowCoords.push('a' + c);
    }

    if (fill) {
        addBlocks(bottomRowCoords);
    } else {
        removeBlocks(bottomRowCoords);
    }
}

function addBlocks(coordsArray) {
    const tipo = blockTypeSelect.value;
    coordsArray.forEach(coord => {
        if (tipo === 'neve') {
            if (!faseData.plataformasNeve.includes(coord)) faseData.plataformasNeve.push(coord);
        } else if (tipo === 'terraInferior') {
            if (!faseData.plataformasTerraInferior.includes(coord)) faseData.plataformasTerraInferior.push(coord);
        } else if (tipo === 'terraSuperior') {
            if (!faseData.plataformasTerraSuperior.includes(coord)) faseData.plataformasTerraSuperior.push(coord);
        } else {
            if (!faseData.plataformas.includes(coord)) faseData.plataformas.push(coord);
        }
    });
}

function removeBlocks(coordsArray) {
    faseData.plataformas = faseData.plataformas.filter(coord => !coordsArray.includes(coord));
    faseData.plataformasNeve = faseData.plataformasNeve.filter(coord => !coordsArray.includes(coord));
    faseData.plataformasTerraInferior = faseData.plataformasTerraInferior.filter(coord => !coordsArray.includes(coord));
    faseData.plataformasTerraSuperior = faseData.plataformasTerraSuperior.filter(coord => !coordsArray.includes(coord));
}

