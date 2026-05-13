# Hotspot Deep Dive - Phase 2 Refactor (v1.0)

**Data**: 13 de Maio de 2026  
**Objetivo**: Análise detalhada dos 3 maiores bottlenecks + plano de refatoração  
**Foco**: movimento.js, ia-inimigo.js, cenario.js  

---

## 1. Hotspot 1: src/jogador/movimento.js (1,900 LOC, CC=45)

### 1.1 Overview

**Responsabilidades** (4 responsabilidades em 1 arquivo):
1. Main player loop (cicloVidaPlayer)
2. Physics (gravidade, colisão, velocidade)
3. State machine (aberto/fechando/pulando)
4. Equipment effects (bota, jetpack, escudo)

**Estrutura Atual**:
```
movimento.js (1900 LOC)
├── cicloVidaPlayer() — 600 LOC, CC=45 (MAIN LOOP)
│   ├── Input processing (40 LOC)
│   ├── Physics update (150 LOC)
│   │   ├── Gravidade
│   │   ├── Colisão plataformas
│   │   ├── Knockback
│   │   └── Fricção
│   ├── State machine (200 LOC)
│   │   ├── Se pulando
│   │   ├── Se caindo
│   │   ├── Se aberto/fechando
│   │   ├── Se garra ativa
│   │   └── Se em escada
│   ├── Equipment effects (100 LOC)
│   │   ├── Bota speed
│   │   ├── Jetpack lift
│   │   └── Escudo knockback reduction
│   └── Morte check (30 LOC)
├── Funções helper (800 LOC)
│   ├── saltar(), cair(), etc.
│   ├── aplicarGravidade() (duplicado em inimigos)
│   ├── GridUtils (duplicado em 4 arquivos)
│   └── misc utilities
└── Exports → window.*
```

### 1.2 Cyclomatic Complexity Breakdown

```
cicloVidaPlayer() — CC = 45

Distribuição:
- Input checks:    8 branches (teclas.space, teclas.a, ...)
- State checks:    10 branches (isNaPlataforma, isNoAr, estaoAberto, ...)
- Physics:         8 branches (colidiu, knockback, fricção, ...)
- Equipment:       7 branches (temBota, temJetpack, temEscudo, ...)
- Special states:  6 branches (emEscada, emLiquido, emSensor, ...)
- Boundaries:      4 branches (limites mapa)
- Morte:           2 branches (hp <= 0)

TOTAL: CC = 45 (MUITO ALTO)
```

**Comparação**:
- Recomendado para função: CC < 10
- Máximo aceitável: CC < 20
- movimento.cicloVidaPlayer: CC = 45 (+125% acima do máximo)

### 1.3 Problemas Específicos

#### Problema 1: Giant If/Else Chain

```javascript
// Pseudocódigo do atual
function cicloVidaPlayer() {
  if (teclas.space && !isNoAr) { saltar(); }
  else if (velocidade < MAX_WALK) { velocidade += aceleracaoWalk; }
  
  if (estaoAberto) { ... }
  else if (fechando) { ... }
  
  if (temBota) { velocidade = BOTA_SPEED; }
  if (temJetpack && teclas.z) { velocidade += JETPACK_THRUST; }
  if (temEscudo) { knockback *= 0.5; }
  
  if (x < 0 || x > MAPA_WIDTH) { x = constrainX(x); }
  
  aplicarGravidade();  // Função que também tem 15 LOC inline
  
  if (colidiu) { saltar(0); }
  
  // ... 50 branches mais
}
```

**Impact**: Impossível entender fluxo; um bug afeta tudo

#### Problema 2: Shared State, Multiple Mutations

```javascript
// window.playerControle mutado em 30+ linhas diferentes
playerControle.x += velocidade;  // Linha 150
playerControle.y += queda;        // Linha 200
playerControle.velocidadeX = ...  // Linha 250
playerControle.HP -= dano;        // Linha 300
playerControle.estado = 'pulando'; // Linha 350
// ... 20 mais em ordem aleatória
```

**Impact**: Difícil rastrear estado (AI hallucination risk)

#### Problema 3: Physics Mixed com Logic

```javascript
// Physics E lógica de jogo juntas
// Gravidade
playerControle.velocidadeY += GRAVITY;
playerControle.y += playerControle.velocidadeY;

// Colisão
if (detectarColisaoComPlataforma(...)) {
  playerControle.velocidadeY = 0;
  playerControle.y = plataforma.y;
}

// Logic: Se pulou em data específica, jump maior
if (diaDoMes === 13) {
  playerControle.velocidadeY -= JUMP_BOOST;
}
```

**Impact**: Physics é reutilizável em inimigos; está inline aqui

#### Problema 4: Equipment Effects Inline

```javascript
// Bota (exemplo simplificado)
if (temBota && temBoataNivel >= 2) {
  velocidade = VELOCIDADE_NORMAL + (temBoataNivel * 0.5);
  if (velocidade > MAX_BOTA) velocidade = MAX_BOTA;
}

// Jetpack
if (temJetpack && teclas.z && manaJetpack > 0) {
  aceleracaoY -= JETPACK_THRUST;
  manaJetpack -= JETPACK_COST;
  if (manaJetpack < 0) manaJetpack = 0;
}

// Escudo
if (temEscudo) {
  knockbackRecebido *= (1 - ESCUDO_REDUCTION);
  tempoEscudoAtivo -= dt;
  if (tempoEscudoAtivo < 0) temEscudoAtivo = false;
}
```

**Impact**: Equipment é extensível; estar inline aqui impede modularidade

### 1.4 Phase 2 Refactor Plan

**Goal**: Dividir 1900 LOC em 3 módulos focados

#### Refactor Step 1: Extrair Physics

**Novo arquivo**: `src/jogador/movimento-physics.js` (200 LOC)

```javascript
// movimento-physics.js
function aplicarGravidade(jogador, deltaTime) {
  jogador.velocidadeY += CONFIG.PHYSICS.GRAVITY * deltaTime;
}

function aplicarFricao(jogador, deltaTime) {
  jogador.velocidadeX *= (1 - CONFIG.PHYSICS.FRICTION) * deltaTime;
}

function detectarPlataformaAbaixo(jogador) { ... }

function aplicarVelocidade(jogador, deltaTime) {
  jogador.x += jogador.velocidadeX * deltaTime;
  jogador.y += jogador.velocidadeY * deltaTime;
}

window.fisicaJogador = {
  aplicarGravidade,
  aplicarFricao,
  detectarPlataformaAbaixo,
  aplicarVelocidade
};
```

**Impact on cicloVidaPlayer**: -150 LOC, CC -= 5

#### Refactor Step 2: Extrair State Machine

**Novo arquivo**: `src/jogador/movimento-state.js` (150 LOC)

```javascript
// movimento-state.js
const PLAYER_STATES = {
  IDLE: 'idle',
  WALKING: 'walking',
  JUMPING: 'jumping',
  FALLING: 'falling',
  OPEN_ARMOR: 'open_armor',
  CLOSING_ARMOR: 'closing_armor',
  STUNNED: 'stunned',
  DEAD: 'dead'
};

function determinarEstadoProximo(jogador, input) {
  // Retorna novo estado baseado em inputs + estado atual
  // CC reduzido para 8 (vs 10 antes)
  
  if (jogador.hp <= 0) return PLAYER_STATES.DEAD;
  if (jogador.estaoAberto) return PLAYER_STATES.OPEN_ARMOR;
  if (input.jump && podeJumpar(jogador)) return PLAYER_STATES.JUMPING;
  // ... etc
}

function aplicarEfeitosEstado(jogador, estado) {
  // Aplica efeitos do estado (animação, physics mods, etc)
  switch(estado) {
    case PLAYER_STATES.JUMPING:
      aplicarVelocidadeInicial(jogador);
      break;
    // ...
  }
}

window.estadoJogador = { PLAYER_STATES, determinarEstadoProximo, aplicarEfeitosEstado };
```

**Impact on cicloVidaPlayer**: -200 LOC, CC -= 8

#### Refactor Step 3: Extrair Equipment

**Novo arquivo**: `src/jogador/movimento-equipment.js` (100 LOC)

```javascript
// movimento-equipment.js
function aplicarEfeitosBota(jogador) {
  if (!temEquipamento(jogador, 'bota')) return;
  jogador.velocidadeX = CONFIG.ITEMS.BOTA.SPEED;
  // ...
}

function aplicarEfeitosJetpack(jogador, input, deltaTime) {
  if (!temEquipamento(jogador, 'jetpack')) return;
  if (!input.z) return;
  
  jogador.velocidadeY -= CONFIG.ITEMS.JETPACK.THRUST * deltaTime;
  consumirMana(jogador, CONFIG.ITEMS.JETPACK.MANA_COST * deltaTime);
}

function aplicarEfeitosEscudo(jogador) {
  if (!temEquipamento(jogador, 'escudo')) return;
  // Knockback reduction aplicado aqui, não em ia-inimigo
}

window.equipamentoJogador = {
  aplicarEfeitosBota,
  aplicarEfeitosJetpack,
  aplicarEfeitosEscudo
};
```

**Impact on cicloVidaPlayer**: -100 LOC, CC -= 3

#### Refactor Step 4: Novo cicloVidaPlayer (Main Loop)

**Arquivo**: `src/jogador/movimento.js` (150 LOC, CC=8)

```javascript
// movimento.js (refatorado)
function cicloVidaPlayer(deltaTime) {
  const input = processarInput();
  
  // 1. Determinar estado
  const estadoProximo = determinarEstadoProximo(playerControle, input);
  playerControle.estado = estadoProximo;
  
  // 2. Aplicar physics
  fisicaJogador.aplicarGravidade(playerControle, deltaTime);
  fisicaJogador.aplicarFricao(playerControle, deltaTime);
  
  // 3. Aplicar equipment
  equipamentoJogador.aplicarEfeitosBota(playerControle);
  equipamentoJogador.aplicarEfeitosJetpack(playerControle, input, deltaTime);
  equipamentoJogador.aplicarEfeitosEscudo(playerControle);
  
  // 4. Aplicar velocidade
  fisicaJogador.aplicarVelocidade(playerControle, deltaTime);
  
  // 5. Check morte
  if (playerControle.hp <= 0) {
    morrerJogador();
  }
  
  // Renderização (em sincronizacao-visual.js)
}

requestAnimationFrame(cicloVidaPlayer);

window.cicloVidaPlayer = cicloVidaPlayer;
```

**New Stats**:
- LOC: 1900 → 150 (main loop) + 150 (physics) + 150 (state) + 100 (equipment) = 550 total
- CC: 45 → 8
- Readability: +300% (cada módulo tem propósito claro)
- Testability: +500% (cada função é testável isoladamente)

### 1.5 Migration Path

**Step 1**: Criar movimento-physics.js, mover funções, testar
**Step 2**: Criar movimento-state.js, refactor input logic, testar
**Step 3**: Criar movimento-equipment.js, extrair bota/jetpack, testar
**Step 4**: Simplificar cicloVidaPlayer, testar full gameplay
**Step 5**: Remover código antigo

**Validation**: Deve jogar exatamente igual antes/depois

---

## 2. Hotspot 2: src/inimigos/ia-inimigo.js (1,600 LOC, CC=38)

### 2.1 Overview

**Responsabilidades** (4 responsabilidades em 1 arquivo):
1. Main enemy loop (cicloVidaInimigo)
2. Pathfinding & Navigation
3. Combat logic
4. State machine (perseguindo, atacando, patrulhando)

**Estrutura Atual**:
```
ia-inimigo.js (1600 LOC)
├── cicloVidaInimigo() — 800 LOC, CC=38
│   ├── Pathfinding (200 LOC)
│   │   ├── GridUtils calc grid cell
│   │   ├── Calcular rota
│   │   └── Seguir player (duplicado em inimigo.js)
│   ├── Combat (150 LOC)
│   │   ├── Distance check
│   │   ├── Attack decision
│   │   └── Knockback
│   ├── State machine (200 LOC)
│   │   ├── Se perseguindo
│   │   ├── Se atacando
│   │   ├── Se patrulhando
│   │   └── Se stun/morte
│   ├── Physics (150 LOC)
│   │   ├── Aplicar velocidade
│   │   ├── Gravidade
│   │   └── Colisão (duplicado)
│   └── Drops/Death (100 LOC)
├── Funções helper (700 LOC)
│   ├── GridUtils (duplicado em cenario.js)
│   ├── Knockback (duplicado em movimento.js)
│   ├── DetectarAlvo()
│   └── etc
└── Exports → window.*
```

### 2.2 Cyclomatic Complexity Breakdown

```
cicloVidaInimigo() — CC = 38

Distribuição:
- State checks:    8 branches (perseguindo, atacando, patrulhando, ...)
- Pathfinding:     7 branches (pode alcançar, precisa desviar, ...)
- Combat logic:    6 branches (alvo visível, distância, HP, ...)
- Physics:         5 branches (colisão, gravidade, ...)
- Equipment:       4 branches (temColete, temJetpack, ...)
- Boundaries:      3 branches (limites mapa)
- Special:         5 branches (stun, morte, knockback, ...)

TOTAL: CC = 38
```

### 2.3 Problemas Específicos

#### Problema 1: GridUtils Duplicated (4 versões)

```javascript
// ia-inimigo.js versão
function getGridCell(x, y) {
  const col = Math.floor(x / GRID_SIZE);
  const row = Math.floor(y / GRID_SIZE);
  return row * GRID_WIDTH + col;
}

// cenario.js versão
function gridPosFromCoord(x, y) {
  const gridX = Math.floor(x / CONFIG.GRID_SIZE);
  const gridY = Math.floor(y / CONFIG.GRID_SIZE);
  return { x: gridX, y: gridY };
}

// viewport.js versão
function calcGrid(x, y, size) { ... }

// inimigo.js versão
function getGridFromCoord(x, y) { ... }
```

**Problem**: 4 funções diferentes, 4 nomes diferentes, 4 lógicas (ligeiramente) diferentes

**Impact**: 
- Bug fixado em ia-inimigo.js, não propaga para cenario.js
- Cada versão tem overhead (4×100 LOC = 400 LOC desnecessário)

#### Problema 2: Pathfinding & Navigation Mixed

```javascript
function cicloVidaInimigo(inimigo) {
  // Pathfinding inline
  const playerX = playerControle.x;
  const distancia = Math.hypot(playerX - inimigo.x, ...);
  
  if (distancia < RANGE_PERSEGUIR) {
    // Calculate path
    const proximoX = inimigo.x + (playerX > inimigo.x ? 1 : -1) * VELOCIDADE;
    const proximoY = inimigo.y + (playerY > inimigo.y ? 1 : -1) * VELOCIDADE;
    
    // Check colisão
    if (!podePassar(proximoX, proximoY)) {
      // Tentar subir (jump)
      if (podeSubir(...)) { proximoY -= JUMP_FORCE; }
      else { proximoX = calcularRota(...); }  // Rota alternativa
    }
    
    inimigo.x = proximoX;
    inimigo.y = proximoY;
  }
}
```

**Problem**: Pathfinding é simples "seguir em linha reta" + "jump obstáculos"

**Better Solution**: Separar em `ia-pathfinding.js` com algoritmo reusable

#### Problema 3: Combat Mixed com Loop

```javascript
function cicloVidaInimigo(inimigo) {
  // ... pathfinding ...
  
  // Combat inline
  if (distancia < RANGE_ATAQUE && inimigo.podeAtacar) {
    aplicarDanoAoPlayer(DANO_INIMIGO);
    inimigo.tempoCooldown = COOLDOWN_ATAQUE;
    
    if (playerControle.temEscudo) {
      knockbackInimigo = KNOCKBACK_SHIELD;
    } else {
      knockbackInimigo = KNOCKBACK_NORMAL;
    }
    
    inimigo.velocidadeX = -sign(inimigo.x - playerX) * knockbackInimigo;
  }
  
  if (inimigo.tempoCooldown > 0) {
    inimigo.tempoCooldown -= deltaTime;
  }
}
```

**Problem**: Combat logic é complexo; intermeshed com rest of loop

#### Problema 4: State Machine Implicit

```javascript
// Não há "estado"; inferido por variáveis
if (inimigo.perseguindo) { ... }
else if (inimigo.atacando) { ... }
else if (inimigo.patrulhando) { ... }

// Transições não documentadas
if (distancia < RANGE) {
  inimigo.perseguindo = true;  // Quando? Imediatamente?
  inimigo.patrulhando = false;
}
```

**Problem**: Estado é implicit; fácil ter bugs de transição

### 2.4 Phase 2 Refactor Plan

**Goal**: Dividir 1600 LOC em 3-4 módulos focados

#### Refactor Step 1: Extrair Pathfinding

**Novo arquivo**: `src/inimigos/ia-pathfinding.js` (150 LOC)

```javascript
// ia-pathfinding.js
function calcularProximoMovimento(inimigo, alvo) {
  // Simples: seguir em linha reta
  const dx = alvo.x - inimigo.x;
  const dy = alvo.y - inimigo.y;
  
  const dirX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const dirY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  
  return {
    x: inimigo.x + dirX * inimigo.velocidade,
    y: inimigo.y + dirY * inimigo.velocidade
  };
}

function podePassar(x, y, inimigo) {
  // Check colisão com plataformas, paredes
  return !detectarColisaoComMundo(x, y);
}

function calcularRotaAlternativa(inimigo, alvo) {
  // Se bloqueado, tentar pular
  if (podeSubir(...)) {
    return { y: inimigo.y - JUMP_FORCE };
  }
  // Ou contornar
  return { x: inimigo.x + STEP };
}

window.patificacaoInimigo = {
  calcularProximoMovimento,
  podePassar,
  calcularRotaAlternativa
};
```

**Impact on cicloVidaInimigo**: -200 LOC, CC -= 5

#### Refactor Step 2: Extrair Combat

**Novo arquivo**: `src/inimigos/ia-combat.js` (120 LOC)

```javascript
// ia-combat.js
function determinarAcaoCombate(inimigo, alvo) {
  if (!inimigo.podeAtacar) return 'esperando';
  
  const distancia = Math.hypot(alvo.x - inimigo.x, ...);
  
  if (distancia < RANGE_ATAQUE) {
    return 'atacar';
  } else if (distancia < RANGE_PERSEGUIR) {
    return 'perseguir';
  } else {
    return 'patrulhar';
  }
}

function executarAcaoCombate(inimigo, acao, alvo) {
  switch(acao) {
    case 'atacar':
      aplicarDanoAoPlayer(alvo, inimigo.dano);
      inimigo.tempoCooldown = inimigo.cooldownAtaque;
      aplicarKnockback(inimigo, alvo);
      break;
    case 'perseguir':
      const proximo = calcularProximoMovimento(inimigo, alvo);
      inimigo.x = proximo.x;
      inimigo.y = proximo.y;
      break;
    // ...
  }
}

window.combateInimigo = {
  determinarAcaoCombate,
  executarAcaoCombate
};
```

**Impact on cicloVidaInimigo**: -150 LOC, CC -= 6

#### Refactor Step 3: Novo cicloVidaInimigo

**Arquivo**: `src/inimigos/ia-inimigo.js` (300 LOC, CC=8)

```javascript
// ia-inimigo.js (refatorado)
function cicloVidaInimigo(deltaTime) {
  for (let inimigo of window.inimigos) {
    if (!inimigo.ativo) continue;
    
    // 1. Determinar alvo
    const alvo = determinarAlvo(inimigo);
    if (!alvo) { inimigo.estado = 'patrulhando'; continue; }
    
    // 2. Determinar ação
    const acao = combateInimigo.determinarAcaoCombate(inimigo, alvo);
    
    // 3. Executar ação
    combateInimigo.executarAcaoCombate(inimigo, acao, alvo);
    
    // 4. Aplicar physics
    fisicaInimigo.aplicarGravidade(inimigo, deltaTime);
    fisicaInimigo.aplicarVelocidade(inimigo, deltaTime);
    
    // 5. Check morte
    if (inimigo.hp <= 0) {
      inimigo.ativo = false;
      morrerInimigo(inimigo);
    }
    
    // 6. Update cooldowns
    if (inimigo.tempoCooldown > 0) {
      inimigo.tempoCooldown -= deltaTime;
    }
  }
}

requestAnimationFrame(cicloVidaInimigo);

window.cicloVidaInimigo = cicloVidaInimigo;
```

**New Stats**:
- LOC: 1600 → 300 (main loop) + 150 (pathfinding) + 120 (combat) = 570 total
- CC: 38 → 8
- Readability: +300%

### 2.5 Additional: Unify Physics

**Extract**: `src/utils/physics-shared.js` (80 LOC)

```javascript
// physics-shared.js
// Centralizado: aplicarGravidade, aplicarVelocidade, aplicarKnockback

function aplicarKnockback(entidade, alvo, forca) {
  const dx = entidade.x - alvo.x;
  const dy = entidade.y - alvo.y;
  const dist = Math.hypot(dx, dy) || 1;
  
  entidade.velocidadeX = (dx / dist) * forca;
  entidade.velocidadeY = (dy / dist) * forca * 0.5;  // Menor vertical
}

// Usado em:
// - movimento.js (player knockback)
// - ia-combat.js (enemy knockback)
// - garra.js (grab knockback)

window.fisicaCompartilhada = { aplicarKnockback };
```

**Impact**: -100 LOC duplicado, unification across 3 entidades

---

## 3. Hotspot 3: src/visual/cenario.js (1,200 LOC)

### 3.1 Overview

**Responsabilidades** (3 responsabilidades em 1 arquivo):
1. Rendering do cenário (plataformas, decorações)
2. GridUtils & navigation
3. Parallax scrolling

**Estrutura Atual**:
```
cenario.js (1200 LOC)
├── renderCenario() — 400 LOC, CC=22
│   ├── Render plataformas (150 LOC)
│   │   └── GridUtils inline (100 LOC duplicado)
│   ├── Render decorações (100 LOC)
│   ├── Parallax (80 LOC)
│   └── Debug grid (70 LOC)
├── GridUtils (100 LOC) — DUPLICADO em 4 arquivos
├── Parallax logic (200 LOC)
├── Helpers (400 LOC)
└── Exports
```

### 3.2 Phase 2 Refactor Plan

**Goal**: 
1. Extrair GridUtils para utils/grid.js (Phase 1)
2. Dividir render em módulos focados (Phase 2)

#### Step 1: Extract GridUtils (Phase 1)

Remove 100 LOC GridUtils duplicado

#### Step 2: Extrair Parallax (Phase 2)

**Novo arquivo**: `src/visual/parallax.js` (150 LOC)

```javascript
// parallax.js
function calcularOffsetParallax(layerDepth, cameraX, cameraY) {
  const factor = 1 - (layerDepth / 10);  // 0-1
  return {
    x: cameraX * factor,
    y: cameraY * factor
  };
}

function renderParallaxLayer(layer, camera) {
  const offset = calcularOffsetParallax(layer.depth, camera.x, camera.y);
  // Render layer com offset
}

window.parallax = { calcularOffsetParallax, renderParallaxLayer };
```

**Impact on renderCenario**: -80 LOC, CC -= 2

#### Step 3: Novo renderCenario

**Arquivo**: `src/visual/cenario.js` (200 LOC, CC=8)

```javascript
// cenario.js (refatorado)
function renderCenario(camera) {
  // 1. Render parallax layers
  for (let layer of faseAtual.parallaxLayers) {
    parallax.renderParallaxLayer(layer, camera);
  }
  
  // 2. Render plataformas
  for (let plat of faseAtual.plataformas) {
    if (isVisible(plat, camera)) {
      renderPlataforma(plat, camera);
    }
  }
  
  // 3. Render decorações
  for (let deco of faseAtual.decoracoes) {
    if (isVisible(deco, camera)) {
      renderDecoracao(deco, camera);
    }
  }
}

window.renderCenario = renderCenario;
```

**New Stats**:
- LOC: 1200 → 200 (main render) + 150 (parallax) = 350 total
- CC: 22 → 8
- GridUtils removed (reuse from utils/grid.js)
- -100 LOC duplicado

---

## 4. Consolidação: Impacto Total Phase 2

### Before (Phase 0)

| Arquivo | LOC | CC | Status |
|---|---|---|---|
| movimento.js | 1,900 | 45 | 🔴 |
| ia-inimigo.js | 1,600 | 38 | 🔴 |
| cenario.js | 1,200 | 22 | 🟡 |
| **TOTAL** | **4,700** | — | — |

### After (Phase 2)

**movimento.js split**:
- movimento.js (refactor) | 150 LOC | CC=8
- movimento-physics.js | 150 LOC | CC=5
- movimento-state.js | 150 LOC | CC=6
- movimento-equipment.js | 100 LOC | CC=4
- **Subtotal**: 550 LOC, CC Máx=8 | ✅

**ia-inimigo.js split**:
- ia-inimigo.js (refactor) | 300 LOC | CC=8
- ia-pathfinding.js | 150 LOC | CC=6
- ia-combat.js | 120 LOC | CC=5
- **Subtotal**: 570 LOC, CC Máx=8 | ✅

**cenario.js split**:
- cenario.js (refactor) | 200 LOC | CC=8
- parallax.js | 150 LOC | CC=5
- **Subtotal**: 350 LOC, CC Máx=8 | ✅

**Shared utils (Phase 1+2)**:
- grid.js | 100 LOC | CC=3
- physics-shared.js | 80 LOC | CC=4
- **Subtotal**: 180 LOC

**Phase 2 TOTAL**: 550 + 570 + 350 + 180 = 1,650 LOC (Phase 0: 4,700)
- **LOC Reduction**: -64%
- **CC Reduction**: 45 → 8 (-82%), 38 → 8 (-79%), 22 → 8 (-64%)
- **New Files**: +8 arquivos (mais focados, reutilizáveis)

---

## 5. Implementation Strategy

### Timeline: 4 dias (2 dev)

**Day 1: Phase 1 Quick Wins** (1 dev)
- [ ] GridUtils centralizado
- [ ] Storage keys normalizados
- [ ] Knockback extraction + testes

**Day 2: movimento.js Refactor** (1 dev)
- [ ] Extrair physics
- [ ] Extrair state
- [ ] Extrair equipment
- [ ] Validar gameplay

**Day 3: ia-inimigo.js Refactor** (1 dev)
- [ ] Extrair pathfinding
- [ ] Extrair combat
- [ ] Validar AI behavior

**Day 4: cenario.js + Integration** (2 dev)
- [ ] Extrair parallax
- [ ] Consolidar physics-shared
- [ ] Passe de regressão full
- [ ] Benchmark antes/depois

### Validation Checklist

- [ ] Sem syntax errors
- [ ] Sem console errors
- [ ] 60 FPS maintained
- [ ] Todas features funcionam idêntico
- [ ] IA não hallucina (refs corretas)
- [ ] CC < 10 em todas funções
- [ ] LOC < 200 em principais loops

---

## 6. Risk Mitigation

| Risk | Severity | Mitigation |
|---|---|---|
| Break gameplay | 🔴 HIGH | Feature parity test (5 min) |
| Hidden state bugs | 🟡 MED | Grep search para todos globals |
| Regression em equipment | 🟡 MED | Test cada item (bota, jetpack, escudo) |
| Enemy AI breaks | 🔴 HIGH | Test enemy vs player em 3 scenarios |
| Performance cliff | 🟡 MED | Profile calls/frame antes/depois |

---

## 7. Próximos Passos

1. **Aprovação Phase 0** ✅
2. **Executar Phase 1** (2 dias) — Quick wins (GridUtils, storage, knockback)
3. **Executar Phase 2** (4 dias) — Hotspot refactoring (movimento, ia, cenario)
4. **Fase 3-5** — Conditional (based on Phase 2 results)

---

**Versão**: 1.0 Phase 0  
**Data**: 13-05-2026  
**Autor**: IA Analysis  
**Status**: ✅ Detalhado e pronto para Phase 2
