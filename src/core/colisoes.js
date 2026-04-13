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
 * ⚠️ SISTEMA DE ESTACAS (SPIKES):
 * - ESTACA_DIR: Pontas para direita, colisão na ESQUERDA do bloco (xOffset: 16)
 * - ESTACA_ESQ: Pontas para esquerda, colisão na DIREITA do bloco (xOffset: 16)
 * - ESTACA_BAIXO: Pontas para baixo, colisão na PARTE SUPERIOR (yOffset: 0)
 * Retorna objeto com: {tipo, direcao, esquerdaReal, direitaReal, topoReal, baseReal}
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

                // Se for um bloco com propriedades especiais (ex: estaca em várias direções)
                if (bloco.tipo === 'estaca') {
                    const tileEsquerda = c * 32;
                    const tileDireita = (c + 1) * 32;
                    const tileBaixo = r * 32;
                    const tileTopo = (r + 1) * 32;

                    // ESTACA PARA CIMA
                    if (bloco.direcao === 'cima') {
                        const topoReal = tileTopo - (bloco.yOffset || 0); // Deslocamento a partir do topo do tile
                        const baseReal = topoReal - (bloco.height || 16); // Altura real da área de perigo
                        const esquerdaReal = tileEsquerda;
                        const direitaReal = tileDireita;
                        const colisaoVertical = (y + altura > baseReal && y < topoReal);
                        const colisaoX = (x + largura > esquerdaReal && x < direitaReal);
                        const colisaoY = (y + altura > baseReal && y < topoReal);
                        const colisaoLateral = colisaoX && colisaoY;
                        if (colisaoVertical || colisaoLateral) {
                            return {
                                tipo: 'estaca',
                                direcao: 'cima',
                                topoReal: topoReal,
                                baseReal: baseReal,
                                esquerdaReal: esquerdaReal,
                                direitaReal: direitaReal,
                                temColisaoVertical: true,
                                temColisaoLateral: colisaoLateral
                            };
                        }
                    }
                    // ESTACA PARA BAIXO - Colisão vertical + lateral na metade superior
                    else if (bloco.direcao === 'baixo') {
                        const topoReal = tileTopo - (bloco.yOffset || 0); // Deslocamento a partir do topo do tile (base da estaca)
                        const baseReal = topoReal - (bloco.height || 16); // Altura real da área de colisão (metade superior)
                        const esquerdaReal = tileEsquerda;
                        const direitaReal = tileDireita;

                        // Colisão vertical (bloqueio ao cair de cima)
                        const colisaoVertical = (y + altura > baseReal && y < topoReal);

                        // Colisão lateral (bloqueia entrada pelos lados apenas na metade superior)
                        const colisaoX = (x + largura > esquerdaReal && x < direitaReal);
                        const colisaoY = (y + altura > baseReal && y < topoReal);
                        const colisaoLateral = colisaoX && colisaoY;

                        if (colisaoVertical || colisaoLateral) {
                            return { 
                                tipo: 'estaca', 
                                direcao: 'baixo', 
                                topoReal: topoReal, 
                                baseReal: baseReal,
                                esquerdaReal: esquerdaReal,
                                direitaReal: direitaReal,
                                temColisaoVertical: true,
                                temColisaoLateral: colisaoLateral
                            };
                        }
                    }
                    // ESTACA PARA DIREITA
                    // ⚠️ ESTACA PARA DIREITA - Colisão lateral na metade esquerda
                    // Spikes apontam para direita, então bloqueia quem vem pela esquerda
                    else if (bloco.direcao === 'direita') {
                        const esquerdaReal = tileEsquerda + (bloco.xOffset || 0);
                        const direitaReal = esquerdaReal + (bloco.width || 16);
                        
                        // Colisão lateral: verifica X e usa TODA a altura do bloco (Y)
                        const colisaoX = (x + largura > esquerdaReal && x < direitaReal);
                        const colisaoY = (y + altura > tileBaixo && y < tileTopo);
                        
                        if (colisaoX && colisaoY) {
                            return { tipo: 'estaca', direcao: 'direita', direitaReal: direitaReal, esquerdaReal: esquerdaReal, topoReal: tileTopo, baseReal: tileBaixo, temColisaoVertical: false, temColisaoLateral: true };
                        }
                    }
                    // ⚠️ ESTACA PARA ESQUERDA - Colisão lateral na metade direita
                    // Spikes apontam para esquerda, então bloqueia quem vem pela direita
                    else if (bloco.direcao === 'esquerda') {
                        const esquerdaReal = tileEsquerda + (bloco.xOffset || 0);
                        const direitaReal = esquerdaReal + (bloco.width || 16);
                        
                        // Colisão lateral: verifica X e usa TODA a altura do bloco (Y)
                        const colisaoX = (x + largura > esquerdaReal && x < direitaReal);
                        const colisaoY = (y + altura > tileBaixo && y < tileTopo);
                        
                        if (colisaoX && colisaoY) {
                            return { tipo: 'estaca', direcao: 'esquerda', direitaReal: direitaReal, esquerdaReal: esquerdaReal, topoReal: tileTopo, baseReal: tileBaixo, temColisaoVertical: false, temColisaoLateral: true };
                        }
                    }
                }

                // Meio-blocos (sem dano): mesma geometria de up/down, mas sem tipo estaca
                if (bloco.tipo === 'meio') {
                    const tileEsquerda = c * 32;
                    const tileDireita = (c + 1) * 32;
                    const tileBaixo = r * 32;
                    const tileTopo = (r + 1) * 32;

                    if (bloco.direcao === 'superior') {
                        const topoReal = tileTopo - (bloco.yOffset || 0);
                        const baseReal = topoReal - (bloco.height || 16);
                        const esquerdaReal = tileEsquerda;
                        const direitaReal = tileDireita;

                        const colisaoVertical = (y + altura > baseReal && y < topoReal);
                        const colisaoX = (x + largura > esquerdaReal && x < direitaReal);
                        const colisaoY = (y + altura > baseReal && y < topoReal);
                        const colisaoLateral = colisaoX && colisaoY;

                        if (colisaoVertical || colisaoLateral) {
                            return {
                                tipo: 'meio',
                                direcao: 'superior',
                                topoReal,
                                baseReal,
                                esquerdaReal,
                                direitaReal,
                                temColisaoVertical: true,
                                temColisaoLateral: colisaoLateral
                            };
                        }
                    } else if (bloco.direcao === 'inferior') {
                        const topoReal = tileTopo - (bloco.yOffset || 0);
                        const baseReal = topoReal - (bloco.height || 16);
                        const esquerdaReal = tileEsquerda;
                        const direitaReal = tileDireita;

                        const colisaoVertical = (y + altura > baseReal && y < topoReal);
                        const colisaoX = (x + largura > esquerdaReal && x < direitaReal);
                        const colisaoY = (y + altura > baseReal && y < topoReal);
                        const colisaoLateral = colisaoX && colisaoY;

                        if (colisaoVertical || colisaoLateral) {
                            return {
                                tipo: 'meio',
                                direcao: 'inferior',
                                topoReal,
                                baseReal,
                                esquerdaReal,
                                direitaReal,
                                temColisaoVertical: true,
                                temColisaoLateral: colisaoLateral
                            };
                        }
                    }
                }
            }
        }
    }
    return false;
}

/**
 * ⚠️ FUNÇÃO CENTRALIZADA DE SNAP - Alternativa 2
 * Remove duplicação de código em movimentacao.js
 * 
 * Calcula a nova posição do player ao colidir, considerando tipo de bloco
 * @param {number} posicaoAtual - Posição atual do player (X ou Y)
 * @param {number} offsetObjeto - Offset do objeto (offsetX ou offsetY)
 * @param {number} tamanhoObjeto - Largura ou altura do objeto
 * @param {Object} colisao - Objeto retornado por verificarColisaoComTiles
 * @param {string} direcao - 'direita', 'esquerda', 'cima', 'baixo'
 * @returns {number} Nova posição do player após snap
 */
function aplicarSnapColisao(posicaoAtual, offsetObjeto, tamanhoObjeto, colisao, direcao) {
    if (!colisao) return posicaoAtual;
    
    // Se for ESTACA, usa as coordenadas precisas retornadas por verificarColisaoComTiles
    if (colisao.tipo === 'estaca' || colisao.tipo === 'meio') {
        switch(direcao) {
            case 'direita':
                // Vindo pela esquerda, para na borda esquerda da colisão
                return colisao.esquerdaReal - tamanhoObjeto - offsetObjeto - EPSILON;
            case 'esquerda':
                // Vindo pela direita, para na borda direita da colisão
                return colisao.direitaReal - offsetObjeto + EPSILON;
            case 'cima':
                // Caindo de cima, para no topo da colisão
                return colisao.topoReal;
            case 'baixo':
                // Subindo de baixo, para na base da colisão
                return colisao.baseReal - tamanhoObjeto;
        }
    }
    
    // Se for BLOCO SÓLIDO NORMAL, usa snap ao grid 32px
    switch(direcao) {
        case 'direita':
            // Grid snap para direita
            return Math.floor((posicaoAtual + offsetObjeto + tamanhoObjeto) / 32) * 32 - tamanhoObjeto - offsetObjeto - EPSILON;
        case 'esquerda':
            // Grid snap para esquerda
            return (Math.floor((posicaoAtual + offsetObjeto) / 32) + 1) * 32 - offsetObjeto + EPSILON;
        case 'cima':
            // Grid snap para cima
            return Math.floor((posicaoAtual + EPSILON) / 32 + 1) * 32;
        case 'baixo':
            // Grid snap para baixo
            return Math.floor((posicaoAtual + tamanhoObjeto) / 32) * 32 - tamanhoObjeto;
    }
    
    return posicaoAtual;
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

