# Estrutura de Projetos (project-tree.md)

**Data**: Maio 2026  
**Objetivo**: Referência visual da estrutura; ignorar duplicações e arquivos temporários  
**Versão**: 1.0 Phase 0

---

## 1. Árvore Completa (Limpa)

```
Plataforma/
├── index.html                      ← Carrega todos os scripts (ordem crítica!)
├── index-style.css
│
├── assets/                         ← Mídia (sprites, áudio, tilings)
│   ├── audio/
│   │   └── sfx/                    ← Efeitos sonoros
│   ├── craft/                      ← Sprites de crafting
│   ├── grafico/                    ← Tilesets, parallax, cenários
│   └── personagem/                 ← Sprites de entidades
│       └── bb/                     ← Sprites bebê
│
├── config/                         ← Dados estruturados
│   ├── colete-itens.json           ← Items que colete carrega
│   ├── configuracoes.json          ← Settings globais
│   ├── controles.json              ← Mapeamento de controles
│   ├── skills-dados.json           ← Skill definitions
│   ├── fases/                      ← Level definitions
│   │   ├── fase1.json ~ fase11.json
│   │   ├── index.json              ← Fase selector
│   │   └── treino.json             ← Training level
│   ├── interacoes/                 ← NPC/craft interactions
│   │   ├── crafting.html
│   │   └── mapeamento.json
│   └── items/                      ← Item definitions
│       ├── bota.json, cinto.json, colete.json, ...
│       └── restauracao.json        ← Healing items
│
├── docs/                           ← Documentação (Phase 0)
│   ├── ARCHITECTURE.md             ← Este arquivo (visão de sistema)
│   ├── AI_RULES.md                 ← Guardrails para IA
│   ├── PROJECT_TREE.md             ← Estrutura (este arquivo)
│   ├── apoio.txt                   ← Notas legadas
│   ├── como_criar_skills.md        ← Tutorial
│   ├── CONTROLES.md                ← Control mapping
│   ├── ideias.md                   ← Ideias
│   ├── refat_cao.md                ← Notas de refactor
│   └── migraçãoCssAnimBot.md       ← CSS migration notes
│
├── src/                            ← Código-fonte (55+ arquivos)
│   ├── config/
│   │   └── constants.js            ← CONFIG global, enums
│   │
│   ├── core/                       ← Sistemas fundamentais (19 arquivos)
│   │   ├── audio-manager.js        ← SFX playback
│   │   ├── inicial.js              ← Inicialização, load fases
│   │   ├── pet-habilidades.js      ← Abilidades de pets
│   │   ├── cao.js                  ← Entidade cão
│   │   ├── bb.js                   ← Entidade bebê (resgate)
│   │   ├── mecanica-resgate-bb.js  ← Lógica de resgate
│   │   ├── bb-debug.js             ← Debug do BB
│   │   ├── bb-debug-avancado.js    ← Debug avançado
│   │   ├── bb-fix.js               ← Fixes do BB
│   │   ├── gaiola.js               ← Entidade gaiola
│   │   ├── colisoes.js             ← Detecção de colisão
│   │   ├── estacas.js              ← Armadilhas
│   │   ├── gravidade.js            ← Simulação gravidade
│   │   ├── desaceleracao-horizontal.js ← Fricção
│   │   ├── interacao-sistema.js    ← Diálogos/crafts
│   │   └── posicao-inicial.js      ← Restaura posição
│   │
│   ├── jogador/                    ← Lógica do jogador (14 arquivos)
│   │   ├── inventario.js           ← Items equipados
│   │   ├── controles.js            ← Input mapping
│   │   ├── garra.js                ← Mecânica grab
│   │   ├── dano-estacas.js         ← Colisão spike damage
│   │   ├── acoes-especiais.js      ← Skills (dash, jump boost)
│   │   ├── crafting.js             ← Crafting UI/logic
│   │   ├── jetpack.js              ← Jetpack equipment
│   │   ├── combate-corpo-a-corpo.js ← Melee combat
│   │   ├── abertura-animacao.js    ← Armor open/close
│   │   ├── movimento.js            ← Main loop + physics (1900 LOC) ⚠️ HOTSPOT
│   │   ├── animacao.js             ← Sprite animation
│   │   ├── skills-efeitos.js       ← Skill visual effects
│   │   └── (removed: ia-inimigo.js) ← Moved to inimigos/
│   │
│   ├── inimigos/                   ← IA dos inimigos (3 arquivos)
│   │   ├── inimigo.js              ← Base enemy entity
│   │   ├── morte-inimigo.js        ← Death/drop logic
│   │   └── ia-inimigo.js           ← Main AI loop (1600 LOC) ⚠️ HOTSPOT
│   │
│   ├── itens/                      ← Sistema de items (4 arquivos)
│   │   ├── itens.js                ← Item spawning/pickup
│   │   ├── criarItem.js            ← Item factory
│   │   ├── coletarItem.js          ← Pickup logic
│   │   ├── inicializarItensGlobais.js
│   │   └── loadAllItems.js         ← Item loader
│   │
│   ├── skills/                     ← Sistema de skills (1 arquivo)
│   │   └── skills.js               ← Ability definitions
│   │
│   ├── visual/                     ← Renderização (8 arquivos)
│   │   ├── ajuste-tela.js          ← Screen adjustment
│   │   ├── animacoes-pets.js       ← Pet animation
│   │   ├── animacoes-equipamento.js ← Equipment anim
│   │   ├── button-animations.js    ← UI button effects
│   │   ├── camera.js               ← Camera tracking
│   │   ├── cenario.js              ← Scenario render (1200 LOC) ⚠️ HOTSPOT
│   │   ├── efeitos-visuais.js      ← VFX system
│   │   ├── grade-debug.js          ← Debug grid
│   │   ├── layers.js               ← Layer management
│   │   ├── sincronizacao-visual.js ← Main render loop
│   │   └── firefox-scaling-fix.js  ← Browser workaround
│   │
│   ├── ui/                         ← Menu & UI (2+ arquivos)
│   │   ├── hud.js                  ← HUD display
│   │   ├── menu.js                 ← Main menu
│   │   ├── mochila.js              ← Backpack/inventory
│   │   └── interacoes/
│   │       ├── base-interacao.css  ← Styling
│   │       └── telas/
│   │           └── base-craft.html ← Craft UI
│   │
│   └── utils/                      ← Utilities (3 arquivos)
│       ├── debug.js                ← Debug tools
│       ├── viewport.js             ← Viewport calculations
│       └── (FUTURE: grid.js)       ← Phase 1: Centralized GridUtils
│
├── tools/                          ← Ferramentas de desenvolvimento
│   └── editor/                     ← Level editor
│       ├── editor.html
│       ├── editor.js
│       ├── editor.css
│       ├── editor-config.js
│       ├── editor-export.js
│       ├── editor-persistence.js
│       ├── editor-render.js
│       ├── editor-save-server.js
│       ├── editor-ui.js
│       ├── editor-utils.js
│       ├── iniciar-editor-local.bat
│       └── INSTRUCOES_EDITOR.md
│
└── .git/                           ← Version control
```

---

## 2. Agrupamento por Responsabilidade

### Subsistema: Input & Controls
```
src/jogador/controles.js    → Input capture
src/config/controles.json   → Mapping
```

### Subsistema: Physics
```
src/core/gravidade.js                → Gravity simulation
src/core/desaceleracao-horizontal.js → Friction
src/core/colisoes.js                 → Collision detection
src/jogador/movimento.js             → Player physics (+ loop)
src/inimigos/ia-inimigo.js          → Enemy physics (+ AI + loop)
```

### Subsistema: Player Entity
```
src/jogador/movimento.js             → Main player loop
src/jogador/animacao.js              → Sprite animation
src/jogador/abertura-animacao.js     → Armor open/close
src/jogador/controles.js             → Input
src/jogador/inventario.js            → Equipment tracking
```

### Subsistema: Player Equipment
```
src/jogador/garra.js                 → Grab mechanic
src/jogador/jetpack.js               → Jetpack
src/jogador/acoes-especiais.js       → Dash, jump boost
src/jogador/combate-corpo-a-corpo.js → Melee
src/jogador/dano-estacas.js          → Spike collision
src/jogador/skills-efeitos.js        → Skill VFX
```

### Subsistema: Enemy Entity
```
src/inimigos/ia-inimigo.js           → Main enemy loop + AI
src/inimigos/inimigo.js              → Enemy entity base
src/inimigos/morte-inimigo.js        → Death logic
config/items/                        → Enemy drops
```

### Subsistema: Items & Pickup
```
src/itens/itens.js                   → Item spawning
src/itens/coletarItem.js             → Pickup logic
src/itens/criarItem.js               → Item factory
config/items/                        → Item definitions
```

### Subsistema: Pet/Companion
```
src/core/cao.js                      → Dog entity
src/core/bb.js                       → Baby entity
src/core/pet-habilidades.js          → Pet abilities
src/core/mecanica-resgate-bb.js      → Baby rescue
src/visual/animacoes-pets.js         → Pet rendering
```

### Subsistema: Rendering
```
src/visual/sincronizacao-visual.js   → Main render loop
src/visual/cenario.js                → Scenario rendering
src/visual/camera.js                 → Camera tracking
src/visual/layers.js                 → Layer management
src/visual/animacoes-equipamento.js  → Equipment anim
src/visual/efeitos-visuais.js        → VFX
```

### Subsistema: UI/Menu
```
src/ui/menu.js                       → Main menu
src/ui/mochila.js                    → Inventory UI
src/ui/hud.js                        → HUD display
src/ui/interacoes/                   → NPC dialogs
src/core/interacao-sistema.js        → Interaction system
```

### Subsistema: Audio
```
src/core/audio-manager.js            → SFX playback
assets/audio/                        → Sound files
```

### Subsistema: Skills
```
src/skills/skills.js                 → Skill definitions
src/jogador/skills-efeitos.js        → Skill effects
config/skills-dados.json             → Skill config
```

### Subsistema: Utilities
```
src/utils/debug.js                   → Debug tools
src/utils/viewport.js                → Viewport calcs
src/config/constants.js              → Global constants
(Phase 1: src/utils/grid.js)         → Centralized GridUtils
```

---

## 3. Duplicações Identificadas (Phase 0 Baseline)

### Duplicação 1: GridUtils (4 implementações)
- `src/visual/cenario.js` — versão 1 (~100 LOC)
- `src/inimigos/ia-inimigo.js` — versão 2 (~80 LOC)
- `src/utils/viewport.js` — versão 3 (~70 LOC)
- `src/inimigos/inimigo.js` — versão 4 (~60 LOC)
- **Total**: 310 LOC duplicado
- **Phase 1 Target**: Consolidar em `src/utils/grid.js` (~100 LOC)

### Duplicação 2: Knockback Logic (3 implementações)
- `src/jogador/movimento.js` — Player knockback
- `src/inimigos/ia-inimigo.js` — Enemy knockback
- `src/jogador/garra.js` — Grab knockback
- **Total**: ~100 LOC duplicado
- **Phase 1 Target**: Extrair para `src/utils/physics.js`

### Duplicação 3: Pet Lifecycle (3 implementações)
- `src/core/cao.js` — Dog loop
- `src/core/bb.js` — Baby loop
- (sem base class, copiar/colar)
- **Total**: ~150 LOC duplicado
- **Phase 3 Target**: Entity base class

### Duplicação 4: Storage Keys (8 hardcoded strings)
- `src/ui/menu.js`: 'menuResumo', 'ultimoLevel', etc.
- `src/jogador/crafting.js`: 'craftsAtivos'
- `src/jogador/skills-efeitos.js`: 'skillsDisponiveis'
- ... mais 5
- **Total**: 8 chaves sem normalização
- **Phase 1 Target**: `src/config/storage-keys.js`

---

## 4. Arquivos de Debug (Remover em Produção)

```
src/core/bb-debug.js              ← Remove: debugar BB entity
src/core/bb-debug-avancado.js     ← Remove: debugar BB avançado
src/core/bb-fix.js                ← Remove: BB fixes temporários
src/visual/grade-debug.js         ← Keep: Útil para level design
src/utils/firefox-scaling-fix.js  ← Keep: Browser workaround (necessário)
```

**Produção**: Remover bb-debug*.js, bb-fix.js via flag ou strip build

---

## 5. Arquivos de Config

```
config/configuracoes.json        ← Game settings
config/controles.json            ← Control mapping
config/skills-dados.json         ← Skill definitions
config/colete-itens.json         ← Equipment items
config/fases/index.json          ← Phase selector
config/fases/fase1.json ~ fase11.json ← Level data
config/fases/treino.json         ← Training
config/interacoes/mapeamento.json ← NPC mapping
config/items/*.json              ← Item definitions
```

**Carregamento**: Via `window.CONFIG` em constants.js + carregamento JSON em inicial.js

---

## 6. Ordem de Carregamento (Crítica)

**Ver ARCHITECTURE.md § 2 para ordem completa**

Resumo:
1. Config + Utils (constants, viewport, debug, ajuste-tela)
2. Core (audio, inicial, pet-habilidades, cao, bb, ...)
3. Jogador (inventario, controles, hud, garra, ...)
4. Inimigos (inimigo, morte-inimigo, ia-inimigo)
5. Skills (skills)
6. Visual (layers, cenario, camera, ...)
7. UI (mochila, menu)
8. Init (DOMContentLoaded → iniciarJogo)

**⚠️ Aviso**: Alterar ordem quebra jogo! Validar manualmente.

---

## 7. Scripts vs. Config vs. Data

| Categoria | Tipo | Exemplos | Mutável? |
|---|---|---|---|
| Lógica | .js | movimento.js, ia-inimigo.js | Sim (código) |
| Config | .json | configuracoes.json, controles.json | Sim (reload) |
| Dados de Nível | .json | fase1.json, items/bota.json | Sim (level editor) |
| Constantes | .js | constants.js | Não (compile-time) |
| Utilidades | .js | grid.js, physics.js | Sim (code) |
| Debug | .js | bb-debug.js | Remove em prod |

---

## 8. Documentação por Arquivo (Stubs)

```
src/config/constants.js
├── Define: CONFIG global
├── Usado por: Todos
└── Modificado por: Ninguém

src/core/inicial.js
├── Define: playerControle, inimigos, faseAtual
├── Carrega: Fases JSON, items JSON
└── Chamador: index.html DOMContentLoaded

src/jogador/movimento.js
├── Loop: cicloVidaPlayer() chamado em requestAnimationFrame
├── Responsável por: Physics, collision, state machine
└── Hotspot: 1900 LOC, CC=45 (Phase 2 split)

src/inimigos/ia-inimigo.js
├── Loop: cicloVidaInimigo() chamado em requestAnimationFrame
├── Responsável por: AI, pathfinding, combat
└── Hotspot: 1600 LOC, CC=38 (Phase 2 split)

src/visual/cenario.js
├── Loop: Renderização passiva
├── Responsável por: Parallax, tilemap rendering
└── Hotspot: 1200 LOC (Phase 2 extract)
```

---

## 9. Checklists por Tipo de Mudança

### Adding New Feature
```
1. Aonde vai?
   □ Novo arquivo em subsistema correto
   □ Ou existente se parte de subsistema
2. Carregamento?
   □ Adicionar <script> em index.html (ordem correta!)
   □ Ou import/require em arquivo existente (Phase 5)
3. Integração?
   □ Registrar em window.* (se global needed)
   □ Chamar inicializador em inicial.js
   □ Adicionar ciclo em main loop (se necessário)
4. Testes?
   □ Manual: 5 min gameplay
   □ Validação: sem console errors
   □ Performance: 60fps mantido
```

### Refactoring Existing
```
1. Preparar?
   □ Backup (git commit)
   □ Listar todos callers (grep)
   □ Documental current behavior
2. Refactor?
   □ Implementar novo código
   □ Manter API pública igual
   □ Adicionar JSDoc
3. Validar?
   □ Sem syntax errors
   □ Sem regressions (teste cada caller)
   □ 60fps maintained
   □ PR checklist
```

---

## 10. Migration Path (Future)

**Phase 1 (2 dias)**
- Centralizar GridUtils, storage keys, knockback
- Resultado: 18 arquivos alterados, -650 LOC

**Phase 2 (4 dias)**
- Dividir movimento.js em 3, ia-inimigo.js em 3
- Resultado: CC médio 45 → 18

**Phase 3 (3 dias)**
- Entity base class
- Resultado: -300 LOC, -50 global refs

**Phase 4 (3 dias)**
- Namespace refactor (window.GameState)
- Resultado: 100% rastreável global refs

**Phase 5 (5 dias)**
- ES6 modules + webpack
- Resultado: -15% dead code, -30% load time

---

**Versão**: 1.0 Phase 0  
**Última atualização**: 13-05-2026  
**Autor**: IA + Dev  
**Status**: ✅ Referência para Phase 1
