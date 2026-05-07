# Migração de Estilos dos Botões de `menu.js` para CSS

**STATUS: CONCLUÍDO ✅**

*Nota: Ajustes de visibilidade e escala realizados para garantir que o formato de "bloco" e as animações sejam evidentes.*

## Contexto

Os botões do menu são elementos `<div class="menu-option">` criados dinamicamente em `menu.js`.
Atualmente há **3 fontes de estilo inline** que precisam ser migradas.

---

## Diagnóstico — 3 Fontes de Estilo Inline

| Fonte | Local | O que faz |
|---|---|---|
| `injetarEstilosMenu()` | `renderMenuUI()` | Injeta `<style>` tag com keyframe, `.menu-option` base e `.menu-option.selected::after` |
| `btn.style = ...` / `linha.style = ...` | `renderMainMenuContent()`, `renderControlsContent()` | Estilos estáticos de cada botão |
| `el.style.backgroundColor/color/border/transform` | `updateMenuVisuals()` | Estado selecionado/não-selecionado — **sobrepõe CSS** porque inline style tem prioridade |

---

## Grupos de Botões Identificados

| Grupo | Classe Proposta | Estilo Diferenciador |
|---|---|---|
| Botões do menu principal | `.menu-option--main` | `padding:12px`, `font-size:18px`, `text-align:center`, `border-radius:5px` |
| Itens de controle (lista) | `.menu-option--control` | `padding:5px 8px`, `font-size:13px`, `text-align:left`, `border-radius:4px` |
| Botão "SALVAR E VOLTAR" | `.menu-option--action .menu-option--save` | igual `--action` + `margin-top:8px` |
| Botão "RESTAURAR PADRÃO" | `.menu-option--action` | `padding:7px 8px`, `font-size:13px`, `text-align:center`, `border-radius:4px` |

---

## Fase 1 — CSS (`index-style.css`)

Adicionar ao final do arquivo:

- **`@keyframes menu-shine-slide`** — migrado de `injetarEstilosMenu()`
- **`.menu-option`** — base: `position:relative; overflow:hidden; font-weight:bold; cursor:pointer; transition:transform 0.1s; border:2px solid transparent; background:rgba(255,255,255,0.1); color:white;`
- **`.menu-option.selected`** — `background:white; color:black; border:2px solid #fff; transform:scale(1.3);` *(substitui os inline styles de `updateMenuVisuals()`)*
- **`.menu-option.selected::after`** — brilho animado, migrado de `injetarEstilosMenu()`
- **`.menu-option--main`** — `padding:12px; font-size:18px; text-align:center; border-radius:5px;`
- **`.menu-option--control`** — `padding:5px 8px; font-size:13px; text-align:left; border-radius:4px;`
- **`.menu-option--action`** — `padding:7px 8px; font-size:13px; text-align:center; border-radius:4px;`
- **`.menu-option--save`** — `margin-top:8px;`
- Regras de scrollbar `#menu-options-container::-webkit-scrollbar` — migradas de `injetarEstilosMenu()`

---

## Fase 2 — `menu.js` (Remoções e Injeção de Classes)

1. Remover completamente `injetarEstilosMenu()` e sua chamada em `renderMenuUI()`
2. **`renderMainMenuContent()`** — remover `btn.style = ...`; adicionar `btn.classList.add('menu-option--main')`
3. **`renderControlsContent()`**:
   - `linha`: remover inline style → adicionar `menu-option--control`
   - `salvarBtn`: remover inline style → adicionar `menu-option--action` e `menu-option--save`
   - `resetBtn`: remover inline style → adicionar `menu-option--action`
4. **`updateMenuVisuals()`** — remover as 4 linhas de `el.style.xxx` em cada branch; manter apenas `classList.add/remove('selected')` *(passo mais sensível)*

---

## Arquivos Modificados

- `index-style.css` — recebe todos os novos blocos CSS
- `src/ui/menu.js` — remove inline styles e `injetarEstilosMenu()`, adiciona classes

---

## Verificação

1. Pausar o jogo — botões do menu principal devem aparecer idênticos ao estado atual
2. Navegar com teclado — item selecionado: fundo branco, texto preto, scale 1.3, brilho animado
3. Abrir tela de Controles — lista menor com `text-align:left`
4. Hover com mouse — estado selecionado via `classList`, CSS cuida do visual
5. DevTools → inspecionar um botão — nenhum atributo `style=""` inline nos `.menu-option`

---

## Escopo

- **Incluído**: todos os elementos com classe `menu-option` (botões e itens de controles)
- **Excluído**: overlay `#pause-menu-overlay`, título `h1`, containers `div`, painel de resumo e chips