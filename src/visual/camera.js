/**
 * Gerenciador de Câmera e Viewport
 * Usa helpers de viewport.js para reduzir duplicação
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
    if (stage) {
        const autoScale = window.autoScaleMultiplier || 1;
        if (autoScale !== 1) {
            stage.style.transform = `translate(0px, 0px) scale(${autoScale})`;
            stage.style.transformOrigin = 'top left';
        } else {
            stage.style.transform = `translate(0px, 0px)`;
        }
    }
    console.log("[CÂMERA] Posição resetada para origem");
};

/**
 * Atualiza a posição da câmera baseada na posição de um alvo (geralmente o jogador).
 * Considera a escala do jogo ao calcular a posição.
 * ⭐ Só move a câmera se a fase for MAIOR que a viewport
 * 
 * @param {number} alvoX - Posição X do jogador.
 * @param {number} alvoY - Posição Y do jogador.
 * @param {number} mundoW - Largura total do mundo.
 * @param {number} mundoH - Altura total do mundo.
 */
window.atualizarCamera = function(alvoX, alvoY, mundoW, mundoH) {
    // Viewport base (não é ampliado, apenas o viewport visual é maior)
    const VIEWPORT_W = 640;
    const VIEWPORT_H = 480;
    
    // Obtém a escala atual
    const escala = window.escalaAtual || 1;
    const viewportW_efetiva = VIEWPORT_W / escala;
    const viewportH_efetiva = VIEWPORT_H / escala;

    // ⭐ Se a fase é pequena (cabe toda na viewport), não move a câmera
    if (mundoW <= VIEWPORT_W && mundoH <= VIEWPORT_H) {
        // Fase cabe toda na tela - câmera fixa no (0, 0)
        window.cameraX = 0;
        window.cameraY = 0;
    } else {
        // Fase é grande - câmera segue o jogador normalmente
        
        // 1. Calcula a posição desejada para centralizar o alvo
        let targetX = alvoX - (viewportW_efetiva / 2);
        let targetY = alvoY - (viewportH_efetiva / 2);

        // 2. Clamping: Impede que a câmera mostre o que está fora das bordas do mundo
        window.cameraX = Math.max(0, Math.min(targetX, mundoW - viewportW_efetiva));
        window.cameraY = Math.max(0, Math.min(targetY, mundoH - viewportH_efetiva));
    }

    // 3. Aplica a transformação visual ao palco
    const stage = document.getElementById('game-stage');
    if (stage) {
        // Arredondamos os valores para evitar que os sprites fiquem "embaçados" em sub-pixels
        const x = Math.round(window.cameraX);
        const y = Math.round(window.cameraY);
        
        // Combina translate com scale (se houver escala automática)
        const autoScale = window.autoScaleMultiplier || 1;
        if (autoScale !== 1) {
            stage.style.transform = `translate(${-x}px, ${y}px) scale(${autoScale})`;
            stage.style.transformOrigin = 'top left';
        } else {
            stage.style.transform = `translate(${-x}px, ${y}px)`;
        }
    } else {
        console.error("[DEBUG CAMERA] Erro: #game-stage não encontrado para aplicar a câmera!");
    }
};

