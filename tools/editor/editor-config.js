(function () {
    const TILE_SIZE = 32;
    const DEFAULT_PROPORTION = '1x1';

    const PLATFORM_DEFS = [
        { type: 'plataforma', stateKey: 'plataformas', sprite: '../../assets/personagem/chao.png', label: 'Plataforma', kind: 'array' },
        { type: 'plataformaNeve', stateKey: 'plataformasNeve', sprite: '../../assets/personagem/chao_neve.png', label: 'Chão de Neve', kind: 'array' },
        { type: 'terraInferior', stateKey: 'plataformasTerraInferior', sprite: '../../assets/personagem/terra_inferior.png', label: 'Terra Meio Bloco Inferior', kind: 'array' },
        { type: 'terraSuperior', stateKey: 'plataformasTerraSuperior', sprite: '../../assets/personagem/terra_superior.png', label: 'Terra Meio Bloco Superior', kind: 'array' },
        { type: 'terraInferior2', stateKey: 'plataformasTerraInferior2', sprite: '../../assets/personagem/terra_inferior2.png', label: 'Terra Meio Bloco Inferior 2', kind: 'array' },
        { type: 'terraSuperior2', stateKey: 'plataformasTerraSuperior2', sprite: '../../assets/personagem/terra_superior2.png', label: 'Terra Meio Bloco Superior 2', kind: 'array' },
        { type: 'estacaSup', stateKey: 'plataformasEstacaSup', sprite: '../../assets/personagem/estacasup.png', label: 'Estaca Superior', kind: 'array' },
        { type: 'estacaDir', stateKey: 'plataformasEstacaDir', sprite: '../../assets/personagem/estacadir.png', label: 'Estaca Direita', kind: 'array' },
        { type: 'estacaEsq', stateKey: 'plataformasEstacaEsq', sprite: '../../assets/personagem/estacaesq.png', label: 'Estaca Esquerda', kind: 'array' },
        { type: 'estacaBaixo', stateKey: 'plataformasEstacaBaixo', sprite: '../../assets/personagem/estacasdown.png', label: 'Estaca Baixo', kind: 'array' }
    ];

    const ENEMY_DEFS = [
        { type: 'inimigo_comum', stateKey: 'inimigo_comum', sprite: '../../assets/personagem/Personagem_parado.png', label: 'Inimigo Melee', className: 'enemy-marker', kind: 'array' },
        { type: 'inimigo_revolver', stateKey: 'inimigo_revolver', sprite: '../../assets/personagem/revolver_pegavel.png', label: 'Inimigo Atirador', className: 'enemy-marker', kind: 'array' },
        { type: 'inimigo_escudo', stateKey: 'inimigo_escudo', sprite: '../../assets/personagem/escudo_pegavel.png', label: 'Inimigo Escudado', className: 'enemy-marker', kind: 'array' },
        { type: 'inimigo_bota', stateKey: 'inimigo_bota', sprite: '../../assets/personagem/bota_pegavel.png', label: 'Inimigo Rápido (Botas)', className: 'enemy-marker', kind: 'array' },
        { type: 'inimigo_jetpack', stateKey: 'inimigo_jetpack', sprite: '../../assets/personagem/jetpack_pegavel.png', label: 'Inimigo Voador (Jetpack)', className: 'enemy-marker', kind: 'array' },
        { type: 'inimigo_feno', stateKey: 'inimigo_feno', sprite: '../../assets/personagem/alvoFeno.png', label: 'Alvo de Feno (Treino)', className: 'enemy-marker', kind: 'array' },
        { type: 'inimigo_garra', stateKey: 'inimigo_garra', sprite: '../../assets/personagem/garra_coletavel.png', label: 'Inimigo com Garra', className: 'enemy-marker', kind: 'array' },
        { type: 'inimigo_cinto', stateKey: 'inimigo_cinto', sprite: '../../assets/personagem/cinto_coletavel.png', label: 'Inimigo com Cinto', className: 'enemy-marker', kind: 'array' }
    ];

    const SYSTEM_DEFS = [
        { type: 'player', stateKey: 'posicaoInicialJogador', sprite: '../../assets/personagem/Personagem_parado.png', label: 'Ponto Inicial do Jogador', className: 'player-filter', kind: 'single' },
        { type: 'objetivo', stateKey: 'objetivo', sprite: '../../assets/personagem/objetivo.png', label: 'Objetivo da Fase', kind: 'single' }
    ];

    const ALL_DEFS = [...PLATFORM_DEFS, ...ENEMY_DEFS, ...SYSTEM_DEFS];
    const COORD_ARRAY_KEYS = [...PLATFORM_DEFS, ...ENEMY_DEFS].map(def => def.stateKey);

    function createEmptyFaseData(overrides = {}) {
        const base = {
            proporcao: DEFAULT_PROPORTION,
            posicaoInicialJogador: 'b2',
            objetivo: 'f19',
            itens: [],
            inimigoAleatorio: [1, 0]
        };

        COORD_ARRAY_KEYS.forEach((key) => {
            base[key] = [];
        });

        return { ...base, ...overrides };
    }

    function getDefinitionByType(type) {
        return ALL_DEFS.find(def => def.type === type) || null;
    }

    window.EditorConfig = {
        TILE_SIZE,
        DEFAULT_PROPORTION,
        PLATFORM_DEFS,
        ENEMY_DEFS,
        SYSTEM_DEFS,
        ALL_DEFS,
        COORD_ARRAY_KEYS,
        createEmptyFaseData,
        getDefinitionByType
    };
})();