/**
 * Preenche a base do palco com blocos de chão.
 * 
 * @param {string} idPalco - O ID do container do jogo.
 * @param {string} imagemPath - Caminho para a imagem terra_horizontal.png.
 * @param {number} larguraPalco - Largura total do palco (padrão 640).
 */
function renderizarChao(idPalco, imagemPath, larguraPalco = 640) {
    // Evita render duplicado do chão quando a fase troca (jogo/menu/editor).
    const layerPlataformas = obterLayer(window.LAYERS.PLATAFORMAS);
    if (!layerPlataformas) return;

    // Remove apenas tiles antigos do chão (não remove plataformas de colisão da fase).
    // Isso evita bugs sem duplicidade.
    const tilesChao = layerPlataformas.querySelectorAll('img[data-terra-chao="1"]');
    tilesChao.forEach(t => t.remove());

    const tamanhoTile = 32;
    const quantidade = larguraPalco / tamanhoTile;

    for (let i = 0; i < quantidade; i++) {
        const tile = document.createElement('img');
        tile.src = imagemPath;
        // Marca para remoção seletiva em troca de fase.
        tile.dataset.terraChao = '1';
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
    window.roboDesativadoData = null;
    window.robosDesativadosData = [];
    window.musgoData = null;
    window.musgosData = [];
    window.alavancaData = null;
    window.alavancasData = [];
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

    // Corrige carregamento do sprite do chão em caminhos relativos.
    // Se a imagem vier como ../../assets/... a partir de páginas/contexts diferentes,
    // usamos um fallback para o caminho baseado na origem atual.
    // (mantido vazio; fallback é feito via tile.onerror abaixo)

    const tamanhoTile = 32;
    const coordenadas = Array.isArray(plataformaData)
        ? plataformaData
        : Object.keys(plataformaData);

    coordenadas.forEach(coord => {
        const partes = parseCoordGrid(coord);
        if (!partes) return;

        const { row, col } = partes;

        const tile = document.createElement('img');

        // Tentativa principal
        tile.src = imagemPath;

        // Fallback específico para o chão quando o caminho relativo falha.
        if (/bloco\s*terra|terra_horizontal\.png|bloco-terra|terra_horizontal\b/i.test(String(imagemPath || ''))) {
            tile.onerror = () => {
                tile.onerror = null;

                tile.src = '../../assets/bloco terra/terra_horizontal.png';
            };
        }

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

function renderizarAlavanca(idPalco, imagemPath, coord) {
    const partes = parseCoordGrid(coord);
    if (!partes) return;

    const { row, col } = partes;
    const tamanhoTile = 32;
    const x = col * tamanhoTile;
    const y = row * tamanhoTile;

    criarAlavancaInterativa(x, y, {
        coord,
        imagemPath,
        origem: 'fase'
    });
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

function renderizarRoboDesativado(idPalco, imagemPath, coord) {
    const partes = parseCoordGrid(coord);
    if (!partes) return;

    const { row, col } = partes;
    const tamanhoTile = 32;
    const x = col * tamanhoTile;
    const y = row * tamanhoTile;

    criarRoboDesativadoInterativo(x, y, {
        coord,
        imagemPath,
        origem: 'fase'
    });
}

function renderizarMusgoSobreRoboAberto(idPalco, imagemPath, coord) {
    const partes = parseCoordGrid(coord);
    if (!partes) return;

    const tamanhoTile = 32;
    const x = partes.col * tamanhoTile;
    const y = partes.row * tamanhoTile;

    criarMusgoInterativo(x, y, {
        coord,
        imagemPath,
        alvoTipo: 'roboAberto',
        origem: 'fase'
    });
}

function renderizarMusgoSobreRoboDesativado(idPalco, imagemPath, coord) {
    const partes = parseCoordGrid(coord);
    if (!partes) return;

    const tamanhoTile = 32;
    const x = partes.col * tamanhoTile;
    const y = partes.row * tamanhoTile;

    criarMusgoInterativo(x, y, {
        coord,
        imagemPath,
        alvoTipo: 'roboDesativado',
        origem: 'fase'
    });
}

function criarAlavancaInterativa(x, y, opcoes = {}) {
    const layerUI = obterLayer(window.LAYERS.UI);
    if (!layerUI) return null;
    const tamanhoTile = 32;

    const spawnX = Number(x || 0);
    const spawnY = Number(y || 0);
    const imagemPath = opcoes.imagemPath || '../../assets/personagem/alavanca.png';

    if (!Array.isArray(window.alavancasData)) {
        window.alavancasData = [];
    }

    const jaExisteNoLocal = window.alavancasData.some((alavanca) => {
        if (!alavanca || !alavanca.ativo) return false;
        return Number(alavanca.spawnX || 0) === spawnX && Number(alavanca.spawnY || 0) === spawnY;
    });

    if (jaExisteNoLocal) {
        return window.alavancasData.find((alavanca) => alavanca && alavanca.ativo && Number(alavanca.spawnX || 0) === spawnX && Number(alavanca.spawnY || 0) === spawnY) || null;
    }

    const alavancaId = `alavanca-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const alavancaImg = document.createElement('img');
    alavancaImg.id = alavancaId;
    alavancaImg.src = imagemPath;
    alavancaImg.style.position = 'absolute';
    alavancaImg.style.left = spawnX + 'px';
    alavancaImg.style.bottom = spawnY + 'px';
    alavancaImg.style.width = tamanhoTile + 'px';
    alavancaImg.style.height = tamanhoTile + 'px';
    alavancaImg.style.imageRendering = 'pixelated';
    alavancaImg.style.pointerEvents = 'none';
    alavancaImg.style.transition = 'none';
    adicionarAoLayer(alavancaImg, window.LAYERS.UI);

    const alavancaData = {
        id: alavancaId,
        x: spawnX + 7,
        y: spawnY + 8,
        largura: 18,
        altura: 16,
        spawnX,
        spawnY,
        coord: opcoes.coord || '',
        origem: opcoes.origem || 'fase',
        ativo: true,
        estadoInvertido: false,
        emAnimacao: false,
        emCooldown: false,
        elemento: alavancaImg
    };

    alavancaImg.style.transform = 'scaleX(1)';
    window.alavancasData.push(alavancaData);
    window.alavancaData = alavancaData;

    return alavancaData;
}

function buscarAlavancaPorColisao(hitbox) {
    if (!hitbox || typeof window.detectarColisaoHitbox !== 'function') return null;
    if (!Array.isArray(window.alavancasData)) return null;

    for (const alavanca of window.alavancasData) {
        if (!alavanca || !alavanca.ativo || alavanca.emAnimacao || alavanca.emCooldown) continue;
        if (window.detectarColisaoHitbox(hitbox, alavanca, 0, 0, 0)) {
            return alavanca;
        }
    }

    return null;
}

function interagirComAlavanca(controle, teclas = null, opcoes = {}) {
    if (!controle || typeof window.detectarColisaoHitbox !== 'function') return false;

    const hitboxControle = {
        x: Number(controle.x || 0) + Number(controle.offsetX || 0),
        y: Number(controle.y || 0),
        largura: Number(controle.largura || 20),
        altura: Number(controle.altura || 32)
    };

    const exigeAgachado = opcoes.exigeAgachado !== false;
    if (exigeAgachado && !controle.estaAgachado) return false;

    const alavanca = buscarAlavancaPorColisao(hitboxControle);
    if (!alavanca) return false;

    const config = window.config || {};
    const tempoAnimacaoMs = Math.max(16, Number(config.tempoAnimacaoAlavancaMs ?? 40));
    const cooldownMs = Math.max(150, Number(config.cooldownAlavancaMs ?? 450));

    alavanca.emAnimacao = true;
    alavanca.emCooldown = true;
    alavanca.estadoInvertido = !alavanca.estadoInvertido;

    if (alavanca.elemento) {
        alavanca.elemento.style.transform = alavanca.estadoInvertido ? 'scaleX(-1)' : 'scaleX(1)';
    }

    window.AudioManager?.playSFX('engrenagem', 0.4);

    window.setTimeout(() => {
        if (!alavanca || !alavanca.ativo) return;
        alavanca.emAnimacao = false;
    }, tempoAnimacaoMs);

    window.setTimeout(() => {
        if (!alavanca || !alavanca.ativo) return;
        alavanca.emCooldown = false;
    }, tempoAnimacaoMs + cooldownMs);

    if (teclas && typeof teclas === 'object') {
        teclas['e'] = false;
        teclas['E'] = false;
        teclas['KeyE'] = false;
    }

    return true;
}

function criarRoboAbertoInterativo(x, y, opcoes = {}) {
    const layerDestino = opcoes.layerOverride || window.LAYERS.UI;
    if (!layerDestino) return null;
    const tamanhoTile = 32;

    const spawnX = Number(x || 0);
    const spawnY = Number(y || 0);
    const imagemPath = opcoes.imagemPath || '../../assets/personagem/per_aberto.png';
    const zIndex = opcoes.zIndex ?? 0;

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
    roboImg.style.pointerEvents = 'none';
    if (zIndex) roboImg.style.zIndex = String(zIndex);
    adicionarAoLayer(roboImg, layerDestino);

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

    // Adiciona lógica de colisão no teto
    roboData.colisaoTeto = {
        x: roboData.x,
        y: roboData.y + roboData.altura, // Posição do teto
        largura: roboData.largura,
        altura: 5 // Altura da colisão do teto
    };

    window.robosAbertosData.push(roboData);
    window.roboAbertoData = roboData;

    return roboData;
}

function criarRoboDesativadoInterativo(x, y, opcoes = {}) {
    const layerDestino = opcoes.layerOverride || window.LAYERS.UI;
    if (!layerDestino) return null;
    const tamanhoTile = 32;

    const spawnX = Number(x || 0);
    const spawnY = Number(y || 0);
    const imagemPath = opcoes.imagemPath || '../../assets/personagem/robo_desativado.png';
    const zIndex = opcoes.zIndex ?? 0;

    if (!Array.isArray(window.robosDesativadosData)) {
        window.robosDesativadosData = [];
    }

    const jaExisteNoLocal = window.robosDesativadosData.some((robo) => {
        if (!robo || !robo.ativo) return false;
        return Number(robo.spawnX || 0) === spawnX && Number(robo.spawnY || 0) === spawnY;
    });

    if (jaExisteNoLocal) {
        return window.robosDesativadosData.find((robo) => robo && robo.ativo && Number(robo.spawnX || 0) === spawnX && Number(robo.spawnY || 0) === spawnY) || null;
    }

    const roboId = `robo-desativado-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const roboImg = document.createElement('img');
    roboImg.id = roboId;
    roboImg.src = imagemPath;
    roboImg.style.position = 'absolute';
    roboImg.style.left = spawnX + 'px';
    roboImg.style.bottom = spawnY + 'px';
    roboImg.style.width = tamanhoTile + 'px';
    roboImg.style.height = tamanhoTile + 'px';
    roboImg.style.imageRendering = 'pixelated';
    roboImg.style.pointerEvents = 'none';
    if (zIndex) roboImg.style.zIndex = String(zIndex);
    adicionarAoLayer(roboImg, layerDestino);

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
        emAbertura: false,
        elemento: roboImg
    };

    window.robosDesativadosData.push(roboData);
    window.roboDesativadoData = roboData;

    return roboData;
}

function criarMusgoInterativo(x, y, opcoes = {}) {
    const layerUI = obterLayer(window.LAYERS.UI);
    if (!layerUI) return null;
    const tamanhoTile = 32;

    const spawnX = Number(x || 0);
    const spawnY = Number(y || 0);
    const alvoTipo = opcoes.alvoTipo === 'roboDesativado' ? 'roboDesativado' : 'roboAberto';
    const imagemPadrao = alvoTipo === 'roboDesativado'
        ? '../../assets/personagem/musgo1.png'
        : '../../assets/personagem/musgo2.png';
    const imagemPath = opcoes.imagemPath || imagemPadrao;

    if (!Array.isArray(window.musgosData)) {
        window.musgosData = [];
    }

    const existente = window.musgosData.find((musgo) => {
        if (!musgo || !musgo.ativo) return false;
        const mesmoLocal = Number(musgo.spawnX || 0) === spawnX && Number(musgo.spawnY || 0) === spawnY;
        return mesmoLocal && musgo.alvoTipo === alvoTipo;
    });

    if (existente) return existente;

    const musgoId = `musgo-${alvoTipo}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const musgoImg = document.createElement('img');
    musgoImg.id = musgoId;
    musgoImg.src = imagemPath;
    musgoImg.style.position = 'absolute';
    musgoImg.style.left = spawnX + 'px';
    musgoImg.style.bottom = spawnY + 'px';
    musgoImg.style.width = tamanhoTile + 'px';
    musgoImg.style.height = tamanhoTile + 'px';
    musgoImg.style.imageRendering = 'pixelated';
    musgoImg.style.pointerEvents = 'none';
    musgoImg.style.zIndex = '12';
    adicionarAoLayer(musgoImg, window.LAYERS.UI);

    const musgoData = {
        id: musgoId,
        x: spawnX + 7,
        y: spawnY + 8,
        largura: 18,
        altura: 16,
        spawnX,
        spawnY,
        coord: opcoes.coord || '',
        origem: opcoes.origem || 'fase',
        alvoTipo,
        ativo: true,
        elemento: musgoImg
    };

    window.musgosData.push(musgoData);
    window.musgoData = musgoData;

    return musgoData;
}

function buscarMusgoPorColisao(hitbox) {
    if (!hitbox || typeof window.detectarColisaoHitbox !== 'function') return null;
    if (!Array.isArray(window.musgosData)) return null;

    for (const musgo of window.musgosData) {
        if (!musgo || !musgo.ativo) continue;
        if (window.detectarColisaoHitbox(hitbox, musgo, 0, 0, 0)) {
            return musgo;
        }
    }

    return null;
}

function buscarMusgoSobreAlvo(alvo, alvoTipo) {
    if (!alvo || !Array.isArray(window.musgosData)) return null;
    const spawnX = Number(alvo.spawnX || 0);
    const spawnY = Number(alvo.spawnY || 0);

    return window.musgosData.find((musgo) => {
        if (!musgo || !musgo.ativo) return false;
        if (alvoTipo && musgo.alvoTipo !== alvoTipo) return false;
        return Number(musgo.spawnX || 0) === spawnX && Number(musgo.spawnY || 0) === spawnY;
    }) || null;
}

function consumirMusgo(alvoMusgo) {
    if (!Array.isArray(window.musgosData) || window.musgosData.length === 0) return;

    const idAlvo = typeof alvoMusgo === 'string'
        ? alvoMusgo
        : (alvoMusgo && typeof alvoMusgo === 'object' ? alvoMusgo.id : null);

    let alvo = null;
    if (idAlvo) {
        alvo = window.musgosData.find((musgo) => musgo && musgo.id === idAlvo) || null;
    }

    if (!alvo) {
        alvo = window.musgoData || null;
    }

    if (!alvo) return;

    alvo.ativo = false;
    if (alvo.elemento) {
        alvo.elemento.remove();
    }

    window.musgosData = window.musgosData.filter((musgo) => musgo && musgo.ativo);
    window.musgoData = window.musgosData.length > 0
        ? window.musgosData[window.musgosData.length - 1]
        : null;
}

function interagirComMusgoAlvo(controle, teclas = null) {
    if (!controle || typeof window.detectarColisaoHitbox !== 'function') return false;

    const hitboxControle = {
        x: Number(controle.x || 0) + Number(controle.offsetX || 0),
        y: Number(controle.y || 0),
        largura: Number(controle.largura || 20),
        altura: Number(controle.altura || 32)
    };

    const alvoMusgo = buscarMusgoPorColisao(hitboxControle);
    if (!alvoMusgo) return false;

    consumirMusgo(alvoMusgo);
    const framesCooldown = Math.max(1, Number(window.config?.cooldownInteracaoRoboAposMusgo ?? 18));
    controle.cooldownInteracaoRoboAposMusgo = framesCooldown;
    window.AudioManager?.playSFX('engrenagem', 0.35);

    if (teclas && typeof teclas === 'object') {
        teclas['e'] = false;
        teclas['E'] = false;
        teclas['KeyE'] = false;
    }

    return true;
}

function buscarRoboDesativadoPorColisao(hitbox) {
    if (!hitbox || typeof window.detectarColisaoHitbox !== 'function') return null;
    if (!Array.isArray(window.robosDesativadosData)) return null;

    for (const robo of window.robosDesativadosData) {
        if (!robo || !robo.ativo || robo.emAbertura) continue;
        if (buscarMusgoSobreAlvo(robo, 'roboDesativado')) continue;
        if (window.detectarColisaoHitbox(hitbox, robo, 0, 0, 0)) {
            return robo;
        }
    }

    return null;
}

function consumirRoboDesativado(alvoRobo) {
    if (!Array.isArray(window.robosDesativadosData) || window.robosDesativadosData.length === 0) return;

    const idAlvo = typeof alvoRobo === 'string'
        ? alvoRobo
        : (alvoRobo && typeof alvoRobo === 'object' ? alvoRobo.id : null);

    let alvo = null;
    if (idAlvo) {
        alvo = window.robosDesativadosData.find((robo) => robo && robo.id === idAlvo) || null;
    }

    if (!alvo) {
        alvo = window.roboDesativadoData || null;
    }

    if (!alvo) return;

    alvo.ativo = false;
    const musgoSobreAlvo = buscarMusgoSobreAlvo(alvo, 'roboDesativado');
    if (musgoSobreAlvo) consumirMusgo(musgoSobreAlvo);
    if (alvo.elemento) {
        alvo.elemento.remove();
    }

    window.robosDesativadosData = window.robosDesativadosData.filter((robo) => robo && robo.ativo);

    if (window.roboDesativadoData && window.roboDesativadoData.id === alvo.id) {
        window.roboDesativadoData = window.robosDesativadosData.length > 0
            ? window.robosDesativadosData[window.robosDesativadosData.length - 1]
            : null;
    }
}

function interagirComRoboDesativado(controle, teclas = null) {
    if (!controle || typeof window.detectarColisaoHitbox !== 'function') return false;

    const hitboxControle = {
        x: Number(controle.x || 0) + Number(controle.offsetX || 0),
        y: Number(controle.y || 0),
        largura: Number(controle.largura || 20),
        altura: Number(controle.altura || 32)
    };

    const robo = buscarRoboDesativadoPorColisao(hitboxControle);
    if (!robo || robo.emAbertura) return false;

    if (robo.origem === 'capsula') {
        const capsulaPai = Object.values(window.itensColetaveis || {}).find(item =>
            item && item.roboInterno && item.roboInterno.id === robo.id
        );
        if (capsulaPai && capsulaPai.vidroQuebrado === false) return false;
    }

    robo.emAbertura = true;

    const config = window.config || {};
    const spriteAbrindo1 = config.spriteAberturaPlayer2 || '../../assets/personagem/per_abrindo1.png';
    const spriteAbrindo2 = config.spriteAberturaPlayer3 || '../../assets/personagem/per_abrindo2.png';
    const spriteFinal = config.spriteAberturaPlayerFinal || '../../assets/personagem/per_aberto.png';
    const sequencia = [spriteAbrindo1, spriteAbrindo2, spriteFinal];
    const frameAnimacao = Math.max(1, Number(config.tempoAberturaFrame ?? 20));
    const tempoEtapaMs = Math.max(40, Math.round((1000 / 60) * frameAnimacao));

    let indice = 0;
    const rodarAbertura = () => {
        if (!robo || !robo.ativo || !robo.elemento) return;

        robo.elemento.src = sequencia[Math.min(indice, sequencia.length - 1)] || spriteFinal;

        if (indice < sequencia.length - 1) {
            indice++;
            setTimeout(rodarAbertura, tempoEtapaMs);
            return;
        }

        if (robo.origem === 'capsula') {
            robo.emAbertura = false;
            robo.tipo = 'roboAberto';
            robo.estado = 'aberto';
            if (Array.isArray(window.robosDesativadosData)) {
                window.robosDesativadosData = window.robosDesativadosData.filter((item) => item && item.id !== robo.id && item.ativo);
            }
            if (!Array.isArray(window.robosAbertosData)) {
                window.robosAbertosData = [];
            }
            if (!window.robosAbertosData.includes(robo)) {
                window.robosAbertosData.push(robo);
            }
            window.roboAbertoData = robo;
            robo.elemento.src = spriteFinal;
            robo.elemento.style.pointerEvents = 'none';
            return;
        }

        criarRoboAbertoInterativo(robo.spawnX, robo.spawnY, {
            coord: robo.coord || '',
            origem: 'robo-desativado',
            imagemPath: spriteFinal
        });

        consumirRoboDesativado(robo);
    };

    window.AudioManager?.playSFX('engrenagem', 0.55);
    rodarAbertura();

    if (teclas && typeof teclas === 'object') {
        teclas['e'] = false;
        teclas['E'] = false;
        teclas['KeyE'] = false;
    }

    return true;
}

function buscarRoboAbertoPorColisao(hitbox) {
    if (!hitbox || typeof window.detectarColisaoHitbox !== 'function') return null;
    if (!Array.isArray(window.robosAbertosData)) return null;

    for (const robo of window.robosAbertosData) {
        if (!robo || !robo.ativo) continue;
        if (buscarMusgoSobreAlvo(robo, 'roboAberto')) continue;
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
    const musgoSobreAlvo = buscarMusgoSobreAlvo(alvo, 'roboAberto');
    if (musgoSobreAlvo) consumirMusgo(musgoSobreAlvo);
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
window.renderizarRoboDesativado = renderizarRoboDesativado;
window.criarRoboDesativadoInterativo = criarRoboDesativadoInterativo;
window.buscarRoboDesativadoPorColisao = buscarRoboDesativadoPorColisao;
window.interagirComRoboDesativado = interagirComRoboDesativado;
window.renderizarMusgoSobreRoboAberto = renderizarMusgoSobreRoboAberto;
window.renderizarMusgoSobreRoboDesativado = renderizarMusgoSobreRoboDesativado;
window.renderizarAlavanca = renderizarAlavanca;
window.criarAlavancaInterativa = criarAlavancaInterativa;

window.buscarAlavancaPorColisao = buscarAlavancaPorColisao;
window.interagirComAlavanca = interagirComAlavanca;
window.interagirComMusgoAlvo = interagirComMusgoAlvo;
