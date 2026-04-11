/**
 * Margem de segurança mínima para evitar erros de precisão em ponto flutuante.
 */
const EPSILON = 0.01;

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
function limitarPosicaoAoPalco(x, y, largura, altura, palcoLargura, palcoAltura, chaoAltura = 32) {
    const maxW = palcoLargura || window.mundoLargura || 640;
    const maxH = palcoAltura || window.mundoAltura || 480;

    const ajustado = {
        x: Math.max(0, Math.min(maxW - largura, x)),
        y: Math.max(chaoAltura, Math.min(maxH - altura, y))
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
    const colFim = Math.floor((x + largura - EPSILON) / 32);
    const rowInicio = Math.floor(y / 32);
    const rowFim = Math.floor((y + altura - EPSILON) / 32);

    for (let r = rowInicio; r <= rowFim; r++) {
        for (let c = colInicio; c <= colFim; c++) {
            // Suporte para coordenadas expandidas (a...z, aa, ab...)
            const letra = r < 26 
                ? String.fromCharCode(97 + r) 
                : String.fromCharCode(97 + Math.floor(r/26) - 1) + String.fromCharCode(97 + (r % 26));
            const coord = letra + (c + 1);
            
            const bloco = plataformaObj[coord];
            if (bloco) {
                // Se for um bloco sólido padrão (true), colisão em todo o tile 32x32
                if (bloco === true) {
                    return { tipo: 'solido', topoReal: (r + 1) * 32, baseReal: r * 32 };
                }

                // Se for um bloco com propriedades especiais (ex: estaca superior)
                if (bloco.tipo === 'estaca') {
                    const tileTopo = (r + 1) * 32;
                    const topoReal = tileTopo - (bloco.yOffset || 0);
                    const baseReal = topoReal - bloco.height;

                    // Verifica se a hitbox do personagem (y até y+altura) entra na área da estaca
                    if (y + altura > baseReal && y < topoReal) {
                        // console.log(`[Colisão Estaca] Coord: ${coord} | Y_Topo: ${(y + altura).toFixed(1)} | Base_Hitbox: ${baseReal}`);
                        return { tipo: 'estaca', topoReal: topoReal, baseReal: baseReal };
                    }
                }
            }
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