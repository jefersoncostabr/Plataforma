/**
 * Lógica do Editor de Fases
 */

const TILE_SIZE = 32;
let COLS = 20; 
let ROWS = 15; 

// Estado da fase
let faseData = {
    proporcao: "1x1",
    posicaoInicialJogador: "b2",
    objetivo: "f19",
    plataformas: [],
    plataformasNeve: [],
    plataformasEstacaSup: [],
    plataformasEstacaDir: [],
    plataformasEstacaEsq: [],
    plataformasEstacaBaixo: [],
    inimigos0: [],
    inimigos1: [],
    inimigos2: [],
    inimigos3: [],
    inimigos4: [],
    inimigos5: [],
    inimigos6: [],
    itens: [],
    inimigoAleatorio: [1, 0]
};

let itemSelecionado = 'plataforma';
let gradeVisivel = true;

const stage = document.getElementById('game-stage');
const paletteItems = document.querySelectorAll('.palette-item');
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

// Inicialização
window.onload = () => {
    configurarControlesDimensoes();
    atualizarTamanhoStage();
    configurarPaleta();
    configurarStage();
    configurarFerramentasAutomaticas();

    btnExport.onclick = exportarJSON;
    btnImport.onclick = importarJSON;
    btnClear.onclick = () => {
        if(confirm("Deseja limpar todo o palco?")) {
            faseData.plataformas = [];
            faseData.inimigos0 = [];
            faseData.inimigos1 = [];
            faseData.inimigos2 = [];
            faseData.inimigos3 = [];
            faseData.inimigos4 = [];
            faseData.inimigos5 = [];
            faseData.inimigos6 = [];
            faseData.itens = [];
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
        const col = Math.floor(x / TILE_SIZE) + 1;
        const row = Math.floor(y / TILE_SIZE);
        const coord = String.fromCharCode(97 + row) + col;

        let legenda = "";
        if (faseData.plataformas.includes(coord)) legenda = "Plataforma";
        else if (faseData.inimigos0.includes(coord)) legenda = "Inimigo Melee";
        else if (faseData.inimigos1.includes(coord)) legenda = "Inimigo Atirador";
        else if (faseData.inimigos2.includes(coord)) legenda = "Inimigo Escudado";
        else if (faseData.inimigos3.includes(coord)) legenda = "Inimigo Rápido (Botas)";
        else if (faseData.inimigos4.includes(coord)) legenda = "Inimigo Voador (Jetpack)";
        else if (faseData.inimigos5 && faseData.inimigos5.includes(coord)) legenda = "Alvo de Feno (Treino)";
        else if (faseData.inimigos6 && faseData.inimigos6.includes(coord)) legenda = "Inimigo com Garra";
        else if (faseData.posicaoInicialJogador === coord) legenda = "Ponto Inicial do Jogador";
        else if (faseData.objetivo === coord) legenda = "Objetivo da Fase";
        else {
            const item = (faseData.itens || []).find(i => i.pos === coord);
            if (item) legenda = "Item: " + item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1);
        }

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

    stage.style.width = (COLS * TILE_SIZE) + 'px';
    stage.style.height = (ROWS * TILE_SIZE) + 'px';

    configurarGrade();
    atualizarVisual();
}

function configurarGrade() {
    let grade = document.getElementById('grade-auxiliar');
    if (grade) grade.remove();

    grade = document.createElement('div');
    grade.id = 'grade-auxiliar';
    grade.style.position = 'absolute';
    grade.style.width = '100%';
    grade.style.height = '100%';
    grade.style.pointerEvents = 'none';
    grade.style.zIndex = '100';
    grade.style.backgroundImage = `
        linear-gradient(to right, rgba(0, 255, 0, 0.2) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(0, 255, 0, 0.2) 1px, transparent 1px)
    `;
    grade.style.backgroundSize = '32px 32px';

    for (let r = 0; r < ROWS; r++) {
        for (let c = 1; c <= COLS; c++) {
            const label = document.createElement('span');
            // Suporte para letras duplas se o mapa for muito alto (a, b... z, aa, ab...)
            const letra = r < 26 
                ? String.fromCharCode(97 + r) 
                : String.fromCharCode(97 + Math.floor(r/26) - 1) + String.fromCharCode(97 + (r % 26));
            
            label.textContent = letra + c;
            label.style.position = 'absolute';
            label.style.left = ((c - 1) * TILE_SIZE) + 'px';
            label.style.bottom = (r * TILE_SIZE) + 'px';
            label.style.fontSize = '8px';
            label.style.color = 'rgba(0, 255, 0, 0.3)';
            grade.appendChild(label);
        }
    }
    stage.appendChild(grade);
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
    paletteItems.forEach(item => {
        item.onclick = () => {
            paletteItems.forEach(i => i.classList.remove('selected'));
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

        const col = Math.floor(x / TILE_SIZE) + 1;
        const row = Math.floor(y / TILE_SIZE);
        const coord = String.fromCharCode(97 + row) + col;

        if (e.button === 0) adicionarElemento(coord);
        else if (e.button === 2) removerElemento(coord);
        atualizarVisual();
    });
    stage.oncontextmenu = (e) => e.preventDefault();
}

function adicionarElemento(coord) {
    removerElemento(coord);
    if (itemSelecionado === 'plataforma') faseData.plataformas.push(coord);
    else if (itemSelecionado === 'plataformaNeve') faseData.plataformasNeve.push(coord);
    else if (itemSelecionado === 'estacaSup') faseData.plataformasEstacaSup.push(coord);
    else if (itemSelecionado === 'estacaDir') faseData.plataformasEstacaDir.push(coord);
    else if (itemSelecionado === 'estacaEsq') faseData.plataformasEstacaEsq.push(coord);
    else if (itemSelecionado === 'estacaBaixo') faseData.plataformasEstacaBaixo.push(coord);
    else if (itemSelecionado === 'player') faseData.posicaoInicialJogador = coord;
    else if (itemSelecionado === 'objetivo') faseData.objetivo = coord;
    else if (itemSelecionado.startsWith('inimigos')) {
        const tipo = itemSelecionado;
        if (!faseData[tipo]) faseData[tipo] = [];
        faseData[tipo].push(coord);
    } else if (itemSelecionado.startsWith('item_')) {
        const tipoReal = itemSelecionado.replace('item_', '');
        faseData.itens.push({ tipo: tipoReal, pos: coord });
    }
}

function removerElemento(coord) {
    faseData.plataformas = faseData.plataformas.filter(c => c !== coord);
    faseData.plataformasNeve = (faseData.plataformasNeve || []).filter(c => c !== coord);
    faseData.plataformasEstacaSup = (faseData.plataformasEstacaSup || []).filter(c => c !== coord);
    faseData.plataformasEstacaDir = (faseData.plataformasEstacaDir || []).filter(c => c !== coord);
    faseData.plataformasEstacaEsq = (faseData.plataformasEstacaEsq || []).filter(c => c !== coord);
    faseData.plataformasEstacaBaixo = (faseData.plataformasEstacaBaixo || []).filter(c => c !== coord);
    const tiposInimigos = ['inimigos0', 'inimigos1', 'inimigos2', 'inimigos3', 'inimigos4', 'inimigos5', 'inimigos6'];
    tiposInimigos.forEach(tipo => {
        if (faseData[tipo]) faseData[tipo] = faseData[tipo].filter(c => c !== coord);
    });
    faseData.itens = faseData.itens.filter(i => i.pos !== coord);
    if (faseData.posicaoInicialJogador === coord) faseData.posicaoInicialJogador = ''; // Limpa se for o jogador
}

function atualizarVisual() {
    const elementos = stage.querySelectorAll('img');
    elementos.forEach(el => el.remove());

    faseData.plataformas.forEach(coord => criarIcone(coord, '../personagem/chao.png', ''));
    (faseData.plataformasNeve || []).forEach(coord => criarIcone(coord, '../personagem/chao_neve.png', ''));
    (faseData.plataformasEstacaSup || []).forEach(coord => criarIcone(coord, '../personagem/estacasup.png', ''));
    (faseData.plataformasEstacaDir || []).forEach(coord => criarIcone(coord, '../personagem/estacadir.png', ''));
    (faseData.plataformasEstacaEsq || []).forEach(coord => criarIcone(coord, '../personagem/estacaesq.png', ''));
    (faseData.plataformasEstacaBaixo || []).forEach(coord => criarIcone(coord, '../personagem/estacasdown.png', ''));
    (faseData.inimigos0 || []).forEach(coord => criarIcone(coord, '../personagem/Personagem_parado.png', 'enemy-marker'));
    (faseData.inimigos1 || []).forEach(coord => criarIcone(coord, '../personagem/revolver_pegavel.png', 'enemy-marker'));
    (faseData.inimigos2 || []).forEach(coord => criarIcone(coord, '../personagem/escudo_pegavel.png', 'enemy-marker'));
    (faseData.inimigos3 || []).forEach(coord => criarIcone(coord, '../personagem/bota_pegavel.png', 'enemy-marker'));
    (faseData.inimigos4 || []).forEach(coord => criarIcone(coord, '../personagem/jetpack_pegavel.png', 'enemy-marker'));
    (faseData.inimigos5 || []).forEach(coord => criarIcone(coord, '../personagem/alvoFeno.png', 'enemy-marker'));
    (faseData.inimigos6 || []).forEach(coord => criarIcone(coord, '../personagem/garra_coletavel.png', 'enemy-marker'));

    faseData.itens.forEach(item => {
        let src = '../personagem/revolver_pegavel.png';
        if (item.tipo === 'escudo') src = '../personagem/escudo_pegavel.png';
        else if (item.tipo === 'bota') src = '../personagem/bota_pegavel.png';
        else if (item.tipo === 'jetpack') src = '../personagem/jetpack_pegavel.png';
        else if (item.tipo === 'garra') src = '../personagem/garra_coletavel.png';
        else if (item.tipo === 'restauracao') src = '../personagem/restauracao.png';
        criarIcone(item.pos, src, '');
    });
    
    if (faseData.posicaoInicialJogador) {
        criarIcone(faseData.posicaoInicialJogador, '../personagem/Personagem_parado.png', 'player-filter');
    }
    criarIcone(faseData.objetivo, '../personagem/objetivo.png');
}

function criarIcone(coord, src, classe = '') {
    // Ajuste para ler coordenadas de 1 ou 2 letras (ex: "a1" ou "aa1")
    const match = coord.match(/^([a-z]+)(\d+)$/);
    if (!match) return;
    
    const letras = match[1];
    const numero = parseInt(match[2]);
    
    const col = numero - 1;
    let row = 0;
    if (letras.length === 1) {
        row = letras.charCodeAt(0) - 'a'.charCodeAt(0);
    } else {
        row = (letras.charCodeAt(0) - 'a'.charCodeAt(0) + 1) * 26 + (letras.charCodeAt(1) - 'a'.charCodeAt(0));
    }

    let yPos = row * 32;
    // Ajuste de 2px para compensar o desenho da estaca e alinhar com o teto/blocos
    if (src.includes('estacasup.png')) yPos += 2;

    const img = document.createElement('img');
    img.src = src;
    if (classe) img.classList.add(classe);
    img.style = `position:absolute; left:${col*32}px; bottom:${yPos}px; width:32px; height:32px; image-rendering:pixelated; pointer-events:none;`;
    if (classe === 'player-filter') img.style.filter = 'hue-rotate(90deg)';
    stage.appendChild(img);
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
        } else {
            if (!faseData.plataformas.includes(coord)) faseData.plataformas.push(coord);
        }
    });
}

function removeBlocks(coordsArray) {
    faseData.plataformas = faseData.plataformas.filter(coord => !coordsArray.includes(coord));
    faseData.plataformasNeve = faseData.plataformasNeve.filter(coord => !coordsArray.includes(coord));
}

function exportarJSON() {
    // Sincroniza as configurações de spawn aleatório da interface antes de exportar
    const enabled = document.getElementById('spawn-random').checked;
    const diff = parseInt(document.getElementById('random-diff').value);
    const type = parseInt(document.getElementById('random-type').value);
    
    faseData.inimigoAleatorio = enabled ? [diff, type] : [0, 0];

    // Ordena as plataformas: primeiro pela letra (linha) e depois pelo número (coluna)
    faseData.plataformas.sort((a, b) => {
        if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
        return parseInt(a.substring(1)) - parseInt(b.substring(1));
    });
    faseData.plataformasNeve.sort((a, b) => {
        if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
        return parseInt(a.substring(1)) - parseInt(b.substring(1));
    });
    faseData.plataformasEstacaSup.sort((a, b) => {
        if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
        return parseInt(a.substring(1)) - parseInt(b.substring(1));
    });
    faseData.plataformasEstacaDir.sort((a, b) => {
        if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
        return parseInt(a.substring(1)) - parseInt(b.substring(1));
    });
    faseData.plataformasEstacaEsq.sort((a, b) => {
        if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
        return parseInt(a.substring(1)) - parseInt(b.substring(1));
    });
    faseData.plataformasEstacaBaixo.sort((a, b) => {
        if (a[0] !== b[0]) return a[0].localeCompare(b[0]);
        return parseInt(a.substring(1)) - parseInt(b.substring(1));
    });

    // Gera o JSON base com indentação de 4 espaços
    let jsonStr = JSON.stringify(faseData, null, 4);

    // 1. Compacta listas de inimigos e configuração aleatória em uma única linha
    jsonStr = jsonStr.replace(/"(inimigos\d|inimigoAleatorio)":\s*\[\s*([\s\S]*?)\s*\]/g, (match, key, content) => {
        const condensed = content.split('\n')
            .map(l => l.trim().replace(/,$/, '')) // Remove a vírgula do final da linha se ela existir
            .filter(l => l !== "")
            .join(', ');
        return `"${key}": [${condensed}]`;
    });

    // 2. Agrupa plataformas (Comum e Neve) com a mesma letra na mesma linha do JSON
    const formatarPlataformas = (match, key, content) => {
        const items = content.split('\n').map(l => l.trim()).filter(l => l !== "").map(v => v.replace(/,/g, ''));
        if (items.length === 0) return `"${key}": []`;

        const rows = [];
        let currentLine = [];
        let lastLetter = "";

        items.forEach(item => {
            const val = item.trim();
            const letterMatch = val.match(/"([a-z]+)\d+"/);
            const letter = letterMatch ? letterMatch[1] : "";

            if (lastLetter && letter !== lastLetter) {
                rows.push("        " + currentLine.join(", "));
                currentLine = [];
            }
            currentLine.push(val);
            lastLetter = letter;
        });
        if (currentLine.length > 0) rows.push("        " + currentLine.join(", "));
        return `"${key}": [\n${rows.join(",\n")}\n    ]`;
    };

    jsonStr = jsonStr.replace(/"(plataformas)":\s*\[\s*([\s\S]*?)\s*\]/g, (m, k, c) => formatarPlataformas(m, k, c));
    jsonStr = jsonStr.replace(/"(plataformasNeve)":\s*\[\s*([\s\S]*?)\s*\]/g, (m, k, c) => formatarPlataformas(m, k, c));
    jsonStr = jsonStr.replace(/"(plataformasEstacaSup)":\s*\[\s*([\s\S]*?)\s*\]/g, (m, k, c) => formatarPlataformas(m, k, c));
    jsonStr = jsonStr.replace(/"(plataformasEstacaDir)":\s*\[\s*([\s\S]*?)\s*\]/g, (m, k, c) => formatarPlataformas(m, k, c));
    jsonStr = jsonStr.replace(/"(plataformasEstacaEsq)":\s*\[\s*([\s\S]*?)\s*\]/g, (m, k, c) => formatarPlataformas(m, k, c));
    jsonStr = jsonStr.replace(/"(plataformasEstacaBaixo)":\s*\[\s*([\s\S]*?)\s*\]/g, (m, k, c) => formatarPlataformas(m, k, c));

    output.value = jsonStr;
    output.select();
    document.execCommand('copy');
    alert("JSON copiado!");
}

function importarJSON() {
    const jsonStr = output.value.trim();
    if (!jsonStr) return;

    try {
        const data = JSON.parse(jsonStr);

        // Atualiza o objeto de estado com os dados importados
        faseData = {
            proporcao: data.proporcao || "1x1",
            posicaoInicialJogador: data.posicaoInicialJogador || "",
            objetivo: data.objetivo || "",
            plataformas: data.plataformas || [],
            plataformasNeve: data.plataformasNeve || [],
            plataformasEstacaSup: data.plataformasEstacaSup || [],
            plataformasEstacaDir: data.plataformasEstacaDir || [],
            plataformasEstacaEsq: data.plataformasEstacaEsq || [],
            plataformasEstacaBaixo: data.plataformasEstacaBaixo || [],
            inimigos0: data.inimigos0 || [],
            inimigos1: data.inimigos1 || [],
            inimigos2: data.inimigos2 || [],
            inimigos3: data.inimigos3 || [],
            inimigos4: data.inimigos4 || [],
            inimigos5: data.inimigos5 || [],
            inimigos6: data.inimigos6 || [],
            itens: data.itens || [],
            inimigoAleatorio: data.inimigoAleatorio || [1, 0]
        };

        // Sincroniza os controles da interface
        proportionSelect.value = faseData.proporcao;
        spawnRandomCheck.checked = faseData.inimigoAleatorio[0] > 0;
        randomDiffSelect.value = faseData.inimigoAleatorio[0] || 1;
        randomTypeSelect.value = faseData.inimigoAleatorio[1] || 0;
        document.getElementById('random-config-fields').style.opacity = spawnRandomCheck.checked ? "1" : "0.3";

        // Reconstrói o palco
        atualizarTamanhoStage();
        alert("Fase carregada com sucesso!");
    } catch (e) {
        alert("Erro ao importar JSON: Verifique se o código está correto.\n" + e.message);
    }
}