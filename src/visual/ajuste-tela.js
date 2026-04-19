/**
 * ajuste-tela.js
 * Centraliza a lógica de escala e correção para o Firefox.
 */
(function() {
    const BASE_W = 640;
    const BASE_H = 480;

    window.aplicarEscalaJogo = function() {
        const container = document.getElementById('jogo-container');
        if (!container || !window.config) return;

        // 1. Prioridade absoluta para o valor do seu configuracoes.json
        let escala = Number(window.config.escalaPalco);

        // 2. Fallback: Se a escala no JSON for 0 ou inválida, calcula automática
        if (!escala || escala <= 0) {
            const sX = Math.floor(window.innerWidth / BASE_W);
            const sY = Math.floor(window.innerHeight / BASE_H);
            escala = Math.max(1, Math.min(sX, sY, 4));
        }

        // 3. Aplica a escala via CSS Transform (não altera largura/altura real, apenas visual)
        // Isso evita que o palco "estique" de forma desproporcional.
        container.style.width = BASE_W + 'px';
        container.style.height = BASE_H + 'px';
        container.style.transform = `scale(${escala})`;
        container.style.transformOrigin = 'center center';

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

    // Listener de redimensionamento com debounce simples
    window.addEventListener('resize', () => {
        if (window.timerRedimensionamento) clearTimeout(window.timerRedimensionamento);
        window.timerRedimensionamento = setTimeout(window.aplicarEscalaJogo, 100);
    });
})();