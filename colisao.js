/**
 * Garante que um objeto permaneça dentro dos limites do palco.
 * 
 * @param {number} x - Posição X atual.
 * @param {number} y - Posição Y atual.
 * @param {number} largura - Largura do objeto (ex: 32).
 * @param {number} altura - Altura do objeto (ex: 32).
 * @param {number} palcoLargura - Largura total do palco (padrão 640).
 * @param {number} palcoAltura - Altura total do palco (padrão 480).
 * @param {number} chaoAltura - Altura do chão para colisão (padrão 32).
 * @returns {Object} Objeto com as coordenadas {x, y} ajustadas.
 */
function limitarPosicaoAoPalco(x, y, largura, altura, palcoLargura = 640, palcoAltura = 480, chaoAltura = 32) {
    const ajustado = {
        x: Math.max(0, Math.min(palcoLargura - largura, x)),
        y: Math.max(chaoAltura, Math.min(palcoAltura - altura, y))
    };
    return ajustado;
}

/**
 * Verifica se uma determinada posição X, Y colide com as plataformas designadas.
 */
function verificarColisaoComTiles(x, y, largura, altura, plataformaObj) {
    if (!plataformaObj) return false;

    // Calcula quais colunas e linhas do grid o personagem está ocupando
    const colInicio = Math.floor(x / 32);
    const colFim = Math.floor((x + largura - 0.1) / 32);
    const rowInicio = Math.floor(y / 32);
    const rowFim = Math.floor((y + altura - 0.1) / 32);

    for (let r = rowInicio; r <= rowFim; r++) {
        for (let c = colInicio; c <= colFim; c++) {
            const coord = String.fromCharCode(97 + r) + (c + 1);
            if (plataformaObj[coord]) return true;
        }
    }
    return false;
}

/**
 * Verifica colisão entre dois objetos (ex: Player e Inimigo) com ajuste de margem (padding).
 * Permite valores diferentes para horizontal e vertical para criar hitboxes personalizadas.
 * 
 * @param {Object} objA - Objeto com {x, y, largura, altura}
 * @param {Object} objB - Objeto com {x, y, largura, altura}
 * @param {number} pX - Margem lateral (esquerda e direita).
 * @param {number} pTopo - Margem superior.
 * @param {number} pBase - Margem inferior.
 * @returns {boolean} True se houver colisão.
 */
function detectarColisaoHitbox(objA, objB, pX = 4, pTopo = 4, pBase = 4) {
    // Define as caixas de colisão reduzidas pelo padding
    const a = {
        esquerda: objA.x + pX,
        direita: objA.x + objA.largura - pX,
        topo: objA.y + objA.altura - pTopo,
        base: objA.y + pBase
    };

    const b = {
        esquerda: objB.x + pX,
        direita: objB.x + objB.largura - pX,
        topo: objB.y + objB.altura - pTopo,
        base: objB.y + pBase
    };

    // Verifica se os retângulos se sobrepõem
    return (a.esquerda < b.direita &&
            a.direita > b.esquerda &&
            a.topo > b.base &&
            a.base < b.topo);
}