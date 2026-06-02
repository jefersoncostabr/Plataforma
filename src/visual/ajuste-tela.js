/**
 * ajuste-tela.js
 * Centraliza a lógica de escala e correção para o Firefox.
 */
(function() {
    // Define valores padrão se não existirem no VIEWPORT global
    window.VIEWPORT = window.VIEWPORT || { width: 640, height: 480 };

    window.aplicarEscalaJogo = function() {
        const container = document.getElementById('jogo-container');
        if (!container || !window.config) return;

        const BASE_W = window.VIEWPORT.width;
        const BASE_H = window.VIEWPORT.height;

        // 1. Prioridade absoluta para o valor do seu configuracoes.json
        let escala = Number(window.config.escalaPalco);

        // 2. Fallback: Se a escala no JSON for 0 ou inválida, calcula automática
        if (!escala || escala <= 0) {
            const sX = Math.floor(window.innerWidth / BASE_W);
            const sY = Math.floor(window.innerHeight / BASE_H);
            escala = Math.max(1, Math.min(sX, sY)); // Removido limite fixo de 4 para suportar telas 4k
        }

        // 3. Aplica Dimensões e Centralização absoluta
        container.style.position = 'absolute';
        container.style.left = '50%';
        container.style.top = '50%';
        container.style.width = BASE_W + 'px';
        container.style.height = BASE_H + 'px';
        
        // O segredo da centralização: traduzir metade da própria largura/altura para trás
        container.style.transform = `translate(-50%, -50%) scale(${escala})`;

        // 4. Correção de Renderização específica para Firefox (Nitidez de Pixel Art)
        if (navigator.userAgent.toLowerCase().includes('firefox')) {
            container.style.imageRendering = '-moz-crisp-edges';
            // Pequeno ajuste de performance para transformações no Firefox
            container.style.filter = 'drop-shadow(0 0 0 transparent)'; 
        } else {
            container.style.imageRendering = 'pixelated';
        }

        window.escalaAtual = escala;
        window.autoScaleMultiplier = escala;

        if (typeof window.resetarCamera === 'function') {
            window.resetarCamera();
        }
    };

    /**
     * Altera a resolução lógica do jogo e reajusta a centralização.
     * Ex: window.alterarTamanhoTela(1280, 720);
     */
    window.alterarTamanhoTela = function(largura, altura) {
        window.VIEWPORT.width = largura;
        window.VIEWPORT.height = altura;
        
        // Sincroniza o palco interno (stage) para o novo tamanho
        const stage = document.getElementById('game-stage');
        if (stage) {
            stage.style.width = largura + 'px';
            stage.style.height = altura + 'px';
        }

        window.aplicarEscalaJogo();
        console.info(`[Resolução] Nova área visível: ${largura}x${altura}`);
    };

    // Listener de redimensionamento com debounce simples
    window.addEventListener('resize', () => {
        if (window.timerRedimensionamento) clearTimeout(window.timerRedimensionamento);
        window.timerRedimensionamento = setTimeout(window.aplicarEscalaJogo, 100);
    });
})();