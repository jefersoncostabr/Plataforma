/**
 * Preenche a base do palco com blocos de chão.
 * 
 * @param {string} idPalco - O ID do container do jogo.
 * @param {string} imagemPath - Caminho para a imagem chao.png.
 * @param {number} larguraPalco - Largura total do palco (padrão 640).
 */
function renderizarChao(idPalco, imagemPath, larguraPalco = 640) {
    const palco = document.getElementById(idPalco);
    if (!palco) return;

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
        palco.appendChild(tile);
    }
}

/**
 * Remove todos os elementos de cenário e inimigos do container.
 */
function limparCenario() {
    const palco = document.getElementById('game-stage') || document.getElementById('jogo-container');
    if (!palco) return;
    
    // Remove todos os filhos exceto o player, sua arma e seu escudo
    const elementosParaRemover = palco.querySelectorAll('img:not(#player):not(#player-weapon):not(#player-shield):not(#player-boots)');
    elementosParaRemover.forEach(el => el.remove());
    
    window.plataformas = {};
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
    const palco = document.getElementById(idPalco);
    if (!palco || !plataformaData) return;

    const tamanhoTile = 32;
    const coordenadas = Array.isArray(plataformaData)
        ? plataformaData
        : Object.keys(plataformaData);

    // Inicializa o objeto global de plataformas
    window.plataformas = {};

    coordenadas.forEach(coord => {
        const letra = coord[0].toLowerCase();
        const numero = parseInt(coord.substring(1));

        // Converte letra para índice (a=0, b=1, c=2...) e número para índice (1=0, 2=1...)
        const row = letra.charCodeAt(0) - 'a'.charCodeAt(0);
        const col = numero - 1;

        // Registra a coordenada no objeto global para colisão
        window.plataformas[coord] = true;

        const tile = document.createElement('img');
        tile.src = imagemPath;
        tile.style.position = 'absolute';
        tile.style.left = (col * tamanhoTile) + 'px';
        tile.style.bottom = (row * tamanhoTile) + 'px';
        tile.style.width = tamanhoTile + 'px';
        tile.style.height = tamanhoTile + 'px';
        tile.style.imageRendering = 'pixelated';
        palco.appendChild(tile);
    });

    console.log('Plataformas carregadas:', window.plataformas);
}

/**
 * Converte uma coordenada de grade (ex: "b2") para pixels (x, y).
 * 
 * @param {string} coord - Coordenada no grid.
 * @param {number} tileSize - Tamanho do tile (padrão 32).
 * @returns {Object} Objeto com {x, y}.
 */
function gridParaPixels(coord, tileSize = 32) {
    const coordLimpa = coord.trim().toLowerCase();
    const letra = coordLimpa[0];
    const numero = parseInt(coordLimpa.substring(1));
    const row = letra.charCodeAt(0) - 'a'.charCodeAt(0);
    const col = numero - 1;
    return { x: col * tileSize, y: row * tileSize };
}

/**
 * Converte posição em pixels (x, y) para coordenada de grade (ex: "b15").
 * x e y são posições bottom-left do tile.
 */
function coordenadaParaGrid(x, y, tileSize = 32) {
    const col = Math.floor(x / tileSize) + 1;
    const row = Math.floor(y / tileSize);
    const letra = String.fromCharCode('a'.charCodeAt(0) + row);
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
    const palco = document.getElementById(idPalco);
    if (!palco) return;

    // Limpa espaços e garante minúsculas para processar a coordenada
    const coordLimpa = coord.trim().toLowerCase();
    const letra = coordLimpa[0];
    const numero = parseInt(coordLimpa.substring(1));
    const row = letra.charCodeAt(0) - 'a'.charCodeAt(0);
    const col = numero - 1;
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
    objImg.style.zIndex = '5'; // Garante que apareça na frente das plataformas
    palco.appendChild(objImg);

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
