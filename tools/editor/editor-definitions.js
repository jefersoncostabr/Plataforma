(function () {
    // Catálogo único de definições do Editor.
    // Objetivo: reduzir duplicidade de paths e centralizar sprites.

    // Observação: itens (faseData.itens) vêm de config/items/*.json.
    // Para esses, este catálogo só fornece helpers de resolução de sprite.

    const SPRITE_ALIASES = {
        // Blocos terra
        terra_horizontal: '../../assets/bloco terra/terra_horizontal.png',
        plataforma: '../../assets/bloco terra/terra_horizontal.png',

        // Outros aliases podem ser adicionados conforme necessário.
    };

    // Pequeno normalizador para lidar com diferentes “nomes de tipo” que o editor pode usar.
    function normalizeType(tipo) {
        if (!tipo) return '';
        return String(tipo).trim();
    }

    // resolveSpritePath(def, context)
    // def: definição do catálogo (pode ter sprite, spriteMenu, spriteColetavel, etc.)
    // context: 'menu' | 'stage' | 'unknown' (opcional, usado apenas para debug/decisão)
    function resolveSpritePath(def = {}, context = 'unknown') {
        if (!def) return '';

        const tipo = normalizeType(def.type || def.alias || def.stateKey);

        // 1) Se sprite explícito existir, preferimos a origem mais adequada
        //    - para paleta/menu: spriteMenu/spriteColetavel geralmente ok
        //    - para stage: sprite (plataformas/NPC) ou spriteColetavel (itens)
        const spriteMenu = def.spriteMenu || def.spriteColetavel || def.sprite;
        const spriteStage = def.sprite || spriteMenu;

        // 2) aliases por tipo/estado (ex.: terra_horizontal)
        if (tipo && SPRITE_ALIASES[tipo]) return SPRITE_ALIASES[tipo];

        // 3) fallback: tenta usar propriedades comuns
        if (context === 'menu') {
            return spriteMenu || def.sprite || '';
        }
        if (context === 'stage') {
            return spriteStage || spriteMenu || '';
        }

        return def.sprite || def.spriteMenu || def.spriteColetavel || '';
    }

    // Catálogo base para plataformas/inimigos/sistema.
    // Mantemos compatível com o formato que editor-config.js já usa.
    function getCatalogFromEditorConfig() {
        const cfg = window.EditorConfig;
        if (!cfg) return { blocks: [], enemies: [], systems: [] };

        const PLATFORM_DEFS = cfg.PLATFORM_DEFS || [];
        const ENEMY_DEFS = cfg.ENEMY_DEFS || [];
        const SYSTEM_DEFS = cfg.SYSTEM_DEFS || [];

        return {
            blocks: PLATFORM_DEFS,
            enemies: ENEMY_DEFS,
            systems: SYSTEM_DEFS
        };
    }

    window.EditorDefinitions = {
        resolveSpritePath,
        SPRITE_ALIASES,
        getCatalogFromEditorConfig
    };
})();

