/**
 * Lista global para armazenar os dados de todos os inimigos ativos.
 */
window.inimigos = [];

/**
 * Cria um inimigo no palco baseado em coordenadas do grid.
 * 
 * @param {string} idPalco - ID do container do jogo.
 * @param {string} imagemPath - Caminho para a imagem do inimigo.
 * @param {string} coord - Coordenada no grid (ex: "b10").
 * @param {string} direcao - 'd' para direita ou 'e' para esquerda (padrão 'e').
 * @param {number} tipo - 0 para melee, 1 para revolver.
 */
function criarInimigo(idPalco, imagemPath, coord, direcao = 'e', tipo = 1) {
    const palco = document.getElementById(idPalco);
    if (!palco) return;

    // Converte coordenada (ex: "b10") para pixels
    const coordLimpa = coord.trim().toLowerCase();
    const letra = coordLimpa[0];
    const numero = parseInt(coordLimpa.substring(1));
    const row = letra.charCodeAt(0) - 'a'.charCodeAt(0);
    const col = numero - 1;
    const tamanhoTile = 32;

    const x = col * tamanhoTile;
    const y = row * tamanhoTile;

    const inimigoImg = document.createElement('img');
    inimigoImg.src = imagemPath;
    inimigoImg.style.position = 'absolute';
    inimigoImg.style.left = x + 'px';
    inimigoImg.style.bottom = y + 'px';
    inimigoImg.style.width = tamanhoTile + 'px';
    inimigoImg.style.height = tamanhoTile + 'px';
    inimigoImg.style.imageRendering = 'pixelated';
    inimigoImg.style.zIndex = '4';
    inimigoImg.style.transform = direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
    palco.appendChild(inimigoImg);

    // Registra o inimigo para detecção de colisão (inclui física vertical)
    window.inimigos.push({
        x,
        y,
        largura: tamanhoTile,
        altura: tamanhoTile,
        elemento: inimigoImg,
        velocidadeY: 0,
        noChao: true,
        tipo: tipo
    });
    console.log(`Inimigo inserido em ${coord} (x: ${x}, y: ${y})`);
}

/**
 * Converte uma coordenada do grid (ex: "b10") para coordenadas em pixels.
 * 
 * @param {string} coord - Coordenada no grid.
 * @returns {object} Objeto com x e y em pixels.
 */
function coordenadaParaPosicao(coord) {
    const coordLimpa = coord.trim().toLowerCase();
    const letra = coordLimpa[0];
    const numero = parseInt(coordLimpa.substring(1));
    const row = letra.charCodeAt(0) - 'a'.charCodeAt(0);
    const col = numero - 1;
    const tamanhoTile = 32;
    
    return {
        x: col * tamanhoTile,
        y: row * tamanhoTile,
        coord: coord
    };
}

/**
 * Verifica se uma posição está ocupada por outro inimigo, jogador ou item.
 * 
 * @param {object} pos - Objeto com x e y em pixels.
 * @returns {boolean} True se a posição está ocupada.
 */
function posicaoOcupada(pos) {
    const tamanhoTile = 32;
    
    // Verifica se o jogador está nessa posição
    if (window.playerControle) {
        const distX = Math.abs(window.playerControle.x - pos.x);
        const distY = Math.abs(window.playerControle.y - pos.y);
        if (distX < tamanhoTile && distY < tamanhoTile) {
            return true;
        }
    }
    
    // Verifica se algum inimigo está nessa posição
    if (window.inimigos && window.inimigos.length > 0) {
        for (let inimigo of window.inimigos) {
            const distX = Math.abs(inimigo.x - pos.x);
            const distY = Math.abs(inimigo.y - pos.y);
            if (distX < tamanhoTile && distY < tamanhoTile) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Verifica se uma coordenada do grid é uma plataforma válida.
 * 
 * @param {string} coord - Coordenada no grid (ex: "b10").
 * @param {array} plataformas - Lista de plataformas da fase.
 * @returns {boolean} True se é uma plataforma.
 */
function ehPlataforma(coord, plataformas) {
    if (!plataformas) return false;
    return plataformas.some(p => p.toLowerCase().trim() === coord.toLowerCase().trim());
}

/**
 * Gera uma posição aleatória válida dentro das plataformas da fase.
 * O inimigo será colocado ACIMA da plataforma (y + 32), não dentro dela.
 * A posição não pode estar ocupada.
 * 
 * @param {array} plataformas - Lista de coordenadas das plataformas.
 * @returns {object} Objeto com x e y em pixels, ou null se nenhuma posição válida for encontrada.
 */
function gerarPosicaoAleatoria(plataformas) {
    if (!plataformas || plataformas.length === 0) return null;
    
    const tamanhoTile = 32;
    const maxTentativas = 50; // Evita loop infinito
    
    // Primeiro: tenta aleatoriamente
    for (let i = 0; i < maxTentativas; i++) {
        // Escolhe uma plataforma aleatória
        const coordAleatoria = plataformas[Math.floor(Math.random() * plataformas.length)];
        const coordLimpa = coordAleatoria.trim().toLowerCase();
        const letra = coordLimpa[0];
        const numero = parseInt(coordLimpa.substring(1));
        
        // Posição base da plataforma
        const row = letra.charCodeAt(0) - 'a'.charCodeAt(0);
        const col = numero - 1;
        const x = col * tamanhoTile;
        const baseY = row * tamanhoTile;
        
        // Tenta colocar o inimigo em diferentes posições acima da plataforma
        for (let offset = 1; offset <= 5; offset++) {
            const y = baseY + (offset * tamanhoTile);
            const posicao = { x, y };
            
            // Verifica se essa posição está vazia
            if (!posicaoOcupada(posicao)) {
                // console.log(`Posição válida encontrada aleatoriamente: (${x}px, ${y}px) acima de ${coordAleatoria}`);
                return posicao;
            }
        }
    }
    
    // Segundo: se não encontrar aleatoriamente, tenta todas as plataformas
    for (let coordAleatoria of plataformas) {
        const coordLimpa = coordAleatoria.trim().toLowerCase();
        const letra = coordLimpa[0];
        const numero = parseInt(coordLimpa.substring(1));
        
        const row = letra.charCodeAt(0) - 'a'.charCodeAt(0);
        const col = numero - 1;
        const x = col * tamanhoTile;
        const baseY = row * tamanhoTile;
        
        // Tenta colocar em posições acima da plataforma
        for (let offset = 1; offset <= 5; offset++) {
            const y = baseY + (offset * tamanhoTile);
            const posicao = { x, y };
            
            if (!posicaoOcupada(posicao)) {
                console.log(`Posição válida encontrada após varredura: (${x}px, ${y}px) acima de ${coordAleatoria}`);
                return posicao;
            }
        }
    }
    
    console.warn("Nenhuma posição disponível para criar inimigo aleatório!");
    return null;
}

/**
 * Cria um inimigo aleatório numa posição aleatória válida dentro das plataformas.
 * O inimigo será colocado sempre ACIMA de uma plataforma, nunca dentro.
 * 
 * @param {array} plataformas - Lista de coordenadas das plataformas.
 * @param {number} tipoEquipamento - Tipo de equipamento do inimigo (0=sem, 1=revólver, 2=escudo).
 */
function criarInimigoAleatorio(plataformas, tipoEquipamento = 0) {
    const posicao = gerarPosicaoAleatoria(plataformas);
    
    if (!posicao) {
        console.warn("Não foi possível criar inimigo aleatório: nenhuma posição disponível.");
        return;
    }
    
    const palco = document.getElementById('game-stage') || document.getElementById('jogo-container');
    if (!palco) return;
    
    const tamanhoTile = 32;
    const imagemInimigo = window.config?.spriteParadoInimigo || 'personagem/Personagem_parado.png';
    
    const inimigoImg = document.createElement('img');
    inimigoImg.src = imagemInimigo;
    inimigoImg.style.position = 'absolute';
    inimigoImg.style.left = posicao.x + 'px';
    inimigoImg.style.bottom = posicao.y + 'px';
    inimigoImg.style.width = tamanhoTile + 'px';
    inimigoImg.style.height = tamanhoTile + 'px';
    inimigoImg.style.imageRendering = 'pixelated';
    inimigoImg.style.zIndex = '4';
    inimigoImg.style.transform = 'scaleX(1)'; // Virado para esquerda inicialmente
    palco.appendChild(inimigoImg);
    
    // Determina tipo e equipamento baseado no parâmetro
    let tipoInimigo = 0; // 0 = melee, 1 = revolver
    let temArma = false;
    let temEscudo = false;
    
    if (tipoEquipamento === 1) {
        tipoInimigo = 1; // Revolver
        temArma = true;
    } else if (tipoEquipamento === 2) {
        temEscudo = true;
    }
    
    // Registra o inimigo na lista global
    const novoInimigo = {
        x: posicao.x,
        y: posicao.y,
        largura: window.config?.HITBOX_LARGURA || 7,
        altura: window.config?.HITBOX_ALTURA || 25,
        elemento: inimigoImg,
        velocidadeY: 0,
        noChao: false, // Force a física a recalcular a colisão no próximo frame
        tipo: tipoInimigo,
        aleatorio: true, // Marca como inimigo aleatório
        temArma: temArma,
        temEscudo: temEscudo,
        escudoVermelho: false,
        escudoProtegido: 0,
        stunned: false, // Adiciona propriedade de stun
        stunTimer: 0,  // Adiciona timer de stun
    };
    
    window.inimigos.push(novoInimigo);
    
    // Cria elemento de arma se necessário
    if (temArma) {
        const armaImg = document.createElement('img');
        armaImg.src = window.config?.spriteArmaPlayer || 'personagem/revolver.png';
        armaImg.style.position = 'absolute';
        armaImg.style.width = tamanhoTile + 'px';
        armaImg.style.height = tamanhoTile + 'px';
        armaImg.style.zIndex = '6';
        armaImg.style.imageRendering = 'pixelated';
        armaImg.style.pointerEvents = 'none';
        palco.appendChild(armaImg);
        novoInimigo.armaElemento = armaImg;
        novoInimigo.municao = window.config?.maxMunicao || 5;
    }
    
    // Cria elemento de escudo se necessário
    if (temEscudo) {
        const escudoImg = document.createElement('img');
        escudoImg.src = window.config?.spriteEscudoPlayer || 'personagem/escudo.png';
        escudoImg.style.position = 'absolute';
        escudoImg.style.width = tamanhoTile + 'px';
        escudoImg.style.height = tamanhoTile + 'px';
        escudoImg.style.zIndex = '7'; // À frente da arma
        escudoImg.style.imageRendering = 'pixelated';
        escudoImg.style.pointerEvents = 'none';
        escudoImg.style.display = 'block';
        palco.appendChild(escudoImg);
        novoInimigo.escudoElemento = escudoImg;
    }
    
    const equipamento = temArma ? 'revólver' : (temEscudo ? 'escudo' : 'sem equipamento');
    console.log(`✓ Inimigo aleatório criado em (${posicao.x}px, ${posicao.y}px) - Equipamento: ${equipamento}`);
}