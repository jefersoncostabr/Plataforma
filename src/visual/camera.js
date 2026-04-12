/**
 * Gerenciador de Câmera e Viewport
 */

window.cameraX = 0;
window.cameraY = 0;

/**
 * Reseta a posição da câmera para a origem.
 */
window.resetarCamera = function() {
    window.cameraX = 0;
    window.cameraY = 0;
    const stage = document.getElementById('game-stage');
    if (stage) stage.style.transform = `translate(0px, 0px)`;
};

/**
 * Atualiza a posição da câmera baseada na posição de um alvo (geralmente o jogador).
 * 
 * @param {number} alvoX - Posição X do jogador.
 * @param {number} alvoY - Posição Y do jogador.
 * @param {number} mundoW - Largura total do mundo.
 * @param {number} mundoH - Altura total do mundo.
 */
window.atualizarCamera = function(alvoX, alvoY, mundoW, mundoH) {
    const viewportW = 640;
    const viewportH = 480;

    // 1. Calcula a posição desejada para centralizar o alvo
    let targetX = alvoX - (viewportW / 2);
    let targetY = alvoY - (viewportH / 2);

    // 2. Clamping: Impede que a câmera mostre o que está fora das bordas do mundo
    window.cameraX = Math.max(0, Math.min(targetX, mundoW - viewportW));
    window.cameraY = Math.max(0, Math.min(targetY, mundoH - viewportH));

    // 3. Aplica a transformação visual ao palco
    const stage = document.getElementById('game-stage');
    if (stage) {
        // Arredondamos os valores para evitar que os sprites fiquem "embaçados" em sub-pixels
        const x = Math.round(window.cameraX);
        const y = Math.round(window.cameraY);
        stage.style.transform = `translate(${-x}px, ${y}px)`;
    } else {
        console.error("[DEBUG CAMERA] Erro: #game-stage não encontrado para aplicar a câmera!");
    }
};

