# Planejamento (Plano.md) — Melhorias no Editor de Fases

## Objetivo
Reduzir duplicidade, facilitar manutenção e permitir implementação/alteração rápida de **itens** (incluindo troca de sprite) no **Editor de Fases**.

## Informação levantada (relevante ao problema)
- `tools/editor/editor-config.js` concentra **defs** de plataformas/inimigos/sistema (`PLATFORM_DEFS`, `ENEMY_DEFS`, `SYSTEM_DEFS`).
- `tools/editor/editor-render.js` usa `EditorConfig.PLATFORM_DEFS/ENEMY_DEFS/SYSTEM_DEFS` para renderizar **plataformas e NPCs**; itens (`faseData.itens`) são renderizados com `itemDefinitions`.
- `tools/editor/editor-ui.js` cria a **paleta** (menu `#palette`). Há lógica duplicada/espalhada para carregar imagens.
- `tools/editor/editor.html` contém `<img>` estáticos iniciais (categoria **Blocos**) que podem apontar para caminhos errados.
- A manutenção hoje sofre com:
  - acoplamento entre **tipo** e **caminho do sprite** em múltiplos lugares;
  - falta de um único “catálogo de sprites/definições” consumido por UI e Render;
  - necessidade de editar vários arquivos para adicionar/alterar um item.

## Problema atual (causa comum)
- Caminhos de sprites (ex.: `terra_horizontal`) aparecem em diferentes lugares:
  1) `editor-config.js`
  2) `editor-ui.js` (fallback)
  3) `editor.html` (imagem estática)
- Quando altera-se a pasta real, é fácil esquecer um dos pontos e o editor continua tentando carregar um caminho antigo.

## Plano de implementação

### Passo 1 — Criar “Catálogo” único de definições
**Novo módulo:** `tools/editor/editor-definitions.js` (ou dentro de `editor-config.js`, mas preferível separar).
- Definir estrutura única:
  - `blocks` (plataformas)
  - `enemies` (NPCs)
  - `systems`
  - `items` (itens carregados via `config/items/*.json`)
- Cada entrada deve ter:
  - `type`
  - `stateKey`
  - `spritePaths` (ex.: `sprite`, `spriteMenu`)
  - `className`, `kind` (single/array)
  - `aliases` (opcional) para compatibilidade com tipos antigos

**Regra:**
- UI (paleta) e Render devem ler sempre do mesmo catálogo.

### Passo 2 — Centralizar resolução de sprite (fallback)
**Novo helper:** `resolveSpritePath(def, context)`.
- `context` pode ser: `menu`, `stage`, `unknown`.
- Se `def.spriteMenu` existir, usar; senão `def.spriteColetavel`/`def.sprite`.
- Adicionar fallback por `type`/`alias` (ex.: terra_horizontal → pasta `bloco terra`).

Resultado:
- Remover/limitar “ifs” específicos de `editor-ui.js`.

### Passo 3 — Remover duplicidade do `editor.html`
- Converter categoria “Blocos” (e possivelmente “Sistema/Inimigos”) de **HTML estático** para **render via JS**.
- Assim, a paleta fica 100% dirigida por defs.

### Passo 4 — Atualizar `editor-ui.js`
- `configurarPaletaDinamicaItens()` deve usar `itemDefinitions` + `resolveSpritePath`.
- `configurarPaletaGaiola()` e ajustes especiais devem seguir a mesma regra.
- Se houver necessidade de overlays (ex.: gaiola: cão + gaiola1), encapsular em função especializada `renderCompositeSprite(def, context)`.

### Passo 5 — Atualizar `editor-render.js`
- Garantir que plataformas/plano/itens stage usam somente `resolveSpritePath`.
- Manter debug de erro de sprite carregando (onerror), mas sem duplicar lógica.

### Passo 6 — Definir “workflow” para criar/alterar sprites novos
Criar doc “Como adicionar item novo no editor”:
- adicionar json em `config/items/<tipo>.json` com `spriteColetavel`/`spriteMenu` correto;
- ou registrar manualmente no catálogo.

### Passo 7 — Teste e validação
- Validar:
  - paleta carrega sem requests quebrados;
  - stage renderiza corretamente em todas as proporções;
  - adicionar item novo não exige mexer em 3-5 arquivos.
- Criar um modo debug “sprite audit”:
  - lista todos sprites resolvidos e verifica se a URL responde 200 (via fetch HEAD/GET leve).

## Arquivos dependentes (para editar)
- `tools/editor/editor-config.js` (ou substituir por catálogo novo)
- `tools/editor/editor-ui.js`
- `tools/editor/editor-render.js`
- `tools/editor/editor.html` (remover imgs estáticos onde for possível)
- (novo) `tools/editor/editor-definitions.js`
- (novo) `tools/editor/doc/*` (documentação)

## Follow-ups (pós-código)
- Rodar o editor local e abrir console para confirmar ausência de `Erro ao carregar imagem`.
- Atualizar TODO existente e/ou criar changelog na pasta doc.

## Critérios de sucesso
- Para trocar sprite de um item: mexer em 1 lugar.
- Para adicionar um novo item: mexer em 1 arquivo (json do item) + opcionalmente 1 registro no catálogo.
- Zero URLs quebradas conhecidas (ex.: `assets/personagem/terra_horizontal.png`).

