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

    // Log estratégico de transformação
    if ((mundoW > viewportW || mundoH > viewportH) && Math.random() < 0.01) {
        const transformacaoStr = `translate(${-window.cameraX.toFixed(0)}px, ${window.cameraY.toFixed(0)}px)`;
        console.log(`[DEBUG TRANSFORMAÇÃO] Player X: ${alvoX.toFixed(0)} | Mundo W: ${mundoW} | CSS: ${transformacaoStr}`);
    }

    // 3. Aplica a transformação visual ao palco
    const stage = document.getElementById('game-stage');
    if (stage) {
        const transformValue = `translate(${-window.cameraX}px, ${window.cameraY}px)`;
        stage.style.transform = transformValue;
        
        if (Math.random() < 0.01) {
            console.log(`[DEBUG CSS] Style aplicado ao #game-stage: ${stage.style.transform}`);
        }
    } else {
        console.error("[DEBUG CAMERA] Erro: #game-stage não encontrado para aplicar a câmera!");
    }
};