/**
 * ajuste-tela.js
 * Centraliza a lógica de escala e correção para o Firefox.
 */
(function() {
    const BASE_W = window.GAME_CONSTANTS?.VIEWPORT?.WIDTH || 640;
    const BASE_H = window.GAME_CONSTANTS?.VIEWPORT?.HEIGHT || 480;
    const SCREEN_MODE_STORAGE_KEY = 'game.screenMode';
    const SCREEN_WIDTH_STORAGE_KEY = 'game.screenWidth';
    const SCREEN_HEIGHT_STORAGE_KEY = 'game.screenHeight';
    const SCREEN_SCALE_STORAGE_KEY = 'game.screenScale';

    const SCREEN_MODES = {
        NORMAL: 'normal',
        STRETCH: 'stretch',
        FULLSCREEN: 'fullscreen',
    };

    window.SCREEN_MODES = window.SCREEN_MODES || SCREEN_MODES;

    function lerStorage(chave) {
        try {
            return localStorage.getItem(chave);
        } catch (_) {
            return null;
        }
    }

    function salvarStorage(chave, valor) {
        try {
            localStorage.setItem(chave, String(valor));
            return true;
        } catch (_) {
            return false;
        }
    }

    // Carrega dimensões salvas ou usa o padrão
    const savedWidth = Number.parseInt(lerStorage(SCREEN_WIDTH_STORAGE_KEY), 10);
    const savedHeight = Number.parseInt(lerStorage(SCREEN_HEIGHT_STORAGE_KEY), 10);

    if (Number.isFinite(savedWidth) && Number.isFinite(savedHeight) && savedWidth > 0 && savedHeight > 0) {
        window.VIEWPORT = { 
            width: savedWidth,
            height: savedHeight,
        };
        console.info(`[Tela] Resolução carregada da memória: ${savedWidth}x${savedHeight}`);
    } else {
        window.VIEWPORT = window.VIEWPORT || { width: BASE_W, height: BASE_H };
        console.info(`[Tela] Usando resolução padrão: ${window.VIEWPORT.width}x${window.VIEWPORT.height}`);
    }

    let modoTelaSelecionado = SCREEN_MODES.NORMAL;
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

    function calcularViewportPorModo() {
        if (modoTelaAtual === SCREEN_MODES.NORMAL) {
            // Retorna o que está no VIEWPORT (que pode ter vindo do localStorage)
            return { width: window.VIEWPORT.width, height: window.VIEWPORT.height };
        }

        const { largura, altura } = obterDimensoesJanela();
        const aspectoTela = largura / altura;
        const aspectoBase = BASE_W / BASE_H;

        if (!Number.isFinite(aspectoTela) || aspectoTela <= aspectoBase) {
            return { width: BASE_W, height: BASE_H };
        }

        return {
            width: Math.max(BASE_W, Math.round(BASE_H * aspectoTela)),
            height: BASE_H,
        };
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
            // Tenta carregar escala personalizada salva pelo jogador
            const escalaSalva = Number(lerStorage(SCREEN_SCALE_STORAGE_KEY));
            if (Number.isFinite(escalaSalva) && escalaSalva > 0) {
                console.debug(`[Tela] Aplicando escala da memória: ${escalaSalva}x`);
                return escalaSalva;
            }

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
        salvarStorage(SCREEN_MODE_STORAGE_KEY, modo);
    }

    function carregarModoTelaPersistido() {
        return normalizarModoTela(lerStorage(SCREEN_MODE_STORAGE_KEY));
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
            if (modoTelaSelecionado === SCREEN_MODES.FULLSCREEN) {
                modoTelaAtual = SCREEN_MODES.FULLSCREEN;
                window.aplicarEscalaJogo();
                emitirEventoModoTela(modoTelaAtual);
            }
            return;
        }

        if (modoTelaSelecionado === SCREEN_MODES.FULLSCREEN) {
            // Saiu do fullscreen (ex.: ESC do navegador), mas preserva preferência.
            // Usa stretch como modo efetivo fora do fullscreen para evitar voltar ao normal.
            modoTelaAtual = SCREEN_MODES.STRETCH;
        } else {
            modoTelaAtual = modoTelaSelecionado;
        }

        window.aplicarEscalaJogo();
        emitirEventoModoTela(modoTelaAtual);
    }

    window.aplicarEscalaJogo = function() {
        const container = document.getElementById('jogo-container');
        if (!container || !window.config) return;

        const viewport = calcularViewportPorModo();
        window.VIEWPORT.width = viewport.width;
        window.VIEWPORT.height = viewport.height;

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

        // Sincroniza o palco interno (stage) para o tamanho lógico
        const stage = document.getElementById('game-stage');
        if (stage) {
            stage.style.width = baseW + 'px';
            stage.style.height = baseH + 'px';
        }

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

        console.debug(`[Tela] Renderizado: ${baseW}x${baseH} @ ${escala}x (Modo: ${modoTelaAtual})`);

        if (typeof window.resetarCamera === 'function') {
            window.resetarCamera();
        }
    };

    window.obterModoTelaAtual = function() {
        if (document.fullscreenElement) return SCREEN_MODES.FULLSCREEN;
        return modoTelaAtual;
    };

    window.obterModoTelaSelecionado = function() {
        return modoTelaSelecionado;
    };

    window.aplicarModoTela = async function(modo) {
        console.log(`[Tela] Solicitando alteração de modo: ${modo}`);
        const modoSolicitado = normalizarModoTela(modo);
        const elementoFullscreen = obterElementoFullscreen();
        modoTelaSelecionado = modoSolicitado;
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
        salvarModoTela(modoTelaSelecionado);
        window.aplicarEscalaJogo();
        emitirEventoModoTela(modoTelaAtual);
        return modoTelaAtual;
    };

    /**
     * Altera a resolução lógica do jogo e reajusta a centralização.
     * Ex: window.alterarTamanhoTela(1280, 720);
     */
    window.alterarTamanhoTela = function(largura, altura) {
        const larguraNum = Number.parseInt(largura, 10);
        const alturaNum = Number.parseInt(altura, 10);
        if (!Number.isFinite(larguraNum) || !Number.isFinite(alturaNum) || larguraNum <= 0 || alturaNum <= 0) return;

        window.VIEWPORT.width = larguraNum;
        window.VIEWPORT.height = alturaNum;
        
        salvarStorage(SCREEN_WIDTH_STORAGE_KEY, larguraNum);
        salvarStorage(SCREEN_HEIGHT_STORAGE_KEY, alturaNum);
        console.info(`[Tela] Nova resolução salva: ${larguraNum}x${alturaNum}`);

        window.aplicarEscalaJogo();
        console.info(`[Resolução] Nova área visível: ${larguraNum}x${alturaNum}`);
    };

    /**
     * Altera o fator de escala (zoom) do jogo e o salva na memória.
     * @param {number} novaEscala - Ex: 1.5, 2, 3
     */
    window.alterarEscala = function(novaEscala) {
        const escalaNum = parseFloat(novaEscala);
        if (isNaN(escalaNum) || escalaNum <= 0) return;

        salvarStorage(SCREEN_SCALE_STORAGE_KEY, escalaNum);
        if (window.config) window.config.escalaPalco = escalaNum;
        
        window.aplicarEscalaJogo();
        console.info(`[Escala] Novo fator de zoom salvo: ${escalaNum}`);
    };

    const modoInicial = carregarModoTelaPersistido();
    modoTelaSelecionado = modoInicial;
    modoTelaAtual = modoInicial === SCREEN_MODES.FULLSCREEN ? SCREEN_MODES.STRETCH : modoInicial;

    // Listener de redimensionamento com debounce simples
    window.addEventListener('resize', () => {
        if (window.timerRedimensionamento) clearTimeout(window.timerRedimensionamento);
        window.timerRedimensionamento = setTimeout(window.aplicarEscalaJogo, 100);
    });

    document.addEventListener('fullscreenchange', sincronizarEstadoFullscreen);
})();