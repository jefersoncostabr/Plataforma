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

    // ⭐ Tipos de Inimigos (ID → Propriedades)
    TIPOS_INIMIGO: {
        0: {
            id: 0,
            nome: 'comum',
            chaveJSON: 'inimigo_comum',
            temArma: false,
            temEscudo: false,
            temBota: false,
            temJetpack: false,
            temGarra: false,
            temCinto: false,
            temColete: false,
            ehFeno: false,
        },
        1: {
            id: 1,
            nome: 'revolver',
            chaveJSON: 'inimigo_revolver',
            temArma: true,
            temEscudo: false,
            temBota: false,
            temJetpack: false,
            temGarra: false,
            temCinto: false,
            temColete: false,
            ehFeno: false,
        },
        2: {
            id: 2,
            nome: 'escudo',
            chaveJSON: 'inimigo_escudo',
            temArma: false,
            temEscudo: true,
            temBota: false,
            temJetpack: false,
            temGarra: false,
            temCinto: false,
            temColete: false,
            ehFeno: false,
        },
        3: {
            id: 3,
            nome: 'bota',
            chaveJSON: 'inimigo_bota',
            temArma: false,
            temEscudo: false,
            temBota: true,
            temJetpack: false,
            temGarra: false,
            temCinto: false,
            temColete: false,
            ehFeno: false,
        },
        4: {
            id: 4,
            nome: 'jetpack',
            chaveJSON: 'inimigo_jetpack',
            temArma: false,
            temEscudo: false,
            temBota: false,
            temJetpack: true,
            temGarra: false,
            temCinto: false,
            temColete: false,
            ehFeno: false,
        },
        5: {
            id: 5,
            nome: 'feno',
            chaveJSON: 'inimigo_feno',
            temArma: false,
            temEscudo: false,
            temBota: false,
            temJetpack: false,
            temGarra: false,
            temCinto: false,
            temColete: false,
            ehFeno: true,
        },
        6: {
            id: 6,
            nome: 'garra',
            chaveJSON: 'inimigo_garra',
            temArma: false,
            temEscudo: false,
            temBota: false,
            temJetpack: false,
            temGarra: true,
            temCinto: false,
            temColete: false,
            ehFeno: false,
        },
        7: {
            id: 7,
            nome: 'cinto',
            chaveJSON: 'inimigo_cinto',
            temArma: false,
            temEscudo: false,
            temBota: false,
            temJetpack: false,
            temGarra: false,
            temCinto: true,
            temColete: false,
            ehFeno: false,
        },
        8: {
            id: 8,
            nome: 'colete',
            chaveJSON: 'inimigo_colete',
            temArma: false,
            temEscudo: false,
            temBota: false,
            temJetpack: false,
            temGarra: false,
            temCinto: false,
            temColete: true,
            ehFeno: false,
        },
        9: {
            id: 9,
            nome: 'completo',
            chaveJSON: 'inimigo_completo',
            temArma: true,
            temEscudo: true,
            temBota: true,
            temJetpack: true,
            temGarra: true,
            temCinto: true,
            temColete: true,
            ehFeno: false,
        },
    },

    // ⭐ IDs especiais de tipos de inimigo
    INIMIGO_FENO_ID: 5,
    INIMIGO_COMUM_ID: 0,
};
