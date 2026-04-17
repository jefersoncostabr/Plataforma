# Sistema de Crafting Evolutivo

## Objetivo
Permitir que o jogador troque o último item do inventário por uma estrutura de craft que nasce no bloco do próprio jogador e pode evoluir do nível 1 ao 3.

## Fluxo da Mecânica
1. O jogador precisa estar **agachado**.
2. Ao apertar **E**, o jogo verifica se a célula atual está livre de bloco, inimigo, item e craft anterior.
3. Se estiver livre, aparece um **preview fantasma** usando a mesma coloração da venda.
4. Se o jogador levantar ou pular, o preview é cancelado.
5. Ao apertar **E** de novo, o craft é colocado no **nível 1** e consome o último item do inventário.
6. Novas interações no mesmo craft promovem para **nível 2** e depois **nível 3**.

## Primeira Entrega
- Craft **visual e evolutivo**, sem bônus ainda.
- Cada nível usa **um sprite próprio**.
- O sistema foi desenhado para futura expansão sem duplicação de lógica.

## Regras de Validação
- não pode existir tile sólido na área
- não pode haver inimigo ocupando a célula
- não pode haver item dropado no local
- não pode já existir outro craft naquela posição

## Arquivos Principais
- src/jogador/crafting.js
- src/jogador/movimento.js
- src/jogador/controles.js
- config/controles.json
- src/core/colisoes.js
- src/jogador/acoes-especiais.js

## Observações
- O preview reaproveita o visual da venda para manter consistência.
- A lógica foi separada em módulo próprio para evitar quebrar o movimento principal.
- Os bônus reais dos crafts entram numa próxima etapa.
