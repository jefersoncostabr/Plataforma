/**
 * Módulo de Efeitos Visuais do Jogo
 * Contém funções para criar efeitos visuais como flash, pisca, etc.
 */

function obterFiltroFlashBrancoInterno() {
    return 'brightness(0) saturate(0) invert(1) brightness(1.25) contrast(1.1)';
}

/**
 * Faz um elemento piscar com um flash branco.
 * Cria um efeito visual de impacto/dano.
 *
 * @param {HTMLElement} elemento - O elemento a ser afetado.
 * @param {number} duracao - Duração total do efeito em milissegundos (padrão: 200ms).
 * @param {number} velocidade - Número de piscadas por segundo (padrão: 5).
 */
function flashElement(elemento, duracao = 200, velocidade = 5) {
    if (!elemento) return;

    // Salva o filter original
    const filterOriginal = elemento.style.filter;

    // Duração de cada piscada em ms
    const tempoIntervalo = 1000 / velocidade;
    const totalPiscadas = Math.ceil((duracao / tempoIntervalo) / 2);
    let contador = 0;

    const intervalo = setInterval(() => {
        contador++;

        if (contador % 2 === 1) {
            // Aplica um flash branco interno no sprite, sem brilho externo.
            elemento.style.filter = obterFiltroFlashBrancoInterno();
        } else {
            // Remove o efeito
            elemento.style.filter = filterOriginal || 'none';
        }

        // Para o intervalo após atingir o número de piscadas
        if (contador >= totalPiscadas * 2) {
            clearInterval(intervalo);
            elemento.style.filter = filterOriginal || 'none'; // Garante que volta ao normal
        }
    }, tempoIntervalo);
}

/**
 * Versão simplificada do flash - apenas um breve pisca branco.
 * Útil para feedback visual rápido.
 *
 * @param {HTMLElement} elemento - O elemento a ser afetado.
 */
function flashRapido(elemento) {
    if (!elemento) return;

    const filterOriginal = elemento.style.filter;

    // Flash branco por 100ms
    elemento.style.filter = 'brightness(2) drop-shadow(0 0 10px rgba(255, 255, 255, 0.9))';

    setTimeout(() => {
        elemento.style.filter = filterOriginal || 'none';
    }, 100);
}

/**
 * Faz um elemento piscar levemente (para dano sutil).
 * Menos intrusivo que o flashElement padrão.
 *
 * @param {HTMLElement} elemento - O elemento a ser afetado.
 */
function piscaLeve(elemento) {
    if (!elemento) return;

    const filterOriginal = elemento.style.filter;

    // 3 piscadas rápidas
    for (let i = 0; i < 3; i++) {
        setTimeout(() => {
            elemento.style.filter = obterFiltroFlashBrancoInterno();
        }, i * 60);

        setTimeout(() => {
            elemento.style.filter = filterOriginal || 'none';
        }, (i * 60) + 30);
    }
}

/**
 * Cria um efeito de explosão/impacto em um elemento.
 * Combina flash com uma pequena vibração.
 *
 * @param {HTMLElement} elemento - O elemento a ser afetado.
 */
function flashComVibacao(elemento) {
    if (!elemento) return;

    const posOriginal = elemento.style.transform || '';
    const filterOriginal = elemento.style.filter;

    // Flash com vibração
    for (let i = 0; i < 4; i++) {
        setTimeout(() => {
            // Flash branco interno
            elemento.style.filter = obterFiltroFlashBrancoInterno();

            // Vibração pequena
            const offsetX = (Math.random() - 0.5) * 4;
            const offsetY = (Math.random() - 0.5) * 4;
            elemento.style.transform = `translate(${offsetX}px, ${offsetY}px) ${posOriginal}`;
        }, i * 50);

        setTimeout(() => {
            elemento.style.filter = filterOriginal || 'none';
            elemento.style.transform = posOriginal;
        }, (i * 50) + 25);
    }
}


