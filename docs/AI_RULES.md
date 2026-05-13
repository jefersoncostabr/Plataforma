# IA Guardrails & Rules (Phase 0, Ref: ai-rules.md)

**Data**: Maio 2026  
**Objetivo**: Estabelecer regras objetivas para IA e humanos durante refatoração  
**Versão**: 1.0 Phase 0

---

## 1. File Size & Complexity

### Rule 1.1: LOC Limits (Linhas de Código)

| Tipo de Arquivo | Limite Recomendado | Exceções | Justificativa |
|---|---|---|---|
| Utility | 100 LOC | GridUtils, constants allowed 200 | Simples, reutilizável |
| Hook/Loop | 300 LOC | Main loops (movimento.js, ia-inimigo.js, cenario.js) até 500 | Necessário por design |
| Subsystem | 600 LOC | Physics (gravidade + colisao) até 800 | Complexidade permitida |
| Config | Sem limite | Storage, constants JSON | Dados, não lógica |
| DEBUG | 100 LOC | Debug files (bb-debug*.js) até 300 | Removido em produção |

### Rule 1.2: Cyclomatic Complexity

- **MAX por função**: 15 (média)
- **Exceção**: Main loops (cicloVidaPlayer, cicloVidaInimigo) até 25
- **Teste**: Se CC > 15, quebrar em sub-funções

Exemplo:
```javascript
// ❌ BAD: CC = 18 (10 if branches)
function atualizarPerseguicao(inimigo) {
  if (inimigo.ativo && inimigo.alvo && ...) {
    if (distancia < RANGE_A) { ... }
    else if (distancia < RANGE_B) { ... }
    // ... 8 branches mais
  }
}

// ✅ GOOD: CC = 5
function atualizarPerseguicao(inimigo) {
  if (!podePereguir(inimigo)) return;
  const acao = determinarAcao(inimigo);  // CC=3
  executarAcao(inimigo, acao);
}
```

### Rule 1.3: Function Length

- **MAX**: 80 linhas por função
- **Exceção**: Main loop functions até 150 linhas
- **Guideline**: Se não cabe na tela (80 linhas), quebrar em sub-funções

---

## 2. Naming Conventions

### Rule 2.1: Variable Names

```javascript
// ✅ GOOD
const velocidadeX = 5;
const estaoAberto = true;
const inimigosAtivos = [];
const playerControle = { x: 0, y: 0 };

// ❌ BAD
const velX = 5;           // Abreviação, não claro
const isOpen = true;      // Mistura EN/PT
const en = [];            // Muito curto
const p = {};             // Sem contexto
```

**Regra geral**: Português, completo, sem abreviações (exceto em loops: `i`, `j`, `x`, `y` permitidos)

### Rule 2.2: Function Names

```javascript
// ✅ GOOD
function calcularDistancia(a, b) { }
function detectarColisao(player, plataforma) { }
function aplicarGravidade(entidade) { }
function atualizarAnimacao(sprite, frame) { }

// ❌ BAD
function calc(a, b) { }           // Abreviação
function detectCol(p, pf) { }      // Abreviação
function update_gravity(...) { }   // Snake case português
function applyGravity(...) { }     // Inglês
```

**Regra geral**: verbo + substantivo, português, camelCase

### Rule 2.3: Global Variables Naming

```javascript
// ✅ GOOD
window.playerControle       // Entidade player
window.inimigos             // Array de inimigos
window.teclas               // Input state
window.CONFIG               // Constantes (SCREAMING_SNAKE_CASE para enums)
window.faseAtualNome        // String ID da fase

// ❌ BAD
window.player               // Ambíguo (classe, instância, state?)
window.ens                  // Abreviação
window.keys                 // Inglês
window.config               // Lowcase para constantes globais
window.currentLevel         // Inglês misturado
```

**Regra geral**: Usar namespace (vide Phase 4), prefixo claro (playerControle, inimigos, não p, ens)

---

## 3. Code Organization

### Rule 3.1: File Placement

```
src/
  config/          → Constantes, enums, schemas
  core/            → Physics, input, base systems
  jogador/         → Player-specific logic
  inimigos/        → Enemy AI logic
  itens/           → Item logic
  skills/          → Ability system
  ui/              → Menu, HUD, dialogs
  visual/          → Rendering, animation, camera
  utils/           → Utilities compartilhados (CENTRALIZADOS em Phase 1)

tools/
docs/
```

### Rule 3.2: IIFE Module Pattern

Cada arquivo `.js` deve ser uma IIFE auto-executável:

```javascript
// ✅ GOOD
(function() {
  'use strict';
  
  function minhaFuncao() { /* ... */ }
  
  // Exportar apenas o necessário
  window.minhaFuncao = minhaFuncao;
})();

// ❌ BAD
function minhaFuncao() { }  // Poluiu global imediatamente
var varGlobal = 5;          // Sem IIFE, não é isolada
```

**Regra geral**: Toda função/var começa dentro de IIFE, exporta explicitamente

### Rule 3.3: Import Order (dentro de arquivo)

```javascript
(function() {
  // 1. Local requires (if using modules in Phase 5)
  
  // 2. Global references que este arquivo usa
  const { CONFIG } = window;
  const playerControle = window.playerControle;
  
  // 3. Declarações locais
  const LOCAL_CONST = 42;
  let localState = { };
  
  // 4. Funções privadas (com prefixo _)
  function _helperPrivado() { }
  
  // 5. Funções públicas (sem prefixo)
  function funcaoPublica() { }
  
  // 6. Exports (no final)
  window.funcaoPublica = funcaoPublica;
})();
```

---

## 4. Logging & Debugging

### Rule 4.1: Console Log Levels

```javascript
// ❌ Remover em todos os merge requests
console.log('[DEBUG]', ...);    // Debug spam
console.log('Testando...');     // Temp logging

// ✅ Permitido somente se tagged corretamente
console.error('[ERROR]', ...');      // Production: Mostrar erros sempre
console.warn('[WARNING]', ...);      // Production: Avisos
console.info('[INFO]', ...);         // Production: Info importante
// Debug somente em: debug.js, bb-debug.js, grade-debug.js

// ✅ BOM: Usar if (window.DEBUG) para dev-only
if (window.DEBUG_COLLISION) {
  console.log('[COLLISION]', player, platform);
}
```

**Regra geral**: Sem `console.log()` solto; use tagged levels; debug via flag

### Rule 4.2: Debug Flags

```javascript
// Em constants.js
const DEBUG_MODE = {
  COLLISION: false,
  MOVEMENT: false,
  ENEMY_AI: false,
  ANIMATION: false,
  STORAGE: false
};

// Em arquivo
if (DEBUG_MODE.COLLISION) {
  console.log('[COLLISION]', ...);
}
```

---

## 5. Global State Management

### Rule 5.1: Creating New Globals

**Permitido**: Apenas se aprovado pelo arquiteto (para Phase 0)

```javascript
// ❌ PROIBIDO: Criar nova global sem contexto
window.tempVar = 5;

// ✅ BOM: Documentar no top do arquivo
// Global: window.playerControle = { x, y, ... }
// Usado por: movimento.js, inimigos/ia-inimigo.js
const playerControle = window.playerControle;
```

### Rule 5.2: State Mutation

```javascript
// ❌ RUIM: Modificar estado sem controle
window.playerControle.x += 5;

// ✅ BOM: Função controlada
function moverPlayer(dx) {
  window.playerControle.x += dx;
  // log aqui se DEBUG ativado
}
```

### Rule 5.3: Global References (Phase 0 Pre-Namespace)

| Variável | Type | Criada em | Lida por | Modificada por |
|---|---|---|---|---|
| `playerControle` | Object | inicial.js | movimento.js, animacao.js, inimigos/* | movimento.js |
| `inimigos` | Array | inicial.js | ia-inimigo.js, menu.js | ia-inimigo.js, morte-inimigo.js |
| `teclas` | Object | controles.js | movimento.js, bb.js, ... | controles.js |
| `bbEntidade` | Object\|null | inicial.js | bb.js, ia-inimigo.js | bb.js, abertura-animacao.js |
| `equipadosJogador` | Array | inventario.js | garra.js, movimento.js | inventario.js |
| `itemsNoMapa` | Array | itens.js | sincronizacao-visual.js | itens.js, coletarItem.js |

**Regra**: Documentar origem, leitores, escritores de cada global

---

## 6. Testing & Validation

### Rule 6.1: Pre-Commit Checklist (IA)

Antes de fazer qualquer change, validar:

- [ ] Sem `console.log()` espalhado
- [ ] Nomes seguem convenção (camelCase PT)
- [ ] LOC < limite (ou justificado)
- [ ] Arquivo é IIFE
- [ ] Sem new globals sem approval
- [ ] Sem duplicação de função que já existe (grep search)
- [ ] Sem orphaned references (search callers)

### Rule 6.2: Manual Testing (Humano)

Após cada PR:

- [ ] Jogo roda sem syntax errors
- [ ] Feature intended funciona
- [ ] Não regressão em outras features (teste 3 scenarios)
- [ ] Sem console errors/warnings na aba Console
- [ ] Performance não degradou (60fps mantido)

### Rule 6.3: Refactor PR Template

```markdown
## PR: [Fase]X - [Descrição]

### Objetivo
[O que muda e por quê]

### Arquivos Alterados
- src/file1.js: [breve descrição]
- src/file2.js: [breve descrição]

### Métricas
- Antes: LOC=X, CC=Y, Dups=Z
- Depois: LOC=X', CC=Y', Dups=Z'
- Delta: -YY% LOC, -ZZ% CC

### Validação
- [x] Sem syntax errors
- [x] Sem regressão (testado 3 scenarios)
- [x] Nomes convenção OK
- [x] Sem console spam
- [x] 60fps mantido

### Próximos Passos
[O que fazer depois dessa PR]
```

---

## 7. Special Cases & Exceptions

### Exception 1: Main Loops (movimento.js, ia-inimigo.js)

Permitido até 500 LOC e CC=25 por razão de design (single responsibility = entire entity loop)

**Condiçao**: Refatoração Phase 2 quebra em sub-loops

### Exception 2: Config & Constants

Sem limite LOC (são dados, não lógica)

Exemplo: constants.js, fase1.json, skills-dados.json

### Exception 3: Debug Files

Permitido até 300 LOC (bb-debug.js, grade-debug.js)

**Condiçao**: Removido em produção ou isolado via flag

### Exception 4: GridUtils Phase 1

Atual: 4 implementações duplicadas (~400 LOC)

Phase 1: Centralizar em `src/utils/grid.js` (~100 LOC)

Todos arquivos refatorados para usar a centralizada

---

## 8. Common Patterns & Anti-Patterns

### Pattern 1: Safe Global Access

```javascript
// ❌ RISKY: Assume que global existe
function alguma() {
  playerControle.x = 5;  // Crashes se playerControle undefined
}

// ✅ SAFE: Validar antes
function alguma() {
  const pc = window.playerControle;
  if (!pc) {
    console.error('[ERROR] playerControle not initialized');
    return;
  }
  pc.x = 5;
}
```

### Pattern 2: Loop Safeguards

```javascript
// ❌ RUIM: Infinite loop risk
let i = 0;
while (true) {
  if (condition) break;
  i++;
  // Se condition nunca true, travado
}

// ✅ BOM: Timeout safety
let i = 0;
while (i < MAX_ITERATIONS) {
  if (condition) break;
  i++;
}
```

### Pattern 3: Event Listeners Cleanup

```javascript
// ❌ RUIM: Event listener memory leak
document.addEventListener('keydown', handler);  // Nunca removido

// ✅ BOM: Limpeza on init ou destroy
function setupControls() {
  document.addEventListener('keydown', handleKeyDown);
}

function cleanupControls() {
  document.removeEventListener('keydown', handleKeyDown);
}
```

---

## 9. Refactor Safety Checklist

Quando refatorando código existente:

1. **Backup**: Commit atual
2. **Search**: Grep todos referenciadores da função/var
3. **Test**: Validar que cada referenciador ainda funciona
4. **Validate**: Sem regressions (manual test 5 min)
5. **Log**: Documentar mudança (PR comment)

---

## 10. Anti-Patterns (Do NOT)

```javascript
// ❌ NUNCA: Criar globals dinâmicas
window['var' + i] = value;  // window.var0, window.var1...

// ❌ NUNCA: Eval
eval(stringCode);  // Security risk

// ❌ NUNCA: Mutation compartilhado sem cópia
const player2 = playerControle;  // Não, faz referência
player2.x = 999;  // Modifica original!

// ✅ SIM: Deep copy se precisar mutar
const player2 = JSON.parse(JSON.stringify(playerControle));
player2.x = 999;  // Original safe
```

---

## 11. Performance Guidelines

### Rule 11.1: Loop Optimization

```javascript
// ❌ RUIM: Array access repetido
for (let i = 0; i < inimigos.length; i++) {  // .length checked 10x
  inimigos[i].update();
}

// ✅ BOM: Cache length
const len = inimigos.length;
for (let i = 0; i < len; i++) {
  inimigos[i].update();
}
```

### Rule 11.2: Function Calls Per Frame

- **Limite**: <2000 function calls/frame com 60fps
- **Atual**: ~1500 (margin OK)
- **Warning**: Se refactor adiciona 500+ calls, profile antes/depois

### Rule 11.3: DOM Manipulation

```javascript
// ❌ RUIM: Append 100 items um por um (reflow 100x)
for (let item of items) {
  container.appendChild(createElement(item));
}

// ✅ BOM: Fragment (reflow 1x)
const fragment = document.createDocumentFragment();
for (let item of items) {
  fragment.appendChild(createElement(item));
}
container.appendChild(fragment);
```

---

## 12. Version Control Guidelines

### Rule 12.1: Commit Messages

```
// ✅ GOOD
feat: Centralizar GridUtils em src/utils/grid.js
- Remove 4 duplicações
- Reduz LOC em 300
- Zero regressions

// ❌ BAD
fix bug
update stuff
```

### Rule 12.2: PR Branch Naming

```
feat/[phase]-[component]-[description]
fix/[component]-[issue]
refactor/[component]-[description]

Exemplos:
feat/phase1-grid-centralization
fix/ia-pathfinding-infinite-loop
refactor/movement-loop-split
```

---

## 13. Documentation Requirements

Cada arquivo deve ter header:

```javascript
/**
 * ARQUIVO: src/utils/grid.js
 * RESPONSABILIDADE: Centralizar GridUtils (Phase 1)
 * 
 * FUNÇÕES PÚBLICAS:
 *  - getGridCell(x, y) → { row, col }
 *  - getGridFromCoord(x, y, gridSize) → number
 * 
 * GLOBALS USADOS:
 *  - window.CONFIG.GRID_SIZE
 * 
 * GLOBALS MODIFICADOS:
 *  - (nenhum)
 * 
 * CHAMADO POR:
 *  - ia-inimigo.js
 *  - cenario.js
 * 
 * NOTAS:
 *  - Consolidação de 4 implementações anteriores
 *  - Sem performance impact (cached)
 */
```

---

## 14. Próximos Steps

- [ ] Phase 1: Aplicar estas rules em centralizações
- [ ] Phase 2: Enforcement automático (linter)
- [ ] Phase 3: Adicionar TypeScript gradualmente
- [ ] Phase 4: Full namespace refactor com schema validation

---

**Versão**: 1.0 Phase 0  
**Última atualização**: 13-05-2026  
**Autor**: IA + Dev  
**Status**: ✅ Pronto para ser usado em Phase 1
