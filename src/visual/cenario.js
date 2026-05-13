/**
 * Preenche a base do palco com blocos de chão.
 * 
 * @param {string} idPalco - O ID do container do jogo.
 * @param {string} imagemPath - Caminho para a imagem chao.png.
 * @param {number} larguraPalco - Largura total do palco (padrão 640).
 */
function renderizarChao(idPalco, imagemPath, larguraPalco = 640) {
    const layerPlataformas = obterLayer(window.LAYERS.PLATAFORMAS);
    if (!layerPlataformas) return;

    const tamanhoTile = 32;
    const quantidade = larguraPalco / tamanhoTile;

    for (let i = 0; i < quantidade; i++) {
        const tile = document.createElement('img');
        tile.src = imagemPath;
        tile.style.position = 'absolute';
        tile.style.left = (i * tamanhoTile) + 'px';
        tile.style.bottom = '0px';
        tile.style.width = tamanhoTile + 'px';
        tile.style.height = tamanhoTile + 'px';
        tile.style.imageRendering = 'pixelated';
        adicionarAoLayer(tile, window.LAYERS.PLATAFORMAS);
    }
}

/**
 * Remove todos os elementos de cenário e inimigos do container.
 */
function limparCenario() {
    // 1. Limpa os layers (exceto o jogador)
    limparTodosLayers([window.LAYERS.JOGADOR]);
    
    // 2. Limpa as referências lógicas (FUNDAMENTAL PARA PERFORMANCE)
    // Se não limparmos esses arrays, o loop 'atualizar' continua processando objetos fantasmas
    window.plataformas = {};
    window.projeteis = []; 
    window.itensColetaveis = [];
    window.objetivoData = null;
    window.roboAbertoData = null;
    window.robosAbertosData = [];
    window.inimigos = []; // CRÍTICO: Limpa inimigos para não deixar "fantasmas" da fase anterior

    // 3. Reseta filtros de CSS que podem estar pesando na GPU (como blur ou grayscale)
    const stage = document.getElementById('game-stage');
    if (stage) stage.style.filter = 'none';
}

function letrasParaIndiceGrid(letras) {
    const texto = String(letras || '').trim().toLowerCase();
    if (!texto) return 0;

    let indice = 0;
    for (const char of texto) {
        const codigo = char.charCodeAt(0);
        if (codigo < 97 || codigo > 122) continue;
        indice = (indice * 26) + (codigo - 96);
    }

    return Math.max(0, indice - 1);
}

function indiceParaLetrasGrid(indice) {
    let valor = Math.max(0, Number(indice) || 0) + 1;
    let resultado = '';

    while (valor > 0) {
        const resto = (valor - 1) % 26;
        resultado = String.fromCharCode(97 + resto) + resultado;
        valor = Math.floor((valor - 1) / 26);
    }

    return resultado || 'a';
}

function parseCoordGrid(coord) {
    const match = String(coord || '').trim().toLowerCase().match(/^([a-z]+)(\d+)$/);
    if (!match) return null;

    const letras = match[1];
    const numero = parseInt(match[2], 10);
    if (Number.isNaN(numero) || numero <= 0) return null;

    return {
        letras,
        row: letrasParaIndiceGrid(letras),
        col: numero - 1
    };
}

/**
 * Renderiza plataformas baseadas em um objeto de coordenadas.
 * Sistema: 'a1' -> Inferior Esquerdo (0,0). Letra cresce para cima, Número para direita.
 * 
 * @param {string} idPalco - O ID do container do jogo.
 * @param {string} imagemPath - Caminho para a imagem do tile.
 * @param {Object} plataformaObj - Objeto contendo coordenadas como chaves (ex: {"d10": true}).
 */
function renderizarPlataformas(idPalco, imagemPath, plataformaData) {
    const layerPlataformas = obterLayer(window.LAYERS.PLATAFORMAS);
    if (!layerPlataformas || !plataformaData) return;

    const tamanhoTile = 32;
    const coordenadas = Array.isArray(plataformaData)
        ? plataformaData
        : Object.keys(plataformaData);

    coordenadas.forEach(coord => {
        const partes = parseCoordGrid(coord);
        if (!partes) return;

        const { row, col } = partes;

        const tile = document.createElement('img');
        tile.src = imagemPath;
        tile.style.position = 'absolute';
        tile.style.left = (col * tamanhoTile) + 'px';
        tile.style.bottom = (row * tamanhoTile) + 'px';
        tile.style.width = tamanhoTile + 'px';
        tile.style.height = tamanhoTile + 'px';
        tile.style.imageRendering = 'pixelated';
        adicionarAoLayer(tile, window.LAYERS.PLATAFORMAS);
    });

    //console.log('Plataformas carregadas:', window.plataformas);
}

/**
 * Converte uma coordenada de grade (ex: "b2") para pixels (x, y).
 * 
 * @param {string} coord - Coordenada no grid.
 * @param {number} tileSize - Tamanho do tile (padrão 32).
 * @returns {Object} Objeto com {x, y}.
 */
function gridParaPixels(coord, tileSize = 32) {
    const partes = parseCoordGrid(coord);
    if (!partes) return { x: 0, y: 0 };

    return {
        x: partes.col * tileSize,
        y: partes.row * tileSize
    };
}

/**
 * Converte posição em pixels (x, y) para coordenada de grade (ex: "b15").
 * x e y são posições bottom-left do tile.
 */
function coordenadaParaGrid(x, y, tileSize = 32) {
    const col = Math.floor(x / tileSize) + 1;
    const row = Math.floor(y / tileSize);
    const letra = indiceParaLetrasGrid(row);
    return letra + col;
}

/**
 * Renderiza o objetivo final e armazena seus dados de colisão.
 * 
 * @param {string} idPalco - O ID do container do jogo.
 * @param {string} imagemPath - Caminho para a imagem do objetivo.
 * @param {string} coord - Coordenada (ex: "f19").
 */
function renderizarObjetivo(idPalco, imagemPath, coord) {
    const layerUI = obterLayer(window.LAYERS.UI);
    if (!layerUI) return;

    const partes = parseCoordGrid(coord);
    if (!partes) return;

    const { row, col } = partes;
    const tamanhoTile = 32;

    const objImg = document.createElement('img');
    objImg.id = 'objetivo-final';
    objImg.src = imagemPath;
    objImg.style.position = 'absolute';
    objImg.style.left = (col * tamanhoTile) + 'px';
    objImg.style.bottom = (row * tamanhoTile) + 'px';
    objImg.style.width = tamanhoTile + 'px';
    objImg.style.height = tamanhoTile + 'px';
    objImg.style.imageRendering = 'pixelated';
    adicionarAoLayer(objImg, window.LAYERS.UI);

    // Log de ajuda para verificar se a função rodou
    objImg.onerror = () => console.error(`Erro: Não foi possível carregar a imagem em: ${imagemPath}`);

    // Salva a hitbox do objetivo para verificação global
    window.objetivoData = { 
        x: col * tamanhoTile + 7, 
        y: row * tamanhoTile + 9.5, 
        largura: 18, 
        altura: 13 
    };
}

/**
 * Renderiza um robô aberto de fase (casco vazio) para o BB assumir o corpo.
 *
 * @param {string} idPalco - O ID do container do jogo.
 * @param {string} imagemPath - Caminho para a imagem do robô aberto.
 * @param {string} coord - Coordenada (ex: "f19").
 */
function renderizarRoboAberto(idPalco, imagemPath, coord) {
    const partes = parseCoordGrid(coord);
    if (!partes) return;

    const { row, col } = partes;
    const tamanhoTile = 32;
    const x = col * tamanhoTile;
    const y = row * tamanhoTile;

    criarRoboAbertoInterativo(x, y, {
        coord,
        imagemPath,
        origem: 'fase'
    });
}

function criarRoboAbertoInterativo(x, y, opcoes = {}) {
    const layerUI = obterLayer(window.LAYERS.UI);
    if (!layerUI) return null;
    const tamanhoTile = 32;

    const spawnX = Number(x || 0);
    const spawnY = Number(y || 0);
    const imagemPath = opcoes.imagemPath || '../../assets/personagem/per_aberto.png';

    if (!Array.isArray(window.robosAbertosData)) {
        window.robosAbertosData = [];
    }

    const jaExisteNoLocal = window.robosAbertosData.some((robo) => {
        if (!robo || !robo.ativo) return false;
        return Number(robo.spawnX || 0) === spawnX && Number(robo.spawnY || 0) === spawnY;
    });

    if (jaExisteNoLocal) {
        return window.robosAbertosData.find((robo) => robo && robo.ativo && Number(robo.spawnX || 0) === spawnX && Number(robo.spawnY || 0) === spawnY) || null;
    }

    const roboId = `robo-aberto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const roboImg = document.createElement('img');
    roboImg.id = roboId;
    roboImg.src = imagemPath;
    roboImg.style.position = 'absolute';
    roboImg.style.left = spawnX + 'px';
    roboImg.style.bottom = spawnY + 'px';
    roboImg.style.width = tamanhoTile + 'px';
    roboImg.style.height = tamanhoTile + 'px';
    roboImg.style.imageRendering = 'pixelated';
    adicionarAoLayer(roboImg, window.LAYERS.UI);

    roboImg.onerror = () => console.error(`Erro: Não foi possível carregar a imagem em: ${imagemPath}`);

    const roboData = {
        id: roboId,
        x: spawnX + 7,
        y: spawnY + 8,
        largura: 18,
        altura: 16,
        spawnX,
        spawnY,
        coord: opcoes.coord || '',
        origem: opcoes.origem || 'fase',
        ativo: true,
        elemento: roboImg
    };

    window.robosAbertosData.push(roboData);
    window.roboAbertoData = roboData;

    return roboData;
}

function buscarRoboAbertoPorColisao(hitbox) {
    if (!hitbox || typeof window.detectarColisaoHitbox !== 'function') return null;
    if (!Array.isArray(window.robosAbertosData)) return null;

    for (const robo of window.robosAbertosData) {
        if (!robo || !robo.ativo) continue;
        if (window.detectarColisaoHitbox(hitbox, robo, 0, 0, 0)) {
            return robo;
        }
    }

    return null;
}

function consumirRoboAbertoFase(alvoRobo) {
    if (!Array.isArray(window.robosAbertosData) || window.robosAbertosData.length === 0) return;

    const idAlvo = typeof alvoRobo === 'string'
        ? alvoRobo
        : (alvoRobo && typeof alvoRobo === 'object' ? alvoRobo.id : null);

    let alvo = null;
    if (idAlvo) {
        alvo = window.robosAbertosData.find((robo) => robo && robo.id === idAlvo) || null;
    }

    if (!alvo) {
        alvo = window.roboAbertoData || null;
    }

    if (!alvo) return;

    alvo.ativo = false;
    if (alvo.elemento) {
        alvo.elemento.remove();
    }

    window.robosAbertosData = window.robosAbertosData.filter((robo) => robo && robo.ativo);

    if (window.roboAbertoData && window.roboAbertoData.id === alvo.id) {
        window.roboAbertoData = window.robosAbertosData.length > 0
            ? window.robosAbertosData[window.robosAbertosData.length - 1]
            : null;
    }
}

window.criarRoboAbertoInterativo = criarRoboAbertoInterativo;
window.buscarRoboAbertoPorColisao = buscarRoboAbertoPorColisao;
window.consumirRoboAbertoFase = consumirRoboAbertoFase;


