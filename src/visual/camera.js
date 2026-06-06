// =========================
// EFEITO DE TREMOR NA CÂMERA
// =========================

// Estado do tremor
window.cameraTremorAtivo = false;
window.cameraTremorIntensidade = 4; // pixels
window.cameraTremorTempoRestante = 0;

/**
 * Ativa o efeito de tremor vertical na câmera
 * @param {number} duracaoMs - Duração do tremor em milissegundos
 * @param {number} intensidade - Intensidade do tremor em pixels (opcional)
 */
window.ativarTremorCamera = function(duracaoMs = 300, intensidade = 4) {
    window.cameraTremorAtivo = true;
    window.cameraTremorIntensidade = intensidade;
    window.cameraTremorTempoRestante = duracaoMs;
};

// Atualiza o tempo do tremor a cada frame
window.atualizarTremorCamera = function(deltaMs) {
    if (window.cameraTremorAtivo) {
        window.cameraTremorTempoRestante -= deltaMs;
        if (window.cameraTremorTempoRestante <= 0) {
            window.cameraTremorAtivo = false;
            window.cameraTremorTempoRestante = 0;
        }
    }
};
/**
 * Gerenciador de Câmera e Viewport
 * Suporta duas estratégias: Tela Pequena e Tela Grande
 */

window.cameraX = 0;
window.cameraY = 0;
window.cameraModo = null; // "pequena" ou "grande"
window.cameraZoomFactor = 1; // Default zoom factor for camera
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
    const viewW_Config = window.VIEWPORT?.width || 640;
    const viewH_Config = window.VIEWPORT?.height || 480;
    const zoom = window.cameraZoomFactor || 1;

    // O viewport lógico diminui proporcionalmente ao zoom
    const viewW = viewW_Config / zoom;
    const viewH = viewH_Config / zoom;

    // Centraliza o alvo no novo viewport lógico
    const targetX = alvoX - (viewW / 2);
    const targetY = mundoH - alvoY - (viewH / 2);

    // Clamping ajustado para o tamanho lógico visível
    window.cameraX = clamparCamera(targetX, mundoW, viewW);
    window.cameraY = clamparCamera(targetY, mundoH, viewH);

    // Aplica transform sem escala + tremor
    const stage = document.getElementById('game-stage');
    if (stage) {
        // Define a origem no canto superior esquerdo para alinhar com a tradução
        stage.style.transformOrigin = "0 0";

        let x = Math.round(window.cameraX);
        let y = Math.round(window.cameraY);
        // Aplica tremor vertical se ativo
        if (window.cameraTremorAtivo) {
            y += (Math.random() * window.cameraTremorIntensidade) - (window.cameraTremorIntensidade / 2);
        }
        stage.style.transform = `scale(${window.cameraZoomFactor}) translate(${-x}px, ${-y}px)`;
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

    const calcularOffsetCentralizacao = function(tamanhoMundo, tamanhoViewport) {
        if (tamanhoMundo >= tamanhoViewport) {
            return 0;
        }
        return (tamanhoViewport - tamanhoMundo) / 2;
    };
/**
 * 📱 CÂMERA PRINCIPAL PARA TELA GRANDE
 * Segue o jogador com suavidade em viewport lógico fixo (640x480)
 */
const cameraGrande = function(alvoX, alvoY, mundoW, mundoH) {
    const viewW_Config = window.VIEWPORT?.width || 640;
    const viewH_Config = window.VIEWPORT?.height || 480;
    const zoom = window.cameraZoomFactor || 1;

    // Viewport lógico (o quanto do mundo cabe na tela visual de 640x480)
    const viewW = viewW_Config / zoom;
    const viewH = viewH_Config / zoom;
    
    // Calcula offset de direção (espaço extra à frente)
    const dirX = window.ultimaDirecaoX || 0;
    // Para centralizar o pet horizontalmente, removemos o "look-ahead"
    const offsetX = 0; 
    // Para posicionar o pet um pouco abaixo do centro, usamos um offset vertical constante
    const offsetY = 20; // Ajuste para que o pet fique um pouco abaixo do centro
    
    const targetX = alvoX - (viewW / 2) + offsetX;
    const targetY = mundoH - alvoY - (viewH / 2) - offsetY;

    const targetClampedX = clamparCamera(targetX, mundoW, viewW);
    const targetClampedY = clamparCamera(targetY, mundoH, viewH);

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
    
    // Aplica transform ao stage + tremor
    const stage = document.getElementById('game-stage');
    if (stage) {
        stage.style.transformOrigin = "0 0";

        let x = Math.round(window.cameraX);
        let y = Math.round(window.cameraY);
        const offsetX = calcularOffsetCentralizacao(mundoW, viewW);
        const offsetY = calcularOffsetCentralizacao(mundoH, viewH);
        // Aplica tremor vertical se ativo
        if (window.cameraTremorAtivo) {
            y += (Math.random() * window.cameraTremorIntensidade) - (window.cameraTremorIntensidade / 2);
        }
        stage.style.transform = `scale(${window.cameraZoomFactor}) translate(${Math.round(offsetX - x)}px, ${Math.round(offsetY - y)}px)`;
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
    // Evita “correções bruscas” após fechar menus/interações com ESC,
    // quando a camera ainda pode estar desalinhada com a posição do player.
    if (window.isInteractionMenuOpen) return;
    if (window.isMenuOpen) return;

    // Atualiza o timer do tremor (aproximadamente 60fps = 16.6ms por frame)
    window.atualizarTremorCamera(16.6);

    // Detecta qual câmera deveria ser usada
    const modo = window.detectarTamanhoCâmera();
    
    // Se mudou de modo, atualiza o estado
    if (window.cameraModo !== modo) {
        window.cameraModo = modo;
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
