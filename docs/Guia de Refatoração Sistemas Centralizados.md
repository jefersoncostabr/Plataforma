# Guia de Refatoração: Sistemas Centralizados

Este documento descreve as melhorias realizadas na arquitetura do jogo para eliminar duplicações nos sistemas de restauração, visualização de itens e sincronização de acessórios.

---

## 1. Restauração e Reparo de Equipamentos

**Função:** `window.aplicarRestauracaoPadrao(entidade, config, callbacks)`
**Localização:** `src/jogador/inventario.js`

### O que faz:
Centraliza a lógica de "cura" e "recarga" para qualquer entidade (jogador ou inimigo). Ela reseta a munição para o máximo, repara escudos quebrados (escudoVermelho), restaura os usos de dash da bota e limpa danos na garra. 

**Importante:** Ela detecta automaticamente se a entidade usa o sistema de `dano` (jogador) ou `vida` (inimigos) e repara um ponto de integridade.

### Como usar:
```javascript
window.aplicarRestauracaoPadrao(entidade, config, {
    atualizarVisualEscudo: () => { /* lógica de filtro */ },
    atualizarVisualBota: window.atualizarVisualBota,
    atualizarVisualGarra: window.atualizarVisualGarra
});
```

---

## 2. Mapeamento de Sprites por Item

**Função:** `window.obterSpriteItem(tipo, config)`
**Localização:** `src/jogador/inventario.js`

### O que faz:
É a "fonte da verdade" para os caminhos de arquivos de imagem. Ela resolve qual `.png` exibir seguindo esta prioridade:
1.  Definições dinâmicas vindas de JSONs (`window.itemDefinitions`).
2.  Configurações manuais do `configuracoes.json`.
3.  Caminhos padrão (fallbacks) caso nada seja definido.

### Como usar:
```javascript
const src = window.obterSpriteItem('jetpack', config);
// Retorna o caminho correto para o asset, independente de onde for chamado.
```

---

## 3. Sincronização Visual de Acessórios

**Função:** `window.sincronizarAcessoriosEntidade(entidade, elementos, opcoes)`
**Localização:** `src/visual/sincronizacao-visual.js`

### O que faz:
Elimina a necessidade de escrever `style.left`, `style.bottom` e `transform` repetidamente nos loops de animação. Ela "cola" os itens ao corpo da entidade e gerencia automaticamente o offset de agachamento (padrão -6px).

### Como usar:
Passe um objeto contendo os elementos HTML que devem seguir a entidade:
```javascript
window.sincronizarAcessoriosEntidade(inimigo, {
    armaElemento: inimigo.armaElemento,
    escudoElemento: inimigo.escudoElemento,
    coleteElemento: inimigo.coleteElemento
});
```

### Opções Avançadas:
- `x` / `y`: Força uma posição específica (usado pela Garra ao arrastar alvos).
- `transform`: Aplica uma rotação ou escala customizada (usado no recuo da arma).
- `forçarSincroniaGarra`: Força a garra a colar no corpo mesmo que ela esteja em animação de esticar.

---

## 4. Benefícios para o Desenvolvimento

1.  **Mudanças em Lote**: Quer que o agachamento desça 8px em vez de 6px? Altere apenas em `sincronizacao-visual.js` e todos os personagens do jogo (incluindo inimigos) herdarão a mudança.
2.  **Segurança**: O sistema agora valida se os scripts foram carregados no `index.html` antes de iniciar a IA ou o Movimento, evitando erros de "function not found".
3.  **Performance**: Centralizar o cálculo de agachamento uma única vez por quadro é mais eficiente do que calculá-lo individualmente para cada acessório.

---

## 5. Checklist para Novos Equipamentos

Ao criar um novo item equipável:
1.  Adicione o elemento visual à entidade (ex: `inimigo.capaceteElemento`).
2.  Inclua este elemento na chamada da função `sincronizarAcessoriosEntidade`.
3.  Defina o caminho da imagem na função `obterSpriteItem`.
4.  Se o item tiver durabilidade, adicione sua regra de reparo em `aplicarRestauracaoPadrao`.
```

### Resumo do que foi feito:
1.  **Restauração**: Unificamos a lógica de reparo do Jogador e dos Inimigos em uma única função robusta.
2.  **Sprites**: Centralizamos todos os caminhos de assets em `inventario.js`, facilitando a troca de skins ou adição de novos itens.
3.  **Visual**: Criamos o `sincronizacao-visual.js` que gerencia a física visual de acessórios (agachamento, direção e transformações), removendo centenas de linhas de código repetido em `movimento.js` e `ia-inimigo.js`.
4.  **Integridade**: O `index.html` foi atualizado para carregar essas novas dependências na ordem correta, e as verificações de erro foram adicionadas para evitar que a IA "congele" o jogo se um script falhar.

Essa refatoração resolve os itens **1.3, 1.4 e 1.5** da sua auditoria! Qual o próximo passo?

<!--
[PROMPT_SUGGESTION]Refatore o sistema de escudo para unificar a verificação de 'escudo ativo' em todo o projeto usando a função global temEscudoAtivoPadrao.[/PROMPT_SUGGESTION]
[PROMPT_SUGGESTION]Unifique o cálculo de knockback para jogadores e inimigos, centralizando os valores no arquivo gravidade.js.[/PROMPT_SUGGESTION]
