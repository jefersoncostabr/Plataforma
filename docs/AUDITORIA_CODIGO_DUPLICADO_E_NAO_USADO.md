# Auditoria de código duplicado e não usado

Data: 17/04/2026

## Objetivo
Registrar os principais pontos do projeto onde existem trechos duplicados, lógica repetida e código potencialmente não utilizado.

---

## 1. Código duplicado

### 1.2 Checagem de escudo ativo
Arquivos:
- src/inimigos/ia-inimigo.js
- src/jogador/dano-estacas.js

Observação:
A condição que verifica se o escudo está ativo e disponível está duplicada em contextos diferentes.

---

### 1.3 Lógica de restauração e reparo
Arquivos:
- src/jogador/garra.js
- src/jogador/inventario.js

Observação:
Existe repetição na rotina que restaura munição, escudo, bota e garra danificada.
Esse fluxo aparece várias vezes e pode ser centralizado em uma única função.

---

### 1.4 Mapeamento de sprite por tipo de item
Arquivos:
- src/jogador/inventario.js
- src/jogador/acoes-especiais.js

Observação:
A seleção de sprite para revolver, escudo, bota, jetpack, garra, cinto, colete e restauração está repetida.

---

### 1.5 Sincronização visual de equipamentos
Arquivo:
- src/visual/animacoes-equipamento.js

Observação:
Há funções muito parecidas para sincronizar posição, transformação e animação de clones dos equipamentos no corpo e no cinto.

---

## 2. Código potencialmente não usado

### 2.1 Export global de sprite preview
Arquivo:
- src/jogador/acoes-especiais.js

Símbolo:
- window.obterSpritePreviewItem

Observação:
Não foi encontrada referência relevante fora da própria definição/exportação.

---

### 2.2 Export global de filtro visual preview
Arquivo:
- src/jogador/acoes-especiais.js

Símbolo:
- window.FILTRO_VISUAL_PREVIEW

Observação:
Não apareceu uso no restante do projeto.

---

## 3. Prioridade sugerida de limpeza

### Alta prioridade
- Unificar cálculo de knockback
- Unificar rotina de restauração/reparo
- Unificar regra de escudo ativo

### Média prioridade
- Centralizar função de sprite de item
- Reduzir duplicação das rotinas visuais do cinto/equipamentos

### Baixa prioridade
- Revisar e remover exports globais órfãos

---

## 4. Observação final
Essa auditoria foi feita para apontar os melhores candidatos de refatoração sem alterar o comportamento do jogo.
A recomendação é limpar primeiro as duplicações com maior impacto de manutenção.
