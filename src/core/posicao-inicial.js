/**
 * Define a posição inicial e a direção do personagem no palco.
 * 
 * @param {string} id - O ID do elemento HTML do personagem.
 * @param {number} x - Posição horizontal em pixels (esquerda para direita).
 * @param {number} y - Posição vertical em pixels (de baixo para cima).
 * @param {string} direcao - 'd' para direita (padrão) ou 'e' para esquerda (espelhado).
 */
function configurarPosicaoInicial(id, x, y, direcao) {
    const elemento = document.getElementById(id);
    if (!elemento) return;

    elemento.style.left = x + 'px';
    elemento.style.bottom = y + 'px';

    // Aplica o espelhamento se a direção for 'e' (esquerda)
    elemento.style.transform = direcao === 'e' ? 'scaleX(-1)' : 'scaleX(1)';
}

