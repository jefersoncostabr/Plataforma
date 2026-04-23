# Auditoria de código duplicado e não usado

Data: 17/04/2026

## Objetivo
Registrar os principais pontos do projeto onde existem trechos duplicados, lógica repetida e código potencialmente não utilizado.

---

## 1. Código duplicado

### 1.2 Checagem de escudo ativo
Status:
- [x] Centralizado. Verificações manuais substituídas por `window.temEscudoAtivoPadrao` (Item 1.2).
- [x] Sincronizado entre Jogador, Inimigos e Projéteis.


### 1.3 Lógica de restauração e reparo
Arquivos:
- src/jogador/garra.js
- src/jogador/inventario.js
- src/inimigos/ia-inimigo.js

Status:
- [x] Centralizado em `window.aplicarRestauracaoPadrao` no arquivo `inventario.js`.
- [x] Removida duplicação na coleta de itens da Garra.
- [x] Removida duplicação na IA dos inimigos.

---

### 1.4 Mapeamento de sprite por tipo de item
Arquivos:
- src/jogador/inventario.js
- src/jogador/acoes-especiais.js

Status:
- [x] Centralizado na função global `window.obterSpriteItem` em `inventario.js`.

---

### 1.5 Sincronização visual de equipamentos
Arquivo:
- src/visual/animacoes-equipamento.js
- src/jogador/movimento.js
- src/inimigos/ia-inimigo.js

Status:
- [x] Criado `window.sincronizarAcessoriosEntidade` em `src/visual/sincronizacao-visual.js`.
- [x] Removidos blocos manuais de style e centralizado posicionamento.

---

## 2. Código potencialmente não usado

### 2.1 Export global de sprite preview
Arquivo:
- src/jogador/acoes-especiais.js

Símbolo:
- window.obterSpritePreviewItem

Status:
- [x] Removido. A exportação órfã foi eliminada durante a centralização do mapeamento de sprites (item 1.4).
---

### 2.2 Export global de filtro visual preview
Arquivo:
- src/jogador/acoes-especiais.js

Símbolo:
- window.FILTRO_VISUAL_PREVIEW

Status:
- [x] Removido. A exportação global foi excluída por não possuir referências externas (item 2.2).
---

## 3. Prioridade sugerida de limpeza

### Alta prioridade
- [x] Unificar cálculo de knockback (Centralizado em `inicial.js`)
- [x] Unificar rotina de restauração/reparo (Centralizado em `inventario.js`)
- [x] Unificar regra de escudo ativo (Ver item 1.2)


### Média prioridade
- [x] Centralizar função de sprite de item (Ver item 1.4)
- [x] Reduzir duplicação das rotinas visuais do cinto/equipamentos (Centralizado em `sincronizacao-visual.js`)

### Baixa prioridade
- [x] Revisar e remover exports globais órfãos (Limpeza realizada em `gravidade.js` e `crafting.js`)

---

## 5. Pendências de Refinamento (Identificadas em 19/04)

### 5.1 Conflito de Sobrescrita em `animacoes-equipamento.js`
Status:
- [x] Removido. A função local redundante foi excluída; o projeto agora utiliza exclusivamente o motor de `sincronizacao-visual.js`.

### 5.2 Duplicação de Lógica de "Snap" de Colisão
**Problema:** `ia-inimigo.js` (função `verificarSnapInimigo`) e `movimento.js` (função `aplicarSnapColisao`) possuem lógicas quase idênticas para "colar" a entidade na parede ao colidir.
**Ação:** Mover essa lógica para `colisoes.js` ou `gravidade.js` como uma função de utilidade global.

### 5.3 Limpeza de Sprites Hardcoded
**Problema:** Ainda existem caminhos de strings como `../../assets/personagem/...` espalhados por `ia-inimigo.js` e `movimento.js`.
**Ação:** Garantir que 100% desses acessos usem a `window.obterSpriteItem`.

---

## 4. Observação final
Essa auditoria foi feita para apontar os melhores candidatos de refatoração sem alterar o comportamento do jogo.
A recomendação é limpar primeiro as duplicações com maior impacto de manutenção.
