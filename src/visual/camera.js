/**
 * Gerenciador de Câmera e Viewport
 * Suporta duas estratégias: Tela Pequena e Tela Grande
 */

window.cameraX = 0;
window.cameraY = 0;
window.cameraModo = null; // "pequena" ou "grande"
window.cameraAtiva = "padrao"; // Qual câmera está ativa

/**
 * Detecta se devemos usar câmera para tela pequena ou grande
 * @returns {string} "pequena" ou "grande"
 */
window.detectarTamanhoCâmera = function() {
    // Usa o multiplicador de escala automática como critério
    const autoScale = window.autoScaleMultiplier || 1;
    
    // Tela grande: autoScale > 1 (zoom ativo)
    // Tela pequena: autoScale === 1 (sem zoom)
    return autoScale > 1 ? "grande" : "pequena";
};

/**
 * Câmera para TELA PEQUENA (sem zoom, autoScale = 1)
 * Simples centralização do jogador
 */
const cameraPequena = function(alvoX, alvoY, mundoW, mundoH) {
    const FASE_BASE_W = 640;
    const FASE_BASE_H = 480;

    let targetX = alvoX - (FASE_BASE_W / 2);
    let targetY = alvoY - (FASE_BASE_H / 2);

    // Clamping independente por eixo
    if (mundoW > FASE_BASE_W) {
        window.cameraX = Math.max(0, Math.min(targetX, mundoW - FASE_BASE_W));
    } else {
        window.cameraX = 0;
    }

    if (mundoH > FASE_BASE_H) {
        window.cameraY = Math.max(0, Math.min(targetY, mundoH - FASE_BASE_H));
    } else {
        window.cameraY = 0;
    }

    // Aplica transform sem escala
    const stage = document.getElementById('game-stage');
    if (stage) {
        const x = Math.round(window.cameraX);
        const y = Math.round(window.cameraY);
        stage.style.transform = `translate(${-x}px, ${-y}px)`;
    }
};

// ============================================================================
// CÂMERA GRANDE (com zoom)
// ============================================================================

/**
 * 🌊 Aplica SUAVIDADE ao movimento (lerp)
 * @param {number} valorAtual - Posição atual
 * @param {number} valorAlvo - Posição desejada
 * @param {number} smoothFactor - Fator de suavidade (0.10 = suave)
 * @returns {number} Nova posição
 */
const aplicarSuavidade = function(valorAtual, valorAlvo, smoothFactor = 0.10) {
    return valorAtual + (valorAlvo - valorAtual) * smoothFactor;
};

/**
 * 📍 Faz CLAMPING para manter câmera dentro dos limites do mapa
 * @param {number} pos - Posição atual
 * @param {number} tamanhoMundo - Tamanho do mundo (W ou H)
 * @param {number} tamanhoViewport - Tamanho do viewport (W ou H)
 * @returns {number} Posição dentro dos limites
 */
const clamparCamera = function(pos, tamanhoMundo, tamanhoViewport) {
    if (tamanhoMundo > tamanhoViewport) {
        return Math.max(0, Math.min(pos, tamanhoMundo - tamanhoViewport));
    }
    return 0;
};

/**
 * 📱 CÂMERA PRINCIPAL PARA TELA GRANDE
 * Segue o jogador com suavidade em viewport lógico fixo (640x480)
 */
const cameraGrande = function(alvoX, alvoY, mundoW, mundoH) {
    const BASE_W = 640;
    const BASE_H = 480;
     const viewportW = BASE_W;
     const viewportH = BASE_H;
     const maxCameraX = Math.max(0, mundoW - viewportW);
     const maxCameraY = Math.max(0, mundoH - viewportH);
    
    // Calcula offset de direção (espaço extra à frente)
    const dirX = window.ultimaDirecaoX || 0;
    const dirY = window.ultimaDirecaoY || 0;
    const offsetX = dirX > 0 ? 50 : (dirX < 0 ? -50 : 0);
    const offsetY = dirY > 0 ? 40 : (dirY < 0 ? -40 : 0);
    
    // Posição alvo centralizada + offset
    const targetX = alvoX - (viewportW / 2) + offsetX;
    const targetY = alvoY - (viewportH / 2) + offsetY;
    const targetClampedX = mundoW > BASE_W ? clamparCamera(targetX, mundoW, viewportW) : 0;
    const targetClampedY = mundoH > BASE_H ? clamparCamera(targetY, mundoH, viewportH) : 0;

    // Suaviza em todo o percurso e só "cola" na borda quando estiver muito perto.
    // Isso evita a pancada seca nas extremidades.
    window.cameraX = aplicarSuavidade(window.cameraX, targetClampedX, 0.10);
    window.cameraY = aplicarSuavidade(window.cameraY, targetClampedY, 0.10);

    const LIMIAR_BORDA = 0.75;
    if (Math.abs(window.cameraX - targetClampedX) <= LIMIAR_BORDA) {
        window.cameraX = targetClampedX;
    }
    if (Math.abs(window.cameraY - targetClampedY) <= LIMIAR_BORDA) {
        window.cameraY = targetClampedY;
    }
    
    // Aplica transform ao stage
    const stage = document.getElementById('game-stage');
    if (stage) {
        const x = Math.round(window.cameraX);
        const y = Math.round(window.cameraY);
        stage.style.transform = `translate(${-x}px, ${-y}px)`;
    }
};

/**
 * Reseta a posição da câmera para a origem.
 */
window.resetarCamera = function() {
    window.cameraX = 0;
    window.cameraY = 0;
    const stage = document.getElementById('game-stage');
    if (stage) {
        stage.style.transform = `translate(0px, 0px)`;
    }
    console.log("[CÂMERA] Posição resetada para origem");
};

/**
 * Atualiza a posição da câmera - SELETOR AUTOMÁTICO
 * Escolhe entre câmera pequena ou grande baseado no tamanho da tela
 * 
 * @param {number} alvoX - Posição X do jogador (centro da hitbox).
 * @param {number} alvoY - Posição Y do jogador (centro da hitbox).
 * @param {number} mundoW - Largura total do mundo.
 * @param {number} mundoH - Altura total do mundo.
 */
window.atualizarCamera = function(alvoX, alvoY, mundoW, mundoH) {
    // Detecta qual câmera deveria ser usada
    const modo = window.detectarTamanhoCâmera();
    
    // Se mudou de modo, exibe no console
    if (window.cameraModo !== modo) {
        window.cameraModo = modo;
        console.log(`[CÂMERA] 🎥 MODO DETECTADO: ${modo === "pequena" ? "📱 TELA PEQUENA" : "🖥️ TELA GRANDE"} | autoScale: ${window.autoScaleMultiplier}`);
    }
    
    // Executa a câmera apropriada
    if (modo === "pequena") {
        window.cameraAtiva = "pequena";
        cameraPequena(alvoX, alvoY, mundoW, mundoH);
    } else {
        window.cameraAtiva = "grande";
        cameraGrande(alvoX, alvoY, mundoW, mundoH);
    }
};
