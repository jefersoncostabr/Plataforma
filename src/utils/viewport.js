/**
 * Utilitários de Viewport e Dimensões
 * Funções reutilizáveis para gerenciar container, stage e escala
 * Acessíveis via window.ViewportUtils
 */

window.ViewportUtils = {
    /**
     * Obtém elemento do container do jogo
     */
    getGameContainer() {
        return document.getElementById('jogo-container');
    },

    /**
     * Obtém elemento do stage (mundo)
     */
    getGameStage() {
        return document.getElementById('game-stage');
    },

    /**
     * Calcula o viewport efetivo considerando o zoom
     * @param {number} escala - Valor do zoom
     * @returns {object} {width, height} do viewport efetivo
     */
    calcularViewportEfetivo(escala) {
        const viewWidth = window.VIEWPORT?.width || 640;
        const viewHeight = window.VIEWPORT?.height || 480;
        return {
            width: viewWidth / escala,
            height: viewHeight / escala,
        };
    },

    /**
     * Verifica se a fase cabe toda na viewport (sem movimento de câmera)
     * @param {number} mundoW - Largura do mundo
     * @param {number} mundoH - Altura do mundo
     * @returns {boolean} true se cabe toda
     */
    faseCabeTodaNaViewport(mundoW, mundoH) {
        const viewWidth = window.VIEWPORT?.width || 640;
        const viewHeight = window.VIEWPORT?.height || 480;
        return mundoW <= viewWidth && mundoH <= viewHeight;
    },

    /**
     * Converte coordenada de grid (ex: "a1") para pixels
     * @param {string} coordenada - Coordenada no formato "a1", "b10", etc
     * @returns {object} {x, y} em pixels
     */
    gridParaPixels(coordenada) {
        if (typeof coordenada !== 'string') {
            console.error(`[GRID->PX] Coordenada inválida: ${coordenada}`);
            return { x: 0, y: 0 };
        }

        const match = coordenada.match(/([a-z]+)(\d+)/i);
        if (!match) {
            console.error(`[GRID->PX] Formato inválido: ${coordenada}. Use "a1", "b10", etc`);
            return { x: 0, y: 0 };
        }

        const letras = match[1].toLowerCase();
        let linha = 0;
        for (const char of letras) {
            linha = (linha * 26) + (char.charCodeAt(0) - 96);
        }
        linha = Math.max(0, linha - 1);

        const coluna = parseInt(match[2], 10) - 1;
        const TILE_SIZE = 32;

        return {
            x: coluna * TILE_SIZE + TILE_SIZE / 2,
            y: linha * TILE_SIZE + TILE_SIZE / 2,
        };
    },

    /**
     * Converte pixels para coordenada de grid
     * @param {number} x - Posição X em pixels
     * @param {number} y - Posição Y em pixels
     * @returns {string} Coordenada no formato "a1"
     */
    pixelsParaGrid(x, y) {
        const TILE_SIZE = 32;
        const indiceLinha = Math.floor(y / TILE_SIZE);
        const linha = indiceLinha + 1;

        let valor = indiceLinha + 1;
        let letras = '';
        while (valor > 0) {
            const resto = (valor - 1) % 26;
            letras = String.fromCharCode('a'.charCodeAt(0) + resto) + letras;
            valor = Math.floor((valor - 1) / 26);
        }

        const coluna = Math.floor(x / TILE_SIZE) + 1;
        return `${letras}${coluna}`;
    },

    /**
     * Configura as dimensões base do container
     * @param {number} width - Largura (padrão: 640)
     * @param {number} height - Altura (padrão: 480)
     */
    configurarDimensoesContainer(width = 640, height = 480) {
        const container = this.getGameContainer();
        if (!container) {
            console.error(`[VIEWPORT] Container não encontrado!`);
            return;
        }

        container.style.width = `${width}px`;
        container.style.height = `${height}px`;
    },

    /**
     * Configura as dimensões do stage (mundo)
     * @param {number} width - Largura do mundo
     * @param {number} height - Altura do mundo
     */
    configurarDimensoesStage(width, height) {
        const stage = this.getGameStage();
        if (!stage) {
            console.error(`[VIEWPORT] Stage não encontrado!`);
            return;
        }

        stage.style.width = `${width}px`;
        stage.style.height = `${height}px`;
    }
};
