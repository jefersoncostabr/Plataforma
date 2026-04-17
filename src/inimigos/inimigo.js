/**
 * Lista global para armazenar os dados de todos os inimigos ativos.
 */
window.inimigos = [];

function letrasParaIndiceGridInimigo(letras) {
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

function parseCoordGridInimigo(coord) {
    const match = String(coord || '').trim().toLowerCase().match(/^([a-z]+)(\d+)$/);
    if (!match) return null;

    const numero = parseInt(match[2], 10);
    if (Number.isNaN(numero) || numero <= 0) return null;

    return {
        letras: match[1],
        row: letrasParaIndiceGridInimigo(match[1]),
        col: numero - 1
    };
}

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

    // Converte coordenada (ex: "b10" ou "ab20") para pixels
    const partes = parseCoordGridInimigo(coord);
    if (!partes) return;

    const tamanhoTile = 32;

    const x = partes.col * tamanhoTile;
    const y = partes.row * tamanhoTile;

    const inimigoImg = document.createElement('img');
    inimigoImg.src = imagemPath;
    inimigoImg.style.position = 'absolute';
    inimigoImg.style.left = x + 'px';
    inimigoImg.style.bottom = y + 'px';
    inimigoImg.style.width = tamanhoTile + 'px';
    inimigoImg.style.height = tamanhoTile + 'px';
    inimigoImg.style.imageRendering = 'pixelated';
    inimigoImg.style.transform = direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
    adicionarAoLayer(inimigoImg, window.LAYERS.INIMIGOS);

    // Registra o inimigo para detecção de colisão (inclui física vertical)
    window.inimigos.push({
        x,
        y,
        largura: window.config?.HITBOX_LARGURA || 20,
        altura: window.config?.HITBOX_ALTURA || 30,
        offsetX: window.config?.HITBOX_OFFSET_X || 6,
        elemento: inimigoImg,
        velocidadeY: 0,
        noChao: true,
        tipo: tipo
        ,
        framesKnockbackRestante: 0, // Inicializa frames de knockback
        velocidadeKnockback: 0, // Inicializa velocidade de knockback
        puloTimer: 0, // Inicializa o timer de pulo
        jumpQueued: false // Inicializa a flag de pulo agendado
        ,isEnemy: true // Flag to identify as an enemy
        // Propriedades da Garra para o inimigo
        ,garraAnimEstado: 'idle' // idle, prep, esticando, catching, voltando
        ,garraTimer: 0
        ,garraDist: 0
        ,garraBracos: []
        ,garraItemCarregado: null
    });
    console.log(`Inimigo inserido em ${coord} (x: ${x}, y: ${y})`);
}

/**
 * Converte uma coordenada do grid (ex: "b10") para coordenadas em pixels. 
 * Nomeada como gridParaPixels para manter consistência com o restante do motor.
 * 
 * @param {string} coord - Coordenada no grid.
 * @returns {object} Objeto com x e y em pixels.
 */
window.gridParaPixels = function(coord) {
    const partes = parseCoordGridInimigo(coord);
    if (!partes) return {x:0, y:0, coord: coord};

    const tamanhoTile = 32;
    
    return {
        x: partes.col * tamanhoTile,
        y: partes.row * tamanhoTile,
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
        const partes = parseCoordGridInimigo(coordAleatoria);
        if (!partes) continue;
        
        // Posição base da plataforma
        const x = partes.col * tamanhoTile;
        const baseY = partes.row * tamanhoTile;
        
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
        const partes = parseCoordGridInimigo(coordAleatoria);
        if (!partes) continue;
        
        const x = partes.col * tamanhoTile;
        const baseY = partes.row * tamanhoTile;
        
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
 * @param {number} tipoEquipamento - Tipo de equipamento do inimigo (0=sem, 1=revólver, 2=escudo, 3=bota, 4=jetpack, 5=feno, 6=garra, 7=cinto)
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
    // Define a imagem base: se for tipo 5 (feno), usa o sprite específico
    let imagemInimigo = window.config?.spriteParadoInimigo || '../../assets/personagem/Personagem_parado.png';
    if (tipoEquipamento === 5) {
        imagemInimigo = window.config?.spriteAlvoFeno || '../../assets/personagem/alvoFeno.png';
    }
    
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
    if (typeof adicionarAoLayer === 'function' && window.LAYERS?.INIMIGOS) {
        adicionarAoLayer(inimigoImg, window.LAYERS.INIMIGOS);
    } else {
        palco.appendChild(inimigoImg);
    }
    
    // Determina tipo e equipamento baseado no parâmetro (0=melee, 1=revolver, 2=escudo, 3=bota, 4=jetpack, 5=feno, 6=garra)
    let tipoInimigo = tipoEquipamento; 
    let temArma = false;
    let temEscudo = false;
    let temBota = false;
    let temJetpack = false;
    let temGarra = false;
    let temCinto = false;
    let temColete = false;
    
    if (tipoInimigo === 1) {
        temArma = true;
    } else if (tipoInimigo === 2) {
        temEscudo = true;
    } else if (tipoInimigo === 3) {
        temBota = true;
    } else if (tipoInimigo === 4) {
        temJetpack = true;
    } else if (tipoInimigo === 6) {
        temGarra = true;
    } else if (tipoInimigo === 7) {
        temCinto = true;
    } else if (tipoInimigo === 8) {
        temColete = true;
    }
    
    // Registra o inimigo na lista global
    const novoInimigo = {
        x: posicao.x,
        y: posicao.y,
        largura: window.config?.HITBOX_LARGURA || 20,
        altura: window.config?.HITBOX_ALTURA || 30,
        offsetX: window.config?.HITBOX_OFFSET_X || 6,
        elemento: inimigoImg,
        velocidadeY: 0,
        noChao: false, // Force a física a recalcular a colisão no próximo frame
        tipo: tipoInimigo,
        aleatorio: true, // Marca como inimigo aleatório
        temArma: temArma,
        temEscudo: temEscudo,
        temBota: temBota,
        temJetpack: temJetpack,
        temGarra: temGarra,
        temCinto: temCinto,
        temColete: temColete,
        escudoVermelho: false,
        escudoProtegido: 0,
        stunned: false, // Adiciona propriedade de stun
        stunTimer: 0,  // Adiciona timer de stun
        framesKnockbackRestante: 0, // Inicializa frames de knockback
        velocidadeKnockback: 0, // Inicializa velocidade de knockback
        puloTimer: 0, // Inicializa o timer de pulo
        jumpQueued: false // Inicializa a flag de pulo agendado
        ,isEnemy: true // Flag to identify as an enemy
        // Propriedades da Garra para o inimigo
        ,garraAnimEstado: 'idle' // idle, prep, esticando, catching, voltando
        ,garraTimer: 0
        ,garraDist: 0
        ,garraBracos: []
        ,garraItemCarregado: null
        ,itensGuardadosNoCinto: false
        ,cintoAnimando: false
        ,cintoAnimTimeout: null
        ,cintoAnimClones: []
    };
    
    window.inimigos.push(novoInimigo);
    
    // Cria elemento de arma se necessário
    if (temArma) {
        const armaImg = document.createElement('img');
        armaImg.src = window.config?.spriteArmaPlayer || '../../assets/personagem/revolver.png';
        armaImg.style.position = 'absolute';
        armaImg.style.width = tamanhoTile + 'px';
        armaImg.style.height = tamanhoTile + 'px';
        armaImg.style.zIndex = '6';
        armaImg.style.imageRendering = 'pixelated';
        armaImg.style.pointerEvents = 'none';
        if (typeof adicionarAoLayer === 'function' && window.LAYERS?.INIMIGOS) {
            adicionarAoLayer(armaImg, window.LAYERS.INIMIGOS);
        } else {
            palco.appendChild(armaImg);
        }
        novoInimigo.armaElemento = armaImg;
        novoInimigo.municao = window.config?.maxMunicao || 5;
    }
    
    // Cria elemento de escudo se necessário
    if (temEscudo) {
        const escudoImg = document.createElement('img');
        escudoImg.src = window.config?.spriteEscudoPlayer || '../../assets/personagem/escudo.png';
        escudoImg.style.position = 'absolute';
        escudoImg.style.width = tamanhoTile + 'px';
        escudoImg.style.height = tamanhoTile + 'px';
        escudoImg.style.zIndex = '7'; // À frente da arma
        escudoImg.style.imageRendering = 'pixelated';
        escudoImg.style.pointerEvents = 'none';
        escudoImg.style.display = 'block';
        if (typeof adicionarAoLayer === 'function' && window.LAYERS?.INIMIGOS) {
            adicionarAoLayer(escudoImg, window.LAYERS.INIMIGOS);
        } else {
            palco.appendChild(escudoImg);
        }
        novoInimigo.escudoElemento = escudoImg;
    }

    // Cria elemento de bota se necessário
    if (temBota) {
        const botaImg = document.createElement('img');
        botaImg.src = window.config?.spriteBotaParado || '../../assets/personagem/bota_parado.png';
        botaImg.style.position = 'absolute';
        botaImg.style.width = tamanhoTile + 'px';
        botaImg.style.height = tamanhoTile + 'px';
        botaImg.style.zIndex = '8';
        botaImg.style.imageRendering = 'pixelated';
        botaImg.style.pointerEvents = 'none';
        if (typeof adicionarAoLayer === 'function' && window.LAYERS?.INIMIGOS) {
            adicionarAoLayer(botaImg, window.LAYERS.INIMIGOS);
        } else {
            palco.appendChild(botaImg);
        }
        novoInimigo.botaElemento = botaImg;
    }

    // Cria elemento de jetpack se necessário
    if (temJetpack) {
        const jetpackImg = document.createElement('img');
        jetpackImg.src = window.config?.spriteJetpackPlayer || '../../assets/personagem/jetpack.png';
        jetpackImg.style.position = 'absolute';
        jetpackImg.style.width = tamanhoTile + 'px';
        jetpackImg.style.height = tamanhoTile + 'px';
        jetpackImg.style.zIndex = '3';
        jetpackImg.style.imageRendering = 'pixelated';
        jetpackImg.style.pointerEvents = 'none';
        if (typeof adicionarAoLayer === 'function' && window.LAYERS?.INIMIGOS) {
            adicionarAoLayer(jetpackImg, window.LAYERS.INIMIGOS);
        } else {
            palco.appendChild(jetpackImg);
        }
        novoInimigo.jetpackElemento = jetpackImg;
    }

    // Cria elemento de garra se necessário
    if (temGarra) {
        const garraImg = document.createElement('img');
        garraImg.src = window.config?.spriteGarraPlayer || '../../assets/personagem/garra.png';
        garraImg.style.position = 'absolute';
        garraImg.style.width = tamanhoTile + 'px';
        garraImg.style.height = tamanhoTile + 'px';
        garraImg.style.zIndex = '9';
        garraImg.style.imageRendering = 'pixelated';
        garraImg.style.pointerEvents = 'none';
        if (typeof adicionarAoLayer === 'function' && window.LAYERS?.INIMIGOS) {
            adicionarAoLayer(garraImg, window.LAYERS.INIMIGOS);
        } else {
            palco.appendChild(garraImg);
        }
        novoInimigo.garraElemento = garraImg;
    }

    // Cria elemento de cinto se necessário
    if (temCinto) {
        // Remove cintos antigos do palco se existirem (defensivo)
        if (novoInimigo.cintoElemento && novoInimigo.cintoElemento.parentElement) {
            novoInimigo.cintoElemento.remove();
        }
        const cintoImg = document.createElement('img');
        cintoImg.src = window.config?.spriteCintoPlayer || '../../assets/personagem/cinto.png';
        cintoImg.style.position = 'absolute';
        cintoImg.style.width = tamanhoTile + 'px';
        cintoImg.style.height = tamanhoTile + 'px';
        cintoImg.style.zIndex = '6';
        cintoImg.style.imageRendering = 'pixelated';
        cintoImg.style.pointerEvents = 'none';
        // Sempre usa adicionarAoLayer se disponível
        if (typeof adicionarAoLayer === 'function' && window.LAYERS?.INIMIGOS) {
            adicionarAoLayer(cintoImg, window.LAYERS.INIMIGOS);
        } else {
            palco.appendChild(cintoImg);
        }
        novoInimigo.cintoElemento = cintoImg;
    }

    // Cria elemento de colete se necessário
    if (temColete) {
        const coleteImg = document.createElement('img');
        coleteImg.src = window.config?.spriteColeteParado || '../../assets/personagem/colete.png';
        coleteImg.style.position = 'absolute';
        coleteImg.style.width = tamanhoTile + 'px';
        coleteImg.style.height = tamanhoTile + 'px';
        coleteImg.style.zIndex = '6';
        coleteImg.style.imageRendering = 'pixelated';
        coleteImg.style.pointerEvents = 'none';
        if (typeof adicionarAoLayer === 'function' && window.LAYERS?.INIMIGOS) {
            adicionarAoLayer(coleteImg, window.LAYERS.INIMIGOS);
        } else {
            palco.appendChild(coleteImg);
        }
        novoInimigo.coleteElemento = coleteImg;
    }
}
