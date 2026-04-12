/**
 * Constantes Globais do Jogo
 * Centraliza todos os valores hard-coded para fácil manutenção
 * Acessíveis via window.GAME_CONSTANTS
 */

window.GAME_CONSTANTS = {
    // ⭐ Dimensões do Viewport (Câmera)
    VIEWPORT: {
        WIDTH: 640,
        HEIGHT: 480,
    },

    // ⭐ Tamanho do Tile (Grid)
    TILE_SIZE: 32,

    // ⭐ Grid máximo (quantos tiles cabem em 640px)
    WORLD_GRID_MAX: 20, // 640 / 32 = 20

    // ⭐ IDs dos elementos DOM
    DOM_IDS: {
        CONTAINER: 'jogo-container',
        STAGE: 'game-stage',
        LAYER_UI: 'layer-ui',
        PLAYER: 'player',
    },

    // ⭐ Z-Index da UI
    Z_INDEX: {
        FUNDO: 0,
        PLATAFORMAS: 5,
        DECORACOES: 10,
        INIMIGOS: 15,
        JOGADOR: 20,
        ITENS: 23,
        PROJETEIS: 25,
        EFEITOS: 30,
        UI: 50,
        MENU: 10000,
    },
};
