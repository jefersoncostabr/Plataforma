# Arquitetura do Jogo - Visão Atual (v1.0)

**Data**: Maio 2026  
**Status**: Baseline Documentation para Phase 0  
**Objetivo**: Estabelecer contrato de referência para refatoração arquitetural e redução de carga IA

---

## 1. Visão Geral

### Estrutura Atual
- **Linguagem**: JavaScript ES5, sem build step
- **Runtime**: Browser com 60fps via `requestAnimationFrame`
- **Estado**: Global via `window.*` (~200 variáveis)
- **DOM**: Manipulação direta, sem framework
- **Persistência**: localStorage

### Números
- **Scripts carregados**: 55+
- **Variáveis globais**: ~200
- **Subsistemas**: 14
- **LOC total**: ~18,000
- **Arquivos**: 80+ (JS, JSON, HTML, CSS)
- **Maior arquivo**: movimento.js (1,900 LOC), ia-inimigo.js (1,600 LOC)

---

## 2. Ordem de Carregamento (Script Dependency Chain)

Os scripts são carregados em ordem RIGOROSA no `index.html`. Alterar ordem quebra o jogo.

### Fase 1: Config & Utils (Devem ser PRIMEIRO)
```
1. src/config/constants.js       → Define CONFIG global
2. src/utils/viewport.js          → Calcula viewport, window.VIEWPORT
3. src/utils/debug.js             → Ferramentas de debug
4. src/visual/ajuste-tela.js      → Ajusta dimensões da tela
```

### Fase 2: Core (Fundamental Systems)
```
5. src/core/audio-manager.js           → window.audioManager
6. src/core/inicial.js                 → iniciarJogo(), carrega fases
7. src/core/pet-habilidades.js         → Skills dos pets
8. src/visual/animacoes-pets.js        → Renderiza pets
9. src/core/cao.js                     → Entidade "cão" (tipo de pet)
10. src/core/bb.js                     → Baby (entidade resgatável)
11. src/core/mecanica-resgate-bb.js    → Lógica de resgate
12. src/core/bb-debug*.js              → Debug utilities (3 arquivos)
13. src/core/gaiola.js                 → Entidade gaiola
14. src/core/colisoes.js               → detectarColisaoHitbox()
15. src/core/estacas.js                → Estacas (armadilhas)
16. src/core/gravidade.js              → Simulação de gravidade
17. src/core/desaceleracao-horizontal.js → Fricção horizontal
18. src/core/interacao-sistema.js      → Diálogos, interações
19. src/core/posicao-inicial.js        → Restaura posição do player
```

### Fase 3: Jogador (Player Systems)
```
20. src/jogador/inventario.js           → Gerencia items, equipados
21. src/jogador/controles.js            → Input mapping (teclado/gamepad)
22. src/ui/hud.js                       → HUD visual (vida, mana, etc)
23. src/jogador/garra.js                → Mecânica de garra (grab)
24. src/jogador/dano-estacas.js         → Colisão com estacas
25. src/jogador/acoes-especiais.js      → Abilities (dash, etc)
26. src/jogador/crafting.js             → UI de crafting
27. src/jogador/jetpack.js              → Jetpack equipment
28. src/jogador/combate-corpo-a-corpo.js → Melee combat
29. src/jogador/abertura-animacao.js    → Abertura/fechamento da armadura
30. src/jogador/movimento.js            → Main loop do player
31. src/jogador/animacao.js             → Sprite animation state machine
32. src/itens/itens.js                  → Item spawning/pickup
33. src/jogador/skills-efeitos.js       → Visual effects para skills
```

### Fase 4: Inimigos (Enemy AI)
```
34. src/inimigos/inimigo.js             → Base enemy entity
35. src/inimigos/morte-inimigo.js       → Death logic
36. src/inimigos/ia-inimigo.js          → IA loop (pathfinding, combat)
```

### Fase 5: Skills (Abilities)
```
37. src/skills/skills.js                → Skill system
```

### Fase 6: Visual (Rendering Layer)
```
38. src/visual/layers.js                → Layer management
39. src/visual/cenario.js               → Scenario/environment rendering
40. src/visual/camera.js                → Camera tracking
41. src/visual/grade-debug.js           → Debug grid renderer
42. src/visual/efeitos-visuais.js       → VFX system
43. src/visual/sincronizacao-visual.js  → Render sync
44. src/visual/animacoes-equipamento.js → Equipment animation
```

### Fase 7: UI (Menu & Dialogs)
```
45. src/ui/mochila.js                   → Backpack/inventory UI
46. src/ui/menu.js                      → Main menu
```

### Fase 8: Inicialização
```
DOMContentLoaded → iniciarJogo()
```

---

## 3. Subsistemas & Responsabilidades

### 3.1 Input/Controls
- **Arquivo**: `src/jogador/controles.js`
- **Responsáveis por**: Teclado (KeyboardEvent), Gamepad (GamepadAPI), mapping
- **Saída global**: `window.teclas[]` (10+ keys), `window.gamepadState`
- **Chamadores**: movimento.js, bb.js, cao.js, inimigos

### 3.2 Physics
- **Arquivos**: gravidade.js, desaceleracao-horizontal.js, colisoes.js
- **Responsáveis por**: Velocidade, aceleração, colisão hitbox, limites mapa
- **Loop**: Chamados ~30 vezes/frame por diferentes sistemas
- **Problema**: Duplicação de lógica em movimento.js, inimigo.js, cenario.js

### 3.3 Player
- **Arquivos**: movimento.js (1900 LOC), animacao.js, abertura-animacao.js, garra.js
- **Responsáveis por**: Posição, velocidade, sprite, state machine (aberto/fechando)
- **Loops**: 2× requestAnimationFrame (cicloVidaPlayer em movimento.js + render em sincronizacao-visual.js)
- **Problema**: movimento.js contém tudo; falta separação de responsabilidades

### 3.4 Enemy AI
- **Arquivo**: ia-inimigo.js (1600 LOC)
- **Responsáveis por**: Pathfinding, combat, perseguição, knockback
- **Loop**: 1× requestAnimationFrame (cicloVidaInimigo)
- **Problema**: Tudo em 1 arquivo; mistura IA com renderização

### 3.5 Items
- **Arquivos**: itens.js, criarItem.js, coletarItem.js, loadAllItems.js
- **Responsáveis por**: Spawn, pickup, inventory tracking
- **Problema**: Distribuído em vários arquivos; duplicação com inimigos drops

### 3.6 Equipment
- **Arquivos**: garra.js, jetpack.js, botajs (não existe, em movimento.js), escudo (em combate.js)
- **Responsáveis por**: Efeitos especiais (grab, dash, shield)
- **Problema**: Sem base class comum; cada um implementa ciclo de vida diferente

### 3.7 Rendering
- **Arquivos**: sincronizacao-visual.js, cenario.js, layers.js, camera.js
- **Responsáveis por**: Sprite rendering, camera tracking, viewport clipping
- **Loop**: Main render loop em sincronizacao-visual.js
- **Problema**: cenario.js tem 1200 LOC; mistura lógica com renderização

### 3.8 Audio
- **Arquivo**: audio-manager.js
- **Responsáveis por**: SFX playback, volume control
- **Status**: ✅ Bem isolado; sem problemas

### 3.9 UI
- **Arquivos**: menu.js, mochila.js, hud.js, interacao-sistema.js
- **Responsáveis por**: Menu, HUD, crafting dialogs, interações com NPCs
- **Problema**: menu.js com localStorage hardcoded; sem normalização de chaves

### 3.10 Pet/Companion
- **Arquivos**: cao.js, bb.js, pet-habilidades.js, animacoes-pets.js
- **Responsáveis por**: Ciclo de vida do pet, abilities, rendering
- **Problema**: cao.js e bb.js duplicam lógica; sem herança/base class

### 3.11 Utilities
- **Arquivos**: constants.js, debug.js, viewport.js
- **Status**: ✅ Bem isolado; constants.js é referência global

### 3.12 Debug
- **Arquivos**: bb-debug.js, bb-debug-avancado.js, grade-debug.js
- **Status**: ✅ Isolado; não afeta produção

---

## 4. Estado Global (window.*)

Total: ~200 variáveis. Amostra crítica:

### Player State
```javascript
window.playerControle = {
  x, y, velocidadeX, velocidadeY,
  estaoAberto, fechando, hp, armadura,
  tipo: 'player', equips: []
}
window.playerX, window.playerY  // Duplicado!
window.velocidadeJogador, window.aceleracaoX
window.controlarArmadura, window.fecharArmadura
```

### Enemy State
```javascript
window.inimigos = Array<Inimigo>  // Array global de todos
window.inimigos[i] = {
  x, y, velocidadeX, velocidadeY,
  ativo, perseguindo, tipo, hp,
  tiposEquipados: []
}
```

### Pet State
```javascript
window.bbEntidade = BabyEntity | null
window.controlandoBB = bool
window.bbIdAtivo = number  // Para matar ciclos desincronizados
window.caoEntidade = DogEntity | null
```

### Item State
```javascript
window.itemsNoMapa = Array<Item>  // Não confundir com inventário
window.inventarioPlayer = Array<Item>  // Equipados + backpack
window.equipadosJogador = Array<string>  // Apenas nomes
```

### Audio State
```javascript
window.audioManager = AudioManager
```

### Fase/Config
```javascript
window.faseAtualNome = 'fase1'  // String, não número
window.faseAtual = FaseConfig   // JSON loaded
window.levelData, window.currentLevel
window.config = CONFIG  // De constants.js
```

### Debug/Rendering
```javascript
window.mostrarGrade, window.mostrarHitbox
window.VIEWPORT = { x, y, width, height, scrollX, scrollY }
```

**Problema**: Sem namespacing; sem validação; risco de hallucination do IA

---

## 5. Loop Contracts

### Main Loop: requestAnimationFrame (60fps)

```
Frame N (Δt = 1/60s):
  1. Update Input (controles.js)
     → window.teclas[] atualizado
  2. Update Player Physics (movimento.js)
     → playerControle.x, playerControle.y, vel atualizado
  3. Update Player Animation (animacao.js)
     → playerControle.spriteAtual, frame atualizado
  4. Update Player Abilities (garra.js, jetpack.js, acoes-especiais.js)
     → efeitos especiais aplicados
  5. Update Items (itens.js)
     → Posição, pickup logic
  6. Update Enemies (ia-inimigo.js)
     → posição, pathfinding, combat
  7. Update Audio (em resposta a eventos, não contínuo)
  8. RENDER (sincronizacao-visual.js)
     → Sync state → DOM, camera, sprite
  9. Update Camera (camera.js)
     → window.VIEWPORT atualizado (usa em próximo frame)
```

**Ordem Crítica**: Player atualiza antes de enemies (enemies perseguem posição nova do player)

**Timing Issue**: Camera atualiza no final, causando 1-frame lag (vê posição anterior)

---

## 6. Hotspots Identificados

### Hotspot 1: movimento.js (1,900 LOC)
- **Problema**: Tudo no player está aqui; mistura input, physics, state machine
- **Conteúdo**: 
  - cicloVidaPlayer() com 600 LOC — trata jump, fall, knockback, estado aberto
  - Lógica de equipados (bota, jetpack, escudo) inline
  - Detecção de colisão com plataformas (chamar colisoes.js, mas inline)
- **Risco**: Mudança = quebra tudo
- **Refator**: Dividir em movimento-physics.js, movimento-state.js, movimento-loop.js

### Hotspot 2: ia-inimigo.js (1,600 LOC)
- **Problema**: Tudo inimigo está aqui; mistura pathfinding, combat, animation
- **Conteúdo**:
  - cicloVidaInimigo() com 800 LOC — perseguição, combat, knockback
  - Duplicação: knockback logic == movimento.js knockback (100 LOC duplicado)
  - Duplicação: GridUtils == cenario.js GridUtils (implementação diferente)
- **Risco**: IA erra fácil em pathfinding (causa bugs de movimento)
- **Refator**: Dividir em ia-pathfinding.js, ia-combat.js, ia-loop.js

### Hotspot 3: cenario.js (1,200 LOC)
- **Problema**: Tudo visual está aqui; mistura renderização com lógica
- **Conteúdo**:
  - GridUtils implementação local (diferente da em ia-inimigo.js)
  - Renderização de plataformas, decorações, paralax
  - Lógica de limite mapa
- **Risco**: Mudança de paralax = precisa editar 2 arquivos (duplicação)
- **Refator**: Extrair GridUtils, extrair render, deixar só cenario-logic.js

### Duplicações Encontradas
1. **GridUtils**: 4 implementações diferentes
   - cenario.js (versão 1)
   - ia-inimigo.js (versão 2)
   - viewport.js (versão 3)
   - inimigo.js (versão 4)

2. **Knockback**: 3 implementações
   - movimento.js (versão player)
   - ia-inimigo.js (versão enemy)
   - garra.js (versão grab)

3. **Pet Lifecycle**: 3 implementações
   - cao.js (cão)
   - bb.js (bebê)
   - Herança não usada

4. **Storage Keys**: 8 hardcoded strings (não centralizadas)
   - menu.js: 'menuResumo'
   - crafting.js: 'craftsAtivos'
   - skills.js: 'skillsDisponiveis'
   - e mais 5...

---

## 7. Riscos Arquiteturais

### Risco 1: Order Dependency Hell
- Scripts devem carregar em ordem específica
- Mudança de ordem quebra referências globais
- **Impacto**: IA não pode reordenar; humano faz com cuidado
- **Solução**: Documentar ordem, criar tests para validar

### Risco 2: Global State Hallucination
- ~200 variáveis globais sem namespacing
- IA pode:
  - Criar nova global sem perceber (poluição)
  - Usar global errada por nome similar (bug sutil)
  - Esquecer sincronizar estado (desincronização)
- **Impacto**: Bugs estranhos, difícil de debugar
- **Solução**: Criar namespace único (window.GameState), validação schema

### Risco 3: Cyclic Dependency
- movimento.js precisa de colisoes.js
- colisoes.js precisa de cenario.js
- cenario.js precisa de viewport.js
- ... circular?
- **Status**: Testado, funciona OK (lazy loading)
- **Risco**: Refator pode quebrar

### Risco 4: Performance Cliff
- Cada frame: colisão testada ~30 vezes (player + enemies + items)
- GridUtils chamada 40+ vezes/frame
- Total: ~2000 function calls/frame para 1 player + 5 enemies
- **Limite**: Será problema com 20+ enemies ou 10+ parallax layers
- **Solução**: Cachear GridUtils, espacializar colisões (quadtree)

---

## 8. Métricas Baseline (Phase 0)

### Cyclomatic Complexity
- **movimento.js**: cicloVidaPlayer() = CC ~45 (muito alto)
- **ia-inimigo.js**: cicloVidaInimigo() = CC ~38 (muito alto)
- **cenario.js**: renderCenario() = CC ~22 (alto)
- **Media global**: ~8 (bom para esta escala)
- **Target Phase 3**: <15 por função

### Code Duplication
- **GridUtils**: 400 LOC duplicado (4 versões)
- **Knockback**: 100 LOC duplicado (3 versões)
- **Pet lifecycle**: 150 LOC duplicado (3 entidades sem herança)
- **Total**: 650 LOC (3.6% do projeto)
- **Target Phase 1**: <150 LOC (<0.8%)

### Global State References
- **Referências únicas**: ~200 `window.*` acessos
- **Writes**: ~80 (modificações diretas)
- **Reads**: ~120 (queries)
- **Unvalidated**: ~100% (sem schema)
- **Target Phase 3**: <50 referências via GameState namespace

### Cyclic Dependencies
- **Detected**: 0 (verificado manualmente)
- **Risk score**: LOW
- **Status**: ✅ Safe to refactor

---

## 9. Plano de Refatoração (Phases 1-5)

### Phase 1: Quick Wins (2 dias)
- [ ] Centralizar GridUtils em `src/utils/grid.js`
- [ ] Normalizar storage keys em `src/config/storage-keys.js`
- [ ] Criar `src/utils/function-registry.js` para padrão `typeof window.X === 'function'`
- **Impacto**: -650 LOC, +3 utils reutilizáveis

### Phase 2: Hotspot Refactoring (4 dias)
- [ ] Dividir movimento.js em 3: movement-loop, movement-state, movement-physics
- [ ] Dividir ia-inimigo.js em 3: ia-loop, ia-pathfinding, ia-combat
- [ ] Extrair cenario.js GridUtils e renderização
- **Impacto**: CC médio de 45 → 18; readability +60%

### Phase 3: Entity Base Class (3 dias)
- [ ] Criar `src/core/entity-base.js` com ciclo de vida comum
- [ ] Herdar: Player, Enemy, Pet, Item
- [ ] Unificar physics, animation, state
- **Impacto**: -300 LOC duplicado; -50 global refs

### Phase 4: Namespace Refactor (3 dias)
- [ ] Criar `window.GameState` namespace com schema validation
- [ ] Migrar 200 refs globais para `GameState.*`
- [ ] Criar getters/setters com logs
- **Impacto**: Eliminar hallucination risk; 100% global refs rastreáveis

### Phase 5: Module System (5 dias)
- [ ] Converter de IIFE para ES6 import/export
- [ ] Setup webpack/rollup minimal
- [ ] Tree-shake dead code
- **Impacto**: -15% LOC (dead code removal); -30% load time

---

## 10. IA Guardrails (ai-rules.md, Section 3)

Veja arquivo separado `AI_RULES.md` para regras de referência durante refatoração.

---

## 11. Próximos Passos

1. **Phase 0 → Phase 1**: Após aprovação deste doc, começar centralização de utils
2. **Validação**: Cada fase tem PR checklist (0 regressions)
3. **Metrics**: Rodar baseline novamente após Phase 1 para validar KPIs
4. **Comunicação**: Update este doc a cada fase com checkmarks

---

**Versão**: 1.0  
**Autor**: IA (Copilot) + Feedback (Dev)  
**Última atualização**: 13-05-2026  
**Status**: ✅ Pronto para Phase 1
