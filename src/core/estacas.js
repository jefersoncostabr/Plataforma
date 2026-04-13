/**
 * ═══════════════════════════════════════════════════════════════════════
 * SISTEMA DE ESTACAS (SPIKES) - LÓGICA ISOLADA
 * ═══════════════════════════════════════════════════════════════════════
 * 
 * Este módulo concentra TODA a lógica de colisão com estacas para estudo
 * e debug isolado do resto do sistema.
 * 
 * ESTRUTURA DE UMA ESTACA:
 * {
 *   tipo: 'estaca',
 *   direcao: 'cima' | 'baixo' | 'direita' | 'esquerda',
 *   width: 16,      // Largura da área colisível (padrão: 16)
 *   height: 16,     // Altura da área colisível (padrão: 16)
 *   xOffset: 0,     // Deslocamento horizontal
 *   yOffset: 0      // Deslocamento vertical
 * }
 */

const ESTACA_EPSILON = 0.01;
const TAMANHO_TILE = 32;

/**
 * Calcula as coordenadas reais de uma estaca baseado na direção
 * 
 * @param {number} r - Índice da linha (0-based)
 * @param {number} c - Índice da coluna (0-based)
 * @param {Object} bloco - Objeto estaca com {direcao, width, height, xOffset, yOffset}
 * @returns {Object} Coordenadas reais da colisão: {topo, base, esquerda, direita}
 * 
 * VISUALIZAÇÃO DOS TILES:
 * ```
 *     0        32        64       (X)
 *     +--------+--------+
 *  0  |        |        |
 *     |   A    |   B    |
 * 32  +--------+--------+
 *     |        |        |
 *     |   C    |   D    |
 * 64  +--------+--------+
 *    (Y)
 * 
 * Exemplo: c=1, r=1 = célula D
 * - tileEsquerda = 1 * 32 = 32
 * - tileDireita = 2 * 32 = 64
 * - tileBaixo = 1 * 32 = 32
 * - tileTopo = 2 * 32 = 64
 * ```
 */
function calcularCoordenadosEstaca(r, c, bloco) {
    const tileEsquerda = c * TAMANHO_TILE;
    const tileDireita = (c + 1) * TAMANHO_TILE;
    const tileBaixo = r * TAMANHO_TILE;
    const tileTopo = (r + 1) * TAMANHO_TILE;

    const width = bloco.width || 16;
    const height = bloco.height || 16;
    const xOffset = bloco.xOffset || 0;
    const yOffset = bloco.yOffset || 0;

    const coords = {
        tileEsquerda,
        tileDireita,
        tileBaixo,
        tileTopo,
        width,
        height,
        xOffset,
        yOffset
    };

    return coords;
}

/**
 * ⚠️ ESTACA PARA CIMA
 * Pontas apontando para cima. O jogador não pode atravessar o topo.
 * 
 * Visualização:
 * ```
 * Bloco: [32][64] x [0][32]
 * 
 *   32    64 (X)
 * +-----+
 * | /\  |  <- Estacas apontando para CIMA
 * |/  \ |     yOffset tipicamente = 0
 * +-----+  32
 *     (Y)
 * ```
 * 
 * @param {number} r - Linha do tile
 * @param {number} c - Coluna do tile
 * @param {Object} bloco - Propriedades da estaca
 * @param {number} x - Posição X do jogador
 * @param {number} y - Posição Y do jogador
 * @param {number} largura - Largura do jogador
 * @param {number} altura - Altura do jogador
 * @returns {Object|false} Dados de colisão ou false
 */
function verificarEstacaCima(r, c, bloco, x, y, largura, altura) {
    const coords = calcularCoordenadosEstaca(r, c, bloco);
    
    // A estaca ocupa a PARTE INFERIOR do tile (base sólida); as pontas ficam na parte superior sem colisão
    const topoReal = coords.tileTopo - coords.yOffset;
    const baseReal = topoReal - coords.height;
    const esquerdaReal = coords.tileEsquerda;
    const direitaReal = coords.tileDireita;

    // Colisão vertical: bloqueia quem cai sobre a metade sólida
    const colisaoVertical = (y + altura > baseReal && y < topoReal);

    // Colisão lateral: bloqueia entrada pelos lados apenas na metade sólida
    const colisaoX = (x + largura > esquerdaReal && x < direitaReal);
    const colisaoY = (y + altura > baseReal && y < topoReal);
    const colisaoLateral = colisaoX && colisaoY;

    if (colisaoVertical || colisaoLateral) {
        return {
            tipo: 'estaca',
            direcao: 'cima',
            topoReal,
            baseReal,
            esquerdaReal,
            direitaReal,
            temColisaoVertical: true,
            temColisaoLateral: colisaoLateral
        };
    }
    return false;
}

/**
 * ⚠️ ESTACA PARA BAIXO
 * Pontas apontando para baixo. O jogador não pode atravessar a base (metade superior).
 * Atravessa a parte inferior (onde estão as pontas).
 * 
 * Visualização:
 * ```
 * Bloco: [32][64] x [32][64]
 * 
 *   32    64 (X)
 * +-----+
 * |\  / |     height tipicamente = 16 (metade superior - sólida)
 * | \/ |  <- Estacas apontando para BAIXO
 * +-----+  32
 *     (Y)
 *     (pontas da parte inferior podem ser atravessadas verticalmente)
 * ```
 */
function verificarEstacaBaixo(r, c, bloco, x, y, largura, altura) {
    const coords = calcularCoordenadosEstaca(r, c, bloco);
    
    // A estaca ocupa a PARTE SUPERIOR do tile (base sólida); as pontas ficam na parte inferior sem colisão
    const topoReal = coords.tileTopo - coords.yOffset;
    const baseReal = topoReal - coords.height;
    const esquerdaReal = coords.tileEsquerda;
    const direitaReal = coords.tileDireita;

    // Colisão vertical (bloqueio ao cair de cima)
    const colisaoVertical = (y + altura > baseReal && y < topoReal);
    
    // Colisão lateral (da metade superior apenas)
    const colisaoX = (x + largura > esquerdaReal && x < direitaReal);
    const colisaoY = (y + altura > baseReal && y < topoReal);
    const colisaoLateral = colisaoX && colisaoY;

    if (colisaoVertical || colisaoLateral) {
        return {
            tipo: 'estaca',
            direcao: 'baixo',
            topoReal,
            baseReal,
            esquerdaReal,
            direitaReal,
            temColisaoVertical: true,
            temColisaoLateral: colisaoLateral
        };
    }
    return false;
}

/**
 * ⚠️ ESTACA PARA DIREITA
 * Pontas apontando para direita. Bloqueia quem vem pela ESQUERDA.
 * 
 * Visualização:
 * ```
 * Bloco: [32][64] x [0][32]
 * 
 *   32    64 (X)
 * +-----+
 * |  > |  <- Estacas apontando para DIREITA
 * | > <|     Colisão na ESQUERDA (xOffset típico: 16)
 * +-----+  32
 *     (Y)
 * 
 * Se xOffset=16:
 * - esquerdaReal = 64 - 16 = 48
 * - direitaReal = 64
 * - Bloqueia X entre 48 e 64
 * ```
 */
function verificarEstacaDireita(r, c, bloco, x, y, largura, altura) {
    const coords = calcularCoordenadosEstaca(r, c, bloco);
    
    // xOffset é medido a partir da esquerda do tile.
    // Para estaca apontando para direita, a base sólida fica na metade esquerda por padrão.
    const esquerdaReal = coords.tileEsquerda + coords.xOffset;
    const direitaReal = esquerdaReal + coords.width;

    // Colisão na LATERAL: verifica X e Y completo
    const colisaoX = (x + largura > esquerdaReal && x < direitaReal);
    const colisaoY = (y + altura > coords.tileBaixo && y < coords.tileTopo);

    if (colisaoX && colisaoY) {
        return {
            tipo: 'estaca',
            direcao: 'direita',
            direitaReal,
            esquerdaReal,
            topoReal: coords.tileTopo,
            baseReal: coords.tileBaixo,
            temColisaoVertical: false,
            temColisaoLateral: true
        };
    }
    return false;
}

/**
 * ⚠️ ESTACA PARA ESQUERDA
 * Pontas apontando para esquerda. Bloqueia quem vem pela DIREITA.
 * 
 * Visualização:
 * ```
 * Bloco: [32][64] x [0][32]
 * 
 *   32    64 (X)
 * +-----+
 * | <  |  <- Estacas apontando para ESQUERDA
 * |> < |     Colisão na DIREITA (xOffset típico: 0)
 * +-----+  32
 *     (Y)
 * 
 * Se xOffset=0 e width=16:
 * - esquerdaReal = 32 + 0 = 32
 * - direitaReal = 32 + 16 = 48
 * - Bloqueia X entre 32 e 48
 * ```
 */
function verificarEstacaEsquerda(r, c, bloco, x, y, largura, altura) {
    const coords = calcularCoordenadosEstaca(r, c, bloco);
    
    // xOffset é medido a partir da esquerda do tile.
    // Para estaca apontando para esquerda, a base sólida fica na metade direita por padrão.
    const esquerdaReal = coords.tileEsquerda + coords.xOffset;
    const direitaReal = esquerdaReal + coords.width;

    const colisaoX = (x + largura > esquerdaReal && x < direitaReal);
    const colisaoY = (y + altura > coords.tileBaixo && y < coords.tileTopo);

    if (colisaoX && colisaoY) {
        return {
            tipo: 'estaca',
            direcao: 'esquerda',
            direitaReal,
            esquerdaReal,
            topoReal: coords.tileTopo,
            baseReal: coords.tileBaixo,
            temColisaoVertical: false,
            temColisaoLateral: true
        };
    }
    return false;
}

/**
 * FUNÇÃO PRINCIPAL: Verifica colisão com qualquer tipo de estaca
 * 
 * @param {number} r - Linha do tile
 * @param {number} c - Coluna do tile
 * @param {Object} bloco - Objeto estaca
 * @param {number} x - Posição X do jogador
 * @param {number} y - Posição Y do jogador
 * @param {number} largura - Largura do jogador
 * @param {number} altura - Altura do jogador
 * @returns {Object|false} Dados de colisão ou false
 */
function verificarColisaoEstaca(r, c, bloco, x, y, largura, altura) {
    if (bloco.tipo !== 'estaca') {
        return false;
    }

    switch (bloco.direcao) {
        case 'cima':
            return verificarEstacaCima(r, c, bloco, x, y, largura, altura);
        case 'baixo':
            return verificarEstacaBaixo(r, c, bloco, x, y, largura, altura);
        case 'direita':
            return verificarEstacaDireita(r, c, bloco, x, y, largura, altura);
        case 'esquerda':
            return verificarEstacaEsquerda(r, c, bloco, x, y, largura, altura);
        default:
            console.warn(`Direção de estaca desconhecida: ${bloco.direcao}`);
            return false;
    }
}

/**
 * Calcula o snap (ajuste de posição) ao colidir com estaca
 * 
 * @param {number} posicaoAtual - Posição atual do player (X ou Y)
 * @param {number} offsetObjeto - Offset do objeto (offsetX ou offsetY)
 * @param {number} tamanhoObjeto - Largura ou altura do objeto
 * @param {Object} colisao - Objeto retornado por verificarColisaoEstaca
 * @param {string} direcao - Direção do movimento: 'direita' | 'esquerda' | 'cima' | 'baixo'
 * @returns {number} Nova posição do player após snap
 */
function aplicarSnapEstaca(posicaoAtual, offsetObjeto, tamanhoObjeto, colisao, direcao) {
    if (!colisao || colisao.tipo !== 'estaca') {
        return posicaoAtual;
    }

    const epsilon = ESTACA_EPSILON;

    switch (direcao) {
        case 'direita':
            // Vindo pela esquerda, para na borda esquerda da estaca
            return colisao.esquerdaReal - tamanhoObjeto - offsetObjeto - epsilon;

        case 'esquerda':
            // Vindo pela direita, para na borda direita da estaca
            return colisao.direitaReal - offsetObjeto + epsilon;

        case 'cima':
            // Caindo de cima, para no topo da estaca
            return colisao.topoReal;

        case 'baixo':
            // Subindo de baixo, para na base da estaca
            return colisao.baseReal - tamanhoObjeto;

        default:
            return posicaoAtual;
    }
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORTAR PARA USO EM OUTROS MÓDULOS
// ═══════════════════════════════════════════════════════════════════════

// Para uso em Node.js / ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        verificarColisaoEstaca,
        aplicarSnapEstaca,
        calcularCoordenadosEstaca,
        verificarEstacaCima,
        verificarEstacaBaixo,
        verificarEstacaDireita,
        verificarEstacaEsquerda
    };
}


