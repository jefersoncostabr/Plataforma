> **Pra quem chegou agora:** este doc diz o que já funciona, o que está quebrado e o que fazer primeiro.
> Moral: o jogo já joga bem, mas tem dívida técnica nos arquivos gigantes. Comece pelos quick wins (2 dias).
> Detalhe por sistema continua abaixo.

## Resumo em 30 segundos (linguagem humana)

- Pronto e jogavel: fisica, jogador completo, inimigos com IA, skills, crafting, inventario, pets (cao + bebe), audio, camera, HUD, menus, editor de fases, modo runner.
- Problema 1 (urgente): 2 arquivos gigantes (`movimento.js` 120KB, `ia-inimigo.js` 141KB). Bug ali e dificil de achar.
- Problema 2 (rapido de resolver): ~650 linhas duplicadas + 8 chaves de save espalhadas.
- Faca primeiro: apagar `TEMP__ia-inimigo.js`, centralizar `GridUtils`, centralizar chaves de save. Depois: BB NPC (plano ja pronto).

---
# 🎮 Análise do Estado Atual — Jogo de Plataforma

> **Data da análise**: Outubro 2026 | **Última doc de arquitetura**: Maio 2026

---

## 📊 Visão Geral

| Métrica | Valor |
|---|---|
| Scripts JS carregados | ~55 |
| Variáveis globais (`window.*`) | ~200 |
| LOC estimado total | ~18.000+ |
| Arquivos JS/JSON/HTML/CSS | 80+ |
| Fases criadas | 2 níveis + fase de treino |
| Subsistemas identificados | 14 |

O jogo é um **platformer de ação** com mecânicas de resgate de "bebês" (BBs), sistema de pets (cão), crafting, skills, inimigos com IA, sistema de inventário/mochila completo, editor de fases e um modo runner.

---

## ✅ O Que Está Pronto e Funcionando

- **Motor de física** — gravidade, colisão, fricção horizontal
- **Jogador completo** — movimento, pulo, animações, abertura/fechamento de armadura
- **Equipamentos** — garra (grab), jetpack, combate corpo a corpo, dano por estacas
- **IA de inimigos** — pathfinding, perseguição, knockback, combate
- **Sistema de skills** — skills com efeitos visuais, persistência em `localStorage`
- **Sistema de crafting** — UI completa com receitas
- **Inventário / mochila** — gerenciamento de itens, slots salvos
- **Pets** — cão (`cao.js`) e bebê controlável (`bb.js`) com ciclo de vida próprio
- **Mecânica de resgate** — lógica de captura/liberação do BB (`mecanica-resgate-bb.js`)
- **Sistema de áudio** — gerenciador de SFX isolado (AudioManager ✅)
- **Rendering por layers** — 8 layers (fundo, plataformas, decorações, inimigos, jogador, itens, projéteis, efeitos)
- **Camera tracking** — com scroll e viewport
- **HUD** — vida, mana, status no ecrã
- **Menu principal** — tela de início, save slots
- **Editor de fases** — ferramenta em `tools/editor/`
- **Interações com NPCs** — diálogos e sistema de interação
- **Cheat menu** — para debugging em `src/ui/cheat-menu.js`
- **Modo Runner** — modo de jogo alternativo em `src/modes/runner/`
- **Gaiola** — entidade resgatável
- **Animação de derrota de chefe** — `src/core/animacao-derrota-chefe.js`

---

## 🔴 Problemas Conhecidos / Dívida Técnica

### 🔥 Arquivos Críticos (muito grandes)

| Arquivo | Tamanho | Problema |
|---|---|---|
| `src/inimigos/ia-inimigo.js` | **141 KB** | IA inteira em 1 arquivo; CC ~38 |
| `src/jogador/movimento.js` | **120 KB** | Tudo do player em 1 arquivo; CC ~45 (extremamente alto) |
| `src/jogador/inventario.js` | **89 KB** | Inventário gigante |
| `src/core/interacao-sistema.js` | **48 KB** | Diálogos e interações misturados |
| `src/ui/menu.js` | **52 KB** | Menu monolítico |
| `src/core/inicial.js` | **54 KB** | Loop principal + carregamento de fase misturado |
| `src/jogador/crafting.js` | **37 KB** | UI de crafting |
| `src/jogador/garra.js` | **36 KB** | Mecânica de garra grande |

### 🔴 Duplicações Identificadas (~650 LOC duplicado)

1. **GridUtils**: 4 implementações diferentes em `cenario.js`, `ia-inimigo.js`, `viewport.js`, `inimigo.js`
2. **Knockback**: 3 implementações em `movimento.js`, `ia-inimigo.js`, `garra.js`
3. **Ciclo de vida de pets**: `cao.js` e `bb.js` duplicam lógica sem herança comum
4. **Storage keys**: 8 strings hardcoded espalhadas sem `storage-keys.js` centralizado

### 🟡 Problemas de Arquitetura

- **~200 variáveis globais** sem namespace (risco de bugs difíceis de rastrear)
- **`window.playerX` e `window.playerControle.x` duplicados** — dois valores para a mesma coisa
- **Camera com 1-frame lag** — atualiza no final do loop (causa jitter sutil)
- **Dependência de ordem de scripts** em `index.html` — mudar ordem quebra o jogo
- **ES5 puro** — sem `import/export`, sem bundler, sem tree-shaking

### 🟡 Itens Inacabados / Esquecidos

- **`TEMP__ia-inimigo.js`** na raiz — arquivo temporário esquecido (30 bytes)
- **`src/core/npc-base.js`** (855 B), **`npc-comportamentos.js`** (375 B), **`npc-factory.js`** (563 B), **`npc-ias.js`** (332 B) — scaffolding NPC criado mas **não integrado**
- **`src/core/bb-teste.js`** — arquivo de testes isolado, não carregado no `index.html`
- **`src/core/criarInimigoApartirDeBB.js`** — conversão BB→inimigo, possivelmente sem uso
- **Plano BB NPC instanciável** (`docs/PLANEJAMENTO_BB_NPC.md`) — **totalmente documentado mas não implementado**

---

## 📋 Trabalho Planejado Não Concluído

### Do `ARCHITECTURE.md` — Fases de Refatoração pendentes:

- [ ] **Phase 1** — Centralizar `GridUtils` em `src/utils/grid.js`
- [ ] **Phase 1** — Criar `src/config/storage-keys.js` (storage keys normalizados)
- [ ] **Phase 2** — Dividir `movimento.js` em `movement-loop.js`, `movement-state.js`, `movement-physics.js`
- [ ] **Phase 2** — Dividir `ia-inimigo.js` em `ia-loop.js`, `ia-pathfinding.js`, `ia-combat.js`
- [ ] **Phase 3** — Criar `src/core/entity-base.js` (herança para player/enemy/pet)
- [ ] **Phase 4** — Criar `window.GameState` namespace (eliminar 200 globais)
- [ ] **Phase 5** — Converter para ES6 `import/export`

### Do `PLANEJAMENTO_BB_NPC.md`:

- [ ] Sistema de BB NPC instanciável (spawn/despawn por fase via `window.bbNPCs[]`)
- [ ] Integração no editor de fases (paleta + renderização no editor)
- [ ] API `spawnBBNPC()` / `destroy()` / `setControlado()`
- [ ] Leitura de `fase.bbNPCs` no `carregarFase()` de `inicial.js`

---

## 💡 Sugestões de Próximos Passos

### 🎯 Alta Prioridade — Quick Wins (1-2 dias cada)

1. **Remover `TEMP__ia-inimigo.js`** da raiz — arquivo esquecido
2. **Centralizar `GridUtils`** em `src/utils/grid.js` — elimina ~400 LOC duplicado de uma vez
3. **Criar `storage-keys.js`** — centralizar as 8 strings de localStorage hardcoded
4. **Integrar ou deletar** `npc-base.js`, `npc-comportamentos.js`, `npc-factory.js`, `npc-ias.js` — decida: implementa ou limpa

### 🎮 Média Prioridade — Novas Features

5. **Implementar BB NPC instanciável** (já tem plano detalhado em `docs/PLANEJAMENTO_BB_NPC.md`)
6. **Capacete** (do `ideias.md` — item de cabeça novo)
7. **Sistema de salvamento explícito** (`ideias.md` — "salvar jogo")
8. **Camera shake em impactos** (`ideias.md` — "efeito de câmera")
9. **Sistema de dia e noite** (`ideias.md`)

### 🔧 Longo Prazo — Saúde do Código

10. **Dividir `movimento.js`** (120 KB!) em módulos menores
11. **Dividir `ia-inimigo.js`** (141 KB!) em `ia-pathfinding.js`, `ia-combat.js`, `ia-loop.js`
12. **Criar `window.GameState` namespace** — encapsular as 200 variáveis globais
13. **Corrigir camera lag** — mover update da câmera para antes do render no loop

---

## 🗂️ Estrutura de Módulos (resumo)

```
src/
├── config/         → constants.js
├── core/           → motor principal (física, BB, cão, inicial, ...)
├── inimigos/       → IA de inimigos (ia-inimigo.js — maior: 141 KB)
├── itens/          → spawn, coleta, carregamento de itens
├── jogador/        → movimento (120 KB!), inventário (89 KB!), skills, crafting...
├── modes/runner/   → modo runner alternativo
├── skills/         → sistema de habilidades
├── ui/             → menu (52 KB), mochila (29 KB), hud, cheat-menu
├── utils/          → viewport, debug
└── visual/         → camera, cenário, layers, efeitos, animações
```

---

> **Resumo**: O jogo tem um motor funcional e rico em features. O maior risco atual é a dívida técnica em `movimento.js` e `ia-inimigo.js` — qualquer bug ali é difícil de corrigir. A prioridade imediata mais segura é a centralização do `GridUtils` e dos storage keys (Phase 1), seguida da implementação do BB NPC instanciável que já foi completamente planejado.

---

*Análise gerada em: Outubro 2026*
