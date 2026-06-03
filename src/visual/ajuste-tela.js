/**
 * ajuste-tela.js
 * Centraliza a lógica de escala e correção para o Firefox.
 */
(function() {
    const BASE_W = window.GAME_CONSTANTS?.VIEWPORT?.WIDTH || 640;
    const BASE_H = window.GAME_CONSTANTS?.VIEWPORT?.HEIGHT || 480;
    const SCREEN_MODE_STORAGE_KEY = 'game.screenMode';

    const SCREEN_MODES = {
        NORMAL: 'normal',
        STRETCH: 'stretch',
        FULLSCREEN: 'fullscreen',
    };

    window.SCREEN_MODES = window.SCREEN_MODES || SCREEN_MODES;

    // Define valores padrão se não existirem no VIEWPORT global
    window.VIEWPORT = window.VIEWPORT || { width: BASE_W, height: BASE_H };

    let modoTelaAtual = SCREEN_MODES.NORMAL;

    function normalizarModoTela(modo) {
        const modoNormalizado = String(modo || '').toLowerCase();
        if (modoNormalizado === SCREEN_MODES.STRETCH) return SCREEN_MODES.STRETCH;
        if (modoNormalizado === SCREEN_MODES.FULLSCREEN) return SCREEN_MODES.FULLSCREEN;
        return SCREEN_MODES.NORMAL;
    }

    function obterDimensoesJanela() {
        const visualViewport = window.visualViewport;
        const largura = Math.max(1, Math.floor(visualViewport?.width || window.innerWidth || BASE_W));
        const altura = Math.max(1, Math.floor(visualViewport?.height || window.innerHeight || BASE_H));
        return { largura, altura };
    }

    function calcularEscalaAutomatica(baseW, baseH) {
        const { largura, altura } = obterDimensoesJanela();
        const sX = Math.floor(largura / baseW);
        const sY = Math.floor(altura / baseH);
        return Math.max(1, Math.min(sX, sY));
    }

    function calcularEscalaAteLimite(baseW, baseH) {
        const { largura, altura } = obterDimensoesJanela();
        const sX = largura / baseW;
        const sY = altura / baseH;
        const escala = Math.max(1, Math.min(sX, sY));
        return Number(escala.toFixed(4));
    }

    function calcularEscalaPorModo(baseW, baseH) {
        if (modoTelaAtual === SCREEN_MODES.NORMAL) {
            const escalaConfigurada = Number(window.config?.escalaPalco);
            if (escalaConfigurada && escalaConfigurada > 0) {
                return escalaConfigurada;
            }
        }

        if (modoTelaAtual === SCREEN_MODES.FULLSCREEN) {
            return calcularEscalaAteLimite(baseW, baseH);
        }

        return calcularEscalaAutomatica(baseW, baseH);
    }

    function salvarModoTela(modo) {
        try {
            localStorage.setItem(SCREEN_MODE_STORAGE_KEY, modo);
        } catch (_) {
            // Ignora falhas de storage para não quebrar a execução do jogo
        }
    }

    function carregarModoTelaPersistido() {
        try {
            return normalizarModoTela(localStorage.getItem(SCREEN_MODE_STORAGE_KEY));
        } catch (_) {
            return SCREEN_MODES.NORMAL;
        }
    }

    function emitirEventoModoTela(modo) {
        window.dispatchEvent(new CustomEvent('screen-mode-change', { detail: { mode: modo } }));
    }

    async function entrarFullscreen(elemento) {
        if (!elemento || !elemento.requestFullscreen) return false;
        if (document.fullscreenElement === elemento) return true;
        try {
            await elemento.requestFullscreen();
            return true;
        } catch (error) {
            console.warn('[Tela] Não foi possível entrar em fullscreen.', error);
            return false;
        }
    }

    function obterElementoFullscreen() {
        // Em alguns navegadores, aplicar fullscreen no próprio container do jogo
        // pode sobrescrever estilos de transform e impedir a ampliação visual.
        // Usamos a raiz do documento para fullscreen e mantemos o scale no container.
        return document.documentElement || document.body || document.getElementById('jogo-container');
    }

    async function sairFullscreen() {
        if (!document.fullscreenElement || !document.exitFullscreen) return;
        try {
            await document.exitFullscreen();
        } catch (error) {
            console.warn('[Tela] Não foi possível sair do fullscreen.', error);
        }
    }

    function sincronizarEstadoFullscreen() {
        if (document.fullscreenElement) {
            // Garante recálculo depois da entrada em fullscreen.
            if (modoTelaAtual === SCREEN_MODES.FULLSCREEN) {
                window.aplicarEscalaJogo();
                emitirEventoModoTela(modoTelaAtual);
            }
            return;
        }

        if (modoTelaAtual !== SCREEN_MODES.FULLSCREEN) return;

        modoTelaAtual = SCREEN_MODES.NORMAL;
        salvarModoTela(modoTelaAtual);
        window.aplicarEscalaJogo();
        emitirEventoModoTela(modoTelaAtual);
    }

    window.aplicarEscalaJogo = function() {
        const container = document.getElementById('jogo-container');
        if (!container || !window.config) return;

        const baseW = window.VIEWPORT.width;
        const baseH = window.VIEWPORT.height;

        const escala = calcularEscalaPorModo(baseW, baseH);

        // 3. Aplica Dimensões e Centralização absoluta
        container.style.position = 'absolute';
        container.style.left = '50%';
        container.style.top = '50%';
        container.style.width = baseW + 'px';
        container.style.height = baseH + 'px';
        container.style.margin = '0';
        container.style.overflow = 'hidden';
        container.style.display = 'block';
        container.style.transformOrigin = 'center center';
        
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

    window.obterModoTelaAtual = function() {
        if (document.fullscreenElement) return SCREEN_MODES.FULLSCREEN;
        return modoTelaAtual;
    };

    window.aplicarModoTela = async function(modo) {
        const modoSolicitado = normalizarModoTela(modo);
        const elementoFullscreen = obterElementoFullscreen();
        let modoFinal = modoSolicitado;

        if (modoSolicitado === SCREEN_MODES.FULLSCREEN) {
            const entrouFullscreen = await entrarFullscreen(elementoFullscreen);
            if (!entrouFullscreen) {
                modoFinal = SCREEN_MODES.STRETCH;
            }
        } else if (document.fullscreenElement) {
            await sairFullscreen();
        }

        modoTelaAtual = modoFinal;
        salvarModoTela(modoTelaAtual);
        window.aplicarEscalaJogo();
        emitirEventoModoTela(modoTelaAtual);
        return modoTelaAtual;
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

    const modoInicial = carregarModoTelaPersistido();
    modoTelaAtual = modoInicial === SCREEN_MODES.FULLSCREEN ? SCREEN_MODES.STRETCH : modoInicial;

    // Listener de redimensionamento com debounce simples
    window.addEventListener('resize', () => {
        if (window.timerRedimensionamento) clearTimeout(window.timerRedimensionamento);
        window.timerRedimensionamento = setTimeout(window.aplicarEscalaJogo, 100);
    });

    document.addEventListener('fullscreenchange', sincronizarEstadoFullscreen);
})();