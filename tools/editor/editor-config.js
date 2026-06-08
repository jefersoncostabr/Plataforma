(function () {
    const TILE_SIZE = 32;
    const DEFAULT_PROPORTION = '1x1';
    const BOSS_MAX_STAGES = 5;

    const PLATFORM_DEFS = [
        { type: 'plataforma', stateKey: 'plataformas', sprite: '../../assets/bloco terra/terra_horizontal.png', label: 'Plataforma', kind: 'array' },
        { type: 'plataformaCantoMinimo', stateKey: 'plataformas', sprite: '../../assets/bloco terra/terra_canto_minimo.png', label: 'Canto minimo', kind: 'array' },
        { type: 'plataformaCanto', stateKey: 'plataformas', sprite: '../../assets/bloco terra/terra_canto.png', label: 'Canto', kind: 'array' },
        { type: 'plataformaGramaPico', stateKey: 'plataformas', sprite: '../../assets/bloco terra/terra_pico.png', label: 'Grama Pico', kind: 'array' },
        { type: 'plataformaGramaVertical', stateKey: 'plataformas', sprite: '../../assets/bloco terra/terra_vertical.png', label: 'Grama Vertical', kind: 'array' },
        { type: 'plataformaMuro', stateKey: 'plataformas', sprite: '../../assets/bloco terra/terra_muro.png', label: 'Muro', kind: 'array' },


        { type: 'plataformaNeve', stateKey: 'plataformasNeve', sprite: '../../assets/personagem/chao_neve.png', label: 'Chão de Neve', kind: 'array' },
        { type: 'terraInferior', stateKey: 'plataformasTerraInferior', sprite: '../../assets/personagem/terra_inferior.png', label: 'Terra Meio Bloco Inferior', kind: 'array' },
        { type: 'terraSuperior', stateKey: 'plataformasTerraSuperior', sprite: '../../assets/personagem/terra_superior.png', label: 'Terra Meio Bloco Superior', kind: 'array' },
        { type: 'terraInferior2', stateKey: 'plataformasTerraInferior2', sprite: '../../assets/personagem/terra_inferior2.png', label: 'Terra Meio Bloco Inferior 2', kind: 'array' },
        { type: 'terraSuperior2', stateKey: 'plataformasTerraSuperior2', sprite: '../../assets/personagem/terra_superior2.png', label: 'Terra Meio Bloco Superior 2', kind: 'array' },
        { type: 'plataformaEspinhos', stateKey: 'plataformasEspinhos', sprite: '../../assets/bloco terra/terra_canto.png', label: 'Espinhos', kind: 'array' },
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
        { type: 'inimigo_cinto', stateKey: 'inimigo_cinto', sprite: '../../assets/personagem/cinto_coletavel.png', label: 'Inimigo com Cinto', className: 'enemy-marker', kind: 'array' },
        { type: 'inimigo_colete', stateKey: 'inimigo_colete', sprite: '../../assets/personagem/colete_coletavel.png', label: 'Inimigo com Colete', className: 'enemy-marker', kind: 'array' },
        { type: 'inimigo_completo', stateKey: 'inimigo_completo', sprite: '../../assets/personagem/Personagem_parado.png', label: 'Inimigo Completo', className: 'enemy-marker golden-bg', kind: 'array' },
        { type: 'inimigo_com_doze', stateKey: 'inimigo_com_doze', sprite: '../../assets/personagem/doze_coletavel.png', label: 'Inimigo com Doze', className: 'enemy-marker', kind: 'array' },
        { type: 'inimigo_com_bateria', stateKey: 'inimigo_com_bateria', sprite: '../../assets/personagem/objetos/bateria_coletavel.png', label: 'Inimigo com Bateria', className: 'enemy-marker', kind: 'array' }
        // { type: 'inimigo_bb', ... } removido
    ];

    const SYSTEM_DEFS = [
        { type: 'player', stateKey: 'posicaoInicialJogador', sprite: '../../assets/personagem/Personagem_parado.png', label: 'Ponto Inicial do Jogador', className: 'player-filter', kind: 'single' },
        { type: 'objetivo', stateKey: 'objetivo', sprite: '../../assets/personagem/objetivo.png', label: 'Objetivo da Fase', kind: 'single' },
        { type: 'alavanca', stateKey: 'posicaoAlavanca', sprite: '../../assets/personagem/alavanca.png', label: 'Alavanca', kind: 'single' },
        { type: 'roboDesativado', stateKey: 'posicaoRoboDesativado', sprite: '../../assets/personagem/robo_desativado.png', label: 'Robô Desativado (Interativo)', kind: 'single' },
        { type: 'roboAberto', stateKey: 'posicaoRoboAberto', sprite: '../../assets/personagem/per_aberto.png', label: 'Robô Aberto (Casco)', kind: 'single' },
        { type: 'gaiola', stateKey: 'posicaoGaiola', sprite: '../../assets/personagem/gaiola1.png', label: 'Gaiola com Cão', kind: 'single' },
        { type: 'cachorro', stateKey: 'posicaoCachorro', sprite: '../../assets/personagem/cao_parado.png', label: 'Cachorro (NPC)', kind: 'single' },
        { type: 'gaiolaGato', stateKey: 'posicaoGaiolaGato', sprite: '../../assets/personagem/gaiola1.png', label: 'Gaiola com Gato', kind: 'single' },
        { type: 'gato', stateKey: 'posicaoGato', sprite: '../../assets/personagem/gato_parado.png', label: 'Gato (NPC)', kind: 'single' }
    ];

    const ALL_DEFS = [...PLATFORM_DEFS, ...ENEMY_DEFS, ...SYSTEM_DEFS];
    const COORD_ARRAY_KEYS = [...PLATFORM_DEFS, ...ENEMY_DEFS].map(def => def.stateKey);

    function createEmptyFaseData(overrides = {}) {
        const base = {
            proporcao: DEFAULT_PROPORTION,
            posicaoInicialJogador: 'b2',
            objetivo: 'f19',
            posicaoAlavanca: '',
            posicaoRoboDesativado: '',
            posicaoRoboAberto: '',
            posicaoMusgoRoboAberto: '',
            posicaoMusgoRoboDesativado: '',
            posicaoGaiola: '',
            posicaoCachorro: '',
            posicaoGaiolaGato: '',
            posicaoGato: '',
            chefes: [],
            itens: {},
            inimigoAleatorio: [1, 0]
        };

        return { ...base, ...overrides };
    }

    function getDefinitionByType(type) {
        // Busca em tempo real nos arrays expostos para suportar injeções dinâmicas (como o NPC Humano)
        const liveAllDefs = [
            ...(window.EditorConfig?.PLATFORM_DEFS || PLATFORM_DEFS),
            ...(window.EditorConfig?.ENEMY_DEFS || ENEMY_DEFS),
            ...(window.EditorConfig?.SYSTEM_DEFS || SYSTEM_DEFS)
        ];
        return liveAllDefs.find(def => def.type === type) || null;
    }

    window.EditorConfig = {
        TILE_SIZE,
        DEFAULT_PROPORTION,
        BOSS_MAX_STAGES,
        PLATFORM_DEFS,
        ENEMY_DEFS,
        SYSTEM_DEFS,
        ALL_DEFS,
        COORD_ARRAY_KEYS,
        createEmptyFaseData,
        getDefinitionByType
    };
})();