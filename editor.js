/**
 * Lógica do Editor de Fases
 */

const TILE_SIZE = 32;
const COLS = 20; // 640 / 32
const ROWS = 15; // 480 / 32

// Estado da fase
let faseData = {
    posicaoInicialJogador: "b2",
    objetivo: "f19",
    plataformas: [],
    inimigos0: [],
    inimigos1: [],
    inimigos2: [], // Adicionado para inimigos com escudo
    inimigos3: [], // Adicionado para inimigos com botas
    inimigos4: [], // Adicionado para inimigos com jetpack
    itens: [],
    inimigoAleatorio: [1, 0]
};

let itemSelecionado = 'plataforma';
let gradeVisivel = true;

const stage = document.getElementById('game-stage');
const paletteItems = document.querySelectorAll('.palette-item');
const btnExport = document.getElementById('btn-export');
const btnClear = document.getElementById('btn-clear');
const output = document.getElementById('json-output');

// Elementos de Configuração
const spawnRandomCheck = document.getElementById('spawn-random');
const randomDiffSelect = document.getElementById('random-diff');
const randomTypeSelect = document.getElementById('random-type');

let tooltipElement;

// Inicialização
window.onload = () => {
    configurarGrade();
    configurarPaleta();
    configurarStage();
    
    btnExport.onclick = exportarJSON;
    btnClear.onclick = () => {
        if(confirm("Deseja limpar todo o palco?")) {
            faseData.plataformas = [];
            faseData.inimigos0 = [];
            faseData.inimigos1 = [];
            faseData.inimigos2 = [];
            faseData.inimigos3 = [];
            faseData.inimigos4 = [];
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

    // Listeners para configurações
    spawnRandomCheck.onchange = (e) => {
        document.getElementById('random-config-fields').style.opacity = e.target.checked ? "1" : "0.3";
        document.getElementById('random-config-fields').style.pointerEvents = e.target.checked ? "auto" : "none";
    };

    // Criar elemento de tooltip
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

function configurarGrade() {
    const grade = document.createElement('div');
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
            const letra = String.fromCharCode(97 + r);
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
        const y = rect.bottom - e.clientY; // Inverte Y para o sistema 'bottom'

        const col = Math.floor(x / TILE_SIZE) + 1;
        const row = Math.floor(y / TILE_SIZE);
        const coord = String.fromCharCode(97 + row) + col;

        if (e.button === 0) { // Clique esquerdo: Adicionar
            adicionarElemento(coord);
        } else if (e.button === 2) { // Clique direito: Remover
            removerElemento(coord);
        }
        atualizarVisual();
    });

    // Previne menu de contexto
    stage.oncontextmenu = (e) => e.preventDefault();
}

function adicionarElemento(coord) {
    removerElemento(coord); // Limpa o que tinha antes na mesma célula

    if (itemSelecionado === 'plataforma') {
        faseData.plataformas.push(coord);
    } else if (itemSelecionado === 'player') {
        faseData.posicaoInicialJogador = coord;
    } else if (itemSelecionado === 'objetivo') {
        faseData.objetivo = coord;
    } else if (itemSelecionado.startsWith('inimigos')) { // Corrigido para plural
        const tipo = itemSelecionado;
        if (!faseData[tipo]) faseData[tipo] = []; // Garante que o array exista
        faseData[tipo].push(coord);
    } else if (itemSelecionado.startsWith('item_')) {
        const tipoReal = itemSelecionado.replace('item_', '');
        faseData.itens.push({ tipo: tipoReal, pos: coord });
    }
}

function removerElemento(coord) {
    faseData.plataformas = faseData.plataformas.filter(c => c !== coord);
    faseData.inimigos0 = (faseData.inimigos0 || []).filter(c => c !== coord);
    faseData.inimigos1 = (faseData.inimigos1 || []).filter(c => c !== coord);
    faseData.inimigos2 = (faseData.inimigos2 || []).filter(c => c !== coord);
    faseData.inimigos3 = (faseData.inimigos3 || []).filter(c => c !== coord);
    faseData.inimigos4 = (faseData.inimigos4 || []).filter(c => c !== coord); // Adicionado
    faseData.itens = faseData.itens.filter(i => i.pos !== coord);
}

function atualizarVisual() {
    // Remove todos os elementos visuais antigos (exceto a grade)
    const elementos = stage.querySelectorAll('img');
    elementos.forEach(el => el.remove());

    // Renderiza Plataformas
    faseData.plataformas.forEach(coord => criarIcone(coord, '../personagem/chao.png', '', 'Plataforma'));

    // Renderiza Inimigos
    (faseData.inimigos0 || []).forEach(coord => criarIcone(coord, '../personagem/Personagem_parado.png'));
    (faseData.inimigos1 || []).forEach(coord => criarIcone(coord, '../personagem/revolver_pegavel.png'));
    (faseData.inimigos2 || []).forEach(coord => criarIcone(coord, '../personagem/escudo_pegavel.png'));
    (faseData.inimigos3 || []).forEach(coord => criarIcone(coord, '../personagem/bota_pegavel.png'));
    (faseData.inimigos4 || []).forEach(coord => criarIcone(coord, '../personagem/jetpack_pegavel.png'));

    // Renderiza Itens
    faseData.itens.forEach(item => {
        let src = '../personagem/revolver_pegavel.png';
        let nome = item.tipo.charAt(0).toUpperCase() + item.tipo.slice(1);
        if (item.tipo === 'escudo') src = '../personagem/escudo_pegavel.png';
        else if (item.tipo === 'bota') src = '../personagem/bota_pegavel.png';
        else if (item.tipo === 'jetpack') src = '../personagem/jetpack_pegavel.png';
        else if (item.tipo === 'restauracao') src = '../personagem/restauracao.png';
        criarIcone(item.pos, src, '', `Item: ${nome}`);
    });

    // Player e Objetivo
    criarIcone(faseData.posicaoInicialJogador, '../personagem/Personagem_parado.png', 'player-filter', 'Ponto Inicial do Jogador');
    criarIcone(faseData.objetivo, '../personagem/objetivo.png', '', 'Objetivo da Fase');
}

function criarIcone(coord, src, classe = '', title = '') {
    const letra = coord[0];
    const numero = parseInt(coord.substring(1));
    const row = letra.charCodeAt(0) - 'a'.charCodeAt(0);
    const col = numero - 1;

    const img = document.createElement('img');
    img.src = src;
    img.style.position = 'absolute';
    img.style.left = (col * TILE_SIZE) + 'px';
    img.style.bottom = (row * TILE_SIZE) + 'px';
    img.style.width = '32px';
    img.style.height = '32px';
    img.style.imageRendering = 'pixelated';
    img.style.pointerEvents = 'none';
    if (title) img.dataset.title = title;
    
    if (classe === 'player-filter') img.style.filter = 'hue-rotate(90deg)';

    stage.appendChild(img);
}

function exportarJSON() {
    // Limpa chaves vazias para manter o JSON limpo
    const finalData = { ...faseData };
    if (finalData.inimigos0 && finalData.inimigos0.length === 0) delete finalData.inimigos0;
    if (finalData.inimigos1 && finalData.inimigos1.length === 0) delete finalData.inimigos1;
    if (finalData.inimigos2 && finalData.inimigos2.length === 0) delete finalData.inimigos2; // Adicionado
    if (finalData.inimigos3 && finalData.inimigos3.length === 0) delete finalData.inimigos3;
    if (finalData.inimigos4 && finalData.inimigos4.length === 0) delete finalData.inimigos4; // Adicionado
    
    // Configuração do Inimigo Aleatório
    if (spawnRandomCheck.checked) {
        finalData.inimigoAleatorio = [
            parseInt(randomDiffSelect.value),
            parseInt(randomTypeSelect.value)
        ];
    } else {
        delete finalData.inimigoAleatorio;
    }

    const jsonStr = JSON.stringify(finalData, null, 4);
    output.value = jsonStr;
    
    // Copia para o clipboard automaticamente
    output.select();
    try {
        document.execCommand('copy');
        alert("JSON copiado para a área de transferência!");
    } catch (err) {
        console.log('Erro ao copiar JSON');
    }
}